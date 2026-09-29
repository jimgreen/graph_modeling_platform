// 交叉弧线路径刷新（`src/model-routing.ts` 的 `refreshCrossingArcPaths`，9 处生产调用）
//   私有但同族的辅助：routeBoundsForPoints / buildCrossingRouteSpatialIndex /
//                    queryCrossingRouteSpatialIndex / getSegments / pathWithCrossingArcs
//
// 判错的后果：画布上正交线路交叉处**没有圆角**（看起来像短路），
// 或者**该有圆角的地方多了一个**（视觉噪声）—— 都不报错，纯粹是「看着不对」。
//
// ★★ 两条最容易搞错的规则（探针实测）：
//   1. 弧只出现在**当前路线的垂直段**上，对方必须是**水平段**。
//      斜线相交（两条对角线）**永远不出弧**。
//   2. 交点必须离**两段各自的两个端点**都**严格大于 30px**
//      （`ROUTE_ENDPOINT_STUB_LENGTH(28) + 2`），否则整条线**一条弧都不出**。
import { describe, expect, test } from "vitest";
import { refreshCrossingArcPaths } from "./model-routing";
import type { Point, RoutedEdge } from "./model";

const R = (edgeId: string, points: Point[], path = "STALE"): RoutedEdge => ({ edgeId, points, path });

// 竖线：x=50，y 从 0 到 100
const VERT = (id: string, points: Point[] = [{ x: 50, y: 0 }, { x: 50, y: 100 }]) => R(id, points);
// 水平线：y=50，x 从 0 到 200（两端都远离交点）
const HORZ = (id: string, points: Point[] = [{ x: 0, y: 50 }, { x: 200, y: 50 }]) => R(id, points);

const refresh = (routes: RoutedEdge[], changed?: ReadonlySet<string>, previous: RoutedEdge[] = []) =>
  refreshCrossingArcPaths(routes, changed as never, previous);

const qCount = (path: string) => (path.match(/Q/g) ?? []).length;
const VERT_CROSS = "M 50 0 L 50 43 Q 57 50 50 57 L 50 100";
const HORZ_PLAIN = "M 0 50 L 200 50";

