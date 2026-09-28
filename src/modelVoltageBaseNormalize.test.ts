// 电压基值解析三件套的直接单测（此前 44 处生产调用、零测试直呼）。
//
//   normalizeVoltageBaseInput   13 处调用
//   terminalVoltageBaseNumber   31 处调用（= 前者的转发）
//   isZeroNumericText           18 处调用
//   firstNonZeroVoltageBase     10 处调用
//
// ## 核心契约：它是「数字 + 一个小数点」的**提取器**，不是数值解析器
//
// `normalizeVoltageBaseInput` 逐字符扫描，**只保留数字与第一个 `.`**，
// 其余字符（负号、正号、逗号、字母、百分号、第二个点…）**一律丢弃**。
// 这样 `"220 kV"` / `"220kV"` / `"220V"` 都能得到 `"220"` —— 这正是 44 个调用点需要的。
//
// ## 但这个「粗暴」有若干静默错误答案，本文件把它们**如实钉住**
//
// | 输入      | 归一化结果 | 问题                        |
// |-----------|-----------|-----------------------------|
// | `"1e-3"`  | `"13"`    | 指数被拆开，**13000 倍**误差 |
// | `"1,0"`   | `"10"`    | 欧洲小数点被当千分位，10 倍 |
// | `"0,0"`   | `"00"`    | → 0                         |
// | `"1-2"`   | `"12"`    | 负号被当分隔符，拼接        |
// | `"-0.5"`  | `"0.5"`   | **负号被丢弃**，符号翻转    |
// | `"1.2.3"` | `"1.2"`   | 第二个点被丢弃              |
// | `"0x0"`   | `"00"`    | 十六进制被拆成 0            |
//
// **全部判定为潜在锐边，不改实现**，理由：
// 1. `data/` 下 15 个真实 vbase **全部是纯 `[0-9.]`**（逗号 / 指数 / 负号 / 字母各 0 例）——
//    这些锐边**当前一个都没发生**；
// 2. 函数有 44 个调用点，而「220 kV → 220」正是它们要的。把它改成严格数值解析器，
//    等于替 44 个调用点重新决定「单位后缀怎么办」，风险远大于收益；
// 3. 其中多数输入**本质歧义**（逗号是千分位还是小数点？`"1-2"` 是范围吗？），
//    猜错比不猜更糟。
//
// 本文件的价值是：**日后若报「电压基值算错了」，此处已有全部答案。**
import { describe, expect, test } from "vitest";
import { normalizeVoltageBaseInput, terminalVoltageBaseNumber } from "./model";
import { isZeroNumericText, firstNonZeroVoltageBase } from "./model-eexport";

describe("核心契约：只保留数字与**第一个**小数点，其余全丢", () => {
  test("带单位的电压基值被清干净", () => {
    expect(normalizeVoltageBaseInput("220 kV")).toBe("220");
    expect(normalizeVoltageBaseInput("220kV")).toBe("220");
    expect(normalizeVoltageBaseInput("220V")).toBe("220");
    expect(normalizeVoltageBaseInput(" 0.4kV ")).toBe("0.4");
  });

  test("普通数值原样保留", () => {
    for (const s of ["0", "10", "0.4", "220", "1000", "0.35", "35.5", "0.0001"]) {
      expect(normalizeVoltageBaseInput(s), s).toBe(s);
    }
  });

  test("只保留**第一个**小数点，第二个被丢弃（但其后的数字仍被收进来）", () => {
    // ★ 注意不是「截断到第二个点之前」—— 第二个点被丢掉，**后面的数字照收**。
    // 所以 "1.2.3" 得到的是 "1.23"（1.2 与 3 被拼接），不是 "1.2"。
    // 这比"截断"更危险：1.2.3 → 1.23 看起来像个正常数，不会引人警觉。
    expect(normalizeVoltageBaseInput("1.2.3")).toBe("1.23");
    expect(normalizeVoltageBaseInput("1..2")).toBe("1.2");
    expect(normalizeVoltageBaseInput("220.0.5")).toBe("220.05");
    expect(normalizeVoltageBaseInput("0.4.0.4")).toBe("0.404");
  });

  test("terminalVoltageBaseNumber 是同函数的转发（行为完全一致）", () => {
    const samples = ["220 kV", "0.4", "", "abc", "1e-3", "-0.5", "1.2.3", "0,0", "0x0", "50%"];
    for (const s of samples) {
      expect(terminalVoltageBaseNumber(s), s).toBe(normalizeVoltageBaseInput(s));
    }
  });
});

