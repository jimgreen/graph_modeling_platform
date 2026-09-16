// createCurrentProject 输出 backgroundProjectIdx：服务端靠它定位背景模型（前端 id 服务端无法解析）
import { describe, expect, test, vi } from "vitest";
import { Modal } from "antd";
import { createAddToAcContainer, createCurrentProject, createCutSelection, createDeleteSelection, createDropGraphTemplate, createEnsureDraggingUndoSnapshot, createPasteSelection, createRemoveFromAcContainer } from "./appSelectionDragFactories";
import { canvasClipboardBounds, cloneCanvasClipboard } from "../selectionActions";
import { containerKindSwitch, containerNamePick, containerNameSearch } from "../acContainer";
import { deleteNodesWithConnectedEdges } from "../model-routing";
import { createUndoGraphSnapshotPatchPlan } from "./appGraphMeasurementFactories";
import { normalizeProjectMeasurements } from "../measurements";
import { bareNode as sharedBareNode } from "./testFixtures";

function makeScope(overrides: Record<string, unknown> = {}) {
  return {
    activeLayerId: "default",
    allowAutoExpandCanvas: true,
    backgroundLayerIds: ["default"],
    backgroundProjectId: "project-bg",
    canvasBackgroundColor: "#ffffff",
    canvasBackgroundImage: "",
    canvasBackgroundImageAssetId: "",
    canvasBackgroundImageFit: "cover",
    canvasWidth: 800,
    canvasHeight: 400,
    currentUnit: "A",
    deviceIndexCounters: {},
    edgeWithCurrentRouteGeometryForSave: (edge: unknown) => edge,
    edges: [],
    groups: [],
    layers: [{ id: "default", name: "默认图层", visible: true }],
    lockProjectEdgeTerminals: (project: unknown) => project,
    nodes: [],
    normalizeModelGroups: (groups: unknown) => groups,
    normalizeProjectLayers: (project: unknown) => project,
    normalizeProjectMeasurements: (measurements: unknown) => measurements,
    powerBaseValue: 100,
    powerUnit: "MW",
    projectMeasurements: { version: 1, groups: [] },
    projectName: "宿主模型",
    projectIdx: 7,
    voltageUnit: "kV",
    ...overrides
  };
}

describe("createCurrentProject 背景页引用键", () => {
  // 模型全局 idx 落在 record.project.idx（SavedProjectRecord 顶层无 idx，
  // 与 nextGlobalProjectIndex 读 record.project.idx 同口径）
  test("背景记录有 idx 时输出 backgroundProjectIdx", () => {
    const project = createCurrentProject(makeScope({ backgroundProjectRecord: { project: { idx: 3 } } }))();
    expect(project.backgroundProjectIdx).toBe(3);
  });

  // 引用键必须落进最终 ProjectFile：只解构不写出时，服务端永远拿不到背景模型
  test("backgroundProjectIdx 不因 lockProjectEdgeTerminals / normalizeProjectLayers 透传而丢失", () => {
    const project = createCurrentProject(makeScope({ backgroundProjectRecord: { project: { idx: 11 } } }))();
    expect(project.backgroundProjectIdx).toBe(11);
    expect(project.backgroundProjectId).toBe("project-bg");
    expect(project.backgroundLayerIds).toEqual(["default"]);
  });

  test("无背景记录或 idx 非法时不输出", () => {
    expect(createCurrentProject(makeScope({ backgroundProjectRecord: undefined }))().backgroundProjectIdx).toBeUndefined();
    expect(createCurrentProject(makeScope({ backgroundProjectRecord: { project: { idx: 0 } } }))().backgroundProjectIdx).toBeUndefined();
    expect(createCurrentProject(makeScope({ backgroundProjectRecord: { idx: 3 } }))().backgroundProjectIdx).toBeUndefined();
  });
});

// ─── 拖动撤销作用域:图中存在容器时必须退化为全量对比 ─────────────────────────
// 拖动集只含被抓住的节点,而容器的几何重算 / 成员归属 / 关口解绑 / 挤出全在集合之外;
// 作用域一开 patch 通道,这些节点就落在撤销计划之外 → Ctrl+Z 后容器残留新几何与新归属。
// 本文件不关心标签,直接用共享构造器(位置恒 0,0;尺寸/params 等经 extra 覆盖)
const bareNode = (id: string, kind: string, extra: Record<string, unknown> = {}) =>
  sharedBareNode(id, kind, 0, 0, extra);

