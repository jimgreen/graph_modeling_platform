// CIM/XML 导出集成测试：完整小模型 → XML 可解析、rdf:resource 引用闭环、结构标签齐全；
// 并验证 DC/氢能/热力设备在所有 CimPackage 设备数组中产生零对象（Task 6/7 评审结论固化）。

import { describe, expect, it } from "vitest";
import { DOMParser } from "@xmldom/xmldom";
import { buildCimXml } from "./cim-export";
import { buildCimPackage } from "./cim-builder";
import type { CimPackage } from "./cim-types";
import type { DeviceKind, Edge, ModelNode } from "../model";

function makeNode(partial: Partial<ModelNode>): ModelNode {
  return {
    id: "n1", kind: "ac-line", name: "线路1", nodeNumber: "1",
    acTopologyNode: -1, dcTopologyNode: -1,
    position: { x: 0, y: 0 }, size: { width: 100, height: 100 },
    rotation: 0, scale: 1, terminals: [], params: {},
    ...partial
  };
}

describe("CIM 导出集成", () => {
  it("完整小模型 → XML 可解析，rdf:resource 引用闭环", () => {
    const bus = makeNode({
      id: "bus1", kind: "ac-bus", name: "母线1", params: { i_vbase: "110" },
      terminals: [{ id: "b1", label: "1", type: "ac", anchor: { x: 0, y: 0 }, nodeNumber: "1" }]
    });
    const line = makeNode({
      id: "line1", kind: "ac-line", name: "线路1", params: { i_vbase: "110", r: "0.12", x: "0.45", b: "0.000034" },
      terminals: [
        { id: "l1", label: "1", type: "ac", anchor: { x: 0, y: 0 }, nodeNumber: "1" },
        { id: "l2", label: "2", type: "ac", anchor: { x: 0, y: 0 }, nodeNumber: "1" }
      ]
    });
    const transformer = makeNode({
      id: "tr1", kind: "ac-two-winding-transformer", name: "主变1",
      params: { i_vbase: "110", j_vbase: "10", sn: "50" },
      terminals: [
        { id: "h1", label: "H", type: "ac", anchor: { x: 0, y: 0 }, nodeNumber: "1" },
        { id: "l1", label: "L", type: "ac", anchor: { x: 0, y: 0 }, nodeNumber: "1" }
      ]
    });
    const edges: Edge[] = [
      { id: "e1", sourceId: "line1", sourceTerminalId: "l1", targetId: "bus1", targetTerminalId: "b1" },
      { id: "e2", sourceId: "line1", sourceTerminalId: "l2", targetId: "tr1", targetTerminalId: "h1" }
    ];
    const xml = buildCimXml([bus, line, transformer], edges, "示范站", "m1");
    const doc = new DOMParser().parseFromString(xml, "application/xml");
    expect(doc.getElementsByTagName("parsererror")).toHaveLength(0);
    // 全量引用闭环：每个 rdf:resource 的 #id 必有对应 rdf:ID
    const ids = new Set<string>();
    for (const el of Array.from(doc.getElementsByTagName("*"))) {
      const id = el.getAttribute("rdf:ID");
      if (id) ids.add(id);
    }
    const dangling: string[] = [];
    for (const el of Array.from(doc.getElementsByTagName("*"))) {
      const ref = el.getAttribute("rdf:resource");
      if (ref && ref.startsWith("#") && !ids.has(ref.slice(1))) dangling.push(ref);
    }
    expect(dangling).toEqual([]);
    // 结构断言
    const tags = Array.from(doc.getElementsByTagName("*")).map((el) => el.tagName);
    expect(tags).toContain("cim:Substation");
    expect(tags).toContain("cim:BusbarSection");
    expect(tags).toContain("cim:ACLineSegment");
    expect(tags).toContain("cim:PowerTransformer");
    expect(tags).toContain("cim:PowerTransformerEnd");
    expect(tags).toContain("cim:ConnectivityNode");
    expect(tags).toContain("cim:Terminal");
  });
});

// DC/氢能/热力 kinds：CIM16 不支持，必须全部跳过（Task 6/7 评审发现固化）
const DC_KINDS: DeviceKind[] = [
  "dc-line", "dc-routable-line", "dc-zero-branch", "dc-zero-routable-branch",
  "dc-bus", "dc-breaker", "dc-switch", "dc-load", "dc-source", "dc-transformer",
  "dcdc-converter", "acdc-converter", "dcac-converter", "acac-converter", "dc-storage"
];
const H2_HEAT_KINDS: DeviceKind[] = [
  "hydrogen-tank", "hydrogen-bus", "hydrogen-electrolyzer", "hydrogen-fuel-cell",
  "hydrogen-pipeline", "hydrogen-storage", "hydrogen-valve", "hydrogen-source", "hydrogen-load",
  "heat-bus", "heat-boiler", "heat-pipeline", "heat-pump", "heat-source", "heat-load",
  "heat-valve", "heat-shutoff-valve", "heat-storage", "h2-load", "h2-source"
];

/** CimPackage 中所有设备对象数组（不含容器/拓扑/量测） */
function deviceArrays(pkg: CimPackage): unknown[][] {
  return [
    pkg.busbarSections, pkg.acLineSegments, pkg.powerTransformers, pkg.transformerEnds,
    pkg.energySources, pkg.energyConsumers, pkg.generatingUnits, pkg.switches, pkg.shuntCompensators
  ];
}

describe("CIM 导出 DC/氢能/热力跳过", () => {
  it.each([...DC_KINDS, ...H2_HEAT_KINDS])("%s → 所有设备数组为空", (kind) => {
    const pkg = buildCimPackage({
      nodes: [makeNode({ id: `n_${kind}`, kind, params: { i_vbase: "110" } })],
      edges: [], projectName: "t", modelId: "m"
    });
    for (const array of deviceArrays(pkg)) {
      expect(array).toHaveLength(0);
    }
  });
});
