// 首次运行「交互式」引导 tour：用户必须真正动手操作，tour 才会自动推进。
// 依赖：react-joyride@3.2.0（v3 API，非 v2）。
//
// 选择器全部从源码验证过：
//   #topbar-mode-toggle      → src/appExtracted/appTopbar.tsx:502
//   .library-panel           → src/appExtracted/appLeftPanel.tsx:51
//   .diagram-canvas          → src/appExtracted/appCanvasArea.tsx:519
//   .inspector-panel         → src/appExtracted/appRightPanel.tsx:476
//   #topbar-save             → src/appExtracted/appTopbar.tsx:549
//   .topbar-button-groups    → src/appExtracted/appTopbar.tsx:499

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ACTIONS,
  EVENTS,
  STATUS,
  Joyride,
  type EventData,
  type Locale,
  type Step,
  type TooltipRenderProps
} from "react-joyride";
import { useTourTooltipViewportClamp } from "./tourViewportClamp";
import {
  readPersistedSidePanelMode,
  resolveSidePanelModeAfterTour,
  shouldForceSidePanelVisibleForTour,
  tourSidePanelStepSide,
  type SidePanelMode
} from "./sidePanelVisibility";
import {
  LEFT_PANEL_MODE_STORAGE_KEY,
  RIGHT_PANEL_MODE_STORAGE_KEY
} from "./appExtracted/appCoreCanvasUtilities";

// ---------- 持久化 ----------

/** localStorage key：标记当前浏览器是否已看过引导。
 *  已登记到 src/spaceCache.ts 的 KEPT_LOCAL_STORAGE_KEYS ——
 *  切空间时不清，否则每次切空间都会重新播放引导。 */
export const APP_TOUR_SEEN_KEY = "graph-modeling-platform:tour-seen";

/** 读「已看过引导」标志；存储不可用或抛错返回 false。 */
export function readTourSeen(): boolean {
  try {
    return typeof localStorage !== "undefined" && localStorage.getItem(APP_TOUR_SEEN_KEY) === "1";
  } catch {
    return false;
  }
}

/** 写「已看过引导」标志；存储不可用时静默失败。 */
export function writeTourSeen(): void {
  try {
    localStorage.setItem(APP_TOUR_SEEN_KEY, "1");
  } catch {
    // 隐私模式等：写不进去就下次再看
  }
}

/** 清除「已看过引导」标志，供手动重放使用。 */
export function clearTourSeen(): void {
  try {
    localStorage.removeItem(APP_TOUR_SEEN_KEY);
  } catch {
    // 静默
  }
}

// ---------- 步骤定义 ----------

/**
 * 6 步引导。**只有第 1 步是「动作步骤」**（要用户真的点一下切到编辑模式），
 * 其余 5 步是纯介绍，由用户点「下一步」推进。
 *
 * `data.actionStep`：标记为动作步骤；tooltip 据此禁用「下一步」按钮并显示提示文案。
 * 导出便于测试断言。
 */
