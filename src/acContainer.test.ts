import { describe, test, expect } from "vitest";
import {
  AC_CONTAINER_KINDS,
  DEVICE_LIBRARY,
  buildContainerDeviceParameterViews,
  calculateNodeVisualBounds,
  createDefaultNode,
  type DeviceKind,
} from "./model";
import {
  CONTAINER_PADDING,
  CONTAINER_MIN_SIZE,
  containerBoundsForMembers,
  fitContainerToMembers,
  ejectOutsiders,
  containerFirstComparator,
  isAcContainerNode,
  judgeContainerMembership,
  enforceContainerMembership,
  containerDecisionNodeUpdates,
  containerMembershipCommit,
  containerSelectOptions,
  containerMemberOptions,
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

  test("混合数组排序:容器全部在前,非容器保持相对序", () => {
    const arr = [
      node("a", "ac-load", 0, 0),
      node("c1", "ac-vpp-box", 0, 0),
      node("b", "ac-load", 0, 0),
      node("c2", "ac-switch-box", 0, 0),
    ] as any[];
    const sorted = [...arr].sort(containerFirstComparator);
    expect(sorted.map((n) => n.id)).toEqual(["c1", "c2", "a", "b"]);
    // 排序是派生数组行为:原数组顺序不受影响
    expect(arr.map((n) => n.id)).toEqual(["a", "c1", "b", "c2"]);
  });
});

describe("归属判定", () => {
  // c1 中心 (0,0) 尺寸 200×200 → 真实矩形 [-100,100]×[-100,100]
  const c = { ...node("c1", "ac-vpp-box", 0, 0, 200, 200), containerId: undefined };
  const inside = { ...node("in", "ac-load", 50, 50), containerId: "c1" };
  const outside = node("out", "ac-load", 500, 500);

  test("非成员落进容器矩形内 → 移入", () => {
    const moved = { ...outside, position: { x: 60, y: 60 } };
    const r = judgeContainerMembership({ nodes: [c, inside, moved] as any, movedIds: ["out"], altKey: false });
    expect(r.enterContainerId).toBe("c1");
    expect(r.membershipChanges).toEqual([{ nodeId: "out", containerId: "c1" }]);
  });

  test("中心锚定口径:落进容器左上半区的非成员同样移入", () => {
    // (-60,-60) 在真实矩形内、却在「左上角锚定」口径的 [0,0]-[200,200] 之外
    const moved = { ...outside, position: { x: -60, y: -60 } };
    const r = judgeContainerMembership({ nodes: [c, moved] as any, movedIds: ["out"], altKey: false });
    expect(r.enterContainerId).toBe("c1");
    expect(r.membershipChanges).toEqual([{ nodeId: "out", containerId: "c1" }]);
  });

  test("中心锚定口径:落在容器右下半区之外的非成员不移入", () => {
    // (140,60) 在「左上角锚定」口径的 [0,0]-[200,200] 之内、真实矩形之外
    const moved = { ...outside, position: { x: 140, y: 60 } };
    const r = judgeContainerMembership({ nodes: [c, moved] as any, movedIds: ["out"], altKey: false });
    expect(r.enterContainerId).toBeUndefined();
    expect(r.membershipChanges).toEqual([]);
  });

  test("成员 Alt 拖动 → 移出", () => {
    const moved = { ...inside, position: { x: 60, y: 60 } };
    const r = judgeContainerMembership({ nodes: [c, moved] as any, movedIds: ["in"], altKey: true });
    expect(r.membershipChanges).toEqual([{ nodeId: "in", containerId: undefined }]);
  });

  test("成员非 Alt 拖动 → 成员不变", () => {
    const r = judgeContainerMembership({ nodes: [c, inside] as any, movedIds: ["in"], altKey: false });
    expect(r.membershipChanges).toEqual([]);
  });

  test("非成员 Alt 落入容器 → 不移入", () => {
    const moved = { ...outside, position: { x: 60, y: 60 } };
    const r = judgeContainerMembership({ nodes: [c, moved] as any, movedIds: ["out"], altKey: true });
    expect(r.membershipChanges).toEqual([]);
  });

  test("容器自身被拖动不参与判定(不允许嵌套)", () => {
    const r = judgeContainerMembership({ nodes: [c, inside] as any, movedIds: ["c1"], altKey: false });
    expect(r.membershipChanges).toEqual([]);
    expect(r.enterContainerId).toBeUndefined();
  });

  test("多容器:按真实矩形命中所属容器", () => {
    const c2 = node("c2", "ac-switch-box", 1000, 0, 200, 200); // 真实矩形 [900,1100]×[-100,100]
    const moved = { ...outside, position: { x: 950, y: 20 } };
    const r = judgeContainerMembership({ nodes: [c, c2, moved] as any, movedIds: ["out"], altKey: false });
    expect(r.enterContainerId).toBe("c2");
    expect(r.membershipChanges).toEqual([{ nodeId: "out", containerId: "c2" }]);
  });

  test("enforceContainerMembership:容器随成员重算 + 挤出非成员", () => {
    const far = { ...node("far", "ac-load", 400, 60), containerId: "c1" };
    const stray = node("stray", "ac-load", 400, 100); // 无归属,落在重算后的容器内
    const dec = enforceContainerMembership([c, far, stray] as any);
    const upd = dec.containerUpdates.find((u) => u.id === "c1")!;
    // far 视觉盒 [380,420]×[45,75] + 24 padding → 左上角 (356,21);
    // 尺寸被钳到最小 180×112 → 中心 = 356 + 180/2
    expect(upd.size).toEqual({ ...CONTAINER_MIN_SIZE });
    expect(upd.position.x).toBe(356 + CONTAINER_MIN_SIZE.width / 2);
    // 成员不被挤出;容器内非成员被挤出
    expect(dec.patch.map((p) => p.nodeId)).toEqual(["stray"]);
    expect(centerIn(dec.patch[0].position, rectOf(upd))).toBe(false);
  });

  test("enforceContainerMembership:端到端不变量——成员视觉包围盒 ⊂ 容器真实矩形", () => {
    const members = [
      { ...node("m1", "ac-load", 300, 40), containerId: "c1" },
      { ...node("m2", "ac-load", -260, -80), params: {}, containerId: "c1" }, // 带标签:包围盒更高
    ];
    const dec = enforceContainerMembership([c, ...members] as any);
    const upd = dec.containerUpdates.find((u) => u.id === "c1")!;
    const r = rectOf(upd);
    for (const m of members) {
      const b = calculateNodeVisualBounds(m as any);
      expect(b.left).toBeGreaterThanOrEqual(r.x1);
      expect(b.right).toBeLessThanOrEqual(r.x2);
      expect(b.top).toBeGreaterThanOrEqual(r.y1);
      expect(b.bottom).toBeLessThanOrEqual(r.y2);
    }
  });
});

