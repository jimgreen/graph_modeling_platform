// 组变换（旋转 / 缩放 / 镜像）几何纯函数群。
//
// 这些函数在 appCanvasInteractionFactories.test.ts 里只被当作**依赖注入**传给
// 工厂（`createBuildGroupTransformNodeUpdates({ groupTransformGeometry, … })`），
// 从未被直接断言过 —— 也就是说拖拽预览用的那套手柄方向 / 等比 / 吸附语义
// 全靠下游集成测试的间接表现兜着，一条分支改了也没人会红。
//
// 这里直接锁定：手柄方向取符号、零宽包围盒的半宽下限、钳 0、NaN 兜底、
// Math.round 的平局方向（向 +∞）、以及 SVG 字符串的逐字节形态。
import { describe, expect, test } from "vitest";
import {
  groupTransformGeometry,
  groupTransformSvgTransform,
  localScaleKindForScreenHandle,
  mirrorPointAcrossAxis,
  normalizedRotationDelta,
  rotationDeltaBetweenTransformPoints,
  rotationDeltaFromTransformPoint,
  rotationTrajectoryArcPath,
  routeMidpoint,
  transformGroupPoint,
  transformPointAngle,
  type GroupTransformDrag
} from "./appExtracted/appCoreCanvasUtilities";

const ORIGIN = { x: 0, y: 0 };

const bounds100 = { left: 0, top: 0, right: 100, bottom: 100 };

const drag = (over: Partial<GroupTransformDrag> = {}): GroupTransformDrag =>
  ({
    kind: "scale-x",
    groupId: "g1",
    nodeIds: ["n1"],
    bounds: bounds100,
    center: ORIGIN,
    startPoint: ORIGIN,
    originalNodes: {},
    originalEdgeRoutes: [],
    ...over
  }) as GroupTransformDrag;

describe("routeMidpoint：按**弧长**取中点（不是按点序号）", () => {
  test("空数组 → null", () => {
    expect(routeMidpoint([])).toBeNull();
  });

  test("单点 → 该点本身（返回原引用）", () => {
    const only = { x: 1, y: 2 };
    expect(routeMidpoint([only])).toBe(only);
  });

  test("两点直线 → 几何中点", () => {
    expect(routeMidpoint([{ x: 0, y: 0 }, { x: 10, y: 0 }])).toEqual({ x: 5, y: 0 });
  });

  test("★ 折线：落点由弧长决定 —— 前段 30 长、后段 10 长，中点在第一段里", () => {
    // 总弧长 40 → target 20；第一段长度 30 ≥ 20，比值 2/3 → y = round(30 × 2/3) = 20。
    // 按点序号取中点会落在 (10, 30)，二者不同，故这条能区分两种实现。
    expect(routeMidpoint([{ x: 0, y: 0 }, { x: 0, y: 30 }, { x: 10, y: 30 }])).toEqual({ x: 0, y: 20 });
  });

  test("中点跨段时按累计弧长定位", () => {
    expect(routeMidpoint([{ x: 0, y: 0 }, { x: 0, y: 10 }, { x: 10, y: 10 }, { x: 10, y: 20 }])).toEqual({ x: 5, y: 10 });
  });

  test("全零长度 → 取下中位点（不是首点）", () => {
    const points = [{ x: 5, y: 5 }, { x: 5, y: 5 }, { x: 5, y: 5 }];
    expect(routeMidpoint(points)).toBe(points[1]);
  });

  test("两点重合 → 取末点", () => {
    const points = [{ x: 5, y: 5 }, { x: 5, y: 5 }];
    expect(routeMidpoint(points)).toBe(points[1]);
  });

  test("★ 段长为 NaN 时总长也是 NaN，循环内的 `>=` 恒假 → 落到末点兜底分支", () => {
    // 这是 `return points[points.length - 1]` 唯一可达的路径：NaN 让 `walked + length >= target`
    // 恒为 false，正常路径的最后一段短路永远不会失败。
    const points = [{ x: 0, y: 0 }, { x: Number.NaN, y: 0 }, { x: 5, y: 5 }];
    expect(routeMidpoint(points)).toBe(points[2]);
  });
});

