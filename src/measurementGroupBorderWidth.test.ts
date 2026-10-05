// DEFAULT_MEASUREMENT_GROUP_BORDER_WIDTH 的零覆盖（此前完全没被测过）
//
// 同组另外三个兄弟常量 BACKGROUND_COLOR / BORDER_COLOR / BORDER_STYLE 都已被
// svgExportUtilsMeasurement.test.ts 断言过，唯独宽度漏了，而它恰恰是量测组
// 「默认不描边」这条语义的承重常量：
//   · normalizeGroupConfig / normalizeMeasurementConfig 在 borderWidth 缺失
//     （undefined / null / ""）时回落到它 —— 即用户从未设置过宽度时，
//     归一化结果是 0 而不是 undefined。
//   算错不报错，只是画歪：0 表示无描边（与 borderStyle 默认的 none 配套），
// 任何正数都会让默认量测组凭空多出一圈边。
//
// 数值域来自 normalizedGroupBorderWidth 里的 clampNumber(finiteNumber(value, 1), 0, 12)：
// 合法区间 [0, 12]，0 是下界。
import { describe, expect, test } from "vitest";
import * as measurements from "./measurements";
import { DEFAULT_MEASUREMENT_GROUP_BORDER_WIDTH } from "./measurements";

const SIBLING_DEFAULT_KEYS = [
  "DEFAULT_MEASUREMENT_GROUP_BACKGROUND_COLOR",
  "DEFAULT_MEASUREMENT_GROUP_BORDER_COLOR",
  "DEFAULT_MEASUREMENT_GROUP_BORDER_STYLE",
  "DEFAULT_MEASUREMENT_GROUP_BORDER_WIDTH"
];

describe("量测组默认边框宽度", () => {
  test("严格等于 0：量测组默认不描边", () => {
    // 变异提示：把这个 0 改成 1（normalizedGroupBorderWidth 内部那个 1 号兜底）
    // 或者改成 2，本条立即转红。0 与 1 都「像合法的非负宽度」，所以必须严格相等，
    // 不能只断言 >= 0 —— 后者对 0 和 1 一视同仁，测不出任何东西。
    expect(DEFAULT_MEASUREMENT_GROUP_BORDER_WIDTH).toBe(0);

    // 缺了 typeof 这条，写成 "0"（字符串）也能过上面的 toBe？不，toBe 会拦。
    // 但写成 "0" 时若有人把断言改成 == ，typeof 就是唯一的拦网，故保留。
    expect(typeof DEFAULT_MEASUREMENT_GROUP_BORDER_WIDTH).toBe("number");
  });

  test("落在归一化的合法数值域 [0, 12] 内", () => {
    // 有限 + 非负。注意 0 同时是「合法下界」和「数值型兜底最容易撞上的值」，
    // 所以这里必须另配 toBe(0) 才具备区分力；单独这两条断言对 0 与 1 无差别。
    expect(Number.isFinite(DEFAULT_MEASUREMENT_GROUP_BORDER_WIDTH)).toBe(true);
    expect(DEFAULT_MEASUREMENT_GROUP_BORDER_WIDTH >= 0).toBe(true);
    expect(DEFAULT_MEASUREMENT_GROUP_BORDER_WIDTH <= 12).toBe(true);
  });

  test("四个 DEFAULT_MEASUREMENT_GROUP_* 兄弟常量键集完整", () => {
    // 键集断言（而非逐个比值）：兄弟常量的**值**由 svgExportUtilsMeasurement.test.ts
    // 负责，这里只负责「宽度不是漏网的那一个」+「将来新增第 5 个兄弟时会被提醒」。
    //
    // 刻意不写 expect(measurements.X).toBe(X)：命名导入与命名空间导入取的是同一个
    // 模块的同一个绑定，那种断言恒绿，是本仓 AGENTS.md 点名的「断言了变异改不动的对象」。
    // 要让本测试转红，键集必须由模块的真实导出列表推导。
    const exportedKeys = Object.keys(measurements)
      .filter((key) => key.startsWith("DEFAULT_MEASUREMENT_GROUP_"))
      .sort();

    expect(exportedKeys).toEqual(SIBLING_DEFAULT_KEYS);
    // 删掉宽度导出（即退回成局部常量）时，toEqual 就会红。
    expect(exportedKeys).toContain("DEFAULT_MEASUREMENT_GROUP_BORDER_WIDTH");
  });
});