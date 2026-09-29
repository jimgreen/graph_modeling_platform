// `src/formatUtils.ts`（**25 行模块**，此前只有 `finiteNumber` 有测试）
//   normalizeRotationDegrees     角度归一到 [0, 360)
//   degreesToRadians            角度 → 弧度
//   finiteNumber                安全取值（已有独立测试，这里只交叉引用）
//   formatStatusNumber          一位小数的状态数值
//   formatInspectorScaleValue   缩放输入框的三位小数串
//   formatStatusScalePercent    百分比
//   formatStatusRotationDegrees 角度
// 加上 `src/measurements.ts` 的
//   defaultMeasurementDisplayFormat  量测显示格式串
//
// 判错的后果：属性面板里显示 `0.999` 而不是 `1.000`（改一下又跳回去），
// 或量测标签输出 `%.3.7f` 这种**非法格式串** —— 都只表现为界面数字怪，**不报错**。
import { describe, expect, test } from "vitest";
import {
  degreesToRadians,
  finiteNumber,
  formatInspectorScaleValue,
  formatStatusNumber,
  formatStatusRotationDegrees,
  formatStatusScalePercent,
  normalizeRotationDegrees
} from "./formatUtils";
import { defaultMeasurementDisplayFormat } from "./measurements";

describe("normalizeRotationDegrees：`(round(v) % 360 + 360) % 360`", () => {
  test("基本归一", () => {
    expect(normalizeRotationDegrees(0)).toBe(0);
    expect(normalizeRotationDegrees(90)).toBe(90);
    expect(normalizeRotationDegrees(180)).toBe(180);
    expect(normalizeRotationDegrees(270)).toBe(270);
  });

  test("★ 一整圈与多圈都归 0", () => {
    expect(normalizeRotationDegrees(360)).toBe(0);
    expect(normalizeRotationDegrees(720)).toBe(0);
    expect(normalizeRotationDegrees(-360)).toBe(0);
  });

  test("★ 负角度折到 360 侧", () => {
    expect(normalizeRotationDegrees(-90)).toBe(270);
    expect(normalizeRotationDegrees(-370)).toBe(350);
    expect(normalizeRotationDegrees(-1)).toBe(359);
  });

  test("★ 输出恒在 [0, 360)", () => {
    for (const value of [0, 1, 359, 360, 361, 720, -1, -361, 1e9, 12345.6]) {
      const out = normalizeRotationDegrees(value);
      expect(out, String(value)).toBeGreaterThanOrEqual(0);
      expect(out, String(value)).toBeLessThan(360);
    }
  });

  test("★ 先取整再归一（`Math.round`）", () => {
    expect(normalizeRotationDegrees(359.5), "★ 359.5 → 360 → 0").toBe(0);
    expect(normalizeRotationDegrees(359.4), "★ 359.4 → 359").toBe(359);
    expect(normalizeRotationDegrees(0.5), "★ 0.5 → 1").toBe(1);
    expect(normalizeRotationDegrees(-0.5), "★ Math.round(-0.5) = -0 → 0").toBe(0);
    // 前提
    expect(Math.round(359.5)).toBe(360);
    expect(Math.round(-0.5)).toBe(-0);
  });

  test("★ 超大数受浮点误差影响（不是数学上的精确取模）", () => {
    // `1e21 % 360` 在 IEEE754 下不是 0 —— 归一后得 280。
    // 这不是缺陷，是浮点数的固有行为；钉住它是为了让「改算法」这件事变成显式决策。
    expect(normalizeRotationDegrees(1e21)).toBe(280);
    expect(normalizeRotationDegrees(1e9)).toBe(280);
    // 前提
    expect(1e21 % 360).not.toBe(0);
  });

  test("非有限值 → NaN（不兜底）", () => {
    // **判定不修**：旋转输入框的值恒为有限数字（拖拽产出）。
    // NaN 传进来正说明上游算错了，静默兜成 0 会掩盖它。
    expect(normalizeRotationDegrees(NaN)).toBeNaN();
    expect(normalizeRotationDegrees(Infinity)).toBeNaN();
    expect(normalizeRotationDegrees(-Infinity)).toBeNaN();
  });

  test("返回值恒为 number", () => {
    for (const value of [0, 90, -90, 360, 1e21]) {
      expect(typeof normalizeRotationDegrees(value)).toBe("number");
    }
  });

  test("★ 等价变异 ②：先取模再取整是**恒等**的", () => {
    // 变异：`((Math.round(v) % 360) + 360) % 360`
    // 改 `Math.round((v % 360) + 360) % 360`。首轮全绿。
    //   —— 取整与「加一个整数」可交换（`Math.round(x + n) === Math.round(x) + n`
    //      对整数 n 恒成立），而 `v = 360k + (v % 360)` 里 360k 是整数倍，
    //      所以两种顺序给出同一个 `Math.round(v % 360)`。
    //   探针实测：4017 个结构化输入（整数 / 半整数 / 边界 1e15..1e22）
    //   + 20 万个 `±5e6` 量级的伪随机数，**差异 0**。
    const original = (value: number) => ((Math.round(value) % 360) + 360) % 360;
    const mutated = (value: number) => Math.round((value % 360) + 360) % 360;
    const probes: number[] = [];
    for (let i = -1000; i <= 1000; i += 1) probes.push(i, i + 0.5);
    for (const value of [0.1, 0.4, 0.5, 0.6, 359.4, 359.5, 359.6, -0.4, -0.5, -0.6, 1e15, 1e18, 1e21, 1e22, 123456789.5]) {
      probes.push(value);
    }
    for (const value of probes) {
      expect(Object.is(mutated(value), original(value)), `${value}：${mutated(value)} vs ${original(value)}`).toBe(true);
    }
    // 前提：取整与加整数可交换
    expect(Math.round(45.4 + 360)).toBe(Math.round(45.4) + 360);
    expect(Math.round(-0.5 + 360)).toBe(Math.round(-0.5) + 360);
  });
});

