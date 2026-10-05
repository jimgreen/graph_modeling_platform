// routeStore 的空间索引与增量 patch（此前零直呼）
//
// 与 graphStore 同构的一套东西：画布每帧拿到新 routes，靠空间索引做视口裁剪、
// 靠 patch 增量更新。判定写错不报错 —— 只是「线不显示了」或「删掉的线还在桶里」。
//
// 特别要守的是 seenById 去重表：它是跨查询复用的，只增不减，靠 mark 判新旧。
// 漏了那条清理，画布长期编辑（临时边反复建删）会无限累积。
import { describe, expect, it, test } from "vitest";
import {
  buildRouteSpatialIndex,
  createRouteStore,
  queryRouteSpatialIndex,
  routeIntersectsRenderBounds,
  routeRenderBounds,
  routeSpatialIndexRenderBounds,
  routeStorePatchRoutes,
  routeStorePatchRoutesById,
  routeStoreSetRoutes,
  type RouteRenderBounds
} from "./routeStore";
import type { Point, RoutedEdge } from "./model";

// ─── 测试辅助 ─────────────────────────────────────────────

function makeRoute(edgeId: string, points: Point[]): RoutedEdge {
  return {
    edgeId,
    points,
    path: points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ")
  };
}

const at = (x: number, y: number): Point => ({ x, y });

function bounds(left: number, top: number, right: number, bottom: number): RouteRenderBounds {
  return { left, top, right, bottom };
}

const edgeIds = (routes: readonly RoutedEdge[]) => routes.map((route) => route.edgeId).sort();

// ─── routeRenderBounds ────────────────────────────────────

describe("routeStore / routeRenderBounds", () => {
  it("无点返回 null（不产出退化包围盒）", () => {
    expect(routeRenderBounds({ points: [] })).toBeNull();
  });

  it("单点产出零尺寸包围盒", () => {
    expect(routeRenderBounds({ points: [at(10, 20)] })).toEqual(bounds(10, 20, 10, 20));
  });

  it("多点取各轴极值，不受点序影响", () => {
    const forward = routeRenderBounds({ points: [at(0, 0), at(100, 50), at(-20, 80)] })!;
    const reversed = routeRenderBounds({ points: [at(-20, 80), at(100, 50), at(0, 0)] })!;
    expect(forward).toEqual(bounds(-20, 0, 100, 80));
    expect(reversed).toEqual(forward);
  });

  it("padding 向四周对称外扩", () => {
    expect(routeRenderBounds({ points: [at(0, 0), at(10, 10)] }, 5)).toEqual(bounds(-5, -5, 15, 15));
  });

  it("padding 缺省为 0（不外扩）", () => {
    expect(routeRenderBounds({ points: [at(0, 0), at(10, 10)] })).toEqual(bounds(0, 0, 10, 10));
  });

  it("负坐标也正确（Math.floor 分桶要处理负数）", () => {
    expect(routeRenderBounds({ points: [at(-100, -50), at(-10, -5)] })).toEqual(bounds(-100, -50, -10, -5));
  });
});

// ─── routeIntersectsRenderBounds ──────────────────────────

describe("routeStore / routeIntersectsRenderBounds", () => {
  const route = { points: [at(0, 0), at(100, 100)] };

  it("重叠 ⇒ true", () => {
    expect(routeIntersectsRenderBounds(route, bounds(50, 50, 150, 150))).toBe(true);
  });

  it("完全分离 ⇒ false", () => {
    expect(routeIntersectsRenderBounds(route, bounds(200, 200, 300, 300))).toBe(false);
  });

  it("边界贴合算相交（<= 而非 <）", () => {
    expect(routeIntersectsRenderBounds(route, bounds(100, 0, 200, 100))).toBe(true);
  });

  it("完全包含（查询框小、路线大）⇒ true", () => {
    expect(routeIntersectsRenderBounds(route, bounds(40, 40, 50, 50))).toBe(true);
  });

  it("空路线 ⇒ false", () => {
    expect(routeIntersectsRenderBounds({ points: [] }, bounds(0, 0, 10, 10))).toBe(false);
  });
});

