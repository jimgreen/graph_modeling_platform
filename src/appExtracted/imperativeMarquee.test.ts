import { describe, expect, test } from "vitest";
import {
  applyGpuWheelZoomPreview,
  applyImperativeMarqueeRect,
  clearGpuWheelZoomPreview
} from "./imperativeMarquee";

function createMockSvgElement() {
  const attrs: Record<string, string> = {};
  const style: Record<string, string> = {};
  return {
    attrs,
    style,
    setAttribute(name: string, value: string) {
      attrs[name] = value;
    }
  };
}

describe("applyImperativeMarqueeRect", () => {
  test("正向与反向拖选均正确计算 x/y/width/height 并显示", () => {
    const el = createMockSvgElement();
    applyImperativeMarqueeRect(el as unknown as SVGRectElement, {
      start: { x: 200, y: 150 },
      current: { x: 80, y: 260 }
    });
    expect(el.attrs).toEqual({ x: "80", y: "150", width: "120", height: "110" });
    expect(el.style.display).toBe("");
  });

  test("传入 null 时隐藏并归零尺寸", () => {
    const el = createMockSvgElement();
    applyImperativeMarqueeRect(el as unknown as SVGRectElement, null);
    expect(el.style.display).toBe("none");
    expect(el.attrs.width).toBe("0");
    expect(el.attrs.height).toBe("0");
  });
});

describe("GPU wheel zoom preview helpers", () => {
  test("按锚点百分比设置 transformOrigin 与 scale，clear 后完全复位", () => {
    const svg = createMockSvgElement();
    applyGpuWheelZoomPreview(svg as unknown as SVGSVGElement, {
      anchorPoint: { x: 500, y: 250 },
      canvasBounds: { width: 1000, height: 1000 },
      visualScale: 1.25
    });
    expect(svg.style.transformOrigin).toBe("50.0000% 25.0000%");
    expect(svg.style.transform).toBe("scale(1.25)");

    clearGpuWheelZoomPreview(svg as unknown as SVGSVGElement);
    expect(svg.style.transform).toBe("");
    expect(svg.style.transformOrigin).toBe("");
  });
});
