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
  clampNodePositionToBounds,
  calculateModelGeometryBounds,
  clampEdgeGeometryToBounds,
  geometryBoundsInsideCanvas,
  mirrorNodes,
  normalizeViewBoxToCanvas,
  viewBoxZoomPercent
} from "./model-canvas-ops";
import { calculateNodeVisualBounds } from "./model";
import type { Edge, ModelNode } from "./model";

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
    expect(result.x).toBeGreaterThanOrEqual(0);
    expect(result.y).toBeGreaterThanOrEqual(0);
    // 视觉框含图元体 + 线路 + **标签**（calculateNodeVisualBounds 合并三者），
    // 故半宽不止 size.width/2 —— 这里断言「恰好贴合视觉框左缘」而非魔数。
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
