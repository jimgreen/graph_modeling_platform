// buildGraphNodeSpatialIndex 的直接单测（此前 5 处生产调用、零测试直呼）。
//
// ## 它做什么
//
// 画布节点的空间索引：把每个节点的包围盒映射到 `bucketSize` 大小的网格桶里，
// 查询时只扫视口覆盖的桶。**这是画布渲染性能的地基** —— 索引错了会
// ① 该显示的节点不显示（漏查），或 ② 扫到不该扫的节点（性能塌陷）。
//
// ## 探针实测出的三条关键事实
//
// ① **桶数按 (尺寸/桶边长 + 1)² 增长**，且**边界是闭区间**：
//    10px 的节点在桶边长 100 时落 **4** 个桶（不是 1 个）——
//    因为包围盒从 `x - halfDiagonal` 起算（`graphNodeRenderBounds` 里有 +24 的
//    标签留白），必然跨过 0 号桶线。
//
// ② **★ 桶数二次方增长，理论崩溃点约 100 万 px**：
//
//    | 节点边长 | 桶数      | 耗时     |
//    |----------|-----------|----------|
//    |    100px |         6 |   0.0ms  |
//    |   1000px |       256 |   0.1ms  |
//    |   5000px |     5,184 |   1.2ms  |
//    |  10000px |    20,164 |   4.1ms  |
//    |  20000px |    80,656 |  17.7ms  |
//    |  50000px |   501,264 | 135.7ms  |
//    | 100000px | 2,005,056 | 688.1ms  |
//    |1000000px |   ——     | **RangeError: Map maximum size exceeded** |
//
//    **判定为理论上限，不修**：实测真实数据（`data/` 下 2756 个节点）的
//    `size × scale` 上界只有 **2528px**（150 × 16.85），约 700 个桶、<1ms ——
//    距崩溃点差 **400 倍**。而节点尺寸是用户可拖拽的，加保护等于凭空发明规则。
//    这里把上界与增长规律钉住，供日后真出问题时能立刻对照。
//
// ③ **NaN 坐标的节点被整体跳过**（桶键为空数组）—— 不是抛异常，是静默丢弃。
//    这意味着 NaN 节点在任何视口查询里都**查不到**（等于永远不渲染）。
import { describe, expect, test } from "vitest";
import {
  buildGraphNodeSpatialIndex,
  createGraphStore,
  graphStorePatchNodes,
  queryGraphStoreNodeSpatialIndex
} from "./graphStore";
import type { GraphNodeSpatialIndex, GraphRenderBounds } from "./graphStore";
import { calculateNodeVisualBounds, getNodeScaleX, getNodeScaleY, type ModelNode } from "./model";

const node = (id: string, x: number, y: number, width = 10, height = 10, scale = 1): ModelNode =>
  ({
    id,
    kind: "ac-load",
    name: id,
    nodeNumber: id,
    acTopologyNode: 0,
    dcTopologyNode: 0,
    position: { x, y },
    size: { width, height },
    rotation: 0,
    scale,
    terminals: [],
    params: {}
  }) as unknown as ModelNode;

const keysOf = (index: GraphNodeSpatialIndex, id: string) => index.nodeBucketKeysById.get(id) ?? [];

