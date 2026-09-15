import { describe, expect, test, vi } from "vitest";
import { createProgrammaticAddDevice, createProgrammaticCreateScheme, createProgrammaticCreateBlankProject, createProgrammaticSelectDevices, createProgrammaticGroupSelected, createProgrammaticDeleteDevices, createProgrammaticUpdateDeviceProperty, createProgrammaticSave, createProgrammaticSaveSelectionAsTemplate } from "./appControlFactories";
import { DEVICE_LIBRARY_BY_KIND, createDefaultNode, createSavedScheme, createSavedProject } from "../model";
import { normalizeProjectMeasurements } from "../measurements";

// mock __appScope：捕获 pushUndoSnapshot 调用与 setNodes 追加的节点
function createMockScope() {
  const calls: { undo: boolean; added: any[] } = { undo: false, added: [] };
  return {
    scope: {
      pushUndoSnapshot: () => {
        calls.undo = true;
      },
      setNodes: (updater: any) => {
        // setNodes 接收 updater 函数，用空数组 prev 触发追加
        const prev: any[] = [];
        const next = typeof updater === "function" ? updater(prev) : updater;
        calls.added = next;
      }
    },
    calls
  };
}

describe("programmaticAddDevice", () => {
  test("合法 kind 返回 id 且追加节点 + 压栈", () => {
    const { scope, calls } = createMockScope();
    const addDevice = createProgrammaticAddDevice(scope);
    // 取一个真实存在的 DeviceKind
    const kind = DEVICE_LIBRARY_BY_KIND.keys().next().value as string;
    const result = addDevice(kind, 100, 200);
    expect(result.id).toBeTruthy();
    expect(calls.undo).toBe(true);
    expect(calls.added).toHaveLength(1);
    expect(calls.added[0].id).toBe(result.id);
    expect(calls.added[0].kind).toBe(kind);
    expect(calls.added[0].position).toEqual({ x: 100, y: 200 });
  });

  test("缺省位置默认 {0,0}", () => {
    const { scope, calls } = createMockScope();
    const addDevice = createProgrammaticAddDevice(scope);
    const kind = DEVICE_LIBRARY_BY_KIND.keys().next().value as string;
    addDevice(kind);
    expect(calls.added[0].position).toEqual({ x: 0, y: 0 });
  });

  test("kind 缺省抛 bad-request", () => {
    const { scope } = createMockScope();
    const addDevice = createProgrammaticAddDevice(scope);
    expect(() => addDevice("", 0, 0)).toThrow(/kind 必填/);
    try {
      addDevice("");
    } catch (e: any) {
      expect(e.code).toBe("bad-request");
    }
  });

  test("未知 kind 抛 bad-request", () => {
    const { scope } = createMockScope();
    const addDevice = createProgrammaticAddDevice(scope);
    expect(() => addDevice("nonexistent-kind", 0, 0)).toThrow(/未知图元类型/);
    try {
      addDevice("nonexistent-kind");
    } catch (e: any) {
      expect(e.code).toBe("bad-request");
    }
  });

  test("attrs override 合并到节点（顶层字段 + params 深合）", () => {
    const { scope, calls } = createMockScope();
    const addDevice = createProgrammaticAddDevice(scope);
    const kind = DEVICE_LIBRARY_BY_KIND.keys().next().value as string;
    addDevice(kind, 10, 20, { name: "自定义名", rotation: 45, params: { extra: "x" } });
    const node = calls.added[0];
    expect(node.name).toBe("自定义名");
    expect(node.rotation).toBe(45);
    expect(node.params).toHaveProperty("extra", "x");
    // params 原有默认字段保留
    expect(node.params).toBeDefined();
  });

  test("节点含 terminals（createDefaultNode 已构造端子）", () => {
    const { scope, calls } = createMockScope();
    const addDevice = createProgrammaticAddDevice(scope);
    const kind = DEVICE_LIBRARY_BY_KIND.keys().next().value as string;
    addDevice(kind, 0, 0);
    expect(Array.isArray(calls.added[0].terminals)).toBe(true);
  });

  // 落点在容器矩形内 → 走与拖入/粘贴同一归属出口;不接会被 enforce 挤出容器(画布上「加了又弹出去」)
  test("落点在容器矩形内 → 并入该容器,容器随成员重算", () => {
    const container = {
      ...createDefaultNode("ac-vpp-box", { x: 0, y: 0 }),
      id: "c1",
      position: { x: 0, y: 0 },
      size: { width: 200, height: 200 },
      params: { _labelVisible: "0" }
    };
    let added: any[] = [];
    const addDevice = createProgrammaticAddDevice({
      pushUndoSnapshot: () => undefined,
      setNodes: (updater: any) => {
        added = typeof updater === "function" ? updater([container]) : updater;
      }
    } as any);

    addDevice("ac-load", 30, 30);

    const created = added.find((node: any) => node.kind === "ac-load")!;
    expect(created.containerId).toBe("c1");
    const nextContainer = added.find((node: any) => node.id === "c1")!;
    expect(nextContainer.containerId).toBeUndefined(); // 容器自身不写归属(不允许嵌套)
    // 容器几何随成员重算(不再是入参的 200×200),且新矩形包住成员中心
    expect(nextContainer.size).not.toEqual({ width: 200, height: 200 });
    const rect = {
      x1: nextContainer.position.x - nextContainer.size.width / 2,
      y1: nextContainer.position.y - nextContainer.size.height / 2,
      x2: nextContainer.position.x + nextContainer.size.width / 2,
      y2: nextContainer.position.y + nextContainer.size.height / 2
    };
    expect(created.position.x).toBeGreaterThanOrEqual(rect.x1);
    expect(created.position.x).toBeLessThanOrEqual(rect.x2);
    expect(created.position.y).toBeGreaterThanOrEqual(rect.y1);
    expect(created.position.y).toBeLessThanOrEqual(rect.y2);
  });
});

