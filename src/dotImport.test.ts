import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolveDeviceStateVisual } from "./model";
import { getTemplate } from "./model-node-ops";
import { parseDot, buildClassifyContext, classifyDotNode, collapseDotGraph, mapDotGraphToModel, importDotFile } from "./dotImport";
import type { DotGraph, DotNode } from "./dotImport";

// 内联最小 dot 样本（4 节点，覆盖 pos 剥 !、[OPEN] 剥离、Station 提取）
const MINI_DOT = `digraph "6" {
  // Station: 望道变 (6)
  graph [rankdir=TB, label="望道变", fontsize=16, pad=0.5, splines=ortho];
  node [fontsize=10];
  edge [arrowsize=0.6];

  n0 [label="BBS_1", shape=rect, fillcolor=yellow, pos="100,300!"];
  n1 [label="SW_1\\n[OPEN]", shape=invtriangle, fillcolor=orange, pos="100,250!"];
  n2 [label="CB_1", shape=diamond, fillcolor=green, pos="100,200!"];
  n3 [label="INTERNAL_VL_1_230_10", shape=point, fillcolor=black, pos="100,322!"];

  n0 -> n3;
  n3 -> n1;
  n1 -> n2;
}
`;

// label 含转义双引号的样本（Python 端仅转义双引号）
const ESCAPE_DOT = `digraph "9" {
  n0 [label="A \\"B\\" C", shape=rect, fillcolor=yellow, pos="10,20!"];
}
`;

describe("parseDot", () => {
  it("解析 fixture 望道变_6.dot：stationName/stationId/节点边数量", () => {
    const text = readFileSync(new URL("./__fixtures__/dot/望道变_6.dot", import.meta.url), "utf8");
    const g = parseDot(text);
    expect(g.stationName).toBe("望道变");
    expect(g.stationId).toBe("6");
    expect(g.nodes.length).toBe(250);
    expect(g.edges.length).toBe(255);
  });

  it("解析 MINI_DOT：节点/边解析、pos 剥 !、[OPEN] 转 open 并剥离、Station 提取", () => {
    const g = parseDot(MINI_DOT);
    expect(g.stationName).toBe("望道变");
    expect(g.stationId).toBe("6");
    expect(g.nodes.length).toBe(4);
    expect(g.edges).toEqual([
      { from: "n0", to: "n3" },
      { from: "n3", to: "n1" },
      { from: "n1", to: "n2" },
    ]);
    // n0：普通节点
    expect(g.nodes[0]).toMatchObject({
      id: "n0",
      label: "BBS_1",
      open: false,
      shape: "rect",
      fillcolor: "yellow",
      x: 100,
      y: 300,
    });
    // n3：坐标带小数点
    expect(g.nodes[3]).toMatchObject({
      id: "n3",
      label: "INTERNAL_VL_1_230_10",
      shape: "point",
      x: 100,
      y: 322,
    });
  });

  it("MINI_DOT 节点 n1：label=SW_1、open=true；n2 open=false", () => {
    const g = parseDot(MINI_DOT);
    expect(g.nodes[1]).toMatchObject({ id: "n1", label: "SW_1", open: true });
    expect(g.nodes[2]).toMatchObject({ id: "n2", label: "CB_1", open: false });
  });

  it("label 转义双引号还原", () => {
    const g = parseDot(ESCAPE_DOT);
    expect(g.nodes[0].label).toBe('A "B" C');
    expect(g.nodes[0].open).toBe(false);
  });

  it("空字符串返回空 graph（不抛错）", () => {
    const g = parseDot("");
    expect(g).toEqual({ stationName: "", stationId: "", nodes: [], edges: [] });
  });

  it("无 digraph/无 Station 的文本返回空 graph（不抛错）", () => {
    const g = parseDot("some random text\nnot a dot file\n");
    expect(g.stationName).toBe("");
    expect(g.nodes.length).toBe(0);
    expect(g.edges.length).toBe(0);
  });
});

