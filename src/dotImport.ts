// dot 厂站图解析器：把 powsybi sld 输出的 graphviz dot 文本解析为中间图结构。
// 后续 classify/collapse/map 阶段（同一文件追加）基于本结构继续加工。

import { DEFAULT_MODEL_LAYER_ID, DEFAULT_MODEL_LAYER_NAME, makeId } from "./model";
import type { DeviceKind, Edge, ModelNode, Point, ProjectFile, Terminal } from "./model";
import { createDefaultNode } from "./model-node-ops";
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
      const key = e.from < e.to ? `${e.from} ${e.to}` : `${e.to} ${e.from}`;
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
        linkSet.set(`${x} ${y}`, { from: x, to: y });
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
  let openSwitchCount = 0;
  let extraSelfLoopDropped = 0;

  // —— 设备实例化 ——
  const nodes: ModelNode[] = [];
  const nodeByLabel = new Map<string, ModelNode[]>(); // label → 实例（devices 数组序即 instance 序）
  const modelByDotNode = new Map<DotNode, ModelNode>();
  const ctx = buildClassifyContext(graph);
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
    if (list) list.push(node);
    else nodeByLabel.set(d.label, [node]);
  }

  // —— 边构造：端子按设备侧几何最近未占用端子分配；母线侧留空 ——
  const usedTerminals = new Map<string, Set<string>>();
  const assignTerminal = (node: ModelNode, otherPos: Point): { id?: string; point?: Point } => {
    if (node.terminals.length === 0) return {}; // 母线无端子，terminalId 留空
    const used = usedTerminals.get(node.id) ?? new Set<string>();
    let best: Terminal | undefined;
    let bestDist = Infinity;
    for (const t of node.terminals) {
      if (used.has(t.id)) continue;
      const wx = node.position.x + t.anchor.x * node.size.width;
      const wy = node.position.y + t.anchor.y * node.size.height;
      const dist = (wx - otherPos.x) ** 2 + (wy - otherPos.y) ** 2;
      if (dist < bestDist) {
        bestDist = dist;
        best = t;
      }
    }
    if (!best) return {};
    used.add(best.id);
    usedTerminals.set(node.id, used);
    return {
      id: best.id,
      point: { x: node.position.x + best.anchor.x * node.size.width, y: node.position.y + best.anchor.y * node.size.height },
    };
  };

  const edges: Edge[] = [];
  for (const link of collapsed.links) {
    const a = nodeByLabel.get(link.from)?.[0];
    const b = nodeByLabel.get(link.to)?.[0];
    if (!a || !b) continue; // 防御：label 未命中（收缩保证端点均为设备 label，不应发生）
    if (a === b) {
      extraSelfLoopDropped++; // 同名多实例 from==to 视为自环丢弃
      continue;
    }
    const sa = assignTerminal(a, b.position);
    const sb = assignTerminal(b, a.position);
    edges.push({
      id: makeId("edge"),
      sourceId: a.id,
      targetId: b.id,
      sourceTerminalId: sa.id,
      targetTerminalId: sb.id,
      sourcePoint: sa.point,
      targetPoint: sb.point,
    });
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
