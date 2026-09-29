// 设备参数定义的**枚举簇**（`src/appExtracted/appPersistenceLibraryExport.tsx`）
//   clonePoint                              折点浅拷贝
//   definitionRowIsEnum                     该定义行是不是枚举类型
//   defaultEnumValuesForDefinitionRow       内置默认枚举值（按 enName）
//   defaultEnumOptionsForDefinitionRow      内置默认枚举选项（按 enName）
//   normalizeEnumOption                     单个枚举项归一
//   normalizeEnumValueType                  从选项值推断 number / string
//   enumValueTypeForDefinitionRow           结合行类型与选项推断
//   enumDefinitionValueTypeForEnumValueType 反向映射
//   rawEnumValuesForRow                     四级回退的裸值
//   normalizeEnumOptionsForRow              ★ 唯一的选项归一出口
//   enumValueFromOptions                    值 / 标签 → 值
//   enumDisplayText                         展示文案
//
// 判错的后果：参数编辑器里枚举下拉出现**重名项**或**少一项**，
// 或数值型枚举被判成字符串型（导出的 E 文件里枚举值格式错）—— 都不报错。
import { describe, expect, test } from "vitest";
import {
  DEFAULT_PARAMETER_ENUM_OPTIONS,
  DEFAULT_PARAMETER_ENUM_VALUES,
  clonePoint,
  defaultEnumOptionsForDefinitionRow,
  defaultEnumValuesForDefinitionRow,
  definitionRowIsEnum,
  enumDefinitionValueTypeForEnumValueType,
  enumDisplayText,
  enumValueFromOptions,
  enumValueTypeForDefinitionRow,
  normalizeEnumOption,
  normalizeEnumOptionsForRow,
  normalizeEnumValueType,
  rawEnumValuesForRow
} from "./appExtracted/appPersistenceLibraryExport";

const OPTS = (...values: string[]) => values.map((value) => ({ value }));
const LOPTS = (pairs: Array<[string, string]>) => pairs.map(([value, label]) => ({ value, label }));
const row = (over: Record<string, unknown> = {}) => over as never;

describe("clonePoint：纯字段拷贝，不做任何数值处理", () => {
  test("新对象，值相等", () => {
    const p = { x: 1.5, y: -2 };
    const out = clonePoint(p);
    expect(out).toEqual(p);
    expect(out).not.toBe(p);
  });

  test("★ NaN / ±Infinity **原样透出**（没有 `|| 0` 兜底）", () => {
    // 与 `cloneTemplatePoint`（`Number(x) || 0`）形成对照 ——
    // 那一个把 NaN 归零，这一个不碰。两者用途不同，别混用。
    const out = clonePoint({ x: NaN, y: Infinity });
    expect(Number.isNaN(out.x), "★ NaN 保持 NaN").toBe(true);
    expect(out.y).toBe(Infinity);
    // 前提：对照函数的兜底会吃掉 NaN
    expect(Number(NaN) || 0).toBe(0);
  });

  test("只输出 x / y 两个键（多余字段被丢）", () => {
    const out = clonePoint({ x: 1, y: 2, z: 3 } as never) as unknown as Record<string, unknown>;
    expect(Object.keys(out)).toEqual(["x", "y"]);
  });

  test("不改入参", () => {
    const p = { x: 1, y: 2 };
    clonePoint(p);
    expect(p).toEqual({ x: 1, y: 2 });
  });
});

describe("definitionRowIsEnum：三个字面量", () => {
  test("是枚举的类型", () => {
    for (const valueType of ["stringEnum", "numberEnum", "enum"]) {
      expect(definitionRowIsEnum({ valueType } as never), valueType).toBe(true);
    }
  });

  test("★ 不是枚举的类型（区分大小写）", () => {
    for (const valueType of ["string", "number", "boolean", "", "ENUM", "StringEnum", "enumValueType"]) {
      expect(definitionRowIsEnum({ valueType } as never), valueType).toBe(false);
    }
  });

  test("nullish / 缺字段 / 数字 → false", () => {
    for (const valueType of [undefined, null, 0, 1] as never[]) {
      expect(definitionRowIsEnum({ valueType } as never), String(valueType)).toBe(false);
    }
    expect(definitionRowIsEnum(undefined), "★ row 本身 undefined").toBe(false);
    expect(definitionRowIsEnum({} as never), "★ 空行").toBe(false);
  });

  test("只读 valueType（其余字段无关）", () => {
    expect(definitionRowIsEnum({ valueType: "enum", enName: "x", enumOptions: [] } as never)).toBe(true);
  });
});

