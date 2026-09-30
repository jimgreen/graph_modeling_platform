// E 文件导出：接口定义装配（buildEFileExportOptionsFromLibrary）。
//
// 这个函数是 E 文件导出的最后一跳，把「库里的自定义 + 模板 sections」压成一组
// interfaceDefinitions。里面有一段容易漏的补偿：aclineend / dclineend /
// dms_def_lnseg_dot 这三张表**没有对应的设备模板**，buildEDeviceInterfaceDefinitionRows
// 只遍历 libraryTemplates，永远产不出它们，必须按 sectionKind 单独注入 ——
// 漏了就表现为「线段端点表整段不导出」或「表号丢失」。
import { describe, expect, test } from "vitest";
import { DEVICE_LIBRARY } from "../model";
import { buildEFileExportOptionsFromLibrary } from "./e-file";

const templateField = (exportName: string, sourceName?: string, cnName?: string) => ({
  sourceName,
  exportName,
  cnName: cnName ?? ""
});

const build = (options: Parameters<typeof buildEFileExportOptionsFromLibrary>[0]) =>
  buildEFileExportOptionsFromLibrary(options);

describe("buildEFileExportOptionsFromLibrary：基础形态", () => {
  test("无模板无字段 → 空定义列表，四张表补空对象", () => {
    expect(build({})).toEqual({
      interfaceDefinitions: [],
      eDeviceDefinitionLabels: {},
      eDeviceDefinitionTemplateFields: {},
      eDeviceDefinitionTableIds: {}
    });
  });

  test("带库模板时按设备模板出定义", () => {
    const result = build({ libraryTemplates: DEVICE_LIBRARY.filter((t) => t.kind === "ac-load") });
    expect(result.interfaceDefinitions.map((d) => d.componentLibrary)).toContain("ACLoad");
  });

  test("四张表原样透传（不加工）", () => {
    const labels = { ACLoad: "负荷类" };
    const templateFields = { ACLoad: [templateField("p", "p", "有功")] };
    const tableIds = { ACLoad: "T3" };
    const result = build({ eDeviceDefinitionLabels: labels, eDeviceDefinitionTemplateFields: templateFields, eDeviceDefinitionTableIds: tableIds });
    expect(result.eDeviceDefinitionLabels).toBe(labels);
    expect(result.eDeviceDefinitionTemplateFields).toBe(templateFields);
    expect(result.eDeviceDefinitionTableIds).toBe(tableIds);
  });
});

describe("buildEFileExportOptionsFromLibrary：独立运行时表的注入", () => {
  test("★ aclineend 无对应设备模板，按 sectionKind 注入并带上表号", () => {
    const result = build({
      eDeviceDefinitionTemplateFields: { aclineend: [templateField("ln_id", "ln_id", "线段端点ID")] },
      eDeviceDefinitionTableIds: { aclineend: "T9" }
    });
    const injected = result.interfaceDefinitions.find((d) => d.componentLibrary === "aclineend")!;
    expect(injected).toMatchObject({ label: "aclineend", exportEnabled: true, tableId: "T9" });
    expect(injected.fields).toEqual([{ sourceName: "ln_id", exportName: "ln_id", cnName: "线段端点ID" }]);
  });

  test("★ 三张独立运行时表都会注入：aclineend / dclineend / dms_def_lnseg_dot", () => {
    const standalone = ["aclineend", "dclineend", "dms_def_lnseg_dot"];
    const result = build({
      eDeviceDefinitionTemplateFields: Object.fromEntries(standalone.map((kind) => [kind, [templateField("id")]]))
    });
    expect(result.interfaceDefinitions.map((d) => d.componentLibrary)).toEqual(standalone);
  });

  test("★ 非 standalone 的运行时表不注入（trans / transformerwinding 是类的导出别名，走 ACTransformer 分组）", () => {
    const result = build({
      eDeviceDefinitionTemplateFields: {
        trans: [templateField("tap")],
        transformerwinding: [templateField("tap")],
        substation: [templateField("id")]
      }
    });
    expect(result.interfaceDefinitions).toEqual([]);
  });

  test("★ 缺模板字段的 section 不注入（没有列可写就不占位）", () => {
    expect(build({ eDeviceDefinitionTemplateFields: { aclineend: [] } }).interfaceDefinitions).toEqual([]);
    expect(build({ eDeviceDefinitionTableIds: { aclineend: "T9" } }).interfaceDefinitions).toEqual([]);
  });

  // 「已有同 componentLibrary 则跳过」这条守卫在当前数据下不可达：standalone 的
  // sectionKind 是全小写段名（aclineend），没有任何设备模板会产出同名的
  // componentLibrary。ACTransWinding 虽同名相近，却由基类镜像生成（大写），
  // 与注入不同名。这里锁住「两者确实并存且不互相顶掉」这一实际结果。
  test("镜像生成的 ACTransWinding 与注入的 section 各存一份", () => {
    const result = build({
      libraryTemplates: DEVICE_LIBRARY.filter((t) => t.kind === "ac-transformer"),
      eDeviceDefinitionTemplateFields: {
        aclineend: [templateField("ln_id")],
        ACTransWinding: [templateField("tap")]
      }
    });
    expect(result.interfaceDefinitions.map((d) => d.componentLibrary)).toEqual(
      expect.arrayContaining(["ACTransformer", "ACTransWinding", "aclineend"])
    );
    // ACTransWinding 来自镜像（标签「变压器绕组」），不是注入出来的小写段名
    expect(result.interfaceDefinitions.find((d) => d.componentLibrary === "ACTransWinding")!.label).toBe("变压器绕组");
  });

  test("注入字段的 sourceName / cnName 缺省时回落 exportName", () => {
    const injected = build({
      eDeviceDefinitionTemplateFields: { aclineend: [templateField("ln_id")] }
    }).interfaceDefinitions.find((d) => d.componentLibrary === "aclineend")!;
    expect(injected.fields[0]).toEqual({ sourceName: "ln_id", exportName: "ln_id", cnName: "ln_id" });
  });
});

describe("buildEFileExportOptionsFromLibrary：字段顺序", () => {
  test("注入的独立表同样吃字段顺序配置", () => {
    const injected = build({
      eDeviceDefinitionTemplateFields: { aclineend: [templateField("a"), templateField("b")] },
      eDeviceDefinitionFieldOrder: { aclineend: ["b", "a"] }
    }).interfaceDefinitions.find((d) => d.componentLibrary === "aclineend")!;
    expect(injected.fields.map((field: { sourceName: string }) => field.sourceName)).toEqual(["b", "a"]);
  });
});