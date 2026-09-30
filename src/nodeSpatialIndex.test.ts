// 节点渲染包围盒、空间索引、智能对齐吸附、滚轮缩放锚点。
//
// 这批函数是视口批处理与「智能对齐」两条链的核心，全部纯计算，但此前零直接断言
// （只在别的测试里当依赖注入出现过）—— 空间索引退化或吸附阈值算错，表现都是
// 「节点不重绘」或「拖拽不吸附」，无法从症状回推到具体一行。
import { describe, expect, test } from "vitest";
import type { ModelNode } from "./model";
import {
  anchoredCanvasNoScrollOffset,
  anchoredCanvasScrollPosition,
  bestSmartAlignmentAxisSnap,
  buildNodeSpatialIndex,
  initialVisibleCanvasViewBox,
  mergeRenderViewportBounds,
  nodeRenderBounds,
  queryNodeSpatialIndex,
  smartAlignmentAxisAnchors,
  spatialBucketKey,
  spatialBucketRange,
  type RenderViewportBounds
} from "./appExtracted/appCoreCanvasUtilities";

// 包围盒 padding：nodeRenderBounds 内部写死 24（标签占位）
const BOUNDS_PADDING = 24;
// 智能对齐参考线两端各留的余量（SMART_ALIGNMENT_GUIDE_PADDING）
const GUIDE_PADDING = 36;

const bounds = (left: number, top: number, right: number, bottom: number): RenderViewportBounds =>
  ({ left, top, right, bottom });

const node = (over: Partial<ModelNode> = {}): ModelNode =>
  ({
    id: "n1",
    kind: "ac-load",
    name: "负荷",
    params: {},
    position: { x: 0, y: 0 },
    size: { width: 40, height: 20 },
    rotation: 0,
    scale: 1,
    layerId: "default",
    terminals: [],
    ...over
  }) as unknown as ModelNode;

describe("mergeRenderViewportBounds：两框的最小外接矩形", () => {
  test("常规并集", () => {
    expect(mergeRenderViewportBounds(bounds(0, 0, 10, 10), bounds(5, -5, 20, 3))).toEqual({
      left: 0,
      top: -5,
      right: 20,
      bottom: 10
    });
  });

  test("★ 包含关系：被包含的框不改变结果（不是求和也不是交叉）", () => {
    expect(mergeRenderViewportBounds(bounds(0, 0, 100, 100), bounds(10, 10, 20, 20))).toEqual(bounds(0, 0, 100, 100));
  });
});

describe("nodeRenderBounds：外接圆 + 标签感知", () => {
  // 40×20 的半对角线 = hypot(40,20)/2 ≈ 22.36，再加 24 的 padding
  const halfDiagonal = Math.hypot(40, 20) / 2 + BOUNDS_PADDING;

  test("左右上下按「半对角线 + padding」对称外扩", () => {
    const result = nodeRenderBounds(node({}));
    expect(result.left).toBeCloseTo(-halfDiagonal, 10);
    expect(result.right).toBeCloseTo(halfDiagonal, 10);
    expect(result.top).toBeCloseTo(-halfDiagonal, 10);
    // 底部被标签盒顶到更靠下（标签默认 follow 可见）
    expect(result.bottom).toBeGreaterThan(halfDiagonal);
  });

  test("★ 旋转不影响包围盒（用外接圆，任何角度都包得住）", () => {
    const straight = nodeRenderBounds(node({ rotation: 0 }));
    expect(nodeRenderBounds(node({ rotation: 45 }))).toEqual(straight);
    expect(nodeRenderBounds(node({ rotation: 90 }))).toEqual(straight);
  });

  test("★ 位置平移整体平移包围盒", () => {
    const origin = nodeRenderBounds(node({}));
    const shifted = nodeRenderBounds(node({ position: { x: 500, y: -300 } }));
    expect(shifted.left - origin.left).toBeCloseTo(500, 10);
    expect(shifted.top - origin.top).toBeCloseTo(-300, 10);
  });

  test("节点 scale 放大时外接圆同步放大", () => {
    // 尺寸随 scale 走，半径 = hypot(w×scaleX, h×scaleY) / 2 + padding
    expect(nodeRenderBounds(node({})).right).toBeCloseTo(Math.hypot(40, 20) / 2 + BOUNDS_PADDING, 10);
    expect(nodeRenderBounds(node({ scale: 2 })).right).toBeCloseTo(Math.hypot(80, 40) / 2 + BOUNDS_PADDING, 10);
  });
});

