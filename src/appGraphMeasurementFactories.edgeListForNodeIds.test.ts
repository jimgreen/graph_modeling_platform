// createEdgeListForNodeIds：按节点 id 收集邻接边，再并入显式给的额外边。
// 关键契约是「同一条边只出现一次，且以最后写入的对象为准」（Map 语义）。
import { describe, expect, test } from "vitest";

import { createEdgeListForNodeIds } from "./appExtracted/appGraphMeasurementFactories";

const edge = (id: string, sourceId: string, targetId: string) => ({ id, sourceId, targetId });

function createScope() {
  const edges = [edge("e1", "n1", "n2"), edge("e2", "n1", "n3"), edge("e3", "n4", "n5")];
  const edgesByNodeId = new Map<string, any[]>();
  for (const e of edges) {
    for (const endpoint of [e.sourceId, e.targetId]) {
      const bucket = edgesByNodeId.get(endpoint) ?? [];
      bucket.push(e);
      edgesByNodeId.set(endpoint, bucket);
    }
  }
  return { edgeById: new Map(edges.map((e) => [e.id, e])), edgesByNodeId };
}

describe("createEdgeListForNodeIds", () => {
  test("收集全部邻接边并按首次出现去重", () => {
    const list = createEdgeListForNodeIds(createScope())(["n1", "n2"]);

    expect(list.map((e) => e.id).sort()).toEqual(["e1", "e2"]);
  });

  test("同一节点两侧的边不会重复出现（n1-n2 被两个端点各命中一次）", () => {
    const list = createEdgeListForNodeIds(createScope())(["n1", "n2"]);

    expect(list.filter((e) => e.id === "e1")).toHaveLength(1);
  });

  test("额外边并入结果，不在邻接表里的 id 被忽略", () => {
    const list = createEdgeListForNodeIds(createScope())(["n1"], ["e3", "不存在"]);

    expect(list.map((e) => e.id).sort()).toEqual(["e1", "e2", "e3"]);
  });

  test("额外边与邻接边重复时只留一条（Map 按 id 覆盖）", () => {
    const list = createEdgeListForNodeIds(createScope())(["n1"], ["e1"]);

    expect(list.filter((e) => e.id === "e1")).toHaveLength(1);
  });

  test("无邻接的节点返回空数组而不是抛", () => {
    const list = createEdgeListForNodeIds(createScope())(["不存在的节点"]);

    expect(list).toEqual([]);
  });

  test("空输入返回空数组", () => {
    expect(createEdgeListForNodeIds(createScope())([])).toEqual([]);
  });

  test("入参是 Set（Iterable）也能遍历", () => {
    const list = createEdgeListForNodeIds(createScope())(new Set(["n1"]));

    expect(list.map((e) => e.id).sort()).toEqual(["e1", "e2"]);
  });
});
