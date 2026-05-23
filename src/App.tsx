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
  FolderOpen,
  Pencil,
  MousePointer2,
  Save,
  Trash2
} from "lucide-react";
import {
  alignNodes,
  buildTopology,
  calculateElectricalTopology,
  canConnectTerminals,
  createTerminals,
  createSavedProject,
  createDefaultNode,
  deleteNodesWithConnectedEdges,
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
  validateTopology,
  type DeviceKind,
  type Edge,
  type ModelNode,
  type Point,
  type ProjectFile,
  type TopologyValidationError,
  routeEdgesForRendering,
  renameSavedProject,
  serializeProject,
  upsertSavedProject,
  type SavedProjectRecord
} from "./model";

type ToolMode = "select" | "connect";
type EdgeEndpoint = "source" | "target";
type TransformDrag =
  | { kind: "rotate"; nodeId: string }
  | { kind: "scale-x" | "scale-y" | "scale-both"; nodeId: string };
type Marquee = { start: Point; current: Point } | null;
type ContextMenuState = { x: number; y: number } | null;
type ProjectMenuState = { x: number; y: number; projectId?: string } | null;

const CANVAS_WIDTH = 1800;
const CANVAS_HEIGHT = 1200;
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
  { id: "seed-e1", sourceId: "seed-1", targetId: "seed-2" },
  { id: "seed-e2", sourceId: "seed-2", targetId: "seed-3" },
  { id: "seed-e3", sourceId: "seed-3", targetId: "seed-4" },
  { id: "seed-e4", sourceId: "seed-4", targetId: "seed-5" },
  { id: "seed-e5", sourceId: "seed-5", targetId: "seed-6" }
];