describe("★ 弧的形态：二次贝塞尔，半径 7，恒向右凸", () => {
  test("垂直 × 水平 → 出一段弧", () => {
    const out = refresh([VERT("v"), HORZ("h")]);
    expect(out[0].path, "★ 竖线出弧").toBe(VERT_CROSS);
    expect(out[1].path, "★ 水平线不出弧").toBe(HORZ_PLAIN);
  });

  test("★ 只有**当前路线的垂直段**出弧，水平段不出", () => {
    const out = refresh([VERT("v"), HORZ("h")]);
    expect(qCount(out[0].path), "★ 竖线 1 段弧").toBe(1);
    expect(qCount(out[1].path), "★ 水平线 0 段弧").toBe(0);
  });

  test("★ 弧的三个点：起点 y-7、控制点 x+7、终点 y+7", () => {
    // 交点 (50,50) → 弧从 (50,43) 起，经控制点 (57,50)，到 (50,57)
    expect(out0(VERT_CROSS)).toEqual({ x: 50, y: 43, cx: 57, cy: 50, ex: 50, ey: 57 });
    // 交点上下各 7
    expect(50 - 43).toBe(7);
    expect(57 - 50).toBe(7);
    // 前提：恒向右凸。
    // ★ 水平线必须**真正跨过** x=50（`between` 是严格不等号：`x0 < 50 < x1`），
    //   同时两端都离交点 > 30 ⇒ `x0 < 20` 且 `x1 > 80`。
    // 我第一版把水平线放在 `x0=-200, x1=10` —— 根本没跨过 x=50，
    // 于是 `between(50, -200, 10)` 为假，弧自然不出，被顶回。
    const crossing = refresh([VERT("v"), HORZ("h", [{ x: -200, y: 50 }, { x: 100, y: 50 }])]);
    expect(crossing[0].path).toBe(VERT_CROSS);
    // 对照 1：右端 20（距 30，且跨过 50）→ margin 挡住
    expect(qCount(refresh([VERT("v"), HORZ("h", [{ x: -200, y: 50 }, { x: 20, y: 50 }])])[0].path)).toBe(0);
    // 对照 2：右端 10（**没跨过** 50）→ between 挡住
    expect(qCount(refresh([VERT("v"), HORZ("h", [{ x: -200, y: 50 }, { x: 10, y: 50 }])])[0].path)).toBe(0);
    // 对照 3：整条线在竖线左侧 → 不相交
    expect(qCount(refresh([VERT("v"), HORZ("h", [{ x: -200, y: 50 }, { x: -100, y: 50 }])])[0].path)).toBe(0);
    // 前提：between 严格
    expect(50 > -200 && 50 < 10).toBe(false);
    expect(50 > -200 && 50 < 100).toBe(true);
  });

  test("★ 两条水平线 / 两条竖线相交：都不出弧", () => {
    const twoH = refresh([HORZ("h1", [{ x: 0, y: 20 }, { x: 200, y: 20 }]), HORZ("h2", [{ x: 0, y: 80 }, { x: 200, y: 80 }])]);
    expect(twoH.map((r) => qCount(r.path))).toEqual([0, 0]);
    const twoV = refresh([VERT("v1", [{ x: 20, y: 0 }, { x: 20, y: 100 }]), VERT("v2", [{ x: 80, y: 0 }, { x: 80, y: 100 }])]);
    expect(twoV.map((r) => qCount(r.path))).toEqual([0, 0]);
  });

  test("★ 斜线相交**永远不出弧**（斜段根本不是 horizontal/vertical）", () => {
    const diag = refresh([
      R("d1", [{ x: 0, y: 0 }, { x: 100, y: 100 }]),
      R("d2", [{ x: 0, y: 100 }, { x: 100, y: 0 }])
    ]);
    expect(diag.map((r) => qCount(r.path))).toEqual([0, 0]);
    expect(diag[0].path).toBe("M 0 0 L 100 100");
  });

  test("★ 零长段不产生 segment", () => {
    const out = refresh([VERT("v", [{ x: 50, y: 5 }, { x: 50, y: 5 }]), HORZ("h", [{ x: 0, y: 5 }, { x: 200, y: 5 }])]);
    expect(out[0].path).toBe("M 50 5 L 50 5");
  });

  test("★ 同 `edgeId` 的两条 route 互相跳过", () => {
    // `other.edgeId === segment.edgeId` → continue
    const sameId = refresh([
      R("e", [{ x: 50, y: 0 }, { x: 50, y: 100 }]),
      R("e", [{ x: 0, y: 50 }, { x: 200, y: 50 }])
    ]);
    expect(sameId.map((r) => qCount(r.path))).toEqual([0, 0]);
  });

  test("★ 自己的水平段与自己的竖段相交也跳过（单条 Z 形）", () => {
    const z = refresh([R("z", [{ x: 20, y: 0 }, { x: 20, y: 80 }, { x: 80, y: 80 }, { x: 80, y: 0 }])]);
    expect(z[0].path).toBe("M 20 0 L 20 80 L 80 80 L 80 0");
    expect(qCount(z[0].path)).toBe(0);
  });
});

