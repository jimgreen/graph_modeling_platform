// src/model.ts：E 文件的**列值归一**
//   normalizeControlTypeForE                  控制类型中文别名 → E 值（7 个别名）
//   normalizeDcdcEndpointControlTypeForE      DCDC 变流器端点控制类型
//   normalizeAcacEndpointControlTypeForE      ACAC 变流器端点控制类型
//   normalizeAcGeneratorControlTypeForE       交流发电控制类型
//   normalizeDcGeneratorControlTypeForE       直流发电控制类型
//   normalizeDcacAcControlTypeForE            DCAC 变流器交流侧控制类型
//   normalizeDcacDcControlTypeForE            DCAC 变流器直流侧控制类型
//   acacConverterControlTypePairForE          ACAC 变流器 i/j 两侧控制方式
//   dcdcConverterControlTypePairForE          DCDC 变流器 i/j 两侧控制方式
//   dcacConverterControlTypePairForE          DCAC 变流器交/直流两侧控制方式
//   mappedLegacyEValue                        E 列取值的**旧字段回退链**
//   normalizeDeviceStatusForE / normalizeSwitchStatusForE   开关状态（14 个别名）
//   normalizeRunStatValue                     运行状态（10 个别名）
//   normalizeRunStatParameterDefinition       运行状态参数定义的**强制归一**
//
// 这几个函数直接决定 **E 文件里写出去的列值**。判错的后果是导出文件里那一列
// 写着错值 —— 下游 CIM/E 文件解析器读出来是另一个设备类型，且**不报错**。
import { describe, expect, test } from "vitest";
import {
  ACAC_CONVERTER_CONTROL_TYPES,
  ACAC_SIDE_CONTROL_TYPES,
  AC_GENERATOR_CONTROL_TYPES,
  DCAC_AC_CONTROL_TYPES,
  DCAC_CONVERTER_CONTROL_TYPES,
  DCAC_DC_CONTROL_TYPES,
  DC_GENERATOR_CONTROL_TYPES,
  DCDC_CONVERTER_CONTROL_TYPES,
  RUN_STAT_ENUM_OPTIONS,
  RUN_STAT_ENUM_VALUES,
  acacConverterControlTypePairForE,
  dcdcConverterControlTypePairForE,
  dcacConverterControlTypePairForE,
  mappedLegacyEValue,
  normalizeAcGeneratorControlTypeForE,
  normalizeAcacEndpointControlTypeForE,
  normalizeControlTypeForE,
  normalizeDcacAcControlTypeForE,
  normalizeDcacDcControlTypeForE,
  normalizeDcdcEndpointControlTypeForE,
  normalizeDcGeneratorControlTypeForE,
  normalizeDeviceStatusForE,
  normalizeRunStatParameterDefinition,
  normalizeRunStatValue,
  normalizeSwitchStatusForE,
  type DeviceParameterDefinition
} from "./model";

describe("常量：三份控制类型清单", () => {
  test("ACAC 四值 / DCDC 与 DC 发电四值", () => {
    expect([...ACAC_SIDE_CONTROL_TYPES]).toEqual(["PQ", "PV", "PH", "NONE"]);
    expect([...DCDC_CONVERTER_CONTROL_TYPES]).toEqual(["P", "V", "I", "NONE"]);
    expect([...DC_GENERATOR_CONTROL_TYPES]).toEqual(["P", "V", "I", "NONE"]);
  });

  test("`DCDC_CONVERTER_CONTROL_TYPES` 与 `DC_GENERATOR_CONTROL_TYPES` **逐项相同**", () => {
    // 两份常量内容一致但**不是同一个引用**（各自 `as const` 字面量）。
    // 若哪天其中一份改动，下面这条会先转红 —— 它们必须同步。
    expect([...DCDC_CONVERTER_CONTROL_TYPES]).toEqual([...DC_GENERATOR_CONTROL_TYPES]);
    expect(DCDC_CONVERTER_CONTROL_TYPES).not.toBe(DC_GENERATOR_CONTROL_TYPES);
  });

  test("运行状态的枚举值与选项", () => {
    expect([...RUN_STAT_ENUM_VALUES]).toEqual(["1", "0"]);
    expect(RUN_STAT_ENUM_OPTIONS.map((o) => [o.value, o.label])).toEqual([
      ["1", "运行"],
      ["0", "停运"]
    ]);
  });
});

describe("normalizeControlTypeForE：7 个中文别名，键区分大小写", () => {
  test("别名表逐条钉住", () => {
    const table: Array<[string, string]> = [
      ["定P", "P"], ["定V", "V"], ["定I", "I"],
      ["定PQ", "PQ"], ["定PV", "PV"], ["定PH", "PH"],
      ["不定", "0"]
    ];
    for (const [input, expected] of table) {
      expect(normalizeControlTypeForE(input), input).toBe(expected);
    }
  });

  test("非别名原样返回（trim 后）", () => {
    for (const value of ["PQ", "PV", "PH", "P", "V", "I", "NONE", "0"]) {
      expect(normalizeControlTypeForE(value), value).toBe(value);
    }
    expect(normalizeControlTypeForE("  定PQ  ")).toBe("PQ");
    expect(normalizeControlTypeForE("  PQ  ")).toBe("PQ");
  });

  test("★ 键**区分大小写** —— 英文别名小写不命中", () => {
    // 表在函数体内（源码注释说明提到顶层实测更慢、已回退），键是中文大写形式，
    // 所以「定pq」/「定Pq」都不命中，原样返回。
    expect(normalizeControlTypeForE("定pq")).toBe("定pq");
    expect(normalizeControlTypeForE("定Pq")).toBe("定Pq");
    expect(normalizeControlTypeForE("定p")).toBe("定p");
  });

  test("空值 / 缺席 → `\"\"`", () => {
    expect(normalizeControlTypeForE("")).toBe("");
    expect(normalizeControlTypeForE("   ")).toBe("");
    expect(normalizeControlTypeForE(undefined)).toBe("");
  });

  test("★ 返回类型标注 `string`，但原型链键返回**非字符串**", () => {
    // `map[trimmed] ?? trimmed` 走原型链：`toString` / `constructor` 取到函数，
    // `__proto__` 取到 `Object.prototype`。与 `containerRelationParamKey` 同一类。
    // **判定不修**：`control_type` 来自 E 文件的**列定义表**（静态），不是外部输入；
    // 下面三个调用点立刻会因 `.toUpperCase` 抛错而暴露，不静默。
    expect(typeof normalizeControlTypeForE("toString"), "toString → 函数").toBe("function");
    expect(typeof normalizeControlTypeForE("constructor"), "constructor → 函数").toBe("function");
    expect(typeof normalizeControlTypeForE("hasOwnProperty"), "hasOwnProperty → 函数").toBe("function");
    // `__proto__` 取到的是 Object.prototype —— 它本身是 object，所以只能断言
    // 「不是字符串」，不能断言「不是 object」（我第一版写错了，被顶回）。
    expect(typeof normalizeControlTypeForE("__proto__")).not.toBe("string");
    expect(normalizeControlTypeForE("__proto__")).toBe(Object.prototype);
    // 对照：正常别名是字符串
    expect(typeof normalizeControlTypeForE("定PQ")).toBe("string");
  });
});

