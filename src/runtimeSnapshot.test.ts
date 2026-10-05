// runtimeSnapshot.test.ts — 运行时态序列化单测
import { describe, it, test, expect, vi } from "vitest";
import { readFileSync } from "node:fs";
import { decodeAuto } from "./encoding/gbk";
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
    const buildEFileExport = vi.fn((_project: any, _schemePath: string[], _options: any) => ({
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
      eDeviceDefinitionFieldOrder: { ACGenerator: ["dev_type", "name", "idx"] },
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
    const exportOptions = buildEFileExport.mock.calls[0]?.[2];
    const generatorDefinition = exportOptions.interfaceDefinitions.find(
      (definition: any) => definition.componentLibrary === "ACGenerator"
    );
    expect(generatorDefinition.fields.slice(0, 4).map((field: any) => field.sourceName)).toEqual([
      "parent",
      "dev_type",
      "name",
      "idx"
    ]);
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

describe("serializeEFile 指定模板（纯后台计算，不影响前端状态）", () => {
  // 真实预定义模板（可能 GBK 编码，经 templateData base64 传字节，decodeAuto 兼容解码）
  const templateBytes = readFileSync(new URL("../public/e-templates/sgcc.e", import.meta.url));
  const templateBase64 = Buffer.from(templateBytes).toString("base64");

  const templateScope = (): any => mockScope({
    // 当前 override 与模板不同，用于验证模板优先且状态不被改动
    eDeviceDefinitionLabels: { ACGenerator: "手动改过" },
    eDeviceDefinitionClassExportEnabled: { ACGenerator: true },
    eDeviceDefinitionFieldOrder: { ACGenerator: ["dev_type", "name"] },
    eDeviceDefinitionTemplateFields: { ACGenerator: [{ exportName: "手动字段" }] },
    eDeviceDefinitionTableIds: { ACGenerator: "00099" },
    libraryTemplates: [{
      kind: "generator",
      label: "发电机",
      categoryLibrary: "发电设备",
      size: { width: 84, height: 56 },
      params: {},
      terminalType: "ac",
      terminalCount: 1
    }],
    PARAM_LABELS: {},
    resolveTemplateComponentLibrary: undefined as unknown as (template: any) => string,
    currentProject: () => ({ version: 1, name: "测试模型", modelType: "厂站", nodes: [], edges: [] }),
    buildEFileExport: vi.fn((_project: any, _schemePath: string[], _options: any) => ({
      filename: "model.e",
      text: "E file content",
      mime: "text/plain"
    }))
  });

  it("templateData 生效：按模板 override 生成，appScope 当前模板状态引用不变", () => {
    const scope = templateScope();
    const before = {
      labels: scope.eDeviceDefinitionLabels,
      classExportEnabled: scope.eDeviceDefinitionClassExportEnabled,
      fieldOrder: scope.eDeviceDefinitionFieldOrder,
      templateFields: scope.eDeviceDefinitionTemplateFields,
      tableIds: scope.eDeviceDefinitionTableIds
    };
    const res = serializeEFile(scope, { templateName: "国网E格式", templateData: templateBase64 });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.data.text).toBe("E file content");
    // 当前状态引用不变（模板 override 未写回 appScope）
    expect(scope.eDeviceDefinitionLabels).toBe(before.labels);
    expect(scope.eDeviceDefinitionClassExportEnabled).toBe(before.classExportEnabled);
    expect(scope.eDeviceDefinitionFieldOrder).toBe(before.fieldOrder);
    expect(scope.eDeviceDefinitionTemplateFields).toBe(before.templateFields);
    expect(scope.eDeviceDefinitionTableIds).toBe(before.tableIds);
    // 传给 buildEFileExport 的 options 用模板 override 而非当前值
    const buildEFileExport = scope.buildEFileExport as unknown as { mock: { calls: any[][] } };
    const exportOptions = buildEFileExport.mock.calls[0]?.[2];
    expect(exportOptions).toBeTruthy();
    expect(exportOptions.eDeviceDefinitionLabels).not.toBe(scope.eDeviceDefinitionLabels);
    expect(exportOptions.eDeviceDefinitionLabels["ACGenerator"]).not.toBe("手动改过");
  });

  it("templateName 类型不匹配 → bad-request（配网实时库 + 厂站）", () => {
    const res = serializeEFile(templateScope(), {
      templateName: "配网实时库",
      templateData: templateBase64
    });
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.error.code).toBe("bad-request");
    expect(res.error.message).toContain("仅支持");
  });

  it("templateData 为空文本 → bad-request", () => {
    const res = serializeEFile(templateScope(), { templateData: Buffer.from("").toString("base64") });
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.error.code).toBe("bad-request");
  });

  it("templateText 显式为空白 → bad-request", () => {
    const res = serializeEFile(templateScope(), { templateText: "   " });
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.error.code).toBe("bad-request");
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

// ---- templateData 非法 base64：客户端坏数据应是 bad-request，不是 internal ----

describe("serializeEFile templateData 非法 base64", () => {
  const scopeWithSpy = (): any => {
    const buildEFileExport = vi.fn((_project: any, _schemePath: string[], _options: any) => ({
      filename: "model.e",
      text: "E file content",
      mime: "text/plain"
    }));
    return mockScope({ buildEFileExport, PARAM_LABELS: {} });
  };

  // atob 抛错有两类输入，修复前都被外层 wrap 吞成 internal：
  //   ① 含 base64 字母表外字符 → InvalidCharacterError
  //   ② 长度 % 4 === 1（如 5 字符；长度 % 4 === 3 反而合法，见文末注释）
  const throwingInputs = ["!!!not-base64!!!", "!!!not base64!!!", "YW J!jZA==", "abcde"];

  test("非法 base64 的 templateData 返回 bad-request 而非 internal", () => {
    for (const templateData of throwingInputs) {
      const scope = scopeWithSpy();
      const res = serializeEFile(scope, { templateData });
      expect(res.ok, `templateData=${JSON.stringify(templateData)}`).toBe(false);
      if (res.ok) return;
      expect(res.error.code).toBe("bad-request");
      expect(res.error.code).not.toBe("internal");
      expect(res.error.message).toContain("base64");
      // 坏数据必须在真正生成 E 文件之前就被拒掉
      expect(scope.buildEFileExport).not.toHaveBeenCalled();
    }
  });

  test("仅含空白的 templateData 解出空串，同样落到 bad-request 空文本分支", () => {
    // atob("   ") 不抛（WHATWG 宽容解码会先剥掉 ASCII 空白），解出空串后
    // 由「模板文本为空」分支拒掉 —— 结果同为 bad-request，路径不同，一并锁住。
    const scope = scopeWithSpy();
    const res = serializeEFile(scope, { templateData: "   " });
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.error.code).toBe("bad-request");
    expect(res.error.code).not.toBe("internal");
    expect(scope.buildEFileExport).not.toHaveBeenCalled();
  });

  // 合法 base64 的行为必须与修复前逐字段一致：用「同一份模板的纯文本路径」当基准，
  // 两条路径解出的 templateText 相同 → 传给 buildEFileExport 的 options 必须完全相等。
  // 硬编码期望值只能证明输出没变，等价断言才能证明 base64 分支没有走偏。
  const templateBytes = readFileSync(new URL("../public/e-templates/sgcc.e", import.meta.url));
  const templateBase64 = Buffer.from(templateBytes).toString("base64");
  const templateScope = (): any => mockScope({
    eDeviceDefinitionLabels: { ACGenerator: "手动改过" },
    eDeviceDefinitionClassExportEnabled: { ACGenerator: true },
    eDeviceDefinitionFieldOrder: { ACGenerator: ["dev_type", "name"] },
    eDeviceDefinitionTemplateFields: { ACGenerator: [{ exportName: "手动字段" }] },
    eDeviceDefinitionTableIds: { ACGenerator: "00099" },
    libraryTemplates: [{
      kind: "generator",
      label: "发电机",
      categoryLibrary: "发电设备",
      size: { width: 84, height: 56 },
      params: {},
      terminalType: "ac",
      terminalCount: 1
    }],
    PARAM_LABELS: {},
    resolveTemplateComponentLibrary: undefined as unknown as (template: any) => string,
    currentProject: () => ({ version: 1, name: "测试模型", modelType: "厂站", nodes: [], edges: [] }),
    buildEFileExport: vi.fn((_project: any, _schemePath: string[], _options: any) => ({
      filename: "model.e",
      text: "E file content",
      mime: "text/plain"
    }))
  });

  test("合法 base64 回归：与同一模板的纯文本路径产生完全相同的结果", () => {
    const templateText = decodeAuto(new Uint8Array(templateBytes));
    const viaData = templateScope();
    const viaText = templateScope();

    const dataRes = serializeEFile(viaData, { templateName: "国网E格式", templateData: templateBase64 });
    const textRes = serializeEFile(viaText, { templateName: "国网E格式", templateText });
    expect(dataRes.ok).toBe(true);
    expect(textRes.ok).toBe(true);
    if (!dataRes.ok || !textRes.ok) return;
    expect(dataRes.data).toEqual(textRes.data);

    const viaDataMock = viaData.buildEFileExport as unknown as { mock: { calls: any[][] } };
    const viaTextMock = viaText.buildEFileExport as unknown as { mock: { calls: any[][] } };
    const optionsFromBase64 = viaDataMock.mock.calls[0]?.[2];
    expect(optionsFromBase64).toBeTruthy();
    expect(optionsFromBase64).toEqual(viaTextMock.mock.calls[0]?.[2]);
    // 模板 override 生效，而非 appScope 里那份手动值
    expect(optionsFromBase64.eDeviceDefinitionLabels["ACGenerator"]).not.toBe("手动改过");
  });
});

// ---- appScope 依赖未注册 ----

describe("serializeEFile 依赖未注册", () => {
  test("buildEFileExport 未挂载时返回 internal 并点名缺失的依赖", () => {
    // 真实触发方式：App.tsx 装配 __appScope 时没挂 buildEFileExport（或被覆盖成非函数）
    for (const buildEFileExport of [undefined, "not-a-function", {}]) {
      const res = serializeEFile(mockScope({ buildEFileExport }));
      expect(res.ok, `buildEFileExport=${String(buildEFileExport)}`).toBe(false);
      if (res.ok) return;
      expect(res.error.code).toBe("internal");
      expect(res.error.message).toBe("buildEFileExport 不可用");
    }
  });
});

// ---- tree tab：分组 nodeIds 形状 ----

describe("serializeTab tree 分组 nodeIds", () => {
  test("分组 nodeIds 非数组时按现状落到 internal（对非数组取 map 会抛）", () => {
    // 现状判据只有 (g.nodeIds ?? [])：null/undefined 走兜底，其余非数组值直接抛，
    // 被 serializeTab 的 catch 收成 internal。此处锁定现状，不是断言理想行为。
    for (const nodeIds of ["node-1", 0, "", { 0: "node-1" }] as unknown[]) {
      const res = serializeTab(
        mockScope({ groups: [{ id: "g1", name: "分组1", nodeIds }] }),
        "tree"
      );
      expect(res.ok, `nodeIds=${JSON.stringify(nodeIds)}`).toBe(false);
      if (res.ok) return;
      expect(res.error.code).toBe("internal");
    }
  });

  test("分组缺少 nodeIds 时兜底为空数组，而不是回退到全部节点", () => {
    const res = serializeTab(
      mockScope({ groups: [{ id: "g1", name: "分组1" }], nodes: [mockNode()] }),
      "tree"
    );
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    const tree = res.data.tree!.nodes;
    // 树非空（layer 节点在），避免空树上的断言变成恒真
    expect(tree.length).toBeGreaterThan(1);
    // 分组节点自身 id 是 g.id（group: 前缀只是 byLayer 的 Map 键，不进 TreeNode）
    const groupNode = tree.find((node) => node.kind === "group");
    expect(groupNode?.id).toBe("g1");
    expect(groupNode?.children).toEqual([]);
  });
});

// ============================================================================
// 补测：safeStr / safeNum / safeBool 的兜底分支、errInternal 的非 Error 分支、
// 以及 schemePath / nodes / edges / selectedNodeIds / canvasBounds / 模型名称
// 各处 ?? 与 || 的兜底链（原文件未覆盖这些「输入缺失」维度）。
// ============================================================================

/** 取 serializeTab 结果里指定 key 的行值（model/graph tab 的 rows 都按 key 唯一） */
const rowValue = (res: any, key: string): string => {
  const row = res?.data?.rows?.find((r: any) => r.key === key);
  if (row === undefined) throw new Error(`rows 中找不到 key=${key}`);
  return row.value;
};

describe("safeStr 兜底分支（非字符串 → 空串）", () => {
  test("activeModelName 为非字符串值时序列化为空串，而不是原值透传", () => {
    // 取值刻意避开 String(v) 会与 "" 巧合相等的输入：数字 123 → "123"、
    // 对象 → "[object Object]"、数组 → "x"（String(["x"]) === "x"）。
    // 去掉 typeof 守卫（回落成 String(v)/v）时这三条断言全部转红。
    for (const value of [123, { a: 1 }, ["x"], true]) {
      const res = serializeModel(mockScope({ activeModelName: value }));
      expect(res.ok).toBe(true);
      if (!res.ok) return;
      expect(res.data.modelName, `activeModelName=${JSON.stringify(value)}`).toBe("");
    }
  });

  test("undefined 也走兜底，且与「合法字符串原样透传」结果不同", () => {
    // 双边断言：兜底值为 ""，真分支值非空 —— 两个默认值必须不同才有鉴别力。
    const undef = serializeModel(mockScope({ activeModelName: undefined }));
    const real = serializeModel(mockScope({ activeModelName: "保留这个名字" }));
    expect(undef.ok && real.ok).toBe(true);
    if (!undef.ok || !real.ok) return;
    expect(undef.data.modelName).toBe("");
    expect(real.data.modelName).toBe("保留这个名字");
    expect(undef.data.modelName).not.toBe(real.data.modelName);
  });

  test("空串是真分支的合法输入，不应与 undefined 的兜底路径混淆", () => {
    // 空串走 typeof 分支原样返回，结果同样是 ""，因此这条断言只能证明
    // 「空串不被特殊处理成 fallback 之外的值」，不能区分两条分支。记录在此，
    // 避免后人误以为它覆盖了兜底分支。
    const res = serializeModel(mockScope({ activeModelName: "" }));
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.data.modelName).toBe("");
  });
});

describe("safeNum 兜底分支（非有限数 → fallback）", () => {
  // 两个调用点的 fallback 不同：position.x/size.width 是 0，scale/scaleX/scaleY 是 1。
  // 因此「fallback 生效」在 x 行断言 "0"、在 scale 行断言 "1"，
  // 且下面另有一条 finite 真分支断言把 scale 打成 "1.5" —— 若 fallback 恒为 0，
  // scale 断言与真分支断言会同时指向不同值，双边断言才有鉴别力。
  test("字符串 / NaN / Infinity 等都落到各自调用点的 fallback，而不是被透传", () => {
    for (const bad of ["2", NaN, Infinity, -Infinity, null, undefined, {}]) {
      const res = serializeTab(
        mockScope({ inspectorSelectedNode: mockNode({ position: { x: bad, y: bad }, scale: bad, rotation: bad }) }),
        "graph"
      );
      expect(res.ok).toBe(true);
      if (!res.ok) return;
      const label = `bad=${String(bad)}`;
      expect(rowValue(res, "x"), label).toBe("0");          // fallback 0
      expect(rowValue(res, "y"), label).toBe("0");          // fallback 0
      expect(rowValue(res, "rotation"), label).toBe("0°");  // fallback 0
      expect(rowValue(res, "scale"), label).toBe("1");      // fallback 1，与上面 0 不同
      expect(rowValue(res, "scaleX"), label).toBe("1");
      expect(rowValue(res, "scaleY"), label).toBe("1");
    }
  });

  test("有限数原样透传（证明兜底不是恒触发）", () => {
    const res = serializeTab(
      mockScope({ inspectorSelectedNode: mockNode({ position: { x: 12.5, y: -3 }, scale: 1.5, rotation: 90 }) }),
      "graph"
    );
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(rowValue(res, "x")).toBe("12.5");
    expect(rowValue(res, "y")).toBe("-3");
    expect(rowValue(res, "rotation")).toBe("90°");
    expect(rowValue(res, "scale")).toBe("1.5");
  });

  test("序列化节点里的默认 scale 为 1（fallback 1，而非 0）", () => {
    const res = serializeSelection(mockScope({ inspectorSelectedNode: mockNode({ scale: undefined, scaleX: undefined, scaleY: undefined }) }));
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    const node = res.data.selectedNode!;
    expect(node.scale).toBe(1);
    expect(node.scaleX).toBe(1);
    expect(node.scaleY).toBe(1);
    expect(node.position).toEqual({ x: 100, y: 200 });
    // 合法值仍透传，与 fallback 1 不同
    const real = serializeSelection(mockScope({ inspectorSelectedNode: mockNode({ scale: 2.5, scaleX: 3, scaleY: 4 }) }));
    if (!real.ok) return;
    expect(real.data.selectedNode!.scale).toBe(2.5);
    expect(real.data.selectedNode!.scale).not.toBe(node.scale);
  });
});

describe("safeBool 兜底分支（非布尔 → fallback false）", () => {
  test("字符串 / 数字 / 对象等非布尔值都判为否，而布尔 true 判为是", () => {
    for (const bad of ["true", 1, 0, "", null, undefined, {}, []]) {
      const res = serializeTab(mockScope({ allowAutoExpandCanvas: bad }), "model");
      expect(res.ok).toBe(true);
      if (!res.ok) return;
      expect(rowValue(res, "allowAutoExpandCanvas"), `bad=${JSON.stringify(bad)}`).toBe("否");
    }
    const yes = serializeTab(mockScope({ allowAutoExpandCanvas: true }), "model");
    expect(yes.ok).toBe(true);
    if (!yes.ok) return;
    expect(rowValue(yes, "allowAutoExpandCanvas")).toBe("是");
    // 两个默认值必须不同，否则双边断言没有鉴别力（Boolean("true") === true 会恒绿）
    expect(rowValue(yes, "allowAutoExpandCanvas")).not.toBe("否");
  });
});

describe("errInternal 接收非 Error 抛出值", () => {
  // wrap 的 catch 把任意抛出值交给 errInternal，`e instanceof Error ? e.message : String(e)`
  // 的 else 分支只有非 Error 才走得到。取值刻意满足 String(e) 与 e?.message 不同，
  // 于是「把 String(e) 换成 e?.message」的变异会让 message 变 undefined 而转红。
  test("抛出非 Error 值时 message 走 String(e)，不是 e.message", () => {
    for (const thrown of [42, { code: 1 }, null, undefined, "boom", Symbol("s")]) {
      const res = serializeModel(new Proxy(mockScope(), {
        get() { throw thrown; }
      }));
      expect(res.ok).toBe(false);
      if (res.ok) return;
      expect(res.error.code, `thrown=${String(thrown)}`).toBe("internal");
      expect(res.error.message, `thrown=${String(thrown)}`).toBe(String(thrown));
      expect(res.error.message).not.toBe(undefined);
    }
  });

  test("真正的 Error 仍只取 .message（而非带 Error 前缀的全量字符串化）", () => {
    const res = serializeModel(new Proxy(mockScope(), {
      get() { throw new Error("boom"); }
    }));
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.error.code).toBe("internal");
    expect(res.error.message).toBe("boom");
    // String(e) 会是 "Error: boom"，两者必须不同，否则 instanceof 分支可删
    expect(res.error.message).not.toBe(String(new Error("boom")));
  });
});

