// graphStore 边更新的免重建语义的直接单测（此前 8 个导出零直呼）。
//
// ## 它是什么
//
// `graphStore` 是画布的**持久化数据仓库**：节点/边的数组 + Map/Set 索引 +
// 各种派生索引（按节点、按端子、元素树、路由几何…）。三个更新函数
// （`graphStoreSetEdges` / `graphStorePatchEdgesFromArray` / `graphStorePatchEdges`）
// 全部靠**「输入没实质变化就原样返回旧 store」**做免重建优化 —— 依赖
// React 的引用相等来跳过重渲染。
//
// ## 判错的后果不是数据错，而是
//
// - **该重建时没重建** → 界面不刷新（改了一条边但看不见）
// - **不该重建时重建** → 全量重建索引，性能塌陷
//
// ## 探针实测的免重建判据（逐条钉住）
//
// | 场景 | 结果 | 判据 |
// |------|------|------|
// | 同数组同引用、同顺序 | 同一 store | `sameOrderedReferences` |
// | 顺序不同 | **新 store**，`edgeOrder` 随顺序变 | 顺序敏感 |
// | 新数组、内容同、引用不同 | **新 store** | 按**引用**判，不按内容 |
// | patch + 同顺序 | 同一 store | — |
// | patch + 顺序变了 | **新 store** | 委托给 SetEdges |
// | patch + 同 id 同引用 | 同一 store | `previousEdge === nextEdge` |
// | patch + 同 id 新对象 | **新 store** | — |
// | patch + 不存在的 id | 同一 store | 跳过，**不插入** |
// | patchGraph + 空更新 | 同一 store | — |
//
// ## 一个"如实记录"的既有事实：重复 id 会让索引与 edgeOrder 不一致
//
// 探针实测 `[edge("e1"), edge("e1")]` →
//   `edgeOrder = ["e1","e1"]`（长度 2）但 `edgeMap.size = 1`。
//
// 即 `edgeOrder` 保留重复项，而 Map/Set 天然去重。**判定为脏数据表现，不改**：
// 调用点传入的边列表来自模型，而模型里 id 唯一（`randomId` 生成）。
// 修复要么加去重（改变 edgeOrder 语义）要么加断言（引入新的抛错路径）——
// 都是无收益的行为变更。此处钉住现状供排查时对照。
import { describe, expect, test } from "vitest";
import {
  createGraphStore,
  graphStorePatchEdges,
  graphStorePatchEdgesFromArray,
  graphStorePatchGraph,
  graphStoreSetEdges
} from "./graphStore";
import type { Edge, ModelNode } from "./model";

const edge = (id: string, from = "n1", to = "n2"): Edge =>
  ({
    id,
    kind: "ac-line",
    from: { nodeId: from, terminalId: `${from}t1` },
    to: { nodeId: to, terminalId: `${to}t1` }
  }) as unknown as Edge;

const node = (id: string): ModelNode =>
  ({
    id,
    kind: "ac-load",
    name: id,
    nodeNumber: id,
    acTopologyNode: 0,
    dcTopologyNode: 0,
    position: { x: 0, y: 0 },
    size: { width: 10, height: 10 },
    rotation: 0,
    scale: 1,
    terminals: [],
    params: {}
  }) as unknown as ModelNode;

const baseStore = () => createGraphStore([node("n1"), node("n2")], [edge("e0")]);
const twoEdges = () => [edge("e1"), edge("e2")];

describe("graphStoreSetEdges：按引用判等的免重建", () => {
  test("首次调用必然新建 store", () => {
    const store = baseStore();
    const edges = twoEdges();
    expect(graphStoreSetEdges(store, edges)).not.toBe(store);
  });

  test("同数组同引用 → 原样返回旧 store", () => {
    const store = baseStore();
    const edges = twoEdges();
    const s1 = graphStoreSetEdges(store, edges);
    expect(graphStoreSetEdges(s1, edges), "同引用应免重建").toBe(s1);
  });

  test("★ 顺序不同 → 新 store，且 edgeOrder 跟随新顺序", () => {
    const store = baseStore();
    const edges = twoEdges();
    const s1 = graphStoreSetEdges(store, edges);
    const reversed = [edges[1], edges[0]];
    const s2 = graphStoreSetEdges(s1, reversed);
    expect(s2, "顺序敏感").not.toBe(s1);
    expect(s2.edgeOrder).toEqual(["e2", "e1"]);
  });

  test("★ 新数组但内容相同 → **仍然新建**（按引用判，不按内容）", () => {
    // 这条容易被"顺手"改成内容深比较（性能会塌），故显式钉住现状。
    const store = baseStore();
    const edges = twoEdges();
    const s1 = graphStoreSetEdges(store, edges);
    const copy = edges.map((e) => ({ ...e }));
    expect(graphStoreSetEdges(s1, copy), "引用不同即视为变化").not.toBe(s1);
  });

  test("空数组与空 store 互认（幂等）", () => {
    const store = baseStore();
    const emptied = graphStoreSetEdges(store, []);
    expect(emptied.edgeOrder).toEqual([]);
    expect(graphStoreSetEdges(emptied, []), "空数组同引用应免重建").toBe(emptied);
  });
});

