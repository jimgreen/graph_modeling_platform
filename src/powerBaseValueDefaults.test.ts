// DEFAULT_POWER_BASE_VALUE 零覆盖补测。
//
// 全仓原有的命中只有两类：
//   ① appControlFactories.test.tsx / appProjectCanvasFactories.test.ts 里的 `vi.mock` 桩 `: 100`
//   ② model-eexport.test.ts 里手写的 `powerBaseValue: 100` 夹具
// 两处都是「复述」字面量 100，从未 import 过真实导出，因此真实常量改成任何别的值都不会红。
//
// 真实消费者不在 React 组件里，而在纯模块 model-eexport.ts 的两处 `?? DEFAULT_POWER_BASE_VALUE`：
//   · 非模板模式 → buildPowerBaseParameterRecord → section "Model"   的 p_base
//   · 模板模式   → buildBasevalueParameterRecord   → section "basevalue" 的 p_base
// 两个函数都是 module-private，只能经导出的 buildEDeviceHeaderParameterRecords 触达，
// 所以下面两条路由各测一遍。
//
// 注意断言写法：`p_base` 的兜底值恰好是 100，因此**只**断言缺省项目会产出 "100"，
// 会被「把 p_base 硬编码成 100」的变异骗过。必须同时喂一个非默认值（250），
// 断言它透传为 "250"——只有这条能咬住硬编码变异。
import { describe, expect, test } from "vitest";

import { DEFAULT_POWER_BASE_VALUE, type ProjectFile } from "./model";
import { buildEDeviceHeaderParameterRecords, type EDeviceExport } from "./model-eexport";

/** 项目夹具：不写 powerBaseValue 即代表「未设置」，走 `?? DEFAULT_POWER_BASE_VALUE` 分支。 */
function projectWithoutPowerBase(powerBaseValue?: number): ProjectFile {
  const base: ProjectFile = { version: 1, name: "基值夹具", nodes: [], edges: [] };
  return powerBaseValue === undefined ? base : { ...base, powerBaseValue };
}

/** 从头表记录里挑出指定 section 的第一条，找不到直接抛，避免 arrayContaining 的空数组假绿。 */
function headerRecord(records: readonly EDeviceExport[], section: string): EDeviceExport {
  const found = records.find((record) => record.section === section);
  if (!found) throw new Error(`头表缺少 section=${section} 记录`);
  return found;
}

describe("DEFAULT_POWER_BASE_VALUE 功率基值默认值", () => {
  test("常量值严格等于 100，且是 number 类型", () => {
    // 与 src/model.ts:705 `export const DEFAULT_POWER_BASE_VALUE = 100;` 逐字核对
    expect(DEFAULT_POWER_BASE_VALUE).toBe(100);
    expect(typeof DEFAULT_POWER_BASE_VALUE).toBe("number");
    // 非字符串化：消费方 `String(project.powerBaseValue ?? ...)` 依赖它本就是数字
    expect(typeof DEFAULT_POWER_BASE_VALUE).not.toBe("string");
  });

  test("非模板模式头表：未设置 powerBaseValue 时 p_base 回落到默认值", () => {
    const records = buildEDeviceHeaderParameterRecords(projectWithoutPowerBase());
    // options 缺省即非模板模式，首条为 Model 记录
    expect(headerRecord(records, "Model").params.p_base).toBe("100");
  });

  test("非模板模式头表：显式 powerBaseValue 透传，兜底不生效", () => {
    const records = buildEDeviceHeaderParameterRecords(projectWithoutPowerBase(250));
    // 250 是刻意挑的非默认值：若 p_base 被硬编码成默认值，这条会红
    expect(headerRecord(records, "Model").params.p_base).toBe("250");
  });

  test("模板模式 basevalue 段：未设置时回落默认值，显式值透传", () => {
    const options = {
      eDeviceDefinitionLabels: { basevalue: "basevalue", basevoltage: "basevoltage" },
      interfaceDefinitions: [
        { componentLibrary: "basevalue", fields: [{ sourceName: "p_base", exportName: "p_base", cnName: "功率基值" }] },
        { componentLibrary: "basevoltage", fields: [{ sourceName: "idx", exportName: "idx", cnName: "序号" }] }
      ]
    };
    const fallbackRecords = buildEDeviceHeaderParameterRecords(projectWithoutPowerBase(), [], options);
    expect(headerRecord(fallbackRecords, "basevalue").params.p_base).toBe("100");

    const explicitRecords = buildEDeviceHeaderParameterRecords(projectWithoutPowerBase(250), [], options);
    expect(headerRecord(explicitRecords, "basevalue").params.p_base).toBe("250");
  });
});