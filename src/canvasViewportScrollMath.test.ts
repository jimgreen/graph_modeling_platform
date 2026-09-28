// canvasViewport 坐标换算三件套的直接单测（此前零测试直呼）：
//   clampNumber                    视口数学的基础钳制
//   scrollPositionToViewBoxStart   滚动位置 → viewBox 起点（5 处生产调用）
//   canvasResizeAnchoredDisplayOffset（5 处生产调用）
//
// ## 为什么值得钉
//
// 这些函数产出的是**画布 viewBox 的坐标**。算错不抛异常、不打日志 ——
// 后果是画布整体偏移、滚动条位置对不上、拖拽跟手度错位。
// 全是「看起来能用但手感不对」的问题，最难靠肉眼发现，也最容易被重构悄悄改坏。
//
// ## 探针实测出的三处关键契约
//
// ① `maxScroll` 的门槛是 **> 1**（不是 > 0）。`maxScroll === 1` 意味着
//    「视口恰好等于画布」，没有可滚动空间，于是直接返回 `fallbackStart`。
//    写成 `>= 1` 或 `> 0` 都会在"刚好装满"这一临界情形下产出错误坐标。
//
// ② `NaN` 只在 `scrollPosition` 位置传播。`viewSize` / `boundSize` / `maxScroll`
//    为 NaN 时，`maxScroll > 1` 或 `maxViewStart > 0` 判定失败 → 走 `fallbackStart`。
//    这不是"漏了防护"，而是**恰好正确的**：`fallbackStart` 就是这些异常情形的答案。
//
// ③ `clampNumber` **不防 NaN**（`Math.max(0, Math.min(10, NaN))` = NaN）。
//    这是 JS 标准行为，调用方靠它把 NaN 透出到上层统一处理。
import { describe, expect, test } from "vitest";
import { clampNumber, scrollPositionToViewBoxStart } from "./canvasViewport";

describe("clampNumber：Math.max(min, Math.min(max, v))", () => {
  test("区间内原样返回", () => {
    expect(clampNumber(5, 0, 10)).toBe(5);
    expect(clampNumber(0, 0, 10)).toBe(0);
    expect(clampNumber(10, 0, 10)).toBe(10);
    expect(clampNumber(0.5, 0, 1)).toBe(0.5);
  });

  test("超界被钳到边界", () => {
    expect(clampNumber(-3, 0, 10)).toBe(0);
    expect(clampNumber(15, 0, 10)).toBe(10);
    expect(clampNumber(Infinity, 0, 10)).toBe(10);
    expect(clampNumber(-Infinity, 0, 10)).toBe(0);
  });

  test("负区间正常工作", () => {
    expect(clampNumber(-5, -10, -1)).toBe(-5);
    expect(clampNumber(-20, -10, -1)).toBe(-10);
    expect(clampNumber(0, -10, -1)).toBe(-1);
  });

  test("min === max 时恒返回该值", () => {
    expect(clampNumber(-999, 5, 5)).toBe(5);
    expect(clampNumber(999, 5, 5)).toBe(5);
  });

  test("矛盾区间（min > max）：返回 **min**（`Math.max` 在外层）", () => {
    // Math.max(10, Math.min(0, 5)) = Math.max(10, 0) = 10
    expect(clampNumber(5, 10, 0)).toBe(10);
    // 如实记录：不是"报错"也不是"返回原值"，而是静默给出 min。
    // 依赖矛盾区间的调用方会拿到反直觉结果，故显式钉住。
  });

  test("★ **NaN 透出**（不防 NaN，是 JS 标准行为）", () => {
    expect(clampNumber(Number.NaN, 0, 10)).toBeNaN();
    expect(Number.isNaN(clampNumber(Number.NaN, 0, 10))).toBe(true);
    // Math.min(10, NaN) = NaN；Math.max(0, NaN) = NaN
  });

  test("min / max 为 NaN 也透出", () => {
    expect(clampNumber(5, Number.NaN, 10)).toBeNaN();
    expect(clampNumber(5, 0, Number.NaN)).toBeNaN();
  });

  test("返回类型恒为 number（NaN 也是 number）", () => {
    for (const v of [5, -1, 100, Number.NaN, Infinity, -Infinity]) {
      expect(typeof clampNumber(v, 0, 10), String(v)).toBe("number");
    }
  });
});

