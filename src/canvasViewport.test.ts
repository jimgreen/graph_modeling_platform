import { describe, expect, test } from "vitest";
import type { CanvasResizeEdge } from "./canvasViewport";
import {
  atLeastOneNumber,
  canvasBoundsChangeIsMeaningful,
  canvasBoundsScrollSyncTarget,
  canvasFitAvailableWidth,
  canvasFitCenterOffsetX,
  canvasFitPanelInset,
  canvasFrameScrollIsUserDriven,
  canvasFrameScrollTargetForViewBox,
  clampCanvasNoScrollOffset,
  canvasOuterInset,
  canvasRenderViewBoxAfterBoundsDraft,
  canvasResizeAnchoredDisplayOffset,
  canvasResizeEdgeAnchorsStart,
  canvasResizeKeepsScrollRange,
  canvasResizePreviewRectForDraft,
  canvasResizeScrollTargetForCommitAnchor,
  canvasRulerTicks,
  canvasScrollSyncShouldRun,
  canvasVisualRectScrollTarget,
  canvasViewBoxFromFrameScrollPosition,
  CANVAS_FRAME_INSET,
  CANVAS_RULER_SIZE,
  viewBoxAfterCanvasBoundsChange
} from "./canvasViewport";

// 模板尺寸兜底：0 / NaN / 缺值退回 fallback，负值被 max(1) 抬回 1。
// 它决定图元导出的画布边幅（device-template-icon 的 padding 计算也走它），
// 判错的后果是导出的 SVG 里出现 width="0" 或非有限值 —— 浏览器静默忽略、不报错。
describe("atLeastOneNumber", () => {
  test("零值（0 / \"0\" / null / false / 空串 / 空数组）一律走 fallback", () => {
    // Number(null) 与 Number(false) 与 Number("") 与 Number([]) 全是 0，不是 NaN
    expect(atLeastOneNumber(0)).toBe(1);
    expect(atLeastOneNumber("0")).toBe(1);
    expect(atLeastOneNumber(null)).toBe(1);
    expect(atLeastOneNumber(false)).toBe(1);
    expect(atLeastOneNumber("")).toBe(1);
    expect(atLeastOneNumber([])).toBe(1);
    expect(atLeastOneNumber(0, 104)).toBe(104);
    expect(atLeastOneNumber(null, 104)).toBe(104);
  });

  test("非数值（NaN / undefined / \"abc\"）走 fallback", () => {
    expect(atLeastOneNumber(undefined)).toBe(1);
    expect(atLeastOneNumber("abc")).toBe(1);
    expect(atLeastOneNumber(Number.NaN)).toBe(1);
    expect(atLeastOneNumber(Number.NaN, 64)).toBe(64);
  });

  test("0 < 值 < 1 的小数被抬到 1（不返回 0.4 这种会让下游除出小数尺寸的值）", () => {
    expect(atLeastOneNumber(0.4)).toBe(1);
    expect(atLeastOneNumber(0.999)).toBe(1);
  });

  test("负数被抬到 1", () => {
    expect(atLeastOneNumber(-5)).toBe(1);
    expect(atLeastOneNumber(-0.001)).toBe(1);
  });

  test("正值原样透传（含字符串数值与小数）", () => {
    expect(atLeastOneNumber(1)).toBe(1);
    expect(atLeastOneNumber(104)).toBe(104);
    expect(atLeastOneNumber("2.5")).toBe(2.5);
    expect(atLeastOneNumber(63.75)).toBe(63.75);
  });

  test("±Infinity 不当缺值处理：+∞ 原样保留，-∞ 被 max(1) 抬回", () => {
    // 注释里写的等价式是 `Math.max(1, Number(value) || fallback)`；
    // Infinity 是 truthy，故不走 fallback —— 本条把这个刻意的选择钉住。
    expect(atLeastOneNumber(Number.POSITIVE_INFINITY)).toBe(Number.POSITIVE_INFINITY);
    expect(atLeastOneNumber(Number.NEGATIVE_INFINITY)).toBe(1);
    // 对照：换成 `||` 的朴素写法，+Infinity 也保得住，两者在这里不冲突
    expect(Math.max(1, Number(Number.POSITIVE_INFINITY) || 1)).toBe(Number.POSITIVE_INFINITY);
  });

  test("与 `Math.max(1, Number(value) || fallback)` 逐例等价（穷举常用输入）", () => {
    // 实现注释声称逐字等价。逐例对拍而不是抽查，是为了让日后有人改成
    // `Number.isFinite` 判据时立刻看到差异（本函数刻意**不**拦 Infinity）。
    const reference = (value: unknown, fallback = 1) =>
      Math.max(1, Number(value) || fallback);
    for (const value of [0, 1, 0.4, -5, 104, "2.5", "abc", "", null, undefined, false, true, []]) {
      expect(atLeastOneNumber(value), JSON.stringify(value ?? null)).toBe(reference(value));
    }
  });
});

