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
 * 单项 localStorage 解析失败时收集到 errors 的描述（不含 message）
 */
const LOCAL_STORAGE_PARSE_ERROR_LABELS: Record<string, string> = {
  [CUSTOM_DEVICE_LIBRARY_STORAGE_KEY]: "custom device templates",
  [CUSTOM_GRAPH_TEMPLATES_STORAGE_KEY]: "graph templates",
  [DEVICE_DEFINITION_OVERRIDES_STORAGE_KEY]: "device definition overrides"
};

/**
 * localStorage 读取 + JSON.parse 的公共外壳
 *
 * 损坏的数据**不参与**本趟迁移（返回 fallback：[] / {}），让其余步骤继续跑完 ——
 * 但**必须留痕**：回退值本身就是 0 条 / 空对象，若解析失败也静默返回，
 * 损坏数据会以「0 条」的形式被计入 migrated，而 `completed` 又只取决于 errors
 * 是否为空，结果整趟迁移会被标成成功，问题既不可见也不再重试。
 *
 * 副作用：解析失败会给 errors 追加一条，故这三个读取函数在
 * `verifyMigrationIntegrity` 里同样只在本地丢弃该详情
 * （返回类型不变，公开 API 不变）。
 */
function readLocalStorageJson<T>(storageKey: string, fallback: T): { value: T; error: string | null } {
  const label = LOCAL_STORAGE_PARSE_ERROR_LABELS[storageKey] ?? storageKey;
  const describe = (error: unknown) => error instanceof Error ? error.message : String(error);

  let raw: string | null;
  try {
    raw = window.localStorage.getItem(storageKey);
  } catch (error) {
    // 读键本身失败（隐私模式 / 配额 / 被禁用）与解析失败同源：数据不可得，必须留痕。
    return { value: fallback, error: `Failed to read ${label} from localStorage: ${describe(error)}` };
  }
  if (!raw) return { value: fallback, error: null };
  try {
    return { value: JSON.parse(raw) as T, error: null };
  } catch (error) {
    return { value: fallback, error: `Failed to parse ${label} from localStorage: ${describe(error)}` };
  }
}

/**
 * 从 localStorage 读取自定义设备模板
 */
function readCustomDeviceTemplatesFromLocalStorage(): { templates: DeviceTemplate[]; error: string | null } {
  const read = readLocalStorageJson<DeviceTemplate[]>(CUSTOM_DEVICE_LIBRARY_STORAGE_KEY, []);
  return { templates: read.value, error: read.error };
}

/**
 * 从 localStorage 读取图元模板
 */
function readCustomGraphTemplatesFromLocalStorage(): { templates: GraphTemplate[]; error: string | null } {
  const read = readLocalStorageJson<GraphTemplate[]>(CUSTOM_GRAPH_TEMPLATES_STORAGE_KEY, []);
  return { templates: read.value, error: read.error };
}

/**
 * 从 localStorage 读取设备定义覆盖
 */
function readDeviceDefinitionOverridesFromLocalStorage(): { overrides: Record<string, any>; error: string | null } {
  const read = readLocalStorageJson<Record<string, any>>(DEVICE_DEFINITION_OVERRIDES_STORAGE_KEY, {});
  return { overrides: read.value, error: read.error };
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
 *
 * 返回 null 表示 dataUrl 畸形：没有逗号分隔 metadata 与 base64 载荷，
 * 此时 `split(",")` 只解出 metadata，base64 为 undefined，
 * `atob(undefined)` 会抛 InvalidCharacterError。调用点据此**跳过该图**
 * （沿用本文件既有的 `startsWith("data:")` 跳过写法），而不是让异常
 * 冒到 migrateFromLocalStorage 的顶层 catch 打断整趟迁移 ——
 * 后续模板的图片、图元模板、设备定义覆盖全都会被跳过。
 *
 * 合法的 data URL 必含逗号，所以这里的守卫对合法输入路径逐字无影响。
 */
function dataUrlToBlob(dataUrl: string): Blob | null {
  const [metadata, base64] = dataUrl.split(",");
  if (base64 === undefined) return null;
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
    // 三项读取各自带回一条可能为 null 的解析错误：null 表示这条数据可读，
    // 非 null 表示该 localStorage 键损坏、被按空值处理，但损坏这件事本身要计入 errors。
    const rawTemplatesRead = readCustomDeviceTemplatesFromLocalStorage();
    const overridesRead = readDeviceDefinitionOverridesFromLocalStorage();
    if (rawTemplatesRead.error) errors.push(rawTemplatesRead.error);
    if (overridesRead.error) errors.push(overridesRead.error);
    const rawTemplates = rawTemplatesRead.templates;
    const ownership = normalizeDeviceDefinitionOwnership(
      [...DEVICE_LIBRARY, ...rawTemplates],
      overridesRead.overrides
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
        const backgroundBlob = dataUrlToBlob(template.params.backgroundImage);
        if (backgroundBlob) imageBlobs.backgroundImage = backgroundBlob;
      }
      if (template.params.foregroundImage?.startsWith("data:")) {
        const foregroundBlob = dataUrlToBlob(template.params.foregroundImage);
        if (foregroundBlob) imageBlobs.foregroundImage = foregroundBlob;
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
    const graphTemplatesRead = readCustomGraphTemplatesFromLocalStorage();
    if (graphTemplatesRead.error) errors.push(graphTemplatesRead.error);
    const graphTemplates = graphTemplatesRead.templates;
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
    //
    // completed 只在**真的没有攒到任何错误**时才为真：
    // 部分失败若也标完成，非强制路径下次启动会在 `if (migrationStatus?.completed)` 处
    // 直接早退（`App.tsx:687-688` 亦同），失败的数据永远不会被重试。
    // 记录本身仍然写入（migrated 计数对排查有用），只是 completed 为假 —— 下次启动重跑。
    await db.put("migration", {
      key: "deviceLibrary",
      completed: errors.length === 0,
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
  // 这里同样按空值处理损坏的键（mismatches 会如实报出计数差），
  // 但**不把解析错误塞进 mismatches**：那条账已被 localStorage/indexedDB 两侧的
  // 数量对比完整覆盖，再重复一条只会把「数据没对齐」与「源数据坏了」混为一谈。
  const lsTemplates = readCustomDeviceTemplatesFromLocalStorage().templates;
  const lsGraphTemplates = readCustomGraphTemplatesFromLocalStorage().templates;
  const lsOverrides = readDeviceDefinitionOverridesFromLocalStorage().overrides;

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
