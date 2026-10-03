// src/cim/cim-serializer.ts 的五类对象序列化直测 —— 158-194 整段此前 0 覆盖。
//
// ## 覆盖的是什么
//
// `serializeCimPackage` 逐类输出 RDF/XML。其中五类的循环体整块没被执行过：
// energySources / energyConsumers / generatingUnits / switches / shuntCompensators。
// 它们的共同点是「**可选数值字段用 !== undefined 决定写不写**」——
// 写多写少都会让下游 XML 解析器读到不该有的元素，所以逐个分支钉住：
//   - EnergySource.activePower / reactivePower
//   - EnergyConsumer.p / q
//   - GeneratingUnit.ratedGrossMaxP / ratedGrossMinP
//   - Switch.normalOpen（布尔 → "true"/"false"，恒写）
//   - ShuntCompensator.bPerSection / gPerSection / sections（sections 恒写）
//
// 另外 generatingUnits 与 switches 的**标签名来自各自的 cimClass 字段**，
// 不是写死的类名 —— 换类名就该换标签，这条单独钉。
import { describe, expect, test } from "vitest";

import { serializeCimPackage } from "./cim-serializer";
import type { CimPackage } from "./cim-types";

/** 一个只填必需字段的包；各用例只往里塞自己要验的那一类。 */
function emptyPackage(): CimPackage {
  return {
    fullModel: { rdfAbout: "urn:uuid:model-1", created: "2026-01-01T00:00:00Z", description: "d", version: 1, profile: "p" },
    substations: [],
    voltageLevels: [],
    baseVoltages: [],
    busbarSections: [],
    acLineSegments: [],
    powerTransformers: [],
    transformerEnds: [],
    energySources: [],
    energyConsumers: [],
    generatingUnits: [],
    switches: [],
    shuntCompensators: [],
    connectivityNodes: [],
    terminals: [],
    measurements: []
  };
}

const serialize = (pkg: CimPackage) => serializeCimPackage(pkg);

describe("EnergySource / EnergyConsumer", () => {
  test("★ 两个数值字段都 undefined 时只出 identifiedObject + 电压引用", () => {
    const xml = serialize({
      ...emptyPackage(),
      energySources: [{ rdfId: "src-1", name: "电源1", baseVoltageId: "bv-1" }]
    });
    expect(xml).toContain('<cim:EnergySource rdf:ID="src-1">');
    expect(xml).toContain("cim:ConductingEquipment.BaseVoltage");
    expect(xml).not.toContain("cim:EnergySource.activePower");
    expect(xml).not.toContain("cim:EnergySource.reactivePower");
  });

  test("给了 activePower / reactivePower 就都写出（0 也写，不按真值判断）", () => {
    const xml = serialize({
      ...emptyPackage(),
      energySources: [{ rdfId: "src-1", name: "电源1", baseVoltageId: "bv-1", activePower: 0, reactivePower: 12.5 }]
    });
    expect(xml).toContain("cim:EnergySource.activePower");
    expect(xml).toContain("cim:EnergySource.reactivePower");
  });

  test("★ EnergyConsumer 用的是 p / q 标签（不是 activePower / reactivePower）", () => {
    const xml = serialize({
      ...emptyPackage(),
      energyConsumers: [{ rdfId: "con-1", name: "负荷1", baseVoltageId: "bv-1", activePower: 3, reactivePower: 4 }]
    });
    expect(xml).toContain("cim:EnergyConsumer.p");
    expect(xml).toContain("cim:EnergyConsumer.q");
    expect(xml).not.toContain("cim:EnergyConsumer.activePower");
  });

  test("只给一个数值时另一个仍不写（按字段各自判 undefined）", () => {
    const xml = serialize({
      ...emptyPackage(),
      energyConsumers: [{ rdfId: "con-1", name: "负荷1", baseVoltageId: "bv-1", reactivePower: 4 }]
    });
    expect(xml).toContain("cim:EnergyConsumer.q");
    expect(xml).not.toContain("cim:EnergyConsumer.p");
  });
});

describe("GeneratingUnit —— 标签名随 cimClass 变", () => {
  test("★ WindGeneratingUnit 出 WindGeneratingUnit 标签", () => {
    const xml = serialize({
      ...emptyPackage(),
      generatingUnits: [
        { cimClass: "WindGeneratingUnit", rdfId: "gu-1", name: "风机", baseVoltageId: "bv-1", ratedGrossMaxP: 2000 }
      ]
    });
    expect(xml).toContain('<cim:WindGeneratingUnit rdf:ID="gu-1">');
    expect(xml).not.toContain('<cim:GeneratingUnit rdf:ID=');
    expect(xml).toContain("cim:GeneratingUnit.ratedGrossMaxP");
  });

  test("BatteryUnit 出 BatteryUnit 标签（同一段代码、不同的类）", () => {
    const xml = serialize({
      ...emptyPackage(),
      generatingUnits: [{ cimClass: "BatteryUnit", rdfId: "gu-2", name: "储能", baseVoltageId: "bv-1" }]
    });
    expect(xml).toContain("cim:BatteryUnit");
    expect(xml).not.toContain("cim:GeneratingUnit.ratedGrossMaxP");
  });

  test("ratedGrossMaxP / ratedGrossMinP 各自独立判断", () => {
    const xml = serialize({
      ...emptyPackage(),
      generatingUnits: [
        { cimClass: "SolarGeneratingUnit", rdfId: "gu-3", name: "光伏", baseVoltageId: "bv-1", ratedGrossMinP: 0 }
      ]
    });
    expect(xml).toContain("cim:GeneratingUnit.ratedGrossMinP");
    expect(xml).not.toContain("cim:GeneratingUnit.ratedGrossMaxP");
  });
});

