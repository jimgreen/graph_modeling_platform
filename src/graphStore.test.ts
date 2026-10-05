// graphStorePatchNodesFromArray（113 处生产调用，此前零直呼）
//
// 这是画布增量更新的热点：每帧拿到新 nodes 数组 + 变化节点 id 列表，
// 只重建受影响的那几个索引。判定写错不报错 —— 只是图层树、拓扑或空间索引
// 该重建时没重建（画面上表现为「拖完不动」「改名字不刷新」）。
import { describe, expect, it } from "vitest";
import {
  buildGraphNodeSpatialIndex,
  createGraphStore,
  graphStoreApplyPatch,
  graphStoreEdges,
  graphStoreNodes,
  graphStorePatchEdges,
  graphStorePatchEdgesFromArray,
  graphStorePatchGraph,
  graphStorePatchGraphFromArrays,
  graphStorePatchNodes,
  graphStorePatchNodesFromArray,
  graphStoreSetGraph,
  graphStoreSetNodes,
  overlayGraphStoreNodes,
  queryGraphStoreNodeSpatialIndex
} from "./graphStore";
import type { GraphNodeSpatialIndex, GraphStore } from "./graphStore";
import type { Edge, ModelNode, Terminal } from "./model";

// ─── 测试辅助 ─────────────────────────────────────────────

function makeTerminal(id: string, anchorX: number, anchorY: number, type: Terminal["type"] = "ac"): Terminal {
  return { id, label: id, type, anchor: { x: anchorX, y: anchorY }, nodeNumber: "" };
}

function makeNode(id: string, overrides: Partial<ModelNode> = {}): ModelNode {
  return {
    id,
    kind: "breaker" as ModelNode["kind"],
    name: id,
    nodeNumber: "",
    acTopologyNode: 0,
    dcTopologyNode: 0,
    position: { x: 0, y: 0 },
    size: { width: 80, height: 40 },
    rotation: 0,
    scale: 1,
    terminals: [makeTerminal("t1", -0.5, 0), makeTerminal("t2", 0.5, 0)],
    params: {},
    ...overrides
  };
}

function makeEdge(id: string, sourceId: string, targetId: string, overrides: Partial<Edge> = {}): Edge {
  return { id, sourceId, targetId, ...overrides };
}

function storeOf(nodes: ModelNode[], edges: Edge[] = []): GraphStore {
  return createGraphStore(nodes, edges);
}

// 母线判定走 busTerminalTypeByNodeIdentity → 组件库候选，只有 ac-bus 命中；
// "busbar"/"bus"/"母线" 都不是（探针实测 isBusNode 均为 false）。
const BUS_KIND = "ac-bus" as ModelNode["kind"];
const DEFAULT_LAYER_KEY = "layer-default";

// ─── createGraphStore 基线 ─────────────────────────────────

describe("graphStore / createGraphStore 基线", () => {
  it("空输入产出空 store，所有 revision 归零", () => {
    const store = storeOf([]);
    expect(store.nodes).toEqual([]);
    expect(store.edges).toEqual([]);
    expect(store.nodeOrder).toEqual([]);
    expect(store.elementTreeRevision).toBe(0);
    expect(store.routeGeometryRevision).toBe(0);
    expect(store.topologyRevision).toBe(0);
  });

  it("nodeIndexById 记录下标，nodeMap 记录对象", () => {
    const a = makeNode("a");
    const store = storeOf([a, makeNode("b")]);
    expect(store.nodeIndexById.get("b")).toBe(1);
    expect(store.nodeMap.get("a")).toBe(a);
  });

  it("母线节点进 busNodeIdSet，只有 ac-bus 算母线", () => {
    const store = storeOf([
      makeNode("a"),
      makeNode("bus", { kind: BUS_KIND }),
      makeNode("假母线", { kind: "busbar" as ModelNode["kind"] })
    ]);
    expect(store.busNodeIdSet.has("bus")).toBe(true);
    expect(store.busNodeIdSet.has("a")).toBe(false);
    expect(store.busNodeIdSet.has("假母线")).toBe(false);
  });

  it("nodesByLayerId 按图层分组，无图层归到 layer-default（不是空串）", () => {
    const store = storeOf([
      makeNode("a", { layerId: "L1" }),
      makeNode("b", { layerId: "L1" }),
      makeNode("c")
    ]);
    expect(store.nodesByLayerId.get("L1")!.map((n) => n.id)).toEqual(["a", "b"]);
    expect(store.nodesByLayerId.get(DEFAULT_LAYER_KEY)!.map((n) => n.id)).toEqual(["c"]);
  });

  it("复制输入数组，不与调用方共享引用", () => {
    const nodes = [makeNode("a")];
    const store = storeOf(nodes);
    expect(store.nodes).not.toBe(nodes);
  });
});

// ─── graphStorePatchNodesFromArray：快路径 ─────────────────

describe("graphStore / graphStorePatchNodesFromArray", () => {
  it("没有 id 命中时返回同一个 store 对象（引用相等）", () => {
    const store = storeOf([makeNode("a")]);
    expect(graphStorePatchNodesFromArray(store, [makeNode("a")], [])).toBe(store);
    expect(graphStorePatchNodesFromArray(store, [makeNode("a")], ["不存在"])).toBe(store);
  });

  it("节点对象未变（引用相同）时返回同一个 store", () => {
    const a = makeNode("a");
    const store = storeOf([a]);
    expect(graphStorePatchNodesFromArray(store, [a], ["a"])).toBe(store);
  });

  it("位置变更 ⇒ 产出新 store，nodes 内容已更新", () => {
    const store = storeOf([makeNode("a", { position: { x: 0, y: 0 } })]);
    const next = storeOf([makeNode("a", { position: { x: 50, y: 60 } })]);
    const patched = graphStorePatchNodesFromArray(store, next.nodes, ["a"]);
    expect(patched).not.toBe(store);
    expect(patched.nodes[0]!.position).toEqual({ x: 50, y: 60 });
    expect(patched.nodeMap.get("a")).toBe(next.nodes[0]);
  });

  it("未变化的节点保持原引用（不整表替换）", () => {
    const a = makeNode("a");
    const b = makeNode("b");
    const store = storeOf([a, b]);
    const nextNodes = [makeNode("a", { position: { x: 9, y: 9 } }), b];
    const patched = graphStorePatchNodesFromArray(store, nextNodes, ["a"]);
    expect(patched.nodes[1]).toBe(b);
  });

  it("顺序不一致时退回整表替换（走 setNodes）", () => {
    const a = makeNode("a");
    const b = makeNode("b");
    const store = storeOf([a, b]);
    const swapped = [makeNode("b", { position: { x: 1, y: 1 } }), makeNode("a")];
    const patched = graphStorePatchNodesFromArray(store, swapped, ["a"]);
    // 整表替换后 nodeOrder 跟着输入走
    expect(patched.nodeOrder).toEqual(["b", "a"]);
    expect(patched.nodeIndexById.get("a")).toBe(1);
  });

  it("长度不一致时同样走整表替换", () => {
    const store = storeOf([makeNode("a"), makeNode("b")]);
    const patched = graphStorePatchNodesFromArray(store, [makeNode("a")], ["a"]);
    expect(patched.nodeOrder).toEqual(["a"]);
  });

  it("重复 id 只生效一次", () => {
    const store = storeOf([makeNode("a", { position: { x: 0, y: 0 } })]);
    const patched = graphStorePatchNodesFromArray(
      store,
      [makeNode("a", { position: { x: 1, y: 1 } })],
      ["a", "a", "a"]
    );
    expect(patched.nodes[0]!.position).toEqual({ x: 1, y: 1 });
  });
});

// ─── revision 递增矩阵 ─────────────────────────────────────

