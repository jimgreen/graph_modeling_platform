// model-eexport 里四处此前零断言的导出：isDerivedComponentCommonFieldName / firstText /
// shouldAssignVoltageSetpointDefault / buildEDeviceValues。
// 全是纯函数、不抛异常，判错后果是「派生元件多导出一列和基类重名的参数」
// 「E 文件里电压设定值被默认值覆盖 / 该填的没填」，属静默算错一类。
import { describe, expect, test } from "vitest";

import {
  E_SECTION_COLUMNS,
  buildEDeviceValues,
  firstText,
  isDerivedComponentCommonFieldName,
  shouldAssignVoltageSetpointDefault
} from "./model-eexport";
import type { ModelNode } from "./model";

describe("isDerivedComponentCommonFieldName", () => {
  test("dev_type 是例外：即便基类段有 dev_type 列也返回 false", () => {
    // ACContainer 的列里确实有 dev_type，但派生类参数定义要保留设备类型字段，故在查表前就返回 false
    expect(E_SECTION_COLUMNS.ACContainer).toContain("dev_type");
    expect(isDerivedComponentCommonFieldName("dev_type", "ACContainer")).toBe(false);
    // 而 dev_type 本身在内置通用表里 —— 去掉那道例外后它本会是 true
    expect(isDerivedComponentCommonFieldName("parent", "ACContainer")).toBe(true);
  });

  test("空名与下划线开头的私有字段一律算「公共」", () => {
    expect(isDerivedComponentCommonFieldName("", "ACRealBs")).toBe(true);
    expect(isDerivedComponentCommonFieldName("_vbase", "ACRealBs")).toBe(true);
    expect(isDerivedComponentCommonFieldName("_", "ACRealBs")).toBe(true);
  });

  test("元数据类与通用类字段名命中两张内置表", () => {
    for (const name of ["component_type", "componentType", "componentLibrary", "derivedComponentLibrary",
      "is_derived_component_library", "isDerivedComponentLibrary"]) {
      expect(isDerivedComponentCommonFieldName(name, "ACRealBs"), name).toBe(true);
    }
    for (const name of ["idx", "name", "status", "run_stat", "i_node", "v_set", "rated_voltage", "source_type"]) {
      expect(isDerivedComponentCommonFieldName(name, "ACRealBs"), name).toBe(true);
    }
  });

  test("★ 第三条路：基类段的列名也算公共字段，且**库名大小写敏感**", () => {
    // v_max 只出现在 ACRealBs 的列里，两张内置表都没有它 ——
    // 于是返回 true 只能来自 E_SECTION_COLUMNS 这一路
    expect(E_SECTION_COLUMNS.ACRealBs).toContain("v_max");
    expect(isDerivedComponentCommonFieldName("v_max", "ACRealBs")).toBe(true);
    // 库名写错大小写就查不到列
    expect(isDerivedComponentCommonFieldName("v_max", "acrealbs")).toBe(false);
    expect(isDerivedComponentCommonFieldName("v_max", "ACREALBS")).toBe(false);
    expect(isDerivedComponentCommonFieldName("v_max", "")).toBe(false);
    // 列里没有的名字
    expect(isDerivedComponentCommonFieldName("zzzz_not_a_column", "ACRealBs")).toBe(false);
  });

  test("★ 字段名本身大小写敏感：IDX 不是内置表里的 idx", () => {
    expect(isDerivedComponentCommonFieldName("idx", "ACRealBs")).toBe(true);
    expect(isDerivedComponentCommonFieldName("IDX", "ACRealBs")).toBe(false);
    expect(isDerivedComponentCommonFieldName("Idx", "ACRealBs")).toBe(false);
  });
});

describe("firstText", () => {
  test("跳过 undefined 与纯空白，返回第一个非空的**原样**值", () => {
    expect(firstText([undefined, "", "   ", "a"])).toBe("a");
    // 不 trim：判定用 trim，返回用原值
    expect(firstText(["  a  "])).toBe("  a  ");
    expect(firstText(["", "  x ", "y"])).toBe("  x ");
  });

  test("全空 / 空数组都回落成空串（不返回 undefined）", () => {
    expect(firstText([])).toBe("");
    expect(firstText([undefined])).toBe("");
    expect(firstText(["", "  ", "\t\n"])).toBe("");
  });
});

