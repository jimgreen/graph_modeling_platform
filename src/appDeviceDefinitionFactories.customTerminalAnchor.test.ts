// 自定义元件端子锚点：吸附到最近的标准方位、绘制连接线段、写回草稿。
// 关键差异（与元件定义那条对照）：连接线段的「起点」要向本体内部回缩 bodyReach，
// 而定义那条直接从边界出发 —— 两条不能混用同一个函数。
import { describe, expect, test, vi } from "vitest";

import {
  createCustomDeviceTerminalConnectorSegment,
  createSnapCustomDeviceTerminalAnchor,
  createUpdateCustomDeviceTerminalAnchor,
  createUpdateCustomDeviceTerminalAnchorFromPreview
} from "./appExtracted/appDeviceDefinitionFactories";

const pt = (x: number, y: number) => ({ x, y });
const GUIDES = [-1, -0.5, 0, 0.5, 1];

function createScope(over: Record<string, any> = {}) {
  return {
    CUSTOM_DEVICE_TERMINAL_ANCHOR_GUIDE_VALUES: GUIDES,
    CUSTOM_DEVICE_TERMINAL_ANCHOR_SNAP_SCREEN_TOLERANCE: 20,
    customDevicePreviewWidth: 200,
    customDevicePreviewHeight: 100,
    // 锚点是 -1..1 的相对坐标；这里原样返回（投影已在别处单测）
    projectCustomDeviceTerminalAnchorToBoundary: vi.fn((p: any) => p),
    customDeviceTerminalAnchorValue: vi.fn((v: number) => v),
    createDefaultCustomDeviceTerminalAnchors: vi.fn((count: number, existing: any[] = []) =>
      Array.from({ length: count }, (_, i) => existing[i] ?? pt(0, 0))
    ),
    hasOverlappingCustomDeviceTerminalAnchors: vi.fn(() => false),
    snapCustomDeviceTerminalAnchor: vi.fn((p: any) => p),
    updateCustomDeviceTerminalAnchor: vi.fn(),
    ...over
  };
}

describe("createSnapCustomDeviceTerminalAnchor", () => {
  test("x 主导时只吸附 y", () => {
    const scope = createScope();

    // 预览高 100，屏幕容差 20 → y 轴容差 0.2；y=0.1 吸附到 0
    expect(createSnapCustomDeviceTerminalAnchor(scope)(pt(-1, 0.1))).toEqual(pt(-1, 0));
  });

  test("x 主导时 x 保持原值", () => {
    expect(createSnapCustomDeviceTerminalAnchor(createScope())(pt(-1, 0.9))).toEqual(pt(-1, 1));
  });

  test("y 主导时只吸附 x", () => {
    // 预览宽 200 → x 轴容差 0.1；x=0.08 吸附到 0
    expect(createSnapCustomDeviceTerminalAnchor(createScope())(pt(0.08, 1))).toEqual(pt(0, 1));
  });

  test("y 主导时 y 保持原值", () => {
    expect(createSnapCustomDeviceTerminalAnchor(createScope())(pt(0.9, 1))).toEqual(pt(1, 1));
  });

  test("落在导向值之间（0.2 与 0.3 之间）时保持原值", () => {
    // 导向值 ±0.2 覆盖 [-1.2,-0.8] / [-0.7,-0.3] / [-0.2,0.2] / [0.3,0.7] / [0.8,1.2]
    expect(createSnapCustomDeviceTerminalAnchor(createScope())(pt(-1, 0.25))).toEqual(pt(-1, 0.25));
  });

  test("刚好等于容差时仍吸附（<= 而非 <）", () => {
    // 容差 0.2；y=0.7 距导向值 0.5 恰好 0.2
    expect(createSnapCustomDeviceTerminalAnchor(createScope())(pt(-1, 0.7))).toEqual(pt(-1, 0.5));
  });

  test("|x| === |y| 时按 x 主导处理", () => {
    expect(createSnapCustomDeviceTerminalAnchor(createScope())(pt(0.5, 0.5))).toEqual(pt(0.5, 0.5));
  });

  test("锚点先经投影再吸附", () => {
    const scope = createScope();

    createSnapCustomDeviceTerminalAnchor(scope)(pt(0.3, 0.3));

    expect(scope.projectCustomDeviceTerminalAnchorToBoundary).toHaveBeenCalledWith(pt(0.3, 0.3));
  });

  test("吸附命中后仍过一次归一", () => {
    const scope = createScope();
    scope.customDeviceTerminalAnchorValue = vi.fn((v: number) => v);

    createSnapCustomDeviceTerminalAnchor(scope)(pt(-1, 0.1));

    // 原值 0.1 归一一次，命中导向值 0 再归一一次
    expect(scope.customDeviceTerminalAnchorValue).toHaveBeenCalledTimes(2);
  });
});

