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

// ═════════════════════════════════════════════════════════════════════════════
// 现状钉桩（auto-improve 清单第 75 项）：非有限查询框 + 负 bucketSize
//
// ⚠ 三处「现状」与旧描述不符，全部以 probe 实测为准（0fa3569c 加归一化之后）：
//
//   ① **负 bucketSize 现在不死循环**，而是回落到默认桶宽 320。
//      旧描述里的「负数 → 区间倒挂 → 空区间 → 静默全空索引」说的是**修复前**的行为。
//      实测：`buildRouteSpatialIndex(routes, -10).bucketSize === 320`，
//      且桶内容与不传第二参的索引**逐项相同**（不是「两堆空相等」——参照索引有 5 个桶）。
//
//   ② 会挂死的是 **bucketSize === 0**，不是负数：`Math.floor(1 / 0) === Infinity`，
//      `for (let x = Infinity; x <= Infinity; x += 1)` 恒真。负数只是「区间倒挂 → 空区间」，
//      而那也已由同一道归一化守卫兜住。
//
//   ③ 查询框含 ±Infinity 时**不走桶坐标循环**，而是遍历全部桶再逐条精确复核
//      （routeStore.ts 里的 `rangeIsFinite` 守卫）。
//
// ⚠ 两个已知空洞，本块**故意不覆盖**（实测会打爆进程，vitest 的 per-test timeout 拦不住）：
//   · `buildRouteSpatialIndex` 传一条坐标含 ±Infinity 的路线 → `addRouteSpatialEntry`
//     里 `for (x = Infinity; x <= Infinity; x += 1)` 同步死循环 → 实测 JS heap OOM。
//     守卫只加在 `queryRouteSpatialIndex`，落桶侧没有。
//   · `bucketSize` 传极小的**正**数（如 1e-9）→ 守卫放行（有限且 > 0），
//     桶数 ≈ 1e13 → 实测 `RangeError: Map maximum size exceeded`（跑满 30s testTimeout）。
//   两者都不是本项要钉的现状，留给后续项处理。
// ═════════════════════════════════════════════════════════════════════════════

type Bounds4 = { left: number; right: number; top: number; bottom: number };

/** 参照索引的三条路线：near 落 4 桶、far 落 1 桶、void 无桶且包围盒为 null。 */
const SAMPLE_ROUTES = (): RoutedEdge[] => [
  route("near", [[0, 0], [10, 10]]),            // 桶 -1:-1 / -1:0 / 0:-1 / 0:0
  route("far", [[1000, 1000], [1010, 1010]]),   // 桶 3:3
  route("void", [])                             // 0 桶，routeBoundsById 存 null
];

const sampleIndex = () => buildRouteSpatialIndex(SAMPLE_ROUTES());
const FAR_BOX = box(995, 1015, 995, 1015);      // 只罩住 far（桶 3:3），远离原点
const NEG_LEFT_BOX = box(-100, 20, -100, 20);   // 负 left：判别 per-axis `/ size` 变异
/** 三个刻意避开「恰好等于默认桶号」的查询框。 */
const qFar = (index: ReturnType<typeof sampleIndex>) => ids(queryRouteSpatialIndex(index, FAR_BOX));
const qNeg = (index: ReturnType<typeof sampleIndex>) => ids(queryRouteSpatialIndex(index, NEG_LEFT_BOX));
const qHalf = (index: ReturnType<typeof sampleIndex>) => ids(queryRouteSpatialIndex(index, box(0, Infinity, 0, Infinity)));

