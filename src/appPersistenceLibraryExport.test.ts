import { readFileSync } from "node:fs";
import { createElement, isValidElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, test, vi } from "vitest";
import { apiPath } from "./config";
import {
  CustomComponentManagerTree,
  customComponentTreeContextMenuCapabilities,
  buildCustomComponentClassTree,
  buildDeviceTemplateCopyVisualSvg,
  buildDeviceTemplateIconSvg,
  createLibraryPackage,
  componentLibraryDisplayParts,
  defaultCategoryLibraryForComponentLibrary,
  deviceLibraryPayloadForPackageScope,
  filterGraphTemplatesByType,
  graphTemplateTypeList,
  groupDeviceTemplatesByCategoryLibraryAndComponentLibrary,
  groupGraphTemplatesByType,
  isBuiltInCategoryLibrary,
  libraryTemplateMatchesSearch,
  normalizeLibraryPackage,
  normalizeDeviceLibraryPersistencePayload,
  serializeDeviceLibraryForStorage,
  normalizeDeviceDefinitionOverrides,
  migrateDeviceLibraryPersistencePayload,
  DEVICE_LIBRARY_SCHEMA_VERSION,
  selectableCategoryLibraryList,
  normalizeCustomComponentLibraries,
  normalizeCustomDeviceTemplates,
  normalizeDefinitionRows,
  placeContextMenuInViewport,
  rootComponentLibraryGroupsForDisplay,
  enumDisplayText,
  enumEditorOptionsForRow,
  enumEditorValidationMessage,
  enumValuesSummaryText,
  fetchBackendSchemes,
  renderEnumValuesEditor
} from "./appExtracted/appPersistenceLibraryExport";
import { applyDeviceTemplateDefinitionOverride, DEFAULT_COLOR_PALETTE, DEVICE_LIBRARY } from "./model";
import { deviceDefinitionOverrideForTemplate, deviceDefinitionSharedKeyForTemplate } from "./customDeviceUtils";
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

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("model library backend response", () => {
  test("accepts an explicitly empty schemes array", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ schemes: [] }), {
      status: 200,
      headers: { "content-type": "application/json" }
    })));

    await expect(fetchBackendSchemes()).resolves.toEqual([]);
  });

  test("rejects a malformed success response instead of treating it as an empty library", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "content-type": "application/json" }
    })));

    await expect(fetchBackendSchemes()).rejects.toThrow("后台方案/模型响应格式无效，已保留当前模型库。");
  });
});

