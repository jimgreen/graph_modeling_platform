// terminalVoltageDisplayValue 的五级回退顺序直测。
//
// 此前只有外层 wrapper `terminalVoltageDisplay` 被 model-eexport.test.ts 测过（且走的是
// 「整节点」形状），本文件是第一次直接调用被测函数本身，并逐级构造
// 「上一级有值」/「上一级为空」成对的输入。
//
// 为什么必须成对：回退链里每一级都可能因为「某条别的路产出同一个值」而恒绿。
// 单看一级只能证明它被命中，成对输入才能证明优先级本身。
//
// 真实链路（src/model-eexport.ts）：
//   1. 端子自身非零 vbase（digits 抽取，零值不算）
//   2. 分侧电压参数（按端子下标：三绕组走 i/k/j/neutral，其余走 i 或 j 及 source/target/high/low 别名）
//   3. 节点继承的 params.vbase（仅非零）
//   4. 原始端子电压（零占位 0 也会原样返回，压住第 5 级）
//   5. params.vbase / voltage_level / rated_voltage / voltage（firstNonZeroVoltageBase）
//   6. 兜底 terminalVoltageBaseNumber(terminal?.vbase)
//
// 已知冗余分支（详见文件末尾说明，不要为它们硬凑断言）：
//   · 第 5 级列表里的 `node.params.vbase` 与第 3 级重复：非零已被第 3 级返回，
//     零值被 firstNonZeroVoltageBase 跳过，故该槽位对结果无影响。
//   · 第 6 级 `|| terminalVoltageBaseNumber(terminal?.vbase)`：能走到 1624 行说明
//     第 4 级的 rawTerminalVoltage 为空串，故该兜底恒为 ""。
import { describe, expect, test } from "vitest";
import { createDefaultNode } from "./model";
import { terminalVoltageDisplayValue } from "./model-eexport";

/** 用真实模板节点做底座，只覆盖 params 里显式给的键，其余保持模板默认。 */
function breakerWith(params: Record<string, string>, terminalVbase: string[]): ReturnType<typeof createDefaultNode> {
  const base = createDefaultNode("ac-breaker", { x: 0, y: 0 });
  return {
    ...base,
    params: { ...base.params, ...params },
    terminals: base.terminals.map((terminal, index) => ({ ...terminal, vbase: terminalVbase[index] ?? "" }))
  };
}

describe("terminalVoltageDisplayValue 第 1 级：端子自身非零 vbase 优先于分侧参数", () => {
  test("端子为非零时赢过 i_vbase / source_vbase / high_vbase 别名链", () => {
    const withSide = breakerWith({ i_vbase: "220", source_vbase: "230", high_vbase: "240" }, ["35", "0"]);
    // 数字化抽取：带单位文本也只取数字部分
    expect(terminalVoltageDisplayValue(withSide, withSide.terminals[0])).toBe("35");

    const withSideAlias = breakerWith({ source_vbase: "230" }, ["35.5 kV", "0"]);
    expect(terminalVoltageDisplayValue(withSideAlias, withSideAlias.terminals[0])).toBe("35.5");

    // 第二端子走 j 侧别名链，同样被端子自身压住
    const jSide = breakerWith({ j_vbase: "10", target_vbase: "11", low_vbase: "12" }, ["0", "0.4"]);
    expect(terminalVoltageDisplayValue(jSide, jSide.terminals[1])).toBe("0.4");
  });

  test("端子为空或为零占位时，这一级让位给分侧参数", () => {
    const empty = breakerWith({ i_vbase: "220" }, ["", "0"]);
    expect(terminalVoltageDisplayValue(empty, empty.terminals[0])).toBe("220");

    // 零占位（含 0.0 这种数值上等于零的写法）不算「非零」，必须让位
    const zeroPlaceholder = breakerWith({ source_vbase: "230" }, ["0.0", "0"]);
    expect(terminalVoltageDisplayValue(zeroPlaceholder, zeroPlaceholder.terminals[0])).toBe("230");

    // 下标认不出来（id 不存在，且端子不唯一）时不分侧：i_vbase 明明是 220 却用不上，
    // 结果落到第 4 级的零占位 0，而不是 220。
    const ambiguous = breakerWith({ i_vbase: "220" }, ["0", "0"]);
    expect(terminalVoltageDisplayValue(ambiguous, { ...ambiguous.terminals[0], id: "missing" })).toBe("0");

    // 同上，但端子为空串，第 4 级也失效 → 整条链走到末尾返回空串
    const ambiguousEmpty = breakerWith({ i_vbase: "220" }, ["", ""]);
    expect(terminalVoltageDisplayValue(ambiguousEmpty, { ...ambiguousEmpty.terminals[0], id: "missing" })).toBe("");

    // 唯一端子的节点即便不传 id 也能定下标（length === 1 分支），分侧重新生效
    const single = {
      ...breakerWith({ i_vbase: "220" }, ["0"]),
      terminals: breakerWith({ i_vbase: "220" }, ["0"]).terminals.slice(0, 1)
    };
    expect(terminalVoltageDisplayValue(single, { vbase: "0" })).toBe("220");
  });
});

