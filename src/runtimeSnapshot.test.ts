// runtimeSnapshot.test.ts — 运行时态序列化单测
import { describe, it, expect, vi } from "vitest";
import {
  serializeModel,
  serializeDevices,
  serializeSelection,
  serializeTab,
  serializeSnapshot,
  serializeSvg,
  serializeEFile,
  createRuntimeSnapshotHandler,
  type RuntimeSnapshotResource
} from "./runtimeSnapshot";

// ---- 辅助：创建 mock appScope ----

const mockNode = (overrides: Record<string, any> = {}) => ({
  id: "node-1",
  kind: "generator",
  name: "发电机G1",
  position: { x: 100, y: 200 },
  size: { width: 80, height: 40 },
  rotation: 0,
  scale: 1,
  scaleX: 1,
  scaleY: 1,
  ...overrides
});

const mockScope = (overrides: Record<string, any> = {}) => ({
  activeProjectKey: "proj-1",
  activeSchemeKey: "scheme-1",
  activeModelName: "测试模型",
  currentModelRecord: {
    id: "proj-1",
    name: "测试模型",
    updatedAt: "2026-06-22T00:00:00.000Z"
  },
  activeSchemeRecord: { name: "测试方案" },
  currentActiveProjectPointer: { schemePath: "方案A/测试模型" },
  canvasBounds: { width: 1200, height: 800 },
  canvasBackgroundColor: "#ffffff",
  allowAutoExpandCanvas: true,
  powerUnit: "MW",
  voltageUnit: "kV",
  currentUnit: "kA",
  powerBaseValue: 100,
  backgroundProjectId: "",
  backgroundLayerIds: [],
  inspectorTab: "graph",
  selectedDeviceInfoView: "model",
  singleSelectedDeviceForInspector: false,
  selectedNodeIds: ["node-1"],
  inspectorSelectedNode: mockNode(),
  nodes: [mockNode()],
  edges: [{ id: "edge-1", sourceId: "node-1", targetId: "node-2" }],
  groups: [],
  nodeById: new Map([["node-1", mockNode()]]),
  selectedContainerParameterViews: [],
  buildSvgDocument: () => "<svg>mock</svg>",
  buildEFileExport: (project: any) => ({
    filename: "model.e",
    text: "E file content",
    mime: "text/plain"
  }),
  currentProject: () => ({ version: 1, name: "测试模型", nodes: [], edges: [] }),
  schemePathForScheme: () => ["方案A", "测试方案"],
  svgRef: { current: null },
  ...overrides
});

// ---- 测试 ----

describe("serializeModel", () => {
  it("有活动模型时返回正确结构", () => {
    const res = serializeModel(mockScope());
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.data.modelId).toBe("proj-1");
    expect(res.data.modelName).toBe("测试模型");
    expect(res.data.schemePath).toBe("方案A/测试模型");
    expect(res.data.updatedAt).toBe("2026-06-22T00:00:00.000Z");
  });

  it("无活动模型时返回 no-active-model", () => {
    const res = serializeModel(mockScope({ activeProjectKey: "" }));
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.error.code).toBe("no-active-model");
  });

  it("异常时返回 internal", () => {
    const scope = mockScope();
    // 让 access 抛错
    const res = serializeModel(new Proxy(scope, {
      get() { throw new Error("boom"); }
    }));
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.error.code).toBe("internal");
  });
});

describe("serializeDevices", () => {
  it("有活动模型时返回 nodes 和 edges", () => {
    const res = serializeDevices(mockScope());
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.data.nodes).toHaveLength(1);
    expect(res.data.edges).toHaveLength(1);
    expect(res.data.nodes[0].id).toBe("node-1");
  });

  it("无活动模型时返回 no-active-model", () => {
    const res = serializeDevices(mockScope({ activeProjectKey: "" }));
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.error.code).toBe("no-active-model");
  });
});

