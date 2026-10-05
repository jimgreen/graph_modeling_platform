import { describe, expect, test, vi } from "vitest";
import { readFileSync } from "node:fs";
import ts from "typescript";
import {
  CUSTOM_PARAM_DEFINITIONS_KEY,
  DEFAULT_COLOR_PALETTE,
  DEVICE_LIBRARY,
  applyDeviceTemplateDefinitionOverride,
  getTemplateParameterDefinitions,
  resolveDeviceParameterDefinitionExportSettings,
  type DeviceTemplate,
  type ModelNode
} from "./model";
import {
  deviceDefinitionOverrideForTemplate,
  deviceDefinitionSharedKeyForTemplate
} from "./customDeviceUtils";
import { DEFAULT_MEASUREMENT_CONFIG } from "./measurements";
import { apiPath } from "./config";
import {
  buildUserCustomizationInventory,
  collectReferencedUserAssetIds,
  emptyUserDeviceLibrary,
  mergeUserCustomizationSnapshots,
  normalizeUserCustomizationSnapshot,
  previewUserCustomizationImport,
  reconcileNodesAfterCustomizationChange,
  restoreUserCustomizationItems,
  runUserCustomizationTransaction,
  type UserCustomizationSnapshot
} from "./userCustomizations";

const defaultSnapshot = (): UserCustomizationSnapshot => normalizeUserCustomizationSnapshot({
  deviceLibrary: emptyUserDeviceLibrary(),
  measurementConfig: structuredClone(DEFAULT_MEASUREMENT_CONFIG),
  colorConfig: {
    colorDisplayMode: "energy",
    colorPalette: structuredClone(DEFAULT_COLOR_PALETTE)
  },
  imageLibrary: {
    folders: [{ id: "root", name: "默认文件夹" }],
    assets: []
  }
});

const customTemplate = (kind: string, label: string, categoryLibrary = "用户类别"): DeviceTemplate => ({
  kind,
  label,
  categoryLibrary,
  size: { width: 80, height: 48 },
  params: { component_type: "CustomSource" },
  terminalType: "ac",
  terminalCount: 1,
  custom: true
});

describe("user customization inventory", () => {
  test("reports no customization rows for program defaults", () => {
    const inventory = buildUserCustomizationInventory(defaultSnapshot(), DEVICE_LIBRARY);

    expect(inventory.items).toEqual([]);
    expect(inventory.summary).toEqual({ total: 0, added: 0, modified: 0, assets: 0 });
  });

  test("classifies every supported customization domain", () => {
    const snapshot = defaultSnapshot();
    snapshot.deviceLibrary.customCategoryLibraries = ["用户类别"];
    snapshot.deviceLibrary.customComponentLibraries = [{ name: "CustomSource", categoryLibraryName: "用户类别" }];
    snapshot.deviceLibrary.customDeviceTemplates = [{
      ...customTemplate("custom-source", "自定义电源"),
      parameterDefinitions: [{
        cnName: "燃料",
        enName: "fuel",
        valueType: "string",
        typicalValue: "",
        exportEnabled: true,
        exportName: "fuel_type"
      }]
    }];
    snapshot.deviceLibrary.deviceDefinitionOverrides["ac-source"] = {
      kind: "ac-source",
      size: { width: 96, height: 56 }
    };
    snapshot.deviceLibrary.eDeviceDefinitionLabels = { "custom-source": "CustomSourceExport" };
    snapshot.deviceLibrary.customGraphTemplateTypes = ["用户模板"];
    snapshot.deviceLibrary.customGraphTemplates = [{
      id: "tpl-1",
      typeName: "用户模板",
      name: "组合",
      sourceSize: { width: 1, height: 1 },
      clipboard: { nodes: [], edges: [], groups: [] },
      createdAt: "2026-07-21T00:00:00.000Z",
      updatedAt: "2026-07-21T00:00:00.000Z"
    }];
    snapshot.measurementConfig.measurementTypes.push({
      ...snapshot.measurementConfig.measurementTypes[0],
      id: "customPower",
      key: "custom_power",
      name: "自定义功率"
    });
    snapshot.imageLibrary.assets.push({
      id: "img-user",
      name: "用户图标",
      folderId: "root",
      url: apiPath("/images/img-user")
    });
    snapshot.colorConfig.colorPalette.energy.ac = "#123456";

    const inventory = buildUserCustomizationInventory(snapshot, DEVICE_LIBRARY);

    expect(new Set(inventory.items.map((item) => item.domain))).toEqual(new Set([
      "category-libraries",
      "component-libraries",
      "custom-devices",
      "device-definition-overrides",
      "parameter-definitions",
      "measurement-definitions",
      "e-interface-definitions",
      "graph-templates",
      "user-assets",
      "color-settings"
    ]));
    expect(inventory.items).toContainEqual(expect.objectContaining({
      domain: "component-libraries",
      summary: "新增类"
    }));
    expect(inventory.summary.total).toBe(inventory.items.length);
    expect(inventory.summary.assets).toBe(1);
  });

  test("marks referenced user assets as protected", () => {
    const snapshot = defaultSnapshot();
    snapshot.imageLibrary.assets.push({
      id: "img-used",
      name: "被引用图片",
      folderId: "root",
      url: apiPath("/images/img-used")
    });

    const inventory = buildUserCustomizationInventory(snapshot, DEVICE_LIBRARY, new Set(["img-used"]));

    expect(inventory.items).toContainEqual(expect.objectContaining({
      key: "user-assets:img-used",
      changeType: "protected",
      protected: true
    }));
  });

  test("treats a visual-only built-in override with copied defaults as one visual customization", () => {
    const snapshot = defaultSnapshot();
    const template = DEVICE_LIBRARY.find((item) => item.kind === "ac-source");
    expect(template).toBeDefined();
    const defaultDefinitions = getTemplateParameterDefinitions(template!).map((definition) => ({
      ...definition,
      ...resolveDeviceParameterDefinitionExportSettings(template!.kind, template!.params, definition)
    }));
    snapshot.deviceLibrary.deviceDefinitionOverrides[template!.kind] = {
      kind: template!.kind,
      size: { width: template!.size.width + 8, height: template!.size.height + 4 },
      parameterDefinitions: defaultDefinitions
    };

    const inventory = buildUserCustomizationInventory(snapshot, DEVICE_LIBRARY);

    expect(inventory.countsByDomain["device-definition-overrides"]).toBe(1);
    expect(inventory.countsByDomain["parameter-definitions"]).toBe(0);
    expect(inventory.countsByDomain["e-interface-definitions"]).toBe(0);
    expect(inventory.summary.total).toBe(1);
  });

  test("still reports genuine built-in parameter and E-interface changes", () => {
    const snapshot = defaultSnapshot();
    const template = DEVICE_LIBRARY.find((item) => item.kind === "ac-source");
    expect(template).toBeDefined();
    const defaultDefinitions = getTemplateParameterDefinitions(template!).map((definition) => ({
      ...definition,
      ...resolveDeviceParameterDefinitionExportSettings(template!.kind, template!.params, definition)
    }));
    const changedDefinitions = defaultDefinitions.map((definition) => definition.enName === "control_type"
      ? {
          ...definition,
          typicalValue: definition.typicalValue === "PQ" ? "PV" : "PQ",
          exportEnabled: !definition.exportEnabled,
          exportName: definition.exportEnabled ? "" : definition.enName
        }
      : definition);
    snapshot.deviceLibrary.deviceDefinitionOverrides[template!.kind] = {
      kind: template!.kind,
      parameterDefinitions: changedDefinitions
    };

    const inventory = buildUserCustomizationInventory(snapshot, DEVICE_LIBRARY);

    expect(inventory.countsByDomain["parameter-definitions"]).toBe(1);
    expect(inventory.countsByDomain["e-interface-definitions"]).toBe(1);
  });

  test("reports and restores a customized E interface field order", () => {
    const snapshot = defaultSnapshot();
    snapshot.deviceLibrary.eDeviceDefinitionFieldOrder = {
      ACGenerator: ["name", "idx", "dev_type"]
    };

    const inventory = buildUserCustomizationInventory(snapshot, DEVICE_LIBRARY);
    const restored = restoreUserCustomizationItems(snapshot, ["e-interface-definitions:ACGenerator"]);

    expect(inventory.countsByDomain["e-interface-definitions"]).toBe(1);
    expect(restored.deviceLibrary.eDeviceDefinitionFieldOrder?.ACGenerator).toBeUndefined();
  });

  test("normalizes missing and malformed image data while retaining the first duplicate", () => {
    const normalized = normalizeUserCustomizationSnapshot({
      imageLibrary: {
        folders: [
          { id: "", name: "" },
          { id: "custom", name: "自定义" },
          { id: "custom", name: "覆盖名称" },
          { id: "builtin-shared-icons", name: "内置" }
        ],
        assets: [
          { id: "", name: "空", folderId: "custom", url: "" },
          { id: "img-1", name: "旧", folderId: "missing", url: "" },
          { id: "builtin-shared-icon-test", name: "内置", folderId: "custom", url: "x" },
          { id: "img-1", name: "新", folderId: "custom", url: "/custom/img-1" }
        ]
      }
    });

    expect(normalized.imageLibrary.folders).toEqual([
      { id: "root", name: "默认文件夹" },
      { id: "custom", name: "自定义" }
    ]);
    expect(normalized.imageLibrary.assets).toEqual([{
      id: "img-1",
      name: "新",
      folderId: "custom",
      url: "/custom/img-1"
    }]);
  });

  test("normalizes malformed snapshot domains to defaults", () => {
    const normalized = normalizeUserCustomizationSnapshot({
      deviceLibrary: undefined,
      measurementConfig: undefined,
      colorConfig: { colorDisplayMode: "invalid" as never, colorPalette: undefined as never },
      imageLibrary: { folders: "bad" as never, assets: "bad" as never }
    });

    expect(normalized.deviceLibrary.customDeviceTemplates).toEqual([]);
    expect(normalized.measurementConfig.measurementTypes.length).toBeGreaterThan(0);
    expect(normalized.colorConfig.colorDisplayMode).toBe("energy");
    expect(normalized.imageLibrary).toEqual({ folders: [{ id: "root", name: "默认文件夹" }], assets: [] });
  });
});

