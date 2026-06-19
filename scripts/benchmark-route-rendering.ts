import { performance } from "node:perf_hooks";
import {
  createDefaultNode,
  routeEdgesForRendering,
  routeEdgesForIncrementalRendering,
  routeEdgesForStoredRendering,
  type CanvasBounds,
  type Edge,
  type ModelNode,
  type RoutedEdge
} from "../src/model";

/**
 * 基准测试：正交边路由的开销与规模关系（量化 A 项）。
 * - "full open"     → routeEdgesForRendering(全部边)，对应打开方案。
 * - "drag commit"   → routeEdgesForIncrementalRendering(仅受影响边)，对应拖拽落点提交。
 *
 * 复现：
 *   node_modules/.bin/esbuild scripts/benchmark-route-rendering.ts --bundle --platform=node --format=esm --outfile=tmp/bench-route.mjs && node tmp/bench-route.mjs
 */

const SPACING = 140;

function buildGrid(side: number) {
  const nodes: ModelNode[] = [];
  const idAt = (r: number, c: number) => `n_${r}_${c}`;
  for (let r = 0; r < side; r += 1) {
    for (let c = 0; c < side; c += 1) {
      const node = { ...createDefaultNode("ac-switch", { x: 160 + c * SPACING, y: 160 + r * SPACING }) };
      node.id = idAt(r, c);
      nodes.push(node);
    }
  }
  const termOf = new Map(nodes.map((node) => [node.id, node.terminals[0]?.id ?? "t1"]));
  const edges: Edge[] = [];
  for (let r = 0; r < side; r += 1) {
    for (let c = 0; c < side; c += 1) {
      if (c + 1 < side) {
        edges.push({ id: `eh_${r}_${c}`, sourceId: idAt(r, c), targetId: idAt(r, c + 1), sourceTerminalId: termOf.get(idAt(r, c)), targetTerminalId: termOf.get(idAt(r, c + 1)) });
      }
      if (r + 1 < side) {
        edges.push({ id: `ev_${r}_${c}`, sourceId: idAt(r, c), targetId: idAt(r + 1, c), sourceTerminalId: termOf.get(idAt(r, c)), targetTerminalId: termOf.get(idAt(r + 1, c)) });
      }
    }
  }
  const bounds: CanvasBounds = { width: 320 + side * SPACING, height: 320 + side * SPACING };
  // 选中间节点模拟拖拽，受影响边 = 与之相连的边
  const mid = Math.floor(side / 2);
  const movedId = idAt(mid, mid);
  const affectedEdgeIds = new Set(edges.filter((e) => e.sourceId === movedId || e.targetId === movedId).map((e) => e.id));
  return { nodes, edges, bounds, movedId, affectedEdgeIds };
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)]!;
}

function timeIt(fn: () => unknown, warmup: number, runs: number): number {
  for (let i = 0; i < warmup; i += 1) fn();
  const samples: number[] = [];
  for (let i = 0; i < runs; i += 1) {
    const start = performance.now();
    fn();
    samples.push(performance.now() - start);
  }
  return median(samples);
}

console.log(`node ${process.version}\n`);
console.log("side | nodes | edges | app-open stored(ms) | full re-route(ms) | drag-commit(ms) | affected");
console.log("-----|-------|-------|---------------------|-------------------|-----------------|--------");

const sidesEnv = process.env.BENCH_SIDES;
const sides = sidesEnv ? sidesEnv.split(",").map((value) => parseInt(value, 10)) : [12, 20, 28];

for (const side of sides) {
  const { nodes, edges, bounds, movedId, affectedEdgeIds } = buildGrid(side);

  const storedMs = timeIt(() => routeEdgesForStoredRendering(nodes, edges, bounds), 1, 5);
  const fullMs = timeIt(() => routeEdgesForRendering(nodes, edges, bounds), 0, 2);

  // 先得到一份完整路由作为 previousRoutes，再模拟移动中间节点后只重路由受影响边
  const previousRoutes: RoutedEdge[] = routeEdgesForRendering(nodes, edges, bounds);
  const movedNodes = nodes.map((node) =>
    node.id === movedId ? { ...node, position: { x: node.position.x + 37, y: node.position.y + 23 } } : node
  );
  const commitMs = timeIt(
    () => routeEdgesForIncrementalRendering(movedNodes, edges, affectedEdgeIds, bounds, previousRoutes),
    2,
    9
  );

  const fmt = (n: number) => n.toFixed(n < 1 ? 3 : 1);
  console.log(
    `${String(side).padStart(4)} | ${String(nodes.length).padStart(5)} | ${String(edges.length).padStart(5)} | ${fmt(storedMs).padStart(19)} | ${fmt(fullMs).padStart(17)} | ${fmt(commitMs).padStart(15)} | ${String(affectedEdgeIds.size).padStart(7)}`
  );
}
