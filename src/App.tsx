import { ChangeEvent, DragEvent, MouseEvent, PointerEvent, useEffect, useMemo, useRef, useState } from "react";
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
  Save,
  Trash2,
  Undo2
} from "lucide-react";
import {
  alignNodes,
  buildTopology,
  calculateElectricalTopology,
  canConnectTerminals,
  clampNodePositionToBounds,
  clampPointToBounds,
  copySavedProjectWithUniqueName,
  copySavedSchemeWithUniqueName,
  createTerminals,
  createSavedScheme,
  createSavedProject,
  createDefaultNode,
  deleteNodesWithConnectedEdges,
  deleteSavedScheme,
  deleteSavedProject,
  deserializeProject,
  DEVICE_LIBRARY,
  getEdgeEndpointPoint as getModelEdgeEndpointPoint,
  getNodeScaleX,
  getNodeScaleY,
  getSwitchVisualState,
  getTerminalPoint,
  isBusNode,
  isGeneratorNode,
  isStaticNode,
  lockProjectEdgeTerminals,
  projectPointToBusCenterline,
  validateTopology,
  type DeviceKind,
  type Edge,
  type ModelNode,
  type Point,
  type ProjectFile,
  type CanvasBounds,
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
import { resolveKeyboardShortcutScope } from "./keyboardShortcuts";

type ToolMode = "select" | "connect";
type LibraryGroup = "静态图元" | "交流系统" | "直流系统" | "变流设备";
type EdgeEndpoint = "source" | "target";
type TransformDrag =
  | { kind: "rotate"; nodeId: string; historyCaptured?: boolean }
  | { kind: "scale-x" | "scale-y" | "scale-both"; nodeId: string; historyCaptured?: boolean };
type Marquee = { start: Point; current: Point } | null;
type ContextMenuState = { x: number; y: number } | null;
type ProjectMenuState = { x: number; y: number; schemeId?: string; projectId?: string } | null;
type RewiringState = { edgeId: string; endpoint: EdgeEndpoint; previewPoint: Point; pointerId?: number } | null;
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
      historyCaptured?: boolean;
    }
  | {
      edgeId: string;
      pointIndex: number;
      startPoint: Point;
      originalManualPoints: Point[];
      originalRoutePoints: Point[];
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
type DraftProjectState = {
  projectName: string;
  activeProjectId: string;
  activeSchemeId: string;
  canvasWidth?: number;
  canvasHeight?: number;
  canvasBackgroundColor?: string;
  canvasBackgroundImage?: string;
  canvasBackgroundImageAssetId?: string;
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
};
type BackendSchemesResponse = {
  schemes: SavedSchemeRecord[];
};

const busEndpointColor = (node: ModelNode) => (node.kind.startsWith("dc") ? "#0f766e" : "#2563eb");

const DEFAULT_CANVAS_WIDTH = 1980;
const DEFAULT_CANVAS_HEIGHT = 1024;
const MIN_CANVAS_WIDTH = 640;
const MIN_CANVAS_HEIGHT = 360;
const MAX_CANVAS_WIDTH = 5000;
const MAX_CANVAS_HEIGHT = 3000;
const DEFAULT_CANVAS_BACKGROUND = "#f1f5f9";
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
const ACTIVE_PROJECT_STORAGE_KEY = "power-system-active-project";
const DRAFT_PROJECT_STORAGE_KEY = "power-system-current-draft";
const IMAGE_STORAGE_KEY = "power-system-image-assets";
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
  targetVbase: "末端电压等级"
};

