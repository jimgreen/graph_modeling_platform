import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
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
  resolveInspectorTopologyEntry
} from "./appExtracted/appView";
import { paramOptionsForSection } from "./appExtracted/appCoreCanvasUtilities";
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

describe("app view topology inspector", () => {
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

  test("always uses the concrete component kind for dev_type", () => {
    expect(resolveDeviceModelPanelDevType("ac-wind-source", { dev_type: "ACGenerator" })).toBe("ac-wind-source");
    expect(resolveDeviceModelPanelDevType("ac-source", { dev_type: "aa" })).toBe("ac-source");
    expect(resolveDeviceModelPanelDevType("custom-source", { component_type: "CustomGenerator" })).toBe("custom-source");
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

  test("uses exactly the same 28 effective ACGenerator definitions as the class editor", () => {
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
    expect(keys).toHaveLength(28);
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
    const source = readFileSync(new URL("./appExtracted/appView.tsx", import.meta.url), "utf8");
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
    const source = readFileSync(new URL("./appExtracted/appView.tsx", import.meta.url), "utf8");

    expect(source.indexOf("{customDeviceDialogOpen &&")).toBeLessThan(
      source.indexOf("{eDeviceDefinitionInterfaceDialogOpen &&")
    );
  });

  test("renders the E interface dialog as a left class tree with a right parameter table", () => {
    const source = readFileSync(new URL("./appExtracted/appView.tsx", import.meta.url), "utf8");

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
    const source = readFileSync(new URL("./appExtracted/appView.tsx", import.meta.url), "utf8");

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
    const source = readFileSync(new URL("./appExtracted/appView.tsx", import.meta.url), "utf8");
    const appSource = readFileSync(new URL("./App.tsx", import.meta.url), "utf8");
    const styles = readFileSync(new URL("./styles.css", import.meta.url), "utf8");
    const modeButton = source.match(
      /<button type="button" className=\{`topbar-primary-button[^`]*`\} onClick=\{toggleInteractionMode\}[\s\S]*?<\/button>/
    )?.[0] ?? "";
    const exportActions = source.match(
      /<div className="topbar-center-actions">[\s\S]*?<\/div>\s*(?:<div className="action-cluster"|<button)/
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
    expect(source).toContain("确定（{exportCompletionCountdown} 秒）");
    expect(appSource).toContain("Object.assign(__appScope, { globalMessage, setGlobalMessage, globalMessageTimerRef })");
    expect(appSource).toContain("exportCompletionCountdown");
    expect(appSource).toContain("const autoCloseMs = 5000");
    expect(appSource).toContain("Math.ceil((deadline - Date.now()) / 1000)");
    expect(appSource).toContain("window.clearInterval(countdownTimer)");
    expect(appSource).toContain("window.clearTimeout(closeTimer)");
    expect(exportActions).toContain('role="menu" aria-label="导出选项"');
    expect(exportActions).not.toContain("exportDropdownOpen");
    expect(exportActions).not.toContain("setExportDropdownOpen");
    expect(toolbarPreviewButton).toBeNull();
  });

  test("combines grouping actions into a borderless popup menu", () => {
    const source = readFileSync(new URL("./appExtracted/appView.tsx", import.meta.url), "utf8");
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

    expect(groupDropdown).toContain('title="组合操作"');
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

  test("keeps export configuration columns only in the E interface definition dialog", () => {
    const source = readFileSync(new URL("./appExtracted/appView.tsx", import.meta.url), "utf8");
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
    const source = readFileSync(new URL("./appExtracted/appView.tsx", import.meta.url), "utf8");

    expect(source).toMatch(/definitionDraftRowsForDisplay\.map\(\(row, rowIndex\)/);
    expect(source).not.toMatch(/definitionDraftRows\.map\(\(row\)\s*=>\s*\(<tr key=\{row\.id\}/);
  });

  test("renders sequence columns and bulk operation toolbars above definition tables", () => {
    const viewSource = readFileSync(new URL("./appExtracted/appView.tsx", import.meta.url), "utf8");
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
    const source = readFileSync(new URL("./appExtracted/appView.tsx", import.meta.url), "utf8");

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
    const source = readFileSync(new URL("./appExtracted/appView.tsx", import.meta.url), "utf8");

    expect(source).not.toContain("派生类中文名称");
    expect(source.match(/派生类英文名称/g)).toHaveLength(1);
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
    const viewSource = readFileSync(new URL("./appExtracted/appView.tsx", import.meta.url), "utf8");
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
    const viewSource = readFileSync(new URL("./appExtracted/appView.tsx", import.meta.url), "utf8");
    const stylesSource = readFileSync(new URL("./styles.css", import.meta.url), "utf8");

    expect(viewSource).not.toContain("device-definition-component-library-editor-header");
    expect(viewSource).not.toContain("device-definition-component-library-header");
    expect(viewSource).not.toContain("componentLibraryLabelValue");
    expect(viewSource).not.toContain("componentLibraryLabelKey");
    expect(stylesSource).toMatch(/\.custom-device-tabs\s*\{[^}]*align-self:\s*start[^}]*min-height:\s*40px/s);
  });

  test("hides component-only name and resize controls when editing a class", () => {
    const viewSource = readFileSync(new URL("./appExtracted/appView.tsx", import.meta.url), "utf8");
    const stylesSource = readFileSync(new URL("./styles.css", import.meta.url), "utf8");

    expect(viewSource).toMatch(/customDeviceDefinitionIconOnly && \(<>[\s\S]*?元件中文名称[\s\S]*?componentName[\s\S]*?元件英文名称[\s\S]*?componentKind[\s\S]*?是否允许变形[\s\S]*?<\/>\)}/);
    expect(viewSource).toContain('customDeviceDefinitionIconOnly ? " component-mode" : customComponentTreeSelection?.kind === "componentLibrary" ? " component-library-mode" : ""');
    expect(stylesSource).toMatch(/\.custom-device-form-grid\.component-library-mode\s*\{[^}]*grid-template-columns:/s);
  });

  test("hides class-only category and container controls when editing a component", () => {
    const viewSource = readFileSync(new URL("./appExtracted/appView.tsx", import.meta.url), "utf8");
    const stylesSource = readFileSync(new URL("./styles.css", import.meta.url), "utf8");

    expect(viewSource).toMatch(/!customDeviceDefinitionIconOnly && \(\s*<label className="custom-category-library-field">/);
    expect(viewSource).toMatch(/!customDeviceDefinitionIconOnly && \(\s*<label className="custom-device-container-field">/);
    expect(viewSource).toContain('customDeviceDefinitionIconOnly ? " component-mode"');
    expect(stylesSource).toMatch(/\.custom-device-form-grid\.component-mode\s*\{[^}]*grid-template-columns:/s);
  });

  test("keeps the whole right editor in component mode after confirming a new component", () => {
    const viewSource = readFileSync(new URL("./appExtracted/appView.tsx", import.meta.url), "utf8");

    expect(viewSource).toContain("!customDeviceDefinitionIconOnly &&\n    customComponentTreeSelection?.kind === \"componentLibrary\" &&\n    !customDeviceDraft.isDerivedComponentLibrary");
    expect(viewSource).toContain("!customDeviceDefinitionIconOnly &&\n    customComponentTreeSelection?.kind === \"componentLibrary\" &&\n    customDeviceDraft.isDerivedComponentLibrary");
    expect(viewSource).toContain('(customDeviceDefinitionIconOnly || customComponentTreeSelection?.kind !== "componentLibrary") && (<button');
    expect(viewSource).toContain('!customDeviceDefinitionIconOnly && (<>');
    expect(viewSource).toContain(': "保存新建元件"');
  });

  test("shows the derived base class with a jump link in the device definition dialog", () => {
    const source = readFileSync(new URL("./appExtracted/appView.tsx", import.meta.url), "utf8");

    expect(source).toContain("派生主类");
    expect(source).toContain("selectedDefinitionDerivedBaseTemplate");
    expect(source).toMatch(/derived-base-link[^\n]*loadDefinitionTemplateDraft/);
  });

  test("removes the centered transform when device library dialogs become floating", () => {
    const styles = readFileSync(new URL("./styles.css", import.meta.url), "utf8");
    const floatingDialogRule = styles.match(
      /\.custom-device-dialog\.floating,\s*\.device-definition-dialog\.floating,\s*\.measurement-config-dialog\.floating,\s*\.measurement-editor-dialog\.floating\s*\{([\s\S]*?)\}/
    )?.[1] ?? "";

    expect(floatingDialogRule).toMatch(/transform:\s*none/);
  });

  test("keeps the seven custom device identity and class metadata fields on one desktop row", () => {
    const styles = readFileSync(new URL("./styles.css", import.meta.url), "utf8");
    const baseGridRule = styles.match(/\.custom-device-form-grid\s*\{([\s\S]*?)\}/)?.[1] ?? "";
    const derivedGridRule = styles.match(
      /\.custom-device-form-grid:has\(\.custom-device-derived-en-field\)\s*\{([\s\S]*?)\}/
    )?.[1] ?? "";

    expect(baseGridRule.match(/minmax\(/g)).toHaveLength(7);
    expect(derivedGridRule).toMatch(/grid-template-columns/);
    expect(styles).not.toMatch(
      /\.custom-device-form-grid \.custom-device-derived-(?:en-)?field\s*\{[^}]*grid-row:\s*2/
    );
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
    const source = readFileSync(new URL("./appExtracted/appView.tsx", import.meta.url), "utf8");
    const topbarActions = source.match(
      /<div className="topbar-center-actions">[\s\S]*?<\/div>\s*<div className="action-cluster">/
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