describe("normalizedRotationDelta：归一到 (-180, 180]", () => {
  test("常规角原样返回", () => {
    expect(normalizedRotationDelta(0)).toBe(0);
    expect(normalizedRotationDelta(90)).toBe(90);
    expect(normalizedRotationDelta(-90)).toBe(-90);
  });

  test("★ 180 与 -180 都归到 -180（区间是左开右闭的 (-180, 180]）", () => {
    expect(normalizedRotationDelta(180)).toBe(-180);
    expect(normalizedRotationDelta(-180)).toBe(-180);
  });

  test("多圈角折回", () => {
    expect(normalizedRotationDelta(270)).toBe(-90);
    expect(normalizedRotationDelta(-270)).toBe(90);
    expect(normalizedRotationDelta(360)).toBe(0);
    expect(normalizedRotationDelta(720 + 45)).toBe(45);
  });
});

describe("transformPointAngle：极角 + 90°（12 点钟为 0）", () => {
  test("四个正方向", () => {
    expect(transformPointAngle(ORIGIN, { x: 10, y: 0 })).toBeCloseTo(90, 10);
    expect(transformPointAngle(ORIGIN, { x: 0, y: 10 })).toBeCloseTo(180, 10);
    expect(transformPointAngle(ORIGIN, { x: -10, y: 0 })).toBeCloseTo(270, 10);
    expect(transformPointAngle(ORIGIN, { x: 0, y: -10 })).toBeCloseTo(0, 10);
  });

  test("与中心重合时 atan2(0,0) 得 0 → 90°", () => {
    expect(transformPointAngle({ x: 3, y: 3 }, { x: 3, y: 3 })).toBeCloseTo(90, 10);
  });
});

describe("rotationDeltaFromTransformPoint / rotationDeltaBetweenTransformPoints", () => {
  test("单点版：绝对角 + 归一", () => {
    expect(rotationDeltaFromTransformPoint(ORIGIN, { x: 10, y: 0 })).toBe(90);
    expect(rotationDeltaFromTransformPoint(ORIGIN, { x: 0, y: 10 })).toBe(-180);
  });

  test("两点版：相对角（正右 → 正上 = +90）", () => {
    expect(rotationDeltaBetweenTransformPoints(ORIGIN, { x: 10, y: 0 }, { x: 0, y: 10 })).toBe(90);
    expect(rotationDeltaBetweenTransformPoints(ORIGIN, { x: 10, y: 0 }, { x: 10, y: 0 })).toBe(0);
  });

  test("★ 吸附到直角：135° 向上取 180（Math.round 平局向 +∞）", () => {
    expect(rotationDeltaFromTransformPoint(ORIGIN, { x: 10, y: 10 }, true)).toBe(180);
    expect(rotationDeltaBetweenTransformPoints(ORIGIN, { x: 10, y: 0 }, { x: 10, y: 10 }, true)).toBe(90);
  });

  test("★ 平局方向在负角侧不对称：-135° 吸附成 -90 而不是 -180", () => {
    // Math.round(-1.5) === -1（半数向 +∞），所以负向的半格与正向不同结果。
    // 拖拽因此在负方向少吸附 90°，属可达行为，此处如实锁定。
    expect(rotationDeltaFromTransformPoint(ORIGIN, { x: -10, y: 10 }, true)).toBe(-90);
  });

  test("不吸附时保留原始小数角（不取整）", () => {
    expect(rotationDeltaFromTransformPoint(ORIGIN, { x: 10, y: 10 })).toBeCloseTo(135, 10);
  });
});