describe("normalizeDcdcEndpointControlTypeForE：CTRL_* 前缀映射 + SLACK→NONE", () => {
  const table: Array<[string, string]> = [
    ["P", "P"], ["V", "V"], ["I", "I"],
    ["CTRL_P", "P"], ["ctrl_p", "P"], ["CTRL_V", "V"], ["CTRL_I", "I"],
    ["SLACK", "NONE"], ["slack", "NONE"], ["Slack", "NONE"],
    ["0", "NONE"], ["NONE", "NONE"]
  ];
  for (const [input, expected] of table) {
    test(`${JSON.stringify(input).padEnd(10)} → ${expected}`, () => {
      expect(normalizeDcdcEndpointControlTypeForE(input)).toBe(expected);
    });
  }

  test("★ 判定先把 `normalizeControlTypeForE` 的结果**大写化**再查映射", () => {
    // 所以 `ctrl_p`（小写）能命中 `CTRL_P` 那一项。
    expect(normalizeDcdcEndpointControlTypeForE("ctrl_p")).toBe("P");
    expect(normalizeDcdcEndpointControlTypeForE("CTRL_P")).toBe("P");
    expect(normalizeDcdcEndpointControlTypeForE("Ctrl_P")).toBe("P");
  });

  test("中文别名也走通（先归一再查表）", () => {
    expect(normalizeDcdcEndpointControlTypeForE("定P")).toBe("P");
    expect(normalizeDcdcEndpointControlTypeForE("定V")).toBe("V");
    expect(normalizeDcdcEndpointControlTypeForE("定I")).toBe("I");
  });

  test("★ 未命中清单 → 返回**原 text**（trim 后、保留原大小写）", () => {
    // 注意不是返回 `mapped`（那会是大写化的结果），也不是 `normalized`。
    expect(normalizeDcdcEndpointControlTypeForE("zzz")).toBe("zzz");
    expect(normalizeDcdcEndpointControlTypeForE("zZz")).toBe("zZz");
    expect(normalizeDcdcEndpointControlTypeForE("  zzz  ")).toBe("zzz");
    // `PQ` 不是 DCDC 清单的值 → 原样返回（而不是被映射成什么）
    expect(normalizeDcdcEndpointControlTypeForE("PQ")).toBe("PQ");
  });

  test("空值 / 缺席 → fallback（默认 `NONE`）", () => {
    expect(normalizeDcdcEndpointControlTypeForE("")).toBe("NONE");
    expect(normalizeDcdcEndpointControlTypeForE("   ")).toBe("NONE");
    expect(normalizeDcdcEndpointControlTypeForE(undefined)).toBe("NONE");
    // fallback 可自定义
    expect(normalizeDcdcEndpointControlTypeForE(undefined, "ZZZ")).toBe("ZZZ");
    // ★ fallback **不校验**是否在清单内
    expect(normalizeDcdcEndpointControlTypeForE("", "ZZZ")).toBe("ZZZ");
    expect(normalizeDcdcEndpointControlTypeForE("", "")).toBe("");
  });

  test("★ 原型链键抛 TypeError（`.toUpperCase` 拿到函数）", () => {
    // 这是上一组 `normalizeControlTypeForE` 的原型链洞在下游的**显形**点 ——
    // 不是静默产出错值，而是立刻抛错。
    for (const value of ["toString", "constructor", "__proto__", "hasOwnProperty"]) {
      expect(() => normalizeDcdcEndpointControlTypeForE(value), value).toThrow(TypeError);
    }
    expect(() => normalizeAcacEndpointControlTypeForE("toString")).toThrow(TypeError);
  });
});

describe("normalizeAcacEndpointControlTypeForE：Q→PQ、V→PV、0→NONE", () => {
  test("四清单值原样保留", () => {
    for (const value of ["PQ", "PV", "PH", "NONE"]) {
      expect(normalizeAcacEndpointControlTypeForE(value), value).toBe(value);
    }
  });

  test("单字母映射", () => {
    expect(normalizeAcacEndpointControlTypeForE("Q")).toBe("PQ");
    expect(normalizeAcacEndpointControlTypeForE("V")).toBe("PV");
    expect(normalizeAcacEndpointControlTypeForE("0")).toBe("NONE");
  });

  test("★ 英文别名小写**会**命中（因为先大写化）", () => {
    expect(normalizeAcacEndpointControlTypeForE("pq")).toBe("PQ");
    expect(normalizeAcacEndpointControlTypeForE("q")).toBe("PQ");
    expect(normalizeAcacEndpointControlTypeForE("v")).toBe("PV");
  });

  test("中文别名走通", () => {
    expect(normalizeAcacEndpointControlTypeForE("定PQ")).toBe("PQ");
    expect(normalizeAcacEndpointControlTypeForE("定PV")).toBe("PV");
    expect(normalizeAcacEndpointControlTypeForE("定PH")).toBe("PH");
  });

  test("★ 未命中 → 返回原 text（`CTRL_P` 不会被剥前缀）", () => {
    // 与 DCDC 版不同：ACAC 版**没有** `CTRL_* → 单字母的映射表，
    // 所以 `CTRL_P` 原样穿透（`CTRL_P` 也不在 ACAC 清单里）。
    expect(normalizeAcacEndpointControlTypeForE("CTRL_P")).toBe("CTRL_P");
    expect(normalizeAcacEndpointControlTypeForE("SLACK")).toBe("SLACK");
    expect(normalizeAcacEndpointControlTypeForE("zzz")).toBe("zzz");
    expect(normalizeAcacEndpointControlTypeForE("P")).toBe("P");
    expect(normalizeAcacEndpointControlTypeForE("I")).toBe("I");
  });

  test("空值 / 缺席 → fallback（默认 `PQ`）", () => {
    expect(normalizeAcacEndpointControlTypeForE("")).toBe("PQ");
    expect(normalizeAcacEndpointControlTypeForE(undefined)).toBe("PQ");
    expect(normalizeAcacEndpointControlTypeForE(undefined, "ZZZ")).toBe("ZZZ");
    expect(normalizeAcacEndpointControlTypeForE("", "ZZZ")).toBe("ZZZ");
  });
});