describe("★ 非有限查询框（NaN）：恒空集，成因是精确复核而不是提前返回", () => {
  test("护栏：同一索引上正常框能命中（否则下面的空集可能只是索引坏了）", () => {
    const idx = sampleIndex();
    expect([...idx.buckets.keys()].sort()).toEqual(["-1:-1", "-1:0", "0:-1", "0:0", "3:3"]);
    expect(ids(queryRouteSpatialIndex(idx, box(0, 20, 0, 20)))).toEqual(["near"]);
    expect(ids(queryRouteSpatialIndex(idx, FAR_BOX))).toEqual(["far"]);
  });

  test("★ 四轴任一为 NaN → 空集（逐轴构造，不靠「四轴全 NaN」一条蒙对）", () => {
    const idx = sampleIndex();
    const cases: Array<[string, Bounds4]> = [
      ["left 轴 NaN", box(NaN, 20, 0, 20)],
      ["right 轴 NaN", box(0, NaN, 0, 20)],
      ["top 轴 NaN", box(0, 20, NaN, 20)],
      ["bottom 轴 NaN", box(0, 20, 0, NaN)],
      ["四轴全 NaN", box(NaN, NaN, NaN, NaN)],
      // x 两轴 / y 两轴 NaN：桶区间四个端点全废，与「只坏一轴」同属非有限分支
      ["x 两轴 NaN", box(NaN, NaN, 0, 20)],
      ["y 两轴 NaN", box(0, 20, NaN, NaN)]
    ];
    for (const [label, bounds] of cases) {
      expect(ids(queryRouteSpatialIndex(idx, bounds)), label).toEqual([]);
    }
  });

  test("★ 空集由 `routeBoundsIntersect` 产出：同一个 NaN 框直接喂给它也是 false", () => {
    // 变异实测：把 visitBucket 里的 `!routeBoundsIntersect(routeBounds, bounds)` 摘掉，
    // 上面那条会从 [] 变成 ["near","far"]。所以空集**不是**某个 NaN 专用早返回的产物。
    const near = SAMPLE_ROUTES()[0];
    expect(routeIntersectsRenderBounds(near, box(NaN, 20, 0, 20)), "NaN 轴").toBe(false);
    expect(routeIntersectsRenderBounds(near, box(0, 20, 0, 20)), "同框正常轴").toBe(true);
    // 对照组：换成 ±Infinity 全覆盖框，同一条路线是相交的 ⇒ 差异只来自框，不来自路线
    expect(routeIntersectsRenderBounds(near, box(-Infinity, Infinity, -Infinity, Infinity))).toBe(true);
  });

  test("NaN 查询不污染索引：后续正常查询与全新索引结果相同（同一个框连查两次也要对）", () => {
    const used = sampleIndex();
    expect(ids(queryRouteSpatialIndex(used, box(NaN, NaN, NaN, NaN)))).toEqual([]);
    const first = ids(queryRouteSpatialIndex(used, box(0, 20, 0, 20)));
    const second = ids(queryRouteSpatialIndex(used, box(0, 20, 0, 20)));
    expect(first).toEqual(["near"]);
    expect(second, "查询标记必须每次递增，否则第二次被自己的去重表挡掉").toEqual(first);
    expect(qFar(used)).toEqual(["far"]);
  });
});

