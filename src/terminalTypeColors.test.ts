// TERMINAL_TYPE_COLORS 此前零覆盖：它只是 model.ts 里一张端子类型 → 色值表，
// 唯一消费者是 DEFAULT_COLOR_PALETTE.energy 的一次展开（`{ ...TERMINAL_TYPE_COLORS }`）。
// 表本身没有测试，所以下面几类改动会静默生效：
//   · 少一个端子类型 —— Record<TerminalType, string> 的类型标注只在 tsc 开着的
//     路径上拦得住，纯跑 vitest 时该端子退回默认色，用户看不出差别，也不报错；
//   · 多一个键 —— 比如误写一个 dc2，若靠 as 断言绕过类型检查，它永远不会命中；
//   · 色值写错 —— 少一位、混入非十六进制字符、或把两个端子改成同一个颜色，
//     前端照样能画（同名色仍合法），只是两类端子再也分不开；
//   · 色值静默漂移 —— 改一位十六进制是纯视觉回归，没有任何报错。
// 因此这里钉四层：键集精确、色值形状合法、四个值互不相同、具体值逐键钉死。
import { describe, expect, test } from "vitest";

import { TERMINAL_TYPE_COLORS } from "./model";

/** 四个端子类型，与 model.ts 里 TerminalType 联合类型逐一对应。 */
const TERMINAL_TYPES = ["ac", "dc", "h2", "heat"] as const;

/** 井号加六位小写十六进制；限定小写是为了跟同文件邻居 VOLTAGE_LEVEL_COLORS 的约定一致。 */
const HEX_COLOR = /^#[0-9a-f]{6}$/;

describe("TERMINAL_TYPE_COLORS 键集", () => {
  test("恰好覆盖 ac/dc/h2/heat 四个端子类型，无缺失也无多余", () => {
    // 键集用 toEqual 精确比对：多一个键、少一个键都会失败。
    expect(Object.keys(TERMINAL_TYPE_COLORS).sort()).toEqual([...TERMINAL_TYPES].sort());
    expect(Object.keys(TERMINAL_TYPE_COLORS)).toHaveLength(4);
  });

  test("四个键都能作为属性取到字符串值（不会被写成 undefined）", () => {
    for (const terminalType of TERMINAL_TYPES) {
      const color = TERMINAL_TYPE_COLORS[terminalType];
      expect(typeof color, `端子类型 ${terminalType} 的色值应为字符串`).toBe("string");
      // Record 类型标注会让读起来像不可能 undefined，但空串、漏写都能过 tsc。
      expect(color, `端子类型 ${terminalType} 缺少色值`).toBeTruthy();
    }
  });
});

describe("TERMINAL_TYPE_COLORS 色值形状", () => {
  test("每个值都是井号加六位小写十六进制", () => {
    for (const [terminalType, color] of Object.entries(TERMINAL_TYPE_COLORS)) {
      expect(typeof color, `端子类型 ${terminalType} 的色值应为字符串`).toBe("string");
      expect(color, `端子类型 ${terminalType} 的色值 ${color} 不符合井号加六位十六进制`).toMatch(
        HEX_COLOR
      );
    }
  });
});

describe("TERMINAL_TYPE_COLORS 互异性", () => {
  test("四个端子类型各用各的色，不允许撞色", () => {
    // 撞色不会让任何一行代码报错，只是两类端子在画布上再也分不开。
    // 先钉住长度，否则下面那个去重断言在表被清空时会空转恒绿。
    const colors = TERMINAL_TYPES.map((terminalType) => TERMINAL_TYPE_COLORS[terminalType]);
    expect(colors).toHaveLength(4);
    expect(new Set(colors).size, `端子类型配色出现重复：${colors.join(", ")}`).toBe(4);
  });
});

describe("TERMINAL_TYPE_COLORS 具体键值", () => {
  test("四个端子类型的色值逐键钉死，调色板改动会在这里显形", () => {
    // 这四条是唯一的漂移探测点：改一位十六进制是纯视觉回归，没有别的断言会红。
    expect(TERMINAL_TYPE_COLORS.ac).toBe("#2563eb");
    expect(TERMINAL_TYPE_COLORS.dc).toBe("#0f766e");
    expect(TERMINAL_TYPE_COLORS.h2).toBe("#7c3aed");
    expect(TERMINAL_TYPE_COLORS.heat).toBe("#dc2626");
  });
});