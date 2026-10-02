// 撤销快照的深拷贝。契约只有一条但很关键：**拷贝必须彻底** ——
// 浅拷贝会让「撤销」把当前状态也一起改回去（撤销一次，两次都没了）。
// 每条用例都验证「改拷贝不影响原对象」，而不是只比形状。
import { describe, expect, test } from "vitest";

import {
  cloneEdgesForUndo,
  cloneGroupsForUndo,
  cloneNodesForUndo,
  cloneTopologyErrorsForUndo,
  cloneTopologyForUndo
} from "./appExtracted/appPersistenceLibraryExport";

const pt = (x: number, y: number) => ({ x, y });

describe("cloneNodesForUndo", () => {
  const node = () => ({
    id: "n1",
    kind: "ac-load",
    name: "节点",
    position: pt(1, 2),
    size: { width: 40, height: 30 },
    terminals: [{ id: "t1", anchor: pt(0.5, 0.5) }],
    params: { a: 1 }
  });

  test("字段逐项复制", () => {
    expect(cloneNodesForUndo([node() as any])[0]).toMatchObject({ id: "n1", name: "节点" });
  });

  test("position 是新对象", () => {
    const source = node();
    const [clone] = cloneNodesForUndo([source as any]);

    expect(clone.position).not.toBe(source.position);
  });

  test("size 是新对象", () => {
    const source = node();
    const [clone] = cloneNodesForUndo([source as any]);

    expect(clone.size).not.toBe(source.size);
  });

  test("terminals 数组与每个端子都是新的", () => {
    const source = node();
    const [clone] = cloneNodesForUndo([source as any]);

    expect(clone.terminals).not.toBe(source.terminals);
    expect(clone.terminals[0]).not.toBe(source.terminals[0]);
    expect(clone.terminals[0].anchor).not.toBe(source.terminals[0].anchor);
  });

  test("params 是新对象（浅展开即可，值本身按引用共享）", () => {
    const source = node();
    const [clone] = cloneNodesForUndo([source as any]);

    expect(clone.params).not.toBe(source.params);
    clone.params.a = 2;
    expect((source.params as any).a).toBe(1);
  });

  test("多端子全部被复制", () => {
    const source = { ...node(), terminals: [{ id: "t1", anchor: pt(0, 0) }, { id: "t2", anchor: pt(1, 1) }] };
    const [clone] = cloneNodesForUndo([source as any]);

    clone.terminals[1].anchor.x = 99;
    expect(source.terminals[1].anchor.x).toBe(1);
  });

  test("空数组返回空数组", () => {
    expect(cloneNodesForUndo([])).toEqual([]);
  });
});

describe("cloneEdgesForUndo", () => {
  const edge = () => ({
    id: "e1",
    sourceId: "n1",
    targetId: "n2",
    sourcePoint: pt(1, 1),
    targetPoint: pt(2, 2),
    manualPoints: [pt(3, 3)],
    routePoints: [pt(4, 4)]
  });

  test("端点与点集都是新对象", () => {
    const source = edge();
    const [clone] = cloneEdgesForUndo([source as any]);

    expect(clone.sourcePoint).not.toBe(source.sourcePoint);
    expect(clone.manualPoints).not.toBe(source.manualPoints);
    expect(clone.manualPoints[0]).not.toBe(source.manualPoints[0]);
    expect(clone.routePoints[0]).not.toBe(source.routePoints[0]);
  });

  test("缺省的端点保持 undefined（不补成 0）", () => {
    const [clone] = cloneEdgesForUndo([{ id: "e1", sourceId: "a", targetId: "b" } as any]);

    expect(clone.sourcePoint).toBeUndefined();
    expect(clone.targetPoint).toBeUndefined();
  });

  test("缺省的点集保持 undefined", () => {
    const [clone] = cloneEdgesForUndo([{ id: "e1", sourceId: "a", targetId: "b" } as any]);

    expect(clone.manualPoints).toBeUndefined();
    expect(clone.routePoints).toBeUndefined();
  });

  test("其余字段原样带出", () => {
    expect(cloneEdgesForUndo([edge() as any])[0]).toMatchObject({ id: "e1", sourceId: "n1", targetId: "n2" });
  });
});

describe("cloneGroupsForUndo", () => {
  const group = () => ({ id: "g1", name: "组", nodeIds: ["n1"], edgeIds: ["e1"], childGroupIds: ["g0"] });

  test("三个 id 数组都是新数组", () => {
    const source = group();
    const [clone] = cloneGroupsForUndo([source as any]);

    expect(clone.nodeIds).not.toBe(source.nodeIds);
    expect(clone.edgeIds).not.toBe(source.edgeIds);
    expect(clone.childGroupIds).not.toBe(source.childGroupIds);
  });

  test("childGroupIds 缺省时保持 undefined", () => {
    const [clone] = cloneGroupsForUndo([{ id: "g1", name: "组", nodeIds: [], edgeIds: [] } as any]);

    expect(clone.childGroupIds).toBeUndefined();
  });

  test("改拷贝不影响原数组", () => {
    const source = group();
    const [clone] = cloneGroupsForUndo([source as any]);

    clone.nodeIds.push("n2");
    expect(source.nodeIds).toEqual(["n1"]);
  });
});

describe("cloneTopologyForUndo", () => {
  const topology = () => ({
    nodes: { n1: { id: "n1", neighbors: ["n2"], edgeIds: ["e1"] } },
    connectedComponents: [["n1", "n2"]]
  });

  test("节点映射的每个节点被复制", () => {
    const source = topology();
    const clone = cloneTopologyForUndo(source as any);

    expect(clone.nodes.n1).not.toBe(source.nodes.n1);
  });

  test("neighbors 与 edgeIds 都是新数组", () => {
    const source = topology();
    const clone = cloneTopologyForUndo(source as any);

    expect(clone.nodes.n1.neighbors).not.toBe(source.nodes.n1.neighbors);
    expect(clone.nodes.n1.edgeIds).not.toBe(source.nodes.n1.edgeIds);
  });

  test("连通分量被复制", () => {
    const source = topology();
    const clone = cloneTopologyForUndo(source as any);

    expect(clone.connectedComponents[0]).not.toBe(source.connectedComponents[0]);
  });

  test("空拓扑得到空映射与空分量列表", () => {
    expect(cloneTopologyForUndo({ nodes: {}, connectedComponents: [] } as any)).toEqual({ nodes: {}, connectedComponents: [] });
  });
});

describe("cloneTopologyErrorsForUndo", () => {
  const error = () => ({ code: "X", message: "错", relatedNodeIds: ["n1", "n2"] });

  test("relatedNodeIds 是新数组", () => {
    const source = error();
    const [clone] = cloneTopologyErrorsForUndo([source as any]);

    expect(clone.relatedNodeIds).not.toBe(source.relatedNodeIds);
  });

  test("其余字段原样带出", () => {
    expect(cloneTopologyErrorsForUndo([error() as any])[0]).toMatchObject({ code: "X", message: "错" });
  });

  test("空数组返回空数组", () => {
    expect(cloneTopologyErrorsForUndo([])).toEqual([]);
  });
});
