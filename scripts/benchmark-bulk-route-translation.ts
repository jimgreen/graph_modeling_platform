import { performance } from "node:perf_hooks";
import type { RoutedEdge } from "../src/model";
import {
  createRouteStore,
  routeStorePatchRoutes,
  routeStorePatchRoutesById,
  type RouteStore
} from "../src/routeStore";

type Point = { x: number; y: number };
type BenchEdge = {
  id: string;
  sourceId: string;
  targetId: string;
};

const ROUTE_BULK_TRANSLATE_REBUILD_THRESHOLD = 800;
const WARMUP_RUNS = 5;
const MEASURED_RUNS = 15;
const DELTA: Point = { x: 37, y: 23 };

function route(edgeId: string, index: number): RoutedEdge {
  const x = (index % 160) * 24;
  const y = Math.floor(index / 160) * 18;
  return {
    edgeId,
    points: [
      { x, y },
      { x: x + 80, y },
      { x: x + 80, y: y + 18 },
      { x: x + 140, y: y + 18 }
    ],
    path: `M ${x} ${y} L ${x + 80} ${y} L ${x + 80} ${y + 18} L ${x + 140} ${y + 18}`
  };
}

function translatePointBy(point: Point, shift: Point): Point {
  return {
    x: Math.round(point.x + shift.x),
    y: Math.round(point.y + shift.y)
  };
}

function translateRoutePathBy(path: string, shift: Point): string {
  return path.replace(/([MLQ])\s*([^MLQ]+)/g, (_match, command: string, coordinates: string) => {
    const shiftedCoordinates = coordinates
      .trim()
      .split(/\s+/)
      .map((value: string, index: number) => {
        const parsed = Number(value);
        if (!Number.isFinite(parsed)) {
          return value;
        }
        return String(Math.round(parsed + (index % 2 === 0 ? shift.x : shift.y)));
      })
      .join(" ");
    return `${command} ${shiftedCoordinates}`;
  });
}

function translateRouteBy(item: RoutedEdge, shift: Point): RoutedEdge {
  const points = item.points.map((point) => translatePointBy(point, shift));
  return {
    ...item,
    points,
    path: item.path ? translateRoutePathBy(item.path, shift) : ""
  };
}

function oldBulkTranslateRouteStore(store: RouteStore, routeIds: ReadonlySet<string>, delta: Point): RouteStore {
  const routeUpdates: RoutedEdge[] = [];
  const nextRoutes = store.routes.map((item) => {
    if (!routeIds.has(item.edgeId)) {
      return item;
    }
    const nextRoute = translateRouteBy(item, delta);
    routeUpdates.push(nextRoute);
    return nextRoute;
  });
  if (routeUpdates.length === 0) {
    return store;
  }
  const shouldRebuildRouteStore =
    routeUpdates.length >= ROUTE_BULK_TRANSLATE_REBUILD_THRESHOLD &&
    routeUpdates.length / store.routes.length >= 0.5;
  return shouldRebuildRouteStore
    ? createRouteStore(nextRoutes)
    : routeStorePatchRoutes(store, routeUpdates);
}

function newBulkTranslateRouteStore(store: RouteStore, routeIds: ReadonlySet<string>, delta: Point): RouteStore {
  const shouldRebuildRouteStore =
    routeIds.size >= ROUTE_BULK_TRANSLATE_REBUILD_THRESHOLD &&
    routeIds.size / store.routes.length >= 0.5;
  if (shouldRebuildRouteStore) {
    const routeUpdates: RoutedEdge[] = [];
    const nextRoutes = store.routes.map((item) => {
      if (!routeIds.has(item.edgeId)) {
        return item;
      }
      const nextRoute = translateRouteBy(item, delta);
      routeUpdates.push(nextRoute);
      return nextRoute;
    });
    if (routeUpdates.length === 0) {
      return store;
    }
    return createRouteStore(nextRoutes);
  }
  return routeStorePatchRoutesById(store, routeIds, (item) => translateRouteBy(item, delta)).store;
}

function median(values: number[]) {
  const sorted = [...values].sort((first, second) => first - second);
  return sorted[Math.floor(sorted.length / 2)];
}

