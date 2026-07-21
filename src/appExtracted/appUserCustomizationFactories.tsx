import type { ChangeEvent } from "react";
import { deviceDefinitionOverrideForTemplate } from "../customDeviceUtils";
import {
  createLibraryPackage,
  type LibraryPackagePayload
} from "./appPersistenceLibraryExport";
import type { ImageAsset } from "./appCoreCanvasUtilities";
import {
  applyDeviceTemplateDefinitionOverride,
  DEVICE_LIBRARY,
  type DeviceTemplate
} from "../model";
import { reconcileProjectMeasurementsWithConfig } from "../measurements";
import {
  buildUserCustomizationInventory,
  collectReferencedUserAssetIds,
  mergeUserCustomizationSnapshots,
  normalizeUserCustomizationSnapshot,
  previewUserCustomizationImport,
  reconcileNodesAfterCustomizationChange,
  restoreUserCustomizationItems,
  runUserCustomizationTransaction,
  userCustomizationAssetIsBuiltIn,
  type UserCustomizationImportMode,
  type UserCustomizationSnapshot
} from "../userCustomizations";

const alertUser = (scope: Record<string, any>, message: string) => {
  if (typeof scope.alertUser === "function") {
    scope.alertUser(message);
    return;
  }
  window.alert(message);
};

const confirmUser = (scope: Record<string, any>, message: string) => {
  if (typeof scope.confirmUser === "function") {
    return Boolean(scope.confirmUser(message));
  }
  return window.confirm(message);
};

const errorMessage = (error: unknown, fallback: string) => error instanceof Error ? error.message : fallback;

const effectiveTemplateMap = (snapshot: UserCustomizationSnapshot) => {
  const templates = [...DEVICE_LIBRARY, ...snapshot.deviceLibrary.customDeviceTemplates];
  return new Map<string, DeviceTemplate>(templates.map((template) => [
    template.kind,
    applyDeviceTemplateDefinitionOverride(
      template,
      deviceDefinitionOverrideForTemplate(template, snapshot.deviceLibrary.deviceDefinitionOverrides)
    )
  ]));
};

export function userCustomizationSnapshotFromLibraryPackage(
  payload: LibraryPackagePayload
): Partial<UserCustomizationSnapshot> {
  const result: Partial<UserCustomizationSnapshot> = {};
  if (payload.deviceLibrary) {
    result.deviceLibrary = payload.deviceLibrary;
  }
  if (payload.measurementConfig) {
    result.measurementConfig = payload.measurementConfig;
  }
  if (payload.colorConfig) {
    result.colorConfig = payload.colorConfig;
  }
  if (payload.iconLibrary) {
    result.imageLibrary = payload.iconLibrary;
  }
  return result;
}

export function createCaptureUserCustomizationSnapshot(scope: Record<string, any>) {
  return async (includeAssetData: boolean): Promise<UserCustomizationSnapshot> => {
    const [folders, backendAssets] = await Promise.all([
      scope.fetchBackendImageFolders(),
      scope.fetchAllBackendImages()
    ]);
    const assets = (backendAssets as ImageAsset[]).filter((asset) => !userCustomizationAssetIsBuiltIn(asset));
    const portableAssets = includeAssetData
      ? await Promise.all(assets.map(async (asset) => ({
        ...asset,
        dataUrl: await scope.fetchBackendImageDataUrl(asset)
      })))
      : assets;
    return normalizeUserCustomizationSnapshot({
      deviceLibrary: scope.currentDeviceLibraryPersistencePayload(),
      measurementConfig: scope.measurementConfigDraftRef?.current ?? scope.measurementConfigDraft ?? scope.measurementConfig,
      colorConfig: {
        colorDisplayMode: scope.colorDisplayMode,
        colorPalette: scope.colorPalette
      },
      imageLibrary: { folders, assets: portableAssets }
    });
  };
}

