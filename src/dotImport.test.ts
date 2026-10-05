import { beforeAll, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolveDeviceStateVisual } from "./model";
import { getTemplate, createDefaultNode } from "./model-node-ops";
import { getTerminalPoint } from "./model-routing";
import { parseDot, buildClassifyContext, classifyDotNode, collapseDotGraph, mapDotGraphToModel, importDotFile, deviceAdjacentReferencePoints, deviceRotation, orthogonalRouteWithinCorners } from "./dotImport";
import type { DotGraph, DotNode, DotImportResult } from "./dotImport";

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

  // .dot 由用户从 Graphviz 外部导出，可能手工改过。NODE_RE 的 pos 是 ([^"]+)，
  // 不要求逗号 —— 单值 pos 会让 split 只得一段，py 为 undefined，
  // 原实现 py.replace 直接 TypeError，整次导入崩掉。
  it("单值 pos（缺 y）跳过该节点，不崩、其余节点照常", () => {
    const g = parseDot(`digraph G {
  n0 [label="A", shape=rect, fillcolor=yellow, pos="100,300!"];
  n1 [label="B", shape=rect, fillcolor=yellow, pos="615.0"];
  n2 [label="C", shape=rect, fillcolor=yellow, pos="100,200!"];
}`);
    expect(g.nodes.map((n) => n.id)).toEqual(["n0", "n2"]);
  });

  it("非数值坐标跳过该节点（parseFloat 出 NaN）", () => {
    const g = parseDot(`digraph G {
  n0 [label="A", shape=rect, fillcolor=yellow, pos="abc,def"];
  n1 [label="B", shape=rect, fillcolor=yellow, pos="100,200!"];
}`);
    expect(g.nodes.map((n) => n.id)).toEqual(["n1"]);
  });

  it("缺 x（pos 以逗号开头）同样跳过", () => {
    const g = parseDot(`digraph G {
  n0 [label="A", shape=rect, fillcolor=yellow, pos=",300"];
  n1 [label="B", shape=rect, fillcolor=yellow, pos="100,200!"];
}`);
    expect(g.nodes.map((n) => n.id)).toEqual(["n1"]);
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
  it("坏坐标只废掉自己那一维：y=NaN 不再把全图 y 变成 NaN", () => {
    // 旧写法只判 minX 是否有限，minY 被 NaN 污染后 oy=NaN，正常设备的 y 全废。
    // 坐标本身坏掉的那个设备仍会带着 NaN（源头在 DOT 解析，不在本守卫范围内）。
    const g = mg(
      [
        { ...nd("n0", "BBS_1", "rect", "yellow"), x: 0, y: 0 },
        { ...nd("n1", "SW_1", "invtriangle", "orange"), x: 150, y: Number.NaN }
      ],
      [["n0", "n1"]]
    );
    const { project } = mapDotGraphToModel(g);
    const byName = new Map(project.nodes.map((node) => [node.name, node]));
    expect(byName.get("BBS_1")!.position).toEqual({ x: 100, y: 100 });
  });

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

  it("A4 同名多实例设备：独立实例保留，duplicateLabelNames 报告计数，连接落在首个实例", () => {
    const g: DotGraph = {
      stationName: "",
      stationId: "",
      nodes: [
        { id: "n0", label: "BBS_1", open: false, shape: "rect", fillcolor: "yellow", x: 0, y: 0 },
        { id: "n1", label: "BBS_1", open: false, shape: "rect", fillcolor: "yellow", x: 100, y: 0 },
        { id: "n2", label: "LD_1", open: false, shape: "ellipse", fillcolor: "lightblue", x: 200, y: 0 },
      ],
      edges: [
        { from: "n0", to: "n2" },
        { from: "n1", to: "n2" },
      ],
    };
    const { project, report } = mapDotGraphToModel(g);
    // 独立实例保留（2 个同名母线都在，spec §7）
    expect(project.nodes.filter((n) => n.name === "BBS_1")).toHaveLength(2);
    // 报告计数收录重复 label
    expect(report.duplicateLabelNames).toEqual(["BBS_1"]);
    // 同名对直积跳过 + 重复 label 对 link 去重后仅 1 边，落在首个实例（图序 n0，平移后 x=100）
    expect(project.edges).toHaveLength(1);
    const firstBus = project.nodes.find((n) => n.name === "BBS_1" && n.position.x === 100)!;
    expect(project.edges[0].sourceId === firstBus.id || project.edges[0].targetId === firstBus.id).toBe(true);
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

// ===== A6 集成测试（Task 6）：望道变 fixture 全链路 =====
// 数字以 G8 实跑为准（fixture：250 节点/255 边 → 141 设备/185 边/109 收缩/24 自环）。

describe("importDotFile 望道变 fixture 全链路集成（A6）", () => {
  const text = readFileSync(new URL("./__fixtures__/dot/望道变_6.dot", import.meta.url), "utf8");
  let result!: DotImportResult;
  beforeAll(() => {
    result = importDotFile(text);
  });

  it("A6-1 节点/边计数 = 报告值（141 设备 / 185 边，均 >0）", () => {
    expect(result.project.nodes.length).toBe(result.report.deviceCount);
    expect(result.report.deviceCount).toBeGreaterThan(0);
    expect(result.report.deviceCount).toBe(141);
    expect(result.project.edges.length).toBe(result.report.edgeCount);
    expect(result.report.edgeCount).toBeGreaterThan(0);
    expect(result.report.edgeCount).toBe(185);
  });

  it("A6-2 kindCounts：Σ=deviceCount；母线≥1、断路器≥20、隔离开关≥70（实跑 72，A6 预估≥100 按实跑修正）", () => {
    const sum = Object.values(result.report.kindCounts).reduce((a, b) => a + b, 0);
    expect(sum).toBe(result.report.deviceCount);
    expect(result.report.kindCounts["ac-bus"]).toBeGreaterThanOrEqual(1);
    expect(result.report.kindCounts["ac-breaker"]).toBeGreaterThanOrEqual(20);
    // 实跑锚定：隔离开关最多（72 > 断路器 37 > 母线 8）
    expect(result.report.kindCounts["ac-switch"]).toBeGreaterThanOrEqual(70);
    expect(result.report.kindCounts["ac-switch"]).toBe(72);
    expect(result.report.kindCounts["ac-breaker"]).toBe(37);
  });

  it("A6-3 三绕组 =2（T3_1/T3_2），绕组端子已收缩不出现在 nodes", () => {
    expect(result.report.kindCounts["ac-three-winding-transformer"]).toBe(2);
    // T3_ 名下节点全部为三绕组本体：绕组端子 box 经 R3 收缩后不产生额外节点
    const t3 = result.project.nodes.filter((n) => n.name === "T3_1" || n.name === "T3_2");
    expect(t3).toHaveLength(2);
    expect(t3.every((n) => n.kind === "ac-three-winding-transformer")).toBe(true);
  });

  it("A6-4 电压：母线 8 个 vbase 全非空（>80%）；三绕组分侧 i=230/k=35/j=115", () => {
    const buses = result.project.nodes.filter((n) => n.kind === "ac-bus");
    expect(buses.length).toBe(8);
    const busesWithVoltage = buses.filter((n) => n.params.vbase && n.params.vbase !== "0");
    expect(busesWithVoltage.length / buses.length).toBeGreaterThan(0.8);
    for (const t of result.project.nodes.filter((n) => n.kind === "ac-three-winding-transformer")) {
      expect([t.params.i_vbase, t.params.k_vbase, t.params.j_vbase].sort()).toEqual(["115", "230", "35"]);
    }
  });

  it("A6-5 [OPEN] 设备 status=0：fixture 无 [OPEN] 实例（openSwitchCount=0，fixture 断言跳过），由 MINI_DOT 合成样本覆盖", () => {
    expect(result.report.openSwitchCount).toBe(0);
    expect(result.project.nodes.filter((n) => n.params.status === "0").length).toBe(result.report.openSwitchCount);
    // 合成样本（MINI_DOT 含 [OPEN] 隔离开关）覆盖 status=0 行为
    const mini = importDotFile(MINI_DOT);
    const sw = mini.project.nodes.find((n) => n.name === "SW_1")!;
    expect(sw.params.status).toBe("0");
    expect(sw.params.closed_status).toBe("0");
  });

  it("A6-6 兜底清单：unknownStaticNames 空；shuntAssumedCapacitorNames 长度 4（实跑 SH_1..SH_4，A6 预估 8 按实跑修正）", () => {
    expect(result.report.unknownStaticNames).toEqual([]);
    expect(result.report.unknownStaticCount).toBe(0);
    expect(result.report.shuntAssumedCapacitorNames).toHaveLength(4);
    expect(result.report.shuntAssumedCapacitorNames.sort()).toEqual(["SH_1", "SH_2", "SH_3", "SH_4"]);
  });

  it("A6-7 端子耗尽（遗留抽查）：SW_56 4 连接/2 端子部分边 terminalId 留空，edges 总数不受影响", () => {
    const sw56 = result.project.nodes.find((n) => n.name === "SW_56")!;
    expect(sw56.terminals.length).toBe(2);
    const sw56Edges = result.project.edges.filter((e) => e.sourceId === sw56.id || e.targetId === sw56.id);
    expect(sw56Edges.length).toBe(4);
    // 2 条分配到端子，其余设备侧 terminalId 留空（端子耗尽）
    const sw56TermAssigned = sw56Edges.filter(
      (e) => (e.sourceId === sw56.id ? e.sourceTerminalId : e.targetTerminalId) !== undefined,
    );
    expect(sw56TermAssigned.length).toBe(2);
    // 全 fixture 存在设备侧 terminalId 为 undefined 的边（实跑 73 条），不影响 edges 总数
    const nodeById = new Map(result.project.nodes.map((n) => [n.id, n]));
    const deviceSideUndefined = result.project.edges.filter((e) => {
      const a = nodeById.get(e.sourceId)!;
      const b = nodeById.get(e.targetId)!;
      return (
        (a.kind !== "ac-bus" && e.sourceTerminalId === undefined) ||
        (b.kind !== "ac-bus" && e.targetTerminalId === undefined)
      );
    });
    expect(deviceSideUndefined.length).toBeGreaterThan(0);
    expect(deviceSideUndefined.length).toBe(73);
    expect(result.project.edges.length).toBe(result.report.edgeCount);
  });
});

// ===== B1 设备朝向（rotation）测试（plan Task 1）=====

// 带坐标节点简写（nd 固定 (0,0)，朝向测试需要任意坐标）
const ndp = (id: string, label: string, shape: string, fillcolor: string, x: number, y: number): DotNode => ({
  id,
  label,
  open: false,
  shape,
  fillcolor,
  x,
  y,
});

describe("deviceAdjacentReferencePoints", () => {
  it("B1-1 提取设备相邻收缩节点坐标（按 dot 节点 id 键；point 自身不是设备）", () => {
    const g = mg(
      [
        ndp("n0", "SW_1", "invtriangle", "orange", 100, 200),
        ndp("n1", "P_1", "point", "black", 100, 150),
        ndp("n2", "LD_1", "ellipse", "lightblue", 100, 100),
      ],
      [["n0", "n1"], ["n1", "n2"]],
    );
    const refs = deviceAdjacentReferencePoints(g);
    expect(refs.get("n0")).toEqual([{ x: 100, y: 150 }]);
    expect(refs.get("n2")).toEqual([{ x: 100, y: 150 }]);
    expect(refs.has("n1")).toBe(false);
  });

  it("B1-2 绕组端子 box 作为三绕组本体的朝向参考（而非 point）", () => {
    const g = mg(
      [
        ndp("n0", "SW_1", "invtriangle", "orange", 100, 100),
        ndp("n1", "P_1", "point", "black", 100, 150),
        ndp("n2", "T3_1", "box", "white", 100, 200),
        ndp("n3", "T3_1", "tripleoctagon", "thistle", 300, 200),
      ],
      [["n0", "n1"], ["n1", "n2"], ["n2", "n3"]],
    );
    const refs = deviceAdjacentReferencePoints(g);
    expect(refs.get("n0")).toEqual([{ x: 100, y: 150 }]);
    expect(refs.get("n3")).toEqual([{ x: 100, y: 200 }]);
  });
});

describe("deviceRotation", () => {
  const pos = { x: 0, y: 0 };

  it("B1-3 单端子设备（ac-load 锚点 (0,-0.5) 默认朝上）：上0/右90/下180/左270", () => {
    const load = createDefaultNode("ac-load", pos);
    expect(deviceRotation(load, [{ x: 0, y: -50 }], pos)).toBe(0);
    expect(deviceRotation(load, [{ x: 50, y: 0 }], pos)).toBe(90);
    expect(deviceRotation(load, [{ x: 0, y: 50 }], pos)).toBe(180);
    expect(deviceRotation(load, [{ x: -50, y: 0 }], pos)).toBe(270);
  });

  it("B1-4 双端子设备（ac-switch 锚点左右）：垂直 90、水平 0", () => {
    const sw = createDefaultNode("ac-switch", pos);
    expect(deviceRotation(sw, [{ x: 0, y: -50 }], pos)).toBe(90);
    expect(deviceRotation(sw, [{ x: 0, y: 50 }], pos)).toBe(90);
    expect(deviceRotation(sw, [{ x: -50, y: 0 }], pos)).toBe(0);
    expect(deviceRotation(sw, [{ x: 50, y: 0 }], pos)).toBe(0);
  });

  it("B1-5 无端子（母线）/无参考点/零向量：rotation=0", () => {
    const bus = createDefaultNode("ac-bus", pos);
    const sw = createDefaultNode("ac-switch", pos);
    expect(deviceRotation(bus, [{ x: 0, y: -50 }], pos)).toBe(0);
    expect(deviceRotation(sw, [], pos)).toBe(0);
    expect(deviceRotation(sw, [{ x: 0, y: 0 }], pos)).toBe(0); // 黑点与设备同坐标
  });

  it("B1-6 邻侧歧义：以首个参考点方位为准", () => {
    const sw = createDefaultNode("ac-switch", pos);
    expect(deviceRotation(sw, [{ x: 0, y: -50 }, { x: 50, y: 0 }], pos)).toBe(90); // 首参考点在上
    expect(deviceRotation(sw, [{ x: 50, y: 0 }, { x: 0, y: -50 }], pos)).toBe(0); // 首参考点在右
  });
});

describe("mapDotGraphToModel 朝向落位", () => {
  it("B1-7 垂直串：开关/断路器 rotation=90，母线不旋转", () => {
    const g = mg(
      [
        ndp("n0", "BBS_1", "rect", "yellow", 100, 100),
        ndp("n1", "P_1", "point", "black", 100, 150),
        ndp("n2", "SW_1", "invtriangle", "orange", 100, 200),
        ndp("n3", "P_2", "point", "black", 100, 250),
        ndp("n4", "CB_1", "diamond", "green", 100, 300),
      ],
      [["n0", "n1"], ["n1", "n2"], ["n2", "n3"], ["n3", "n4"]],
    );
    const { project } = mapDotGraphToModel(g);
    const byName = new Map(project.nodes.map((n) => [n.name, n]));
    expect(byName.get("SW_1")!.rotation).toBe(90);
    expect(byName.get("CB_1")!.rotation).toBe(90);
    expect(byName.get("BBS_1")!.rotation).toBe(0);
  });

  it("B1-8 水平串 rotation=0；设备直连设备（无 point）rotation=0", () => {
    const g = mg(
      [
        ndp("n0", "BBS_1", "rect", "yellow", 100, 100),
        ndp("n1", "P_1", "point", "black", 150, 100),
        ndp("n2", "CB_1", "diamond", "green", 200, 100),
      ],
      [["n0", "n1"], ["n1", "n2"]],
    );
    const { project } = mapDotGraphToModel(g);
    const byName = new Map(project.nodes.map((n) => [n.name, n]));
    expect(byName.get("CB_1")!.rotation).toBe(0);

    const g2 = mg(
      [
        ndp("n0", "CB_2", "diamond", "green", 100, 100),
        ndp("n1", "LD_2", "ellipse", "lightblue", 200, 100),
      ],
      [["n0", "n1"]],
    );
    const r2 = mapDotGraphToModel(g2);
    for (const n of r2.project.nodes) expect(n.rotation).toBe(0);
  });
});

// ===== B2 端子分配对齐方位 + 母线投影端点（plan Task 2）=====

// 垂直串：母线(100,100) → point(100,150) → 开关(100,200)
const verticalGraph = () =>
  mg(
    [
      ndp("n0", "BBS_1", "rect", "yellow", 100, 100),
      ndp("n1", "P_1", "point", "black", 100, 150),
      ndp("n2", "SW_1", "invtriangle", "orange", 100, 200),
    ],
    [["n0", "n1"], ["n1", "n2"]],
  );

describe("mapDotGraphToModel 端子对齐与端点", () => {
  it("B2-1 设备侧端点朝向相邻 point 方位（点在上→端点在设备中心上方）", () => {
    const { project } = mapDotGraphToModel(verticalGraph());
    const sw = project.nodes.find((n) => n.name === "SW_1")!;
    const swEdge = project.edges.find((e) => e.sourceId === sw.id || e.targetId === sw.id)!;
    const swPoint = (swEdge.sourceId === sw.id ? swEdge.sourcePoint : swEdge.targetPoint)!;
    expect(swPoint.y).toBeLessThan(sw.position.y); // point 在开关上方
  });

  it("B2-2 设备侧端点 = getTerminalPoint(node, 分配端子)（与渲染端点严格一致）", () => {
    const { project } = mapDotGraphToModel(verticalGraph());
    const sw = project.nodes.find((n) => n.name === "SW_1")!;
    const swEdge = project.edges.find((e) => e.sourceId === sw.id || e.targetId === sw.id)!;
    const swIsSource = swEdge.sourceId === sw.id;
    const swTid = swIsSource ? swEdge.sourceTerminalId : swEdge.targetTerminalId;
    const swPoint = swIsSource ? swEdge.sourcePoint : swEdge.targetPoint;
    expect(swTid).toBeDefined();
    expect(swPoint).toEqual(getTerminalPoint(sw, swTid));
  });

  it("B2-3 母线侧：terminalId 留空，端点投影到母线中心线（y=母线中心）", () => {
    const { project } = mapDotGraphToModel(verticalGraph());
    const bus = project.nodes.find((n) => n.kind === "ac-bus")!;
    const busEdge = project.edges.find((e) => e.sourceId === bus.id || e.targetId === bus.id)!;
    const busIsSource = busEdge.sourceId === bus.id;
    const busTid = busIsSource ? busEdge.sourceTerminalId : busEdge.targetTerminalId;
    const busPoint = busIsSource ? busEdge.sourcePoint : busEdge.targetPoint;
    expect(busTid).toBeUndefined();
    expect(busPoint).toBeDefined();
    expect(busPoint!.y).toBe(bus.position.y); // 水平母线中心线
  });
});

// ===== B3 锚点到锚点正交布线（plan Task 3）=====

describe("orthogonalRouteWithinCorners", () => {
  // 折线段与盒（含边界）是否相交（测试本地判定，与实现无关）
  const hitsBox = (a: { x: number; y: number }, b: { x: number; y: number }, box: { minX: number; minY: number; maxX: number; maxY: number }): boolean => {
    const loX = Math.min(a.x, b.x);
    const hiX = Math.max(a.x, b.x);
    const loY = Math.min(a.y, b.y);
    const hiY = Math.max(a.y, b.y);
    return hiX >= box.minX && loX <= box.maxX && hiY >= box.minY && loY <= box.maxY;
  };
  const assertOrthogonal = (route: Array<{ x: number; y: number }>): void => {
    for (let i = 1; i < route.length; i++) {
      expect(route[i].x === route[i - 1].x || route[i].y === route[i - 1].y).toBe(true);
    }
  };

  it("B3-1 同轴直连：0 拐 2 点", () => {
    const route = orthogonalRouteWithinCorners({ x: 0, y: 0 }, { x: 0, y: 100 }, [], []);
    expect(route).toEqual([
      { x: 0, y: 0 },
      { x: 0, y: 100 },
    ]);
  });

  it("B3-2 异轴无阻挡：L 形 1 拐，每段正交", () => {
    const route = orthogonalRouteWithinCorners({ x: 0, y: 0 }, { x: 100, y: 50 }, [], []);
    expect(route).toHaveLength(3);
    expect(route[0]).toEqual({ x: 0, y: 0 });
    expect(route[2]).toEqual({ x: 100, y: 50 });
    assertOrthogonal(route);
  });

  it("B3-3 直连与 L 形被挡、Z 形可避让：选 2 拐且避开阻挡盒", () => {
    // ac-switch 归一化后 150x100 @ (100,0)，横穿 start(0,0)→end(200,0) 的直连
    const blocker = createDefaultNode("ac-switch", { x: 100, y: 0 });
    const route = orthogonalRouteWithinCorners({ x: 0, y: 0 }, { x: 200, y: 0 }, [blocker], []);
    expect(route).toHaveLength(4); // 2 拐
    assertOrthogonal(route);
    const hw = blocker.size.width / 2;
    const hh = blocker.size.height / 2;
    const box = { minX: 100 - hw, minY: -hh, maxX: 100 + hw, maxY: hh };
    for (let i = 1; i < route.length; i++) {
      expect(hitsBox(route[i - 1], route[i], box)).toBe(false);
    }
  });

  it("B3-4 拐点预算内全穿：接受交叉，取拐点最少的直连", () => {
    // 上下相邻阻挡盒恰好堵住 blocker0 导出的两条 Z lane（lane=盒边界外扩净距处），
    // 且外侧阻挡盒与走廊不相交、不再贡献新 lane → 全部候选穿 → 直连兜底
    const blocker0 = createDefaultNode("ac-switch", { x: 100, y: 0 });
    const laneOffset = blocker0.size.height / 2 + 2;
    const blockers = [
      blocker0,
      createDefaultNode("ac-switch", { x: 100, y: -laneOffset }),
      createDefaultNode("ac-switch", { x: 100, y: laneOffset }),
    ];
    const route = orthogonalRouteWithinCorners({ x: 0, y: 0 }, { x: 200, y: 0 }, blockers, []);
    expect(route).toEqual([
      { x: 0, y: 0 },
      { x: 200, y: 0 },
    ]);
  });

  it("B3-5 map 落位：每条边写 routePoints，首末与端点一致、正交、拐点 ≤2", () => {
    const { project } = mapDotGraphToModel(verticalGraph());
    expect(project.edges.length).toBeGreaterThan(0);
    for (const edge of project.edges) {
      const route = edge.routePoints!;
      expect(route).toBeDefined();
      expect(route[0]).toEqual(edge.sourcePoint);
      expect(route[route.length - 1]).toEqual(edge.targetPoint);
      expect(route.length - 2).toBeLessThanOrEqual(2);
      assertOrthogonal(route);
    }
  });
});

// ===== B4 朝向+正交布线 fixture 集成（plan Task 4）=====

describe("importDotFile 望道变 fixture 朝向+正交布线集成（B4）", () => {
  const text = readFileSync(new URL("./__fixtures__/dot/望道变_6.dot", import.meta.url), "utf8");
  let result!: DotImportResult;
  beforeAll(() => {
    result = importDotFile(text);
  });

  // 线段与盒相交（含边界，本地判定）
  const boxHitsSegment = (
    a: { x: number; y: number },
    b: { x: number; y: number },
    box: { minX: number; minY: number; maxX: number; maxY: number },
  ): boolean => {
    const loX = Math.min(a.x, b.x);
    const hiX = Math.max(a.x, b.x);
    const loY = Math.min(a.y, b.y);
    const hiY = Math.max(a.y, b.y);
    return hiX >= box.minX && loX <= box.maxX && hiY >= box.minY && loY <= box.maxY;
  };
  // 设备阻挡盒（position 为中心，90/270 交换宽高，与实现 importRouteBlockerBox 同语义）
  const blockerBoxOf = (n: (typeof result.project.nodes)[number]) => {
    const swap = Math.abs(Math.sin((n.rotation * Math.PI) / 180)) > 0.5;
    const hw = (swap ? n.size.height : n.size.width) / 2;
    const hh = (swap ? n.size.width : n.size.height) / 2;
    return { minX: n.position.x - hw, minY: n.position.y - hh, maxX: n.position.x + hw, maxY: n.position.y + hh };
  };
  const assertOrthogonal = (route: Array<{ x: number; y: number }>): void => {
    for (let i = 1; i < route.length; i++) {
      expect(route[i].x === route[i - 1].x || route[i].y === route[i - 1].y).toBe(true);
    }
  };

  it("B4-1 全部边 routePoints 存在、首末点与端点一致", () => {
    expect(result.project.edges.length).toBe(185);
    for (const edge of result.project.edges) {
      expect(edge.sourcePoint).toBeDefined();
      expect(edge.targetPoint).toBeDefined();
      expect(edge.routePoints).toBeDefined();
      expect(edge.routePoints![0]).toEqual(edge.sourcePoint);
      expect(edge.routePoints![edge.routePoints!.length - 1]).toEqual(edge.targetPoint);
    }
  });

  it("B4-2 每段严格正交（100% 硬断言）", () => {
    for (const edge of result.project.edges) {
      assertOrthogonal(edge.routePoints!);
    }
  });

  it("B4-3 每边拐点 ≤2（硬断言）", () => {
    for (const edge of result.project.edges) {
      expect(edge.routePoints!.length - 2).toBeLessThanOrEqual(2);
    }
  });

  it("B4-4 设备 rotation 已写入（非全 0）", () => {
    const rotated = result.project.nodes.filter((n) => n.rotation !== 0);
    expect(rotated.length).toBeGreaterThan(0);
  });

  it("B4-5 穿第三方设备边数（软指标，仅统计打印，不设硬门槛）", () => {
    let crossing = 0;
    for (const edge of result.project.edges) {
      const route = edge.routePoints!;
      const boxes = result.project.nodes
        .filter((n) => n.id !== edge.sourceId && n.id !== edge.targetId)
        .map(blockerBoxOf);
      let hit = false;
      for (let i = 1; i < route.length && !hit; i++) {
        for (const box of boxes) {
          if (boxHitsSegment(route[i - 1], route[i], box)) {
            hit = true;
            break;
          }
        }
      }
      if (hit) crossing++;
    }
    console.log(`[B4-5 软指标] 穿第三方设备边数 ${crossing}/${result.project.edges.length}（导入基线 177/185）`);
    expect(crossing).toBeLessThanOrEqual(result.project.edges.length);
  });
});

// ===== C 修复守卫：DOT 属性顺序无关 + link 去重键无歧义 =====

// 测试侧工具：引号感知的逗号切分（属性值里含逗号，如 pos="615.0,307.0!"）
const splitDotAttrs = (body: string): string[] => {
  const parts: string[] = [];
  let cur = "";
  let inQuote = false;
  for (let i = 0; i < body.length; i++) {
    const ch = body[i];
    if (ch === '"' && body[i - 1] !== "\\") inQuote = !inQuote;
    if (ch === "," && !inQuote) {
      parts.push(cur.trim());
      cur = "";
      continue;
    }
    cur += ch;
  }
  parts.push(cur.trim());
  return parts;
};

// 测试侧工具：把每行 `id [k=v, ...];` 的属性顺序整体反转（graph/node/edge 默认语句一并反转，
// 它们仍不是节点行，不影响断言）。用于证明「换序解析结果与标准顺序逐项相同」。
const reverseAttrOrder = (text: string): string =>
  text
    .split(/\r?\n/)
    .map((line) => {
      const m = line.match(/^(\s*[A-Za-z_][A-Za-z0-9_]*\s*\[)([\s\S]*)(\]\s*;?\s*)$/);
      if (!m) return line;
      const attrs = splitDotAttrs(m[2]);
      if (attrs.length < 2) return line;
      return `${m[1]}${attrs.reverse().join(", ")}${m[3]}`;
    })
    .join("\n");

describe("parseDot 属性顺序无关与未知属性容忍（C）", () => {
  it("C-1 属性换序（pos/fillcolor 在前）仍被解析，字段逐项正确、OPEN 标记照常剥离", () => {
    const g = parseDot(`digraph G {
  n0 [shape=rect, pos="10,20!", fillcolor=yellow, label="BBS_1"];
  n1 [pos="100,250!", shape=invtriangle, label="SW_1\\n[OPEN]", fillcolor=orange];
}`);
    expect(g.nodes).toHaveLength(2);
    expect(g.nodes[0]).toEqual({
      id: "n0",
      label: "BBS_1",
      open: false,
      shape: "rect",
      fillcolor: "yellow",
      x: 10,
      y: 20,
    });
    // 换序后 [OPEN] 仍被剥离，open 标志不依赖属性顺序
    expect(g.nodes[1]).toEqual({
      id: "n1",
      label: "SW_1",
      open: true,
      shape: "invtriangle",
      fillcolor: "orange",
      x: 100,
      y: 250,
    });
  });

  it("C-2 未知属性（color/comment/fontsize/style）不影响已知属性，节点照常解析", () => {
    const g = parseDot(`digraph G {
  n0 [label="A", shape=rect, color=red, fillcolor=yellow, fontsize=10, pos="1,2!", comment="x", style=filled];
}`);
    expect(g.nodes).toEqual([
      { id: "n0", label: "A", open: false, shape: "rect", fillcolor: "yellow", x: 1, y: 2 },
    ]);
  });

  it("C-3 空白分隔容忍：tab / 多空格 / = 两侧空格；属性跨行则不解析（行式扫描器的既有边界）", () => {
    const g = parseDot("digraph G {\n" +
      '  n0\t[label="A",   shape=rect,\tfillcolor=yellow,\tpos="1,2!"];\n' +
      '  n1 [label = "B" ,  shape = rect, fillcolor = yellow, pos = "3,4!"];\n' +
      '  n2 [label="C",\n    shape=rect, fillcolor=yellow, pos="5,6!"];\n' +
      "}");
    // tab / 多空格 / = 两侧空格：两条都解析出来
    expect(g.nodes.map((n) => n.id)).toEqual(["n0", "n1"]);
    expect(g.nodes[1]).toMatchObject({ label: "B", shape: "rect", fillcolor: "yellow", x: 3, y: 4 });
    // 跨行属性串：parseDot 按行扫描，两行都不构成完整节点行 → 不产出节点（与修复前同，属既有边界）
    expect(g.nodes.map((n) => n.id)).not.toContain("n2");
  });

  it("C-4 顺序无关：整份样本属性反转后解析结果与标准顺序逐项相同", () => {
    const standard = parseDot(MINI_DOT);
    const reversed = parseDot(reverseAttrOrder(MINI_DOT));
    expect(reversed.nodes).toEqual(standard.nodes);
    expect(reversed.edges).toEqual(standard.edges);
    expect(reversed.stationName).toBe(standard.stationName);
    // 反转确实动了输入（否则上面三条恒绿）
    expect(reverseAttrOrder(MINI_DOT)).toContain('n0 [pos="100,300!", fillcolor=yellow, shape=rect, label="BBS_1"]');
    // 边数不变
    expect(reversed.edges).toHaveLength(3);
  });

  it("C-5 标准顺序回归：MINI_DOT / ESCAPE_DOT 节点逐项与既有期望一致（解析结果未因重写而变）", () => {
    const g = parseDot(MINI_DOT);
    expect(g.stationName).toBe("望道变");
    expect(g.stationId).toBe("6");
    expect(g.nodes).toEqual([
      { id: "n0", label: "BBS_1", open: false, shape: "rect", fillcolor: "yellow", x: 100, y: 300 },
      { id: "n1", label: "SW_1", open: true, shape: "invtriangle", fillcolor: "orange", x: 100, y: 250 },
      { id: "n2", label: "CB_1", open: false, shape: "diamond", fillcolor: "green", x: 100, y: 200 },
      { id: "n3", label: "INTERNAL_VL_1_230_10", open: false, shape: "point", fillcolor: "black", x: 100, y: 322 },
    ]);
    expect(g.edges).toEqual([
      { from: "n0", to: "n3" },
      { from: "n3", to: "n1" },
      { from: "n1", to: "n2" },
    ]);
    const e = parseDot(ESCAPE_DOT);
    expect(e.nodes[0]).toEqual({
      id: "n0",
      label: 'A "B" C',
      open: false,
      shape: "rect",
      fillcolor: "yellow",
      x: 10,
      y: 20,
    });
  });

  it("C-6 望道变 fixture 回归：250 节点 / 255 边；属性整体反转后节点逐项相同", () => {
    const text = readFileSync(new URL("./__fixtures__/dot/望道变_6.dot", import.meta.url), "utf8");
    const standard = parseDot(text);
    expect(standard.nodes).toHaveLength(250);
    expect(standard.edges).toHaveLength(255);
    const reversed = parseDot(reverseAttrOrder(text));
    expect(reversed.nodes).toEqual(standard.nodes);
    expect(reversed.edges).toEqual(standard.edges);
  });

  it("C-7 graph/node/edge 默认语句与缺必需属性的行不会被误判为节点", () => {
    const g = parseDot(`digraph G {
  graph [rankdir=TB, label="\u671b\u9053\u53d8", fontsize=16, pad=0.5, splines=ortho];
  node [fontsize=10, shape=rect, fillcolor=yellow, pos="1,2!"];
  edge [arrowsize=0.6];
  n0 [label="A", shape=rect, fillcolor=yellow, pos="1,2!"];
  n1 [label="B", shape=rect, fillcolor=yellow];
}`);
    // 只有真正的设备节点行被解析：默认语句（无 pos）与缺 pos 的 n1 都不产出
    expect(g.nodes.map((n) => n.id)).toEqual(["n0"]);
  });
});

// label 含 | 的设备对：(A, B|C) 与 (A|B, C) 在旧的 `${x}|${y}` 键下撞同一个 key
const PIPE_GRAPH = (): DotGraph =>
  mg(
    [
      nd("n0", "A", "rect", "yellow"),
      nd("n1", "B|C", "ellipse", "lightblue"),
      nd("n2", "A|B", "diamond", "green"),
      nd("n3", "C", "invtriangle", "orange"),
    ],
    [
      ["n0", "n1"],
      ["n2", "n3"],
    ],
  );

describe("collapseDotGraph link 去重键无歧义（C）", () => {
  it("C-8 label 含竖线：两条不同边都保留，未被并成一条", () => {
    const r = collapseDotGraph(PIPE_GRAPH());
    // 旧键下两条边的 key 同为 A|B|C，linkSet.set 覆盖后只剩 1 条
    expect(r.links).toHaveLength(2);
    expect(r.links).toEqual([
      { from: "A", to: "B|C" },
      { from: "A|B", to: "C" },
    ]);
    // 每条边的 label 原样透出（未被编码污染）
    expect(r.links.map((l) => `${l.from}|${l.to}`)).toEqual(["A|B|C", "A|B|C"]);
  });

  it("C-9 label 含竖线的图装配到模型：两条边都在（下游 map 未合并）", () => {
    const { project, report } = mapDotGraphToModel(PIPE_GRAPH());
    expect(project.nodes).toHaveLength(4);
    expect(report.edgeCount).toBe(2);
    expect(project.edges).toHaveLength(2);
    const nameOf = new Map(project.nodes.map((n) => [n.id, n.name]));
    const pairs = project.edges.map((e) => [nameOf.get(e.sourceId)!, nameOf.get(e.targetId)!].sort());
    expect(pairs).toEqual(expect.arrayContaining([["A", "B|C"], ["A|B", "C"]]));
  });

  it("C-10 常规 label 回归：MINI_DOT 与望道变 fixture 的 links 与修复前逐项相同", () => {
    const mini = collapseDotGraph(parseDot(MINI_DOT));
    expect(mini.devices.map((d) => d.label)).toEqual(["BBS_1", "SW_1", "CB_1"]);
    expect(mini.links).toEqual([
      { from: "BBS_1", to: "SW_1" },
      { from: "CB_1", to: "SW_1" },
    ]);
    const text = readFileSync(new URL("./__fixtures__/dot/望道变_6.dot", import.meta.url), "utf8");
    const full = collapseDotGraph(parseDot(text));
    expect(full.devices).toHaveLength(141);
    expect(full.links).toHaveLength(185);
    expect(full.reportPart.selfLoopDropped).toBe(24);
    // fixture 内无 label 含 |，全部 link 的 label 都不含竖线（新旧键一一对应，条数不变）
    expect(full.links.every((l) => !l.from.includes("|") && !l.to.includes("|"))).toBe(true);
  });
});

describe("orthogonalRouteWithinCorners 退化输入（C）", () => {
  it("C-11 start 与 end 同一点（无阻挡）：退化为单点路径，不抛错", () => {
    // 实跑行为：直连与两条 L 形 compactRoute 后都只剩 1 个点（route.length < 2 被跳过），
    // 候选集耗尽 → 走防御兜底 compactRoute([start, {...}, end])，同样去重成单点。
    const p = { x: 40, y: 60 };
    const route = orthogonalRouteWithinCorners(p, { x: 40, y: 60 }, [], []);
    expect(route).toEqual([{ x: 40, y: 60 }]);
    expect(route).toHaveLength(1);
  });

  it("C-12 start 与 end 同一点且附近有阻挡盒：走廊退化为零面积，派生不出 Z lane，仍返回单点", () => {
    // 实跑行为：start===end 时 corridor 宽高皆 0，任何阻挡盒都满足 minX > corridor.maxX 被跳过，
    // 因此派生不出 lane；直连与两条 L 形 compactRoute 后也都只剩 1 个点 → 走防御兜底得单点。
    const blocker = createDefaultNode("ac-switch", { x: 100, y: 0 });
    const route = orthogonalRouteWithinCorners({ x: 0, y: 0 }, { x: 0, y: 0 }, [blocker], []);
    expect(route).toEqual([{ x: 0, y: 0 }]);
  });
});

// ===== D 未覆盖分支补齐（v8 分支覆盖：src/dotImport.ts 60/64/70/73/76/83/112/120/353/447）=====
//
// parseDotNodeAttrs 未导出，畸形输入只能从 parseDot 的公开结果观察：该行被判畸形则
// 既不进 nodes 也不进 edges。每条用例都放一条合法兄弟行，避免整份文本全废导致断言恒绿。

// 显式 join 传行：= 之后无值那种输入依赖行尾空白，模板字面量里的尾随空白会被格式化
// 与编辑器吃掉，必须用字符串数组拼，空白本身就是被测输入的一部分。
const dotLines = (...lines: string[]): string => ["digraph G {", ...lines, "}"].join("\n");

describe("parseDotNodeAttrs 畸形输入与容错分支（D）", () => {
  it("D-1 属性串开头与键之间的多余逗号被跳过：四个属性齐全照常产出节点", () => {
    const g = parseDot(
      dotLines(
        '  n0 [, label="A", shape=rect, fillcolor=yellow, pos="1,2!"];',
        '  n1 [label="B",, shape=rect, fillcolor=yellow, pos="3,4!"];',
        '  n2 [label="C", shape=rect, fillcolor=yellow, pos="5,6!"];'
      )
    );
    expect(g.nodes.map((n) => n.id)).toEqual(["n0", "n1", "n2"]);
    expect(g.nodes[0]).toEqual({
      id: "n0",
      label: "A",
      open: false,
      shape: "rect",
      fillcolor: "yellow",
      x: 1,
      y: 2,
    });
    expect(g.nodes[1]).toMatchObject({ id: "n1", label: "B", x: 3, y: 4 });
  });

  it("D-2 属性串末尾的逗号被跳过后由 ] 收尾：节点照常产出", () => {
    const g = parseDot(dotLines('  n0 [label="A", shape=rect, fillcolor=yellow, pos="1,2!",];'));
    expect(g.nodes).toEqual([
      { id: "n0", label: "A", open: false, shape: "rect", fillcolor: "yellow", x: 1, y: 2 },
    ]);
    // 反证：去掉尾随逗号后仍走同一条 ] 收尾路径（这条断言证明 D-2 覆盖的是逗号容错，
    // 而不是把整个属性串解析改了）
    const plain = parseDot(dotLines('  n0 [label="A", shape=rect, fillcolor=yellow, pos="1,2!"];'));
    expect(plain.nodes).toEqual(g.nodes);
  });

  it("D-3 key 起始非法字符：整行退回畸形（不进 nodes 也不进 edges），兄弟行不受影响", () => {
    const g = parseDot(
      dotLines(
        '  n0 [=1, label="A", shape=rect, fillcolor=yellow, pos="1,2!"];',
        '  n1 [label="B", shape=rect, fillcolor=yellow, pos="3,4!"];'
      )
    );
    expect(g.nodes.map((n) => n.id)).toEqual(["n1"]);
    expect(g.edges).toEqual([]);
  });

  it("D-4 key 之后不是等号：整行退回畸形，兄弟行不受影响", () => {
    // ⚠ 畸形 key 必须放在四项必需属性**之后**：守卫一旦放宽成「也容忍逗号」，
    //   裸值扫描会把下一个 token 的 key 一起吃掉，label/shape/… 仍凑不齐四项，
    //   该行依旧不产出节点 → 断言恒绿。放在四项之后才有「被吃掉的是无关属性」这一处落点。
    const g = parseDot(
      dotLines(
        '  n0 [label="A", shape=rect, fillcolor=yellow, pos="1,2!", style, width];',
        '  n1 [label="B", shape=rect, fillcolor=yellow, pos="3,4!"];'
      )
    );
    expect(g.nodes.map((n) => n.id)).toEqual(["n1"]);
  });

  it("D-5 等号之后只剩行尾空白：无值可用，整行退回畸形", () => {
    // 走到这条分支的唯一形态：= 之后游标已越过行尾（尾部空白被 skipWs 吃掉）。
    // ⚠ 本分支没有能红的变异，是**真等价**，不是漏覆盖：
    //   删掉守卫后 s[i] 为 undefined → 既不进引号分支，裸值分支 while 首轮即停得空串
    //   → attrs.set(key, "") → 其后 s[i] 仍非 , 非 ] → 落到「值后既非 , 也非 ]」同样 return null。
    //   两条路返回同一个 null，所以这里恒绿是正确结果，不要为凑红去改断言。
    const g = parseDot(
      dotLines("  n0 [label=   ", '  n1 [label="B", shape=rect, fillcolor=yellow, pos="3,4!"];')
    );
    expect(g.nodes.map((n) => n.id)).toEqual(["n1"]);
  });

  it("D-6 引号值未闭合（含转义对吃掉收尾引号）：整行退回畸形，兄弟行不受影响", () => {
    // ⚠ 本分支没有**忠实**的可红变异，是真等价：把 return null 换成 break 后，
    //   游标已停在行尾，随后必然落到「值后既非 , 也非 ]」的同一个 null。
    //   只有「无条件 break」（连正常引号值也一起废掉）才会红，而那由既有 parseDot 用例抓住，
    //   不是本用例的鉴别力。别为凑红改这里的断言。
    const g = parseDot(
      dotLines(
        '  n0 [label="A', // 无收尾引号，扫描到行尾仍未闭合
        '  n1 [label="A\\"', // 转义对把本该收尾的引号吃掉，仍未闭合
        '  n2 [label="B", shape=rect, fillcolor=yellow, pos="3,4!"];'
      )
    );
    expect(g.nodes.map((n) => n.id)).toEqual(["n2"]);
  });

  it("D-7 属性值之后既非逗号也非右方括号：整行退回畸形（引号值与裸值两种落点）", () => {
    // 同 D-4：畸形位置要留一个「跳过一个字就正好落在逗号上」的落点（x, 里的那个 x），
    //   否则跳过之后仍凑不齐四项必需属性，断言会恒绿。
    const g = parseDot(
      dotLines(
        '  n0 [label="A" x, shape=rect, fillcolor=yellow, pos="1,2!"];',
        "  n1 [label=B", // 裸值吃到行尾，其后没有分隔符
        '  n2 [label="C", shape=rect, fillcolor=yellow, pos="5,6!"];'
      )
    );
    expect(g.nodes.map((n) => n.id)).toEqual(["n2"]);
  });

  it("D-8 右方括号或分号之后还有多余字符：整行退回畸形；合法分号收尾仍产出节点", () => {
    const g = parseDot(
      dotLines(
        '  n0 [label="A", shape=rect, fillcolor=yellow, pos="1,2!"] junk',
        '  n1 [label="B", shape=rect, fillcolor=yellow, pos="3,4!"] ; junk',
        '  n2 [label="C", shape=rect, fillcolor=yellow, pos="5,6!"];'
      )
    );
    expect(g.nodes.map((n) => n.id)).toEqual(["n2"]);
    expect(g.nodes[0]).toMatchObject({ label: "C", x: 5, y: 6 });
  });
});

describe("collapseDotGraph 端点解析：整组无设备的收缩组（D）", () => {
  it("D-9 两个 point 相连且整组无任何设备：两端解析为空集，不产出 link 也不计自环", () => {
    // 走的是「非 device → 取所在组设备集」这条路；组内无设备只能兜底成空数组。
    // 兜底若被删，下游对解析结果取 length 会直接抛 TypeError（不是静默错值）。
    const g = mg([nd("n0", "P_1", "point"), nd("n1", "P_2", "point")], [["n0", "n1"]]);
    const r = collapseDotGraph(g);
    expect(r.devices).toEqual([]);
    expect(r.links).toEqual([]);
    expect(r.reportPart).toEqual({ collapsedCount: 2, selfLoopDropped: 0, danglingEdgeDropped: 0 });
    // 反证：同一个收缩组内接上设备后，同一条 resolve 路径给出的是设备集而非空集
    const withDevice = collapseDotGraph(
      mg(
        [
          nd("n0", "P_1", "point"),
          nd("n1", "LD_1", "ellipse", "lightblue"),
          nd("n2", "SW_1", "invtriangle", "orange"),
        ],
        [["n0", "n1"], ["n0", "n2"]]
      )
    );
    expect(withDevice.links).toEqual([{ from: "LD_1", to: "SW_1" }]);
    expect(withDevice.reportPart.selfLoopDropped).toBe(0);
  });
});

describe("deviceAdjacentReferencePoints 悬空边（D）", () => {
  it("D-10 边端点不在 nodes 中（单端缺失与双端缺失）时跳过该边，其余边参考点照常提取", () => {
    // 单端缺失（n1 -> nX）是本守卫的鉴别输入：守卫一改成「仅双端缺失才跳」，
    // 这里就会带着 undefined 端点继续往下走而抛 TypeError。
    const g = mg(
      [
        ndp("n0", "SW_1", "invtriangle", "orange", 100, 100),
        ndp("n1", "P_1", "point", "black", 100, 150),
      ],
      [["n0", "n1"], ["n1", "nX"], ["nY", "nZ"]],
    );
    const refs = deviceAdjacentReferencePoints(g);
    expect(refs.get("n0")).toEqual([{ x: 100, y: 150 }]);
    expect([...refs.keys()]).toEqual(["n0"]);
    // 反证：去掉两条悬空边后结果完全一致（悬空边不贡献任何条目）
    const clean = deviceAdjacentReferencePoints(
      mg(
        [
          ndp("n0", "SW_1", "invtriangle", "orange", 100, 100),
          ndp("n1", "P_1", "point", "black", 100, 150),
        ],
        [["n0", "n1"]],
      )
    );
    expect(clean.get("n0")).toEqual([{ x: 100, y: 150 }]);
  });
});