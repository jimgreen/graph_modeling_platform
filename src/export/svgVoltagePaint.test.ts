import { describe, expect, it } from "vitest";
import { buildSvgDocument } from "./svg.ts";
import { createDefaultNode, type ModelNode } from "../model.ts";
import { SVG_BASELINE_EDGES, SVG_BASELINE_NODES } from "./fixtures/svg-baseline";

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

  it("端子引线按端子走槽（多端子）或删字面色（单电压）", () => {
    const symbolSection = svg.slice(svg.indexOf("<defs"), svg.indexOf("</defs>"));
    // 三绕组主变的引线共 3 根，依次链到 --t1/--t2/--t3
    expect(symbolSection.match(/stroke="var\(--t[123]\)"/g)?.length).toBeGreaterThanOrEqual(3);
  });

  it("symbol 段内零字面电压色（属性形态）", () => {
    const symbolSection = svg.slice(svg.indexOf("<defs"), svg.indexOf("</defs>"));
    expect(symbolSection).not.toMatch(/stroke="#[0-9a-fA-F]{3,8}"/i);
  });
});

describe("线路与边界母线内连删字面色", () => {
  it("电压模式下线路 path 与边界母线内连都不写字面 stroke", () => {
    const out = buildSvgDocument(SVG_BASELINE_NODES as never, SVG_BASELINE_EDGES as never, {
      width: 800,
      height: 600,
      colorDisplayMode: "voltage"
    });
    const edgeTags = Array.from(out.matchAll(/<path id="edge-[^"]*"[^>]*>/g)).map((m) => m[0]);
    expect(edgeTags.length).toBeGreaterThan(0);
    for (const tag of edgeTags) {
      expect(tag).toMatch(/class="lkv|class="ldcv/);
      expect(tag).not.toMatch(/stroke="#[0-9a-f]{3,8}"/i);
    }
  });
});

describe("同种图元跨电压共用 symbol", () => {
  it("同种图元跨电压合并为一个 symbol", () => {
    const two = buildSvgDocument([busNode(), { ...(busNode() as object), id: "ac-bus-2", position: { x: 400, y: 100 }, params: { vbase: "0", voltage_level: "110" } } as never], [], {
      width: 800, height: 600, colorDisplayMode: "voltage"
    });
    // 两个不同电压的母线只应有一个 symbol
    expect(two.match(/<symbol id="/g)?.length).toBe(1);
  });

  it("端子引线槽不参与 symbol 去重（同 kind 不同电压仍合并）", () => {
    const two = buildSvgDocument([
      threeWindingTransformer(),
      {
        ...threeWindingTransformer(),
        id: "ACTransfomer3-2",
        position: { x: 700, y: 100 },
        terminals: [
          { id: "t1", label: "", type: "ac", anchor: { x: -0.5, y: -0.1 }, nodeNumber: "1", vbase: "500" },
          { id: "t2", label: "", type: "ac", anchor: { x: 0.5, y: -0.1 }, nodeNumber: "2", vbase: "330" },
          { id: "t3", label: "", type: "ac", anchor: { x: 0, y: 0.5 }, nodeNumber: "3", vbase: "220" }
        ],
        params: { i_vbase: "500", j_vbase: "330", k_vbase: "220" }
      } as never
    ], [], { width: 1200, height: 600, colorDisplayMode: "voltage" });
    expect(two.match(/<symbol id="/g)?.length).toBe(1);
  });
});

describe("槽完整性", () => {
  // 与「多端子器件的 use 类与槽」同一三绕组用例输出，供槽号/颜色源断言共享
  const svg = buildSvgDocument([threeWindingTransformer()], [], {
    width: 800,
    height: 600,
    colorDisplayMode: "voltage"
  });

  it("槽数等于电端子数（含 4 端子主变）", () => {
    // 4 端子主变（含中性点端子）：槽声明必须覆盖到 --t4，不得按 3 端子截断
    const neutral: ModelNode = {
      ...threeWindingTransformer(),
      id: "ACTransfomer3-4",
      kind: "ac-three-winding-transformer-neutral",
      terminals: [
        ...threeWindingTransformer().terminals,
        { id: "t4", label: "", type: "ac", anchor: { x: 0, y: -0.5 }, nodeNumber: "4", vbase: "500" }
      ]
    };
    const out = buildSvgDocument([neutral], [], { width: 800, height: 600, colorDisplayMode: "voltage" });
    const styleMatch = out.match(/<use[^>]*style="([^"]*)"/);
    expect(styleMatch?.[1] ?? "").toContain("--t4:");
  });

  it("每个 var(--c-*) 都有对应定义", () => {
    // 槽链失效会静默取错色：var(--c-*) 的每个使用都必须有 --c-<类名>: 声明兜底
    const declared = new Set(Array.from(svg.matchAll(/--c-([A-Za-z0-9_-]+):/g)).map((m) => m[1]));
    const used = Array.from(svg.matchAll(/var\(--c-([A-Za-z0-9_-]+)\)/g)).map((m) => m[1]);
    for (const name of used) {
      expect(declared.has(name)).toBe(true);
    }
  });

  it("symbol 内槽号 ⊆ use 上定义的槽号", () => {
    // symbol 消费的每个槽都必须由 use 侧声明，否则正文元素解析失败
    const useSlots = new Set(Array.from(svg.matchAll(/--t(\d+):/g)).map((m) => m[1]));
    const symbolSection = svg.slice(svg.indexOf("<defs"), svg.indexOf("</defs>"));
    const symbolSlots = Array.from(symbolSection.matchAll(/var\(--t(\d+)\)/g)).map((m) => m[1]);
    for (const slot of symbolSlots) {
      expect(useSlots.has(slot)).toBe(true);
    }
  });

  it("槽样式与 display:none 合并在同一个 style 属性", () => {
    // 多个 style 属性会被解析器丢弃后者，槽赋值必须并入唯一 style
    const useTags = Array.from(svg.matchAll(/<use\b[^>]*>/g)).map((m) => m[0]);
    for (const tag of useTags) {
      expect((tag.match(/ style="/g) ?? []).length).toBeLessThanOrEqual(1);
    }
  });
});
