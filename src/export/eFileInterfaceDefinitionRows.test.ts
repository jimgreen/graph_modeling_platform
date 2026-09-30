// E 文件导出：元件定义表行构建（buildEDeviceInterfaceDefinitionRows）。
//
// 这套行同时喂给「E 文件编辑器」窗口与导出模板，链路长、默认分支多，但写错时
// 不抛错 —— 只是编辑器里少一列、导出时该段缺字段，只能肉眼比对 E 文件才发现。
// 下面钉住的是那些「静默出错」的分支：静态图元不该出现在交流表里、固定字段
// 必须只读、绕组表必须按 <trans> 段声明的列重算、模板字段要能覆盖 exportName。
import { describe, expect, test } from "vitest";
import { DEVICE_LIBRARY } from "../model";
import { applyEDeviceInterfaceFieldOrder, buildEDeviceInterfaceDefinitionRows } from "./e-file";

const templatesOf = (...kinds: string[]) => DEVICE_LIBRARY.filter((template) => kinds.includes(template.kind));

// 生产侧这几个函数大量走 any（字段来自动态元件定义），这里给出测试需要的最小结构
type Row = {
  componentLibrary: string;
  label: string;
  exportEnabled: boolean;
  exportName: string;
  fields: Array<{ sourceName: string; exportName: string; exportEnabled: boolean; readonly: boolean; cnName: string }>;
};

const rowsOf = (kinds: string[], options: Record<string, unknown> = {}): Row[] =>
  buildEDeviceInterfaceDefinitionRows({ libraryTemplates: templatesOf(...kinds), ...options }) as Row[];

const groupOf = (rows: readonly Row[], componentLibrary: string): Row =>
  rows.find((row) => row.componentLibrary === componentLibrary)!;

const fieldNames = (group: Row) => group.fields.map((field) => field.sourceName);

describe("applyEDeviceInterfaceFieldOrder：模板字段顺序即最终顺序", () => {
  const fields = [
    { sourceName: "vbase", exportEnabled: true },
    { sourceName: "alpha" }
  ];

  test("未配置顺序 → 原样返回（不排序、不裁剪）", () => {
    expect(applyEDeviceInterfaceFieldOrder(fields, [])).toBe(fields);
    expect(applyEDeviceInterfaceFieldOrder(fields)).toBe(fields);
  });

  test("★ 设备独有字段被丢弃：模板没声明的列不出现在定义表里", () => {
    const ordered = applyEDeviceInterfaceFieldOrder(fields, ["vbase"]);
    expect(ordered.map((field) => field.sourceName)).toEqual(["vbase"]);
  });

  test("★ 模板声明了但设备没有的字段 → 生成占位行（导出可用）", () => {
    const ordered = applyEDeviceInterfaceFieldOrder(fields, ["vbase", "tap"]) as any[];
    expect(ordered[1]).toEqual({
      sourceName: "tap",
      cnName: "tap",
      exportEnabled: true,
      exportName: "tap"
    });
  });

  test("★ 命中设备字段时保留原对象（含其 exportEnabled），不替换成占位行", () => {
    const ordered = applyEDeviceInterfaceFieldOrder(fields, ["Vbase"]) as any[];
    expect(ordered[0]).toBe(fields[0]);
  });

  test("顺序表里的重复项只取一次", () => {
    const ordered = applyEDeviceInterfaceFieldOrder(fields, ["vbase", "vbase"]);
    expect(ordered.map((field) => field.sourceName)).toEqual(["vbase"]);
  });
});

