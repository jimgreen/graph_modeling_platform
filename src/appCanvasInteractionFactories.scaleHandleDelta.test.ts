// 缩放手柄：单轴（旋转/正立两种取点方式）与等比缩放。
// 关键契约：① 尺寸为 0 时用 1 兜底做除数，避免除零产生 Infinity；
// ② 负缩放（镜像）保号：最终值取原符号，幅度非负；
// ③ 手柄方向缺省时按起点局部坐标符号推断，推不出则取 1。
import { describe, expect, test, vi } from "vitest";

import {
  createProportionalSignedScaleFromHandleDelta,
  createProportionalSignedScaleFromUprightHandleDelta,
  createSignedScaleFromRotatedHandleDelta,
  createSignedScaleFromUprightHandleDelta
} from "./appExtracted/appCanvasInteractionFactories";

const pt = (x: number, y: number) => ({ x, y });

/** signedScale：保号 + 幅度兜底（幅度 0 时取 1，0 倍会塌成不可见）。 */
function signedScale(magnitude: number, reference: number) {
  const sign = reference < 0 ? -1 : 1;
  return sign * Math.max(magnitude, 1);
}

function createScope(over: Record<string, any> = {}) {
  return {
    getNodeScaleX: vi.fn((n: any) => n.scaleX ?? n.scale ?? 1),
    getNodeScaleY: vi.fn((n: any) => n.scaleY ?? n.scale ?? 1),
    toLocalNodePoint: vi.fn((_n: any, p: any) => p),
    signedScale,
    projectedProportionalScaleFromHandleDelta: vi.fn(({ currentScale, deltaX, deltaY }: any) => currentScale + (deltaX + deltaY) / 100),
    ...over
  };
}

const node = (over: Record<string, any> = {}) => ({ id: "n1", rotation: 0, scale: 1, size: { width: 100, height: 50 }, ...over });

describe("createSignedScaleFromRotatedHandleDelta", () => {
  const build = createSignedScaleFromRotatedHandleDelta(createScope());

  test("往右拖 50px、宽 100 → 幅度 1 + 50*2/100 = 2", () => {
    const result = build({ startPoint: pt(0, 0), handleXDirection: 1 } as any, pt(50, 0), node() as any, "scale-x");
    expect(result).toBe(2);
  });

  test("手柄在外侧（方向 -1）时往里拖即缩小", () => {
    const result = build({ startPoint: pt(0, 0), handleXDirection: -1 } as any, pt(50, 0), node() as any, "scale-x");
    // 位移 50、方向 -1 → 幅度 1 - 1 = 0，被 signedScale 兜到 1
    expect(result).toBe(1);
  });

  test("scale-y 走高度做除数", () => {
    const result = build({ startPoint: pt(0, 0), handleYDirection: 1 } as any, pt(0, 25), node() as any, "scale-y");
    expect(result).toBe(2);
  });

  test("尺寸为 0 时用 1 兜底，不产生 Infinity", () => {
    const result = build(
      { startPoint: pt(0, 0), handleXDirection: 1 } as any,
      pt(10, 0),
      node({ size: { width: 0, height: 0 } }) as any,
      "scale-x"
    );
    expect(Number.isFinite(result)).toBe(true);
    expect(result).toBe(21);
  });

  test("缩到负数时幅度被夹到 0，再由 signedScale 兜到 1", () => {
    const result = build({ startPoint: pt(0, 0), handleXDirection: 1 } as any, pt(-500, 0), node() as any, "scale-x");
    expect(result).toBe(1);
  });

  test("原本是镜像（负缩放）时保号", () => {
    const result = build(
      { startPoint: pt(0, 0), handleXDirection: 1 } as any,
      pt(50, 0),
      node({ scale: -1 }) as any,
      "scale-x"
    );
    expect(result).toBe(-2);
  });

  test("手柄方向缺省时按起点局部坐标符号推断", () => {
    const buildLocal = createSignedScaleFromRotatedHandleDelta(createScope());
    // 起点在负半轴 → 方向 -1；向中心靠拢 25px → 幅度 1 - 0.5 = 0.5，被兜到 1
    expect(buildLocal({ startPoint: pt(-50, 0) } as any, pt(-25, 0), node() as any, "scale-x")).toBe(1);
  });

  test("起点在原点时方向推断不出，取 1", () => {
    const buildLocal = createSignedScaleFromRotatedHandleDelta(createScope());
    expect(buildLocal({ startPoint: pt(0, 0) } as any, pt(50, 0), node() as any, "scale-x")).toBe(2);
  });
});