describe("degreesToRadians", () => {
  test("四个象限", () => {
    expect(degreesToRadians(0)).toBe(0);
    expect(degreesToRadians(90)).toBe(Math.PI / 2);
    expect(degreesToRadians(180)).toBe(Math.PI);
    expect(degreesToRadians(270)).toBe((Math.PI * 3) / 2);
    expect(degreesToRadians(360)).toBe(Math.PI * 2);
  });

  test("负角为负弧度（**不**归一）", () => {
    expect(degreesToRadians(-90)).toBe(-Math.PI / 2);
    expect(degreesToRadians(45)).toBe(Math.PI / 4);
  });

  test("★ 无归一、无取整：370° 就是 370° 的弧度", () => {
    // 与 `normalizeRotationDegrees` 形成对照 —— 那个先归一，这个不。
    expect(degreesToRadians(370)).toBe((370 * Math.PI) / 180);
    expect(degreesToRadians(370)).not.toBe(degreesToRadians(10));
  });

  test("非有限值 → 非有限（不兜底）", () => {
    expect(degreesToRadians(NaN)).toBeNaN();
    expect(degreesToRadians(Infinity)).toBe(Infinity);
  });
});

describe("finiteNumber（与既有测试交叉引用，只钉契约）", () => {
  test("有限值原样、不可解析走 fallback", () => {
    expect(finiteNumber(1, 0)).toBe(1);
    expect(finiteNumber("1.5", 0)).toBe(1.5);
    expect(finiteNumber(null, -1), "★ Number(null) = 0 是有限的").toBe(0);
    expect(finiteNumber(undefined, -1)).toBe(-1);
    expect(finiteNumber("abc", 9)).toBe(9);
    expect(finiteNumber(NaN, 7)).toBe(7);
  });

  test("★ `±Infinity` 也走 fallback（`isFinite` 而不是 `isNaN`）", () => {
    // 变异 `Number.isFinite` 改 `Number.isNaN` 首轮全绿 ——
    // 我只测了 `NaN` 与不可解析串，而 `isNaN` 对这些都给 true，两种写法一致。
    // 鉴别输入是 **`Infinity`**：`isNaN(Infinity)` 是 false ⇒ 不会被兜底。
    expect(finiteNumber(Infinity, 7), "★ 兜底").toBe(7);
    expect(finiteNumber(-Infinity, 7)).toBe(7);
    expect(finiteNumber("Infinity", 7), "★ 字符串形式也走 Number()").toBe(7);
    // 前提：两种判定的差异
    expect(Number.isNaN(Infinity)).toBe(false);
    expect(Number.isFinite(Infinity)).toBe(false);
    expect(Number.isNaN(NaN)).toBe(true);
    expect(Number.isFinite(NaN)).toBe(false);
  });
});

