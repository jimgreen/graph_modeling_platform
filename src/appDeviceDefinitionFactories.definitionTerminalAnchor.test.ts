// 元件定义端子锚点：与自定义元件那条同构，但用的是 definitionVisual* 预览尺寸，
// 且连接线段「起点」不从边界回缩（from 直接是边界点）。
// 这两条差异正是最容易在合并两条实现时被抹平的，故单独立一组对照用例。
import { describe, expect, test, vi } from "vitest";

import {
  createDefinitionTerminalConnectorSegment,
  createSnapDefinitionTerminalAnchor,
  createUpdateDefinitionTerminalAnchor
} from "./appExtracted/appDeviceDefinitionFactories";

const pt = (x: number, y: number) => ({ x, y });
const GUIDES = [-1, -0.5, 0, 0.5, 1];

function createScope(over: Record<string, any> = {}) {
  return {
    CUSTOM_DEVICE_TERMINAL_ANCHOR_GUIDE_VALUES: GUIDES,
    CUSTOM_DEVICE_TERMINAL_ANCHOR_SNAP_SCREEN_TOLERANCE: 20,
    definitionVisualPreviewWidth: 200,
    definitionVisualPreviewHeight: 100,
    projectCustomDeviceTerminalAnchorToBoundary: vi.fn((p: any) => p),
    customDeviceTerminalAnchorValue: vi.fn((v: number) => v),
    createDefaultCustomDeviceTerminalAnchors: vi.fn((count: number, existing: any[] = []) =>
      Array.from({ length: count }, (_, i) => existing[i] ?? pt(0, 0))
    ),
    hasOverlappingCustomDeviceTerminalAnchors: vi.fn(() => false),
    setDefinitionVisualDraft: vi.fn(),
    ...over
  };
}

describe("createSnapDefinitionTerminalAnchor", () => {
  test("x 主导时只吸附 y", () => {
    // 预览高 100，屏幕容差 20 → 容差 0.2
    expect(createSnapDefinitionTerminalAnchor(createScope())(pt(-1, 0.1))).toEqual(pt(-1, 0));
  });

  test("y 主导时只吸附 x", () => {
    // 预览宽 200 → 容差 0.1
    expect(createSnapDefinitionTerminalAnchor(createScope())(pt(0.08, 1))).toEqual(pt(0, 1));
  });

  test("超出容差时保持归一后的原值", () => {
    expect(createSnapDefinitionTerminalAnchor(createScope())(pt(0, 0.7))).toEqual(pt(0, 0.7));
  });

  test("|x| === |y| 时按 x 主导", () => {
    expect(createSnapDefinitionTerminalAnchor(createScope())(pt(0.5, 0.5))).toEqual(pt(0.5, 0.5));
  });

  test("用的是定义预览尺寸（与自定义元件那条的容差不同源）", () => {
    const scope = createScope();
    scope.definitionVisualPreviewHeight = 400;

    // 容差变成 20/400 = 0.05 → 0.1 不再吸附
    expect(createSnapDefinitionTerminalAnchor(scope)(pt(-1, 0.1))).toEqual(pt(-1, 0.1));
  });

  test("锚点先经投影", () => {
    const scope = createScope();

    createSnapDefinitionTerminalAnchor(scope)(pt(0.3, 0.3));

    expect(scope.projectCustomDeviceTerminalAnchorToBoundary).toHaveBeenCalledWith(pt(0.3, 0.3));
  });
});

describe("createDefinitionTerminalConnectorSegment", () => {
  const W = 200;
  const H = 100;

  test("x 主导时 from 就是边界点（不回缩），to 向外 1/6 宽", () => {
    expect(createDefinitionTerminalConnectorSegment(createScope())(pt(-1, 0))).toEqual({
      from: { x: -W, y: 0 },
      to: { x: -W - W / 6, y: 0 }
    });
  });

  test("y 主导时 from 是边界点，to 向外 1/6 高", () => {
    expect(createDefinitionTerminalConnectorSegment(createScope())(pt(0, 1))).toEqual({
      from: { x: 0, y: H },
      to: { x: 0, y: H + H / 6 }
    });
  });

  test("锚点为 0 时方向按 +1 处理", () => {
    expect(createDefinitionTerminalConnectorSegment(createScope())(pt(0, 0))).toEqual({
      from: { x: 0, y: 0 },
      to: { x: W / 6, y: 0 }
    });
  });

  test("与自定义元件那条不同：起点不回缩到本体内部", () => {
    // 自定义元件那条的 from 要向内 2.6/6 宽（见 customTerminalAnchor.test.ts），定义这条直接取边界点
    const definition = createDefinitionTerminalConnectorSegment(createScope())(pt(-1, 0));

    expect(definition.from.x).toBe(-W);
  });
});

describe("createUpdateDefinitionTerminalAnchor", () => {
  const draft = { terminalCount: 2, terminalAnchors: [pt(0, 0), pt(1, 1)], error: "旧错误" };

  test("写回锚点并清空错误", () => {
    const scope = createScope();

    createUpdateDefinitionTerminalAnchor(scope)(1, { x: 0.5, y: 0.5 });

    const next = scope.setDefinitionVisualDraft.mock.calls[0][0](draft);
    expect(next.terminalAnchors[1]).toEqual(pt(0.5, 0.5));
    expect(next.error).toBe("");
  });

  test("草稿本身不存在时返回它（不改）", () => {
    const scope = createScope();

    createUpdateDefinitionTerminalAnchor(scope)(0, { x: 0 });

    expect(scope.setDefinitionVisualDraft.mock.calls[0][0](null)).toBeNull();
  });

  test("序号越界时返回原草稿", () => {
    const scope = createScope();

    createUpdateDefinitionTerminalAnchor(scope)(9, { x: 0 });

    expect(scope.setDefinitionVisualDraft.mock.calls[0][0](draft)).toBe(draft);
  });

  test("锚点重叠时只写错误", () => {
    const scope = createScope({ hasOverlappingCustomDeviceTerminalAnchors: vi.fn(() => true) });

    createUpdateDefinitionTerminalAnchor(scope)(0, { x: 0 });
    const next = scope.setDefinitionVisualDraft.mock.calls[0][0](draft);

    // 早返回：锚点数组仍是草稿里那一份
    expect(next.terminalAnchors).toBe(draft.terminalAnchors);
    expect(next.error).toBe("端子1位置不能与其他端子重叠。");
  });

  test("重叠提示序号从 1 开始", () => {
    const scope = createScope({ hasOverlappingCustomDeviceTerminalAnchors: vi.fn(() => true) });

    createUpdateDefinitionTerminalAnchor(scope)(1, { x: 0 });

    expect(scope.setDefinitionVisualDraft.mock.calls[0][0](draft).error).toBe("端子2位置不能与其他端子重叠。");
  });

  test("patch 缺字段时沿用原锚点", () => {
    const scope = createScope();

    createUpdateDefinitionTerminalAnchor(scope)(0, { y: 0.5 });

    expect(scope.setDefinitionVisualDraft.mock.calls[0][0](draft).terminalAnchors[0]).toEqual(pt(0, 0.5));
  });
});
