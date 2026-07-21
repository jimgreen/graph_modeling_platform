import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { areCanvasPropsEqual } from "./appExtracted/appCanvasArea";
import * as appViewModule from "./appExtracted/appView";
import {
  inspectorTabShowsDevicePanel,
  customDeviceDefinitionUsesIconOnly,
  resolveDeviceModelPanelDevType,
  resolveDeviceDefinitionParameterRowsForDisplay,
  resolveDeviceModelPanelParameterKeys,
  resolveCustomDeviceParameterRowsForDisplay,
  resolveInspectorGraphId,
  resolveInspectorTopologyEntry
} from "./appExtracted/appView";
import { createDefaultNode, type Topology } from "./model";

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

  test("uses the explicit dev_type first and otherwise falls back to the effective device class", () => {
    expect(resolveDeviceModelPanelDevType("ac-source", { dev_type: "aa" })).toBe("aa");
    expect(resolveDeviceModelPanelDevType("ac-source", {})).toBe("ACGenerator");
    expect(resolveDeviceModelPanelDevType("custom-source", { component_type: "CustomGenerator" })).toBe("CustomGenerator");
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
});

describe("app view device definition parameter rows", () => {
  test("shows only icon definition for concrete static graphics", () => {
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
    )).toBe(false);
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
    expect(source).toMatch(/selectedEDeviceInterfaceRow\?\.fields\.map/);
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

    expect(source).toMatch(/definitionDraftRowsForDisplay\.map\(\(row\)/);
    expect(source).not.toMatch(/definitionDraftRows\.map\(\(row\)\s*=>\s*\(<tr key=\{row\.id\}/);
  });

  test("keeps derived edit dialogs from injecting base default parameters", () => {
    const source = readFileSync(new URL("./App.tsx", import.meta.url), "utf8");

    expect(source).toMatch(/isDerivedComponentLibrary:\s*customDeviceDraft\.isDerivedComponentLibrary/);
  });

  test("only exposes the derived class english name in create and edit dialogs", () => {
    const source = readFileSync(new URL("./appExtracted/appView.tsx", import.meta.url), "utf8");

    expect(source).not.toContain("派生类中文名称");
    expect(source.match(/派生类英文名称/g)).toHaveLength(2);
  });

  test("removes the centered transform when device library dialogs become floating", () => {
    const styles = readFileSync(new URL("./styles.css", import.meta.url), "utf8");
    const floatingDialogRule = styles.match(
      /\.custom-device-dialog\.floating,\s*\.device-definition-dialog\.floating,\s*\.measurement-config-dialog\.floating\s*\{([\s\S]*?)\}/
    )?.[1] ?? "";

    expect(floatingDialogRule).toMatch(/transform:\s*none/);
  });

  test("keeps custom device identity and derived fields on one desktop row", () => {
    const styles = readFileSync(new URL("./styles.css", import.meta.url), "utf8");
    const baseGridRule = styles.match(/\.custom-device-form-grid\s*\{([\s\S]*?)\}/)?.[1] ?? "";
    const derivedGridRule = styles.match(
      /\.custom-device-form-grid:has\(\.custom-device-derived-en-field\)\s*\{([\s\S]*?)\}/
    )?.[1] ?? "";

    expect(baseGridRule).toMatch(/repeat\(4,\s*minmax\(/);
    expect(derivedGridRule).toMatch(/grid-template-columns/);
    expect(styles).not.toMatch(
      /\.custom-device-form-grid \.custom-device-derived-(?:en-)?field\s*\{[^}]*grid-row:\s*2/
    );
  });

  test("passes derived metadata into custom device measurement positions", () => {
    const source = readFileSync(new URL("./App.tsx", import.meta.url), "utf8");

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
});

describe("user customization manager entry", () => {
  test("keeps the customization manager in the component library toolbar", () => {
    const source = readFileSync(new URL("./App.tsx", import.meta.url), "utf8");
    const templateActions = source.match(
      /<div className="template-library-actions library-scope-actions"[\s\S]*?<\/div>\s*<div className="library-display-mode"/
    )?.[0] ?? "";
    const componentActions = source.match(
      /<div className="component-library-actions library-scope-actions"[\s\S]*?<\/div>\s*<div className="library-display-mode"/
    )?.[0] ?? "";

    expect(templateActions).not.toContain("自定义管理");
    expect(componentActions).toContain("自定义管理");
    expect(componentActions).toContain("openUserCustomizationManager");
  });

  test("keeps the customization table readable on narrow screens", () => {
    const styles = readFileSync(new URL("./styles.css", import.meta.url), "utf8");

    expect(styles).toMatch(
      /@media \(max-width: 760px\)[\s\S]*?\.user-customization-table\s*\{[\s\S]*?min-width:\s*720px/
    );
  });
});
