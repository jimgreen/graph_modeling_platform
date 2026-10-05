// model-canvas-ops 的纯几何函数测试。
//
// 此前这些函数在别处**只以 mock 形式出现**（如 appCanvasInteractionFactories.test.ts
// 里的 `clampNodePositionToBounds: vi.fn((_n,_b,pos) => pos)`）—— 即测试验证的是
// 「调用方有没有正确传参」，而**被调方自身的逻辑从未被执行**。一旦真实实现有边界
// 分支出错，现有测试一个都不会红。
//
// 这里补的是被调方本身：纯函数、无 DOM、无状态。
import { describe, expect, test } from "vitest";
import {
  canvasResizeBoundsFromPointerDrag,
  canvasResizeMinimumBoundsForGeometry,
  canvasResizeOriginShiftFromPointerDrag,
  clampNodePositionToBounds,
  calculateModelGeometryBounds,
  clampEdgeGeometryToBounds,
  clampPointToBounds,
  clampViewBoxDimensionsForZoom,
  createInteractiveStaticDrawingNode,
  createStaticBoxNodeFromDrawing,
  geometryBoundsInsideCanvas,
  keyboardMoveStepForViewBox,
  mirrorNodes,
  modelGeometryInsideCanvasBounds,
  normalizeViewBoxToCanvas,
  viewBoxZoomPercent
} from "./model-canvas-ops";
import { calculateNodeVisualBounds, parseStaticDrawPoints, STATIC_DRAW_POINTS_PARAM } from "./model";
import type { CanvasResizeDragMetrics, DeviceTemplate, Edge, ModelNode, Point } from "./model";

const bounds = { left: 0, top: 0, width: 1000, height: 800 };

const node = (over: Partial<ModelNode> = {}): ModelNode =>
  ({
    id: "n1",
    kind: "ac-bus",
    name: "母线1",
    position: { x: 100, y: 100 },
    size: { width: 80, height: 20 },
    rotation: 0,
    params: {},
    terminals: [],
    ...over
  }) as unknown as ModelNode;

describe("clampNodePositionToBounds", () => {
  test("界内位置原样返回（取整）", () => {
    const result = clampNodePositionToBounds(node(), bounds, { x: 300.4, y: 250.6 });
    expect(result).toEqual({ x: 300, y: 251 });
  });

  test("越出左/上边界时被推回，且推回后视觉框不越界", () => {
    const result = clampNodePositionToBounds(node(), bounds, { x: -100, y: -100 });

    // ── 逐处审计：原两行 toBeGreaterThanOrEqual(0) 的判定依据与替换理由 ────────────
    //
    // ① 原第 47 行 `expect(result.x).toBeGreaterThanOrEqual(0)`
    //    非恒真，但鉴别力有明确缺口。
    //    · 被测值类型：clampNodePositionToBounds 的返回值是 `{ x: Math.round(...),
    //      y: Math.round(...) }` 字面量，x/y 恒为 number，**正常路径下不可能是 undefined**
    //      —— 所以「undefined >= 0 为 false」这条性质在这里根本用不上。
    //    · 它唯一的鉴别力是抓**负数**与 NaN：完全取消夹取时 result.x = -100，本条会红。
    //    · 缺口：`>= 0` **放行 0**，而 0 恰是本测试要防的那条回归的产物 ——
    //      「只夹中心、不看视觉框，退化成夹到画布原点」。变异实证：把 minX 改成 0 后
    //      result.x 变成 0，本行照样绿，红的是下一行的 visual.left。
    //      本夹具下 0 非法：节点视觉框左缘在 position.x - 40，中心落到 0 会有 40px
    //      连同标签一起露在画布外。
    //    ⇒ 改为比对**具体推回点**（视觉框左缘恰好贴 0 的那个中心坐标）。
    //      期望值由公共几何函数推导、不写死魔数：40/10 只由 size(80×20) 决定，
    //      与标签度量无关（标签只把 bottom 撑到 47.45，不影响 left/top）。
    //
    // ② 原第 48 行 `expect(result.y).toBeGreaterThanOrEqual(0)`
    //    与 ① 同构：被测值恒为 number（不可能 undefined），鉴别力同样只来自负数/NaN，
    //    同样放行 0。变异实证：minY 改成 0 后 result.y 变 0 而本行绿。
    //    ⇒ 同样改成推导出的推回点。
    //
    // 推导前提：视觉框是节点的刚性平移，偏移量与 position 无关（下方 visual 断言
    // 也依赖这一点）。故在原点处量一次偏移量即可。
    const originVisual = calculateNodeVisualBounds(node(), 0, { x: 0, y: 0 });
    expect(result.x).toBe(Math.round(-originVisual.left));
    expect(result.y).toBe(Math.round(-originVisual.top));

    // 推回后视觉框确实贴住画布左上角。
    // 与上面两条的关系（记录下来，免得下一个人重新调查）：在「视觉框是刚性平移」成立时，
    // 本处 visual.left === 0 与上面 result.x === -originVisual.left 逻辑等价。故上面两条
    // 并不是独立于本处的额外覆盖 —— 它们的增量在于**由被测返回值自己**（而非重算一遍
    // 夹取）来钉住推回点，从而在 `>= 0` 放过 0 的那个缺口上先红。
    // 两处的量测位置不同（一个在 ORIGIN、一个在 result），故若日后
    // calculateNodeVisualBounds 不再是刚性平移，这两条会互相拆台而不是一起绿。
    //
    // 更正原注释的一处事实错误：本夹具的标签框只向下溢出，故 left/top 方向的半宽半高
    // 恰好等于 size.width/2 与 size.height/2（bottomOffset 才被撑到 47.45）。
    const visual = calculateNodeVisualBounds(node(), 0, result);
    expect(visual.left).toBe(0);
    expect(visual.top).toBe(0);
  });

  test("越出右/下边界时被推回", () => {
    const result = clampNodePositionToBounds(node(), bounds, { x: 5000, y: 5000 });
    const visual = calculateNodeVisualBounds(node(), 0, result);
    // 实现按 Math.round(夹取后的中心) 回写，像素级误差 ≤ 1
    expect(Math.abs(visual.right - bounds.width)).toBeLessThanOrEqual(1);
    expect(Math.abs(visual.bottom - bounds.height)).toBeLessThanOrEqual(1);
  });

  test("图元比画布还大时取中点（min > max 的回退分支，不产生 NaN）", () => {
    // 宽 2000 > 画布宽 1000 → 可夹区间为空，按实现约定落到 (min+max)/2
    const huge = node({ size: { width: 2000, height: 2000 } });
    const result = clampNodePositionToBounds(huge, bounds, { x: 0, y: 0 });
    expect(Number.isFinite(result.x)).toBe(true);
    expect(Number.isFinite(result.y)).toBe(true);
    // 落在画布中点附近（标签框会再撑开一点，故放宽到 50）
    expect(Math.abs(result.x - 500)).toBeLessThan(50);
    expect(Math.abs(result.y - 400)).toBeLessThan(50);
  });
});

