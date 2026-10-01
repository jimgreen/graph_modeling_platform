// createSetContextMarqueeSelection 与图形右键菜单「已处理」标志的一次性语义。
// 标志位靠 setTimeout(0) 自动过期 + 显式 consume 清位，两条路径都要盖。
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import {
  createConsumeGraphicContextMenuHandled,
  createMarkGraphicContextMenuHandled,
  createSetContextMarqueeSelection
} from "./appExtracted/appGraphMeasurementFactories";

describe("createSetContextMarqueeSelection", () => {
  test("ref 与 state 同时写入", () => {
    const setContextMarqueeSelectionState = vi.fn();
    const contextMarqueeSelectionRef: { current: any } = { current: null };
    const next = { active: true, rect: { x: 0, y: 0, width: 10, height: 10 } };

    createSetContextMarqueeSelection({ contextMarqueeSelectionRef, setContextMarqueeSelectionState })(next);

    expect(contextMarqueeSelectionRef.current).toBe(next);
    expect(setContextMarqueeSelectionState).toHaveBeenCalledWith(next);
  });
});

describe("图形右键菜单 handled 标志", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // 测试环境是 node（vite.config.ts: environment: "node"，无 jsdom），补一个最小 window。
    vi.stubGlobal("window", { setTimeout, clearTimeout });
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  function createScope() {
    return {
      canvasGraphicContextMenuHandledRef: { current: false },
      canvasGraphicContextMenuHandledTimerRef: { current: null as any }
    };
  }

  test("mark 置位，下一个宏任务自动过期", () => {
    const scope = createScope();
    const consume = createConsumeGraphicContextMenuHandled(scope);
    const mark = createMarkGraphicContextMenuHandled(scope);

    mark();
    expect(scope.canvasGraphicContextMenuHandledRef.current).toBe(true);
    expect(consume()).toBe(true);

    mark();
    vi.runAllTimers();
    expect(scope.canvasGraphicContextMenuHandledRef.current).toBe(false);
    expect(scope.canvasGraphicContextMenuHandledTimerRef.current).toBe(null);
  });

  test("consume 读一次即清位（第二次读到 false）", () => {
    const scope = createScope();
    const mark = createMarkGraphicContextMenuHandled(scope);
    const consume = createConsumeGraphicContextMenuHandled(scope);

    mark();
    expect(consume()).toBe(true);
    expect(consume()).toBe(false);
  });

  test("consume 会取消待触发的过期定时器，不留悬空 timer", () => {
    const scope = createScope();
    const mark = createMarkGraphicContextMenuHandled(scope);
    const consume = createConsumeGraphicContextMenuHandled(scope);

    mark();
    const pending = scope.canvasGraphicContextMenuHandledTimerRef.current;
    expect(pending).not.toBe(null);

    consume();
    expect(scope.canvasGraphicContextMenuHandledTimerRef.current).toBe(null);
    // 定时器已被 clear：跑完所有定时器也不会把已清位的标志再写一次
    vi.runAllTimers();
    expect(scope.canvasGraphicContextMenuHandledRef.current).toBe(false);
  });

  test("未 mark 就 consume 返回 false 且不排定时器", () => {
    const scope = createScope();
    const consume = createConsumeGraphicContextMenuHandled(scope);

    expect(consume()).toBe(false);
    expect(scope.canvasGraphicContextMenuHandledTimerRef.current).toBe(null);
  });
});
