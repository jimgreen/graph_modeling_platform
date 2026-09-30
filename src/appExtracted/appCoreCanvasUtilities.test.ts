// 端子电压兜底与电压配色键。
//
// 这个文件此前零直接测试，而它里面藏着一次**只在运行到才炸**的缺陷：
// `terminalVbaseFallbackValue` 用了 `isThreeWindingTransformerKind` 却没 import ——
// 文件头是 `// @ts-nocheck`，`pnpm tsc --noEmit` 不报，`vitest` 也不报（此前无人调用），
// 只有 `pnpm audit:names` 抓得到。任何一次「选中设备 → 读端子电压」都会 ReferenceError。
// 本文件把这条路径真正跑起来，让缺失的 import 变成编译期/测试期可见的失败。
import { describe, expect, test } from "vitest";
import type { DeviceKind, ModelNode, TerminalType } from "../model";
import { terminalVbaseFallbackValue, voltageColorKeyForTerminal } from "./appCoreCanvasUtilities";

const terminal = (type: TerminalType, vbase: string, index: number) => ({
  id: `t${index}`,
  label: `端子${index + 1}`,
  type,
  anchor: { x: index * 10, y: 0 },
  nodeNumber: String(index + 1),
  vbase
});

// 只带上被测两个纯函数读到的字段：kind / params / terminals。
// 走 createDefaultNode 会把 model-node-ops 拉进 import 链，绕回 model.ts 形成
// 循环依赖，在测试里炸 `INTERACTIVE_STATIC_DRAWING_KINDS is not iterable`。
const node = (kind: DeviceKind, params: Record<string, string>, terminalCount = 2): ModelNode =>
  ({
    id: "n1",
    kind,
    name: kind,
    params,
    terminals: Array.from({ length: terminalCount }, (_, index) => terminal("ac", "", index))
  }) as ModelNode;

describe("terminalVbaseFallbackValue", () => {
  test("三绕组：四个端子各取自己的绕组侧，端子自身 vbase 缺失时才兜底", () => {
    const n = node(
      "ac-three-winding-transformer",
      { i_vbase: "110", k_vbase: "35", j_vbase: "10", neutral_vbase: "10.5" },
      4
    );
    expect([0, 1, 2, 3].map((i) => terminalVbaseFallbackValue(n, i))).toEqual(["110", "35", "10", "10.5"]);
  });

  test("三绕组：分侧键缺失时回退到 legacy 侧键（high/medium/low）", () => {
    const n = node(
      "ac-three-winding-transformer",
      { high_vbase: "110", medium_vbase: "35", low_vbase: "10" },
      3
    );
    expect([0, 1, 2].map((i) => terminalVbaseFallbackValue(n, i))).toEqual(["110", "35", "10"]);
  });

  test("三绕组：中性点端子无 neutral_vbase 时回退到通用 vbase", () => {
    const n = node("ac-three-winding-transformer-neutral", { i_vbase: "110", vbase: "35" }, 4);
    expect(terminalVbaseFallbackValue(n, 3)).toBe("35");
  });

  test("中性点变体同样走三绕组分支（不是两绕组）", () => {
    const n = node("ac-three-winding-transformer-neutral", { i_vbase: "110", k_vbase: "35", j_vbase: "10" }, 4);
    // 走两绕组分支时端子 2 会拿到 j_vbase（这里恰好相同），故用 k 侧区分
    const m = node("ac-three-winding-transformer-neutral", { i_vbase: "110", medium_vbase: "35", j_vbase: "10" }, 4);
    expect(terminalVbaseFallbackValue(m, 1)).toBe("35");
    expect(terminalVbaseFallbackValue(n, 1)).toBe("35");
  });

  test("两绕组：端子 0 取源侧、其余取目标侧，逐级兜底", () => {
    const n = node("ac-transformer", { i_vbase: "110", j_vbase: "35" });
    expect(terminalVbaseFallbackValue(n, 0)).toBe("110");
    expect(terminalVbaseFallbackValue(n, 1)).toBe("35");
    expect(terminalVbaseFallbackValue(n, 2)).toBe("35");
  });

  test("两绕组：source/target 别名优先于 high/low", () => {
    const n = node("ac-transformer", { source_vbase: "220", target_vbase: "10", high_vbase: "999", low_vbase: "888" });
    expect([terminalVbaseFallbackValue(n, 0), terminalVbaseFallbackValue(n, 1)]).toEqual(["220", "10"]);
  });

  test("全缺时按 vbase → voltage_level → rated_voltage 逐级兜底", () => {
    expect(terminalVbaseFallbackValue(node("ac-transformer", {}), 0)).toBe("");
    expect(terminalVbaseFallbackValue(node("ac-transformer", { vbase: "110" }), 0)).toBe("110");
    expect(terminalVbaseFallbackValue(node("ac-transformer", { voltage_level: "35" }), 0)).toBe("35");
    expect(terminalVbaseFallbackValue(node("ac-transformer", { rated_voltage: "10" }), 0)).toBe("10");
  });

  test("非变压器设备不受两绕组分支影响", () => {
    expect(terminalVbaseFallbackValue(node("ac-load", { vbase: "10" }), 0)).toBe("10");
  });
});

describe("voltageColorKeyForTerminal", () => {
  test("非电类型（氢/热）不参与电压配色", () => {
    const n = node("ac-transformer", { i_vbase: "110" });
    for (const type of ["h2", "heat"] as const) {
      expect(voltageColorKeyForTerminal(n, terminal(type, "", 0), 0)).toBe("");
    }
  });

  test("ac/dc 各自成键，同电压不同类型不撞色", () => {
    const n = node("ac-transformer", { i_vbase: "110", j_vbase: "35" });
    expect(voltageColorKeyForTerminal(n, terminal("ac", "", 0), 0)).toBe("ac:110");
    expect(voltageColorKeyForTerminal(n, terminal("ac", "", 1), 1)).toBe("ac:35");
    expect(voltageColorKeyForTerminal(n, terminal("dc", "", 1), 1)).toBe("dc:35");
  });

  test("端子自带 vbase 时优先于 params 兜底", () => {
    const n = node("ac-transformer", { i_vbase: "110", j_vbase: "35" });
    expect(voltageColorKeyForTerminal(n, terminal("ac", "220", 0), 0)).toBe("ac:220");
  });

  test("电压为空时不成键（不落到兜底电压上）", () => {
    const n = node("ac-transformer", {});
    expect(voltageColorKeyForTerminal(n, terminal("ac", "", 0), 0)).toBe("");
  });

  test("电压为 0 视为未填（与电压继承 isNodeVoltageDefault 同口径）", () => {
    const n = node("ac-transformer", { i_vbase: "110" });
    expect(voltageColorKeyForTerminal(n, terminal("ac", "0", 0), 0)).toBe("ac:110");
    const zero = node("ac-transformer", { i_vbase: "0" });
    expect(voltageColorKeyForTerminal(zero, terminal("ac", "", 0), 0)).toBe("");
  });

  test("带单位写法（'35 kV'）归一后与纯数字同键", () => {
    const n = node("ac-transformer", {});
    const key = (vbase: string) => voltageColorKeyForTerminal(n, terminal("ac", vbase, 0), 0);
    expect(key("35 kV")).toBe("ac:35");
    expect(key("35")).toBe("ac:35");
  });
});
