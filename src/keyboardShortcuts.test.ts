import { describe, expect, test } from "vitest";
import { isGlobalSaveShortcut, resolveKeyboardShortcutScope } from "./keyboardShortcuts";

describe("keyboard shortcut scope", () => {
  test("uses record shortcuts only while the pointer is inside the model list", () => {
    expect(
      resolveKeyboardShortcutScope({
        isCanvasTarget: false,
        isCanvasInteractionActive: false,
        isProjectListPointerInside: true
      })
    ).toBe("records");

    expect(
      resolveKeyboardShortcutScope({
        isCanvasTarget: false,
        isCanvasInteractionActive: true,
        isProjectListPointerInside: true
      })
    ).toBe("records");

    expect(
      resolveKeyboardShortcutScope({
        isCanvasTarget: false,
        isCanvasInteractionActive: false,
        isProjectListPointerInside: false
      })
    ).toBe("none");
  });

  test("keeps canvas shortcuts scoped to the canvas", () => {
    expect(
      resolveKeyboardShortcutScope({
        isCanvasTarget: true,
        isCanvasPointerUnblocked: false,
        isCanvasInteractionActive: false,
        isProjectListPointerInside: false
      })
    ).toBe("canvas");

    expect(
      resolveKeyboardShortcutScope({
        isCanvasTarget: false,
        isCanvasPointerUnblocked: true,
        isCanvasInteractionActive: false,
        isProjectListPointerInside: false
      })
    ).toBe("canvas");

    expect(
      resolveKeyboardShortcutScope({
        isCanvasTarget: false,
        isCanvasPointerUnblocked: false,
        isCanvasInteractionActive: true,
        isProjectListPointerInside: false
      })
    ).toBe("canvas");

    expect(
      resolveKeyboardShortcutScope({
        isCanvasTarget: true,
        isCanvasPointerUnblocked: true,
        isCanvasInteractionActive: true,
        isProjectListPointerInside: true
      })
    ).toBe("canvas");
  });

  test("treats Ctrl+S and Meta+S as page-wide save shortcuts", () => {
    expect(isGlobalSaveShortcut({ key: "s", ctrlKey: true, metaKey: false })).toBe(true);
    expect(isGlobalSaveShortcut({ key: "S", ctrlKey: false, metaKey: true })).toBe(true);
    expect(isGlobalSaveShortcut({ key: "s", ctrlKey: false, metaKey: false })).toBe(false);
    expect(isGlobalSaveShortcut({ key: "c", ctrlKey: true, metaKey: false })).toBe(false);
  });
});
