# User Customization Manager Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a dedicated user-customization manager that inventories every effective customization, exports a portable full backup, imports with replacement or incremental merge, and restores selected or all customizations without deleting drawn model instances.

**Architecture:** Put normalization, inventory, merge, restore, conflict preview, and rollback orchestration in a new pure domain module. Extend the existing versioned library-package format with color configuration and a manifest while accepting version-1 files. Keep React state and persistence coordination in a focused factory module, and render the approved tree/table dialog through a dedicated component wired into the existing `App.tsx` and `appView.tsx` scope pattern.

**Tech Stack:** React 19, TypeScript, Vite, Vitest, existing JSON persistence APIs, existing image-library APIs, Lucide icons, CSS grid.

---

## File Structure

- Create `src/userCustomizations.ts`: pure snapshot, inventory, merge, restore, conflict-preview, asset-reference, and transaction helpers.
- Create `src/userCustomizations.test.ts`: unit coverage for every pure customization rule.
- Create `src/appExtracted/appUserCustomizationFactories.tsx`: application handlers that capture snapshots, persist them, roll back failures, reconcile the open model, and expose dialog commands.
- Create `src/appUserCustomizationFactories.test.ts`: mocked persistence and rollback tests for the application handlers.
- Create `src/UserCustomizationManagerDialog.tsx`: focused tree/table dialog and import-preview UI.
- Create `src/UserCustomizationManagerDialog.test.tsx`: server-rendered UI contract tests.
- Modify `src/appExtracted/appPersistenceLibraryExport.tsx`: package version 2, color section, manifest section, and version-1 compatibility.
- Modify `src/appPersistenceLibraryExport.test.ts`: package and integration contract tests.
- Modify `src/App.tsx`: dialog state, factory wiring, derived inventory, hidden file input, and component-library toolbar entry.
- Modify `src/appExtracted/appView.tsx`: render the new dialog and hidden import input at the application overlay level.
- Modify `src/styles.css`: responsive manager, tree, table, preview, progress, and confirmation styling.

## Task 1: Snapshot And Inventory Domain

**Files:**
- Create: `src/userCustomizations.ts`
- Create: `src/userCustomizations.test.ts`

- [ ] **Step 1: Write failing inventory tests**

Create fixtures for an empty snapshot and a snapshot containing all supported domains. Assert that defaults produce zero rows and custom content produces stable rows and counts.

```ts
import { describe, expect, test } from "vitest";
import { DEFAULT_COLOR_PALETTE, DEVICE_LIBRARY } from "./model";
import { DEFAULT_MEASUREMENT_CONFIG } from "./measurements";
import {
  buildUserCustomizationInventory,
  emptyUserDeviceLibrary,
  type UserCustomizationSnapshot
} from "./userCustomizations";

const defaultSnapshot = (): UserCustomizationSnapshot => ({
  deviceLibrary: emptyUserDeviceLibrary(),
  measurementConfig: structuredClone(DEFAULT_MEASUREMENT_CONFIG),
  colorConfig: { colorDisplayMode: "energy", colorPalette: structuredClone(DEFAULT_COLOR_PALETTE) },
  imageLibrary: { folders: [{ id: "root", name: "默认文件夹" }], assets: [] }
});

test("reports no customization rows for program defaults", () => {
  const inventory = buildUserCustomizationInventory(defaultSnapshot(), DEVICE_LIBRARY);
  expect(inventory.items).toEqual([]);
  expect(inventory.summary.total).toBe(0);
});

test("classifies device, measurement, template, asset, E interface and color changes", () => {
  const snapshot = defaultSnapshot();
  snapshot.deviceLibrary.customCategoryLibraries = ["用户类别"] as any;
  snapshot.deviceLibrary.customDeviceTemplates = [{
    kind: "custom-source",
    label: "自定义电源",
    categoryLibrary: "用户类别",
    size: { width: 80, height: 48 },
    params: { component_type: "CustomSource" },
    terminalType: "ac",
    terminalCount: 1,
    custom: true,
    parameterDefinitions: [{ id: "fuel", cnName: "燃料", enName: "fuel", valueType: "string", typicalValue: "" }]
  }] as any;
  snapshot.deviceLibrary.eDeviceDefinitionLabels = { "custom-source": "CustomSourceExport" };
  snapshot.deviceLibrary.customGraphTemplateTypes = ["用户模板"];
  snapshot.deviceLibrary.customGraphTemplates = [{ id: "tpl-1", typeName: "用户模板", name: "组合", sourceSize: { width: 1, height: 1 }, clipboard: { nodes: [], edges: [], groups: [] }, createdAt: "x", updatedAt: "x" }] as any;
  snapshot.measurementConfig.measurementTypes.push({ ...snapshot.measurementConfig.measurementTypes[0], id: "customPower", name: "自定义功率" });
  snapshot.imageLibrary.assets.push({ id: "img-user", name: "用户图标", folderId: "root", url: "/api/images/img-user" } as any);
  snapshot.colorConfig.colorPalette.energy.ac = "#123456";

  const inventory = buildUserCustomizationInventory(snapshot, DEVICE_LIBRARY);

  expect(inventory.items.map((item) => item.domain)).toEqual(expect.arrayContaining([
    "category-libraries",
    "custom-devices",
    "parameter-definitions",
    "measurement-definitions",
    "e-interface-definitions",
    "graph-templates",
    "user-assets",
    "color-settings"
  ]));
  expect(inventory.summary.total).toBe(inventory.items.length);
});
```

- [ ] **Step 2: Run the tests and verify failure**

Run: `npm test -- src/userCustomizations.test.ts`

Expected: FAIL because `src/userCustomizations.ts` does not exist.

- [ ] **Step 3: Implement snapshot and inventory types**

Create the module with explicit domain identifiers and stable item keys.

