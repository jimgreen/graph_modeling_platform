import { performance } from "node:perf_hooks";
import { readFileSync } from "node:fs";
import {
  routeEdgesForRendering,
  routeEdgesForIncrementalRendering,
  routeEdgesForStoredRendering,
  type CanvasBounds,
  type Edge,
  type ModelNode,
  type RoutedEdge
} from "../src/model";

/**
 * 真实方案路由基准：IEEE118（462 节点 / 175 边，均带已存 routePoints/manualPoints）。
 * 复现：
 *   node_modules/.bin/esbuild scripts/benchmark-ieee118-routing.ts --bundle --platform=node --format=esm --outfile=tmp/bench-ieee.mjs && node tmp/bench-ieee.mjs
 */

const PROJECT_PATH = process.env.BENCH_PROJECT ?? "data/schemes/files/IEEE标准算例/IEEE118.json";
const project = JSON.parse(readFileSync(PROJECT_PATH, "utf-8")) as { nodes: ModelNode[]; edges: Edge[] };
const nodes: ModelNode[] = project.nodes ?? [];
const edges: Edge[] = project.edges ?? [];

function computeBounds(): CanvasBounds {
  let maxX = 0;
  let maxY = 0;
  for (const node of nodes) {
    const halfW = (node.size?.width ?? 0) / 2;
    const halfH = (node.size?.height ?? 0) / 2;
    maxX = Math.max(maxX, node.position.x + halfW);
    maxY = Math.max(maxY, node.position.y + halfH);
  }
  return { width: Math.ceil(maxX + 200), height: Math.ceil(maxY + 200) };
}
const bounds = computeBounds();

// 选引用最多的节点模拟拖拽
const refCount = new Map<string, number>();
for (const edge of edges) {
  refCount.set(edge.sourceId, (refCount.get(edge.sourceId) ?? 0) + 1);
  refCount.set(edge.targetId, (refCount.get(edge.targetId) ?? 0) + 1);
}
let movedId = nodes[0]?.id ?? "";
let movedRefs = 0;
for (const [id, count] of refCount) {
  if (count > movedRefs && nodes.some((node) => node.id === id)) {
    movedId = id;
    movedRefs = count;
  }
}
const movedNodes = nodes.map((node) =>
  node.id === movedId ? { ...node, position: { x: node.position.x + 37, y: node.position.y + 23 } } : node
);
const affectedEdgeIds = new Set(edges.filter((e) => e.sourceId === movedId || e.targetId === movedId).map((e) => e.id));

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

const heavy = process.env.BENCH_HEAVY === "1";
const fmt = (n: number) => `${n.toFixed(2)} ms`;

console.log(`node ${process.version}`);
console.log(`${PROJECT_PATH.split("/").pop()}: ${nodes.length} nodes, ${edges.length} edges, bounds=${bounds.width}x${bounds.height}, moved touches ${affectedEdgeIds.size} edges`);

function report(label: string, fn: () => unknown, warmup: number, runs: number) {
  const ms = timeIt(fn, warmup, runs);
  console.log(`  ${label.padEnd(40)}: ${fmt(ms)}`);
}

// 真实 app 打开路径：水合已存 routePoints（A4 路径）
report("app-open (hydrate saved routePoints)", () => routeEdgesForStoredRendering(nodes, edges, bounds, { preserveManualRouteDisplay: true }), 2, 9);

// 拖拽落点提交（增量，仅受影响边）— A2/A3 影响此路径
const previousRoutes: RoutedEdge[] = routeEdgesForStoredRendering(nodes, edges, bounds, { preserveManualRouteDisplay: true });
report("drag-commit (incremental, affected only)", () => routeEdgesForIncrementalRendering(movedNodes, edges, affectedEdgeIds, bounds, previousRoutes, { preserveManualRouteDisplay: true }), 2, 9);

// 非水合重算（最坏情况，规模大时极慢，仅 BENCH_HEAVY=1 时测）
if (heavy) {
  report("app-open (recompute, NO hydration)", () => routeEdgesForStoredRendering(nodes, edges, bounds), 0, 1);
  report("full obstacle-avoidance re-route", () => routeEdgesForRendering(nodes, edges, bounds), 0, 1);
}
