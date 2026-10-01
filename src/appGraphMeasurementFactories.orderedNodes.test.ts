// createOrderedNodeFromList / createOrderedNodesForIds：
// 从「可能是一份局部 patch 列表」里按 nodeIndexById 取节点，取不到再退化到 nodeById。
// 三条分支（下标命中 / patch 缓存 / nodeById 兜底）都要盖，否则 patch 列表与全量列表混用时会静默取错节点。
import { describe, expect, test } from "vitest";

import {
  createOrderedNodeFromList,
  createOrderedNodesForIds
} from "./appExtracted/appGraphMeasurementFactories";

const node = (id: string) => ({ id, name: id });

/**
 * 造 scope。store 里 nodes 是全量、nodeIndexById 给出下标；
 * 传入的 sourceNodes 可以是 patch 列表（更短）或全量同一引用。
 */
function createScope(fullNodes: any[]) {
  const nodeIndexById = new Map(fullNodes.map((n, i) => [n.id, i]));
  const cache = new Map<any, Map<string, any>>();
  const orderedNodeFromList = createOrderedNodeFromList({
    graphStore: { nodeIndexById, nodes: fullNodes },
    nodeById: new Map(fullNodes.map((n) => [n.id, n])),
    nodePatchListLookupCacheRef: { current: cache },
    nodes: fullNodes
  });
  return { orderedNodeFromList, cache };
}

describe("createOrderedNodeFromList", () => {
  const full = [node("n1"), node("n2"), node("n3")];

  test("下标命中且 id 对得上时直接按序取", () => {
    const { orderedNodeFromList } = createScope(full);

    expect(orderedNodeFromList(full, "n2")).toBe(full[1]);
  });

  test("patch 列表里能找到时走 patch 缓存，且只建一次 Map", () => {
    const { orderedNodeFromList, cache } = createScope(full);
    const patch = [{ id: "patched", name: "patched" }];

    // 下标 0 指向 full[0]，id 不匹配 → 落到 patch 缓存分支
    expect(orderedNodeFromList(patch, "patched")).toBe(patch[0]);
    expect(cache.has(patch)).toBe(true);
    // 同一份 patch 再查一次不再新建
    orderedNodeFromList(patch, "patched");
    expect(cache.size).toBe(1);
  });

  test("patch 里没有时退到 nodeById（patch 比全量短）", () => {
    const { orderedNodeFromList } = createScope(full);
    const patch = [{ id: "patched", name: "patched" }];

    expect(orderedNodeFromList(patch, "n3")).toBe(full[2]);
  });

  test("既不在 patch 下标位也不在 nodeById 时返回 undefined", () => {
    const { orderedNodeFromList } = createScope(full);
    const patch = [{ id: "patched", name: "patched" }];

    expect(orderedNodeFromList(patch, "查无此节点")).toBeUndefined();
  });

  test("全量列表（非 patch）下标错位时返回 undefined，不拿 nodeById 兜底", () => {
    const { orderedNodeFromList } = createScope(full);
    // 与 nodes 不同引用但长度相同：不是 patch 列表，走不到 nodeById 兜底
    const sameLen = [node("x1"), node("x2"), node("x3")];

    expect(orderedNodeFromList(sameLen, "n2")).toBeUndefined();
  });
});

describe("createOrderedNodesForIds", () => {
  const full = [node("n1"), node("n2"), node("n3")];

  test("按传入顺序返回，跳过取不到的 id", () => {
    const { orderedNodeFromList } = createScope(full);
    const list = createOrderedNodesForIds({ orderedNodeFromList })(full, ["n3", "缺失", "n1"]);

    expect(list.map((n) => n.id)).toEqual(["n3", "n1"]);
  });

  test("空 id 集合返回空数组", () => {
    const { orderedNodeFromList } = createScope(full);

    expect(createOrderedNodesForIds({ orderedNodeFromList })(full, [])).toEqual([]);
  });

  test("重复 id 会重复出现（不去重，调用方自己负责）", () => {
    const { orderedNodeFromList } = createScope(full);
    const list = createOrderedNodesForIds({ orderedNodeFromList })(full, ["n1", "n1"]);

    expect(list.map((n) => n.id)).toEqual(["n1", "n1"]);
  });
});
