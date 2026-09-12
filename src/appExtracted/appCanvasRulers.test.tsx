// 刻度尺的 SSR 断言：结构（四条尺子 + 四角补块）与贴边标签的对齐方式。
// 贴边标签若仍居中，半边会被尺子的 overflow 裁掉 —— 左上角的 0 就是这么被截断的。
import { describe, expect, test } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { CanvasRulers } from "./appCanvasRulers";

const scope = {
  canvasDisplayOffsetX: 100,
  canvasDisplayOffsetY: 100,
  canvasDisplayWidth: 500,
  canvasDisplayHeight: 400,
  canvasScrollScale: { x: 1, y: 1 },
  viewBox: { x: 0, y: 0, width: 500, height: 400 }
};

describe("CanvasRulers", () => {
  test("四边尺子与四个角块都在", () => {
    const html = renderToStaticMarkup(<CanvasRulers scope={scope}/>);
    for (const className of ["canvas-ruler-top", "canvas-ruler-bottom", "canvas-ruler-left", "canvas-ruler-right"]) {
      expect(html).toContain(className);
    }
    expect((html.match(/canvas-ruler-corner/g) ?? [])).toHaveLength(4);
  });

  test("刻度值只标大刻度，只给可见范围内的刻度配数字", () => {
    const html = renderToStaticMarkup(<CanvasRulers scope={scope}/>);
    // 0 / 25 / 250 / 500 都在；非 25 倍数的值不该出现为标签
    for (const value of [">0<", ">25<", ">250<", ">500<"]) {
      expect(html).toContain(value);
    }
    expect(html).not.toContain(">30<");
  });

  test("贴边刻度不居中（左上角的 0 才能整段显示），中段仍居中", () => {
    const html = renderToStaticMarkup(<CanvasRulers scope={scope}/>);
    // 起点：X 尺子左对齐、Y 尺子上对齐（React 对数值 0 序列化成 left:0）
    expect(html).toContain("left:0;transform:translateX(0)");
    expect(html).toContain("top:0;transform:translateY(0)");
    // 终点：右/下对齐
    expect(html).toContain("transform:translateX(-100%)");
    expect(html).toContain("transform:translateY(-100%)");
    // 中段保持居中
    expect(html).toContain("transform:translateX(-50%)");
    expect(html).toContain("transform:translateY(-50%)");
  });
});