describe("shouldAssignVoltageSetpointDefault", () => {
  test("undefined / 纯空白 / 数值为零都要填默认值", () => {
    for (const value of [undefined, "", "   ", "0", "0.0", "0.00", "-0", "0 ", "0kV"]) {
      expect(shouldAssignVoltageSetpointDefault(value), JSON.stringify(value)).toBe(true);
    }
  });

  test("非零数值与非数值文本都不填（保留用户填的原值）", () => {
    for (const value of ["1", "0.1", "-1", "1e0", "35kV", "abc", "０"]) {
      expect(shouldAssignVoltageSetpointDefault(value), JSON.stringify(value)).toBe(false);
    }
  });
});

describe("buildEDeviceValues", () => {
  const node = (kind: string, params: Record<string, string> = {}): ModelNode =>
    ({
      kind,
      name: "名称",
      nodeNumber: "N1",
      terminals: [
        { id: "t1", label: "端1", type: "ac", anchor: { x: 0, y: -0.5 }, vbase: "10.5" },
        { id: "t2", label: "端2", type: "ac", anchor: { x: 0, y: 0.5 }, vbase: "0.4" }
      ],
      params: { name: "名称", vbase: "10.5", ...params }
    }) as unknown as ModelNode;

  test("字段集由 kind 推出的 E 段决定：同一节点不同 kind 结果不同", () => {
    expect(buildEDeviceValues(node("ac-load"))).toEqual({ name: "名称", node: "1" });
    expect(buildEDeviceValues(node("ac-line"))).toEqual({ name: "名称", i_node: "1" });
    // 换流器多出控制方式两项，且默认值由段决定（P / NONE）
    expect(buildEDeviceValues(node("dcdc-converter"))).toEqual({
      name: "名称",
      i_node: "1",
      i_control_type: "P",
      j_control_type: "NONE"
    });
  });

  test("★ 认不出的 kind 推出空字段集（不是抛错、也不是全字段）", () => {
    expect(buildEDeviceValues(node("unknown-kind-x"))).toEqual({});
  });

  test("params 里的值按字段名落到导出名上，空值不写进结果", () => {
    expect(buildEDeviceValues(node("ac-line", { r: "3", x: "1" }))).toEqual({ name: "名称", i_node: "1", r: "3", x: "1" });
    // 空串视为无值：不产出键
    expect(buildEDeviceValues(node("ac-line", { r: "", x: "1" }))).toEqual({ name: "名称", i_node: "1", x: "1" });
  });

  test("拓扑端子号优先于 params：端子带 nodeNumber 时按端子取", () => {
    const withTopology = {
      ...node("ac-line", { i_node: "7", j_node: "8" }),
      terminals: [
        { id: "t1", label: "端1", type: "ac", anchor: { x: 0, y: -0.5 }, vbase: "10.5", nodeNumber: "101" },
        { id: "t2", label: "端2", type: "ac", anchor: { x: 0, y: 0.5 }, vbase: "0.4", nodeNumber: "202" }
      ]
    } as unknown as ModelNode;
    expect(buildEDeviceValues(withTopology)).toEqual({ name: "名称", i_node: "101", j_node: "202" });
  });

  test("★ params 参与段推导：params.component_type 会改写 E 段，段不认识就整段丢空", () => {
    // 同一个 kind，只因 params 里多了 component_type，段就变了、字段集随之清空 ——
    // 这条同时钉住 buildEDeviceValues 把 node.params 透传给 resolveEParameterFields
    expect(buildEDeviceValues(node("ac-line", { component_type: "acrealbs" }))).toEqual({});
    expect(buildEDeviceValues(node("ac-line"))).not.toEqual({});
  });

  test("options 缺省与显式空对象同解", () => {
    const target = node("ac-line", { r: "3" });
    expect(buildEDeviceValues(target)).toEqual(buildEDeviceValues(target, {}));
    // 已证明 options.preferTopologyNodeNumbers 不能作为覆盖证据：它只在
    // getRawEParamValue 的 E_NODE_REFERENCE_COLUMNS 分支被读，而那里的拓扑取值
    // 对本文件用到的几段要么直接给出值（这条分支就走不到）、要么回落到节点引用默认值，
    // 两种取值下显式传 true 与不传结果一致（探针实测：无端子 / 有 i_node 参数 /
    // i_node=007 / i_node=NN 四种输入下返回值全同）。同理「不透传 options」这条变异也抓不到。
  });
});