// mock __appScope for createScheme：捕获 setSchemes updater 产物、selectSingleScheme 调用
function createSchemeMockScope() {
  const calls: { schemesSet: boolean; selectedSchemeId: string | null; insertedRecord: any } = {
    schemesSet: false,
    selectedSchemeId: null,
    insertedRecord: null
  };
  return {
    scope: {
      createSavedScheme,
      hasSameName: (name: string, names: string[]) => names.includes(name),
      insertChildSavedScheme: (current: any[], _parentId: string, record: any) => {
        calls.insertedRecord = record;
        return [...current, record];
      },
      savedChildSchemeNames: (schemes: any[], _parentId: string) => schemes.map((s) => s.name),
      schemePathForScheme: (schemeId: string) => (schemeId ? ["父方案"] : []),
      schemes: [] as any[],
      selectSingleScheme: (id: string) => {
        calls.selectedSchemeId = id;
      },
      setSchemes: (updater: any) => {
        calls.schemesSet = true;
        const prev: any[] = [];
        updater(prev);
      }
    },
    calls
  };
}

describe("programmaticCreateScheme", () => {
  test("合法创建返回 {id,name,path} 且 setSchemes 被调、selectSingleScheme 被调", () => {
    const { scope, calls } = createSchemeMockScope();
    const createScheme = createProgrammaticCreateScheme(scope);
    const result = createScheme("新方案");
    expect(result.id).toBeTruthy();
    expect(result.name).toBe("新方案");
    expect(result.path).toEqual(["新方案"]);
    expect(calls.schemesSet).toBe(true);
    expect(calls.selectedSchemeId).toBe(result.id);
    expect(calls.insertedRecord.id).toBe(result.id);
  });

  test("指定 parentSchemeId 时 path 包含父路径", () => {
    const { scope, calls } = createSchemeMockScope();
    const createScheme = createProgrammaticCreateScheme(scope);
    const result = createScheme("子方案", "parent-1");
    expect(result.path).toEqual(["父方案", "子方案"]);
  });

  test("name 空抛 bad-request", () => {
    const { scope } = createSchemeMockScope();
    const createScheme = createProgrammaticCreateScheme(scope);
    expect(() => createScheme("", "p1")).toThrow(/name 必填/);
    try {
      createScheme("  ");
    } catch (e: any) {
      expect(e.code).toBe("bad-request");
    }
  });

  test("重名抛 bad-request", () => {
    const { scope } = createSchemeMockScope();
    scope.schemes = [{ id: "p1", name: "已存在方案", projects: [], children: [] }];
    scope.savedChildSchemeNames = (_schemes: any[], _parentId: string) => ["已存在方案"];
    const createScheme = createProgrammaticCreateScheme(scope);
    expect(() => createScheme("已存在方案", "p1")).toThrow(/方案名称重复/);
    try {
      createScheme("已存在方案", "p1");
    } catch (e: any) {
      expect(e.code).toBe("bad-request");
    }
  });
});

// mock __appScope for createBlankProject：捕获 upsert/select/requestLoad 调用
function createBlankProjectMockScope() {
  const calls: { upserted: boolean; selected: { schemeId: string; projectId: string } | null; loaded: { project: any; schemeId: string } | null } = {
    upserted: false,
    selected: null,
    loaded: null
  };
  const schemes: any[] = [{ id: "s1", name: "方案A", projects: [], children: [] }];
  return {
    scope: {
      DEFAULT_CANVAS_WIDTH: 1920,
      DEFAULT_CANVAS_HEIGHT: 1080,
      DEFAULT_CANVAS_BACKGROUND: "#fff",
      DEFAULT_POWER_UNIT: "MW",
      DEFAULT_VOLTAGE_UNIT: "kV",
      DEFAULT_CURRENT_UNIT: "A",
      DEFAULT_POWER_BASE_VALUE: 100,
      MODEL_TYPES: ["微网", "厂站", "馈线", "台区", "其他"],
      createSavedProject,
      findSavedSchemeById: (list: any[], id: string) => list.find((s) => s.id === id) ?? null,
      hasSameName: (name: string, names: string[]) => names.includes(name),
      requestLoadSavedProject: (project: any, schemeId: string) => {
        calls.loaded = { project, schemeId };
      },
      schemePathForScheme: (schemeId: string) => [schemes.find((scheme) => scheme.id === schemeId)?.name ?? "方案A"],
      saveBackendProjectRecord: async (_path: string[], record: any) => ({
        ...record,
        project: { ...record.project, idx: 1 }
      }),
      schemes,
      selectSingleProject: (schemeId: string, projectId: string) => {
        calls.selected = { schemeId, projectId };
      },
      setSchemes: (updater: any) => {
        calls.upserted = true;
        updater(schemes);
      },
      upsertSavedProjectInScheme: (current: any[], _schemeId: string, _record: any) => current
    },
    calls
  };
}

