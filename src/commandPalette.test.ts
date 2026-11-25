import { describe, expect, it, vi } from "vitest";
import {
  buildCommandPaletteItems,
  filterCommandPaletteItems,
  KEYBOARD_SHORTCUT_GROUPS
} from "./commandPalette";
import {
  closeCommandPalette,
  getCommandPaletteState,
  openCommandPalette,
  setCommandPaletteTab,
  subscribeCommandPalette,
  toggleCommandPalette
} from "./commandPaletteStore";
import { isCommandPaletteShortcut, isShortcutHelpShortcut } from "./keyboardShortcuts";

describe("快捷键判定：命令面板与快捷键速查", () => {
  it("Ctrl+K / Cmd+K 命中命令面板快捷键，Alt+K 不命中", () => {
    expect(isCommandPaletteShortcut({ key: "k", ctrlKey: true })).toBe(true);
    expect(isCommandPaletteShortcut({ key: "K", metaKey: true })).toBe(true);
    expect(isCommandPaletteShortcut({ key: "k", ctrlKey: true, altKey: true })).toBe(false);
    expect(isCommandPaletteShortcut({ key: "k" })).toBe(false);
    expect(isCommandPaletteShortcut({ key: null as any, ctrlKey: true })).toBe(false);
  });

  it("非输入态 `?` 与任意态 `Ctrl+/` 命中快捷键速查，输入态 `?` 不误触", () => {
    expect(isShortcutHelpShortcut({ key: "?", isTextInputTarget: false })).toBe(true);
    expect(isShortcutHelpShortcut({ key: "？", isTextInputTarget: false })).toBe(true);
    expect(isShortcutHelpShortcut({ key: "?", isTextInputTarget: true })).toBe(false);
    expect(isShortcutHelpShortcut({ key: "/", ctrlKey: true, isTextInputTarget: true })).toBe(true);
    expect(isShortcutHelpShortcut({ key: "/", metaKey: true, isTextInputTarget: false })).toBe(true);
    expect(isShortcutHelpShortcut({ key: "/", isTextInputTarget: false })).toBe(false);
  });
});

describe("commandPaletteStore 独立外部状态存储", () => {
  it("支持打开、切换、切标签、关闭并正确通知订阅者", () => {
    closeCommandPalette();
    const listener = vi.fn();
    const unsubscribe = subscribeCommandPalette(listener);

    openCommandPalette("search");
    expect(getCommandPaletteState()).toEqual({ open: true, tab: "search" });
    expect(listener).toHaveBeenCalledTimes(1);

    setCommandPaletteTab("shortcuts");
    expect(getCommandPaletteState()).toEqual({ open: true, tab: "shortcuts" });

    toggleCommandPalette("shortcuts");
    expect(getCommandPaletteState().open).toBe(false);

    toggleCommandPalette("search");
    expect(getCommandPaletteState()).toEqual({ open: true, tab: "search" });

    closeCommandPalette();
    expect(getCommandPaletteState().open).toBe(false);
    unsubscribe();
  });
});

describe("commandPalette 聚合、检索与执行", () => {
  const createScope = () => {
    const scope: Record<string, any> = {
      activeProjectKey: "scheme-1:proj-1",
      selectedProjectId: "proj-1",
      themeMode: "light",
      minimapVisible: false,
      electricFlowVisible: false,
      smartAlignmentEnabled: true,
      undoStack: [{}],
      redoStack: [],
      nodes: [
        { id: "n-tx1", name: "1号主变", kind: "transformer-2w", position: { x: 320, y: 180 }, params: { idx: 101 } },
        { id: "n-bus1", name: "220kV I母", kind: "bus", position: { x: 100, y: 80 }, params: {} }
      ],
      schemes: [
        {
          id: "scheme-1",
          name: "华东电网",
          projects: [
            { id: "proj-1", name: "站A一次图" },
            { id: "proj-2", name: "站B一次图" }
          ],
          children: [
            {
              id: "scheme-1-1",
              name: "新能源",
              projects: [{ id: "proj-3", name: "光伏场站" }]
            }
          ]
        }
      ],
      libraryTemplates: [
        { kind: "breaker", name: "断路器", category: "开关设备" },
        { kind: "pv-array", name: "光伏阵列", category: "新能源" }
      ],
      saveCurrentProject: vi.fn(),
      undoLastOperation: vi.fn(),
      redoLastOperation: vi.fn(),
      selectCanvasGraphics: vi.fn(),
      centerViewOnPointAtZoom: vi.fn(),
      requestLoadSavedProject: vi.fn(),
      setLibraryPlacement: vi.fn(),
      setMode: vi.fn(),
      toggleThemeMode: vi.fn(),
      lastCanvasPointerRef: { current: { x: 20, y: 30 } }
    };
    scope.__appScopeRef = { current: scope };
    return scope;
  };

  it("聚合四类条目并能按名称/ID/副标题/关键词精准检索排序", () => {
    const scope = createScope();
    const items = buildCommandPaletteItems(scope);

    // 搜画布设备
    const txHits = filterCommandPaletteItems(items, "1号主变", "node");
    expect(txHits).toHaveLength(1);
    expect(txHits[0].id).toBe("node:n-tx1");
    txHits[0].execute(scope);
    expect(scope.selectCanvasGraphics).toHaveBeenCalledWith(["n-tx1"], [], { scope: "direct" });
    expect(scope.centerViewOnPointAtZoom).toHaveBeenCalledWith({ x: 320, y: 180 }, 100);

    // 搜嵌套子方案模型并切换
    const modelHits = filterCommandPaletteItems(items, "光伏场站", "model");
    expect(modelHits).toHaveLength(1);
    expect(modelHits[0].subtitle).toContain("华东电网 / 新能源");
    modelHits[0].execute(scope);
    expect(scope.requestLoadSavedProject).toHaveBeenCalledWith(
      { id: "proj-3", name: "光伏场站" },
      "scheme-1-1"
    );

    // 搜图元库模板并进入放置模式
    const tplHits = filterCommandPaletteItems(items, "断路器", "template");
    expect(tplHits).toHaveLength(1);
    tplHits[0].execute(scope);
    expect(scope.setLibraryPlacement).toHaveBeenCalledWith({
      kind: "breaker",
      previewPoint: { x: 20, y: 30 }
    });
    expect(scope.setMode).toHaveBeenCalledWith("select");

    // 搜命令并执行（undo 可用、redo 禁用）
    const redoItem = items.find((i) => i.id === "cmd:redo");
    const undoItem = items.find((i) => i.id === "cmd:undo");
    expect(redoItem?.disabled).toBe(true);
    expect(undoItem?.disabled).toBe(false);
    undoItem?.execute(scope);
    expect(scope.undoLastOperation).toHaveBeenCalledTimes(1);
  });

  it("快捷键速查表包含全局/选区/画布分组", () => {
    expect(KEYBOARD_SHORTCUT_GROUPS.length).toBeGreaterThanOrEqual(3);
    expect(KEYBOARD_SHORTCUT_GROUPS.flatMap((g) => g.items).some((i) => i.keys.includes("K"))).toBe(true);
  });
});
