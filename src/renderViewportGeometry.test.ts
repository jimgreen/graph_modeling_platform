// 视口渲染边界与画布外沿留白几何。
//
// 这批函数是「画布按可见区批处理渲染」的中枢：外扩多少才不漏画、按什么网格
// 对齐才让视口平移不反复失效、滚动条出现时外沿要留多少、四边滚动条判据是多少。
// 全部是纯函数（无 DOM 依赖，除显式收 HTMLElement 的三个判定外只需字面量矩形），
// 但此前一条直接断言都没有 —— 改坏了只会在真实拖拽时表现为「节点偶发不重绘」。
//
// 数值全部取自 canvasViewport.ts 的真实常量：
//   CANVAS_FRAME_INSET = 16、CANVAS_RULER_SIZE = 24 → canvasOuterInset() = 40
//   CANVAS_SCROLL_EDGE_VIEWPORT_RATIO = 1/3
import { describe, expect, test } from "vitest";
import type { ModelNode } from "./model";
import {
  canvasDisplayOffset,
  canvasFrameHasHorizontalScrollableRange,
  canvasFrameHasScrollableRange,
  canvasFrameHasVerticalScrollableRange,
  canvasFrameViewportSizeChanged,
  canvasScrollEdgeInset,
  canvasScrollScaleFromViewBox,
  canvasScrollSurfaceSize,
  elementTreeCacheSignature,
  estimatedViewportNodeScreenSize,
  expandViewBoxForRendering,
  nextSpatialQueryMark,
  pushRecentGlyph,
  renderedCanvasFullyFitsFrame,
  sameCanvasViewBox,
  snapRenderViewportBoundsForQuery,
  visibleCanvasViewBoxFromRects,
  type SpatialQueryState
} from "./appExtracted/appCoreCanvasUtilities";

// canvasOuterInset() = CANVAS_FRAME_INSET(16) + CANVAS_RULER_SIZE(24)
const OUTER_INSET = 40;

const frameRect = { left: 0, top: 0, right: 400, bottom: 300, width: 400, height: 300 };
// SVG 画布比可视帧大：左边溢出 200、顶端溢出 100。
const svgRect = { left: -200, top: -100, right: 800, bottom: 500, width: 1000, height: 600 };
const viewBox = { x: 0, y: 0, width: 1000, height: 600 };

const node = (width: number, height: number, scale?: Partial<ModelNode>): ModelNode =>
  ({ id: "n", kind: "ac-load", name: "负荷", size: { width, height }, ...scale }) as unknown as ModelNode;

describe("expandViewBoxForRendering：外扩 = max(260, 较长边 × 15%)", () => {
  test("小视口走 260 的固定下限", () => {
    expect(expandViewBoxForRendering({ x: 0, y: 0, width: 1000, height: 800 })).toEqual({
      left: -260,
      right: 1260,
      top: -260,
      bottom: 1060
    });
  });

  test("★ 大视口按较长边比例外扩（15% 超过 260 才生效）", () => {
    expect(expandViewBoxForRendering({ x: 0, y: 0, width: 4000, height: 3000 })).toEqual({
      left: -600,
      right: 4600,
      top: -600,
      bottom: 3600
    });
  });

  test("★ 取较长边：窄而高的视口按高度算外扩（不是按宽）", () => {
    // 宽 100、高 4000：只有按 max(宽, 高) 才得到 4000 × 15% = 600；
    // 误写成 width × 15% 会退化成 260 的固定下限（100 × 15% = 15 < 260）。
    expect(expandViewBoxForRendering({ x: 0, y: 0, width: 100, height: 4000 })).toEqual({
      left: -600,
      right: 700,
      top: -600,
      bottom: 4600
    });
  });

  test("宽而扁时同样按宽算（对照上条，两个方向都要锁）", () => {
    expect(expandViewBoxForRendering({ x: 100, y: 200, width: 4000, height: 100 })).toEqual({
      left: -500,
      right: 4700,
      top: -400,
      bottom: 900
    });
  });

  test("视口原点非零时按原点平移", () => {
    expect(expandViewBoxForRendering({ x: 50, y: -50, width: 100, height: 100 })).toEqual({
      left: -210,
      right: 410,
      top: -310,
      bottom: 310
    });
  });
});

