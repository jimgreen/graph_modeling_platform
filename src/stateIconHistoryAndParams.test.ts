// 状态图标绘制（appDeviceDefinitionFactories，本会话此前完全没碰过的区域）：
//   pushStateIconDrawingHistorySnapshot  20 处生产调用
//   stateIconStaticTemplateParam         13 处生产调用
//
// 两个都是**静默**型：历史栈被截断、或模板参数读成空串时，界面上没有任何提示。
import { describe, expect, test } from "vitest";
import {
  pushStateIconDrawingHistorySnapshot,
  stateIconStaticTemplateParam
} from "./appExtracted/appDeviceDefinitionFactories";

/** 读出最后一次推入的快照（`cloneStateIconDrawingElementSnapshot` 是模块私有的，只能走这条路）。 */
const lastSnapshot = (historyRef: { current: unknown }) => {
  const history = historyRef.current as Array<Array<Record<string, unknown>>>;
  return history[history.length - 1];
};

describe("pushStateIconDrawingHistorySnapshot：historyRef 缺失时静默 no-op", () => {
  for (const ref of [null, undefined, false, 0, "", Number.NaN] as never[]) {
    test(`historyRef = ${JSON.stringify(ref) ?? String(ref)} → 不抛错、无副作用`, () => {
      expect(pushStateIconDrawingHistorySnapshot(ref, [{ id: "a" }] as never)).toBeUndefined();
    });
  }

  test("★ 守卫判的是 `historyRef` **对象本身**（`!historyRef`），不是 `.current`", () => {
    // 我第一版把这两件事搞混了：给 `probe.current` 赋 0 不该让守卫短路 ——
    // `probe` 是 truthy 对象，守卫放行，随后展开 `.current` 才炸。
    // 已在下面那条「初始 current 是数字」里单列。
    // 这里断言的是：**falsy 的 historyRef 一律 no-op**，包括 0 / "" / false / NaN。
    for (const falsy of [0, "", false, Number.NaN] as never[]) {
      expect(() => pushStateIconDrawingHistorySnapshot(falsy, [{ id: "a" }] as never), String(falsy)).not.toThrow();
    }
    // 对照：historyRef 是 truthy 对象时，守卫放行 —— 即便 .current 不可用
    const ref = { current: 0 } as { current: unknown };
    expect(() => pushStateIconDrawingHistorySnapshot(ref, [] as never)).toThrow(TypeError);
  });
});

describe("★ 历史上限 80 条（FIFO 丢最旧）", () => {
  const push = (times: number, initial?: unknown) => {
    const historyRef = { current: initial } as { current: unknown };
    for (let i = 1; i <= times; i += 1) {
      pushStateIconDrawingHistorySnapshot(historyRef, [{ id: `e${i}` }] as never);
    }
    return historyRef;
  };

  test("79 / 80 次不截断，81 次起固定 80", () => {
    expect((push(79).current as unknown[]).length, "79").toBe(79);
    expect((push(80).current as unknown[]).length, "80").toBe(80);
    expect((push(81).current as unknown[]).length, "81 → 被截到 80").toBe(80);
    expect((push(200).current as unknown[]).length, "200 → 被截到 80").toBe(80);
  });

  test("★ 丢的是**最旧**的（探针实测：推 85 次后首条是第 6 次）", () => {
    const history = push(85).current as Array<Array<{ id: string }>>;
    expect(history[0][0].id, "首条").toBe("e6");
    expect(history[history.length - 1][0].id, "末条").toBe("e85");
    expect(history.length).toBe(80);
    // 序号连续，没有空洞
    expect(history.map((snap) => Number(snap[0].id.slice(1)))).toEqual(
      Array.from({ length: 80 }, (_unused, i) => i + 6)
    );
  });

  test("初始 current 为 undefined / null / 空数组都从长度 1 起", () => {
    for (const initial of [undefined, null, []] as never[]) {
      const historyRef = { current: initial } as { current: unknown };
      pushStateIconDrawingHistorySnapshot(historyRef, [{ id: "a" }] as never);
      expect((historyRef.current as unknown[]).length, JSON.stringify(initial)).toBe(1);
    }
  });

  test("★ 初始 current 是**字符串**时会被展开（`'x'` → 长度 2）", () => {
    // 探针实测。`[...(historyRef.current ?? [])]` 对字符串是可迭代的，
    // 所以不会抛错、但会把它当字符数组铺开。这是不该发生但确实发生的行为。
    const historyRef = { current: "x" } as { current: unknown };
    pushStateIconDrawingHistorySnapshot(historyRef, [{ id: "a" }] as never);
    expect((historyRef.current as unknown[]).length).toBe(2);
    expect((historyRef.current as unknown[])[0]).toBe("x");
  });

  test("★ 初始 current 是**数字**时抛 TypeError（不可迭代）", () => {
    // 与上一条对照：字符串可迭代所以静默出错，数字不可迭代所以直接抛。
    // 两者都是「historyRef.current 形状不对」的表现，**报错方式不一致**。
    const historyRef = { current: 5 } as { current: unknown };
    expect(() => pushStateIconDrawingHistorySnapshot(historyRef, [{ id: "a" }] as never))
      .toThrow(TypeError);
  });
});