```ts
import type { DeviceLibraryPersistencePayload, ImageAsset, ImageFolder } from "./appExtracted/appCoreCanvasUtilities";
import type { ColorDisplayMode, ColorPalette, DeviceTemplate } from "./model";
import { CUSTOM_PARAM_DEFINITIONS_KEY, DEFAULT_COLOR_PALETTE } from "./model";
import { DEFAULT_MEASUREMENT_CONFIG, type PlatformMeasurementConfig } from "./measurements";

export type UserCustomizationDomain =
  | "category-libraries"
  | "component-libraries"
  | "custom-devices"
  | "device-definition-overrides"
  | "parameter-definitions"
  | "measurement-definitions"
  | "e-interface-definitions"
  | "graph-templates"
  | "user-assets"
  | "color-settings";

export type UserCustomizationChangeType = "added" | "modified" | "protected";

export type UserCustomizationAsset = ImageAsset & { dataUrl?: string };

export type UserCustomizationSnapshot = {
  deviceLibrary: DeviceLibraryPersistencePayload;
  measurementConfig: PlatformMeasurementConfig;
  colorConfig: { colorDisplayMode: ColorDisplayMode; colorPalette: ColorPalette };
  imageLibrary: { folders: ImageFolder[]; assets: UserCustomizationAsset[] };
};

export type UserCustomizationItem = {
  key: string;
  domain: UserCustomizationDomain;
  itemId: string;
  name: string;
  owner: string;
  changeType: UserCustomizationChangeType;
  summary: string;
  protected?: boolean;
};

export type UserCustomizationInventory = {
  items: UserCustomizationItem[];
  countsByDomain: Record<UserCustomizationDomain, number>;
  summary: { total: number; added: number; modified: number; assets: number };
};

export function emptyUserDeviceLibrary(): DeviceLibraryPersistencePayload {
  return {
    customDeviceTemplates: [],
    customCategoryLibraries: [],
    customComponentLibraries: [],
    deviceDefinitionOverrides: {},
    eDeviceDefinitionLabels: {},
    eDeviceDefinitionClassExportEnabled: {},
    customGraphTemplateTypes: [],
    customGraphTemplates: []
  };
}

export function userCustomizationAssetIsBuiltIn(asset: Pick<ImageAsset, "id" | "folderId" | "createdAt">): boolean {
  return asset.createdAt === "builtin" || asset.folderId === "builtin-shared-icons" || asset.id.startsWith("builtin-shared-icon-");
}

function normalizeDeviceLibrarySnapshot(value: Partial<DeviceLibraryPersistencePayload> | undefined): DeviceLibraryPersistencePayload {
  const source = value ?? {};
  return {
    customDeviceTemplates: structuredClone(source.customDeviceTemplates ?? []),
    customCategoryLibraries: structuredClone(source.customCategoryLibraries ?? []),
    customComponentLibraries: structuredClone(source.customComponentLibraries ?? []),
    deviceDefinitionOverrides: structuredClone(source.deviceDefinitionOverrides ?? {}),
    eDeviceDefinitionLabels: structuredClone(source.eDeviceDefinitionLabels ?? {}),
    eDeviceDefinitionClassExportEnabled: structuredClone(source.eDeviceDefinitionClassExportEnabled ?? {}),
    customGraphTemplateTypes: structuredClone(source.customGraphTemplateTypes ?? []),
    customGraphTemplates: structuredClone(source.customGraphTemplates ?? [])
  };
}

function normalizeUserImageLibrary(value: Partial<UserCustomizationSnapshot["imageLibrary"]> | undefined): UserCustomizationSnapshot["imageLibrary"] {
  const folders = structuredClone(value?.folders ?? [{ id: "root", name: "默认文件夹" }]);
  if (!folders.some((folder) => folder.id === "root")) folders.unshift({ id: "root", name: "默认文件夹" });
  return {
    folders: folders.filter((folder) => folder.id !== "builtin-shared-icons"),
    assets: structuredClone(value?.assets ?? []).filter((asset) => !userCustomizationAssetIsBuiltIn(asset))
  };
}

export function normalizeUserCustomizationSnapshot(value: Partial<UserCustomizationSnapshot>): UserCustomizationSnapshot {
  return {
    deviceLibrary: normalizeDeviceLibrarySnapshot(value.deviceLibrary),
    measurementConfig: normalizeMeasurementConfig(value.measurementConfig ?? DEFAULT_MEASUREMENT_CONFIG),
    colorConfig: {
      colorDisplayMode: value.colorConfig?.colorDisplayMode === "voltage" ? "voltage" : "energy",
      colorPalette: normalizeColorPalette(value.colorConfig?.colorPalette ?? DEFAULT_COLOR_PALETTE)
    },
    imageLibrary: normalizeUserImageLibrary(value.imageLibrary)
  };
}
```

Implement canonical comparison with recursively sorted object keys, then build rows for every domain. Parameter rows are generated once per kind when a custom template or override has non-empty `parameterDefinitions` or a non-empty serialized `CUSTOM_PARAM_DEFINITIONS_KEY`. E-interface rows cover class label/export maps and explicit `exportEnabled`/`exportName` values. Measurement rows are keyed by `type:<id>`, `profile:<deviceKind>`, and `group-defaults`. Color settings produce one row only when mode or palette differs from defaults.

- [ ] **Step 4: Run inventory tests**

Run: `npm test -- src/userCustomizations.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit the domain foundation**

```powershell
git add -- src/userCustomizations.ts src/userCustomizations.test.ts
git commit -m "feat: add user customization inventory"
```

## Task 2: Merge, Restore, Conflict Preview, And Transaction Helpers

**Files:**
- Modify: `src/userCustomizations.ts`
- Modify: `src/userCustomizations.test.ts`

- [ ] **Step 1: Run GitNexus impact analysis before changing existing Task 1 symbols**

Run:

```powershell
node .gitnexus/run.cjs impact buildUserCustomizationInventory --direction upstream --repo graph_modeling_platform
node .gitnexus/run.cjs impact emptyUserDeviceLibrary --direction upstream --repo graph_modeling_platform
```

Expected: LOW risk limited to the new unit tests. If either result is HIGH or CRITICAL, stop and report the result before editing.

- [ ] **Step 2: Add failing merge and restore tests**

```ts
import {
  mergeUserCustomizationSnapshots,
  previewUserCustomizationImport,
  restoreUserCustomizationItems,
  runUserCustomizationTransaction
} from "./userCustomizations";

const customTemplate = (kind: string, label: string) => ({
  kind,
  label,
  categoryLibrary: "用户类别",
  size: { width: 80, height: 48 },
  params: { component_type: "CustomSource" },
  terminalType: "ac",
  terminalCount: 1,
  custom: true
});

test("incremental import overwrites same IDs, adds new IDs and keeps local-only IDs", () => {
  const current = defaultSnapshot();
  current.deviceLibrary.customDeviceTemplates = [customTemplate("local", "本地"), customTemplate("same", "旧名称")] as any;
  const imported = defaultSnapshot();
  imported.deviceLibrary.customDeviceTemplates = [customTemplate("same", "新名称"), customTemplate("new", "新增")] as any;

  const merged = mergeUserCustomizationSnapshots(current, imported, "incremental");

  expect(merged.deviceLibrary.customDeviceTemplates.map((item) => [item.kind, item.label])).toEqual([
    ["local", "本地"],
    ["same", "新名称"],
    ["new", "新增"]
  ]);
});