describe("normalizeDeviceStatusForE / normalizeSwitchStatusForE：14 个别名 + 兜底", () => {
  test("★ `normalizeSwitchStatusForE` 只是转发（两者逐值相同）", () => {
    for (const value of ["0", "1", "打开", "闭合", "open", "off", "zzz", "", undefined] as never[]) {
      expect(normalizeSwitchStatusForE(value as never), String(value))
        .toBe(normalizeDeviceStatusForE(value as never));
    }
  });

  test("假值别名（7 个）", () => {
    for (const value of ["0", "打开", "开断", "打开/开断", "分闸", "open", "off", "false"]) {
      expect(normalizeDeviceStatusForE(value), value).toBe("0");
    }
  });

  test("真值别名（6 个）", () => {
    for (const value of ["1", "闭合", "合闸", "closed", "on", "true"]) {
      expect(normalizeDeviceStatusForE(value), value).toBe("1");
    }
  });

  test("★ 每个别名**各自**再钉一遍（只把「大写版」归一到小写版是不够的）", () => {
    // 变异 ⑨（摘掉 `lower === "closed"`）全绿 —— 但这次**不是**输入覆盖不足，
    // 而是**真等价**：见下面「等价变异 ⑨」那条的解释与证明。
    // 这里把每个别名的**期望值**单独写死：有鉴别力的是**假值**别名
    //（删掉后 `"0"` 变 `"1"`，与兜底相反）；真值别名天然无鉴别力。
    const falsy: Array<[string, string]> = [
      ["0", "0"], ["打开", "0"], ["开断", "0"], ["打开/开断", "0"], ["分闸", "0"],
      ["open", "0"], ["off", "0"], ["false", "0"]
    ];
    for (const [value, expected] of falsy) {
      expect(normalizeDeviceStatusForE(value), `假值 ${value}`).toBe(expected);
    }
    const truthy: Array<[string, string]> = [
      ["1", "1"], ["闭合", "1"], ["合闸", "1"], ["closed", "1"], ["on", "1"], ["true", "1"]
    ];
    for (const [value, expected] of truthy) {
      expect(normalizeDeviceStatusForE(value), `真值 ${value}`).toBe(expected);
    }
    // ★ 鉴别力的来源：兜底是 `"1"`，所以**假值别名**才有鉴别力
    //   （真值别名被删后仍得 `"1"`，与兜底一致 —— 不可见）。
    // 这正是 AGENTS.md 那条「断言值不能等于默认值」的直接应用。
    expect(normalizeDeviceStatusForE("zzz"), "兜底值").toBe("1");
    expect(normalizeDeviceStatusForE("false"), "★ 这一条与兜底相反").toBe("0");
  });

  test("★ 英文别名**大小写不敏感**（中文别名则敏感）", () => {
    for (const value of ["OPEN", "Off", "FALSE", "Closed", "ON", "True"]) {
      expect(normalizeDeviceStatusForE(value), value).toBe(
        normalizeDeviceStatusForE(value.toLowerCase())
      );
    }
    // 中文没有大小写；`打开` 命中，但 `打开 `（尾空格）也命中（先 trim）
    expect(normalizeDeviceStatusForE("  打开  ")).toBe("0");
  });

  test("★ 未命中一律返回 `\"1\"` —— 只有**空值**返回 `\"\"`", () => {
    expect(normalizeDeviceStatusForE("zzz")).toBe("1");
    expect(normalizeDeviceStatusForE("0.5")).toBe("1");
    expect(normalizeDeviceStatusForE("2")).toBe("1");
    expect(normalizeDeviceStatusForE("")).toBe("");
    expect(normalizeDeviceStatusForE("   ")).toBe("");
    expect(normalizeDeviceStatusForE(undefined)).toBe("");
  });

  test("首尾空白被 trim", () => {
    expect(normalizeDeviceStatusForE("  1  ")).toBe("1");
    expect(normalizeDeviceStatusForE("\t闭合\n")).toBe("1");
  });
});

test("★ 等价变异 ⑨ 全绿是**正确的**（摘掉真值别名 `closed`）", () => {
  // 变异：真值分支里删掉 `lower === "closed" ||`。
  //   —— 真值分支的返回值是 `"1"`，而**函数末尾的兜底也是 `return "1"`**。
  //      所以「命中 `closed`」与「两个分支都不命中、落到兜底」输出**逐字节相同**。
  //   ⇒ 真值别名（`1` / `闭合` / `合闸` / `closed` / `on` / `true`）中的**任何一条**
  //      被单独摘掉，输出都不变 —— 这不是覆盖不足，是结构上的不可辨识。
  //
  //   有鉴别力的只有**假值**别名：它们返回 `"0"`，与兜底 `"1"` 相反。
  //   上一个用例逐条钉了 8 个假值别名，正是为此（变异 ⑩ 删掉 `false` 被抓住）。
  //
  //   ⚠ 什么会让它失效：若把末尾兜底从 `return "1"` 改成别的值
  //      （例如 `normalizeDeviceStatusForDisplayMatch` 那份就返回 `""`），
  //      真值别名立刻全部有鉴别力。
  expect(normalizeDeviceStatusForE("closed"), "闭合一侧").toBe("1");
  expect(normalizeDeviceStatusForE("zzz"), "兜底与真值分支同值 → 不可辨识").toBe("1");
  expect(normalizeDeviceStatusForE("false"), "★ 假值侧与兜底相反 → 有鉴别力").toBe("0");
});

describe("normalizeRunStatValue：10 个别名，未命中返回原文", () => {
  test("真值别名（5 个）", () => {
    for (const value of ["1", "运行", "投运", "on", "true"]) {
      expect(normalizeRunStatValue(value), value).toBe("1");
    }
  });

  test("假值别名（5 个）", () => {
    for (const value of ["0", "停运", "检修", "off", "false"]) {
      expect(normalizeRunStatValue(value), value).toBe("0");
    }
  });

  test("★ 判定用小写化后的值，命中后返回**固定串**", () => {
    for (const value of ["ON", "True", "运行"]) {
      expect(normalizeRunStatValue(value), value).toBe("1");
    }
    for (const value of ["OFF", "False", "停运"]) {
      expect(normalizeRunStatValue(value), value).toBe("0");
    }
    expect(normalizeRunStatValue("  运行  "), "先 trim 再判").toBe("1");
  });

  test("★ 未命中返回**原文**（trim 后，不小写化）", () => {
    expect(normalizeRunStatValue("运行中")).toBe("运行中");
    expect(normalizeRunStatValue("Run")).toBe("Run");
    expect(normalizeRunStatValue("1.0")).toBe("1.0");
    expect(normalizeRunStatValue("2")).toBe("2");
  });

  test("空值 / 缺席 → fallback（默认 `\"\"`）", () => {
    expect(normalizeRunStatValue("")).toBe("");
    expect(normalizeRunStatValue("   ")).toBe("");
    expect(normalizeRunStatValue(undefined)).toBe("");
    expect(normalizeRunStatValue("", "9")).toBe("9");
    expect(normalizeRunStatValue(undefined, "9")).toBe("9");
    // fallback 同样不校验
    expect(normalizeRunStatValue("", "zzz")).toBe("zzz");
  });

  test("非字符串值经 `String()` 强转", () => {
    expect(normalizeRunStatValue(1)).toBe("1");
    expect(normalizeRunStatValue(0)).toBe("0");
    expect(normalizeRunStatValue(true)).toBe("1");
    expect(normalizeRunStatValue(null)).toBe("");
  });
});

