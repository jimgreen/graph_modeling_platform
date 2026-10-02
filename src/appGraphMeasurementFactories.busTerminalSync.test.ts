// 母线端子同步的「哪些母线需要重新同步」判定。
// 核心契约（createBusTerminalSyncNodeIdsForGraphPatch）：
//  ① 纯移动节点不触发同步（movedNodeIds 被显式忽略）；
//  ② 只有「边的新增 / 改挂 / 删除」才把相关母线标脏，且同一次提交里要同时看改前改后两端。
import { describe, expect, test, vi } from "vitest";

import {
  createBusNodeIdsFromEdges,
  createBusTerminalSyncNodeIdsForGraphPatch,
  createMarkBusTerminalSyncDirty,
  createMarkBusTerminalSyncDirtyForEdges
} from "./appExtracted/appGraphMeasurementFactories";

const edge = (id: string, sourceId: string, targetId: string, sourceTerminalId = "s", targetTerminalId = "t") => ({
  id,
  sourceId,
  targetId,
  sourceTerminalId,
  targetTerminalId
});

function createScope(busIds: string[] = ["bus1"]) {
  const scope: Record<string, any> = {
    busNodeIdSet: new Set(busIds),
    pendingBusTerminalSyncNodeIdsRef: { current: new Set<string>() }
  };
  scope.busNodeIdsFromEdges = createBusNodeIdsFromEdges(scope);
  scope.markBusTerminalSyncDirty = createMarkBusTerminalSyncDirty(scope);
  scope.markBusTerminalSyncDirtyForEdges = createMarkBusTerminalSyncDirtyForEdges(scope);
  return scope;
}

describe("createBusNodeIdsFromEdges", () => {
  test("只挑出属于母线的端点", () => {
    const scope = createScope();

    expect([...scope.busNodeIdsFromEdges([edge("e1", "bus1", "dev1")])]).toEqual(["bus1"]);
  });

  test("两端都是母线时都收", () => {
    const scope = createScope(["bus1", "bus2"]);

    expect([...scope.busNodeIdsFromEdges([edge("e1", "bus1", "bus2")])].sort()).toEqual(["bus1", "bus2"]);
  });

  test("undefined 边被跳过", () => {
    const scope = createScope();

    expect([...scope.busNodeIdsFromEdges([undefined, null as any, edge("e1", "bus1", "dev1")])]).toEqual(["bus1"]);
  });

  test("两端都不是母线时返回空 Set", () => {
    expect(createScope().busNodeIdsFromEdges([edge("e1", "d1", "d2")]).size).toBe(0);
  });
});

describe("createMarkBusTerminalSyncDirty", () => {
  test("并入已有集合而不是覆盖", () => {
    const scope = createScope();
    scope.pendingBusTerminalSyncNodeIdsRef = { current: new Set(["bus0"]) };

    scope.markBusTerminalSyncDirty(["bus1", "bus1"]);

    expect([...scope.pendingBusTerminalSyncNodeIdsRef.current].sort()).toEqual(["bus0", "bus1"]);
  });

  test("空字符串 id 被忽略", () => {
    const scope = createScope();
    scope.pendingBusTerminalSyncNodeIdsRef = { current: new Set<string>() };

    scope.markBusTerminalSyncDirty(["", "bus1", undefined]);

    expect([...scope.pendingBusTerminalSyncNodeIdsRef.current]).toEqual(["bus1"]);
  });
});

describe("createMarkBusTerminalSyncDirtyForEdges", () => {
  test("多组边合并成一批标脏", () => {
    const scope = createScope(["bus1", "bus2"]);

    scope.markBusTerminalSyncDirtyForEdges([edge("e1", "bus1", "d")], [edge("e2", "bus2", "d")]);

    expect([...scope.pendingBusTerminalSyncNodeIdsRef.current].sort()).toEqual(["bus1", "bus2"]);
  });

  test("不传边组时不新增标脏，已有待同步集合原样保留", () => {
    const scope = createScope();
    scope.pendingBusTerminalSyncNodeIdsRef = { current: new Set(["bus0"]) };

    scope.markBusTerminalSyncDirtyForEdges();

    expect([...scope.pendingBusTerminalSyncNodeIdsRef.current]).toEqual(["bus0"]);
  });
});

describe("createBusTerminalSyncNodeIdsForGraphPatch", () => {
  const patch = createBusTerminalSyncNodeIdsForGraphPatch;

  test("纯移动（端点没变）不同步任何母线", () => {
    const scope = createScope();
    const previous = [edge("e1", "bus1", "dev1")];

    const ids = patch(scope)(["bus1"], previous, [edge("e1", "bus1", "dev1")], []);

    expect(ids.size).toBe(0);
  });

  test("新增边（改前没有）标脏两端母线", () => {
    const scope = createScope(["bus1", "bus2"]);

    const ids = patch(scope)([], [], [edge("e1", "bus1", "bus2")], []);

    expect([...ids].sort()).toEqual(["bus1", "bus2"]);
  });

  test("改挂到另一条边：改前改后的母线都标脏", () => {
    const scope = createScope(["bus1", "bus2"]);
    const previous = [edge("e1", "bus1", "dev1")];

    const ids = patch(scope)([], previous, [edge("e1", "bus2", "dev1")], []);

    expect([...ids].sort()).toEqual(["bus1", "bus2"]);
  });

  test("只换端子 id（端点节点不变）也算改挂", () => {
    const scope = createScope();
    const previous = [edge("e1", "bus1", "dev1", "s1", "t1")];

    const ids = patch(scope)([], previous, [edge("e1", "bus1", "dev1", "s2", "t1")], []);

    expect([...ids]).toEqual(["bus1"]);
  });

  test("删除边标脏它原本连着的母线", () => {
    const scope = createScope();
    const previous = [edge("e1", "bus1", "dev1"), edge("e2", "dev1", "dev2")];

    const ids = patch(scope)([], previous, [], ["e1"]);

    expect([...ids]).toEqual(["bus1"]);
  });

  test("删除非母线边不产生任何标脏", () => {
    const scope = createScope();
    const previous = [edge("e1", "dev1", "dev2")];

    expect(patch(scope)([], previous, [], ["e1"]).size).toBe(0);
  });

  test("删除不存在的 id 不报错也不标脏", () => {
    const scope = createScope();

    expect(patch(scope)([], [], [], ["查无此边"]).size).toBe(0);
  });

  test("movedNodeIds 传了也被忽略（纯移动不同步）", () => {
    const scope = createScope();
    const previous = [edge("e1", "bus1", "dev1")];

    const ids = patch(scope)(["bus1", "dev1"], previous, [edge("e1", "bus1", "dev1")], []);

    expect(ids.size).toBe(0);
  });
});
