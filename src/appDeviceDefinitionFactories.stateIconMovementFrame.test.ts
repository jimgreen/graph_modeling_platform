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
  const baseScope = {
    definitionVisualDraft: { terminalCount: 3 },
    customDeviceDraft: { terminalCount: 2 },
    definitionVisualTerminalTypes: ["a", "b", "c"],
    customDraftTerminalTypes: ["x", "y"]
  };

  test("定义页签用定义草稿的端子数", () => {
    const result = stateIconDrawingMovementFrameForDialog(baseScope as any, { target: { scope: "definition" } });

    expect(result).toEqual({ x: 0, y: 0, width: 240, height: 160 });
  });

  test("自定义元件页签用自定义草稿的端子数", () => {
    stateIconDrawingMovementFrameForDialog(baseScope as any, { target: { scope: "custom" } });
  });

  test("没有 target 时按「没有框」处理", () => {
    expect(stateIconDrawingMovementFrameForDialog(baseScope as any, null)).toEqual({ x: 0, y: 0, width: 240, height: 160 });
  });

  test("scope 缺失时不启用框（即使端子数大于 0）", () => {
    expect(stateIconDrawingMovementFrameForDialog(baseScope as any, { target: {} })).toEqual({ x: 0, y: 0, width: 240, height: 160 });
  });

  test("端子数为 0 时不启用框", () => {
    const scope = { ...baseScope, definitionVisualDraft: { terminalCount: 0 } };

    expect(stateIconDrawingMovementFrameForDialog(scope as any, { target: { scope: "definition" } })).toEqual({ x: 0, y: 0, width: 240, 160 } as any);
  });

  test("草稿缺 terminalCount 时回落到端子类型数组长度", () => {
    const scope = { ...baseScope, definitionVisualDraft: {} };

    expect(stateIconDrawingMovementFrameForDialog(scope as any, { target: { scope: "definition" } })).toHaveProperty("width", 240);
  });
});

describe("stateIconDrawingMovementVisibleFrames", () => {
  test("两个来源各取各的", () => {
    const scope = {
      stateIconDrawingImageVisibleFrames: { i1: { x: 0, y: 0, width: 10, height: 10 } },
      stateIconDrawingSvgVisibleFrames: { s1: { x: 0, y: 0, width: 20, height: 20 } }
    };

    expect(stateIconDrawingMovementVisibleFrames(scope as any)).toEqual(scope);
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
    const visibleFrames = { image: { [key]: { x: 0, y: 0, width: 100, basisWidth: 100, basisHeight: 100 } } };

    // 命中缓存后选区变成 [100,200] → 最多右移 40
    const result = clampStateIconDrawingMovementDelta([image], pt(999, 0), frame(0, 0, 240, 160), visibleFrames);

    expect(result.x).toBe(40);
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