describe("拖动撤销作用域(容器)", () => {
  const mkDragScope = (nodes: any[]) => ({
    dragUndoCapturedRef: { current: false },
    draggingRef: { current: { nodeIds: ["m1"], edgeIds: [], affectedEdges: [] } },
    nodeById: new Map(nodes.map((n) => [n.id, n])),
    nodes,
    pushUndoSnapshot: vi.fn(),
    undoScopeForDraggingState: () => ({ nodeIds: ["m1"], edgeIds: [] }),
  });
  const container = bareNode("c1", "ac-vpp-box", { size: { width: 180, height: 112 } });
  const member = bareNode("m1", "ac-load", { containerId: "c1" });

  test("图中有容器 → scope 传 undefined(全量对比),容器/解绑/挤出不被漏掉", () => {
    const scope = mkDragScope([container, member]);
    createEnsureDraggingUndoSnapshot(scope as any)();
    expect(scope.pushUndoSnapshot).toHaveBeenCalledWith(true, false, undefined, "移动设备", expect.any(String));
  });

  test("无容器 → 仍用拖动集作用域(不无谓退化为全量)", () => {
    const scope = mkDragScope([member]);
    createEnsureDraggingUndoSnapshot(scope as any)();
    expect(scope.pushUndoSnapshot.mock.calls[0][2]).toEqual({ nodeIds: ["m1"], edgeIds: [] });
  });

  test("对照:作用域 undefined 时撤销计划纳入拖动集外的容器;给了拖动集作用域则会漏(可证伪)", () => {
    const movedContainer = { ...container, position: { x: 0, y: 300 } }; // 拖动后:容器几何已重算
    const movedMember = { ...member, position: { x: 0, y: 300 } };
    const store = {
      nodes: [movedContainer, movedMember], edges: [],
      nodeIndexById: new Map([["c1", 0], ["m1", 1]]), edgesByNodeId: new Map(),
    };
    const snapshot = {
      graphSnapshotMode: "reference", canvasWidth: 800, canvasHeight: 400,
      nodes: [container, member], edges: [], graphPatchScope: undefined,
    };
    const planScope = { canvasWidth: 800, canvasHeight: 400, fullUndoGraphDirtyEdgeIds: () => new Set<string>() };
    const fullPlan: any = createUndoGraphSnapshotPatchPlan(planScope)(store as any, snapshot as any);
    expect(fullPlan.mode).toBe("patch");
    expect(fullPlan.nodeIds).toEqual(["c1", "m1"]); // 容器(拖动集之外)一并还原
    const scopedPlan: any = createUndoGraphSnapshotPatchPlan(planScope)(
      store as any,
      { ...snapshot, graphPatchScope: { nodeIds: ["m1"], edgeIds: [] } } as any
    );
    expect(scopedPlan.nodeIds).toEqual(["m1"]); // 旧行为:容器残留在拖动后几何
  });
});

