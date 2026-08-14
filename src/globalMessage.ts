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
  // 支持 \n 换行
  el.innerHTML = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br>");
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

/** 全局 confirm 弹出框，替代 window.confirm，返回 Promise<boolean> */
export function showGlobalConfirm(text: string): Promise<boolean> {
  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.className = "global-confirm-overlay";
    const dialog = document.createElement("div");
    dialog.className = "global-confirm-dialog window-close-host";
    dialog.setAttribute("role", "dialog");
    dialog.setAttribute("aria-modal", "true");
    dialog.setAttribute("aria-label", "确认操作");
    const closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.className = "window-close-button";
    closeBtn.setAttribute("aria-label", "关闭确认窗口");
    closeBtn.title = "关闭";
    closeBtn.textContent = "×";
    // 支持 \n 换行
    const msgEl = document.createElement("div");
    msgEl.className = "global-confirm-message";
    msgEl.innerHTML = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br>");
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
    dialog.appendChild(btnRow);
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);
    // 触发进入动画
    requestAnimationFrame(() => overlay.classList.add("global-confirm-enter"));

    let settled = false;
    let onKey: ((event: KeyboardEvent) => void) | null = null;
    const close = (result: boolean) => {
      if (settled) return;
      settled = true;
      if (onKey) document.removeEventListener("keydown", onKey);
      overlay.classList.add("global-confirm-leave");
      setTimeout(() => overlay.remove(), 200);
      resolve(result);
    };
    closeBtn.addEventListener("click", () => close(false));
    cancelBtn.addEventListener("click", () => close(false));
    okBtn.addEventListener("click", () => close(true));
    // ESC 关闭 = 取消
    onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        close(false);
      }
    };
    document.addEventListener("keydown", onKey);
    okBtn.focus();
  });
}

// 挂载到 window 方便全局调用
(window as any).showGlobalMessage = showGlobalMessage;
(window as any).showGlobalConfirm = showGlobalConfirm;
