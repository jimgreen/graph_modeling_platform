// graphStorePatchNodesFromArray（113 处生产调用，此前零直呼）
//
// 这是画布增量更新的热点：每帧拿到新 nodes 数组 + 变化节点 id 列表，
// 只重建受影响的那几个索引。判定写错不报错 —— 只是图层树、拓扑或空间索引
// 该重建时没重建（画面上表现为「拖完不动」「改名字不刷新」）。
import { describe, expect, it } from "vitest";
import {
  createGraphStore,
  graphStorePatchEdgesFromArray,
  graphStorePatchNodes,
  graphStorePatchNodesFromArray,
  overlayGraphStoreNodes
} from "./graphStore";
import type { GraphStore } from "./graphStore";
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
