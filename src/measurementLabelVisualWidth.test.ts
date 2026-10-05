// MEASUREMENT_LABEL_VISUAL_WIDTH 与 measurementPadTextToVisualWidth 的补零覆盖。
//
// 补这个文件的理由有两条，都不是重复 measurements.test.ts 里已有的用例：
//   ① 常量 14 在此前只以**注释**形式出现在两处
//      （appGraphMeasurementFactories.test.ts、svgExportUtilsMeasurement.test.ts），
//      没有任何一条断言把它钉死；而 svgExportUtils.ts 与
//      appExtracted/appGraphMeasurementFactories.tsx 都拿它直接算标签列宽 ——
//      常量一改，标签列与数值列的对齐会整体漂移，且不会报错。
//   ② measurements.test.ts 里已有的补齐用例目标宽度是 6 / 4 / 3 / 2，
//      从未走过生产真正使用的 14。
import { describe, expect, test } from "vitest";
import {
  MEASUREMENT_LABEL_VISUAL_WIDTH,
  MEASUREMENT_VALUE_TOTAL_WIDTH,
  measurementPadTextToVisualWidth,
  measurementVisualWidth
} from "./measurements";

/**
 * 视觉宽度的独立重算，**故意不走** measurementVisualWidth。
 *
 * 写成单个正则区间，而不是抄源码那五段 `||` 范围判断：抄过来等于把实现复制一份，
 * 两边一起改就永远自洽。这里要的是「按规格重算」——
 * 源码里任何一个范围或权重（宽字算 2 还是算 1）被改动，本文件都会红。
 */
const WIDE_CHAR =
  /[\u{3000}-\u{303F}\u{3400}-\u{4DBF}\u{4E00}-\u{9FFF}\u{F900}-\u{FAFF}\u{FF00}-\u{FFEF}]/u;

const recomputedVisualWidth = (text: string): number =>
  [...text].reduce((sum, char) => sum + (WIDE_CHAR.test(char) ? 2 : 1), 0);

/** 一律用生产常量作为目标宽度，别在用例里另写一个 14（写死会与常量脱钩）。 */
const pad = (text: string) => measurementPadTextToVisualWidth(text, MEASUREMENT_LABEL_VISUAL_WIDTH);

