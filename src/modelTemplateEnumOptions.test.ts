// src/model.ts 的模板枚举助手簇：normalizeTemplateEnumOptions 及其三个导出包装 ——
// enumValuesForParameterDefinition（枚举列）、enumOptionLabelsForParameterDefinition（中文表头）、
// enumExportValueForDefinition（导出取值），外加 isEnumParameterDefinition /
// enumSelectOptionsWithCurrentValue / invalidEnumOptionLabel。
// 自定义元件编辑器的枚举列与 E 文件导出的取值都走这里。此前这三个包装零断言。
// 判错不抛异常：只是参数表枚举列少几项、或导出时把中文标签当成了取值写进 E 文件。
//
// 42 处变异逐条跑过，41 处转红。记录三件不好看但必须写下来的事：
// ① 补了四处真缺口 —— 空 enumOptions 数组、enName 带空白、enumValues 非数组、对象项 value
//    带空白，原先都没测到；② 一处**无效变异**是我自己的问题：只去掉
//    DEFAULT_TEMPLATE_ENUM_OPTIONS 后那次 `.trim()`，会被紧接着的
//    DEFAULT_TEMPLATE_ENUM_VALUES 同名查找完全遮住（两处同时去掉才转红，已单独验过）；
// ③ 一处**源码等价**：`normalizeTemplateEnumValues` 内部的去重与 trim 全被
//    `addOption` 自己的 seen 集合 + `normalizeTemplateEnumOption` 对空项返回 null 遮住，
//    改不动可观测行为，不算本文件覆盖。
// 另：DEFAULT_TEMPLATE_ENUM_VALUES 与 DEFAULT_TEMPLATE_ENUM_OPTIONS 键集完全相同、
// 两处查找都先 trim，故第二处查找今天恒不生效；normalizeTemplateEnumValues 的 typicalValue
// 形参在唯一调用点恒为 ""。这两段是死分支，本文件覆盖不到，也**不删**（留作两表键集分叉时的兜底）。
import { describe, expect, test } from "vitest";

import {
  enumExportValueForDefinition,
  enumOptionLabelsForParameterDefinition,
  enumSelectOptionsWithCurrentValue,
  enumValuesForParameterDefinition,
  invalidEnumOptionLabel,
  isEnumParameterDefinition
} from "./model";
import type { DeviceParameterDefinition } from "./model";

const def = (extra: Partial<DeviceParameterDefinition> = {}): DeviceParameterDefinition =>
  ({
    cnName: "测试",
    enName: "test_param",
    valueType: "stringEnum",
    typicalValue: "",
    readonly: false,
    ...extra
  }) as DeviceParameterDefinition;

const valuesOf = (definition: DeviceParameterDefinition): string[] => enumValuesForParameterDefinition(definition);
const labelsOf = (definition: DeviceParameterDefinition): Record<string, string> => enumOptionLabelsForParameterDefinition(definition);

describe("枚举判定 isEnumParameterDefinition", () => {
  test("三种枚举型 valueType 都算枚举", () => {
    for (const valueType of ["stringEnum", "numberEnum", "enum"]) {
      expect(isEnumParameterDefinition({ valueType: valueType as never }), valueType).toBe(true);
    }
  });

  test("非枚举 valueType 不算（含未知的自定义类型名）", () => {
    for (const valueType of ["string", "number", "float", "integer", "boolean", "", undefined]) {
      expect(isEnumParameterDefinition({ valueType: valueType as never }), String(valueType)).toBe(false);
    }
  });
});

