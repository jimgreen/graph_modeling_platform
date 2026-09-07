import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { parseDot } from "./dotImport";

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