describe("基本映射：节点落在它包围盒覆盖的全部桶里", () => {
  test("索引包含每个节点（nodeBoundsById / nodeBucketKeysById）", () => {
    const nodes = [node("a", 0, 0), node("b", 300, 300), node("c", -200, -150)];
    const index = buildGraphNodeSpatialIndex(nodes, 100);
    expect(index.nodeBoundsById.size).toBe(3);
    for (const n of nodes) {
      expect(index.nodeBoundsById.has(n.id), n.id).toBe(true);
      expect(keysOf(index, n.id).length, `${n.id} 应至少落 1 个桶`).toBeGreaterThan(0);
    }
  });

  test("★ 每个桶里的节点，都能从该节点的 bucketKeys 反查回自己", () => {
    // 这是索引的自洽性判据：两个方向的映射必须一致。
    const nodes = [node("a", 0, 0), node("b", 5, 5), node("c", 200, 200), node("d", 95, 95, 20, 20)];
    const index = buildGraphNodeSpatialIndex(nodes, 100);
    let misses = 0;
    for (const n of nodes) {
      for (const key of keysOf(index, n.id)) {
        const inBucket = index.buckets.get(key) ?? [];
        if (!inBucket.some((x) => x.id === n.id)) misses += 1;
      }
    }
    expect(misses, "桶内应能反查到节点自身").toBe(0);
  });

  test("每个桶里的节点，其 bucketKeys 必然包含该桶的键", () => {
    // 另一方向的自洽性：桶 → 节点 → 该节点的键列表 必须含当前桶。
    const nodes = [node("a", 0, 0, 60, 60), node("b", 130, 40, 30, 30)];
    const index = buildGraphNodeSpatialIndex(nodes, 100);
    for (const [key, bucket] of index.buckets) {
      for (const member of bucket) {
        expect(keysOf(index, member.id), `${member.id} 应含桶 ${key}`).toContain(key);
      }
    }
  });

  test("空数组 → 空索引", () => {
    const index = buildGraphNodeSpatialIndex([], 100);
    expect(index.buckets.size).toBe(0);
    expect(index.nodeBoundsById.size).toBe(0);
    expect(index.nodeBucketKeysById.size).toBe(0);
  });
});

describe("★ 桶边界是闭区间：小节点也落 4 个桶（含 0 号桶线）", () => {
  // graphNodeRenderBounds 的半对角线含 +24 的标签留白，包围盒从 x-半对角起算，
  // 所以原点附近的小节点必然跨过 0 号桶线 → 4 个桶，而不是直觉上的 1 个。
  test("10px 节点在桶边长 100 时落 4 个桶", () => {
    const index = buildGraphNodeSpatialIndex([node("a", 5, 5, 10, 10)], 100);
    const keys = keysOf(index, "a");
    expect(keys.length).toBe(4);
    // 覆盖 2×2 网格
    expect(new Set(keys.map((k) => k.split(":")[0])).size).toBe(2);
    expect(new Set(keys.map((k) => k.split(":")[1])).size).toBe(2);
  });

  test("原点附近节点落在含 -1 的桶里（负桶键合法）", () => {
    const index = buildGraphNodeSpatialIndex([node("a", 0, 0, 10, 10)], 100);
    expect(keysOf(index, "a")).toContain("-1:-1");
    expect(keysOf(index, "a")).toContain("0:0");
  });

  test("节点**无论在哪个位置**，小节点都落 4 个桶（不是 1 个）", () => {
    // 探针实测：10px 节点在 (0,0)、(1000,1000)、(5000,5000) 处都是 4 桶。
    // 原因：graphNodeRenderBounds 的半对角线含 +24 标签留白，
    // 包围盒永远比节点本身大，跨过至少一条桶线时就是 2×2 = 4。
    // 我第一版写「远离原点时落 1~2 个桶」，被测试当场抓出（实测恒为 4）。
    for (const [x, y] of [[0, 0], [1000, 1000], [5000, 5000], [-2000, 3000]]) {
      const index = buildGraphNodeSpatialIndex([node("a", x, y, 10, 10)], 100);
      expect(keysOf(index, "a").length, `位置 (${x},${y})`).toBe(4);
    }
  });
});

describe("负坐标：桶键为负数且格式正常", () => {
  test("负坐标节点落负桶", () => {
    const index = buildGraphNodeSpatialIndex([node("a", -50, -50, 10, 10)], 100);
    const keys = keysOf(index, "a");
    expect(keys.length).toBeGreaterThan(0);
    for (const key of keys) {
      expect(key, `桶键格式应为 "<x>:<y>"：${key}`).toMatch(/^-?\d+:-?\d+$/);
    }
    expect(keys.some((k) => k.includes("-"))).toBe(true);
  });

  test("负大坐标也正常（不抛异常）", () => {
    const index = buildGraphNodeSpatialIndex([node("a", -500, -500, 10, 10)], 100);
    expect(keysOf(index, "a").length).toBeGreaterThan(0);
  });

  test("跨 0 轴的节点：负桶与正桶都有", () => {
    const index = buildGraphNodeSpatialIndex([node("a", 0, 0, 40, 40)], 100);
    const xs = new Set(keysOf(index, "a").map((k) => Number(k.split(":")[0])));
    expect([...xs].some((x) => x < 0)).toBe(true);
    expect([...xs].some((x) => x >= 0)).toBe(true);
  });
});

