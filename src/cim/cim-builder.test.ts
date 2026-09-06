import { describe, expect, it } from "vitest";
import { buildCimPackage, extractBaseVoltages, inferTopology } from "./cim-builder";
import type { ModelNode } from "../model";

function makeNode(partial: Partial<ModelNode>): ModelNode {
  return {
    id: "n1", kind: "ac-line", name: "线路1", nodeNumber: "1",
    acTopologyNode: -1, dcTopologyNode: -1,
    position: { x: 0, y: 0 }, size: { width: 100, height: 100 },
    rotation: 0, scale: 1, terminals: [], params: {},
    ...partial
  };
}

describe("extractBaseVoltages", () => {
  it("从 params.i_vbase 与 terminal.vbase 提取去重排序", () => {
    const nodes = [
      makeNode({ id: "a", params: { i_vbase: "110" } }),
      makeNode({ id: "b", params: { i_vbase: "10" }, terminals: [{ id: "t1", label: "t", type: "ac", anchor: { x: 0, y: 0 }, nodeNumber: "1", vbase: "110" }] }),
      makeNode({ id: "c", params: { j_vbase: "35" } })
    ];
    const bvs = extractBaseVoltages(nodes);
    expect(bvs.map((bv) => bv.nominalVoltage)).toEqual([10, 35, 110]);
    expect(bvs[2].rdfId).toBe("BV_110");
  });

  it("忽略非法电压值（0 / 非数字 / 空串）", () => {
    const nodes = [
      makeNode({ id: "a", params: { i_vbase: "0" } }),
      makeNode({ id: "b", params: { i_vbase: "xxx" } }),
      makeNode({ id: "c", params: { i_vbase: "" } }),
      makeNode({ id: "d", params: { i_vbase: " 220 " } })
    ];
    expect(extractBaseVoltages(nodes).map((bv) => bv.nominalVoltage)).toEqual([220]);
  });
});

describe("buildCimPackage 容器层次", () => {
  it("生成 Substation 与按电压分组 VoltageLevel", () => {
    const nodes = [
      makeNode({ id: "bus1", kind: "ac-bus", params: { i_vbase: "110" } }),
      makeNode({ id: "bus2", kind: "ac-bus", params: { i_vbase: "10" } })
    ];
    const pkg = buildCimPackage({ nodes, edges: [], projectName: "示范站", modelId: "m1" });
    expect(pkg.substations).toHaveLength(1);
    expect(pkg.substations[0].name).toBe("示范站");
    expect(pkg.baseVoltages.map((bv) => bv.nominalVoltage)).toEqual([10, 110]);
    expect(pkg.voltageLevels).toHaveLength(2);
    for (const vl of pkg.voltageLevels) {
      expect(vl.substationId).toBe(pkg.substations[0].rdfId);
    }
  });
});

describe("inferTopology", () => {
  const line = makeNode({
    id: "line1", kind: "ac-line", params: { i_vbase: "110" },
    terminals: [
      { id: "lt1", label: "1", type: "ac", anchor: { x: 0, y: 0 }, nodeNumber: "1" },
      { id: "lt2", label: "2", type: "ac", anchor: { x: 1, y: 0 }, nodeNumber: "1" }
    ]
  });
  const busA = makeNode({
    id: "busA", kind: "ac-bus", params: { i_vbase: "110" },
    terminals: [{ id: "bt1", label: "1", type: "ac", anchor: { x: 0, y: 0 }, nodeNumber: "2" }]
  });
  const busB = makeNode({
    id: "busB", kind: "ac-bus", params: { i_vbase: "110" },
    terminals: [{ id: "bt2", label: "1", type: "ac", anchor: { x: 0, y: 0 }, nodeNumber: "3" }]
  });

  it("一条边两端子 → 同一 ConnectivityNode", () => {
    const { connectivityNodes, terminals } = inferTopology({
      nodes: [line, busA],
      edges: [{ id: "e1", sourceId: "line1", sourceTerminalId: "lt1", targetId: "busA", targetTerminalId: "bt1" }],
      projectName: "t", modelId: "m"
    });
    expect(connectivityNodes).toHaveLength(1);
    const aTerminals = terminals.filter((t) => t.conductingEquipmentId === "N_line1");
    expect(aTerminals).toHaveLength(1); // 仅连边端子生成 Terminal
    expect(aTerminals[0].connectivityNodeId).toBe(connectivityNodes[0].rdfId);
    expect(aTerminals[0].sequenceNumber).toBe(1);
  });

  it("两段链 → 两个 ConnectivityNode，中间设备两端子分属不同节点", () => {
    const { connectivityNodes, terminals } = inferTopology({
      nodes: [line, busA, busB],
      edges: [
        { id: "e1", sourceId: "line1", sourceTerminalId: "lt1", targetId: "busA", targetTerminalId: "bt1" },
        { id: "e2", sourceId: "line1", sourceTerminalId: "lt2", targetId: "busB", targetTerminalId: "bt2" }
      ],
      projectName: "t", modelId: "m"
    });
    expect(connectivityNodes).toHaveLength(2);
    const lineTerminals = terminals.filter((t) => t.conductingEquipmentId === "N_line1");
    expect(lineTerminals).toHaveLength(2);
    expect(lineTerminals[0].connectivityNodeId).not.toBe(lineTerminals[1].connectivityNodeId);
  });

  it("同 acTopologyNode 节点的端子隐式合并（contact/overlap 场景）", () => {
    const { connectivityNodes } = inferTopology({
      nodes: [
        { ...busA, acTopologyNode: 7 },
        { ...busB, acTopologyNode: 7 }
      ],
      edges: [],
      projectName: "t", modelId: "m"
    });
    expect(connectivityNodes).toHaveLength(1);
  });

  it("孤立设备无端子 → 无 ConnectivityNode 亦无 Terminal", () => {
    const { connectivityNodes, terminals } = inferTopology({ nodes: [line], edges: [], projectName: "t", modelId: "m" });
    expect(connectivityNodes).toHaveLength(0);
    expect(terminals).toHaveLength(0);
  });
});