describe("normalizeRunStatParameterDefinition：只对 run_stat / runStat 生效", () => {
  const def = (over: Record<string, unknown> = {}) => ({
    enName: "run_stat",
    valueType: "string",
    typicalValue: "0",
    enumValues: ["x"],
    enumOptions: [],
    ...over
  }) as unknown as DeviceParameterDefinition;

  test("命中的输出表逐键钉住", () => {
    expect(normalizeRunStatParameterDefinition(def())).toEqual({
      enName: "run_stat",
      valueType: "numberEnum",
      typicalValue: "0",
      enumValues: ["1", "0"],
      enumOptions: [
        { value: "1", label: "运行" },
        { value: "0", label: "停运" }
      ],
      enumValueType: "number"
    });
  });

  test("★ 键序固定（会被序列化进存盘）", () => {
    expect(Object.keys(normalizeRunStatParameterDefinition(def()))).toEqual([
      "enName", "valueType", "typicalValue", "enumValues", "enumOptions", "enumValueType"
    ]);
  });

  test("★ 正则 `^(?:run_stat|runStat)$` 带 `u` 标志 —— 大写与前缀都不命中", () => {
    expect(normalizeRunStatParameterDefinition(def({ enName: "runStat" })).enName).toBe("run_stat");
    // trim 后命中
    expect(normalizeRunStatParameterDefinition(def({ enName: "  run_stat  " })).enName).toBe("run_stat");
    // ★ 大写不命中
    expect(normalizeRunStatParameterDefinition(def({ enName: "RUN_STAT" })).enName).toBe("RUN_STAT");
    expect(normalizeRunStatParameterDefinition(def({ enName: "RunStat" })).enName).toBe("RunStat");
    // ★ 前缀 / 后缀不命中
    expect(normalizeRunStatParameterDefinition(def({ enName: "run_stat_x" })).enName).toBe("run_stat_x");
    expect(normalizeRunStatParameterDefinition(def({ enName: "x_run_stat" })).enName).toBe("x_run_stat");
    expect(normalizeRunStatParameterDefinition(def({ enName: "runstat" })).enName).toBe("runstat");
  });

  test("★ 未命中时返回**原对象引用**（不是拷贝）", () => {
    // 这意味着调用方能靠引用相等判断「这条定义被动过没有」。
    for (const enName of ["other", "RUN_STAT", "runstat", undefined, ""]) {
      const input = def({ enName });
      expect(normalizeRunStatParameterDefinition(input), String(enName)).toBe(input);
    }
    // 命中时是新对象
    const hit = def();
    expect(normalizeRunStatParameterDefinition(hit)).not.toBe(hit);
  });

  test("★ `typicalValue` 走 `normalizeRunStatValue`，不在枚举内则回落 `\"1\"`", () => {
    // `typicalValue` 先过 `normalizeRunStatValue(v, "1")`，再判是否在
    // `["1","0"]` 内。所以任何能归一成 `"0"` 的形态都保留 `"0"`：
    //   `"0"` / 数字 `0` / `"停运"` / `"检修"` / `"off"` / `"false"`
    // 其余一律回落 `"1"`。
    const table: Array<[unknown, string]> = [
      ["1", "1"], ["0", "0"], [0, "0"],
      ["运行", "1"], ["投运", "1"], ["on", "1"], ["true", "1"], ["ON", "1"],
      ["停运", "0"], ["检修", "0"], ["off", "0"], ["false", "0"],
      ["zzz", "1"], [1, "1"], [null, "1"], [undefined, "1"], ["", "1"]
    ];
    for (const [input, expected] of table) {
      expect(normalizeRunStatParameterDefinition(def({ typicalValue: input })).typicalValue,
        String(input)).toBe(expected);
    }
    // ★ `"0"` 是唯一能产出 `"0"` 的形态：数字 `0` 经 `String(0)` 也是 `"0"`，
    //   命中假值别名 → `"0"` → 在枚举内 → 保留。所以表里 `0` 的结果是 `"0"`。
    // （我第一版把 `0` 期望成 `"1"`，被顶回：漏了 `String(0) === "0"` 这一步。）
    expect(normalizeRunStatParameterDefinition(def({ typicalValue: 0 })).typicalValue).toBe("0");
  });

  test("★ `enumValues` / `enumOptions` 是**深拷贝**（含元素）", () => {
    // 调用方可就地改枚举而不污染模块常量。
    const out = normalizeRunStatParameterDefinition(def());
    const values = out.enumValues as string[];
    const options = out.enumOptions as Array<{ value: string; label: string }>;
    expect(values).not.toBe(RUN_STAT_ENUM_VALUES);
    expect(options).not.toBe(RUN_STAT_ENUM_OPTIONS);
    expect(options[0]).not.toBe(RUN_STAT_ENUM_OPTIONS[0]);
    // 改了不影响常量
    values.push("2");
    options[0].label = "改了";
    expect([...RUN_STAT_ENUM_VALUES]).toEqual(["1", "0"]);
    expect(RUN_STAT_ENUM_OPTIONS[0].label).toBe("运行");
  });

  test("★ `valueType` 与 `enumValueType` 被**强制**改写", () => {
    for (const valueType of ["string", "number", "stringEnum", "boolean", undefined]) {
      const out = normalizeRunStatParameterDefinition(def({ valueType }));
      expect(out.valueType, String(valueType)).toBe("numberEnum");
    }
    for (const enumValueType of ["string", undefined, 5]) {
      expect(normalizeRunStatParameterDefinition(def({ enumValueType })).enumValueType, "强制 number").toBe("number");
    }
  });

  test("入参的其余字段被带过（未被列举的字段不丢）", () => {
    const input = def({ description: "说明", section: "交流设备" });
    const out = normalizeRunStatParameterDefinition(input) as unknown as Record<string, unknown>;
    expect(out.description).toBe("说明");
    expect(out.section).toBe("交流设备");
  });
});

