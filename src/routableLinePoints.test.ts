// src/model-routing.ts：可路由线路的**折点归一与存盘**
//   normalizeRoutableLineDevicePoints（私有）→ 序列化与反序列化共用
//   serializeRoutableLineDevicePoints   折点数组 → params 里的 JSON 串
//   parseRoutableLineDevicePoints       params 里的 JSON 串 → 折点数组
//   defaultRoutableLineDeviceLocalPoints（私有）→ 缺省折点
//   routableLineDeviceLocalPoints       存储点 ≥2 时取存储点，否则取缺省
//   ensureRoutableLineDevicePathParam   折点不足 2 个时补写缺省
//
// 这条链决定可路由线路**存进 params 的那串 JSON 是什么形状**。它同时是序列化与
// 反序列化两端的唯一归一出口 —— 两端不同口径就会让存盘与读盘不一致（线路折点悄悄位移）。
import { describe, expect, test } from "vitest";
import {
  ensureRoutableLineDevicePathParam,
  parseRoutableLineDevicePoints,
  routableLineDeviceLocalPoints,
  serializeRoutableLineDevicePoints
} from "./model-routing";
import { ROUTABLE_LINE_POINTS_PARAM, type ModelNode, type Point } from "./model";

const node = (over: Record<string, unknown> = {}): ModelNode => ({
  id: "n",
  kind: "ac-routable-line",
  name: "n",
  nodeNumber: "n",
  acTopologyNode: 0,
  dcTopologyNode: 0,
  position: { x: 0, y: 0 },
  size: { width: 100, height: 60 },
  rotation: 0,
  scale: 1,
  terminals: [],
  params: {},
  ...over
} as unknown as ModelNode);

const P = ROUTABLE_LINE_POINTS_PARAM;
const ser = (points: Array<Point | unknown>) => serializeRoutableLineDevicePoints(points as Point[]);
const par = (value: unknown) => parseRoutableLineDevicePoints(value as string);
const withPoints = (json: string) => node({ params: { [P]: json } as never });
const terminal = (over: Record<string, unknown> = {}) => ({
  id: "t1", label: "A", type: "ac", anchor: { x: 0.5, y: 0 }, nodeNumber: "1", vbase: "0", ...over
});

describe("参数键常量", () => {
  test("`ROUTABLE_LINE_POINTS_PARAM` 固定为 `_routableLinePoints`", () => {
    // 存量模型的 params 里存的就是这个键，改名等于丢弃全部已存的折点。
    expect(P).toBe("_routableLinePoints");
    expect(P.startsWith("_"), "内部参数带 _ 前缀").toBe(true);
  });
});