describe("MEASUREMENT_LABEL_VISUAL_WIDTH 与标签列视觉宽度补齐", () => {
  test("标签列宽常量固定为 14 列：不是数值列宽，也不由其它列宽常量推导得出", () => {
    expect(MEASUREMENT_LABEL_VISUAL_WIDTH).toBe(14);
    expect(Number.isInteger(MEASUREMENT_LABEL_VISUAL_WIDTH)).toBe(true);
    // 标签列与数值列是两列独立定宽；断言 not.toBe(9) 是为了让上面那句
    // toBe(14) 具备鉴别力 —— 常量被换成数值列宽时也会红，而不是恰好相等。
    expect(MEASUREMENT_LABEL_VISUAL_WIDTH).not.toBe(MEASUREMENT_VALUE_TOTAL_WIDTH);
  });

  test("纯 ASCII 标签左补普通空格到 14 列宽", () => {
    const padded = pad("UA-01"); // 5 列 → 左补 9 格
    expect(padded).toBe(" ".repeat(9) + "UA-01");
    expect(recomputedVisualWidth(padded)).toBe(MEASUREMENT_LABEL_VISUAL_WIDTH);
    // 与生产用的同一个测量函数对账：两条路径算出不同宽度，右对齐就会错位。
    expect(measurementVisualWidth(padded)).toBe(MEASUREMENT_LABEL_VISUAL_WIDTH);
    expect(padded.codePointAt(0)).toBe(0x20);
    // 补的是 U+0020，不是不换行空格 / 数字空格 / 全角空格：
    // 这几个在等宽字体里的步进宽度都不是一列，等价写法会静默错位。
    expect(padded).not.toMatch(/[\u00A0\u2007\u3000]/);
  });

  test("中文标签按双倍字宽计列，同字符数的中文比英文少补一半", () => {
    expect(pad("有功")).toBe(" ".repeat(10) + "有功"); // 2 个宽字 = 4 列 → 补 10
    expect(pad("AB")).toBe(" ".repeat(12) + "AB"); // 2 个窄字 = 2 列 → 补 12
    expect(recomputedVisualWidth(pad("有功"))).toBe(MEASUREMENT_LABEL_VISUAL_WIDTH);
    expect(recomputedVisualWidth(pad("AB"))).toBe(MEASUREMENT_LABEL_VISUAL_WIDTH);
    // 全角括号落在 0xFF00–0xFFEF 那一档，同样按双倍字宽算，不是按字符数算。
    expect(pad("（A）")).toBe(" ".repeat(9) + "（A）"); // 2 + 1 + 2 = 5 列 → 补 9
    expect(recomputedVisualWidth(pad("（A）"))).toBe(MEASUREMENT_LABEL_VISUAL_WIDTH);
  });

  test("中英混合标签按各自字宽求和后补空格", () => {
    // 6 个窄字符（IA- / -01）+ 2 个宽字符（有功，各 2 列）= 10 列 → 左补 4 格
    const mixed = "IA-有功-01";
    const padded = pad(mixed);
    expect(padded).toBe("    " + mixed);
    expect(recomputedVisualWidth(padded)).toBe(MEASUREMENT_LABEL_VISUAL_WIDTH);
    expect(measurementVisualWidth(padded)).toBe(MEASUREMENT_LABEL_VISUAL_WIDTH);
    // 混合串是唯一能把「按视觉列求和」与「按字符数求和」区分开的形态：
    // 若实现按字符数补，mixed.length = 8 会补 6 个空格（而不是 4），
    // 补完的列宽会变成 16，上面三条断言同时红。
    expect(padded.length).toBe(mixed.length + 4);
  });

  test("已达 14 列或超长的标签原样返回：对补齐结果再补一次也不变", () => {
    const exactWide = "一二三四五六七"; // 7 个宽字 = 14 列，但字符数只有 7
    expect(pad(exactWide)).toEqual(exactWide);
    expect(recomputedVisualWidth(pad(exactWide))).toBe(MEASUREMENT_LABEL_VISUAL_WIDTH);
    // 短路的另一半：没补空格。若实现按字符数判断（或去掉短路），
    // 这里会被补成 14 个字符，上面两条断言同时红。
    expect(pad(exactWide).length).toBe(7);
    expect(pad(exactWide).startsWith(" ")).toBe(false);

    const exactNarrow = "abcdefghijklmn"; // 14 个窄字 = 14 列
    expect(pad(exactNarrow)).toEqual(exactNarrow);
    expect(recomputedVisualWidth(pad(exactNarrow))).toBe(MEASUREMENT_LABEL_VISUAL_WIDTH);

    // 超长既不截断也不补
    expect(pad("abcdefghijklmnop")).toBe("abcdefghijklmnop");

    // 幂等：补一次的结果再进同一函数，串不变、列数仍恰好 14
    const once = pad("P1");
    expect(recomputedVisualWidth(once)).toBe(MEASUREMENT_LABEL_VISUAL_WIDTH);
    expect(pad(once)).toEqual(once);
    expect(pad(once).length).toBe(once.length);
  });

  // 变异验证记录（跑过 5 条，全红除下面这一条）：
  //   常量 14→13                       红（钉死常量）
  //   宽字符权重 2→1                    红（重算式与生产 helper 双双红）
  //   补齐字符 → 全角空格 U+3000         红（宽度算成 23，且不是 U+0020）
  //   targetWidth − currentWidth → text.length   红（中文/混合用例红）
  //   短路条件 >= 改 >                  **绿，但属等价变异，不是本文件漏守**
  //     等宽输入下 `>=` 与 `>` 的产物完全相同：`" ".repeat(14 - 14)` 是空串，
  //     而 V8 的 `"" + text` 直接返回 text 本身，所以两条分支返回值逐字相同。
  //     measurements.test.ts:1522-1524 早已记录同一结论（含理由），此处只做指针，
  //     别再当成「短路那一半没覆盖」的证据重查一遍。
});
