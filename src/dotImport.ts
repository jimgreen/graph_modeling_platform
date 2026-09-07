// dot 厂站图解析器：把 powsybi sld 输出的 graphviz dot 文本解析为中间图结构。
// 后续 classify/collapse/map 阶段（同一文件追加）基于本结构继续加工。

import type { DeviceKind } from "./model";

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
 * 图收缩：point 与绕组端子并入设备组，设备间直连成 links。
 * R1：point 与所有直接邻居 union；无设备整组丢弃。
 * R3：绕组端子 box 与同名 tripleoctagon union。
 * R4/R5：边重写自环/悬空丢弃并计数。
 */
export function collapseDotGraph(graph: DotGraph): CollapsedDotGraph {
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
  const groupDevices = new Map<string, DotNode[]>();
  for (const node of graph.nodes) {
    if (role(node.id) === "device") {
      const root = find(node.id);
      const list = groupDevices.get(root);
      if (list) list.push(node);
      else groupDevices.set(root, [node]);
    }
  }
  // 端点解析：设备→自身；point/绕组端子→所在组全部设备
  const resolve = (id: string): DotNode[] => {
    if (role(id) === "device") return [nodeById.get(id)!];
    return groupDevices.get(find(id)) ?? [];
  };

  // 输出设备：全部 device 节点按图序（组内多设备并存——A3 两 point 链即此情形）
  const devices = graph.nodes.filter((n) => role(n.id) === "device");

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
