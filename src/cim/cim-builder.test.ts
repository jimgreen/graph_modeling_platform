import { describe, expect, it } from "vitest";
import { buildCimPackage, cimClassForKind, extractBaseVoltages, inferTopology } from "./cim-builder";
import type { ModelNode } from "../model";
import type { MeasurementGroup } from "../measurements";

function makeNode(partial: Partial<ModelNode>): ModelNode {
  return {
    id: "n1", kind: "ac-line", name: "线路1", nodeNumber: "1",
    acTopologyNode: -1, dcTopologyNode: -1,
    position: { x: 0, y: 0 }, size: { width: 100, height: 100 },
    rotation: 0, scale: 1, terminals: [], params: {},
    ...partial
  };
}

function makeTransformer(partial: Partial<ModelNode>): ModelNode {
  return makeNode({
    id: "tr1", kind: "ac-two-winding-transformer", name: "主变1",
    params: { i_vbase: "110", j_vbase: "10", sn: "50", vector_group: "YNd11" },
    terminals: [
      { id: "h1", label: "H", type: "ac", anchor: { x: 0, y: 0 }, nodeNumber: "1" },
      { id: "l1", label: "L", type: "ac", anchor: { x: 0, y: 0 }, nodeNumber: "1" }
    ],
    ...partial
  });
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

  it("并行双回线场景（多路径 union）不成环、正常分组", () => {
    const lineA = makeNode({
      id: "lineA", kind: "ac-line",
      terminals: [
        { id: "a1", label: "1", type: "ac", anchor: { x: 0, y: 0 }, nodeNumber: "1" },
        { id: "a2", label: "2", type: "ac", anchor: { x: 0, y: 0 }, nodeNumber: "1" }
      ]
    });
    const lineB = makeNode({
      id: "lineB", kind: "ac-line",
      terminals: [
        { id: "b1", label: "1", type: "ac", anchor: { x: 0, y: 0 }, nodeNumber: "1" },
        { id: "b2", label: "2", type: "ac", anchor: { x: 0, y: 0 }, nodeNumber: "1" }
      ]
    });
    const { connectivityNodes, terminals } = inferTopology({
      nodes: [lineA, lineB, busA, busB],
      edges: [
        { id: "e1", sourceId: "lineA", sourceTerminalId: "a1", targetId: "busA", targetTerminalId: "bt1" },
        { id: "e2", sourceId: "lineA", sourceTerminalId: "a2", targetId: "busB", targetTerminalId: "bt2" },
        { id: "e3", sourceId: "lineB", sourceTerminalId: "b1", targetId: "busA", targetTerminalId: "bt1" },
        { id: "e4", sourceId: "lineB", sourceTerminalId: "b2", targetId: "busB", targetTerminalId: "bt2" }
      ],
      projectName: "t", modelId: "m"
    });
    // busA 侧两端子同组，busB 侧两端子同组
    expect(connectivityNodes).toHaveLength(2);
    // 回归区分力：旧 bug（find 返回压缩前父节点）会把 bus 端子丢出组，只剩 4 个 Terminal
    expect(terminals).toHaveLength(6);
    const termByEquipAndId = (equipmentId: string, terminalId: string) =>
      terminals.find((t) => t.conductingEquipmentId === equipmentId && t.name.endsWith(`端子${terminalId}`));
    // busA 侧：lineA::a1 与 busA::bt1 同组；与 busB 侧异组
    expect(termByEquipAndId("N_lineA", "a1")?.connectivityNodeId)
      .toBe(termByEquipAndId("N_busA", "bt1")?.connectivityNodeId);
    expect(termByEquipAndId("N_lineA", "a1")?.connectivityNodeId)
      .not.toBe(termByEquipAndId("N_lineA", "a2")?.connectivityNodeId);
  });
});

describe("cimClassForKind", () => {
  it("ac-line → ACLineSegment", () => {
    expect(cimClassForKind("ac-line").className).toBe("ACLineSegment");
  });
  it("ac-two-winding-transformer → PowerTransformer", () => {
    expect(cimClassForKind("ac-two-winding-transformer").className).toBe("PowerTransformer");
  });
  it("custom-device → skip", () => {
    expect(cimClassForKind("custom-device").skip).toBe(true);
  });
  it("hydrogen-tank → skip", () => {
    expect(cimClassForKind("hydrogen-tank").skip).toBe(true);
  });
});