describe("serializeSelection", () => {
  it("有选中时返回选中节点和 id 列表", () => {
    const res = serializeSelection(mockScope());
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.data.selectedNodeIds).toEqual(["node-1"]);
    expect(res.data.selectedNode).not.toBeNull();
    expect(res.data.selectedNode!.id).toBe("node-1");
    expect(res.data.selectedNode!.name).toBe("发电机G1");
    expect(res.data.selectedNode!.position).toEqual({ x: 100, y: 200 });
  });

  it("无选中时返回 selectedNode=null（不报错）", () => {
    const res = serializeSelection(mockScope({ inspectorSelectedNode: undefined, selectedNodeIds: [] }));
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.data.selectedNodeIds).toEqual([]);
    expect(res.data.selectedNode).toBeNull();
  });

  it("无活动模型时返回 no-active-model", () => {
    const res = serializeSelection(mockScope({ activeProjectKey: "" }));
    expect(res.ok).toBe(false);
  });
});

describe("serializeTab", () => {
  it("tab=model 时 rows 含模型元信息", () => {
    const res = serializeTab(mockScope(), "model");
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.data.tab).toBe("model");
    expect(res.data.title).toBe("测试模型");
    expect(Array.isArray(res.data.rows)).toBe(true);
    const keys = res.data.rows!.map((r) => r.key);
    expect(keys).toContain("name");
    expect(keys).toContain("canvasWidth");
    expect(keys).toContain("powerUnit");
  });

  it("tab=tree 时 tree.nodes 结构正确", () => {
    const scope = mockScope();
    const res = serializeTab(scope, "tree");
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.data.tab).toBe("tree");
    expect(res.data.tree).toBeDefined();
    expect(Array.isArray(res.data.tree!.nodes)).toBe(true);
  });

  it("tab=graph 有选中时返回 rows 和 subView", () => {
    const res = serializeTab(mockScope(), "graph");
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.data.tab).toBe("graph");
    expect(res.data.subView).toBe("graph");
    expect(Array.isArray(res.data.rows)).toBe(true);
    expect(res.data.rows!.length).toBeGreaterThan(0);
  });

  it("tab=graph 无选中时 rows 空 title 标未选中", () => {
    const res = serializeTab(mockScope({ inspectorSelectedNode: undefined }), "graph");
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.data.title).toBe("未选中");
    expect(res.data.rows).toEqual([]);
  });

  it("tab=graph 且 subView=device 时含 deviceParams", () => {
    const scope = mockScope({
      inspectorTab: "device",
      singleSelectedDeviceForInspector: true,
      selectedContainerParameterViews: [
        {
          id: "param-view-1",
          label: "电气参数",
          columns: [{ key: "param", label: "参数" }, { key: "val", label: "值" }],
          rows: [{ param: "额定功率", val: "100MW" }]
        }
      ]
    });
    const res = serializeTab(scope, "graph");
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.data.subView).toBe("device");
    expect(res.data.deviceParams).toBeDefined();
    expect(res.data.deviceParams!.length).toBe(1);
    expect(res.data.deviceParams![0].section).toBe("电气参数");
  });

  it("非法 tab 返回 bad-request", () => {
    const res = serializeTab(mockScope(), "invalid" as any);
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.error.code).toBe("bad-request");
  });

  it("无活动模型时返回 no-active-model", () => {
    const res = serializeTab(mockScope({ activeProjectKey: "" }), "model");
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.error.code).toBe("no-active-model");
  });
});

describe("serializeSnapshot", () => {
  it("返回聚合结构含 model+devices+selection+三 tab", () => {
    const res = serializeSnapshot(mockScope());
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.data.model).not.toBeNull();
    expect(res.data.devices).not.toBeNull();
    expect(res.data.selection).not.toBeNull();
    expect(res.data.tabs.model).toBeDefined();
    expect(res.data.tabs.tree).toBeDefined();
    expect(res.data.tabs.graph).toBeDefined();
  });
});