const PROJECT_STORAGE_KEY = "power-system-model-projects";
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
    return <rect x={-w / 2} y={-h / 2 + h / 3} width={w} height={h / 3} rx="2" fill={stroke} />;
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
    .map(
      (node) => `<g transform="translate(${node.position.x} ${node.position.y}) rotate(${node.rotation}) scale(${getNodeScaleX(node)} ${getNodeScaleY(node)})">
  <rect x="${-node.size.width / 2}" y="${-node.size.height / 2}" width="${node.size.width}" height="${node.size.height}" rx="8" fill="#ffffff" stroke="#94a3b8"/>
  <text x="0" y="${node.size.height / 2 + 20}" text-anchor="middle" font-size="14" font-family="Arial, sans-serif" fill="#0f172a">${node.name}</text>
</g>`
    )
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
  const [nodes, setNodes] = useState<ModelNode[]>(SAMPLE_NODES);
  const [edges, setEdges] = useState<Edge[]>(SAMPLE_EDGES);
  const [projectName, setProjectName] = useState("电力系统图上模型");
  const [projects, setProjects] = useState<SavedProjectRecord[]>(() => readSavedProjects());
  const [activeProjectId, setActiveProjectId] = useState<string>("");
  const [mode, setMode] = useState<ToolMode>("select");
  const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>(nodes[0] ? [nodes[0].id] : []);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string>("");
  const [connectSource, setConnectSource] = useState<{ nodeId: string; terminalId: string; point?: Point } | null>(null);
  const [dragging, setDragging] = useState<{ nodeId: string; offset: Point } | null>(null);
  const [rewiring, setRewiring] = useState<{ edgeId: string; endpoint: EdgeEndpoint } | null>(null);
  const [transformDrag, setTransformDrag] = useState<TransformDrag | null>(null);
  const [viewBox, setViewBox] = useState({ x: 0, y: 0, width: CANVAS_WIDTH, height: CANVAS_HEIGHT });
  const [panning, setPanning] = useState<{ clientX: number; clientY: number; viewBox: typeof viewBox } | null>(null);
  const [marquee, setMarquee] = useState<Marquee>(null);
  const [clipboardNodes, setClipboardNodes] = useState<ModelNode[]>([]);
  const [contextMenu, setContextMenu] = useState<ContextMenuState>(null);
  const [inspectorTab, setInspectorTab] = useState<"graph" | "device">("graph");
  const [topologyErrors, setTopologyErrors] = useState<TopologyValidationError[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [projectMenu, setProjectMenu] = useState<ProjectMenuState>(null);

  const selectedNodeId = selectedNodeIds[0] ?? "";
  const selectedNode = nodes.find((node) => node.id === selectedNodeId);
  const selectedEdge = edges.find((edge) => edge.id === selectedEdgeId);
  const selectedCount = selectedNodeIds.length;
  const topology = useMemo(() => buildTopology(nodes, edges), [nodes, edges]);
  const nodeById = useMemo(() => new Map(nodes.map((node) => [node.id, node])), [nodes]);
  const routedEdges = useMemo(() => routeEdgesForRendering(nodes, edges), [nodes, edges]);

  useEffect(() => {
    window.localStorage.setItem(PROJECT_STORAGE_KEY, JSON.stringify(projects));
  }, [projects]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && ["INPUT", "TEXTAREA"].includes(target.tagName)) {
        return;
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "c") {
        event.preventDefault();
        copySelection();
      } else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "v") {
        event.preventDefault();
        pasteSelection();
      } else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        saveCurrentProject();
      } else if (event.key === "Delete" || event.key === "Backspace") {
        event.preventDefault();
        if (selectedProjectId) {
          const project = projects.find((item) => item.id === selectedProjectId);
          if (project) deleteProjectRecord(project);
        } else {
          deleteSelection();
        }
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        moveSelection(event.shiftKey ? -24 : -6, 0);
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        moveSelection(event.shiftKey ? 24 : 6, 0);
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        moveSelection(0, event.shiftKey ? -24 : -6);
      } else if (event.key === "ArrowDown") {
        event.preventDefault();
        moveSelection(0, event.shiftKey ? 24 : 6);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [clipboardNodes, nodes, projects, selectedEdgeId, selectedNodeIds, selectedProjectId]);

  const currentProject = (): ProjectFile => ({
    version: 1,
    name: projectName,
    nodes,
    edges
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
      setEdges((current) => current.filter((edge) => edge.id !== selectedEdgeId));
      setSelectedEdgeId("");
      return;
    }
    if (selectedNodeIds.length === 0) {
      return;
    }
    const result = deleteNodesWithConnectedEdges(nodes, edges, selectedNodeIds);
    setNodes(result.nodes);
    setEdges(result.edges);
    setSelectedNodeIds([]);
  };

  const moveSelection = (dx: number, dy: number) => {
    if (selectedNodeIds.length === 0) {
      return;
    }
    const selected = new Set(selectedNodeIds);
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
    setNodes((current) => current.map((node) => (node.id === selectedNodeId ? { ...node, ...patch } : node)));
  };

  const updateParam = (key: string, value: string) => {
    if (!selectedNodeId) {
      return;
    }
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
    const halfWidth = (node.size.width * getNodeScaleX(node)) / 2;
    const clampedX = Math.max(node.position.x - halfWidth, Math.min(node.position.x + halfWidth, point.x));
    return { x: Math.round(clampedX), y: node.position.y };
  };

  const updateTerminalCount = (count: number) => {
    if (!selectedNode) {
      return;
    }
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
    setNodes((current) => [...current, node]);
    setSelectedNodeIds([node.id]);
    setSelectedEdgeId("");
  };

  const handleNodePointerDown = (event: PointerEvent<SVGGElement>, node: ModelNode) => {
    event.stopPropagation();
    setSelectedEdgeId("");
    if (event.ctrlKey || event.shiftKey || event.metaKey) {
      setSelectedNodeIds((current) =>
        current.includes(node.id) ? current.filter((id) => id !== node.id) : [...current, node.id]
      );
    } else if (!selectedNodeIds.includes(node.id)) {
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
    setDragging({ nodeId: node.id, offset: { x: point.x - node.position.x, y: point.y - node.position.y } });
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: PointerEvent<SVGSVGElement>) => {
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
    setNodes((current) =>
      current.map((node) =>
        node.id === dragging.nodeId
          ? { ...node, position: { x: point.x - dragging.offset.x, y: point.y - dragging.offset.y } }
          : node
      )
    );
  };

  const handleWheel = (event: React.WheelEvent<SVGSVGElement>) => {
    event.preventDefault();
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

  const alignSelected = (direction: "horizontal" | "vertical") => {
    setNodes((current) => alignNodes(current, selectedNodeIds, direction));
  };

  const loadSavedProject = (project: SavedProjectRecord) => {
    setProjectName(project.name);
    setNodes(project.project.nodes);
    setEdges(project.project.edges);
    setActiveProjectId(project.id);
    setSelectedNodeIds(project.project.nodes[0] ? [project.project.nodes[0].id] : []);
    setSelectedEdgeId("");
    setConnectSource(null);
    setRewiring(null);
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
        setProjects((current) => upsertSavedProject(current, record));
        setActiveProjectId(targetId);
        return;
      }
    }
    const record = createSavedProject(projectName, currentProject());
    setProjects((current) => upsertSavedProject(current, record));
    setActiveProjectId(record.id);
  };

  const renameProjectRecord = (project: SavedProjectRecord) => {
    const nextName = window.prompt("请输入新的模型名称", project.name);
    if (!nextName) {
      return;
    }
    setProjects((current) => renameSavedProject(current, project.id, nextName));
    if (activeProjectId === project.id) {
      setProjectName(nextName.trim() || "未命名模型");
    }
  };

  const duplicateProjectRecord = (project: SavedProjectRecord) => {
    setProjects((current) => duplicateSavedProject(current, project.id));
  };

  const deleteProjectRecord = (project: SavedProjectRecord) => {
    if (!window.confirm(`删除模型“${project.name}”？`)) {
      return;
    }
    setProjects((current) => deleteSavedProject(current, project.id));
    if (selectedProjectId === project.id) {
      setSelectedProjectId("");
    }
    if (activeProjectId === project.id) {
      setActiveProjectId("");
    }
  };

  const createBlankProject = () => {
    const record = createSavedProject("新建模型", { version: 1, name: "新建模型", nodes: [], edges: [] });
    setProjects((current) => upsertSavedProject(current, record));
    setSelectedProjectId(record.id);
    loadSavedProject(record);
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
      setNodes((current) => calculateElectricalTopology(current, edges));
    } else {
      locateTopologyError(errors[0]);
    }
  };

  const getEdgeEndpointPoint = (edge: Edge, endpoint: EdgeEndpoint): Point | null => {
    const node = nodeById.get(endpoint === "source" ? edge.sourceId : edge.targetId);
    if (!node) {
      return null;
    }
    const terminalId = endpoint === "source" ? edge.sourceTerminalId : edge.targetTerminalId;
    const endpointPoint = endpoint === "source" ? edge.sourcePoint : edge.targetPoint;
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

  const importModel = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    const text = await file.text();
    const project = deserializeProject(text);
    setProjectName(project.name);
    setNodes(project.nodes);
    setEdges(project.edges);
    setSelectedNodeIds(project.nodes[0] ? [project.nodes[0].id] : []);
    setSelectedEdgeId("");
    event.target.value = "";
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
                    key={item.kind}
                    onDragStart={(event) => event.dataTransfer.setData("application/device-kind", item.kind)}
                  >
                    <svg viewBox="-40 -28 80 56" aria-hidden="true">
                      <DeviceGlyph node={preview} miniature />
                    </svg>
                    <span>{item.label}</span>
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
            onPointerUp={() => {
              finishMarqueeSelection();
              setDragging(null);
              setTransformDrag(null);
              setPanning(null);
            }}
            onPointerLeave={() => {
              setDragging(null);
              setTransformDrag(null);
              setPanning(null);
              setMarquee(null);
            }}
            onPointerCancel={() => {
              setDragging(null);
              setTransformDrag(null);
              setPanning(null);
              setMarquee(null);
            }}
            onLostPointerCapture={() => {
              setDragging(null);
              setTransformDrag(null);
            }}
            onPointerDown={(event) => {
              setSelectedNodeIds([]);
              setSelectedEdgeId("");
              setConnectSource(null);
              setRewiring(null);
              if (event.shiftKey) {
                const point = screenToSvgPoint(event.currentTarget, event.clientX, event.clientY);
                setMarquee({ start: point, current: point });
              } else {
                setPanning({ clientX: event.clientX, clientY: event.clientY, viewBox });
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
              <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#334155" />
              </marker>
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
            {routedEdges.map((route) => {
              const edge = edges.find((item) => item.id === route.edgeId);
              if (!edge) return null;
              const selected = edge.id === selectedEdgeId;
              const sourcePoint = getEdgeEndpointPoint(edge, "source");
              const targetPoint = getEdgeEndpointPoint(edge, "target");
              return (
                <g key={edge.id} className={`connection-group ${selected ? "selected" : ""}`}>
                  <path
                    d={route.path}
                    className="connection-line"
                    markerEnd="url(#arrow)"
                    onPointerDown={(event) => {
                      event.stopPropagation();
                      setSelectedNodeIds([]);
                      setSelectedEdgeId(edge.id);
                    }}
                  />
                  {selected && sourcePoint && (
                    <circle
                      className="edge-endpoint-handle"
                      cx={sourcePoint.x}
                      cy={sourcePoint.y}
                      r={8}
                      onPointerDown={(event) => {
                        event.stopPropagation();
                        setRewiring({ edgeId: edge.id, endpoint: "source" });
                      }}
                    />
                  )}
                  {selected && targetPoint && (
                    <circle
                      className="edge-endpoint-handle"
                      cx={targetPoint.x}
                      cy={targetPoint.y}
                      r={8}
                      onPointerDown={(event) => {
                        event.stopPropagation();
                        setRewiring({ edgeId: edge.id, endpoint: "target" });
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
                  className={`diagram-node ${selected ? "selected" : ""} ${isConnectSource ? "connect-source" : ""}`}
                  transform={`translate(${node.position.x} ${node.position.y}) rotate(${node.rotation}) scale(${getNodeScaleX(node)} ${getNodeScaleY(node)})`}
                  onPointerDown={(event) => handleNodePointerDown(event, node)}
                >
                  <rect
                    x={-node.size.width / 2}
                    y={-node.size.height / 2}
                    width={node.size.width}
                    height={node.size.height}
                    rx="8"
                    className="node-hitbox"
                  />
                  <DeviceGlyph node={node} />
                  <text y={node.size.height / 2 + 22} textAnchor="middle">
                    {node.name}
                  </text>
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
                  : "选择画布元件查看参数"}
            </p>
          </div>
          <button onClick={deleteSelected} disabled={!selectedNode && !selectedEdge} title="删除选中对象">
            <Trash2 size={17} />
          </button>
        </div>
        {selectedNode ? (
          <div className="form-stack">
            <div className="inspector-tabs">
              <button className={inspectorTab === "graph" ? "active" : ""} onClick={() => setInspectorTab("graph")}>
                图形参数
              </button>
              <button className={inspectorTab === "device" ? "active" : ""} onClick={() => setInspectorTab("device")}>
                设备参数
              </button>
            </div>
            {inspectorTab === "graph" ? (
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
            ) : (
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
            )}
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
        <section className="project-panel inspector-projects">
          <div className="project-panel-title">
            <h2>绘图模型</h2>
            <button onClick={createBlankProject} title="新增模型">
              <FolderOpen size={15} />
              新增
            </button>
          </div>
          <input
            className="project-name-input"
            value={projectName}
            onChange={(event) => setProjectName(event.target.value)}
            aria-label="当前模型名称"
          />
          <div className="project-list listbox" role="listbox" aria-label="绘图模型列表">
            {projects.length === 0 ? (
              <p className="project-empty">暂无已保存模型</p>
            ) : (
              projects.map((project) => (
                <button
                  className={`project-option ${project.id === selectedProjectId ? "selected" : ""} ${project.id === activeProjectId ? "active" : ""}`}
                  key={project.id}
                  onClick={() => setSelectedProjectId(project.id)}
                  onDoubleClick={() => loadSavedProject(project)}
                  onContextMenu={(event) => {
                    event.preventDefault();
                    setSelectedProjectId(project.id);
                    setProjectMenu({ x: event.clientX, y: event.clientY, projectId: project.id });
                  }}
                >
                  <span>{project.name}</span>
                  <small>{new Date(project.updatedAt).toLocaleString()}</small>
                </button>
              ))
            )}
          </div>
        </section>
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
          <button onClick={copySelection} disabled={selectedNodeIds.length === 0}>
            <Copy size={14} />
            复制
          </button>
          <button onClick={() => saveCurrentProject()}>
            <Save size={14} />
            保存
          </button>
          <button onClick={pasteSelection} disabled={clipboardNodes.length === 0}>
            <FileInput size={14} />
            粘贴
          </button>
          <button onClick={() => moveSelection(24, 0)} disabled={selectedNodeIds.length === 0}>
            右移
          </button>
          <button onClick={() => moveSelection(-24, 0)} disabled={selectedNodeIds.length === 0}>
            左移
          </button>
          <button onClick={() => moveSelection(0, -24)} disabled={selectedNodeIds.length === 0}>
            上移
          </button>
          <button onClick={() => moveSelection(0, 24)} disabled={selectedNodeIds.length === 0}>
            下移
          </button>
          <button onClick={deleteSelection} disabled={selectedNodeIds.length === 0 && !selectedEdgeId}>
            <Trash2 size={14} />
            删除
          </button>
        </div>
      )}
      {projectMenu && (
        <div className="context-menu" style={{ left: projectMenu.x, top: projectMenu.y }}>
          <button onClick={createBlankProject}>
            <FolderOpen size={14} />
            新增模型
          </button>
          <button
            onClick={() => {
              const project = projects.find((item) => item.id === projectMenu.projectId);
              if (project) loadSavedProject(project);
              setProjectMenu(null);
            }}
            disabled={!projectMenu.projectId}
          >
            加载模型
          </button>
          <button
            onClick={() => {
              const project = projects.find((item) => item.id === projectMenu.projectId);
              if (project) duplicateProjectRecord(project);
              setProjectMenu(null);
            }}
            disabled={!projectMenu.projectId}
          >
            <Copy size={14} />
            复制模型
          </button>
          <button
            onClick={() => {
              const project = projects.find((item) => item.id === projectMenu.projectId);
              if (project) renameProjectRecord(project);
              setProjectMenu(null);
            }}
            disabled={!projectMenu.projectId}
          >
            <Pencil size={14} />
            重命名
          </button>
          <button
            onClick={() => {
              const project = projects.find((item) => item.id === projectMenu.projectId);
              if (project) deleteProjectRecord(project);
              setProjectMenu(null);
            }}
            disabled={!projectMenu.projectId}
          >
            <Trash2 size={14} />
            删除模型
          </button>
        </div>
      )}
    </div>
  );
}
