// createMoveSelection(方向键单击 / 检查器改坐标)的容器接入:
// 该路径从 __appScope 解构了 30+ 个键,任何「解构遮蔽模块 import」都会在这里炸成
// `nodes.some(undefined)` 这类 TypeError —— 而 @ts-nocheck + audit:names 都拦不住,只能靠真跑一次。
import { describe, expect, test, vi } from "vitest";
import { createMoveSelection } from "./appCanvasInteractionFactories";

const bareNode = (id: string, kind: string, x: number, y: number, extra: Record<string, unknown> = {}) => ({
  id, kind, name: id, position: { x, y }, size: { width: 40, height: 30 },
  rotation: 0, scale: 1, params: { _labelVisible: "0" }, terminals: [], ...extra,
});

describe("createMoveSelection 容器接入", () => {
  const container = bareNode("c1", "ac-vpp-box", 0, 0, { size: { width: 180, height: 112 } });
  const member = bareNode("m1", "ac-load", 0, 0, { containerId: "c1" });
  const nodes = [container, member];
  const nodeById = new Map(nodes.map((n) => [n.id, n]));

  const makeScope = () => {
    const commitFastMovedGraphPatches = vi.fn();
    return {
      activeSelectedEdgeIds: [],
      activeSelectedNodeIds: ["c1", "m1"],
      displaySelectedEdgeIds: [],
      displaySelectedNodeIds: [],
      canvasSelectionScope: "group",
      requireEditMode: () => true,
      movableCanvasNodeIds: (ids: string[]) => ids,
      nodes,
      nodeById,
      // 平台语义:更新 = 原节点 + 位移(成员位置变了,容器随后按成员重算)
      buildMovedNodeUpdates: (ids: string[], positions: Record<string, { x: number; y: number }>, delta: { x: number; y: number }) =>
        ids.flatMap((id) => {
          const node = nodeById.get(id);
          const origin = positions[id];
          return node && origin ? [{ ...node, position: { x: origin.x + delta.x, y: origin.y + delta.y } }] : [];
        }),
      mergeNodeUpdateLists: (base: any[], extra: any[]) => (extra.length > 0 ? [...base, ...extra] : base),
      edgeListForNodeIds: () => [],
      snapshotEdgePoints: () => ({}),
      routePointsSnapshotForMove: () => ({}),
      isWholeActiveLayerMove: () => false,
      canvasBoundsForMoveDelta: () => ({ width: 800, height: 400 }),
      boundedDeltaForNodes: (_ids: string[], _positions: unknown, dx: number, dy: number) => ({ x: dx, y: dy }),
      boundedDeltaForMoveGeometry: (_ids: string[], _edgeIds: unknown, _edges: unknown, _positions: unknown, _points: unknown, _routes: unknown, dx: number, dy: number) => ({ x: dx, y: dy }),
      applyCanvasBounds: vi.fn(),
      nextNodesForMovedGraphCommit: () => nodes,
      busNodeIdSet: new Set<string>(),
      synchronousEdgeAdjustmentCandidates: () => [],
      internalMoveEdgeIdsForMovedNodes: () => new Set<string>(),
      externalMoveCandidateEdges: () => [],
      routePreserveEdgeIdsForMovedNodes: () => new Set<string>(),
      mergeAdjustedCandidateEdges: (edges: unknown[]) => edges,
      translateInternalMoveCandidateEdges: () => [],
      translateWholeMoveCandidateEdges: () => [],
      adjustEdgesAfterNodeMove: (edges: unknown[]) => edges,
      shouldFinalizeMovedNodeEdgesSynchronously: () => false,
      finalizeMovedNodeEdgesFast: (edges: unknown[]) => edges,
      graphStore: {},
      pushUndoSnapshot: vi.fn(),
      undoScopeForGraphPatch: () => ({ nodeIds: [], edgeIds: [] }),
      updateSmartAlignmentGuides: vi.fn(),
      writeOperationLog: vi.fn(),
      commitFastMovedGraphPatches,
    };
  };

  test("方向键移动容器成员:不抛错,且容器重算并入同一次提交", () => {
    const scope = makeScope();
    expect(() => createMoveSelection(scope as any)(10, 0)).not.toThrow();
    expect(scope.commitFastMovedGraphPatches).toHaveBeenCalledTimes(1);
    const updates = scope.commitFastMovedGraphPatches.mock.calls[0][0] as any[];
    expect(updates.map((n) => n.id)).toContain("m1");
    expect(updates.map((n) => n.id)).toContain("c1"); // 容器几何(拖动集之外)一并提交
  });

  test("有容器时撤销作用域让位:pushUndoSnapshot 收到 undefined", () => {
    const scope = makeScope();
    createMoveSelection(scope as any)(10, 0);
    expect(scope.pushUndoSnapshot).toHaveBeenCalledWith(true, false, undefined, "移动设备", expect.any(String));
  });
});
