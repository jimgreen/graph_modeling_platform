import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { areCanvasPropsEqual } from "./appExtracted/appCanvasArea";
import * as appViewModule from "./appExtracted/appView";
import {
  inspectorTabShowsDevicePanel,
  customDeviceDefinitionUsesIconOnly,
  resolveContainerParameterViewComponentLibrary,
  resolveDeviceModelPanelDefinitionGroups,
  resolveDeviceModelPanelDevType,
  resolveDeviceDefinitionParameterRowsForDisplay,
  resolveDeviceModelPanelParameterKeys,
  resolveCustomDeviceParameterRowsForDisplay,
  resolveEDeviceInterfaceFieldsForDisplay,
  moveEDeviceInterfaceFieldOrder,
  resolveInspectorGraphId,
  resolveInspectorTopologyEntry,
  voltageBaseSetScopeDeviceCount
} from "./appExtracted/appView";
import {
  CUSTOM_DEVICE_DIALOG_DEFAULT_HEIGHT,
  READONLY_E_PARAM_KEYS,
  canBatchEditParam,
  paramOptionsForSection,
  resolveAcContainerModelPanelParamKeys
} from "./appExtracted/appCoreCanvasUtilities";
import {
  componentLibraryDefinitionOverrideKey,
  resolveEditableComponentLibraryDefinition
} from "./componentLibraryDefinitions";
import {
  DEVICE_LIBRARY,
  createDefaultNode,
  getEParameterKeys,
  getTemplateParameterDefinitions,
  templateDerivedComponentLibraryInfo,
  type DeviceTemplateDefinitionOverride,
  type Topology
} from "./model";

const readSourceFiles = (...relativePaths: string[]) => relativePaths
  .map((relativePath) => readFileSync(new URL(relativePath, import.meta.url), "utf8"))
  .join("\n");

const APP_VIEW_SOURCE_FILES = [
  "./appExtracted/appView.tsx",
  "./appExtracted/appContextMenus.tsx",
  "./appExtracted/appProjectDialogs.tsx",
  "./appExtracted/appCanvasDialogs.tsx",
  "./appExtracted/appDeviceDefinitionDialogs.tsx",
  "./appExtracted/appResourceDialogs.tsx"
] as const;

const readAppViewSources = () => readSourceFiles(...APP_VIEW_SOURCE_FILES);

describe("app view topology inspector", () => {
  test("keeps parent editable as a model enum while topology indexes remain readonly", () => {
    expect(READONLY_E_PARAM_KEYS.has("parent")).toBe(false);
    expect(canBatchEditParam("parent")).toBe(true);
    expect(READONLY_E_PARAM_KEYS.has("node")).toBe(true);
  });

  test("uses live topology entries instead of stale saved topology entries", () => {
    const staleTopology: Topology = {
      nodes: {
        "selected-line": {
          id: "selected-line",
          degree: 0,
          neighbors: [],
          edgeIds: []
        }
      },
      connectedComponents: []
    };
    const liveTopology: Topology = {
      nodes: {
        "selected-line": {
          id: "selected-line",
          degree: 2,
          neighbors: ["source-bus", "target-bus"],
          edgeIds: ["line:routable-source", "line:routable-target"]
        }
      },
      connectedComponents: [["source-bus", "selected-line", "target-bus"]]
    };

    expect(resolveInspectorTopologyEntry(staleTopology, liveTopology, "selected-line")?.degree).toBe(2);
    expect(resolveInspectorTopologyEntry(staleTopology, liveTopology, "selected-line")?.neighbors).toEqual([
      "source-bus",
      "target-bus"
    ]);
  });
});

describe("voltage base scope counts", () => {
  test("shows every device in the topology island instead of only devices whose value changes", () => {
    expect(voltageBaseSetScopeDeviceCount({
      targetNodeIds: ["source", "line", "bus", "load-a", "load-b"],
      changedNodeIds: ["source"]
    } as any)).toBe(5);
  });
});

describe("model-association device containment wiring", () => {
  test("disables forbidden library buttons and blocks incompatible model-type changes before creating undo state", () => {
    const rendererSource = readFileSync(new URL("./appExtracted/appDeviceDefinitionRenderers.tsx", import.meta.url), "utf8");
    const viewSource = readFileSync(new URL("./appExtracted/appRightPanel.tsx", import.meta.url), "utf8");
    // 实现已改用 InlineEditableValue 组件（而非 Select）
    const modelTypeSelect = viewSource.match(/<InlineEditableValue\s+value=\{modelType\}[\s\S]*?\/>/)?.[0] ?? "";

    expect(rendererSource).toContain("modelAssociationDeviceModelTypeFailureMessage(modelType, item.kind)");
    expect(rendererSource).toContain("draggable={isEditMode && !modelTypeFailureMessage}");
    expect(rendererSource).toContain("disabled={isBrowseMode || Boolean(modelTypeFailureMessage)}");
    expect(modelTypeSelect).toContain("modelAssociationDevicesModelTypeFailureMessage(nextType, nodes)");
    expect(modelTypeSelect.indexOf("modelAssociationDevicesModelTypeFailureMessage(nextType, nodes)")).toBeLessThan(
      modelTypeSelect.indexOf("pushUndoSnapshot()")
    );
    expect(modelTypeSelect).toContain("showGlobalMessage(modelTypeFailureMessage)");
  });
});

describe("发送模型入口", () => {
  test("在导出按钮右侧放置纸飞机发送按钮并挂载发送弹窗", () => {
    const topbarSource = readFileSync(new URL("./appExtracted/appTopbar.tsx", import.meta.url), "utf8");
    const exportButton = topbarSource.indexOf('id="topbar-export"');
    const sendButton = topbarSource.indexOf('id="topbar-send-model"');
    const templateLabel = topbarSource.indexOf("title={`当前模板：");

    expect(exportButton).toBeGreaterThanOrEqual(0);
    expect(templateLabel).toBeGreaterThan(exportButton);
    expect(sendButton).toBeGreaterThan(exportButton);
    expect(sendButton).toBeLessThan(templateLabel);
    // 仅图标：纸飞机 + aria-label 发送 + 复用顶栏主按钮样式与 T() tooltip 文案
    expect(topbarSource).toContain('T("发送",');
    expect(topbarSource).toContain('id="topbar-send-model" className="topbar-primary-button"');
    expect(topbarSource).toContain('aria-label="发送"><Send size={16}/></button>');
    expect(topbarSource).toContain("<SendModelDialog");
  });
});

describe("全网拓扑入口", () => {
  test("在顶栏把仅图标的全局线路按钮放到全网拓扑按钮左侧并挂载独立弹窗", () => {
    const topbarSource = readFileSync(new URL("./appExtracted/appTopbar.tsx", import.meta.url), "utf8");
    const viewSource = readAppViewSources();
    const globalLineButton = topbarSource.indexOf('aria-label="全局线路"');
    const topologyButton = topbarSource.indexOf('aria-label="全网拓扑"');

    expect(globalLineButton).toBeGreaterThanOrEqual(0);
    expect(topologyButton).toBeGreaterThan(globalLineButton);
    expect(topbarSource).toMatch(/aria-label="全局线路"[^>]*>\s*<Cable size=\{16\}\/>\s*<\/button>/);
    expect(viewSource).toContain("<AllNetworkTopologyDialog");
  });

  test("应用作用域提供独立的全局线路列表窗口状态", () => {
    const source = readFileSync(new URL("./App.tsx", import.meta.url), "utf8");

    expect(source).toContain("const [globalLineListOpen, setGlobalLineListOpen] = useState(false)");
    expect(source).toContain("Object.assign(__appScope, { globalLineListOpen, setGlobalLineListOpen })");
  });

  test("把全局线路窗口纳入资源弹窗渲染激活条件以支持打开和关闭", () => {
    const source = readFileSync(new URL("./appExtracted/appView.tsx", import.meta.url), "utf8");
    const resourceDialogLayerActive = source.match(
      /const resourceDialogLayerActive = Boolean\([\s\S]*?\);/
    )?.[0] ?? "";

    expect(resourceDialogLayerActive).toContain("__appScope.globalLineListOpen");
  });
});

describe("全局线路首末端提示", () => {
  test("选择窗口明确显示首末端校核结果，并说明复用不会改写已有端子", () => {
    const source = readAppViewSources();

    expect(source).toContain('globalLinePlacementDialog.boundaryEndpoint === "source" ? "首端" : "末端"');
    expect(source).toContain("复用只做一致性校核，不修改已有全局线路的首末端信息");
    expect(source).toContain("⚠ 端点不一致");
  });

  test("在渲染批次生成界面前把全局线路弹窗状态注入应用作用域", () => {
    const source = readFileSync(new URL("./App.tsx", import.meta.url), "utf8");
    const globalLineHook = source.indexOf("useGlobalLines(__appScope);");
    const renderBatchHook = source.indexOf("useRenderBatch(__appScope);");

    expect(globalLineHook).toBeGreaterThanOrEqual(0);
    expect(renderBatchHook).toBeGreaterThan(globalLineHook);
  });
});

