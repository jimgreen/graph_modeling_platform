import { describe, expect, test } from "vitest";
import {
  moveSelectedTableRows,
  nextTableRowSelection,
  uniqueCopiedFieldName
} from "./definitionTableSelection";

describe("definition table row selection", () => {
  test("supports plain, additive, toggle, and range selection", () => {
    const ordered = ["a", "b", "c", "d"];
    const plain = nextTableRowSelection([], "b", ordered, null);
    expect(plain).toEqual({ selectedKeys: ["b"], anchorKey: "b" });

    const additive = nextTableRowSelection(plain.selectedKeys, "d", ordered, plain.anchorKey, { ctrlKey: true });
    expect(additive).toEqual({ selectedKeys: ["b", "d"], anchorKey: "d" });

    const toggled = nextTableRowSelection(additive.selectedKeys, "b", ordered, additive.anchorKey, { metaKey: true });
    expect(toggled).toEqual({ selectedKeys: ["d"], anchorKey: "b" });

    const range = nextTableRowSelection(["b"], "d", ordered, "b", { shiftKey: true });
    expect(range).toEqual({ selectedKeys: ["b", "c", "d"], anchorKey: "b" });
  });

  test("moves contiguous and non-contiguous selections while preserving order", () => {
    expect(moveSelectedTableRows(
      ["a", "b", "c", "d", "e"],
      new Set(["c", "d"]),
      (row) => row,
      -1
    )).toEqual(["a", "c", "d", "b", "e"]);

    expect(moveSelectedTableRows(
      ["a", "b", "c", "d", "e"],
      new Set(["b", "d"]),
      (row) => row,
      1
    )).toEqual(["a", "c", "b", "e", "d"]);
  });

  test("treats non-movable rows as movement barriers", () => {
    const rows = [
      { id: "base", readonly: true },
      { id: "a" },
      { id: "b" }
    ];
    expect(moveSelectedTableRows(rows, new Set(["a"]), (row) => row.id, -1, (row) => !row.readonly))
      .toEqual(rows);
  });

  test("generates unique snake-case copy names", () => {
    const existing = new Set(["p_set", "p_set_copy", "p_set_copy_2"]);
    expect(uniqueCopiedFieldName("p_set", existing)).toBe("p_set_copy_3");
    expect(uniqueCopiedFieldName("", existing)).toBe("field_copy");
  });
});

