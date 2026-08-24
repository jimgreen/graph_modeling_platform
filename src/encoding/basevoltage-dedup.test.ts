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

  it("模型无有效电压等级时回退全量配置（仅 1 个 basevoltage 段，按数值去重）", () => {
    const project = JSON.parse(fs.readFileSync("data/schemes/files/四川/成都/厂站/天府新区站.json", "utf-8")) as ProjectFile;
    const text = buildEDeviceParameterFile(project, ["默认方案"], exportOptions);
    const counts = countSectionRows(text, "basevoltage");
    expect(counts.length).toBe(1);
    // 提取模型实际电压字段（vbase/voltage_level/rated_voltage）后去重，行数远小于 ac/dc 全量 26
    expect(counts[0]).toBeGreaterThan(0);
    expect(counts[0]).toBeLessThan(26);
  });

  it("vbase 全 0 但节点带 voltage_level：只输出模型实际等级，不重复", () => {
    const project = JSON.parse(fs.readFileSync("data/schemes/files/主配微联合/地区1/主网/双母线.json", "utf-8")) as ProjectFile;
    const text = buildEDeviceParameterFile(project, ["默认方案"], exportOptions);
    const counts = countSectionRows(text, "basevoltage");
    expect(counts.length).toBe(1);
    // 模型 12 节点仅母线有 voltage_level=10 → 1 行，不再 26 行重复
    expect(counts[0]).toBe(1);
    const m = text.match(/<basevoltage>([\s\S]*?)<\/basevoltage>/);
    const rows = m![1].split("\n").filter((l) => l.trim().startsWith("#"));
    const nomvols = rows.map((r) => r.split(/\s+/).filter(Boolean)[3]);
    expect([...nomvols].sort()).toEqual(["10"]);
  });
});
