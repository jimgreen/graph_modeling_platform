// 模板参数定义归一化（`src/model.ts`）
//   normalizeTemplateDefinitionList   批量归一 + 过滤 null（4 处生产调用，零直呼）
//   normalizeTemplateDefinition       单条归一（私有）
//   normalizeTemplateEnumOptions      枚举选项合并（私有）
//   terminalNodeNumber 等无关链路不在此文件
//
// 判错的后果：设备参数表里的**值类型、典型值、枚举选项**全错 ——
// 于是 E 文件导出写出错类型的值、参数面板下拉框少一项、
// 只读参数变成可编辑（用户改了不该改的）。多数情况**不报错**。
//
// ★ 两条铁律（探针实测）：
//   ① **语义表优先于入参 valueType** —— `TEMPLATE_DEFINITION_VALUE_TYPES`
//      命中的 enName，入参写什么都无效。
//   ② **`enum` 不是可能的输出** —— 白名单里的 `"enum"` 只是中间态，
//      最终一定被 `enumDefinitionValueTypeForEnumValueType` 收成
//      `stringEnum` 或 `numberEnum`。
import { describe, expect, test } from "vitest";
import {
  ALLOW_RESIZE_TRANSFORM_PARAM,
  normalizeTemplateDefinitionList,
  templateDefinitionIsReadonly
} from "./model";
import type { DeviceParameterDefinition } from "./model";

/** 一个**不在语义表**里的 enName —— 唯一能测到 valueType 兜底的入参。
 *  （探针第一轮误用 `"x"`，它恰好是 `x: "float"`，导致兜底分支完全没被测到） */
const FREE = "zz_free_param";
/** 语义表里有、恒为 `float` 的 enName。 */
const SEMANTIC_FLOAT = "x";
/** 命中 `idx_(ac|…)_(unit|load|transformer)_tN` 正则的 enName —— 恒为 `integer`。 */
const SEMANTIC_INT = "idx_ac_unit_t1";

const norm = (definitions: unknown) =>
  normalizeTemplateDefinitionList(definitions as readonly DeviceParameterDefinition[] | undefined);
const one = (definition: Record<string, unknown>) =>
  norm([definition])[0] as (DeviceParameterDefinition & Record<string, unknown>) | undefined;
const typed = (definition: Record<string, unknown>) => {
  const out = one(definition);
  return out!;
};

describe("入参容器", () => {
  test("undefined / null / 空数组 → 空数组（不抛）", () => {
    expect(norm(undefined)).toEqual([]);
    expect(norm(null)).toEqual([]);
    expect(norm([])).toEqual([]);
  });

  test("★ 非数组入参 → 抛 TypeError（`.map` 作用其上）", () => {
    // **判定不修**：形参类型就是 `readonly DeviceParameterDefinition[]`，
    // 调用方传字符串/数字就是违背契约；抛错直指问题所在。
    for (const bad of ["notarray", 0, {}, 42] as never[]) {
      expect(() => norm(bad), JSON.stringify(bad)).toThrow(TypeError);
    }
    // 前提
    expect(() => [].map((x) => x)).not.toThrow();
  });

  test("顺序保留，被丢弃的定义不留空位", () => {
    const out = norm([
      { cnName: "A", enName: "a_param", valueType: "string", typicalValue: "" },
      { cnName: "B", enName: "is_container", valueType: "string" },
      { cnName: "C", enName: "c_param", valueType: "string" },
      { cnName: "D", enName: "", valueType: "string" }
    ]);
    expect(out.map((d) => d.cnName)).toEqual(["A", "C"]);
  });
});

