import { describe, expect, it } from "vitest";
import { DeviceGlyph, usesTransformerTerminalSlotPaint, type DeviceGlyphVoltagePaint } from "./DeviceGlyph.ts";
import { createDefaultNode, TRANSFORMER_KINDS, type DeviceStateVisual, type ModelNode } from "./model.ts";
import { renderSvgElementMarkup } from "./svgUtils.ts";

// 按 ModelNode 实际类型构造母线节点（220 电压）
const busNode = (vbase: string): ModelNode => ({
  ...createDefaultNode("ac-bus", { x: 0, y: 0 }),
  id: "ac-bus-1",
  name: "母线",
  size: { width: 150, height: 36 },
  terminals: [],
  params: { vbase }
});

// renderSvgElementMarkup 正是 src/export/svg.ts:700 的取值路径，用它保证测的是导出态
const glyphHtml = (voltagePaint?: DeviceGlyphVoltagePaint | null) =>
  renderSvgElementMarkup(
    DeviceGlyph({
      node: busNode("220"),
      mode: "geometry",
      colorDisplayMode: "voltage",
      voltagePaint
    })
  );

describe("DeviceGlyph 导出态电压着色", () => {
  it("不传 voltagePaint 时行为不变（活画布路径）", () => {
    const html = glyphHtml(undefined);
    expect(html).toContain("#b91c1c"); // 220 的字面电压色
    expect(html).not.toContain("currentColor");
  });

  it("传 voltagePaint 时电压色改为 currentColor", () => {
    const html = glyphHtml({});
    expect(html).toContain("currentColor");
    expect(html).not.toContain("#b91c1c");
  });

  it("nodeRef 可指定 var(--t1)", () => {
    const html = glyphHtml({ nodeRef: "var(--t1)" });
    expect(html).toContain("var(--t1)");
  });

  it("状态色（stateVisual.strokeColor）优先于电压 class 驱动，字面存活", () => {
    // I-2：导出态 voltagePaint 不能顶掉状态色；状态 symbol 的开合色必须字面输出
    const stateVisual: DeviceStateVisual = { value: "0", name: "分", strokeColor: "#ff0000" };
    const html = renderSvgElementMarkup(
      DeviceGlyph({
        node: busNode("220"),
        mode: "geometry",
        colorDisplayMode: "voltage",
        stateVisual,
        voltagePaint: {}
      })
    );
    // 母线体的电压色走 fill（renderBusGlyphRect）——断言状态色以 fill/stroke 任一形态字面存活
    expect(html).toContain("#ff0000");
    expect(html).not.toContain("currentColor");
  });

  it("static 图元只设 strokeColor 时 accent 兜底用 strokeColor（不传 voltagePaint）", () => {
    // static-swimlane 头部矩形 fill 直接消费 accentColor（不受 simpleAccentVisible 门控），
    // 主矩形 fill 默认 #f8fafc —— 断言 fill="#123456" 唯一对应 accent 兜底到 strokeColor
    const node = createDefaultNode("static-swimlane", { x: 0, y: 0 });
    const { accentColor: _omitAccent, ...restParams } = node.params;
    const html = renderSvgElementMarkup(
      DeviceGlyph({
        node: { ...node, params: { ...restParams, strokeColor: "#123456" } },
        mode: "geometry"
      })
    );
    expect(html).toContain('fill="#123456"');
  });
});

// usesTransformerTerminalSlotPaint：变压器族（以及端子变负荷）才按端子分色（var(--tN)），
// 其余器件内部单色。这是「kind 名单」与「渲染分支」之间的单源约定：
// 新增消费端子槽的 kind 时必须同步 DeviceGlyph 的变压器族分支与 svg.ts 的 slotTerminals。
// 判错的后果：该分色的变压器整只单色，或不该分色的器件冒出一个取不到值的 var(--tN)。
describe("usesTransformerTerminalSlotPaint：哪些 kind 走端子槽着色", () => {
  it("★ TRANSFORMER_KINDS 里的每个 kind 都命中", () => {
    for (const kind of TRANSFORMER_KINDS) {
      expect(usesTransformerTerminalSlotPaint(kind), kind).toBe(true);
    }
  });

  it("★ 两绕组 / 三绕组 / 带中性点的三绕组 / -vertical 变体逐个点名", () => {
    for (const kind of [
      "ac-transformer",
      "ac-transformer-vertical",
      "ac-two-winding-transformer",
      "ac-three-winding-transformer",
      "ac-three-winding-transformer-neutral",
      "ac-terminal-transformer-load"
    ]) {
      expect(usesTransformerTerminalSlotPaint(kind), kind).toBe(true);
    }
  });

  it("★ 非变压器族一律不命中（母线 / 线路 / 电源 / 变流器 / 静态图元 / 储氢）", () => {
    for (const kind of [
      "ac-bus",
      "ac-line",
      "ac-source",
      "ac-load",
      "ac-switch",
      "acac-converter",
      "dcdc-converter",
      "ac-storage",
      "hydrogen-storage",
      "static-rect",
      "static-transform-arrow",
      "heat-source",
      ""
    ]) {
      expect(usesTransformerTerminalSlotPaint(kind), kind).toBe(false);
    }
  });

  it("★ 就是字面 includes：大小写敏感，两侧空格不影响", () => {
    expect(usesTransformerTerminalSlotPaint("AC-Transformer")).toBe(false);
    expect(usesTransformerTerminalSlotPaint(" transformer ")).toBe(true);
    expect(usesTransformerTerminalSlotPaint("x-transformer-load")).toBe(true);
  });
});
