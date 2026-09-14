import { describe, expect, it } from "vitest";
import { buildSvgDocument } from "./svg.ts";
import { createDefaultNode, type ModelNode } from "../model.ts";

// 默认新建母线：vbase 为 "0"，电压写在 snake_case 的 voltage_level 上
const busNode = () => ({
  id: "ac-bus-1",
  kind: "ac-bus",
  name: "交流母线-1",
  position: { x: 100, y: 100 },
  size: { width: 150, height: 36 },
  rotation: 0,
  scaleX: 1,
  scaleY: 1,
  layerId: "layer-default",
  terminals: [],
  params: { vbase: "0", voltage_level: "10" }
} as never);

// 三绕组主变：三端子各带 vbase（1000/750/500），params 侧键 i/j/k_vbase 与端子一一对应
const threeWindingTransformer = (): ModelNode => ({
  ...createDefaultNode("ac-three-winding-transformer", { x: 400, y: 100 }),
  id: "ACTransfomer3-1",
  name: "三绕组主变-1",
  size: { width: 150, height: 110 },
  rotation: 0,
  scaleX: 1,
  scaleY: 1,
  layerId: "layer-default",
  terminals: [
    { id: "t1", label: "", type: "ac", anchor: { x: -0.5, y: -0.1 }, nodeNumber: "1", vbase: "1000" },
    { id: "t2", label: "", type: "ac", anchor: { x: 0.5, y: -0.1 }, nodeNumber: "2", vbase: "750" },
    { id: "t3", label: "", type: "ac", anchor: { x: 0, y: 0.5 }, nodeNumber: "3", vbase: "500" }
  ],
  params: { i_vbase: "1000", j_vbase: "750", k_vbase: "500" }
});

describe("母线电压解析链对齐", () => {
  it("默认母线的 use 类与其正文色同源（不应出现 kv0）", () => {
    const svg = buildSvgDocument([busNode()], [], {
      width: 800,
      height: 600,
      colorDisplayMode: "voltage"
    });
    expect(svg).toContain('class="kv10"');
    expect(svg).not.toContain('class="kv0"');
  });
});

describe("多端子器件的 use 类与槽", () => {
  const svg = buildSvgDocument([threeWindingTransformer()], [], {
    width: 800,
    height: 600,
    colorDisplayMode: "voltage"
  });

  it("use 挂全部端子电压类", () => {
    expect(svg).toMatch(/class="kv1000 kv750 kv500"/);
  });

  it("use 上有按端子顺序的槽赋值", () => {
    expect(svg).toContain("--t1:var(--c-kv1000)");
    expect(svg).toContain("--t2:var(--c-kv750)");
    expect(svg).toContain("--t3:var(--c-kv500)");
  });

  it("symbol 内按位置消费槽", () => {
    const symbolSection = svg.slice(svg.indexOf("<defs"), svg.indexOf("</defs>"));
    expect(symbolSection).toContain('stroke="var(--t1)"');
    expect(symbolSection).toContain('stroke="var(--t2)"');
    expect(symbolSection).toContain('stroke="var(--t3)"');
  });
});
