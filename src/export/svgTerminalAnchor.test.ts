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

describe("导出 SVG 的 terminal 锚点（实例层）", () => {
  it("锚点在实例层（use 旁），symbol 内零锚点；身份属性齐全、默认 display:none", () => {
    const svg = buildSvgDocument([threeWinding()], [], { width: 800, height: 600, colorDisplayMode: "voltage" });

    // symbol 纯净：去重不受实例数据（node-number）污染
    expect(symbolSection(svg)).not.toContain("terminal-anchor");

    // 实例层：每个 <g transform="translate(...)"> 内 use 之后跟锚点组
    const anchors = Array.from(svg.matchAll(anchorTag)).map((m) => m[0]);
    expect(anchors).toHaveLength(3);
    expect(anchors[0]).toContain('dev-id="T3-1"');
    expect(anchors[0]).toContain('terminal-id="t1"');
    expect(anchors[0]).toContain('terminal-index="1"');
    expect(anchors[0]).toContain('node-number="N1176"');
    expect(anchors[1]).toContain('terminal-id="t2"');
    expect(anchors[2]).toContain('terminal-id="t3"');
    for (const tag of anchors) {
      expect(tag).toContain('display="none"');
    }

    // 锚点组挂在 use 的包裹 g 内，与 use 同级、几何变换与 symbol 内容一致
    const deviceGroup = svg.match(/<g transform="translate\([^)]*\)"><use [^>]*id="T3-1"[^>]*\/>.*<\/g><\/g>/s);
    expect(deviceGroup).not.toBeNull();
    expect(deviceGroup![0]).toContain('class="terminal-anchor"');
  });

  it("锚点坐标 = 引线落点（symbol 内引线 translate 原点）", () => {
    const svg = buildSvgDocument([threeWinding()], [], { width: 800, height: 600, colorDisplayMode: "voltage" });
    const symbol = symbolSection(svg);
    const leadPoints = Array.from(symbol.matchAll(/<g transform="translate\(([-\d.]+) ([-\d.]+)\)">\s*<line/g))
      .map((m) => `${m[1]},${m[2]}`);
    expect(leadPoints).toHaveLength(3);
    const anchorPoints = Array.from(svg.matchAll(anchorTag)).map((m) => {
      const cx = /cx="([-\d.]+)"/.exec(m[0])![1];
      const cy = /cy="([-\d.]+)"/.exec(m[0])![1];
      return `${cx},${cy}`;
    });
    expect(anchorPoints).toEqual(leadPoints);
  });

  it("同 kind 不同端子号的两台设备共用同一 symbol（去重不受实例数据污染，回归 v1 缺陷）", () => {
    const a = threeWinding("T3-A");
    const b = { ...threeWinding("T3-B"), position: { x: 600, y: 100 } };
    b.terminals = a.terminals.map((t, i) => ({ ...t, nodeNumber: `N999${i}` }));
    const svg = buildSvgDocument([a, b], [], { width: 1200, height: 600, colorDisplayMode: "voltage" });
    expect(symbolSection(svg).match(/<symbol /g)?.length).toBe(1);
    // 各实例锚点携带自己的 node-number（快路径串号回归）
    const anchors = Array.from(svg.matchAll(anchorTag)).map((m) => m[0]);
    expect(anchors.filter((tag) => tag.includes('dev-id="T3-A"')).every((tag) => tag.includes("N117"))).toBe(true);
    expect(anchors.filter((tag) => tag.includes('dev-id="T3-B"')).every((tag) => tag.includes("N999"))).toBe(true);
  });

  it("非电端子（h2/heat）不生成锚点", () => {
    const node = makeNode("ac-electrolyzer", "EL-1", [
      { id: "t1", label: "", type: "ac", anchor: { x: -0.5, y: 0 }, nodeNumber: "N1", vbase: "10" },
      { id: "t2", label: "", type: "h2", anchor: { x: 0.5, y: 0 }, nodeNumber: "N2" }
    ]);
    const svg = buildSvgDocument([node], [], { width: 800, height: 600, colorDisplayMode: "voltage" });
    const anchors = svg.match(anchorTag) ?? [];
    expect(anchors).toHaveLength(1);
    expect(anchors[0]).toContain('dev-id="EL-1"');
  });

  it("energy 模式同样生成（双状态 symbol 的器件各状态实例锚点一套）", () => {
    const node = makeNode("ac-switch", "SW-1", [
      { id: "t1", label: "", type: "ac", anchor: { x: -0.5, y: 0 }, nodeNumber: "N1", vbase: "10" },
      { id: "t2", label: "", type: "ac", anchor: { x: 0.5, y: 0 }, nodeNumber: "N2", vbase: "10" }
    ]);
    const svg = buildSvgDocument([node], [], { width: 800, height: 600, colorDisplayMode: "energy" });
    const anchors = svg.match(anchorTag) ?? [];
    expect(anchors).toHaveLength(2);
  });

  it("母线（单电端子）也有锚点；隐藏图层时锚点随层隐藏", () => {
    const bus = makeNode("ac-bus", "BUS-1", [
      { id: "t1", label: "", type: "ac", anchor: { x: -0.5, y: 0 }, nodeNumber: "N1543", vbase: "10" }
    ], { vbase: "10" });
    const svg = buildSvgDocument([bus], [], { width: 800, height: 600, colorDisplayMode: "voltage" });
    const anchors = svg.match(anchorTag) ?? [];
    expect(anchors).toHaveLength(1);

    // 隐藏图层：use 带 display:none 时锚点组同样隐藏（单 style 属性语义对锚点组同样成立）
    const hidden = buildSvgDocument(
      [bus],
      [],
      { width: 800, height: 600, colorDisplayMode: "voltage", layers: [{ id: "layer-default", name: "默认图层", visible: false }] as never }
    );
    const anchorGroup = hidden.match(/<g transform="[^"]*"[^>]*><circle class="terminal-anchor"/);
    expect(anchorGroup).not.toBeNull();
    expect(anchorGroup![0]).toContain("display:none");
  });
});