export function createPersistUserCustomizationSnapshot(scope: Record<string, any>) {
  return async (
    targetValue: UserCustomizationSnapshot,
    options: { replaceAssets: boolean; protectedAssetIds?: ReadonlySet<string> }
  ) => {
    const target = normalizeUserCustomizationSnapshot(targetValue);
    await scope.saveBackendDeviceLibraryPayload(scope.serializeDeviceLibraryForStorage(target.deviceLibrary));
    await scope.saveBackendMeasurementConfigPayload(scope.serializeMeasurementConfigForStorage(target.measurementConfig));
    await scope.saveBackendColorConfigPayload(scope.serializeColorConfigForStorage(
      target.colorConfig.colorDisplayMode,
      target.colorConfig.colorPalette
    ));

    const currentAssets = (await scope.fetchAllBackendImages() as ImageAsset[])
      .filter((asset) => !userCustomizationAssetIsBuiltIn(asset));
    const targetIds = new Set(target.imageLibrary.assets.map((asset) => asset.id));
    if (options.replaceAssets) {
      for (const asset of currentAssets) {
        if (!targetIds.has(asset.id) && !options.protectedAssetIds?.has(asset.id)) {
          await scope.deleteBackendImageAsset(asset.id);
        }
      }
    }

    const portableAssets = target.imageLibrary.assets.filter((asset) => Boolean(asset.dataUrl));
    if (portableAssets.length > 0) {
      await scope.importBackendImageLibraryPayload({
        folders: target.imageLibrary.folders,
        assets: portableAssets
      });
    }

    if (options.replaceAssets && typeof scope.deleteBackendImageFolder === "function") {
      const currentFolders = await scope.fetchBackendImageFolders();
      const targetFolderIds = new Set(target.imageLibrary.folders.map((folder) => folder.id));
      const retainedFolderIds = new Set(
        currentAssets
          .filter((asset) => targetIds.has(asset.id) || options.protectedAssetIds?.has(asset.id))
          .map((asset) => asset.folderId || "root")
      );
      for (const folder of currentFolders) {
        if (
          folder.id !== "root" &&
          folder.id !== "builtin-shared-icons" &&
          !targetFolderIds.has(folder.id) &&
          !retainedFolderIds.has(folder.id)
        ) {
          await scope.deleteBackendImageFolder(folder.id);
        }
      }
    }
  };
}

export function createApplyUserCustomizationSnapshotToState(scope: Record<string, any>) {
  return (targetValue: UserCustomizationSnapshot) => {
    const target = normalizeUserCustomizationSnapshot(targetValue);
    const devicePayload = scope.serializeDeviceLibraryForStorage(target.deviceLibrary);
    const measurementPayload = scope.serializeMeasurementConfigForStorage(target.measurementConfig);
    const colorPayload = scope.serializeColorConfigForStorage(
      target.colorConfig.colorDisplayMode,
      target.colorConfig.colorPalette
    );

    scope.writeLocalDeviceLibraryPersistencePayload?.(target.deviceLibrary);
    scope.setCustomDeviceTemplates?.(target.deviceLibrary.customDeviceTemplates);
    scope.setCustomCategoryLibraries?.(target.deviceLibrary.customCategoryLibraries);
    scope.setCustomComponentLibraries?.(target.deviceLibrary.customComponentLibraries);
    scope.setDeviceDefinitionOverrides?.(target.deviceLibrary.deviceDefinitionOverrides);
    scope.setEDeviceDefinitionLabels?.(target.deviceLibrary.eDeviceDefinitionLabels ?? {});
    scope.setEDeviceDefinitionClassExportEnabled?.(target.deviceLibrary.eDeviceDefinitionClassExportEnabled ?? {});
    scope.setCustomGraphTemplateTypes?.(target.deviceLibrary.customGraphTemplateTypes);
    scope.setCustomGraphTemplates?.(target.deviceLibrary.customGraphTemplates);
    if (scope.lastPersistedDeviceLibraryPayloadRef) {
      scope.lastPersistedDeviceLibraryPayloadRef.current = devicePayload;
    }
    if (scope.backendDeviceLibraryLoadedRef) {
      scope.backendDeviceLibraryLoadedRef.current = true;
    }

    scope.writeMeasurementConfig?.(target.measurementConfig);
    scope.setMeasurementConfig?.(target.measurementConfig);
    if (scope.measurementConfigDraftRef) {
      scope.measurementConfigDraftRef.current = scope.measurementConfigDialogOpen ? target.measurementConfig : null;
    }
    scope.setMeasurementConfigDraft?.(scope.measurementConfigDialogOpen ? target.measurementConfig : null);
    scope.setMeasurementConfigSaveStatus?.("saved");
    if (scope.lastPersistedMeasurementConfigPayloadRef) {
      scope.lastPersistedMeasurementConfigPayloadRef.current = measurementPayload;
    }
    if (scope.backendMeasurementConfigLoadedRef) {
      scope.backendMeasurementConfigLoadedRef.current = true;
    }

    scope.setColorDisplayMode?.(target.colorConfig.colorDisplayMode);
    scope.setColorPalette?.(target.colorConfig.colorPalette);
    scope.setColorPaletteDraft?.(target.colorConfig.colorPalette);
    scope.setColorPaletteTab?.(target.colorConfig.colorDisplayMode);
    if (scope.lastPersistedColorConfigPayloadRef) {
      scope.lastPersistedColorConfigPayloadRef.current = colorPayload;
    }
    if (scope.backendColorConfigLoadedRef) {
      scope.backendColorConfigLoadedRef.current = true;
    }
  };
}