// ─── buildRouteSpatialIndex / queryRouteSpatialIndex ──────

describe("routeStore / 空间索引查询", () => {
  it("空索引查询返回空数组", () => {
    expect(queryRouteSpatialIndex(buildRouteSpatialIndex([]), bounds(0, 0, 100, 100))).toEqual([]);
  });

  it("跨多个桶的路线只出现一次（seenById 去重）", () => {
    // bucketSize 默认 320，这条线横跨多个桶，若不去重会重复命中
    const long = makeRoute("long", [at(0, 0), at(2000, 0)]);
    const index = buildRouteSpatialIndex([long]);
    const hits = queryRouteSpatialIndex(index, bounds(-100, -100, 2100, 100));
    expect(hits.map((route) => route.edgeId)).toEqual(["long"]);
  });

  // seenById 是跨查询复用的去重标记表，只增不减。画布长期编辑（临时边反复建删）
  // 会让它无限累积，所以超过上限要清空重建、mark 归零。漏掉这条不是显形 bug，
  // 只是内存单调上涨 —— 断言必须直接落在表的规模上。
  it("seenById 超过上限时清空重建，mark 归零后从 1 递增（不会撞号）", () => {
    const index = buildRouteSpatialIndex([makeRoute("a", [at(0, 0), at(10, 10)])]);
    for (let i = 0; i < 20000; i += 1) {
      index.queryState.seenById.set(`已删除的边${i}`, i);
    }
    expect(index.queryState.seenById.size).toBeGreaterThan(16384);

    queryRouteSpatialIndex(index, bounds(-100, -100, 100, 100));

    expect(index.queryState.seenById.size).toBeLessThan(100);
    // mark 归零后重新自增，不会与残留 entry 撞号
    expect(index.queryState.mark).toBe(1);
    expect(queryRouteSpatialIndex(index, bounds(-100, -100, 100, 100))).toHaveLength(1);
  });

  it("seenById 未超上限时不清空（正常查询不丢历史）", () => {
    const index = buildRouteSpatialIndex([makeRoute("a", [at(0, 0), at(10, 10)])]);
    queryRouteSpatialIndex(index, bounds(-100, -100, 100, 100));
    const sizeAfterFirst = index.queryState.seenById.size;
    expect(sizeAfterFirst).toBe(1);
    queryRouteSpatialIndex(index, bounds(-100, -100, 100, 100));
    // 同一批 id 复用 entry，不增长
    expect(index.queryState.seenById.size).toBe(sizeAfterFirst);
  });

  it("同一路线多次查询结果稳定（mark 判新旧）", () => {
    const index = buildRouteSpatialIndex([makeRoute("a", [at(0, 0), at(10, 10)])]);
    expect(queryRouteSpatialIndex(index, bounds(-50, -50, 50, 50))).toHaveLength(1);
    expect(queryRouteSpatialIndex(index, bounds(-50, -50, 50, 50))).toHaveLength(1);
    expect(queryRouteSpatialIndex(index, bounds(-50, -50, 50, 50))).toHaveLength(1);
  });

  it("查询框外的路线不返回", () => {
    const index = buildRouteSpatialIndex([
      makeRoute("near", [at(0, 0), at(10, 10)]),
      makeRoute("far", [at(5000, 5000), at(5010, 5010)])
    ]);
    expect(edgeIds(queryRouteSpatialIndex(index, bounds(-100, -100, 100, 100)))).toEqual(["near"]);
  });

  it("同一路线同时落在桶内但包围盒不重叠时被精确过滤掉", () => {
    // 桶是粗筛，精确相交判定才是准绳：把 padding 设 0 并让两条线共桶但不重叠
    const a = makeRoute("a", [at(0, 0), at(1, 0)]);
    const b = makeRoute("b", [at(300, 0), at(301, 0)]);
    const index = buildRouteSpatialIndex([a, b], 1000);
    const hits = edgeIds(queryRouteSpatialIndex(index, bounds(0, 0, 10, 10)));
    expect(hits).toEqual(["a"]);
  });

  it("空 points 的路线进索引但永不被查询命中", () => {
    const index = buildRouteSpatialIndex([makeRoute("empty", [])]);
    expect(index.routeBoundsById.get("empty")).toBeNull();
    expect(queryRouteSpatialIndex(index, bounds(-1e6, -1e6, 1e6, 1e6))).toEqual([]);
  });

  it("自定义 bucketSize 生效", () => {
    const index = buildRouteSpatialIndex([makeRoute("a", [at(0, 0), at(10, 10)])], 10);
    expect(index.bucketSize).toBe(10);
    expect(index.buckets.size).toBeGreaterThan(1);
  });

  it("负坐标分桶：桶键可被同 key 命中", () => {
    const index = buildRouteSpatialIndex([makeRoute("neg", [at(-100, -100), at(-50, -50)])], 50);
    expect(queryRouteSpatialIndex(index, bounds(-120, -120, -10, -10)).map((r) => r.edgeId)).toEqual(["neg"]);
  });

  // 上��那条用的 -100 / 50 恰好整除，floor 与 trunc 同值 —— 换成非整除才区分得开。
  // 负坐标下 floor(-120/50) = -3 而 trunc = -2：分桶键差一格，用 trunc 的话落进去的
  // 路线在查询时会对不上自己的桶，表现为「视口拖到负坐标区，线不显示」。
  it("负坐标非整除时用 floor 分桶（trunc 会差一格导致查不到）", () => {
    const index = buildRouteSpatialIndex([makeRoute("neg", [at(-120, -120), at(-60, -60)])], 50);
    const keys = index.routeBucketKeysById.get("neg")!;
    // 路线覆盖 (-120,-120)..(-60,-60)，四格全占：floor 给 -3 与 -2 两档
    expect(keys).toEqual(expect.arrayContaining(["-3:-3", "-3:-2", "-2:-3", "-2:-2"]));
    expect(queryRouteSpatialIndex(index, bounds(-130, -130, -50, -50)).map((r) => r.edgeId)).toEqual(["neg"]);
  });

  it("负坐标四轴各自 floor：跨轴分桶键正确", () => {
    // -120/50 = -2.4 → floor -3；-60/50 = -1.2 → floor -2
    const index = buildRouteSpatialIndex([makeRoute("neg", [at(-120, -60), at(-60, -120)])], 50);
    const keys = index.routeBucketKeysById.get("neg")!;
    expect(keys).toContain("-3:-2");
    expect(keys).toContain("-2:-3");
  });

  it("routeSpatialIndexRenderBounds 缺省不外扩，padding 时外扩", () => {
    const index = buildRouteSpatialIndex([makeRoute("a", [at(0, 0), at(10, 10)])]);
    expect(routeSpatialIndexRenderBounds(index, "a")).toEqual(bounds(0, 0, 10, 10));
    expect(routeSpatialIndexRenderBounds(index, "a", 5)).toEqual(bounds(-5, -5, 15, 15));
  });

  it("routeSpatialIndexRenderBounds 对未知 id 返回 null", () => {
    const index = buildRouteSpatialIndex([]);
    expect(routeSpatialIndexRenderBounds(index, "幽灵")).toBeNull();
  });
});