describe("graphStore / revision 递增矩阵", () => {
  const bump = (store: GraphStore, patched: GraphStore) => ({
    elementTree: patched.elementTreeRevision - store.elementTreeRevision,
    routeGeometry: patched.routeGeometryRevision - store.routeGeometryRevision,
    topology: patched.topologyRevision - store.topologyRevision
  });

  const patchOne = (from: ModelNode, to: ModelNode) => {
    const store = storeOf([from]);
    return bump(store, graphStorePatchNodesFromArray(store, [to], [from.id]));
  };

  it("只改 name ⇒ 三个全递增（name 进了 routeGeometry 与 topology 的判定链）", () => {
    expect(patchOne(makeNode("a", { name: "A" }), makeNode("a", { name: "B" }))).toEqual({
      elementTree: 1,
      routeGeometry: 1,
      topology: 1
    });
  });

  it("只改位置 ⇒ topology 与 routeGeometry 递增，elementTree 不动", () => {
    expect(
      patchOne(makeNode("a", { position: { x: 0, y: 0 } }), makeNode("a", { position: { x: 10, y: 10 } }))
    ).toEqual({ elementTree: 0, routeGeometry: 1, topology: 1 });
  });

  it("只改无关参数 ⇒ elementTree 不动，但 routeGeometry 与 topology 仍递增", () => {
    // 看着反直觉：nodeAffectsRouteSpatialBounds / nodeAffectsTopology 是「任一字段不同
    // 就重建」的保守判定，只有 elementTree 那条走 params 逐键比对。多重建一次索引的
    // 代价远小于漏重建，所以这是有意的。
    const result = patchOne(makeNode("a", { params: {} }), makeNode("a", { params: { 随便: "1" } }));
    expect(result).toEqual({ elementTree: 0, routeGeometry: 1, topology: 1 });
  });

  it("换图层 ⇒ 三个全递增", () => {
    const result = patchOne(
      makeNode("a", { layerId: "L1" }),
      makeNode("a", { layerId: "L2" })
    );
    expect(result).toEqual({ elementTree: 1, routeGeometry: 1, topology: 1 });
  });

  it("换 kind ⇒ 三个全递增", () => {
    const result = patchOne(
      makeNode("a", { kind: "breaker" as ModelNode["kind"] }),
      makeNode("a", { kind: "transformer" as ModelNode["kind"] })
    );
    expect(result).toEqual({ elementTree: 1, routeGeometry: 1, topology: 1 });
  });

  it("改 idx ⇒ 三个全递增", () => {
    const result = patchOne(makeNode("a", { params: {} }), makeNode("a", { params: { idx: "3" } }));
    expect(result).toEqual({ elementTree: 1, routeGeometry: 1, topology: 1 });
  });

  it("改标签文字 ⇒ 仅 elementTree 不动", () => {
    const result = patchOne(
      makeNode("a", { params: {} }),
      makeNode("a", { params: { _labelText: "断路器" } })
    );
    expect(result).toEqual({ elementTree: 0, routeGeometry: 1, topology: 1 });
  });

  it("改端子锚点 ⇒ elementTree 不动（它只比端子 id 与属性，不比 anchor）", () => {
    const result = patchOne(
      makeNode("a", { terminals: [makeTerminal("t1", -0.5, 0)] }),
      makeNode("a", { terminals: [makeTerminal("t1", 0.5, 0)] })
    );
    expect(result).toEqual({ elementTree: 0, routeGeometry: 1, topology: 1 });
  });

  it("改旋转 ⇒ 三个全递增（几何变了）", () => {
    const result = patchOne(makeNode("a", { rotation: 0 }), makeNode("a", { rotation: 90 }));
    expect(result).toEqual({ elementTree: 0, routeGeometry: 1, topology: 1 });
  });

  it("同一批里多个节点各自触发时，revision 只加一次", () => {
    const store = storeOf([makeNode("a", { name: "A" }), makeNode("b", { name: "B" })]);
    const next = [makeNode("a", { name: "A2" }), makeNode("b", { name: "B2" })];
    const patched = graphStorePatchNodesFromArray(store, next, ["a", "b"]);
    expect(patched.elementTreeRevision - store.elementTreeRevision).toBe(1);
  });
});

// ─── 派生索引跟随更新 ─────────────────────────────────────

describe("graphStore / 派生索引跟随节点更新", () => {
  it("改图层后 nodesByLayerId 跟着搬家，源图层的空桶被删除（不留空数组）", () => {
    const store = storeOf([makeNode("a", { layerId: "L1" })]);
    const patched = graphStorePatchNodesFromArray(store, [makeNode("a", { layerId: "L2" })], ["a"]);
    expect(patched.nodesByLayerId.has("L1")).toBe(false);
    expect(patched.nodesByLayerId.get("L2")!.map((n) => n.id)).toEqual(["a"]);
  });

  it("改 kind 成母线后进 busNodeIdSet，改回后移出", () => {
    const store = storeOf([makeNode("a")]);
    const toBus = graphStorePatchNodesFromArray(store, [makeNode("a", { kind: BUS_KIND })], ["a"]);
    expect(toBus.busNodeIdSet.has("a")).toBe(true);
    const back = graphStorePatchNodesFromArray(toBus, [makeNode("a")], ["a"]);
    expect(back.busNodeIdSet.has("a")).toBe(false);
  });

  it("位置变更会更新空间索引的包围盒", () => {
    const store = storeOf([makeNode("a", { position: { x: 0, y: 0 } })]);
    const before = store.nodeSpatialIndex.nodeBoundsById.get("a")!;
    const patched = graphStorePatchNodesFromArray(
      store,
      [makeNode("a", { position: { x: 500, y: 500 } })],
      ["a"]
    );
    const after = patched.nodeSpatialIndex.nodeBoundsById.get("a")!;
    expect(after).not.toBe(before);
    expect(after.left).toBeGreaterThan(before.left);
    expect(after.top).toBeGreaterThan(before.top);
  });

  it("overlayGraphStoreNodes 返回新数组（不是新 store），只覆盖命中的位置", () => {
    const store = storeOf([makeNode("a", { position: { x: 0, y: 0 } }), makeNode("b")]);
    const overlaid = overlayGraphStoreNodes(store, [makeNode("a", { position: { x: 7, y: 8 } })]);
    expect(overlaid[0]!.position).toEqual({ x: 7, y: 8 });
    expect(overlaid[1]!.id).toBe("b");
    expect(overlaid).not.toBe(store.nodes);
    // store 本身不被改动
    expect(store.nodes[0]!.position).toEqual({ x: 0, y: 0 });
  });

  it("overlayGraphStoreNodes 忽略不存在的 id 与未变节点，原数组直接返回", () => {
    const a = makeNode("a");
    const store = storeOf([a]);
    expect(overlayGraphStoreNodes(store, [makeNode("幽灵")])).toBe(store.nodes);
    expect(overlayGraphStoreNodes(store, [a])).toBe(store.nodes);
  });
});

// ─── graphStorePatchNodes（与 FromArray 同逻辑的另一入口）──

describe("graphStore / graphStorePatchNodes", () => {
  it("与 FromArray 版产出一致的 store（只差取节点方式）", () => {
    const from = makeNode("a", { position: { x: 0, y: 0 } });
    const store = storeOf([from]);
    const next = makeNode("a", { position: { x: 30, y: 40 } });

    const viaArray = graphStorePatchNodesFromArray(store, [next], ["a"]);
    const viaIterable = graphStorePatchNodes(store, [next]);

    expect(viaIterable.nodes).toEqual(viaArray.nodes);
    expect(viaIterable.nodeMap).toEqual(viaArray.nodeMap);
    expect(viaIterable.elementTreeRevision).toBe(viaArray.elementTreeRevision);
    expect(viaIterable.routeGeometryRevision).toBe(viaArray.routeGeometryRevision);
    expect(viaIterable.topologyRevision).toBe(viaArray.topologyRevision);
  });

  it("未知 id 与未变节点都返回原 store 引用", () => {
    const a = makeNode("a");
    const store = storeOf([a]);
    expect(graphStorePatchNodes(store, [])).toBe(store);
    expect(graphStorePatchNodes(store, [a])).toBe(store);
    expect(graphStorePatchNodes(store, [makeNode("幽灵")])).toBe(store);
  });

  it("不依赖 nodes 数组顺序：乱序输入仍按 id 定位", () => {
    const store = storeOf([makeNode("a"), makeNode("b")]);
    const patched = graphStorePatchNodes(store, [makeNode("b", { name: "B2" })]);
    expect(patched.nodeIndexById.get("b")).toBe(1);
    expect(patched.nodes[1]!.name).toBe("B2");
    expect(patched.nodes[0]!.name).toBe("a");
  });
});

