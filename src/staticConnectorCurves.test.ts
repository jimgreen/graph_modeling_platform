import { describe, expect, test } from "vitest";

import { isInteractiveStaticDrawingKind, type DeviceKind, type Point } from "./model";
import {
  staticConnectorDrawingNeedsExplicitFinish,
  staticConnectorDrawingPath
} from "./staticConnectorCurves";

const CURVE_KINDS = [
  "static-bezier-connector",
  "static-smoothstep-connector",
  "static-self-loop"
] as const satisfies readonly DeviceKind[];

describe("interactive static connector curves", () => {
  test("treats all three curve tools as interactive drawings that require an explicit finish", () => {
    for (const kind of CURVE_KINDS) {
      expect(isInteractiveStaticDrawingKind(kind)).toBe(true);
      expect(staticConnectorDrawingNeedsExplicitFinish(kind)).toBe(true);
    }
    expect(staticConnectorDrawingNeedsExplicitFinish("static-line")).toBe(false);
  });

  test("uses every confirmed point in each curve path", () => {
    const points: Point[] = [
      { x: 0, y: 0 },
      { x: 60, y: 80 },
      { x: 120, y: 20 },
      { x: 180, y: 100 }
    ];

    for (const kind of CURVE_KINDS) {
      const path = staticConnectorDrawingPath(kind, points);
      expect(path).toMatch(/^M 0 0 C /);
      expect(path.match(/ C /g)).toHaveLength(points.length - 1);
      expect(path).toContain(" 60 80");
      expect(path).toContain(" 120 20");
      expect(path).toMatch(/ 180 100$/);
    }
  });

  test("extends the active curve to the moving preview point", () => {
    const confirmed: Point[] = [
      { x: 20, y: 30 },
      { x: 80, y: 110 },
      { x: 160, y: 50 }
    ];
    const previewPoint = { x: 240, y: 140 };

    for (const kind of CURVE_KINDS) {
      const confirmedPath = staticConnectorDrawingPath(kind, confirmed);
      const previewPath = staticConnectorDrawingPath(kind, [...confirmed, previewPoint]);
      expect(previewPath).not.toBe(confirmedPath);
      expect(previewPath).toMatch(/ 240 140$/);
    }
  });
});