describe("createCustomDeviceTerminalConnectorSegment", () => {
  const W = 200;
  const H = 100;

  test("x 主导时线段沿 x 轴，起点向本体内部回缩 2.6/6 宽", () => {
    const scope = createScope();

    expect(createCustomDeviceTerminalConnectorSegment(scope)(pt(-1, 0))).toEqual({
      from: { x: -W + (W / 6) * 2.6, y: 0 },
      to: { x: -W - W / 6, y: 0 }
    });
  });

  test("y 主导时线段沿 y 轴", () => {
    const scope = createScope();

    expect(createCustomDeviceTerminalConnectorSegment(scope)(pt(0, 1))).toEqual({
      from: { x: 0, y: H - (H / 6) * 2.6 },
      to: { x: 0, y: H + H / 6 }
    });
  });

  test("锚点为 0 时方向按 +1 处理（Math.sign(0) 为 0，用 || 兜底）", () => {
    const scope = createScope();

    expect(createCustomDeviceTerminalConnectorSegment(scope)(pt(0, 0))).toEqual({
      from: { x: -(W / 6) * 2.6, y: 0 },
      to: { x: W / 6, y: 0 }
    });
  });

  test("负向锚点向外方向为负", () => {
    const scope = createScope();

    expect(createCustomDeviceTerminalConnectorSegment(scope)(pt(1, 0)).to.x).toBe(W + W / 6);
  });
});

describe("createUpdateCustomDeviceTerminalAnchor", () => {
  function scopeWith(over: Record<string, any> = {}) {
    const setCustomDeviceDraft = vi.fn();
    const scope: Record<string, any> = {
      setCustomDeviceDraft,
      projectCustomDeviceTerminalAnchorToBoundary: vi.fn((p: any) => p),
      customDeviceTerminalAnchorValue: vi.fn((v: number) => v),
      createDefaultCustomDeviceTerminalAnchors: vi.fn((count: number, existing: any[] = []) =>
        Array.from({ length: count }, (_, i) => existing[i] ?? pt(0, 0))
      ),
      hasOverlappingCustomDeviceTerminalAnchors: vi.fn(() => false),
      ...over
    };
    scope.updateCustomDeviceTerminalAnchor = createUpdateCustomDeviceTerminalAnchor(scope);
    return { scope, setCustomDeviceDraft };
  }

  const draft = { terminalCount: 2, terminalAnchors: [pt(0, 0), pt(1, 1)], error: "旧错误" };

  test("写回指定序号的锚点并清空错误", () => {
    const h = scopeWith();

    h.scope.updateCustomDeviceTerminalAnchor(1, { x: 0.5, y: 0.5 });

    const next = h.setCustomDeviceDraft.mock.calls[0][0](draft);
    expect(next.terminalAnchors[1]).toEqual(pt(0.5, 0.5));
    expect(next.error).toBe("");
  });

  test("patch 缺字段时沿用原锚点", () => {
    const h = scopeWith();

    h.scope.updateCustomDeviceTerminalAnchor(0, { x: 0.25 });

    expect(h.setCustomDeviceDraft.mock.calls[0][0](draft).terminalAnchors[0]).toEqual(pt(0.25, 0));
  });

  test("序号越界时返回原草稿", () => {
    const h = scopeWith();

    h.scope.updateCustomDeviceTerminalAnchor(5, { x: 0 });

    expect(h.setCustomDeviceDraft.mock.calls[0][0](draft)).toBe(draft);
  });

  test("负序号同样越界", () => {
    const h = scopeWith();

    h.scope.updateCustomDeviceTerminalAnchor(-1, { x: 0 });

    expect(h.setCustomDeviceDraft.mock.calls[0][0](draft)).toBe(draft);
  });

  test("与其他端子重叠时只写错误、不改锚点", () => {
    const h = scopeWith({ hasOverlappingCustomDeviceTerminalAnchors: vi.fn(() => true) });

    h.scope.updateCustomDeviceTerminalAnchor(0, { x: 0 });
    const next = h.setCustomDeviceDraft.mock.calls[0][0](draft);

    // 早返回：terminalAnchors 仍是草稿里那一份，没有被补齐后的新数组替换
    expect(next.terminalAnchors).toBe(draft.terminalAnchors);
    expect(next.error).toBe("端子1位置不能与其他端子重叠。");
  });

  test("重叠提示里的序号从 1 开始", () => {
    const h = scopeWith({ hasOverlappingCustomDeviceTerminalAnchors: vi.fn(() => true) });

    h.scope.updateCustomDeviceTerminalAnchor(2, { x: 0 });

    expect(h.setCustomDeviceDraft.mock.calls[0][0]({ ...draft, terminalCount: 3 }).error).toBe("端子3位置不能与其他端子重叠。");
  });

  test("锚点写入前先过投影", () => {
    const h = scopeWith();

    h.scope.updateCustomDeviceTerminalAnchor(0, { x: 0.3, y: 0.3 });
    h.setCustomDeviceDraft.mock.calls[0][0](draft);

    expect(h.scope.projectCustomDeviceTerminalAnchorToBoundary).toHaveBeenCalledWith(pt(0.3, 0.3));
  });

  test("锚点数组按 terminalCount 补齐", () => {
    const h = scopeWith();

    h.scope.updateCustomDeviceTerminalAnchor(0, { x: 0.5 });
    h.setCustomDeviceDraft.mock.calls[0][0](draft);

    expect(h.scope.createDefaultCustomDeviceTerminalAnchors).toHaveBeenCalledWith(2, draft.terminalAnchors);
  });
});

