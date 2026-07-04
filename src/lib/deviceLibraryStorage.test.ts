/**
 * 图元库 IndexedDB 数据访问层单元测试
 */

import "fake-indexeddb/auto";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  saveDeviceTemplate,
  getDeviceTemplate,
  queryTemplatesByAttributeLibrary,
  getAllCustomTemplates,
  deleteDeviceTemplate,
  saveGraphTemplate,
  getGraphTemplate,
  queryGraphTemplatesByType,
  getAllGraphTemplates,
  deleteGraphTemplate,
  saveOverride,
  getOverride,
  getAllOverrides,
  deleteOverride,
  saveDeviceTemplates,
  saveGraphTemplates,
  saveOverrides
} from "./deviceLibraryStorage";
import { clearDeviceLibraryDB, getDBStats } from "./deviceLibraryDB";
import type { DeviceTemplate } from "../model";
import type { GraphTemplate } from "../appExtracted/appCoreCanvasUtilities";

describe("deviceLibraryStorage", () => {
  beforeEach(async () => {
    // 清空数据库
    await clearDeviceLibraryDB();
  });

  afterEach(async () => {
    // 清理
    await clearDeviceLibraryDB();
  });

  describe("设备模板 CRUD", () => {
    const mockTemplate: DeviceTemplate = {
      kind: "test-device",
      label: "测试设备",
      attributeLibrary: "交流设备",
      size: { width: 100, height: 80 },
      params: { param1: "value1" },
      terminalType: "ac",
      terminalCount: 2,
      custom: true
    };

    it("应该保存和获取设备模板", async () => {
      await saveDeviceTemplate(mockTemplate);
      const retrieved = await getDeviceTemplate("test-device");

      expect(retrieved).not.toBeNull();
      expect(retrieved?.kind).toBe("test-device");
      expect(retrieved?.label).toBe("测试设备");
      expect(retrieved?.attributeLibrary).toBe("交流设备");
    });

    it("应该按属性库查询设备模板", async () => {
      const template1: DeviceTemplate = { ...mockTemplate, kind: "device-1", attributeLibrary: "交流设备" };
      const template2: DeviceTemplate = { ...mockTemplate, kind: "device-2", attributeLibrary: "直流设备" };
      const template3: DeviceTemplate = { ...mockTemplate, kind: "device-3", attributeLibrary: "交流设备" };

      await saveDeviceTemplate(template1);
      await saveDeviceTemplate(template2);
      await saveDeviceTemplate(template3);

      const acTemplates = await queryTemplatesByAttributeLibrary("交流设备");
      expect(acTemplates).toHaveLength(2);
      expect(acTemplates.map(t => t.kind).sort()).toEqual(["device-1", "device-3"]);
    });

    it("应该获取所有自定义设备模板", async () => {
      const customTemplate: DeviceTemplate = { ...mockTemplate, custom: true };
      const builtinTemplate: DeviceTemplate = { ...mockTemplate, kind: "builtin", custom: false };

      await saveDeviceTemplate(customTemplate);
      await saveDeviceTemplate(builtinTemplate);

      const customTemplates = await getAllCustomTemplates();
      expect(customTemplates).toHaveLength(1);
      expect(customTemplates[0].kind).toBe("test-device");
    });

    it("应该删除设备模板", async () => {
      await saveDeviceTemplate(mockTemplate);
      await deleteDeviceTemplate("test-device");

      const retrieved = await getDeviceTemplate("test-device");
      expect(retrieved).toBeNull();
    });

    it("应该处理图片 Blob 存储", async () => {
      const imageBlob = new Blob(["test-image-data"], { type: "image/png" });
      await saveDeviceTemplate(mockTemplate, { backgroundImage: imageBlob });

      const retrieved = await getDeviceTemplate("test-device");
      expect(retrieved).not.toBeNull();
      // 图片应该被转换为 Object URL
      expect(retrieved?.params.backgroundImage).toMatch(/^blob:/);
    });

    it("应该批量保存设备模板", async () => {
      const templates: DeviceTemplate[] = [
        { ...mockTemplate, kind: "device-1" },
        { ...mockTemplate, kind: "device-2" },
        { ...mockTemplate, kind: "device-3" }
      ];

      await saveDeviceTemplates(templates);

      const stats = await getDBStats();
      expect(stats.templates).toBe(3);
    });
  });

  describe("图元模板 CRUD", () => {
    const mockGraphTemplate: GraphTemplate = {
      id: "template-1",
      typeName: "标准模板",
      name: "测试模板",
      sourceSize: { width: 200, height: 150 },
      clipboard: { nodes: [], edges: [], groups: [] },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    it("应该保存和获取图元模板", async () => {
      await saveGraphTemplate(mockGraphTemplate);
      const retrieved = await getGraphTemplate("template-1");

      expect(retrieved).not.toBeNull();
      expect(retrieved?.id).toBe("template-1");
      expect(retrieved?.name).toBe("测试模板");
    });

    it("应该按类型查询图元模板", async () => {
      const template1: GraphTemplate = { ...mockGraphTemplate, id: "t1", typeName: "类型A" };
      const template2: GraphTemplate = { ...mockGraphTemplate, id: "t2", typeName: "类型B" };
      const template3: GraphTemplate = { ...mockGraphTemplate, id: "t3", typeName: "类型A" };

      await saveGraphTemplate(template1);
      await saveGraphTemplate(template2);
      await saveGraphTemplate(template3);

      const typeATemplates = await queryGraphTemplatesByType("类型A");
      expect(typeATemplates).toHaveLength(2);
    });

    it("应该获取所有图元模板", async () => {
      await saveGraphTemplate({ ...mockGraphTemplate, id: "t1" });
      await saveGraphTemplate({ ...mockGraphTemplate, id: "t2" });

      const all = await getAllGraphTemplates();
      expect(all).toHaveLength(2);
    });

    it("应该删除图元模板", async () => {
      await saveGraphTemplate(mockGraphTemplate);
      await deleteGraphTemplate("template-1");

      const retrieved = await getGraphTemplate("template-1");
      expect(retrieved).toBeNull();
    });

    it("应该批量保存图元模板", async () => {
      const templates: GraphTemplate[] = [
        { ...mockGraphTemplate, id: "t1" },
        { ...mockGraphTemplate, id: "t2" }
      ];

      await saveGraphTemplates(templates);

      const stats = await getDBStats();
      expect(stats.graphTemplates).toBe(2);
    });
  });

  describe("设备定义覆盖 CRUD", () => {
    const mockOverride = {
      kind: "test-device",
      params: { param1: "overridden" },
      size: { width: 120, height: 90 }
    };

    it("应该保存和获取设备定义覆盖", async () => {
      await saveOverride("test-device", mockOverride);
      const retrieved = await getOverride("test-device");

      expect(retrieved).not.toBeNull();
      expect(retrieved?.params?.param1).toBe("overridden");
      expect(retrieved?.size?.width).toBe(120);
    });

    it("应该获取所有设备定义覆盖", async () => {
      await saveOverride("device-1", { kind: "device-1", params: { p1: "v1" } });
      await saveOverride("device-2", { kind: "device-2", params: { p2: "v2" } });

      const all = await getAllOverrides();
      expect(Object.keys(all)).toHaveLength(2);
      expect(all["device-1"]?.params?.p1).toBe("v1");
    });

    it("应该删除设备定义覆盖", async () => {
      await saveOverride("test-device", mockOverride);
      await deleteOverride("test-device");

      const retrieved = await getOverride("test-device");
      expect(retrieved).toBeNull();
    });

    it("应该批量保存设备定义覆盖", async () => {
      const overrides = {
        "device-1": { kind: "device-1", params: { p1: "v1" } },
        "device-2": { kind: "device-2", params: { p2: "v2" } }
      };

      await saveOverrides(overrides);

      const stats = await getDBStats();
      expect(stats.overrides).toBe(2);
    });
  });

  describe("数据库统计", () => {
    it("应该返回正确的统计信息", async () => {
      const initialStats = await getDBStats();
      expect(initialStats.templates).toBe(0);
      expect(initialStats.templateImages).toBe(0);
      expect(initialStats.graphTemplates).toBe(0);
      expect(initialStats.overrides).toBe(0);

      // 添加数据
      await saveDeviceTemplate({
        kind: "test",
        label: "测试",
        attributeLibrary: "交流设备",
        size: { width: 100, height: 80 },
        params: {},
        terminalType: "ac",
        terminalCount: 2,
        custom: true
      });

      const updatedStats = await getDBStats();
      expect(updatedStats.templates).toBe(1);
    });
  });
});
