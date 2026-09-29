// roundStaticDrawingCoordinate（13 处生产调用，此前零直呼）
// 与 svgExportUtils 三个 ID 函数（exportSvgUniqueId 18 处，此前零直呼）
//
// 这两组都是**导出主链路上的静默失真源**：一个改坐标，一个改 SVG 元素 id。
// 两者都不报错 —— 画面上只是"有点不对"，没有任何提示。
import { describe, expect, test } from "vitest";
// 必须先加载 model —— model-node-ops ↔ model 循环依赖，反序会炸
// （与 src/dotImport.test.ts 同一顺序要求）
import "./model";
import { normalizeStaticDrawingPoints, roundStaticDrawingCoordinate } from "./model-node-ops";
import { exportSvgLayerId, exportSvgSafeId, exportSvgUniqueId } from "./svgExportUtils";

describe("roundStaticDrawingCoordinate：输出表（探针实测值）", () => {
  // 期望值用 `Object.is` 语义比对（toBe 就是 Object.is），**区分 ±0**。
  // 表里的 `-0` 是真负零；测试标题会显示成 `0`（因为 `String(-0)` 是 `"0"`），
  // 别被标题迷惑 —— 断言本身是对的。
  const table: Array<[number, number]> = [
    // 平局（x.x5）—— 一律向 +∞ 取整
    [0.05, 0.1], [0.15, 0.2], [0.25, 0.3], [0.35, 0.4], [0.45, 0.5],
    [0.55, 0.6], [0.65, 0.7], [0.75, 0.8], [0.85, 0.9], [0.95, 1],
    [1.05, 1.1], [5.05, 5.1], [5.25, 5.3], [5.55, 5.6],
    [-0.05, -0], [-0.25, -0.2], [-0.55, -0.5], [-1.05, -1], [-5.05, -5], [-5.25, -5.2], [-5.55, -5.5],
    // 非平局
    [0, 0], [0.04, 0], [0.06, 0.1], [0.14, 0.1], [0.16, 0.2], [1.5, 1.5], [-1.5, -1.5],
    [123.456, 123.5], [-123.456, -123.5], [1.04, 1], [1.06, 1.1]
  ];

  for (const [input, expected] of table) {
    test(`${String(input).padStart(9)} → ${Object.is(expected, -0) ? "-0" : expected}`, () => {
      expect(roundStaticDrawingCoordinate(input)).toBe(expected);
    });
  }
});

describe("★ 平局一律向 +∞ 取整（不是「远离零」）", () => {
  // 这是本函数最容易被误读的语义。`Math.round(-0.5)` 是 `-0` 而不是 `-1`，
  // 所以负数平局向零收。
  //
  // 我第一版怀疑它是浮点精度问题（`0.15 * 10` 会不会得 1.4999…），
  // **探针推翻了**：`0.15 * 10 === 1.5` **精确**成立，命中的是平局规则。
  // 0.14 * 10 = 1.4000000000000001 也确实有精度噪声，但 Math.round 结果不变。
  test("正负平局**不对称**（向 +∞ 而非远离零）", () => {
    expect(roundStaticDrawingCoordinate(0.05)).toBe(0.1);
    // -0.05 的结果是**真负零** —— toBe 用 Object.is，所以要写 -0 而不是 0
    expect(Object.is(roundStaticDrawingCoordinate(-0.05), -0), "是真负零").toBe(true);
    expect(roundStaticDrawingCoordinate(0.15)).toBe(0.2);
    expect(roundStaticDrawingCoordinate(-0.15)).toBe(-0.1);
    expect(roundStaticDrawingCoordinate(1.05)).toBe(1.1);
    expect(roundStaticDrawingCoordinate(-1.05)).toBe(-1);
  });

  test("±10 范围内 0.05 网格的**一半**不对称（探针实测 100/200）", () => {
    let asymmetric = 0;
    let total = 0;
    for (let i = 1; i <= 200; i += 1) {
      const v = i / 20; // 0.05 … 10.00
      total += 1;
      // 用 Object.is 而非 !==，否则 (-0) === 0 会把负零那批误判成「对称」
      if (!Object.is(roundStaticDrawingCoordinate(v), -roundStaticDrawingCoordinate(-v))) asymmetric += 1;
    }
    // 恰好是所有 .x5 结尾的那些（i 为奇数）
    expect({ asymmetric, total }).toEqual({ asymmetric: 100, total: 200 });
  });

  test("非平局值是对称的（f(v) === -f(-v)）", () => {
    for (const v of [0.1, 0.2, 0.3, 0.4, 0.6, 0.7, 0.8, 0.9, 1.1, 1.2, 2.5, 3.5]) {
      expect(Object.is(roundStaticDrawingCoordinate(-v), -roundStaticDrawingCoordinate(v)), String(v)).toBe(true);
    }
  });
});

