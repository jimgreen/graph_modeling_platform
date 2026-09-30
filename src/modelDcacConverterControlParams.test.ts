// src/model.ts 的 normalizeDcacConverterNodeControlParams：交直流变流器（DCAC 段，
// kind 为 acdc-converter / dcac-converter）的控制方式参数归一 —— params 侧删旧名、
// 定两端（ac_control_type / dc_control_type）默认值，定义串侧丢旧控制类并补成 stringEnum。
// 与端点变流器那份（modelEndpointConverterControlParams.test.ts）的关键差别：
// DCAC 段**不补**任何缺失定义，也不插设定值列，只处理已有的。
// 此前零断言。判错不抛异常：只是导出 E 文件时控制方式列取错、或参数表留着旧列名。
//
// 37 处变异逐条跑过，全部转红。过程中补上一处真缺口：原先只断言了非控制定义的**位置**
// （orderOf 里还在），没断言内容，于是「非控制定义也走一遍控制归一」这条变异漏网。
// 一处**不能**由变异证伪：「没有 exportName 的定义不会被塞进 exportName: undefined」——
// 定义串经 JSON.stringify 往返，undefined 键本来就会被抹掉，写不出能改坏行为的变异。
import { describe, expect, test } from "vitest";

import { normalizeDcacConverterNodeControlParams } from "./model";
import type { ModelNode } from "./model";

type Params = Record<string, string>;

const node = (kind: string, params: Params = {}): ModelNode =>
  ({
    id: "n1",
    kind,
    name: "n1",
    nodeNumber: "n1",
    position: { x: 0, y: 0 },
    size: { width: 100, height: 100 },
    rotation: 0,
    scale: 1,
    terminals: [],
    params
  }) as unknown as ModelNode;

const def = (enName: string, extra: Record<string, unknown> = {}) => ({
  cnName: enName,
  enName,
  valueType: "string",
  typicalValue: "",
  readonly: false,
  ...extra
});

const DEFS = "_customParamDefinitions";

const run = (kind: string, params: Params = {}): ModelNode => normalizeDcacConverterNodeControlParams(node(kind, params));
const paramsOf = (result: ModelNode): Params => result.params as Params;

const definitionsOf = (result: ModelNode): Record<string, unknown>[] =>
  JSON.parse(paramsOf(result)[DEFS] ?? "null") as Record<string, unknown>[];

const withDefs = (kind: string, definitions: unknown[]): ModelNode => run(kind, { [DEFS]: JSON.stringify(definitions) });
const orderOf = (result: ModelNode): string[] => definitionsOf(result).map((definition) => String(definition.enName));
const byName = (result: ModelNode): Record<string, Record<string, unknown>> =>
  Object.fromEntries(definitionsOf(result).map((definition) => [String(definition.enName), definition]));

const ACAC_SETPOINT_KEYS = ["i_p_set", "j_p_set", "i_q_set", "j_q_set"];

describe("normalizeDcacConverterNodeControlParams：适用范围", () => {
  test("★ 非 DCAC 段 kind 原样返回**同一引用**", () => {
    for (const kind of ["ac-line", "ac-source", "acac-converter", "dcdc-converter", "custom-x"]) {
      const input = node(kind, { p_set: "1" });
      expect(normalizeDcacConverterNodeControlParams(input), kind).toBe(input);
    }
  });

  test("两个变流器 kind 都属于 DCAC 段（acdc 与 dcac 只是端子方向不同）", () => {
    for (const kind of ["acdc-converter", "dcac-converter"]) {
      expect(paramsOf(run(kind)), kind).toMatchObject({ ac_control_type: "PQ", dc_control_type: "V" });
    }
  });

  test("归一后不再变（幂等，返回同一引用）", () => {
    const once = run("acdc-converter", { ac_control_type: "定PV", p_set: "1" });
    expect(normalizeDcacConverterNodeControlParams(once)).toBe(once);
  });

  test("入参不被改（迁移走副本）", () => {
    const original = { ac_control_type: "定PV" };
    normalizeDcacConverterNodeControlParams(node("acdc-converter", original));
    expect(original).toEqual({ ac_control_type: "定PV" });
  });
});