test("replacement import keeps domains absent from a legacy package", () => {
  const current = defaultSnapshot();
  current.colorConfig.colorPalette.energy.ac = "#123456";
  const replaced = mergeUserCustomizationSnapshots(current, { deviceLibrary: emptyUserDeviceLibrary() }, "replace");
  expect(replaced.colorConfig.colorPalette.energy.ac).toBe("#123456");
});

test("same-name different-ID rows are previewed as conflicts and imported content wins", () => {
  const current = defaultSnapshot();
  current.deviceLibrary.customDeviceTemplates = [customTemplate("old-id", "重复名称")] as any;
  const imported = defaultSnapshot();
  imported.deviceLibrary.customDeviceTemplates = [customTemplate("new-id", "重复名称")] as any;
  const preview = previewUserCustomizationImport(current, imported, "incremental");
  expect(preview.conflicts).toHaveLength(1);
  expect(preview.target.deviceLibrary.customDeviceTemplates.map((item) => item.kind)).toEqual(["new-id"]);
});

test("restoring a custom device removes its dependent override, profile and E metadata", () => {
  const snapshot = defaultSnapshot();
  snapshot.deviceLibrary.customDeviceTemplates = [customTemplate("custom-source", "自定义电源")] as any;
  snapshot.deviceLibrary.deviceDefinitionOverrides["custom-source"] = { kind: "custom-source", size: { width: 90, height: 50 } } as any;
  snapshot.deviceLibrary.eDeviceDefinitionLabels = { "custom-source": "CustomSource" };
  snapshot.measurementConfig.deviceProfiles.push({ deviceKind: "custom-source", items: [] });

  const restored = restoreUserCustomizationItems(snapshot, ["custom-devices:custom-source"]);

  expect(restored.deviceLibrary.customDeviceTemplates).toEqual([]);
  expect(restored.deviceLibrary.deviceDefinitionOverrides["custom-source"]).toBeUndefined();
  expect(restored.deviceLibrary.eDeviceDefinitionLabels?.["custom-source"]).toBeUndefined();
  expect(restored.measurementConfig.deviceProfiles.some((profile) => profile.deviceKind === "custom-source")).toBe(false);
});

test("rolls back the retained snapshot after an apply failure", async () => {
  const events: string[] = [];
  await expect(runUserCustomizationTransaction({
    before: defaultSnapshot(),
    target: defaultSnapshot(),
    apply: async () => { events.push("apply"); throw new Error("write failed"); },
    rollback: async () => { events.push("rollback"); }
  })).rejects.toThrow("write failed");
  expect(events).toEqual(["apply", "rollback"]);
});
```

- [ ] **Step 3: Verify the new tests fail**

Run: `npm test -- src/userCustomizations.test.ts`

Expected: FAIL because merge, restore, preview, and transaction exports are missing.

- [ ] **Step 4: Implement deterministic merge and restore**

Add these public contracts:

```ts
export type UserCustomizationImportMode = "replace" | "incremental";

export type UserCustomizationImportConflict = {
  domain: UserCustomizationDomain;
  importedId: string;
  localId: string;
  name: string;
};

export type UserCustomizationImportPreview = {
  mode: UserCustomizationImportMode;
  target: UserCustomizationSnapshot;
  additions: number;
  updates: number;
  unchanged: number;
  conflicts: UserCustomizationImportConflict[];
};

export function previewUserCustomizationImport(
  current: UserCustomizationSnapshot,
  imported: Partial<UserCustomizationSnapshot>,
  mode: UserCustomizationImportMode
): UserCustomizationImportPreview;

export function mergeUserCustomizationSnapshots(
  current: UserCustomizationSnapshot,
  imported: Partial<UserCustomizationSnapshot>,
  mode: UserCustomizationImportMode
): UserCustomizationSnapshot;

export function restoreUserCustomizationItems(
  current: UserCustomizationSnapshot,
  itemKeys: readonly string[]
): UserCustomizationSnapshot;

export async function runUserCustomizationTransaction(options: {
  before: UserCustomizationSnapshot;
  target: UserCustomizationSnapshot;
  apply: (snapshot: UserCustomizationSnapshot) => Promise<void>;
  rollback: (snapshot: UserCustomizationSnapshot) => Promise<void>;
}): Promise<void>;

export function collectReferencedUserAssetIds(value: unknown): Set<string>;

export function reconcileNodesAfterCustomizationChange(
  nodes: readonly ModelNode[],
  previousTemplates: ReadonlyMap<string, DeviceTemplate>,
  nextTemplates: ReadonlyMap<string, DeviceTemplate>
): { nodes: ModelNode[]; changed: boolean };
```

Use stable keys for array merges:

- Category library: normalized name.
- Component library: `categoryLibraryName::name`.
- Custom device: `kind` with normalized `label` conflict detection.
- Definition override and E metadata: device kind.
- Template type: normalized name.
- Graph template: `id` with `typeName::name` conflict detection.
- Measurement type: `id` with normalized `name` conflict detection.
- Measurement profile: `deviceKind`.
- Image asset: `id` with `folderId::name` conflict detection.
- Color and group defaults: singleton imported values overwrite current values when present.

Selected restore must cascade only where necessary: removing a category removes its custom component libraries and custom devices; removing a component library removes its custom devices; removing a custom device removes its override, E metadata, and measurement profile. Restoring built-in parameter/E rows strips only those fields and keeps unrelated visual overrides.

- [ ] **Step 5: Run unit tests**

Run: `npm test -- src/userCustomizations.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit merge and restore logic**

```powershell
git add -- src/userCustomizations.ts src/userCustomizations.test.ts
git commit -m "feat: add customization merge and restore rules"
```

## Task 3: Version-2 Portable Package

**Files:**
- Modify: `src/appExtracted/appPersistenceLibraryExport.tsx:860-1067`
- Modify: `src/appPersistenceLibraryExport.test.ts:57-130,382-488`

- [ ] **Step 1: Run GitNexus impact analysis**

Run:

```powershell
node .gitnexus/run.cjs impact createLibraryPackage --direction upstream --repo graph_modeling_platform
node .gitnexus/run.cjs impact normalizeLibraryPackage --direction upstream --repo graph_modeling_platform
node .gitnexus/run.cjs impact LibraryPackagePayload --direction upstream --repo graph_modeling_platform
```

Report direct callers, affected flows, and risk. Do not edit if GitNexus reports HIGH or CRITICAL until the user has been warned.

