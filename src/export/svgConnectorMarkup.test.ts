// SVG 导出：设备端子引线标记（buildSvgDeviceConnectorMarkup）。
//
// 引线的 stroke 有三条互斥来源，选错不会抛错、只会让电压配色整片失效或
// 端子颜色被电压类覆盖：
//   ① 有槽引用（paintRef）  → 写死 stroke="var(--tN)"
//   ② 处于电压态且是电端子 → **删掉** stroke 属性，靠 <use class> 继承
//   ③ 其余                 → 写死身份色（energy/直流等配色下的 terminalColor）
// ② 的「仅电端子」限定最容易被误改：h2/heat 端子若也删属性，会跟着电压类变色。
import { describe, expect, test } from "vitest";
import { createDefaultNode, DEFAULT_COLOR_PALETTE, type ModelNode } from "../model";
import { buildSvgDeviceConnectorMarkup } from "./svg";

const load = (): ModelNode => createDefaultNode("ac-load", { x: 100, y: 100 });

const withTerminalType = (node: ModelNode, type: string): ModelNode =>
  ({ ...node, terminals: node.terminals.map((terminal, index) => (index === 0 ? { ...terminal, type } : terminal)) }) as ModelNode;

const withParam = (node: ModelNode, params: Record<string, string>): ModelNode =>
  ({ ...node, params: { ...node.params, ...params } }) as ModelNode;

const strokeOf = (markup: string) => markup.match(/stroke="([^"]*)"/u)?.[1];

describe("buildSvgDeviceConnectorMarkup：三类 kind 不出引线", () => {
  test("母线 / 静态图元 / 可布线线路设备都返回空串（引线由各自图元自己画）", () => {
    for (const kind of ["ac-bus", "static-text", "ac-routable-line"] as const) {
      expect(buildSvgDeviceConnectorMarkup(createDefaultNode(kind as never, { x: 0, y: 0 }))).toBe("");
    }
  });
});

describe("buildSvgDeviceConnectorMarkup：stroke 的三条来源", () => {
  test("① 缺省态写死身份色（energy 模式下的端子色）", () => {
    expect(strokeOf(buildSvgDeviceConnectorMarkup(load()))).toBe("#2563eb");
  });

  test("★ ② 电压态且电端子取不到槽引用 → 删掉 stroke 属性，交给 <use class> 继承", () => {
    const markup = buildSvgDeviceConnectorMarkup(load(), "energy", undefined, { terminalRef: () => undefined });
    expect(markup).not.toContain("stroke=");
    expect(markup).toContain('stroke-width="2.5"');
  });

  test("① 槽引用存在时写死该引用（优先级高于 ② 的删除）", () => {
    const markup = buildSvgDeviceConnectorMarkup(load(), "energy", undefined, { terminalRef: () => "var(--t1)" });
    expect(strokeOf(markup)).toBe("var(--t1)");
  });

  test("★ ③ 非电端子（h2）在电压态下仍保留字面色 —— 身份色不归电压类管", () => {
    const markup = buildSvgDeviceConnectorMarkup(withTerminalType(load(), "h2"), "energy", undefined, { terminalRef: () => undefined });
    expect(strokeOf(markup)).toBe("#7c3aed");
  });

  test("★ 槽引用存在时连非电端子也用引用（引用优先于端子类型）", () => {
    const markup = buildSvgDeviceConnectorMarkup(withTerminalType(load(), "h2"), "energy", undefined, { terminalRef: () => "var(--t1)" });
    expect(strokeOf(markup)).toBe("var(--t1)");
  });

  test("★ 自定义配色确实透到引线（不是写死的常量色）", () => {
    const palette = { ...DEFAULT_COLOR_PALETTE, energy: { ...DEFAULT_COLOR_PALETTE.energy, ac: "#ff0000" } };
    expect(strokeOf(buildSvgDeviceConnectorMarkup(load(), "energy", palette))).toBe("#ff0000");
    // 只切 colorDisplayMode 而不给 voltagePaint，仍走 ③ 分支，但取色来自电压调色板
    // （端子 vbase 是占位 0 → 落电压兜底色），不是 energy 调色板
    expect(strokeOf(buildSvgDeviceConnectorMarkup(load(), "voltage", palette))).not.toBe("#ff0000");
  });
});

describe("buildSvgDeviceConnectorMarkup：结构", () => {
  test("stroke-dasharray 由 params.strokeStyle 派生，dashed / dotted 各一组", () => {
    expect(buildSvgDeviceConnectorMarkup(withParam(load(), { strokeStyle: "dashed" }))).toContain('stroke-dasharray="10 6"');
    expect(buildSvgDeviceConnectorMarkup(withParam(load(), { strokeStyle: "dotted" }))).toContain('stroke-dasharray="2 6"');
    expect(buildSvgDeviceConnectorMarkup(withParam(load(), { strokeStyle: "solid" }))).not.toContain("stroke-dasharray");
  });

  test("多端子各出一段 <g>，段间用换行连接", () => {
    const transformer = createDefaultNode("ac-transformer", { x: 100, y: 100 });
    const markup = buildSvgDeviceConnectorMarkup(transformer);
    expect(markup.split("\n").filter((line) => line.startsWith("<g transform=")).length)
      .toBe(transformer.terminals.length);
  });

  test("无端子设备 → 空串（不留空 <g> 或多余换行）", () => {
    expect(buildSvgDeviceConnectorMarkup({ ...load(), terminals: [] } as ModelNode)).toBe("");
  });
});