const TOUR_STEPS: Step[] = [
  {
    target: "#topbar-mode-toggle",
    title: "切到「编辑模式」",
    content:
      "现在是「浏览模式」，画不了图。\n" +
      "点一下这个按钮切到「编辑模式」。",
    placement: "bottom",
    data: { actionStep: true }
  },
  {
    target: ".library-panel",
    title: "左侧：模型库 / 图元库 / 模板库",
    content:
      "· 模型库：管方案与模型\n" +
      "· 图元库：各种设备与图元，放到画布上就能用\n" +
      "· 模板库：现成的图模板，放一个能快速出图",
    placement: "right"
  },
  {
    // 画布元素本身可能比视口还大，直接锚定它会把 tooltip 顶出屏幕：
    // 故把「锚点」与「高亮」拆开：target 锚在画布内的稳定小节点上，
    // spotlightTarget 负责高亮整块画布（保持原模式）。
    target: ".canvas-content",
    spotlightTarget: ".diagram-canvas",
    title: "画布：在这里画拓扑",
    content:
      "把设备放到这块画布上，再用连线把它们连起来，就是一张拓扑图。\n" +
      "滚轮缩放，按住空白处平移。",
    placement: "bottom"
  },
  {
    target: ".viewport-controls",
    title: "画布下方的工具",
    content:
      "底部这排是画布工具：适配视图、缩放、小地图、收紧画布。\n" +
      "选中设备后，这里还会多出组合 / 层级 / 对齐等操作。",
    placement: "top"
  },
  {
    target: ".inspector-panel",
    title: "右侧：属性面板",
    content:
      "选中画布上的设备后，在这里改它的名称、额定值、量测等参数。",
    placement: "left"
  },
  {
    target: "#topbar-save",
    title: "保存与导出",
    content:
      "画完记得保存：点这里，或者按 Ctrl+S。\n" +
      "导出成 E 文件 / CIM-XML / SVG 用右边的「导出文件」。",
    placement: "bottom"
  },
  {
    target: ".topbar-button-groups",
    title: "常用功能都在这条顶栏",
    content:
      "· 图层管理 / 显示与配色 / 量测\n" +
      "· 全网拓扑 / 全局线路（跨模型）\n" +
      "· 导出：E 文件 / CIM-XML / SVG\n" +
      "左侧「模型库」管方案与模型，右侧面板改属性；\n" +
      "想快速出一张图，右键用「图模板」。",
    placement: "bottom"
  }
];

// v3 的 beacon（那个蓝色小圆点）默认开启：不关掉的话，用户得先点一下蓝点才看到提示 ——
// 首次引导要的是「一进来就说清楚」，故所有步骤统一 skipBeacon。
export const APP_TOUR_STEPS: Step[] = TOUR_STEPS.map((step) => ({ ...step, skipBeacon: true }));

// ---------- 动作闸门（纯函数，便于单测） ----------

/** 引导期间从 scope 读取的状态快照（与 DOM 解耦，便于单测）。 */
export interface TourGateState {
  isEditMode: boolean;
}

/**
 * 判断第 `stepIndex` 步的动作闸门是否满足。
 * 纯函数：不读 DOM、不依赖 React；可在单测中直接调用。
 *
 * **只有第 1 步（index 0，切到编辑模式）有闸门**：
 * - 「浏览模式下不能画图」是新手最卡的坑，亲手点一次比读一句话记得住；
 * - 图元库 / 模板库两个 tab 只在编辑模式下才渲染（见 appLeftPanel.tsx），
 *   不先切过去，后面的介绍步骤会指向界面上不存在的东西。
 * 其余步骤是纯介绍，由用户点「下一步」推进（返回 false，不自动跳）。
 */
export function tourGateSatisfied(stepIndex: number, state: TourGateState): boolean {
  if (stepIndex !== 0) return false;
  return state.isEditMode;
}

// ---------- 侧边栏步骤的强制展开 / 锁定 ----------
//
// 问题：引导里有两步分别锚定 `.library-panel`（第 2 步）与 `.inspector-panel`（第 5 步）。
// 用户若把侧边栏设为「永久隐藏」（或 auto 且当前收起），面板会被 `display:none` 摘出布局，
// react-joyride 拿不到目标尺寸 → tooltip 不渲染，屏幕上只剩深色遮罩，用户被卡死
// （点「上一步」回到该步骤时最容易复现）。
//
// 方案：锚定侧边栏的步骤渲染前把该侧边栏切到 `pinned`（永久展开）并锁定，
// 引导结束（完成 / 跳过 / 手动结束）后再还原成进入引导前的模式。

/**
 * `SidePanelMode` 的 localStorage key，与 `App.tsx` 使用的常量同源（直接 import，不复制字面量）。
 */