- [ ] **Step 2: Add failing package-version tests**

Update expectations for newly-created packages and add legacy normalization coverage.

```ts
test("creates version-2 packages with color configuration and a manifest", () => {
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

test("accepts version-1 packages without clearing absent version-2 domains", () => {
  const normalized = normalizeLibraryPackage({
    format: "graph-modeling-platform-library-package",
    version: 1,
    scope: "device-library",
    deviceLibrary: emptyUserDeviceLibrary()
  });
  expect(normalized.version).toBe(2);
  expect(normalized.deviceLibrary).toBeDefined();
  expect(normalized.colorConfig).toBeUndefined();
});
```

- [ ] **Step 3: Run package tests and verify failure**

Run: `npm test -- src/appPersistenceLibraryExport.test.ts`

Expected: FAIL because package version is still 1 and color/manifest fields are unsupported.

- [ ] **Step 4: Extend the package type and normalizer**

Implement:

```ts
export const LIBRARY_PACKAGE_VERSION = 2;
export type SupportedLibraryPackageVersion = 1 | typeof LIBRARY_PACKAGE_VERSION;

export type LibraryPackageManifest = {
  total: number;
  domainCounts: Partial<Record<UserCustomizationDomain, number>>;
};

export type LibraryPackagePayload = {
  format: typeof LIBRARY_PACKAGE_FORMAT;
  version: typeof LIBRARY_PACKAGE_VERSION;
  scope: LibraryPackageScope;
  exportedAt: string;
  measurementConfig?: PlatformMeasurementConfig;
  deviceLibrary?: DeviceLibraryPersistencePayload;
  iconLibrary?: IconLibraryPersistencePayload;
  colorConfig?: { colorDisplayMode: ColorDisplayMode; colorPalette: ColorPalette };
  manifest?: LibraryPackageManifest;
};
```

`normalizeLibraryPackage` must accept source version `1` or `2`, reject future versions, normalize all present sections, and always return the current version. `createLibraryPackage` includes color only for `scope === "all"`; existing scoped package semantics remain unchanged.

- [ ] **Step 5: Run focused tests**

Run: `npm test -- src/appPersistenceLibraryExport.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit package compatibility**

```powershell
git add -- src/appExtracted/appPersistenceLibraryExport.tsx src/appPersistenceLibraryExport.test.ts
git commit -m "feat: extend customization package format"
```

## Task 4: Persistence Coordinator And Model Reconciliation

**Files:**
- Create: `src/appExtracted/appUserCustomizationFactories.tsx`
- Create: `src/appUserCustomizationFactories.test.ts`
- Modify: `src/App.tsx:541-560,623-680,3337-3606`

- [ ] **Step 1: Run GitNexus impact analysis for existing handlers that will be integrated**

Run:

```powershell
node .gitnexus/run.cjs impact exportLibraryPackage --direction upstream --repo graph_modeling_platform
node .gitnexus/run.cjs impact importLibraryPackageFile --direction upstream --repo graph_modeling_platform
node .gitnexus/run.cjs impact currentDeviceLibraryPersistencePayload --direction upstream --repo graph_modeling_platform
```

Report risk and affected UI/import flows. Stop for user acknowledgement on HIGH or CRITICAL results.

- [ ] **Step 2: Write failing factory tests**

Test full snapshot capture, backup-before-write ordering, rollback, React-state refresh, and open-model reconciliation.

```ts
import { describe, expect, test, vi } from "vitest";
import {
  createApplyUserCustomizationSnapshot,
  createExportAllUserCustomizations,
  createRestoreUserCustomizations
} from "./appExtracted/appUserCustomizationFactories";

const testScope = (overrides: Record<string, unknown> = {}) => ({
  beforeSnapshot: { marker: "before" },
  targetSnapshot: { marker: "target" },
  captureUserCustomizationSnapshot: vi.fn(async () => ({ marker: "before" })),
  saveUserCustomizationSnapshotFile: vi.fn(async () => true),
  persistUserCustomizationSnapshot: vi.fn(async () => undefined),
  applyUserCustomizationSnapshotToState: vi.fn(),
  reconcileOpenModelAfterCustomizationChange: vi.fn(),
  refreshUserCustomizationManager: vi.fn(async () => undefined),
  setUserCustomizationBusy: vi.fn(),
  referencedUserAssetIds: new Set<string>(),
  ...overrides
} as any);

test("exports the automatic backup before applying a replacement", async () => {
  const events: string[] = [];
  const scope = testScope({
    saveUserCustomizationSnapshotFile: vi.fn(async () => { events.push("backup"); return true; }),
    persistUserCustomizationSnapshot: vi.fn(async () => { events.push("persist"); })
  });
  await createApplyUserCustomizationSnapshot(scope)(scope.targetSnapshot, "整体替换");
  expect(events).toEqual(["backup", "persist"]);
});

test("restores the retained snapshot when a domain write fails", async () => {
  const persisted: string[] = [];
  const scope = testScope({
    persistUserCustomizationSnapshot: vi.fn(async (snapshot) => {
      persisted.push(snapshot.marker);
      if (snapshot.marker === "target") throw new Error("measurement write failed");
    })
  });
  await expect(createApplyUserCustomizationSnapshot(scope)(scope.targetSnapshot, "导入"))
    .rejects.toThrow("measurement write failed");
  expect(persisted).toEqual(["target", "before"]);
});
```

- [ ] **Step 3: Run the factory tests and verify failure**

Run: `npm test -- src/appUserCustomizationFactories.test.ts`

Expected: FAIL because the factory module does not exist.

- [ ] **Step 4: Implement focused application factories**

Export factories with these contracts:

```ts
export function createCaptureUserCustomizationSnapshot(scope: Record<string, any>) {
  return async (includeAssetData: boolean): Promise<UserCustomizationSnapshot> => {
    const folders = await scope.fetchBackendImageFolders();
    const assets = (await scope.fetchAllBackendImages()).filter(
      (asset: ImageAsset) => !userCustomizationAssetIsBuiltIn(asset)
    );
    const portableAssets = await Promise.all(assets.map(async (asset: ImageAsset) =>
      includeAssetData
        ? { ...asset, dataUrl: await scope.fetchBackendImageDataUrl(asset) }
        : asset
    ));
    return normalizeUserCustomizationSnapshot({
      deviceLibrary: scope.currentDeviceLibraryPersistencePayload(),
      measurementConfig: scope.normalizeMeasurementConfig(
        scope.measurementConfigDraftRef.current ?? scope.measurementConfigDraft ?? scope.measurementConfig
      ),
      colorConfig: {
        colorDisplayMode: scope.normalizeColorDisplayMode(scope.colorDisplayMode),
        colorPalette: scope.normalizeColorPalette(scope.colorPalette)
      },
      imageLibrary: { folders, assets: portableAssets }
    });
  };
}

