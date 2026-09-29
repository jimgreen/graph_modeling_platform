import { describe, it, expect } from "vitest";
import {
  modelEdgeToReactFlowEdge,
  modelNodeToReactFlowNode,
  modelToReactFlowElements,
  type ReactFlowSavedPathEdge
} from "./reactFlowAdapter";
import type { Edge, ModelNode, Terminal } from "./model";
import { getEdgeEndpointPoint, inferESection } from "./model";

// ─── 测试辅助 ─────────────────────────────────────────────

type SavedPathEdgeData = NonNullable<ReactFlowSavedPathEdge["data"]>;

function savedOrFail(edge: ReactFlowSavedPathEdge | null): ReactFlowSavedPathEdge {
  if (!edge) {
    throw new Error("两端齐备的边应产出预览边");
  }
  return edge;
}

// ReactFlow 把 data 声明为可选，适配器实际总是填满；这里显式收敛掉 undefined，
// 免得每条断言后面挂一串 ! 掩盖真正的失败原因。
function savedData(edge: ReactFlowSavedPathEdge): SavedPathEdgeData {
  if (!edge.data) {
    throw new Error("savedPath 边缺少 data");
  }
  return edge.data;
}

function makeTerminal(id: string, anchorX: number, anchorY: number): Terminal {
  return { id, label: id, type: "ac", anchor: { x: anchorX, y: anchorY }, nodeNumber: "" };
}

function makeNode(overrides: Partial<ModelNode> = {}): ModelNode {
  return {
    id: "n1",
    kind: "breaker" as ModelNode["kind"],
    name: "断路器1",
    nodeNumber: "",
    acTopologyNode: 0,
    dcTopologyNode: 0,
    position: { x: 100, y: 200 },
    size: { width: 80, height: 40 },
    rotation: 0,
    scale: 1,
    terminals: [makeTerminal("t1", -0.5, 0), makeTerminal("t2", 0.5, 0)],
    params: {},
    ...overrides
  };
}

function makeEdge(overrides: Partial<Edge> = {}): Edge {
  return { id: "e1", sourceId: "n1", targetId: "n2", ...overrides };
}

function nodeById(...nodes: ModelNode[]): Map<string, ModelNode> {
  return new Map(nodes.map((node) => [node.id, node]));
}

// ─── modelNodeToReactFlowNode ─────────────────────────────

describe("reactFlowAdapter / modelNodeToReactFlowNode", () => {
  it("position 以节点中心换算成左上角：position - (缩放后尺寸 / 2)", () => {
    const node = makeNode({ position: { x: 100, y: 200 }, size: { width: 80, height: 40 } });
    expect(modelNodeToReactFlowNode(node).position).toEqual({ x: 60, y: 180 });
  });

  it("width/height 经 scale 缩放后单独赋值，位移同步减半", () => {
    const flowNode = modelNodeToReactFlowNode(makeNode({ size: { width: 80, height: 40 }, scale: 2 }));
    expect(flowNode.width).toBe(160);
    expect(flowNode.height).toBe(80);
    expect(flowNode.position).toEqual({ x: 20, y: 160 });
  });

  it("scaleX/scaleY 覆盖 scale，且两侧独立生效", () => {
    const flowNode = modelNodeToReactFlowNode(
      makeNode({ size: { width: 80, height: 40 }, scale: 2, scaleX: 0.5, scaleY: 3 })
    );
    expect(flowNode.width).toBe(40);
    expect(flowNode.height).toBe(120);
    expect(flowNode.position).toEqual({ x: 80, y: 140 });
  });

  it("固定 id/type/可拖拽可选中，不随节点字段变化", () => {
    const flowNode = modelNodeToReactFlowNode(makeNode({ id: "node-42" }));
    expect(flowNode.id).toBe("node-42");
    expect(flowNode.type).toBe("modelDevice");
    expect(flowNode.draggable).toBe(true);
    expect(flowNode.selectable).toBe(true);
  });

  it("data 携带 modelNode 引用与 kind/name/componentLibrary/terminalCount", () => {
    const node = makeNode({ kind: "breaker" as ModelNode["kind"], name: "断路器1" });
    const flowNode = modelNodeToReactFlowNode(node);
    expect(flowNode.data.modelNode).toBe(node);
    expect(flowNode.data.kind).toBe("breaker");
    expect(flowNode.data.name).toBe("断路器1");
    expect(flowNode.data.componentLibrary).toBe(inferESection(node.kind, node.params));
    expect(flowNode.data.terminalCount).toBe(2);
  });
});

