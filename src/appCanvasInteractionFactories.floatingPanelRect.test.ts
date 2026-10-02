// 两个浮动面板的当前位置：已挂载时读真实 DOM 矩形，未挂载时按布局常量算。
// 拓扑告警面板的位置依赖右侧栏可见性与状态栏高度，两者都要进公式。
import { afterEach, describe, expect, test, vi } from "vitest";

import {
  createCurrentNodeDoubleClickDialogRect,
  createCurrentTopologyWarningPanelRect
} from "./appExtracted/appCanvasInteractionFactories";

describe("createCurrentNodeDoubleClickDialogRect", () => {
  const DEFAULT_W = 320;
  const DEFAULT_H = 240;

  function createScope(over: Record<string, any> = {}) {
    return {
      NODE_DOUBLE_CLICK_DIALOG_DEFAULT_WIDTH: DEFAULT_W,
      NODE_DOUBLE_CLICK_DIALOG_DEFAULT_HEIGHT: DEFAULT_H,
      nodeDoubleClickDialogLayout: null,
      nodeDoubleClickDialogRef: { current: null },
      clampNodeDoubleClickDialogLayout: vi.fn((layout: any) => layout),
      ...over
    };
  }

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test("已挂载时读 DOM 矩形并过一遍钳制", () => {
    const scope = createScope({
      nodeDoubleClickDialogRef: { current: { getBoundingClientRect: () => ({ left: 5, top: 6, width: 100, height: 200 }) } }
    });

    expect(createCurrentNodeDoubleClickDialogRect(scope)()).toEqual({ left: 5, top: 6, width: 100, height: 200 });
    expect(scope.clampNodeDoubleClickDialogLayout).toHaveBeenCalled();
  });

  test("未挂载时按视口居中", () => {
    vi.stubGlobal("window", { innerWidth: 1000, innerHeight: 800 });
    const scope = createScope();

    expect(createCurrentNodeDoubleClickDialogRect(scope)()).toEqual({
      left: (1000 - DEFAULT_W) / 2,
      top: (800 - DEFAULT_H) / 2,
      width: DEFAULT_W,
      height: DEFAULT_H
    });
  });

  test("无 window 时用默认尺寸本身作为视口（退化为左上角 0）", () => {
    vi.stubGlobal("window", undefined);
    const scope = createScope();

    expect(createCurrentNodeDoubleClickDialogRect(scope)()).toMatchObject({ left: 0, top: 0 });
  });

  test("已有记忆布局时优先用它", () => {
    vi.stubGlobal("window", { innerWidth: 1000, innerHeight: 800 });
    const scope = createScope({ nodeDoubleClickDialogLayout: { left: 11, top: 22, width: 33, height: 44 } });

    expect(createCurrentNodeDoubleClickDialogRect(scope)()).toEqual({ left: 11, top: 22, width: 33, height: 44 });
  });

  test("两条路径的结果都过钳制", () => {
    vi.stubGlobal("window", { innerWidth: 1000, innerHeight: 800 });
    const scope = createScope();

    createCurrentNodeDoubleClickDialogRect(scope)();

    expect(scope.clampNodeDoubleClickDialogLayout).toHaveBeenCalledTimes(1);
  });
});

describe("createCurrentTopologyWarningPanelRect", () => {
  const MARGIN = 12;
  const PANEL_W = 200;
  const PANEL_H = 100;
  const MINIMAP_W = 180;
  const MINIMAP_H = 140;
  const STATUSBAR_H = 24;

  function createScope(over: Record<string, any> = {}) {
    return {
      CANVAS_MINIMAP_WIDTH: MINIMAP_W,
      CANVAS_MINIMAP_HEIGHT: MINIMAP_H,
      TOPOLOGY_WARNING_PANEL_MARGIN: MARGIN,
      rightPanelVisible: true,
      rightPanelWidth: 300,
      statusbarHeight: STATUSBAR_H,
      topologyWarningPanelWidth: PANEL_W,
      topologyWarningPanelHeight: PANEL_H,
      topologyWarningPanelRef: { current: null },
      ...over
    };
  }

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test("已挂载时读 DOM 矩形", () => {
    const scope = createScope({
      topologyWarningPanelRef: { current: { getBoundingClientRect: () => ({ left: 1, top: 2, width: 3, height: 4 }) } }
    });

    expect(createCurrentTopologyWarningPanelRect(scope)()).toEqual({ left: 1, top: 2, width: 3, height: 4 });
  });

  test("未挂载时贴小地图左上方", () => {
    vi.stubGlobal("window", { innerWidth: 1600, innerHeight: 900 });
    const scope = createScope();

    const rect = createCurrentTopologyWarningPanelRect(scope)();

    expect(rect.width).toBe(PANEL_W);
    expect(rect.height).toBe(PANEL_H);
    // 右侧栏可见：1600 - (300 + 28) - 180 - 12 - 200
    expect(rect.left).toBe(1600 - 328 - MINIMAP_W - MARGIN - PANEL_W);
    expect(rect.top).toBe(900 - STATUSBAR_H - 14 - MINIMAP_H);
  });

  test("右侧栏隐藏时按 16 的间距算（比 28 小）", () => {
    vi.stubGlobal("window", { innerWidth: 1600, innerHeight: 900 });
    const scope = createScope({ rightPanelVisible: false });

    expect(createCurrentTopologyWarningPanelRect(scope)().left).toBe(1600 - 16 - MINIMAP_W - MARGIN - PANEL_W);
  });

  test("视口太窄时左边距保底为 MARGIN，不会跑到屏幕外", () => {
    vi.stubGlobal("window", { innerWidth: 200, innerHeight: 900 });
    const scope = createScope();

    expect(createCurrentTopologyWarningPanelRect(scope)().left).toBe(MARGIN);
  });

  test("视口太矮时上边距保底为 MARGIN", () => {
    vi.stubGlobal("window", { innerWidth: 1600, innerHeight: 50 });
    const scope = createScope();

    expect(createCurrentTopologyWarningPanelRect(scope)().top).toBe(MARGIN);
  });
});