describe("★ 序列化：一位小数（`Math.round(v * 10) / 10`），半值向 +∞", () => {
  test("正常值原样保留", () => {
    expect(ser([{ x: 0, y: 0 }])).toBe('[{"x":0,"y":0}]');
    expect(ser([{ x: 1, y: 2 }])).toBe('[{"x":1,"y":2}]');
    expect(ser([{ x: 1000000000, y: -1000000000 }])).toBe('[{"x":1000000000,"y":-1000000000}]');
  });

  test("★ 四舍五入表（`Math.round` 的半值行为，不是银行家舍入）", () => {
    const table: Array<[number, number]> = [
      [0.04, 0], [0.05, 0.1],
      [-0.04, 0], [-0.05, 0],
      [0.15, 0.2], [0.25, 0.3],
      [1.25, 1.3], [1.35, 1.4], [1.55, 1.6],
      [2.44, 2.4], [-3.06, -3.1]
    ];
    for (const [input, expected] of table) {
      expect(par(ser([{ x: input, y: 0 }]))[0].x, `${input}`).toBe(expected);
      expect(par(ser([{ x: 0, y: input }]))[0].y, `y=${input}`).toBe(expected);
    }
  });

  test("★ 负零被 `JSON.stringify` 归一为 `0`，回解后**不是** `-0`", () => {
    // `Math.round(-0.4)` 是 `-0`，`-0 / 10` 仍是 `-0`，但 `JSON.stringify(-0) === "0"`。
    // 于是 JSON 文本里没有负零，回解走 `Math.round(0 * 10) / 10` 得 `+0`。
    expect(ser([{ x: -0.04, y: 0 }])).toBe('[{"x":0,"y":0}]');
    const back = par(ser([{ x: -0.04, y: 0 }]));
    expect(Object.is(back[0].x, -0), "★ 回解后是 +0").toBe(false);
    expect(back[0].x).toBe(0);
  });

  test("★ 非有限点被整点丢弃", () => {
    expect(ser([{ x: 1, y: 2 }, { x: NaN, y: 3 }])).toBe('[{"x":1,"y":2}]');
    expect(ser([{ x: 1, y: 2 }, { x: Infinity, y: 3 }])).toBe('[{"x":1,"y":2}]');
    expect(ser([{ x: 1, y: 2 }, { x: -Infinity, y: 3 }])).toBe('[{"x":1,"y":2}]');
    expect(ser([{ x: NaN, y: NaN }])).toBe("[]");
    // 丢弃后长度可能不足 2 —— 上层 `ensureRoutableLineDevicePathParam` 会补默认值
    expect(ser([{ x: 1, y: 2 }, { x: NaN, y: 3 }, { x: NaN, y: 4 }])).toBe('[{"x":1,"y":2}]');
  });

  test("★ 去重只针对**相邻**重复点，且发生在**舍入之后**", () => {
    expect(ser([{ x: 1, y: 1 }, { x: 1, y: 1 }])).toBe('[{"x":1,"y":1}]');
    expect(ser([{ x: 1, y: 1 }, { x: 1, y: 1 }, { x: 1, y: 1 }, { x: 2, y: 2 }]))
      .toBe('[{"x":1,"y":1},{"x":2,"y":2}]');
    // 不相邻的同一点**保留**
    expect(ser([{ x: 1, y: 1 }, { x: 2, y: 2 }, { x: 1, y: 1 }]))
      .toBe('[{"x":1,"y":1},{"x":2,"y":2},{"x":1,"y":1}]');
    // ★ 舍入后才判重：1.01 与 1.02 都变 1.0 → 被判成同一个点，第二个消失
    expect(ser([{ x: 1.01, y: 0 }, { x: 1.02, y: 0 }])).toBe('[{"x":1,"y":0}]');
    // x 相同但 y 不同 → 保留
    expect(ser([{ x: 1, y: 1 }, { x: 1, y: 2 }])).toBe('[{"x":1,"y":1},{"x":1,"y":2}]');
  });

  test("空数组 → `[]`", () => {
    expect(ser([])).toBe("[]");
  });

  test("★ 输出键序固定为 `x` 在前、`y` 在后", () => {
    // 这串 JSON 会进存盘与 E 文件，键序变了就是存量 diff 噪声。
    expect(ser([{ x: 1, y: 2 }])).toBe('[{"x":1,"y":2}]');
    expect(par(ser([{ x: 1, y: 2 }]))[0], "回解后键序不变").toEqual({ x: 1, y: 2 });
  });
});

