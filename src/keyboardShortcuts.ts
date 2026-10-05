export type KeyboardShortcutScope = "canvas" | "records" | "none";

type KeyboardShortcutKeyInput = {
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
};

type KeyboardShortcutScopeInput = {
  isCanvasTarget: boolean;
  isCanvasPointerUnblocked?: boolean;
  isCanvasInteractionActive: boolean;
  isProjectListPointerInside: boolean;
};

export function isGlobalSaveShortcut(input: KeyboardShortcutKeyInput): boolean {
  // 运行时守卫：`key: string` 只约束 TS 调用方，运行时仍可能拿到非字符串
  // （合成事件、无类型调用方、被手搓的字面量对象）。此前直接 `.toLowerCase()`
  // 会在这些输入上抛 TypeError，把整个 keydown 处理链打断 —— 一次畸形事件
  // 就让快捷键整体失效。非字符串一律判为「不是保存快捷键」，返回 false。
  // 刻意不做 String() 归一：归一会让 `{ toString: () => "s" }` 这类对象
  // 意外命中保存快捷键，而 DOM 的 KeyboardEvent.key 恒为原始字符串。
  if (typeof input.key !== "string") {
    return false;
  }
  return Boolean(input.ctrlKey || input.metaKey) && input.key.toLowerCase() === "s";
}

export function resolveKeyboardShortcutScope(input: KeyboardShortcutScopeInput): KeyboardShortcutScope {
  if (input.isCanvasTarget || input.isCanvasPointerUnblocked) {
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