describe("空间桶：键与范围", () => {
  test("桶键是 x:y", () => {
    expect(spatialBucketKey(3, -1)).toBe("3:-1");
  });

  test("范围按 floor 取桶下标", () => {
    expect(spatialBucketRange(bounds(0, 0, 100, 100), 256)).toEqual({ left: 0, right: 0, top: 0, bottom: 0 });
    expect(spatialBucketRange(bounds(-10, -10, 300, 100), 256)).toEqual({ left: -1, right: 1, top: -1, bottom: 0 });
  });

  test("★ 右/下边界恰在网格线上仍多占一桶（floor 而非 ceil-1）", () => {
    // 边界像素恰好落在 1 号桶起点，若按 ceil-1 就只占 0 号桶，右侧 1px 会被漏查。
    expect(spatialBucketRange(bounds(0, 0, 256, 256), 256)).toEqual({ left: 0, right: 1, top: 0, bottom: 1 });
  });
});

describe("buildNodeSpatialIndex / queryNodeSpatialIndex", () => {
  const far = node({ id: "n2", position: { x: 1000, y: 1000 } });

  test("跨桶登记：40×20 节点因标签下溢而横跨 2×2 桶", () => {
    const index = buildNodeSpatialIndex([node({})]);
    expect([...index.buckets.keys()].sort()).toEqual(["-1:-1", "-1:0", "0:-1", "0:0"]);
  });

  test("远离的节点进另一组桶", () => {
    const index = buildNodeSpatialIndex([node({}), far]);
    expect(index.buckets.size).toBe(8);
    expect([...(index.buckets.get("3:3") ?? [])].map((n) => n.id)).toEqual(["n2"]);
  });

  test("★ 查询结果按 id 去重（一个节点登记在 4 个桶里，只出现一次）", () => {
    const index = buildNodeSpatialIndex([node({}), far]);
    const all = queryNodeSpatialIndex(index, bounds(-9999, -9999, 9999, 9999));
    expect(all.map((n) => n.id)).toEqual(["n1", "n2"]);
  });

  test("★ 查询范围外的节点被逐个精确剔除（桶命中不等于相交）", () => {
    const index = buildNodeSpatialIndex([node({}), far]);
    // 查询框右/下边止于 900，仍会扫到 3 号桶（far 在 3:3~4:4），
    // 但它的包围盒从 953.6 起，必须被 boxesIntersect 精确剔掉。
    const near = queryNodeSpatialIndex(index, bounds(-1000, -1000, 900, 900));
    expect(near.map((n) => n.id)).toEqual(["n1"]);
  });

  test("空索引查询返回空数组", () => {
    expect(queryNodeSpatialIndex(buildNodeSpatialIndex([]), bounds(0, 0, 10, 10))).toEqual([]);
  });

  test("重复查询不累积结果（mark 去重而非 seen 集合）", () => {
    const index = buildNodeSpatialIndex([node({})]);
    const first = queryNodeSpatialIndex(index, bounds(-9999, -9999, 9999, 9999));
    const second = queryNodeSpatialIndex(index, bounds(-9999, -9999, 9999, 9999));
    expect(first.map((n) => n.id)).toEqual(second.map((n) => n.id));
    expect(index.queryState.mark).toBe(2);
  });
});

