/**
 * 图元库数据迁移工具
 *
 * 将 localStorage 中的图元库数据迁移到 IndexedDB。
 * 支持双写过渡、回滚机制和迁移状态追踪。
 */

import { initDeviceLibraryDB, clearDeviceLibraryDB } from "./deviceLibraryDB";
import {
  saveDeviceTemplate,
  saveGraphTemplate,
  saveOverride,
  saveDeviceTemplates,
  saveGraphTemplates,
  saveOverrides
} from "./deviceLibraryStorage";
import {
  CUSTOM_DEVICE_LIBRARY_STORAGE_KEY,
  CUSTOM_GRAPH_TEMPLATES_STORAGE_KEY,
  DEVICE_DEFINITION_OVERRIDES_STORAGE_KEY
} from "../appExtracted/appCoreCanvasUtilities";
import type { DeviceTemplate } from "../model";
import type { GraphTemplate } from "../appExtracted/appCoreCanvasUtilities";

/**
 * 从 localStorage 读取自定义设备模板
 */
function readCustomDeviceTemplatesFromLocalStorage(): DeviceTemplate[] {
  try {
    const raw = window.localStorage.getItem(CUSTOM_DEVICE_LIBRARY_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * 从 localStorage 读取图元模板
 */
function readCustomGraphTemplatesFromLocalStorage(): GraphTemplate[] {
  try {
    const raw = window.localStorage.getItem(CUSTOM_GRAPH_TEMPLATES_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * 从 localStorage 读取设备定义覆盖
 */
function readDeviceDefinitionOverridesFromLocalStorage(): Record<string, any> {
  try {
    const raw = window.localStorage.getItem(DEVICE_DEFINITION_OVERRIDES_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

/**
 * 迁移结果
 */
export interface MigrationResult {
  success: boolean;
  migrated: {
    templates: number;
    graphTemplates: number;
    overrides: number;
  };
  errors: string[];
  duration: number; // 毫秒
}

/**
 * 将 dataUrl 转换为 Blob
 */
function dataUrlToBlob(dataUrl: string): Blob {
  const [metadata, base64] = dataUrl.split(",");
  const mime = metadata.match(/:(.*?);/)?.[1] ?? "application/octet-stream";
  const binary = atob(base64);
  const array = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    array[i] = binary.charCodeAt(i);
  }
  return new Blob([array], { type: mime });
}

/**
 * 执行数据迁移：localStorage → IndexedDB
 *
 * @param options 迁移选项
 * @returns 迁移结果
 */
export async function migrateFromLocalStorage(options: {
  force?: boolean; // 强制重新迁移（即使已完成）
  batchSize?: number; // 批量处理大小
} = {}): Promise<MigrationResult> {
  const startTime = Date.now();
  const { force = false, batchSize = 50 } = options;

  const db = await initDeviceLibraryDB();
  const errors: string[] = [];
  const migrated = { templates: 0, graphTemplates: 0, overrides: 0 };

  try {
    // 检查是否已迁移
    if (!force) {
      const migrationStatus = await db.get("migration", "deviceLibrary");
      if (migrationStatus?.completed) {
        return {
          success: true,
          migrated,
          errors: ["Already migrated"],
          duration: Date.now() - startTime
        };
      }
    }

    // 清空 IndexedDB（如果是强制迁移）
    if (force) {
      await clearDeviceLibraryDB();
    }

    // 1. 迁移自定义设备模板
    const templates = readCustomDeviceTemplatesFromLocalStorage();
    for (let i = 0; i < templates.length; i += batchSize) {
      const batch = templates.slice(i, i + batchSize);
      for (const template of batch) {
        try {
          // 提取图片 base64 并转换为 Blob
          const imageBlobs: Record<string, Blob> = {};

          if (template.params.backgroundImage?.startsWith("data:")) {
            imageBlobs.backgroundImage = dataUrlToBlob(template.params.backgroundImage);
          }
          if (template.params.foregroundImage?.startsWith("data:")) {
            imageBlobs.foregroundImage = dataUrlToBlob(template.params.foregroundImage);
          }

          await saveDeviceTemplate(template, Object.keys(imageBlobs).length > 0 ? imageBlobs : undefined);
          migrated.templates++;
        } catch (error) {
          errors.push(`Failed to migrate template ${template.kind}: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
    }

    // 2. 迁移图元模板
    const graphTemplates = readCustomGraphTemplatesFromLocalStorage();
    for (let i = 0; i < graphTemplates.length; i += batchSize) {
      const batch = graphTemplates.slice(i, i + batchSize);
      try {
        await saveGraphTemplates(batch);
        migrated.graphTemplates += batch.length;
      } catch (error) {
        errors.push(`Failed to migrate graph templates batch: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    // 3. 迁移设备定义覆盖
    const overrides = readDeviceDefinitionOverridesFromLocalStorage();
    const overrideEntries = Object.entries(overrides);
    for (let i = 0; i < overrideEntries.length; i += batchSize) {
      const batch = Object.fromEntries(overrideEntries.slice(i, i + batchSize));
      try {
        await saveOverrides(batch);
        migrated.overrides += Object.keys(batch).length;
      } catch (error) {
        errors.push(`Failed to migrate overrides batch: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    // 标记迁移完成
    await db.put("migration", {
      key: "deviceLibrary",
      completed: true,
      timestamp: Date.now(),
      migrated
    });

    return {
      success: errors.length === 0,
      migrated,
      errors,
      duration: Date.now() - startTime
    };
  } catch (error) {
    return {
      success: false,
      migrated,
      errors: [...errors, `Migration failed: ${error instanceof Error ? error.message : String(error)}`],
      duration: Date.now() - startTime
    };
  }
}

/**
 * 检查迁移状态
 */
export async function getMigrationStatus(): Promise<{
  completed: boolean;
  timestamp?: number;
  migrated?: {
    templates: number;
    graphTemplates: number;
    overrides: number;
  };
} | null> {
  try {
    const db = await initDeviceLibraryDB();
    const status = await db.get("migration", "deviceLibrary");
    return status ?? null;
  } catch {
    return null;
  }
}

/**
 * 回滚迁移
 *
 * 清除 IndexedDB 中的迁移状态，但保留数据。
 * 下次启动时会重新迁移。
 */
export async function rollbackMigration(): Promise<void> {
  const db = await initDeviceLibraryDB();
  await db.delete("migration", "deviceLibrary");
}

/**
 * 完全回滚：清除 IndexedDB 数据和迁移状态
 */
export async function fullRollback(): Promise<void> {
  await clearDeviceLibraryDB();
}

/**
 * 验证迁移完整性
 *
 * 比较 localStorage 和 IndexedDB 中的数据数量
 */
export async function verifyMigrationIntegrity(): Promise<{
  valid: boolean;
  localStorage: {
    templates: number;
    graphTemplates: number;
    overrides: number;
  };
  indexedDB: {
    templates: number;
    graphTemplates: number;
    overrides: number;
  };
  mismatches: string[];
}> {
  const db = await initDeviceLibraryDB();

  // 读取 localStorage 数据
  const lsTemplates = readCustomDeviceTemplatesFromLocalStorage();
  const lsGraphTemplates = readCustomGraphTemplatesFromLocalStorage();
  const lsOverrides = readDeviceDefinitionOverridesFromLocalStorage();

  // 读取 IndexedDB 数据
  const idbTemplates = await db.getAll("templates");
  const idbGraphTemplates = await db.getAll("graphTemplates");
  const idbOverrides = await db.getAll("overrides");

  const mismatches: string[] = [];

  if (lsTemplates.length !== idbTemplates.length) {
    mismatches.push(`Templates: localStorage=${lsTemplates.length}, IndexedDB=${idbTemplates.length}`);
  }

  if (lsGraphTemplates.length !== idbGraphTemplates.length) {
    mismatches.push(`GraphTemplates: localStorage=${lsGraphTemplates.length}, IndexedDB=${idbGraphTemplates.length}`);
  }

  if (Object.keys(lsOverrides).length !== idbOverrides.length) {
    mismatches.push(`Overrides: localStorage=${Object.keys(lsOverrides).length}, IndexedDB=${idbOverrides.length}`);
  }

  return {
    valid: mismatches.length === 0,
    localStorage: {
      templates: lsTemplates.length,
      graphTemplates: lsGraphTemplates.length,
      overrides: Object.keys(lsOverrides).length
    },
    indexedDB: {
      templates: idbTemplates.length,
      graphTemplates: idbGraphTemplates.length,
      overrides: idbOverrides.length
    },
    mismatches
  };
}