// 适配视图（fit）的可用区域：左右面板是浮动层，画布区占满工作区，
// 所以可用宽必须扣掉可见面板宽度，每侧另留 20px 边距。
describe("canvas fit available area", () => {
  test("每侧让位 = max(面板宽 + 20, 20)", () => {
    expect(canvasFitPanelInset(288)).toBe(308);
    expect(canvasFitPanelInset(320)).toBe(340);
    // 面板隐藏（读不到宽度）时退化为 20px 边距
    expect(canvasFitPanelInset(0)).toBe(20);
  });

  test("可用宽 = 画布区宽 - 两侧让位，最小 1", () => {
    expect(canvasFitAvailableWidth(1920, { left: 308, right: 340 })).toBe(1272);
    expect(canvasFitAvailableWidth(1920, { left: 20, right: 20 })).toBe(1880);
    expect(canvasFitAvailableWidth(100, { left: 308, right: 340 })).toBe(1);
  });

  test("居中偏移把画布拉回可用区（左右面板不等宽时不偏）", () => {
    // 右面板更宽 32px → 画布相对画布区正中左移 16px
    expect(canvasFitCenterOffsetX({ left: 308, right: 340 })).toBe(-16);
    expect(canvasFitCenterOffsetX({ left: 340, right: 308 })).toBe(16);
    expect(canvasFitCenterOffsetX({ left: 20, right: 20 })).toBe(0);
  });
});

// 画布外围刻度尺：大刻度 25 单位（对齐底图大网格）、小刻度 5 单位（细网格）
describe("canvas ruler ticks", () => {
  test("取区间内 unit 的整数倍，含落在区间内的首尾", () => {
    expect(canvasRulerTicks(0, 50, 25)).toEqual([0, 25, 50]);
    expect(canvasRulerTicks(10, 60, 25)).toEqual([25, 50]);
    expect(canvasRulerTicks(30, 40, 25)).toEqual([]);
    expect(canvasRulerTicks(-30, 10, 25)).toEqual([-25, 0]);
  });

  test("非法参数返回空数组（避免死循环）", () => {
    expect(canvasRulerTicks(0, 100, 0)).toEqual([]);
    expect(canvasRulerTicks(0, 100, -5)).toEqual([]);
    expect(canvasRulerTicks(100, 0, 25)).toEqual([]);
  });

  test("外沿留白含尺子厚度，保证四边尺子有地方站", () => {
    expect(CANVAS_RULER_SIZE).toBeGreaterThan(0);
    expect(canvasOuterInset()).toBe(CANVAS_FRAME_INSET + CANVAS_RULER_SIZE);
    expect(canvasOuterInset()).toBeGreaterThan(CANVAS_FRAME_INSET);
  });
});

