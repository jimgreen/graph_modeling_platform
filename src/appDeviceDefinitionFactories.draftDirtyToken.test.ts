// customDeviceDraftSectionDirtyToken：按对话框页签切出「这一页有没有改」的比较基准。
// 三个页签各取一组字段，且都先过 customDeviceDraftDirtyToken 归一 ——
// 端子数组会被截到 terminalCount 长度，多余的残值不该造成假脏。
import { describe, expect, test } from "vitest";

import { customDeviceDraftSectionDirtyToken } from "./appExtracted/appDeviceDefinitionFactories";

const pt = (x: number, y: number) => ({ x, y });

function makeDraft(over: Record<string, any> = {}) {
  return {
    componentName: "自定义元件",
    componentKind: "ac-load",
    backgroundImage: null,
    backgroundImageAssetId: "",
    backgroundImageFit: "cover",
    backgroundImageCleared: false,
    size: { width: 40, height: 30 },
    allowResizeTransform: true,
    terminalCount: 2,
    terminalTypes: ["ac", "ac", "ac"],
    terminalLabels: ["A", "B", "C"],
    terminalAnchors: [pt(0, 0), pt(10, 0), pt(20, 0)],
    terminalRoles: ["r1", "r2", "r3"],
    terminalAssociations: [null, null, null],
    stateDefinitions: [],
    categoryLibraryName: "库",
    componentLibrary: "ac",
    isDerivedComponentLibrary: false,
    derivedFromComponentLibrary: "",
    derivedComponentLibrary: "",
    derivedComponentLibraryLabel: "",
    measurementDefinitions: [{ key: "u" }],
    params: [{ key: "p" }],
    error: "某个报错",
    ...over
  } as any;
}

const ANCHORS = [pt(0, 0), pt(10, 0), pt(20, 0)];

describe("customDeviceDraftSectionDirtyToken", () => {
  test("三个页签的 token 互不相同", () => {
    const draft = makeDraft();

    const basic = customDeviceDraftSectionDirtyToken(draft, "basic" as any, ANCHORS);
    const parameters = customDeviceDraftSectionDirtyToken(draft, "parameters" as any, ANCHORS);
    const measurements = customDeviceDraftSectionDirtyToken(draft, "measurements" as any, ANCHORS);

    expect(new Set([basic, parameters, measurements]).size).toBe(3);
  });

  test("只改本页签字段时本页签 token 变、别的页签不变", () => {
    const draft = makeDraft();
    const changed = makeDraft({ componentName: "改过名字" });

    expect(customDeviceDraftSectionDirtyToken(changed, "basic" as any, ANCHORS)).not.toBe(
      customDeviceDraftSectionDirtyToken(draft, "basic" as any, ANCHORS)
    );
    expect(customDeviceDraftSectionDirtyToken(changed, "parameters" as any, ANCHORS)).toBe(
      customDeviceDraftSectionDirtyToken(draft, "parameters" as any, ANCHORS)
    );
  });

  test("量测页签只看量测定义", () => {
    const draft = makeDraft();
    const changed = makeDraft({ params: [{ key: "p2" }] });

    expect(customDeviceDraftSectionDirtyToken(changed, "measurements" as any, ANCHORS)).toBe(
      customDeviceDraftSectionDirtyToken(draft, "measurements" as any, ANCHORS)
    );
  });

  test("error 字段被清空，不参与任何页签的脏判定", () => {
    const draft = makeDraft();

    expect(customDeviceDraftSectionDirtyToken(makeDraft({ error: "" }), "basic" as any, ANCHORS)).toBe(
      customDeviceDraftSectionDirtyToken(draft, "basic" as any, ANCHORS)
    );
  });

  test("端子数组被截到 terminalCount 长度，多余残值不造成假脏", () => {
    const withExtra = makeDraft({ terminalLabels: ["A", "B"] });

    expect(customDeviceDraftSectionDirtyToken(withExtra, "parameters" as any, ANCHORS)).toBe(
      customDeviceDraftSectionDirtyToken(makeDraft(), "parameters" as any, ANCHORS)
    );
  });

  test("anchor 用传入值而不是 draft 里的", () => {
    const draft = makeDraft();

    const withShifted = customDeviceDraftSectionDirtyToken(draft, "parameters" as any, [pt(1, 1), pt(11, 1), pt(21, 1)]);

    expect(withShifted).not.toBe(customDeviceDraftSectionDirtyToken(draft, "parameters" as any, ANCHORS));
  });

  test("不传 anchors 时按空数组截断，端子锚点段为空", () => {
    const withAnchors = customDeviceDraftSectionDirtyToken(makeDraft(), "parameters" as any, ANCHORS);

    expect(customDeviceDraftSectionDirtyToken(makeDraft(), "parameters" as any)).not.toBe(withAnchors);
  });

  test("端子数组按四舍五入后的 terminalCount 截断（1.4 → 1）", () => {
    const trimmed = makeDraft({ terminalCount: 1.4, terminalLabels: ["A"] });
    const withExtra = makeDraft({ terminalCount: 1.4, terminalLabels: ["A", "B", "C"] });

    expect(customDeviceDraftSectionDirtyToken(withExtra, "parameters" as any, ANCHORS)).toBe(
      customDeviceDraftSectionDirtyToken(trimmed, "parameters" as any, ANCHORS)
    );
  });

  test("小数向上取整时（1.6 → 2）多留一段", () => {
    const roundedUp = makeDraft({ terminalCount: 1.6 });
    const one = makeDraft({ terminalCount: 1, terminalLabels: ["A"] });

    expect(customDeviceDraftSectionDirtyToken(roundedUp, "parameters" as any, ANCHORS)).not.toBe(
      customDeviceDraftSectionDirtyToken(one, "parameters" as any, ANCHORS)
    );
  });

  test("terminalCount 为 0 时端子段全被截空", () => {
    const zero = makeDraft({ terminalCount: 0 });

    expect(customDeviceDraftSectionDirtyToken(zero, "parameters" as any, ANCHORS)).toBe(
      customDeviceDraftSectionDirtyToken(makeDraft({ terminalCount: 0 }), "parameters" as any, ANCHORS)
    );
    expect(customDeviceDraftSectionDirtyToken(zero, "parameters" as any, ANCHORS)).not.toBe(
      customDeviceDraftSectionDirtyToken(makeDraft(), "parameters" as any, ANCHORS)
    );
  });

  test("未识别的页签落到基础信息那一组", () => {
    expect(customDeviceDraftSectionDirtyToken(makeDraft(), "不认识" as any, ANCHORS)).toBe(
      customDeviceDraftSectionDirtyToken(makeDraft(), "basic" as any, ANCHORS)
    );
  });
});