describe("内置默认枚举表：只有 `status` 与 `run_stat`", () => {
  test("VALUES 表内容", () => {
    expect(Object.keys(DEFAULT_PARAMETER_ENUM_VALUES)).toEqual(["status", "run_stat"]);
    expect(DEFAULT_PARAMETER_ENUM_VALUES.status).toEqual(["1", "0"]);
  });

  test("OPTIONS 表内容（value → 中文标签）", () => {
    expect(Object.keys(DEFAULT_PARAMETER_ENUM_OPTIONS)).toEqual(["status", "run_stat"]);
    expect(DEFAULT_PARAMETER_ENUM_OPTIONS.status).toEqual([
      { value: "1", label: "闭合" },
      { value: "0", label: "打开/开断" }
    ]);
    expect(DEFAULT_PARAMETER_ENUM_OPTIONS.run_stat).toEqual([
      { value: "1", label: "运行" },
      { value: "0", label: "停运" }
    ]);
  });

  test("★ 查表 key 用 `enName.trim()`（大小写敏感）", () => {
    expect(defaultEnumValuesForDefinitionRow({ enName: "status" })).toEqual(["1", "0"]);
    expect(defaultEnumValuesForDefinitionRow({ enName: "  status  " }), "★ trim 后命中").toEqual(["1", "0"]);
    expect(defaultEnumValuesForDefinitionRow({ enName: "STATUS" }), "★ 大写查不到").toEqual([]);
    expect(defaultEnumOptionsForDefinitionRow({ enName: "STATUS" })).toEqual([]);
    for (const enName of ["nope", "", "run_stat2"]) {
      expect(defaultEnumValuesForDefinitionRow({ enName })).toEqual([]);
      expect(defaultEnumOptionsForDefinitionRow({ enName })).toEqual([]);
    }
  });

  test("查不到时返回**新的空数组**（不是共享常量）", () => {
    const a = defaultEnumValuesForDefinitionRow({ enName: "nope" });
    const b = defaultEnumValuesForDefinitionRow({ enName: "nope2" });
    expect(a).toEqual([]);
    expect(a).not.toBe(b);
  });
});

describe("normalizeEnumOption：`value` 必填，`label` 可选", () => {
  test("对象形态：value/label 都 trim", () => {
    expect(normalizeEnumOption({ value: "  a  ", label: "  A  " })).toEqual({ value: "a", label: "A" });
    expect(normalizeEnumOption({ value: "a" })).toEqual({ value: "a" });
  });

  test("★ label 为空 / 空白 → **不带 label 键**", () => {
    expect(normalizeEnumOption({ value: "a", label: "" })).toEqual({ value: "a" });
    expect(normalizeEnumOption({ value: "a", label: "   " })).toEqual({ value: "a" });
    // 键序：先判 label 再决定键
    expect(Object.keys(normalizeEnumOption({ value: "a", label: "" })!)).toEqual(["value"]);
    expect(Object.keys(normalizeEnumOption({ value: "a", label: "A" })!)).toEqual(["value", "label"]);
  });

  test("★ value 为空 / 缺省 → `null`（**即使有 label**）", () => {
    expect(normalizeEnumOption({ value: "", label: "A" }), "★ 有 label 也丢").toBeNull();
    expect(normalizeEnumOption({ label: "只有标签" })).toBeNull();
    expect(normalizeEnumOption({ value: "   " })).toBeNull();
    expect(normalizeEnumOption({ value: null })).toBeNull();
    expect(normalizeEnumOption({ value: undefined })).toBeNull();
    expect(normalizeEnumOption({})).toBeNull();
  });

  test("非对象走 `String(option ?? \"\").trim()`", () => {
    expect(normalizeEnumOption("plain")).toEqual({ value: "plain" });
    expect(normalizeEnumOption("  spaced  ")).toEqual({ value: "spaced" });
    // ★ 数字 0 / false **不是**空 —— `String(0)` = "0" 是非空串
    expect(normalizeEnumOption(0), "★ 0 被保留").toEqual({ value: "0" });
    expect(normalizeEnumOption(1)).toEqual({ value: "1" });
    expect(normalizeEnumOption(false), "★ false 被保留").toEqual({ value: "false" });
    expect(normalizeEnumOption(true)).toEqual({ value: "true" });
    expect(normalizeEnumOption(null)).toBeNull();
    expect(normalizeEnumOption(undefined)).toBeNull();
    expect(normalizeEnumOption("")).toBeNull();
    expect(normalizeEnumOption("   ")).toBeNull();
  });

  test("★ 数组走非对象分支（`String([\"a\"])` = \"a\"），空数组 → null", () => {
    expect(normalizeEnumOption(["a"])).toEqual({ value: "a" });
    expect(normalizeEnumOption([]), "★ `String([])` 是空串").toBeNull();
  });

  test("★ `Date` 走**对象**分支（无 value）→ null", () => {
    // 条件是 `typeof option === "object" && !Array.isArray(option)`，
    // Date 满足 object 且不是数组 ⇒ 进对象分支 ⇒ `value` 是 undefined ⇒ null。
    expect(normalizeEnumOption(new Date(0))).toBeNull();
  });

  test("★ value 本身是对象/数组时的双重强转", () => {
    expect(normalizeEnumOption({ value: {} })).toEqual({ value: "[object Object]" });
    // `String([])` = "" ⇒ 空 ⇒ null
    expect(normalizeEnumOption({ value: [], label: [] })).toBeNull();
  });
});

