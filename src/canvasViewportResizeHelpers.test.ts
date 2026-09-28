// canvasViewport 三个剩余零直呼函数的直接单测。
//
// 三个函数构成「画布按边/角拖拽改变尺寸」这条链路的末端：
//
//   canvasResizeKeepsScrollRange(drag, axis)   该轴原本有滚动条吗（决定要不要保留滚动范围）
//   canvasResizeOriginShiftForBounds(edge, …)  拖拽后原点该往哪挪（否则画布会漂移）
//   canvasFullViewBoxFromBounds(bounds)        整个画布的 viewBox（x/y 恒 0）
//
// 判错的后果是**画布在拖拽时漂移或滚动条消失** —— 纯交互问题，不抛异常、
// 不打日志，最难靠肉眼定位。
import { describe, expect, test } from "vitest";
import {
  canvasFullViewBoxFromBounds,
  canvasResizeKeepsScrollRange,
  canvasResizeOriginShiftForBounds,
  type CanvasResizeEdge
} from "./canvasViewport";
import type { CanvasBounds } from "./model";

const bounds = (width: number, height: number): CanvasBounds => ({ width, height });

// `CanvasBounds` 只有 width/height 两个字段（**无 x/y**）——
// 探针实测确认。所以"起点位置不同但尺寸差相同"只能靠额外字段构造。
const boundsAt = (width: number, height: number, x: number, y: number) =>
  ({ width, height, x, y }) as unknown as CanvasBounds;

describe("canvasResizeKeepsScrollRange：读拖拽开始时的滚动条状态", () => {
  test("drag 为 null → 两轴都 false（没在拖拽就没有滚动范围可言）", () => {
    expect(canvasResizeKeepsScrollRange(null, "x")).toBe(false);
    expect(canvasResizeKeepsScrollRange(null, "y")).toBe(false);
  });

  test("按 axis 取对应字段（4 种组合逐条核对）", () => {
    const cases: Array<[boolean, boolean, boolean, boolean]> = [
      // h,    v,    x,    y
      [true, false, true, false],
      [false, true, false, true],
      [true, true, true, true],
      [false, false, false, false]
    ];
    for (const [h, v, x, y] of cases) {
      const drag = { startHorizontalScrollbarsActive: h, startVerticalScrollbarsActive: v };
      expect(canvasResizeKeepsScrollRange(drag, "x"), `h=${h} v=${v} x`).toBe(x);
      expect(canvasResizeKeepsScrollRange(drag, "y"), `h=${h} v=${v} y`).toBe(y);
    }
  });

  test("★ 读的是**拖拽开始时**的状态（字段名带 start 前缀，不是当前状态）", () => {
    // 契约：resize 过程中滚动条状态会变，但这里必须用开始时的快照，
    // 否则拖到一半滚动条消失会导致范围突然丢失。
    const drag = { startHorizontalScrollbarsActive: true, startVerticalScrollbarsActive: false };
    // 只传这两个字段（没有"当前状态"字段）—— 说明实现确实只读快照
    expect(Object.keys(drag)).toEqual(["startHorizontalScrollbarsActive", "startVerticalScrollbarsActive"]);
    expect(canvasResizeKeepsScrollRange(drag, "x")).toBe(true);
  });

  test("非法 axis → 走 y 分支（三元的固有性质）", () => {
    const drag = { startHorizontalScrollbarsActive: true, startVerticalScrollbarsActive: false };
    // 非 "x" 即 y，与 canvasResizeEdgeAnchorsStart 同一形态
    expect(canvasResizeKeepsScrollRange(drag, "z" as never)).toBe(false);
    expect(canvasResizeKeepsScrollRange(drag, undefined as never)).toBe(false);
  });

  test("返回值恒为 boolean", () => {
    const drag = { startHorizontalScrollbarsActive: true, startVerticalScrollbarsActive: true };
    for (const axis of ["x", "y"] as const) {
      expect(typeof canvasResizeKeepsScrollRange(drag, axis)).toBe("boolean");
      expect(typeof canvasResizeKeepsScrollRange(null, axis)).toBe("boolean");
    }
  });
});

describe("canvasFullViewBoxFromBounds：x/y 恒归零，只透传尺寸", () => {
  test("正常尺寸", () => {
    expect(canvasFullViewBoxFromBounds(bounds(100, 200))).toEqual({ x: 0, y: 0, width: 100, height: 200 });
  });

  test("★ x/y 被**强制归零**，不继承 bounds 上的同名字段", () => {
    // 这正是函数名的含义：整个画布的 viewBox 从原点开始。
    // 若改成继承 x/y，「整画布视图」的定位就错了。
    // 注：`CanvasBounds` 类型本身只有 width/height，这里用额外字段验证防御性。
    const withOffset = canvasFullViewBoxFromBounds(boundsAt(100, 200, 50, -30));
    expect(withOffset).toEqual({ x: 0, y: 0, width: 100, height: 200 });
    expect(withOffset.x).toBe(0);
    expect(withOffset.y).toBe(0);
  });

  test("零尺寸与负尺寸原样透传（不做钳制）", () => {
    expect(canvasFullViewBoxFromBounds(bounds(0, 0))).toEqual({ x: 0, y: 0, width: 0, height: 0 });
    expect(canvasFullViewBoxFromBounds(bounds(-100, -200))).toEqual({ x: 0, y: 0, width: -100, height: -200 });
  });

  test("小数尺寸**不取整**（原样透传）", () => {
    expect(canvasFullViewBoxFromBounds(bounds(100.5, 200.7))).toEqual({ x: 0, y: 0, width: 100.5, height: 200.7 });
  });

  test("只挑 4 个键（bounds 的其它字段不外泄）", () => {
    const extra = { ...boundsAt(100, 200, 5, 6), someOtherField: "x" } as unknown as CanvasBounds;
    expect(Object.keys(canvasFullViewBoxFromBounds(extra)).sort()).toEqual(["height", "width", "x", "y"]);
  });
});