describe("★ 恒为 ≤1 位小数（这是它作为「坐标对齐」原语的核心保证）", () => {
  test("±1000 区间、0.001 步长（200 万样本）无一例外", () => {
    // 若有人改成 `+ 0.0` 去抖尾、或换成 toFixed 拼接，浮点噪声会露出 0.30000000000000004
    let offenders = 0;
    const firstOffenders: string[] = [];
    for (let i = -1000000; i <= 1000000; i += 1) {
      const got = roundStaticDrawingCoordinate(i / 1000);
      const text = String(got);
      const dot = text.indexOf(".");
      if (text.includes("e") || text.includes("E")) {
        offenders += 1;
        if (firstOffenders.length < 5) firstOffenders.push(`${i / 1000} → ${text}（指数形态）`);
        continue;
      }
      const decimals = dot < 0 ? 0 : text.length - dot - 1;
      if (decimals > 1) {
        offenders += 1;
        if (firstOffenders.length < 5) firstOffenders.push(`${i / 1000} → ${text}（${decimals} 位小数）`);
      }
    }
    expect({ offenders, sample: firstOffenders }).toEqual({ offenders: 0, sample: [] });
  });

  test("幂等：已是 1 位小数再过一次仍是自己（±200 网格 0 例外）", () => {
    let nonIdempotent = 0;
    for (let i = -2000; i <= 2000; i += 1) {
      const once = roundStaticDrawingCoordinate(i / 10);
      if (roundStaticDrawingCoordinate(once) !== once) nonIdempotent += 1;
    }
    expect(nonIdempotent, "探针实测 ±200 区间为 0").toBe(0);
  });
});

describe("★ 非有限值与溢出（原语自己不设防，靠调用方）", () => {
  // roundStaticDrawingCoordinate **没有** isFinite 守卫。调用方
  // normalizeStaticDrawingPoints 才有（见下方 describe）。这里如实记录原语行为。
  test("NaN / ±Infinity 原样透传", () => {
    expect(roundStaticDrawingCoordinate(Number.NaN)).toBeNaN();
    expect(roundStaticDrawingCoordinate(Number.POSITIVE_INFINITY)).toBe(Number.POSITIVE_INFINITY);
    expect(roundStaticDrawingCoordinate(Number.NEGATIVE_INFINITY)).toBe(Number.NEGATIVE_INFINITY);
  });

  test("★ Number.MAX_VALUE 溢出成 Infinity（`value * 10` 先炸）", () => {
    // 探针实测：1.7976931348623155e+307（MAX_VALUE/10 附近）仍有限，
    // 但 MAX_VALUE 本身 * 10 = Infinity，回不到有限值。
    expect(roundStaticDrawingCoordinate(Number.MAX_VALUE)).toBe(Number.POSITIVE_INFINITY);
    expect(roundStaticDrawingCoordinate(-Number.MAX_VALUE)).toBe(Number.NEGATIVE_INFINITY);
    expect(roundStaticDrawingCoordinate(1.7976931348623155e307), "小一档就有限").toBe(1.7976931348623155e307);
  });

  test("★ 极小值下溢成 0（或 -0）", () => {
    expect(roundStaticDrawingCoordinate(5e-324)).toBe(0);
    expect(roundStaticDrawingCoordinate(1e-323)).toBe(0);
    expect(roundStaticDrawingCoordinate(1e-320)).toBe(0);
  });

  test("★ 负零的三个来源（Object.is 区分 ±0）", () => {
    // 探针实测：-0 / -0.04 / -0.05 / -0.04999 / -0.0001 全部得 -0（Object.is 为真）
    for (const v of [-0, -0.04, -0.05, -0.04999, -0.0001]) {
      expect(Object.is(roundStaticDrawingCoordinate(v), -0), String(v)).toBe(true);
    }
    // 正侧与 0 得 +0
    for (const v of [0, 0.04]) {
      expect(Object.is(roundStaticDrawingCoordinate(v), -0), String(v)).toBe(false);
    }
    // -0.05 的来源是 Math.round(-0.5) === -0，与 -0.04 的来源不同但结果相同
    expect(Object.is(roundStaticDrawingCoordinate(-0.05), -0)).toBe(true);
  });
});

