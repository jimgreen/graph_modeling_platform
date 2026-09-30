// src/model.ts 的 materializeDeviceMeasurementDefinitionFields：把量测定义里的 associatedField
// 反推成设备参数定义（BASE_DEVICE_LIBRARY 归一化时跑一次）。此前零断言。
// 判错不抛异常：派生元件（风电/光伏/储能）参数表少一列或多一列，界面上看不出来，导出时才暴露。
//
// 28 处变异逐条跑过，25 处转红。3 处 NOT-CAUGHT 经论证为**源码等价**，不算本文件覆盖了它们：
//   1. `position ?? "device"` → `position ?? ""`：默认值只拿去和 `/^t(\d+)$/` 比，两者都不匹配，
//      一律落到设备 kind，写哪个字面量都一样。
//   2. 收集阶段的大小写去重改成敏感比较：多收进来的成对小写名，在追加阶段会被 `known` 按小写
//      再挡一次，赢的始终是第一个，结果相同。
//   3. 追加后不 `known.add(...)`：同上，`additionsByKind` 收的时候已按小写去重，追加项之间
//      不会有小写重名，这次登记改不了任何结果。
import { describe, expect, test } from "vitest";

import { materializeDeviceMeasurementDefinitionFields } from "./model";
import type { DeviceTemplate } from "./model";

const tpl = (kind: string, extra: Record<string, unknown> = {}): DeviceTemplate =>
  ({ kind, label: kind, params: {}, ...extra }) as unknown as DeviceTemplate;

const md = (associatedField: string, position?: string) => ({
  measurementTypeId: "measurement",
  associatedField,
  ...(position ? { position } : {})
});

const pd = (enName: string) => ({
  cnName: enName.toUpperCase(),
  enName,
  valueType: "float",
  typicalValue: "0",
  readonly: false,
  exportEnabled: true
});

const fieldsOf = (template: DeviceTemplate): string[] =>
  (template.parameterDefinitions ?? []).map((definition) => String(definition.enName));

const run = (templates: DeviceTemplate[]): DeviceTemplate[] => materializeDeviceMeasurementDefinitionFields(templates);

// 派生元件：baseComponentLibrary 走 ACGenerator，才能被 baseDeviceKind("ac-source") 那个分支认成基座
const derivedTpl = (kind: string, extra: Record<string, unknown> = {}): DeviceTemplate =>
  tpl(kind, {
    params: { component_type: "WIND", derived_from_component_type: "ACGenerator" },
    derivedFromComponentLibrary: "ACGenerator",
    derivedComponentLibrary: "WIND",
    ...extra
  });

describe("materializeDeviceMeasurementDefinitionFields：设备位量测字段", () => {
  test("设备位（不写 position / 显式写 device）的字段追加为本设备参数", () => {
    const result = run([tpl("ac-switch", { measurementDefinitions: [md("closed_status"), md("u")] })]);
    expect(fieldsOf(result[0])).toEqual(["closed_status", "u"]);
  });

  test("★ 同 kind 的多个模板共享同一批字段（其中一个量测了，其余也补上）", () => {
    const result = run([tpl("ac-source", { measurementDefinitions: [md("u")] }), tpl("ac-source", { label: "另一个" })]);
    expect(fieldsOf(result[0])).toEqual(["u"]);
    expect(fieldsOf(result[1])).toEqual(["u"]);
  });

  test("★ 没有可追加字段的模板原样返回**同一引用**（纯空白字段在收集阶段就被丢，不留痕）", () => {
    for (const raw of ["", "   "]) {
      const template = tpl("ac-bus", { measurementDefinitions: [md(raw)] });
      expect(run([template])[0], JSON.stringify(raw)).toBe(template);
    }
  });

  test("空 / 纯空白的 associatedField 不产生字段", () => {
    expect(fieldsOf(run([tpl("ac-bus", { measurementDefinitions: [md(""), md("   ")] })])[0])).toEqual([]);
  });

  test("已声明的字段不重复追加，且按大小写不敏感判重", () => {
    const result = run([tpl("ac-line", { measurementDefinitions: [md("P"), md("p"), md("q")], parameterDefinitions: [pd("Q")] })]);
    // 声明过的 q（声明写作 Q）跳过；P / p 大小写去重后保留**首次出现**的写法 P
    expect(fieldsOf(result[0])).toEqual(["Q", "P"]);
  });

  test("★ 声明写小写、量测写大写也算已声明（判重不敏感方向一致）", () => {
    const result = run([tpl("ac-line", { measurementDefinitions: [md("Q")], parameterDefinitions: [pd("q")] })]);
    expect(fieldsOf(result[0])).toEqual(["q"]);
  });
});

