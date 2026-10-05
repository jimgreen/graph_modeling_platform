// MEASUREMENT_CHAR_WIDTH_RATIO 此前一条直接断言都没有：它在
// svgExportUtils.ts 与 appExtracted/appGraphMeasurementFactories.tsx 里被
// 折进 charWidthFor(fontSize) = fontSize * RATIO，用来把「字格数」换算成像素。
// 于是：字号被改、或者这个比例被改，量测框的列宽会整体漂移，而渲染出来
// 仍然是一张合法 SVG —— 只有把这两个常数的关系钉死才看得见。
//
// 比例是**按字格**定义的，不是按字符：measurementVisualWidth 给纯 ASCII
// 每字 1 格、CJK 每字 2 格。所以下面一律除以「格数」而不是「字符数」。
//
// 变异验证记录（改 src/measurements.ts 后跑本文件，再从备份还原）：
//   · RATIO 0.5 → 0.6            ：第 1、4 条转红（0.6≠0.5；14×0.6×20=168≠140）
//   · LABEL_VISUAL_WIDTH 14 → 12 ：第 4 条转红（12×0.5×20=120≠140）
// 下面第 2、3 条**不会**在这两个变异下转红，这是正确结果，不是漏覆盖：
// 它们两侧都含 MEASUREMENT_CHAR_WIDTH_RATIO，比值被约掉，钉的是结构
// （ASCII 每字 1 格、CJK 每字 2 格、比例按字格而非按字符折算），
// 常量的**取值**由第 1、4 条钉死。删掉第 2、3 条里对格数的断言才会真的变红。
import { describe, expect, test } from "vitest";

import {
  MEASUREMENT_CHAR_WIDTH_RATIO,
  MEASUREMENT_LABEL_VISUAL_WIDTH,
  measurementPadTextToVisualWidth,
  measurementVisualWidth,
} from "./measurements";

describe("MEASUREMENT_CHAR_WIDTH_RATIO 的取值与字宽派生", () => {
  test("比例严格等于 0.5，且落在 0 到 1 之间的有限数区间", () => {
    // 源码核对：src/measurements.ts 第 741 行的字面量就是 0.5。
    expect(MEASUREMENT_CHAR_WIDTH_RATIO).toBe(0.5);
    expect(Number.isFinite(MEASUREMENT_CHAR_WIDTH_RATIO)).toBe(true);
    expect(MEASUREMENT_CHAR_WIDTH_RATIO).toBeGreaterThan(0);
    expect(MEASUREMENT_CHAR_WIDTH_RATIO).toBeLessThan(1);
  });

  test("纯 ASCII 每字恰好一个字格，按比例推出的字宽等于字号乘以该比例", () => {
    const FONT_SIZE = 16;
    const ascii = "IA3"; // 纯 ASCII，无 CJK、无全角
    // 生产侧的换算式，与 svgExportUtils.ts 第 396 行的 charWidthFor 一致。
    const charWidth = FONT_SIZE * MEASUREMENT_CHAR_WIDTH_RATIO;

    // 每个 ASCII 字符占 1 格，所以「格数 / 字符数」正好是 1。
    expect(measurementVisualWidth(ascii) / ascii.length).toBe(1);
    // 由字格推出的像素字宽，因此等于该比例乘字号 —— 比例就是这个派生式的定义。
    expect((measurementVisualWidth(ascii) * charWidth) / ascii.length).toBe(
      FONT_SIZE * MEASUREMENT_CHAR_WIDTH_RATIO,
    );
    // 同一条式子在另一个字号上依然成立（比例与字号无关，只线性缩放）。
    expect((measurementVisualWidth(ascii) * (24 * MEASUREMENT_CHAR_WIDTH_RATIO)) / ascii.length).toBe(
      24 * MEASUREMENT_CHAR_WIDTH_RATIO,
    );
  });

  test("CJK 每字两格，比例按字格计而非按字符计", () => {
    const ratio = MEASUREMENT_CHAR_WIDTH_RATIO;
    const ascii = "ab";
    const cjk = "有功";
    const asciiCells = measurementVisualWidth(ascii) / ascii.length;
    const cjkCells = measurementVisualWidth(cjk) / cjk.length;
    expect(asciiCells).toBe(1);
    expect(cjkCells).toBe(asciiCells * 2);

    // 像素宽正比于「字格数 × 比例」，所以同长度的 CJK 恰好是 ASCII 的两倍宽。
    // 这也正是「不能按字符数折算」的理由：若拿字符数去乘字宽，CJK 会被算窄一半。
    expect(cjkCells * ratio).toBe(asciiCells * ratio * 2);
    expect(cjkCells * ratio).not.toBe(asciiCells * ratio);
  });

  test("标签列宽度：14 个字格乘以字宽恰好等于 7 倍字号", () => {
    const FONT_SIZE = 20;
    const charWidth = FONT_SIZE * MEASUREMENT_CHAR_WIDTH_RATIO;
    const labelText = "3";

    // 补齐到标签列定宽后，实际占满的字格数正好等于该列宽常数。
    expect(measurementVisualWidth(measurementPadTextToVisualWidth(labelText, MEASUREMENT_LABEL_VISUAL_WIDTH))).toBe(
      MEASUREMENT_LABEL_VISUAL_WIDTH,
    );
    // 列宽的像素值：14 字格 × (字号 × 0.5) = 7 × 字号。
    // 这里 7 是从两个常量现推的，改任何一个常数都会让这条断言变红。
    expect(MEASUREMENT_LABEL_VISUAL_WIDTH * charWidth).toBe(7 * FONT_SIZE);
    expect(MEASUREMENT_LABEL_VISUAL_WIDTH * charWidth).toBe(MEASUREMENT_LABEL_VISUAL_WIDTH * FONT_SIZE * 0.5);
  });
});