// ─── 两入口共用同一内核后的等价性 ─────────────────────────

describe("graphStore / FromArray 与 iterable 两入口逐字段等价", () => {
  // 这是把两份拷贝合成一份内核之后最该被钉住的不变式：两条路径必须给出
  // **完全相同**的 store。逐字段比而不是 toEqual，是为了 Map/Set 的引用不同
  // 也能比出内容差异（toEqual 对 Map 比的是内容，够用；但数组身份要单独断）。
  const compareStores = (left: GraphStore, right: GraphStore) => {
    expect(right.nodeOrder).toEqual(left.nodeOrder);
    expect(right.edgeOrder).toEqual(left.edgeOrder);
    expect([...right.nodeMap.keys()]).toEqual([...left.nodeMap.keys()]);
    expect([...right.edgeMap.keys()]).toEqual([...left.edgeMap.keys()]);
    expect([...right.nodeIndexById]).toEqual([...left.nodeIndexById]);
    expect([...right.edgeIndexById]).toEqual([...left.edgeIndexById]);
    expect([...right.nodeIdSet]).toEqual([...left.nodeIdSet]);
    expect([...right.edgeIdSet]).toEqual([...left.edgeIdSet]);
    expect(right.nodes).toEqual(left.nodes);
    expect(right.edges).toEqual(left.edges);
    expect([...right.nodesByLayerId]).toEqual([...left.nodesByLayerId]);
    expect([...right.busNodeIdSet]).toEqual([...left.busNodeIdSet]);
    expect([...right.edgesByNodeId]).toEqual([...left.edgesByNodeId]);
    expect([...right.edgesByTerminalRef]).toEqual([...left.edgesByTerminalRef]);
    expect(right.elementTreeRevision).toBe(left.elementTreeRevision);
    expect(right.edgeEndpointRevision).toBe(left.edgeEndpointRevision);
    expect(right.routeGeometryRevision).toBe(left.routeGeometryRevision);
    expect(right.topologyRevision).toBe(left.topologyRevision);
    expect([...right.nodeSpatialIndex.nodeBoundsById]).toEqual([...left.nodeSpatialIndex.nodeBoundsById]);
    expect([...right.nodeSpatialIndex.nodeBucketKeysById]).toEqual([...left.nodeSpatialIndex.nodeBucketKeysById]);
  };

  const nodeCases: Array<[string, Partial<ModelNode>, Partial<ModelNode>]> = [
    ["位置", { position: { x: 0, y: 0 } }, { position: { x: 120, y: 80 } }],
    ["名称", { name: "A" }, { name: "B" }],
    ["图层", { layerId: "L1" }, { layerId: "L2" }],
    ["旋转", { rotation: 0 }, { rotation: 90 }],
    ["kind", { kind: "breaker" as ModelNode["kind"] }, { kind: "ac-bus" as ModelNode["kind"] }],
    ["idx", { params: {} }, { params: { idx: "4" } }],
    ["无关参数", { params: {} }, { params: { 随便: "x" } }],
    ["端子锚点", { terminals: [makeTerminal("t1", -0.5, 0)] }, { terminals: [makeTerminal("t1", 0.5, 0)] }]
  ];

  for (const [label, from, to] of nodeCases) {
    it(`节点侧：只改${label}时两入口结果一致`, () => {
      const store = storeOf([makeNode("a", from), makeNode("b")]);
      const next = makeNode("a", to);
      const viaArray = graphStorePatchNodesFromArray(store, [next, store.nodes[1]!], ["a"]);
      const viaIterable = graphStorePatchNodes(store, [next]);
      compareStores(viaArray, viaIterable);
    });
  }

  it("节点侧：一次改多个节点时两入口结果一致", () => {
    const store = storeOf([makeNode("a"), makeNode("b"), makeNode("c")]);
    const next = [makeNode("a", { position: { x: 1, y: 1 } }), makeNode("b", { name: "B2" }), makeNode("c", { kind: "ac-bus" as ModelNode["kind"] })];
    const viaArray = graphStorePatchNodesFromArray(store, next, ["a", "b", "c"]);
    const viaIterable = graphStorePatchNodes(store, next);
    compareStores(viaArray, viaIterable);
  });

  const edgeCases: Array<[string, Partial<Edge>, Partial<Edge>]> = [
    ["换端点", { sourceId: "a", targetId: "b" }, { sourceId: "a", targetId: "c" }],
    ["换端子", { sourceTerminalId: "t1" }, { sourceTerminalId: "t2" }],
    ["只改拐点", { manualPoints: [] }, { manualPoints: [{ x: 1, y: 2 }] }],
    ["同端点同端子", {}, {}]
  ];

  for (const [label, from, to] of edgeCases) {
    it(`边侧：${label}时两入口结果一致`, () => {
      const base: Partial<Edge> = { sourceId: "a", targetId: "b", ...from };
      const store = storeOf([makeNode("a"), makeNode("b"), makeNode("c")], [makeEdge("e1", "a", "b", base)]);
      const next = makeEdge("e1", "a", "b", { ...base, ...to, id: "e1" });
      const viaArray = graphStorePatchEdgesFromArray(store, [next], ["e1"]);
      const viaIterable = graphStorePatchEdges(store, [next]);
      compareStores(viaArray, viaIterable);
    });
  }

  it("两入口都不命中时也都返回原 store 引用", () => {
    const store = storeOf([makeNode("a")], [makeEdge("e1", "a", "a")]);
    expect(graphStorePatchNodesFromArray(store, store.nodes, ["幽灵"])).toBe(store);
    expect(graphStorePatchNodes(store, [makeNode("幽灵")])).toBe(store);
    expect(graphStorePatchEdgesFromArray(store, store.edges, ["幽灵"])).toBe(store);
    expect(graphStorePatchEdges(store, [makeEdge("幽灵", "a", "a")])).toBe(store);
  });
});

// ─── 边侧对应入口 ─────────────────────────────────────────

describe("graphStore / graphStorePatchEdgesFromArray", () => {
  it("没有 id 命中时返回同一个 store", () => {
    const store = storeOf([makeNode("a"), makeNode("b")], [makeEdge("e1", "a", "b")]);
    expect(graphStorePatchEdgesFromArray(store, store.edges, [])).toBe(store);
  });

  it("边对象未变时返回同一个 store", () => {
    const edge = makeEdge("e1", "a", "b");
    const store = storeOf([makeNode("a"), makeNode("b")], [edge]);
    expect(graphStorePatchEdgesFromArray(store, [edge], ["e1"])).toBe(store);
  });

  it("改端点后 edgesByNodeId 跟着搬家", () => {
    const store = storeOf(
      [makeNode("a"), makeNode("b"), makeNode("c")],
      [makeEdge("e1", "a", "b")]
    );
    const patched = graphStorePatchEdgesFromArray(store, [makeEdge("e1", "a", "c")], ["e1"]);
    expect(patched.edgesByNodeId.has("b")).toBe(false);
    expect(patched.edgesByNodeId.get("c")!.map((e) => e.id)).toEqual(["e1"]);
    expect(patched.edgesByNodeId.get("a")!.map((e) => e.id)).toEqual(["e1"]);
  });

  it("改端子引用会递增 edgeEndpointRevision", () => {
    const store = storeOf(
      [makeNode("a"), makeNode("b")],
      [makeEdge("e1", "a", "b", { sourceTerminalId: "t1" })]
    );
    const patched = graphStorePatchEdgesFromArray(
      store,
      [makeEdge("e1", "a", "b", { sourceTerminalId: "t2" })],
      ["e1"]
    );
    expect(patched.edgeEndpointRevision).toBe(store.edgeEndpointRevision + 1);
  });

  it("边顺序不一致时退回整表替换", () => {
    const store = storeOf(
      [makeNode("a"), makeNode("b")],
      [makeEdge("e1", "a", "b"), makeEdge("e2", "a", "b")]
    );
    const patched = graphStorePatchEdgesFromArray(
      store,
      [makeEdge("e2", "a", "b"), makeEdge("e1", "a", "b")],
      ["e1"]
    );
    expect(patched.edgeOrder).toEqual(["e2", "e1"]);
    expect(patched.edgeIndexById.get("e1")).toBe(1);
  });
});


