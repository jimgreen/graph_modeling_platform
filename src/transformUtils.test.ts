import { describe, expect, test } from "vitest";

import { createDefaultNode, isLineSegmentBusNode } from "./model";
import {
  projectedProportionalScaleFromHandleDelta,
  resizeLineSegmentBusGeometryFromHandleDrag,
  snapSingleTerminalAnchorToNearestSide
} from "./transformUtils";

describe("line-segment bus classification", () => {
  test.each([
    "ac-bus",
    "ac-bus-vertical",
    "dc-bus",
    "dc-bus-vertical",
    "hydrogen-bus",
    "heat-bus"
  ])("recognizes %s as a line-segment bus", (kind) => {
    expect(isLineSegmentBusNode(createDefaultNode(kind, { x: 100, y: 100 }))).toBe(true);
  });

  test("recognizes a derived ACRealBs component as a line-segment bus", () => {
    const node = {
      ...createDefaultNode("ac-bus", { x: 100, y: 100 }),
      kind: "custom-ac-bus",
      params: { component_type: "ACRealBs" }
    };

    expect(isLineSegmentBusNode(node)).toBe(true);
  });

  test.each([
    "hydrogen-tank",
    "hydrogen-tank-horizontal",
    "hydrogen-tank-container",
    "thermal-storage-tank"
  ])("does not classify boundary storage %s as a line segment", (kind) => {
    expect(isLineSegmentBusNode(createDefaultNode(kind, { x: 100, y: 100 }))).toBe(false);
  });
});

