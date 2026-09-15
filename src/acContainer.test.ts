import { describe, test, expect } from "vitest";
import { calculateNodeVisualBounds } from "./model";
import {
  CONTAINER_PADDING,
  CONTAINER_MIN_SIZE,
  containerBoundsForMembers,
  fitContainerToMembers,
  ejectOutsiders,
  containerFirstComparator,
  isAcContainerNode,
} from "./acContainer";

// 测试用最小节点。rotation/scale 必填:calculateNodeVisualBounds 依赖它们算半宽高,
// 缺省会得 NaN。默认隐去标签(params._labelVisible="0"),让视觉包围盒 == 节点本体矩形,
// 便于精确断言 padding/并集算术;标签参与包围盒另有一条专门用例。
const node = (id: string, kind: string, x: number, y: number, w = 40, h = 30) => ({
  id, kind, name: id, position: { x, y }, size: { width: w, height: h },
  rotation: 0, scale: 1, params: { _labelVisible: "0" }, terminals: [],
} as any);

// 平台口径:node.position 是**中心**,故容器真实矩形 = position ± size/2
const rectOf = (n: any) => ({
  x1: n.position.x - n.size.width / 2,
  y1: n.position.y - n.size.height / 2,
  x2: n.position.x + n.size.width / 2,
  y2: n.position.y + n.size.height / 2,
});
const centerIn = (p: { x: number; y: number }, r: ReturnType<typeof rectOf>) =>
  p.x >= r.x1 && p.x <= r.x2 && p.y >= r.y1 && p.y <= r.y2;

