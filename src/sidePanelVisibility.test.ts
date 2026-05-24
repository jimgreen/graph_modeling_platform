import { describe, expect, test } from "vitest";
import {
  isSidePanelVisible,
  nextSidePanelAutoVisible,
  normalizeSidePanelMode,
  type SidePanelMode
} from "./sidePanelVisibility";

describe("floating side panel visibility", () => {
  test("normalizes persisted panel modes", () => {
    expect(normalizeSidePanelMode("pinned")).toBe("pinned");
    expect(normalizeSidePanelMode("hidden")).toBe("hidden");
    expect(normalizeSidePanelMode("auto")).toBe("auto");
    expect(normalizeSidePanelMode("bad-value")).toBe("pinned");
    expect(normalizeSidePanelMode(null)).toBe("pinned");
  });

  test("resolves permanent visibility modes before transient auto state", () => {
    expect(isSidePanelVisible("pinned", false)).toBe(true);
    expect(isSidePanelVisible("pinned", true)).toBe(true);
    expect(isSidePanelVisible("hidden", false)).toBe(false);
    expect(isSidePanelVisible("hidden", true)).toBe(false);
    expect(isSidePanelVisible("auto", false)).toBe(false);
    expect(isSidePanelVisible("auto", true)).toBe(true);
  });

  test("auto panels show on edge hover and hide when the pointer leaves the panel", () => {
    let visible = false;
    visible = nextSidePanelAutoVisible("left", "auto", visible, "edge-enter");
    expect(visible).toBe(true);
    visible = nextSidePanelAutoVisible("left", "auto", visible, "panel-leave");
    expect(visible).toBe(false);
  });

  test("right auto panel opens from canvas activation while left auto panel is unchanged", () => {
    expect(nextSidePanelAutoVisible("right", "auto", false, "canvas-activate")).toBe(true);
    expect(nextSidePanelAutoVisible("left", "auto", false, "canvas-activate")).toBe(false);
  });

  test("permanent modes ignore transient auto events", () => {
    const modes: SidePanelMode[] = ["pinned", "hidden"];
    for (const mode of modes) {
      expect(nextSidePanelAutoVisible("right", mode, false, "edge-enter")).toBe(false);
      expect(nextSidePanelAutoVisible("right", mode, true, "panel-leave")).toBe(true);
    }
  });
});
