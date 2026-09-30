// src/model.ts 的 normalizeHydrogenCouplingBodyParams：电解槽 / 燃料电池的「本体」节点上
// 不该留电气运行字段（有功、无功、电压、流量、额定值……），这些归端子和量测管。
// 此前零断言。判错不抛异常：只是参数表多出几列看着莫名其妙的值，导出 E 文件时才被当成设备参数写出去。
//
// 15 处变异逐条跑过，14 处转红。1 处 NOT-CAUGHT 经论证为**源码等价**，不算本文件覆盖了它：
// 每次命中都重新复制一份 params：前面几个字段此时已从副本上删掉，再复制的内容与已有副本完全一致，
// 差别只在分配次数，返回值与「是否算改过」的判据都不受影响。
import { describe, expect, test } from "vitest";

import { normalizeHydrogenCouplingBodyParams } from "./model";
import type { DeviceTemplate, ModelNode } from "./model";

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

const tpl = (kind: string): DeviceTemplate => ({ kind, label: kind, params: {} }) as unknown as DeviceTemplate;

const paramsOf = (result: ModelNode): Params => result.params as Params;

const COUPLING_BODY_KINDS = ["ac-electrolyzer", "dc-electrolyzer", "ac-fuel-cell", "dc-fuel-cell"];

const RUNTIME_FIELDS = [
  "rated_voltage",
  "rated_power",
  "rated_capacity",
  "hydrogen_flow",
  "vbase",
  "p",
  "q",
  "u",
  "voltage",
  "flow"
];

describe("normalizeHydrogenCouplingBodyParams：适用范围", () => {
  test("★ 非耦合体 kind 原样返回**同一引用**", () => {
    for (const kind of ["hydrogen-storage", "ac-line", "heat-source", "hydrogen-source"]) {
      const input = node(kind, { p: "1" });
      expect(normalizeHydrogenCouplingBodyParams(input), kind).toBe(input);
    }
  });

  test("四种耦合体 kind 都参与清理", () => {
    for (const kind of COUPLING_BODY_KINDS) {
      expect(paramsOf(normalizeHydrogenCouplingBodyParams(node(kind, { p: "1" }))), kind).toEqual({});
    }
  });

  test("带 -vertical 后缀的变体按 baseDeviceKind 归一后同样命中", () => {
    expect(paramsOf(normalizeHydrogenCouplingBodyParams(node("ac-electrolyzer-vertical", { vbase: "1" })))).toEqual({});
  });

  test("没有待清字段时原样返回同一引用", () => {
    const input = node("dc-electrolyzer", { keep: "x" });
    expect(normalizeHydrogenCouplingBodyParams(input)).toBe(input);
  });
});

describe("normalizeHydrogenCouplingBodyParams：清理哪些字段", () => {
  test("十个运行字段逐个被删，其余参数原样带过", () => {
    const params: Params = { keep: "x" };
    for (const field of RUNTIME_FIELDS) params[field] = "1";
    expect(paramsOf(normalizeHydrogenCouplingBodyParams(node("ac-electrolyzer", params)))).toEqual({ keep: "x" });
  });

  test("值是空串 / 0 也照删（看的是键在不在，不是值）", () => {
    expect(paramsOf(normalizeHydrogenCouplingBodyParams(node("ac-electrolyzer", { p: "", q: "0" })))).toEqual({});
  });

  test("★ 驼峰键与下划线私有键都不在清理名单里", () => {
    const input = node("ac-electrolyzer", { ratedVoltage: "10", P: "1", _p: "1" });
    const result = normalizeHydrogenCouplingBodyParams(input);
    expect(paramsOf(result)).toEqual({ ratedVoltage: "10", P: "1", _p: "1" });
    expect(result).toBe(input);
  });

  test("入参不被改（清理走副本）", () => {
    const original = { p: "1", keep: "x" };
    normalizeHydrogenCouplingBodyParams(node("ac-electrolyzer", original));
    expect(original).toEqual({ p: "1", keep: "x" });
  });
});

describe("normalizeHydrogenCouplingBodyParams：模板 kind 优先", () => {
  test("模板给的是耦合体就按模板判（节点 kind 无关）", () => {
    expect(paramsOf(normalizeHydrogenCouplingBodyParams(node("custom-x", { p: "1" }), tpl("ac-electrolyzer")))).toEqual({});
  });

  test("模板给的不是耦合体就整体不清理（哪怕节点 kind 是）", () => {
    const input = node("ac-electrolyzer", { p: "1" });
    const result = normalizeHydrogenCouplingBodyParams(input, tpl("hydrogen-storage"));
    expect(paramsOf(result)).toEqual({ p: "1" });
    expect(result).toBe(input);
  });

  test("不给模板时回落到节点 kind", () => {
    expect(paramsOf(normalizeHydrogenCouplingBodyParams(node("ac-fuel-cell", { u: "1" })))).toEqual({});
  });
});