// ─── 归属入口的量测同步:图改完必须把量测喂给同一归一化出口 ─────────────────────
// 归一化出口(normalizeProjectMeasurements)内含容器量测组收敛(reconcileContainerMeasurementGroups);
// 入口只 patch 图不喂量测时,关口解绑后容器量测组会残留到下一次无关的量测变更。
describe("归属入口的量测同步", () => {
  const item = (id: string) => ({ id, measurementTypeId: "activePower", sourcePoint: id, name: "有功" });
  const gatewayContainer = (id: string, bound: string) =>
    bareNode(id, "ac-vpp-box", { params: { is_gateway: "1", bound_device_id: bound } });
  const plainContainer = (id: string) => bareNode(id, "ac-vpp-box", { params: {} });
  // 绑定设备 m1 与其镜像组 c1;解绑/离开后 c1 旧镜像保留(fb13 口径:不再随归一化清空)
  const measurementsWithMirror = () => ({
    version: 1,
    groups: [
      { id: "measurement-m1", nodeId: "m1", items: [item("p")] },
      { id: "measurement-c1", nodeId: "c1", items: [item("p")] },
    ],
  });
  const captureMeasurements = () => {
    let next: any;
    return {
      get: () => next,
      setProjectMeasurements: (updater: any) => { next = updater(measurementsWithMirror()); },
    };
  };

  test("右键移出:绑定设备离开原容器 → 容器旧镜像保留(fb13 口径),绑定设备组保留", () => {
    const nodes = [gatewayContainer("c1", "m1"), bareNode("m1", "ac-load", { containerId: "c1" })];
    const capture = captureMeasurements();
    createRemoveFromAcContainer({
      activeSelectedNodeIds: ["m1"],
      nodes,
      normalizeProjectMeasurements,
      patchGraphNodes: vi.fn(),
      pushUndoSnapshot: vi.fn(),
      requireEditMode: () => true,
      setProjectMeasurements: capture.setProjectMeasurements,
      showGlobalMessage: vi.fn(),
      writeOperationLog: vi.fn(),
    } as any)();

    // fb13 口径:移出后旧镜像保留(不再清空),绑定设备组不受影响
    expect(capture.get().groups.some((g: any) => g.nodeId === "c1")).toBe(true);
    expect(capture.get().groups.some((g: any) => g.nodeId === "m1")).toBe(true);
  });

  test("右键改归属:成员离开原关口容器 → 原容器旧镜像保留(fb13 口径)", () => {
    // containers[0] 即默认目标(Modal 未改动时 pick 取首个容器):目标放前,原容器在后
    const nodes = [
      plainContainer("c2"),
      gatewayContainer("c1", "m1"),
      bareNode("m1", "ac-load", { containerId: "c1" }),
    ];
    const capture = captureMeasurements();
    // Modal.confirm 桩:立即执行 onOk,等价用户点「确定」(默认目标 = 首个容器 c2)
    const confirmSpy = vi.spyOn(Modal, "confirm").mockImplementation(((config: any) => {
      config.onOk?.();
      return { destroy: vi.fn(), update: vi.fn() };
    }) as any);
    try {
      createAddToAcContainer({
        activeSelectedNodeIds: ["m1"],
        nodes,
        assignPermanentDeviceIndex: vi.fn(),
        normalizeProjectMeasurements,
        pushUndoSnapshot: vi.fn(),
        requireEditMode: () => true,
        setDeviceIndexCounters: vi.fn(),
        setGraphArrays: vi.fn(),
        setProjectMeasurements: capture.setProjectMeasurements,
        showGlobalMessage: vi.fn(),
        writeOperationLog: vi.fn(),
      } as any)();
    } finally {
      confirmSpy.mockRestore();
    }

    expect(capture.get().groups.some((g: any) => g.nodeId === "c1")).toBe(true);
    expect(capture.get().groups.some((g: any) => g.nodeId === "m1")).toBe(true);
  });

  // spec:自动解绑要弹提示 —— 移出的正是某关口容器的绑定设备时提示一次(非绑定设备不提示)
  test("右键移出绑定设备 → 弹「已解绑关口设备 …」;移出普通成员不弹", () => {
    const notice = (selectedIds: string[]) => {
      const nodes = [
        gatewayContainer("c1", "m1"),
        bareNode("m1", "ac-load", { containerId: "c1" }),
        bareNode("m2", "ac-load", { containerId: "c1" }),
      ];
      const showGlobalMessage = vi.fn();
      createRemoveFromAcContainer({
        activeSelectedNodeIds: selectedIds,
        nodes,
        normalizeProjectMeasurements,
        patchGraphNodes: vi.fn(),
        pushUndoSnapshot: vi.fn(),
        requireEditMode: () => true,
        setProjectMeasurements: vi.fn(),
        showGlobalMessage,
        writeOperationLog: vi.fn(),
      } as any)();
      return showGlobalMessage.mock.calls.map((call: any[]) => call[0]);
    };
    expect(notice(["m1"])).toEqual(["已解绑关口设备 m1，关口已关闭"]);
    expect(notice(["m2"])).toEqual([]);
  });
});