describe("terminalVoltageDisplayValue 第 2 级：分侧参数优先于节点继承的 vbase", () => {
  test("三绕组按端子下标取 i / k / j 分侧值，胜过 params.vbase", () => {
    const base = createDefaultNode("ac-three-winding-transformer", { x: 0, y: 0 });
    const three = {
      ...base,
      params: { ...base.params, vbase: "750", i_vbase: "220", k_vbase: "121", j_vbase: "11" }
    };
    expect(terminalVoltageDisplayValue(three, three.terminals[0])).toBe("220");
    expect(terminalVoltageDisplayValue(three, three.terminals[1])).toBe("121");
    expect(terminalVoltageDisplayValue(three, three.terminals[2])).toBe("11");
  });

  test("分侧参数为零时让位给节点继承的 vbase（对称的反向对）", () => {
    const node = breakerWith({ vbase: "750", i_vbase: "0", source_vbase: "0", high_vbase: "0" }, ["0", "0"]);
    expect(terminalVoltageDisplayValue(node, node.terminals[0])).toBe("750");

    // 三绕组的 neutral_vbase 在模板里默认是 "1.0"，非零；显式清零才能让位
    const base = createDefaultNode("ac-three-winding-transformer", { x: 0, y: 0 });
    const three = {
      ...base,
      params: { ...base.params, vbase: "750", i_vbase: "0", k_vbase: "0", j_vbase: "0", neutral_vbase: "0" }
    };
    expect(terminalVoltageDisplayValue(three, three.terminals[0])).toBe("750");
  });
});

describe("terminalVoltageDisplayValue 第 3、4 级：节点继承 vbase 优先于原始端子零占位", () => {
  test("params.vbase 非零时压住端子零占位 0", () => {
    const inherited = breakerWith({ vbase: "750" }, ["0", "0"]);
    expect(terminalVoltageDisplayValue(inherited, inherited.terminals[0])).toBe("750");
    expect(terminalVoltageDisplayValue(inherited, inherited.terminals[1])).toBe("750");

    // 反向对：params.vbase 也是零占位时，第 3 级让位，第 4 级返回原始 0
    const notInherited = breakerWith({ vbase: "0" }, ["0", "0"]);
    expect(terminalVoltageDisplayValue(notInherited, notInherited.terminals[0])).toBe("0");
  });

  test("params.vbase 为空串等同零占位，仍让第 4 级返回 0", () => {
    const node = breakerWith({ vbase: "" }, ["0", ""]);
    expect(terminalVoltageDisplayValue(node, node.terminals[0])).toBe("0");
  });
});

