// 量测组锚点：命中端子用端子点、否则退回节点位置；absolute 决定是否减掉节点位置变成局部坐标。
// 局部坐标的减法最容易在「回退分支」被漏掉（回退时局部坐标必须是 {0,0} 而不是节点位置）。
import { describe, expect, test, vi } from "vitest";

import {
  createMeasurementGroupAnchorPoint,
  createMeasurementGroupCanvasPosition
} from "./appExtracted/appGraphMeasurementFactories";

const node = (terminals: any[] = [], position = { x: 100, y: 200 }) => ({ id: "n1", position, terminals });

function createScope(offsetScale = { x: 1, y: 1 }) {
  const getTerminalPoint = vi.fn((_n: any, terminalId: string) => (terminalId === "t1" ? { x: 130, y: 230 } : { x: 0, y: 0 }));
  const measurementOffsetScaleForNode = vi.fn(() => offsetScale);
  const scope: Record<string, any> = { getTerminalPoint, measurementOffsetScaleForNode };
  scope.measurementGroupAnchorPoint = createMeasurementGroupAnchorPoint(scope);
  scope.measurementGroupLocalOffset = (n: any, g: any) => ({
    x: g.offset.x * measurementOffsetScaleForNode(n).x,
    y: g.offset.y * measurementOffsetScaleForNode(n).y
  });
  scope.measurementGroupCanvasPosition = createMeasurementGroupCanvasPosition(scope);
  return { scope, getTerminalPoint, measurementOffsetScaleForNode };
}

describe("createMeasurementGroupAnchorPoint", () => {
  const group = (terminalId?: string) => ({ terminalId, offset: { x: 0, y: 0 } });

  test("命中端子且 absolute=true 时返回端子绝对坐标", () => {
    const { scope } = createScope();
    const n = node([{ id: "t1" }]);

    expect(scope.measurementGroupAnchorPoint(n, group("t1"), true)).toEqual({ x: 130, y: 230 });
  });

  test("命中端子且 absolute=false 时返回相对节点位置的局部坐标", () => {
    const { scope } = createScope();
    const n = node([{ id: "t1" }], { x: 100, y: 200 });

    expect(scope.measurementGroupAnchorPoint(n, group("t1"), false)).toEqual({ x: 30, y: 30 });
  });

  test("group 无 terminalId 时退回节点位置（absolute=true）", () => {
    const { scope, getTerminalPoint } = createScope();
    const n = node([{ id: "t1" }], { x: 100, y: 200 });

    expect(scope.measurementGroupAnchorPoint(n, group(undefined), true)).toEqual({ x: 100, y: 200 });
    expect(getTerminalPoint).not.toHaveBeenCalled();
  });

  test("group 无 terminalId 且 absolute=false 时返回原点，不是节点位置", () => {
    const { scope } = createScope();
    const n = node([], { x: 100, y: 200 });

    expect(scope.measurementGroupAnchorPoint(n, group(undefined), false)).toEqual({ x: 0, y: 0 });
  });

  test("terminalId 写了但节点上没有这个端子 → 同样退回", () => {
    const { scope } = createScope();
    const n = node([{ id: "别的端子" }], { x: 100, y: 200 });

    expect(scope.measurementGroupAnchorPoint(n, group("t1"), true)).toEqual({ x: 100, y: 200 });
  });
});

describe("createMeasurementGroupCanvasPosition", () => {
  test("锚点加偏移", () => {
    const { scope } = createScope();
    const n = node([{ id: "t1" }], { x: 100, y: 200 });

    expect(scope.measurementGroupCanvasPosition(n, { terminalId: "t1", offset: { x: 10, y: 20 } })).toEqual({ x: 140, y: 250 });
  });

  test("偏移按节点缩放系数缩放后再相加", () => {
    const { scope } = createScope({ x: 2, y: 0.5 });
    const n = node([], { x: 0, y: 0 });

    expect(scope.measurementGroupCanvasPosition(n, { terminalId: undefined, offset: { x: 10, y: 20 } })).toEqual({ x: 20, y: 10 });
  });
});