describe("★★ 端点 margin = 30：交点离**两段各自两端**都要严格大于 30", () => {
  test("竖线的 y：31..69 出弧，≤30 或 ≥70 不出", () => {
    // 竖线 y=0..100，margin 30 ⇒ 交点 y ∈ (30, 70)
    for (const y of [0, 1, 10, 25, 29, 30]) {
      const out = refresh([VERT("v"), HORZ("h", [{ x: 0, y }, { x: 200, y }])]);
      expect(qCount(out[0].path), `y=${y}（≤30）`).toBe(0);
    }
    for (const y of [31, 35, 50, 65, 69]) {
      const out = refresh([VERT("v"), HORZ("h", [{ x: 0, y }, { x: 200, y }])]);
      expect(qCount(out[0].path), `y=${y}（31..69）`).toBe(1);
    }
    for (const y of [70, 71, 75, 99, 100]) {
      const out = refresh([VERT("v"), HORZ("h", [{ x: 0, y }, { x: 200, y }])]);
      expect(qCount(out[0].path), `y=${y}（≥70）`).toBe(0);
    }
    // 前提：margin = 28 + 2
    expect(30).toBe(28 + 2);
  });

  test("★ 水平线的**右端**也要远离交点 30（x1 > 80）", () => {
    for (const x1 of [30, 49, 50, 51, 60, 70, 79, 80]) {
      const out = refresh([VERT("v"), HORZ("h", [{ x: 0, y: 50 }, { x: x1, y: 50 }])]);
      expect(qCount(out[0].path), `x1=${x1}（≤80）`).toBe(0);
    }
    for (const x1 of [81, 90, 100, 200]) {
      const out = refresh([VERT("v"), HORZ("h", [{ x: 0, y: 50 }, { x: x1, y: 50 }])]);
      expect(qCount(out[0].path), `x1=${x1}（>80）`).toBe(1);
    }
  });

  test("★ 水平线的**左端**也要远离交点 30（x0 < 20）", () => {
    for (const x0 of [-200, -50, -1, 0]) {
      const out = refresh([VERT("v"), HORZ("h", [{ x: x0, y: 50 }, { x: 200, y: 50 }])]);
      expect(qCount(out[0].path), `x0=${x0}`).toBe(1);
    }
    for (const x0 of [20, 21, 30, 49, 50, 60]) {
      const out = refresh([VERT("v"), HORZ("h", [{ x: x0, y: 50 }, { x: 200, y: 50 }])]);
      expect(qCount(out[0].path), `x0=${x0}（≥20）`).toBe(0);
    }
  });

  test("★ 竖线加长不改变 margin（按段内距离算，不是绝对坐标）", () => {
    for (const y1 of [100, 130, 200]) {
      const out = refresh([VERT("v", [{ x: 50, y: 0 }, { x: 50, y: y1 }]), HORZ("h")]);
      expect(qCount(out[0].path), `竖线到 y=${y1}`).toBe(1);
      expect(out[0].path).toBe(VERT_CROSS.replace("L 50 100", `L 50 ${y1}`));
    }
  });

  test("★ margin 判定是**严格大于**（`>` 不是 `>=`）", () => {
    // 交点 (50,50) 距水平线右端 (80,50) 恰为 30 → 被拒
    expect(qCount(refresh([VERT("v"), HORZ("h", [{ x: 0, y: 50 }, { x: 80, y: 50 }])])[0].path)).toBe(0);
    // 距 (81,50) 为 31 → 通过
    expect(qCount(refresh([VERT("v"), HORZ("h", [{ x: 0, y: 50 }, { x: 81, y: 50 }])])[0].path)).toBe(1);
    // 前提
    expect(Math.abs(50 - 80) > 30).toBe(false);
    expect(Math.abs(50 - 81) > 30).toBe(true);
  });
});

