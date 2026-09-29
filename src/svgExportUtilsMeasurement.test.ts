// svgExportUtils 的量测几何与边框（此前零直呼）
//
// exportMeasurementGroupMetrics / buildExportMeasurementGroupMarkup 决定量测框在导出
// SVG 里的位置、列数、框宽，以及每个 tspan 的 x 坐标。算错不报错，只是画歪。
import { describe, expect, it } from "vitest";
import {
  buildExportMeasurementGroupMarkup,
  exportMeasurementGroupAnchorPoint,
  exportMeasurementGroupBackgroundColor,
  exportMeasurementGroupBorderColor,
  exportMeasurementGroupBorderDashArray,
  exportMeasurementGroupBorderWidth,
  exportMeasurementGroupLocalOffset,
  exportMeasurementGroupMetadataAttributes,
  exportMeasurementGroupMetrics,
  exportMeasurementItemMetadataAttributes
} from "./svgExportUtils";
import type { ModelNode, Terminal } from "./model";
import {
  DEFAULT_MEASUREMENT_GROUP_BACKGROUND_COLOR,
  DEFAULT_MEASUREMENT_GROUP_BORDER_COLOR,
  DEFAULT_MEASUREMENT_GROUP_BORDER_STYLE,
  DEFAULT_MEASUREMENT_CONFIG,
  type MeasurementGroup,
  type MeasurementItemBinding,
  type PlatformMeasurementConfig
} from "./measurements";
import { getTerminalPoint } from "./model";

// ─── 测试辅助 ─────────────────────────────────────────────

type Metrics = NonNullable<ReturnType<typeof exportMeasurementGroupMetrics>>;

function metrics(node: ModelNode, group: MeasurementGroup): Metrics {
  const result = exportMeasurementGroupMetrics(node, group, DEFAULT_MEASUREMENT_CONFIG);
  if (!result) {
    throw new Error("期望产出 metrics");
  }
  return result;
}

function makeTerminal(id: string, anchorX: number, anchorY: number): Terminal {
  return { id, label: id, type: "ac", anchor: { x: anchorX, y: anchorY }, nodeNumber: "" };
}

function makeNode(overrides: Partial<ModelNode> = {}): ModelNode {
  return {
    id: "n1",
    kind: "breaker" as ModelNode["kind"],
    name: "断路器1",
    nodeNumber: "",
    acTopologyNode: 0,
    dcTopologyNode: 0,
    position: { x: 0, y: 0 },
    size: { width: 80, height: 40 },
    rotation: 0,
    scale: 1,
    terminals: [makeTerminal("t1", -0.5, 0), makeTerminal("t2", 0.5, 0)],
    params: {},
    ...overrides
  };
}

function item(overrides: Partial<MeasurementItemBinding> = {}): MeasurementItemBinding {
  return {
    id: "measurement-1",
    measurementTypeId: "activePower",
    sourcePoint: "n1.P",
    ...overrides
  };
}

function group(overrides: Partial<MeasurementGroup> = {}): MeasurementGroup {
  return {
    id: "g1",
    nodeId: "n1",
    visible: true,
    anchor: "top",
    offset: { x: 0, y: 0 },
    layout: "vertical",
    items: [item()],
    ...overrides
  };
}

const ACTIVE_POWER_TYPE = DEFAULT_MEASUREMENT_CONFIG.measurementTypes.find(
  (type) => type.id === "activePower"
)!;

// ─── 边框样式 ─────────────────────────────────────────────

