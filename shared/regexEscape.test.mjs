// escapeRegExp 的等价性守卫（跨端共享单源）。
//
// 此前 `src/model.ts`、`src/svgUtils.ts`、`server/config.mjs` 各有一份相同实现。
// 合并到 shared/regexEscape.mjs 后，本文件把**三份旧实现逐一与共享版对比**，
// 确保合并是零行为变化的纯重构 —— 任何一份的差异都会立刻暴露。
//
// `u` 标志差异也一并钉住：`src/svgUtils.ts` 原实现带 `u`，另两份不带。
// 对 `[.*+?^${}()|[\]\\]` 这类纯 ASCII 元字符，`u` 与非 `u` 行为相同（都按单码点
// 匹配），故共享版取不带 `u` 的多数派版本。
import { describe, expect, test } from "vitest";
import { escapeRegExp } from "./regexEscape.mjs";

/** src/model.ts 的原实现（无 u） */
const originalNoU = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
/** src/svgUtils.ts 的原实现（带 u） */
const originalWithU = (value) => value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");

describe("三份旧实现与共享版逐字节相同", () => {
  // 覆盖正则全部元字符 + 无关字符 + 空串
  const samples = [
    "", "a", "abc", ".*+?^${}()|[]\\",
    "^$", "a.b", "a*b", "a+b", "a?b", "a{2}", "a|b", "(a)", "[a]", "\\a",
    "ACLoad", "ac-vpp-box", "图层 1", "idx_ac_unit_t1",
    "/webgrp/images", "a\\b\\c", "%%%", "^^^", "|||", "()()",
    "a".repeat(100), ".*".repeat(50)
  ];

  test("对无 u 版本（model.ts / config.mjs 原实现）", () => {
    for (const s of samples) {
      expect(escapeRegExp(s), JSON.stringify(s)).toBe(originalNoU(s));
    }
  });

  test("对带 u 版本（svgUtils.ts 原实现）", () => {
    for (const s of samples) {
      expect(escapeRegExp(s), JSON.stringify(s)).toBe(originalWithU(s));
    }
  });

  test("穷举：全部 ASCII 单字符 + 两两组合与两版都相同", () => {
    const mismatches = [];
    for (let a = 0; a < 0x80; a += 1) {
      const ca = String.fromCharCode(a);
      if (escapeRegExp(ca) !== originalNoU(ca) || escapeRegExp(ca) !== originalWithU(ca)) {
        mismatches.push(ca);
      }
      for (let b = 0; b < 0x80; b += 1) {
        const s = ca + String.fromCharCode(b);
        if (escapeRegExp(s) !== originalNoU(s) || escapeRegExp(s) !== originalWithU(s)) {
          mismatches.push(s);
        }
      }
    }
    expect(mismatches).toEqual([]);
  });
});

describe("转义后的字符串可用于正则（行为正确性）", () => {
  test("嵌入正则后字面量匹配，不被当作元字符", () => {
    const literal = "a.b*c+d?e(f)g[h]i{j}k^l$m|n\\o";
    const pattern = new RegExp(`^${escapeRegExp(literal)}$`);
    expect(pattern.test(literal)).toBe(true);
    // 未转义时会被当作模式而误匹配
    expect(new RegExp(`^${literal}$`).test(literal)).toBe(false);
  });

  test("可安全嵌入字符类内部", () => {
    const cls = escapeRegExp("a-b]c");
    expect(new RegExp(`^[${cls}]$`).test("a")).toBe(true);
  });
});

describe("nullish 与非字符串输入", () => {
  test("undefined/null → 空串（与 String(value ?? \"\") 一致）", () => {
    expect(escapeRegExp(undefined)).toBe("");
    expect(escapeRegExp(null)).toBe("");
  });

  test("数字/布尔被转成字符串", () => {
    expect(escapeRegExp(123)).toBe("123");
    expect(escapeRegExp(false)).toBe("false");
  });
});
