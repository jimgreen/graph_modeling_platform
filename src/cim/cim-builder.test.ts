import { describe, expect, it } from "vitest";
import { buildCimPackage, extractBaseVoltages } from "./cim-builder";
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
