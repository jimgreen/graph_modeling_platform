import type { RoutedEdge } from "./model";

export type RouteRenderBounds = {
  left: number;
  right: number;
  top: number;
  bottom: number;
};

type RouteSpatialQueryState = {
  mark: number;
  seenById: Map<string, number>;
};

export type RouteSpatialIndex = {
  bucketSize: number;
  buckets: Map<string, RoutedEdge[]>;
  routeBucketKeysById: Map<string, string[]>;
  routeBoundsById: Map<string, RouteRenderBounds | null>;
  queryState: RouteSpatialQueryState;
};

export type RouteStore = {
  routeMap: Map<string, RoutedEdge>;
  routeOrder: string[];
  routeIndexById: Map<string, number>;
  routeSpatialIndex: RouteSpatialIndex;
  routes: RoutedEdge[];
};

const ROUTE_SPATIAL_BUCKET_SIZE = 320;

const routeSpatialBucketKey = (x: number, y: number) => `${x}:${y}`;

const nextRouteSpatialQueryMark = (state: RouteSpatialQueryState) => {
  state.mark += 1;
  if (!Number.isSafeInteger(state.mark)) {
    state.mark = 1;
    state.seenById.clear();
  }
  return state.mark;
};

const routeSpatialBucketRange = (bounds: RouteRenderBounds, bucketSize: number) => ({
  left: Math.floor(bounds.left / bucketSize),
  right: Math.floor(bounds.right / bucketSize),
  top: Math.floor(bounds.top / bucketSize),
  bottom: Math.floor(bounds.bottom / bucketSize)
});

const routeIndexMap = (order: readonly string[]) => new Map(order.map((id, index) => [id, index]));

export function routeRenderBounds(route: Pick<RoutedEdge, "points">, padding = 0): RouteRenderBounds | null {
  if (route.points.length === 0) {
    return null;
  }
  let left = route.points[0].x;
  let right = left;
  let top = route.points[0].y;
  let bottom = top;
  for (let index = 1; index < route.points.length; index += 1) {
    const point = route.points[index];
    left = Math.min(left, point.x);
    right = Math.max(right, point.x);
    top = Math.min(top, point.y);
    bottom = Math.max(bottom, point.y);
  }
  return { left: left - padding, right: right + padding, top: top - padding, bottom: bottom + padding };
}

function routeBoundsIntersect(first: RouteRenderBounds, second: RouteRenderBounds) {
  return first.left <= second.right && first.right >= second.left && first.top <= second.bottom && first.bottom >= second.top;
}

function expandRouteBounds(bounds: RouteRenderBounds, padding: number): RouteRenderBounds {
  return {
    left: bounds.left - padding,
    right: bounds.right + padding,
    top: bounds.top - padding,
    bottom: bounds.bottom + padding
  };
}

export function routeSpatialIndexRenderBounds(
  index: RouteSpatialIndex,
  edgeId: string,
  padding = 0
): RouteRenderBounds | null {
  const bounds = index.routeBoundsById.get(edgeId);
  if (!bounds || padding === 0) {
    return bounds ?? null;
  }
  return expandRouteBounds(bounds, padding);
}

export function routeIntersectsRenderBounds(route: Pick<RoutedEdge, "points">, bounds: RouteRenderBounds) {
  const routeBounds = routeRenderBounds(route);
  return Boolean(routeBounds && routeBoundsIntersect(routeBounds, bounds));
}