describe("canvasResizeOriginShiftForBounds：只有锚定轴才偏移", () => {
  const start = bounds(100, 100);

  test("单轴：与 canvasResizeEdgeAnchorsStart 的锚定判定一致", () => {
    expect(canvasResizeOriginShiftForBounds("right", start, bounds(200, 100))).toEqual({ x: 0, y: 0 });
    expect(canvasResizeOriginShiftForBounds("left", start, bounds(200, 100))).toEqual({ x: 100, y: 0 });
    expect(canvasResizeOriginShiftForBounds("top", start, bounds(100, 200))).toEqual({ x: 0, y: 100 });
    expect(canvasResizeOriginShiftForBounds("bottom", start, bounds(100, 200))).toEqual({ x: 0, y: 0 });
  });

  test("双轴 corner：两轴都偏移（锚定左上角）", () => {
    expect(canvasResizeOriginShiftForBounds("top-left", start, bounds(200, 200))).toEqual({ x: 100, y: 100 });
  });

  test("混合 corner：只偏移被锚定的那一轴", () => {
    expect(canvasResizeOriginShiftForBounds("top-right", start, bounds(200, 200))).toEqual({ x: 0, y: 100 });
    expect(canvasResizeOriginShiftForBounds("bottom-left", start, bounds(200, 200))).toEqual({ x: 100, y: 0 });
  });

  test("`corner` 两轴都不偏移", () => {
    expect(canvasResizeOriginShiftForBounds("corner", start, bounds(200, 200))).toEqual({ x: 0, y: 0 });
  });

  test("★ 变窄产生**负**偏移（方向对称）", () => {
    expect(canvasResizeOriginShiftForBounds("left", bounds(200, 200), bounds(100, 100))).toEqual({ x: -100, y: 0 });
    expect(canvasResizeOriginShiftForBounds("top", bounds(200, 200), bounds(100, 100))).toEqual({ x: 0, y: -100 });
  });

  test("尺寸不变 → 无偏移", () => {
    expect(canvasResizeOriginShiftForBounds("left", start, bounds(100, 100))).toEqual({ x: 0, y: 0 });
    expect(canvasResizeOriginShiftForBounds("top-left", start, bounds(100, 100))).toEqual({ x: 0, y: 0 });
  });

  test("★ 偏移量经 `Math.round`（0.4 → 0，0.5 → 1）", () => {
    // Math.round 的取整方向：正 0.5 向上、负 0.5 也向上（即 -0.5 → -0 = 0）。
    // 这是浮点画布尺寸的常见情形（拖拽时尺寸可能是小数）。
    expect(canvasResizeOriginShiftForBounds("left", start, bounds(100.4, 100))).toEqual({ x: 0, y: 0 });
    expect(canvasResizeOriginShiftForBounds("left", start, bounds(100.5, 100))).toEqual({ x: 1, y: 0 });
    // -0.6 → -1（确实向下取整，不是一律归零）
    expect(canvasResizeOriginShiftForBounds("left", bounds(100.6, 100), bounds(100, 100))).toEqual({ x: -1, y: 0 });
  });

  test("★ 负 0.5 的差产出 **`-0` 而非 `0`**（vitest toEqual 用 Object.is 区分）", () => {
    // `Math.round(-0.5)` === -0。这是 JavaScript 的规范行为，不是缺陷：
    // -0 在算术上等于 0，`toBe(0)` 会失败而 `toEqual(0)` 也失败（vitest 区分 ±0）。
    // 显式钉住以免日后有人"顺手"加 `|| 0` 把 -0 归零而无人察觉。
    const out = canvasResizeOriginShiftForBounds("left", bounds(100.5, 100), bounds(100, 100));
    expect(out.x).toBe(-0);
    expect(Object.is(out.x, -0), "确实是 -0").toBe(true);
    // 数值上仍等于 0
    expect(out.x === 0).toBe(true);
    // y 轴未被锚定，保持正常的 +0
    expect(Object.is(out.y, -0), "y 应是 +0").toBe(false);
  });

  test("全 8 个 edge × 2 轴：偏移轴数与锚定判定严格对应", () => {
    const edges: CanvasResizeEdge[] = ["right", "bottom", "corner", "left", "top", "top-left", "top-right", "bottom-left"];
    for (const edge of edges) {
      const out = canvasResizeOriginShiftForBounds(edge, start, bounds(200, 200));
      const expectedX = edge.includes("left") ? 100 : 0;
      const expectedY = edge.includes("top") ? 100 : 0;
      expect(out, `${edge}`).toEqual({ x: expectedX, y: expectedY });
    }
  });

  test("只依赖**尺寸差**，与 startBounds 上的位置字段无关", () => {
    // start 放在任意位置都应得到相同偏移
    const a = canvasResizeOriginShiftForBounds("left", boundsAt(100, 100, 0, 0), boundsAt(200, 100, 0, 0));
    const b = canvasResizeOriginShiftForBounds("left", boundsAt(100, 100, 999, -999), boundsAt(200, 100, 5, 5));
    expect(a).toEqual(b);
    expect(a).toEqual({ x: 100, y: 0 });
  });

  test("返回值类型为 { x: number; y: number }", () => {
    for (const edge of ["left", "top", "corner", "right"] as CanvasResizeEdge[]) {
      const out = canvasResizeOriginShiftForBounds(edge, start, bounds(200, 200));
      expect(typeof out.x, edge).toBe("number");
      expect(typeof out.y, edge).toBe("number");
    }
  });
});