// ─── 删除容器收尾:确认框提示散出 + 成员 containerId 清空(成员保留) ──────────
// spec「其它交互边界」:删除容器 → 成员 containerId 全清(成员保留),确认框提示「N 个成员将散出」。
describe("删除容器收尾(deleteSelection)", () => {
  const container = (name = "虚拟电厂1") => bareNode("c1", "ac-vpp-box", {
    name, position: { x: 0, y: 0 }, size: { width: 200, height: 200 }, params: { _labelVisible: "0" },
  });
  const member = () => bareNode("m1", "ac-load", { containerId: "c1", params: { _labelVisible: "0" } });

  const mkDeleteScope = (nodes: any[], selectedNodeIds: string[]) => {
    const state: any = { nodes: [...nodes], edges: [] };
    const scope: any = {
      activeSelectedEdgeIds: [],
      activeSelectedNodeIds: selectedNodeIds,
      deleteNodesWithConnectedEdges: (ns: any[], es: any[], ids: string[]) => deleteNodesWithConnectedEdges(ns, es, ids),
      edgeById: new Map(),
      edgeListForNodeIds: () => [],
      edges: [],
      // 现取最新图:弹窗横跨交互窗口,提交时刻必须读 __appScope 而不是点击快照
      get nodes() { return state.nodes; },
      groups: [],
      lastCanvasClickTarget: null,
      markBusTerminalSyncDirtyForEdges: vi.fn(),
      markRouteEdgesDirty: vi.fn(),
      markStoredRouteEdgesDirty: vi.fn(),
      normalizeModelGroups: (g: any) => g,
      normalizeProjectMeasurements: (m: any) => m,
      pushUndoSnapshot: vi.fn(),
      removeGraphicsFromGroups: (g: any) => g,
      requireEditMode: () => true,
      setCanvasSelectionScope: vi.fn(),
      setEdges: vi.fn(),
      setGraphArrays: (n: any[], e: any[]) => { state.nodes = n; state.edges = e; },
      setGroups: vi.fn(),
      setLastCanvasClickTarget: vi.fn(),
      setProjectMeasurements: vi.fn(),
      setSelectedEdgeId: vi.fn(),
      setSelectedEdgeIds: vi.fn(),
      setSelectedNodeIds: vi.fn(),
      showGlobalMessage: vi.fn(),
      syncGlobalLineProjectNodes: vi.fn(),
      writeOperationLog: vi.fn(),
    };
    return { scope, state };
  };
  const confirmStub = (autoOk: boolean) => {
    const seen: any[] = [];
    const spy = vi.spyOn(Modal, "confirm").mockImplementation(((config: any) => {
      seen.push(config);
      if (autoOk) config.onOk?.();
      return { destroy: vi.fn(), update: vi.fn() };
    }) as any);
    return { seen, spy };
  };

  test("有成员的容器:弹确认(文案含容器名与成员数),确认后容器删除、成员保留且归属清空", () => {
    const { scope, state } = mkDeleteScope([container(), member()], ["c1"]);
    const { seen, spy } = confirmStub(true);
    try {
      createDeleteSelection(scope)();
    } finally {
      spy.mockRestore();
    }
    expect(seen).toHaveLength(1);
    expect(seen[0].content).toContain("虚拟电厂1");
    expect(seen[0].content).toContain("1 个成员");
    expect(state.nodes.map((n: any) => n.id)).toEqual(["m1"]);
    expect(state.nodes[0].containerId).toBeUndefined();
  });

  test("取消确认(未执行 onOk)→ 图不变,且零副作用(不压 undo 栈、不清点击目标)", () => {
    const { scope, state } = mkDeleteScope([container(), member()], ["c1"]);
    const { seen, spy } = confirmStub(false);
    try {
      createDeleteSelection(scope)();
    } finally {
      spy.mockRestore();
    }
    expect(seen).toHaveLength(1);
    expect(state.nodes.map((n: any) => n.id)).toEqual(["c1", "m1"]);
    expect(state.nodes[1].containerId).toBe("c1");
    expect(scope.pushUndoSnapshot).not.toHaveBeenCalled();
    expect(scope.setLastCanvasClickTarget).not.toHaveBeenCalled();
  });

  // 无选中提前 return 分支不开确认框,不存在「取消留下副作用」顾虑 —— 点击目标必须随手清掉,
  // 否则上一次画布点击的目标(如 measurement)会残留到下一次 Delete
  test("无选中时提前返回:仍清掉上一次画布点击目标", () => {
    const { scope } = mkDeleteScope([bareNode("o", "ac-load")], []);
    scope.lastCanvasClickTarget = "measurement";
    createDeleteSelection(scope)();
    expect(scope.setLastCanvasClickTarget).toHaveBeenCalledWith(null);
  });

  test("空容器:不弹确认,直接删除", () => {
    const { scope, state } = mkDeleteScope([container(), bareNode("o", "ac-load")], ["c1"]);
    const { seen, spy } = confirmStub(true);
    try {
      createDeleteSelection(scope)();
    } finally {
      spy.mockRestore();
    }
    expect(seen).toHaveLength(0);
    expect(state.nodes.map((n: any) => n.id)).toEqual(["o"]);
  });

  test("确认时刻现取最新图:弹窗期间的并发改动不被点击快照覆盖", () => {
    const { scope, state } = mkDeleteScope([container(), member()], ["c1"]);
    const { seen, spy } = confirmStub(false);
    try {
      createDeleteSelection(scope)();
      state.nodes = [...state.nodes, bareNode("late", "ac-load")]; // 弹窗期间第三方 WS control 加图
      seen[0].onOk();
    } finally {
      spy.mockRestore();
    }
    expect(state.nodes.map((n: any) => n.id)).toEqual(["m1", "late"]);
  });

  test("剪切容器:成员同样清归属(剪切 = 复制 + 删除,与删除入口同源),日志标明散出数", () => {
    const { scope, state } = mkDeleteScope([container(), member()], ["c1"]);
    Object.assign(scope, { buildCanvasClipboard: () => ({ nodes: [], edges: [] }), canvasSelectionScope: "group", activeLayerGroups: [], routedEdges: [], visibleEdges: [], visibleNodes: state.nodes, resolveCanvasDeleteAction: () => ({ kind: "delete" }), setCanvasClipboard: vi.fn(), resetRoutableLinePreviewState: vi.fn(), resetConnectPreviewState: vi.fn(), setConnectSource: vi.fn(), setRewiring: vi.fn(), setRoutableLinePlacement: vi.fn(), setContextMenu: vi.fn() });
    createCutSelection(scope)();
    expect(state.nodes.map((n: any) => n.id)).toEqual(["m1"]);
    expect(state.nodes[0].containerId).toBeUndefined();
    // 剪切无确认框(剪贴板语义),散出信息只能靠日志留痕 —— 与删除路径同一后缀
    expect(String(scope.writeOperationLog.mock.calls[0][0])).toContain("1 个成员散出");
  });

  // 弹窗横跨交互窗口:groups 必须函数式更新,否则确认时写回的是点击瞬间的快照
  test("groups 走函数式更新:用现取的 current,而非点击快照", () => {
    const { scope } = mkDeleteScope([container(), member()], ["c1"]);
    const seen: any[] = [];
    scope.setGroups = (updater: any) => { seen.push(updater); };
    const { spy } = confirmStub(true);
    try {
      createDeleteSelection(scope)();
    } finally {
      spy.mockRestore();
    }
    expect(typeof seen[0]).toBe("function"); // 快照口径传的是数组,这里必须是 updater
    expect(seen[0]("LATEST")).toBe("LATEST"); // 桩:normalize/remove 均透传,故回显入参
  });

  // spec 边界「成员全移出 → 容器收缩回最小尺寸」在删除路径同样成立:删光成员后容器必须收缩
  test("删光成员:容器收缩回最小尺寸(半程 enforce:不挤出非成员)", () => {
    const c1 = container();
    const m1 = member();
    const m2 = { ...bareNode("m2", "ac-load", { containerId: "c1", params: { _labelVisible: "0" } }) };
    const { scope, state } = mkDeleteScope([c1, m1, m2], ["m1", "m2"]);
    createDeleteSelection(scope)();
    expect(state.nodes.map((n: any) => n.id)).toEqual(["c1"]);
    expect(state.nodes[0].size).toEqual({ width: 180, height: 112 });
  });

  // 半程的意思:只重算容器几何,**不**挤出非成员 —— 否则刚散出的成员会被相邻容器顺手推出框外
  test("删容器:散出成员位置不变(不因落在相邻容器矩形内被挤出)", () => {
    const c2 = bareNode("c2", "ac-vpp-box", { name: "邻居", position: { x: 0, y: 0 }, size: { width: 200, height: 200 }, params: { _labelVisible: "0" } });
    const c1 = container();
    const m1 = member(); // 中心 (0,0),同时落在 c2 矩形 [-100,100]² 内
    const { scope, state } = mkDeleteScope([c1, c2, m1], ["c1"]);
    const { spy } = confirmStub(true);
    try {
      createDeleteSelection(scope)();
    } finally {
      spy.mockRestore();
    }
    expect(state.nodes.map((n: any) => n.id)).toEqual(["c2", "m1"]);
    expect(state.nodes.find((n: any) => n.id === "m1").position).toEqual(m1.position);
  });

  // spec:绑定设备被删除 → 自动解绑 + 关关口 + 弹提示(与移出/改归属同一出口)
  test("删除绑定设备:原关口容器解绑 + 关关口,并弹一次解绑提示", () => {
    const gateway = {
      ...bareNode("c1", "ac-vpp-box", { name: "虚拟电厂1", position: { x: 0, y: 0 }, size: { width: 200, height: 200 }, params: { _labelVisible: "0" } }),
      params: { _labelVisible: "0", is_gateway: "1", bound_device_id: "m1" },
    };
    const bound = bareNode("m1", "ac-load", { containerId: "c1", params: { _labelVisible: "0" } });
    const { scope, state } = mkDeleteScope([gateway, bound], ["m1"]);
    createDeleteSelection(scope)();
    expect(state.nodes.map((n: any) => n.id)).toEqual(["c1"]);
    expect(state.nodes[0].params.bound_device_id).toBe("");
    expect(state.nodes[0].params.is_gateway).toBe("0");
    expect(scope.showGlobalMessage.mock.calls.map((call: any[]) => call[0])).toEqual(["已解绑关口设备 m1，关口已关闭"]);
  });
});

