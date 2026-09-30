// 画布事件的目标判定与修饰键语义。
//
// 四个 *Target 判定各自带一份选择器常量，那些常量是「哪些控件不该触发画布行为」
// 的唯一真源：漏一个类名，右键菜单/滚轮缩放/键盘快捷键就会在那个控件上误触发。
// 改常量时没人会想到同步改测试，所以这里把「必须覆盖的控件」逐条钉住。
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import {
  canvasWheelEventHasNoModifier,
  canvasWheelTargetIsRenderedCanvas,
  hasCanvasSelectionModifier,
  isCanvasGraphicContextMenuTarget,
  isCanvasKeyboardBlockingTarget,
  isCanvasWheelZoomExcludedTarget,
  INTERACTION_MODE_STORAGE_KEY,
  normalizeInteractionMode,
  readStoredInteractionMode,
  shouldZoomCanvasFromWheelEvent,
  writeStoredInteractionMode
} from "./appExtracted/appCoreCanvasUtilities";

// ── 最小 DOM 桩：只需 classList / getAttribute / closest ──────────────────────
class FakeElement {
  classes: string[];
  attributes: Record<string, string>;

  constructor(classes: string[] = [], attributes: Record<string, string> = {}) {
    this.classes = classes;
    this.attributes = attributes;
  }

  get classList() {
    return { contains: (name: string) => this.classes.includes(name) };
  }

  getAttribute(name: string) {
    return this.attributes[name] ?? null;
  }

  matches(selector: string): boolean {
    if (selector.startsWith(".")) return this.classes.includes(selector.slice(1));
    const attr = selector.match(/^\[([a-z]+)=["']([^"']+)["']\]$/i);
    if (attr) return this.getAttribute(attr[1]) === attr[2];
    const contains = selector.match(/^\[([a-z]+)\*=['"]([^'"]+)['"]\]$/i);
    if (contains) return this.classes.some((name) => name.includes(contains[2]));
    return false;
  }

  closest(selector: string): FakeElement | null {
    return selector
      .split(",")
      .map((part) => part.trim())
      .some((part) => this.matches(part))
      ? this
      : null;
  }
}

// 事件 target 常是文本节点：判定函数对非 Element 目标会退到 parentElement
class FakeNode {
  parentElement: FakeElement | null = null;
}

const el = (classes: string[] = [], attributes: Record<string, string> = {}) =>
  new FakeElement(classes, attributes) as unknown as EventTarget;

