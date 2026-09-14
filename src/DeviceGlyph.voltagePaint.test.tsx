import { describe, expect, it } from "vitest";
import { DeviceGlyph, type DeviceGlyphVoltagePaint } from "./DeviceGlyph.ts";
import { createDefaultNode, type ModelNode } from "./model.ts";
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
});