describe("normalizeEnumValueType：先认字面量，再看选项值", () => {
  test("字面量直通（区分大小写）", () => {
    expect(normalizeEnumValueType("number")).toBe("number");
    expect(normalizeEnumValueType("string")).toBe("string");
    expect(normalizeEnumValueType("Number"), "★ 大写不通").toBe("string");
    expect(normalizeEnumValueType("numberEnum"), "★ 非枚举类型名").toBe("string");
  });

  test("★ 全部选项值都匹配 `^-?\\d+(?:\\.\\d+)?$` → number", () => {
    expect(normalizeEnumValueType(undefined, OPTS("1", "2"))).toBe("number");
    expect(normalizeEnumValueType(undefined, OPTS("0")), "★ 0 是数字").toBe("number");
    expect(normalizeEnumValueType(undefined, OPTS("-1", "1.5")), "★ 负数与小数").toBe("number");
    expect(normalizeEnumValueType(undefined, OPTS(" 1 ")), "★ 值先 trim 再判").toBe("number");
    expect(normalizeEnumValueType(null, OPTS("1")), "★ null 不走字面量分支").toBe("number");
  });

  test("★ 有一个不匹配就整体退成 string", () => {
    expect(normalizeEnumValueType(undefined, OPTS("1", "x"))).toBe("string");
    expect(normalizeEnumValueType(undefined, OPTS("")), "★ 空值被 filter 掉 → 长度 0").toBe("string");
    expect(normalizeEnumValueType(undefined, [])).toBe("string");
  });

  test("★ 正则不接受科学计数 / 前导点 / 尾点 / 正号", () => {
    for (const value of ["1e3", ".5", "1.", "+1", "1_000", "0x10", "--1", "1.2.3"]) {
      expect(normalizeEnumValueType(undefined, OPTS(value)), value).toBe("string");
    }
    // 前提：这些都不匹配该正则
    for (const value of ["1e3", ".5", "1.", "+1"]) {
      expect(/^-?\d+(?:\.\d+)?$/.test(value), value).toBe(false);
    }
  });

  test("全是空串时长度归 0 → string", () => {
    expect(normalizeEnumValueType(undefined, OPTS("", "  "))).toBe("string");
  });

  test("不改动入参（选项数组）", () => {
    const opts = OPTS("1", "2");
    const snapshot = JSON.stringify(opts);
    normalizeEnumValueType(undefined, opts);
    expect(JSON.stringify(opts)).toBe(snapshot);
  });
});

