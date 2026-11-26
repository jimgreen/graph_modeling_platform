/**
 * 人机交互帧率与主线程调度原语：
 * 1. `createRafLatestScheduler`：将高刷鼠标（125–1000Hz）的连续指针事件合批至每渲染帧至多提交一次最新值；
 * 2. `createElementRectCache`：对 `getBoundingClientRect()` 做单帧时间窗缓存，消除高频指针热路径上的强制同步重排（Forced Reflow）；
 * 3. `createIdleTaskScheduler`：将非关键本地持久化/日志延后至浏览器空闲帧（`requestIdleCallback`），支持 `flush()` 立即同步落盘。
 */

export interface RafLatestScheduler<T> {
  /** 预约以最新值执行回调；同一渲染帧内多次调用自动覆盖旧值，仅渲染最后一次。 */
  schedule(value: T): void;
  /** 若存在尚未落地的待执行值，立即同步刷出（如 pointerup 提交前确保尾帧不丢）。 */
  flush(): void;
  /** 取消尚未执行的待调度帧并丢弃缓存值。 */
  cancel(): void;
  /** 当前是否存在挂起的未执行帧。 */
  hasPending(): boolean;
}

/**
 * 创建单帧最新值合批调度器。
 * 在无 `requestAnimationFrame` 的 Node/测试环境中默认回退为同步执行，保持单测确定性。
 */
export function createRafLatestScheduler<T>(
  apply: (value: T) => void,
  options?: {
    requestFrame?: (cb: FrameRequestCallback) => number;
    cancelFrame?: (id: number) => void;
  }
): RafLatestScheduler<T> {
  const raf =
    options?.requestFrame ??
    (typeof globalThis.requestAnimationFrame === "function"
      ? globalThis.requestAnimationFrame.bind(globalThis)
      : null);
  const caf =
    options?.cancelFrame ??
    (typeof globalThis.cancelAnimationFrame === "function"
      ? globalThis.cancelAnimationFrame.bind(globalThis)
      : null);

  let rafId: number | null = null;
  let hasValue = false;
  let latestValue: T | undefined;

  const flush = () => {
    if (rafId !== null && caf) {
      caf(rafId);
      rafId = null;
    }
    if (!hasValue) return;
    const value = latestValue as T;
    hasValue = false;
    latestValue = undefined;
    apply(value);
  };

  const cancel = () => {
    if (rafId !== null && caf) {
      caf(rafId);
      rafId = null;
    }
    hasValue = false;
    latestValue = undefined;
  };

  const schedule = (value: T) => {
    latestValue = value;
    hasValue = true;
    if (!raf) {
      flush();
      return;
    }
    if (rafId !== null) return;
    rafId = raf(() => {
      rafId = null;
      if (!hasValue) return;
      const next = latestValue as T;
      hasValue = false;
      latestValue = undefined;
      apply(next);
    });
  };

  return {
    schedule,
    flush,
    cancel,
    hasPending: () => hasValue
  };
}

export interface ElementRectCache {
  /** 在 ttlMs 时间窗内复用同一 DOM 元素的矩形尺寸，避免高频指针帧内反复触发强制同步布局。 */
  getRect(element: Element): DOMRect;
  /** 主动失效缓存（窗口缩放、滚动或拖拽结束时调用）。 */
  invalidate(element?: Element): void;
}

/**
 * 创建元素矩形单帧缓存（默认 TTL = 16ms）。
 * 仅在真实 DOM 环境下缓存非零矩形，避免初始未挂载元素的 0x0 矩形被误缓存。
 */
export function createElementRectCache(
  ttlMs = 16,
  now: () => number = () => (typeof performance !== "undefined" && typeof performance.now === "function" ? performance.now() : Date.now())
): ElementRectCache {
  const cache = new WeakMap<Element, { rect: DOMRect; expiresAt: number }>();
  let generation = 0;
  const genMap = new WeakMap<Element, number>();

  const getRect = (element: Element): DOMRect => {
    const current = now();
    const cached = cache.get(element);
    if (cached && genMap.get(element) === generation && current < cached.expiresAt) {
      return cached.rect;
    }
    const rect = element.getBoundingClientRect();
    if (rect && (rect.width > 0 || rect.height > 0)) {
      cache.set(element, { rect, expiresAt: current + ttlMs });
      genMap.set(element, generation);
    }
    return rect;
  };

  const invalidate = (element?: Element) => {
    if (element) {
      cache.delete(element);
    } else {
      generation += 1;
    }
  };

  return { getRect, invalidate };
}

/** 全应用共享的轻量 DOM 矩形单帧缓存，供高频 pointermove 坐标换算复用。 */
export const sharedElementRectCache = createElementRectCache(16);

export interface IdleTaskScheduler {
  /** 预约在浏览器空闲帧执行最新任务（多次预约自动去重覆盖）。 */
  schedule(task: () => void): void;
  /** 立即同步执行当前挂起任务（页面卸载或显式保存前调用）。 */
  flush(): void;
  /** 取消挂起任务。 */
  cancel(): void;
}

/**
 * 创建空闲帧任务调度器：优先使用 `requestIdleCallback`，不支持时降级为短延迟 `setTimeout`。
 * 在无浏览器调度器的 Node 测试环境中直接同步执行以防测试漏断言。
 */
export function createIdleTaskScheduler(timeoutMs = 300): IdleTaskScheduler {
  const hasRic = typeof globalThis.requestIdleCallback === "function";
  const hasCic = typeof globalThis.cancelIdleCallback === "function";
  const isBrowser = typeof window !== "undefined";

  let handle: number | null = null;
  let usingRic = false;
  let pendingTask: (() => void) | null = null;

  const clearHandle = () => {
    if (handle === null) return;
    if (usingRic && hasCic) {
      globalThis.cancelIdleCallback(handle);
    } else {
      clearTimeout(handle);
    }
    handle = null;
    usingRic = false;
  };

  const flush = () => {
    clearHandle();
    const task = pendingTask;
    pendingTask = null;
    if (task) task();
  };

  const cancel = () => {
    clearHandle();
    pendingTask = null;
  };

  const schedule = (task: () => void) => {
    pendingTask = task;
    if (!isBrowser) {
      flush();
      return;
    }
    clearHandle();
    if (hasRic) {
      usingRic = true;
      handle = globalThis.requestIdleCallback(
        () => {
          handle = null;
          usingRic = false;
          const next = pendingTask;
          pendingTask = null;
          if (next) next();
        },
        { timeout: timeoutMs }
      );
    } else {
      usingRic = false;
      handle = setTimeout(() => {
        handle = null;
        const next = pendingTask;
        pendingTask = null;
        if (next) next();
      }, 16) as unknown as number;
    }
  };

  return { schedule, flush, cancel };
}
