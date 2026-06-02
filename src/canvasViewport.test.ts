import { describe, expect, test } from "vitest";
import { canvasFrameScrollTargetForViewBox, canvasViewBoxFromFrameScrollPosition, viewBoxAfterCanvasBoundsChange } from "./App";

describe("canvas viewport bounds changes", () => {
  test("preserves the visible viewport when the canvas auto-expands downward or rightward", () => {
    const current = { x: 120, y: 620, width: 800, height: 600 };

    const next = viewBoxAfterCanvasBoundsChange(
      current,
      { width: 1200, height: 1400 }
    );

    expect(next).toEqual(current);
  });

  test("keeps the expanding bottom edge visible when auto-expanding below the current view", () => {
    const next = viewBoxAfterCanvasBoundsChange(
      { x: 0, y: 0, width: 1200, height: 1000 },
      { width: 1200, height: 1400 },
      { x: 0, y: 0 },
      { width: 1200, height: 1000 }
    );

    expect(next).toEqual({ x: 0, y: 400, width: 1200, height: 1000 });
  });

  test("does not move a top viewport when the canvas expands downward away from it", () => {
    const current = { x: 0, y: 0, width: 800, height: 600 };
    const next = viewBoxAfterCanvasBoundsChange(
      current,
      { width: 1200, height: 1400 },
      { x: 0, y: 0 },
      { width: 1200, height: 1000 }
    );

    expect(next).toEqual(current);
  });

  test("shifts the viewport with the canvas origin when expanding left or upward", () => {
    const next = viewBoxAfterCanvasBoundsChange(
      { x: 120, y: 220, width: 800, height: 600 },
      { width: 1250, height: 1080 },
      { x: 50, y: 80 }
    );

    expect(next).toEqual({ x: 170, y: 300, width: 800, height: 600 });
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
});