// ─── modelEdgeToReactFlowEdge ─────────────────────────────

describe("reactFlowAdapter / modelEdgeToReactFlowEdge", () => {
  const source = makeNode({ id: "n1", position: { x: 0, y: 0 } });
  const target = makeNode({ id: "n2", position: { x: 200, y: 0 } });

  it("source 或 target 缺失时返回 null", () => {
    expect(modelEdgeToReactFlowEdge(makeEdge(), nodeById(source))).toBeNull();
    expect(modelEdgeToReactFlowEdge(makeEdge(), nodeById(target))).toBeNull();
    expect(modelEdgeToReactFlowEdge(makeEdge(), new Map())).toBeNull();
  });

  it("id/source/target/type/selectable 直接来自模型边", () => {
    const edge = makeEdge({ id: "e-7", sourceTerminalId: "t2", targetTerminalId: "t1" });
    const flowEdge = savedOrFail(modelEdgeToReactFlowEdge(edge, nodeById(source, target)));
    expect(flowEdge.id).toBe("e-7");
    expect(flowEdge.source).toBe("n1");
    expect(flowEdge.target).toBe("n2");
    expect(flowEdge.type).toBe("savedPath");
    expect(flowEdge.selectable).toBe(true);
    expect(savedData(flowEdge).modelEdge).toBe(edge);
  });

  it("无手动拐点时只含起终点两个点，路径为单段 M/L", () => {
    const edge = makeEdge({ sourceTerminalId: "t2", targetTerminalId: "t1" });
    const flowEdge = savedOrFail(modelEdgeToReactFlowEdge(edge, nodeById(source, target)));
    const start = getEdgeEndpointPoint(source, undefined, "t2");
    const end = getEdgeEndpointPoint(target, undefined, "t1");
    expect(savedData(flowEdge).points).toEqual([start, end]);
    expect(savedData(flowEdge).path).toBe(`M ${start.x} ${start.y} L ${end.x} ${end.y}`);
  });

  it("manualPoints 夹在起终点之间，path 与 points 一一对应", () => {
    const edge = makeEdge({
      sourceTerminalId: "t2",
      targetTerminalId: "t1",
      manualPoints: [{ x: 50, y: -30 }, { x: 120, y: -30 }]
    });
    const flowEdge = savedOrFail(modelEdgeToReactFlowEdge(edge, nodeById(source, target)));
    const start = getEdgeEndpointPoint(source, undefined, "t2");
    const end = getEdgeEndpointPoint(target, undefined, "t1");
    expect(savedData(flowEdge).points).toEqual([start, { x: 50, y: -30 }, { x: 120, y: -30 }, end]);
    expect(savedData(flowEdge).path).toBe(
      `M ${start.x} ${start.y} L 50 -30 L 120 -30 L ${end.x} ${end.y}`
    );
  });

  it("routePoints 不进预览路径，只认 manualPoints", () => {
    const withRoute = savedOrFail(
      modelEdgeToReactFlowEdge(
        makeEdge({ sourceTerminalId: "t2", targetTerminalId: "t1", routePoints: [{ x: 999, y: 999 }] }),
        nodeById(source, target)
      )
    );
    const withoutRoute = savedOrFail(
      modelEdgeToReactFlowEdge(
        makeEdge({ sourceTerminalId: "t2", targetTerminalId: "t1" }),
        nodeById(source, target)
      )
    );
    expect(savedData(withRoute).points).toEqual(savedData(withoutRoute).points);
    expect(savedData(withRoute).path).not.toContain("999");
  });

  it("端点/拐点是拷贝，不与模型边共享 Point 引用", () => {
    const manualPoint = { x: 50, y: -30 };
    const sourcePoint = { x: 0, y: 0 };
    const busLike = makeNode({ id: "n1", kind: "busbar" as ModelNode["kind"], position: { x: 0, y: 0 } });
    const flowEdge = savedOrFail(
      modelEdgeToReactFlowEdge(
        makeEdge({
          sourcePoint,
          sourceTerminalId: "t2",
          targetTerminalId: "t1",
          manualPoints: [manualPoint]
        }),
        nodeById(busLike, target)
      )
    );
    const points = savedData(flowEdge).points;
    for (const point of points) {
      expect(point).not.toBe(sourcePoint);
      expect(point).not.toBe(manualPoint);
    }
    points[0]!.x = 12345;
    expect(sourcePoint.x).toBe(0);
    expect(manualPoint.x).toBe(50);
  });
});

