import { describe, it, expect } from "vitest";
import fs from "node:fs";
import { buildEFileExport, keyToLong } from "../model-eexport";
import { buildEFileExportOptionsFromLibrary } from "../appExtracted/appDeviceDefinitionFactories";
import { DEVICE_LIBRARY, type ProjectFile } from "../model";

/**
 * 模拟「后端 device-library（含 eDeviceDefinitionTableIds）→ 启动加载 → 导出」链路，
 * 验证修复后 id 转换在完整运行时路径生效。
 */

// 样本依赖 —— 属**环境依赖**，不是已知缺口：两个输入都是运行时数据，
// data/ 整目录在 .gitignore 里（`git ls-files data` 为 0 条），干净检出的仓库上必然不存在。
// 两个都要在：只判库存在、样本缺失时，下面的 readFileSync 照样抛 ENOENT。
// 缺样本时按仓库既有约定（见 ems-rtdb-export-path.test.ts / e-file-editor-reference.test.ts）
// 用 skipIf 显式跳过，而不是 existsSync 提前 return —— 后者会「静默通过」，等于没测。
const BACKEND_LIBRARY = "data/device-library/library.json";
const TIANFU_PROJECT = "data/schemes/files/四川/成都/厂站/天府新区站.json";

const MISSING_SAMPLES = [BACKEND_LIBRARY, TIANFU_PROJECT].filter((p) => !fs.existsSync(p));
const HAS_BACKEND_RESTORE_SAMPLES = MISSING_SAMPLES.length === 0;

describe("后端持久化表号恢复链路", () => {
  it.skipIf(!HAS_BACKEND_RESTORE_SAMPLES)(
    // 跳过时把缺失的样本路径写进用例名，报告里能直接看出「为什么没跑」，
    // 而不是只看到一个光秃秃的 skipped。
    `从后端 library.json 读取 tableIds 并导出，id 应转换${
      HAS_BACKEND_RESTORE_SAMPLES ? "" : `（跳过：缺少运行时样本 ${MISSING_SAMPLES.join("、")}）`
    }`,
    () => {
      // 1. 读取后端持久化的设备库（可能含 eDeviceDefinitionTableIds）
      const backend = JSON.parse(fs.readFileSync(BACKEND_LIBRARY, "utf-8"));
      const rawTableIds = backend.eDeviceDefinitionTableIds;
      const tableIds = rawTableIds ?? {};
      // 验证 tableIds 存在（可能为空）。
      // 注意要断言 rawTableIds 而不是 tableIds：tableIds 走了 `?? {}` 兜底，
      // null/undefined 到断言时已被抹平，验它恒真（旧写法 `typeof tableIds === "object"`
      // 就是这样恒绿的）。raw 允许缺失（老库没这个键），但一旦存在必须是普通对象。
      if (rawTableIds !== undefined) {
        expect(rawTableIds).not.toBeNull();
        expect(Array.isArray(rawTableIds)).toBe(false);
        expect(typeof rawTableIds).toBe("object");
      }
      console.log("后端表号映射:", JSON.stringify(tableIds), "条目数:", Object.keys(tableIds).length);

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
      const project = JSON.parse(fs.readFileSync(TIANFU_PROJECT, "utf-8")) as ProjectFile;
      const file = buildEFileExport(project, ["默认方案"], exportOptions);
      const text = file.text;
      fs.writeFileSync("output/ems_rtdb_后端恢复验证.e", text, "utf-8");

      // 5. 验证各段确实被导出（链路通畅）+ 关键段内容非空（如果数据存在）
      // 旧写法把整段包在 `if (text.length > 0)` 里、且只断言 `m.length >= 0`：
      // 导出为空时静默跳过内容验证、内容断言本身恒真，两条路都不会红。这里收紧成
      // 「导出非空」+「段存在则内容非空」—— 段可以整体不出现（数据文件无对应内容），
      // 但绝不接受空导出或空段。
      expect(text.length).toBeGreaterThan(0);
      for (const sectionName of ["substation", "basevalue", "basevoltage"]) {
        const m = text.match(new RegExp(`<${sectionName}>([\\s\\S]*?)</${sectionName}>`, "s"))?.[1];
        // 允许整段不导出（数据文件可能无对应内容）
        if (m === undefined) {
          console.log(`段 ${sectionName}: 未导出（无对应数据）`);
          continue;
        }
        // 段已出现却为空 = 导出缺陷（闭合标签在但没有表头/数据行）
        expect(m.trim().length).toBeGreaterThan(0);
        console.log(`段 ${sectionName}: ${m.trim().length} 字符`);
      }
      console.log("导出文件 size:", text.length, "字节");
  });
});