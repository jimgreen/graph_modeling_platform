// 新手引导 tooltip 的「兜底夹取」。
//
// 背景：react-joyride 用 @floating-ui 定位 tooltip，其 `shift` middleware 的边界是
// `boundary: 'clippingAncestors'`（见 react-joyride/src/components/Floater.tsx 的
// `boundaryOptions`：只有目标存在「自定义滚动父级」时才收紧成 scrollParent + viewport）。
// 本项目的 tooltip 通过 `portalElement=".app-shell"` 渲染进一个 `overflow: hidden` 的容器 ——
// 夹取边界可能比真实可视区域更大，一旦某步的 placement 与目标位置组合不利（目标贴近屏幕下沿、
// 侧边栏在窄窗口下、或引导步骤切换的过渡帧），算出的坐标就会落到视口之外 ——
// 用户看不见按钮，等于被卡死。
//
// 这里**不改 react-joyride 内部**，而是在自定义 `tooltipComponent` 外层做一次幂等的兜底夹取：
// tooltip 仍在原位置渲染（箭头指向不变），只有超出可视区域时才用 transform 把它推回屏幕内。
//
// 模块分两层：
// - 纯函数层（无 DOM，可直接单测）：边界计算与位移求解；
// - hook 层（useTourTooltipViewportClamp）：订阅安装 / 重算 / 卸载，输出包裹元素所需的 props。
//
// **已知边界**：夹取只保证「外层盒子」落在可视区域内。若 tooltip 自身（含内边距与按钮行）
// 比可视区域还高，多出的部分仍会被裁掉 —— 由 CSS 侧 `.tour-tooltip` 的 `max-height` +
// 滚动兜底（见 styles.css 的 `--tour-tooltip-max-height`）。

import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";

/** 夹取时在视口四周保留的安全边距（px）。 */
export const TOUR_TOOLTIP_VIEWPORT_MARGIN = 12;

/** 需要被夹取的盒子测量结果（视口坐标系）。 */
export interface TourTooltipMeasure {
  top: number;
  left: number;
  width: number;
  height: number;
}

/** 视口内允许 tooltip 占据的可视区域（视口坐标系）。 */
export interface TourTooltipBounds {
  top: number;
  left: number;
  right: number;
  bottom: number;
}

/** 夹取结果：需要施加的位移（可视像素）。 */
export interface TourTooltipClampOffset {
  x: number;
  y: number;
}

/** 当前视觉视口（`VisualViewport` 的抽象，便于脱离 DOM 单测）。 */
export interface TourTooltipViewport {
  offsetTop: number;
  offsetLeft: number;
  width: number;
  height: number;
}

/**
 * 求 tooltip 矩形在当前可视区域内允许占用的边界。
 *
 * 用 `VisualViewport` 的 offset/尺寸而非 `window.inner*`：移动端软键盘弹出、页面被缩放时
 * `window.innerHeight` 不变但可见区域变小，只有 `visualViewport` 能反映真实可见范围。
 */
export function tourTooltipViewportBounds(viewport: TourTooltipViewport): TourTooltipBounds {
  return {
    top: viewport.offsetTop + TOUR_TOOLTIP_VIEWPORT_MARGIN,
    left: viewport.offsetLeft + TOUR_TOOLTIP_VIEWPORT_MARGIN,
    right: viewport.offsetLeft + viewport.width - TOUR_TOOLTIP_VIEWPORT_MARGIN,
    bottom: viewport.offsetTop + viewport.height - TOUR_TOOLTIP_VIEWPORT_MARGIN
  };
}

/**
 * 计算把 tooltip 推回可视区域所需的位移。
 *
 * 语义要点（逐条都是刻意的）：
 * 1. **只用位移，不改尺寸** —— 宽度已由 `options.width` + `.tour-tooltip` 的 `max-width`
 *    限制在视口内，这里只负责位置；改尺寸会破坏箭头指向与入场动画。
 * 2. **只夹超出的那一侧** —— 盒子贴顶时 `top < minY`，结果必然是非负位移（只往下推）；
 *    盒子贴底时 `top > maxY`，结果必然是负位移。两者互斥，不存在「压进去又推出来」。
 * 3. **盒子比可视区域还大时不夹取**（`maxX <= minX` / `maxY <= minY`）—— 此时无论怎么移
 *    都会溢出，硬夹只会把盒子推到远离锚点的地方、反而不像「贴着目标」。保持原样，
 *    由 CSS 的 `max-height` + 滚动兜底。
 * 4. **已在界内时返回精确的 0** —— 调用方据此避免写无意义的 transform
 *    （不引入 GPU 图层与 transition 抖动）。
 */