describe("enumValuesForParameterDefinition：取值来源优先级", () => {
  test("非枚举定义返回空数组（不是 undefined）", () => {
    expect(valuesOf(def({ valueType: "float", enumValues: ["1", "2"] }))).toEqual([]);
  });

  test("enumOptions 有值时以它为准", () => {
    expect(valuesOf(def({ enumOptions: [{ value: "a" }, { value: "b" }] }))).toEqual(["a", "b"]);
  });

  test("★ 没有 enumOptions 时退回该参数名自带的默认枚举表", () => {
    expect(valuesOf(def({ enName: "status" }))).toEqual(["1", "0"]);
    expect(valuesOf(def({ enName: "closed_status" }))).toEqual(["1", "0"]);
    expect(valuesOf(def({ enName: "run_stat" }))).toEqual(["1", "0"]);
    expect(valuesOf(def({ enName: "regable" }))).toEqual(["0", "1"]);
  });

  test("★ 入参 enumValues 抢不过该参数名自带的默认表（顺序：enumOptions → 默认表 → enumValues）", () => {
    expect(valuesOf(def({ enName: "status", enumValues: ["9"] }))).toEqual(["1", "0"]);
    expect(valuesOf(def({ enName: "test_param", enumValues: ["9"] }))).toEqual(["9"]);
  });

  test("什么都没有时返回空数组", () => {
    expect(valuesOf(def())).toEqual([]);
  });

  test("★ enumOptions 与 enumValues 是**并集**：enumOptions 在前，enumValues 补在后面", () => {
    expect(valuesOf(def({ enumOptions: [{ value: "a" }], enumValues: ["b", "c"] }))).toEqual(["a", "b", "c"]);
  });

  test("★ 并集时重复项只留第一条（先出现的 enumOptions 赢）", () => {
    const values = valuesOf(def({
      enumOptions: [{ value: "a", label: "甲" }, { value: "b", label: "乙" }],
      enumValues: ["b", "a", "c"]
    }));
    expect(values).toEqual(["a", "b", "c"]);
    expect(labelsOf(def({
      enumOptions: [{ value: "a", label: "甲" }, { value: "b", label: "乙" }],
      enumValues: ["b", "a", "c"]
    }))).toEqual({ a: "甲", b: "乙", c: "c" });
  });

  test("纯字符串写法与 {value} 写法等价，空白项被丢掉", () => {
    expect(valuesOf(def({ enumOptions: ["  a  ", "", "   ", "b"] as never }))).toEqual(["a", "b"]);
  });

  test("★ 对象写法的 value 同样去空白，纯空白项被丢掉", () => {
    expect(valuesOf(def({ enumOptions: [{ value: "  a  " }, { value: "   " }, { value: "b" }] }))).toEqual(["a", "b"]);
  });

  test("★ 空数组 enumOptions 不算「有值」（照样走默认表 / enumValues）", () => {
    expect(valuesOf(def({ enName: "status", enumOptions: [] }))).toEqual(["1", "0"]);
    expect(valuesOf(def({ enumOptions: [], enumValues: ["x"] }))).toEqual(["x"]);
  });

  test("★ enName 带前后空白仍命中默认表", () => {
    expect(valuesOf(def({ enName: "  status  " }))).toEqual(["1", "0"]);
  });

  test("★ enumValues 不是数组时整段忽略（不当成可迭代的成员）", () => {
    expect(valuesOf(def({ enumOptions: [{ value: "a" }], enumValues: "bc" as never }))).toEqual(["a"]);
    expect(valuesOf(def({ enumOptions: [{ value: "a" }], enumValues: 7 as never }))).toEqual(["a"]);
  });

  test("★ typicalValue 不在枚举里时并到末尾（历史值不丢）", () => {
    expect(valuesOf(def({ enumOptions: [{ value: "a" }], typicalValue: "z" }))).toEqual(["a", "z"]);
  });

  test("typicalValue 与某项的**标签**相同则不追加（标签已在表里）", () => {
    expect(valuesOf(def({ enumOptions: [{ value: "1", label: "闭合" }], typicalValue: "闭合" }))).toEqual(["1"]);
  });

  test("typicalValue 前后空白先 trim 再判重", () => {
    expect(valuesOf(def({ enumOptions: [{ value: "a" }], typicalValue: "  a  " }))).toEqual(["a"]);
  });
});

