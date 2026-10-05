// runAutoAlignPlan 的分支覆盖。此前只有一条「跑通且不改输入」的用例，
// 于是下面这些真正容易写错的分支一次都没被执行过：
//   · `layoutUnitCount < 2` 的整段早退 —— 自动对齐是「至少两个单元才排」，
//     少一个单元就必须原样返回，且 nodeIds 必须是空数组而不是单元里的 id
//     （nodeIds 是给调用方回写「哪些节点被动过」的，报上没动过的 id 会误导）；
//   · `new Set(layoutUnits.flatMap(...))` 的有序并集 —— 组内成员排在顶层单元之前，
//     调用方按这个顺序回写；
//   · 主动层引用了 nodes 里不存在的节点时的 `?? cloneNode` 兜底 —— 不能抛。
import { describe, expect, test } from "vitest";
import type { AutoAlignPlanInput } from "./autoAlignPlan";
import type { Edge, ModelGroup, ModelNode } from "../model";
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

/** 类型完整的 plan 输入（`input()` 的推断类型里 edges 是 never[]，装不下边）。 */
const alignInput = (): AutoAlignPlanInput => ({
  nodes: [],
  activeLayerNodes: [],
  activeLayerEdges: [],
  activeLayerGroups: [],
  edges: [],
  routedEdges: [],
  canvasBounds: { width: 800, height: 600 },
  gridSpacing: 50,
  editModeRouteRenderOptions: { preserveManualRouteDisplay: true }
});

/** `childGroupIds` 缺省（键不存在）的组 —— 走 L82 的 `: undefined` 右臂。 */
const groupWithoutChildIds = (id: string, nodeIds: string[]): ModelGroup =>
  ({ id, name: id, nodeIds, edgeIds: [] }) as unknown as ModelGroup;

/** 带 `childGroupIds` 的组 —— 走 L82 左臂。 */
const groupWithChildIds = (id: string, nodeIds: string[], childGroupIds: string[]): ModelGroup =>
  ({ id, name: id, nodeIds, edgeIds: [], childGroupIds }) as unknown as ModelGroup;

/**
 * 一条「存档折线明显更绕」的边：编辑态渲染会原样搬走 `routePoints`
 * （`preserveManualRouteDisplay` → `preservedStoredRoutePointsForDisplay`），
 * 而自动对齐判定「陈迹」的判据是**按端口重算后拐点数严格更少**
 * （`autoAlignStoredRoutePlan` → `countAutoAlignRouteBends(rerouted) < countAutoAlignRouteBends(preserved)`）。
 *
 * 端点必须落在两端图元**对齐之后**的路由端点上（这里 `terminals: []` ⇒ 端点即节点中心），
 * 否则 `preservedStoredRoutePointsForDisplay` 会因首尾点对不上而整条退回自动路由，
 * 存档折线就不会被保留，也就无从谈「更绕」。
 */
const detourRoutePoints = (start: { x: number; y: number }, end: { x: number; y: number }) => [
  { ...start },
  { x: start.x, y: 80 },
  { x: 180, y: 80 },
  { x: 180, y: 40 },
  { x: end.x, y: 40 },
  { ...end }
];

/**
 * 存档折线的真实来历：设备上一次对齐后停在这里 ⇒ 折线按这组坐标存；
 * 之后设备被拖离网格，再次对齐又回到同一组坐标 ⇒ 折线的绕行成了陈迹。
 * 所以这里先跑一遍**无边**的 plan 问出对齐终点，再据此造折线。
 */
const detourEdgeFor = (value: AutoAlignPlanInput): Edge => {
  const arranged = runAutoAlignPlan({ ...value, edges: [], activeLayerEdges: [] }).arranged;
  const [source, target] = arranged;
  return {
    id: "e1",
    sourceId: source.id,
    targetId: target.id,
    routePoints: detourRoutePoints(source.position, target.position)
  };
};

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

/**
 * 目标分支：`src/autoAlign/autoAlignPlan.ts` L82
 * （`childGroupIds: group.childGroupIds ? [...group.childGroupIds] : undefined`）
 * 的 `: undefined` 右臂 —— 即「组没有 `childGroupIds` 这个键」。
 *
 * ModelGroup 的 `childGroupIds` 是可选字段，生产里的组由
 * `withChildGroupIds` 在子组为空时**直接不写这个键**，所以右臂是真实路径。
 */
