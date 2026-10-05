// `tourViewportClamp.ts` 纯函数层的**退化视口**测试。
//
// 与既有 `tourViewportClamp.test.ts` 的分工：那份已覆盖正常视口（1280×800、375×667）、
// MARGIN 边界与 hook 装配；本文件**只补它缺的退化轴**——
//   ① 视口宽/高 ≤ 2 × MARGIN → 夹取区间翻转或退化为一个点；
//   ② 视口原点（offsetTop/offsetLeft）为负 —— 移动端捏合缩放平移时的真实形态；
//   ③ 零尺寸视口与缺字段视口。
//
// 三条贯穿全文件的判据（照本仓 AGENTS.md 的「断言打在会被改动的那一处」铁律）：
// - 退化轴的期望值天然是 **0**，也就是 `let x = 0` 的默认值。所以每条用例都额外断言
//   **另一根轴仍夹到了非零位移**，否则「被测分支被删掉」与「返回默认值」分不开。
// - 凡是断言 `x === 0` 的输入，rect 一律放在**界外远处**（否则 x=0 只是因为没越界），
//   并在注释里算出「若守卫被删会得到多少」，证明这条断言会红。
// - 「恰好等于 2 × MARGIN」这一档特意用 **rect 宽/高为 0** 的输入：`maxX === bounds.left`
//   时只有严格大于号才判为不可夹取，这是唯一能区分 `>` 与 `>=` 的输入。

import { describe, expect, test } from "vitest";

import {
  TOUR_TOOLTIP_VIEWPORT_MARGIN,
  clampTourTooltipOffset,
  readTourTooltipViewport,
  tourTooltipViewportBounds,
  type TourTooltipBounds,
  type TourTooltipMeasure,
  type TourTooltipViewport
} from "./tourViewportClamp";

const MARGIN = TOUR_TOOLTIP_VIEWPORT_MARGIN;

/** 健康视口（1280×800，无缩放），只作对照基准：同样的 rect 在这里必须被夹到。 */
const HEALTHY_VIEWPORT: TourTooltipViewport = { offsetTop: 0, offsetLeft: 0, width: 1280, height: 800 };
const HEALTHY_BOUNDS = tourTooltipViewportBounds(HEALTHY_VIEWPORT);

const measure = (top: number, left: number, width: number, height: number): TourTooltipMeasure => ({
  top,
  left,
  width,
  height
});

/** 可用区间跨度：`right - left === width - 2 × MARGIN`，≤ 0 即区间翻转或退化为一点。 */
const usableSpan = (bounds: TourTooltipBounds) => ({
  horizontal: bounds.right - bounds.left,
  vertical: bounds.bottom - bounds.top
});

describe("退化视口：可用区间 ≤ 2 × 安全边距", () => {
  test("宽度恰好等于 2 倍安全边距 → 左右边界相接为一点，横向一律不夹取、纵向照常夹取", () => {
    const viewport: TourTooltipViewport = { offsetTop: 0, offsetLeft: 0, width: 2 * MARGIN, height: 800 };
    const bounds = tourTooltipViewportBounds(viewport);
    expect(bounds).toEqual({ top: 12, left: 12, right: 12, bottom: 788 });
    // 本档是「恰好等于」而非「小于」：right === left，区间缩成一个点。
    expect(usableSpan(bounds).horizontal).toBe(0);

    // rect 宽 0：此时 maxX = right - 0 === bounds.left，只有严格大于号才判为不可夹取 ——
    // 把守卫从 `maxX > bounds.left` 改成 `>=` 时本用例转红（会得到 x = 12 - 1000 = -988）。
    const zeroWidth = measure(700, 1000, 0, 200);
    // 纵向余量充足，仍应被夹到底边：y = min(max(700, 12), 788 - 200) - 700 = -112。
    expect(clampTourTooltipOffset(zeroWidth, bounds)).toEqual({ x: 0, y: -112 });

    // rect 宽 360 且远在右侧界外：守卫为假 → 原样返回 x = 0。
    // 守卫若被整段删掉，x 会变成 min(max(900, 12), 12 - 360) - 900 = -1248，故本断言承重。
    const wideOutOfBounds = measure(300, 900, 360, 200);
    expect(clampTourTooltipOffset(wideOutOfBounds, bounds)).toEqual({ x: 0, y: 0 });

    // 竖向对称档：高度恰好 2 × MARGIN（bottom === top = 12），rect 高度取 0 使 maxY === top，
    // 于是 `maxY > bounds.top` 的严格性同样由这一条钉住（改成 `>=` 会得到 y = 12 - 1000 = -988）；
    // 横向余量充足，仍夹到右边界 x = 1268 - 360 - 1200 = -292。
    const shortHeightBounds = tourTooltipViewportBounds({
      offsetTop: 0,
      offsetLeft: 0,
      width: 1280,
      height: 2 * MARGIN
    });
    expect(shortHeightBounds).toEqual({ top: 12, left: 12, right: 1268, bottom: 12 });
    expect(clampTourTooltipOffset(measure(1000, 1200, 360, 0), shortHeightBounds)).toEqual({
      x: -292,
      y: 0
    });
  });

  test("宽高都略小于 2 倍安全边距 → 左右与上下边界双双翻转，一律原样返回", () => {
    const viewport: TourTooltipViewport = { offsetTop: 0, offsetLeft: 0, width: 20, height: 18 };
    const bounds = tourTooltipViewportBounds(viewport);
    expect(bounds).toEqual({ top: 12, left: 12, right: 8, bottom: 6 });
    // 真正的「翻转」：right < left 且 bottom < top。
    expect(bounds.right).toBeLessThan(bounds.left);
    expect(bounds.bottom).toBeLessThan(bounds.top);

    // rect 在两个方向都远在界外（左上角负方向），四边都越界。
    const farOutside = measure(-500, -500, 360, 200);
    expect(clampTourTooltipOffset(farOutside, bounds)).toEqual({ x: 0, y: 0 });

    // 对照：同一个 rect 在健康视口下会被夹到 +512 / +512，说明上面的 0 不是「本来就在界内」。
    expect(clampTourTooltipOffset(farOutside, HEALTHY_BOUNDS)).toEqual({ x: 512, y: 512 });
  });
});