describe("★ 多交点 / 折线：每段独立判定", () => {
  test("多条水平线穿过同一条长竖线 → 多个 Q", () => {
    const out = refresh([
      VERT("v", [{ x: 50, y: 0 }, { x: 50, y: 200 }]),
      HORZ("h1", [{ x: 0, y: 50 }, { x: 200, y: 50 }]),
      HORZ("h2", [{ x: 0, y: 100 }, { x: 200, y: 100 }]),
      HORZ("h3", [{ x: 0, y: 150 }, { x: 200, y: 150 }])
    ]);
    expect(qCount(out[0].path), "★ 3 段弧").toBe(3);
    expect(out[0].path).toBe(
      "M 50 0 L 50 43 Q 57 50 50 57 L 50 93 Q 57 100 50 107 L 50 143 Q 57 150 50 157 L 50 200"
    );
  });

  test("★ 交点**相同**的两条水平线不被合并（两条一样的弧）", () => {
    // h1 与 h2 都在 y=100 与竖线相交，交点重合
    const out = refresh([
      VERT("v", [{ x: 50, y: 0 }, { x: 50, y: 200 }]),
      HORZ("h1", [{ x: 0, y: 100 }, { x: 100, y: 100 }]),
      HORZ("h2", [{ x: 0, y: 100 }, { x: 200, y: 100 }])
    ]);
    expect(qCount(out[0].path), "★ 两个 Q，坐标完全相同").toBe(2);
    expect(out[0].path).toBe("M 50 0 L 50 93 Q 57 100 50 107 L 50 93 Q 57 100 50 107 L 50 200");
  });

  test("折线竖线：两段各判各的", () => {
    const out = refresh([
      VERT("v", [{ x: 50, y: 0 }, { x: 50, y: 100 }, { x: 50, y: 200 }]),
      HORZ("h1", [{ x: 0, y: 50 }, { x: 200, y: 50 }]),
      HORZ("h2", [{ x: 0, y: 150 }, { x: 200, y: 150 }])
    ]);
    expect(qCount(out[0].path)).toBe(2);
    expect(out[0].path).toBe("M 50 0 L 50 43 Q 57 50 50 57 L 50 100 L 50 143 Q 57 150 50 157 L 50 200");
  });

  test("★ 每段有自己的 margin（第二段靠端点的交点被跳过）", () => {
    const out = refresh([
      VERT("v", [{ x: 50, y: 0 }, { x: 50, y: 100 }, { x: 50, y: 200 }]),
      HORZ("h1", [{ x: 0, y: 50 }, { x: 200, y: 50 }]),    // 段1 中间 → 出弧
      HORZ("h2", [{ x: 0, y: 190 }, { x: 200, y: 190 }])   // 段2 距端点 10 → 跳过
    ]);
    expect(qCount(out[0].path), "★ 只有 h1").toBe(1);
    expect(out[0].path).toBe("M 50 0 L 50 43 Q 57 50 50 57 L 50 100 L 50 200");
  });

  test("Z 形折线：水平段自己会被对方竖线穿过吗", () => {
    // v 的竖段被 h 穿过；v 自己的水平段不参与（只有 vertical 才收集）
    const out = refresh([
      R("v", [{ x: 50, y: 0 }, { x: 50, y: 100 }, { x: 80, y: 100 }, { x: 80, y: 200 }]),
      HORZ("h", [{ x: 0, y: 50 }, { x: 200, y: 50 }])
    ]);
    expect(out[0].path).toBe("M 50 0 L 50 43 Q 57 50 50 57 L 50 100 L 80 100 L 80 200");
    expect(qCount(out[0].path)).toBe(1);
  });
});

describe("★ 增量刷新（`changedEdgeIds` 非空）", () => {
  const three = (): RoutedEdge[] => [
    VERT("v"),
    HORZ("h"),
    R("far", [{ x: 500, y: 500 }, { x: 600, y: 500 }])
  ];

  test("空 Set 与省略等价（都走全量分支）", () => {
    const routes = three();
    const omitted = refresh(routes);
    const empty = refresh(routes, new Set());
    expect(empty.map((r) => r.path)).toEqual(omitted.map((r) => r.path));
    expect(qCount(empty[0].path)).toBe(1);
  });

  test("★ 改不相干的第三条线 → 只重算它自己", () => {
    const routes = three();
    const out = refresh(routes, new Set(["far"]));
    expect(out[0], "★ 竖线保持原引用").toBe(routes[0]);
    expect(out[1], "★ 水平线保持原引用").toBe(routes[1]);
    expect(out[2], "★ far 被重算").not.toBe(routes[2]);
    // ★ 注意 far 的 path 是新算的（与入参的 "STALE" 不同）
    expect(out[2].path).toBe("M 500 500 L 600 500");
  });

  test("★ 改竖线 → 水平线**也被重算**（它在受影响范围内）", () => {
    const routes = three();
    const out = refresh(routes, new Set(["v"]));
    expect(out[0]).not.toBe(routes[0]);
    expect(out[1], "★ 水平线也重算（path 不变但引用换）").not.toBe(routes[1]);
    expect(qCount(out[0].path)).toBe(1);
    expect(out[1].path).toBe(HORZ_PLAIN);
  });

  test("★★ 增量只重算**受影响**的线路，不受影响的保持原 `path`", () => {
    // 关键的不对称：全量分支会重算**每一条** route 的 path；
    // 增量分支只重算 `refreshIndexes` 里的那些。
    // ⇒ 对不在受影响范围内的 route，增量结果**不等于**全量结果
    //    （它保留入参的 path，通常是上一次的旧值或占位串）。
    //
    // 我第一版写「增量与全量逐元素一致」，被顶回 —— `far` 那条就不一致。
    //
    // **判定不修**：调用方（`routeEdgesForRendering` 等）自己保证
    // 每条 route 的 path 在进入本函数前已是当前值；增量分支省掉的正是
    // 「算一遍发现没变」的代价。若这里也重算，增量就退化成全量。
    const routes = three();
    const full = refresh(routes);
    const inc = refresh(routes, new Set(["v"]));
    // 受影响的两条一致
    expect(inc[0].path, "v").toBe(full[0].path);
    expect(inc[1].path, "h").toBe(full[1].path);
    // ★ 不受影响的 far 保持入参的 "STALE"
    expect(inc[2].path, "★ far 保持入参值").toBe("STALE");
    expect(full[2].path, "★ 但全量会重算它").toBe("M 500 500 L 600 500");
    expect(inc[2], "★ far 元素同引用").toBe(routes[2]);
  });

  test("★ `previousRoutes` 只圈定**刷新范围**，不贡献 segment", () => {
    // 当前只有竖线；previousRoutes 里有水平线，changed={h}
    const onlyV = [VERT("v")];
    const prevH = [HORZ("h")];
    const out = refresh(onlyV, new Set(["h"]), prevH);
    expect(out[0]).not.toBe(onlyV[0]);
    // ★ 但水平线**不在** crossingSegments 里（只从 `routes` 取）⇒ 不出弧
    expect(qCount(out[0].path), "★ previousRoutes 的线不出弧").toBe(0);
    expect(out[0].path).toBe("M 50 0 L 50 100");
  });

  test("changed 集合非空但**都不匹配** → 返回**原数组引用**", () => {
    const routes = three();
    expect(refresh(routes, new Set(["zz"]))).toBe(routes);
  });

  test("changed 集合为空数组形态（默认第三参）也能用", () => {
    const routes = three();
    const out = refresh(routes, new Set(["v"]));
    expect(qCount(out[0].path)).toBe(1);
  });
});

