/**
 * 图元库 IndexedDB 基础设施
 *
 * 提供 IndexedDB 初始化、Schema 定义和基础操作。
 * 用于存储自定义设备模板、图元模板、设备定义覆盖等数据。
 */

import { openDB, IDBPDatabase, IDBPObjectStore } from "idb";
import type { DeviceTemplate, DeviceTemplateDefinitionOverride } from "../model";
import type { GraphTemplate } from "../appExtracted/appCoreCanvasUtilities";

const DB_NAME = "device-library";
const DB_VERSION = 2;

/**
 * 图元库 IndexedDB Schema 定义
 * 注意：idb 库使用特殊类型定义，这里简化为 any 以避免复杂的类型推断问题
 */
type DeviceLibraryDBSchema = any;

/**
 * 单个 object store 的定义：主键路径 + 全部索引。
 * 建库与「老库回填」共用同一份声明，这是 schema 唯一的真源。
 */
type StoreSpec = {
  keyPath: string;
  indexes: ReadonlyArray<readonly [indexName: string, keyPath: string]>;
};

/**
 * 全部 store 的声明。
 *
 * 索引刻意全部声明为 `unique: false`：与历史行为一致，且 IDB 索引可由已有数据
 * 重建，补建不丢数据 —— 因此回填老库时补建缺失索引是纯收益操作。
 */
const STORE_SPECS: Readonly<Record<string, StoreSpec>> = Object.freeze({
  // 1. 自定义设备模板（不含图片 base64）
  templates: {
    keyPath: "kind",
    indexes: [["categoryLibrary", "categoryLibrary"], ["custom", "custom"], ["updatedAt", "updatedAt"]]
  },
  // 2. 设备图片（Blob 分离存储）
  templateImages: {
    keyPath: "id",
    indexes: [["templateKind", "templateKind"], ["updatedAt", "updatedAt"]]
  },
  // 3. 图元模板
  graphTemplates: {
    keyPath: "id",
    indexes: [["typeName", "typeName"], ["updatedAt", "updatedAt"]]
  },
  // 4. 设备定义覆盖
  overrides: {
    keyPath: "kind",
    indexes: [["categoryLibrary", "categoryLibrary"]]
  },
  // 5. 迁移状态
  migration: {
    keyPath: "key",
    indexes: []
  }
});

/** 导出给测试与文档用：store 声明的单源。 */
export const DEVICE_LIBRARY_STORE_SPECS = STORE_SPECS;

/**
 * 让一个 object store 具备 spec 声明的全部索引（已存在的跳过）。
 *
 * 无论该 store 是本次 upgrade 新建的、还是从更低版本继承来的，都走这一个函数，
 * 因此「全新安装」与「老库升级」得到的 schema **必然一致**。
 *
 * 此前两者是分叉的：回填分支只补了 `templates.categoryLibrary` 与
 * `overrides.categoryLibrary` 两个索引，`templateImages` / `graphTemplates`
 * 完全没回填。老库升级后 `graphTemplates` 上不存在 `typeName` 索引，而
 * `deviceLibraryStorage` 正是用 `store.index("typeName")` 查图元模板的 ——
 * 那条老库路径会在查询时抛 NotFoundError。实测（fake-indexeddb 造 v1 老库）
 * 老库升级后四个 store 里三个的索引集合与新装不同。
 */
function ensureStoreIndexes(
  store: IDBPObjectStore<any, string[], string, "versionchange">,
  spec: StoreSpec
): void {
  for (const [indexName, keyPath] of spec.indexes) {
    if (store.indexNames.contains(indexName)) continue;
    store.createIndex(indexName, keyPath, { unique: false });
  }
}

/**
 * 初始化 IndexedDB 数据库
 *
 * @returns Promise<IDBPDatabase<DeviceLibraryDBSchema>>
 */
export async function initDeviceLibraryDB(): Promise<IDBPDatabase<DeviceLibraryDBSchema>> {
  return openDB<DeviceLibraryDBSchema>(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion, newVersion, transaction) {
      for (const [name, spec] of Object.entries(STORE_SPECS)) {
        // store 不存在就建，已存在（老库继承）就取出来补索引 —— 两条路径同源
        const store = db.objectStoreNames.contains(name)
          ? transaction.objectStore(name)
          : db.createObjectStore(name, { keyPath: spec.keyPath, autoIncrement: false });
        ensureStoreIndexes(store, spec);
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