export function clampTourTooltipOffset(
  rect: TourTooltipMeasure,
  bounds: TourTooltipBounds
): TourTooltipClampOffset {
  let x = 0;
  // 横向：右边界优先（`maxX > minX` 时两者都已确定可用），避免窄弹窗左右来回弹。
  const maxX = bounds.right - rect.width;
  if (maxX > bounds.left) {
    x = Math.min(Math.max(rect.left, bounds.left), maxX) - rect.left;
  }

  let y = 0;
  const maxY = bounds.bottom - rect.height;
  if (maxY > bounds.top) {
    y = Math.min(Math.max(rect.top, bounds.top), maxY) - rect.top;
  }

  return { x, y };
}

/** 位移是否为零。 */
export function isZeroTourTooltipOffset(offset: TourTooltipClampOffset): boolean {
  return offset.x === 0 && offset.y === 0;
}

/** 位移 → 内联 transform；零位移返回 null（由调用方省略该属性）。 */
export function tourTooltipTransform(offset: TourTooltipClampOffset): string | null {
  return isZeroTourTooltipOffset(offset) ? null : `translate3d(${offset.x}px, ${offset.y}px, 0)`;
}

/**
 * 读取当前视觉视口。
 *
 * 优先 `visualViewport`（软键盘 / 页面缩放场景才准确），缺失时回落 `window.inner*`；
 * 两者都不可用（node 环境、尺寸为 0）时返回 null，调用方跳过夹取。
 */
export function readTourTooltipViewport(target?: Window | null): TourTooltipViewport | null {
  const win = target ?? (typeof window !== "undefined" ? window : null);
  if (!win) {
    return null;
  }
  const visualViewport = (win as unknown as { visualViewport?: VisualViewport | null })
    .visualViewport;
  if (visualViewport && visualViewport.width > 0 && visualViewport.height > 0) {
    return {
      offsetTop: visualViewport.offsetTop,
      offsetLeft: visualViewport.offsetLeft,
      width: visualViewport.width,
      height: visualViewport.height
    };
  }
  const width = win.innerWidth ?? 0;
  const height = win.innerHeight ?? 0;
  if (width <= 0 || height <= 0) {
    return null;
  }
  return { offsetTop: 0, offsetLeft: 0, width, height };
}

// ---------- hook 层 ----------

/**
 * 尺寸变化订阅：优先 `ResizeObserver`（能捕捉内容换行、字体加载后的高度变化），
 * 缺失时退化为 window resize；两者都不可用时返回 null（调用方跳过订阅）。
 */
function observeTourTooltipSize(element: HTMLElement, onResize: () => void): (() => void) | null {
  const ObserverCtor = (globalThis as { ResizeObserver?: typeof ResizeObserver }).ResizeObserver;
  if (typeof ObserverCtor === "function") {
    const observer = new ObserverCtor(() => onResize());
    observer.observe(element);
    return () => observer.disconnect();
  }
  const win = typeof window !== "undefined" ? window : null;
  if (win && typeof win.addEventListener === "function") {
    win.addEventListener("resize", onResize);
    return () => win.removeEventListener("resize", onResize);
  }
  return null;
}

/** `useTourTooltipViewportClamp` 的输出：包裹元素所需的 props。 */
export interface TourTooltipViewportClamp {
  /** 施加位移的包装元素 ref。 */
  clampRef: (node: HTMLElement | null) => void;
  /** 位移非零时的内联 transform；为零时为 null（省略该属性）。 */
  shiftStyle: CSSProperties | null;
}