describe("尺寸异常：不抛异常，且仍有桶", () => {
  test("负宽 / 负高 / 零宽零高", () => {
    for (const [label, n] of [
      ["负宽", node("a", 0, 0, -10, 10)],
      ["负高", node("a", 0, 0, 10, -10)],
      ["零宽零高", node("a", 0, 0, 0, 0)]
    ] as Array<[string, ModelNode]>) {
      const index = buildGraphNodeSpatialIndex([n], 100);
      expect(keysOf(index, "a").length, label).toBeGreaterThan(0);
    }
  });

  test("★ NaN 坐标的节点被**静默跳过**（桶键为空数组）", () => {
    // 实测：NaN 让 spatialBucketRange 的比较全部为 false，循环体不执行。
    // 后果是该节点在**任何**视口查询里都查不到 —— 等于永不渲染，且不报错。
    // 判定为脏数据表现，不改实现；此处钉住以便日后排查。
    const index = buildGraphNodeSpatialIndex([node("a", Number.NaN, 0, 10, 10)], 100);
    expect(keysOf(index, "a")).toEqual([]);
    // 但它仍然进了 nodeBoundsById（所以不是完全不存在）
    expect(index.nodeBoundsById.has("a")).toBe(true);
  });
});

describe("★ 桶数按 (边长/桶边长 + 1)² 增长（性能上界）", () => {
  // 真实数据（2756 个节点）的 size × scale 上界是 2528px（约 700 桶、<1ms），
  // 距 Map 崩溃点（~100 万 px）差 400 倍。属理论上限，不加保护。
  // 这里钉住增长规律与几个实测锚点，日后真出性能问题时有对照基线。
  // 全部为探针实测值（我把区间收窄到实测值附近，避免"锚点"名不副实）
  const anchors: Array<[number, { min: number; max: number }]> = [
    [100, { min: 6, max: 6 }],
    [200, { min: 16, max: 16 }],
    [1000, { min: 256, max: 256 }],
    [2000, { min: 900, max: 900 }],
    [5000, { min: 5184, max: 5184 }]
  ];

  for (const [size, { min, max }] of anchors) {
    test(`${String(size).padStart(5)}px 节点 → 桶数在 [${min}, ${max}] 区间（实测锚点）`, () => {
      const index = buildGraphNodeSpatialIndex([node("a", 0, 0, size, size)], 100);
      const count = keysOf(index, "a").length;
      expect(count, `实测桶数 ${count}，应落在 [${min}, ${max}]`).toBeGreaterThanOrEqual(min);
      expect(count, `实测桶数 ${count}，应落在 [${min}, ${max}]`).toBeLessThanOrEqual(max);
    });
  }

  test("桶数随尺寸单调不减（翻倍则桶数量级翻四倍）", () => {
    const counts = [500, 1000, 2000, 4000].map(
      (size) => keysOf(buildGraphNodeSpatialIndex([node("a", 0, 0, size, size)], 100), "a").length
    );
    for (let i = 1; i < counts.length; i += 1) {
      expect(counts[i], `尺寸翻倍后桶数应增加：${counts.join(" → ")}`).toBeGreaterThan(counts[i - 1]);
    }
  });

  test("★ 实测上界锚点：20000px → 80656 桶（实测值）", () => {
    const index = buildGraphNodeSpatialIndex([node("a", 0, 0, 20000, 20000)], 100);
    expect(keysOf(index, "a").length).toBe(80656);
  });

  test("真实数据量级（2528px 有效边长）→ 1444 桶（实测值）", () => {
    // data/ 下 size × scale 的实测上界：150 × 16.85 = 2528
    const index = buildGraphNodeSpatialIndex([node("a", 0, 0, 2528, 2528)], 100);
    expect(keysOf(index, "a").length).toBe(1444);
  });
});

