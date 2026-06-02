import { describe, expect, test } from "vitest";
import { viewBoxAfterCanvasBoundsChange } from "./App";

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
});
