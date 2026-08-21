import { describe, expect, test } from "vitest";

import {
  nodeRotateHandleControlPoints,
  nodeScaleHandleControlPoint,
  scaleHandleControlPoint
} from "./appExtracted/appPersistenceLibraryExport";
import { createDefaultNode } from "./model";

const STATIC_SELECTION_VISUAL_PADDING = 24;

describe("static node selection geometry", () => {
  test("preserves the original handle geometry when no visual padding is requested", () => {
    const node = {
      ...createDefaultNode("static-toolbar-node", { x: 0, y: 0 }),
      rotation: 27,
      scaleX: 1.25,
      scaleY: 0.8
    };
    const southEastHandle = {
      id: "south-east",
      kind: "scale-both" as const,
      xDirection: 1 as const,
      yDirection: 1 as const,
      className: "diagonal-main"
    };

    expect(nodeScaleHandleControlPoint(node, southEastHandle, 14, 14)).toEqual(
      scaleHandleControlPoint(node, southEastHandle, 14, 14)
    );
  });

  test("keeps scale and rotate controls outside the padded visual frame after non-uniform scaling", () => {
    const node = {
      ...createDefaultNode("static-toolbar-node", { x: 0, y: 0 }),
      rotation: 0,
      scaleX: 1.5,
      scaleY: 0.75
    };
    const eastHandle = {
      id: "east",
      kind: "scale-x" as const,
      xDirection: 1 as const,
      yDirection: 0 as const,
      className: "horizontal"
    };

    const unpaddedEast = scaleHandleControlPoint(node, eastHandle, 14, 14);
    const paddedEast = nodeScaleHandleControlPoint(
      node,
      eastHandle,
      14,
      14,
      false,
      STATIC_SELECTION_VISUAL_PADDING
    );

    expect(unpaddedEast.y).toBe(0);
    expect(paddedEast).toEqual({
      x: unpaddedEast.x + STATIC_SELECTION_VISUAL_PADDING * Math.abs(node.scaleX),
      y: 0
    });

    expect(nodeRotateHandleControlPoints(
      node,
      12,
      24,
      32,
      STATIC_SELECTION_VISUAL_PADDING
    )).toEqual({
      stemStart: { x: 0, y: -66 },
      stemEnd: { x: 0, y: -78 },
      handle: { x: 0, y: -86 }
    });
  });
});