describe("★ 会被整条丢弃的定义（`normalizeTemplateDefinition` 返回 null）", () => {
  test("空 enName / 纯空白 enName", () => {
    for (const enName of ["", "   ", "\t", "\n"]) {
      expect(norm([{ cnName: "中", enName, valueType: "string" }]), JSON.stringify(enName)).toEqual([]);
    }
  });

  test("`is_container` 与 `allowResizeTransform`（★ 是 camelCase，不是 snake）", () => {
    expect(ALLOW_RESIZE_TRANSFORM_PARAM, "★ 常量真值").toBe("allowResizeTransform");
    for (const enName of ["is_container", ALLOW_RESIZE_TRANSFORM_PARAM]) {
      expect(norm([{ cnName: "中", enName, valueType: "string" }]), enName).toEqual([]);
    }
  });

  test("★ 丢弃判定是**先 trim、再精确相等**：区分大小写、带尾空格仍丢", () => {
    // 前提：rawEnName 被 trim 过
    for (const enName of [" is_container", "is_container ", "  allowResizeTransform  "]) {
      expect(norm([{ cnName: "中", enName, valueType: "string" }]), JSON.stringify(enName)).toEqual([]);
    }
    // ★ 但大小写不同就不丢 —— 这两个会**留下垃圾参数**
    for (const enName of ["Is_Container", "IS_CONTAINER", "AllowResizeTransform", "ALLOWRESIZETRANSFORM"]) {
      expect(norm([{ cnName: "中", enName, valueType: "string" }]).length, JSON.stringify(enName)).toBe(1);
    }
  });

  test("★ 形如这些字符串的 enName **不是** null", () => {
    for (const enName of ["undefined", "null", "NAME", "0", "false"]) {
      const out = one({ cnName: "中", enName, valueType: "string" });
      expect(out, enName).toBeDefined();
      expect(out!.enName).toBe(enName);
    }
  });
});

describe("★ 铁律①：语义表优先于入参 `valueType`", () => {
  test("`x` 在语义表里恒为 `float`，入参写什么都无效", () => {
    for (const valueType of ["string", "integer", "stringEnum", "numberEnum", "enum", "bool", ""]) {
      expect(typed({ cnName: "中", enName: SEMANTIC_FLOAT, valueType }).valueType, valueType).toBe("float");
    }
  });

  test("★ 对照：同一个非法 valueType，语义表外的 enName 走兜底 → `string`", () => {
    // ② 这条是让上面那条有鉴别力的对照 —— 两者必须不同
    expect(typed({ cnName: "中", enName: FREE, valueType: "bool" }).valueType).toBe("string");
    expect(typed({ cnName: "中", enName: SEMANTIC_FLOAT, valueType: "bool" }).valueType).toBe("float");
  });

  test("`idx_*` 正则命中的 enName 恒为 `integer`", () => {
    for (const enName of [
      "idx_ac_unit_t1", "idx_dc2_transformer_t3", "idx_h22_load_t2",
      "idx_heat2_unit_t4", "idx_ac2_unit_t1", "idx_dc_load_t1", "idx_h2_transformer_t2", "idx_heat_transformer_t3"
    ]) {
      expect(typed({ cnName: "中", enName, valueType: "string" }).valueType, enName).toBe("integer");
    }
  });

  test("★ 正则外的 idx 变体**不**命中", () => {
    for (const enName of ["idx_xx_unit_t1", "idx_ac_unit_t", "idx_ac_unit", "idx_unit_t1", "idx_ac_other_t1"]) {
      expect(typed({ cnName: "中", enName, valueType: "string" }).valueType, enName).toBe("string");
    }
  });

  test("`x_pu` 恒为 `float`", () => {
    expect(typed({ cnName: "中", enName: "x_pu", valueType: "string" }).valueType).toBe("float");
  });
});

describe("铁律②：`valueType` 的取值空间", () => {
  test("语义表外的 6 个合法入参原样透出（`enum` 除外）", () => {
    for (const valueType of ["integer", "float", "string", "stringEnum", "numberEnum"]) {
      expect(typed({ cnName: "中", enName: FREE, valueType, typicalValue: "v", enumValues: ["a"] }).valueType, valueType)
        .toBe(valueType === "stringEnum" || valueType === "numberEnum" ? valueType : valueType);
    }
  });

  test("★ 非法 valueType → `string`（不是透出）", () => {
    for (const valueType of ["bool", "number", "", null, undefined, 42, {}, "String"]) {
      expect(typed({ cnName: "中", enName: FREE, valueType }).valueType, JSON.stringify(valueType)).toBe("string");
    }
  });

  test("★ `enum` 永远不出现在输出里", () => {
    // 白名单含 "enum"，但它一定被收成 stringEnum / numberEnum
    for (const enumValues of [[], ["a"], ["1"], ["1", "2"], [""]]) {
      const out = typed({ cnName: "中", enName: FREE, valueType: "enum", enumValues });
      expect(out.valueType, JSON.stringify(enumValues)).not.toBe("enum");
      expect(["stringEnum", "numberEnum"], JSON.stringify(enumValues)).toContain(out.valueType);
    }
  });

  test("★ 输出的 valueType 只有 5 种可能", () => {
    const seen = new Set<string>();
    for (const enName of [FREE, SEMANTIC_FLOAT, SEMANTIC_INT]) {
      for (const valueType of ["integer", "float", "string", "stringEnum", "numberEnum", "enum", "bool", ""]) {
        for (const enumValues of [[], ["a"], ["1", "2"]]) {
          seen.add(typed({ cnName: "中", enName, valueType, enumValues }).valueType);
        }
      }
    }
    expect([...seen].sort()).toEqual(["float", "integer", "numberEnum", "string", "stringEnum"]);
  });
});

