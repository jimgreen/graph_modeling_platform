// src/model.ts 的节点参数定义解析与存量枚举值修正：
//   resolveNodeParameterDefinitions   节点的参数表从哪来（自定义元件存定义 / 模板定义 / 两份合并）
//   normalizeKnownLegacyNodeEnumValues  存量数据里的旧枚举写法（中文标签、大小写、别名前缀）归一到枚举内
// 这两个此前零断言。判错不抛异常：参数表少一列、或者「运行」这种中文被原样写进 E 文件。
//
// 覆盖范围：非枚举绑定那条主链。容器视图（is_container = "1" 时按 componentLibrary 追加绑定）
// 与 validateNodeEnumParameters 另有实现，不在本文件。
//
// 20 处变异跑过，18 处转红。两处没转红的原因写在下面，不算本文件覆盖：
// ① 源码等价：resolveNodeParameterDefinitions 末尾那句 normalizeESectionParameterDefinitions
//    去掉后观察不到差别 —— parent（所属模型）由 resolveEffectiveTemplateParameterDefinitions 那一层
//    就补上了，control_type 的枚举化也在同一层完成，自定义 kind 的 section 没有额外改写。
// ② 锚点写不唯一（normalizeDeviceStatusForE 那段在文件里出现两处），没跑成；status / closed_status
//    专用的状态归一这条分支本文件没钉住。
// 过程中补的真缺口：通用枚举的中文标签换值（原先只有 run_stat 走标签，靠的是它的 enName 特判兜的）。
import { describe, expect, test } from "vitest";

import {
  normalizeKnownLegacyNodeEnumValues,
  resolveNodeParameterDefinitions,
  type DeviceParameterDefinition,
  type DeviceTemplate,
  type ModelNode
} from "./model";

type Params = Record<string, string>;

const DEFS = "_customParamDefinitions";
const CUSTOM_KEY = "_customDeviceTemplate";

const def = (enName: string, extra: Partial<DeviceParameterDefinition> = {}): DeviceParameterDefinition =>
  ({
    cnName: enName,
    enName,
    valueType: "string",
    typicalValue: "",
    readonly: false,
    ...extra
  }) as DeviceParameterDefinition;

const tpl = (kind: string, definitions: DeviceParameterDefinition[]): DeviceTemplate =>
  ({
    kind,
    label: kind,
    params: {},
    size: { width: 100, height: 100 },
    parameterDefinitions: definitions
  }) as unknown as DeviceTemplate;

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

const namesOf = (definitions: DeviceParameterDefinition[]): string[] => definitions.map((item) => item.enName);

/** 只带枚举定义的模板：run_stat（中文标签）+ control_type（无标签）。 */
const enumTemplate = (kind = "my-device") =>
  tpl(kind, [
    def("run_stat", { valueType: "stringEnum", typicalValue: "1", enumValues: ["1", "0"], enumOptions: [{ value: "1", label: "运行" }, { value: "0", label: "停运" }] }),
    def("control_type", { valueType: "stringEnum", typicalValue: "PQ", enumValues: ["PQ", "PV", "PH", "NONE"] })
  ]);

const paramsOf = (result: ModelNode): Params => result.params as Params;

describe("resolveNodeParameterDefinitions：参数表从哪来", () => {
  test("★ 普通 kind：模板定义为主，顺序按模板", () => {
    const template = tpl("my-device", [def("rated_power"), def("rated_voltage")]);
    expect(namesOf(resolveNodeParameterDefinitions(node("my-device"), template))).toEqual(["parent", "rated_power", "rated_voltage"]);
    // parent（所属模型）是 normalizeESectionParameterDefinitions 补的容器参数，永远在最前
    expect(resolveNodeParameterDefinitions(node("my-device"), template)[0]).toMatchObject({ enName: "parent", cnName: "所属模型" });
  });

  test("★ 存的定义里多出来的追加在模板之后", () => {
    const template = tpl("my-device", [def("rated_power")]);
    const target = node("my-device", { [DEFS]: JSON.stringify([def("extra_one"), def("extra_two")]) });
    expect(namesOf(resolveNodeParameterDefinitions(target, template))).toEqual(["parent", "rated_power", "extra_one", "extra_two"]);
  });

  test("★ 同名时以**存的**那条为准（用户改过的 typicalValue 不被模板盖回去）", () => {
    const template = tpl("my-device", [def("remark", { typicalValue: "模板上的" })]);
    const target = node("my-device", { [DEFS]: JSON.stringify([def("remark", { typicalValue: "节点上改过的" })]) });
    const resolved = resolveNodeParameterDefinitions(target, template);
    expect(namesOf(resolved)).toEqual(["parent", "remark"]);
    expect(resolved.find((item) => item.enName === "remark")?.typicalValue).toBe("节点上改过的");
  });

  test("★ 自定义元件（有 _customDeviceTemplate 标记）以存的定义为准，模板只做兜底", () => {
    const template = tpl("my-device", [def("from_template")]);
    const withStored = node("my-device", { [CUSTOM_KEY]: "1", [DEFS]: JSON.stringify([def("from_node")]) });
    expect(namesOf(resolveNodeParameterDefinitions(withStored, template))).toEqual(["from_node"]);

    const withoutStored = node("my-device", { [CUSTOM_KEY]: "1" });
    expect(namesOf(resolveNodeParameterDefinitions(withoutStored, template))).toEqual(["parent", "from_template"]);
  });

  test("自定义元件既没存定义又没模板 → 空数组（不抛错）", () => {
    const target = node("my-device", { [CUSTOM_KEY]: "1" });
    expect(resolveNodeParameterDefinitions(target, undefined)).toEqual([]);
  });

  test("存的定义是坏 JSON / 非数组时按没有存定义处理", () => {
    const template = tpl("my-device", [def("from_template")]);
    for (const raw of ["{", "null", '{"a":1}', '"x"']) {
      const target = node("my-device", { [DEFS]: raw });
      expect(namesOf(resolveNodeParameterDefinitions(target, template)), raw).toEqual(["parent", "from_template"]);
    }
  });
});

