/**
 * 图元库数据迁移工具单元测试
 */

import "fake-indexeddb/auto";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  migrateFromLocalStorage,
  getMigrationStatus,
  rollbackMigration,
  fullRollback,
  verifyMigrationIntegrity
} from "./deviceLibraryMigration";
import { clearDeviceLibraryDB, getDBStats, initDeviceLibraryDB } from "./deviceLibraryDB";
import { getAllCustomTemplates, getAllOverrides } from "./deviceLibraryStorage";
import type { DeviceTemplate } from "../model";
import type { GraphTemplate } from "../appExtracted/appCoreCanvasUtilities";

// Mock localStorage
const mockLocalStorage: Record<string, string> = {};
const localStorageMock = {
  getItem: vi.fn((key: string) => mockLocalStorage[key] ?? null),
  setItem: vi.fn((key: string, value: string) => {
    mockLocalStorage[key] = value;
  }),
  removeItem: vi.fn((key: string) => {
    delete mockLocalStorage[key];
  }),
  clear: vi.fn(() => {
    Object.keys(mockLocalStorage).forEach(key => delete mockLocalStorage[key]);
  })
};

// 设置全局 localStorage（兼容 Node.js 环境）
if (typeof window === "undefined") {
  (globalThis as any).window = {};
}
Object.defineProperty(window, "localStorage", {
  value: localStorageMock,
  writable: true
});

/**
 * 故障注入开关。
 *
 * `migrateFromLocalStorage` 里 8 条 catch 分支（保存模板 / 保存图片 / 保存图元模板 /
 * 保存覆盖 / 顶层 / getMigrationStatus）只有让下游存储**真的抛错**才会进入，
 * 而 fake-indexeddb 上一切正常，所以用带开关的模块 mock 来制造失败。
 *
 * 所有开关默认关闭 → 默认透传到真实实现，既有用例行为完全不变。
 */
const failureSwitches = vi.hoisted(() => ({
  saveDeviceTemplates: false,
  saveDeviceTemplate: false,
  saveGraphTemplates: false,
  saveOverrides: false,
  dbGetMigration: false,
  dbPutMigration: false,
  dbInit: false
}));

function resetFailureSwitches() {
  failureSwitches.saveDeviceTemplates = false;
  failureSwitches.saveDeviceTemplate = false;
  failureSwitches.saveGraphTemplates = false;
  failureSwitches.saveOverrides = false;
  failureSwitches.dbGetMigration = false;
  failureSwitches.dbPutMigration = false;
  failureSwitches.dbInit = false;
}

vi.mock("./deviceLibraryStorage", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./deviceLibraryStorage")>();
  return {
    ...actual,
    saveDeviceTemplates: async (templates: Parameters<typeof actual.saveDeviceTemplates>[0]) => {
      if (failureSwitches.saveDeviceTemplates) throw new Error("saveDeviceTemplates-fail");
      return actual.saveDeviceTemplates(templates);
    },
    saveDeviceTemplate: async (
      template: Parameters<typeof actual.saveDeviceTemplate>[0],
      blobs?: Parameters<typeof actual.saveDeviceTemplate>[1]
    ) => {
      if (failureSwitches.saveDeviceTemplate) throw new Error("saveDeviceTemplate-fail");
      return actual.saveDeviceTemplate(template, blobs);
    },
    saveGraphTemplates: async (templates: Parameters<typeof actual.saveGraphTemplates>[0]) => {
      if (failureSwitches.saveGraphTemplates) throw new Error("saveGraphTemplates-fail");
      return actual.saveGraphTemplates(templates);
    },
    saveOverrides: async (overrides: Parameters<typeof actual.saveOverrides>[0]) => {
      if (failureSwitches.saveOverrides) throw new Error("saveOverrides-fail");
      return actual.saveOverrides(overrides);
    }
  };
});

