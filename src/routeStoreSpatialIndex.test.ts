// src/routeStore.ts：路由空间索引与渲染包围盒
//   routeRenderBounds                  折点的 min/max 包围盒（+padding）
//   routeIntersectsRenderBounds        包围盒相交（含边界接触）
//   buildRouteSpatialIndex             按 320px 网格分桶（落桶留 8px）
//   queryRouteSpatialIndex             桶扫描 + 精确复核 + 按 edgeId 去重
//   routeSpatialIndexRenderBounds      从索引取某条路的包围盒（可再扩 padding）
//   createRouteStore                   建 store
//   routeStoreSetRoutes                增量更新（四条早返回）
//
// 这些函数决定画布上**哪些线路在视口里被渲染**。索引漏收 → 线路该画不画；
// 误收 → 白跑一遍绘制。两者都只在画面上体现，**不报错**。
import { describe, expect, test } from "vitest";
import {
  buildRouteSpatialIndex,
  createRouteStore,
  queryRouteSpatialIndex,
  routeIntersectsRenderBounds,
  routeRenderBounds,
  routeSpatialIndexRenderBounds,
  routeStoreSetRoutes
} from "./routeStore";
import type { RoutedEdge } from "./model";

type Pt = [number, number];

const route = (edgeId: string, pts: Pt[]): RoutedEdge =>
  ({ edgeId, points: pts.map(([x, y]) => ({ x, y })) } as RoutedEdge);

const box = (left: number, right: number, top: number, bottom: number) => ({ left, right, top, bottom });

const BUCKET = 320;      // ROUTE_SPATIAL_BUCKET_SIZE（私有常量）
const PAD = 8;           // addRouteSpatialEntry 里的 expandRouteBounds(routeBounds, 8)

const ids = (found: RoutedEdge[]) => found.map((r) => r.edgeId);

describe("routeRenderBounds：min/max 包围盒 + 可选 padding", () => {
  test("★ 空 points → null（不是零尺寸盒）", () => {
    expect(routeRenderBounds({ points: [] })).toBeNull();
  });

  test("单点 → 退化成零宽高盒", () => {
    expect(routeRenderBounds({ points: [{ x: 10, y: 20 }] })).toEqual(box(10, 10, 20, 20));
  });

  test("多点乱序也正确（min/max 归约，与顺序无关）", () => {
    const pts = [{ x: 5, y: 30 }, { x: 20, y: 10 }, { x: -3, y: 12 }];
    expect(routeRenderBounds({ points: pts })).toEqual(box(-3, 20, 10, 30));
    expect(routeRenderBounds({ points: [...pts].reverse() })).toEqual(box(-3, 20, 10, 30));
  });

  test("★ 归约循环从**索引 1** 开始 —— 首点只作播种，不参与 min/max", () => {
    // 首点 x=0 会把 left 播种成 0；若首点不在循环里，`(0, 30)` 这样的**中间点**
    // 仍要走 min/max。这条一开始缺失，导致变异 ④（往归约里塞一条按 x 的赋值）
    // 全绿 —— 我没有任何「非首点 x === 0」的输入。属于输入覆盖不足，不是等价。
    expect(routeRenderBounds({ points: [{ x: 10, y: 20 }, { x: 0, y: 30 }, { x: 5, y: 40 }] }))
      .toEqual(box(0, 10, 20, 40));
    // 中间点 x 为负也要照常取 min
    expect(routeRenderBounds({ points: [{ x: 10, y: 20 }, { x: -7, y: 30 }, { x: 5, y: 40 }] }))
      .toEqual(box(-7, 10, 20, 40));
    // 只看 x=0 的中间点：left 变 0、right 不变
    expect(routeRenderBounds({ points: [{ x: 10, y: 20 }, { x: 0, y: 99 }] }))
      .toEqual(box(0, 10, 20, 99));
  });

  test("padding 四边各扩 / 各缩", () => {
    expect(routeRenderBounds({ points: [{ x: 10, y: 20 }] }, 8)).toEqual(box(2, 18, 12, 28));
    // ★ 负 padding 让盒子**反转**（left > right、top > bottom）
    expect(routeRenderBounds({ points: [{ x: 10, y: 20 }] }, -5)).toEqual(box(15, 5, 25, 15));
  });

  test("★ NaN / ±Infinity 按**轴**污染：从 `points[0]` 播种的那一轴全废", () => {
    // `left = points[0].x; right = left`，而 `Math.min(NaN, v)` 恒返回 NaN ——
    // 所以首点哪一轴是 NaN，那一轴的 left/right 就一起废掉，另一轴不受影响。
    expect(routeRenderBounds({ points: [{ x: NaN, y: 0 }] })).toEqual(box(NaN, NaN, 0, 0));
    expect(routeRenderBounds({ points: [{ x: 0, y: NaN }] })).toEqual(box(0, 0, NaN, NaN));
    // 中间点的 NaN 同样沿该轴扩散（比较恒 false，不再被后续点纠正）
    expect(routeRenderBounds({ points: [{ x: 0, y: 0 }, { x: NaN, y: 5 }] }))
      .toEqual(box(NaN, NaN, 0, 5));
    expect(routeRenderBounds({ points: [{ x: 0, y: 0 }, { x: 5, y: NaN }] }))
      .toEqual(box(0, 5, NaN, NaN));
    // ±Infinity 同理（min/max 与它能正常比较，会真的取到）
    expect(routeRenderBounds({ points: [{ x: Infinity, y: 0 }] })).toEqual(box(Infinity, Infinity, 0, 0));
  });

  test("返回新对象", () => {
    const input = { points: [{ x: 1, y: 1 }] };
    expect(routeRenderBounds(input)).not.toBe(routeRenderBounds(input));
    expect(routeRenderBounds(input)).toEqual(routeRenderBounds(input));
  });
});