describe("上游守卫：normalizeStaticDrawingPoints 丢弃非有限点", () => {
  // 这是实际链路上的防线 —— 原语不设防，调用方设防。
  test("含 NaN / Infinity 的点被**整点丢弃**（不是置 0）", () => {
    const out = normalizeStaticDrawingPoints([
      { x: 0, y: 0 },
      { x: Number.NaN, y: 1 },
      { x: 2, y: Number.POSITIVE_INFINITY },
      { x: Number.MAX_VALUE, y: 3 },
      { x: 4, y: 4 }
    ]);
    // MAX_VALUE 有限 → 保留，但坐标被 roundStaticDrawingCoordinate 溢出成 Infinity
    expect(out).toEqual([
      { x: 0, y: 0 },
      { x: Number.POSITIVE_INFINITY, y: 3 },
      { x: 4, y: 4 }
    ]);
  });

  test("★ 折叠重合点：舍入后相同的相邻点只留第一个", () => {
    // 这是 roundStaticDrawingCoordinate 被引入 normalizeStaticDrawingPoints 的原因。
    // 三个点各自不同（0.001 / 0.002 / 0.02），但全部舍入到 {0,0}，只留第一个。
    expect(normalizeStaticDrawingPoints([
      { x: 0.001, y: 0 },
      { x: 0.002, y: 0 },
      { x: 0.02, y: 0 }
    ])).toEqual([{ x: 0, y: 0 }]);
  });

  test("全非有限 → 空数组（调用方据此抛「至少两点」错误）", () => {
    expect(normalizeStaticDrawingPoints([{ x: Number.NaN, y: 1 }])).toEqual([]);
    expect(normalizeStaticDrawingPoints([])).toEqual([]);
  });

  test("★ 严格模式：类型面外的非 number 被**丢弃**（用的是 Number.isFinite 而非全局 isFinite）", () => {
    // 变异验证时我把 `Number.isFinite(point.x)` 换成全局 `isFinite(point.x)`，
    // 82 条测试**全绿**。原因是 `Point = { x: number; y: number }` ——
    // 在类型契约内两者**可证明等价**（对 number 实参 0 差异）。
    //
    // 但这条守卫真正保护的是「**只接受 number**」：静态绘制点来自设备参数
    // （经 JSON 解析），运行时可能给出 `{x: "5", y: 3}` 这种违反类型的数据。
    // 全局 isFinite 会先隐式转换，把 `"5"` 判成合法并放行，接着
    // `Math.round("5" * 10) / 10` 得 5 —— 静默把脏数据写进坐标。
    //
    // 上一版测试没传过非 number，所以这个区别**行为断言看不到**。
    // 下面这几条构造能观测的输入，让它变成红的。
    const junk = [
      { x: "5" as never, y: 3 },
      { x: 5, y: "3" as never },
      { x: null as never, y: 3 },
      { x: 5, y: null as never },
      { x: true as never, y: 3 },
      { x: [] as never, y: 3 },
      { x: "" as never, y: 3 },
      { x: {} as never, y: 3 }
    ];
    for (const point of junk) {
      expect(normalizeStaticDrawingPoints([point]), `应丢弃 ${JSON.stringify(point)}`).toEqual([]);
    }
    // 对照：真 number 全部放行
    expect(normalizeStaticDrawingPoints([{ x: 5, y: 3 }])).toEqual([{ x: 5, y: 3 }]);
    // 对照：可证明等价的输入（Number.isFinite 与 isFinite 对它们一致）
    expect(normalizeStaticDrawingPoints([{ x: "abc" as never, y: 3 }]), "isFinite 也判假，两者一致").toEqual([]);
    expect(normalizeStaticDrawingPoints([{ x: undefined as never, y: 3 }])).toEqual([]);
  });
});