describe("geometryBoundsInsideCanvas", () => {
  test("完全在界内为 true", () => {
    expect(geometryBoundsInsideCanvas({ left: 10, right: 20, top: 30, bottom: 40 }, bounds)).toBe(true);
  });

  test("任一边越界为 false", () => {
    expect(geometryBoundsInsideCanvas({ left: -1, right: 20, top: 30, bottom: 40 }, bounds)).toBe(false);
    expect(geometryBoundsInsideCanvas({ left: 10, right: 1001, top: 30, bottom: 40 }, bounds)).toBe(false);
    expect(geometryBoundsInsideCanvas({ left: 10, right: 20, top: 30, bottom: 801 }, bounds)).toBe(false);
  });

  test("null 几何（空模型）视为界内", () => {
    expect(geometryBoundsInsideCanvas(null, bounds)).toBe(true);
    // margin 传了也一样 —— 空模型不该被边距判成越界
    expect(geometryBoundsInsideCanvas(null, bounds, 10)).toBe(true);
  });

  test("margin 是「四边各让 margin」的闭区间，恰好贴边算界内", () => {
    // margin=10 ⇒ 可用区 [10, 990]×[10, 790]
    expect(geometryBoundsInsideCanvas({ left: 10, right: 990, top: 10, bottom: 790 }, bounds, 10)).toBe(true);
    // 越界 1px 即 false（四条边各自独立判）
    expect(geometryBoundsInsideCanvas({ left: 9, right: 990, top: 10, bottom: 790 }, bounds, 10)).toBe(false);
    expect(geometryBoundsInsideCanvas({ left: 10, right: 991, top: 10, bottom: 790 }, bounds, 10)).toBe(false);
    expect(geometryBoundsInsideCanvas({ left: 10, right: 990, top: 9, bottom: 790 }, bounds, 10)).toBe(false);
    expect(geometryBoundsInsideCanvas({ left: 10, right: 990, top: 10, bottom: 791 }, bounds, 10)).toBe(false);
  });

  test("margin 放大时原本界内的图形会被判越界（margin 真的生效，不是摆设）", () => {
    // 图形四边各留 2px，bounds 是 1000×800 ⇒ margin ≤ 2 时界内，≥ 3 即越界
    const box = { left: 2, right: 998, top: 2, bottom: 798 };
    expect(geometryBoundsInsideCanvas(box, bounds, 0)).toBe(true);
    expect(geometryBoundsInsideCanvas(box, bounds, 1)).toBe(true);
    expect(geometryBoundsInsideCanvas(box, bounds, 2)).toBe(true);
    expect(geometryBoundsInsideCanvas(box, bounds, 3)).toBe(false);
    expect(geometryBoundsInsideCanvas(box, bounds, 5)).toBe(false);
  });
});

describe("calculateModelGeometryBounds", () => {
  test("空输入返回 null（调用方据此跳过边界计算）", () => {
    expect(calculateModelGeometryBounds([], [])).toBeNull();
  });

  test("含节点时覆盖节点范围", () => {
    const result = calculateModelGeometryBounds(
      [node({ position: { x: 0, y: 0 } }), node({ id: "n2", position: { x: 400, y: 300 } })],
      []
    );
    expect(result).toBeTruthy();
    expect(result!.left).toBeLessThanOrEqual(0);
    expect(result!.right).toBeGreaterThanOrEqual(400);
    expect(result!.top).toBeLessThanOrEqual(0);
    expect(result!.bottom).toBeGreaterThanOrEqual(300);
  });
});

describe("normalizeViewBoxToCanvas / viewBoxZoomPercent", () => {
  test("normalizeViewBoxToCanvas 是恒等变换（原样返回 viewBox）", () => {
    // 实现就是 `return box` —— 名字容易让人以为会做退化兜底，实际不会。
    // 这里钉住当前语义，避免有人误以为它已做归一化而写出错误预期。
    const box = { x: 12, y: 34, width: 500, height: 400 };
    expect(normalizeViewBoxToCanvas(box, bounds)).toEqual(box);
    const degenerate = { x: 0, y: 0, width: 0, height: 0 };
    expect(normalizeViewBoxToCanvas(degenerate, bounds)).toEqual(degenerate);
  });

  test("viewBox 退化时缩放百分比回落到 100（viewBoxScaleRatio 返回 1）", () => {
    const pct = viewBoxZoomPercent({ x: 0, y: 0, width: 0, height: 0 }, bounds);
    expect(pct).toBe(100);
  });

  test("viewBox 与画布同尺寸时为 100%，放大一倍时为 50%", () => {
    expect(viewBoxZoomPercent({ x: 0, y: 0, width: 1000, height: 800 }, bounds)).toBe(100);
    expect(viewBoxZoomPercent({ x: 0, y: 0, width: 2000, height: 1600 }, bounds)).toBe(50);
  });
});

describe("clampEdgeGeometryToBounds", () => {
  const edge = (over: Record<string, unknown> = {}) =>
    ({
      id: "e1",
      sourceId: "n1",
      targetId: "n2",
      sourcePoint: { x: 100, y: 100 },
      targetPoint: { x: 200, y: 200 },
      ...over
    }) as unknown as Edge;

  test("端点都在界内时原样返回同一对象（changed 为 false 时直接透传）", () => {
    const input = edge();
    expect(clampEdgeGeometryToBounds(input, bounds)).toBe(input);
  });

  test("越界端点被夹回画布内", () => {
    const result = clampEdgeGeometryToBounds(
      edge({ sourcePoint: { x: -500, y: -500 }, targetPoint: { x: 99999, y: 99999 } }),
      bounds
    );
    expect(result.sourcePoint).toEqual({ x: 0, y: 0 });
    expect(result.targetPoint).toEqual({ x: bounds.width, y: bounds.height });
  });

  test("manualPoints 逐点夹取（自动路由的 points 不在此职责内）", () => {
    // 实现只夹 sourcePoint / targetPoint / manualPoints —— 路由器算出的折线点
    // 由路由器自己保证，画布缩放时不该由这里改写。
    const result = clampEdgeGeometryToBounds(
      edge({ manualPoints: [{ x: -10, y: 10 }, { x: 5000, y: 20 }] }),
      bounds
    );
    expect(result.manualPoints).toEqual([
      { x: 0, y: 10 },
      { x: bounds.width, y: 20 }
    ]);
  });

  test("缺失的可选端点保持 undefined，不被塞成 {x:0,y:0}", () => {
    const result = clampEdgeGeometryToBounds(
      edge({ sourcePoint: undefined, targetPoint: undefined, manualPoints: undefined }),
      bounds
    );
    expect(result.sourcePoint).toBeUndefined();
    expect(result.targetPoint).toBeUndefined();
    expect(result.manualPoints).toBeUndefined();
  });

  test("manualPoints 全在界内时也原样返回同一对象（changed 判定覆盖 manualPoints 分支）", () => {
    // 上面已有「全界内 → 透传」，但那条 edge 没有 manualPoints。
    // 这里补上：manualPoints 逐点比较后才置 changed，若漏比就会造出一个内容相同的新对象，
    // 而下游按引用判等做重绘，会因此多跑一轮。
    const input = edge({ manualPoints: [{ x: 100, y: 100 }, { x: 200, y: 200 }] });
    expect(clampEdgeGeometryToBounds(input, bounds)).toBe(input);

    // 只有 manualPoints 越界、端点都在界内时，也要产出新对象
    const moved = edge({ manualPoints: [{ x: 100, y: 100 }, { x: -5, y: 200 }] });
    const result = clampEdgeGeometryToBounds(moved, bounds);
    expect(result).not.toBe(moved);
    expect(result.manualPoints).toEqual([{ x: 100, y: 100 }, { x: 0, y: 200 }]);
    // 端点值不变，但实现统一走 clampPointToBounds 重造对象（不是按引用复用）——
    // 这里断言值相等而非引用相等，避免日后误把「重造」当回归去改。
    expect(result.sourcePoint).toEqual(moved.sourcePoint);
    expect(result.targetPoint).toEqual(moved.targetPoint);
  });

  test("manualPoints 为空数组时不误判为「发生了变化」", () => {
    const input = edge({ manualPoints: [] });
    expect(clampEdgeGeometryToBounds(input, bounds)).toBe(input);
  });
});

