// 三个小的纯几何/集合函数（此前零直呼，共 20 处生产调用）
//   selectionRectCenter    选框中心
//   combineSelectionRects  多个选框求并集
//   compactPreviewNodes    按 id 去重、保留首个
//
// 判错的后果：框选一片节点后拖动时**跳位**（中心算错），
// 或预览列表里同一个节点出现两次 —— 都只表现为界面怪，**不报错**。
import { describe, expect, test } from "vitest";
import {
  combineSelectionRects,
  compactPreviewNodes,
  selectionRectCenter
} from "./appExtracted/appCoreCanvasUtilities";
import type { SelectionRect } from "./selectionActions";
import type { ModelNode } from "./model";

const R = (left: number, top: number, right: number, bottom: number): SelectionRect =>
  ({ left, top, right, bottom });

const N = (id: string, over: Record<string, unknown> = {}) =>
  ({ id, kind: "ac-bus", name: id, params: {}, terminals: [], ...over } as unknown as ModelNode);

describe("selectionRectCenter：`(left+right)/2` 与 `(top+bottom)/2`", () => {
  test("常规选框", () => {
    expect(selectionRectCenter(R(0, 0, 100, 50))).toEqual({ x: 50, y: 25 });
    expect(selectionRectCenter(R(-50, -20, 50, 20))).toEqual({ x: 0, y: 0 });
  });

  test("★ 不检查 left ≤ right（反的选框也给中心）", () => {
    // 拖拽反向时 `left > right` 是**正常状态**，不是错误。
    // `combineSelectionRects` 也一样不做归一。
    expect(selectionRectCenter(R(100, 50, 0, 0))).toEqual({ x: 50, y: 25 });
    // 前提：两者给同一结果
    expect(selectionRectCenter(R(100, 50, 0, 0))).toEqual(selectionRectCenter(R(0, 0, 100, 50)));
  });

  test("★ 零尺寸 / 退化选框", () => {
    expect(selectionRectCenter(R(5, 5, 5, 5))).toEqual({ x: 5, y: 5 });
    expect(selectionRectCenter(R(0, 0, 0, 10))).toEqual({ x: 0, y: 5 });
  });

  test("★ 小数选框不取整（有浮点误差）", () => {
    expect(selectionRectCenter(R(0, 0, 1, 1))).toEqual({ x: 0.5, y: 0.5 });
    // ★ `(0.2 + 0.4) / 2` 在 IEEE754 下是 0.30000000000000004，不是 0.3。
    // 我第一版写 `toEqual({ y: 0.3 })`，被顶回。取整会让显示抖动，所以不修。
    const out = selectionRectCenter(R(0.1, 0.2, 0.3, 0.4));
    expect(out.x).toBe(0.2);
    expect(out.y, "★ 浮点误差，不等于 0.3").toBe(0.30000000000000004);
    expect(out.y).toBeCloseTo(0.3, 10);
    // 前提
    expect((0.2 + 0.4) / 2).toBe(0.30000000000000004);
  });

  test("★ NaN 穿透（不做兜底）", () => {
    // 选框来自画布坐标计算，恒为有限数；NaN 说明上游算错了。
    // **判定不修**：静默兜成 0 会让拖拽跳到画布左上角，比报错更难排查。
    const out = selectionRectCenter(R(NaN, 0, 100, 100));
    expect(Number.isNaN(out.x), "★ left 坏 → x NaN").toBe(true);
    expect(out.y, "★ y 轴不受影响").toBe(50);
    // 对照：±Infinity
    expect(selectionRectCenter(R(-Infinity, 0, Infinity, 0))).toEqual({ x: NaN, y: 0 });
    expect(Number.isNaN(selectionRectCenter(R(-Infinity, 0, Infinity, 0)).x)).toBe(true);
  });

  test("返回**新对象**且只含 x / y", () => {
    const rect = R(0, 0, 10, 10);
    const out = selectionRectCenter(rect);
    expect(Object.keys(out)).toEqual(["x", "y"]);
    // 不改入参
    expect(rect).toEqual({ left: 0, top: 0, right: 10, bottom: 10 });
  });

  test("★ 与 `combineSelectionRects` 可组合：并集中心 = 各中心的中点（仅方框时）", () => {
    const a = R(0, 0, 10, 10);
    const b = R(20, 20, 30, 30);
    const union = combineSelectionRects([a, b])!;
    expect(union).toEqual({ left: 0, top: 0, right: 30, bottom: 30 });
    expect(selectionRectCenter(union)).toEqual({ x: 15, y: 15 });
  });
});