describe("buildCimPackage 设备对象", () => {
  it("ac-bus → BusbarSection", () => {
    const pkg = buildCimPackage({
      nodes: [makeNode({ id: "bus1", name: "bus1", kind: "ac-bus", params: { i_vbase: "110" } })],
      edges: [], projectName: "t", modelId: "m"
    });
    expect(pkg.busbarSections).toHaveLength(1);
    expect(pkg.busbarSections[0].rdfId).toBe("N_bus1");
    expect(pkg.busbarSections[0].name).toBe("bus1");
  });

  it("ac-line → ACLineSegment 带 r/x/bch 参数", () => {
    const pkg = buildCimPackage({
      nodes: [makeNode({
        id: "line1", kind: "ac-line",
        params: { i_vbase: "110", r: "0.12", x: "0.45", b: "0.000034" }
      })],
      edges: [], projectName: "t", modelId: "m"
    });
    expect(pkg.acLineSegments).toHaveLength(1);
    expect(pkg.acLineSegments[0].r).toBeCloseTo(0.12);
    expect(pkg.acLineSegments[0].x).toBeCloseTo(0.45);
    expect(pkg.acLineSegments[0].bch).toBeCloseTo(0.000034);
    expect(pkg.acLineSegments[0].baseVoltageId).toBe("BV_110");
  });

  it("双绕组变压器 → PowerTransformer + 2 End", () => {
    const pkg = buildCimPackage({
      nodes: [makeTransformer({})],
      edges: [], projectName: "t", modelId: "m"
    });
    expect(pkg.powerTransformers).toHaveLength(1);
    expect(pkg.transformerEnds).toHaveLength(2);
    expect(pkg.transformerEnds[0].ratedU).toBe(110);
    expect(pkg.transformerEnds[1].ratedU).toBe(10);
    expect(pkg.transformerEnds[0].endNumber).toBe(1);
    expect(pkg.transformerEnds[1].endNumber).toBe(2);
    expect(pkg.transformerEnds[0].transformerId).toBe(pkg.powerTransformers[0].rdfId);
  });

  it("ac-load → EnergyConsumer", () => {
    const pkg = buildCimPackage({
      nodes: [makeNode({ id: "load1", kind: "ac-load", params: { i_vbase: "110", p: "5", q: "2" } })],
      edges: [], projectName: "t", modelId: "m"
    });
    expect(pkg.energyConsumers).toHaveLength(1);
    expect(pkg.energyConsumers[0].activePower).toBeCloseTo(5);
    expect(pkg.energyConsumers[0].reactivePower).toBeCloseTo(2);
  });

  it("ac-source → EnergySource（等效电源类）", () => {
    const pkg = buildCimPackage({
      nodes: [makeNode({ id: "src1", kind: "ac-station-source", params: { i_vbase: "110" } })],
      edges: [], projectName: "t", modelId: "m"
    });
    expect(pkg.energySources).toHaveLength(1);
  });
});

describe("buildCimPackage 开关与补偿器", () => {
  it("ac-breaker → Breaker", () => {
    const pkg = buildCimPackage({
      nodes: [makeNode({ id: "brk1", kind: "ac-breaker", params: { i_vbase: "110", closed_status: "0" } })],
      edges: [], projectName: "t", modelId: "m"
    });
    expect(pkg.switches).toHaveLength(1);
    expect(pkg.switches[0].cimClass).toBe("Breaker");
  });

  it("ac-capacitor → LinearShuntCompensator", () => {
    const pkg = buildCimPackage({
      nodes: [makeNode({ id: "cap1", kind: "ac-capacitor", params: { i_vbase: "110" } })],
      edges: [], projectName: "t", modelId: "m"
    });
    expect(pkg.shuntCompensators).toHaveLength(1);
    expect(pkg.shuntCompensators[0].cimClass).toBe("LinearShuntCompensator");
    expect(pkg.shuntCompensators[0].sections).toBe(1);
  });

  it("ac-wind-source → WindGeneratingUnit", () => {
    const pkg = buildCimPackage({
      nodes: [makeNode({ id: "wind1", kind: "ac-wind-source", params: { i_vbase: "110" } })],
      edges: [], projectName: "t", modelId: "m"
    });
    expect(pkg.generatingUnits).toHaveLength(1);
    expect(pkg.generatingUnits[0].cimClass).toBe("WindGeneratingUnit");
  });

  it("ac-storage → BatteryUnit（CIM16 标准储能类）", () => {
    const pkg = buildCimPackage({
      nodes: [makeNode({ id: "st1", kind: "ac-storage", params: { i_vbase: "110" } })],
      edges: [], projectName: "t", modelId: "m"
    });
    expect(pkg.generatingUnits).toHaveLength(1);
    expect(pkg.generatingUnits[0].cimClass).toBe("BatteryUnit");
  });

  it("dc-equipment 退化映射不崩且不产生 AC 类对象", () => {
    const pkg = buildCimPackage({
      nodes: [
        makeNode({ id: "dcb", kind: "dc-bus", params: {} }),
        makeNode({ id: "dcl", kind: "dc-line", params: {} }),
        makeNode({ id: "h2t", kind: "hydrogen-tank", params: {} })
      ],
      edges: [], projectName: "t", modelId: "m"
    });
    expect(pkg.busbarSections).toHaveLength(0);
    expect(pkg.acLineSegments).toHaveLength(0);
  });
});

