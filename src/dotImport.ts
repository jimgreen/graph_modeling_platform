// dot 厂站图解析器：把 powsybi sld 输出的 graphviz dot 文本解析为中间图结构。
// 后续 classify/collapse/map 阶段（同一文件追加）基于本结构继续加工。

import { DEFAULT_MODEL_LAYER_ID, DEFAULT_MODEL_LAYER_NAME, makeId } from "./model";
import type { DeviceKind, Edge, ModelNode, Point, ProjectFile, Terminal } from "./model";
import { createDefaultNode } from "./model-node-ops";
import { getTerminalPoint, projectPointToBusCenterline } from "./model-routing";
import { applyVoltageInheritance } from "./voltageInheritance";

export interface DotNode {
  id: string;
  label: string;
  open: boolean;
  shape: string;
  fillcolor: string;
  x: number;
  y: number;
}

export interface DotEdge {
  from: string;
  to: string;
}

export interface DotGraph {
  stationName: string;
  stationId: string;
  nodes: DotNode[];
  edges: DotEdge[];
}

// 节点行：n0 [label="...", shape=rect, fillcolor=yellow, pos="615.0,307.0!"];
// label 内容容忍 \" 转义（Python 端只转义双引号）
const NODE_RE =
  /^\s*(\w+)\s+\[label="((?:[^"\\]|\\.)*)",\s*shape=([^,\]]+),\s*fillcolor=([^,\]]+),\s*pos="([^"]+)"\]\s*;\s*$/;

// 边行：n6 -> n241 [dir=none];
const EDGE_RE = /^\s*(\w+)\s*->\s*(\w+)\s*(?:\[[^\]]*\])?\s*;\s*$/;

// Station 注释行：// Station: 望道变 (6)
const STATION_RE = /^\s*\/\/\s*Station:\s*(.+?)\s*\((\d+)\)\s*$/;

// label 尾部字面 "\n[OPEN]"（反斜杠 n 字符对）标记分位 open
const OPEN_SUFFIX = "\\n[OPEN]";