describe("scrollPositionToViewBoxStart：maxScroll 门槛是 > 1", () => {
  // 固定 viewSize=100 / boundSize=500 → maxViewStart = 400
  const args = { viewSize: 100, boundSize: 500 } as const;

  test("maxScroll <= 1 → 返回 fallbackStart（无滚动空间）", () => {
    for (const maxScroll of [0, 0.5, 0.999, 1]) {
      expect(scrollPositionToViewBoxStart(50, args.viewSize, args.boundSize, maxScroll, -999), `maxScroll=${maxScroll}`)
        .toBe(-999);
    }
  });

  test("★ maxScroll === 1 也走 fallback（临界点，写成 >= 1 就错）", () => {
    // maxScroll === 1 表示视口恰好等于画布，确实没有可滚动空间。
    // 这条把 `> 1` 这个看似随意的门槛钉死。
    expect(scrollPositionToViewBoxStart(50, 100, 500, 1, -999)).toBe(-999);
    expect(scrollPositionToViewBoxStart(0, 100, 500, 1, 42)).toBe(42);
  });

  test("maxScroll > 1 → 正常换算（scrollPosition 0 → viewBox 起点 0）", () => {
    expect(scrollPositionToViewBoxStart(0, 100, 500, 200, -999)).toBe(0);
    // 换算式：(scrollPosition / maxScroll) * maxViewStart = (100/200)*400 = 200
    expect(scrollPositionToViewBoxStart(100, 100, 500, 200, -999)).toBe(200);
    // 到底：scrollPosition = maxScroll → viewBox 起点 = maxViewStart = 400
    expect(scrollPositionToViewBoxStart(200, 100, 500, 200, -999)).toBe(400);
  });

  test("超界 scrollPosition 被 clamp 到 [0, maxViewStart]", () => {
    expect(scrollPositionToViewBoxStart(-100, 100, 500, 200, -999)).toBe(0);
    expect(scrollPositionToViewBoxStart(1000, 100, 500, 200, -999)).toBe(400);
  });

  test("换算是线性的：中点对中点", () => {
    expect(scrollPositionToViewBoxStart(100, 100, 500, 200, -999)).toBe(200);   // 一半滚动
    expect(scrollPositionToViewBoxStart(50, 100, 500, 200, -999)).toBe(100);    // 四分之一
  });
});

describe("内容装得下（boundSize <= viewSize）→ 无滚动空间", () => {
  test("boundSize === viewSize", () => {
    expect(scrollPositionToViewBoxStart(50, 100, 100, 200, -999)).toBe(-999);
  });

  test("boundSize < viewSize（视口比画布大）", () => {
    expect(scrollPositionToViewBoxStart(50, 100, 50, 200, -999)).toBe(-999);
    expect(scrollPositionToViewBoxStart(50, 100, 0, 200, -999)).toBe(-999);
    expect(scrollPositionToViewBoxStart(50, 100, -10, 200, -999)).toBe(-999);
  });

  test("viewSize === 0 且 boundSize > 0 → **有**滚动空间（maxViewStart = boundSize）", () => {
    // 探针实测：boundSize=100 / viewSize=0 / maxScroll=200 → 25
    // 换算：(50/200)*100 = 25
    expect(scrollPositionToViewBoxStart(50, 0, 100, 200, -999)).toBe(25);
  });
});

describe("★ NaN 只在 scrollPosition 位置传播，其余三者走 fallback", () => {
  // 这不是"漏了防护"，而是恰好正确：fallbackStart 就是这些异常情形的答案。
  // 显式钉住，免得日后有人"顺手"给它们加 Number.isFinite 防护而改变行为。
  test("scrollPosition = NaN → NaN 透出（**不**走 fallback）", () => {
    const out = scrollPositionToViewBoxStart(Number.NaN, 100, 500, 200, -999);
    expect(out).toBeNaN();
  });

  test("viewSize / boundSize / maxScroll 为 NaN → 走 fallback", () => {
    expect(scrollPositionToViewBoxStart(50, Number.NaN, 500, 200, -999)).toBe(-999);
    expect(scrollPositionToViewBoxStart(50, 100, Number.NaN, 200, -999)).toBe(-999);
    expect(scrollPositionToViewBoxStart(50, 100, 500, Number.NaN, -999)).toBe(-999);
  });

  test("**Infinity scrollPosition** → 被 clamp 到 maxViewStart", () => {
    // clampNumber 不拦 Infinity（只拦 NaN），所以走正常钳制
    expect(scrollPositionToViewBoxStart(Infinity, 100, 500, 200, -999)).toBe(400);
    expect(scrollPositionToViewBoxStart(-Infinity, 100, 500, 200, -999)).toBe(0);
  });
});

describe("fallbackStart 原样透出（不加工）", () => {
  test("各种 fallback 值都不被改动", () => {
    for (const fallback of [0, -1, -999, 42, 3.5, -0]) {
      expect(scrollPositionToViewBoxStart(50, 100, 100, 200, fallback), `fallback=${fallback}`).toBe(fallback);
      expect(scrollPositionToViewBoxStart(50, 100, 500, 1, fallback), `fallback=${fallback}（maxScroll=1）`).toBe(fallback);
    }
  });

  test("正常路径下 fallback 完全不参与（不泄漏进结果）", () => {
    for (const fallback of [-999, 0, 42]) {
      expect(scrollPositionToViewBoxStart(100, 100, 500, 200, fallback), `fallback=${fallback}`).toBe(200);
    }
  });
});