describe("normalizeDcacConverterNodeControlParams：params 旧名清理", () => {
  test("十四个旧名键逐个删掉（其余参数原样留下）", () => {
    const legacy: Params = {
      control_type: "定P",
      controlType: "x",
      acControlType: "y",
      dcControlType: "y2",
      p_set: "1",
      pSet: "2",
      i_set: "3",
      iSet: "4",
      v_set: "5",
      vSet: "6",
      ac_v_set: "7",
      acVSet: "8",
      dc_v_set: "9",
      dcVSet: "10",
      keep: "x"
    };
    const params = paramsOf(run("acdc-converter", legacy));
    for (const key of Object.keys(legacy)) {
      if (key === "keep") continue;
      expect(Object.prototype.hasOwnProperty.call(params, key), key).toBe(false);
    }
    expect(params.keep).toBe("x");
  });

  test("★ 驼峰 acControlType / dcControlType 只被删掉，不参与取值推导", () => {
    const params = paramsOf(run("acdc-converter", { acControlType: "定PH", dcControlType: "定I" }));
    expect(params.ac_control_type).toBe("PQ");
    expect(params.dc_control_type).toBe("V");
  });

  test("两端默认值：交流侧 PQ、直流侧 V", () => {
    expect(paramsOf(run("acdc-converter"))).toMatchObject({ ac_control_type: "PQ", dc_control_type: "V" });
  });

  test("★ 交流侧控制方式归一：定PQ/定PV/定PH/不定 与裸字母别名各落到枚举内", () => {
    const cases: Array<[string, string]> = [
      ["定PQ", "PQ"],
      ["定PV", "PV"],
      ["定PH", "PH"],
      ["Q", "PQ"],
      ["V", "PV"],
      ["0", "NONE"],
      ["不定", "NONE"],
      ["  定PH  ", "PH"]
    ];
    for (const [raw, expected] of cases) {
      expect(paramsOf(run("acdc-converter", { ac_control_type: raw })).ac_control_type, raw).toBe(expected);
    }
  });

  test("★ 直流侧控制方式归一：定P/定V/定I/不定，且 CTRL_P 这类别名也认", () => {
    const cases: Array<[string, string]> = [
      ["定P", "P"],
      ["定V", "V"],
      ["定I", "I"],
      ["不定", "NONE"],
      ["CTRL_P", "P"],
      ["SLACK", "NONE"]
    ];
    for (const [raw, expected] of cases) {
      expect(paramsOf(run("acdc-converter", { dc_control_type: raw })).dc_control_type, raw).toBe(expected);
    }
  });

  test("枚举外的值原样带过（只 trim，不吞）", () => {
    expect(paramsOf(run("acdc-converter", { ac_control_type: "  PVV  " })).ac_control_type).toBe("PVV");
    expect(paramsOf(run("acdc-converter", { dc_control_type: "  DCV  " })).dc_control_type).toBe("DCV");
  });
});