describe("user customization merge and restore", () => {
  test("incremental import overwrites same IDs, adds new IDs and keeps local-only IDs", () => {
    const current = defaultSnapshot();
    current.deviceLibrary.customDeviceTemplates = [
      customTemplate("local", "本地"),
      customTemplate("same", "旧名称")
    ];
    const imported = defaultSnapshot();
    imported.deviceLibrary.customDeviceTemplates = [
      customTemplate("same", "新名称"),
      customTemplate("new", "新增")
    ];

    const merged = mergeUserCustomizationSnapshots(current, imported, "incremental");

    expect(merged.deviceLibrary.customDeviceTemplates.map((item) => [item.kind, item.label])).toEqual([
      ["local", "本地"],
      ["same", "新名称"],
      ["new", "新增"]
    ]);
  });

  test("replacement import leaves domains absent from a legacy package unchanged", () => {
    const current = defaultSnapshot();
    current.colorConfig.colorPalette.energy.ac = "#123456";

    const replaced = mergeUserCustomizationSnapshots(current, {
      deviceLibrary: emptyUserDeviceLibrary()
    }, "replace");

    expect(replaced.colorConfig.colorPalette.energy.ac).toBe("#123456");
  });

  test("migrates legacy custom business tables to the shared class during snapshot normalization", () => {
    const legacyTemplate = {
      ...customTemplate("custom-source-horizontal", "自定义电源"),
      params: {
        component_type: "CustomSource",
        custom_field: "12",
        backgroundImage: "custom-source.svg"
      },
      parameterDefinitions: [{
        cnName: "自定义字段",
        enName: "custom_field",
        valueType: "float" as const,
        typicalValue: "12"
      }],
      measurementDefinitions: [{
        measurementTypeId: "activePower",
        associatedField: "custom_field"
      }]
    };

    const normalized = normalizeUserCustomizationSnapshot({
      ...defaultSnapshot(),
      deviceLibrary: {
        ...emptyUserDeviceLibrary(),
        customDeviceTemplates: [legacyTemplate]
      }
    });
    const concrete = normalized.deviceLibrary.customDeviceTemplates[0];
    const sharedKey = deviceDefinitionSharedKeyForTemplate(legacyTemplate);
    const shared = normalized.deviceLibrary.deviceDefinitionOverrides[sharedKey];
    const templates = [...DEVICE_LIBRARY, ...normalized.deviceLibrary.customDeviceTemplates];
    const effective = applyDeviceTemplateDefinitionOverride(
      concrete,
      deviceDefinitionOverrideForTemplate(
        concrete,
        normalized.deviceLibrary.deviceDefinitionOverrides,
        templates
      )
    );

    expect(concrete.parameterDefinitions).toBeUndefined();
    expect(concrete.measurementDefinitions).toBeUndefined();
    expect(concrete.params.custom_field).toBeUndefined();
    expect(concrete.params.backgroundImage).toContain("custom-source.svg");
    expect(shared.parameterDefinitions?.map((definition) => definition.enName)).toEqual(["custom_field"]);
    expect(shared.measurementDefinitions).toEqual([{
      measurementTypeId: "activePower",
      associatedField: "custom_field"
    }]);
    expect(shared.params?.custom_field).toBe("12");
    expect(effective.parameterDefinitions?.map((definition) => definition.enName)).toEqual(["custom_field"]);
    expect(effective.measurementDefinitions).toEqual(shared.measurementDefinitions);
  });

  test("same-name different-ID rows are conflicts and imported content wins", () => {
    const current = defaultSnapshot();
    current.deviceLibrary.customDeviceTemplates = [customTemplate("old-id", "重复名称")];
    const imported = defaultSnapshot();
    imported.deviceLibrary.customDeviceTemplates = [customTemplate("new-id", "重复名称")];

    const preview = previewUserCustomizationImport(current, imported, "incremental");

    expect(preview.conflicts).toEqual([expect.objectContaining({
      domain: "custom-devices",
      localId: "old-id",
      importedId: "new-id"
    })]);
    expect(preview.target.deviceLibrary.customDeviceTemplates.map((item) => item.kind)).toEqual(["new-id"]);
  });

  test("preview replacement keeps absent legacy domains and counts removals as updates", () => {
    const current = defaultSnapshot();
    current.deviceLibrary.customDeviceTemplates = [customTemplate("local", "本地")];
    current.colorConfig.colorDisplayMode = "voltage";

    const preview = previewUserCustomizationImport(current, { deviceLibrary: emptyUserDeviceLibrary() }, "replace");

    expect(preview.mode).toBe("replace");
    expect(preview.target.colorConfig.colorDisplayMode).toBe("voltage");
    expect(preview.target.deviceLibrary.customDeviceTemplates).toEqual([]);
    expect(preview.additions).toBe(0);
    expect(preview.updates).toBeGreaterThan(0);
    expect(preview.unchanged).toBeGreaterThan(0);
  });

  test("incremental merge preserves omitted domains and merges folders and assets by IDs", () => {
    const current = defaultSnapshot();
    current.imageLibrary = {
      folders: [{ id: "root", name: "默认文件夹" }, { id: "local", name: "本地" }],
      assets: [{ id: "same", name: "旧", folderId: "local", url: "/old" }]
    };
    current.colorConfig.colorPalette.energy.ac = "#123456";
    const imported = {
      imageLibrary: {
        folders: [{ id: "local", name: "导入" }, { id: "new", name: "新增" }],
        assets: [{ id: "same", name: "新", folderId: "new", url: "/new" }, { id: "new", name: "新增", folderId: "new", url: "/new-asset" }]
      }
    };

    const merged = mergeUserCustomizationSnapshots(current, imported, "incremental");

    expect(merged.colorConfig.colorPalette.energy.ac).toBe("#123456");
    expect(merged.imageLibrary.folders.map((folder) => folder.id)).toEqual(["root", "local", "new"]);
    expect(merged.imageLibrary.assets.map((asset) => [asset.id, asset.name])).toEqual([["same", "新"], ["new", "新增"]]);
  });

  test("restoring a custom device removes its dependent override, profile and E metadata", () => {
    const snapshot = defaultSnapshot();
    snapshot.deviceLibrary.customDeviceTemplates = [customTemplate("custom-source", "自定义电源")];
    snapshot.deviceLibrary.deviceDefinitionOverrides["custom-source"] = {
      kind: "custom-source",
      size: { width: 90, height: 50 }
    };
    snapshot.deviceLibrary.eDeviceDefinitionLabels = { "custom-source": "CustomSource" };
    snapshot.deviceLibrary.eDeviceDefinitionClassExportEnabled = { "custom-source": true };
    snapshot.deviceLibrary.eDeviceDefinitionFieldOrder = { "custom-source": ["name", "idx"] };
    snapshot.measurementConfig.deviceProfiles.push({ deviceKind: "custom-source", items: [] });

    const restored = restoreUserCustomizationItems(snapshot, ["custom-devices:custom-source"]);

    expect(restored.deviceLibrary.customDeviceTemplates).toEqual([]);
    expect(restored.deviceLibrary.deviceDefinitionOverrides["custom-source"]).toBeUndefined();
    expect(restored.deviceLibrary.eDeviceDefinitionLabels?.["custom-source"]).toBeUndefined();
    expect(restored.deviceLibrary.eDeviceDefinitionClassExportEnabled?.["custom-source"]).toBeUndefined();
    expect(restored.deviceLibrary.eDeviceDefinitionFieldOrder?.["custom-source"]).toBeUndefined();
    expect(restored.measurementConfig.deviceProfiles.some((profile) => profile.deviceKind === "custom-source")).toBe(false);
  });

  test("restoring every custom graphic still keeps the shared class definitions", () => {
    const horizontal = customTemplate("custom-source-horizontal", "自定义电源-横向");
    const vertical = customTemplate("custom-source-vertical", "自定义电源-纵向");
    const snapshot = normalizeUserCustomizationSnapshot({
      ...defaultSnapshot(),
      deviceLibrary: {
        ...emptyUserDeviceLibrary(),
        customDeviceTemplates: [horizontal, vertical],
        deviceDefinitionOverrides: {
          [horizontal.kind]: {
            kind: horizontal.kind,
            parameterDefinitions: [{
              cnName: "自定义字段",
              enName: "custom_field",
              valueType: "float",
              typicalValue: "12"
            }]
          }
        }
      }
    });
    const sharedKey = deviceDefinitionSharedKeyForTemplate(horizontal);

    const afterFirstRemoval = restoreUserCustomizationItems(snapshot, [`custom-devices:${horizontal.kind}`]);
    const afterFinalRemoval = restoreUserCustomizationItems(afterFirstRemoval, [`custom-devices:${vertical.kind}`]);

    expect(afterFirstRemoval.deviceLibrary.deviceDefinitionOverrides[sharedKey]?.parameterDefinitions).toHaveLength(1);
    expect(afterFinalRemoval.deviceLibrary.deviceDefinitionOverrides[sharedKey]?.parameterDefinitions).toHaveLength(1);
    expect(afterFinalRemoval.deviceLibrary.customDeviceTemplates).toEqual([]);
  });

  test("restoring parameter definitions keeps unrelated visual overrides", () => {
    const snapshot = defaultSnapshot();
    snapshot.deviceLibrary.deviceDefinitionOverrides["ac-source"] = {
      kind: "ac-source",
      size: { width: 96, height: 56 },
      parameterDefinitions: [{
        cnName: "自定义字段",
        enName: "custom_field",
        valueType: "string",
        typicalValue: ""
      }]
    };

    const restored = restoreUserCustomizationItems(snapshot, ["parameter-definitions:ac-source"]);

    expect(restored.deviceLibrary.deviceDefinitionOverrides["ac-source"]).toMatchObject({
      kind: "ac-source",
      size: { width: 96, height: 56 }
    });
    expect(restored.deviceLibrary.deviceDefinitionOverrides["ac-source"].parameterDefinitions).toBeUndefined();
    const acSource = DEVICE_LIBRARY.find((template) => template.kind === "ac-source")!;
    expect(restored.deviceLibrary.deviceDefinitionOverrides[
      deviceDefinitionSharedKeyForTemplate(acSource)
    ]?.parameterDefinitions).toBeUndefined();
  });

  test("restores measurement definitions, graph templates, assets and colors", () => {
    const snapshot = defaultSnapshot();
    const customType = {
      ...snapshot.measurementConfig.measurementTypes[0],
      id: "custom-type",
      name: "自定义量测"
    };
    snapshot.measurementConfig.measurementTypes.push(customType);
    snapshot.measurementConfig.deviceProfiles.push({ deviceKind: "custom-kind", items: [] });
    snapshot.measurementConfig.groupDefaults.borderWidth = 4;
    snapshot.deviceLibrary.deviceDefinitionOverrides["ac-source"] = {
      kind: "ac-source",
      measurementDefinitions: [{ measurementTypeId: "activePower", associatedField: "custom" }]
    };
    snapshot.deviceLibrary.customGraphTemplateTypes = ["用户模板"];
    snapshot.deviceLibrary.customGraphTemplates = [{
      id: "tpl-1",
      typeName: "用户模板",
      name: "组合",
      sourceSize: { width: 1, height: 1 },
      clipboard: { nodes: [], edges: [], groups: [] },
      createdAt: "now",
      updatedAt: "now"
    }];
    snapshot.imageLibrary.assets.push({ id: "asset-1", name: "图片", folderId: "root", url: "/asset" });
    snapshot.colorConfig.colorDisplayMode = "voltage";

    const restored = restoreUserCustomizationItems(snapshot, [
      "measurement-definitions:type:custom-type",
      "measurement-definitions:profile:custom-kind",
      "measurement-definitions:group-defaults",
      "measurement-definitions:definition:ac-source",
      "graph-templates:type:用户模板",
      "graph-templates:template:tpl-1",
      "user-assets:asset-1",
      "color-settings:palette"
    ]);

    expect(restored.measurementConfig.measurementTypes.some((type) => type.id === "custom-type")).toBe(false);
    expect(restored.measurementConfig.deviceProfiles.some((profile) => profile.deviceKind === "custom-kind")).toBe(false);
    expect(restored.measurementConfig.groupDefaults).toEqual(DEFAULT_MEASUREMENT_CONFIG.groupDefaults);
    expect(restored.deviceLibrary.deviceDefinitionOverrides["ac-source"]?.measurementDefinitions).toBeUndefined();
    expect(restored.deviceLibrary.customGraphTemplateTypes).toEqual([]);
    expect(restored.deviceLibrary.customGraphTemplates).toEqual([]);
    expect(restored.imageLibrary.assets).toEqual([]);
    expect(restored.colorConfig.colorDisplayMode).toBe("energy");
  });

  test("restores built-in measurement and profile items from defaults", () => {
    const snapshot = defaultSnapshot();
    snapshot.measurementConfig.measurementTypes = snapshot.measurementConfig.measurementTypes.filter((type) => type.id !== "activePower");
    snapshot.measurementConfig.deviceProfiles = snapshot.measurementConfig.deviceProfiles.filter((profile) => profile.deviceKind !== "ac-source");

    const restored = restoreUserCustomizationItems(snapshot, [
      "measurement-definitions:type:activePower",
      "measurement-definitions:profile:ac-source"
    ]);

    expect(restored.measurementConfig.measurementTypes.some((type) => type.id === "activePower")).toBe(true);
    expect(restored.measurementConfig.deviceProfiles.some((profile) => profile.deviceKind === "ac-source")).toBe(true);
  });

  test("ignores malformed and unknown restore keys", () => {
    const snapshot = defaultSnapshot();
    const restored = restoreUserCustomizationItems(snapshot, [
      "not-a-key",
      "unknown-domain:item",
      "measurement-definitions:%E0%A4%A",
      "graph-templates:unknown:item",
      "user-assets:missing"
    ]);

    expect(restored).toEqual(snapshot);
  });
});