// ─── modelToReactFlowElements ─────────────────────────────

describe("reactFlowAdapter / modelToReactFlowElements", () => {
  it("空模型产出空集合", () => {
    const elements = modelToReactFlowElements({ nodes: [], edges: [] });
    expect(elements.nodes).toEqual([]);
    expect(elements.edges).toEqual([]);
  });

  it("节点顺序保持输入顺序，id 一一对应", () => {
    const nodes = [
      makeNode({ id: "a", name: "A" }),
      makeNode({ id: "b", name: "B" }),
      makeNode({ id: "c", name: "C" })
    ];
    const elements = modelToReactFlowElements({ nodes, edges: [] });
    expect(elements.nodes.map((node) => node.id)).toEqual(["a", "b", "c"]);
  });

  it("丢弃悬空边但保留其余边，不影响节点", () => {
    const a = makeNode({ id: "a" });
    const b = makeNode({ id: "b" });
    const elements = modelToReactFlowElements({
      nodes: [a, b],
      edges: [
        makeEdge({ id: "ok", sourceId: "a", targetId: "b" }),
        makeEdge({ id: "dangling", sourceId: "a", targetId: "missing" }),
        makeEdge({ id: "dangling2", sourceId: "ghost", targetId: "b" })
      ]
    });
    expect(elements.nodes).toHaveLength(2);
    expect(elements.edges.map((edge) => edge.id)).toEqual(["ok"]);
  });

  it("过滤后仍保有 savedPath 边的 data 结构（类型谓词未被退化成 any）", () => {
    const a = makeNode({ id: "a" });
    const b = makeNode({ id: "b" });
    const elements = modelToReactFlowElements({
      nodes: [a, b],
      edges: [makeEdge({ id: "ok", sourceId: "a", targetId: "b" })]
    });
    const edge = savedOrFail(elements.edges[0] ?? null);
    expect(savedData(edge).points.length).toBeGreaterThanOrEqual(2);
    expect(savedData(edge).path.startsWith("M ")).toBe(true);
  });

  it("自环边（source===target）也能解析出两个端点", () => {
    const only = makeNode({ id: "solo" });
    const flowEdge = savedOrFail(
      modelEdgeToReactFlowEdge(
        makeEdge({ id: "loop", sourceId: "solo", targetId: "solo", sourceTerminalId: "t2", targetTerminalId: "t1" }),
        nodeById(only)
      )
    );
    expect(savedData(flowEdge).points).toHaveLength(2);
    expect(savedData(flowEdge).path.match(/L /g)).toHaveLength(1);
  });

  it("批量装配结果与逐个适配器输出一致", () => {
    const a = makeNode({ id: "a" });
    const b = makeNode({ id: "b" });
    const edges = [makeEdge({ id: "ok", sourceId: "a", targetId: "b", manualPoints: [{ x: 10, y: 20 }] })];
    const batch = modelToReactFlowElements({ nodes: [a, b], edges });
    expect(batch.nodes).toEqual([modelNodeToReactFlowNode(a), modelNodeToReactFlowNode(b)]);
    expect(batch.edges).toEqual([modelEdgeToReactFlowEdge(edges[0]!, nodeById(a, b))]);
  });
});