export function buildRouteSpatialIndex(
  routes: readonly RoutedEdge[],
  bucketSize = ROUTE_SPATIAL_BUCKET_SIZE
): RouteSpatialIndex {
  const buckets = new Map<string, RoutedEdge[]>();
  const routeBucketKeysById = new Map<string, string[]>();
  const routeBoundsById = new Map<string, RouteRenderBounds | null>();
  for (const route of routes) {
    const routeBounds = routeRenderBounds(route);
    routeBoundsById.set(route.edgeId, routeBounds);
    const bounds = routeBounds ? expandRouteBounds(routeBounds, 8) : null;
    if (!bounds) {
      routeBucketKeysById.set(route.edgeId, []);
      continue;
    }
    const range = routeSpatialBucketRange(bounds, bucketSize);
    const routeBucketKeys: string[] = [];
    for (let x = range.left; x <= range.right; x += 1) {
      for (let y = range.top; y <= range.bottom; y += 1) {
        const key = routeSpatialBucketKey(x, y);
        routeBucketKeys.push(key);
        const bucket = buckets.get(key);
        if (bucket) {
          bucket.push(route);
        } else {
          buckets.set(key, [route]);
        }
      }
    }
    routeBucketKeysById.set(route.edgeId, routeBucketKeys);
  }
  return { bucketSize, buckets, routeBucketKeysById, routeBoundsById, queryState: { mark: 0, seenById: new Map() } };
}

function patchRouteSpatialIndex(
  index: RouteSpatialIndex,
  routeUpdates: readonly RoutedEdge[],
  routeDeleteIds: ReadonlySet<string>
) {
  const updateIds = new Set(routeUpdates.map((route) => route.edgeId));
  const removedIds = new Set([...routeDeleteIds, ...updateIds]);
  if (removedIds.size === 0 && routeUpdates.length === 0) {
    return index;
  }

  const buckets = new Map(index.buckets);
  const routeBucketKeysById = new Map(index.routeBucketKeysById);
  const routeBoundsById = new Map(index.routeBoundsById);
  const removedBucketKeys = new Set<string>();
  for (const edgeId of removedIds) {
    for (const key of routeBucketKeysById.get(edgeId) ?? []) {
      removedBucketKeys.add(key);
    }
    routeBucketKeysById.delete(edgeId);
    routeBoundsById.delete(edgeId);
  }
  const copiedBucketKeys = new Set<string>();
  for (const key of removedBucketKeys) {
    const bucket = buckets.get(key);
    if (!bucket) {
      continue;
    }
    const nextBucket = bucket.filter((route) => !removedIds.has(route.edgeId));
    if (nextBucket.length > 0) {
      buckets.set(key, nextBucket);
      copiedBucketKeys.add(key);
    } else {
      buckets.delete(key);
    }
  }

  for (const route of routeUpdates) {
    const routeBounds = routeRenderBounds(route);
    routeBoundsById.set(route.edgeId, routeBounds);
    const bounds = routeBounds ? expandRouteBounds(routeBounds, 8) : null;
    const routeBucketKeys: string[] = [];
    if (bounds) {
      const range = routeSpatialBucketRange(bounds, index.bucketSize);
      for (let x = range.left; x <= range.right; x += 1) {
        for (let y = range.top; y <= range.bottom; y += 1) {
          const key = routeSpatialBucketKey(x, y);
          routeBucketKeys.push(key);
          const bucket = buckets.get(key);
          if (bucket) {
            if (!copiedBucketKeys.has(key)) {
              const copiedBucket = bucket.slice();
              buckets.set(key, copiedBucket);
              copiedBucketKeys.add(key);
              copiedBucket.push(route);
              continue;
            }
            bucket.push(route);
          } else {
            buckets.set(key, [route]);
            copiedBucketKeys.add(key);
          }
        }
      }
    }
    routeBucketKeysById.set(route.edgeId, routeBucketKeys);
  }

  return { ...index, buckets, routeBucketKeysById, routeBoundsById };
}

export function queryRouteSpatialIndex(index: RouteSpatialIndex, bounds: RouteRenderBounds): RoutedEdge[] {
  const range = routeSpatialBucketRange(bounds, index.bucketSize);
  const matches: RoutedEdge[] = [];
  const queryMark = nextRouteSpatialQueryMark(index.queryState);
  const seenById = index.queryState.seenById;
  for (let x = range.left; x <= range.right; x += 1) {
    for (let y = range.top; y <= range.bottom; y += 1) {
      const bucket = index.buckets.get(routeSpatialBucketKey(x, y));
      if (!bucket) {
        continue;
      }
      for (const route of bucket) {
        if (seenById.get(route.edgeId) === queryMark) {
          continue;
        }
        const routeBounds = routeSpatialIndexRenderBounds(index, route.edgeId) ?? routeRenderBounds(route);
        if (!routeBounds || !routeBoundsIntersect(routeBounds, bounds)) {
          continue;
        }
        seenById.set(route.edgeId, queryMark);
        matches.push(route);
      }
    }
  }
  return matches;
}