const TOUR_SIDE_PANEL_MODE_STORAGE_KEYS: Record<"left" | "right", string> = {
  left: LEFT_PANEL_MODE_STORAGE_KEY,
  right: RIGHT_PANEL_MODE_STORAGE_KEY
};

/**
 * 引导期间的锁定状态，随 scope 传给侧边栏相关的各个工厂（`createSetSidePanelMode` /
 * `createUpdateAutoPanelVisibility` / `createHideAutoPanelsFromWorkspace` /
 * `createRenderSidePanelModeControls` / `createRenderSidePanelEdgeTrigger`）。
 *
 * 索引访问而非解构：scope 通过 `Object.assign` 原地更新，解构会拿到陈旧引用。
 */
export interface TourSidePanelBodyContext {
  tourActive: boolean;
  tourBody: boolean;
  tourSidePanel: "left" | "right" | null;
}

/**
 * 侧边栏是否处于「引导锁定」状态。
 *
 * 锁定窗口刻意比「锚定该侧边栏的那一步」更长：
 * - `tourBody`（第 1 步之后、引导未结束）覆盖「下一步」离开侧边栏步骤的那一帧 ——
 *   否则用户刚点「下一步」，自动隐藏就会把还没定位完的 tooltip 连同面板一起收掉；
 * - 进入侧边栏步骤前（第 0 步）也一并锁定，避免第 0 步期间面板被收起造成第 1 步骤现。
 */
export function isSidePanelLockedByTour(
  side: "left" | "right",
  context: TourSidePanelBodyContext
): boolean {
  if (!context.tourActive) {
    return false;
  }
  return context.tourBody || context.tourSidePanel === side;
}

// ---------- 中文 locale（按钮文案） ----------

const zhLocale: Locale = {
  back: "上一步",
  close: "关闭",
  last: "完成",
  next: "下一步",
  nextWithProgress: "下一步（{current} / {total}）",
  open: "打开",
  skip: "跳过"
};

// ---------- 手动重放机制 ----------

// 模块级监听器：startAppTour() 触发时调用，通知组件重启 tour。
let restartListener: (() => void) | null = null;

/** 注册组件的重启回调（由 AppTour 内部挂上）。 */
function subscribeRestart(listener: () => void): () => void {
  restartListener = listener;
  return () => {
    if (restartListener === listener) {
      restartListener = null;
    }
  };
}

/**
 * 手动重放引导：清除 seen 标志并触发 tour 重启。
 * 供未来的「新手引导」菜单项调用。
 */
export function startAppTour(): void {
  clearTourSeen();
  if (restartListener) {
    restartListener();
  }
}

// ---------- 自定义 tooltip（简约大气 + 动作步骤禁用态） ----------
// 视觉基调与原 5 步引导保持一致；新增动作步骤时：
// - 「下一步」按钮禁用，文案改为「完成上面的操作后自动继续」；
// - 「跳过」依然可用（不阻断用户跳过整段引导）。
// 样式在 src/styles.css 的 `.tour-tooltip*` 块中，便于后续调整。

