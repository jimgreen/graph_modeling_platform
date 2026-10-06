import { describe, expect, test } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join, relative } from "node:path";
import {
  DEVICE_LIBRARY,
  createDefaultNode,
  createRoutableLineDeviceFromEndpoints,
  enforceRoutableLineEndpointApproach,
  getRouteEndpointNormal,
  getTerminalPoint,
  isBusNode,
  projectPointToBusCenterline,
  routableLineDeviceCanvasPoints,
  routableLineDeviceEndpointRefForNode,
  routableLineDeviceEndpointRefs,
  segmentIntersectsNodeBody,
  serializeRoutableLineDevicePoints,
  ROUTABLE_LINE_POINTS_PARAM,
  type ModelNode,
  type Point,
  type RoutableLineEndpointApproachContext
} from "./model";

/*
 * 线路端点走向强制（enforceRoutableLineEndpointApproach）
 *
 * 契约：连接「设备端子」的线路段，只允许「从设备外侧指向锚点」——
 * 相邻首/末段必须与该端子的外法线共线且同向。违规时自动纠正走向，而不是拒绝操作。
 *
 * 变异验证记录（injector: tmp/mut-endpoint-approach.mjs，表: tmp/mut-endpoint-approach.json）
 * 见文件末尾 MUTATION LOG。
 */

const TEMPLATE = DEVICE_LIBRARY.find((item) => item.kind === "dc-routable-line")!;

// dc-source 单端子在右侧 → t1 = (x+79, y)，外法线 (+1, 0)
const LEFT = { ...createDefaultNode("dc-source", { x: 120, y: 200 }), id: "approach-left" };
// 端子锚点正好压在画布右边界（960）的 dc-source：escape 点会被 clamp 回锚点本身，
// 于是「往外让」无解 —— 纠正必然是 no-op（见测试 13）。
const EDGE = { ...createDefaultNode("dc-source", { x: 881, y: 200 }), id: "approach-edge" };
// dc-load 单端子在顶部 → t1 = (x, y-55)，外法线 (0, -1)
const LOAD = { ...createDefaultNode("dc-load", { x: 560, y: 200 }), id: "approach-load" };
// 第二个 dc-source：法线同样是 (+1, 0)，用于构造「只有一端违规」的两点退化直线
const RIGHT = { ...createDefaultNode("dc-source", { x: 620, y: 200 }), id: "approach-right" };
const BUS = { ...createDefaultNode("ac-bus", { x: 760, y: 120 }), id: "approach-bus" };
const BUS_TWO = { ...createDefaultNode("ac-bus", { x: 760, y: 460 }), id: "approach-bus-two" };

const BOUNDS = { width: 960, height: 640 };
const LEFT_TERMINAL = getTerminalPoint(LEFT, "t1"); // (199, 200)
const EDGE_TERMINAL = getTerminalPoint(EDGE, "t1"); // (960, 200) = BOUNDS.width
const LOAD_TERMINAL = getTerminalPoint(LOAD, "t1"); // (560, 145)
const RIGHT_TERMINAL = getTerminalPoint(RIGHT, "t1"); // (699, 200)

const DEVICE_ENDPOINTS = {
  source: routableLineDeviceEndpointRefForNode(LEFT, "t1"),
  target: routableLineDeviceEndpointRefForNode(LOAD, "t1")
};

function contextFor(...nodes: ModelNode[]): RoutableLineEndpointApproachContext {
  return {
    nodeById: new Map(nodes.map((node) => [node.id, node])),
    bounds: BOUNDS
  };
}

/** 直接改写存储点位（模拟「存了一条走向违规的线路」），不动端子锚点。 */
function lineWithStoredCanvasPoints(
  canvasPoints: Point[],
  start: Point = LEFT_TERMINAL,
  end: Point = LOAD_TERMINAL,
  endpoints: Partial<typeof DEVICE_ENDPOINTS> = DEVICE_ENDPOINTS
): ModelNode {
  const base = createRoutableLineDeviceFromEndpoints(TEMPLATE, start, end, "layer-a", endpoints);
  return {
    ...base,
    params: {
      ...base.params,
      [ROUTABLE_LINE_POINTS_PARAM]: JSON.stringify(
        canvasPoints.map((point) => ({
          x: Math.round((point.x - base.position.x) * 10) / 10,
          y: Math.round((point.y - base.position.y) * 10) / 10
        }))
      )
    }
  };
}

/**
 * 独立于生产代码重述「共线且同向」契约：
 * normal.x 非 0 → 必须 dy===0 且 dx 与 normal.x 同号；normal.y 非 0 → 必须 dx===0 且 dy 与 normal.y 同号。
 */