function measurePair(oldRun: () => void, newRun: () => void) {
  for (let index = 0; index < WARMUP_RUNS; index += 1) {
    oldRun();
    newRun();
  }
  const oldTimes: number[] = [];
  const newTimes: number[] = [];
  const time = (run: () => void) => {
    const start = performance.now();
    run();
    return performance.now() - start;
  };
  for (let index = 0; index < MEASURED_RUNS; index += 1) {
    if (index % 2 === 0) {
      oldTimes.push(time(oldRun));
      newTimes.push(time(newRun));
    } else {
      newTimes.push(time(newRun));
      oldTimes.push(time(oldRun));
    }
  }
  return {
    oldMedianMs: median(oldTimes),
    newMedianMs: median(newTimes),
    oldMinMs: Math.min(...oldTimes),
    oldMaxMs: Math.max(...oldTimes),
    newMinMs: Math.min(...newTimes),
    newMaxMs: Math.max(...newTimes)
  };
}

function formatMs(value: number) {
  return Number(value.toFixed(2));
}

const scenarios = [
  { name: "sparse", totalRoutes: 12000, movedRoutes: 800 },
  { name: "half", totalRoutes: 12000, movedRoutes: 6000 },
  { name: "all", totalRoutes: 12000, movedRoutes: 12000 }
];

const results = scenarios.map((scenario) => {
  const routes = Array.from({ length: scenario.totalRoutes }, (_item, index) => route(`edge-${index}`, index));
  const store = createRouteStore(routes);
  const routeIds = new Set(routes.slice(0, scenario.movedRoutes).map((item) => item.edgeId));
  const measured = measurePair(
    () => { oldBulkTranslateRouteStore(store, routeIds, DELTA); },
    () => { newBulkTranslateRouteStore(store, routeIds, DELTA); }
  );
  const firstMovedId = `edge-${Math.max(0, scenario.movedRoutes - 1)}`;
  const oldMoved = oldBulkTranslateRouteStore(store, routeIds, DELTA).routeMap.get(firstMovedId);
  const newMoved = newBulkTranslateRouteStore(store, routeIds, DELTA).routeMap.get(firstMovedId);
  if (JSON.stringify(oldMoved) !== JSON.stringify(newMoved)) {
    throw new Error(`Mismatched translated route output for ${scenario.name}`);
  }
  return {
    scenario: scenario.name,
    totalRoutes: scenario.totalRoutes,
    movedRoutes: scenario.movedRoutes,
    oldMedianMs: formatMs(measured.oldMedianMs),
    newMedianMs: formatMs(measured.newMedianMs),
    speedup: Number((measured.oldMedianMs / measured.newMedianMs).toFixed(2)),
    oldRangeMs: `${formatMs(measured.oldMinMs)}-${formatMs(measured.oldMaxMs)}`,
    newRangeMs: `${formatMs(measured.newMinMs)}-${formatMs(measured.newMaxMs)}`
  };
});

console.table(results);

function edgeListsHaveSameOrder(previousEdges: BenchEdge[], nextEdges: BenchEdge[]) {
  if (previousEdges.length !== nextEdges.length) {
    return false;
  }
  for (let index = 0; index < previousEdges.length; index += 1) {
    if (previousEdges[index].id !== nextEdges[index].id) {
      return false;
    }
  }
  return true;
}

function edgeReferenceDiffIds(previousEdges: BenchEdge[], nextEdges: BenchEdge[]) {
  if (edgeListsHaveSameOrder(previousEdges, nextEdges)) {
    const changed = new Set<string>();
    for (let index = 0; index < previousEdges.length; index += 1) {
      if (previousEdges[index] !== nextEdges[index]) {
        changed.add(nextEdges[index].id);
      }
    }
    return changed;
  }
  const previousById = new Map(previousEdges.map((edge) => [edge.id, edge]));
  const nextById = new Map(nextEdges.map((edge) => [edge.id, edge]));
  const changed = new Set<string>();
  for (const edge of nextEdges) {
    if (previousById.get(edge.id) !== edge) {
      changed.add(edge.id);
    }
  }
  for (const edge of previousEdges) {
    if (!nextById.has(edge.id)) {
      changed.add(edge.id);
    }
  }
  return changed;
}