describe("enumValueTypeForDefinitionRow：行的 valueType 优先", () => {
  test("★ `numberEnum` 恒为 number（**忽略** enumValueType）", () => {
    expect(enumValueTypeForDefinitionRow({ valueType: "numberEnum" } as never)).toBe("number");
    expect(enumValueTypeForDefinitionRow({ valueType: "numberEnum", enumValueType: "string" } as never))
      .toBe("number");
    expect(enumValueTypeForDefinitionRow({ valueType: "numberEnum", enumValueType: "number" } as never, OPTS("x")))
      .toBe("number");
  });

  test("★ `stringEnum` 恒为 string（**忽略** enumValueType 与选项）", () => {
    expect(enumValueTypeForDefinitionRow({ valueType: "stringEnum" } as never)).toBe("string");
    expect(enumValueTypeForDefinitionRow({ valueType: "stringEnum", enumValueType: "number" } as never))
      .toBe("string");
    // 选项全是数字也压成 string
    expect(enumValueTypeForDefinitionRow({ valueType: "stringEnum" } as never, OPTS("1", "2"))).toBe("string");
  });

  test("`enum` 与其它类型走 `normalizeEnumValueType`", () => {
    expect(enumValueTypeForDefinitionRow({ valueType: "enum", enumValueType: "number" } as never)).toBe("number");
    expect(enumValueTypeForDefinitionRow({ valueType: "enum", enumValueType: "string" } as never)).toBe("string");
    expect(enumValueTypeForDefinitionRow({ valueType: "enum" } as never, OPTS("1", "2"))).toBe("number");
    expect(enumValueTypeForDefinitionRow({ valueType: "enum" } as never, OPTS("1", "x"))).toBe("string");
    // 非枚举的 valueType 也会落到这条推断
    expect(enumValueTypeForDefinitionRow({ valueType: "number", enumValueType: "number" } as never)).toBe("number");
    expect(enumValueTypeForDefinitionRow({ valueType: "string" } as never, OPTS("1"))).toBe("number");
    expect(enumValueTypeForDefinitionRow({} as never)).toBe("string");
  });
});

describe("enumDefinitionValueTypeForEnumValueType：非 number 一律 stringEnum", () => {
  test("两个方向", () => {
    expect(enumDefinitionValueTypeForEnumValueType("number")).toBe("numberEnum");
    expect(enumDefinitionValueTypeForEnumValueType("string")).toBe("stringEnum");
  });

  test("★ 任何其它值都落 stringEnum（无报错、无兜底提示）", () => {
    for (const value of ["nope", "", undefined, null, 0] as never[]) {
      expect(enumDefinitionValueTypeForEnumValueType(value), String(value)).toBe("stringEnum");
    }
  });
});

describe("★ rawEnumValuesForRow：四级回退，空值**不过滤**", () => {
  test("① `enumValues` 非空 → 首选（且不 trim）", () => {
    expect(rawEnumValuesForRow(row({ enName: "x", enumValues: ["a", "b"] }))).toEqual(["a", "b"]);
    expect(rawEnumValuesForRow(row({ enName: "x", enumValues: [" a "], typicalValue: "tv" })), "★ 首选胜出")
      .toEqual([" a "]);
  });

  test("② `enumValues` 是空数组 / 非数组 → 落到 `enumOptions`", () => {
    expect(rawEnumValuesForRow(row({ enName: "x", enumValues: [], enumOptions: LOPTS([["o1", "O1"]]) })))
      .toEqual(["o1"]);
    expect(rawEnumValuesForRow(row({ enName: "x", enumValues: "s", enumOptions: LOPTS([["o1", "O1"]]) })))
      .toEqual(["o1"]);
  });

  test("③ 内置默认表（按 enName）", () => {
    expect(rawEnumValuesForRow(row({ enName: "status" }))).toEqual(["1", "0"]);
    expect(rawEnumValuesForRow(row({ enName: "  status  " }))).toEqual(["1", "0"]);
    expect(rawEnumValuesForRow(row({ enName: "STATUS" })), "★ 大写查不到 → 落 typicalValue")
      .toEqual([]);
  });

  test("④ `typicalValue`（trim 后单元素）", () => {
    expect(rawEnumValuesForRow(row({ enName: "x", typicalValue: " tv " }))).toEqual(["tv"]);
    expect(rawEnumValuesForRow(row({ enName: "x", typicalValue: "   " })), "★ 空白 → 空数组")
      .toEqual([]);
  });

  test("★ `enumValues` 里的 null / undefined 变成空串且**被保留**", () => {
    // `String(value ?? \"\")` 不做过滤 —— 探针实测 `["", "1", ""]`
    expect(rawEnumValuesForRow(row({ enName: "x", enumValues: [null, 1, undefined] })))
      .toEqual(["", "1", ""]);
  });

  test("全无 → 空数组", () => {
    expect(rawEnumValuesForRow(row({ enName: "x" }))).toEqual([]);
  });
});