// 拖画布边缘改尺寸时的「最小可用尺寸」：改某条边时，画布不能缩到把内容挤出视野。
// 下限取「被改那条边到内容最远端的距离」，再与绝对下限取大。
// geometryBounds 为空（空模型）时只回绝对下限 —— 这是唯一不依赖内容的分支。
describe("canvasResizeMinimumBoundsForGeometry", () => {
  const current = { width: 1000, height: 800 };
  const absoluteMin = { width: 200, height: 100 };
  // 故意用小数：实现全程 Math.ceil，下限必须向上取整而不是截断
  const geometry = { left: 10, right: 760.2, top: 20, bottom: 650.7 };

  test("空几何（空模型）只回绝对下限，与 edge 无关", () => {
    for (const edge of ["left", "right", "top", "bottom", "corner", "top-left", "top-right", "bottom-left"] as const) {
      expect(canvasResizeMinimumBoundsForGeometry(edge, current, null, absoluteMin), edge)
        .toEqual({ width: 200, height: 100 });
    }
  });

  test("右/下边界随内容最远端延伸；左/上边界随「当前位置减去内容起点」延伸", () => {
    // 760.2 → ceil 761；650.7 → ceil 651
    expect(canvasResizeMinimumBoundsForGeometry("right", current, geometry, absoluteMin)).toEqual({ width: 761, height: 100 });
    expect(canvasResizeMinimumBoundsForGeometry("bottom", current, geometry, absoluteMin)).toEqual({ width: 200, height: 651 });
    // 1000-10=990；800-20=780
    expect(canvasResizeMinimumBoundsForGeometry("left", current, geometry, absoluteMin)).toEqual({ width: 990, height: 100 });
    expect(canvasResizeMinimumBoundsForGeometry("top", current, geometry, absoluteMin)).toEqual({ width: 200, height: 780 });
  });

  test("八个方向两两不串：每条边只影响自己那一个轴", () => {
    // 断言「哪一轴被内容撑开」，避免日后把 right 与 bottom 的判据写混
    const axes = (edge: Parameters<typeof canvasResizeMinimumBoundsForGeometry>[0]) => {
      const out = canvasResizeMinimumBoundsForGeometry(edge, current, geometry, absoluteMin);
      return { x: out.width > absoluteMin.width, y: out.height > absoluteMin.height };
    };
    expect(axes("right")).toEqual({ x: true, y: false });
    expect(axes("left")).toEqual({ x: true, y: false });
    expect(axes("bottom")).toEqual({ x: false, y: true });
    expect(axes("top")).toEqual({ x: false, y: true });
    // 四个角同时影响两个轴
    for (const edge of ["corner", "top-left", "top-right", "bottom-left"] as const) {
      expect(axes(edge), edge).toEqual({ x: true, y: true });
    }
  });

  test("内容距离小于绝对下限时，下限胜出", () => {
    // right 距离只有 30 < 绝对下限 200 ⇒ 走绝对下限
    expect(canvasResizeMinimumBoundsForGeometry("right", current, { ...geometry, right: 30 }, absoluteMin))
      .toEqual({ width: 200, height: 100 });
    // top 的判据是「当前高 - 内容顶」，800-30=770 > 100 ⇒ 取 770（内容仍可见）
    expect(canvasResizeMinimumBoundsForGeometry("top", current, { ...geometry, top: 30 }, absoluteMin))
      .toEqual({ width: 200, height: 770 });
    // 把内容顶推到接近画布顶（800-790=10 < 100）⇒ 走绝对下限
    expect(canvasResizeMinimumBoundsForGeometry("top", current, { ...geometry, top: 790 }, absoluteMin))
      .toEqual({ width: 200, height: 100 });
  });

  test("绝对下限向上取整且不为负", () => {
    expect(canvasResizeMinimumBoundsForGeometry("right", current, null, { width: 200.2, height: 100.1 }))
      .toEqual({ width: 201, height: 101 });
    expect(canvasResizeMinimumBoundsForGeometry("right", current, null, { width: -50, height: -50 }))
      .toEqual({ width: 0, height: 0 });
  });
});

// 拖动指针算新尺寸：与最小尺寸函数同源，但这条路径负责「拖出来的值」，
// 不含内容感知。unitsPerCssX/Y 非有限或非正时按 1 处理（缩放异常不该让画布变成 NaN）。
describe("canvasResizeBoundsFromPointerDrag", () => {
  const dragBase = {
    edge: "corner" as const,
    startClientX: 100,
    startClientY: 200,
    startWidth: 1000,
    startHeight: 800,
    unitsPerCssX: 2,
    unitsPerCssY: 2
  };
  const minBounds = { width: 200, height: 100 };

  test("无位移时尺寸不变", () => {
    expect(canvasResizeBoundsFromPointerDrag(dragBase, { clientX: 100, clientY: 200 }, minBounds))
      .toEqual({ width: 1000, height: 800 });
  });

  test("right / bottom 向外拖是加，反向拖不越过最小尺寸", () => {
    expect(canvasResizeBoundsFromPointerDrag(dragBase, { clientX: 150, clientY: 250 }, minBounds))
      .toEqual({ width: 1100, height: 900 });
    // 反向拖 1000px * 2 = -2000 ⇒ 触底
    expect(canvasResizeBoundsFromPointerDrag({ ...dragBase, edge: "right" }, { clientX: -2000, clientY: 200 }, minBounds))
      .toEqual({ width: 200, height: 800 });
    expect(canvasResizeBoundsFromPointerDrag({ ...dragBase, edge: "bottom" }, { clientX: 100, clientY: -2000 }, minBounds))
      .toEqual({ width: 1000, height: 100 });
  });

  test("left / top 向外拖是减（尺寸 = 起始 - delta）", () => {
    expect(canvasResizeBoundsFromPointerDrag({ ...dragBase, edge: "left" }, { clientX: 150, clientY: 200 }, minBounds))
      .toEqual({ width: 900, height: 800 });
    expect(canvasResizeBoundsFromPointerDrag({ ...dragBase, edge: "top" }, { clientX: 100, clientY: 250 }, minBounds))
      .toEqual({ width: 1000, height: 700 });
  });

  test("不涉及的两轴保持起始值（corner 同时改两轴）", () => {
    // right 只改宽：即便指针在 y 上动了 50px，高度也不变
    expect(canvasResizeBoundsFromPointerDrag({ ...dragBase, edge: "right" }, { clientX: 100, clientY: 250 }, minBounds))
      .toEqual({ width: 1000, height: 800 });
    expect(canvasResizeBoundsFromPointerDrag({ ...dragBase, edge: "top-right" }, { clientX: 150, clientY: 250 }, minBounds))
      .toEqual({ width: 1100, height: 700 });
    expect(canvasResizeBoundsFromPointerDrag({ ...dragBase, edge: "corner" }, { clientX: 150, clientY: 250 }, minBounds))
      .toEqual({ width: 1100, height: 900 });
  });

  test("结果一律取整", () => {
    // 5px * 2.5 = 12.5 ⇒ 1000+12.5 = 1012.5 → Math.round 落 1013（不是截断 1012）
    expect(canvasResizeBoundsFromPointerDrag(
      { ...dragBase, unitsPerCssX: 2.5 },
      { clientX: 105, clientY: 200 },
      minBounds
    )).toEqual({ width: 1013, height: 800 });
  });

  test("unitsPerCss 非有限或非正时按 1 处理（不产出 NaN）", () => {
    for (const unitsPerCssX of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
      const out = canvasResizeBoundsFromPointerDrag(
        { ...dragBase, unitsPerCssX, unitsPerCssY: unitsPerCssX },
        { clientX: 150, clientY: 250 },
        minBounds
      );
      expect(Number.isFinite(out.width), `unitsPerCssX=${unitsPerCssX}`).toBe(true);
      expect(Number.isFinite(out.height), `unitsPerCssY=${unitsPerCssX}`).toBe(true);
    }
    // 按 1 处理：+50px ⇒ +50
    expect(canvasResizeBoundsFromPointerDrag(
      { ...dragBase, edge: "corner", unitsPerCssX: 0, unitsPerCssY: -2 },
      { clientX: 150, clientY: 250 },
      minBounds
    )).toEqual({ width: 1050, height: 850 });
  });
});