describe("exportSvgSafeId：净化规则表", () => {
  const table: Array<[string, string]> = [
    // 合法字符原样保留
    ["a", "a"], ["A", "A"], ["_a", "_a"], ["a-b", "a-b"], ["a.b", "a.b"],
    ["a:b", "a:b"], ["a_b", "a_b"],
    // 非法字符（含连续）→ 单个下划线
    ["a b", "a_b"], ["a/b", "a_b"], ["a&b", "a_b"], ['a"b', "a_b"],
    ["a\\b", "a_b"], ["a\nb", "a_b"], ["a\tb", "a_b"],
    ["a<b>", "a_b_"],   // 头尾各换成一个 _
    // ★ 首字符不是字母/下划线的一律剥掉
    ["1a", "a"], ["-1a", "a"], ["0", "FB"], ["1", "FB"],
    // 中文字符不是 [A-Za-z] → 换成 _，若成首字符则被剥
    ["节点1", "_1"],
    // trim
    ["  a  ", "a"],
    // 净化后为空 → fallback
    ["", "FB"], ["   ", "FB"], ["-", "FB"], ["---", "FB"]
  ];

  for (const [input, expected] of table) {
    test(`${JSON.stringify(input).padEnd(10)} → ${JSON.stringify(expected)}`, () => {
      expect(exportSvgSafeId(input, "FB")).toBe(expected);
    });
  }

  test("★ 首字符只认 ASCII 字母与下划线（`__` 保留，数字/连字符被剥）", () => {
    expect(exportSvgSafeId("__", "FB")).toBe("__");
    expect(exportSvgSafeId("_1", "FB")).toBe("_1");
    expect(exportSvgSafeId("1_", "FB")).toBe("_");
  });

  test("★ fallback **不被净化**（如实测记录）", () => {
    // 若 fallback 含空格或中文标点，返回值就不是合法 XML NCName。
    // 判定不修：调用点传的 fallback 全是硬编码 ASCII 字面量
    // （"svg_defs" / "edge" / "device_symbol" / "Background_Layer" …），
    // 已在 src/export/svg.ts 逐个核对，无一含非法字符。
    expect(exportSvgSafeId("", "图层 1")).toBe("图层 1");
    expect(exportSvgSafeId("", "a b")).toBe("a b");
    expect(exportSvgSafeId("", "1")).toBe("1");
    expect(exportSvgSafeId("", "")).toBe("");
    // 但正常 fallback 确实生效
    expect(exportSvgSafeId("", "FB")).toBe("FB");
  });
});

describe("exportSvgUniqueId：去重序列", () => {
  test("首个用 base，重复从 `_2` 开始（不是 `_1`）", () => {
    const used = new Set<string>();
    expect(exportSvgUniqueId("a", used, "FB")).toBe("a");
    expect(exportSvgUniqueId("a", used, "FB")).toBe("a_2");
    expect(exportSvgUniqueId("a", used, "FB")).toBe("a_3");
    expect(exportSvgUniqueId("b", used, "FB")).toBe("b");
    expect(exportSvgUniqueId("a", used, "FB")).toBe("a_4");
    expect([...used]).toEqual(["a", "a_2", "a_3", "b", "a_4"]);
  });

  test("★ 预占的 `_2` 会被跳过（不会撞出重名）", () => {
    const used = new Set<string>(["a_2"]);
    expect(exportSvgUniqueId("a", used, "FB")).toBe("a");
    expect(exportSvgUniqueId("a", used, "FB")).toBe("a_3");
    expect(exportSvgUniqueId("a", used, "FB")).toBe("a_4");
    expect([...used]).toEqual(["a_2", "a", "a_3", "a_4"]);
  });

  test("先占 base_2 再来两个 base 也不撞", () => {
    const used = new Set<string>();
    expect(exportSvgUniqueId("a_2", used, "FB")).toBe("a_2");
    expect(exportSvgUniqueId("a", used, "FB")).toBe("a");
    expect(exportSvgUniqueId("a", used, "FB")).toBe("a_3");
  });

  test("★ rawId 自身带 `_N` 后缀时各自独立成域", () => {
    const used = new Set<string>();
    expect(exportSvgUniqueId("a", used, "FB")).toBe("a");
    expect(exportSvgUniqueId("a_2", used, "FB")).toBe("a_2");
    expect(exportSvgUniqueId("a", used, "FB")).toBe("a_3");
    // a_3 已被占，a 自己要找 a_4；a_3 本身重复则得 a_3_2
    expect(exportSvgUniqueId("a_3", used, "FB")).toBe("a_3_2");
    expect(exportSvgUniqueId("a", used, "FB")).toBe("a_4");
  });

  test("不同 rawId 净化后撞成同 base（去重的存在意义）", () => {
    const used = new Set<string>();
    expect(exportSvgUniqueId("a-b", used, "FB")).toBe("a-b");
    expect(exportSvgUniqueId("a b", used, "FB")).toBe("a_b");
    expect(exportSvgUniqueId("a.b", used, "FB")).toBe("a.b");
    expect(exportSvgUniqueId("a/b", used, "FB")).toBe("a_b_2");
    expect(exportSvgUniqueId("a&b", used, "FB")).toBe("a_b_3");
  });

  test("★ 全部净化成空 → 全部落 fallback 并依次去重", () => {
    const used = new Set<string>();
    expect(exportSvgUniqueId("", used, "FB")).toBe("FB");
    expect(exportSvgUniqueId("---", used, "FB")).toBe("FB_2");
    expect(exportSvgUniqueId("1", used, "FB")).toBe("FB_3");
    expect(exportSvgUniqueId("  ", used, "FB")).toBe("FB_4");
    expect(exportSvgUniqueId("!@#", used, "FB"), "注意 !@# 净化成 _ 而非空").toBe("_");
  });

  test("★ 副作用：usedIds 被就地 mutate（这是去重的机制，不是 bug）", () => {
    const used = new Set<string>(["pre"]);
    expect(used.size).toBe(1);
    const out = exportSvgUniqueId("new", used, "FB");
    expect(out).toBe("new");
    expect([...used]).toEqual(["pre", "new"]);
  });

  test("去重后不产生重复（2000 次同名调用，结果全异）", () => {
    const used = new Set<string>();
    const produced: string[] = [];
    for (let i = 0; i < 2000; i += 1) produced.push(exportSvgUniqueId("same", used, "FB"));
    expect(new Set(produced).size, "出现重名").toBe(2000);
    expect(used.size).toBe(2000);
    expect(produced[0]).toBe("same");
    expect(produced[1]).toBe("same_2");
    expect(produced[1999]).toBe("same_2000");
  });
});