describe("smartAlignmentAxisAnchors：起 / 中 / 终三锚点", () => {
  test("x 轴取左右边与水平中心", () => {
    expect(smartAlignmentAxisAnchors(bounds(0, 10, 100, 50), "x")).toEqual([
      { key: "start", value: 0, priority: 1 },
      { key: "center", value: 50, priority: 0 },
      { key: "end", value: 100, priority: 1 }
    ]);
  });

  test("y 轴取上下边与垂直中心（中心 priority 更低 = 优先吸附）", () => {
    expect(smartAlignmentAxisAnchors(bounds(0, 10, 100, 50), "y")).toEqual([
      { key: "start", value: 10, priority: 1 },
      { key: "center", value: 30, priority: 0 },
      { key: "end", value: 50, priority: 1 }
    ]);
  });
});

describe("bestSmartAlignmentAxisSnap：最近优先，同距比 priority", () => {
  const dragged = bounds(0, 0, 100, 50);

  test("超出阈值不吸附", () => {
    expect(bestSmartAlignmentAxisSnap("x", dragged, [], [{ id: "c1", bounds: bounds(200, 0, 300, 50) }], 8)).toBeNull();
  });

  test("★ 距离恰等于阈值仍吸附（判定是 `> threshold` 而非 `>=`）", () => {
    expect(bestSmartAlignmentAxisSnap("x", dragged, [], [{ id: "c1", bounds: bounds(108, 0, 208, 50) }], 8)).not.toBeNull();
    expect(bestSmartAlignmentAxisSnap("x", dragged, [], [{ id: "c1", bounds: bounds(109, 0, 209, 50) }], 8)).toBeNull();
  });

  test("常规吸附：返回修正量、距离与参考线", () => {
    // 拖拽盒 end=100，候选 start=102 → 差 2，落在阈值 8 内
    const snap = bestSmartAlignmentAxisSnap("x", dragged, [], [{ id: "c1", bounds: bounds(102, 0, 202, 50) }], 8);
    expect(snap).toEqual({
      adjustment: 2,
      distance: 2,
      priority: 2,
      guide: {
        id: "vertical:c1:start:end",
        orientation: "vertical",
        position: 102,
        start: 0 - GUIDE_PADDING,
        end: 50 + GUIDE_PADDING
      }
    });
  });

  test("★ 同距离时取 priority 更小者（中心对中心胜过边对边）", () => {
    const snap = bestSmartAlignmentAxisSnap("x", dragged, [], [{ id: "c1", bounds: bounds(0, 0, 100, 50) }], 8);
    expect(snap?.distance).toBe(0);
    expect(snap?.priority).toBe(0);
    expect(snap?.guide.id).toBe("vertical:c1:center:center");
  });

  test("★ 更远的低 priority 不胜更近的高 priority（先比距离）", () => {
    // 边对边 distance 0 / priority 2，中心对中心 distance 50 / priority 0
    const snap = bestSmartAlignmentAxisSnap("x", dragged, [], [{ id: "c1", bounds: bounds(100, 0, 200, 50) }], 60);
    expect(snap?.distance).toBe(0);
    expect(snap?.priority).toBe(2);
  });

  test("★ 参考线跨到两个盒的外沿（取 min/max 再各留 padding）", () => {
    const snap = bestSmartAlignmentAxisSnap("x", dragged, [], [{ id: "c1", bounds: bounds(0, -100, 100, -50) }], 8);
    expect(snap?.guide.orientation).toBe("vertical");
    expect(snap?.guide.start).toBe(-100 - GUIDE_PADDING);
    expect(snap?.guide.end).toBe(50 + GUIDE_PADDING);
  });

  test("y 轴的参考线是横向，id 前缀 horizontal", () => {
    const snap = bestSmartAlignmentAxisSnap("y", dragged, [], [{ id: "c1", bounds: bounds(0, 52, 100, 102) }], 8);
    expect(snap?.guide.orientation).toBe("horizontal");
    expect(snap?.guide.id).toBe("horizontal:c1:start:end");
    expect(snap?.adjustment).toBe(2);
  });

  test("★ 候选的额外锚点参与吸附（可只对齐到某个端口而非整框）", () => {
    const snap = bestSmartAlignmentAxisSnap(
      "x",
      dragged,
      [],
      [{ id: "c1", bounds: bounds(500, 0, 600, 50), anchors: { x: [{ key: "port", value: 6, priority: 0 }], y: [] } }],
      8
    );
    expect(snap?.adjustment).toBe(6);
    expect(snap?.priority).toBe(1);
    expect(snap?.guide.id).toBe("vertical:c1:port:start");
  });

  test("★ 拖拽方额外锚点也参与（先遍历拖拽锚点）", () => {
    const snap = bestSmartAlignmentAxisSnap(
      "x",
      dragged,
      [{ key: "extra", value: 104, priority: 0 }],
      [{ id: "c1", bounds: bounds(102, 0, 202, 50) }],
      8
    );
    expect(snap?.distance).toBe(2);
    expect(snap?.guide.id).toBe("vertical:c1:start:extra");
  });

  test("无候选 → null", () => {
    expect(bestSmartAlignmentAxisSnap("x", dragged, [], [], 8)).toBeNull();
  });
});