describe("★ 非有限查询框（±Infinity）：遍历全部桶 + 精确复核", () => {
  test("全覆盖框（-Inf..+Inf）→ 命中所有**有桶**的路线", () => {
    const idx = sampleIndex();
    const found = ids(queryRouteSpatialIndex(idx, box(-Infinity, Infinity, -Infinity, Infinity)));
    expect(found).toEqual(["near", "far"]);
    // 护栏：near 落了 4 个桶却只出现一次 ⇒ 非有限分支同样走 seenById 去重
    expect(idx.routeBucketKeysById.get("near")).toHaveLength(4);
    // void 没有任何桶 ⇒ 「遍历全部桶」也捞不到它（不是「返回索引里所有路线」）
    expect(idx.routeBucketKeysById.get("void")).toEqual([]);
    expect(routeSpatialIndexRenderBounds(idx, "void")).toBeNull();
    expect(found).not.toContain("void");
  });

  test("★ ±Infinity 不是「无脑返回全部」：退化点与半开区间都由精确复核裁决", () => {
    const idx = sampleIndex();
    // 退化成单点 ±Infinity：有限路线的 `right >= Infinity` / `left <= -Infinity` 恒假
    expect(ids(queryRouteSpatialIndex(idx, box(Infinity, Infinity, Infinity, Infinity))), "+Inf 退化点").toEqual([]);
    expect(ids(queryRouteSpatialIndex(idx, box(-Infinity, -Infinity, -Infinity, -Infinity))), "-Inf 退化点").toEqual([]);
    // 半开：-Inf..0 只罩住原点，0..+Inf 罩住两条
    expect(ids(queryRouteSpatialIndex(idx, box(-Infinity, 0, -Infinity, 0))), "-Inf..0").toEqual(["near"]);
    expect(qHalf(idx), "0..+Inf").toEqual(["near", "far"]);
    // left 无穷但 right 有限 —— 判别「rangeIsFinite 只查 left 一个端点」的变异
    expect(ids(queryRouteSpatialIndex(idx, box(-Infinity, 20, 0, 20))), "left=-Inf, right=20").toEqual(["near"]);
    // 反向倒挂：left=+Inf > right=20，精确复核也过不去
    expect(ids(queryRouteSpatialIndex(idx, box(Infinity, 20, 0, 20))), "left=+Inf, right=20").toEqual([]);
  });

  test("单轴无穷：另一轴仍按有限区间裁剪（不是「有一根无穷就全收」）", () => {
    const idx = sampleIndex();
    expect(ids(queryRouteSpatialIndex(idx, box(-Infinity, Infinity, 0, 20))), "x 无穷、y 有限").toEqual(["near"]);
    expect(ids(queryRouteSpatialIndex(idx, box(0, 20, -Infinity, Infinity))), "y 无穷、x 有限").toEqual(["near"]);
  });

  test("同一个全覆盖框连查三次结果一致（去重标记跨查询复用不出错）", () => {
    const idx = sampleIndex();
    const runs = [1, 2, 3].map(() => ids(queryRouteSpatialIndex(idx, box(-Infinity, Infinity, -Infinity, Infinity))));
    expect(runs[0]).toEqual(["near", "far"]);
    expect(runs[1]).toEqual(runs[0]);
    expect(runs[2]).toEqual(runs[0]);
  });
});

describe("★ 负 / 非有限 bucketSize 的现状：build 侧一律回落默认桶宽 320", () => {
  test("★ bucketSize = -10 → 索引与不传第二参的索引逐项相同（旧描述里的「空索引」已不成立）", () => {
    const reference = sampleIndex();
    const bad = buildRouteSpatialIndex(SAMPLE_ROUTES(), -10);

    expect(bad.bucketSize).toBe(BUCKET);
    // 护栏：参照索引非空，否则「两堆空相等」恒成立
    expect(reference.buckets.size).toBe(5);
    expect([...bad.buckets.entries()]).toEqual([...reference.buckets.entries()]);
    expect([...bad.routeBucketKeysById]).toEqual([...reference.routeBucketKeysById]);
    expect([...bad.routeBoundsById]).toEqual([...reference.routeBoundsById]);
    expect(ids(queryRouteSpatialIndex(bad, box(0, 20, 0, 20))), "近端").toEqual(["near"]);
    expect(qFar(bad), "远端").toEqual(["far"]);
  });

  test("0 / -0.5 / NaN / ±Infinity 六档非法输入，回落后索引逐项相同", () => {
    // ⚠ 这里的 0 与旧描述不同：**有守卫时**它回落到 320，不挂死；
    //   若把守卫变异成 `bucketSize >= 0`，这一档会同步死循环（只能靠进程级墙钟判红）。
    const reference = sampleIndex();
    const illegal: Array<[string, number]> = [
      ["0", 0],
      ["-0.5", -0.5],
      ["-10", -10],
      ["NaN", Number.NaN],
      ["+Infinity", Number.POSITIVE_INFINITY],
      ["-Infinity", Number.NEGATIVE_INFINITY]
    ];
    for (const [label, bad] of illegal) {
      const idx = buildRouteSpatialIndex(SAMPLE_ROUTES(), bad);
      expect(idx.bucketSize, label).toBe(BUCKET);
      expect([...idx.buckets.entries()], label).toEqual([...reference.buckets.entries()]);
    }
  });

  test("回归护栏：正的非默认桶宽仍**原样生效**（否则「一律回落」这条也是绿的）", () => {
    const small = buildRouteSpatialIndex(SAMPLE_ROUTES(), 160);
    expect(small.bucketSize).toBe(160);
    // 桶号真的跟着变：far 从 3:3 挪到 6:6（floor(992/160)=6，floor(1018/320)=3）
    expect([...small.buckets.keys()]).toContain("6:6");
    expect([...small.buckets.keys()]).not.toContain("3:3");
    expect([...sampleIndex().buckets.keys()]).toContain("3:3");
    // 更小的桶宽 → far 横跨更多桶，桶总数上涨
    expect(buildRouteSpatialIndex(SAMPLE_ROUTES(), 40).buckets.size).toBeGreaterThan(small.buckets.size);
  });
});