// L28-30 区间选择的 additive 分支：shift 命中区间时，ctrl/meta 让结果变成
// 「原选择 ∪ 区间」。既有那条 `nextTableRowSelection(["b"], "d", ordered, "b", {shiftKey:true})`
// 只走了非 additive 一侧，而且原选择恰好是区间的子集 —— 于是
//   `orderedKeys.filter(k => current.includes(k) || range.includes(k))`
// 与 `[...range]` 在那一个夹具上逐元素相同，改成任何一种都照样绿。
// 下面全部用「原选择里含区间外的键」作夹具，additive 才有鉴别力。
describe("range selection 的 additive 分支（L28-30）", () => {
  const ordered = ["a", "b", "c", "d", "e"];

  test("shift+ctrl/meta 时并入区间外的原有选择，anchor 仍为 shift 前的锚点", () => {
    // anchor=c(2)、点击=b(1) ⇒ 区间 b..c；原有选择 {a, d} 里 a、d 都在区间外。
    for (const modifiers of [{ shiftKey: true, ctrlKey: true }, { shiftKey: true, metaKey: true }]) {
      expect(nextTableRowSelection(["d", "a"], "b", ordered, "c", modifiers))
        .toEqual({ selectedKeys: ["a", "b", "c", "d"], anchorKey: "c" });
    }
  });

  test("并集按表格行序输出，不是「区间在前 + 原选择在后」", () => {
    // 原选择写成 ["d","a"]（表格序是 a,d）：filter 走 orderedKeys ⇒ a 先于 d。
    // 若实现改成 `[...range, ...currentSelection]` 会得到 ["b","c","d","a"] —— 顺序不同。
    expect(nextTableRowSelection(["d", "a"], "b", ordered, "c", { shiftKey: true, ctrlKey: true }))
      .toEqual({ selectedKeys: ["a", "b", "c", "d"], anchorKey: "c" });
  });

  test("同一夹具去掉 ctrl/meta 就只留区间，additive 一侧因此有鉴别力", () => {
    // 对照组：与上面同一个 anchor/clicked/原选择，只把 ctrlKey 去掉。
    expect(nextTableRowSelection(["d", "a"], "b", ordered, "c", { shiftKey: true }))
      .toEqual({ selectedKeys: ["b", "c"], anchorKey: "c" });
  });

  test("原选择全在区间内时并集与区间逐元素相同（恒真实现的对照组）", () => {
    // 这一条让「additive 分支恒等于 range」的实现转红：区间是 b..d，原选择只有 b。
    // 恒真实现给出 ["b","c","d"]（对），但它必须与上面 a/d 那条一起看才有意义。
    expect(nextTableRowSelection(["b"], "d", ordered, "b", { shiftKey: true, ctrlKey: true }))
      .toEqual({ selectedKeys: ["b", "c", "d"], anchorKey: "b" });
  });

  test("shift 无锚点（null/undefined）时不进区间分支，落回 additive 的 toggle 语义", () => {
    // L20 的守卫：`anchorKey !== null && anchorKey !== undefined`。
    // anchor 缺失 ⇒ 走 L36-41 的 toggle 分支：b 不在原选择里 ⇒ 并入。
    // 结果顺序是 **orderedKeys 的行序**（["b","e"]），不是 currentSelection 追加的顺序 ——
    // 这正是 L39 用 orderedKeys.filter 而非 [...current, clicked] 的可观测后果。
    for (const anchor of [null, undefined]) {
      expect(nextTableRowSelection(["e"], "b", ordered, anchor, { shiftKey: true, ctrlKey: true }))
        .toEqual({ selectedKeys: ["b", "e"], anchorKey: "b" });
    }
    // 同一个 anchor 为 null 的夹具，去掉 ctrl 就只留点击项 —— 排除「另一条路产出同结果」。
    expect(nextTableRowSelection(["e"], "b", ordered, null, { shiftKey: true }))
      .toEqual({ selectedKeys: ["b"], anchorKey: "b" });
  });

  test("锚点或点击项不在 orderedKeys 中时区间分支整体跳过", () => {
    // anchorKey 不在表里 ⇒ indexOf 返回 -1 ⇒ L23 守卫不成立，落回 toggle ⇒ ["b","e"]（行序）。
    expect(nextTableRowSelection(["e"], "b", ordered, "Z", { shiftKey: true, ctrlKey: true }))
      .toEqual({ selectedKeys: ["b", "e"], anchorKey: "b" });
    // clickedKey 不在表里（锚点在表里）⇒ 同样跳过；且 L39 的 filter 遍历 orderedKeys，
    // 不在表里的 "Y" 永远加不进去，结果只剩原选择。
    expect(nextTableRowSelection(["e"], "Y", ordered, "c", { shiftKey: true, ctrlKey: true }))
      .toEqual({ selectedKeys: ["e"], anchorKey: "Y" });
  });
});

