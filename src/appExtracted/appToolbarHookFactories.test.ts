import { describe, expect, test } from "vitest";
import { createAppHookCallback57 } from "./appToolbarHookFactories";
import { readViewportResultCache, writeViewportResultCache, viewportBoundsCacheKey } from "./appCoreCanvasUtilities";

// 画布视口节点序 = 画布绘制序（appRenderBatch 按数组序渲染）。
// 容器沉底：容器必须排在 nodeIndexById 更小的普通设备之前。
const node = (id: string, kind: string) => ({
  id, kind, name: id, position: { x: 0, y: 0 }, size: { width: 40, height: 30 },
  rotation: 0, scale: 1, params: {}, terminals: [],
} as any);

// 最小 __appScope 桩：只补齐 callback57 实际读取的字段（缓存/空间索引用真实实现）
const makeScope = (nodes: ReturnType<typeof node>[]) => {
  const visibleNodeById = new Map(nodes.map((n) => [n.id, n]));
  const indexById = new Map(nodes.map((n, index) => [n.id, index]));
  return {
    connectSource: null,
    displaySelectedEdgeKey: "",
    displaySelectedNodeKey: "",
    draggingNodeIdSet: new Set<string>(),
    selectedNodeIdSet: new Set<string>(),
    edgeById: new Map(),
    visibleNodeById,
    visibleNodeIdSet: new Set(nodes.map((n) => n.id)),
    visibleNodeSpatialIndex: {},
    routedEdgeStore: {},
    viewportRoutedEdges: [],
    effectiveViewportQueryBounds: { left: -1000, right: 1000, top: -1000, bottom: 1000 },
    queryNodeSpatialIndex: () => nodes,
    graphStore: { nodeIndexById: indexById },
    viewportNodesResultCacheRef: { current: { ownerRefs: [], token: "", values: new Map() } },
    viewportBoundsCacheKey,
    readViewportResultCache,
    writeViewportResultCache,
  } as any;
};

describe("appToolbarHookFactories callback57 视口节点序", () => {
  test("容器沉底:容器排在 nodeIndexById 更小的设备之前,其余保持索引序", () => {
    const nodes = [node("a", "ac-load"), node("box", "ac-vpp-box"), node("b", "ac-load")];
    const viewportNodes = createAppHookCallback57(makeScope(nodes))();
    expect(viewportNodes.map((n: any) => n.id)).toEqual(["box", "a", "b"]);
  });

  test("无容器时仍按 nodeIndexById 原序", () => {
    const nodes = [node("b", "ac-load"), node("a", "ac-load")];
    const viewportNodes = createAppHookCallback57(makeScope(nodes))();
    expect(viewportNodes.map((n: any) => n.id)).toEqual(["b", "a"]);
  });
});