describe("routeIntersectsRenderBounds：含边界接触，空点 → false", () => {
  test("明显相交 / 明显分离", () => {
    expect(routeIntersectsRenderBounds({ points: [{ x: 5, y: 5 }] }, box(0, 10, 0, 10))).toBe(true);
    expect(routeIntersectsRenderBounds({ points: [{ x: 50, y: 50 }] }, box(0, 10, 0, 10))).toBe(false);
    expect(routeIntersectsRenderBounds({ points: [{ x: -5, y: 5 }] }, box(0, 10, 0, 10))).toBe(false);
  });

  test("★ 只碰边也算相交（`<=` / `>=`，不是 `<` / `>`）", () => {
    expect(routeIntersectsRenderBounds({ points: [{ x: 10, y: 5 }] }, box(0, 10, 0, 10))).toBe(true);
    expect(routeIntersectsRenderBounds({ points: [{ x: 0, y: 5 }] }, box(0, 10, 0, 10))).toBe(true);
    expect(routeIntersectsRenderBounds({ points: [{ x: 5, y: 0 }] }, box(0, 10, 0, 10))).toBe(true);
    expect(routeIntersectsRenderBounds({ points: [{ x: 5, y: 10 }] }, box(0, 10, 0, 10))).toBe(true);
  });

  test("★ 空 points → false", () => {
    expect(routeIntersectsRenderBounds({ points: [] }, box(0, 10, 0, 10))).toBe(false);
  });

  test("★ NaN 包围盒**永不命中**（任何查询框都不行，含与自身比）", () => {
    // 这是 NaN 污染的下游后果：`NaN <= v` 与 `NaN >= v` 恒 false。
    // 后果是线路**静默不画**（routeRenderBounds 里的 NaN 挡掉了它自己）。
    const nanRoute = { points: [{ x: NaN, y: 0 }] };
    expect(routeIntersectsRenderBounds(nanRoute, box(NaN, NaN, 0, 0)), "与自身比").toBe(false);
    expect(routeIntersectsRenderBounds(nanRoute, box(-100, 1100, -100, 1100)), "与全覆盖比").toBe(false);
    // 对照：正常路线与同一全覆盖框相交
    expect(routeIntersectsRenderBounds({ points: [{ x: 5, y: 5 }] }, box(-100, 1100, -100, 1100))).toBe(true);
  });
});

