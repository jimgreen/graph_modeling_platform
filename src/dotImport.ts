// dot 厂站图解析器：把 powsybi sld 输出的 graphviz dot 文本解析为中间图结构。
// 后续 classify/collapse/map 阶段（同一文件追加）基于本结构继续加工。

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
