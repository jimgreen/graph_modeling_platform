// CIM IR → CIM/XML (RDF/XML) 序列化器

import { CIM_NS } from "./cim-namespaces";
import type {
  CimACLineSegment, CimBaseVoltage, CimBusbarSection, CimConnectivityNode,
  CimEnergyConsumer, CimEnergySource, CimGeneratingUnit, CimMeasurement,
  CimPackage, CimPowerTransformer, CimPowerTransformerEnd, CimShuntCompensator,
  CimSubstation, CimSwitch, CimTerminal, CimVoltageLevel
} from "./cim-types";

/** XML 文本内容转义：仅 & < >（' " 在文本节点无需转义） */
export function escapeXmlText(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** 数字 → XML 文本：整数不输出小数点，其余保留 6 位有效数字 */
function numberText(value: number): string {
  return String(Number(value.toPrecision(6)));
}

/** 缩进 + 文本元素（无属性） */
export function tag(qname: string, body: { text?: string }, indent: number): string {
  const pad = "  ".repeat(indent);
  return `${pad}<${qname}>${body.text ?? ""}</${qname}>`;
}

/** 缩进 + 自闭合资源引用元素 */
function refTag(qname: string, resourceId: string, indent: number): string {
  const pad = "  ".repeat(indent);
  return `${pad}<${qname} rdf:resource="#${escapeXmlText(resourceId)}"/>`;
}

/** 引用元素入行：空 id 或 *_UNKNOWN 悬挂引用直接省略（评审 I2 固化） */
function pushRef(lines: string[], qname: string, resourceId: string, indent: number): void {
  if (!resourceId || resourceId.endsWith("_UNKNOWN")) return;
  lines.push(refTag(qname, resourceId, indent));
}

/** 带 rdf:ID 的对象开标签 */
function openWithId(qname: string, rdfId: string, indent: number): string {
  return `${"  ".repeat(indent)}<${qname} rdf:ID="${escapeXmlText(rdfId)}">`;
}

function close(qname: string, indent: number): string {
  return `${"  ".repeat(indent)}</${qname}>`;
}

/** IdentifiedObject 公共子元素（name 优先，然后 description/mRID） */
function identifiedObjectBody(obj: { name: string; description?: string; mRID?: string }, indent: number): string[] {
  const lines: string[] = [];
  if (obj.name) {
    lines.push(tag("cim:IdentifiedObject.name", { text: escapeXmlText(obj.name) }, indent));
  }
  if (obj.description) {
    lines.push(tag("cim:IdentifiedObject.description", { text: escapeXmlText(obj.description) }, indent));
  }
  if (obj.mRID) {
    lines.push(tag("cim:IdentifiedObject.mRID", { text: escapeXmlText(obj.mRID) }, indent));
  }
  return lines;
}

function serializeVoltageLevel(vl: CimVoltageLevel): string[] {
  const lines = [openWithId("cim:VoltageLevel", vl.rdfId, 1)];
  lines.push(...identifiedObjectBody(vl, 2));
  pushRef(lines, "cim:VoltageLevel.Substation", vl.substationId, 2);
  pushRef(lines, "cim:VoltageLevel.BaseVoltage", vl.baseVoltageId, 2);
  lines.push(close("cim:VoltageLevel", 1));
  return lines;
}

function serializeACLineSegment(line: CimACLineSegment): string[] {
  const lines = [openWithId("cim:ACLineSegment", line.rdfId, 1)];
  lines.push(...identifiedObjectBody(line, 2));
  lines.push(tag("cim:ACLineSegment.r", { text: numberText(line.r) }, 2));
  lines.push(tag("cim:ACLineSegment.x", { text: numberText(line.x) }, 2));
  lines.push(tag("cim:ACLineSegment.bch", { text: numberText(line.bch) }, 2));
  if (line.length !== undefined) {
    lines.push(tag("cim:ACLineSegment.length", { text: numberText(line.length) }, 2));
  }
  pushRef(lines, "cim:ConductingEquipment.BaseVoltage", line.baseVoltageId, 2);
  lines.push(close("cim:ACLineSegment", 1));
  return lines;
}

/** 顶层序列化入口。按类分组输出，保证可读性与 rdf:ID 引用顺序无关。 */
export function serializeCimPackage(pkg: CimPackage): string {
  const lines: string[] = [];
  lines.push(`<?xml version="1.0" encoding="UTF-8"?>`);
  lines.push(`<rdf:RDF xmlns:rdf="${CIM_NS.rdf}"`);
  lines.push(`         xmlns:cim="${CIM_NS.cim}"`);
  lines.push(`         xmlns:md="${CIM_NS.md}">`);
  lines.push("");
  // FullModel 头
  lines.push(`  <md:FullModel rdf:about="${escapeXmlText(pkg.fullModel.rdfAbout)}">`);
  lines.push(tag("md:Model.created", { text: escapeXmlText(pkg.fullModel.created) }, 2));
  lines.push(tag("md:Model.description", { text: escapeXmlText(pkg.fullModel.description) }, 2));
  lines.push(tag("md:Model.version", { text: String(pkg.fullModel.version) }, 2));
  lines.push(tag("md:Model.profile", { text: escapeXmlText(pkg.fullModel.profile) }, 2));
  lines.push("  </md:FullModel>");
  lines.push("");
  for (const bv of pkg.baseVoltages) {
    lines.push(openWithId("cim:BaseVoltage", bv.rdfId, 1));
    lines.push(...identifiedObjectBody(bv, 2));
    lines.push(tag("cim:BaseVoltage.nominalVoltage", { text: numberText(bv.nominalVoltage) }, 2));
    lines.push(close("cim:BaseVoltage", 1));
  }
  for (const sub of pkg.substations) {
    lines.push(openWithId("cim:Substation", sub.rdfId, 1));
    lines.push(...identifiedObjectBody(sub, 2));
    if (sub.regionId) {
      lines.push(refTag("cim:Substation.Region", sub.regionId, 2));
    }
    lines.push(close("cim:Substation", 1));
  }
  for (const vl of pkg.voltageLevels) {
    lines.push(...serializeVoltageLevel(vl));
  }
  for (const bus of pkg.busbarSections) {
    lines.push(openWithId("cim:BusbarSection", bus.rdfId, 1));
    lines.push(...identifiedObjectBody(bus, 2));
    if (bus.voltageLevelId) {
      pushRef(lines, "cim:Equipment.EquipmentContainer", bus.voltageLevelId, 2);
    }
    lines.push(close("cim:BusbarSection", 1));
  }
  for (const line of pkg.acLineSegments) {
    lines.push(...serializeACLineSegment(line));
  }
  for (const pt of pkg.powerTransformers) {
    lines.push(openWithId("cim:PowerTransformer", pt.rdfId, 1));
    lines.push(...identifiedObjectBody(pt, 2));
    if (pt.substationId) {
      pushRef(lines, "cim:Equipment.EquipmentContainer", pt.substationId, 2);
    }
    if (pt.vectorGroup) {
      lines.push(tag("cim:PowerTransformer.vectorGroup", { text: escapeXmlText(pt.vectorGroup) }, 2));
    }
    lines.push(close("cim:PowerTransformer", 1));
  }
  for (const end of pkg.transformerEnds) {
    lines.push(openWithId("cim:PowerTransformerEnd", end.rdfId, 1));
    lines.push(...identifiedObjectBody(end, 2));
    pushRef(lines, "cim:PowerTransformerEnd.PowerTransformer", end.transformerId, 2);
    pushRef(lines, "cim:PowerTransformerEnd.BaseVoltage", end.baseVoltageId, 2);
    lines.push(tag("cim:PowerTransformerEnd.ratedU", { text: numberText(end.ratedU) }, 2));
    if (end.ratedS !== undefined) {
      lines.push(tag("cim:PowerTransformerEnd.ratedS", { text: numberText(end.ratedS) }, 2));
    }
    lines.push(tag("cim:PowerTransformerEnd.r", { text: numberText(end.r) }, 2));
    lines.push(tag("cim:PowerTransformerEnd.x", { text: numberText(end.x) }, 2));
    lines.push(tag("cim:PowerTransformerEnd.endNumber", { text: String(end.endNumber) }, 2));
    lines.push(close("cim:PowerTransformerEnd", 1));
  }
  for (const src of pkg.energySources) {
    lines.push(openWithId("cim:EnergySource", src.rdfId, 1));
    lines.push(...identifiedObjectBody(src, 2));
    pushRef(lines, "cim:ConductingEquipment.BaseVoltage", src.baseVoltageId, 2);
    if (src.activePower !== undefined) lines.push(tag("cim:EnergySource.activePower", { text: numberText(src.activePower) }, 2));
    if (src.reactivePower !== undefined) lines.push(tag("cim:EnergySource.reactivePower", { text: numberText(src.reactivePower) }, 2));
    lines.push(close("cim:EnergySource", 1));
  }
  for (const load of pkg.energyConsumers) {
    lines.push(openWithId("cim:EnergyConsumer", load.rdfId, 1));
    lines.push(...identifiedObjectBody(load, 2));
    pushRef(lines, "cim:ConductingEquipment.BaseVoltage", load.baseVoltageId, 2);
    if (load.activePower !== undefined) lines.push(tag("cim:EnergyConsumer.p", { text: numberText(load.activePower) }, 2));
    if (load.reactivePower !== undefined) lines.push(tag("cim:EnergyConsumer.q", { text: numberText(load.reactivePower) }, 2));
    lines.push(close("cim:EnergyConsumer", 1));
  }
  for (const gen of pkg.generatingUnits) {
    lines.push(openWithId(`cim:${gen.cimClass}`, gen.rdfId, 1));
    lines.push(...identifiedObjectBody(gen, 2));
    pushRef(lines, "cim:ConductingEquipment.BaseVoltage", gen.baseVoltageId, 2);
    if (gen.ratedGrossMaxP !== undefined) lines.push(tag("cim:GeneratingUnit.ratedGrossMaxP", { text: numberText(gen.ratedGrossMaxP) }, 2));
    if (gen.ratedGrossMinP !== undefined) lines.push(tag("cim:GeneratingUnit.ratedGrossMinP", { text: numberText(gen.ratedGrossMinP) }, 2));
    lines.push(close(`cim:${gen.cimClass}`, 1));
  }
  for (const sw of pkg.switches) {
    lines.push(openWithId(`cim:${sw.cimClass}`, sw.rdfId, 1));
    lines.push(...identifiedObjectBody(sw, 2));
    lines.push(tag("cim:Switch.normalOpen", { text: sw.normalOpen ? "true" : "false" }, 2));
    lines.push(close(`cim:${sw.cimClass}`, 1));
  }
  for (const comp of pkg.shuntCompensators) {
    lines.push(openWithId(`cim:${comp.cimClass}`, comp.rdfId, 1));
    lines.push(...identifiedObjectBody(comp, 2));
    if (comp.bPerSection !== undefined) lines.push(tag("cim:ShuntCompensator.bPerSection", { text: numberText(comp.bPerSection) }, 2));
    if (comp.gPerSection !== undefined) lines.push(tag("cim:ShuntCompensator.gPerSection", { text: numberText(comp.gPerSection) }, 2));
    lines.push(tag("cim:ShuntCompensator.sections", { text: String(comp.sections) }, 2));
    lines.push(close(`cim:${comp.cimClass}`, 1));
  }
  for (const cn of pkg.connectivityNodes) {
    lines.push(openWithId("cim:ConnectivityNode", cn.rdfId, 1));
    lines.push(...identifiedObjectBody(cn, 2));
    pushRef(lines, "cim:ConnectivityNode.ConnectivityNodeContainer", cn.containerId, 2);
    lines.push(close("cim:ConnectivityNode", 1));
  }
  for (const term of pkg.terminals) {
    lines.push(openWithId("cim:Terminal", term.rdfId, 1));
    lines.push(...identifiedObjectBody(term, 2));
    pushRef(lines, "cim:Terminal.ConductingEquipment", term.conductingEquipmentId, 2);
    pushRef(lines, "cim:Terminal.ConnectivityNode", term.connectivityNodeId, 2);
    lines.push(tag("cim:Terminal.sequenceNumber", { text: String(term.sequenceNumber) }, 2));
    lines.push(close("cim:Terminal", 1));
  }
  for (const m of pkg.measurements) {
    const root = m.measurementType === "Analog" ? "cim:Analog" : m.measurementType === "Discrete" ? "cim:Discrete" : "cim:StringMeasurement";
    lines.push(openWithId(root, m.rdfId, 1));
    lines.push(...identifiedObjectBody(m, 2));
    if (m.unit) lines.push(tag("cim:Analog.unit", { text: escapeXmlText(m.unit) }, 2));
    if (m.measurementClass) lines.push(tag("cim:Measurement.measurementClass", { text: escapeXmlText(m.measurementClass) }, 2));
    pushRef(lines, "cim:Measurement.PowerSystemResource", m.powerSystemResourceId, 2);
    if (m.terminalId) pushRef(lines, "cim:Measurement.Terminal", m.terminalId, 2);
    lines.push(close(root, 1));
  }
  lines.push("</rdf:RDF>");
  return lines.join("\n");
}