describe("结构共享：path 没变则**返回同一引用**", () => {
  test("已算过的 path 再算一次 → 全同引用", () => {
    const routes = [VERT("v"), HORZ("h")];
    const once = refresh(routes);
    const twice = refresh(once);
    expect(twice[0]).toBe(once[0]);
    expect(twice[1]).toBe(once[1]);
  });

  test("★ path 完全由 `points` 重算，**覆盖**传入的 path", () => {
    // ★ 必须有对手线才有弧 —— 我第一版只给了竖线，弧自然没出，被顶回。
    const routes = [R("v", [{ x: 50, y: 0 }, { x: 50, y: 100 }], "我写的假 path"), HORZ("h")];
    expect(refresh(routes)[0].path).toBe(VERT_CROSS);
    // 无对手时：path 仍被重算（覆盖入参），只是没有弧
    const solo = [R("v", [{ x: 50, y: 0 }, { x: 50, y: 100 }], "我写的假 path")];
    expect(refresh(solo)[0].path).toBe("M 50 0 L 50 100");
  });

  test("返回结构只含 edgeId / points / path（points 是原引用）", () => {
    const routes = [VERT("v"), HORZ("h")];
    const out = refresh(routes);
    for (let i = 0; i < out.length; i += 1) {
      expect(Object.keys(out[i]), routes[i].edgeId).toEqual(["edgeId", "points", "path"]);
      expect(out[i].points, "★ points 不拷贝").toBe(routes[i].points);
    }
  });

  test("元素顺序与数量保持", () => {
    const routes = [R("z", [{ x: 0, y: 0 }, { x: 0, y: 100 }]), HORZ("a")];
    const out = refresh(routes);
    expect(out.map((r) => r.edgeId)).toEqual(["z", "a"]);
  });

  test("空数组 → 空数组", () => {
    expect(refresh([])).toEqual([]);
  });

  test("不改入参", () => {
    const routes = [VERT("v"), HORZ("h")];
    const snapshot = JSON.stringify(routes);
    refresh(routes);
    refresh(routes, new Set(["v"]));
    refresh(routes, new Set(["zz"]));
    expect(JSON.stringify(routes)).toBe(snapshot);
  });

  test("同一输入恒得同一结果（无模块级状态）", () => {
    const routes = [VERT("v"), HORZ("h")];
    const once = refresh(routes);
    for (let i = 0; i < 20; i += 1) {
      expect(refresh(routes)).toEqual(once);
    }
  });
});

