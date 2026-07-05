import { readFileSync } from "node:fs";
import { Children, isValidElement, type ReactElement, type ReactNode } from "react";
import { describe, expect, test } from "vitest";
import {
  createLibraryPackage,
  componentLibraryDisplayParts,
  defaultCategoryLibraryForComponentLibrary,
  deviceLibraryPayloadForPackageScope,
  filterGraphTemplatesByType,
  graphTemplateTypeList,
  groupGraphTemplatesByType,
  isBuiltInCategoryLibrary,
  normalizeLibraryPackage,
  normalizeDeviceLibraryPersistencePayload,
  selectableCategoryLibraryList,
  normalizeCustomComponentLibraries,
  normalizeCustomDeviceTemplates,
  normalizeDefinitionRows,
  renderEnumValuesEditor
} from "./appExtracted/appPersistenceLibraryExport";
import { DEFAULT_MEASUREMENT_CONFIG } from "./measurements";
import { svgSourceFromDataUrl } from "./stateIconDrawing";

const sampleGraphTemplate = (id: string, typeName: string, name: string) => ({
  id,
  typeName,
  name,
  sourceSize: { width: 120, height: 80 },
  clipboard: {
    nodes: [
      {
        id: `${id}-node`,
        kind: "static-rect",
        name: "矩形",
        position: { x: 0, y: 0 },
        size: { width: 40, height: 24 },
        params: {},
        terminals: []
      }
    ],
    edges: [],
    groups: []
  },
  createdAt: "2026-06-20T00:00:00.000Z",
  updatedAt: "2026-06-20T00:00:00.000Z"
});

