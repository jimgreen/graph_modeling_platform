// 画布框内边距偏移与「适配视图」的两侧让位。
// 两条都依赖真实 DOM 实测而不是读 CSS 变量：媒体查询改宽度、面板隐藏、padding/border 都能跟上。
// 浮层面板在 auto 模式下靠 transform 移出视口（display 仍是 flex），所以「有没有 visible 类」才是判据。
import { afterEach, describe, expect, test, vi } from "vitest";

import {
  canvasFitSideInsetsFromDom,
  canvasFramePaddingOffset
} from "./appExtracted/appCoreCanvasUtilities";

const rect = (left: number, top: number, width = 0, height = 0) => ({ left, top, right: left + width, bottom: top + height, width, height });

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("canvasFramePaddingOffset", () => {
  const frame = (scrollLeft: number, scrollTop: number) => ({ scrollLeft, scrollTop }) as any;

  test("有 SVG 时用「滚动量 + SVG 相对画布框的偏移」", () => {
    const element = frame(10, 20);
    element.getBoundingClientRect = () => rect(100, 200, 400, 300);
    const svg = { getBoundingClientRect: () => rect(130, 215, 360, 260) } as any;

    expect(canvasFramePaddingOffset(element, svg)).toEqual({ left: 40, top: 35 });
  });

  test("负偏移被夹到 0（不产生负内边距）", () => {
    const element = frame(0, 0);
    element.getBoundingClientRect = () => rect(100, 100, 400, 300);
    const svg = { getBoundingClientRect: () => rect(80, 80, 400, 300) } as any;

    expect(canvasFramePaddingOffset(element, svg)).toEqual({ left: 0, top: 0 });
  });

  test("没有 SVG 时退回计算样式里的 padding", () => {
    vi.stubGlobal("window", { getComputedStyle: () => ({ paddingLeft: "12px", paddingTop: "8px" }) });
    const element = frame(0, 0);

    expect(canvasFramePaddingOffset(element, null)).toEqual({ left: 12, top: 8 });
  });

  test("padding 写的是无单位数字也能解析", () => {
    vi.stubGlobal("window", { getComputedStyle: () => ({ paddingLeft: "12", paddingTop: "8" }) });

    expect(canvasFramePaddingOffset(frame(0, 0), null)).toEqual({ left: 12, top: 8 });
  });

  test("padding 为空 / 非数字时按 0 处理", () => {
    vi.stubGlobal("window", { getComputedStyle: () => ({ paddingLeft: "", paddingTop: "auto" }) });

    expect(canvasFramePaddingOffset(frame(0, 0), null)).toEqual({ left: 0, top: 0 });
  });

  test("有 SVG 时不读计算样式", () => {
    const getComputedStyle = vi.fn(() => ({ paddingLeft: "99px" }));
    vi.stubGlobal("window", { getComputedStyle });
    const element = frame(0, 0);
    element.getBoundingClientRect = () => rect(0, 0, 400, 300);
    const svg = { getBoundingClientRect: () => rect(10, 10, 380, 280) } as any;

    canvasFramePaddingOffset(element, svg);

    expect(getComputedStyle).not.toHaveBeenCalled();
  });
});

describe("canvasFitSideInsetsFromDom", () => {
  function stubDom(elements: Record<string, any>) {
    const querySelector = vi.fn((selector: string) => elements[selector] ?? null);
    vi.stubGlobal("document", { querySelector });
    return querySelector;
  }

  const panel = (width: number, classes: string[] = []) => ({
    classList: { contains: (name: string) => classes.includes(name) },
    getBoundingClientRect: () => rect(0, 0, width, 800)
  });

  test("两侧面板都在时给出左右让位", () => {
    stubDom({ ".library-panel": panel(300), ".inspector-panel": panel(280) });

    const insets = canvasFitSideInsetsFromDom();

    expect(insets.left).toBeGreaterThanOrEqual(300);
    expect(insets.right).toBeGreaterThanOrEqual(280);
  });

  test("面板缺失时只剩边距让位", () => {
    stubDom({});

    // canvasFitPanelInset 在宽度 0 时仍给固定边距（画布不贴边）
    expect(canvasFitSideInsetsFromDom()).toEqual({ left: 20, right: 20 });
  });

  test("浮层面板没有 visible 类时不占视野（让位只剩边距）", () => {
    stubDom({
      ".library-panel": panel(300, ["floating-side-panel"]),
      ".inspector-panel": panel(280)
    });

    expect(canvasFitSideInsetsFromDom().left).toBe(20);
  });

  test("浮层面板带 visible 类时按实测宽度让位", () => {
    stubDom({
      ".library-panel": panel(300, ["floating-side-panel", "visible"]),
      ".inspector-panel": panel(280)
    });

    expect(canvasFitSideInsetsFromDom().left).toBeGreaterThanOrEqual(300);
  });

  test("两侧让位不相等（左右面板宽度可以不同）", () => {
    stubDom({ ".library-panel": panel(300), ".inspector-panel": panel(280) });

    const insets = canvasFitSideInsetsFromDom();

    expect(insets.left).not.toBe(insets.right);
  });

  test("无 document 时（SSR）只给边距让位", () => {
    vi.stubGlobal("document", undefined);

    expect(canvasFitSideInsetsFromDom()).toEqual({ left: 20, right: 20 });
  });
});
