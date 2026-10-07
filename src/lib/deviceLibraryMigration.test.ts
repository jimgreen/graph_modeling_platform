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

    it("应该处理迁移错误：损坏的设备库不静默通过，记错误且不标完成", async () => {
      // 设置无效的 JSON
      localStorageMock.setItem("power-system-custom-device-library", "invalid json");

      const result = await migrateFromLocalStorage();

      // 即使有错误，迁移也应该继续：自定义模板按 0 条参与（内置库仍迁移）
      expect(result.migrated.templates).toBe(0);
      // 但损坏必须留痕 —— 旧实现空 catch 吞掉解析错误，errors 为空、success 为 true
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain("Failed to parse custom device templates from localStorage:");
      expect(result.success).toBe(false);
      // 部分失败不许标完成，否则非强制模式永不重试
      expect((await getMigrationStatus())?.completed).toBe(false);
    });
  });

  describe("getMigrationStatus", () => {
    it("应该返回 null（未迁移）", async () => {
      const status = await getMigrationStatus();
      expect(status).toBeNull();
    });

    it("应该返回迁移状态（已迁移）", async () => {
      const migrated = await migrateFromLocalStorage();
      // 排除「本趟带错误」这条路径：无错误才可能 completed 为真
      expect(migrated.errors).toEqual([]);

      const status = await getMigrationStatus();

      expect(status).not.toBeNull();
      expect(status?.completed).toBe(true);
      expect(status?.timestamp).toBeDefined();
      expect(status?.migrated).toBeDefined();
    });

    it("迁移带错误时 completed 为假，schemaVersion 仍随记录写入", async () => {
      // 记录（schemaVersion / timestamp / migrated）与闸门（completed）解耦：
      // 即使 completed 为假，记录也在，重试路径读到的仍是当前版本号。
      localStorageMock.setItem("power-system-custom-device-library", "broken {");

      const result = await migrateFromLocalStorage();
      expect(result.success).toBe(false);

      const status = await getMigrationStatus();
      expect(status).not.toBeNull();
      expect(status?.completed).toBe(false);
      expect(status?.schemaVersion).toBeGreaterThan(0);
      expect(status?.timestamp).toBeGreaterThan(0);
    });
  });

  describe("rollbackMigration", () => {
    it("应该清除迁移状态", async () => {
      const migrated = await migrateFromLocalStorage();
      expect(migrated.errors).toEqual([]);

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
    // 以下几条断的是三个 read*FromLocalStorage 的 `catch`。
    // 断言分两半，缺一不可：
    //
    // ① **回退行为**：损坏的那一项按 0 条 / 空对象继续，迁移**没有整体提前返回** ——
    //    同一趟里另一项仍正常迁移。这是回退值本身（0/[] 与 {}）无法单独证明的。
    // ② **留痕行为**：损坏会往 errors 里追加一条 ⇒ success 变 false ⇒
    //    迁移状态不再标完成。这是本次修复钉住的契约，旧实现（空 catch + 无条件
    //    completed）会在这里转红：errors 为空、success 为 true、completed 为 true。
    //    不能只断计数 —— 「catch 回退」与「根本没读到数据」都会得到 0。
    //
    // 若把 catch 整个删掉，JSON.parse 的异常会一路冒到 migrateFromLocalStorage 的
    // 顶层 catch，errors 里出现的是 `Migration failed: ...`（而不是 `Failed to parse ...`），
    // 且 completed 那半边拿不到记录 —— `toBeNull()` 照样成立，所以匹配文本不可省。

    it("图元模板 JSON 损坏时按空列表继续迁移，但记错误且不标完成", async () => {
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

      // ① 回退：图元模板按 0 条继续，同一函数族的另一项仍正常迁移 —— 证明不是整体提前返回
      expect(result.migrated.graphTemplates).toBe(0);
      expect(result.migrated.templates).toBe(1);
      // ② 留痕：解析失败被记录（而不是静默吞掉）
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain("Failed to parse graph templates from localStorage:");
      expect(result.success).toBe(false);
      // ② 留痕的另一半：部分失败不许标完成，否则下次启动在 completed 闸门处早退、永不重试。
      //        记录本身仍写入（migrated 计数对排查有用），只是 completed 为假。
      const raw = await (await initDeviceLibraryDB()).get("migration", "deviceLibrary");
      expect(raw).toMatchObject({ completed: false });
      expect((await getMigrationStatus())?.completed).toBe(false);
    });

    it("设备定义覆盖 JSON 损坏时按空对象继续迁移，但记错误且不标完成", async () => {
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

      // ① 回退：覆盖按空对象继续，模板仍迁移
      expect(result.migrated.overrides).toBe(0);
      expect(result.migrated.templates).toBe(1);
      const storedOverrides = await getAllOverrides();
      expect(storedOverrides).toEqual({});
      // ② 留痕：解析失败被记录，迁移不标完成
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain("Failed to parse device definition overrides from localStorage:");
      expect(result.success).toBe(false);
      expect((await getMigrationStatus())?.completed).toBe(false);
    });

    it("自定义设备模板 JSON 损坏时按空列表继续迁移，但记错误且不标完成", async () => {
      // 覆盖第三个 read*FromLocalStorage（模板键本身）。
      // 特别注意：**内置 DEVICE_LIBRARY 仍会迁移**（`[...DEVICE_LIBRARY, ...rawTemplates]`），
      // 所以 migrated.templates 的期望值不是 0 —— 绝不能拿它当「读到了空数据」的证据，
      // 解析失败只能靠 errors 里那条文本与 completed=false 来钉。
      localStorageMock.setItem("power-system-custom-device-library", "not json at all");
      localStorageMock.setItem("power-system-custom-graph-templates", JSON.stringify([{
        id: "template-after-broken-device-library",
        typeName: "标准模板",
        name: "设备库损坏之后仍迁移的图元模板",
        sourceSize: { width: 200, height: 150 },
        clipboard: { nodes: [], edges: [], groups: [] },
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z"
      } satisfies GraphTemplate]));

      const result = await migrateFromLocalStorage();

      // ① 回退：图元模板照常迁移 —— 损坏的键没有打断整趟迁移
      expect(result.migrated.graphTemplates).toBe(1);
      // ② 留痕：只有模板键这一条错误（另两个键都是合法 JSON）
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain("Failed to parse custom device templates from localStorage:");
      expect(result.success).toBe(false);
      expect((await getMigrationStatus())?.completed).toBe(false);
    });

    it("三处 catch 都还原成空 catch 时不留痕：errors 空、标成功、下次启动早退", async () => {
      // 本组用例的对照锚点：旧实现（`catch { return [] }` + 无条件 `completed: true`）
      // 在同样的输入下会得到 success=true、completed=true、第二次迁移早退。
      // 这里把两条契约并排钉住，使撤销修复必然转红。
      localStorageMock.setItem("power-system-custom-device-library", "{{{ not json");
      localStorageMock.setItem("power-system-custom-graph-templates", "[[[ not json");
      localStorageMock.setItem("power-system-device-definition-overrides", "!!! not json");

      const result = await migrateFromLocalStorage();

      expect(result.success).toBe(false);
      // 三个键各留一条，顺序即读取顺序（模板键与覆盖键在第 1 步之前，图元模板键在第 2 步）
      expect(result.errors).toEqual([
        expect.stringContaining("Failed to parse custom device templates from localStorage:"),
        expect.stringContaining("Failed to parse device definition overrides from localStorage:"),
        expect.stringContaining("Failed to parse graph templates from localStorage:")
      ]);
      expect((await getMigrationStatus())?.completed).toBe(false);

      // 关键：修复前这趟被标成完成，第二次迁移在 completed 闸门处直接返回 "Already migrated"；
      // 修复后 completed 为假，非强制模式会真的重跑（errors 里不再有 Already migrated）。
      const second = await migrateFromLocalStorage();
      expect(second.errors).not.toContain("Already migrated");
      expect(second.success).toBe(false);
      expect(second.errors).toHaveLength(3);
    });

    it("读键本身抛错（禁用 localStorage）时按空值继续，但同样要记错误", async () => {
      // 上一组只覆盖 JSON.parse。getItem 失败是另一条路径：
      // 隐私模式/配额/被策略禁用时抛 SecurityError / QuotaExceededError。
      // 断言「值取不到 + 错误留痕」，故直接把 getItem 换成抛错替身。
      // 必须用 try/finally 还原：模块顶部那条 defineProperty 是永久的，
      // 不还原会污染后续每一条用例（它们往 mockLocalStorage 写数据，
      // 读取端却已是抛错版本，errors 会被塞满 localStorage-disabled）。
      const thrower = vi.fn(() => {
        throw new Error("localStorage-disabled");
      });
      const originalLocalStorage = window.localStorage;
      Object.defineProperty(window, "localStorage", { value: { getItem: thrower, setItem: vi.fn(), removeItem: vi.fn(), clear: vi.fn() }, writable: true });

      try {
        const result = await migrateFromLocalStorage();

        expect(result.success).toBe(false);
        expect(result.errors).toHaveLength(3);
        expect(result.errors).toEqual([
          expect.stringContaining("Failed to read custom device templates from localStorage: localStorage-disabled"),
          expect.stringContaining("Failed to read device definition overrides from localStorage: localStorage-disabled"),
          expect.stringContaining("Failed to read graph templates from localStorage: localStorage-disabled")
        ]);
        // 读不到数据 → 一条也不迁移。注意**不是**「内置 DEVICE_LIBRARY 仍会迁移」：
        // customDeviceTemplates 只保留 `template.custom === true` 的条目
        // （customDeviceUtils.ts:193-194），内置库 custom 为假，故这里是 0。
        expect(result.migrated.templates).toBe(0);
        expect(result.migrated.graphTemplates).toBe(0);
        expect(result.migrated.overrides).toBe(0);
        expect((await getMigrationStatus())?.completed).toBe(false);
      } finally {
        Object.defineProperty(window, "localStorage", { value: originalLocalStorage, writable: true });
      }
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

  describe("畸形 data URL 的跳过路径", () => {
    // dataUrlToBlob 用 `dataUrl.split(",")` 解 metadata 与 base64 载荷。
    // 没有逗号的畸形值（`data:image/png`）解出 base64 === undefined，
    // 旧实现直接 `atob(undefined)` → atob("undefined") 抛 InvalidCharacterError。
    // 该调用点不在任何 try 内，异常一路冒到 migrateFromLocalStorage 的顶层 catch：
    // success 变 false、errors 里出现 `Migration failed: ...`，
    // 且异常点之后的图元模板（第 2 步）、设备定义覆盖（第 3 步）、迁移状态标记全部不执行。
    // 所以这些用例断言的不只是「没抛错」，还包括异常点之后那几步的产物 ——
    // 单看 errors 为空无法区分「跳过该图」与「异常刚好被别的东西吞掉」。

    it("缺逗号的畸形 data URL 只跳过该图，后续图元模板与覆盖仍迁移", async () => {
      const templates: DeviceTemplate[] = [{
        kind: "test-malformed-no-comma",
        label: "缺逗号的畸形图",
        categoryLibrary: "交流设备",
        size: { width: 100, height: 80 },
        params: { backgroundImage: "data:image/png" },
        terminalType: "ac",
        terminalCount: 2,
        custom: true
      }];
      localStorageMock.setItem("power-system-custom-device-library", JSON.stringify(templates));
      // 放两条后续步骤的数据：证明迁移没有被提前打断
      localStorageMock.setItem("power-system-custom-graph-templates", JSON.stringify([{
        id: "template-after-malformed",
        typeName: "标准模板",
        name: "畸形图之后的图元模板",
        sourceSize: { width: 200, height: 150 },
        clipboard: { nodes: [], edges: [], groups: [] },
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z"
      } satisfies GraphTemplate]));
      localStorageMock.setItem("power-system-device-definition-overrides", JSON.stringify({
        "device-after-malformed": { kind: "device-after-malformed", params: { p: "1" } }
      }));

      const result = await migrateFromLocalStorage();

      // 顶层 catch 没被触发：旧实现在这里会写入 `Migration failed: InvalidCharacterError...`
      expect(result.errors).toEqual([]);
      expect(result.success).toBe(true);
      // 异常点之后的两步照常执行 —— 这是「只跳过该图」与「整体崩溃」的分界点
      expect(result.migrated.graphTemplates).toBe(1);
      expect(result.migrated.overrides).toBe(1);
      // 模板本体照常落库（批量保存发生在图片循环之前）
      expect(result.migrated.templates).toBe(1);
      const stats = await getDBStats();
      expect(stats.templates).toBe(1);
      // 畸形值没有被当成图片存下来（若改成把 null 塞进 imageBlobs，这里会是 1）
      expect(stats.templateImages).toBe(0);
      // 迁移状态仍被标记完成
      expect((await getMigrationStatus())?.completed).toBe(true);
    });

    it("同一模板里畸形的那张图被跳过，正常的那张仍走原路径落库", async () => {
      const valid = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
      const templates: DeviceTemplate[] = [{
        kind: "test-foreground-malformed",
        label: "前景图畸形",
        categoryLibrary: "交流设备",
        size: { width: 100, height: 80 },
        params: {
          backgroundImage: valid,
          foregroundImage: "data:image/gif;base64"
        },
        terminalType: "ac",
        terminalCount: 2,
        custom: true
      }];
      localStorageMock.setItem("power-system-custom-device-library", JSON.stringify(templates));

      const result = await migrateFromLocalStorage();

      expect(result.errors).toEqual([]);
      expect(result.success).toBe(true);

      const db = await initDeviceLibraryDB();
      const images = await db.getAll("templateImages");
      // 精确到「跳过的是哪一张」：前景图没有记录，背景图的内容真的解码了
      expect(images.map((image: any) => image.id)).toEqual(["test-foreground-malformed_backgroundImage"]);
      const background = images[0].blob as Blob;
      expect(background.type).toBe("image/gif");
      expect(background.size).toBeGreaterThan(0);
    });

    it("逗号后为空的 data URL 仍走原路径（RFC 2397 的合法空载荷，不属于畸形）", async () => {
      // 守卫只管逗号存在性：`data:image/png;base64,` 解出 base64 === ""，
      // atob("") 返回空串 → 0 字节 Blob，mime 取自 metadata。
      // 若把守卫写成 `!base64`（空串也跳过），这条会红。
      const templates: DeviceTemplate[] = [{
        kind: "test-empty-payload",
        label: "空载荷 data URL",
        categoryLibrary: "交流设备",
        size: { width: 100, height: 80 },
        params: { backgroundImage: "data:image/png;base64," },
        terminalType: "ac",
        terminalCount: 2,
        custom: true
      }];
      localStorageMock.setItem("power-system-custom-device-library", JSON.stringify(templates));

      const result = await migrateFromLocalStorage();

      expect(result.errors).toEqual([]);
      expect(result.success).toBe(true);

      const db = await initDeviceLibraryDB();
      const images = await db.getAll("templateImages");
      expect(images).toHaveLength(1);
      const blob = images[0].blob as Blob;
      expect(blob.type).toBe("image/png");
      expect(blob.size).toBe(0);
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
    // 注意 completed：**部分失败不许标完成**（否则下次启动在 completed 闸门处早退、
    // 失败的数据永不重试）。记录本身仍写入，只是 completed 为假。
    it("批量保存模板失败：记录错误、继续迁移覆盖，但迁移不标完成", async () => {
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
      // 迁移状态记录仍写入，但 completed 为假 → 下次启动会真的重跑
      const status = await getMigrationStatus();
      expect(status?.completed).toBe(false);
      expect(status?.migrated).toEqual({ templates: 0, graphTemplates: 0, overrides: 1 });
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
      expect(status?.completed).toBe(false);
    });

    it("无错误时仍然标完成并跳过后续非强制迁移", async () => {
      // 与上面三条并排：completed 现在取决于 errors 是否为空，
      // 所以「errors 空 ⇒ completed 真」这一半也得钉住，否则
      // `completed: false` 写成常数也能让上面几条全绿。
      // 另钉一条：completed 为真时后续非强制迁移真的早退（闸门本身没被改坏）。
      const result = await migrateFromLocalStorage();

      expect(result.errors).toEqual([]);
      expect(result.success).toBe(true);
      expect((await getMigrationStatus())?.completed).toBe(true);

      const second = await migrateFromLocalStorage();
      expect(second.errors).toContain("Already migrated");
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
