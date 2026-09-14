import { describe, expect, it } from "vitest";
import { buildSvgDocument } from "./svg.ts";
import { createDefaultNode, createNodeFromTemplate, DEFAULT_COLOR_PALETTE, DEVICE_LIBRARY, type DeviceKind, type DeviceTemplate, type ModelNode } from "../model.ts";
import { SVG_BASELINE_EDGES, SVG_BASELINE_NODES } from "./fixtures/svg-baseline";

// M-2：symbol 段内「零字面电压色」按调色板电压 hex 清单断言。
// 只拦截填/描属性和电压调色板撞色的字面色；固定本体色与身份色走白名单，防一刀切正则误伤。
const assertNoLiteralVoltageColor = (section: string, whitelist: string[] = [], palette = DEFAULT_COLOR_PALETTE) => {
  const allowed = new Set([
    ...whitelist.map((color) => color.toLowerCase()),
    "#ffffff", "#eef2ff", "#f8fafc", "#fff7ed", "#faf5ff", "#fff1f2", "#ecfeff", "#eff6ff", "#ecfdf5", "#f0fdf4"
  ]);
  const paletteHexes = new Set(Object.values(palette.voltage).map((color) => String(color).toLowerCase()));
  const literalPaints = Array.from(section.matchAll(/\b(?:fill|stroke)="(#[0-9a-fA-F]{3,8})"/g), (match) => match[1].toLowerCase());
  const forbidden = literalPaints.filter((hex) => paletteHexes.has(hex) && !allowed.has(hex));
  expect(forbidden).toEqual([]);
};

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

  it("symbol 段内零字面电压色（按调色板电压 hex 清单断言，白名单固定色除外）", () => {
    const symbolSection = svg.slice(svg.indexOf("<defs"), svg.indexOf("</defs>"));
    // 三绕组主变无身份色：symbol 正文不得出现任何调色板电压 hex（fill= 与 stroke= 两种形态都查）
    assertNoLiteralVoltageColor(symbolSection, ["#ffffff"]);
    expect(symbolSection).not.toMatch(/\b(?:fill|stroke)="currentColor"/i);
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
    // M-3：防空集合平凡通过 —— fixture 上必须确实消费了变量
    expect(used.length).toBeGreaterThan(0);
    expect(declared.size).toBeGreaterThan(0);
    for (const name of used) {
      expect(declared.has(name)).toBe(true);
    }
  });

  it("symbol 内槽号 ⊆ use 上定义的槽号", () => {
    // symbol 消费的每个槽都必须由 use 侧声明，否则正文元素解析失败
    const useSlots = new Set(Array.from(svg.matchAll(/--t(\d+):/g)).map((m) => m[1]));
    const symbolSection = svg.slice(svg.indexOf("<defs"), svg.indexOf("</defs>"));
    const symbolSlots = Array.from(symbolSection.matchAll(/var\(--t(\d+)\)/g)).map((m) => m[1]);
    // M-3：防空集合平凡通过 —— fixture 上必须确实消费了槽
    expect(symbolSlots.length).toBeGreaterThan(0);
    expect(useSlots.size).toBeGreaterThan(0);
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

describe("I-1 氢/热耦合器件身份色（电压模式下非电压色源不启用 class 驱动机身）", () => {
  // ac-electrolyzer 端子 ["ac","h2"]：ac 是电压端子、h2 是身份端子
  const electrolyzerNode = (vbase: string): ModelNode => {
    const node = createDefaultNode("ac-electrolyzer", { x: 100, y: 100 });
    node.id = `ely-${vbase}`;
    node.params = { ...node.params, vbase };
    return node;
  };

  it("机身与 h2 引线保留字面身份色，不出现 currentColor", () => {
    const svg = buildSvgDocument([electrolyzerNode("10")], [], {
      width: 800, height: 600, colorDisplayMode: "voltage"
    });
    const symbolSection = svg.slice(svg.indexOf("<symbol"), svg.lastIndexOf("</symbol>"));
    // 身份色 = terminalTypeColor("h2") = #7c3aed（非电压调色板色）
    expect(symbolSection).toContain('stroke="#7c3aed"');
    expect(symbolSection).not.toContain("currentColor");
    // 机身保持字面身份色而非电压类色（kv10 默认橙 #f97316 不落地为字面 stroke）
    expect(symbolSection).not.toContain('stroke="#f97316"');
    // 仍挂电端子电压类（ac 引线由 class 驱动）
    expect(svg).toContain('class="kv10"');
  });

  it("ac 引线删字面色靠 class 继承，h2 引线保留字面 #7c3aed", () => {
    const svg = buildSvgDocument([electrolyzerNode("10")], [], {
      width: 800, height: 600, colorDisplayMode: "voltage"
    });
    const lineTags = Array.from(svg.matchAll(/<line[^>]*\/>/g), (match) => match[0]);
    expect(lineTags.length).toBe(2); // ac + h2 两根端子引线
    const electricLeadDeleted = lineTags.some((tag) => !tag.includes("stroke="));
    const h2LeadLiteral = lineTags.some((tag) => tag.includes('stroke="#7c3aed"'));
    expect(electricLeadDeleted).toBe(true);
    expect(h2LeadLiteral).toBe(true);
  });

  it("同种氢能器件跨电压仍共用 symbol（身份色字面相同，ac 引线走 class）", () => {
    const svg = buildSvgDocument([electrolyzerNode("10"), { ...electrolyzerNode("110"), position: { x: 400, y: 100 } }], [], {
      width: 1200, height: 600, colorDisplayMode: "voltage"
    });
    expect(svg.match(/<symbol id="/g)?.length).toBe(1);
  });
});

describe("I-2 状态色优先于电压色", () => {
  it("带 stateDefinitions 的模板器件在电压模式下状态色字面存活", () => {
    const template: DeviceTemplate = {
      ...DEVICE_LIBRARY.find((item) => item.kind === "ac-load")!,
      kind: "custom-voltage-state-load" as DeviceKind,
      label: "状态色器件",
      custom: true,
      stateDefinitions: [
        { value: "0", name: "分", strokeColor: "#ff0000" },
        { value: "1", name: "合", strokeColor: "#00aa00" }
      ]
    };
    const node = createNodeFromTemplate(template, { x: 100, y: 100 });
    node.id = "state-dev-1";
    node.params = { ...node.params, status: "0", vbase: "10" };
    const svg = buildSvgDocument([node], [], {
      width: 800, height: 600, colorDisplayMode: "voltage", deviceTemplates: [template]
    });
    const symbolSection = svg.slice(svg.indexOf("<symbol"), svg.lastIndexOf("</symbol>"));
    // 状态 symbol 的状态色（strokeColor）字面存活，不被电压 class/槽驱动绕过
    expect(symbolSection).toContain('stroke="#ff0000"');
    expect(symbolSection).toContain('stroke="#00aa00"');
    expect(symbolSection).not.toContain("currentColor");
    // 仍处于电压模式下（use 挂电压类，正文状态色覆盖）
    expect(svg).toContain('class="kv10"');
  });
});

describe("I-3 energy 模式 vbase metadata 修正", () => {
  it("无端子母线 {vbase:0, voltage_level:10} 的 vbase 属性为实际电压 10（Task 0 解析链对齐副作用）", () => {
    const svg = buildSvgDocument([busNode()], [], {
      width: 800, height: 600, colorDisplayMode: "energy"
    });
    const useTag = svg.match(/<use [^>]*id="ac-bus-1"[^>]*>/)![0];
    expect(useTag).toContain('vbase="10"');
    expect(useTag).toContain('voltage-type="ac"');
  });
});