describe("rotationTrajectoryArcPath：旋转预览的 SVG 弧", () => {
  test("★ |degrees| < 0.5 直接返回空串（不产出退化弧）", () => {
    expect(rotationTrajectoryArcPath(ORIGIN, { x: 10, y: 0 }, 0)).toBe("");
    expect(rotationTrajectoryArcPath(ORIGIN, { x: 10, y: 0 }, 0.4)).toBe("");
    expect(rotationTrajectoryArcPath(ORIGIN, { x: 10, y: 0 }, -0.4)).toBe("");
  });

  test("0.5° 是边界（不小于 0.5，出弧）", () => {
    expect(rotationTrajectoryArcPath(ORIGIN, { x: 10, y: 0 }, 0.5)).not.toBe("");
  });

  test("正 90°：large-arc=0 / sweep=1", () => {
    expect(rotationTrajectoryArcPath(ORIGIN, { x: 10, y: 0 }, 90)).toBe("M 10 0 A 10 10 0 0 1 0 10");
  });

  test("负角 → sweep=0", () => {
    expect(rotationTrajectoryArcPath(ORIGIN, { x: 10, y: 0 }, -90)).toBe("M 10 0 A 10 10 0 0 0 0 -10");
  });

  test("★ |degrees| > 180 → large-arc=1（270° 走长弧）", () => {
    expect(rotationTrajectoryArcPath(ORIGIN, { x: 10, y: 0 }, 270)).toBe("M 10 0 A 10 10 0 1 1 0 -10");
  });

  test("★ 起点与圆心重合时半径被抬到 1（`A 0 0` 是无效弧）", () => {
    expect(rotationTrajectoryArcPath({ x: 5, y: 5 }, { x: 5, y: 5 }, 90)).toBe("M 5 5 A 1 1 0 0 1 5 5");
  });

  test("端点按整数像素输出（45° → 7 7）", () => {
    expect(rotationTrajectoryArcPath(ORIGIN, { x: 10, y: 0 }, 45)).toBe("M 10 0 A 10 10 0 0 1 7 7");
  });
});

describe("mirrorPointAcrossAxis：以 center 为轴镜像（取整到整数）", () => {
  test("水平轴：只翻 x", () => {
    expect(mirrorPointAcrossAxis({ x: 30, y: 40 }, { x: 100, y: 100 }, "horizontal")).toEqual({ x: 170, y: 40 });
  });

  test("垂直轴：只翻 y", () => {
    expect(mirrorPointAcrossAxis({ x: 30, y: 40 }, { x: 100, y: 100 }, "vertical")).toEqual({ x: 30, y: 160 });
  });

  test("已在轴上的点不动", () => {
    expect(mirrorPointAcrossAxis({ x: 100, y: 40 }, { x: 100, y: 100 }, "horizontal")).toEqual({ x: 100, y: 40 });
  });

  test("亚像素坐标被取整", () => {
    expect(mirrorPointAcrossAxis({ x: 30.5, y: 40 }, { x: 100, y: 100 }, "horizontal")).toEqual({ x: 170, y: 40 });
  });

  test("以 center 两倍而非「对称点」计算：center 非整数也照算", () => {
    expect(mirrorPointAcrossAxis({ x: 10, y: 10 }, { x: 20.6, y: 20.6 }, "horizontal")).toEqual({ x: 31, y: 10 });
  });
});

describe("localScaleKindForScreenHandle：屏幕手柄反查本地轴", () => {
  test("scale-both 恒原样返回", () => {
    expect(localScaleKindForScreenHandle("scale-both", 37)).toBe("scale-both");
  });

  test("未旋转时本地轴与屏幕轴一致", () => {
    expect(localScaleKindForScreenHandle("scale-x", 0)).toBe("scale-x");
    expect(localScaleKindForScreenHandle("scale-y", 0)).toBe("scale-y");
  });

  test("★ 转 90° 后 x / y 手柄互换", () => {
    expect(localScaleKindForScreenHandle("scale-x", 90)).toBe("scale-y");
    expect(localScaleKindForScreenHandle("scale-y", 90)).toBe("scale-x");
  });

  test("180° / 360° 回到原轴", () => {
    expect(localScaleKindForScreenHandle("scale-x", 180)).toBe("scale-x");
    expect(localScaleKindForScreenHandle("scale-x", 360)).toBe("scale-x");
  });

  test("负角先被归一到 [0,360)：-90 与 270 同解", () => {
    expect(localScaleKindForScreenHandle("scale-x", -90)).toBe("scale-y");
    expect(localScaleKindForScreenHandle("scale-x", 270)).toBe("scale-y");
  });

  // 实现用 `Math.abs(x) >= Math.abs(y)` 判 x 优先，但斜向上两分量恒差 1 ulp
  // （cos 0.7071067811865476 vs |sin| 0.7071067811865475），不存在可复现的相等情形，
  // 所以这条只能锁「斜向按分量绝对值较大的一侧」这个实际行为，不试图覆盖 `>=` 本身。
  test("45° 斜向：仍判回原轴（两分量差 1 ulp，不构成相等）", () => {
    expect(localScaleKindForScreenHandle("scale-x", 45)).toBe("scale-x");
    expect(localScaleKindForScreenHandle("scale-y", 45)).toBe("scale-y");
  });
});

