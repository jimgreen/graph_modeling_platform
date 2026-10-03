import { describe, expect, test } from "vitest";

import { isInteractiveStaticDrawingKind, type DeviceKind, type Point } from "./model";
import {
  staticConnectorDrawingNeedsExplicitFinish,
  staticConnectorDrawingPath
} from "./staticConnectorCurves";

const CURVE_KINDS = [
  "static-bezier-connector",
  "static-smoothstep-connector",
  "static-self-loop"
] as const satisfies readonly DeviceKind[];

describe("interactive static connector curves", () => {
  test("treats all three curve tools as interactive drawings that require an explicit finish", () => {
    for (const kind of CURVE_KINDS) {
      expect(isInteractiveStaticDrawingKind(kind)).toBe(true);
      expect(staticConnectorDrawingNeedsExplicitFinish(kind)).toBe(true);
    }
    expect(staticConnectorDrawingNeedsExplicitFinish("static-line")).toBe(false);
  });

  test("uses every confirmed point in each curve path", () => {
    const points: Point[] = [
      { x: 0, y: 0 },
      { x: 60, y: 80 },
      { x: 120, y: 20 },
      { x: 180, y: 100 }
    ];

    for (const kind of CURVE_KINDS) {
      const path = staticConnectorDrawingPath(kind, points);
      expect(path).toMatch(/^M 0 0 C /);
      expect(path.match(/ C /g)).toHaveLength(points.length - 1);
      expect(path).toContain(" 60 80");
      expect(path).toContain(" 120 20");
      expect(path).toMatch(/ 180 100$/);
    }
  });

  test("extends the active curve to the moving preview point", () => {
    const confirmed: Point[] = [
      { x: 20, y: 30 },
      { x: 80, y: 110 },
      { x: 160, y: 50 }
    ];
    const previewPoint = { x: 240, y: 140 };

    for (const kind of CURVE_KINDS) {
      const confirmedPath = staticConnectorDrawingPath(kind, confirmed);
      const previewPath = staticConnectorDrawingPath(kind, [...confirmed, previewPoint]);
      expect(previewPath).not.toBe(confirmedPath);
      expect(previewPath).toMatch(/ 240 140$/);
    }
  });
});

// ── 控制点逐字断言 ──────────────────────────────────────
//
// 上面三条测的是「点有没有被用上」（结构）。这里测的是**坐标算得对不对** ——
// 控制点算错不会抛错，只会画出一条不对的连线，而结构断言照样全绿。
// 输出就是 SVG path 的 `d` 属性，坐标是全部信息，故直接钉整串；
// 取值一律整数或 1/1000 精度，便于手算核对。
// 覆盖动机：该文件此前 50/108 行未覆盖，polylinePath / twoPointBezierPath /
// twoPointSelfLoopPath 三个生成器 0 调用。

const pt = (x: number, y: number): Point => ({ x, y });

describe("staticConnectorDrawingPath —— 通用守卫", () => {
  test("点数不足 2 一律空串（连不上就没有 path）", () => {
    expect(staticConnectorDrawingPath("static-polyline", [])).toBe("");
    expect(staticConnectorDrawingPath("static-polyline", [pt(1, 2)])).toBe("");
    expect(staticConnectorDrawingPath("static-bezier-connector", [])).toBe("");
    expect(staticConnectorDrawingPath("static-self-loop", [pt(1, 2)])).toBe("");
  });
});

describe("折线（static-polyline / static-elbow-connector）", () => {
  test("首点 M、其余 L，坐标原样", () => {
    expect(staticConnectorDrawingPath("static-polyline", [pt(0, 0), pt(10, 20), pt(30, 40)])).toBe(
      "M 0 0 L 10 20 L 30 40"
    );
  });

  test("两点也是 M + L", () => {
    expect(staticConnectorDrawingPath("static-polyline", [pt(5, -5), pt(7, 9)])).toBe("M 5 -5 L 7 9");
  });

  test("★ 数值规整：小于 1e-6 归零，最多保留三位小数", () => {
    // |v| < CURVE_EPSILON(1e-6) → 0；否则 Math.round(v * 1000) / 1000
    expect(
      staticConnectorDrawingPath("static-polyline", [pt(0.0000001, 1.23456), pt(2, 0.0005)])
    ).toBe("M 0 1.235 L 2 0.001");
  });

  test("elbow 连接器走同一条折线路径（kind 只影响是否显式收尾）", () => {
    const points = [pt(0, 0), pt(3, 4)];
    expect(staticConnectorDrawingPath("static-elbow-connector", points)).toBe(
      staticConnectorDrawingPath("static-polyline", points)
    );
  });
});

