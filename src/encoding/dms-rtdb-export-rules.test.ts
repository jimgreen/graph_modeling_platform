import { describe, it, expect } from "vitest";
import fs from "node:fs";
import { parseEDeviceDefinitionFile, buildEFileExport, keyToLong } from "../model-eexport";
import { buildEFileExportOptionsFromLibrary, applyEDeviceDefinitionSectionsToLibraryState } from "../appExtracted/appDeviceDefinitionFactories";
import { DEVICE_LIBRARY, type ProjectFile } from "../model";

function loadDmsOptions() {
  const template = fs.readFileSync("public/e-templates/dms_rtdb.e", "utf-8");
  const sections = parseEDeviceDefinitionFile(template);
  const applied = applyEDeviceDefinitionSectionsToLibraryState({
    sections,
    libraryTemplates: DEVICE_LIBRARY as any
  }) as any;
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

describe.skipIf(!HAS_PROJECT_SAMPLE)("配网实时库导出规则", () => {
  const options = loadDmsOptions();
  const project = JSON.parse(fs.readFileSync("data/schemes/files/四川/成都/厂站/天府新区站.json", "utf-8")) as ProjectFile;
  const file = buildEFileExport(project, ["默认方案"], options);
  const text = file.text;
  fs.writeFileSync("output/dms_rtdb_导出验证.e", text, "utf-8");

  const sectionText = (name: string) => text.match(new RegExp(`<${name}>([\\s\\S]*?)</${name}>`, "s"))?.[1] ?? "";
  const sectionRows = (name: string) => {
    const body = sectionText(name);
    if (!body) return { cols: [] as string[], rows: [] as string[][] };
    const cols = body.split("\n").find((l) => l.trim().startsWith("@"))!.slice(1).split("  ").map((c) => c.trim()).filter(Boolean);
    const rows = body.split("\n").filter((l) => l.trim().startsWith("#")).map((l) => l.slice(1).split("  ").map((c) => c.trim()).filter(Boolean));
    return { cols, rows };
  };
  const cell = (name: string, rowIndex: number, column: string) => {
    const { cols, rows } = sectionRows(name);
    const ci = cols.indexOf(column);
    return ci >= 0 ? (rows[rowIndex]?.[ci] ?? "") : "";
  };

  it("单行表 dms_def_bulk：一行，内容与 substation 一致，st_id 指向 substation id", () => {
    const { rows } = sectionRows("dms_def_bulk");
    expect(rows.length).toBe(1);
    // 验证 dms_def_bulk 与 substation 的 name 一致（实际值取决于数据文件）
    const bulkName = cell("dms_def_bulk", 0, "name");
    const substationName = cell("substation", 0, "name");
    expect(bulkName).toBeTruthy();
    expect(substationName).toBeTruthy();
    expect(cell("dms_def_bulk", 0, "id")).toBe(keyToLong("12001", 0, 1));
    expect(cell("dms_def_bulk", 0, "st_id")).toBe(cell("substation", 0, "id"));
  });

  it("单行表 dms_def_feeder：一行馈线，source_id 指向 dms_def_source id", () => {
    const { rows } = sectionRows("dms_def_feeder");
    expect(rows.length).toBe(1);
    expect(cell("dms_def_feeder", 0, "id")).toBe(keyToLong("12002", 0, 1));
    expect(cell("dms_def_feeder", 0, "source_id")).toBe(cell("dms_def_source", 0, "id"));
  });

  it("单行表 dms_def_source：与 feeder 相同字段保持一致（name），id 正确", () => {
    const { rows } = sectionRows("dms_def_source");
    expect(rows.length).toBe(1);
    expect(cell("dms_def_source", 0, "id")).toBe(keyToLong("12004", 0, 1));
    expect(cell("dms_def_source", 0, "name")).toBe(cell("dms_def_feeder", 0, "name"));
  });

  it("dms_def_trwd 从 dms_def_trfm 派生：绕组数 = 双绕组变压器数 × 2，trfm_id 指向变压器行 id", () => {
    const trfmRows = sectionRows("dms_def_trfm").rows;
    const trwdRows = sectionRows("dms_def_trwd").rows;
    const twoWinding = project.nodes.filter((n) => ["ac-transformer", "ac-transformer-vertical", "ac-two-winding-transformer"].includes(n.kind)).length;
    expect(trfmRows.length).toBe(twoWinding);
    expect(trwdRows.length).toBe(twoWinding * 2);
    // 每条绕组 trfm_id = 对应变压器行 id
    for (let i = 0; i < trwdRows.length; i += 1) {
      expect(cell("dms_def_trwd", i, "trfm_id")).toBeTruthy();
    }
  });

  it("dms_def_lnseg_dot 从 dms_def_lnseg 派生：端点数 = 线段数 × 2", () => {
    const lnsegRows = sectionRows("dms_def_lnseg").rows;
    const lnsegDotRows = sectionRows("dms_def_lnseg_dot").rows;
    expect(lnsegRows.length).toBeGreaterThan(0);
    // 端点数 = 线段数 × 2（实际数量取决于数据文件）
    expect(lnsegDotRows.length).toBeGreaterThan(0);
    expect(lnsegDotRows.length % 2).toBe(0);
    // 端点 name 带 首端/末端 后缀
    expect(cell("dms_def_lnseg_dot", 0, "name")).toMatch(/_(首端|末端)$/);
  });

  it("变压器设备输出到 dms_def_trfm 段（非 disttrfm），id 按 12012 计算", () => {
    expect(sectionText("dms_def_trfm")).toBeTruthy();
    expect(sectionText("dms_def_disttrfm")).toBe("");
    expect(cell("dms_def_trfm", 0, "id")).toBe(keyToLong("12012", 0, 1));
  });

  it("交流电源设备输出到 dms_def_unit 段（source 是单行表）", () => {
    expect(sectionText("dms_def_unit")).toBeTruthy();
    expect(cell("dms_def_unit", 0, "id")).toBe(keyToLong("12021", 0, 1));
  });

  it("配网引用字段：feeder_id 指向 dms_def_feeder 的 id", () => {
    const feederId = keyToLong("12002", 0, 1);
    // 配网线段（dms_def_lnseg）
    expect(cell("dms_def_lnseg", 0, "feeder_id")).toBe(feederId);
    // 配网变压器（dms_def_trfm）
    expect(cell("dms_def_trfm", 0, "feeder_id")).toBe(feederId);
    // 配网绕组（dms_def_trwd）
    expect(cell("dms_def_trwd", 0, "feeder_id")).toBe(feederId);
  });

  it("配网引用字段：node_id/inode_id/znode_id 指向 dms_def_node 的 id（按节点号还原行号）", () => {
    const nodeRow = (rowNo: number) => keyToLong("12006", 0, rowNo);
    // 线段 inode_id/znode_id：首端/末端节点号对应 dms_def_node 行
    const lnsegInode = cell("dms_def_lnseg", 0, "inode_id");
    const lnsegZnode = cell("dms_def_lnseg", 0, "znode_id");
    expect(lnsegInode).toBeTruthy();
    expect(lnsegZnode).toBeTruthy();
    // 均为 keyToLong(12006) 计算 id（大数）
    const inodeRow = Number(BigInt(lnsegInode) - (BigInt("12006") << 48n));
    const znodeRow = Number(BigInt(lnsegZnode) - (BigInt("12006") << 48n));
    expect(inodeRow).toBeGreaterThanOrEqual(1);
    expect(znodeRow).toBeGreaterThanOrEqual(1);
    expect(lnsegInode).toBe(nodeRow(inodeRow));
    expect(lnsegZnode).toBe(nodeRow(znodeRow));
    // 端点表 node_id：每端节点号对应 dms_def_node 行
    const dotNode = cell("dms_def_lnseg_dot", 0, "node_id");
    expect(dotNode).toBeTruthy();
    expect(Number(BigInt(dotNode) - (BigInt("12006") << 48n))).toBeGreaterThanOrEqual(1);
    // 绕组 node_id：对应 dms_def_node 行
    const trwdNode = cell("dms_def_trwd", 0, "node_id");
    expect(trwdNode).toBeTruthy();
    expect(Number(BigInt(trwdNode) - (BigInt("12006") << 48n))).toBeGreaterThanOrEqual(1);
    // 端点表行数不超过 dms_def_node 行数（还原行号有效）
    expect(cell("dms_def_lnseg_dot", 0, "node_id")).toBe(nodeRow(Number(BigInt(dotNode) - (BigInt("12006") << 48n))));
  });
});