describe("svgExportUtils / 量测框边框", () => {
  it("背景色缺省回落到默认值，自定义色优先", () => {
    expect(exportMeasurementGroupBackgroundColor(group())).toBe(DEFAULT_MEASUREMENT_GROUP_BACKGROUND_COLOR);
    expect(exportMeasurementGroupBackgroundColor(group({ backgroundColor: "#ff0000" }))).toBe("#ff0000");
  });

  it("边框色缺省回落到默认值，自定义色优先", () => {
    expect(exportMeasurementGroupBorderColor(group())).toBe(DEFAULT_MEASUREMENT_GROUP_BORDER_COLOR);
    expect(exportMeasurementGroupBorderColor(group({ borderColor: "#00ff00" }))).toBe("#00ff00");
  });

  it("borderStyle=none 时边框宽度归零，即使显式给了 borderWidth", () => {
    expect(exportMeasurementGroupBorderWidth(group({ borderStyle: "none", borderWidth: 8 }))).toBe(0);
  });

  it("borderWidth 夹在 0..12，越界取端点", () => {
    expect(exportMeasurementGroupBorderWidth(group({ borderStyle: "solid", borderWidth: 3 }))).toBe(3);
    expect(exportMeasurementGroupBorderWidth(group({ borderStyle: "solid", borderWidth: 99 }))).toBe(12);
    expect(exportMeasurementGroupBorderWidth(group({ borderStyle: "solid", borderWidth: -5 }))).toBe(0);
  });

  it("borderWidth 非数字时回落到 1", () => {
    expect(exportMeasurementGroupBorderWidth(group({ borderStyle: "solid", borderWidth: "abc" as never }))).toBe(1);
  });

  it("none 样式与零宽度都不产出 dasharray，其他虚线样式产出", () => {
    expect(exportMeasurementGroupBorderDashArray(group({ borderStyle: "none", borderWidth: 4 }))).toBeUndefined();
    expect(exportMeasurementGroupBorderDashArray(group({ borderStyle: "solid", borderWidth: 0 }))).toBeUndefined();
    expect(exportMeasurementGroupBorderDashArray(group({ borderStyle: "dashed", borderWidth: 2 }))).toBeTruthy();
  });

  it("无 borderStyle 时沿用默认样式（none ⇒ 无 dasharray）", () => {
    expect(DEFAULT_MEASUREMENT_GROUP_BORDER_STYLE).toBe("none");
    expect(exportMeasurementGroupBorderDashArray(group({ borderWidth: 4 }))).toBeUndefined();
  });
});

// ─── 锚点与偏移 ───────────────────────────────────────────

describe("svgExportUtils / 量测框锚点与偏移", () => {
  const node = makeNode({ position: { x: 100, y: 200 } });

  it("terminalId 命中节点端子时锚到端子点", () => {
    expect(exportMeasurementGroupAnchorPoint(node, group({ terminalId: "t2" }))).toEqual(
      getTerminalPoint(node, "t2")
    );
  });

  it("terminalId 未命中任何端子时退回节点中心", () => {
    expect(exportMeasurementGroupAnchorPoint(node, group({ terminalId: "不存在" }))).toEqual(node.position);
  });

  it("无 terminalId 时锚到节点中心", () => {
    expect(exportMeasurementGroupAnchorPoint(node, group())).toEqual(node.position);
  });

  it("偏移原样透传：量测框不随设备缩放", () => {
    expect(exportMeasurementGroupLocalOffset(node, group({ offset: { x: 12, y: -34 } }))).toEqual({
      x: 12,
      y: -34
    });
  });

  it("节点缩放再大，偏移仍原样透传", () => {
    const scaled = makeNode({ scale: 4, scaleX: 3, scaleY: 5, position: { x: 0, y: 0 } });
    expect(exportMeasurementGroupLocalOffset(scaled, group({ offset: { x: 12, y: -34 } }))).toEqual({
      x: 12,
      y: -34
    });
  });
});

// ─── 元数据属性 ───────────────────────────────────────────

describe("svgExportUtils / 量测元数据属性", () => {
  it("组属性：owner 与 device 相同时不输出 owner-dev", () => {
    const attrs = exportMeasurementGroupMetadataAttributes(makeNode(), group({ terminalId: "t1" }), "d1", "d1");
    expect(attrs).toBe('dev="d1" term="t1"');
  });

  it("组属性：owner 与 device 不同时补 owner-dev", () => {
    const attrs = exportMeasurementGroupMetadataAttributes(makeNode(), group(), "d1", "owner-1");
    expect(attrs).toContain('dev="d1"');
    expect(attrs).toContain('owner-dev="owner-1"');
  });

  it("组属性：无 terminalId 时不输出 term", () => {
    expect(exportMeasurementGroupMetadataAttributes(makeNode(), group(), "d1", "d1")).toBe('dev="d1"');
  });

  it("项属性：mt 是运行时绑定字段，mti 保留平台类型 id", () => {
    const attrs = exportMeasurementItemMetadataAttributes(item(), "n1", "d1");
    expect(attrs).toContain('mt="activePower"');
    expect(attrs).toContain('mti="activePower"');
  });

  it("项属性：sourcePoint 去掉节点前缀，值与 mt 相同时不输出 mf", () => {
    const same = exportMeasurementItemMetadataAttributes(
      item({ sourcePoint: "n1.P", measurementTypeId: "P" }),
      "n1",
      "d1"
    );
    expect(same).not.toContain("mf=");
    const diff = exportMeasurementItemMetadataAttributes(
      item({ sourcePoint: "n1.P", measurementTypeId: "activePower" }),
      "n1",
      "d1"
    );
    expect(diff).toContain('mf="P"');
  });

  it("项属性：role 非空才输出 mr", () => {
    expect(exportMeasurementItemMetadataAttributes(item(), "n1", "d1")).not.toContain("mr=");
    expect(exportMeasurementItemMetadataAttributes(item({ role: "值" }), "n1", "d1")).toContain('mr="值"');
  });

  it("项属性：deviceId 与 sourcePoint 前缀不同时，两边都试一遍", () => {
    // sourcePoint 用导出 id 前缀（SVG 往返后就是这样），仍应剥成裸字段名
    const attrs = exportMeasurementItemMetadataAttributes(
      item({ sourcePoint: "d1.P", measurementTypeId: "activePower" }),
      "n1",
      "d1"
    );
    expect(attrs).toContain('mf="P"');
  });
});

