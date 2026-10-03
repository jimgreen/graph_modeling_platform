// applyEDeviceDefinitionSectionsToLibraryState 的键形态直测。
//
// ## 覆盖的是什么
//
// 这个函数产出三张表，它们的**键形态各不相同**，而下游按形态区分用法：
//   - eDeviceDefinitionFieldOrder  → 键是裸类名（"ACLoad"）
//   - eDeviceDefinitionLabels       → 键是裸类名
//   - deviceDefinitionOverrides     → 键是**共享身份**（"shared:ACLoad"、"shared:ACCompensator::CAPACITOR"）
//
// 键形态一旦混用，「按类名找 override」会全部落空 —— 而结果是静默的：
// 导出照常成功，只是覆盖没生效。
//
// 共享身份那层（`deviceDefinitionSharedIdentityForTemplate`）的作用是把同一条物理定义
// 的多个 kind 收敛到一个键上，于是 ACCompensator 下的电容器与电抗器共用一个键、
// 但用 `::CAPACITOR` / `::REACTOR` 后缀区分变体。
import { describe, expect, test } from "vitest";

import { DEVICE_LIBRARY } from "../model";
import { parseEDeviceDefinitionFile } from "../model-eexport";
import { applyEDeviceDefinitionSectionsToLibraryState } from "./e-file";

/** 用一段 ACLoad 模板跑一次归一化，返回三张表。 */
function apply(sectionsText: string) {
  return applyEDeviceDefinitionSectionsToLibraryState({
    sections: parseEDeviceDefinitionFile(sectionsText),
    libraryTemplates: DEVICE_LIBRARY
  });
}

const AC_LOAD_TEMPLATE = `<Model>
@ path name
# 自定义
</Model>
<node 类="ACLoad+交流负荷" 表号="00401">
@ p, u
// 有功值, 电压值
</node>
</Model>
`;

describe("三张表的键形态", () => {
  test("★ fieldOrder 与 labels 用裸类名做键", () => {
    const state = apply(AC_LOAD_TEMPLATE);
    expect(Object.keys(state.eDeviceDefinitionFieldOrder)).toContain("ACLoad");
    expect(state.eDeviceDefinitionLabels.ACLoad).toBeDefined();
    // 这两张表里**不该**出现 shared: 前缀
    expect(Object.keys(state.eDeviceDefinitionFieldOrder).some((key) => key.startsWith("shared:"))).toBe(false);
  });

  test("★ overrides 用 shared: 身份做键（与上面两张表形态不同）", () => {
    const state = apply(AC_LOAD_TEMPLATE);
    const keys = Object.keys(state.deviceDefinitionOverrides);
    expect(keys.length).toBeGreaterThan(0);
    expect(keys.every((key) => key.startsWith("shared:")), keys.slice(0, 5).join(",")).toBe(true);
    expect(keys).toContain("shared:ACLoad");
  });

  test("★ 同一条定义的多个 kind 收敛到一个 shared 键，变体用 :: 后缀区分", () => {
    const state = apply(AC_LOAD_TEMPLATE);
    const keys = Object.keys(state.deviceDefinitionOverrides);
    const compensators = keys.filter((key) => key.includes("ACCompensator"));
    expect(compensators.length).toBeGreaterThanOrEqual(2);
    expect(compensators).toContain("shared:ACCompensator::CAPACITOR");
    expect(compensators).toContain("shared:ACCompensator::REACTOR");
  });

  test("overrides 里的字段带 exportName 与 cnName（决定 E 文件的表头）", () => {
    const state = apply(AC_LOAD_TEMPLATE);
    const acLoad = state.deviceDefinitionOverrides["shared:ACLoad"];
    const definitions = (acLoad?.parameterDefinitions ?? []) as Array<{ exportName?: string; cnName?: string }>;
    const p = definitions.find((definition) => definition.exportName === "p");
    expect(p).toBeDefined();
    expect(p?.cnName).toBe("有功值");
  });

  test("模板里的字段被搬进 templateFields（表头按实测是逗号整串，不逐字段拆分）", () => {
    const state = apply(AC_LOAD_TEMPLATE);
    const fields = state.eDeviceDefinitionTemplateFields.ACLoad ?? [];
    expect(Array.isArray(fields)).toBe(true);
    // 实测：templateFields 里的项按 exportName 逐条记录，cnName 取该段的中文表头串
    const exported = fields.map((field) => field.exportName);
    expect(exported.length).toBeGreaterThan(0);
    for (const field of fields) {
      expect(typeof field.cnName).toBe("string");
    }
  });

  test("类导出开关跟着模板段走（ACLoad 被显式启用）", () => {
    const state = apply(AC_LOAD_TEMPLATE);
    expect(state.eDeviceDefinitionClassExportEnabled.ACLoad).toBe(true);
  });
});