import { describe, expect, test } from "vitest";
import { snapSingleTerminalAnchorToNearestSide } from "./App";
import { createDefaultNode } from "./model";

describe("single terminal anchor snapping", () => {
  test("snaps a dragged single terminal to the nearest side midpoint", () => {
    const node = createDefaultNode("ac-ground-disconnector", { x: 100, y: 100 });

    expect(snapSingleTerminalAnchorToNearestSide(node, { x: 100, y: 220 })).toEqual({ x: 0, y: 0.5 });
    expect(snapSingleTerminalAnchorToNearestSide(node, { x: 240, y: 100 })).toEqual({ x: 0.5, y: 0 });
  });

  test("accounts for node rotation and mirror sign when snapping terminals", () => {
    const rotated = { ...createDefaultNode("ac-ground-disconnector", { x: 100, y: 100 }), rotation: 90 };
    const mirrored = { ...createDefaultNode("ac-ground-disconnector", { x: 100, y: 100 }), scaleX: -1 };

    expect(snapSingleTerminalAnchorToNearestSide(rotated, { x: 100, y: 220 })).toEqual({ x: 0.5, y: 0 });
    expect(snapSingleTerminalAnchorToNearestSide(mirrored, { x: 240, y: 100 })).toEqual({ x: -0.5, y: 0 });
  });
});
