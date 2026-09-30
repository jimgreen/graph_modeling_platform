/**
 * 图元库 IndexedDB schema 契约测试
 *
 * 关注点只有一个：**全新安装得到的 schema 与老库升级得到的 schema 必须完全一致。**
 *
 * 此前两者是分叉的（实测，用 fake-indexeddb 造一个「store 都在、索引全无」的 v1 老库
 * 再升到 v2）：
 *   templates        新装 [categoryLibrary,custom,updatedAt] → 老库升级后 [categoryLibrary]
 *   templateImages   新装 [templateKind,updatedAt]           → 老库升级后 []
 *   graphTemplates   新装 [typeName,updatedAt]               → 老库升级后 []
 *   overrides        新装 [categoryLibrary]                  → 老库升级后 [categoryLibrary]（一致）
 *
 * 其中 graphTemplates 缺 `typeName` 是真问题：deviceLibraryStorage 正是用
 * `store.index("typeName")` 查图元模板的，老库用户走这条查询会抛 NotFoundError。
 *
 * 修法是把 store 声明抽成单源（DEVICE_LIBRARY_STORE_SPECS），建库与回填共用，
 * 于是「一致」由构造保证而不是靠人工同步。本测试就是防止它再分叉的守卫。
 */
import "fake-indexeddb/auto";
import { IDBFactory } from "fake-indexeddb";
import type { IDBPDatabase } from "idb";
import { beforeEach, describe, expect, test } from "vitest";
import {
  initDeviceLibraryDB,
  isDBInitialized,
  clearDeviceLibraryDB,
  DEVICE_LIBRARY_STORE_SPECS
} from "./deviceLibraryDB";

// 每个用例一个干净工厂，避免跨用例的库版本/数据互相污染
let factory: IDBFactory;
beforeEach(() => {
  factory = new IDBFactory();
  globalThis.indexedDB = factory;
});

type StoreShape = { keyPath: string; indexes: string[] };

/** 读出库里每个 store 的主键与索引集合（升序，便于比较）。 */
async function readSchemaShapes(db: IDBPDatabase<any>): Promise<Record<string, StoreShape>> {
  const names = [...db.objectStoreNames];
  const tx = db.transaction(names, "readonly");
  const shapes: Record<string, StoreShape> = {};
  for (const name of names) {
    const store = tx.objectStore(name);
    const keyPath = store.keyPath;
    shapes[name] = {
      keyPath: Array.isArray(keyPath) ? keyPath.join(",") : (keyPath ?? ""),
      indexes: [...store.indexNames].map(String).sort()
    };
  }
  await tx.done;
  return shapes;
}

/** spec 声明的期望 shape（索引名取声明的第一项，并升序）。 */
function expectedShapes(): Record<string, StoreShape> {
  const out: Record<string, StoreShape> = {};
  for (const [name, spec] of Object.entries(DEVICE_LIBRARY_STORE_SPECS)) {
    out[name] = {
      keyPath: spec.keyPath,
      indexes: spec.indexes.map(([indexName]) => indexName).sort()
    };
  }
  return out;
}

/** 造一个「store 都在、索引全无」的 v1 老库，并在各 store 里放一条数据。 */
async function seedLegacyV1(legacy: IDBFactory): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const req = legacy.open("device-library", 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      db.createObjectStore("templates", { keyPath: "kind" });
      db.createObjectStore("templateImages", { keyPath: "id" });
      db.createObjectStore("graphTemplates", { keyPath: "id" });
      db.createObjectStore("overrides", { keyPath: "kind" });
      // 故意不建 migration store，也不建任何索引 —— 模拟最"瘦"的老库
    };
    req.onsuccess = () => {
      const db = req.result;
      const tx = db.transaction(
        ["templates", "templateImages", "graphTemplates", "overrides"],
        "readwrite"
      );
      tx.objectStore("templates").put({ kind: "ac_load", name: "老库负载" });
      tx.objectStore("templateImages").put({ id: "img1", templateKind: "ac_load" });
      tx.objectStore("graphTemplates").put({ id: "g1", typeName: "变压器" });
      tx.objectStore("overrides").put({ kind: "ac_load", rating: "100" });
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => reject(tx.error);
    };
    req.onerror = () => reject(req.error);
  });
}