beforeEach(() => {
  vi.stubGlobal("Element", FakeElement);
  vi.stubGlobal("Node", FakeNode);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("isCanvasGraphicContextMenuTarget：图元上的右键才弹图元菜单", () => {
  test("图元本体命中，空白画布不命中", () => {
    expect(isCanvasGraphicContextMenuTarget(el(["diagram-node"]))).toBe(true);
    expect(isCanvasGraphicContextMenuTarget(el(["canvas-scroll-surface"]))).toBe(false);
  });

  test("★ 关键控件全在白名单里（漏一个就会在它上面弹出图元菜单）", () => {
    for (const className of [
      "diagram-node",
      "connection-group",
      "transform-handles",
      "scale-handle",
      "rotate-handle",
      "canvas-resize-handles",
      "node-device-label",
      "measurement-group",
      "terminal-dot",
      "canvas-floating-toolbar"
    ]) {
      expect(`${className}: ${isCanvasGraphicContextMenuTarget(el([className]))}`).toBe(`${className}: true`);
    }
  });

  test("空类名的元素与 null 都不是目标", () => {
    expect(isCanvasGraphicContextMenuTarget(el([]))).toBe(false);
    expect(isCanvasGraphicContextMenuTarget(null)).toBe(false);
    // 既不是 Element 也不是 Node 的对象（如 window 本身）
    expect(isCanvasGraphicContextMenuTarget({} as unknown as EventTarget)).toBe(false);
  });
});

describe("isCanvasWheelZoomExcludedTarget：这些控件上滚轮不缩放画布", () => {
  test("面板 / 对话框 / 菜单内不缩放", () => {
    expect(isCanvasWheelZoomExcludedTarget(el(["floating-side-panel"]))).toBe(true);
    expect(isCanvasWheelZoomExcludedTarget(el([], { role: "dialog" }))).toBe(true);
    expect(isCanvasWheelZoomExcludedTarget(el(["context-menu"]))).toBe(true);
  });

  test("画布本身要缩放", () => {
    expect(isCanvasWheelZoomExcludedTarget(el(["diagram-canvas"]))).toBe(false);
  });

  test("★ 文本节点目标走 parentElement 兜底（事件 target 常是子节点）", () => {
    const text = new FakeNode();
    text.parentElement = new FakeElement(["context-menu"]);
    expect(isCanvasWheelZoomExcludedTarget(text as unknown as EventTarget)).toBe(true);
  });

  test("★ 侧栏触发条也在名单里（贴边收起的那条）", () => {
    expect(isCanvasWheelZoomExcludedTarget(el(["side-panel-edge-trigger"]))).toBe(true);
  });
});

describe("canvasWheelTargetIsRenderedCanvas / isCanvasKeyboardBlockingTarget", () => {
  test("只有 .diagram-canvas 及其后代算画布", () => {
    expect(canvasWheelTargetIsRenderedCanvas(el(["diagram-canvas"]))).toBe(true);
    expect(canvasWheelTargetIsRenderedCanvas(el(["canvas-scroll-surface"]))).toBe(false);
  });

  test("★ 键盘屏蔽名单含 class 通配 [class*='-dialog']（自定义对话框也挡得住）", () => {
    expect(isCanvasKeyboardBlockingTarget(el(["custom-thing-dialog"]))).toBe(true);
    expect(isCanvasKeyboardBlockingTarget(el(["canvas-minimap"]))).toBe(true);
    expect(isCanvasKeyboardBlockingTarget(el(["diagram-canvas"]))).toBe(false);
  });

  test("★ 面板与菜单挡键盘，画布放行", () => {
    for (const className of [
      "canvas-floating-toolbar",
      "library-panel",
      "inspector-panel",
      "floating-side-panel",
      "context-menu",
      "topbar-dropdown-menu",
      "viewport-controls",
      "topology-warning-floating-panel"
    ]) {
      expect(`${className}: ${isCanvasKeyboardBlockingTarget(el([className]))}`).toBe(`${className}: true`);
    }
  });
});

describe("修饰键语义", () => {
  test("hasCanvasSelectionModifier：ctrl / shift / meta 任一为真", () => {
    expect(hasCanvasSelectionModifier({ ctrlKey: true, shiftKey: false })).toBe(true);
    expect(hasCanvasSelectionModifier({ ctrlKey: false, shiftKey: true })).toBe(true);
    expect(hasCanvasSelectionModifier({ ctrlKey: false, shiftKey: false, metaKey: true })).toBe(true);
    expect(hasCanvasSelectionModifier({ ctrlKey: false, shiftKey: false })).toBe(false);
  });

  test("canvasWheelEventHasNoModifier：四个修饰键全空才算「无修饰」", () => {
    expect(canvasWheelEventHasNoModifier({ ctrlKey: false, metaKey: false, shiftKey: false, altKey: false })).toBe(true);
    expect(canvasWheelEventHasNoModifier({ ctrlKey: false, metaKey: false })).toBe(true);
    // alt 也要算进去：alt+滚轮在浏览器里是别的动作，不该当滚轮缩放
    expect(canvasWheelEventHasNoModifier({ ctrlKey: false, metaKey: false, altKey: true })).toBe(false);
  });

  test("★ shouldZoomCanvasFromWheelEvent：ctrl / meta / 无修饰才缩放，shift 与 alt 不缩放", () => {
    expect(shouldZoomCanvasFromWheelEvent({ ctrlKey: true, metaKey: false })).toBe(true);
    expect(shouldZoomCanvasFromWheelEvent({ ctrlKey: false, metaKey: true })).toBe(true);
    expect(shouldZoomCanvasFromWheelEvent({ ctrlKey: false, metaKey: false })).toBe(true);
    expect(shouldZoomCanvasFromWheelEvent({ ctrlKey: false, metaKey: false, shiftKey: true })).toBe(false);
    expect(shouldZoomCanvasFromWheelEvent({ ctrlKey: false, metaKey: false, altKey: true })).toBe(false);
  });
});

describe("交互模式持久化", () => {
  test("normalizeInteractionMode：非 edit 一律 browse", () => {
    expect(normalizeInteractionMode("edit")).toBe("edit");
    expect(normalizeInteractionMode("browse")).toBe("browse");
    expect(normalizeInteractionMode("EDIT")).toBe("browse");
    expect(normalizeInteractionMode(null)).toBe("browse");
  });

  test("无 window（SSR / Node）→ 默认 browse 且写入是空操作", () => {
    expect(readStoredInteractionMode()).toBe("browse");
    expect(() => writeStoredInteractionMode("edit")).not.toThrow();
  });

  test("读写往返", () => {
    const store = new Map<string, string>();
    vi.stubGlobal("window", {
      localStorage: {
        getItem: (key: string) => store.get(key) ?? null,
        setItem: (key: string, value: string) => void store.set(key, value)
      }
    });
    writeStoredInteractionMode("edit");
    expect(store.get(INTERACTION_MODE_STORAGE_KEY)).toBe("edit");
    expect(readStoredInteractionMode()).toBe("edit");
  });

  test("★ localStorage 抛异常时吞掉（隐私模式 / 配额满），仍回落到 browse", () => {
    vi.stubGlobal("window", {
      localStorage: {
        getItem: () => {
          throw new Error("SecurityError");
        },
        setItem: () => {
          throw new Error("QuotaExceeded");
        }
      }
    });
    expect(readStoredInteractionMode()).toBe("browse");
    expect(() => writeStoredInteractionMode("edit")).not.toThrow();
  });
});