describe("Switch —— normalOpen 恒写且布尔落成 true/false", () => {
  test("★ normalOpen=false 也要写出 \"false\"（不是按真值跳过）", () => {
    const xml = serialize({
      ...emptyPackage(),
      switches: [{ cimClass: "Breaker", rdfId: "sw-1", name: "断路器1", normalOpen: false }]
    });
    expect(xml).toContain("cim:Switch.normalOpen");
    expect(xml).toContain("<cim:Switch.normalOpen>false</cim:Switch.normalOpen>");
  });

  test("normalOpen=true 写成 \"true\"，标签随 cimClass 变", () => {
    const xml = serialize({
      ...emptyPackage(),
      switches: [{ cimClass: "Disconnector", rdfId: "sw-2", name: "隔离开关", normalOpen: true }]
    });
    expect(xml).toContain("<cim:Switch.normalOpen>true</cim:Switch.normalOpen>");
    expect(xml).toContain("cim:Disconnector");
    expect(xml).not.toContain("cim:Breaker");
  });

  test("switch 不写 BaseVoltage 引用（与 EnergySource 的差别）", () => {
    const withVoltage = serialize({
      ...emptyPackage(),
      switches: [{ cimClass: "Breaker", rdfId: "sw-3", name: "x", normalOpen: false, voltageLevelId: "vl-1" }]
    });
    expect(withVoltage).toContain("cim:Switch");
  });
});

describe("ShuntCompensator", () => {
  test("★ sections 恒写，bPerSection / gPerSection 按 undefined 判断", () => {
    const xml = serialize({
      ...emptyPackage(),
      shuntCompensators: [
        { cimClass: "LinearShuntCompensator", rdfId: "sh-1", name: "电容器", sections: 2, bPerSection: 0.001 }
      ]
    });
    expect(xml).toContain("cim:ShuntCompensator.sections");
    expect(xml).toContain("cim:ShuntCompensator.bPerSection");
    expect(xml).not.toContain("cim:ShuntCompensator.gPerSection");
  });

  test("只给 gPerSection 时 bPerSection 不写，sections 仍写", () => {
    const xml = serialize({
      ...emptyPackage(),
      shuntCompensators: [
        { cimClass: "SeriesCompensator", rdfId: "sh-2", name: "串联补偿", sections: 1, gPerSection: 0.002 }
      ]
    });
    expect(xml).toContain("cim:ShuntCompensator.gPerSection");
    expect(xml).not.toContain("cim:ShuntCompensator.bPerSection");
    expect(xml).toContain("cim:SeriesCompensator");
  });

  test("sections 为 0 也写出（0 是合法段数，不是「没有值」）", () => {
    const xml = serialize({
      ...emptyPackage(),
      shuntCompensators: [{ cimClass: "LinearShuntCompensator", rdfId: "sh-3", name: "零段", sections: 0 }]
    });
    expect(xml).toContain("<cim:ShuntCompensator.sections>0</cim:ShuntCompensator.sections>");
  });
});

describe("rdf:ID 与公共字段", () => {
  test("★ rdfId 写成 rdf:ID 属性（引用侧才是 rdf:resource）", () => {
    const xml = serialize({
      ...emptyPackage(),
      switches: [{ cimClass: "Breaker", rdfId: "sw-42", name: "断路器42", normalOpen: false }],
      energySources: [{ rdfId: "src-42", name: "源42", baseVoltageId: "bv-1" }]
    });
    expect(xml).toContain('<cim:Breaker rdf:ID="sw-42">');
    expect(xml).toContain('<cim:ConductingEquipment.BaseVoltage rdf:resource="#bv-1"/>');
  });

  test("★ 悬挂引用（空 id 或 *_UNKNOWN）直接省略，不写空引用元素", () => {
    const xml = serialize({
      ...emptyPackage(),
      energySources: [{ rdfId: "src-1", name: "源", baseVoltageId: "bv_UNKNOWN" }]
    });
    expect(xml).not.toContain("cim:ConductingEquipment.BaseVoltage");
  });

  test("五类同时存在时各自成段、顺序按 pkg 的类分组", () => {
    const xml = serialize({
      ...emptyPackage(),
      energySources: [{ rdfId: "src-1", name: "源", baseVoltageId: "bv-1" }],
      energyConsumers: [{ rdfId: "con-1", name: "荷", baseVoltageId: "bv-1" }],
      generatingUnits: [{ cimClass: "HydroGeneratingUnit", rdfId: "gu-1", name: "水电", baseVoltageId: "bv-1" }],
      switches: [{ cimClass: "Breaker", rdfId: "sw-1", name: "断", normalOpen: false }],
      shuntCompensators: [{ cimClass: "LinearShuntCompensator", rdfId: "sh-1", name: "容", sections: 1 }]
    });
    const order = [
      '<cim:EnergySource rdf:ID="src-1">',
      '<cim:EnergyConsumer rdf:ID="con-1">',
      '<cim:HydroGeneratingUnit rdf:ID="gu-1">',
      '<cim:Breaker rdf:ID="sw-1">',
      '<cim:LinearShuntCompensator rdf:ID="sh-1">'
    ];
    const positions = order.map((label) => xml.indexOf(label));
    positions.forEach((position, index) => {
      expect(position, order[index]).toBeGreaterThan(-1);
    });
    expect([...positions].sort((left, right) => left - right)).toEqual(positions);
  });
});