// graphStoreNodes / graphStoreEdges：读当前节点与边列表的两个访问器。
// 此前零直呼。它们的价值全在「原样返回同一个数组」上 —— 渲染层拿它跟 store 里的引用比，
// 一旦改成复制或过滤，节点更新后画布仍显示旧数据，且没有任何报错。
describe("graphStore / 访问器返回同一引用", () => {
  it("nodes / edges 都是 store 里那个数组本身，不是副本", () => {
    const nodes = [makeNode("n1"), makeNode("n2")];
    const edges = [makeEdge("e1", "n1", "n2")];
    const store = createGraphStore(nodes, edges);

    expect(graphStoreNodes(store)).toBe(store.nodes);
    expect(graphStoreEdges(store)).toBe(store.edges);
    // 两次读拿到的是同一个引用（不是两次各复制一份）
    expect(graphStoreNodes(store)).toBe(graphStoreNodes(store));
  });

  it("空画布返回空数组（不是 undefined）", () => {
    const store = createGraphStore([], []);
    expect(graphStoreNodes(store)).toEqual([]);
    expect(graphStoreEdges(store)).toEqual([]);
  });

  it("★ 更新节点后访问器跟着 store 走（旧引用不更新，符合「store 不可变」语义）", () => {
    const store = createGraphStore([makeNode("n1")], []);
    const before = graphStoreNodes(store);
    const after = graphStoreNodes(graphStoreSetNodes(store, [makeNode("n1"), makeNode("n2")]));

    expect(before).toHaveLength(1);
    expect(after).toHaveLength(2);
    expect(after).not.toBe(before);
  });
});

// ─── 组合更新与补丁分支 ────────────────────────────────────

describe("graphStore / 组合更新与补丁", () => {
  it("setGraph 同时替换节点与边，并保持输入数组不可共享", () => {
    const store = storeOf([makeNode("a")], [makeEdge("e1", "a", "a")]);
    const nodes = [makeNode("b")];
    const edges = [makeEdge("e2", "b", "b")];
    const patched = graphStoreSetGraph(store, nodes, edges);

    expect(patched).not.toBe(store);
    expect(patched.nodes).toEqual(nodes);
    expect(patched.edges).toEqual(edges);
    expect(patched.nodes).not.toBe(nodes);
    expect(patched.edges).not.toBe(edges);
    expect(store.nodes).toEqual([expect.objectContaining({ id: "a" })]);
    expect(store.edges).toEqual([expect.objectContaining({ id: "e1" })]);
  });

  it("applyPatch 空补丁返回原引用，节点补丁不共享旧数组", () => {
    const node = makeNode("a");
    const store = storeOf([node], [makeEdge("e1", "a", "a")]);
    expect(graphStoreApplyPatch(store, {})).toBe(store);

    const next = graphStoreApplyPatch(store, { nodeUpdates: [makeNode("a", { name: "A2" })] });
    expect(next).not.toBe(store);
    expect(next.nodes).not.toBe(store.nodes);
    expect(store.nodes[0]).toBe(node);
    expect(next.nodes[0]!.name).toBe("A2");
    expect(next.edges).toBe(store.edges);
  });

  it("applyPatch 对已有边走增量更新，对删除和新增边走整表重建", () => {
    const store = storeOf([makeNode("a"), makeNode("b")], [makeEdge("e1", "a", "b")]);
    const updated = makeEdge("e1", "a", "b", { manualPoints: [{ x: 2, y: 3 }] });
    const patched = graphStoreApplyPatch(store, { edgeUpserts: [updated] });
    expect(patched).not.toBe(store);
    expect(patched.edgeMap.get("e1")).toBe(updated);
    expect(patched.edgeOrder).toEqual(["e1"]);

    const deleted = graphStoreApplyPatch(patched, { edgeDeleteIds: ["e1"] });
    expect(deleted.edgeOrder).toEqual([]);
    expect(deleted.edges).not.toBe(patched.edges);

    const added = graphStoreApplyPatch(deleted, { edgeUpserts: [makeEdge("e2", "a", "b")] });
    expect(added.edgeOrder).toEqual(["e2"]);
    expect(added.edgeMap.get("e2")!.id).toBe("e2");
  });

  it("applyPatch 删除未知边仍保持删除语义，新增 upsert 按输入顺序追加", () => {
    const store = storeOf([makeNode("a"), makeNode("b")], [makeEdge("e1", "a", "b")]);
    const added = makeEdge("e2", "a", "b");
    const next = graphStoreApplyPatch(store, { edgeDeleteIds: ["ghost"], edgeUpserts: [added] });
    expect(next.edgeOrder).toEqual(["e1", "e2"]);
    expect(next.edges[0]).toBe(store.edges[0]);
    expect(next.edges[1]).toBe(added);
    expect(next.edges).not.toBe(store.edges);
  });

  it("patchGraph 两侧都走增量内核，空输入保留原引用", () => {
    const store = storeOf([makeNode("a")], [makeEdge("e1", "a", "a")]);
    expect(graphStorePatchGraph(store, [], [])).toBe(store);
    const nextNode = makeNode("a", { position: { x: 11, y: 12 } });
    const nextEdge = makeEdge("e1", "a", "a", { manualPoints: [{ x: 1, y: 1 }] });
    const patched = graphStorePatchGraph(store, [nextNode], [nextEdge]);
    expect(patched).not.toBe(store);
    expect(patched.nodes[0]).toBe(nextNode);
    expect(patched.edges[0]).toBe(nextEdge);
    expect(store.nodes[0]).not.toBe(nextNode);
    expect(store.edges[0]).not.toBe(nextEdge);
  });

  it("patchGraphFromArrays 按 id 列表更新，并在数组顺序变化时退回整表", () => {
    const store = storeOf([makeNode("a"), makeNode("b")], [makeEdge("e1", "a", "b"), makeEdge("e2", "b", "a")]);
    const nodes = [makeNode("a", { name: "A2" }), makeNode("b")];
    const edges = [makeEdge("e1", "a", "b", { manualPoints: [{ x: 4, y: 5 }] }), makeEdge("e2", "b", "a")];
    const patched = graphStorePatchGraphFromArrays(store, nodes, edges, ["a"], ["e1"]);
    expect(patched.nodes[0]).toBe(nodes[0]);
    expect(patched.edges[0]).toBe(edges[0]);

    const reordered = graphStorePatchGraphFromArrays(patched, [nodes[1], nodes[0]], edges, ["a"], ["e1"]);
    expect(reordered.nodeOrder).toEqual(["b", "a"]);
    expect(reordered.nodeIndexById.get("a")).toBe(1);
  });
});

// ─── 三条 params 相关性谓词的边界断言 ─────────────────────
//
// 目标谓词（全部**未导出**，是模块私有 const）：
//   elementTreeParamRelevant   (graphStore.ts:340) —— key === "idx" || startsWith("idx_")
//                                                     || startsWith("name_") || === "is_container"
//   routeGeometryParamRelevant (graphStore.ts:343) —— 一串 key === 字面量，全小写下划线驼峰
//   topologyParamRelevant      (graphStore.ts:358) —— **唯一先 key.toLowerCase()** 的一条
//
// 观察办法（不是重写一份实现再断言它）：三者唯一的出口是 nodeParamsChangedBy →
// nodeAffectsElementTree / nodeAffectsRouteSpatialBounds / nodeAffectsTopology →
// next*RevisionForNodes → 三个 revision 字段，全部是 GraphStore 的公开可读字段。
//
// 关键技巧：nodeAffects* 里那些字段判定全是**引用不等**（position !== / size !== /
// rotation !== / scale !== / terminals !==），所以让前后两个节点共用同一批
// position / size / terminals 引用、只换 params 对象，判定就只剩 params 一条路，
// 三个 revision 的增量（各 0 或 1）逐一对应三条谓词的返回值。探针实测 44 个键，
// 全部与源码逐条对照吻合。
//
// 不能用本文件既有的 makeNode：它每次调用都新建 position / size / terminals 引用，
// 于是「字段不同」这条 OR 分支恒真，把三条谓词完全遮住（任何键都会让三个 revision
// 全递增，谓词写错也照样绿）。