describe("serializeModel schemePath 兜底链", () => {
  test("pointer 缺失或 schemePath 为 null 时回落到 activeSchemeRecord.name", () => {
    for (const pointer of [undefined, null, {}]) {
      const res = serializeModel(mockScope({ currentActiveProjectPointer: pointer }));
      expect(res.ok).toBe(true);
      if (!res.ok) return;
      expect(res.data.schemePath, `pointer=${JSON.stringify(pointer)}`).toBe("测试方案");
    }
    // schemePath 显式 null 也走 ?? 回落
    const nullPath = serializeModel(mockScope({ currentActiveProjectPointer: { schemePath: null } }));
    expect(nullPath.ok).toBe(true);
    if (!nullPath.ok) return;
    expect(nullPath.data.schemePath).toBe("测试方案");
  });

  test("pointer 与 schemeRecord 都缺失时落到空串", () => {
    const res = serializeModel(mockScope({ currentActiveProjectPointer: undefined, activeSchemeRecord: undefined }));
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.data.schemePath).toBe("");
  });

  test("pointer.schemePath 存在时优先于 schemeRecord.name（证明回落不是恒发生）", () => {
    const res = serializeModel(mockScope({
      currentActiveProjectPointer: { schemePath: "指针路径" },
      activeSchemeRecord: { name: "记录方案名" }
    }));
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.data.schemePath).toBe("指针路径");
    expect(res.data.schemePath).not.toBe("记录方案名");
  });
});