describe("★ normalizeEnumOptionsForRow：三层来源 + typicalValue 补位", () => {
  test("① `enumOptions` 非空 → 主来源", () => {
    expect(normalizeEnumOptionsForRow(row({ enName: "x", enumOptions: LOPTS([["a", "A"], ["b", "B"]]) })))
      .toEqual([{ value: "a", label: "A" }, { value: "b", label: "B" }]);
  });

  test("② `enumOptions` 为空数组 → **改走内置默认表**", () => {
    // `Array.isArray(row.enumOptions) && length > 0` 假 ⇒ 走
    // `defaultEnumOptionsForDefinitionRow(row)`。
    expect(normalizeEnumOptionsForRow(row({ enName: "status", enumOptions: [] })))
      .toEqual(DEFAULT_PARAMETER_ENUM_OPTIONS.status);
    expect(normalizeEnumOptionsForRow(row({ enName: "status" })))
      .toEqual(DEFAULT_PARAMETER_ENUM_OPTIONS.status);
    expect(normalizeEnumOptionsForRow(row({ enName: "run_stat" })))
      .toEqual(DEFAULT_PARAMETER_ENUM_OPTIONS.run_stat);
  });

  test("③ 默认表也没有 → 落 `rawEnumValuesForRow`", () => {
    expect(normalizeEnumOptionsForRow(row({ enName: "nope", typicalValue: " tv " })))
      .toEqual([{ value: "tv" }]);
    expect(normalizeEnumOptionsForRow(row({ enName: "nope", enumValues: ["e1"] })))
      .toEqual([{ value: "e1" }]);
    expect(normalizeEnumOptionsForRow(row({ enName: "nope" })), "★ 全无 → 空数组").toEqual([]);
  });

  test("★ `enumValues` 只在 `enumOptions` 非空时**额外**参与（第二遍）", () => {
    // 源码：`if (Array.isArray(row.enumOptions) && row.enumOptions.length > 0)` 才跑
    // `rawEnumValuesForRow({ ...row, enumOptions: undefined })`。
    // 那一遍因 enumOptions 被置 undefined，会落到 enumValues / 默认表 / typicalValue。
    expect(normalizeEnumOptionsForRow(row({ enName: "x", enumValues: ["e1"], enumOptions: LOPTS([["a", "A"]]) })))
      .toEqual([{ value: "a", label: "A" }, { value: "e1" }]);
    // ★ enumOptions 为空数组时，第二遍**不跑** ⇒ enumValues 只在第一遍的位置
    //   （而第一遍此时走的是默认表 / rawEnumValues，rawEnumValues 又会读 enumValues）
    expect(normalizeEnumOptionsForRow(row({ enName: "x", enumValues: ["e1"], enumOptions: [] })))
      .toEqual([{ value: "e1" }]);
    // 无 enumOptions 且 enName 不在默认表 → enumValues 仍被 rawEnumValues 读到
    expect(normalizeEnumOptionsForRow(row({ enName: "x", enumValues: ["e1"] })))
      .toEqual([{ value: "e1" }]);
  });

  test("★ typicalValue 不在选项里 → 追加（无 label）", () => {
    expect(normalizeEnumOptionsForRow(row({
      enName: "x", enumOptions: LOPTS([["a", "A"]]), typicalValue: " tv "
    }))).toEqual([{ value: "a", label: "A" }, { value: "tv" }]);
  });

  test("★ typicalValue 命中 **value** → 不追加", () => {
    expect(normalizeEnumOptionsForRow(row({ enName: "x", enumOptions: LOPTS([["a", "A"]]), typicalValue: "a" })))
      .toEqual([{ value: "a", label: "A" }]);
  });

  test("★ typicalValue 命中 **label** → 仍会被第二遍追加（不是靠 typicalExists）", () => {
    // 探针实测：`enumOptions=[{value:"a",label:"AA"}]` + `typicalValue:"AA"`
    // → `[{value:"a",label:"AA"}, {value:"AA"}]`。
    // 原因：`typicalExists` 确实判 true（label 命中）所以末段不追加，
    // 但**第二遍** `rawEnumValuesForRow({...row, enumOptions: undefined})`
    // 会因 enumValues / 默认表都没有而落到 `typicalValue` → 又加一次。
    // 我第一版把这条写成「命中 label → 不追加」，被顶回。
    expect(normalizeEnumOptionsForRow(row({
      enName: "x", enumOptions: LOPTS([["a", "AA"]]), typicalValue: "AA"
    }))).toEqual([{ value: "a", label: "AA" }, { value: "AA" }]);
    // ★ 对照：typicalValue 命中 value 时，第二遍也加不出新项（去重挡下）
    expect(normalizeEnumOptionsForRow(row({
      enName: "x", enumOptions: LOPTS([["a", "AA"]]), typicalValue: "a"
    }))).toEqual([{ value: "a", label: "AA" }]);
  });

  test("★ 空白 typicalValue 不追加", () => {
    expect(normalizeEnumOptionsForRow(row({
      enName: "x", enumOptions: LOPTS([["a", "A"]]), typicalValue: "   "
    }))).toEqual([{ value: "a", label: "A" }]);
  });

  test("★ typicalValue 命中**默认表项的 label** → 也不追加（鉴别 label 判定）", () => {
    // 变异 `typicalExists` 去掉 `option.label === typicalValue` 首轮全绿。
    // 查清原因：我第一版那条「命中 label」用例里 `enumOptions` **非空**，
    // 于是第二遍 `rawEnumValuesForRow({...row, enumOptions: undefined})` 照样把
    // typicalValue 加了进去 —— 末段的 label 判定有没有，输出都一样。
    //
    // 鉴别输入必须让**第二遍不跑**（`row.enumOptions` 缺席），
    // 且 typicalValue 命中默认表项的 **label**：
    //   enName="status" → 默认表 [{value:"1",label:"闭合"},…]
    //   typicalValue="闭合" → 命中 label ⇒ 不追加
    //   （若去掉 label 判定，"闭合" 不是任何 value ⇒ 会被当新项追加）
    expect(DEFAULT_PARAMETER_ENUM_OPTIONS.status, "★ 前置").toEqual([
      { value: "1", label: "闭合" },
      { value: "0", label: "打开/开断" }
    ]);
    expect(normalizeEnumOptionsForRow(row({ enName: "status", typicalValue: "闭合" })))
      .toEqual(DEFAULT_PARAMETER_ENUM_OPTIONS.status);
    // ★ 对照：命中 value（"1"）同样不追加
    expect(normalizeEnumOptionsForRow(row({ enName: "status", typicalValue: "1" })))
      .toEqual(DEFAULT_PARAMETER_ENUM_OPTIONS.status);
    // ★ 对照：既不命中 value 也不命中 label → 追加
    expect(normalizeEnumOptionsForRow(row({ enName: "status", typicalValue: "自定义" })))
      .toEqual([...DEFAULT_PARAMETER_ENUM_OPTIONS.status, { value: "自定义" }]);
    // 前提：第二遍确实不跑（enumOptions 缺席）
    expect(normalizeEnumOptionsForRow(row({ enName: "status", typicalValue: "闭合" })))
      .toHaveLength(2);
  });

  test("★ 去重按 value，**保留首个的 label**", () => {
    expect(normalizeEnumOptionsForRow(row({ enName: "x", enumOptions: LOPTS([["a", "A1"], ["a", "A2"]]) })))
      .toEqual([{ value: "a", label: "A1" }]);
    // 首个无 label、第二个有 label → 仍是首个（无 label）
    expect(normalizeEnumOptionsForRow(row({
      enName: "x", enumOptions: [{ value: "a" }, { value: "a", label: "A2" }]
    }))).toEqual([{ value: "a" }]);
  });

  test("空串项 / 空白项被 `normalizeEnumOption` 滤掉", () => {
    expect(normalizeEnumOptionsForRow(row({ enName: "x", enumOptions: LOPTS([["a", "A"], ["", "空"], ["  ", "空白"]]) })))
      .toEqual([{ value: "a", label: "A" }]);
  });

  test("非数组的 `enumOptions` → 走默认表 / rawEnumValues", () => {
    expect(normalizeEnumOptionsForRow(row({ enName: "status", enumOptions: "s" })))
      .toEqual(DEFAULT_PARAMETER_ENUM_OPTIONS.status);
    expect(normalizeEnumOptionsForRow(row({ enName: "nope", enumOptions: "s" })))
      .toEqual([]);
  });

  test("label 缺省时只有 value 键", () => {
    const out = normalizeEnumOptionsForRow(row({ enName: "x", enumOptions: [{ value: "a" }] }));
    expect(out).toEqual([{ value: "a" }]);
    expect(Object.keys(out[0])).toEqual(["value"]);
  });

  test("不改入参（`enumOptions` 数组不被改写）", () => {
    const input = row({ enName: "x", enumOptions: LOPTS([["a", "A"]]) });
    const snapshot = JSON.stringify(input);
    normalizeEnumOptionsForRow(input);
    expect(JSON.stringify(input)).toBe(snapshot);
  });

  test("同一输入恒得同一结果", () => {
    const input = row({ enName: "status", enumValues: ["e1"], typicalValue: "tv" });
    const once = normalizeEnumOptionsForRow(input);
    for (let i = 0; i < 20; i += 1) {
      expect(normalizeEnumOptionsForRow(input)).toEqual(once);
    }
  });
});