describe("groupTransformGeometry：手柄方向决定符号", () => {
  test("scale-x：右把手外拖放大 2 倍，纵轴不参与", () => {
    const geometry = groupTransformGeometry(
      drag({ startPoint: { x: 100, y: 0 }, handleXDirection: 1 }),
      { x: 150, y: 0 }
    );
    expect(geometry).toEqual({ kind: "scale", scaleX: 2, scaleY: 1 });
  });

  test("★ 左把手同位移也得放大（handleXDirection = -1 翻符号）", () => {
    const geometry = groupTransformGeometry(
      drag({ startPoint: { x: 0, y: 0 }, handleXDirection: -1 }),
      { x: -50, y: 0 }
    );
    expect(geometry).toEqual({ kind: "scale", scaleX: 2, scaleY: 1 });
  });

  test("未设手柄方向（0）→ 该轴恒 1", () => {
    const geometry = groupTransformGeometry(drag({ startPoint: { x: 100, y: 0 } }), { x: 150, y: 0 });
    expect(geometry).toEqual({ kind: "scale", scaleX: 1, scaleY: 1 });
  });

  test("scale-y 与 scale-x 同构", () => {
    const geometry = groupTransformGeometry(
      drag({ kind: "scale-y", startPoint: { x: 0, y: 100 }, handleYDirection: 1 }),
      { x: 0, y: 150 }
    );
    expect(geometry).toEqual({ kind: "scale", scaleX: 1, scaleY: 2 });
  });

  test("★ scale-both 隐式等比：两轴取**较大**的倍率（只拖宽不会把高缩小）", () => {
    const geometry = groupTransformGeometry(
      drag({ kind: "scale-both", startPoint: { x: 100, y: 100 }, handleXDirection: 1, handleYDirection: 1 }),
      { x: 200, y: 150 }
    );
    expect(geometry).toEqual({ kind: "scale", scaleX: 3, scaleY: 3 });
  });

  test("★ 单轴 kind + proportionalScale：另一轴跟随被拖的那一轴", () => {
    // rawX = 1 + 50/50 = 2，rawY = 1 + 25/50 = 1.5；scale-x 配等比时以 rawX 为准，
    // 拖 y 的位移（1.5）不得泄漏到结果里。
    const geometry = groupTransformGeometry(
      drag({ startPoint: { x: 100, y: 0 }, handleXDirection: 1, handleYDirection: 1, proportionalScale: true }),
      { x: 150, y: 25 }
    );
    expect(geometry).toEqual({ kind: "scale", scaleX: 2, scaleY: 2 });
  });

  test("★ 向内拖到负倍率被钳成 0（节点塌成一点，不再翻转）", () => {
    const geometry = groupTransformGeometry(
      drag({ startPoint: { x: 100, y: 0 }, handleXDirection: 1 }),
      { x: 0, y: 0 }
    );
    expect(geometry).toEqual({ kind: "scale", scaleX: 0, scaleY: 1 });
  });

  test("★ 零宽包围盒：半宽下限 1，避免除零放大倍率", () => {
    const geometry = groupTransformGeometry(
      drag({
        bounds: { left: 50, top: 0, right: 50, bottom: 100 },
        startPoint: { x: 50, y: 0 },
        handleXDirection: 1
      }),
      { x: 52, y: 0 }
    );
    expect(geometry).toEqual({ kind: "scale", scaleX: 3, scaleY: 1 });
  });

  test("★ 指针坐标非有限 → normalizeScaleValue 兜回 1（不产出 NaN 缩放）", () => {
    const geometry = groupTransformGeometry(
      drag({ startPoint: { x: 100, y: 0 }, handleXDirection: 1 }),
      { x: Number.NaN, y: 0 }
    );
    expect(geometry).toEqual({ kind: "scale", scaleX: 1, scaleY: 1 });
  });

  test("rotate 分支：只由 center / startPoint / 当前点决定，忽略 bounds 与手柄方向", () => {
    const geometry = groupTransformGeometry(
      drag({ kind: "rotate", startPoint: { x: 10, y: 0 }, handleXDirection: -1 }),
      { x: 0, y: 10 }
    );
    expect(geometry).toEqual({ kind: "rotate", degrees: 90 });
  });

  test("rotate + snapRotation：相对角 45° 吸到 90（吸附的是相对角，不是绝对角）", () => {
    const geometry = groupTransformGeometry(
      drag({ kind: "rotate", startPoint: { x: 10, y: 0 } }),
      { x: 10, y: 10 },
      { snapRotation: true }
    );
    expect(geometry).toEqual({ kind: "rotate", degrees: 90 });
  });
});

