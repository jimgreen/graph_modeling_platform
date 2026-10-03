// DEVICE_LIBRARY 里容器模板的形状守卫。
//
// ## 为什么钉这些
//
// 容器相关的多条逻辑都靠「模板自带的事实」推进，而不是靠运行时猜测：
//   - buildContainerDeviceParameterViews 用 terminalCount / terminalTypes / terminalRoles
//     决定出几组视图、每组叫什么；
//   - describeContainerTerminalAssociations 用 terminalAssociations 决定关联设备类型；
//   - 能耗/氢能校验用 HYDROGEN_COUPLING_VALIDATION_SPECS 里的 relation 字段名。
// 库里的这些数字一旦被改动，上面三处的行为会一起变，而**不会**有任何测试变红
// （因为它们断言的是自己的输出，不是库的形状）。所以这里单独立一条守卫。
import { describe, expect, test } from "vitest";

import { DEVICE_LIBRARY } from "./model";

const templateOf = (kind: string) => {
  const template = DEVICE_LIBRARY.find((item) => item.kind === kind);
  expect(template, kind).toBeDefined();
  return template!;
};

describe("DEVICE_LIBRARY —— 容器模板的端子事实", () => {
  test("★ 交流电解槽：2 端子（ac + h2），关联 ac-load 与 h2-source", () => {
    const template = templateOf("ac-electrolyzer");
    expect(template.isContainer).toBe(true);
    expect(template.terminalCount).toBe(2);
    expect(template.terminalTypes).toEqual(["ac", "h2"]);
    expect(template.terminalAssociations).toEqual(["ac-load", "h2-source"]);
  });

  test("直流电解槽是同样形状（只是端子类型换 dc）", () => {
    const template = templateOf("dc-electrolyzer");
    expect(template.isContainer).toBe(true);
    expect(template.terminalCount).toBe(2);
    expect(template.terminalTypes?.[0]).toBe("dc");
    expect(template.terminalAssociations?.[0]).toBe("dc-load");
  });

  test("★ 燃料电池方向相反（h2e：氢进、电出）", () => {
    const template = templateOf("ac-fuel-cell");
    expect(template.isContainer).toBe(true);
    expect(template.terminalTypes).toEqual(["ac", "h2"]);
    // 关联类型与电解槽不同：电源 + 氢负荷
    expect(template.terminalAssociations).not.toEqual(["ac-load", "h2-source"]);
  });

  test("双端供热锅炉 2 端子、热能单端锅炉 1 端子", () => {
    expect(templateOf("two-port-heat-boiler").terminalCount).toBe(2);
    expect(templateOf("heat-boiler").terminalCount).toBe(1);
    expect(templateOf("heat-boiler").terminalTypes).toEqual(["heat"]);
  });

  test("★ 容器模板的 terminalCount 与 terminalTypes 长度一致（不一致会让视图数量对不上）", () => {
    for (const template of DEVICE_LIBRARY.filter((item) => item.isContainer && (item.terminalTypes?.length ?? 0) > 0)) {
      expect(template.terminalTypes?.length, template.kind).toBe(template.terminalCount);
    }
  });

  test("带 terminalRoles 的模板，角色数也与端子数一致", () => {
    for (const template of DEVICE_LIBRARY.filter((item) => item.isContainer && (item.terminalRoles?.length ?? 0) > 0)) {
      expect(template.terminalRoles?.length, template.kind).toBe(template.terminalCount);
    }
  });

  test("非静态的电力设备不是容器（isContainer 未置位）", () => {
    expect(templateOf("ac-load").isContainer).toBeFalsy();
    expect(templateOf("ac-bus").isContainer).toBeFalsy();
  });
});