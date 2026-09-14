import { describe, expect, it } from "vitest";
import { buildSvgDocument } from "./svg.ts";
import { createDefaultNode, type ModelNode } from "../model.ts";

// 锚点用节点工厂：模板默认尺寸/参数 + 显式端子
const makeNode = (kind: string, id: string, terminals: ModelNode["terminals"], params: Record<string, string> = {}): ModelNode => ({
  ...createDefaultNode(kind, { x: 100, y: 100 }),
  id,
  name: id,
  rotation: 0,
  scaleX: 1,
  scaleY: 1,
  layerId: "layer-default",
  terminals,
  params
});

// 三绕组主变：3 电端子（1000/750/500）
const threeWinding = (): ModelNode => makeNode("ac-three-winding-transformer", "T3-1", [
  { id: "t1", label: "", type: "ac", anchor: { x: -0.5, y: -0.1 }, nodeNumber: "1176", vbase: "1000" },
  { id: "t2", label: "", type: "ac", anchor: { x: 0.5, y: -0.1 }, nodeNumber: "1177", vbase: "750" },
  { id: "t3", label: "", type: "ac", anchor: { x: 0, y: 0.5 }, nodeNumber: "1178", vbase: "500" }
], { i_vbase: "1000", j_vbase: "750", k_vbase: "500" });

const symbolSection = (svg: string) => svg.slice(svg.indexOf("<defs"), svg.indexOf("</defs>"));

describe("导出 symbol 的 terminal 锚点", () => {
  it("每个电端子一个锚点，坐标 = 引线落点，身份属性齐全，默认 display:none", () => {
    const svg = buildSvgDocument([threeWinding()], [], { width: 800, height: 600, colorDisplayMode: "voltage" });
    const symbol = symbolSection(svg);
    const anchors = Array.from(symbol.matchAll(/<circle class="terminal-anchor"[^>]*\/>/g)).map((m) => m[0]);
    expect(anchors).toHaveLength(3);

    // 坐标与引线落点（<g transform="translate(x y)"> 与其内 <line>）一一对应
    const leadPoints = Array.from(symbol.matchAll(/<g transform="translate\(([-\d.]+) ([-\d.]+)\)">\s*<line/g))
      .map((m) => `${m[1]},${m[2]}`);
    expect(leadPoints).toHaveLength(3);
    const anchorPoints = anchors.map((tag) => {
      const cx = /cx="([-\d.]+)"/.exec(tag)![1];
      const cy = /cy="([-\d.]+)"/.exec(tag)![1];
      return `${cx},${cy}`;
    });
    expect(anchorPoints).toEqual(leadPoints);

    // 身份属性：terminal-id / terminal-index（电端子序）/ node-number / 默认隐藏
    expect(anchors[0]).toContain('terminal-id="t1"');
    expect(anchors[0]).toContain('terminal-index="1"');
    expect(anchors[0]).toContain('node-number="1176"');
    expect(anchors[1]).toContain('terminal-id="t2"');
    expect(anchors[2]).toContain('terminal-id="t3"');
    for (const tag of anchors) {
      expect(tag).toContain('display="none"');
    }
  });

  it("非电端子（h2/heat）不生成锚点", () => {
    const node = makeNode("ac-electrolyzer", "EL-1", [
      { id: "t1", label: "", type: "ac", anchor: { x: -0.5, y: 0 }, nodeNumber: "1", vbase: "10" },
      { id: "t2", label: "", type: "h2", anchor: { x: 0.5, y: 0 }, nodeNumber: "2" }
    ]);
    const svg = buildSvgDocument([node], [], { width: 800, height: 600, colorDisplayMode: "voltage" });
    const anchors = symbolSection(svg).match(/<circle class="terminal-anchor"/g) ?? [];
    expect(anchors).toHaveLength(1);
  });

  it("energy 模式同样生成（几何元数据与配色模式无关，双状态 symbol 各含全套锚点）", () => {
    const node = makeNode("ac-switch", "SW-1", [
      { id: "t1", label: "", type: "ac", anchor: { x: -0.5, y: 0 }, nodeNumber: "1", vbase: "10" },
      { id: "t2", label: "", type: "ac", anchor: { x: 0.5, y: 0 }, nodeNumber: "2", vbase: "10" }
    ]);
    const svg = buildSvgDocument([node], [], { width: 800, height: 600, colorDisplayMode: "energy" });
    const symbolBlocks = Array.from(symbolSection(svg).matchAll(/<symbol\b[\s\S]*?<\/symbol>/g)).map((m) => m[0]);
    expect(symbolBlocks).toHaveLength(2);
    for (const block of symbolBlocks) {
      const anchors = block.match(/<circle class="terminal-anchor"/g) ?? [];
      expect(anchors).toHaveLength(2);
    }
  });

  it("母线（单电端子）也有锚点", () => {
    const bus = makeNode("ac-bus", "BUS-1", [
      { id: "t1", label: "", type: "ac", anchor: { x: -0.5, y: 0 }, nodeNumber: "1543", vbase: "10" }
    ], { vbase: "10" });
    const svg = buildSvgDocument([bus], [], { width: 800, height: 600, colorDisplayMode: "voltage" });
    const anchors = symbolSection(svg).match(/<circle class="terminal-anchor"/g) ?? [];
    expect(anchors).toHaveLength(1);
  });
});
