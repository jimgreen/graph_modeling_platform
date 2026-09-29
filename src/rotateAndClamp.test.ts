// 几何与夹取四件套（此前均零直呼）：
//   rotatePointAround        11 处生产调用
//   snapRotationDeltaToRightAngle（同族）
//   clampCanvasDimension     11 处生产调用
//   clampPanelDimension      同族
//
// 核心发现：**两个 clamp 的取整/夹取顺序相反**，分数边界下结果不同 ——
// 这正是它们**不能**被合并成同一个函数的实证。
import { describe, expect, test } from "vitest";
import { rotatePointAround, snapRotationDeltaToRightAngle } from "./appExtracted/appCoreCanvasUtilities";
import { clampCanvasDimension, clampPanelDimension } from "./appExtracted/appPersistenceLibraryExport";
import {
  DEFAULT_CANVAS_HEIGHT,
  DEFAULT_CANVAS_WIDTH,
  MAX_CANVAS_HEIGHT,
  MAX_CANVAS_WIDTH,
  MIN_CANVAS_HEIGHT,
  MIN_CANVAS_WIDTH
} from "./appExtracted/appCoreCanvasUtilities";
import { clampNumber } from "./canvasViewport";

describe("rotatePointAround：输出恒为整数", () => {
  // 注意：直角角度下**会出现真负零**。表里用 `-0` 字面量写死，
  // 因为 `toEqual` 用 `Object.is` 区分 ±0，写 0 会被当场顶回来。
  const table: Array<[string, { x: number; y: number }, { x: number; y: number }, number, { x: number; y: number }]> = [
    ["0° 恒等", { x: 10, y: 0 }, { x: 0, y: 0 }, 0, { x: 10, y: 0 }],
    ["90° 精确", { x: 10, y: 0 }, { x: 0, y: 0 }, 90, { x: 0, y: 10 }],
    ["180°", { x: 10, y: 0 }, { x: 0, y: 0 }, 180, { x: -10, y: 0 }],
    ["★ 270°（x 是**真负零**）", { x: 10, y: 0 }, { x: 0, y: 0 }, 270, { x: -0, y: -10 }],
    ["-90° 等价 270°（x 是 +0）", { x: 10, y: 0 }, { x: 0, y: 0 }, -90, { x: 0, y: -10 }],
    ["★ -180°（y 是**真负零**）", { x: 10, y: 0 }, { x: 0, y: 0 }, -180, { x: -10, y: -0 }],
    ["★ 360°（y 是**真负零**）", { x: 10, y: 0 }, { x: 0, y: 0 }, 360, { x: 10, y: -0 }],
    ["45°（吸附后 7,7）", { x: 10, y: 0 }, { x: 0, y: 0 }, 45, { x: 7, y: 7 }],
    ["30°", { x: 10, y: 0 }, { x: 0, y: 0 }, 30, { x: 9, y: 5 }],
    ["15°", { x: 10, y: 0 }, { x: 0, y: 0 }, 15, { x: 10, y: 3 }],
    ["1°（噪声被 round 吃掉）", { x: 10, y: 0 }, { x: 0, y: 0 }, 1, { x: 10, y: 0 }],
    ["绕自身（dx=dy=0）", { x: 5, y: 5 }, { x: 5, y: 5 }, 37, { x: 5, y: 5 }]
  ];
  for (const [label, point, center, degrees, expected] of table) {
    test(label, () => {
      expect(rotatePointAround(point, center, degrees)).toEqual(expected);
    });
  }

  test("★ 90° 是**精确**的（`Math.cos(π/2)` 的 6.1e-17 被 round 吃掉）", () => {
    // 这是「为什么每个分量都套 Math.round」的直接证据：
    // 没有 round 的话 90° 会得到 (6.1e-17, 10) 这种带浮点噪声的点。
    expect(rotatePointAround({ x: 10, y: 0 }, { x: 0, y: 0 }, 90)).toEqual({ x: 0, y: 10 });
    expect(rotatePointAround({ x: 10, y: 0 }, { x: 0, y: 0 }, 180)).toEqual({ x: -10, y: 0 });
  });

  test("★ 整数倍 360° 在 `===` 意义下是恒等，但**可能产生负零**", () => {
    // 我第一版断言「整数倍 360° 恒等」被测试顶回：`{x:0,y:0}` 绕自身转 360°
    // 算术上等于原点，但 `Object.is` 判定为不同（有一轴是 -0）。
    // 对调用方（坐标比较、JSON 落盘）来说 -0 与 0 无法区分，
    // 但对 `Object.is` / `1/x` / 符号判定来说有区别 —— 故分开记录。
    for (const degrees of [0, 360, -360, 720]) {
      for (const point of [{ x: 7, y: 9 }, { x: -3, y: 4 }, { x: 0, y: 0 }]) {
        const out = rotatePointAround(point, { x: 1, y: 1 }, degrees);
        // 注意：不能直接用 toBe —— 它是 Object.is，会把 -0 与 0 判为不同。
        // 这里要断言的是「算术相等」，即 -0 也算数。
        expect(out.x === point.x, `${point.x} @ ${degrees}° 算术相等（实得 ${String(out.x)}）`).toBe(true);
        expect(out.y === point.y, `${point.y} @ ${degrees}° 算术相等（实得 ${String(out.y)}）`).toBe(true);
      }
    }
    // 原点这一组 `Object.is` 判定为不同
    const out = rotatePointAround({ x: 0, y: 0 }, { x: 1, y: 1 }, 360);
    expect(Object.is(out.x, { x: 0, y: 0 }.x) && Object.is(out.y, { x: 0, y: 0 }.y), "有一轴是负零").toBe(false);
  });

  test("★ 亚像素输入被 round 到整数（精度有意丢弃）", () => {
    for (const point of [{ x: 1, y: 1 }, { x: 0.5, y: 0.5 }, { x: 10.4, y: 0.4 }]) {
      const out = rotatePointAround(point, { x: 0, y: 0 }, 0.001);
      expect(Number.isInteger(out.x), `${point.x} → ${out.x}`).toBe(true);
      expect(Number.isInteger(out.y), `${point.y} → ${out.y}`).toBe(true);
    }
  });

  test("大角度（多圈）", () => {
    // 这里断言的是**算术相等**而不是 `toEqual`：多圈旋转的 y 分量在
    // ±0 之间摇摆（`sin(20π)` 的浮点残差被 round 成 -0 或 +0，
    // 取决于具体角度），两种都是正确结果。对调用方（坐标、落盘、渲染）而言
    // -0 与 0 无法区分。
    for (const degrees of [3600, -3600, 1e-9]) {
      const out = rotatePointAround({ x: 10, y: 0 }, { x: 0, y: 0 }, degrees);
      expect(out.x === 10, `${degrees}° x: 实得 ${out.x}`).toBe(true);
      expect(out.y === 0, `${degrees}° y: 实得 ${out.y}`).toBe(true);
    }
    // 1e6 度 ≈ 2777.78 圈，落点不要求可读，只需是整数
    const out = rotatePointAround({ x: 10, y: 0 }, { x: 0, y: 0 }, 1e6);
    expect(Number.isInteger(out.x) && Number.isInteger(out.y)).toBe(true);
  });

  test("★ degrees 非有限 → 整对 NaN（NaN 的三角函数值）", () => {
    for (const bad of [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
      const out = rotatePointAround({ x: 1, y: 2 }, { x: 0, y: 0 }, bad);
      expect(Number.isNaN(out.x), `degrees=${bad} x`).toBe(true);
      expect(Number.isNaN(out.y), `degrees=${bad} y`).toBe(true);
    }
  });

  test("★ point 的坐标非有限 → 沿两轴扩散（point 进入两个分量）", () => {
    // 探针实测：point.x=Infinity → (Infinity, Infinity)；
    // point.y=Infinity → (-Infinity, Infinity)。
    // 原因：`dx` / `dy` 都同时参与 cos 与 sin 两项。
    const cases: Array<[string, { x: number; y: number }, { x: number; y: number }]> = [
      ["point.x=Infinity", { x: Number.POSITIVE_INFINITY, y: 2 }, { x: Number.POSITIVE_INFINITY, y: Number.POSITIVE_INFINITY }],
      ["point.y=Infinity", { x: 1, y: Number.POSITIVE_INFINITY }, { x: Number.NEGATIVE_INFINITY, y: Number.POSITIVE_INFINITY }],
      ["point.x=NaN", { x: Number.NaN, y: 2 }, { x: Number.NaN, y: Number.NaN }],
      ["point.y=NaN", { x: 1, y: Number.NaN }, { x: Number.NaN, y: Number.NaN }]
    ];
    for (const [label, point, expected] of cases) {
      const out = rotatePointAround(point, { x: 0, y: 0 }, 45);
      expect(Object.is(out.x, expected.x), `${label} x: 实得 ${out.x} 期望 ${expected.x}`).toBe(true);
      expect(Object.is(out.y, expected.y), `${label} y: 实得 ${out.y} 期望 ${expected.y}`).toBe(true);
    }
  });

  test("★ center 的坐标非有限 → **只污染一轴**（我第一版误以为两轴都 NaN）", () => {
    // 探针实测的真实形态（center 只加进自己那一轴，所以另一轴仍走 point 的正常旋转）：
    //   center.x=Infinity → (NaN, -Infinity)
    //   center.y=Infinity → (Infinity, NaN)
    //   center.x=NaN      → (NaN, NaN)     ← NaN 会经 dx 扩散到 y
    //   center.y=NaN      → (NaN, NaN)
    const cases: Array<[string, { x: number; y: number }, { x: number; y: number }]> = [
      ["center.x=Infinity", { x: Number.POSITIVE_INFINITY, y: 0 }, { x: Number.NaN, y: Number.NEGATIVE_INFINITY }],
      ["center.x=-Infinity", { x: Number.NEGATIVE_INFINITY, y: 0 }, { x: Number.NaN, y: Number.POSITIVE_INFINITY }],
      ["center.y=Infinity", { x: 0, y: Number.POSITIVE_INFINITY }, { x: Number.POSITIVE_INFINITY, y: Number.NaN }],
      ["center.y=-Infinity", { x: 0, y: Number.NEGATIVE_INFINITY }, { x: Number.NEGATIVE_INFINITY, y: Number.NaN }],
      ["center.x=NaN", { x: Number.NaN, y: 0 }, { x: Number.NaN, y: Number.NaN }],
      ["center.y=NaN", { x: 0, y: Number.NaN }, { x: Number.NaN, y: Number.NaN }]
    ];
    for (const [label, center, expected] of cases) {
      const out = rotatePointAround({ x: 1, y: 2 }, center, 45);
      expect(Object.is(out.x, expected.x), `${label} x: 实得 ${out.x} 期望 ${expected.x}`).toBe(true);
      expect(Object.is(out.y, expected.y), `${label} y: 实得 ${out.y} 期望 ${expected.y}`).toBe(true);
    }
  });

  test("绕自身旋转任意角度都返回原点", () => {
    for (const degrees of [0, 1, 45, 90, 137.5, 360, -720]) {
      expect(rotatePointAround({ x: 5, y: 5 }, { x: 5, y: 5 }, degrees), `${degrees}°`)
        .toEqual({ x: 5, y: 5 });
    }
  });
});

describe("snapRotationDeltaToRightAngle：吸附到 90° 再夹到 [-180,180]", () => {
  const table: Array<[number, number]> = [
    [0, 0], [44, 0], [45, 90], [90, 90], [135, 180], [179, 180], [180, 180],
    [181, 180], [270, 180], [360, 180],
    [-90, -90], [-135, -90], [-180, -180], [-181, -180]
  ];
  for (const [input, expected] of table) {
    test(`${input} → ${expected}`, () => {
      expect(snapRotationDeltaToRightAngle(input)).toBe(expected);
    });
  }

  test("★ `clamp(round(...))` 顺序：270 被夹成 180（先吸附再夹）", () => {
    // 若顺序反过来（round(clamp)），270 会先夹到 180 再吸附 180 —— 结果巧合相同，
    // 但 -270 会露馅：clamp(-270) = -180 → round 仍是 -180；而现在 -270 → -180 也是。
    // 真正的差别在分数上，见 clampPanelDimension 那组对比。
    expect(snapRotationDeltaToRightAngle(270)).toBe(180);
    expect(snapRotationDeltaToRightAngle(359)).toBe(180);
  });

  test("★ 平局向 +∞（与 rotatePointAround / roundStaticDrawingCoordinate 同源）", () => {
    expect(snapRotationDeltaToRightAngle(45)).toBe(90);
    expect(snapRotationDeltaToRightAngle(135)).toBe(180);
    expect(snapRotationDeltaToRightAngle(-135)).toBe(-90);
    // -45 吸附到 -0（`Math.round(-0.5)` 是 -0），不是 +0
    expect(Object.is(snapRotationDeltaToRightAngle(-45), -0), "-45 → 真负零").toBe(true);
  });

  test("NaN → NaN（不抛错）", () => {
    expect(snapRotationDeltaToRightAngle(Number.NaN)).toBeNaN();
  });

  test("★ 等价变异记录：把 `clamp(round(…))` 改成 `round(clamp(…))`，59 条**全绿**（正确的）", () => {
    // 变异验证时我把
    //   clampNumber(Math.round(delta / 90) * 90, -180, 180)
    // 改成
    //   Math.round(clampNumber(delta, -180, 180) / 90) * 90
    // 测试**全绿**。查证后确认是**等价改写**，理由可证明：
    //
    // ① 原版里 `Math.round(delta / 90) * 90` 的取值**恒落在 [-180, 180]** ——
    //    round 把任意实数映到最近的 90 的整数倍，|结果| ≤ |delta| 且是 90 的倍数，
    //    而 delta 被 round 后的倍数最多到 ±180（再往外的 270 / 360 在 round 前
    //    就被 2.99 → 3 这类系数拉回 ≤ 2 那一档…… 实测 270 → 180、360 → 180），
    //    所以那层 clamp 恒为恒等变换。
    // ② 改版把 delta 先夹进 [-180,180]，再 round 到 90 的倍数 ——
    //    夹完的值本身就是 90 的倍数或夹到 ±180，round 后仍落在同一集合内。
    //
    // 两条路径的输出集合与每个输入的取值都相同，所以全绿是**正确**的。
    // 记下来是为了让后人看到这次全绿不必重新怀疑。
    //
    // **什么改动会让它开始有事**：若把吸附基数从 90 改成 45，
    // ① 的「恒落在 [-180,180]」不再成立（45 的倍数可到 ±180，仍成立）；
    // 但若改成 60 就会越界（60 的倍数可到 ±240），此时原版的 clamp 开始起作用、
    // 改版不会，两者就分道扬镳了。
    const clampThenRound = (delta: number) => Math.round(clampNumber(delta, -180, 180) / 90) * 90;
    for (let delta = -1000; delta <= 1000; delta += 7) {
      expect(clampThenRound(delta), `delta=${delta}`).toBe(snapRotationDeltaToRightAngle(delta));
    }
  });
});

describe("★ clampCanvasDimension 与 clampPanelDimension：取整/夹取顺序**相反**", () => {
  // canvas: Math.round(clampNumber(isFinite(v) ? v : fallback, min, max))   ← 先夹后取整
  // panel : clampNumber(Math.round(v), min, max)                            ← 先取整后夹
  //
  // 这不是笔误，是两条不同的语义。分数边界下它们给出**不同**结果 ——
  // 探针实测：
  //   v=4.6  [0,4.4]   canvas=4    panel=4.4
  //   v=4.5  [0,4.4]   canvas=4    panel=4.4
  //   v=100  [0,10.6]  canvas=11   panel=10.6   ★canvas 反而**超出**了 max
  //   v=-5   [-2.4,100] canvas=-2  panel=-2.4
  //
  // **所以这两个函数不能合并。** 见下面「生产实测」一节：画布那 10 个调用点
  // 传的 min/max 全是整数常量，分数边界在生产里不可达。

  const table: Array<[string, number, number, number, number, number]> = [
    // 探针实测的六个「结果不同」样本（我第一版把 min/max 的顺序写反了一处，被顶回）
    ["分数上界：canvas 4 / panel 4.4", 4.6, 0, 4.4, 4, 4.4],
    ["恰好平局：canvas 4 / panel 4.4", 4.5, 0, 4.4, 4, 4.4],
    ["★ 超分数上界：canvas **超出** max", 100, 0, 10.6, 11, 10.6],
    ["★ 分数下界：canvas -2 / panel -2.4", -5, -2.4, 100, -2, -2.4],
    // 「结果相同」的对照
    ["整数边界：两者相同", 4.4, 0, 4.4, 4, 4],
    ["整数上界：两者相同", 100, 0, 10, 10, 10],
    ["平局 2.5 落在区间内：两者相同", 2.5, 0, 100, 3, 3],
    ["负数落 0：两者相同（0 是整数边界）", -0.4, 0, 100, 0, 0]
  ];
  for (const [label, value, min, max, canvasExpected, panelExpected] of table) {
    test(label, () => {
      expect(clampCanvasDimension(value, min, max, 1)).toBe(canvasExpected);
      expect(clampPanelDimension(value, min, max)).toBe(panelExpected);
    });
  }

  test("★ 生产实测：画布那 10 个调用点的 min/max 全是整数 → 两者恒等", () => {
    // 这是「分数边界不可达」的机器证明。真实常量已核对：
    //   MIN_CANVAS_WIDTH=640  MIN_CANVAS_HEIGHT=360
    //   MAX_CANVAS_WIDTH=50000  MAX_CANVAS_HEIGHT=50000
    const bounds: Array<[number, number]> = [
      [MIN_CANVAS_WIDTH, MAX_CANVAS_WIDTH],
      [MIN_CANVAS_HEIGHT, MAX_CANVAS_HEIGHT]
    ];
    for (const [min, max] of bounds) {
      expect(Number.isInteger(min), `min=${min} 应是整数`).toBe(true);
      expect(Number.isInteger(max), `max=${max} 应是整数`).toBe(true);
    }
    // 整数边界下两者在 2000 个样本上逐一相同
    for (let v = 0; v <= 2000; v += 1) {
      expect(clampCanvasDimension(v, MIN_CANVAS_WIDTH, MAX_CANVAS_WIDTH, DEFAULT_CANVAS_WIDTH), `v=${v}`)
        .toBe(clampPanelDimension(v, MIN_CANVAS_WIDTH, MAX_CANVAS_WIDTH));
    }
  });

  test("★ clampCanvasDimension 的返回值**永不**超过整数 max", () => {
    for (const max of [MAX_CANVAS_WIDTH, MAX_CANVAS_HEIGHT]) {
      for (const v of [0, 1, 49999, 50000, 50001, 1e9, Number.POSITIVE_INFINITY]) {
        const out = clampCanvasDimension(v, 0, max, 1);
        expect(out, `v=${v} max=${max} -> ${out}`).toBeLessThanOrEqual(max);
        expect(out, `v=${v} max=${max} -> ${out}`).toBeGreaterThanOrEqual(0);
      }
    }
  });
});

describe("clampCanvasDimension：fallback 分支", () => {
  test("非有限值 → 落 fallback（NaN / ±Infinity）", () => {
    for (const v of [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
      expect(clampCanvasDimension(v, 0, 100, 7), String(v)).toBe(7);
    }
  });

  test("★ fallback 自身也被夹取（fallback=1000, max=100 → 100）", () => {
    expect(clampCanvasDimension(Number.NaN, 0, 100, 1000)).toBe(100);
    expect(clampCanvasDimension(Number.NaN, 10, 100, 5)).toBe(10);
  });

  test("★ fallback 自身是 NaN 时 → NaN 穿过 clampNumber（不回落）", () => {
    // 探针实测。`Number.isFinite(fallback)` 没做，所以 NaN fallback 会直接穿过去。
    // 判定不修：10 个调用点的 fallback 全是 `DEFAULT_CANVAS_WIDTH` / `canvasWidth` /
    // `requestedWidth` 这些实打实的数字，不会是 NaN —— 除非画布本身已是 NaN，
    // 那时透传 NaN 反而比悄悄换成 1920 更诚实。
    expect(clampCanvasDimension(Number.NaN, 0, 100, Number.NaN)).toBeNaN();
  });

  test("fallback 省略无默认值（形参必填）", () => {
    expect(clampCanvasDimension(5, 0, 100, 7)).toBe(5);
  });
});

describe("★ clampPanelDimension 没有 isFinite 守卫（不修，如实记录）", () => {
  // 与 clampCanvasDimension 相反：NaN 会**穿过**它。
  // `Math.round(NaN)` = NaN → `clampNumber(NaN, 0, 100)` = `Math.max(0, Math.min(100, NaN))` = NaN
  // （`Math.min(100, NaN)` = NaN，`Math.max(0, NaN)` = NaN）
  test("NaN → NaN（不落任何默认值）", () => {
    expect(clampPanelDimension(Number.NaN, 0, 100)).toBeNaN();
  });

  test("±Infinity 被夹到边界（Infinity 是有限区间外的值）", () => {
    expect(clampPanelDimension(Number.POSITIVE_INFINITY, 0, 100)).toBe(100);
    expect(clampPanelDimension(Number.NEGATIVE_INFINITY, 0, 100)).toBe(0);
  });

  test("对照：clampCanvasDimension 对同样的输入有守卫", () => {
    expect(clampCanvasDimension(Number.NaN, 0, 100, 7)).toBe(7);
    expect(clampCanvasDimension(Number.POSITIVE_INFINITY, 0, 100, 7)).toBe(7);
    expect(clampCanvasDimension(Number.NEGATIVE_INFINITY, 0, 100, 7)).toBe(7);
  });
});

describe("clampNumber：min / max 的边界语义", () => {
  test("区间内原样返回", () => {
    expect(clampNumber(5, 0, 10)).toBe(5);
    expect(clampNumber(0, 0, 10)).toBe(0);
    expect(clampNumber(10, 0, 10)).toBe(10);
  });

  test("区间外夹到边界", () => {
    expect(clampNumber(-1, 0, 10)).toBe(0);
    expect(clampNumber(11, 0, 10)).toBe(10);
  });

  test("★ min > max 时**恒得 min**（反向区间不报错）", () => {
    // `Math.max(min, Math.min(max, value))`：min > max 时内层永远 ≤ max < min，
    // 于是外层永远返回 min。探针实测 clampNumber(5, 10, 0) === 10。
    for (const value of [-100, 0, 5, 100]) {
      expect(clampNumber(value, 10, 0), `value=${value}`).toBe(10);
    }
    expect(clampNumber(5, 10, 10)).toBe(10);
  });

  test("min === max 时恒得该值", () => {
    for (const value of [-1, 0, 7, 1e9]) {
      expect(clampNumber(value, 3, 3), `value=${value}`).toBe(3);
    }
  });

  test("NaN 穿过（两个比较都为 false）", () => {
    expect(clampNumber(Number.NaN, 0, 100)).toBeNaN();
    expect(clampNumber(Number.NaN, 10, 0)).toBeNaN();
  });
});