describe("built-in vertical bus visual normalization", () => {
  const legacyGeneratedBusImage = (fill = "#2563eb") => `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg data-state-icon-drawing="true"><rect data-state-icon-frame="true" fill="transparent" stroke="transparent" stroke-width="0"/><svg data-state-icon-preserve-view-box="true"><g transform="rotate(90) scale(1 1)"><rect class="bus-glyph" x="-50" y="-4" width="100" height="8" fill="${fill}" stroke="${fill}" stroke-width="0"/></g></svg></svg>`
  )}`;

  test("removes a legacy generated background that hides the built-in vertical bus glyph", () => {
    const normalized = normalizeDeviceDefinitionOverrides({
      "ac-bus-vertical": {
        kind: "ac-bus-vertical",
        params: {
          backgroundImage: legacyGeneratedBusImage(),
          backgroundImageAssetId: "",
          backgroundImageFit: "cover",
          backgroundImageCleared: ""
        },
        size: { width: 150, height: 36 }
      }
    });

    expect(normalized["ac-bus-vertical"].params).not.toHaveProperty("backgroundImage");
    expect(normalized["ac-bus-vertical"].size).toEqual({ width: 150, height: 36 });
  });

  test("keeps an explicitly customized vertical bus image", () => {
    const customizedImage = legacyGeneratedBusImage("#dc2626");
    const normalized = normalizeDeviceDefinitionOverrides({
      "ac-bus-vertical": {
        kind: "ac-bus-vertical",
        params: { backgroundImage: customizedImage, backgroundImageFit: "contain" }
      }
    });

    expect(normalized["ac-bus-vertical"].params?.backgroundImage).toBe(customizedImage);
    expect(normalized["ac-bus-vertical"].params?.backgroundImageFit).toBe("contain");
  });
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

  test("preserves and reapplies edited built-in component Chinese and English names", () => {
    const template = DEVICE_LIBRARY.find((item) => item.kind === "ac-source")!;
    const overrides = normalizeDeviceDefinitionOverrides({
      [template.kind]: {
        kind: template.kind,
        label: "重命名交流电源",
        englishName: "renamed-ac-source"
      }
    });

    expect(overrides[template.kind]).toMatchObject({
      kind: template.kind,
      label: "重命名交流电源",
      englishName: "renamed-ac-source"
    });
    const applied = applyDeviceTemplateDefinitionOverride(template, overrides[template.kind]);
    expect(applied.label).toBe("重命名交流电源");
    expect(applied.englishName).toBe("renamed-ac-source");
  });

  test("removes unmarked historical empty built-in definition tables", () => {
    const normalized = normalizeDeviceDefinitionOverrides({
      "dcdc-converter": {
        kind: "dcdc-converter",
        parameterDefinitions: [],
        measurementDefinitions: [],
        updatedAt: "2026-08-13T00:00:00.000Z"
      }
    });

    expect(normalized["shared:DCDCConverter"]).toBeUndefined();
    expect(normalized["dcdc-converter"]).toBeUndefined();
  });

  test("preserves only a marked delete-all definition table", () => {
    const normalized = normalizeDeviceDefinitionOverrides({
      "dcdc-converter": {
        kind: "dcdc-converter",
        parameterDefinitions: [],
        parameterDefinitionsIntent: "delete-all",
        updatedAt: "2026-08-13T00:00:00.000Z"
      }
    });
    expect(normalized["shared:DCDCConverter"]).toMatchObject({
      kind: "shared:DCDCConverter",
      parameterDefinitions: [],
      parameterDefinitionsIntent: "delete-all"
    });
  });

  test("migrates unversioned libraries to the current schema and is idempotent", () => {
    const legacy = {
      customAttributeLibraries: ["旧类别库"],
      customComponentTypes: [{ name: "LegacyDevice", attributeLibraryName: "旧类别库" }],
      deviceDefinitionOverrides: {
        "shared:ACGenerator": {
          kind: "shared:ACGenerator",
          params: { component_type: "ACGenerator" },
          parameterDefinitions: [],
          measurementDefinitions: []
        },
        "shared:DCDCConverter": {
          kind: "shared:DCDCConverter",
          parameterDefinitions: [],
          parameterDefinitionsIntent: "delete-all",
          measurementDefinitions: [],
          measurementDefinitionsIntent: "delete-all"
        },
        "shared:ACLoad": {
          kind: "shared:ACLoad",
          parameterDefinitions: [{ cnName: "有功", enName: "p", valueType: "float", typicalValue: "0" }]
        }
      }
    };
    const migrated = migrateDeviceLibraryPersistencePayload(legacy);
    const normalized = normalizeDeviceLibraryPersistencePayload(legacy);
    expect(migrated.schemaVersion).toBe(DEVICE_LIBRARY_SCHEMA_VERSION);
    expect(migrated.deviceDefinitionOverrides?.["shared:ACGenerator"]?.parameterDefinitions).toBeUndefined();
    expect(migrated.deviceDefinitionOverrides?.["shared:ACGenerator"]?.measurementDefinitions).toBeUndefined();
    expect(migrated.deviceDefinitionOverrides?.["shared:DCDCConverter"]).toMatchObject({
      parameterDefinitions: [],
      parameterDefinitionsIntent: "delete-all",
      measurementDefinitions: [],
      measurementDefinitionsIntent: "delete-all"
    });
    expect(normalized).toMatchObject({
      schemaVersion: DEVICE_LIBRARY_SCHEMA_VERSION,
      customCategoryLibraries: ["旧类别库"],
      customComponentLibraries: [{ name: "LegacyDevice", categoryLibraryName: "旧类别库" }]
    });
    expect(normalizeDeviceLibraryPersistencePayload(normalized)).toEqual(normalized);
  });

  test("round-trips class-owned base definitions and incremental derived definitions", () => {
    const normalized = normalizeDeviceLibraryPersistencePayload({
      deviceDefinitionOverrides: {
        "class:BasePump": {
          kind: "class:BasePump",
          params: { component_type: "BasePump" },
          parameterDefinitions: [
            { cnName: "节点号", enName: "node", valueType: "integer", typicalValue: "", readonly: true }
          ],
          measurementDefinitions: [
            { measurementTypeId: "status", position: "device", associatedField: "run_stat" }
          ]
        },
        "class:DerivedPump": {
          kind: "class:DerivedPump",
          params: { component_type: "DerivedPump" },
          parameterDefinitions: [],
          parameterDefinitionsIntent: "delete-all",
          measurementDefinitions: [],
          measurementDefinitionsIntent: "delete-all"
        }
      }
    });
    const roundTripped = normalizeDeviceLibraryPersistencePayload(JSON.parse(JSON.stringify(normalized)));

    expect(roundTripped.deviceDefinitionOverrides["class:BasePump"]).toMatchObject({
      parameterDefinitions: [expect.objectContaining({ enName: "node" })],
      measurementDefinitions: [
        { measurementTypeId: "status", position: "device", associatedField: "run_stat" }
      ]
    });
    expect(roundTripped.deviceDefinitionOverrides["class:DerivedPump"]).toMatchObject({
      parameterDefinitions: [],
      parameterDefinitionsIntent: "delete-all",
      measurementDefinitions: [],
      measurementDefinitionsIntent: "delete-all"
    });
  });

  test("round-trips legacy concrete business definitions as shared class definitions only", () => {
    const legacy = {
      schemaVersion: 2,
      customDeviceTemplates: [
        {
          kind: "custom-demo",
          label: "横向示例",
          categoryLibrary: "交流设备",
          size: { width: 104, height: 64 },
          params: { component_type: "DemoClass", backgroundImage: "horizontal.svg", run_stat: "1", p: "2" },
          terminalType: "ac",
          terminalCount: 1,
          custom: true,
          parameterDefinitions: [
            { cnName: "工作状态", enName: "run_stat", valueType: "numberEnum", typicalValue: "1" },
            { cnName: "有功", enName: "p", valueType: "float", typicalValue: "2" }
          ],
          measurementDefinitions: [{ measurementTypeId: "activePower", associatedField: "p" }]
        },
        {
          kind: "custom-demo-vertical",
          label: "竖向示例",
          categoryLibrary: "交流设备",
          size: { width: 64, height: 104 },
          params: { component_type: "DemoClass", backgroundImage: "vertical.svg", run_stat: "1", p: "2" },
          terminalType: "ac",
          terminalCount: 1,
          custom: true
        }
      ],
      deviceDefinitionOverrides: {
        "custom-demo-vertical": {
          kind: "custom-demo-vertical",
          params: { backgroundImageFit: "contain", p: "99" }
        }
      }
    };
    const normalized = normalizeDeviceLibraryPersistencePayload(legacy);
    const roundTripped = normalizeDeviceLibraryPersistencePayload(JSON.parse(JSON.stringify(normalized)));
    expect(roundTripped).toEqual(normalized);

    const sharedKey = deviceDefinitionSharedKeyForTemplate(normalized.customDeviceTemplates[0]);
    expect(normalized.deviceDefinitionOverrides[sharedKey]).toMatchObject({
      params: { run_stat: "1", p: "2" },
      parameterDefinitions: [{ enName: "run_stat" }, { enName: "p" }],
      measurementDefinitions: [{ measurementTypeId: "activePower", associatedField: "p" }]
    });
    for (const template of normalized.customDeviceTemplates) {
      expect(template.parameterDefinitions).toBeUndefined();
      expect(template.measurementDefinitions).toBeUndefined();
      expect(template.params.run_stat).toBeUndefined();
      expect(template.params.p).toBeUndefined();
    }
    for (const [kind, override] of Object.entries(normalized.deviceDefinitionOverrides) as Array<[string, any]>) {
      if (kind.startsWith("shared:") || kind.startsWith("class:")) continue;
      expect(override.parameterDefinitions, kind).toBeUndefined();
      expect(override.parameterDefinitionsIntent, kind).toBeUndefined();
      expect(override.measurementDefinitions, kind).toBeUndefined();
      expect(override.params?.p, kind).toBeUndefined();
    }
    const effective = applyDeviceTemplateDefinitionOverride(
      normalized.customDeviceTemplates[1],
      deviceDefinitionOverrideForTemplate(
        normalized.customDeviceTemplates[1],
        normalized.deviceDefinitionOverrides,
        normalized.customDeviceTemplates
      )
    );
    expect(effective.parameterDefinitions?.map((row) => row.enName)).toEqual(["run_stat", "p"]);
    expect(effective.measurementDefinitions).toEqual([{ measurementTypeId: "activePower", associatedField: "p" }]);
    expect(effective.params.backgroundImage).toContain("vertical.svg");
    expect(effective.params.backgroundImageFit).toBe("contain");
  });

  test("persists no business tables on any concrete built-in override", () => {
    const normalized = normalizeDeviceLibraryPersistencePayload({
      schemaVersion: 2,
      deviceDefinitionOverrides: Object.fromEntries(DEVICE_LIBRARY.map((template) => [
        template.kind,
        {
          kind: template.kind,
          params: { ...template.params, backgroundImage: `${template.kind}.svg` },
          parameterDefinitions: template.parameterDefinitions,
          measurementDefinitions: template.measurementDefinitions
        }
      ]))
    });
    for (const [kind, override] of Object.entries(normalized.deviceDefinitionOverrides) as Array<[string, any]>) {
      if (kind.startsWith("shared:") || kind.startsWith("class:")) continue;
      expect(override.parameterDefinitions, kind).toBeUndefined();
      expect(override.parameterDefinitionsIntent, kind).toBeUndefined();
      expect(override.measurementDefinitions, kind).toBeUndefined();
    }
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
    expect(normalized.customComponentLibraries).toEqual([
      expect.objectContaining({
        name: "LegacyMeter",
        categoryLibraryName: "用户旧库",
        terminalCount: 2,
        terminalTypes: ["ac", "ac"],
        isContainerComponentLibrary: false
      })
    ]);
    expect(normalized.customDeviceTemplates[0]).toMatchObject({
      kind: "legacy-meter",
      categoryLibrary: "用户旧库",
      params: { component_type: "LegacyMeter" }
    });
    expect("attributeLibrary" in normalized.customDeviceTemplates[0]).toBe(false);
  });

  test("preserves E interface labels, class export flags and normalized field order", () => {
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
      },
      eDeviceDefinitionFieldOrder: {
        ACLoad: ["name", "idx", "name", "", 5],
        HydroStorage: ["idx", "gasQuantity", "my_gasQuantity_field", "gasquantity", "gas_quantity"],
        "": ["idx"],
        DCLoad: "idx,name"
      },
      eDeviceDefinitionTemplateFields: {
        ACNode: [
          { sourceName: "node", exportName: "realbs", cnName: "真实母线" },
          { sourceName: "node", exportName: "realbs", cnName: "重复列" },
          { sourceName: "", exportName: "", cnName: "" },
          "invalid"
        ],
        HydroStorage: [
          { sourceName: "gasquantity", exportName: "gasQuantity", cnName: "储气量" },
          { sourceName: "gas_quantity", exportName: "customGasQuantity", cnName: "自定义储气量" }
        ],
        "": [{ exportName: "idx" }]
      }
    } as any);

    expect((normalized as any).eDeviceDefinitionLabels).toEqual({ ACLoad: "LoadTable" });
    expect((normalized as any).eDeviceDefinitionClassExportEnabled).toEqual({ ACLoad: false, DCLoad: true });
    expect((normalized as any).eDeviceDefinitionFieldOrder).toEqual({
      ACLoad: ["name", "idx"],
      HydroStorage: ["idx", "gas_quantity", "my_gasQuantity_field"]
    });
    expect((normalized as any).eDeviceDefinitionTemplateFields).toEqual({
      ACNode: [{ sourceName: "node", exportName: "realbs", cnName: "真实母线" }],
      HydroStorage: [
        { sourceName: "gas_quantity", exportName: "gas_quantity", cnName: "储气量" },
        { sourceName: "gas_quantity", exportName: "customGasQuantity", cnName: "自定义储气量" }
      ]
    });
  });

  test("keeps custom component library Chinese labels for bilingual display", () => {
    const normalized = normalizeCustomComponentLibraries([
      { name: "CustomPump", categoryLibraryName: "用户类别库", label: "用户泵库" },
      { name: "LegacyMeter", attributeLibraryName: "用户旧库", cnName: "旧量测库" }
    ] as any);

    expect(normalized).toEqual([
      expect.objectContaining({ name: "CustomPump", categoryLibraryName: "用户类别库", label: "用户泵库", terminalCount: 2 }),
      expect.objectContaining({ name: "LegacyMeter", categoryLibraryName: "用户旧库", label: "旧量测库", terminalCount: 2 })
    ]);
    expect(componentLibraryDisplayParts("CustomPump", normalized).title).toBe("用户泵库 / CustomPump");
    expect(componentLibraryDisplayParts("LegacyMeter", normalized).chinese).toBe("旧量测库");
    expect(componentLibraryDisplayParts("UnknownCustomClass", normalized).chinese).toBe("自定义类");
  });

  test("preserves derived component-library metadata as an independent immutable class", () => {
    const sourceComponentLibrary = {
      name: "UserWindGen",
      categoryLibraryName: "交流设备",
      label: "用户风电",
      isDerivedComponentLibrary: true,
      derivedFromComponentLibrary: "ACGenerator",
      isContainerComponentLibrary: true
    };
    const componentLibraries = normalizeCustomComponentLibraries([sourceComponentLibrary] as any);

    expect(componentLibraries).toEqual([
      expect.objectContaining({
        name: "UserWindGen",
        categoryLibraryName: "交流设备",
        label: "用户风电",
        isDerivedComponentLibrary: true,
        derivedFromComponentLibrary: "ACGenerator"
      })
    ]);
    expect(componentLibraries[0]).not.toHaveProperty("isContainerComponentLibrary");

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
      customComponentLibraries: [sourceComponentLibrary],
      deviceDefinitionOverrides: {},
      customGraphTemplateTypes: [],
      customGraphTemplates: []
    } as any);

    expect(normalized.customComponentLibraries).toEqual([
      expect.objectContaining({
        name: "UserWindGen",
        isDerivedComponentLibrary: true,
        derivedFromComponentLibrary: "ACGenerator"
      })
    ]);
    expect(normalized.customComponentLibraries[0]).not.toHaveProperty("isContainerComponentLibrary");
    expect(normalized.customComponentLibraries[0]).not.toHaveProperty("terminalCount");
    expect(normalized.customComponentLibraries[0]).not.toHaveProperty("terminalTypes");
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

  test("migrates legacy class metadata from one representative and applies it to every concrete icon", () => {
    const legacy = {
      schemaVersion: 3,
      customDeviceTemplates: [
        {
          kind: "custom-demo-horizontal",
          label: "示例横向",
          categoryLibrary: "交流设备",
          size: { width: 100, height: 60 },
          params: { component_type: "DemoClass" },
          terminalType: "ac",
          terminalCount: 1,
          terminalTypes: ["ac"],
          terminalLabels: ["交流端"],
          terminalAnchors: [{ x: 0.5, y: 0 }],
          terminalRoles: ["single-load"],
          isContainer: false,
          allowResizeTransform: true,
          custom: true
        },
        {
          kind: "custom-demo-vertical",
          label: "示例竖向",
          categoryLibrary: "交流设备",
          size: { width: 60, height: 100 },
          params: { component_type: "DemoClass" },
          terminalType: "dc",
          terminalCount: 2,
          terminalTypes: ["dc", "dc"],
          terminalLabels: ["旧端1", "旧端2"],
          terminalAnchors: [{ x: 0, y: -0.5 }, { x: 0, y: 0.5 }],
          terminalRoles: ["single-source", "single-load"],
          isContainer: true,
          allowResizeTransform: false,
          custom: true
        }
      ],
      customCategoryLibraries: [],
      customComponentLibraries: [],
      deviceDefinitionOverrides: {},
      customGraphTemplateTypes: [],
      customGraphTemplates: []
    };

    const normalized = normalizeDeviceLibraryPersistencePayload(legacy as any);

    expect(normalized.schemaVersion).toBe(DEVICE_LIBRARY_SCHEMA_VERSION);
    expect(normalized.customComponentLibraries).toEqual([
      expect.objectContaining({
        name: "DemoClass",
        label: "示例横向",
        terminalCount: 1,
        terminalTypes: ["ac"],
        terminalLabels: ["交流端"],
        isContainerComponentLibrary: false
      })
    ]);
    expect(normalized.customDeviceTemplates).toHaveLength(2);
    for (const template of normalized.customDeviceTemplates) {
      expect(template).toMatchObject({
        terminalCount: 1,
        terminalTypes: ["ac"],
        terminalLabels: ["交流端"],
        isContainer: false
      });
    }
    expect(normalized.customDeviceTemplates.map((template: any) => template.allowResizeTransform)).toEqual([true, false]);
    expect(normalized.customDeviceTemplates[0].terminalAnchors).toEqual([{ x: 0.5, y: 0 }]);
    expect(normalized.customDeviceTemplates[1].terminalAnchors).toHaveLength(1);
    expect(normalizeDeviceLibraryPersistencePayload(normalized)).toEqual(normalized);
  });

  test("stores only class references and visual element data, then rehydrates class metadata", () => {
    const runtime = normalizeDeviceLibraryPersistencePayload({
      schemaVersion: 4,
      customDeviceTemplates: [
        {
          kind: "custom-pump-left",
          label: "左向用户泵",
          categoryLibrary: "用户设备",
          size: { width: 100, height: 60 },
          params: {
            component_type: "UserPump",
            backgroundImage: "left.svg",
            p_set: "12"
          },
          terminalType: "ac",
          terminalCount: 1,
          terminalTypes: ["ac"],
          terminalLabels: ["交流端"],
          terminalAnchors: [{ x: -0.5, y: 0 }],
          terminalRoles: ["single-load"],
          terminalAssociations: ["ac-load"],
          isContainer: false,
          allowResizeTransform: false,
          custom: true
        },
        {
          kind: "custom-pump-right",
          label: "右向用户泵",
          categoryLibrary: "用户设备",
          size: { width: 120, height: 70 },
          params: {
            component_type: "UserPump",
            backgroundImage: "right.svg"
          },
          terminalType: "ac",
          terminalCount: 1,
          terminalTypes: ["ac"],
          terminalLabels: ["交流端"],
          terminalAnchors: [{ x: 0.5, y: 0 }],
          terminalRoles: ["single-load"],
          terminalAssociations: ["ac-load"],
          isContainer: false,
          allowResizeTransform: true,
          custom: true
        }
      ],
      customCategoryLibraries: ["用户设备"],
      customComponentLibraries: [{
        name: "UserPump",
        categoryLibraryName: "用户设备",
        label: "用户泵",
        isDerivedComponentLibrary: false,
        isContainerComponentLibrary: false,
        terminalCount: 1,
        terminalTypes: ["ac"],
        terminalLabels: ["交流端"],
        terminalRoles: ["single-load"],
        terminalAssociations: ["ac-load"]
      }],
      deviceDefinitionOverrides: {},
      customGraphTemplateTypes: [],
      customGraphTemplates: []
    } as any);

    const stored = JSON.parse(serializeDeviceLibraryForStorage(runtime));
    expect(stored.schemaVersion).toBe(DEVICE_LIBRARY_SCHEMA_VERSION);
    expect(stored.customDeviceTemplates).toEqual([
      expect.objectContaining({
        kind: "custom-pump-left",
        componentClass: "UserPump",
        terminalAnchors: [{ x: -0.5, y: 0 }],
        allowResizeTransform: false,
        params: expect.objectContaining({ backgroundImage: expect.stringContaining("left.svg") })
      }),
      expect.objectContaining({
        kind: "custom-pump-right",
        componentClass: "UserPump",
        terminalAnchors: [{ x: 0.5, y: 0 }],
        allowResizeTransform: true,
        params: expect.objectContaining({ backgroundImage: expect.stringContaining("right.svg") })
      })
    ]);
    for (const template of stored.customDeviceTemplates) {
      expect(template).not.toHaveProperty("categoryLibrary");
      expect(template).not.toHaveProperty("terminalCount");
      expect(template).not.toHaveProperty("terminalTypes");
      expect(template).not.toHaveProperty("terminalLabels");
      expect(template).not.toHaveProperty("terminalRoles");
      expect(template).not.toHaveProperty("terminalAssociations");
      expect(template).not.toHaveProperty("isContainer");
      expect(template).not.toHaveProperty("isDerivedComponentLibrary");
      expect(template.params).not.toHaveProperty("component_type");
      expect(template.params).not.toHaveProperty("p_set");
    }

    const reloaded = normalizeDeviceLibraryPersistencePayload(stored);
    expect(reloaded.customDeviceTemplates.map((template: any) => template.categoryLibrary)).toEqual(["用户设备", "用户设备"]);
    expect(reloaded.customDeviceTemplates.map((template: any) => template.terminalCount)).toEqual([1, 1]);
    expect(reloaded.customDeviceTemplates.map((template: any) => template.terminalLabels)).toEqual([["交流端"], ["交流端"]]);
    expect(reloaded.customDeviceTemplates.map((template: any) => template.allowResizeTransform)).toEqual([false, true]);
  });

  test("groups custom derived components under their base class section", () => {
    const definition = normalizeCustomComponentLibraries([{
      name: "UserWindGen",
      categoryLibraryName: "交流设备",
      label: "用户风电",
      isDerivedComponentLibrary: true,
      derivedFromComponentLibrary: "ACGenerator",
      terminalCount: 1,
      terminalTypes: ["ac"]
    }] as any);
    const grouped = groupDeviceTemplatesByCategoryLibraryAndComponentLibrary([
      {
        kind: "custom-user-wind",
        label: "用户风机",
        categoryLibrary: "交流设备",
        size: { width: 96, height: 64 },
        params: {
          component_type: "ACGenerator",
          derived_from_component_type: "ACGenerator",
          derived_component_type: "UserWindGen",
          is_derived_component_library: "1"
        },
        terminalType: "ac",
        terminalCount: 1,
        custom: true,
        isDerivedComponentLibrary: true,
        derivedFromComponentLibrary: "ACGenerator",
        derivedComponentLibrary: "UserWindGen"
      }
    ] as any, definition);

    expect(grouped["交流设备"]).toEqual([
      expect.objectContaining({
        section: "ACGenerator",
        templates: [expect.objectContaining({ kind: "custom-user-wind" })]
      })
    ]);
    expect(grouped["交流设备"].some((group) => group.section === "UserWindGen")).toBe(false);
  });

  test("matches a derived component by its derived class name after grouping under the base class", () => {
    const template = {
      kind: "custom-user-wind",
      label: "用户风机",
      categoryLibrary: "交流设备",
      componentClass: "UserWindGen",
      size: { width: 96, height: 64 },
      params: { component_type: "ACGenerator" },
      terminalType: "ac",
      terminalCount: 1,
      custom: true
    } as any;

    expect(libraryTemplateMatchesSearch(template, "交流设备", "ACGenerator", "userwindgen")).toBe(true);
  });

  test("matches a component by its editable English display name", () => {
    const template = {
      kind: "ac-load",
      englishName: "user-ac-load",
      label: "用户交流负荷",
      categoryLibrary: "交流设备",
      size: { width: 96, height: 64 },
      params: { component_type: "ACLoad" },
      terminalType: "ac",
      terminalCount: 1
    } as any;

    expect(libraryTemplateMatchesSearch(template, "交流设备", "ACLoad", "user-ac-load")).toBe(true);
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
    expect(componentLibraryDisplayParts("ACWindGen").title).toBe("交流风力发电机 / ACWindGen");
    expect(componentLibraryDisplayParts("DCHydroGen").title).toBe("直流水力发电机 / DCHydroGen");
    expect(componentLibraryDisplayParts("ACNuclearGen").chinese).toBe("交流核能发电机");
    expect(componentLibraryDisplayParts("ACDieselGen").title).toBe("交流柴油发电机 / ACDieselGen");
    expect(componentLibraryDisplayParts("DCDieselGen").chinese).toBe("直流柴油发电机");
  });

  test("groups built-in generation derived classes under the base power-source component library", () => {
    const templates = DEVICE_LIBRARY.filter((template) => template.kind === "ac-source" || template.kind === "ac-wind-source" || template.kind === "ac-pv-source" || template.kind === "ac-diesel-source");
    const grouped = groupDeviceTemplatesByCategoryLibraryAndComponentLibrary(templates);
    const acSections = grouped["交流设备"] ?? [];
    const acGeneratorSection = acSections.find((section) => section.section === "ACGenerator");

    expect(acGeneratorSection?.templates.map((template: { kind: string }) => template.kind).sort()).toEqual([
      "ac-diesel-source",
      "ac-pv-source",
      "ac-source",
      "ac-wind-source"
    ]);
    expect(acSections.some((section) => section.section === "ACDieselGen")).toBe(false);
    expect(acSections.some((section) => section.section === "ACWindGen")).toBe(false);
    expect(acSections.some((section) => section.section === "ACPVGen")).toBe(false);
  });

  test("builds base-class direct components and derived-class component branches", () => {
    const templates = DEVICE_LIBRARY.filter((template) => [
      "ac-source",
      "ac-wind-source",
      "ac-pv-source",
      "ac-diesel-source"
    ].includes(template.kind));
    const grouped = groupDeviceTemplatesByCategoryLibraryAndComponentLibrary(templates);
    const tree = buildCustomComponentClassTree("交流设备", grouped["交流设备"] ?? [], []);
    const generator = tree.find((node) => node.section === "ACGenerator");

    expect(generator?.templates.map((template) => template.kind)).toEqual(["ac-source"]);
    expect(generator?.derivedClasses.map((node) => node.section)).toEqual([
      "ACWindGen",
      "ACPVGen",
      "ACDieselGen"
    ]);
    expect(generator?.derivedClasses.map((node) => node.templates.map((template) => template.kind))).toEqual([
      ["ac-wind-source"],
      ["ac-pv-source"],
      ["ac-diesel-source"]
    ]);
  });

  test("shows custom derived classes under their base class even before they have components", () => {
    const definitions = normalizeCustomComponentLibraries([
      {
        name: "UserWindGen",
        categoryLibraryName: "交流设备",
        label: "用户风电",
        isDerivedComponentLibrary: true,
        derivedFromComponentLibrary: "ACGenerator",
        terminalCount: 1,
        terminalTypes: ["ac"]
      },
      {
        name: "EmptyDerivedGen",
        categoryLibraryName: "交流设备",
        label: "空派生类",
        isDerivedComponentLibrary: true,
        derivedFromComponentLibrary: "ACGenerator",
        terminalCount: 1,
        terminalTypes: ["ac"]
      }
    ] as any);
    const grouped = groupDeviceTemplatesByCategoryLibraryAndComponentLibrary([
      {
        kind: "custom-user-wind",
        label: "用户风机",
        categoryLibrary: "交流设备",
        size: { width: 96, height: 64 },
        params: {
          component_type: "ACGenerator",
          derived_from_component_type: "ACGenerator",
          derived_component_type: "UserWindGen",
          derived_component_library_label: "用户风电",
          is_derived_component_library: "1"
        },
        terminalType: "ac",
        terminalCount: 1,
        custom: true,
        isDerivedComponentLibrary: true,
        derivedFromComponentLibrary: "ACGenerator",
        derivedComponentLibrary: "UserWindGen"
      },
      {
        kind: "custom-base-generator",
        label: "基类直属机组",
        categoryLibrary: "交流设备",
        size: { width: 96, height: 64 },
        params: { component_type: "ACGenerator" },
        terminalType: "ac",
        terminalCount: 1,
        custom: true
      }
    ] as any, definitions);
    const tree = buildCustomComponentClassTree("交流设备", grouped["交流设备"] ?? [], definitions);
    const generator = tree.find((node) => node.section === "ACGenerator");

    expect(generator?.templates.map((template) => template.kind)).toEqual(["custom-base-generator"]);
    expect(generator?.derivedClasses).toEqual(expect.arrayContaining([
      expect.objectContaining({
        section: "UserWindGen",
        templates: [expect.objectContaining({ kind: "custom-user-wind" })]
      }),
      expect.objectContaining({ section: "EmptyDerivedGen", templates: [] })
    ]));
    expect(generator?.templates.some((template) => template.kind === "custom-user-wind")).toBe(false);
  });

  test("shows a deeply derived concrete component inside its root base class in the graphic library", () => {
    const normalized = normalizeDeviceLibraryPersistencePayload({
      customComponentLibraries: [
        {
          name: "CustomDevice4",
          categoryLibraryName: "交流设备",
          label: "CCC",
          isDerivedComponentLibrary: false,
          terminalCount: 2,
          terminalTypes: ["ac", "ac"]
        },
        {
          name: "CustomDevice5",
          categoryLibraryName: "交流设备",
          label: "ttt",
          isDerivedComponentLibrary: true,
          derivedFromComponentLibrary: "CustomDevice4"
        },
        {
          name: "CustomDevice6",
          categoryLibraryName: "交流设备",
          label: "bbbb",
          isDerivedComponentLibrary: true,
          derivedFromComponentLibrary: "CustomDevice5"
        }
      ],
      customDeviceTemplates: [
        {
          kind: "custom-CustomDevice6",
          label: "言",
          componentClass: "CustomDevice6",
          categoryLibrary: "交流设备",
          size: { width: 96, height: 64 },
          params: { backgroundImage: "data:image/svg+xml,%3Csvg%2F%3E" },
          terminalType: "ac",
          terminalCount: 2,
          custom: true
        }
      ]
    });
    const grouped = groupDeviceTemplatesByCategoryLibraryAndComponentLibrary(
      normalized.customDeviceTemplates,
      normalized.customComponentLibraries
    );
    const rawSections = grouped["交流设备"] ?? [];
    const displayGroups = rootComponentLibraryGroupsForDisplay(
      "交流设备",
      rawSections,
      normalized.customComponentLibraries
    );
    const searchedGroups = rootComponentLibraryGroupsForDisplay(
      "交流设备",
      rawSections,
      normalized.customComponentLibraries,
      "CCC"
    );

    expect(rawSections.find((group) => group.section === "CustomDevice5")?.templates).toEqual([
      expect.objectContaining({ kind: "custom-CustomDevice6", componentClass: "CustomDevice6" })
    ]);
    expect(displayGroups.map((group) => group.section)).toContain("CustomDevice4");
    expect(displayGroups.map((group) => group.section)).not.toContain("CustomDevice5");
    expect(displayGroups.find((group) => group.section === "CustomDevice4")?.templates).toEqual([
      expect.objectContaining({ kind: "custom-CustomDevice6", label: "言" })
    ]);
    expect(searchedGroups.find((group) => group.section === "CustomDevice4")?.templates).toEqual([
      expect.objectContaining({ kind: "custom-CustomDevice6", label: "言" })
    ]);
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
    const appSource = readFileSync(new URL("./App.tsx", import.meta.url), "utf8")
      + readFileSync(new URL("./appExtracted/appStateBatch.tsx", import.meta.url), "utf8")
      + readFileSync(new URL("./appExtracted/appCanvasViewportBatch.tsx", import.meta.url), "utf8")
      + readFileSync(new URL("./appExtracted/appRenderBatch.tsx", import.meta.url), "utf8");
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
    const panelSource = readFileSync(new URL("./appExtracted/appRenderPanels.tsx", import.meta.url), "utf8");
    const templateButtonMatch = panelSource.match(
      /createRenderGraphTemplateButton[\s\S]*?onDragStart=\{\(event\) => \{/u
    );

    expect(templateButtonMatch?.[0]).toContain("clearLibraryFlyoutCloseTimer()");
    expect(templateButtonMatch?.[0]).toContain("setHoveredGraphTemplateType(template.typeName)");
  });

  test("uses one library package import/export entry with direct component and template actions", () => {
    const appSource = readFileSync(new URL("./App.tsx", import.meta.url), "utf8")
      + readFileSync(new URL("./appExtracted/appStateBatch.tsx", import.meta.url), "utf8")
      + readFileSync(new URL("./appExtracted/appCanvasViewportBatch.tsx", import.meta.url), "utf8")
      + readFileSync(new URL("./appExtracted/appRenderBatch.tsx", import.meta.url), "utf8");
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
    expect(libraryPanelMatch?.[0]).toContain('title="导入类"');
    expect(libraryPanelMatch?.[0]).toContain('title="导出类"');
    expect(libraryPanelMatch?.[0]).toContain('openLibraryPackageImportFilePicker("component-library")');
    expect(libraryPanelMatch?.[0]).toContain('exportLibraryPackage("component-library")');
    const templatePanelMatch = appSource.match(/const renderTemplateLibraryPanel = \(\) => \([\s\S]*?Object\.assign\(__appScope, \{ renderTemplateLibraryPanel \}\);/u);
    expect(templatePanelMatch?.[0]).toContain('title="导入模板库"');
    expect(templatePanelMatch?.[0]).toContain('title="导出模板库"');
    expect(templatePanelMatch?.[0]).toContain('openLibraryPackageImportFilePicker("template-library")');
    expect(templatePanelMatch?.[0]).toContain('exportLibraryPackage("template-library")');
    expect(appSource.match(/title="导入类"/gu)).toHaveLength(1);
    expect(appSource.match(/title="导出类"/gu)).toHaveLength(1);
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
    const appSource = readFileSync(new URL("./App.tsx", import.meta.url), "utf8")
      + readFileSync(new URL("./appExtracted/appStateBatch.tsx", import.meta.url), "utf8")
      + readFileSync(new URL("./appExtracted/appCanvasViewportBatch.tsx", import.meta.url), "utf8")
      + readFileSync(new URL("./appExtracted/appRenderBatch.tsx", import.meta.url), "utf8");
    const libraryPanelContentMatch = appSource.match(
      /const libraryPanelContent = useMemo\([\s\S]*?Object\.assign\(__appScope, \{ libraryPanelContent \}\);/u
    );

    expect(libraryPanelContentMatch?.[0]).toContain("measurementConfig");
  });

  test("alerts after a library package import succeeds", () => {
    const appSource = readFileSync(new URL("./App.tsx", import.meta.url), "utf8")
      + readFileSync(new URL("./appExtracted/appStateBatch.tsx", import.meta.url), "utf8")
      + readFileSync(new URL("./appExtracted/appCanvasViewportBatch.tsx", import.meta.url), "utf8")
      + readFileSync(new URL("./appExtracted/appRenderBatch.tsx", import.meta.url), "utf8");
    const importHandlerMatch = appSource.match(
      /const importLibraryPackageFile = \(event: ChangeEvent<HTMLInputElement>\) => \{[\s\S]*?Object\.assign\(__appScope, \{ importLibraryPackageFile \}\);/u
    );
    const importHandler = importHandlerMatch?.[0] ?? "";
    const logIndex = importHandler.indexOf("writeOperationLog(`导入${label}：${file.name}`);");
    const successAlertIndex = importHandler.indexOf("showGlobalMessage(`导入${label}成功。`);");
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
    expect(definitions.find((definition) => definition.enName === "run_stat")).toMatchObject({
      readonly: false,
      valueType: "numberEnum",
      typicalValue: "1",
      enumValueType: "number",
      enumValues: ["1", "0"],
      enumOptions: [
        { value: "1", label: "运行" },
        { value: "0", label: "停运" }
      ]
    });
    expect(definitions.find((definition) => definition.enName === "node")).toMatchObject({ readonly: true });
  });

  test("normalizes run_stat values and definitions in persisted templates and overrides", () => {
    const [template] = normalizeCustomDeviceTemplates([{
      kind: "custom-legacy-run-stat",
      label: "旧工作状态设备",
      categoryLibrary: "交流设备",
      size: { width: 104, height: 64 },
      params: { component_type: "LegacyRunStat", run_stat: "投运" },
      terminalType: "ac",
      terminalCount: 1,
      parameterDefinitions: [{
        cnName: "工作状态",
        enName: "run_stat",
        valueType: "stringEnum",
        typicalValue: "运行",
        enumValues: ["运行", "停运"]
      }]
    }]);
    const overrides = normalizeDeviceDefinitionOverrides({
      "ac-load": {
        kind: "ac-load",
        params: { run_stat: "停运" },
        parameterDefinitions: [{
          cnName: "工作状态",
          enName: "run_stat",
          valueType: "stringEnum",
          typicalValue: "运行",
          enumValues: ["运行", "停运"]
        }]
      }
    });

    expect(template.params.run_stat).toBe("1");
    expect(template.parameterDefinitions?.[0]).toMatchObject({
      valueType: "numberEnum",
      typicalValue: "1",
      enumValues: ["1", "0"]
    });
    expect(overrides["shared:ACLoad"]?.params?.run_stat).toBe("0");
    expect(overrides["shared:ACLoad"]?.parameterDefinitions?.[0]).toMatchObject({
      valueType: "numberEnum",
      typicalValue: "1",
      enumValues: ["1", "0"]
    });
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

  test("normalizes legacy SOC params, definitions, and measurements in persisted device data", () => {
    const [template] = normalizeCustomDeviceTemplates([{
      kind: "custom-legacy-storage",
      label: "旧储能",
      categoryLibrary: "交流设备",
      size: { width: 104, height: 64 },
      params: { component_type: "LegacyStorage", state_of_charge: "50" },
      terminalType: "ac",
      terminalCount: 1,
      parameterDefinitions: [{ cnName: "荷电状态", enName: "stateOfCharge", valueType: "float", typicalValue: "50" }],
      measurementDefinitions: [{ measurementTypeId: "state_of_charge", associatedField: "stateOfCharge" }]
    } as any]);
    const overrides = normalizeDeviceDefinitionOverrides({
      "shared:LegacyStorage": {
        kind: "shared:LegacyStorage",
        params: { stateOfCharge: "50" },
        parameterDefinitions: [{ cnName: "荷电状态", enName: "state_of_charge", valueType: "float", typicalValue: "50" }],
        measurementDefinitions: [{ measurementTypeId: "stateOfCharge", associatedField: "state_of_charge" }]
      }
    } as any);

    expect(template.params).toMatchObject({ soc: "0.5" });
    expect(template.params).not.toHaveProperty("state_of_charge");
    expect(template.parameterDefinitions).toEqual([expect.objectContaining({ enName: "soc", typicalValue: "0.5" })]);
    expect(template.measurementDefinitions).toEqual([{ measurementTypeId: "soc", associatedField: "soc" }]);
    expect(overrides["shared:LegacyStorage"]).toMatchObject({
      params: { soc: "0.5" },
      parameterDefinitions: [expect.objectContaining({ enName: "soc", typicalValue: "0.5" })],
      measurementDefinitions: [{ measurementTypeId: "soc", associatedField: "soc" }]
    });
  });

  test("renders E export controls only in the centralized E interface definition table", () => {
    const appViewSource = readFileSync(new URL("./appExtracted/appView.tsx", import.meta.url), "utf8");

    expect(appViewSource.match(/<th>是否导出<\/th>/gu)).toHaveLength(1);
    expect(appViewSource.match(/<th>导出名称<\/th>/gu)).toHaveLength(2);
    expect(appViewSource).toContain("e-device-interface-group-export-all");
    expect(appViewSource).toContain("e-device-interface-table");
    expect(appViewSource).toContain("exportEnabled");
    expect(appViewSource).toContain("exportName");
  });

  test("merges terminal anchors into the state icon editor base layer", () => {
    const appViewSource = readFileSync(new URL("./appExtracted/appView.tsx", import.meta.url), "utf8");
    const appCoreSource = readFileSync(new URL("./appExtracted/appCoreCanvasUtilities.tsx", import.meta.url), "utf8");
    const deviceDefinitionSource = readFileSync(new URL("./appExtracted/appDeviceDefinitionFactories.tsx", import.meta.url), "utf8");
    const deviceDefinitionRenderersSource = readFileSync(new URL("./appExtracted/appDeviceDefinitionRenderers.tsx", import.meta.url), "utf8");

    expect(appCoreSource).toContain('export type CustomDeviceDialogView = "icon" | "parameters" | "measurements"');
    expect(appViewSource).not.toContain("setCustomDeviceDialogView(\"terminals\")");
    expect(appViewSource).not.toContain(">端子定义<");
    expect(appViewSource).toContain('visibleCustomDeviceDialogView === "icon" ?');
    expect(appViewSource).toContain("customDeviceDraft.terminalCount > 0 && <div className=\"custom-terminal-grid\"");
    expect(deviceDefinitionRenderersSource).toContain("const stateIconTerminalFrame = {");
    expect(deviceDefinitionRenderersSource).toContain("x: STATE_ICON_DRAWING_FRAME_WIDTH / 8");
    expect(deviceDefinitionRenderersSource).toContain("width: STATE_ICON_DRAWING_FRAME_WIDTH * 3 / 4");
    expect(deviceDefinitionRenderersSource).toContain("const renderStateIconOuterFrameLayer = () =>");
    expect(deviceDefinitionRenderersSource).toContain("const renderStateIconTerminalBaseLayer = () =>");
    expect(deviceDefinitionRenderersSource).toContain("className=\"state-icon-drawing-icon-frame state-icon-drawing-inner-frame\"");
    expect(deviceDefinitionRenderersSource).toContain("className=\"state-icon-drawing-icon-frame state-icon-drawing-outer-frame\"");
    expect(deviceDefinitionRenderersSource).toContain("className=\"custom-device-terminal-connector state-icon-terminal-connector\"");
    expect(deviceDefinitionRenderersSource).toContain("className={`custom-device-terminal-anchor state-icon-terminal-anchor");
    expect(deviceDefinitionRenderersSource.indexOf("{renderStateIconOuterFrameLayer()}")).toBeLessThan(
      deviceDefinitionRenderersSource.indexOf("{renderStateIconTerminalBaseLayer()}")
    );
    expect(deviceDefinitionRenderersSource.indexOf("{renderStateIconTerminalBaseLayer()}")).toBeLessThan(
      deviceDefinitionRenderersSource.indexOf("directPreviewElements ? previewElements.map")
    );
    expect(deviceDefinitionRenderersSource).toContain("definitionVisualDraft.terminalCount > 0 && <div className=\"custom-terminal-grid device-definition-terminal-grid\"");
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
    expect(source).toContain('x1="0" y1="80" x2="108" y2="80"');
    expect(source).toContain('x1="240" y1="80" x2="132" y2="80"');
    expect(source).not.toContain("<circle");
  });
});