describe("snapRenderViewportBoundsForQuery：向外对齐到网格再各留一格", () => {
  test("默认 256 网格；负坐标走 floor 而非截断", () => {
    expect(snapRenderViewportBoundsForQuery({ left: -10, right: 300, top: -10, bottom: 100 })).toEqual({
      left: -512,
      right: 768,
      top: -512,
      bottom: 512
    });
  });

  test("★ 已在网格线上的边仍各外扩一格（避免平移 1px 就整组失效）", () => {
    expect(snapRenderViewportBoundsForQuery({ left: 0, right: 256, top: 0, bottom: 256 })).toEqual({
      left: -256,
      right: 512,
      top: -256,
      bottom: 512
    });
  });

  test("自定义网格尺寸", () => {
    expect(snapRenderViewportBoundsForQuery({ left: -10, right: 300, top: -10, bottom: 100 }, 100)).toEqual({
      left: -200,
      right: 400,
      top: -200,
      bottom: 200
    });
  });
});

describe("sameCanvasViewBox：四边各自取整后比较", () => {
  const box = (x: number, y: number, width: number, height: number) => ({ x, y, width, height });

  test("亚像素差异被 round 吃掉", () => {
    expect(sameCanvasViewBox(box(0.4, 0.4, 100.4, 50.4), box(0.2, 0.2, 100.2, 50.4))).toBe(true);
  });

  test("★ 跨过取整分界即判不等（50.4 vs 50.6 → 50 vs 51）", () => {
    expect(sameCanvasViewBox(box(0, 0, 100, 50.4), box(0, 0, 100, 50.6))).toBe(false);
  });

  test("★ round 平局向 +∞：0.5 与 -0.5 判不等", () => {
    expect(sameCanvasViewBox(box(0.5, 0, 100, 50), box(-0.5, 0, 100, 50))).toBe(false);
  });

  test("任一边差 1 即不等", () => {
    expect(sameCanvasViewBox(box(0, 0, 100, 50), box(0, 0, 101, 50))).toBe(false);
    expect(sameCanvasViewBox(box(0, 0, 100, 50), box(0, 0, 100, 50))).toBe(true);
  });
});

describe("renderedCanvasFullyFitsFrame：六项各带 1px 容差", () => {
  const frame = { left: 0, top: 0, right: 100, bottom: 100, width: 100, height: 100 };

  test("画布完全在帧内", () => {
    expect(renderedCanvasFullyFitsFrame(frame, { left: 10, top: 10, right: 90, bottom: 90, width: 80, height: 80 })).toBe(true);
  });

  test("与帧完全重合", () => {
    expect(renderedCanvasFullyFitsFrame(frame, { ...frame })).toBe(true);
  });

  test("★ 溢出 2px 即判不贴合（1px 容差内仍算贴合）", () => {
    expect(renderedCanvasFullyFitsFrame(frame, { ...frame, width: 102, right: 102 })).toBe(false);
    expect(renderedCanvasFullyFitsFrame(frame, { ...frame, width: 101, right: 101 })).toBe(true);
  });

  test("★ 左边超出 1px 内仍贴合，超出 2px 不贴合", () => {
    expect(renderedCanvasFullyFitsFrame(frame, { ...frame, left: -1, width: 101, right: 100 })).toBe(true);
    expect(renderedCanvasFullyFitsFrame(frame, { ...frame, left: -2, width: 102, right: 100 })).toBe(false);
  });
});

