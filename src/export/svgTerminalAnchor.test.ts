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
const threeWinding = (id = "T3-1"): ModelNode => makeNode("ac-three-winding-transformer", id, [
  { id: "t1", label: "", type: "ac", anchor: { x: -0.5, y: -0.1 }, nodeNumber: "N1176", vbase: "1000" },
  { id: "t2", label: "", type: "ac", anchor: { x: 0.5, y: -0.1 }, nodeNumber: "N1177", vbase: "750" },
  { id: "t3", label: "", type: "ac", anchor: { x: 0, y: 0.5 }, nodeNumber: "N1178", vbase: "500" }
], { i_vbase: "1000", j_vbase: "750", k_vbase: "500" });

const symbolSection = (svg: string) => svg.slice(svg.indexOf("<defs"), svg.indexOf("</defs>"));
const anchorTag = /<circle class="terminal-anchor"[^>]*\/>/g;

describe("导出 SVG 的 terminal 锚点（symbol 内）", () => {
  it("锚点在 symbol 内与图元定义同处；实例层零锚点；身份属性齐全、默认 display:none", () => {
    const svg = buildSvgDocument([threeWinding()], [], { width: 800, height: 600, colorDisplayMode: "voltage" });
    const symbol = symbolSection(svg);

    // symbol 内：每个电端子一个锚点，身份属性齐全（无 dev-id —— 实例归属在 use 上）
    const anchors = Array.from(symbol.matchAll(anchorTag)).map((m) => m[0]);
    expect(anchors).toHaveLength(3);
    expect(anchors[0]).not.toContain("dev-id");
    expect(anchors[0]).toContain('terminal-id="t1"');
    expect(anchors[0]).toContain('terminal-index="1"');
    expect(anchors[0]).toContain('node-number="N1176"');
    expect(anchors[1]).toContain('terminal-id="t2"');
    expect(anchors[2]).toContain('terminal-id="t3"');
    for (const tag of anchors) {
      expect(tag).toContain('display="none"');
    }

    // 实例层（</defs> 之后的正文）：零锚点；下游经 use(dev-id) → href → symbol 定位锚点
    const bodyAfterDefs = svg.slice(svg.indexOf("</defs>"));
    expect(bodyAfterDefs).not.toContain("terminal-anchor");
  });

  it("锚点坐标 = 引线落点（symbol 内引线 translate 原点，同一坐标系）", () => {
    const svg = buildSvgDocument([threeWinding()], [], { width: 800, height: 600, colorDisplayMode: "voltage" });
    const symbol = symbolSection(svg);
    const leadPoints = Array.from(symbol.matchAll(/<g transform="translate\(([-\d.]+) ([-\d.]+)\)">\s*<line/g))
      .map((m) => `${m[1]},${m[2]}`);
    expect(leadPoints).toHaveLength(3);
    const anchorPoints = Array.from(symbol.matchAll(anchorTag)).map((m) => {
      const cx = /cx="([-\d.]+)"/.exec(m[0])![1];
      const cy = /cy="([-\d.]+)"/.exec(m[0])![1];
      return `${cx},${cy}`;
    });
    expect(anchorPoints).toEqual(leadPoints);
  });

  it("同 kind 不同端子号的两台设备不复用 symbol（锚点各归其主，防串号回归）", () => {
    const a = threeWinding("T3-A");
    const b = { ...threeWinding("T3-B"), position: { x: 600, y: 100 } };
    b.terminals = a.terminals.map((t, i) => ({ ...t, nodeNumber: `N999${i}` }));
    const svg = buildSvgDocument([a, b], [], { width: 1200, height: 600, colorDisplayMode: "voltage" });
    // node-number 参与去重签名：两台设备各 1 个 symbol（共 2）
    expect(symbolSection(svg).match(/<symbol /g)?.length).toBe(2);
    // 每个 symbol 内锚点各带各的 node-number
    const anchors = Array.from(symbolSection(svg).matchAll(anchorTag)).map((m) => m[0]);
    expect(anchors).toHaveLength(6);
    expect(anchors.filter((tag) => tag.includes("N117")).length).toBe(3);
    expect(anchors.filter((tag) => tag.includes("N999")).length).toBe(3);
  });

  it("非电端子（h2/heat）不生成锚点", () => {
    const node = makeNode("ac-electrolyzer", "EL-1", [
      { id: "t1", label: "", type: "ac", anchor: { x: -0.5, y: 0 }, nodeNumber: "N1", vbase: "10" },
      { id: "t2", label: "", type: "h2", anchor: { x: 0.5, y: 0 }, nodeNumber: "N2" }
    ]);
    const svg = buildSvgDocument([node], [], { width: 800, height: 600, colorDisplayMode: "voltage" });
    const anchors = Array.from(symbolSection(svg).matchAll(anchorTag)).map((m) => m[0]);
    expect(anchors).toHaveLength(1);
    expect(anchors[0]).toContain('terminal-id="t1"');
  });

  it("双状态器件（交流开关）每个状态 symbol 内各一套锚点", () => {
    const node = makeNode("ac-switch", "SW-1", [
      { id: "t1", label: "", type: "ac", anchor: { x: -0.5, y: 0 }, nodeNumber: "N1", vbase: "10" },
      { id: "t2", label: "", type: "ac", anchor: { x: 0.5, y: 0 }, nodeNumber: "N2", vbase: "10" }
    ]);
    const svg = buildSvgDocument([node], [], { width: 800, height: 600, colorDisplayMode: "energy" });
    // 两个状态 symbol × 每套 2 电端子锚点 = 4
    const anchors = Array.from(symbolSection(svg).matchAll(anchorTag)).map((m) => m[0]);
    expect(anchors).toHaveLength(4);
  });

  it("母线（单电端子）也有锚点；隐藏图层时随 use 的 display:none 整体隐藏", () => {
    const bus = makeNode("ac-bus", "BUS-1", [
      { id: "t1", label: "", type: "ac", anchor: { x: -0.5, y: 0 }, nodeNumber: "N1543", vbase: "10" }
    ], { vbase: "10" });
    const svg = buildSvgDocument([bus], [], { width: 800, height: 600, colorDisplayMode: "voltage" });
    const anchors = Array.from(symbolSection(svg).matchAll(anchorTag)).map((m) => m[0]);
    expect(anchors).toHaveLength(1);

    // 隐藏图层：实例 use 带 display:none，锚点在 symbol 内随之整体不渲染（symbol 定义本身不变）
    const hidden = buildSvgDocument(
      [bus],
      [],
      { width: 800, height: 600, colorDisplayMode: "voltage", layers: [{ id: "layer-default", name: "默认图层", visible: false }] as never }
    );
    const useTag = hidden.match(/<use [^>]*id="BUS-1"[^>]*>/);
    expect(useTag).not.toBeNull();
    expect(useTag![0]).toContain("display:none");
  });
});
