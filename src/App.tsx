import { ChangeEvent, DragEvent, Fragment, isValidElement, KeyboardEvent as ReactKeyboardEvent, MouseEvent, PointerEvent, type CSSProperties, type ReactNode, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import {
  AlignEndHorizontal,
  AlignEndVertical,
  AlignHorizontalDistributeCenter,
  AlignCenterHorizontal,
  AlignCenterVertical,
  AlignStartHorizontal,
  AlignStartVertical,
  AlignVerticalDistributeCenter,
  BringToFront,
  Cable,
  Download,
  FileInput,
  FileJson,
  FlipHorizontal,
  FlipVertical,
  Grid2X2,
  Copy,
  ChevronDown,
  ChevronRight,
  Scissors,
  EyeOff,
  FolderOpen,
  Layers,
  Layers2,
  MousePointer2,
  PanelLeftOpen,
  PanelRightOpen,
  Palette,
  Paintbrush,
  Pencil,
  Pin,
  Route,
  Save,
  SendToBack,
  Trash2,
  Undo2
} from "lucide-react";
import {
  alignNodes,
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
  createNodeFromTemplate,
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
  distributeNodes,
  E_SECTION_COLUMNS,
  getEdgeEndpointPoint as getModelEdgeEndpointPoint,
  getNodeScaleX,
  getNodeScaleY,
  getDeviceGlyphVariant,
  getConnectionStrokeColor,
  getDeviceStrokeColor,
  getDeviceStrokeWidth,
  getTerminalDisplayColor,
  getElementFocusPoint,
  getMovableRouteSegmentIndexes,
  getBusTerminalType,
  getContainerTerminalAssociationSourceIndex,
  getSwitchVisualState,
  getEParameterKeys,
  getEParamValue,
  getEExportWarnings,
  getTemplateParameterDefinitions,
  getOverlappingTerminalGroups,
  getRouteEndpointNormal,
  getRouteBlockingCandidates,
  getRouteBlockingCandidateNodesFromBoxes,
  getTerminalBusContactGroups,
  getTerminalPoint,
  normalizeDeviceIndexCounters,
  normalizeNodeTerminalsByTemplate,
  normalizeColorPalette,
  normalizeVoltageBaseInput,
  normalizeScaleValue,
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
  type ElementTreeItem,
  type AlignMode,
  type Edge,
  type ModelNode,
  type Point,
  type ProjectFile,
  type RoutedEdge,
  type CanvasBounds,
  type ColorPalette,
  type ColorDisplayMode,
  type Topology,
  type ContainerTerminalAssociationType,
  type ContainerTerminalAssociationValue,
  type ContainerTerminalRole,
  type TerminalType,
  type TopologyValidationError,
  routeEdgesForRendering,
  routeEdgesForCachedStoredRendering,
  routeEdgesForIncrementalRendering,
  routeEdgesForStoredRendering,
  moveProjectToScheme,
  modelGeometryInsideCanvasBounds,
  mirrorNodes,
  renameSavedScheme,
  renameSavedProject,
  moveOrthogonalRouteSegment,
  terminalStubSegment,
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
  EMPTY_CANVAS_CLIPBOARD,
  buildCanvasClipboard,
  canvasClipboardBounds,
  cloneCanvasClipboard,
  resolveCanvasDeleteAction,
  selectGraphicsInRect,
  type CanvasClipboard
} from "./selectionActions";
import {
  isSidePanelVisible,
  nextSidePanelAutoVisible,
  normalizeSidePanelMode,
  type SidePanelMode,
  type SidePanelSide
} from "./sidePanelVisibility";

type ToolMode = "select" | "connect";
type LibraryGroup = string;
type EdgeEndpoint = "source" | "target";
type TransformDrag =
  | { kind: "rotate"; nodeId: string; historyCaptured?: boolean }
  | { kind: "scale-x" | "scale-y" | "scale-both"; nodeId: string; historyCaptured?: boolean };
type ScaleHandleKind = Extract<TransformDrag["kind"], "scale-x" | "scale-y" | "scale-both">;
type ScaleHandleConfig = {
  id: string;
  kind: ScaleHandleKind;
  xDirection: -1 | 0 | 1;
  yDirection: -1 | 0 | 1;
  className: string;
};
type Marquee = { start: Point; current: Point } | null;
type ContextMenuState = {
  x: number;
  y: number;
  canvasPoint?: Point;
  edgeId?: string;
  routePoints?: Point[];
} | null;
type ProjectMenuState = { x: number; y: number; schemeId?: string; projectId?: string } | null;
type UnsavedChangeAction = {
  kind: "load-project";
  project: SavedProjectRecord;
  schemeId: string;
  label: string;
};
type SidePanelResizeState = { side: SidePanelSide; startX: number; startWidth: number } | null;
type StatusbarResizeState = { startY: number; startHeight: number } | null;
type ValidationPanelResizeState = { startY: number; startHeight: number } | null;
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
  nodeIds: string[];
  edgeIds: string[];
  affectedEdges: Edge[];
  startPoint: Point;
  originalPositions: Record<string, Point>;
  originalEdgePoints: Record<string, { sourcePoint?: Point; targetPoint?: Point; manualPoints?: Point[] }>;
  originalRoutePoints: Record<string, Point[]>;
  currentDelta?: Point;
  historyCaptured?: boolean;
};
type GraphDirtyBaseline = {
  projectName: string;
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
};
type DraftProjectState = {
  projectName: string;
  activeProjectId: string;
  activeSchemeId: string;
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
type CustomParamDraft = DeviceParameterDefinition & {
  id: string;
};
type CustomDeviceDraft = {
  groupName: string;
  newGroupName: string;
  deviceType: string;
  exportSection: string;
  backgroundImage: string;
  terminalCount: number;
  terminalTypes: TerminalType[];
  terminalRoles: ContainerTerminalRole[];
  terminalAssociations: ContainerTerminalAssociationValue[];
  isContainer: boolean;
  params: CustomParamDraft[];
  error: string;
};
type DeviceDefinitionDraftRow = DeviceParameterDefinition & {
  id: string;
};

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

const DEFAULT_CANVAS_WIDTH = 1980;
const DEFAULT_CANVAS_HEIGHT = 1024;
const MIN_CANVAS_WIDTH = 640;
const MIN_CANVAS_HEIGHT = 360;
const MAX_CANVAS_WIDTH = 5000;
const MAX_CANVAS_HEIGHT = 3000;
const DEFAULT_CANVAS_BACKGROUND = "#f1f5f9";
const MOVE_BOUNDARY_GUARD = 8;
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
const DEFAULT_LIBRARY_GROUPS: LibraryGroup[] = ["静态图元", "交流设备", "直流设备", "氢能设备", "热能设备"];
const CUSTOM_LIBRARY_BASE_GROUPS: LibraryGroup[] = ["交流设备", "直流设备", "氢能设备", "热能设备"];
const TERMINAL_TYPE_OPTIONS: Array<{ value: TerminalType; label: string }> = [
  { value: "ac", label: "交流电" },
  { value: "dc", label: "直流电" },
  { value: "h2", label: "氢能" },
  { value: "heat", label: "热能" }
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
const IMAGE_STORAGE_KEY = "power-system-image-assets";
const CUSTOM_DEVICE_LIBRARY_STORAGE_KEY = "power-system-custom-device-library";
const DEVICE_DEFINITION_OVERRIDES_STORAGE_KEY = "power-system-device-definition-overrides";
const COLOR_DISPLAY_MODE_STORAGE_KEY = "power-system-color-display-mode";
const COLOR_PALETTE_STORAGE_KEY = "power-system-color-palette";
const LEFT_PANEL_MODE_STORAGE_KEY = "power-system-left-panel-mode";
const RIGHT_PANEL_MODE_STORAGE_KEY = "power-system-right-panel-mode";
const LEFT_PANEL_WIDTH_STORAGE_KEY = "power-system-left-panel-width";
const RIGHT_PANEL_WIDTH_STORAGE_KEY = "power-system-right-panel-width";
const STATUSBAR_HEIGHT_STORAGE_KEY = "power-system-statusbar-height";
const VALIDATION_PANEL_HEIGHT_STORAGE_KEY = "power-system-validation-panel-height";
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
  nodes: ModelNode[],
  edges: Edge[],
  templates: readonly DeviceTemplate[]
) => {
  const templateSignature = templates.map((template) => `${template.kind}:${template.label}`).join("|");
  const treeParamSignature = (node: ModelNode) =>
    Object.keys(node.params)
      .filter((key) => key === "idx" || key.startsWith("idx_") || key.startsWith("name_") || key === "is_container")
      .sort()
      .map((key) => `${key}=${node.params[key]}`)
      .join(",");
  const nodeSignature = nodes
    .map((node) => `${node.id}:${node.kind}:${node.name}:${treeParamSignature(node)}:${node.terminals.map((terminal) => `${terminal.id}/${terminal.label}/${terminal.type}`).join(",")}`)
    .join("|");
  const edgeSignature = edges
    .map((edge) => `${edge.id}:${edge.sourceId}:${edge.targetId}:${edge.sourceTerminalId ?? ""}:${edge.targetTerminalId ?? ""}`)
    .join("|");
  return `${templateSignature}#${nodeSignature}#${edgeSignature}`;
};
const connectionEndpointSignature = (edges: Edge[]) =>
  edges
    .map((edge) => `${edge.id}:${edge.sourceId}:${edge.targetId}:${edge.sourceTerminalId ?? ""}:${edge.targetTerminalId ?? ""}`)
    .join("|");
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
  layerOrder: "图层顺序",
  terminalCount: "端子数量",
  terminalVbase: "端子电压基值",
  is_container: "是否容器",
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
  source_section: "参数来源分组",
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
  strokeStyle: ["solid", "dashed", "dotted"]
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
  return {
    ...project,
    name: normalizedName,
    project: {
      ...project.project,
      name: normalizeLegacyPowerSystemLabel(project.project.name ?? normalizedName)
    }
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
      nodes: parsed.nodes.map(normalizeNodeTerminalsByTemplate)
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
    }))
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

function groupDeviceTemplates(templates: DeviceTemplate[]): Record<string, DeviceTemplate[]> {
  return templates.reduce<Record<string, DeviceTemplate[]>>((groups, item) => {
    const group = normalizeLibraryGroupName(item.group);
    groups[group] = groups[group] ? [...groups[group], { ...item, group }] : [{ ...item, group }];
    return groups;
  }, {});
}

function normalizeLibraryGroupName(groupName: string): string {
  if (groupName === "交流系统") {
    return "交流设备";
  }
  if (groupName === "直流系统") {
    return "直流设备";
  }
  if (groupName === "变流设备") {
    return "直流设备";
  }
  return groupName;
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
      group: normalizeLibraryGroupName(String((item as DeviceTemplate).group ?? "自定义元件库")),
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
      parameterDefinitions: ((item as DeviceTemplate).parameterDefinitions ?? []).map((definition) => ({ ...definition }))
    }))
    .filter((item) => item.kind.trim() && item.label.trim());
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
    .filter((item) => item.enName);
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

