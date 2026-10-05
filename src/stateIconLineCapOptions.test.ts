import { describe, expect, test } from "vitest";

import { STATE_ICON_LINE_CAP_OPTIONS } from "./stateIconDrawing";

// 本文件刻意不对 ./stateIconDrawing 做任何 vi.mock。
// stateIconDrawing.test.ts 的 3 处 vi.mock 都把 STATE_ICON_LINE_CAP_OPTIONS
// 覆写成空数组桩，因此真实的 5 项表在全仓从未被任何断言读过 —— 这里直呼真实导出补上。

describe("STATE_ICON_LINE_CAP_OPTIONS 真实选项表", () => {
  test("恰好 5 项，且 value 顺序固定为 none / arrow / circle / triangle / square", () => {
    expect(STATE_ICON_LINE_CAP_OPTIONS).toHaveLength(5);
    expect(STATE_ICON_LINE_CAP_OPTIONS.map((option) => option.value)).toEqual([
      "none",
      "arrow",
      "circle",
      "triangle",
      "square"
    ]);
  });

  test("每项 value 对应的中文 label 都是非空字符串", () => {
    for (const option of STATE_ICON_LINE_CAP_OPTIONS) {
      expect(typeof option.label).toBe("string");
      expect(option.label.trim().length).toBeGreaterThan(0);
    }
    // 兜住桩：真实表不该出现空 label
    expect(STATE_ICON_LINE_CAP_OPTIONS.some((option) => option.label === "")).toBe(false);
  });

  test("5 个 label 互不相同，避免下拉框里出现重名选项", () => {
    const labels = STATE_ICON_LINE_CAP_OPTIONS.map((option) => option.label);
    expect(new Set(labels).size).toBe(labels.length);
    expect(labels).toEqual(["无", "箭头", "圆形", "三角", "四方"]);
  });

  test("value 无重复：Set 长度等于数组长度", () => {
    const values = STATE_ICON_LINE_CAP_OPTIONS.map((option) => option.value);
    expect(new Set(values).size).toBe(values.length);
    expect(new Set(values).size).toBe(STATE_ICON_LINE_CAP_OPTIONS.length);
  });

  test("每一项都带 value 与 label 两个字段，且 value 取自五种线端形状之一", () => {
    const allowed = new Set(["none", "arrow", "circle", "triangle", "square"]);
    for (const option of STATE_ICON_LINE_CAP_OPTIONS) {
      expect(Object.keys(option).sort()).toEqual(["label", "value"]);
      expect(allowed.has(option.value)).toBe(true);
    }
  });
});