export function createPersistUserCustomizationSnapshot(scope: Record<string, any>) {
  return async (target: UserCustomizationSnapshot, options: { replaceAssets: boolean; protectedAssetIds?: Set<string> }) => {
    const normalized = normalizeUserCustomizationSnapshot(target);
    await scope.saveBackendDeviceLibraryPayload(scope.serializeDeviceLibraryForStorage(normalized.deviceLibrary));
    await scope.saveBackendMeasurementConfigPayload(scope.serializeMeasurementConfigForStorage(normalized.measurementConfig));
    await scope.saveBackendColorConfigPayload(scope.serializeColorConfigForStorage(
      normalized.colorConfig.colorDisplayMode,
      normalized.colorConfig.colorPalette
    ));
    if (options.replaceAssets) {
      const targetIds = new Set(normalized.imageLibrary.assets.map((asset) => asset.id));
      const existing = (await scope.fetchAllBackendImages()).filter(
        (asset: ImageAsset) => !userCustomizationAssetIsBuiltIn(asset)
      );
      for (const asset of existing) {
        if (!targetIds.has(asset.id) && !options.protectedAssetIds?.has(asset.id)) {
          await scope.deleteBackendImageAsset(asset.id);
        }
      }
    }
    const portable = normalized.imageLibrary.assets.filter((asset) => Boolean(asset.dataUrl));
    if (portable.length > 0) {
      await scope.importBackendImageLibraryPayload({ folders: normalized.imageLibrary.folders, assets: portable });
    }
  };
}

export function createApplyUserCustomizationSnapshot(scope: Record<string, any>) {
  return async (target: UserCustomizationSnapshot, actionLabel: string) => {
    const before = await scope.captureUserCustomizationSnapshot(true);
    const backupSaved = await scope.saveUserCustomizationSnapshotFile(before, `操作前备份-${actionLabel}`);
    if (!backupSaved) throw new Error("未完成操作前备份，已取消本次操作。");
    scope.setUserCustomizationBusy(true);
    try {
      await runUserCustomizationTransaction({
        before,
        target,
        apply: (snapshot) => scope.persistUserCustomizationSnapshot(snapshot, { replaceAssets: true, protectedAssetIds: scope.referencedUserAssetIds }),
        rollback: (snapshot) => scope.persistUserCustomizationSnapshot(snapshot, { replaceAssets: true })
      });
      scope.applyUserCustomizationSnapshotToState(target);
      scope.reconcileOpenModelAfterCustomizationChange(before, target);
      await scope.refreshUserCustomizationManager();
      window.alert(`${actionLabel}成功。`);
    } finally {
      scope.setUserCustomizationBusy(false);
    }
  };
}

export function createExportAllUserCustomizations(scope: Record<string, any>) {
  return async () => {
    const snapshot = await scope.captureUserCustomizationSnapshot(true);
    const inventory = buildUserCustomizationInventory(snapshot, scope.DEVICE_LIBRARY, scope.referencedUserAssetIds);
    const packagePayload = scope.createLibraryPackage({
      scope: "all",
      measurementConfig: snapshot.measurementConfig,
      deviceLibrary: snapshot.deviceLibrary,
      iconLibrary: snapshot.imageLibrary,
      colorConfig: snapshot.colorConfig,
      manifest: { total: inventory.summary.total, domainCounts: inventory.countsByDomain }
    });
    const saved = await scope.saveTextFile({
      filename: `用户自定义-${scope.timestampForLibraryPackageFilename()}.json`,
      text: JSON.stringify(packagePayload, null, 2),
      mime: "application/json",
      description: "图形建模平台用户自定义文件",
      extensions: [".json"]
    });
    if (saved) window.alert(`用户自定义导出成功，共 ${inventory.summary.total} 项。`);
  };
}

export function createImportUserCustomizationFile(scope: Record<string, any>) {
  return (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    void (async () => {
      const packagePayload = scope.normalizeLibraryPackage(JSON.parse(await file.text()));
      const imported = scope.userCustomizationSnapshotFromLibraryPackage(packagePayload);
      const current = await scope.captureUserCustomizationSnapshot(false);
      const mode: UserCustomizationImportMode = "replace";
      scope.setPendingUserCustomizationImport({
        fileName: file.name,
        imported,
        mode,
        preview: previewUserCustomizationImport(current, imported, mode)
      });
    })().catch((error) => window.alert(error instanceof Error ? error.message : "读取用户自定义文件失败。"));
  };
}

export function createConfirmUserCustomizationImport(scope: Record<string, any>) {
  return async () => {
    const pending = scope.pendingUserCustomizationImport;
    if (!pending) return;
    await scope.applyUserCustomizationSnapshot(pending.preview.target, `导入用户自定义（${pending.mode === "replace" ? "整体替换" : "增量更新"}）`);
    scope.setPendingUserCustomizationImport(null);
  };
}

export function createChangePendingUserCustomizationImportMode(scope: Record<string, any>) {
  return async (mode: UserCustomizationImportMode) => {
    const pending = scope.pendingUserCustomizationImport;
    if (!pending) return;
    const current = await scope.captureUserCustomizationSnapshot(false);
    scope.setPendingUserCustomizationImport({
      ...pending,
      mode,
      preview: previewUserCustomizationImport(current, pending.imported, mode)
    });
  };
}