describe("programmaticCreateBlankProject", () => {
  test("合法创建直接落盘并返回类型和全局 idx", async () => {
    const { scope, calls } = createBlankProjectMockScope();
    const createBlankProject = createProgrammaticCreateBlankProject(scope);
    const result = await createBlankProject("新模型", undefined, "厂站");
    expect(result.id).toBeTruthy();
    expect(result.name).toBe("新模型");
    expect(result.schemeId).toBe("s1");
    expect(result.modelType).toBe("厂站");
    expect(result.idx).toBe(1);
    expect(calls.upserted).toBe(true);
    expect(calls.selected).toEqual({ schemeId: "s1", projectId: result.id });
    expect(calls.loaded?.schemeId).toBe("s1");
  });

  test("指定 schemeId 时定位目标方案", async () => {
    const { scope } = createBlankProjectMockScope();
    scope.schemes = [
      { id: "s1", name: "方案A", projects: [], children: [] },
      { id: "s2", name: "方案B", projects: [], children: [] }
    ];
    const createBlankProject = createProgrammaticCreateBlankProject(scope);
    const result = await createBlankProject("模型X", "s2", "馈线");
    expect(result.schemeId).toBe("s2");
  });

  test("name 空抛 bad-request", async () => {
    const { scope } = createBlankProjectMockScope();
    const createBlankProject = createProgrammaticCreateBlankProject(scope);
    await expect(createBlankProject("")).rejects.toThrow(/name 必填/);
    await expect(createBlankProject("  ")).rejects.toMatchObject({ code: "bad-request" });
  });

  test("重名抛 bad-request", async () => {
    const { scope } = createBlankProjectMockScope();
    scope.schemes = [{ id: "s1", name: "方案A", projects: [{ name: "已存在模型" }], children: [] }];
    const createBlankProject = createProgrammaticCreateBlankProject(scope);
    await expect(createBlankProject("已存在模型")).rejects.toThrow(/模型名称重复/);
    await expect(createBlankProject("已存在模型")).rejects.toMatchObject({ code: "bad-request" });
  });

  test("schemes 空抛 bad-request", async () => {
    const { scope } = createBlankProjectMockScope();
    scope.schemes = [];
    const createBlankProject = createProgrammaticCreateBlankProject(scope);
    await expect(createBlankProject("模型")).rejects.toThrow(/无可用方案/);
    await expect(createBlankProject("模型")).rejects.toMatchObject({ code: "bad-request" });
  });
});

// mock __appScope for selectDevices：捕获 setSelectedNodeIds 调用
function createSelectMockScope(initialSelected: string[] = [], nodeIds: string[] = ["n1", "n2", "n3"]) {
  const calls: { selectedIds: string[] | null } = { selectedIds: null };
  return {
    scope: {
      selectedNodeIds: initialSelected,
      nodes: nodeIds.map((id) => ({ id, kind: "static-text" })),
      setSelectedNodeIds: (ids: string[]) => {
        calls.selectedIds = ids;
      }
    },
    calls
  };
}