describe("★ 空值与非数字输入", () => {
  test("null / undefined / 空串 → 空串", () => {
    expect(normalizeVoltageBaseInput(undefined)).toBe("");
    expect(normalizeVoltageBaseInput(null as unknown as undefined)).toBe("");
    expect(normalizeVoltageBaseInput("")).toBe("");
    expect(normalizeVoltageBaseInput("   ")).toBe("");
  });

  test("无数字的文本 → 空串", () => {
    for (const s of ["abc", "kV", "---"]) {
      expect(normalizeVoltageBaseInput(s), s).toBe("");
    }
  });

  test("★ 只有点没有数字 → \".\"（不是空串）", () => {
    // 首个点无条件保留，哪怕整个串里一个数字都没有。
    // 好在下游是 `Number(".")` = NaN，`=== 0` 为 false，不会被误判成「零」。
    expect(normalizeVoltageBaseInput("...")).toBe(".");
    expect(Number(".")).toBeNaN();
    expect(isZeroNumericText("...")).toBe(false);
  });

  test("非字符串输入走 String() 转换", () => {
    expect(normalizeVoltageBaseInput(220 as never)).toBe("220");
    expect(normalizeVoltageBaseInput(0.4 as never)).toBe("0.4");
    expect(normalizeVoltageBaseInput(false as never)).toBe("");
  });
});

describe("★ 潜在锐边：非十进制写法被静默改写（真实数据 0 例，刻意不改）", () => {
  // 每一行都是探针实测的结果，不是推断。`data/` 下 15 个真实 vbase 全是纯 [0-9.]，
  // 这些形态**当前一个都没出现**；改动理由见文件头。
  const sharpEdges: Array<[string, string, string]> = [
    ["指数被拆开", "1e-3", "13"],
    ["指数正例", "1e5", "15"],
    ["欧洲小数点被当千分位", "1,0", "10"],
    ["千分位被当分隔符", "1,000", "1000"],
    ["逗号双零", "0,0", "00"],
    ["负号被当分隔符（拼接）", "1-2", "12"],
    ["★ 负号被丢弃（符号翻转）", "-0.5", "0.5"],
    ["负整数负号被丢", "-220", "220"],
    ["正号被丢", "+220", "220"],
    ["十六进制被拆", "0x0", "00"],
    ["十六进制含字母位", "0x1F", "01"],
    ["二进制被拆", "0b101", "0101"],
    ["下划线被丢", "1_000", "1000"],
    ["百分号被丢", "50%", "50"],
    ["下划线小数点被丢", "0_4", "04"],
    ["★ 第二个小数点被丢但后续数字照收", "1.2.3", "1.23"],
    ["双小数点", "220.0.5", "220.05"]
  ];

  for (const [label, input, expected] of sharpEdges) {
    test(`${label}：${JSON.stringify(input)} → ${JSON.stringify(expected)}`, () => {
      expect(normalizeVoltageBaseInput(input)).toBe(expected);
    });
  }

  test("指数的量级：1e-3 本应 0.001，却得到 13（**13000 倍**）", () => {
    // 这条单独列出，因为它是最容易在真实数据里造成灾难的一条：
    // 电压基值写 0.001 kV（1 V）与写成 1e-3 kV 意思相同，但结果差 13000 倍。
    expect(normalizeVoltageBaseInput("1e-3")).toBe("13");
    expect(Number(normalizeVoltageBaseInput("1e-3"))).toBe(13);
    expect(Number(normalizeVoltageBaseInput("1e-3")) / 0.001).toBe(13000);
  });
});

