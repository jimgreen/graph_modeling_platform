// 浏览模式下右键方案树时，给顶栏"编辑/浏览"切换按钮加短暂闪动提示
// 纯 DOM 操作，不经过 __appScope / React 状态：该提示仅作用于一个稳定 id 的元素，
// 无需让其他组件感知，也无需参与重渲染。
// 幂等且可重入：重复调用会重置计时器，动画从头开始。

const HINT_CLASS = "mode-toggle-hint";
const HINT_DURATION_MS = 3000;
const BUTTON_ID = "topbar-mode-toggle";

let hideTimer: ReturnType<typeof setTimeout> | null = null;

/** 触发顶栏编辑/浏览切换按钮的闪动提示（浏览模式右键方案树时调用） */
export function triggerModeToggleHint(): void {
  if (typeof document === "undefined") return;
  const button = document.getElementById(BUTTON_ID);
  if (!button) return;

  // 重置：移除旧 class 并清除旧计时器，确保重入时动画从头开始
  button.classList.remove(HINT_CLASS);
  if (hideTimer !== null) {
    clearTimeout(hideTimer);
    hideTimer = null;
  }

  // 强制 reflow 使 animation 重新触发（同一 class 再次添加不会重启动画）
  void button.offsetWidth;
  button.classList.add(HINT_CLASS);

  hideTimer = setTimeout(() => {
    button.classList.remove(HINT_CLASS);
    hideTimer = null;
  }, HINT_DURATION_MS);
}