describe("normalizeDcacConverterNodeControlParams：定义串归一", () => {
  test("★ 旧控制类与旧设定值六类定义整条丢弃，其余定义留在原位", () => {
    const result = withDefs("acdc-converter", [
      def("控制方式", { enName: "control_type", typicalValue: "定PQ" }),
      def("有功", { enName: "rated_power" }),
      def("首端设定", { enName: "p_set" }),
      def("i", { enName: "i_set" }),
      def("v", { enName: "v_set" }),
      def("acv", { enName: "ac_v_set" }),
      def("dcv", { enName: "dc_v_set" })
    ]);
    expect(orderOf(result)).toEqual(["rated_power"]);
  });

  test("驼峰写法的控制类定义也丢（acControlType / dcControlType）", () => {
    const result = withDefs("acdc-converter", [def("ac", { enName: "acControlType" }), def("dc", { enName: "dcControlType" }), def("p", { enName: "rated_power" })]);
    expect(orderOf(result)).toEqual(["rated_power"]);
  });

  test("★ 与端点变流器那份不同：不补缺失的两条控制定义，也不插设定值列", () => {
    expect(withDefs("acdc-converter", [])).toBeTruthy();
    expect(orderOf(withDefs("acdc-converter", []))).toEqual([]);
    expect(orderOf(withDefs("acdc-converter", [def("p", { enName: "rated_power" })]))).toEqual(["rated_power"]);
    for (const key of ACAC_SETPOINT_KEYS) {
      expect(orderOf(withDefs("acdc-converter", [def("p", { enName: "rated_power" })])), key).not.toContain(key);
    }
  });

  test("★ 非控制类定义原样带过（不被改写成 stringEnum、不添枚举列）", () => {
    const result = withDefs("acdc-converter", [def("额定有功", { enName: "rated_power", valueType: "float", typicalValue: "5" })]);
    expect(byName(result).rated_power).toEqual({
      cnName: "额定有功",
      enName: "rated_power",
      valueType: "float",
      typicalValue: "5",
      readonly: false
    });
  });

  test("★ 两条控制定义就地补成 stringEnum，枚举值按端分", () => {
    const result = withDefs("acdc-converter", [
      def("交流侧", { enName: "ac_control_type", typicalValue: "定PV" }),
      def("直流侧", { enName: "dc_control_type", typicalValue: "定I" })
    ]);
    const map = byName(result);
    expect(orderOf(result)).toEqual(["ac_control_type", "dc_control_type"]);
    expect(map.ac_control_type).toMatchObject({
      cnName: "交流侧",
      valueType: "stringEnum",
      typicalValue: "PV",
      enumValues: ["PQ", "PV", "PH", "NONE"],
      enumOptions: [{ value: "PQ" }, { value: "PV" }, { value: "PH" }, { value: "NONE" }]
    });
    expect(map.dc_control_type).toMatchObject({
      valueType: "stringEnum",
      typicalValue: "I",
      enumValues: ["P", "V", "I", "NONE"]
    });
  });

  test("★ 同名定义只留第一条（后来者被 seen 挡掉）", () => {
    const result = withDefs("acdc-converter", [
      def("先", { enName: "ac_control_type", typicalValue: "定PV" }),
      def("后", { enName: "ac_control_type", typicalValue: "定PH" })
    ]);
    expect(orderOf(result)).toEqual(["ac_control_type"]);
    expect(byName(result).ac_control_type).toMatchObject({ cnName: "先", typicalValue: "PV" });
  });

  test("★ exportName 指向 control_type 的换成各端本名，自定义名保留", () => {
    const legacy = withDefs("acdc-converter", [
      def("交流侧", { enName: "ac_control_type", typicalValue: "定PV", exportName: "control_type" })
    ]);
    expect(byName(legacy).ac_control_type.exportName).toBe("ac_control_type");

    const custom = withDefs("acdc-converter", [def("交流侧", { enName: "ac_control_type", typicalValue: "定PV", exportName: "ctl" })]);
    expect(byName(custom).ac_control_type.exportName).toBe("ctl");
  });

  test("没有 exportName 的定义不会被塞进 exportName: undefined", () => {
    const result = withDefs("acdc-converter", [def("交流侧", { enName: "ac_control_type", typicalValue: "定PV" })]);
    expect(Object.prototype.hasOwnProperty.call(byName(result).ac_control_type, "exportName")).toBe(false);
  });

  test("坏 JSON / 非数组原样保留（只照样补上两端控制参数）", () => {
    for (const raw of ["{", '{"a":1}', "null"]) {
      const result = run("acdc-converter", { [DEFS]: raw });
      expect(paramsOf(result)[DEFS], raw).toBe(raw);
      expect(paramsOf(result).ac_control_type, raw).toBe("PQ");
      expect(paramsOf(result).dc_control_type, raw).toBe("V");
    }
  });

  test("定义串里混入非对象条目时筛掉，不抛异常", () => {
    const result = withDefs("acdc-converter", [null, "x", def("p", { enName: "rated_power" })] as unknown[]);
    expect(orderOf(result)).toEqual(["rated_power"]);
  });

  test("全非对象条目 → 定义串被清成空数组", () => {
    const result = withDefs("acdc-converter", [null, "x"] as unknown[]);
    expect(paramsOf(result)[DEFS]).toBe("[]");
  });

  test("定义串归一后不再变（幂等）", () => {
    const once = withDefs("acdc-converter", [def("交流侧", { enName: "ac_control_type", typicalValue: "定PV" }), def("控制", { enName: "control_type" })]);
    expect(normalizeDcacConverterNodeControlParams(once)).toBe(once);
  });
});