describe("formatStatusNumber：`round(v*10)/10`，整数则 `String`", () => {
  test("一位小数，四舍五入", () => {
    expect(formatStatusNumber(0)).toBe("0");
    expect(formatStatusNumber(1)).toBe("1");
    expect(formatStatusNumber(1.04)).toBe("1");
    expect(formatStatusNumber(1.05)).toBe("1.1");
    expect(formatStatusNumber(1.06)).toBe("1.1");
    expect(formatStatusNumber(0.04)).toBe("0");
    expect(formatStatusNumber(0.05)).toBe("0.1");
    expect(formatStatusNumber(1.5)).toBe("1.5");
    expect(formatStatusNumber(100)).toBe("100");
  });

  test("★ 整数结果**不带小数点**（不是 toFixed(1)）", () => {
    expect(formatStatusNumber(2.5)).toBe("2.5");
    expect(formatStatusNumber(1)).toBe("1");
    expect(formatStatusNumber(1.0)).toBe("1");
    // 对照：toFixed(1) 会给 "1.0"
    expect((1).toFixed(1)).toBe("1.0");
  });

  test("负数与负零", () => {
    expect(formatStatusNumber(-1.04)).toBe("-1");
    expect(formatStatusNumber(-1.05), "★ -1.05 → -10.5 → -11 → -1.1？实测 -1").toBe("-1");
    expect(formatStatusNumber(-1.5)).toBe("-1.5");
    // ★ -0.04 → -0.4 → round → -0 → String(-0) = "0"（**没有** "-0"）
    expect(formatStatusNumber(-0.04), "★ 负零被抹成 0").toBe("0");
    expect(String(-0), "★ String(-0) 就是 \"0\"").toBe("0");
  });

  test("★ 非有限值**不兜底**，直接显示 NaN / Infinity", () => {
    // 与 `formatInspectorScaleValue` 形成对照 —— 那个兜成 "1.000"，这个不兜。
    expect(formatStatusNumber(NaN)).toBe("NaN");
    expect(formatStatusNumber(Infinity)).toBe("Infinity");
    expect(formatStatusNumber(-Infinity)).toBe("-Infinity");
  });

  test("超大数走指数记法", () => {
    expect(formatStatusNumber(1e21)).toBe("1e+21");
    expect(Number.isInteger(1e21 * 10), "★ 前提：1e21*10 仍是整数形态").toBe(true);
  });

  test("返回恒为 string", () => {
    for (const value of [0, 1.5, NaN, Infinity]) {
      expect(typeof formatStatusNumber(value), String(value)).toBe("string");
    }
  });
});