describe("常量：其余四份控制类型清单", () => {
  test("ACAC legacy 三字表 / 交流发电 / DCAC 两侧 / DCAC 模式", () => {
    expect([...ACAC_CONVERTER_CONTROL_TYPES]).toEqual(["PQQ", "PVQ", "PQV", "PVV"]);
    expect([...AC_GENERATOR_CONTROL_TYPES]).toEqual(["PV", "PQ", "PH"]);
    expect([...DCAC_AC_CONTROL_TYPES]).toEqual(["PQ", "PV", "PH", "NONE"]);
    expect([...DCAC_DC_CONTROL_TYPES]).toEqual(["P", "V", "I", "NONE"]);
    expect([...DCAC_CONVERTER_CONTROL_TYPES]).toEqual(["DCV", "ACV", "ACP"]);
  });

  test("ACAC_SIDE / DCDC 清单是 DCAC 两侧清单的**别名引用**（同值同引用）", () => {
    // 这两条是 `export const X = DCAC_Y`（重新赋值，不是再写一份字面量），
    // 所以引用相等；若哪天改成各写一份，此处转红。
    expect(ACAC_SIDE_CONTROL_TYPES).toBe(DCAC_AC_CONTROL_TYPES);
    expect(DCDC_CONVERTER_CONTROL_TYPES).toBe(DCAC_DC_CONTROL_TYPES);
  });
});

describe("normalizeAcGeneratorControlTypeForE", () => {
  test("空值 / undefined 回落默认 PV", () => {
    expect(normalizeAcGeneratorControlTypeForE()).toBe("PV");
    expect(normalizeAcGeneratorControlTypeForE("")).toBe("PV");
  });

  test("表内值与中文别名归一，表外值**原样返回 trim 后的文本**", () => {
    for (const value of ["PV", "PQ", "PH"]) {
      expect(normalizeAcGeneratorControlTypeForE(value), value).toBe(value);
    }
    expect(normalizeAcGeneratorControlTypeForE("定PV")).toBe("PV");
    expect(normalizeAcGeneratorControlTypeForE("定PQ")).toBe("PQ");
    expect(normalizeAcGeneratorControlTypeForE("定PH")).toBe("PH");
    // 表外：归一后仍不在清单里 —— 返回 trim 后的**原文本**，不返回归一值
    expect(normalizeAcGeneratorControlTypeForE("NOPE")).toBe("NOPE");
    expect(normalizeAcGeneratorControlTypeForE("  pq  ")).toBe("pq");
    // 定V 归一成 V，V 不在交流发电清单里 —— 回落原文本「定V」
    expect(normalizeAcGeneratorControlTypeForE("定V")).toBe("定V");
    // 不定 归一成 "0"，同样表外 —— 回落原文本
    expect(normalizeAcGeneratorControlTypeForE("不定")).toBe("不定");
    expect(normalizeAcGeneratorControlTypeForE("0")).toBe("0");
    // ★ 纯空白不是「空值」：`!value` 判的是空串而非 trim 后为空，
    //   于是这里返回 trim 后的空串 ""，而不是默认值 "PV"
    expect(normalizeAcGeneratorControlTypeForE("   ")).toBe("");
  });

  test("大小写敏感：小写 pq 不被认作 PQ", () => {
    expect(normalizeAcGeneratorControlTypeForE("pq")).toBe("pq");
    expect(normalizeAcGeneratorControlTypeForE("pv")).toBe("pv");
  });
});

describe("normalizeDcGeneratorControlTypeForE", () => {
  test("空值 / undefined 回落默认 P（与交流侧的 PV 不同）", () => {
    expect(normalizeDcGeneratorControlTypeForE()).toBe("P");
    expect(normalizeDcGeneratorControlTypeForE("")).toBe("P");
  });

  test("表内四值 P/V/I/NONE 与中文别名归一，表外原样返回", () => {
    for (const value of ["P", "V", "I", "NONE"]) {
      expect(normalizeDcGeneratorControlTypeForE(value), value).toBe(value);
    }
    expect(normalizeDcGeneratorControlTypeForE("定P")).toBe("P");
    expect(normalizeDcGeneratorControlTypeForE("定I")).toBe("I");
    // 交流侧的值在直流清单里没有 —— 回落原文本
    expect(normalizeDcGeneratorControlTypeForE("PV")).toBe("PV");
    expect(normalizeDcGeneratorControlTypeForE("定PV")).toBe("定PV");
    expect(normalizeDcGeneratorControlTypeForE("zzz")).toBe("zzz");
    // ★ 表外值走的是 **trim 后的文本**：去掉 trim 会把两侧空白一起带出来
    expect(normalizeDcGeneratorControlTypeForE("  zzz  ")).toBe("zzz");
    // 表内值看不出 trim（归一器自己先 trim 过），所以只有表外这条能钉住
    expect(normalizeDcGeneratorControlTypeForE("  P  ")).toBe("P");
    // ★ 「不定」归一成 "0"，但直流清单收的是 NONE 字面量、没有 "0" —— 仍属表外
    expect(normalizeDcGeneratorControlTypeForE("0")).toBe("0");
    expect(normalizeDcGeneratorControlTypeForE("不定")).toBe("不定");
    // 大小写敏感
    expect(normalizeDcGeneratorControlTypeForE("p")).toBe("p");
  });
});

describe("normalizeDcacAcControlTypeForE", () => {
  test("空值回落默认 PQ，fallback 参数原样透出", () => {
    expect(normalizeDcacAcControlTypeForE()).toBe("PQ");
    expect(normalizeDcacAcControlTypeForE("")).toBe("PQ");
    expect(normalizeDcacAcControlTypeForE("   ")).toBe("PQ");
    // ★ fallback 不校验：传什么就返回什么（不查清单）
    expect(normalizeDcacAcControlTypeForE(undefined, "PH")).toBe("PH");
    expect(normalizeDcacAcControlTypeForE("  ", "P")).toBe("P");
  });

  test("Q→PQ、V→PV、0→NONE 三条缩写归一", () => {
    expect(normalizeDcacAcControlTypeForE("Q")).toBe("PQ");
    expect(normalizeDcacAcControlTypeForE("V")).toBe("PV");
    expect(normalizeDcacAcControlTypeForE("0")).toBe("NONE");
    expect(normalizeDcacAcControlTypeForE("不定")).toBe("NONE");
  });

  test("表内四值透传，输入统一**大写化**（pq→PQ、none→NONE）", () => {
    expect(normalizeDcacAcControlTypeForE("pq")).toBe("PQ");
    expect(normalizeDcacAcControlTypeForE("ph")).toBe("PH");
    expect(normalizeDcacAcControlTypeForE("none")).toBe("NONE");
    expect(normalizeDcacAcControlTypeForE("定PQ")).toBe("PQ");
  });

  test("表外值原样返回（trim 后），且**没有** CTRL_ 前缀映射", () => {
    expect(normalizeDcacAcControlTypeForE("zzz")).toBe("zzz");
    expect(normalizeDcacAcControlTypeForE("  zzz  ")).toBe("zzz");
    // CTRL_P 是直流侧的别名，交流侧不认 —— 原样透出
    expect(normalizeDcacAcControlTypeForE("CTRL_P")).toBe("CTRL_P");
  });
});