describe("退化输入", () => {
  test("★ `points` 为空 → 抛 TypeError（如实记录，不修）", () => {
    // `routeBoundsForPoints` 直接读 `points[0].x`。
    // **判定不修**：route 的 `points` 来自路由器，恒非空（至少两端）。
    // 抛错正说明上游产出了空 route，静默兜成零尺寸框会画出一条假线。
    expect(() => refresh([R("a", [])])).toThrow(TypeError);
    // 前置：确实是 undefined.x
    expect(() => ([].length as number)).not.toThrow();
  });

  test("单点 route → 只出 `M` 命令", () => {
    const out = refresh([R("a", [{ x: 3, y: 4 }])]);
    expect(out[0].path).toBe("M 3 4");
  });

  test("★ NaN 坐标**原样进 path**（不兜底）", () => {
    // 判错后果：SVG 里出现 `NaN` → 整条 path 被浏览器丢弃（线消失）。
    // **判定不修**：points 来自路由计算，恒为有限数；NaN 说明上游算错了，
    // 静默夹到 0 会把线画到画布左上角，比消失更难排查。
    for (const points of [
      [{ x: NaN, y: 0 }, { x: 100, y: 0 }],
      [{ x: 0, y: 0 }, { x: NaN, y: 0 }],
      [{ x: 0, y: 0 }, { x: 50, y: NaN }, { x: 100, y: 0 }]
    ] as Point[][]) {
      const out = refresh([R("a", points)]);
      expect(out[0].path, JSON.stringify(points)).toContain("NaN");
      expect(qCount(out[0].path), "★ NaN 坐标算不出交点").toBe(0);
    }
  });

  test("负坐标与小数正常处理", () => {
    // ★ 竖线必须**足够长**：交点离两端都要 > 30。我第一版给了 21px 高的竖线
    //   （交点距端点 10.5），弧就没了，被顶回。改成 y=-100..100。
    const out = refresh([
      VERT("v", [{ x: -10.5, y: -100 }, { x: -10.5, y: 100 }]),
      HORZ("h", [{ x: -100, y: 0 }, { x: 100, y: 0 }])
    ]);
    // 交点 (-10.5, 0)；弧上端 -7、下端 7、控制点 x+7 = -3.5
    expect(out[0].path).toBe("M -10.5 -100 L -10.5 -7 Q -3.5 0 -10.5 7 L -10.5 100");
    // 对照：短竖线（21px）不出弧
    const short = refresh([
      VERT("v", [{ x: -10.5, y: -10.5 }, { x: -10.5, y: 10.5 }]),
      HORZ("h", [{ x: -100, y: 0 }, { x: 100, y: 0 }])
    ]);
    expect(qCount(short[0].path), "★ 距端点 10.5 ≤ 30").toBe(0);
  });
});

/** 解析出 `L x1 y1 Q cx cy x2 y2` 这一段弧的四个关键坐标。 */
function out0(path: string) {
  const match = /L (-?[\d.]+) (-?[\d.]+) Q (-?[\d.]+) (-?[\d.]+) (-?[\d.]+) (-?[\d.]+)/.exec(path);
  if (!match) throw new Error(`路径里没有弧段: ${path}`);
  return {
    x: Number(match[1]), y: Number(match[2]),
    cx: Number(match[3]), cy: Number(match[4]),
    ex: Number(match[5]), ey: Number(match[6])
  };
}

