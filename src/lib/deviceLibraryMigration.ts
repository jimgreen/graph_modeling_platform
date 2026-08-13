/**
 * 图元库数据迁移工具
 *
 * 将 localStorage 中的图元库数据迁移到 IndexedDB。
 * 支持双写过渡、回滚机制和迁移状态追踪。
 */

import { initDeviceLibraryDB, clearDeviceLibraryDB } from "./deviceLibraryDB";
import {
  saveDeviceTemplate,
  saveDeviceTemplates,
  saveGraphTemplates,
  saveOverrides
} from "./deviceLibraryStorage";
import {
  CUSTOM_DEVICE_LIBRARY_STORAGE_KEY,
  CUSTOM_GRAPH_TEMPLATES_STORAGE_KEY,
  DEVICE_DEFINITION_OVERRIDES_STORAGE_KEY
} from "../appExtracted/appCoreCanvasUtilities";
import { DEVICE_LIBRARY, type DeviceTemplate } from "../model";
import { normalizeDeviceDefinitionOwnership } from "../customDeviceUtils";
import type { GraphTemplate } from "../appExtracted/appCoreCanvasUtilities";

const DEVICE_LIBRARY_INDEXEDDB_SCHEMA_VERSION = 3;

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
      if (migrationStatus?.completed && Number(migrationStatus.schemaVersion) >= DEVICE_LIBRARY_INDEXEDDB_SCHEMA_VERSION) {
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

    // 参数和量测必须先迁移到共享类，再允许具体图元写入 IndexedDB。
    const rawTemplates = readCustomDeviceTemplatesFromLocalStorage();
    const ownership = normalizeDeviceDefinitionOwnership(
      [...DEVICE_LIBRARY, ...rawTemplates],
      readDeviceDefinitionOverridesFromLocalStorage()
    );
    const templates = ownership.customDeviceTemplates;
    try {
      await saveDeviceTemplates(templates);
      migrated.templates = templates.length;
    } catch (error) {
      errors.push(`Failed to migrate templates: ${error instanceof Error ? error.message : String(error)}`);
    }
    for (const template of templates) {
      const imageBlobs: Record<string, Blob> = {};
      if (template.params.backgroundImage?.startsWith("data:")) {
        imageBlobs.backgroundImage = dataUrlToBlob(template.params.backgroundImage);
      }
      if (template.params.foregroundImage?.startsWith("data:")) {
        imageBlobs.foregroundImage = dataUrlToBlob(template.params.foregroundImage);
      }
      if (Object.keys(imageBlobs).length > 0) {
        try {
          await saveDeviceTemplate(template, imageBlobs);
        } catch (error) {
          errors.push(`Failed to migrate template images ${template.kind}: ${error instanceof Error ? error.message : String(error)}`);
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
    try {
      await saveOverrides(ownership.deviceDefinitionOverrides);
      migrated.overrides = Object.keys(ownership.deviceDefinitionOverrides).length;
    } catch (error) {
      errors.push(`Failed to migrate overrides: ${error instanceof Error ? error.message : String(error)}`);
    }

    // 标记迁移完成
    await db.put("migration", {
      key: "deviceLibrary",
      completed: true,
      schemaVersion: DEVICE_LIBRARY_INDEXEDDB_SCHEMA_VERSION,
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
  schemaVersion?: number;
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
    if (!status) return null;
    return {
      ...status,
      completed: Boolean(status.completed) && Number(status.schemaVersion) >= DEVICE_LIBRARY_INDEXEDDB_SCHEMA_VERSION
    };
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