describe("programmaticSelectDevices", () => {
  test("set 模式直接替换选中（仅存在的 id）", () => {
    const { scope, calls } = createSelectMockScope(["old1"]);
    const select = createProgrammaticSelectDevices(scope);
    const result = select(["n1", "n2"]);
    expect(result.selectedIds).toEqual(["n1", "n2"]);
    expect(result.validIds).toEqual(["n1", "n2"]);
    expect(result.invalidIds).toEqual([]);
    expect(calls.selectedIds).toEqual(["n1", "n2"]);
  });

  test("add 模式合并去重（仅存在的 id）", () => {
    const { scope, calls } = createSelectMockScope(["n1"]);
    const select = createProgrammaticSelectDevices(scope);
    const result = select(["n2", "n3"], "add");
    expect(result.selectedIds).toEqual(["n1", "n2", "n3"]);
    expect(result.validIds).toEqual(["n2", "n3"]);
    expect(result.invalidIds).toEqual([]);
  });

  test("toggle 模式切换（仅存在的 id）", () => {
    const { scope } = createSelectMockScope(["n1", "n2"]);
    const select = createProgrammaticSelectDevices(scope);
    const result = select(["n2", "n3"], "toggle");
    expect(result.selectedIds).toEqual(["n1", "n3"]);
  });

  test("不存在的 id 记录到 invalidIds", () => {
    const { scope } = createSelectMockScope();
    const select = createProgrammaticSelectDevices(scope);
    const result = select(["n1", "fake1", "n2", "fake2"]);
    expect(result.validIds).toEqual(["n1", "n2"]);
    expect(result.invalidIds).toEqual(["fake1", "fake2"]);
    expect(result.selectedIds).toEqual(["n1", "n2"]);
  });

  test("全部 id 不存在 → selectedIds 为空", () => {
    const { scope } = createSelectMockScope();
    const select = createProgrammaticSelectDevices(scope);
    const result = select(["fake1", "fake2"]);
    expect(result.validIds).toEqual([]);
    expect(result.invalidIds).toEqual(["fake1", "fake2"]);
    expect(result.selectedIds).toEqual([]);
  });

  test("缺省 mode 为 set", () => {
    const { scope } = createSelectMockScope(["old"]);
    const select = createProgrammaticSelectDevices(scope);
    const result = select(["n1"]);
    expect(result.selectedIds).toEqual(["n1"]);
  });

  test("非数组 ids 抛 bad-request", () => {
    const { scope } = createSelectMockScope();
    const select = createProgrammaticSelectDevices(scope);
    expect(() => select("not-array" as any)).toThrow(/ids 须为字符串数组/);
    try {
      select("not-array" as any);
    } catch (e: any) {
      expect(e.code).toBe("bad-request");
    }
  });

  test("未知 mode 抛 bad-request", () => {
    const { scope } = createSelectMockScope();
    const select = createProgrammaticSelectDevices(scope);
    expect(() => select(["n1"], "unknown" as any)).toThrow(/未知选中模式/);
    try {
      select(["n1"], "unknown" as any);
    } catch (e: any) {
      expect(e.code).toBe("bad-request");
    }
  });
});

// mock __appScope for groupSelected：模拟 createCanvasGroupFromSelection + setGroups 等
function createGroupMockScope(selectedNodeIds: string[] = [], selectedEdgeIds: string[] = []) {
  const calls: { undo: boolean; groupsSet: any; selectionScope: string | null; selectedNodeIds: string[] | null } = {
    undo: false,
    groupsSet: null,
    selectionScope: null,
    selectedNodeIds: null
  };
  const nodes = selectedNodeIds.map((id) => ({ id, kind: "static-text" }));
  const edges: any[] = [];
  const groups: any[] = [];
  return {
    scope: {
      activeSelectedNodeIds: selectedNodeIds,
      activeSelectedEdgeIds: selectedEdgeIds,
      groups,
      nodes,
      edges,
      createCanvasGroupFromSelection: (_groups: any, nodeIds: string[], edgeIds: string[], createId: () => string) => {
        if (nodeIds.length + edgeIds.length < 2) return { groups: [..._groups], group: null };
        const id = createId();
        const group = { id, name: "组合1", nodeIds, edgeIds };
        return { groups: [..._groups, group], group };
      },
      normalizeModelGroups: (g: any) => g,
      pushUndoSnapshot: () => { calls.undo = true; },
      setGroups: (g: any) => { calls.groupsSet = g; },
      setCanvasSelectionScope: (s: string) => { calls.selectionScope = s; },
      setSelectedNodeIds: (ids: string[]) => { calls.selectedNodeIds = ids; },
      setSelectedEdgeId: () => {},
      setSelectedEdgeIds: () => {},
      expandSelectionByGroups: (_groups: any, nodeIds: string[], edgeIds: string[]) => ({ nodeIds, edgeIds })
    },
    calls
  };
}

describe("programmaticGroupSelected", () => {
  test("选中 >=2 图元 → 组合成功返回 {groupId,name} + 压栈 + setGroups", () => {
    const { scope, calls } = createGroupMockScope(["n1", "n2"]);
    const group = createProgrammaticGroupSelected(scope);
    const result = group();
    expect(result.groupId).toBeTruthy();
    expect(result.name).toBe("组合1");
    expect(calls.undo).toBe(true);
    expect(calls.groupsSet).not.toBeNull();
    expect(calls.selectionScope).toBe("group");
  });

  test("选中 <2 图元抛 control-failed", () => {
    const { scope } = createGroupMockScope(["n1"]);
    const group = createProgrammaticGroupSelected(scope);
    expect(() => group()).toThrow(/至少选中 2 个图元/);
    try {
      group();
    } catch (e: any) {
      expect(e.code).toBe("control-failed");
    }
  });

  test("空选中抛 control-failed", () => {
    const { scope } = createGroupMockScope();
    const group = createProgrammaticGroupSelected(scope);
    expect(() => group()).toThrow(/至少选中 2 个图元/);
    try {
      group();
    } catch (e: any) {
      expect(e.code).toBe("control-failed");
    }
  });
});