// 刻度生成的可终止性守卫。修复前的实现是
//   `for (let value = start; value <= to; value += unit)`
// 它只挡了 unit <= 0 与 to < from，两种输入能让 `value += unit` 不再改变 value：
//   · 端点是 ±Infinity（`value + Infinity` / `-Infinity + 25` 都不推进）
//   · 端点有限但尺度超出可表示步进（1e21 处的 ULP 已是 262144 ≫ unit 25）
// 后果不是抛错而是**界面卡死**：canvasRulerTicks 被画布每帧调用，一次死循环
// 整个 tab 就没救了。
//
// ⚠ 不要为了「证明修复前会挂」而真的跑旧实现：那是同步死循环，vitest 的
// testTimeout 也救不了（事件循环被占住，计时器根本不跑），只会挂死整个
// worker、几分钟出不来结果。下面的注释只写**推演轨迹**，不断言运行时长。
describe("canvas ruler ticks：病态端点必须立刻返回（死循环守卫）", () => {
  test("★ 区间跨 ±Infinity：返回空数组，且在有限时间内返回", () => {
    // 修复前推演：start = Math.ceil(-Infinity/25)*25 = -Infinity；
    // `-Infinity <= Infinity` 恒真 → push(-Infinity)；`-Infinity + 25 === -Infinity`
    // → value 永不改变 → 永不退出。
    const startedAt = Date.now();
    const ticks = canvasRulerTicks(Number.NEGATIVE_INFINITY, Number.POSITIVE_INFINITY, 25);
    const elapsedMs = Date.now() - startedAt;

    expect(ticks).toEqual([]);
    // 时间上界给得很宽（真正该拦住的是永不返回），只为钉住「不是慢，是不返回」
    expect(elapsedMs).toBeLessThan(5_000);
  });

  test("★ 只有单侧是 ±Infinity 也返回空数组（另一侧有限也不行）", () => {
    // 修复前推演：start = ±Infinity，`value <= to` 恒真，`value + unit` 不推进 → 死循环
    expect(canvasRulerTicks(Number.NEGATIVE_INFINITY, 100, 25)).toEqual([]);
    expect(canvasRulerTicks(0, Number.POSITIVE_INFINITY, 25)).toEqual([]);
  });

  test("★ to = 1e21：步进不再改变 value，只产出首个刻度就中止", () => {
    // 1e21 附近的 ULP 是 262144，远大于 unit 25，故 `1e21 + 25 === 1e21`。
    // from 取 1e21-10 只是为了让区间看起来像个真区间 —— `1e21 - 10` 同样被舍回 1e21，
    // 于是 start 落在 1e21 上，是唯一能触到「不推进」那条路径的入口。
    // 修复前推演：push(1e21) 之后 `1e21 + 25 === 1e21`，`value <= to` 恒真 → 死循环。
    expect(1e21 + 25).toBe(1e21);
    expect(canvasRulerTicks(1e21 - 10, 1e21, 25)).toEqual([1e21]);
  });

  test("★ from = 1e21 且 to = 1e21 + 10：加 10 在该尺度被舍掉，等价零宽区间", () => {
    // 前置事实：`1e21 + 10 === 1e21`，所以这实际是 [1e21, 1e21] 的零宽区间。
    // 零宽区间本该只产出一个刻度；修复前因为 `value += unit` 不推进而挂死。
    expect(1e21 + 10).toBe(1e21);
    expect(canvasRulerTicks(1e21, 1e21 + 10, 25)).toEqual([1e21]);
  });

  test("★ 区间极大但每轮都在前进：靠刻数上限终止（0..1e21 / unit 25 要跑 4e19 轮）", () => {
    // 这一条与上面两条是不同的失效形态：value 每轮都在 +25，循环「会」终止，
    // 但要跑 4e19 轮 —— 对界面与死循环是同一后果（卡死），靠可终止性守卫②③
    // 拦不住，只能靠刻数上限。
    const ticks = canvasRulerTicks(0, 1e21, 25);

    expect(ticks.length).toBe(1_000_000);
    expect(ticks[0]).toBe(0);
    expect(ticks[1]).toBe(25);
  });

  test("★ from / to 均为 NaN：走不了 to >= from 的比较，返回空数组", () => {
    // 修复前就靠 `to >= from` 挡住了（NaN 的任何比较都是 false），此处钉住该行为：
    // NaN 端点不是「漏了防护」，答案本就是空数组。
    expect(canvasRulerTicks(Number.NaN, Number.NaN, 25)).toEqual([]);
    // 单侧 NaN 同理：NaN >= x 与 x >= NaN 都是 false
    expect(canvasRulerTicks(Number.NaN, 100, 25)).toEqual([]);
    expect(canvasRulerTicks(0, Number.NaN, 25)).toEqual([]);
  });
});

// 死循环守卫是「只在病态输入上生效」的：正常有限区间的刻度序列必须逐项不变。
// 上面的 describe 已覆盖 0..50 / 10..60 / 30..40 / -30..10，这里补的是
// 「大但仍正常」的那一侧 —— 从 1e6 起算时 ULP 已经很小，步进照常，
// 顺带证明守卫没有把大坐标区间误判成病态。
describe("canvas ruler ticks：正常有限区间的序列不受守卫影响", () => {
  test("常规区间（含 0..100）逐项与修复前一致", () => {
    expect(canvasRulerTicks(0, 100, 25)).toEqual([0, 25, 50, 75, 100]);
    expect(canvasRulerTicks(0, 100, 5)).toEqual([0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100]);
  });

  test("大坐标但仍正常的区间（1e6 起 100 宽）：步进正常、序列不截断", () => {
    expect(canvasRulerTicks(1e6, 1e6 + 100, 25)).toEqual([
      1000000, 1000025, 1000050, 1000075, 1000100
    ]);
    // 负方向同理（Math.ceil 向 -Infinity 取整，首个刻度在 from 之内）
    expect(canvasRulerTicks(-1e6, -1e6 + 100, 25)).toEqual([
      -1000000, -999975, -999950, -999925, -999900
    ]);
  });

  test("区间边界截断行为不变：首刻度在 from 之内、末刻度不超过 to", () => {
    // from 不是 unit 的整数倍时向上取整，to 不是整数倍时丢弃末刻度
    expect(canvasRulerTicks(-1e6 - 3, -1e6 + 7, 25)).toEqual([-1000000]);
    expect(canvasRulerTicks(1e6 + 1, 1e6 + 49, 25)).toEqual([1000025]);
  });
});

