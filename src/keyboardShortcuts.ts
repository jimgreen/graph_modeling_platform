export type KeyboardShortcutScope = "canvas" | "records" | "none";

type KeyboardShortcutScopeInput = {
  isCanvasTarget: boolean;
  isCanvasInteractionActive: boolean;
  isProjectListPointerInside: boolean;
};

export function resolveKeyboardShortcutScope(input: KeyboardShortcutScopeInput): KeyboardShortcutScope {
  if (input.isCanvasTarget) {
    return "canvas";
  }
  if (input.isProjectListPointerInside) {
    return "records";
  }
  if (input.isCanvasInteractionActive) {
    return "canvas";
  }
  return "none";
}