describe("createSignedScaleFromUprightHandleDelta", () => {
  const build = createSignedScaleFromUprightHandleDelta(createScope());

  test("按屏幕位移直接算，不做局部坐标换算", () => {
    const scope = createScope();
    const buildLocal = createSignedScaleFromUprightHandleDelta(scope);

    buildLocal({ startPoint: pt(10, 10), handleXDirection: 1 } as any, pt(60, 10), node() as any, "scale-x");

    expect(scope.toLocalNodePoint).not.toHaveBeenCalled();
  });

  test("往右拖 50px、宽 100 → 幅度 2", () => {
    expect(build({ startPoint: pt(0, 0), handleXDirection: 1 } as any, pt(50, 0), node() as any, "scale-x")).toBe(2);
  });

  test("方向缺省按 1 处理", () => {
    expect(build({ startPoint: pt(0, 0) } as any, pt(50, 0), node() as any, "scale-x")).toBe(2);
  });

  test("尺寸为 0 时不产生 Infinity", () => {
    const result = build(
      { startPoint: pt(0, 0), handleXDirection: 1 } as any,
      pt(10, 0),
      node({ size: { width: 0, height: 50 } }) as any,
      "scale-x"
    );
    expect(Number.isFinite(result)).toBe(true);
  });

  test("scale-y 走高度", () => {
    expect(build({ startPoint: pt(0, 0), handleYDirection: 1 } as any, pt(0, 25), node() as any, "scale-y")).toBe(2);
  });

  test("镜像保号", () => {
    expect(build({ startPoint: pt(0, 0), handleXDirection: 1 } as any, pt(50, 0), node({ scale: -1 }) as any, "scale-x")).toBe(-2);
  });
});

describe("等比缩放", () => {
  const drag = { startPoint: pt(0, 0), handleXDirection: 1, handleYDirection: 1 };

  test("当前尺度取两轴绝对值的大者", () => {
    const scope = createScope();
    const build = createProportionalSignedScaleFromUprightHandleDelta(scope);

    build(drag as any, pt(0, 0), node({ scaleX: 1, scaleY: 3 }) as any);

    expect(scope.projectedProportionalScaleFromHandleDelta.mock.calls[0][0].currentScale).toBe(3);
  });

  test("返回统一 scale 与各自保号的 scaleX / scaleY", () => {
    const build = createProportionalSignedScaleFromUprightHandleDelta(createScope());

    const result = build(drag as any, pt(0, 0), node({ scaleX: 1, scaleY: -3 }) as any);

    expect(result.scale).toBe(3);
    expect(result.scaleX).toBe(3);
    expect(result.scaleY).toBe(-3);
  });

  test("旋转版把位移换算到局部坐标后再交给投影函数", () => {
    const scope = createScope();
    const build = createProportionalSignedScaleFromHandleDelta(scope);

    build(drag as any, pt(30, 40), node() as any);

    const arg = scope.projectedProportionalScaleFromHandleDelta.mock.calls[0][0];
    expect(arg.deltaX).toBe(30);
    expect(arg.deltaY).toBe(40);
    expect(scope.toLocalNodePoint).toHaveBeenCalled();
  });

  test("正立版直接用屏幕位移，不做局部换算", () => {
    const scope = createScope();
    const build = createProportionalSignedScaleFromUprightHandleDelta(scope);

    build(drag as any, pt(30, 40), node() as any);

    const arg = scope.projectedProportionalScaleFromHandleDelta.mock.calls[0][0];
    expect(arg.deltaX).toBe(30);
    expect(arg.deltaY).toBe(40);
  });

  test("节点尺寸一起透传给投影函数", () => {
    const scope = createScope();
    const build = createProportionalSignedScaleFromUprightHandleDelta(scope);

    build(drag as any, pt(0, 0), node() as any);

    expect(scope.projectedProportionalScaleFromHandleDelta.mock.calls[0][0]).toMatchObject({
      width: 100,
      height: 50,
      handleXDirection: 1,
      handleYDirection: 1
    });
  });
});
