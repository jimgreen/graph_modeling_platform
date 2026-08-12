import { describe, it, expect } from "vitest";
import fs from "node:fs";
import { parseEDeviceDefinitionFile, buildEFileExport, keyToLong } from "../model-eexport";
import { applyEDeviceDefinitionSectionsToLibraryState, buildEFileExportOptionsFromLibrary } from "../appExtracted/appDeviceDefinitionFactories";
import { DEVICE_LIBRARY, type ProjectFile } from "../model";

/**
 * 验证 createExportEFile 完整导出路径（含 eDeviceDefinitionTableIds）：
 * id 字段必须按 key_to_long 转换（用户反馈桌面导出文件 id 未转换）
 */
describe("导出 E 文件 id 转换（完整路径）", () => {
  it("模拟 createExportEFile 导出，id 字段应为计算值", () => {
    const template = fs.readFileSync("public/e-templates/ems_rtdb.e", "utf-8");
    const sections = parseEDeviceDefinitionFile(template);
    const result = applyEDeviceDefinitionSectionsToLibraryState({
      sections,
      libraryTemplates: DEVICE_LIBRARY as any
    });
    // 模拟 createExportEFile 中的 exportOptions 构建（含 eDeviceDefinitionTableIds）
    const exportOptions = buildEFileExportOptionsFromLibrary({
      libraryTemplates: DEVICE_LIBRARY as any,
      labels: {} as any,
      eDeviceDefinitionLabels: result.eDeviceDefinitionLabels,
      eDeviceDefinitionClassExportEnabled: result.eDeviceDefinitionClassExportEnabled,
      eDeviceDefinitionFieldOrder: result.eDeviceDefinitionFieldOrder,
      eDeviceDefinitionTemplateFields: result.eDeviceDefinitionTemplateFields,
      eDeviceDefinitionTableIds: result.eDeviceDefinitionTableIds,
      resolveDefinitionComponentLibrary: ((template: any) => template.kind) as any
    });
    const project = JSON.parse(fs.readFileSync("data/schemes/files/四川/成都/厂站/天府新区站.json", "utf-8")) as ProjectFile;
    const file = buildEFileExport(project, ["默认方案"], exportOptions);
    const text = file.text;
    fs.writeFileSync("output/ems_rtdb_桌面路径验证.e", text, "utf-8");
    console.log("文件名:", file.filename, "大小:", text.length);

    // 检查 generatingunit 的 id
    const gu = text.match(/<generatingunit>([\s\S]*?)<\/generatingunit>/s)?.[1] ?? "";
    const guCols = gu.split("\n").find((l) => l.trim().startsWith("@"))!.slice(1).split("  ").map((c) => c.trim()).filter(Boolean);
    const guIdIndex = guCols.indexOf("id");
    const guFirst = gu.split("\n").find((l) => l.trim().startsWith("#"))!.slice(1).split("  ").map((c) => c.trim()).filter(Boolean);
    console.log("generatingunit 第一行 id =", guFirst[guIdIndex]);
    expect(guFirst[guIdIndex]).toBe("115686215428079617");

    // 检查 substation
    const st = text.match(/<substation>([\s\S]*?)<\/substation>/s)?.[1] ?? "";
    const stCols = st.split("\n").find((l) => l.trim().startsWith("@"))!.slice(1).split("  ").map((c) => c.trim()).filter(Boolean);
    const stIdIndex = stCols.indexOf("id");
    const stFirst = st.split("\n").find((l) => l.trim().startsWith("#"))!.slice(1).split("  ").map((c) => c.trim()).filter(Boolean);
    console.log("substation 第一行 id =", stFirst[stIdIndex]);
    expect(stFirst[stIdIndex]).toBe("113997365567815681");
  });
});