describe("user customization safety helpers", () => {
  test("rolls back the retained snapshot after an apply failure", async () => {
    const events: string[] = [];
    const apply = vi.fn(async () => {
      events.push("apply");
      throw new Error("write failed");
    });
    const rollback = vi.fn(async () => {
      events.push("rollback");
    });

    await expect(runUserCustomizationTransaction({
      before: defaultSnapshot(),
      target: defaultSnapshot(),
      apply,
      rollback
    })).rejects.toThrow("write failed");

    expect(events).toEqual(["apply", "rollback"]);
  });

  test("reports both the write and rollback failure", async () => {
    await expect(runUserCustomizationTransaction({
      before: defaultSnapshot(),
      target: defaultSnapshot(),
      apply: async () => { throw new Error("write failed"); },
      rollback: async () => { throw new Error("rollback failed"); }
    })).rejects.toThrow("write failed；自动回滚失败：rollback failed");
  });

  test("collects referenced asset IDs recursively", () => {
    const references = collectReferencedUserAssetIds({
      nodes: [{ params: { backgroundImageAssetId: "img-background" } }],
      nested: { foregroundImageAssetId: "img-foreground" },
      unrelated: "img-not-an-asset-reference"
    });

    expect(references).toEqual(new Set(["img-background", "img-foreground"]));
  });

  test("leaves an orphaned drawn device untouched", () => {
    const orphan = {
      id: "orphan-1",
      kind: "removed-custom-kind",
      name: "已删除定义的设备",
      position: { x: 0, y: 0 },
      size: { width: 80, height: 48 },
      params: {},
      terminals: [],
      nodeNumber: "N-orphan",
      acTopologyNode: "",
      dcTopologyNode: "",
      rotation: 0,
      scale: 1
    } as unknown as ModelNode;

    const result = reconcileNodesAfterCustomizationChange([orphan], new Map(), new Map());

    expect(result.nodes[0]).toBe(orphan);
    expect(result.changed).toBe(false);
  });

  test("reconciles existing nodes when a customization changes its definition", () => {
    const previous = {
      ...customTemplate("custom-kind", "旧定义"),
      parameterDefinitions: [{ cnName: "功率", enName: "power", valueType: "float" as const, typicalValue: "1" }]
    };
    const next = {
      ...previous,
      label: "新定义",
      size: { width: 96, height: 60 },
      terminalCount: 2,
      parameterDefinitions: [{ cnName: "功率", enName: "power", valueType: "float" as const, typicalValue: "2" }]
    };
    const node = {
      id: "node-1",
      kind: "custom-kind",
      name: "自定义设备",
      position: { x: 0, y: 0 },
      size: { width: 80, height: 48 },
      params: { power: "1" },
      terminals: [{ id: "t1", label: "交流端1", type: "ac", anchor: { x: 0.5, y: 0 }, nodeNumber: "N1" }],
      nodeNumber: "N1",
      acTopologyNode: 0,
      dcTopologyNode: 0,
      rotation: 0,
      scale: 1
    } as unknown as ModelNode;

    const result = reconcileNodesAfterCustomizationChange(
      [node],
      new Map([[previous.kind, previous]]),
      new Map([[next.kind, next]])
    );

    expect(result.changed).toBe(true);
    expect(result.nodes[0]).not.toBe(node);
    expect(result.nodes[0].size).toEqual({ width: 96, height: 60 });
    expect(result.nodes[0].terminals).toHaveLength(2);
  });
});