// ─── 非法 bucketSize 与退化查询框 ─────────────────────────
//
// 桶区间是 `Math.floor(坐标 / bucketSize)` 再逐格 `x += 1` 扫过去的，所以分母一旦非法，
// 不是「结果算错一点」而是直接把区间毁掉：
//   bucketSize = 0 → 区间塌成 Infinity~Infinity，`x <= right` 恒真 ⇒ 建索引/查询死循环；
//   查询框含 ±Infinity → 同样从 -Infinity 爬到 +Infinity，永不收敛。
// 两条都必须有限时间返回，否则画布一帧就把主线程钉死。
//
// ⚠ 这里所有断言都写在修复之后的代码上。修复前用 bucketSize: 0 调 buildRouteSpatialIndex
// 会真的挂死整个 vitest 进程（连超时都救不回来，只能杀进程），所以不要为了「先红后绿」
// 把非法 bucketSize 塞进修复前的代码里跑一遍 —— 挂死的推演记录在上面的注释里。

const BUCKET_FALLBACK = 320; // ROUTE_SPATIAL_BUCKET_SIZE（私有常量，测试只能硬写）

const degenerateRoutes = () => [
  makeRoute("near", [at(10, 10), at(40, 40)]),
  makeRoute("far", [at(5000, 5000), at(5010, 5010)])
];