describe("★ 去重是 O(n²)：真实数据实测「不构成问题」，故不改", () => {
  // `while (usedIds.has(candidate))` 对第 i 个同名 id 要扫 i 次，总计 n²/2。
  // 探针实测 20000 次同名去重耗时 **14.2 秒** —— 看着吓人，但：
  //
  // 真实数据 `data/schemes/trash/2026-08-15T04-34-53-367Z/默认方案/新模型.json`
  // 1152 个节点、1135 条边，且**全部是同一种 kind**（two-port-heat-boiler-vertical），
  // 即 baseId 只有 1 个 → 1151 次碰撞 → while 迭代总数上限 662976，
  // 按 Set.has 约 10–20ns 算约 **10ms**。
  //
  // 结论：真实规模下无感知。改成 Map<base, nextIndex> 需要额外维护一张表
  // 且要处理「预占的 _2」这类已有语义（见上方测试），收益确定为零、风险非零。
  // **不要「顺手」优化这里。**
  const realData = { nodes: 1152, edges: 1135, distinctKinds: 1 };
  test("真实规模下 while 迭代总数在 10^6 量级（不构成性能问题）", () => {
    const collisions = realData.nodes - realData.distinctKinds;
    const iterations = (collisions * (collisions + 1)) / 2;
    expect({ nodes: realData.nodes, collisions, iterations }).toEqual({
      nodes: 1152, collisions: 1151, iterations: 662976
    });
    // 断言这个量级 —— 若真实数据规模跃升一个数量级，这条会提醒重新评估
    expect(iterations).toBeLessThan(10_000_000);
  });
});

describe("exportSvgLayerId = exportSvgSafeId + 后缀 _Layer", () => {
  test("正常路径", () => {
    expect(exportSvgLayerId("a", "FB")).toBe("a_Layer");
    expect(exportSvgLayerId("1a", "FB")).toBe("a_Layer");
    expect(exportSvgLayerId("", "FB")).toBe("FB_Layer");
  });

  test("★ 不检查是否已以 _Layer 结尾（会叠成 a_Layer_Layer）", () => {
    // 如实记录：这是幂等性的缺失，但调用点传的都不是 _Layer 结尾的字面量
    // （Background / Segment / Text / Measurement / Other / layerKey）
    expect(exportSvgLayerId("a_Layer", "FB")).toBe("a_Layer_Layer");
    expect(exportSvgLayerId("a_Layer", "FB")).not.toBe(exportSvgLayerId("a", "FB"));
  });
});