describe("输出对象的键集合", () => {
  test("★ 非枚举定义恰好 5 个键", () => {
    expect(Object.keys(typed({ cnName: "A", enName: FREE, valueType: "string", typicalValue: "1" }))).toEqual([
      "cnName", "enName", "valueType", "typicalValue", "readonly"
    ]);
  });

  test("★ 枚举定义多两个键（顺序固定）", () => {
    expect(Object.keys(typed({ cnName: "A", enName: FREE, valueType: "stringEnum", typicalValue: "1", enumValues: ["1", "2"] })))
      .toEqual(["cnName", "enName", "valueType", "typicalValue", "readonly", "enumOptions", "enumValues"]);
  });

  test("★ 非枚举定义**不会**带 `enumOptions` / `enumValues`（入参带了也丢）", () => {
    const out = typed({ cnName: "A", enName: FREE, valueType: "string", typicalValue: "1", enumOptions: [{ value: "a" }], enumValues: ["a"] });
    expect(Object.keys(out)).not.toContain("enumOptions");
    expect(Object.keys(out)).not.toContain("enumValues");
  });

  test("`exportEnabled` / `exportName` 按类型透出", () => {
    const both = typed({ cnName: "A", enName: FREE, valueType: "string", exportEnabled: true, exportName: "e" });
    expect(Object.keys(both)).toEqual(["cnName", "enName", "valueType", "typicalValue", "readonly", "exportEnabled", "exportName"]);
    // 非布尔 / 非字符串 → 该键**不存在**（不是 undefined）
    expect(Object.keys(typed({ cnName: "A", enName: FREE, valueType: "string", exportEnabled: "yes", exportName: "e" })))
      .not.toContain("exportEnabled");
    expect(Object.keys(typed({ cnName: "A", enName: FREE, valueType: "string", exportEnabled: true, exportName: 42 })))
      .not.toContain("exportName");
  });

  test("★ 入参的多余字段全部被丢掉（输出是白名单构造）", () => {
    const out = typed({ cnName: "A", enName: FREE, valueType: "string", typicalValue: "1", customProp: "zzz", min: 1, max: 9, unit: "kV" });
    expect(Object.keys(out)).not.toContain("customProp");
    expect(Object.keys(out)).not.toContain("min");
    expect(Object.keys(out)).not.toContain("max");
    expect(Object.keys(out)).not.toContain("unit");
  });
});

describe("`cnName` / `enName` 的归一", () => {
  test("★ `cnName` 空 → 回落到 `enName`", () => {
    for (const cnName of ["", "   ", null, undefined] as never[]) {
      expect(typed({ cnName, enName: "myparam", valueType: "string" }).cnName, String(cnName)).toBe("myparam");
    }
  });

  test("★ `cnName` 为 `0` → `\"0\"`（非空串，不回落）", () => {
    expect(typed({ cnName: 0, enName: "myparam", valueType: "string" }).cnName).toBe("0");
    // 前提：`String(0)` 是非空串，`||` 不触发
    expect(String(0) || "fallback").toBe("0");
  });

  test("`cnName` 被 trim", () => {
    expect(typed({ cnName: "  中文  ", enName: "myparam", valueType: "string" }).cnName).toBe("中文");
  });

  test("★ `enName` 被 trim 后做别名归一", () => {
    for (const [raw, expected] of [
      ["gasQuantity", "gas_quantity"],
      ["gasquantity", "gas_quantity"],
      [" gasQuantity ", "gas_quantity"],
      ["state_of_charge", "soc"],
      ["stateOfCharge", "soc"],
      [" gasQuantity\t", "gas_quantity"]
    ] as [string, string][]) {
      const out = typed({ cnName: "中", enName: raw, valueType: "string" });
      expect(out.enName, JSON.stringify(raw)).toBe(expected);
    }
  });

  test("★ 别名匹配**区分大小写**（第三种拼法不被归一）", () => {
    // `GASQUANTITY` / `stateofcharge` / `StateOfCharge` 都保持原样
    for (const raw of ["GASQUANTITY", "stateofcharge", "StateOfCharge", "GasQuantity"]) {
      expect(typed({ cnName: "中", enName: raw, valueType: "string" }).enName, raw).toBe(raw);
    }
  });

  test("`exportName` 也走同一套别名归一 + trim", () => {
    for (const [raw, expected] of [
      ["gasQuantity", "gas_quantity"],
      ["stateOfCharge", "soc"],
      ["  spaced  ", "spaced"],
      ["normal", "normal"],
      ["GASQUANTITY", "GASQUANTITY"]
    ] as [string, string][]) {
      expect(typed({ cnName: "A", enName: FREE, valueType: "string", exportName: raw }).exportName, JSON.stringify(raw)).toBe(expected);
    }
  });
});