describe("routeStore / 非法 bucketSize", () => {
  test("bucketSize 为 0 时回落到默认桶宽，查询有限时间返回", () => {
    // 修复前：range 全是 Infinity，addRouteSpatialEntry 的双层 for 永不退出。
    const index = buildRouteSpatialIndex(degenerateRoutes(), 0);
    expect(index.bucketSize).toBe(BUCKET_FALLBACK);
    // 桶键必须有限，且确实覆盖了坐标所在的那几格 —— 不能只是「不挂」
    expect(index.routeBucketKeysById.get("near")).toEqual(expect.arrayContaining(["0:0"]));
    expect(edgeIds(queryRouteSpatialIndex(index, bounds(-100, -100, 100, 100)))).toEqual(["near"]);
    expect(edgeIds(queryRouteSpatialIndex(index, bounds(4900, 4900, 5100, 5100)))).toEqual(["far"]);
  });

  test("bucketSize 为负数时同样回落（负数会让区间倒挂成空区间，线全部丢失）", () => {
    // 修复前：floor(10 / -10) = -1 > floor(40 / -10) = -4，区间倒挂 ⇒ 桶全空，线静默消失
    const index = buildRouteSpatialIndex(degenerateRoutes(), -10);
    expect(index.bucketSize).toBe(BUCKET_FALLBACK);
    expect(edgeIds(queryRouteSpatialIndex(index, bounds(-100, -100, 100, 100)))).toEqual(["near"]);
  });

  test("bucketSize 为 NaN 时回落（NaN 坐标会让比较条件恒假，同样丢线）", () => {
    const index = buildRouteSpatialIndex(degenerateRoutes(), Number.NaN);
    expect(index.bucketSize).toBe(BUCKET_FALLBACK);
    expect(edgeIds(queryRouteSpatialIndex(index, bounds(-100, -100, 100, 100)))).toEqual(["near"]);
  });

  test("bucketSize 为 Infinity 时回落（所有坐标 / Infinity 挤进 0:0，粗筛失效）", () => {
    // 修复前：任意坐标 / Infinity = 0，两条线全落进 0:0 单桶
    const index = buildRouteSpatialIndex(degenerateRoutes(), Number.POSITIVE_INFINITY);
    expect(index.bucketSize).toBe(BUCKET_FALLBACK);
    expect(index.routeBucketKeysById.get("near")).toEqual(expect.arrayContaining(["0:0"]));
    expect(edgeIds(queryRouteSpatialIndex(index, bounds(4900, 4900, 5100, 5100)))).toEqual(["far"]);
  });

  test("非法 bucketSize 与显式传默认值产出完全一致的索引", () => {
    // 断言「回落」而不是「随便取个别的值」：桶键集合、桶数都应逐格相同
    const routes = degenerateRoutes();
    const fallback = buildRouteSpatialIndex(routes, BUCKET_FALLBACK);
    for (const bad of [0, -10, Number.NaN, Number.POSITIVE_INFINITY]) {
      const index = buildRouteSpatialIndex(routes, bad);
      expect([...index.routeBucketKeysById.keys()].sort()).toEqual([...fallback.routeBucketKeysById.keys()].sort());
      expect(index.routeBucketKeysById.get("far")).toEqual(fallback.routeBucketKeysById.get("far"));
      expect([...index.buckets.keys()].sort()).toEqual([...fallback.buckets.keys()].sort());
    }
  });

  test("正常正 bucketSize 不被改写，粒度照旧生效", () => {
    // 回归：归一化只拦非法值，正常值必须原样落桶（显式传默认值 ⇒ 与不传等价）
    const routes = degenerateRoutes();
    const explicit = buildRouteSpatialIndex(routes, BUCKET_FALLBACK);
    const implicit = buildRouteSpatialIndex(routes);
    expect(explicit.bucketSize).toBe(BUCKET_FALLBACK);
    expect(explicit.routeBucketKeysById.get("far")).toEqual(implicit.routeBucketKeysById.get("far"));

    // 合法小值粒度更细：far 横跨 5000..5010，默认桶宽下压进 4 格，桶宽 10 则压进 26 格
    const fine = buildRouteSpatialIndex(routes, 10);
    expect(fine.bucketSize).toBe(10);
    expect(fine.routeBucketKeysById.get("far")!.length).toBeGreaterThan(
      explicit.routeBucketKeysById.get("far")!.length
    );
    expect(edgeIds(queryRouteSpatialIndex(fine, bounds(4900, 4900, 5100, 5100)))).toEqual(["far"]);
  });

  test("非法 bucketSize 落下的桶键全是有限值，没有 Infinity 或 NaN", () => {
    // 修复前 bucketSize = 0 时桶键就是字符串 Infinity:Infinity
    // （patchRouteSpatialIndex 复用 index.bucketSize 重算区间，所以这层也得干净）
    const index = buildRouteSpatialIndex(degenerateRoutes(), 0);
    const keys = [...index.routeBucketKeysById.values()].flat();
    expect(keys.length).toBeGreaterThan(0);
    for (const key of keys) {
      expect(key).not.toMatch(/Infinity|NaN/);
    }
    expect(index.routeBucketKeysById.get("far")).toEqual(["15:15"]);
  });
});

