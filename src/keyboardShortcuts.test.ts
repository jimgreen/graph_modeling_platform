import { describe, expect, test } from "vitest";
import { resolveKeyboardShortcutScope } from "./keyboardShortcuts";

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
        isCanvasInteractionActive: false,
        isProjectListPointerInside: false
      })
    ).toBe("canvas");

    expect(
      resolveKeyboardShortcutScope({
        isCanvasTarget: false,
        isCanvasInteractionActive: true,
        isProjectListPointerInside: false
      })
    ).toBe("canvas");

    expect(
      resolveKeyboardShortcutScope({
        isCanvasTarget: true,
        isCanvasInteractionActive: true,
        isProjectListPointerInside: true
      })
    ).toBe("canvas");
  });
});