describe("★ combineSelectionRects：min/max 求并集，falsy 项被滤", () => {
  test("两个框求并集", () => {
    expect(combineSelectionRects([R(0, 0, 10, 10), R(5, 5, 20, 20)]))
      .toEqual({ left: 0, top: 0, right: 20, bottom: 20 });
  });

  test("★ 反向框**不会被归一**（min/max 只按同侧取极值）", () => {
    // `Math.min(...[20])` = 20、`Math.max(...[0])` = 0 —— 单个框时 min/max
    // 没有任何东西可比较，所以原样透出。
    // 我第一版以为「min/max 各管一边 ⇒ 自动纠正反向框」，被顶回两次：
    //   ① 单个框根本没被纠正
    //   ② 两个框时也**没有**被纠正 —— `right` 取的是两个 `right` 的 max，
    //      反向框的 `right = 0` 参与比较但不会变成 20。
    // **判定不修**：反向选框是拖拽的**正常中间态**，调用方（框选预览）
    // 在鼠标松开前不会用它算布局；真要归一应在拖拽结束那一层做，
    // 在这里悄悄改语义会让 `right < left` 的框「看起来正常」，掩盖上游问题。
    expect(combineSelectionRects([R(20, 20, 0, 0)]))
      .toEqual({ left: 20, top: 20, right: 0, bottom: 0 });
    // ★ 两个框：left 取 min、right 取 max，同侧比较
    expect(combineSelectionRects([R(20, 20, 0, 0), R(0, 0, 5, 5)]))
      .toEqual({ left: 0, top: 0, right: 5, bottom: 5 });
    // 与 selectionRectCenter 对照：那个对反向框也给（数值上对称的）中心
    expect(selectionRectCenter(R(20, 20, 0, 0))).toEqual({ x: 10, y: 10 });
    // 前提：min/max 只看同侧
    expect(Math.min(20, 0)).toBe(0);
    expect(Math.max(0, 5)).toBe(5);
  });

  test("空数组 / 全 falsy → `null`", () => {
    expect(combineSelectionRects([])).toBeNull();
    expect(combineSelectionRects([null, undefined])).toBeNull();
    expect(combineSelectionRects([null, R(0, 0, 1, 1), undefined])).toEqual({ left: 0, top: 0, right: 1, bottom: 1 });
  });

  test("★ falsy 的判定是 `Boolean(rect)` —— 任何对象都为真", () => {
    const zeroRect = R(0, 0, 0, 0);
    expect(Boolean(zeroRect), "★ 全零的框**不是** falsy").toBe(true);
    expect(combineSelectionRects([zeroRect])).toEqual({ left: 0, top: 0, right: 0, bottom: 0 });
    // 对照：若写成 `if (!rect.left || …)` 就会误滤
    expect(Boolean(zeroRect.left)).toBe(false);
  });

  test("★ NaN **只污染所在轴的那一侧**", () => {
    // 四个边界是**四次独立**的 min/max 调用，所以坏在哪边只坏哪边。
    // 我第一版写「left 与 right 都被污染」，被顶回 ——
    // NaN 只出现在 `left` 那一次调用的操作数里，`right` 那次根本没见到 NaN。
    const out = combineSelectionRects([R(0, 0, 10, 10), R(NaN, 0, 20, 20)])!;
    expect(Number.isNaN(out.left), "★ 只有 left 被污染").toBe(true);
    expect(out.right, "★ right 正常（min/max 是四次独立调用）").toBe(20);
    expect(out.top).toBe(0);
    expect(out.bottom).toBe(20);
    // ★ 每个轴的两侧要分别构造才能各自污染
    const badRight = combineSelectionRects([R(0, 0, 10, 10), R(0, 0, NaN, 20)])!;
    expect(badRight.right, "★ right 单独被污染").toBeNaN();
    expect(badRight.left).toBe(0);
    const badTop = combineSelectionRects([R(0, 0, 10, 10), R(0, NaN, 20, 20)])!;
    expect(badTop.top).toBeNaN();
    expect(badTop.bottom).toBe(20);
    const badBottom = combineSelectionRects([R(0, 0, 10, 10), R(0, 0, 20, NaN)])!;
    expect(badBottom.bottom).toBeNaN();
    expect(badBottom.top).toBe(0);
    // 前提
    expect(Math.min(0, NaN)).toBeNaN();
    expect(Math.max(10, 20)).toBe(20);
  });

  test("返回结构是 4 个键（**不含** center）", () => {
    const out = combineSelectionRects([R(0, 0, 10, 10)])!;
    expect(Object.keys(out)).toEqual(["left", "right", "top", "bottom"]);
    // 中心要自己算
    expect(selectionRectCenter(out)).toEqual({ x: 5, y: 5 });
  });

  test("不改入参", () => {
    const input = [R(0, 0, 10, 10), R(5, 5, 20, 20)];
    const snapshot = JSON.stringify(input);
    combineSelectionRects(input);
    expect(JSON.stringify(input)).toBe(snapshot);
  });

  test("多个框：结果是它们的**最小外接矩形**（与顺序无关）", () => {
    const rects = [R(10, 10, 20, 20), R(0, 30, 5, 40), R(15, 0, 25, 5)];
    const forward = combineSelectionRects(rects)!;
    const backward = combineSelectionRects([...rects].reverse())!;
    expect(forward).toEqual({ left: 0, top: 0, right: 25, bottom: 40 });
    expect(backward).toEqual(forward);
  });

  test("★ 单个框时返回**新对象**（不是原引用）", () => {
    const only = R(0, 0, 10, 10);
    expect(combineSelectionRects([only])).not.toBe(only);
    expect(combineSelectionRects([only])).toEqual(only);
  });
});

