import { describe, expect, test, vi } from "vitest";
import { createProgrammaticAddDevice, createProgrammaticCreateScheme, createProgrammaticCreateBlankProject, createProgrammaticSelectDevices, createProgrammaticGroupSelected } from "./appControlFactories";
import { DEVICE_LIBRARY_BY_KIND, createSavedScheme, createSavedProject } from "../model";

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
      createSavedProject,
      findSavedSchemeById: (list: any[], id: string) => list.find((s) => s.id === id) ?? null,
      hasSameName: (name: string, names: string[]) => names.includes(name),
      requestLoadSavedProject: (project: any, schemeId: string) => {
        calls.loaded = { project, schemeId };
      },
      schemePathForScheme: (_schemes: any[], _schemeId: string) => [],
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
  test("合法创建返回 {id,name,schemeId}", () => {
    const { scope, calls } = createBlankProjectMockScope();
    const createBlankProject = createProgrammaticCreateBlankProject(scope);
    const result = createBlankProject("新模型");
    expect(result.id).toBeTruthy();
    expect(result.name).toBe("新模型");
    expect(result.schemeId).toBe("s1");
    expect(calls.upserted).toBe(true);
    expect(calls.selected).toEqual({ schemeId: "s1", projectId: result.id });
    expect(calls.loaded?.schemeId).toBe("s1");
  });

  test("指定 schemeId 时定位目标方案", () => {
    const { scope } = createBlankProjectMockScope();
    scope.schemes = [
      { id: "s1", name: "方案A", projects: [], children: [] },
      { id: "s2", name: "方案B", projects: [], children: [] }
    ];
    const createBlankProject = createProgrammaticCreateBlankProject(scope);
    const result = createBlankProject("模型X", "s2");
    expect(result.schemeId).toBe("s2");
  });

  test("name 空抛 bad-request", () => {
    const { scope } = createBlankProjectMockScope();
    const createBlankProject = createProgrammaticCreateBlankProject(scope);
    expect(() => createBlankProject("")).toThrow(/name 必填/);
    try {
      createBlankProject("  ");
    } catch (e: any) {
      expect(e.code).toBe("bad-request");
    }
  });

  test("重名抛 bad-request", () => {
    const { scope } = createBlankProjectMockScope();
    scope.schemes = [{ id: "s1", name: "方案A", projects: [{ name: "已存在模型" }], children: [] }];
    const createBlankProject = createProgrammaticCreateBlankProject(scope);
    expect(() => createBlankProject("已存在模型")).toThrow(/模型名称重复/);
    try {
      createBlankProject("已存在模型");
    } catch (e: any) {
      expect(e.code).toBe("bad-request");
    }
  });

  test("schemes 空抛 bad-request", () => {
    const { scope } = createBlankProjectMockScope();
    scope.schemes = [];
    const createBlankProject = createProgrammaticCreateBlankProject(scope);
    expect(() => createBlankProject("模型")).toThrow(/无可用方案/);
    try {
      createBlankProject("模型");
    } catch (e: any) {
      expect(e.code).toBe("bad-request");
    }
  });
});

// mock __appScope for selectDevices：捕获 setSelectedNodeIds 调用
function createSelectMockScope(initialSelected: string[] = []) {
  const calls: { selectedIds: string[] | null } = { selectedIds: null };
  return {
    scope: {
      selectedNodeIds: initialSelected,
      setSelectedNodeIds: (ids: string[]) => {
        calls.selectedIds = ids;
      }
    },
    calls
  };
}

describe("programmaticSelectDevices", () => {
  test("set 模式直接替换选中", () => {
    const { scope, calls } = createSelectMockScope(["old1"]);
    const select = createProgrammaticSelectDevices(scope);
    const result = select(["a", "b"]);
    expect(result.selectedIds).toEqual(["a", "b"]);
    expect(calls.selectedIds).toEqual(["a", "b"]);
  });

  test("add 模式合并去重", () => {
    const { scope, calls } = createSelectMockScope(["a", "b"]);
    const select = createProgrammaticSelectDevices(scope);
    const result = select(["b", "c"], "add");
    expect(result.selectedIds).toEqual(["a", "b", "c"]);
    expect(calls.selectedIds).toEqual(["a", "b", "c"]);
  });

  test("toggle 模式切换：存在则移除，不存在则加入", () => {
    const { scope, calls } = createSelectMockScope(["a", "b"]);
    const select = createProgrammaticSelectDevices(scope);
    const result = select(["b", "c"], "toggle");
    expect(result.selectedIds).toEqual(["a", "c"]);
    expect(calls.selectedIds).toEqual(["a", "c"]);
  });

  test("缺省 mode 为 set", () => {
    const { scope } = createSelectMockScope(["old"]);
    const select = createProgrammaticSelectDevices(scope);
    const result = select(["x"]);
    expect(result.selectedIds).toEqual(["x"]);
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
    expect(() => select(["a"], "unknown" as any)).toThrow(/未知选中模式/);
    try {
      select(["a"], "unknown" as any);
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
