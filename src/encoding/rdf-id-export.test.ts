import { describe, it, expect } from "vitest";
import fs from "node:fs";
import { parseEDeviceDefinitionFile, buildEFileExport, buildEDeviceRecords } from "../model-eexport";
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

/**
 * 工程样本一律在文件内构造，**不再读 data/**。
 *
 * 原先两条用例读 data/schemes/files/四川/成都/厂站/天府新区站.json 并整组
 * `describe.skipIf`：data/ 整目录被 .gitignore 忽略，干净检出上必然缺失，
 * 于是「rdf_id 能否落到导出列」这个契约在 CI 与贡献者机器上从不执行。
 *
 * 判据是**与模型规模无关**的 —— 只验「元件参数值直通模板同名列」，一个最小合成工程即可覆盖；
 * 真正依赖真实拓扑的回归（计算 id、容器绑母线）在 ems-rtdb-export-path.test.ts 等文件里，
 * 那些才需要样本，也才该保留样本守卫。
 *
 * 变异验证（注入生产代码后本文件转红，验完已还原）：
 * - 「rdf_id 值不进导出文件」→ 红（值那一半在咬）
 * - 「rdf_id 列被踢出列集」→ 两条都红（列存在那一半在咬）
 * - 「字段取值层给 rdf_id 兜底默认值」→ 两条都红（「未设置则为空」在咬）
 * - 「空值渲染由 0 改空串」→ **绿，且是等价变异**：只改未设值单元格的显示默认值，
 *   本文件已不依赖该渲染（值一律走记录取），故如实记为等价，别再当缺口查一遍。
 */

/** 交流端子。nodeNumber 必须给：拓扑节点表（配网 dms_def_node）就是按端子节点号归并出来的。 */
function acTerminal(id: string, nodeNumber: string) {
  return { id, label: "", type: "ac" as const, anchor: { x: 0.5, y: 0 }, nodeNumber };
}

function modelNode(id: string, kind: string, params: Record<string, string>, nodeNumbers: string[]) {
  return {
    id,
    kind,
    name: id,
    nodeNumber: "",
    acTopologyNode: 0,
    dcTopologyNode: 0,
    position: { x: 0, y: 0 },
    size: { width: 10, height: 10 },
    rotation: 0,
    scale: 1,
    terminals: nodeNumbers.map((nodeNumber, i) => acTerminal(`${id}-t${i}`, nodeNumber)),
    params
  };
}

function syntheticProject(nodes: ReturnType<typeof modelNode>[]): ProjectFile {
  return { version: 1, name: "rdf_id 探针工程", nodes, edges: [] } as unknown as ProjectFile;
}

/**
 * 取导出文本里某段的表头列名与数据行。
 *
 * **只有表头能按空白切**：导出时单元格按列宽左对齐填充（空单元格是一串空格），
 * 数据行里只要出现一个空单元格，`split(/\s+/).filter(Boolean)` 就会把它整格丢掉、
 * 令其后每一格左移一列 —— 读出来的值会串到隔壁列去（实测能把 dms_def_node 的 rdf_id
 * 读成 basevoltage 的 id）。故单元格**值**一律走 buildEDeviceRecords 取，不用位置解析。
 */
function sectionText(text: string, sectionName: string): { cols: string[]; rows: string[] } | null {
  const body = text.match(new RegExp(`<${sectionName}>([\\s\\S]*?)</${sectionName}>`))?.[1];
  if (body === undefined) return null;
  const header = body.split("\n").find((line) => line.trim().startsWith("@"));
  if (!header) return null;
  return {
    cols: header.slice(1).split(/\s+/).filter(Boolean),
    rows: body.split("\n").filter((line) => line.trim().startsWith("#"))
  };
}

describe("rdf_id 导出匹配", () => {
  it("主网模板：设备设置 rdf_id 后导出文件 rdf_id 列带该值；未设置则为空", () => {
    const options = loadOptions("ems_rtdb.e");
    // 两个电源节点：n1 显式设 rdf_id，n2 不设 —— 标题承诺的两半都要能验。
    const project = syntheticProject([
      modelNode("n1", "ac-source", { rdf_id: "RDF-AC-SOURCE-001" }, ["1"]),
      modelNode("n2", "ac-source", {}, ["2"])
    ]);
    const file = buildEFileExport(project, ["默认方案"], options);

    // ① 导出文件的 generatingunit 段带 rdf_id 列
    const section = sectionText(file.text, "generatingunit");
    expect(section, "generatingunit 段存在").toBeTruthy();
    expect(section!.cols).toContain("rdf_id");

    // ② 该值真的写进了数据行：用唯一 token 判定（不按列位置取，免受空单元格错位影响）
    expect(
      section!.rows.filter((row) => row.includes("RDF-AC-SOURCE-001")).length,
      "恰好一行带该值"
    ).toBe(1);

    // ③ 值与节点的对应关系（无歧义）：设了的带值，没设的为空
    const byNode = new Map(
      buildEDeviceRecords(project, options)
        .filter((record) => record.section === "ACGenerator")
        .map((record) => [record.id, record])
    );
    expect(byNode.get("n1")?.params.rdf_id).toBe("RDF-AC-SOURCE-001");
    expect(byNode.get("n2")?.params.rdf_id ?? "", "未设置 rdf_id 的节点").toBe("");
  });

  it("配网模板：节点表 dms_def_node 记录含 rdf_id 列（默认空）", () => {
    const options = loadOptions("dms_rtdb.e");
    // dms_def_node（类 ACNode）由带节点号的交流端子归并出拓扑节点，故端子必须带 nodeNumber。
    const project = syntheticProject([modelNode("b1", "ac-bus", {}, ["1", "2"])]);
    const file = buildEFileExport(project, ["默认方案"], options);

    const section = sectionText(file.text, "dms_def_node");
    expect(section, "dms_def_node 段存在").toBeTruthy();
    expect(section!.cols).toContain("rdf_id");
    // 只有表头没有数据行的空段会让上面那句恒绿，这里钉住「确实导出了记录」。
    expect(section!.rows.length, "dms_def_node 至少一行记录").toBeGreaterThan(0);

    // 记录确实落到这一段，且未设 rdf_id 时为空
    const nodeRecords = buildEDeviceRecords(project, options).filter((record) => record.section === "ACNode");
    expect(nodeRecords.length, "ACNode 至少一条记录").toBeGreaterThan(0);
    for (const record of nodeRecords) {
      expect(record.params.rdf_id ?? "", `${record.id} 未设置 rdf_id`).toBe("");
    }
  });
});