// mock __appScope for deleteDevices：模拟 deleteNodesWithConnectedEdges + setters
function createDeleteMockScope(nodeIds: string[] = [], selectedNodeIds: string[] = [], customNodes?: any[]) {
  const calls: { undo: boolean; graphSet: boolean; groupsSet: any; selectedCleared: boolean; nodes: any[] } = {
    undo: false,
    graphSet: false,
    groupsSet: null,
    selectedCleared: false,
    nodes: []
  };
  const nodes = customNodes ?? nodeIds.map((id) => ({ id, kind: "static-text" }));
  const edges: any[] = [];
  return {
    scope: {
      activeSelectedNodeIds: selectedNodeIds,
      nodes,
      edges,
      groups: [],
      deleteNodesWithConnectedEdges: (ns: any[], es: any[], ids: string[]) => ({
        nodes: ns.filter((n) => !ids.includes(n.id)),
        edges: es
      }),
      edgeListForNodeIds: () => [],
      edgeById: new Map(),
      markRouteEdgesDirty: () => {},
      markStoredRouteEdgesDirty: () => {},
      markBusTerminalSyncDirtyForEdges: () => {},
      normalizeModelGroups: (g: any) => g,
      normalizeProjectMeasurements: (m: any) => m,
      removeGraphicsFromGroups: (g: any) => g,
      pushUndoSnapshot: () => { calls.undo = true; },
      setGraphArrays: (n: any[]) => { calls.graphSet = true; calls.nodes = n; },
      setEdges: () => {},
      setGroups: (g: any) => { calls.groupsSet = g; },
      setProjectMeasurements: () => {},
      setCanvasSelectionScope: () => {},
      setSelectedNodeIds: () => { calls.selectedCleared = true; },
      setSelectedEdgeId: () => {},
      setSelectedEdgeIds: () => {}
    },
    calls
  };
}

describe("programmaticDeleteDevices", () => {
  test("指定 ids 删除 → 返回 deletedIds + 压栈 + setGraphArrays", () => {
    const { scope, calls } = createDeleteMockScope(["n1", "n2", "n3"], ["n1", "n2"]);
    const del = createProgrammaticDeleteDevices(scope);
    const result = del(["n1", "n2"]);
    expect(result.deletedIds).toEqual(["n1", "n2"]);
    expect(calls.undo).toBe(true);
    expect(calls.graphSet).toBe(true);
  });

  test("ids 缺省取 activeSelectedNodeIds", () => {
    const { scope } = createDeleteMockScope(["n1", "n2"], ["n1", "n2"]);
    const del = createProgrammaticDeleteDevices(scope);
    const result = del();
    expect(result.deletedIds).toEqual(["n1", "n2"]);
  });

  test("无图元可删抛 control-failed", () => {
    const { scope } = createDeleteMockScope([], []);
    const del = createProgrammaticDeleteDevices(scope);
    expect(() => del()).toThrow(/无可删除图元/);
    try {
      del();
    } catch (e: any) {
      expect(e.code).toBe("control-failed");
    }
  });

  // spec「其它交互边界」:删除容器 → 成员 containerId 全清(成员保留)。控制台端点无人可问,
  // 故无确认框,但收尾必须与界面删除入口同源,否则悬空值随保存持久化。
  test("删除容器 → 成员 containerId 清空(成员保留,无确认框)", () => {
    const nodes = [
      { id: "c1", kind: "ac-vpp-box", name: "虚拟电厂1", params: {} },
      { id: "m1", kind: "ac-load", name: "m1", params: {}, containerId: "c1" },
      { id: "o1", kind: "ac-load", name: "o1", params: {} }
    ];
    const { scope, calls } = createDeleteMockScope([], [], nodes);
    const result = createProgrammaticDeleteDevices(scope)(["c1"]);
    expect(result.deletedIds).toEqual(["c1"]);
    expect(calls.nodes.map((n) => n.id)).toEqual(["m1", "o1"]);
    expect(calls.nodes[0].containerId).toBeUndefined();
  });

  // 删成员后容器必须收缩(半程 enforce:只重算几何、不挤出) —— 与界面删除入口同源
  test("删除成员 → 存留容器几何重算收缩", () => {
    const nodes = [
      { id: "c1", kind: "ac-vpp-box", name: "虚拟电厂1", position: { x: 0, y: 0 }, size: { width: 200, height: 200 }, rotation: 0, scale: 1, params: { _labelVisible: "0" }, terminals: [] },
      { id: "m1", kind: "ac-load", name: "m1", position: { x: 0, y: 0 }, size: { width: 40, height: 30 }, rotation: 0, scale: 1, params: { _labelVisible: "0" }, terminals: [], containerId: "c1" }
    ];
    const { scope, calls } = createDeleteMockScope([], [], nodes);
    createProgrammaticDeleteDevices(scope)(["m1"]);
    expect(calls.nodes.map((n) => n.id)).toEqual(["c1"]);
    expect(calls.nodes[0].size).toEqual({ width: 180, height: 112 });
  });
});

