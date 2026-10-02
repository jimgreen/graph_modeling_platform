// createIsWholeActiveLayerMove：判断这次移动是否覆盖了活动图层的全部可移动节点。
// 「可移动」是前提 —— 活动层里若有不可移动节点（如母线）被落下，就不算整层移动。
import { describe, expect, test, vi } from "vitest";

import { createIsWholeActiveLayerMove } from "./appExtracted/appSelectionDragFactories";

function createScope(activeLayerNodes: any[], immovableKinds: string[] = ["ac-bus"]) {
  return {
    activeLayerNodes,
    isCanvasNodeMovable: vi.fn((kind: string) => !immovableKinds.includes(kind))
  };
}

describe("createIsWholeActiveLayerMove", () => {
  test("覆盖全部可移动节点时为真", () => {
    const scope = createScope([{ id: "n1", kind: "ac-load" }, { id: "n2", kind: "ac-line" }]);

    expect(createIsWholeActiveLayerMove(scope)(["n1", "n2"])).toBe(true);
  });

  test("只动了一部分为假", () => {
    const scope = createScope([{ id: "n1", kind: "ac-load" }, { id: "n2", kind: "ac-load" }]);

    expect(createIsWholeActiveLayerMove(scope)(["n1"])).toBe(false);
  });

  test("多选了图层外的节点时为假", () => {
    const scope = createScope([{ id: "n1", kind: "ac-load" }]);

    expect(createIsWholeActiveLayerMove(scope)(["n1", "别层节点"])).toBe(false);
  });

  test("没选任何节点为假", () => {
    expect(createIsWholeActiveLayerMove(createScope([{ id: "n1", kind: "ac-load" }]))([])).toBe(false);
  });

  test("活动层为空时为假", () => {
    expect(createIsWholeActiveLayerMove(createScope([]))(["n1"])).toBe(false);
  });

  test("活动层全不可移动时为假", () => {
    const scope = createScope([{ id: "b1", kind: "ac-bus" }]);

    expect(createIsWholeActiveLayerMove(scope)(["b1"])).toBe(false);
  });

  test("不可移动节点被落下但可移动节点全被选中时，仍算整层移动", () => {
    const scope = createScope([{ id: "b1", kind: "ac-bus" }, { id: "n1", kind: "ac-load" }]);

    // 母线不参与计数，选中 n1 即覆盖全部可移动节点
    expect(createIsWholeActiveLayerMove(scope)(["n1"])).toBe(true);
  });

  test("活动层全是可移动节点且全部被选中时为真", () => {
    const scope = createScope([{ id: "n1", kind: "ac-load" }]);

    expect(createIsWholeActiveLayerMove(scope)(["n1"])).toBe(true);
  });

  test("重复 id 不影响判定（按集合去重）", () => {
    const scope = createScope([{ id: "n1", kind: "ac-load" }]);

    expect(createIsWholeActiveLayerMove(scope)(["n1", "n1"])).toBe(true);
  });
});
