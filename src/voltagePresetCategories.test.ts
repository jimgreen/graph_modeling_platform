// 电压基值预设与分类：右侧下拉与设置窗口共用同一份派生清单。
//
// 五个区间是手写常量（特高压 1000+ / 超高压 500-999 / 高压 66-499 /
// 中压 6-65 / 低压 0.1-5.99）。区间一旦出现缝隙或重叠，表现是「某个标准电压
// 在下拉里查不到」或「两个分类里各出现一次」，不报错，只在用户选电压时才暴露。
// 这里的断言把「每个内置电压恰好落一个分类」这条不变量锁死。
import { describe, expect, test } from "vitest";
import { BUILTIN_VOLTAGE_LEVELS } from "./model";
import { VOLTAGE_BASE_SET_CATEGORIES, VOLTAGE_BASE_SET_PRESETS } from "./appExtracted/appCoreCanvasUtilities";

const categories = VOLTAGE_BASE_SET_CATEGORIES;
const valuesOf = (label: string) => categories.find((c) => c.label === label)!.values;

describe("VOLTAGE_BASE_SET_PRESETS：预设清单", () => {
  test("★ 过滤掉占位电压 0（0 是「未填」，不是可选电压）", () => {
    expect(VOLTAGE_BASE_SET_PRESETS).not.toContain("0");
    expect(VOLTAGE_BASE_SET_PRESETS).toEqual(BUILTIN_VOLTAGE_LEVELS.filter((v) => v !== "0"));
  });

  test("数量与内置清单一致（一个不落、一个不多）", () => {
    expect(VOLTAGE_BASE_SET_PRESETS).toHaveLength(BUILTIN_VOLTAGE_LEVELS.length - 1);
  });
});

describe("VOLTAGE_BASE_SET_CATEGORIES：区间划分", () => {
  test("五个分类按电压从高到低排列", () => {
    expect(categories.map((c) => c.label)).toEqual([
      "特高压（UHV）",
      "超高压（EHV）",
      "高压（HV）",
      "中压（MV）",
      "低压（LV）"
    ]);
  });

  test("★ 每个非零内置电压恰好落一个分类（无重叠、无遗漏）", () => {
    const presets = VOLTAGE_BASE_SET_PRESETS;
    for (const preset of presets) {
      const hits = categories.filter((c) => c.values.includes(preset));
      expect(`${preset} 落在 ${hits.length} 个分类`).toBe(`${preset} 落在 1 个分类`);
    }
    // 反向：分类里的每个值都必须是内置清单成员
    for (const category of categories) {
      for (const value of category.values) {
        expect(BUILTIN_VOLTAGE_LEVELS).toContain(value);
      }
    }
  });

  test("★ 每个分类内部按电压降序（下拉自上而下由高到低）", () => {
    for (const category of categories) {
      const numeric = category.values.map(Number);
      expect(`${category.label}: ${numeric.join(",")}`).toBe(`${category.label}: ${[...numeric].sort((a, b) => b - a).join(",")}`);
    }
  });

  test("★ 实际归属与区间边界一致", () => {
    expect(valuesOf("特高压（UHV）")).toEqual(["1000"]);
    expect(valuesOf("超高压（EHV）")).toEqual(["800", "750", "500"]);
    expect(valuesOf("高压（HV）")).toEqual(["330", "220", "110", "66"]);
    expect(valuesOf("中压（MV）")).toEqual(["35", "20", "10.5", "10", "6"]);
    expect(valuesOf("低压（LV）")).toEqual(["0.4", "0.22"]);
  });

  test("★ 0 不落任何分类（占位电压从下拉里彻底消失）", () => {
    for (const category of categories) {
      expect(category.values).not.toContain("0");
    }
  });

  test("区间上界归下界档（999 属 EHV、66 属 HV、6 属 MV，不出现空洞）", () => {
    const inRange = (value: number) => categories.some((c) => value >= c.min && value <= c.max);
    for (const value of [6, 65, 66, 499, 500, 999, 1000, 5000]) {
      expect(`${value} → ${inRange(value)}`).toBe(`${value} → true`);
    }
  });

  test("★ 低于低压下限的电压（0.05）落在所有区间之外（下拉里查不到，如实记录）", () => {
    const inRange = (value: number) => categories.some((c) => value >= c.min && value <= c.max);
    expect(inRange(0.05)).toBe(false);
    expect(inRange(0)).toBe(false);
  });
});