describe("normalizeDcacDcControlTypeForE", () => {
  test("空值回落默认 V，fallback 参数原样透出", () => {
    expect(normalizeDcacDcControlTypeForE()).toBe("V");
    expect(normalizeDcacDcControlTypeForE("   ")).toBe("V");
    expect(normalizeDcacDcControlTypeForE(undefined, "I")).toBe("I");
    expect(normalizeDcacDcControlTypeForE("", "NONE")).toBe("NONE");
  });

  test("CTRL_P / CTRL_V / CTRL_I / SLACK / 0 五条映射", () => {
    expect(normalizeDcacDcControlTypeForE("CTRL_P")).toBe("P");
    expect(normalizeDcacDcControlTypeForE("CTRL_V")).toBe("V");
    expect(normalizeDcacDcControlTypeForE("CTRL_I")).toBe("I");
    expect(normalizeDcacDcControlTypeForE("SLACK")).toBe("NONE");
    expect(normalizeDcacDcControlTypeForE("0")).toBe("NONE");
    expect(normalizeDcacDcControlTypeForE("不定")).toBe("NONE");
    // 前缀映射对大小写不敏感（查表前先 toUpperCase）
    expect(normalizeDcacDcControlTypeForE("ctrl_p")).toBe("P");
  });

  test("表内四值透传并大写化；交流侧的值表外原样返回", () => {
    expect(normalizeDcacDcControlTypeForE("p")).toBe("P");
    expect(normalizeDcacDcControlTypeForE("none")).toBe("NONE");
    expect(normalizeDcacDcControlTypeForE("定V")).toBe("V");
    // PQ 是交流侧的值，直流清单里没有 —— 回落原文本（不映射成 P/V/I）
    expect(normalizeDcacDcControlTypeForE("PQ")).toBe("PQ");
    expect(normalizeDcacDcControlTypeForE("zzz")).toBe("zzz");
  });
});

describe("acacConverterControlTypePairForE", () => {
  const pair = (params: Record<string, string>) => acacConverterControlTypePairForE(params);

  test("★ 无任何参数时两侧都回落 PQ", () => {
    expect(pair({})).toEqual({ i_control_type: "PQ", j_control_type: "PQ" });
  });

  test("★ legacy 三字表：四个键各自映射到 i/j 两侧", () => {
    expect(pair({ control_type: "PQQ" })).toEqual({ i_control_type: "PQ", j_control_type: "PQ" });
    expect(pair({ control_type: "PVQ" })).toEqual({ i_control_type: "PV", j_control_type: "PQ" });
    expect(pair({ control_type: "PQV" })).toEqual({ i_control_type: "PQ", j_control_type: "PV" });
    expect(pair({ control_type: "PVV" })).toEqual({ i_control_type: "PV", j_control_type: "PV" });
  });

  test("★ legacy 查表前**先 toUpperCase**：小写键也命中（dcdc 侧靠归一器内部实现，见下）", () => {
    // 去掉 toUpperCase 后 pvq 查不到表 → 两侧回落 PQ/PQ，与此断言不符
    expect(pair({ control_type: "pvq" })).toEqual({ i_control_type: "PV", j_control_type: "PQ" });
    expect(pair({ control_type: "pqq" })).toEqual({ i_control_type: "PQ", j_control_type: "PQ" });
    // 前后空白由 normalizeControlTypeForE 的 trim 吃掉
    expect(pair({ control_type: "  PQV  " })).toEqual({ i_control_type: "PQ", j_control_type: "PV" });
    // 中文别名「不定」先归一成 "0"，再大写，仍不在 legacy 表里
    expect(pair({ control_type: "不定" })).toEqual({ i_control_type: "PQ", j_control_type: "PQ" });
  });

  test("★ 显式 i/j 各自覆盖 legacy（两侧独立，互不影响）", () => {
    expect(pair({ control_type: "PQQ", i_control_type: "PH" })).toEqual({ i_control_type: "PH", j_control_type: "PQ" });
    expect(pair({ control_type: "PQQ", j_control_type: "NONE" })).toEqual({ i_control_type: "PQ", j_control_type: "NONE" });
    expect(pair({ control_type: "PQQ", i_control_type: "PH", j_control_type: "0" }))
      .toEqual({ i_control_type: "PH", j_control_type: "NONE" });
  });

  test("★ 纯空白的显式值**不回落到 legacy**（判据是字符串非空，不是 trim 后非空）", () => {
    // "  " 为真值 → 走显式分支 → 归一器内 trim 后为空 → 返回其 fallback "PQ"，
    // 因此 i 侧是 PQ 而不是 legacy 的 PV
    expect(pair({ control_type: "PVV", i_control_type: "  " })).toEqual({ i_control_type: "PQ", j_control_type: "PV" });
    expect(pair({ control_type: "PVV", j_control_type: "  " })).toEqual({ i_control_type: "PV", j_control_type: "PQ" });
  });

  test("★ legacy 优先于 source/target_control_type", () => {
    expect(pair({ control_type: "PQQ", source_control_type: "PH" })).toEqual({ i_control_type: "PQ", j_control_type: "PQ" });
    expect(pair({ control_type: "PVV", target_control_type: "PH" })).toEqual({ i_control_type: "PV", j_control_type: "PV" });
  });

  test("没有 legacy 时才用 source/target，且值经端点归一器处理", () => {
    expect(pair({ source_control_type: "PH", target_control_type: "V" })).toEqual({ i_control_type: "PH", j_control_type: "PV" });
    expect(pair({ source_control_type: "Q" })).toEqual({ i_control_type: "PQ", j_control_type: "PQ" });
    // 表外的值原样透出
    expect(pair({ source_control_type: "zzz" })).toEqual({ i_control_type: "zzz", j_control_type: "PQ" });
    // 纯空白 → 归一器 fallback PQ
    expect(pair({ source_control_type: "  ", target_control_type: "  " })).toEqual({ i_control_type: "PQ", j_control_type: "PQ" });
    // legacy 键查不到时同样落到 source/target
    expect(pair({ control_type: "zzz", source_control_type: "PH" })).toEqual({ i_control_type: "PH", j_control_type: "PQ" });
  });

  test("参数名兼容 camelCase（经 deviceParamValue），值仍走端点归一", () => {
    expect(pair({ iControlType: "PH" })).toEqual({ i_control_type: "PH", j_control_type: "PQ" });
    expect(pair({ iControlType: "Q", jControlType: "V" })).toEqual({ i_control_type: "PQ", j_control_type: "PV" });
    expect(pair({ sourceControlType: "PH", targetControlType: "PH" }))
      .toEqual({ i_control_type: "PH", j_control_type: "PH" });
  });
});