// ─── 面板下拉选项与决策应用(右侧面板消费) ─────────────────────────────────
describe("acContainer 面板", () => {
  test("所属容器下拉:首项无(当前模板),其余 名称 (idx)", () => {
    const c = { ...node("c1", "ac-vpp-box", 0, 0), name: "开关箱甲", params: { idx: "12" } } as any;
    const opts = containerSelectOptions([c, node("a", "ac-load", 0, 0)]);
    expect(opts[0]).toEqual({ label: "无(当前模板)", value: "" });
    expect(opts[1]).toEqual({ label: "开关箱甲 (12)", value: "c1" });
    // 非容器节点不入选项
    expect(opts).toHaveLength(2);
  });

  test("所属容器下拉:无 idx 时只显示名称", () => {
    const c = { ...node("c1", "ac-switch-box", 0, 0), name: "开关箱乙" } as any;
    expect(containerSelectOptions([c])[1]).toEqual({ label: "开关箱乙", value: "c1" });
  });

  test("绑定设备候选 = 容器成员", () => {
    const c = { ...node("c1", "ac-vpp-box", 0, 0), params: { idx: "12" } } as any;
    const m = { ...node("m1", "ac-load", 0, 0), name: "负荷A", params: { idx: "7" }, containerId: "c1" } as any;
    expect(containerMemberOptions([c, m], "c1")).toEqual([{ label: "负荷A (7)", value: "m1" }]);
  });

  test("绑定设备候选:排除其它容器成员与容器自身", () => {
    const c = { ...node("c1", "ac-vpp-box", 0, 0), params: { idx: "1" } } as any;
    const other = { ...node("m2", "ac-load", 0, 0), containerId: "c2" } as any;
    const self = { ...c, containerId: "c1" } as any; // 容器自带 containerId 属异常数据,也不得进候选
    expect(containerMemberOptions([c, other, self], "c1")).toEqual([]);
  });

  test("决策应用:容器重算与挤出节点一并产出(漏任一侧都会留下错矩形)", () => {
    const c = node("c1", "ac-vpp-box", 0, 0, 180, 112);
    const m = { ...node("m1", "ac-load", 300, 40), containerId: "c1" };
    const stray = node("stray", "ac-load", 280, 60); // 落在重算后的容器矩形内,无归属
    const dec = enforceContainerMembership([c, m, stray] as any);
    const updates = containerDecisionNodeUpdates([c, m, stray] as any, dec);
    const byId = new Map(updates.map((n) => [n.id, n]));
    const movedContainer = dec.containerUpdates.find((n) => n.id === "c1")!;
    expect(byId.get("c1")!.position).toEqual(movedContainer.position);
    expect(byId.get("c1")!.size).toEqual(movedContainer.size);
    expect(byId.get("stray")!.position).toEqual(dec.patch[0].position);
    expect(byId.get("m1")).toBeUndefined(); // 成员位置不变,不产出更新
  });

  test("改所属容器:写入 containerId + 一并产出容器重算", () => {
    const c = node("c1", "ac-vpp-box", 0, 0, 180, 112);
    const m = node("m1", "ac-load", 300, 40);
    const { changed, updates } = containerMembershipCommit([c, m] as any, "m1", "c1");
    expect(changed).toBe(true);
    const byId = new Map(updates.map((n) => [n.id, n]));
    expect(byId.get("m1")!.containerId).toBe("c1");
    // 容器矩形必须跟着成员重算(只写 containerId 会留下旧框:成员在框外)
    const fitted = byId.get("c1")!;
    expect(centerIn(m.position, rectOf(fitted))).toBe(true);
    expect(fitted.position).not.toEqual(c.position);
  });

  test("移出容器:清掉 containerId 字段(不留 undefined 键)", () => {
    const c = node("c1", "ac-vpp-box", 0, 0, 180, 112);
    const m = { ...node("m1", "ac-load", 300, 40), containerId: "c1" };
    const { changed, updates } = containerMembershipCommit([c, m] as any, "m1", undefined);
    expect(changed).toBe(true);
    const moved = updates.find((n) => n.id === "m1")!;
    expect("containerId" in moved).toBe(false);
    // 容器收缩回最小尺寸(成员已移出)
    expect(updates.find((n) => n.id === "c1")!.size).toEqual({ ...CONTAINER_MIN_SIZE });
  });

  test("面板可见性:两张属性表互斥且各自「所属容器」行结果确定", () => {
    // 容器设备(is_container=1,如电解槽):走容器参数表(branch 1)、且不是 AC 容器 → 行可见
    for (const kind of ["ac-electrolyzer", "dc-fuel-cell"]) {
      const tpl = DEVICE_LIBRARY.find((item) => item.kind === kind)!;
      const node = createDefaultNode(kind as DeviceKind, { x: 0, y: 0 });
      expect(buildContainerDeviceParameterViews(node, tpl).length, `${kind} 未走容器参数表`).toBeGreaterThan(0);
      expect(isAcContainerNode(node), `${kind} 被误判为 AC 容器(行会被隐藏)`).toBe(false);
    }
    // AC 容器:两张表都进不去 branch 1,且行必须隐藏(容器不允许嵌套)
    for (const kind of AC_CONTAINER_KINDS) {
      const tpl = DEVICE_LIBRARY.find((item) => item.kind === kind)!;
      const node = createDefaultNode(kind, { x: 0, y: 0 });
      expect(buildContainerDeviceParameterViews(node, tpl).length, `${kind} 进了容器参数表`).toBe(0);
      expect(isAcContainerNode(node), `${kind} 未被判为 AC 容器`).toBe(true);
    }
  });

  test("归属未变或目标缺失:不产出任何提交", () => {
    const c = node("c1", "ac-vpp-box", 0, 0, 180, 112);
    const m = { ...node("m1", "ac-load", 300, 40), containerId: "c1" };
    expect(containerMembershipCommit([c, m] as any, "m1", "c1").changed).toBe(false);
    expect(containerMembershipCommit([c, m] as any, "nope", "c1").changed).toBe(false);
  });
});