describe("未保存模型的保存后切换提示", () => {
  test("保存过程中显示忙碌状态，保存失败信息位于弹窗内且全局提示不被遮罩", () => {
    const source = readAppViewSources();
    const styles = readFileSync(new URL("./styles.css", import.meta.url), "utf8");

    expect(source).toContain("pendingUnsavedAction.resolving");
    expect(source).toContain("正在保存...");
    expect(source).toContain('className="unsaved-change-error"');
    expect(source).toContain('role="alert"');
    expect(source).toContain("disabled={pendingUnsavedActionResolving}");
    expect(styles).toMatch(/\.unsaved-change-error\s*\{[\s\S]*?color:\s*#b91c1c/);
    expect(styles).toMatch(/\.global-message\s*\{[\s\S]*?z-index:\s*15000/);
  });
});

describe("app view inspector tab visibility", () => {
  test("shows device details only on the device tab", () => {
    expect(inspectorTabShowsDevicePanel("model", true)).toBe(false);
    expect(inspectorTabShowsDevicePanel("tree", true)).toBe(false);
    expect(inspectorTabShowsDevicePanel("graph", true)).toBe(false);
    expect(inspectorTabShowsDevicePanel("device", true)).toBe(true);
    expect(inspectorTabShowsDevicePanel("device", false)).toBe(false);
  });
});

describe("app view device model parameter keys", () => {
  test("keeps dev_type in the model panel for E devices without stored custom definitions", () => {
    const keys = resolveDeviceModelPanelParameterKeys(
      ["idx", "name", "node", "control_type", "p_set", "run_stat"],
      [],
      []
    );

    expect(keys).toEqual([
      "idx",
      "name",
      "dev_type",
      "node",
      "control_type",
      "p_set",
      "run_stat"
    ]);
  });

  test("shows the owning class for dev_type even when the node stores a legacy value", () => {
    // 容器例外:容器无 E 设备类,dev_type 显示容器元件英文名(与容器段导出同值)
    for (const kind of ["ac-vpp-box", "ac-switch-box", "ac-distribution-box"]) {
      expect(resolveDeviceModelPanelDevType(kind, {})).toBe(kind);
    }
    // 判据先剥 -vertical(与 inferESection 同源):变体 kind 也命中容器且回报基名(今日无此变体,防将来分叉)
    expect(resolveDeviceModelPanelDevType("ac-vpp-box-vertical", {})).toBe("ac-vpp-box");
    expect(resolveDeviceModelPanelDevType("ac-wind-source", { dev_type: "ac-wind-source" })).toBe("ACWindGen");
    expect(resolveDeviceModelPanelDevType("ac-series-reactor", { dev_type: "REACTOR" })).toBe("ACSeriCompensator");
    expect(resolveDeviceModelPanelDevType("ac-wind-source", {})).toBe("ACWindGen");
    expect(resolveDeviceModelPanelDevType("ac-source", { component_type: "ACGenerator" })).toBe("ACGenerator");
    expect(resolveDeviceModelPanelDevType("custom-source", { component_type: "CustomGenerator" })).toBe("CustomGenerator");
  });

  test("shows only i_node and j_node for AC and DC branch models", () => {
    for (const kind of ["ac-line", "dc-line"] as const) {
      const template = DEVICE_LIBRARY.find((candidate) => candidate.kind === kind)!;
      const definitionGroups = resolveDeviceModelPanelDefinitionGroups(template, DEVICE_LIBRARY)!;
      const keys = resolveDeviceModelPanelParameterKeys(
        getEParameterKeys(template.kind, template.params),
        getTemplateParameterDefinitions(template),
        Object.keys(template.params),
        definitionGroups
      );

      expect(keys, kind).toEqual(expect.arrayContaining(["i_node", "j_node"]));
      expect(keys, kind).not.toEqual(expect.arrayContaining(["t1_node", "t2_node"]));
    }
  });

  test("shows base class E fields together with derived-specific fields", () => {
    const keys = resolveDeviceModelPanelParameterKeys(
      ["idx", "name", "node", "control_type", "p_set", "run_stat"],
      [
        { cnName: "水电机组型号", enName: "hydroUnitModel", valueType: "string", typicalValue: "" },
        { cnName: "水轮机类型", enName: "turbineType", valueType: "stringEnum", typicalValue: "" }
      ],
      []
    );

    expect(keys).toEqual([
      "idx",
      "name",
      "dev_type",
      "node",
      "control_type",
      "p_set",
      "run_stat",
      "hydroUnitModel",
      "turbineType"
    ]);
  });

  test("uses exactly the same 29 effective ACGenerator definitions as the class editor", () => {
    const baseTemplate = DEVICE_LIBRARY.find((template) => template.kind === "ac-source")!;
    const baseNode = createDefaultNode("ac-source", { x: 100, y: 100 });
    const builtInClassDefinition = resolveEditableComponentLibraryDefinition({
      className: "ACGenerator",
      categoryLibraryName: "交流设备",
      templates: DEVICE_LIBRARY,
      overrides: {}
    })!;
    const classOverrideKey = componentLibraryDefinitionOverrideKey("ACGenerator");
    const deviceDefinitionOverrides: Record<string, DeviceTemplateDefinitionOverride> = {
      [classOverrideKey]: {
        kind: classOverrideKey,
        parameterDefinitions: [
          ...builtInClassDefinition.parameterDefinitions,
          { cnName: "测试2", enName: "test2", valueType: "string", typicalValue: "aaa", readonly: false }
        ]
      }
    };
    const expectedClassDefinition = resolveEditableComponentLibraryDefinition({
      className: "ACGenerator",
      categoryLibraryName: "交流设备",
      templates: DEVICE_LIBRARY,
      overrides: deviceDefinitionOverrides
    })!;
    const staleStoredDefinitions = getTemplateParameterDefinitions(baseTemplate).filter((definition) => [
      "idx",
      "name",
      "node",
      "control_type",
      "p_set"
    ].includes(definition.enName));
    const definitionGroups = resolveDeviceModelPanelDefinitionGroups(
      baseTemplate,
      DEVICE_LIBRARY,
      [],
      deviceDefinitionOverrides
    )!;
    const panelDefinitions = [
      ...definitionGroups.baseDefinitions,
      ...definitionGroups.derivedDefinitions
    ];

    const keys = resolveDeviceModelPanelParameterKeys(
      getEParameterKeys(baseNode.kind, baseNode.params),
      staleStoredDefinitions,
      Object.keys(baseNode.params),
      definitionGroups
    );

    expect(panelDefinitions.map((definition) => definition.enName)).toEqual(
      expectedClassDefinition.effectiveParameterDefinitions.map((definition) => definition.enName)
    );
    expect(keys).toEqual(expectedClassDefinition.effectiveParameterDefinitions.map((definition) => definition.enName));
    expect(keys).toHaveLength(29);
    expect(keys).toContain("status");
    expect(keys).toContain("test2");
    expect(panelDefinitions.find((definition) => definition.enName === "test2")?.typicalValue).toBe("aaa");
  });

  test("shows every base-class field before derived fields and ignores stale stored definitions", () => {
    const derivedTemplate = DEVICE_LIBRARY.find((template) => template.kind === "ac-hydro-source")!;
    const derivedNode = createDefaultNode("ac-hydro-source", { x: 100, y: 100 });
    const staleStoredDefinitions = [
      ...getTemplateParameterDefinitions(derivedTemplate),
      { cnName: "水轮机台数", enName: "turbine_count", valueType: "integer", typicalValue: "1" }
    ];
    const derivedClassName = templateDerivedComponentLibraryInfo(derivedTemplate)!.derivedComponentLibrary;
    const expectedClassDefinition = resolveEditableComponentLibraryDefinition({
      className: derivedClassName,
      categoryLibraryName: derivedTemplate.categoryLibrary,
      templates: DEVICE_LIBRARY,
      overrides: {}
    })!;
    const definitionGroups = resolveDeviceModelPanelDefinitionGroups(derivedTemplate, DEVICE_LIBRARY)!;

    const keys = resolveDeviceModelPanelParameterKeys(
      getEParameterKeys(derivedNode.kind, derivedNode.params),
      staleStoredDefinitions,
      Object.keys(derivedNode.params),
      definitionGroups
    );

    const expectedKeys = expectedClassDefinition.effectiveParameterDefinitions.map((definition) => definition.enName);
    expect(keys).toEqual(expectedKeys);
    expect(new Set(keys).size).toBe(keys.length);
    expect(keys).not.toContain("turbine_count");
    expect(keys.indexOf("run_stat")).toBeLessThan(keys.indexOf("hydro_unit_model"));
  });
});

describe("容器「模型」面板参数键", () => {
  const containerRawKeys = () => {
    const node = createDefaultNode("ac-vpp-box", { x: 0, y: 0 });
    const template = DEVICE_LIBRARY.find((candidate) => candidate.kind === node.kind);
    const definitionGroups = resolveDeviceModelPanelDefinitionGroups(template, DEVICE_LIBRARY);
    return resolveDeviceModelPanelParameterKeys(
      getEParameterKeys(node.kind, node.params),
      [],
      Object.keys(node.params),
      definitionGroups
    );
  };

  test("剔除两行无人读取/重复的 E 列（is_gateway / bound_device_idx）", () => {
    // 修前这两行确实在渲染键里:is_gateway 与「是否作为关口设备」下拉重复、bound_device_idx 恒空(导出用 bound_device_id 反查)
    expect(containerRawKeys()).toEqual(expect.arrayContaining(["dev_type", "is_gateway", "bound_device_idx"]));
    // type 列已从容器段删除:它不再出现在渲染键里(剔除清单中的 type 项随之删除)
    expect(containerRawKeys()).not.toContain("type");

    const keys = resolveAcContainerModelPanelParamKeys(containerRawKeys(), true);

    expect(keys).not.toContain("is_gateway");
    expect(keys).not.toContain("bound_device_idx");
    // dev_type 行保留且显示容器元件英文名(与 E 文件容器段同值,见 resolveDeviceModelPanelDevType)
    expect(keys).toEqual(expect.arrayContaining(["idx", "name", "dev_type"]));
  });

  test("非容器设备原样返回（同名键在普通设备上仍有意义）", () => {
    const keys = ["idx", "name", "dev_type", "type", "is_gateway", "bound_device_idx"];

    expect(resolveAcContainerModelPanelParamKeys(keys, false)).toEqual(keys);
  });

  // 面板渲染跑不了用例(整棵 __appScope),渲染侧接线只能按源码守卫:剔除必须包在键计算外层
  test("渲染侧接上剔除口径", () => {
    const panelSource = readFileSync(new URL("./appExtracted/appRightPanel.tsx", import.meta.url), "utf8");

    expect(panelSource).toContain("resolveAcContainerModelPanelParamKeys(resolveDeviceModelPanelParameterKeys(");
  });
});

describe("container device parameter options", () => {
  test.each([
    ["ac-electrolyzer", "AcE2Hydro"],
    ["dc-electrolyzer", "DcE2Hydro"],
    ["ac-fuel-cell", "Hydro2AcE"],
    ["dc-fuel-cell", "Hydro2DcE"]
  ] as const)("resolves %s container rows to the dedicated E section", (kind, expectedSection) => {
    const node = createDefaultNode(kind, { x: 100, y: 100 });
    const section = resolveContainerParameterViewComponentLibrary(node, { kind: "container" });

    expect(section).toBe(expectedSection);
    expect(paramOptionsForSection("control_type", section)).toEqual(["P", "FLOW"]);
  });

  test("keeps the explicit component library for associated-device rows", () => {
    const node = createDefaultNode("ac-electrolyzer", { x: 100, y: 100 });

    expect(resolveContainerParameterViewComponentLibrary(node, {
      kind: "associated",
      componentLibrary: "ACLoad"
    })).toBe("ACLoad");
  });
});

describe("app view device definition parameter rows", () => {
  test("shows core E fields first and keeps device parameters last in definition order", () => {
    const acGeneratorFields = [
      "rated_capacity",
      "rated_voltage",
      "frequency",
      "short_circuit_capacity",
      "idx",
      "name",
      "dev_type",
      "node",
      "control_type",
      "p_set",
      "p_max",
      "p_min",
      "q_set",
      "q_max",
      "q_min",
      "v_set",
      "alpha",
      "run_stat",
      "status",
      "source_type"
    ].map((sourceName) => ({ sourceName, exportName: sourceName }));
    const acBranchFields = ["r", "x", "b", "idx", "name", "dev_type", "i_node", "j_node", "run_stat"]
      .map((sourceName) => ({ sourceName, exportName: sourceName }));

    expect(resolveEDeviceInterfaceFieldsForDisplay("ACGenerator", acGeneratorFields).map((field) => field.sourceName)).toEqual([
      "idx",
      "name",
      "dev_type",
      "node",
      "control_type",
      "p_set",
      "p_max",
      "p_min",
      "q_set",
      "q_max",
      "q_min",
      "v_set",
      "alpha",
      "run_stat",
      "status",
      "source_type",
      "rated_capacity",
      "rated_voltage",
      "frequency",
      "short_circuit_capacity"
    ]);
    expect(resolveEDeviceInterfaceFieldsForDisplay("ACBranch", acBranchFields).map((field) => field.sourceName)).toEqual([
      "idx",
      "name",
      "dev_type",
      "i_node",
      "j_node",
      "run_stat",
      "r",
      "x",
      "b"
    ]);
  });

  test("moves every E interface field, including fixed fields, only within valid bounds", () => {
    const fields = ["idx", "name", "dev_type", "node"].map((sourceName) => ({ sourceName }));

    expect(moveEDeviceInterfaceFieldOrder(fields, "dev_type", -1)).toEqual(["idx", "dev_type", "name", "node"]);
    expect(moveEDeviceInterfaceFieldOrder(fields, "idx", -1)).toEqual(["idx", "name", "dev_type", "node"]);
    expect(moveEDeviceInterfaceFieldOrder(fields, "node", 1)).toEqual(["idx", "name", "dev_type", "node"]);
    expect(moveEDeviceInterfaceFieldOrder(fields, "idx", 1)).toEqual(["name", "idx", "dev_type", "node"]);
  });

  test("shows only icon definition for concrete components while classes keep definition tabs", () => {
    expect(customDeviceDefinitionUsesIconOnly(
      { kind: "componentLibrary", categoryLibraryName: "交流设备", section: "CustomDevice5" },
      { categoryLibraryName: "交流设备", componentLibrary: "CustomDevice5", componentKind: "new-custom-device" }
    )).toBe(true);
    expect(customDeviceDefinitionUsesIconOnly(
      { kind: "component", categoryLibraryName: "静态图元", templateKind: "custom-static-symbol" },
      { categoryLibraryName: "静态图元", componentKind: "custom-static-symbol" }
    )).toBe(true);
    expect(customDeviceDefinitionUsesIconOnly(
      { kind: "component", categoryLibraryName: "自定义类别", templateKind: "static-line" },
      { categoryLibraryName: "自定义类别", componentKind: "static-line" }
    )).toBe(true);
    expect(customDeviceDefinitionUsesIconOnly(
      { kind: "component", categoryLibraryName: "交流设备", templateKind: "ac-breaker" },
      { categoryLibraryName: "交流设备", componentKind: "ac-breaker" }
    )).toBe(true);
    expect(customDeviceDefinitionUsesIconOnly(
      { kind: "componentLibrary", categoryLibraryName: "静态图元", section: "StaticBasicShape" },
      { categoryLibraryName: "静态图元", componentKind: "" }
    )).toBe(false);
  });

  test("tracks E interface unsaved changes from class and field export settings", () => {
    const signatureFor = (appViewModule as any).eDeviceInterfaceDefinitionSignature;

    expect(typeof signatureFor).toBe("function");
    if (typeof signatureFor !== "function") {
      return;
    }

    const rows = [
      {
        componentLibrary: "ACGenerator",
        exportEnabled: true,
        exportName: "ACGenerator",
        fields: [
          { sourceName: "node", exportEnabled: true, exportName: "node" },
          { sourceName: "p_set", exportEnabled: true, exportName: "p_set" }
        ]
      }
    ];
    const baseline = signatureFor(rows);

    expect(signatureFor(rows.map((row: any) => ({ ...row, label: "交流电源" })))).toBe(baseline);
    expect(signatureFor(rows.map((row: any) => ({ ...row, exportName: "Generator" })))).not.toBe(baseline);
    expect(signatureFor(rows.map((row: any) => ({
      ...row,
      fields: row.fields.map((field: any) => field.sourceName === "node" ? { ...field, exportName: "inode" } : field)
    })))).not.toBe(baseline);
    expect(signatureFor(rows.map((row: any) => ({
      ...row,
      fields: [...row.fields].reverse()
    })))).not.toBe(baseline);
  });

  test("tracks the selected E interface class and prompts before switching dirty definitions", () => {
    const classSignatureFor = (appViewModule as any).eDeviceInterfaceClassDefinitionSignature;
    const fieldDefinitionMatches = (appViewModule as any).eDeviceInterfaceFieldDefinitionMatches;
    const source = readAppViewSources();
    const row = {
      componentLibrary: "ACGenerator",
      exportEnabled: true,
      exportName: "ACGenerator",
      fields: [
        { sourceName: "node", exportEnabled: true, exportName: "node" },
        { sourceName: "p_set", exportEnabled: true, exportName: "p_set" }
      ]
    };

    expect(typeof classSignatureFor).toBe("function");
    expect(typeof fieldDefinitionMatches).toBe("function");
    expect(classSignatureFor({ ...row, label: "交流电源" })).toBe(classSignatureFor(row));
    expect(classSignatureFor({
      ...row,
      fields: row.fields.map((field) => field.sourceName === "p_set" ? { ...field, exportName: "active_power" } : field)
    })).not.toBe(classSignatureFor(row));
    expect(fieldDefinitionMatches(row.fields[0], { ...row.fields[0] })).toBe(true);
    expect(fieldDefinitionMatches(row.fields[0], { ...row.fields[0], exportName: "inode" })).toBe(false);
    expect(source).toContain("requestSelectEDeviceInterfaceComponentLibrary");
    expect(source).toContain("e-device-interface-class-switch-dialog");
    expect(source).toContain("不保存并切换");
    expect(source).toContain("保存并切换");
  });

  test("groups E interface classes as category and derived-class tree nodes", () => {
    const buildTree = (appViewModule as any).buildEDeviceInterfaceDefinitionTree;

    expect(typeof buildTree).toBe("function");
    if (typeof buildTree !== "function") {
      return;
    }

    const tree = buildTree([
      {
        componentLibrary: "ACGenerator",
        categoryLibrary: "交流设备",
        label: "交流电源",
        fields: []
      },
      {
        componentLibrary: "ACWindGen",
        categoryLibrary: "交流设备",
        label: "交流风电",
        isDerivedComponentLibrary: true,
        derivedFromComponentLibrary: "ACGenerator",
        fields: []
      },
      {
        componentLibrary: "ACPVGen",
        categoryLibrary: "交流设备",
        label: "交流光伏",
        isDerivedComponentLibrary: true,
        derivedFromComponentLibrary: "ACGenerator",
        fields: []
      },
      {
        componentLibrary: "CustomText",
        categoryLibrary: "静态图元",
        label: "文字",
        fields: []
      }
    ]);

    expect(tree.map((category: any) => category.label)).toEqual(["交流设备", "静态图元"]);
    expect(tree[0].classCount).toBe(3);
    expect(tree[0].items.map((item: any) => item.row.componentLibrary)).toEqual(["ACGenerator"]);
    expect(tree[0].items[0].children.map((row: any) => row.componentLibrary)).toEqual([
      "ACWindGen",
      "ACPVGen"
    ]);
    expect(tree[1].items[0].row.componentLibrary).toBe("CustomText");
  });

  test("renders the E interface dialog after the custom device dialog so it is not hidden behind it", () => {
    const source = readAppViewSources();

    expect(source.indexOf("{customDeviceDialogOpen &&")).toBeLessThan(
      source.indexOf("{eDeviceDefinitionInterfaceDialogOpen &&")
    );
  });

  test("renders the E interface dialog as a left class tree with a right parameter table", () => {
    const source = readAppViewSources();

    expect(source).toContain("e-device-interface-layout");
    expect(source).toContain("e-device-interface-class-list");
    expect(source).toContain('role="tree"');
    expect(source).toContain("e-device-interface-tree-category");
    expect(source).toContain("e-device-interface-tree-branch");
    expect(source).toContain("e-device-interface-detail");
    expect(source).toContain("selectedEDeviceInterfaceRow");
    expect(source).toMatch(/selectedEDeviceInterfaceFields\.map/);
  });

  test("renders explicit save and exit actions with Ctrl+S handling", () => {
    const source = readAppViewSources();

    expect(source).toContain("e-device-interface-footer");
    expect(source).toContain("saveEDeviceInterfaceDefinition");
    expect(source).toContain("requestCloseEDeviceInterfaceDefinition");
    expect(source).toContain("e-device-interface-unsaved-dialog");
    expect(source).toContain("eDeviceInterfaceSaveRef");
    expect(source).toContain("runAfterEDeviceInterfaceInputCommit");
    expect(source).toContain("requestSaveEDeviceInterfaceDefinition");
    expect(source).toContain("requestExportEDeviceInterfaceDefinitionFile");
    expect(source).toContain("activeElement.blur()");
    expect(source).toMatch(/event\.key\.toLowerCase\(\) === "s"/);
  });

  test("keeps the top toolbar compact with icon-only mode and export actions", () => {
    const source = readSourceFiles("./appExtracted/appTopbar.tsx", ...APP_VIEW_SOURCE_FILES);
    const appSource = readFileSync(new URL("./App.tsx", import.meta.url), "utf8");
    const styles = readFileSync(new URL("./styles.css", import.meta.url), "utf8");
    const modeButton = source.match(
      /<button type="button"(?: id="[^"]*")? className=\{`topbar-primary-button[^`]*`\} onClick=\{toggleInteractionMode\}[\s\S]*?<\/button>/
    )?.[0] ?? "";
    const exportActions = source.match(
      /<div className="topbar-center-actions">[\s\S]*?<div className="topbar-model"/
    )?.[0] ?? "";
    const toolbarPreviewButton = source.match(
      /\{ENABLE_REACT_FLOW_PREVIEW && \(<button className="topbar-primary-button react-flow-preview-button"[\s\S]*?<\/button>\)\}/
    );

    expect(modeButton).toContain("toggleInteractionMode");
    expect(modeButton).toContain("isEditMode ? <Pencil");
    expect(modeButton).toContain("browse-mode-toggle");
    expect(modeButton).toMatch(/<svg[^>]*>[\s\S]*<line/);
    expect(modeButton).not.toContain("编辑模式</span>");
    expect(modeButton).not.toContain("浏览模式</span>");
    expect(modeButton).not.toContain("mode-toggle-button");
    expect(source).toContain("requestExportWithSave(() => doExport(encoding))");
    expect(source).toContain("modelTypeMismatchMessage()");
    expect(exportActions).toContain('action: exportSvg, validatesEInterface: true');
    expect(exportActions).toContain('action: exportEFile, validatesEInterface: true');
    expect(exportActions).toContain('action: exportSvgFile, validatesEInterface: false');
    expect(exportActions).toContain('action: exportJsonFile, validatesEInterface: false');
    expect(exportActions).toContain('requestEncodedExport(item.action, "utf-8", item.validatesEInterface)');
    expect(exportActions).toContain('requestEncodedExport(item.action, "gbk", item.validatesEInterface)');
    expect(exportActions).toContain('className="export-encoding-submenu"');
    expect(exportActions).toContain("UTF-8</button>");
    expect(exportActions).toContain("GBK</button>");
    expect(styles).toMatch(/\.export-encoding-submenu\s*\{[\s\S]*?right:\s*calc\(100% \+ 6px\)/);
    expect(styles).toMatch(/\.export-submenu-chevron\s*\{[\s\S]*?transform:\s*rotate\(180deg\)/);
    expect(exportActions).toContain("导出 E 文件");
    expect(exportActions).toContain("导出 SVG");
    expect(exportActions).toContain("导出 JSON");
    expect(exportActions).toContain("导出 E、JSON 和 SVG");
    expect(source).not.toContain("exportPointerDownAtRef");
    expect(source).toContain("void doExport()");
    expect(source).toContain('className="unsaved-change-dialog export-completion-dialog window-close-host"');
    expect(source).toContain('aria-labelledby="export-completion-title"');
    expect(source).toContain("setExportCompletionDialog(null)");
    expect(source).toContain("确定");
    expect(appSource).toContain("Object.assign(__appScope, { globalMessage, setGlobalMessage, globalMessageTimerRef })");
    expect(exportActions).toContain('role="menu" aria-label="导出选项"');
    expect(exportActions).not.toContain("exportDropdownOpen");
    expect(exportActions).not.toContain("setExportDropdownOpen");
    expect(toolbarPreviewButton).toBeNull();
  });

  test("export dropdown menu includes 导出 CIM/XML item", () => {
    const source = readSourceFiles("./appExtracted/appTopbar.tsx", ...APP_VIEW_SOURCE_FILES);
    const exportActions = source.match(
      /<div className="topbar-center-actions">[\s\S]*?<div className="topbar-model"/
    )?.[0] ?? "";

    expect(exportActions).toContain('label: "导出 CIM/XML"');
    expect(exportActions).toContain("action: exportCimFile, validatesEInterface: false");
    expect(source).toContain("exportCimFile,");
  });

  test("combines grouping actions into a borderless popup menu", () => {
    const source = readFileSync(new URL("./appExtracted/appTopbar.tsx", import.meta.url), "utf8");
    const styles = readFileSync(new URL("./styles.css", import.meta.url), "utf8");
    const actionCluster = source.match(
      /<div className="action-cluster">[\s\S]*?<input ref=\{imageInputRef\}/
    )?.[0] ?? "";
    const groupDropdown = actionCluster.match(
      /<div className="topbar-dropdown group-dropdown">[\s\S]*?<div className="topbar-dropdown display-layer-dropdown">/
    )?.[0] ?? "";
    const topbarMenuButtonRule = styles.match(
      /\.topbar-dropdown-menu button\s*\{([\s\S]*?)\}/
    )?.[1] ?? "";
    const stateIconMenuButtonRule = styles.match(
      /\.state-icon-context-menu button\s*\{([\s\S]*?)\}/
    )?.[1] ?? "";

    expect(groupDropdown).toContain('aria-label="组合操作"');
    expect(groupDropdown).toContain('role="menu" aria-label="组合操作"');
    expect(groupDropdown).toContain("onClick={groupSelectedGraphics}");
    expect(groupDropdown).toContain("onClick={ungroupSelectedGraphics}");
    expect(groupDropdown).toContain("<span>组合</span>");
    expect(groupDropdown).toContain("<span>解除组合</span>");
    expect(actionCluster).toMatch(
      /<div className="action-cluster">\s*<div className="topbar-dropdown group-dropdown">/
    );
    expect(topbarMenuButtonRule).toMatch(/border:\s*0/);
    expect(topbarMenuButtonRule).toMatch(/background:\s*transparent/);
    expect(stateIconMenuButtonRule).toMatch(/border:\s*0/);
    expect(stateIconMenuButtonRule).toMatch(/background:\s*transparent/);
  });

  test("moves the selection action cluster into the canvas bottom toolbar", () => {
    const canvasSource = readFileSync(new URL("./appExtracted/appCanvasArea.tsx", import.meta.url), "utf8");
    const topbarSource = readFileSync(new URL("./appExtracted/appTopbar.tsx", import.meta.url), "utf8");
    const controls = canvasSource.match(
      /<div className="viewport-controls" role="group"[\s\S]*?<button type="button" title="适配视图"/
    )?.[0] ?? "";
    const topbarHeader = topbarSource.match(/<header className="topbar">[\s\S]*?<\/header>/)?.[0] ?? "";

    // 选中操作组挂在视口按钮左侧，紧跟竖线分隔
    expect(controls).toMatch(/<SelectionActionCluster scope=\{scope\}\/>\s*<span className="viewport-controls-divider"/);
    // 顶栏不再承载这组按钮
    expect(topbarHeader).not.toContain('className="action-cluster"');
    expect(topbarHeader).not.toContain("topbar-group-merge");
    expect(topbarSource).toContain("export function SelectionActionCluster");
  });

  test("keeps export configuration columns only in the E interface definition dialog", () => {
    const source = readAppViewSources();
    const eInterfaceStart = source.indexOf("{eDeviceDefinitionInterfaceDialogOpen &&");

    expect(eInterfaceStart).toBeGreaterThan(0);
    const deviceDefinitionSource = source.slice(0, eInterfaceStart);
    const eInterfaceSource = source.slice(eInterfaceStart);

    expect(deviceDefinitionSource).not.toContain("<th>是否导出</th>");
    expect(deviceDefinitionSource).not.toContain("<th>导出名称</th>");
    expect(eInterfaceSource).toContain("<th>是否导出</th>");
    expect(eInterfaceSource).toContain("<th>导出名称</th>");
    expect(eInterfaceSource).toContain("<th>顺序</th>");
    expect(eInterfaceSource).toContain("e-device-interface-order-actions");
  });

  test("filters polluted base rows from derived component parameter tables", () => {
    const rows = resolveDeviceDefinitionParameterRowsForDisplay(
      [
        { id: "idx", enName: "idx" },
        { id: "name", enName: "name" },
        { id: "status", enName: "status" },
        { id: "hydro", enName: "hydroUnitModel" },
        { id: "turbine", enName: "turbineType" },
        { id: "node", enName: "node" }
      ],
      [
        { enName: "hydroUnitModel" },
        { enName: "turbineType" }
      ]
    );

    expect(rows.map((row) => row.enName)).toEqual(["hydroUnitModel", "turbineType"]);
  });

  test("keeps new derived parameter draft rows visible while hiding base rows", () => {
    const rows = resolveDeviceDefinitionParameterRowsForDisplay(
      [
        { id: "base", enName: "p_set" },
        { id: "existing-derived", enName: "hydroUnitModel" },
        { id: "new-blank", enName: "" },
        { id: "new-derived", enName: "ownerName" }
      ],
      [
        { enName: "hydroUnitModel" }
      ],
      {
        baseComponentLibrary: "ACGenerator",
        isDerivedComponentBaseParamName: (name: unknown) => String(name ?? "").trim() === "p_set"
      }
    );

    expect(rows.map((row) => row.id)).toEqual(["existing-derived", "new-blank", "new-derived"]);
  });

  test("renders the parameter table from display-filtered rows", () => {
    const source = readAppViewSources();

    expect(source).toMatch(/definitionDraftRowsForDisplay\.map\(\(row, rowIndex\)/);
    expect(source).not.toMatch(/definitionDraftRows\.map\(\(row\)\s*=>\s*\(<tr key=\{row\.id\}/);
  });

  test("renders sequence columns and bulk operation toolbars above definition tables", () => {
    const viewSource = readAppViewSources();
    const measurementSource = readFileSync(new URL("./appExtracted/appProjectCanvasFactories.tsx", import.meta.url), "utf8");
    const stylesSource = readFileSync(new URL("./styles.css", import.meta.url), "utf8");

    const parameterToolbarIndex = viewSource.indexOf('className="definition-table-toolbar" aria-label="参数定义表格操作"');
    const parameterTableIndex = viewSource.indexOf('className="custom-param-table-wrap device-definition-table-wrap"', parameterToolbarIndex);
    expect(parameterToolbarIndex).toBeGreaterThan(-1);
    expect(parameterTableIndex).toBeGreaterThan(parameterToolbarIndex);
    expect(viewSource).toContain('<th className="definition-table-sequence">序号</th>');
    expect(viewSource).toContain('aria-selected={selectedDefinitionParameterRowIdSet.has(row.id)}');
    expect(stylesSource).toMatch(/\.custom-device-tab-panel-parameters\s*\{[^}]*grid-template-rows:\s*auto minmax\(0, 1fr\)/s);

    const measurementToolbarIndex = measurementSource.indexOf('className="measurement-profile-toolbar"');
    const measurementTableIndex = measurementSource.indexOf('className="measurement-table-wrap"', measurementToolbarIndex);
    const measurementPanelSource = measurementSource.slice(
      measurementSource.indexOf("export function createRenderDeviceDefinitionMeasurementPanel"),
      measurementSource.indexOf("export function createRenderMeasurementConfigDialog")
    );
    expect(measurementToolbarIndex).toBeGreaterThan(-1);
    expect(measurementTableIndex).toBeGreaterThan(measurementToolbarIndex);
    expect(measurementPanelSource).not.toContain('<th>操作</th>');
    expect(measurementPanelSource).toContain('aria-selected={selectedRowIndexSet.has(itemIndex)}');
  });

  test("passes the published measurement draft into the definition measurement panel", () => {
    const source = readAppViewSources();

    expect(source).toContain("Array.isArray(__appScope.definitionMeasurementDraft)");
    expect(source).toContain("? __appScope.definitionMeasurementDraft");
    expect(source).toContain("setItems: __appScope.setDefinitionMeasurementDraft");
    expect(source).not.toContain("items: definitionMeasurementDraft");
    expect(source).not.toContain("setItems: setDefinitionMeasurementDraft");
  });

  test("keeps derived edit dialogs from injecting base default parameters", () => {
    const source = readFileSync(new URL("./App.tsx", import.meta.url), "utf8")
      + readFileSync(new URL("./appExtracted/appStateBatch.tsx", import.meta.url), "utf8")
      + readFileSync(new URL("./appExtracted/appCanvasViewportBatch.tsx", import.meta.url), "utf8")
      + readFileSync(new URL("./appExtracted/appRenderBatch.tsx", import.meta.url), "utf8");

    expect(source).toMatch(/isDerivedComponentLibrary:\s*customDeviceDraft\.isDerivedComponentLibrary/);
  });

  test("exposes derivation controls only while creating a component library", () => {
    const source = readAppViewSources();

    expect(source).not.toContain("派生类中文名称");
    expect(source.match(/派生类英文名称/g)!.length).toBeGreaterThanOrEqual(1);
    expect(source).toContain('"类中文名称"');
    expect(source).toContain('"类英文名称"');
    expect(source).toContain('<span>类</span>');
    expect(source).toContain('placeholder="搜索类别库/类/元件"');
    const legacyClassTerm = ["元件", "库"].join("");
    expect(source).not.toContain(`${legacyClassTerm}中文名称`);
    expect(source).not.toContain(`${legacyClassTerm}英文名称`);
    expect(source).toContain('<span>是否派生类</span>');
    expect(source).toContain('<span>派生基类</span>');
    expect(source).not.toContain('<span>派生关系</span>');
    expect(source).toContain('所属类在创建后不可修改');
    expect(source).not.toContain(`title="点击选择${legacyClassTerm}"`);
    expect(source).toContain('disabled={Boolean(customLibraryCreateDialog.classCreationMode)}');
    expect(source).toContain('disabled={customLibraryCreateDialog.componentClassLocked}');
  });

  test("renders compact terminal energy controls only for base classes", () => {
    const viewSource = readAppViewSources();
    const stylesSource = readFileSync(new URL("./styles.css", import.meta.url), "utf8");

    expect(viewSource).toContain('className="component-library-terminal-types" aria-label="类端子能源属性配置"');
    expect(viewSource).toContain('customComponentTreeSelection?.kind === "componentLibrary" &&');
    expect(viewSource).toContain("!customDeviceDraft.isDerivedComponentLibrary &&");
    expect(viewSource).toContain('aria-label={`端子${index + 1}能源属性`}');
    expect(viewSource).not.toContain('title="能源属性由所属类定义"');
    expect(viewSource).toContain('showComponentLibraryTerminalTypes ? " has-component-library-terminal-types" : ""');
    expect(stylesSource).toMatch(/\.component-library-terminal-types\s*\{[^}]*min-height:\s*34px/s);
    expect(stylesSource).toMatch(/\.custom-device-editor-panel\.has-component-library-terminal-types\s*\{[^}]*grid-template-rows:\s*auto auto auto minmax\(0, 1fr\)/s);
    expect(stylesSource).toMatch(/\.custom-device-tab-panel-parameters\.has-inheritance-note\s*\{[^}]*grid-template-rows:\s*auto auto minmax\(0, 1fr\)/s);
  });

  test("removes the redundant class summary row and keeps the definition tabs at one normal row", () => {
    const viewSource = readAppViewSources();
    const stylesSource = readFileSync(new URL("./styles.css", import.meta.url), "utf8");

    expect(viewSource).not.toContain("device-definition-component-library-editor-header");
    expect(viewSource).not.toContain("device-definition-component-library-header");
    expect(viewSource).not.toContain("componentLibraryLabelValue");
    expect(viewSource).not.toContain("componentLibraryLabelKey");
    expect(stylesSource).toMatch(/\.custom-device-tabs\s*\{[^}]*align-self:\s*start[^}]*min-height:\s*40px/s);
  });

  test("hides component-only name and resize controls when editing a class", () => {
    const viewSource = readAppViewSources();
    const stylesSource = readFileSync(new URL("./styles.css", import.meta.url), "utf8");

    expect(viewSource).toMatch(/customDeviceDefinitionIconOnly && \(<>[\s\S]*?元件中文名称[\s\S]*?componentName[\s\S]*?元件英文名称[\s\S]*?componentKind[\s\S]*?是否允许变形[\s\S]*?<\/>\)}/);
    expect(viewSource).toContain('customDeviceDefinitionIconOnly ? " component-mode" : customComponentTreeSelection?.kind === "componentLibrary" ? " component-library-mode" : ""');
    expect(stylesSource).toMatch(/\.custom-device-form-grid\.component-library-mode\s*\{[^}]*grid-template-columns:/s);
  });

  test("hides class-only category and container controls when editing a component", () => {
    const viewSource = readAppViewSources();
    const stylesSource = readFileSync(new URL("./styles.css", import.meta.url), "utf8");

    expect(viewSource).toMatch(/!customDeviceDefinitionIconOnly && \(\s*<label className="custom-category-library-field">/);
    expect(viewSource).toMatch(/!customDeviceDefinitionIconOnly && \(\s*<label className="custom-device-container-field">/);
    expect(viewSource).toContain('customDeviceDefinitionIconOnly ? " component-mode"');
    expect(stylesSource).toMatch(/\.custom-device-form-grid\.component-mode\s*\{[^}]*grid-template-columns:/s);
  });

  test("keeps the whole right editor in component mode after confirming a new component", () => {
    const viewSource = readAppViewSources();

    expect(viewSource).toMatch(/const visibleCustomDeviceDialogView\s*=\s*customDeviceDefinitionIconOnly\s*\?\s*"icon"\s*:\s*customDeviceDialogView/);
    expect(viewSource).toMatch(/const showComponentLibraryTerminalTypes\s*=\s*!customDeviceDefinitionIconOnly\s*&&\s*customComponentTreeSelection\?\.kind\s*===\s*"componentLibrary"\s*&&\s*!customDeviceDraft\.isDerivedComponentLibrary/);
    expect(viewSource).toMatch(/const showCustomDeviceInheritanceNote\s*=\s*!customDeviceDefinitionIconOnly\s*&&\s*customComponentTreeSelection\?\.kind\s*===\s*"componentLibrary"\s*&&\s*customDeviceDraft\.isDerivedComponentLibrary/);
    expect(viewSource).toMatch(/\(customDeviceDefinitionIconOnly\s*\|\|\s*customComponentTreeSelection\?\.kind\s*!==\s*"componentLibrary"\)\s*&&\s*\(<button/);
    expect(viewSource).toMatch(/!customDeviceDefinitionIconOnly\s*&&\s*\(<>/);
    expect(viewSource).toContain(': "保存新建元件"');
  });

  test("wires component copy and repeated paste actions into the component tree", () => {
    const viewSource = readSourceFiles(...APP_VIEW_SOURCE_FILES, "./appExtracted/appTopbar.tsx");

    expect(viewSource).toContain("copiedCustomComponentTemplate={copiedCustomComponentTemplate}");
    expect(viewSource).toContain("onCopyComponent={copyCustomComponentTemplate}");
    expect(viewSource).toContain("onPasteComponent={pasteCustomComponentTemplate}");
    expect(viewSource).toContain("onExportComponentSvg={exportCustomComponentTemplateSvg}");
    expect(viewSource).toContain("onImportComponentSvg={openCustomComponentSvgImport}");
    expect(viewSource).toContain('accept=".svg,image/svg+xml"');
    expect(viewSource).toContain("onChange={importCustomComponentSvg}");
  });

  test("shows the derived base class with a jump link in the device definition dialog", () => {
    const source = readAppViewSources();

    expect(source).toContain("派生主类");
    expect(source).toContain("selectedDefinitionDerivedBaseTemplate");
    expect(source).toMatch(/derived-base-link[^\n]*loadDefinitionTemplateDraft/);
  });

  test("removes redundant main-class and derived-English-name controls from class and component editors", () => {
    const source = readAppViewSources();

    expect(source).not.toContain("customDeviceDerivedBaseTemplate");
    expect(source).not.toContain("customDeviceDerivedBaseLibrary");
    expect(source).not.toContain("custom-device-derived-base-field");
    expect(source).not.toContain("custom-device-derived-en-field");
  });

  test("removes the centered transform when device library dialogs become floating", () => {
    const styles = readFileSync(new URL("./styles.css", import.meta.url), "utf8");
    const floatingDialogRule = styles.match(
      /\.custom-device-dialog\.floating,\s*\.device-definition-dialog\.floating,\s*\.measurement-config-dialog\.floating,\s*\.measurement-editor-dialog\.floating\s*\{([\s\S]*?)\}/
    )?.[1] ?? "";

    expect(floatingDialogRule).toMatch(/transform:\s*none/);
  });

  test("gives the custom device editor more height without crossing the viewport margin", () => {
    const styles = readFileSync(new URL("./styles.css", import.meta.url), "utf8");
    const customDialogRule = styles.match(/\.custom-device-dialog\s*\{([\s\S]*?)\}/)?.[1] ?? "";

    expect(customDialogRule).toMatch(/height:\s*min\(90vh,\s*calc\(100vh\s*-\s*24px\)\)/);
    expect(customDialogRule).toMatch(/max-height:\s*calc\(100vh\s*-\s*24px\)/);
    expect(CUSTOM_DEVICE_DIALOG_DEFAULT_HEIGHT).toBe(860);
  });

  test("keeps the remaining class and component metadata fields on one desktop row", () => {
    const styles = readFileSync(new URL("./styles.css", import.meta.url), "utf8");
    const classGridRule = styles.match(/\.custom-device-form-grid\.component-library-mode\s*\{([\s\S]*?)\}/)?.[1] ?? "";
    const componentGridRule = styles.match(/\.custom-device-form-grid\.component-mode\s*\{([\s\S]*?)\}/)?.[1] ?? "";

    expect(classGridRule.match(/minmax\(/g)).toHaveLength(5);
    expect(componentGridRule.match(/minmax\(/g)).toHaveLength(6);
    expect(styles).not.toContain("custom-device-derived-base-field");
    expect(styles).not.toContain("custom-device-derived-en-field");
  });

  test("passes derived metadata into custom device measurement positions", () => {
    const source = readFileSync(new URL("./App.tsx", import.meta.url), "utf8")
      + readFileSync(new URL("./appExtracted/appStateBatch.tsx", import.meta.url), "utf8")
      + readFileSync(new URL("./appExtracted/appCanvasViewportBatch.tsx", import.meta.url), "utf8")
      + readFileSync(new URL("./appExtracted/appRenderBatch.tsx", import.meta.url), "utf8");

    expect(source).toMatch(
      /const customDeviceMeasurementPositionDefinitions = buildMeasurementProfilePositionDefinitions\(\{[\s\S]*source:\s*\{[\s\S]*is_derived_component_library:\s*"1"[\s\S]*isDerivedComponentLibrary:\s*customDeviceDraft\.isDerivedComponentLibrary[\s\S]*derivedFromComponentLibrary:\s*customDeviceDraft\.isDerivedComponentLibrary[\s\S]*customDeviceDraft\.derivedFromComponentLibrary \|\| customDeviceDraft\.componentLibrary[\s\S]*derivedComponentLibrary:\s*customDeviceDraft\.isDerivedComponentLibrary \? customDeviceDraft\.derivedComponentLibrary : ""[\s\S]*derivedComponentLibraryLabel:\s*customDeviceDraft\.isDerivedComponentLibrary \? customDeviceDraft\.derivedComponentLibraryLabel : ""/
    );
  });

  test("filters polluted base rows from derived custom component dialogs", () => {
    const rows = resolveCustomDeviceParameterRowsForDisplay(
      [
        { id: "default-idx", enName: "idx" },
        { id: "default-name", enName: "name" }
      ],
      [
        { id: "status", enName: "status" },
        { id: "run-stat", enName: "run_stat" },
        { id: "node", enName: "node" },
        { id: "pv", enName: "pvModuleModel" },
        { id: "mppt", enName: "mpptCount" }
      ],
      {
        isDerivedComponentLibrary: true,
        baseComponentLibrary: "ACGenerator",
        isDerivedComponentBaseParamName: (name: unknown) =>
          ["idx", "name", "status", "run_stat", "node"].includes(String(name ?? "").trim())
      }
    );

    expect(rows.defaultRows.map((row) => row.enName)).toEqual([]);
    expect(rows.customRows.map((row) => row.enName)).toEqual(["pvModuleModel", "mpptCount"]);
  });

  test("keeps new blank rows visible in derived custom component dialogs", () => {
    const rows = resolveCustomDeviceParameterRowsForDisplay(
      [],
      [
        { id: "base-status", enName: "status" },
        { id: "new-blank", enName: "" },
        { id: "new-derived", enName: "ownerName" }
      ],
      {
        isDerivedComponentLibrary: true,
        baseComponentLibrary: "ACGenerator",
        isDerivedComponentBaseParamName: (name: unknown) =>
          !String(name ?? "").trim() ||
          ["idx", "name", "status", "run_stat", "node"].includes(String(name ?? "").trim())
      }
    );

    expect(rows.customRows.map((row) => row.id)).toEqual(["new-blank", "new-derived"]);
  });
});

describe("app view inspector graph id", () => {
  test("uses the same normalized device id rule as SVG export", () => {
    const first = createDefaultNode("ac-box-breaker", { x: 100, y: 100 });
    first.id = "node-1783657543903-first";
    first.params = { ...first.params, idx: "1" };
    const second = createDefaultNode("ac-box-breaker", { x: 200, y: 100 });
    second.id = "node-1783657543903-second";
    second.params = { ...second.params, idx: "2" };

    expect(resolveInspectorGraphId([first, second], second)).toBe("ACBreak-2");
  });

  test("uses stable semantic ids for static graphics regardless of node order", () => {
    const first = createDefaultNode("static-circle", { x: 100, y: 100 });
    first.id = "node-static-b";
    const second = createDefaultNode("static-circle", { x: 200, y: 100 });
    second.id = "node-static-a";

    expect(resolveInspectorGraphId([first, second], second)).toBe("static-circle-1");
    expect(resolveInspectorGraphId([first, second], first)).toBe("static-circle-2");
    expect(resolveInspectorGraphId([second, first], second)).toBe("static-circle-1");
    expect(resolveInspectorGraphId([second, first], first)).toBe("static-circle-2");
  });
});

describe("canvas memoization", () => {
  test("rerenders when visible measurement groups move", () => {
    const sharedScope = {
      visibleNodes: [],
      visibleEdges: [],
      selectedNodeIdSet: new Set<string>(),
      selectedEdgeIds: []
    };
    const previousGroup = {
      id: "measurement-line",
      nodeId: "line-node",
      visible: true,
      offset: { x: -240, y: -90 }
    };
    const nextGroup = {
      ...previousGroup,
      offset: { x: -68, y: -176 }
    };

    expect(areCanvasPropsEqual(
      { scope: { ...sharedScope, visibleMeasurementGroups: [previousGroup] } },
      { scope: { ...sharedScope, visibleMeasurementGroups: [nextGroup] } }
    )).toBe(false);
  });

  test("rerenders when color display mode or palette changes", () => {
    const sharedScope = {
      visibleNodes: [],
      visibleEdges: [],
      selectedNodeIdSet: new Set<string>(),
      selectedEdgeIds: []
    };
    const previousScope = { ...sharedScope, colorDisplayMode: "energy", colorPalette: { voltage: {} } };

    // 切换着色模式（刷子按钮）
    expect(areCanvasPropsEqual(
      { scope: previousScope },
      { scope: { ...sharedScope, colorDisplayMode: "voltage", colorPalette: previousScope.colorPalette } }
    )).toBe(false);

    // 保存配色（颜色配置按钮）
    expect(areCanvasPropsEqual(
      { scope: previousScope },
      { scope: { ...sharedScope, colorDisplayMode: "energy", colorPalette: { voltage: {}, energy: {} } } }
    )).toBe(false);
  });
});

describe("user customization manager entry", () => {
  test("keeps the customization manager in the topbar to the left of the save button", () => {
    const source = readFileSync(new URL("./appExtracted/appTopbar.tsx", import.meta.url), "utf8");
    const topbarActions = source.match(
      /<div className="topbar-center-actions">[\s\S]*?<div className="topbar-model"/
    )?.[0] ?? "";

    expect(topbarActions).toContain("用户自定义修改管理");
    // 自定义管理按钮位于保存按钮左侧
    const managerIndex = topbarActions.indexOf("openUserCustomizationManager");
    const saveIndex = topbarActions.indexOf("saveCurrentProject");
    expect(managerIndex).toBeGreaterThan(-1);
    expect(saveIndex).toBeGreaterThan(managerIndex);

    // 已从图元库 tab 移除
    const appSource = readFileSync(new URL("./App.tsx", import.meta.url), "utf8")
      + readFileSync(new URL("./appExtracted/appStateBatch.tsx", import.meta.url), "utf8")
      + readFileSync(new URL("./appExtracted/appCanvasViewportBatch.tsx", import.meta.url), "utf8")
      + readFileSync(new URL("./appExtracted/appRenderBatch.tsx", import.meta.url), "utf8");
    const componentActions = appSource.match(
      /<div className="component-library-actions library-scope-actions"[\s\S]*?<\/div>\s*<div className="library-display-mode"/
    )?.[0] ?? "";
    expect(componentActions).not.toContain("openUserCustomizationManager");
  });

  test("keeps the customization table readable on narrow screens", () => {
    const styles = readFileSync(new URL("./styles.css", import.meta.url), "utf8");

    expect(styles).toMatch(
      /@media \(max-width: 760px\)[\s\S]*?\.user-customization-table\s*\{[\s\S]*?min-width:\s*720px/
    );
  });
});

describe("顶栏空间选择器", () => {
  // appTopbar 经 model-node-ops 间接 import model.ts，存在循环初始化顺序依赖；
  // 本文件的 model 已由上方静态 import 完成初始化，故这里动态 import 可避开 TDZ。
  const loadTopbar = () => import("./appExtracted/appTopbar");

  // 本 describe 共 6 条：3 条真行为断言（选项派生 ×2、建完必须切 —— 跑真实函数、桩 fetch、断言调用序列），
  // 3 条形态断言（带「形态断言，非行为断言」后缀）。后缀含义如下（勿当行为覆盖读）：
  // ① 本仓库前端测试环境是 node（vite.config.ts 的 test.environment），无 jsdom / testing-library，
  //    全仓 react-dom/server、createRoot、act( 出现 0 次，故「渲染后选项数」「重渲染后 fetch 次数」
  //    这类断言在本仓库不可能成立 —— 加 devDeps 会造出第二种前端测试范式，已被否决。
  // ② 带该后缀的三条读的是源文件文本（字段名、useEffect 依赖数组、memo inputs 数组），
  //    变异能让它们变红，但它们对「组件实际渲染出什么、副作用实际跑几次」没有判别力，
  //    只证明源码形态，不构成行为覆盖。
  // ③ 本 describe 未覆盖 submitCreate → createSpaceThenSwitch 的调用链：把 appTopbar.tsx 里
  //    Modal 的 onOk={() => void submitCreate()} 改成 onOk={() => setCreateOpen(false)}（即点确定不建空间），
  //    本 describe 6 条仍全绿（已实测）。该链（点 Modal 确定 → submitCreate → createSpaceThenSwitch）
  //    应由 T5 的 e2e 经真实点击覆盖。
  // ④ 顶栏的真实交互行为「计划」由 T5 的 e2e（e2e/spaceSwitch.spec.ts）承载 ——
  //    该文件当前尚不存在；其确切覆盖范围以计划 Task 5 为准。

  test("选项与后端返回的空间列表一致，并追加新建入口", async () => {
    const { buildSpaceSwitcherOptions, NEW_SPACE_OPTION_VALUE } = await loadTopbar();
    const options = buildSpaceSwitcherOptions([
      { id: "张三", name: "张三的空间", createdAt: "2026-01-01" },
      { id: "李四", name: "李四的空间", createdAt: "2026-01-02" },
      { id: "默认空间", name: "默认空间", createdAt: "2026-01-03" }
    ]);

    // 3 个后端空间 + 1 个「＋ 新建空间…」入口，选项数量与内容均由入参决定
    expect(options).toHaveLength(4);
    expect(options.map((option) => option.value)).toEqual([
      "张三",
      "李四",
      "默认空间",
      NEW_SPACE_OPTION_VALUE
    ]);
    expect(options[3].label).toContain("新建空间");
  });

  test("空间列表为空或未加载时只保留新建入口", async () => {
    const { buildSpaceSwitcherOptions, NEW_SPACE_OPTION_VALUE } = await loadTopbar();

    expect(buildSpaceSwitcherOptions([]).map((option) => option.value)).toEqual([NEW_SPACE_OPTION_VALUE]);
    expect(buildSpaceSwitcherOptions(undefined).map((option) => option.value)).toEqual([NEW_SPACE_OPTION_VALUE]);
  });

  test("源码不读 cookie（形态断言，非行为断言）", () => {
    const topbarSource = readFileSync(new URL("./appExtracted/appTopbar.tsx", import.meta.url), "utf8");
    const appSource = readFileSync(new URL("./App.tsx", import.meta.url), "utf8");

    // 后端按「头 > query > cookie > 回退」算 current，cookie 与 current 可合法不一致；
    // 组件读 cookie 就会自算「我是谁」，与后端解析链分叉。
    // 注意：这里只证明源码里没出现 readSpaceCookie，不证明渲染时用了 current 的返回值。
    expect(topbarSource).toContain("scope.currentSpaceId");
    expect(topbarSource).not.toContain("readSpaceCookie");
    // App.tsx 把后端响应的 current 写入该状态
    expect(appSource).toContain("setCurrentSpaceId(data.current");
    expect(appSource).not.toContain("setCurrentSpaceId(readSpaceCookie()");
  });

  test("useEffect 依赖数组为空（形态断言，非行为断言）", () => {
    const appSource = readFileSync(new URL("./App.tsx", import.meta.url), "utf8");
    const callIndex = appSource.indexOf("__appScopeRef.current?.refreshSpaces?.();");

    expect(callIndex).toBeGreaterThan(-1);
    expect(appSource).toContain("Object.assign(__appScope, { spaces, currentSpaceId, refreshSpaces })");
    // __appScope 每帧重建：该 useEffect 的依赖数组必须为空，否则每次渲染都会重新拉取。
    // 注意：这里只证明依赖数组是 []，不证明重渲染时 fetch 真的只被调用了一次。
    const effectTail = appSource.slice(callIndex, appSource.indexOf("\n", callIndex) + 200);
    expect(effectTail.match(/\}, (\[[^\]]*\])\);/)?.[1]).toBe("[]");
  });

  test("源码把空间状态列进顶栏 memo 输入（形态断言，非行为断言）", () => {
    const viewSource = readFileSync(new URL("./appExtracted/appView.tsx", import.meta.url), "utf8");
    const topbarInputs = viewSource.match(/<AppTopbar\s[\s\S]*?inputs=\{\[[\s\S]*?\]\}/)?.[0] ?? "";

    // 顶栏经 MemoizedViewSection 记忆化：spaces/currentSpaceId 不进 inputs，
    // 拉取完成后 memo 判定输入未变 → 跳过重渲染 → 选择器停在空列表。
    // 注意：这里只证明两个字段出现在 inputs 数组文本里，
    // 不证明 memo 比较器实际因此返回 false（真实重渲染行为由 T5 的 e2e 承载）。
    expect(topbarInputs).toContain("__appScope.spaces");
    expect(topbarInputs).toContain("__appScope.currentSpaceId");
  });

  test("源码把空间状态列进状态栏 memo 输入（否则空间 ID 那格永远停在 —）", () => {
    const viewSource = readFileSync(new URL("./appExtracted/appView.tsx", import.meta.url), "utf8");
    const statusbarInputs = viewSource.match(/<AppStatusbar\s[\s\S]*?inputs=\{\[[\s\S]*?\]\}/)?.[0] ?? "";

    // 状态栏与顶栏同一课：经 MemoizedViewSection 记忆化，currentSpaceId 不进 inputs 时，
    // 首帧（列表还没拉回来）渲染出的「—」会被永远记住 —— 面板看着正常，就这一格是死的。
    expect(statusbarInputs).toContain("__appScope.currentSpaceId");
    expect(statusbarInputs).toContain("__appScope.spaces");
  });

  test("新建空间成功后立即切换到新空间", async () => {
    const requested: string[] = [];
    const calls: { url: string; init?: RequestInit }[] = [];
    const fetchStub = vi.fn(async (url: string, init?: RequestInit) => {
      calls.push({ url, init });
      return {
        ok: true,
        json: async () => ({ id: "新空间-id", name: "新空间", createdAt: "2026-01-04" })
      };
    });
    vi.stubGlobal("fetch", fetchStub);
    const { createSpaceThenSwitch } = await loadTopbar();

    await createSpaceThenSwitch("新空间", { requestSwitchSpace: (id: string) => requested.push(id) });
    vi.unstubAllGlobals();

    expect(fetchStub).toHaveBeenCalledTimes(1);
    expect(calls[0].init?.method).toBe("POST");
    expect(JSON.parse(String(calls[0].init?.body))).toEqual({ name: "新空间" });
    // 建完必须切到新建返回的 id，而不是停在原空间
    expect(requested).toEqual(["新空间-id"]);
  });
});

// 导入空间走真实网络请求（fetch + ZIP 二进制体），单元测试里不重放整条链路：
// 桩掉 spaceClient 的 importSpaceArchive，只留 appTopbar 自己那一层的编排（切空间 / 报错提示）。
// vi.mock 被提升到文件顶部，故对上面的用例同样生效 —— 那里只用到 createSpace 的透传原样。
const importSpaceArchiveMock = vi.hoisted(() => vi.fn());
const renameSpaceMock = vi.hoisted(() => vi.fn());
const deleteSpaceMock = vi.hoisted(() => vi.fn());
vi.mock("./spaceClient", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./spaceClient")>()),
  importSpaceArchive: importSpaceArchiveMock,
  renameSpace: renameSpaceMock,
  deleteSpace: deleteSpaceMock
}));

// 导出的落盘分支（showSaveFilePicker / 浏览器下载）依赖真实浏览器 API，node 环境跑不了：
// 只桩掉 saveLazyBlobFile，直测 appTopbar 交给它的那份 options。
const saveLazyBlobFileMock = vi.hoisted(() => vi.fn());
vi.mock("./fileIO", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./fileIO")>()),
  saveLazyBlobFile: saveLazyBlobFileMock
}));

describe("空间导入导出按钮", () => {
  // 与上方「顶栏空间选择器」同一 TDZ 规避（appTopbar 经 model-node-ops 间接 import model.ts）
  const loadTopbar = () => import("./appExtracted/appTopbar");

  beforeEach(() => {
    importSpaceArchiveMock.mockReset();
    renameSpaceMock.mockReset();
    deleteSpaceMock.mockReset();
    saveLazyBlobFileMock.mockReset();
  });

  // 提示桩按用例装、用例后卸：直接赋值会把这个全局改脏，
  // 后面追加的用例只能对着一个死数组断言（表现为「看不到文本」而非响亮失败）。
  // 用 unstubAllGlobals 而非 delete —— 后者会拆掉 test-setup.ts 装的桩。
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test("导入成功后先刷列表再切到新空间", async () => {
    const { importSpaceArchiveFromFile } = await loadTopbar();
    importSpaceArchiveMock.mockResolvedValue({
      space: { id: "新空间", name: "新空间", createdAt: "2026-01-01T00:00:00.000Z" },
      spaces: []
    });
    // 两步收尾共用一条序列：既钉住「刷新列表被调用」，也钉住「在切换之前」
    const order: string[] = [];

    await importSpaceArchiveFromFile(new File([new Uint8Array([1])], "甲.zip"), {
      requestSwitchSpace: (id: string) => order.push(`switch:${id}`),
      refreshSpaces: async () => {
        order.push("refresh");
      }
    });

    expect(importSpaceArchiveMock).toHaveBeenCalledTimes(1);
    // 与「新建空间」按钮同一收尾：导入完必须切过去。切换是硬重载，
    // 用户若在有未保存修改时取消，列表也必须已经含新空间 —— 故刷新在前。
    expect(order).toEqual(["refresh", "switch:新空间"]);
  });

  test("导入失败时提示且不切换", async () => {
    const { importSpaceArchiveFromFile } = await loadTopbar();
    importSpaceArchiveMock.mockRejectedValue(new Error("zip 文件格式不正确。"));
    const requested: string[] = [];
    const messages: string[] = [];
    vi.stubGlobal("showGlobalMessage", (text: string) => messages.push(text));

    await importSpaceArchiveFromFile(new File([new Uint8Array([1])], "坏.zip"), {
      requestSwitchSpace: (id: string) => requested.push(id)
    });

    expect(requested).toEqual([]);
    expect(messages.join("\n")).toContain("zip 文件格式不正确。");
  });

  test("刷新列表失败不改归因为「导入失败」，且仍切到新空间", async () => {
    const { importSpaceArchiveFromFile } = await loadTopbar();
    importSpaceArchiveMock.mockResolvedValue({
      space: { id: "新空间", name: "新空间", createdAt: "2026-01-01T00:00:00.000Z" },
      spaces: []
    });
    const requested: string[] = [];
    const messages: string[] = [];
    vi.stubGlobal("showGlobalMessage", (text: string) => messages.push(text));

    await importSpaceArchiveFromFile(new File([new Uint8Array([1])], "甲.zip"), {
      refreshSpaces: async () => {
        throw new Error("读取空间列表失败。");
      },
      requestSwitchSpace: (id: string) => requested.push(id)
    });

    // 导入本身成功了：空间已在服务端建出来，不能报「导入失败」让用户以为没导入，
    // 更不能因为列表没刷新成功就把这个已建好的空间晾着不切过去
    expect(messages.join("\n")).not.toContain("导入空间失败");
    expect(requested).toEqual(["新空间"]);
  });

  // 撞车询问的四个分支：覆盖 / 改名 / 放弃 / 问不了。空间名唯一性是后端判的，
  // 这里只钉前端编排：问谁、带什么重发、放弃时不许有任何副作用。
  const conflictError = async (spaceName = "甲", conflictId = "甲-id") => {
    const { SPACE_NAME_DUPLICATE } = await import("./spaceClient");
    return Object.assign(new Error(`空间名「${spaceName}」已存在。`), {
      code: SPACE_NAME_DUPLICATE,
      spaceName,
      conflictId
    });
  };

  test("导入撞车 → 确定覆盖：带 mode=overwrite 重发并切过去", async () => {
    const { importSpaceArchiveFromFile } = await loadTopbar();
    importSpaceArchiveMock
      .mockRejectedValueOnce(await conflictError())
      .mockResolvedValueOnce({ space: { id: "甲", name: "甲", createdAt: "2026-01-01T00:00:00.000Z" }, spaces: [] });
    const asked: string[] = [];
    vi.stubGlobal("showGlobalConfirm", async (text: string) => {
      asked.push(text);
      return true;
    });
    vi.stubGlobal("showGlobalPrompt", async () => {
      throw new Error("选了覆盖就不该再弹改名框");
    });
    const requested: string[] = [];

    await importSpaceArchiveFromFile(new File([new Uint8Array([1])], "甲.zip"), {
      requestSwitchSpace: (id: string) => requested.push(id),
      refreshSpaces: async () => {}
    });

    // 询问框必须指名道姓：不说清撞的是哪个空间，用户没法判断「覆盖」会毁掉什么
    expect(asked.join("\n")).toContain("甲");
    expect(importSpaceArchiveMock.mock.calls[0][1]).toEqual({});
    expect(importSpaceArchiveMock.mock.calls[1][1]).toEqual({ mode: "overwrite" });
    expect(requested).toEqual(["甲"]);
  });

  test("导入撞车 → 取消覆盖后改名：带 mode=rename + 新名重发，建议名跳过已占用", async () => {
    const { importSpaceArchiveFromFile } = await loadTopbar();
    importSpaceArchiveMock
      .mockRejectedValueOnce(await conflictError())
      .mockResolvedValueOnce({ space: { id: "甲-3", name: "甲-3", createdAt: "2026-01-01T00:00:00.000Z" }, spaces: [] });
    vi.stubGlobal("showGlobalConfirm", async () => false);
    const prompted: Array<[string, string | undefined]> = [];
    vi.stubGlobal("showGlobalPrompt", async (text: string, value?: string) => {
      prompted.push([text, value]);
      return value ?? "";
    });
    const requested: string[] = [];

    await importSpaceArchiveFromFile(new File([new Uint8Array([1])], "甲.zip"), {
      spaces: [
        { id: "甲", name: "甲", createdAt: "2026-01-01" },
        { id: "甲-2", name: "甲-2", createdAt: "2026-01-01" }
      ],
      requestSwitchSpace: (id: string) => requested.push(id),
      refreshSpaces: async () => {}
    });

    // 建议值跳过已被占用的「甲-2」，否则用户点确定就得再撞一次（后端仍会判重）
    expect(prompted[0]?.[1]).toBe("甲-3");
    expect(importSpaceArchiveMock.mock.calls[1][1]).toEqual({ mode: "rename", name: "甲-3" });
    expect(requested).toEqual(["甲-3"]);
  });

  test("导入撞车 → 覆盖被否且改名框取消：不重发、不切换、不提示成功", async () => {
    const { importSpaceArchiveFromFile } = await loadTopbar();
    importSpaceArchiveMock.mockRejectedValueOnce(await conflictError());
    vi.stubGlobal("showGlobalConfirm", async () => false);
    vi.stubGlobal("showGlobalPrompt", async () => null);
    const requested: string[] = [];

    await importSpaceArchiveFromFile(new File([new Uint8Array([1])], "甲.zip"), {
      requestSwitchSpace: (id: string) => requested.push(id),
      refreshSpaces: async () => {}
    });

    expect(importSpaceArchiveMock).toHaveBeenCalledTimes(1);
    expect(requested).toEqual([]);
  });

  test("导入撞车但没有询问框可用：照常报「已存在」，不静默吞掉", async () => {
    const { importSpaceArchiveFromFile } = await loadTopbar();
    importSpaceArchiveMock.mockRejectedValueOnce(await conflictError());
    const messages: string[] = [];
    vi.stubGlobal("showGlobalMessage", (text: string) => messages.push(text));
    const requested: string[] = [];

    await importSpaceArchiveFromFile(new File([new Uint8Array([1])], "甲.zip"), {
      requestSwitchSpace: (id: string) => requested.push(id)
    });

    // 静默返回会表现成「选完文件什么都没发生」——那是最难查的一类
    expect(messages.join("\n")).toContain("已存在");
    expect(requested).toEqual([]);
  });

  // 改名 / 删除作用在**当前空间**上；两者都借全局弹窗，故这套用例的桩与上面导入那批同款。
  const spaceScope = (overrides: Record<string, any> = {}) => ({
    spaces: [
      { id: "default", name: "默认空间", pinned: true, createdAt: "2026-01-01" },
      { id: "高鹏", name: "高鹏", createdAt: "2026-01-01" }
    ],
    currentSpaceId: "高鹏",
    ...overrides
  });

  test("改名：弹输入框（默认值=原名）→ PUT → 就地刷列表，不切空间", async () => {
    const { renameCurrentSpace } = await loadTopbar();
    renameSpaceMock.mockResolvedValue(undefined);
    const prompted: Array<[string, string | undefined]> = [];
    vi.stubGlobal("showGlobalPrompt", async (text: string, value?: string) => {
      prompted.push([text, value]);
      return "高鹏新";
    });
    const messages: string[] = [];
    vi.stubGlobal("showGlobalMessage", (text: string) => messages.push(text));
    const refreshed: string[] = [];
    const switched: string[] = [];

    const ok = await renameCurrentSpace(spaceScope({
      refreshSpaces: async () => {
        refreshed.push("refresh");
      },
      requestSwitchSpace: (id: string) => switched.push(id)
    }));

    expect(ok).toBe(true);
    // 默认值是原名：改名最常见的形态是「改几个字」，从空白开始等于每次都要重打
    expect(prompted[0]?.[1]).toBe("高鹏");
    expect(renameSpaceMock).toHaveBeenCalledWith("高鹏", "高鹏新");
    expect(refreshed).toHaveLength(1);
    // 改名只改显示名、id 不动 ⇒ 不该切空间（切换是硬重载，白白丢一次未保存状态）
    expect(switched).toEqual([]);
    expect(messages.join("\n")).toContain("高鹏新");
  });

  test("改名：输入框取消 / 只改空格 / 原样提交 → 都不打后端", async () => {
    const { renameCurrentSpace } = await loadTopbar();
    vi.stubGlobal("showGlobalMessage", () => {});

    vi.stubGlobal("showGlobalPrompt", async () => null);
    expect(await renameCurrentSpace(spaceScope())).toBe(false);

    vi.stubGlobal("showGlobalPrompt", async () => "   ");
    expect(await renameCurrentSpace(spaceScope())).toBe(false);

    // trim 后与原名相同 = no-op：打过去后端也会照单全收，白白写一次盘
    vi.stubGlobal("showGlobalPrompt", async () => "  高鹏  ");
    expect(await renameCurrentSpace(spaceScope())).toBe(false);

    expect(renameSpaceMock).not.toHaveBeenCalled();
  });

  test("改名撞上已有空间名：提示后端文案，且不刷列表", async () => {
    const { renameCurrentSpace } = await loadTopbar();
    renameSpaceMock.mockRejectedValue(new Error("空间名「张三」已存在。"));
    vi.stubGlobal("showGlobalPrompt", async () => "张三");
    const messages: string[] = [];
    vi.stubGlobal("showGlobalMessage", (text: string) => messages.push(text));
    const refreshed: string[] = [];

    const ok = await renameCurrentSpace(spaceScope({
      refreshSpaces: async () => {
        refreshed.push("refresh");
      }
    }));

    expect(ok).toBe(false);
    expect(messages.join("\n")).toContain("空间名「张三」已存在。");
    expect(refreshed).toEqual([]);
  });

  test("删除：确认后 DELETE → 刷列表 → 切到剩余空间（当前空间已没了，不切就会停在不存在的地方）", async () => {
    const { deleteCurrentSpace } = await loadTopbar();
    deleteSpaceMock.mockResolvedValue(undefined);
    const asked: string[] = [];
    vi.stubGlobal("showGlobalConfirm", async (text: string) => {
      asked.push(text);
      return true;
    });
    const switched: string[] = [];
    const order: string[] = [];

    const ok = await deleteCurrentSpace(spaceScope({
      refreshSpaces: async () => {
        order.push("refresh");
      },
      requestSwitchSpace: (id: string) => {
        order.push(`switch:${id}`);
        switched.push(id);
      }
    }));

    expect(ok).toBe(true);
    expect(deleteSpaceMock).toHaveBeenCalledWith("高鹏");
    // 不可逆动作必须写明代价：目录进 trash-spaces，界面上找不回
    expect(asked.join("\n")).toContain("trash-spaces");
    // 刷新在切换之前（与导入同一顺序：切换是硬重载，取消未保存提示时列表也得已经是对的）
    expect(order).toEqual(["refresh", "switch:default"]);
    expect(switched).toEqual(["default"]);
  });

  test("删除：确认框取消 → 不打后端、不切空间", async () => {
    const { deleteCurrentSpace } = await loadTopbar();
    vi.stubGlobal("showGlobalConfirm", async () => false);
    const switched: string[] = [];

    const ok = await deleteCurrentSpace(spaceScope({ requestSwitchSpace: (id: string) => switched.push(id) }));

    expect(ok).toBe(false);
    expect(deleteSpaceMock).not.toHaveBeenCalled();
    expect(switched).toEqual([]);
  });

  test("删除 default（pinned）：连询问都不弹（按钮同步禁用）", async () => {
    const { deleteCurrentSpace } = await loadTopbar();
    const asked: string[] = [];
    vi.stubGlobal("showGlobalConfirm", async (text: string) => {
      asked.push(text);
      return true;
    });

    const ok = await deleteCurrentSpace(spaceScope({ currentSpaceId: "default" }));

    expect(ok).toBe(false);
    expect(asked).toEqual([]);
    expect(deleteSpaceMock).not.toHaveBeenCalled();
  });

  test("删除被后端拒绝：提示原因，且不切空间", async () => {
    const { deleteCurrentSpace } = await loadTopbar();
    deleteSpaceMock.mockRejectedValue(new Error("默认空间不可删除。"));
    vi.stubGlobal("showGlobalConfirm", async () => true);
    const messages: string[] = [];
    vi.stubGlobal("showGlobalMessage", (text: string) => messages.push(text));
    const switched: string[] = [];

    const ok = await deleteCurrentSpace(spaceScope({ requestSwitchSpace: (id: string) => switched.push(id) }));

    expect(ok).toBe(false);
    expect(messages.join("\n")).toContain("默认空间不可删除。");
    expect(switched).toEqual([]);
  });

  test("suggestSpaceName：跳过已占用的 -2/-3…，无占用时从 -2 起", async () => {
    const { suggestSpaceName } = await loadTopbar();
    const space = (name: string) => ({ id: name, name, createdAt: "2026-01-01" });

    expect(suggestSpaceName("甲", [space("甲"), space("甲-2"), space("甲-3")])).toBe("甲-4");
    expect(suggestSpaceName("甲", [space("甲")])).toBe("甲-2");
    expect(suggestSpaceName("甲", undefined)).toBe("甲-2");
  });

  test("导出把当前空间名当文件名，且不传自造 pickerId", async () => {
    saveLazyBlobFileMock.mockResolvedValue(true);
    const { exportCurrentSpace } = await loadTopbar();
    const { exportSpaceArchive } = await import("./spaceClient");

    const ok = await exportCurrentSpace({
      spaces: [{ id: "甲", name: "甲的空间", createdAt: "2026-01-01" }],
      currentSpaceId: "甲"
    });

    const options = saveLazyBlobFileMock.mock.calls[0]?.[0] as Record<string, any>;
    expect(ok).toBe(true);
    expect(options.filename).toBe("甲的空间.zip");
    // zip 的字节由 spaceClient.exportSpaceArchive 现取，不在点按钮时预取
    expect(options.loadBlob).toBe(exportSpaceArchive);
    // 缺省 pickerId 才会共享「上次另存目录」；传自造 id 会另开一个记忆槽
    expect("pickerId" in options).toBe(false);
  });

  test("导出文件名在空间名取不到时回退到空间 id 或默认名", async () => {
    saveLazyBlobFileMock.mockResolvedValue(true);
    const { exportCurrentSpace } = await loadTopbar();

    // currentSpaceId 不在 spaces（列表未加载 / 后端回退）：退回 id
    await exportCurrentSpace({ spaces: [], currentSpaceId: "甲" });
    // 两者都没有：退回「空间」
    await exportCurrentSpace({});

    expect(saveLazyBlobFileMock.mock.calls.map((call) => (call[0] as Record<string, any>).filename)).toEqual([
      "甲.zip",
      "空间.zip"
    ]);
  });

  test("导出失败时提示且返回 false", async () => {
    saveLazyBlobFileMock.mockRejectedValue(new Error("导出空间压缩包失败。"));
    const { exportCurrentSpace } = await loadTopbar();
    const messages: string[] = [];
    vi.stubGlobal("showGlobalMessage", (text: string) => messages.push(text));

    const ok = await exportCurrentSpace({ spaces: [], currentSpaceId: "甲" });

    expect(ok).toBe(false);
    expect(messages.join("\n")).toContain("导出空间压缩包失败。");
  });

  test("导出成功时提示（带空间名）；用户取消另存为时不提示", async () => {
    const { exportCurrentSpace } = await loadTopbar();
    const messages: string[] = [];
    vi.stubGlobal("showGlobalMessage", (text: string) => messages.push(text));

    saveLazyBlobFileMock.mockResolvedValue(true);
    const ok = await exportCurrentSpace({
      spaces: [{ id: "甲", name: "甲的空间", createdAt: "2026-01-01T00:00:00.000Z" }],
      currentSpaceId: "甲"
    });
    expect(ok).toBe(true);
    expect(messages.join("\n")).toContain("已导出空间「甲的空间」");

    // 取消另存为：saveLazyBlobFile 返回 false 且不抛 —— 那是用户意图，报「已导出」是假话
    messages.length = 0;
    saveLazyBlobFileMock.mockResolvedValue(false);
    const cancelled = await exportCurrentSpace({ spaces: [], currentSpaceId: "甲" });
    expect(cancelled).toBe(false);
    expect(messages).toEqual([]);
  });

  // 形态断言，非行为断言：只证明两个按钮那一行源码还在 / 没被加回去，
  // 不证明浏览模式下点击真的被挡住（本仓 node 环境不渲染 React，见上方 describe 的说明）。
  test("导出按钮不禁用、导入按钮禁用（形态断言，非行为断言）", () => {
    const topbarSource = readFileSync(new URL("./appExtracted/appTopbar.tsx", import.meta.url), "utf8");
    const buttonBlock = (label: string) =>
      topbarSource.match(new RegExp(`<button[^>]*aria-label="${label}"[\\s\\S]*?</button>`))?.[0] ?? "";

    // 导出是纯读动作，对齐既有导出菜单（exportSvg/exportEFile/CimFile/JsonFile 整段无 isBrowseMode 门控）；
    // 钉的是「不能按浏览模式门控」，不是「不能有 disabled」—— 将来加别的合法禁用条件不该被这条打红
    expect(buttonBlock("导出空间")).toContain('className="topbar-primary-button"');
    expect(buttonBlock("导出空间")).not.toContain("isBrowseMode");
    // 导入会切空间 + 硬重载，浏览模式下必须挡住；顺手删掉也红
    expect(buttonBlock("导入空间")).toContain("disabled={scope.isBrowseMode}");
  });

  // 形态断言，非行为断言：新建空间失败后的提示埋在未导出的组件闭包里，
  // 本仓 node 测试环境不渲染 React（见上方 describe 的说明），点击链由 T5 e2e 承载。
  // 这里只证明那几行源码还在 —— 它挡不住「catch 还在但内容写错」，也不证明运行时真的提示。
  test("新建空间失败时有提示且不卡 loading（形态断言，非行为断言）", () => {
    const topbarSource = readFileSync(new URL("./appExtracted/appTopbar.tsx", import.meta.url), "utf8");
    const submitCreate = topbarSource.match(/const submitCreate = async \(\) => \{[\s\S]*?\n  \};/)?.[0] ?? "";

    expect(submitCreate).toContain("catch (error)");
    expect(submitCreate).toContain("showSpaceActionMessage(`新建空间失败：");
    // 无论成败都要复位 loading，否则 Modal 卡在确认按钮转圈
    expect(submitCreate).toContain("setCreating(false)");
  });
});
