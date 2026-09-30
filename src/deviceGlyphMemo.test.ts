// MemoDeviceGlyph 的 memo 比较器。
//
// 图元是画布上数量最多的元素，比较器漏一个字段 = 改了该字段不重渲染（症状是
// 「状态图标/配色不更新」），比较器过严 = 每帧全量重绘（大画布直接掉帧）。
// 比较器本身此前零断言：stateVisual 走的是 deviceStateVisualToken 的**结构**
// 等价而非引用等价，改成引用比较不会有人发现，只会表现为性能悄悄退化。
import { describe, expect, test } from "vitest";
import type { ModelNode } from "./model";
import { MemoDeviceGlyph } from "./DeviceGlyph";

// React.memo 的返回值带 compare
const compare = (MemoDeviceGlyph as unknown as { compare: (a: unknown, b: unknown) => boolean }).compare;

const node = {
  id: "n1",
  kind: "ac-bus",
  name: "母线1",
  params: {},
  position: { x: 0, y: 0 },
  size: { width: 100, height: 20 },
  rotation: 0,
  scale: 1,
  layerId: "default",
  terminals: []
} as unknown as ModelNode;

const palette = { energy: { ac: "#111" }, voltage: {} } as never;

const props = (over: Record<string, unknown> = {}) => ({
  node,
  miniature: false,
  mode: "full",
  colorDisplayMode: "energy",
  colorPalette: palette,
  stateVisual: null,
  ...over
});

describe("MemoDeviceGlyph 比较器：逐个 prop 变化都必须判不等", () => {
  test("完全相同 → 相等（memo 命中，不重渲染）", () => {
    expect(compare(props(), props())).toBe(true);
  });

  test("★ 六个被比较的 prop 逐个变化都判不等", () => {
    const base = props();
    const variants: Array<[string, Record<string, unknown>]> = [
      ["node", { node: { ...node, id: "n2" } as ModelNode }],
      ["miniature", { miniature: true }],
      ["mode", { mode: "text" }],
      ["colorDisplayMode", { colorDisplayMode: "voltage" }],
      ["colorPalette", { colorPalette: { energy: { ac: "#222" }, voltage: {} } as never }]
    ];
    for (const [name, over] of variants) {
      expect(`${name}: ${compare(base, props(over))}`).toBe(`${name}: false`);
    }
  });
});

describe("MemoDeviceGlyph 比较器：stateVisual 走结构等价", () => {
  test("★ 新对象但内容相同 → 判相等（引用比较会让每帧全量重绘）", () => {
    const visual = { name: "运行", color: "#f00" } as never;
    expect(compare(props({ stateVisual: visual }), props({ stateVisual: { name: "运行", color: "#f00" } as never }))).toBe(true);
  });

  test("内容变化 → 判不等", () => {
    expect(compare(props({ stateVisual: { name: "运行" } as never }), props({ stateVisual: { name: "停运" } as never }))).toBe(false);
  });

  test("缺省字段不影响等价（undefined 与空串同值）", () => {
    expect(compare(props({ stateVisual: { name: "运行" } as never }), props({ stateVisual: { name: "运行", icon: "" } as never }))).toBe(true);
  });

  test("null 与 undefined 视作同一个「无状态」", () => {
    expect(compare(props({ stateVisual: null }), props({ stateVisual: undefined }))).toBe(true);
  });
});

describe("MemoDeviceGlyph 比较器：不比较 voltagePaint", () => {
  // 如实记录：比较器覆盖六个 prop，voltagePaint 不在其中。
  // 这不是缺陷 —— 全部 React 调用点都不传该 prop（只有导出链 svg.ts 直接以函数
  // 形式调 DeviceGlyph，绕开 memo）。写成测试是为了：将来若有人给
  // MemoDeviceGlyph 接上电压着色，这条会立刻提示「忘了加进比较器」。
  test("换 voltagePaint 判相等（当前无调用点传它）", () => {
    expect(compare(props({ voltagePaint: null }), props({ voltagePaint: { nodeRef: "#abc" } }))).toBe(true);
  });
});