describe("dcdcConverterControlTypePairForE", () => {
  const pair = (params: Record<string, string>) => dcdcConverterControlTypePairForE(params);

  test("★ 无任何参数时 i 侧 P、j 侧 NONE —— **两侧默认不同**", () => {
    expect(pair({})).toEqual({ i_control_type: "P", j_control_type: "NONE" });
  });

  test("★ i 侧四级回落：i_control_type → control_type → source_control_type → P", () => {
    expect(pair({ i_control_type: "CTRL_V" })).toEqual({ i_control_type: "V", j_control_type: "NONE" });
    expect(pair({ control_type: "CTRL_I" })).toEqual({ i_control_type: "I", j_control_type: "NONE" });
    expect(pair({ source_control_type: "I" })).toEqual({ i_control_type: "I", j_control_type: "NONE" });
    expect(pair({})).toEqual({ i_control_type: "P", j_control_type: "NONE" });
  });

  test("★ i 侧逐级优先：control_type 压过 source_control_type", () => {
    // control_type 归一成 NONE，且不再看 source_control_type
    expect(pair({ control_type: "0", source_control_type: "I" })).toEqual({ i_control_type: "NONE", j_control_type: "NONE" });
    expect(pair({ i_control_type: "V", control_type: "CTRL_I", source_control_type: "I" }))
      .toEqual({ i_control_type: "V", j_control_type: "NONE" });
  });

  test("★ j 侧只两级：j_control_type → target_control_type → NONE，**不读 control_type / source**", () => {
    expect(pair({ j_control_type: "CTRL_I" })).toEqual({ i_control_type: "P", j_control_type: "I" });
    expect(pair({ target_control_type: "V" })).toEqual({ i_control_type: "P", j_control_type: "V" });
    // control_type 里的三字 legacy（PQQ/PVQ…）对 j 侧毫无影响
    expect(pair({ control_type: "PVQ" })).toEqual({ i_control_type: "PVQ", j_control_type: "NONE" });
    expect(pair({ source_control_type: "I" })).toEqual({ i_control_type: "I", j_control_type: "NONE" });
  });

  test("legacy 值经端点归一器处理：小写 CTRL_P 也命中、SLACK→NONE", () => {
    expect(pair({ control_type: "ctrl_p" })).toEqual({ i_control_type: "P", j_control_type: "NONE" });
    expect(pair({ control_type: "SLACK" })).toEqual({ i_control_type: "NONE", j_control_type: "NONE" });
    expect(pair({ j_control_type: "slack" })).toEqual({ i_control_type: "P", j_control_type: "NONE" });
    // 前后空白由归一器 trim
    expect(pair({ control_type: "  V  " })).toEqual({ i_control_type: "V", j_control_type: "NONE" });
  });

  test("表外值原样透出（不报错、不改写）", () => {
    expect(pair({ control_type: "zzz" })).toEqual({ i_control_type: "zzz", j_control_type: "NONE" });
    expect(pair({ i_control_type: "PVQ" })).toEqual({ i_control_type: "PVQ", j_control_type: "NONE" });
  });

  test("★ 纯空白值不触发下一级回落：i/j 各自落到归一器 fallback", () => {
    // "  " 为真值 → 显式分支 → 归一器内 trim 为空 → fallback "NONE"（不是 i 侧的 P）
    expect(pair({ control_type: "CTRL_V", i_control_type: "  " })).toEqual({ i_control_type: "NONE", j_control_type: "NONE" });
    expect(pair({ target_control_type: "V", j_control_type: "  " })).toEqual({ i_control_type: "P", j_control_type: "NONE" });
    // control_type 为空串是**假值**，与上面不同 —— i 侧继续往下一级找 source
    expect(pair({ control_type: "", source_control_type: "I" })).toEqual({ i_control_type: "I", j_control_type: "NONE" });
    // source 为纯空白时归一器给 NONE（不是 i 侧兜底的 P）
    expect(pair({ source_control_type: "  " })).toEqual({ i_control_type: "NONE", j_control_type: "NONE" });
  });

  test("参数名兼容 camelCase（经 deviceParamValue）", () => {
    expect(pair({ iControlType: "I", jControlType: "V" })).toEqual({ i_control_type: "I", j_control_type: "V" });
  });
});

describe("dcacConverterControlTypePairForE", () => {
  test("缺省时交流侧 PQ、直流侧 V", () => {
    expect(dcacConverterControlTypePairForE({})).toEqual({ ac_control_type: "PQ", dc_control_type: "V" });
  });

  test("两侧各自过自己的归一器", () => {
    expect(dcacConverterControlTypePairForE({ ac_control_type: "Q", dc_control_type: "CTRL_P" }))
      .toEqual({ ac_control_type: "PQ", dc_control_type: "P" });
    // 纯空白 / 空串同样回落两侧默认
    expect(dcacConverterControlTypePairForE({ ac_control_type: "  ", dc_control_type: "" }))
      .toEqual({ ac_control_type: "PQ", dc_control_type: "V" });
    // 表外值原样透出
    expect(dcacConverterControlTypePairForE({ ac_control_type: "zzz", dc_control_type: "SLACK" }))
      .toEqual({ ac_control_type: "zzz", dc_control_type: "NONE" });
  });

  test("★ 与另两个 pair 函数不同：这里**直接读 params.x**，不走 deviceParamValue，camelCase 不认", () => {
    expect(dcacConverterControlTypePairForE({ acControlType: "PH", dcControlType: "I" }))
      .toEqual({ ac_control_type: "PQ", dc_control_type: "V" });
  });
});