describe("buildCimPackage 量测", () => {
  it("量测组 items → CimMeasurement（Analog，关联设备 rdfId）", () => {
    const groups: MeasurementGroup[] = [{
      id: "g1", nodeId: "load1", visible: true,
      anchor: "top", offset: { x: 0, y: 0 }, layout: "vertical",
      items: [{
        id: "i1", measurementTypeId: "analog-current", sourcePoint: "P",
        labelOverride: "有功", unitOverride: "MW", decimalsOverride: 2
      }]
    }];
    const pkg = buildCimPackage({
      nodes: [makeNode({ id: "load1", kind: "ac-load", params: { i_vbase: "110" } })],
      edges: [], projectName: "t", modelId: "m", measurementGroups: groups
    });
    expect(pkg.measurements).toHaveLength(1);
    expect(pkg.measurements[0].measurementType).toBe("Analog");
    expect(pkg.measurements[0].unit).toBe("MW");
    expect(pkg.measurements[0].powerSystemResourceId).toBe("N_load1");
  });

  it("无 measurements 输入时容错（undefined / 空数组）", () => {
    const base = buildCimPackage({
      nodes: [makeNode({ id: "load1", kind: "ac-load" })],
      edges: [], projectName: "t", modelId: "m"
    });
    expect(base.measurements).toEqual([]);
  });

  it("未导出设备（dc/氢能等 skip 类）不挂量测，避免悬挂 N_ 引用", () => {
    const groups: MeasurementGroup[] = [{
      id: "g-dc", nodeId: "dcbus1", visible: true,
      anchor: "top", offset: { x: 0, y: 0 }, layout: "vertical",
      items: [{ id: "i1", measurementTypeId: "p", sourcePoint: "P" }]
    }];
    const pkg = buildCimPackage({
      nodes: [makeNode({ id: "dcbus1", kind: "dc-bus" })],
      edges: [], projectName: "t", modelId: "m", measurementGroups: groups
    });
    expect(pkg.measurements).toEqual([]);
  });

  it("measurementTypes 命中时以 valueType 判定 Analog/Discrete（真源优先于 id 启发式）", () => {
    const groups: MeasurementGroup[] = [{
      id: "g1", nodeId: "load1", visible: true,
      anchor: "top", offset: { x: 0, y: 0 }, layout: "vertical",
      items: [
        { id: "i1", measurementTypeId: "status-analog", sourcePoint: "S" },
        { id: "i2", measurementTypeId: "plain", sourcePoint: "V" }
      ]
    }];
    const measurementTypes = [
      { id: "status-analog", valueType: "string" },
      { id: "plain", valueType: "number" }
    ];
    const pkg = buildCimPackage({
      nodes: [makeNode({ id: "load1", kind: "ac-load" })],
      edges: [], projectName: "t", modelId: "m",
      measurementGroups: groups, measurementTypes
    });
    expect(pkg.measurements).toHaveLength(2);
    expect(pkg.measurements[0].measurementType).toBe("Discrete"); // id 含 analog 但 valueType 为 string
    expect(pkg.measurements[1].measurementType).toBe("Analog"); // 无启发式特征，仅 valueType=number 判定
  });

  it("无电压设备 → BusbarSection 省略 voltageLevelId，CN 容器回填保持空串", () => {
    const pkg = buildCimPackage({
      nodes: [makeNode({ id: "bus1", kind: "ac-bus", params: {} })],
      edges: [], projectName: "t", modelId: "m"
    });
    expect(pkg.busbarSections[0].voltageLevelId).toBeUndefined();
    for (const cn of pkg.connectivityNodes) {
      expect(cn.containerId).not.toBe("VL_UNKNOWN");
    }
  });
});