describe("parse：非法输入一律 `[]`，且走同一套归一", () => {
  test("falsy → []", () => {
    for (const value of ["", null, undefined] as never[]) {
      expect(par(value)).toEqual([]);
    }
  });

  test("不可解析 / 非数组 → []", () => {
    const table: Array<[string, unknown]> = [
      ["非 JSON", "abc"],
      ["JSON 数字", "123"],
      ["JSON 字符串", '"x"'],
      ["JSON null", "null"],
      ["JSON 对象", "{}"],
      ["空数组", "[]"],
      ["元素是 null", "[null]"],
      ["元素缺 x", "[{}]"],
      ["元素缺 y", '[{"x":1}]'],
      ["元素是数组", "[[1,2]]"],
      ["元素缺字段其一", '[{"x":1,"z":2}]']
    ];
    for (const [label, value] of table) {
      expect(par(value), `${label} ${JSON.stringify(value)}`).toEqual([]);
    }
  });

  test("★ `[null]` 走的是 `catch` 分支（读 `.x` 抛 TypeError），不是归一分支", () => {
    // `parsed.map(item => ({ x: Number(item.x), y: Number(item.y) }))` 在
    // `item === null` 时读 `.x` 抛 TypeError → 被 catch 吞成 []。
    // 所以 `[null]` 与 `[{}]` 的结果相同，**路径不同**。
    expect(() => [null].map((item) => Number((item as unknown as Point).x))).toThrow(TypeError);
    expect(par("[null]")).toEqual([]);
    expect(par("[{}]"), "走归一分支（非有限 → 丢弃）").toEqual([]);
  });

  test("★ 下面这条等价变异全绿是**正确的**（记录，避免下一个人重查）", () => {
    // ⑥ `if (!Array.isArray(parsed))` 改 `if (parsed === null)`
    //   —— 数组检查对**输出**冗余：JSON 能解出的非数组值只有字符串 / 数字 /
    //      布尔 / 对象 / null。`null` 被新检查挡住；其余四种都没有 `.map`，
    //      于是 `parsed.map(...)` 抛 TypeError、落进同一个 `catch`、同样得 []。
    //   ⇒ 每种非数组输入的返回值都不变，全绿是应有结果。
    //   ⚠ 控制流上它仍有意义（把 TypeError 换成显式 return），实现意图更清楚。
    //
    //   这次的输入集**覆盖了**全部四种（见上一个用例的表），所以
    //   「等价」是可证的，不是「我没测到」—— 这正是 AGENTS.md 里那条判据
    //   要求先确认的事。
    for (const value of ["123", '"x"', "true", "{}", "null"]) {
      expect(par(value), value).toEqual([]);
      // 等价的另一种写法：让 .map 自己抛
      expect(() => JSON.parse(value).map((x: unknown) => x), `${value} 无 .map`).toThrow(TypeError);
    }
  });

  test("字符串数字被 `Number()` 强转后可用", () => {
    expect(par('[{"x":"3","y":"4"}]')).toEqual([{ x: 3, y: 4 }]);
  });

  test("★ 与序列化共用归一：舍入 / 去重 / 丢非有限", () => {
    expect(par('[{"x":1.55,"y":2}]')).toEqual([{ x: 1.6, y: 2 }]);
    expect(par('[{"x":1,"y":1},{"x":1,"y":1}]')).toEqual([{ x: 1, y: 1 }]);
    // 裸 NaN 在 JSON 里非法 → 解析失败 → []
    expect(par('[{"x":NaN,"y":0}]')).toEqual([]);
  });

  test("往返一致（归一是幂等的：serialize∘parse 反复做结果不变）", () => {
    const once = ser([{ x: 1.55, y: 2.44 }, { x: -3.06, y: 0 }]);
    expect(once).toBe('[{"x":1.6,"y":2.4},{"x":-3.1,"y":0}]');
    expect(ser(par(once)), "再序列化一次").toBe(once);
    expect(ser(par(ser(par(once)))), "反复往返回归一").toBe(once);
    expect(par(ser(par(once))), "反复往返回归一").toEqual(par(once));
    // 三层也不变（归一映射到不动点）
    expect(par(ser(par(ser(par(once)))))).toEqual(par(once));
  });

  test("返回新数组（不共享）", () => {
    expect(par('[{"x":1,"y":2}]')).not.toBe(par('[{"x":1,"y":2}]'));
    expect(par('[{"x":1,"y":2}]')).toEqual(par('[{"x":1,"y":2}]'));
  });
});