const PARAM_OPTIONS: Record<string, string[]> = {
  controlType: ["PV", "PQ", "PH", "P", "V"],
  sourceControlType: ["定P", "定V", "定I", "定PQ", "定PV", "定PH", "不定"],
  targetControlType: ["定P", "定V", "定I", "定PQ", "定PV", "定PH", "不定"],
  acControlType: ["定PQ", "定PV", "定PH", "不定"],
  dcControlType: ["定P", "定V", "定I", "不定"],
  closedStatus: ["闭合", "打开"],
  run_stat: ["运行", "停运", "检修"],
  fontFamily: ["Arial", "Microsoft YaHei", "SimSun", "KaiTi", "SimHei"],
  fontWeight: ["400", "700", "900"],
  fontStyle: ["normal", "italic"],
  textDecoration: ["none", "underline"],
  strokeStyle: ["solid", "dashed", "dotted"]
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
    return parsed;
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

function clampCanvasDimension(value: number, min: number, max: number, fallback: number) {
  return Math.round(Math.max(min, Math.min(max, Number.isFinite(value) ? value : fallback)));
}

async function fetchBackendSchemes(): Promise<SavedSchemeRecord[]> {
  const response = await fetch("/api/schemes");
  if (!response.ok) {
    throw new Error("读取后台方案/模型失败。");
  }
  const payload = (await response.json()) as BackendSchemesResponse | SavedSchemeRecord[];
  return Array.isArray(payload) ? payload : Array.isArray(payload.schemes) ? payload.schemes : [];
}

async function saveBackendSchemes(schemes: SavedSchemeRecord[]): Promise<void> {
  const response = await fetch("/api/schemes", {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ schemes: normalizeSchemesForBackend(schemes) })
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(typeof payload.error === "string" ? payload.error : "保存方案/模型到后台失败。");
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

function DeviceGlyph({ node, miniature = false }: { node: ModelNode; miniature?: boolean }) {
  const w = miniature ? 58 : node.size.width;
  const h = miniature ? 38 : node.size.height;
  const stroke = node.params.foregroundColor || (node.kind.startsWith("dc") || node.kind.includes("dcdc") ? "#0f766e" : "#2563eb");
  const fill = node.kind.includes("converter") ? "#ecfeff" : node.kind.includes("switch") ? "#fff7ed" : "#ffffff";
  if (isStaticNode(node)) {
    const staticStroke = node.params.strokeColor || stroke;
    const staticFill = node.params.fillColor || "transparent";
    const lineWidth = Number(node.params.lineWidth || 2);
    const dashArray = svgStrokeDashArray(node.params.strokeStyle);
    if (node.kind === "static-text") {
      const fontSize = miniature ? 18 : Number(node.params.fontSize || 24);
      const textLines = (miniature ? "文" : node.params.text || node.name).split(/\r?\n/);
      return (
        <text
          x="0"
          y={-((textLines.length - 1) * fontSize * 0.6)}
          fill={node.params.textColor || staticStroke}
          fontSize={fontSize}
          fontFamily={node.params.fontFamily || "Arial"}
          fontWeight={node.params.fontWeight || "400"}
          fontStyle={node.params.fontStyle || "normal"}
          textDecoration={node.params.textDecoration || "none"}
          textAnchor="middle"
          dominantBaseline="middle"
          style={{ userSelect: "none" }}
        >
          {textLines.map((line, index) => (
            <tspan key={index} x="0" dy={index === 0 ? 0 : fontSize * 1.2}>
              {line || " "}
            </tspan>
          ))}
        </text>
      );
    }
    if (node.kind === "static-line") {
      return <line x1={-w / 2} y1="0" x2={w / 2} y2="0" stroke={staticStroke} strokeWidth={lineWidth} strokeDasharray={dashArray} strokeLinecap="round" />;
    }
    if (node.kind === "static-polyline") {
      return <polyline points={`${-w / 2},${h / 3} 0,${-h / 3} ${w / 2},${h / 3}`} fill="none" stroke={staticStroke} strokeWidth={lineWidth} strokeDasharray={dashArray} strokeLinecap="round" strokeLinejoin="round" />;
    }
    if (node.kind === "static-circle") {
      return <circle cx="0" cy="0" r={Math.min(w, h) / 2} fill={staticFill} stroke={staticStroke} strokeWidth={lineWidth} strokeDasharray={dashArray} />;
    }
    if (node.kind === "static-ellipse") {
      return <ellipse cx="0" cy="0" rx={w / 2} ry={h / 2} fill={staticFill} stroke={staticStroke} strokeWidth={lineWidth} strokeDasharray={dashArray} />;
    }
    if (node.kind === "static-image") {
      return (
        <g>
          <rect x={-w / 2} y={-h / 2} width={w} height={h} rx="4" fill={staticFill} stroke={staticStroke} strokeWidth={lineWidth} strokeDasharray={dashArray} />
          {!node.params.backgroundImage && (
            <text x="0" y="0" fill={node.params.textColor || "#64748b"} fontSize={miniature ? 14 : Number(node.params.fontSize || 16)} textAnchor="middle" dominantBaseline="middle">
              图片
            </text>
          )}
        </g>
      );
    }
    if (node.kind === "static-web") {
      return (
        <g>
          <rect x={-w / 2} y={-h / 2} width={w} height={h} rx="4" fill={staticFill} stroke={staticStroke} strokeWidth={lineWidth} strokeDasharray={dashArray} />
          <rect x={-w / 2} y={-h / 2} width={w} height="22" rx="4" fill="#e2e8f0" />
          <text x="0" y="12" fill={node.params.textColor || "#334155"} fontSize={miniature ? 10 : 13} textAnchor="middle">{miniature ? "WEB" : node.params.text || "https://"}</text>
        </g>
      );
    }
    if (["static-date", "static-time", "static-datetime", "static-input"].includes(node.kind)) {
      return (
        <g>
          <rect x={-w / 2} y={-h / 2} width={w} height={h} rx="5" fill={staticFill} stroke={staticStroke} strokeWidth={lineWidth} strokeDasharray={dashArray} />
          <text x={-w / 2 + 10} y="0" fill={node.params.textColor || "#111827"} fontSize={miniature ? 11 : Number(node.params.fontSize || 16)} dominantBaseline="middle">
            {miniature ? "控件" : node.params.text || node.name}
          </text>
        </g>
      );
    }
    if (node.kind === "static-button") {
      return (
        <g>
          <rect x={-w / 2} y={-h / 2} width={w} height={h} rx="6" fill={staticFill} stroke={staticStroke} strokeWidth={lineWidth} strokeDasharray={dashArray} />
          <text x="0" y="0" fill={node.params.textColor || "#111827"} fontSize={miniature ? 12 : Number(node.params.fontSize || 16)} textAnchor="middle" dominantBaseline="middle">
            {miniature ? "按钮" : node.params.text || node.name}
          </text>
        </g>
      );
    }
    return <rect x={-w / 2} y={-h / 2} width={w} height={h} rx="4" fill={staticFill} stroke={staticStroke} strokeWidth={lineWidth} strokeDasharray={dashArray} />;
  }

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

function buildSvgDocument(nodes: ModelNode[], edges: Edge[], canvasSize: CanvasRenderOptions = { width: DEFAULT_CANVAS_WIDTH, height: DEFAULT_CANVAS_HEIGHT }) {
  const imageAssets = readImageAssets();
  const backgroundColor = canvasSize.backgroundColor ?? DEFAULT_CANVAS_BACKGROUND;
  const backgroundImage = canvasSize.backgroundImage ?? "";
  const edgeMarkup = routeEdgesForRendering(nodes, edges, canvasSize)
    .map((route) => `<path d="${route.path}" fill="none" stroke="#334155" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`)
    .join("\n");
  const nodeMarkup = nodes
    .map((node) => {
      const stroke = node.params.foregroundColor || (node.kind.startsWith("dc") || node.kind.includes("dcdc") ? "#0f766e" : "#2563eb");
      if (isBusNode(node)) {
        return `<g transform="translate(${node.position.x} ${node.position.y}) rotate(${node.rotation}) scale(${getNodeScaleX(node)} ${getNodeScaleY(node)})">
  <title>${node.name}</title>
  <line x1="${-node.size.width / 2}" y1="0" x2="${node.size.width / 2}" y2="0" stroke="${stroke}" stroke-width="${Math.max(8, node.size.height / 3)}" stroke-linecap="round"/>
</g>`;
      }
      const imageHref = resolveNodeImage(node, imageAssets);
      const foregroundHref = resolveNodeForegroundImage(node, imageAssets);
      const shapeFill = node.params.fillColor || "#ffffff";
      const shapeStroke = node.params.strokeColor || node.params.foregroundColor || "#94a3b8";
      const lineWidth = Number(node.params.lineWidth || 2);
      const dashArray = svgStrokeDashArray(node.params.strokeStyle);
      const dashAttribute = dashArray ? ` stroke-dasharray="${dashArray}"` : "";
      const staticShapeMarkup = (() => {
        if (!isStaticNode(node)) {
          return `<rect x="${-node.size.width / 2}" y="${-node.size.height / 2}" width="${node.size.width}" height="${node.size.height}" rx="8" fill="#ffffff" stroke="${shapeStroke}"/>`;
        }
        if (node.kind === "static-text") {
          const fontSize = Number(node.params.fontSize || 24);
          const lines = (node.params.text || node.name).split(/\r?\n/);
          const startY = -((lines.length - 1) * fontSize * 0.6);
          const tspans = lines
            .map((line, index) => `<tspan x="0" dy="${index === 0 ? 0 : fontSize * 1.2}">${escapeXml(line || " ")}</tspan>`)
            .join("");
          return `<text x="0" y="${startY}" fill="${node.params.textColor || "#111827"}" font-size="${fontSize}" font-family="${escapeXml(node.params.fontFamily || "Arial")}" font-weight="${node.params.fontWeight || "400"}" font-style="${node.params.fontStyle || "normal"}" text-decoration="${node.params.textDecoration || "none"}" text-anchor="middle" dominant-baseline="middle">${tspans}</text>`;
        }
        if (node.kind === "static-line") {
          return `<line x1="${-node.size.width / 2}" y1="0" x2="${node.size.width / 2}" y2="0" stroke="${shapeStroke}" stroke-width="${lineWidth}"${dashAttribute} stroke-linecap="round"/>`;
        }
        if (node.kind === "static-polyline") {
          return `<polyline points="${-node.size.width / 2},${node.size.height / 3} 0,${-node.size.height / 3} ${node.size.width / 2},${node.size.height / 3}" fill="none" stroke="${shapeStroke}" stroke-width="${lineWidth}"${dashAttribute} stroke-linecap="round" stroke-linejoin="round"/>`;
        }
        if (node.kind === "static-circle") {
          return `<circle cx="0" cy="0" r="${Math.min(node.size.width, node.size.height) / 2}" fill="${shapeFill}" stroke="${shapeStroke}" stroke-width="${lineWidth}"${dashAttribute}/>`;
        }
        if (node.kind === "static-ellipse") {
          return `<ellipse cx="0" cy="0" rx="${node.size.width / 2}" ry="${node.size.height / 2}" fill="${shapeFill}" stroke="${shapeStroke}" stroke-width="${lineWidth}"${dashAttribute}/>`;
        }
        return `<rect x="${-node.size.width / 2}" y="${-node.size.height / 2}" width="${node.size.width}" height="${node.size.height}" rx="4" fill="${shapeFill}" stroke="${shapeStroke}" stroke-width="${lineWidth}"${dashAttribute}/>`;
      })();
      return `<g transform="translate(${node.position.x} ${node.position.y}) rotate(${node.rotation}) scale(${getNodeScaleX(node)} ${getNodeScaleY(node)})">
  <title>${escapeXml(node.name)}</title>
  ${imageHref ? `<image href="${imageHref}" x="${-node.size.width / 2}" y="${-node.size.height / 2}" width="${node.size.width}" height="${node.size.height}" preserveAspectRatio="xMidYMid slice"/>` : ""}
  ${staticShapeMarkup}
  ${foregroundHref ? `<image href="${foregroundHref}" x="${-node.size.width / 2}" y="${-node.size.height / 2}" width="${node.size.width}" height="${node.size.height}" preserveAspectRatio="xMidYMid slice"/>` : ""}
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
  const svgRef = useRef<SVGSVGElement | null>(null);
  const importRef = useRef<HTMLInputElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const canvasInteractionRef = useRef(false);
  const lastCanvasPointerRef = useRef<Point | null>(null);
  const projectListPointerInsideRef = useRef(false);
  const backendSchemesLoadedRef = useRef(false);
  const suppressNextBackendSchemeSyncRef = useRef(false);
  const [nodes, setNodes] = useState<ModelNode[]>(() => initialDraft?.nodes ?? SAMPLE_NODES);
  const [edges, setEdges] = useState<Edge[]>(() => initialDraft?.edges ?? SAMPLE_EDGES);
  const [projectName, setProjectName] = useState(() => initialDraft?.projectName ?? "电力系统图上模型");
  const [canvasWidth, setCanvasWidth] = useState(() => initialDraft?.canvasWidth ?? DEFAULT_CANVAS_WIDTH);
  const [canvasHeight, setCanvasHeight] = useState(() => initialDraft?.canvasHeight ?? DEFAULT_CANVAS_HEIGHT);
  const [canvasBackgroundColor, setCanvasBackgroundColor] = useState(() => initialDraft?.canvasBackgroundColor ?? DEFAULT_CANVAS_BACKGROUND);
  const [canvasBackgroundImage, setCanvasBackgroundImage] = useState(() => initialDraft?.canvasBackgroundImage ?? "");
  const [canvasBackgroundImageAssetId, setCanvasBackgroundImageAssetId] = useState(() => initialDraft?.canvasBackgroundImageAssetId ?? "");
  const [schemes, setSchemes] = useState<SavedSchemeRecord[]>(() => readSavedSchemes());
  const [activeProjectId, setActiveProjectId] = useState<string>(() => initialDraft?.activeProjectId ?? "");
  const [activeSchemeId, setActiveSchemeId] = useState<string>(() => initialDraft?.activeSchemeId ?? "");
  const [mode, setMode] = useState<ToolMode>("select");
  const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>(nodes[0] ? [nodes[0].id] : []);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string>("");
  const [connectSource, setConnectSource] = useState<{ nodeId: string; terminalId: string; point?: Point } | null>(null);
  const [connectPreviewPoint, setConnectPreviewPoint] = useState<Point | null>(null);
  const [dragging, setDragging] = useState<DraggingState | null>(null);
  const [rewiring, setRewiring] = useState<RewiringState>(null);
  const [terminalPress, setTerminalPress] = useState<TerminalPressState>(null);
  const [manualPathDrag, setManualPathDrag] = useState<ManualPathDrag>(null);
  const [transformDrag, setTransformDrag] = useState<TransformDrag | null>(null);
  const [viewBox, setViewBox] = useState({ x: 0, y: 0, width: DEFAULT_CANVAS_WIDTH, height: DEFAULT_CANVAS_HEIGHT });
  const [panning, setPanning] = useState<{ clientX: number; clientY: number; viewBox: typeof viewBox } | null>(null);
  const [marquee, setMarquee] = useState<Marquee>(null);
  const [clipboardNodes, setClipboardNodes] = useState<ModelNode[]>([]);
  const [contextMenu, setContextMenu] = useState<ContextMenuState>(null);
  const [inspectorTab, setInspectorTab] = useState<"model" | "graph" | "device">("graph");
  const [leftPanelTab, setLeftPanelTab] = useState<"projects" | "library">("projects");
  const [expandedLibraryGroups, setExpandedLibraryGroups] = useState<LibraryGroup[]>(["静态图元", "交流系统", "直流系统", "变流设备"]);
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
  const [imageTarget, setImageTarget] = useState<ImageTarget | null>(null);
  const [imageFolders, setImageFolders] = useState<ImageFolder[]>([{ id: "root", name: "默认文件夹", imageCount: 0 }]);
  const [activeImageFolderId, setActiveImageFolderId] = useState("root");
  const [imageAssetList, setImageAssetList] = useState<ImageAsset[]>(() =>
    Object.entries(readImageAssets()).map(([id, url], index) => ({ id, name: `本地图片 ${index + 1}`, folderId: "root", url }))
  );
  const [imageAssets, setImageAssets] = useState<Record<string, string>>(() => imageAssetsToMap(imageAssetList));

  const selectedNodeId = selectedNodeIds[0] ?? "";
  const selectedNode = nodes.find((node) => node.id === selectedNodeId);
  const selectedEdge = edges.find((edge) => edge.id === selectedEdgeId);
  const projects = useMemo(() => schemes.flatMap((scheme) => scheme.projects), [schemes]);
  const selectedProjectRecord = projects.find((project) => project.id === selectedProjectId);
  const activeProjectRecord = projects.find((project) => project.id === activeProjectId);
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
      nodes,
      edges
    }
  };
  const selectedSchemeRecord = schemes.find((scheme) => scheme.id === selectedSchemeId);
  const selectedCount = selectedNodeIds.length;
  const topology = useMemo(() => buildTopology(nodes, edges), [nodes, edges]);
  const canvasBounds = useMemo<CanvasBounds>(() => ({ width: canvasWidth, height: canvasHeight }), [canvasHeight, canvasWidth]);
  const nodeById = useMemo(() => new Map(nodes.map((node) => [node.id, node])), [nodes]);
  const nodeImage = (node: ModelNode) => resolveNodeImage(node, imageAssets);
  const nodeForegroundImage = (node: ModelNode) => resolveNodeForegroundImage(node, imageAssets);
  const canvasBackgroundImageUrl = resolveProjectImage(
    { canvasBackgroundImage, canvasBackgroundImageAssetId },
    imageAssets
  );
  const connectPreviewPath = useMemo(() => {
    if (!connectSource || !connectPreviewPoint) {
      return "";
    }
    const sourceNode = nodeById.get(connectSource.nodeId);
    if (!sourceNode) {
      return "";
    }
    const start = connectSource.point ?? getModelEdgeEndpointPoint(sourceNode, undefined, connectSource.terminalId);
    const midX = Math.round((start.x + connectPreviewPoint.x) / 2);
    return `M ${start.x} ${start.y} L ${midX} ${start.y} L ${midX} ${connectPreviewPoint.y} L ${connectPreviewPoint.x} ${connectPreviewPoint.y}`;
  }, [connectPreviewPoint, connectSource, nodeById]);
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
    () => routeEdgesForRendering(rewiringPreview.nodes, rewiringPreview.edges, canvasBounds),
    [canvasBounds, rewiringPreview]
  );
  const renderedRoutedEdges = useMemo(
    () => [...routedEdges].sort((first, second) => Number(first.edgeId === selectedEdgeId) - Number(second.edgeId === selectedEdgeId)),
    [routedEdges, selectedEdgeId]
  );
  const selectedRoutedEdge = routedEdges.find((route) => route.edgeId === selectedEdgeId);

  useEffect(() => {
    fetchBackendSchemes()
      .then((backendSchemes) => {
        backendSchemesLoadedRef.current = true;
        if (backendSchemes.length > 0) {
          suppressNextBackendSchemeSyncRef.current = true;
          setSchemes(backendSchemes);
          setExpandedSchemeIds((current) =>
            current.length > 0 ? Array.from(new Set([...current, ...backendSchemes.map((scheme) => scheme.id)])) : backendSchemes.map((scheme) => scheme.id)
          );
          return;
        }
        if (schemes.length > 0) {
          void saveBackendSchemes(schemes).catch(() => {
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
    const normalizedSchemes = normalizeSchemesForBackend(schemes);
    window.localStorage.setItem(SCHEME_STORAGE_KEY, JSON.stringify(normalizedSchemes));
    if (!backendSchemesLoadedRef.current) {
      return;
    }
    if (suppressNextBackendSchemeSyncRef.current) {
      suppressNextBackendSchemeSyncRef.current = false;
      return;
    }
    void saveBackendSchemes(normalizedSchemes).catch(() => {
      // 后台保存失败时不阻塞本地编辑；下一次方案/模型变更会继续尝试同步。
    });
  }, [schemes]);

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
    void refreshImageFolders();
    void refreshImagesForFolder("root");
    // 只在启动时初始化后台图片库。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    void refreshImagesForFolder(activeImageFolderId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeImageFolderId]);

  useEffect(() => {
    window.localStorage.setItem(
      DRAFT_PROJECT_STORAGE_KEY,
      JSON.stringify({
        projectName,
        activeProjectId,
        activeSchemeId,
        canvasWidth,
        canvasHeight,
        canvasBackgroundColor,
        canvasBackgroundImage,
        canvasBackgroundImageAssetId,
        nodes,
        edges
      })
    );
    window.localStorage.setItem(ACTIVE_PROJECT_STORAGE_KEY, JSON.stringify({ activeProjectId, activeSchemeId }));
  }, [activeProjectId, activeSchemeId, canvasBackgroundColor, canvasBackgroundImage, canvasBackgroundImageAssetId, canvasHeight, canvasWidth, edges, nodes, projectName]);

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
      setConnectPreviewPoint(null);
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
          setConnectSource(null);
          setConnectPreviewPoint(null);
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
      } else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "v") {
        if (isRecordShortcutTarget && recordClipboard) {
          event.preventDefault();
          pasteSelectedRecord();
        } else if (isCanvasShortcutTarget) {
          event.preventDefault();
          pasteSelection();
        }
      } else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        saveCurrentProject();
      } else if (event.key === "Delete" || event.key === "Backspace") {
        if (isCanvasShortcutTarget) {
          event.preventDefault();
          deleteSelectedNodesOnly();
        } else if (isRecordShortcutTarget) {
          event.preventDefault();
          if (selectedProjectIds.length > 1 || selectedSchemeIds.length > 1) {
            deleteSelectedRecords();
          } else if (selectedProjectId) {
            const project = projects.find((item) => item.id === selectedProjectId);
            if (project) deleteProjectRecord(project);
          } else if (selectedSchemeId) {
            const scheme = schemes.find((item) => item.id === selectedSchemeId);
            if (scheme) deleteSchemeRecord(scheme);
          }
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

  useEffect(() => {
    if (leftPanelTab !== "projects") {
      projectListPointerInsideRef.current = false;
    }
  }, [leftPanelTab]);

  const currentProject = (): ProjectFile => ({
    ...lockProjectEdgeTerminals({
      version: 1,
      name: projectName,
      canvasWidth,
      canvasHeight,
      canvasBackgroundColor,
      canvasBackgroundImage,
      canvasBackgroundImageAssetId,
      nodes,
      edges
    })
  });

  const clearTransientSelectionState = () => {
    setSelectedEdgeId("");
    setConnectSource(null);
    setConnectPreviewPoint(null);
    setRewiring(null);
    setContextMenu(null);
  };

  const copySelection = () => {
    const selected = nodes.filter((node) => selectedNodeIds.includes(node.id));
    setClipboardNodes(selected);
  };

  const clipboardBounds = (items: ModelNode[]) => {
    if (items.length === 0) {
      return null;
    }
    const boxes = items.map((node) => {
      const width = node.size.width * Math.abs(getNodeScaleX(node));
      const height = node.size.height * Math.abs(getNodeScaleY(node));
      return {
        left: node.position.x - width / 2,
        right: node.position.x + width / 2,
        top: node.position.y - height / 2,
        bottom: node.position.y + height / 2
      };
    });
    return {
      left: Math.min(...boxes.map((box) => box.left)),
      right: Math.max(...boxes.map((box) => box.right)),
      top: Math.min(...boxes.map((box) => box.top)),
      bottom: Math.max(...boxes.map((box) => box.bottom))
    };
  };

  const pasteSelection = () => {
    if (clipboardNodes.length === 0) {
      return;
    }
    const targetPoint = lastCanvasPointerRef.current;
    if (!targetPoint) {
      window.alert("请先将鼠标移动到画布内，再执行粘贴操作。");
      return;
    }
    const bounds = clipboardBounds(clipboardNodes);
    if (!bounds) {
      return;
    }
    const width = bounds.right - bounds.left;
    const height = bounds.bottom - bounds.top;
    if (targetPoint.x < 0 || targetPoint.y < 0 || targetPoint.x + width > canvasWidth || targetPoint.y + height > canvasHeight) {
      window.alert("粘贴位置超过显示边界，请调整鼠标位置后重试。");
      return;
    }
    const dx = targetPoint.x - bounds.left;
    const dy = targetPoint.y - bounds.top;
    pushUndoSnapshot();
    const idMap = new Map<string, string>();
    const pasted = clipboardNodes.map((node) => {
      const nextId = `node-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      idMap.set(node.id, nextId);
      return {
        ...node,
        id: nextId,
        name: `${node.name} 副本`,
        position: clampNodeToCanvas(node, { x: Math.round(node.position.x + dx), y: Math.round(node.position.y + dy) }),
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

  const deleteSelectedNodesOnly = () => {
    if (selectedNodeIds.length === 0) {
      window.alert("当前没有被选中设备。");
      return;
    }
    pushUndoSnapshot();
    const result = deleteNodesWithConnectedEdges(nodes, edges, selectedNodeIds);
    setNodes(result.nodes);
    setEdges(result.edges);
    setSelectedNodeIds([]);
    setSelectedEdgeId("");
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

  const clampPointToCanvas = (point: Point) => clampPointToBounds(point, canvasBounds);
  const clampNodeToCanvas = (node: ModelNode, position = node.position) => clampNodePositionToBounds(node, canvasBounds, position);
  const clampViewBoxToCanvas = (box: typeof viewBox) => ({
    ...box,
    x: Math.max(0, Math.min(Math.max(0, canvasWidth - box.width), box.x)),
    y: Math.max(0, Math.min(Math.max(0, canvasHeight - box.height), box.y))
  });
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

  const moveSelection = (dx: number, dy: number) => {
    if (selectedNodeIds.length === 0) {
      return;
    }
    pushUndoSnapshot();
    const selected = new Set(selectedNodeIds);
    const originalPositions = Object.fromEntries(nodes.filter((node) => selected.has(node.id)).map((node) => [node.id, node.position]));
    const boundedDelta = boundedDeltaForNodes(selectedNodeIds, originalPositions, dx, dy);
    moveAttachedBusPoints(Object.fromEntries(selectedNodeIds.map((id) => [id, boundedDelta])));
    setNodes((current) =>
      current.map((node) =>
        selected.has(node.id) ? { ...node, position: clampNodeToCanvas(node, { x: node.position.x + boundedDelta.x, y: node.position.y + boundedDelta.y }) } : node
      )
    );
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
    if (patch.position && selectedNode) {
      moveAttachedBusPoints({
        [selectedNodeId]: {
          x: nextPatch.position!.x - selectedNode.position.x,
          y: nextPatch.position!.y - selectedNode.position.y
        }
      });
    }
    setNodes((current) => current.map((node) => (node.id === selectedNodeId ? { ...node, ...nextPatch } : node)));
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
  };

  const updateCanvasSize = (nextWidth: number, nextHeight: number) => {
    const width = clampCanvasDimension(nextWidth, MIN_CANVAS_WIDTH, MAX_CANVAS_WIDTH, DEFAULT_CANVAS_WIDTH);
    const height = clampCanvasDimension(nextHeight, MIN_CANVAS_HEIGHT, MAX_CANVAS_HEIGHT, DEFAULT_CANVAS_HEIGHT);
    pushUndoSnapshot();
    setCanvasWidth(width);
    setCanvasHeight(height);
    setViewBox((current) => ({
      x: Math.max(0, Math.min(width - Math.min(current.width, width), current.x)),
      y: Math.max(0, Math.min(height - Math.min(current.height, height), current.y)),
      width: Math.min(current.width, width * 3),
      height: Math.min(current.height, height * 3)
    }));
    setNodes((current) => current.map((node) => ({ ...node, position: clampNodePositionToBounds(node, { width, height }) })));
    setEdges((current) =>
      current.map((edge) => ({
        ...edge,
        sourcePoint: edge.sourcePoint ? clampPointToBounds(edge.sourcePoint, { width, height }) : undefined,
        targetPoint: edge.targetPoint ? clampPointToBounds(edge.targetPoint, { width, height }) : undefined,
        manualPoints: edge.manualPoints?.map((point) => clampPointToBounds(point, { width, height }))
      }))
    );
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
    const point = clampPointToCanvas(screenToSvgPoint(svgRef.current, event.clientX, event.clientY));
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
    node.position = clampNodeToCanvas(node, position);
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
    if (connectSource && isBusNode(node)) {
      handleTerminalPointerDown(event as unknown as PointerEvent<SVGCircleElement>, node, node.terminals[0].id);
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
            targetPoint: edge.targetPoint ? { ...edge.targetPoint } : undefined,
            manualPoints: edge.manualPoints?.map((point) => ({ ...point }))
          }
        ])
      )
    });
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: PointerEvent<SVGSVGElement>) => {
    if (svgRef.current) {
      lastCanvasPointerRef.current = clampPointToCanvas(screenToSvgPoint(svgRef.current, event.clientX, event.clientY));
      if (connectSource) {
        setConnectPreviewPoint(lastCanvasPointerRef.current);
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
      if (!manualPathDrag.historyCaptured) {
        pushUndoSnapshot();
        setManualPathDrag({ ...manualPathDrag, historyCaptured: true });
      }
      const originalRoutePoints = manualPathDrag.originalRoutePoints;
      if (originalRoutePoints.length < 2) {
        return;
      }
      const nextPoints = originalRoutePoints.map((item) => ({ ...item }));
      if ("pointIndex" in manualPathDrag) {
        if (manualPathDrag.pointIndex > 0 && manualPathDrag.pointIndex < originalRoutePoints.length - 1) {
          const originalPoint = originalRoutePoints[manualPathDrag.pointIndex];
          nextPoints[manualPathDrag.pointIndex] = clampPointToCanvas({
            x: originalPoint.x + point.x - manualPathDrag.startPoint.x,
            y: originalPoint.y + point.y - manualPathDrag.startPoint.y
          });
        }
      } else {
        const delta = manualPathDrag.orientation === "horizontal"
          ? point.y - manualPathDrag.startPoint.y
          : point.x - manualPathDrag.startPoint.x;
        const movePoint = (source: Point) =>
          manualPathDrag.orientation === "horizontal"
            ? clampPointToCanvas({ x: source.x, y: source.y + delta })
            : clampPointToCanvas({ x: source.x + delta, y: source.y });
        [manualPathDrag.segmentIndex, manualPathDrag.segmentIndex + 1].forEach((routeIndex) => {
          if (routeIndex > 0 && routeIndex < originalRoutePoints.length - 1) {
            nextPoints[routeIndex] = movePoint(originalRoutePoints[routeIndex]);
          }
        });
      }
      setEdgeManualPoints(manualPathDrag.edgeId, routeManualPoints(nextPoints));
      return;
    }
    if (rewiring && svgRef.current) {
      setRewiring({ ...rewiring, previewPoint: lastCanvasPointerRef.current ?? clampPointToCanvas(screenToSvgPoint(svgRef.current, event.clientX, event.clientY)) });
      return;
    }
    if (marquee && svgRef.current) {
      setMarquee({ ...marquee, current: lastCanvasPointerRef.current ?? clampPointToCanvas(screenToSvgPoint(svgRef.current, event.clientX, event.clientY)) });
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
          const nextScaleX = clampScale((Math.abs(local.x) * 2) / node.size.width);
          const nextScaleY = clampScale((Math.abs(local.y) * 2) / node.size.height);
          if (transformDrag.kind === "scale-x") {
            return { ...node, scale: nextScaleX, scaleX: nextScaleX, position: clampNodeToCanvas({ ...node, scale: nextScaleX, scaleX: nextScaleX }) };
          }
          if (transformDrag.kind === "scale-y") {
            return { ...node, scale: nextScaleY, scaleY: nextScaleY, position: clampNodeToCanvas({ ...node, scale: nextScaleY, scaleY: nextScaleY }) };
          }
          const nextScale = clampScale(Math.max(nextScaleX, nextScaleY));
          return { ...node, scale: nextScale, scaleX: nextScale, scaleY: nextScale, position: clampNodeToCanvas({ ...node, scale: nextScale, scaleX: nextScale, scaleY: nextScale }) };
        })
      );
      return;
    }
    if (!dragging || !svgRef.current) {
      return;
    }
    const point = lastCanvasPointerRef.current ?? clampPointToCanvas(screenToSvgPoint(svgRef.current, event.clientX, event.clientY));
    if (!dragging.historyCaptured) {
      pushUndoSnapshot();
      setDragging({ ...dragging, historyCaptured: true });
    }
    const dragNodeIds = new Set(dragging.nodeIds);
    const rawDx = point.x - dragging.startPoint.x;
    const rawDy = point.y - dragging.startPoint.y;
    const boundedDelta = boundedDeltaForNodes(dragging.nodeIds, dragging.originalPositions, rawDx, rawDy);
    const dx = boundedDelta.x;
    const dy = boundedDelta.y;
    const draggedBusIds = new Set(nodes.filter((node) => dragNodeIds.has(node.id) && isBusNode(node)).map((node) => node.id));
    setNodes((current) =>
      current.map((node) => {
        const originalPosition = dragging.originalPositions[node.id];
        return dragNodeIds.has(node.id) && originalPosition
          ? { ...node, position: clampNodeToCanvas(node, { x: originalPosition.x + dx, y: originalPosition.y + dy }) }
          : node;
      })
    );
    if (draggedBusIds.size > 0 || edges.some((edge) => dragNodeIds.has(edge.sourceId) || dragNodeIds.has(edge.targetId))) {
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
              : edge.targetPoint,
            manualPoints: originalPoints?.manualPoints && (dragNodeIds.has(edge.sourceId) || dragNodeIds.has(edge.targetId))
              ? originalPoints.manualPoints.map((point) => ({ x: point.x + dx, y: point.y + dy }))
              : edge.manualPoints
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
    const nextWidth = Math.max(240, Math.min(canvasWidth * 3, viewBox.width * zoomFactor));
    const nextHeight = Math.max(160, Math.min(canvasHeight * 3, viewBox.height * zoomFactor));
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
    pushUndoSnapshot();
    setProjectName(project.name);
    setCanvasWidth(project.project.canvasWidth ?? DEFAULT_CANVAS_WIDTH);
    setCanvasHeight(project.project.canvasHeight ?? DEFAULT_CANVAS_HEIGHT);
    setCanvasBackgroundColor(project.project.canvasBackgroundColor ?? DEFAULT_CANVAS_BACKGROUND);
    setCanvasBackgroundImage(project.project.canvasBackgroundImage ?? "");
    setCanvasBackgroundImageAssetId(project.project.canvasBackgroundImageAssetId ?? "");
    setViewBox({ x: 0, y: 0, width: project.project.canvasWidth ?? DEFAULT_CANVAS_WIDTH, height: project.project.canvasHeight ?? DEFAULT_CANVAS_HEIGHT });
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
      const project = projects.find((item) => item.id === (selectedProjectIds[0] ?? selectedProjectId));
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
    const record = createSavedProject(name, { version: 1, name, canvasWidth, canvasHeight, nodes: [], edges: [] });
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

  const setEdgeManualPoints = (edgeId: string, manualPoints: Point[]) => {
    setEdges((current) =>
      current.map((edge) =>
        edge.id === edgeId
          ? { ...edge, manualPoints: manualPoints.map((point) => ({ x: Math.round(point.x), y: Math.round(point.y) })) }
          : edge
      )
    );
  };

  const routeManualPoints = (routePoints: Point[]) => routePoints.slice(1, -1).map((point) => ({ ...point }));

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
    setSelectedNodeIds([]);
    setSelectedEdgeId(edgeId);
    setManualPathDrag({
      edgeId,
      segmentIndex,
      orientation,
      startPoint: clampPointToCanvas(screenToSvgPoint(svgRef.current, event.clientX, event.clientY)),
      originalManualPoints: routeManualPoints(routePoints),
      originalRoutePoints: routePoints.map((point) => ({ ...point }))
    });
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const startManualPointDrag = (event: PointerEvent<SVGCircleElement>, edgeId: string, pointIndex: number, routePoints: Point[]) => {
    event.stopPropagation();
    if (event.button !== 0 || !svgRef.current) {
      return;
    }
    setSelectedNodeIds([]);
    setSelectedEdgeId(edgeId);
    setManualPathDrag({
      edgeId,
      pointIndex,
      startPoint: clampPointToCanvas(screenToSvgPoint(svgRef.current, event.clientX, event.clientY)),
      originalManualPoints: routeManualPoints(routePoints),
      originalRoutePoints: routePoints.map((point) => ({ ...point }))
    });
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const insertManualBendPoint = (event: MouseEvent<SVGPathElement>, edgeId: string, segmentIndex: number, routePoints: Point[]) => {
    event.stopPropagation();
    if (!svgRef.current) {
      return;
    }
    const clickPoint = clampPointToCanvas(screenToSvgPoint(svgRef.current, event.clientX, event.clientY));
    const from = routePoints[segmentIndex];
    const to = routePoints[segmentIndex + 1];
    if (!from || !to) {
      return;
    }
    pushUndoSnapshot();
    const nextPoints = routePoints.map((point) => ({ ...point }));
    if (from.y === to.y) {
      const x = Math.max(Math.min(clickPoint.x, Math.max(from.x, to.x) - 12), Math.min(from.x, to.x) + 12);
      const y = from.y;
      const offsetY = y + (clickPoint.y >= y ? 32 : -32);
      nextPoints.splice(segmentIndex + 1, 0, { x, y }, { x, y: offsetY }, { x: x + (to.x >= from.x ? 32 : -32), y: offsetY });
    } else {
      const y = Math.max(Math.min(clickPoint.y, Math.max(from.y, to.y) - 12), Math.min(from.y, to.y) + 12);
      const x = from.x;
      const offsetX = x + (clickPoint.x >= x ? 32 : -32);
      nextPoints.splice(segmentIndex + 1, 0, { x, y }, { x: offsetX, y }, { x: offsetX, y: y + (to.y >= from.y ? 32 : -32) });
    }
    setEdgeManualPoints(edgeId, routeManualPoints(nextPoints));
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
    setConnectPreviewPoint(sourcePoint);
    setMode("connect");
    setSelectedNodeIds([]);
    setSelectedEdgeId("");
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
    if (event.button !== 0 || !svgRef.current) {
      return;
    }
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
      targetPoint: busPoint
    };
    pushUndoSnapshot();
    setEdges((current) => [
      ...current,
      newEdge
    ]);
    setSelectedEdgeId(newEdge.id);
    setConnectSource(null);
    setConnectPreviewPoint(null);
    setMode("select");
  };

  const exportModel = () => {
    downloadText(
      "power-system-model.json",
      serializeProject(currentProject()),
      "application/json"
    );
  };

  const exportSvg = () => {
    downloadText(
      "power-system-diagram.svg",
      buildSvgDocument(nodes, edges, {
        ...canvasBounds,
        backgroundColor: canvasBackgroundColor || DEFAULT_CANVAS_BACKGROUND,
        backgroundImage: canvasBackgroundImageUrl
      }),
      "image/svg+xml"
    );
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
      downloadText(
        `${prefix}.svg`,
        buildSvgDocument(project.project.nodes, project.project.edges, {
          width: project.project.canvasWidth ?? DEFAULT_CANVAS_WIDTH,
          height: project.project.canvasHeight ?? DEFAULT_CANVAS_HEIGHT,
          backgroundColor: project.project.canvasBackgroundColor ?? DEFAULT_CANVAS_BACKGROUND,
          backgroundImage: resolveProjectImage(project.project)
        }),
        "image/svg+xml"
      );
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
    setCanvasWidth(project.canvasWidth ?? DEFAULT_CANVAS_WIDTH);
    setCanvasHeight(project.canvasHeight ?? DEFAULT_CANVAS_HEIGHT);
    setCanvasBackgroundColor(project.canvasBackgroundColor ?? DEFAULT_CANVAS_BACKGROUND);
    setCanvasBackgroundImage(project.canvasBackgroundImage ?? "");
    setCanvasBackgroundImageAssetId(project.canvasBackgroundImageAssetId ?? "");
    setViewBox({ x: 0, y: 0, width: project.canvasWidth ?? DEFAULT_CANVAS_WIDTH, height: project.canvasHeight ?? DEFAULT_CANVAS_HEIGHT });
    setNodes(project.nodes);
    setEdges(project.edges);
    setSelectedNodeIds(project.nodes[0] ? [project.nodes[0].id] : []);
    setSelectedEdgeId("");
    event.target.value = "";
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

  const renderLibraryPanel = () => (
    <div className="library-scroll">
      {(["静态图元", "交流系统", "直流系统", "变流设备"] as LibraryGroup[]).map((group) => {
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
              </div>
            )}
          </section>
        );
      })}
    </div>
  );

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
            <input ref={imageInputRef} type="file" accept="image/*" hidden onChange={chooseImage} />
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
              setDragging(null);
              setManualPathDrag(null);
              setTransformDrag(null);
              setPanning(null);
            }}
            onPointerLeave={() => {
              canvasInteractionRef.current = false;
              setDragging(null);
              setTerminalPress(null);
              setManualPathDrag(null);
              setTransformDrag(null);
              setPanning(null);
              setMarquee(null);
              setRewiring(null);
            }}
            onPointerCancel={() => {
              setDragging(null);
              setTerminalPress(null);
              setManualPathDrag(null);
              setTransformDrag(null);
              setPanning(null);
              setMarquee(null);
              setRewiring(null);
            }}
            onLostPointerCapture={() => {
              setDragging(null);
              setTerminalPress(null);
              setManualPathDrag(null);
              setTransformDrag(null);
            }}
            onPointerDown={(event) => {
              if (event.button !== 0) {
                return;
              }
              canvasInteractionRef.current = true;
              projectListPointerInsideRef.current = false;
              lastCanvasPointerRef.current = clampPointToCanvas(screenToSvgPoint(event.currentTarget, event.clientX, event.clientY));
              if (connectSource) {
                setConnectPreviewPoint(lastCanvasPointerRef.current);
                return;
              }
              setSelectedNodeIds([]);
              setSelectedEdgeId("");
              setConnectSource(null);
              setConnectPreviewPoint(null);
              setRewiring(null);
              setInspectorTab("model");
              if (activeProjectId) {
                setSelectedProjectId(activeProjectId);
                setSelectedProjectIds([activeProjectId]);
                setSelectedSchemeId(activeSchemeId);
                setSelectedSchemeIds([]);
              }
              if (event.ctrlKey) {
                setPanning({ clientX: event.clientX, clientY: event.clientY, viewBox });
              } else {
                const point = lastCanvasPointerRef.current;
                setMarquee({ start: point, current: point });
              }
            }}
            onContextMenu={(event) => {
              event.preventDefault();
              lastCanvasPointerRef.current = clampPointToCanvas(screenToSvgPoint(event.currentTarget, event.clientX, event.clientY));
              if (connectSource) {
                setConnectSource(null);
                setConnectPreviewPoint(null);
                setMode("select");
                return;
              }
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
            {nodes.map((node) => {
              const selected = selectedNodeIds.includes(node.id);
              const isConnectSource = node.id === connectSource?.nodeId;
              const imageHref = nodeImage(node);
              const foregroundImageHref = nodeForegroundImage(node);
              const nodeScaleX = getNodeScaleX(node);
              const nodeScaleY = getNodeScaleY(node);
              const inverseScaleX = nodeScaleX === 0 ? 1 : 1 / nodeScaleX;
              const inverseScaleY = nodeScaleY === 0 ? 1 : 1 / nodeScaleY;
              const controlTransform = (x: number, y: number) => `translate(${x} ${y}) scale(${inverseScaleX} ${inverseScaleY})`;
              const handleGapX = 14 * Math.abs(inverseScaleX);
              const handleGapY = 14 * Math.abs(inverseScaleY);
              const rotateStemStart = 12 * Math.abs(inverseScaleY);
              const rotateStemEnd = 36 * Math.abs(inverseScaleY);
              const rotateHandleGap = 42 * Math.abs(inverseScaleY);
              return (
                <g
                  key={node.id}
                  className={`diagram-node ${isBusNode(node) ? "bus-node" : ""} ${selected ? "selected" : ""} ${isConnectSource ? "connect-source" : ""}`}
                  transform={`translate(${node.position.x} ${node.position.y}) rotate(${node.rotation}) scale(${getNodeScaleX(node)} ${getNodeScaleY(node)})`}
                  onPointerDown={(event) => handleNodePointerDown(event, node)}
                  onDoubleClick={(event) => {
                    event.stopPropagation();
                    if (isBusNode(node)) {
                      return;
                    }
                    setSelectedNodeIds([node.id]);
                    setSelectedEdgeId("");
                    setImageTarget({ kind: "node", nodeId: node.id });
                  }}
                >
                  <title>{node.name}</title>
                  <rect
                    x={-node.size.width / 2}
                    y={-node.size.height / 2}
                    width={node.size.width}
                    height={node.size.height}
                    rx="8"
                    className={`node-hitbox ${isBusNode(node) ? "bus-hitbox" : ""} ${isStaticNode(node) ? "static-hitbox" : ""}`}
                  />
                  {imageHref && !isBusNode(node) && (
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
                  <DeviceGlyph node={node} />
                  {imageHref && !isBusNode(node) && !isStaticNode(node) && (
                    <rect
                      x={-node.size.width / 2}
                      y={-node.size.height / 2}
                      width={node.size.width}
                      height={node.size.height}
                      rx="8"
                      className="node-image-cover"
                    />
                  )}
                  {imageHref && !isBusNode(node) && !isStaticNode(node) && (
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
                  {foregroundImageHref && !isBusNode(node) && (
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
                  {node.terminals.map((terminal) => {
                    const sourceNode = connectSource ? nodeById.get(connectSource.nodeId) : undefined;
                    const hideFixedTerminal = isBusNode(node) || isStaticNode(node);
                    const disabled =
                      !hideFixedTerminal &&
                      mode === "connect" &&
                      Boolean(sourceNode) &&
                      !canConnectTerminals(sourceNode!, connectSource!.terminalId, node, terminal.id);
                    return hideFixedTerminal ? null : (
                      <g
                        key={terminal.id}
                        transform={controlTransform(terminal.anchor.x * node.size.width, terminal.anchor.y * node.size.height)}
                      >
                      <circle
                        className={`terminal-dot ${terminal.type} ${disabled ? "disabled" : ""}`}
                        cx="0"
                        cy="0"
                        r={6}
                        onPointerDown={(event) => handleTerminalPointerDown(event, node, terminal.id)}
                      >
                        <title>{`${terminal.label} / ${terminal.type.toUpperCase()}`}</title>
                      </circle>
                      </g>
                    );
                  })}
                  {selected && selectedCount === 1 && (
                    <g className="transform-handles">
                      <line x1="0" y1={-node.size.height / 2 - rotateStemStart} x2="0" y2={-node.size.height / 2 - rotateStemEnd} />
                      <g transform={controlTransform(0, -node.size.height / 2 - rotateHandleGap)}>
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
                      <g transform={controlTransform(node.size.width / 2 + handleGapX, 0)}>
                        <rect
                          className="scale-handle horizontal"
                          x="-8"
                          y="-8"
                          width="16"
                          height="16"
                          rx="3"
                          onPointerDown={(event) => {
                            event.stopPropagation();
                            setTransformDrag({ kind: "scale-x", nodeId: node.id });
                          }}
                        />
                      </g>
                      <g transform={controlTransform(0, node.size.height / 2 + handleGapY)}>
                        <rect
                          className="scale-handle vertical"
                          x="-8"
                          y="-8"
                          width="16"
                          height="16"
                          rx="3"
                          onPointerDown={(event) => {
                            event.stopPropagation();
                            setTransformDrag({ kind: "scale-y", nodeId: node.id });
                          }}
                        />
                      </g>
                      <g transform={controlTransform(node.size.width / 2 + handleGapX, node.size.height / 2 + handleGapY)}>
                        <rect
                          className="scale-handle proportional"
                          x="-8"
                          y="-8"
                          width="16"
                          height="16"
                          rx="3"
                          onPointerDown={(event) => {
                            event.stopPropagation();
                            setTransformDrag({ kind: "scale-both", nodeId: node.id });
                          }}
                        />
                      </g>
                    </g>
                  )}
                </g>
              );
            })}
            {connectPreviewPath && (
              <path
                d={connectPreviewPath}
                className="connection-preview-line"
              />
            )}
            {selectedRoutedEdge && selectedEdge && (() => {
              const edge = selectedEdge;
              const route = selectedRoutedEdge;
              const sourcePoint = getEdgeEndpointPoint(edge, "source");
              const targetPoint = getEdgeEndpointPoint(edge, "target");
              return (
                <g className="connection-group selected topmost">
                  <path d={route.path} className="connection-hitline" />
                  <path d={route.path} className="connection-line" />
                  {route.points.slice(1).map((point, index) => {
                    const from = route.points[index];
                    const segmentIndex = index;
                    if (segmentIndex === 0 || segmentIndex >= route.points.length - 2) {
                      return null;
                    }
                    const orientation = from.y === point.y ? "horizontal" : "vertical";
                    return (
                      <path
                        key={`segment-${segmentIndex}`}
                        d={`M ${from.x} ${from.y} L ${point.x} ${point.y}`}
                        className={`manual-segment-handle ${orientation}`}
                        onDoubleClick={(event) => insertManualBendPoint(event, edge.id, segmentIndex, route.points)}
                        onPointerDown={(event) => startManualSegmentDrag(event, edge.id, segmentIndex, orientation, route.points)}
                        onContextMenu={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          const removeIndex = segmentIndex > 0 ? segmentIndex : segmentIndex + 1;
                          deleteManualBendPoint(edge.id, removeIndex, route.points);
                        }}
                      />
                    );
                  })}
                  {route.points.slice(2, -2).map((point, index) => {
                    const routePointIndex = index + 2;
                    return (
                      <circle
                        key={`bend-${routePointIndex}`}
                        className="manual-bend-handle"
                        cx={point.x}
                        cy={point.y}
                        r={5.5}
                        onPointerDown={(event) => startManualPointDrag(event, edge.id, routePointIndex, route.points)}
                        onContextMenu={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          deleteManualBendPoint(edge.id, routePointIndex, route.points);
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
                  : currentModelRecord
                    ? "查看当前模型信息"
                    : "选择画布元件查看参数"}
            </p>
          </div>
          <button onClick={deleteSelected} disabled={!selectedNode && !selectedEdge} title="删除选中对象">
            <Trash2 size={17} />
          </button>
        </div>
        {selectedNode || currentModelRecord ? (
          <div className="form-stack">
            <div className="inspector-tabs">
              <button className={inspectorTab === "model" ? "active" : ""} onClick={() => setInspectorTab("model")} disabled={!currentModelRecord}>
                模型信息
              </button>
              <button className={inspectorTab === "graph" ? "active" : ""} onClick={() => setInspectorTab("graph")}>
                图形参数
              </button>
              <button className={inspectorTab === "device" ? "active" : ""} onClick={() => setInspectorTab("device")}>
                设备参数
              </button>
            </div>
            {inspectorTab === "model" && currentModelRecord ? (
              <table className="param-table">
                <tbody>
                  <tr>
                    <th>模型名称</th>
                    <td><input value={currentModelRecord.name} readOnly /></td>
                  </tr>
                  <tr>
                    <th>所属方案</th>
                    <td><input value={selectedSchemeRecord?.name ?? "未选择方案"} readOnly /></td>
                  </tr>
                  <tr>
                    <th>模型更新时间</th>
                    <td><input value={new Date(currentModelRecord.updatedAt).toLocaleString()} readOnly /></td>
                  </tr>
                  <tr>
                    <th>显示宽度</th>
                    <td>
                      <input
                        type="number"
                        min={MIN_CANVAS_WIDTH}
                        max={MAX_CANVAS_WIDTH}
                        step="10"
                        value={canvasWidth}
                        onChange={(event) => updateCanvasSize(Number(event.target.value), canvasHeight)}
                      />
                    </td>
                  </tr>
                  <tr>
                    <th>显示高度</th>
                    <td>
                      <input
                        type="number"
                        min={MIN_CANVAS_HEIGHT}
                        max={MAX_CANVAS_HEIGHT}
                        step="10"
                        value={canvasHeight}
                        onChange={(event) => updateCanvasSize(canvasWidth, Number(event.target.value))}
                      />
                    </td>
                  </tr>
                  <tr>
                    <th>背景色</th>
                    <td>
                      <div className="color-field">
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
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <th>背景图片</th>
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
                    <th>设备数量</th>
                    <td><input value={currentModelRecord.project.nodes.length} readOnly /></td>
                  </tr>
                  <tr>
                    <th>联络线数量</th>
                    <td><input value={currentModelRecord.project.edges.length} readOnly /></td>
                  </tr>
                  <tr>
                    <th>SVG文件</th>
                    <td><input value={`${safeFilePart(currentModelRecord.name)}.svg`} readOnly /></td>
                  </tr>
                  <tr>
                    <th>设备参数文件</th>
                    <td><input value={`${safeFilePart(currentModelRecord.name)}.e`} readOnly /></td>
                  </tr>
                </tbody>
              </table>
            ) : inspectorTab === "graph" && selectedNode ? (
              <table className="param-table">
                <tbody>
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
                    <th>图层顺序</th>
                    <td>
                      <div className="layer-actions">
                        <button type="button" onClick={() => moveSelectedLayer("back")}>置底</button>
                        <button type="button" onClick={() => moveSelectedLayer("backward")}>下移</button>
                        <button type="button" onClick={() => moveSelectedLayer("forward")}>上移</button>
                        <button type="button" onClick={() => moveSelectedLayer("front")}>置顶</button>
                      </div>
                    </td>
                  </tr>
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
                        <th>背景色</th>
                        <td>{renderColorEditor("fillColor", selectedNode.params.fillColor || "transparent", "#ffffff")}</td>
                      </tr>
                      <tr>
                        <th>线条颜色</th>
                        <td>{renderColorEditor("strokeColor", selectedNode.params.strokeColor || "transparent", "#334155")}</td>
                      </tr>
                      <tr>
                        <th>文字颜色</th>
                        <td>{renderColorEditor("textColor", selectedNode.params.textColor || "#111827", "#111827")}</td>
                      </tr>
                      <tr>
                        <th>线条宽度</th>
                        <td><input type="number" min="0" max="20" value={selectedNode.params.lineWidth || "2"} onChange={(event) => updateParam("lineWidth", event.target.value)} /></td>
                      </tr>
                      <tr>
                        <th>边框样式</th>
                        <td>{renderParamEditor("strokeStyle", selectedNode.params.strokeStyle || "solid", false)}</td>
                      </tr>
                      <tr>
                        <th>字号</th>
                        <td><input type="number" min="8" max="160" value={selectedNode.params.fontSize || "24"} onChange={(event) => updateParam("fontSize", event.target.value)} /></td>
                      </tr>
                      <tr>
                        <th>背景图片</th>
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
                        <th>前景色</th>
                        <td>{renderColorEditor("foregroundColor", selectedNode.params.foregroundColor || "", selectedNode.kind.startsWith("dc") || selectedNode.kind.includes("dcdc") ? "#0f766e" : "#2563eb")}</td>
                      </tr>
                      <tr>
                        <th>前景图片</th>
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
            ) : selectedNode ? (
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
                    <th>端子数量</th>
                    <td><input type="number" min="1" max="8" value={selectedNode.terminals.length} onChange={(event) => updateTerminalCount(Number(event.target.value))} /></td>
                  </tr>
                  {selectedNode.terminals.map((terminal) => (
                    <tr key={terminal.id}>
                      <th>{terminal.label}</th>
                      <td>{`${terminal.type.toUpperCase()} / ${terminal.nodeNumber}`}</td>
                    </tr>
                  ))}
                  {Object.entries(selectedNode.params).filter(([key]) => !["backgroundImage", "backgroundImageAssetId", "foregroundColor", "foregroundImage", "foregroundImageAssetId", "fillColor", "strokeColor", "textColor", "lineWidth", "strokeStyle", "fontSize", "fontFamily", "fontWeight", "fontStyle", "textDecoration", "text"].includes(key)).map(([key, value]) => (
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
              <button key={error.id} onClick={() => locateTopologyError(error)} onDoubleClick={() => locateTopologyError(error)}>
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
          <button onClick={() => runContextMenuAction(() => moveSelectedLayer("forward"))} disabled={selectedNodeIds.length === 0}>
            图层向上
          </button>
          <button onClick={() => runContextMenuAction(() => moveSelectedLayer("backward"))} disabled={selectedNodeIds.length === 0}>
            图层向下
          </button>
          <button onClick={() => runContextMenuAction(() => moveSelectedLayer("front"))} disabled={selectedNodeIds.length === 0}>
            图层置顶
          </button>
          <button onClick={() => runContextMenuAction(() => moveSelectedLayer("back"))} disabled={selectedNodeIds.length === 0}>
            图层置底
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


