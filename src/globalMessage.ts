// 全局 message 弹出框（替代 window.alert）和 confirm 弹出框（替代 window.confirm）
// ponytail: 纯 DOM 实现，不依赖 React，任何模块可直接调用

const MAX_VISIBLE = 3;
const AUTO_CLOSE_MS = 4000;

interface MessageItem {
  id: number;
  el: HTMLElement;
}

let container: HTMLElement | null = null;
let nextId = 0;
const queue: MessageItem[] = [];

/** HTML 转义并支持 \n 换行（与 shared/xmlEscape.mjs 同标准，含引号） */
function escapeHtmlToBr(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;").replace(/\n/g, "<br>");
}

function getContainer(): HTMLElement {
  if (container && document.body.contains(container)) return container;
  container = document.createElement("div");
  container.className = "global-message-container";
  document.body.appendChild(container);
  return container;
}

function removeMessage(item: MessageItem) {
  const idx = queue.indexOf(item);
  if (idx >= 0) queue.splice(idx, 1);
  item.el.classList.add("global-message-leave");
  setTimeout(() => item.el.remove(), 300);
}

/** 全局 message 弹出框，替代 window.alert */
export function showGlobalMessage(text: string): void {
  const wrap = getContainer();
  const el = document.createElement("div");
  el.className = "global-message-item";
  el.innerHTML = escapeHtmlToBr(text);
  const item: MessageItem = { id: ++nextId, el };
  queue.push(item);
  wrap.appendChild(el);
  // 超出最大数量时移除最早的
  while (queue.length > MAX_VISIBLE) {
    removeMessage(queue[0]);
  }
  // 点击关闭
  el.addEventListener("click", () => removeMessage(item));
  // 自动关闭
  setTimeout(() => removeMessage(item), AUTO_CLOSE_MS);
  // 触发进入动画
  requestAnimationFrame(() => el.classList.add("global-message-enter"));
}

/**
 * 共享对话框构建器：confirm 与 prompt 复用同一套
 * overlay / dialog / 关闭按钮 / 消息体 / 按钮行的创建与关闭逻辑。
 * 差异仅在于：confirm 无输入框、resolve boolean；prompt 带输入框、resolve string | null。
 */
function openGlobalDialog(
  kind: "confirm" | "prompt",
  text: string,
  defaultValue = ""
): Promise<boolean | string | null> {
  const isConfirm = kind === "confirm";
  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.className = "global-confirm-overlay";
    const dialog = document.createElement("div");
    dialog.className = "global-confirm-dialog window-close-host";
    dialog.setAttribute("role", "dialog");
    dialog.setAttribute("aria-modal", "true");
    dialog.setAttribute("aria-label", isConfirm ? "确认操作" : "输入");
    const closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.className = "window-close-button";
    // 源码级守卫测试（windowCloseCoverage.test.ts）要求保留完整字面量形式
    if (isConfirm) {
      closeBtn.setAttribute("aria-label", "关闭确认窗口");
    } else {
      closeBtn.setAttribute("aria-label", "关闭输入窗口");
    }
    closeBtn.title = "关闭";
    closeBtn.textContent = "×";
    // 支持 \n 换行
    const msgEl = document.createElement("div");
    msgEl.className = "global-confirm-message";
    msgEl.innerHTML = escapeHtmlToBr(text);
    let inputEl: HTMLInputElement | null = null;
    if (!isConfirm) {
      inputEl = document.createElement("input");
      inputEl.type = "text";
      inputEl.className = "global-prompt-input";
      inputEl.value = defaultValue;
      inputEl.style.cssText = "width: 100%; padding: 6px 8px; margin: 8px 0; border: 1px solid #cbd5e1; border-radius: 4px; font-size: 14px;";
    }
    const btnRow = document.createElement("div");
    btnRow.className = "global-confirm-buttons";
    const cancelBtn = document.createElement("button");
    cancelBtn.className = "global-confirm-btn global-confirm-cancel";
    cancelBtn.textContent = "取消";
    const okBtn = document.createElement("button");
    okBtn.className = "global-confirm-btn global-confirm-ok";
    okBtn.textContent = "确定";
    btnRow.appendChild(cancelBtn);
    btnRow.appendChild(okBtn);
    dialog.appendChild(closeBtn);
    dialog.appendChild(msgEl);
    if (inputEl) dialog.appendChild(inputEl);
    dialog.appendChild(btnRow);
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);
    // 触发进入动画；prompt 场景同时聚焦并全选输入框
    requestAnimationFrame(() => {
      overlay.classList.add("global-confirm-enter");
      if (inputEl) {
        inputEl.focus();
        inputEl.select();
      }
    });

    let settled = false;
    let onKey: ((event: KeyboardEvent) => void) | null = null;
    const cancelValue = isConfirm ? false : null;
    const close = (result: boolean | string | null) => {
      if (settled) return;
      settled = true;
      if (onKey) document.removeEventListener("keydown", onKey);
      overlay.classList.add("global-confirm-leave");
      setTimeout(() => overlay.remove(), 200);
      resolve(result);
    };
    closeBtn.addEventListener("click", () => close(cancelValue));
    cancelBtn.addEventListener("click", () => close(cancelValue));
    okBtn.addEventListener("click", () => close(isConfirm ? true : (inputEl as HTMLInputElement).value));
    if (inputEl) {
      inputEl.addEventListener("keydown", (e) => {
        if (e.key === "Enter") close(inputEl!.value);
      });
    }
    onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close(cancelValue);
    };
    document.addEventListener("keydown", onKey);
    // confirm 聚焦确定按钮；prompt 已在进入动画时聚焦输入框
    if (isConfirm) okBtn.focus();
  });
}

/** 全局 confirm 弹出框，替代 window.confirm，返回 Promise<boolean> */
export function showGlobalConfirm(text: string): Promise<boolean> {
  return openGlobalDialog("confirm", text) as Promise<boolean>;
}

/** 全局 prompt 弹出框，替代 window.prompt，返回 Promise<string | null> */
export function showGlobalPrompt(text: string, defaultValue = ""): Promise<string | null> {
  return openGlobalDialog("prompt", text, defaultValue) as Promise<string | null>;
}

// 挂载到 window 方便全局调用
(window as any).showGlobalMessage = showGlobalMessage;
(window as any).showGlobalConfirm = showGlobalConfirm;
(window as any).showGlobalPrompt = showGlobalPrompt;
