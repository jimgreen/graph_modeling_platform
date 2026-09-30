// src/model.ts 的两/三绕组变压器参数：退休旧名判定 + 参数定义表。
// 这两张表与两个判定函数此前没有任何测试引用。判错后果是「E 文件某一列突然空掉」
// 「旧名参数没被识别、界面参数表少一行」「两绕组与三绕组的字段串台」，属静默算错一类。
import { describe, expect, test } from "vitest";

import {
  isRetiredThreeWindingTransformerParameterName,
  isRetiredTwoWindingTransformerParameterName,
  threeWindingTransformerParameterDefinitions,
  twoWindingTransformerParameterDefinitions
} from "./model";

const TWO_CANONICAL = [
  "idx", "name", "status", "run_stat", "i_vbase", "j_vbase", "ratedCapacity",
  "i_i_max", "j_i_max", "i_p", "i_q", "i_u", "i_i", "j_p", "j_q", "j_u", "j_i",
  "tap", "tap_set", "shift"
];

const THREE_CANONICAL = [
  "idx", "name", "dev_type", "status", "run_stat", "i_node", "k_node", "j_node", "neutral_node",
  "i_vbase", "i_rated_capacity", "i_i_max", "k_vbase", "k_rated_capacity", "k_i_max",
  "j_vbase", "j_rated_capacity", "j_i_max", "i_r", "i_x", "i_gt", "i_bt", "i_tap", "i_shift",
  "k_r", "k_x", "k_gt", "k_bt", "k_tap", "k_shift",
  "j_r", "j_x", "j_gt", "j_bt", "j_tap", "j_shift",
  "i_p", "i_q", "i_u", "i_i", "k_p", "k_q", "k_u", "k_i", "j_p", "j_q", "j_u", "j_i"
];

const enNames = (definitions: readonly { enName: string }[]) => definitions.map((d) => d.enName);

// 说明一处**不可覆盖**的等价变异：两张旧名表里每一组都同时列了 snake 与 camel 两种写法
// （`["i_vbase", ["high_vbase", "highVbase"]]`）。所以把建表时的
// `aliases.map((alias) => toSnakeCaseDeviceParamName(alias))` 去掉归一化，camel 那份
// 变成永远查不到的死条目，而 snake 那份仍覆盖同样的全部输入 —— 判定函数输入侧照旧归一化，
// 结果完全一样（已验证：去掉归一化后本文件全绿）。因此下面这批「camel / 全大写 / 空格分隔」
// 用例证明的是**判定函数输入侧的归一化**，不是建表侧的；建表侧只有在别名表只留 camel 写法时
// 才有可观测差异，而现状不满足那个前提。

describe("isRetiredTwoWindingTransformerParameterName", () => {
  test("★ 本名一律不退休（判据是「旧名」表，不是「参数表里有」就退休）", () => {
    for (const name of TWO_CANONICAL) {
      expect(isRetiredTwoWindingTransformerParameterName(name), name).toBe(false);
    }
  });

  test("旧名的四种写法都判退休：snake / camel / 全大写 / 空格分隔", () => {
    for (const name of ["high_vbase", "highVbase", "HIGH_VBASE", "high i max", "  high_vbase  ", "highIMax"]) {
      expect(isRetiredTwoWindingTransformerParameterName(name), name).toBe(true);
    }
  });

  test("★ t1_node / t2_node 退休，但 t3_node 不退休（两绕组没有第三侧）", () => {
    expect(isRetiredTwoWindingTransformerParameterName("t1_node")).toBe(true);
    expect(isRetiredTwoWindingTransformerParameterName("t2_node")).toBe(true);
    expect(isRetiredTwoWindingTransformerParameterName("t3_node")).toBe(false);
  });

  test("单字母量测旧名 p / q / u / i 退休（与量测列 i_p… 同形，别混）", () => {
    for (const name of ["p", "q", "u", "i"]) expect(isRetiredTwoWindingTransformerParameterName(name), name).toBe(true);
    for (const name of ["i_p", "i_q", "i_u", "i_i"]) {
      expect(isRetiredTwoWindingTransformerParameterName(name), name).toBe(false);
    }
  });

  test("中压侧（medium_*）与三绕组的 r1/x1/tap1 都不属于两绕组旧名", () => {
    for (const name of ["medium_vbase", "r1", "x1", "tap1", "shift1"]) {
      expect(isRetiredTwoWindingTransformerParameterName(name), name).toBe(false);
    }
  });

  test("无关名字不退休", () => {
    for (const name of ["max_current", "i_max", "", "   ", "rated_capacity"]) {
      expect(isRetiredTwoWindingTransformerParameterName(name), name).toBe(false);
    }
  });
});