// ─── 粘贴 / 模板落点的归属落地:落点在**已有**容器矩形内 → 排斥弹回 ────────────────
// 与拖动同口径(非 Alt 不做归属变更):副本落到已有容器上被推出矩形外,不写归属。
describe("粘贴与模板落点的归属落地", () => {
  const container = () => bareNode("c1", "ac-vpp-box", {
    position: { x: 0, y: 0 }, size: { width: 200, height: 200 }, params: { _labelVisible: "0" },
  });
  // 剪贴板里的源节点:中心 (200,200),40×30 → 包围盒 [180,220]×[185,215];
  // 指针落在 (60,75) → 副本中心 (80,65),落在容器矩形 [-100,100]² 内
  const sourceNode = () => bareNode("src", "ac-load", { position: { x: 200, y: 200 }, params: { _labelVisible: "0" } });
  const makeInsertScope = (nodes: any[], extra: Record<string, unknown> = {}) => {
    const inserted: any[] = [];
    return {
      inserted,
      scope: {
        CANVAS_AUTO_EXPAND_PADDING: 40,
        activeLayerId: "default",
        activateInspectorFromCanvas: vi.fn(),
        applyCanvasBounds: vi.fn(),
        assignPermanentDeviceIndex: (node: any) => ({ node, counters: {} }),
        canvasBounds: { width: 1000, height: 800 },
        canvasBoundsForAutoExpandedGraphContent: () => ({ width: 1000, height: 800 }),
        canvasBoundsWithOriginShift: (bounds: any) => bounds,
        canvasClipboard: { nodes: [sourceNode()], edges: [], groups: [] },
        canvasClipboardBounds,
        canvasHeight: 800,
        canvasWidth: 1000,
        clampNodePositionToBounds: (_node: any, _bounds: any, position: any) => position,
        clampPointToBounds: (point: any) => point,
        cloneCanvasClipboard,
        deviceIndexCounters: {},
        edges: [],
        hasCanvasOriginShift: () => false,
        lastCanvasPointerRef: { current: { x: 60, y: 75 } },
        lastRawCanvasPointerRef: { current: { x: 60, y: 75 } },
        leftTopCanvasOriginShiftForContent: () => ({ x: 0, y: 0 }),
        markBusTerminalSyncDirtyForEdges: vi.fn(),
        markStoredRouteEdgesDirty: vi.fn(),
        modelType: "ac",
        nodes,
        normalizeDeviceIndexCounters: () => ({}),
        normalizeModelGroups: (groups: any) => groups,
        pushUndoSnapshot: vi.fn(),
        rejectAutoCanvasExpansionForContent: () => false,
        requireEditMode: () => true,
        resetConnectPreviewState: vi.fn(),
        setCanvasSelectionScope: vi.fn(),
        setConnectSource: vi.fn(),
        setContextMenu: vi.fn(),
        setDeviceIndexCounters: vi.fn(),
        setGraphArrays: (nextNodes: any[]) => { inserted.push(...nextNodes); },
        setGroups: (updater: any) => { updater([]); },
        setRewiring: vi.fn(),
        setSelectedEdgeId: vi.fn(),
        setSelectedEdgeIds: vi.fn(),
        setSelectedNodeIds: vi.fn(),
        shiftCachedRoutesForCanvasOrigin: vi.fn(),
        showGlobalMessage: vi.fn(),
        translateEdgeBy: (edge: any) => edge,
        translateNodeBy: (node: any) => node,
        translatePointBy: (point: any) => point,
        writeOperationLog: vi.fn(),
        ...extra,
      },
    };
  };

  // 副本中心 (80,65) 落在旧矩形 [-100,100]² 内 → 弹回;容器随之收缩回最小尺寸(矩形成 [-90,90]×[-56,56])
  const outOfContainer = (inserted: any[], nodeId: string) => {
    const c = inserted.find((node: any) => node.id === "c1")!;
    const n = inserted.find((node: any) => node.id === nodeId)!;
    expect(c.size).toEqual({ width: 180, height: 112 });
    return (
      Math.abs(n.position.x - c.position.x) > c.size.width / 2 ||
      Math.abs(n.position.y - c.position.y) > c.size.height / 2
    );
  };

  test("粘贴:副本落点在已有容器内 → 排斥:弹回框外、不写归属", () => {
    const { scope, inserted } = makeInsertScope([container()]);
    createPasteSelection(scope as any)();

    const pasted = inserted.find((node: any) => node.kind === "ac-load")!;
    expect(pasted.containerId).toBeUndefined();
    expect(outOfContainer(inserted, pasted.id)).toBe(true);
  });

  test("放置模板:同出口落地(落点在已有容器内 → 弹回框外)", () => {
    const { scope, inserted } = makeInsertScope([container()]);
    createDropGraphTemplate(scope as any)(
      { typeName: "一次接线", name: "模板A", clipboard: { nodes: [sourceNode()], edges: [], groups: [] }, sourceSize: { width: 40, height: 30 } } as any,
      { x: 60, y: 75 }
    );

    const dropped = inserted.find((node: any) => node.kind === "ac-load")!;
    expect(dropped.containerId).toBeUndefined();
    expect(outOfContainer(inserted, dropped.id)).toBe(true);
  });

  test("粘贴落点在容器外 → 不写归属(判定非无条件)", () => {
    const { scope, inserted } = makeInsertScope([bareNode("c1", "ac-vpp-box", { position: { x: 900, y: 900 }, size: { width: 200, height: 200 } })]);
    createPasteSelection(scope as any)();

    expect(inserted.find((node: any) => node.kind === "ac-load").containerId).toBeUndefined();
  });
});

