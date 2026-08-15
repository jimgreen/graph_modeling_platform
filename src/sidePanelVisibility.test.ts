import { describe, expect, test, vi } from "vitest";
import {
  createHandleSidePanelPointerLeave,
  createHideAutoPanelsFromWorkspace,
  createUpdateAutoPanelVisibility
} from "./appExtracted/appCanvasInteractionFactories";
import {
  isPointerInsideSidePanelViewportEdgeBridge,
  isSidePanelVisible,
  nextSidePanelAutoVisible,
  normalizeSidePanelMode,
  shouldIgnoreWorkspaceAutoHide,
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

  test("workspace auto-hide ignores pointer transitions involving floating side panel UI", () => {
    expect(shouldIgnoreWorkspaceAutoHide(true, false)).toBe(true);
    expect(shouldIgnoreWorkspaceAutoHide(false, true)).toBe(true);
    expect(shouldIgnoreWorkspaceAutoHide(true, true)).toBe(true);
    expect(shouldIgnoreWorkspaceAutoHide(false, false, true)).toBe(true);
    expect(shouldIgnoreWorkspaceAutoHide(false, false)).toBe(false);
  });

  test("viewport-edge bridge covers only the floating panel's outer gap", () => {
    const panelRect = { top: 70, bottom: 700 };

    expect(isPointerInsideSidePanelViewportEdgeBridge("left", 0, 300, panelRect, 1000)).toBe(true);
    expect(isPointerInsideSidePanelViewportEdgeBridge("left", 13, 300, panelRect, 1000)).toBe(true);
    expect(isPointerInsideSidePanelViewportEdgeBridge("left", 14, 300, panelRect, 1000)).toBe(false);
    expect(isPointerInsideSidePanelViewportEdgeBridge("right", 987, 300, panelRect, 1000)).toBe(true);
    expect(isPointerInsideSidePanelViewportEdgeBridge("right", 986, 300, panelRect, 1000)).toBe(false);
    expect(isPointerInsideSidePanelViewportEdgeBridge("left", 6, 68, panelRect, 1000)).toBe(false);
  });

  test("panel leave does not close an auto panel while the pointer crosses its viewport-edge gap", () => {
    const visibilityEvents: string[] = [];
    const currentTarget = {
      contains: () => false,
      getBoundingClientRect: () => ({ left: -300, right: -12, top: 70, bottom: 700 })
    };
    const handleSidePanelPointerLeave = createHandleSidePanelPointerLeave({
      isPointerInsideSidePanelViewportEdgeBridge,
      pointerInsideElementRect: () => false,
      updateAutoPanelVisibility: (_side: string, event: string) => visibilityEvents.push(event)
    });
    vi.stubGlobal("Node", class TestNode {});
    vi.stubGlobal("window", { innerWidth: 1000 });
    try {
      handleSidePanelPointerLeave("left", {
        clientX: 6,
        clientY: 300,
        currentTarget,
        relatedTarget: null
      } as any);
      expect(visibilityEvents).toEqual([]);

      handleSidePanelPointerLeave("left", {
        clientX: 20,
        clientY: 300,
        currentTarget,
        relatedTarget: null
      } as any);
      expect(visibilityEvents).toEqual(["panel-leave"]);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  test("left auto panel stays visible while a template context menu is open", () => {
    let leftVisible = true;
    let rightVisible = false;
    const updateAutoPanelVisibility = createUpdateAutoPanelVisibility({
      leftPanelMode: "auto",
      nextSidePanelAutoVisible,
      projectMenu: null,
      projectRecordDragActiveRef: { current: false },
      rightPanelMode: "auto",
      schemeRecordDragActiveRef: { current: false },
      setLeftPanelAutoVisible: (updater: boolean | ((current: boolean) => boolean)) => {
        leftVisible = typeof updater === "function" ? updater(leftVisible) : updater;
      },
      setRightPanelAutoVisible: (updater: boolean | ((current: boolean) => boolean)) => {
        rightVisible = typeof updater === "function" ? updater(rightVisible) : updater;
      },
      sidePanelResize: null,
      templateMenu: { x: 100, y: 120, templateId: "template-1" },
      topologyWarningPanelDrag: null,
      topologyWarningPanelResize: null
    });

    updateAutoPanelVisibility("left", "panel-leave");

    expect(leftVisible).toBe(true);
    expect(rightVisible).toBe(false);
  });

  test("workspace auto-hide ignores pointer movement while a template context menu is open", () => {
    let leftVisible = true;
    let rightVisible = true;
    const hideAutoPanelsFromWorkspace = createHideAutoPanelsFromWorkspace({
      leftPanelMode: "auto",
      pointerClientTargetInside: () => false,
      pointerInsideFloatingPanelBounds: () => false,
      pointerRelatedTargetInside: () => false,
      projectMenu: null,
      projectRecordDragActiveRef: { current: false },
      rightPanelMode: "auto",
      schemeRecordDragActiveRef: { current: false },
      setLeftPanelAutoVisible: (visible: boolean) => {
        leftVisible = visible;
      },
      setRightPanelAutoVisible: (visible: boolean) => {
        rightVisible = visible;
      },
      shouldIgnoreWorkspaceAutoHide,
      sidePanelResize: null,
      templateMenu: { x: 100, y: 120, templateId: "template-1" },
      topologyWarningPanelDrag: null,
      topologyWarningPanelResize: null
    });

    hideAutoPanelsFromWorkspace({} as any);

    expect(leftVisible).toBe(true);
    expect(rightVisible).toBe(true);
  });
});