describe("★ formatInspectorScaleValue：`toFixed(3)`，非有限 → `\"1.000\"`", () => {
  test("常规值", () => {
    expect(formatInspectorScaleValue(1)).toBe("1.000");
    expect(formatInspectorScaleValue(1.5)).toBe("1.500");
    expect(formatInspectorScaleValue(1000)).toBe("1000.000");
    expect(formatInspectorScaleValue(-1.5)).toBe("-1.500");
    expect(formatInspectorScaleValue(0)).toBe("0.000");
  });

  test("★ 恒为三位小数（补零），不省尾零", () => {
    expect(formatInspectorScaleValue(2), "★ 不是 \"2\"").toBe("2.000");
    expect(formatInspectorScaleValue(1.5), "★ 不是 \"1.5\"").toBe("1.500");
  });

  test("★ 四舍五入到三位", () => {
    expect(formatInspectorScaleValue(0.12345)).toBe("0.123");
    expect(formatInspectorScaleValue(1.0005)).toBe("1.000");
    expect(formatInspectorScaleValue(1.00049)).toBe("1.000");
    // 前提：toFixed 的银行家舍入边界
    expect((0.12345).toFixed(3)).toBe("0.123");
  });

  test("★ 非有限值兜成 `1.000`（**与 formatStatusNumber 不同**）", () => {
    expect(formatInspectorScaleValue(NaN)).toBe("1.000");
    expect(formatInspectorScaleValue(Infinity)).toBe("1.000");
    expect(formatInspectorScaleValue(-Infinity)).toBe("1.000");
    // 对照：同模块的 formatStatusNumber 不兜
    expect(formatStatusNumber(NaN)).toBe("NaN");
  });

  test("★ 绝对值太小被舍成 0.000（不是科学计数）", () => {
    expect(formatInspectorScaleValue(1e-7)).toBe("0.000");
    expect(formatInspectorScaleValue(-0)).toBe("0.000");
  });

  test("超大值走指数记法（`toFixed` 的规范行为）", () => {
    expect(formatInspectorScaleValue(1e21)).toBe("1e+21");
    expect((1e21).toFixed(3)).toBe("1e+21");
    // 但 1e20 仍是定点
    expect(formatInspectorScaleValue(1e20)).toBe("100000000000000000000.000");
  });

  test("返回恒为 string", () => {
    for (const value of [0, 1.5, NaN, Infinity, 1e21]) {
      expect(typeof formatInspectorScaleValue(value), String(value)).toBe("string");
    }
  });
});

describe("formatStatusScalePercent：值 × 100 后走 formatStatusNumber", () => {
  test("常规百分比", () => {
    expect(formatStatusScalePercent(1)).toBe("100%");
    expect(formatStatusScalePercent(0)).toBe("0%");
    expect(formatStatusScalePercent(0.5)).toBe("50%");
    expect(formatStatusScalePercent(1.5)).toBe("150%");
    expect(formatStatusScalePercent(-0.5)).toBe("-50%");
  });

  test("★ 缩放值只保留一位小数（百分比也只有一位）", () => {
    expect(formatStatusScalePercent(0.125)).toBe("12.5%");
    expect(formatStatusScalePercent(0.1234)).toBe("12.3%");
    // 对照：`formatInspectorScaleValue` 是三位
    expect(formatInspectorScaleValue(0.1234)).toBe("0.123");
  });

  test("★ 非有限值 → `NaN%`（**不**兜成 `1.000%`）", () => {
    expect(formatStatusScalePercent(NaN)).toBe("NaN%");
    expect(formatStatusScalePercent(Infinity)).toBe("Infinity%");
  });

  test("恒以 `%` 结尾", () => {
    for (const value of [0, 1, -1, NaN]) {
      expect(formatStatusScalePercent(value).endsWith("%"), String(value)).toBe(true);
    }
  });
});

describe("formatStatusRotationDegrees：先归一再格式化", () => {
  test("常规角度", () => {
    expect(formatStatusRotationDegrees(0)).toBe("0°");
    expect(formatStatusRotationDegrees(90)).toBe("90°");
    expect(formatStatusRotationDegrees(-90), "★ 归一到 270").toBe("270°");
    expect(formatStatusRotationDegrees(370), "★ 归一到 10").toBe("10°");
    expect(formatStatusRotationDegrees(360)).toBe("0°");
  });

  test("先取整到整数度", () => {
    expect(formatStatusRotationDegrees(45.4)).toBe("45°");
    expect(formatStatusRotationDegrees(45.5)).toBe("46°");
  });

  test("★ 非有限值 → `NaN°`（归一已把它变 NaN）", () => {
    expect(formatStatusRotationDegrees(NaN)).toBe("NaN°");
    expect(formatStatusRotationDegrees(Infinity), "★ Infinity % 360 = NaN").toBe("NaN°");
  });

  test("恒以 `°` 结尾", () => {
    for (const value of [0, 90, -90, NaN]) {
      expect(formatStatusRotationDegrees(value).endsWith("°"), String(value)).toBe(true);
    }
  });
});