function oldDirtyEdgeIdsAfterMove(
  previousEdges: BenchEdge[],
  nextEdges: BenchEdge[],
  movedNodeIds: ReadonlySet<string>,
  extraEdgeIds: Iterable<string> = []
) {
  const dirty = edgeReferenceDiffIds(previousEdges, nextEdges);
  for (const edge of previousEdges) {
    if (movedNodeIds.has(edge.sourceId) || movedNodeIds.has(edge.targetId)) {
      dirty.add(edge.id);
    }
  }
  for (const edgeId of extraEdgeIds) {
    dirty.add(edgeId);
  }
  return dirty;
}

function oldDirtyEdgeIdsAfterBulkMove(
  previousEdges: BenchEdge[],
  nextEdges: BenchEdge[],
  movedNodeIds: ReadonlySet<string>,
  routeCachePatchedEdgeIds: ReadonlySet<string>,
  extraEdgeIds: Iterable<string> = []
) {
  const dirty = new Set<string>();
  if (edgeListsHaveSameOrder(previousEdges, nextEdges)) {
    for (let index = 0; index < previousEdges.length; index += 1) {
      const previousEdge = previousEdges[index];
      const nextEdge = nextEdges[index];
      const edgeId = nextEdge.id;
      if (previousEdge !== nextEdge && !routeCachePatchedEdgeIds.has(edgeId)) {
        dirty.add(edgeId);
      }
      if ((movedNodeIds.has(previousEdge.sourceId) || movedNodeIds.has(previousEdge.targetId)) && !routeCachePatchedEdgeIds.has(previousEdge.id)) {
        dirty.add(previousEdge.id);
      }
    }
  } else {
    for (const edgeId of edgeReferenceDiffIds(previousEdges, nextEdges)) {
      if (!routeCachePatchedEdgeIds.has(edgeId)) {
        dirty.add(edgeId);
      }
    }
    for (const edge of previousEdges) {
      if ((movedNodeIds.has(edge.sourceId) || movedNodeIds.has(edge.targetId)) && !routeCachePatchedEdgeIds.has(edge.id)) {
        dirty.add(edge.id);
      }
    }
  }
  for (const edgeId of extraEdgeIds) {
    dirty.add(edgeId);
  }
  return dirty;
}

function newDirtyEdgeIdsAfterBulkMove(
  previousEdges: BenchEdge[],
  nextEdges: BenchEdge[],
  movedNodeIds: ReadonlySet<string>,
  routeCachePatchedEdgeIds: ReadonlySet<string>,
  extraEdgeIds: Iterable<string> = []
) {
  if (routeCachePatchedEdgeIds.size === 0) {
    const dirtyIds = oldDirtyEdgeIdsAfterMove(previousEdges, nextEdges, movedNodeIds, extraEdgeIds);
    return { dirtyIds, legacyDirtyCount: dirtyIds.size };
  }
  const dirty = new Set<string>();
  const legacyDirty = new Set<string>();
  const addLegacyAndCurrent = (edgeId: string) => {
    legacyDirty.add(edgeId);
    if (!routeCachePatchedEdgeIds.has(edgeId)) {
      dirty.add(edgeId);
    }
  };
  if (edgeListsHaveSameOrder(previousEdges, nextEdges)) {
    for (let index = 0; index < previousEdges.length; index += 1) {
      const previousEdge = previousEdges[index];
      const nextEdge = nextEdges[index];
      if (previousEdge !== nextEdge) {
        addLegacyAndCurrent(nextEdge.id);
      }
      if (movedNodeIds.has(previousEdge.sourceId) || movedNodeIds.has(previousEdge.targetId)) {
        addLegacyAndCurrent(previousEdge.id);
      }
    }
  } else {
    for (const edgeId of edgeReferenceDiffIds(previousEdges, nextEdges)) {
      addLegacyAndCurrent(edgeId);
    }
    for (const edge of previousEdges) {
      if (movedNodeIds.has(edge.sourceId) || movedNodeIds.has(edge.targetId)) {
        addLegacyAndCurrent(edge.id);
      }
    }
  }
  for (const edgeId of extraEdgeIds) {
    addLegacyAndCurrent(edgeId);
  }
  return { dirtyIds: dirty, legacyDirtyCount: legacyDirty.size };
}