// A2 样本图：覆盖全部九种一级映射组合 + box/white 三种 fallback + point + 未知组合
const CLASSIFY_GRAPH: DotGraph = {
  stationName: "",
  stationId: "",
  nodes: [
    { id: "n0", label: "CB_1", open: false, shape: "diamond", fillcolor: "green", x: 0, y: 0 },
    { id: "n1", label: "SW_1", open: false, shape: "invtriangle", fillcolor: "orange", x: 0, y: 0 },
    { id: "n2", label: "BBS_1", open: false, shape: "rect", fillcolor: "yellow", x: 0, y: 0 },
    { id: "n3", label: "LD_1", open: false, shape: "ellipse", fillcolor: "lightblue", x: 0, y: 0 },
    { id: "n4", label: "G_1", open: false, shape: "circle", fillcolor: "lightgreen", x: 0, y: 0 },
    { id: "n5", label: "LN_1", open: false, shape: "house", fillcolor: "lightgray", x: 0, y: 0 },
    { id: "n6", label: "SC_1", open: false, shape: "octagon", fillcolor: "pink", x: 0, y: 0 },
    { id: "n7", label: "T2_1", open: false, shape: "doubleoctagon", fillcolor: "plum", x: 0, y: 0 },
    { id: "n8", label: "T3_1", open: false, shape: "tripleoctagon", fillcolor: "thistle", x: 0, y: 0 },
    { id: "n9", label: "P_1", open: false, shape: "point", fillcolor: "black", x: 0, y: 0 },
    { id: "n10", label: "T3_1", open: false, shape: "box", fillcolor: "white", x: 0, y: 0 },
    { id: "n11", label: "SH_1", open: false, shape: "box", fillcolor: "white", x: 0, y: 0 },
    { id: "n12", label: "UNK_1", open: false, shape: "box", fillcolor: "white", x: 0, y: 0 },
    { id: "n13", label: "UNK_2", open: false, shape: "hexagon", fillcolor: "purple", x: 0, y: 0 },
  ],
  edges: [],
};

describe("classifyDotNode", () => {
  const ctx = buildClassifyContext(CLASSIFY_GRAPH);
  // 按索引取分类结果，行文简短
  const cls = (i: number) => classifyDotNode(CLASSIFY_GRAPH.nodes[i], ctx);

  it("A2 一级映射：九种 shape|fillcolor 组合命中对应 DeviceKind", () => {
    const cases: Array<[number, string]> = [
      [0, "ac-breaker"],
      [1, "ac-switch"],
      [2, "ac-bus"],
      [3, "ac-load"],
      [4, "ac-generator"],
      [5, "ac-line"],
      [6, "ac-capacitor"],
      [7, "ac-two-winding-transformer"],
      [8, "ac-three-winding-transformer"],
    ];
    for (const [i, kind] of cases) {
      expect(cls(i)).toEqual({ role: "device", kind });
    }
  });

  it("A2 point → collapse", () => {
    expect(cls(9)).toEqual({ role: "collapse" });
  });

  it("A2 box/white 且 label 与 tripleoctagon 同名 → winding-terminal，transformerLabel=该名", () => {
    expect(cls(10)).toEqual({ role: "winding-terminal", transformerLabel: "T3_1" });
  });

  it("A2 box/white 且 label 前缀 SH_ → device ac-capacitor + flag=shunt-assumed-capacitor", () => {
    expect(cls(11)).toEqual({ role: "device", kind: "ac-capacitor", flag: "shunt-assumed-capacitor" });
  });

  it("A2 box/white 其它 → device static-rect", () => {
    expect(cls(12)).toEqual({ role: "device", kind: "static-rect" });
  });

  it("A2 未知组合（hexagon/purple）→ device static-rect", () => {
    expect(cls(13)).toEqual({ role: "device", kind: "static-rect" });
  });
});

describe("buildClassifyContext", () => {
  it("收集图内全部 tripleoctagon 节点 label 集合", () => {
    const ctx = buildClassifyContext(CLASSIFY_GRAPH);
    expect(ctx.tripleLabels).toEqual(new Set(["T3_1"]));
  });

  it("图内无 tripleoctagon 时集合为空", () => {
    const g: DotGraph = { stationName: "", stationId: "", nodes: [CLASSIFY_GRAPH.nodes[0]], edges: [] };
    expect(buildClassifyContext(g).tripleLabels.size).toBe(0);
  });
});

// ===== A3 收缩（collapse）测试 =====
// 内联建图辅助：节点简写（缺省 shape/fillcolor 兜底）与图构造，风格同 CLASSIFY_GRAPH
const nd = (id: string, label: string, shape: string, fillcolor = "black"): DotNode => ({
  id,
  label,
  open: false,
  shape,
  fillcolor,
  x: 0,
  y: 0,
});
const mg = (nodes: DotNode[], edges: Array<[string, string]>): DotGraph => ({
  stationName: "",
  stationId: "",
  nodes,
  edges: edges.map(([from, to]) => ({ from, to })),
});

