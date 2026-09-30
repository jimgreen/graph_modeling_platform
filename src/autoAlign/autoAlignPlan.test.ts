// runAutoAlignPlan 的分支覆盖。此前只有一条「跑通且不改输入」的用例，
// 于是下面这些真正容易写错的分支一次都没被执行过：
//   · `layoutUnitCount < 2` 的整段早退 —— 自动对齐是「至少两个单元才排」，
//     少一个单元就必须原样返回，且 nodeIds 必须是空数组而不是单元里的 id
//     （nodeIds 是给调用方回写「哪些节点被动过」的，报上没动过的 id 会误导）；
//   · `new Set(layoutUnits.flatMap(...))` 的有序并集 —— 组内成员排在顶层单元之前，
//     调用方按这个顺序回写；
//   · 主动层引用了 nodes 里不存在的节点时的 `?? cloneNode` 兜底 —— 不能抛。
import { describe, expect, test } from "vitest";
import type { ModelGroup, ModelNode } from "../model";
import { runAutoAlignPlan } from "./autoAlignPlan";

const makeNode = (id: string, x: number, y: number): ModelNode => ({
  id,
  kind: "device",
  name: id,
  nodeNumber: id,
  acTopologyNode: 0,
  dcTopologyNode: 0,
  position: { x, y },
  size: { width: 100, height: 60 },
  rotation: 0,
  scale: 1,
  terminals: [],
  params: {}
});

const makeGroup = (id: string, nodeIds: string[]): ModelGroup =>
  ({ id, name: id, nodeIds, edgeIds: [], childGroupIds: [] }) as unknown as ModelGroup;

const input = () => ({
  nodes: [makeNode("node-1", 107, 113), makeNode("node-2", 118, 119)],
  activeLayerNodes: [makeNode("node-1", 107, 113), makeNode("node-2", 118, 119)],
  activeLayerEdges: [],
  activeLayerGroups: [] as ModelGroup[],
  edges: [],
  routedEdges: [],
  canvasBounds: { width: 800, height: 600 },
  gridSpacing: 50,
  editModeRouteRenderOptions: { preserveManualRouteDisplay: true }
});

const positionsOf = (nodes: ModelNode[]) => nodes.map((node) => `${node.id}@${node.position.x},${node.position.y}`);

describe("auto-align plan", () => {
  test("returns a serializable result without mutating the input graph", () => {
    const value = input();
    const original = structuredClone(value);
    const result = runAutoAlignPlan(value);

    expect(result.layoutUnitCount).toBe(2);
    expect(result.nodeIds).toEqual(["node-1", "node-2"]);
    expect(result.arranged).toHaveLength(2);
    expect(result.storedRouteDrops).toEqual([]);
    expect(result.qualityReport).toEqual(expect.objectContaining({ degraded: false }));
    expect(() => structuredClone(result)).not.toThrow();
    expect(value).toEqual(original);
  });

  test("松散单元排完后落回网格（gridSpacing 的倍数）", () => {
    const value = input();
    const result = runAutoAlignPlan(value);

    for (const node of result.arranged) {
      expect(node.position.x % value.gridSpacing, `x=${node.position.x}`).toBe(0);
      expect(node.position.y % value.gridSpacing, `y=${node.position.y}`).toBe(0);
    }
  });

  test("返回的是副本：改 arranged 的位置不会回写到输入", () => {
    const value = input();
    const result = runAutoAlignPlan(value);
    result.arranged[0].position.x = -999;
    expect(value.nodes[0].position.x).toBe(107);
  });
});

