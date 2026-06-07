import { describe, expect, test } from "vitest";
import { projectedProportionalScaleFromHandleDelta } from "./App";

describe("single-node transform handles", () => {
  test("projects proportional corner drags onto the handle diagonal for thin devices", () => {
    const nextScale = projectedProportionalScaleFromHandleDelta({
      currentScale: 1,
      width: 600,
      height: 40,
      handleXDirection: 1,
      handleYDirection: 1,
      deltaX: 60,
      deltaY: 8
    });

    const expectedProjection = 1 + (60 * 300 + 8 * 20) / (300 ** 2 + 20 ** 2);
    expect(nextScale).toBeCloseTo(expectedProjection, 6);
    expect((nextScale - 1) * 300).toBeCloseTo(60.265, 3);
    expect((nextScale - 1) * 20).toBeCloseTo(4.018, 3);
    expect(nextScale).toBeLessThan(1.25);
  });

  test("uses the active side axis when proportional scaling is triggered from a side handle", () => {
    const nextScale = projectedProportionalScaleFromHandleDelta({
      currentScale: 1,
      width: 600,
      height: 40,
      handleXDirection: 1,
      handleYDirection: 0,
      deltaX: 60,
      deltaY: 100
    });

    expect(nextScale).toBeCloseTo(1.2, 6);
  });
});
