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

  test("只标大刻度；相邻标注太挤时抽稀，缩放够大时恢复每个大刻度都标", () => {
    const dense = renderToStaticMarkup(<CanvasRulers scope={scope}/>);
    // scale=1 → 大刻度间距 25px，放不下数字，隔一个标一个
    for (const value of [">0<", ">50<", ">250<", ">500<"]) {
      expect(dense).toContain(value);
    }
    expect(dense).not.toContain(">25<");
    expect(dense).not.toContain(">30<");

    // scale=2 → 间距 50px，够宽，每个大刻度都标
    const roomy = renderToStaticMarkup(
      <CanvasRulers scope={{ ...scope, canvasScrollScale: { x: 2, y: 2 }, viewBox: { x: 0, y: 0, width: 500, height: 400 } }}/>
    );
    expect(roomy).toContain(">25<");
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

// ---------------------------------------------------------------------------
// 下面这组补「兜底 + 阈值边界」分支。既有三条用例的夹具里
// canvasScrollScale = {x:1,y:1}、viewBox.width/height 都非零，于是这些分支一次都没走到：
//
//   · L73/L74 `canvasScrollScale?.x/y ?? 1` 的右臂 —— 要走右臂，键必须**不存在**
//     （`{x:1}` 里 `1 ?? 1` 取的是左臂，右臂从未求值）。
//   · L85/L86 `Number(viewBox?.width) || 0` 的右臂 —— 左操作数是 `Number(...)`，
//     恒为数字，falsy 只剩 NaN/0；而 `0 || 0` 与 `0 ?? 0` 产出相同，
//     所以**只有「键不存在」→ NaN** 才能区分 `||` 与 `??`（`NaN ?? 0` 不短路）。
//   · L93 `minorStep < MIN_TICK_GAP ? step : minorStep` 的真分支 —— 5×scale < 4，即 scale < 0.8。
//
// 每个断言都按轴分开取值（另一轴给一个明显不同的值作对照），
// 这样失败时能直接看出是哪一轴、哪个兜底被改坏，而不是「某个数不对」。
const render = (over: Record<string, any>) => renderToStaticMarkup(<CanvasRulers scope={{ ...scope, ...over }}/>);

// 取某条尺子 div 的 style 属性原文。CSS 变量（--ruler-*-step）就写在里面。
function rulerStyle(html: string, name: string): string {
  const marker = `class="canvas-ruler canvas-ruler-${name}" style="`;
  const start = html.indexOf(marker);
  if (start < 0) throw new Error(`尺子 ${name} 不在渲染结果里`);
  const from = start + marker.length;
  return html.slice(from, html.indexOf('"', from));
}

function rulerVars(html: string, name: string): { major: string; minor: string } {
  const style = rulerStyle(html, name);
  const pick = (re: RegExp) => {
    const hit = re.exec(style)?.[1];
    if (hit === undefined) throw new Error(`尺子 ${name} 的 style 里没有 ${re}`);
    return hit;
  };
  return {
    major: pick(/--ruler-major-step:([^;]+)/),
    minor: pick(/--ruler-minor-step:([^;]+)/)
  };
}

// 某条尺子内部的标注个数（尺子 div 里只有 label span，故 </div> 就是它自己的闭合标签）
function labelCount(html: string, name: string): number {
  const marker = `class="canvas-ruler canvas-ruler-${name}" style="`;
  const start = html.indexOf(marker);
  if (start < 0) throw new Error(`尺子 ${name} 不在渲染结果里`);
  const open = html.indexOf(">", start);
  const inner = html.slice(open + 1, html.indexOf("</div>", open));
  return (inner.match(/canvas-ruler-label/g) ?? []).length;
}

describe("CanvasRulers 兜底与阈值分支", () => {
  test("canvasScrollScale 缺 x / 缺 y 键时各自兜底为 1（另一轴取 4 作对照）", () => {
    // 缺 x：scaleX 走 `?? 1` 右臂 → 步长 25/5；scaleY=4 是对照组（100/20）
    expect({
      x: rulerVars(render({ canvasScrollScale: { y: 4 } }), "top"),
      y: rulerVars(render({ canvasScrollScale: { y: 4 } }), "left")
    }).toEqual({ x: { major: "25px", minor: "5px" }, y: { major: "100px", minor: "20px" } });

    // 缺 y：对称地断言一次，否则 L74 那条右臂仍无人看守
    expect({
      x: rulerVars(render({ canvasScrollScale: { x: 4 } }), "top"),
      y: rulerVars(render({ canvasScrollScale: { x: 4 } }), "left")
    }).toEqual({ x: { major: "100px", minor: "20px" }, y: { major: "25px", minor: "5px" } });
  });

  test("scale 为 0 是 falsy 但非 nullish：`??` 不兜底、`||` 会兜底成 1", () => {
    // 能区分 `||` 与 `??` 的输入只有 "" / 0 / -0 / false / NaN（§6.18）。
    // 0 是这里唯一能用的档：scaleX=0 → 步长 0px；若写成 `|| 1` 则变成 25px。
    expect({
      x: rulerVars(render({ canvasScrollScale: { x: 0, y: 4 } }), "top"),
      y: rulerVars(render({ canvasScrollScale: { x: 0, y: 4 } }), "left")
    }).toEqual({ x: { major: "0px", minor: "0px" }, y: { major: "100px", minor: "20px" } });
  });

  test("viewBox 缺 width 键时 viewRight 兜底为 0，X 轴只剩起点一个标注", () => {
    // viewRight = 0 + (Number(undefined) || 0) = 0 → canvasRulerTicks(0, 0, 25) 只回 [0]。
    // 改成 `?? 0` 则 Number(undefined)=NaN 不短路 → viewRight=NaN → 刻度直接为空数组。
    const html = render({ viewBox: { x: 0, y: 0, height: 400 } });
    // y 轴对照组：viewBottom=400 → 17 个刻度、抽稀后 9 个
    expect({ x: labelCount(html, "top"), y: labelCount(html, "left") }).toEqual({ x: 1, y: 9 });
  });

  test("viewBox 缺 height 键时 viewBottom 兜底为 0，Y 轴只剩起点一个标注", () => {
    const html = render({ viewBox: { x: 0, y: 0, width: 500 } });
    // x 轴对照组：viewRight=500 → 21 个刻度、抽稀后 11 个
    expect({ x: labelCount(html, "top"), y: labelCount(html, "left") }).toEqual({ x: 11, y: 1 });
  });

  test("细刻度间距小于 4px 时退化成粗刻度间距；恰好等于 4px 时不退化", () => {
    // scale=0.5 → minorStep=2.5 < MIN_TICK_GAP(4) → 细刻度取粗刻度的 12.5px
    expect(rulerVars(render({ canvasScrollScale: { x: 0.5, y: 0.5 } }), "top")).toEqual({
      major: "12.5px",
      minor: "12.5px"
    });
    // scale=0.8 → minorStep = 5*0.8 === 4，恰好压在阈值上 → 仍取 minorStep（4px，不是 20px）
    expect(rulerVars(render({ canvasScrollScale: { x: 0.8, y: 0.8 } }), "top")).toEqual({
      major: "20px",
      minor: "4px"
    });
  });
});