describe("collapseDotGraph", () => {
  it("A3 链 A→point→B：point 收缩，devices=[A,B] links=[A-B]", () => {
    const g = mg(
      [nd("n0", "A", "rect", "yellow"), nd("n1", "P_1", "point"), nd("n2", "B", "ellipse", "lightblue")],
      [["n0", "n1"], ["n1", "n2"]],
    );
    const r = collapseDotGraph(g);
    expect(r.devices.map((d) => d.label)).toEqual(["A", "B"]);
    expect(r.links).toEqual([{ from: "A", to: "B" }]);
  });

  it("A3 两 point 相邻 A→p1→p2→B：point 全并组，devices=[A,B] links=[A-B]", () => {
    const g = mg(
      [
        nd("n0", "A", "rect", "yellow"),
        nd("n1", "P_1", "point"),
        nd("n2", "P_2", "point"),
        nd("n3", "B", "ellipse", "lightblue"),
      ],
      [["n0", "n1"], ["n1", "n2"], ["n2", "n3"]],
    );
    const r = collapseDotGraph(g);
    expect(r.devices.map((d) => d.label)).toEqual(["A", "B"]);
    expect(r.links).toEqual([{ from: "A", to: "B" }]);
  });

  it("A3 绕组端子链 开关→point→T3_box→tripleoctagon：links 收缩到 tripleoctagon 设备", () => {
    const g = mg(
      [
        nd("n0", "SW_1", "invtriangle", "orange"),
        nd("n1", "P_1", "point"),
        nd("n2", "T3_1", "box", "white"),
        nd("n3", "T3_1", "tripleoctagon", "thistle"),
      ],
      [["n0", "n1"], ["n1", "n2"], ["n2", "n3"]],
    );
    const r = collapseDotGraph(g);
    // 收缩后设备为开关与三绕组本体；边收敛到 tripleoctagon 设备
    expect(r.devices.map((d) => d.label)).toEqual(["SW_1", "T3_1"]);
    expect(r.links).toEqual([{ from: "SW_1", to: "T3_1" }]);
  });

  it("A3 自环 A→p→A：link 丢弃，selfLoopDropped=1", () => {
    const g = mg(
      [nd("n0", "A", "rect", "yellow"), nd("n1", "P_1", "point")],
      [["n0", "n1"], ["n1", "n0"]],
    );
    const r = collapseDotGraph(g);
    expect(r.links).toEqual([]);
    expect(r.reportPart.selfLoopDropped).toBe(1);
  });

  it("A3 悬空边 n99→n100（n99 不存在）：忽略，danglingEdgeDropped=1", () => {
    const g = mg([nd("n0", "A", "rect", "yellow")], [["n99", "n100"]]);
    const r = collapseDotGraph(g);
    expect(r.links).toEqual([]);
    expect(r.devices.map((d) => d.label)).toEqual(["A"]);
    expect(r.reportPart.danglingEdgeDropped).toBe(1);
  });

  it("A3 望道变 fixture：devices+collapsedCount=250，links 数与实跑一致（G8）", () => {
    const text = readFileSync(new URL("./__fixtures__/dot/望道变_6.dot", import.meta.url), "utf8");
    const r = collapseDotGraph(parseDot(text));
    // 250 节点 = 141 设备 + 109 收缩（103 point + 6 绕组端子）
    expect(r.devices.length).toBe(141);
    expect(r.reportPart.collapsedCount).toBe(109);
    expect(r.devices.length + r.reportPart.collapsedCount).toBe(250);
    // 实跑值（G8：以实跑为准）；T3_1/T3_2 各收 3 条绕组侧边
    expect(r.links.length).toBe(185);
    expect(r.reportPart.selfLoopDropped).toBe(24);
    expect(r.reportPart.danglingEdgeDropped).toBe(0);
    expect(r.links.filter((l) => l.from === l.to)).toEqual([]);
  });
});

// ===== A4 模型装配（mapDotGraphToModel / importDotFile）测试 =====