describe("terminalVoltageDisplayValue 第 4 级压住第 5 级：零占位 0 不被设备默认参数顶掉", () => {
  test("端子为零占位时即使 voltage_level 有值也返回 0（注释里记的原版语义）", () => {
    // ac-breaker 模板默认 rated_voltage = "0"，这里显式给非零值以确保断言落在 voltage_level 上
    const node = breakerWith({ vbase: "0", voltage_level: "35 kV", rated_voltage: "10 kV" }, ["0", "0"]);
    expect(terminalVoltageDisplayValue(node, node.terminals[0])).toBe("0");
  });

  test("端子为空串时第 4 级失效，才轮到 voltage_level", () => {
    const node = breakerWith({ vbase: "0", voltage_level: "35 kV", rated_voltage: "10 kV" }, ["", ""]);
    expect(terminalVoltageDisplayValue(node, node.terminals[0])).toBe("35");
  });
});

describe("terminalVoltageDisplayValue 第 5 级：设备电压参数优先级 voltage_level → rated_voltage → voltage", () => {
  test("voltage_level 赢过 rated_voltage 与 voltage", () => {
    const node = breakerWith({ vbase: "0", voltage_level: "35 kV", rated_voltage: "10 kV", voltage: "6 kV" }, ["", ""]);
    expect(terminalVoltageDisplayValue(node, node.terminals[0])).toBe("35");
  });

  test("voltage_level 为零或缺失时轮到 rated_voltage", () => {
    const zeroLevel = breakerWith({ vbase: "0", voltage_level: "0", rated_voltage: "10 kV", voltage: "6 kV" }, ["", ""]);
    expect(terminalVoltageDisplayValue(zeroLevel, zeroLevel.terminals[0])).toBe("10");

    const missingLevel = breakerWith({ vbase: "0", rated_voltage: "10 kV", voltage: "6 kV" }, ["", ""]);
    expect(terminalVoltageDisplayValue(missingLevel, missingLevel.terminals[0])).toBe("10");
  });

  test("只剩 params.voltage 时由它兜住该级", () => {
    const node = breakerWith({ vbase: "0", voltage: "6 kV" }, ["", ""]);
    expect(terminalVoltageDisplayValue(node, node.terminals[0])).toBe("6");
  });
});

describe("terminalVoltageDisplayValue 全来源皆空", () => {
  test("返回空串，且不因缺 terminal / 缺 params 而抛错", () => {
    const base = createDefaultNode("ac-breaker", { x: 0, y: 0 });
    // 显式把模板默认的 vbase / rated_voltage 全部清掉
    const empty = {
      ...base,
      params: { ...base.params, vbase: "", rated_voltage: "" },
      terminals: base.terminals.map((terminal) => ({ ...terminal, vbase: "" }))
    };
    expect(terminalVoltageDisplayValue(empty, empty.terminals[0])).toBe("");

    const bare = { kind: base.kind, params: {}, terminals: base.terminals };
    expect(terminalVoltageDisplayValue(bare, { vbase: "" })).toBe("");
    expect(terminalVoltageDisplayValue(bare, { vbase: undefined })).toBe("");
    expect(terminalVoltageDisplayValue(bare)).toBe("");
  });
});

// —— 冗余分支记录 ——
//
// 上文断言已覆盖每一级的判据本身。剩下两处分支对结果无影响，绿是正确结果：
//
// A. 第 5 级列表首项 `node.params.vbase`：非零时第 3 级已返回，零值被
//    firstNonZeroVoltageBase 跳过。删掉它，本文件全部断言仍绿。
//    本文件里 params.vbase 一直是零占位/空串，所以它从未成为决定值的那一项。
//
// B. 第 6 级 `|| terminalVoltageBaseNumber(terminal?.vbase)`：能执行到 1624 行，
//    说明第 4 级的 rawTerminalVoltage 是空串，故该兜底恒为 ""。删掉它，全部断言仍绿。
//
// 若将来要让这两条也变红，需要的是「params.vbase 非零且第 3 级被移除」或
// 「rawTerminalVoltage 非空且第 4 级被移除」这种双重缺陷组合，而不是补断言。