describe("canvas viewport bounds changes", () => {
  test("preserves free-drag overflow offsets while canvas scrollbars are active", () => {
    expect(clampCanvasNoScrollOffset(120, 1800, 800, 270, true)).toBe(120);
    expect(clampCanvasNoScrollOffset(-80, 1800, 800, 270, true)).toBe(-80);
  });

  test("preserves the visible viewport when the canvas auto-expands downward or rightward", () => {
    const current = { x: 120, y: 620, width: 800, height: 600 };

    const next = viewBoxAfterCanvasBoundsChange(
      current,
      { width: 1200, height: 1400 }
    );

    expect(next).toEqual(current);
  });

  test("does not push the viewport origin when the canvas expands below the current view", () => {
    const next = viewBoxAfterCanvasBoundsChange(
      { x: 0, y: 0, width: 1200, height: 1000 },
      { width: 1200, height: 1400 },
      { x: 0, y: 0 },
      { width: 1200, height: 1000 }
    );

    expect(next).toEqual({ x: 0, y: 0, width: 1200, height: 1400 });
  });

  test("does not move a top viewport origin when the canvas expands downward away from it", () => {
    const current = { x: 0, y: 0, width: 800, height: 600 };
    const next = viewBoxAfterCanvasBoundsChange(
      current,
      { width: 1200, height: 1400 },
      { x: 0, y: 0 },
      { width: 1200, height: 1000 }
    );

    expect(next).toEqual({ ...current, height: 840 });
  });

  test("keeps the zoom ratio unchanged when the canvas expands down and right", () => {
    const current = { x: 240, y: 180, width: 600, height: 450 };
    const currentBounds = { width: 1200, height: 1000 };
    const nextBounds = { width: 1800, height: 1600 };
    const next = viewBoxAfterCanvasBoundsChange(
      current,
      nextBounds,
      { x: 0, y: 0 },
      currentBounds
    );

    expect(next).toEqual({ x: current.x, y: current.y, width: 900, height: 720 });
    expect(currentBounds.width / current.width).toBe(nextBounds.width / next.width);
    expect(currentBounds.height / current.height).toBe(nextBounds.height / next.height);
  });

  test("skips duplicate canvas bounds applications in one commit batch", () => {
    const currentBounds = { width: 1200, height: 1000 };
    const nextBounds = { width: 1800, height: 1600 };
    const currentViewBox = { x: 240, y: 180, width: 600, height: 450 };

    expect(canvasBoundsChangeIsMeaningful(currentBounds, nextBounds)).toBe(true);
    const once = viewBoxAfterCanvasBoundsChange(currentViewBox, nextBounds, { x: 0, y: 0 }, currentBounds);
    expect(once).toEqual({ x: 240, y: 180, width: 900, height: 720 });

    expect(canvasBoundsChangeIsMeaningful(nextBounds, nextBounds)).toBe(false);
  });

  test("keeps the zoom ratio unchanged while previewing a canvas resize draft", () => {
    const current = { x: 240, y: 180, width: 600, height: 450 };
    const currentBounds = { width: 1200, height: 1000 };
    const nextBounds = { width: 1800, height: 1600 };
    const next = canvasRenderViewBoxAfterBoundsDraft(
      current,
      currentBounds,
      nextBounds
    );

    expect(next).toEqual({ x: current.x, y: current.y, width: 900, height: 720 });
    expect(currentBounds.width / current.width).toBe(nextBounds.width / next.width);
    expect(currentBounds.height / current.height).toBe(nextBounds.height / next.height);
  });

  test("keeps canvas unit screen scale unchanged after resizing the canvas", () => {
    const currentBounds = { width: 1000, height: 800 };
    const current = { x: 100, y: 80, width: 500, height: 400 };
    const nextBounds = { width: 1200, height: 1000 };

    const next = viewBoxAfterCanvasBoundsChange(current, nextBounds, { x: 0, y: 0 }, currentBounds);

    expect(next.width).toBe(600);
    expect(next.height).toBe(500);
    expect(currentBounds.width / current.width).toBe(nextBounds.width / next.width);
    expect(currentBounds.height / current.height).toBe(nextBounds.height / next.height);
  });

  test("shifts the viewport with the canvas origin when expanding left or upward", () => {
    const next = viewBoxAfterCanvasBoundsChange(
      { x: 120, y: 220, width: 800, height: 600 },
      { width: 1250, height: 1080 },
      { x: 50, y: 80 }
    );

    expect(next).toEqual({ x: 170, y: 300, width: 800, height: 600 });
  });

  test("anchors the opposite canvas edge or corner while previewing manual resize", () => {
    const base = {
      startWidth: 1000,
      startHeight: 800,
      startDisplayWidth: 500,
      startDisplayHeight: 400,
      startDisplayOffsetX: 120,
      startDisplayOffsetY: 80
    };
    const initial = {
      left: base.startDisplayOffsetX,
      top: base.startDisplayOffsetY,
      right: base.startDisplayOffsetX + base.startDisplayWidth,
      bottom: base.startDisplayOffsetY + base.startDisplayHeight
    };
    const rectFor = (edge: Parameters<typeof canvasResizePreviewRectForDraft>[0]["edge"], width: number, height: number) =>
      canvasResizePreviewRectForDraft({ ...base, edge }, { width, height });

    const right = rectFor("right", 1200, 800);
    expect(right.left).toBe(initial.left);

    const left = rectFor("left", 1200, 800);
    expect(left.left + left.width).toBe(initial.right);

    const top = rectFor("top", 1000, 900);
    expect(top.top + top.height).toBe(initial.bottom);

    const bottom = rectFor("bottom", 1000, 900);
    expect(bottom.top).toBe(initial.top);

    const topLeft = rectFor("top-left", 1200, 900);
    expect(topLeft.left + topLeft.width).toBe(initial.right);
    expect(topLeft.top + topLeft.height).toBe(initial.bottom);

    const bottomLeft = rectFor("bottom-left", 1200, 900);
    expect(bottomLeft.left + bottomLeft.width).toBe(initial.right);
    expect(bottomLeft.top).toBe(initial.top);

    const bottomRight = rectFor("corner", 1200, 900);
    expect(bottomRight.left).toBe(initial.left);
    expect(bottomRight.top).toBe(initial.top);

    const topRight = rectFor("top-right", 1200, 900);
    expect(topRight.left).toBe(initial.left);
    expect(topRight.top + topRight.height).toBe(initial.bottom);
  });

  test("keeps the committed resize anchor by translating the scroll position after scrollbar transitions", () => {
    const desiredRight = canvasResizeScrollTargetForCommitAnchor({
      edge: "right",
      desiredRect: { left: 63, top: 76, width: 1289, height: 642 },
      currentRect: { left: 455, top: 76, width: 1340, height: 642 },
      currentScrollLeft: 0,
      currentScrollTop: 0,
      maxScrollLeft: 884,
      maxScrollTop: 0
    });
    expect(desiredRight.left).toBe(392);
    expect(desiredRight.top).toBe(0);
    expect(desiredRight.deltaX).toBe(392);
    expect(desiredRight.affectsX).toBe(true);
    expect(desiredRight.affectsY).toBe(false);

    const desiredBottom = canvasResizeScrollTargetForCommitAnchor({
      edge: "bottom",
      desiredRect: { left: 63, top: 76, width: 1241, height: 684 },
      currentRect: { left: 63, top: 284, width: 1241, height: 729 },
      currentScrollLeft: 0,
      currentScrollTop: 0,
      maxScrollLeft: 0,
      maxScrollTop: 503
    });
    expect(desiredBottom.left).toBe(0);
    expect(desiredBottom.top).toBe(208);
    expect(desiredBottom.deltaY).toBe(208);
    expect(desiredBottom.affectsX).toBe(false);
    expect(desiredBottom.affectsY).toBe(true);

    const topLeft = canvasResizeScrollTargetForCommitAnchor({
      edge: "top-left",
      desiredRect: { left: 21, top: 34, width: 1283, height: 684 },
      currentRect: { left: 455, top: 284, width: 1330, height: 729 },
      currentScrollLeft: 0,
      currentScrollTop: 0,
      maxScrollLeft: 900,
      maxScrollTop: 503
    });
    expect(topLeft.left).toBe(481);
    expect(topLeft.top).toBe(295);
    expect(topLeft.affectsX).toBe(true);
    expect(topLeft.affectsY).toBe(true);
  });

  test("keeps the bottom anchored scroll position when the DOM scroll range appears before scrollbar refs catch up", () => {
    const target = canvasFrameScrollTargetForViewBox({
      targetViewBox: { x: 0, y: 400, width: 1200, height: 1000 },
      canvasBounds: { width: 1200, height: 1400 },
      maxScrollLeft: 0,
      maxScrollTop: 360,
      horizontalScrollbarsActive: false,
      verticalScrollbarsActive: false
    });

    expect(target).toEqual({ left: 0, top: 360 });
  });

  test("reads the bottom anchored viewBox from DOM scroll range before scrollbar refs catch up", () => {
    const viewBox = canvasViewBoxFromFrameScrollPosition({
      currentViewBox: { x: 0, y: 0, width: 1200, height: 1000 },
      canvasBounds: { width: 1200, height: 1400 },
      scrollLeft: 0,
      scrollTop: 360,
      maxScrollLeft: 0,
      maxScrollTop: 360,
      horizontalScrollbarsActive: false,
      verticalScrollbarsActive: false
    });

    expect(viewBox).toEqual({ x: 0, y: 400, width: 1200, height: 1000 });
  });

  test("does not treat canvas bounds synchronization scroll events as user scrolling", () => {
    expect(canvasFrameScrollIsUserDriven({
      programmaticScroll: false,
      boundsScrollSyncPending: true
    })).toBe(false);
    expect(canvasFrameScrollIsUserDriven({
      programmaticScroll: true,
      boundsScrollSyncPending: false
    })).toBe(false);
    expect(canvasFrameScrollIsUserDriven({
      programmaticScroll: false,
      boundsScrollSyncPending: false
    })).toBe(true);
  });

  test("does not let a stale skipped scroll sync suppress canvas bounds synchronization", () => {
    expect(canvasScrollSyncShouldRun({
      skipNextScrollSync: true,
      boundsScrollSyncPending: true
    })).toBe(true);
    expect(canvasScrollSyncShouldRun({
      skipNextScrollSync: true,
      boundsScrollSyncPending: false
    })).toBe(false);
    expect(canvasScrollSyncShouldRun({
      skipNextScrollSync: false,
      boundsScrollSyncPending: false
    })).toBe(true);
  });

  test("preserves the frame scroll anchor when bounds change in edge-pan zoom mode", () => {
    const target = canvasBoundsScrollSyncTarget({
      anchorScrollLeft: 502,
      anchorScrollTop: 250,
      targetScrollLeft: 0,
      targetScrollTop: 0,
      maxScrollLeft: 1116,
      maxScrollTop: 555,
      targetViewBox: { x: 0, y: 0, width: 2458, height: 1625 },
      canvasBounds: { width: 2186, height: 1343 }
    });

    expect(target).toEqual({ left: 502, top: 250 });
  });

  test("compensates the visual canvas rect when auto expansion creates scroll range", () => {
    const target = canvasVisualRectScrollTarget({
      desiredRect: { left: 18, top: 111, width: 1364, height: 705 },
      currentRect: { left: 467, top: 79, width: 1850, height: 769 },
      currentScrollLeft: 0,
      currentScrollTop: 0,
      maxScrollLeft: 1384,
      maxScrollTop: 0
    });

    expect(target.left).toBe(449);
    expect(target.top).toBe(0);
    expect(target.deltaX).toBe(449);
    expect(target.deltaY).toBe(-32);
  });

  test("uses the viewBox scroll target when bounds change in normal zoom mode", () => {
    const target = canvasBoundsScrollSyncTarget({
      anchorScrollLeft: 502,
      anchorScrollTop: 250,
      targetScrollLeft: 640,
      targetScrollTop: 360,
      maxScrollLeft: 1116,
      maxScrollTop: 555,
      targetViewBox: { x: 120, y: 80, width: 900, height: 700 },
      canvasBounds: { width: 2186, height: 1343 }
    });

    expect(target).toEqual({ left: 640, top: 360 });
  });

  test("maps viewBox and scroll positions across scrollbar presence transitions", () => {
    const targetWithScrollbars = canvasFrameScrollTargetForViewBox({
      targetViewBox: { x: 400, y: 300, width: 1000, height: 800 },
      canvasBounds: { width: 2000, height: 1600 },
      maxScrollLeft: 600,
      maxScrollTop: 480,
      horizontalScrollbarsActive: true,
      verticalScrollbarsActive: true
    });
    expect(targetWithScrollbars).toEqual({ left: 240, top: 180 });

    const targetWithoutScrollbars = canvasFrameScrollTargetForViewBox({
      targetViewBox: { x: 400, y: 300, width: 1000, height: 800 },
      canvasBounds: { width: 2000, height: 1600 },
      maxScrollLeft: 0,
      maxScrollTop: 0,
      horizontalScrollbarsActive: false,
      verticalScrollbarsActive: false
    });
    expect(targetWithoutScrollbars).toEqual({ left: 0, top: 0 });

    const targetWhenScrollRangeAppearedFirst = canvasFrameScrollTargetForViewBox({
      targetViewBox: { x: 400, y: 300, width: 1000, height: 800 },
      canvasBounds: { width: 2000, height: 1600 },
      maxScrollLeft: 600,
      maxScrollTop: 480,
      horizontalScrollbarsActive: false,
      verticalScrollbarsActive: false
    });
    expect(targetWhenScrollRangeAppearedFirst).toEqual({ left: 240, top: 180 });

    const targetWhenScrollRangeDisappearedFirst = canvasFrameScrollTargetForViewBox({
      targetViewBox: { x: 400, y: 300, width: 1000, height: 800 },
      canvasBounds: { width: 2000, height: 1600 },
      maxScrollLeft: 0,
      maxScrollTop: 0,
      horizontalScrollbarsActive: true,
      verticalScrollbarsActive: true
    });
    expect(targetWhenScrollRangeDisappearedFirst).toEqual({ left: 0, top: 0 });

    const viewBoxFromScroll = canvasViewBoxFromFrameScrollPosition({
      currentViewBox: { x: 0, y: 0, width: 1000, height: 800 },
      canvasBounds: { width: 2000, height: 1600 },
      scrollLeft: 240,
      scrollTop: 180,
      maxScrollLeft: 600,
      maxScrollTop: 480,
      horizontalScrollbarsActive: true,
      verticalScrollbarsActive: true
    });
    expect(viewBoxFromScroll).toEqual({ x: 400, y: 300, width: 1000, height: 800 });

    const viewBoxWhenScrollRangeDisappearedFirst = canvasViewBoxFromFrameScrollPosition({
      currentViewBox: { x: 400, y: 300, width: 1000, height: 800 },
      canvasBounds: { width: 2000, height: 1600 },
      scrollLeft: 0,
      scrollTop: 0,
      maxScrollLeft: 0,
      maxScrollTop: 0,
      horizontalScrollbarsActive: true,
      verticalScrollbarsActive: true
    });
    expect(viewBoxWhenScrollRangeDisappearedFirst).toEqual({ x: 400, y: 300, width: 1000, height: 800 });
  });
});

