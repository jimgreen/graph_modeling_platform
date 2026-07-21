import { describe, expect, test, vi } from "vitest";
import {
  DEFAULT_COLOR_PALETTE,
  DEVICE_LIBRARY,
  getTemplateParameterDefinitions,
  resolveDeviceParameterDefinitionExportSettings,
  type DeviceTemplate,
  type ModelNode
} from "./model";
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
    const changedDefinitions = defaultDefinitions.map((definition, index) => index === 0
      ? {
          ...definition,
          typicalValue: `${definition.typicalValue || "0"}-changed`,
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

  test("restoring a custom device removes its dependent override, profile and E metadata", () => {
    const snapshot = defaultSnapshot();
    snapshot.deviceLibrary.customDeviceTemplates = [customTemplate("custom-source", "自定义电源")];
    snapshot.deviceLibrary.deviceDefinitionOverrides["custom-source"] = {
      kind: "custom-source",
      size: { width: 90, height: 50 }
    };
    snapshot.deviceLibrary.eDeviceDefinitionLabels = { "custom-source": "CustomSource" };
    snapshot.deviceLibrary.eDeviceDefinitionClassExportEnabled = { "custom-source": true };
    snapshot.measurementConfig.deviceProfiles.push({ deviceKind: "custom-source", items: [] });

    const restored = restoreUserCustomizationItems(snapshot, ["custom-devices:custom-source"]);

    expect(restored.deviceLibrary.customDeviceTemplates).toEqual([]);
    expect(restored.deviceLibrary.deviceDefinitionOverrides["custom-source"]).toBeUndefined();
    expect(restored.deviceLibrary.eDeviceDefinitionLabels?.["custom-source"]).toBeUndefined();
    expect(restored.deviceLibrary.eDeviceDefinitionClassExportEnabled?.["custom-source"]).toBeUndefined();
    expect(restored.measurementConfig.deviceProfiles.some((profile) => profile.deviceKind === "custom-source")).toBe(false);
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
});