describe("mappedLegacyEValue：E 列取值的旧字段回退链", () => {
  test("★ 容量列：rated_capacity 与 rated_power 互相回退，rated_capacity 优先", () => {
    expect(mappedLegacyEValue("rated_capacity", { rated_capacity: "1", rated_power: "2" })).toBe("1");
    // 两个 key 走同一段逻辑 —— 查 rated_power 时同样先看 rated_capacity
    expect(mappedLegacyEValue("rated_power", { rated_capacity: "1", rated_power: "2" })).toBe("1");
    expect(mappedLegacyEValue("rated_capacity", { rated_power: "2" })).toBe("2");
    expect(mappedLegacyEValue("rated_power", { ratedPower: "3" })).toBe("3");
    expect(mappedLegacyEValue("rated_capacity", {})).toBe("");
  });

  test("★ 空串**不被当作缺失**：本名为空时不再看旧名（`??` 只挡 null/undefined）", () => {
    expect(mappedLegacyEValue("rated_capacity", { rated_capacity: "", rated_power: "2" })).toBe("");
    expect(mappedLegacyEValue("pbase", { pbase: "", rated_active_power: "2" })).toBe("");
    expect(mappedLegacyEValue("i_max", { i_max: "", max_current: "5" })).toBe("");
  });

  test("★ 电流列：四个 key 的旧名**各不通用**", () => {
    // i 侧的旧名是 max_current（不带 high 前缀）
    expect(mappedLegacyEValue("i_max", { max_current: "5" })).toBe("5");
    // 三个分侧的旧名是 high/medium/low 两组键，按列取、不串用
    expect(mappedLegacyEValue("i_i_max", { high_i_max: "1" })).toBe("1");
    expect(mappedLegacyEValue("i_i_max", { high_max_current: "2" })).toBe("2");
    expect(mappedLegacyEValue("k_i_max", { medium_i_max: "3" })).toBe("3");
    expect(mappedLegacyEValue("k_i_max", { medium_max_current: "4" })).toBe("4");
    expect(mappedLegacyEValue("j_i_max", { low_i_max: "5" })).toBe("5");
    expect(mappedLegacyEValue("j_i_max", { low_max_current: "6" })).toBe("6");
    // ★ 别人的旧名取不到：i_max 不认 high_*，i_i_max 不认 medium_*
    expect(mappedLegacyEValue("i_max", { high_i_max: "7", high_max_current: "7" })).toBe("");
    expect(mappedLegacyEValue("i_max", { medium_i_max: "8" })).toBe("");
    expect(mappedLegacyEValue("i_i_max", { medium_max_current: "9" })).toBe("");
    // 本名优先于旧名，且两个旧名按数组顺序取第一个非 undefined
    expect(mappedLegacyEValue("i_i_max", { i_i_max: "本名", high_i_max: "1", high_max_current: "2" })).toBe("本名");
    expect(mappedLegacyEValue("i_i_max", { high_max_current: "2", high_i_max: "1" })).toBe("1");
    // ★ 判据是「非 undefined」而非「非空」：第一个旧名给了空串就不再往后找
    expect(mappedLegacyEValue("i_i_max", { high_i_max: "", high_max_current: "2" })).toBe("");
    // 本名也认 camelCase
    expect(mappedLegacyEValue("i_max", { iMax: "10" })).toBe("10");
    expect(mappedLegacyEValue("j_i_max", {})).toBe("");
  });

  test("分侧容量列：i/k/j 各自回退到 high/medium/low_rated_capacity", () => {
    expect(mappedLegacyEValue("i_rated_capacity", { high_rated_capacity: "1" })).toBe("1");
    expect(mappedLegacyEValue("k_rated_capacity", { medium_rated_capacity: "2" })).toBe("2");
    expect(mappedLegacyEValue("j_rated_capacity", { low_rated_capacity: "3" })).toBe("3");
    // 旧名也认 camelCase
    expect(mappedLegacyEValue("i_rated_capacity", { highRatedCapacity: "4" })).toBe("4");
    // 本名优先，且不与容量列那对键互通
    expect(mappedLegacyEValue("i_rated_capacity", { i_rated_capacity: "本名", high_rated_capacity: "1" })).toBe("本名");
    expect(mappedLegacyEValue("i_rated_capacity", { rated_capacity: "5" })).toBe("");
    expect(mappedLegacyEValue("k_rated_capacity", { high_rated_capacity: "1" })).toBe("");
  });

  test("★ 电气量列：本名 → 旧名，两级回退逐条钉住", () => {
    // [E 列名, 旧名（snake）, 旧名（camel）]
    const rows: Array<[string, string, string]> = [
      ["pbase", "rated_active_power", "ratedActivePower"],
      ["qbase", "rated_reactive_power", "ratedReactivePower"],
      ["r", "resistance_pu", "resistancePu"],
      ["x", "reactance_pu", "reactancePu"],
      ["b", "half_charging_susceptance_pu", "halfChargingSusceptancePu"],
      ["gt", "magnetizing_conductance_pu", "magnetizingConductancePu"],
      ["bt", "magnetizing_susceptance_pu", "magnetizingSusceptancePu"],
      ["tap", "tap_ratio", "tapRatio"],
      ["r1", "source_equivalent_resistance", "sourceEquivalentResistance"],
      ["r2", "target_equivalent_resistance", "targetEquivalentResistance"]
    ];
    for (const [key, legacySnake, legacyCamel] of rows) {
      expect(mappedLegacyEValue(key, {}), `${key} 无值`).toBe("");
      expect(mappedLegacyEValue(key, { [key]: "本名" }), `${key} 本名`).toBe("本名");
      expect(mappedLegacyEValue(key, { [legacySnake]: "旧" }), `${key} ← ${legacySnake}`).toBe("旧");
      expect(mappedLegacyEValue(key, { [legacyCamel]: "驼" }), `${key} ← ${legacyCamel}`).toBe("驼");
      expect(mappedLegacyEValue(key, { [key]: "本名", [legacySnake]: "旧" }), `${key} 本名优先`).toBe("本名");
      expect(mappedLegacyEValue(key, { [key]: "", [legacySnake]: "旧" }), `${key} 空串不回落`).toBe("");
    }
  });

  test("未列入回退表的 key：直接按 key 取（认 camelCase），取不到给空串", () => {
    expect(mappedLegacyEValue("i_node", { i_node: "1" })).toBe("1");
    expect(mappedLegacyEValue("i_node", { iNode: "2" })).toBe("2");
    expect(mappedLegacyEValue("zzz", { zzz: "3" })).toBe("3");
    expect(mappedLegacyEValue("zzz", { zzzZ: "3" })).toBe("");
    expect(mappedLegacyEValue("zzz", {})).toBe("");
  });
});
