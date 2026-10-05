// VOLTAGE_LEVEL_COLORS 此前零覆盖：它只是 model.ts 里一张电压等级 → 色值表，
// 唯一消费者是内部的 buildDefaultVoltagePalette（展开成 ac:/dc: 两份给
// DEFAULT_COLOR_PALETTE.voltage）。表本身没有测试，所以下面几类改动会静默生效：
//   · 少一个等级 —— 画布上该电压退回默认色，用户看不出差别，也没有报错；
//   · 多一个等级 —— 拼错键（如 "1100"）永远不会命中，白占一行；
//   · 色值写错 —— "#22c55" 少了位、混入大小写或非十六进制字符，前端照样能画，
//     只是颜色变了；只有此处会红。
// 因此这里钉三层：键集精确、色值形状合法、若干具体键值逐一钉死。
import { describe, expect, test } from "vitest";

import { BUILTIN_VOLTAGE_LEVELS, VOLTAGE_LEVEL_COLORS } from "./model";

const HEX_COLOR = /^#[0-9a-f]{6}$/;

describe("VOLTAGE_LEVEL_COLORS 键集", () => {
  test("恰好覆盖 16 个内置电压等级，无缺失也无多余", () => {
    // 键集用 toEqual 精确比对：多一个键、少一个键都会失败。
    expect(Object.keys(VOLTAGE_LEVEL_COLORS).sort()).toEqual(
      [...BUILTIN_VOLTAGE_LEVELS].sort()
    );
    expect(Object.keys(VOLTAGE_LEVEL_COLORS)).toHaveLength(16);
  });

  test("所有键都能被 Number 解析为有限数（键形如 0.4 的字符串，不是裸数字）", () => {
    for (const [voltage, color] of Object.entries(VOLTAGE_LEVEL_COLORS)) {
      expect(typeof voltage, `键 ${voltage} 应为字符串`).toBe("string");
      const numeric = Number(voltage);
      expect(Number.isFinite(numeric), `键 ${voltage} 不是有限数`).toBe(true);
      expect(String(numeric), `键 ${voltage} 数值化后与原键不一致`).toBe(voltage);
      // 顺带确认值本身没被写成空串/undefined —— Object.entries 不会暴露这类漏写。
      expect(color, `等级 ${voltage} 缺少色值`).toBeTruthy();
    }
  });
});

describe("VOLTAGE_LEVEL_COLORS 色值形状", () => {
  test("每个值都是井号加六位小写十六进制", () => {
    for (const [voltage, color] of Object.entries(VOLTAGE_LEVEL_COLORS)) {
      expect(typeof color, `等级 ${voltage} 的色值应为字符串`).toBe("string");
      expect(color, `等级 ${voltage} 的色值 ${color} 不符合 #rrggbb`).toMatch(HEX_COLOR);
    }
  });
});

describe("VOLTAGE_LEVEL_COLORS 具体键值", () => {
  test("抽样钉住 0.4 与 110 的告警色", () => {
    expect(VOLTAGE_LEVEL_COLORS["0.4"]).toBe("#22c55e");
    expect(VOLTAGE_LEVEL_COLORS["110"]).toBe("#ef4444");
  });

  test("0 与 0.22 分别取灰与绿（同族 10/10.5/20 共用橙色）", () => {
    expect(VOLTAGE_LEVEL_COLORS["0"]).toBe("#64748b");
    expect(VOLTAGE_LEVEL_COLORS["0.22"]).toBe("#22c55e");
    expect(VOLTAGE_LEVEL_COLORS["10"]).toBe(VOLTAGE_LEVEL_COLORS["10.5"]);
    expect(VOLTAGE_LEVEL_COLORS["10"]).toBe(VOLTAGE_LEVEL_COLORS["20"]);
  });

  test("330 与 220 是两档不同的深红，不允许被合并成同一色", () => {
    // 兜底值恰好等于被断言值时断言会恒绿 —— 这里 220 是 #b91c1c、330 是 #7f1d1d，
    // 两个值彼此不同，所以下面这条相等断言能真的咬住「把两档并成一档」的改动。
    expect(VOLTAGE_LEVEL_COLORS["220"]).toBe("#b91c1c");
    expect(VOLTAGE_LEVEL_COLORS["330"]).toBe("#7f1d1d");
  });
});