// L75：`String(sourceName ?? "").trim() || "field"` 两个操作符各有一道边界，
// 且判别输入的取法不同：
//   · `??` 右臂要 **nullish**（null / undefined）——空串不是 nullish，会短路取左值；
//   · `||` 右臂要 **falsy**，且该 falsy 值必须 ≠ 兜底值 "field"：
//     - `""`（及纯空白 "   "，trim 后为 ""）能断 `||` 变 `??`；
//     - `0` / `false` / `NaN` 能断 `??` 变 `||`，因为它们非 nullish，`??` 会保留原值。
// 既有那条 `uniqueCopiedFieldName("", existing)` 只覆盖了 `||` 那一侧，
// 全程没有传过 nullish 或 falsy 非空串的源名。
//
// 变异实测（L75 三条形态此前全 GREEN，加上本组用例后全 RED）：
//   · `??` → `||`  ⇒ `AssertionError: expected 'field_copy' to be '0_copy'`（源名 0）
//   · 删 `?? ""`  ⇒ `AssertionError: expected 'null_copy' to be 'field_copy'`（源名 null）
//   · `??` 换值  ⇒ `AssertionError: expected 'Xsrc_copy' to be 'field_copy'`
// L28-30 同理：`additive` → `!additive` 与 `filter(k => range.includes(k))`
// 此前都是 GREEN，现由「原选择含区间外的键」这一夹具杀掉：
//   `expected { selectedKeys: [ 'b', 'c' ], … } to deeply equal { … 'a' … }`
describe("uniqueCopiedFieldName 的源名边界（L75 的 ?? 与 ||）", () => {
  test("源名为 nullish 时走 ?? 的右臂，落到 field_copy", () => {
    expect(uniqueCopiedFieldName(null, new Set())).toBe("field_copy");
    expect(uniqueCopiedFieldName(undefined, new Set())).toBe("field_copy");
    // 回写契约对这两条同样成立（写回的是产出名的小写形式）。
    const written = new Set<string>();
    uniqueCopiedFieldName(null, written);
    expect([...written]).toEqual(["field_copy"]);
  });

  test("源名是 falsy 但非 nullish 时 ?? 保留原值，|| 会把它换成 field", () => {
    // 0 / false / NaN 与兜底值 "field" 逐字符不同，故三条都是有效判别输入。
    expect(uniqueCopiedFieldName(0, new Set())).toBe("0_copy");
    expect(uniqueCopiedFieldName(false, new Set())).toBe("false_copy");
    expect(uniqueCopiedFieldName(Number.NaN, new Set())).toBe("NaN_copy");
  });

  test("falsy 非 nullish 源名的复制名同样参与去重递增", () => {
    expect(uniqueCopiedFieldName(0, new Set(["0_copy"]))).toBe("0_copy_2");
    expect(uniqueCopiedFieldName(0, new Set(["0_copy", "0_copy_2"]))).toBe("0_copy_3");
    const written = new Set<string>();
    uniqueCopiedFieldName(false, written);
    expect([...written]).toEqual(["false_copy"]);
  });

  test("空串与纯空白走 || 的右臂，trim 先于 || 生效", () => {
    // 与上一条互为对照：这些是 nullish 之外的真·空，两条操作符都会取右臂，
    // 但必须断言产出是 "field_copy" 而不是 "_copy"（后者说明 trim 被绕过了）。
    expect(uniqueCopiedFieldName("", new Set())).toBe("field_copy");
    expect(uniqueCopiedFieldName("   ", new Set())).toBe("field_copy");
    expect(uniqueCopiedFieldName("\t\n ", new Set())).toBe("field_copy");
    // 空源的复制名也要参与去重。
    expect(uniqueCopiedFieldName("   ", new Set(["field_copy"]))).toBe("field_copy_2");
  });

  test("非字符串源名按 String() 语义处理，数组/对象不报错", () => {
    // String(["  a  "]) === "  a  "（单元素数组的 toString 就是元素本身）。
    expect(uniqueCopiedFieldName(["  a  "], new Set())).toBe("a_copy");
    // 多元素数组的 String() 是逗号连接；uniqueCopiedFieldName 只做 trim，
    // 逗号原样留在名字里（这条钉住「除了 trim 没有别的清洗」这一事实）。
    expect(uniqueCopiedFieldName(["a", "b"], new Set())).toBe("a,b_copy");
    expect(uniqueCopiedFieldName({ toString: () => "  P_set  " }, new Set())).toBe("P_set_copy");
  });
});

