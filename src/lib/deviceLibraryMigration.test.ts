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
import { clearDeviceLibraryDB, getDBStats } from "./deviceLibraryDB";
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

describe("deviceLibraryMigration", () => {
  beforeEach(async () => {
    // 清空数据库和 localStorage
    await clearDeviceLibraryDB();
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  afterEach(async () => {
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
          attributeLibrary: "交流设备",
          size: { width: 100, height: 80 },
          params: { param1: "value1" },
          terminalType: "ac",
          terminalCount: 2,
          custom: true
        },
        {
          kind: "test-device-2",
          label: "测试设备 2",
          attributeLibrary: "直流设备",
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
          attributeLibrary: "交流设备",
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
          attributeLibrary: "交流设备",
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
          attributeLibrary: "交流设备",
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
          attributeLibrary: "交流设备",
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
});
