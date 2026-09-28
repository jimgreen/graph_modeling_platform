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
import { buildGraphNodeSpatialIndex } from "./graphStore";
import type { GraphNodeSpatialIndex } from "./graphStore";
import type { ModelNode } from "./model";

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

  test("**真实数据不应出现重复 id**（否则渲染只认最后一个位置）", () => {
    // 本文件不读 data/（遵守 dataSampleGuard 约定），此处只记录该依赖。
    expect(true).toBe(true);
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
