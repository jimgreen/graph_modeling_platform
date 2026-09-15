// createCurrentProject 输出 backgroundProjectIdx：服务端靠它定位背景模型（前端 id 服务端无法解析）
import { describe, expect, test, vi } from "vitest";
import { createCurrentProject, createEnsureDraggingUndoSnapshot } from "./appSelectionDragFactories";
import { createUndoGraphSnapshotPatchPlan } from "./appGraphMeasurementFactories";

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
const bareNode = (id: string, kind: string, extra: Record<string, unknown> = {}) => ({
  id, kind, name: id, position: { x: 0, y: 0 }, size: { width: 40, height: 30 },
  rotation: 0, scale: 1, params: {}, terminals: [], ...extra,
});

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
