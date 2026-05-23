import { ChangeEvent, DragEvent, PointerEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  AlignCenterHorizontal,
  AlignCenterVertical,
  Cable,
  Download,
  FileInput,
  FileJson,
  Grid2X2,
  Copy,
  ChevronDown,
  ChevronRight,
  FolderOpen,
  Pencil,
  MousePointer2,
  Save,
  Trash2,
  Undo2
} from "lucide-react";
import {
  alignNodes,
  buildTopology,
  calculateElectricalTopology,
  canConnectTerminals,
  createTerminals,
  createSavedScheme,
  createSavedProject,
  createDefaultNode,
  deleteNodesWithConnectedEdges,
  deleteSavedScheme,
  deleteSavedProject,
  deserializeProject,
  DEVICE_LIBRARY,
  duplicateSavedProject,
  getEdgeEndpointPoint as getModelEdgeEndpointPoint,
  getNodeScaleX,
  getNodeScaleY,
  getSwitchVisualState,
  getTerminalPoint,
  isBusNode,
  isGeneratorNode,
  lockProjectEdgeTerminals,
  projectPointToBusCenterline,
  validateTopology,
  type DeviceKind,
  type Edge,
  type ModelNode,
  type Point,
  type ProjectFile,
  type TerminalType,
  type TopologyValidationError,
  routeEdgesForRendering,
  moveProjectToScheme,
  renameSavedScheme,
  renameSavedProject,
  serializeProject,
  upsertSavedProject,
  uniqueRecordName,
  type SavedSchemeRecord,
  type SavedProjectRecord
} from "./model";

type ToolMode = "select" | "connect";
type EdgeEndpoint = "source" | "target";
type TransformDrag =
  | { kind: "rotate"; nodeId: string; historyCaptured?: boolean }
  | { kind: "scale-x" | "scale-y" | "scale-both"; nodeId: string; historyCaptured?: boolean };
type Marquee = { start: Point; current: Point } | null;
type ContextMenuState = { x: number; y: number } | null;
type ProjectMenuState = { x: number; y: number; schemeId?: string; projectId?: string } | null;
type RewiringState = { edgeId: string; endpoint: EdgeEndpoint; previewPoint: Point; pointerId?: number } | null;
type ManualPathDrag =
  | {
      edgeId: string;
      segmentIndex: number;
      orientation: "horizontal" | "vertical";
      startPoint: Point;
      originalManualPoints: Point[];
      historyCaptured?: boolean;
    }
  | null;
type DraggingState = {
  nodeIds: string[];
  startPoint: Point;
  originalPositions: Record<string, Point>;
  originalEdgePoints: Record<string, { sourcePoint?: Point; targetPoint?: Point; manualPoints?: Point[] }>;
  historyCaptured?: boolean;
};
type ClipboardRecord =
  | { kind: "scheme"; scheme: SavedSchemeRecord }
  | { kind: "project"; project: SavedProjectRecord };
type UndoSnapshot = {
  projectName: string;
  nodes: ModelNode[];
  edges: Edge[];
  topologyErrors: TopologyValidationError[];
};

const busEndpointColor = (node: ModelNode) => (node.kind.startsWith("dc") ? "#0f766e" : "#2563eb");

const CANVAS_WIDTH = 1800;
const CANVAS_HEIGHT = 1200;
const PROJECT_PANEL_MIN_HEIGHT = 150;
const PROJECT_PANEL_MAX_HEIGHT = 430;
const PROJECT_PANEL_DEFAULT_HEIGHT = 260;
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
  name: ["交流电源A", "进线开关", "10kV母线", "交流主变", "750V直流母线", "直流负荷"][index]
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
const PARAM_LABELS: Record<string, string> = {
  ratedCapacity: "额定容量",
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
  acControlType: "AC端控制类型",
  dcControlType: "DC端控制类型",
  closedStatus: "闭合状态",
  run_stat: "运行状态"
  ,
  vbase: "电压等级",
  highVbase: "高压侧电压等级",
  mediumVbase: "中压侧电压等级",
  lowVbase: "低压侧电压等级",
  sourceVbase: "首端电压等级",
  targetVbase: "末端电压等级"
};

const PARAM_OPTIONS: Record<string, string[]> = {
  controlType: ["PV", "PQ", "PH", "P", "V"],
  sourceControlType: ["定P", "定V", "定I", "定PQ", "定PV", "定PH", "不定"],
  targetControlType: ["定P", "定V", "定I", "定PQ", "定PV", "定PH", "不定"],
  acControlType: ["定PQ", "定PV", "定PH", "不定"],
  dcControlType: ["定P", "定V", "定I", "不定"],
  closedStatus: ["闭合", "打开"],
  run_stat: ["运行", "停运", "检修"]
};

function readSavedProjects(): SavedProjectRecord[] {
  try {
    const raw = window.localStorage.getItem(PROJECT_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as SavedProjectRecord[]) : [];
  } catch {
    return [];
  }
}