describe("routableLineDeviceLocalPoints：存储点 ≥2 时取存储点，否则取缺省", () => {
  test("存储点恰好 2 个 → 原样返回", () => {
    const n = withPoints('[{"x":1,"y":1},{"x":2,"y":2}]');
    expect(routableLineDeviceLocalPoints(n)).toEqual([{ x: 1, y: 1 }, { x: 2, y: 2 }]);
  });

  test("★ 缺省（无端子）= `±width/2`，y 恒 0", () => {
    const n = node({ size: { width: 100, height: 60 } });
    expect(routableLineDeviceLocalPoints(n)).toEqual([{ x: -50, y: 0 }, { x: 50, y: 0 }]);
    // ★ 高度完全不参与 —— 只有 width
    expect(routableLineDeviceLocalPoints(node({ size: { width: 100, height: 999 } })))
      .toEqual([{ x: -50, y: 0 }, { x: 50, y: 0 }]);
    // 奇数宽：不被取整（这层**不**走序列化归一）
    expect(routableLineDeviceLocalPoints(node({ size: { width: 33, height: 7 } })))
      .toEqual([{ x: -16.5, y: 0 }, { x: 16.5, y: 0 }]);
  });

  test("★ 只有一个端子时**退回** `±width/2`（两端都要才用端子锚点）", () => {
    const one = node({ terminals: [terminal()] as never });
    expect(routableLineDeviceLocalPoints(one)).toEqual([{ x: -50, y: 0 }, { x: 50, y: 0 }]);
  });

  test("★ 两个端子 → 走 `terminalRenderLocalPoint`，**不是** `±width/2`", () => {
    // 探针实测：size 100×60、锚点 `{x:0.5,y:0}` 与 `{x:0.5,y:1}` 得 (54,0) 与 (50,64)。
    // x 偏 54（带端子引出段偏移），y 偏 64（下端子 + 4）。
    // 钉住具体数值：这里退化会让可路由线路的默认折点整体偏移。
    const two = node({
      terminals: [
        terminal({ id: "t1", anchor: { x: 0.5, y: 0 } }),
        terminal({ id: "t2", anchor: { x: 0.5, y: 1 } })
      ] as never
    });
    expect(routableLineDeviceLocalPoints(two)).toEqual([{ x: 54, y: 0 }, { x: 50, y: 64 }]);
  });

  test("存储点 1 个 → 退回缺省（阈值是 **≥ 2**）", () => {
    expect(routableLineDeviceLocalPoints(withPoints('[{"x":1,"y":1}]')))
      .toEqual([{ x: -50, y: 0 }, { x: 50, y: 0 }]);
    expect(routableLineDeviceLocalPoints(withPoints("garbage")))
      .toEqual([{ x: -50, y: 0 }, { x: 50, y: 0 }]);
    expect(routableLineDeviceLocalPoints(withPoints('[{"x":1,"y":1},{"x":2,"y":2},{"x":3,"y":3}]')))
      .toHaveLength(3);
  });

  test("★ 非可路由 kind → `[]`（不是缺省折点）", () => {
    expect(routableLineDeviceLocalPoints(node({ kind: "ac-bus" }))).toEqual([]);
    expect(routableLineDeviceLocalPoints(node({ kind: "static-point" }))).toEqual([]);
  });

  test("DC 与零阻抗分支也是可路由 kind（与 `ensure` 的门槛一致）", () => {
    for (const kind of ["ac-routable-line", "dc-routable-line", "ac-zero-routable-branch", "dc-zero-routable-branch"]) {
      expect(routableLineDeviceLocalPoints(node({ kind })), kind).toHaveLength(2);
    }
  });
});

describe("ensureRoutableLineDevicePathParam：折点不足 2 个才补写", () => {
  test("★ 已有 2 个点 → **同一引用**返回（不写参）", () => {
    const n = withPoints('[{"x":1,"y":1},{"x":2,"y":2}]');
    expect(ensureRoutableLineDevicePathParam(n)).toBe(n);
  });

  test("无参 / 只有 1 点 / 值非法 → 补写缺省折点（新对象）", () => {
    const expected = '[{"x":-50,"y":0},{"x":50,"y":0}]';
    for (const [label, source] of [
      ["无该参数", node()],
      ["空串", withPoints("")],
      ["1 个点", withPoints('[{"x":1,"y":1}]')],
      ["乱值", withPoints("garbage")],
      ["非数组", withPoints('{"x":1}')],
      ["点全非有限", withPoints('[{"x":NaN}]')]
    ] as const) {
      const out = ensureRoutableLineDevicePathParam(source);
      expect(out, `${label} 应返回新对象`).not.toBe(source);
      expect(out.params[P], label).toBe(expected);
    }
  });

  test("★ 非可路由 kind → **同一引用**返回（连校验都不做）", () => {
    for (const kind of ["ac-bus", "static-point"]) {
      const n = node({ kind });
      expect(ensureRoutableLineDevicePathParam(n), kind).toBe(n);
    }
  });

  test("DC 与零阻抗分支会被补写（4 个可路由 kind 全部生效）", () => {
    for (const kind of ["ac-routable-line", "dc-routable-line", "ac-zero-routable-branch", "dc-zero-routable-branch"]) {
      const n = node({ kind });
      const out = ensureRoutableLineDevicePathParam(n);
      expect(out, kind).not.toBe(n);
      expect(out.params[P], kind).toBe('[{"x":-50,"y":0},{"x":50,"y":0}]');
    }
  });

  test("不改入参（返回新对象时也只新建 params）", () => {
    const n = node();
    const snapshot = { ...n.params };
    ensureRoutableLineDevicePathParam(n);
    expect(n.params).toEqual(snapshot);
    expect(n.params[P], "入参未被写").toBeUndefined();
  });

  test("★ 幂等：补写后再跑一次 → 同一引用", () => {
    const once = ensureRoutableLineDevicePathParam(node());
    expect(ensureRoutableLineDevicePathParam(once)).toBe(once);
    // 且补写的值与 `routableLineDeviceLocalPoints` 的缺省一致
    expect(once.params[P]).toBe(ser(routableLineDeviceLocalPoints(node())));
  });
});