describe("serializeSvg", () => {
  it("优先 buildSvgDocument 返回自包含 SVG", () => {
    // buildSvgDocument 与导出按钮一致，内联样式；svgRef 序列化仅作回退
    const mockSvgElement = { nodeType: 1, tagName: "svg" };
    const scope = mockScope({
      svgRef: { current: mockSvgElement }
    });
    const res = serializeSvg(scope);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.data).toBe("<svg>mock</svg>");
  });

  it("buildSvgDocument 不可用时回退 svgRef 序列化（node 环境无 DOM 则 internal）", () => {
    // node 测试环境无真 SVGSVGElement/cloneNode，回退分支会抛错 → internal
    const mockSvgElement = { nodeType: 1, tagName: "svg" };
    const scope = mockScope({
      buildSvgDocument: undefined,
      svgRef: { current: mockSvgElement }
    });
    const res = serializeSvg(scope);
    // 有 XMLSerializer 则返回 string，无则 internal（node 环境通常无）
    if (typeof XMLSerializer !== "undefined") {
      expect(res.ok).toBe(true);
    } else {
      expect(res.ok).toBe(false);
      if (res.ok) return;
      expect(res.error.code).toBe("internal");
    }
  });

  it("buildSvgDocument 与 svgRef 均不可用 → internal", () => {
    const res = serializeSvg(mockScope({ buildSvgDocument: undefined, svgRef: { current: null } }));
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.error.code).toBe("internal");
  });
});

describe("serializeEFile", () => {
  it("返回 E 文件文本", () => {
    const buildEFileExport = vi.fn(() => ({
      filename: "model.e",
      text: "E file content",
      mime: "text/plain"
    }));
    const res = serializeEFile(mockScope({
      buildEFileExport,
      libraryTemplates: [{
        kind: "ac-source",
        label: "交流电源",
        categoryLibrary: "交流设备",
        size: { width: 84, height: 56 },
        params: {},
        terminalType: "ac",
        terminalCount: 1
      }],
      PARAM_LABELS: {},
      eDeviceDefinitionLabels: { ACGenerator: "GeneratorTable" },
      eDeviceDefinitionClassExportEnabled: { ACGenerator: true },
      resolveTemplateComponentLibrary: () => "ACGenerator"
    }));
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.data.filename).toBe("model.e");
    expect(res.data.text).toBe("E file content");
    expect(res.data.mime).toBe("text/plain");
    expect(buildEFileExport).toHaveBeenCalledWith(
      expect.anything(),
      ["方案A", "测试方案"],
      expect.objectContaining({
        interfaceDefinitions: expect.arrayContaining([
          expect.objectContaining({
            componentLibrary: "ACGenerator",
            exportName: "GeneratorTable",
            fields: expect.arrayContaining([
              expect.objectContaining({ sourceName: "dev_type", exportEnabled: true })
            ])
          })
        ])
      })
    );
  });

  it("无活动模型时返回 no-active-model", () => {
    const res = serializeEFile(mockScope({ activeProjectKey: "" }));
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.error.code).toBe("no-active-model");
  });

  it("currentProject 不可用时返回 internal", () => {
    const res = serializeEFile(mockScope({ currentProject: undefined }));
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.error.code).toBe("internal");
  });
});

describe("createRuntimeSnapshotHandler", () => {
  it("传 resource 正确路由", async () => {
    const handler = createRuntimeSnapshotHandler(mockScope());
    const res = await handler("runtime.model");
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.data.modelId).toBe("proj-1");
  });

  it("传 runtime.selection 正确路由", async () => {
    const handler = createRuntimeSnapshotHandler(mockScope());
    const res = await handler("runtime.selection");
    expect(res.ok).toBe(true);
  });

  it("传 runtime.tab 带 params.tab", async () => {
    const handler = createRuntimeSnapshotHandler(mockScope());
    const res = await handler("runtime.tab", { tab: "model" });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.data.tab).toBe("model");
  });

  it("未知 resource 返回 bad-request", async () => {
    const handler = createRuntimeSnapshotHandler(mockScope());
    const res = await handler("runtime.unknown" as any);
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.error.code).toBe("bad-request");
  });

  it("异常时返回 internal", async () => {
    const scope = mockScope();
    // 让 activeProjectKey getter 抛错
    const badScope = new Proxy(scope, {
      get(target, prop) {
        if (prop === "activeProjectKey") throw new Error("boom");
        return Reflect.get(target, prop);
      }
    });
    const handler = createRuntimeSnapshotHandler(badScope);
    const res = await handler("runtime.model");
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.error.code).toBe("internal");
  });
});