describe("enumOptionLabelsForParameterDefinition：中文表头", () => {
  test("非枚举定义返回空对象", () => {
    expect(labelsOf(def({ valueType: "float", enumOptions: [{ value: "1" }] }))).toEqual({});
  });

  test("★ 没写 label 的项用 value 兜底（不返回空串）", () => {
    expect(labelsOf(def({ enumOptions: [{ value: "a" }, { value: "b", label: "乙" }] }))).toEqual({ a: "a", b: "乙" });
  });

  test("label 前后空白被去掉，空 label 也走 value 兜底", () => {
    expect(labelsOf(def({ enumOptions: [{ value: "a", label: "  甲  " }, { value: "b", label: "   " }] }))).toEqual({
      a: "甲",
      b: "b"
    });
  });

  test("默认枚举表带中文标签", () => {
    expect(labelsOf(def({ enName: "run_stat" }))).toEqual({ "1": "运行", "0": "停运" });
  });
});

describe("enumExportValueForDefinition：导出取值", () => {
  test("非枚举定义原样透传（只 trim）", () => {
    expect(enumExportValueForDefinition(def({ valueType: "float" }), " 3.5 ")).toBe("3.5");
  });

  test("★ 非枚举定义即使带着 enumOptions 也不查表（不把标签换成 value）", () => {
    const plain = def({ valueType: "float", enumOptions: [{ value: "1", label: "闭合" }] });
    expect(enumExportValueForDefinition(plain, "闭合")).toBe("闭合");
  });

  test("空值 / 纯空白返回空串", () => {
    expect(enumExportValueForDefinition(def())).toBe("");
    expect(enumExportValueForDefinition(def(), "   ")).toBe("");
    expect(enumExportValueForDefinition(def(), undefined)).toBe("");
  });

  test("★ 命中 value 时原样返回", () => {
    expect(enumExportValueForDefinition(def({ enumOptions: [{ value: "1", label: "闭合" }] }), "1")).toBe("1");
  });

  test("★ 命中 label 时换成对应 value（编辑器存的是中文，导出要英文）", () => {
    expect(enumExportValueForDefinition(def({ enName: "run_stat" }), "运行")).toBe("1");
    expect(enumExportValueForDefinition(def({ enName: "run_stat" }), "停运")).toBe("0");
  });

  test("★ 都不命中时原样带过（不吞掉历史值）", () => {
    expect(enumExportValueForDefinition(def({ enumOptions: [{ value: "1" }] }), " 9 ")).toBe("9");
  });

  test("没有 enumOptions 时照样按默认表认标签", () => {
    expect(enumExportValueForDefinition(def({ enName: "status" }), "打开/开断")).toBe("0");
  });
});

describe("enumSelectOptionsWithCurrentValue：下拉选项", () => {
  test("options 为 undefined 时原样返回 undefined（不加 invalidValue）", () => {
    expect(enumSelectOptionsWithCurrentValue(undefined, "9")).toEqual({ options: undefined });
  });

  test("命中当前值时只给选项，不带 invalidValue", () => {
    expect(enumSelectOptionsWithCurrentValue(["a", "b"], "b")).toEqual({ options: ["a", "b"] });
  });

  test("★ 不命中时把当前值插到最前，并给出 invalidValue", () => {
    expect(enumSelectOptionsWithCurrentValue(["a", "b"], " 9 ")).toEqual({ options: ["9", "a", "b"], invalidValue: "9" });
  });

  test("去重、trim、空项都清掉", () => {
    expect(enumSelectOptionsWithCurrentValue([" a ", "a", "", "  ", "b"], "a")).toEqual({ options: ["a", "b"] });
  });

  test("空数组 + 非空当前值 → 只剩当前值，且标为非法", () => {
    expect(enumSelectOptionsWithCurrentValue([], "9")).toEqual({ options: ["9"], invalidValue: "9" });
  });

  test("★ 空数组 + 空当前值 → 仍插一个空串项（既有行为，钉住）", () => {
    expect(enumSelectOptionsWithCurrentValue([], "")).toEqual({ options: [""], invalidValue: "" });
  });

  test("非字符串成员按字符串化处理", () => {
    expect(enumSelectOptionsWithCurrentValue([1, 2] as never, "2")).toEqual({ options: ["1", "2"] });
  });
});

describe("invalidEnumOptionLabel", () => {
  test("文案固定前缀 + 原值", () => {
    expect(invalidEnumOptionLabel("9")).toBe("非法历史值：9");
    expect(invalidEnumOptionLabel("")).toBe("非法历史值：");
  });
});