export function createRouteStore(routes: readonly RoutedEdge[]): RouteStore {
  const routeList = Array.from(routes);
  const routeMap = new Map(routeList.map((route) => [route.edgeId, route]));
  const routeOrder = routeList.map((route) => route.edgeId);
  return {
    routeMap,
    routeOrder,
    routeIndexById: routeIndexMap(routeOrder),
    routeSpatialIndex: buildRouteSpatialIndex(routeList),
    routes: routeList
  };
}

export function routeStoreSetRoutes(store: RouteStore | null | undefined, routes: readonly RoutedEdge[]): RouteStore {
  if (!store) {
    return createRouteStore(routes);
  }
  if (store.routes === routes) {
    return store;
  }
  if (routes.length !== store.routeOrder.length) {
    return createRouteStore(routes);
  }
  const changedRoutes: RoutedEdge[] = [];
  for (let index = 0; index < routes.length; index += 1) {
    const route = routes[index];
    if (store.routeOrder[index] !== route.edgeId) {
      return createRouteStore(routes);
    }
    if (store.routeMap.get(route.edgeId) !== route) {
      changedRoutes.push(route);
    }
  }
  return changedRoutes.length === 0 ? store : routeStorePatchRoutes(store, changedRoutes);
}

export function routeStorePatchRoutes(
  store: RouteStore,
  routeUpdates: Iterable<RoutedEdge>,
  routeDeleteIds: Iterable<string> = []
): RouteStore {
  const updates = Array.from(routeUpdates);
  const deleteIds = new Set([...routeDeleteIds].filter((edgeId) => store.routeMap.has(edgeId)));
  if (updates.length === 0 && deleteIds.size === 0) {
    return store;
  }

  let changed = false;
  let routeMap = store.routeMap;
  let routeList = store.routes;
  let routeOrder = store.routeOrder;
  let routeIndexById = store.routeIndexById;
  let routeSpatialIndex = store.routeSpatialIndex;
  const spatialUpserts: RoutedEdge[] = [];

  const ensureCopied = () => {
    if (changed) {
      return;
    }
    changed = true;
    routeMap = new Map(store.routeMap);
    routeList = store.routes.slice();
  };

  if (deleteIds.size > 0) {
    ensureCopied();
    routeList = routeList.filter((route) => !deleteIds.has(route.edgeId));
    for (const edgeId of deleteIds) {
      routeMap.delete(edgeId);
    }
    routeOrder = routeList.map((route) => route.edgeId);
    routeIndexById = routeIndexMap(routeOrder);
  }

  for (const nextRoute of updates) {
    const previousRoute = routeMap.get(nextRoute.edgeId);
    if (previousRoute === nextRoute) {
      continue;
    }
    ensureCopied();
    const index = routeIndexById.get(nextRoute.edgeId);
    if (index === undefined) {
      routeList.push(nextRoute);
      routeMap.set(nextRoute.edgeId, nextRoute);
      routeOrder = [...routeOrder, nextRoute.edgeId];
      routeIndexById = routeIndexMap(routeOrder);
    } else {
      routeList[index] = nextRoute;
      routeMap.set(nextRoute.edgeId, nextRoute);
    }
    spatialUpserts.push(nextRoute);
  }

  if (changed && (spatialUpserts.length > 0 || deleteIds.size > 0)) {
    routeSpatialIndex = patchRouteSpatialIndex(store.routeSpatialIndex, spatialUpserts, deleteIds);
  }

  return changed
    ? { routeMap, routeOrder, routeIndexById, routeSpatialIndex, routes: routeList }
    : store;
}
