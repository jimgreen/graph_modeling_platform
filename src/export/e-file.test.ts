import { describe, expect, test } from "vitest";
import {
  applyEDeviceDefinitionSectionsToLibraryState,
  applyPredefinedEDeviceTemplateToLibraryState,
  buildEFileExportOptionsFromLibrary
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
});