// ── cloneValue / canonicalValue 的现状契约 ─────────────────────────────────
//
// 两个函数都是 userCustomizations.ts 的模块私有实现（没有 export），按约定不加进公开
// API，所以这里分两条路径驱动：
//
// ① cloneValue —— 走真实导出入口 normalizeUserCustomizationSnapshot：其内部的
//    normalizeUserImageLibrary 会执行 `{ ...cloneValue(asset), id, name, folderId, url }`，
//    克隆出的嵌套引用在产物上直接可见。兜底分支是在每次调用时读
//    `typeof structuredClone`，所以测试里临时把 globalThis.structuredClone 置空即可切过去。
//
// ② canonicalValue / canonicalJson —— 无法从任何导出入口观察到「键序无关」：每个到达
//    canonicalEqual 的值都先被上游 normalizer 用字面量重建成了固定键序
//    （normalizeMeasurementConfig / normalizeColorPalette /
//    normalizeDeviceMeasurementDefinitions 都丢弃多余键）。所以这里从源码切出那段自包含
//    声明、转译后在沙箱里求值 —— 跑的是真实交付的代码，不是测试里的一份复刻。切分失败
//    直接抛错，不会静默通过。
const userCustomizationsSource = readFileSync(
  new URL("./userCustomizations.ts", import.meta.url),
  "utf8"
);

