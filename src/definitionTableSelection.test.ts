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