describe("graphStore / params 相关性谓词的边界（经 revision 增量观察）", () => {
  // 共享引用常量 —— 这是让 nodeAffects* 的字段分支恒为 false 的前提。
  const SHARED_POSITION = { x: 0, y: 0 };
  const SHARED_SIZE = { width: 80, height: 40 };
  const SHARED_TERMINALS: Terminal[] = [
    { id: "t1", label: "t1", type: "ac", anchor: { x: -0.5, y: 0 }, nodeNumber: "" }
  ];

  const baseNode = (params: Record<string, string>): ModelNode => ({
    id: "a",
    kind: "breaker" as ModelNode["kind"],
    name: "a",
    nodeNumber: "",
    acTopologyNode: 0,
    dcTopologyNode: 0,
    position: SHARED_POSITION,
    size: SHARED_SIZE,
    rotation: 0,
    scale: 1,
    terminals: SHARED_TERMINALS,
    params
  });

  const deltas = (store: GraphStore, patched: GraphStore) => ({
    elementTree: patched.elementTreeRevision - store.elementTreeRevision,
    routeGeometry: patched.routeGeometryRevision - store.routeGeometryRevision,
    topology: patched.topologyRevision - store.topologyRevision
  });

  // 这个 helper 不含任何 ?? / || / 默认参数归一化 —— params 的值原样进入
  // nodeParamsChangedBy 的 !== 比对，所以「某键是否被谓词认可」是唯一变量。
  const probeParams = (keys: readonly string[]) => {
    const params: Record<string, string> = {};
    for (const key of keys) {
      params[key] = "1";
    }
    const store = createGraphStore([baseNode({})], []);
    return deltas(store, graphStoreSetNodes(store, [baseNode(params)]));
  };
  const probeKey = (key: string) => probeParams([key]);

  const NOTHING = { elementTree: 0, routeGeometry: 0, topology: 0 };

  // ── 观察通道自身的有效性：不变量是「三个 revision 只可能被这一条谓词推动」 ──

  it("探针自检：前一个节点的字段全被新节点覆盖时，三个 revision 才可能同时不动", () => {
    // 反面对照：若改用会新建引用的构造方式，任意键都会把三个 revision 全部推高，
    // 谓词就观察不到了。这条断言把「观察通道有效」本身钉住。
    expect(probeKey("random_key")).toEqual(NOTHING);
  });

  it("探针自检：同一份 position / size / terminals 引用被真正复用（不是碰巧相等）", () => {
    const first = baseNode({});
    const second = baseNode({ random_key: "1" });
    expect(second.position).toBe(first.position);
    expect(second.size).toBe(first.size);
    expect(second.terminals).toBe(first.terminals);
  });

  // ── ① 大小写敏感性不对称 ──────────────────────────────────

  it("elementTreeParamRelevant 大小写敏感：idx 命中，IDX 与 Idx 都不命中", () => {
    // 正反两侧都在：只有小写这一侧的话，给谓词加上 toLowerCase 的变异会恒绿。
    expect(probeKey("idx")).toEqual({ elementTree: 1, routeGeometry: 0, topology: 0 });
    expect(probeKey("IDX")).toEqual(NOTHING);
    expect(probeKey("Idx")).toEqual(NOTHING);
  });

  it("elementTreeParamRelevant 的两条 startsWith 前缀同样大小写敏感", () => {
    expect(probeKey("idx_1")).toEqual({ elementTree: 1, routeGeometry: 0, topology: 0 });
    expect(probeKey("IDX_1")).toEqual(NOTHING);

    expect(probeKey("name_x")).toEqual({ elementTree: 1, routeGeometry: 0, topology: 0 });
    expect(probeKey("NAME_X")).toEqual(NOTHING);
  });

  it("elementTreeParamRelevant 的 is_container 全等判定同样大小写敏感", () => {
    expect(probeKey("is_container")).toEqual({ elementTree: 1, routeGeometry: 0, topology: 0 });
    expect(probeKey("IS_CONTAINER")).toEqual(NOTHING);
  });

  it("elementTreeParamRelevant 的 startsWith 是逐前缀匹配，不会被 idxx 蹭到", () => {
    // key === "idx" 与 key.startsWith("idx_") 是两条独立判定：idxx 既不等于 idx
    // 也不以 idx_ 开头，所以前缀相似不等于命中。
    expect(probeKey("idxx")).toEqual(NOTHING);
  });

  it("routeGeometryParamRelevant 大小写敏感：_labelText 命中，_LABELTEXT 与 _LabelText 都不命中", () => {
    expect(probeKey("_labelText")).toEqual({ elementTree: 0, routeGeometry: 1, topology: 0 });
    expect(probeKey("_LABELTEXT")).toEqual(NOTHING);
    expect(probeKey("_LabelText")).toEqual(NOTHING);
  });

  it("routeGeometryParamRelevant 尾部大小写同样敏感：_labelX 命中，_labelx 不命中", () => {
    // 只测首字母大小写会漏掉这一维：改的是键尾，谓词照样应当不认。
    expect(probeKey("_labelX")).toEqual({ elementTree: 0, routeGeometry: 1, topology: 0 });
    expect(probeKey("_labelx")).toEqual(NOTHING);
  });

  it("routeGeometryParamRelevant 的其余字面量键同样大小写敏感", () => {
    // _routableLinePoints 来自 model.ts 的 ROUTABLE_LINE_POINTS_PARAM 常量，
    // 谓词比的是常量值本身，参数名的大写变体不命中。
    expect(probeKey("_routableLinePoints")).toEqual({ elementTree: 0, routeGeometry: 1, topology: 0 });
    expect(probeKey("_ROUTABLELINEPOINTS")).toEqual(NOTHING);

    expect(probeKey("backgroundImage")).toEqual({ elementTree: 0, routeGeometry: 1, topology: 0 });
    expect(probeKey("BACKGROUNDIMAGE")).toEqual(NOTHING);
  });

  it("★ 不对称本身：同一批键里，小写变体只推 elementTree/routeGeometry，而大写变体只推 topology", () => {
    // 这一条把「三条谓词大小写处理不一致」钉成一个可观察的事实：
    //   小写 idx + _labelText + status  → e=1 r=1 t=1（三条谓词各自都认）
    //   大写 IDX + _LABELTEXT + STATUS  → e=0 r=0 t=1（只有 topology 那条做了小写归一）
    expect(probeParams(["idx", "_labelText", "status"])).toEqual({
      elementTree: 1,
      routeGeometry: 1,
      topology: 1
    });
    expect(probeParams(["IDX", "_LABELTEXT", "STATUS"])).toEqual({
      elementTree: 0,
      routeGeometry: 0,
      topology: 1
    });
  });

  it("topologyParamRelevant 是唯一做小写归一的：status 的三种大小写全部命中", () => {
    for (const key of ["status", "STATUS", "Status"]) {
      expect(probeKey(key)).toEqual({ elementTree: 0, routeGeometry: 0, topology: 1 });
    }
  });

  it("topologyParamRelevant 的全等字面量键任意大小写都命中", () => {
    const pairs = [
      ["run_stat", "RUN_STAT"],
      ["control_type", "CONTROL_TYPE"],
      ["i_control_type", "I_CONTROL_TYPE"],
      ["j_control_type", "J_CONTROL_TYPE"],
      ["ac_control_type", "AC_CONTROL_TYPE"],
      ["dc_control_type", "DC_CONTROL_TYPE"]
    ] as const;
    for (const [lower, upper] of pairs) {
      expect(probeKey(lower).topology, lower).toBe(1);
      expect(probeKey(upper).topology, upper).toBe(1);
    }
  });

  it("topologyParamRelevant 的 includes 分支也走小写归一：x_vbase_y 只有它能命中", () => {
    // x_vbase_y 既不等于任何一个字面量、也不以 v_set 结尾 —— 删掉 includes("vbase")
    // 这一条它就会掉到 0，所以它是 includes 分支的判别输入（不是恒绿的陪衬）。
    expect(probeKey("vbase").topology).toBe(1);
    expect(probeKey("VBASE").topology).toBe(1);
    expect(probeKey("VBase").topology).toBe(1);
    expect(probeKey("x_vbase_y").topology).toBe(1);
    expect(probeKey("X_VBASE_Y").topology).toBe(1);
  });

  it("topologyParamRelevant 的 includes 不认 v_base（中间的下划线不是可省的）", () => {
    // 归一化只做小写，不做分隔符折叠：V_BASE 归一后是 v_base，既不含 vbase 也不以 v_set 结尾。
    expect(probeKey("V_BASE")).toEqual(NOTHING);
  });

  // ── ② 被 endsWith(v_set) 完全覆盖的 v_set 全等分支 ─────────

  it("★ endsWith(v_set) 是承重分支：只有它能命中的那批键全靠它", () => {
    // custom_v_set / _v_set / vbase_v_set 三者都不等于源码里任何一个字面量，
    // 也不含 vbase 子串，因此唯一能让它们为 true 的就是 endsWith("v_set")。
    // 删掉该子句这三条会全掉到 0 —— 这是本组断言里唯一真正咬得住的变异。
    expect(probeKey("custom_v_set")).toEqual({ elementTree: 0, routeGeometry: 0, topology: 1 });
    expect(probeKey("_v_set")).toEqual({ elementTree: 0, routeGeometry: 0, topology: 1 });
    expect(probeKey("vbase_v_set")).toEqual({ elementTree: 0, routeGeometry: 0, topology: 1 });
    // 大写变体一并覆盖：承重子句读的是小写归一后的字符串。
    expect(probeKey("CUSTOM_V_SET").topology).toBe(1);
    expect(probeKey("xv_set").topology).toBe(1);
  });

  it("v_set 后缀判定不含糊：v_set2 / v_setx / vset 都不命中（是 endsWith 不是 includes）", () => {
    // 判别「后缀」这一维度：把 endsWith 换成 includes("v_set") 会让这三个变成 1。
    expect(probeKey("v_set2")).toEqual(NOTHING);
    expect(probeKey("v_setx")).toEqual(NOTHING);
    expect(probeKey("vset")).toEqual(NOTHING);
  });

  it("v_set 后缀判定跨过了下划线：ac_v_set / dc_v_set 以 _v_set 收尾，命中", () => {
    // 这两个键的末五位正是 "v_set"（ac_v_set = a c _ v _ s e t，末五位 v _ s e t）。
    expect(probeKey("ac_v_set").topology).toBe(1);
    expect(probeKey("dc_v_set").topology).toBe(1);
  });

  it("★ v_ac_set / v_dc_set 不靠 endsWith，靠的是自己的全等子句（承重，删掉必红）", () => {
    // ⚠️ 修正一个容易想当然的推断：**并非**所有 v_set 全等子句都被 endsWith 覆盖。
    //   "v_ac_set" 的末五位是 "c_set"（8 字符 v _ a c _ s e t），不是 "v_set"，
    //   所以 normalized.endsWith("v_set") 对它是 false；它能命中全靠
    //   normalized === "v_ac_set" 这一条。删掉该子句这两条断言立刻转红。
    //   同理 "v_dc_set"。
    expect("v_set".endsWith("v_set")).toBe(true);
    expect("v_ac_set".endsWith("v_set")).toBe(false);
    expect("v_dc_set".endsWith("v_set")).toBe(false);

    expect(probeKey("v_ac_set").topology).toBe(1);
    expect(probeKey("v_dc_set").topology).toBe(1);
    expect(probeKey("V_AC_SET").topology).toBe(1);
  });

  it("回归锁：v_set / ac_v_set / dc_v_set 三个全等子句恒被 endsWith 覆盖", () => {
    // ⚠️ 这三条断言**按构造不会转红**，只作回归锁，不要拿它们当判别力证据。
    // 源码里 normalized === "v_set" / "ac_v_set" / "dc_v_set" 排在
    // normalized.endsWith("v_set") 之后，而两者读的是同一个 normalized。
    // 可证明的等价关系（endsWith 对「自身」与「以该串收尾」的字符串恒为真）：
    //   · "v_set".endsWith("v_set")     → true（与自身相等）
    //   · "ac_v_set".endsWith("v_set")  → true（末五位为 "v_set"）
    //   · "dc_v_set".endsWith("v_set")  → true（末五位为 "v_set"）
    // 于是删掉这三条 === 子句，任何输入下的可观察量都不变 ⇒ 变异必然 GREEN。
    // 这是**可证明的等价变异**，不是输入维度缺失；承重证据在上一条（v_ac_set）
    // 与「endsWith 是承重分支」那一条。
    const covered = ["v_set", "ac_v_set", "dc_v_set"];
    for (const key of covered) {
      expect(probeKey(key).topology, key).toBe(1);
      expect(probeKey(key.toUpperCase()).topology, key.toUpperCase()).toBe(1);
    }
  });
});

