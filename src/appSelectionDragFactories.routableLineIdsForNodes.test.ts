// createRoutableLineIdsConnectedToNodeIds：查某批节点牵涉哪些可布线路径元件。
// 用的是反查索引 routableLineNodeIdsByEndpointNodeId，一个端点节点可能牵多条线路元件。
import { describe, expect, test } from "vitest";

import { createRoutableLineIdsConnectedToNodeIds } from "./appExtracted/appSelectionDragFactories";

const index = new Map<string, string[]>([
  ["n1", ["l1", "l2"]],
  ["n2", ["l2", "l3"]],
  ["n9", []]
]);

const build = createRoutableLineIdsConnectedToNodeIds({ routableLineNodeIdsByEndpointNodeId: index });

describe("createRoutableLineIdsConnectedToNodeIds", () => {
  test("收集单个节点牵涉的线路元件", () => {
    expect([...build(["n1"])]).toEqual(["l1", "l2"]);
  });

  test("多个节点的结果去重", () => {
    expect([...build(["n1", "n2"])].sort()).toEqual(["l1", "l2", "l3"]);
  });

  test("索引里没有的节点被忽略", () => {
    expect(build(["查无此节点"]).size).toBe(0);
  });

  test("索引里是空数组的节点不产生任何 id", () => {
    expect(build(["n9"]).size).toBe(0);
  });

  test("空输入返回空集合", () => {
    expect(build([]).size).toBe(0);
  });

  test("接受 Set 形式的输入", () => {
    expect([...build(new Set(["n2"]))]).toEqual(["l2", "l3"]);
  });

  test("重复节点不产生重复 id", () => {
    expect([...build(["n1", "n1"])]).toEqual(["l1", "l2"]);
  });
});