// ─── exportMeasurementGroupMetrics ────────────────────────

describe("svgExportUtils / exportMeasurementGroupMetrics", () => {
  const node = makeNode();

  it("visible:false 返回 null（不产出几何）", () => {
    expect(exportMeasurementGroupMetrics(node, group({ visible: false }), DEFAULT_MEASUREMENT_CONFIG)).toBeNull();
  });

  it("全部 item 不可见时返回 null", () => {
    const hidden = group({ items: [item({ visible: false })] });
    expect(exportMeasurementGroupMetrics(node, hidden, DEFAULT_MEASUREMENT_CONFIG)).toBeNull();
  });

  it("layout=vertical ⇒ 单列；horizontal ⇒ 全部一行；grid ⇒ 两列", () => {
    const three = [item({ id: "measurement-1" }), item({ id: "measurement-2" }), item({ id: "measurement-3" })];
    expect(metrics(node, group({ items: three, layout: "vertical" })).columns).toBe(1);
    expect(metrics(node, group({ items: three, layout: "horizontal" })).columns).toBe(3);
    expect(metrics(node, group({ items: three, layout: "grid" })).columns).toBe(2);
  });

  it("高度随行数增长，行距不小于 16", () => {
    const one = metrics(node, group());
    const two = metrics(
      node,
      group({ items: [item({ id: "measurement-1" }), item({ id: "measurement-2" })] })
    );
    expect(two.height / two.lineHeight).toBeGreaterThan(one.height / one.lineHeight);
    expect(one.lineHeight).toBeGreaterThanOrEqual(16);
  });

  it("宽度 = 列宽 × 列数", () => {
    const m = metrics(node, group({ items: [item({ id: "measurement-1" }), item({ id: "measurement-2" })] }));
    expect(m.width).toBeCloseTo(m.columnWidth * m.columns, 6);
  });

  it("labelVisible:false ⇒ 标签文本只剩定宽填充空格，视觉上不占文字", () => {
    // 注意不是空串：标签列按 MEASUREMENT_LABEL_VISUAL_WIDTH 定宽右对齐，
    // 隐藏标签时保留填充才能让值列仍在同一列 x 上（否则整框左右跳）。
    const withLabel = metrics(node, group());
    const withoutLabel = metrics(node, group({ labelVisible: false }));
    expect(withLabel.rows[0]!.labelText.trim()).not.toBe("");
    expect(withoutLabel.rows[0]!.labelText).not.toBe("");
    expect(withoutLabel.rows[0]!.labelText.trim()).toBe("");
  });

  it("unitVisible:false ⇒ 单位文本为空串", () => {
    expect(metrics(node, group()).rows[0]!.unitText).not.toBe("");
    expect(metrics(node, group({ unitVisible: false })).rows[0]!.unitText).toBe("");
  });

  it("行内容取自 resolveMeasurementItemDisplay 的 label/unit", () => {
    const m = metrics(node, group());
    expect(m.rows[0]!.display.label).toBe(ACTIVE_POWER_TYPE.shortLabel);
    expect(m.rows[0]!.display.unit).toBe(ACTIVE_POWER_TYPE.defaultUnit);
  });

  it("值列按定宽补齐：默认格式下长度一致", () => {
    const m = metrics(node, group());
    expect(m.rows[0]!.valueText).toHaveLength(m.rows[0]!.labelText.length > 0 ? m.rows[0]!.valueText.length : 0);
    // 与 measurementFormatValueText 的输出一致
    expect(typeof m.rows[0]!.valueText).toBe("string");
  });

  it("item.defaultValue 影响显示值", () => {
    expect(metrics(node, group()).rows[0]!.display.defaultValue).toBe(ACTIVE_POWER_TYPE.defaultValue);
    const custom = metrics(node, group({ items: [item({ defaultValue: 42.5 })] }));
    expect(custom.rows[0]!.display.defaultValue).toBe(42.5);
  });

  it("字体不随设备缩放：scale 改变不改变 fontSize", () => {
    const plain = metrics(node, group());
    const scaled = metrics(makeNode({ scale: 3, scaleX: 2, scaleY: 5 }), group());
    expect(scaled.rows[0]!.fontSize).toBe(plain.rows[0]!.fontSize);
  });

  it("显式格式覆盖被尊重：formatOverride 影响值文本", () => {
    const m = metrics(
      node,
      group({ items: [item({ defaultValue: 42.5678, formatOverride: "%.1f", decimalsOverride: 1 })] })
    );
    expect(m.rows[0]!.valueText.trim()).toContain("42.6");
  });

  it("无测量类型的 item 仍产出行（label 回落为类型 id）", () => {
    const m = metrics(node, group({ items: [item({ measurementTypeId: "不存在的类型" })] }));
    expect(m.rows[0]!.display.label).toBe("不存在的类型");
  });

  it("传入自定义 config 时按 config 解析类型", () => {
    const custom: PlatformMeasurementConfig = {
      ...DEFAULT_MEASUREMENT_CONFIG,
      measurementTypes: [
        { ...ACTIVE_POWER_TYPE, shortLabel: "有功", defaultUnit: "kW" }
      ]
    };
    const m = exportMeasurementGroupMetrics(node, group(), custom)!;
    expect(m.rows[0]!.display.label).toBe("有功");
    expect(m.rows[0]!.unitText).toBe("kW");
  });
});