describe("graphStorePatchEdgesFromArray：同顺序才免重建，否则委托 SetEdges", () => {
  test("同顺序同引用 → 免重建", () => {
    const store = baseStore();
    const edges = twoEdges();
    const s1 = graphStoreSetEdges(store, edges);
    expect(graphStorePatchEdgesFromArray(s1, edges, s1.edgeOrder)).toBe(s1);
  });

  test("★ 顺序不同 → 新 store（委托给 SetEdges 全量重建）", () => {
    const store = baseStore();
    const edges = twoEdges();
    const s1 = graphStoreSetEdges(store, edges);
    const reversed = [edges[1], edges[0]];
    const s2 = graphStorePatchEdgesFromArray(s1, reversed, ["e2", "e1"]);
    expect(s2).not.toBe(s1);
    expect(s2.edgeOrder).toEqual(["e2", "e1"]);
  });

  test("edgeIds 顺序与 edges 不一致时仍以 edges 为准", () => {
    // sameOrderFromItems 比较的是 edges 的 id 序列与 store.edgeOrder，不是 edgeIds。
    const store = baseStore();
    const edges = twoEdges();
    const s1 = graphStoreSetEdges(store, edges);
    const s2 = graphStorePatchEdgesFromArray(s1, edges, ["e2", "e1"]); // edgeIds 顺序故意错
    expect(s2.edgeOrder, "以 edges 顺序为准").toEqual(["e1", "e2"]);
  });
});

describe("graphStorePatchEdges：按 id 就地更新", () => {
  test("同 id 同引用 → 免重建", () => {
    const store = baseStore();
    const edges = twoEdges();
    const s1 = graphStoreSetEdges(store, edges);
    const e1Ref = s1.edgeMap.get("e1")!;
    expect(graphStorePatchEdges(s1, [e1Ref])).toBe(s1);
  });

  test("★ 同 id 新对象 → 新 store", () => {
    const store = baseStore();
    const edges = twoEdges();
    const s1 = graphStoreSetEdges(store, edges);
    const e1Ref = s1.edgeMap.get("e1")!;
    const s2 = graphStorePatchEdges(s1, [{ ...e1Ref } as Edge]);
    expect(s2).not.toBe(s1);
    expect(s2.edgeOrder, "顺序不变（就地更新）").toEqual(s1.edgeOrder);
  });

  test("**幂等**：把新 store 里的引用再喂回去 → 免重建", () => {
    const store = baseStore();
    const edges = twoEdges();
    const s1 = graphStoreSetEdges(store, edges);
    const s2 = graphStorePatchEdges(s1, [{ ...s1.edgeMap.get("e1")! } as Edge]);
    expect(graphStorePatchEdges(s2, [s2.edgeMap.get("e1")!]), "应幂等").toBe(s2);
  });

  test("★ 不存在的 id → **跳过而非插入**", () => {
    const store = baseStore();
    const edges = twoEdges();
    const s1 = graphStoreSetEdges(store, edges);
    const s2 = graphStorePatchEdges(s1, [edge("ZZZ")]);
    expect(s2, "未知 id 不应触发重建").toBe(s1);
    expect(s1.edgeMap.has("ZZZ"), "更不应被插入").toBe(false);
  });

  test("★ 未知 id **即使与已有边同形**也必须跳过", () => {
    // 这条是被变异验证逼出来的：第一版只断言 `edgeMap.has("ZZZ")`，
    // 而把 `graphStorePatchEdges` 的 `continue` 改成 upsert 后测试**依然全绿** ——
    // 因为 upsert 分支里 `previousEdge` 也是 undefined，会被下一道
    // `if (!previousEdge) continue` 拦下，压根走不到插入逻辑。
    // 只有断言「结果 store 与输入 store 是同一引用」才真正覆盖这道 continue。
    //
    // 也就是说：我的第一版断言只覆盖了"不会**被记进** edgeMap"，
    // 而没有覆盖"不会**触发重建**"。后者才是 upsert 变异的实际影响面。
    const store = baseStore();
    const s1 = graphStoreSetEdges(store, [edge("e1"), edge("e2")]);
    // 未知 id + 与 e1 端点完全相同（若无 continue，会被当成 e1 的更新）
    const ghost = { ...s1.edgeMap.get("e1")!, id: "GHOST" };
    const s2 = graphStorePatchEdges(s1, [ghost as Edge]);
    expect(s2, "未知 id 必须原样返回（不触发任何重建）").toBe(s1);
    expect(s2.edgeOrder, "edgeOrder 不应变化").toEqual(s1.edgeOrder);
    expect(s2.edges, "边数组长度不应变化").toHaveLength(s1.edgeOrder.length);
    expect(s1.edgeMap.has("GHOST")).toBe(false);
  });

  test("未知 id 混在已知 id 里：已知的照常更新，未知的跳过", () => {
    const store = baseStore();
    const s1 = graphStoreSetEdges(store, [edge("e1"), edge("e2")]);
    const updated = { ...s1.edgeMap.get("e1")! };
    const s2 = graphStorePatchEdges(s1, [edge("GHOST"), updated as Edge]);
    expect(s2, "有真实更新，应重建").not.toBe(s1);
    expect(s2.edgeMap.has("GHOST"), "未知 id 不应被插入").toBe(false);
    expect(s2.edgeMap.get("e1"), "已知 id 应已更新").toEqual(updated);
  });

  test("空更新 → 免重建", () => {
    const store = baseStore();
    expect(graphStorePatchEdges(store, [])).toBe(store);
  });
});