describe("line-segment bus handle resizing", () => {
  test("moves the dragged end and keeps the opposite end fixed without changing scale", () => {
    const node = {
      ...createDefaultNode("ac-bus", { x: 100, y: 100 }),
      size: { width: 120, height: 28 },
      scale: 1.25,
      scaleX: 1,
      scaleY: 1
    };

    const resized = resizeLineSegmentBusGeometryFromHandleDrag({
      node,
      startPoint: { x: 174, y: 100 },
      point: { x: 214, y: 100 },
      handleXDirection: 1,
      handleYDirection: 0,
      resizeX: true,
      resizeY: false
    });

    expect(resized.position).toEqual({ x: 120, y: 100 });
    expect(resized.size).toEqual({ width: 160, height: 28 });
    expect(resized.scale).toBe(1.25);
    expect(resized.scaleX).toBe(1);
    expect(resized.scaleY).toBe(1);
    expect(resized.position.x - resized.size.width / 2).toBe(40);
  });

  test("changes the displayed height for a rotated vertical bus", () => {
    const node = {
      ...createDefaultNode("ac-bus-vertical", { x: 100, y: 100 }),
      size: { width: 120, height: 28 },
      rotation: 90,
      scaleX: 1,
      scaleY: 1
    };

    const resized = resizeLineSegmentBusGeometryFromHandleDrag({
      node,
      startPoint: { x: 100, y: 174 },
      point: { x: 100, y: 214 },
      handleXDirection: 1,
      handleYDirection: 0,
      resizeX: true,
      resizeY: false
    });

    expect(resized.position.x).toBeCloseTo(100, 8);
    expect(resized.position.y).toBeCloseTo(120, 8);
    expect(resized.size).toEqual({ width: 160, height: 28 });
    expect(resized.rotation).toBe(90);
  });

  test("changes only the local height from a horizontal bus side handle", () => {
    const node = {
      ...createDefaultNode("dc-bus", { x: 100, y: 100 }),
      size: { width: 120, height: 28 },
      scale: 1.4,
      scaleX: 1.2,
      scaleY: 1
    };

    const resized = resizeLineSegmentBusGeometryFromHandleDrag({
      node,
      startPoint: { x: 100, y: 86 },
      point: { x: 100, y: 66 },
      handleXDirection: 0,
      handleYDirection: -1,
      resizeX: false,
      resizeY: true
    });

    expect(resized.position).toEqual({ x: 100, y: 90 });
    expect(resized.size).toEqual({ width: 120, height: 48 });
    expect(resized.scale).toBe(1.4);
    expect(resized.scaleX).toBe(1.2);
    expect(resized.scaleY).toBe(1);
    expect(resized.position.y + resized.size.height / 2).toBe(114);
  });

  test("changes width and height together from a corner while keeping the opposite corner fixed", () => {
    const node = {
      ...createDefaultNode("ac-bus", { x: 100, y: 100 }),
      size: { width: 120, height: 28 },
      scale: 1.3,
      scaleX: 1,
      scaleY: 1
    };

    const resized = resizeLineSegmentBusGeometryFromHandleDrag({
      node,
      startPoint: { x: 160, y: 114 },
      point: { x: 200, y: 134 },
      handleXDirection: 1,
      handleYDirection: 1,
      resizeX: true,
      resizeY: true
    });

    expect(resized.position).toEqual({ x: 120, y: 110 });
    expect(resized.size).toEqual({ width: 160, height: 48 });
    expect(resized.scale).toBe(1.3);
    expect(resized.scaleX).toBe(1);
    expect(resized.scaleY).toBe(1);
    expect(resized.position.x - resized.size.width / 2).toBe(40);
    expect(resized.position.y - resized.size.height / 2).toBe(86);
  });

  test("maps a screen-horizontal side drag to local height for a 90-degree bus", () => {
    const node = {
      ...createDefaultNode("dc-bus-vertical", { x: 100, y: 100 }),
      size: { width: 120, height: 28 },
      rotation: 90,
      scale: 1.6,
      scaleX: 1,
      scaleY: 1
    };

    const resized = resizeLineSegmentBusGeometryFromHandleDrag({
      node,
      startPoint: { x: 86, y: 100 },
      point: { x: 66, y: 100 },
      handleXDirection: 0,
      handleYDirection: 1,
      resizeX: false,
      resizeY: true
    });

    expect(resized.position.x).toBeCloseTo(90, 8);
    expect(resized.position.y).toBeCloseTo(100, 8);
    expect(resized.size).toEqual({ width: 120, height: 48 });
    expect(resized.scale).toBe(1.6);
    expect(resized.scaleX).toBe(1);
    expect(resized.scaleY).toBe(1);
  });

  test("accounts for an existing visual scale while changing the stored size", () => {
    const node = {
      ...createDefaultNode("dc-bus", { x: 100, y: 100 }),
      size: { width: 120, height: 28 },
      scaleX: 2,
      scaleY: 1
    };

    const resized = resizeLineSegmentBusGeometryFromHandleDrag({
      node,
      startPoint: { x: 234, y: 100 },
      point: { x: 274, y: 100 },
      handleXDirection: 1,
      handleYDirection: 0,
      resizeX: true,
      resizeY: false
    });

    expect(resized.position).toEqual({ x: 120, y: 100 });
    expect(resized.size).toEqual({ width: 140, height: 28 });
    expect(resized.scaleX).toBe(2);
  });

  test("clamps a shortened segment and still keeps the opposite end fixed", () => {
    const node = {
      ...createDefaultNode("ac-bus", { x: 100, y: 100 }),
      size: { width: 120, height: 28 },
      scaleX: 1,
      scaleY: 1
    };

    const resized = resizeLineSegmentBusGeometryFromHandleDrag({
      node,
      startPoint: { x: 26, y: 100 },
      point: { x: 200, y: 100 },
      handleXDirection: -1,
      handleYDirection: 0,
      resizeX: true,
      resizeY: false
    });

    expect(resized.position).toEqual({ x: 156, y: 100 });
    expect(resized.size).toEqual({ width: 8, height: 28 });
    expect(resized.position.x + resized.size.width / 2).toBe(160);
  });
});

