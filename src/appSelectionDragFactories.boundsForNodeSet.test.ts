// createBoundsForNodeSet：被移动节点集合的视觉包围盒。
// 两个易错点：① 显式传入 positions 时用传入位置（拖拽预览用），否则用节点当前位置；
// ② padding 逐个透传给单节点包围盒计算，别在合并之后再加（会重复计入）。
import { describe, expect, test, vi } from "vitest";

import { createBoundsForNodeSet } from "./appExtracted/appSelectionDragFactories";

const pt = (x: number, y: number) => ({ x, y });

function createScope() {
  return {
    nodeVisualInteractionBounds: vi.fn((node: any, position: any, padding: number) => ({
      left: position.x - 10 - padding,
      right: position.x + 10 + padding,
      top: position.y - 5 - padding,
      bottom: position.y + 5 + padding,
      id: node.id
    })),
    orderedNodesForIds: vi.fn((_nodes: any, ids: Iterable<string>) => [...ids].map((id) => ({ id })))
  };
}

describe("createBoundsForNodeSet", () => {
  test("单节点直接返回它的包围盒", () => {
    const scope = createScope();

    expect(createBoundsForNodeSet(scope)([], new Set(["n1"]), { n1: pt(100, 100) })).toMatchObject({
      left: 90,
      right: 110,
      top: 95,
      bottom: 105
    });
  });

  test("多节点取并集", () => {
    const scope = createScope();

    const bounds = createBoundsForNodeSet(scope)([], new Set(["n1", "n2"]), { n1: pt(0, 0), n2: pt(100, 100) });

    expect(bounds).toMatchObject({ left: -10, right: 110, top: -5, bottom: 105 });
  });

  test("没有 positions 时用节点自身位置", () => {
    const scope = createScope();
    const node = { id: "n1", position: pt(50, 50) };
    scope.orderedNodesForIds = vi.fn(() => [node]);

    createBoundsForNodeSet(scope)([], new Set(["n1"]));

    expect(scope.nodeVisualInteractionBounds.mock.calls[0][1]).toBe(node.position);
  });

  test("positions 里有该节点时优先用传入位置", () => {
    const scope = createScope();
    const node = { id: "n1", position: pt(50, 50) };
    scope.orderedNodesForIds = vi.fn(() => [node]);

    createBoundsForNodeSet(scope)([], new Set(["n1"]), { n1: pt(500, 500) });

    expect(scope.nodeVisualInteractionBounds.mock.calls[0][1]).toEqual(pt(500, 500));
  });

  test("padding 逐个透传", () => {
    const scope = createScope();

    createBoundsForNodeSet(scope)([], new Set(["n1"]), { n1: pt(0, 0) }, 8);

    expect(scope.nodeVisualInteractionBounds.mock.calls[0][2]).toBe(8);
  });

  test("默认 padding 为 0", () => {
    const scope = createScope();

    createBoundsForNodeSet(scope)([], new Set(["n1"]), { n1: pt(0, 0) });

    expect(scope.nodeVisualInteractionBounds.mock.calls[0][2]).toBe(0);
  });

  test("没有可参与节点时返回 null", () => {
    expect(createBoundsForNodeSet(createScope())([], new Set())).toBeNull();
  });

  test("第一个节点的包围盒被原样采用（不再包一层对象）", () => {
    const scope = createScope();

    expect(createBoundsForNodeSet(scope)([], new Set(["n1"]), { n1: pt(0, 0) })).toHaveProperty("id", "n1");
  });
});
