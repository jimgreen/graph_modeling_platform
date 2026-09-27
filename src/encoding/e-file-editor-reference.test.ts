import { describe, it, expect } from "vitest";
import fs from "node:fs";
import { parseEDeviceDefinitionFile, buildEDeviceRecords, buildEDeviceHeaderParameterRecords, orderEDeviceRecordsForExport, applyEReferenceIdValues, finalizeEDevicePreviewRecords, buildEFileExport, keyToLong, E_REFERENCE_FIELD_TABLE_IDS } from "../model-eexport";
import { buildEFileExportOptionsFromLibrary, applyEDeviceDefinitionSectionsToLibraryState } from "../appExtracted/appDeviceDefinitionFactories";
import { DEVICE_LIBRARY, type ProjectFile } from "../model";

function loadOptions(templateFile: string) {
  const template = fs.readFileSync(`public/e-templates/${templateFile}`, "utf-8");
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

/** 模拟 appView 中 E 文件编辑器 records 生成（含跨表引用定稿 + 引用 id 应用），步骤与 appView 逐行同序 */
function buildEditorRecords(templateFile: string) {
  const options = loadOptions(templateFile);
  const project = JSON.parse(fs.readFileSync("data/schemes/files/四川/成都/厂站/天府新区站.json", "utf-8")) as ProjectFile;
  const records = buildEDeviceRecords(project, options);
  // 与 appView 预览接线同源：合并段 idx 重排 + 引用列定稿（bound_device_idx / container_id / container_idx）——
  // 漏此步则本「复制品」与真实预览分叉（预览 device_id 整列 0 类缺陷无法被本文件证伪）
  finalizeEDevicePreviewRecords(project, options, records);
  const headerRecords = buildEDeviceHeaderParameterRecords(project, records, options, ["默认方案"]);
  const orderedRecords = [...headerRecords, ...orderEDeviceRecordsForExport(records)];
  applyEReferenceIdValues(project, orderedRecords, options);
  return orderedRecords;
}

function findRecord(records: ReturnType<typeof buildEditorRecords>, section: string, nameContains = "") {
  return records.find((r) => r.section === section && (!nameContains || r.params.name?.includes(nameContains)));
}

// 样本依赖：data/ 整目录被 .gitignore 忽略（见 CLAUDE.md），干净检出上必然缺失。
// 按仓库既有约定（见 ems-rtdb-export-path.test.ts）用 skipIf 而非 existsSync 提前 return ——
// 后者在缺样本时会"静默通过"，等于没测。
const TITAN_PROJECT_SAMPLE = "data/schemes/files/四川/成都/厂站/天府新区站.json";
const STANDARD_PROJECT_SAMPLE = "data/schemes/files/标准案例/子方案/交流设备.json";
const HAS_PROJECT_SAMPLES =
  fs.existsSync(TITAN_PROJECT_SAMPLE) && fs.existsSync(STANDARD_PROJECT_SAMPLE);

describe.skipIf(!HAS_PROJECT_SAMPLES)("E 文件编辑器引用字段跳转（实时库模板）", () => {
  it("主网模板：generatingunit/breaker 的 st_id/bv_id 为计算 id（非空），EFileEditor 跳转按钮可显示", () => {
    const records = buildEditorRecords("ems_rtdb.e");
    const unit = findRecord(records, "ACGenerator");
    expect(unit).toBeTruthy();
    expect(unit!.params.st_id).toBe(keyToLong("00405", 0, 1)); // substation 第 1 行
    expect(unit!.params.bv_id).toBeTruthy();
    // EFileEditor 的 REFERENCE_FIELD_MAP 覆盖 st_id/bv_id（通过 E_REFERENCE_FIELD_TABLE_IDS 断言映射存在）
    expect(E_REFERENCE_FIELD_TABLE_IDS["st_id"]).toBe("00405");
    expect(E_REFERENCE_FIELD_TABLE_IDS["bv_id"]).toBe("00401");
    const breaker = findRecord(records, "ACBreak");
    expect(breaker!.params.st_id).toBe(keyToLong("00405", 0, 1));
  });

  it("主网模板：transformerwinding 的 tr_id/itrfm 为变压器计算 id", () => {
    const records = buildEditorRecords("ems_rtdb.e");
    const winding = findRecord(records, "ACTransWinding");
    expect(winding).toBeTruthy();
    expect(winding!.params.itrfm || winding!.params.tr_id).toBeTruthy();
    const trfm = findRecord(records, "ACTransformer");
    expect(trfm).toBeTruthy();
    // itrfm 值 = 变压器行 id（还原行号 1 → 变压器第 1 行）
    const trfmId = winding!.params.itrfm ?? winding!.params.tr_id!;
    const rowNo = Number(BigInt(trfmId) - (BigInt(E_REFERENCE_FIELD_TABLE_IDS["itrfm"]) << 48n));
    const sorted = records.filter((r) => r.section === "ACTransformer").sort((a, b) => Number(a.params.idx ?? 0) - Number(b.params.idx ?? 0));
    expect(sorted[rowNo - 1]?.params.id).toBeTruthy();
  });

  it("编辑器 records 与导出文件逐值同源（容器模型）：漏调 finalizeEDevicePreviewRecords 即红", () => {
    // 用户真实容器模型（3 成员）：成员关系表的 device_id / container_idx 只在定稿阶段产出 ——
    // 预览漏定稿时 device_id 停在构建期空占位（编辑器整列 0），本断言即失败
    const project = JSON.parse(fs.readFileSync("data/schemes/files/标准案例/子方案/交流设备.json", "utf-8")) as ProjectFile;
    const records = buildEDeviceRecords(project);
    finalizeEDevicePreviewRecords(project, {}, records);
    const editorRows = records
      .filter((r) => r.section === "ACContainerDev")
      .map((r) => [String(r.params.device_id ?? ""), String(r.params.container_idx ?? "")]);
    const text = buildEFileExport(project).text;
    const block = text.slice(text.indexOf("<ACContainerDev>"), text.indexOf("</ACContainerDev>"));
    const fileRows = block.split("\n").filter((line) => line.startsWith("#"))
      .map((line) => line.trim().slice(1).trim().split(/\s+/).slice(0, 2));
    expect(editorRows.length).toBeGreaterThan(0);
    expect(editorRows).toEqual(fileRows);
  });

  it("配网模板：bulk/feeder/source 的引用字段为计算 id（非空）", () => {
    const records = buildEditorRecords("dms_rtdb.e");
    const bulk = findRecord(records, "dms_def_bulk");
    expect(bulk).toBeTruthy();
    expect(bulk!.params.st_id).toBe(keyToLong("00405", 0, 1));
    const feeder = findRecord(records, "dms_def_feeder");
    expect(feeder).toBeTruthy();
    expect(feeder!.params.source_id).toBe(keyToLong("12004", 0, 1));
    expect(feeder!.params.bulk_id).toBe(keyToLong("12001", 0, 1));
    const source = findRecord(records, "dms_def_source");
    expect(source).toBeTruthy();
    expect(E_REFERENCE_FIELD_TABLE_IDS["source_id"]).toBe("12004");
    expect(E_REFERENCE_FIELD_TABLE_IDS["bulk_id"]).toBe("12001");
    expect(E_REFERENCE_FIELD_TABLE_IDS["trfm_id"]).toBe("12012");
  });

  it("配网模板：trwd 的 trfm_id 还原行号可匹配到 trfm 行", () => {
    const records = buildEditorRecords("dms_rtdb.e");
    const trwd = findRecord(records, "ACTransWinding");
    expect(trwd).toBeTruthy();
    const trfmId = trwd!.params.trfm_id;
    expect(trfmId).toBeTruthy();
    const rowNo = Number(BigInt(trfmId) - (BigInt(E_REFERENCE_FIELD_TABLE_IDS["trfm_id"]) << 48n));
    const sorted = records.filter((r) => r.section === "ACTransformer").sort((a, b) => Number(a.params.idx ?? 0) - Number(b.params.idx ?? 0));
    expect(sorted[rowNo - 1]).toBeTruthy();
  });

  it("配网模板：feeder_id → dms_def_feeder、node_id/inode_id/znode_id → dms_def_node 映射已配置", () => {
    expect(E_REFERENCE_FIELD_TABLE_IDS["feeder_id"]).toBe("12002");
    expect(E_REFERENCE_FIELD_TABLE_IDS["node_id"]).toBe("12006");
    expect(E_REFERENCE_FIELD_TABLE_IDS["inode_id"]).toBe("12006");
    expect(E_REFERENCE_FIELD_TABLE_IDS["znode_id"]).toBe("12006");
    const records = buildEditorRecords("dms_rtdb.e");
    // 配网设备引用字段均为计算 id（大数），非空
    const unit = findRecord(records, "ACGenerator");
    expect(unit).toBeTruthy();
    expect(unit!.params.feeder_id).toBe(keyToLong("12002", 0, 1));
    expect(unit!.params.node_id).toBeTruthy();
    // 线段 inode_id/znode_id 为 dms_def_node 计算 id，还原行号有效
    const lnseg = findRecord(records, "ACBranch");
    expect(lnseg).toBeTruthy();
    for (const field of ["inode_id", "znode_id"] as const) {
      const value = lnseg!.params[field];
      expect(value, field).toBeTruthy();
      const rowNo = Number(BigInt(value) - (BigInt("12006") << 48n));
      expect(rowNo, field).toBeGreaterThanOrEqual(1);
    }
    // 端点表 node_id 还原行号可匹配到 dms_def_node 行（内部 section ACNode）
    const dot = records.find((r) => r.section === "dms_def_lnseg_dot");
    expect(dot).toBeTruthy();
    const dotNodeId = dot!.params.node_id;
    expect(dotNodeId).toBeTruthy();
    const dotRowNo = Number(BigInt(dotNodeId) - (BigInt("12006") << 48n));
    const nodeRecords = records.filter((r) => r.section === "ACNode").sort((a, b) => Number(a.params.idx ?? 0) - Number(b.params.idx ?? 0));
    expect(nodeRecords[dotRowNo - 1]).toBeTruthy();
  });
});
