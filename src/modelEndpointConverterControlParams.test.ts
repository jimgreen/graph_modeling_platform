// src/model.ts 的 normalizeEndpointConverterNodeControlParams 及其定义串助手：
// 交直流变流器（ACACConverter / DCDCConverter）的控制方式参数从「一个 control_type」
// 迁到「首端 i_control_type + 末端 j_control_type」两端形态，并补齐各端设定值列。
// 此前零断言。判错不抛异常：只是导出 E 文件时控制方式列取错端、或设定值列整片缺失。
//
// 36 处变异逐条跑过，全部转红。变异过程中修掉五处自己写的**无效变异**（改不动行为的那种，
// 报 NOT-CAUGHT 是我的错不是源码的）：把两个赋值块调换顺序（各写各的键，顺序无关）、
// 在 Record 字面量前面再插一个同名键（后者覆盖前者，等于没改）、漏断言 control_type 被删、
// 只给 acac 补了「已规范那条排在前面」的 rank 用例（那条原本被「后面的赢」掩盖住），
// 以及旧对照表的用例值全是大写、连 `.toUpperCase()` 去掉也测不出来 —— 后者补了小写旧名用例。
import { describe, expect, test } from "vitest";

import { normalizeEndpointConverterNodeControlParams } from "./model";
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

const run = (kind: string, params: Params = {}): ModelNode => normalizeEndpointConverterNodeControlParams(node(kind, params));
const paramsOf = (result: ModelNode): Params => result.params as Params;

const definitionsOf = (result: ModelNode): Record<string, unknown>[] =>
  JSON.parse(paramsOf(result)[DEFS] ?? "null") as Record<string, unknown>[];

const withDefs = (kind: string, definitions: unknown[]): ModelNode => run(kind, { [DEFS]: JSON.stringify(definitions) });
const orderOf = (result: ModelNode): string[] => definitionsOf(result).map((definition) => String(definition.enName));
const typicalOf = (result: ModelNode): Record<string, string> =>
  Object.fromEntries(definitionsOf(result).map((definition) => [String(definition.enName), String(definition.typicalValue)]));

// 交流侧变流器八个设定值列（多一对无功），直流侧六个
const ACAC_SETPOINTS = [
  "i_p_set", "j_p_set",
  "i_q_set", "j_q_set",
  "i_i_set", "j_i_set",
  "i_v_set", "j_v_set"
];
const DCDC_SETPOINTS = ["i_p_set", "j_p_set", "i_i_set", "j_i_set", "i_v_set", "j_v_set"];

describe("normalizeEndpointConverterNodeControlParams：适用范围", () => {
  test("★ 非变流器 kind 原样返回**同一引用**", () => {
    for (const kind of ["ac-line", "ac-source", "dcac-converter", "heat-source"]) {
      const input = node(kind, { p_set: "1" });
      expect(normalizeEndpointConverterNodeControlParams(input), kind).toBe(input);
    }
  });

  test("已是规范形态的节点原样返回同一引用（幂等）", () => {
    const once = run("acac-converter");
    expect(normalizeEndpointConverterNodeControlParams(once)).toBe(once);
  });

  test("入参不被改（迁移走副本）", () => {
    const original = { control_type: "定PQ" };
    normalizeEndpointConverterNodeControlParams(node("acac-converter", original));
    expect(original).toEqual({ control_type: "定PQ" });
  });
});

describe("normalizeEndpointConverterNodeControlParams：params 里的旧名清理", () => {
  test("十四个旧名键逐个删掉（含驼峰与设定值）", () => {
    const legacy: Params = {
      control_type: "定PQ",
      controlType: "x",
      source_control_type: "y",
      sourceControlType: "y2",
      target_control_type: "z",
      targetControlType: "z2",
      iControlType: "a",
      jControlType: "b",
      p_set: "1",
      pSet: "2",
      i_set: "3",
      iSet: "4",
      v_set: "5",
      vSet: "6",
      keep: "x"
    };
    const params = paramsOf(run("acac-converter", legacy));
    for (const key of Object.keys(legacy)) {
      if (key === "keep") continue;
      expect(Object.prototype.hasOwnProperty.call(params, key), key).toBe(false);
    }
    expect(params.keep).toBe("x");
  });

  test("★ 驼峰 iControlType / jControlType 读得到（deviceParamValue 兼容驼峰）并归一成本名", () => {
    const params = paramsOf(run("acac-converter", { iControlType: "定PV", jControlType: "PH" }));
    expect(params.i_control_type).toBe("PV");
    expect(params.j_control_type).toBe("PH");
  });

  test("两端默认值不同：交流侧 PQ/PQ，直流侧 P/NONE", () => {
    expect(paramsOf(run("acac-converter"))).toMatchObject({ i_control_type: "PQ", j_control_type: "PQ" });
    expect(paramsOf(run("dcdc-converter"))).toMatchObject({ i_control_type: "P", j_control_type: "NONE" });
  });
});