function TourTooltip(props: TooltipRenderProps) {
  const {
    backProps,
    index,
    isLastStep,
    primaryProps,
    size,
    skipProps,
    step,
    tooltipProps
  } = props;

  const showBack = index > 0;
  const stepData = step.data as { actionStep?: boolean } | undefined;
  const actionStep = Boolean(stepData?.actionStep);

  // 动作步骤（1-5）：主按钮禁用，提示用户完成上面的操作后自动继续。
  // 第 6 步（isLastStep）无闸门，正常显示「完成」。
  const actionDisabled = actionStep && !isLastStep;
  const primaryTitle = actionDisabled
    ? "完成上面的操作后自动继续"
    : primaryProps.title;

  // 兜底夹取：react-joyride 的 shift 边距可能比真实可视区域更大（tooltip 通过
  // portalElement 渲染进 .app-shell 这个 overflow:hidden 容器），导致某些步骤的
  // tooltip 被算到屏幕外、按钮点不到。这里在气泡外面包一层，只有越界时才用 transform
  // 把它推回视口内。**必须包在 .tour-tooltip 外面**：内联 transform 的优先级高于
  // keyframes，写在自己身上会压掉入场动画。详见 src/tourViewportClamp.ts。
  const clamp = useTourTooltipViewportClamp(index);

  return (
    <div
      className="tour-tooltip-floater"
      ref={clamp.clampRef}
      style={clamp.shiftStyle ?? undefined}
    >
      <div className="tour-tooltip" key={index} {...tooltipProps}>
        {step.title && (
          <h4 className="tour-tooltip__title" id="joyride-tooltip-title">
            {step.title}
          </h4>
        )}

        <div className="tour-tooltip__content" id="joyride-tooltip-content">
          {step.content}
        </div>

        <div className="tour-tooltip__progress">
          {index + 1} / {size}
        </div>

        <div className="tour-tooltip__footer">
          {!isLastStep && (
            <button className="tour-tooltip__skip" type="button" {...skipProps}>
              {skipProps.title}
            </button>
          )}
          <div className="tour-tooltip__spacer" />
          {showBack && (
            <button className="tour-tooltip__back" type="button" {...backProps}>
              {backProps.title}
            </button>
          )}
          <button
            className="tour-tooltip__primary"
            type="button"
            {...primaryProps}
            disabled={actionDisabled}
            title={primaryTitle}
          >
            {primaryTitle}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------- 组件 ----------

/** AppTour 接收应用 scope，用于读取闸门所需的状态字段。 */
interface AppTourProps {
  scope: Record<string, any>;
}

/**
 * 把 scope 上可能不存在的字段安全读出来（单测用精简 scope 装配时不会炸）。
 */
function readScopeField<T>(scope: Record<string, any>, key: string): T | undefined {
  return scope ? (scope[key] as T | undefined) : undefined;
}

/** 读取某侧边栏「进入引导前」的模式；只在引导首次进入侧边栏步骤时记一次。 */
function snapshotSidePanelMode(
  scope: Record<string, any>,
  side: "left" | "right"
): SidePanelMode {
  // 优先用 scope 现值（权威、无延迟）；缺字段时回落到 localStorage（兼容精简 scope）。
  const fromScope =
    side === "left"
      ? readScopeField<SidePanelMode>(scope, "leftPanelMode")
      : readScopeField<SidePanelMode>(scope, "rightPanelMode");
  if (fromScope === "pinned" || fromScope === "hidden" || fromScope === "auto") {
    return fromScope;
  }
  return readPersistedSidePanelMode(TOUR_SIDE_PANEL_MODE_STORAGE_KEYS[side]) ?? "pinned";
}

/** 把某侧边栏切到指定模式（直接调 scope 的 setter，绕过工厂里的引导闸门）。 */
function applySidePanelMode(
  scope: Record<string, any>,
  side: "left" | "right",
  mode: SidePanelMode
): void {
  if (side === "left") {
    readScopeField<(mode: SidePanelMode) => void>(scope, "setLeftPanelMode")?.(mode);
    readScopeField<(visible: boolean) => void>(scope, "setLeftPanelAutoVisible")?.(mode === "auto");
    return;
  }
  readScopeField<(mode: SidePanelMode) => void>(scope, "setRightPanelMode")?.(mode);
  readScopeField<(visible: boolean) => void>(scope, "setRightPanelAutoVisible")?.(mode === "auto");
}

/**
 * AppTour —— 首次运行「交互式」引导。
 *
 * 行为：
 * - 首次访问（localStorage 无 APP_TOUR_SEEN_KEY 标志）自动启动；
 * - 步骤 1-5 为动作步骤：完成真实操作（切编辑模式 / 拖入设备 / 连一条线 /
 *   选中设备 / 保存）后自动推进；主按钮始终禁用；
 * - 步骤 6 为终页展示，由用户手动点「完成」结束；
 * - 启动时记录 nodes/edges 基准值，确保用户即使已有设备，也得"再"拖一个；
 * - **锚定侧边栏的步骤会把对应侧边栏强制展开并锁定**（禁止最小化 / 隐藏），
 *   引导结束后还原成进入引导前的模式；
 * - 用户跳过或完成后写入标志，下次不再自动启动；
 * - portalElement 指向 .app-shell —— 应用作为 qiankun 微前端运行时，
 *   渲染到 document.body 会泄漏到宿主页面容器之外；
 * - storage/标志逻辑抛错时不阻断应用（render nothing）。
 */
export function AppTour({ scope }: AppTourProps) {
  const [run, setRun] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const didInitRef = useRef(false);
  // 进入引导前的侧边栏模式快照（只在首次用到某侧边栏时记一次）。
  const panelModeBeforeTourRef = useRef<{ left: SidePanelMode | null; right: SidePanelMode | null }>({
    left: null,
    right: null
  });

  // 启动 / 重放：回到第 1 步并开启 tour。
  const startTour = useCallback(() => {
    panelModeBeforeTourRef.current = { left: null, right: null };
    setStepIndex(0);
    setRun(true);
  }, []);

  // 启动闸门：首次访问时自动开启（只在首次 mount 跑一次）
  useEffect(() => {
    if (didInitRef.current) {
      return;
    }
    didInitRef.current = true;
    try {
      if (!readTourSeen()) {
        startTour();
      }
    } catch {
      // 存储不可用：不启动引导，不阻断应用
    }
    // 只在 mount 时跑一次：didInitRef 已保证。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 订阅手动重放
  useEffect(() => {
    return subscribeRestart(() => {
      startTour();
    });
  }, []);

  // 把引导期间的侧边栏锁定状态挂到 scope 上，供各交互工厂读取。
  // 每帧重算：scope 原地更新，必须用最新字段（见 src/CLAUDE.md）。
  const tourBody = run && stepIndex >= 1;
  // 锁定目标：锚定侧边栏的步骤锁对应侧边栏；引导其余时间至少锁左侧栏
  // （第 0 步切到编辑模式后左侧栏会多出「图元库 / 模板库」tab，第 1 步要锚定它）。
  const tourLockedSide: "left" | "right" = run
    ? tourSidePanelStepSide(stepIndex) ?? "left"
    : "left";
  Object.assign(scope ?? {}, {
    tourActive: run,
    tourBody,
    tourSidePanel: run ? tourLockedSide : null,
    tourBlockedSidePanelMode: (side: "left" | "right") =>
      isSidePanelLockedByTour(side, {
        tourActive: run,
        tourBody,
        tourSidePanel: run ? tourLockedSide : null
      })
  });

  // 强制展开：锚定某侧边栏的步骤渲染前，把该侧边栏切到 `pinned`。
  // 不写 dep 数组：应用每帧重渲染，这里只做幂等赋值，成本极低。
  useEffect(() => {
    if (!run) return;
    const side = tourSidePanelStepSide(stepIndex) ?? "left";
    const mode =
      side === "left"
        ? readScopeField<SidePanelMode>(scope, "leftPanelMode") ?? "pinned"
        : readScopeField<SidePanelMode>(scope, "rightPanelMode") ?? "pinned";
    if (!shouldForceSidePanelVisibleForTour(mode)) {
      return;
    }
    if (panelModeBeforeTourRef.current[side] === null) {
      panelModeBeforeTourRef.current[side] = snapshotSidePanelMode(scope, side);
    }
    applySidePanelMode(scope, side, "pinned");
  });

  // 还原：引导结束后把改过的模式恢复原样。
  // 只在「模式仍是引导写入的 pinned」时还原，避免覆盖用户在引导结束瞬间的手动选择。
  useEffect(() => {
    if (run) return;
    const sides: Array<"left" | "right"> = ["left", "right"];
    for (const side of sides) {
      const before = panelModeBeforeTourRef.current[side];
      if (before === null) {
        continue;
      }
      const currentMode =
        side === "left"
          ? readScopeField<SidePanelMode>(scope, "leftPanelMode") ?? "pinned"
          : readScopeField<SidePanelMode>(scope, "rightPanelMode") ?? "pinned";
      const autoVisible =
        side === "left"
          ? Boolean(readScopeField<boolean>(scope, "leftPanelAutoVisible"))
          : Boolean(readScopeField<boolean>(scope, "rightPanelAutoVisible"));
      const desired = resolveSidePanelModeAfterTour(
        before,
        currentMode,
        readPersistedSidePanelMode(TOUR_SIDE_PANEL_MODE_STORAGE_KEYS[side]),
        autoVisible
      );
      if (desired !== null) {
        applySidePanelMode(scope, side, desired);
      }
      panelModeBeforeTourRef.current[side] = null;
    }
  });

  // 每帧检查闸门：满足则自动前进。
  // 不写 dep 数组：应用每帧都会重渲染（见 src/CLAUDE.md），这里只做布尔比较，成本极低。
  // scope 通过 Object.assign 原地修改、引用不变，因此必须每帧读取其最新字段。
  useEffect(() => {
    if (!run) return;
    // 只有第 1 步（切编辑模式）是动作步骤；其余为介绍步骤，由用户点「下一步」推进。
    if (stepIndex !== 0) return;
    if (tourGateSatisfied(stepIndex, { isEditMode: Boolean(scope?.isEditMode) })) {
      setStepIndex((i) => i + 1);
    }
  });

  const handleEvent = useCallback((data: EventData) => {
    const { action, index, status, type } = data;

    if (type === EVENTS.STEP_AFTER) {
      // 动作步骤上「下一步」被禁用，理论上不会触发 STEP_AFTER；
      // 但「上一步」仍然可用（showBack 时），需按 -1 处理。
      const delta = action === ACTIONS.PREV ? -1 : 1;
      setStepIndex(index + delta);
    } else if (
      type === EVENTS.TOUR_END ||
      status === STATUS.SKIPPED ||
      status === STATUS.FINISHED
    ) {
      // 引导结束（完成或跳过）：写标志 + 停止
      writeTourSeen();
      setRun(false);
    }
  }, []);

  if (!run) {
    return null;
  }

  return (
    <Joyride
      run={run}
      steps={APP_TOUR_STEPS}
      stepIndex={stepIndex}
      continuous
      scrollToFirstStep
      locale={zhLocale}
      onEvent={handleEvent}
      portalElement=".app-shell"
      tooltipComponent={TourTooltip}
      options={{
        arrowColor: "#ffffff",
        backgroundColor: "#ffffff",
        primaryColor: "#1677ff",
        textColor: "#333333",
        overlayColor: "rgba(0, 0, 0, 0.5)",
        spotlightRadius: 8,
        // 点遮罩空白处什么都不做（v3 默认是 'close' = 直接结束整个引导）。
        // 对首次使用的人，手一滑点到暗区整段引导就没了，而结束时又会写「已看过」标记 —— 再也看不回来。
        // 故只认按钮：下一步 / 上一步 / 跳过 / 关闭。
        overlayClickAction: false,
        // 限宽：窗口窄时不横向溢出
        width: "min(380px, calc(100vw - 24px))",
        // 必须高过应用常驻 UI（styles.css 里 1000/1800/1810 那一档），否则遮罩压不住顶栏与侧栏；
        // 又刻意低于 10000+ 的全局层（global-confirm 10001 / 消息 toast 15000 / 各窗口层 13000+），
        // 这样引导期间弹出的错误提示仍盖在引导之上、不会被吞掉。
        zIndex: 9000
      }}
    />
  );
}
