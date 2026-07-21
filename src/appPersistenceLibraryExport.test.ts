import { readFileSync } from "node:fs";
import { createElement, isValidElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vitest";
import { apiPath } from "./config";
import {
  CustomComponentManagerTree,
  createLibraryPackage,
  componentLibraryDisplayParts,
  defaultCategoryLibraryForComponentLibrary,
  deviceLibraryPayloadForPackageScope,
  filterGraphTemplatesByType,
  graphTemplateTypeList,
  groupDeviceTemplatesByCategoryLibraryAndComponentLibrary,
  groupGraphTemplatesByType,
  isBuiltInCategoryLibrary,
  normalizeLibraryPackage,
  normalizeDeviceLibraryPersistencePayload,
  normalizeDeviceDefinitionOverrides,
  selectableCategoryLibraryList,
  normalizeCustomComponentLibraries,
  normalizeCustomDeviceTemplates,
  normalizeDefinitionRows,
  enumDisplayText,
  enumEditorOptionsForRow,
  enumEditorValidationMessage,
  enumValuesSummaryText,
  renderEnumValuesEditor
} from "./appExtracted/appPersistenceLibraryExport";
import { DEFAULT_COLOR_PALETTE, DEVICE_LIBRARY } from "./model";
import { DEFAULT_MEASUREMENT_CONFIG } from "./measurements";
import { svgSourceFromDataUrl } from "./stateIconDrawing";
import { emptyUserDeviceLibrary } from "./userCustomizations";

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
      version: 2,
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

  test("creates version-2 all-library packages with color configuration and a manifest", () => {
    const packagePayload = createLibraryPackage({
      scope: "all",
      exportedAt: "2026-07-21T00:00:00.000Z",
      measurementConfig: DEFAULT_MEASUREMENT_CONFIG,
      deviceLibrary: emptyUserDeviceLibrary(),
      iconLibrary: { folders: [{ id: "root", name: "默认文件夹" }], assets: [] },
      colorConfig: { colorDisplayMode: "energy", colorPalette: DEFAULT_COLOR_PALETTE },
      manifest: { total: 0, domainCounts: {} }
    });

    expect(packagePayload).toMatchObject({
      format: "graph-modeling-platform-library-package",
      version: 2,
      scope: "all",
      colorConfig: { colorDisplayMode: "energy" },
      manifest: { total: 0 }
    });
  });

  test("accepts version-1 packages while leaving version-2-only domains absent", () => {
    const normalized = normalizeLibraryPackage({
      format: "graph-modeling-platform-library-package",
      version: 1,
      scope: "device-library",
      deviceLibrary: emptyUserDeviceLibrary()
    });

    expect(normalized.version).toBe(2);
    expect(normalized.deviceLibrary).toBeDefined();
    expect(normalized.colorConfig).toBeUndefined();
    expect(normalized.manifest).toBeUndefined();
  });

  test("preserves explicit non-derived built-in definition overrides", () => {
    const overrides = normalizeDeviceDefinitionOverrides({
      "ac-wind-source": {
        kind: "ac-wind-source",
        params: { component_type: "ACGenerator" },
        isDerivedComponentLibrary: false,
        derivedFromComponentLibrary: "",
        derivedComponentLibrary: "",
        derivedComponentLibraryLabel: ""
      }
    });

    expect(overrides["ac-wind-source"]).toMatchObject({
      kind: "ac-wind-source",
      params: { component_type: "ACGenerator" },
      isDerivedComponentLibrary: false,
      derivedFromComponentLibrary: "",
      derivedComponentLibrary: "",
      derivedComponentLibraryLabel: ""
    });
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

  test("preserves E interface definition labels and class export flags", () => {
    const normalized = normalizeDeviceLibraryPersistencePayload({
      customDeviceTemplates: [],
      customCategoryLibraries: [],
      customComponentLibraries: [],
      deviceDefinitionOverrides: {},
      customGraphTemplateTypes: [],
      customGraphTemplates: [],
      eDeviceDefinitionLabels: {
        ACLoad: "LoadTable",
        EmptyName: "   "
      },
      eDeviceDefinitionClassExportEnabled: {
        ACLoad: false,
        DCLoad: true,
        EmptyKey: "no"
      }
    } as any);

    expect((normalized as any).eDeviceDefinitionLabels).toEqual({ ACLoad: "LoadTable" });
    expect((normalized as any).eDeviceDefinitionClassExportEnabled).toEqual({ ACLoad: false, DCLoad: true });
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

  test("normalizes old derived component-library metadata back onto the base component library", () => {
    const componentLibraries = normalizeCustomComponentLibraries([
      {
        name: "UserWindGen",
        categoryLibraryName: "交流设备",
        label: "用户风电",
        isDerivedComponentLibrary: true,
        derivedFromComponentLibrary: "ACGenerator",
        isContainerComponentLibrary: true
      }
    ] as any);

    expect(componentLibraries).toEqual([]);

    const normalized = normalizeDeviceLibraryPersistencePayload({
      customDeviceTemplates: [
        {
          kind: "custom-user-wind",
          label: "用户风电机组",
          categoryLibrary: "交流设备",
          size: { width: 96, height: 64 },
          params: {
            component_type: "UserWindGen",
            derived_from_component_type: "ACGenerator",
            derived_component_library_label: "用户风电"
          },
          terminalType: "ac",
          terminalCount: 1,
          terminalTypes: ["ac"],
          isContainer: false,
          isDerivedComponentLibrary: true,
          derivedFromComponentLibrary: "ACGenerator",
          derivedComponentLibraryLabel: "用户风电",
          custom: true
        }
      ],
      customCategoryLibraries: [],
      customComponentLibraries: componentLibraries,
      deviceDefinitionOverrides: {},
      customGraphTemplateTypes: [],
      customGraphTemplates: []
    } as any);

    expect(normalized.customComponentLibraries).toEqual([]);
    expect(normalized.customDeviceTemplates[0]).toMatchObject({
      isDerivedComponentLibrary: true,
      derivedFromComponentLibrary: "ACGenerator",
      derivedComponentLibrary: "UserWindGen",
      derivedComponentLibraryLabel: "用户风电",
      params: {
        component_type: "ACGenerator",
        derived_from_component_type: "ACGenerator",
        derived_component_type: "UserWindGen",
        derived_component_library_label: "用户风电"
      },
      isContainer: false
    });
  });

  test("migrates legacy derived templates without an explicit derived flag into the base component library", () => {
    const normalized = normalizeDeviceLibraryPersistencePayload({
      customDeviceTemplates: [
        {
          kind: "custom-legacy-wind",
          label: "旧版风电机组",
          categoryLibrary: "交流设备",
          size: { width: 96, height: 64 },
          params: {
            component_type: "UserWindGen",
            derived_from_component_type: "ACGenerator",
            derived_component_library_label: "用户风电"
          },
          terminalType: "ac",
          terminalCount: 1,
          terminalTypes: ["ac"],
          isContainer: false,
          custom: true
        }
      ],
      customCategoryLibraries: [],
      customComponentLibraries: [],
      deviceDefinitionOverrides: {},
      customGraphTemplateTypes: [],
      customGraphTemplates: []
    } as any);

    expect(normalized.customDeviceTemplates[0]).toMatchObject({
      isDerivedComponentLibrary: true,
      derivedFromComponentLibrary: "ACGenerator",
      derivedComponentLibrary: "UserWindGen",
      derivedComponentLibraryLabel: "用户风电",
      params: {
        component_type: "ACGenerator",
        derived_from_component_type: "ACGenerator",
        derived_component_type: "UserWindGen",
        derived_component_library_label: "用户风电",
        is_derived_component_library: "1"
      },
      isContainer: false
    });
  });

  test("shows built-in electric generation derived component library labels", () => {
    expect(componentLibraryDisplayParts("ACWindGen").title).toBe("交流风电 / ACWindGen");
    expect(componentLibraryDisplayParts("DCHydroGen").title).toBe("直流水电 / DCHydroGen");
    expect(componentLibraryDisplayParts("ACNuclearGen").chinese).toBe("交流核电");
  });

  test("groups built-in generation derived classes under the base power-source component library", () => {
    const templates = DEVICE_LIBRARY.filter((template) => template.kind === "ac-source" || template.kind === "ac-wind-source" || template.kind === "ac-pv-source");
    const grouped = groupDeviceTemplatesByCategoryLibraryAndComponentLibrary(templates);
    const acSections = grouped["交流设备"] ?? [];
    const acGeneratorSection = acSections.find((section) => section.section === "ACGenerator");

    expect(acGeneratorSection?.templates.map((template: { kind: string }) => template.kind).sort()).toEqual([
      "ac-pv-source",
      "ac-source",
      "ac-wind-source"
    ]);
    expect(acSections.some((section) => section.section === "ACWindGen")).toBe(false);
    expect(acSections.some((section) => section.section === "ACPVGen")).toBe(false);
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
            url: apiPath("/images/img-custom"),
            dataUrl: "data:image/png;base64,AA=="
          }
        ]
      }
    });

    expect(iconPackage.iconLibrary?.folders.map((folder) => folder.id)).toEqual(["root", "custom-icons"]);
    expect(iconPackage.iconLibrary?.assets.map((asset) => asset.id)).toEqual(["img-custom"]);
    expect(iconPackage.iconLibrary?.assets[0].url).toBe(apiPath("/images/img-custom"));
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
            url: apiPath("/images/img-component"),
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
    expect(appViewSource).not.toContain("library-transfer-open-button");
    expect(appViewSource).not.toContain('openLibraryPackageDialog?.("all")');
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
    expect(projectFactorySource).toContain("新增量测框默认样式");
    expect(projectFactorySource).toContain("默认背景色");
    expect(projectFactorySource).toContain("默认边框色");
    expect(projectFactorySource).toContain("默认边框宽度");
    expect(projectFactorySource).toContain("默认边框类型");
  });

  test("refreshes the library panel callback after measurement defaults are saved", () => {
    const appSource = readFileSync(new URL("./App.tsx", import.meta.url), "utf8");
    const libraryPanelContentMatch = appSource.match(
      /const libraryPanelContent = useMemo\([\s\S]*?Object\.assign\(__appScope, \{ libraryPanelContent \}\);/u
    );

    expect(libraryPanelContentMatch?.[0]).toContain("measurementConfig");
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

  test("renders enum options as a compact summary in the parameter definition table", () => {
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
    const html = renderToStaticMarkup(editor as any);

    expect(html).toContain("custom-param-enum-summary");
    expect(html).toContain("readonly");
    expect(html).toContain("number-enum");
    expect(html).toContain("2 项：1=闭合；0=断开");
    expect(html).toContain("双击查看枚举项详情");
    expect(html).toContain("custom-param-enum-summary-action");
    expect(html).not.toContain("custom-param-enum-row");

    const source = readFileSync(new URL("./appExtracted/appPersistenceLibraryExport.tsx", import.meta.url), "utf8");
    const actionMatch = source.match(/className="custom-param-enum-summary-action"[\s\S]*?<\/button>/u);
    expect(actionMatch?.[0]).toContain("onClick");
    expect(actionMatch?.[0]).toContain("openDialog()");
    expect(source).toContain('{enumValueType === "number" && <th>显示名称</th>}');
  });

  test("summarizes long enum lists and validates dialog edits", () => {
    expect(enumValuesSummaryText({
      enName: "mode",
      valueType: "stringEnum",
      typicalValue: "auto",
      enumOptions: [
        { value: "auto", label: "自动" },
        { value: "manual", label: "手动" },
        { value: "off", label: "停用" }
      ]
    } as any)).toBe("3 项：auto；manual；…");

    expect(enumDisplayText({ value: "auto", label: "自动" }, "string")).toBe("auto");
    expect(enumDisplayText({ value: "1", label: "闭合" }, "number")).toBe("闭合 (1)");

    expect(enumEditorOptionsForRow({
      enName: "status",
      typicalValue: "1",
      enumValues: ["1", "0"]
    } as any)).toEqual([
      { value: "1", label: "闭合" },
      { value: "0", label: "打开/开断" }
    ]);

    expect(enumEditorValidationMessage([{ value: "", label: "" }], "string")).toBe("枚举值不能为空。");
    expect(enumEditorValidationMessage([{ value: "1", label: "闭合" }, { value: "1", label: "重复" }], "number")).toBe("枚举值不能重复。");
    expect(enumEditorValidationMessage([{ value: "abc", label: "无效" }], "number")).toBe("数字枚举的值必须是有效数字。");
    expect(enumEditorValidationMessage([{ value: "1", label: "闭合" }, { value: "0", label: "断开" }], "number")).toBe("");
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

  test("preserves parameter E export settings while normalizing persisted definitions", () => {
    const definitions = normalizeDefinitionRows([
      {
        cnName: "额定功率",
        enName: "ratedPower",
        valueType: "float",
        typicalValue: "10",
        exportEnabled: true,
        exportName: "p_rated"
      },
      {
        cnName: "备注",
        enName: "remark",
        valueType: "string",
        typicalValue: "",
        exportEnabled: false,
        exportName: ""
      },
      {
        cnName: "旧参数",
        enName: "legacyValue",
        valueType: "string",
        typicalValue: "legacy"
      }
    ]);

    expect(definitions[0]).toMatchObject({ exportEnabled: true, exportName: "p_rated" });
    expect(definitions[1]).toMatchObject({ exportEnabled: false, exportName: "" });
    expect(definitions[2]).not.toHaveProperty("exportEnabled");
    expect(definitions[2]).not.toHaveProperty("exportName");
  });

  test("renders E export controls only in the centralized E interface definition table", () => {
    const appViewSource = readFileSync(new URL("./appExtracted/appView.tsx", import.meta.url), "utf8");

    expect(appViewSource.match(/<th>是否导出<\/th>/gu)).toHaveLength(1);
    expect(appViewSource.match(/<th>导出名称<\/th>/gu)).toHaveLength(1);
    expect(appViewSource).toContain("e-device-interface-table");
    expect(appViewSource).toContain("exportEnabled");
    expect(appViewSource).toContain("exportName");
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

describe("E device interface definition entry", () => {
  test("shows one merged E interface definition action instead of separate import and export buttons", () => {
    const html = renderToStaticMarkup(createElement(CustomComponentManagerTree as any, {
      libraries: [],
      filteredByComponentLibrary: {},
      customComponentLibraries: [],
      initialCollapsedLibraries: new Set(),
      initialCollapsedTypes: new Set(),
      initialSelection: { kind: "categoryLibrary", categoryLibraryName: "" },
      searchQuery: "",
      onSelectCategoryLibrary: () => undefined,
      onSelectComponent: () => undefined,
      onSelectComponentLibrary: () => undefined,
      onCreateCategoryLibrary: () => undefined,
      onCreateComponentLibrary: () => undefined,
      onCreateComponent: () => undefined,
      onRenameSelection: () => undefined,
      onDeleteSelection: () => undefined,
      onSearchChange: () => undefined,
      onCollapseChange: () => undefined,
      onSelectionChange: () => undefined,
      onOpenEDeviceDefinitionInterface: () => undefined,
      onExportEDeviceDefinition: () => undefined,
      onImportEDeviceDefinition: () => undefined
    }));

    expect(html).toContain("E文件接口定义");
    expect(html).not.toContain("导出E文件定义");
    expect(html).not.toContain("导入E文件定义");
  });
});