describe("退化视口：原点为负（捏合缩放平移）", () => {
  test("负 offset 的视口 → 边界整体落到负坐标，夹取照常生效且贴住边界", () => {
    const viewport: TourTooltipViewport = { offsetTop: -200, offsetLeft: -300, width: 1280, height: 800 };
    const bounds = tourTooltipViewportBounds(viewport);
    expect(bounds).toEqual({ top: -188, left: -288, right: 968, bottom: 588 });
    // 负 offset 本身不改变可用区间：仍等于视口尺寸减 2 × MARGIN。
    expect(usableSpan(bounds)).toEqual({ horizontal: 1256, vertical: 776 });

    const bubble = measure(500, 900, 360, 200);
    const offset = clampTourTooltipOffset(bubble, bounds);
    expect(offset).toEqual({ x: -292, y: -112 });
    // 夹完两边缘分别精确贴住边界（断言打在「位移真的被应用后的坐标」上，而非位移本身）。
    expect(bubble.left + bubble.width + offset.x).toBe(bounds.right);
    expect(bubble.top + bubble.height + offset.y).toBe(bounds.bottom);
  });

  test("负 offset 且宽度小于 2 倍安全边距 → 横向区间仍翻转，负坐标下同样不夹取", () => {
    const viewport: TourTooltipViewport = { offsetTop: -400, offsetLeft: -100, width: 20, height: 400 };
    const bounds = tourTooltipViewportBounds(viewport);
    expect(bounds).toEqual({ top: -388, left: -88, right: -92, bottom: -12 });
    // 负坐标下「翻转」长这样：right(-92) < left(-88)，差值仍是 width - 2 × MARGIN = -4。
    expect(usableSpan(bounds).horizontal).toBe(-4);

    // rect 的下边缘 -100 + 200 = 100 已越过 bounds.bottom(-12) → 纵向确需夹取；
    // 横向则整体在翻转区间之外 → 不夹取。两者必须拆开看，否则 y 也会是 0。
    const bubble = measure(-100, -500, 360, 200);
    const offset = clampTourTooltipOffset(bubble, bounds);
    // y = min(max(-100, -388), -12 - 200) - (-100) = -212 + 100 = -112。
    expect(offset).toEqual({ x: 0, y: -112 });
    // 守卫若被删：x 会变成 min(max(-500, -88), -92 - 360) + 500 = -452 + 500 = 48 ≠ 0。
    // 「原样返回」的形态就是右边缘仍留在翻转区间的左侧（-140 < right），而不是被推到某处。
    expect(bubble.left + bubble.width + offset.x).toBeLessThan(bounds.right);
    expect(bubble.top + bubble.height + offset.y).toBe(bounds.bottom);
  });
});