// mock __appScope for updateDeviceProperty
function createUpdateMockScope(nodeIds: string[] = []) {
  const calls: { undo: boolean; updatedNode: any; measurements: any } = { undo: false, updatedNode: null, measurements: null };
  const nodes = nodeIds.map((id) => ({ id, kind: "static-text", name: "orig", params: { a: 1 } }));
  return {
    scope: {
      nodes,
      // 该端点可写 is_gateway/bound_device_id → 补丁会喂量测归一化;桩里透传/捕获即可
      normalizeProjectMeasurements: (measurements: any) => measurements,
      setProjectMeasurements: (updater: any) => { calls.measurements = updater({ version: 1, groups: [] }); },
      updateGraphNodeById: (id: string, updater: (n: any) => any) => {
        calls.updatedNode = updater(nodes.find((n) => n.id === id));
      },
      pushUndoSnapshot: () => { calls.undo = true; }
    },
    calls
  };
}

describe("programmaticUpdateDeviceProperty", () => {
  test("已有线路连接时拒绝通过控制接口修改 model_id", () => {
    const node = createDefaultNode("dc-district-load", { x: 100, y: 100 });
    node.params.model_id = "33";
    const line = createDefaultNode("dc-routable-line", { x: 240, y: 100 });
    line.params._routableLineSourceNodeId = node.id;
    const updateGraphNodeById = vi.fn();
    const update = createProgrammaticUpdateDeviceProperty({
      nodes: [node, line],
      normalizeProjectMeasurements: (measurements: any) => measurements,
      pushUndoSnapshot: vi.fn(),
      setProjectMeasurements: vi.fn(),
      updateGraphNodeById
    });

    expect(() => update(node.id, "model", { params: { model_id: "34" } })).toThrow(/已有线路连接/);
    expect(updateGraphNodeById).not.toHaveBeenCalled();
  });

  test("graphic 类别合并字段 → 返回 patched 键列表 + 压栈", () => {
    const { scope, calls } = createUpdateMockScope(["n1"]);
    const update = createProgrammaticUpdateDeviceProperty(scope);
    const result = update("n1", "graphic", { rotation: 90, name: "新名称" });
    expect(result.id).toBe("n1");
    expect(result.category).toBe("graphic");
    expect(result.patched).toEqual(["rotation", "name"]);
    expect(calls.undo).toBe(true);
    expect(calls.updatedNode.rotation).toBe(90);
    expect(calls.updatedNode.name).toBe("新名称");
  });

  test("model 类别 params 深合", () => {
    const { scope, calls } = createUpdateMockScope(["n1"]);
    const update = createProgrammaticUpdateDeviceProperty(scope);
    update("n1", "model", { params: { b: 2 } });
    expect(calls.updatedNode.params).toEqual({ a: 1, b: 2 });
  });

  test("开关类 params 写 status/closed_status 单边时对称联动", () => {
    const sw = createDefaultNode("ac-switch", { x: 100, y: 100 });
    sw.params.closed_status = "1";
    const line = createDefaultNode("dc-routable-line", { x: 240, y: 100 });
    const calls: { updatedNode: any } = { updatedNode: null };
    const update = createProgrammaticUpdateDeviceProperty({
      nodes: [sw, line],
      normalizeProjectMeasurements: (measurements: any) => measurements,
      pushUndoSnapshot: vi.fn(),
      setProjectMeasurements: vi.fn(),
      updateGraphNodeById: (_id: string, updater: (n: any) => any) => {
        calls.updatedNode = updater(sw);
      }
    });

    // 单边写 status → closed_status 联动
    update(sw.id, "model", { params: { status: "0" } });
    expect(calls.updatedNode.params.status).toBe("0");
    expect(calls.updatedNode.params.closed_status).toBe("0");

    // 单边写 closed_status → status 联动
    update(sw.id, "model", { params: { closed_status: "1" } });
    expect(calls.updatedNode.params.closed_status).toBe("1");
    expect(calls.updatedNode.params.status).toBe("1");
  });

  test("图元不存在抛 not-found", () => {
    const { scope } = createUpdateMockScope(["n1"]);
    const update = createProgrammaticUpdateDeviceProperty(scope);
    expect(() => update("nonexistent", "graphic", { x: 0 })).toThrow(/不存在/);
    try {
      update("nonexistent", "graphic", { x: 0 });
    } catch (e: any) {
      expect(e.code).toBe("not-found");
    }
  });

  test("measurement 类别抛 not-implemented", () => {
    const { scope } = createUpdateMockScope(["n1"]);
    const update = createProgrammaticUpdateDeviceProperty(scope);
    expect(() => update("n1", "measurement", { x: 0 })).toThrow(/暂未实现/);
    try {
      update("n1", "measurement", { x: 0 });
    } catch (e: any) {
      expect(e.code).toBe("not-implemented");
    }
  });

  test("id 缺省抛 bad-request", () => {
    const { scope } = createUpdateMockScope(["n1"]);
    const update = createProgrammaticUpdateDeviceProperty(scope);
    expect(() => update("", "graphic", {})).toThrow(/id 必填/);
    try {
      update("", "graphic", {});
    } catch (e: any) {
      expect(e.code).toBe("bad-request");
    }
  });

  // /api/v1/control 是文档化第三方写路径:程序化建立/解除绑定后容器量测组必须跟上
  test("写 params.bound_device_id → 容器量测组随归一化建立(第三方绑定路径)", () => {
    const container = createDefaultNode("ac-vpp-box", { x: 0, y: 0 });
    container.params.is_gateway = "1";
    const member = createDefaultNode("ac-load", { x: 0, y: 0 });
    member.containerId = container.id;
    const nodes = [container, member] as any[];
    let captured: any;
    const update = createProgrammaticUpdateDeviceProperty({
      nodes,
      normalizeProjectMeasurements,
      pushUndoSnapshot: vi.fn(),
      setProjectMeasurements: (updater: any) => {
        captured = updater({
          version: 1,
          groups: [{ id: `measurement-${member.id}`, nodeId: member.id, items: [{ id: "p", measurementTypeId: "activePower", sourcePoint: "p", name: "有功" }] }]
        });
      },
      updateGraphNodeById: (id: string, updater: (n: any) => any) => {
        const target = nodes.find((n) => n.id === id);
        if (target) {
          updater(target);
        }
      }
    });

    update(container.id, "model", { params: { bound_device_id: member.id } });

    expect(captured.groups.some((g: any) => g.nodeId === container.id)).toBe(true);
  });

  test("写 params.is_gateway=0 关关口 → 容器量测组随归一化删除", () => {
    const container = createDefaultNode("ac-vpp-box", { x: 0, y: 0 });
    container.params.is_gateway = "1";
    container.params.bound_device_id = "m1";
    const member = createDefaultNode("ac-load", { x: 0, y: 0 });
    member.id = "m1";
    member.containerId = container.id;
    const nodes = [container, member] as any[];
    const item = { id: "p", measurementTypeId: "activePower", sourcePoint: "p", name: "有功" };
    let captured: any;
    const update = createProgrammaticUpdateDeviceProperty({
      nodes,
      normalizeProjectMeasurements,
      pushUndoSnapshot: vi.fn(),
      setProjectMeasurements: (updater: any) => {
        captured = updater({
          version: 1,
          groups: [
            { id: "measurement-m1", nodeId: "m1", items: [item] },
            { id: `measurement-${container.id}`, nodeId: container.id, items: [item] }
          ]
        });
      },
      updateGraphNodeById: (id: string, updater: (n: any) => any) => {
        const target = nodes.find((n) => n.id === id);
        if (target) {
          updater(target);
        }
      }
    });

    update(container.id, "model", { params: { is_gateway: "0" } });

    expect(captured.groups.some((g: any) => g.nodeId === container.id)).toBe(false);
    expect(captured.groups.some((g: any) => g.nodeId === "m1")).toBe(true);
  });
});