export function createReconcileOpenModelAfterCustomizationChange(scope: Record<string, any>) {
  return (beforeValue: UserCustomizationSnapshot, targetValue: UserCustomizationSnapshot) => {
    const before = normalizeUserCustomizationSnapshot(beforeValue);
    const target = normalizeUserCustomizationSnapshot(targetValue);
    const reconciledNodes = reconcileNodesAfterCustomizationChange(
      scope.nodes ?? [],
      effectiveTemplateMap(before),
      effectiveTemplateMap(target)
    );
    const nextMeasurements = reconcileProjectMeasurementsWithConfig(
      scope.projectMeasurements,
      reconciledNodes.nodes,
      target.measurementConfig,
      before.measurementConfig
    );
    const measurementsChanged = nextMeasurements !== scope.projectMeasurements;
    if (!reconciledNodes.changed && !measurementsChanged) {
      return false;
    }
    scope.pushUndoSnapshot?.();
    if (reconciledNodes.changed) {
      scope.setGraphArrays?.(reconciledNodes.nodes, scope.edges ?? []);
    }
    if (measurementsChanged) {
      scope.setProjectMeasurements?.(nextMeasurements);
    }
    return true;
  };
}

export function createRefreshUserCustomizationManager(scope: Record<string, any>) {
  return async () => {
    const snapshot = await scope.captureUserCustomizationSnapshot(false);
    scope.setUserCustomizationSnapshotView?.(snapshot);
    scope.setUserCustomizationAssets?.(snapshot.imageLibrary.assets);
    return snapshot;
  };
}

export function createSaveUserCustomizationSnapshotFile(scope: Record<string, any>) {
  return async (snapshotValue: UserCustomizationSnapshot, label: string) => {
    const snapshot = normalizeUserCustomizationSnapshot(snapshotValue);
    const protectedAssetIds = scope.referencedUserAssetIds ?? new Set<string>();
    const inventory = buildUserCustomizationInventory(snapshot, DEVICE_LIBRARY, protectedAssetIds);
    const packagePayload = createLibraryPackage({
      scope: "all",
      measurementConfig: snapshot.measurementConfig,
      deviceLibrary: snapshot.deviceLibrary,
      iconLibrary: snapshot.imageLibrary as any,
      colorConfig: snapshot.colorConfig,
      manifest: {
        total: inventory.summary.total,
        domainCounts: inventory.countsByDomain,
        applicationVersion: scope.applicationVersion
      }
    });
    return scope.saveTextFile({
      filename: `${label}-${scope.timestampForLibraryPackageFilename()}.json`,
      text: JSON.stringify(packagePayload, null, 2),
      mime: "application/json",
      description: "图形建模平台用户自定义文件",
      extensions: [".json"]
    });
  };
}

