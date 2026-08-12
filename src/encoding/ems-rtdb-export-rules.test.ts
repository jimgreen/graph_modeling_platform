import { describe, it, expect } from "vitest";
import fs from "node:fs";
import { parseEDeviceDefinitionFile, buildEDeviceParameterFile, keyToLong } from "../model-eexport";
import { applyEDeviceDefinitionSectionsToLibraryState, buildEFileExportOptionsFromLibrary } from "../appExtracted/appDeviceDefinitionFactories";
import { DEVICE_LIBRARY, type ProjectFile } from "../model";

/**
 * XX实时库（ems_rtdb.e）模板导出规则测试：
 * 1. 导入模板时模板 id 字段对应元件 idx 属性（sourceName=idx, exportName=id）
 * 2. 模板表号属性解析并传递到导出选项
 * 3. 导出时 id 字段按 key_to_long(表号, 0, 行号) 计算（行号从 1 开始）
 * 4. 引用字段（st_id/bv_id/subarea_id/tr_id 等）同步为目标表记录的计算后 id
 */
describe("XX实时库模板导出规则", () => {
  const template = fs.readFileSync("public/e-templates/ems_rtdb.e", "utf-8");
  const sections = parseEDeviceDefinitionFile(template);
  const result = applyEDeviceDefinitionSectionsToLibraryState({
    sections,
    libraryTemplates: DEVICE_LIBRARY as any
  });
  const exportOptions = buildEFileExportOptionsFromLibrary({
    libraryTemplates: DEVICE_LIBRARY as any,
    eDeviceDefinitionLabels: result.eDeviceDefinitionLabels,
    eDeviceDefinitionFieldOrder: result.eDeviceDefinitionFieldOrder,
    eDeviceDefinitionTemplateFields: result.eDeviceDefinitionTemplateFields,
    eDeviceDefinitionTableIds: result.eDeviceDefinitionTableIds
  });
  const project = JSON.parse(fs.readFileSync("data/schemes/files/四川/成都/厂站/天府新区站.json", "utf-8")) as ProjectFile;

  function sectionData(name: string) {
    const text = buildEDeviceParameterFile(project, ["默认方案"], exportOptions);
    const m = text.match(new RegExp(`<${name}>([\\s\\S]*?)</${name}>`));
    if (!m) return null;
    const body = m[1];
    const at = body.split("\n").find((l) => l.trim().startsWith("@"))!;
    const cols = at.slice(1).split("  ").map((c) => c.trim()).filter(Boolean);
    const data = body.split("\n").filter((l) => l.trim().startsWith("#"));
    return { cols, data };
  }

  it("key_to_long 计算正确（field_id=0, key_no 从 1 开始）", () => {
    expect(keyToLong("00411", 0, 1)).toBe("115686215428079617");
    expect(keyToLong("00405", 0, 1)).toBe("113997365567815681");
    expect(keyToLong("00401", 0, 1)).toBe("112871465660973057");
    // 平台真实输出：aclineend 第一行 116812115334922241 = 415<<48+1
    expect(keyToLong("00415", 0, 1)).toBe("116812115334922241");
  });

  it("导入模板时模板 id 字段对应元件 idx 属性（不改元件 idx 属性本身）", () => {
    const tf = result.eDeviceDefinitionTemplateFields ?? {};
    for (const lib of ["ACGenerator", "ACBreak", "ACSwitch", "ACLoad", "ACTransformer", "ACTransWinding", "ACRealBs"]) {
      const idField = tf[lib]?.find((f: any) => f.exportName === "id");
      expect(idField, `${lib} 有 id 字段`).toBeTruthy();
      expect(idField!.sourceName).toBe("idx");
    }
    // 导出 interfaceDefinitions：模板映射元件库的 idx 字段保留（sourceName=idx），仅导出名为 id
    const mappedLibraries = Object.keys(result.eDeviceDefinitionTableIds ?? {});
    const problems: string[] = [];
    for (const lib of mappedLibraries) {
      const def = exportOptions.interfaceDefinitions.find((d) => d.componentLibrary === lib);
      if (!def) continue;
      const idxField = def.fields?.find((f: any) => f.sourceName === "idx");
      if (idxField && idxField.exportName !== "id") {
        problems.push(`${lib}: idx exportName=${idxField.exportName}`);
      }
      if (def.fields?.some((f: any) => f.sourceName === "id")) {
        problems.push(`${lib}: 存在 sourceName=id 占位字段`);
      }
    }
    expect(problems).toEqual([]);
    // 元件 override 中 idx 定义不被 patch（exportName 保持 idx）
    for (const override of Object.values(result.deviceDefinitionOverrides ?? {})) {
      const idxDef = (override as any).parameterDefinitions?.find((d: any) => d.enName === "idx");
      if (idxDef && idxDef.exportName && idxDef.exportName !== "idx") {
        expect.fail(`元件 idx 属性被修改: exportName=${idxDef.exportName}`);
      }
    }
  });

  it("模板解析出表号并传递到导出选项", () => {
    expect(sections.find((s) => s.kind === "generatingunit")?.tableId).toBe("00411");
    expect(sections.find((s) => s.kind === "breaker")?.tableId).toBe("00407");
    expect(result.eDeviceDefinitionTableIds?.["ACGenerator"]).toBe("00411");
    expect(exportOptions.eDeviceDefinitionTableIds?.["ACGenerator"]).toBe("00411");
  });

  it("导出文件中 generatingunit id 为计算值", () => {
    const s = sectionData("generatingunit")!;
    const idColIndex = s.cols.indexOf("id");
    const cells = s.data[0].slice(1).split("  ").map((c) => c.trim()).filter(Boolean);
    expect(cells[idColIndex]).toBe("115686215428079617");
  });

  it("头表 substation/basevoltage/subcontrolarea 使用模板 id 列并计算", () => {
    for (const [name, expectedId] of [
      ["substation", "113997365567815681"],
      ["basevoltage", "112871465660973057"],
      ["subcontrolarea", "113715890591105025"]
    ] as const) {
      const s = sectionData(name)!;
      const idColIndex = s.cols.indexOf("id");
      expect(idColIndex, `${name} 有 id 列`).toBeGreaterThanOrEqual(0);
      const cells = s.data[0].slice(1).split("  ").map((c) => c.trim()).filter(Boolean);
      expect(cells[idColIndex]).toBe(expectedId);
    }
  });

  it("引用字段 st_id/bv_id/tr_id/subarea_id 同步为目标表 id", () => {
    // generatingunit.st_id 应指向 substation 第一行
    const gu = sectionData("generatingunit")!;
    const guIdx = new Map(gu.cols.map((c, i) => [c, i]));
    const guCells = gu.data[0].slice(1).split("  ").map((c) => c.trim()).filter(Boolean);
    expect(guCells[guIdx.get("st_id")!]).toBe("113997365567815681");
    expect(guCells[guIdx.get("bv_id")!]).toBeTruthy();
    // transformerwinding.tr_id 应指向 powertransformer 第一行
    const tw = sectionData("transformerwinding")!;
    const twIdx = new Map(tw.cols.map((c, i) => [c, i]));
    const twCells = tw.data[0].slice(1).split("  ").map((c) => c.trim()).filter(Boolean);
    if (twIdx.has("tr_id")) {
      expect(twCells[twIdx.get("tr_id")!]).toBe("117093590311632897");
    }
    // substation.subarea_id 应指向 subcontrolarea 第一行
    const st = sectionData("substation")!;
    const stIdx = new Map(st.cols.map((c, i) => [c, i]));
    if (stIdx.has("subarea_id")) {
      const stCells = st.data[0].slice(1).split("  ").map((c) => c.trim()).filter(Boolean);
      expect(stCells[stIdx.get("subarea_id")!]).toBe("113715890591105025");
    }
  });
});