describe("uniqueCopiedFieldName", () => {
  // 快照「种子集合按小写折叠后的占用表」。函数会把产出的名字（小写形式）回写进
  // 调用方的 Set，所以必须在调用**之前**快照，否则断言会把自己刚写进去的名字当成种子。
  const occupiedLowerCase = (seeds: string[]) => new Set(seeds.map((name) => name.toLowerCase()));

  test("混合大小写种子同样占用：产出的名字不会与 FieldA 只差大小写", () => {
    // 核心缺陷：探针走 toLowerCase() 而种子不归一，FieldA_copy 查不到 → 直接吐出
    // FieldA_copy，与已有列仅大小写不同（表格/Excel 导出会撞列名）。
    const seeds = ["FieldA", "FieldA_copy"];
    const taken = occupiedLowerCase(seeds);
    const produced = uniqueCopiedFieldName("FieldA", new Set(seeds));
    expect(produced).toBe("FieldA_copy_2");
    expect(taken.has(produced.toLowerCase())).toBe(false);

    // 同一条链路：只差大小写的另一个种子（fielda_copy）也必须被认成已占用。
    const takenLower = occupiedLowerCase(["FieldA", "fielda_copy"]);
    const producedLower = uniqueCopiedFieldName("fieldA", new Set(["FieldA", "fielda_copy"]));
    expect(producedLower).toBe("fieldA_copy_2");
    expect(takenLower.has(producedLower.toLowerCase())).toBe(false);

    // 复制一个全新的字段时，产出的名不得与 FieldA 撞（无论大小写）。
    const takenFresh = occupiedLowerCase(["FieldA"]);
    const producedFresh = uniqueCopiedFieldName("FieldB", new Set(["FieldA"]));
    expect(producedFresh).toBe("FieldB_copy");
    expect(takenFresh.has(producedFresh.toLowerCase())).toBe(false);
  });

  test("种子同时含 FieldA 与 fielda 时按同一个名字占用", () => {
    const seeds = ["FieldA", "fielda", "FIELDA_copy"];
    const taken = occupiedLowerCase(seeds);
    const produced = uniqueCopiedFieldName("fieldA", new Set(seeds));
    expect(produced).toBe("fieldA_copy_2");
    expect(taken.has(produced.toLowerCase())).toBe(false);

    // 两种拼写折叠成同一个条目，因此「只给一种拼写」与「两种都给」结果必须一致。
    const base = uniqueCopiedFieldName("v", new Set(["fielda"]));
    expect(uniqueCopiedFieldName("v", new Set(["FieldA", "fielda"]))).toBe(base);
    expect(uniqueCopiedFieldName("v", new Set(["fieldA"]))).toBe(base);
  });

  test("全小写种子的行为完全不变", () => {
    // 与本文件既有的小写用例一致：_2 起步、逐个递增到下一个可用值。
    const existing = new Set(["p_set", "p_set_copy", "p_set_copy_2"]);
    expect(uniqueCopiedFieldName("p_set", existing)).toBe("p_set_copy_3");
    expect(uniqueCopiedFieldName("", existing)).toBe("field_copy");
    expect(uniqueCopiedFieldName("p_set", existing)).toBe("p_set_copy_4");
    // 回写契约不变：写回的是产出的名字的小写形式。
    expect(existing.has("p_set_copy_4")).toBe(true);
    expect(existing.has("field_copy")).toBe(true);
    expect(uniqueCopiedFieldName("a", new Set(["A", "B", "C"]))).toBe("a_copy");
  });

  test("冲突编号后缀递增到下一个可用值", () => {
    // 混合大小写占用者夹在中间，后缀要跨过它落到 3，且不回落到 2。
    const taken = occupiedLowerCase(["V_copy", "v_copy_2", "v_copy_4"]);
    const produced = uniqueCopiedFieldName("v", new Set(["V_copy", "v_copy_2", "v_copy_4"]));
    expect(produced).toBe("v_copy_3");
    expect(taken.has(produced.toLowerCase())).toBe(false);

    // 连续占用时逐级递增，不跳号。
    const sequential = new Set(["v_copy", "v_copy_2", "v_copy_3"]);
    expect(uniqueCopiedFieldName("v", sequential)).toBe("v_copy_4");
    // 首轮不带编号，冲突后才从 _2 起。
    expect(uniqueCopiedFieldName("v", new Set(["v_copy", "v_copy_2"]))).toBe("v_copy_3");
  });

  test("空种子集合与含空格或中文的种子名", () => {
    // 空集合：直接产出基础名，并按小写形式回写。
    const empty = new Set<string>();
    expect(uniqueCopiedFieldName("FieldA", empty)).toBe("FieldA_copy");
    expect([...empty]).toEqual(["fielda_copy"]);
    // 空种子再复制一次要避开自己刚写的名字。
    expect(uniqueCopiedFieldName("FieldA", empty)).toBe("FieldA_copy_2");

    // 种子名含空格：源名两端空白被 trim，占用判定按含空格的整串比较。
    expect(uniqueCopiedFieldName("  含 空格  ", new Set(["含 空格_copy"]))).toBe("含 空格_copy_2");
    expect(uniqueCopiedFieldName(" 含 空格 ", new Set(["含 空格_copy", "含 空格_copy_2"]))).toBe("含 空格_copy_3");
    // 空格数不同就是两个不同名字，不触发去重。
    expect(uniqueCopiedFieldName("含空格", new Set(["含 空格_copy"]))).toBe("含空格_copy");

    // 中文种子：toLowerCase 对中文是恒等变换，占用判定照常生效（种子的 _Copy 也要被认出来）。
    expect(uniqueCopiedFieldName("设备名", new Set(["设备名_copy"]))).toBe("设备名_copy_2");
    expect(uniqueCopiedFieldName("设备 名", new Set(["设备 名_Copy"]))).toBe("设备 名_copy_2");
    expect(uniqueCopiedFieldName("设备名", new Set(["设备名_copy", "设备名_copy_2"]))).toBe("设备名_copy_3");
  });
});
