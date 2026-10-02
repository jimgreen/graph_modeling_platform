// 移动时的连线分类：内部边（两端都动）与外部边（只动一端）走完全不同的重算路径。
// 关键：内部边是「整条平移」，外部边要「重算路由」——混了就会出现连线被拉长。
import { describe, expect, test, vi } from "vitest";

import {
  createExternalMoveCandidateEdges,
  createInternalMoveCandidateEdges,
  createInternalMoveEdgeIdsForMovedNodes,
  createTranslateInternalMoveCandidateEdges,
  createTranslateWholeMoveCandidateEdges
} from "./appExtracted/appSelectionDragFactories";

const edge = (id: string, sourceId: string, targetId: string) => ({ id, sourceId, targetId });
const pt = (x: number, y: number) => ({ x, y });

function createScope(over: Record<string, any> = {}) {
  return {
    reuseSetOrCreate: (value: Iterable<string>) => (value instanceof Set ? value : new Set(value)),
    hasCanvasOriginShift: (delta: any) => delta.x !== 0 || delta.y !== 0,
    translateStoredEdgeGeometryBy: vi.fn((e: any, delta: any) => ({ ...e, moved: true, delta })),
    ...over
  };
}

const CANDIDATES = [edge("e1", "n1", "n2"), edge("e2", "n2", "n3"), edge("e3", "n1", "n3")];

describe("createInternalMoveEdgeIdsForMovedNodes", () => {
  const build = createScope();

  test("只收两端都在移动集合里的边", () => {
    const ids = createInternalMoveEdgeIdsForMovedNodes(build)(CANDIDATES, ["n1", "n2"]);

    expect([...ids]).toEqual(["e1"]);
  });

  test("没有移动节点时返回空集合", () => {
    expect(createInternalMoveEdgeIdsForMovedNodes(build)(CANDIDATES, []).size).toBe(0);
  });

  test("没有候选边时返回空集合", () => {
    expect(createInternalMoveEdgeIdsForMovedNodes(build)([], ["n1"]).size).toBe(0);
  });

  test("接受 Set 形式的移动集合", () => {
    expect([...createInternalMoveEdgeIdsForMovedNodes(build)(CANDIDATES, new Set(["n2", "n3"]))]).toEqual(["e2"]);
  });
});

describe("外部 / 内部候选边切分", () => {
  test("外部边 = 候选边去掉内部边", () => {
    const scope = createScope();

    expect(createExternalMoveCandidateEdges(scope)(CANDIDATES, ["e1"]).map((e) => e.id)).toEqual(["e2", "e3"]);
  });

  test("没有内部边时外部边就是全部候选", () => {
    expect(createExternalMoveCandidateEdges(createScope())(CANDIDATES, []).map((e) => e.id)).toEqual(["e1", "e2", "e3"]);
  });

  test("内部候选只含被标为内部的边", () => {
    expect(createInternalMoveCandidateEdges(createScope())(CANDIDATES, ["e1"]).map((e) => e.id)).toEqual(["e1"]);
  });

  test("没有内部边时内部候选为空（不是全部）", () => {
    expect(createInternalMoveCandidateEdges(createScope())(CANDIDATES, [])).toEqual([]);
  });

  test("两批合起来正好是候选全集", () => {
    const scope = createScope();
    const internal = ["e1"];

    const all = [...createInternalMoveCandidateEdges(scope)(CANDIDATES, internal), ...createExternalMoveCandidateEdges(scope)(CANDIDATES, internal)];

    expect(all.map((e) => e.id).sort()).toEqual(["e1", "e2", "e3"]);
  });
});

describe("createTranslateInternalMoveCandidateEdges", () => {
  test("只平移内部边", () => {
    const scope = createScope();

    const next = createTranslateInternalMoveCandidateEdges(scope)(CANDIDATES, ["e1"], pt(5, 0));

    expect(next[0]).toMatchObject({ id: "e1", moved: true });
    expect(next[1]).toBe(CANDIDATES[1]);
  });

  test("零位移时原样返回同一个数组", () => {
    const scope = createScope();

    expect(createTranslateInternalMoveCandidateEdges(scope)(CANDIDATES, ["e1"], pt(0, 0))).toBe(CANDIDATES);
  });

  test("没有内部边时原样返回", () => {
    const scope = createScope();

    expect(createTranslateInternalMoveCandidateEdges(scope)(CANDIDATES, [], pt(5, 0))).toBe(CANDIDATES);
  });

  test("没有候选边时原样返回", () => {
    expect(createTranslateInternalMoveCandidateEdges(createScope())([], ["e1"], pt(5, 0))).toEqual([]);
  });

  test("平移没产生任何变化时返回原数组引用", () => {
    const scope = createScope({ translateStoredEdgeGeometryBy: vi.fn((e: any) => e) });

    expect(createTranslateInternalMoveCandidateEdges(scope)(CANDIDATES, ["e1"], pt(5, 0))).toBe(CANDIDATES);
  });
});

describe("createTranslateWholeMoveCandidateEdges", () => {
  test("两端都动的边被平移", () => {
    const scope = createScope();

    const next = createTranslateWholeMoveCandidateEdges(scope)(CANDIDATES, ["n1", "n2"], [], pt(5, 0));

    expect(next[0]).toMatchObject({ moved: true });
  });

  test("只动一端的边不被平移（要重算而非平移）", () => {
    const scope = createScope();

    const next = createTranslateWholeMoveCandidateEdges(scope)(CANDIDATES, ["n1", "n2"], [], pt(5, 0));

    // e2 = n2→n3，只有 n2 在移动集合里
    expect(next[1]).toBe(CANDIDATES[1]);
  });

  test("被选中的边即使两端都没动也平移", () => {
    const scope = createScope();

    const next = createTranslateWholeMoveCandidateEdges(scope)(CANDIDATES, [], ["e3"], pt(5, 0));

    expect(next[2]).toMatchObject({ moved: true });
  });

  test("零位移时原样返回", () => {
    expect(createTranslateWholeMoveCandidateEdges(createScope())(CANDIDATES, ["n1", "n2"], [], pt(0, 0))).toBe(CANDIDATES);
  });

  test("平移没产生变化时返回原数组引用", () => {
    const scope = createScope({ translateStoredEdgeGeometryBy: vi.fn((e: any) => e) });

    expect(createTranslateWholeMoveCandidateEdges(scope)(CANDIDATES, ["n1", "n2"], [], pt(5, 0))).toBe(CANDIDATES);
  });
});
