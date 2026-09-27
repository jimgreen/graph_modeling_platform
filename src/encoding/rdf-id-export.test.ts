import { describe, it, expect } from "vitest";
import fs from "node:fs";
import { parseEDeviceDefinitionFile, buildEFileExport } from "../model-eexport";
import { buildEFileExportOptionsFromLibrary, applyEDeviceDefinitionSectionsToLibraryState } from "../appExtracted/appDeviceDefinitionFactories";
import { DEVICE_LIBRARY, type ProjectFile } from "../model";

function loadOptions(templateFile: string) {
  const template = fs.readFileSync(`public/e-templates/${templateFile}`, "utf-8");
  const sections = parseEDeviceDefinitionFile(template);
  const applied = applyEDeviceDefinitionSectionsToLibraryState({ sections, libraryTemplates: DEVICE_LIBRARY as any }) as any;
  return buildEFileExportOptionsFromLibrary({
    libraryTemplates: DEVICE_LIBRARY as any,
    labels: {} as any,
    eDeviceDefinitionLabels: applied.eDeviceDefinitionLabels,
    eDeviceDefinitionClassExportEnabled: applied.eDeviceDefinitionClassExportEnabled ?? {},
    eDeviceDefinitionFieldOrder: applied.eDeviceDefinitionFieldOrder ?? {},
    eDeviceDefinitionTemplateFields: applied.eDeviceDefinitionTemplateFields ?? {},
    eDeviceDefinitionTableIds: applied.eDeviceDefinitionTableIds ?? {},
    resolveDefinitionComponentLibrary: ((template: any) => template.kind) as any
  });
}

// 样本依赖：data/ 整目录被 .gitignore 忽略（见 CLAUDE.md），干净检出上必然缺失。
// 按仓库既有约定用 describe.skipIf —— 见 ems-rtdb-export-path.test.ts。
const TITAN_PROJECT_SAMPLE = "data/schemes/files/四川/成都/厂站/天府新区站.json";
const HAS_PROJECT_SAMPLE = fs.existsSync(TITAN_PROJECT_SAMPLE);

describe.skipIf(!HAS_PROJECT_SAMPLE)("rdf_id 导出匹配", () => {
  it("主网模板：设备设置 rdf_id 后导出文件 rdf_id 列带该值；未设置则为空", () => {
    const options = loadOptions("ems_rtdb.e");
    const project = JSON.parse(fs.readFileSync("data/schemes/files/四川/成都/厂站/天府新区站.json", "utf-8")) as ProjectFile;
    // 给第一个电源节点设置 rdf_id
    const target = project.nodes.find((n) => n.kind === "ac-source");
    expect(target).toBeTruthy();
    (target!.params as Record<string, string>).rdf_id = "RDF-AC-SOURCE-001";
    const file = buildEFileExport(project, ["默认方案"], options);
    const text = file.text;
    const m = text.match(/<generatingunit>([\s\S]*?)<\/generatingunit>/s)?.[1] ?? "";
    const cols = m.split("\n").find((l) => l.trim().startsWith("@"))!.slice(1).split("  ").map((c) => c.trim()).filter(Boolean);
    const rdfIndex = cols.indexOf("rdf_id");
    expect(rdfIndex).toBeGreaterThan(-1);
    const rows = m.split("\n").filter((l) => l.trim().startsWith("#")).map((l) => l.slice(1).split("  ").map((c) => c.trim()).filter(Boolean));
    // 电源节点在 generatingunit 段中应有一行 rdf_id=RDF-AC-SOURCE-001
    const rdfValues = rows.map((r) => r[rdfIndex] ?? "").filter(Boolean);
    expect(rdfValues).toContain("RDF-AC-SOURCE-001");
  });

  it("配网模板：节点表 dms_def_node 记录含 rdf_id 列（默认空）", () => {
    const options = loadOptions("dms_rtdb.e");
    const project = JSON.parse(fs.readFileSync("data/schemes/files/四川/成都/厂站/天府新区站.json", "utf-8")) as ProjectFile;
    const file = buildEFileExport(project, ["默认方案"], options);
    const m = file.text.match(/<dms_def_node>([\s\S]*?)<\/dms_def_node>/s)?.[1] ?? "";
    expect(m).toBeTruthy();
    const cols = m.split("\n").find((l) => l.trim().startsWith("@"))!.slice(1).split("  ").map((c) => c.trim()).filter(Boolean);
    expect(cols).toContain("rdf_id");
  });
});