function segmentPointsAlongNormal(endpoint: Point, adjacent: Point, normal: Point): boolean {
  const dx = Math.round(adjacent.x - endpoint.x);
  const dy = Math.round(adjacent.y - endpoint.y);
  if (normal.x !== 0) {
    return dy === 0 && dx * Math.sign(normal.x) > 0;
  }
  if (normal.y !== 0) {
    return dx === 0 && dy * Math.sign(normal.y) > 0;
  }
  return false;
}

const LEFT_NORMAL = getRouteEndpointNormal(LEFT, LEFT_TERMINAL, LOAD_TERMINAL, "t1");
const LOAD_NORMAL = getRouteEndpointNormal(LOAD, LOAD_TERMINAL, LEFT_TERMINAL, "t1");
const RIGHT_NORMAL = getRouteEndpointNormal(RIGHT, RIGHT_TERMINAL, LEFT_TERMINAL, "t1");
const EDGE_NORMAL = getRouteEndpointNormal(EDGE, EDGE_TERMINAL, LEFT_TERMINAL, "t1");

/** source 端（LEFT，+x）与 target 端（LOAD，-y）都合规的折线。 */
const COMPLIANT_POINTS: Point[] = [
  { x: 199, y: 200 },
  { x: 227, y: 200 },
  { x: 227, y: 90 },
  { x: 560, y: 90 },
  { x: 560, y: 145 }
];

function expectBothEndsApproach(points: Point[]) {
  expect(segmentPointsAlongNormal(points[0], points[1], LEFT_NORMAL)).toBe(true);
  expect(segmentPointsAlongNormal(points[points.length - 1], points[points.length - 2], LOAD_NORMAL)).toBe(true);
}

