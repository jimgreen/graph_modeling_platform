import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import {
  TOUR_TOOLTIP_VIEWPORT_MARGIN,
  clampTourTooltipOffset,
  isZeroTourTooltipOffset,
  readTourTooltipViewport,
  tourTooltipTransform,
  tourTooltipViewportBounds
} from "./tourViewportClamp";

// 视口 1280×800、无缩放；边界 = 12px 安全边距 → {top:12,left:12,right:1268,bottom:788}
const VIEWPORT = { offsetTop: 0, offsetLeft: 0, width: 1280, height: 800 };
const BOUNDS = tourTooltipViewportBounds(VIEWPORT);

describe("tourTooltipViewportBounds", () => {
  test("在视口四周各让出 12px 安全边距", () => {
    expect(BOUNDS).toEqual({ top: 12, left: 12, right: 1268, bottom: 788 });
  });

  test("安全边距常量与 CSS 的 calc(100vh - 24px) 同口径（2 × margin）", () => {
    expect(TOUR_TOOLTIP_VIEWPORT_MARGIN * 2).toBe(24);
    const css = readFileSync(new URL("./styles.css", import.meta.url), "utf8");
    expect(css).toContain("max-height: calc(100vh - 24px)");
  });

  test("带 offset 的视觉视口（页面被缩放 / 软键盘）会平移边界", () => {
    const bounds = tourTooltipViewportBounds({
      offsetTop: 100,
      offsetLeft: 50,
      width: 400,
      height: 300
    });
    expect(bounds).toEqual({ top: 112, left: 62, right: 438, bottom: 388 });
  });
});

describe("clampTourTooltipOffset", () => {
  const rect = (top: number, left: number, width = 360, height = 200) => ({
    top,
    left,
    width,
    height
  });

  test("完全在界内 → 精确的零位移（不写无意义的 transform）", () => {
    expect(clampTourTooltipOffset(rect(300, 400), BOUNDS)).toEqual({ x: 0, y: 0 });
  });

  test("右侧越界 → 向左推，右边缘刚好贴住边界", () => {
    const offset = clampTourTooltipOffset(rect(300, 1200), BOUNDS);
    expect(offset).toEqual({ x: 1268 - (1200 + 360), y: 0 });
    expect(1200 + 360 + offset.x).toBe(BOUNDS.right);
  });

  test("左侧越界（负 left）→ 向右推，左边缘贴住边界", () => {
    const offset = clampTourTooltipOffset(rect(300, -80), BOUNDS);
    expect(offset).toEqual({ x: 12 - -80, y: 0 });
    expect(-80 + offset.x).toBe(BOUNDS.left);
  });

  test("下方越界 → 向上推，下边缘贴住边界", () => {
    const offset = clampTourTooltipOffset(rect(700, 400), BOUNDS);
    expect(offset).toEqual({ x: 0, y: 788 - (700 + 200) });
    expect(700 + 200 + offset.y).toBe(BOUNDS.bottom);
  });

  test("上方越界（负 top）→ 向下推，上边缘贴住边界", () => {
    const offset = clampTourTooltipOffset(rect(-60, 400), BOUNDS);
    expect(offset).toEqual({ x: 0, y: 12 - -60 });
    expect(-60 + offset.y).toBe(BOUNDS.top);
  });

  test("只夹超出的一侧：贴顶时不会同时被下边界推回去", () => {
    // top=-60 时 rect 的下边缘在界内，夹取结果必须是非负（只往下推）。
    const offset = clampTourTooltipOffset(rect(-60, 400), BOUNDS);
    expect(offset.y).toBeGreaterThan(0);
    expect(offset.x).toBe(0);
  });

  test("盒子比可视区域还宽时不夹取（硬夹只会把气泡推离目标）", () => {
    const wide = { top: 300, left: -200, width: 2000, height: 200 };
    expect(clampTourTooltipOffset(wide, BOUNDS)).toEqual({ x: 0, y: 0 });
  });

  test("盒子比可视区域还高时不夹取", () => {
    const tall = { top: -100, left: 400, width: 360, height: 1200 };
    expect(clampTourTooltipOffset(tall, BOUNDS)).toEqual({ x: 0, y: 0 });
  });

  test("极端：气泡刚好等于可视区域宽度 → 不夹取（maxX === minX）", () => {
    const exact = { top: 300, left: 0, width: BOUNDS.right - BOUNDS.left, height: 200 };
    expect(clampTourTooltipOffset(exact, BOUNDS)).toEqual({ x: 0, y: 0 });
  });

  test("窄窗口（375×667，移动端）下气泡宽度小于可用宽度时仍能压回界内", () => {
    const bounds = tourTooltipViewportBounds({
      offsetTop: 0,
      offsetLeft: 0,
      width: 375,
      height: 667
    });
    // 可用宽度 = 375 - 24 = 351；这里气泡略窄一点，横向仍有余量可夹取。
    const bubble = { top: 600, left: 300, width: 330, height: 180 };
    const offset = clampTourTooltipOffset(bubble, bounds);
    expect(bubble.left + offset.x).toBeGreaterThanOrEqual(bounds.left);
    expect(bubble.left + bubble.width + offset.x).toBeLessThanOrEqual(bounds.right);
    expect(bubble.left + bubble.width + offset.x).toBe(bounds.right);
    // 高度 180 < 643，纵向能完整放下。
    expect(bubble.top + offset.y).toBeGreaterThanOrEqual(bounds.top);
    expect(bubble.top + bubble.height + offset.y).toBeLessThanOrEqual(bounds.bottom);
  });

  test("气泡宽度恰好等于可用宽度时横向不夹取（只有唯一合法位置，坐标由 floating-ui 决定）", () => {
    // `maxX === minX` 的退化情形：此时 `clampTourTooltipOffset` 返回 x = 0，
    // 因为左右两侧都没有可移动的余量。真实链路上这一档由 CSS 的 max-width 保证：
    // 宽度贴合可用宽度时 bubble.left 与 bounds.left 天然一致。
    const bounds = tourTooltipViewportBounds({
      offsetTop: 0,
      offsetLeft: 0,
      width: 375,
      height: 667
    });
    const exactFit = { top: 300, left: bounds.left, width: 351, height: 180 };
    expect(clampTourTooltipOffset(exactFit, bounds)).toEqual({ x: 0, y: 0 });
  });
});