const privateHelperBlock = () => {
  const start = userCustomizationsSource.indexOf("const cloneValue");
  const end = userCustomizationsSource.indexOf("const uniqueStrings");
  if (start < 0 || end <= start) {
    throw new Error("未能在 userCustomizations.ts 中定位 cloneValue 到 canonicalEqual 之间的声明块");
  }
  const block = userCustomizationsSource.slice(start, end);
  ["const canonicalValue", "const canonicalJson", "const canonicalEqual", "localeCompare"].forEach((marker) => {
    if (!block.includes(marker)) {
      throw new Error(`切出的私有声明块缺少标记：${marker}`);
    }
  });
  return block;
};

type CanonicalHelpers = {
  canonicalValue: (value: unknown) => unknown;
  // 运行时对 undefined 输入返回的是 undefined 本身（JSON.stringify 的原样透传），
  // 生产里被 canonicalEqual 的 === 比较吃掉，这里如实建模，不谎称它返回字符串。
  canonicalJson: (value: unknown) => string | undefined;
  canonicalEqual: (left: unknown, right: unknown) => boolean;
};

const canonicalHelpers = (): CanonicalHelpers => {
  const js = ts.transpileModule(privateHelperBlock(), {
    compilerOptions: { target: ts.ScriptTarget.ES2022 }
  }).outputText;
  return new Function(`${js}\nreturn { canonicalValue, canonicalJson, canonicalEqual };`)() as CanonicalHelpers;
};

// 经导出入口 normalizeUserCustomizationSnapshot 触达 cloneValue。
const normalizeAssetThroughClone = (asset: Record<string, unknown>) => normalizeUserCustomizationSnapshot({
  imageLibrary: { folders: [], assets: [asset] }
} as unknown as Partial<UserCustomizationSnapshot>).imageLibrary.assets[0] as unknown as Record<string, unknown>;

const probeAsset = (extras: Record<string, unknown>): Record<string, unknown> => ({
  id: "img-probe",
  name: "探针图片",
  folderId: "root",
  url: "/probe",
  ...extras
});