describe("滚轮缩放锚点", () => {
  const anchor = { point: { x: 10, y: 20 }, cursorOffsetX: 5, cursorOffsetY: 5 };

  test("滚动态：按缩放后位移换算并夹进 [0, maxScroll]", () => {
    expect(anchoredCanvasScrollPosition(anchor, { x: 2, y: 2 }, { left: 100, top: 50 }, { left: 500, top: 400 })).toEqual({
      left: 115,
      top: 85
    });
  });

  test("★ 负值夹到 0（不会滚出内容左侧）", () => {
    expect(
      anchoredCanvasScrollPosition({ point: { x: 0, y: 0 }, cursorOffsetX: 100, cursorOffsetY: 100 }, { x: 1, y: 1 }, { left: 0, top: 0 }, { left: 500, top: 400 })
    ).toEqual({ left: 0, top: 0 });
  });

  test("★ 超出滚动上限夹到上限", () => {
    expect(anchoredCanvasScrollPosition(anchor, { x: 100, y: 100 }, { left: 0, top: 0 }, { left: 50, top: 50 })).toEqual({
      left: 50,
      top: 50
    });
  });

  test("无滚动态偏移不夹取（负值是合法的居中补偿）", () => {
    expect(anchoredCanvasNoScrollOffset(anchor, { x: 2, y: 2 }, { left: 40, top: 40 })).toEqual({ x: -55, y: -75 });
  });
});

describe("initialVisibleCanvasViewBox：首屏可见区", () => {
  const canvasBounds = { width: 1920, height: 1024 };

  test("按帧尺寸减两倍 16px 边框，并水平居中", () => {
    expect(initialVisibleCanvasViewBox(canvasBounds, { clientWidth: 1200, clientHeight: 800 })).toEqual({
      x: 376,
      y: 128,
      width: 1168,
      height: 768
    });
  });

  test("画布小于可见区 → 只见画布本身，不产生负偏移", () => {
    expect(initialVisibleCanvasViewBox({ width: 400, height: 300 }, { clientWidth: 1200, clientHeight: 800 })).toEqual({
      x: 0,
      y: 0,
      width: 400,
      height: 300
    });
  });

  test("★ 帧未挂载 → 退回默认画布尺寸 1920×1024", () => {
    expect(initialVisibleCanvasViewBox(canvasBounds, null)).toEqual({ x: 0, y: 0, width: 1920, height: 1024 });
  });

  test("★ 帧尺寸为 0（尚未布局）也走默认值，不算成 1px 可见区", () => {
    expect(initialVisibleCanvasViewBox(canvasBounds, { clientWidth: 0, clientHeight: 0 })).toEqual({
      x: 0,
      y: 0,
      width: 1920,
      height: 1024
    });
  });

  test("★ 帧比边框还小 → 至少保 1px，不出 0 或负宽度", () => {
    // 10 - 32 = -22 被抬到 1；居中偏移 (1920-1)/2 = 959.5，允许半像素
    expect(initialVisibleCanvasViewBox(canvasBounds, { clientWidth: 10, clientHeight: 10 })).toEqual({
      x: 959.5,
      y: 511.5,
      width: 1,
      height: 1
    });
  });
});