// 画布边界变化的滚动锚点同步：mark → 记下当前滚动位置 → 两帧后释放。
// 「两帧」而不是一帧是刻意的（等浏览器把新尺寸落地），少一帧就会用旧 scrollLeft 做锚点。
// 依赖 window.requestAnimationFrame / cancelAnimationFrame，测试环境是 node，需补桩。
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import {
  createCancelCanvasBoundsScrollSyncPendingRelease,
  createClearCanvasBoundsScrollSyncPending,
  createMarkCanvasBoundsScrollSyncPending,
  createReleaseCanvasBoundsScrollSyncPending
} from "./appExtracted/appGraphMeasurementFactories";

describe("画布边界滚动同步 pending", () => {
  let frames: Array<() => void>;

  beforeEach(() => {
    frames = [];
    vi.stubGlobal("window", {
      requestAnimationFrame: vi.fn((cb: () => void) => {
        frames.push(cb);
        return frames.length;
      }),
      cancelAnimationFrame: vi.fn()
    });
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function createScope(options: { hotzoneRect?: any } = {}) {
    const scope: Record<string, any> = {
      canvasBoundsScrollSyncPendingRef: { current: false },
      canvasBoundsScrollSyncPendingFrameRef: { current: null },
      pendingCanvasBoundsScrollAnchorRef: { current: null },
      canvasFrameRef: {
        current: options.hotzoneRect
          ? { querySelector: () => ({ getBoundingClientRect: () => options.hotzoneRect }) }
          : { querySelector: () => null }
      }
    };
    scope.cancelCanvasBoundsScrollSyncPendingRelease = createCancelCanvasBoundsScrollSyncPendingRelease(scope);
    scope.clearCanvasBoundsScrollSyncPending = createClearCanvasBoundsScrollSyncPending(scope);
    scope.releaseCanvasBoundsScrollSyncPending = createReleaseCanvasBoundsScrollSyncPending(scope);
    scope.markCanvasBoundsScrollSyncPending = createMarkCanvasBoundsScrollSyncPending(scope);
    return scope;
  }

  test("mark 置位并排一次释放", () => {
    const scope = createScope();

    scope.markCanvasBoundsScrollSyncPending();

    expect(scope.canvasBoundsScrollSyncPendingRef.current).toBe(true);
    expect(frames).toHaveLength(1);
  });

  test("mark 时记下画布框当前滚动位置作锚点", () => {
    const scope = createScope();
    scope.canvasFrameRef.current.scrollLeft = 30;
    scope.canvasFrameRef.current.scrollTop = 40;

    scope.markCanvasBoundsScrollSyncPending();

    expect(scope.pendingCanvasBoundsScrollAnchorRef.current).toEqual({ left: 30, top: 40, visualRect: undefined });
  });

  test("热区层存在时把视觉矩形一起记进锚点", () => {
    const scope = createScope({ hotzoneRect: { left: 5, top: 6, width: 100, height: 50 } });
    scope.canvasFrameRef.current.scrollLeft = 1;
    scope.canvasFrameRef.current.scrollTop = 2;

    scope.markCanvasBoundsScrollSyncPending();

    expect(scope.pendingCanvasBoundsScrollAnchorRef.current.visualRect).toEqual({ left: 5, top: 6, width: 100, height: 50 });
  });

  test("已有锚点时不覆盖（连续两次 mark 保留第一次的锚点）", () => {
    const scope = createScope();
    scope.canvasFrameRef.current.scrollLeft = 7;
    scope.markCanvasBoundsScrollSyncPending();
    scope.canvasBoundsScrollSyncPendingFrameRef.current = null;

    scope.canvasFrameRef.current.scrollLeft = 99;
    scope.markCanvasBoundsScrollSyncPending();

    expect(scope.pendingCanvasBoundsScrollAnchorRef.current).toMatchObject({ left: 7 });
  });

  test("释放要两帧才真正清位", () => {
    const scope = createScope();
    scope.markCanvasBoundsScrollSyncPending();

    frames.shift()!();
    expect(scope.canvasBoundsScrollSyncPendingRef.current).toBe(true);

    frames.shift()!();
    expect(scope.canvasBoundsScrollSyncPendingRef.current).toBe(false);
    expect(scope.pendingCanvasBoundsScrollAnchorRef.current).toBeNull();
    expect(scope.canvasBoundsScrollSyncPendingFrameRef.current).toBeNull();
  });

  test("取消释放会撤掉待执行的那一帧", () => {
    const scope = createScope();
    scope.markCanvasBoundsScrollSyncPending();

    scope.cancelCanvasBoundsScrollSyncPendingRelease();

    expect(window.cancelAnimationFrame).toHaveBeenCalledWith(1);
    expect(scope.canvasBoundsScrollSyncPendingFrameRef.current).toBeNull();
    // pending 标志本身不被取消影响，仍待清理
    expect(scope.canvasBoundsScrollSyncPendingRef.current).toBe(true);
  });

  test("无待执行帧时取消是空操作", () => {
    const scope = createScope();

    scope.cancelCanvasBoundsScrollSyncPendingRelease();

    expect(window.cancelAnimationFrame).not.toHaveBeenCalled();
  });

  test("clear 同时清标志、清锚点并撤帧", () => {
    const scope = createScope();
    scope.markCanvasBoundsScrollSyncPending();

    scope.clearCanvasBoundsScrollSyncPending();

    expect(scope.canvasBoundsScrollSyncPendingRef.current).toBe(false);
    expect(scope.pendingCanvasBoundsScrollAnchorRef.current).toBeNull();
    expect(scope.canvasBoundsScrollSyncPendingFrameRef.current).toBeNull();
  });
});