describe("图元库 schema：新装与老库升级必须一致", () => {
  test("全新安装得到 spec 声明的完整 schema", async () => {
    const db = await initDeviceLibraryDB();
    expect(await readSchemaShapes(db)).toEqual(expectedShapes());
    db.close();
  });

  test("老库（有 store 无索引）升级后与全新安装逐字段相同（核心回归）", async () => {
    await seedLegacyV1(factory);

    const db = await initDeviceLibraryDB();
    const upgraded = await readSchemaShapes(db);
    const fresh = await readSchemaShapes(await (async () => {
      const other = new IDBFactory();
      globalThis.indexedDB = other;
      return initDeviceLibraryDB();
    })());

    // 逐 store 比 keyPath 与索引集合，避免只比数量漏掉"名字错了"
    expect(Object.keys(upgraded).sort()).toEqual(Object.keys(fresh).sort());
    for (const name of Object.keys(fresh)) {
      expect(upgraded[name], `store ${name} 的 schema`).toEqual(fresh[name]);
    }
    // 且整体等于 spec 声明
    expect(upgraded).toEqual(expectedShapes());
    db.close();
  });

  test("老库升级补齐 graphTemplates 的 typeName 索引（deviceLibraryStorage 依赖它）", async () => {
    await seedLegacyV1(factory);

    const db = await initDeviceLibraryDB();
    const tx = db.transaction("graphTemplates", "readonly");
    // 之前这个调用在老库升级后会抛 NotFoundError
    expect(() => tx.objectStore("graphTemplates").index("typeName")).not.toThrow();
    await tx.done;
    db.close();
  });

  test("老库升级不丢数据（升级不是清库重放）", async () => {
    await seedLegacyV1(factory);

    const db = await initDeviceLibraryDB();
    const tx = db.transaction(
      ["templates", "templateImages", "graphTemplates", "overrides"],
      "readonly"
    );
    const [templates, images, graphs, overrides] = await Promise.all([
      tx.objectStore("templates").getAll(),
      tx.objectStore("templateImages").getAll(),
      tx.objectStore("graphTemplates").getAll(),
      tx.objectStore("overrides").getAll()
    ]);
    await tx.done;
    db.close();

    expect(templates).toEqual([{ kind: "ac_load", name: "老库负载" }]);
    expect(images).toEqual([{ id: "img1", templateKind: "ac_load" }]);
    expect(graphs).toEqual([{ id: "g1", typeName: "变压器" }]);
    expect(overrides).toEqual([{ kind: "ac_load", rating: "100" }]);
  });

  test("重复升级（已是最新 schema 再打开）不会改动 schema", async () => {
    await seedLegacyV1(factory);
    const first = await initDeviceLibraryDB();
    const afterFirst = await readSchemaShapes(first);
    first.close();

    const second = await initDeviceLibraryDB();
    expect(await readSchemaShapes(second)).toEqual(afterFirst);
    second.close();
  });

  test("已带部分索引的老库升级后不会重复建索引、也不改变已有索引", async () => {
    // 比最"瘦"的老库更现实的一种：老库已有部分索引
    await new Promise<void>((resolve, reject) => {
      const req = factory.open("device-library", 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        const templates = db.createObjectStore("templates", { keyPath: "kind" });
        templates.createIndex("categoryLibrary", "categoryLibrary", { unique: false });
        db.createObjectStore("templateImages", { keyPath: "id" });
        db.createObjectStore("graphTemplates", { keyPath: "id" });
        db.createObjectStore("overrides", { keyPath: "kind" });
      };
      req.onsuccess = () => {
        req.result.close();
        resolve();
      };
      req.onerror = () => reject(req.error);
    });

    const db = await initDeviceLibraryDB();
    expect(await readSchemaShapes(db)).toEqual(expectedShapes());
    db.close();
  });
});

/**
 * isDBInitialized / clearDeviceLibraryDB 的行为契约。
 *
 * isDBInitialized 目前**没有任何生产调用方**（全仓只在此测试里出现），属于对外留的
 * 探针接口；这里把它的判据钉死：只看 migration store 里 key="deviceLibrary" 那条的
 * `completed === true`，严格相等，别的 key、别的值一律 false，库打不开也返回 false
 * 而不是往上抛。将来有人接上它时，语义不用再猜。
 *
 * 本组 12 处变异逐条跑过、全部转红。其中「去掉 try/catch」与「transaction 不含 migration」
 * 两处是靠**抛错**转红（Error: boom / NotFoundError）而不是靠断言失败。
 */
describe("isDBInitialized：只看 migration 标记", () => {
  const writeMarker = async (key: string, value: Record<string, unknown>) => {
    const db = await initDeviceLibraryDB();
    await db.put("migration", { key, ...value });
    db.close();
  };

  test("全新库没有标记 → false", async () => {
    expect(await isDBInitialized()).toBe(false);
  });

  test("★ 标记 completed:true → true", async () => {
    await writeMarker("deviceLibrary", { completed: true });
    expect(await isDBInitialized()).toBe(true);
  });

  test("★ completed 必须是严格 true：false / 缺失 / 字符串 'true' 都算未初始化", async () => {
    for (const value of [{ completed: false }, {}, { completed: "true" }, { completed: 1 }]) {
      await writeMarker("deviceLibrary", value);
      expect(await isDBInitialized(), JSON.stringify(value)).toBe(false);
    }
  });

  test("别的 key 的标记不算数", async () => {
    await writeMarker("someOtherMigration", { completed: true });
    expect(await isDBInitialized()).toBe(false);
  });

  test("库打不开时返回 false，不往上抛", async () => {
    globalThis.indexedDB = {
      open() {
        throw new Error("boom");
      }
    } as unknown as IDBFactory;
    expect(await isDBInitialized()).toBe(false);
  });
});

describe("clearDeviceLibraryDB：清空全部 store", () => {
  test("★ 五个 store（含 migration 标记）全清", async () => {
    const db = await initDeviceLibraryDB();
    await db.put("templates", { kind: "ac_load" });
    await db.put("templateImages", { id: "img1" });
    await db.put("graphTemplates", { id: "g1" });
    await db.put("overrides", { kind: "ac_load" });
    await db.put("migration", { key: "deviceLibrary", completed: true });
    db.close();
    expect(await isDBInitialized()).toBe(true);

    await clearDeviceLibraryDB();

    const after = await initDeviceLibraryDB();
    for (const name of ["templates", "templateImages", "graphTemplates", "overrides", "migration"]) {
      expect(await after.count(name), name).toBe(0);
    }
    after.close();
    expect(await isDBInitialized()).toBe(false);
  });

  test("清空后 schema 仍然完整（清的是数据不是结构）", async () => {
    await clearDeviceLibraryDB();
    const db = await initDeviceLibraryDB();
    expect(await readSchemaShapes(db)).toEqual(expectedShapes());
    db.close();
  });
});