describe("★ compactPreviewNodes：按 id 去重，**保留首个**", () => {
  test("无重复时原样返回（去掉 nullish）", () => {
    const a = N("a");
    const b = N("b");
    expect(compactPreviewNodes(a, b)).toEqual([a, b]);
  });

  test("★ 同 id 保留**第一个**（不是最后一个，也不是合并）", () => {
    const first = N("a", { name: "first" });
    const second = N("a", { name: "second" });
    const out = compactPreviewNodes(first, second);
    expect(out).toHaveLength(1);
    expect(out[0], "★ 保留首个").toBe(first);
    expect(out[0].name).toBe("first");
  });

  test("★ nullish 被跳过（`if (node && …)`）", () => {
    const a = N("a");
    expect(compactPreviewNodes(null, a, undefined, a)).toEqual([a]);
    expect(compactPreviewNodes(null, undefined)).toEqual([]);
    // 对照：空数组 vs 全 nullish —— 都得空数组，但**新数组**
    expect(compactPreviewNodes()).toEqual([]);
  });

  test("是变参（`...nodes`），不是数组参数", () => {
    const a = N("a");
    // 传数组会被当成「一个元素是数组」—— 而数组没有 .id，于是被存进 Map
    const out = compactPreviewNodes([a] as never);
    expect(out).toHaveLength(1);
    expect((out[0] as unknown as { id: string }).id, "★ 数组的 id 是 undefined").toBeUndefined();
  });

  test("★ 顺序按**首次出现**排", () => {
    const a = N("a");
    const b = N("b");
    const c = N("c");
    expect(compactPreviewNodes(c, a, b, c, a).map((n) => n.id)).toEqual(["c", "a", "b"]);
  });

  test("★ id 为空串也算一个键（`!compacted.has(\"\")` 为真才跳过）", () => {
    const blank1 = N("", { name: "1" });
    const blank2 = N("", { name: "2" });
    const out = compactPreviewNodes(blank1, blank2);
    expect(out).toHaveLength(1);
    expect(out[0].name, "★ 保留首个").toBe("1");
  });

  test("不改动传入的节点对象", () => {
    const a = N("a", { params: { k: "v" } });
    const snapshot = JSON.stringify(a);
    compactPreviewNodes(a, a, a);
    expect(JSON.stringify(a)).toBe(snapshot);
  });

  test("返回新数组（不共享入参数组）", () => {
    const a = N("a");
    expect(compactPreviewNodes(a)).not.toBe([a]);
    expect(compactPreviewNodes(a)).not.toBe(compactPreviewNodes(a));
    expect(compactPreviewNodes(a)).toEqual(compactPreviewNodes(a));
  });

  test("同一输入恒得同一结果（无模块级状态）", () => {
    const a = N("a");
    const b = N("b");
    const once = compactPreviewNodes(a, b, a);
    for (let i = 0; i < 20; i += 1) {
      expect(compactPreviewNodes(a, b, a)).toEqual(once);
    }
  });

  test("★ 两条等价变异全绿是**正确的**（记录，避免下一个人重查）", () => {
    // ⑨ `Array.from(compacted.values())` 改
    //    `Array.from(compacted.entries()).map(([, node]) => node)`。
    //   —— `Map` 的 `values()` 与 `entries()` **按同一个插入顺序**迭代，
    //      后者只是多带一个被丢弃的键。逐位相同。
    const build = (entries: Array<[string, ModelNode]>) =>
      Array.from(new Map(entries).entries()).map(([, node]) => node);
    const expected = (entries: Array<[string, ModelNode]>) =>
      Array.from(new Map(entries).values());
    const cases: Array<Array<[string, ModelNode]>> = [
      [["a", N("a")]],
      [["b", N("b")], ["a", N("a")], ["b2", N("b")]],
      [["", N("empty")], ["", N("empty2")]]
    ];
    for (const entries of cases) {
      expect(build(entries), JSON.stringify(entries.map(([key]) => key))).toEqual(expected(entries));
    }
    // 前提：Map 的两种迭代器同序
    const map = new Map([["z", 1], ["a", 2]]);
    expect([...map.values()]).toEqual([...map.keys()].map((k) => map.get(k)));
    expect([...map.entries()].map(([, v]) => v)).toEqual([...map.values()]);

    // ⑩ `new Map<string, ModelNode>()` 改 `new Map()`（靠上下文推断类型）。
    //   —— 纯类型标注差异，零运行时影响。tsc 两种写法都过。
    const inferred = new Map();
    inferred.set("a", N("a"));
    expect([...inferred.values()]).toHaveLength(1);
  });
});
