// 量测草稿深拷贝 + 端子配色小工具。
//
// cloneMeasurementGroupForDraft 是量测编辑器的隔离层：草稿要能自由改而不污染
// 正式配置。浅拷贝会让「拖一下量测框」「改一个测点样式」直接写进真实模型，
// 取消编辑也回不去 —— 而这类串改没有任何报错。
import { describe, expect, test } from "vitest";
import type { MeasurementGroup } from "./measurements";
import {
  busEndpointColor,
  cloneMeasurementGroupForDraft,
  isElectricPaletteType,
  terminalColor
} from "./appExtracted/appCoreCanvasUtilities";
import type { ModelNode, TerminalType } from "./model";

const group = (over: Partial<MeasurementGroup> = {}): MeasurementGroup =>
  ({
    id: "measurement-n1",
    nodeId: "n1",
    anchor: { x: 0, y: 0 },
    visible: true,
    offset: { x: 12, y: -8 },
    groupStyleOverride: { fill: "#fff" },
    items: [
      { terminalId: "t1", paramKey: "p", styleOverride: { color: "#f00" } },
      { terminalId: "t2", paramKey: "q" }
    ],
    ...over
  }) as unknown as MeasurementGroup;

describe("cloneMeasurementGroupForDraft：逐层脱钩", () => {
  test("顶层是浅拷贝（改标量不影响原对象）", () => {
    const source = group();
    const draft = cloneMeasurementGroupForDraft(source);
    draft.visible = false;
    expect(source.visible).toBe(true);
  });

  test("★ offset 是新对象（拖动量测框不写回原配置）", () => {
    const source = group();
    const draft = cloneMeasurementGroupForDraft(source);
    expect(draft.offset).not.toBe(source.offset);
    draft.offset.x = 999;
    expect(source.offset.x).toBe(12);
  });

  test("★ 每个测点是新对象，且样式覆盖也脱钩", () => {
    const source = group();
    const draft = cloneMeasurementGroupForDraft(source);
    expect(draft.items[0]).not.toBe(source.items[0]);
    expect(draft.items[0].styleOverride).not.toBe(source.items[0].styleOverride);
    draft.items[0].styleOverride = { color: "#0f0" };
    expect(source.items[0].styleOverride).toEqual({ color: "#f00" });
  });

  test("★ 数组本身不共享（往草稿里加测点不污染原组）", () => {
    const source = group();
    const draft = cloneMeasurementGroupForDraft(source);
    draft.items.push({ terminalId: "t3", paramKey: "i" } as never);
    expect(source.items).toHaveLength(2);
  });

  test("组级样式缺省时保持 undefined（不凭空造一个空对象）", () => {
    expect(cloneMeasurementGroupForDraft(group({ groupStyleOverride: undefined })).groupStyleOverride).toBeUndefined();
  });

  test("测点级样式缺省时同样保持 undefined", () => {
    const draft = cloneMeasurementGroupForDraft(group());
    expect(draft.items[1].styleOverride).toBeUndefined();
  });

  test("空测点数组照样返回空数组（不是 undefined）", () => {
    const draft = cloneMeasurementGroupForDraft(group({ items: [] }));
    expect(draft.items).toEqual([]);
  });
});

describe("端子配色小工具", () => {
  const busNode = {
    id: "b1",
    kind: "ac-bus",
    name: "母线",
    params: {},
    terminals: [{ id: "t1", type: "dc", anchor: { x: 0, y: 0 }, nodeNumber: "1" }]
  } as unknown as ModelNode;

  test("terminalColor 按端子类型取色", () => {
    expect(terminalColor("ac")).toBe("#2563eb");
    expect(terminalColor("h2")).not.toBe(terminalColor("ac"));
  });

  test("★ busEndpointColor 取首个端子的色（母线端点色 = 母线端子色）", () => {
    expect(busEndpointColor(busNode)).toBe(terminalColor("dc"));
  });

  test("★ 零端子母线不抛错，回落到 ac 默认色（undefined 不是「无色」）", () => {
    expect(busEndpointColor({ ...busNode, terminals: [] } as ModelNode)).toBe(terminalColor(undefined));
  });

  test("isElectricPaletteType 只认 ac / dc（氢能热能不走电压配色）", () => {
    expect(isElectricPaletteType("ac")).toBe(true);
    expect(isElectricPaletteType("dc")).toBe(true);
    for (const type of ["h2", "heat", undefined] as Array<TerminalType | undefined>) {
      expect(`${String(type)}: ${isElectricPaletteType(type)}`).toBe(`${String(type)}: false`);
    }
  });
});