describe("scale 影响桶数（graphNodeRenderBounds 含缩放）", () => {
  test("同一 size 下 scale 越大桶数越多", () => {
    const plain = keysOf(buildGraphNodeSpatialIndex([node("a", 0, 0, 100, 100, 1)], 100), "a").length;
    const scaled = keysOf(buildGraphNodeSpatialIndex([node("a", 0, 0, 100, 100, 5)], 100), "a").length;
    expect(scaled).toBeGreaterThan(plain);
  });

  test("真实数据里的最大 scale 16.85（150px → 有效 2528px）→ 1444 桶（实测值）", () => {
    const index = buildGraphNodeSpatialIndex([node("a", 0, 0, 150, 150, 16.8533333333333)], 100);
    expect(keysOf(index, "a").length).toBe(1444);
    // 与「直接给 2528px 尺寸」结果相同 —— 证明 scale 走的是同一条放大路径
    expect(keysOf(index, "a")).toEqual(keysOf(buildGraphNodeSpatialIndex([node("a", 0, 0, 2528, 2528)], 100), "a"));
  });
});

describe("重复 id：后写覆盖（既有行为，如实记录）", () => {
  test("nodeBoundsById 只保留最后一个，bucketKeys 会被合并", () => {
    const index = buildGraphNodeSpatialIndex([node("a", 0, 0), node("a", 200, 200)], 100);
    expect(index.nodeBoundsById.size).toBe(1);
    // 两次分配的桶键都会累加（不是替换）
    expect(keysOf(index, "a").length).toBeGreaterThan(1);
  });

  test("**只认最后一个位置**：nodeBoundsById 存的是后一个节点的包围盒，且查询按它判定相交", () => {
    // 「真实数据不应出现重复 id」是数据侧依赖，本文件不读 data/（遵守 dataSampleGuard 约定），
    // 断言不了；此处改为钉住它的**后果** —— 一旦出现重复 id，渲染认哪个位置。
    // 上一条只钉了 size===1 与 keys.length>1，这两个数在「先写赢」的实现下同样成立，
    // 分不出胜负；所以这里必须比对**具体是哪一个节点的包围盒**，并从查询侧再看一遍后果。
    /** 单节点索引的包围盒当 oracle：单节点时没有覆盖歧义，与被测的重复路径无关。 */
    const boundsOfOnlyNode = (position: { x: number; y: number }): GraphRenderBounds => {
      const bounds = buildGraphNodeSpatialIndex([node("a", position.x, position.y)], 100).nodeBoundsById.get("a");
      if (!bounds) throw new Error("单节点索引里应能取到包围盒");
      return bounds;
    };
    const firstBounds = boundsOfOnlyNode({ x: 0, y: 0 });
    const lastBounds = boundsOfOnlyNode({ x: 200, y: 200 });
    // 两侧的桶键必须真的不重叠，否则「按位置分别查询」测不出覆盖语义
    expect(keysOf(buildGraphNodeSpatialIndex([node("a", 0, 0)], 100), "a")).not.toEqual(
      keysOf(buildGraphNodeSpatialIndex([node("a", 200, 200)], 100), "a")
    );

    const duplicated = buildGraphNodeSpatialIndex([node("a", 0, 0), node("a", 200, 200)], 100);

    // ① 赢的是**后一个**：存下来的必须是 (200,200) 的包围盒，且明确不是 (0,0) 的那个
    expect(duplicated.nodeBoundsById.get("a")).toEqual(lastBounds);
    expect(duplicated.nodeBoundsById.get("a")).not.toEqual(firstBounds);

    // ② 渲染侧后果：查询的相交判定读 nodeBoundsById，所以
    //    视口罩住最后一个位置 → 查得到；视口只罩住最早那个位置 → 查不到（已被覆盖）
    expect(queryGraphStoreNodeSpatialIndex(duplicated, lastBounds).map((target) => target.id)).toEqual(["a"]);
    expect(queryGraphStoreNodeSpatialIndex(duplicated, firstBounds).map((target) => target.id)).toEqual([]);
  });
});