describe("graphStorePatchGraph：组合节点与边更新", () => {
  test("全空更新 → 免重建", () => {
    const store = baseStore();
    expect(graphStorePatchGraph(store, [], [])).toBe(store);
  });

  test("只更新节点 → 边索引保持不变（引用同一）", () => {
    const store = baseStore();
    const s2 = graphStorePatchGraph(store, [{ ...store.nodeMap.get("n1")! } as ModelNode], []);
    expect(s2).not.toBe(store);
    expect(s2.edgeMap, "未更新边时边索引应保持引用").toBe(store.edgeMap);
  });
});

describe("★ 索引不变量：edgeOrder / edgeMap / edgeIdSet / edgeIndexById 同步", () => {
  const checkInvariants = (store: ReturnType<typeof baseStore>, label: string) => {
    expect(store.edgeOrder.length, `${label}：edgeOrder 与 edgeMap 长度应一致`).toBe(store.edgeMap.size);
    expect(store.edgeMap.size, `${label}：edgeMap 与 edgeIdSet 长度应一致`).toBe(store.edgeIdSet.size);
    expect(store.edgeIdSet.size, `${label}：edgeIdSet 与 edgeIndexById 长度应一致`).toBe(store.edgeIndexById.size);
  };

  test("空 / 单元素 / 多元素", () => {
    for (const [label, list] of [
      ["空", []],
      ["单元素", [edge("e1")]],
      ["多元素", [edge("e1"), edge("e2"), edge("e3")]]
    ] as Array<[string, Edge[]]>) {
      checkInvariants(graphStoreSetEdges(baseStore(), list), label);
    }
  });

  test("edgeIndexById 的索引值与 edgeOrder 位置对应", () => {
    const store = graphStoreSetEdges(baseStore(), [edge("e1"), edge("e2"), edge("e3")]);
    store.edgeOrder.forEach((id, index) => {
      expect(store.edgeIndexById.get(id), `${id} 的索引应为 ${index}`).toBe(index);
    });
  });

  test("★ 重复 id → edgeOrder 保留重复项而 Map 去重（既有事实，不改）", () => {
    // 判定为脏数据表现：模型里 id 唯一（randomId 生成），不会到这里。
    // 修复要么去重（改 edgeOrder 语义）要么加断言（引入新抛错路径）——
    // 都是无收益的行为变更。此处钉住现状供排查。
    const store = graphStoreSetEdges(baseStore(), [edge("e1"), edge("e1")]);
    expect(store.edgeOrder, "edgeOrder 保留重复项").toEqual(["e1", "e1"]);
    expect(store.edgeMap.size, "Map 天然去重").toBe(1);
    // 故 edgeOrder.length !== edgeMap.size —— 明确记录这个不一致
    expect(store.edgeOrder.length).not.toBe(store.edgeMap.size);
  });
});
