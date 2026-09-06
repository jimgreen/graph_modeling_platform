import { describe, expect, it } from "vitest";
import { escapeXmlText, serializeCimPackage, tag } from "./cim-serializer";
import { CIM_NS } from "./cim-namespaces";
import type { CimPackage } from "./cim-types";

describe("escapeXmlText", () => {
  it("转义 & < > 但不转义引号", () => {
    expect(escapeXmlText(`A&B <C> "D" 'E'`)).toBe(`A&amp;B &lt;C&gt; "D" 'E'`);
  });
});

describe("tag", () => {
  it("生成带缩进的文本元素", () => {
    expect(tag("cim:Substation", { text: "示例站" }, 0)).toBe(`<cim:Substation>示例站</cim:Substation>`);
  });
  it("生成带命名空间的嵌套", () => {
    expect(tag("cim:IdentifiedObject.name", { text: "1号主变" }, 1)).toBe(`  <cim:IdentifiedObject.name>1号主变</cim:IdentifiedObject.name>`);
  });
});

describe("serializeCimPackage", () => {
  const emptyPackage = (): CimPackage => ({
    fullModel: {
      rdfAbout: "urn:uuid:test-1",
      created: "2026-09-07T00:00:00Z",
      description: "测试导出",
      version: 1,
      profile: `${CIM_NS.cim}EquipmentCore`
    },
    substations: [], voltageLevels: [], baseVoltages: [], busbarSections: [],
    acLineSegments: [], powerTransformers: [], transformerEnds: [],
    energySources: [], energyConsumers: [], generatingUnits: [], switches: [],
    shuntCompensators: [], connectivityNodes: [], terminals: [], measurements: []
  });

  it("输出 rdf:RDF 根与三个命名空间", () => {
    const xml = serializeCimPackage(emptyPackage());
    expect(xml).toContain(`<?xml version="1.0" encoding="UTF-8"?>`);
    expect(xml).toContain('xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"');
    expect(xml).toContain('xmlns:cim="http://iec.ch/TC57/2013/CIM-schema-cim16#"');
    expect(xml).toContain('xmlns:md="http://iec.ch/TC57/61970-552/ModelDescription/1#"');
    expect(xml).toContain(`<md:FullModel rdf:about="urn:uuid:test-1">`);
  });

  it("BaseVoltage 序列化含嵌套 name 与 nominalVoltage", () => {
    const pkg = emptyPackage();
    pkg.baseVoltages = [{ rdfId: "BV_110", name: "110kV", nominalVoltage: 110 }];
    const xml = serializeCimPackage(pkg);
    expect(xml).toContain(`<cim:BaseVoltage rdf:ID="BV_110">`);
    expect(xml).toContain(`<cim:IdentifiedObject.name>110kV</cim:IdentifiedObject.name>`);
    expect(xml).toContain(`<cim:BaseVoltage.nominalVoltage>110</cim:BaseVoltage.nominalVoltage>`);
  });

  it("rdf:resource 引用输出 # 前缀", () => {
    const pkg = emptyPackage();
    pkg.acLineSegments = [{
      rdfId: "LINE_1", name: "线路1", r: 0.12, x: 0.45, bch: 0.000034, baseVoltageId: "BV_110"
    }];
    const xml = serializeCimPackage(pkg);
    expect(xml).toContain(`<cim:ConductingEquipment.BaseVoltage rdf:resource="#BV_110"/>`);
  });

  it("浮点数保留 6 位有效数字", () => {
    const pkg = emptyPackage();
    pkg.acLineSegments = [{
      rdfId: "LINE_1", name: "线路1", r: 0.0000345, x: 1234.56789, bch: 0, baseVoltageId: "BV_110"
    }];
    const xml = serializeCimPackage(pkg);
    expect(xml).toContain(`<cim:ACLineSegment.r>0.0000345</cim:ACLineSegment.r>`);
    expect(xml).toContain(`<cim:ACLineSegment.x>1234.57</cim:ACLineSegment.x>`);
  });

  it("Number 转 XML 文本（整数不输出小数点）", () => {
    expect(serializeCimPackage({
      ...emptyPackage(),
      baseVoltages: [{ rdfId: "BV_10", name: "10kV", nominalVoltage: 10 }]
    })).toContain(`<cim:BaseVoltage.nominalVoltage>10</cim:BaseVoltage.nominalVoltage>`);
  });

  it("EnergyConsumer 使用 CIM16 属性名 p/q", () => {
    const pkg = emptyPackage();
    pkg.energyConsumers = [{
      rdfId: "N_load1", name: "负荷1", baseVoltageId: "BV_110", activePower: 5, reactivePower: 2
    }];
    const xml = serializeCimPackage(pkg);
    expect(xml).toContain(`<cim:EnergyConsumer.p>5</cim:EnergyConsumer.p>`);
    expect(xml).toContain(`<cim:EnergyConsumer.q>2</cim:EnergyConsumer.q>`);
    expect(xml).not.toContain("EnergyConsumer.activePower");
  });

  it("BusbarSection/PowerTransformer 容器引用使用 EquipmentContainer", () => {
    const pkg = emptyPackage();
    pkg.busbarSections = [{ rdfId: "N_bus1", name: "母线1", voltageLevelId: "VL_110" }];
    pkg.powerTransformers = [{ rdfId: "N_tr1", name: "主变1", substationId: "SUB_m" }];
    const xml = serializeCimPackage(pkg);
    expect(xml).toContain(`<cim:Equipment.EquipmentContainer rdf:resource="#VL_110"/>`);
    expect(xml).toContain(`<cim:Equipment.EquipmentContainer rdf:resource="#SUB_m"/>`);
    expect(xml).not.toContain("EnergyIdentifiers");
  });

  it("悬挂 _UNKNOWN 引用整体省略", () => {
    const pkg = emptyPackage();
    pkg.busbarSections = [{ rdfId: "N_bus1", name: "母线1", voltageLevelId: "VL_UNKNOWN" }];
    pkg.acLineSegments = [{ rdfId: "N_line1", name: "线路1", r: 0, x: 0, bch: 0, baseVoltageId: "BV_UNKNOWN" }];
    pkg.connectivityNodes = [{ rdfId: "CN_1", name: "节点1", containerId: "", containerType: "VoltageLevel" }];
    const xml = serializeCimPackage(pkg);
    expect(xml).not.toContain("_UNKNOWN");
    expect(xml).not.toContain(`rdf:resource="#VL_UNKNOWN"`);
    expect(xml).not.toContain(`rdf:resource="#BV_UNKNOWN"`);
    // 空容器引用同样省略
    expect(xml).not.toContain(`<cim:ConnectivityNode.ConnectivityNodeContainer`);
  });
});