// 镜像：绕水平/垂直轴翻转。旋转取负后归一到 [0,360)，缩放取负落在对应轴上。
// 判错的后果是「镜像后图元朝向反了但看不出报错」——纯视觉缺陷。
describe("mirrorNodes", () => {
  const base = (over: Partial<ModelNode> = {}): ModelNode =>
    node({ rotation: 0, ...over });

  test("只镜像 nodeIds 命中的节点，未命中的按引用原样返回", () => {
    const hit = base({ id: "hit" });
    const miss = base({ id: "miss", rotation: 45 });
    const out = mirrorNodes([hit, miss], ["hit"], "horizontal");
    expect(out[0]).not.toBe(hit);
    expect(out[1]).toBe(miss);
  });

  test("水平镜像只改 scaleX，纵向镜像只改 scaleY", () => {
    const source = base({ scaleX: 0.5, scaleY: 2 });
    const horizontal = mirrorNodes([source], ["n1"], "horizontal")[0];
    expect(horizontal.scaleX).toBe(-0.5);
    expect(horizontal.scaleY).toBe(2);

    const vertical = mirrorNodes([source], ["n1"], "vertical")[0];
    expect(vertical.scaleX).toBe(0.5);
    expect(vertical.scaleY).toBe(-2);
  });

  test("scaleX 优先于 scale；两者都缺时按 1 处理（结果恒为 -1）", () => {
    expect(mirrorNodes([base({ scaleX: 0.5, scale: 9 })], ["n1"], "horizontal")[0].scaleX).toBe(-0.5);
    expect(mirrorNodes([base({ scale: 9 })], ["n1"], "horizontal")[0].scaleX).toBe(-9);
    expect(mirrorNodes([base()], ["n1"], "horizontal")[0].scaleX).toBe(-1);
  });

  test("scaleX=0 是有效值、不回退到 scale（`??` 只挡 null/undefined）", () => {
    // 若日后有人把 `??` 换成 `||`，0 会被当成缺值而回退到 scale=3 —— 本条即红。
    const out = mirrorNodes([base({ scaleX: 0, scale: 3 })], ["n1"], "horizontal")[0];
    // 结果是 -0（取负的产物），与 3 的取负 -3 明显不同
    expect(Object.is(out.scaleX, -0), "scaleX 取负后是 -0，不是 -3").toBe(true);
  });

  test("负 scale 取负后回正", () => {
    expect(mirrorNodes([base({ scale: -2 })], ["n1"], "horizontal")[0].scaleX).toBe(2);
  });

  test("旋转取负后归一到 [0, 360)", () => {
    const rotationAfter = (rotation: number) =>
      mirrorNodes([base({ rotation })], ["n1"], "horizontal")[0].rotation;
    expect(rotationAfter(0)).toBe(0);
    expect(rotationAfter(90)).toBe(270);
    expect(rotationAfter(-90)).toBe(90);
    // 超出 ±360 的一圈也要折回同一形态，否则画布上会画出「转了 450 度」的等价朝向
    expect(rotationAfter(450)).toBe(270);
    expect(rotationAfter(-450)).toBe(90);
    expect(rotationAfter(360)).toBe(0);
    expect(rotationAfter(-360)).toBe(0);
    expect(rotationAfter(180)).toBe(180);
  });

  test("两个轴的镜像共享同一套旋转归一（只差 scale 落在哪个轴）", () => {
    const source = base({ rotation: 90, scaleX: 2, scaleY: 3 });
    const horizontal = mirrorNodes([source], ["n1"], "horizontal")[0];
    const vertical = mirrorNodes([source], ["n1"], "vertical")[0];
    expect(horizontal.rotation).toBe(vertical.rotation);
    expect(horizontal.rotation).toBe(270);
  });

  test("空节点列表与空 id 列表都不抛错", () => {
    expect(mirrorNodes([], ["n1"], "horizontal")).toEqual([]);
    // 空 id 列表 ⇒ 没有命中者 ⇒ 数组里仍是同一批引用
    const nodes = [base({ id: "a" }), base({ id: "b" })];
    const out = mirrorNodes(nodes, [], "horizontal");
    expect(out[0]).toBe(nodes[0]);
    expect(out[1]).toBe(nodes[1]);
  });
});

// ══════════════════════════════════════════════════════════════════════════
// 以下几组是静态绘制几何与视口步长/夹取。上文各组补的是「被 mock 掉的被调方」，
// 这里补的是「从没有直呼过的导出」——它们的判错都不会报错，只会画错。
// ══════════════════════════════════════════════════════════════════════════

// 静态绘制：用户拖出来的框 → 图元几何。三个数会静默地错：
//   ① 最小尺寸 24 没抬起来 ⇒ 窄图元被压成 0×0，点不中；
//   ② padding 8 每边漏掉 ⇒ 折线端点贴在图元边框上，看不出出头；
//   ③ 坐标取整漏掉 ⇒ 保存的 drawPoints 与画出来的对不上，重载后图形漂移。
const staticTemplate = (over: Partial<DeviceTemplate> = {}): DeviceTemplate =>
  ({
    kind: "static-rect",
    label: "矩形",
    categoryLibrary: "静态图元",
    size: { width: 100, height: 60 },
    params: {},
    terminalType: "ac",
    terminalCount: 0,
    terminalTypes: [],
    ...over
  }) as unknown as DeviceTemplate;