export function createRestoreUserCustomizations(scope: Record<string, any>) {
  return async (itemKeys: readonly string[]) => {
    const current = await scope.captureUserCustomizationSnapshot(true);
    const target = restoreUserCustomizationItems(current, itemKeys);
    const affected = Math.max(0, buildUserCustomizationInventory(current, scope.DEVICE_LIBRARY).summary.total - buildUserCustomizationInventory(target, scope.DEVICE_LIBRARY).summary.total);
    if (affected === 0 || !window.confirm(`确定恢复所选自定义内容吗？预计影响 ${affected} 项。`)) return;
    await scope.applyUserCustomizationSnapshot(target, "恢复用户自定义");
  };
}
```

The same module also defines these private helpers with direct tests through the public factories:

```ts
async function saveUserCustomizationSnapshotFile(scope: Record<string, any>, snapshot: UserCustomizationSnapshot, label: string): Promise<boolean>;
function userCustomizationSnapshotFromLibraryPackage(payload: LibraryPackagePayload): Partial<UserCustomizationSnapshot>;
function applyUserCustomizationSnapshotToState(scope: Record<string, any>, target: UserCustomizationSnapshot): void;
function reconcileOpenModelAfterCustomizationChange(scope: Record<string, any>, before: UserCustomizationSnapshot, target: UserCustomizationSnapshot): void;
async function refreshUserCustomizationManager(scope: Record<string, any>): Promise<void>;
```

Persistence order:

1. Normalize the complete target.
2. Await `saveBackendDeviceLibraryPayload`.
3. Await `saveBackendMeasurementConfigPayload`.
4. Await `saveBackendColorConfigPayload`.
5. In replacement mode, delete non-built-in, non-protected assets absent from target.
6. Import target user assets through `importBackendImageLibraryPayload`.
7. Refresh folders and all image metadata.
8. Only after successful persistence, update React state, local compatibility storage, and persisted-payload refs.

On failure, repeat the same lower-level persistence operation with the retained pre-operation snapshot. The rollback path must not create another backup or recursively invoke itself.

After success, build previous and next effective template maps from `DEVICE_LIBRARY`, custom templates, and definition overrides. Reconcile every node that still has a current template using `reconcileNodeWithDefinition`; leave missing-template nodes untouched. Reconcile measurements once with `reconcileProjectMeasurementsWithConfig(nextConfig, previousConfig)`. Capture one undo snapshot only if the open model changes.

- [ ] **Step 5: Wire state and factories into `App.tsx`**

Add state with explicit defaults:

```ts
const userCustomizationImportInputRef = useRef<HTMLInputElement | null>(null);
const [userCustomizationManagerOpen, setUserCustomizationManagerOpen] = useState(false);
const [userCustomizationActiveDomain, setUserCustomizationActiveDomain] = useState<UserCustomizationDomain>("custom-devices");
const [userCustomizationAssets, setUserCustomizationAssets] = useState<ImageAsset[]>([]);
const [userCustomizationBusy, setUserCustomizationBusy] = useState(false);
const [userCustomizationStatus, setUserCustomizationStatus] = useState("");
const [pendingUserCustomizationImport, setPendingUserCustomizationImport] = useState<{
  fileName: string;
  imported: Partial<UserCustomizationSnapshot>;
  mode: UserCustomizationImportMode;
  preview: UserCustomizationImportPreview;
} | null>(null);
```

Instantiate the new factories after existing persistence helpers and expose them through `__appScope`. Derive `userCustomizationInventory` with `useMemo` from the normalized current device, measurement, color, and asset metadata states.

- [ ] **Step 6: Run factory and package tests**

Run: `npm test -- src/appUserCustomizationFactories.test.ts src/userCustomizations.test.ts src/appPersistenceLibraryExport.test.ts`

Expected: PASS.

- [ ] **Step 7: Commit coordinator logic**

```powershell
git add -- src/appExtracted/appUserCustomizationFactories.tsx src/appUserCustomizationFactories.test.ts src/App.tsx
git commit -m "feat: coordinate customization backup and restore"
```

## Task 5: Approved Dialog And Toolbar Entry

**Files:**
- Create: `src/UserCustomizationManagerDialog.tsx`
- Create: `src/UserCustomizationManagerDialog.test.tsx`
- Modify: `src/App.tsx:5450-5486`
- Modify: `src/appExtracted/appView.tsx:1-15,1150-1170,2240-2310`
- Modify: `src/styles.css`

- [ ] **Step 1: Run GitNexus impact analysis for the view symbols**

Run:

```powershell
node .gitnexus/run.cjs impact renderLibraryPanel --direction upstream --repo graph_modeling_platform
node .gitnexus/run.cjs impact renderAppView --direction upstream --repo graph_modeling_platform
```

Report risk and affected render flows. Stop for acknowledgement if HIGH or CRITICAL.

- [ ] **Step 2: Write failing dialog-render tests**

```tsx
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test, vi } from "vitest";
import { UserCustomizationManagerDialog } from "./UserCustomizationManagerDialog";

const sampleInventory = () => ({
  items: [{ key: "custom-devices:custom-source", domain: "custom-devices", itemId: "custom-source", name: "自定义电源", owner: "用户类别", changeType: "added", summary: "新增元件" }],
  countsByDomain: {
    "category-libraries": 0,
    "component-libraries": 0,
    "custom-devices": 1,
    "device-definition-overrides": 0,
    "parameter-definitions": 0,
    "measurement-definitions": 0,
    "e-interface-definitions": 0,
    "graph-templates": 0,
    "user-assets": 0,
    "color-settings": 0
  },
  summary: { total: 1, added: 1, modified: 0, assets: 0 }
} as any);

