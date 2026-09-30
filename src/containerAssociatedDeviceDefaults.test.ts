// src/model.ts 的 applyContainerAssociatedDeviceDefaults：电解槽 / 燃料电池这类容器，
// 它的每个「非依赖」端子都要带出一份关联设备的默认参数（额定容量、功率上下限、压力流量…）。
// 此前零断言。判错不抛异常：容器成员在参数表里少几列默认值，E 文件容器关联段就写出一堆空值。
//
// 24 处变异跑过，23 处转红。一处**观察不到**、不算覆盖：「依赖端子跳过」那个 continue ——
// 依赖端子按定义必然是双端口关联类型（heat2-*），而双端口段不在这张默认表里，那一端子本来
// 就补不出任何键，所以跳过与不跳过结果相同。写不出能证伪它的用例，代码也不动。
// 过程中补的真缺口：非容器模板要给全端子配置（否则被夹具挡住、测不到 isContainer 守卫）、
// -vertical 变体、直流负荷无 Q 上下限、氢荷的控制方式、燃料电池的 flow_max。
//
// 键名口径：<列名>_<关系键去掉 idx_ 前缀>，例如关系键 idx_ac_load_t1 的额定容量列
// 落成 rated_capacity_ac_load_t1。关系键由端子关联类型（ac-load / h2-source…）推出来。
import { describe, expect, test } from "vitest";

import { applyContainerAssociatedDeviceDefaults } from "./model";
import type { DeviceTemplate } from "./model";

type Params = Record<string, string>;

const containerTpl = (kind: string, over: Partial<DeviceTemplate> = {}): DeviceTemplate =>
  ({
    kind,
    label: kind,
    params: {},
    size: { width: 100, height: 100 },
    isContainer: true,
    terminalType: "ac",
    ...over
  }) as unknown as DeviceTemplate;

const run = (template: DeviceTemplate, params: Params = {}): Params =>
  applyContainerAssociatedDeviceDefaults(params, template);

/** 电解槽容器：交流侧挂一个交流负荷，氢侧挂一个氢源。 */
const electrolyzer = (over: Partial<DeviceTemplate> = {}) =>
  containerTpl("ac-electrolyzer", {
    terminalTypes: ["ac", "h2"],
    terminalAssociations: ["ac-load", "h2-source"],
    ...over
  });

describe("applyContainerAssociatedDeviceDefaults：适用范围", () => {
  test("★ 非容器模板原样返回**同一引用**（端子配置给全，只靠 isContainer 挡着）", () => {
    const params: Params = { a: "1" };
    const template = containerTpl("ac-electrolyzer", {
      isContainer: false,
      terminalTypes: ["ac", "h2"],
      terminalAssociations: ["ac-load", "h2-source"]
    });
    expect(run(template, params)).toBe(params);
  });

  test("★ -vertical 变体按 baseDeviceKind 归一后同样参与", () => {
    const result = run(containerTpl("ac-electrolyzer-vertical", {
      terminalTypes: ["ac", "h2"],
      terminalAssociations: ["ac-load", "h2-source"]
    }));
    expect(result.rated_capacity_ac_load_t1).toBe("5");
  });

  test("★ 容器但不是电解槽 / 燃料电池也原样返回同一引用", () => {
    for (const kind of ["ac-line", "ac-source", "ac-storage", "hydrogen-storage", "ac-vpp-box"]) {
      const params: Params = { a: "1" };
      expect(run(containerTpl(kind), params), kind).toBe(params);
    }
  });

  test("四种耦合体 kind 都参与：交流 / 直流 × 电解槽 / 燃料电池", () => {
    for (const kind of ["ac-electrolyzer", "dc-electrolyzer", "ac-fuel-cell", "dc-fuel-cell"]) {
      const result = run(containerTpl(kind, { terminalTypes: ["ac", "h2"], terminalAssociations: ["ac-load", "h2-source"] }));
      expect(Object.keys(result).length, kind).toBeGreaterThan(0);
    }
  });
});

describe("applyContainerAssociatedDeviceDefaults：交流侧关联设备", () => {
  test("★ 交流负荷端子补出容量与 P/Q 上下限（电解槽 5 MWh 口径）", () => {
    const result = run(electrolyzer());
    expect(result).toMatchObject({
      rated_capacity_ac_load_t1: "5",
      p_max_ac_load_t1: "5",
      p_min_ac_load_t1: "0",
      q_max_ac_load_t1: "5",
      q_min_ac_load_t1: "-5"
    });
  });

  test("★ 交流电源端子多一列额定电压，且交流端子取 10 kV", () => {
    const result = run(containerTpl("ac-electrolyzer", {
      terminalTypes: ["ac", "h2"],
      terminalAssociations: ["ac-generator", "h2-source"]
    }));
    expect(result.rated_voltage_ac_unit_t1).toBe("10");
    expect(result.rated_capacity_ac_unit_t1).toBe("5");
  });

  test("直流端子取 750 V", () => {
    const result = run(containerTpl("dc-electrolyzer", {
      terminalType: "dc",
      terminalTypes: ["dc", "h2"],
      terminalAssociations: ["dc-generator", "h2-source"]
    }));
    expect(result.rated_voltage_dc_unit_t1).toBe("750");
  });

  test("★ 直流负荷没有 Q 上下限（直流侧无无功）", () => {
    const result = run(containerTpl("dc-electrolyzer", {
      terminalType: "dc",
      terminalTypes: ["dc", "h2"],
      terminalAssociations: ["dc-load", "h2-source"]
    }));
    expect(result).toMatchObject({ rated_capacity_dc_load_t1: "5", p_max_dc_load_t1: "5", p_min_dc_load_t1: "0" });
    expect(result).not.toHaveProperty("q_max_dc_load_t1");
    expect(result).not.toHaveProperty("q_min_dc_load_t1");
  });

  test("★ 燃料电池的额定容量是 3（电解槽是 5）", () => {
    const fuelCell = containerTpl("ac-fuel-cell", { terminalTypes: ["ac", "h2"], terminalAssociations: ["ac-load", "h2-source"] });
    expect(run(fuelCell).rated_capacity_ac_load_t1).toBe("3");
    expect(run(electrolyzer()).rated_capacity_ac_load_t1).toBe("5");
  });
});

