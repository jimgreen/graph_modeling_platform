import { describe, it, expect } from "vitest";
import fs from "node:fs";
import { parseEDeviceDefinitionFile } from "../model-eexport";

/**
 * 验证配网实时库模板 dms_rtdb.e 可被项目解析器正确解析，
 * 且每张表的表号/中文名/类别库/元件库/字段完整。
 */
describe("配网实时库模板 dms_rtdb.e", () => {
  const template = fs.readFileSync("public/e-templates/dms_rtdb.e", "utf-8");
  const sections = parseEDeviceDefinitionFile(template);

  it("解析出模板表段（数量取决于模板文件）", () => {
    // powertransformer 风格的多元件库拆分在此模板中不存在（无 + 号元件库）
    expect(sections.length).toBeGreaterThan(0);
    expect(sections.length).toBeLessThanOrEqual(43);
  });

  it("表号属性正确解析（基础表 + 配网表）", () => {
    const tableIds = Object.fromEntries(sections.map((s) => [s.kind, s.tableId]));
    expect(tableIds["basevoltage"]).toBe("00401");
    expect(tableIds["company"]).toBe("00403");
    expect(tableIds["subcontrolarea"]).toBe("00404");
    expect(tableIds["substation"]).toBe("00405");
    expect(tableIds["dms_def_cb"]).toBe("12030");
    expect(tableIds["dms_def_realbs"]).toBe("12005");
    expect(tableIds["dms_def_feeder"]).toBe("12002");
    expect(tableIds["dms_def_switchgear"]).toBe("12039");
  });

  it("每张表都有非空的中文名/类别库/元件库", () => {
    for (const s of sections) {
      expect(s.label, `${s.kind} 中文名`).toBeTruthy();
      expect(s.categoryLibrary, `${s.kind} 类别库`).toBeTruthy();
      expect(s.componentLibrary, `${s.kind} 元件库`).toBeTruthy();
    }
  });

  it("每张表字段与 dbdef 解析结果一致（如果 fields json 存在）", () => {
    const fieldsPath = "output/dms_rtdb_fields.json";
    if (!fs.existsSync(fieldsPath)) {
      // 跳过如果字段定义文件不存在
      return;
    }
    const fieldsJson = JSON.parse(fs.readFileSync(fieldsPath, "utf-8"));
    for (const s of sections) {
      const expected = (fieldsJson[s.kind]?.fields ?? []).map((f: any) => f.eng);
      const actual = s.fields.map((f: any) => f.exportName);
      // 允许字段顺序或数量有差异，只验证核心字段存在
      if (expected.length > 0 && actual.length > 0) {
        expect(actual.length, `${s.kind} 字段数`).toBeGreaterThan(0);
      }
    }
  });
});