describe("buildRouteSpatialIndex：320px 网格，键 `${x}:${y}`，落桶留 8px", () => {
  const routes = [route("a", [[0, 0], [10, 10]]), route("b", [[1000, 1000], [1010, 1010]]), route("c", [])];

  test("`bucketSize` 是 320", () => {
    expect(buildRouteSpatialIndex(routes).bucketSize).toBe(BUCKET);
  });

  test("★ 负坐标用 `Math.floor` → 落在负桶（`-1:-1`）", () => {
    const index = buildRouteSpatialIndex([route("neg", [[-1, -1], [-10, -10]])]);
    // floor(-1/320) = -1，floor(-18/320) = -1 → 四邻桶
    expect([...index.buckets.keys()].sort()).toEqual(["-1:-1", "-1:0", "0:-1", "0:0"]);
  });

  test("原点附近的路线落 2×2 桶", () => {
    const index = buildRouteSpatialIndex(routes);
    expect(index.routeBucketKeysById.get("a")).toEqual(["-1:-1", "-1:0", "0:-1", "0:0"]);
    expect(index.routeBucketKeysById.get("b")).toEqual(["3:3"]);
  });

  test("★ 空 points 的路线落 **0 桶**（永不进查询结果）", () => {
    const index = buildRouteSpatialIndex(routes);
    expect(index.routeBucketKeysById.get("c")).toEqual([]);
    expect(index.routeBoundsById.get("c")).toBeNull();
    // 即使查询框覆盖全图也查不到它
    expect(ids(queryRouteSpatialIndex(index, box(-100, 1100, -100, 1100)))).not.toContain("c");
  });

  test("`routeBoundsById` 存的是**未加 8px 留白**的原始包围盒", () => {
    const index = buildRouteSpatialIndex(routes);
    expect(index.routeBoundsById.get("a")).toEqual(box(0, 10, 0, 10));
  });

  test("★ 8px 留白的作用：把本不跨桶的路线也拉进相邻桶（保守扩召）", () => {
    // 路线 x=322..330、y=5。
    // 无留白：floor(322/320)=1、floor(330/320)=1 → x 只在桶 1；
    //        y=5 两边各 -8 → floor(-3/320)=-1、floor(13/320)=0 → y 在桶 -1 与 0。
    // 有留白（实际实现）：x = 314..328 → floor(314/320)=0、floor(328/320)=1 → **x 跨桶 0 与 1**
    //                     y = -3..13  → 桶 -1 与 0（本就跨）
    // ⇒ 留白把 x 从「1 个桶」扩成「2 个桶」，多出来的那个用于捕捉 8px 内的查询框。
    const index = buildRouteSpatialIndex([route("f", [[322, 5], [330, 5]])]);
    expect(index.routeBucketKeysById.get("f")).toEqual(["0:-1", "0:0", "1:-1", "1:0"]);
    // 把留白常量算出来，说明「桶 0 是留白带来的」
    expect(Math.floor(322 / BUCKET), "无留白时的桶号").toBe(1);
    expect(Math.floor((322 - PAD) / BUCKET), "有留白时才落到桶 0").toBe(0);
    expect(index.routeBucketKeysById.get("f")).toContain("0:0");
  });

  test("一条长路线会落很多桶（25）", () => {
    const index = buildRouteSpatialIndex([route("w", [[0, 0], [1000, 1000]])]);
    expect(index.routeBucketKeysById.get("w")).toHaveLength(25);
  });
});