// 拖画布边缘改尺寸时的「起始边锚定」：改的是哪条边、哪个轴，决定视口偏移要不要反向补偿。
// 这一簇三个函数此前零断言（clampCanvasNoScrollOffset 另有一个用例）。
// 判错的后果：改画布大小时画面跳一下 / 跳到别处 —— 纯手感问题，不报错。
//
// 注意两个名字极像的判定不是一回事：
//   canvasResizeEdgeAnchorsStart（导出）= 这条边在**起始侧**，偏移要补偿；
//   canvasResizeEdgeAnchorsAxis（内部）= 这条边**影响**这个轴。
describe("canvasResizeEdgeAnchorsStart：哪些边锚定在起始侧", () => {
  test("★ x 轴：left / top-left / bottom-left 锚定，其余不锚定", () => {
    for (const edge of ["left", "top-left", "bottom-left"] as CanvasResizeEdge[]) {
      expect(canvasResizeEdgeAnchorsStart(edge, "x"), edge).toBe(true);
    }
    for (const edge of ["right", "bottom", "corner", "top-right"] as CanvasResizeEdge[]) {
      expect(canvasResizeEdgeAnchorsStart(edge, "x"), edge).toBe(false);
    }
  });

  test("★ y 轴：top / top-left / top-right 锚定，其余不锚定", () => {
    for (const edge of ["top", "top-left", "top-right"] as CanvasResizeEdge[]) {
      expect(canvasResizeEdgeAnchorsStart(edge, "y"), edge).toBe(true);
    }
    for (const edge of ["bottom", "left", "right", "corner", "bottom-left"] as CanvasResizeEdge[]) {
      expect(canvasResizeEdgeAnchorsStart(edge, "y"), edge).toBe(false);
    }
  });

  test("corner 两个轴都不锚定（它是右下角，起点不动）", () => {
    expect(canvasResizeEdgeAnchorsStart("corner", "x")).toBe(false);
    expect(canvasResizeEdgeAnchorsStart("corner", "y")).toBe(false);
  });
});