vi.mock("./deviceLibraryDB", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./deviceLibraryDB")>();
  return {
    ...actual,
    initDeviceLibraryDB: async () => {
      if (failureSwitches.dbInit) throw new Error("initDeviceLibraryDB-fail");
      const db = await actual.initDeviceLibraryDB();
      if (!failureSwitches.dbGetMigration && !failureSwitches.dbPutMigration) return db;
      return new Proxy(db, {
        get(target, prop, receiver) {
          if (prop === "get") {
            return async (store: string, key: IDBValidKey) => {
              if (failureSwitches.dbGetMigration && store === "migration") throw new Error("dbGetMigration-fail");
              return target.get(store, key);
            };
          }
          if (prop === "put") {
            return async (store: string, value: unknown, key?: IDBValidKey) => {
              if (failureSwitches.dbPutMigration && store === "migration") throw new Error("dbPutMigration-fail");
              return key === undefined ? target.put(store, value) : target.put(store, value, key);
            };
          }
          const value = Reflect.get(target, prop, receiver);
          return typeof value === "function" ? value.bind(target) : value;
        }
      });
    }
  };
});

describe("deviceLibraryMigration", () => {
  beforeEach(async () => {
    // 清空数据库和 localStorage
    resetFailureSwitches();
    await clearDeviceLibraryDB();
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  afterEach(async () => {
    resetFailureSwitches();
    await clearDeviceLibraryDB();
    localStorageMock.clear();
  });

  describe("migrateFromLocalStorage", () => {
    it("应该迁移空数据", async () => {
      const result = await migrateFromLocalStorage();

      expect(result.success).toBe(true);
      expect(result.migrated.templates).toBe(0);
      expect(result.migrated.graphTemplates).toBe(0);
      expect(result.migrated.overrides).toBe(0);
      expect(result.errors).toHaveLength(0);
    });

    it("应该迁移自定义设备模板", async () => {
      const templates: DeviceTemplate[] = [
        {
          kind: "test-device-1",
          label: "测试设备 1",
          categoryLibrary: "交流设备",
          size: { width: 100, height: 80 },
          params: { param1: "value1" },
          terminalType: "ac",
          terminalCount: 2,
          custom: true
        },
        {
          kind: "test-device-2",
          label: "测试设备 2",
          categoryLibrary: "直流设备",
          size: { width: 120, height: 90 },
          params: { param2: "value2" },
          terminalType: "dc",
          terminalCount: 3,
          custom: true
        }
      ];

      localStorageMock.setItem("power-system-custom-device-library", JSON.stringify(templates));

      const result = await migrateFromLocalStorage();

      expect(result.success).toBe(true);
      expect(result.migrated.templates).toBe(2);

      const stats = await getDBStats();
      expect(stats.templates).toBe(2);
    });

    it("应该迁移带图片的设备模板", async () => {
      const templates: DeviceTemplate[] = [
        {
          kind: "test-device-with-image",
          label: "带图片的设备",
          categoryLibrary: "交流设备",
          size: { width: 100, height: 80 },
          params: {
            backgroundImage: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
          },
          terminalType: "ac",
          terminalCount: 2,
          custom: true
        }
      ];

      localStorageMock.setItem("power-system-custom-device-library", JSON.stringify(templates));

      const result = await migrateFromLocalStorage();

      expect(result.success).toBe(true);
      expect(result.migrated.templates).toBe(1);

      const stats = await getDBStats();
      expect(stats.templates).toBe(1);
      expect(stats.templateImages).toBe(1);
    });

    it("应该迁移图元模板", async () => {
      const graphTemplates: GraphTemplate[] = [
        {
          id: "template-1",
          typeName: "标准模板",
          name: "测试模板 1",
          sourceSize: { width: 200, height: 150 },
          clipboard: { nodes: [], edges: [], groups: [] },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ];

      localStorageMock.setItem("power-system-custom-graph-templates", JSON.stringify(graphTemplates));

      const result = await migrateFromLocalStorage();

      expect(result.success).toBe(true);
      expect(result.migrated.graphTemplates).toBe(1);
    });

    it("应该迁移设备定义覆盖", async () => {
      const overrides = {
        "device-1": {
          kind: "device-1",
          params: { param1: "overridden" },
          size: { width: 120, height: 90 }
        }
      };

      localStorageMock.setItem("power-system-device-definition-overrides", JSON.stringify(overrides));

      const result = await migrateFromLocalStorage();

      expect(result.success).toBe(true);
      expect(result.migrated.overrides).toBe(1);
    });

    it("应该把旧图元业务表迁移到共享类并从具体图元删除", async () => {
      const template: DeviceTemplate = {
        kind: "custom-shared-device",
        label: "共享定义设备",
        categoryLibrary: "交流设备",
        size: { width: 100, height: 80 },
        params: {
          component_type: "SharedDevice",
          p_set: "12",
          backgroundImage: "device.svg"
        },
        terminalType: "ac",
        terminalCount: 1,
        custom: true,
        parameterDefinitions: [{
          cnName: "有功设定值",
          enName: "p_set",
          valueType: "float",
          typicalValue: "12"
        }],
        measurementDefinitions: [{
          measurementTypeId: "activePower",
          associatedField: "p_set"
        }]
      };
      localStorageMock.setItem("power-system-custom-device-library", JSON.stringify([template]));

      const result = await migrateFromLocalStorage();
      const [storedTemplate] = await getAllCustomTemplates();
      const storedOverrides = await getAllOverrides();
      const shared = storedOverrides["shared:SharedDevice"];

      expect(result.success).toBe(true);
      expect(storedTemplate.parameterDefinitions).toBeUndefined();
      expect(storedTemplate.measurementDefinitions).toBeUndefined();
      expect(storedTemplate.params.p_set).toBeUndefined();
      expect(shared?.parameterDefinitions?.map((definition) => definition.enName)).toEqual(["p_set"]);
      expect(shared?.measurementDefinitions).toEqual([{
        measurementTypeId: "activePower",
        associatedField: "p_set"
      }]);
      expect(shared?.params?.p_set).toBe("12");
    });

    it("应该跳过已完成的迁移（非强制模式）", async () => {
      // 第一次迁移
      await migrateFromLocalStorage();

      // 第二次迁移（非强制）
      const result = await migrateFromLocalStorage();

      expect(result.success).toBe(true);
      expect(result.errors).toContain("Already migrated");
    });

    it("应该强制重新迁移（强制模式）", async () => {
      // 第一次迁移
      await migrateFromLocalStorage();

      // 添加强制迁移
      const result = await migrateFromLocalStorage({ force: true });

      expect(result.success).toBe(true);
      expect(result.errors).not.toContain("Already migrated");
    });

    it("应该处理迁移错误", async () => {
      // 设置无效的 JSON
      localStorageMock.setItem("power-system-custom-device-library", "invalid json");

      const result = await migrateFromLocalStorage();

      // 即使有错误，迁移也应该继续
      expect(result.migrated.templates).toBe(0);
    });
  });

  describe("getMigrationStatus", () => {
    it("应该返回 null（未迁移）", async () => {
      const status = await getMigrationStatus();
      expect(status).toBeNull();
    });

    it("应该返回迁移状态（已迁移）", async () => {
      await migrateFromLocalStorage();

      const status = await getMigrationStatus();

      expect(status).not.toBeNull();
      expect(status?.completed).toBe(true);
      expect(status?.timestamp).toBeDefined();
      expect(status?.migrated).toBeDefined();
    });
  });

  describe("rollbackMigration", () => {
    it("应该清除迁移状态", async () => {
      await migrateFromLocalStorage();

      let status = await getMigrationStatus();
      expect(status?.completed).toBe(true);

      await rollbackMigration();

      status = await getMigrationStatus();
      expect(status).toBeNull();
    });
  });

  describe("fullRollback", () => {
    it("应该清除所有数据和迁移状态", async () => {
      const templates: DeviceTemplate[] = [
        {
          kind: "test-device",
          label: "测试设备",
          categoryLibrary: "交流设备",
          size: { width: 100, height: 80 },
          params: {},
          terminalType: "ac",
          terminalCount: 2,
          custom: true
        }
      ];

      localStorageMock.setItem("power-system-custom-device-library", JSON.stringify(templates));
      await migrateFromLocalStorage();

      let stats = await getDBStats();
      expect(stats.templates).toBe(1);

      await fullRollback();

      stats = await getDBStats();
      expect(stats.templates).toBe(0);

      const status = await getMigrationStatus();
      expect(status).toBeNull();
    });
  });

  describe("verifyMigrationIntegrity", () => {
    it("应该验证空数据完整性", async () => {
      const result = await verifyMigrationIntegrity();

      expect(result.valid).toBe(true);
      expect(result.localStorage.templates).toBe(0);
      expect(result.indexedDB.templates).toBe(0);
      expect(result.mismatches).toHaveLength(0);
    });

    it("应该验证迁移后完整性", async () => {
      const templates: DeviceTemplate[] = [
        {
          kind: "test-device",
          label: "测试设备",
          categoryLibrary: "交流设备",
          size: { width: 100, height: 80 },
          params: {},
          terminalType: "ac",
          terminalCount: 2,
          custom: true
        }
      ];

      localStorageMock.setItem("power-system-custom-device-library", JSON.stringify(templates));
      await migrateFromLocalStorage();

      const result = await verifyMigrationIntegrity();

      expect(result.valid).toBe(true);
      expect(result.localStorage.templates).toBe(1);
      expect(result.indexedDB.templates).toBe(1);
      expect(result.mismatches).toHaveLength(0);
    });

    it("应该检测不匹配", async () => {
      const templates: DeviceTemplate[] = [
        {
          kind: "test-device",
          label: "测试设备",
          categoryLibrary: "交流设备",
          size: { width: 100, height: 80 },
          params: {},
          terminalType: "ac",
          terminalCount: 2,
          custom: true
        }
      ];

      localStorageMock.setItem("power-system-custom-device-library", JSON.stringify(templates));

      // 不执行迁移，直接验证
      const result = await verifyMigrationIntegrity();

      expect(result.valid).toBe(false);
      expect(result.localStorage.templates).toBe(1);
      expect(result.indexedDB.templates).toBe(0);
      expect(result.mismatches.length).toBeGreaterThan(0);
    });
  });

  describe("localStorage 读取失败时的回退", () => {
    // 以下三条断的是三个 read*FromLocalStorage 的 `catch`：
    // 断言落在「迁移整体仍成功」+「该项计数为 0」上，
    // 而不是只看计数 —— 因为回退值本身就是 0/[]，
    // 单断计数无法区分「catch 回退」与「根本没读到数据」。
    // 若把 catch 删掉，JSON.parse 的异常会一路冒到 migrateFromLocalStorage 的顶层 catch，
    // success 变 false、errors 里出现 `Migration failed: ...` —— 断言立刻转红。

    it("图元模板 JSON 损坏时按空列表继续迁移，不整体失败", async () => {
      const templates: DeviceTemplate[] = [{
        kind: "test-fallback-templates",
        label: "回退用例设备",
        categoryLibrary: "交流设备",
        size: { width: 100, height: 80 },
        params: {},
        terminalType: "ac",
        terminalCount: 2,
        custom: true
      }];
      localStorageMock.setItem("power-system-custom-device-library", JSON.stringify(templates));
      localStorageMock.setItem("power-system-custom-graph-templates", "{ broken json");

      const result = await migrateFromLocalStorage();

      // 图元模板回退为空：没有迁移记录，但**没有**产生任何错误
      expect(result.migrated.graphTemplates).toBe(0);
      expect(result.errors).toEqual([]);
      expect(result.success).toBe(true);
      // 同一函数族的另一项仍正常迁移 —— 证明不是整体提前返回
      expect(result.migrated.templates).toBe(1);
    });

    it("设备定义覆盖 JSON 损坏时按空对象继续迁移，不整体失败", async () => {
      const templates: DeviceTemplate[] = [{
        kind: "test-fallback-overrides",
        label: "回退用例设备",
        categoryLibrary: "交流设备",
        size: { width: 100, height: 80 },
        params: {},
        terminalType: "ac",
        terminalCount: 2,
        custom: true
      }];
      localStorageMock.setItem("power-system-custom-device-library", JSON.stringify(templates));
      localStorageMock.setItem("power-system-device-definition-overrides", "[[[");

      const result = await migrateFromLocalStorage();

      expect(result.migrated.overrides).toBe(0);
      expect(result.errors).toEqual([]);
      expect(result.success).toBe(true);
      expect(result.migrated.templates).toBe(1);
      const storedOverrides = await getAllOverrides();
      expect(storedOverrides).toEqual({});
    });
  });

  describe("dataUrlToBlob 的 mime 回退", () => {
    // 覆盖 `metadata.match(/:(.*?);/)?.[1] ?? "application/octet-stream"` 的右半边。
    // 断言对象是 templateImages 里**实际落库的 Blob**，
    // 因为回退值恰好就是 "application/octet-stream"，
    // 所以必须同时断一条带合法 mime 的输入，证明这条不是「永远返回兜底」。
    it("缺少 mime 段时用 application/octet-stream，带 mime 时保留真实类型", async () => {
      const templates: DeviceTemplate[] = [
        {
          kind: "test-blob-no-mime",
          label: "无 mime 的图片",
          categoryLibrary: "交流设备",
          size: { width: 100, height: 80 },
          params: { backgroundImage: "data:,SGVsbG8=" },
          terminalType: "ac",
          terminalCount: 2,
          custom: true
        },
        {
          kind: "test-blob-with-mime",
          label: "带 mime 的图片",
          categoryLibrary: "交流设备",
          size: { width: 100, height: 80 },
          params: { backgroundImage: "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7" },
          terminalType: "ac",
          terminalCount: 2,
          custom: true
        }
      ];
      localStorageMock.setItem("power-system-custom-device-library", JSON.stringify(templates));

      const result = await migrateFromLocalStorage();

      expect(result.success).toBe(true);
      expect(result.errors).toEqual([]);

      const db = await initDeviceLibraryDB();
      const images = await db.getAll("templateImages");
      const byKind = Object.fromEntries(images.map((image: any) => [image.templateKind, image.blob as Blob]));

      // 无 mime 段 → 兜底
      expect((byKind["test-blob-no-mime"] as Blob).type).toBe("application/octet-stream");
      // 有 mime 段 → 真实类型（这条证明上一条不是「硬编码兜底」的假绿）
      expect((byKind["test-blob-with-mime"] as Blob).type).toBe("image/gif");
      // base64 内容也要真的解码了
      expect(new Uint8Array(await (byKind["test-blob-no-mime"] as Blob).arrayBuffer())).toEqual(
        new TextEncoder().encode("Hello")
      );
    });
  });

  describe("foregroundImage 分支", () => {
    it("只带前景图的模板也会单独落一条 templateImages 记录", async () => {
      const templates: DeviceTemplate[] = [{
        kind: "test-foreground-only",
        label: "仅前景图",
        categoryLibrary: "交流设备",
        size: { width: 100, height: 80 },
        params: { foregroundImage: "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7" },
        terminalType: "ac",
        terminalCount: 2,
        custom: true
      }];
      localStorageMock.setItem("power-system-custom-device-library", JSON.stringify(templates));

      const result = await migrateFromLocalStorage();

      expect(result.success).toBe(true);
      const stats = await getDBStats();
      expect(stats.templateImages).toBe(1);

      const db = await initDeviceLibraryDB();
      const images = await db.getAll("templateImages");
      expect(images).toHaveLength(1);
      expect(images[0].id).toBe("test-foreground-only_foregroundImage");
      expect(images[0].templateKind).toBe("test-foreground-only");
      expect(images[0].key).toBe("foregroundImage");
    });
  });

  describe("分步保存失败时的错误收集", () => {
    // 覆盖四条内层 catch。它们都往 errors 追加信息、且 success 变 false，
    // 同时后续步骤仍然继续 —— 所以每条都同时断言 errors 文本与「后续步骤的产物」。
    it("批量保存模板失败：记录错误但继续迁移覆盖并标记完成", async () => {
      localStorageMock.setItem("power-system-custom-device-library", JSON.stringify([{
        kind: "test-save-templates-fail",
        label: "保存失败设备",
        categoryLibrary: "交流设备",
        size: { width: 100, height: 80 },
        params: {},
        terminalType: "ac",
        terminalCount: 2,
        custom: true
      } satisfies DeviceTemplate]));
      localStorageMock.setItem("power-system-device-definition-overrides", JSON.stringify({
        "device-keep": { kind: "device-keep", params: { p: "1" } }
      }));
      failureSwitches.saveDeviceTemplates = true;

      const result = await migrateFromLocalStorage();

      expect(result.success).toBe(false);
      expect(result.errors).toContain("Failed to migrate templates: saveDeviceTemplates-fail");
      // 模板计数停在 0（赋值语句没执行到）
      expect(result.migrated.templates).toBe(0);
      // 覆盖迁移仍执行 → 失败被隔离在单个步骤内
      expect(result.migrated.overrides).toBe(1);
      // 迁移状态仍被标记完成
      const status = await getMigrationStatus();
      expect(status?.completed).toBe(true);
    });

    it("保存模板图片失败：记录 kind 并继续迁移其余模板", async () => {
      const templates: DeviceTemplate[] = [{
        kind: "test-image-save-fail",
        label: "图片保存失败",
        categoryLibrary: "交流设备",
        size: { width: 100, height: 80 },
        params: { backgroundImage: "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7" },
        terminalType: "ac",
        terminalCount: 2,
        custom: true
      }];
      localStorageMock.setItem("power-system-custom-device-library", JSON.stringify(templates));
      failureSwitches.saveDeviceTemplate = true;

      const result = await migrateFromLocalStorage();

      expect(result.success).toBe(false);
      expect(result.errors).toContain("Failed to migrate template images test-image-save-fail: saveDeviceTemplate-fail");
      // 模板本体已经落库，只有图片这一步失败
      expect(result.migrated.templates).toBe(1);
      const stats = await getDBStats();
      expect(stats.templates).toBe(1);
      expect(stats.templateImages).toBe(0);
    });

    it("图元模板批次保存失败：逐批记录错误且迁移不中断", async () => {
      const graphTemplates: GraphTemplate[] = [1, 2, 3].map((index) => ({
        id: `template-batch-${index}`,
        typeName: "标准模板",
        name: `批量模板 ${index}`,
        sourceSize: { width: 200, height: 150 },
        clipboard: { nodes: [], edges: [], groups: [] },
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z"
      }));
      localStorageMock.setItem("power-system-custom-graph-templates", JSON.stringify(graphTemplates));
      failureSwitches.saveGraphTemplates = true;

      const result = await migrateFromLocalStorage({ batchSize: 1 });

      // batchSize=1 → 3 个批次各失败一次（累加路径 `+= batch.length` 在异常时不执行）
      expect(result.success).toBe(false);
      expect(result.errors).toEqual([
        "Failed to migrate graph templates batch: saveGraphTemplates-fail",
        "Failed to migrate graph templates batch: saveGraphTemplates-fail",
        "Failed to migrate graph templates batch: saveGraphTemplates-fail"
      ]);
      expect(result.migrated.graphTemplates).toBe(0);
      const stats = await getDBStats();
      expect(stats.graphTemplates).toBe(0);
    });

    it("保存覆盖失败：记录错误且模板迁移结果不受影响", async () => {
      localStorageMock.setItem("power-system-custom-device-library", JSON.stringify([{
        kind: "test-overrides-save-fail",
        label: "覆盖保存失败",
        categoryLibrary: "交流设备",
        size: { width: 100, height: 80 },
        params: {},
        terminalType: "ac",
        terminalCount: 2,
        custom: true
      } satisfies DeviceTemplate]));
      localStorageMock.setItem("power-system-device-definition-overrides", JSON.stringify({
        "device-x": { kind: "device-x", params: { p: "1" } }
      }));
      failureSwitches.saveOverrides = true;

      const result = await migrateFromLocalStorage();

      expect(result.success).toBe(false);
      expect(result.errors).toContain("Failed to migrate overrides: saveOverrides-fail");
      expect(result.migrated.overrides).toBe(0);
      expect(result.migrated.templates).toBe(1);
      const status = await getMigrationStatus();
      expect(status?.completed).toBe(true);
    });
  });

  describe("顶层失败与状态查询回退", () => {
    it("写迁移状态失败：整体判失败并把已完成计数一起返回", async () => {
      localStorageMock.setItem("power-system-custom-device-library", JSON.stringify([{
        kind: "test-put-migration-fail",
        label: "状态写入失败",
        categoryLibrary: "交流设备",
        size: { width: 100, height: 80 },
        params: {},
        terminalType: "ac",
        terminalCount: 2,
        custom: true
      } satisfies DeviceTemplate]));
      failureSwitches.dbPutMigration = true;

      const result = await migrateFromLocalStorage();

      expect(result.success).toBe(false);
      expect(result.errors).toContain("Migration failed: dbPutMigration-fail");
      // 顶层 catch 不回滚已写入的数据，只把当前计数带出来
      expect(result.migrated.templates).toBe(1);
      const stats = await getDBStats();
      expect(stats.templates).toBe(1);
      // 状态确实没写进去
      expect(await getMigrationStatus()).toBeNull();
    });

    it("读取迁移状态失败：返回 null 而不是抛错", async () => {
      // 先正常迁移，**证明记录确实存在** —— 排除「本来就没迁移过」这条同值路径
      const migrated = await migrateFromLocalStorage();
      expect(migrated.success).toBe(true);
      const db = await initDeviceLibraryDB();
      expect(await db.get("migration", "deviceLibrary")).toMatchObject({ completed: true });

      failureSwitches.dbGetMigration = true;
      const status = await getMigrationStatus();

      expect(status).toBeNull();
    });
  });
});