describe("tourTooltipTransform", () => {
  test("零位移返回 null（调用方省略内联 transform，保留 CSS 入场动画）", () => {
    expect(tourTooltipTransform({ x: 0, y: 0 })).toBeNull();
    expect(isZeroTourTooltipOffset({ x: 0, y: -0 })).toBe(true);
  });

  test("非零位移生成 translate3d", () => {
    expect(tourTooltipTransform({ x: -20, y: 36 })).toBe("translate3d(-20px, 36px, 0)");
  });
});

describe("readTourTooltipViewport", () => {
  test("window 不可用（node 环境）→ null，调用方跳过夹取", () => {
    expect(readTourTooltipViewport(null)).toBeNull();
  });

  test("优先使用 visualViewport（软键盘 / 缩放下才准确）", () => {
    const fake = {
      innerWidth: 1280,
      innerHeight: 800,
      visualViewport: { offsetTop: 40, offsetLeft: 10, width: 900, height: 600 }
    } as unknown as Window;
    expect(readTourTooltipViewport(fake)).toEqual({
      offsetTop: 40,
      offsetLeft: 10,
      width: 900,
      height: 600
    });
  });

  test("visualViewport 尺寸为 0（未就绪）时回落到 window.inner*", () => {
    const fake = {
      innerWidth: 1280,
      innerHeight: 800,
      visualViewport: { offsetTop: 0, offsetLeft: 0, width: 0, height: 0 }
    } as unknown as Window;
    expect(readTourTooltipViewport(fake)).toEqual({
      offsetTop: 0,
      offsetLeft: 0,
      width: 1280,
      height: 800
    });
  });

  test("两者都拿不到尺寸 → null", () => {
    const fake = { innerWidth: 0, innerHeight: 0 } as unknown as Window;
    expect(readTourTooltipViewport(fake)).toBeNull();
  });
});

// ---------- 装配契约（源码扫描）----------
//
// 夹取依赖「包装层 + hook + CSS」三处装配，任一断裂都会静默失效：
// 没有包装层 → 没有可施加位移的元素；没有 hook → 不求解；没有 CSS → 包装层可能被
// 尺寸约束拉宽导致量测口径错误。组件渲染边界在 node 环境下测不出来，用源码扫描钉住
// （仓库先例：windowCloseCoverage.test.ts、appTour.test.ts 的 wiring describe）。

describe("tour tooltip viewport clamp wiring (source contract)", () => {
  const readSource = (relativePath: string) =>
    readFileSync(new URL(relativePath, import.meta.url), "utf8");

  test("TourTooltip 用包装层承载位移，而不是直接放在 .tour-tooltip 上", () => {
    const source = readSource("./appTour.tsx");
    expect(source).toContain("useTourTooltipViewportClamp");
    expect(source).toContain('className="tour-tooltip-floater"');
    expect(source).toContain("ref={clamp.clampRef}");
    expect(source).toContain("style={clamp.shiftStyle ?? undefined}");
    // 位移必须写在包装层上：写在 .tour-tooltip 自身会因内联 transform 优先级高于
    // keyframes 而压掉入场动画。
    const floaterIndex = source.indexOf('className="tour-tooltip-floater"');
    const tooltipIndex = source.indexOf('className="tour-tooltip"', floaterIndex);
    expect(floaterIndex).toBeGreaterThanOrEqual(0);
    expect(tooltipIndex).toBeGreaterThan(floaterIndex);
  });

  test("resetKey 用当前步骤索引，换步时重新求解", () => {
    const source = readSource("./appTour.tsx");
    expect(source).toContain("useTourTooltipViewportClamp(index)");
  });

  test("styles.css 定义了包装层，且不引入尺寸约束", () => {
    const css = readSource("./styles.css");
    const start = css.indexOf(".tour-tooltip-floater");
    expect(start).toBeGreaterThanOrEqual(0);
    const block = css.slice(start, css.indexOf("}", start));
    expect(block).toContain("transform-origin: left top");
    expect(block).toContain("will-change: transform");
    // 包装层一旦有 padding / border / 固定宽高，量到的 rect 就不再等于气泡的 rect。
    expect(block).not.toContain("padding");
    expect(block).not.toContain("border");
    expect(block).not.toContain("width");
    expect(block).not.toContain("height");
  });

  test("styles.css 给 .tour-tooltip 加了竖向滚动兜底", () => {
    const css = readSource("./styles.css");
    const start = css.indexOf(".tour-tooltip {");
    expect(start).toBeGreaterThanOrEqual(0);
    const block = css.slice(start, css.indexOf("}", start));
    expect(block).toContain("max-height: calc(100vh - 24px)");
    expect(block).toContain("overflow-y: auto");
  });
});