describe("★ `typicalValue` 的数值归一：float 保留小数 / integer 截断", () => {
  test("float：只取**首个数字 token**", () => {
    for (const [raw, expected] of [
      ["1.5", "1.5"], ["2.9", "2.9"], ["-2.7", "-2.7"], [".5", ".5"],
      ["3.", "3"], ["+4", "+4"], ["  7  ", "7"], ["1e3", "1"], ["0x10", "0"], ["--3", "-3"]
    ] as [string, string][]) {
      expect(typed({ cnName: "中", enName: SEMANTIC_FLOAT, valueType: "string", typicalValue: raw }).typicalValue, raw).toBe(expected);
    }
  });

  test("★ integer：同一个输入会被截断（与 float 分道扬镳）", () => {
    for (const [raw, expected] of [
      ["1.5", "1"], ["2.9", "2"], ["-2.7", "-2"], [".5", "0"], ["3.", "3"],
      ["+4", "4"], ["007", "7"], ["1e3", "1"], ["0x10", "0"]
    ] as [string, string][]) {
      expect(typed({ cnName: "中", enName: SEMANTIC_INT, valueType: "string", typicalValue: raw }).typicalValue, raw).toBe(expected);
    }
  });

  test("★ `.5` → integer 变 `0`（不是 1，也不是报错）", () => {
    expect(typed({ cnName: "中", enName: SEMANTIC_INT, valueType: "string", typicalValue: ".5" }).typicalValue).toBe("0");
    // 前提：`Number(".5")` = 0.5，`Math.trunc` = 0
    expect(Math.trunc(Number(".5"))).toBe(0);
  });

  test("★ `007`：float 保留、integer 截断（同一入参两个结果）", () => {
    expect(typed({ cnName: "中", enName: SEMANTIC_FLOAT, valueType: "string", typicalValue: "007" }).typicalValue).toBe("007");
    expect(typed({ cnName: "中", enName: SEMANTIC_INT, valueType: "string", typicalValue: "007" }).typicalValue).toBe("7");
  });

  test("★ 归一失败时**保留原值**（不是清空）", () => {
    for (const raw of ["abc", "Infinity", "NaN"]) {
      expect(typed({ cnName: "中", enName: SEMANTIC_INT, valueType: "string", typicalValue: raw }).typicalValue, raw).toBe(raw);
    }
  });

  test("空白 typicalValue → 空串（不是原样空白）", () => {
    for (const raw of ["", "   ", "\t"]) {
      expect(typed({ cnName: "中", enName: SEMANTIC_INT, valueType: "string", typicalValue: raw }).typicalValue, JSON.stringify(raw)).toBe("");
    }
  });

  test("★ 非数值类型不做任何归一（原样透出）", () => {
    // ★ 必须用**语义表外**的 enName —— 否则 `idx_ac_unit_t1` 会被铁律①
    //   强制成 `integer`，无论入参 valueType 写什么，数值归一照跑。
    for (const valueType of ["string", "stringEnum"]) {
      expect(typed({ cnName: "中", enName: FREE, valueType, typicalValue: "2.9" }).typicalValue, valueType).toBe("2.9");
    }
    // 对照：同一个 enName 在语义表里 → 被归一成 "2"
    expect(typed({ cnName: "中", enName: SEMANTIC_INT, valueType: "string", typicalValue: "2.9" }).typicalValue).toBe("2");
  });
});