describe("transformGroupPoint：把节点坐标映射到变换后", () => {
  test("rotate：绕 center 旋转并取整", () => {
    expect(transformGroupPoint(drag({ kind: "rotate", center: { x: 100, y: 100 } }), { kind: "rotate", degrees: 90 }, { x: 110, y: 100 })).toEqual({ x: 100, y: 110 });
  });

  test("scale：两轴各自乘倍率", () => {
    expect(transformGroupPoint(drag(), { kind: "scale", scaleX: 2, scaleY: 3 }, { x: 5, y: 5 })).toEqual({ x: 10, y: 15 });
  });

  test("缩放结果取整到整数像素", () => {
    expect(transformGroupPoint(drag(), { kind: "scale", scaleX: 1.5, scaleY: 1.5 }, { x: 3, y: 3 })).toEqual({ x: 5, y: 5 });
  });
});

describe("groupTransformSvgTransform：预览用的 transform 属性", () => {
  test("无预览点 → 空串", () => {
    expect(groupTransformSvgTransform(drag({ kind: "rotate" }), undefined)).toBe("");
  });

  test("rotate：绕 center 的三段式 translate/rotate/translate", () => {
    expect(groupTransformSvgTransform(drag({ kind: "rotate", startPoint: { x: 10, y: 0 } }), { x: 0, y: 10 })).toBe(
      "translate(0 0) rotate(90) translate(0 0)"
    );
  });

  test("scale：三段式 translate/scale/translate，负中心不带负零", () => {
    expect(
      groupTransformSvgTransform(
        drag({ kind: "scale-both", center: { x: 50, y: 50 }, startPoint: { x: 100, y: 100 }, handleXDirection: 1, handleYDirection: 1 }),
        { x: 150, y: 150 }
      )
    ).toBe("translate(50 50) scale(2 2) translate(-50 -50)");
  });

  test("小数坐标按 5 位小数输出（不产生科学计数法）", () => {
    expect(
      groupTransformSvgTransform(
        drag({ kind: "scale-x", center: { x: 10.123456, y: 0 }, startPoint: { x: 10.123456, y: 0 }, handleXDirection: 1 }),
        { x: 10.123456, y: 0 }
      )
    ).toBe("translate(10.12346 0) scale(1 1) translate(-10.12346 0)");
  });

  test("rotate 走的是不吸附版本（snapRotation 只由 groupTransformGeometry 的 options 传入）", () => {
    expect(groupTransformSvgTransform(drag({ kind: "rotate", startPoint: { x: 10, y: 0 } }), { x: 10, y: 10 })).toBe(
      "translate(0 0) rotate(45) translate(0 0)"
    );
  });
});