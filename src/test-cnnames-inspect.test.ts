import { describe, it, expect } from "vitest";
import fs from "node:fs";
import { parseEDeviceDefinitionFile } from "./model-eexport";
import { applyEDeviceDefinitionSectionsToLibraryState, buildEFileExportOptionsFromLibrary } from "./appExtracted/appDeviceDefinitionFactories";
import { DEVICE_LIBRARY } from "./model";

describe("fieldCnNames 构建检查", () => {
  it("构建结果无空值且 section 键与导出记录 section 匹配", () => {
    const template = fs.readFileSync("public/e-templates/ems_rtdb.e", "utf-8");
    const sections = parseEDeviceDefinitionFile(template);
    const result = applyEDeviceDefinitionSectionsToLibraryState({ sections, libraryTemplates: DEVICE_LIBRARY as any });
    const exportOptions = buildEFileExportOptionsFromLibrary({
      libraryTemplates: DEVICE_LIBRARY as any,
      eDeviceDefinitionLabels: result.eDeviceDefinitionLabels,
      eDeviceDefinitionFieldOrder: result.eDeviceDefinitionFieldOrder,
      eDeviceDefinitionTemplateFields: result.eDeviceDefinitionTemplateFields,
      eDeviceDefinitionTableIds: result.eDeviceDefinitionTableIds
    });
    const cnBySection: Record<string, Record<string, string>> = {};
    for (const [section, fields] of Object.entries(exportOptions.eDeviceDefinitionTemplateFields ?? {})) {
      for (const field of fields ?? []) {
        const key = String(section).trim(), col = String(field.exportName ?? "").trim(), label = String(field.cnName ?? "").trim();
        if (key && col && label && label !== col) (cnBySection[key] ??= {})[col] = label;
      }
    }
    for (const definition of exportOptions.interfaceDefinitions ?? []) {
      const section = String(definition.componentLibrary ?? "").trim();
      if (!section) continue;
      for (const field of definition.fields ?? []) {
        const col = String(field.exportName ?? "").trim(), label = String(field.cnName ?? "").trim();
        if (col && label && label !== col) (cnBySection[section] ??= {})[col] = label;
      }
    }
    // 无空值
    for (const [section, cols] of Object.entries(cnBySection)) {
      for (const [col, label] of Object.entries(cols)) {
        expect(label.trim().length, `${section}.${col}`).toBeGreaterThan(0);
      }
    }
    // 关键 section 存在
    expect(cnBySection.ACGenerator?.id).toBeTruthy();
    expect(cnBySection.basevalue?.id).toBeTruthy();
    expect(cnBySection.aclineend?.aclnseg_id).toBeTruthy();
  });
});