describe("isRetiredThreeWindingTransformerParameterName", () => {
  test("★ 本名一律不退休", () => {
    for (const name of THREE_CANONICAL) {
      expect(isRetiredThreeWindingTransformerParameterName(name), name).toBe(false);
    }
  });

  test("三侧旧名都退休（high / medium / low 各一组）", () => {
    for (const name of ["high_vbase", "medium_vbase", "low_vbase", "highMaxCurrent", "mediumMaxCurrent", "lowMaxCurrent"]) {
      expect(isRetiredThreeWindingTransformerParameterName(name), name).toBe(true);
    }
  });

  test("三绕组独有的 r1/r2/r3、x*、gt*、bt*、tap*、shift* 旧名退休", () => {
    for (const name of ["r1", "r2", "r3", "x1", "gt1", "bt3", "tap1", "shift3"]) {
      expect(isRetiredThreeWindingTransformerParameterName(name), name).toBe(true);
    }
  });

  test("★ t1/t2/t3_node 三者都退休（与两绕组不同）", () => {
    for (const name of ["t1_node", "t2_node", "t3_node"]) {
      expect(isRetiredThreeWindingTransformerParameterName(name), name).toBe(true);
    }
  });

  test("★ 两绕组独有的旧名不串台：resistance_pu / tap_ratio 只在两绕组退休", () => {
    for (const name of ["resistance_pu", "tap_ratio", "reactance_pu", "magnetizing_conductance_pu"]) {
      expect(isRetiredThreeWindingTransformerParameterName(name), name).toBe(false);
      expect(isRetiredTwoWindingTransformerParameterName(name), name).toBe(true);
    }
    // 两绕组的裸 r / x / tap / shift 在三绕组也不退休
    for (const name of ["r", "x", "tap", "shift"]) {
      expect(isRetiredThreeWindingTransformerParameterName(name), name).toBe(false);
      expect(isRetiredTwoWindingTransformerParameterName(name), name).toBe(false);
    }
  });
});

describe("变压器参数定义表：跨表不变量", () => {
  test("★ 定义表里不含被判退休的名字（既定义又退休 = 自相矛盾）", () => {
    const retiredInTwo = TWO_CANONICAL.filter((name) => isRetiredTwoWindingTransformerParameterName(name));
    const retiredInThree = THREE_CANONICAL.filter((name) => isRetiredThreeWindingTransformerParameterName(name));
    expect(retiredInTwo).toEqual([]);
    expect(retiredInThree).toEqual([]);
    // 再对着实际表体查一遍（上面的常量表也一起被钉住，两处都不会漂）
    for (const name of enNames(twoWindingTransformerParameterDefinitions)) {
      expect(isRetiredTwoWindingTransformerParameterName(name), `两绕组 ${name}`).toBe(false);
    }
    for (const name of enNames(threeWindingTransformerParameterDefinitions)) {
      expect(isRetiredThreeWindingTransformerParameterName(name), `三绕组 ${name}`).toBe(false);
    }
  });

  test("★ 三绕组三侧字段集完全对称（i / k / j 后缀集合一致）", () => {
    const suffixes = (side: string) =>
      enNames(threeWindingTransformerParameterDefinitions)
        .filter((name) => name.startsWith(`${side}_`))
        .map((name) => name.slice(side.length + 1));
    expect(suffixes("i").length).toBe(14);
    expect(suffixes("k")).toEqual(suffixes("i"));
    expect(suffixes("j")).toEqual(suffixes("i"));
  });

  test("量测列齐备：三侧 × 有功/无功/电压/电流", () => {
    const measurement = (prefix: string) => ["p", "q", "u", "i"].map((unit) => `${prefix}_${unit}`);
    for (const side of ["i", "k", "j"]) {
      const names = enNames(threeWindingTransformerParameterDefinitions);
      expect(measurement(side).every((name) => names.includes(name)), side).toBe(true);
    }
    const twoNames = enNames(twoWindingTransformerParameterDefinitions);
    // 两绕组只有 i / j 两侧
    expect(measurement("i").every((name) => twoNames.includes(name))).toBe(true);
    expect(measurement("j").every((name) => twoNames.includes(name))).toBe(true);
    expect(twoNames.some((name) => name.startsWith("k_"))).toBe(false);
  });

  test("表内 enName 不重复", () => {
    for (const names of [enNames(twoWindingTransformerParameterDefinitions), enNames(threeWindingTransformerParameterDefinitions)]) {
      expect(new Set(names).size).toBe(names.length);
    }
  });
});