// ─── nodeElementTreeTerminalsChanged：按长度递增 elementTree ────
//
// 观察通道仍是三个 revision 的增量。nodeAffectsElementTree 里 position / size /
// rotation / scale 全是引用不等，所以前后两个节点共用同一批引用（SHARED_*）、
// 只换 terminals 数组，elementTree 的增量就只剩 terminals 这一条路可推。

describe("graphStore / nodeElementTreeTerminalsChanged 的长度分支", () => {
  const SHARED_POSITION = { x: 0, y: 0 };
  const SHARED_SIZE = { width: 80, height: 40 };
  const SHARED_PARAMS: Record<string, string> = {};

  const terminal = (id: string, anchorX: number): Terminal => ({
    id,
    label: id,
    type: "ac",
    anchor: { x: anchorX, y: 0 },
    nodeNumber: ""
  });

  const nodeWith = (terminals: Terminal[]): ModelNode => ({
    id: "a",
    kind: "breaker" as ModelNode["kind"],
    name: "a",
    nodeNumber: "",
    acTopologyNode: 0,
    dcTopologyNode: 0,
    position: SHARED_POSITION,
    size: SHARED_SIZE,
    rotation: 0,
    scale: 1,
    terminals,
    params: SHARED_PARAMS
  });

  const TWO = [terminal("t1", -0.5), terminal("t2", 0.5)];
  const ONE = [terminal("t1", -0.5)];
  const NOTHING = { elementTree: 0, routeGeometry: 0, topology: 0 };

  const probe = (previousTerminals: Terminal[], nextTerminals: Terminal[]) => {
    const store = createGraphStore([nodeWith(previousTerminals)], []);
    const patched = graphStoreSetNodes(store, [nodeWith(nextTerminals)]);
    return {
      elementTree: patched.elementTreeRevision - store.elementTreeRevision,
      routeGeometry: patched.routeGeometryRevision - store.routeGeometryRevision,
      topology: patched.topologyRevision - store.topologyRevision
    };
  };

  it("端子变多时 elementTree 递增（唯一能咬住长度分支的方向）", () => {
    // ⚠️ 方向很关键：必须是 **next 更长**（ONE → TWO）。
    //   some 循环遍历的是 previousNode.terminals，长度不等时它只看得到前 N 个，
    //   所以 ONE → TWO 时循环全项相等、返回 false —— elementTree 只能由
    //   `previousNode.terminals.length !== nextNode.terminals.length` 推高。
    //   （反过来 TWO → ONE 时 some 循环会撞上 nextTerminal === undefined，
    //   经 `terminal.id !== nextTerminal?.id` 同样返回 true，见下一条。）
    const result = probe(ONE, TWO);
    expect(result.elementTree).toBe(1);
    expect(result.routeGeometry).toBe(1);
    expect(result.topology).toBe(1);
  });

  it("端子变少时 elementTree 也递增，但那条路径与长度分支无关（回归锁）", () => {
    // ⚠️ 按构造对「删掉长度分支」的变异**恒绿**，别拿它当判别力证据：
    //   TWO → ONE 时 some 循环在 index=1 看到 nextTerminal 为 undefined，
    //   `terminal.id !== nextTerminal?.id` 判为 true，返回值与走长度分支完全相同。
    //   承重证据在上一条（ONE → TWO）。
    const result = probe(TWO, ONE);
    expect(result.elementTree).toBe(1);
    expect(result.routeGeometry).toBe(1);
    expect(result.topology).toBe(1);
  });

  it("反面对照：数量不变、只有 anchor 移动时 elementTree 不动", () => {
    // 同长度 + 只有 anchor.x 不同：elementTree 的 some 循环看的是
    // id / label / type，看不到 anchor ⇒ 必须为 0，否则说明它错把 anchor
    // 也算进了 elementTree（会让图层树因纯几何改动而重建）。
    const moved = [terminal("t1", -0.5), terminal("t2", 1.5)];
    const result = probe(TWO, moved);
    expect(result.elementTree).toBe(0);
    expect(result.routeGeometry).toBe(1);
    expect(result.topology).toBe(1);
  });

  it("端子内容完全一致（换了数组与端子对象）时三个 revision 都不动", () => {
    // 参照组：证明上面两条不是「只要换了 terminals 引用就恒 +1」。
    const same = [terminal("t1", -0.5), terminal("t2", 0.5)];
    expect(same).not.toBe(TWO);
    expect(same[0]).not.toBe(TWO[0]);
    expect(probe(TWO, same)).toEqual(NOTHING);
  });
});