const withStructuredCloneMissing = <T,>(run: () => T): T => {
  const global = globalThis as unknown as { structuredClone: unknown };
  const original = global.structuredClone;
  try {
    global.structuredClone = undefined;
    return run();
  } finally {
    global.structuredClone = original;
  }
};

describe("user customization cloneValue and canonicalValue contracts", () => {
  test("cloneValue main path deep copies nested structures without sharing references", () => {
    const meta = { inner: { n: 1 }, list: [1, [2, { deep: true }]] };
    const input = probeAsset({ meta });

    const cloned = normalizeAssetThroughClone(input);
    const clonedMeta = cloned.meta as { inner: { n: number }; list: unknown[] };

    expect(clonedMeta).toEqual(meta);
    expect(clonedMeta).not.toBe(meta);
    expect(clonedMeta.inner).not.toBe(meta.inner);
    expect(clonedMeta.list).not.toBe(meta.list);
    expect(clonedMeta.list[1]).not.toBe(meta.list[1]);

    clonedMeta.inner.n = 999;
    expect(meta.inner.n).toBe(1);
  });

  test("cloneValue main path preserves Date, Map, Set and undefined-valued keys", () => {
    const cloned = normalizeAssetThroughClone(probeAsset({
      stamp: new Date("2020-05-06T07:08:09.010Z"),
      lookup: new Map([["k", 1]]),
      tags: new Set([1, 2]),
      gone: undefined
    }));

    expect(cloned.stamp).toBeInstanceOf(Date);
    expect((cloned.stamp as Date).toISOString()).toBe("2020-05-06T07:08:09.010Z");
    expect(cloned.lookup).toBeInstanceOf(Map);
    expect((cloned.lookup as Map<string, number>).get("k")).toBe(1);
    expect(cloned.tags).toBeInstanceOf(Set);
    expect([...(cloned.tags as Set<number>)]).toEqual([1, 2]);
    expect(Object.prototype.hasOwnProperty.call(cloned, "gone")).toBe(true);
    expect(cloned.gone).toBeUndefined();
  });

  test("cloneValue main path keeps cycles and rebinds them onto the copy", () => {
    const input = probeAsset({});
    input.self = input;

    const cloned = normalizeAssetThroughClone(input);
    const clonedSelf = cloned.self as Record<string, unknown>;

    // 产物是 `{ ...cloneValue(asset), id, name, folderId, url }`，所以自引用指向的是
    // cloneValue 造出来的那个副本，既不是展开后的产物，也绝不是原对象。
    expect(clonedSelf).not.toBe(input);
    expect(clonedSelf.self).toBe(clonedSelf);
  });

  // 下面四条钉的是 cloneValue 兜底路径当前真实发生的事：三条是真实的数据丢失，
  // 一条是直接抛错。若将来修 cloneValue（换成结构化深拷贝、或换个降级实现），
  // 本组用例会红 —— 那是提示该同步更新断言，不是断言写错了。
  test("cloneValue fallback drops keys whose value is undefined", () => {
    const cloned = withStructuredCloneMissing(() => normalizeAssetThroughClone(probeAsset({
      gone: undefined,
      keptNull: null
    })));

    expect(Object.prototype.hasOwnProperty.call(cloned, "gone")).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(cloned, "keptNull")).toBe(true);
    expect(cloned.keptNull).toBeNull();
  });

  test("cloneValue fallback degrades a Date into an ISO string", () => {
    const cloned = withStructuredCloneMissing(() => normalizeAssetThroughClone(probeAsset({
      stamp: new Date("2020-05-06T07:08:09.010Z")
    })));

    expect(cloned.stamp).not.toBeInstanceOf(Date);
    expect(typeof cloned.stamp).toBe("string");
    expect(cloned.stamp).toBe("2020-05-06T07:08:09.010Z");
  });

  test("cloneValue fallback degrades Map and Set into empty objects", () => {
    const cloned = withStructuredCloneMissing(() => normalizeAssetThroughClone(probeAsset({
      lookup: new Map([["k", 1]]),
      tags: new Set([1, 2])
    })));

    expect(cloned.lookup).not.toBeInstanceOf(Map);
    expect(cloned.tags).not.toBeInstanceOf(Set);
    expect(cloned.lookup).toEqual({});
    expect(cloned.tags).toEqual({});
  });

  test("cloneValue fallback throws on cyclic input while the main path accepts it", () => {
    const input = probeAsset({});
    input.self = input;

    // 只断言 TypeError 是不够的：把兜底换成 `structuredClone(value)` 时，调用不存在的
    // 全局同样抛 TypeError，这条用例会假绿。必须断言消息确实来自 JSON.stringify 撞环。
    expect(() => withStructuredCloneMissing(() => normalizeAssetThroughClone(input)))
      .toThrow(/circular structure to JSON/i);
    expect(() => normalizeAssetThroughClone(input)).not.toThrow();
  });

  test("canonicalValue output is independent of object key order", () => {
    const { canonicalValue, canonicalJson, canonicalEqual } = canonicalHelpers();

    expect(Object.keys(canonicalValue({ b: 2, a: 1 }) as object)).toEqual(["a", "b"]);
    expect(canonicalJson({ a: 1, b: 2 })).toBe(`{"a":1,"b":2}`);
    expect(canonicalJson({ b: 2, a: 1 })).toBe(`{"a":1,"b":2}`);
    expect(canonicalJson({ c: 3, a: 1, b: 2 })).toBe(`{"a":1,"b":2,"c":3}`);
    expect(canonicalEqual({ a: 1, b: 2 }, { b: 2, a: 1 })).toBe(true);
  });

  test("canonicalValue stays key order independent when nested and keeps array order", () => {
    const { canonicalValue, canonicalJson, canonicalEqual } = canonicalHelpers();
    const left = { outer: { b: 2, a: 1 }, list: [3, 1, 2] };
    const right = { list: [3, 1, 2], outer: { a: 1, b: 2 } };

    expect(Object.keys(canonicalValue(left) as object)).toEqual(["list", "outer"]);
    expect(Object.keys((canonicalValue(left) as { outer: object }).outer)).toEqual(["a", "b"]);
    expect(canonicalJson(left)).toBe(`{"list":[3,1,2],"outer":{"a":1,"b":2}}`);
    expect(canonicalJson(left)).toBe(canonicalJson(right));
    expect(canonicalEqual(left, right)).toBe(true);

    // 数组顺序有语义：数组分支先于对象分支命中，元素不会被排序抹掉。
    expect(canonicalJson([3, 1, 2])).toBe(`[3,1,2]`);
    expect(canonicalJson([1, 3, 2])).not.toBe(canonicalJson([3, 1, 2]));
    expect(canonicalEqual([1, 2], [2, 1])).toBe(false);
  });

  test("canonicalValue serializes every primitive into its actual form", () => {
    const { canonicalJson, canonicalEqual } = canonicalHelpers();

    // 顶层 undefined 不是字符串 undefined —— JSON.stringify 对它返回 undefined 本身。
    expect(canonicalJson(undefined)).toBeUndefined();
    expect(canonicalJson(null)).toBe("null");
    expect(canonicalJson(0)).toBe("0");
    expect(canonicalJson(1.5)).toBe("1.5");
    expect(canonicalJson(true)).toBe("true");
    expect(canonicalJson(false)).toBe("false");
    expect(canonicalJson("x")).toBe(`"x"`);
    expect(canonicalJson("")).toBe(`""`);

    // 对象里的 undefined 值在 JSON.stringify 阶段被丢掉：与 cloneValue 兜底同一类数据丢失。
    expect(canonicalJson({ a: undefined })).toBe("{}");
    expect(canonicalJson({ a: null })).toBe(`{"a":null}`);
    expect(canonicalEqual({ a: undefined }, {})).toBe(true);

    // 两侧同为 undefined 时比较成立；undefined 与 null 不等价（null 序列化成字符串 null）。
    expect(canonicalEqual(undefined, undefined)).toBe(true);
    expect(canonicalEqual(undefined, null)).toBe(false);
    expect(canonicalEqual(null, undefined)).toBe(false);
  });

  test("array order stays significant through the exported inventory pipeline", () => {
    const baseline = buildUserCustomizationInventory(defaultSnapshot(), DEVICE_LIBRARY);
    expect(baseline.countsByDomain["measurement-definitions"]).toBe(0);

    const snapshot = defaultSnapshot();
    // 不能用 ac-line / dc-line：withRequiredBuiltInMeasurementProfileItems 会按内置必选项
    // 重排它们，用户给的顺序根本到不了 canonicalEqual（这个坑先踩过一次）。
    const sourceProfile = snapshot.measurementConfig.deviceProfiles
      .find((profile) => profile.deviceKind === "ac-source");
    expect(sourceProfile?.items.length ?? 0).toBeGreaterThan(1);
    snapshot.measurementConfig.deviceProfiles = snapshot.measurementConfig.deviceProfiles
      .map((profile) => (profile.deviceKind === "ac-source"
        ? { ...profile, items: [...profile.items].reverse() }
        : profile));

    const inventory = buildUserCustomizationInventory(snapshot, DEVICE_LIBRARY);

    // 比 key 更适合断言 itemId：key 走的是 customizationItemKey 的 encodeURIComponent，
    // 冒号会被编成 %3A。
    expect(inventory.items).toContainEqual(expect.objectContaining({
      domain: "measurement-definitions",
      itemId: "profile:ac-source",
      changeType: "modified"
    }));
    expect(inventory.countsByDomain["measurement-definitions"]).toBe(1);
  });

  test("the sliced private block really carries the sort and the array branch", () => {
    const block = privateHelperBlock();

    expect(block).toContain("Array.isArray(value)");
    expect(block).toContain("localeCompare");
    expect(block).toContain("Object.fromEntries");
  });
});