describe("serializeDevices 的 nodes / edges ?? [] 兜底", () => {
  test("nodes / edges 为 null 或 undefined 时返回空数组而不是 null", () => {
    for (const missing of [null, undefined]) {
      const res = serializeDevices(mockScope({ nodes: missing, edges: missing }));
      expect(res.ok).toBe(true);
      if (!res.ok) return;
      expect(res.data.nodes, `missing=${String(missing)}`).toEqual([]);
      expect(res.data.edges, `missing=${String(missing)}`).toEqual([]);
      // 断言落在真正会被 `?? null` 变异改动的对象上（不是只断 ok）
      expect(res.data.nodes).not.toBeNull();
      expect(res.data.edges).not.toBeNull();
    }
  });

  test("存在时原数组原样返回（证明兜底只在缺失时触发）", () => {
    const nodes = [mockNode()];
    const edges = [{ id: "edge-1" }];
    const res = serializeDevices(mockScope({ nodes, edges }));
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.data.nodes).toBe(nodes);
    expect(res.data.edges).toBe(edges);
  });
});

describe("serializeSelection 的 selectedNodeIds 非数组兜底", () => {
  test("非数组的 selectedNodeIds 归一为空数组，而不是原样透传", () => {
    // 去掉 Array.isArray 守卫后，"node-1" / {0:"node-1"} 会原样进 data.selectedNodeIds。
    for (const value of ["node-1", 0, { 0: "node-1" }, null, undefined, true]) {
      const res = serializeSelection(mockScope({ selectedNodeIds: value }));
      expect(res.ok, `selectedNodeIds=${JSON.stringify(value)}`).toBe(true);
      if (!res.ok) return;
      expect(res.data.selectedNodeIds, `selectedNodeIds=${JSON.stringify(value)}`).toEqual([]);
      expect(Array.isArray(res.data.selectedNodeIds)).toBe(true);
    }
  });

  test("数组输入原样透传，与非数组兜底结果不同", () => {
    const res = serializeSelection(mockScope({ selectedNodeIds: ["node-1", "node-2"] }));
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.data.selectedNodeIds).toEqual(["node-1", "node-2"]);
    expect(res.data.selectedNodeIds).not.toEqual([]);
  });
});