/**
 * 让引导 tooltip 始终留在可视区域内。
 *
 * 结构（见 `appTour.tsx` 的 `TourTooltip`）：
 *
 * ```tsx
 * <div className="tour-tooltip-floater" ref={clamp.clampRef} style={clamp.shiftStyle ?? undefined}>
 *   <div className="tour-tooltip" {...tooltipProps}>…</div>
 * </div>
 * ```
 *
 * 为什么要在 `.tour-tooltip` 外面再包一层：
 * - **不能把位移写在自己身上**：内联 transform 的优先级高于 keyframes，会直接压掉
 *   `.tour-tooltip` 的入场动画（`tour-tooltip-in` 的位移部分）。
 * - **不能写在 react-joyride 的 `.react-joyride__floater` 上**：那是它自己的定位元素，
 *   每个定位帧都会重写 `left/top`；且我们从 tooltipComponent 内部拿不到它的引用。
 * - 外层盒子是块级元素，宽度默认撑满浮层 —— 恰好等于 `.tour-tooltip` 的宽度（受限宽约束），
 *   因此「外层的 rect」就是「气泡的 rect」，量测口径与夹取口径一致。
 *
 * `resetKey` 变化（换步骤）时会重新求解；尺寸变化（换行、字体、窗口缩放）也会触发，
 * 因此换行之后仍能把盒子重新压回可视区域。
 */
export function useTourTooltipViewportClamp(resetKey: unknown): TourTooltipViewportClamp {
  const [offset, setOffset] = useState<TourTooltipClampOffset>({ x: 0, y: 0 });
  // node 用 state 而非 ref：元素挂载是「渲染后」才知道的事，effect 需要它作为依赖
  // （先挂载 → effect 跑 → 量测），同时也自然支持卸载后重新挂载。
  const [element, setElement] = useState<HTMLElement | null>(null);
  // 读「当前已施加的位移」用 ref：求解时需要它反推未施加位移时的位置，但不希望它触发渲染。
  const offsetRef = useRef<TourTooltipClampOffset>({ x: 0, y: 0 });
  offsetRef.current = offset;

  const clampRef = useCallback((node: HTMLElement | null) => {
    setElement(node);
  }, []);

  useEffect(() => {
    if (!element) {
      return undefined;
    }

    let frameId: number | null = null;
    let cancelled = false;

    const measure = () => {
      frameId = null;
      if (cancelled) {
        return;
      }

      const viewport = readTourTooltipViewport();
      if (!viewport) {
        return;
      }

      // 先清掉已施加的位移再量：getBoundingClientRect 反映的是「实际渲染位置」，
      // 不清零就无法区分「本来就在界外」与「被上一次夹取推出去」。
      const previous = offsetRef.current;
      if (!isZeroTourTooltipOffset(previous)) {
        element.style.removeProperty("transform");
      }

      const rect = element.getBoundingClientRect();
      const next = clampTourTooltipOffset(rect, tourTooltipViewportBounds(viewport));

      if (next.x !== previous.x || next.y !== previous.y) {
        offsetRef.current = next;
        setOffset(next);
      } else if (!isZeroTourTooltipOffset(previous)) {
        // 求解结果与当前一致，但刚才为了量测把内联 transform 清掉了 —— 补回，避免闪烁。
        element.style.transform = tourTooltipTransform(next) as string;
      }
    };

    const schedule = () => {
      if (frameId !== null) {
        return;
      }
      // rAF 内只量一次：react-joyride 的定位在布局阶段完成后写入，此时量到的坐标已稳定；
      // 后续变化由 ResizeObserver / resetKey 再次触发，不做无上限重试（避免与观察者互相激荡）。
      frameId = requestAnimationFrame(measure);
    };

    schedule();
    const unobserve = observeTourTooltipSize(element, schedule);

    return () => {
      cancelled = true;
      if (frameId !== null) {
        cancelAnimationFrame(frameId);
        frameId = null;
      }
      unobserve?.();
      element.style.removeProperty("transform");
    };
    // 依赖里带 offset.x / offset.y：每次求解出新的位移后，按新位移再校一次，
    // 确保「位移导致盒子尺寸变化（如触边换行）」时仍能收敛到界内。
  }, [element, offset.x, offset.y, resetKey]);

  const transform = tourTooltipTransform(offset);
  return {
    clampRef,
    shiftStyle: transform ? { transform } : null
  };
}