describe("线路端点走向强制", () => {
  test("1 合规线路走快路径：返回同一引用", () => {
    const line = lineWithStoredCanvasPoints(COMPLIANT_POINTS);

    expect(enforceRoutableLineEndpointApproach(line, contextFor(LEFT, LOAD, line))).toBe(line);
  });

  test("1b 合规但含冗余共线点的线路仍走快路径：simplify 会重塑它，快路径必须拦住", () => {
    // 三点共线冗余（227 处连着 3 个点）：慢路径的 simplify 会把它压成 2 个点。
    // 若快路径失效，enforce 会「修」出一条与存量等价的点列并返回新对象 —— 引用不稳定。
    const redundant = lineWithStoredCanvasPoints([
      { x: 199, y: 200 },
      { x: 227, y: 200 },
      { x: 227, y: 196 },
      { x: 227, y: 90 },
      { x: 560, y: 90 },
      { x: 560, y: 145 }
    ]);
    expectBothEndsApproach(routableLineDeviceCanvasPoints(redundant));

    expect(enforceRoutableLineEndpointApproach(redundant, contextFor(LEFT, LOAD, redundant))).toBe(redundant);
  });

  test("1c 首段长度四舍五入为 0（相邻点相距 0.1）时必须被纠正", () => {
    // routeSegmentMatchesNormal 先 Math.round 再判方向：相距 0.1 的相邻点 dx 被抹成 0。
    //   `> 0`  → 判违规 → sourceNeedsFix 成立 → 补 stub，首段变成 +28
    //   `>= 0` → 误判合规 → 不补 stub，首段仍是 0.1（下面两条断言都会红）
    //
    // 为什么 target 端必须保持合规：慢路径一旦被 target 端抢先触发，sourceNeedsFix
    // 就退化成「全量重布线」的结果，那时首段会被拉正、断言反而看不出 `>= 0` 的差别。
    // 所以这里只让 source 端退化。
    const tiny = lineWithStoredCanvasPoints([
      { x: 199, y: 200 },
      { x: 199.1, y: 200 },
      { x: 227, y: 200 },
      { x: 227, y: 90 },
      { x: 560, y: 90 },
      { x: 560, y: 115 },
      { x: 560, y: 145 }
    ]);
    const before = routableLineDeviceCanvasPoints(tiny);
    // 前置：target 端合规（末段自上而下指向端子，法线 (0,-1)），source 端 dx 四舍五入后为 0
    expect(segmentPointsAlongNormal(before[before.length - 1], before[before.length - 2], LOAD_NORMAL)).toBe(true);
    expect(segmentPointsAlongNormal(before[0], before[1], LEFT_NORMAL)).toBe(false);

    const enforced = enforceRoutableLineEndpointApproach(tiny, contextFor(LEFT, LOAD, tiny));
    const points = routableLineDeviceCanvasPoints(enforced);

    expect(enforced).not.toBe(tiny);
    expect(segmentPointsAlongNormal(points[0], points[1], LEFT_NORMAL)).toBe(true);
    // 首段必须真的「让开」了端子，而不是仅仅方向为 0 被判成合规
    expect(points[1].x - points[0].x).toBeGreaterThan(1);
    expectBothEndsApproach(points);
  });

  test("1d 线路自身带缩放、相邻点在画布上塌成同一点时也必须纠正", () => {
    // 局部坐标只差 0.1，经 scale=0.15 缩放后画布上不足 0.1 → 四舍五入后首三点重合。
    // 本条守的是「塌陷点列不会被整条当成合规而原样留下」。
    //
    // ⚠ 这条**不是** mutation ①（`> 0` → `>= 0`）的区分力来源：本夹具的 target 端
    // 末段 dy 同样被抹成 0，无论 ① 注不注入，慢路径都会被 target 端触发，
    // 首段随后被全量重布线拉正、断言照样绿。① 的区分力由测试 1c 承担。
    const base = createRoutableLineDeviceFromEndpoints(TEMPLATE, LEFT_TERMINAL, LOAD_TERMINAL, "layer-a", DEVICE_ENDPOINTS);
    const collapsed = {
      ...base,
      scale: 0.15,
      scaleX: 0.15,
      scaleY: 0.15,
      params: {
        ...base.params,
        [ROUTABLE_LINE_POINTS_PARAM]: serializeRoutableLineDevicePoints([
          { x: -0.1, y: 0 },
          { x: 0, y: 0 },
          { x: 0.1, y: 0 },
          { x: 0.1, y: -0.5 }
        ])
      }
    };
    const canvas = routableLineDeviceCanvasPoints(collapsed);
    expect(canvas[0]).toEqual(canvas[1]);

    const enforced = enforceRoutableLineEndpointApproach(collapsed, contextFor(LEFT, LOAD, collapsed));
    const points = routableLineDeviceCanvasPoints(enforced);

    expect(enforced).not.toBe(collapsed);
    expect(segmentPointsAlongNormal(points[0], points[1], LEFT_NORMAL)).toBe(true);
    expect(segmentPointsAlongNormal(points[points.length - 1], points[points.length - 2], LOAD_NORMAL)).toBe(true);
  });

  test("2 source 端反向首段被纠正，且两端锚点位置不变", () => {
    const violating = lineWithStoredCanvasPoints([
      { x: 199, y: 200 },
      { x: 150, y: 200 },
      { x: 150, y: 90 },
      { x: 560, y: 90 },
      { x: 560, y: 145 }
    ]);
    // 前置确认：确实违规
    expect(
      segmentPointsAlongNormal(
        routableLineDeviceCanvasPoints(violating)[0],
        routableLineDeviceCanvasPoints(violating)[1],
        LEFT_NORMAL
      )
    ).toBe(false);

    const enforced = enforceRoutableLineEndpointApproach(violating, contextFor(LEFT, LOAD, violating));
    const points = routableLineDeviceCanvasPoints(enforced);

    expect(enforced).not.toBe(violating);
    expectBothEndsApproach(points);
    expect(points[0]).toEqual({ x: 199, y: 200 });
    expect(points[points.length - 1]).toEqual({ x: 560, y: 145 });
  });

  test("3 source 端斜向（非正交）首段被纠正", () => {
    const violating = lineWithStoredCanvasPoints([
      { x: 199, y: 200 },
      { x: 227, y: 230 },
      { x: 227, y: 90 },
      { x: 560, y: 90 },
      { x: 560, y: 145 }
    ]);
    expect(
      segmentPointsAlongNormal(
        routableLineDeviceCanvasPoints(violating)[0],
        routableLineDeviceCanvasPoints(violating)[1],
        LEFT_NORMAL
      )
    ).toBe(false);

    const points = routableLineDeviceCanvasPoints(
      enforceRoutableLineEndpointApproach(violating, contextFor(LEFT, LOAD, violating))
    );

    expectBothEndsApproach(points);
    expect(points[0]).toEqual({ x: 199, y: 200 });
    expect(points[points.length - 1]).toEqual({ x: 560, y: 145 });
  });

  test("4 target 端反向末段被纠正，且两端锚点位置不变", () => {
    const violating = lineWithStoredCanvasPoints([
      { x: 199, y: 200 },
      { x: 227, y: 200 },
      { x: 227, y: 260 },
      { x: 560, y: 260 },
      { x: 560, y: 200 },
      { x: 560, y: 145 }
    ]);
    const before = routableLineDeviceCanvasPoints(violating);
    expect(segmentPointsAlongNormal(before[before.length - 1], before[before.length - 2], LOAD_NORMAL)).toBe(false);

    const points = routableLineDeviceCanvasPoints(
      enforceRoutableLineEndpointApproach(violating, contextFor(LEFT, LOAD, violating))
    );

    expectBothEndsApproach(points);
    expect(points[0]).toEqual({ x: 199, y: 200 });
    expect(points[points.length - 1]).toEqual({ x: 560, y: 145 });
  });

  test("5 两端同时违规：两端都被纠正", () => {
    const violating = lineWithStoredCanvasPoints([
      { x: 199, y: 200 },
      { x: 150, y: 200 },
      { x: 150, y: 260 },
      { x: 560, y: 260 },
      { x: 560, y: 200 },
      { x: 560, y: 145 }
    ]);

    const points = routableLineDeviceCanvasPoints(
      enforceRoutableLineEndpointApproach(violating, contextFor(LEFT, LOAD, violating))
    );

    expectBothEndsApproach(points);
    expect(points[0]).toEqual({ x: 199, y: 200 });
    expect(points[points.length - 1]).toEqual({ x: 560, y: 145 });
  });

  test("6 两端都连到母线：原样返回同一引用", () => {
    expect(isBusNode(BUS)).toBe(true);
    const busPointA = projectPointToBusCenterline(BUS, { x: 700, y: 120 });
    const busPointB = projectPointToBusCenterline(BUS_TWO, { x: 700, y: 460 });
    const busLine = lineWithStoredCanvasPoints(
      [
        { x: busPointA.x, y: busPointA.y },
        { x: busPointA.x, y: busPointA.y - 40 },
        { x: busPointB.x, y: busPointB.y - 40 },
        { x: busPointB.x, y: busPointB.y }
      ],
      busPointA,
      busPointB,
      {
        source: routableLineDeviceEndpointRefForNode(BUS, "t1", busPointA),
        target: routableLineDeviceEndpointRefForNode(BUS_TWO, "t1", busPointB)
      }
    );

    expect(enforceRoutableLineEndpointApproach(busLine, contextFor(BUS, BUS_TWO, busLine))).toBe(busLine);
  });

  test("7 只有一端是母线：设备端被纠正，母线端锚点未动", () => {
    const busPoint = projectPointToBusCenterline(BUS, { x: 700, y: 120 });
    const mixedLine = lineWithStoredCanvasPoints(
      [
        { x: 199, y: 200 },
        { x: 150, y: 200 },
        { x: 150, y: 120 },
        busPoint
      ],
      LEFT_TERMINAL,
      busPoint,
      {
        source: routableLineDeviceEndpointRefForNode(LEFT, "t1"),
        target: routableLineDeviceEndpointRefForNode(BUS, "t1", busPoint)
      }
    );

    const enforced = enforceRoutableLineEndpointApproach(mixedLine, contextFor(LEFT, BUS, mixedLine));
    const points = routableLineDeviceCanvasPoints(enforced);

    expect(enforced).not.toBe(mixedLine);
    // 设备端（source，LEFT）被纠正
    expect(segmentPointsAlongNormal(points[0], points[1], LEFT_NORMAL)).toBe(true);
    // 母线端锚点原样保留
    expect(points[0]).toEqual({ x: 199, y: 200 });
    expect(points[points.length - 1]).toEqual(busPoint);
  });

  test("8 缺 endpoint refs：原样返回同一引用", () => {
    const orphan = lineWithStoredCanvasPoints(
      [{ x: 199, y: 200 }, { x: 150, y: 200 }, { x: 150, y: 90 }],
      LEFT_TERMINAL,
      LOAD_TERMINAL,
      {}
    );
    expect(routableLineDeviceEndpointRefs(orphan)).toEqual({});

    expect(enforceRoutableLineEndpointApproach(orphan, contextFor(LEFT, LOAD, orphan))).toBe(orphan);
  });

  test("9 幂等：纠正一次后再纠正仍是同一引用（防 undo/redo 震荡）", () => {
    const violating = lineWithStoredCanvasPoints([
      { x: 199, y: 200 },
      { x: 150, y: 200 },
      { x: 150, y: 90 },
      { x: 560, y: 90 },
      { x: 560, y: 145 }
    ]);

    const once = enforceRoutableLineEndpointApproach(violating, contextFor(LEFT, LOAD, violating));
    expect(once).not.toBe(violating);

    expect(enforceRoutableLineEndpointApproach(once, contextFor(LEFT, LOAD, once))).toBe(once);
  });

  test("10 退化两点直线补成三点：target 端纠正后每一段都不穿端点设备本体", () => {
    // LEFT 与 RIGHT 法线同为 (+1, 0)：
    // 两点直线 [{199,200}, {699,200}] 的 source 端合规（dx>0），target 端反向违规 → 只有 target 需要纠正。
    const degenerate = lineWithStoredCanvasPoints(
      [{ x: 199, y: 200 }, { x: 699, y: 200 }],
      LEFT_TERMINAL,
      RIGHT_TERMINAL,
      {
        source: routableLineDeviceEndpointRefForNode(LEFT, "t1"),
        target: routableLineDeviceEndpointRefForNode(RIGHT, "t1")
      }
    );
    expect(routableLineDeviceCanvasPoints(degenerate)).toHaveLength(2);

    const enforced = enforceRoutableLineEndpointApproach(degenerate, contextFor(LEFT, RIGHT, degenerate));
    const points = routableLineDeviceCanvasPoints(enforced);

    expect(points).toHaveLength(3);
    expect(segmentPointsAlongNormal(points[0], points[1], LEFT_NORMAL)).toBe(true);
    expect(segmentPointsAlongNormal(points[2], points[1], RIGHT_NORMAL)).toBe(true);
    // padding=0：锚点本身落在本体盒之外，因此这里可以真正断言「不穿本体」。
    // （默认 padding=8 时锚点就在盒内，端点相邻段必然相交——与本规则无关。）
    //
    // 注意：本例只能断言「端点相邻段不穿各自的设备本体」，不能断言「每一段都不穿」。
    // RIGHT 的端子朝 +x，末段必须落在端子右侧（x = 727 > 699），于是中段必然横跨
    // RIGHT 本体（x ∈ [545, 695]）——这是「从外侧指向锚点」本身的几何后果，不是纠正的缺陷。
    for (let index = 1; index < points.length; index += 1) {
      if (index === 1) {
        expect(segmentIntersectsNodeBody(points[0], points[1], LEFT, 0)).toBe(false);
      }
      if (index === points.length - 1) {
        expect(segmentIntersectsNodeBody(points[points.length - 2], points[points.length - 1], RIGHT, 0)).toBe(false);
      }
    }
  });

  test("11 纠正后不再横穿端点设备本体", () => {
    // 构造一条首段明显扎进 LEFT 本体、其余各段都在本体外的违规线路。
    // 纠正只动 points[1] → 首段被拉回端子外侧，整条线不再扎进 LEFT。
    const crossing = lineWithStoredCanvasPoints([
      { x: 199, y: 200 },
      { x: 120, y: 200 },
      { x: 227, y: 90 },
      { x: 560, y: 90 },
      { x: 560, y: 145 }
    ]);
    const before = routableLineDeviceCanvasPoints(crossing);
    expect(segmentIntersectsNodeBody(before[0], before[1], LEFT, 0)).toBe(true);

    const points = routableLineDeviceCanvasPoints(
      enforceRoutableLineEndpointApproach(crossing, contextFor(LEFT, LOAD, crossing))
    );

    expectBothEndsApproach(points);
    for (let index = 1; index < points.length; index += 1) {
      expect(segmentIntersectsNodeBody(points[index - 1], points[index], LEFT, 0)).toBe(false);
    }
  });

  test("12 切线级别：点不足 2 / 端点重合 / 非线路节点都不抛异常", () => {
    const nonRoutable = { ...createDefaultNode("dc-source", { x: 300, y: 300 }), id: "approach-plain" };
    expect(enforceRoutableLineEndpointApproach(nonRoutable, contextFor(nonRoutable))).toBe(nonRoutable);

    const degenerateStart = lineWithStoredCanvasPoints(
      [{ x: 199, y: 200 }, { x: 199, y: 200 }],
      LEFT_TERMINAL,
      LEFT_TERMINAL
    );
    // 起终点重合：归一化会把点列压成 1 个点 → 不应抛异常
    expect(() => enforceRoutableLineEndpointApproach(degenerateStart, contextFor(LEFT, degenerateStart))).not.toThrow();

    const storedEmpty = {
      ...createRoutableLineDeviceFromEndpoints(TEMPLATE, LEFT_TERMINAL, LOAD_TERMINAL, "layer-a", DEVICE_ENDPOINTS),
      params: { ...createRoutableLineDeviceFromEndpoints(TEMPLATE, LEFT_TERMINAL, LOAD_TERMINAL, "layer-a", DEVICE_ENDPOINTS).params, [ROUTABLE_LINE_POINTS_PARAM]: "[]" }
    };
    expect(() => enforceRoutableLineEndpointApproach(storedEmpty, contextFor(LEFT, LOAD, storedEmpty))).not.toThrow();
  });

  test("13 纠正无解（escape 点被画布边界 clamp 回锚点）时不重建节点：返回同一引用", () => {
    // EDGE 的端子锚点 (960,200) 正好压在 BOUNDS.width 上，首段又指向本体内部（dx=-80，不合规）。
    // 慢路径算出的 escape 点 = clamp(960 + 28, 0, 960) = (960,200) —— 与锚点重合，
    // 于是 points[1] 被换成锚点本身，归一化去重后点列与存量完全一致。
    //
    // 这条用例承重的是写回前的 samePointList 幂等比较：
    //   断言的期望值是「同一引用」，而删掉该比较的后果是「新建一个点位完全相同的对象」——
    // 两者不等，因此这条断言对那个变异有区分力（不是「默认值恰好等于期望值」的陷阱）。
    const busPoint = projectPointToBusCenterline(BUS, { x: 700, y: 120 });
    const edgeLine = lineWithStoredCanvasPoints(
      [
        { x: 960, y: 200 },
        { x: 880, y: 200 },
        { x: 880, y: 120 },
        { x: busPoint.x, y: busPoint.y }
      ],
      EDGE_TERMINAL,
      busPoint,
      {
        source: routableLineDeviceEndpointRefForNode(EDGE, "t1"),
        target: routableLineDeviceEndpointRefForNode(BUS, "t1", busPoint)
      }
    );
    const storedPoints = routableLineDeviceCanvasPoints(edgeLine);
    // 前置：首段不合规 → 快路径（allMatch）必然不走，慢路径确实被走到
    expect(segmentPointsAlongNormal(storedPoints[0], storedPoints[1], EDGE_NORMAL)).toBe(false);

    const enforced = enforceRoutableLineEndpointApproach(edgeLine, contextFor(EDGE, BUS, edgeLine));

    expect(enforced).toBe(edgeLine);
    expect(routableLineDeviceCanvasPoints(enforced)).toEqual(storedPoints);
  });
});