describe("★ 快照是独立副本：改原 elements 不影响历史", () => {
  test("快照数组与入参不同引用", () => {
    const historyRef = { current: undefined } as { current: unknown };
    const elements = [{ id: "a" }] as never[];
    pushStateIconDrawingHistorySnapshot(historyRef, elements);
    const snapshot = lastSnapshot(historyRef);
    expect(snapshot).not.toBe(elements);
  });

  test("改入参数组不影响已存快照", () => {
    const historyRef = { current: undefined } as { current: unknown };
    const elements = [{ id: "a" }] as never as Array<{ id: string }>;
    pushStateIconDrawingHistorySnapshot(historyRef, elements as never);
    elements[0].id = "mutated";
    expect(lastSnapshot(historyRef)[0].id).toBe("a");
  });

  test("★ 但只克隆 `points` —— **其它字段按引用共享**", () => {
    // 这是「快照」这个词最容易骗人的地方：它不是深拷贝。
    // 探针实测：meta 这种嵌套对象在快照与原对象之间**同引用**，
    // 改快照的 meta 会改到原对象。
    const historyRef = { current: undefined } as { current: unknown };
    const meta = { deep: { v: 1 } };
    const points = [{ x: 1, y: 1 }];
    pushStateIconDrawingHistorySnapshot(historyRef, [{ id: "a", points, meta }] as never);
    const snapshot = lastSnapshot(historyRef);
    expect(snapshot[0].points, "points 被克隆").not.toBe(points);
    expect(snapshot[0].meta, "meta 按引用共享").toBe(meta);
    (snapshot[0].meta as { deep: { v: number } }).deep.v = 999;
    expect(meta.deep.v, "改快照会改到原对象").toBe(999);
  });

  test("points 数组里的每个点也都是新对象", () => {
    const historyRef = { current: undefined } as { current: unknown };
    const source = [{ x: 1, y: 1 }, { x: 2, y: 2 }];
    pushStateIconDrawingHistorySnapshot(historyRef, [{ id: "a", points: source }] as never);
    const snapshotPoints = lastSnapshot(historyRef)[0].points as Array<{ x: number; y: number }>;
    expect(snapshotPoints).not.toBe(source);
    expect(snapshotPoints[0]).not.toBe(source[0]);
    expect(snapshotPoints[0]).toEqual(source[0]);
  });
});

describe("★ 非数组的 points 会**按引用原样保留**（不克隆）", () => {
  // `cloneStateIconDrawingElementSnapshot` 的判定是 `Array.isArray(element?.points)`，
  // 不是「是否存在」。所以类型面外的 points 形态（从 localStorage / JSON 读回的脏数据）
  // 会原样进快照，与原对象共享引用。
  const cases: Array<[string, unknown]> = [
    ["字符串", "not array"],
    ["数字", 42],
    ["null", null],
    ["undefined（键不存在，等价）", undefined],
    ["对象", { x: 1 }],
    ["Map", new Map([["x", 1]])]
  ];
  for (const [label, points] of cases) {
    test(`points 是${label} → 快照里同引用`, () => {
      const historyRef = { current: undefined } as { current: unknown };
      const element = { id: "a", points } as never;
      pushStateIconDrawingHistorySnapshot(historyRef, [element] as never);
      const snapshot = lastSnapshot(historyRef);
      expect(snapshot[0].points, label).toBe(points);
    });
  }

  test("空数组仍然是数组（会被克隆成新数组）", () => {
    const historyRef = { current: undefined } as { current: unknown };
    const points: unknown[] = [];
    pushStateIconDrawingHistorySnapshot(historyRef, [{ id: "a", points }] as never);
    const snapshot = lastSnapshot(historyRef);
    expect(Array.isArray(snapshot[0].points)).toBe(true);
    expect(snapshot[0].points).not.toBe(points);
  });

  test("嵌套数组（`[[1]]`）被逐元素展开成新数组", () => {
    const historyRef = { current: undefined } as { current: unknown };
    const points = [[1]] as never;
    pushStateIconDrawingHistorySnapshot(historyRef, [{ id: "a", points }] as never);
    const snapshot = lastSnapshot(historyRef);
    expect(snapshot[0].points, "外层数组被克隆").not.toBe(points);
  });

  test("★ element 为 null / undefined 时不抛错，快照项是 `{}`", () => {
    const historyRef = { current: undefined } as { current: unknown };
    pushStateIconDrawingHistorySnapshot(historyRef, [null, undefined] as never);
    const snapshot = lastSnapshot(historyRef);
    expect(snapshot).toEqual([{}, {}]);
  });
});