describe("acContainer 布局", () => {
  test("包围盒 = 成员并集 + padding", () => {
    // 40×30 节点以 position 为中心,故 (0,0) 的视觉盒是 [-20,20]×[-15,15]
    const r = containerBoundsForMembers([node("a", "ac-load", 0, 0), node("b", "ac-load", 100, 50)])!;
    expect(r.x).toBe(-20 - CONTAINER_PADDING);
    expect(r.y).toBe(-15 - CONTAINER_PADDING);
    expect(r.width).toBe(100 + 40 + CONTAINER_PADDING * 2);
    expect(r.height).toBe(50 + 30 + CONTAINER_PADDING * 2);
  });

  test("无成员返回 null", () => {
    expect(containerBoundsForMembers([])).toBeNull();
  });

  test("视觉包围盒含标签:容器须包住标签,不是裸 size", () => {
    // 标签画在节点下方,故同一节点「带标签」的容器必须比「隐标签」的高
    const labeled = { ...node("a", "ac-load", 0, 0), params: {} };
    const hidden = containerBoundsForMembers([{ ...labeled, params: { _labelVisible: "0" } }])!;
    const shown = containerBoundsForMembers([labeled])!;
    expect(shown.height).toBeGreaterThan(hidden.height);
  });

  test("fitContainerToMembers:position 取包围矩形中心(不是左上角)", () => {
    const c = node("c1", "ac-vpp-box", 999, 999, 180, 112);
    const out = fitContainerToMembers(c, [node("a", "ac-load", 10, 20, 200, 100)]);
    expect(out.size).toEqual({ width: 200 + CONTAINER_PADDING * 2, height: 100 + CONTAINER_PADDING * 2 });
    // 单个成员时容器中心 == 成员中心
    expect(out.position).toEqual({ x: 10, y: 20 });
  });

  test("成员包围盒小于最小尺寸时取最小尺寸,且仍包住成员", () => {
    const c = node("c1", "ac-vpp-box", 999, 999, 180, 112);
    const m = node("a", "ac-load", 10, 20);
    const out = fitContainerToMembers(c, [m]);
    expect(out.size).toEqual({ width: CONTAINER_MIN_SIZE.width, height: CONTAINER_MIN_SIZE.height });
    const r = rectOf(out);
    const b = calculateNodeVisualBounds(m);
    expect(b.left).toBeGreaterThanOrEqual(r.x1);
    expect(b.right).toBeLessThanOrEqual(r.x2);
    expect(b.top).toBeGreaterThanOrEqual(r.y1);
    expect(b.bottom).toBeLessThanOrEqual(r.y2);
  });

  test("成员全空时收缩回最小尺寸(中心不变)", () => {
    const c = node("c1", "ac-vpp-box", 0, 0, 500, 400);
    const out = fitContainerToMembers(c, []);
    expect(out.size).toEqual({ width: 180, height: 112 });
    expect(out.position).toEqual({ x: 0, y: 0 });
  });

  test("挤出:容器内非成员被推到界外,线路豁免", () => {
    const c = node("c1", "ac-vpp-box", 100, 100, 200, 200); // 真实矩形 [0,0]-[200,200]
    const insider = { ...node("in", "ac-load", 50, 50), containerId: "c1" };
    const outsider = node("out", "ac-load", 60, 60);
    const line = node("ln", "ac-line", 70, 70);
    const patches = ejectOutsiders(c as any, [c, insider, outsider, line] as any);
    const ids = patches.map((p) => p.nodeId);
    expect(ids).toContain("out");
    expect(ids).not.toContain("in");
    expect(ids).not.toContain("ln");
    // 推出后节点中心在容器真实矩形外
    const p = patches.find((x) => x.nodeId === "out")!;
    expect(centerIn(p.position, rectOf(c))).toBe(false);
  });

  test("挤出覆盖四个方向:左半/上半区域的非成员同样被挤出", () => {
    const c = node("c1", "ac-vpp-box", 100, 100, 200, 200); // 真实矩形 [0,0]-[200,200]
    const probes = [
      node("lt", "ac-load", 50, 50),    // 左上:按左上角口径会误判为「在外」而逃过
      node("rt", "ac-load", 150, 50),   // 右上:同上
      node("lb", "ac-load", 50, 150),   // 左下:同上
      node("rb", "ac-load", 150, 150),
      node("top", "ac-load", 100, 20),  // 贴上边
      node("bot", "ac-load", 100, 180), // 贴下边
    ];
    const patches = ejectOutsiders(c as any, [c, ...probes] as any);
    expect(patches.map((p) => p.nodeId).sort()).toEqual(probes.map((p) => p.id).sort());
    const r = rectOf(c);
    for (const p of patches) {
      expect(centerIn(p.position, r)).toBe(false);
    }
    // 最近边最小位移:目标恰在边界外 + padding
    expect(patches.find((p) => p.nodeId === "lt")!.position).toEqual({ x: r.x1 - CONTAINER_PADDING, y: 50 });
    expect(patches.find((p) => p.nodeId === "top")!.position).toEqual({ x: 100, y: r.y1 - CONTAINER_PADDING });
  });

  test("挤出豁免:容器自身、其它容器、中心在容器外的节点", () => {
    const c = node("c1", "ac-vpp-box", 100, 100, 200, 200);
    const inner = node("c2", "ac-switch-box", 100, 100, 60, 40);
    const outside = node("far", "ac-load", 400, 400);
    const patches = ejectOutsiders(c as any, [c, inner, outside] as any);
    expect(patches).toEqual([]);
  });

  test("端到端:fit 后容器真实矩形包住全部成员(含标签)", () => {
    const members = [node("a", "ac-load", 10, 20), { ...node("b", "ac-load", 300, 60), params: {} }];
    const out = fitContainerToMembers(node("c1", "ac-vpp-box", 999, 999), members);
    const r = rectOf(out);
    for (const m of members) {
      const b = calculateNodeVisualBounds(m);
      expect(b.left).toBeGreaterThanOrEqual(r.x1);
      expect(b.right).toBeLessThanOrEqual(r.x2);
      expect(b.top).toBeGreaterThanOrEqual(r.y1);
      expect(b.bottom).toBeLessThanOrEqual(r.y2);
    }
  });

  test("排序比较器:容器恒前(底层)", () => {
    const c = node("c1", "ac-vpp-box", 0, 0);
    const a = node("a", "ac-load", 0, 0);
    expect(containerFirstComparator(c as any, a as any)).toBeLessThan(0);
    expect(containerFirstComparator(a as any, c as any)).toBeGreaterThan(0);
    expect(containerFirstComparator(a as any, node("b", "ac-load", 0, 0) as any)).toBe(0);
    expect(isAcContainerNode(c as any)).toBe(true);
    expect(isAcContainerNode(a as any)).toBe(false);
  });
});