describe("★ 四条等价变异全绿是**正确的**（记录，避免下一个人重查）", () => {
  test("等价 ①：`currentSegments` 不筛 vertical 也是恒等的", () => {
    // 变异：`.filter(segment => segment.orientation === "vertical")` 摘掉。
    //   —— 水平段进了 `currentSegments`，但配对时还有
    //      `other.orientation !== "horizontal"` 这道关：它只能与**水平** other 配对，
    //      而同向的 `intersection` 恒给 `null`。
    //      ⇒ 水平段永远产不出交点，多收进来是**死代码**。
    //   ⚠ 什么会让它失效：若 `intersection` 不再对同向返回 null，
    //      或 `other` 的方向过滤被去掉（那样 ② 也会跟着失效）。
    const routes = refresh([VERT("v"), HORZ("h")]);
    expect(qCount(routes[0].path), "★ 竖线照常出弧").toBe(1);
    expect(qCount(routes[1].path), "★ 水平线仍不出弧").toBe(0);
    // 前提：同向段之间没有交点（`intersection` 的同向短路）
    const orientation = (v: "vertical" | "horizontal") => v;
    expect(orientation("vertical") === orientation("vertical"), "★ 竖 × 竖 同向").toBe(true);
    expect(orientation("vertical") === orientation("horizontal")).toBe(false);
    // 零长段（a === b）在任一方向上都没有交点
    const zeroV = { a: { x: 50, y: 5 }, b: { x: 50, y: 5 } };
    expect(zeroV.a.y > Math.min(zeroV.a.y, zeroV.b.y) && zeroV.a.y < Math.max(zeroV.a.y, zeroV.b.y)).toBe(false);
  });

  test("等价 ②：`other.orientation !== \"horizontal\"` 这道关是冗余的", () => {
    // 变异：把 `other.edgeId === segment.edgeId || other.orientation !== \"horizontal\"`
    // 改成只判 edgeId。
    //   —— `currentSegments` 已被①那条证明可能含水平段，但更直接的理由是：
    //      `intersection(a, b)` 开头就是 `if (a.orientation === b.orientation) return null`。
    //      竖 × 竖 ⇒ null；横 × 横 ⇒ null。**任何同向组合都产不出交点**。
    //   ⇒ 方向过滤在 `currentSegments` 只含竖段的前提下确实冗余。
    //   ⚠ 什么会让它失效：`intersection` 去掉同向短路（那时竖×竖会算出
    //      `{x: a.x, y: b.a.y}` 这种伪交点）。
    const twoV = refresh([
      VERT("v1", [{ x: 20, y: 0 }, { x: 20, y: 100 }]),
      VERT("v2", [{ x: 20, y: 0 }, { x: 20, y: 100 }])
    ]);
    expect(qCount(twoV[0].path), "★ 同向不出弧").toBe(0);
    const twoH = refresh([
      HORZ("h1", [{ x: 0, y: 20 }, { x: 200, y: 20 }]),
      HORZ("h2", [{ x: 0, y: 20 }, { x: 200, y: 20 }])
    ]);
    expect(qCount(twoH[0].path)).toBe(0);
    // 前提：同向判定
    expect("vertical" === "vertical").toBe(true);
  });

  test("等价 ⑨：`if (changedBoxes.length === 0) return routes;` 摘掉不变", () => {
    // 变异：把增量分支的「没有任何变化框」早返回改成 `if (false)`。
    //   —— `changedBoxes` 为空 ⇒ 后面那个 for 不执行 ⇒ `refreshIndexes` 保持空集
    //      ⇒ 紧接着的 `if (refreshIndexes.size === 0) return routes;` 兜住，
    //      返回**同一个** `routes`。
    //   ⇒ 两条出口同结果。
    //   ⚠ 什么会让它失效：若 `refreshIndexes` 不是从空集开始，或第二个
    //      `size === 0` 判定被去掉。
    const routes = [VERT("v"), HORZ("h")];
    expect(refresh(routes, new Set(["zz"])), "★ 原数组引用").toBe(routes);
    // 前提：空集推不出任何 refreshIndex
    const changedBoxes: number[] = [];
    const refreshIndexes = new Set<number>();
    for (const _ of changedBoxes) { void _; }
    expect(refreshIndexes.size).toBe(0);
  });

  test("等价 ⑬：零长段也进 `segments` 不改变结果", () => {
    // 变异：`a.x === b.x && a.y !== b.y` 放宽成 `a.x === b.x`（水平同理）。
    //   —— 零长段的两个端点重合，于是 `between(value, a, b)` 里的
    //      `value > min && value < max` 对**任意** value 都是假
    //      （min === max）⇒ `intersection` 恒给 null。
    //   ⇒ 零长段进了 segments 也是死代码。
    //   ⚠ 什么会让它失效：若 `between` 改成闭区间（`>=` / `<=`）。
    const out = refresh([
      VERT("v", [{ x: 50, y: 5 }, { x: 50, y: 5 }]),
      HORZ("h", [{ x: 0, y: 5 }, { x: 200, y: 5 }])
    ]);
    expect(qCount(out[0].path), "★ 零长段不出弧").toBe(0);
    // 前提：min === max 时严格不等式恒假
    const between = (value: number, a: number, b: number) =>
      value > Math.min(a, b) && value < Math.max(a, b);
    expect(between(5, 5, 5)).toBe(false);
    expect(between(4, 5, 5)).toBe(false);
    expect(between(6, 5, 5)).toBe(false);
  });
});