describe("mapDotGraphToModel", () => {
  it("A4 MINI_DOT：收缩后 3 设备（母线+隔离开关+断路器）、2 边，坐标平移 (100,100)", () => {
    const { project, report } = mapDotGraphToModel(parseDot(MINI_DOT));
    expect(report.deviceCount).toBe(3);
    expect(project.nodes.length).toBe(3);
    expect(project.edges.length).toBe(2);
    expect(report.edgeCount).toBe(2);
    expect(project.nodes.map((n) => n.name).sort()).toEqual(["BBS_1", "CB_1", "SW_1"]);
    // y 不取反：dot y=300 的母线平移后 y=200（bbox 归零后 +100）
    const bus = project.nodes.find((n) => n.name === "BBS_1")!;
    expect(bus.position).toEqual({ x: 100, y: 200 });
  });

  it("A4 电压 BFS：INTERNAL_VL point 源 → 母线 vbase=230、开关链设备 vbase 同为 230", () => {
    const { project } = mapDotGraphToModel(parseDot(MINI_DOT));
    const byName = new Map(project.nodes.map((n) => [n.name, n]));
    expect(byName.get("BBS_1")!.params.vbase).toBe("230");
    expect(byName.get("SW_1")!.params.vbase).toBe("230");
    expect(byName.get("CB_1")!.params.vbase).toBe("230");
    expect(byName.get("BBS_1")!.params.rated_voltage).toBe("230");
  });

  it("A4 [OPEN] 开关：status=0 且 closed_status=0；非 OPEN 开关 status=1 且 closed_status=1", () => {
    const { project } = mapDotGraphToModel(parseDot(MINI_DOT));
    const byName = new Map(project.nodes.map((n) => [n.name, n]));
    const sw = byName.get("SW_1")!;
    const br = byName.get("CB_1")!;
    expect(sw.params.status).toBe("0");
    expect(sw.params.closed_status).toBe("0");
    expect(br.params.status).toBe("1");
    expect(br.params.closed_status).toBe("1");
    // 画布渲染状态锁定：平台对开关类读 closed_status（resolveDeviceStateVisual）
    // OPEN 开关渲染为分位（value=0），非 OPEN 断路器渲染为闭合（value=1）
    expect(resolveDeviceStateVisual(getTemplate("ac-switch"), sw)?.value).toBe("0");
    expect(resolveDeviceStateVisual(getTemplate("ac-breaker"), br)?.value).toBe("1");
  });

  it("A4 边构造：母线侧 terminalId 留空，设备侧端子已分配", () => {
    const { project } = mapDotGraphToModel(parseDot(MINI_DOT));
    const bus = project.nodes.find((n) => n.kind === "ac-bus")!;
    expect(bus.terminals.length).toBe(0);
    const busEdge = project.edges.find((e) => e.sourceId === bus.id || e.targetId === bus.id)!;
    expect(busEdge.sourceTerminalId ?? busEdge.targetTerminalId).toBeDefined();
    // 母线侧（source 或 target）terminalId 为 undefined
    const busSideIsSource = busEdge.sourceId === bus.id;
    expect(busSideIsSource ? busEdge.sourceTerminalId : busEdge.targetTerminalId).toBeUndefined();
    // 非母线侧端子已分配且端点坐标已填
    const deviceSideTerminalId = busSideIsSource ? busEdge.targetTerminalId : busEdge.sourceTerminalId;
    const deviceSidePoint = busSideIsSource ? busEdge.targetPoint : busEdge.sourcePoint;
    expect(deviceSideTerminalId).toBeDefined();
    expect(deviceSidePoint).toBeDefined();
  });

  it("A4 母线宽启发式：≥120 且 ≥ 连接设备 x 范围+60", () => {
    const g: DotGraph = {
      stationName: "",
      stationId: "",
      nodes: [
        { id: "n0", label: "BBS_1", open: false, shape: "rect", fillcolor: "yellow", x: 0, y: 0 },
        { id: "n1", label: "SW_1", open: false, shape: "invtriangle", fillcolor: "orange", x: 150, y: 0 },
        { id: "n2", label: "LD_1", open: false, shape: "ellipse", fillcolor: "lightblue", x: 400, y: 0 },
      ],
      edges: [
        { from: "n0", to: "n1" },
        { from: "n0", to: "n2" },
      ],
    };
    const { project } = mapDotGraphToModel(g);
    const bus = project.nodes.find((n) => n.kind === "ac-bus")!;
    expect(bus.size.width).toBeGreaterThanOrEqual(120);
    // 连接设备 x 范围 = 400 - 150 = 250 → 宽 ≥ 310
    expect(bus.size.width).toBeGreaterThanOrEqual(250 + 60);
  });

  it("A4 report.kindCounts 一致性：Σ = deviceCount；collapsedCount 与收缩数一致", () => {
    const { report } = mapDotGraphToModel(parseDot(MINI_DOT));
    const sum = Object.values(report.kindCounts).reduce((a, b) => a + b, 0);
    expect(sum).toBe(report.deviceCount);
    expect(report.kindCounts["ac-bus"]).toBe(1);
    expect(report.kindCounts["ac-switch"]).toBe(1);
    expect(report.kindCounts["ac-breaker"]).toBe(1);
    expect(report.collapsedCount).toBe(1); // 仅 point 收缩
    expect(report.selfLoopDropped).toBe(0);
    expect(report.danglingEdgeDropped).toBe(0);
  });

  it("A4 static-rect 置灰 + SH_ 容性假设清单", () => {
    const g: DotGraph = {
      stationName: "",
      stationId: "",
      nodes: [
        { id: "n0", label: "SH_1", open: false, shape: "box", fillcolor: "white", x: 0, y: 0 },
        { id: "n1", label: "UNK_1", open: false, shape: "box", fillcolor: "white", x: 100, y: 0 },
      ],
      edges: [],
    };
    const { project, report } = mapDotGraphToModel(g);
    expect(report.shuntAssumedCapacitorNames).toEqual(["SH_1"]);
    expect(report.unknownStaticNames).toEqual(["UNK_1"]);
    expect(report.unknownStaticCount).toBe(1);
    const rect = project.nodes.find((n) => n.kind === "static-rect")!;
    expect(rect.params.fillColor).toBe("#cccccc");
    expect(project.nodes.find((n) => n.kind === "ac-capacitor")?.name).toBe("SH_1");
  });

  it("A4 空图：返回空 project 与 report，不抛错", () => {
    const { project, report } = mapDotGraphToModel({ stationName: "", stationId: "", nodes: [], edges: [] });
    expect(project.nodes).toEqual([]);
    expect(project.edges).toEqual([]);
    expect(report.deviceCount).toBe(0);
    expect(report.edgeCount).toBe(0);
    expect(Object.keys(report.kindCounts).length).toBe(0);
    expect(report.collapsedCount).toBe(0);
  });
});