describe("enumValueFromOptions：value → label → 原样", () => {
  const options = LOPTS([["1", "闭合"], ["0", "打开"]]);

  test("按 value 命中", () => {
    expect(enumValueFromOptions("1", options)).toBe("1");
    expect(enumValueFromOptions("0", options)).toBe("0");
  });

  test("★ 按 label 命中 → 返回对应 value", () => {
    expect(enumValueFromOptions("闭合", options)).toBe("1");
    expect(enumValueFromOptions("打开", options)).toBe("0");
  });

  test("都没命中 → 原样返回（trim 后）", () => {
    expect(enumValueFromOptions("2", options)).toBe("2");
    expect(enumValueFromOptions(" 1 ", options), "★ 先 trim 再匹配").toBe("1");
    expect(enumValueFromOptions("  x  ", options)).toBe("x");
  });

  test("★ 空白 / nullish → 空串（不落到原样分支）", () => {
    expect(enumValueFromOptions("", options)).toBe("");
    expect(enumValueFromOptions("   ", options)).toBe("");
    expect(enumValueFromOptions(null as never, options), "★ null 走 `String(null ?? \"\")`").toBe("");
    expect(enumValueFromOptions(undefined as never, options), "★ undefined 同理").toBe("");
  });

  test("数字入参经 `String` 后匹配", () => {
    expect(enumValueFromOptions(1 as never, options)).toBe("1");
  });

  test("★ value 优先于 label（同名时取 value 那一项）", () => {
    const ambiguous = LOPTS([["x", "x"], ["y", "z"]]);
    expect(enumValueFromOptions("x", ambiguous), "★ 先找 value").toBe("x");
    // 若顺序反过来：先 label 找 → "x" 的 label 也是 "x"，结果相同 ——
    // 所以这条差异只在 value 与 label 交叉时才可见
    const cross = LOPTS([["a", "b"], ["b", "c"]]);
    expect(enumValueFromOptions("b", cross), "★ value=a 的 label=b，但先按 value 找 b").toBe("b");
  });
});

