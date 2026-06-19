import { readFileSync } from "node:fs";
import {
  routeEdgesForStoredRendering,
  routeEdgesForIncrementalRendering,
  type CanvasBounds,
  type Edge,
  type ModelNode,
  type RoutedEdge
} from "../src/model";

// 仅隔离 IEEE118 落点提交（增量路由），便于 node --prof 定位热点函数。
const project = JSON.parse(readFileSync("data/schemes/files/IEEE标准算例/IEEE118.json", "utf-8")) as {
  nodes: ModelNode[];
  edges: Edge[];
};
const nodes = project.nodes;
const edges = project.edges;

let maxX = 0;
let maxY = 0;
for (const node of nodes) {
  maxX = Math.max(maxX, node.position.x + (node.size?.width ?? 0) / 2);
  maxY = Math.max(maxY, node.position.y + (node.size?.height ?? 0) / 2);
}
const bounds: CanvasBounds = { width: Math.ceil(maxX + 200), height: Math.ceil(maxY + 200) };

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
const affected = new Set(edges.filter((e) => e.sourceId === movedId || e.targetId === movedId).map((e) => e.id));
const prev: RoutedEdge[] = routeEdgesForStoredRendering(nodes, edges, bounds, { preserveManualRouteDisplay: true });

const iterations = Number(process.env.ITER ?? 80);
for (let i = 0; i < iterations; i += 1) {
  routeEdgesForIncrementalRendering(movedNodes, edges, affected, bounds, prev, { preserveManualRouteDisplay: true });
}
console.log(`done ${iterations} commit iters, affected=${affected.size}`);
