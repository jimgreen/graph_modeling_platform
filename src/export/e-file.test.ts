import { describe, expect, test } from "vitest";
import {
  applyEDeviceDefinitionSectionsToLibraryState,
  applyEDeviceInterfaceFieldOrder,
  applyPredefinedEDeviceTemplateToLibraryState,
  buildEDeviceInterfaceDefinitionRows,
  buildEFileExportOptionsFromLibrary,
  orderEDeviceInterfaceFields
} from "./e-file";
import * as legacy from "../appExtracted/appDeviceDefinitionEInterface";

describe("src/export/e-file", () => {
  test("旧路径 re-export 保持同一引用", () => {
    expect(legacy.buildEFileExportOptionsFromLibrary).toBe(buildEFileExportOptionsFromLibrary);
    expect(legacy.applyEDeviceDefinitionSectionsToLibraryState).toBe(applyEDeviceDefinitionSectionsToLibraryState);
  });

  test("空输入返回空 override 映射", () => {
    const options = buildEFileExportOptionsFromLibrary({ libraryTemplates: [], labels: {} });
    expect(options.eDeviceDefinitionLabels).toEqual({});
    expect(options.eDeviceDefinitionTemplateFields).toEqual({});
    expect(options.eDeviceDefinitionTableIds).toEqual({});
    expect(options.interfaceDefinitions).toEqual([]);
  });

  test("独立运行时段（aclineend）按 sectionKind 注入表号与字段", () => {
    const options = buildEFileExportOptionsFromLibrary({
      libraryTemplates: [],
      labels: {},
      eDeviceDefinitionTemplateFields: { aclineend: [{ exportName: "idx", cnName: "序号" }] },
      eDeviceDefinitionTableIds: { aclineend: "aclineend_table" }
    });
    const section = options.interfaceDefinitions.find((row: any) => row.componentLibrary === "aclineend");
    expect(section).toBeTruthy();
    expect(section.tableId).toBe("aclineend_table");
    expect(section.fields.map((field: any) => field.exportName)).toEqual(["idx"]);
  });

  test("空模板 sections 时套用不产生 override", () => {
    const result = applyEDeviceDefinitionSectionsToLibraryState({
      sections: [],
      customDeviceTemplates: [],
      libraryTemplates: [],
      deviceDefinitionOverrides: {},
      eDeviceDefinitionLabels: {},
      eDeviceDefinitionClassExportEnabled: {},
      eDeviceDefinitionFieldOrder: {},
      eDeviceDefinitionTemplateFields: {},
      labels: {}
    });
    expect(result.eDeviceDefinitionLabels).toEqual({});
    expect(result.eDeviceDefinitionFieldOrder).toEqual({});
  });

  // 回归：设备行里被写回的 exportName（如 rdf_id.exportName="runstat"）不得劫持模板同名键，
  // 否则模板列 runstat 会挂到 rdf_id 上，真正的 run_stat 反而匹配不上（表头对、取值错）。
  test("模板列按 sourceName 优先匹配，污染的 exportName 不劫持同名键", () => {
    const pollutedTemplate = {
      kind: "ACLoad",
      label: "负荷",
      params: { component_type: "ACLoad" },
      parameterDefinitions: [
        { enName: "rdf_id", cnName: "RDF ID", exportName: "runstat", exportEnabled: true },
        { enName: "run_stat", cnName: "运行状态", exportName: "run_stat", exportEnabled: true }
      ]
    };
    const section = {
      kind: "load",
      componentLibrary: "ACLoad",
      exportEnabled: true,
      fields: [
        { exportName: "rdfid", cnName: "RDF ID" },
        { exportName: "runstat", cnName: "运行状态" }
      ]
    };
    const result = applyPredefinedEDeviceTemplateToLibraryState({
      sections: [section],
      libraryTemplates: [pollutedTemplate]
    });
    const fields = result.eDeviceDefinitionTemplateFields.ACLoad ?? [];
    expect(fields.find((f: any) => f.exportName === "rdfid")?.sourceName).toBe("rdf_id");
    expect(fields.find((f: any) => f.exportName === "runstat")?.sourceName).toBe("run_stat");
  });

  // 共享入口语义 = 空基线重建：模板没声明的类不残留导出标签/字段顺序
  test("applyPredefinedEDeviceTemplateToLibraryState 一律从空基线重建", () => {
    const result = applyPredefinedEDeviceTemplateToLibraryState({ sections: [] });
    expect(result.eDeviceDefinitionLabels).toEqual({});
    expect(result.eDeviceDefinitionClassExportEnabled).toEqual({});
    expect(result.eDeviceDefinitionFieldOrder).toEqual({});
    expect(result.eDeviceDefinitionTemplateFields).toEqual({});
  });

  test("字段辅助函数覆盖空值、别名与未知库分支", () => {
    const fields = [
      { sourceName: "i_max" },
      { sourceName: "parent" },
      { sourceName: "dev_type" },
      { sourceName: "custom", exportName: "" }
    ];
    expect(applyEDeviceInterfaceFieldOrder(fields, ["max_current", "parent", "dev_type", "max_current"])).toEqual([
      fields[0],
      fields[1],
      fields[2]
    ]);
    expect(orderEDeviceInterfaceFields("UnknownLibrary", fields, [])).toEqual([
      fields[1],
      fields[2],
      fields[0],
      fields[3]
    ]);
    expect(orderEDeviceInterfaceFields("UnknownLibrary", fields, ["dev_type"]).map((field: any) => field.sourceName)).toEqual([
      "parent",
      "dev_type"
    ]);
  });

  // 回归：ACTransWinding（绕组表）镜像 ACTransformer 字段时，列开关必须以 <trans> 段声明为准。
  // 基类 <trfm> 段没有 tap 这类绕组专属列，兜底补丁会把它标成不导出；镜像若原样继承，
  // <trans> 段明确声明的 tap 会连带消失（列名对、整列丢失）。
  test("绕组表镜像基类字段时按 trans 段声明重算导出开关", () => {
    const transformerTemplate = {
      kind: "ac-transformer",
      label: "变压器",
      params: { component_type: "ACTransformer" },
      parameterDefinitions: [
        { enName: "idx", cnName: "序号", exportEnabled: true },
        { enName: "name", cnName: "名称", exportEnabled: true },
        { enName: "tap", cnName: "分接头", exportEnabled: true }
      ]
    };
    const sections = [
      {
        kind: "trfm",
        componentLibrary: "ACTransformer",
        exportEnabled: true,
        fields: [{ exportName: "idx" }, { exportName: "name" }]
      },
      {
        kind: "trans",
        componentLibrary: "ACTransWinding",
        exportEnabled: true,
        fields: [{ exportName: "idx" }, { exportName: "name" }, { exportName: "tap" }]
      }
    ];
    const applied = applyPredefinedEDeviceTemplateToLibraryState({ sections, libraryTemplates: [transformerTemplate] });
    const options = buildEFileExportOptionsFromLibrary({
      libraryTemplates: [transformerTemplate],
      labels: undefined,
      eDeviceDefinitionLabels: applied.eDeviceDefinitionLabels,
      eDeviceDefinitionClassExportEnabled: applied.eDeviceDefinitionClassExportEnabled,
      eDeviceDefinitionFieldOrder: applied.eDeviceDefinitionFieldOrder,
      eDeviceDefinitionTemplateFields: applied.eDeviceDefinitionTemplateFields,
      eDeviceDefinitionTableIds: applied.eDeviceDefinitionTableIds
    });
    const winding = options.interfaceDefinitions.find((row: any) => row.componentLibrary === "ACTransWinding");
    expect(winding).toBeTruthy();
    const tap = winding.fields.find((field: any) => field.exportName === "tap");
    expect(tap).toBeTruthy();
    expect(tap.exportEnabled).not.toBe(false);
  });

  test("build 行时按回调、标签和派生分支归一字段", () => {
    const base = { kind: "custom-base", label: "", categoryLibrary: "", params: { component_type: "Base" }, parameterDefinitionsComplete: true, parameterDefinitions: [{ enName: "foo", cnName: "foo", exportEnabled: true }] };
    const derived = {
      kind: "custom-derived", label: "", params: {
        component_type: "Derived", derived_from_component_type: "Base", derived_component_type: "Derived", is_derived_component_library: "1"
      }, isDerivedComponentLibrary: true, derivedFromComponentLibrary: "Base", derivedComponentLibrary: "Derived",
      parameterDefinitionsComplete: true, parameterDefinitions: [{ enName: "foo", cnName: "foo", exportEnabled: true }, { enName: "bar", cnName: "bar", exportEnabled: true }]
    };
    const rows = buildEDeviceInterfaceDefinitionRows({
      libraryTemplates: [base, derived],
      labels: { foo: "标签" },
      resolveDefinitionComponentLibrary: (template: any) => template.kind === "custom-base" ? "ResolvedBase" : ""
    });
    expect(rows.map((row) => row.componentLibrary)).toEqual(["ResolvedBase", "Base", "Derived"]);
    expect(rows.find((row) => row.componentLibrary === "Derived")?.fields.map((field: any) => field.sourceName)).toContain("bar");
  });

  // resolveComponentLibrary 的 kind 兜底：section 只声明 kind（不写 componentLibrary）时，
  // 必须落到同名类行上；若这层兜底被删，section.componentLibrary 为 undefined 会被 String() 成
  // 「undefined」，整段进 skipped 且模板字段丢失（sectionFieldsByComponentLibrary 建在解析结果上）。
  test("section 缺 componentLibrary 时按 kind 兜底到同名类行", () => {
    const template = {
      kind: "ACLoad",
      params: { component_type: "ACLoad" },
      parameterDefinitions: [{ enName: "p", exportEnabled: true }]
    };
    const result = applyEDeviceDefinitionSectionsToLibraryState({
      sections: [{ kind: "ACLoad", exportEnabled: true, fields: [{ exportName: "p", cnName: "有功" }] }],
      libraryTemplates: [template]
    });
    expect(result.eDeviceDefinitionClassExportEnabled.ACLoad).toBe(true);
    expect(result.eDeviceDefinitionTemplateFields.ACLoad?.map((field: any) => field.exportName)).toEqual(["p"]);
    expect(result.skipped).toEqual([]);
    expect(result.matched.map((entry) => entry.device)).toEqual(["ACLoad"]);
  });

  // resolveComponentLibrary 的两条 ?? 兜底（componentLibrary / kind 同时缺失）：
  // 解析结果必须是空串而不是字符串 undefined —— skipped 的 reason 里能直接看到解析值。
  test("section 既无 componentLibrary 也无 kind 时按空串查类并报未匹配", () => {
    const result = applyEDeviceDefinitionSectionsToLibraryState({
      sections: [{ fields: [{ exportName: "p" }] }],
      libraryTemplates: []
    });
    expect(result.matched).toEqual([]);
    expect(result.skipped.map((entry) => entry.reason)).toEqual(["未找到对应的类设备："]);
  });

  // 反向映射分支：section.componentLibrary 写的是导出标签（eload）而非类名，
  // reverseLabelToComponentLibrary 由 eDeviceDefinitionLabels 反建，必须还原到 ACLoad 行。
  test("section 的 componentLibrary 是导出标签时按反向映射回到类名", () => {
    const template = {
      kind: "ACLoad",
      params: { component_type: "ACLoad" },
      parameterDefinitions: [{ enName: "p", exportEnabled: true }]
    };
    const result = applyEDeviceDefinitionSectionsToLibraryState({
      sections: [{ kind: "eload", componentLibrary: "eload", exportEnabled: true, fields: [{ exportName: "p", cnName: "有功" }] }],
      libraryTemplates: [template],
      eDeviceDefinitionLabels: { ACLoad: "eload" }
    });
    expect(Object.keys(result.eDeviceDefinitionTemplateFields)).toEqual(["ACLoad"]);
    expect(result.eDeviceDefinitionTemplateFields.ACLoad?.map((field: any) => field.exportName)).toEqual(["p"]);
    expect(result.skipped).toEqual([]);
  });

  // appendUniqueFields 的去重契约（断最终模板字段的精确列，而不是数 skipped 条目数）：
  // 第二段的两个字段与第一段已有字段的 complianceKey 相同，必须都被丢弃
  //   ① {exportName:"p"} 无 sourceName —— 验 seen 建键是 sourceName 优先：
  //      第一段的 {sourceName:"p", exportName:"pmax"} 建出的 key 是 p，故它重复；
  //      若 seen 改用 exportName 优先，key 变成 pmax，这条会作为第三列留下。
  //   ② {sourceName:"Q_MAX"} —— 验 complianceKey 剥下划线并小写化：Q_MAX → qmax，与第一段重复。
  //   两个无名字段（既无 sourceName 也无 exportName）分列两段：
  //      第一段那个作为 target 侧成员原样保留（覆盖 seen 侧的两次 ?? 兜底），
  //      第二段那个作为 source 侧成员 key 为空必须被丢弃 —— 否则它会作为
  //      「未匹配设备属性」的空串列名混进 skipped.fields。
  test("同名 section 合并字段时按 complianceKey 去重且丢弃无名字段", () => {
    const template = {
      kind: "ACLoad",
      params: { component_type: "ACLoad" },
      parameterDefinitions: [{ enName: "p", exportEnabled: true }]
    };
    const result = applyEDeviceDefinitionSectionsToLibraryState({
      sections: [
        {
          kind: "load",
          componentLibrary: "ACLoad",
          exportEnabled: true,
          fields: [
            { sourceName: "p", exportName: "pmax", cnName: "有功" },
            { sourceName: "qmax", exportName: "qmax", cnName: "无功" },
            { cnName: "无名" }
          ]
        },
        {
          kind: "load",
          componentLibrary: "ACLoad",
          exportEnabled: true,
          fields: [
            { exportName: "p", cnName: "有功上限" },
            { sourceName: "Q_MAX", exportName: "qmax", cnName: "无功上限" },
            { cnName: "无名2" }
          ]
        }
      ],
      libraryTemplates: [template]
    });
    // 合并后只剩两列；去重坏掉会变成 4 列（多出 p 与重复的 qmax）
    expect(result.eDeviceDefinitionTemplateFields.ACLoad?.map((field: any) => field.exportName)).toEqual(["pmax", "qmax"]);
    // 两列都命中设备自带属性（ACLoad 默认带 p_max/q_max）
    expect(result.matched).toEqual([
      {
        section: "load",
        device: "ACLoad",
        fields: [
          { template: "pmax", device: "p_max" },
          { template: "qmax", device: "q_max" }
        ]
      }
    ]);
    // 只有 target 侧那个无名字段进了未匹配列表（列名为空串）；
    // source 侧那个若没被丢弃，这里会出现第二个空串列名。
    expect(result.skipped).toEqual([{ section: "load", reason: "字段未匹配设备属性", fields: [""] }]);
  });

  // eDeviceInterfaceRelationKey 的 idx_base 兜底：基类名归一化后为空（全是非字母数字字符）时，
  // 派生行的关系字段名退回 idx_base，而不是拼出 idx_ 空后缀。
  test("派生模板基类名无字母数字时关系字段名退回 idx_base", () => {
    const template = {
      kind: "custom-derived",
      label: "",
      isDerivedComponentLibrary: true,
      derivedFromComponentLibrary: "__",
      params: {
        component_type: "__",
        derived_from_component_type: "__",
        derived_component_type: "MyDerived",
        is_derived_component_library: "1"
      },
      parameterDefinitions: [{ enName: "p", exportEnabled: true }]
    };
    const rows = buildEDeviceInterfaceDefinitionRows({ libraryTemplates: [template] });
    const derived = rows.find((row) => row.componentLibrary === "MyDerived");
    expect(derived).toBeTruthy();
    expect(derived?.fields.map((field: any) => field.sourceName)).toContain("idx_base");
  });

  test("可选字段、原始类名、既有 override 与自定义模板清理", () => {
    const template = { kind: "ACLoad", params: { component_type: "ACLoad" }, parameterDefinitions: [{ enName: "p", exportEnabled: true }] };
    const result = applyEDeviceDefinitionSectionsToLibraryState({
      sections: [{ kind: "load", componentLibrary: "ACLoad", exportEnabled: false, fields: [{ exportName: "p" }] }],
      libraryTemplates: [template], customDeviceTemplates: [{ parameterDefinitions: [{}], measurementDefinitions: [{}] }],
      deviceDefinitionOverrides: { "shared:ACLoad": { stateDefinitions: [{ value: "ok" }] } },
      resolveDefinitionComponentLibrary: () => "ACLoad"
    });
    expect(result.eDeviceDefinitionClassExportEnabled.ACLoad).toBe(false);
    expect(result.deviceDefinitionOverrides["shared:ACLoad"]).toBeDefined();
    expect(result.customDeviceTemplates[0]).not.toHaveProperty("parameterDefinitions");
  });
});