export function createApplyUserCustomizationSnapshot(scope: Record<string, any>) {
  return async (targetValue: UserCustomizationSnapshot, actionLabel: string) => {
    const target = normalizeUserCustomizationSnapshot(targetValue);
    const before = await scope.captureUserCustomizationSnapshot(true);
    const backupSaved = await scope.saveUserCustomizationSnapshotFile(before, `操作前备份-${actionLabel}`);
    if (!backupSaved) {
      throw new Error("未完成操作前备份，已取消本次操作。");
    }
    scope.setUserCustomizationBusy?.(true);
    scope.setUserCustomizationStatus?.(`${actionLabel}处理中...`);
    try {
      await runUserCustomizationTransaction({
        before,
        target,
        apply: (snapshot) => scope.persistUserCustomizationSnapshot(snapshot, {
          replaceAssets: true,
          protectedAssetIds: scope.referencedUserAssetIds ?? new Set<string>()
        }),
        rollback: (snapshot) => scope.persistUserCustomizationSnapshot(snapshot, {
          replaceAssets: true,
          protectedAssetIds: new Set<string>()
        })
      });
      scope.applyUserCustomizationSnapshotToState(target);
      scope.reconcileOpenModelAfterCustomizationChange(before, target);
      await scope.refreshUserCustomizationManager();
      scope.setUserCustomizationStatus?.(`${actionLabel}成功`);
      alertUser(scope, `${actionLabel}成功。`);
      return true;
    } catch (error) {
      scope.applyUserCustomizationSnapshotToState(before);
      await scope.refreshUserCustomizationManager().catch(() => undefined);
      scope.setUserCustomizationStatus?.(`${actionLabel}失败`);
      throw error;
    } finally {
      scope.setUserCustomizationBusy?.(false);
    }
  };
}

export function createExportAllUserCustomizations(scope: Record<string, any>) {
  return async () => {
    scope.setUserCustomizationBusy?.(true);
    scope.setUserCustomizationStatus?.("正在导出用户自定义...");
    try {
      const snapshot = await scope.captureUserCustomizationSnapshot(true);
      const saved = await scope.saveUserCustomizationSnapshotFile(snapshot, "用户自定义");
      if (saved) {
        const count = buildUserCustomizationInventory(snapshot, DEVICE_LIBRARY, scope.referencedUserAssetIds).summary.total;
        scope.setUserCustomizationStatus?.(`已导出 ${count} 项用户自定义`);
        alertUser(scope, `用户自定义导出成功，共 ${count} 项。`);
      }
      return saved;
    } catch (error) {
      const message = errorMessage(error, "导出用户自定义失败。");
      scope.setUserCustomizationStatus?.(message);
      alertUser(scope, message);
      return false;
    } finally {
      scope.setUserCustomizationBusy?.(false);
    }
  };
}

export function createOpenUserCustomizationManager(scope: Record<string, any>) {
  return async () => {
    scope.setUserCustomizationManagerOpen(true);
    scope.setPendingUserCustomizationImport(null);
    scope.setUserCustomizationStatus("正在读取用户自定义...");
    scope.setUserCustomizationBusy(true);
    try {
      await scope.refreshUserCustomizationManager();
      scope.setUserCustomizationStatus("");
    } catch (error) {
      scope.setUserCustomizationStatus(errorMessage(error, "读取用户自定义失败。"));
    } finally {
      scope.setUserCustomizationBusy(false);
    }
  };
}

export function createCloseUserCustomizationManager(scope: Record<string, any>) {
  return () => {
    if (scope.userCustomizationBusy) {
      return;
    }
    scope.setPendingUserCustomizationImport(null);
    scope.setUserCustomizationManagerOpen(false);
  };
}

export function createOpenUserCustomizationImportFilePicker(scope: Record<string, any>) {
  return () => {
    const input = scope.userCustomizationImportInputRef?.current as HTMLInputElement | null;
    if (!input) {
      return;
    }
    input.value = "";
    input.click();
  };
}