// ─── pointChanged：undefined 点位的四组组合 ────────────────────
//
// pointChanged 未导出，观察通道是 graphStorePatchEdges 之后的
// routeGeometryRevision 增量。edgeAffectsRouteGeometry 里
// endpointChanged 走 id / sourceId / targetId / sourceTerminalId /
// targetTerminalId，全部保持不变，于是增量只由 sourcePoint / targetPoint /
// manualPoints 三条 pointChanged 决定。
//
// 四个 `?.` 的 nullish / 非 nullish 两侧必须都走到，缺一不可：
//   prev undefined + next 有值  → 前者 nullish、后者非 nullish，随后 || 短路
//   prev 有值 + next undefined  → x 比较相等（undefined !== undefined 为假），
//                                 落到 y：前者非 nullish、后者 nullish
//   prev undefined + next undefined → 两次都是 undefined !== undefined ⇒ false
//   两侧都有值且 x 相同        → 两次比较都在非 nullish 侧
// 最后一条（两侧都 undefined）是删掉 `?.` 后抛 TypeError 的那条变异。

describe("graphStore / pointChanged 的 undefined 点位组合", () => {
  const probe = (previousPoints: Partial<Edge>, nextPoints: Partial<Edge>) => {
    const store = createGraphStore([], [makeEdge("e", "a", "b", previousPoints)]);
    const patched = graphStorePatchEdges(store, [makeEdge("e", "a", "b", nextPoints)]);
    return {
      elementTree: patched.elementTreeRevision - store.elementTreeRevision,
      routeGeometry: patched.routeGeometryRevision - store.routeGeometryRevision,
      topology: patched.topologyRevision - store.topologyRevision
    };
  };

  const ONLY_ROUTE = { elementTree: 0, routeGeometry: 1, topology: 0 };
  const NOTHING = { elementTree: 0, routeGeometry: 0, topology: 0 };

  it("两侧都没有点位：判定为未变化（不是恒 true）", () => {
    // ⚠️ 若 pointChanged 里的 `?.` 被删掉，这里会抛 TypeError 而不是返回 false。
    expect(probe({}, {})).toEqual(NOTHING);
  });

  it("两侧都没点位、只有 manualPoints 引用不同但内容相同：仍是未变化", () => {
    // 走的是 routePointArrayChanged 里 pointChanged 的第二个调用点，
    // 且证明它比的是坐标值不是引用。
    const first = [{ x: 1, y: 1 }];
    const second = [{ x: 1, y: 1 }];
    expect(first).not.toBe(second);
    expect(probe({ manualPoints: first }, { manualPoints: second })).toEqual(NOTHING);
  });

  it("previous 有点位而 next 没有：算变化（x 相等所以要落到 y 才判出来）", () => {
    // prev {1,1} vs next undefined：x 侧 undefined !== undefined 为假，
    // 靠 y 侧 number !== undefined 判为变化 —— 只写 x 侧的实现会漏掉这条。
    expect(probe({ sourcePoint: { x: 1, y: 1 } }, {})).toEqual(ONLY_ROUTE);
  });

  it("previous 没有点位而 next 有：算变化", () => {
    expect(probe({}, { sourcePoint: { x: 1, y: 1 } })).toEqual(ONLY_ROUTE);
  });

  it("两侧都有点位且 x 相同、只有 y 不同：算变化（走到第二个比较）", () => {
    expect(probe({ sourcePoint: { x: 1, y: 1 } }, { sourcePoint: { x: 1, y: 2 } })).toEqual(ONLY_ROUTE);
  });

  it("targetPoint 与 sourcePoint 同规则：两侧都无不算变化、只有 y 变算变化", () => {
    expect(probe({}, { targetPoint: { x: 0, y: 0 } })).toEqual(ONLY_ROUTE);
    expect(probe({ targetPoint: { x: 0, y: 0 } }, {})).toEqual(ONLY_ROUTE);
    expect(probe({ targetPoint: { x: 0, y: 0 } }, { targetPoint: { x: 0, y: 3 } })).toEqual(ONLY_ROUTE);
  });

  it("manualPoints 长度变化：按长度判变化，与坐标无关", () => {
    expect(probe({ manualPoints: [] }, { manualPoints: [{ x: 1, y: 1 }] })).toEqual(ONLY_ROUTE);
    expect(probe({ manualPoints: [{ x: 1, y: 1 }] }, { manualPoints: [] })).toEqual(ONLY_ROUTE);
  });

  it("manualPoints 坐标变化：等长不同值也算变化（some 循环里的 pointChanged）", () => {
    expect(
      probe({ manualPoints: [{ x: 1, y: 1 }] }, { manualPoints: [{ x: 1, y: 2 }] })
    ).toEqual(ONLY_ROUTE);
  });

  it("端点字段（id / sourceId / targetId / terminalId）变化仍走 elementTree+topology", () => {
    // 参照组：证明 ONLY_ROUTE 里 elementTree / topology 为 0 是因为端点没动，
    // 而不是 routeGeometryRevision 独占一条通道。
    expect(probe({ sourceTerminalId: "t9" }, { sourceTerminalId: "t9" })).toEqual(NOTHING);
    expect(probe({}, { sourceTerminalId: "t9" })).toEqual({
      elementTree: 1,
      routeGeometry: 1,
      topology: 1
    });
  });
});

// ─── seenById 上限：超过 16384 后清空重建 ─────────────────────
//
// nextSpatialQueryMark 未导出，但 GraphNodeSpatialIndex 是导出类型，
// buildGraphNodeSpatialIndex / queryGraphStoreNodeSpatialIndex 都直接吃它，
// 所以 queryState.mark 与 queryState.seenById 就是公开可断言的面。
//
// 节点全部落在 (0,0)（makeNode 默认），因此同处一个桶、bounds 恒相交，
// 一次查询就能把 seenById 灌到指定条数。