// ─── buildExportMeasurementGroupMarkup ────────────────────

describe("svgExportUtils / buildExportMeasurementGroupMarkup", () => {
  const node = makeNode({ position: { x: 100, y: 200 } });

  it("无几何时返回空串", () => {
    expect(buildExportMeasurementGroupMarkup(node, group({ visible: false }), DEFAULT_MEASUREMENT_CONFIG)).toBe("");
  });

  it("产出 <g class=\"mg\"> 包裹 + rect 底框", () => {
    const markup = buildExportMeasurementGroupMarkup(node, group(), DEFAULT_MEASUREMENT_CONFIG);
    expect(markup).toContain('<g class="mg"');
    expect(markup).toContain("<rect ");
    expect(markup).toContain("</g>");
  });

  it("transform 用锚点 + 偏移", () => {
    const markup = buildExportMeasurementGroupMarkup(
      node,
      group({ offset: { x: 10, y: -20 } }),
      DEFAULT_MEASUREMENT_CONFIG
    );
    expect(markup).toContain('transform="translate(110 180)"');
  });

  it("无 layerId 时不输出 layer-id 属性，传入时输出", () => {
    expect(buildExportMeasurementGroupMarkup(node, group(), DEFAULT_MEASUREMENT_CONFIG)).not.toContain("layer-id=");
    const layered = buildExportMeasurementGroupMarkup(node, group(), DEFAULT_MEASUREMENT_CONFIG, undefined, {
      layerId: "L1"
    });
    expect(layered).toContain('layer-id="L1"');
  });

  it("visible:false 只加 display:none，仍产出元素", () => {
    const markup = buildExportMeasurementGroupMarkup(node, group(), DEFAULT_MEASUREMENT_CONFIG, undefined, {
      visible: false
    });
    expect(markup).toContain('class="mg"');
    expect(markup).toContain("display:none");
  });

  it("每个 item 恒产出一个 <text>，grid 只改 x 排布不改行数", () => {
    const three = [item({ id: "measurement-1" }), item({ id: "measurement-2" }), item({ id: "measurement-3" })];
    const count = (markup: string) => markup.match(/<text class="measurement-item mi"/g)?.length ?? 0;
    const oneCol = buildExportMeasurementGroupMarkup(node, group({ items: three, layout: "vertical" }), DEFAULT_MEASUREMENT_CONFIG);
    const twoCol = buildExportMeasurementGroupMarkup(node, group({ items: three, layout: "grid" }), DEFAULT_MEASUREMENT_CONFIG);
    expect(count(oneCol)).toBe(3);
    expect(count(twoCol)).toBe(3);
    // 差别在列宽与每行 x：两列时第二列被推到右半边
    expect(twoCol).toContain("translate(");
  });

  it("传 usedSvgIds 时值 tspan 拿到去重后的 id，且会登记", () => {
    const used = new Set<string>();
    const markup = buildExportMeasurementGroupMarkup(node, group(), DEFAULT_MEASUREMENT_CONFIG, used);
    expect(markup).toMatch(/<tspan class="measurement-value mv" id="mv-1"/);
    expect(used.has("mv-1")).toBe(true);
  });

  it("不传 usedSvgIds 时值 tspan 不带 id", () => {
    const markup = buildExportMeasurementGroupMarkup(node, group(), DEFAULT_MEASUREMENT_CONFIG);
    expect(markup).not.toMatch(/<tspan class="measurement-value mv" id=/);
  });

  it("已占用的 id 会被去重成 _2 后缀", () => {
    const markup = buildExportMeasurementGroupMarkup(node, group(), DEFAULT_MEASUREMENT_CONFIG, new Set(["mv-1"]));
    expect(markup).toContain('id="mv-1_2"');
  });

  it("项 id 以 measurement- 开头时直接取其后缀作为值 id 的键", () => {
    const markup = buildExportMeasurementGroupMarkup(
      node,
      group({ items: [item({ id: "measurement-abc" })] }),
      DEFAULT_MEASUREMENT_CONFIG,
      new Set()
    );
    expect(markup).toContain('id="mv-abc"');
  });

  it("项 id 不带前缀时用 deviceId-项 id 拼键", () => {
    const markup = buildExportMeasurementGroupMarkup(
      node,
      group({ items: [item({ id: "plain" })] }),
      DEFAULT_MEASUREMENT_CONFIG,
      new Set()
    );
    expect(markup).toContain('id="mv-n1-plain"');
  });

  it("labelVisible:false 时标签 tspan 仍在，但内容只剩填充空格", () => {
    // 与上面 metrics 那条同源：值列 x 依赖标签列占位，不能整个 tspan 删掉。
    const markup = buildExportMeasurementGroupMarkup(node, group({ labelVisible: false }), DEFAULT_MEASUREMENT_CONFIG);
    const label = markup.match(/<tspan class="measurement-label ml"[^>]*>([^<]*)</)?.[1] ?? null;
    expect(label).not.toBeNull();
    expect(label!.trim()).toBe("");
    expect(markup).toContain('class="measurement-value mv"');
  });

  it("文本中的 XML 元字符被转义", () => {
    const markup = buildExportMeasurementGroupMarkup(
      node,
      group({ items: [item({ labelOverride: '<&">' })] }),
      DEFAULT_MEASUREMENT_CONFIG
    );
    expect(markup).toContain("&lt;&amp;&quot;&gt;");
    expect(markup).not.toContain('>&&"');
  });

  it("虚线边框产出 stroke-dasharray，实线不产出", () => {
    const dashed = buildExportMeasurementGroupMarkup(
      node,
      group({ borderStyle: "dashed", borderWidth: 2 }),
      DEFAULT_MEASUREMENT_CONFIG
    );
    expect(dashed).toContain("stroke-dasharray=");
    const solid = buildExportMeasurementGroupMarkup(
      node,
      group({ borderStyle: "solid", borderWidth: 2 }),
      DEFAULT_MEASUREMENT_CONFIG
    );
    expect(solid).not.toContain("stroke-dasharray=");
  });

  it("deviceId 覆盖时元数据与值 id 同步改用导出 id", () => {
    const markup = buildExportMeasurementGroupMarkup(
      node,
      group({ items: [item({ id: "plain" })] }),
      DEFAULT_MEASUREMENT_CONFIG,
      new Set(),
      { deviceId: "exported-1" }
    );
    expect(markup).toContain('dev="exported-1"');
    expect(markup).toContain('id="mv-exported-1-plain"');
  });

  it("ownerDeviceId 不同于 deviceId 时补 owner-dev，并用它作用域化项 id", () => {
    const markup = buildExportMeasurementGroupMarkup(
      node,
      group({ items: [item({ id: "n1-thing" })] }),
      DEFAULT_MEASUREMENT_CONFIG,
      new Set(),
      { deviceId: "exported-1", ownerDeviceId: "owner-1" }
    );
    expect(markup).toContain('owner-dev="owner-1"');
    // 作用域化把内部节点 id 换成 owner id（真值含 deviceId 前缀，探针实测）
    expect(markup).toContain('id="mv-exported-1-owner-1-thing"');
  });

  it("id 与 layerId 中的 XML 元字符被转义", () => {
    const markup = buildExportMeasurementGroupMarkup(
      node,
      group({ items: [item({ id: 'measurement-a"b' })] }),
      DEFAULT_MEASUREMENT_CONFIG,
      new Set(),
      { layerId: 'L"1' }
    );
    expect(markup).toContain('layer-id="L&quot;1"');
    // 值 id 经 exportSvgUniqueId 归一（非法字符换 _），不是 escapeXml —— 引号变下划线
    expect(markup).toContain('id="mv-a_b"');
  });
});