describe("isZeroNumericText：归一化后判是否为零", () => {
  test("归一化成空串的一律**不算零**（避免把「无值」误判成 0）", () => {
    // `normalized !== ""` 这道守卫的用意：空串若放过去，`Number("") === 0` 会
    // 把「没填电压基值」当成「电压基值是 0」，进而触发不该触发的兜底赋值。
    for (const s of ["", "   ", "abc", "kV", null, undefined]) {
      expect(isZeroNumericText(s as never), String(s)).toBe(false);
    }
  });

  test("各种「零」的写法都算零", () => {
    for (const s of ["0", "0.0", "-0", "00", "0.000", " 0 ", "0,0", "0 0", "0%", "0/", "0x0", "0b0"]) {
      expect(isZeroNumericText(s as never), JSON.stringify(s)).toBe(true);
    }
  });

  test("非零值不算零", () => {
    for (const s of ["1", "-1", "0.1", "220", "0.4", "1e-400"]) {
      expect(isZeroNumericText(s as never), JSON.stringify(s)).toBe(false);
    }
  });

  test("★ 指数下溢被误判为非零（`0e-999` 数学上是 0）", () => {
    // 归一化把 `e` 丢掉 → `"0-999"` → 数字与点 → `"0999"` = 999 ≠ 0。
    expect(normalizeVoltageBaseInput("0e-999")).toBe("0999");
    expect(isZeroNumericText("0e-999")).toBe(false);
    // 对照：真写成 "0" 才是零
    expect(isZeroNumericText("0")).toBe(true);
  });

  test("★ 全角零不被识别（`Number(\"０\")` 其实是 0，但归一化先把它丢了）", () => {
    expect(normalizeVoltageBaseInput("０")).toBe("");
    expect(isZeroNumericText("０")).toBe(false);
  });
});

describe("firstNonZeroVoltageBase：取第一个非零基值，全零/全空则空串", () => {
  test("跳过空串与零，取到第一个有效值", () => {
    expect(firstNonZeroVoltageBase(["", "0", "0.4", "220"])).toBe("0.4");
    expect(firstNonZeroVoltageBase([undefined, "", "220"])).toBe("220");
    expect(firstNonZeroVoltageBase(["0", "0.0", "10"])).toBe("10");
  });

  test("全零 / 全空 → 空串（调用方据此走兜底）", () => {
    expect(firstNonZeroVoltageBase(["0", "0.0", ""])).toBe("");
    expect(firstNonZeroVoltageBase([])).toBe("");
    expect(firstNonZeroVoltageBase([undefined, null as unknown as undefined])).toBe("");
  });

  test("返回值是**归一化后**的串，不是原文", () => {
    // 注意：返回的是 `terminalVoltageBaseNumber` 的结果，所以带单位的原文会被清干净，
    // 而**数字与点的顺序保持**（`"0.4kV"` → `"0.4"`，不是 `"04"`）。
    expect(firstNonZeroVoltageBase(["0.4kV"])).toBe("0.4");
    expect(firstNonZeroVoltageBase(["  0.4 kV  "])).toBe("0.4");
    expect(firstNonZeroVoltageBase(["220 kV"])).toBe("220");
    expect(firstNonZeroVoltageBase(["1,000"])).toBe("1000");
  });

  test("带符号的负值会被当成有效非零值（负号已被归一化丢掉）", () => {
    expect(firstNonZeroVoltageBase(["-220"])).toBe("220");
  });

  test("**顺序敏感**：返回的是数组里第一个非零项，不是最大值", () => {
    expect(firstNonZeroVoltageBase(["10", "220", "35"])).toBe("10");
    expect(firstNonZeroVoltageBase(["220", "10"])).toBe("220");
  });
});