describe("graphStore / nodeSpatialIndex 的 seenById 上限清理", () => {
  // graphStore.ts:64 的 GRAPH_NODE_SPATIAL_SEEN_LIMIT（未导出），阈值是严格大于。
  const SEEN_LIMIT = 16384;
  const WHOLE = { left: -400, right: 400, top: -400, bottom: 400 };
  const nodesOfCount = (count: number) => Array.from({ length: count }, (_, index) => makeNode(`n${index}`));

  it("seenById 恰好等于上限时不清理，mark 继续递增", () => {
    const index = buildGraphNodeSpatialIndex(nodesOfCount(SEEN_LIMIT));
    expect(queryGraphStoreNodeSpatialIndex(index, WHOLE)).toHaveLength(SEEN_LIMIT);
    queryGraphStoreNodeSpatialIndex(index, WHOLE);
    expect(index.queryState.seenById.size).toBe(SEEN_LIMIT);
    // 判别输入：`>` 改成 `>=` 时这里会变成 1。
    expect(index.queryState.mark).toBe(2);
  });

  it("seenById 超过上限后清空重建：mark 归零再递增，去重仍然有效", () => {
    const index = buildGraphNodeSpatialIndex(nodesOfCount(SEEN_LIMIT + 1));
    expect(queryGraphStoreNodeSpatialIndex(index, WHOLE)).toHaveLength(SEEN_LIMIT + 1);
    expect(index.queryState.mark).toBe(1);
    expect(index.queryState.seenById.size).toBe(SEEN_LIMIT + 1);

    // 第二次查询进入 nextSpatialQueryMark 时 size > 上限 ⇒ clear() + mark = 0，
    // 随后 mark += 1 ⇒ 观测值仍为 1（不清理的话会是 2）。
    expect(queryGraphStoreNodeSpatialIndex(index, WHOLE)).toHaveLength(SEEN_LIMIT + 1);
    expect(index.queryState.mark).toBe(1);
    // 清空后本次查询的 seenById 重新记满，且节点仍只各出现一次
    // （说明 clear 落在取 mark 之后，查询内去重没被破坏）。
    expect(index.queryState.seenById.size).toBe(SEEN_LIMIT + 1);
    expect(new Set(queryGraphStoreNodeSpatialIndex(index, WHOLE).map((node) => node.id)).size).toBe(
      SEEN_LIMIT + 1
    );
    expect(index.queryState.mark).toBe(1);
  });
});

// ─── nodeBoundsById 缺条目时的 graphNodeRenderBounds 兜底 ───────

describe("graphStore / queryGraphStoreNodeSpatialIndex 的 bounds 兜底", () => {
  // 可达性说明：走 createGraphStore / graphStorePatchNodes 时 buckets 与
  // nodeBoundsById 永远成对写入（applyNodePatch 用 nextNode.id 反查 previousNode，
  // 两者 id 必然相同；patchNodeSpatialIndexMany 每个 id 都 delete 后立即 set），
  // 所以「桶里有节点但 nodeBoundsById 没有该 id」在 store 路径上不可能出现。
  // 但 queryGraphStoreNodeSpatialIndex 接受裸 GraphNodeSpatialIndex，
  // 外部构造的索引可以缺这条 entry —— 那正是 `?? graphNodeRenderBounds(node)`
  // 唯一的调用场景，于是用两条构造索引的对照来钉住它。
  const WHOLE = { left: -400, right: 400, top: -400, bottom: 400 };

  const indexWithoutBounds: GraphNodeSpatialIndex = {
    bucketSize: 256,
    buckets: new Map([["0:0", [makeNode("ghost")]]]),
    nodeBucketKeysById: new Map([["ghost", ["0:0"]]]),
    nodeBoundsById: new Map(),
    queryState: { mark: 0, seenById: new Map() }
  };

  it("索引里缺该 id 的 bounds 时按节点自身算包围盒，节点仍能命中", () => {
    expect(queryGraphStoreNodeSpatialIndex(indexWithoutBounds, WHOLE).map((node) => node.id)).toEqual(["ghost"]);
  });

  it("索引里有不相交的 bounds 时落空（证明上一条是兜底而非恒命中）", () => {
    const far = { left: 5000, right: 5100, top: 5000, bottom: 5100 };
    const withFarBounds: GraphNodeSpatialIndex = {
      ...indexWithoutBounds,
      nodeBoundsById: new Map([["ghost", far]]),
      queryState: { mark: 0, seenById: new Map() }
    };
    expect(queryGraphStoreNodeSpatialIndex(withFarBounds, WHOLE)).toEqual([]);
  });

  it("兜底算出的包围盒仍受 bounds 参数约束：视野外查不到", () => {
    const away = { left: 5000, right: 5100, top: 5000, bottom: 5100 };
    expect(queryGraphStoreNodeSpatialIndex(indexWithoutBounds, away)).toEqual([]);
  });
});
// ─── removeEdgeFromTerminalRef：桶空则删 key、桶缺失则早退 ─────
//
// 观察通道是 GraphStore.edgesByTerminalRef 这个公开字段，key 形如 `${nodeId}:${terminalId}`
// （terminalId 为空时 key 是空串，整条 key 直接被 !key 跳过，所以要设 terminalId 才有桶）。
// 只有 endpointChanged 才会走 removeEdgeFromTerminalRef（applyEdgePatch:1035）。

describe("graphStore / removeEdgeFromTerminalRef 的桶边界", () => {
  it("桶里只剩这条边时整个 key 被删掉，不留空数组", () => {
    const store = createGraphStore([], [makeEdge("e1", "a", "b", { sourceTerminalId: "t1" })]);
    expect(store.edgesByTerminalRef.get("a:t1")).toHaveLength(1);

    // 改 sourceTerminalId ⇒ endpointChanged ⇒ 先把 e1 从旧 key "a:t1" 摘掉。
    // 桶里没有第二条边 ⇒ nextBucket.length === 0 ⇒ map.delete("a:t1")。
    const patched = graphStorePatchEdges(store, [makeEdge("e1", "a", "b", { sourceTerminalId: "t2" })]);
    expect(patched.edgesByTerminalRef.has("a:t1")).toBe(false);
    expect(patched.edgesByTerminalRef.get("a:t2")).toHaveLength(1);
  });

  it("对照组：同一 key 上还有别的边时，key 保留且只剩存活的那条", () => {
    // 与上一条成对，证明上一条转红/转绿的原因是「桶是否为空」而不是「是否发生了摘除」。
    const store = createGraphStore(
      [],
      [
        makeEdge("e1", "a", "b", { sourceTerminalId: "t1" }),
        makeEdge("e2", "a", "b", { sourceTerminalId: "t1" })
      ]
    );
    expect(store.edgesByTerminalRef.get("a:t1")).toHaveLength(2);

    const patched = graphStorePatchEdges(store, [makeEdge("e1", "a", "b", { sourceTerminalId: "t2" })]);
    expect(patched.edgesByTerminalRef.get("a:t1")!.map((edge) => edge.id)).toEqual(["e2"]);
    expect(patched.edgesByTerminalRef.get("a:t2")).toHaveLength(1);
  });

  it("同一批次重复提交同一条边：第二次摘除时旧 key 已被删，走 !bucket 早退", () => {
    // graphStorePatchEdges 每次都用 **store.edgeMap** 反查 previousEdge（不是用已累积的
    // 边表），所以同一批次里两条同 id 的更新拿到的是同一个原始边对象：
    // 第一次摘 "a:t1" 时桶里只有 e1 ⇒ key 被删；第二次再摘 "a:t1" 时桶已不存在 ⇒
    // 命中 `if (!bucket) continue` 的早退（graphStore.ts:277-279）。
    const store = createGraphStore([], [makeEdge("e1", "a", "b", { sourceTerminalId: "t1" })]);
    const patched = graphStorePatchEdges(store, [
      makeEdge("e1", "a", "b", { sourceTerminalId: "t2" }),
      makeEdge("e1", "a", "b", { sourceTerminalId: "t3" })
    ]);
    expect(patched.edgesByTerminalRef.has("a:t1")).toBe(false);
    expect(patched.edgesByTerminalRef.get("a:t2")).toHaveLength(1);
    expect(patched.edgesByTerminalRef.get("a:t3")).toHaveLength(1);
  });
});