function oldDirtyComparison(
  previousEdges: BenchEdge[],
  nextEdges: BenchEdge[],
  movedNodeIds: ReadonlySet<string>,
  routeCachePatchedEdgeIds: ReadonlySet<string>,
  edgePatchDirtyIds: string[]
) {
  const nonTranslatedEdgePatchDirtyIds = edgePatchDirtyIds.filter((edgeId) => !routeCachePatchedEdgeIds.has(edgeId));
  const legacyMovedRouteDirtyIds = oldDirtyEdgeIdsAfterMove(previousEdges, nextEdges, movedNodeIds, edgePatchDirtyIds);
  const movedRouteDirtyIds = oldDirtyEdgeIdsAfterBulkMove(previousEdges, nextEdges, movedNodeIds, routeCachePatchedEdgeIds, nonTranslatedEdgePatchDirtyIds);
  return {
    legacyDirtyCount: legacyMovedRouteDirtyIds.size,
    routeDirtyCount: movedRouteDirtyIds.size
  };
}

function newDirtyComparison(
  previousEdges: BenchEdge[],
  nextEdges: BenchEdge[],
  movedNodeIds: ReadonlySet<string>,
  routeCachePatchedEdgeIds: ReadonlySet<string>,
  edgePatchDirtyIds: string[]
) {
  const result = newDirtyEdgeIdsAfterBulkMove(previousEdges, nextEdges, movedNodeIds, routeCachePatchedEdgeIds, edgePatchDirtyIds);
  return {
    legacyDirtyCount: result.legacyDirtyCount,
    routeDirtyCount: result.dirtyIds.size
  };
}

function buildDirtyScenario(candidateEdges: number, patchedEdges: number) {
  const previousEdges = Array.from({ length: candidateEdges }, (_item, index): BenchEdge => ({
    id: `edge-${index}`,
    sourceId: `node-${index}`,
    targetId: `node-${index + 1}`
  }));
  const nextEdges = previousEdges.map((edge) => ({ ...edge }));
  const movedNodeIds = new Set<string>();
  for (let index = 0; index <= candidateEdges; index += 1) {
    movedNodeIds.add(`node-${index}`);
  }
  const edgePatchDirtyIds = nextEdges.map((edge) => edge.id);
  const routeCachePatchedEdgeIds = new Set(edgePatchDirtyIds.slice(0, patchedEdges));
  return { previousEdges, nextEdges, movedNodeIds, routeCachePatchedEdgeIds, edgePatchDirtyIds };
}

const dirtyScenarios = [
  { name: "partial-patched", candidateEdges: 12000, patchedEdges: 800 },
  { name: "all-patched", candidateEdges: 12000, patchedEdges: 12000 }
];

const dirtyResults = dirtyScenarios.map((scenario) => {
  const data = buildDirtyScenario(scenario.candidateEdges, scenario.patchedEdges);
  const measured = measurePair(
    () => { oldDirtyComparison(data.previousEdges, data.nextEdges, data.movedNodeIds, data.routeCachePatchedEdgeIds, data.edgePatchDirtyIds); },
    () => { newDirtyComparison(data.previousEdges, data.nextEdges, data.movedNodeIds, data.routeCachePatchedEdgeIds, data.edgePatchDirtyIds); }
  );
  const oldCounts = oldDirtyComparison(data.previousEdges, data.nextEdges, data.movedNodeIds, data.routeCachePatchedEdgeIds, data.edgePatchDirtyIds);
  const newCounts = newDirtyComparison(data.previousEdges, data.nextEdges, data.movedNodeIds, data.routeCachePatchedEdgeIds, data.edgePatchDirtyIds);
  if (JSON.stringify(oldCounts) !== JSON.stringify(newCounts)) {
    throw new Error(`Mismatched dirty counts for ${scenario.name}`);
  }
  return {
    scenario: scenario.name,
    candidateEdges: scenario.candidateEdges,
    patchedEdges: scenario.patchedEdges,
    oldMedianMs: formatMs(measured.oldMedianMs),
    newMedianMs: formatMs(measured.newMedianMs),
    speedup: Number((measured.oldMedianMs / measured.newMedianMs).toFixed(2)),
    oldRangeMs: `${formatMs(measured.oldMinMs)}-${formatMs(measured.oldMaxMs)}`,
    newRangeMs: `${formatMs(measured.newMinMs)}-${formatMs(measured.newMaxMs)}`
  };
});

console.table(dirtyResults);