describe("graph template library filtering", () => {
  test("creates migration packages without mixing device and template libraries", () => {
    const deviceLibrary = {
      customDeviceTemplates: [
        {
          kind: "custom-pump",
          label: "Custom Pump",
          categoryLibrary: "交流设备",
          size: { width: 80, height: 48 },
          params: { component_type: "CustomPump" },
          terminalType: "ac",
          terminalCount: 2,
          custom: true
        }
      ],
      customCategoryLibraries: ["用户库"],
      customComponentLibraries: [{ name: "CustomPump", categoryLibraryName: "用户库" }],
      deviceDefinitionOverrides: {
        "ac-load": {
          kind: "ac-load",
          size: { width: 120, height: 60 }
        }
      },
      customGraphTemplateTypes: ["组合模板"],
      customGraphTemplates: [sampleGraphTemplate("template-1", "组合模板", "泵组合")]
    };

    const devicePackage = createLibraryPackage({
      scope: "device-library",
      exportedAt: "2026-06-28T00:00:00.000Z",
      deviceLibrary: deviceLibrary as any
    });
    const templatePackage = createLibraryPackage({
      scope: "template-library",
      exportedAt: "2026-06-28T00:00:00.000Z",
      deviceLibrary: deviceLibrary as any
    });

    expect(devicePackage).toMatchObject({
      format: "graph-modeling-platform-library-package",
      version: 1,
      scope: "device-library"
    });
    expect(devicePackage.deviceLibrary?.customDeviceTemplates).toHaveLength(1);
    expect(devicePackage.deviceLibrary?.customGraphTemplates).toEqual([]);
    expect(devicePackage.deviceLibrary?.customGraphTemplateTypes).toEqual([]);

    expect(templatePackage.deviceLibrary?.customDeviceTemplates).toEqual([]);
    expect(templatePackage.deviceLibrary?.customCategoryLibraries).toEqual([]);
    expect(templatePackage.deviceLibrary?.customComponentLibraries).toEqual([]);
    expect(templatePackage.deviceLibrary?.deviceDefinitionOverrides).toEqual({});
    expect(templatePackage.deviceLibrary?.customGraphTemplateTypes).toEqual(["组合模板"]);
    expect(templatePackage.deviceLibrary?.customGraphTemplates).toHaveLength(1);
  });

  test("normalizes imported library packages and rejects unrelated files", () => {
    const measurementPackage = normalizeLibraryPackage({
      format: "graph-modeling-platform-library-package",
      version: 1,
      scope: "measurement",
      measurementConfig: {
        measurementTypes: [{ id: "freq", name: "频率", shortLabel: "f", defaultUnit: "Hz" }],
        deviceProfiles: []
      }
    });

    expect(measurementPackage.measurementConfig?.measurementTypes[0]).toMatchObject({
      id: "freq",
      name: "频率",
      defaultUnit: "Hz"
    });
    expect(() => normalizeLibraryPackage({ format: "wrong", version: 1, scope: "measurement" })).toThrow("不是有效的库导入文件");
    expect(() => normalizeLibraryPackage({ format: "graph-modeling-platform-library-package", version: 99, scope: "measurement" })).toThrow("不支持的库文件版本");
  });

  test("keeps imported device and template scopes isolated from current library state", () => {
    const current = {
      customDeviceTemplates: [
        {
          kind: "old-device",
          label: "Old",
          categoryLibrary: "交流设备",
          size: { width: 50, height: 30 },
          params: { component_type: "OldDevice" },
          terminalType: "ac",
          terminalCount: 0,
          custom: true
        }
      ],
      customCategoryLibraries: ["旧库"],
      customComponentLibraries: [{ name: "OldDevice", categoryLibraryName: "旧库" }],
      deviceDefinitionOverrides: { "old-device": { kind: "old-device", size: { width: 50, height: 30 } } },
      customGraphTemplateTypes: ["旧模板"],
      customGraphTemplates: [sampleGraphTemplate("old-template", "旧模板", "旧组合")]
    };
    const imported = {
      customDeviceTemplates: [],
      customCategoryLibraries: [],
      customComponentLibraries: [],
      deviceDefinitionOverrides: {},
      customGraphTemplateTypes: ["新模板"],
      customGraphTemplates: [sampleGraphTemplate("new-template", "新模板", "新组合")]
    };

    const merged = deviceLibraryPayloadForPackageScope(current as any, imported as any, "template-library");

    expect(merged.customDeviceTemplates).toHaveLength(1);
    expect(merged.customCategoryLibraries).toEqual(["旧库"]);
    expect(merged.customGraphTemplateTypes).toEqual(["新模板"]);
    expect(merged.customGraphTemplates[0].id).toBe("new-template");
  });

  test("normalizes legacy device library names to category and component libraries", () => {
    const normalized = normalizeDeviceLibraryPersistencePayload({
      customDeviceTemplates: [
        {
          kind: "legacy-meter",
          label: "Legacy Meter",
          attributeLibrary: "用户旧库",
          size: { width: 80, height: 48 },
          params: { componentType: "LegacyMeter" },
          terminalType: "ac",
          terminalCount: 2,
          custom: true
        }
      ],
      customAttributeLibraries: ["用户旧库"],
      customComponentTypes: [{ name: "LegacyMeter", attributeLibraryName: "用户旧库" }],
      deviceDefinitionOverrides: {},
      customGraphTemplateTypes: [],
      customGraphTemplates: []
    });

    expect(normalized.customCategoryLibraries).toEqual(["用户旧库"]);
    expect(normalized.customComponentLibraries).toEqual([{ name: "LegacyMeter", categoryLibraryName: "用户旧库" }]);
    expect(normalized.customDeviceTemplates[0]).toMatchObject({
      kind: "legacy-meter",
      categoryLibrary: "用户旧库",
      params: { component_type: "LegacyMeter" }
    });
    expect("attributeLibrary" in normalized.customDeviceTemplates[0]).toBe(false);
  });

  test("keeps custom component library Chinese labels for bilingual display", () => {
    const normalized = normalizeCustomComponentLibraries([
      { name: "CustomPump", categoryLibraryName: "用户类别库", label: "用户泵库" },
      { name: "LegacyMeter", attributeLibraryName: "用户旧库", cnName: "旧量测库" }
    ] as any);

    expect(normalized).toEqual([
      { name: "CustomPump", categoryLibraryName: "用户类别库", label: "用户泵库" },
      { name: "LegacyMeter", categoryLibraryName: "用户旧库", label: "旧量测库" }
    ]);
    expect(componentLibraryDisplayParts("CustomPump", normalized).title).toBe("用户泵库 / CustomPump");
    expect(componentLibraryDisplayParts("LegacyMeter", normalized).chinese).toBe("旧量测库");
  });

  test("creates icon library packages with only user imported assets", () => {
    const iconPackage = createLibraryPackage({
      scope: "icon-library",
      exportedAt: "2026-06-28T00:00:00.000Z",
      iconLibrary: {
        folders: [
          { id: "root", name: "默认文件夹" },
          { id: "builtin-shared-icons", name: "内置 SVG" },
          { id: "custom-icons", name: "自定义图标" }
        ],
        assets: [
          {
            id: "builtin-shared-icon-001-ac",
            name: "内置图标",
            folderId: "builtin-shared-icons",
            url: "data:image/svg+xml,%3Csvg%2F%3E",
            dataUrl: "data:image/svg+xml,%3Csvg%2F%3E"
          },
          {
            id: "img-custom",
            name: "自定义图标",
            folderId: "custom-icons",
            mimeType: "image/png",
            url: "/api/images/img-custom",
            dataUrl: "data:image/png;base64,AA=="
          }
        ]
      }
    });

    expect(iconPackage.iconLibrary?.folders.map((folder) => folder.id)).toEqual(["root", "custom-icons"]);
    expect(iconPackage.iconLibrary?.assets.map((asset) => asset.id)).toEqual(["img-custom"]);
    expect(iconPackage.iconLibrary?.assets[0].url).toBe("/api/images/img-custom");
  });

  test("creates measurement packages from the normalized platform measurement config", () => {
    const measurementPackage = createLibraryPackage({
      scope: "measurement",
      exportedAt: "2026-06-28T00:00:00.000Z",
      measurementConfig: DEFAULT_MEASUREMENT_CONFIG
    });

    expect(measurementPackage.measurementConfig?.measurementTypes.length).toBeGreaterThan(0);
    expect(measurementPackage.deviceLibrary).toBeUndefined();
    expect(measurementPackage.iconLibrary).toBeUndefined();
  });

  test("creates component library packages with devices measurements and icons but without templates", () => {
    const componentPackage = createLibraryPackage({
      scope: "component-library",
      exportedAt: "2026-06-28T00:00:00.000Z",
      measurementConfig: DEFAULT_MEASUREMENT_CONFIG,
      deviceLibrary: {
        customDeviceTemplates: [
          {
            kind: "custom-meter",
            label: "Custom Meter",
            categoryLibrary: "交流设备",
            size: { width: 80, height: 48 },
            params: { component_type: "CustomMeter" },
            terminalType: "ac",
            terminalCount: 2,
            custom: true
          }
        ],
        customCategoryLibraries: ["用户库"],
        customComponentLibraries: [{ name: "CustomMeter", categoryLibraryName: "用户库" }],
        deviceDefinitionOverrides: { "custom-meter": { kind: "custom-meter", size: { width: 96, height: 48 } } },
        customGraphTemplateTypes: ["不应导出的模板类型"],
        customGraphTemplates: [sampleGraphTemplate("template-hidden", "不应导出的模板类型", "不应导出的模板")]
      },
      iconLibrary: {
        folders: [{ id: "root", name: "默认文件夹" }],
        assets: [
          {
            id: "img-component",
            name: "元件图标",
            folderId: "root",
            url: "/api/images/img-component",
            dataUrl: "data:image/png;base64,AA=="
          }
        ]
      }
    });

    expect(componentPackage.scope).toBe("component-library");
    expect(componentPackage.measurementConfig?.measurementTypes.length).toBeGreaterThan(0);
    expect(componentPackage.iconLibrary?.assets.map((asset) => asset.id)).toEqual(["img-component"]);
    expect(componentPackage.deviceLibrary?.customDeviceTemplates).toHaveLength(1);
    expect(componentPackage.deviceLibrary?.deviceDefinitionOverrides["custom-meter"]).toMatchObject({ kind: "custom-meter" });
    expect(componentPackage.deviceLibrary?.customGraphTemplateTypes).toEqual([]);
    expect(componentPackage.deviceLibrary?.customGraphTemplates).toEqual([]);

    const current = {
      customDeviceTemplates: [],
      customCategoryLibraries: [],
      customComponentLibraries: [],
      deviceDefinitionOverrides: {},
      customGraphTemplateTypes: ["保留模板类型"],
      customGraphTemplates: [sampleGraphTemplate("template-kept", "保留模板类型", "保留模板")]
    };
    const merged = deviceLibraryPayloadForPackageScope(current as any, componentPackage.deviceLibrary as any, "component-library");

    expect(merged.customDeviceTemplates).toHaveLength(1);
    expect(merged.customGraphTemplateTypes).toEqual(["保留模板类型"]);
    expect(merged.customGraphTemplates[0].id).toBe("template-kept");
  });

  test("includes the static graphic built-in library in selectable category libraries", () => {
    expect(selectableCategoryLibraryList(["交流设备", "自定义库"], ["用户类别库"])).toEqual([
      "静态图元",
      "交流设备",
      "直流设备",
      "氢能设备",
      "热能设备",
      "用户类别库",
      "自定义库"
    ]);
    expect(isBuiltInCategoryLibrary("静态图元")).toBe(true);
    expect(defaultCategoryLibraryForComponentLibrary("StaticButton")).toBe("静态图元");
  });

  test("filters template groups by type name or template name", () => {
    const templates = [
      sampleGraphTemplate("source-template", "一次设备", "电源组合"),
      sampleGraphTemplate("load-template", "一次设备", "负荷组合"),
      sampleGraphTemplate("monitor-template", "量测模板", "遥测显示")
    ];
    const typeNames = graphTemplateTypeList(["量测模板"], templates);
    const grouped = groupGraphTemplatesByType(templates as any, typeNames);

    expect(filterGraphTemplatesByType(grouped, "电源")).toEqual({
      一次设备: [templates[0]]
    });
    expect(filterGraphTemplatesByType(grouped, "量测")).toEqual({
      量测模板: [templates[2]]
    });
  });

  test("opens the right-floating template group flyout when the pointer enters the type row", () => {
    const appSource = readFileSync(new URL("./App.tsx", import.meta.url), "utf8");
    const sectionMatch = appSource.match(
      /className=\{`library-group-section template-library-type-section[\s\S]*?onMouseLeave=\{\(\) => \{/u
    );

    expect(sectionMatch?.[0]).toContain('templateLibraryDisplayMode === "right"');
    expect(sectionMatch?.[0]).toContain("setHoveredGraphTemplateType(typeName)");
  });

  test("keeps the right-floating template flyout open while the template context menu is hovered", () => {
    const appViewSource = readFileSync(new URL("./appExtracted/appView.tsx", import.meta.url), "utf8");
    const templateMenuMatch = appViewSource.match(
      /\{templateMenu && \(\(\) => \{[\s\S]*?\{renderMeasurementConfigDialog\(\)\}/u
    );

    expect(appViewSource).toContain("const keepTemplateContextMenuFlyoutOpen");
    expect(appViewSource).toContain("clearLibraryFlyoutCloseTimer()");
    expect(appViewSource).toContain("setHoveredGraphTemplateType(typeName)");
    expect(templateMenuMatch?.[0]).toContain("onMouseEnter");
    expect(templateMenuMatch?.[0]).toContain("keepTemplateContextMenuFlyoutOpen");
  });

  test("keeps the right-floating template flyout open when opening a template item context menu", () => {
    const appSource = readFileSync(new URL("./App.tsx", import.meta.url), "utf8");
    const templateButtonMatch = appSource.match(
      /const renderGraphTemplateButton = \(template: GraphTemplate\) => \([\s\S]*?onDragStart=\{\(event\) => \{/u
    );

    expect(templateButtonMatch?.[0]).toContain("clearLibraryFlyoutCloseTimer()");
    expect(templateButtonMatch?.[0]).toContain("setHoveredGraphTemplateType(template.typeName)");
  });

  test("uses one library package import/export entry with direct component and template actions", () => {
    const appSource = readFileSync(new URL("./App.tsx", import.meta.url), "utf8");
    const appViewSource = readFileSync(new URL("./appExtracted/appView.tsx", import.meta.url), "utf8");
    const projectFactorySource = readFileSync(new URL("./appExtracted/appProjectCanvasFactories.tsx", import.meta.url), "utf8");

    expect(appSource).toContain("libraryPackageDialogOpen");
    expect(appSource).toContain("confirmLibraryPackageDialog");
    expect(appViewSource).toContain("library-package-dialog");
    expect(appViewSource).toContain("导入/导出库");
    expect(appSource).not.toContain("title=\"导出量测定义\"");
    expect(appSource).not.toContain("title=\"导入量测定义\"");
    expect(appSource).not.toContain("title=\"导出图标库\"");
    expect(appSource).not.toContain("title=\"导入图标库\"");
    const libraryPanelMatch = appSource.match(/const renderLibraryPanel = \(\) => \([\s\S]*?Object\.assign\(__appScope, \{ renderLibraryPanel \}\);/u);
    expect(libraryPanelMatch?.[0]).toContain('title="导入元件库"');
    expect(libraryPanelMatch?.[0]).toContain('title="导出元件库"');
    expect(libraryPanelMatch?.[0]).toContain('openLibraryPackageImportFilePicker("component-library")');
    expect(libraryPanelMatch?.[0]).toContain('exportLibraryPackage("component-library")');
    const templatePanelMatch = appSource.match(/const renderTemplateLibraryPanel = \(\) => \([\s\S]*?Object\.assign\(__appScope, \{ renderTemplateLibraryPanel \}\);/u);
    expect(templatePanelMatch?.[0]).toContain('title="导入模板库"');
    expect(templatePanelMatch?.[0]).toContain('title="导出模板库"');
    expect(templatePanelMatch?.[0]).toContain('openLibraryPackageImportFilePicker("template-library")');
    expect(templatePanelMatch?.[0]).toContain('exportLibraryPackage("template-library")');
    expect(appSource.match(/title="导入元件库"/gu)).toHaveLength(1);
    expect(appSource.match(/title="导出元件库"/gu)).toHaveLength(1);
    expect(appSource.match(/title="导入模板库"/gu)).toHaveLength(1);
    expect(appSource.match(/title="导出模板库"/gu)).toHaveLength(1);
    const measurementToolbarMatch = projectFactorySource.match(/className="measurement-config-toolbar"[\s\S]*?<\/div>/u);
    expect(measurementToolbarMatch?.[0]).toContain("新增量测类型");
    expect(measurementToolbarMatch?.[0]).not.toContain("exportLibraryPackage");
    expect(measurementToolbarMatch?.[0]).not.toContain("openLibraryPackageImportFilePicker");
    expect(measurementToolbarMatch?.[0]).not.toContain("<Download");
    expect(measurementToolbarMatch?.[0]).not.toContain("<FileInput");
  });

  test("alerts after a library package import succeeds", () => {
    const appSource = readFileSync(new URL("./App.tsx", import.meta.url), "utf8");
    const importHandlerMatch = appSource.match(
      /const importLibraryPackageFile = \(event: ChangeEvent<HTMLInputElement>\) => \{[\s\S]*?Object\.assign\(__appScope, \{ importLibraryPackageFile \}\);/u
    );
    const importHandler = importHandlerMatch?.[0] ?? "";
    const logIndex = importHandler.indexOf("writeOperationLog(`导入${label}：${file.name}`);");
    const successAlertIndex = importHandler.indexOf("window.alert(`导入${label}成功。`);");
    const catchIndex = importHandler.indexOf("} catch (error) {");

    expect(logIndex).toBeGreaterThanOrEqual(0);
    expect(successAlertIndex).toBeGreaterThan(logIndex);
    expect(successAlertIndex).toBeLessThan(catchIndex);
  });

  test("renders enum options as grouped rows in the parameter definition table", () => {
    const editor = renderEnumValuesEditor(
      {
        id: "status",
        cnName: "状态",
        enName: "status",
        valueType: "numberEnum",
        typicalValue: "1",
        enumOptions: [
          { value: "1", label: "闭合" },
          { value: "0", label: "断开" }
        ]
      } as any,
      () => undefined,
      true
    );

    expect(isValidElement(editor)).toBe(true);
    const editorProps = (editor as ReactElement<{ className: string; children: ReactNode }>).props;
    expect(editorProps.className).toContain("number-enum");
    expect(editorProps.className).toContain("readonly");

    const optionRows = Children.toArray(editorProps.children).filter(
      (child): child is ReactElement<{ className: string; children: ReactNode }> =>
        isValidElement(child) &&
        (child as ReactElement<{ className: string }>).props.className === "custom-param-enum-row"
    );
    expect(optionRows).toHaveLength(2);
    const firstRowChildren = Children.toArray(optionRows[0].props.children).filter(Boolean);
    expect(firstRowChildren.every((child) => isValidElement(child))).toBe(true);
    expect((firstRowChildren[0] as ReactElement<{ className: string }>).props.className).toBe("custom-param-enum-field");
    expect((firstRowChildren[1] as ReactElement<{ className: string }>).props.className).toBe("custom-param-enum-field");
  });

  test("normalizes persisted status definitions as editable while keeping structural rows readonly", () => {
    const definitions = normalizeDefinitionRows([
      { cnName: "序号", enName: "idx", valueType: "integer", typicalValue: "", readonly: true },
      { cnName: "运行状态", enName: "status", valueType: "numberEnum", typicalValue: "1", enumValues: ["1", "0"], readonly: true },
      { cnName: "工作状态", enName: "run_stat", valueType: "stringEnum", typicalValue: "运行", enumValues: ["运行", "停运"], readonly: true },
      { cnName: "节点", enName: "node", valueType: "integer", typicalValue: "", readonly: true }
    ]);

    expect(definitions.find((definition) => definition.enName === "idx")).toMatchObject({ readonly: true });
    expect(definitions.find((definition) => definition.enName === "status")).toMatchObject({ readonly: false });
    expect(definitions.find((definition) => definition.enName === "run_stat")).toMatchObject({ readonly: false });
    expect(definitions.find((definition) => definition.enName === "node")).toMatchObject({ readonly: true });
  });

  test("merges terminal anchors into the state icon editor base layer", () => {
    const appViewSource = readFileSync(new URL("./appExtracted/appView.tsx", import.meta.url), "utf8");
    const appCoreSource = readFileSync(new URL("./appExtracted/appCoreCanvasUtilities.tsx", import.meta.url), "utf8");
    const deviceDefinitionSource = readFileSync(new URL("./appExtracted/appDeviceDefinitionFactories.tsx", import.meta.url), "utf8");

    expect(appCoreSource).toContain('export type CustomDeviceDialogView = "icon" | "parameters" | "measurements"');
    expect(appViewSource).not.toContain("setCustomDeviceDialogView(\"terminals\")");
    expect(appViewSource).not.toContain(">端子定义<");
    expect(appViewSource).toContain('visibleCustomDeviceDialogView === "icon" ?');
    expect(appViewSource).toContain("customDeviceDraft.terminalCount > 0 && <div className=\"custom-terminal-grid\"");
    expect(deviceDefinitionSource).toContain("const stateIconTerminalFrame = {");
    expect(deviceDefinitionSource).toContain("x: STATE_ICON_DRAWING_FRAME_WIDTH / 8");
    expect(deviceDefinitionSource).toContain("width: STATE_ICON_DRAWING_FRAME_WIDTH * 3 / 4");
    expect(deviceDefinitionSource).toContain("const renderStateIconOuterFrameLayer = () =>");
    expect(deviceDefinitionSource).toContain("const renderStateIconTerminalBaseLayer = () =>");
    expect(deviceDefinitionSource).toContain("className=\"state-icon-drawing-icon-frame state-icon-drawing-inner-frame\"");
    expect(deviceDefinitionSource).toContain("className=\"state-icon-drawing-icon-frame state-icon-drawing-outer-frame\"");
    expect(deviceDefinitionSource).toContain("className=\"custom-device-terminal-connector state-icon-terminal-connector\"");
    expect(deviceDefinitionSource).toContain("className={`custom-device-terminal-anchor state-icon-terminal-anchor");
    expect(deviceDefinitionSource.indexOf("{renderStateIconOuterFrameLayer()}")).toBeLessThan(
      deviceDefinitionSource.indexOf("{renderStateIconTerminalBaseLayer()}")
    );
    expect(deviceDefinitionSource.indexOf("{renderStateIconTerminalBaseLayer()}")).toBeLessThan(
      deviceDefinitionSource.indexOf("directPreviewElements ? previewElements.map")
    );
    expect(deviceDefinitionSource).toContain("definitionVisualDraft.terminalCount > 0 && <div className=\"custom-terminal-grid device-definition-terminal-grid\"");
  });

  test("normalizes saved custom device templates with persisted terminal connector lines", () => {
    const [template] = normalizeCustomDeviceTemplates([
      {
        kind: "custom-existing",
        label: "Existing",
        categoryLibrary: "交流设备",
        size: { width: 104, height: 64 },
        params: {
          component_type: "Existing",
          backgroundImage: "data:image/svg+xml;charset=utf-8," + encodeURIComponent(
            '<svg xmlns="http://www.w3.org/2000/svg" width="240" height="160" viewBox="0 0 240 160"><rect width="240" height="160"/></svg>'
          ),
          backgroundImageAssetId: ""
        },
        terminalType: "ac",
        terminalCount: 2,
        terminalTypes: ["ac", "dc"],
        terminalAnchors: [
          { x: -0.5, y: 0 },
          { x: 0.5, y: 0 }
        ]
      }
    ]);
    const source = svgSourceFromDataUrl(template.params.backgroundImage);

    expect(source).toContain('data-custom-device-persisted-terminal-connectors="true"');
    expect(source).toContain('x1="0" y1="80" x2="30" y2="80"');
    expect(source).toContain('x1="240" y1="80" x2="210" y2="80"');
    expect(source).not.toContain("<circle");
  });
});
