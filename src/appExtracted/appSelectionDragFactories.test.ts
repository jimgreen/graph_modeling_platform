// createCurrentProject 输出 backgroundProjectIdx：服务端靠它定位背景模型（前端 id 服务端无法解析）
import { describe, expect, test, vi } from "vitest";
import { createAddToContainer, createCanvasPointerKeyboardShortcutAvailability, createConfirmAddGraphTemplate, createConfirmAddToContainer, createCreateGraphTemplateType, createCurrentProject, createCutSelection, createDeleteSelection, createDropGraphTemplate, createEnsureDraggingUndoSnapshot, createFinalizeMovedNodeEdgesFast, createGroupDeviceTerminalAssociationFor, createGroupSelectedGraphics, createPasteSelection, createPersistDeviceLibraryChange, createQueuePendingBlankCanvasDeselect, createRemoveFromContainer, createRequireEditMode, createToggleFilterSelectionType } from "./appSelectionDragFactories";
import { canvasClipboardBounds, cloneCanvasClipboard, createCanvasGroupFromSelection, expandSelectionByGroups } from "../selectionActions";
import { containerKindSwitch, containerNamePick, containerNameSearch } from "../acContainer";
import { deleteNodesWithConnectedEdges } from "../model-routing";
import { createUndoGraphSnapshotPatchPlan } from "./appGraphMeasurementFactories";
import { normalizeProjectMeasurements } from "../measurements";
import { normalizeGraphTemplateTypeName } from "./appPersistenceLibraryExport";
import { defaultContainerAssociationForTerminalType, normalizeContainerTerminalAssociations } from "../customDeviceUtils";
import { CANVAS_KEYBOARD_SURFACE_SELECTOR, isCanvasKeyboardBlockingTarget } from "./appCoreCanvasUtilities";
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
    createRemoveFromContainer({
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
    // 默认目标 = 首个已有容器(弹窗初值即选中 c2):目标放前,原容器在后
    const nodes = [
      plainContainer("c2"),
      gatewayContainer("c1", "m1"),
      bareNode("m1", "ac-load", { containerId: "c1" }),
    ];
    const capture = captureMeasurements();
    // 受控对话框桩:打开捕获状态 → 立即提交(等价用户点「确定」)
    const scope: any = {
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
    };
    const openAddDialog = (target: any) => {
      let captured: any = null;
      target.setAddToContainerDialog = (state: any) => { captured = state; };
      createAddToContainer(target)();
      target.addToContainerDialog = captured;
      return captured;
    };
    openAddDialog(scope);
    createConfirmAddToContainer(scope)();

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
      createRemoveFromContainer({
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
  /**
   * showGlobalConfirm 桩(审查收口:删除确认从 antd 静态 Modal.confirm 改走仓库统一确认):
   * 记录文案;autoOk 决定点「确定」还是「取消」。弹窗横跨交互窗口 —— 需要「先弹、后改图、再确认」
   * 的用例用 deferredConfirm 拿手动 resolve。
   */
  const confirmStub = (autoOk: boolean) => {
    const seen: string[] = [];
    const previous = (globalThis as any).showGlobalConfirm;
    (globalThis as any).showGlobalConfirm = (text: string) => {
      seen.push(text);
      return Promise.resolve(autoOk);
    };
    return {
      seen,
      restore: () => {
        if (previous === undefined) delete (globalThis as any).showGlobalConfirm;
        else (globalThis as any).showGlobalConfirm = previous;
      }
    };
  };

  test("有成员的容器:弹确认(文案含容器名与成员数),确认后容器删除、成员保留且归属清空", async () => {
    const { scope, state } = mkDeleteScope([container(), member()], ["c1"]);
    const { seen, restore } = confirmStub(true);
    try {
      await createDeleteSelection(scope)();
    } finally {
      restore();
    }
    expect(seen).toHaveLength(1);
    expect(seen[0]).toContain("虚拟电厂1");
    expect(seen[0]).toContain("1 个成员");
    expect(state.nodes.map((n: any) => n.id)).toEqual(["m1"]);
    expect(state.nodes[0].containerId).toBeUndefined();
  });

  test("取消确认 → 图不变,且零副作用(不压 undo 栈、不清点击目标)", async () => {
    const { scope, state } = mkDeleteScope([container(), member()], ["c1"]);
    const { seen, restore } = confirmStub(false);
    try {
      await createDeleteSelection(scope)();
    } finally {
      restore();
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
    void createDeleteSelection(scope)();
    expect(scope.setLastCanvasClickTarget).toHaveBeenCalledWith(null);
  });

  test("空容器:不弹确认,直接删除", async () => {
    const { scope, state } = mkDeleteScope([container(), bareNode("o", "ac-load")], ["c1"]);
    const { seen, restore } = confirmStub(true);
    try {
      await createDeleteSelection(scope)();
    } finally {
      restore();
    }
    expect(seen).toHaveLength(0);
    expect(state.nodes.map((n: any) => n.id)).toEqual(["o"]);
  });

  test("确认时刻现取最新图:弹窗期间的并发改动不被点击快照覆盖", async () => {
    const { scope, state } = mkDeleteScope([container(), member()], ["c1"]);
    // 手动 resolve:模拟「确认框挂着时第三方 WS control 改图,之后用户才点确定」
    let resolveConfirm!: (value: boolean) => void;
    const previous = (globalThis as any).showGlobalConfirm;
    (globalThis as any).showGlobalConfirm = () => new Promise<boolean>((resolve) => { resolveConfirm = resolve; });
    try {
      const pending = createDeleteSelection(scope)();
      state.nodes = [...state.nodes, bareNode("late", "ac-load")]; // 弹窗期间第三方 WS control 加图
      resolveConfirm(true);
      await pending;
    } finally {
      if (previous === undefined) delete (globalThis as any).showGlobalConfirm;
      else (globalThis as any).showGlobalConfirm = previous;
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
  test("groups 走函数式更新:用现取的 current,而非点击快照", async () => {
    const { scope } = mkDeleteScope([container(), member()], ["c1"]);
    const seen: any[] = [];
    scope.setGroups = (updater: any) => { seen.push(updater); };
    const { restore } = confirmStub(true);
    try {
      await createDeleteSelection(scope)();
    } finally {
      restore();
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
  test("删容器:散出成员位置不变(不因落在相邻容器矩形内被挤出)", async () => {
    const c2 = bareNode("c2", "ac-vpp-box", { name: "邻居", position: { x: 0, y: 0 }, size: { width: 200, height: 200 }, params: { _labelVisible: "0" } });
    const c1 = container();
    const m1 = member(); // 中心 (0,0),同时落在 c2 矩形 [-100,100]² 内
    const { scope, state } = mkDeleteScope([c1, c2, m1], ["c1"]);
    const { restore } = confirmStub(true);
    try {
      await createDeleteSelection(scope)();
    } finally {
      restore();
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

  /**
   * 受控对话框桩:打开(createAddToContainer 写状态)→ 捕获状态并接上提交工厂。
   * draft 即表单初值(受控组件内部 state 管显示);提交由用例决定何时触发(弹窗横跨交互窗口)。
   */
  const openAddDialog = (scope: any) => {
    let captured: any = null;
    scope.setAddToContainerDialog = (state: any) => { captured = state; };
    createAddToContainer(scope)();
    scope.addToContainerDialog = captured;
    return {
      draft: () => captured?.draft,
      /** 当前对话框状态(null = 已关闭):提交/取消都应清空它 */
      state: () => captured,
      /** 打开后清状态(null 由 UI 取消路径写入):断言取消不落图 */
      cancel: () => { scope.setAddToContainerDialog(null); scope.addToContainerDialog = null; },
      submit: () => createConfirmAddToContainer(scope)()
    };
  };

  const createdContainer = (graphs: any[]) =>
    graphs[0][0].find((node: any) => node.kind.startsWith("ac-") && node.kind.endsWith("-box"));

  test("无该类型容器:默认新建虚拟电厂(弹窗初值 kind=ac-vpp-box / 虚拟电厂1)", () => {
    const { graphs, scope } = mkNewContainerScope();
    const dialog = openAddDialog(scope);

    // 弹窗表单收 draft(受控组件:内部 state 管显示,初值取自同一 draft)
    expect(dialog.draft()).toEqual({ kind: "ac-vpp-box", name: "虚拟电厂1", containerId: "" });

    dialog.submit();
    const created = createdContainer(graphs);
    expect(created.kind).toBe("ac-vpp-box");
    expect(created.name).toBe("虚拟电厂1");
    // 提交即关弹窗(状态清空):对话框组件由 __appScope.addToContainerDialog 驱动
    expect(dialog.state()).toBe(null);
  });

  test("取消弹窗(状态清空)后再提交 → 不落图", () => {
    const { graphs, scope } = mkNewContainerScope();
    const dialog = openAddDialog(scope);
    dialog.cancel();
    dialog.submit();
    expect(graphs).toHaveLength(0);
  });

  // 打开/提交分家的显式契约:提交必须现取最新图(第三方 WS control 可能在弹窗挂起期间改图),
  // 用打开时的点击快照会整图倒退回旧状态 —— 与删除路径同一语义(那边用 deferred resolve 验)
  test("确认时刻现取最新图:弹窗期间的并发改动不被点击快照覆盖(添加路径)", () => {
    const { graphs, scope } = mkNewContainerScope();
    const dialog = openAddDialog(scope);
    // 弹窗期间第三方 WS control 加图
    scope.nodes = [...scope.nodes, bareNode("late", "ac-load")];
    scope.nodeById = new Map(scope.nodes.map((n: any) => [n.id, n]));
    dialog.submit();
    // 落图用的是最新图(含 late);若误用打开时快照,late 会整节点丢失
    expect(graphs[0][0].some((n: any) => n.id === "late")).toBe(true);
    expect(graphs[0][0].find((n: any) => n.id === "m1").containerId).toBeTruthy();
  });

  test("切类型 → 新容器 kind=ac-switch-box,默认名按该类型计数(开关箱1)", () => {
    const { graphs, scope } = mkNewContainerScope();
    const dialog = openAddDialog(scope);

    // 表单为受控组件,node 环境渲染不出 antd 下拉:
    // 这里按组件 onChange 的唯一出口 containerKindSwitch 驱动 draft,锁「切类型 → kind/名称下拉值一起换」的提交侧
    Object.assign(dialog.draft(), containerKindSwitch("ac-switch-box", scope.nodes));
    dialog.submit();

    const created = createdContainer(graphs);
    expect(created.kind).toBe("ac-switch-box");
    expect(created.name).toBe("开关箱1");
  });

  test("名称下拉选中已有容器 → 不新建,成员并入该容器", () => {
    const { graphs, scope } = mkNewContainerScope([
      bareNode("v1", "ac-vpp-box", { position: { x: 0, y: 0 }, size: { width: 200, height: 200 } }),
    ]);
    const dialog = openAddDialog(scope);

    // 该类型已有容器 → 初值即选中它(旧行为:有容器时默认加到第一个);这里显式再选一次同一 id 以锁出口语义
    expect(dialog.draft().containerId).toBe("v1");
    Object.assign(dialog.draft(), containerNamePick("v1", "ac-vpp-box", scope.nodes));
    dialog.submit();

    const boxes = graphs[0][0].filter((node: any) => node.kind === "ac-vpp-box");
    expect(boxes).toHaveLength(1); // 未新建容器
    expect(graphs[0][0].find((node: any) => node.id === "m1").containerId).toBe("v1");
  });

  test("名称下拉输入清单以外的名字(未点选项)直接确定 → 新建该类型容器", () => {
    const { graphs, scope } = mkNewContainerScope([
      bareNode("v1", "ac-vpp-box", { position: { x: 0, y: 0 }, size: { width: 200, height: 200 } }),
    ]);
    const dialog = openAddDialog(scope);

    // 模拟键盘输入(组件 onSearch 的唯一出口):初值本选中已有容器 v1,输入后被改判为新名
    Object.assign(dialog.draft(), containerNameSearch("我的虚拟电厂", dialog.draft()));
    dialog.submit();

    const created = graphs[0][0].find((node: any) => node.name === "我的虚拟电厂");
    expect(created.kind).toBe("ac-vpp-box");
    // 新建的容器收编成员,原容器 v1 保留
    expect(graphs[0][0].filter((node: any) => node.kind === "ac-vpp-box")).toHaveLength(2);
    expect(graphs[0][0].find((node: any) => node.id === "m1").containerId).toBe(created.id);
  });

});

// ─── 本文件 9 处 Math.random 的随机源可注入(2026-10 审计收敛) ────────────────
// 这 9 处产出的都是**图元主键**,不是视觉抖动/临时 id:
//   粘贴 / 模板落点 → 节点·边·组 id 经 setGraphArrays + setGroups 进图元状态,
//     createCurrentProject 落盘方案文件,model-eexport 原样写成 `id: node.id`;
//     边 id 还被 cloneCanvasClipboard 的 idMap 改写 sourceId/targetId;
//   新建模板 → 模板 id 经 persistTemplateLibraryChange 落盘模板库;
//   组合 → 组 id 经 setGroups 进状态;
//   拖动后重叠端子自动补边 → 边 id 进 nextEdges 提交。
// 注入缝:`__appScope.randomSource`(缺省或非函数一律回退 Math.random,默认行为不变)。
describe("随机 id 的随机源可注入", () => {
  const FIXED_MS = new Date("2024-03-04T05:06:07.890Z").getTime();
  // 刻意避开 0.5 —— 那是 Math.random 的典型取值,恰是最可能被硬编码进实现的字面量。
  const A = 0.123456789;
  const B = 0.234567891;
  const C = 0.345678912;
  const D = 0.456789123;
  const tag = (value: number, length: number) => value.toString(36).slice(2, 2 + length);
  /** 顺序取值序列:顺带锁住「取用次数与次序」,即每个 id 都真的读了一次随机源。 */
  const randomSequence = (values: number[]) => {
    let i = 0;
    return () => values[Math.min(i++, values.length - 1)];
  };
  // 两个节点 + 一条联络线 + 一个两成员组合:四个 id 工厂各被调一次
  const clipboard = () => ({
    nodes: [
      bareNode("src1", "ac-load", { position: { x: 200, y: 200 }, params: { _labelVisible: "0" } }),
      bareNode("src2", "ac-load", { position: { x: 300, y: 200 }, params: { _labelVisible: "0" } }),
    ],
    edges: [{
      edge: { id: "e0", sourceId: "src1", targetId: "src2" },
      routePoints: [{ x: 220, y: 215 }, { x: 300, y: 215 }],
    }],
    groups: [{ id: "g0", name: "组A", nodeIds: ["src1", "src2"], edgeIds: [] }],
  });

  const makeInsertScope = (randomSource?: unknown) => {
    const nodesSet: any[][] = [];
    const edgesSet: any[][] = [];
    const groupsSet: any[][] = [];
    const scope: any = {
      CANVAS_AUTO_EXPAND_PADDING: 40,
      activeLayerId: "default",
      activateInspectorFromCanvas: vi.fn(),
      applyCanvasBounds: vi.fn(),
      assignPermanentDeviceIndex: (node: any) => ({ node, counters: {} }),
      canvasBounds: { width: 1000, height: 800 },
      canvasBoundsForAutoExpandedGraphContent: () => ({ width: 1000, height: 800 }),
      canvasBoundsWithOriginShift: (bounds: any) => bounds,
      canvasClipboard: clipboard(),
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
      nodes: [],
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
      setGraphArrays: (nextNodes: any[], nextEdges: any[]) => { nodesSet.push(nextNodes); edgesSet.push(nextEdges); },
      setGroups: (updater: any) => { groupsSet.push(updater([])); },
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
    };
    if (randomSource !== undefined) {
      scope.randomSource = randomSource;
    }
    return { scope, nodesSet, edgesSet, groupsSet };
  };

  // base36 截断可能切短(0.5 → "0.i")。先证明这四个注入值切得满长度,
  // 否则下面的精确 id 断言会在「随机段其实短了一截」时给出误导性的绿灯。
  test("注入值非退化:base36 随机段切得满预期长度", () => {
    for (const [value, length] of [[A, 4], [B, 4], [C, 4], [D, 4]] as const) {
      expect(tag(value, length)).toHaveLength(length);
    }
    expect(tag(A, 6)).toHaveLength(6);
  });

  test("粘贴:节点/边/组 id 逐字取自注入源,同输入两次可复现", () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(FIXED_MS);
      const run = () => {
        const { scope, nodesSet, edgesSet, groupsSet } = makeInsertScope(randomSequence([A, B, C, D]));
        createPasteSelection(scope)();
        return {
          ids: [
            ...nodesSet[0].map((node: any) => node.id),
            ...edgesSet[0].map((edge: any) => edge.id),
            ...groupsSet[0].map((group: any) => group.id),
          ],
          nodes: nodesSet[0],
          groupNodeIds: groupsSet[0][0].nodeIds,
        };
      };
      const a = run();
      const b = run();
      expect(a.ids).toEqual([
        `node-${FIXED_MS}-${tag(A, 4)}`,
        `node-${FIXED_MS}-${tag(B, 4)}`,
        `edge-${FIXED_MS}-${tag(C, 4)}`,
        `group-${FIXED_MS}-${tag(D, 4)}`,
      ]);
      expect(b.ids).toEqual(a.ids);
      // 断言要落在随机段真正流向的那份数据上:副本组合的成员引用就是新节点 id(不是源 id)
      expect(a.groupNodeIds).toEqual([a.nodes[0].id, a.nodes[1].id]);
    } finally {
      vi.useRealTimers();
    }
  });

  test("放置模板:同出口同结论(节点/边/组 id 同样取自注入源)", () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(FIXED_MS);
      const run = () => {
        const { scope, nodesSet, edgesSet, groupsSet } = makeInsertScope(randomSequence([A, B, C, D]));
        createDropGraphTemplate(scope)(
          { typeName: "一次接线", name: "模板A", clipboard: clipboard(), sourceSize: { width: 40, height: 30 } } as any,
          { x: 60, y: 75 }
        );
        return [
          ...nodesSet[0].map((node: any) => node.id),
          ...edgesSet[0].map((edge: any) => edge.id),
          ...groupsSet[0].map((group: any) => group.id),
        ];
      };
      const a = run();
      expect(a).toEqual([
        `node-${FIXED_MS}-${tag(A, 4)}`,
        `node-${FIXED_MS}-${tag(B, 4)}`,
        `edge-${FIXED_MS}-${tag(C, 4)}`,
        `group-${FIXED_MS}-${tag(D, 4)}`,
      ]);
      expect(run()).toEqual(a);
    } finally {
      vi.useRealTimers();
    }
  });

  const makeTemplateDialogScope = (randomSource?: unknown) => {
    const templatesSet: any[][] = [];
    const persisted: any[] = [];
    const scope: any = {
      DEFAULT_GRAPH_TEMPLATE_TYPES: ["一次接线"],
      cloneGraphTemplateClipboard: (cb: any) => cb,
      customGraphTemplateTypes: [],
      customGraphTemplates: [],
      normalizeGraphTemplateTypeName: (type: string) => type,
      persistTemplateLibraryChange: (payload: any) => persisted.push(payload),
      setCustomGraphTemplateTypes: vi.fn(),
      setCustomGraphTemplates: (next: any) => templatesSet.push(next),
      setExpandedGraphTemplateTypes: vi.fn(),
      setLeftPanelTab: vi.fn(),
      setTemplateDialog: vi.fn(),
      setTemplateDraftName: vi.fn(),
      templateDialog: { sourceSize: { width: 40, height: 30 }, clipboard: clipboard() },
      templateDraftName: "模板A",
      templateDraftType: "一次接线",
      writeOperationLog: vi.fn(),
    };
    if (randomSource !== undefined) {
      scope.randomSource = randomSource;
    }
    return { scope, templatesSet, persisted };
  };

  test("新建模板:模板 id 取自注入源(随机段 6 位),并原样落进模板库持久化", () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(FIXED_MS);
      const run = () => {
        const { scope, templatesSet, persisted } = makeTemplateDialogScope(randomSequence([A]));
        createConfirmAddGraphTemplate(scope)();
        return { id: templatesSet[0][0].id, persistedId: persisted[0].customGraphTemplates[0].id };
      };
      const a = run();
      const b = run();
      expect(a.id).toBe(`graph-template-${FIXED_MS}-${tag(A, 6)}`);
      expect(b.id).toBe(a.id);
      expect(a.persistedId).toBe(a.id);
    } finally {
      vi.useRealTimers();
    }
  });

  const makeGroupScope = (randomSource?: unknown) => {
    const groupsSet: any[][] = [];
    const nodes = [
      bareNode("n1", "ac-load", { params: { _labelVisible: "0" } }),
      bareNode("n2", "ac-load", { params: { _labelVisible: "0" } }),
    ];
    const scope: any = {
      activeSelectedEdgeIds: [],
      activeSelectedNodeIds: ["n1", "n2"],
      canGroupSelectedGraphics: true,
      createCanvasGroupFromSelection,
      edges: [],
      expandSelectionByGroups,
      groups: [],
      nodes,
      normalizeModelGroups: (groups: any) => groups,
      pushUndoSnapshot: vi.fn(),
      requireEditMode: () => true,
      setCanvasSelectionScope: vi.fn(),
      setGroups: (next: any) => groupsSet.push(next),
      setSelectedEdgeId: vi.fn(),
      setSelectedEdgeIds: vi.fn(),
      setSelectedNodeIds: vi.fn(),
      writeOperationLog: vi.fn(),
    };
    if (randomSource !== undefined) {
      scope.randomSource = randomSource;
    }
    return { scope, groupsSet };
  };

  test("组合:新组 id 取自注入源,并经 setGroups 进图元状态", () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(FIXED_MS);
      const run = () => {
        const { scope, groupsSet } = makeGroupScope(randomSequence([A]));
        createGroupSelectedGraphics(scope)();
        return groupsSet[0][0].id;
      };
      const a = run();
      expect(a).toBe(`group-${FIXED_MS}-${tag(A, 4)}`);
      expect(run()).toBe(a);
    } finally {
      vi.useRealTimers();
    }
  });

  // 重叠端子补边那条出口的随机 id 由 reconcileOverlappingTerminalConnections 传进来的
  // createEdgeId 决定,故桩住它、让它真的把该 id 写进补出来的那条边再回传。
  const makeFastFinishScope = (randomSource?: unknown) => {
    const scope: any = {
      canvasBounds: { width: 1000, height: 800 },
      prepareConnectionEdgeForCommit: () => ({ ok: false }),
      reconcileOverlappingTerminalConnections: (
        _previous: any,
        _next: any,
        edges: any[],
        createEdgeId: (first: any, second: any, index: number) => string
      ) => ({
        edges: [
          ...edges,
          {
            id: createEdgeId({ nodeId: "n1", terminalId: "t1" }, { nodeId: "n2", terminalId: "t2" }, 2),
            sourceId: "n1",
            targetId: "n2",
          },
        ],
        addedEdgeIds: [],
      }),
      routedEdges: [],
      routingNodesForConnectionEdge: () => [],
      terminalReconcileNodeScope: () => ({ previous: [], next: [] }),
    };
    if (randomSource !== undefined) {
      scope.randomSource = randomSource;
    }
    return scope;
  };

  test("拖动后重叠端子补边:新边 id 取自注入源,index 原样带出", () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(FIXED_MS);
      const run = () => {
        const nextEdges = createFinalizeMovedNodeEdgesFast(makeFastFinishScope(randomSequence([A])))(
          [], [], [], ["n1"], []
        ) as any[];
        return nextEdges[nextEdges.length - 1].id;
      };
      const a = run();
      expect(a).toBe(`edge-overlap-${FIXED_MS}-2-${tag(A, 4)}`);
      expect(run()).toBe(a);
    } finally {
      vi.useRealTimers();
    }
  });

  test("未注入随机源(缺省或非函数)→ 仍走 Math.random,五个出口 id 形状不变", () => {
    for (const randomSource of [undefined, "not-a-function"]) {
      const insert = makeInsertScope(randomSource);
      createPasteSelection(insert.scope)();
      const pasteIds = [
        ...insert.nodesSet[0].map((node: any) => node.id),
        ...insert.edgesSet[0].map((edge: any) => edge.id),
        ...insert.groupsSet[0].map((group: any) => group.id),
      ];
      for (const id of pasteIds) {
        expect(id).toMatch(/^(node|edge|group)-\d+-[0-9a-z]{1,4}$/);
        expect(id).not.toMatch(/undefined/);
      }

      const drop = makeInsertScope(randomSource);
      createDropGraphTemplate(drop.scope)(
        { typeName: "一次接线", name: "模板A", clipboard: clipboard(), sourceSize: { width: 40, height: 30 } } as any,
        { x: 60, y: 75 }
      );
      expect(drop.nodesSet[0][0].id).toMatch(/^node-\d+-[0-9a-z]{1,4}$/);

      const dialog = makeTemplateDialogScope(randomSource);
      createConfirmAddGraphTemplate(dialog.scope)();
      expect(dialog.templatesSet[0][0].id).toMatch(/^graph-template-\d+-[0-9a-z]{1,6}$/);

      const group = makeGroupScope(randomSource);
      createGroupSelectedGraphics(group.scope)();
      expect(group.groupsSet[0][0].id).toMatch(/^group-\d+-[0-9a-z]{1,4}$/);

      const fast = createFinalizeMovedNodeEdgesFast(makeFastFinishScope(randomSource))([], [], [], ["n1"], []) as any[];
      expect(fast[fast.length - 1].id).toMatch(/^edge-overlap-\d+-\d+-[0-9a-z]{1,4}$/);
    }
  });

});

// ─── 补断言:三条零命中导出 + 三个容器草稿出口的返回值直断 ──────────────────────
// ① createToggleFilterSelectionType / createCreateGraphTemplateType /
//    createCanvasPointerKeyboardShortcutAvailability 此前**一条用例都没有**;
// ② 容器草稿三函数(containerKindSwitch / containerNamePick / containerNameSearch)
//    此前只经 `Object.assign(draft, …) + submit()` 间接验 —— 提交侧把「返回值的
//    哪个字段最终生效」测了个遍,唯独「它到底返回什么」本身没人直断。

/** 装/拆一个全局:node 环境没有 window/document/Element,这几条出口靠它们才跑得起来 */
const setGlobal = (key: string, value: unknown) => {
  const holder = globalThis as any;
  const had = Object.prototype.hasOwnProperty.call(holder, key);
  const saved = holder[key];
  holder[key] = value;
  return () => {
    if (had) {
      holder[key] = saved;
    } else {
      delete holder[key];
    }
  };
};

describe("筛选对话框类型行的三态切换(createToggleFilterSelectionType)", () => {
  const typeOptions = [
    {
      typeKey: "ac",
      label: "交流",
      count: 2,
      items: [
        { itemKey: "a1", typeKey: "ac", label: "负载1", count: 1, nodeIds: ["n1"] },
        { itemKey: "a2", typeKey: "ac", label: "负载2", count: 1, nodeIds: ["n2"] },
      ],
    },
    {
      typeKey: "dc",
      label: "直流",
      count: 1,
      items: [{ itemKey: "d1", typeKey: "dc", label: "直流1", count: 1, nodeIds: ["n3"] }],
    },
  ];

  /** 出口把「新选中集合」以 updater 交给 setFilterSelectionTypeKeys,故抓 updater 而非断言是否调过 setter */
  const toggle = (typeKey: string) => {
    const captured: Array<(next: string[]) => string[]> = [];
    createToggleFilterSelectionType({
      filterSelectionTypeOptions: typeOptions,
      setFilterSelectionTypeKeys: (updater: any) => { captured.push(updater); }
    } as any)(typeKey);
    return captured;
  };
  /** 模拟 setState:updater 作用在 current 上得到的即是新选中集合(断的就是这个返回值) */
  const nextKeys = (current: string[], typeKey: string) => {
    const captured = toggle(typeKey);
    expect(captured).toHaveLength(1);
    return captured[0](current);
  };

  test("未选中→选中:把该类型全部子项补进新集合", () => {
    expect(nextKeys([], "ac")).toEqual(["a1", "a2"]);
  });

  test("部分选中→补齐:已选的不重复、不重排,只追加缺的那些", () => {
    // 顺序也是契约:已选留在原位,新增追加在后(不是重排成表格顺序)
    expect(nextKeys(["a2"], "ac")).toEqual(["a2", "a1"]);
  });

  test("全选中→取消:只摘该类型的子项,别的类型原样留着", () => {
    expect(nextKeys(["d1", "a1", "a2"], "ac")).toEqual(["d1"]);
  });

  test("入参 current 不被就地修改(出口是纯计算,不 sort/splice 宿主那份数组)", () => {
    // 冻结后仍能跑通即证明没写宿主;若哪天改成 sort/splice,这里会直接抛
    const current = Object.freeze(["d1", "a2"]) as unknown as string[];
    expect(nextKeys(current, "ac")).toEqual(["d1", "a2", "a1"]);
    expect(current).toEqual(["d1", "a2"]);
  });

  test("未知 typeKey:连 updater 都不交(没有 option 可算,静默不动状态)", () => {
    expect(toggle("nope")).toHaveLength(0);
  });
});

describe("新增模板类型出口(createCreateGraphTemplateType)", () => {
  const makeScope = (extra: Record<string, unknown> = {}): any => ({
    customGraphTemplateTypes: [] as string[],
    graphTemplateTypes: ["一次接线", "直流接线"],
    normalizeGraphTemplateTypeName,
    persistTemplateLibraryChange: vi.fn(),
    requireEditMode: () => true,
    setCustomGraphTemplateTypes: vi.fn(),
    setExpandedGraphTemplateTypes: vi.fn(),
    setTemplateDraftType: vi.fn(),
    writeOperationLog: vi.fn(),
    ...extra,
  });

  /** node 环境没有 window:装一个 prompt 桩(回用户输入值),跑完原样拆掉 */
  const withPrompt = (answer: string | null, run: () => void) => {
    const prompt = vi.fn(() => answer);
    const restore = setGlobal("window", { prompt });
    try {
      run();
    } finally {
      restore();
    }
    return prompt;
  };

  test("空串 / 纯空白 / 取消(prompt 回 null)→ 拒绝:返回 undefined,且一个 setter 都不碰", () => {
    // 本函数所有出口都 return undefined,故「拒绝」只能靠「什么都没写」来判
    for (const answer of ["", "   ", "\t\n ", null]) {
      const scope = makeScope();
      let result: unknown = "出口没被调用";
      withPrompt(answer, () => { result = createCreateGraphTemplateType(scope)(); });
      expect(result, `输入 ${JSON.stringify(answer)}`).toBeUndefined();
      expect(scope.setCustomGraphTemplateTypes).not.toHaveBeenCalled();
      expect(scope.setExpandedGraphTemplateTypes).not.toHaveBeenCalled();
      expect(scope.setTemplateDraftType).not.toHaveBeenCalled();
      expect(scope.persistTemplateLibraryChange).not.toHaveBeenCalled();
      expect(scope.writeOperationLog).not.toHaveBeenCalled();
    }
  });

  test("合法名:先 trim 再入库,类型名在五处出口上完全一致", () => {
    const scope = makeScope();
    withPrompt("  直流接线2  ", () => { createCreateGraphTemplateType(scope)(); });

    expect(scope.setCustomGraphTemplateTypes).toHaveBeenCalledWith(["直流接线2"]);
    expect(scope.setTemplateDraftType).toHaveBeenCalledWith("直流接线2");
    expect(scope.persistTemplateLibraryChange).toHaveBeenCalledWith({ customGraphTemplateTypes: ["直流接线2"] });
    expect(scope.writeOperationLog).toHaveBeenCalledWith("新增模板类型：直流接线2");
    // 展开列表走 updater:未展开才补,已展开原样返回(不重复追加)
    const updater = scope.setExpandedGraphTemplateTypes.mock.calls[0][0];
    expect(updater([])).toEqual(["直流接线2"]);
    expect(updater(["直流接线2"])).toEqual(["直流接线2"]);
  });

  test("与已有类型重名 → 拒绝且不写任何状态;提示走的是全局 showGlobalMessage", () => {
    const scope = makeScope();
    const showGlobalMessage = vi.fn();
    const restore = setGlobal("showGlobalMessage", showGlobalMessage);
    try {
      withPrompt("一次接线", () => { createCreateGraphTemplateType(scope)(); });
    } finally {
      restore();
    }
    expect(showGlobalMessage).toHaveBeenCalledWith("模板类型名称重复，请换一个名称。");
    expect(scope.setCustomGraphTemplateTypes).not.toHaveBeenCalled();
    expect(scope.persistTemplateLibraryChange).not.toHaveBeenCalled();
  });

  test("重名判定大小写不敏感:已有 AC 时输入 ac 同样被拒", () => {
    const scope = makeScope({ graphTemplateTypes: ["AC"] });
    withPrompt("ac", () => { createCreateGraphTemplateType(scope)(); });
    expect(scope.setCustomGraphTemplateTypes).not.toHaveBeenCalled();
    expect(scope.setTemplateDraftType).not.toHaveBeenCalled();
  });

  test("含非法字符**不**被拒:本出口只做 trim,没有字符集校验", () => {
    // 与元件类名那道校验(须字母开头等)是两条独立路径;这里如实锁住现状,免得日后误以为已校验
    const scope = makeScope();
    withPrompt("  A B/系统!  ", () => { createCreateGraphTemplateType(scope)(); });
    expect(scope.setCustomGraphTemplateTypes).toHaveBeenCalledWith(["A B/系统!"]);
    expect(scope.setTemplateDraftType).toHaveBeenCalledWith("A B/系统!");
  });

  test("非编辑模式:连 prompt 都不问,直接返回 undefined", () => {
    const scope = makeScope({ requireEditMode: () => false });
    const prompt = withPrompt("新类型", () => { createCreateGraphTemplateType(scope)(); });
    expect(prompt).not.toHaveBeenCalled();
    expect(scope.setCustomGraphTemplateTypes).not.toHaveBeenCalled();
  });
});

describe("画布指针下的快捷键可用性(createCanvasPointerKeyboardShortcutAvailability)", () => {
  /**
   * 极简 DOM 替身:这条出口只用到 `instanceof Element` 与 `closest(选择器)`。
   * 选择器按逗号拆开、只认 `.` 前缀的 class token,并沿 parent 向上冒泡 ——
   * 以还原真实结构:顶层元素是输入框,命中浮层的是它的祖先。
   */
  class FakeElement {
    private readonly classes: string[];
    private readonly parent: FakeElement | null;
    constructor(classNames = "", parent: FakeElement | null = null) {
      this.classes = classNames.split(/\s+/).filter(Boolean);
      this.parent = parent;
    }
    closest(selector: string) {
      const tokens = selector.split(",").map((token) => token.trim());
      for (let node: FakeElement | null = this; node !== null; node = node.parent) {
        const self: FakeElement = node;
        if (tokens.some((token) => token.startsWith(".") && self.classes.includes(token.slice(1)))) {
          return self;
        }
      }
      return null;
    }
  }

  const makeScope = (point: { x: number; y: number } | null, insideCanvas = true): any => ({
    CANVAS_KEYBOARD_SURFACE_SELECTOR,
    clientPointInsideRenderedCanvas: () => insideCanvas,
    isCanvasKeyboardBlockingTarget,
    lastCanvasClientPointerRef: { current: point },
    lastKeyboardShortcutClientPointerRef: { current: null },
  });

  /** node 环境没有 document/Element:装上再跑,跑完拆掉 */
  const withDom = (topElement: unknown, run: (elementFromPoint: ReturnType<typeof vi.fn>) => string) => {
    const elementFromPoint = vi.fn(() => topElement);
    const restoreElement = setGlobal("Element", FakeElement);
    const restoreDocument = setGlobal("document", { elementFromPoint });
    try {
      return run(elementFromPoint);
    } finally {
      restoreDocument();
      restoreElement();
    }
  };

  const availabilityAt = (topElement: unknown, scope: any) =>
    withDom(topElement, () => createCanvasPointerKeyboardShortcutAvailability(scope)());

  test("指针在画布内、顶层元素命中画布面 → unblocked(画布聚焦:快捷键可用)", () => {
    expect(availabilityAt(new FakeElement("diagram-canvas"), makeScope({ x: 40, y: 30 }))).toBe("unblocked");
  });

  test("指针落在输入框(拦截浮层 + 画布面之内)→ blocked(输入框聚焦:快捷键不可用)", () => {
    // ⚠ 嵌套形状是判别力的所在,不能简化:浮层必须**同时**落在画布面之内,
    //   否则「顶层元素不在画布面内」这条路径也会产出 blocked,删掉拦截分支照样绿(实测 M6)。
    //   真实结构即如此:侧栏/浮层绝对定位压在画布区上,既在渲染画布矩形内,又属于
    //   .canvas-scroll-surface / .diagram-canvas 的后代。
    const input = new FakeElement("", new FakeElement("inspector-panel", new FakeElement("canvas-scroll-surface")));
    expect(availabilityAt(input, makeScope({ x: 40, y: 30 }))).toBe("blocked");
  });

  test("画布面上的浮层(浮动工具条)同样 blocked —— 拦截浮层优先于画布面", () => {
    const toolbar = new FakeElement("canvas-floating-toolbar", new FakeElement("diagram-canvas"));
    expect(availabilityAt(toolbar, makeScope({ x: 40, y: 30 }))).toBe("blocked");
  });

  test("指针不在已渲染画布内 → blocked,且根本不查 elementFromPoint", () => {
    const scope = makeScope({ x: 5000, y: 5000 }, false);
    const result = withDom(new FakeElement("diagram-canvas"), (elementFromPoint) => {
      const value = createCanvasPointerKeyboardShortcutAvailability(scope)();
      expect(elementFromPoint).not.toHaveBeenCalled();
      return value;
    });
    expect(result).toBe("blocked");
  });

  test("elementFromPoint 拿不到 Element(点在空白/未渲染处)→ blocked", () => {
    expect(availabilityAt(null, makeScope({ x: 40, y: 30 }))).toBe("blocked");
  });

  test("顶层元素既不命中浮层也不命中画布面 → blocked(默认不可用,不是默认可用)", () => {
    expect(availabilityAt(new FakeElement("topbar"), makeScope({ x: 40, y: 30 }))).toBe("blocked");
  });

  test("无任何指针记录 → unknown(既非可用也非不可用)", () => {
    expect(availabilityAt(new FakeElement("diagram-canvas"), makeScope(null))).toBe("unknown");
  });

  test("键盘指针记录优先于画布指针记录", () => {
    const scope = makeScope({ x: 40, y: 30 });
    scope.lastKeyboardShortcutClientPointerRef = { current: { x: 9999, y: 9999 } };
    scope.clientPointInsideRenderedCanvas = (point: { x: number }) => point.x < 5000;
    expect(availabilityAt(new FakeElement("diagram-canvas"), scope)).toBe("blocked");
  });
});

describe("三个容器草稿出口的返回值直断(不经提交侧)", () => {
  // 一个虚拟电厂容器 + 两个开关箱容器 + 一个普通图元
  const containerNodes = () => [
    bareNode("m1", "ac-load", { name: "负载1" }),
    bareNode("v1", "ac-vpp-box", { name: "虚拟电厂1", size: { width: 200, height: 200 } }),
    bareNode("s1", "ac-switch-box", { name: "开关箱1", size: { width: 200, height: 200 } }),
    bareNode("s2", "ac-switch-box", { name: "开关箱2", size: { width: 200, height: 200 } }),
  ];

  /** 深冻结:测试文件是 ESM(严格模式),任何就地写都会抛 —— 比事后比对快照更早暴露 */
  const deepFreeze = (value: any): any => {
    if (value && typeof value === "object" && !Object.isFrozen(value)) {
      Object.freeze(value);
      Object.values(value).forEach(deepFreeze);
    }
    return value;
  };

  test("containerKindSwitch:该类型已有容器 → 选中第一个(kind/名称/容器 id 三者齐全)", () => {
    expect(containerKindSwitch("ac-vpp-box", deepFreeze(containerNodes()) as any)).toEqual({
      kind: "ac-vpp-box",
      name: "虚拟电厂1",
      containerId: "v1",
    });
  });

  test("containerKindSwitch:该类型还没有容器 → 预填默认名,containerId 必须为空(不残留旧类型的容器)", () => {
    const nodes = deepFreeze(containerNodes()) as any;
    expect(containerKindSwitch("ac-distribution-box", nodes)).toEqual({
      kind: "ac-distribution-box",
      name: "配变箱1",
      containerId: "",
    });
    // 默认名的计数只按**本类型**数,不受别类型容器影响(否则这里会是 虚拟电厂4)
    expect(containerKindSwitch("dc-vpp-box", nodes)).toEqual({
      kind: "dc-vpp-box",
      name: "虚拟电厂1",
      containerId: "",
    });
  });

  test("containerNamePick:命中已有容器 id → 选中它,name 同步为该容器名", () => {
    expect(containerNamePick("s2", "ac-switch-box", deepFreeze(containerNodes()) as any)).toEqual({
      kind: "ac-switch-box",
      name: "开关箱2",
      containerId: "s2",
    });
  });

  test("containerNamePick:未命中 id → 视作新输入的名字,containerId 清空(新建口径)", () => {
    expect(containerNamePick("我的开关箱", "ac-switch-box", deepFreeze(containerNodes()) as any)).toEqual({
      kind: "ac-switch-box",
      name: "我的开关箱",
      containerId: "",
    });
  });

  test("containerNamePick 只按 id 匹配、不校验类型:别的类型的容器 id 也会被选中", () => {
    // UI 的名称候选只给本类型的容器,故线上碰不到;此处如实锁住纯函数口径:
    // draft.kind 与被选容器的 kind 可以不一致,提交侧走 containerId 分支(加入它)不受影响
    expect(containerNamePick("s1", "ac-vpp-box", deepFreeze(containerNodes()) as any)).toEqual({
      kind: "ac-vpp-box",
      name: "开关箱1",
      containerId: "s1",
    });
  });

  test("containerNameSearch:非空输入 → 覆盖名称并清空已选容器(直接点确定也按新名新建)", () => {
    const draft = { kind: "ac-switch-box", name: "开关箱1", containerId: "s1" };
    expect(containerNameSearch("  我的开关箱  ", draft as any)).toEqual({
      kind: "ac-switch-box",
      name: "我的开关箱",
      containerId: "",
    });
  });

  test("containerNameSearch:纯空白输入 → 原样返回入参本身(同一引用),既不改名也不清容器", () => {
    const draft = { kind: "ac-switch-box", name: "开关箱1", containerId: "s1" };
    const result = containerNameSearch("   ", draft as any);
    expect(result).toBe(draft);
    expect(result).toEqual({ kind: "ac-switch-box", name: "开关箱1", containerId: "s1" });
  });

  test("三个出口都不就地改入参:冻结入参 + 前后快照一致", () => {
    const nodes = containerNodes();
    const draft = { kind: "ac-vpp-box", name: "虚拟电厂1", containerId: "v1" };
    const nodesBefore = JSON.stringify(nodes);
    const draftBefore = JSON.stringify(draft);
    deepFreeze(nodes);
    deepFreeze(draft);

    containerKindSwitch("ac-switch-box", nodes as any);
    containerNamePick("s1", "ac-switch-box", nodes as any);
    containerNameSearch("新名字", draft as any);

    expect(JSON.stringify(nodes)).toBe(nodesBefore);
    expect(JSON.stringify(draft)).toBe(draftBefore);
  });
});

describe("组端子关联取值(createGroupDeviceTerminalAssociationFor)", () => {
  const containerNode = (terminalTypes: string[]) =>
    bareNode("c1", "ac-vpp-box", {
      terminals: terminalTypes.map((type, index) => ({ id: `t${index + 1}`, label: "", type })),
    });

  const associationFor = (template: any, node: any, index: number, type: string) =>
    createGroupDeviceTerminalAssociationFor({
      defaultContainerAssociationForTerminalType,
      libraryTemplateByKind: new Map([["ac-vpp-box", template]]),
      normalizeContainerTerminalAssociations,
    } as any)(node, index, type as any);

  const containerTemplate = (terminalAssociations: string[]) => ({ isContainer: true, terminalAssociations });

  test("节点没有端子(terminalCount=0):归一化给不出第 0 位 → 退回该端子类型的默认关联,不是 undefined", () => {
    const node = containerNode([]);
    const template = containerTemplate(["ac-load"]);
    // 兜底取的是**入参** type(此时端子表是空的,无从按位取)
    expect(associationFor(template, node, 0, "ac")).toBe("ac-generator");
    expect(associationFor(template, node, 0, "dc")).toBe("dc-generator");
    expect(associationFor(template, node, 0, "h2")).toBe("h2-source");
  });

  test("模板关联表比端子表短:缺的位按各自端子类型的默认关联补齐,不串位", () => {
    const node = containerNode(["ac", "dc", "h2"]);
    const template = containerTemplate(["ac-load"]);
    expect(associationFor(template, node, 0, "ac")).toBe("ac-load");      // 表里已有
    expect(associationFor(template, node, 1, "dc")).toBe("dc-generator");  // 缺位 → 按 dc 补
    expect(associationFor(template, node, 2, "h2")).toBe("h2-source");     // 缺位 → 按 h2 补
  });

  test("补齐位取自端子表而非入参 type:同一 index 换传别的 type,结果不变", () => {
    // 若兜底改看入参,第 1 位传 heat 会得到 heat-source —— 断言它仍是 dc-generator
    const node = containerNode(["ac", "dc"]);
    const template = containerTemplate(["ac-load"]);
    expect(associationFor(template, node, 1, "dc")).toBe("dc-generator");
    expect(associationFor(template, node, 1, "heat")).toBe("dc-generator");
  });

  test("非容器模板:一律用该端子类型的默认关联,不看模板里的关联表", () => {
    const node = containerNode(["ac"]);
    expect(associationFor({ isContainer: false, terminalAssociations: ["ac-load"] }, node, 0, "ac")).toBe("ac-generator");
  });

  test("索引超出端子数:同样退回默认关联(不会给 undefined)", () => {
    const node = containerNode(["ac"]);
    expect(associationFor(containerTemplate(["ac-load"]), node, 5, "ac")).toBe("ac-generator");
  });
});

// ─── 本批补覆盖:createEnsureDraggingUndoSnapshot 的已捕获守卫 / 拖动集缺失 / 多选标签 ──
// 对应源文件 L70、L74、L75。三条都是「同一行里的不同档」,所以每条都必须两侧都断:
// 期望值若恰好等于兜底值(空串),单侧断言没有鉴别力。
describe("拖动撤销快照的标签与守卫 (源 L70 / L74 / L75)", () => {
  const mkDragUndoScope = (over: Record<string, unknown> = {}) => {
    const scope: any = {
      dragUndoCapturedRef: { current: false },
      draggingRef: { current: { nodeIds: ["m1"], edgeIds: [], affectedEdges: [] } },
      nodeById: new Map<string, any>(),
      nodes: [],
      pushUndoSnapshot: vi.fn(),
      undoScopeForDraggingState: vi.fn(() => ({ nodeIds: ["m1"], edgeIds: [] })),
      ...over,
    };
    return scope;
  };

  // L70 真臂:上一次拖动已经压过快照 —— 同一批拖动再触发一次撤销快照会把撤销栈冲成两条。
  test("已捕获过 → 早退:既不压快照也不算作用域", () => {
    const scope = mkDragUndoScope({ dragUndoCapturedRef: { current: true } });
    createEnsureDraggingUndoSnapshot(scope)();
    expect(scope.pushUndoSnapshot).not.toHaveBeenCalled();
    expect(scope.undoScopeForDraggingState).not.toHaveBeenCalled();
  });

  // L70 假臂对照:没捕获过就一定会压,并把守卫翻面(这是上面那条断言的鉴别力来源)
  test("未捕获 → 压一条快照并置位捕获标记", () => {
    const scope = mkDragUndoScope();
    createEnsureDraggingUndoSnapshot(scope)();
    expect(scope.pushUndoSnapshot).toHaveBeenCalledTimes(1);
    expect(scope.pushUndoSnapshot.mock.calls[0][3]).toBe("移动设备");
    expect(scope.dragUndoCapturedRef.current).toBe(true);
  });

  // L74 右臂:输入必须是「键/值根本不存在」,给 {nodeIds: []} 会让 ?? 短路取左臂、右臂从未求值。
  test("无拖动态(draggingRef.current 为 undefined)→ nodeIds 走 ?? [] 右臂,标签是空串", () => {
    const scope = mkDragUndoScope({ draggingRef: { current: undefined } });
    expect(() => createEnsureDraggingUndoSnapshot(scope)()).not.toThrow();
    expect(scope.pushUndoSnapshot).toHaveBeenCalledTimes(1);
    expect(scope.pushUndoSnapshot.mock.calls[0][4]).toBe("");
  });

  // L75 外层真臂(单选):标签来自 nodeById 查到的 idx + 名称,和下面多选那档不是同一个值
  test("单选拖动 → 标签是 idx 加名称", () => {
    const scope = mkDragUndoScope({
      nodeById: new Map<string, any>([["m1", { id: "m1", name: "负载1", params: { idx: 7 } }]]),
    });
    createEnsureDraggingUndoSnapshot(scope)();
    expect(scope.pushUndoSnapshot.mock.calls[0][4]).toBe("7 负载1");
  });

  // L75 内层三元真臂(多选):期望值 "3 个设备" 与 L74 的空串、L75 单选档都不同
  test("多选拖动 → 标签是 N 个设备", () => {
    const scope = mkDragUndoScope({
      draggingRef: { current: { nodeIds: ["m1", "m2", "m3"], edgeIds: [], affectedEdges: [] } },
    });
    createEnsureDraggingUndoSnapshot(scope)();
    expect(scope.pushUndoSnapshot.mock.calls[0][4]).toBe("3 个设备");
  });

  // L75 里还剩的一条臂:节点名缺失 → 名称槽的 ?? "" 右臂。
  // 判别值刻意取 "7"(trim 之后不带空格),不是兜底值本身,
  // 否则删掉 ?? "" 与保留它产出相同、断言恒绿。
  test("单选且节点无名称 → 标签只剩 idx(名称槽走 ?? 右臂)", () => {
    const scope = mkDragUndoScope({
      nodeById: new Map<string, any>([["m1", { id: "m1", params: { idx: 7 } }]]),
    });
    createEnsureDraggingUndoSnapshot(scope)();
    expect(scope.pushUndoSnapshot.mock.calls[0][4]).toBe("7");
  });
});

// ─── 本批补覆盖:createCurrentProject 的 idx 省略分支 (源 L205) ─────────────────
// projectIdx > 0 才写 idx。projectIdx 为 0/负数时写出去会被后端当成真实全局索引,
// 所以判据是「键存在与否」而不是「值是不是 0」。
describe("createCurrentProject 的 idx 省略分支 (源 L205)", () => {
  test("projectIdx 为 0 → 不写 idx 键", () => {
    const project = createCurrentProject(makeScope({ projectIdx: 0 }))() as any;
    expect(Object.prototype.hasOwnProperty.call(project, "idx")).toBe(false);
    expect(project.name).toBe("宿主模型");
  });

  test("projectIdx 为负数 → 同样不写 idx 键", () => {
    const project = createCurrentProject(makeScope({ projectIdx: -4 }))() as any;
    expect(Object.prototype.hasOwnProperty.call(project, "idx")).toBe(false);
  });

  test("对照:projectIdx 为 7 → 写出 idx 7(证明上面两条靠的是条件而不是缺字段)", () => {
    const project = createCurrentProject(makeScope({ projectIdx: 7 }))() as any;
    expect(Object.prototype.hasOwnProperty.call(project, "idx")).toBe(true);
    expect(project.idx).toBe(7);
  });
});

// ─── 本批补覆盖:createQueuePendingBlankCanvasDeselect 的缺 ref 早退 (源 L288) ──
// 两侧都断:只有「有 ref 时真的登记了坐标」才能证明这条守卫不是恒真。
describe("空白画布待清除登记 (源 L288)", () => {
  test("没有 pendingBlankCanvasDeselectRef → 早退,不抛", () => {
    const queue = createQueuePendingBlankCanvasDeselect({} as any);
    expect(() => queue({ clientX: 120, clientY: 240 })).not.toThrow();
  });

  test("ref 在 → 登记指针坐标", () => {
    const ref: any = { current: null };
    const queue = createQueuePendingBlankCanvasDeselect({ pendingBlankCanvasDeselectRef: ref } as any);
    queue({ clientX: 120, clientY: 240 });
    expect(ref.current).toEqual({ clientX: 120, clientY: 240 });
  });
});

// ─── 本批补覆盖:createRequireEditMode 的 isEditMode 两档 (源 L345-L349) ────────
describe("createRequireEditMode (源 L345-L349)", () => {
  test("编辑模式 → 返回 true 且不写操作日志", () => {
    const writeOperationLog = vi.fn();
    expect(createRequireEditMode({ isEditMode: true, writeOperationLog })("删除设备")).toBe(true);
    expect(writeOperationLog).not.toHaveBeenCalled();
  });

  test("浏览模式 → 返回 false 并把 action 拼进提示(action 透传)", () => {
    const writeOperationLog = vi.fn();
    expect(createRequireEditMode({ isEditMode: false, writeOperationLog })("删除设备")).toBe(false);
    expect(writeOperationLog).toHaveBeenCalledWith("浏览模式下不能删除设备，请先切换到编辑模式");
  });
});

  // ─── 本批补覆盖:createPersistDeviceLibraryChange 的后台未加载早退 (源 L387) ───
// 承重点是早退时必须把 lastPersisted 复位:若残留 payload,下一次调用会命中
// 「已持久化」短路而永远不再真正落盘。
describe("createPersistDeviceLibraryChange 后台未加载早退 (源 L387)", () => {
  const mkPersistScope = (backendLoaded: boolean) => {
    const scope: any = {
      backendDeviceLibraryLoadedRef: { current: backendLoaded },
      lastPersistedDeviceLibraryPayloadRef: { current: null },
      suppressNextBackendDeviceLibrarySyncRef: { current: true },
      normalizeDeviceLibraryPersistencePayload: (payload: unknown) => ({ stamped: true, ...(payload as any) }),
      serializeDeviceLibraryForStorage: (value: unknown) => `payload:${JSON.stringify(value)}`,
      writeLocalDeviceLibraryPersistencePayload: vi.fn(),
      saveBackendDeviceLibraryPayload: vi.fn(() => Promise.resolve(true)),
      writeOperationLog: vi.fn(),
    };
    return scope;
  };

  test("后台未加载 → 落 Promise(false)、不复位就不落盘、写失败提示", async () => {
    const scope = mkPersistScope(false);
    const persist = createPersistDeviceLibraryChange(scope);
    await expect(persist({ customGraphTemplates: [] }, { failure: "模板库自动保存到后台失败" })).resolves.toBe(false);
    expect(scope.saveBackendDeviceLibraryPayload).not.toHaveBeenCalled();
    expect(scope.writeOperationLog).toHaveBeenCalledWith("模板库自动保存到后台失败");
    expect(scope.lastPersistedDeviceLibraryPayloadRef.current).toBeNull();
  });

  test("对照:后台已加载 → 真的落盘并落 success 提示", async () => {
    const scope = mkPersistScope(true);
    const persist = createPersistDeviceLibraryChange(scope);
    await expect(persist({ customGraphTemplates: [] }, { success: "模板库已自动保存到后台" })).resolves.toBe(true);
    expect(scope.saveBackendDeviceLibraryPayload).toHaveBeenCalledTimes(1);
    expect(scope.writeOperationLog).toHaveBeenCalledWith("模板库已自动保存到后台");
  });
});
