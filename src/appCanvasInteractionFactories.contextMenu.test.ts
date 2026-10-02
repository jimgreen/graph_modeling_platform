// 右键菜单定位与样式。菜单必须整体留在视口内，且靠近右/下边缘时子菜单改为向左/向上展开。
// 视口尺寸一律由本文件显式打桩 —— 实现读的是 `window.innerWidth/innerHeight`，
// 而 node 环境下 window 可能已存在（带默认 1280×720），不钉死就没法测越界分支。
import { afterEach, describe, expect, test, vi } from "vitest";

import {
  createContextMenuClassName,
  createContextMenuPlacement,
  createContextMenuStyle,
  createStopSidePanelEventPropagation
} from "./appExtracted/appCanvasInteractionFactories";

const PADDING = 8;

/**
 * 造 scope。size 为 null 表示「没有 window」，走实现里的 SSR 兜底 1280×720。
 * 打桩放在这里而不是各用例里，避免漏打一处就把视口读成默认值。
 */
function createScope(size: { width: number; height: number } | null, menuSize?: { width: number; height: number }) {
  vi.stubGlobal("window", size ? { innerWidth: size.width, innerHeight: size.height } : undefined);
  const scope: Record<string, any> = {
    CONTEXT_MENU_FALLBACK_WIDTH: 220,
    CONTEXT_MENU_FALLBACK_HEIGHT: 300,
    CONTEXT_MENU_SUBMENU_FALLBACK_WIDTH: 200,
    CONTEXT_MENU_SUBMENU_FALLBACK_HEIGHT: 200,
    CONTEXT_MENU_VIEWPORT_PADDING: PADDING,
    clampNumber: (value: number, min: number, max: number) => Math.min(Math.max(value, min), max),
    contextMenuSize: menuSize
  };
  scope.contextMenuPlacement = createContextMenuPlacement(scope);
  scope.contextMenuStyle = createContextMenuStyle(scope);
  scope.contextMenuClassName = createContextMenuClassName(scope);
  return scope;
}

describe("createContextMenuPlacement", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test("无 window 时用 1280×720 的兜底视口", () => {
    expect(createScope(null).contextMenuPlacement({ x: 100, y: 100 } as any)).toMatchObject({ left: 100, top: 100 });
  });

  test("menu 缺坐标时落到内边距处", () => {
    expect(createScope(null).contextMenuPlacement({} as any)).toMatchObject({ left: PADDING, top: PADDING });
  });

  test("贴近右边缘时左边界被拉回，菜单不越界", () => {
    const scope = createScope({ width: 500, height: 500 });

    expect(scope.contextMenuPlacement({ x: 490, y: 10 } as any).left).toBe(500 - 220 - PADDING);
  });

  test("贴近下边缘时上边界被拉回", () => {
    const scope = createScope({ width: 500, height: 500 });

    expect(scope.contextMenuPlacement({ x: 10, y: 490 } as any).top).toBe(500 - 300 - PADDING);
  });

  test("视口比兜底菜单还小时最大尺寸按视口减两侧内边距", () => {
    const scope = createScope({ width: 500, height: 500 });

    // 500 - 16 = 484 > 兜底宽度 220，故 maxWidth 取 484
    expect(scope.contextMenuPlacement({ x: 10, y: 10 } as any).maxWidth).toBe(500 - PADDING * 2);
  });

  test("超小视口时最大尺寸保底 128×120", () => {
    const scope = createScope({ width: 100, height: 100 });

    expect(scope.contextMenuPlacement({ x: 0, y: 0 } as any)).toMatchObject({ maxWidth: 128, maxHeight: 120 });
  });

  test("实测尺寸比兜底小时用实测值参与越界计算", () => {
    const scope = createScope({ width: 500, height: 500 }, { width: 100, height: 100 });

    expect(scope.contextMenuPlacement({ x: 490, y: 10 } as any).left).toBe(500 - 100 - PADDING);
  });

  test("菜单宽度上限夹住实测宽度（实测再大也只按 maxWidth 参与定位）", () => {
    const scope = createScope({ width: 500, height: 500 }, { width: 5000, height: 100 });

    // menuWidth = min(5000, 484) = 484 → 左边界上限 = 500 - 484 - 8 = 8，x=10 被拉回 8
    expect(scope.contextMenuPlacement({ x: 10, y: 10 } as any).left).toBe(PADDING);
  });

  test("靠右时子菜单改向左展开", () => {
    const scope = createScope({ width: 600, height: 800 });

    expect(scope.contextMenuPlacement({ x: 400, y: 10 } as any).submenuOpensLeft).toBe(true);
  });

  test("靠左时子菜单向右展开", () => {
    const scope = createScope({ width: 2000, height: 800 });

    expect(scope.contextMenuPlacement({ x: 10, y: 10 } as any).submenuOpensLeft).toBe(false);
  });

  test("靠下时子菜单改为向上展开", () => {
    const scope = createScope({ width: 2000, height: 600 });

    expect(scope.contextMenuPlacement({ x: 10, y: 500 } as any).submenuOpensUp).toBe(true);
  });

  test("靠上时子菜单向下展开", () => {
    const scope = createScope({ width: 2000, height: 2000 });

    expect(scope.contextMenuPlacement({ x: 10, y: 10 } as any).submenuOpensUp).toBe(false);
  });
});

describe("createContextMenuStyle", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test("定位结果直接进样式对象", () => {
    const scope = createScope(null);

    expect(scope.contextMenuStyle({ x: 100, y: 100 } as any)).toMatchObject({ left: 100, top: 100, overflowY: "visible" });
  });

  test("实测高度超过上限时改为纵向滚动", () => {
    const scope = createScope({ width: 500, height: 200 }, { width: 100, height: 1000 });

    expect(scope.contextMenuStyle({ x: 10, y: 10 } as any).overflowY).toBe("auto");
  });
});

describe("createContextMenuClassName", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test("贴右时带 submenu-left 类", () => {
    const scope = createScope({ width: 600, height: 800 });

    expect(scope.contextMenuClassName({ x: 400, y: 10 } as any)).toBe("context-menu context-menu--submenu-left");
  });

  test("贴右下时两个类都带", () => {
    const scope = createScope({ width: 600, height: 600 });

    expect(scope.contextMenuClassName({ x: 500, y: 500 } as any)).toBe(
      "context-menu context-menu--submenu-left context-menu--submenu-up"
    );
  });

  test("视口宽裕时只有基础类，不留空串", () => {
    const scope = createScope({ width: 3000, height: 3000 });

    expect(scope.contextMenuClassName({ x: 100, y: 100 } as any)).toBe("context-menu");
  });
});

describe("createStopSidePanelEventPropagation", () => {
  test("只阻止冒泡，不动其它事件字段", () => {
    const event = { stopPropagation: vi.fn(), preventDefault: vi.fn() };

    createStopSidePanelEventPropagation({})(event as any);

    expect(event.stopPropagation).toHaveBeenCalledTimes(1);
    expect(event.preventDefault).not.toHaveBeenCalled();
  });
});