describe("canvasFrameHas*ScrollableRange：溢出量 > 1 才算可滚", () => {
  const frame = (scrollWidth: number, clientWidth: number, scrollHeight = 500, clientHeight = 500) =>
    ({ scrollWidth, clientWidth, scrollHeight, clientHeight }) as unknown as HTMLElement;

  test("横向溢出 5px → 可滚；溢出 1px → 不可滚", () => {
    expect(canvasFrameHasHorizontalScrollableRange(frame(105, 100))).toBe(true);
    expect(canvasFrameHasHorizontalScrollableRange(frame(101, 100))).toBe(false);
    expect(canvasFrameHasHorizontalScrollableRange(frame(100, 100))).toBe(false);
  });

  test("纵向同理", () => {
    expect(canvasFrameHasVerticalScrollableRange(frame(100, 100, 520, 500))).toBe(true);
    expect(canvasFrameHasVerticalScrollableRange(frame(100, 100, 500, 500))).toBe(false);
  });

  test("合成判定是两者或", () => {
    expect(canvasFrameHasScrollableRange(frame(105, 100))).toBe(true);
    expect(canvasFrameHasScrollableRange(frame(100, 100, 520, 500))).toBe(true);
    expect(canvasFrameHasScrollableRange(frame(100, 100))).toBe(false);
  });
});

describe("canvasFrameViewportSizeChanged：尺寸差 > 1 才算变", () => {
  test("差 1 不算变，差 2 算变", () => {
    const frame = { clientWidth: 800, clientHeight: 600 };
    expect(canvasFrameViewportSizeChanged(frame, { width: 800, height: 600 })).toBe(false);
    expect(canvasFrameViewportSizeChanged(frame, { width: 801, height: 600 })).toBe(false);
    expect(canvasFrameViewportSizeChanged(frame, { width: 802, height: 600 })).toBe(true);
  });

  test("帧未挂载 → 不算变（不抛错）", () => {
    expect(canvasFrameViewportSizeChanged(null, { width: 800, height: 600 })).toBe(false);
  });
});

describe("visibleCanvasViewBoxFromRects：把 CSS 像素可见区换算成 viewBox", () => {
  test("常规换算：帧相对 SVG 偏移 200/100，比例 1:1", () => {
    expect(visibleCanvasViewBoxFromRects(frameRect, svgRect, viewBox)).toEqual({
      x: 200,
      y: 100,
      width: 400,
      height: 300
    });
  });

  test("★ 缩放不为 1 时按 viewBox / svgRect 比值换算", () => {
    // 比例 x = 2000/1000 = 2、y = 600/600 = 1
    expect(visibleCanvasViewBoxFromRects(frameRect, svgRect, { x: 0, y: 0, width: 2000, height: 600 })).toEqual({
      x: 400,
      y: 100,
      width: 800,
      height: 300
    });
  });

  test("★ 退化输入返回**原引用**（调用方据同一性判断「没算出来」）", () => {
    expect(visibleCanvasViewBoxFromRects(frameRect, { ...svgRect, width: 0 }, viewBox)).toBe(viewBox);
    expect(visibleCanvasViewBoxFromRects(frameRect, { ...svgRect, height: 0 }, viewBox)).toBe(viewBox);
    const flat = { x: 0, y: 0, width: 0, height: 600 };
    expect(visibleCanvasViewBoxFromRects(frameRect, svgRect, flat)).toBe(flat);
  });

  test("★ 帧与 SVG 无交集 → 原引用（返回零宽视口会让渲染整片消失）", () => {
    const outside = { left: -900, top: -600, right: -800, bottom: -500, width: 100, height: 100 };
    expect(visibleCanvasViewBoxFromRects(outside, svgRect, viewBox)).toBe(viewBox);
  });

  test("★ 视口大于 SVG 时被 clamp 到 SVG 边界内", () => {
    // 帧四角都在 SVG 之外：leftCss/rightCss 均被夹到 [0, svgRect.width]。
    const bigFrame = { left: -500, top: -400, right: 1200, bottom: 900, width: 1700, height: 1300 };
    expect(visibleCanvasViewBoxFromRects(bigFrame, svgRect, viewBox)).toEqual(viewBox);
  });
});

