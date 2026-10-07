import { describe, expect, it } from "vitest";
import { DOMParser } from "@xmldom/xmldom";
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
  it("text 缺省时输出空文本，而不是 undefined 字面量", () => {
    expect(tag("cim:Substation", {}, 0)).toBe(`<cim:Substation></cim:Substation>`);
  });
  it("text 为空串与缺省等价", () => {
    expect(tag("cim:Substation", { text: "" }, 0)).toBe(`<cim:Substation></cim:Substation>`);
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

  it("description 与 mRID 各自独立输出，缺席的一方不补空元素", () => {
    const pkg = emptyPackage();
    pkg.substations = [
      { rdfId: "SUB_d", name: "站A", description: "描述&D" },
      { rdfId: "SUB_r", name: "站B", mRID: "urn:uuid:7d1b-mrid" }
    ];
    const xml = serializeCimPackage(pkg);
    expect(xml).toContain(`<cim:IdentifiedObject.description>描述&amp;D</cim:IdentifiedObject.description>`);
    expect(xml).toContain(`<cim:IdentifiedObject.mRID>urn:uuid:7d1b-mrid</cim:IdentifiedObject.mRID>`);
    expect(xml.match(/<cim:IdentifiedObject\.description>/g) ?? []).toHaveLength(1);
    expect(xml.match(/<cim:IdentifiedObject\.mRID>/g) ?? []).toHaveLength(1);
  });

  it("ACLineSegment.length 为 0 时仍输出元素（不被真值判断吞掉）", () => {
    const pkg = emptyPackage();
    pkg.acLineSegments = [
      { rdfId: "LINE_A", name: "线路A", r: 0, x: 0, bch: 0, length: 0, baseVoltageId: "BV_1" },
      { rdfId: "LINE_B", name: "线路B", r: 0, x: 0, bch: 0, length: 1.5, baseVoltageId: "BV_1" },
      { rdfId: "LINE_C", name: "线路C", r: 0, x: 0, bch: 0, baseVoltageId: "BV_1" }
    ];
    const xml = serializeCimPackage(pkg);
    expect(xml).toContain(`<cim:ACLineSegment.length>0</cim:ACLineSegment.length>`);
    expect(xml).toContain(`<cim:ACLineSegment.length>1.5</cim:ACLineSegment.length>`);
    // 线路C 未提供 length → 不输出，共 2 条
    expect(xml.match(/<cim:ACLineSegment\.length>/g) ?? []).toHaveLength(2);
  });

  it("Substation.regionId 存在时输出 Region 引用，缺席时不输出", () => {
    const pkg = emptyPackage();
    pkg.substations = [
      { rdfId: "SUB_1", name: "站1", regionId: "R_MAIN" },
      { rdfId: "SUB_2", name: "站2" }
    ];
    const xml = serializeCimPackage(pkg);
    expect(xml).toContain(`<cim:Substation.Region rdf:resource="#R_MAIN"/>`);
    expect(xml.match(/<cim:Substation\.Region /g) ?? []).toHaveLength(1);
  });

  it("PowerTransformer.vectorGroup 存在时输出，缺席时不输出", () => {
    const pkg = emptyPackage();
    pkg.powerTransformers = [
      { rdfId: "TR_1", name: "主变1", substationId: "SUB_1", vectorGroup: "Yyn0" },
      { rdfId: "TR_2", name: "主变2", substationId: "SUB_1" }
    ];
    const xml = serializeCimPackage(pkg);
    expect(xml).toContain(`<cim:PowerTransformer.vectorGroup>Yyn0</cim:PowerTransformer.vectorGroup>`);
    expect(xml.match(/<cim:PowerTransformer\.vectorGroup>/g) ?? []).toHaveLength(1);
  });

  it("Measurement 按 measurementType 选根元素，三类互不串台", () => {
    const pkg = emptyPackage();
    pkg.measurements = [
      { rdfId: "M_A", name: "模拟量", measurementType: "Analog", unit: "A", measurementClass: "Voltage", terminalId: "T_1", powerSystemResourceId: "EQ_1" },
      { rdfId: "M_D", name: "离散量", measurementType: "Discrete", terminalId: "T_2", powerSystemResourceId: "EQ_1" },
      { rdfId: "M_S", name: "字符串量", measurementType: "StringMeasurement", powerSystemResourceId: "EQ_1" }
    ];
    const xml = serializeCimPackage(pkg);
    expect(xml).toContain(`<cim:Analog rdf:ID="M_A">`);
    expect(xml).toContain(`</cim:Analog>`);
    expect(xml).toContain(`<cim:Discrete rdf:ID="M_D">`);
    expect(xml).toContain(`</cim:Discrete>`);
    expect(xml).toContain(`<cim:StringMeasurement rdf:ID="M_S">`);
    expect(xml).toContain(`</cim:StringMeasurement>`);
    // 三种根元素各恰好出现一次，没有把某类落到别的根上
    expect(xml.match(/<cim:Analog rdf:ID=/g) ?? []).toHaveLength(1);
    expect(xml.match(/<cim:Discrete rdf:ID=/g) ?? []).toHaveLength(1);
    expect(xml.match(/<cim:StringMeasurement rdf:ID=/g) ?? []).toHaveLength(1);
  });

  it("Measurement 的 unit/measurementClass/terminalId 各自独立可选", () => {
    const pkg = emptyPackage();
    pkg.measurements = [
      { rdfId: "M_A", name: "模拟量", measurementType: "Analog", unit: "A", measurementClass: "Voltage", terminalId: "T_1", powerSystemResourceId: "EQ_1" },
      { rdfId: "M_D", name: "离散量", measurementType: "Discrete", terminalId: "T_2", powerSystemResourceId: "EQ_1" },
      { rdfId: "M_S", name: "字符串量", measurementType: "StringMeasurement", powerSystemResourceId: "EQ_1" }
    ];
    const xml = serializeCimPackage(pkg);
    expect(xml).toContain(`<cim:Analog.unit>A</cim:Analog.unit>`);
    expect(xml).toContain(`<cim:Measurement.measurementClass>Voltage</cim:Measurement.measurementClass>`);
    expect(xml).toContain(`<cim:Measurement.Terminal rdf:resource="#T_1"/>`);
    expect(xml).toContain(`<cim:Measurement.Terminal rdf:resource="#T_2"/>`);
    expect(xml).toContain(`<cim:Measurement.PowerSystemResource rdf:resource="#EQ_1"/>`);
    // 只有 M_A 有 unit / measurementClass；M_S 三者皆无
    expect(xml.match(/<cim:Analog\.unit>/g) ?? []).toHaveLength(1);
    expect(xml.match(/<cim:Measurement\.measurementClass>/g) ?? []).toHaveLength(1);
    expect(xml.match(/<cim:Measurement\.Terminal /g) ?? []).toHaveLength(2);
  });

  // 回归：unit 的 qname 前缀此前恒为 cim:Analog，Discrete 量测带 unit 时产出
  // `<cim:Discrete>` 里嵌 `<cim:Analog.unit>` —— 属性 qname 的类前缀不是宿主类，非法 CIM。
  // 可达性：cim-builder.ts:506 直接 `unit: item.unitOverride`（不看 analogType），
  // 故离散量测一旦配了单位就必然走到这一行。
  // 说明：本条只钉「前缀跟随已选根元素」。CIM16 里 StringMeasurement 并没有 unit 属性，
  // 该分支产出的 `cim:StringMeasurement.unit` 是否该整体省略，属另一个问题，此处不表态。
  it("Discrete 量测的 unit 前缀跟随根元素，不产出非法的 Analog.unit", () => {
    const pkg = emptyPackage();
    pkg.measurements = [
      { rdfId: "M_D", name: "开关状态", measurementType: "Discrete", unit: "kV", powerSystemResourceId: "EQ_1" }
    ];
    const xml = serializeCimPackage(pkg);
    expect(xml).toContain(`<cim:Discrete rdf:ID="M_D">`);
    expect(xml).toContain(`<cim:Discrete.unit>kV</cim:Discrete.unit>`);
    // 形态断言：Discrete 块内不得出现 Analog 前缀的 unit
    const start = xml.indexOf(`<cim:Discrete rdf:ID=`);
    const block = xml.slice(start, xml.indexOf(`</cim:Discrete>`, start));
    expect(block).toContain(`<cim:Discrete.unit>kV</cim:Discrete.unit>`);
    expect(block).not.toContain(`Analog.unit`);
    expect(xml).not.toContain(`<cim:Analog.unit>`);
  });

  // 回归：属性位此前复用 escapeXmlText（只转 & < >），引号原样写进 rdf:ID / rdf:resource
  // 的双引号里 → 属性提前闭合、整份 XML 不可解析。id 取自落盘 JSON，而
  // normalizeProjectForStorage 只补形状、不清洗 id（server.mjs:2884），故外部可写。
  // 可达性：refTag / openWithId 未导出，此处经公开入口 serializeCimPackage 驱动
  // （substation.regionId 走 refTag，substation.rdfId 走 openWithId）。
  // 文本节点契约不变：引号在文本节点里不转义。
  it("rdf:ID 与 rdf:resource 的引号被转义，文本节点仍不转义引号", () => {
    const pkg = emptyPackage();
    pkg.substations = [{ rdfId: `SUB_a"b&c`, name: `站"名`, regionId: `R'x"y` }];
    const xml = serializeCimPackage(pkg);
    expect(xml).toContain(`<cim:Substation rdf:ID="SUB_a&quot;b&amp;c">`);
    expect(xml).toContain(`<cim:Substation.Region rdf:resource="#R&apos;x&quot;y"/>`);
    expect(xml).toContain(`<cim:IdentifiedObject.name>站"名</cim:IdentifiedObject.name>`);
    // 转义后仍可解析，且两个属性值无损解回原串（含引号本身）
    const doc = new DOMParser().parseFromString(xml, "application/xml");
    expect(doc.getElementsByTagName("parsererror")).toHaveLength(0);
    const sub = doc.getElementsByTagName("cim:Substation")[0];
    expect(sub.getAttribute("rdf:ID")).toBe(`SUB_a"b&c`);
    const region = doc.getElementsByTagName("cim:Substation.Region")[0];
    expect(region.getAttribute("rdf:resource")).toBe(`#R'x"y`);
  });
});
