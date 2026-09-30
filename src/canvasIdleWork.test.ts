// scheduleIdleWork：LOD 分批渲染的调度器。
//
// 它是「分批把节点细节画出来」的入口，返回的取消函数要挂进 effect 清理里。
// 取消语义一旦坏了（组件卸载后回调仍跑），轻则往已卸载组件写状态、重则
// 累积成 hundreds of timers 把画布拖死 —— 而且不报错，只能靠性能曲线发现。
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { scheduleIdleWork } from "./appExtracted/appCoreCanvasUtilities";

let idleCallbacks: Array<() => void>;
let requestIdleCallback: ReturnType<typeof vi.fn>;
let cancelIdleCallback: ReturnType<typeof vi.fn>;

const installWindow = (options: { withIdleCallback: boolean; withCancel?: boolean }) => {
  requestIdleCallback = vi.fn((callback: () => void) => {
    idleCallbacks.push(callback);
    return idleCallbacks.length;
  });
  cancelIdleCallback = vi.fn();
  vi.stubGlobal("window", {
    setTimeout: (handler: () => void, ms?: number) => setTimeout(handler, ms),
    clearTimeout: (handle: number) => clearTimeout(handle),
    ...(options.withIdleCallback
      ? {
          requestIdleCallback,
          ...(options.withCancel === false ? {} : { cancelIdleCallback })
        }
      : {})
  });
};

beforeEach(() => {
  vi.useFakeTimers();
  idleCallbacks = [];
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("scheduleIdleWork：调度", () => {
  test("★ 默认延迟 0ms，推进定时器后回调执行一次", () => {
    installWindow({ withIdleCallback: false });
    const callback = vi.fn();
    scheduleIdleWork(callback);
    expect(callback).not.toHaveBeenCalled();
    vi.advanceTimersByTime(0);
    expect(callback).toHaveBeenCalledTimes(1);
  });

  test("delayMs 生效（不是立刻执行）", () => {
    installWindow({ withIdleCallback: false });
    const callback = vi.fn();
    scheduleIdleWork(callback, 240);
    vi.advanceTimersByTime(239);
    expect(callback).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(callback).toHaveBeenCalledTimes(1);
  });

  test("★ 浏览器支持 requestIdleCallback 时走它，并透传 timeoutMs", () => {
    installWindow({ withIdleCallback: true });
    const callback = vi.fn();
    scheduleIdleWork(callback, 10, 2000);
    vi.advanceTimersByTime(10);
    expect(requestIdleCallback).toHaveBeenCalledWith(expect.any(Function), { timeout: 2000 });
    // 定时器到点 ≠ 回调已跑，要等浏览器让出主线程
    expect(callback).not.toHaveBeenCalled();
    idleCallbacks[0]();
    expect(callback).toHaveBeenCalledTimes(1);
  });

  test("无 requestIdleCallback → 直接在定时器里执行（降级不丢活）", () => {
    installWindow({ withIdleCallback: false });
    const callback = vi.fn();
    scheduleIdleWork(callback, 5);
    vi.advanceTimersByTime(5);
    expect(callback).toHaveBeenCalledTimes(1);
  });
});

describe("scheduleIdleWork：取消", () => {
  test("★ 定时器未到点就取消 → 回调永不执行", () => {
    installWindow({ withIdleCallback: false });
    const callback = vi.fn();
    const cancel = scheduleIdleWork(callback, 100);
    cancel();
    vi.advanceTimersByTime(1000);
    expect(callback).not.toHaveBeenCalled();
  });

  test("★ requestIdleCallback 已挂上后取消 → idle 句柄被撤掉", () => {
    installWindow({ withIdleCallback: true });
    const callback = vi.fn();
    const cancel = scheduleIdleWork(callback, 10);
    vi.advanceTimersByTime(10);
    expect(requestIdleCallback).toHaveBeenCalledTimes(1);
    cancel();
    expect(cancelIdleCallback).toHaveBeenCalledWith(1);
  });

  // 浏览器不提供 cancelIdleCallback 时（代码用 `?.` 可选调用就是为此），
  // 唯一能挡住已挂上 idle 回调的就是 cancelled 标志 —— 没有它组件卸载后仍会执行。
  test("★ 无 cancelIdleCallback 时，靠 cancelled 标志挡住已挂上的 idle 回调", () => {
    installWindow({ withIdleCallback: true, withCancel: false });
    const callback = vi.fn();
    const cancel = scheduleIdleWork(callback, 10);
    vi.advanceTimersByTime(10);
    cancel();
    idleCallbacks[0]();
    expect(callback).not.toHaveBeenCalled();
  });

  test("★ 取消发生在定时器触发前 → 连 requestIdleCallback 都不会注册", () => {
    installWindow({ withIdleCallback: true });
    const cancel = scheduleIdleWork(() => undefined, 50);
    cancel();
    vi.advanceTimersByTime(100);
    expect(requestIdleCallback).not.toHaveBeenCalled();
  });

  test("重复取消幂等（effect 清理可能被调两次）", () => {
    installWindow({ withIdleCallback: false });
    const callback = vi.fn();
    const cancel = scheduleIdleWork(callback, 10);
    cancel();
    expect(() => {
      cancel();
      cancel();
    }).not.toThrow();
    vi.advanceTimersByTime(100);
    expect(callback).not.toHaveBeenCalled();
  });
});