describe("createStaticBoxNodeFromDrawing / createInteractiveStaticDrawingNode", () => {
  const box = (points: Point[]) => createStaticBoxNodeFromDrawing(staticTemplate(), points, "layer-user");
  const line = (points: Point[]) => createInteractiveStaticDrawingNode(staticTemplate(), points, "layer-user");

  // ── 点数守卫 ────────────────────────────────────────────────────────────
  test("点数少于 2 个时抛错，两条路径各抛各的", () => {
    // 源码是 throw（不是返回 null），消息也不同 —— 分别钉住，避免有人把
    // 其中一条改成调用另一条、或改成返回 null 而调用方还在裸调。
    expect(() => box([])).toThrow("Static box drawing requires at least two points.");
    expect(() => box([{ x: 10, y: 10 }])).toThrow("Static box drawing requires at least two points.");
    expect(() => line([])).toThrow("Interactive static drawing requires at least two points.");
    expect(() => line([{ x: 10, y: 10 }])).toThrow("Interactive static drawing requires at least two points.");
  });

  test("两个重合点归一化后只剩 1 个，同样抛错（去重先于点数检查）", () => {
    // normalizeStaticDrawingPoints 会丢掉连续重复点 —— 用户双击同一处时
    // 屏幕上确实攒到了两个点，但归一化后只剩一个。此时若不抛错，
    // 就会产出一个 0×0 图元（被最小尺寸抬成 24×24 的空壳）。
    expect(() => box([{ x: 10, y: 10 }, { x: 10, y: 10 }])).toThrow(/at least two points/);
    expect(() => line([{ x: 10, y: 10 }, { x: 10, y: 10 }])).toThrow(/at least two points/);

    // 对照：落差 0.4 的两点归一化后仍然不同 ⇒ 合法，走产出路径且不被下限吞掉
    expect(box([{ x: 10, y: 10 }, { x: 40.5, y: 10 }]).size).toEqual({ width: 30.5, height: 24 });
  });

  // ── 最小尺寸 24 ────────────────────────────────────────────────────────
  test("最小尺寸 24 逐轴生效：窄的那轴被抬起、够宽的那轴保持原值", () => {
    // 横向跨度 10 < 24 被抬起，纵向 200 > 24 原样。
    // 判别力：若实现写成对整个 size 取一次 max（而不是逐轴 Math.max），
    // 本例会得到 {200, 200} 而不是 {24, 200}。
    expect(box([{ x: 0, y: 0 }, { x: 10, y: 200 }]).size).toEqual({ width: 24, height: 200 });
    // 反向：横向够宽、纵向过窄
    expect(box([{ x: 0, y: 0 }, { x: 200, y: 10 }]).size).toEqual({ width: 200, height: 24 });
    // 两轴都过窄 ⇒ 各自抬到 24，而不是取较大者
    expect(box([{ x: 0, y: 0 }, { x: 3, y: 5 }]).size).toEqual({ width: 24, height: 24 });
    // 两点重合但未取整到同一点 ⇒ 跨度 0.2，仍被抬到 24，不产出 0×0
    expect(box([{ x: 50, y: 50 }, { x: 50.2, y: 50.2 }]).size).toEqual({ width: 24, height: 24 });

    // 中心也按**抬起来之后**的尺寸算：left 0 + 24/2 = 12（用原始跨度 10 会得 5）
    expect(box([{ x: 0, y: 0 }, { x: 10, y: 200 }]).position).toEqual({ x: 12, y: 100 });
  });

  test("交互式绘制的最小尺寸同样逐轴生效（含 8px padding 之后仍不足 24 才抬）", () => {
    // 跨度 10 + 16 = 26 > 24 ⇒ 加完 padding 已经够大，下限不参与
    expect(line([{ x: 0, y: 0 }, { x: 10, y: 0 }]).size).toEqual({ width: 26, height: 24 });
    // 同一行里 height 那轴跨度 0 + 16 = 16 < 24 ⇒ 被抬起 —— 证明下限在两个轴上分别判
    // 跨度 8 ⇒ 8 + 16 = 24 恰好等于下限（闭区间：不抬也不加）
    expect(line([{ x: 0, y: 0 }, { x: 8, y: 0 }]).size.width).toBe(24);
    // 两轴都退化 ⇒ 16 < 24，双双抬起
    expect(line([{ x: 7, y: 7 }, { x: 7, y: 7.4 }]).size).toEqual({ width: 24, height: 24 });
  });

  // ── padding 8 ──────────────────────────────────────────────────────────
  test("padding 每边 8：交互式产出比输入大 16，盒子版不加大", () => {
    const points: Point[] = [
      { x: 100, y: 100 },
      { x: 200, y: 160 }
    ];
    // 输入跨度 100 × 60
    const interactive = line(points);
    const staticBox = box(points);
    expect(interactive.size).toEqual({ width: 116, height: 76 });
    expect(staticBox.size).toEqual({ width: 100, height: 60 });
    // 差值恰好 8 × 2，且两轴一致 —— padding 不是某条支路独有的
    expect(interactive.size.width - staticBox.size.width).toBe(16);
    expect(interactive.size.height - staticBox.size.height).toBe(16);

    // drawPoints 按中心归零，盒子版不写这个参数
    expect(parseStaticDrawPoints(interactive.params[STATIC_DRAW_POINTS_PARAM])).toEqual([
      { x: -50, y: -30 },
      { x: 50, y: 30 }
    ]);
    expect(staticBox.params[STATIC_DRAW_POINTS_PARAM]).toBeUndefined();
  });

  // ── 0.1 取整 ──────────────────────────────────────────────────────────
  test("输入坐标先取整到 1 位小数再算几何（跳过输入取整会得到 100 而不是 100.1）", () => {
    // 0.04 → 0（0.04×10 = 0.4），100.05 → 100.1（100.05×10 恰好落在 100.5，平局向 +∞）
    // 于是宽度 = 100.1 − 0 = 100.1
    const staticBox = box([
      { x: 0.04, y: 0 },
      { x: 100.05, y: 200 }
    ]);
    expect(staticBox.size).toEqual({ width: 100.1, height: 200 });
    // 反证：若把「先对输入取整」这一步去掉，跨度是 100.01，取整后是 100。
    // 100 与 100.1 就是本条的分辨距离。
    // 中心同样走取整后的跨度：left 0 + 100.1/2 = 50.05 → 50.1（不是 50）
    expect(staticBox.position).toEqual({ x: 50.1, y: 100 });

    // 交互式版：中心 (0 + 100.1)/2 = 50.05 → 50.1，drawPoints 按 50.1 归零，
    // 于是两端是 −50.1 与 50（不是围绕 50 的对称 −50 / 50）
    const interactive = line([
      { x: 0.04, y: 0 },
      { x: 100.05, y: 0 }
    ]);
    expect(interactive.size).toEqual({ width: 116.1, height: 24 });
    expect(interactive.position).toEqual({ x: 50.1, y: 0 });
    expect(parseStaticDrawPoints(interactive.params[STATIC_DRAW_POINTS_PARAM])).toEqual([
      { x: -50.1, y: 0 },
      { x: 50, y: 0 }
    ]);
  });

  test("最小尺寸 24 在跨度上真的生效：23.9 与 23.5 被抬起，24.1 原样通过", () => {
    // 跨度 23.9 → 取整后仍是 23.9 → 被抬到 24。判别力：去掉 Math.max 会得 23.9。
    expect(box([{ x: 0, y: 0 }, { x: 23.9, y: 100 }]).size.width).toBe(24);
    // 跨度 23.5 同理（不是只对接近 24 的跨度有效）
    expect(box([{ x: 0, y: 0 }, { x: 23.5, y: 100 }]).size.width).toBe(24);
    // 对照组：24.1 够大，下限不参与。若前两条是恒 24（夹具退化），本条即红。
    expect(box([{ x: 0, y: 0 }, { x: 24.1, y: 100 }]).size.width).toBe(24.1);

    // ── 记录一处**等价变异**，免得下一个人重新调查 ──────────────────────────
    // 「下限先作用在未取整的跨度上、再对结果取整」这个写法，与当前实现的差异
    // 在本文件里**不可观测**，因此不必、也无法补断言去覆盖它：
    //   normalizeStaticDrawingPoints 已经把每个输入坐标取整到 0.1，
    //   所以 createStaticBoxNodeFromDrawing 看到的 right − left 恒已是 0.1 的倍数，
    //   再对它 Math.round 恒为恒等。
    // 换句话说 span ∈ [23.95, 24) 这一段——唯一能分开「先取整」与「先夹」的两个写法
    // 的区间——在本实现下**不可达**（23.95 会先被取成 24.0）。
    // 上面三条断言刻意避开该区间，改用跨度 23.9 / 23.5 / 24.1。
  });

  test("取整平局向正无穷：同样长度正负号给出不同的中心", () => {
    // center.x = round((left + right) / 2)。0.1 / 2 = 0.05 是平局 → 向 +∞ → 0.1
    expect(line([{ x: 0, y: 0 }, { x: 0.1, y: 0 }]).position.x).toBe(0.1);
    // −0.1 / 2 = −0.05 同样是平局，但 +∞ 在右边 → 真负零 −0（不是 −0.1）。
    // 换成「四舍五入远离零」的实现会得到 −0.1，本条即红。
    const negative = line([
      { x: -0.1, y: 0 },
      { x: 0, y: 0 }
    ]);
    expect(Object.is(negative.position.x, -0), "平局向 +∞ 时负方向得到真负零").toBe(true);
    // 同一节点的其余几何：宽度 0.1 + 16 = 16.1 < 24 ⇒ 抬起；drawPoints 按 −0 归零
    expect(negative.size).toEqual({ width: 24, height: 24 });
    expect(parseStaticDrawPoints(negative.params[STATIC_DRAW_POINTS_PARAM])).toEqual([
      { x: -0.1, y: 0 },
      { x: 0, y: 0 }
    ]);
  });

  // ── 首尾两点 vs 全体极值 ───────────────────────────────────────────────
  test("盒子版只用首尾两点定外框（中间越界的点被忽略），交互式版相反取全体极值", () => {
    const points: Point[] = [
      { x: 0, y: 0 },
      { x: 400, y: 300 },
      { x: 200, y: 150 }
    ];
    // 盒子路径读 points[0] 与 points[points.length − 1] ⇒ 200 × 150
    expect(box(points).size).toEqual({ width: 200, height: 150 });
    expect(box(points).position).toEqual({ x: 100, y: 75 });
    // 交互式路径读全体 min/max ⇒ 400 × 300，再各加 16 padding
    expect(line(points).size).toEqual({ width: 416, height: 316 });
    // 判别力：若盒子版也改成取全体极值，本例会得到 400 × 300 —— 中间那点
    // 「画出矩形」时被追加为第三点，此时把它算进去会让图元突然比用户框大一倍。
  });
});

