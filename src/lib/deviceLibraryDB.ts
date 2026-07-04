/**
 * 图元库 IndexedDB 基础设施
 *
 * 提供 IndexedDB 初始化、Schema 定义和基础操作。
 * 用于存储自定义设备模板、图元模板、设备定义覆盖等数据。
 */

import { openDB, IDBPDatabase } from "idb";
import type { DeviceTemplate, DeviceTemplateDefinitionOverride } from "../model";
import type { GraphTemplate } from "../appExtracted/appCoreCanvasUtilities";

const DB_NAME = "device-library";
const DB_VERSION = 1;

/**
 * IndexedDB Schema 定义
 * 注意：idb 库使用特殊类型定义，这里简化为 any 以避免复杂的类型推断问题
 */
type DeviceLibraryDBSchema = any;

/**
 * 初始化 IndexedDB 数据库
 *
 * @returns Promise<IDBPDatabase<DeviceLibraryDBSchema>>
 */
export async function initDeviceLibraryDB(): Promise<IDBPDatabase<DeviceLibraryDBSchema>> {
  return openDB<DeviceLibraryDBSchema>(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion, newVersion, transaction) {
      // 1. 自定义设备模板（不含图片 base64）
      if (!db.objectStoreNames.contains("templates")) {
        const templateStore = db.createObjectStore("templates", {
          keyPath: "kind",
          autoIncrement: false
        });
        templateStore.createIndex("attributeLibrary", "attributeLibrary", { unique: false });
        templateStore.createIndex("custom", "custom", { unique: false });
        templateStore.createIndex("updatedAt", "updatedAt", { unique: false });
      }

      // 2. 设备图片（Blob 分离存储）
      if (!db.objectStoreNames.contains("templateImages")) {
        const imageStore = db.createObjectStore("templateImages", {
          keyPath: "id",
          autoIncrement: false
        });
        imageStore.createIndex("templateKind", "templateKind", { unique: false });
        imageStore.createIndex("updatedAt", "updatedAt", { unique: false });
      }

      // 3. 图元模板
      if (!db.objectStoreNames.contains("graphTemplates")) {
        const graphTemplateStore = db.createObjectStore("graphTemplates", {
          keyPath: "id",
          autoIncrement: false
        });
        graphTemplateStore.createIndex("typeName", "typeName", { unique: false });
        graphTemplateStore.createIndex("updatedAt", "updatedAt", { unique: false });
      }

      // 4. 设备定义覆盖
      if (!db.objectStoreNames.contains("overrides")) {
        const overrideStore = db.createObjectStore("overrides", {
          keyPath: "kind",
          autoIncrement: false
        });
        overrideStore.createIndex("attributeLibrary", "attributeLibrary", { unique: false });
      }

      // 5. 迁移状态
      if (!db.objectStoreNames.contains("migration")) {
        db.createObjectStore("migration", {
          keyPath: "key"
        });
      }
    }
  });
}

/**
 * 检查数据库是否已初始化
 */
export async function isDBInitialized(): Promise<boolean> {
  try {
    const db = await initDeviceLibraryDB();
    const migrationStatus = await db.get("migration", "deviceLibrary");
    return migrationStatus?.completed === true;
  } catch {
    return false;
  }
}

/**
 * 清除数据库（用于测试或回滚）
 */
export async function clearDeviceLibraryDB(): Promise<void> {
  const db = await initDeviceLibraryDB();
  const tx = db.transaction(
    ["templates", "templateImages", "graphTemplates", "overrides", "migration"],
    "readwrite"
  );

  await Promise.all([
    tx.objectStore("templates").clear(),
    tx.objectStore("templateImages").clear(),
    tx.objectStore("graphTemplates").clear(),
    tx.objectStore("overrides").clear(),
    tx.objectStore("migration").clear()
  ]);

  await tx.done;
}

/**
 * 获取数据库统计信息
 */
export async function getDBStats(): Promise<{
  templates: number;
  templateImages: number;
  graphTemplates: number;
  overrides: number;
}> {
  const db = await initDeviceLibraryDB();
  const tx = db.transaction(
    ["templates", "templateImages", "graphTemplates", "overrides"],
    "readonly"
  );

  const [templates, templateImages, graphTemplates, overrides] = await Promise.all([
    tx.objectStore("templates").count(),
    tx.objectStore("templateImages").count(),
    tx.objectStore("graphTemplates").count(),
    tx.objectStore("overrides").count()
  ]);

  await tx.done;

  return { templates, templateImages, graphTemplates, overrides };
}
