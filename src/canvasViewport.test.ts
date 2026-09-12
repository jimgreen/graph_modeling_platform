import { describe, expect, test } from "vitest";
import {
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