/* ------------------------------------------------------------------ *
 * 静态守卫：setRoutableLineDeviceCanvasPoints( 的生产调用点必须显式决定
 * 是否走端点走向强制 —— 要么传第 3 参 context，要么命中预览 allowlist。
 * ------------------------------------------------------------------ */

const SET_CALL = "setRoutableLineDeviceCanvasPoints(";

/** 行谓词：只跳过声明行本身，绝不按文件跳过。 */
const DECLARATION_LINE = /^\s*export\s+function\s+setRoutableLineDeviceCanvasPoints\s*\(/;

function topLevelSplitArgs(inner: string): string[] {
  const args: string[] = [];
  let depth = 0;
  let current = "";
  for (const char of inner) {
    if (char === "(" || char === "[" || char === "{") depth += 1;
    if (char === ")" || char === "]" || char === "}") depth -= 1;
    if (char === "," && depth === 0) {
      args.push(current);
      current = "";
      continue;
    }
    current += char;
  }
  args.push(current);
  return args.filter((arg) => arg.trim().length > 0);
}

function callEndIndex(source: string, openParenIndex: number): number {
  let depth = 0;
  for (let index = openParenIndex; index < source.length; index += 1) {
    const char = source[index];
    if (char === "(") depth += 1;
    else if (char === ")") {
      depth -= 1;
      if (depth === 0) return index;
    }
  }
  return -1;
}

type CanvasPointsCall = {
  line: number;
  argCount: number;
  precedingLines: string[];
  callText: string;
};

/** 找出源码里所有 setRoutableLineDeviceCanvasPoints( 调用（跳过声明行）。 */
function findCanvasPointsCalls(source: string): CanvasPointsCall[] {
  const calls: CanvasPointsCall[] = [];
  let searchFrom = 0;
  for (;;) {
    const index = source.indexOf(SET_CALL, searchFrom);
    if (index < 0) {
      break;
    }
    searchFrom = index + SET_CALL.length;
    const lineStart = source.lastIndexOf("\n", index) + 1;
    const lineEnd = source.indexOf("\n", index) < 0 ? source.length : source.indexOf("\n", index);
    if (DECLARATION_LINE.test(source.slice(lineStart, lineEnd))) {
      continue;
    }
    const end = callEndIndex(source, source.indexOf("(", index));
    if (end < 0) {
      continue;
    }
    const lineNumber = source.slice(0, index).split("\n").length;
    calls.push({
      line: lineNumber,
      argCount: topLevelSplitArgs(source.slice(index + SET_CALL.length, end)).length,
      precedingLines: source.slice(0, lineStart).split("\n").slice(-14),
      callText: source.slice(index, end + 1).replace(/\s+/g, " ")
    });
    searchFrom = end;
  }
  return calls;
}

/**
 * 显式 allowlist：纯预览 / 已由紧邻调用纠正的位置。
 * 每条都必须写明「为什么是预览」，否则守卫应当红。
 */
const PREVIEW_CALL_ALLOWLIST: Array<{ file: string; contextPattern: RegExp; reason: string }> = [
  {
    file: "appExtracted/appProjectCanvasFactories.tsx",
    contextPattern: /const previewRoutePoints = routableLineNode/,
    reason: "拖拽预览分支：随 mousemove 每帧调用，走端点走向强制会让拖拽发涩；松手提交由 createFinishManualPathDrag 兜底"
  },
  {
    file: "model-routing.ts",
    contextPattern: /insertOrthogonalRouteBend\(/,
    reason: "加拐点几何 helper，自身也被预览路径复用；提交侧的纠正已在 appDeviceDefinitionFactories.createInsertRoutableLineBendAtPoint 传入 context"
  },
  {
    file: "model-routing.ts",
    contextPattern: /moveOrthogonalRouteSegment\(/,
    reason: "拖线段几何 helper，仅在拖拽预览路径使用（提交侧先由调用方 setRoutableLineDeviceCanvasPoints 带 context 纠正）"
  },
  {
    file: "model-routing.ts",
    contextPattern: /simplifyPreservedRoutableLineRouteIfCleaner\(/,
    reason: "setRoutableLineDeviceEndpointsPreservingRoute 内层写入；该函数 return 前紧接一次 enforceRoutableLineEndpointApproach，此处再传 context 会重复纠正"
  }
];

function allowlistEntryFor(file: string, call: CanvasPointsCall) {
  return PREVIEW_CALL_ALLOWLIST.find(
    (entry) => entry.file === file && entry.contextPattern.test(call.precedingLines.join("\n"))
  );
}

function productionSourceFiles(): string[] {
  const root = fileURLToPath(new URL(".", import.meta.url));
  const files: string[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) {
        walk(full);
        continue;
      }
      // 只扫生产代码：测试文件（含本文件自身）不是生产调用点。
      if (/\.test\.tsx?$/.test(entry)) {
        continue;
      }
      if (!/\.tsx?$/.test(entry)) {
        continue;
      }
      files.push(relative(root, full).replace(/\\/g, "/"));
    }
  };
  walk(root);
  return files;
}

describe("setRoutableLineDeviceCanvasPoints 接入点守卫", () => {
  test("守卫的检测逻辑自测：未传 context 的生产调用能被检出", () => {
    const synthetic = [
      "export function setRoutableLineDeviceCanvasPoints(node, canvasPoints) {",
      "  return node;",
      "}",
      "const a = setRoutableLineDeviceCanvasPoints(node, nextPoints);",
      "const b = setRoutableLineDeviceCanvasPoints(",
      "  lineNode,",
      "  routePoints,",
      "  { nodeById, bounds: canvasBounds }",
      ");"
    ].join("\n");

    const calls = findCanvasPointsCalls(synthetic);
    expect(calls).toHaveLength(2);
    expect(calls[0].argCount).toBe(2);
    expect(calls[1].argCount).toBe(3);
  });

  test("守卫的检测逻辑自测：声明行与已传 context 的调用不误报", () => {
    const synthetic = [
      "export function setRoutableLineDeviceCanvasPoints(",
      "  node: ModelNode,",
      "  canvasPoints: readonly Point[],",
      "  approachContext?: RoutableLineEndpointApproachContext",
      "): ModelNode {",
      "  const routePoints = orthogonalizeRouteKeepingCollinear(normalizeRoutableLineDevicePoints(canvasPoints));",
      "  if (approachContext) {",
      "    return enforce(node, approachContext);",
      "  }",
      "  return writeRaw(node, routePoints);",
      "}",
      "const ok = setRoutableLineDeviceCanvasPoints(node, nextPoints, { nodeById, bounds: canvasBounds });"
    ].join("\n");

    const calls = findCanvasPointsCalls(synthetic);
    expect(calls).toHaveLength(1);
    expect(calls[0].argCount).toBe(3);
  });

  test("每个生产调用点要么传了 context，要么命中带注释的预览 allowlist", () => {
    const violations: string[] = [];
    for (const file of productionSourceFiles()) {
      const source = readFileSync(fileURLToPath(new URL(file, import.meta.url)), "utf8");
      for (const call of findCanvasPointsCalls(source)) {
        if (call.argCount >= 3) {
          continue;
        }
        if (allowlistEntryFor(file, call)) {
          continue;
        }
        violations.push(`${file}:${call.line} → ${call.callText}`);
      }
    }

    expect(violations).toEqual([]);
  });

  test("allowlist 每条都带非空理由，且理由里点名了「预览」或已纠正链路", () => {
    for (const entry of PREVIEW_CALL_ALLOWLIST) {
      expect(entry.reason.trim().length).toBeGreaterThan(0);
      expect(/预览|已由|紧接/.test(entry.reason)).toBe(true);
    }
  });
});

/*
 * MUTATION LOG
 * injector: tmp/mut-endpoint-approach.mjs（只做 JSON.parse + 字符串替换）
 * 表:      tmp/mut-endpoint-approach.json
 * 循环:    pwsh -NoProfile -File tmp/run-mutations.ps1 -Rows "1,2,3,4,5,6,7"
 *
 * 结果：7/7 全部 RED —— 没有任何一条是「输入维度没覆盖」的假绿。
 *
 *  #  变异点                                            变红用例
 *  -- ------------------------------------------------- ------------------------------
 *  ①  routeSegmentMatchesNormal 的 >0 改成 >=0            1c
 *  ②  escape 点替换改成原样返回（stub 落在锚点上）        10
 *  ③  幂等快路径失效（已合规仍走慢路径）                  1b
 *  ④  母线端跳过条件失效（设备端子也要纠正）              7 条（1c/2/3/5/7/9/11）
 *  ⑤  target 端也跳过设备端子判定                        4 条（1d/4/5/10）
 *  ⑥  写回前少了 samePointList 幂等比较                  13
 *  ⑦  组合 ③+⑥（2 处替换）                              4 条（1/1b/9/13）
 *
 * ⚠ ④⑤ 注入后 `pnpm tsc --noEmit` 也会红（TS2322/TS2345：`isBusNode` 的类型收窄
 *   被 `&& false` 抹掉，`sourceDevice` 退回 `ModelNode | undefined`）。
 *   它们仍然是有效变异 —— vitest 走 esbuild 转译，不做类型检查，用例照常执行并转红。
 *   但这也说明这两条守卫是「类型 + 行为」双重承载，不是纯行为守卫。
 *
 * ── 三条绿变异是怎么变成红的（记在这里，别再重走一遍） ──────────────────────────
 *
 * ① 绿 → 红的分水岭是「夹具里必须是 source 端单独退化」。
 *   routeSegmentMatchesNormal 先 Math.round 再判方向，所以相距 0.1 的相邻点 dx 被抹成 0。
 *   第一版夹具（1d，scale=0.15 缩放塌陷）测不出 ①：那一版 target 端末段 dy 同样被抹成 0，
 *   不管 ① 注不注入，慢路径都会被 target 端抢先触发，随后「全量重布线」把首段也拉正了 ——
 *   断言照样绿。这跟「A 支被 B 支完全遮蔽」是同一形状：target 端就是遮蔽 ① 的那个 B。
 *   换成 1c（相邻点相距 0.1，target 端保持合规）之后，① 唯一能改的就是
 *   sourceNeedsFix 是否成立，断言立刻有区分力。
 *
 * ③ 绿 → 红靠的是「合规但含冗余共线点」的输入（1b）。
 *   没有它之前，所有合规夹具的点列都恰好是 simplify 的不动点，快路径失效也看不出差别。
 *
 * ⑥ 绿 → 红靠的是一个「纠正必然是 no-op」的夹具（13）。
 *   单看可达性：`escape` 点至少外推 ROUTE_ENDPOINT_STUB_LENGTH=28，
 *   只要端点不在画布边界上，stub 就不可能等于原有点 → `correctedLocalPoints`
 *   与存量不同 → ⑥ 的 `samePointList` 分支在所有慢路径用例上都取不到 true。
 *   唯一能让它取到 true 的入口是 clampPointToBounds：端点锚点压在 bounds 边界上、
 *   外法线又指向界外时，escape 被夹回锚点本身，纠正后点列与存量逐点相同。
 *   断言写成「期望同一引用」，而删掉 ⑥ 的后果是「新建一个点位完全相同的对象」——
 *   两者不等，不是「默认值恰好等于期望值」那种无区分力的断言。
 *
 * ── 判红方式（踩过的坑） ────────────────────────────────────────────────────────
 *
 * 第一版循环用正则从 vitest 文本输出里抓失败用例名，正则失配 →
 * 摘要里明写 "1 failed" 却被标成 GREEN，还顺手去跑了一轮没必要的回归组。
 * 现在改用 `--reporter=json --outputFile=...` 读 status；注入器的输出也一律不吞：
 * 非 "OK 注入 " 一律判「注入失败，跳过」，绝不计入红/绿。
 */