describe("★ 枚举：`enumOptions` 与 `enumValues` 是**并集**，不是二选一", () => {
  test("两者都给 → 合并去重", () => {
    const out = typed({ cnName: "中", enName: FREE, valueType: "stringEnum", typicalValue: "", enumOptions: [{ value: "p" }], enumValues: ["q"] });
    expect(out.enumValues).toEqual(["p", "q"]);
    expect(out.enumOptions).toEqual([{ value: "p" }, { value: "q" }]);
  });

  test("★ `enumOptions` 为空数组 / 非数组 → 回落到 `enumValues`", () => {
    for (const enumOptions of [[], "x", 0, {}] as never[]) {
      const out = typed({ cnName: "中", enName: FREE, valueType: "stringEnum", typicalValue: "", enumOptions, enumValues: ["q"] });
      expect(out.enumValues, JSON.stringify(enumOptions)).toEqual(["q"]);
    }
  });

  test("两者都无 → 空数组", () => {
    const out = typed({ cnName: "中", enName: FREE, valueType: "stringEnum", typicalValue: "" });
    expect(out.enumValues).toEqual([]);
    expect(out.enumOptions).toEqual([]);
    expect(out.typicalValue, "★ 兜底到 enumValues[0] 也是空").toBe("");
  });

  test("★ 去重 + trim + 丢空", () => {
    const out = typed({ cnName: "中", enName: FREE, valueType: "stringEnum", typicalValue: "", enumValues: ["a", "a", " b ", "", "  "] });
    expect(out.enumValues).toEqual(["a", "b"]);
  });

  test("★ `value` 为空的 option 被整条丢弃；`label` 为空则只留 `value`", () => {
    const out = typed({
      cnName: "中", enName: FREE, valueType: "stringEnum", typicalValue: "",
      enumOptions: [{ value: "1" }, { value: "2", label: "  " }, { value: "  " }]
    });
    expect(out.enumOptions).toEqual([{ value: "1" }, { value: "2" }]);
  });

  test("label 非空时保留并 trim；纯空白 label 则整个键不出现", () => {
    const out = typed({
      cnName: "中", enName: FREE, valueType: "stringEnum", typicalValue: "",
      enumOptions: [{ value: "1", label: " 运行 " }, { value: "2", label: "  " }]
    });
    expect(out.enumOptions).toEqual([{ value: "1", label: "运行" }, { value: "2" }]);
  });

  test("★ label 也走 `String` 强转（数字 42 变成字符串标签）", () => {
    const out = typed({
      cnName: "中", enName: FREE, valueType: "stringEnum", typicalValue: "",
      enumOptions: [{ value: "2", label: 42 }]
    });
    expect(out.enumOptions).toEqual([{ value: "2", label: "42" }]);
    // 前提：`String(42)` 是非空串
    expect(String(42)).toBe("42");
  });

  test("★ 数字型 `value` 也走 `String` 强转", () => {
    const out = typed({
      cnName: "中", enName: FREE, valueType: "stringEnum", typicalValue: "",
      enumOptions: [1, 2]
    });
    expect(out.enumValues).toEqual(["1", "2"]);
  });

  test("★ 入参的 option 对象**不被复用**（不共享引用）", () => {
    const option = { value: "p", label: "P" };
    const enumOptions = [option];
    const out = typed({ cnName: "中", enName: FREE, valueType: "stringEnum", typicalValue: "", enumOptions });
    expect(out.enumOptions === (enumOptions as never)).toBe(false);
    expect(out.enumOptions![0] === (option as never)).toBe(false);
    expect(out.enumOptions).toEqual([{ value: "p", label: "P" }]);
  });

  test("典型值不在枚举里 → 补进 options（值与顺序）", () => {
    const out = typed({ cnName: "中", enName: FREE, valueType: "stringEnum", typicalValue: "X", enumValues: ["1", "0"] });
    expect(out.enumValues).toEqual(["1", "0", "X"]);
    expect(out.typicalValue).toBe("X");
  });

  test("★ 典型值命中 label → 被换成对应的 value", () => {
    const out = typed({
      cnName: "中", enName: FREE, valueType: "stringEnum", typicalValue: "运行",
      enumOptions: [{ value: "1", label: "运行" }, { value: "0", label: "停运" }]
    });
    expect(out.typicalValue, "★ 「运行」→ \"1\"").toBe("1");
    expect(out.enumValues).toEqual(["1", "0"]);
  });

  test("★ 典型值命中 value → 原样", () => {
    const out = typed({
      cnName: "中", enName: FREE, valueType: "stringEnum", typicalValue: "0",
      enumOptions: [{ value: "1", label: "运行" }, { value: "0", label: "停运" }]
    });
    expect(out.typicalValue).toBe("0");
  });
});

