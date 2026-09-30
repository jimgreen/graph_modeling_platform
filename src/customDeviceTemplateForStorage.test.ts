// src/customDeviceUtils.ts 的 concreteDeviceTemplateForStorage：设备模板落盘前的最后一道闸。
// 模板上的分类库 / 端子 / 参数定义 / 量测定义等字段一律不带，落盘只留视觉部分 + 视觉参数。
// 此前零断言。判错不抛异常：多存一个字段只是库里多份陈旧数据，少剥一个则是把本该由
// 「共享定义」统一维护的东西复制成每设备一份，之后两边改不同步。
//
// 22 处变异逐条跑过，全部转红（分布在 customDeviceUtils / device-definition-shared /
// deviceVisualParams 三个文件：剥字段名单、params 过滤、componentClass 推导三段各自都有人盯）。
import { describe, expect, test } from "vitest";

import { concreteDeviceTemplateForStorage } from "./customDeviceUtils";
import type { DeviceTemplate } from "./model";

const tpl = (extra: Record<string, unknown> = {}): DeviceTemplate =>
  ({ kind: "my-device", label: "我的设备", params: {}, ...extra }) as unknown as DeviceTemplate;

const stored = (extra: Record<string, unknown> = {}): DeviceTemplate => concreteDeviceTemplateForStorage(tpl(extra));

// 落盘时要剥掉的模板字段（与源文件的解构列表一一对应）
const STRIPPED_TEMPLATE_FIELDS = [
  "categoryLibrary",
  "terminalType",
  "terminalCount",
  "terminalTypes",
  "terminalLabels",
  "terminalRoles",
  "terminalAssociations",
  "isContainer",
  "isDerivedComponentLibrary",
  "derivedFromComponentLibrary",
  "derivedComponentLibrary",
  "derivedComponentLibraryLabel",
  "parameterDefinitions",
  "parameterDefinitionsIntent",
  "parameterDefinitionsComplete",
  "measurementDefinitions",
  "measurementDefinitionsIntent"
] as const;

const FULL_TEMPLATE_EXTRA: Record<string, unknown> = {
  categoryLibrary: "交流设备",
  terminalType: "ac",
  terminalCount: 2,
  terminalTypes: ["ac", "ac"],
  terminalLabels: ["A", "B"],
  terminalRoles: ["source", "load"],
  terminalAssociations: ["ac-generator", "ac-load"],
  isContainer: true,
  isDerivedComponentLibrary: true,
  derivedFromComponentLibrary: "ACGenerator",
  derivedComponentLibrary: "WIND",
  derivedComponentLibraryLabel: "风电",
  parameterDefinitions: [{ enName: "p", cnName: "有功" }],
  parameterDefinitionsIntent: "full",
  parameterDefinitionsComplete: true,
  measurementDefinitions: [{ measurementTypeId: "activePower" }],
  measurementDefinitionsIntent: "full",
  custom: true
};

describe("concreteDeviceTemplateForStorage：模板字段", () => {
  test("★ 十七个模板字段逐个剥掉，其余字段（含 kind / label / custom）原样留下", () => {
    const result = stored(FULL_TEMPLATE_EXTRA);
    for (const field of STRIPPED_TEMPLATE_FIELDS) {
      expect(Object.prototype.hasOwnProperty.call(result, field), field).toBe(false);
    }
    expect(Object.keys(result).sort()).toEqual(["componentClass", "custom", "kind", "label", "params"]);
  });

  test("只带其中一部分字段时同样剥掉，不依赖别的字段在不在", () => {
    for (const field of STRIPPED_TEMPLATE_FIELDS) {
      const result = stored({ [field]: "x" });
      expect(Object.prototype.hasOwnProperty.call(result, field), field).toBe(false);
    }
  });

  test("返回的是新对象，入参不被改", () => {
    const input = tpl(FULL_TEMPLATE_EXTRA);
    const result = concreteDeviceTemplateForStorage(input);
    expect(result).not.toBe(input);
    expect(Object.prototype.hasOwnProperty.call(input, "terminalType")).toBe(true);
    expect(input.params).toEqual({});
  });
});

describe("concreteDeviceTemplateForStorage：params 只留视觉项", () => {
  test("★ 视觉键与 button 前缀留下，共享定义元数据、库名、dev_type、额定值全丢", () => {
    const result = stored({
      params: {
        icon: "wind.svg",
        lineWidth: "2",
        buttonText: "hello",
        component_type: "GEN",
        derived_from_component_type: "ACGenerator",
        derived_component_type: "WIND",
        derived_component_library_label: "风电",
        is_derived_component_library: "yes",
        dev_type: "ACLine",
        rated_voltage: "10"
      }
    });
    expect(result.params).toEqual({ icon: "wind.svg", lineWidth: "2", buttonText: "hello" });
  });

  test("入参的 params 对象不被就地删改", () => {
    const params = { component_type: "GEN", icon: "a.svg" };
    stored({ params });
    expect(params).toEqual({ component_type: "GEN", icon: "a.svg" });
  });

  test("没有 params 字段时落盘成空对象", () => {
    const result = concreteDeviceTemplateForStorage({ kind: "my-device" } as unknown as DeviceTemplate);
    expect(result.params).toEqual({});
  });

  test("全是不可保留的参数时落盘成空对象", () => {
    expect(stored({ params: { dev_type: "ACLine", rated_voltage: "10" } }).params).toEqual({});
  });
});

describe("concreteDeviceTemplateForStorage：componentClass", () => {
  test("显式写的 componentClass 优先，且会去空白", () => {
    expect(stored({ componentClass: "  MyClass  " }).componentClass).toBe("MyClass");
  });

  test("没显式写时取派生元件库名", () => {
    const result = stored({
      params: { component_type: "WIND", derived_from_component_type: "ACGenerator", derived_component_type: "WIND" },
      isDerivedComponentLibrary: true
    });
    expect(result.componentClass).toBe("WIND");
  });

  test("既没显式写又不是派生件时按 kind / 分类库推断", () => {
    expect(stored({ kind: "ac-line" }).componentClass).toBe("ACBranch");
    expect(stored({ kind: "weird-thing", categoryLibrary: "静态图形" }).componentClass).toBe("StaticBasicShape");
  });

  test("空白显式值不算显式（回落推断）", () => {
    expect(stored({ kind: "ac-line", componentClass: "   " }).componentClass).toBe("ACBranch");
  });
});