describe("canvasResizeAnchoredDisplayOffset：锚定边要反向补偿", () => {
  const drag = {
    edge: "left" as CanvasResizeEdge,
    startDisplayWidth: 800,
    startDisplayHeight: 600,
    startDisplayOffsetX: 40,
    startDisplayOffsetY: 25
  };

  test("★ 没有拖动就只取整原值", () => {
    expect(canvasResizeAnchoredDisplayOffset(12.4, null, "x", 800)).toBe(12);
    expect(canvasResizeAnchoredDisplayOffset(12.5, null, "x", 800)).toBe(13);
    expect(canvasResizeAnchoredDisplayOffset(-7.6, null, "y", 600)).toBe(-8);
  });

  test("★ x 轴锚定：尺寸变大多少，偏移就往回退多少", () => {
    // 起始显示宽 800、偏移 40；现在宽 1000（大了 200）→ 起点要左移 200 → 偏移 -160
    expect(canvasResizeAnchoredDisplayOffset(0, drag, "x", 1000)).toBe(-160);
    expect(canvasResizeAnchoredDisplayOffset(0, drag, "x", 600)).toBe(240);
    expect(canvasResizeAnchoredDisplayOffset(0, { ...drag, edge: "bottom-left" }, "x", 1000)).toBe(-160);
  });

  test("★ y 轴锚定走的是高度与 y 偏移（不是宽度与 x 偏移）", () => {
    expect(canvasResizeAnchoredDisplayOffset(0, { ...drag, edge: "top" }, "y", 900)).toBe(25 - (900 - 600));
    expect(canvasResizeAnchoredDisplayOffset(0, { ...drag, edge: "top-right" }, "y", 900)).toBe(25 - (900 - 600));
  });

  test("不锚定的边：偏移保持拖动开始时的值（与当前尺寸无关）", () => {
    for (const size of [600, 800, 1200]) {
      expect(canvasResizeAnchoredDisplayOffset(0, { ...drag, edge: "right" }, "x", size), `right@${size}`).toBe(40);
      expect(canvasResizeAnchoredDisplayOffset(0, { ...drag, edge: "corner" }, "x", size), `corner x@${size}`).toBe(40);
      expect(canvasResizeAnchoredDisplayOffset(0, { ...drag, edge: "corner" }, "y", size), `corner y@${size}`).toBe(25);
      expect(canvasResizeAnchoredDisplayOffset(0, { ...drag, edge: "bottom" }, "y", size), `bottom@${size}`).toBe(25);
    }
  });

  test("结果一律取整", () => {
    expect(canvasResizeAnchoredDisplayOffset(0, { ...drag, startDisplayWidth: 800, startDisplayOffsetX: 40.5 }, "x", 1000.4)).toBe(-160);
  });
});

describe("canvasResizeKeepsScrollRange：改尺寸后是否保留滚动范围", () => {
  test("没有拖动 → false", () => {
    expect(canvasResizeKeepsScrollRange(null, "x")).toBe(false);
    expect(canvasResizeKeepsScrollRange(null, "y")).toBe(false);
  });

  test("按轴各取各的标志（不串）", () => {
    const horizontal = { startHorizontalScrollbarsActive: true, startVerticalScrollbarsActive: false };
    expect(canvasResizeKeepsScrollRange(horizontal, "x")).toBe(true);
    expect(canvasResizeKeepsScrollRange(horizontal, "y")).toBe(false);
    const vertical = { startHorizontalScrollbarsActive: false, startVerticalScrollbarsActive: true };
    expect(canvasResizeKeepsScrollRange(vertical, "x")).toBe(false);
    expect(canvasResizeKeepsScrollRange(vertical, "y")).toBe(true);
  });
});