describe("组的 childGroupIds 缺省（L82 右臂）", () => {
  const fourNodes = () => {
    const value = input();
    const nodes = [makeNode("n1", 7, 7), makeNode("n2", 233, 13), makeNode("n3", 51, 401), makeNode("n4", 61, 411)];
    value.nodes = nodes;
    value.activeLayerNodes = nodes.map((node) => makeNode(node.id, node.position.x, node.position.y));
    return value;
  };

  test("子组完全没有 childGroupIds 键：不抛，且父组把子组成员一并收进同一个布局单元", () => {
    const value = fourNodes();
    // g1 有 childGroupIds（走左臂）；g2 键不存在（走右臂）
    value.activeLayerGroups = [
      groupWithChildIds("g1", ["n1"], ["g2"]),
      groupWithoutChildIds("g2", ["n2", "n3"])
    ];

    const result = runAutoAlignPlan(value);

    // 组树（n1+n2+n3）合成 1 个单元，再加散兵 n4 ⇒ 共 2 个单元（够 2 才不早退）
    expect(result.layoutUnitCount).toBe(2);
    // 子组成员的 id 排在父组 id 之前（collectGroupTreeMembers 先收集子组）
    expect(result.nodeIds).toEqual(["n2", "n3", "n1", "n4"]);
  });

  test("childGroupIds 为空数组与键不存在：结果逐字段相同", () => {
    // 这条是「L82 右臂的 undefined 与 [] 在下游不可区分」的**可执行**证据。
    //
    // 变异验证实测：把 `: undefined` 换成 `: []` 全绿。绿是**正确结果**，理由是可证的：
    // 整条链路上读 `childGroupIds` 的地方只有 selectionActions 的
    // `groupChildIds = uniqueIds(group.childGroupIds ?? [])`（L215-217，L507/L550/L743 三处调用都走它），
    // `undefined` 与 `[]` 经它归一后是**同一个值**，于是 L82 右臂写哪个都一样。
    // 什么会让它不再等价：`groupChildIds` 里的 `?? []` 被去掉，或出现第二个不经它的读点。
    const withEmptyArray = fourNodes();
    withEmptyArray.activeLayerGroups = [groupWithChildIds("g1", ["n1", "n2"], [])];

    const withoutKey = fourNodes();
    withoutKey.activeLayerGroups = [groupWithoutChildIds("g1", ["n1", "n2"])];

    const left = runAutoAlignPlan(withEmptyArray);
    const right = runAutoAlignPlan(withoutKey);

    expect(right.layoutUnitCount).toBe(left.layoutUnitCount);
    expect(right.nodeIds).toEqual(left.nodeIds);
    expect(positionsOf(right.arranged)).toEqual(positionsOf(left.arranged));
  });

  test("嵌套组的孙层成员也被收进来（两层的 childGroupIds 一真一缺）", () => {
    const value = input();
    const nodes = [makeNode("n1", 7, 7), makeNode("n2", 233, 13), makeNode("n3", 51, 401), makeNode("n4", 61, 411)];
    value.nodes = nodes;
    value.activeLayerNodes = nodes.map((node) => makeNode(node.id, node.position.x, node.position.y));
    // g1 -> g2 -> g3：g2 显式写出 childGroupIds（走左臂），g3 的键不存在（走右臂）
    value.activeLayerGroups = [
      groupWithChildIds("g1", ["n1"], ["g2"]),
      groupWithChildIds("g2", ["n2"], ["g3"]),
      groupWithoutChildIds("g3", ["n3"])
    ];

    const result = runAutoAlignPlan(value);

    // 组树（n1+n2+n3）合成 1 个单元，再加散兵 n4 ⇒ 共 2 个单元（够 2 才不早退）
    expect(result.layoutUnitCount).toBe(2);
    // 收集顺序是「孙组先于子组、子组先于父组」，散兵单元排在最后
    expect(result.nodeIds).toEqual(["n3", "n2", "n1", "n4"]);
  });
});

/**
 * 目标分支：`src/autoAlign/autoAlignPlan.ts` L147
 * （`finalRun.storedRouteDropsReady ? finalRun.storedRouteDrops : autoAlignStoredRouteDrops(...)`）。
 *
 * `storedRouteDropsReady` 只在 selectionActions 的终检（`measureAuthoritative`）里被置 true，
 * 而终检前有 `if (!movedAnyUnit || deltas.size === 0) return nodes;` —— 于是：
 *   · 候选被接受、图元真的挪动 ⇒ 终检跑过 ⇒ ready 为 true ⇒ 走 L147；
 *   · 一个候选都没被接受 ⇒ 提前 return，ready 保持 false ⇒ 走 L148。
 *
 * ⚠ **两条臂无法用输出断言区分**：`storedRouteDropsReady` 不是返回值的一部分，而两条臂
 * 在本仓库的现状下算出同一份清单（实测：把两条臂对调，只有 L148 那条 fixture 转红，
 * L147 那条仍然绿 —— 说明它读到的那份重算结果与终检存下的那份一致）。
 * 所以「走了哪条臂」只能靠变异验证定案，而它给出的定案是：
 *   · L147 换成 `[]`      ⇒ 只有「图元被挪动」那条红；
 *   · L148 换成 `[]`      ⇒ 只有「候选一个都没被接受」那条红；
 *   · 两条臂对调          ⇒ 只有「候选一个都没被接受」那条红。
 * 即两条臂各自承重、各自被上面两条用例咬住。
 *
 * 怎么让「一个候选都没被接受」：把两节点摆在已对齐的网格点上，且绕行存档折线让
 * 每个候选偏移都多拐点（探针实测 `bendRejectedCount: 6`）⇒ 六连败 ⇒ deltas 为空。
 */