describe("E device interface definition entry", () => {
  const renderCustomComponentManagerTree = (initialSelection: any) => {
    const templates = DEVICE_LIBRARY.filter((template) => [
      "ac-source",
      "ac-wind-source"
    ].includes(template.kind));
    return renderToStaticMarkup(createElement(CustomComponentManagerTree as any, {
      libraries: ["交流设备"],
      filteredByComponentLibrary: groupDeviceTemplatesByCategoryLibraryAndComponentLibrary(templates),
      customComponentLibraries: [],
      initialCollapsedLibraries: new Set(),
      initialCollapsedTypes: new Set(),
      initialSelection,
      searchQuery: "",
      onSelectCategoryLibrary: () => undefined,
      onSelectComponent: () => undefined,
      onSelectComponentLibrary: () => undefined,
      onCreateCategoryLibrary: () => undefined,
      onCreateComponentLibrary: () => undefined,
      onCreateComponent: () => undefined,
      onDeleteSelection: () => undefined,
      onSearchChange: () => undefined,
      onCollapseChange: () => undefined,
      onSelectionChange: () => undefined,
      onOpenEDeviceDefinitionInterface: () => undefined
    }));
  };

  test("renders derived classes as a second-level branch below the base class", () => {
    const templates = DEVICE_LIBRARY.filter((template) => [
      "ac-source",
      "ac-wind-source",
      "ac-pv-source",
      "ac-diesel-source"
    ].includes(template.kind));
    const grouped = groupDeviceTemplatesByCategoryLibraryAndComponentLibrary(templates);
    const html = renderToStaticMarkup(createElement(CustomComponentManagerTree as any, {
      libraries: ["交流设备"],
      filteredByComponentLibrary: grouped,
      customComponentLibraries: [],
      initialCollapsedLibraries: new Set(),
      initialCollapsedTypes: new Set(),
      initialSelection: { kind: "categoryLibrary", categoryLibraryName: "交流设备" },
      searchQuery: "",
      onSelectCategoryLibrary: () => undefined,
      onSelectComponent: () => undefined,
      onSelectComponentLibrary: () => undefined,
      onCreateCategoryLibrary: () => undefined,
      onCreateComponentLibrary: () => undefined,
      onCreateComponent: () => undefined,
      onDeleteSelection: () => undefined,
      onSearchChange: () => undefined,
      onCollapseChange: () => undefined,
      onSelectionChange: () => undefined,
      onOpenEDeviceDefinitionInterface: () => undefined
    }));

    expect(html).toContain('aria-label="交流设备/ACGenerator直属元件列表"');
    expect(html).toContain('aria-label="交流设备/ACGenerator派生类列表"');
    expect(html).toContain('aria-label="交流设备/ACWindGen直属元件列表"');
    expect(html.indexOf('aria-label="交流设备/ACGenerator直属元件列表"')).toBeLessThan(
      html.indexOf('aria-label="交流设备/ACGenerator派生类列表"')
    );
    expect((html.match(/class="custom-component-tree-thumbnail"/g) ?? [])).toHaveLength(templates.length);
    expect(html).toMatch(/class="custom-component-tree-thumbnail"[\s\S]*?class="dialog-tree-bilingual dialog-tree-component-label"/);
  });

  test("marks only the exactly selected derived class as active", () => {
    const selectedClassHtml = renderCustomComponentManagerTree({
      kind: "componentLibrary",
      categoryLibraryName: "交流设备",
      section: "ACWindGen"
    });
    const selectedChildHtml = renderCustomComponentManagerTree({
      kind: "component",
      categoryLibraryName: "交流设备",
      section: "ACWindGen",
      templateKind: "ac-wind-source"
    });
    const styles = readFileSync(new URL("./styles.css", import.meta.url), "utf8");

    expect(selectedClassHtml).toMatch(/class="custom-component-tree-row type derived-type active"[\s\S]*?ACWindGen/);
    expect(selectedChildHtml).not.toMatch(/class="custom-component-tree-row type derived-type active"[\s\S]*?ACWindGen/);
    expect(selectedChildHtml).toMatch(/class="custom-component-tree-row component active"[\s\S]*?ac-wind-source/);
    expect(styles).toMatch(/\.custom-component-tree-row\.type\.derived-type \.custom-component-tree-row-label\.active\s*\{[^}]*background:\s*#1e40af/s);
  });

  test("moves tree actions into a selection-aware context menu", () => {
    const categoryHtml = renderCustomComponentManagerTree({
      kind: "categoryLibrary",
      categoryLibraryName: "交流设备"
    });
    const classHtml = renderCustomComponentManagerTree({
      kind: "componentLibrary",
      categoryLibraryName: "交流设备",
      section: "ACGenerator"
    });
    const componentHtml = renderCustomComponentManagerTree({
      kind: "component",
      categoryLibraryName: "交流设备",
      section: "ACGenerator",
      templateKind: "ac-source"
    });
    expect(categoryHtml).not.toContain("重命名");
    expect(categoryHtml).not.toContain("custom-component-manager-actions");
    expect(classHtml).not.toContain("custom-component-manager-actions");
    expect(componentHtml).not.toContain("custom-component-manager-actions");

    expect(customComponentTreeContextMenuCapabilities({
      kind: "categoryLibrary",
      categoryLibraryName: "交流设备"
    }, false)).toEqual({
      createCategoryLibrary: true,
      createComponentLibrary: true,
      createComponent: false,
      deleteSelection: true,
      copyComponent: false,
      pasteComponent: false,
      exportComponentSvg: false,
      importComponentSvg: false
    });
    expect(customComponentTreeContextMenuCapabilities({
      kind: "componentLibrary",
      categoryLibraryName: "交流设备",
      section: "ACGenerator"
    }, true)).toMatchObject({
      createComponentLibrary: true,
      createComponent: true,
      copyComponent: false,
      pasteComponent: true,
      exportComponentSvg: false,
      importComponentSvg: false
    });
    expect(customComponentTreeContextMenuCapabilities({
      kind: "component",
      categoryLibraryName: "交流设备",
      section: "ACGenerator",
      templateKind: "ac-source"
    }, true)).toMatchObject({
      createComponentLibrary: false,
      createComponent: false,
      copyComponent: true,
      pasteComponent: true,
      exportComponentSvg: true,
      importComponentSvg: true
    });

    const source = readFileSync(new URL("./appExtracted/appPersistenceLibraryExport.tsx", import.meta.url), "utf8");
    expect(source).toContain("createPortal(");
    expect(source).toContain("getBoundingClientRect()");
    expect(source).not.toContain("window.innerHeight - 342");
  });

  test("places the measured component context menu beside the pointer and fully inside the viewport", () => {
    expect(placeContextMenuInViewport({
      clientX: 240,
      clientY: 180,
      menuWidth: 196,
      menuHeight: 318,
      viewportWidth: 1200,
      viewportHeight: 800
    })).toEqual({ left: 240, top: 180 });

    expect(placeContextMenuInViewport({
      clientX: 1120,
      clientY: 760,
      menuWidth: 196,
      menuHeight: 318,
      viewportWidth: 1200,
      viewportHeight: 800
    })).toEqual({ left: 924, top: 442 });

    expect(placeContextMenuInViewport({
      clientX: 2,
      clientY: 4,
      menuWidth: 500,
      menuHeight: 500,
      viewportWidth: 320,
      viewportHeight: 240,
      margin: 8
    })).toEqual({ left: 8, top: 8 });
  });

  test("builds a standalone SVG for one component visual without its instance label", () => {
    const template = DEVICE_LIBRARY.find((item) => item.kind === "ac-source")!;
    const svg = buildDeviceTemplateIconSvg(template);

    expect(svg).toMatch(/^<svg\b/);
    expect(svg).toContain('viewBox="0,0,');
    expect(svg).toContain("symbol_ACGenerator_ac-source");
    expect(svg).toContain('device-type="ACGenerator"');
    expect(svg).not.toContain('class="node-label-text"');
  });

  test("solidifies a built-in component visual for copy without source terminals or instance label", () => {
    const template = DEVICE_LIBRARY.find((item) => item.kind === "ac-reactor")!;
    const svg = buildDeviceTemplateCopyVisualSvg(template);

    expect(svg).toMatch(/^<svg\b/);
    expect(svg).toContain("symbol_ACCompensator_ac-reactor");
    expect(svg).toContain('device-type="ACCompensator"');
    expect(svg).not.toContain('<g class="export-terminal ');
    expect(svg).not.toContain('class="node-label-text"');
  });

  test.each(["ac-series-reactor", "ac-series-reactor-vertical"])(
    "solidifies the complete %s visual for component copy",
    (kind) => {
      const template = DEVICE_LIBRARY.find((item) => item.kind === kind)!;
      const svg = buildDeviceTemplateCopyVisualSvg(template);

      expect(svg).toMatch(/^<svg\b/);
      expect(svg).toContain(`symbol_ACSeriCompensator_${kind}`);
      expect(svg).toContain('class="ac-series-compensator-glyph ac-series-reactor"');
      expect(svg).not.toContain('<g class="export-terminal ');
      expect(svg).not.toContain('class="node-label-text"');
    }
  );

  test("keeps the component tree focused without the retired E interface shortcut", () => {
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
      onDeleteSelection: () => undefined,
      onSearchChange: () => undefined,
      onCollapseChange: () => undefined,
      onSelectionChange: () => undefined,
      onOpenEDeviceDefinitionInterface: () => undefined,
      onExportEDeviceDefinition: () => undefined,
      onImportEDeviceDefinition: () => undefined
    }));

    expect(html).not.toContain("E文件接口定义");
    expect(html).toContain("类别库 / 类 / 元件");
    expect(html).not.toContain("custom-component-manager-actions");
    expect(html).toContain('placeholder="搜索类别库/类/元件"');
    expect(html).not.toContain(`新建${["元件", "库"].join("")}`);
    expect(html).not.toContain("导出E文件定义");
    expect(html).not.toContain("导入E文件定义");
  });
});
