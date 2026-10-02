// 状态图标拖拽的可见框查询：图片按「裁剪参数」组成的键查缓存，导入 SVG 查不到就现算。
// 两条都不能省：键写错会静默退化成「无框」，进而让位移收敛算错。
import { describe, expect, test, vi } from "vitest";

import {
  clampStateIconDrawingMovementDelta,
  stateIconDrawingMovementFrameForDialog,
  stateIconDrawingMovementVisibleFrames
} from "./appExtracted/appDeviceDefinitionFactories";

const pt = (x: number, y: number) => ({ x, y });

describe("stateIconDrawingMovementFrameForDialog", () => {
  const WITH_TERMINALS = { x: 30, y: 20, width: 180, height: 120, rx: 8 };
  const NO_TERMINALS = { x: 0, y: 0, width: 240, height: 160, rx: 10 };

  const baseScope = {
    definitionVisualDraft: { terminalCount: 3 },
    customDeviceDraft: { terminalCount: 2 },
    definitionVisualTerminalTypes: ["a", "b", "c"],
    customDraftTerminalTypes: ["x", "y"]
  };

  test("有端子时返回内缩的画框（给端子留位）", () => {
    expect(stateIconDrawingMovementFrameForDialog(baseScope as any, { target: { scope: "definition" } })).toEqual(WITH_TERMINALS);
  });

  test("自定义元件页签有端子时同样用内缩框", () => {
    expect(stateIconDrawingMovementFrameForDialog(baseScope as any, { target: { scope: "custom" } })).toEqual(WITH_TERMINALS);
  });

  test("没有 target 时按「无端子」处理", () => {
    expect(stateIconDrawingMovementFrameForDialog(baseScope as any, null)).toEqual(NO_TERMINALS);
  });

  test("scope 缺失时不启用内缩框（即使端子数大于 0）", () => {
    expect(stateIconDrawingMovementFrameForDialog(baseScope as any, { target: {} })).toEqual(NO_TERMINALS);
  });

  test("端子数为 0 且没有端子类型时不启用内缩框", () => {
    const scope = { ...baseScope, definitionVisualDraft: { terminalCount: 0 }, definitionVisualTerminalTypes: [] };

    expect(stateIconDrawingMovementFrameForDialog(scope as any, { target: { scope: "definition" } })).toEqual(NO_TERMINALS);
  });

  test("terminalCount 为 0 是假值，会回落到端子类型数组长度", () => {
    const scope = { ...baseScope, definitionVisualDraft: { terminalCount: 0 }, definitionVisualTerminalTypes: ["a", "b"] };

    expect(stateIconDrawingMovementFrameForDialog(scope as any, { target: { scope: "definition" } })).toEqual(WITH_TERMINALS);
  });

  test("草稿缺 terminalCount 时回落到端子类型数组长度", () => {
    const scope = { ...baseScope, definitionVisualDraft: {} };

    expect(stateIconDrawingMovementFrameForDialog(scope as any, { target: { scope: "definition" } })).toEqual(WITH_TERMINALS);
  });

  test("terminalCount 为负时按 0 处理", () => {
    const scope = { ...baseScope, definitionVisualDraft: { terminalCount: -5 }, definitionVisualTerminalTypes: [] };

    expect(stateIconDrawingMovementFrameForDialog(scope as any, { target: { scope: "definition" } })).toEqual(NO_TERMINALS);
  });

  test("非零 terminalCount 优先于端子类型数组长度", () => {
    const scope = { ...baseScope, definitionVisualDraft: { terminalCount: 1 }, definitionVisualTerminalTypes: ["a", "b", "c"] };

    expect(stateIconDrawingMovementFrameForDialog(scope as any, { target: { scope: "definition" } })).toEqual(WITH_TERMINALS);
  });
});

describe("stateIconDrawingMovementVisibleFrames", () => {
  test("两个来源各取各的", () => {
    const image = { i1: { x: 0, y: 0, width: 10, height: 10 } };
    const svg = { s1: { x: 0, y: 0, width: 20, height: 20 } };

    expect(
      stateIconDrawingMovementVisibleFrames({
        stateIconDrawingImageVisibleFrames: image,
        stateIconDrawingSvgVisibleFrames: svg
      } as any)
    ).toEqual({ image, svg });
  });

  test("缺省时给空对象而不是 undefined", () => {
    expect(stateIconDrawingMovementVisibleFrames({} as any)).toEqual({ image: {}, svg: {} });
  });
});

describe("可见框缺失时的兜底（经由位移收敛观察）", () => {
  const frame = (x: number, y: number, width: number, height: number) => ({ x, y, width, height });

  test("图片元素查不到可见框时用自身尺寸居中兜底", () => {
    const image = { id: "e1", kind: "image", x: 100, y: 100, width: 20, height: 20, imageHref: "a.png" };

    // 兜底框 = [-10,-10,20,20] 相对元素中心 → 选区 [90,110]
    const result = clampStateIconDrawingMovementDelta([image], pt(999, 0), frame(0, 0, 240, 160));

    expect(result.x).toBe(130);
  });

  test("图片元素带裁剪参数时键不同，命中另一份可见框", () => {
    const image = { id: "e1", kind: "image", x: 100, y: 100, width: 20, height: 20, imageHref: "a.png", cropX: 5 };
    const key = "e1:a.png:cover:1:5:0";
    // 可见框 100×100，无 basis → 按元素自身尺寸缩放 1:1 → 选区 [100,200]
    const visibleFrames = { image: { [key]: { x: 0, y: 0, width: 100, height: 100 } } };

    const result = clampStateIconDrawingMovementDelta([image], pt(999, 0), frame(0, 0, 240, 160), visibleFrames);

    expect(result.x).toBe(40);
  });

  test("可见框带 basis 时按 basis 缩放到元素尺寸", () => {
    const image = { id: "e1", kind: "image", x: 100, y: 100, width: 20, height: 20, imageHref: "a.png", cropX: 5 };
    const key = "e1:a.png:cover:1:5:0";
    // 原始 200×100，元素只有 20×20 → 缩放 0.1 → 选区回到 [100,120] → 最多右移 120
    const visibleFrames = { image: { [key]: { x: 0, y: 0, width: 200, height: 100, basisWidth: 200, basisHeight: 100 } } };

    expect(clampStateIconDrawingMovementDelta([image], pt(999, 0), frame(0, 0, 240, 160), visibleFrames).x).toBe(120);
  });

  test("可见框宽高为 0 时退回自身尺寸兜底", () => {
    const image = { id: "e1", kind: "image", x: 100, y: 100, width: 20, height: 20, imageHref: "a.png" };
    const key = "e1:a.png:cover:1:0:0";
    const visibleFrames = { image: { [key]: { x: 0, y: 0, width: 0, height: 0 } } };

    expect(clampStateIconDrawingMovementDelta([image], pt(999, 0), frame(0, 0, 240, 160), visibleFrames).x).toBe(130);
  });

  test("未提供 visibleFrames 时不抛", () => {
    const image = { id: "e1", kind: "image", x: 100, y: 100, width: 20, height: 20 };

    expect(() => clampStateIconDrawingMovementDelta([image], pt(1, 1), frame(0, 0, 240, 160))).not.toThrow();
  });

  test("普通折线元素不查可见框", () => {
    const spy = vi.fn(() => []);
    const polyline = { id: "e1", kind: "polyline", x: 100, y: 100, width: 20, height: 20, rotation: 0 };

    expect(clampStateIconDrawingMovementDelta([polyline], pt(1, 1), frame(0, 0, 240, 160), { image: spy, svg: spy }).x).toBe(1);
  });
});
