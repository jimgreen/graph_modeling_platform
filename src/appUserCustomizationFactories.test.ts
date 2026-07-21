import { describe, expect, test, vi } from "vitest";
import { DEFAULT_COLOR_PALETTE } from "./model";
import { DEFAULT_MEASUREMENT_CONFIG } from "./measurements";
import {
  createApplyUserCustomizationSnapshot,
  createCaptureUserCustomizationSnapshot,
  createPersistUserCustomizationSnapshot,
  userCustomizationSnapshotFromLibraryPackage
} from "./appExtracted/appUserCustomizationFactories";
import { emptyUserDeviceLibrary, normalizeUserCustomizationSnapshot } from "./userCustomizations";
import { apiPath } from "./config";

const snapshot = (assetIds: string[] = []) => normalizeUserCustomizationSnapshot({
  deviceLibrary: emptyUserDeviceLibrary(),
  measurementConfig: DEFAULT_MEASUREMENT_CONFIG,
  colorConfig: { colorDisplayMode: "energy", colorPalette: DEFAULT_COLOR_PALETTE },
  imageLibrary: {
    folders: [{ id: "root", name: "默认文件夹" }],
    assets: assetIds.map((id) => ({
      id,
      name: id,
      folderId: "root",
      url: apiPath(`/images/${id}`),
      dataUrl: "data:image/png;base64,AA=="
    }))
  }
});

describe("user customization application factories", () => {
  test("captures backend user assets and optionally includes portable data", async () => {
    const capture = createCaptureUserCustomizationSnapshot({
      currentDeviceLibraryPersistencePayload: () => emptyUserDeviceLibrary(),
      measurementConfigDraftRef: { current: null },
      measurementConfigDraft: null,
      measurementConfig: DEFAULT_MEASUREMENT_CONFIG,
      colorDisplayMode: "energy",
      colorPalette: DEFAULT_COLOR_PALETTE,
      fetchBackendImageFolders: vi.fn(async () => [
        { id: "root", name: "默认文件夹" },
        { id: "builtin-shared-icons", name: "内置" }
      ]),
      fetchAllBackendImages: vi.fn(async () => [
        { id: "img-user", name: "用户图片", folderId: "root", url: apiPath("/images/img-user") },
        { id: "builtin-shared-icon-1", name: "内置", folderId: "builtin-shared-icons", url: apiPath("/images/builtin") }
      ]),
      fetchBackendImageDataUrl: vi.fn(async () => "data:image/png;base64,AA==")
    });

    const captured = await capture(true);

    expect(captured.imageLibrary.folders.map((folder) => folder.id)).toEqual(["root"]);
    expect(captured.imageLibrary.assets).toEqual([expect.objectContaining({
      id: "img-user",
      dataUrl: "data:image/png;base64,AA=="
    })]);
  });

  test("persists JSON domains before replacing non-protected user assets", async () => {
    const events: string[] = [];
    const persist = createPersistUserCustomizationSnapshot({
      serializeDeviceLibraryForStorage: () => "device",
      serializeMeasurementConfigForStorage: () => "measurement",
      serializeColorConfigForStorage: () => "color",
      saveBackendDeviceLibraryPayload: vi.fn(async () => { events.push("device"); }),
      saveBackendMeasurementConfigPayload: vi.fn(async () => { events.push("measurement"); }),
      saveBackendColorConfigPayload: vi.fn(async () => { events.push("color"); }),
      fetchAllBackendImages: vi.fn(async () => [
        { id: "img-remove", folderId: "root" },
        { id: "img-protected", folderId: "root" },
        { id: "builtin-shared-icon-1", folderId: "builtin-shared-icons" }
      ]),
      deleteBackendImageAsset: vi.fn(async (id: string) => { events.push(`delete:${id}`); }),
      fetchBackendImageFolders: vi.fn(async () => [{ id: "root", name: "默认文件夹" }]),
      deleteBackendImageFolder: vi.fn(async () => undefined),
      importBackendImageLibraryPayload: vi.fn(async () => { events.push("assets"); })
    });

    await persist(snapshot(["img-new"]), {
      replaceAssets: true,
      protectedAssetIds: new Set(["img-protected"])
    });

    expect(events).toEqual([
      "device",
      "measurement",
      "color",
      "delete:img-remove",
      "assets"
    ]);
  });

  test("backs up before apply and restores backend plus local state after a failure", async () => {
    const events: string[] = [];
    const before = snapshot(["img-before"]);
    const target = snapshot(["img-target"]);
    const persistUserCustomizationSnapshot = vi.fn(async (value) => {
      const marker = value.imageLibrary.assets[0]?.id ?? "empty";
      events.push(`persist:${marker}`);
      if (marker === "img-target") {
        throw new Error("measurement write failed");
      }
    });
    const apply = createApplyUserCustomizationSnapshot({
      captureUserCustomizationSnapshot: vi.fn(async () => before),
      saveUserCustomizationSnapshotFile: vi.fn(async () => { events.push("backup"); return true; }),
      persistUserCustomizationSnapshot,
      applyUserCustomizationSnapshotToState: vi.fn((value) => {
        events.push(`state:${value.imageLibrary.assets[0]?.id ?? "empty"}`);
      }),
      reconcileOpenModelAfterCustomizationChange: vi.fn(),
      refreshUserCustomizationManager: vi.fn(async () => undefined),
      setUserCustomizationBusy: vi.fn(),
      setUserCustomizationStatus: vi.fn(),
      referencedUserAssetIds: new Set<string>(),
      alertUser: vi.fn()
    });

    await expect(apply(target, "整体替换")).rejects.toThrow("measurement write failed");

    expect(events).toEqual([
      "backup",
      "persist:img-target",
      "persist:img-before",
      "state:img-before"
    ]);
  });

  test("maps a legacy partial library package without inventing absent domains", () => {
    const partial = userCustomizationSnapshotFromLibraryPackage({
      format: "graph-modeling-platform-library-package",
      version: 2,
      scope: "device-library",
      exportedAt: "2026-07-21T00:00:00.000Z",
      deviceLibrary: emptyUserDeviceLibrary()
    });

    expect(partial.deviceLibrary).toBeDefined();
    expect(partial.measurementConfig).toBeUndefined();
    expect(partial.colorConfig).toBeUndefined();
    expect(partial.imageLibrary).toBeUndefined();
  });
});
