// MEASUREMENT_FONT_FAMILY 此前 0 命中：它被写进量测框文本的 font-family，
// 量测数值列靠它对齐，但没有任何断言守着这个值。
//
// 风险点在 CSS font-family 逗号列表的语法上，失败时都不报错、只是静默掉字体：
//   · 掺进换行/制表符，SVG 文本的 font-family 属性会整条失效，
//     量测值退回默认比例字体，小数点不再等宽，整列数字错位；
//   · 含空格的族名（此处是 Liberation Mono）漏了引号，会被 CSS 当成
//     三个独立族名解析，命中的是不存在的字体；
//   · 末尾丢掉通用族 monospace，字体全缺失时就没有等宽回退。
import { describe, expect, test } from "vitest";

import { MEASUREMENT_FONT_FAMILY } from "./measurements.ts";

/** 逗号分段后统一去掉分隔空白，得到可直接比较的族名列表。 */
function splitFontFamilies(value: string): string[] {
  return value.split(",").map((item) => item.trim());
}

describe("MEASUREMENT_FONT_FAMILY 字体栈", () => {
  test("是非空字符串，且不含换行与制表符", () => {
    expect(typeof MEASUREMENT_FONT_FAMILY).toBe("string");
    expect(MEASUREMENT_FONT_FAMILY).not.toBe("");
    expect(MEASUREMENT_FONT_FAMILY.trim()).toBe(MEASUREMENT_FONT_FAMILY);
    expect(MEASUREMENT_FONT_FAMILY).not.toMatch(/[\r\n\t]/);
  });

  test("首选 ui-monospace，并回退到 Consolas 等等宽字族", () => {
    const families = splitFontFamilies(MEASUREMENT_FONT_FAMILY);

    expect(families[0]).toBe("ui-monospace");
    expect(families).toContain("Consolas");
    // 量测数值列靠等宽对齐，所以栈内每一项都得是等宽族
    expect(families).toEqual(
      expect.arrayContaining(["ui-monospace", "SFMono-Regular", "Consolas", "Menlo"]),
    );
    expect(families).toContain('"Liberation Mono"');
  });

  test("逗号分隔的最后一段是通用族 monospace", () => {
    const families = splitFontFamilies(MEASUREMENT_FONT_FAMILY);

    expect(families[families.length - 1]).toBe("monospace");
  });

  test("分段无空段与首尾空白，含空格的族名必须带引号", () => {
    const raw = MEASUREMENT_FONT_FAMILY;

    expect(raw).not.toContain(",,");
    expect(raw.startsWith(",")).toBe(false);
    expect(raw.endsWith(",")).toBe(false);

    for (const family of splitFontFamilies(raw)) {
      expect(family).not.toBe("");
      expect(family).toBe(family.trim());
      expect(family).not.toMatch(/ {2}/);
    }

    // 去掉被引号包住的族名后，逐段检查剩余族名里不该再有空白：
    // 未加引号的空白是 CSS 的分隔符，加引号才能保住族名里的空格。
    // 对着当前值必定会走到 Liberation Mono 那一段，删掉引号即转红。
    const unquotedFamilies = raw.replace(/"[^"]*"/g, "").split(",").map((item) => item.trim());
    expect(unquotedFamilies.some((family) => /\s/.test(family))).toBe(false);
  });
});