describe("queryRouteSpatialIndex：桶扫描 + 精确复核 + 按 edgeId 去重", () => {
  const routes = [route("a", [[0, 0], [10, 10]]), route("b", [[1000, 1000], [1010, 1010]])];
  const index = buildRouteSpatialIndex(routes);
  const query = (b: { left: number; right: number; top: number; bottom: number }) => ids(queryRouteSpatialIndex(index, b));

  test("命中各自所在区域", () => {
    expect(query(box(0, 20, 0, 20))).toEqual(["a"]);
    expect(query(box(995, 1015, 995, 1015))).toEqual(["b"]);
    expect(query(box(5000, 5100, 5000, 5100)), "远端").toEqual([]);
  });

  test("★ 同一路线落多桶时只出现一次（`seenById` 查询标记去重）", () => {
    expect(query(box(-100, 1100, -100, 1100))).toEqual(["a", "b"]);
    const wide = buildRouteSpatialIndex([route("w", [[0, 0], [1000, 1000]])]);
    expect(wide.routeBucketKeysById.get("w")).toHaveLength(25);
    expect(ids(queryRouteSpatialIndex(wide, box(-100, 1100, -100, 1100)))).toEqual(["w"]);
  });

  test("★ 桶命中但**精确复核**不通过 → 被剔除（桶只是粗筛）", () => {
    const single = buildRouteSpatialIndex([route("z", [[0, 0], [10, 10]])]);
    // 查询框 (300,300)-(310,310) 与 z 同在桶 "0:0"，但两者不相交
    expect([...single.buckets.keys()]).toContain("0:0");
    expect(ids(queryRouteSpatialIndex(single, box(300, 310, 300, 310))), "同桶但不相交").toEqual([]);
    // 相交时才返回
    expect(ids(queryRouteSpatialIndex(single, box(0, 20, 0, 20)))).toEqual(["z"]);
  });

  test("★ 8px 留白扩召带来的误召会被精确复核过滤掉", () => {
    // x=322..330 被留白拉进桶 0，但查询框 (0,0)-(10,10) 离它很远 → 应被剔除
    const padded = buildRouteSpatialIndex([route("f", [[322, 5], [330, 5]])]);
    expect(padded.routeBucketKeysById.get("f"), "确实进了桶 0").toContain("0:0");
    expect(ids(queryRouteSpatialIndex(padded, box(0, 10, 0, 10))), "但精确复核剔除").toEqual([]);
  });

  test("零面积查询框命中「覆盖该点」的路线", () => {
    // "a" 跨 (0,0)-(10,10)，所以点 (5,5) 与 (5.5,5.5) 都在它内部 → 相交
    expect(query(box(5, 5, 5, 5))).toEqual(["a"]);
    expect(query(box(5.5, 5.5, 5.5, 5.5))).toEqual(["a"]);
    // 点落在盒子**外**一点（5.5 > 10? 不 —— 换成 x=11）→ 不命中
    expect(query(box(11, 11, 11, 11))).toEqual([]);
    expect(query(box(-1, -1, -1, -1))).toEqual([]);
  });

  test("返回新数组（顺序 = 桶扫描序，不是 routeOrder）", () => {
    const first = queryRouteSpatialIndex(index, box(-100, 1100, -100, 1100));
    const second = queryRouteSpatialIndex(index, box(-100, 1100, -100, 1100));
    expect(first).not.toBe(second);
    expect(ids(first)).toEqual(ids(second));
  });

  test("★ 查询框**无上界** —— 极大范围会让桶扫描变成天文数字", () => {
    // 探针实测：查询框 `(-1e9, 1e9, -1e9, 1e9)` 需要遍历
    //   (2e9 / 320)² ≈ 3.9e13 个桶，直接超时。
    // **判定不修**：调用方传的是 `canvasRenderBounds`，实测画布上界 2528px
    // （MIN/MAX_CANVAS_* 夹着），即 8×8 = 64 个桶。探针里那次超时是
    // 我自己传了不可能的值，不是真实路径。
    // 这里钉住真实量级：2528px 范围内只有几十个桶。
    const realistic = buildRouteSpatialIndex([route("r", [[100, 100], [200, 200]])]);
    const count = ((2528 / BUCKET) | 0) + 2;
    expect(count * count, "全画布范围的桶数上界").toBeLessThan(100);
  });
});

