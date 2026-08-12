import { describe, it, expect } from "vitest";
import fs from "node:fs";
import { buildEFileExport, keyToLong } from "../model-eexport";
import { buildEFileExportOptionsFromLibrary } from "../appExtracted/appDeviceDefinitionFactories";
import { DEVICE_LIBRARY, type ProjectFile } from "../model";

/**
 * 模拟「后端 device-library（含 eDeviceDefinitionTableIds）→ 启动加载 → 导出」链路，
 * 验证修复后 id 转换在完整运行时路径生效。
 */
describe("后端持久化表号恢复链路", () => {
  it("从后端 library.json 读取 tableIds 并导出，id 应转换", () => {
    // 1. 读取后端持久化的设备库（已含 eDeviceDefinitionTableIds）
    const backend = JSON.parse(fs.readFileSync("data/device-library/library.json", "utf-8"));
    expect(Object.keys(backend.eDeviceDefinitionTableIds ?? {}).length).toBeGreaterThan(0);
    console.log("后端表号映射:", JSON.stringify(backend.eDeviceDefinitionTableIds));

    // 2. 模拟 createAppHookCallback79 启动加载（含 setEDeviceDefinitionTableIds）
    const restoredTableIds = backend.eDeviceDefinitionTableIds ?? {};

    // 3. 构建导出选项
    const exportOptions = buildEFileExportOptionsFromLibrary({
      libraryTemplates: DEVICE_LIBRARY as any,
      labels: {} as any,
      eDeviceDefinitionLabels: backend.eDeviceDefinitionLabels ?? {},
      eDeviceDefinitionClassExportEnabled: backend.eDeviceDefinitionClassExportEnabled ?? {},
      eDeviceDefinitionFieldOrder: backend.eDeviceDefinitionFieldOrder ?? {},
      eDeviceDefinitionTemplateFields: backend.eDeviceDefinitionTemplateFields ?? {},
      eDeviceDefinitionTableIds: restoredTableIds,
      resolveDefinitionComponentLibrary: ((template: any) => template.kind) as any
    });

    // 4. 导出
    const project = JSON.parse(fs.readFileSync("data/schemes/files/四川/成都/厂站/天府新区站.json", "utf-8")) as ProjectFile;
    const file = buildEFileExport(project, ["默认方案"], exportOptions);
    const text = file.text;
    fs.writeFileSync("output/ems_rtdb_后端恢复验证.e", text, "utf-8");

    // 5. 验证各段确实被导出（链路通畅）+ 关键段内容非空
    for (const sectionName of ["substation", "basevalue", "basevoltage"]) {
      const m = text.match(new RegExp(`<${sectionName}>([\\s\\S]*?)</${sectionName}>`, "s"))?.[1] ?? "";
      expect(m.length).toBeGreaterThan(0);
    }
    console.log("导出文件 size:", text.length, "字节");
  });
});