// 点夹取：交互期把点按整数像素钉回画布。判错的后果是元素能被拖出画布，
// 或贴边时抖 1px。
describe("clampPointToBounds", () => {
  test("四个边界组合：水平越界/界内 × 垂直越界/界内", () => {
    const cases: Array<{ name: string; point: Point; want: Point }> = [
      { name: "两轴都在界内（顺带取整）", point: { x: 10.4, y: 20.6 }, want: { x: 10, y: 21 } },
      { name: "只有水平越界（左侧）", point: { x: -50, y: 20 }, want: { x: 0, y: 20 } },
      { name: "只有垂直越界（下侧）", point: { x: 10, y: 5000 }, want: { x: 10, y: bounds.height } },
      { name: "两轴都越界（右上）", point: { x: 5000, y: -50 }, want: { x: bounds.width, y: 0 } }
    ];
    for (const item of cases) {
      expect(clampPointToBounds(item.point, bounds), item.name).toEqual(item.want);
    }
    // 四条用例两两不同 ⇒ 若实现把某一轴的 min/max 写错（如两轴都用 width），
    // 至少有一条会红；只有「两轴界内」这一条是恒绿的。
    expect(new Set(cases.map((item) => JSON.stringify(item.want))).size).toBe(4);
  });

  test("恰好贴边（0 与 width/height）保持不变，越 1px 即被夹", () => {
    expect(clampPointToBounds({ x: 0, y: 0 }, bounds)).toEqual({ x: 0, y: 0 });
    expect(clampPointToBounds({ x: bounds.width, y: bounds.height }, bounds)).toEqual({
      x: bounds.width,
      y: bounds.height
    });
    // 闭区间是 [0, width] × [0, height]
    expect(clampPointToBounds({ x: -0.6, y: bounds.height + 0.6 }, bounds)).toEqual({
      x: 0,
      y: bounds.height
    });
    // 反向：−0.6 越下界、height + 0.6 越上界，两个轴的 min/max 不能写混
    expect(clampPointToBounds({ x: bounds.width + 0.6, y: -0.6 }, bounds)).toEqual({
      x: bounds.width,
      y: 0
    });
  });

  test("返回新对象且不改传入的点；取整发生在夹取之后", () => {
    const input = { x: 10.6, y: 10.4 };
    const result = clampPointToBounds(input, bounds);
    expect(result).not.toBe(input);
    expect(result).toEqual({ x: 11, y: 10 });
    expect(input).toEqual({ x: 10.6, y: 10.4 });
    // 取整在夹取**之后**：10.6 本来就在界内，不会被当成 11 再夹一次；
    // 而 10.4 会被 Math.round 抬到 10 —— 说明这一层不是「原样返回」。
  });
});

describe("modelGeometryInsideCanvasBounds", () => {
  const routes = (...points: Array<[number, number]>) => [
    { points: points.map(([x, y]) => ({ x, y })) }
  ];
  // 节点视觉框相对 position 的偏移（刚体平移，与 position 无关 ——
  // 上文 clampNodePositionToBounds 的注释已记录这一前提）。
  // 这里量一次即可，期望值全部由它推导，不写死标签度量。
  const offsets = calculateNodeVisualBounds(node(), 0, { x: 0, y: 0 });
  // 贴住每条边外侧 1px 的 position
  const outLeft = { x: -offsets.left - 1, y: 400 };
  const outRight = { x: bounds.width - offsets.right + 1, y: 400 };
  const outTop = { x: 500, y: -offsets.top - 1 };
  const outBottom = { x: 500, y: bounds.height - offsets.bottom + 1 };
  const insidePosition = { x: 500, y: 400 };

  test("四个边界组合：水平越界/界内 × 垂直越界/界内（路由折线）", () => {
    // 路由的包围盒就是全部点的极值（本函数不传 padding，节点那侧为 0）
    expect(modelGeometryInsideCanvasBounds([], routes([10, 10], [20, 20]), bounds)).toBe(true);
    expect(modelGeometryInsideCanvasBounds([], routes([-1, 10], [20, 20]), bounds)).toBe(false);
    expect(modelGeometryInsideCanvasBounds([], routes([1001, 10], [20, 20]), bounds)).toBe(false);
    expect(modelGeometryInsideCanvasBounds([], routes([10, -1], [20, 20]), bounds)).toBe(false);
    expect(modelGeometryInsideCanvasBounds([], routes([10, 801], [20, 20]), bounds)).toBe(false);
    // 空折线不参与包围盒 ⇒ 空模型视为界内（与 geometryBoundsInsideCanvas(null) 同源）
    expect(modelGeometryInsideCanvasBounds([], routes(), bounds)).toBe(true);
  });

  test("四个边界组合：水平越界/界内 × 垂直越界/界内（节点按视觉框，不按 position 或 size）", () => {
    // 居中 ⇒ 视觉框四边都在界内
    expect(modelGeometryInsideCanvasBounds([node({ position: insidePosition })], [], bounds)).toBe(true);
    // 四个方向各推 1px 出界：判据是视觉框，不是 position 本身，也不是 size
    expect(modelGeometryInsideCanvasBounds([node({ position: outLeft })], [], bounds)).toBe(false);
    expect(modelGeometryInsideCanvasBounds([node({ position: outRight })], [], bounds)).toBe(false);
    expect(modelGeometryInsideCanvasBounds([node({ position: outTop })], [], bounds)).toBe(false);
    expect(modelGeometryInsideCanvasBounds([node({ position: outBottom })], [], bounds)).toBe(false);

    // 反证夹具本身有效：把「越界 1px」换成「刚好贴边」应当回到界内。
    // 若上面四条是因为夹具退化成全越界（比如 offsets 算出了 NaN）而恒红，
    // 这四条会与之矛盾。
    expect(modelGeometryInsideCanvasBounds([node({ position: { x: -offsets.left, y: 400 } })], [], bounds)).toBe(true);
    expect(modelGeometryInsideCanvasBounds([node({ position: { x: 500, y: -offsets.top } })], [], bounds)).toBe(true);
  });

  test("节点与路由取并集：任一越界即整体越界", () => {
    const insideNode = node({ position: insidePosition });
    const insideRoutes = routes([10, 10], [20, 20]);
    expect(modelGeometryInsideCanvasBounds([insideNode], insideRoutes, bounds)).toBe(true);
    // 节点界内、路由越界
    expect(modelGeometryInsideCanvasBounds([insideNode], routes([10, 10], [1001, 20]), bounds)).toBe(false);
    // 路由界内、节点越界
    expect(modelGeometryInsideCanvasBounds([node({ position: outLeft })], insideRoutes, bounds)).toBe(false);
  });

  test("margin 转发到判定上（默认 0 与传入 10 的结论不同）", () => {
    const tight = routes([2, 2], [998, 798]);
    expect(modelGeometryInsideCanvasBounds([], tight, bounds)).toBe(true);
    expect(modelGeometryInsideCanvasBounds([], tight, bounds, 10)).toBe(false);
    // 恰好等于 margin 时仍算界内（闭区间）
    expect(modelGeometryInsideCanvasBounds([], routes([10, 10], [990, 790]), bounds, 10)).toBe(true);
    expect(modelGeometryInsideCanvasBounds([], routes([10, 10], [990, 790]), bounds, 11)).toBe(false);
  });
});

