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
  clampNodePositionToBounds,
  calculateModelGeometryBounds,
  clampEdgeGeometryToBounds,
  geometryBoundsInsideCanvas,
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
});
