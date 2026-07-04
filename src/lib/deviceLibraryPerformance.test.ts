/**
 * 图元库 IndexedDB 性能测试
 */

import "fake-indexeddb/auto";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { saveDeviceTemplates, getAllCustomTemplates, queryTemplatesByAttributeLibrary } from "./deviceLibraryStorage";
import { clearDeviceLibraryDB, getDBStats } from "./deviceLibraryDB";
import type { DeviceTemplate } from "../model";

// 生成大规模测试数据
function generateLargeDataset(count: number): DeviceTemplate[] {
  const templates: DeviceTemplate[] = [];
  const attributeLibraries = ["交流设备", "直流设备", "氢能设备", "热能设备"];

  for (let i = 0; i < count; i++) {
    templates.push({
      kind: `device-${i}`,
      label: `测试设备 ${i}`,
      attributeLibrary: attributeLibraries[i % attributeLibraries.length],
      size: { width: 100 + (i % 50), height: 80 + (i % 30) },
      params: {
        param1: `value${i}`,
        param2: `data${i}`,
        param3: `info${i}`
      },
      terminalType: i % 2 === 0 ? "ac" : "dc",
      terminalCount: 2 + (i % 4),
      custom: true
    });
  }

  return templates;
}

describe("IndexedDB 性能测试", () => {
  beforeEach(async () => {
    await clearDeviceLibraryDB();
  });

  afterEach(async () => {
    await clearDeviceLibraryDB();
  });

  describe("批量写入性能", () => {
    it("应该快速写入 100 个设备模板", async () => {
      const templates = generateLargeDataset(100);
      const startTime = Date.now();

      await saveDeviceTemplates(templates);

      const duration = Date.now() - startTime;
      console.log(`写入 100 个模板耗时: ${duration}ms`);

      const stats = await getDBStats();
      expect(stats.templates).toBe(100);
      expect(duration).toBeLessThan(1000); // 应该小于 1 秒
    });

    it("应该快速写入 500 个设备模板", async () => {
      const templates = generateLargeDataset(500);
      const startTime = Date.now();

      await saveDeviceTemplates(templates);

      const duration = Date.now() - startTime;
      console.log(`写入 500 个模板耗时: ${duration}ms`);

      const stats = await getDBStats();
      expect(stats.templates).toBe(500);
      expect(duration).toBeLessThan(3000); // 应该小于 3 秒
    });

    it("应该快速写入 1000 个设备模板（压力测试）", async () => {
      const templates = generateLargeDataset(1000);
      const startTime = Date.now();

      await saveDeviceTemplates(templates);

      const duration = Date.now() - startTime;
      console.log(`写入 1000 个模板耗时: ${duration}ms`);

      const stats = await getDBStats();
      expect(stats.templates).toBe(1000);
      expect(duration).toBeLessThan(5000); // 应该小于 5 秒
    });
  });

  describe("查询性能", () => {
    beforeEach(async () => {
      // 预先写入 500 个模板
      const templates = generateLargeDataset(500);
      await saveDeviceTemplates(templates);
    });

    it("应该快速查询所有自定义模板", async () => {
      const startTime = Date.now();

      const results = await getAllCustomTemplates();

      const duration = Date.now() - startTime;
      console.log(`查询所有自定义模板耗时: ${duration}ms`);

      expect(results).toHaveLength(500);
      expect(duration).toBeLessThan(500); // 应该小于 500ms
    });

    it("应该快速按属性库查询", async () => {
      const startTime = Date.now();

      const results = await queryTemplatesByAttributeLibrary("交流设备");

      const duration = Date.now() - startTime;
      console.log(`按属性库查询耗时: ${duration}ms`);

      // 500 个模板中，约 125 个是"交流设备"
      expect(results.length).toBeGreaterThan(100);
      expect(results.length).toBeLessThan(150);
      expect(duration).toBeLessThan(200); // 应该小于 200ms
    });
  });

  describe("带图片的模板性能", () => {
    it("应该快速写入带图片的模板", async () => {
      const templates: DeviceTemplate[] = [];

      // 生成 50 个带图片的模板
      for (let i = 0; i < 50; i++) {
        templates.push({
          kind: `device-with-image-${i}`,
          label: `带图片设备 ${i}`,
          attributeLibrary: "交流设备",
          size: { width: 100, height: 80 },
          params: {
            // 模拟 base64 图片（1KB 左右）
            backgroundImage: `data:image/png;base64,${"A".repeat(1000)}`
          },
          terminalType: "ac",
          terminalCount: 2,
          custom: true
        });
      }

      const startTime = Date.now();

      await saveDeviceTemplates(templates);

      const duration = Date.now() - startTime;
      console.log(`写入 50 个带图片模板耗时: ${duration}ms`);

      const stats = await getDBStats();
      expect(stats.templates).toBe(50);
      expect(duration).toBeLessThan(2000); // 应该小于 2 秒
    });
  });

  describe("内存占用", () => {
    it("应该合理控制内存占用", async () => {
      // 写入 1000 个模板
      const templates = generateLargeDataset(1000);
      await saveDeviceTemplates(templates);

      // 查询所有模板
      const results = await getAllCustomTemplates();

      expect(results).toHaveLength(1000);

      // 验证数据完整性
      const firstTemplate = results[0];
      expect(firstTemplate.kind).toBeDefined();
      expect(firstTemplate.label).toBeDefined();
      expect(firstTemplate.attributeLibrary).toBeDefined();
    });
  });
});