// 键盘微移步长：放大后一个 CSS 像素代表更多画布单位，步长必须跟着缩放走，
// 否则放大态下方向键一次只挪视觉上的零点几个像素（看起来完全不动）。
describe("keyboardMoveStepForViewBox", () => {
  const viewBox = (width: number, height: number) => ({ x: 0, y: 0, width, height });

  test("步长随缩放档位变化：四个档位给出四个互不相同的步长", () => {
    const steps: Array<{ name: string; box: ReturnType<typeof viewBox>; want: number }> = [
      { name: "缩小一半", box: viewBox(500, 400), want: 3 },
      { name: "1:1", box: viewBox(1000, 800), want: 6 },
      { name: "放大两倍", box: viewBox(2000, 1600), want: 12 },
      { name: "放大四倍", box: viewBox(4000, 3200), want: 24 }
    ];
    for (const item of steps) {
      expect(keyboardMoveStepForViewBox(item.box, bounds), item.name).toBe(item.want);
    }
    // 四个期望值互不相同 —— 否则「步长随缩放变化」这句话就是恒绿的
    expect(new Set(steps.map((item) => item.want)).size).toBe(4);
  });

  test("缩放比是宽高比的几何平均，宽高比不一致时既不是取宽也不是取高", () => {
    // 宽 2 倍、高 1 倍 ⇒ 几何平均 sqrt(2) ≈ 1.414；取宽会得 12，取高会得 6
    const wideOnly = keyboardMoveStepForViewBox(viewBox(2000, 800), bounds);
    expect(wideOnly).toBeCloseTo(6 * Math.SQRT2, 10);
    expect(wideOnly).not.toBe(12);
    expect(wideOnly).not.toBe(6);
    // 高 2 倍、宽 1 倍 ⇒ 同一个比值（几何平均对宽高对称）
    expect(keyboardMoveStepForViewBox(viewBox(1000, 1600), bounds)).toBeCloseTo(6 * Math.SQRT2, 10);
  });

  test("viewBox 或画布任一维退化时回落成 1 倍步长（不产出 0 或 NaN）", () => {
    const degenerate = [viewBox(0, 0), viewBox(1000, 0), viewBox(0, 800), viewBox(-10, -10)];
    for (const box of degenerate) {
      expect(keyboardMoveStepForViewBox(box, bounds), `${box.width}x${box.height}`).toBe(6);
    }
    // 画布退化同理（bounds 任一维 ≤ 0）
    expect(keyboardMoveStepForViewBox(viewBox(1000, 800), { width: 0, height: 800 })).toBe(6);
    expect(keyboardMoveStepForViewBox(viewBox(1000, 800), { width: 1000, height: 0 })).toBe(6);
  });

  test("baseStep 取绝对值且下限为 1", () => {
    const box = viewBox(1000, 800);
    expect(keyboardMoveStepForViewBox(box, bounds, 10)).toBe(10);
    // 负步长与正步长等价（方向由调用方自己加符号）
    expect(keyboardMoveStepForViewBox(box, bounds, -10)).toBe(10);
    // 0 与 |0.4| 被抬到 1，而不是产出 0（0 步长会让方向键完全失效）
    expect(keyboardMoveStepForViewBox(box, bounds, 0)).toBe(1);
    expect(keyboardMoveStepForViewBox(box, bounds, -0.4)).toBe(1);
    // 缺省 baseStep 是 6
    expect(keyboardMoveStepForViewBox(box, bounds)).toBe(6);
    // 步长也要随缩放：baseStep 抬到下限 1 之后仍乘缩放比
    expect(keyboardMoveStepForViewBox(viewBox(2000, 1600), bounds, 0)).toBe(2);
  });
});

