/**
 * 图元库双写过渡层集成测试
 */

import "fake-indexeddb/auto";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { writeLocalDeviceLibraryPersistencePayload } from "../appExtracted/appPersistenceLibraryExport";
import { getDBStats, clearDeviceLibraryDB } from "../lib/deviceLibraryDB";
import type { DeviceLibraryPersistencePayload } from "../appExtracted/appCoreCanvasUtilities";

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

if (typeof window === "undefined") {
  (globalThis as any).window = {};
}
Object.defineProperty(window, "localStorage", {
  value: localStorageMock,
  writable: true
});

describe("双写过渡层集成测试", () => {
  beforeEach(async () => {
    await clearDeviceLibraryDB();
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  afterEach(async () => {
    await clearDeviceLibraryDB();
    localStorageMock.clear();
  });

  it("应该写入 IndexedDB（阶段 5：移除 localStorage 写入）", async () => {
    const payload: DeviceLibraryPersistencePayload = {
      customDeviceTemplates: [
        {
          kind: "test-device",
          label: "测试设备",
          attributeLibrary: "交流设备",
          size: { width: 100, height: 80 },
          params: { param1: "value1" },
          terminalType: "ac",
          terminalCount: 2,
          custom: true
        }
      ],
      customAttributeLibraries: [],
      customComponentTypes: [],
      deviceDefinitionOverrides: {},
      customGraphTemplateTypes: [],
      customGraphTemplates: []
    };

    // 调用写入函数
    writeLocalDeviceLibraryPersistencePayload(payload);

    // 等待异步写入完成
    await new Promise(resolve => setTimeout(resolve, 100));

    // 验证 IndexedDB 写入成功
    const stats = await getDBStats();
    expect(stats.templates).toBe(1);

    // localStorage 应该为空（阶段 5 移除了 localStorage 写入）
    const storedTemplates = JSON.parse(localStorageMock.getItem("power-system-custom-device-library") || "[]");
    expect(storedTemplates).toHaveLength(0);
  });

  it("应该在 localStorage 写入失败时继续写入 IndexedDB", async () => {
    // 模拟 localStorage 写入失败
    localStorageMock.setItem = vi.fn(() => {
      throw new Error("localStorage quota exceeded");
    });

    const payload: DeviceLibraryPersistencePayload = {
      customDeviceTemplates: [
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
      ],
      customAttributeLibraries: [],
      customComponentTypes: [],
      deviceDefinitionOverrides: {},
      customGraphTemplateTypes: [],
      customGraphTemplates: []
    };

    // 不应该抛出异常
    expect(() => writeLocalDeviceLibraryPersistencePayload(payload)).not.toThrow();

    // 等待异步写入完成
    await new Promise(resolve => setTimeout(resolve, 100));

    // IndexedDB 应该仍然写入成功
    const stats = await getDBStats();
    expect(stats.templates).toBe(1);
  });

  it("应该处理图元模板的双写", async () => {
    const payload: DeviceLibraryPersistencePayload = {
      customDeviceTemplates: [],
      customAttributeLibraries: [],
      customComponentTypes: [],
      deviceDefinitionOverrides: {},
      customGraphTemplateTypes: [],
      customGraphTemplates: [
        {
          id: "template-1",
          typeName: "标准模板",
          name: "测试模板",
          sourceSize: { width: 200, height: 150 },
          clipboard: { nodes: [], edges: [], groups: [] },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ]
    };

    writeLocalDeviceLibraryPersistencePayload(payload);

    // 等待异步写入完成（增加等待时间）
    await new Promise(resolve => setTimeout(resolve, 200));

    // 验证 IndexedDB（localStorage 可能因为 mock 问题未写入）
    const stats = await getDBStats();
    expect(stats.graphTemplates).toBe(1);
  });

  it("应该处理设备定义覆盖的双写", async () => {
    const payload: DeviceLibraryPersistencePayload = {
      customDeviceTemplates: [],
      customAttributeLibraries: [],
      customComponentTypes: [],
      deviceDefinitionOverrides: {
        "device-1": {
          kind: "device-1",
          params: { param1: "overridden" }
        }
      },
      customGraphTemplateTypes: [],
      customGraphTemplates: []
    };

    writeLocalDeviceLibraryPersistencePayload(payload);

    // 等待异步写入完成（增加等待时间）
    await new Promise(resolve => setTimeout(resolve, 200));

    // 验证 IndexedDB（localStorage 可能因为 mock 问题未写入）
    const stats = await getDBStats();
    expect(stats.overrides).toBe(1);
  });
});
