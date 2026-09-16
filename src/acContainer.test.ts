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
  CONTAINER_CLEARANCE,
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
  containerNameOptions,
  containerNamePick,
  containerNameSearch,
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
  refitContainersAfterTransform,
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
// 包围盒间距口径:任一轴分离则间隙 = 该轴间距(正);两轴皆重叠时为负(最大穿透轴的负值)
const boundsGap = (b: { left: number; right: number; top: number; bottom: number }, r: ReturnType<typeof rectOf>) =>
  Math.max(Math.max(r.x1 - b.right, b.left - r.x2), Math.max(r.y1 - b.bottom, b.top - r.y2));
/** 按 patch 位移后的节点(用于断言推出后的包围盒) */
const shifted = (n: any, p: { position: { x: number; y: number } }) => ({ ...n, position: p.position });

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

  test("挤出:容器内非成员被推到界外且间隙 = 排斥带 50,线路豁免", () => {
    const c = node("c1", "ac-vpp-box", 100, 100, 200, 200); // 真实矩形 [0,0]-[200,200]
    const insider = { ...node("in", "ac-load", 50, 50), containerId: "c1" };
    const outsider = node("out", "ac-load", 60, 60);
    const line = node("ln", "ac-line", 70, 70);
    const patches = ejectOutsiders(c as any, [c, insider, outsider, line] as any);
    expect(patches.map((p) => p.nodeId)).toEqual(["out"]); // 成员/线路不产出更新
    // 推出后:中心在矩形外,且本体整体在框外、间隙恰为 CONTAINER_CLEARANCE(包围盒口径)
    const p = patches[0];
    expect(centerIn(p.position, rectOf(c))).toBe(false);
    expect(p.position).toEqual({ x: 60, y: -65 }); // 上移 125 < 左移 130 → 最近边 = 上
    const b = calculateNodeVisualBounds(shifted(outsider, p) as any);
    expect(b.bottom).toBeLessThanOrEqual(rectOf(c).y1);
    expect(boundsGap(b, rectOf(c))).toBe(CONTAINER_CLEARANCE);
  });

  // ─── 挤出判定口径:包围盒间距 < CONTAINER_CLEARANCE 即挪开(不再按中心点入框) ──────
  // 旧口径两个症状:①中心入框才触发(设备被盖一半才挤);②推出量按中心算(本体仍压框)。
  // 排斥带(50)比内侧留白(CONTAINER_PADDING=24)宽:容器拟合出的 24 间距不再自动免疫。
  test("挤出:与容器间隙 20(< 50)→ 推到间隙 = 50,方向 = 最近边", () => {
    const c = node("c1", "ac-vpp-box", 0, 0, 200, 200); // 真实矩形 [-100,100]²
    const near = node("near", "ac-load", 140, 0);        // 本体 [120,160]:中心在框外,间隙 20
    const patches = ejectOutsiders(c as any, [c, near] as any);
    expect(patches).toHaveLength(1);
    expect(patches[0].position).toEqual({ x: 170, y: 0 }); // 右边:100 + 50 + 半宽 20
    expect(boundsGap(calculateNodeVisualBounds(shifted(near, patches[0]) as any), rectOf(c))).toBe(CONTAINER_CLEARANCE);
  });

  test("挤出边界:间隙 130(≥ 50)→ 不动", () => {
    const c = node("c1", "ac-vpp-box", 0, 0, 200, 200);
    const far = node("far", "ac-load", 250, 0); // 本体 [230,270]:间隙 130
    expect(ejectOutsiders(c as any, [c, far] as any)).toEqual([]);
  });

  test("挤出边界:间隙恰为 50 → 不动(排斥带边界,不得把带外邻居无谓推走)", () => {
    const m = { ...node("m1", "ac-load", 0, 0, 200, 100), containerId: "c1" };
    const fitted = fitContainerToMembers(node("c1", "ac-vpp-box", 0, 0, 200, 200) as any, [m] as any);
    // 拟合矩形下边 = 74(内侧留白 24);邻居本体上边 = 124 → 间隙恰 50
    const neighbor = node("nb", "ac-load", 0, 74 + CONTAINER_CLEARANCE + 15);
    expect(ejectOutsiders(fitted as any, [fitted, m, neighbor] as any)).toEqual([]);
  });

  // 本轮语义拆分(用户参数改动):内侧留白(容器贴成员的紧密度)与外侧排斥带(让位半径)本是两个概念,
  // 曾共用 CONTAINER_PADDING=24。拆开后拟合出的 24 间距不再自动免疫 —— 落在排斥带内照常被推开。
  test("契约:内侧留白 24 与排斥带 50 是两个值 —— 拟合出的 24 间距不再免疫,带内邻居被推到 50", () => {
    expect(CONTAINER_CLEARANCE).toBeGreaterThan(CONTAINER_PADDING);
    const m = { ...node("m1", "ac-load", 0, 0, 200, 100), containerId: "c1" };
    const fitted = fitContainerToMembers(node("c1", "ac-vpp-box", 0, 0, 200, 200) as any, [m] as any);
    // 容器矩形到成员本体右边恰 CONTAINER_PADDING(内侧留白不受排斥带影响)
    expect(rectOf(fitted).x2 - calculateNodeVisualBounds(m).right).toBe(CONTAINER_PADDING);
    // 邻居贴到成员本体同一 24 间距 → 在排斥带内 → 推到间隙 = CONTAINER_CLEARANCE
    const neighbor = node("nb", "ac-load", 0, 74 + CONTAINER_PADDING + 15);
    const patch = ejectOutsiders(fitted as any, [fitted, m, neighbor] as any)[0];
    expect(patch.position).toEqual({ x: 0, y: 139 }); // 下移 26
    expect(boundsGap(calculateNodeVisualBounds(shifted(neighbor, patch) as any), rectOf(fitted))).toBe(CONTAINER_CLEARANCE);
  });

  test("挤出:相交(覆盖一半)→ 推到间隙 = 50(不再只推中心)", () => {
    const c = node("c1", "ac-vpp-box", 0, 0, 200, 200);
    const half = node("half", "ac-load", 90, 0); // 本体 [70,110]:压住右边界 10
    const patch = ejectOutsiders(c as any, [c, half] as any)[0];
    // 旧口径把中心推到 100 + 24 = 124,本体 [104,144] 仍压框 44 → 新口径推到 170
    expect(patch.position).toEqual({ x: 170, y: 0 });
    expect(boundsGap(calculateNodeVisualBounds(shifted(half, patch) as any), rectOf(c))).toBe(CONTAINER_CLEARANCE);
  });

  test("回归钉子:宽 > 48 的大设备推出后本体不再压框(旧口径「只挤一半」)", () => {
    const c = node("c1", "ac-vpp-box", 0, 0, 200, 200);
    const wide = node("wide", "ac-load", 130, 0, 100, 30); // 本体 [80,180]:与右边相交 80,中心 (130,0) 在框外
    const patch = ejectOutsiders(c as any, [c, wide] as any)[0];
    expect(patch.position).toEqual({ x: 200, y: 0 }); // 100 + 50 + 半宽 50
    const b = calculateNodeVisualBounds(shifted(wide, patch) as any);
    // 本体整体出框(旧中心口径下本例中心在框外 → 干脆不推,本体 80px 一直压在框上;
    // 「只挤一半」见上一条:中心在框内时旧口径只把中心推到 124,本体 [104,144] 仍压框 44)
    expect(b.left).toBeGreaterThanOrEqual(rectOf(c).x2);
    expect(boundsGap(b, rectOf(c))).toBe(CONTAINER_CLEARANCE);
  });

  // 触发距离按**视觉包围盒(含标签)**算,与 containerBoundsForMembers 同源 —— 不是裸 size:
  // 标签在节点下方展开时,含标签外沿先进入排斥带,设备就该被推开。
  test("挤出按含标签包围盒判定:裸本体间距 ≥ 50 但标签越线 → 推,推出后含标签间隙 = 50", () => {
    const c = node("c1", "ac-vpp-box", 0, 0, 200, 200); // 真实矩形 [-100,100]²
    // 设备在本体上方:裸本体下边 = -155 → 与矩形上边间隙 55(≥ 50,单纯按 size 算不挪)
    const bare = node("bare", "ac-load", 0, -170);
    const labeled = { ...node("labeled", "ac-load", 0, -170), params: { _labelVisible: "1" } }; // 非 "0" 即显示
    const bareBounds = calculateNodeVisualBounds(bare);
    const labeledBounds = calculateNodeVisualBounds(labeled);
    expect(labeledBounds.bottom).toBeGreaterThan(bareBounds.bottom); // 标签在下方展开 → 含标签下沿更低
    expect(boundsGap(bareBounds, rectOf(c))).toBeGreaterThanOrEqual(CONTAINER_CLEARANCE);
    expect(boundsGap(labeledBounds, rectOf(c))).toBeLessThan(CONTAINER_CLEARANCE); // 含标签才越线
    // 对照:同一几何、仅隐去标签 → 不推(证伪「按裸 size 算」的误读)
    expect(ejectOutsiders(c as any, [c, bare] as any)).toEqual([]);
    // 含标签 → 推:仍沿最近边(上)让位,推出后**含标签**包围盒间隙 = 50
    const patches = ejectOutsiders(c as any, [c, labeled] as any);
    expect(patches).toHaveLength(1);
    expect(patches[0].position.x).toBe(0);
    expect(patches[0].position.y).toBeLessThan(-170);
    const after = calculateNodeVisualBounds(shifted(labeled, patches[0]) as any);
    expect(after.bottom).toBeLessThan(rectOf(c).y1); // 标签下沿整体让到框外
    expect(boundsGap(after, rectOf(c))).toBe(CONTAINER_CLEARANCE); // 50 量的是**含标签**包围盒
    // 而非裸 size 的 50:同一新位置、仅隐去标签 → 裸本体让得更远(多让出一个标签高度),证伪「按裸 size 结算」的误读
    const bareAfter = calculateNodeVisualBounds(shifted({ ...labeled, params: { _labelVisible: "0" } }, patches[0]) as any);
    expect(boundsGap(bareAfter, rectOf(c))).toBeGreaterThan(CONTAINER_CLEARANCE);
  });

  test("enforce:存量图里贴着容器的未归属设备,下一次 enforce 被推到间隙 50(新的间距不变量)", () => {
    const m = { ...node("m1", "ac-load", 0, 0, 200, 100), containerId: "c1" };
    const fitted = fitContainerToMembers(node("c1", "ac-vpp-box", 0, 0, 200, 200) as any, [m] as any);
    // 拟合矩形 [-124,124]×[-74,74];邻居本体上边 = 94 → 下边间隙 20(中心在框外,旧口径不挪)
    const near = node("near", "ac-load", 0, 74 + 15 + 20);
    const dec = enforceContainerMembership([fitted, m, near] as any);
    expect(dec.patch.map((p) => p.nodeId)).toEqual(["near"]);
    expect(dec.patch[0].position).toEqual({ x: 0, y: 139 }); // 下移 30 → 间隙 = 50
    expect(boundsGap(calculateNodeVisualBounds(shifted(near, dec.patch[0]) as any), rectOf(fitted))).toBe(CONTAINER_CLEARANCE);
  });

  test("挤出豁免:已归属存活容器的设备不被推(即使与另一容器间隙不足)", () => {
    const c = node("c1", "ac-vpp-box", 0, 0, 200, 200);
    const c2 = node("c2", "ac-switch-box", 900, 0, 180, 112);
    const owned = { ...node("o", "ac-load", 140, 0), containerId: "c2" }; // 间隙 20 但归属 c2
    expect(ejectOutsiders(c as any, [c, c2, owned] as any)).toEqual([]);
  });

  test("挤出覆盖四个方向:左半/上半区域的非成员同样被挤出,推出后间隙 = 50", () => {
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
      const n = probes.find((x) => x.id === p.nodeId)!;
      expect(boundsGap(calculateNodeVisualBounds(shifted(n, p) as any), r)).toBe(CONTAINER_CLEARANCE);
    }
    // 最近边最小位移(按包围盒):lt 本体 [30,70]×[35,65] → 上移 115 比左移 120 更近
    expect(patches.find((p) => p.nodeId === "lt")!.position).toEqual({ x: 50, y: -65 });
    expect(patches.find((p) => p.nodeId === "top")!.position).toEqual({ x: 100, y: -65 });
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

  test("挤出豁免:容器自身、其它容器、间隙足够的节点", () => {
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

  test("非成员落进容器矩形内 → 移入(`repelNonMembers` 缺省 false:函数默认值,非任何生产入口口径)", () => {
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

  // 排斥(拖动路径专属):容器与容器外设备互相排斥 —— 非 Alt 拖进来的非成员被弹回框外,不写归属。
  // 判定与推出同走包围盒口径(与 ejectOutsiders 同一单源):间隙 < CONTAINER_CLEARANCE 即弹,弹到间隙 = CONTAINER_CLEARANCE。
  test("拖动 + 非 Alt + 非成员落入 → 弹出到间隙 50,归属不变", () => {
    // 本体 [40,80]×[45,75]:左移 230 / 右移 110 / 上移 225 / 下移 105 → 最近边 = 下
    const moved = { ...outside, position: { x: 60, y: 60 } };
    const r = judgeContainerMembership({ nodes: [c, moved] as any, movedIds: ["out"], altKey: false, repelNonMembers: true });
    expect(r.membershipChanges).toEqual([]);
    expect(r.enterContainerId).toBeUndefined();
    expect(r.repelPatches).toEqual([{ nodeId: "out", position: { x: 60, y: 60 + 105 } }]);
    expect(boundsGap(calculateNodeVisualBounds(shifted(moved, r.repelPatches[0]) as any), rectOf(c))).toBe(CONTAINER_CLEARANCE);
  });

  test("拖动排斥:中心在框外但间隙 20(< 50)→ 照样弹到间隙 50(不再等「中心入框」)", () => {
    const near = { ...outside, position: { x: 140, y: 0 } }; // 本体 [120,160]:间隙 20,中心在框外
    const r = judgeContainerMembership({ nodes: [c, near] as any, movedIds: ["out"], altKey: false, repelNonMembers: true });
    expect(r.membershipChanges).toEqual([]);
    expect(r.repelPatches).toEqual([{ nodeId: "out", position: { x: 170, y: 0 } }]);
  });

  test("拖动排斥边界:间隙 130(≥ 50)→ 不弹", () => {
    const far = { ...outside, position: { x: 250, y: 0 } }; // 本体 [230,270]:间隙 130
    const r = judgeContainerMembership({ nodes: [c, far] as any, movedIds: ["out"], altKey: false, repelNonMembers: true });
    expect(r.repelPatches).toEqual([]);
  });

  test("拖动 + 非 Alt + 非成员远离容器 → 无弹出", () => {
    const moved = { ...outside, position: { x: 500, y: 500 } };
    const r = judgeContainerMembership({ nodes: [c, moved] as any, movedIds: ["out"], altKey: false, repelNonMembers: true });
    expect(r.repelPatches).toEqual([]);
    expect(r.membershipChanges).toEqual([]);
  });

  test("Alt 拖入不受影响:入组仍按中心落进矩形(仅间隙 20、中心在外 → 不入组也不弹)", () => {
    const near = { ...outside, position: { x: 140, y: 0 } };
    const r = judgeContainerMembership({ nodes: [c, near] as any, movedIds: ["out"], altKey: true, repelNonMembers: true });
    expect(r.membershipChanges).toEqual([]);
    expect(r.enterContainerId).toBeUndefined();
    expect(r.repelPatches).toEqual([]);
    // 对照:中心落进矩形仍照常入组
    const inner = { ...outside, position: { x: 60, y: 0 } };
    const entered = judgeContainerMembership({ nodes: [c, inner] as any, movedIds: ["out"], altKey: true, repelNonMembers: true });
    expect(entered.membershipChanges).toEqual([{ nodeId: "out", containerId: "c1" }]);
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

  // 豁免键只认「本批**新增**的容器」而非「本批被移动的容器」:多选拖动与布局里容器本身也在移动集内,
  // 按移动集豁免会让设备落进这些**既有**容器时不排斥 —— 与 spec「非 Alt 落入 = 排斥」冲突
  test("豁免只认新增容器:多选拖动(容器 + 外部设备)时设备落进该容器仍弹回", () => {
    const moved = { ...outside, position: { x: 60, y: 60 } };
    const r = judgeContainerMembership({
      nodes: [c, moved] as any,
      movedIds: ["c1", "out"],
      altKey: false,
      repelNonMembers: true,
    });
    expect(r.membershipChanges).toEqual([]);
    expect(r.repelPatches).toEqual([{ nodeId: "out", position: { x: 60, y: 60 + 105 } }]);
  });

  test("显式声明新增容器(整组粘贴 / SVG 导入整模型重建)才豁免:落进它按落点入组", () => {
    const moved = { ...outside, position: { x: 60, y: 60 } };
    const r = judgeContainerMembership({
      nodes: [c, moved] as any,
      movedIds: ["out"],
      altKey: false,
      repelNonMembers: true,
      addedContainerIds: ["c1"],
    });
    expect(r.enterContainerId).toBe("c1");
    expect(r.membershipChanges).toEqual([{ nodeId: "out", containerId: "c1" }]);
    expect(r.repelPatches).toEqual([]);
  });

  test("拖动排斥:按真实矩形命中哪个容器就弹哪个", () => {
    const c2 = node("c2", "ac-switch-box", 1000, 0, 200, 200); // 真实矩形 [900,1100]×[-100,100]
    const moved = { ...outside, position: { x: 950, y: 20 } };   // 本体 [930,970]×[5,35]:左移 120 最近
    const r = judgeContainerMembership({ nodes: [c, c2, moved] as any, movedIds: ["out"], altKey: false, repelNonMembers: true });
    expect(r.repelPatches).toEqual([{ nodeId: "out", position: { x: 950 - 120, y: 20 } }]);
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

  test("containerKindSwitch:切类型时 kind + 名称下拉值一起换(已有容器优先,否则默认名)", () => {
    const ex = [node("c1", "ac-vpp-box", 0, 0), node("c2", "ac-vpp-box", 0, 0)];
    // 该类型无已有容器 → 名称重置为该类型默认名、containerId 清空(切类型后不得还加入旧类型的容器)
    expect(containerKindSwitch("ac-switch-box", ex)).toEqual({ kind: "ac-switch-box", name: "开关箱1", containerId: "" });
    // 该类型已有容器 → 优先选中第一个(保留旧弹窗「有容器时默认加到第一个」的行为)
    expect(containerKindSwitch("ac-vpp-box", ex)).toEqual({ kind: "ac-vpp-box", name: "c1", containerId: "c1" });
  });

  test("containerNameOptions:只列该类型的已有容器(label 与面板下拉同源)", () => {
    const nodes = [node("c1", "ac-vpp-box", 0, 0), node("c2", "ac-switch-box", 0, 0), node("a", "ac-load", 0, 0)];
    expect(containerNameOptions("ac-vpp-box", nodes)).toEqual([{ label: "c1", value: "c1" }]);
    expect(containerNameOptions("ac-switch-box", nodes)).toEqual([{ label: "c2", value: "c2" }]);
    expect(containerNameOptions("ac-distribution-box", nodes)).toEqual([]);
  });

  test("containerNamePick:命中已有容器 → 加入其 id(不新建);未命中 → 视为新名新建", () => {
    const nodes = [node("c1", "ac-vpp-box", 0, 0), node("a", "ac-load", 0, 0)];
    expect(containerNamePick("c1", "ac-vpp-box", nodes)).toEqual({ kind: "ac-vpp-box", name: "c1", containerId: "c1" });
    // 命中普通图元 id 不算容器 → 按新名新建(名称下拉只列容器,防把设备当容器)
    expect(containerNamePick("a", "ac-vpp-box", nodes)).toEqual({ kind: "ac-vpp-box", name: "a", containerId: "" });
    expect(containerNamePick("我的虚拟电厂", "ac-vpp-box", nodes)).toEqual({ kind: "ac-vpp-box", name: "我的虚拟电厂", containerId: "" });
  });

  test("containerNameSearch:非空输入即视为新名并清已选容器(输入后直接确定也按新名建)", () => {
    const picked: ReturnType<typeof containerKindSwitch> = { kind: "ac-vpp-box", name: "c1", containerId: "c1" };
    expect(containerNameSearch("我的虚拟电厂", picked)).toEqual({ kind: "ac-vpp-box", name: "我的虚拟电厂", containerId: "" });
    // 空白输入原样返回:antd 选中选项后回送 onSearch(""),不得覆盖刚选中的容器
    expect(containerNameSearch("  ", picked)).toBe(picked);
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
    const outsider = node("o", "ac-load", 60, 60); // 容器矩形 [-100,100]²,本体 [40,80]×[45,75] → 最近边 = 上
    const { updates, enterContainerId } = applyDragContainerMembership({
      nodes: [container(), outsider], movedIds: ["o"], altKey: false, repelNonMembers: true,
    });
    expect(enterContainerId).toBeUndefined();
    const byId = byIdOf(updates);
    expect(byId.get("o")!.containerId).toBeUndefined();
    expect(byId.get("o")!.position).toEqual({ x: 60, y: 60 + 105 }); // 弹到间隙 50(旧口径只推中心到 100+24)
    expect(centerIn(byId.get("o")!.position, rectOf(byId.get("c1")!))).toBe(false); // 与重算后的容器不变量一致
  });

  test("端到端:非 Alt 拖设备贴到容器边(间隙 20)松手 → 弹到间隙 = 50", () => {
    // 基线:成员 (0,0) 的拟合容器(矩形 [-44,136]×[-39,73],成员本体到四边恰 24 = 内侧留白)
    const m = member(0, 0);
    const base = fitContainerToMembers(container(), [m] as any) as any;
    const dev = node("dev", "ac-load", 176, 17) as any; // 本体 [156,196]×[2,32]:与右边间隙 20
    const { updates } = applyDragContainerMembership({
      nodes: [base, m, dev], movedIds: ["dev"], altKey: false, repelNonMembers: true,
    });
    const byId = byIdOf(updates);
    expect(byId.get("dev")!.position).toEqual({ x: 206, y: 17 }); // 右边:136 + 50 + 半宽 20
    expect(boundsGap(calculateNodeVisualBounds(byId.get("dev")!), rectOf(byId.get("c1")!))).toBe(CONTAINER_CLEARANCE);
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
    expect(updates.find((n) => n.id === "o")!.position).toEqual({ x: 60, y: 60 + 105 });
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
  test("落点在已有容器内 → 排斥:弹回矩形外、不写归属(与拖动同口径)", () => {
    const c1 = node("c1", "ac-vpp-box", 0, 0, 200, 200) as any;
    const pasted = node("p1", "ac-load", 50, 50) as any;
    const nodes = [c1, pasted];
    const next = commitContainerMembership(nodes, ["p1"]);
    const placed = next.find((n) => n.id === "p1")!;
    expect(placed.containerId).toBeUndefined();
    // 本体 [30,70]×[35,65]:弹出口径 = 与矩形 [-100,100]² 的间隙推到 50 → 下移 115(下边最近)
    expect(placed.position).toEqual({ x: 50, y: 50 + 115 });
    expect(pasted.containerId).toBeUndefined(); // 入参图保持原样
    expect(pasted.position).toEqual({ x: 50, y: 50 });
  });

  test("容器与设备同批新增(整组粘贴 / SVG 导入)→ 照常入组,排斥只对「已有容器」生效", () => {
    const c1 = node("c1", "ac-vpp-box", 0, 0, 200, 200) as any;
    const inner = node("p1", "ac-load", 50, 50) as any;
    const next = commitContainerMembership([c1, inner], ["c1", "p1"]);
    expect(next.find((n) => n.id === "p1")!.containerId).toBe("c1");
  });

  // 契约(审查裁决 I1):「本批新增容器」豁免的只是**落点入组**那条分支,不是间距不变量 ——
  // 整组粘贴 / SVG 导入 / 批量布局时,贴边(中心在框外、间隙 < 50)的未归属节点照样被推到间隙 50,
  // 与存量图首次 enforce 同一执行(成员与已归属节点豁免不变)。
  test("契约:同批新增容器不豁免间距 —— 贴边(中心在外、间隙 20)未归属节点被推到间隙 50", () => {
    const c1 = node("c1", "ac-vpp-box", 0, 0, 200, 200) as any;
    const ring = node("ring", "ac-load", 140, 0) as any; // 本体 [120,160]:中心在框外,与右边间隙 20
    const next = commitContainerMembership([c1, ring], ["c1", "ring"]);
    const placed = next.find((n) => n.id === "ring")!;
    expect(placed.containerId).toBeUndefined();        // 中心在外 → 不入组(落点入组豁免只作用于框内落点)
    expect(placed.position).toEqual({ x: 170, y: 0 }); // 100 + 50 + 半宽 20 → 间隙恰 50
    // 容器随后重算(无成员 → 最小尺寸 180×112),间隙只增不减(60 ≥ 50),间距不变量仍成立
    expect(boundsGap(calculateNodeVisualBounds(placed as any), rectOf(next.find((n) => n.id === "c1")!)))
      .toBeGreaterThanOrEqual(CONTAINER_CLEARANCE);
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

// ─── 变换提交后的容器跟随(旋转/缩放) ───────────────────────────────────────
// 变换(rotate/scale)只改被变换节点的几何,容器不在变换集里 → 容器矩形会停在旧几何上,
// 直到下一次任意 enforce(拖动/粘贴/删除)才自愈。本出口把容器重算并入同一笔变换提交。
describe("变换后的容器跟随", () => {
  /** 已被成员拟合到位的容器(基线:不进更新) */
  const fittedContainer = (members: any[]) => fitContainerToMembers(node("c1", "ac-vpp-box", 0, 0, 200, 200) as any, members);

  test("成员旋转 → 容器重算;新矩形包住旋转后的视觉包围盒", () => {
    const member = { ...node("m1", "ac-load", 0, 0, 40, 30), containerId: "c1" };
    const base = node("c1", "ac-vpp-box", 0, 0, 200, 200) as any;
    const rotated = { ...member, rotation: 45 };
    const updates = refitContainersAfterTransform([base, rotated] as any, ["m1"]);

    expect(updates.map((n) => n.id)).toEqual(["c1"]);
    const fitted = fitContainerToMembers(base, [rotated]);
    expect(updates[0].position).toEqual(fitted.position);
    expect(updates[0].size).toEqual(fitted.size);
    const r = rectOf(updates[0]);
    const b = calculateNodeVisualBounds(rotated as any);
    expect(b.left).toBeGreaterThanOrEqual(r.x1);
    expect(b.right).toBeLessThanOrEqual(r.x2);
    expect(b.top).toBeGreaterThanOrEqual(r.y1);
    expect(b.bottom).toBeLessThanOrEqual(r.y2);
  });

  test("成员放大 → 容器扩张;成员缩小 → 容器收缩", () => {
    const small = { ...node("m1", "ac-load", 0, 0, 40, 30), containerId: "c1" };
    const base = fittedContainer([small]);
    const grown = { ...small, size: { width: 300, height: 200 } };
    const grownUpdates = refitContainersAfterTransform([base, grown] as any, ["m1"]);
    expect(grownUpdates[0].size.width).toBe(300 + CONTAINER_PADDING * 2);
    expect(grownUpdates[0].size.height).toBe(200 + CONTAINER_PADDING * 2);

    const big = { ...node("m1", "ac-load", 0, 0, 300, 200), containerId: "c1" };
    const bigBase = fittedContainer([big]);
    const shrunkUpdates = refitContainersAfterTransform([bigBase, small] as any, ["m1"]);
    expect(shrunkUpdates[0].size).toEqual({ ...CONTAINER_MIN_SIZE });
  });

  test("被变换的容器自身跳过(缩放容器的用户意图不被成员包围盒覆盖回去)", () => {
    const member = { ...node("m1", "ac-load", 0, 0, 40, 30), containerId: "c1" };
    const scaled = { ...node("c1", "ac-vpp-box", 0, 0, 400, 300) };
    expect(refitContainersAfterTransform([scaled, member] as any, ["c1"])).toEqual([]);
  });

  test("几何无变化 → 空更新(交互路径不提交空补丁);半程不挤出非成员", () => {
    const member = { ...node("m1", "ac-load", 0, 0, 40, 30), containerId: "c1" };
    const base = fittedContainer([member]);
    const stray = node("out", "ac-load", 0, 0); // 容器矩形内的非成员
    expect(refitContainersAfterTransform([base, member, stray] as any, ["m1"])).toEqual([]);

    // 变换后容器扩张,框内非成员不被本出口推动(挤出只属拖动/粘贴等入口)
    const rotated = { ...member, rotation: 45 };
    const updates = refitContainersAfterTransform([base, rotated, stray] as any, ["m1"]);
    expect(updates.map((n) => n.id)).toEqual(["c1"]);
  });
});