describe("默认 bucketSize", () => {
  test("不传第二参时用默认桶边长（不抛异常、结果合理）", () => {
    const withDefault = buildGraphNodeSpatialIndex([node("a", 0, 0)]);
    expect(keysOf(withDefault, "a").length).toBeGreaterThan(0);
    // 默认值应与显式传一个小桶边长的结果不同（说明默认值确实生效）
    const explicitSmall = buildGraphNodeSpatialIndex([node("a", 0, 0)], 10);
    expect(keysOf(explicitSmall, "a").length).not.toBe(keysOf(withDefault, "a").length);
  });
});

// queryGraphStoreNodeSpatialIndex 是视口裁剪的入口（App.tsx / appCanvasViewportBatch /
// appGraphMeasurementFactories / appStateBatch 共 5 处生产调用，此前零测试）。
// 判错的后果都不抛异常：漏查 → 视口内的节点凭空消失（画面缺图元）；多查 → 白渲染一批。
// 所以下面全部用「独立重算的包围盒 + 暴力相交过滤」当 oracle，而不是拿索引自己的 nodeBoundsById 当答案。
describe("queryGraphStoreNodeSpatialIndex", () => {
  /** 独立复算 graphNodeRenderBounds：标签包围盒与「半对角 + 24」的方形取并集。 */
  const renderBoundsOf = (target: ModelNode): GraphRenderBounds => {
    const labelAware = calculateNodeVisualBounds(target, 24);
    const halfDiagonal = Math.hypot(target.size.width * getNodeScaleX(target), target.size.height * getNodeScaleY(target)) / 2 + 24;
    return {
      left: Math.min(labelAware.left, target.position.x - halfDiagonal),
      right: Math.max(labelAware.right, target.position.x + halfDiagonal),
      top: Math.min(labelAware.top, target.position.y - halfDiagonal),
      bottom: Math.max(labelAware.bottom, target.position.y + halfDiagonal)
    };
  };

  const intersects = (first: GraphRenderBounds, second: GraphRenderBounds) =>
    first.left <= second.right && first.right >= second.left && first.top <= second.bottom && first.bottom >= second.top;

  const bruteForceIds = (nodes: readonly ModelNode[], bounds: GraphRenderBounds) =>
    nodes.filter((target) => intersects(renderBoundsOf(target), bounds)).map((target) => target.id).sort();

  const queriedIds = (index: GraphNodeSpatialIndex, bounds: GraphRenderBounds) =>
    queryGraphStoreNodeSpatialIndex(index, bounds).map((target) => target.id).sort();

  /** 确定性伪随机节点集：不用 Math.random，失败要能原样重跑。 */
  const pseudoRandomNodes = (count: number): ModelNode[] => {
    let seed = 20260930;
    const next = () => {
      seed = (seed * 1103515245 + 12345) % 2147483648;
      return seed / 2147483648;
    };
    return Array.from({ length: count }, (_, position) =>
      node(`n-${position}`, Math.round((next() - 0.5) * 4000), Math.round((next() - 0.5) * 4000), 20 + Math.round(next() * 80), 20 + Math.round(next() * 80))
    );
  };

  test("★ 查询结果与暴力相交过滤逐个视口一致", () => {
    const nodes = pseudoRandomNodes(60);
    const index = buildGraphNodeSpatialIndex(nodes, 128);
    const views: GraphRenderBounds[] = [
      { left: -500, right: 500, top: -500, bottom: 500 },
      { left: 1200, right: 2400, top: -800, bottom: 200 },
      { left: -2000, right: -1000, top: 1500, bottom: 2000 },
      { left: 0, right: 0, top: 0, bottom: 0 },
      { left: -5000, right: 5000, top: -5000, bottom: 5000 }
    ];

    for (const view of views) {
      expect(queriedIds(index, view), JSON.stringify(view)).toEqual(bruteForceIds(nodes, view));
    }
    // 护栏：确认上面不是「两边都返回空」这种恒真比较
    expect(bruteForceIds(nodes, views[4])).toHaveLength(nodes.length);
    expect(bruteForceIds(nodes, views[0]).length).toBeGreaterThan(0);
    expect(bruteForceIds(nodes, views[2]).length).toBeGreaterThan(0);
  });

  test("跨多个桶的大节点只返回一次（去重标记生效）", () => {
    // 400px 节点在桶边长 50 时占 ~9×9 = 81 个桶；不带去重就会返回 81 个副本
    const big = node("big", 0, 0, 400, 400);
    const index = buildGraphNodeSpatialIndex([big], 50);

    expect(keysOf(index, "big").length).toBeGreaterThan(4);
    expect(queriedIds(index, { left: -1000, right: 1000, top: -1000, bottom: 1000 })).toEqual(["big"]);
  });

  test("空索引返回空数组", () => {
    const index = buildGraphNodeSpatialIndex([], 100);

    expect(queryGraphStoreNodeSpatialIndex(index, { left: 0, right: 1000, top: 0, bottom: 1000 })).toEqual([]);
  });

  test("包围盒相接（不重叠）也算相交：四个方向都是闭区间", () => {
    const target = node("a", 500, 500, 100, 100);
    const index = buildGraphNodeSpatialIndex([target], 100);
    const bounds = renderBoundsOf(target);
    const strip: Pick<GraphRenderBounds, "top" | "bottom"> = { top: bounds.top, bottom: bounds.bottom };
    // 视口正好从节点包围盒右边界开始：节点在视口里（只是贴着边）
    expect(queriedIds(index, { ...strip, left: bounds.right, right: bounds.right + 10 })).toEqual(["a"]);
    // 视口正好在节点包围盒左边界结束
    expect(queriedIds(index, { ...strip, left: bounds.left - 10, right: bounds.left })).toEqual(["a"]);
    // 纵向同理
    expect(queriedIds(index, { left: bounds.left, right: bounds.right, top: bounds.bottom, bottom: bounds.bottom + 10 })).toEqual(["a"]);
    // 只差 0.5px 就查不到
    expect(queriedIds(index, { ...strip, left: bounds.right + 0.5, right: bounds.right + 100 })).toEqual([]);
  });

  test("入参既可以是 GraphStore 也可以是裸索引（生产两种都传）", () => {
    const nodes = pseudoRandomNodes(20);
    const store = createGraphStore(nodes, []);
    const view: GraphRenderBounds = { left: -100, right: 100, top: -100, bottom: 100 };
    const fromStore = queryGraphStoreNodeSpatialIndex(store, view).map((target) => target.id).sort();
    const fromIndex = queryGraphStoreNodeSpatialIndex(store.nodeSpatialIndex, view).map((target) => target.id).sort();

    expect(fromStore).toEqual(fromIndex);
    expect(fromStore).toEqual(bruteForceIds(nodes, view));
  });

  test("★ patch 移动节点后：新位置查到、旧位置查不到，且仍与暴力一致", () => {
    const nodes = [node("a", 0, 0), node("b", 900, 900)];
    const store = createGraphStore(nodes, []);
    const oldKeys = keysOf(store.nodeSpatialIndex, "a");
    const moved = { ...node("a", 2000, 2000), position: { x: 2000, y: 2000 } } as ModelNode;

    const next = graphStorePatchNodes(store, [moved]);
    const near = renderBoundsOf(node("a", 2000, 2000));
    const view: GraphRenderBounds = { left: near.left, right: near.right, top: near.top, bottom: near.bottom };

    expect(queryGraphStoreNodeSpatialIndex(next, view).map((target) => target.id)).toEqual(["a"]);
    expect(queryGraphStoreNodeSpatialIndex(next, { left: -200, right: 200, top: -200, bottom: 200 })).toEqual([]);
    expect(queriedIds(next.nodeSpatialIndex, view)).toEqual(bruteForceIds([moved, nodes[1]], view));
    // 旧桶里不能还留着这个节点的引用 —— 查询层的精确判定靠 nodeBoundsById 兜底，
    // 桶里若留着陈旧节点，将来包围盒缺失时就会命中错误对象（nodeBoundsById.get ?? graphNodeRenderBounds 兜底路径）。
    for (const key of oldKeys) {
      const bucket = next.nodeSpatialIndex.buckets.get(key) ?? [];
      expect(bucket.filter((item) => item.id === "a"), `旧桶 ${key}`).toEqual([]);
    }
    expect(keysOf(next.nodeSpatialIndex, "a")).not.toEqual(oldKeys);
    expect(next.nodeSpatialIndex.nodeBoundsById.get("a")).toEqual(near);
  });

  test("★ patch 是 copy-on-write：搬进别人已占的桶时也不就地改写旧 store", () => {
    // 画布每帧拿上一帧的 store 做增量更新，旧 store 必须仍是那一帧的事实。
    // 就地改写会让「已经算好、准备提交的」那一帧突然变样，且这类 bug 只在拖拽中出现。
    //
    // 关键是把 a 搬**进 b 已经占的桶**：那些桶在移除阶段没被碰过（里面没有 a），
    // 于是走到 `!copiedBucketKeys.has(key)` 分支 —— 那里必须 slice 出新数组再 push。
    // 若搬到空桶，该分支根本不会执行，copy-on-write 就测不到。
    const nodes = [node("a", 0, 0), node("b", 500, 500)];
    const store = createGraphStore(nodes, []);
    const sharedKey = keysOf(store.nodeSpatialIndex, "b")[0];
    const bucketBefore = store.nodeSpatialIndex.buckets.get(sharedKey);
    const bucketSnapshot = [...(bucketBefore ?? [])];

    const moved = { ...nodes[0], position: { x: 505, y: 505 } } as ModelNode;
    const next = graphStorePatchNodes(store, [moved]);

    expect(keysOf(next.nodeSpatialIndex, "a")).toContain(sharedKey);
    // 新索引：共享桶里有 a 和 b
    expect((next.nodeSpatialIndex.buckets.get(sharedKey) ?? []).map((item) => item.id).sort()).toEqual(["a", "b"]);
    // 旧索引：还是原来那一个数组，内容原封不动
    expect(store.nodeSpatialIndex.buckets.get(sharedKey)).toBe(bucketBefore);
    expect([...(store.nodeSpatialIndex.buckets.get(sharedKey) ?? [])]).toEqual(bucketSnapshot);
  });

  test("patch 后跨桶大节点仍只出现一次", () => {
    const nodes = [node("big", 0, 0, 400, 400)];
    const store = createGraphStore(nodes, []);
    const grown = { ...nodes[0], size: { width: 900, height: 900 } } as ModelNode;
    const next = graphStorePatchNodes(store, [grown]);

    expect(queryGraphStoreNodeSpatialIndex(next, { left: -5000, right: 5000, top: -5000, bottom: 5000 })).toHaveLength(1);
  });

  test("patch 不存在的 id 被忽略，索引不变", () => {
    const nodes = [node("a", 0, 0)];
    const store = createGraphStore(nodes, []);

    const next = graphStorePatchNodes(store, [node("幽灵", 500, 500)]);

    expect(queryGraphStoreNodeSpatialIndex(next, { left: -500, right: 500, top: -500, bottom: 500 }).map((n) => n.id)).toEqual(["a"]);
    expect(next.nodeSpatialIndex.nodeBoundsById.has("幽灵")).toBe(false);
  });

  test("seenById 去重表超过上限会清空重建，清完查询依然正确", () => {
    // seenById 只增不减，长期编辑（图元反复建删）会无限累积；超过 16384 清空重建。
    // 变异实测：把 > 改成 >= 或把 clear 去掉都不会让本条变红，所以这里钉的是
    // 「清空前后查询结果一致」这个对外可观测的性质，而不是清空的精确阈值。
    const nodes = pseudoRandomNodes(30);
    const index = buildGraphNodeSpatialIndex(nodes, 64);
    const view: GraphRenderBounds = { left: -600, right: 600, top: -600, bottom: 600 };
    const expected = bruteForceIds(nodes, view);

    for (let round = 0; round < 16400; round += 1) {
      expect(queriedIds(index, view), `第 ${round} 轮`).toEqual(expected);
    }
    expect(index.queryState.seenById.size).toBeLessThanOrEqual(16385);
  });

  // 变异实测：`nextBoundsById.delete(previousNode.id)` 去掉不会让任何一条变红 ——
  // 同一个 id 在本函数尾部必然被 set 覆盖（update 的 id 来自 store.nodeIndexById 查表），
  // 所以那句 delete 行为上等价，不是「漏测」。查询侧也察觉不到：nodeBoundsById 总是新值。
});