describe("buildModelRows canvasBounds 缺失兜底", () => {
  test("canvasBounds 为 null / undefined 时宽高落 0，不沿用任何默认画布尺寸", () => {
    for (const missing of [null, undefined]) {
      const res = serializeTab(mockScope({ canvasBounds: missing }), "model");
      expect(res.ok).toBe(true);
      if (!res.ok) return;
      expect(rowValue(res, "canvasWidth"), `missing=${String(missing)}`).toBe("0");
      expect(rowValue(res, "canvasHeight"), `missing=${String(missing)}`).toBe("0");
    }
  });

  test("canvasBounds 为 falsy 标量时不抛且宽高同样落 0", () => {
    // 等价变异记录：`?? {}` 换成 `|| {}` 在本文件的输入集上不可观测 ——
    // canvasBounds 为 0 / "" / false 时，保留标量再取 .width 与换成 {} 取 .width
    // 都得到 undefined → safeNum 兜底 0 → "0"。故这里只锁「不抛 + 落 0」，
    // 不声称覆盖了 ?? 与 || 的区分。
    for (const scalar of [0, "", false]) {
      const res = serializeTab(mockScope({ canvasBounds: scalar }), "model");
      expect(res.ok, `canvasBounds=${JSON.stringify(scalar)}`).toBe(true);
      if (!res.ok) return;
      expect(rowValue(res, "canvasWidth")).toBe("0");
      expect(rowValue(res, "canvasHeight")).toBe("0");
    }
  });
});