// mock __appScope for save：捕获 saveCurrentProject / saveSchemeTreeToBackend 调用
function createSaveMockScope() {
  const calls: { currentModel: boolean; schemeTree: boolean } = { currentModel: false, schemeTree: false };
  return {
    scope: {
      saveCurrentProject: () => { calls.currentModel = true; },
      saveSchemeTreeToBackend: () => { calls.schemeTree = true; }
    },
    calls
  };
}

describe("programmaticSave", () => {
  test("scope=currentModel 调 saveCurrentProject → 返回 {saved:true,scope}", () => {
    const { scope, calls } = createSaveMockScope();
    const save = createProgrammaticSave(scope);
    const result = save("currentModel");
    expect(result).toEqual({ saved: true, scope: "currentModel" });
    expect(calls.currentModel).toBe(true);
    expect(calls.schemeTree).toBe(false);
  });

  test("scope=schemeTree 调 saveSchemeTreeToBackend → 返回 {saved:true,scope}", () => {
    const { scope, calls } = createSaveMockScope();
    const save = createProgrammaticSave(scope);
    const result = save("schemeTree");
    expect(result).toEqual({ saved: true, scope: "schemeTree" });
    expect(calls.schemeTree).toBe(true);
    expect(calls.currentModel).toBe(false);
  });

  test("未知 scope 抛 bad-request", () => {
    const { scope } = createSaveMockScope();
    const save = createProgrammaticSave(scope);
    expect(() => save("unknown")).toThrow(/未知保存范围/);
    try {
      save("unknown");
    } catch (e: any) {
      expect(e.code).toBe("bad-request");
    }
  });
});

