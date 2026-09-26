export type SidePanelMode = "pinned" | "hidden" | "auto";
export type SidePanelSide = "left" | "right";
export type SidePanelAutoEvent = "edge-enter" | "panel-enter" | "panel-leave" | "canvas-activate";

// Must cover the 12px viewport gap used by floating side panels in styles.css.
export const SIDE_PANEL_VIEWPORT_EDGE_GAP = 12;
const SIDE_PANEL_POINTER_TOLERANCE = 1;

export function isPointerInsideSidePanelViewportEdgeBridge(
  side: SidePanelSide,
  clientX: number,
  clientY: number,
  panelRect: Pick<DOMRect, "top" | "bottom">,
  viewportWidth: number
): boolean {
  const insidePanelHeight =
    clientY >= panelRect.top - SIDE_PANEL_POINTER_TOLERANCE &&
    clientY <= panelRect.bottom + SIDE_PANEL_POINTER_TOLERANCE;
  if (!insidePanelHeight) {
    return false;
  }

  const bridgeWidth = SIDE_PANEL_VIEWPORT_EDGE_GAP + SIDE_PANEL_POINTER_TOLERANCE;
  if (side === "left") {
    return clientX >= 0 && clientX <= bridgeWidth;
  }
  return clientX >= Math.max(0, viewportWidth - bridgeWidth) && clientX <= viewportWidth;
}

export function normalizeSidePanelMode(value: string | null | undefined): SidePanelMode {
  return value === "hidden" || value === "auto" || value === "pinned" ? value : "pinned";
}

export function isSidePanelVisible(mode: SidePanelMode, autoVisible: boolean): boolean {
  if (mode === "pinned") {
    return true;
  }
  if (mode === "hidden") {
    return false;
  }
  return autoVisible;
}

export function nextSidePanelAutoVisible(
  side: SidePanelSide,
  mode: SidePanelMode,
  currentVisible: boolean,
  event: SidePanelAutoEvent
): boolean {
  if (mode !== "auto") {
    return currentVisible;
  }
  if (event === "edge-enter" || event === "panel-enter") {
    return true;
  }
  if (event === "panel-leave") {
    return false;
  }
  return side === "right" ? true : currentVisible;
}

export function shouldIgnoreWorkspaceAutoHide(
  relatedTargetInsideFloatingUi: boolean,
  pointerTargetInsideFloatingUi: boolean,
  pointerInsideFloatingBounds = false
): boolean {
  return relatedTargetInsideFloatingUi || pointerTargetInsideFloatingUi || pointerInsideFloatingBounds;
}

// ---------- 新手引导（AppTour）期间的侧边栏强制展开 ----------

/**
 * 侧边栏步骤的索引 → 侧边栏映射（新手引导的第 2 步锚定左侧栏、第 5 步锚定右侧栏）。
 *
 * 引导 tooltip 的定位依赖目标元素真实可见；侧边栏处于 `hidden` 时被 `display:none` 摘出布局
 * （styles.css 的 `.app-shell.{left,right}-panel-hidden ... .hidden` 分支），
 * react-joyride 既无法定位也无法渲染 tooltip —— 表现为「只剩深色遮罩、控制界面消失」。
 * 故锚定侧边栏的步骤必须在渲染前先把该侧边栏展开。
 *
 * **不得顶层 import `appTour.tsx`**：该模块会 `import react-joyride`，而 react-joyride 在
 * 模块作用域内直接访问 `document`；`sidePanelVisibility.ts` 会被 node 环境的单测直载，
 * 一旦引入这条依赖链就会在 import 期抛 `document is not defined`。
 * 索引以 `APP_TOUR_STEPS` 为唯一口径，对应关系由 `appTour.test.ts` 的契约测试反查钉住。
 */
export const TOUR_SIDE_PANEL_STEP_TARGETS: ReadonlyArray<{ stepIndex: number; side: SidePanelSide }> = [
  { stepIndex: 1, side: "left" },
  { stepIndex: 4, side: "right" }
];

/** 返回第 `stepIndex` 步需要强制展开的侧边栏；非侧边栏步骤返回 null。 */
export function tourSidePanelStepSide(stepIndex: number): SidePanelSide | null {
  const entry = TOUR_SIDE_PANEL_STEP_TARGETS.find((item) => item.stepIndex === stepIndex);
  return entry ? entry.side : null;
}

/**
 * 引导期间是否需要把该侧边栏切到 `pinned` 以便展开。
 * `pinned` 本来就一直可见，无需改动（也就不会污染用户的偏好设置）。
 */
export function shouldForceSidePanelVisibleForTour(mode: SidePanelMode): boolean {
  return mode !== "pinned";
}

/**
 * 引导结束时把侧边栏 mode 还原成「进入引导前的值」，返回 null 表示无需改动。
 *
 * 只有「引导把该面板从不可见改成 pinned」这一种情况才还原。三类不还原的情形：
 * 1. `modeBeforeTour === "pinned"` —— 引导根本没改过；
 * 2. `currentMode !== "pinned"` —— 用户已经手动改过，保留用户选择；
 * 3. `persistedMode` 不是 pinned —— 用户在本帧刚点过模式按钮（写盘 effect 与渲染同批次，
 *    值最新），还原会表现为「点了没反应，要再点一次」。
 */
export function resolveSidePanelModeAfterTour(
  modeBeforeTour: SidePanelMode,
  currentMode: SidePanelMode,
  persistedMode: SidePanelMode | null,
  autoVisible = false
): SidePanelMode | null {
  if (modeBeforeTour === "pinned") {
    return null;
  }
  if (currentMode !== "pinned") {
    // 用户已经手动改过模式：保留用户选择，不再还原。
    return null;
  }
  if (persistedMode !== null && persistedMode !== "pinned") {
    // 写盘值不是引导自己写入的 pinned（同一批次里 setMode 先于这条 effect 执行），
    // 说明用户在本帧刚点过模式按钮 —— 保留用户选择，避免「点了要再点一次」。
    return null;
  }
  // 只有「引导把该面板从不可见改成 pinned」这一种情况才需要还原。
  // `auto + autoVisible=true` 时面板本来就可见，引导写的 pinned 不会改变任何观感，
  // 此时把 auto 换回去反而会被下一次「画布交互」立即关掉 —— 故不还原。
  return isSidePanelVisible(modeBeforeTour, autoVisible) ? null : modeBeforeTour;
}

/** 读取某个侧边栏持久化的显示模式；未设置 / 存储不可用时返回 null。 */
export function readPersistedSidePanelMode(storageKey: string): SidePanelMode | null {
  try {
    if (typeof localStorage === "undefined") {
      return null;
    }
    const raw = localStorage.getItem(storageKey);
    return raw === null ? null : normalizeSidePanelMode(raw);
  } catch {
    return null;
  }
}