describe("normalizeKnownLegacyNodeEnumValues：存量枚举值归一", () => {
  test("★ 全部合法时原样返回**同一引用**", () => {
    const input = node("my-device", { run_stat: "1", control_type: "PQ" });
    expect(paramsOf(normalizeKnownLegacyNodeEnumValues(input, enumTemplate()))).toEqual({ run_stat: "1", control_type: "PQ" });
  });

  test("★ 中文标签换成枚举值（run_stat：运行 / 停运）", () => {
    const result = paramsOf(normalizeKnownLegacyNodeEnumValues(node("my-device", { run_stat: " 运行 " }), enumTemplate()));
    expect(result.run_stat).toBe("1");
    expect(paramsOf(normalizeKnownLegacyNodeEnumValues(node("my-device", { run_stat: "停运" }), enumTemplate())).run_stat).toBe("0");
  });

  test("★ 通用枚举：中文标签换成 value（不靠任何 enName 特判）", () => {
    const template = tpl("my-device", [
      def("mode", { valueType: "stringEnum", typicalValue: "A", enumValues: ["A", "B"], enumOptions: [{ value: "A", label: "甲" }, { value: "B", label: "乙" }] })
    ]);
    expect(paramsOf(normalizeKnownLegacyNodeEnumValues(node("my-device", { mode: "甲" }), template)).mode).toBe("A");
    expect(paramsOf(normalizeKnownLegacyNodeEnumValues(node("my-device", { mode: " 乙 " }), template)).mode).toBe("B");
  });

  test("★ 大小写不同归到枚举里那一档", () => {
    const template = tpl("my-device", [def("mode", { valueType: "stringEnum", typicalValue: "A", enumValues: ["A", "B"] })]);
    expect(paramsOf(normalizeKnownLegacyNodeEnumValues(node("my-device", { mode: "b" }), template)).mode).toBe("B");
  });

  test("★ control_type 的中文旧写法（定PQ / 不定）落到枚举内", () => {
    const template = enumTemplate();
    expect(paramsOf(normalizeKnownLegacyNodeEnumValues(node("my-device", { control_type: "定PQ" }), template)).control_type).toBe("PQ");
    // 定V 归一出来是 "V"，而这张枚举表里没有 V（那是端点变流器那张表的事）→ 原样保留
    expect(paramsOf(normalizeKnownLegacyNodeEnumValues(node("my-device", { control_type: "定V" }), template)).control_type).toBe("定V");
    expect(paramsOf(normalizeKnownLegacyNodeEnumValues(node("my-device", { control_type: "不定" }), template)).control_type).toBe("NONE");
  });

  test("★ 氢能耦合段：定功率类旧写法落到 P（该段枚举里只有 P / FLOW）", () => {
    const template = tpl("ac-electrolyzer", [def("control_type", { valueType: "stringEnum", typicalValue: "FLOW" })]);
    const result = paramsOf(normalizeKnownLegacyNodeEnumValues(node("ac-electrolyzer", { control_type: "定PQ" }), template));
    expect(result.control_type).toBe("P");
  });

  test("★ 枚举里没有的旧值原样保留（不吞、不改成第一个值）", () => {
    const template = enumTemplate();
    expect(paramsOf(normalizeKnownLegacyNodeEnumValues(node("my-device", { run_stat: "9" }), template)).run_stat).toBe("9");
    expect(paramsOf(normalizeKnownLegacyNodeEnumValues(node("my-device", { control_type: "XYZ" }), template)).control_type).toBe("XYZ");
  });

  test("★ 只有要改的那几个键被写回，其余键与节点其余字段原样带过", () => {
    const input = node("my-device", { run_stat: "运行", control_type: "PQ", keep: "x" });
    const result = normalizeKnownLegacyNodeEnumValues(input, enumTemplate());
    expect(result).not.toBe(input);
    expect(paramsOf(result)).toEqual({ run_stat: "1", control_type: "PQ", keep: "x" });
    expect(result.id).toBe(input.id);
    expect(result.terminals).toBe(input.terminals);
  });

  test("入参节点与它的 params 都不被就地改", () => {
    const params: Params = { run_stat: "运行" };
    const input = node("my-device", params);
    normalizeKnownLegacyNodeEnumValues(input, enumTemplate());
    expect(params).toEqual({ run_stat: "运行" });
  });

  test("★ 空白值不参与匹配，但 run_stat 会落回它的典型值（运行 = 1）", () => {
    const result = normalizeKnownLegacyNodeEnumValues(node("my-device", { run_stat: "   " }), enumTemplate());
    expect(paramsOf(result).run_stat).toBe("1");
  });

  test("没有枚举参数的行原样返回同一引用", () => {
    const template = tpl("my-device", [def("rated_power", { valueType: "float", typicalValue: "1" })]);
    const input = node("my-device", { rated_power: "5" });
    expect(normalizeKnownLegacyNodeEnumValues(input, template)).toBe(input);
  });

  test("非枚举参数（valueType 不是 stringEnum）原样不动", () => {
    const template = tpl("my-device", [def("rated_power", { valueType: "float", typicalValue: "1" })]);
    const input = node("my-device", { rated_power: "定PQ" });
    expect(normalizeKnownLegacyNodeEnumValues(input, template)).toBe(input);
  });
});