export function createImportUserCustomizationFile(scope: Record<string, any>) {
  return (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) {
      return;
    }
    void (async () => {
      const packagePayload = scope.normalizeLibraryPackage(JSON.parse(await file.text()));
      const imported = userCustomizationSnapshotFromLibraryPackage(packagePayload);
      if (Object.keys(imported).length === 0) {
        throw new Error("导入文件中没有可用的用户自定义数据。");
      }
      const current = await scope.captureUserCustomizationSnapshot(false);
      const mode: UserCustomizationImportMode = "replace";
      scope.setPendingUserCustomizationImport({
        fileName: file.name,
        imported,
        mode,
        preview: previewUserCustomizationImport(current, imported, mode)
      });
      scope.setUserCustomizationStatus("已完成导入预检，请确认导入方式。");
    })().catch((error) => {
      const message = errorMessage(error, "读取用户自定义文件失败。");
      scope.setUserCustomizationStatus(message);
      alertUser(scope, message);
    });
  };
}

export function createChangePendingUserCustomizationImportMode(scope: Record<string, any>) {
  return async (mode: UserCustomizationImportMode) => {
    const pending = scope.pendingUserCustomizationImport;
    if (!pending) {
      return;
    }
    const current = await scope.captureUserCustomizationSnapshot(false);
    scope.setPendingUserCustomizationImport({
      ...pending,
      mode,
      preview: previewUserCustomizationImport(current, pending.imported, mode)
    });
  };
}

export function createConfirmUserCustomizationImport(scope: Record<string, any>) {
  return async () => {
    const pending = scope.pendingUserCustomizationImport;
    if (!pending) {
      return;
    }
    const modeLabel = pending.mode === "replace" ? "整体替换" : "增量更新";
    const preview = pending.preview;
    if (!confirmUser(scope, `确定以“${modeLabel}”方式导入吗？新增 ${preview.additions} 项，更新或删除 ${preview.updates} 项，冲突 ${preview.conflicts.length} 项。`)) {
      return;
    }
    try {
      await scope.applyUserCustomizationSnapshot(preview.target, `导入用户自定义（${modeLabel}）`);
      scope.setPendingUserCustomizationImport(null);
    } catch (error) {
      alertUser(scope, errorMessage(error, "导入用户自定义失败。"));
    }
  };
}

export function createCancelPendingUserCustomizationImport(scope: Record<string, any>) {
  return () => {
    if (!scope.userCustomizationBusy) {
      scope.setPendingUserCustomizationImport(null);
      scope.setUserCustomizationStatus("");
    }
  };
}

export function createRestoreUserCustomizations(scope: Record<string, any>) {
  return async (itemKeys: readonly string[]) => {
    const uniqueKeys = [...new Set(itemKeys)];
    if (uniqueKeys.length === 0) {
      return;
    }
    const current = await scope.captureUserCustomizationSnapshot(true);
    const target = restoreUserCustomizationItems(current, uniqueKeys);
    const beforeCount = buildUserCustomizationInventory(current, DEVICE_LIBRARY, scope.referencedUserAssetIds).summary.total;
    const afterCount = buildUserCustomizationInventory(target, DEVICE_LIBRARY, scope.referencedUserAssetIds).summary.total;
    const affected = Math.max(0, beforeCount - afterCount);
    if (affected === 0) {
      alertUser(scope, "所选内容无需恢复。");
      return;
    }
    if (!confirmUser(scope, `确定恢复所选用户自定义内容吗？预计影响 ${affected} 项；现有模型中的设备和量测实例不会被删除。`)) {
      return;
    }
    try {
      await scope.applyUserCustomizationSnapshot(target, "恢复用户自定义");
    } catch (error) {
      alertUser(scope, errorMessage(error, "恢复用户自定义失败。"));
    }
  };
}

export function createReferencedUserAssetIds(scope: Record<string, any>) {
  return collectReferencedUserAssetIds({
    nodes: scope.nodes,
    projectMeasurements: scope.projectMeasurements,
    schemes: scope.schemes,
    deviceLibrary: scope.currentDeviceLibraryPersistencePayload()
  });
}

export function createMergedUserCustomizationSnapshot(
  current: UserCustomizationSnapshot,
  imported: Partial<UserCustomizationSnapshot>,
  mode: UserCustomizationImportMode
) {
  return mergeUserCustomizationSnapshots(current, imported, mode);
}