describe("materializeDeviceMeasurementDefinitionFields：端子位字段落到关联设备", () => {
  test("t1 / t2 分别落到对应端子的关联设备上", () => {
    const result = run([
      tpl("hydrogen-storage", { terminalAssociations: ["h2-source", "ac-load"], measurementDefinitions: [md("p", "t1"), md("u", "t2")] }),
      tpl("ac-source"),
      tpl("ac-load")
    ]);
    expect(fieldsOf(result[1])).toEqual([]);
    expect(fieldsOf(result[2])).toEqual(["u"]);
  });

  test("★ 关联类型不认识 / 端子下标越界 → 该字段丢弃，不回落给本设备", () => {
    const result = run([
      tpl("ac-bus", { terminalAssociations: ["ac-generator"], measurementDefinitions: [md("u", "t1"), md("i", "t9"), md("p", "t0")] }),
      tpl("ac-source")
    ]);
    // t1 正常落到 ac-source；t9 / t0 取不到关联（t0 越界到 -1）→ 丢弃，容器自己也不该捡到
    expect(fieldsOf(result[0])).toEqual([]);
    expect(fieldsOf(result[1])).toEqual(["u"]);
  });

  test("★ 关联值不是映射表里的键（写成 kind 名 ac-source 而非 ac-generator）时字段丢弃", () => {
    const result = run([
      tpl("ac-bus", { terminalAssociations: ["ac-source"], measurementDefinitions: [md("u", "t1")] }),
      tpl("ac-source")
    ]);
    expect(fieldsOf(result[0])).toEqual([]);
    expect(fieldsOf(result[1])).toEqual([]);
  });

  test("★ position 前后空白先 trim 再判（' t1 ' 仍算第一个端子）", () => {
    const result = run([
      tpl("ac-bus", { terminalAssociations: ["ac-generator"], measurementDefinitions: [md("u", " t1 ")] }),
      tpl("ac-source")
    ]);
    expect(fieldsOf(result[0])).toEqual([]);
    expect(fieldsOf(result[1])).toEqual(["u"]);
  });

  test("★ position 不匹配 /^t\\d+$/ 的写法（大写 T、内部空格、非首尾的 t1）**回落给本设备**", () => {
    const result = run([
      tpl("ac-bus", {
        terminalAssociations: ["ac-generator"],
        measurementDefinitions: [md("u", " T1 "), md("p", "t 1"), md("i", "xx t1"), md("q", "t1/t2")]
      }),
      tpl("ac-source")
    ]);
    // 正则首尾锚定且大小写敏感：四种写法都不算端子位，全归容器自己
    expect(fieldsOf(result[0])).toEqual(["u", "p", "i", "q"]);
    expect(fieldsOf(result[1])).toEqual([]);
  });

  test("★ 取不到关联的字段不会漏到 kind 为空的模板上（`!targetKind` 那一拦）", () => {
    const result = run([
      tpl("ac-bus", { terminalAssociations: ["ac-generator"], measurementDefinitions: [md("u", "t9")] }),
      tpl("")
    ]);
    expect(fieldsOf(result[1])).toEqual([]);
  });
});

describe("materializeDeviceMeasurementDefinitionFields：派生元件继承基座", () => {
  test("基座已声明该参数 → 派生不重复追加", () => {
    const result = run([
      tpl("ac-source", { parameterDefinitions: [pd("rated_capacity")] }),
      derivedTpl("wind-a", { measurementDefinitions: [md("rated_capacity")] })
    ]);
    expect(fieldsOf(result[0])).toEqual(["rated_capacity"]);
    expect(fieldsOf(result[1])).toEqual([]);
  });

  test("★ 基座没声明但自己量测了该字段 → 派生继承基座那批追加项，仍不追加", () => {
    const result = run([
      tpl("ac-source", { measurementDefinitions: [md("rated_capacity")] }),
      derivedTpl("wind-a", { measurementDefinitions: [md("rated_capacity")] })
    ]);
    expect(fieldsOf(result[0])).toEqual(["rated_capacity"]);
    expect(fieldsOf(result[1])).toEqual([]);
  });

  test("找不到基座时派生照常追加", () => {
    const result = run([derivedTpl("wind-a", { measurementDefinitions: [md("rated_capacity")] })]);
    expect(fieldsOf(result[0])).toEqual(["rated_capacity"]);
  });

  test("非派生元件不看继承那套（自己没声明就追加）", () => {
    const result = run([
      tpl("ac-source", { parameterDefinitions: [pd("rated_capacity")] }),
      tpl("wind-b", { measurementDefinitions: [md("rated_capacity")] })
    ]);
    expect(fieldsOf(result[1])).toEqual(["rated_capacity"]);
  });

  test("★ 显式标了非派生的模板不走继承（isDerivedComponentLibrary: false）", () => {
    const result = run([
      tpl("ac-source", { parameterDefinitions: [pd("rated_capacity")] }),
      derivedTpl("wind-c", { isDerivedComponentLibrary: false, measurementDefinitions: [md("rated_capacity")] })
    ]);
    expect(fieldsOf(result[1])).toEqual(["rated_capacity"]);
  });

  test("★ 基座库名大小写不同仍能匹配上", () => {
    const result = run([
      tpl("ac-source", { parameterDefinitions: [pd("rated_capacity")] }),
      derivedTpl("wind-d", {
        params: { component_type: "WIND", derived_from_component_type: "acgenerator" },
        derivedFromComponentLibrary: "acgenerator",
        measurementDefinitions: [md("rated_capacity")]
      })
    ]);
    expect(fieldsOf(result[1])).toEqual([]);
  });

  test("★ 基座声明的字段名大小写不同也算已继承", () => {
    const result = run([
      tpl("ac-source", { parameterDefinitions: [pd("Rated_Capacity")] }),
      derivedTpl("wind-e", { measurementDefinitions: [md("rated_capacity")] })
    ]);
    expect(fieldsOf(result[1])).toEqual([]);
  });

  test("★ 排在更前面的派生件不会被选成基座", () => {
    const other = derivedTpl("solar-a", {
      params: { component_type: "ACGenerator", derived_from_component_type: "ACGenerator", derived_component_type: "SOLAR" },
      derivedFromComponentLibrary: "ACGenerator",
      derivedComponentLibrary: "SOLAR",
      measurementDefinitions: [md("wind_speed")]
    });
    const result = run([
      other,
      tpl("ac-source", { parameterDefinitions: [pd("rated_capacity")] }),
      derivedTpl("wind-f", { measurementDefinitions: [md("rated_capacity")] })
    ]);
    expect(fieldsOf(result[0])).toEqual(["wind_speed"]);
    // 基座是 ac-source（声明过 rated_capacity），不是 solar-a
    expect(fieldsOf(result[2])).toEqual([]);
  });
});