describe("退化视口：零尺寸", () => {
  test("宽度为 0 → 横向不夹取，纵向仍夹到底边", () => {
    const bounds = tourTooltipViewportBounds({ offsetTop: 0, offsetLeft: 0, width: 0, height: 800 });
    expect(bounds).toEqual({ top: 12, left: 12, right: -12, bottom: 788 });
    expect(bounds.right).toBeLessThan(bounds.left);

    const bubble = measure(700, 900, 360, 200);
    const offset = clampTourTooltipOffset(bubble, bounds);
    expect(offset).toEqual({ x: 0, y: -112 });
    expect(bubble.top + bubble.height + offset.y).toBe(bounds.bottom);
  });

  test("高度为 0 → 纵向不夹取，横向仍夹到右边界", () => {
    const bounds = tourTooltipViewportBounds({ offsetTop: 0, offsetLeft: 0, width: 1280, height: 0 });
    expect(bounds).toEqual({ top: 12, left: 12, right: 1268, bottom: -12 });
    expect(bounds.bottom).toBeLessThan(bounds.top);

    const bubble = measure(400, 1200, 360, 200);
    const offset = clampTourTooltipOffset(bubble, bounds);
    expect(offset).toEqual({ x: -292, y: 0 });
    expect(bubble.left + bubble.width + offset.x).toBe(bounds.right);
  });

  test("宽高皆为 0 → 两轴都不夹取，且该结果不是「本来就在界内」", () => {
    const bounds = tourTooltipViewportBounds({ offsetTop: 0, offsetLeft: 0, width: 0, height: 0 });
    expect(bounds).toEqual({ top: 12, left: 12, right: -12, bottom: -12 });

    const bubble = measure(900, 1300, 360, 200);
    expect(clampTourTooltipOffset(bubble, bounds)).toEqual({ x: 0, y: 0 });
    // 对照：同一个 rect 在健康视口下会被夹到 -392 / -312，即上面那两个 0 承载着守卫。
    expect(clampTourTooltipOffset(bubble, HEALTHY_BOUNDS)).toEqual({ x: -392, y: -312 });
  });
});

describe("退化视口：全空白 / 缺字段", () => {
  test("字段全缺 → 边界被 NaN 污染，比较恒为假，夹取静默空转（当前行为，非健壮路径）", () => {
    // ⚠ 健壮性缺口（已核对，只读不改源码）：`tourTooltipViewportBounds` 不做入参校验，
    // 缺字段直接产出 NaN；而 `NaN > NaN` 为 false，于是两轴的「不夹取」分支被误触发，
    // 函数既不抛错也不返回 null，而是**静默返回一个恒为零的位移**。
    // 好处是调用方（hook）无脑写上去也不会产生坏坐标；代价是 NaN 来源被完全掩盖。
    // 本条把这一现状钉成契约，任何将来的防御性改动（抛错 / 返回 null）都会在此转红。
    const bounds = tourTooltipViewportBounds({} as unknown as TourTooltipViewport);
    expect(Number.isNaN(bounds.top)).toBe(true);
    expect(Number.isNaN(bounds.left)).toBe(true);
    expect(Number.isNaN(bounds.right)).toBe(true);
    expect(Number.isNaN(bounds.bottom)).toBe(true);

    const bubble = measure(700, 900, 360, 200);
    expect(clampTourTooltipOffset(bubble, bounds)).toEqual({ x: 0, y: 0 });
  });

  test("只缺一个尺寸字段 → 视口不可用，返回 null", () => {
    // 既有 `tourViewportClamp.test.ts` 只覆盖「两个字段都 undefined / 都为 0」，
    // 那种输入无论删掉哪一半守卫都仍会被另一半挡住。这里只缺一半，才钉得住具体那半句。
    const onlyWidth = { innerWidth: 1280 } as unknown as Window;
    expect(readTourTooltipViewport(onlyWidth)).toBeNull();

    const onlyHeight = { innerHeight: 800 } as unknown as Window;
    expect(readTourTooltipViewport(onlyHeight)).toBeNull();

    // 负尺寸：取值空间里合法可出现的边界值，同样按「不可用」处理。
    const negativeWidth = { innerWidth: -1280, innerHeight: 800 } as unknown as Window;
    expect(readTourTooltipViewport(negativeWidth)).toBeNull();
    const negativeHeight = { innerWidth: 1280, innerHeight: -800 } as unknown as Window;
    expect(readTourTooltipViewport(negativeHeight)).toBeNull();
  });

  test("visualViewport 只有一轴为 0 → 整块作废、回落 window.inner*", () => {
    // 既有用例给的是 width 与 height 同为 0，删掉 `&& visualViewport.height > 0` 仍会绿；
    // 单轴为 0 才能区分 `&&` 的两半。
    const zeroHeightOnly = {
      innerWidth: 1280,
      innerHeight: 800,
      visualViewport: { offsetTop: 40, offsetLeft: 10, width: 900, height: 0 }
    } as unknown as Window;
    expect(readTourTooltipViewport(zeroHeightOnly)).toEqual({
      offsetTop: 0,
      offsetLeft: 0,
      width: 1280,
      height: 800
    });

    const zeroWidthOnly = {
      innerWidth: 1280,
      innerHeight: 800,
      visualViewport: { offsetTop: 40, offsetLeft: 10, width: 0, height: 600 }
    } as unknown as Window;
    expect(readTourTooltipViewport(zeroWidthOnly)).toEqual({
      offsetTop: 0,
      offsetLeft: 0,
      width: 1280,
      height: 800
    });
  });

  test("visualViewport 的负 offset 原样透传，不被清零或取绝对值", () => {
    const negativeOffsets = {
      innerWidth: 1280,
      innerHeight: 800,
      visualViewport: { offsetTop: -40, offsetLeft: -10, width: 900, height: 600 }
    } as unknown as Window;
    expect(readTourTooltipViewport(negativeOffsets)).toEqual({
      offsetTop: -40,
      offsetLeft: -10,
      width: 900,
      height: 600
    });
  });
});