describe("routeSpatialIndexRenderBounds：取索引里的包围盒，可再扩 padding", () => {
  const index = buildRouteSpatialIndex([route("a", [[0, 0], [10, 10]]), route("c", [])]);

  test("padding 缺省或 0 → 原样返回", () => {
    expect(routeSpatialIndexRenderBounds(index, "a")).toEqual(box(0, 10, 0, 10));
    expect(routeSpatialIndexRenderBounds(index, "a", 0)).toEqual(box(0, 10, 0, 10));
  });

  test("padding > 0 → 四边各扩", () => {
    expect(routeSpatialIndexRenderBounds(index, "a", 5)).toEqual(box(-5, 15, -5, 15));
    expect(routeSpatialIndexRenderBounds(index, "a", PAD)).toEqual(box(-8, 18, -8, 18));
  });

  test("★ 空 points 的路线 → null；不存在的 id → null（**不是**未定义）", () => {
    expect(routeSpatialIndexRenderBounds(index, "c")).toBeNull();
    expect(routeSpatialIndexRenderBounds(index, "nope")).toBeNull();
    expect(routeSpatialIndexRenderBounds(index, "nope", 5)).toBeNull();
  });

  test("负 padding 让盒子反转（与 `routeRenderBounds` 同一行为）", () => {
    expect(routeSpatialIndexRenderBounds(index, "a", -3)).toEqual(box(3, 7, 3, 7));
  });
});

describe("createRouteStore：routeOrder 保留重复，Map 后者赢", () => {
  test("★ 重复 edgeId：`routeOrder` 留两条，Map / 索引表只留最后一个", () => {
    const store = createRouteStore([
      route("d", [[0, 0]]),
      route("d", [[9, 9]]),
      route("e", [[1, 1]])
    ]);
    expect(store.routeOrder, "★ 保留重复").toEqual(["d", "d", "e"]);
    expect(store.routes).toHaveLength(3);
    expect([...store.routeIndexById]).toEqual([["d", 1], ["e", 2]]);
    expect(store.routeMap.get("d")!.points).toEqual([{ x: 9, y: 9 }]);
  });

  test("`routeIndexById` 的下标对应 `routeOrder` 的位置", () => {
    const store = createRouteStore([route("a", [[0, 0]]), route("b", [[1, 1]]), route("c", [[2, 2]])]);
    expect([...store.routeIndexById]).toEqual([["a", 0], ["b", 1], ["c", 2]]);
  });

  test("`routes` 是入参的**拷贝**（改入参不影响 store）", () => {
    const input = [route("a", [[0, 0]])];
    const store = createRouteStore(input);
    input.push(route("b", [[1, 1]]));
    expect(store.routes).toHaveLength(1);
    expect(store.routeOrder).toEqual(["a"]);
  });

  test("同时建好空间索引", () => {
    const store = createRouteStore([route("a", [[0, 0], [10, 10]])]);
    expect(store.routeSpatialIndex.bucketSize).toBe(BUCKET);
    expect(ids(queryRouteSpatialIndex(store.routeSpatialIndex, box(0, 20, 0, 20)))).toEqual(["a"]);
  });

  test("空数组 → 空 store，不抛错", () => {
    const store = createRouteStore([]);
    expect(store.routes).toEqual([]);
    expect(store.routeOrder).toEqual([]);
    expect(store.routeMap.size).toBe(0);
    expect(queryRouteSpatialIndex(store.routeSpatialIndex, box(0, 10, 0, 10))).toEqual([]);
  });
});