describe("enumDisplayText：三种拼接格式", () => {
  test("`string` 枚举 → 只显示 value", () => {
    expect(enumDisplayText({ value: "1", label: "闭合" }, "string")).toBe("1");
  });

  test("`number` 枚举 → `label (value)`", () => {
    expect(enumDisplayText({ value: "1", label: "闭合" }, "number")).toBe("闭合 (1)");
  });

  test("★ 未指定类型 → `value / label`（**与 number 的格式不同**）", () => {
    expect(enumDisplayText({ value: "1", label: "闭合" }, undefined)).toBe("1 / 闭合");
    expect(enumDisplayText({ value: "1", label: "闭合" })).toBe("1 / 闭合");
  });

  test("label 缺省 / 空白 / 等于 value → 只显示 value", () => {
    expect(enumDisplayText({ value: "1" }, "number")).toBe("1");
    expect(enumDisplayText({ value: "1", label: "  " }, "number")).toBe("1");
    expect(enumDisplayText({ value: "1", label: "1" }, "number")).toBe("1");
    expect(enumDisplayText({ value: "1" })).toBe("1");
  });

  test("label 也会被 trim", () => {
    expect(enumDisplayText({ value: "1", label: "  闭合  " }, "number")).toBe("闭合 (1)");
  });
});
