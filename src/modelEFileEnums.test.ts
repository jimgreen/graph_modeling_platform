// src/model.ts：E 文件的**列值归一**
//   normalizeControlTypeForE                  控制类型中文别名 → E 值（7 个别名）
//   normalizeDcdcEndpointControlTypeForE      DCDC 变流器端点控制类型
//   normalizeAcacEndpointControlTypeForE      ACAC 变流器端点控制类型
//   normalizeDeviceStatusForE / normalizeSwitchStatusForE   开关状态（14 个别名）
//   normalizeRunStatValue                     运行状态（10 个别名）
//   normalizeRunStatParameterDefinition       运行状态参数定义的**强制归一**
//
// 这几个函数直接决定 **E 文件里写出去的列值**。判错的后果是导出文件里那一列
// 写着错值 —— 下游 CIM/E 文件解析器读出来是另一个设备类型，且**不报错**。
import { describe, expect, test } from "vitest";
import {
  ACAC_SIDE_CONTROL_TYPES,
  DC_GENERATOR_CONTROL_TYPES,
  DCDC_CONVERTER_CONTROL_TYPES,
  RUN_STAT_ENUM_OPTIONS,
  RUN_STAT_ENUM_VALUES,
  normalizeAcacEndpointControlTypeForE,
  normalizeControlTypeForE,
  normalizeDcdcEndpointControlTypeForE,
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
