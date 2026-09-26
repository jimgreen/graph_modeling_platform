import { describe, expect, test, vi } from "vitest";
import {
  createHandleSidePanelPointerLeave,
  createHideAutoPanelsFromWorkspace,
  createRenderSidePanelModeControls,
  createSetSidePanelMode,
  createUpdateAutoPanelVisibility
} from "./appExtracted/appCanvasInteractionFactories";
import {
  isPointerInsideSidePanelViewportEdgeBridge,
  isSidePanelVisible,
  nextSidePanelAutoVisible,
  normalizeSidePanelMode,
  readPersistedSidePanelMode,
  resolveSidePanelModeAfterTour,
  shouldForceSidePanelVisibleForTour,
  shouldIgnoreWorkspaceAutoHide,
  tourSidePanelStepSide,
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

// ---------- 新手引导期间的侧边栏强制展开 / 禁止最小化 ----------

describe("tour forced side panel expansion", () => {
  test("maps tour steps to the side panel they anchor", () => {
    expect(tourSidePanelStepSide(1)).toBe("left");
    expect(tourSidePanelStepSide(4)).toBe("right");
    for (const stepIndex of [0, 2, 3, 5, 6, -1, 99]) {
      expect(tourSidePanelStepSide(stepIndex)).toBeNull();
    }
  });

  test("only non-pinned modes need forcing (pinned is already visible)", () => {
    expect(shouldForceSidePanelVisibleForTour("pinned")).toBe(false);
    expect(shouldForceSidePanelVisibleForTour("hidden")).toBe(true);
    expect(shouldForceSidePanelVisibleForTour("auto")).toBe(true);
  });

  test("a permanent 'pinned' mode is never restored (it was never changed)", () => {
    expect(resolveSidePanelModeAfterTour("pinned", "pinned", "pinned", false)).toBeNull();
    expect(resolveSidePanelModeAfterTour("pinned", "auto", "pinned", true)).toBeNull();
  });

  test("restores a previously 'hidden' panel back to hidden after the tour", () => {
    expect(resolveSidePanelModeAfterTour("hidden", "pinned", "pinned", false)).toBe("hidden");
  });

  test("restores a previously collapsed 'auto' panel back to auto after the tour", () => {
    expect(resolveSidePanelModeAfterTour("auto", "pinned", "pinned", false)).toBe("auto");
  });

  test("never downgrades an auto panel that was already visible before the tour", () => {
    // auto + autoVisible=true 本来就可见：引导写的 pinned 不改变观感，
    // 还原成 auto 反而会被下一次画布交互立刻关掉 —— 故保持 pinned。
    expect(resolveSidePanelModeAfterTour("auto", "pinned", "pinned", true)).toBeNull();
  });

  test("does not restore when the user already changed the mode mid-tour", () => {
    // 用户点过模式按钮但本帧尚未写盘（currentMode=auto, persistedMode=pinned）→ 保留用户选择。
    expect(resolveSidePanelModeAfterTour("hidden", "auto", "pinned", true)).toBeNull();
  });

  test("does not clobber an auto panel the user just reopened after the tour", () => {
    expect(resolveSidePanelModeAfterTour("auto", "auto", "auto", true)).toBeNull();
  });

  test("reads the persisted panel mode and falls back to pinned for missing / invalid values", () => {
    const storage = new Map<string, string>();
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => (storage.has(key) ? (storage.get(key) as string) : null),
      setItem: (key: string, value: string) => {
        storage.set(key, value);
      }
    });
    try {
      expect(readPersistedSidePanelMode("tour-side-mode")).toBeNull();
      storage.set("tour-side-mode", "hidden");
      expect(readPersistedSidePanelMode("tour-side-mode")).toBe("hidden");
      storage.set("tour-side-mode", "nonsense");
      expect(readPersistedSidePanelMode("tour-side-mode")).toBe("pinned");
      storage.set("tour-side-mode", "auto");
      expect(readPersistedSidePanelMode("tour-side-mode")).toBe("auto");
    } finally {
      vi.unstubAllGlobals();
    }
  });

  test("readPersistedSidePanelMode swallows storage failures", () => {
    vi.stubGlobal("localStorage", {
      getItem: () => {
        throw new Error("blocked");
      }
    });
    try {
      expect(readPersistedSidePanelMode("tour-side-mode")).toBeNull();
    } finally {
      vi.unstubAllGlobals();
    }
  });

  test("setSidePanelMode refuses to hide a panel while the tour locks it", () => {
    const calls: string[] = [];
    let leftMode: SidePanelMode = "pinned";
    const setSidePanelMode = createSetSidePanelMode({
      setLeftPanelAutoVisible: (value: boolean) => calls.push(`leftAuto:${value}`),
      setLeftPanelMode: (mode: SidePanelMode) => {
        leftMode = mode;
        calls.push(`leftMode:${mode}`);
      },
      setRightPanelAutoVisible: (value: boolean) => calls.push(`rightAuto:${value}`),
      setRightPanelMode: (mode: SidePanelMode) => calls.push(`rightMode:${mode}`),
      tourBlockedSidePanelMode: (side: string) => side === "left"
    });

    setSidePanelMode("left", "hidden");
    expect(calls).toEqual([]);
    expect(leftMode).toBe("pinned");

    setSidePanelMode("left", "auto");
    expect(calls).toEqual([]);

    // pinned 是引导自己写入的目标值，必须放行（否则强制展开会绕不过闸门）。
    setSidePanelMode("left", "pinned");
    expect(calls).toEqual(["leftMode:pinned", "leftAuto:false"]);

    // 未被锁定的右侧栏不受影响。
    setSidePanelMode("right", "hidden");
    expect(calls).toEqual(["leftMode:pinned", "leftAuto:false", "rightMode:hidden", "rightAuto:false"]);
  });

  test("auto-hide events are ignored for the tour-locked panel only", () => {
    let leftVisible = true;
    let rightVisible = true;
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
      templateMenu: null,
      topologyWarningPanelDrag: null,
      topologyWarningPanelResize: null,
      tourBlockedSidePanelMode: (side: string) => side === "left"
    });

    updateAutoPanelVisibility("left", "panel-leave");
    expect(leftVisible).toBe(true);

    updateAutoPanelVisibility("right", "panel-leave");
    expect(rightVisible).toBe(false);
  });

  test("workspace auto-hide leaves only the tour-locked panel open", () => {
    let leftVisible = true;
    let rightVisible = true;
    const createHide = (tourBlocked: (side: string) => boolean) =>
      createHideAutoPanelsFromWorkspace({
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
        templateMenu: null,
        topologyWarningPanelDrag: null,
        topologyWarningPanelResize: null,
        tourBlockedSidePanelMode: tourBlocked
      });

    createHide((side: string) => side === "left")({} as any);
    expect(leftVisible).toBe(true);
    expect(rightVisible).toBe(false);

    leftVisible = true;
    rightVisible = true;
    createHide(() => true)({} as any);
    expect(leftVisible).toBe(true);
    expect(rightVisible).toBe(true);
  });

  test("mode control buttons are disabled and tagged while the tour locks the panel", () => {
    const renderControls = createRenderSidePanelModeControls({
      EyeOff: () => null,
      MousePointer2: () => null,
      Pin: () => null,
      Button: ({ children, ...rest }: any) => ({ type: "button", props: { children, ...rest } }),
      button: "button",
      div: "div",
      leftPanelMode: "pinned",
      rightPanelMode: "pinned",
      setSidePanelMode: () => undefined,
      tourBlockedSidePanelMode: (side: string) => side === "left"
    });

    const leftTree: any = renderControls("left");
    expect(leftTree.props["data-tour-locked"]).toBe("true");
    for (const child of leftTree.props.children) {
      expect(child.props.disabled).toBe(true);
      expect(String(child.props.title)).toContain("新手引导进行中");
    }

    const rightTree: any = renderControls("right");
    expect(rightTree.props["data-tour-locked"]).toBeUndefined();
    for (const child of rightTree.props.children) {
      expect(child.props.disabled).toBe(false);
    }
  });
});
