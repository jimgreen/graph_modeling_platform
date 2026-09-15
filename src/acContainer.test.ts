import { describe, test, expect } from "vitest";
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

  test("fitContainerToMembers 更新容器 position/size", () => {
    const c = node("c1", "ac-vpp-box", 999, 999, 180, 112);
    const out = fitContainerToMembers(c, [node("a", "ac-load", 10, 20, 200, 100)]);
    expect(out.position).toEqual({ x: 10 - 100 - CONTAINER_PADDING, y: 20 - 50 - CONTAINER_PADDING });
    expect(out.size.width).toBe(200 + CONTAINER_PADDING * 2);
    expect(out.size.height).toBe(100 + CONTAINER_PADDING * 2);
  });

  test("成员包围盒小于最小尺寸时取最小尺寸", () => {
    const c = node("c1", "ac-vpp-box", 999, 999, 180, 112);
    const out = fitContainerToMembers(c, [node("a", "ac-load", 10, 20)]);
    expect(out.size).toEqual({ width: CONTAINER_MIN_SIZE.width, height: CONTAINER_MIN_SIZE.height });
  });

  test("成员全空时收缩回最小尺寸(保持左上角)", () => {
    const c = node("c1", "ac-vpp-box", 0, 0, 500, 400);
    const out = fitContainerToMembers(c, []);
    expect(out.size).toEqual({ width: 180, height: 112 });
    expect(out.position).toEqual({ x: 0, y: 0 });
  });

  test("挤出:容器内非成员被推到界外,线路豁免", () => {
    const c = { ...node("c1", "ac-vpp-box", 0, 0, 200, 200), containerId: undefined };
    const insider = { ...node("in", "ac-load", 50, 50), containerId: "c1" };
    const outsider = node("out", "ac-load", 60, 60);
    const line = node("ln", "ac-line", 70, 70);
    const patches = ejectOutsiders(c as any, [c, insider, outsider, line] as any);
    const ids = patches.map((p) => p.nodeId);
    expect(ids).toContain("out");
    expect(ids).not.toContain("in");
    expect(ids).not.toContain("ln");
    // 推出后中心在容器外
    const p = patches.find((x) => x.nodeId === "out")!;
    const cx = p.position.x + 20, cy = p.position.y + 15;
    expect(cx < 0 || cx > 200 || cy < 0 || cy > 200).toBe(true);
  });

  test("挤出豁免:容器自身、其它容器、中心在容器外的节点", () => {
    const c = node("c1", "ac-vpp-box", 0, 0, 200, 200);
    const inner = node("c2", "ac-switch-box", 50, 50, 60, 40);
    const outside = node("far", "ac-load", 400, 400);
    const patches = ejectOutsiders(c as any, [c, inner, outside] as any);
    expect(patches).toEqual([]);
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