describe("stateIconStaticTemplateParam：`??` 链 + String() + trim", () => {
  const read = (params: unknown, key = "k", fallback = "FB") =>
    stateIconStaticTemplateParam({ params } as never, key, fallback);

  test("正常路径：取到值并 trim", () => {
    expect(read({ k: "v" })).toBe("v");
    expect(read({ k: " v " })).toBe("v");
    expect(read({ k: "\tv\n" })).toBe("v");
  });

  test("键缺失 / 值为 null / undefined → 落 fallback", () => {
    expect(read({})).toBe("FB");
    expect(read({ k: null })).toBe("FB");
    expect(read({ k: undefined })).toBe("FB");
    expect(read({ k: "v" }, "other")).toBe("FB");
  });

  test("★ 空串与纯空白**不**落 fallback（`??` 只挡 nullish）", () => {
    // 探针实测。这一条最容易记混：`*_Param` 系列里
    // 「参数存在但为空」与「参数不存在」的结果**不同**。
    expect(read({ k: "" })).toBe("");
    expect(read({ k: "   " })).toBe("");
    expect(read({ k: "" }), "与「键缺失」的 FB 相对").not.toBe(read({}));
  });

  test("★ 非字符串值经 `String()` 转换", () => {
    const table: Array<[unknown, string]> = [
      [1, "1"], [0, "0"], [true, "true"], [false, "false"],
      [{}, "[object Object]"], [[], ""], [[1, 2], "1,2"], [["v"], "v"]
    ];
    for (const [value, expected] of table) {
      expect(read({ k: value }), JSON.stringify(value)).toBe(expected);
    }
  });

  test("★ fallback 自身也过 String() + trim", () => {
    expect(read({}, "k", "  FB  ")).toBe("FB");
    expect(read({}, "k", 0 as never)).toBe("0");
    expect(read({}, "k", false as never)).toBe("false");
  });

  test("★ 第二个 `?? \"\"` 只在调用方传 nullish fallback 时才起作用", () => {
    // 形参默认已是 `fallback = ""`，所以 `fallback ?? ""` 在不传参时是恒等变换。
    // 它真正的用途是挡住**显式传 null / undefined**：探针实测两者都得 `""` 而非 `"FB"`。
    expect(stateIconStaticTemplateParam({ params: {} } as never, "k", null as never)).toBe("");
    expect(stateIconStaticTemplateParam({ params: {} } as never, "k", undefined)).toBe("");
    // 不传第三个参数 → 走形参默认 `""`
    expect(stateIconStaticTemplateParam({ params: {} } as never, "k")).toBe("");
  });

  test("★ template / params 缺失或类型不对都不抛错，一律落 fallback", () => {
    for (const template of [null, undefined, {}, { params: null }, { params: "x" }, { params: 5 }] as never[]) {
      expect(stateIconStaticTemplateParam(template, "k", "FB"), JSON.stringify(template) ?? "undefined").toBe("FB");
    }
  });

  test("形参缺省 fallback 时返回空串而非 undefined", () => {
    expect(stateIconStaticTemplateParam({ params: {} } as never, "k")).toBe("");
    expect(stateIconStaticTemplateParam(undefined, "k")).toBe("");
  });

  test("★ 返回值恒为 string（`String()` 的结果绝不外泄其它类型）", () => {
    for (const value of [1, 0, true, {}, [], [1, 2], null, undefined, new Map()]) {
      const out = read({ k: value });
      expect(typeof out, JSON.stringify(value)).toBe("string");
    }
  });
});