describe("★ 查询侧 bucketSize 守卫：索引被外部改字段后仍按默认桶宽算区间", () => {
  const tampered = (index: ReturnType<typeof sampleIndex>, bucketSize: number) => ({ ...index, bucketSize });

  test("★ bucketSize = -10：近端、远端、负 left 框全部照常命中", () => {
    // 负 left 的框是关键判别输入：不归一时 `Math.floor(-100 / -10) === 10`，
    // 区间变成 left=10 > right=0 ⇒ 一次都不循环 ⇒ 查询恒空。
    const idx = tampered(sampleIndex(), -10);
    expect(idx.bucketSize, "字段本身仍是被改掉的原值").toBe(-10);
    expect(ids(queryRouteSpatialIndex(idx, box(0, 20, 0, 20))), "近端").toEqual(["near"]);
    expect(qFar(idx), "远端").toEqual(["far"]);
    expect(qNeg(idx), "负 left").toEqual(["near"]);
  });

  test("0 / NaN / ±Infinity：查询结果与不传第二参的索引逐项相同", () => {
    const reference = sampleIndex();
    const expectedNear = ids(queryRouteSpatialIndex(reference, box(0, 20, 0, 20)));
    const expectedFar = qFar(reference);
    expect(expectedNear, "护栏：参照结果非空").toEqual(["near"]);
    expect(expectedFar, "护栏：参照结果非空").toEqual(["far"]);

    for (const [label, bad] of [
      ["0", 0],
      ["NaN", Number.NaN],
      ["+Infinity", Number.POSITIVE_INFINITY],
      ["-Infinity", Number.NEGATIVE_INFINITY]
    ] as Array<[string, number]>) {
      const idx = tampered(reference, bad);
      expect(ids(queryRouteSpatialIndex(idx, box(0, 20, 0, 20))), label).toEqual(expectedNear);
      expect(qFar(idx), label).toEqual(expectedFar);
    }
  });

  test("★ 回归护栏：正的 2 会真的改变查询结果 —— 证明查询侧确实读 index.bucketSize", () => {
    // 若查询侧把桶宽写死成 320（而不是读字段再归一），这一档会与对照相同而恒绿。
    const idx = tampered(sampleIndex(), 2);
    expect(idx.bucketSize).toBe(2);
    expect(qFar(idx), "桶键是按 320 落的，2px 区间扫不到 3:3").toEqual([]);
    expect(qFar(sampleIndex()), "对照：默认桶宽能查到").toEqual(["far"]);
  });

  test("记录：bucketSize = NaN 时查询侧归一是**冗余**的（变异全绿属正确结果）", () => {
    // 变异实测：把 routeSpatialBucketRange 里的 `const size = routeSpatialBucketSize(bucketSize)`
    // 换成 `const size = bucketSize`，下面这几条仍全绿。理由可证：
    //   size = NaN ⇒ 四个 range 端点全 NaN ⇒ rangeIsFinite 必为 false
    //   ⇒ 查询必然走「遍历全部桶」分支，扫到的桶集合与归一后（320）的坐标扫描**完全相同**，
    //   再叠加同一套精确复核 ⇒ 输出逐位相同。
    // 前提是 rangeIsFinite 那道守卫在（等价性正是靠它才成立）。所以下面钉的是**行为**，
    // 不是「归一」；对 NaN 而言归一在查询侧不承重，承重的是 rangeIsFinite。
    const idx = tampered(sampleIndex(), Number.NaN);
    expect(ids(queryRouteSpatialIndex(idx, box(0, 20, 0, 20)))).toEqual(["near"]);
    expect(qFar(idx)).toEqual(["far"]);
    expect(qNeg(idx)).toEqual(["near"]);
  });
});