test("renders the approved tree-table layout and all top-level actions", () => {
  const html = renderToStaticMarkup(createElement(UserCustomizationManagerDialog, {
    open: true,
    inventory: sampleInventory(),
    activeDomain: "custom-devices",
    busy: false,
    status: "",
    pendingImport: null,
    onClose: vi.fn(),
    onDomainChange: vi.fn(),
    onExport: vi.fn(),
    onChooseImport: vi.fn(),
    onImportModeChange: vi.fn(),
    onConfirmImport: vi.fn(),
    onCancelImport: vi.fn(),
    onRestore: vi.fn()
  }));

  expect(html).toContain("用户自定义管理");
  expect(html).toContain("导出全部");
  expect(html).toContain("导入配置");
  expect(html).toContain("恢复所选");
  expect(html).toContain("恢复全部默认");
  expect(html).toContain("自定义元件");
});
```

- [ ] **Step 3: Verify the UI tests fail**

Run: `npm test -- src/UserCustomizationManagerDialog.test.tsx`

Expected: FAIL because the component does not exist.

- [ ] **Step 4: Implement the dialog component**

Use a focused props contract and keep filtering/row selection local to the component.

```tsx
export function UserCustomizationManagerDialog(props: UserCustomizationManagerDialogProps) {
  const [query, setQuery] = useState("");
  const [changeFilter, setChangeFilter] = useState<"all" | UserCustomizationChangeType>("all");
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const toggleKey = (key: string) => setSelectedKeys((current) =>
    current.includes(key) ? current.filter((item) => item !== key) : [...current, key]
  );

  if (!props.open) return null;

  const visibleItems = props.inventory.items.filter((item) =>
    item.domain === props.activeDomain &&
    (changeFilter === "all" || item.changeType === changeFilter) &&
    `${item.name} ${item.owner} ${item.summary}`.toLowerCase().includes(query.trim().toLowerCase())
  );

  return (
    <div className="modal-backdrop user-customization-backdrop" role="presentation">
      <section className="user-customization-dialog" role="dialog" aria-modal="true" aria-label="用户自定义管理">
        <header className="user-customization-header">
          <h2>用户自定义管理</h2>
          <div className="user-customization-actions">
            <button type="button" onClick={props.onExport} disabled={props.busy}><Download size={15} />导出全部</button>
            <button type="button" onClick={props.onChooseImport} disabled={props.busy}><FileInput size={15} />导入配置</button>
            <button type="button" onClick={props.onClose} disabled={props.busy} aria-label="关闭"><X size={16} /></button>
          </div>
        </header>
        <div className="user-customization-summary">
          <span>自定义项目<strong>{props.inventory.summary.total}</strong></span>
          <span>新增<strong>{props.inventory.summary.added}</strong></span>
          <span>修改<strong>{props.inventory.summary.modified}</strong></span>
          <span>用户资源<strong>{props.inventory.summary.assets}</strong></span>
        </div>
        <div className="user-customization-main">
          <aside className="user-customization-tree">
            {USER_CUSTOMIZATION_DOMAIN_OPTIONS.map((domain) => (
              <button type="button" className={props.activeDomain === domain.value ? "active" : ""} onClick={() => props.onDomainChange(domain.value)}>
                <span>{domain.label}</span><strong>{props.inventory.countsByDomain[domain.value]}</strong>
              </button>
            ))}
          </aside>
          <main className="user-customization-detail">
            <div className="user-customization-filter">
              <Search size={15} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索自定义内容" />
              <select value={changeFilter} onChange={(event) => setChangeFilter(event.target.value as typeof changeFilter)}>
                <option value="all">全部变更</option><option value="added">新增</option><option value="modified">修改</option><option value="protected">依赖保留</option>
              </select>
            </div>
            <table className="user-customization-table">
              <thead><tr><th>选择</th><th>项目</th><th>归属</th><th>类型</th><th>变更摘要</th></tr></thead>
              <tbody>{visibleItems.map((item) => (
                <tr key={item.key}>
                  <td><input type="checkbox" disabled={item.protected} checked={selectedKeys.includes(item.key)} onChange={() => toggleKey(item.key)} /></td>
                  <td>{item.name}</td><td>{item.owner}</td><td>{CHANGE_TYPE_LABELS[item.changeType]}</td><td>{item.summary}</td>
                </tr>
              ))}</tbody>
            </table>
          </main>
        </div>
        {props.pendingImport && <ImportPreviewPanel pending={props.pendingImport} onModeChange={props.onImportModeChange} onConfirm={props.onConfirmImport} onCancel={props.onCancelImport} />}
        <footer className="user-customization-footer">
          <span>{props.status || "恢复操作不会删除模型画布中已经绘制的实例。"}</span>
          <button type="button" disabled={props.busy || selectedKeys.length === 0} onClick={() => props.onRestore(selectedKeys)}>恢复所选</button>
          <button type="button" className="danger" disabled={props.busy || props.inventory.items.length === 0} onClick={() => props.onRestore(props.inventory.items.filter((item) => !item.protected).map((item) => item.key))}>恢复全部默认</button>
        </footer>
      </section>
    </div>
  );
}
```

Define the labels and import-preview component in the same file so the main dialog remains declarative:

```tsx
const USER_CUSTOMIZATION_DOMAIN_OPTIONS: Array<{ value: UserCustomizationDomain; label: string }> = [
  { value: "category-libraries", label: "自定义类别库" },
  { value: "component-libraries", label: "自定义元件库" },
  { value: "custom-devices", label: "自定义元件" },
  { value: "device-definition-overrides", label: "内置元件定义覆盖" },
  { value: "parameter-definitions", label: "参数定义" },
  { value: "measurement-definitions", label: "量测定义" },
  { value: "e-interface-definitions", label: "E 文件接口定义" },
  { value: "graph-templates", label: "自定义模板" },
  { value: "user-assets", label: "用户图标与图片" },
  { value: "color-settings", label: "配色设置" }
];

const CHANGE_TYPE_LABELS: Record<UserCustomizationChangeType, string> = {
  added: "新增",
  modified: "修改",
  protected: "依赖保留"
};

function ImportPreviewPanel({ pending, onModeChange, onConfirm, onCancel }: ImportPreviewPanelProps) {
  return (
    <div className="user-customization-import-preview" role="region" aria-label="导入预览">
      <h3>{pending.fileName}</h3>
      <label><input type="radio" checked={pending.mode === "replace"} onChange={() => onModeChange("replace")} />整体替换</label>
      <label><input type="radio" checked={pending.mode === "incremental"} onChange={() => onModeChange("incremental")} />增量更新</label>
      <span>新增 {pending.preview.additions}</span>
      <span>更新 {pending.preview.updates}</span>
      <span>不变 {pending.preview.unchanged}</span>
      <span>冲突 {pending.preview.conflicts.length}</span>
      <button type="button" onClick={onCancel}>取消</button>
      <button type="button" onClick={onConfirm}>确认导入</button>
    </div>
  );
}
```

Use Lucide `Download`, `FileInput`, `RotateCcw`, `Search`, and `X` icons. Disable close and destructive buttons while busy. Protected assets display `模型依赖保留` and cannot be selected for deletion.

The import-preview panel shows mode radio buttons, additions, updates, unchanged items, conflicts, and a conflict table. `整体替换` is selected by default; changing mode recomputes preview before confirmation.

- [ ] **Step 5: Add the toolbar entry and overlay wiring**

In `renderLibraryPanel`, add one icon-and-text command beside the existing import/export actions:

```tsx
<button
  type="button"
  className="library-icon-action"
  title="管理用户自定义内容"
  onClick={() => void openUserCustomizationManager()}
>
  <Settings2 size={14} aria-hidden="true" />
  <span>自定义管理</span>
</button>
```

In `appView.tsx`, render a hidden JSON input and the dialog once at the overlay level:

```tsx
<input
  ref={userCustomizationImportInputRef}
  type="file"
  accept=".json,application/json"
  hidden
  onChange={importUserCustomizationFile}
/>

<UserCustomizationManagerDialog
  open={userCustomizationManagerOpen}
  inventory={userCustomizationInventory}
  activeDomain={userCustomizationActiveDomain}
  busy={userCustomizationBusy}
  status={userCustomizationStatus}
  pendingImport={pendingUserCustomizationImport}
  onClose={closeUserCustomizationManager}
  onDomainChange={setUserCustomizationActiveDomain}
  onExport={exportAllUserCustomizations}
  onChooseImport={openUserCustomizationImportFilePicker}
  onImportModeChange={changePendingUserCustomizationImportMode}
  onConfirmImport={confirmUserCustomizationImport}
  onCancelImport={cancelPendingUserCustomizationImport}
  onRestore={restoreUserCustomizations}
