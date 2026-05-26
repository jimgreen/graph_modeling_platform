export type KeyboardShortcutScope = "canvas" | "records" | "none";

type KeyboardShortcutKeyInput = {
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
};

type KeyboardShortcutScopeInput = {
  isCanvasTarget: boolean;
  isCanvasInteractionActive: boolean;
  isProjectListPointerInside: boolean;
};

export function isGlobalSaveShortcut(input: KeyboardShortcutKeyInput): boolean {
  return Boolean(input.ctrlKey || input.metaKey) && input.key.toLowerCase() === "s";
}

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