// ─── 添加到容器弹窗:类型 + 名称双下拉(选已有容器 = 加入;输入新名 = 新建) ──────
// 弹窗须列出 3 种类型(默认虚拟电厂),名称下拉候选 = 所选类型的已有容器,输入清单以外的名字则新建。
describe("添加到容器:类型 + 名称双下拉", () => {
  const mkNewContainerScope = (extraNodes: any[] = []) => {
    const graphs: any[] = [];
    const nodes = [bareNode("m1", "ac-load", { params: { _labelVisible: "0" } }), ...extraNodes];
    const scope: any = {
      activeSelectedNodeIds: ["m1"],
      assignPermanentDeviceIndex: (node: any) => ({ node, counters: {} }),
      deviceIndexCounters: {},
      edges: [],
      nodeById: new Map(nodes.map((n: any) => [n.id, n])),
      nodes,
      normalizeProjectMeasurements: (measurements: any) => measurements,
      pushUndoSnapshot: vi.fn(),
      requireEditMode: () => true,
      setDeviceIndexCounters: vi.fn(),
      setGraphArrays: (...args: any[]) => graphs.push(args),
      setProjectMeasurements: vi.fn(),
      showGlobalMessage: vi.fn(),
      writeOperationLog: vi.fn(),
    };
    return { graphs, scope };
  };

  /** Modal.confirm 桩:只拦下 config,onOk 由用例决定何时触发(弹窗横跨交互窗口) */
  const captureConfirm = () => {
    let captured: any = null;
    const spy = vi.spyOn(Modal, "confirm").mockImplementation(((config: any) => {
      captured = config;
      return { destroy: vi.fn(), update: vi.fn() };
    }) as any);
    return { spy, config: () => captured };
  };

  const createdContainer = (graphs: any[]) =>
    graphs[0][0].find((node: any) => node.kind.startsWith("ac-") && node.kind.endsWith("-box"));

  test("无该类型容器:默认新建虚拟电厂(弹窗初值 kind=ac-vpp-box / 虚拟电厂1)", () => {
    const { graphs, scope } = mkNewContainerScope();
    const { spy, config } = captureConfirm();
    try {
      createAddToAcContainer(scope)();
    } finally {
      spy.mockRestore();
    }

    // 弹窗表单收 draft(受控组件:内部 state 管显示,初值取自同一 draft)
    expect(config().content.props.draft).toEqual({ kind: "ac-vpp-box", name: "虚拟电厂1", containerId: "" });

    config().onOk();
    const created = createdContainer(graphs);
    expect(created.kind).toBe("ac-vpp-box");
    expect(created.name).toBe("虚拟电厂1");
  });

  test("切类型 → 新容器 kind=ac-switch-box,默认名按该类型计数(开关箱1)", () => {
    const { graphs, scope } = mkNewContainerScope();
    const { spy, config } = captureConfirm();
    try {
      createAddToAcContainer(scope)();
    } finally {
      spy.mockRestore();
    }

    // 弹窗为受控组件,Modal 桩下渲染不出 antd 下拉(环境是 node,无 jsdom):
    // 这里按组件 onChange 的唯一出口 containerKindSwitch 驱动 draft,锁「切类型 → kind/名称下拉值一起换」的提交侧
    Object.assign(config().content.props.draft, containerKindSwitch("ac-switch-box", scope.nodes));
    config().onOk();

    const created = createdContainer(graphs);
    expect(created.kind).toBe("ac-switch-box");
    expect(created.name).toBe("开关箱1");
  });

  test("名称下拉选中已有容器 → 不新建,成员并入该容器", () => {
    const { graphs, scope } = mkNewContainerScope([
      bareNode("v1", "ac-vpp-box", { position: { x: 0, y: 0 }, size: { width: 200, height: 200 } }),
    ]);
    const { spy, config } = captureConfirm();
    try {
      createAddToAcContainer(scope)();
    } finally {
      spy.mockRestore();
    }

    // 该类型已有容器 → 初值即选中它(旧行为:有容器时默认加到第一个);这里显式再选一次同一 id 以锁出口语义
    expect(config().content.props.draft.containerId).toBe("v1");
    Object.assign(config().content.props.draft, containerNamePick("v1", "ac-vpp-box", scope.nodes));
    config().onOk();

    const boxes = graphs[0][0].filter((node: any) => node.kind === "ac-vpp-box");
    expect(boxes).toHaveLength(1); // 未新建容器
    expect(graphs[0][0].find((node: any) => node.id === "m1").containerId).toBe("v1");
  });

  test("名称下拉输入清单以外的名字(未点选项)直接确定 → 新建该类型容器", () => {
    const { graphs, scope } = mkNewContainerScope([
      bareNode("v1", "ac-vpp-box", { position: { x: 0, y: 0 }, size: { width: 200, height: 200 } }),
    ]);
    const { spy, config } = captureConfirm();
    try {
      createAddToAcContainer(scope)();
    } finally {
      spy.mockRestore();
    }

    // 模拟键盘输入(组件 onSearch 的唯一出口):初值本选中已有容器 v1,输入后被改判为新名
    Object.assign(config().content.props.draft, containerNameSearch("我的虚拟电厂", config().content.props.draft));
    config().onOk();

    const created = graphs[0][0].find((node: any) => node.name === "我的虚拟电厂");
    expect(created.kind).toBe("ac-vpp-box");
    // 新建的容器收编成员,原容器 v1 保留
    expect(graphs[0][0].filter((node: any) => node.kind === "ac-vpp-box")).toHaveLength(2);
    expect(graphs[0][0].find((node: any) => node.id === "m1").containerId).toBe(created.id);
  });

});