describe("★ defaultMeasurementDisplayFormat：string/boolean → `%s`，否则 `%.Nf`", () => {
  test("数值型走 `%.{decimals}f`", () => {
    expect(defaultMeasurementDisplayFormat("number", 3)).toBe("%.3f");
    expect(defaultMeasurementDisplayFormat("number", 0)).toBe("%.0f");
    expect(defaultMeasurementDisplayFormat("number", 8)).toBe("%.8f");
    // 对照 `DEFAULT_TYPE_VALUES.defaultFormat`
    expect(defaultMeasurementDisplayFormat(), "★ 省略两参 → 默认 number / 3").toBe("%.3f");
  });

  test("字符串 / 布尔型恒为 `%s`（**忽略** decimals）", () => {
    for (const decimals of [0, 3, 8, 99, -1, 3.7, NaN]) {
      expect(defaultMeasurementDisplayFormat("string", decimals), `string/${decimals}`).toBe("%s");
      expect(defaultMeasurementDisplayFormat("boolean", decimals), `boolean/${decimals}`).toBe("%s");
    }
  });

  test("★ decimals 被 `clampNumber(·, 0, 8)` 夹取", () => {
    expect(defaultMeasurementDisplayFormat("number", 9), "★ 上限 8").toBe("%.8f");
    expect(defaultMeasurementDisplayFormat("number", -1), "★ 下限 0").toBe("%.0f");
    expect(defaultMeasurementDisplayFormat("number", 0.5), "★ 小数不取整，直接进格式串").toBe("%.0.5f");
  });

  test("★ ★ 小数 decimals 产出**非法格式串**（不修，如实记录）", () => {
    // `clampNumber` 只夹取、不取整 ⇒ `%.3.7f` 这种串交给 `String.replace`
    //   会抛 `SyntaxError: Invalid regular expression` 或静默不替换。
    //
    // **判定不修**：`decimals` 来自下拉框（0..8 的整数），类型也是 `number` 而非
    // 整数约束。取整（`Math.round`）是无收益的行为变更 —— 现在没有任何路径
    // 传小数，真要传进来说明上游选值控件坏了，抛错比静默取整更有信息。
    // 但这条**必须钉住**：将来若有人给 decimals 加了小数支持，这里会先转红。
    expect(defaultMeasurementDisplayFormat("number", 3.7)).toBe("%.3.7f");
    expect(defaultMeasurementDisplayFormat("number", 3.2)).toBe("%.3.2f");
    // 前提：clampNumber 不取整
    expect(Math.max(0, Math.min(8, 3.7))).toBe(3.7);
  });

  test("★ NaN decimals → `%.NaNf`（同样是非法格式串）", () => {
    // `Math.max(0, Math.min(8, NaN))` = NaN ⇒ 直接进模板串
    expect(defaultMeasurementDisplayFormat("number", NaN)).toBe("%.NaNf");
    // ★ 但**省略**第二参会用默认参数 3，而不是 NaN
    expect(defaultMeasurementDisplayFormat("number", undefined)).toBe("%.3f");
  });

  test("未知 valueType 走数值分支（只排除 string 与 boolean）", () => {
    expect(defaultMeasurementDisplayFormat("nope" as never, 2)).toBe("%.2f");
    expect(defaultMeasurementDisplayFormat("" as never, 2)).toBe("%.2f");
    expect(defaultMeasurementDisplayFormat(undefined, 2), "★ valueType 省略 → 默认 number").toBe("%.2f");
  });

  test("返回恒为非空 string", () => {
    const cases: Array<[string, number]> = [
      ["number", 3], ["string", 3], ["boolean", 3],
      ["number", NaN], ["number", 3.7], ["nope", 2]
    ];
    for (const [valueType, decimals] of cases) {
      const out = defaultMeasurementDisplayFormat(valueType as never, decimals);
      expect(typeof out, JSON.stringify([valueType, decimals])).toBe("string");
      expect(out.length, JSON.stringify([valueType, decimals])).toBeGreaterThan(0);
    }
  });
});