describe("routeStore / 退化查询框", () => {
  test("查询框含 NaN 时有限时间返回空集", () => {
    // 精确复核的四个比较里只要有一个是 NaN，整条 routeBoundsIntersect 就是 false，
    // 所以 NaN 查询框的确定结果是空集 —— 断言「空集」而不是「随便什么都行」
    const index = buildRouteSpatialIndex(degenerateRoutes());
    expect(queryRouteSpatialIndex(index, bounds(Number.NaN, -100, 100, 100))).toEqual([]);
    expect(queryRouteSpatialIndex(index, bounds(-100, Number.NaN, 100, 100))).toEqual([]);
    expect(queryRouteSpatialIndex(index, bounds(-100, -100, Number.NaN, 100))).toEqual([]);
    expect(queryRouteSpatialIndex(index, bounds(-100, -100, 100, Number.NaN))).toEqual([]);
  });

  test("查询框含 Infinity 时有限时间返回全集", () => {
    // 修复前：range 从 -Infinity 爬到 +Infinity，双层 for 永不退出
    // 修复后走「遍历实际存在的桶」，精确复核对 ±Infinity 一律判 true ⇒ 全部命中
    const index = buildRouteSpatialIndex(degenerateRoutes());
    const hits = edgeIds(queryRouteSpatialIndex(index, bounds(-Infinity, -Infinity, Infinity, Infinity)));
    expect(hits).toEqual(["far", "near"]);
  });

  test("半无限查询框按精确复核裁剪，不返回框外的线", () => {
    // 只有 right/top 是 Infinity、bottom 是有限值 ⇒ 纵向区间仍然收窄
    const index = buildRouteSpatialIndex(degenerateRoutes());
    const hits = edgeIds(queryRouteSpatialIndex(index, bounds(-Infinity, -Infinity, Infinity, 100)));
    expect(hits).toEqual(["near"]);
  });

  test("查询框只有纵向是半无限（上界 -Infinity）时也有限时间返回", () => {
    // 横向 left/right 都是有限值 —— 只守 x 轴的守卫会漏掉这一支：
    // 外层 x 循环正常跑，内层 y 从 -Infinity 起步逐格 +1，永远到不了有限的下界
    const index = buildRouteSpatialIndex(degenerateRoutes());
    expect(edgeIds(queryRouteSpatialIndex(index, bounds(-100, -Infinity, 100, 100)))).toEqual(["near"]);
  });

  test("退化查询框不污染 seenById 与 mark，后续正常查询仍正确", () => {
    // 去重标记表跨查询复用：退化查询若留下脏 mark，会让紧随其后的正常查询误判为重复而丢线
    const index = buildRouteSpatialIndex(degenerateRoutes());
    expect(edgeIds(queryRouteSpatialIndex(index, bounds(-100, -100, 100, 100)))).toEqual(["near"]);
    const markAfterNormal = index.queryState.mark;
    queryRouteSpatialIndex(index, bounds(Number.NaN, 0, 0, 0));
    queryRouteSpatialIndex(index, bounds(-Infinity, -Infinity, Infinity, Infinity));
    expect(index.queryState.mark).toBe(markAfterNormal + 2);
    expect(edgeIds(queryRouteSpatialIndex(index, bounds(-100, -100, 100, 100)))).toEqual(["near"]);
    expect(edgeIds(queryRouteSpatialIndex(index, bounds(4900, 4900, 5100, 5100)))).toEqual(["far"]);
  });

  test("退化查询框走增量 patch 后索引依然可用", () => {
    const store = createRouteStore(degenerateRoutes());
    const patched = routeStorePatchRoutes(store, [makeRoute("moved", [at(5000, 5000), at(5010, 5010)])]);
    const hits = edgeIds(queryRouteSpatialIndex(patched.routeSpatialIndex, bounds(4900, 4900, 5100, 5100)));
    expect(hits).toEqual(["far", "moved"]);
  });
});