function readSavedSchemes(): SavedSchemeRecord[] {
  try {
    const raw = window.localStorage.getItem(SCHEME_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as SavedSchemeRecord[];
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
    const legacyProjects = readSavedProjects();
    return legacyProjects.length > 0 ? [createSavedScheme("默认方案", legacyProjects)] : [createSavedScheme("默认方案")];
  } catch {
    return [createSavedScheme("默认方案")];
  }
}

const groupedLibrary = DEVICE_LIBRARY.reduce<Record<string, typeof DEVICE_LIBRARY>>((groups, item) => {
  groups[item.group] = groups[item.group] ? [...groups[item.group], item] : [item];
  return groups;
}, {});

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

function downloadText(filename: string, text: string, mime: string) {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function DeviceGlyph({ node, miniature = false }: { node: ModelNode; miniature?: boolean }) {
  const w = miniature ? 58 : node.size.width;
  const h = miniature ? 38 : node.size.height;
  const stroke = node.kind.startsWith("dc") || node.kind.includes("dcdc") ? "#0f766e" : "#2563eb";
  const fill = node.kind.includes("converter") ? "#ecfeff" : node.kind.includes("switch") ? "#fff7ed" : "#ffffff";

  if (node.kind.includes("wind-source")) {
    return (
      <g fill={fill} stroke={stroke} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="0" cy="0" r={miniature ? 4 : 6} />
        <path d="M 0 0 L 0 -18 M 0 0 L 16 10 M 0 0 L -16 10" />
        <path d="M 0 6 V 22" />
      </g>
    );
  }

  if (node.kind.includes("pv-source")) {
    return (
      <g fill={fill} stroke={stroke} strokeWidth="2.2" strokeLinejoin="round">
        <path d="M -22 -12 H 22 V 14 H -22 Z" />
        <path d="M -7 -12 V 14 M 8 -12 V 14 M -22 1 H 22" />
        <path d="M 0 -22 V -17 M -18 -20 L -14 -16 M 18 -20 L 14 -16" />
      </g>
    );
  }

  if (node.kind.includes("thermal-source")) {
    return (
      <g fill={fill} stroke={stroke} strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
        <path d="M -20 18 H 20 V -4 L 8 4 V -4 L -4 4 V -4 L -20 8 Z" />
        <path d="M -6 -12 C -12 -22 6 -22 0 -32 M 10 -12 C 4 -22 22 -22 16 -32" fill="none" />
      </g>
    );
  }

  if (node.kind.includes("hydro-source")) {
    return (
      <g fill="none" stroke={stroke} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M -20 -12 C -8 -24 8 -24 20 -12 C 12 10 4 20 0 22 C -4 20 -12 10 -20 -12 Z" fill={fill} />
        <path d="M -16 6 C -8 0 -2 12 6 6 C 12 1 15 5 18 8" />
      </g>
    );
  }

  if (node.kind.includes("nuclear-source")) {
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

  if (node.kind.includes("line")) {
    return (
      <g stroke={stroke} strokeWidth="4" strokeLinecap="round">
        <line x1={-w / 2 + 8} y1="0" x2={w / 2 - 8} y2="0" />
        <line x1={-w / 4} y1="-10" x2={w / 4} y2="10" />
      </g>
    );
  }

  if (node.kind.includes("transformer")) {
    return (
      <g fill={fill} stroke={stroke} strokeWidth="2.5">
        <circle cx="-14" cy="0" r={miniature ? 11 : 18} />
        <circle cx="14" cy="0" r={miniature ? 11 : 18} />
      </g>
    );
  }

  if (node.kind.includes("switch")) {
    const closed = getSwitchVisualState(node) === "closed";
    return (
      <g fill="none" stroke={stroke} strokeWidth="2.5" strokeLinecap="round">
        <line x1={-w / 2 + 10} y1="0" x2="-8" y2="0" />
        <line x1="8" y1="0" x2={w / 2 - 10} y2="0" />
        <line x1="-8" y1="0" x2={closed ? "8" : "11"} y2={closed ? "0" : "-14"} />
      </g>
    );
  }

  if (node.kind.includes("disconnector") || node.kind.includes("breaker")) {
    const closed = getSwitchVisualState(node) === "closed";
    return (
      <g fill="none" stroke={stroke} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1={-w / 2 + 10} y1="0" x2="-10" y2="0" />
        <line x1="10" y1="0" x2={w / 2 - 10} y2="0" />
        {node.kind.includes("breaker") && <rect x="-10" y="-12" width="20" height="24" rx="3" fill={fill} />}
        <line x1="-10" y1="0" x2={closed ? "10" : "12"} y2={closed ? "0" : "-14"} />
      </g>
    );
  }

  if (node.kind.includes("load")) {
    return (
      <g fill={fill} stroke={stroke} strokeWidth="2.5" strokeLinejoin="round">
        <path d={`M ${-w / 3} ${-h / 3} L ${w / 3} ${-h / 3} L 0 ${h / 3} Z`} />
      </g>
    );
  }

  if (node.kind.includes("converter")) {
    return (
      <g>
        <rect x={-w / 2} y={-h / 2} width={w} height={h} rx="6" fill={fill} stroke={stroke} strokeWidth="2.5" />
        <path d={`M ${-w / 4} 0 H ${w / 4}`} stroke={stroke} strokeWidth="2.5" strokeLinecap="round" />
        <path d={`M ${w / 8} -8 L ${w / 4} 0 L ${w / 8} 8`} fill="none" stroke={stroke} strokeWidth="2.5" strokeLinecap="round" />
      </g>
    );
  }

  return (
    <g>
      <circle cx="0" cy="0" r={miniature ? 16 : 24} fill={fill} stroke={stroke} strokeWidth="2.5" />
      <path d="M -10 0 H 10 M 0 -10 V 10" stroke={stroke} strokeWidth="2.5" strokeLinecap="round" />
    </g>
  );
}

function buildSvgDocument(nodes: ModelNode[], edges: Edge[]) {
  const edgeMarkup = routeEdgesForRendering(nodes, edges)
    .map((route) => `<path d="${route.path}" fill="none" stroke="#334155" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`)
    .join("\n");
  const nodeMarkup = nodes
    .map((node) => {
      const stroke = node.kind.startsWith("dc") || node.kind.includes("dcdc") ? "#0f766e" : "#2563eb";
      if (isBusNode(node)) {
        return `<g transform="translate(${node.position.x} ${node.position.y}) rotate(${node.rotation}) scale(${getNodeScaleX(node)} ${getNodeScaleY(node)})">
  <title>${node.name}</title>
  <line x1="${-node.size.width / 2}" y1="0" x2="${node.size.width / 2}" y2="0" stroke="${stroke}" stroke-width="${Math.max(8, node.size.height / 3)}" stroke-linecap="round"/>
</g>`;
      }
      return `<g transform="translate(${node.position.x} ${node.position.y}) rotate(${node.rotation}) scale(${getNodeScaleX(node)} ${getNodeScaleY(node)})">
  <title>${node.name}</title>
  <rect x="${-node.size.width / 2}" y="${-node.size.height / 2}" width="${node.size.width}" height="${node.size.height}" rx="8" fill="#ffffff" stroke="#94a3b8"/>
</g>`;
    })
    .join("\n");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${CANVAS_WIDTH}" height="${CANVAS_HEIGHT}" viewBox="0 0 ${CANVAS_WIDTH} ${CANVAS_HEIGHT}">
<rect width="100%" height="100%" fill="#f8fafc"/>
${edgeMarkup}
${nodeMarkup}
</svg>`;
}

export function App() {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const importRef = useRef<HTMLInputElement | null>(null);
  const canvasInteractionRef = useRef(false);
  const [nodes, setNodes] = useState<ModelNode[]>(SAMPLE_NODES);
  const [edges, setEdges] = useState<Edge[]>(SAMPLE_EDGES);
  const [projectName, setProjectName] = useState("电力系统图上模型");
  const [schemes, setSchemes] = useState<SavedSchemeRecord[]>(() => readSavedSchemes());
  const [activeProjectId, setActiveProjectId] = useState<string>("");
  const [activeSchemeId, setActiveSchemeId] = useState<string>("");
  const [mode, setMode] = useState<ToolMode>("select");
  const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>(nodes[0] ? [nodes[0].id] : []);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string>("");
  const [connectSource, setConnectSource] = useState<{ nodeId: string; terminalId: string; point?: Point } | null>(null);
  const [dragging, setDragging] = useState<DraggingState | null>(null);
  const [rewiring, setRewiring] = useState<RewiringState>(null);
  const [manualPathDrag, setManualPathDrag] = useState<ManualPathDrag>(null);
  const [transformDrag, setTransformDrag] = useState<TransformDrag | null>(null);
  const [viewBox, setViewBox] = useState({ x: 0, y: 0, width: CANVAS_WIDTH, height: CANVAS_HEIGHT });
  const [panning, setPanning] = useState<{ clientX: number; clientY: number; viewBox: typeof viewBox } | null>(null);
  const [marquee, setMarquee] = useState<Marquee>(null);
  const [clipboardNodes, setClipboardNodes] = useState<ModelNode[]>([]);
  const [contextMenu, setContextMenu] = useState<ContextMenuState>(null);
  const [inspectorTab, setInspectorTab] = useState<"model" | "graph" | "device">("graph");
  const [topologyErrors, setTopologyErrors] = useState<TopologyValidationError[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [selectedSchemeId, setSelectedSchemeId] = useState<string>("");
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([]);
  const [selectedSchemeIds, setSelectedSchemeIds] = useState<string[]>([]);
  const [expandedSchemeIds, setExpandedSchemeIds] = useState<string[]>(() => schemes.map((scheme) => scheme.id));
  const [projectMenu, setProjectMenu] = useState<ProjectMenuState>(null);
  const [projectPanelHeight, setProjectPanelHeight] = useState(PROJECT_PANEL_DEFAULT_HEIGHT);
  const [projectPanelResize, setProjectPanelResize] = useState<{ startY: number; startHeight: number } | null>(null);
  const [undoStack, setUndoStack] = useState<UndoSnapshot[]>([]);
  const [recordClipboard, setRecordClipboard] = useState<ClipboardRecord | null>(null);

  const selectedNodeId = selectedNodeIds[0] ?? "";
  const selectedNode = nodes.find((node) => node.id === selectedNodeId);
  const selectedEdge = edges.find((edge) => edge.id === selectedEdgeId);
  const projects = useMemo(() => schemes.flatMap((scheme) => scheme.projects), [schemes]);
  const selectedProjectRecord = projects.find((project) => project.id === selectedProjectId);
  const selectedSchemeRecord = schemes.find((scheme) => scheme.id === selectedSchemeId);
  const selectedCount = selectedNodeIds.length;
  const topology = useMemo(() => buildTopology(nodes, edges), [nodes, edges]);
  const nodeById = useMemo(() => new Map(nodes.map((node) => [node.id, node])), [nodes]);
  const rewiringPreview = useMemo(() => {
    if (!rewiring) {
      return { nodes, edges };
    }
    const edge = edges.find((item) => item.id === rewiring.edgeId);
    if (!edge) {
      return { nodes, edges };
    }
    const fixedNodeId = rewiring.endpoint === "source" ? edge.targetId : edge.sourceId;
    const fixedNode = nodeById.get(fixedNodeId);
    const fixedPoint = rewiring.endpoint === "source" ? edge.targetPoint : edge.sourcePoint;
    if (!fixedNode && !fixedPoint) {
      return { nodes, edges };
    }
    const fixedTerminalId = rewiring.endpoint === "source" ? edge.targetTerminalId : edge.sourceTerminalId;
    const terminalType = fixedNode?.terminals.find((terminal) => terminal.id === fixedTerminalId)?.type ?? "ac";
    const previewNode: ModelNode = {
      id: "__rewiring-preview__",
      kind: terminalType === "dc" ? "dc-bus" : "ac-bus",
      name: "拖拽端点",
      nodeNumber: "",
      acTopologyNode: 0,
      dcTopologyNode: 0,
      position: rewiring.previewPoint,
      size: { width: 0, height: 0 },
      rotation: 0,
      scale: 1,
      scaleX: 1,
      scaleY: 1,
      terminals: [{ id: "t1", label: "拖拽端点", type: terminalType as TerminalType, anchor: { x: 0, y: 0 }, nodeNumber: "" }],
      params: {}
    };
    const previewEdge: Edge =
      rewiring.endpoint === "source"
        ? { ...edge, sourceId: previewNode.id, sourceTerminalId: "t1", sourcePoint: undefined }
        : { ...edge, targetId: previewNode.id, targetTerminalId: "t1", targetPoint: undefined };
    return {
      nodes: [...nodes, previewNode],
      edges: edges.map((item) => (item.id === edge.id ? previewEdge : item))
    };
  }, [edges, nodeById, nodes, rewiring]);
  const routedEdges = useMemo(
    () => routeEdgesForRendering(rewiringPreview.nodes, rewiringPreview.edges),
    [rewiringPreview]
  );
  const renderedRoutedEdges = useMemo(
    () => [...routedEdges].sort((first, second) => Number(first.edgeId === selectedEdgeId) - Number(second.edgeId === selectedEdgeId)),
    [routedEdges, selectedEdgeId]
  );

  useEffect(() => {
    window.localStorage.setItem(SCHEME_STORAGE_KEY, JSON.stringify(schemes));
  }, [schemes]);

  useEffect(() => {
    setExpandedSchemeIds((current) => {
      const schemeIds = new Set(schemes.map((scheme) => scheme.id));
      const retained = current.filter((id) => schemeIds.has(id));
      const retainedIds = new Set(retained);
      const added = schemes.filter((scheme) => !retainedIds.has(scheme.id)).map((scheme) => scheme.id);
      return [...retained, ...added];
    });
  }, [schemes]);

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

  const cloneProjectState = (): UndoSnapshot => ({
    projectName,
    nodes: structuredClone(nodes),
    edges: structuredClone(edges),
    topologyErrors: structuredClone(topologyErrors)
  });

  const pushUndoSnapshot = () => {
    const snapshot = cloneProjectState();
    setUndoStack((current) => [...current.slice(-49), snapshot]);
  };

  const undoLastOperation = () => {
    setUndoStack((current) => {
      const snapshot = current.at(-1);
      if (!snapshot) {
        return current;
      }
      setProjectName(snapshot.projectName);
      setNodes(snapshot.nodes);
      setEdges(snapshot.edges);
      setTopologyErrors(snapshot.topologyErrors);
      setSelectedNodeIds(snapshot.nodes[0] ? [snapshot.nodes[0].id] : []);
      setSelectedEdgeId("");
      setConnectSource(null);
      setRewiring(null);
      setContextMenu(null);
      setProjectMenu(null);
      return current.slice(0, -1);
    });
  };

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
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isCanvasShortcutTarget = Boolean(target?.closest(".diagram-canvas")) || canvasInteractionRef.current;
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
          setConnectSource(null);
          setRewiring(null);
          clearRecordSelection();
        }
      } else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "c") {
        event.preventDefault();
        if (selectedProjectId || selectedSchemeId || selectedProjectIds.length > 0 || selectedSchemeIds.length > 0) {
          copySelectedRecord();
        } else if (isCanvasShortcutTarget) {
          copySelection();
        }
      } else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "v") {
        event.preventDefault();
        if (recordClipboard) {
          pasteSelectedRecord();
        } else if (isCanvasShortcutTarget) {
          pasteSelection();
        }
      } else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        saveCurrentProject();
      } else if (event.key === "Delete" || event.key === "Backspace") {
        event.preventDefault();
        if (selectedProjectIds.length > 1 || selectedSchemeIds.length > 1) {
          deleteSelectedRecords();
        } else if (selectedProjectId) {
          const project = projects.find((item) => item.id === selectedProjectId);
          if (project) deleteProjectRecord(project);
        } else if (selectedSchemeId) {
          const scheme = schemes.find((item) => item.id === selectedSchemeId);
          if (scheme) deleteSchemeRecord(scheme);
        } else if (isCanvasShortcutTarget) {
          deleteSelection();
        }
      } else if (isCanvasShortcutTarget && event.key === "ArrowLeft") {
        event.preventDefault();
        moveSelection(event.shiftKey ? -24 : -6, 0);
      } else if (isCanvasShortcutTarget && event.key === "ArrowRight") {
        event.preventDefault();
        moveSelection(event.shiftKey ? 24 : 6, 0);
      } else if (isCanvasShortcutTarget && event.key === "ArrowUp") {
        event.preventDefault();
        moveSelection(0, event.shiftKey ? -24 : -6);
      } else if (isCanvasShortcutTarget && event.key === "ArrowDown") {
        event.preventDefault();
        moveSelection(0, event.shiftKey ? 24 : 6);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [clipboardNodes, edges, nodes, projectName, projects, recordClipboard, schemes, selectedEdgeId, selectedNodeIds, selectedProjectId, selectedProjectIds, selectedSchemeId, selectedSchemeIds, topologyErrors]);

  const currentProject = (): ProjectFile => ({
    ...lockProjectEdgeTerminals({
      version: 1,
      name: projectName,
      nodes,
      edges
    })
  });

  const clearTransientSelectionState = () => {
    setSelectedEdgeId("");
    setConnectSource(null);
    setRewiring(null);
    setContextMenu(null);
  };

  const copySelection = () => {
    const selected = nodes.filter((node) => selectedNodeIds.includes(node.id));
    setClipboardNodes(selected);
  };

  const pasteSelection = () => {
    if (clipboardNodes.length === 0) {
      return;
    }
    pushUndoSnapshot();
    const idMap = new Map<string, string>();
    const pasted = clipboardNodes.map((node) => {
      const nextId = `node-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      idMap.set(node.id, nextId);
      return {
        ...node,
        id: nextId,
        name: `${node.name} 副本`,
        position: { x: node.position.x + 36, y: node.position.y + 36 },
        params: { ...node.params },
        terminals: node.terminals.map((terminal) => ({ ...terminal, anchor: { ...terminal.anchor } }))
      };
    });
    setNodes((current) => [...current, ...pasted]);
    setSelectedNodeIds(pasted.map((node) => node.id));
    clearTransientSelectionState();
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
    setSelectedNodeIds(
      nodes
        .filter((node) => node.position.x >= left && node.position.x <= right && node.position.y >= top && node.position.y <= bottom)
        .map((node) => node.id)
    );
    clearTransientSelectionState();
    setMarquee(null);
  };

  const deleteSelection = () => {
    if (selectedEdgeId) {
      pushUndoSnapshot();
      setEdges((current) => current.filter((edge) => edge.id !== selectedEdgeId));
      setSelectedEdgeId("");
      return;
    }
    if (selectedNodeIds.length === 0) {
      return;
    }
    pushUndoSnapshot();
    const result = deleteNodesWithConnectedEdges(nodes, edges, selectedNodeIds);
    setNodes(result.nodes);
    setEdges(result.edges);
    setSelectedNodeIds([]);
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

  const moveAttachedBusPoints = (deltas: Record<string, Point>) => {
    const activeDeltas = Object.fromEntries(
      Object.entries(deltas).filter(([, delta]) => delta && (delta.x !== 0 || delta.y !== 0))
    );
    const movedIds = new Set(Object.keys(activeDeltas));
    if (movedIds.size === 0) {
      return;
    }
    const movedBusIds = new Set(nodes.filter((node) => isBusNode(node) && movedIds.has(node.id)).map((node) => node.id));
    setEdges((current) =>
      current.map((edge) => {
        const sourceDelta = movedBusIds.has(edge.sourceId) ? deltas[edge.sourceId] : undefined;
        const targetDelta = movedBusIds.has(edge.targetId) ? deltas[edge.targetId] : undefined;
        const manualDelta = manualPointDeltaForEdge(edge, activeDeltas);
        return {
          ...edge,
          sourcePoint: sourceDelta && edge.sourcePoint
            ? { x: edge.sourcePoint.x + sourceDelta.x, y: edge.sourcePoint.y + sourceDelta.y }
            : edge.sourcePoint,
          targetPoint: targetDelta && edge.targetPoint
            ? { x: edge.targetPoint.x + targetDelta.x, y: edge.targetPoint.y + targetDelta.y }
            : edge.targetPoint,
          manualPoints: manualDelta && edge.manualPoints
            ? edge.manualPoints.map((point) => ({ x: point.x + manualDelta.x, y: point.y + manualDelta.y }))
            : edge.manualPoints
        };
      })
    );
  };

  const moveSelection = (dx: number, dy: number) => {
    if (selectedNodeIds.length === 0) {
      return;
    }
    pushUndoSnapshot();
    const selected = new Set(selectedNodeIds);
    moveAttachedBusPoints(Object.fromEntries(selectedNodeIds.map((id) => [id, { x: dx, y: dy }])));
    setNodes((current) =>
      current.map((node) =>
        selected.has(node.id) ? { ...node, position: { x: node.position.x + dx, y: node.position.y + dy } } : node
      )
    );
  };

  const updateSelectedNode = (patch: Partial<ModelNode>) => {
    if (!selectedNodeId) {
      return;
    }
    pushUndoSnapshot();
    if (patch.position && selectedNode) {
      moveAttachedBusPoints({
        [selectedNodeId]: {
          x: patch.position.x - selectedNode.position.x,
          y: patch.position.y - selectedNode.position.y
        }
      });
    }
    setNodes((current) => current.map((node) => (node.id === selectedNodeId ? { ...node, ...patch } : node)));
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

  const renderParamEditor = (key: string, value: string, wrapLabel = true) => {
    const label = PARAM_LABELS[key] ?? key;
    const options = PARAM_OPTIONS[key];
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

  const clampScale = (value: number) => Math.max(0.2, Math.min(5, value));

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
    const point = screenToSvgPoint(svgRef.current, event.clientX, event.clientY);
    return busAnchorFromPoint(node, point);
  };

  const busAnchorFromPoint = (node: ModelNode, point: Point): Point | undefined => {
    if (!isBusNode(node)) {
      return undefined;
    }
    return projectPointToBusCenterline(node, point);
  };

  const isPointOnBus = (node: ModelNode, point: Point) => {
    const halfWidth = (node.size.width * getNodeScaleX(node)) / 2;
    const halfHeight = (node.size.height * getNodeScaleY(node)) / 2;
    return (
      point.x >= node.position.x - halfWidth &&
      point.x <= node.position.x + halfWidth &&
      point.y >= node.position.y - halfHeight &&
      point.y <= node.position.y + halfHeight
    );
  };

  const findRewireTargetAtPoint = (point: Point, state: Exclude<RewiringState, null>) => {
    const edge = edges.find((item) => item.id === state.edgeId);
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
      if (isBusNode(node) && isPointOnBus(node, point)) {
        const terminalId = node.terminals[0]?.id;
        if (terminalId && canConnectTerminals(node, terminalId, otherNode, otherTerminalId)) {
          return { node, terminalId, point: busAnchorFromPoint(node, point) };
        }
        continue;
      }
      for (const terminal of node.terminals) {
        const terminalPoint = getTerminalPoint(node, terminal.id);
        const distance = Math.hypot(point.x - terminalPoint.x, point.y - terminalPoint.y);
        if (distance <= 16 && canConnectTerminals(node, terminal.id, otherNode, otherTerminalId)) {
          return { node, terminalId: terminal.id, point: undefined };
        }
      }
    }
    return null;
  };

  const finishRewiring = (event: PointerEvent<SVGSVGElement>) => {
    if (!rewiring || !svgRef.current) {
      return;
    }
    const point = screenToSvgPoint(svgRef.current, event.clientX, event.clientY);
    const target = findRewireTargetAtPoint(point, rewiring);
    if (target) {
      pushUndoSnapshot();
      setEdges((current) =>
        current.map((edge) =>
          edge.id === rewiring.edgeId
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
            : edge
        )
      );
    } else {
      pushUndoSnapshot();
      setEdges((current) =>
        current.map((edge) =>
          edge.id === rewiring.edgeId
            ? rewiring.endpoint === "source"
              ? {
                  ...edge,
                  sourceId: "",
                  sourceTerminalId: undefined,
                  sourcePoint: point
                }
              : {
                  ...edge,
                  targetId: "",
                  targetTerminalId: undefined,
                  targetPoint: point
                }
            : edge
        )
      );
    }
    setSelectedNodeIds([]);
    setSelectedEdgeId(rewiring.edgeId);
    setRewiring(null);
  };

  const updateTerminalCount = (count: number) => {
    if (!selectedNode) {
      return;
    }
    pushUndoSnapshot();
    const type = selectedNode.terminals[0]?.type ?? (selectedNode.kind.startsWith("dc") ? "dc" : "ac");
    const terminals = createTerminals(type, count);
    setNodes((current) => current.map((node) => (node.id === selectedNode.id ? { ...node, terminals } : node)));
    setEdges((current) =>
      current.filter((edge) => {
        if (edge.sourceId === selectedNode.id && !terminals.some((terminal) => terminal.id === edge.sourceTerminalId)) {
          return false;
        }
        if (edge.targetId === selectedNode.id && !terminals.some((terminal) => terminal.id === edge.targetTerminalId)) {
          return false;
        }
        return true;
      })
    );
  };

  const handleDrop = (event: DragEvent<SVGSVGElement>) => {
    event.preventDefault();
    const kind = event.dataTransfer.getData("application/device-kind") as DeviceKind;
    if (!kind || !svgRef.current) {
      return;
    }
    const position = screenToSvgPoint(svgRef.current, event.clientX, event.clientY);
    const node = createDefaultNode(kind, position);
    pushUndoSnapshot();
    setNodes((current) => [...current, node]);
    setSelectedNodeIds([node.id]);
    setSelectedEdgeId("");
  };

  const handleNodePointerDown = (event: PointerEvent<SVGGElement>, node: ModelNode) => {
    event.stopPropagation();
    if (event.button !== 0) {
      return;
    }
    if (event.ctrlKey && svgRef.current) {
      setSelectedEdgeId("");
      setConnectSource(null);
      setRewiring(null);
      setPanning({ clientX: event.clientX, clientY: event.clientY, viewBox });
      event.currentTarget.setPointerCapture(event.pointerId);
      return;
    }
    setSelectedEdgeId("");
    let dragNodeIds = selectedNodeIds.includes(node.id) ? selectedNodeIds : [node.id];
    if (event.ctrlKey || event.shiftKey || event.metaKey) {
      dragNodeIds = selectedNodeIds.includes(node.id)
        ? selectedNodeIds.filter((id) => id !== node.id)
        : [...selectedNodeIds, node.id];
      setSelectedNodeIds(dragNodeIds);
    } else if (!selectedNodeIds.includes(node.id)) {
      dragNodeIds = [node.id];
      setSelectedNodeIds([node.id]);
    }
    if (mode === "connect") {
      if (isBusNode(node)) {
        handleTerminalPointerDown(event as unknown as PointerEvent<SVGCircleElement>, node, node.terminals[0].id);
      }
      return;
    }
    if (!svgRef.current) {
      return;
    }
    const point = screenToSvgPoint(svgRef.current, event.clientX, event.clientY);
    if (dragNodeIds.length === 0) {
      return;
    }
    const selectedForDrag = new Set(dragNodeIds);
    setDragging({
      nodeIds: dragNodeIds,
      startPoint: point,
      originalPositions: Object.fromEntries(
        nodes
          .filter((item) => selectedForDrag.has(item.id))
          .map((item) => [item.id, { ...item.position }])
      ),
      originalEdgePoints: Object.fromEntries(
        edges.map((edge) => [
          edge.id,
          {
            sourcePoint: edge.sourcePoint ? { ...edge.sourcePoint } : undefined,
            targetPoint: edge.targetPoint ? { ...edge.targetPoint } : undefined
          }
        ])
      )
    });
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: PointerEvent<SVGSVGElement>) => {
    if (rewiring && svgRef.current) {
      setRewiring({ ...rewiring, previewPoint: screenToSvgPoint(svgRef.current, event.clientX, event.clientY) });
      return;
    }
    if (marquee && svgRef.current) {
      setMarquee({ ...marquee, current: screenToSvgPoint(svgRef.current, event.clientX, event.clientY) });
      return;
    }
    if (panning && svgRef.current) {
      const rect = svgRef.current.getBoundingClientRect();
      const dx = ((event.clientX - panning.clientX) / rect.width) * panning.viewBox.width;
      const dy = ((event.clientY - panning.clientY) / rect.height) * panning.viewBox.height;
      setViewBox({ ...panning.viewBox, x: panning.viewBox.x - dx, y: panning.viewBox.y - dy });
      return;
    }
    if (transformDrag && svgRef.current) {
      const point = screenToSvgPoint(svgRef.current, event.clientX, event.clientY);
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
          const nextScaleX = clampScale((Math.abs(local.x) * 2) / node.size.width);
          const nextScaleY = clampScale((Math.abs(local.y) * 2) / node.size.height);
          if (transformDrag.kind === "scale-x") {
            return { ...node, scale: nextScaleX, scaleX: nextScaleX };
          }
          if (transformDrag.kind === "scale-y") {
            return { ...node, scale: nextScaleY, scaleY: nextScaleY };
          }
          const nextScale = clampScale(Math.max(nextScaleX, nextScaleY));
          return { ...node, scale: nextScale, scaleX: nextScale, scaleY: nextScale };
        })
      );
      return;
    }
    if (!dragging || !svgRef.current) {
      return;
    }
    const point = screenToSvgPoint(svgRef.current, event.clientX, event.clientY);
    if (!dragging.historyCaptured) {
      pushUndoSnapshot();
      setDragging({ ...dragging, historyCaptured: true });
    }
    const dx = point.x - dragging.startPoint.x;
    const dy = point.y - dragging.startPoint.y;
    const dragNodeIds = new Set(dragging.nodeIds);
    const draggedBusIds = new Set(nodes.filter((node) => dragNodeIds.has(node.id) && isBusNode(node)).map((node) => node.id));
    setNodes((current) =>
      current.map((node) => {
        const originalPosition = dragging.originalPositions[node.id];
        return dragNodeIds.has(node.id) && originalPosition
          ? { ...node, position: { x: originalPosition.x + dx, y: originalPosition.y + dy } }
          : node;
      })
    );
    if (draggedBusIds.size > 0) {
      setEdges((current) =>
        current.map((edge) => {
          const originalPoints = dragging.originalEdgePoints[edge.id];
          return {
            ...edge,
            sourcePoint: draggedBusIds.has(edge.sourceId) && originalPoints?.sourcePoint
              ? { x: originalPoints.sourcePoint.x + dx, y: originalPoints.sourcePoint.y + dy }
              : edge.sourcePoint,
            targetPoint: draggedBusIds.has(edge.targetId) && originalPoints?.targetPoint
              ? { x: originalPoints.targetPoint.x + dx, y: originalPoints.targetPoint.y + dy }
              : edge.targetPoint
          };
        })
      );
    }
  };

  const handleWheel = (event: React.WheelEvent<SVGSVGElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (!svgRef.current) {
      return;
    }
    const pointer = screenToSvgPoint(svgRef.current, event.clientX, event.clientY);
    const zoomFactor = event.deltaY > 0 ? 1.12 : 0.88;
    const nextWidth = Math.max(240, Math.min(CANVAS_WIDTH * 3, viewBox.width * zoomFactor));
    const nextHeight = Math.max(160, Math.min(CANVAS_HEIGHT * 3, viewBox.height * zoomFactor));
    const ratioX = (pointer.x - viewBox.x) / viewBox.width;
    const ratioY = (pointer.y - viewBox.y) / viewBox.height;
    setViewBox({
      x: pointer.x - ratioX * nextWidth,
      y: pointer.y - ratioY * nextHeight,
      width: nextWidth,
      height: nextHeight
    });
  };

  const deleteSelected = () => {
    deleteSelection();
  };

  const runContextMenuAction = (action: () => void) => {
    action();
    setContextMenu(null);
    setProjectMenu(null);
  };

  const alignSelected = (direction: "horizontal" | "vertical") => {
    if (selectedNodeIds.length < 2) {
      return;
    }
    pushUndoSnapshot();
    const aligned = alignNodes(nodes, selectedNodeIds, direction);
    const previousById = new Map(nodes.map((node) => [node.id, node]));
    const deltas = Object.fromEntries(
      aligned
        .filter((node) => selectedNodeIds.includes(node.id))
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
    moveAttachedBusPoints(deltas);
    setNodes(aligned);
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

  const cloneProjectRecord = (project: SavedProjectRecord, suffix = "副本") =>
    createSavedProject(`${project.name} ${suffix}`, project.project);

  const cloneSchemeRecord = (scheme: SavedSchemeRecord, existingSchemes = schemes, suffix = "副本"): SavedSchemeRecord => {
    const schemeName = uniqueRecordName(
      `${scheme.name} ${suffix}`,
      existingSchemes.map((item) => item.name),
      "未命名方案"
    );
    const projects = scheme.projects.reduce<SavedProjectRecord[]>(
      (current, project) => upsertSavedProject(current, cloneProjectRecord(project)),
      []
    );
    return createSavedScheme(schemeName, projects);
  };

  const loadSavedProject = (project: SavedProjectRecord, schemeId = findSchemeForProject(project.id)?.id ?? "") => {
    pushUndoSnapshot();
    setProjectName(project.name);
    setNodes(project.project.nodes);
    setEdges(project.project.edges);
    setActiveProjectId(project.id);
    setActiveSchemeId(schemeId);
    selectSingleProject(schemeId, project.id);
    setSelectedNodeIds(project.project.nodes[0] ? [project.project.nodes[0].id] : []);
    setSelectedEdgeId("");
    setConnectSource(null);
    setRewiring(null);
  };

  const createSchemeRecord = () => {
    const record = createSavedScheme(
      uniqueRecordName("新建方案", schemes.map((scheme) => scheme.name), "未命名方案")
    );
    setSchemes((current) => [...current, record]);
    selectSingleScheme(record.id);
  };

  const renameSchemeRecord = (scheme: SavedSchemeRecord) => {
    const nextName = window.prompt("请输入新的方案名称", scheme.name);
    if (!nextName) {
      return;
    }
    setSchemes((current) => renameSavedScheme(current, scheme.id, nextName));
  };

  const duplicateSchemeRecord = (scheme: SavedSchemeRecord) => {
    setSchemes((current) => [...current, cloneSchemeRecord(scheme, current)]);
  };

  const deleteSchemeRecord = (scheme: SavedSchemeRecord) => {
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
    if (activeSchemeId === scheme.id) {
      setActiveSchemeId("");
      setActiveProjectId("");
    }
  };

  const copySelectedRecord = () => {
    const projectId = selectedProjectIds[0] ?? selectedProjectId;
    if (projectId) {
      const project = projects.find((item) => item.id === projectId);
      if (project) {
        setRecordClipboard({ kind: "project", project });
      }
      return;
    }
    const schemeId = selectedSchemeIds[0] ?? selectedSchemeId;
    if (schemeId) {
      const scheme = schemes.find((item) => item.id === schemeId);
      if (scheme) {
        setRecordClipboard({ kind: "scheme", scheme });
      }
    }
  };

  const deleteSelectedRecords = () => {
    if (selectedProjectIds.length > 0) {
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
      if (selected.has(activeProjectId)) {
        setActiveProjectId("");
      }
      return;
    }
    if (selectedSchemeIds.length > 0) {
      if (!window.confirm(`删除选中的 ${selectedSchemeIds.length} 个方案及其全部模型？`)) {
        return;
      }
      const selected = new Set(selectedSchemeIds);
      setSchemes((current) => {
        const next = current.filter((scheme) => !selected.has(scheme.id));
        return next.length > 0 ? next : [createSavedScheme("默认方案")];
      });
      clearRecordSelection();
      if (selected.has(activeSchemeId)) {
        setActiveSchemeId("");
        setActiveProjectId("");
      }
    }
  };

  const pasteSelectedRecord = () => {
    if (!recordClipboard) {
      return;
    }
    if (recordClipboard.kind === "scheme") {
      setSchemes((current) => [...current, cloneSchemeRecord(recordClipboard.scheme, current)]);
      return;
    }
    const targetSchemeId = selectedSchemeId || activeSchemeId || schemes[0]?.id;
    setSchemes((current) =>
      current.map((scheme, index) =>
        scheme.id === targetSchemeId || (!targetSchemeId && index === 0)
          ? {
              ...scheme,
              updatedAt: new Date().toISOString(),
              projects: upsertSavedProject(scheme.projects, cloneProjectRecord(recordClipboard.project))
            }
          : scheme
      )
    );
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

  const saveCurrentProject = (targetId = activeProjectId) => {
    if (targetId) {
      const existing = projects.find((project) => project.id === targetId);
      if (existing) {
        const record: SavedProjectRecord = {
          ...existing,
          name: projectName,
          project: currentProject()
        };
        updateProjectInSchemes(targetId, () => ({ ...record, updatedAt: new Date().toISOString() }));
        setActiveProjectId(targetId);
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
  };

  const renameProjectRecord = (project: SavedProjectRecord) => {
    const nextName = window.prompt("请输入新的模型名称", project.name);
    if (!nextName) {
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
    setSchemes((current) =>
      current.map((scheme) =>
        scheme.projects.some((item) => item.id === project.id)
          ? { ...scheme, updatedAt: new Date().toISOString(), projects: duplicateSavedProject(scheme.projects, project.id) }
          : scheme
      )
    );
  };

  const deleteProjectRecord = (project: SavedProjectRecord) => {
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
    if (activeProjectId === project.id) {
      setActiveProjectId("");
    }
  };

  const createBlankProject = () => {
    const targetSchemeId = selectedSchemeId || activeSchemeId || schemes[0]?.id;
    const targetScheme = schemes.find((scheme) => scheme.id === targetSchemeId) ?? schemes[0];
    const name = uniqueRecordName("新建模型", targetScheme?.projects.map((project) => project.name) ?? [], "未命名模型");
    const record = createSavedProject(name, { version: 1, name, nodes: [], edges: [] });
    setSchemes((current) =>
      current.map((scheme, index) =>
        scheme.id === targetSchemeId || (!targetSchemeId && index === 0)
          ? { ...scheme, updatedAt: new Date().toISOString(), projects: upsertSavedProject(scheme.projects, record) }
          : scheme
      )
    );
    selectSingleProject(targetSchemeId ?? schemes[0]?.id ?? "", record.id);
    loadSavedProject(record, targetSchemeId ?? schemes[0]?.id ?? "");
  };

  const locateTopologyError = (error: TopologyValidationError) => {
    const firstNodeId = error.relatedNodeIds[0] ?? error.nodeId;
    const node = firstNodeId ? nodeById.get(firstNodeId) : undefined;
    setSelectedNodeIds(firstNodeId ? [firstNodeId] : []);
    setSelectedEdgeId(error.edgeId ?? "");
    if (node) {
      setViewBox({
        x: node.position.x - viewBox.width / 2,
        y: node.position.y - viewBox.height / 2,
        width: viewBox.width,
        height: viewBox.height
      });
    }
  };

  const runTopologyCalculation = () => {
    const errors = validateTopology(nodes, edges);
    setTopologyErrors(errors);
    if (errors.length === 0) {
      pushUndoSnapshot();
      setNodes((current) => calculateElectricalTopology(current, edges));
    } else {
      locateTopologyError(errors[0]);
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

  const handleTerminalPointerDown = (
    event: PointerEvent<SVGCircleElement>,
    node: ModelNode,
    terminalId: string
  ) => {
    event.stopPropagation();
    setSelectedNodeIds([node.id]);
    setSelectedEdgeId("");
    const busPoint = busAnchorFromEvent(node, event);
    if (rewiring) {
      const edge = edges.find((item) => item.id === rewiring.edgeId);
      const otherNode = edge ? nodeById.get(rewiring.endpoint === "source" ? edge.targetId : edge.sourceId) : undefined;
      const otherTerminalId = rewiring.endpoint === "source" ? edge?.targetTerminalId : edge?.sourceTerminalId;
      if (edge && otherNode && otherTerminalId && canConnectTerminals(node, terminalId, otherNode, otherTerminalId)) {
        pushUndoSnapshot();
        setEdges((current) =>
          current.map((item) =>
            item.id === edge.id
              ? rewiring.endpoint === "source"
                ? { ...item, sourceId: node.id, sourceTerminalId: terminalId, sourcePoint: busPoint }
                : { ...item, targetId: node.id, targetTerminalId: terminalId, targetPoint: busPoint }
              : item
          )
        );
      }
      setRewiring(null);
      return;
    }
    if (mode !== "connect") {
      return;
    }
    if (!connectSource) {
      setConnectSource({ nodeId: node.id, terminalId, point: busPoint });
      return;
    }
    const sourceNode = nodeById.get(connectSource.nodeId);
    if (!sourceNode || !canConnectTerminals(sourceNode, connectSource.terminalId, node, terminalId)) {
      setConnectSource(null);
      return;
    }
    const newEdge: Edge = {
      id: `edge-${Date.now()}`,
      sourceId: sourceNode.id,
      targetId: node.id,
      sourceTerminalId: connectSource.terminalId,
      sourcePoint: connectSource.point,
      targetTerminalId: terminalId,
      targetPoint: busPoint
    };
    pushUndoSnapshot();
    setEdges((current) => [
      ...current,
      newEdge
    ]);
    setSelectedEdgeId(newEdge.id);
    setConnectSource(null);
  };

  const exportModel = () => {
    downloadText(
      "power-system-model.json",
      serializeProject(currentProject()),
      "application/json"
    );
  };

  const exportSvg = () => {
    downloadText("power-system-diagram.svg", buildSvgDocument(nodes, edges), "image/svg+xml");
  };

  const safeFilePart = (name: string) => name.trim().replace(/[\\/:*?"<>|]+/g, "_") || "未命名";

  const buildDeviceParameterFile = (project: ProjectFile) =>
    JSON.stringify(
      {
        version: 1,
        name: project.name,
        devices: project.nodes.map((node) => ({
          id: node.id,
          kind: node.kind,
          name: node.name,
          nodeNumber: node.nodeNumber,
          acTopologyNode: node.acTopologyNode,
          dcTopologyNode: node.dcTopologyNode,
          terminals: node.terminals,
          params: node.params
        })),
        edges: project.edges
      },
      null,
      2
    );

  const exportSchemeRecord = (scheme: SavedSchemeRecord) => {
    for (const project of scheme.projects) {
      const prefix = `${safeFilePart(scheme.name)}_${safeFilePart(project.name)}`;
      downloadText(`${prefix}.svg`, buildSvgDocument(project.project.nodes, project.project.edges), "image/svg+xml");
      downloadText(`${prefix}.e`, buildDeviceParameterFile(project.project), "application/json");
    }
  };

  const importModel = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    const text = await file.text();
    const project = deserializeProject(text);
    pushUndoSnapshot();
    setProjectName(project.name);
    setNodes(project.nodes);
    setEdges(project.edges);
    setSelectedNodeIds(project.nodes[0] ? [project.nodes[0].id] : []);
    setSelectedEdgeId("");
    event.target.value = "";
  };

  const renderProjectPanel = () => (
    <section className="project-panel" style={{ height: projectPanelHeight }}>
      <div className="project-panel-title">
        <h2>方案 / 模型</h2>
      </div>
      <div className="project-list listbox" role="listbox" aria-label="绘图模型列表">
        {schemes.length === 0 ? (
          <p className="project-empty">暂无方案</p>
        ) : (
          schemes.map((scheme) => {
            const isExpanded = expandedSchemeIds.includes(scheme.id);
            const isSchemeSelected = selectedSchemeIds.includes(scheme.id) || (scheme.id === selectedSchemeId && !selectedProjectId);
            return (
            <div className="scheme-group" key={scheme.id}>
              <div
                role="option"
                aria-selected={isSchemeSelected}
                aria-expanded={isExpanded}
                tabIndex={0}
                className={`scheme-option ${isSchemeSelected ? "selected" : ""} ${scheme.id === activeSchemeId ? "active" : ""}`}
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
                      onDoubleClick={() => loadSavedProject(project, scheme.id)}
                      onDragStart={(event) => {
                        event.dataTransfer.setData("application/project-id", project.id);
                      }}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          loadSavedProject(project, scheme.id);
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

  const resizeProjectPanelByKeyboard = (delta: number) => {
    setProjectPanelHeight((height) => Math.min(PROJECT_PANEL_MAX_HEIGHT, Math.max(PROJECT_PANEL_MIN_HEIGHT, height + delta)));
  };

  return (
    <div className="app-shell">
      <aside className="library-panel">
        <div className="brand">
          <div className="brand-mark">PS</div>
          <div>
            <h1>电力系统图上建模平台</h1>
            <p>拖拽建模、拓扑关联、参数维护</p>
          </div>
        </div>
        <div className="tool-switch">
          <button className={mode === "select" ? "active" : ""} onClick={() => setMode("select")} title="选择/拖拽">
            <MousePointer2 size={17} />
            选择
          </button>
          <button className={mode === "connect" ? "active" : ""} onClick={() => setMode("connect")} title="联络线">
            <Cable size={17} />
            联络线
          </button>
        </div>
        {renderProjectPanel()}
        <div
          className={`library-splitter ${projectPanelResize ? "dragging" : ""}`}
          role="separator"
          aria-label="调整绘图模型和元件库高度"
          aria-orientation="horizontal"
          aria-valuemin={PROJECT_PANEL_MIN_HEIGHT}
          aria-valuemax={PROJECT_PANEL_MAX_HEIGHT}
          aria-valuenow={projectPanelHeight}
          tabIndex={0}
          onPointerDown={(event) => {
            event.preventDefault();
            setProjectPanelResize({ startY: event.clientY, startHeight: projectPanelHeight });
          }}
          onKeyDown={(event) => {
            if (event.key === "ArrowUp") {
              event.preventDefault();
              resizeProjectPanelByKeyboard(event.shiftKey ? -40 : -12);
            } else if (event.key === "ArrowDown") {
              event.preventDefault();
              resizeProjectPanelByKeyboard(event.shiftKey ? 40 : 12);
            }
          }}
        >
          <span />
        </div>
        <div className="library-scroll">
          {Object.entries(groupedLibrary).map(([group, items]) => (
            <section className="library-group" key={group}>
              <h2>{group}</h2>
              {items.map((item) => {
                const preview = createDefaultNode(item.kind, { x: 0, y: 0 });
                return (
                  <button
                    className="library-item"
                    draggable
                    title={item.label}
                    key={item.kind}
                    onDragStart={(event) => event.dataTransfer.setData("application/device-kind", item.kind)}
                  >
                    <svg viewBox="-40 -28 80 56" aria-hidden="true">
                      <DeviceGlyph node={preview} miniature />
                    </svg>
                  </button>
                );
              })}
            </section>
          ))}
        </div>
      </aside>

      <main className="workspace">
        <header className="topbar">
          <div className="status-cluster">
            <span>
              <Grid2X2 size={16} />
              元件 {nodes.length}
            </span>
            <span>联络线 {edges.length}</span>
            <span>拓扑岛 {topology.connectedComponents.length}</span>
            <span>选中 {selectedCount}</span>
            {mode === "connect" && <strong>{connectSource ? "选择同类型目标端子" : "选择起点端子"}</strong>}
          </div>
          <div className="action-cluster">
            <button onClick={() => alignSelected("horizontal")} disabled={selectedCount < 2} title="横向对齐">
              <AlignCenterHorizontal size={16} />
              横向对齐
            </button>
            <button onClick={() => alignSelected("vertical")} disabled={selectedCount < 2} title="纵向对齐">
              <AlignCenterVertical size={16} />
              纵向对齐
            </button>
            <button onClick={() => saveCurrentProject()} title="保存当前模型">
              <Save size={16} />
              保存
            </button>
            <button onClick={runTopologyCalculation} title="图上拓扑">
              <Grid2X2 size={16} />
              图上拓扑
            </button>
            <input ref={importRef} type="file" accept="application/json,.json" hidden onChange={importModel} />
            <button onClick={() => importRef.current?.click()}>
              <FileInput size={16} />
              导入模型
            </button>
            <button onClick={exportModel}>
              <FileJson size={16} />
              保存文件
            </button>
            <button onClick={exportSvg}>
              <Download size={16} />
              保存SVG
            </button>
          </div>
        </header>

        <section className="canvas-frame">
          <svg
            ref={svgRef}
            className="diagram-canvas"
            viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`}
            onDrop={handleDrop}
            onDragOver={(event) => event.preventDefault()}
            onWheel={handleWheel}
            onPointerMove={handlePointerMove}
            onPointerEnter={() => {
              canvasInteractionRef.current = true;
            }}
            onPointerUp={(event) => {
              finishRewiring(event);
              finishMarqueeSelection();
              setDragging(null);
              setTransformDrag(null);
              setPanning(null);
            }}
            onPointerLeave={() => {
              canvasInteractionRef.current = false;
              setDragging(null);
              setTransformDrag(null);
              setPanning(null);
              setMarquee(null);
              setRewiring(null);
            }}
            onPointerCancel={() => {
              setDragging(null);
              setTransformDrag(null);
              setPanning(null);
              setMarquee(null);
              setRewiring(null);
            }}
            onLostPointerCapture={() => {
              setDragging(null);
              setTransformDrag(null);
            }}
            onPointerDown={(event) => {
              if (event.button !== 0) {
                return;
              }
              canvasInteractionRef.current = true;
              setSelectedNodeIds([]);
              setSelectedEdgeId("");
              setConnectSource(null);
              setRewiring(null);
              if (event.ctrlKey) {
                setPanning({ clientX: event.clientX, clientY: event.clientY, viewBox });
              } else {
                const point = screenToSvgPoint(event.currentTarget, event.clientX, event.clientY);
                setMarquee({ start: point, current: point });
              }
            }}
            onContextMenu={(event) => {
              event.preventDefault();
              setContextMenu({ x: event.clientX, y: event.clientY });
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
            <rect width={CANVAS_WIDTH} height={CANVAS_HEIGHT} fill="#f8fafc" />
            <rect width={CANVAS_WIDTH} height={CANVAS_HEIGHT} fill="url(#large-grid)" />
            {marquee && (
              <rect
                className="marquee-box"
                x={Math.min(marquee.start.x, marquee.current.x)}
                y={Math.min(marquee.start.y, marquee.current.y)}
                width={Math.abs(marquee.current.x - marquee.start.x)}
                height={Math.abs(marquee.current.y - marquee.start.y)}
              />
            )}
            {renderedRoutedEdges.map((route) => {
              const edge = edges.find((item) => item.id === route.edgeId);
              if (!edge) return null;
              const selected = edge.id === selectedEdgeId;
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
                <g key={edge.id} className={`connection-group ${selected ? "selected" : ""}`}>
                  <path
                    d={route.path}
                    className="connection-hitline"
                    onPointerDown={(event) => {
                      event.stopPropagation();
                      setSelectedNodeIds([]);
                      setSelectedEdgeId(edge.id);
                    }}
                  />
                  <path
                    d={route.path}
                    className="connection-line"
                    onPointerDown={(event) => {
                      event.stopPropagation();
                      setSelectedNodeIds([]);
                      setSelectedEdgeId(edge.id);
                    }}
                  />
                  {sourceBusDotPoint && (
                    <circle
                      className="bus-connection-dot"
                      cx={sourceBusDotPoint.x}
                      cy={sourceBusDotPoint.y}
                      r={7}
                      fill={busEndpointColor((rewiringSource ? rewireTarget?.node : sourceNode) ?? sourceNode!)}
                      onPointerDown={(event) => {
                        event.stopPropagation();
                        if (event.button !== 0 || !svgRef.current) {
                          return;
                        }
                        setSelectedNodeIds([]);
                        setSelectedEdgeId(edge.id);
                        setRewiring({
                          edgeId: edge.id,
                          endpoint: "source",
                          previewPoint: screenToSvgPoint(svgRef.current, event.clientX, event.clientY),
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
                      fill={busEndpointColor((rewiringTarget ? rewireTarget?.node : targetNode) ?? targetNode!)}
                      onPointerDown={(event) => {
                        event.stopPropagation();
                        if (event.button !== 0 || !svgRef.current) {
                          return;
                        }
                        setSelectedNodeIds([]);
                        setSelectedEdgeId(edge.id);
                        setRewiring({
                          edgeId: edge.id,
                          endpoint: "target",
                          previewPoint: screenToSvgPoint(svgRef.current, event.clientX, event.clientY),
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
                          previewPoint: screenToSvgPoint(svgRef.current, event.clientX, event.clientY),
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
                          previewPoint: screenToSvgPoint(svgRef.current, event.clientX, event.clientY),
                          pointerId: event.pointerId
                        });
                        event.currentTarget.setPointerCapture(event.pointerId);
                      }}
                    />
                  )}
                </g>
              );
            })}
            {nodes.map((node) => {
              const selected = selectedNodeIds.includes(node.id);
              const isConnectSource = node.id === connectSource?.nodeId;
              return (
                <g
                  key={node.id}
                  className={`diagram-node ${isBusNode(node) ? "bus-node" : ""} ${selected ? "selected" : ""} ${isConnectSource ? "connect-source" : ""}`}
                  transform={`translate(${node.position.x} ${node.position.y}) rotate(${node.rotation}) scale(${getNodeScaleX(node)} ${getNodeScaleY(node)})`}
                  onPointerDown={(event) => handleNodePointerDown(event, node)}
                >
                  <title>{node.name}</title>
                  <rect
                    x={-node.size.width / 2}
                    y={-node.size.height / 2}
                    width={node.size.width}
                    height={node.size.height}
                    rx="8"
                    className={`node-hitbox ${isBusNode(node) ? "bus-hitbox" : ""}`}
                  />
                  <DeviceGlyph node={node} />
                  {node.terminals.map((terminal) => {
                    const sourceNode = connectSource ? nodeById.get(connectSource.nodeId) : undefined;
                    const hideFixedTerminal = isBusNode(node);
                    const disabled =
                      !hideFixedTerminal &&
                      mode === "connect" &&
                      Boolean(sourceNode) &&
                      !canConnectTerminals(sourceNode!, connectSource!.terminalId, node, terminal.id);
                    return hideFixedTerminal ? null : (
                      <circle
                        key={terminal.id}
                        className={`terminal-dot ${terminal.type} ${disabled ? "disabled" : ""}`}
                        cx={terminal.anchor.x * node.size.width}
                        cy={terminal.anchor.y * node.size.height}
                        r={6}
                        onPointerDown={(event) => handleTerminalPointerDown(event, node, terminal.id)}
                      >
                        <title>{`${terminal.label} / ${terminal.type.toUpperCase()}`}</title>
                      </circle>
                    );
                  })}
                  {selected && selectedCount === 1 && (
                    <g className="transform-handles">
                      <line x1="0" y1={-node.size.height / 2 - 12} x2="0" y2={-node.size.height / 2 - 36} />
                      <circle
                        className="rotate-handle"
                        cx="0"
                        cy={-node.size.height / 2 - 42}
                        r="8"
                        onPointerDown={(event) => {
                          event.stopPropagation();
                          setTransformDrag({ kind: "rotate", nodeId: node.id });
                        }}
                      />
                      <rect
                        className="scale-handle horizontal"
                        x={node.size.width / 2 + 6}
                        y="-8"
                        width="16"
                        height="16"
                        rx="3"
                        onPointerDown={(event) => {
                          event.stopPropagation();
                          setTransformDrag({ kind: "scale-x", nodeId: node.id });
                        }}
                      />
                      <rect
                        className="scale-handle vertical"
                        x="-8"
                        y={node.size.height / 2 + 6}
                        width="16"
                        height="16"
                        rx="3"
                        onPointerDown={(event) => {
                          event.stopPropagation();
                          setTransformDrag({ kind: "scale-y", nodeId: node.id });
                        }}
                      />
                      <rect
                        className="scale-handle proportional"
                        x={node.size.width / 2 + 6}
                        y={node.size.height / 2 + 6}
                        width="16"
                        height="16"
                        rx="3"
                        onPointerDown={(event) => {
                          event.stopPropagation();
                          setTransformDrag({ kind: "scale-both", nodeId: node.id });
                        }}
                      />
                    </g>
                  )}
                </g>
              );
            })}
          </svg>
        </section>
      </main>

      <aside className="inspector-panel">
        <div className="inspector-title">
          <div>
            <h2>参数面板</h2>
            <p>
              {selectedNode
                ? "修改后自动更新模型文件"
                : selectedEdge
                  ? "可删除联络线或拖拽端点重接"
                  : selectedProjectRecord
                    ? "查看当前模型信息"
                    : "选择画布元件查看参数"}
            </p>
          </div>
          <button onClick={deleteSelected} disabled={!selectedNode && !selectedEdge} title="删除选中对象">
            <Trash2 size={17} />
          </button>
        </div>
        {selectedNode || selectedProjectRecord ? (
          <div className="form-stack">
            <div className="inspector-tabs">
              <button className={inspectorTab === "model" ? "active" : ""} onClick={() => setInspectorTab("model")} disabled={!selectedProjectRecord}>
                模型信息
              </button>
              <button className={inspectorTab === "graph" ? "active" : ""} onClick={() => setInspectorTab("graph")}>
                图形参数
              </button>
              <button className={inspectorTab === "device" ? "active" : ""} onClick={() => setInspectorTab("device")}>
                设备参数
              </button>
            </div>
            {inspectorTab === "model" && selectedProjectRecord ? (
              <table className="param-table">
                <tbody>
                  <tr>
                    <th>模型名称</th>
                    <td><input value={selectedProjectRecord.name} readOnly /></td>
                  </tr>
                  <tr>
                    <th>所属方案</th>
                    <td><input value={selectedSchemeRecord?.name ?? "未选择方案"} readOnly /></td>
                  </tr>
                  <tr>
                    <th>模型更新时间</th>
                    <td><input value={new Date(selectedProjectRecord.updatedAt).toLocaleString()} readOnly /></td>
                  </tr>
                  <tr>
                    <th>设备数量</th>
                    <td><input value={selectedProjectRecord.project.nodes.length} readOnly /></td>
                  </tr>
                  <tr>
                    <th>联络线数量</th>
                    <td><input value={selectedProjectRecord.project.edges.length} readOnly /></td>
                  </tr>
                  <tr>
                    <th>SVG文件</th>
                    <td><input value={`${safeFilePart(selectedProjectRecord.name)}.svg`} readOnly /></td>
                  </tr>
                  <tr>
                    <th>设备参数文件</th>
                    <td><input value={`${safeFilePart(selectedProjectRecord.name)}.e`} readOnly /></td>
                  </tr>
                </tbody>
              </table>
            ) : inspectorTab === "graph" && selectedNode ? (
              <table className="param-table">
                <tbody>
                  <tr>
                    <th>元件名称</th>
                    <td>
                      <input value={selectedNode.name} onChange={(event) => updateSelectedNode({ name: event.target.value })} />
                    </td>
                  </tr>
                  <tr>
                    <th>节点号</th>
                    <td><input value={selectedNode.nodeNumber} readOnly /></td>
                  </tr>
                  <tr>
                    <th>交流拓扑节点序号</th>
                    <td><input value={selectedNode.acTopologyNode ?? 0} readOnly /></td>
                  </tr>
                  <tr>
                    <th>直流拓扑节点序号</th>
                    <td><input value={selectedNode.dcTopologyNode ?? 0} readOnly /></td>
                  </tr>
                  <tr>
                    <th>X坐标</th>
                    <td><input type="number" value={Math.round(selectedNode.position.x)} onChange={(event) => updateSelectedNode({ position: { ...selectedNode.position, x: Number(event.target.value) } })} /></td>
                  </tr>
                  <tr>
                    <th>Y坐标</th>
                    <td><input type="number" value={Math.round(selectedNode.position.y)} onChange={(event) => updateSelectedNode({ position: { ...selectedNode.position, y: Number(event.target.value) } })} /></td>
                  </tr>
                  <tr>
                    <th>旋转角度</th>
                    <td><input type="number" value={selectedNode.rotation} onChange={(event) => updateSelectedNode({ rotation: Number(event.target.value) })} /></td>
                  </tr>
                  <tr>
                    <th>横向倍率</th>
                    <td><input type="number" min="0.2" max="5" step="0.1" value={getNodeScaleX(selectedNode)} onChange={(event) => { const scaleX = clampScale(Number(event.target.value)); updateSelectedNode({ scale: scaleX, scaleX }); }} /></td>
                  </tr>
                  <tr>
                    <th>纵向倍率</th>
                    <td><input type="number" min="0.2" max="5" step="0.1" value={getNodeScaleY(selectedNode)} onChange={(event) => { const scaleY = clampScale(Number(event.target.value)); updateSelectedNode({ scale: scaleY, scaleY }); }} /></td>
                  </tr>
                  <tr>
                    <th>端子数量</th>
                    <td><input type="number" min="1" max="8" value={selectedNode.terminals.length} onChange={(event) => updateTerminalCount(Number(event.target.value))} /></td>
                  </tr>
                  {selectedNode.terminals.map((terminal) => (
                    <tr key={terminal.id}>
                      <th>{terminal.label}</th>
                      <td>{`${terminal.type.toUpperCase()} / ${terminal.nodeNumber}`}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : selectedNode ? (
              <table className="param-table">
                <tbody>
                  {Object.entries(selectedNode.params).map(([key, value]) => (
                    <tr key={key}>
                      <th>{PARAM_LABELS[key] ?? key}</th>
                      <td>{renderParamEditor(key, value, false)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="empty-state">
                <FileJson size={28} />
                <p>选择画布设备后，可切换查看图形参数和设备参数。</p>
              </div>
            )}
            {selectedNode && (
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
            <h2>拓扑错误</h2>
            {topologyErrors.map((error) => (
              <button key={error.id} onClick={() => locateTopologyError(error)}>
                <strong>{error.type}</strong>
                <span>{error.message}</span>
              </button>
            ))}
          </section>
        )}
      </aside>
      {contextMenu && (
        <div className="context-menu" style={{ left: contextMenu.x, top: contextMenu.y }}>
          <button onClick={() => runContextMenuAction(undoLastOperation)} disabled={undoStack.length === 0}>
            <Undo2 size={14} />
            撤销
          </button>
          <button onClick={() => runContextMenuAction(copySelection)} disabled={selectedNodeIds.length === 0}>
            <Copy size={14} />
            复制
          </button>
          <button onClick={() => runContextMenuAction(() => saveCurrentProject())}>
            <Save size={14} />
            保存
          </button>
          <button onClick={() => runContextMenuAction(pasteSelection)} disabled={clipboardNodes.length === 0}>
            <FileInput size={14} />
            粘贴
          </button>
          <button onClick={() => runContextMenuAction(() => moveSelection(24, 0))} disabled={selectedNodeIds.length === 0}>
            右移
          </button>
          <button onClick={() => runContextMenuAction(() => moveSelection(-24, 0))} disabled={selectedNodeIds.length === 0}>
            左移
          </button>
          <button onClick={() => runContextMenuAction(() => moveSelection(0, -24))} disabled={selectedNodeIds.length === 0}>
            上移
          </button>
          <button onClick={() => runContextMenuAction(() => moveSelection(0, 24))} disabled={selectedNodeIds.length === 0}>
            下移
          </button>
          <button onClick={() => runContextMenuAction(deleteSelection)} disabled={selectedNodeIds.length === 0 && !selectedEdgeId}>
            <Trash2 size={14} />
            删除
          </button>
        </div>
      )}
      {projectMenu && (
        <div className="context-menu" style={{ left: projectMenu.x, top: projectMenu.y }}>
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
              const project = projects.find((item) => item.id === projectMenu.projectId);
              const scheme = schemes.find((item) => item.id === projectMenu.schemeId);
              if (project) duplicateProjectRecord(project);
              else if (scheme) duplicateSchemeRecord(scheme);
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
              const project = projects.find((item) => item.id === projectMenu.projectId);
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
              const project = projects.find((item) => item.id === projectMenu.projectId);
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
    </div>
  );
}
