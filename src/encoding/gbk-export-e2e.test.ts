// 端到端验证：天府新区站 + ems_rtdb 模板 → buildEFileExport → encodeGbk → 文件字节为 GBK
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import { join } from "node:path";
import iconv from "iconv-lite";
import { parseEDeviceDefinitionFile, buildEFileExport } from "../model-eexport";
import { applyEDeviceDefinitionSectionsToLibraryState, buildEFileExportOptionsFromLibrary } from "../appExtracted/appDeviceDefinitionFactories";
import { DEVICE_LIBRARY } from "../model";
import { encodeGbk } from "./gbk";

describe("E 文件导出端到端 GBK 验证", () => {
  it("导出文本经 encodeGbk 后为合法 GBK，且可被 iconv-lite 无损解码", () => {
    const text = fs.readFileSync(join(process.cwd(), "public/e-templates/ems_rtdb.e"), "utf-8");
    const sections = parseEDeviceDefinitionFile(text);
    const result = applyEDeviceDefinitionSectionsToLibraryState({
      sections,
      customDeviceTemplates: [],
      libraryTemplates: DEVICE_LIBRARY,
      deviceDefinitionOverrides: {},
      eDeviceDefinitionLabels: {},
      eDeviceDefinitionClassExportEnabled: {},
      labels: {},
      resolveDefinitionComponentLibrary: undefined
    });
    const options = buildEFileExportOptionsFromLibrary({
      libraryTemplates: DEVICE_LIBRARY,
      labels: {},
      eDeviceDefinitionLabels: result.eDeviceDefinitionLabels,
      eDeviceDefinitionClassExportEnabled: result.eDeviceDefinitionClassExportEnabled,
      eDeviceDefinitionFieldOrder: result.eDeviceDefinitionFieldOrder,
      eDeviceDefinitionTemplateFields: result.eDeviceDefinitionTemplateFields,
      resolveDefinitionComponentLibrary: undefined
    });
    const project = JSON.parse(fs.readFileSync(join(process.cwd(), "data/schemes/files/四川/成都/厂站/天府新区站.json"), "utf-8"));
    const file = buildEFileExport(project, ["四川", "成都", "厂站"], options);
    // 导出文本 -> GBK 字节
    const gbkBytes = encodeGbk(file.text);
    // 用 iconv-lite 解码验证无损
    const decoded = iconv.decode(Buffer.from(gbkBytes), "gbk");
    expect(decoded).toBe(file.text);
    // 与 UTF-8 字节不同（证明确实是 GBK）
    const utf8Bytes = new TextEncoder().encode(file.text);
    expect(gbkBytes.length).not.toBe(utf8Bytes.length);
    // 中文行应包含 GBK 双字节（非 UTF-8 三字节）
    expect(gbkBytes.length).toBeLessThan(utf8Bytes.length);
    // 写出文件供人工检查
    fs.writeFileSync("output/e2e_gbk_check.e", Buffer.from(gbkBytes));
  });
});