// ─── createRouteStore ─────────────────────────────────────

describe("routeStore / createRouteStore", () => {
  it("空输入产出空 store", () => {
    const store = createRouteStore([]);
    expect(store.routes).toEqual([]);
    expect(store.routeOrder).toEqual([]);
    expect(store.routeIndexById.size).toBe(0);
  });

  it("routeIndexById 记录下标，routeMap 记录对象", () => {
    const a = makeRoute("a", [at(0, 0)]);
    const store = createRouteStore([a, makeRoute("b", [at(1, 1)])]);
    expect(store.routeIndexById.get("b")).toBe(1);
    expect(store.routeMap.get("a")).toBe(a);
  });

  it("复制输入数组，不与调用方共享引用", () => {
    const routes = [makeRoute("a", [at(0, 0)])];
    expect(createRouteStore(routes).routes).not.toBe(routes);
  });
});

// ─── routeStoreSetRoutes ──────────────────────────────────

describe("routeStore / routeStoreSetRoutes", () => {
  it("store 为空时建新 store", () => {
    const store = createRouteStore([]);
    const next = routeStoreSetRoutes(store, [makeRoute("a", [at(0, 0)])]);
    expect(next.routeOrder).toEqual(["a"]);
  });

  it("传入同一数组引用时原样返回 store", () => {
    const store = createRouteStore([makeRoute("a", [at(0, 0)])]);
    expect(routeStoreSetRoutes(store, store.routes)).toBe(store);
  });

  it("内容完全未变时返回同一个 store（引用相等）", () => {
    const a = makeRoute("a", [at(0, 0)]);
    const store = createRouteStore([a]);
    expect(routeStoreSetRoutes(store, [a])).toBe(store);
  });

  it("长度或顺序变化时退回整表重建", () => {
    const a = makeRoute("a", [at(0, 0)]);
    const b = makeRoute("b", [at(1, 1)]);
    const store = createRouteStore([a, b]);
    const swapped = routeStoreSetRoutes(store, [b, a]);
    expect(swapped).not.toBe(store);
    expect(swapped.routeOrder).toEqual(["b", "a"]);
    expect(routeStoreSetRoutes(store, [a]).routeOrder).toEqual(["a"]);
  });

  it("同 id 但对象变了时走增量 patch 而非整表重建", () => {
    const a = makeRoute("a", [at(0, 0)]);
    const store = createRouteStore([a, makeRoute("b", [at(1, 1)])]);
    const moved = makeRoute("a", [at(50, 50)]);
    const patched = routeStoreSetRoutes(store, [moved, store.routes[1]!]);
    // 顺序与长度都没变 ⇒ 走 patch 分支，routes 里未变的 b 保持原引用
    expect(patched.routes[1]).toBe(store.routes[1]);
    expect(patched.routeMap.get("a")).toBe(moved);
  });
});