function readCustomDeviceTemplates(): DeviceTemplate[] {
  try {
    return normalizeCustomDeviceTemplates(JSON.parse(window.localStorage.getItem(CUSTOM_DEVICE_LIBRARY_STORAGE_KEY) ?? "[]"));
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

function defaultExportSectionForGroup(groupName: string) {
  const normalized = normalizeLibraryGroupName(groupName);
  if (normalized.includes("直流")) return "DCLoad";
  if (normalized.includes("变流")) return "DCDCConverter";
  if (normalized.includes("氢")) return "HydroLoad";
  if (normalized.includes("热")) return "HeatLoad";
  return "ACLoad";
}

function resolveTemplateExportSection(template: DeviceTemplate) {
  const inferred = inferESection(template.kind, template.params);
  if (inferred && E_SECTION_OPTIONS.includes(inferred)) {
    return inferred;
  }
  return defaultExportSectionForGroup(template.group);
}

function createDefinitionDraftRows(template: DeviceTemplate): DeviceDefinitionDraftRow[] {
  return getTemplateParameterDefinitions(template)
    .filter((definition) => definition.enName !== "source_section")
    .map((definition) => ({
      ...definition,
      cnName: definition.cnName === definition.enName ? PARAM_LABELS[definition.enName] ?? definition.cnName : definition.cnName,
      id: deviceDefinitionRowId()
    }));
}

function createEmptyCustomDeviceDraft(groupName = "交流设备"): CustomDeviceDraft {
  return {
    groupName,
    newGroupName: "",
    deviceType: "",
    exportSection: defaultExportSectionForGroup(groupName),
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
    return Array.isArray(parsed) ? parsed : [];
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

type TextSaveOptions = {
  filename: string;
  text: string;
  mime: string;
  description: string;
  extensions: string[];
};

const EXPORT_SAVE_PICKER_ID = "model-export";

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

function buildSvgTerminalMarkup(node: ModelNode, colorDisplayMode: ColorDisplayMode = "energy", colorPalette: ColorPalette = DEFAULT_COLOR_PALETTE) {
  if (isBusNode(node) || isStaticNode(node)) {
    return "";
  }
  const nodeScaleX = getNodeScaleX(node);
  const nodeScaleY = getNodeScaleY(node);
  const inverseScaleX = nodeScaleX === 0 ? 1 : 1 / nodeScaleX;
  const inverseScaleY = nodeScaleY === 0 ? 1 : 1 / nodeScaleY;
  const stroke = getDeviceStrokeColor(node, colorDisplayMode, colorPalette);
  const strokeWidth = getDeviceStrokeWidth(node);
  return node.terminals
    .map((terminal) => {
      const stub = terminalStubSegment(terminal, nodeScaleX, nodeScaleY);
      const terminalColor = getTerminalDisplayColor(node, terminal, colorDisplayMode, colorPalette);
      const label = `${terminal.label} / ${terminal.type.toUpperCase()}`;
      return `<g class="export-terminal ${terminal.type}" transform="translate(${terminal.anchor.x * node.size.width} ${terminal.anchor.y * node.size.height}) scale(${inverseScaleX} ${inverseScaleY})">
  <line class="export-terminal-stub ${terminal.type}" x1="${stub.from.x}" y1="${stub.from.y}" x2="${stub.to.x}" y2="${stub.to.y}" stroke="${stroke}" stroke-width="${strokeWidth}" stroke-linecap="round" vector-effect="non-scaling-stroke"/>
  <circle class="export-terminal-dot ${terminal.type}" cx="0" cy="0" r="6" fill="${terminalColor}" stroke="#ffffff" stroke-width="2" vector-effect="non-scaling-stroke"><title>${escapeXml(label)}</title></circle>
</g>`;
    })
    .join("\n");
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
                : glyphVariant === "breaker"
                  ? "#eef2ff"
                  : "#ffffff";
  if (isStaticNode(node)) {
    const staticStroke = node.params.strokeColor || stroke;
    const staticFill = node.params.fillColor || "transparent";
    const lineWidth = Number(node.params.lineWidth || 2);
    const dashArray = svgStrokeDashArray(node.params.strokeStyle);
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
      return renderGeometry ? <line x1={-w / 2} y1="0" x2={w / 2} y2="0" stroke={staticStroke} strokeWidth={lineWidth} strokeDasharray={dashArray} strokeLinecap="round" /> : null;
    }
    if (node.kind === "static-polyline") {
      return renderGeometry ? <polyline points={`${-w / 2},${h / 3} 0,${-h / 3} ${w / 2},${h / 3}`} fill="none" stroke={staticStroke} strokeWidth={lineWidth} strokeDasharray={dashArray} strokeLinecap="round" strokeLinejoin="round" /> : null;
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
    return (
      <line
        className="bus-glyph"
        x1={-w / 2}
        y1="0"
        x2={w / 2}
        y2="0"
        stroke={stroke}
        strokeWidth={Math.max(8, h / 3)}
        strokeLinecap="round"
      />
    );
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
    return (
      <line
        className="bus-glyph"
        x1={-w / 2}
        y1="0"
        x2={w / 2}
        y2="0"
        stroke={stroke}
        strokeWidth={Math.max(8, h / 3)}
        strokeLinecap="round"
      />
    );
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
    return (
      <line
        className="bus-glyph"
        x1={-w / 2}
        y1="0"
        x2={w / 2}
        y2="0"
        stroke={stroke}
        strokeWidth={Math.max(8, h / 3)}
        strokeLinecap="round"
      />
    );
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

  if (node.kind === "ac-three-winding-transformer") {
    if (mode === "text") {
      return null;
    }
    const windingRadius = miniature ? 9 : 15;
    const topY = miniature ? -5 : -8;
    const bottomY = miniature ? 10 : 14;
    const sideX = miniature ? 10 : 16;
    return (
      <g className="three-winding-transformer-glyph" fill={fill} stroke={stroke} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <circle className="transformer-winding" cx={-sideX} cy={topY} r={windingRadius} />
        <circle className="transformer-winding" cx={sideX} cy={topY} r={windingRadius} />
        <circle className="transformer-winding" cx="0" cy={bottomY} r={windingRadius} />
        <path d={`M ${-sideX - windingRadius - 8} ${topY} H ${-sideX - windingRadius} M ${sideX + windingRadius} ${topY} H ${sideX + windingRadius + 8} M 0 ${bottomY + windingRadius} V ${bottomY + windingRadius + 10}`} />
        <path d={`M ${-sideX + windingRadius * 0.55} ${topY + windingRadius * 0.55} L ${-windingRadius * 0.28} ${bottomY - windingRadius * 0.72} M ${sideX - windingRadius * 0.55} ${topY + windingRadius * 0.55} L ${windingRadius * 0.28} ${bottomY - windingRadius * 0.72}`} strokeWidth="1.6" />
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

export function buildSvgDocument(nodes: ModelNode[], edges: Edge[], canvasSize: CanvasRenderOptions = { width: DEFAULT_CANVAS_WIDTH, height: DEFAULT_CANVAS_HEIGHT }) {
  const imageAssets = readImageAssets();
  const backgroundColor = canvasSize.backgroundColor ?? DEFAULT_CANVAS_BACKGROUND;
  const backgroundImage = canvasSize.backgroundImage ?? "";
  const colorDisplayMode = canvasSize.colorDisplayMode ?? "energy";
  const colorPalette = normalizeColorPalette(canvasSize.colorPalette ?? DEFAULT_COLOR_PALETTE);
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const edgeById = new Map(edges.map((edge) => [edge.id, edge]));
  const edgeMarkup = routeEdgesForRendering(nodes, edges, canvasSize)
    .map((route) => {
      const edge = edgeById.get(route.edgeId);
      const stroke = edge ? getConnectionStrokeColor(edge, nodeById, colorDisplayMode, colorPalette) : "#334155";
      return `<path d="${route.path}" fill="none" stroke="${escapeXml(stroke)}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`;
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
  const initialIndexedNodes = useMemo(
    () => assignMissingDeviceIndexes(initialDraft?.nodes ?? SAMPLE_NODES, initialDraft?.deviceIndexCounters),
    [initialDraft]
  );
  const initialSavedSchemes = useMemo(() => readSavedSchemes(), []);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const customDeviceImageInputRef = useRef<HTMLInputElement | null>(null);
  const canvasFrameRef = useRef<HTMLDivElement | null>(null);
  const canvasInteractionRef = useRef(false);
  const lastCanvasPointerRef = useRef<Point | null>(null);
  const projectListPointerInsideRef = useRef(false);
  const backendSchemesLoadedRef = useRef(false);
  const suppressNextBackendSchemeSyncRef = useRef(false);
  const lastPersistedSchemesPayloadRef = useRef<string | null>(null);
  const imageLibraryInitializedRef = useRef(false);
  const lastMouseStatusRef = useRef<Point | null>(null);
  const pendingMouseStatusRef = useRef<Point | null>(null);
  const mouseStatusFrameRef = useRef<number | null>(null);
  const connectPreviewPointRef = useRef<Point | null>(null);
  const connectDropTargetPointRef = useRef<Point | null>(null);
  const connectDropReadyRef = useRef(false);
  const pendingConnectPreviewRef = useRef<{ point: Point | null; ready: boolean; targetPoint: Point | null } | null>(null);
  const connectPreviewFrameRef = useRef<number | null>(null);
  const draggingRef = useRef<DraggingState | null>(null);
  const pendingNodeDragMoveRef = useRef<{ point: Point; ctrlKey: boolean; shiftKey: boolean } | null>(null);
  const nodeDragMoveFrameRef = useRef<number | null>(null);
  const dragUndoCapturedRef = useRef(false);
  const cachedRoutedEdgesRef = useRef<RoutedEdge[]>([]);
  const pendingRouteEdgeIdsRef = useRef<Set<string>>(new Set());
  const pendingStoredRouteEdgeIdsRef = useRef<Set<string>>(new Set());
  const elementTreeCacheRef = useRef<{ signature: string; tree: ElementTreeGroup[] }>({ signature: "", tree: [] });
  const graphDirtyBaselineRef = useRef<GraphDirtyBaseline | null>(null);
  const suppressNextGraphDirtyRef = useRef(false);
  const latestNodesRef = useRef<ModelNode[]>([]);
  const latestEdgesRef = useRef<Edge[]>([]);
  const deferredMoveOptimizationCancelRef = useRef<(() => void) | null>(null);
  const lastBusTerminalSyncSignatureRef = useRef("");
  const skipNextTopologyStaleRef = useRef(false);
  const skipCanvasSizeBlurCommitRef = useRef(false);
  const edgePointerBendInsertRef = useRef<{ edgeId: string; clientX: number; clientY: number; at: number } | null>(null);
  const lastEdgePointerClickRef = useRef<{ edgeId: string; clientX: number; clientY: number; at: number } | null>(null);
  const [nodes, setNodes] = useState<ModelNode[]>(() => initialIndexedNodes.nodes);
  const [edges, setEdges] = useState<Edge[]>(() => initialDraft?.edges ?? SAMPLE_EDGES);
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
  const [schemes, setSchemes] = useState<SavedSchemeRecord[]>(initialSavedSchemes);
  const [activeProjectId, setActiveProjectId] = useState<string>(() => initialDraft?.activeProjectId ?? "");
  const [activeSchemeId, setActiveSchemeId] = useState<string>(() => initialDraft?.activeSchemeId ?? "");
  const [mode, setMode] = useState<ToolMode>("select");
  const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>(nodes[0] ? [nodes[0].id] : []);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string>("");
  const [selectedEdgeIds, setSelectedEdgeIds] = useState<string[]>([]);
  const [connectSource, setConnectSource] = useState<{ nodeId: string; terminalId: string; point?: Point } | null>(null);
  const [connectPreviewPoint, setConnectPreviewPoint] = useState<Point | null>(null);
  const [connectDropTargetPoint, setConnectDropTargetPoint] = useState<Point | null>(null);
  const [connectDropReady, setConnectDropReady] = useState(false);
  const [dragging, setDragging] = useState<DraggingState | null>(null);
  const [rewiring, setRewiring] = useState<RewiringState>(null);
  const [terminalPress, setTerminalPress] = useState<TerminalPressState>(null);
  const [manualPathDrag, setManualPathDrag] = useState<ManualPathDrag>(null);
  const [transformDrag, setTransformDrag] = useState<TransformDrag | null>(null);
  const [viewBox, setViewBox] = useState({ x: 0, y: 0, width: DEFAULT_CANVAS_WIDTH, height: DEFAULT_CANVAS_HEIGHT });
  const [canvasCenterRequest, setCanvasCenterRequest] = useState(0);
  const [panning, setPanning] = useState<{ clientX: number; clientY: number; viewBox: typeof viewBox } | null>(null);
  const [marquee, setMarquee] = useState<Marquee>(null);
  const [canvasClipboard, setCanvasClipboard] = useState<CanvasClipboard>(EMPTY_CANVAS_CLIPBOARD);
  const [contextMenu, setContextMenu] = useState<ContextMenuState>(null);
  const [inspectorTab, setInspectorTab] = useState<"model" | "graph" | "device">("graph");
  const [graphInfoView, setGraphInfoView] = useState<"tree" | "selected">("tree");
  const [leftPanelTab, setLeftPanelTab] = useState<"projects" | "library">("projects");
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
  const [leftPanelAutoVisible, setLeftPanelAutoVisible] = useState(false);
  const [rightPanelAutoVisible, setRightPanelAutoVisible] = useState(false);
  const [containerParamViewId, setContainerParamViewId] = useState("container");
  const [expandedLibraryGroups, setExpandedLibraryGroups] = useState<LibraryGroup[]>([...DEFAULT_LIBRARY_GROUPS]);
  const [collapsedElementTreeGroups, setCollapsedElementTreeGroups] = useState<string[]>([]);
  const [customDeviceTemplates, setCustomDeviceTemplates] = useState<DeviceTemplate[]>(() => readCustomDeviceTemplates());
  const [customDeviceDialogOpen, setCustomDeviceDialogOpen] = useState(false);
  const [customDeviceDraft, setCustomDeviceDraft] = useState<CustomDeviceDraft>(() => createEmptyCustomDeviceDraft());
  const [deviceDefinitionOverrides, setDeviceDefinitionOverrides] = useState<Record<string, DeviceTemplateDefinitionOverride>>(() => readDeviceDefinitionOverrides());
  const [deviceDefinitionDialogOpen, setDeviceDefinitionDialogOpen] = useState(false);
  const [selectedDefinitionKind, setSelectedDefinitionKind] = useState<DeviceKind | "">("");
  const [expandedDefinitionGroups, setExpandedDefinitionGroups] = useState<LibraryGroup[]>([...DEFAULT_LIBRARY_GROUPS]);
  const [definitionDraftRows, setDefinitionDraftRows] = useState<DeviceDefinitionDraftRow[]>([]);
  const [definitionDraftSection, setDefinitionDraftSection] = useState("");
  const [definitionDraftError, setDefinitionDraftError] = useState("");
  const [topologyErrors, setTopologyErrors] = useState<TopologyValidationError[]>([]);
  const [topology, setTopology] = useState<Topology>(EMPTY_TOPOLOGY);
  const [topologyStatus, setTopologyStatus] = useState<TopologyRunStatus>(INITIAL_TOPOLOGY_STATUS);
  const [routeRenderingReady, setRouteRenderingReady] = useState(false);
  const [colorDisplayMode, setColorDisplayMode] = useState<ColorDisplayMode>(() => readColorDisplayMode());
  const [colorPalette, setColorPalette] = useState<ColorPalette>(() => readColorPalette());
  const [colorPaletteDraft, setColorPaletteDraft] = useState<ColorPalette>(() => readColorPalette());
  const [colorPaletteDialogOpen, setColorPaletteDialogOpen] = useState(false);
  const [colorPaletteTab, setColorPaletteTab] = useState<ColorDisplayMode>(() => readColorDisplayMode());
  const [pendingUnsavedAction, setPendingUnsavedAction] = useState<UnsavedChangeAction | null>(null);
  const [mousePosition, setMousePosition] = useState<Point | null>(null);
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

  const selectedNodeId = selectedNodeIds[0] ?? "";
  const nodeById = useMemo(() => new Map(nodes.map((node) => [node.id, node])), [nodes]);
  const edgeById = useMemo(() => new Map(edges.map((edge) => [edge.id, edge])), [edges]);
  const selectedNodeIdSet = useMemo(() => new Set(selectedNodeIds), [selectedNodeIds]);
  const selectedNode = nodeById.get(selectedNodeId);
  const activeSelectedEdgeIds = useMemo(
    () => selectedEdgeIds.length > 0 ? selectedEdgeIds : selectedEdgeId ? [selectedEdgeId] : [],
    [selectedEdgeId, selectedEdgeIds]
  );
  const activeSelectedEdgeSet = useMemo(() => new Set(activeSelectedEdgeIds), [activeSelectedEdgeIds]);
  const selectedEdge = edgeById.get(selectedEdgeId);
  const connectionLineStyle = (edgeId: string) => {
    const edge = edgeById.get(edgeId);
    return edge ? ({ "--connection-color": getConnectionStrokeColor(edge, nodeById, colorDisplayMode, colorPalette) } as CSSProperties) : undefined;
  };
  const toggleColorDisplayMode = (nextMode?: ColorDisplayMode) => {
    setColorDisplayMode((current) => nextMode ?? (current === "energy" ? "voltage" : "energy"));
  };
  const openColorPaletteDialog = () => {
    setColorPaletteDraft(normalizeColorPalette(colorPalette));
    setColorPaletteTab(colorDisplayMode);
    setColorPaletteDialogOpen(true);
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
  const groupedLibrary = useMemo(() => groupDeviceTemplates(libraryTemplates), [libraryTemplates]);
  const libraryPreviewByKind = useMemo(
    () => new Map(libraryTemplates.map((template) => [template.kind, createNodeFromTemplate(template, { x: 0, y: 0 })])),
    [libraryTemplates]
  );
  const libraryGroups = useMemo<LibraryGroup[]>(
    () => Array.from(new Set([...DEFAULT_LIBRARY_GROUPS, ...libraryTemplates.map((item) => normalizeLibraryGroupName(item.group))])),
    [libraryTemplates]
  );
  const selectedDefinitionTemplate = selectedDefinitionKind ? libraryTemplateByKind.get(selectedDefinitionKind) ?? libraryTemplates[0] : libraryTemplates[0];
  const selectedDefinitionBaseTemplate = selectedDefinitionTemplate ? baseLibraryTemplateByKind.get(selectedDefinitionTemplate.kind) : undefined;
  const selectedDefinitionTerminalAssociations = selectedDefinitionTemplate
    ? describeContainerTerminalAssociations(selectedDefinitionTemplate)
    : [];
  const selectedNodeTemplate = selectedNode ? libraryTemplateByKind.get(selectedNode.kind) : undefined;
  const selectedContainerParameterViews = useMemo(
    () => (selectedNode ? buildContainerDeviceParameterViews(selectedNode, selectedNodeTemplate) : []),
    [selectedNode, selectedNodeTemplate]
  );
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
      nodes,
      edges
    }
  };
  const selectedSchemeRecord = schemes.find((scheme) => scheme.id === selectedSchemeId);
  const selectedNodeCount = selectedNodeIds.length;
  const selectedCount = selectedNodeCount + activeSelectedEdgeIds.length;
  const visibleTopologyErrors = topologyErrors.slice(0, 100);
  const hiddenTopologyErrorCount = Math.max(0, topologyErrors.length - visibleTopologyErrors.length);
  const draggingNodeIdSet = useMemo(() => new Set(dragging?.nodeIds ?? []), [dragging?.nodeIds]);
  const deferredElementTreeNodes = useDeferredValue(nodes);
  const deferredElementTreeEdges = useDeferredValue(edges);
  const graphTreePanelActive = inspectorTab === "graph" && graphInfoView === "tree";
  const elementTreeSignature = useMemo(
    () => graphTreePanelActive
      ? elementTreeCacheSignature(deferredElementTreeNodes, deferredElementTreeEdges, libraryTemplates)
      : "",
    [deferredElementTreeEdges, deferredElementTreeNodes, graphTreePanelActive, libraryTemplates]
  );
  const elementTree = useMemo(() => {
    if (!graphTreePanelActive) {
      return [];
    }
    if (elementTreeCacheRef.current.signature === elementTreeSignature) {
      return elementTreeCacheRef.current.tree;
    }
    const tree = buildElementTree(deferredElementTreeNodes, deferredElementTreeEdges, libraryTemplates);
    elementTreeCacheRef.current = { signature: elementTreeSignature, tree };
    return tree;
  }, [deferredElementTreeEdges, deferredElementTreeNodes, elementTreeSignature, graphTreePanelActive, libraryTemplates]);

  useEffect(() => {
    setSelectedEdgeIds((current) => {
      if (!selectedEdgeId) {
        return current.length === 0 ? current : [];
      }
      return current.includes(selectedEdgeId) ? current : [selectedEdgeId];
    });
  }, [selectedEdgeId]);

  useEffect(() => {
    if (
      dragging ||
      manualPathDrag ||
      rewiring ||
      terminalPress?.moved ||
      connectSource ||
      !nodes.some(isBusNode)
    ) {
      return;
    }
    const endpointSignature = connectionEndpointSignature(edges);
    if (lastBusTerminalSyncSignatureRef.current === endpointSignature) {
      return;
    }
    lastBusTerminalSyncSignatureRef.current = endpointSignature;
    return scheduleIdleWork(() => {
      const syncNodes = latestNodesRef.current;
      const syncEdges = latestEdgesRef.current;
      const synchronized = synchronizeBusTerminalsWithEdges(syncNodes, syncEdges);
      if (synchronized.nodes !== syncNodes || synchronized.edges !== syncEdges) {
        const synchronizedNodeById = new Map(synchronized.nodes.map((node) => [node.id, node]));
        const changedNodeIds = syncNodes
          .filter((node) => synchronizedNodeById.get(node.id) !== node)
          .map((node) => node.id);
        markRouteEdgesDirty(dirtyEdgeIdsAfterMove(syncEdges, synchronized.edges, changedNodeIds));
        suppressNextGraphDirtyRef.current = true;
      }
      if (synchronized.nodes !== syncNodes) {
        setNodes(synchronized.nodes);
      }
      if (synchronized.edges !== syncEdges) {
        setEdges(synchronized.edges);
      }
    }, 300, 1000);
  }, [connectSource, dragging, edges, manualPathDrag, nodes, rewiring, terminalPress?.moved]);

  useEffect(() => {
    if (!graphTreePanelActive) {
      return;
    }
    const existingKeys = new Set(elementTree.map((group) => group.typeKey));
    setCollapsedElementTreeGroups((current) => current.filter((key) => existingKeys.has(key)));
  }, [elementTree, graphTreePanelActive]);

  const canvasBounds = useMemo<CanvasBounds>(() => ({ width: canvasWidth, height: canvasHeight }), [canvasHeight, canvasWidth]);
  const leftPanelVisible = isSidePanelVisible(leftPanelMode, leftPanelAutoVisible);
  const rightPanelVisible = isSidePanelVisible(rightPanelMode, rightPanelAutoVisible);
  const nodeImageById = useMemo(
    () => new Map(nodes.map((node) => [node.id, resolveNodeImage(node, imageAssets)])),
    [imageAssets, nodes]
  );
  const nodeForegroundImageById = useMemo(
    () => new Map(nodes.map((node) => [node.id, resolveNodeForegroundImage(node, imageAssets)])),
    [imageAssets, nodes]
  );
  const nodeImage = (node: ModelNode) => nodeImageById.get(node.id) ?? "";
  const nodeForegroundImage = (node: ModelNode) => nodeForegroundImageById.get(node.id) ?? "";
  const canvasBackgroundImageUrl = resolveProjectImage(
    { canvasBackgroundImage, canvasBackgroundImageAssetId },
    imageAssets
  );

  useEffect(() => {
    setCanvasSizeDraft({ width: String(canvasWidth), height: String(canvasHeight) });
  }, [canvasHeight, canvasWidth]);

  const connectPreviewPath = useMemo(() => {
    const endPoint = connectDropTargetPoint ?? connectPreviewPoint;
    if (!connectSource || !endPoint) {
      return "";
    }
    const sourceNode = nodeById.get(connectSource.nodeId);
    if (!sourceNode) {
      return "";
    }
    const sourcePoint = connectSource.point ?? getModelEdgeEndpointPoint(sourceNode, undefined, connectSource.terminalId);
    const route = routeEdgesForRendering(
      nodes,
      [{
        id: "connect-preview",
        sourceId: sourceNode.id,
        targetId: "floating-connect-preview-target",
        sourceTerminalId: connectSource.terminalId,
        targetTerminalId: "t1",
        sourcePoint,
        targetPoint: endPoint
      }],
      canvasBounds
    )[0];
    return route?.path ?? "";
  }, [canvasBounds, connectDropTargetPoint, connectPreviewPoint, connectSource, nodeById, nodes]);
  const connectPreviewColor = useMemo(() => {
    if (!connectSource) {
      return "";
    }
    const sourceNode = nodeById.get(connectSource.nodeId);
    const terminal =
      sourceNode?.terminals.find((item) => item.id === connectSource.terminalId) ??
      sourceNode?.terminals[0];
    const terminalType = terminal?.type ?? (sourceNode ? getBusTerminalType(sourceNode) : undefined);
    return sourceNode && terminal
      ? getTerminalDisplayColor(sourceNode, terminal, colorDisplayMode, colorPalette)
      : terminalType
        ? terminalColor(terminalType, colorPalette)
        : "";
  }, [colorDisplayMode, colorPalette, connectSource, nodeById]);
  useEffect(() => {
    if (routeRenderingReady) {
      return;
    }
    if (hasUnsavedChanges || manualPathDrag || rewiring || terminalPress?.moved || dragging || connectSource) {
      setRouteRenderingReady(true);
    }
  }, [connectSource, dragging, hasUnsavedChanges, manualPathDrag, rewiring, routeRenderingReady, terminalPress?.moved]);

  const deferredRoutingNodes = useDeferredValue(nodes);
  const deferredRoutingEdges = useDeferredValue(edges);
  const deferredRoutingIsCurrent = deferredRoutingNodes === nodes && deferredRoutingEdges === edges;
  const requiresLiveRouting = Boolean(manualPathDrag || !deferredRoutingIsCurrent);
  const routingNodes = requiresLiveRouting ? nodes : deferredRoutingNodes;
  const routingEdges = requiresLiveRouting ? edges : deferredRoutingEdges;
  const affectedRoutingEdgeIds = useMemo(() => {
    const ids = new Set<string>();
    if (manualPathDrag) {
      ids.add(manualPathDrag.edgeId);
    }
    if (rewiring) {
      ids.add(rewiring.edgeId);
    }
    if (terminalPress?.moved) {
      edges.forEach((edge) => {
        const sourceAffected = edge.sourceId === terminalPress.nodeId && edge.sourceTerminalId === terminalPress.terminalId;
        const targetAffected = edge.targetId === terminalPress.nodeId && edge.targetTerminalId === terminalPress.terminalId;
        if (sourceAffected || targetAffected) {
          ids.add(edge.id);
        }
      });
    }
    return ids;
  }, [edges, manualPathDrag, rewiring, terminalPress]);
  const routeRenderingEnabled = routeRenderingReady;
  const routedEdges = useMemo(() => {
    if (!routeRenderingEnabled) {
      return routeEdgesForStoredRendering(routingNodes, routingEdges, canvasBounds);
    }
    const committedStoredEdgeIds = pendingStoredRouteEdgeIdsRef.current;
    if (committedStoredEdgeIds.size > 0 && !manualPathDrag && !rewiring && !terminalPress?.moved) {
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
  }, [affectedRoutingEdgeIds, canvasBounds, manualPathDrag, rewiring, routeRenderingEnabled, routingEdges, routingNodes, terminalPress?.moved]);
  useEffect(() => {
    cachedRoutedEdgesRef.current = routedEdges;
    pendingRouteEdgeIdsRef.current = new Set();
    pendingStoredRouteEdgeIdsRef.current = new Set();
  }, [routedEdges]);
  const renderedRoutedEdges = useMemo(() => {
    if (activeSelectedEdgeSet.size === 0) {
      return routedEdges;
    }
    const regularRoutes: RoutedEdge[] = [];
    const selectedRoutes: RoutedEdge[] = [];
    for (const route of routedEdges) {
      if (activeSelectedEdgeSet.has(route.edgeId)) {
        selectedRoutes.push(route);
      } else {
        regularRoutes.push(route);
      }
    }
    return selectedRoutes.length > 0 ? [...regularRoutes, ...selectedRoutes] : routedEdges;
  }, [activeSelectedEdgeSet, routedEdges]);
  const routedEdgeById = useMemo(() => new Map(routedEdges.map((route) => [route.edgeId, route])), [routedEdges]);
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
  const selectedRoutedEdge = routedEdgeById.get(selectedEdgeId);
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
    const route = routeEdgesForRendering(nodes, [previewRouteEdge], canvasBounds)[0];
    return {
      edgeId: edge.id,
      path: route?.path ?? ""
    };
  }, [canvasBounds, edgeById, nodeById, nodes, rewiring]);
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
    return edges.flatMap((edge) => {
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
        nodes,
        originalMovingPoint: terminalPress.startPoint
      });
      const previewEdge = slidePatch ? { ...edge, ...slidePatch } : edge;
      const route = routeEdgesForRendering(nodes, [previewEdge], canvasBounds)[0];
      return route ? [{
        edgeId: edge.id,
        path: route.path
      }] : [];
    });
  }, [canvasBounds, edges, nodeById, nodes, terminalPress]);
  const terminalPressPreviewEdgeIdSet = useMemo(
    () => new Set(terminalPressPreviewEdgeRoutes.map((route) => route.edgeId)),
    [terminalPressPreviewEdgeRoutes]
  );
  const draggingDelta = dragging?.currentDelta;
  const draggedBusIds = useMemo(
    () => new Set(nodes.filter((node) => draggingNodeIdSet.has(node.id) && isBusNode(node)).map((node) => node.id)),
    [draggingNodeIdSet, nodes]
  );
  const dragPreviewNodeById = useMemo(() => {
    if (!dragging || !draggingDelta) {
      return nodeById;
    }
    const preview = new Map(nodeById);
    for (const nodeId of dragging.nodeIds) {
      const node = nodeById.get(nodeId);
      const originalPosition = dragging.originalPositions[nodeId];
      if (!node || !originalPosition) {
        continue;
      }
      preview.set(nodeId, {
        ...node,
        position: clampNodePositionToBounds(node, canvasBounds, {
          x: originalPosition.x + draggingDelta.x,
          y: originalPosition.y + draggingDelta.y
        })
      });
    }
    return preview;
  }, [canvasBounds, dragging, draggingDelta, nodeById]);
  const dragPreviewNodes = useMemo(
    () => (dragging && draggingDelta ? Array.from(dragPreviewNodeById.values()) : nodes),
    [dragPreviewNodeById, dragging, draggingDelta, nodes]
  );
  const terminalOverlapNodes = dragging && draggingDelta ? dragPreviewNodes : deferredRoutingNodes;
  const terminalOverlapAffectedNodeIds = dragging && draggingDelta ? draggingNodeIdSet : undefined;
  const overlappedTerminalKeys = useMemo(
    () => new Set(
      [
        ...getOverlappingTerminalGroups(terminalOverlapNodes, terminalOverlapAffectedNodeIds).flatMap((group) =>
          group.terminals.map((terminal) => `${terminal.nodeId}:${terminal.terminalId}`)
        ),
        ...getTerminalBusContactGroups(terminalOverlapNodes, 0, terminalOverlapAffectedNodeIds).flatMap((group) =>
          group.contacts.map((contact) => `${contact.nodeId}:${contact.terminalId}`)
        )
      ]
    ),
    [terminalOverlapAffectedNodeIds, terminalOverlapNodes]
  );
  const nodeTerminalSnapTarget = useMemo(
    () => (
      dragging && draggingDelta
        ? findNodeTerminalSnapTarget(dragPreviewNodes, draggingNodeIdSet) ??
          findNodeBusSnapTarget(dragPreviewNodes, draggingNodeIdSet)
        : null
    ),
    [dragPreviewNodes, dragging, draggingDelta, draggingNodeIdSet]
  );
  const nodeTerminalSnapHintStyle = useMemo(() => {
    if (!nodeTerminalSnapTarget) {
      return undefined;
    }
    const targetNode = dragPreviewNodeById.get(nodeTerminalSnapTarget.targetNodeId);
    const terminalType = targetNode && isBusNode(targetNode)
      ? getBusTerminalType(targetNode)
      : targetNode?.terminals.find((terminal) => terminal.id === nodeTerminalSnapTarget.targetTerminalId)?.type;
    return terminalType ? ({ "--connection-color": terminalColor(terminalType, colorPalette) } as CSSProperties) : undefined;
  }, [colorPalette, dragPreviewNodeById, nodeTerminalSnapTarget]);
  const activeDropHintPoint = connectDropTargetPoint ?? rewiring?.dropTargetPoint ?? nodeTerminalSnapTarget?.point ?? null;
  const activeDropReady = connectDropReady || Boolean(rewiring?.dropTargetPoint) || Boolean(nodeTerminalSnapTarget);
  const activeDropHintStyle = connectDropTargetPoint
    ? (connectPreviewColor ? ({ "--connection-color": connectPreviewColor } as CSSProperties) : undefined)
    : rewiring?.dropTargetPoint
      ? connectionLineStyle(rewiring.edgeId)
      : nodeTerminalSnapHintStyle;
  const dragPreviewEdgeRoutes = useMemo(() => {
    if (!dragging || !draggingDelta) {
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
      const source = dragPreviewNodeById.get(previewEdge.sourceId);
      const target = dragPreviewNodeById.get(previewEdge.targetId);
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
            nextNodes: dragPreviewNodes
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
  }, [dragPreviewNodeById, dragPreviewNodes, draggedBusIds, dragging, draggingDelta, draggingNodeIdSet, nodeById, nodes]);
  const dragPreviewEdgeIdSet = useMemo(
    () => new Set(dragPreviewEdgeRoutes.map((route) => route.edgeId)),
    [dragPreviewEdgeRoutes]
  );
  const dragGhostEdgeRoutes = useMemo(() => {
    if (!dragging || !draggingDelta) {
      return [];
    }
    const draggedEdgeIds = new Set(dragging.edgeIds);
    return dragging.affectedEdges.flatMap((edge) => {
      if (!draggingNodeIdSet.has(edge.sourceId) && !draggingNodeIdSet.has(edge.targetId) && !draggedEdgeIds.has(edge.id)) {
        return [];
      }
      const points = dragging.originalRoutePoints[edge.id];
      return points?.length ? [{ edgeId: edge.id, path: pointsToPreviewPath(points) }] : [];
    });
  }, [dragging, draggingDelta, draggingNodeIdSet]);

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
    fetchBackendSchemes()
      .then((backendSchemes) => {
        backendSchemesLoadedRef.current = true;
        if (backendSchemes.length > 0) {
          const backendPayload = serializeSchemesForStorage(backendSchemes);
          lastPersistedSchemesPayloadRef.current = backendPayload;
          suppressNextBackendSchemeSyncRef.current = true;
          setSchemes(backendSchemes);
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
        if (initialSavedSchemes.length > 0) {
          const initialPayload = serializeSchemesForStorage(initialSavedSchemes);
          lastPersistedSchemesPayloadRef.current = initialPayload;
          void saveBackendSchemesPayload(initialPayload).catch(() => {
            // 后台暂不可写时仍保留本地缓存，避免打断画布编辑。
          });
        }
      })
      .catch(() => {
        backendSchemesLoadedRef.current = false;
        // 后台不可用时继续使用浏览器本地保存。
      });
    // 仅在启动时从后台拉取一次，避免后台数据刷新打断当前画布。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const normalizedSchemesPayload = serializeSchemesForStorage(schemes);
      if (normalizedSchemesPayload === lastPersistedSchemesPayloadRef.current) {
        if (suppressNextBackendSchemeSyncRef.current) {
          suppressNextBackendSchemeSyncRef.current = false;
        }
        return;
      }
      lastPersistedSchemesPayloadRef.current = normalizedSchemesPayload;
      try {
        window.localStorage.setItem(SCHEME_STORAGE_KEY, normalizedSchemesPayload);
      } catch {
        // 浏览器缓存不可写时不阻断当前编辑，后台同步仍会继续尝试。
      }
      if (!backendSchemesLoadedRef.current) {
        return;
      }
      if (suppressNextBackendSchemeSyncRef.current) {
        suppressNextBackendSchemeSyncRef.current = false;
        return;
      }
      void saveBackendSchemesPayload(normalizedSchemesPayload).catch(() => {
        // 后台保存失败时不阻塞本地编辑；下一次方案/模型变更会继续尝试同步。
      });
    }, 800);
    return () => window.clearTimeout(timeoutId);
  }, [schemes]);

  useEffect(() => {
    window.localStorage.setItem(CUSTOM_DEVICE_LIBRARY_STORAGE_KEY, JSON.stringify(customDeviceTemplates));
  }, [customDeviceTemplates]);

  useEffect(() => {
    window.localStorage.setItem(DEVICE_DEFINITION_OVERRIDES_STORAGE_KEY, JSON.stringify(deviceDefinitionOverrides));
  }, [deviceDefinitionOverrides]);

  useEffect(() => {
    window.localStorage.setItem(COLOR_DISPLAY_MODE_STORAGE_KEY, colorDisplayMode);
  }, [colorDisplayMode]);

  useEffect(() => {
    window.localStorage.setItem(COLOR_PALETTE_STORAGE_KEY, JSON.stringify(colorPalette));
  }, [colorPalette]);

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
    connectPreviewPointRef.current = connectPreviewPoint;
    connectDropReadyRef.current = connectDropReady;
  }, [connectDropReady, connectPreviewPoint]);

  useEffect(() => {
    draggingRef.current = dragging;
    if (!dragging) {
      dragUndoCapturedRef.current = false;
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

  const requestCanvasFrameCenter = () => {
    setCanvasCenterRequest((current) => current + 1);
  };

  const undoLastOperation = () => {
    setUndoStack((current) => {
      const snapshot = current.at(-1);
      if (!snapshot) {
        return current;
      }
      setProjectName(snapshot.projectName);
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
      setNodes(snapshot.nodes);
      setEdges(snapshot.edges);
      setTopologyErrors(snapshot.topologyErrors);
      setTopology(snapshot.topology);
      setTopologyStatus(snapshot.topologyStatus);
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
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "a") {
        if (isCanvasShortcutTarget) {
          event.preventDefault();
          setSelectedNodeIds(nodes.map((node) => node.id));
          setSelectedEdgeId("");
          setSelectedEdgeIds([]);
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
        moveSelection(-keyboardMoveStepForViewBox(viewBox, canvasBounds, event.shiftKey ? 24 : 6), 0);
      } else if (isCanvasShortcutTarget && event.key === "ArrowRight") {
        event.preventDefault();
        moveSelection(keyboardMoveStepForViewBox(viewBox, canvasBounds, event.shiftKey ? 24 : 6), 0);
      } else if (isCanvasShortcutTarget && event.key === "ArrowUp") {
        event.preventDefault();
        moveSelection(0, -keyboardMoveStepForViewBox(viewBox, canvasBounds, event.shiftKey ? 24 : 6));
      } else if (isCanvasShortcutTarget && event.key === "ArrowDown") {
        event.preventDefault();
        moveSelection(0, keyboardMoveStepForViewBox(viewBox, canvasBounds, event.shiftKey ? 24 : 6));
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [canvasBounds, canvasClipboard, deviceIndexCounters, edges, hasUnsavedChanges, nodes, projectById, projectName, recordClipboard, routedEdgeById, saveRequired, schemes, selectedEdgeId, selectedEdgeIds, selectedNodeIds, selectedProjectId, selectedProjectIds, selectedSchemeId, selectedSchemeIds, topologyErrors, viewBox]);

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

  const currentProject = (): ProjectFile => ({
    ...lockProjectEdgeTerminals({
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
      nodes,
      edges
    })
  });

  const currentGraphDirtyBaseline = (): GraphDirtyBaseline => ({
    projectName,
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
    edges
  });

  const graphDirtyBaselineChanged = (previous: GraphDirtyBaseline, next: GraphDirtyBaseline) =>
    previous.projectName !== next.projectName ||
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
    previous.edges !== next.edges;

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
  }, [canvasBackgroundColor, canvasBackgroundImage, canvasBackgroundImageAssetId, canvasHeight, canvasWidth, currentUnit, deviceIndexCounters, edges, nodes, powerBaseValue, powerUnit, projectName, voltageUnit]);

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

  const connectionCommitFailureMessage = (issues: { type?: string; message?: string }[] = []) => {
    const needsReroute = issues.some((issue) =>
      issue.type === "blocked-by-node" ||
      issue.type === "overlaps-connection" ||
      issue.type === "out-of-bounds"
    );
    if (needsReroute) {
      return "已自动尝试避让图元和已有联络线，但当前空间不足以形成安全正交路径，请稍微移动相关图元或扩大显示区域后重试。";
    }
    return issues[0]?.message ?? "联络线不满足正交、避让、端子垂直或最优路径约束。";
  };

  const copySelection = () => {
    setCanvasClipboard(buildCanvasClipboard(nodes, edges, routedEdges, selectedNodeIds, activeSelectedEdgeIds));
    writeOperationLog(`复制 ${selectedNodeIds.length} 个图元、${activeSelectedEdgeIds.length} 条联络线`);
  };

  const cutSelection = () => {
    const action = resolveCanvasDeleteAction({
      selectedNodeCount: selectedNodeIds.length,
      hasSelectedEdge: activeSelectedEdgeIds.length > 0
    });
    if (action.kind === "warn") {
      window.alert(action.message);
      return;
    }
    const clipboard = buildCanvasClipboard(nodes, edges, routedEdges, selectedNodeIds, activeSelectedEdgeIds);
    setCanvasClipboard(clipboard);
    pushUndoSnapshot();
    const selectedEdges = new Set(activeSelectedEdgeIds);
    const result = selectedNodeIds.length > 0
      ? deleteNodesWithConnectedEdges(nodes, edges, selectedNodeIds)
      : { nodes, edges };
    setNodes(result.nodes);
    setEdges(result.edges.filter((edge) => !selectedEdges.has(edge.id)));
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
    const targetPoint = lastCanvasPointerRef.current;
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
    if (targetPoint.x < 0 || targetPoint.y < 0 || targetPoint.x + width > canvasWidth || targetPoint.y + height > canvasHeight) {
      window.alert("粘贴位置超过显示边界，请调整鼠标位置后重试。");
      return;
    }
    const cloned = cloneCanvasClipboard(
      canvasClipboard,
      targetPoint,
      () => `node-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      () => `edge-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
    );
    if (cloned.nodes.length === 0 && cloned.edges.length === 0) {
      if (canvasClipboard.edges.length > 0) {
        window.alert("不能粘贴悬空联络线：请同时复制联络线两端连接的设备或母线。");
      }
      return;
    }
    pushUndoSnapshot();
    let nextDeviceIndexCounters = normalizeDeviceIndexCounters(deviceIndexCounters, nodes);
    const pasted = cloned.nodes.map((node) => {
      const draftNode = { ...node, position: clampNodeToCanvas(node, node.position) };
      const result = assignPermanentDeviceIndex(draftNode, nextDeviceIndexCounters);
      nextDeviceIndexCounters = result.counters;
      return result.node;
    });
    const pastedEdges = cloned.edges.map((edge) => ({
      ...edge,
      sourcePoint: edge.sourcePoint ? clampPointToCanvas(edge.sourcePoint) : undefined,
      targetPoint: edge.targetPoint ? clampPointToCanvas(edge.targetPoint) : undefined,
      manualPoints: edge.manualPoints?.map((point) => clampPointToCanvas(point))
    }));
    setDeviceIndexCounters(nextDeviceIndexCounters);
    setNodes((current) => [...current, ...pasted]);
    setEdges((current) => [...current, ...pastedEdges]);
    setSelectedNodeIds(pasted.map((node) => node.id));
    setSelectedEdgeIds(pastedEdges.map((edge) => edge.id));
    setSelectedEdgeId(pastedEdges[0]?.id ?? "");
    setConnectSource(null);
    resetConnectPreviewState();
    setRewiring(null);
    setContextMenu(null);
    writeOperationLog(`粘贴 ${pasted.length} 个图元、${pastedEdges.length} 条联络线`);
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
    const selection = selectGraphicsInRect(nodes, routedEdges, { left, right, top, bottom });
    setSelectedNodeIds(selection.nodeIds);
    setSelectedEdgeIds(selection.edgeIds);
    setSelectedEdgeId(selection.edgeIds[0] ?? "");
    setConnectSource(null);
    resetConnectPreviewState();
    setRewiring(null);
    setContextMenu(null);
    setMarquee(null);
  };

  const deleteSelection = () => {
    if (selectedNodeIds.length === 0 && activeSelectedEdgeIds.length === 0) {
      return;
    }
    const selectedEdges = new Set(activeSelectedEdgeIds);
    if (selectedNodeIds.length === 0) {
      pushUndoSnapshot();
      setEdges((current) => current.filter((edge) => !selectedEdges.has(edge.id)));
      setSelectedEdgeId("");
      setSelectedEdgeIds([]);
      writeOperationLog(`删除 ${selectedEdges.size} 条联络线`);
      return;
    }
    pushUndoSnapshot();
    const result = deleteNodesWithConnectedEdges(nodes, edges, selectedNodeIds);
    setNodes(result.nodes);
    setEdges(result.edges.filter((edge) => !selectedEdges.has(edge.id)));
    setSelectedNodeIds([]);
    setSelectedEdgeId("");
    setSelectedEdgeIds([]);
    writeOperationLog(`删除 ${selectedNodeIds.length} 个图元`);
  };

  const deleteSelectedGraphicsFromCanvas = () => {
    const action = resolveCanvasDeleteAction({
      selectedNodeCount: selectedNodeIds.length,
      hasSelectedEdge: activeSelectedEdgeIds.length > 0
    });
    if (action.kind === "warn") {
      window.alert(action.message);
      return;
    }
    deleteSelection();
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
    const movedNodes = nextNodes.filter((node) => movedIds.has(node.id));
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
    preserveRouteEdgeIds = new Set<string>()
  ) => {
    const movedBusIds = new Set(nodes.filter((node) => movedNodeIds.has(node.id) && isBusNode(node)).map((node) => node.id));
    const nextNodeById = new Map(nextNodes.map((node) => [node.id, node]));
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
      const nextSource = nextNodeById.get(edge.sourceId);
      const nextTarget = nextNodeById.get(edge.targetId);
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
      const shouldPreserveRoute = originalRoute?.length && (preserveRouteEdgeIds.has(edge.id) || Boolean(edge.manualPoints?.length));
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
      const boundedNextEdge = clampEdgeGeometryToBounds(nextEdge, canvasBounds);
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
    selectedEdgeIds = new Set<string>()
  ) => {
    const movedIds = new Set(movedNodeIds);
    if (movedIds.size !== 1) {
      return candidateEdges;
    }
    const affectedEdgeIds = candidateEdges
      .filter((edge) => movedIds.has(edge.sourceId) || movedIds.has(edge.targetId) || selectedEdgeIds.has(edge.id))
      .map((edge) => edge.id);
    return affectedEdgeIds.length === 1
      ? rebuildSingleConnectionRoute(nextNodes, candidateEdges, affectedEdgeIds[0], canvasBounds)
      : candidateEdges;
  };

  const finalizeMovedNodeEdgesFast = (
    previousNodes: ModelNode[],
    nextNodes: ModelNode[],
    candidateEdges: Edge[],
    movedNodeIds: string[]
  ) => {
    const movedNodeIdSet = new Set(movedNodeIds);
    const reconciled = reconcileOverlappingTerminalConnections(
      previousNodes,
      nextNodes,
      candidateEdges,
      (_first, _second, index) => `edge-overlap-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 6)}`,
      movedNodeIdSet
    );
    let nextEdges = reconciled.edges;
    for (const edgeId of reconciled.addedEdgeIds) {
      const prepared = prepareConnectionEdgeForCommit(nextNodes, nextEdges, edgeId, canvasBounds);
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
    selectedEdgeIds = new Set<string>()
  ) => {
    const routePointsForReroute = routePointsForMovedNodeBlockers(
      nextNodes,
      candidateEdges,
      movedNodeIds,
      originalRoutePoints
    );
    const rebuiltAdjustedEdges = rebuildSingleAffectedConnectionRoute(
      nextNodes,
      candidateEdges,
      movedNodeIds,
      selectedEdgeIds
    );
    return {
      routePoints: routePointsForReroute,
      edges: rerouteEdgesAroundMovedNodes(
        nextNodes,
        rebuiltAdjustedEdges,
        movedNodeIds,
        routePointSnapshotToRoutes(routePointsForReroute),
        canvasBounds
      )
    };
  };

  const shouldRunDeferredMoveOptimization = (
    candidateEdges: Edge[],
    movedNodeIds: string[],
    selectedEdgeIds: Set<string>
  ) => {
    const movedIds = new Set(movedNodeIds);
    if (movedIds.size <= 1 || selectedEdgeIds.size === 1) {
      return true;
    }
    let affectedConnectionCount = 0;
    for (const edge of candidateEdges) {
      if (movedIds.has(edge.sourceId) || movedIds.has(edge.targetId) || selectedEdgeIds.has(edge.id)) {
        affectedConnectionCount += 1;
        if (affectedConnectionCount > 1) {
          return false;
        }
      }
    }
    return affectedConnectionCount <= 1;
  };

  const scheduleMovedEdgeOptimization = (
    nextNodes: ModelNode[],
    fastEdges: Edge[],
    movedNodeIds: string[],
    originalRoutePoints: DraggingState["originalRoutePoints"],
    selectedEdgeIds = new Set<string>()
  ) => {
    deferredMoveOptimizationCancelRef.current?.();
    if (!shouldRunDeferredMoveOptimization(fastEdges, movedNodeIds, selectedEdgeIds)) {
      deferredMoveOptimizationCancelRef.current = null;
      return;
    }
    const expectedNodes = nextNodes;
    const expectedEdges = fastEdges;
    deferredMoveOptimizationCancelRef.current = scheduleIdleWork(() => {
      deferredMoveOptimizationCancelRef.current = null;
      if (latestNodesRef.current !== expectedNodes || latestEdgesRef.current !== expectedEdges) {
        return;
      }
      const optimized = optimizeMovedNodeEdgeRoutes(
        expectedNodes,
        expectedEdges,
        movedNodeIds,
        originalRoutePoints,
        selectedEdgeIds
      );
      if (optimized.edges === expectedEdges) {
        return;
      }
      markRouteEdgesDirty(dirtyEdgeIdsAfterMove(
        expectedEdges,
        optimized.edges,
        movedNodeIds,
        Object.keys(optimized.routePoints)
      ));
      setEdges(optimized.edges);
    }, 180, 1500);
  };

  const commitFastMovedGraph = (
    nextNodes: ModelNode[],
    nextEdges: Edge[],
    movedNodeIds: string[],
    originalRoutePoints: DraggingState["originalRoutePoints"],
    selectedEdgeIds = new Set<string>()
  ) => {
    markStoredRouteEdgesDirty(dirtyEdgeIdsAfterMove(edges, nextEdges, movedNodeIds, selectedEdgeIds));
    setNodes(nextNodes);
    if (nextEdges !== edges) {
      setEdges(nextEdges);
    }
    scheduleMovedEdgeOptimization(
      nextNodes,
      nextEdges,
      movedNodeIds,
      originalRoutePoints,
      selectedEdgeIds
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
      setMousePosition(next);
    });
  };
  const applyConnectPreviewState = (point: Point | null, ready: boolean, targetPoint: Point | null = null) => {
    const previousPoint = connectPreviewPointRef.current;
    if (!sameOptionalPoint(previousPoint ?? undefined, point ?? undefined)) {
      connectPreviewPointRef.current = point;
      setConnectPreviewPoint(point);
    }
    const previousTargetPoint = connectDropTargetPointRef.current;
    const nextTargetPoint = ready ? targetPoint : null;
    if (!sameOptionalPoint(previousTargetPoint ?? undefined, nextTargetPoint ?? undefined)) {
      connectDropTargetPointRef.current = nextTargetPoint;
      setConnectDropTargetPoint(nextTargetPoint);
    }
    if (connectDropReadyRef.current !== ready) {
      connectDropReadyRef.current = ready;
      setConnectDropReady(ready);
    }
  };
  const scheduleConnectPreviewState = (point: Point | null, ready: boolean, targetPoint: Point | null = null) => {
    pendingConnectPreviewRef.current = { point, ready, targetPoint };
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
      applyConnectPreviewState(next.point, next.ready, next.targetPoint);
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
    const sourceNode = nodeById.get(connectSource.nodeId);
    if (!sourceNode) {
      return point;
    }
    const start = connectSource.point ?? getModelEdgeEndpointPoint(sourceNode, undefined, connectSource.terminalId);
    return clampPointToCanvas(constrainPointToOrthogonalAxis(start, point));
  };
  const axisLockedDelta = (dx: number, dy: number): Point => (
    Math.abs(dx) >= Math.abs(dy) ? { x: dx, y: 0 } : { x: 0, y: dy }
  );
  const boundedDeltaForNodes = (nodeIds: string[], originalPositions: Record<string, Point>, dx: number, dy: number) => {
    let boundedDx = dx;
    let boundedDy = dy;
    const selected = new Set(nodeIds);
    for (const node of nodes) {
      const original = originalPositions[node.id];
      if (!selected.has(node.id) || !original) {
        continue;
      }
      const clamped = clampNodeToCanvas(node, { x: original.x + boundedDx, y: original.y + boundedDy });
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
    delta: Point
  ) => {
    const movedNodeIds = new Set(nodeIds);
    const preserveRouteEdgeIds = new Set(edgeIds);
    const selectedEdgeIds = new Set(edgeIds);
    const nextNodes = nodes.map((node) => {
      const originalPosition = originalPositions[node.id];
      return movedNodeIds.has(node.id) && originalPosition
        ? { ...node, position: clampNodeToCanvas(node, { x: originalPosition.x + delta.x, y: originalPosition.y + delta.y }) }
        : node;
    });
    const movedNodes = nextNodes.filter((node) => movedNodeIds.has(node.id));
    const deltasByNode = Object.fromEntries(nodeIds.map((id) => [id, delta]));
    const affectedEdges = affectedEdgesForMove.filter(
      (edge) => movedNodeIds.has(edge.sourceId) || movedNodeIds.has(edge.targetId) || selectedEdgeIds.has(edge.id)
    );
    const nextAffectedEdges =
      affectedEdges.length > 0
        ? adjustEdgesAfterNodeMove(
            affectedEdges,
            nextNodes,
            movedNodeIds,
            originalEdgePoints,
            deltasByNode,
            originalRoutePoints,
            preserveRouteEdgeIds
          )
        : [];
    const affectedRoutes =
      nextAffectedEdges.length > 0 ? routeEdgesForStoredRendering(nextNodes, nextAffectedEdges, canvasBounds) : [];
    return modelGeometryInsideCanvasBounds(movedNodes, affectedRoutes, canvasBounds, MOVE_BOUNDARY_GUARD);
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
    fallbackDelta?: Point
  ) => {
    const nodeBoundedDelta = boundedDeltaForNodes(nodeIds, originalPositions, dx, dy);
    return nearestBoundarySafeDelta(
      nodeBoundedDelta,
      (delta) => nodeMoveGeometryInsideCanvas(nodeIds, edgeIds, affectedEdgesForMove, originalPositions, originalEdgePoints, originalRoutePoints, delta),
      fallbackDelta
    );
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
    return boundedDeltaForMoveGeometry(
      dragState.nodeIds,
      dragState.edgeIds,
      dragState.affectedEdges,
      dragState.originalPositions,
      dragState.originalEdgePoints,
      dragState.originalRoutePoints,
      movementDelta.x,
      movementDelta.y,
      dragState.currentDelta ?? { x: 0, y: 0 }
    );
  };

  const applyNodeDragMove = (point: Point, ctrlKey: boolean, shiftKey: boolean, renderPreview = true) => {
    const currentDrag = draggingRef.current;
    if (!currentDrag) {
      return;
    }
    if (!currentDrag.historyCaptured && !dragUndoCapturedRef.current) {
      pushUndoSnapshot(true, false);
      dragUndoCapturedRef.current = true;
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
    const nextDragState = {
      ...currentDrag,
      currentDelta: boundedDelta,
      historyCaptured: true
    };
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

  const finishNodeDrag = () => {
    flushPendingNodeDragMove(false);
    const activeDragging = draggingRef.current ?? dragging;
    if (!activeDragging) {
      return;
    }
    const delta = activeDragging.currentDelta;
    if (!delta || (delta.x === 0 && delta.y === 0)) {
      clearNodeDragMoveSchedule();
      draggingRef.current = null;
      setDragging(null);
      return;
    }
    if (!activeDragging.historyCaptured && !dragUndoCapturedRef.current) {
      pushUndoSnapshot(true, false);
      dragUndoCapturedRef.current = true;
    }
    const dragNodeIds = new Set(activeDragging.nodeIds);
    const snappedDelta = applyNodeTerminalSnap(delta, nodeTerminalSnapTarget);
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
            delta
          )
        : delta;
    if (finalDelta.x === 0 && finalDelta.y === 0) {
      clearNodeDragMoveSchedule();
      draggingRef.current = null;
      setDragging(null);
      return;
    }
    const nextNodes = nodes.map((node) => {
      const originalPosition = activeDragging.originalPositions[node.id];
      return dragNodeIds.has(node.id) && originalPosition
        ? { ...node, position: clampNodeToCanvas(node, { x: originalPosition.x + finalDelta.x, y: originalPosition.y + finalDelta.y }) }
        : node;
    });
    const hasAffectedEdges = activeDragging.affectedEdges.some((edge) => dragNodeIds.has(edge.sourceId) || dragNodeIds.has(edge.targetId));
    const adjustedAffectedEdges = hasAffectedEdges
      ? adjustEdgesAfterNodeMove(
          activeDragging.affectedEdges,
          nextNodes,
          dragNodeIds,
          activeDragging.originalEdgePoints,
          Object.fromEntries(activeDragging.nodeIds.map((id) => [id, finalDelta])),
          activeDragging.originalRoutePoints,
          new Set(activeDragging.edgeIds)
        )
      : activeDragging.affectedEdges;
    const adjustedEdgeById = new Map(adjustedAffectedEdges.map((edge) => [edge.id, edge]));
    const adjustedEdges = hasAffectedEdges
      ? edges.map((edge) => adjustedEdgeById.get(edge.id) ?? edge)
      : edges;
    const nextEdges = finalizeMovedNodeEdgesFast(
      nodes,
      nextNodes,
      adjustedEdges,
      activeDragging.nodeIds
    );
    commitFastMovedGraph(
      nextNodes,
      nextEdges,
      activeDragging.nodeIds,
      activeDragging.originalRoutePoints,
      new Set(activeDragging.edgeIds)
    );
    clearNodeDragMoveSchedule();
    draggingRef.current = null;
    setDragging(null);
    dragUndoCapturedRef.current = false;
    const snapText =
      nodeTerminalSnapTarget &&
      finalDelta.x === snappedDelta.x &&
      finalDelta.y === snappedDelta.y
        ? "，端子已吸附"
        : "";
    writeOperationLog(`拖拽 ${activeDragging.nodeIds.length} 个图元 (${Math.round(finalDelta.x)}, ${Math.round(finalDelta.y)})${snapText}`);
  };

  const moveSelection = (dx: number, dy: number) => {
    if (selectedNodeIds.length === 0) {
      return;
    }
    const selected = new Set(selectedNodeIds);
    const originalPositions = Object.fromEntries(nodes.filter((node) => selected.has(node.id)).map((node) => [node.id, node.position]));
    const affectedEdgesForMove = edges.filter(
      (edge) => selected.has(edge.sourceId) || selected.has(edge.targetId) || activeSelectedEdgeIds.includes(edge.id)
    );
    const originalEdgePoints = snapshotEdgePoints(affectedEdgesForMove);
    const originalRoutePoints = Object.fromEntries(
      affectedEdgesForMove.map((edge) => [
        edge.id,
        (routedEdgeById.get(edge.id)?.points ?? []).map((point) => ({ ...point }))
      ])
    );
    const boundedDelta = boundedDeltaForMoveGeometry(
      selectedNodeIds,
      activeSelectedEdgeIds,
      affectedEdgesForMove,
      originalPositions,
      originalEdgePoints,
      originalRoutePoints,
      dx,
      dy
    );
    if (boundedDelta.x === 0 && boundedDelta.y === 0) {
      writeOperationLog("移动已到显示边界，联络线或图元接近边界，已停止移动");
      return;
    }
    pushUndoSnapshot();
    const deltasByNode = Object.fromEntries(selectedNodeIds.map((id) => [id, boundedDelta]));
    const nextNodes = nodes.map((node) =>
      selected.has(node.id)
        ? { ...node, position: clampNodeToCanvas(node, { x: node.position.x + boundedDelta.x, y: node.position.y + boundedDelta.y }) }
        : node
    );
    const adjustedAffectedEdges = adjustEdgesAfterNodeMove(
      affectedEdgesForMove,
      nextNodes,
      selected,
      originalEdgePoints,
      deltasByNode,
      originalRoutePoints,
      new Set(activeSelectedEdgeIds)
    );
    const adjustedEdgeById = new Map(adjustedAffectedEdges.map((edge) => [edge.id, edge]));
    const adjustedEdges = edges.map((edge) => adjustedEdgeById.get(edge.id) ?? edge);
    const nextEdges = finalizeMovedNodeEdgesFast(
      nodes,
      nextNodes,
      adjustedEdges,
      selectedNodeIds
    );
    commitFastMovedGraph(
      nextNodes,
      nextEdges,
      selectedNodeIds,
      originalRoutePoints,
      new Set(activeSelectedEdgeIds)
    );
    writeOperationLog(`移动 ${selectedNodeIds.length} 个图元 (${Math.round(boundedDelta.x)}, ${Math.round(boundedDelta.y)})`);
  };

  const updateSelectedNode = (patch: Partial<ModelNode>) => {
    if (!selectedNodeId) {
      return;
    }
    pushUndoSnapshot();
    const nextPatch = { ...patch };
    if (selectedNode) {
      nextPatch.position = clampNodeToCanvas({ ...selectedNode, ...nextPatch }, nextPatch.position ?? selectedNode.position);
    }
    const nextNodes = nodes.map((node) => (node.id === selectedNodeId ? { ...node, ...nextPatch } : node));
    if (patch.position && selectedNode) {
      const delta = {
        x: nextPatch.position!.x - selectedNode.position.x,
        y: nextPatch.position!.y - selectedNode.position.y
      };
      const affectedEdgesForMove = edges.filter((edge) => edge.sourceId === selectedNodeId || edge.targetId === selectedNodeId);
      const originalEdgePoints = snapshotEdgePoints(affectedEdgesForMove);
      const originalRoutePoints = Object.fromEntries(
        affectedEdgesForMove.map((edge) => [
          edge.id,
          (routedEdgeById.get(edge.id)?.points ?? []).map((point) => ({ ...point }))
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
        originalRoutePoints
      );
      const adjustedEdgeById = new Map(adjustedAffectedEdges.map((edge) => [edge.id, edge]));
      const adjustedEdges = affectedEdgesForMove.length > 0
        ? edges.map((edge) => adjustedEdgeById.get(edge.id) ?? edge)
        : edges;
      const nextEdges = finalizeMovedNodeEdgesFast(
        nodes,
        nextNodes,
        adjustedEdges,
        [selectedNodeId]
      );
      commitFastMovedGraph(nextNodes, nextEdges, [selectedNodeId], originalRoutePoints);
      return;
    }
    setNodes(nextNodes);
  };

  const moveSelectedLayer = (direction: "front" | "back" | "forward" | "backward") => {
    if (selectedNodeIds.length === 0) {
      return;
    }
    pushUndoSnapshot();
    const selected = new Set(selectedNodeIds);
    setNodes((current) => {
      const selectedNodes = current.filter((node) => selected.has(node.id));
      const others = current.filter((node) => !selected.has(node.id));
      if (direction === "front") {
        return [...others, ...selectedNodes];
      }
      if (direction === "back") {
        return [...selectedNodes, ...others];
      }
      const next = [...current];
      const step = direction === "forward" ? 1 : -1;
      const indexes = current.map((node, index) => (selected.has(node.id) ? index : -1)).filter((index) => index >= 0);
      const ordered = direction === "forward" ? indexes.reverse() : indexes;
      for (const index of ordered) {
        const target = index + step;
        if (target < 0 || target >= next.length || selected.has(next[target].id)) {
          continue;
        }
        [next[index], next[target]] = [next[target], next[index]];
      }
      return next;
    });
    const labels = { front: "置顶", back: "置底", forward: "上移", backward: "下移" };
    writeOperationLog(`图层${labels[direction]} ${selectedNodeIds.length} 个图元`);
  };

  const mirrorSelectedNodes = (axis: "horizontal" | "vertical") => {
    if (selectedNodeIds.length === 0) {
      return;
    }
    pushUndoSnapshot();
    setSelectedEdgeId("");
    setNodes((current) => mirrorNodes(current, selectedNodeIds, axis));
    writeOperationLog(`${axis === "horizontal" ? "水平" : "垂直"}镜像 ${selectedNodeIds.length} 个图元`);
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
    setNodes((current) => current.map((node) => ({ ...node, position: clampNodePositionToBounds(node, { width, height }) })));
    setEdges((current) => current.map((edge) => clampEdgeGeometryToBounds(edge, { width, height })));
  };

  const commitCanvasSizeDraft = (draft = canvasSizeDraft) => {
    const nextWidth = draft.width.trim() === "" ? canvasWidth : Number(draft.width);
    const nextHeight = draft.height.trim() === "" ? canvasHeight : Number(draft.height);
    const requestedWidth = clampCanvasDimension(nextWidth, MIN_CANVAS_WIDTH, MAX_CANVAS_WIDTH, canvasWidth);
    const requestedHeight = clampCanvasDimension(nextHeight, MIN_CANVAS_HEIGHT, MAX_CANVAS_HEIGHT, canvasHeight);
    const requestedRoutes = routeEdgesForRendering(nodes, edges, { width: requestedWidth, height: requestedHeight });
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
    setNodes((current) =>
      current.map((node) =>
        node.id === selectedNodeId ? { ...node, params: { ...node.params, [key]: value } } : node
      )
    );
  };

  const updateElementTreeNodeIdentity = (nodeId: string, field: "idx" | "name", value: string) => {
    pushUndoSnapshot();
    setNodes((current) =>
      current.map((node) => {
        if (node.id !== nodeId) {
          return node;
        }
        if (field === "name") {
          return { ...node, name: value };
        }
        return { ...node, params: { ...node.params, idx: value } };
      })
    );
  };

  const updateElementTreeContainerChildParam = (nodeId: string, key: string, value: string) => {
    if (!key) {
      return;
    }
    pushUndoSnapshot();
    setNodes((current) =>
      current.map((node) =>
        node.id === nodeId
          ? { ...node, params: { ...node.params, [key]: value } }
          : node
      )
    );
  };

  const terminalVbaseFallback = (node: ModelNode, terminalIndex: number) => {
    if (node.kind === "ac-three-winding-transformer") {
      return [node.params.highVbase, node.params.mediumVbase, node.params.lowVbase][terminalIndex] ?? node.params.vbase ?? "";
    }
    const sourceSide = node.params.i_vbase ?? node.params.sourceVbase ?? node.params.highVbase;
    const targetSide = node.params.j_vbase ?? node.params.targetVbase ?? node.params.lowVbase;
    return (terminalIndex === 0 ? sourceSide : targetSide) ?? node.params.vbase ?? node.params.voltageLevel ?? node.params.ratedVoltage ?? "";
  };

  const updateTerminalVbase = (terminalId: string, value: string) => {
    if (!selectedNodeId) {
      return;
    }
    const numericValue = normalizeVoltageBaseInput(value);
    pushUndoSnapshot();
    setNodes((current) =>
      current.map((node) =>
        node.id === selectedNodeId
          ? {
              ...node,
              terminals: node.terminals.map((terminal) =>
                terminal.id === terminalId ? { ...terminal, vbase: numericValue } : terminal
              )
            }
          : node
      )
    );
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
    const options = paramOptionsForSection(key, selectedNode ? inferESection(selectedNode.kind, selectedNode.params) : undefined);
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
    const halfWidth = (node.size.width * Math.abs(getNodeScaleX(node))) / 2;
    const halfHeight = (node.size.height * Math.abs(getNodeScaleY(node))) / 2;
    return (
      point.x >= node.position.x - halfWidth - tolerance &&
      point.x <= node.position.x + halfWidth + tolerance &&
      point.y >= node.position.y - halfHeight - tolerance &&
      point.y <= node.position.y + halfHeight + tolerance
    );
  };

  const connectTargetSnapPoint = (target: ConnectTarget): Point =>
    target.point ?? getTerminalPoint(target.node, target.terminalId);

  const findRewireTargetAtPoint = (point: Point, state: Exclude<RewiringState, null>) => {
    const edge = edgeById.get(state.edgeId);
    if (!edge) {
      return null;
    }
    const otherNode = nodeById.get(state.endpoint === "source" ? edge.targetId : edge.sourceId);
    const otherTerminalId = state.endpoint === "source" ? edge.targetTerminalId : edge.sourceTerminalId;
    if (!otherNode || !otherTerminalId) {
      return null;
    }
    for (const node of nodes) {
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
    const sourceNode = nodeById.get(connectSource.nodeId);
    if (!sourceNode) {
      return null;
    }
    for (const node of nodes) {
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
    const prepared = prepareConnectionEdgeForCommit(nodes, [...edges, newEdge], newEdge.id, canvasBounds);
    if (!prepared.ok || !prepared.edge) {
      const message = connectionCommitFailureMessage(prepared.issues);
      window.alert(`联络线绘制失败：${message}`);
      writeOperationLog(`联络线绘制失败：${message}`);
      return false;
    }
    const preparedEdge = prepared.edge;
    pushUndoSnapshot();
    markRouteEdgesDirty([preparedEdge.id]);
    setEdges((current) => [...current, preparedEdge]);
    setSelectedNodeIds([]);
    setSelectedEdgeId(preparedEdge.id);
    setSelectedEdgeIds([preparedEdge.id]);
    setConnectSource(null);
    resetConnectPreviewState();
    setMode("select");
    writeOperationLog(`新增联络线：${sourceName} -> ${targetName}`);
    return true;
  };

  const finishConnectToTarget = (target: NonNullable<ReturnType<typeof findConnectTargetAtPoint>>, endpointPoint = connectPreviewPoint) => {
    if (!connectSource) {
      return false;
    }
    const sourceNode = nodeById.get(connectSource.nodeId);
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
            nodes,
            edges.map((item) => item.id === rewiring.edgeId ? candidateEdge : item),
            rewiring.edgeId,
            canvasBounds
          )
        : null;
      if (prepared?.ok && prepared.edge) {
        const preparedEdge = prepared.edge;
        pushUndoSnapshot();
        markRouteEdgesDirty([rewiring.edgeId]);
        setEdges((current) => current.map((item) => item.id === rewiring.edgeId ? preparedEdge : item));
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
    setSelectedNodeIds([]);
    setSelectedEdgeId(rewiring.edgeId);
    setSelectedEdgeIds([rewiring.edgeId]);
    setRewiring(null);
  };

  const handleDrop = (event: DragEvent<SVGSVGElement>) => {
    event.preventDefault();
    const kind = event.dataTransfer.getData("application/device-kind") as DeviceKind;
    if (!kind || !svgRef.current) {
      return;
    }
    const position = screenToSvgPoint(svgRef.current, event.clientX, event.clientY);
    const template = libraryTemplates.find((item) => item.kind === kind);
    if (!template) {
      return;
    }
    const node = createNodeFromTemplate(template, position);
    node.position = clampNodeToCanvas(node, position);
    const indexed = assignPermanentDeviceIndex(node, deviceIndexCounters);
    pushUndoSnapshot();
    setDeviceIndexCounters(indexed.counters);
    setNodes((current) => [...current, indexed.node]);
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
    const keepEdgeSelection = nodeWasSelected && activeSelectedEdgeIds.length > 0;
    if (!keepEdgeSelection) {
      setSelectedEdgeId("");
      setSelectedEdgeIds([]);
    }
    let dragNodeIds = nodeWasSelected ? selectedNodeIds : [node.id];
    if (event.ctrlKey || event.shiftKey || event.metaKey) {
      dragNodeIds = nodeWasSelected ? selectedNodeIds : [...selectedNodeIds, node.id];
      if (!nodeWasSelected) {
        setSelectedNodeIds(dragNodeIds);
      }
    } else if (!nodeWasSelected) {
      dragNodeIds = [node.id];
      setSelectedNodeIds([node.id]);
    }
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
    const selectedForDrag = new Set(dragNodeIds);
    const edgeIdsForDrag = keepEdgeSelection ? activeSelectedEdgeIds : [];
    const affectedEdgeIdsForDrag = new Set(edgeIdsForDrag);
    for (const edge of edges) {
      if (selectedForDrag.has(edge.sourceId) || selectedForDrag.has(edge.targetId)) {
        affectedEdgeIdsForDrag.add(edge.id);
      }
    }
    const affectedEdgesForDrag = edges.filter((edge) => affectedEdgeIdsForDrag.has(edge.id));
    const routeByEdgeId = new Map(routedEdges.map((route) => [route.edgeId, route.points]));
    clearNodeDragMoveSchedule();
    dragUndoCapturedRef.current = false;
    const nextDragging: DraggingState = {
      nodeIds: dragNodeIds,
      edgeIds: edgeIdsForDrag,
      affectedEdges: affectedEdgesForDrag,
      startPoint: point,
      originalPositions: Object.fromEntries(
        nodes
          .filter((item) => selectedForDrag.has(item.id))
          .map((item) => [item.id, { ...item.position }])
      ),
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
      originalRoutePoints: Object.fromEntries(
        affectedEdgesForDrag.map((edge) => [
          edge.id,
          routeByEdgeId.get(edge.id) ?? []
        ])
      )
    };
    draggingRef.current = nextDragging;
    setDragging(nextDragging);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: PointerEvent<SVGSVGElement>) => {
    if (svgRef.current) {
      const pointer = clampPointToCanvas(screenToSvgPoint(svgRef.current, event.clientX, event.clientY));
      lastCanvasPointerRef.current = pointer;
      updateMouseStatus(pointer);
      if (connectSource) {
        const previewPoint = resolveConnectPreviewPoint(pointer, event);
        const target = findConnectTargetAtPoint(previewPoint);
        scheduleConnectPreviewState(previewPoint, Boolean(target), target ? connectTargetSnapPoint(target) : null);
      }
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
      const anchor = clampSingleTerminalAnchor(node, point);
      setNodes((current) =>
        current.map((item) =>
          item.id === terminalPress.nodeId
            ? {
                ...item,
                terminals: item.terminals.map((terminal) =>
                  terminal.id === terminalPress.terminalId ? { ...terminal, anchor } : terminal
                )
              }
            : item
        )
      );
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
      const target = findRewireTargetAtPoint(previewPoint, rewiring);
      const snappedPreviewPoint = target ? connectTargetSnapPoint(target) : previewPoint;
      const dropTargetPoint = target ? connectTargetSnapPoint(target) : undefined;
      setRewiring((current) =>
        current && current.edgeId === rewiring.edgeId && current.endpoint === rewiring.endpoint
          ? sameOptionalPoint(current.previewPoint, snappedPreviewPoint) &&
            sameOptionalPoint(current.dropTargetPoint, dropTargetPoint) &&
            sameConnectTarget(current.dropTarget, target)
            ? current
            : { ...current, previewPoint: snappedPreviewPoint, dropTargetPoint, dropTarget: target ?? undefined }
          : current
      );
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
      if (!transformDrag.historyCaptured) {
        pushUndoSnapshot();
        setTransformDrag({ ...transformDrag, historyCaptured: true });
      }
      setNodes((current) =>
        current.map((node) => {
          if (node.id !== transformDrag.nodeId) {
            return node;
          }
          if (transformDrag.kind === "rotate") {
            const angle = (Math.atan2(point.y - node.position.y, point.x - node.position.x) * 180) / Math.PI + 90;
            const snapped = ((Math.round(angle / 90) * 90) % 360 + 360) % 360;
            return { ...node, rotation: snapped };
          }
          const local = toLocalNodePoint(node, point);
          const nextScaleX = normalizeScale((Math.abs(local.x) * 2) / node.size.width);
          const nextScaleY = normalizeScale((Math.abs(local.y) * 2) / node.size.height);
          const nextSignedScaleX = signedScale(nextScaleX, getNodeScaleX(node));
          const nextSignedScaleY = signedScale(nextScaleY, getNodeScaleY(node));
          if (transformDrag.kind === "scale-x") {
            return { ...node, scale: nextScaleX, scaleX: nextSignedScaleX, position: clampNodeToCanvas({ ...node, scale: nextScaleX, scaleX: nextSignedScaleX }) };
          }
          if (transformDrag.kind === "scale-y") {
            return { ...node, scale: nextScaleY, scaleY: nextSignedScaleY, position: clampNodeToCanvas({ ...node, scale: nextScaleY, scaleY: nextSignedScaleY }) };
          }
          const nextScale = normalizeScale(Math.max(nextScaleX, nextScaleY));
          const nextSignedScale = {
            x: signedScale(nextScale, getNodeScaleX(node)),
            y: signedScale(nextScale, getNodeScaleY(node))
          };
          return {
            ...node,
            scale: nextScale,
            scaleX: nextSignedScale.x,
            scaleY: nextSignedScale.y,
            position: clampNodeToCanvas({ ...node, scale: nextScale, scaleX: nextSignedScale.x, scaleY: nextSignedScale.y })
          };
        })
      );
      return;
    }
    if (!dragging || !svgRef.current) {
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
    minimumSelectionCount: number,
    layoutNodes: (currentNodes: ModelNode[], currentSelectedNodeIds: string[]) => ModelNode[]
  ) => {
    if (selectedNodeIds.length < minimumSelectionCount) {
      return;
    }
    pushUndoSnapshot();
    const arranged = layoutNodes(nodes, selectedNodeIds);
    const previousById = new Map(nodes.map((node) => [node.id, node]));
    const selected = new Set(selectedNodeIds);
    const deltas = Object.fromEntries(
      arranged
        .filter((node) => selected.has(node.id))
        .map((node) => {
          const previous = previousById.get(node.id);
          return [
            node.id,
            {
              x: node.position.x - (previous?.position.x ?? node.position.x),
              y: node.position.y - (previous?.position.y ?? node.position.y)
            }
          ];
        })
    );
    const affectedEdgesForLayout = edges.filter((edge) => selected.has(edge.sourceId) || selected.has(edge.targetId));
    const originalEdgePoints = snapshotEdgePoints(affectedEdgesForLayout);
    const originalRoutePoints = Object.fromEntries(
      affectedEdgesForLayout.map((edge) => [
        edge.id,
        (routedEdgeById.get(edge.id)?.points ?? []).map((point) => ({ ...point }))
      ])
    );
    const adjustedAffectedEdges = adjustEdgesAfterNodeMove(
      affectedEdgesForLayout,
      arranged,
      selected,
      originalEdgePoints,
      deltas,
      originalRoutePoints
    );
    const adjustedEdgeById = new Map(adjustedAffectedEdges.map((edge) => [edge.id, edge]));
    const adjustedEdges = affectedEdgesForLayout.length > 0
      ? edges.map((edge) => adjustedEdgeById.get(edge.id) ?? edge)
      : edges;
    const nextEdges = finalizeMovedNodeEdgesFast(
      nodes,
      arranged,
      adjustedEdges,
      selectedNodeIds
    );
    commitFastMovedGraph(arranged, nextEdges, selectedNodeIds, originalRoutePoints);
  };

  const alignSelected = (direction: AlignMode) => {
    applySelectedNodeLayout(2, (currentNodes, currentSelectedNodeIds) => alignNodes(currentNodes, currentSelectedNodeIds, direction));
    if (selectedNodeIds.length >= 2) {
      const labelByDirection: Record<AlignMode, string> = {
        horizontal: "横向",
        vertical: "纵向",
        left: "左",
        right: "右",
        top: "上",
        bottom: "下"
      };
      writeOperationLog(`${labelByDirection[direction]}对齐 ${selectedNodeIds.length} 个图元`);
    }
  };

  const distributeSelected = (direction: "horizontal" | "vertical") => {
    applySelectedNodeLayout(3, (currentNodes, currentSelectedNodeIds) => distributeNodes(currentNodes, currentSelectedNodeIds, direction));
    if (selectedNodeIds.length >= 3) {
      writeOperationLog(`${direction === "horizontal" ? "横向" : "纵向"}平均 ${selectedNodeIds.length} 个图元`);
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

  const loadSavedProject = (project: SavedProjectRecord, schemeId = findSchemeForProject(project.id)?.id ?? "") => {
    const normalizedNodes = project.project.nodes.map(normalizeNodeTerminalsByTemplate);
    const indexed = assignMissingDeviceIndexes(normalizedNodes, project.project.deviceIndexCounters);
    const lockedProject = lockProjectEdgeTerminals({
      ...project.project,
      nodes: indexed.nodes
    });
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
    lastBusTerminalSyncSignatureRef.current = "";
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
    setDeviceIndexCounters(indexed.counters);
    setNodes(indexed.nodes);
    setEdges(lockedProject.edges);
    setTopology(EMPTY_TOPOLOGY);
    setTopologyErrors([]);
    setTopologyStatus(INITIAL_TOPOLOGY_STATUS);
    setRouteRenderingReady(false);
    setActiveProjectId(project.id);
    setActiveSchemeId(schemeId);
    selectSingleProject(schemeId, project.id);
    setSelectedNodeIds(indexed.nodes[0] ? [indexed.nodes[0].id] : []);
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
        setRecordClipboard({ kind: "project", project });
        writeOperationLog(`复制模型记录：${project.name}`);
      }
      return;
    }
    const schemeId = selectedSchemeIds[0] ?? selectedSchemeId;
    if (schemeId) {
      const scheme = schemes.find((item) => item.id === schemeId);
      if (scheme) {
        setRecordClipboard({ kind: "scheme", scheme });
        writeOperationLog(`复制方案记录：${scheme.name}`);
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

  const pasteSelectedRecord = () => {
    if (!recordClipboard) {
      return;
    }
    if (recordClipboard.kind === "scheme") {
      setSchemes((current) => [...current, copySavedSchemeWithUniqueName(recordClipboard.scheme, current.map((item) => item.name))]);
      writeOperationLog(`粘贴方案记录：${recordClipboard.scheme.name}`);
      return;
    }
    const targetSchemeId = selectedSchemeId || activeSchemeId || schemes[0]?.id;
    setSchemes((current) =>
      current.map((scheme, index) =>
        scheme.id === targetSchemeId || (!targetSchemeId && index === 0)
          ? {
              ...scheme,
              updatedAt: new Date().toISOString(),
              projects: upsertSavedProject(
                scheme.projects,
                copySavedProjectWithUniqueName(recordClipboard.project, scheme.projects.map((project) => project.name))
              )
            }
          : scheme
      )
    );
    writeOperationLog(`粘贴模型记录：${recordClipboard.project.name}`);
  };

  const moveProjectRecordToScheme = (projectId: string, schemeId: string) => {
    setSchemes((current) => moveProjectToScheme(current, projectId, schemeId));
    setExpandedSchemeIds((current) => (current.includes(schemeId) ? current : [...current, schemeId]));
    if (selectedProjectId === projectId) {
      setSelectedSchemeId(schemeId);
      setSelectedProjectIds((current) => (current.includes(projectId) ? current : [projectId]));
      setSelectedSchemeIds([]);
    }
    if (activeProjectId === projectId) {
      setActiveSchemeId(schemeId);
    }
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
          nodes,
          edges
        })
      );
    } catch {
      // 草稿缓存过大或不可写时不打断手动保存。
    }
  };

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
    setSelectedNodeIds(firstNodeId ? [firstNodeId] : []);
    setSelectedEdgeId(error.edgeId ?? "");
    setSelectedEdgeIds(error.edgeId ? [error.edgeId] : []);
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

  const focusElementTreeItem = (item: ElementTreeItem, openDeviceTab = false) => {
    if (item.kind === "node") {
      setSelectedNodeIds([item.id]);
      setSelectedEdgeId("");
      setSelectedEdgeIds([]);
    } else {
      setSelectedNodeIds([]);
      setSelectedEdgeId(item.id);
      setSelectedEdgeIds([item.id]);
    }
    setConnectSource(null);
    resetConnectPreviewState();
    setRewiring(null);
    setContextMenu(null);
    clearRecordSelection();
    if (openDeviceTab) {
      setInspectorTab("device");
    }
    const point = getElementFocusPoint(item, nodes, edges);
    if (point) {
      centerViewOnPoint(point);
    }
  };

  const setEdgeManualPoints = (edgeId: string, manualPoints: Point[]) => {
    const normalizedManualPoints = manualPoints.map((point) => ({ x: Math.round(point.x), y: Math.round(point.y) }));
    markRouteEdgesDirty([edgeId]);
    setEdges((current) => {
      let changed = false;
      const nextEdges = current.map((edge) => {
        if (edge.id !== edgeId) {
          return edge;
        }
        if (sameOptionalPointList(edge.manualPoints, normalizedManualPoints)) {
          return edge;
        }
        changed = true;
        return { ...edge, manualPoints: normalizedManualPoints };
      });
      return changed ? nextEdges : current;
    });
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

  const openEdgeContextMenu = (event: MouseEvent<SVGPathElement>, edgeId: string, routePoints?: Point[]) => {
    event.preventDefault();
    event.stopPropagation();
    activateInspectorFromCanvas();
    canvasInteractionRef.current = true;
    projectListPointerInsideRef.current = false;
    let pointer: Point | undefined;
    if (svgRef.current) {
      pointer = clampPointToCanvas(screenToSvgPoint(svgRef.current, event.clientX, event.clientY));
      lastCanvasPointerRef.current = pointer;
      updateMouseStatus(pointer);
    }
    setSelectedNodeIds([]);
    setSelectedEdgeId(edgeId);
    setSelectedEdgeIds([edgeId]);
    setContextMenu({
      x: event.clientX,
      y: event.clientY,
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
    if (event.button !== 0 || !svgRef.current) {
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
    setSelectedNodeIds([]);
    setSelectedEdgeId(edgeId);
    setSelectedEdgeIds([edgeId]);
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
    if (event.button !== 0 || !svgRef.current) {
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
    setSelectedNodeIds([]);
    setSelectedEdgeId(edgeId);
    setSelectedEdgeIds([edgeId]);
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
    return renderedRoutedEdges
      .flatMap((route, routeOrder) =>
        route.points.slice(0, -1).map((from, segmentIndex) => ({
          edgeId: route.edgeId,
          routePoints: route.points,
          distance: routeSegmentPointerDistance(point, from, route.points[segmentIndex + 1]),
          routeOrder,
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
    setSelectedNodeIds([]);
    setSelectedEdgeId(edgeId);
    setSelectedEdgeIds([edgeId]);
    const clickPoint = clampPointToCanvas(screenToSvgPoint(svgRef.current, event.clientX, event.clientY));
    insertManualBendFromPointer(edgeId, routePoints, clickPoint);
  };

  const handleEdgePathPointerDown = (event: PointerEvent<SVGPathElement>, edgeId: string, routePoints: Point[]) => {
    event.stopPropagation();
    if (event.button !== 0 || !svgRef.current) {
      return;
    }
    activateInspectorFromCanvas();
    setSelectedNodeIds([]);
    setSelectedEdgeId(edgeId);
    setSelectedEdgeIds([edgeId]);
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
    if (routePointIndex <= 0 || routePointIndex >= routePoints.length - 1) {
      return;
    }
    pushUndoSnapshot();
    const nextPoints = routePoints.filter((_, index) => index !== routePointIndex);
    setEdgeManualPoints(edgeId, routeManualPoints(nextPoints));
  };

  const startConnectFromTerminal = (node: ModelNode, terminalId: string, point?: Point) => {
    const sourcePoint = point ?? getModelEdgeEndpointPoint(node, undefined, terminalId);
    setConnectSource({ nodeId: node.id, terminalId, point });
    applyConnectPreviewState(sourcePoint, false);
    setMode("connect");
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
      const nextNodes = nodes.map((item) =>
        item.id === terminalPress.nodeId
          ? {
              ...item,
              terminals: item.terminals.map((terminal) =>
                terminal.id === terminalPress.terminalId ? { ...terminal, anchor } : terminal
              )
            }
          : item
      );
      const nextNodeById = new Map(nextNodes.map((item) => [item.id, item]));
      const dirtyEdgeIds = edges
        .filter((edge) =>
          (edge.sourceId === terminalPress.nodeId && edge.sourceTerminalId === terminalPress.terminalId) ||
          (edge.targetId === terminalPress.nodeId && edge.targetTerminalId === terminalPress.terminalId)
        )
        .map((edge) => edge.id);
      markRouteEdgesDirty(dirtyEdgeIds);
      setNodes(nextNodes);
      setEdges((current) =>
        current.map((edge) => {
          const sourceAffected = edge.sourceId === terminalPress.nodeId && edge.sourceTerminalId === terminalPress.terminalId;
          const targetAffected = edge.targetId === terminalPress.nodeId && edge.targetTerminalId === terminalPress.terminalId;
          if (!sourceAffected && !targetAffected) {
            return edge;
          }
          const sourceNode = nodeById.get(edge.sourceId);
          const targetNode = nodeById.get(edge.targetId);
          const nextSourceNode = nextNodeById.get(edge.sourceId);
          const nextTargetNode = nextNodeById.get(edge.targetId);
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
        })
      );
    }
    setTerminalPress(null);
  };

  const handleTerminalPointerDown = (
    event: PointerEvent<SVGCircleElement>,
    node: ModelNode,
    terminalId: string
  ) => {
    event.stopPropagation();
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
          nodes,
          edges.map((item) => item.id === edge.id ? candidateEdge : item),
          edge.id,
          canvasBounds
        );
        if (prepared.ok && prepared.edge) {
          const preparedEdge = prepared.edge;
          pushUndoSnapshot();
          markRouteEdgesDirty([edge.id]);
          setEdges((current) => current.map((item) => item.id === edge.id ? preparedEdge : item));
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
    const sourceNode = nodeById.get(connectSource.nodeId);
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
      targetPoint: isBusNode(node) ? busAnchorFromPoint(node, connectPreviewPoint ?? busPoint ?? getTerminalPoint(node, terminalId)) : busPoint
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

  const exportSchemeRecord = (scheme: SavedSchemeRecord) => {
    for (const project of scheme.projects) {
      const prefix = `${safeFilePart(scheme.name)}_${safeFilePart(project.name)}`;
      downloadText(
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
      downloadText(`${prefix}.e`, buildEDeviceParameterFile(project.project), "text/plain");
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
      setNodes((current) =>
        current.map((node) =>
          node.id === imageTarget.nodeId
            ? imageTarget.kind === "nodeForeground"
              ? { ...node, params: { ...node.params, foregroundImageAssetId: assetId, foregroundImage: imageData } }
              : { ...node, params: { ...node.params, backgroundImageAssetId: assetId, backgroundImage: imageData } }
            : node
        )
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
      setNodes((current) =>
        current.map((node) =>
          node.id === imageTarget.nodeId
            ? imageTarget.kind === "nodeForeground"
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
            : node
        )
      );
    }
    setImageTarget(null);
  };

  const clearSelectedImageForNode = (nodeId: string, target: "background" | "foreground") => {
    pushUndoSnapshot();
    setNodes((current) =>
      current.map((node) =>
        node.id === nodeId
          ? {
              ...node,
              params:
                target === "foreground"
                  ? { ...node.params, foregroundImage: "", foregroundImageAssetId: "" }
                  : { ...node.params, backgroundImage: "", backgroundImageAssetId: "" }
            }
          : node
      )
    );
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
  const customDevicePreviewImage =
    customDeviceDraft.backgroundImage ||
    generateCustomDeviceImage(customDeviceDraft.deviceType || "Unit", customDraftTerminalTypes.length > 0 ? customDraftTerminalTypes : ["ac"]);

  const loadDefinitionTemplateDraft = (template: DeviceTemplate) => {
    setSelectedDefinitionKind(template.kind);
    const group = normalizeLibraryGroupName(template.group);
    setExpandedDefinitionGroups((current) => (current.includes(group) ? current : [...current, group]));
    setDefinitionDraftRows(createDefinitionDraftRows(template));
    setDefinitionDraftSection(resolveTemplateExportSection(template));
    setDefinitionDraftError("");
  };

  const openDeviceDefinitionDialog = () => {
    const template = selectedDefinitionTemplate ?? libraryTemplates[0];
    if (template) {
      loadDefinitionTemplateDraft(template);
    }
    setDeviceDefinitionDialogOpen(true);
  };

  const toggleDefinitionGroup = (group: LibraryGroup) => {
    setExpandedDefinitionGroups((current) =>
      current.includes(group) ? current.filter((item) => item !== group) : [...current, group]
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
      source_section: definitionDraftSection || resolveTemplateExportSection(selectedDefinitionTemplate)
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
      const fallback = current.groupName.includes("直流")
        ? "dc"
        : current.groupName.includes("氢")
          ? "h2"
          : current.groupName.includes("热")
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

  const saveCustomDeviceTemplate = () => {
    const newGroupName = customDeviceDraft.newGroupName.trim();
    const normalizedNewGroupName = newGroupName ? normalizeLibraryGroupName(newGroupName) : "";
    const groupName = normalizedNewGroupName || normalizeLibraryGroupName(customDeviceDraft.groupName);
    const existingGroups = new Set(libraryGroups.map((group) => group.toLowerCase()));
    if (normalizedNewGroupName && existingGroups.has(normalizedNewGroupName.toLowerCase())) {
      setCustomDeviceDraft((current) => ({ ...current, error: "元件库名称已存在，无法新增同名元件库。" }));
      return;
    }
    const deviceType = customDeviceDraft.deviceType.trim();
    if (!deviceType) {
      setCustomDeviceDraft((current) => ({ ...current, error: "请输入设备类型名称。" }));
      return;
    }
    const existingDeviceTypes = new Set(libraryTemplates.map((template) => template.kind.toLowerCase()));
    if (existingDeviceTypes.has(deviceType.toLowerCase())) {
      setCustomDeviceDraft((current) => ({ ...current, error: "设备类型已存在，无法新增同名设备。" }));
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
      customDeviceDraft.backgroundImage || generateCustomDeviceImage(deviceType, terminalTypes.length > 0 ? terminalTypes : ["ac"]);
    const template: DeviceTemplate = {
      kind: deviceType,
      label: deviceType,
      group: groupName,
      size: { width: 104, height: 64 },
      params: {
        source_section: customDeviceDraft.exportSection || defaultExportSectionForGroup(groupName),
        fillColor: "transparent",
        strokeColor: "transparent",
        lineWidth: "0",
        backgroundImage
      },
      terminalType: terminalTypes[0] ?? "ac",
      terminalCount: terminalTypes.length,
      terminalTypes,
      terminalAssociations: customDeviceDraft.isContainer ? terminalAssociations : undefined,
      terminalLabels: terminalTypes.map((type, index) => `${TERMINAL_TYPE_OPTIONS.find((item) => item.value === type)?.label ?? type}端${index + 1}`),
      isContainer: customDeviceDraft.isContainer,
      custom: true,
      parameterDefinitions: definitions
    };
    setCustomDeviceTemplates((current) => [...current, template]);
    setExpandedLibraryGroups((current) => Array.from(new Set([...current, groupName])));
    setCustomDeviceDialogOpen(false);
  };

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

  const renderLibraryPanel = () => (
    <div className="library-panel-stack">
      <div className="library-scroll">
        {libraryGroups.map((group) => {
          const expanded = expandedLibraryGroups.includes(group);
          return (
            <section className="library-group-section" key={group}>
              <button
                className={`library-group-toggle ${expanded ? "active" : ""}`}
                onClick={() =>
                  setExpandedLibraryGroups((current) =>
                    current.includes(group) ? current.filter((item) => item !== group) : [...current, group]
                  )
                }
              >
                {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                {group}
              </button>
              {expanded && (
                <div className="library-group">
                  {(groupedLibrary[group] ?? []).map((item) => {
                    const preview = libraryPreviewByKind.get(item.kind) ?? createNodeFromTemplate(item, { x: 0, y: 0 });
                    return (
                      <button
                        key={item.kind}
                        className="library-item"
                        draggable
                        title={item.label}
                        onDragStart={(event) => event.dataTransfer.setData("application/device-kind", item.kind)}
                      >
                        <svg viewBox="-40 -28 80 56" aria-hidden="true">
                          <DeviceGlyph node={preview} miniature colorPalette={colorPalette} />
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
                  {group.items.map((item) => {
                    const selected = item.kind === "node" ? selectedNodeIdSet.has(item.id) : activeSelectedEdgeSet.has(item.id);
                    const selectTreeItem = () => {
                      if (item.kind === "node") {
                        setSelectedNodeIds([item.id]);
                        setSelectedEdgeId("");
                        setSelectedEdgeIds([]);
                        clearRecordSelection();
                      } else {
                        setSelectedNodeIds([]);
                        setSelectedEdgeId(item.id);
                        setSelectedEdgeIds([item.id]);
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
                                  onChange={(event) => updateElementTreeNodeIdentity(item.id, "name", event.target.value)}
                                />
                              </label>
                            </div>
                          ) : (
                            <span>{item.name}</span>
                          )}
                        </div>
                        {item.children?.length ? (
                          <div className="element-tree-child-list" role="group" aria-label={`${item.name}关联子设备`}>
                            {item.children.map((child) => (
                              <div className="element-tree-child-item" key={child.id}>
                                <span className="element-tree-child-type" title={child.deviceType}>
                                  {child.deviceType}
                                </span>
                                <label>
                                  <span>idx</span>
                                  <input
                                    value={child.idx}
                                    inputMode="numeric"
                                    onClick={(event) => event.stopPropagation()}
                                    onDoubleClick={(event) => event.stopPropagation()}
                                    onKeyDown={(event) => event.stopPropagation()}
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
  const appShellStyle = {
    "--left-panel-width": `${leftPanelWidth}px`,
    "--right-panel-width": `${rightPanelWidth}px`,
    "--statusbar-height": `${statusbarHeight}px`,
    "--validation-panel-height": `${validationPanelHeight}px`
  } as CSSProperties;

  return (
    <div
      className={`app-shell left-panel-${leftPanelMode} right-panel-${rightPanelMode} ${sidePanelResize ? "side-panel-resizing" : ""} ${statusbarResize ? "statusbar-resizing" : ""} ${validationPanelResize ? "validation-panel-resizing" : ""}`}
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
        </div>
        <div className="left-panel-content">
          {leftPanelTab === "projects" ? renderProjectPanel() : renderLibraryPanel()}
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
          <div className="action-cluster">
            <button onClick={() => alignSelected("horizontal")} disabled={selectedNodeCount < 2} title="横向对齐" aria-label="横向对齐">
              <AlignCenterHorizontal size={16} />
            </button>
            <button onClick={() => alignSelected("vertical")} disabled={selectedNodeCount < 2} title="纵向对齐" aria-label="纵向对齐">
              <AlignCenterVertical size={16} />
            </button>
            <button onClick={() => alignSelected("left")} disabled={selectedNodeCount < 2} title="左对齐" aria-label="左对齐">
              <AlignStartVertical size={16} />
            </button>
            <button onClick={() => alignSelected("right")} disabled={selectedNodeCount < 2} title="右对齐" aria-label="右对齐">
              <AlignEndVertical size={16} />
            </button>
            <button onClick={() => alignSelected("top")} disabled={selectedNodeCount < 2} title="上对齐" aria-label="上对齐">
              <AlignStartHorizontal size={16} />
            </button>
            <button onClick={() => alignSelected("bottom")} disabled={selectedNodeCount < 2} title="下对齐" aria-label="下对齐">
              <AlignEndHorizontal size={16} />
            </button>
            <button onClick={() => distributeSelected("horizontal")} disabled={selectedNodeCount < 3} title="横向平均" aria-label="横向平均">
              <AlignHorizontalDistributeCenter size={16} />
            </button>
            <button onClick={() => distributeSelected("vertical")} disabled={selectedNodeCount < 3} title="纵向平均" aria-label="纵向平均">
              <AlignVerticalDistributeCenter size={16} />
            </button>
            <button onClick={() => mirrorSelectedNodes("horizontal")} disabled={selectedNodeCount < 1} title="水平翻转端点" aria-label="水平翻转端点">
              <FlipHorizontal size={16} />
            </button>
            <button onClick={() => mirrorSelectedNodes("vertical")} disabled={selectedNodeCount < 1} title="垂直翻转端点" aria-label="垂直翻转端点">
              <FlipVertical size={16} />
            </button>
            <button onClick={() => moveSelectedLayer("forward")} disabled={selectedNodeCount < 1} title="图层向上" aria-label="图层向上">
              <Layers2 size={16} />
            </button>
            <button onClick={() => moveSelectedLayer("backward")} disabled={selectedNodeCount < 1} title="图层向下" aria-label="图层向下">
              <Layers size={16} />
            </button>
            <button onClick={() => moveSelectedLayer("front")} disabled={selectedNodeCount < 1} title="图层置顶" aria-label="图层置顶">
              <BringToFront size={16} />
            </button>
            <button onClick={() => moveSelectedLayer("back")} disabled={selectedNodeCount < 1} title="图层置底" aria-label="图层置底">
              <SendToBack size={16} />
            </button>
            <input ref={imageInputRef} type="file" accept="image/*" hidden onChange={chooseImage} />
            <input ref={customDeviceImageInputRef} type="file" accept="image/*" hidden onChange={chooseCustomDeviceBackground} />
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
            className={`diagram-canvas ${connectSource ? "connect-mode" : ""} ${activeDropReady ? "connect-drop-ready" : ""} ${panning ? "panning" : ""}`}
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
              finishMarqueeSelection();
              finishNodeDrag();
              finishManualPathDrag();
              setTransformDrag(null);
              setPanning(null);
            }}
            onPointerLeave={() => {
              canvasInteractionRef.current = false;
              if (manualPathDrag) {
                return;
              }
              finishNodeDrag();
              setTerminalPress(null);
              finishManualPathDrag();
              setTransformDrag(null);
              setPanning(null);
              setMarquee(null);
              setRewiring(null);
            }}
            onPointerCancel={() => {
              finishNodeDrag();
              setTerminalPress(null);
              finishManualPathDrag();
              setTransformDrag(null);
              setPanning(null);
              setMarquee(null);
              setRewiring(null);
            }}
            onLostPointerCapture={() => {
              finishNodeDrag();
              setTerminalPress(null);
              finishManualPathDrag();
              setTransformDrag(null);
            }}
            onPointerDown={(event) => {
              if (event.button !== 0) {
                return;
              }
              activateInspectorFromCanvas();
              canvasInteractionRef.current = true;
              projectListPointerInsideRef.current = false;
              const pointer = clampPointToCanvas(screenToSvgPoint(event.currentTarget, event.clientX, event.clientY));
              lastCanvasPointerRef.current = pointer;
              updateMouseStatus(pointer);
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
                setSelectedNodeIds([]);
                setSelectedEdgeId(routeHit.edgeId);
                setSelectedEdgeIds([routeHit.edgeId]);
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
              const pointer = clampPointToCanvas(screenToSvgPoint(event.currentTarget, event.clientX, event.clientY));
              lastCanvasPointerRef.current = pointer;
              updateMouseStatus(pointer);
              if (connectSource) {
                setConnectSource(null);
                resetConnectPreviewState();
                setMode("select");
                return;
              }
              const routeHit = findConnectionRouteHitAtPoint(pointer);
              if (routeHit) {
                setSelectedNodeIds([]);
                setSelectedEdgeId(routeHit.edgeId);
                setSelectedEdgeIds([routeHit.edgeId]);
                setConnectSource(null);
                resetConnectPreviewState();
                setRewiring(null);
                clearRecordSelection();
                setContextMenu({
                  x: event.clientX,
                  y: event.clientY,
                  canvasPoint: pointer,
                  edgeId: routeHit.edgeId,
                  routePoints: routeHit.routePoints.map((point) => ({ ...point }))
                });
                return;
              }
              setContextMenu({ x: event.clientX, y: event.clientY, canvasPoint: pointer });
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
            {marquee && (
              <rect
                className="marquee-box"
                x={Math.min(marquee.start.x, marquee.current.x)}
                y={Math.min(marquee.start.y, marquee.current.y)}
                width={Math.abs(marquee.current.x - marquee.start.x)}
                height={Math.abs(marquee.current.y - marquee.start.y)}
              />
            )}
            {dragGhostEdgeRoutes.map((route) => (
              <path key={`drag-ghost-edge-${route.edgeId}`} d={route.path} className="connection-line drag-ghost" style={connectionLineStyle(route.edgeId)} />
            ))}
            {dragging?.historyCaptured && dragging.nodeIds.map((nodeId) => {
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
            {renderedRoutedEdges.map((route) => {
              const edge = edgeById.get(route.edgeId);
              if (!edge) return null;
              if (
                (draggingDelta && dragPreviewEdgeIdSet.has(edge.id)) ||
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
                    onContextMenu={(event) => openEdgeContextMenu(event, edge.id, route.points)}
                    onDoubleClick={(event) => insertManualBendFromEdgePath(event, edge.id, route.points)}
                    onPointerDown={(event) => handleEdgePathPointerDown(event, edge.id, route.points)}
                  />
                  <path
                    d={route.path}
                    className="connection-line"
                    onContextMenu={(event) => openEdgeContextMenu(event, edge.id, route.points)}
                    onDoubleClick={(event) => insertManualBendFromEdgePath(event, edge.id, route.points)}
                    onPointerDown={(event) => handleEdgePathPointerDown(event, edge.id, route.points)}
                  />
                  {sourceBusDotPoint && (
                    <circle
                      className="bus-connection-dot"
                      cx={sourceBusDotPoint.x}
                      cy={sourceBusDotPoint.y}
                      r={7}
                      fill={busEndpointColor((rewiringSource ? rewireTarget?.node : sourceNode) ?? sourceNode!, colorPalette)}
                      onPointerDown={(event) => {
                        event.stopPropagation();
                        if (event.button !== 0 || !svgRef.current) {
                          return;
                        }
                        setSelectedNodeIds([]);
                        setSelectedEdgeId(edge.id);
                        setSelectedEdgeIds([edge.id]);
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
                  {targetBusDotPoint && (
                    <circle
                      className="bus-connection-dot"
                      cx={targetBusDotPoint.x}
                      cy={targetBusDotPoint.y}
                      r={7}
                      fill={busEndpointColor((rewiringTarget ? rewireTarget?.node : targetNode) ?? targetNode!, colorPalette)}
                      onPointerDown={(event) => {
                        event.stopPropagation();
                        if (event.button !== 0 || !svgRef.current) {
                          return;
                        }
                        setSelectedNodeIds([]);
                        setSelectedEdgeId(edge.id);
                        setSelectedEdgeIds([edge.id]);
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
            {nodes.map((node) => {
              const selected = selectedNodeIdSet.has(node.id);
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
              const terminalControlTransform = (x: number, y: number) => `translate(${x} ${y}) scale(${inverseScaleX} ${inverseScaleY})`;
              const handleTransform = (x: number, y: number) => `translate(${x} ${y})`;
              const includeUprightContentInHandles = Boolean(imageHref || foregroundImageHref || node.kind === "static-text" || node.kind === "static-image");
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
                  className={`diagram-node ${nodeIsBus ? "bus-node" : ""} ${isStorageBus ? "storage-node" : ""} ${selected ? "selected" : ""} ${isConnectSource ? "connect-source" : ""}`}
                  transform={`translate(${renderPosition.x} ${renderPosition.y})`}
                  onPointerDown={(event) => handleNodePointerDown(event, node)}
                  onContextMenu={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
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
                      setSelectedNodeIds([node.id]);
                    }
                    setSelectedEdgeId("");
                    setSelectedEdgeIds([]);
                    setContextMenu({ x: event.clientX, y: event.clientY });
                  }}
                  onDoubleClick={(event) => {
                    event.stopPropagation();
                    if (isBusNode(node)) {
                      return;
                    }
                    setSelectedNodeIds([node.id]);
                    setSelectedEdgeId("");
                    setSelectedEdgeIds([]);
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
                  <g className="node-terminal-layer" transform={nodeGeometryTransform(node)}>
                    {node.terminals.map((terminal) => {
                      const sourceNode = connectSource ? nodeById.get(connectSource.nodeId) : undefined;
                      const hideFixedTerminal = nodeIsBus || isStaticNode(node);
                      const disabled =
                        !hideFixedTerminal &&
                        mode === "connect" &&
                        Boolean(sourceNode) &&
                        !canConnectTerminals(sourceNode!, connectSource!.terminalId, node, terminal.id);
                      const overlapped = overlappedTerminalKeys.has(`${node.id}:${terminal.id}`);
                      const stub = terminalStubSegment(terminal, nodeScaleX, nodeScaleY);
                      const terminalDisplayColor = getTerminalDisplayColor(node, terminal, colorDisplayMode, colorPalette);
                      return hideFixedTerminal ? null : (
                        <g
                          key={terminal.id}
                          transform={terminalControlTransform(terminal.anchor.x * node.size.width, terminal.anchor.y * node.size.height)}
                        >
                          <line
                            className={`terminal-stub ${terminal.type} ${disabled ? "disabled" : ""}`}
                            style={{
                              stroke: disabled ? "#cbd5e1" : terminalDisplayColor,
                              strokeWidth: getDeviceStrokeWidth(node)
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
                  {selected && selectedNodeCount === 1 && (
                    <g className="transform-handles">
                      <line x1="0" y1={-visibleHalfHeight - rotateStemStart} x2="0" y2={-visibleHalfHeight - rotateStemEnd} />
                      <g transform={handleTransform(0, -visibleHalfHeight - rotateHandleGap)}>
                        <circle
                          className="rotate-handle"
                          cx="0"
                          cy="0"
                          r="8"
                          onPointerDown={(event) => {
                            event.stopPropagation();
                            setTransformDrag({ kind: "rotate", nodeId: node.id });
                          }}
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
                              onPointerDown={(event) => {
                                event.stopPropagation();
                                setTransformDrag({ kind: handle.kind, nodeId: node.id });
                              }}
                            />
                          </g>
                        );
                      })}
                    </g>
                  )}
                </g>
              );
            })}
            {dragPreviewEdgeRoutes.map((route) => (
              <path key={`drag-preview-edge-${route.edgeId}`} d={route.path} className="connection-line drag-preview" style={connectionLineStyle(route.edgeId)} />
            ))}
            {terminalPressPreviewEdgeRoutes.map((route) => (
              <path key={`terminal-preview-edge-${route.edgeId}`} d={route.path} className="connection-line drag-preview" style={connectionLineStyle(route.edgeId)} />
            ))}
            {connectPreviewPath && (
              <path
                d={connectPreviewPath}
                className="connection-preview-line"
                style={connectPreviewColor ? ({ "--connection-color": connectPreviewColor } as CSSProperties) : undefined}
              />
            )}
            {activeDropHintPoint && (
              <g
                className="connect-drop-hint"
                transform={`translate(${activeDropHintPoint.x} ${activeDropHintPoint.y})`}
                style={activeDropHintStyle}
              >
                <circle className="connect-drop-hint-ring" cx="0" cy="0" r="16" />
                <circle className="connect-drop-hint-core" cx="0" cy="0" r="5" />
              </g>
            )}
            {selectedRoutedEdge &&
              selectedEdge &&
              !(draggingDelta && dragPreviewEdgeIdSet.has(selectedEdge.id)) &&
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
          </svg>
        </section>
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
            坐标 {mousePosition ? `X:${mousePosition.x} Y:${mousePosition.y}` : "X:- Y:-"}
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
        {selectedNode || currentModelRecord ? (
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
                    disabled={!selectedNode}
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
                ) : selectedNode ? (
                  <div className="graph-param-table-wrap">
                  <table className="param-table">
                  <tbody>
                    <tr>
                      {renderChineseParamHeader("graph_x", "X坐标")}
                      <td><input type="number" value={Math.round(selectedNode.position.x)} onChange={(event) => updateSelectedNode({ position: { ...selectedNode.position, x: Number(event.target.value) } })} /></td>
                    </tr>
                    <tr>
                      {renderChineseParamHeader("graph_y", "Y坐标")}
                      <td><input type="number" value={Math.round(selectedNode.position.y)} onChange={(event) => updateSelectedNode({ position: { ...selectedNode.position, y: Number(event.target.value) } })} /></td>
                    </tr>
                    <tr>
                      {renderChineseParamHeader("rotation")}
                      <td><input type="number" value={selectedNode.rotation} onChange={(event) => updateSelectedNode({ rotation: Number(event.target.value) })} /></td>
                    </tr>
                    <tr>
                      {renderChineseParamHeader("scaleX")}
                      <td><input type="number" step="0.1" value={getNodeScaleX(selectedNode)} onChange={(event) => { const scaleX = normalizeScale(Number(event.target.value), getNodeScaleX(selectedNode)); updateSelectedNode({ scale: Math.abs(scaleX), scaleX }); }} /></td>
                    </tr>
                    <tr>
                      {renderChineseParamHeader("scaleY")}
                      <td><input type="number" step="0.1" value={getNodeScaleY(selectedNode)} onChange={(event) => { const scaleY = normalizeScale(Number(event.target.value), getNodeScaleY(selectedNode)); updateSelectedNode({ scale: Math.abs(scaleY), scaleY }); }} /></td>
                    </tr>
                    <tr>
                      {renderChineseParamHeader("layerOrder")}
                      <td>
                        <div className="layer-actions">
                          <button type="button" onClick={() => moveSelectedLayer("back")}>置底</button>
                          <button type="button" onClick={() => moveSelectedLayer("backward")}>下移</button>
                          <button type="button" onClick={() => moveSelectedLayer("forward")}>上移</button>
                          <button type="button" onClick={() => moveSelectedLayer("front")}>置顶</button>
                        </div>
                      </td>
                    </tr>
                    {!isStaticNode(selectedNode) && (
                      <>
                        <tr>
                          {renderChineseParamHeader("terminalCount")}
                          <td>
                            <span
                              className="graph-readonly-value"
                              title={isBusNode(selectedNode) ? "母线端子数量由已连接联络线端点数自动生成" : "端子数量由元件定义决定"}
                            >
                              {selectedNode.terminals.length}
                            </span>
                          </td>
                        </tr>
                        {selectedNode.terminals.map((terminal, terminalIndex) => (
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
                                      value={terminalVoltageBaseNumber(terminal.vbase ?? terminalVbaseFallback(selectedNode, terminalIndex))}
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
                    {isStaticNode(selectedNode) && (
                      <>
                        {["static-text", "static-web", "static-date", "static-time", "static-datetime", "static-input", "static-button"].includes(selectedNode.kind) && (
                          <>
                            <tr>
                              <th>{selectedNode.kind === "static-web" ? "网页地址" : "文字内容"}</th>
                              <td>
                                {selectedNode.kind === "static-text" ? (
                                  <textarea rows={4} value={selectedNode.params.text || ""} onChange={(event) => updateParam("text", event.target.value)} />
                                ) : selectedNode.kind === "static-date" ? (
                                  <input type="date" value={selectedNode.params.text || ""} onChange={(event) => updateParam("text", event.target.value)} />
                                ) : selectedNode.kind === "static-time" ? (
                                  <input type="time" value={selectedNode.params.text || ""} onChange={(event) => updateParam("text", event.target.value)} />
                                ) : selectedNode.kind === "static-datetime" ? (
                                  <input type="datetime-local" value={(selectedNode.params.text || "").replace(" ", "T")} onChange={(event) => updateParam("text", event.target.value.replace("T", " "))} />
                                ) : (
                                  <input value={selectedNode.params.text || ""} onChange={(event) => updateParam("text", event.target.value)} />
                                )}
                              </td>
                            </tr>
                            <tr>
                              <th>字体</th>
                              <td>{renderParamEditor("fontFamily", selectedNode.params.fontFamily || "Arial", false)}</td>
                            </tr>
                            <tr>
                              <th>文字样式</th>
                              <td>
                                <div className="text-style-actions">
                                  <label>
                                    <input type="checkbox" checked={(selectedNode.params.fontWeight || "400") !== "400"} onChange={(event) => updateParam("fontWeight", event.target.checked ? "700" : "400")} />
                                    加粗
                                  </label>
                                  <label>
                                    <input type="checkbox" checked={(selectedNode.params.fontStyle || "normal") === "italic"} onChange={(event) => updateParam("fontStyle", event.target.checked ? "italic" : "normal")} />
                                    斜体
                                  </label>
                                  <label>
                                    <input type="checkbox" checked={(selectedNode.params.textDecoration || "none") === "underline"} onChange={(event) => updateParam("textDecoration", event.target.checked ? "underline" : "none")} />
                                    下划线
                                  </label>
                                </div>
                              </td>
                            </tr>
                          </>
                        )}
                        <tr>
                          {renderChineseParamHeader("fillColor")}
                          <td>{renderColorEditor("fillColor", selectedNode.params.fillColor || "transparent", "#ffffff")}</td>
                        </tr>
                        <tr>
                          {renderChineseParamHeader("strokeColor")}
                          <td>{renderColorEditor("strokeColor", selectedNode.params.strokeColor || "transparent", "#334155")}</td>
                        </tr>
                        <tr>
                          {renderChineseParamHeader("textColor")}
                          <td>{renderColorEditor("textColor", selectedNode.params.textColor || "#111827", "#111827")}</td>
                        </tr>
                        <tr>
                          {renderChineseParamHeader("lineWidth")}
                          <td><input type="number" min="0" max="20" value={selectedNode.params.lineWidth || "2"} onChange={(event) => updateParam("lineWidth", event.target.value)} /></td>
                        </tr>
                        <tr>
                          {renderChineseParamHeader("strokeStyle")}
                          <td>{renderParamEditor("strokeStyle", selectedNode.params.strokeStyle || "solid", false)}</td>
                        </tr>
                        <tr>
                          {renderChineseParamHeader("fontSize")}
                          <td><input type="number" min="8" max="160" value={selectedNode.params.fontSize || "24"} onChange={(event) => updateParam("fontSize", event.target.value)} /></td>
                        </tr>
                        <tr>
                          {renderChineseParamHeader("backgroundImage")}
                          <td>
                            <div className="image-field-actions">
                              <input value={selectedNode.params.backgroundImage ? "已设置" : "未设置"} readOnly />
                              <button type="button" onClick={() => setImageTarget({ kind: "node", nodeId: selectedNode.id })}>选择</button>
                              <button type="button" onClick={() => clearSelectedImageForNode(selectedNode.id, "background")} disabled={!selectedNode.params.backgroundImage}>清除</button>
                            </div>
                          </td>
                        </tr>
                      </>
                    )}
                    {!isStaticNode(selectedNode) && (
                      <>
                        <tr>
                          {renderChineseParamHeader("foregroundColor")}
                          <td>{renderColorEditor("foregroundColor", selectedNode.params.foregroundColor || "", terminalColor(selectedNode.terminals[0]?.type, colorPalette))}</td>
                        </tr>
                        <tr>
                          {renderChineseParamHeader("foregroundImage")}
                          <td>
                            <div className="image-field-actions">
                              <input value={selectedNode.params.foregroundImage ? "已设置" : "未设置"} readOnly />
                              <button type="button" onClick={() => setImageTarget({ kind: "nodeForeground", nodeId: selectedNode.id })}>选择</button>
                              <button type="button" onClick={() => clearSelectedImageForNode(selectedNode.id, "foreground")} disabled={!selectedNode.params.foregroundImage}>清除</button>
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
            ) : selectedNode ? (
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
                        const options = paramOptionsForSection(row.key, selectedContainerParameterView.deviceType);
                        return (
                          <tr key={row.key}>
                            {renderParamHeader(row.key, row.label, PARAM_LABELS[row.key] ?? row.label)}
                            <td>
                              {row.key === "name" && selectedContainerParameterView.kind === "container" ? (
                                <input value={selectedNode.name} onChange={(event) => updateSelectedNode({ name: event.target.value })} />
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
                        const eKeys = getEParameterKeys(selectedNode.kind, selectedNode.params);
                        const customDefinitions = parseCustomDefinitions(selectedNode.params);
                        const customKeys = customDefinitions.map((definition) => definition.enName);
                        const customExtraKeys = customKeys.filter((key) => !eKeys.includes(key));
                        const keys =
                          eKeys.length > 0
                            ? [...eKeys, ...customExtraKeys]
                            : customKeys.length > 0
                              ? customKeys
                              : Object.keys(selectedNode.params).filter((key) => !key.startsWith("_"));
                        const readonlyKeys = new Set(customDefinitions.filter((definition) => definition.readonly).map((definition) => definition.enName));
                        return keys.map((key) => {
                          const value = eKeys.length > 0 ? getEParamValue(key, selectedNode) : key === "name" ? selectedNode.name : selectedNode.params[key] ?? "";
                          const definition = customDefinitions.find((item) => item.enName === key);
                          return (
                            <tr key={key}>
                              {renderParamHeader(key, key, definition?.cnName ?? PARAM_LABELS[key] ?? key)}
                              <td>
                                {key === "name" ? (
                                  <input value={selectedNode.name} onChange={(event) => updateSelectedNode({ name: event.target.value })} />
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
            {selectedNode && inspectorTab === "graph" && graphInfoView === "selected" && (
              <div className="topology-card">
                <span>连接度</span>
                <strong>{topology.nodes[selectedNode.id]?.degree ?? 0}</strong>
                <small>
                  {(topology.nodes[selectedNode.id]?.neighbors ?? [])
                    .map((id) => nodeById.get(id)?.name)
                    .filter(Boolean)
                    .join("、") || "暂无相邻元件"}
                </small>
              </div>
            )}
          </div>
        ) : selectedEdge ? (
          <div className="form-stack">
            <div className="topology-card">
              <span>联络线</span>
              <strong>{selectedEdge.id}</strong>
              <small>
                {(nodeById.get(selectedEdge.sourceId)?.name ?? "未知设备") +
                  " -> " +
                  (nodeById.get(selectedEdge.targetId)?.name ?? "未知设备")}
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
        {topologyErrors.length > 0 && (
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
              <span>{topologyErrors.length} 条</span>
            </div>
            <div className="validation-list">
              {visibleTopologyErrors.map((error) => (
                <button key={error.id} onClick={() => locateTopologyError(error)} onDoubleClick={() => locateTopologyError(error)}>
                  <span>{topologyWarningDisplayMessage(error.message)}</span>
                </button>
              ))}
              {hiddenTopologyErrorCount > 0 && (
                <p className="validation-more">还有 {hiddenTopologyErrorCount} 条告警未显示，请先处理已显示告警或重新拓扑。</p>
              )}
            </div>
          </section>
        )}
      </aside>
      {contextMenu && (
        <div className="context-menu" style={contextMenuStyle(contextMenu)}>
          <button onClick={() => runContextMenuAction(undoLastOperation)} disabled={undoStack.length === 0}>
            <Undo2 size={14} />
            撤销
          </button>
          <button onClick={() => runContextMenuAction(copySelection)} disabled={selectedNodeIds.length === 0 && activeSelectedEdgeIds.length === 0}>
            <Copy size={14} />
            复制
          </button>
          <button onClick={() => runContextMenuAction(cutSelection)} disabled={selectedNodeIds.length === 0 && activeSelectedEdgeIds.length === 0}>
            <Scissors size={14} />
            剪切
          </button>
          <button onClick={() => runContextMenuAction(() => saveCurrentProject())} disabled={!saveRequired}>
            <Save size={14} />
            保存
          </button>
          <button onClick={() => runContextMenuAction(pasteSelection)} disabled={canvasClipboard.nodes.length === 0 && canvasClipboard.edges.length === 0}>
            <FileInput size={14} />
            粘贴
          </button>
          <button onClick={() => runContextMenuAction(tidySelectedEdgeRoute)} disabled={!selectedEdgeId}>
            <Route size={14} />
            整理连接线
          </button>
          <button onClick={() => runContextMenuAction(addManualBendFromContextMenu)} disabled={!contextMenu.edgeId}>
            <Pencil size={14} />
            添加拐点
          </button>
          <button onClick={() => runContextMenuAction(deleteSelection)} disabled={selectedNodeIds.length === 0 && activeSelectedEdgeIds.length === 0}>
            <Trash2 size={14} />
            删除
          </button>
        </div>
      )}
      {projectMenu && (
        <div className="context-menu" style={contextMenuStyle(projectMenu)}>
          <button
            onClick={() => runContextMenuAction(() => {
              createSchemeRecord();
            })}
          >
            <FolderOpen size={14} />
            新增方案
          </button>
          <button
            onClick={() => runContextMenuAction(() => {
              createBlankProject();
            })}
            disabled={!projectMenu.schemeId}
          >
            <FileJson size={14} />
            新增模型
          </button>
          <button
            onClick={() => runContextMenuAction(() => {
              const project = projectById.get(projectMenu.projectId ?? "");
              const scheme = schemes.find((item) => item.id === projectMenu.schemeId);
              if (project) {
                if (selectedProjectIds.length > 1 && selectedProjectIds.includes(project.id)) {
                  duplicateSelectedProjectRecords();
                } else {
                  duplicateProjectRecord(project);
                }
              } else if (scheme) {
                if (selectedSchemeIds.length > 1 && selectedSchemeIds.includes(scheme.id)) {
                  duplicateSelectedSchemeRecords();
                } else {
                  duplicateSchemeRecord(scheme);
                }
              }
            })}
            disabled={!projectMenu.projectId && !projectMenu.schemeId}
          >
            <Copy size={14} />
            复制
          </button>
          <button
            onClick={() => runContextMenuAction(() => {
              pasteSelectedRecord();
            })}
            disabled={!recordClipboard || !projectMenu.schemeId}
          >
            粘贴
          </button>
          <button
            onClick={() => runContextMenuAction(() => {
              const project = projectById.get(projectMenu.projectId ?? "");
              const scheme = schemes.find((item) => item.id === projectMenu.schemeId);
              if (project) renameProjectRecord(project);
              else if (scheme) renameSchemeRecord(scheme);
            })}
            disabled={!projectMenu.projectId && !projectMenu.schemeId}
          >
            <Pencil size={14} />
            重命名
          </button>
          <button
            onClick={() => runContextMenuAction(() => {
              const scheme = schemes.find((item) => item.id === projectMenu.schemeId);
              if (scheme) exportSchemeRecord(scheme);
            })}
            disabled={!projectMenu.schemeId}
          >
            <Download size={14} />
            导出方案
          </button>
          <button
            onClick={() => runContextMenuAction(() => {
              const project = projectById.get(projectMenu.projectId ?? "");
              const scheme = schemes.find((item) => item.id === projectMenu.schemeId);
              if (project) deleteProjectRecord(project);
              else if (scheme) deleteSchemeRecord(scheme);
            })}
            disabled={!projectMenu.projectId && !projectMenu.schemeId}
          >
            <Trash2 size={14} />
            删除
          </button>
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
                <div className="voltage-color-header">
                  <span>AC/DC</span>
                  <span>电压基值</span>
                  <span>颜色</span>
                  <span>操作</span>
                </div>
                <div className="voltage-color-list">
                  {voltageColorRows.map((row) => (
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
                  ))}
                </div>
                <button type="button" className="secondary-action" onClick={addVoltageColorRow}>新增电压等级</button>
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
                {libraryGroups.map((group) => {
                  const templates = groupedLibrary[group] ?? [];
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
                        <div className="device-definition-items" role="group" aria-label={`${group}元件列表`}>
                          {templates.map((template) => (
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
                        <span>设备类型</span>
                        <strong>{selectedDefinitionTemplate.kind}</strong>
                      </div>
                      <div>
                        <span>元件库</span>
                        <strong>{normalizeLibraryGroupName(selectedDefinitionTemplate.group)}</strong>
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
                        <span>导出Section</span>
                        <select
                          value={definitionDraftSection}
                          onChange={(event) => {
                            setDefinitionDraftSection(event.target.value);
                            setDefinitionDraftError("");
                          }}
                        >
                          {E_SECTION_OPTIONS.map((section) => (
                            <option key={section} value={section}>
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
                      <button type="button" onClick={addDefinitionDraftRow}>新增属性</button>
                      <button type="button" onClick={saveDeviceDefinitionDraft}>保存定义</button>
                      <button type="button" onClick={resetDeviceDefinitionDraft} disabled={!selectedDefinitionBaseTemplate}>
                        恢复默认
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="empty-state compact">
                    <Grid2X2 size={24} />
                    <p>当前元件库暂无元件。</p>
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
            <div className="custom-device-form-grid">
              <label>
                元件库类型
                <select
                  value={customDeviceDraft.groupName}
                  onChange={(event) => setCustomDeviceDraft((current) => ({
                    ...current,
                    groupName: event.target.value,
                    exportSection: defaultExportSectionForGroup(event.target.value),
                    error: ""
                  }))}
                >
                  {Array.from(new Set([...CUSTOM_LIBRARY_BASE_GROUPS, ...libraryGroups.filter((group) => group !== "静态图元")])).map((group) => (
                    <option key={group} value={group}>
                      {group}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                新增自定义元件库
                <input
                  value={customDeviceDraft.newGroupName}
                  placeholder="不填则使用左侧类型"
                  onChange={(event) => setCustomDeviceDraft((current) => ({ ...current, newGroupName: event.target.value, error: "" }))}
                />
              </label>
              <label>
                设备类型
                <input
                  value={customDeviceDraft.deviceType}
                  placeholder="例如 ACUnit"
                  onChange={(event) => setCustomDeviceDraft((current) => ({ ...current, deviceType: event.target.value, error: "" }))}
                />
              </label>
              <label>
                导出Section
                <select
                  value={customDeviceDraft.exportSection}
                  onChange={(event) => setCustomDeviceDraft((current) => ({ ...current, exportSection: event.target.value, error: "" }))}
                >
                  {E_SECTION_OPTIONS.map((section) => (
                    <option key={section} value={section}>
                      {section}
                    </option>
                  ))}
                </select>
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
                    backgroundImage: generateCustomDeviceImage(current.deviceType || "Unit", current.terminalTypes.slice(0, current.terminalCount)),
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
                新增属性
              </button>
              <button type="button" onClick={saveCustomDeviceTemplate}>保存自定义设备</button>
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