describe("user customization payload tolerance", () => {
  // 这组用例针对 normalizeUserImageLibrary / normalizeUserCustomizationSnapshot 里
  // 「上游 normalizer 不保证字段存在」的那几层兜底：既有测试的图片全部带 name，
  // 于是 `asset.name || asset.filename || id` 的后两级与文件夹名的 `: id` 分支从未被走过。
  test("falls back to the folder id and to the asset filename or id when names are missing", () => {
    const normalized = normalizeUserCustomizationSnapshot({
      imageLibrary: {
        folders: [{ id: "  Blank  ", name: "   " }, { id: "root", name: "我的根" }],
        assets: [
          { id: "img-file", filename: "photo.png", folderId: "Blank" },
          { id: "img-bare" }
        ]
      }
    } as never);

    // 名字全空白且 id 不是 root → 名字回落成 id（不是「默认文件夹」）。
    expect(normalized.imageLibrary.folders).toEqual([
      { id: "Blank", name: "Blank" },
      { id: "root", name: "我的根" }
    ]);
    // 第一条走 `|| asset.filename`，第二条两级都落空后走 `|| id`。
    expect(normalized.imageLibrary.assets.map((asset) => asset.name)).toEqual(["photo.png", "img-bare"]);
    // 第二条没有 folderId → 回落成 root，而不是留在空串上。
    expect(normalized.imageLibrary.assets.map((asset) => asset.folderId)).toEqual(["Blank", "root"]);
  });

  test("normalizes a completely absent snapshot into program defaults", () => {
    const normalized = normalizeUserCustomizationSnapshot(undefined);

    expect(normalized).toEqual(normalizeUserCustomizationSnapshot({}));
    expect(normalized.imageLibrary.folders).toEqual([{ id: "root", name: "默认文件夹" }]);
    expect(normalized.deviceLibrary.customDeviceTemplates).toEqual([]);
  });

  test("merges category libraries by trimmed key and drops blanks across both sides", () => {
    const current = defaultSnapshot();
    current.deviceLibrary.customCategoryLibraries = ["用户类别", "  用户类别  ", ""];

    const merged = mergeUserCustomizationSnapshots(current, {
      deviceLibrary: {
        ...emptyUserDeviceLibrary(),
        customCategoryLibraries: ["用户类别", "另一类"]
      }
    }, "incremental");

    // current 与 imported 各自的重复由上游 normalizer 收敛；跨两边的重复只有
    // uniqueStrings 的 seen 集合能收敛，所以这条断言断的是它。
    expect(merged.deviceLibrary.customCategoryLibraries).toEqual(["用户类别", "另一类"]);
  });

  // legacy 业务表里的参数定义以 params[CUSTOM_PARAM_DEFINITIONS_KEY] 存一段 JSON。
  // 三种坏输入都必须退化成「没有参数定义」，而有效数组必须仍然产出条目 ——
  // 没有这条对照，上面三条断言就是恒绿的（默认值恰好也是 0）。
  test("tolerates absent, non-array and malformed legacy parameter definition payloads", () => {
    const inventoryFor = (kind: string, raw?: string) => {
      const snapshot = defaultSnapshot();
      snapshot.deviceLibrary.deviceDefinitionOverrides[kind] = {
        kind,
        ...(raw === undefined ? {} : { params: { [CUSTOM_PARAM_DEFINITIONS_KEY]: raw } })
      } as never;
      return buildUserCustomizationInventory(snapshot, DEVICE_LIBRARY);
    };

    const control = inventoryFor("ghost-array", JSON.stringify([{
      cnName: "燃料",
      enName: "fuel",
      valueType: "string",
      typicalValue: "",
      exportName: "fuel_type"
    }]));
    expect(control.countsByDomain["parameter-definitions"]).toBe(1);
    expect(control.countsByDomain["e-interface-definitions"]).toBe(1);

    // 覆盖 259（raw 缺失）、262（JSON 不是数组）、263（JSON 解析失败）三个早退。
    const missing = inventoryFor("ghost-missing");
    const nonArray = inventoryFor("ghost-object", JSON.stringify({ enName: "fuel", exportName: "fuel_type" }));
    const malformed = inventoryFor("ghost-malformed", "{oops");
    for (const inventory of [missing, nonArray, malformed]) {
      expect(inventory.items).toEqual([]);
      expect(inventory.countsByDomain["parameter-definitions"]).toBe(0);
      expect(inventory.countsByDomain["e-interface-definitions"]).toBe(0);
    }
  });

  // 292/293 的三重判定：只有「intent 是 delete-all」+「数组」+「长度 0」三者同时成立
  // 才算显式删除。少了任何一条，definition 都会回落成内置的 27 项且与内置逐项相等，
  // 于是 parameter-definitions 与 e-interface-definitions 两域都是 0 条。
  test("reports an explicit delete-all intent while an empty array under another intent reports nothing", () => {
    const inventoryFor = (override: Record<string, unknown>) => {
      const snapshot = defaultSnapshot();
      snapshot.deviceLibrary.deviceDefinitionOverrides["ac-source"] = override as never;
      return buildUserCustomizationInventory(snapshot, DEVICE_LIBRARY);
    };

    const deletesAll = inventoryFor({
      kind: "ac-source",
      parameterDefinitions: [],
      parameterDefinitionsIntent: "delete-all"
    });
    expect(deletesAll.countsByDomain["parameter-definitions"]).toBe(1);
    expect(deletesAll.countsByDomain["e-interface-definitions"]).toBe(1);
    // changeType 是 "added" 而不是 "modified"：归一化后 kind 落到 shared:ACGenerator，
    // 内置表里没有这一项（builtInByKind.has(kind) 为 false），所以整体算新增。
    expect(deletesAll.items).toContainEqual(expect.objectContaining({
      domain: "parameter-definitions",
      itemId: "shared:ACGenerator",
      changeType: "added"
    }));

    const otherIntent = inventoryFor({
      kind: "ac-source",
      parameterDefinitions: [],
      parameterDefinitionsIntent: "full"
    });
    const missingArray = inventoryFor({
      kind: "ac-source",
      parameterDefinitionsIntent: "delete-all"
    });
    for (const inventory of [otherIntent, missingArray]) {
      expect(inventory.countsByDomain["parameter-definitions"]).toBe(0);
      expect(inventory.countsByDomain["e-interface-definitions"]).toBe(0);
    }
  });

  // ── 刻意不写用例的一处：userCustomizations.ts:270 的三元回落臂 ──
  //
  //   return effective.length > 0 ? effective : parameterDefinitionsFromParams(template.params);
  //
  // 它在当前调用图下是死代码，三条各自独立的理由（每条都用探针实测过，不是读代码猜的）：
  //  ① templateParameterDefinitions 只有两个调用方（行 440、行 480），传进去的都是
  //     `snapshot.deviceLibrary.customDeviceTemplates` —— 已经过 normalizeUserCustomizationSnapshot
  //     的模板。归一化链（normalizeCustomDeviceTemplates → applyComponentLibraryMetadataToCustomTemplates
  //     → normalizeDeviceDefinitionOwnership）实测结果：
  //       - parameterDefinitions / parameterDefinitionsIntent **被删掉**；
  //       - params 只留 concreteDeviceDefinitionParams 的白名单键，_customParamDefinitions 被剔除。
  //     于是 model.ts:8691 那条 delete-all 早退永远进不去（它要求这两个字段都在），
  //     而回落臂即便被调用，parameterDefinitionsFromParams 也会因 raw 缺失直接返回 []。
  //  ② effective 恒非空：finalizeTemplateParameterDefinitions(model.ts:8531) 无条件补一条 parent，
  //     除非 E 段是列数为 0 的 Static* 段才把 parent 过滤掉 —— 而落到 Static* 段必须靠
  //     params 里的 component_type，那个键自己又会生成一条定义。
  //     实测（normalizeUserCustomizationSnapshot 之后，getTemplateParameterDefinitions 的 enName）：
  //       static-point        → ["component_type"]     static-text-symbol → ["parent"]
  //       static-button       → ["component_type"]     普通自定义 kind     → ["parent", "component_type"]
  //       static-group-box    → ["component_type"]     legacy-fuel-cell    → ["parent"]
  //     没有一种 kind 产出 []。
  //  ③ 回落臂即使执行，返回值也只能是 []，产不出任何可观察差异 —— 写断言就是恒绿断言。
  //
  // 若哪天有人删掉 concreteDeviceTemplateForStorage 那层归一化（或把它挪到
  // projectDeviceLibraryPersistencePayloadForStorage 之外），这条分支会复活，
  // 那时应当补一条「params 里有 legacy JSON、effective 为空 → 仍报 N 项参数定义」的用例。
});