// mock __appScope for saveSelectionAsTemplate
function createSaveTemplateMockScope() {
  const calls: { persisted: boolean; templatesSet: any } = { persisted: false, templatesSet: null };
  const nodes = [
    { id: "n1", kind: "busbar", position: { x: 0, y: 0 }, terminals: [{ id: "t1", type: "ac", anchor: { x: 0, y: 0 } }] },
    { id: "n2", kind: "busbar", position: { x: 100, y: 0 }, terminals: [{ id: "t2", type: "ac", anchor: { x: 100, y: 0 } }] }
  ];
  const edges: any[] = [];
  const groups = [{ id: "g1", name: "组合1", nodeIds: ["n1", "n2"], edgeIds: [] }];
  return {
    scope: {
      MAX_CUSTOM_DEVICE_TERMINALS: 16,
      TERMINAL_TYPE_LIBRARY_LABELS: { ac: "交流" },
      activeLayerGroups: groups,
      activeSelectedGroupIds: ["g1"],
      buildCanvasClipboard: () => ({ nodes: nodes.map((n) => ({ ...n })), edges: [] }),
      canAddTemplateFromSelection: true,
      canvasClipboardBounds: () => ({ left: 0, top: 0, right: 100, bottom: 50 }),
      cloneGraphTemplateClipboard: (c: any) => c,
      createGroupDeviceIconSvg: () => "data:image/svg+xml;base64,xxx",
      customDeviceTemplates: [],
      defaultComponentLibraryForCategoryLibrary: () => "default_type",
      edges,
      groupDeviceExternalTerminals: () => [
        { type: "ac", anchor: { x: 0, y: 0 }, association: "ac-source", label: "端子1" },
        { type: "ac", anchor: { x: 100, y: 0 }, association: "ac-load", label: "端子2" }
      ],
      groupExpandedCanvasSelection: { nodeIds: ["n1", "n2"], edgeIds: [] },
      isValidComponentLibraryName: (s: string) => /^[A-Za-z][A-Za-z0-9_-]*$/.test(s),
      nextCustomTemplateKind: (ct: string) => `custom-${ct}-1`,
      normalizeCategoryLibraryName: (s: string) => s || "交流设备",
      normalizeComponentLibraryName: (s: string) => s,
      normalizeContainerTerminalAssociations: (types: string[], assocs: string[]) => assocs,
      persistDeviceLibraryChange: () => { calls.persisted = true; },
      routedEdges: [],
      setCustomDeviceTemplates: (t: any) => { calls.templatesSet = t; },
      visibleEdges: edges,
      visibleNodes: nodes,
      createDefaultCustomDeviceTerminalAnchors: (count: number, anchors: any[]) => anchors || []
    },
    calls
  };
}

describe("programmaticSaveSelectionAsTemplate", () => {
  test("合法参数 → 返回 templateKind + 持久化", () => {
    const { scope, calls } = createSaveTemplateMockScope();
    const save = createProgrammaticSaveSelectionAsTemplate(scope);
    const result = save({ name: "测试模板", componentLibrary: "test_device" });
    expect(result.templateKind).toBe("custom-test_device-1");
    expect(calls.persisted).toBe(true);
    expect(calls.templatesSet).not.toBeNull();
    expect(calls.templatesSet).toHaveLength(1);
    expect(calls.templatesSet[0].label).toBe("测试模板");
  });

  test("缺 name 抛 bad-request", () => {
    const { scope } = createSaveTemplateMockScope();
    const save = createProgrammaticSaveSelectionAsTemplate(scope);
    expect(() => save({ name: "", componentLibrary: "test" })).toThrow(/name 必填/);
    try {
      save({ name: "", componentLibrary: "test" });
    } catch (e: any) {
      expect(e.code).toBe("bad-request");
    }
  });

  test("缺 componentLibrary 抛 bad-request", () => {
    const { scope } = createSaveTemplateMockScope();
    const save = createProgrammaticSaveSelectionAsTemplate(scope);
    expect(() => save({ name: "模板", componentLibrary: "" })).toThrow(/componentLibrary 必填/);
    try {
      save({ name: "模板", componentLibrary: "" });
    } catch (e: any) {
      expect(e.code).toBe("bad-request");
    }
  });

  test("非法 componentLibrary 抛 bad-request", () => {
    const { scope } = createSaveTemplateMockScope();
    const save = createProgrammaticSaveSelectionAsTemplate(scope);
    expect(() => save({ name: "模板", componentLibrary: "123invalid" })).toThrow(/合法英文名称/);
    try {
      save({ name: "模板", componentLibrary: "123invalid" });
    } catch (e: any) {
      expect(e.code).toBe("bad-request");
    }
  });

  test("未选中组合抛 control-failed", () => {
    const { scope } = createSaveTemplateMockScope();
    scope.canAddTemplateFromSelection = false;
    const save = createProgrammaticSaveSelectionAsTemplate(scope);
    expect(() => save({ name: "模板", componentLibrary: "test" })).toThrow(/选中一个图元组合/);
    try {
      save({ name: "模板", componentLibrary: "test" });
    } catch (e: any) {
      expect(e.code).toBe("control-failed");
    }
  });
});