describe("存档折线清理的两条臂（L147 真臂 / L148 兜底重算）", () => {
  const withDetour = (nodes: ModelNode[]): AutoAlignPlanInput => {
    const value = alignInput();
    value.nodes = nodes;
    value.activeLayerNodes = nodes.map((node) => makeNode(node.id, node.position.x, node.position.y));
    const edge = detourEdgeFor(value);
    value.edges = [edge];
    value.activeLayerEdges = [edge];
    return value;
  };

  test("图元被挪动：终检跑过（走 L147），绕行的存档折线被识别为陈迹并清理", () => {
    // 107/113、218/119 都不是 50 的倍数 ⇒ 有候选被接受 ⇒ movedAnyUnit 为 true ⇒ 终检跑过
    const result = runAutoAlignPlan(withDetour([makeNode("n1", 107, 113), makeNode("n2", 218, 119)]));

    expect(positionsOf(result.arranged)).not.toEqual(["n1@107,113", "n2@218,119"]);
    // 有候选被接受（一个都没被拐点判否）⇒ movedAnyUnit 为 true ⇒ 终检真的跑了
    expect(result.qualityReport.verifiedCandidateCount).toBeGreaterThan(0);
    expect(result.qualityReport.bendRejectedCount).toBe(0);
    expect(result.qualityReport.revertedByVerification).toBe(false);
    // 保留存档折线时拐点更多、按端口重算后拐点更少 ⇒ 这条边的存档折线是陈迹
    expect(result.storedRouteDrops.map((drop) => drop.edgeId)).toEqual(["e1"]);
    expect(result.storedRouteDrops[0].points.length).toBeGreaterThanOrEqual(2);
  });

  test("候选一个都没被接受：终检提前 return（走 L148），同一份重算同样清出陈迹", () => {
    // 已经落在网格点上的两节点 ⇒ 每个候选偏移都被拐点判否 ⇒ deltas 为空 ⇒ 终检提前 return ⇒ ready 保持 false
    const result = runAutoAlignPlan(withDetour([makeNode("n1", 100, 100), makeNode("n2", 300, 100)]));

    expect(positionsOf(result.arranged)).toEqual(["n1@100,100", "n2@300,100"]);
    expect(result.layoutUnitCount).toBe(2);
    // 「终检压根没跑」的可观察证据：候选全被拐点判否，于是 movedAnyUnit 保持 false
    // （verifiedCandidateCount 是候选代理路由的次数，不区分是否跑过终检，所以只看它没意义）
    expect(result.qualityReport.verifiedCandidateCount).toBeGreaterThan(0);
    expect(result.qualityReport.bendRejectedCount).toBeGreaterThan(0);
    expect(result.storedRouteDrops.map((drop) => drop.edgeId)).toEqual(["e1"]);
  });

  test("存档折线拐点不更多时判不出陈迹（反证：上面的非空来自拐点比较，不是「有边就清」）", () => {
    const nodes = [makeNode("n1", 107, 113), makeNode("n2", 218, 119)];
    const value = alignInput();
    value.nodes = nodes;
    value.activeLayerNodes = nodes.map((node) => makeNode(node.id, node.position.x, node.position.y));
    const arranged = runAutoAlignPlan({ ...value, edges: [], activeLayerEdges: [] }).arranged;
    // 与「按端口重算」同形的存档折线：拐点数打平 ⇒ 按判据不该清
    const edge: Edge = {
      id: "e1",
      sourceId: arranged[0].id,
      targetId: arranged[1].id,
      routePoints: [
        { ...arranged[0].position },
        { x: arranged[0].position.x, y: arranged[0].position.y - 44 },
        { x: arranged[1].position.x, y: arranged[1].position.y - 44 },
        { ...arranged[1].position }
      ]
    };
    value.edges = [edge];
    value.activeLayerEdges = [edge];

    const result = runAutoAlignPlan(value);

    expect(positionsOf(result.arranged)).not.toEqual(["n1@107,113", "n2@218,119"]);
    expect(result.storedRouteDrops).toEqual([]);
  });
});
