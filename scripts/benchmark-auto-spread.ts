import { performance } from "node:perf_hooks";
import { createHash } from "node:crypto";
import { autoSpreadNodeLayoutUnits, type CanvasLayoutUnit } from "../src/selectionActions";
import { createDefaultNode, type ModelNode } from "../src/model";

// 基准:自动分散(autoSpreadNodeLayoutUnits)。两种场景:
//   pile    = 大量重叠堆叠 → buildOverlapComponents O(U^2)
//   scatter = 很多分散的小重叠组 → nearestNonOverlappingDelta 对 placedRects 反复全扫
// 输出 hash 用于"前后行为完全一致"的校验(布局结果逐节点取整一致)。

const SIZE = 100;

function unitFor(id: string, x: number, y: number): CanvasLayoutUnit {
  const bounds = { left: x, right: x + SIZE, top: y, bottom: y + SIZE };
  return { id: `u-${id}`, kind: "node", nodeIds: [id], edgeIds: [], bounds, layoutBounds: bounds };
}
function nodeAt(id: string, x: number, y: number): ModelNode {
  const node = { ...createDefaultNode("ac-switch", { x: x + SIZE / 2, y: y + SIZE / 2 }) };
  node.id = id;
  return node;
}

function buildPile(count: number) {
  const nodes: ModelNode[] = [];
  const units: CanvasLayoutUnit[] = [];
  const cols = Math.ceil(Math.sqrt(count));
  const step = 30; // step << SIZE → 重叠
  for (let i = 0; i < count; i += 1) {
    const x = (i % cols) * step;
    const y = Math.floor(i / cols) * step;
    nodes.push(nodeAt(`n${i}`, x, y));
    units.push(unitFor(`n${i}`, x, y));
  }
  return { nodes, units };
}

function buildScatter(count: number) {
  const nodes: ModelNode[] = [];
  const units: CanvasLayoutUnit[] = [];
  const pairs = Math.ceil(count / 2);
  const cols = Math.ceil(Math.sqrt(pairs));
  const gap = 400; // 组间距大 → 互不重叠的小组
  let idx = 0;
  for (let p = 0; p < pairs && idx < count; p += 1) {
    const bx = (p % cols) * gap;
    const by = Math.floor(p / cols) * gap;
    for (let k = 0; k < 2 && idx < count; k += 1) {
      const x = bx + k * 40;
      const y = by + k * 40; // 组内两节点重叠
      nodes.push(nodeAt(`n${idx}`, x, y));
      units.push(unitFor(`n${idx}`, x, y));
      idx += 1;
    }
  }
  return { nodes, units };
}

function hashResult(nodes: ModelNode[]): string {
  const s = nodes.map((n) => `${n.id}:${Math.round(n.position.x)},${Math.round(n.position.y)}`).join("|");
  return createHash("sha1").update(s).digest("hex").slice(0, 12);
}
function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)]!;
}

function bench(label: string, build: (n: number) => { nodes: ModelNode[]; units: CanvasLayoutUnit[] }, sizes: number[]) {
  console.log(`\n=== ${label} ===`);
  for (const U of sizes) {
    const { nodes, units } = build(U);
    const bounds = { width: 12000, height: 12000 };
    for (let w = 0; w < 2; w += 1) autoSpreadNodeLayoutUnits(nodes, units, { padding: 4, bounds });
    const times: number[] = [];
    let hash = "";
    for (let r = 0; r < 5; r += 1) {
      const t = performance.now();
      const res = autoSpreadNodeLayoutUnits(nodes, units, { padding: 4, bounds });
      times.push(performance.now() - t);
      hash = hashResult(res);
    }
    console.log(`U=${String(U).padStart(4)} | ${median(times).toFixed(1).padStart(8)} ms | hash=${hash}`);
  }
}

const sizes = [100, 300, 600];
console.log(`node ${process.version}`);
bench("pile (heavy overlap)", buildPile, sizes);
bench("scatter (many small components)", buildScatter, sizes);
