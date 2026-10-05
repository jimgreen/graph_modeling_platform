import { describe, expect, it } from "vitest";
import { buildCimPackage, cimClassForKind, collectMissingCriticalParams, extractBaseVoltages, inferTopology } from "./cim-builder";
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

// buildCimPackage 的阶段 1 只扫一遍 input.nodes：baseVoltages 清单与派生的 rdfId 映射
// 必须同源。若日后有人把映射改回独立重算（或从别的口径重算），本组断言转红。
describe("buildCimPackage 电压基：清单与 rdfId 映射同源", () => {
  /** 电压值 → rdfId 直读产物，映射侧一律经此与清单对照 */
  const bvIds = (pkg: ReturnType<typeof buildCimPackage>) => pkg.baseVoltages.map((bv) => bv.rdfId);

  it("空节点数组 → 清单/VoltageLevel 都为空，映射侧无悬挂引用", () => {
    const pkg = buildCimPackage({ nodes: [], edges: [], projectName: "t", modelId: "m-empty" });
    expect(pkg.baseVoltages).toEqual([]);
    expect(pkg.voltageLevels).toEqual([]);
    expect(pkg.substations).toHaveLength(1); // 容器恒在，与节点数无关
  });

  it("两节点电压基**相同** → 去重成一条，两个 VoltageLevel 合并", () => {
    const nodes = [
      makeNode({ id: "bus1", kind: "ac-bus", params: { i_vbase: "110" } }),
      makeNode({ id: "bus2", kind: "ac-bus", params: { i_vbase: "110.0" } })
    ];
    const pkg = buildCimPackage({ nodes, edges: [], projectName: "t", modelId: "m" });
    expect(bvIds(pkg)).toEqual(["BV_110"]);
    expect(pkg.voltageLevels.map((vl) => vl.rdfId)).toEqual(["VL_110"]);
    expect(pkg.voltageLevels[0].baseVoltageId).toBe("BV_110");
    // 两个母线挂在同一个 VoltageLevel 上
    expect(pkg.busbarSections.map((b) => b.voltageLevelId)).toEqual(["VL_110", "VL_110"]);
  });

  it("两节点电压基**不同** → 各自一条 VoltageLevel，且都指回清单里的 rdfId", () => {
    const nodes = [
      makeNode({ id: "bus1", kind: "ac-bus", params: { i_vbase: "110" } }),
      makeNode({ id: "bus2", kind: "ac-bus", params: { i_vbase: "10" } }),
      makeNode({
        id: "line1", kind: "ac-line",
        params: { i_vbase: "500", r: "0.1", x: "0.2" },
        terminals: [{ id: "t1", label: "1", type: "ac", anchor: { x: 0, y: 0 }, nodeNumber: "1", vbase: "110" }]
      })
    ];
    const pkg = buildCimPackage({ nodes, edges: [], projectName: "t", modelId: "m" });
    expect(bvIds(pkg)).toEqual(["BV_10", "BV_110", "BV_500"]);
    // 清单即映射的取值域：任何 baseVoltageId 都能在清单里找到（无悬挂引用）
    const known = new Set(bvIds(pkg));
    for (const vl of pkg.voltageLevels) {
      expect(known.has(vl.baseVoltageId)).toBe(true);
    }
    expect(pkg.voltageLevels.map((vl) => [vl.rdfId, vl.baseVoltageId])).toEqual([
      ["VL_10", "BV_10"],
      ["VL_110", "BV_110"]
    ]);
    // 设备 baseVoltageId 取「主电压」（端子 110 优先于分侧 500），故指回 BV_110
    expect(pkg.acLineSegments[0].baseVoltageId).toBe("BV_110");
    expect(known.has(pkg.acLineSegments[0].baseVoltageId)).toBe(true);
    // BV_500 进了清单（声明用到即收），但没成 VoltageLevel —— 清单比映射取值域更宽
    expect(known.has("BV_500")).toBe(true);
    expect(pkg.voltageLevels.some((vl) => vl.baseVoltageId === "BV_500")).toBe(false);
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

describe("collectMissingCriticalParams", () => {
  it("无电压母线报电压等级缺失", () => {
    const missing = collectMissingCriticalParams([
      makeNode({ id: "bus1", kind: "ac-bus", name: "母线1", params: {} })
    ]);
    expect(missing).toEqual([{ nodeId: "bus1", name: "母线1", missing: ["电压等级"] }]);
  });

  it("端子 vbase 为默认占位 0、params.vbase 已设置时不再报缺失", () => {
    const missing = collectMissingCriticalParams([
      makeNode({
        id: "bus1",
        kind: "ac-bus",
        name: "交流母线-1",
        params: { vbase: "500", rated_voltage: "500", voltage_level: "10" },
        terminals: [
          { id: "t1", label: "t", type: "ac", anchor: { x: 0, y: 0 }, nodeNumber: "1", vbase: "0" },
          { id: "t2", label: "t", type: "ac", anchor: { x: 0, y: 0 }, nodeNumber: "2", vbase: "0" }
        ]
      })
    ]);
    expect(missing).toEqual([]);
  });

  it("通用电压基值计入 BaseVoltage / VoltageLevel，端子与分侧 vbase 优先", () => {
    const nodes = [
      makeNode({
        id: "bus1",
        kind: "ac-bus",
        name: "母线1",
        params: { vbase: "10" },
        terminals: [{ id: "t1", label: "t", type: "ac", anchor: { x: 0, y: 0 }, nodeNumber: "1", vbase: "0" }]
      }),
      makeNode({
        id: "line1",
        name: "线路1",
        params: { vbase: "500", r: "0.1", x: "0.2" },
        terminals: [{ id: "t1", label: "t", type: "ac", anchor: { x: 0, y: 0 }, nodeNumber: "1", vbase: "110" }]
      })
    ];
    expect(extractBaseVoltages(nodes).map((bv) => bv.nominalVoltage)).toEqual([10, 110, 500]);
    // 主电压（VoltageLevel 分组依据）仍以端子/分侧 vbase 为准：线路归 110 而非其 params.vbase=500
    const pkg = buildCimPackage({ nodes, edges: [], projectName: "t", modelId: "m" });
    expect(pkg.voltageLevels.map((vl) => vl.name)).toEqual(["10kV母线", "110kV母线"]);
    expect(pkg.busbarSections[0].voltageLevelId).toBe("VL_10");
  });

  it("线路无 r 且无 x 报线路阻抗缺失", () => {
    const missing = collectMissingCriticalParams([
      makeNode({ id: "line1", name: "线路1", params: { i_vbase: "110" } })
    ]);
    expect(missing).toEqual([{ nodeId: "line1", name: "线路1", missing: ["线路阻抗 r/x"] }]);
  });

  it("三绕组变压器缺 k_vbase 报绕组额定电压", () => {
    const missing = collectMissingCriticalParams([
      makeNode({ id: "tr1", kind: "ac-three-winding-transformer", name: "三绕组主变", params: { i_vbase: "220", j_vbase: "110" } })
    ]);
    expect(missing).toEqual([{ nodeId: "tr1", name: "三绕组主变", missing: ["绕组额定电压（k_vbase）"] }]);
  });

  it("参数齐全不报；负荷缺 p/q 不报（可选参数非关键）", () => {
    const missing = collectMissingCriticalParams([
      makeNode({ id: "line2", name: "线路2", params: { i_vbase: "110", r: "0.5", x: "1.2" } }),
      makeNode({ id: "load1", kind: "ac-load", name: "负荷1", params: { i_vbase: "10" } })
    ]);
    expect(missing).toEqual([]);
  });

  it("dc 类 skip 设备不报", () => {
    const missing = collectMissingCriticalParams([
      makeNode({ id: "dc1", kind: "dc-line", name: "直流线路", params: {} })
    ]);
    expect(missing).toEqual([]);
  });
});

// ── 阶段 2/3/4a/5 的兜底与守卫分支 ──
describe("cim-builder 兜底与守卫分支", () => {
  // 覆盖 L80 `input.projectName || 未命名`。
  // 双侧断言：空串走兜底；纯空白串是 truthy，必须原样透传
  //（若实现改成 `!input.projectName.trim()` 之类的加固，本断言会红）。
  it("空 projectName → Substation 名为 未命名；纯空白串原样透传", () => {
    const nodes = [makeNode({ id: "bus1", kind: "ac-bus", params: { i_vbase: "110" } })];
    const blank = buildCimPackage({ nodes, edges: [], projectName: "", modelId: "m-blank" });
    expect(blank.substations).toHaveLength(1);
    expect(blank.substations[0].name).toBe("未命名");
    expect(blank.substations[0].rdfId).toBe("SUB_m-blank");

    const spaces = buildCimPackage({ nodes, edges: [], projectName: "  ", modelId: "m-blank" });
    expect(spaces.substations[0].name).toBe("  "); // falsy vs 空白：不可混淆
    expect(spaces.substations[0].name).not.toBe("未命名");
  });

  // 覆盖 L160 `keys.length === 0 continue`（acTopologyNode 合法但无 ac 端子）
  // 与 L166 `bucket.length < 2 continue`（同拓扑号只有 1 个 ac 端子）。
  //
  // 等价性记录（变异验证实测 GREEN）：
  // · L160 删掉后，多出的只是一个空数组桶；该桶在 L166 被 `< 2` 拦下，
  //   且后续同拓扑号节点走 `if (bucket)` 真分支 push，桶内容与 `set(key, keys)` 相同 → 输出等价。
  // · L166 删掉后，`for (index = 1; ...)` 对 length≤1 的桶本就不进循环 → 输出等价。
  // 因此本用例只能证明「这两条守卫被执行」，无法证伪其删除；断言保持在真正受影响的
  // 可见输出（CN 数量 / Terminal 归属）上。
  it("acTopologyNode 有效但无 ac 端子 → 不入隐式合并；同拓扑号仅 1 个 ac 端子 → 不建组", () => {
    const dcOnly = makeNode({
      id: "dcOnly", kind: "dc-bus", acTopologyNode: 5,
      terminals: [{ id: "d1", label: "d", type: "dc", anchor: { x: 0, y: 0 }, nodeNumber: "1" }]
    });
    const soloAc = makeNode({
      id: "soloAc", kind: "ac-bus", params: { i_vbase: "110" }, acTopologyNode: 6,
      terminals: [{ id: "a1", label: "1", type: "ac", anchor: { x: 0, y: 0 }, nodeNumber: "1" }]
    });
    const pairA = makeNode({
      id: "pairA", kind: "ac-bus", params: { i_vbase: "110" }, acTopologyNode: 7,
      terminals: [{ id: "p1", label: "1", type: "ac", anchor: { x: 0, y: 0 }, nodeNumber: "2" }]
    });
    const pairB = makeNode({
      id: "pairB", kind: "ac-bus", params: { i_vbase: "110" }, acTopologyNode: 7,
      terminals: [{ id: "p2", label: "1", type: "ac", anchor: { x: 0, y: 0 }, nodeNumber: "3" }]
    });
    const { connectivityNodes, terminals } = inferTopology({
      nodes: [dcOnly, soloAc, pairA, pairB], edges: [], projectName: "t", modelId: "m"
    });
    expect(connectivityNodes).toHaveLength(1);
    expect(connectivityNodes[0].rdfId).toBe("CN_1");
    expect(terminals).toHaveLength(2);
    expect(terminals.map((t) => t.conductingEquipmentId).sort()).toEqual(["N_pairA", "N_pairB"]);
    for (const terminal of terminals) {
      expect(terminal.connectivityNodeId).toBe("CN_1");
    }
  });

  // 覆盖 L333 `ratedU > 0 ? ... : BV_UNKNOWN` 的 false 分支。
  // 双侧断言保证断言值与「真分支产出」不同：ratedU>0 时产出的是 BV_110，
  // 若守卫被改成 `>=` / 被删，兜底值会变成 BV_0 而非 BV_UNKNOWN → 本用例转红。
  it("变压器缺一侧额定电压 → 该绕组 baseVoltageId 兜底 BV_UNKNOWN（ratedU=0）", () => {
    const pkg = buildCimPackage({
      nodes: [makeTransformer({ id: "trNoJ", name: "缺低压侧主变", params: { i_vbase: "110", sn: "50" } })],
      edges: [], projectName: "t", modelId: "m"
    });
    expect(pkg.transformerEnds).toHaveLength(2);
    expect(pkg.transformerEnds[0].ratedU).toBe(110);
    expect(pkg.transformerEnds[0].baseVoltageId).toBe("BV_110");
    expect(pkg.transformerEnds[0].ratedS).toBe(50);
    expect(pkg.transformerEnds[1].ratedU).toBe(0);
    expect(pkg.transformerEnds[1].baseVoltageId).toBe("BV_UNKNOWN");
    expect(pkg.transformerEnds[1].baseVoltageId).not.toBe(pkg.transformerEnds[0].baseVoltageId);
    expect(pkg.transformerEnds[1].ratedS).toBe(50);
  });

  // 覆盖 L491 `measurementTypeId ?? 空串` 与 L492 `decimalsOverride !== undefined`。
  // i1 的 measurementTypeId 在运行时缺失（持久化边界允许缺字段），走 L491 右操作数 → Discrete；
  // i2 无 analog 字样但显式给了小数位，走 L492 → Analog；
  // i3 靠 defaultValue=0 判定（0 是 falsy，锁死 typeof 判断而非真值判断）；
  // i4 无任何启发式特征 → Discrete，保证反向侧也有鉴别力。
  it("无量测类型定义时的启发式：缺 measurementTypeId→Discrete、decimalsOverride→Analog、defaultValue=0→Analog", () => {
    const items = [
      { id: "i1", measurementTypeId: undefined, sourcePoint: "P1", name: "量测1" },
      { id: "i2", measurementTypeId: "soc", sourcePoint: "SOC", decimalsOverride: 2 },
      { id: "i3", measurementTypeId: "status", sourcePoint: "S", defaultValue: 0 },
      { id: "i4", measurementTypeId: "breaker-state", sourcePoint: "B" }
    ] as unknown as MeasurementGroup["items"];
    const groups: MeasurementGroup[] = [{
      id: "g-heur", nodeId: "load1", visible: true,
      anchor: "top", offset: { x: 0, y: 0 }, layout: "vertical", items
    }];
    const pkg = buildCimPackage({
      nodes: [makeNode({ id: "load1", kind: "ac-load", params: { i_vbase: "110" } })],
      edges: [], projectName: "t", modelId: "m", measurementGroups: groups
    });
    expect(pkg.measurements.map((m) => m.measurementType)).toEqual(["Discrete", "Analog", "Analog", "Discrete"]);
    expect(pkg.measurements.map((m) => m.name)).toEqual(["量测1", "SOC", "S", "B"]);
    for (const measurement of pkg.measurements) {
      expect(measurement.powerSystemResourceId).toBe("N_load1");
    }
  });
});