/>
```

- [ ] **Step 6: Add responsive styles**

Implement stable dimensions and clear table separators:

```css
.user-customization-dialog {
  width: min(1120px, calc(100vw - 48px));
  height: min(760px, calc(100vh - 48px));
  display: grid;
  grid-template-rows: auto auto minmax(0, 1fr) auto;
  background: #f7f9fb;
  border: 1px solid #aeb8c4;
  border-radius: 6px;
  box-shadow: 0 18px 50px rgb(15 23 42 / 24%);
  overflow: hidden;
}

.user-customization-main {
  display: grid;
  grid-template-columns: minmax(220px, 280px) minmax(0, 1fr);
  min-height: 0;
}

.user-customization-table th,
.user-customization-table td {
  border-right: 1px solid #c8d0da;
  border-bottom: 1px solid #c8d0da;
}

@media (max-width: 760px) {
  .user-customization-dialog { width: calc(100vw - 20px); height: calc(100vh - 20px); }
  .user-customization-main { grid-template-columns: 1fr; grid-template-rows: minmax(150px, 34%) minmax(0, 1fr); }
}
```

- [ ] **Step 7: Run UI and source-contract tests**

Run: `npm test -- src/UserCustomizationManagerDialog.test.tsx src/appPersistenceLibraryExport.test.ts`

Expected: PASS.

- [ ] **Step 8: Commit the UI**

```powershell
git add -- src/UserCustomizationManagerDialog.tsx src/UserCustomizationManagerDialog.test.tsx src/App.tsx src/appExtracted/appView.tsx src/styles.css src/appPersistenceLibraryExport.test.ts
git commit -m "feat: add user customization manager dialog"
```

## Task 6: End-To-End Safety And Regression Coverage

**Files:**
- Modify: `src/userCustomizations.test.ts`
- Modify: `src/appUserCustomizationFactories.test.ts`
- Modify: `src/appPersistenceLibraryExport.test.ts`
- Modify: `src/UserCustomizationManagerDialog.test.tsx`

- [ ] **Step 1: Add regression tests for protected assets and orphaned devices**

```ts
test("marks referenced user assets as protected", () => {
  const ids = collectReferencedUserAssetIds({
    nodes: [{ params: { backgroundImageAssetId: "img-used" } }],
    schemes: [],
    deviceLibrary: emptyUserDeviceLibrary()
  } as any);
  expect(ids).toEqual(new Set(["img-used"]));
});

test("does not reconcile an orphaned drawn device when its template is removed", () => {
  const orphan = { id: "orphan-1", kind: "removed-custom-kind", name: "已删除定义的设备", position: { x: 0, y: 0 }, size: { width: 80, height: 48 }, params: {}, terminals: [] } as any;
  const result = reconcileNodesAfterCustomizationChange([orphan], new Map(), new Map());
  expect(result.nodes[0]).toBe(orphan);
  expect(result.changed).toBe(false);
});
```

- [ ] **Step 2: Add validation tests**

Cover invalid package format, future version, duplicate stable IDs, invalid/empty asset data URLs for export/import, and same-name conflicts. Assert validation completes before any persistence mock is called.

- [ ] **Step 3: Run the complete focused suite**

Run:

```powershell
npm test -- src/userCustomizations.test.ts src/appUserCustomizationFactories.test.ts src/UserCustomizationManagerDialog.test.tsx src/appPersistenceLibraryExport.test.ts
```

Expected: PASS with no unhandled promise rejections.

- [ ] **Step 4: Run the full unit suite**

Run: `npm test`

Expected: all Vitest suites pass.

- [ ] **Step 5: Run the production build**

Run: `npm run build`

Expected: TypeScript and Vite build complete successfully.

- [ ] **Step 6: Run GitNexus change detection before the final commit**

Run:

```powershell
node .gitnexus/run.cjs detect_changes --scope compare --base-ref main --repo graph_modeling_platform
```

Expected: changed symbols and flows are limited to library package creation/import, customization persistence, component-library toolbar rendering, and the new manager component. Investigate any unrelated flow before committing.

- [ ] **Step 7: Commit final test adjustments**

```powershell
git add -- src/userCustomizations.test.ts src/appUserCustomizationFactories.test.ts src/UserCustomizationManagerDialog.test.tsx src/appPersistenceLibraryExport.test.ts
git commit -m "test: cover customization recovery workflows"
```

## Task 7: Browser Verification, Push, And WEB Restart

**Files:**
- No source changes expected unless verification exposes a defect.

- [ ] **Step 1: Start or restart the backend and frontend**

Use hidden Windows processes and preserve logs outside tracked source files. Verify ports before starting; use `5174` for the backend and `5173` for the frontend when available.

Expected URLs:

- Frontend: `http://127.0.0.1:5173/`
- Backend health/API: `http://127.0.0.1:5174/api/device-library`

- [ ] **Step 2: Verify the manager visually**

Use Playwright at desktop `1440x900` and mobile `390x844` viewports. Verify:

- The manager opens from the component-library toolbar.
- The title, summary, tree, table, and footer fit without overlap.
- Search, domain switching, selection, and close work.
- Import preview switches between replacement and incremental counts.
- Busy state disables close and destructive commands.

- [ ] **Step 3: Verify workflows with a disposable customization**

1. Add a temporary custom category and custom device.
2. Open the manager and verify both rows/counts.
3. Export all and verify the success alert.
4. Restore the temporary device and verify it disappears from the library but an already-drawn instance remains visible.
5. Import the backup incrementally and verify the device returns.
6. Import the same backup with replacement and verify no duplicates appear.

- [ ] **Step 4: Re-run final checks after browser verification**

Run:

```powershell
npm test
npm run build
node .gitnexus/run.cjs detect_changes --scope compare --base-ref main --repo graph_modeling_platform
git status --short
```

Expected: tests/build pass; only intended tracked files differ from `main`; unrelated pre-existing untracked files remain untouched.

- [ ] **Step 5: Push the current branch**

Run:

```powershell
git push origin main
```

Expected: remote `main` advances to the final local commit.

- [ ] **Step 6: Confirm restarted services**

Run HTTP checks for both URLs and report status codes, process IDs, final commit hash, pushed branch, and any residual risk.