describe("projected proportional scale from handle delta", () => {
  // 投影向量 = (handleXDirection * max(1, width) / 2, handleYDirection * max(1, height) / 2)。
  // x 臂为 0 时, deltaX 完全不参与缩放 —— 下面 deltaX 刻意取非零的 40,
  // 否则「x 臂是否真的取 0」无法与「x 臂取了别的值」区分开。
  const FALSY_X_DIRECTIONS: Array<0 | undefined> = [0, undefined];
  test.each(FALSY_X_DIRECTIONS)(
    "ignores deltaX when handleXDirection is %s and scales by the height axis alone",
    (handleXDirection) => {
      const scaled = projectedProportionalScaleFromHandleDelta({
        currentScale: 2,
        width: 100,
        height: 60,
        handleXDirection,
        handleYDirection: 1,
        deltaX: 40,
        deltaY: 60
      });

      // pv = { x: 0, y: 60 / 2 = 30 }; lenSq = 900; scaleDelta = (40 * 0 + 60 * 30) / 900 = 2
      expect(scaled).toBe(4);
    }
  );

  test("lets deltaX contribute once handleXDirection is non-zero", () => {
    const scaled = projectedProportionalScaleFromHandleDelta({
      currentScale: 2,
      width: 100,
      height: 60,
      handleXDirection: 1,
      handleYDirection: 1,
      deltaX: 40,
      deltaY: 60
    });

    // pv = { x: 50, y: 30 }; lenSq = 3400; scaleDelta = (40 * 50 + 60 * 30) / 3400 = 3800 / 3400
    expect(scaled).toBeCloseTo(2 + 3800 / 3400, 10);
    // 对照:x 臂取 0 时同一个 deltaX 得到的 4 与此值不同, 证明 x 分量确实被计入了
    expect(scaled).not.toBe(4);
  });

  test("returns the untouched current scale when neither handle direction is set", () => {
    const scaled = projectedProportionalScaleFromHandleDelta({
      currentScale: 1.5,
      width: 100,
      height: 60,
      handleXDirection: 0,
      handleYDirection: 0,
      deltaX: 80,
      deltaY: 60
    });

    // pv = (0, 0) => lenSq = 0 => 直接返回 safeCurrentScale。
    // currentScale 刻意取 1.5(非 1), 否则断言值会与 normalizeScaleValue 的兜底 1 同值, 失去判别力。
    expect(scaled).toBe(1.5);
  });

  test("only short-circuits when both axes are zero, not when a single axis is", () => {
    const scaled = projectedProportionalScaleFromHandleDelta({
      currentScale: 1.5,
      width: 100,
      height: 60,
      handleXDirection: 0,
      handleYDirection: 1,
      deltaX: 80,
      deltaY: 60
    });

    // pv = { x: 0, y: 30 }; lenSq = 900; scaleDelta = 60 * 30 / 900 = 2 => 3.5
    expect(scaled).toBe(3.5);
    expect(scaled).not.toBe(1.5);
  });
});