describe("importDotFile", () => {
  it("MINI_DOT 文本 → 装配结果", () => {
    const { project, report } = importDotFile(MINI_DOT);
    expect(report.deviceCount).toBe(3);
    expect(project.nodes.length).toBe(3);
    expect(project.name).toBe("望道变_6");
  });

  it("空文本抛错拒绝（spec §7）", () => {
    expect(() => importDotFile("")).toThrow(/dot 文件为空/);
    expect(() => importDotFile("some random text\n")).toThrow(/dot 文件为空/);
  });

  it("望道变 fixture 全链路装配无碍（实跑校验）", () => {
    const text = readFileSync(new URL("./__fixtures__/dot/望道变_6.dot", import.meta.url), "utf8");
    const { project, report } = importDotFile(text);
    expect(project.name).toBe("望道变_6");
    expect(report.deviceCount).toBe(141);
    expect(report.edgeCount).toBe(185);
    expect(project.nodes.length).toBe(report.deviceCount);
    expect(project.edges.length).toBe(report.edgeCount);
    const sum = Object.values(report.kindCounts).reduce((a, b) => a + b, 0);
    expect(sum).toBe(report.deviceCount);
    expect(report.collapsedCount).toBe(109);
    expect(report.selfLoopDropped).toBe(24);
    expect(report.danglingEdgeDropped).toBe(0);
    expect(report.unknownStaticNames).toEqual([]);
    // G8 实跑：fixture 仅 4 个 SH_ box 节点（SH_1..SH_4），计划预估 8 有误
    expect(report.shuntAssumedCapacitorNames).toHaveLength(4);
    expect(report.kindCounts["ac-three-winding-transformer"]).toBe(2);
    // 电压：母线 vbase 非空比例 >80%
    const buses = project.nodes.filter((n) => n.kind === "ac-bus");
    expect(buses.length).toBeGreaterThanOrEqual(8);
    const busesWithVoltage = buses.filter((n) => n.params.vbase && n.params.vbase !== "0");
    expect(busesWithVoltage.length / buses.length).toBeGreaterThan(0.8);
    // [OPEN] 设备 status=0（fixture 实跑无 [OPEN] 标记，openSwitchCount=0；计数与 status 一致）
    expect(project.nodes.filter((n) => n.params.status === "0").length).toBe(report.openSwitchCount);
    // 三绕组两侧端子电压均已传播写入（230/115/35 三侧各得其值）
    for (const t of project.nodes.filter((n) => n.kind === "ac-three-winding-transformer")) {
      expect([t.params.i_vbase, t.params.k_vbase, t.params.j_vbase].sort()).toEqual(["115", "230", "35"]);
    }
  });
});