// label 转义还原：\" -> "（与 Python 端转义方向对应）
const unescapeLabel = (label: string): string => label.replace(/\\"/g, '"');

/**
 * 解析 dot 文本为 DotGraph。
 * 空文件/无 digraph 不抛错，返回空 graph（错误统一由 Task 4 importDotFile 校验）。
 */
export function parseDot(text: string): DotGraph {
  const g: DotGraph = { stationName: "", stationId: "", nodes: [], edges: [] };
  // 先找 Station 注释行（与节点行独立，可先扫）
  for (const line of text.split(/\r?\n/)) {
    const st = line.match(STATION_RE);
    if (st) {
      g.stationName = st[1];
      g.stationId = st[2];
      break;
    }
  }
  for (const line of text.split(/\r?\n/)) {
    const nm = line.match(NODE_RE);
    if (nm) {
      let label = unescapeLabel(nm[2]);
      const open = label.endsWith(OPEN_SUFFIX);
      if (open) label = label.slice(0, -OPEN_SUFFIX.length);
      const [px, py] = nm[5].split(",");
      g.nodes.push({
        id: nm[1],
        label,
        open,
        shape: nm[3],
        fillcolor: nm[4],
        x: parseFloat(px.replace("!", "")),
        y: parseFloat(py.replace("!", "")),
      });
      continue;
    }
    const em = line.match(EDGE_RE);
    if (em) {
      g.edges.push({ from: em[1], to: em[2] });
    }
  }
  return g;
}

// ===== 类型判定（classify）阶段 =====

// 一级映射：dot 外观 `shape|fillcolor` → 平台 DeviceKind（spec §3.1 九条目）
const STYLE_KIND_MAP: Record<string, DeviceKind> = {
  "diamond|green": "ac-breaker",
  "invtriangle|orange": "ac-switch",
  "rect|yellow": "ac-bus",
  "ellipse|lightblue": "ac-load",
  "circle|lightgreen": "ac-generator",
  "house|lightgray": "ac-line",
  "octagon|pink": "ac-capacitor",
  "doubleoctagon|plum": "ac-two-winding-transformer",
  "tripleoctagon|thistle": "ac-three-winding-transformer",
};

// 三绕组变压器外形（绕组端子 fallback 依赖其 label 集合）
const TRIPLE_OCTAGON = "tripleoctagon";

// 节点分类结果：三选一联合（static-rect 置灰样式由 Task 4 装配段处理，此处只判 kind）
export type DotNodeClass =
  | { role: "device"; kind: DeviceKind; flag?: "shunt-assumed-capacitor" }
  | { role: "collapse" }
  | { role: "winding-terminal"; transformerLabel: string };

// 分类上下文：预收集全图信息供单节点判定
export interface ClassifyContext {
  // tripleoctagon 节点 label 集合（box/white fallback 判定同名绕组端子）
  tripleLabels: Set<string>;
}

/**
 * 收集图内全部 tripleoctagon 节点 label 集合，供 classifyDotNode 判定绕组端子。
 */
export function buildClassifyContext(graph: DotGraph): ClassifyContext {
  const tripleLabels = new Set<string>();
  for (const node of graph.nodes) {
    if (node.shape === TRIPLE_OCTAGON) tripleLabels.add(node.label);
  }
  return { tripleLabels };
}

/**
 * 三级类型判定：
 * ① point → collapse（拓扑连接点，不落画布）
 * ② box/white → fallback：label 与 tripleoctagon 同名=绕组端子；SH_ 前缀=ac-capacitor（默认容性）；其余 static-rect
 * ③ shape|fillcolor 查表命中 → device；未命中 → static-rect
 */
export function classifyDotNode(node: DotNode, ctx: ClassifyContext): DotNodeClass {
  if (node.shape === "point") return { role: "collapse" };
  if (node.shape === "box" && node.fillcolor === "white") {
    if (ctx.tripleLabels.has(node.label)) {
      return { role: "winding-terminal", transformerLabel: node.label };
    }
    if (node.label.startsWith("SH_")) {
      return { role: "device", kind: "ac-capacitor", flag: "shunt-assumed-capacitor" };
    }
    return { role: "device", kind: "static-rect" };
  }
  const kind = STYLE_KIND_MAP[`${node.shape}|${node.fillcolor}`];
  return kind ? { role: "device", kind } : { role: "device", kind: "static-rect" };
}

// ===== 图收缩（collapse）阶段 =====

// 收缩后连接：端点均为设备 label（非 n 序号）；
// 同名设备多实例时由 devices 数组出现序（=instance 序号）在 Task 4 消歧
export interface DotLink {
  from: string;
  to: string;
}

// 收缩报告片段（Task 4 并入导入总报告）
export interface CollapseReportPart {
  collapsedCount: number;
  selfLoopDropped: number;
  danglingEdgeDropped: number;
}

export interface CollapsedDotGraph {
  // 收缩后剩余设备：全部 device 节点（原值含坐标，R6；坐标变换留给 Task 4）
  devices: DotNode[];
  links: DotLink[];
  reportPart: CollapseReportPart;
}

/**
 * 收缩并查集与设备组构建（collapse 与电压 BFS 共用）：
 * 返回并查集（find/parent）、端点→设备集解析（resolve）、按根分组的设备表与全设备列表。
 */
function buildCollapseGroups(graph: DotGraph): {
  find: (x: string) => string;
  parent: Map<string, string>;
  resolve: (id: string) => DotNode[];
  deviceGroups: Map<string, DotNode[]>;
  devices: DotNode[];
} {
  const ctx = buildClassifyContext(graph);
  // 节点角色缓存（id → class）
  const cls = new Map<string, DotNodeClass>();
  for (const node of graph.nodes) cls.set(node.id, classifyDotNode(node, ctx));
  const role = (id: string): DotNodeClass["role"] | undefined => cls.get(id)?.role;

  // 简易并查集（父指针 + 路径压缩）
  const parent = new Map<string, string>();
  for (const node of graph.nodes) parent.set(node.id, node.id);
  const find = (x: string): string => {
    let root = x;
    while (parent.get(root) !== root) root = parent.get(root)!;
    while (parent.get(x) !== root) {
      const next = parent.get(x)!;
      parent.set(x, root);
      x = next;
    }
    return root;
  };
  const union = (a: string, b: string): void => {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent.set(ra, rb);
  };

  // R1：point 与所有直接邻居 union；绕组端子与其邻居（含 tripleoctagon）union
  for (const e of graph.edges) {
    const ru = role(e.from);
    const rv = role(e.to);
    if (ru === undefined || rv === undefined) continue; // 悬空端点不参与并组
    if (ru === "collapse" || rv === "collapse" || ru === "winding-terminal" || rv === "winding-terminal") {
      union(e.from, e.to);
    }
  }
  // R3：绕组端子与同名 tripleoctagon union（即使不相邻也生效）
  const triples = graph.nodes.filter((n) => n.shape === TRIPLE_OCTAGON);
  for (const node of graph.nodes) {
    if (role(node.id) === "winding-terminal") {
      const wt = cls.get(node.id) as { role: "winding-terminal"; transformerLabel: string };
      for (const t of triples) {
        if (t.label === wt.transformerLabel) union(node.id, t.id);
      }
    }
  }

  // 节点本体索引（resolve 需返回 DotNode 原值）
  const nodeById = new Map<string, DotNode>();
  for (const node of graph.nodes) nodeById.set(node.id, node);

  // 每组设备集（role=device 成员；供 point/绕组端子端点解析）
  const deviceGroups = new Map<string, DotNode[]>();
  for (const node of graph.nodes) {
    if (role(node.id) === "device") {
      const root = find(node.id);
      const list = deviceGroups.get(root);
      if (list) list.push(node);
      else deviceGroups.set(root, [node]);
    }
  }
  // 端点解析：设备→自身；point/绕组端子→所在组全部设备
  const resolve = (id: string): DotNode[] => {
    if (role(id) === "device") return [nodeById.get(id)!];
    return deviceGroups.get(find(id)) ?? [];
  };

  // 全设备列表（按图序，组内多设备并存——A3 两 point 链即此情形）
  const devices = graph.nodes.filter((n) => role(n.id) === "device");
  return { find, parent, resolve, deviceGroups, devices };
}

/**
 * 图收缩：point 与绕组端子并入设备组，设备间直连成 links。
 * R1：point 与所有直接邻居 union；无设备整组丢弃。
 * R3：绕组端子 box 与同名 tripleoctagon union。
 * R4/R5：边重写自环/悬空丢弃并计数。
 */
export function collapseDotGraph(graph: DotGraph): CollapsedDotGraph {
  const { find, parent, resolve, devices } = buildCollapseGroups(graph);

  // 边重写：端点 → 设备集；两端同单一设备=自环；端点不存在=悬空
  let selfLoopDropped = 0;
  let danglingEdgeDropped = 0;
  const linkSet = new Map<string, DotLink>(); // key=label 对（无向规范化）
  const seenSelfEdge = new Set<string>(); // 自环按无向边去重计数
  for (const e of graph.edges) {
    if (!parent.has(e.from) || !parent.has(e.to)) {
      danglingEdgeDropped++;
      continue;
    }
    const su = resolve(e.from);
    const sv = resolve(e.to);
    if (su.length === 1 && sv.length === 1 && su[0].id === sv[0].id) {
      const key = e.from < e.to ? `${e.from}|${e.to}` : `${e.to}|${e.from}`;
      if (!seenSelfEdge.has(key)) {
        seenSelfEdge.add(key);
        selfLoopDropped++;
      }
      continue;
    }
    // 两端设备集做直积；同名自配对丢弃
    for (const a of su) {
      for (const b of sv) {
        if (a.label === b.label) continue;
        const [x, y] = a.label < b.label ? [a.label, b.label] : [b.label, a.label];
        linkSet.set(`${x}|${y}`, { from: x, to: y });
      }
    }
  }

  return {
    devices,
    links: [...linkSet.values()],
    reportPart: {
      collapsedCount: graph.nodes.length - devices.length,
      selfLoopDropped,
      danglingEdgeDropped,
    },
  };
}

// ===== 朝向（rotation）阶段 =====

// 轴对齐四向方位（平台坐标系 y 向下：dy<0 为上）
type OrientationBearing = "left" | "right" | "up" | "down";

// 向量主轴方向归类（|x|>=|y| 归水平，否则垂直；零向量无方位）
function dominantBearing(vx: number, vy: number): OrientationBearing | undefined {
  if (vx === 0 && vy === 0) return undefined;
  if (Math.abs(vx) >= Math.abs(vy)) return vx < 0 ? "left" : "right";
  return vy < 0 ? "up" : "down";
}

/**
 * 朝向参考提取（spec §3.1）：设备（dot 节点 id）→ 相邻收缩节点坐标列表。
 * 收缩节点 = shape=point 黑点或绕组端子 box（role 非 device）。
 * 坐标仅用于设备朝向判定，不写入 routePoints；collapseDotGraph 语义不变。
 */
export function deviceAdjacentReferencePoints(graph: DotGraph): Map<string, Point[]> {
  const ctx = buildClassifyContext(graph);
  const cls = new Map<string, DotNodeClass>();
  for (const node of graph.nodes) cls.set(node.id, classifyDotNode(node, ctx));
  const nodeById = new Map(graph.nodes.map((n) => [n.id, n] as const));
  const isCollapsedRole = (r?: DotNodeClass["role"]): boolean => r === "collapse" || r === "winding-terminal";
  const refs = new Map<string, Point[]>();
  const push = (id: string, p: Point): void => {
    const list = refs.get(id);
    if (list) list.push(p);
    else refs.set(id, [p]);
  };
  for (const e of graph.edges) {
    const a = nodeById.get(e.from);
    const b = nodeById.get(e.to);
    if (!a || !b) continue;
    const ra = cls.get(a.id)?.role;
    const rb = cls.get(b.id)?.role;
    if (ra === "device" && isCollapsedRole(rb)) push(a.id, { x: b.x, y: b.y });
    else if (rb === "device" && isCollapsedRole(ra)) push(b.id, { x: a.x, y: a.y });
  }
  return refs;
}

// 参考点相对设备中心的方位（零向量=黑点与设备同坐标，不参与朝向，spec §4）
function bearingOf(devicePos: Point, ref: Point): OrientationBearing | undefined {
  return dominantBearing(ref.x - devicePos.x, ref.y - devicePos.y);
}

// 端子锚点在给定旋转下的世界朝向（world = position + R(rotation)·(anchor·size)，与引擎 getTerminalPoint 同语义）
function anchorBearingAtRotation(
  anchor: Point,
  size: { width: number; height: number },
  rotation: number,
): OrientationBearing | undefined {
  const lx = anchor.x * size.width;
  const ly = anchor.y * size.height;
  const rad = (rotation * Math.PI) / 180;
  return dominantBearing(lx * Math.cos(rad) - ly * Math.sin(rad), lx * Math.sin(rad) + ly * Math.cos(rad));
}

/**
 * 设备旋转角（spec §3.2/§4）：取首个参考点方位为目标，在 0/90/180/270 中找最小角，
 * 使某端子锚点（按模板 anchor + size 旋转）朝向该方位。
 * 2 端子设备（默认锚点左右）因此自然满足：垂直参考→90、水平参考→0；
 * 邻侧/多参考点歧义以首个参考点为准；母线（无端子）/无参考点/零向量 → 0 不旋转。
 */
export function deviceRotation(
  node: Pick<ModelNode, "terminals" | "size">,
  refs: Point[],
  devicePos: Point,
): number {
  if (node.terminals.length === 0 || refs.length === 0) return 0;
  const bearings = refs
    .map((ref) => bearingOf(devicePos, ref))
    .filter((b): b is OrientationBearing => b !== undefined);
  if (bearings.length === 0) return 0;
  const target = bearings[0];
  for (const rotation of [0, 90, 180, 270]) {
    if (node.terminals.some((t) => anchorBearingAtRotation(t.anchor, node.size, rotation) === target)) {
      return rotation;
    }
  }
  return 0;
}

// ===== 锚点到锚点正交布线（spec §3.3：拐点 ≤2，预算内避让，超预算接受交叉） =====

// 避让净距：Z 形 lane 由阻挡盒边界再外扩此值（语义同引擎 ROUTE_BLOCKER_PADDING 的最小净距）
const IMPORT_ROUTE_PADDING = 2;

// 阻挡盒（position 为中心；90/270 旋转交换宽高，语义同引擎 bodyVisualBoxForNode）
function importRouteBlockerBox(node: Pick<ModelNode, "position" | "size" | "rotation">): {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
} {
  const swap = Math.abs(Math.sin((node.rotation * Math.PI) / 180)) > 0.5;
  const hw = (swap ? node.size.height : node.size.width) / 2;
  const hh = (swap ? node.size.width : node.size.height) / 2;
  return {
    minX: node.position.x - hw,
    minY: node.position.y - hh,
    maxX: node.position.x + hw,
    maxY: node.position.y + hh,
  };
}

// 轴对齐线段是否与盒相交（含边界）
function segmentIntersectsBox(
  a: Point,
  b: Point,
  box: { minX: number; minY: number; maxX: number; maxY: number },
): boolean {
  if (a.y === b.y) {
    return (
      a.y >= box.minY &&
      a.y <= box.maxY &&
      Math.max(a.x, b.x) >= box.minX &&
      Math.min(a.x, b.x) <= box.maxX
    );
  }
  return (
    a.x >= box.minX &&
    a.x <= box.maxX &&
    Math.max(a.y, b.y) >= box.minY &&
    Math.min(a.y, b.y) <= box.maxY
  );
}

function routeIntersectsBlockers(
  route: Point[],
  boxes: Array<{ minX: number; minY: number; maxX: number; maxY: number }>,
): boolean {
  for (let i = 1; i < route.length; i++) {
    for (const box of boxes) {
      if (segmentIntersectsBox(route[i - 1], route[i], box)) return true;
    }
  }
  return false;
}

// 压缩：去连续重复点与共线中间点
function compactRoute(route: Point[]): Point[] {
  const deduped: Point[] = [];
  for (const p of route) {
    const prev = deduped[deduped.length - 1];
    if (!prev || prev.x !== p.x || prev.y !== p.y) deduped.push(p);
  }
  const result: Point[] = [];
  for (let i = 0; i < deduped.length; i++) {
    const prev = result[result.length - 1];
    const cur = deduped[i];
    const next = deduped[i + 1];
    if (prev && next && ((prev.x === cur.x && cur.x === next.x) || (prev.y === cur.y && cur.y === next.y))) {
      continue; // 共线中间点
    }
    result.push(cur);
  }
  return result;
}

function routeLength(route: Point[]): number {
  let sum = 0;
  for (let i = 1; i < route.length; i++) {
    sum += Math.abs(route[i].x - route[i - 1].x) + Math.abs(route[i].y - route[i - 1].y);
  }
  return sum;
}

/**
 * 锚点到锚点正交布线（spec §3.3）：拐点 ≤ maxCorners（默认 2）。
 * 候选：直连（0 拐）→ L 形两条（1 拐）→ Z 形 lane（2 拐，由与点对走廊相交的阻挡盒边界外扩导出）。
 * 评分：不穿第三方设备优先 → 拐点少 → 路径短；全部候选都穿则接受交叉，取拐点最少/路径最短者。
 * excludedIds 为本边两端点设备 id（端点设备不算阻挡）。
 */
export function orthogonalRouteWithinCorners(
  start: Point,
  end: Point,
  blockers: ModelNode[],
  excludedIds: string[],
  maxCorners = 2,
): Point[] {
  const excluded = new Set(excludedIds);
  const boxes = blockers.filter((n) => !excluded.has(n.id)).map((n) => importRouteBlockerBox(n));
  const rawCandidates: Point[][] = [];
  if (start.x === end.x || start.y === end.y) {
    rawCandidates.push([start, end]); // 直连（0 拐）
  }
  rawCandidates.push([start, { x: end.x, y: start.y }, end]); // L 形（1 拐）
  rawCandidates.push([start, { x: start.x, y: end.y }, end]);
  if (maxCorners >= 2) {
    // Z 形 lane（2 拐）：仅取与点对走廊相交的阻挡盒，lane 落在其边界外扩净距处
    const corridor = {
      minX: Math.min(start.x, end.x),
      maxX: Math.max(start.x, end.x),
      minY: Math.min(start.y, end.y),
      maxY: Math.max(start.y, end.y),
    };
    const horizontalLanes = new Set<number>();
    const verticalLanes = new Set<number>();
    for (const box of boxes) {
      if (box.minX > corridor.maxX || box.maxX < corridor.minX || box.minY > corridor.maxY || box.maxY < corridor.minY) {
        continue;
      }
      horizontalLanes.add(box.minY - IMPORT_ROUTE_PADDING);
      horizontalLanes.add(box.maxY + IMPORT_ROUTE_PADDING);
      verticalLanes.add(box.minX - IMPORT_ROUTE_PADDING);
      verticalLanes.add(box.maxX + IMPORT_ROUTE_PADDING);
    }
    for (const y of horizontalLanes) {
      if (y === start.y || y === end.y) continue;
      rawCandidates.push([start, { x: start.x, y }, { x: end.x, y }, end]);
    }
    for (const x of verticalLanes) {
      if (x === start.x || x === end.x) continue;
      rawCandidates.push([start, { x, y: start.y }, { x, y: end.y }, end]);
    }
  }
  let best: Point[] | undefined;
  let bestCrossing = 0;
  let bestCorners = 0;
  let bestLength = 0;
  for (const raw of rawCandidates) {
    const route = compactRoute(raw);
    if (route.length < 2) continue;
    const crossing = routeIntersectsBlockers(route, boxes) ? 1 : 0;
    const corners = route.length - 2;
    const length = routeLength(route);
    if (
      !best ||
      crossing < bestCrossing ||
      (crossing === bestCrossing && corners < bestCorners) ||
      (crossing === bestCrossing && corners === bestCorners && length < bestLength)
    ) {
      best = route;
      bestCrossing = crossing;
      bestCorners = corners;
      bestLength = length;
    }
  }
  // 兜底：L 形（候选集理论非空，此支防御 start===end 等退化输入）
  return best ?? compactRoute([start, { x: start.x, y: end.y }, end]);
}

// ===== 模型装配（map）阶段 =====

// 导入报告：设备/边计数、类型分布、收缩与丢边计数、开关分位、兜底与容性假设清单、电压推断数
export interface DotImportReport {
  deviceCount: number;
  edgeCount: number;
  kindCounts: Record<DeviceKind, number>;
  collapsedCount: number;
  selfLoopDropped: number;
  danglingEdgeDropped: number;
  openSwitchCount: number;
  unknownStaticCount: number;
  unknownStaticNames: string[];
  shuntAssumedCapacitorNames: string[];
  // 同名多实例设备 label 清单（角色 device 且 label 重复，非绕组端子场景）；
  // 同名设备已按首个实例连接，请人工核查（spec §7：独立实例保留 + 报告计数）
  duplicateLabelNames: string[];
  voltageInferredCount: number;
}

// 装配结果：平台 ProjectFile + 导入报告
export interface DotImportResult {
  project: ProjectFile;
  report: DotImportReport;
}

// 平台设备库缺模板的归类 kind → 真实模板 kind：
// ac-generator 仅是图元变体名（平台交流电源模板为 ac-source）；
// ac-two-winding-transformer 平台以 ac-transformer（双绕组主变）模板实例化
const KIND_TEMPLATE_FALLBACK: Partial<Record<string, DeviceKind>> = {
  "ac-generator": "ac-source",
  "ac-two-winding-transformer": "ac-transformer",
};

// 变压器 = 电压 BFS 边界（写对应端子电压后停止扩展）
const TRANSFORMER_KINDS = new Set<DeviceKind>([
  "ac-transformer",
  "ac-two-winding-transformer",
  "ac-three-winding-transformer",
  "ac-three-winding-transformer-neutral",
]);
const isTransformerKind = (kind: DeviceKind): boolean => TRANSFORMER_KINDS.has(kind);

// INTERNAL_VL 电压前缀：INTERNAL_VL_厂站号_电压_……（如 INTERNAL_VL_6_230_21_FictitiousBus → 230）
// 捕获组取第二段数字（kV 数字字符串，可能带小数）
const INTERNAL_VL_RE = /^INTERNAL_VL_\d+_(\d+(?:\.\d+)?)_/;

/**
 * 模型装配：收缩图转平台 ProjectFile。
 * 坐标：全图 bounding box 归零后平移 (100,100)，y 不取反。
 * 设备：createDefaultNode 实例化 → 覆盖 name=label；[OPEN] 开关 status="0"；static-rect 置灰。
 * 边：每 link 一条 Edge，设备侧端子按几何最近未占用端子分配，母线侧 terminalId 留空。
 * 电压：INTERNAL_VL 前缀节点（母线或连接点）为源，沿 links BFS 传播，变压器为边界。
 */
export function mapDotGraphToModel(graph: DotGraph): DotImportResult {
  const collapsed = collapseDotGraph(graph);

  // —— 坐标变换：bbox 归零后平移 (100,100) ——
  let minX = Infinity;
  let minY = Infinity;
  for (const d of collapsed.devices) {
    minX = Math.min(minX, d.x);
    minY = Math.min(minY, d.y);
  }
  if (!Number.isFinite(minX)) {
    minX = 0;
    minY = 0;
  }
  const ox = 100 - minX;
  const oy = 100 - minY;
  const tx = (d: DotNode): Point => ({ x: d.x + ox, y: d.y + oy });

  // —— 报告累计 ——
  const kindCounts = {} as Record<DeviceKind, number>;
  const unknownStaticNames: string[] = [];
  const shuntAssumedCapacitorNames: string[] = [];
  const duplicateLabels = new Set<string>(); // 同名多实例设备 label（去重收集，图序首次重复即记录）
  let openSwitchCount = 0;
  let extraSelfLoopDropped = 0;

  // —— 设备实例化 ——
  const nodes: ModelNode[] = [];
  const nodeByLabel = new Map<string, ModelNode[]>(); // label → 实例（devices 数组序即 instance 序）
  const modelByDotNode = new Map<DotNode, ModelNode>();
  const ctx = buildClassifyContext(graph);
  // 朝向参考（spec §3.1）：设备 dot 节点 id → 相邻收缩节点坐标，仅用于 rotation 判定
  const orientationRefs = deviceAdjacentReferencePoints(graph);
  for (const d of collapsed.devices) {
    const cls = classifyDotNode(d, ctx);
    const classifiedKind = cls.role === "device" ? cls.kind : "static-rect";
    if (cls.role === "device" && cls.flag === "shunt-assumed-capacitor") {
      shuntAssumedCapacitorNames.push(d.label);
    }
    const kind = KIND_TEMPLATE_FALLBACK[classifiedKind] ?? classifiedKind;
    if (kind === "static-rect") {
      unknownStaticNames.push(d.label);
    }
    const node = createDefaultNode(kind, tx(d));
    node.name = d.label;
    // 朝向（spec §3.2）：据相邻收缩节点方位设置旋转；母线（无端子）与无参考点不旋转
    node.rotation = deviceRotation(node, orientationRefs.get(d.id) ?? [], { x: d.x, y: d.y });
    // [OPEN] 开关分位：status 与 closed_status 同写。
    // 平台状态解析 resolveDeviceStateVisual 对开关类读 closed_status ?? closedStatus ?? status
    // （模板默认 closed_status="1"），只写 status 时画布/CIM 仍按闭合渲染。
    if (kind === "ac-switch" || kind === "ac-breaker") {
      const state = d.open ? "0" : "1";
      node.params.status = state;
      node.params.closed_status = state;
      if (d.open) openSwitchCount++;
    }
    // static-rect 置灰兜底（fillColor 参数名与 static-rect 模板一致）
    if (kind === "static-rect") {
      node.params.fillColor = "#cccccc";
    }
    kindCounts[kind] = (kindCounts[kind] ?? 0) + 1;
    nodes.push(node);
    modelByDotNode.set(d, node);
    const list = nodeByLabel.get(d.label);
    if (list) {
      list.push(node);
      duplicateLabels.add(d.label); // 第二实例起计入同名清单（首实例仍由 [0] 消歧连接）
    } else {
      nodeByLabel.set(d.label, [node]);
    }
  }

  // —— 边构造：端子按参考方位分配（spec §3.2）；母线侧端点投影中心线 ——
  // 链上邻接参考所需的原始图结构（邻接表 / 节点表 / 角色表 / label→首实例 dot 节点）
  const origNodeById = new Map(graph.nodes.map((n) => [n.id, n] as const));
  const origAdjacency = new Map<string, string[]>();
  for (const e of graph.edges) {
    const la = origAdjacency.get(e.from) ?? [];
    la.push(e.to);
    origAdjacency.set(e.from, la);
    const lb = origAdjacency.get(e.to) ?? [];
    lb.push(e.from);
    origAdjacency.set(e.to, lb);
  }
  const clsById = new Map<string, DotNodeClass>();
  for (const node of graph.nodes) clsById.set(node.id, classifyDotNode(node, ctx));
  const firstDotNodeByLabel = new Map<string, DotNode>();
  for (const d of collapsed.devices) {
    if (!firstDotNodeByLabel.has(d.label)) firstDotNodeByLabel.set(d.label, d);
  }
  const isCollapsedId = (id: string): boolean => {
    const r = clsById.get(id)?.role;
    return r === "collapse" || r === "winding-terminal";
  };
  // 链上邻接参考（spec §3.2）：从 from 设备沿收缩节点链 BFS 到 to 设备，
  // 返回路径上第一个收缩节点坐标；直连/不可达返回 undefined（退化为对端设备中心）
  const chainAdjacentReference = (fromDotId: string, toDotId: string): Point | undefined => {
    const visited = new Set<string>([fromDotId]);
    const queue: Array<{ id: string; first?: string }> = [{ id: fromDotId }];
    while (queue.length > 0) {
      const { id, first } = queue.shift()!;
      for (const nb of origAdjacency.get(id) ?? []) {
        if (visited.has(nb)) continue;
        visited.add(nb);
        const nextFirst = first ?? (isCollapsedId(nb) ? nb : undefined);
        if (nb === toDotId) {
          const refNode = nextFirst ? origNodeById.get(nextFirst) : undefined;
          return refNode ? { x: refNode.x, y: refNode.y } : undefined;
        }
        if (isCollapsedId(nb)) queue.push({ id: nb, first: nextFirst }); // 只沿收缩节点扩展，不穿其它设备
      }
    }
    return undefined;
  };

  const usedTerminals = new Map<string, Set<string>>();
  const assignTerminal = (node: ModelNode, refPos: Point): { id?: string; point?: Point } => {
    if (node.terminals.length === 0) return {}; // 母线无端子；端点由母线中心线投影计算
    const used = usedTerminals.get(node.id) ?? new Set<string>();
    // 首选：旋转后锚点朝向参考方位的未占用端子（spec §3.2，不再按对端中心最近）
    const target = dominantBearing(refPos.x - node.position.x, refPos.y - node.position.y);
    const facing = target
      ? node.terminals.find(
          (t) => !used.has(t.id) && anchorBearingAtRotation(t.anchor, node.size, node.rotation) === target,
        )
      : undefined;
    let best: Terminal | undefined = facing;
    if (!best) {
      // 兜底：最近未占用端子（无朝向命中，spec §4）
      let bestDist = Infinity;
      for (const t of node.terminals) {
        if (used.has(t.id)) continue;
        const wx = node.position.x + t.anchor.x * node.size.width;
        const wy = node.position.y + t.anchor.y * node.size.height;
        const dist = (wx - refPos.x) ** 2 + (wy - refPos.y) ** 2;
        if (dist < bestDist) {
          bestDist = dist;
          best = t;
        }
      }
    }
    if (!best) return {};
    used.add(best.id);
    usedTerminals.set(node.id, used);
    // 端点与渲染层严格一致：复用引擎 getTerminalPoint（旋转感知 + 端子外扩）
    return { id: best.id, point: getTerminalPoint(node, best.id) };
  };

  const edges: Edge[] = [];
  const edgeEndpointPairs: Array<{ a: ModelNode; b: ModelNode }> = []; // 供母线宽定型后计算 routePoints
  for (const link of collapsed.links) {
    const a = nodeByLabel.get(link.from)?.[0];
    const b = nodeByLabel.get(link.to)?.[0];
    if (!a || !b) continue; // 防御：label 未命中（收缩保证端点均为设备 label，不应发生）
    if (a === b) {
      extraSelfLoopDropped++; // 同名多实例 from==to 视为自环丢弃
      continue;
    }
    // 源/目标侧参考点：链上邻接收缩节点，无链退化为对端设备中心（spec §3.2）
    const aDot = firstDotNodeByLabel.get(link.from);
    const bDot = firstDotNodeByLabel.get(link.to);
    const aRef = (aDot && bDot ? chainAdjacentReference(aDot.id, bDot.id) : undefined) ?? b.position;
    const bRef = (aDot && bDot ? chainAdjacentReference(bDot.id, aDot.id) : undefined) ?? a.position;
    const sa = assignTerminal(a, aRef);
    const sb = assignTerminal(b, bRef);
    // 母线侧端点：相邻参考点向母线中心线投影（复用引擎 projectPointToBusCenterline）
    const sourcePoint = sa.point ?? (a.kind === "ac-bus" ? projectPointToBusCenterline(a, aRef) : undefined);
    const targetPoint = sb.point ?? (b.kind === "ac-bus" ? projectPointToBusCenterline(b, bRef) : undefined);
    edges.push({
      id: makeId("edge"),
      sourceId: a.id,
      targetId: b.id,
      sourceTerminalId: sa.id,
      targetTerminalId: sb.id,
      sourcePoint,
      targetPoint,
    });
    edgeEndpointPairs.push({ a, b });
  }

  // —— 邻接表（母线宽与电压 BFS 共用） ——
  const nodeById = new Map(nodes.map((n) => [n.id, n]));
  const adjacency = new Map<string, Array<{ neighbor: ModelNode; terminalId?: string }>>();
  for (const e of edges) {
    const a = nodeById.get(e.sourceId);
    const b = nodeById.get(e.targetId);
    if (!a || !b) continue;
    const la = adjacency.get(a.id) ?? [];
    la.push({ neighbor: b, terminalId: e.targetTerminalId });
    adjacency.set(a.id, la);
    const lb = adjacency.get(b.id) ?? [];
    lb.push({ neighbor: a, terminalId: e.sourceTerminalId });
    adjacency.set(b.id, lb);
  }

  // —— 母线宽启发式：max(120, 连接设备 x 范围 + 60) ——
  for (const node of nodes) {
    if (node.kind !== "ac-bus") continue;
    let lo = Infinity;
    let hi = -Infinity;
    for (const nb of adjacency.get(node.id) ?? []) {
      lo = Math.min(lo, nb.neighbor.position.x);
      hi = Math.max(hi, nb.neighbor.position.x);
    }
    if (Number.isFinite(lo)) {
      node.size = { ...node.size, width: Math.max(120, hi - lo + 60) };
    }
  }

  // —— 锚点到锚点正交布线（spec §3.3）：母线宽定型后计算（阻挡盒用最终尺寸） ——
  // 拐点 ≤2 硬约束；预算内优先避让第三方设备，超预算接受交叉。缺端点（端子耗尽等）不写，渲染兜底。
  edges.forEach((edge, i) => {
    const { a, b } = edgeEndpointPairs[i];
    if (!edge.sourcePoint || !edge.targetPoint) return;
    edge.routePoints = orthogonalRouteWithinCorners(edge.sourcePoint, edge.targetPoint, nodes, [a.id, b.id]);
  });

  // —— 电压 BFS：INTERNAL_VL 前缀节点为源，沿 links 传播，变压器为边界 ——
  const written = new Set<string>();
  // 已有电压的节点跳过（BFS 去重）；变压器各端子独立计（三侧电压不同）
  const writtenKey = (node: ModelNode, terminalId?: string): string =>
    isTransformerKind(node.kind) ? `${node.id}|${terminalId ?? ""}` : node.id;
  const writeVoltage = (node: ModelNode, voltage: string, terminalId?: string): void => {
    node.params = applyVoltageInheritance(node, voltage, terminalId);
  };

  let voltageInferredCount = 0;
  const queue: Array<{ node: ModelNode; voltage: string }> = [];
  // 种子：INTERNAL_VL 前缀节点（母线或连接点）及其直接设备邻居。
  // 不能用「收缩组整体播种」——三绕组各侧绕组端子经 R3 并入同一组，
  // 会把变压器另一侧的开关也误播成同一电压；直接邻居播种后 BFS 沿 links
  // 自然覆盖整个收缩组，变压器为边界不会跨侧传播。
  const dotById = new Map(graph.nodes.map((n) => [n.id, n]));
  for (const source of graph.nodes) {
    const m = source.label.match(INTERNAL_VL_RE);
    if (!m) continue;
    const voltage = m[1];
    const seed = (target: ModelNode | undefined): void => {
      if (!target || isTransformerKind(target.kind)) return;
      if (written.has(target.id)) return;
      written.add(target.id);
      writeVoltage(target, voltage); // 源侧 terminalId 传 undefined（母线无端子）
      queue.push({ node: target, voltage });
    };
    // 源自身为设备（母线）→ 直接播种
    seed(modelByDotNode.get(source));
    // 源为 point/连接点 → 直接设备邻居播种
    for (const e of graph.edges) {
      const otherId = e.from === source.id ? e.to : e.to === source.id ? e.from : undefined;
      if (otherId === undefined) continue;
      seed(modelByDotNode.get(dotById.get(otherId)!));
    }
  }
  while (queue.length > 0) {
    const { node, voltage } = queue.shift()!;
    for (const nb of adjacency.get(node.id) ?? []) {
      const key = writtenKey(nb.neighbor, nb.terminalId);
      if (written.has(key)) continue;
      written.add(key);
      writeVoltage(nb.neighbor, voltage, nb.terminalId);
      voltageInferredCount++;
      if (isTransformerKind(nb.neighbor.kind)) continue; // 变压器为电压边界，不再扩展
      queue.push({ node: nb.neighbor, voltage });
    }
  }

  // —— 结果装配 ——
  const project: ProjectFile = {
    version: 1,
    name: graph.stationName ? `${graph.stationName}_${graph.stationId}` : "dot 导入模型",
    layers: [{ id: DEFAULT_MODEL_LAYER_ID, name: DEFAULT_MODEL_LAYER_NAME, visible: true }],
    activeLayerId: DEFAULT_MODEL_LAYER_ID,
    nodes,
    edges,
  };
  const report: DotImportReport = {
    deviceCount: nodes.length,
    edgeCount: edges.length,
    kindCounts,
    collapsedCount: collapsed.reportPart.collapsedCount,
    selfLoopDropped: collapsed.reportPart.selfLoopDropped + extraSelfLoopDropped,
    danglingEdgeDropped: collapsed.reportPart.danglingEdgeDropped,
    openSwitchCount,
    unknownStaticCount: unknownStaticNames.length,
    unknownStaticNames,
    shuntAssumedCapacitorNames,
    duplicateLabelNames: [...duplicateLabels],
    voltageInferredCount,
  };
  return { project, report };
}

/**
 * dot 文本导入入口：parseDot → 校验 → mapDotGraphToModel。
 * 空文件/无 digraph 抛错拒绝（spec §7），不留半成品。
 */
export function importDotFile(text: string): DotImportResult {
  const graph = parseDot(text);
  if (graph.nodes.length === 0) {
    throw new Error("dot 文件为空或格式无法解析，请确认是 powsybi sld 导出的 .dot 文件");
  }
  return mapDotGraphToModel(graph);
}
