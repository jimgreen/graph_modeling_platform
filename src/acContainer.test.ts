import { describe, test, expect } from "vitest";
import {
  AC_CONTAINER_COUNTER_KEY,
  AC_CONTAINER_KINDS,
  DEVICE_LIBRARY,
  assignPermanentDeviceIndex,
  buildContainerDeviceParameterViews,
  calculateNodeVisualBounds,
  createDefaultNode,
  deriveDeviceIndexCounters,
  deviceIndexCounterKey,
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
  buildNewContainer,
  defaultContainerName,
  CONTAINER_KIND_LABELS,
  containerKindOptions,
  containerKindSwitch,
  containerMemberIdsFromSelection,
  containerAssignedIdsFromSelection,
  applyAddToAcContainer,
  applyRemoveFromAcContainer,
  containerAddIsNoop,
  containerDragGroup,
  applyDragContainerMembership,
  commitContainerMembership,
  containerDeletionWarning,
  containerDeletionFinalize,
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

  test("挤出豁免:全部线路 kind(不只 ac-line)——否则每次拖动都会把穿过容器的线路推出去", () => {
    const c = node("c1", "ac-vpp-box", 100, 100, 200, 200); // 真实矩形 [0,0]-[200,200]
    // 平台两类线路谓词的全集:WIRE_LIKE_ROUTE_DEVICE_KINDS + ROUTABLE_LINE_DEVICE_KINDS
    const lineKinds = [
      "ac-line", "ac-zero-branch", "dc-line", "dc-zero-branch", "hydrogen-pipeline", "heat-pipeline",
      "ac-routable-line", "ac-zero-routable-branch", "dc-routable-line", "dc-zero-routable-branch",
      "hydrogen-routable-pipeline", "heat-routable-line",
    ];
    const lines = lineKinds.map((kind, index) => node(`ln${index}`, kind, 60, 60));
    expect(ejectOutsiders(c as any, [c, ...lines] as any)).toEqual([]);
    // 对照组:非线路器件仍被挤出(证明豁免只对线路生效,不是整体失效)
    expect(ejectOutsiders(c as any, [c, node("dev", "ac-load", 60, 60)] as any).map((p) => p.nodeId)).toEqual(["dev"]);
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

  test("非成员落进容器矩形内 → 移入(非拖动入口默认口径:粘贴/模板落点/图元库放置/批量布局)", () => {
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

  test("非成员 Alt 落入容器 → 移入(Alt = 双向归属变更键)", () => {
    const moved = { ...outside, position: { x: 60, y: 60 } };
    const r = judgeContainerMembership({ nodes: [c, moved] as any, movedIds: ["out"], altKey: true });
    expect(r.enterContainerId).toBe("c1");
    expect(r.membershipChanges).toEqual([{ nodeId: "out", containerId: "c1" }]);
  });

  test("非成员 Alt 落在容器外 → 不移入也不弹出", () => {
    const moved = { ...outside, position: { x: 500, y: 500 } };
    const r = judgeContainerMembership({ nodes: [c, moved] as any, movedIds: ["out"], altKey: true });
    expect(r.membershipChanges).toEqual([]);
    expect(r.enterContainerId).toBeUndefined();
    expect(r.repelPatches).toEqual([]);
  });

  // 排斥(拖动路径专属):容器与容器外设备互相排斥 —— 非 Alt 拖进来的非成员被弹回框外,不写归属
  test("拖动 + 非 Alt + 非成员落入 → 弹出到最近边外 + padding,归属不变", () => {
    // (60,60) 在 [-100,100]² 内:四边距左 160 / 右 40 / 上 160 / 下 40 → 最近边 = 右(x2=100)
    const moved = { ...outside, position: { x: 60, y: 60 } };
    const r = judgeContainerMembership({ nodes: [c, moved] as any, movedIds: ["out"], altKey: false, repelNonMembers: true });
    expect(r.membershipChanges).toEqual([]);
    expect(r.enterContainerId).toBeUndefined();
    expect(r.repelPatches).toEqual([{ nodeId: "out", position: { x: 100 + CONTAINER_PADDING, y: 60 } }]);
  });

  test("拖动 + 非 Alt + 非成员在框外 → 无弹出(排斥只管框内)", () => {
    const moved = { ...outside, position: { x: 500, y: 500 } };
    const r = judgeContainerMembership({ nodes: [c, moved] as any, movedIds: ["out"], altKey: false, repelNonMembers: true });
    expect(r.repelPatches).toEqual([]);
    expect(r.membershipChanges).toEqual([]);
  });

  test("拖动排斥:静态图元落入 → 不弹出也不入组(与 ejectOutsiders 静态豁免同源)", () => {
    // 装饰图元常是整画布尺寸,弹出等于搬动装饰
    const decoration = node("s1", "static-image", 60, 60, 900, 600);
    const r = judgeContainerMembership({ nodes: [c, decoration] as any, movedIds: ["s1"], altKey: false, repelNonMembers: true });
    expect(r.repelPatches).toEqual([]);
    expect(r.membershipChanges).toEqual([]);
  });

  test("拖动排斥:线路落入 → 不弹出(与 ejectOutsiders 同一线路谓词,线路穿容器是常态)", () => {
    const line = node("l1", "ac-line", 60, 60, 120, 12);
    const r = judgeContainerMembership({ nodes: [c, line] as any, movedIds: ["l1"], altKey: false, repelNonMembers: true });
    expect(r.repelPatches).toEqual([]);
    expect(r.membershipChanges).toEqual([]);
  });

  test("拖动排斥:按真实矩形命中哪个容器就弹哪个", () => {
    const c2 = node("c2", "ac-switch-box", 1000, 0, 200, 200); // 真实矩形 [900,1100]×[-100,100]
    const moved = { ...outside, position: { x: 950, y: 20 } };   // 四边距左 50 最近
    const r = judgeContainerMembership({ nodes: [c, c2, moved] as any, movedIds: ["out"], altKey: false, repelNonMembers: true });
    expect(r.repelPatches).toEqual([{ nodeId: "out", position: { x: 900 - CONTAINER_PADDING, y: 20 } }]);
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

  test("面板改归属到别的容器:原关口容器解绑 + 关关口(与右键同一出口)", () => {
    const c1 = { ...node("c1", "ac-vpp-box", 0, 0, 180, 112), params: { is_gateway: "1", bound_device_id: "m1" } };
    const m1 = { ...node("m1", "ac-load", 300, 40), containerId: "c1" };
    const c2 = node("c2", "ac-vpp-box", 800, 800, 180, 112);
    const { changed, updates } = containerMembershipCommit([c1, m1, c2] as any, "m1", "c2");
    expect(changed).toBe(true);
    const byId = new Map(updates.map((n) => [n.id, n]));
    expect(byId.get("m1")!.containerId).toBe("c2");
    expect(byId.get("c1")!.params.bound_device_id).toBe("");
    expect(byId.get("c1")!.params.is_gateway).toBe("0");
  });

  test("面板清空归属(等于移出):同样解绑 + 关关口", () => {
    const c1 = { ...node("c1", "ac-vpp-box", 0, 0, 180, 112), params: { is_gateway: "1", bound_device_id: "m1" } };
    const m1 = { ...node("m1", "ac-load", 300, 40), containerId: "c1" };
    const { updates } = containerMembershipCommit([c1, m1] as any, "m1", undefined);
    const c1u = updates.find((n) => n.id === "c1")!;
    expect(c1u.params.bound_device_id).toBe("");
    expect(c1u.params.is_gateway).toBe("0");
    expect(c1u.size).toEqual({ ...CONTAINER_MIN_SIZE });
  });

  test("面板改归属:绑定的是别的设备则不误伤", () => {
    const c1 = { ...node("c1", "ac-vpp-box", 0, 0, 180, 112), params: { is_gateway: "1", bound_device_id: "other" } };
    const m1 = { ...node("m1", "ac-load", 300, 40), containerId: "c1" };
    const c2 = node("c2", "ac-vpp-box", 800, 800, 180, 112);
    const { updates } = containerMembershipCommit([c1, m1, c2] as any, "m1", "c2");
    expect(updates.find((n) => n.id === "c1")!.params.bound_device_id).toBe("other");
  });
});

describe("新建容器纯函数", () => {
  test("buildNewContainer:包围成员 + padding,中心锚定,params.idx=nextIdx", () => {
    // 大成员(200×100)避开最小尺寸钳制,验证包围算术:视觉盒 [-100,100]×[-50,50] + padding
    const big = node("big", "ac-load", 0, 0, 200, 100);
    const c = buildNewContainer("ac-vpp-box", "虚拟电厂1", [big] as any, "30");
    expect(c.kind).toBe("ac-vpp-box");
    expect(c.name).toBe("虚拟电厂1");
    expect(c.params.idx).toBe("30");
    expect(c.size).toEqual({ width: 200 + CONTAINER_PADDING * 2, height: 100 + CONTAINER_PADDING * 2 });
    expect(c.position).toEqual({ x: 0, y: 0 });
    // 端到端不变量:容器真实矩形必须包住成员
    const r = rectOf(c as any);
    const b = calculateNodeVisualBounds(big as any);
    expect(b.left).toBeGreaterThanOrEqual(r.x1);
    expect(b.right).toBeLessThanOrEqual(r.x2);
    expect(b.top).toBeGreaterThanOrEqual(r.y1);
    expect(b.bottom).toBeLessThanOrEqual(r.y2);
  });

  test("buildNewContainer:成员过小时钳制到最小尺寸,仍包住成员", () => {
    const m = node("a", "ac-load", 100, 100);
    const c = buildNewContainer("ac-vpp-box", "虚拟电厂1", [m] as any, "30");
    expect(c.size).toEqual({ ...CONTAINER_MIN_SIZE });
    // 钳制后仍以包围矩形左上角取中心(fitContainerToMembers 同一口径)
    const r = containerBoundsForMembers([m])!;
    expect(c.position).toEqual({
      x: r.x + CONTAINER_MIN_SIZE.width / 2,
      y: r.y + CONTAINER_MIN_SIZE.height / 2,
    });
    const rect = rectOf(c as any);
    const b = calculateNodeVisualBounds(m as any);
    expect(b.left).toBeGreaterThanOrEqual(rect.x1);
    expect(b.right).toBeLessThanOrEqual(rect.x2);
    expect(b.top).toBeGreaterThanOrEqual(rect.y1);
    expect(b.bottom).toBeLessThanOrEqual(rect.y2);
  });

  test("defaultContainerName:按类型计数", () => {
    const ex = [node("c1", "ac-vpp-box", 0, 0), node("c2", "ac-vpp-box", 0, 0)];
    expect(defaultContainerName("ac-vpp-box", ex)).toBe("虚拟电厂3");
    expect(defaultContainerName("ac-switch-box", ex)).toBe("开关箱1");
  });

  test("CONTAINER_KIND_LABELS 与内置库 label 同源", () => {
    expect(CONTAINER_KIND_LABELS["ac-distribution-box"]).toBe("配变箱");
  });

  test("containerKindOptions:3 类型选项,label 与图元库同源(弹窗类型下拉单源)", () => {
    expect(containerKindOptions()).toEqual([
      { value: "ac-vpp-box", label: "虚拟电厂" },
      { value: "ac-switch-box", label: "开关箱" },
      { value: "ac-distribution-box", label: "配变箱" },
    ]);
  });

  test("containerKindSwitch:切类型时 kind 与默认名一起换(名称框显示 = 落库默认名)", () => {
    const ex = [node("c1", "ac-vpp-box", 0, 0), node("c2", "ac-vpp-box", 0, 0)];
    expect(containerKindSwitch("ac-switch-box", ex)).toEqual({ kind: "ac-switch-box", name: "开关箱1" });
    // 切回虚拟电厂:名称跟着该类型计数走,不复用切换前的值
    expect(containerKindSwitch("ac-vpp-box", ex)).toEqual({ kind: "ac-vpp-box", name: "虚拟电厂3" });
  });
});

// ─── 右键菜单:谓词(选中口径)与提交应用 ─────────────────────────────────
describe("acContainer 右键菜单", () => {
  test("选中口径:只看普通图元,容器与未知 id 一律忽略", () => {
    const c = node("c1", "ac-vpp-box", 0, 0);
    const a = node("a", "ac-load", 0, 0);
    expect(containerMemberIdsFromSelection([c, a], ["c1"])).toEqual([]);
    expect(containerMemberIdsFromSelection([c, a], ["c1", "a"])).toEqual(["a"]);
    expect(containerMemberIdsFromSelection([c, a], ["nope"])).toEqual([]);
  });

  test("移出候选:只认已归属成员", () => {
    const c = node("c1", "ac-vpp-box", 0, 0);
    const m = { ...node("m1", "ac-load", 0, 0), containerId: "c1" };
    const free = node("f", "ac-load", 500, 0);
    expect(containerAssignedIdsFromSelection([c, m, free], ["c1", "f"])).toEqual([]);
    expect(containerAssignedIdsFromSelection([c, m, free], ["m1", "f"])).toEqual(["m1"]);
  });

  test("加入容器:新容器插末尾、成员打 containerId、容器包住全部成员", () => {
    const a = node("a", "ac-load", 0, 0);
    const b = node("b", "ac-load", 300, 200);
    const c = node("c1", "ac-vpp-box", 0, 0, 180, 112);
    const next = applyAddToAcContainer([a, b] as any, c as any, ["a", "b"]);
    expect(next.map((n) => n.id)).toEqual(["a", "b", "c1"]);
    const byId = new Map(next.map((n) => [n.id, n]));
    expect(byId.get("a")!.containerId).toBe("c1");
    expect(byId.get("b")!.containerId).toBe("c1");
    const r = rectOf(byId.get("c1")!);
    for (const m of [a, b]) {
      const bb = calculateNodeVisualBounds(m as any);
      expect(bb.left).toBeGreaterThanOrEqual(r.x1);
      expect(bb.right).toBeLessThanOrEqual(r.x2);
      expect(bb.top).toBeGreaterThanOrEqual(r.y1);
      expect(bb.bottom).toBeLessThanOrEqual(r.y2);
    }
  });

  test("加入容器:已有容器改归属(不重复插入),原容器收缩", () => {
    const from = node("c0", "ac-vpp-box", 500, 500, 180, 112);
    const m = { ...node("m1", "ac-load", 500, 500), containerId: "c0" };
    const to = node("c1", "ac-vpp-box", 0, 0, 180, 112);
    const next = applyAddToAcContainer([from, m, to] as any, to as any, ["m1"]);
    expect(next.map((n) => n.id)).toEqual(["c0", "m1", "c1"]); // 已存在 → 不插入
    const byId = new Map(next.map((n) => [n.id, n]));
    expect(byId.get("m1")!.containerId).toBe("c1");
    expect(byId.get("c0")!.size).toEqual({ ...CONTAINER_MIN_SIZE }); // 成员走光 → 收缩
    expect(centerIn(m.position, rectOf(byId.get("c1")!))).toBe(true);
  });

  test("加入容器:容器自身不得被打上 containerId(不允许嵌套)", () => {
    const inner = node("c2", "ac-switch-box", 0, 0);
    const outer = node("c1", "ac-vpp-box", 0, 0, 180, 112);
    const next = applyAddToAcContainer([inner, outer] as any, outer as any, ["c1", "c2"]);
    expect("containerId" in next.find((n) => n.id === "c2")!).toBe(false);
    expect("containerId" in next.find((n) => n.id === "c1")!).toBe(false);
  });

  test("移出容器:清 containerId、容器收缩、无关节点不入更新", () => {
    const c = node("c1", "ac-vpp-box", 0, 0, 180, 112);
    const m = { ...node("m1", "ac-load", 300, 40), containerId: "c1" };
    const other = node("o", "ac-load", 900, 900);
    const updates = applyRemoveFromAcContainer([c, m, other] as any, ["m1"]);
    const byId = new Map(updates.map((n) => [n.id, n]));
    expect("containerId" in byId.get("m1")!).toBe(false);
    expect(byId.get("c1")!.size).toEqual({ ...CONTAINER_MIN_SIZE });
    expect(byId.has("o")).toBe(false);
  });

  test("移出容器:被移出设备是某关口容器的绑定设备 → 解绑 + 关关口", () => {
    const c = { ...node("c1", "ac-vpp-box", 0, 0, 180, 112), params: { is_gateway: "1", bound_device_id: "m1" } };
    const m = { ...node("m1", "ac-load", 300, 40), containerId: "c1" };
    const updates = applyRemoveFromAcContainer([c, m] as any, ["m1"]);
    const gw = updates.find((n) => n.id === "c1")!;
    expect(gw.params.bound_device_id).toBe("");
    expect(gw.params.is_gateway).toBe("0");
    expect("containerId" in updates.find((n) => n.id === "m1")!).toBe(false);
  });

  test("移出容器:绑定的是别的设备则原样保留(不误伤)", () => {
    const c = { ...node("c1", "ac-vpp-box", 0, 0, 180, 112), params: { is_gateway: "1", bound_device_id: "keep" } };
    const m = { ...node("m1", "ac-load", 300, 40), containerId: "c1" };
    const updates = applyRemoveFromAcContainer([c, m] as any, ["m1"]);
    expect(updates.find((n) => n.id === "c1")!.params.bound_device_id).toBe("keep");
  });

  test("改归属到别的容器:原关口容器解绑 + 关关口(与移出同一规则)", () => {
    const c1 = { ...node("c1", "ac-vpp-box", 0, 0, 180, 112), params: { is_gateway: "1", bound_device_id: "m1" } };
    const m1 = { ...node("m1", "ac-load", 0, 0), containerId: "c1" };
    const c2 = node("c2", "ac-vpp-box", 400, 400, 180, 112);
    const next = applyAddToAcContainer([c1, m1, c2] as any, c2 as any, ["m1"]);
    const byId = new Map(next.map((n) => [n.id, n]));
    expect(byId.get("m1")!.containerId).toBe("c2");
    expect(byId.get("c1")!.params.bound_device_id).toBe("");
    expect(byId.get("c1")!.params.is_gateway).toBe("0");
    expect(byId.get("c1")!.size).toEqual({ ...CONTAINER_MIN_SIZE }); // 成员走光 → 收缩
  });

  test("改归属:绑定的是别的设备则不误伤", () => {
    const c1 = { ...node("c1", "ac-vpp-box", 0, 0, 180, 112), params: { is_gateway: "1", bound_device_id: "other" } };
    const m1 = { ...node("m1", "ac-load", 0, 0), containerId: "c1" };
    const c2 = node("c2", "ac-vpp-box", 400, 400, 180, 112);
    const next = applyAddToAcContainer([c1, m1, c2] as any, c2 as any, ["m1"]);
    expect(new Map(next.map((n) => [n.id, n])).get("c1")!.params.bound_device_id).toBe("other");
  });

  test("改归属:目标容器自己的绑定设备留在原容器 → 不解绑", () => {
    const c1 = { ...node("c1", "ac-vpp-box", 0, 0, 180, 112), params: { is_gateway: "1", bound_device_id: "m2" } };
    const m1 = { ...node("m1", "ac-load", 0, 0), containerId: "c1" };
    const m2 = { ...node("m2", "ac-load", 60, 0), containerId: "c1" };
    const c2 = { ...node("c2", "ac-vpp-box", 400, 400, 180, 112), params: { is_gateway: "1", bound_device_id: "m1" } };
    const next = applyAddToAcContainer([c1, m1, m2, c2] as any, c2 as any, ["m1"]);
    const byId = new Map(next.map((n) => [n.id, n]));
    expect(byId.get("c2")!.params.bound_device_id).toBe("m1"); // 目标容器未失去其绑定设备
    expect(byId.get("c1")!.params.bound_device_id).toBe("m2"); // c1 丢的是 m1,c1 绑的是 m2 → 不解绑
  });

  test("no-op 短路:成员全在目标容器内则无需提交", () => {
    const c1 = node("c1", "ac-vpp-box", 0, 0, 180, 112);
    const m1 = { ...node("m1", "ac-load", 0, 0), containerId: "c1" };
    const m2 = node("m2", "ac-load", 40, 0);
    expect(containerAddIsNoop([c1, m1, m2] as any, "c1", ["m1"])).toBe(true);
    expect(containerAddIsNoop([c1, m1, m2] as any, "c1", ["m1", "m2"])).toBe(false);
    expect(containerAddIsNoop([c1, m1] as any, "c-new", ["m1"])).toBe(false); // 新容器必非 no-op
  });
});

// ─── 容器 idx 分配:走固定分段计数器(plan Task 10 的 E 导出 idx 列依赖它) ──────
describe("容器 idx 分配", () => {
  test("deviceIndexCounterKey:容器归入 ac_container 段(否则前面各分支都返回空串)", () => {
    for (const kind of AC_CONTAINER_KINDS) {
      expect(deviceIndexCounterKey(createDefaultNode(kind, { x: 0, y: 0 }))).toBe(AC_CONTAINER_COUNTER_KEY);
    }
  });

  test("新建容器经 assignPermanentDeviceIndex 拿到真实 idx,且同段递增", () => {
    const m = node("m1", "ac-load", 0, 0);
    const first = assignPermanentDeviceIndex(buildNewContainer("ac-vpp-box", "虚拟电厂1", [m] as any, ""), {});
    expect(first.node.params.idx).toBe("1");
    expect(first.counters[AC_CONTAINER_COUNTER_KEY]).toBe(1);
    const second = assignPermanentDeviceIndex(buildNewContainer("ac-switch-box", "开关箱1", [m] as any, ""), first.counters);
    expect(second.node.params.idx).toBe("2");
  });

  test("已有容器带 idx 时计数器跟随(不与存量撞号)", () => {
    const existing = { ...node("c9", "ac-vpp-box", 0, 0), params: { idx: "7" } };
    const m = node("m1", "ac-load", 0, 0);
    const counters = deriveDeviceIndexCounters([existing as any]);
    const created = assignPermanentDeviceIndex(buildNewContainer("ac-vpp-box", "虚拟电厂1", [m] as any, ""), counters);
    expect(created.node.params.idx).toBe("8");
  });
});

// ─── 拖动整组:拖容器 = 容器 + 全部成员一起移动 ─────────────────────────────
describe("拖容器整组", () => {
  test("拖容器 → 容器与全部成员一起移动", () => {
    const c = node("c1", "ac-vpp-box", 0, 0) as any;
    const m1 = { ...node("m1", "ac-load", 10, 10), containerId: "c1" } as any;
    const m2 = { ...node("m2", "ac-load", 20, 20), containerId: "c1" } as any;
    const other = node("o", "ac-load", 90, 90) as any;
    expect(containerDragGroup([c, m1, m2, other], ["c1"]).sort()).toEqual(["c1", "m1", "m2"]);
    expect(containerDragGroup([c, m1, m2, other], ["o"])).toEqual(["o"]);
  });

  test("空容器/无容器:原样返回;跟随成员不重复入列", () => {
    const c = node("c1", "ac-vpp-box", 0, 0) as any;
    const m1 = { ...node("m1", "ac-load", 10, 10), containerId: "c1" } as any;
    const other = node("o", "ac-load", 90, 90) as any;
    expect(containerDragGroup([c, other], ["c1"])).toEqual(["c1"]);
    expect(containerDragGroup([c, other], ["c1", "other"])).toEqual(["c1", "other"]);
    // 多选容器 + 其成员同时拖动:成员已在集合内,不重复
    expect(containerDragGroup([c, m1], ["c1", "m1"]).sort()).toEqual(["c1", "m1"]);
  });

  test("别的容器的成员不被卷入", () => {
    const c1 = node("c1", "ac-vpp-box", 0, 0) as any;
    const c2 = node("c2", "ac-vpp-box", 500, 0) as any;
    const m2 = { ...node("m2", "ac-load", 500, 0), containerId: "c2" } as any;
    expect(containerDragGroup([c1, c2, m2], ["c1"])).toEqual(["c1"]);
  });
});

// ─── 拖动结束归属落地(判定 → 写/清 containerId → 解绑 → 容器重算 + 挤出) ──────
describe("拖动结束归属落地", () => {
  // c1 中心 (0,0) 尺寸 200×200 → 真实矩形 [-100,100]²;m1 中心 (50,50) 在其内
  const container = () => node("c1", "ac-vpp-box", 0, 0, 200, 200) as any;
  const member = (x = 50, y = 50) => ({ ...node("m1", "ac-load", x, y), containerId: "c1" } as any);
  const byIdOf = (updates: any[]) => new Map(updates.map((n) => [n.id, n]));

  test("成员非 Alt 拖动 → 容器跟随重算(扩展跟随),归属不变", () => {
    const nodes = [container(), member(300, 300)]; // 拖动后位置
    const { updates } = applyDragContainerMembership({ nodes, movedIds: ["m1"], altKey: false, repelNonMembers: true });
    const c1 = byIdOf(updates).get("c1")!;
    expect(c1.size).toEqual({ ...CONTAINER_MIN_SIZE });
    expect(centerIn({ x: 300, y: 300 }, rectOf(c1))).toBe(true); // 容器已包住成员
    expect(updates.some((u) => u.id === "m1" && !u.containerId)).toBe(false);
  });

  test("成员 Alt 拖动 → 移出 + 容器收缩回最小尺寸", () => {
    const nodes = [container(), member(300, 300)];
    const { updates } = applyDragContainerMembership({ nodes, movedIds: ["m1"], altKey: true, repelNonMembers: true });
    const byId = byIdOf(updates);
    expect(byId.get("m1")!.containerId).toBeUndefined();
    expect(byId.get("c1")!.size).toEqual({ ...CONTAINER_MIN_SIZE });
  });

  test("Alt 移出且成员正是关口绑定设备 → 一并解绑 + 关关口(与其它入口同源)", () => {
    const c1 = { ...container(), params: { is_gateway: "1", bound_device_id: "m1" } };
    const { updates } = applyDragContainerMembership({ nodes: [c1, member(300, 300)], movedIds: ["m1"], altKey: true, repelNonMembers: true });
    const unbound = byIdOf(updates).get("c1")!;
    expect(unbound.params.bound_device_id).toBe("");
    expect(unbound.params.is_gateway).toBe("0");
  });

  test("Alt 拖入:非成员落入容器 → 写入归属并回报目标容器(供 toast)", () => {
    const outsider = node("o", "ac-load", 60, 60);
    const { updates, enterContainerId } = applyDragContainerMembership({
      nodes: [container(), outsider], movedIds: ["o"], altKey: true, repelNonMembers: true,
    });
    expect(enterContainerId).toBe("c1");
    expect(byIdOf(updates).get("o")!.containerId).toBe("c1");
  });

  test("非 Alt 拖入:容器与容器外设备互相排斥 —— 弹回框外、不写归属、不回报 enter", () => {
    const outsider = node("o", "ac-load", 60, 60); // 容器矩形 [-100,100]²,最近边 = 右
    const { updates, enterContainerId } = applyDragContainerMembership({
      nodes: [container(), outsider], movedIds: ["o"], altKey: false, repelNonMembers: true,
    });
    expect(enterContainerId).toBeUndefined();
    const byId = byIdOf(updates);
    expect(byId.get("o")!.containerId).toBeUndefined();
    expect(byId.get("o")!.position).toEqual({ x: 100 + CONTAINER_PADDING, y: 60 }); // 弹出到最近边外
    expect(centerIn(byId.get("o")!.position, rectOf(byId.get("c1")!))).toBe(false); // 与重算后的容器不变量一致
  });

  test("拖容器 + Alt:跟随扩组的成员不参与判定,整组不被拆散", () => {
    // 容器与成员同步平移 +300(拖动起点已按 containerDragGroup 扩组);实际抓住的只有容器
    const nodes = [node("c1", "ac-vpp-box", 300, 300, 200, 200) as any, member(350, 350)];
    const { updates } = applyDragContainerMembership({
      nodes, movedIds: ["c1", "m1"], grabbedIds: ["c1"], altKey: true, repelNonMembers: true,
    });
    expect(updates.some((u) => u.id === "m1" && !u.containerId)).toBe(false);
  });

  test("容器与成员同被选中 + Alt 拖成员 → 该成员移出(以抓取集为准,不因容器同动而豁免)", () => {
    const nodes = [node("c1", "ac-vpp-box", 300, 300, 200, 200) as any, member(350, 350)];
    const { updates } = applyDragContainerMembership({
      nodes, movedIds: ["c1", "m1"], grabbedIds: ["c1", "m1"], altKey: true, repelNonMembers: true,
    });
    expect(byIdOf(updates).get("m1")!.containerId).toBeUndefined();
  });

  test("图中无容器 → 无任何更新", () => {
    const a = node("a", "ac-load", 0, 0);
    const b = node("b", "ac-load", 80, 0);
    const { updates } = applyDragContainerMembership({ nodes: [a, b], movedIds: ["a"], altKey: false, repelNonMembers: true });
    expect(updates).toEqual([]);
  });
});

// ─── 新增/移动节点并入图后的归属落地出口(粘贴/模板落点/程序化加图元/SVG 导入共用) ──
describe("静态图元与线路的挤出/归属口径", () => {
  test("挤出豁免:静态图元不被推出容器矩形(位置不变),普通设备仍被挤出", () => {
    const c = node("c1", "ac-vpp-box", 0, 0, 200, 200) as any;
    // 静态辅助图元是整画布尺寸的装饰(position = 画布中心),容器矩形必然盖住它的中心
    const decoration = node("s1", "static-image", 0, 0, 900, 600) as any;
    expect(ejectOutsiders(c, [c, decoration])).toEqual([]);
    // 对照组:同位置的普通设备照常挤出(豁免是静态图元专属,不是整体失效)
    const device = node("d1", "ac-load", 0, 0) as any;
    expect(ejectOutsiders(c, [c, device])).toHaveLength(1);
  });

  test("位置断言:容器矩形盖住画布中心时,静态装饰节点不被 enforce 改写", () => {
    const c = node("c1", "ac-vpp-box", 0, 0, 200, 200) as any;
    const decoration = node("s1", "static-image", 0, 0, 900, 600) as any;
    const nodes = [c, decoration];
    const updates = containerDecisionNodeUpdates(nodes, enforceContainerMembership(nodes));
    expect(updates.some((u) => u.id === "s1")).toBe(false);
    expect(decoration.position).toEqual({ x: 0, y: 0 });
  });

  test("判定侧豁免:静态装饰中心落入容器矩形 → 不入组也不弹出,容器矩形不被撑大", () => {
    const c = node("c1", "ac-vpp-box", 0, 0, 200, 200) as any;
    const decoration = node("s1", "static-image", 0, 0, 900, 600) as any;
    const { updates, enterContainerId } = applyDragContainerMembership({ nodes: [c, decoration], movedIds: ["s1"], altKey: false, repelNonMembers: true });
    expect(enterContainerId).toBeUndefined();
    expect(updates.some((u) => u.id === "s1")).toBe(false); // 既不写归属也不弹出(位置不变)
    // 容器收缩到最小尺寸(无成员),而不是被撑到包住 900×600 的装饰
    expect(updates.find((u) => u.id === "c1")!.size).toEqual({ ...CONTAINER_MIN_SIZE });
    // 对照组:同位置的普通设备 Alt 拖动仍入组(豁免是静态图元专属)
    const device = node("d1", "ac-load", 0, 0) as any;
    const withDevice = applyDragContainerMembership({ nodes: [c, device], movedIds: ["d1"], altKey: true, repelNonMembers: true });
    expect(withDevice.updates.find((u) => u.id === "d1")!.containerId).toBe("c1");
  });

  test("已是成员的静态图元仍可 Alt 拖出(豁免只管自动入组,不管用户显式移出)", () => {
    const c = node("c1", "ac-vpp-box", 0, 0, 200, 200) as any;
    const decoration = { ...node("s1", "static-image", 50, 50, 120, 80), containerId: "c1" } as any;
    const { updates } = applyDragContainerMembership({ nodes: [c, decoration], movedIds: ["s1"], altKey: true });
    expect(updates.find((u) => u.id === "s1")!.containerId).toBeUndefined();
  });

  test("线路可入组(口径):Alt 拖入写入 containerId,容器包围盒随之含线路", () => {
    const c = node("c1", "ac-vpp-box", 0, 0, 200, 200) as any;
    const line = node("l1", "ac-line", 50, 50, 120, 12) as any;
    const { updates } = applyDragContainerMembership({ nodes: [c, line], movedIds: ["l1"], altKey: true, repelNonMembers: true });
    const byId = new Map(updates.map((n) => [n.id, n]));
    expect(byId.get("l1")!.containerId).toBe("c1");
    const bounds = calculateNodeVisualBounds(line);
    const r = rectOf(byId.get("c1")!);
    expect(r.x1).toBeLessThanOrEqual(bounds.left);
    expect(r.y1).toBeLessThanOrEqual(bounds.top);
    expect(r.x2).toBeGreaterThanOrEqual(bounds.right);
    expect(r.y2).toBeGreaterThanOrEqual(bounds.bottom);
  });
});

// ─── 删除容器收尾:成员归属不悬空(成员保留,containerId 全清) ────────────────
// spec「其它交互边界」:删除容器 → 成员 containerId 全清(成员保留),确认框提示「N 个成员将散出」。
// 悬空值(指向已不存在容器)会随保存持久化,并让成员后续入组被静默短路(见下个 describe)。
describe("删除容器的归属收尾", () => {
  const container = (name = "虚拟电厂1") => ({ ...node("c1", "ac-vpp-box", 0, 0, 200, 200), name } as any);
  const member = (id: string, containerId = "c1") => ({ ...node(id, "ac-load", 50, 50), containerId } as any);

  test("删除集内有成员的容器 → 确认文案含容器名与散出成员数", () => {
    const text = containerDeletionWarning([container(), member("m1"), member("m2")], ["c1"])!;
    expect(text).toContain("虚拟电厂1");
    expect(text).toContain("2 个成员");
  });

  test("空容器 / 成员同批删除 / 未删容器 → 无需确认(返回 null)", () => {
    const nodes = [container(), member("m1")];
    expect(containerDeletionWarning([container()], ["c1"])).toBeNull();
    expect(containerDeletionWarning(nodes, ["c1", "m1"])).toBeNull(); // 成员同批删,不散出
    expect(containerDeletionWarning(nodes, ["m1"])).toBeNull();
  });

  test("多个有成员的容器 → 逐一列出", () => {
    const c2 = { ...node("c2", "ac-vpp-box", 500, 0, 200, 200), name: "虚拟电厂2" } as any;
    const nodes = [container(), c2, member("m1"), { ...node("m2", "ac-load", 500, 0), containerId: "c2" } as any];
    const text = containerDeletionWarning(nodes, ["c1", "c2"])!;
    expect(text).toContain("虚拟电厂1");
    expect(text).toContain("虚拟电厂2");
  });

  test("收尾:被删容器的成员清 containerId(只清归属,几何不动);无关节点不产出更新", () => {
    const member1 = member("m1");
    const updates = containerDeletionFinalize([container(), member1, node("o", "ac-load", 900, 900)], ["c1"]);
    expect(updates.map((n) => n.id)).toEqual(["m1"]);
    expect(updates[0].containerId).toBeUndefined();
    expect(updates[0].position).toEqual(member1.position);
  });

  test("收尾:删除集不含容器 / 成员归属的是存活容器 → 无更新", () => {
    expect(containerDeletionFinalize([container(), member("m1")], ["m1"])).toEqual([]);
    const c2 = { ...node("c2", "ac-vpp-box", 500, 0, 200, 200), name: "c2" } as any;
    const alive = { ...node("m1", "ac-load", 500, 0), containerId: "c2" } as any;
    expect(containerDeletionFinalize([container(), c2, alive], ["c1"])).toEqual([]);
  });
});

// ─── 悬空归属:containerId 指向已不存在的容器 → 视为无归属(不再静默失效) ──────
// 老数据/异常路径残留的悬空值:判定若只判真值,成员再拖进别的容器会被短路 → 归属静默失效。
describe("悬空归属(容器已删除)", () => {
  const container = () => node("c1", "ac-vpp-box", 0, 0, 200, 200) as any;

  test("判定侧:悬空归属的节点可正常移入存活容器(Alt 拖入)", () => {
    const orphan = { ...node("o", "ac-load", 60, 60), containerId: "gone" } as any;
    const { updates, enterContainerId } = applyDragContainerMembership({
      nodes: [container(), orphan], movedIds: ["o"], altKey: true, repelNonMembers: true,
    });
    expect(enterContainerId).toBe("c1");
    expect(updates.find((n) => n.id === "o")!.containerId).toBe("c1");
  });

  test("判定侧:悬空归属不豁免排斥 —— 非 Alt 拖入照常弹出(悬空≠成员)", () => {
    const orphan = { ...node("o", "ac-load", 60, 60), containerId: "gone" } as any;
    const { updates } = applyDragContainerMembership({
      nodes: [container(), orphan], movedIds: ["o"], altKey: false, repelNonMembers: true,
    });
    expect(updates.find((n) => n.id === "o")!.position).toEqual({ x: 100 + CONTAINER_PADDING, y: 60 });
  });

  test("判定侧:悬空归属 Alt 拖动不算「移出」(无 exitContainerId),且不改写归属", () => {
    const orphan = { ...node("o", "ac-load", 900, 900), containerId: "gone" } as any;
    const { updates, exitContainerId } = applyDragContainerMembership({
      nodes: [container(), orphan], movedIds: ["o"], altKey: true, repelNonMembers: true,
    });
    expect(exitContainerId).toBeUndefined();
    expect(updates.some((n) => n.id === "o")).toBe(false);
  });

  test("挤出侧:悬空归属不豁免挤出(容器矩形盖住其中心即被推出)", () => {
    const orphan = { ...node("o", "ac-load", 0, 0), containerId: "gone" } as any;
    const nodes = [container(), orphan];
    const updates = containerDecisionNodeUpdates(nodes, enforceContainerMembership(nodes));
    const moved = updates.find((n) => n.id === "o");
    expect(moved).toBeTruthy();                        // 旧口径:真值豁免 → 该节点不产出任何更新
    expect(moved!.position).not.toEqual(orphan.position);
  });
});

// ─── Alt 移出回报原容器(供 toast:与「已移入容器」对称) ─────────────────────
describe("Alt 移出回报原容器", () => {
  const container = () => node("c1", "ac-vpp-box", 0, 0, 200, 200) as any;
  const member = (x: number, y: number) => ({ ...node("m1", "ac-load", x, y), containerId: "c1" } as any);

  test("Alt 拖出成员 → exitContainerId = 原容器 id", () => {
    const { exitContainerId } = applyDragContainerMembership({
      nodes: [container(), member(300, 300)], movedIds: ["m1"], altKey: true,
    });
    expect(exitContainerId).toBe("c1");
  });

  test("非 Alt 拖动成员 / 拖入新成员(Alt 或非 Alt)→ 无 exitContainerId", () => {
    const kept = applyDragContainerMembership({ nodes: [container(), member(60, 60)], movedIds: ["m1"], altKey: false, repelNonMembers: true });
    expect(kept.exitContainerId).toBeUndefined();
    const entered = applyDragContainerMembership({
      nodes: [container(), node("o", "ac-load", 60, 60)], movedIds: ["o"], altKey: true, repelNonMembers: true,
    });
    expect(entered.exitContainerId).toBeUndefined();
    const repelled = applyDragContainerMembership({
      nodes: [container(), node("o", "ac-load", 60, 60)], movedIds: ["o"], altKey: false, repelNonMembers: true,
    });
    expect(repelled.exitContainerId).toBeUndefined();
  });
});

describe("归属落地出口 commitContainerMembership", () => {
  test("落点在容器内的新节点 → 成为成员,返回完整节点数组且原图不被改写", () => {
    const c1 = node("c1", "ac-vpp-box", 0, 0, 200, 200) as any;
    const pasted = node("p1", "ac-load", 50, 50) as any;
    const nodes = [c1, pasted];
    const next = commitContainerMembership(nodes, ["p1"]);
    expect(next.map((n) => n.id)).toEqual(["c1", "p1"]);
    expect(next.find((n) => n.id === "p1")!.containerId).toBe("c1");
    expect(next.find((n) => n.id === "c1")!.size).toEqual({ ...CONTAINER_MIN_SIZE });
    expect(pasted.containerId).toBeUndefined(); // 入参图保持原样
  });

  test("落点在容器外的节点不写归属;无容器时返回原引用(短路)", () => {
    const c1 = node("c1", "ac-vpp-box", 0, 0, 200, 200) as any;
    const outside = node("p1", "ac-load", 900, 900) as any;
    const next = commitContainerMembership([c1, outside], ["p1"]);
    expect(next.find((n) => n.id === "p1")!.containerId).toBeUndefined();
    const plain = [node("a", "ac-load", 0, 0) as any];
    expect(commitContainerMembership(plain, ["a"])).toBe(plain);
  });
});