describe("normalizeEndpointConverterNodeControlParams：定义串归一", () => {
  test("★ 非控制类定义留在原位，控制类被就地替换成 i / j 两条", () => {
    const result = withDefs("acac-converter", [def("有功", { enName: "rated_power" }), def("控制方式", { enName: "control_type", typicalValue: "定PQ" })]);
    expect(orderOf(result)).toEqual(["rated_power", "i_control_type", "j_control_type", ...ACAC_SETPOINTS]);
  });

  test("已规范的 i / j 两条各自保留自己的值", () => {
    const result = withDefs("acac-converter", [def("首", { enName: "i_control_type", typicalValue: "PQ" }), def("末", { enName: "j_control_type", typicalValue: "PV" })]);
    expect(typicalOf(result)).toMatchObject({ i_control_type: "PQ", j_control_type: "PV" });
  });

  test("source / target 两条映射成 i / j", () => {
    const result = withDefs("acac-converter", [def("首", { enName: "source_control_type", typicalValue: "PQ" }), def("末", { enName: "target_control_type", typicalValue: "PV" })]);
    expect(typicalOf(result)).toMatchObject({ i_control_type: "PQ", j_control_type: "PV" });
  });

  test("★ 只有一条时另一端取该条（值沿用，名字与导出名各自成 i / j）", () => {
    const result = withDefs("acac-converter", [def("首", { enName: "source_control_type", typicalValue: "PH" })]);
    const byName = Object.fromEntries(definitionsOf(result).map((definition) => [String(definition.enName), definition]));
    expect(byName.i_control_type).toMatchObject({ cnName: "首", typicalValue: "PH", exportName: "i_control_type" });
    expect(byName.j_control_type).toMatchObject({ cnName: "首", typicalValue: "PQ", exportName: "j_control_type" });
  });

  test("★ 已规范的那条压过旧名那条（rank 3 > rank 2）", () => {
    const result = withDefs("acac-converter", [def("控制", { enName: "control_type", typicalValue: "定PQ" }), def("首", { enName: "i_control_type", typicalValue: "PV" })]);
    expect(typicalOf(result)).toMatchObject({ i_control_type: "PV", j_control_type: "PQ" });
  });

  test("★ 已规范那条排在前面时，旧名那条同样压不过它（顺序无关，只看 rank）", () => {
    const result = withDefs("acac-converter", [def("首", { enName: "i_control_type", typicalValue: "PH" }), def("控制", { enName: "control_type", typicalValue: "定PQ" })]);
    expect(typicalOf(result)).toMatchObject({ i_control_type: "PH", j_control_type: "PQ" });
  });

  test("★ 旧 control_type 两端都从它派生（不是都回落默认 PQ）", () => {
    const result = withDefs("acac-converter", [def("控制", { enName: "control_type", typicalValue: "PVV" })]);
    expect(typicalOf(result)).toMatchObject({ i_control_type: "PV", j_control_type: "PV" });
  });

  test("旧对照表只认大写：小写旧名同样命中", () => {
    const result = withDefs("acac-converter", [def("控制", { enName: "control_type", typicalValue: "pqv" })]);
    expect(typicalOf(result)).toMatchObject({ i_control_type: "PQ", j_control_type: "PV" });
  });

  test("查不到旧对照表的旧名（定PQV 这类复合中文名）两端都回落默认 PQ", () => {
    // 旧对照表按 normalizeControlTypeForE(...).toUpperCase() 查表，只认 PQQ / PVQ / PQV / PVV。
    // 带「定」前缀的复合名查不到，整条原样传出，两端便都取默认值。
    const result = withDefs("acac-converter", [def("控制", { enName: "control_type", typicalValue: "定PQV" })]);
    expect(typicalOf(result)).toMatchObject({ i_control_type: "PQ", j_control_type: "PQ" });
  });

  test("★ 同级候选撞车时**后出现的赢**（rank 用 >= 比较）", () => {
    const result = withDefs("acac-converter", [def("先", { enName: "i_control_type", typicalValue: "PQ" }), def("后", { enName: "i_control_type", typicalValue: "PV" })]);
    expect(typicalOf(result)).toMatchObject({ i_control_type: "PV", j_control_type: "PQ" });
  });

  test("驼峰 enName 同样认得", () => {
    const result = withDefs("acac-converter", [def("控制", { enName: "controlType", typicalValue: "定PQ" })]);
    expect(typicalOf(result)).toMatchObject({ i_control_type: "PQ", j_control_type: "PQ" });
  });

  test("★ 自定义 exportName 保留，指向旧控制名的换成各端本名", () => {
    const custom = withDefs("acac-converter", [def("控制", { enName: "control_type", typicalValue: "定PQ", exportName: "ctl" })]);
    const customByName = Object.fromEntries(definitionsOf(custom).map((definition) => [String(definition.enName), definition]));
    expect(customByName.i_control_type.exportName).toBe("ctl");
    expect(customByName.j_control_type.exportName).toBe("ctl");

    const legacy = withDefs("acac-converter", [def("控制", { enName: "control_type", typicalValue: "定PQ", exportName: "control_type" })]);
    const legacyByName = Object.fromEntries(definitionsOf(legacy).map((definition) => [String(definition.enName), definition]));
    expect(legacyByName.i_control_type.exportName).toBe("i_control_type");
    expect(legacyByName.j_control_type.exportName).toBe("j_control_type");
  });

  test("p_set / i_set / v_set 三条旧设定值被丢掉，其余非控制定义留着", () => {
    const result = withDefs("acac-converter", [def("旧", { enName: "p_set" }), def("旧", { enName: "i_set" }), def("旧", { enName: "v_set" }), def("有功", { enName: "rated_power" })]);
    expect(orderOf(result)).toEqual(["rated_power", ...ACAC_SETPOINTS]);
  });

  test("已有的设定值列不重复补", () => {
    const result = withDefs("acac-converter", [def("首端有功设定值", { enName: "i_p_set" })]);
    expect(orderOf(result)).toEqual(ACAC_SETPOINTS);
    expect(orderOf(result).filter((name) => name === "i_p_set")).toHaveLength(1);
  });

  test("★ 空定义串 / 全是非对象条目 → 补出整份设定值列表（交流八列、直流六列）", () => {
    expect(orderOf(withDefs("acac-converter", []))).toEqual(ACAC_SETPOINTS);
    expect(orderOf(withDefs("acac-converter", [null, "x"] as unknown[]))).toEqual(ACAC_SETPOINTS);
    expect(orderOf(withDefs("dcdc-converter", []))).toEqual(DCDC_SETPOINTS);
  });

  test("run_stat 之前的控制类定义被挪到设定值之后（设定值插在 run_stat 前）", () => {
    const result = withDefs("acac-converter", [def("运行", { enName: "run_stat" }), def("控制", { enName: "control_type", typicalValue: "定PV" })]);
    expect(orderOf(result)).toEqual([...ACAC_SETPOINTS, "run_stat", "i_control_type", "j_control_type"]);
  });

  test("坏 JSON / 非数组原样保留（只照样补上两端控制参数）", () => {
    for (const raw of ["{", '{"a":1}']) {
      const result = run("acac-converter", { [DEFS]: raw });
      expect(paramsOf(result)[DEFS], raw).toBe(raw);
      expect(paramsOf(result).i_control_type).toBe("PQ");
    }
  });

  test("定义串归一后不再变（幂等）", () => {
    const once = withDefs("acac-converter", [def("控制", { enName: "control_type", typicalValue: "定PQ" })]);
    expect(normalizeEndpointConverterNodeControlParams(once)).toBe(once);
  });

  test("控制类定义补成 stringEnum，枚举值按 section 分", () => {
    const acac = Object.fromEntries(definitionsOf(withDefs("acac-converter", [def("控制", { enName: "control_type", typicalValue: "定PQ" })]))
      .map((definition) => [String(definition.enName), definition]));
    expect(acac.i_control_type).toMatchObject({ valueType: "stringEnum", enumValues: ["PQ", "PV", "PH", "NONE"] });

    const dcdc = Object.fromEntries(definitionsOf(withDefs("dcdc-converter", [def("控制", { enName: "control_type", typicalValue: "定V" })]))
      .map((definition) => [String(definition.enName), definition]));
    expect(dcdc.i_control_type).toMatchObject({ valueType: "stringEnum", enumValues: ["P", "V", "I", "NONE"], typicalValue: "V" });
    expect(dcdc.j_control_type).toMatchObject({ typicalValue: "NONE" });
  });
});