describe("buildEDeviceInterfaceDefinitionRows：分组", () => {
  test("★ 静态图元不进 E 文件定义表（componentLibrary 以 Static 开头被跳过）", () => {
    const statics = [...new Set(DEVICE_LIBRARY.map((t) => t.kind))].filter((kind) => kind.startsWith("static-"));
    expect(rowsOf(statics.slice(0, 5))).toEqual([]);
  });

  test("componentLibrary 由模板 kind 推断（母线 → ACRealBs，主变 → ACTransformer）", () => {
    const rows = rowsOf(["ac-bus", "ac-transformer", "ac-load"]);
    expect(rows.map((row) => row.componentLibrary)).toEqual(
      expect.arrayContaining(["ACRealBs", "ACTransformer", "ACLoad"])
    );
  });

  test("★ ac-transformer 自动镜像出 ACTransWinding 绕组表", () => {
    const rows = rowsOf(["ac-transformer"]);
    const winding = groupOf(rows, "ACTransWinding");
    expect(winding).toBeTruthy();
    expect(winding.label).toBe("变压器绕组");
    // 镜像自基类，字段集一致
    expect(fieldNames(winding)).toEqual(fieldNames(groupOf(rows, "ACTransformer")));
  });

  test("类级开关：eDeviceDefinitionClassExportEnabled 显式 false 才关", () => {
    const rows = rowsOf(["ac-load"], { eDeviceDefinitionClassExportEnabled: { ACLoad: false } });
    expect(groupOf(rows, "ACLoad").exportEnabled).toBe(false);
    expect(rowsOf(["ac-load"], { eDeviceDefinitionClassExportEnabled: {} })).toHaveLength(1);
  });

  test("类级 exportName 优先于 componentLibrary 本名", () => {
    const rows = rowsOf(["ac-load"], { eDeviceDefinitionLabels: { ACLoad: "交流负荷类" } });
    expect(groupOf(rows, "ACLoad").exportName).toBe("交流负荷类");
    // 绕组表有各自的默认值，不受基类标签影响
    expect(groupOf(rowsOf(["ac-transformer"], { eDeviceDefinitionLabels: { ACTransformer: "变压器类" } }), "ACTransWinding").exportName).toBe("ACTransWinding");
  });
});

describe("buildEDeviceInterfaceDefinitionRows：字段", () => {
  test("★ 固定字段恒导出且只读，exportName 强制等于 sourceName", () => {
    const group = groupOf(rowsOf(["ac-transformer"]), "ACTransformer");
    for (const name of ["idx", "name", "parent", "dev_type"]) {
      const field = group.fields.find((f) => f.sourceName === name)!;
      expect(field.exportEnabled).toBe(true);
      expect(field.readonly).toBe(true);
      expect(field.exportName).toBe(name);
    }
  });

  test("rdf_id 不是固定字段：不导出（E 文件里不写原始 ID）", () => {
    const rdfId = groupOf(rowsOf(["ac-load"]), "ACLoad").fields.find((f) => f.sourceName === "rdf_id")!;
    expect(rdfId.exportEnabled).toBe(false);
    expect(rdfId.readonly).toBe(false);
  });

  test("★ 字段顺序由 eDeviceDefinitionFieldOrder 决定，未知名生成占位行", () => {
    const group = groupOf(rowsOf(["ac-load"], { eDeviceDefinitionFieldOrder: { ACLoad: ["name", "p", "zzz"] } }), "ACLoad");
    expect(fieldNames(group)).toEqual(["name", "p", "zzz"]);
    expect(group.fields[2].exportEnabled).toBe(true);
  });

  test("★ 模板字段覆盖 exportName 与中文名", () => {
    const group = groupOf(
      rowsOf(["ac-load"], { eDeviceDefinitionTemplateFields: { ACLoad: [{ sourceName: "p", exportName: "有功", cnName: "有功功率" }] } }),
      "ACLoad"
    );
    const field = group.fields.find((f) => f.sourceName === "p")!;
    expect(field.exportName).toBe("有功");
    expect(field.cnName).toBe("有功功率");
  });

  test("★ 绕组表按 <trans> 段声明的列重算 exportEnabled，固定字段不参与", () => {
    const group = groupOf(
      rowsOf(["ac-transformer"], { eDeviceDefinitionTemplateFields: { ACTransWinding: [{ exportName: "tap", cnName: "分接头" }] } }),
      "ACTransWinding"
    );
    // tap 在绕组段里声明了 → 导出
    expect(group.fields.find((f) => f.sourceName === "tap")).toMatchObject({ exportEnabled: true, readonly: false });
    // 基类声明但绕组段没声明的非固定字段 → 不导出
    for (const name of ["status", "run_stat", "i_vbase", "j_vbase", "i_p"]) {
      expect(group.fields.find((f) => f.sourceName === name)!.exportEnabled).toBe(false);
    }
    // 固定字段保持导出只读，不被重算成 false
    for (const name of ["idx", "name", "parent", "dev_type"]) {
      expect(group.fields.find((f) => f.sourceName === name)).toMatchObject({ exportEnabled: true, readonly: true });
    }
  });

  test("★ 绕组段无声明时维持继承值（不因缺模板而整表不导出）", () => {
    const inherited = groupOf(rowsOf(["ac-transformer"]), "ACTransWinding");
    const base = groupOf(rowsOf(["ac-transformer"]), "ACTransformer");
    expect(inherited.fields.map((f) => f.exportEnabled)).toEqual(base.fields.map((f) => f.exportEnabled));
  });
});