describe("★ 枚举的 `valueType` 判定（`enum` 的去向）", () => {
  test("`numberEnum` 无条件 → `number`（忽略选项是否真是数字）", () => {
    for (const enumValues of [["a", "b"], [1, 2], [], ["1", "2"]] as never[]) {
      const out = typed({ cnName: "中", enName: FREE, valueType: "numberEnum", typicalValue: "", enumValues });
      expect(out.valueType, JSON.stringify(enumValues)).toBe("numberEnum");
      expect(out.enumValueType, JSON.stringify(enumValues)).toBe("number");
    }
  });

  test("`stringEnum` 无条件 → `string`（即使选项全是数字）", () => {
    const out = typed({ cnName: "中", enName: FREE, valueType: "stringEnum", typicalValue: "", enumValues: ["1", "2"] });
    expect(out.valueType).toBe("stringEnum");
    expect(out.enumValueType, "★ string 时该键**不存在**").toBeUndefined();
    expect("enumValueType" in out).toBe(false);
  });

  test("★ `enum` 靠选项内容判定：全数字才 `numberEnum`", () => {
    for (const [enumValues, expected] of [
      [["1", "2"], "numberEnum"],
      [["-1", "2.5"], "numberEnum"],
      [[" 1 ", "2"], "numberEnum"],
      [["01", "02"], "numberEnum"],
      [["1", ""], "numberEnum"],          // 空串被 option 归一丢掉
      [["1", "b"], "stringEnum"],
      [["+1", "2"], "stringEnum"],        // ★ 数字正则不接受 + 号
      [[".5", "1"], "stringEnum"],        // ★ 不接受 .5 形式
      [["1e2", "3"], "stringEnum"],       // ★ 不接受指数形式
      [[""], "stringEnum"]
    ] as [never[], string][]) {
      const out = typed({ cnName: "中", enName: FREE, valueType: "enum", typicalValue: "", enumValues });
      expect(out.valueType, JSON.stringify(enumValues)).toBe(expected);
    }
  });

  test("★ 判定数字的正则是 `^-?\\d+(?:\\.\\d+)?$`", () => {
    const re = /^-?\d+(?:\.\d+)?$/;
    for (const good of ["1", "-1", "1.5", "-0.5", "01"]) {
      expect(re.test(good), good).toBe(true);
    }
    for (const bad of ["+1", ".5", "1e2", "", " 1", "1.", "abc", "1.2.3"] as string[]) {
      expect(re.test(bad), bad).toBe(false);
    }
  });

  test("★ 显式 `enumValueType: \"number\"` 只在 `valueType: \"enum\"` 时被采纳", () => {
    const asEnum = typed({ cnName: "中", enName: FREE, valueType: "enum", typicalValue: "", enumValues: ["a"], enumValueType: "number" });
    expect(asEnum.valueType).toBe("numberEnum");
    expect(asEnum.enumValueType).toBe("number");
    // ★ 同一个显式值在 stringEnum 下被忽略
    const asString = typed({ cnName: "中", enName: FREE, valueType: "stringEnum", typicalValue: "", enumValues: ["a"], enumValueType: "number" });
    expect(asString.valueType).toBe("stringEnum");
    expect("enumValueType" in asString).toBe(false);
  });

  test("★ 显式 `enumValueType: \"string\"` 在 `enum` 下压过全数字选项", () => {
    const out = typed({ cnName: "中", enName: FREE, valueType: "enum", typicalValue: "", enumValues: ["1", "2"], enumValueType: "string" });
    expect(out.valueType).toBe("stringEnum");
  });

  test("非法 `enumValueType`（bogus / null / undefined）→ 按选项内容判定", () => {
    expect(typed({ cnName: "中", enName: FREE, valueType: "enum", typicalValue: "", enumValues: ["1", "2"], enumValueType: "bogus" }).valueType).toBe("numberEnum");
    expect(typed({ cnName: "中", enName: FREE, valueType: "enum", typicalValue: "", enumValues: ["1", "2"], enumValueType: null }).valueType).toBe("numberEnum");
    expect(typed({ cnName: "中", enName: FREE, valueType: "enum", typicalValue: "", enumValues: ["a"], enumValueType: undefined }).valueType).toBe("stringEnum");
  });
});