describe("buildModelRows 模型名称的 || 回落", () => {
  test("记录名为空值时回落到 activeModelName", () => {
    // `||` 而非 `??` 的鉴别输入就是空串：换成 `??` 后空串会原样透传 → 转红。
    for (const name of ["", null, undefined, 0, false]) {
      const res = serializeTab(
        mockScope({
          currentModelRecord: { id: "proj-1", name, updatedAt: "2026-06-22T00:00:00.000Z" },
          activeModelName: "活动模型名"
        }),
        "model"
      );
      expect(res.ok, `name=${JSON.stringify(name)}`).toBe(true);
      if (!res.ok) return;
      expect(rowValue(res, "name"), `name=${JSON.stringify(name)}`).toBe("活动模型名");
    }
  });

  test("记录整体缺失时同样回落，且更新时间行落空串", () => {
    const res = serializeTab(
      mockScope({ currentModelRecord: undefined, activeModelName: "活动模型名" }),
      "model"
    );
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(rowValue(res, "name")).toBe("活动模型名");
    expect(rowValue(res, "updatedAt")).toBe("");
  });

  test("记录名非空时优先于 activeModelName（证明回落不是恒发生）", () => {
    const res = serializeTab(
      mockScope({
        currentModelRecord: { id: "proj-1", name: "记录模型名", updatedAt: "2026-06-22T00:00:00.000Z" },
        activeModelName: "活动模型名"
      }),
      "model"
    );
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(rowValue(res, "name")).toBe("记录模型名");
    expect(rowValue(res, "name")).not.toBe("活动模型名");
  });
});
