// createCurrentViewBoxFromCanvasFrameScroll：把画布框的滚动位置换算成当前视口 viewBox。
// 关键：滚动量先夹到 [0, scrollWidth-clientWidth]，否则「内容比视口小」时
// 负的 maxScroll 会把视口算成负尺寸。
import { describe, expect, test, vi } from "vitest";

import { createCurrentViewBoxFromCanvasFrameScroll } from "./appExtracted/appGraphMeasurementFactories";

function createScope(frame: any) {
  const scope: Record<string, any> = {
    canvasBoundsRef: { current: { width: 1000, height: 800 } },
    canvasFrameRef: { current: frame },
    canvasHorizontalScrollbarsActiveRef: { current: false },
    canvasVerticalScrollbarsActiveRef: { current: true },
    viewBoxRef: { current: { x: 0, y: 0, width: 1000, height: 800 } },
    canvasViewBoxFromFrameScrollPosition: vi.fn((args: any) => ({ ...args }))
  };
  scope.currentViewBoxFromCanvasFrameScroll = createCurrentViewBoxFromCanvasFrameScroll(scope);
  return scope;
}

const frame = (scrollLeft: number, scrollTop: number, scrollWidth: number, scrollHeight: number, clientWidth: number, clientHeight: number) => ({
  scrollLeft,
  scrollTop,
  scrollWidth,
  scrollHeight,
  clientWidth,
  clientHeight
});

describe("createCurrentViewBoxFromCanvasFrameScroll", () => {
  test("画布框未挂载时回退到当前 viewBox", () => {
    const scope = createScope(null);
    const before = scope.viewBoxRef.current;

    expect(scope.currentViewBoxFromCanvasFrameScroll()).toBe(before);
    expect(scope.canvasViewBoxFromFrameScrollPosition).not.toHaveBeenCalled();
  });

  test("把滚动位置与最大滚动量一起交给换算函数", () => {
    const scope = createScope(frame(50, 30, 2000, 1600, 1000, 800));

    const result = scope.currentViewBoxFromCanvasFrameScroll();

    expect(result).toMatchObject({
      scrollLeft: 50,
      scrollTop: 30,
      maxScrollLeft: 1000,
      maxScrollTop: 800
    });
  });

  test("内容比视口小时最大滚动量夹到 0（不出现负值）", () => {
    const scope = createScope(frame(0, 0, 400, 300, 1000, 800));

    expect(scope.currentViewBoxFromCanvasFrameScroll()).toMatchObject({ maxScrollLeft: 0, maxScrollTop: 0 });
  });

  test("恰好等尺寸时最大滚动量为 0", () => {
    const scope = createScope(frame(0, 0, 1000, 800, 1000, 800));

    expect(scope.currentViewBoxFromCanvasFrameScroll()).toMatchObject({ maxScrollLeft: 0, maxScrollTop: 0 });
  });

  test("滚动条可见性按各自方向透传", () => {
    const scope = createScope(frame(0, 0, 2000, 1600, 1000, 800));

    expect(scope.currentViewBoxFromCanvasFrameScroll()).toMatchObject({
      horizontalScrollbarsActive: false,
      verticalScrollbarsActive: true
    });
  });

  test("当前 viewBox 与画布尺寸作为基准传入", () => {
    const scope = createScope(frame(0, 0, 2000, 1600, 1000, 800));

    const result = scope.currentViewBoxFromCanvasFrameScroll();

    expect(result.currentViewBox).toBe(scope.viewBoxRef.current);
    expect(result.canvasBounds).toEqual({ width: 1000, height: 800 });
  });

  test("每调一次都重新读滚动位置（不缓存）", () => {
    const element = frame(10, 10, 2000, 1600, 1000, 800);
    const scope = createScope(element);

    scope.currentViewBoxFromCanvasFrameScroll();
    element.scrollLeft = 90;
    const second = scope.currentViewBoxFromCanvasFrameScroll();

    expect(scope.canvasViewBoxFromFrameScrollPosition).toHaveBeenNthCalledWith(1, expect.objectContaining({ scrollLeft: 10 }));
    expect(second).toMatchObject({ scrollLeft: 90 });
  });
});