describe("两点贝塞尔（static-bezier-connector / static-smoothstep-connector 传 2 点时）", () => {
  test("控制点取水平方向 ±max(24, |dx|/2)", () => {
    // dx=100 → controlDx = max(24, 50) = 50；direction = +1（end.x >= start.x）
    expect(staticConnectorDrawingPath("static-bezier-connector", [pt(0, 0), pt(100, 0)])).toBe(
      "M 0 0 C 50 0 50 0 100 0"
    );
  });

  test("★ 间距小时下限 24 生效（不是按比例缩到很小）", () => {
    // dx=10 → |dx|*0.5 = 5 < 24 ⇒ controlDx = 24，第二个控制点因此越过终点（-14）
    expect(staticConnectorDrawingPath("static-bezier-connector", [pt(0, 0), pt(10, 0)])).toBe(
      "M 0 0 C 24 0 -14 0 10 0"
    );
  });

  test("反向连线（end.x < start.x）控制点方向翻转", () => {
    expect(staticConnectorDrawingPath("static-bezier-connector", [pt(100, 0), pt(0, 0)])).toBe(
      "M 100 0 C 50 0 50 0 0 0"
    );
  });

  test("垂直连线（dx=0）方向取 +1，控制点水平外扩", () => {
    expect(staticConnectorDrawingPath("static-bezier-connector", [pt(0, 0), pt(0, 50)])).toBe(
      "M 0 0 C 24 0 -24 50 0 50"
    );
  });
});

describe("多点贝塞尔（static-bezier-connector / static-smoothstep-connector）", () => {
  test("三点用切线控制：前驱缺省回落首点自身，但后继仍参与第二控制点", () => {
    // tangentScale = 1/6。index=0 时 previous = points[0]（fallback `?? points[index]`），
    // next = points[2] 照常参与 —— 所以首段是 10 0 / 50 -10，不是 10 0 / 50 0。
    expect(
      staticConnectorDrawingPath("static-bezier-connector", [pt(0, 0), pt(60, 0), pt(60, 60)])
    ).toBe("M 0 0 C 10 0 50 -10 60 0 C 70 10 60 50 60 60");
  });

  test("★ smoothstep 用更大的切线比例 0.1（同一组点、不同曲线）", () => {
    expect(
      staticConnectorDrawingPath("static-smoothstep-connector", [pt(0, 0), pt(60, 0), pt(60, 60)])
    ).toBe("M 0 0 C 6 0 54 -6 60 0 C 66 6 60 54 60 60");
  });

  test("smoothstep 传 2 点时与普通贝塞尔完全一致（切线比例不影响两点情形）", () => {
    const points = [pt(0, 0), pt(100, 0)];
    expect(staticConnectorDrawingPath("static-smoothstep-connector", points)).toBe(
      staticConnectorDrawingPath("static-bezier-connector", points)
    );
  });

  test("末段无后继时 next 回落终点自身（切线不为零，但不为 0）", () => {
    // index=1：next = points[3] ?? end = end，所以 (next - start) = (60,0)，
    // 第二控制点是 end - (60,0)/6 = (50,60) —— 回落不等于「切线消失」。
    expect(
      staticConnectorDrawingPath("static-bezier-connector", [pt(0, 0), pt(0, 60), pt(60, 60)])
    ).toBe("M 0 0 C 0 10 -10 50 0 60 C 10 70 50 60 60 60");
  });
});

describe("自环（static-self-loop）", () => {
  test("两点走自环路径：控制点沿法线偏移 max(24, 距离*0.7)", () => {
    // dx=100, dy=0 → normal = (0, 1)；loopDepth = max(24, 70) = 70
    expect(staticConnectorDrawingPath("static-self-loop", [pt(0, 0), pt(100, 0)])).toBe(
      "M 0 0 C 25 70 75 70 100 0"
    );
  });

  test("短距离时下限 24 生效", () => {
    // dx=10 → 距离 10，loopDepth = max(24, 7) = 24
    expect(staticConnectorDrawingPath("static-self-loop", [pt(0, 0), pt(10, 0)])).toBe(
      "M 0 0 C 2.5 24 7.5 24 10 0"
    );
  });

  test("斜向连线：法线取 (-dy, dx) 归一", () => {
    // dx=0, dy=100 → normal = (-1, 0)；loopDepth = 70
    expect(staticConnectorDrawingPath("static-self-loop", [pt(0, 0), pt(0, 100)])).toBe(
      "M 0 0 C -70 25 -70 75 0 100"
    );
  });

  test("★ 起终点重合：距离 0 时按 1 计算，不产生 NaN", () => {
    // distance = Math.hypot(0,0) || 1 ⇒ 1；normal = (0,0)；loopDepth = 24
    expect(staticConnectorDrawingPath("static-self-loop", [pt(0, 0), pt(0, 0)])).toBe(
      "M 0 0 C 0 0 0 0 0 0"
    );
  });

  test("三点以上回落普通插值贝塞尔（自环只对两点成立）", () => {
    const points = [pt(0, 0), pt(50, 50), pt(100, 0)];
    expect(staticConnectorDrawingPath("static-self-loop", points)).toBe(
      staticConnectorDrawingPath("static-bezier-connector", points)
    );
  });
});