describe("★ `readonly`：可编辑白名单优先于入参", () => {
  test("可编辑白名单（4 个键）恒为 `false`，**入参传 true 也一样**", () => {
    for (const enName of ["status", "closed_status", "closed_status_set", "run_stat"]) {
      for (const readonly of [true, false, undefined]) {
        expect(typed({ cnName: "中", enName, valueType: "string", readonly }).readonly, `${enName}/${String(readonly)}`).toBe(false);
      }
    }
  });

  test("只读白名单（7 个键）恒为 `true`，入参传 false 也一样", () => {
    for (const enName of ["idx", "name", "node", "i_node", "j_node", "ac_node", "dc_node"]) {
      for (const readonly of [true, false, undefined]) {
        expect(typed({ cnName: "中", enName, valueType: "string", readonly }).readonly, `${enName}/${String(readonly)}`).toBe(true);
      }
    }
  });

  test("★ 两张白名单互斥（对照）", () => {
    expect(typed({ cnName: "中", enName: "status", valueType: "string", readonly: true }).readonly).toBe(false);
    expect(typed({ cnName: "中", enName: "idx", valueType: "string", readonly: false }).readonly).toBe(true);
  });

  test("白名单外的键：`readonly` 由入参决定", () => {
    expect(typed({ cnName: "中", enName: FREE, valueType: "string", readonly: true }).readonly).toBe(true);
    expect(typed({ cnName: "中", enName: FREE, valueType: "string", readonly: false }).readonly).toBe(false);
    expect(typed({ cnName: "中", enName: FREE, valueType: "string" }).readonly).toBe(false);
  });

  test("★ 白名单判定 trim 但**不区分大小写之外**（`NAME` 不在只读名单）", () => {
    expect(typed({ cnName: "中", enName: " name ", valueType: "string" }).readonly, "★ 带空格仍命中").toBe(true);
    expect(typed({ cnName: "中", enName: "NAME", valueType: "string" }).readonly, "★ 大写不命中").toBe(false);
    expect(typed({ cnName: "中", enName: " status ", valueType: "string" }).readonly).toBe(false);
  });
});