// ─── routeStorePatchRoutes ────────────────────────────────

describe("routeStore / routeStorePatchRoutes", () => {
  it("无更新无删除时返回同一个 store", () => {
    const store = createRouteStore([makeRoute("a", [at(0, 0)])]);
    expect(routeStorePatchRoutes(store, [])).toBe(store);
    expect(routeStorePatchRoutes(store, [], [])).toBe(store);
  });

  it("更新未变的路线（引用相同）时返回同一个 store", () => {
    const a = makeRoute("a", [at(0, 0)]);
    const store = createRouteStore([a]);
    expect(routeStorePatchRoutes(store, [a])).toBe(store);
  });

  it("更新已有路线：按下标覆盖，顺序不变", () => {
    const store = createRouteStore([makeRoute("a", [at(0, 0)]), makeRoute("b", [at(1, 1)])]);
    const moved = makeRoute("a", [at(99, 99)]);
    const patched = routeStorePatchRoutes(store, [moved]);
    expect(patched.routeOrder).toEqual(["a", "b"]);
    expect(patched.routeIndexById.get("a")).toBe(0);
    expect(patched.routes[0]).toBe(moved);
    expect(patched.routes[1]).toBe(store.routes[1]);
  });

  it("新增路线：追加到末尾并重建下标表", () => {
    const store = createRouteStore([makeRoute("a", [at(0, 0)])]);
    const b = makeRoute("b", [at(1, 1)]);
    const patched = routeStorePatchRoutes(store, [b]);
    expect(patched.routeOrder).toEqual(["a", "b"]);
    expect(patched.routeIndexById.get("b")).toBe(1);
    expect(patched.routes).toHaveLength(2);
  });

  it("删除：routeOrder 与下标表重建，空桶不残留", () => {
    const store = createRouteStore([
      makeRoute("a", [at(0, 0)]),
      makeRoute("b", [at(1, 1)]),
      makeRoute("c", [at(2, 2)])
    ]);
    const patched = routeStorePatchRoutes(store, [], ["b"]);
    expect(patched.routeOrder).toEqual(["a", "c"]);
    expect(patched.routeIndexById.get("c")).toBe(1);
    expect(patched.routeMap.has("b")).toBe(false);
  });

  it("删除不存在的 id 时返回同一个 store", () => {
    const store = createRouteStore([makeRoute("a", [at(0, 0)])]);
    expect(routeStorePatchRoutes(store, [], ["幽灵"])).toBe(store);
  });

  it("删除后空间索引里不再命中被删的路线", () => {
    const store = createRouteStore([makeRoute("a", [at(0, 0), at(50, 50)])]);
    const patched = routeStorePatchRoutes(store, [], ["a"]);
    expect(queryRouteSpatialIndex(patched.routeSpatialIndex, bounds(-100, -100, 100, 100))).toEqual([]);
    expect(patched.routeSpatialIndex.routeBoundsById.has("a")).toBe(false);
  });

  it("移动路线后空间索引跟着更新（旧位置不再命中）", () => {
    const store = createRouteStore([makeRoute("a", [at(0, 0), at(50, 50)])]);
    const patched = routeStorePatchRoutes(store, [makeRoute("a", [at(5000, 5000), at(5050, 5050)])]);
    expect(queryRouteSpatialIndex(patched.routeSpatialIndex, bounds(-100, -100, 100, 100))).toEqual([]);
    expect(queryRouteSpatialIndex(patched.routeSpatialIndex, bounds(4900, 4900, 5100, 5100))).toHaveLength(1);
  });

  it("同批删除 + 新增：索引两侧都正确", () => {
    const store = createRouteStore([makeRoute("a", [at(0, 0), at(10, 10)])]);
    const patched = routeStorePatchRoutes(store, [makeRoute("b", [at(5000, 5000), at(5010, 5010)])], ["a"]);
    const hits = edgeIds(queryRouteSpatialIndex(patched.routeSpatialIndex, bounds(-100, -100, 100, 100)));
    expect(hits).toEqual([]);
    expect(patched.routeOrder).toEqual(["b"]);
  });

  it("重复更新同一条路线时按最后一次生效", () => {
    const store = createRouteStore([makeRoute("a", [at(0, 0), at(10, 10)])]);
    const patched = routeStorePatchRoutes(store, [
      makeRoute("a", [at(100, 100), at(110, 110)]),
      makeRoute("a", [at(200, 200), at(210, 210)])
    ]);
    expect(patched.routeMap.get("a")!.points[0]).toEqual(at(200, 200));
    expect(queryRouteSpatialIndex(patched.routeSpatialIndex, bounds(150, 150, 250, 250))).toHaveLength(1);
    expect(queryRouteSpatialIndex(patched.routeSpatialIndex, bounds(50, 50, 150, 150))).toEqual([]);
  });
});