// 拖边改画布尺寸时，被拖的那条边在画布原点坐标系里会移动，
// 内容必须跟着平移同样的距离，否则拖完画布内容整体跳一下。
describe("canvasResizeOriginShiftFromPointerDrag", () => {
  const edges = [
    "right",
    "bottom",
    "corner",
    "left",
    "top",
    "top-left",
    "top-right",
    "bottom-left"
  ] as const;
  const drag = (
    edge: CanvasResizeDragMetrics["edge"],
    over: Partial<CanvasResizeDragMetrics> = {}
  ): CanvasResizeDragMetrics => ({
    edge,
    startClientX: 100,
    startClientY: 200,
    startWidth: 1000,
    startHeight: 800,
    unitsPerCssX: 2,
    unitsPerCssY: 2,
    ...over
  });
  const minBounds = { width: 200, height: 100 };

  test("指针未拖动时八个方向都不产生偏移", () => {
    // 位移 0 ⇒ 新旧尺寸相同 ⇒ 差值为 0。
    // 这一条是下面所有对称性的锚点：若「无位移」也有偏移，说明偏移算的
    // 不是尺寸差而是别的东西（那下面几条的 0 就不代表原点没动）。
    for (const edge of edges) {
      expect(
        canvasResizeOriginShiftFromPointerDrag(drag(edge), { clientX: 100, clientY: 200 }, minBounds),
        edge
      ).toEqual({ x: 0, y: 0 });
    }
  });

  test("同一根边向右拖与向左拖的偏移互为相反数", () => {
    // 拖 left 边时向右拖把画布变窄（1000 − 100）⇒ 内容左移 100
    const toRight = canvasResizeOriginShiftFromPointerDrag(drag("left"), { clientX: 150, clientY: 200 }, minBounds);
    expect(toRight).toEqual({ x: -100, y: 0 });
    // 同一根边向左拖把画布变宽（1000 + 100）⇒ 内容右移 100
    const toLeft = canvasResizeOriginShiftFromPointerDrag(drag("left"), { clientX: 50, clientY: 200 }, minBounds);
    expect(toLeft).toEqual({ x: 100, y: 0 });
    expect(toRight.x).toBe(-toLeft.x);
    // 上下同理
    expect(canvasResizeOriginShiftFromPointerDrag(drag("top"), { clientX: 100, clientY: 250 }, minBounds))
      .toEqual({ x: 0, y: -100 });
    expect(canvasResizeOriginShiftFromPointerDrag(drag("top"), { clientX: 100, clientY: 150 }, minBounds))
      .toEqual({ x: 0, y: 100 });
    expect(
      canvasResizeOriginShiftFromPointerDrag(drag("top"), { clientX: 100, clientY: 250 }, minBounds).y
    ).toBe(-canvasResizeOriginShiftFromPointerDrag(drag("top"), { clientX: 100, clientY: 150 }, minBounds).y);
  });

  test("八个方向两两不串：只有被拖的那条轴上的那条边产生偏移", () => {
    // 指针右、下各 +50px（unitsPerCss 2 ⇒ 画布单位 +100）
    const pointer = { clientX: 150, clientY: 250 };
    const shifts = {} as Record<CanvasResizeDragMetrics["edge"], { x: number; y: number }>;
    for (const edge of edges) {
      shifts[edge] = canvasResizeOriginShiftFromPointerDrag(drag(edge), pointer, minBounds);
    }
    expect(shifts).toEqual({
      right: { x: 0, y: 0 },
      bottom: { x: 0, y: 0 },
      corner: { x: 0, y: 0 },
      left: { x: -100, y: 0 },
      top: { x: 0, y: -100 },
      "top-left": { x: -100, y: -100 },
      "top-right": { x: 0, y: -100 },
      "bottom-left": { x: -100, y: 0 }
    });
  });

  test("拖过最小尺寸后偏移饱和（按夹取后的尺寸算，不是按指针位移）", () => {
    // 拖 left 边时 deltaX = (2100−100)×2 = 4000 ⇒ 1000 − 4000 = −3000 ⇒ 触底 200 ⇒ 偏移 −800
    expect(canvasResizeOriginShiftFromPointerDrag(drag("left"), { clientX: 2100, clientY: 200 }, minBounds))
      .toEqual({ x: -800, y: 0 });
    // 再拖更远也不变 —— 偏移走的是夹取后的尺寸，不是指针位移
    expect(canvasResizeOriginShiftFromPointerDrag(drag("left"), { clientX: 99999, clientY: 200 }, minBounds))
      .toEqual({ x: -800, y: 0 });
    // 刚好差 1 画布单位触底（deltaX 798 ⇒ 202）⇒ 偏移还是跟着尺寸走
    expect(canvasResizeOriginShiftFromPointerDrag(drag("left"), { clientX: 499, clientY: 200 }, minBounds))
      .toEqual({ x: -798, y: 0 });
  });

  test("偏移按最终尺寸取整（起始尺寸是小数时也落到整数像素）", () => {
    // 起始宽 1000.4（来自画布状态，不保证是整数），拖出整数宽 998
    // ⇒ 差 −2.4 ⇒ 外层 Math.round 落 −2。
    // 判别力：canvasResizeBoundsFromPointerDrag 已经把新尺寸取整过了，
    // 所以**起始**尺寸是小数时，外层那一次 Math.round 才是唯一承重的一层；
    // 起始宽取整数的话这一层恒等于内层的取整结果（等价变异，绿了也说明不了问题）。
    const out = canvasResizeOriginShiftFromPointerDrag(
      drag("left", { startWidth: 1000.4 }),
      { clientX: 101, clientY: 200 },
      minBounds
    );
    expect(out).toEqual({ x: -2, y: 0 });
    // 负方向的平局同样向 +∞：unitsPerCssX 2.5、指针 +1px ⇒ 拖出整数宽 998，
    // 998 − 1000.5 = −2.5 ⇒ Math.round 落 −2（不是 −3）。
    // 判别力：去掉外层 Math.round 会得 −2.5；改成四舍五入远离零会得 −3。
    expect(
      canvasResizeOriginShiftFromPointerDrag(
        drag("left", { startWidth: 1000.5, unitsPerCssX: 2.5 }),
        { clientX: 101, clientY: 200 },
        minBounds
      )
    ).toEqual({ x: -2, y: 0 });
  });
});

// viewBox 尺寸夹取：把画布缩放到指定百分比时，viewBox 不能缩到让内容消失、
// 也不能放大到画布本身变成一个点。阈值由 min/max 缩放百分比换算而来。
describe("clampViewBoxDimensionsForZoom", () => {
  // 默认 5% ~ 2000% ⇒ 宽 ∈ [1000×0.05, 1000×20] = [50, 20000]
  //                        高 ∈ [ 800×0.05,  800×20] = [40, 16000]
  test("小于下限被抬起、大于上限被压下，两个轴各自夹", () => {
    expect(clampViewBoxDimensionsForZoom({ width: 10, height: 5 }, bounds)).toEqual({ width: 50, height: 40 });
    expect(clampViewBoxDimensionsForZoom({ width: 99999, height: 99999 }, bounds))
      .toEqual({ width: 20000, height: 16000 });
    // 一轴触下界、另一轴触上界 ⇒ 两轴独立，互不串
    expect(clampViewBoxDimensionsForZoom({ width: 10, height: 99999 }, bounds))
      .toEqual({ width: 50, height: 16000 });
    // 恰好贴上下界时不动（闭区间）
    expect(clampViewBoxDimensionsForZoom({ width: 50, height: 40 }, bounds)).toEqual({ width: 50, height: 40 });
  });

  test("区间内原样返回：夹取只动两端，既不取整也不缩放", () => {
    expect(clampViewBoxDimensionsForZoom({ width: 1000, height: 800 }, bounds))
      .toEqual({ width: 1000, height: 800 });
    // 小数原样透传 ⇒ 这一层没有偷偷取整
    expect(clampViewBoxDimensionsForZoom({ width: 123.456, height: 78.9 }, bounds))
      .toEqual({ width: 123.456, height: 78.9 });
  });

  test("自定义上下限真的换掉了默认阈值", () => {
    // 50% ~ 100% ⇒ 宽 ∈ [1000×1, 1000×2] = [1000, 2000]，高 ∈ [800, 1600]
    expect(clampViewBoxDimensionsForZoom({ width: 10, height: 10 }, bounds, 50, 100))
      .toEqual({ width: 1000, height: 800 });
    expect(clampViewBoxDimensionsForZoom({ width: 99999, height: 99999 }, bounds, 50, 100))
      .toEqual({ width: 2000, height: 1600 });
    // 同一输入在默认阈值下不被夹 ⇒ 证明上面那两条是自定义上下限在起作用
    expect(clampViewBoxDimensionsForZoom({ width: 10, height: 10 }, bounds)).toEqual({ width: 50, height: 40 });
  });

  test("上下限给反时以 minZoomPercent 为准（区间收敛成一点，不产出空区间）", () => {
    // min=100 / max=50 ⇒ safeMax 被抬到 100 ⇒ 两个比值都是 1 ⇒ 宽高都被钉成画布尺寸
    expect(clampViewBoxDimensionsForZoom({ width: 500, height: 300 }, bounds, 100, 50))
      .toEqual({ width: 1000, height: 800 });
    // 判别力：若 safeMax 不被抬到 safeMin，区间会变成 [2000, 1000] 这个空区间，
    // clampNumber 的 max(min, min(max, v)) 会把 500 抬到 2000 —— 与上面不同。
    // 对照组：上下限顺序正常且范围够宽时，500/300 原样通过。
    expect(clampViewBoxDimensionsForZoom({ width: 500, height: 300 }, bounds, 100, 1000))
      .toEqual({ width: 500, height: 300 });
  });

  test("上下限非正或小于 1 时先被抬到 1（不产出除零或无限上界）", () => {
    // min=0 ⇒ safeMin=1 ⇒ maxRatio=100 ⇒ 宽上界 1000×100 = 100000
    expect(clampViewBoxDimensionsForZoom({ width: 999999, height: 999999 }, bounds, 0))
      .toEqual({ width: 100000, height: 80000 });
    // min 为负同样被抬到 1
    expect(clampViewBoxDimensionsForZoom({ width: 999999, height: 999999 }, bounds, -50))
      .toEqual({ width: 100000, height: 80000 });
    // min=max=1 ⇒ 两个比值都是 100 ⇒ 区间收敛到 2000 倍，与 max 缺省时一致
    expect(clampViewBoxDimensionsForZoom({ width: 999999, height: 999999 }, bounds, 1, 1))
      .toEqual({ width: 100000, height: 80000 });
  });
});