describe("★ `templateDefinitionIsReadonly` 直接调用（它是 `export` 的）", () => {
  // ★ 这一节的存在理由：`normalizeTemplateDefinition` 会**先 trim 再传**，
  //   所以经 `normalizeTemplateDefinitionList` 看不到函数内部的 `.trim()` 是否生效。
  //   变异 ⑫（把 `enName.trim()` 改成 `enName`）在上一节里**全绿** ——
  //   不是等价，是那条路上游已经 trim过了。本节走直呼才能看到区别。

  test("★ 直接传带空白的 enName → trim 后仍命中白名单", () => {
    // 只读名单
    for (const enName of ["idx", "name", "node", "i_node", "j_node", "ac_node", "dc_node"]) {
      expect(templateDefinitionIsReadonly(` ${enName} `, false), ` ${enName} `).toBe(true);
      expect(templateDefinitionIsReadonly(`\t${enName}\n`, undefined), `\\t${enName}\\n`).toBe(true);
    }
    // 可编辑名单
    for (const enName of ["status", "closed_status", "closed_status_set", "run_stat"]) {
      expect(templateDefinitionIsReadonly(` ${enName} `, true), ` ${enName} `).toBe(false);
    }
  });

  test("★ 白名单**区分大小写**：`Status` 不在可编辑名单里，入参 `true` 依然只读", () => {
    // 这不是「大小写不敏感」—— 两张名单都是精确匹配。
    expect(templateDefinitionIsReadonly("NAME"), "★ 大写的只读键不在名单里 → 落回入参（undefined→false）").toBe(false);
    expect(templateDefinitionIsReadonly("Status", true), "★ 大写的可编辑键不在名单里 → 入参 true 生效").toBe(true);
    // 前提：两张名单都是小写精确匹配（用 string 变量洗掉 TS 的字面量收窄）
    const upperStatus: string = "Status";
    const lowerStatus: string = "status";
    const upperName: string = "NAME";
    const lowerName: string = "name";
    expect(upperStatus === lowerStatus).toBe(false);
    expect(upperName === lowerName).toBe(false);
  });

  test("白名单外的键由入参决定", () => {
    expect(templateDefinitionIsReadonly("zz_free", true)).toBe(true);
    expect(templateDefinitionIsReadonly("zz_free", false)).toBe(false);
    expect(templateDefinitionIsReadonly("zz_free")).toBe(false);
  });

  test("可编辑名单**压过**入参 `true`", () => {
    expect(templateDefinitionIsReadonly("status", true)).toBe(false);
    expect(templateDefinitionIsReadonly("run_stat", true)).toBe(false);
  });

  test("只读名单**压过**入参 `false`", () => {
    expect(templateDefinitionIsReadonly("idx", false)).toBe(true);
    expect(templateDefinitionIsReadonly("node", false)).toBe(true);
  });

  test("★ 两张名单互斥（对照，防止某条变异只改了一张）", () => {
    // 变异 ⑪ 只改可编辑名单，这条能把它抓住
    expect(templateDefinitionIsReadonly("status", true)).toBe(false);
    // 变异 ⑩ 只改入参透出，这条能把它抓住
    expect(templateDefinitionIsReadonly("idx", false)).toBe(true);
    // 变异 ⑫ 去掉 trim，这条能把它抓住
    expect(templateDefinitionIsReadonly(" name ", false)).toBe(true);
  });

  test("★ 等价变异 ⑮：`normalizeTemplateEnumValues` 的去重判定拆写不改语义", () => {
    // 变异：`if (!text || seen.has(text)) { continue; }`
    //      → `if (!text) { continue; }` + `if (seen.has(text)) { continue; }`
    // 全绿。**可证明等价**：两个 continue 的条件合起来就是原来的 `||`，
    // 短路求值顺序也一致（先判空、再查 `seen`），每条路径的控制流完全相同。
    // ⚠ 什么会让它失效：若拆开后其中一个 continue 被删掉，
    //   或 `seen.add` 被挪到第一个 continue 之后 —— 去重会漏。
    const dedup = (values: readonly unknown[]) => {
      const seen = new Set<string>();
      const out: string[] = [];
      for (const value of values) {
        const text = String(value ?? "").trim();
        if (!text) continue;
        if (seen.has(text)) continue;
        seen.add(text);
        out.push(text);
      }
      return out;
    };
    const merged = (values: readonly unknown[]) => {
      const seen = new Set<string>();
      const out: string[] = [];
      for (const value of values) {
        const text = String(value ?? "").trim();
        if (!text || seen.has(text)) continue;
        seen.add(text);
        out.push(text);
      }
      return out;
    };
    for (const values of [[], ["a"], ["a", "a"], ["a", "", "a"], [" a ", "a", " a "], [null, undefined, "  "]] as unknown[][]) {
      expect(dedup(values), JSON.stringify(values)).toEqual(merged(values));
    }
    // 与生产行为一致（去重 + trim + 丢空）
    expect(typed({ cnName: "中", enName: FREE, valueType: "stringEnum", typicalValue: "", enumValues: ["a", "a", " b ", "", "  "] }).enumValues)
      .toEqual(["a", "b"]);
  });
});

describe("纯函数性质", () => {
  test("★ 不改入参（深比较）", () => {
    const source = [
      { cnName: " gasQuantity ", enName: " gasQuantity ", valueType: "enum", typicalValue: "Z", enumValues: ["a", "a", " b ", ""] }
    ];
    const snapshot = JSON.stringify(source);
    norm(source);
    expect(JSON.stringify(source)).toBe(snapshot);
  });

  test("同一入参两次结果逐字段相等，但**不是同一引用**", () => {
    const source = [{ cnName: "A", enName: "a_param", valueType: "string", typicalValue: "1" }];
    const a = norm(source)[0];
    const b = norm(source)[0];
    expect(a).not.toBe(b);
    expect(a).toEqual(b);
  });

  test("返回数组不是入参数组", () => {
    const source = [{ cnName: "A", enName: "a_param", valueType: "string" }];
    expect(norm(source)).not.toBe(source);
  });

  test("返回恒为字符串的 valueType", () => {
    for (const valueType of ["enum", "stringEnum", "numberEnum", "bool", ""]) {
      expect(typeof typed({ cnName: "中", enName: FREE, valueType }).valueType, valueType).toBe("string");
    }
  });
});