describe("applyContainerAssociatedDeviceDefaults：氢侧关联设备", () => {
  test("★ 氢源端子补出压力 / 流量整套，控制方式定流量", () => {
    const result = run(electrolyzer());
    expect(result).toMatchObject({
      rated_capacity_h2_unit_t2: "1000",
      control_type_h2_unit_t2: "FLOW",
      pressure_set_h2_unit_t2: "20",
      pressure_max_h2_unit_t2: "25",
      pressure_min_h2_unit_t2: "1",
      flow_set_h2_unit_t2: "1000",
      flow_max_h2_unit_t2: "1000",
      flow_min_h2_unit_t2: "0"
    });
  });

  test("★ 氢荷端子用另一套压力默认值（2 / 5 / 0.1），额定容量取 1000", () => {
    const result = run(containerTpl("ac-electrolyzer", {
      terminalTypes: ["ac", "h2"],
      terminalAssociations: ["ac-load", "h2-load"]
    }));
    expect(result).toMatchObject({
      rated_capacity_h2_load_t2: "1000",
      control_type_h2_load_t2: "FLOW",
      pressure_set_h2_load_t2: "2",
      pressure_max_h2_load_t2: "5",
      pressure_min_h2_load_t2: "0.1"
    });
  });

  test("★ 燃料电池的氢流量是 600（电解槽是 1000）", () => {
    const result = run(containerTpl("ac-fuel-cell", { terminalTypes: ["ac", "h2"], terminalAssociations: ["ac-load", "h2-source"] }));
    expect(result.rated_capacity_h2_unit_t2).toBe("600");
    expect(result.flow_set_h2_unit_t2).toBe("600");
    expect(result.flow_max_h2_unit_t2).toBe("600");
  });
});

describe("applyContainerAssociatedDeviceDefaults：不覆盖已有值", () => {
  test("★ 参数表里已有的值一律保留（含空串）", () => {
    const params: Params = { rated_capacity_ac_load_t1: "9", p_max_ac_load_t1: "" };
    const result = run(electrolyzer(), params);
    expect(result.rated_capacity_ac_load_t1).toBe("9");
    expect(result.p_max_ac_load_t1).toBe("");
    // 其余缺省列照常补上
    expect(result.q_max_ac_load_t1).toBe("5");
  });

  test("入参对象不被就地改（补值走副本）", () => {
    const params: Params = { keep: "x" };
    const result = run(electrolyzer(), params);
    expect(params).toEqual({ keep: "x" });
    expect(result).not.toBe(params);
    expect(result.keep).toBe("x");
  });

  test("已经齐全时返回入参本身（不产生无谓的新对象）", () => {
    const once = run(electrolyzer());
    const again = applyContainerAssociatedDeviceDefaults(once, electrolyzer());
    expect(again).toBe(once);
  });
});

describe("applyContainerAssociatedDeviceDefaults：依赖端子", () => {
  test("★ 双端口角色落到 TwoPort 段，这套默认表里没有它 → 一个键都不补", () => {
    const result = run(containerTpl("ac-electrolyzer", {
      terminalTypes: ["ac", "ac"],
      terminalRoles: ["double-load"]
    }));
    expect(result).toEqual({});
  });

  test("单端口角色才会补（对照组：同样的端子类型换个角色名就有值了）", () => {
    const result = run(containerTpl("ac-electrolyzer", {
      terminalTypes: ["ac", "ac"],
      terminalRoles: ["single-load", "single-load"]
    }));
    expect(result.rated_capacity_ac_load_t1).toBe("5");
    expect(result.rated_capacity_ac_load_t2).toBe("5");
  });

  test("没有给关联类型时按端子类型 + 角色推导（键前缀随之变化）", () => {
    const result = run(containerTpl("ac-electrolyzer", { terminalTypes: ["dc", "h2"], terminalRoles: ["single-load", "single-source"] }));
    expect(result).toMatchObject({
      rated_capacity_dc_load_t1: "5",
      rated_capacity_h2_unit_t2: "1000"
    });
  });
});
