/**
 * 统一非阻塞全局对话框调用适配层。
 *
 * 生产环境下由 `src/globalMessage.ts` 挂载 `showGlobalConfirm` / `showGlobalPrompt`，
 * 所有确认与输入操作均走仓库统一的受控非阻塞弹窗（继承主题、支持 Enter / Esc、不阻塞事件循环）；
 * 仅在未挂载全局弹窗的隔离单测环境中回退到 `window.confirm` / `window.prompt`。
 */

/** 统一异步确认框（替代同步阻塞的 `window.confirm`）。 */
export async function confirmAction(message: string): Promise<boolean> {
  const globalConfirm = (globalThis as { showGlobalConfirm?: (text: string) => Promise<boolean> }).showGlobalConfirm;
  if (typeof globalConfirm === "function") {
    return Boolean(await globalConfirm(message));
  }
  const nativeConfirm = (globalThis as { window?: { confirm?: (text: string) => boolean } }).window?.confirm;
  return typeof nativeConfirm === "function" ? Boolean(nativeConfirm(message)) : false;
}

/** 统一异步输入框（替代同步阻塞的 `window.prompt`）。 */
export async function promptText(message: string, defaultValue = ""): Promise<string | null> {
  const globalPrompt = (
    globalThis as { showGlobalPrompt?: (text: string, value?: string) => Promise<string | null> }
  ).showGlobalPrompt;
  if (typeof globalPrompt === "function") {
    return await globalPrompt(message, defaultValue);
  }
  const nativePrompt = (
    globalThis as { window?: { prompt?: (text: string, value?: string) => string | null } }
  ).window?.prompt;
  return typeof nativePrompt === "function" ? nativePrompt(message, defaultValue) : null;
}