// ─── routeStorePatchRoutesById ────────────────────────────

describe("routeStore / routeStorePatchRoutesById", () => {
  it("空 id 集合或空 store 时不改动", () => {
    const store = createRouteStore([makeRoute("a", [at(0, 0)])]);
    expect(routeStorePatchRoutesById(store, [], (r) => r).store).toBe(store);
    expect(routeStorePatchRoutesById(createRouteStore([]), ["a"], (r) => r).store.routeOrder).toEqual([]);
  });

  it("未知 id 被跳过，不进 patchedEdgeIds", () => {
    const store = createRouteStore([makeRoute("a", [at(0, 0)])]);
    const result = routeStorePatchRoutesById(store, ["幽灵"], (route) => ({ ...route, edgeId: "x" }));
    expect(result.store).toBe(store);
    expect([...result.patchedEdgeIds]).toEqual([]);
  });

  it("updateRoute 原样返回时不改动 store，也不记入 patchedEdgeIds", () => {
    const store = createRouteStore([makeRoute("a", [at(0, 0)])]);
    const result = routeStorePatchRoutesById(store, ["a"], (route) => route);
    expect(result.store).toBe(store);
    expect([...result.patchedEdgeIds]).toEqual([]);
  });

  it("只把真正变了的 id 记入 patchedEdgeIds", () => {
    const store = createRouteStore([makeRoute("a", [at(0, 0)]), makeRoute("b", [at(1, 1)])]);
    const result = routeStorePatchRoutesById(store, ["a", "b", "幽灵"], (route) =>
      route.edgeId === "a" ? { ...route, points: [at(9, 9)] } : route
    );
    expect([...result.patchedEdgeIds]).toEqual(["a"]);
    expect(result.store).not.toBe(store);
    expect(result.store.routeMap.get("a")!.points).toEqual([at(9, 9)]);
    expect(result.store.routeMap.get("b")).toBe(store.routeMap.get("b"));
  });

  it("接受 Set 与一般 iterable（结果一致）", () => {
    const store = createRouteStore([makeRoute("a", [at(0, 0)]), makeRoute("b", [at(1, 1)])]);
    const move = (route: RoutedEdge) => ({ ...route, points: [at(7, 7)] });
    const fromSet = routeStorePatchRoutesById(store, new Set(["a", "b"]), move);
    const fromArray = routeStorePatchRoutesById(store, ["a", "b"], move);
    expect([...fromSet.patchedEdgeIds]).toEqual([...fromArray.patchedEdgeIds]);
    expect(fromSet.store.routeMap.get("a")).toEqual(fromArray.store.routeMap.get("a"));
  });
});
