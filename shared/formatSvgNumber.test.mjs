// formatSvgNumber 的等价性与漂移修复守卫（跨端共享单源）。
//
// 此前三处实现**语义已漂移**：src 版对非有限值输出字面 "NaN"/"Infinity"，
// server 版归 0，scripts 版连精度都不同（4 位 vs 5 位）。本文件把三者钉到同一语义，
// 并记录「为什么取 server 那一版」。
import { describe, expect, test } from "vitest";
import { formatSvgNumber } from "./formatSvgNumber.mjs";

/** src/svgUtils.ts 的原实现（无防御） */
const originalNoGuard = (value) => {
  const rounded = Math.round(value * 100000) / 100000;
  return String(Object.is(rounded, -0) ? 0 : rounded);
};
/** scripts/generate-docer-compatible-icons.mjs 的原实现（4 位小数） */
const originalScripts = (value) => Number(value.toFixed(4)).toString();

describe("★ 漂移修复：非有限值归 0（此前 src 版输出字面 NaN）", () => {
  test("NaN / Infinity / -Infinity → \"0\"，不产出无效 SVG 属性", () => {
    // 修前：`formatSvgNumber(NaN)` 返回 "NaN" → 生成 x="NaN" → 浏览器**静默忽略**
    // 该属性 → 元素坐标回落默认值，而渲染/导出流程不报任何错。
    expect(formatSvgNumber(NaN)).toBe("0");
    expect(formatSvgNumber(Infinity)).toBe("0");
    expect(formatSvgNumber(-Infinity)).toBe("0");
  });

  test("undefined / null / 非数字字符串 / 对象 → \"0\"", () => {
    expect(formatSvgNumber(undefined)).toBe("0");
    expect(formatSvgNumber(null)).toBe("0");
    expect(formatSvgNumber("abc")).toBe("0");
    expect(formatSvgNumber({})).toBe("0");
  });

  test("与修前实现对照：这六类输入的差异正是本次修复的范围", () => {
    // 显式记录差异，避免后人以为"两边一样"而回退修复
    expect(originalNoGuard(NaN)).toBe("NaN");
    expect(originalNoGuard(undefined)).toBe("NaN");
    expect(formatSvgNumber(NaN)).not.toBe(originalNoGuard(NaN));
  });
});

describe("零行为变化：对所有有限值与原实现逐字节相同", () => {
  test("整型与边界值", () => {
    const cases = [0, -0, 1, -1, 0.5, -0.5, 1e-7, -1e-7, 104, 64, 1e15, -1e15,
      1e21, -1e21, Number.MAX_SAFE_INTEGER, -Number.MAX_SAFE_INTEGER, 2 ** 31, -(2 ** 31)];
    for (const v of cases) {
      expect(formatSvgNumber(v), String(v)).toBe(originalNoGuard(v));
    }
  });

  test("舍入边界（第 6 位为 5 的值）", () => {
    for (let i = 1; i <= 500; i += 1) {
      const v = i / 1000000;
      expect(formatSvgNumber(v), String(v)).toBe(originalNoGuard(v));
      expect(formatSvgNumber(-v), String(-v)).toBe(originalNoGuard(-v));
    }
  });

  test("字符串数值（server 版做 Number() 显式转换，src 版靠乘法隐式转换）", () => {
    for (const s of ["1.5", "-2.25", "0", "1e3", "  7  ", "0.000005", "0.000015"]) {
      expect(formatSvgNumber(s), s).toBe(originalNoGuard(s));
    }
  });

  test("负零归零（不输出 \"-0\"）", () => {
    expect(Object.is(formatSvgNumber(-0), "-0")).toBe(false);
    expect(formatSvgNumber(-0)).toBe("0");
    expect(formatSvgNumber(-1e-7)).toBe("0");
  });

  test("随机浮点 20000 例与原实现相同", () => {
    let seed = 20260929;
    const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
    for (let i = 0; i < 20000; i += 1) {
      const v = (rnd() - 0.5) * (i % 3 === 0 ? 1e6 : i % 3 === 1 ? 1000 : 1e-3);
      expect(formatSvgNumber(v), String(v)).toBe(originalNoGuard(v));
    }
  });
});

describe("精度约定：5 位小数（与 scripts 版 4 位不同，已刻意统一）", () => {
  test("第 5 位小数保留、第 6 位截断", () => {
    expect(formatSvgNumber(1.234567891)).toBe("1.23457");
    // scripts 版原为 4 位：Number((1.234567891).toFixed(4)) === 1.2346
    expect(originalScripts(1.234567891)).toBe("1.2346");
    // 刻意取 5 位（server 与 src 原本都是 5 位，占多数）
    expect(formatSvgNumber(1.234567891)).not.toBe(originalScripts(1.234567891));
  });
});

describe("输出可直接用作 SVG 属性值", () => {
  test("非有限值已归 0，输出不含 NaN / Infinity", () => {
    for (const v of [NaN, Infinity, -Infinity, undefined, null, "abc", {}]) {
      const out = formatSvgNumber(v);
      expect(out, String(v)).not.toMatch(/NaN|Infinity/i);
    }
  });

  test("如实记录：超大值会输出**科学计数法**（SVG 1.1 不接受，浏览器会忽略该属性）", () => {
    // 探针实测发现：String(1e21) === "1e+21"，而 SVG 1.1 的数值语法不含指数形式，
    // 即 `x="1e+21"` 会被浏览器当无效属性忽略。
    //
    // **刻意不修**：1e21 像素级坐标不可能来自真实数据（画布量级在 1e4~1e5），
    // 只可能来自脏数据。而修复要么展开成 22 位定点（让 SVG 体积暴涨）、
    // 要么加范围截断（凭空发明业务规则）—— 两者都是**无收益的复杂度**。
    // 此处钉住当前行为，日后若真出现超大坐标再按实际需求处理。
    expect(formatSvgNumber(1e21)).toBe("1e+21");
    expect(formatSvgNumber(-1e21)).toBe("-1e+21");
    // 现实量级不受影响
    for (const v of [0, 1, 100, 1e4, 1e5, 1e6, 1e15]) {
      expect(formatSvgNumber(v), String(v)).not.toMatch(/e[+-]/i);
    }
  });

  test("放进 SVG 根标签后是合法属性值（浏览器不会忽略）", () => {
    const attr = `x="${formatSvgNumber(NaN)}" y="${formatSvgNumber(12.5)}"`;
    expect(attr).toBe('x="0" y="12.5"');
  });
});
