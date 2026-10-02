// 智能对齐的拖拽作用域：被拖节点按「移动后的位置」参与对齐，而不是当前位置。
// 两条都要盖：包围盒（决定对齐参考线）与端子出线锚点（决定吸附点）。
import { describe, expect, test, vi } from "vitest";

import {
  createDragBoundsForSmartAlignment,
  createTerminalOutflowAnchorsForSmartAlignmentDrag
} from "./appExtracted/appCanvasInteractionFactories";

const pt = (x: number, y: number) => ({ x, y });

describe("createDragBoundsForSmartAlignment", () => {
  function createScope(): any {
    return {
      nodeById: new Map([
        ["n1", { id: "n1" }],
        ["n2", { id: "n2" }]
      ]),
      nodeHasUprightBoundsContent: vi.fn(() => true),
      nodeSmartAlignmentBounds: vi.fn((node: any, position: any, upright: boolean) => ({
        left: position.x,
        top: position.y,
        right: position.x + 10,
        bottom: position.y + 10,
        nodeId: node.id,
        upright
      })),
      mergeRenderViewportBounds: vi.fn((a: any, b: any) => ({
        left: Math.min(a.left, b.left),
        top: Math.min(a.top, b.top),
        right: Math.max(a.right, b.right),
        bottom: Math.max(a.bottom, b.bottom)
      }))
    };
  }

  test("按移动后的位置算包围盒", () => {
    const scope = createScope();

    const bounds = createDragBoundsForSmartAlignment(scope)({ nodeIds: ["n1"], originalPositions: { n1: pt(100, 100) } } as any, pt(30, 40));

    expect(bounds).toMatchObject({ left: 130, top: 140, right: 140, bottom: 150 });
  });

  test("多节点时逐个合并", () => {
    const scope = createScope();

    const bounds = createDragBoundsForSmartAlignment(scope)(
      { nodeIds: ["n1", "n2"], originalPositions: { n1: pt(0, 0), n2: pt(100, 0) } } as any,
      pt(0, 0)
    );

    expect(bounds).toMatchObject({ left: 0, right: 110 });
    expect(scope.mergeRenderViewportBounds).toHaveBeenCalledTimes(1);
  });

  test("节点查不到时跳过", () => {
    const scope = createScope();

    expect(createDragBoundsForSmartAlignment(scope)({ nodeIds: ["查无此节点"], originalPositions: {} } as any, pt(1, 1))).toBeNull();
  });

  test("没有原始位置时跳过", () => {
    const scope = createScope();

    expect(createDragBoundsForSmartAlignment(scope)({ nodeIds: ["n1"], originalPositions: {} } as any, pt(1, 1))).toBeNull();
  });

  test("没有可参与节点时返回 null", () => {
    expect(createDragBoundsForSmartAlignment(createScope())({ nodeIds: [], originalPositions: {} } as any, pt(1, 1))).toBeNull();
  });

  test("把「是否有直立内容」交给包围盒计算", () => {
    const scope = createScope();
    scope.nodeHasUprightBoundsContent = vi.fn(() => false);

    const bounds = createDragBoundsForSmartAlignment(scope)({ nodeIds: ["n1"], originalPositions: { n1: pt(0, 0) } } as any, pt(1, 1));

    expect((bounds as any).upright).toBe(false);
  });
});

describe("createTerminalOutflowAnchorsForSmartAlignmentDrag", () => {
  function createScope(): any {
    return {
      nodeById: new Map([
        ["n1", { id: "n1" }],
        ["n2", { id: "n2" }]
      ]),
      emptySmartAlignmentAnchorMap: vi.fn(() => ({ x: [] as any[], y: [] as any[] })),
      nodeTerminalOutflowSmartAlignmentAnchors: vi.fn((node: any, position: any) => ({ x: [{ x: position.x, node: node.id }], y: [] }))
    };
  }

  test("按移动后的位置收集端子出线锚点", () => {
    const scope = createScope();

    const anchors = createTerminalOutflowAnchorsForSmartAlignmentDrag(scope)(
      { nodeIds: ["n1"], originalPositions: { n1: pt(0, 0) } } as any,
      pt(50, 0)
    );

    expect(anchors.x).toEqual([{ x: 50, node: "n1" }]);
  });

  test("多节点的锚点合并到同一张表", () => {
    const scope = createScope();

    const anchors = createTerminalOutflowAnchorsForSmartAlignmentDrag(scope)(
      { nodeIds: ["n1", "n2"], originalPositions: { n1: pt(0, 0), n2: pt(0, 0) } } as any,
      pt(0, 0)
    );

    expect(anchors.x).toHaveLength(2);
  });

  test("y 方向锚点也一并收集", () => {
    const scope = createScope();
    scope.nodeTerminalOutflowSmartAlignmentAnchors = vi.fn(() => ({ x: [], y: [{ y: 1 }] }));

    expect(
      createTerminalOutflowAnchorsForSmartAlignmentDrag(scope)({ nodeIds: ["n1"], originalPositions: { n1: pt(0, 0) } } as any, pt(0, 0)).y
    ).toEqual([{ y: 1 }]);
  });

  test("节点或原始位置缺失时跳过", () => {
    const scope = createScope();

    const anchors = createTerminalOutflowAnchorsForSmartAlignmentDrag(scope)(
      { nodeIds: ["查无此节点", "n1"], originalPositions: { n1: pt(0, 0) } } as any,
      pt(0, 0)
    );

    expect(anchors.x).toHaveLength(1);
  });

  test("没有可参与节点时返回空锚点表", () => {
    const scope = createScope();

    const anchors = createTerminalOutflowAnchorsForSmartAlignmentDrag(scope)({ nodeIds: [], originalPositions: {} } as any, pt(0, 0));

    expect(anchors).toEqual({ x: [], y: [] });
  });
});
