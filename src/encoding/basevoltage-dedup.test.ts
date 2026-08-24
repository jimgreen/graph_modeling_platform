import { describe, it, expect } from "vitest";
import fs from "node:fs";
import { parseEDeviceDefinitionFile, buildEDeviceParameterFile } from "../model-eexport";
import { applyEDeviceDefinitionSectionsToLibraryState, buildEFileExportOptionsFromLibrary } from "../appExtracted/appDeviceDefinitionFactories";
import { DEVICE_LIBRARY, type ProjectFile } from "../model";

/**
 * basevoltage 段去重回归测试：
 * 导出 basevoltage 只输出模型实际使用的电压等级（按配置顺序、vltp 数值去重），
 * 不输出 ac/dc 全量配置等级（每个等级重复两份）；模型无有效电压等级时回退全量。
 */
describe("basevoltage 去重", () => {
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

  function countSectionRows(text: string, name: string) {
    const matches = [...text.matchAll(new RegExp(`<${name}>([\\s\\S]*?)</${name}>`, "g"))];
    return matches.map((m) => m[1].split("\n").filter((l) => l.trim().startsWith("#")).length);
  }

  function busNode(id: string, name: string, vbase: string) {
    return {
      id,
      kind: "ac-bus",
      name,
      position: { x: 0, y: 0 },
      size: { width: 100, height: 20 },
      rotation: 0,
      params: { vbase, name },
      terminals: [{ type: "ac", vbase, anchor: { x: 0.5, y: 0.5 }, nodeNumber: id }]
    } as any;
  }

  it("双母线（110/10）：basevoltage 恰好 2 行，无 ac/dc 重复", () => {
    const project: ProjectFile = {
      version: 1,
      name: "双母线",
      nodes: [
        busNode("b1", "1M", "110"),
        busNode("b2", "2M", "110"),
        busNode("l1", "负荷", "10")
      ],
      edges: []
    } as any;
    const text = buildEDeviceParameterFile(project, ["默认方案"], exportOptions);
    expect(countSectionRows(text, "basevoltage")).toEqual([2]);
    const m = text.match(/<basevoltage>([\s\S]*?)<\/basevoltage>/);
    const rows = m![1].split("\n").filter((l) => l.trim().startsWith("#"));
    const nomvols = rows.map((r) => r.split(/\s+/).filter(Boolean)[3]);
    expect([...nomvols].sort()).toEqual(["10", "110"]);
  });

  it("模型无有效电压等级时回退全量配置（仅 1 个 basevoltage 段）", () => {
    const project = JSON.parse(fs.readFileSync("data/schemes/files/四川/成都/厂站/天府新区站.json", "utf-8")) as ProjectFile;
    const text = buildEDeviceParameterFile(project, ["默认方案"], exportOptions);
    expect(countSectionRows(text, "basevoltage")).toEqual([26]);
  });
});
