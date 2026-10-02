// createBuildBulkMovePlan：批量移动时先决定「这次移动有多大规模」，再决定要不要花代价做路由修复。
// 三档 kind：
//  rigid  —— 整层移动，或「内部边够多且没有跨边界边」：整块平移，不用重算路由；
//  hybrid —— 内部边够多但存在跨边界边：内部跳过修复，跨边界照常修；
//  none   —— 边不够多：全走常规路径。
// skipInternalRepair 与 skipRouteRepairSearch 是两件独立的事，别混。
import { describe, expect, test, vi } from "vitest";

import { createBuildBulkMovePlan } from "./appExtracted/appSelectionDragFactories";

const edge = (id: string) => ({ id, sourceId: "n1", targetId: "n2" });

function createScope(over: Record<string, any> = {}) {
  return {
    CANVAS_BULK_MOVE_EDGE_THRESHOLD: 3,
    internalMoveCandidateEdges: vi.fn((edges: any[], ids: Set<string>) => edges.filter((e) => ids.has(e.id))),
    externalMoveCandidateEdges: vi.fn((edges: any[], ids: Set<string>) => edges.filter((e) => !ids.has(e.id))),
    localRouteOptimizationCandidateEdges: vi.fn(() => []),
    mergeUniqueEdgesById: vi.fn((a: any[], b: any[]) => [...a, ...b]),
    moveRouteRepairSeedEdges: vi.fn(() => []),
    ...over
  };
}

const run = (scope: any, options: { internalIds: string[]; wholeLayer?: boolean; candidates?: any[] }) =>
  createBuildBulkMovePlan(scope)(
    options.candidates ?? [edge("e1"), edge("e2"), edge("e3")],
    new Set(options.internalIds),
    options.wholeLayer ?? false,
    ["n1"],
    new Set<string>(),
    {},
    [],
    []
  );

describe("createBuildBulkMovePlan", () => {
  test("边数不足阈值时 kind 为 none", () => {
    expect(run(createScope(), { internalIds: ["e1"] }).kind).toBe("none");
  });

  test("内部边达到阈值且无跨边界边时为 rigid", () => {
    const scope = createScope();

    // 三条边全是内部边 → 跨边界边为空
    expect(run(scope, { internalIds: ["e1", "e2", "e3"] }).kind).toBe("rigid");
  });

  test("内部边达到阈值但有跨边界边时为 hybrid", () => {
    const scope = createScope();

    const plan = run(scope, { internalIds: ["e1", "e2", "e3"], candidates: [edge("e1"), edge("e2"), edge("e3"), edge("e4")] });

    expect(plan.kind).toBe("hybrid");
    expect(plan.boundaryCandidateEdges).toHaveLength(1);
  });

  test("整层移动时无条件 rigid", () => {
    expect(run(createScope(), { internalIds: [], wholeLayer: true }).kind).toBe("rigid");
  });

  test("整层移动时跳过路由修复搜索", () => {
    const scope = createScope();

    run(scope, { internalIds: [], wholeLayer: true });

    expect(scope.moveRouteRepairSeedEdges).not.toHaveBeenCalled();
    expect(scope.localRouteOptimizationCandidateEdges).not.toHaveBeenCalled();
  });

  test("纯内部批量移动时跳过路由修复搜索", () => {
    const scope = createScope();

    run(scope, { internalIds: ["e1", "e2", "e3"] });

    expect(scope.moveRouteRepairSeedEdges).not.toHaveBeenCalled();
  });

  test("常规路径会算路由修复种子", () => {
    const scope = createScope();

    run(scope, { internalIds: ["e1"] });

    expect(scope.moveRouteRepairSeedEdges).toHaveBeenCalledWith(
      scope.externalMoveCandidateEdges.mock.results[0].value,
      ["n1"],
      new Set(),
      {}
    );
  });

  test("内部修复候选在达到阈值时清空", () => {
    const scope = createScope();

    expect(run(scope, { internalIds: ["e1", "e2", "e3"] }).internalRepairCandidateEdges).toEqual([]);
  });

  test("内部修复候选在未达阈值时保留", () => {
    const scope = createScope();

    expect(run(scope, { internalIds: ["e1"] }).internalRepairCandidateEdges).toHaveLength(1);
  });

  test("内外部候选边按内部 id 切分", () => {
    const scope = createScope();

    const plan = run(scope, { internalIds: ["e1", "e2"] });

    expect(plan.internalCandidateEdges.map((e: any) => e.id)).toEqual(["e1", "e2"]);
    expect(plan.boundaryCandidateEdges.map((e: any) => e.id)).toEqual(["e3"]);
  });

  test("延迟修复候选 = 路由修复候选 + 内部修复候选", () => {
    const scope = createScope({ localRouteOptimizationCandidateEdges: vi.fn(() => [edge("r1")]) });

    const plan = run(scope, { internalIds: ["e1"] });

    expect(scope.mergeUniqueEdgesById).toHaveBeenCalledTimes(2);
    expect(plan.deferredRepairCandidateEdges).toEqual([edge("r1"), edge("e1")]);
    // 旧口径不加剔除，直接把内部候选也并进来，故计数相同
    expect(plan.legacyDeferredRepairCandidateCount).toBe(2);
  });

  test("内部 id 原样带出", () => {
    const internalIds = new Set(["e1", "e2", "e3"]);

    expect(createBuildBulkMovePlan(createScope())([], internalIds, false, [], new Set(), {}, [], []).internalEdgeIds).toBe(internalIds);
  });
});