describe("canvasScrollScaleFromViewBox：非正尺寸回 1", () => {
  test("常规比例", () => {
    expect(canvasScrollScaleFromViewBox({ width: 1000, height: 500 }, { width: 500, height: 250 })).toEqual({ x: 0.5, y: 0.5 });
  });

  test("★ 两轴各自兜底：viewBox 宽为 0 不影响 y", () => {
    expect(canvasScrollScaleFromViewBox({ width: 0, height: 500 }, { width: 500, height: 250 })).toEqual({ x: 1, y: 0.5 });
  });

  test("画布尺寸为 0 → 双轴兜 1", () => {
    expect(canvasScrollScaleFromViewBox({ width: 1000, height: 500 }, { width: 0, height: 0 })).toEqual({ x: 1, y: 1 });
  });
});

describe("estimatedViewportNodeScreenSize：按抽样估算最大屏幕尺寸", () => {
  const scale = { x: 1, y: 1 };

  test("空集 → +Infinity（LOD 不得因为没数据就判定「都很小」）", () => {
    expect(estimatedViewportNodeScreenSize([], scale)).toBe(Number.POSITIVE_INFINITY);
  });

  test("节点自身 scale 与视口 scale 相乘，取两轴最大值", () => {
    expect(estimatedViewportNodeScreenSize([node(40, 20, { scale: 2 })], scale)).toBe(80);
    expect(estimatedViewportNodeScreenSize([node(40, 20, { scale: 2 })], { x: 0.5, y: 2 })).toBe(80);
  });

  test("scaleX / scaleY 各自覆盖对应轴，缺省回 scale", () => {
    expect(estimatedViewportNodeScreenSize([node(40, 20, { scale: 1, scaleX: 3 })], scale)).toBe(120);
    expect(estimatedViewportNodeScreenSize([node(40, 20, { scale: 1, scaleY: 3 })], scale)).toBe(60);
  });

  test("★ 负 scale 取绝对值（镜像节点不会被当成零尺寸）", () => {
    expect(estimatedViewportNodeScreenSize([node(40, 20, { scale: -2 })], scale)).toBe(80);
  });

  test("★ 抽样会漏掉非采样点：10 个节点、limit 4 → 只看 index 0/3/6/9", () => {
    const nodes = Array.from({ length: 10 }, (_, index) => node(index === 1 ? 4000 : 10, 10));
    expect(estimatedViewportNodeScreenSize(nodes, scale, 4)).toBe(10);
    // 把放大倍数挪到一个采样点上，结果立刻跳到 4000 —— 证明抽样语义本身
    expect(estimatedViewportNodeScreenSize(nodes.map((n, i) => (i === 3 ? node(4000, 10) : n)), scale, 4)).toBe(4000);
  });

  test("节点数少于 limit 时 step 为 1，全量扫描", () => {
    const nodes = Array.from({ length: 3 }, (_, index) => node(10, 10, { scale: index + 1 }));
    expect(estimatedViewportNodeScreenSize(nodes, scale, 96)).toBe(30);
  });
});