describe("terminal anchor snapping with a degenerate visual scale", () => {
  // scaleX = 0 是 §6.18 里那一档「falsy 但非 nullish」: getNodeScaleX 原样返回 0,
  // `|| 1` 把它换成 1, `?? 1` 则原样保留 0。只有 0 这一档能区分 || 与 ??。
  // 几何: position(100,100) + point(120,130) => local = (20, 30);
  // 正确态 signedWidth = 240 * 1 = 240 => 四个候选点分别为
  //   (120, 0) d=10900 / (-120, 0) d=20500 / (0, 80) d=2900 / (0, -80) d=12500  => 最近 (0, 80)
  // 变异态 signedWidth = 240 * 0 = 0 => 左右两候选都塌到原点,
  //   (0, 0) d=1300 / (0, 0) d=1300 / (0, 80) d=2900 => 最近 (0, 0) => { x: 0.5, y: 0 }
  test("treats a zero scaleX as one when measuring the candidate side midpoints", () => {
    const node = {
      ...createDefaultNode("ac-load", { x: 100, y: 100 }),
      size: { width: 240, height: 160 },
      scaleX: 0
    };

    expect(snapSingleTerminalAnchorToNearestSide(node, { x: 120, y: 130 })).toEqual({ x: 0, y: 0.5 });
  });

  // L20 的夹具 = L19 沿水平轴镜像: scaleY = 0(同样落在 §6.18 的 falsy-but-not-nullish 档),
  // point 取镜像点 (120, 70) => local = (20, -30)。
  // 正确态 signedHeight = 160 * 1 = 160, 四候选
  //   (120,0) d=10900 / (-120,0) d=20500 / (0,80) d=12500 / (0,-80) d=2900  => 最近 (0,-80)
  // 变异态 signedHeight = 160 * 0 = 0, 上下两候选塌到原点 => (0,0) d=1300 先到 => { x: 0.5, y: 0 }
  // 之所以选镜像点而非原 (120,130): 原点上下两个候选在点下方时最近的是 {0,0.5},
  // 变异后仍是 (0,0) 距离 1300 < 2900, 赢家不变 —— 那样这条断言就恒绿了。
  test("treats a zero scaleY as one when measuring the candidate side midpoints", () => {
    const node = {
      ...createDefaultNode("ac-load", { x: 100, y: 100 }),
      size: { width: 240, height: 160 },
      scaleY: 0
    };

    expect(snapSingleTerminalAnchorToNearestSide(node, { x: 120, y: 70 })).toEqual({ x: 0, y: -0.5 });
  });
});

describe("bus resize with a degenerate stored scale", () => {
  // L115 / L116: `Math.abs(getNodeScaleX(node)) || 1`。scaleX / scaleY 为 0 时
  // Math.abs 给出 0, 只能靠 `|| 1` 兜回 1。
  // 变异刻意用形态 2(`|| 1` -> `|| 2`)而非 `?? 1`:
  // 后者会让分母变成 0, nextWidth 算成 Infinity, 断言整体 toEqual 失败却指不到改动的那个量(§6.14 劣质 RED)。
  // 夹具让 X / Y 两轴都参与 resize, 于是 `|| 2` 落在哪一轴就只有哪一轴的尺寸断言变红,
  // width / height 分开断言, 失败信息能指名是哪一个量。
  test("treats a zero stored scale as one on both axes when resizing", () => {
    const node = {
      ...createDefaultNode("dc-bus", { x: 100, y: 100 }),
      size: { width: 120, height: 28 },
      scaleX: 0,
      scaleY: 0
    };

    const resized = resizeLineSegmentBusGeometryFromHandleDrag({
      node,
      startPoint: { x: 160, y: 114 },
      point: { x: 200, y: 134 },
      handleXDirection: 1,
      handleYDirection: 1,
      resizeX: true,
      resizeY: true
    });

    // safeScaleX = safeScaleY = 1 => 位移全额计入: 120 + 40 = 160, 28 + 20 = 48
    expect(resized.size.width).toBe(160);
    expect(resized.size.height).toBe(48);
    expect(resized.position).toEqual({ x: 120, y: 110 });
  });

  test("still divides the pointer delta by a real non-unit scale", () => {
    const node = {
      ...createDefaultNode("dc-bus", { x: 100, y: 100 }),
      size: { width: 120, height: 28 },
      scaleX: 2,
      scaleY: 2
    };

    const resized = resizeLineSegmentBusGeometryFromHandleDrag({
      node,
      startPoint: { x: 160, y: 114 },
      point: { x: 200, y: 134 },
      handleXDirection: 1,
      handleYDirection: 1,
      resizeX: true,
      resizeY: true
    });

    // 对照: 真实 scale 2 => 120 + 40 / 2 = 140, 28 + 20 / 2 = 38
    // 与上面 scale 0 的 160 / 48 不同, 说明 `|| 1` 兜底不是恒等直通
    expect(resized.size.width).toBe(140);
    expect(resized.size.height).toBe(38);
  });
});