describe("createUpdateCustomDeviceTerminalAnchorFromPreview", () => {
  const scope = createScope();

  const svgStub = (matrix: any, point: any) =>
    ({
      getScreenCTM: () => matrix,
      createSVGPoint: () => point
    }) as any;

  test("没有屏幕 CTM 时直接返回，不写草稿", () => {
    const update = createUpdateCustomDeviceTerminalAnchorFromPreview(scope);

    update(0, svgStub(null, { x: 0, y: 0, matrixTransform: vi.fn() }), { clientX: 1, clientY: 1 } as any);

    expect(scope.updateCustomDeviceTerminalAnchor).not.toHaveBeenCalled();
  });

  test("屏幕坐标经 CTM 逆变换后除以预览尺寸得到锚点", () => {
    const transformed = pt(50, 25);
    const svg = svgStub({ inverse: () => "逆矩阵" }, { x: 0, y: 0, matrixTransform: vi.fn(() => transformed) });
    const update = createUpdateCustomDeviceTerminalAnchorFromPreview(scope);

    update(1, svg, { clientX: 10, clientY: 20 } as any);

    expect(svg.createSVGPoint().matrixTransform).toHaveBeenCalledWith("逆矩阵");
    expect(scope.snapCustomDeviceTerminalAnchor).toHaveBeenCalledWith({ x: 50 / 200, y: 25 / 100 });
  });

  test("吸附结果连同序号写回草稿", () => {
    const snapped = pt(0.5, 0.5);
    const svg = svgStub({ inverse: () => ({}) }, { x: 0, y: 0, matrixTransform: () => pt(0, 0) });
    scope.snapCustomDeviceTerminalAnchor = vi.fn(() => snapped);
    const update = createUpdateCustomDeviceTerminalAnchorFromPreview(scope);

    update(2, svg, { clientX: 0, clientY: 0 } as any);

    expect(scope.updateCustomDeviceTerminalAnchor).toHaveBeenCalledWith(2, snapped);
  });

  test("指针坐标先写进 SVG 点再变换", () => {
    const point = { x: 0, y: 0, matrixTransform: () => pt(0, 0) };
    const svg = svgStub({ inverse: () => ({}) }, point);
    const update = createUpdateCustomDeviceTerminalAnchorFromPreview(scope);

    update(0, svg, { clientX: 33, clientY: 44 } as any);

    expect(point.x).toBe(33);
    expect(point.y).toBe(44);
  });
});