describe("画布外沿留白：edgeInset / surfaceSize / displayOffset", () => {
  test("edgeInset = max(40, 视口 × ⅓) 取整", () => {
    expect(canvasScrollEdgeInset(120)).toBe(OUTER_INSET);
    expect(canvasScrollEdgeInset(121)).toBe(OUTER_INSET);
    expect(canvasScrollEdgeInset(300)).toBe(100);
    expect(canvasScrollEdgeInset(360)).toBe(120);
    expect(canvasScrollEdgeInset(0)).toBe(OUTER_INSET);
  });

  test("surfaceSize：画布装得下时由视口兜底", () => {
    // 滚动态下 inset = edgeInset(1200) = 400，故 1000 + 800 = 1800 > 1200
    expect(canvasScrollSurfaceSize(1000, 1200, true)).toBe(1800);
    expect(canvasScrollSurfaceSize(500, 800, false)).toBe(800);
  });

  test("surfaceSize：画布装得下时两侧各留一个 inset", () => {
    // 不滚动：inset = 40 → 2000 + 80；滚动：inset = 400 → 2000 + 800
    expect(canvasScrollSurfaceSize(2000, 1200, false)).toBe(2080);
    expect(canvasScrollSurfaceSize(2000, 1200, true)).toBe(2800);
  });

  test("displayOffset：滚动时固定贴 inset，不居中", () => {
    expect(canvasDisplayOffset(1000, 2800, 1200, true)).toBe(400);
  });

  test("displayOffset：不滚动时居中，且有 40 的下限", () => {
    expect(canvasDisplayOffset(500, 1580, 800, false)).toBe(540);
    // 画布只比外接尺寸小一点 → 居中偏移不足 40 时抬到 40
    expect(canvasDisplayOffset(780, 800, 800, false)).toBe(OUTER_INSET);
  });
});

describe("nextSpatialQueryMark：查询代号自增，回绕时清 seenById", () => {
  const state = (mark: number, seen = new Map<string, number>()): SpatialQueryState => ({ mark, seenById: seen });

  test("自增并返回新代号", () => {
    const query = state(0);
    expect(nextSpatialQueryMark(query)).toBe(1);
    expect(nextSpatialQueryMark(query)).toBe(2);
    expect(query.mark).toBe(2);
  });

  test("★ 越过安全整数上限 → 归 1 并清 seenById（否则新旧代号会被误判为同一次查询）", () => {
    const seen = new Map([["n1", 1]]);
    const query = state(Number.MAX_SAFE_INTEGER, seen);
    expect(nextSpatialQueryMark(query)).toBe(1);
    expect(query.seenById.size).toBe(0);
  });
});

describe("elementTreeCacheSignature：图元树缓存键", () => {
  test("三段拼装", () => {
    expect(elementTreeCacheSignature(3, "L1", [{ kind: "ac-bus", label: "母线" } as never])).toBe("3#L1#ac-bus:母线");
  });

  test("模板按 kind:label 逐项拼接，顺序即缓存键的一部分", () => {
    expect(
      elementTreeCacheSignature(0, "", [
        { kind: "ac-bus", label: "母线" } as never,
        { kind: "ac-load", label: "负荷" } as never
      ])
    ).toBe("0##ac-bus:母线|ac-load:负荷");
  });

  test("模板为空 → 第三段留空（不产生悬垂分隔符）", () => {
    expect(elementTreeCacheSignature(7, "L2", [])).toBe("7#L2#");
  });

  test("只有 label 变化才改键（模板改名即缓存失效）", () => {
    expect(elementTreeCacheSignature(1, "L", [{ kind: "ac-bus", label: "母线" } as never])).not.toBe(
      elementTreeCacheSignature(1, "L", [{ kind: "ac-bus", label: "母排" } as never])
    );
  });
});

describe("pushRecentGlyph：去重后置，最多留 10 个", () => {
  test("新项追加到末尾", () => {
    expect(pushRecentGlyph(["a", "b"], "c")).toEqual(["a", "b", "c"]);
  });

  test("★ 已存在则先移除再追加（不是原地去重，顺序即最近使用顺序）", () => {
    expect(pushRecentGlyph(["a", "b", "c"], "a")).toEqual(["b", "c", "a"]);
  });

  test("★ 超过 10 个时丢最旧的（保留末 10）", () => {
    const prev = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11"];
    expect(pushRecentGlyph(prev, "12")).toEqual(["3", "4", "5", "6", "7", "8", "9", "10", "11", "12"]);
  });

  test("不改入参数组", () => {
    const prev = ["a", "b"];
    pushRecentGlyph(prev, "a");
    expect(prev).toEqual(["a", "b"]);
  });
});