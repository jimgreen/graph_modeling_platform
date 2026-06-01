import type { RoutedEdge } from "./model";

export type RouteRenderBounds = {
  left: number;
  right: number;
  top: number;
  bottom: number;
};

export type RouteSpatialIndex = {
  bucketSize: number;
  buckets: Map<string, RoutedEdge[]>;
  routeBucketKeysById: Map<string, string[]>;
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

export function routeIntersectsRenderBounds(route: Pick<RoutedEdge, "points">, bounds: RouteRenderBounds) {
  const routeBounds = routeRenderBounds(route);
  return Boolean(
    routeBounds &&
      routeBounds.left <= bounds.right &&
      routeBounds.right >= bounds.left &&
      routeBounds.top <= bounds.bottom &&
      routeBounds.bottom >= bounds.top
  );
}

export function buildRouteSpatialIndex(
  routes: readonly RoutedEdge[],
  bucketSize = ROUTE_SPATIAL_BUCKET_SIZE
): RouteSpatialIndex {
  const buckets = new Map<string, RoutedEdge[]>();
  const routeBucketKeysById = new Map<string, string[]>();
  for (const route of routes) {
    const bounds = routeRenderBounds(route, 8);
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
  return { bucketSize, buckets, routeBucketKeysById };
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
  const copiedBucketKeys = new Set<string>();
  for (const edgeId of removedIds) {
    for (const key of routeBucketKeysById.get(edgeId) ?? []) {
      const bucket = buckets.get(key);
      if (!bucket) {
        continue;
      }
      const nextBucket = bucket.filter((route) => route.edgeId !== edgeId);
      if (nextBucket.length > 0) {
        buckets.set(key, nextBucket);
        copiedBucketKeys.add(key);
      } else {
        buckets.delete(key);
        copiedBucketKeys.delete(key);
      }
    }
    routeBucketKeysById.delete(edgeId);
  }

  for (const route of routeUpdates) {
    const bounds = routeRenderBounds(route, 8);
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

  return { ...index, buckets, routeBucketKeysById };
}

export function queryRouteSpatialIndex(index: RouteSpatialIndex, bounds: RouteRenderBounds): RoutedEdge[] {
  const range = routeSpatialBucketRange(bounds, index.bucketSize);
  const matches: RoutedEdge[] = [];
  const seen = new Set<string>();
  for (let x = range.left; x <= range.right; x += 1) {
    for (let y = range.top; y <= range.bottom; y += 1) {
      const bucket = index.buckets.get(routeSpatialBucketKey(x, y));
      if (!bucket) {
        continue;
      }
      for (const route of bucket) {
        if (seen.has(route.edgeId) || !routeIntersectsRenderBounds(route, bounds)) {
          continue;
        }
        seen.add(route.edgeId);
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