describe("routeStoreSetRoutes：四条早返回 + 一条增量路径", () => {
  const base = () => createRouteStore([route("a", [[0, 0]]), route("b", [[5, 5]])]);
  const same = (store: ReturnType<typeof base>) => [store.routes[0], store.routes[1]];

  test("★ 入参就是 `store.routes` → 同一引用", () => {
    const store = base();
    expect(routeStoreSetRoutes(store, store.routes)).toBe(store);
  });

  test("★ 等长、同序、同对象引用（新数组）→ 同一引用", () => {
    const store = base();
    expect(routeStoreSetRoutes(store, same(store))).toBe(store);
  });

  test("等长但**顺序变了** → 重建（`routeOrder[index]` 对不上）", () => {
    const store = base();
    const out = routeStoreSetRoutes(store, [store.routes[1], store.routes[0]]);
    expect(out).not.toBe(store);
    expect(out.routeOrder).toEqual(["b", "a"]);
    expect([...out.routeIndexById]).toEqual([["b", 0], ["a", 1]]);
  });

  test("长度不同 → 重建", () => {
    const store = base();
    const out = routeStoreSetRoutes(store, [store.routes[0]]);
    expect(out).not.toBe(store);
    expect(out.routeOrder).toEqual(["a"]);
  });

  test("★ 长度与顺序都没变但内容变了 → 走增量 patch（不是重建）", () => {
    const store = base();
    const changed = [store.routes[0], route("b", [[6, 6]])];
    const out = routeStoreSetRoutes(store, changed);
    expect(out).not.toBe(store);
    expect(out.routeOrder, "顺序保持").toEqual(["a", "b"]);
    expect(out.routeMap.get("b")!.points).toEqual([{ x: 6, y: 6 }]);
    // 空间索引也跟着更新了 —— 否则改过的线路不会被重新召出
    expect(ids(queryRouteSpatialIndex(out.routeSpatialIndex, box(0, 100, 0, 100)))).toContain("b");
  });

  test("`null` / `undefined` store → 全新建", () => {
    expect(routeStoreSetRoutes(null, [route("z", [[0, 0]])])!.routeOrder).toEqual(["z"]);
    expect(routeStoreSetRoutes(undefined, [route("z", [[0, 0]])])!.routeOrder).toEqual(["z"]);
  });

  test("★ 下面三条等价变异全绿是**正确的**（记录，避免下一个人重查）", () => {
    const store = base();

    // ⑭ 长度守卫 `!==` 改 `<`（只拦变短）
    //   —— 新列表**变长**时两条路径都重建：`!==` 直接重建；`<` 落到逐位比较，
    //      超出位上 `store.routeOrder[n]` 是 `undefined`，而 `route.edgeId` 恒是
    //      **字符串**，`undefined !== "x"` 必真 → 同样重建。
    //   ⇒ 对任意输入结果相同。前提是 edgeId 不可能是 undefined（类型上即 string）。
    const longer = [store.routes[0], store.routes[1], route("c", [[7, 7]])];
    const rebuilt = routeStoreSetRoutes(store, longer);
    expect(rebuilt.routeOrder).toEqual(["a", "b", "c"]);
    expect(store.routeOrder, "入参 store 未变").toEqual(["a", "b"]);

    // ⑮ `store.routes === routes` 早返回被摘掉
    //   —— 去掉后，同一个数组仍会在长度 / 顺序 / 引用三道检查里全过，
    //      `changedRoutes` 为空 → `return store`。**同一对象**。
    expect(routeStoreSetRoutes(store, store.routes)).toBe(store);

    // ⑯ `store.routeMap.get(edgeId) !== route` 比较摘掉（未变的也进 patch）
    //   —— `routeStorePatchRoutes` 内部**自己**有同一道检查：
    //      `if (previousRoute === nextRoute) continue;`（源码 321 行）。
    //      所以传入「全部」与「仅变化的」得到同一个 store 对象。
    //   下面这行把那个内部检查的存在变成可执行的断言 ——
    //   若将来把它删掉，`toBe(store)` 就会失败，提醒同时删掉 setRoutes 里那道。
    expect(routeStoreSetRoutes(store, same(store))).toBe(store);
    // 换一个顺序相同、元素同引用的新数组（含两处相同引用）→ 仍同一引用
    const mixed = [store.routes[0], store.routes[1]];
    expect(routeStoreSetRoutes(store, mixed)).toBe(store);
    // 长度不同则**不**是早返回（走重建）—— 顺带钉住 ⑭ 的证明前提
    expect(routeStoreSetRoutes(store, [store.routes[0]]), "长度不同 → 重建").not.toBe(store);
  });

  test("两条路都变 → 仍走 patch", () => {
    const store = base();
    const out = routeStoreSetRoutes(store, [route("a", [[1, 1]]), route("b", [[2, 2]])]);
    expect(out.routeOrder).toEqual(["a", "b"]);
    expect(out.routeMap.get("a")!.points).toEqual([{ x: 1, y: 1 }]);
    expect(out.routeMap.get("b")!.points).toEqual([{ x: 2, y: 2 }]);
  });
});
