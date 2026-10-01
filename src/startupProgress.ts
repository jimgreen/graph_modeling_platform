// 首屏启动遮罩的 DOM 驱动。markup 与 CSS 内联在 index.html —— 这段等待的大头是
// bundle 下载与解析，遮罩必须先于任何 JS 求值就出现在页面上，所以它不依赖 React。
//
// 只做两件事：换一句「当前在加载什么」，以及加载完后淡出移除。刻意不做百分比
// 计数：启动步骤时长差异极大且多数在几十毫秒内完成，报一个假的进度比不报更糟。

const BOOT_ID = "app-boot";
const FADE_OUT_MS = 400;

let currentLabel = "";

// 没有 DOM 就当没有遮罩。**绝不能在这里抛**：本模块被启动闸门在关键路径上调用，
// 而闸门外层是「失败也不阻断启动」的 catch —— 一旦抛，整段空间缓存归属对齐会被
// 静默跳过，那正是本模块最不该破坏的前置条件。
function bootRoot(): HTMLElement | null {
  if (typeof document === "undefined") {
    return null;
  }
  return document.getElementById(BOOT_ID);
}

/** 切换遮罩上的阶段文案。重复同一句不会重建节点，避免动画反复重放。 */
export function setBootPhase(label: string): void {
  const phase = bootRoot()?.querySelector(".boot-phase");
  if (!phase || label === currentLabel) {
    return;
  }
  currentLabel = label;
  phase.textContent = "";
  const span = document.createElement("span");
  span.textContent = label;
  phase.appendChild(span);
}

/** 加载完成：淡出并移除遮罩。重复调用无副作用。 */
export function finishBoot(): void {
  const boot = bootRoot();
  if (!boot) {
    return;
  }
  boot.classList.add("is-done");
  setTimeout(() => boot.remove(), FADE_OUT_MS);
}
