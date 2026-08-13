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