describe("变压器参数定义表：固定形状", () => {
  test("两绕组 20 列，顺序与内容逐条钉住", () => {
    expect(enNames(twoWindingTransformerParameterDefinitions)).toEqual(TWO_CANONICAL);
  });

  test("三绕组 48 列，顺序与内容逐条钉住", () => {
    expect(enNames(threeWindingTransformerParameterDefinitions)).toEqual(THREE_CANONICAL);
  });

  test("★ 两绕组用驼峰 ratedCapacity，三绕组用分侧的 i/k/j_rated_capacity（不对称是现状）", () => {
    const twoNames = enNames(twoWindingTransformerParameterDefinitions);
    expect(twoNames).toContain("ratedCapacity");
    expect(twoNames).not.toContain("rated_capacity");
    expect(enNames(threeWindingTransformerParameterDefinitions).filter((name) => name.endsWith("_rated_capacity"))).toEqual([
      "i_rated_capacity",
      "k_rated_capacity",
      "j_rated_capacity"
    ]);
  });

  test("只读列：idx / name（两绕组）；三绕组另含四个节点号", () => {
    const readonlyNames = (definitions: readonly { enName: string; readonly?: boolean }[]) =>
      definitions.filter((d) => d.readonly === true).map((d) => d.enName);
    expect(readonlyNames(twoWindingTransformerParameterDefinitions)).toEqual(["idx", "name"]);
    expect(readonlyNames(threeWindingTransformerParameterDefinitions)).toEqual([
      "idx", "name", "i_node", "k_node", "j_node", "neutral_node"
    ]);
  });

  test("状态列是 numberEnum 且带枚举值，dev_type 只在三绕组里", () => {
    const byName = new Map(twoWindingTransformerParameterDefinitions.map((d) => [d.enName, d]));
    expect(byName.get("status")?.valueType).toBe("numberEnum");
    expect(byName.get("status")?.enumValues).toEqual(["1", "0"]);
    expect(byName.get("status")?.typicalValue).toBe("1");
    expect(byName.get("run_stat")?.enumValues).toEqual(["1", "0"]);
    expect(byName.get("run_stat")?.enumValueType).toBe("number");
    expect(byName.get("run_stat")?.enumOptions).toEqual([
      { value: "1", label: "运行" },
      { value: "0", label: "停运" }
    ]);
    expect(byName.has("dev_type")).toBe(false);
    const threeByName = new Map(threeWindingTransformerParameterDefinitions.map((d) => [d.enName, d]));
    expect(threeByName.get("dev_type")?.exportName).toBe("dev_type");
    expect(threeByName.get("dev_type")?.readonly).toBe(false);
    expect(threeByName.get("status")?.enumValues).toEqual(["1", "0"]);
    expect(threeByName.get("run_stat")?.enumValueType).toBe("number");
    expect(threeByName.get("run_stat")?.enumOptions).toEqual([
      { value: "1", label: "运行" },
      { value: "0", label: "停运" }
    ]);
  });

  test("两绕组电压等级与最大电流典型值都是 0（新建变压器不该默认带非零电压）", () => {
    const byName = new Map(twoWindingTransformerParameterDefinitions.map((d) => [d.enName, d]));
    for (const name of ["i_vbase", "j_vbase", "i_i_max", "j_i_max"]) {
      expect(byName.get(name)?.typicalValue, name).toBe("0");
    }
  });

  test("★ 分接头典型值是 1.0，其余量测列是 0（写成 1 会让变压器默认档位错）", () => {
    const byName = new Map(twoWindingTransformerParameterDefinitions.map((d) => [d.enName, d]));
    expect(byName.get("tap")?.typicalValue).toBe("1.0");
    expect(byName.get("tap_set")?.typicalValue).toBe("0");
    for (const name of ["i_p", "i_q", "i_u", "i_i", "j_p", "j_q", "j_u", "j_i", "shift"]) {
      expect(byName.get(name)?.typicalValue, name).toBe("0");
    }
  });

  test("额定容量典型值：两绕组 50、三绕组各侧 90", () => {
    const twoByName = new Map(twoWindingTransformerParameterDefinitions.map((d) => [d.enName, d]));
    expect(twoByName.get("ratedCapacity")?.typicalValue).toBe("50");
    const threeByName = new Map(threeWindingTransformerParameterDefinitions.map((d) => [d.enName, d]));
    for (const side of ["i", "k", "j"]) {
      expect(threeByName.get(`${side}_rated_capacity`)?.typicalValue, side).toBe("90");
    }
  });

  test("量测列带 exportEnabled，容量/电压等普通列不带", () => {
    const byName = new Map(twoWindingTransformerParameterDefinitions.map((d) => [d.enName, d]));
    expect(byName.get("i_p")?.exportEnabled).toBe(true);
    expect(Object.prototype.hasOwnProperty.call(byName.get("ratedCapacity"), "exportEnabled")).toBe(false);
  });

  test("★ 相移列不带 exportEnabled，分接头档位带（两者都是 E 文件里的实参列，缺了就导不出）", () => {
    const byName = new Map(twoWindingTransformerParameterDefinitions.map((d) => [d.enName, d]));
    expect(byName.get("tap_set")?.exportEnabled).toBe(true);
    expect(Object.prototype.hasOwnProperty.call(byName.get("shift"), "exportEnabled")).toBe(false);
  });

  test("节点号与序号都是 integer 值类型", () => {
    const threeByName = new Map(threeWindingTransformerParameterDefinitions.map((d) => [d.enName, d]));
    for (const name of ["idx", "i_node", "k_node", "j_node", "neutral_node"]) {
      expect(threeByName.get(name)?.valueType, name).toBe("integer");
    }
    const twoByName = new Map(twoWindingTransformerParameterDefinitions.map((d) => [d.enName, d]));
    expect(twoByName.get("idx")?.valueType).toBe("integer");
    expect(twoByName.get("name")?.valueType).toBe("string");
  });

  test("★ 三绕组侧字段典型值：三侧一致（r 0.0 / x 0.1 / gt 0.0 / bt 0.0 / tap 1.0 / shift 0）", () => {
    const byName = new Map(threeWindingTransformerParameterDefinitions.map((d) => [d.enName, d]));
    const expected: Record<string, string> = { r: "0.0", x: "0.1", gt: "0.0", bt: "0.0", tap: "1.0", shift: "0" };
    for (const side of ["i", "k", "j"]) {
      for (const [suffix, value] of Object.entries(expected)) {
        expect(byName.get(`${side}_${suffix}`)?.typicalValue, `${side}_${suffix}`).toBe(value);
      }
    }
  });

  test("★ 两绕组参数表里没有 r / x / gt / bt 列（旧名表却指向它们，见下方注释）", () => {
    // 现状（钉住以防误以为「旧名表的目标 = 参数表里的列」）：
    // TWO_WINDING_TRANSFORMER_PARAMETER_ALIASES 把 resistance_pu / reactance_pu /
    // magnetizing_*_pu 都映射到 r / x / gt / bt，但这四个名字在两绕组参数表里
    // **并不存在**（两绕组只暴露 tap / tap_set / shift）。所以这些旧名退休后无处可去，
    // 是有意的清理，不是漏列 —— 三绕组侧才有 i_r / i_x / i_gt / i_bt。
    const names = enNames(twoWindingTransformerParameterDefinitions);
    for (const name of ["r", "x", "gt", "bt"]) expect(names, name).not.toContain(name);
    for (const name of ["tap", "tap_set", "shift"]) expect(names, name).toContain(name);
  });
});
