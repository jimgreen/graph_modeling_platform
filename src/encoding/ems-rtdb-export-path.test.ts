import { describe, it, expect } from "vitest";
import fs from "node:fs";
import { parseEDeviceDefinitionFile, buildEFileExport, keyToLong } from "../model-eexport";
import { applyEDeviceDefinitionSectionsToLibraryState, buildEFileExportOptionsFromLibrary } from "../appExtracted/appDeviceDefinitionFactories";
import { DEVICE_LIBRARY, type ProjectFile } from "../model";

/**
 * 验证 createExportEFile 完整导出路径（含 eDeviceDefinitionTableIds）：
 * id 字段必须按 key_to_long 转换（用户反馈桌面导出文件 id 未转换）
 */
const TIANFU_PROJECT = "data/schemes/files/四川/成都/厂站/天府新区站.json";

// 显式条件跳过的**唯一**理由：环境依赖 —— 不是用例写错、不是断言过时、也不是所依赖的 bug 已修。
// 本用例要读真实工程样本，而 .gitignore 第 3 行 `data/` 忽略整个目录（运行时数据），
// 该样本本身也未被 git 跟踪（`git ls-files` 查不到），干净检出的仓库上必然缺失。
// 缺样本时跳过本条，别让 ENOENT 报成「导出逻辑坏了」。
//
// 反向核对（守卫没有掩盖失败）：
// · 样本在场时本条是真跑通的，不是恒绿 —— 期望的两个 id 在样本原文里搜不到
//   （节点 id 形如 `static-text-qe97l2a`，全文无长数字串），只能由 key_to_long 算出，
//   所以「忘了转换」这类回归会让本条转红。
// · 守卫只看「样本在不在」这一个条件，不含任何放宽断言的分支。
const HAS_TIANFU_SAMPLE = fs.existsSync(TIANFU_PROJECT);

describe("导出 E 文件 id 转换（完整路径）", () => {
  // 样本缺失（干净检出）时跳过；样本在场则真跑并断言，见上方说明。
  it.skipIf(!HAS_TIANFU_SAMPLE)("模拟 createExportEFile 导出，id 字段应为计算值", () => {
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
    const project = JSON.parse(fs.readFileSync(TIANFU_PROJECT, "utf-8")) as ProjectFile;
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