describe("少于两个布局单元时整段早退", () => {
  test("单节点：不排、不动位置，nodeIds 为空", () => {
    const value = input();
    value.nodes = [makeNode("node-1", 107, 113)];
    value.activeLayerNodes = [...value.nodes];

    const result = runAutoAlignPlan(value);

    expect(result.layoutUnitCount).toBe(1);
    // 关键：早退时 nodeIds 是空数组，不是 ["node-1"] —— 没排过就不该报动过
    expect(result.nodeIds).toEqual([]);
    expect(result.storedRouteDrops).toEqual([]);
    // 位置保持原样（107/113 都不是 50 的倍数，说明确实没排）
    expect(positionsOf(result.arranged)).toEqual(["node-1@107,113"]);
  });

  test("两个节点装进同一个组也算一个单元：同样早退、同样不动", () => {
    // 组是「一个布局单元」而不是两个，所以只放一组时没有可排的相对关系
    const value = input();
    value.activeLayerGroups = [makeGroup("g1", ["node-1", "node-2"])];

    const result = runAutoAlignPlan(value);

    expect(result.layoutUnitCount).toBe(1);
    expect(result.nodeIds).toEqual([]);
    expect(positionsOf(result.arranged)).toEqual(["node-1@107,113", "node-2@118,119"]);
  });

  test("空图不抛，返回空结果", () => {
    const value = input();
    value.nodes = [];
    value.activeLayerNodes = [];

    const result = runAutoAlignPlan(value);

    expect(result.layoutUnitCount).toBe(0);
    expect(result.nodeIds).toEqual([]);
    expect(result.arranged).toEqual([]);
  });

  test("早退路径返回的 arranged 同样是副本", () => {
    const value = input();
    value.nodes = [makeNode("node-1", 107, 113)];
    value.activeLayerNodes = [...value.nodes];

    const result = runAutoAlignPlan(value);
    result.arranged[0].position.x = -999;

    expect(value.nodes[0].position.x).toBe(107);
  });
});

describe("nodeIds 是各布局单元成员的有序并集", () => {
  const threeNodes = () => {
    const value = input();
    const nodes = [makeNode("n1", 7, 7), makeNode("n2", 233, 13), makeNode("n3", 51, 401)];
    value.nodes = nodes;
    value.activeLayerNodes = nodes.map((node) => makeNode(node.id, node.position.x, node.position.y));
    return value;
  };

  test("组 + 独立节点：ids 按单元顺序拼出，且每个 id 只出现一次", () => {
    // 3 个节点、1 个含 2 成员的组 = 2 个布局单元，ids 必须仍是 3 个
    const value = threeNodes();
    value.activeLayerGroups = [makeGroup("g1", ["n1", "n2"])];

    const result = runAutoAlignPlan(value);

    expect(result.layoutUnitCount).toBe(2);
    expect(result.nodeIds).toEqual(["n1", "n2", "n3"]);
  });

  test("组的 nodeIds 里混入重复 id 时，nodeIds 不跟着重复", () => {
    // 调用方按 nodeIds 回写，同一个 id 出现两次就会被处理两遍。
    // 变异验证补记：删掉 `new Set(...)` 这条仍然全绿 —— 去重实际发生在
    // buildCanvasLayoutUnits 侧，本文件的 Set 是防御性的、当前观察不到。
    // 所以别把这条测试当成「Set 那行是活的」的证据。
    const value = threeNodes();
    value.activeLayerGroups = [makeGroup("g1", ["n1", "n1", "n2"])];

    const result = runAutoAlignPlan(value);

    expect(result.nodeIds).toEqual(["n1", "n2", "n3"]);
  });
});

describe("主动层与全量 nodes 不一致时的兜底", () => {
  test("activeLayerNodes 含 nodes 里没有的节点：不抛，arranged 仍只含输入的节点", () => {
    const value = input();
    value.activeLayerNodes = [makeNode("ghost-1", 999, 999), makeNode("ghost-2", 888, 888)];

    const result = runAutoAlignPlan(value);

    // 兜底是 `?? cloneNode(node)`，走的是「凭空造一个副本」而非抛错。
    // 兜底造出的幽灵节点会变成布局单元，于是 nodeIds 里会出现 arranged 中不存在的 id
    // （这里真实输出是 ["ghost-1","ghost-2"]）—— 记下来是为了让日后改这段的人知道现状。
    expect(result.arranged.map((node) => node.id)).toEqual(["node-1", "node-2"]);
  });
});
