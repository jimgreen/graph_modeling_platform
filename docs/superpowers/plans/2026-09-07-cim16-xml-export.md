# CIM/XML (IEC 61970 CIM16) 导出 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为平台新增 CIM16 单文件整合导出，覆盖 AC/DC 电力设备、拓扑端子连接与量测，输出可被主流电力分析软件读取的 CIM/XML。

**Architecture:** 三层纯函数管线：`model state → CimPackage (IR) → XML string`。`src/cim/` 新建独立目录（cim-types / cim-namespaces / cim-serializer / cim-builder / cim-export），不修改 `model.ts` 核心类型。入口按现有 `createExportEFile` 工厂模式装配进 `__appScope`，顶栏导出菜单加一项。

**Tech Stack:** TypeScript, Vitest, React 19, antd（提示消息）, 复用 `fileIO.ts` 的 `saveLazyTextFile`。

**Spec:** `docs/superpowers/specs/2026-09-06-cim16-xml-export-design.md`

## Global Constraints

- 命名空间：`cim:` = `http://iec.ch/TC57/2013/CIM-schema-cim16#`；`md:` = `http://iec.ch/TC57/61970-552/ModelDescription/1#`；`rdf:` 标准 RDF 命名空间
- 版本目标：CIM16（老 RDFS 风格，`cim:IdentifiedObject.name` 嵌套写法），不用 CIM100 新风格
- 测试与源文件同目录（项目约定）：`src/cim/*.test.ts`
- ES Modules；类型集中在 `src/cim/cim-types.ts`
- 参数读取一律走 `deviceParamValue(params, key)`（`src/model.ts`，snake/camel 宽容匹配），禁止直接 `params.r` 式裸读
- 断开自定义设备 `custom-device`、氢能/热力设备：跳过导出（不报错）
- XML 文本节点只转义 `&` `<` `>`；浮点 6 位有效数字（`Number(x.toPrecision(6))`，输出用 `String(...)` 自然表示）
- 提交信息跟随仓库风格（中文 message，`feat(cim): ...` 前缀）

---

## 平台 API 事实清单（探查结论，任务直接引用）

| 事实 | 值/位置 |
|------|---------|
| `ModelNode` | `src/model.ts`：`{ id, kind, name, layerId?, nodeNumber, acTopologyNode: number, dcTopologyNode: number, position, size, rotation, scale, scaleX?, scaleY?, terminals: Terminal[], params: Record<string,string> }` |
| `Terminal` | `{ id, label, type: "ac"\|"dc"\|"h2"\|"heat", anchor, nodeNumber, vbase?: string }` |
| `Edge` | `{ id, sourceId, targetId, sourceTerminalId?, targetTerminalId?, sourcePoint?, targetPoint?, manualPoints?, routePoints? }` |
| `Topology` | `src/model.ts:2015`：`{ nodes: Record<string,{id,degree,neighbors,edgeIds}>, connectedComponents: string[][] }`（`__appScope.topology`，由 runTopologyCalculation 产生） |
| `deviceParamValue` | `src/model.ts` 导出：`(params: Record<string,string>, key: string) => string \| undefined` |
| `downloadText/saveLazyTextFile` | `src/fileIO.ts` 导出；`saveLazyTextFile` 在 `__appScope` 亦有挂载 |
| 导出工厂模式 | `src/appExtracted/appDeviceDefinitionFactories.tsx:2836` `createExportEFile(__appScope)`；App.tsx 大 import 装配 |
| 导出菜单 | `src/appExtracted/appTopbar.tsx:196-202`：`topbar-dropdown-menu`，菜单项 `{ key, label, icon, action, validatesEInterface }`，action 从 `scope` 解构 |
| 电压参数 key | `i_vbase`/`j_vbase`/`k_vbase` + 别名 `high_vbase`/`medium_vbase`/`low_vbase`/`source_vbase`/`target_vbase`（`src/model-eexport.ts:1474-1485` 用法参照） |

---

### Task 1: 参数 key 侦察 + 目录骨架 + 类型与命名空间

**Files:**
- Create: `src/cim/cim-types.ts`
- Create: `src/cim/cim-namespaces.ts`
- Test: `src/cim/cim-namespaces.test.ts`

**Interfaces:**
- Consumes: 平台 API 事实清单（上表）
- Produces: `CIM_NS` 常量对象（`cim` / `md` / `rdf` 三个命名空间 URL）；`CimIdentifiedObject`, `CimBaseVoltage`, `CimSubstation`, `CimVoltageLevel`, `CimConnectivityNode`, `CimTerminal`, `CimACLineSegment`, `CimBusbarSection`, `CimPowerTransformer`, `CimPowerTransformerEnd`, `CimEnergySource`, `CimEnergyConsumer`, `CimGeneratingUnit`, `CimSwitch`, `CimShuntCompensator`, `CimMeasurement`, `CimFullModel`, `CimPackage` 全部接口（签名同 spec §4）

- [ ] **Step 1: 侦察阻抗/容量参数 key**

Run（PowerShell）:
```powershell
Select-String -Path D:\work\graph_modeling_platform\src\appExtracted\appDeviceDefinitionFactories.tsx -Pattern 'deviceParamValue\(node\.params, "(r|x|b|p|q|sn|uk|pk)' | Select-Object -First 20
Select-String -Path D:\work\graph_modeling_platform\src\model-eexport.ts -Pattern 'deviceParamValue\(.*"(r|x|bch|p|q|sn|uk|pk)' | Select-Object -First 20
```
预期：找到 ac-line 阻抗（r/x/b）、发电机/负荷功率（p/q）、变压器容量短路参数（sn/uk/pk）的真实 key 名。若存在特定 key（如 `r1`/`x1`），记录到本任务 Step 5 的 `CIM_PARAM_ALIASES` 表；若无结果，用宽容匹配兜底（`deviceParamValue(params, "r")` 已自动尝试 `r`/`R`/snake/camel 变体）。

- [ ] **Step 2: 写命名空间测试**

`src/cim/cim-namespaces.test.ts`:
```typescript
import { describe, expect, it } from "vitest";
import { CIM_NS } from "./cim-namespaces";

describe("CIM_NS", () => {
  it("CIM16 RDFS 命名空间", () => {
    expect(CIM_NS.cim).toBe("http://iec.ch/TC57/2013/CIM-schema-cim16#");
    expect(CIM_NS.md).toBe("http://iec.ch/TC57/61970-552/ModelDescription/1#");
    expect(CIM_NS.rdf).toBe("http://www.w3.org/1999/02/22-rdf-syntax-ns#");
  });
});
```

- [ ] **Step 3: 实现 cim-namespaces.ts**

```typescript
// CIM RDF 命名空间常量（IEC 61970-552 / CIM16）
export const CIM_NS = {
  rdf: "http://www.w3.org/1999/02/22-rdf-syntax-ns#",
  cim: "http://iec.ch/TC57/2013/CIM-schema-cim16#",
  md: "http://iec.ch/TC57/61970-552/ModelDescription/1#"
} as const;
```

- [ ] **Step 4: 运行测试验证通过**

Run: `pnpm vitest run src/cim/cim-namespaces.test.ts`
Expected: PASS (1 test)

- [ ] **Step 5: 实现 cim-types.ts（IR 全类型）**

```typescript
// CIM16 IR 类型定义（与 model.ts 解耦，仅描述导出中间形态）

/** 公共基础字段（CIM IdentifiedObject 子集） */
export interface CimIdentifiedObject {
  rdfId: string;
  name: string;
  description?: string;
  mRID?: string;
}

export interface CimFullModel {
  rdfAbout: string;
  created: string;
  description: string;
  version: number;
  profile: string;
}

export interface CimBaseVoltage extends CimIdentifiedObject {
  nominalVoltage: number; // kV
}

export interface CimSubstation extends CimIdentifiedObject {
  regionId?: string;
}

export interface CimVoltageLevel extends CimIdentifiedObject {
  substationId: string;
  baseVoltageId: string;
  lowCapacitance?: number;
  highCapacitance?: number;
}

export interface CimConnectivityNode extends CimIdentifiedObject {
  containerId: string;
  containerType: "VoltageLevel" | "Bay";
}

export interface CimTerminal extends CimIdentifiedObject {
  conductingEquipmentId: string;
  connectivityNodeId: string;
  sequenceNumber: number;
}

export interface CimACLineSegment extends CimIdentifiedObject {
  r: number;
  x: number;
  bch: number;
  length?: number;
  baseVoltageId: string;
}

export interface CimBusbarSection extends CimIdentifiedObject {
  voltageLevelId: string;
}

export interface CimPowerTransformer extends CimIdentifiedObject {
  substationId?: string;
  vectorGroup?: string;
}

export interface CimPowerTransformerEnd extends CimIdentifiedObject {
  transformerId: string;
  baseVoltageId: string;
  ratedU: number;
  ratedS?: number;
  r: number;
  x: number;
  endNumber: number;
  connectionKind?: "Y" | "D" | "Z" | "Yn";
}

export interface CimEnergySource extends CimIdentifiedObject {
  voltageLevelId?: string;
  baseVoltageId: string;
  activePower?: number;
  reactivePower?: number;
}

export interface CimEnergyConsumer extends CimIdentifiedObject {
  voltageLevelId?: string;
  baseVoltageId: string;
  activePower?: number;
  reactivePower?: number;
}

export interface CimGeneratingUnit extends CimIdentifiedObject {
  cimClass: "WindGeneratingUnit" | "SolarGeneratingUnit" | "ThermalGeneratingUnit" | "HydroGeneratingUnit";
  voltageLevelId?: string;
  baseVoltageId: string;
  ratedGrossMaxP?: number;
  ratedGrossMinP?: number;
}

export interface CimSwitch extends CimIdentifiedObject {
  cimClass: "Breaker" | "Disconnector" | "LoadBreakSwitch";
  voltageLevelId?: string;
  normalOpen: boolean;
}

export interface CimShuntCompensator extends CimIdentifiedObject {
  cimClass: "LinearShuntCompensator" | "SeriesCompensator";
  voltageLevelId?: string;
  bPerSection?: number;
  gPerSection?: number;
  sections: number;
}

export interface CimMeasurement extends CimIdentifiedObject {
  measurementType: "Analog" | "Discrete" | "StringMeasurement";
  unit?: string;
  phases?: string;
  terminalId?: string;
  powerSystemResourceId: string;
  measurementClass?: string;
}

export interface CimPackage {
  fullModel: CimFullModel;
  substations: CimSubstation[];
  voltageLevels: CimVoltageLevel[];
  baseVoltages: CimBaseVoltage[];
  busbarSections: CimBusbarSection[];
  acLineSegments: CimACLineSegment[];
  powerTransformers: CimPowerTransformer[];
  transformerEnds: CimPowerTransformerEnd[];
  energySources: CimEnergySource[];
  energyConsumers: CimEnergyConsumer[];
  generatingUnits: CimGeneratingUnit[];
  switches: CimSwitch[];
  shuntCompensators: CimShuntCompensator[];
  connectivityNodes: CimConnectivityNode[];
  terminals: CimTerminal[];
  measurements: CimMeasurement[];
}
```

- [ ] **Step 6: 类型检查 + 提交**

Run: `pnpm tsc --noEmit`
Expected: 无新增错误

```bash
git add src/cim/
git commit -m "feat(cim): 建立 cim 目录骨架，定义 IR 类型与命名空间常量"
```

---

### Task 2: CIM/XML 序列化器（IR → XML）

**Files:**
- Create: `src/cim/cim-serializer.ts`
- Test: `src/cim/cim-serializer.test.ts`

**Interfaces:**
- Consumes: `CIM_NS`（Task 1）、全部 IR 类型（Task 1）
- Produces: `serializeCimPackage(pkg: CimPackage): string` —— 后续任务与 UI 均消费；内部导出 `escapeXmlText(text: string): string`、`tag(name: string, body: { text?: string; resource?: string }, indent: number): string` 供测试

- [ ] **Step 1: 写失败测试**

`src/cim/cim-serializer.test.ts`:
```typescript
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
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `pnpm vitest run src/cim/cim-serializer.test.ts`
Expected: FAIL — `Cannot find module './cim-serializer'`

- [ ] **Step 3: 实现序列化器**

`src/cim/cim-serializer.ts`:
```typescript
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
  lines.push(refTag("cim:VoltageLevel.Substation", vl.substationId, 2));
  lines.push(refTag("cim:VoltageLevel.BaseVoltage", vl.baseVoltageId, 2));
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
  lines.push(refTag("cim:ConductingEquipment.BaseVoltage", line.baseVoltageId, 2));
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
    lines.push(refTag("cim:Equipment.EnergyIdentifiers", bus.voltageLevelId, 2));
    lines.push(close("cim:BusbarSection", 1));
  }
  for (const line of pkg.acLineSegments) {
    lines.push(...serializeACLineSegment(line));
  }
  for (const pt of pkg.powerTransformers) {
    lines.push(openWithId("cim:PowerTransformer", pt.rdfId, 1));
    lines.push(...identifiedObjectBody(pt, 2));
    if (pt.substationId) {
      lines.push(refTag("cim:Equipment.EnergyIdentifiers", pt.substationId, 2));
    }
    if (pt.vectorGroup) {
      lines.push(tag("cim:PowerTransformer.vectorGroup", { text: escapeXmlText(pt.vectorGroup) }, 2));
    }
    lines.push(close("cim:PowerTransformer", 1));
  }
  for (const end of pkg.transformerEnds) {
    lines.push(openWithId("cim:PowerTransformerEnd", end.rdfId, 1));
    lines.push(...identifiedObjectBody(end, 2));
    lines.push(refTag("cim:PowerTransformerEnd.PowerTransformer", end.transformerId, 2));
    lines.push(refTag("cim:PowerTransformerEnd.BaseVoltage", end.baseVoltageId, 2));
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
    lines.push(refTag("cim:ConductingEquipment.BaseVoltage", src.baseVoltageId, 2));
    if (src.activePower !== undefined) lines.push(tag("cim:EnergySource.activePower", { text: numberText(src.activePower) }, 2));
    if (src.reactivePower !== undefined) lines.push(tag("cim:EnergySource.reactivePower", { text: numberText(src.reactivePower) }, 2));
    lines.push(close("cim:EnergySource", 1));
  }
  for (const load of pkg.energyConsumers) {
    lines.push(openWithId("cim:EnergyConsumer", load.rdfId, 1));
    lines.push(...identifiedObjectBody(load, 2));
    lines.push(refTag("cim:ConductingEquipment.BaseVoltage", load.baseVoltageId, 2));
    if (load.activePower !== undefined) lines.push(tag("cim:EnergyConsumer.activePower", { text: numberText(load.activePower) }, 2));
    if (load.reactivePower !== undefined) lines.push(tag("cim:EnergyConsumer.reactivePower", { text: numberText(load.reactivePower) }, 2));
    lines.push(close("cim:EnergyConsumer", 1));
  }
  for (const gen of pkg.generatingUnits) {
    lines.push(openWithId(`cim:${gen.cimClass}`, gen.rdfId, 1));
    lines.push(...identifiedObjectBody(gen, 2));
    lines.push(refTag("cim:ConductingEquipment.BaseVoltage", gen.baseVoltageId, 2));
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
    lines.push(refTag("cim:ConnectivityNode.ConnectivityNodeContainer", cn.containerId, 2));
    lines.push(close("cim:ConnectivityNode", 1));
  }
  for (const term of pkg.terminals) {
    lines.push(openWithId("cim:Terminal", term.rdfId, 1));
    lines.push(...identifiedObjectBody(term, 2));
    lines.push(refTag("cim:Terminal.ConductingEquipment", term.conductingEquipmentId, 2));
    lines.push(refTag("cim:Terminal.ConnectivityNode", term.connectivityNodeId, 2));
    lines.push(tag("cim:Terminal.sequenceNumber", { text: String(term.sequenceNumber) }, 2));
    lines.push(close("cim:Terminal", 1));
  }
  for (const m of pkg.measurements) {
    const root = m.measurementType === "Analog" ? "cim:Analog" : m.measurementType === "Discrete" ? "cim:Discrete" : "cim:StringMeasurement";
    lines.push(openWithId(root, m.rdfId, 1));
    lines.push(...identifiedObjectBody(m, 2));
    if (m.unit) lines.push(tag("cim:Analog.unit", { text: escapeXmlText(m.unit) }, 2));
    if (m.measurementClass) lines.push(tag("cim:Measurement.measurementClass", { text: escapeXmlText(m.measurementClass) }, 2));
    lines.push(refTag("cim:Measurement.PowerSystemResource", m.powerSystemResourceId, 2));
    if (m.terminalId) lines.push(refTag("cim:Measurement.Terminal", m.terminalId, 2));
    lines.push(close(root, 1));
  }
  lines.push("</rdf:RDF>");
  return lines.join("\n");
}
```

> 注：`CimSwitch`/`CimShuntCompensator` 用 `cimClass` 字段决定 XML 根元素名；DC 设备（`dc-*`）在 CIM16 RDF 无独立类时退化到其 AC 对应类或跳过，决策函数位于 Task 7 的 `cimClassForKind`。

- [ ] **Step 4: 运行测试验证通过**

Run: `pnpm vitest run src/cim/cim-serializer.test.ts`
Expected: PASS (7 tests)

- [ ] **Step 5: 提交**

```bash
git add src/cim/cim-serializer.ts src/cim/cim-serializer.test.ts
git commit -m "feat(cim): 实现 CIM/XML 序列化器（IR → RDF/XML）"
```

---

### Task 3: Builder 阶段 1-2 —— BaseVoltage 提取 + 容器层次

**Files:**
- Create: `src/cim/cim-builder.ts`
- Test: `src/cim/cim-builder.test.ts`

**Interfaces:**
- Consumes: `deviceParamValue`（`src/model.ts`）、IR 类型
- Produces: `buildCimPackage(input: CimBuildInput): CimPackage`（本任务先实现阶段 1-2 + 空容器，阶段 3-5 后续任务填充）；`extractBaseVoltages(nodes: readonly ModelNode[]): CimBaseVoltage[]`；`voltageBaseMap(nodes): Map<number, string>`（电压值 → rdfId）

- [ ] **Step 1: 写失败测试**

`src/cim/cim-builder.test.ts`:
```typescript
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
```

- [ ] **Step 2: 运行测试确认失败**

Run: `pnpm vitest run src/cim/cim-builder.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: 实现阶段 1-2**

`src/cim/cim-builder.ts`:
```typescript
// model state → CimPackage IR 构建器（纯函数，五阶段）

import { deviceParamValue } from "../model";
import type { Edge, ModelNode } from "../model";
import { CIM_NS } from "./cim-namespaces";
import type { CimBaseVoltage, CimPackage, CimSubstation, CimVoltageLevel } from "./cim-types";

export type CimBuildInput = {
  nodes: readonly ModelNode[];
  edges: readonly Edge[];
  projectName: string;
  modelId: string;
};

const VOLTAGE_PARAM_KEYS = ["i_vbase", "j_vbase", "k_vbase", "high_vbase", "medium_vbase", "low_vbase", "source_vbase", "target_vbase"] as const;

/** 节点电压值收集：terminals[].vbase + params 电压 keys；非法值（0/非数字/空）忽略 */
function nodeVoltageValues(node: ModelNode): number[] {
  const found: number[] = [];
  for (const terminal of node.terminals) {
    const raw = String(terminal.vbase ?? "").trim();
    const value = Number(raw);
    if (raw && Number.isFinite(value) && value > 0) {
      found.push(value);
    }
  }
  for (const key of VOLTAGE_PARAM_KEYS) {
    const raw = String(deviceParamValue(node.params, key) ?? "").trim();
    const value = Number(raw);
    if (raw && Number.isFinite(value) && value > 0) {
      found.push(value);
    }
  }
  return found;
}

/** 阶段 1：去重排序提取 BaseVoltage */
export function extractBaseVoltages(nodes: readonly ModelNode[]): CimBaseVoltage[] {
  const values = new Set<number>();
  for (const node of nodes) {
    for (const value of nodeVoltageValues(node)) {
      values.add(value);
    }
  }
  return [...values].sort((a, b) => a - b).map((value) => ({
    rdfId: `BV_${value}`,
    name: `${value}kV`,
    nominalVoltage: value
  }));
}

/** 电压值 → rdfId 映射（阶段 1 副产品，阶段 2-4 复用） */
export function voltageBaseMap(nodes: readonly ModelNode[]): Map<number, string> {
  const map = new Map<number, string>();
  for (const bv of extractBaseVoltages(nodes)) {
    map.set(bv.nominalVoltage, bv.rdfId);
  }
  return map;
}

/** 节点主电压（阶段 2 分组用）：取该节点第一个有效电压值 */
function nodePrimaryVoltage(node: ModelNode): number {
  return nodeVoltageValues(node)[0] ?? 0;
}

/** 阶段 2：当前模型 → 一个 Substation；按主电压分组 → VoltageLevel */
function buildContainers(input: CimBuildInput, vbaseById: Map<number, string>) {
  const substation: CimSubstation = { rdfId: `SUB_${input.modelId}`, name: input.projectName || "未命名" };
  const byVoltage = new Map<number, ModelNode[]>();
  for (const node of input.nodes) {
    const voltage = nodePrimaryVoltage(node);
    if (voltage <= 0) continue;
    const bucket = byVoltage.get(voltage);
    if (bucket) bucket.push(node);
    else byVoltage.set(voltage, [node]);
  }
  const voltageLevels: CimVoltageLevel[] = [...byVoltage.keys()].sort((a, b) => a - b).map((voltage) => ({
    rdfId: `VL_${voltage}`,
    name: `${voltage}kV母线`,
    substationId: substation.rdfId,
    baseVoltageId: vbaseById.get(voltage) ?? `BV_${voltage}`
  }));
  return { substations: [substation], voltageLevels };
}

/** 五阶段总入口。当前实现阶段 1-2；阶段 3-5 由后续任务填充对应数组。 */
export function buildCimPackage(input: CimBuildInput): CimPackage {
  const vbaseById = voltageBaseMap(input.nodes);
  const { substations, voltageLevels } = buildContainers(input, vbaseById);
  const now = new Date().toISOString();
  return {
    fullModel: {
      rdfAbout: `urn:uuid:${input.modelId}`,
      created: now,
      description: "导出自图形建模平台",
      version: 1,
      profile: `${CIM_NS.cim}EquipmentCore`
    },
    substations,
    voltageLevels,
    baseVoltages: extractBaseVoltages(input.nodes),
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
```

- [ ] **Step 4: 运行测试验证通过**

Run: `pnpm vitest run src/cim/cim-builder.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: 提交**

```bash
git add src/cim/cim-builder.ts src/cim/cim-builder.test.ts
git commit -m "feat(cim): builder 阶段1-2 提取基准电压与容器层次"
```

---

### Task 4: Builder 阶段 3 —— 拓扑推导（ConnectivityNode / Terminal）

**Files:**
- Modify: `src/cim/cim-builder.ts`（补阶段 3）
- Test: `src/cim/cim-builder.test.ts`（追加）

**Interfaces:**
- Consumes: Task 3 的 `buildCimPackage` / `extractBaseVoltages`
- Produces: `inferTopology(input: CimBuildInput): { connectivityNodes: CimConnectivityNode[]; terminals: CimTerminal[] }`（导出供测试）；`buildCimPackage` 输出填充 `connectivityNodes` / `terminals`

- [ ] **Step 1: 写失败测试（追加到 cim-builder.test.ts）**

```typescript
import { inferTopology } from "./cim-builder";

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
```

- [ ] **Step 2: 运行测试确认失败**

Run: `pnpm vitest run src/cim/cim-builder.test.ts`
Expected: FAIL — `inferTopology` not exported

- [ ] **Step 3: 实现阶段 3（Union-Find 端子归组）**

追加到 `src/cim/cim-builder.ts`:
```typescript
// ── 阶段 3：拓扑推导 ──
// 服务器组 key："nodeId::terminalId"（端子级），组内所有端子电气等位。

class TerminalUnionFind {
  private parent = new Map<string, string>();
  find(key: string): string {
    const parent = this.parent.get(key);
    if (parent === undefined) {
      this.parent.set(key, key);
      return key;
    }
    if (parent !== key) {
      const root = this.find(parent);
      this.parent.set(key, root);
    }
    return parent;
  }
  union(a: string, b: string): void {
    const ra = this.find(a);
    const rb = this.find(b);
    if (ra !== rb) {
      this.parent.set(rb, ra);
    }
  }
}

function isAcTerminal(terminal: ModelNode["terminals"][number]): boolean {
  return terminal.type === "ac";
}

function validTopologyNumber(value: number): boolean {
  return Number.isFinite(value) && value >= 0;
}

/** 阶段 3：端子并查 → ConnectivityNode；每组一个 CN，组内每端子一个 Terminal */
export function inferTopology(input: CimBuildInput): {
  connectivityNodes: CimConnectivityNode[];
  terminals: CimTerminal[];
} {
  const uf = new TerminalUnionFind();
  // a. 每 ac 端子自建组
  for (const node of input.nodes) {
    for (const terminal of node.terminals) {
      if (isAcTerminal(terminal)) {
        uf.find(`${node.id}::${terminal.id}`);
      }
    }
  }
  // b. 显式边合并
  for (const edge of input.edges) {
    if (edge.sourceTerminalId && edge.targetTerminalId) {
      uf.union(`${edge.sourceId}::${edge.sourceTerminalId}`, `${edge.targetId}::${edge.targetTerminalId}`);
    }
  }
  // c. 同 acTopologyNode 节点的全部 ac 端子隐式合并（覆盖 contact/overlap 等隐式连通）
  const terminalsByTopologyKey = new Map<number, string[]>();
  for (const node of input.nodes) {
    if (!validTopologyNumber(node.acTopologyNode)) continue;
    const keys = node.terminals
      .filter((t) => isAcTerminal(t))
      .map((t) => `${node.id}::${t.id}`);
    if (keys.length === 0) continue;
    const bucket = terminalsByTopologyKey.get(node.acTopologyNode);
    if (bucket) bucket.push(...keys);
    else terminalsByTopologyKey.set(node.acTopologyNode, keys);
  }
  for (const bucket of terminalsByTopologyKey.values()) {
    if (bucket.length < 2) continue;
    for (let index = 1; index < bucket.length; index += 1) {
      uf.union(bucket[0], bucket[index]);
    }
  }
  // d. 分组输出
  const groupKeys = new Map<string, string[]>(); // root → terminal keys
  for (const node of input.nodes) {
    for (const terminal of node.terminals) {
      if (!isAcTerminal(terminal)) continue;
      const key = `${node.id}::${terminal.id}`;
      const root = uf.find(key);
      const bucket = groupKeys.get(root);
      if (bucket) bucket.push(key);
      else groupKeys.set(root, [key]);
    }
  }
  const nodesById = new Map(input.nodes.map((n) => [n.id, n]));
  const connectivityNodes: CimConnectivityNode[] = [];
  const terminals: CimTerminal[] = [];
  const sequenceByEquipment = new Map<string, number>();
  let cnIndex = 0;
  let termIndex = 0;
  for (const keys of groupKeys.values()) {
    cnIndex += 1;
    const cnId = `CN_${cnIndex}`;
    connectivityNodes.push({
      rdfId: cnId,
      name: `节点${cnIndex}`,
      containerId: "VL_UNKNOWN", // 归属电压等级由 Task 7 回填
      containerType: "VoltageLevel"
    });
    for (const key of keys) {
      const [nodeId, terminalId] = key.split("::");
      termIndex += 1;
      const equipmentId = `N_${nodeId}`; // 与 Task 5 设备 rdfId 规则一致
      const seq = (sequenceByEquipment.get(equipmentId) ?? 0) + 1;
      sequenceByEquipment.set(equipmentId, seq);
      terminals.push({
        rdfId: `T_${termIndex}`,
        name: `${nodesById.get(nodeId)?.name ?? nodeId} 端子${terminalId}`,
        conductingEquipmentId: equipmentId,
        connectivityNodeId: cnId,
        sequenceNumber: seq // 设备内端子序号（CIM 语义）
      });
    }
  }
  return { connectivityNodes, terminals };
}
```

- [ ] **Step 4: 运行测试验证通过**

Run: `pnpm vitest run src/cim/cim-builder.test.ts`
Expected: PASS（新增 4 tests + 原 3 tests）

- [ ] **Step 5: 提交**

```bash
git add src/cim/cim-builder.ts src/cim/cim-builder.test.ts
git commit -m "feat(cim): builder 阶段3 拓扑推导（端子并查 + acTopologyNode 隐式合并）"
```

---

### Task 5: Builder 阶段 4a —— AC 核心设备映射（line/bus/transformer/load/source）

**Files:**
- Modify: `src/cim/cim-builder.ts`（补阶段 4a + `cimClassForKind` 决策函数）
- Test: `src/cim/cim-builder.test.ts`（追加）

**Interfaces:**
- Consumes: Task 3/4 产物；`deviceParamValue`
- Produces: `cimClassForKind(kind: DeviceKind): CimClassDecision`（导出供 Task 6/7 复用）；`buildDeviceObjects(input): {busbarSections, acLineSegments, powerTransformers, transformerEnds, energySources, energyConsumers, generatingUnits, switches, shuntCompensators}`；`buildCimPackage` 填充之

- [ ] **Step 1: 写失败测试**

```typescript
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
      nodes: [makeNode({ id: "bus1", kind: "ac-bus", params: { i_vbase: "110" } })],
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
```

- [ ] **Step 2: 运行测试确认失败**

Run: `pnpm vitest run src/cim/cim-builder.test.ts`
Expected: FAIL — `cimClassForKind` not exported

- [ ] **Step 3: 实现阶段 4a**

追加到 `src/cim/cim-builder.ts`:
```typescript
import type { DeviceKind } from "../model";

export type CimClassDecision = {
  className: string;
  skip?: boolean;
};

/** DeviceKind → CIM 类决策（单一真源，Task 6/7 复用） */
export function cimClassForKind(kind: DeviceKind): CimClassDecision {
  switch (kind) {
    case "ac-line": case "ac-routable-line":
    case "ac-zero-branch": case "ac-zero-routable-branch":
      return { className: "ACLineSegment" };
    case "ac-bus":
      return { className: "BusbarSection" };
    case "ac-transformer": case "ac-two-winding-transformer":
    case "ac-three-winding-transformer": case "ac-three-winding-transformer-neutral":
      return { className: "PowerTransformer" };
    case "ac-load": case "ac-station-load": case "ac-feeder-load":
    case "ac-district-load": case "ac-terminal-transformer-load":
      return { className: "EnergyConsumer" };
    case "ac-source": case "ac-station-source": case "ac-feeder-source":
    case "ac-district-source":
      return { className: "EnergySource" };
    case "ac-wind-source": case "ac-pv-source": case "ac-thermal-source":
    case "ac-diesel-source": case "ac-hydro-source": case "ac-nuclear-source":
    case "ac-storage":
      return { className: "GeneratingUnit" };
    case "ac-breaker": case "ac-box-breaker":
      return { className: "Breaker" };
    case "ac-switch": case "ac-disconnector": case "ac-ground-disconnector":
    case "ac-ground-disconnector-vertical":
      return { className: "Disconnector" };
    case "ac-capacitor": case "ac-reactor":
      return { className: "LinearShuntCompensator" };
    case "ac-series-capacitor": case "ac-series-reactor":
      return { className: "SeriesCompensator" };
    default:
      return { className: "", skip: true };
  }
}

const GENERATING_UNIT_CLASS_BY_KIND: Record<string, CimGeneratingUnit["cimClass"]> = {
  "ac-wind-source": "WindGeneratingUnit",
  "ac-pv-source": "SolarGeneratingUnit",
  "ac-thermal-source": "ThermalGeneratingUnit",
  "ac-diesel-source": "ThermalGeneratingUnit",
  "ac-nuclear-source": "ThermalGeneratingUnit",
  "ac-hydro-source": "HydroGeneratingUnit",
  "ac-storage": "ThermalGeneratingUnit" // 储能退化为机组占位；细化留待 Task 8 侦察储能参数
};

function numericParam(params: Record<string, string>, keys: string[]): number | undefined {
  for (const key of keys) {
    const raw = String(deviceParamValue(params, key) ?? "").trim();
    if (!raw) continue;
    const value = Number(raw);
    if (Number.isFinite(value)) return value;
  }
  return undefined;
}

/** 阶段 4a：单一节点 → IR 设备对象（追加到对应数组） */
function mapDeviceObjects(node: ModelNode, vbaseById: Map<number, string>, sink: CimPackage): void {
  const decision = cimClassForKind(node.kind);
  if (decision.skip) return;
  const nodeRdfId = `N_${node.id}`;
  const baseVoltageId = vbaseById.get(nodePrimaryVoltage(node)) ?? "BV_UNKNOWN";
  switch (decision.className) {
    case "BusbarSection": {
      sink.busbarSections.push({
        rdfId: nodeRdfId,
        name: node.name,
        voltageLevelId: voltageLevelIdForNode(node)
      });
      return;
    }
    case "ACLineSegment": {
      sink.acLineSegments.push({
        rdfId: nodeRdfId,
        name: node.name,
        r: numericParam(node.params, ["r", "r1", "resistance"]) ?? 0,
        x: numericParam(node.params, ["x", "x1", "reactance"]) ?? 0,
        bch: numericParam(node.params, ["b", "bch", "b1"]) ?? 0,
        baseVoltageId
      });
      return;
    }
    case "PowerTransformer": {
      sink.powerTransformers.push({
        rdfId: nodeRdfId,
        name: node.name,
        vectorGroup: String(deviceParamValue(node.params, "vector_group") ?? deviceParamValue(node.params, "vectorGroup") ?? "").trim() || undefined
      });
      const isThree = node.kind === "ac-three-winding-transformer" || node.kind === "ac-three-winding-transformer-neutral";
      const sideKeys: Array<[number, string]> = isThree
        ? [[0, "i_vbase"], [1, "k_vbase"], [2, "j_vbase"]]
        : [[0, "i_vbase"], [1, "j_vbase"]];
      const ratedS = numericParam(node.params, ["sn", "rated_s"]) ?? 0;
      sideKeys.forEach(([sideIndex, voltageKey], index) => {
        const ratedU = numericParam(node.params, [voltageKey]) ?? 0;
        const endId = `PTE_${node.id}_${index + 1}`;
        sink.transformerEnds.push({
          rdfId: endId,
          name: `${node.name}绕组${index + 1}`,
          transformerId: nodeRdfId,
          baseVoltageId: ratedU > 0 ? (vbaseById.get(ratedU) ?? `BV_${ratedU}`) : "BV_UNKNOWN",
          ratedU,
          ratedS: ratedS > 0 ? ratedS : undefined,
          r: 0, x: 0,
          endNumber: index + 1
        });
      });
      return;
    }
    case "EnergyConsumer": {
      sink.energyConsumers.push({
        rdfId: nodeRdfId,
        name: node.name,
        baseVoltageId,
        activePower: numericParam(node.params, ["p", "active_power"]),
        reactivePower: numericParam(node.params, ["q", "reactive_power"])
      });
      return;
    }
    case "EnergySource": {
      sink.energySources.push({
        rdfId: nodeRdfId,
        name: node.name,
        baseVoltageId,
        activePower: numericParam(node.params, ["p", "active_power"]),
        reactivePower: numericParam(node.params, ["q", "reactive_power"])
      });
      return;
    }
    case "GeneratingUnit": {
      sink.generatingUnits.push({
        rdfId: nodeRdfId,
        name: node.name,
        cimClass: GENERATING_UNIT_CLASS_BY_KIND[node.kind] ?? "ThermalGeneratingUnit",
        baseVoltageId,
        ratedGrossMaxP: numericParam(node.params, ["pn", "rated_capacity", "capacity"])
      });
      return;
    }
    default:
      return;
  }
}

/** 节点所属 VoltageLevel rdfId（按主电压线性索引；阶段 2 同序生成） */
function voltageLevelIdForNode(node: ModelNode): string {
  const voltage = nodePrimaryVoltage(node);
  if (voltage <= 0) return "VL_UNKNOWN";
  return `VL_${voltage}`;
}
```

> 说明：VL id 规则为 `VL_${voltage}`，与 Task 3 `buildContainers` 生成规则一致。

- [ ] **Step 4: 运行测试验证通过**

Run: `pnpm vitest run src/cim/cim-builder.test.ts`
Expected: PASS（原有 7 + 新增 9）

- [ ] **Step 5: 提交**

```bash
git add src/cim/cim-builder.ts src/cim/cim-builder.test.ts
git commit -m "feat(cim): builder 阶段4a AC核心设备映射（母线/线路/变压器/负荷/电源）"
```

---

### Task 6: Builder 阶段 4b —— 开关/补偿器/DC/新能源映射

**Files:**
- Modify: `src/cim/cim-builder.ts`（扩展 `cimClassForKind` + `mapDeviceObjects`）
- Test: `src/cim/cim-builder.test.ts`（追加）

**Interfaces:**
- Consumes: Task 5 的 `cimClassForKind` / `mapDeviceObjects`
- Produces: `switches` / `shuntCompensators` / `generatingUnits`（风电光伏等）数组填充

- [ ] **Step 1: 写失败测试**

```typescript
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
```

- [ ] **Step 2: 运行测试确认失败**

Run: `pnpm vitest run src/cim/cim-builder.test.ts`
Expected: FAIL — `switches` 断言失败（当前 schema 未含开关映射）

- [ ] **Step 3: 扩展映射**

`cimClassForKind` 补 DC 分支（暂不映射、跳过）与 `mapDeviceObjects` 补开关/补偿分支：

```typescript
// cimClassForKind 补：
    case "dc-line": case "dc-routable-line": case "dc-zero-branch":
    case "dc-bus": case "dc-breaker": case "dc-switch": case "dc-load":
    case "dc-source": case "dc-transformer": case "dcdc-converter":
    case "acdc-converter": case "dcac-converter": case "acac-converter":
    case "dc-storage":
      // CIM16 RDF 对 DC 类支持不全，退化跳过（保持兼容性，留待未来扩展）
      return { className: "", skip: true };
```

`mapDeviceObjects` 中在 `switch` 上补：
```typescript
    case "Breaker":
    case "Disconnector": {
      const closedRaw = String(deviceParamValue(node.params, "closed_status") ?? node.params.status ?? "1").trim();
      sink.switches.push({
        rdfId: nodeRdfId,
        name: node.name,
        cimClass: decision.className === "Breaker" ? "Breaker" : "Disconnector",
        normalOpen: closedRaw === "0" || closedRaw.toLowerCase() === "open"
      });
      return;
    }
    case "LinearShuntCompensator":
    case "SeriesCompensator": {
      sink.shuntCompensators.push({
        rdfId: nodeRdfId,
        name: node.name,
        cimClass: decision.className === "SeriesCompensator" ? "SeriesCompensator" : "LinearShuntCompensator",
        sections: 1
      });
      return;
    }
```

- [ ] **Step 4: 运行测试验证通过**

Run: `pnpm vitest run src/cim/cim-builder.test.ts`
Expected: PASS（新增 4）

- [ ] **Step 5: 提交**

```bash
git add src/cim/cim-builder.ts src/cim/cim-builder.test.ts
git commit -m "feat(cim): builder 阶段4b 开关/补偿器/新能源映射，DC 退化跳过"
```

---

### Task 7: Builder 阶段 5 —— 量测 + 边界收口

**Files:**
- Modify: `src/cim/cim-builder.ts`（阶段 5 + ConnectivityNode 容器回填）
- Test: `src/cim/cim-builder.test.ts`（追加）

**Interfaces:**
- Consumes: Task 4 拓扑输出、`MeasurementItemBinding`（通过输入扩展）
- Produces: `buildCimPackage` 输出补全 `measurements`；`CimBuildInput` 增可选 `measurementGroups?: readonly MeasurementGroup[]`

- [ ] **Step 1: 写失败测试**

```typescript
import type { MeasurementGroup } from "../measurements";

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
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `pnpm vitest run src/cim/cim-builder.test.ts`
Expected: FAIL — `measurementGroups` 未定义

- [ ] **Step 3: 实现阶段 5 + CN 容器回填**

```typescript
import type { MeasurementGroup } from "../measurements";
// CimBuildInput 增：
  measurementGroups?: readonly MeasurementGroup[];

// buildCimPackage 内、返回前追加：
  // 阶段 5：量测映射
  const nodesById = new Map(input.nodes.map((n) => [n.id, n])); // 就地新建（不依赖 inferTopology 内部同名变量）
  const measurements: CimMeasurement[] = [];
  let mIndex = 0;
  for (const group of input.measurementGroups ?? []) {
    const nodeExists = nodesById.has(group.nodeId);
    if (!nodeExists) continue;
    for (const item of group.items) {
      mIndex += 1;
      const analogType = String(item.measurementTypeId ?? "").toLowerCase().includes("analog")
        || item.decimalsOverride !== undefined
        || typeof item.defaultValue === "number";
      measurements.push({
        rdfId: `M_${mIndex}`,
        name: item.labelOverride ?? item.name ?? item.sourcePoint,
        measurementType: analogType ? "Analog" : "Discrete",
        unit: item.unitOverride,
        powerSystemResourceId: `N_${group.nodeId}`
      });
    }
  }
```

在 `buildCimPackage` 函数体内、返回前追加（把 `connectivityNodes` 的 `containerId` 从 `"VL_UNKNOWN"` 回填为真实 VL id，用 CN 内端子所属设备的主电压众数）：

```typescript
// CN 容器回填：端子设备主电压 → VL id
const terminalsByCn = new Map<string, string[]>();
for (const terminal of terminals) {
  const bucket = terminalsByCn.get(terminal.connectivityNodeId);
  if (bucket) bucket.push(terminal.conductingEquipmentId);
  else terminalsByCn.set(terminal.connectivityNodeId, [terminal.conductingEquipmentId]);
}
const voltageByNodeId = new Map<number, string>();
for (const node of input.nodes) {
  const primary = nodePrimaryVoltage(node);
  if (primary > 0) voltageByNodeId.set(primary, `VL_${primary}`);
}
for (const cn of connectivityNodes) {
  const equipmentIds = terminalsByCn.get(cn.rdfId) ?? [];
  const counts = new Map<string, number>();
  for (const equipmentId of equipmentIds) {
    const nodeId = equipmentId.startsWith("N_") ? equipmentId.slice(2) : equipmentId;
    const node = nodesById.get(nodeId);
    if (!node) continue;
    const primary = nodePrimaryVoltage(node);
    if (primary <= 0) continue;
    counts.set(`VL_${primary}`, (counts.get(`VL_${primary}`) ?? 0) + 1);
  }
  let best = "VL_UNKNOWN";
  let bestCount = -1;
  for (const [vlId, count] of counts) {
    if (count > bestCount) { best = vlId; bestCount = count; }
  }
  cn.containerId = best;
}
```

> 注：此段依赖 Task 4 的 `inferTopology` 返回与 `nodePrimaryVoltage` / `nodesById` 同函数作用域可用；实现时若 `nodesById` 定义在 `inferTopology` 内，此段同步把 `nodesById` 提到 `buildCimPackage` 作用域并传入。

- [ ] **Step 4: 运行测试验证通过**

Run: `pnpm vitest run src/cim/cim-builder.test.ts`
Expected: PASS（新增 2）

- [ ] **Step 5: 提交**

```bash
git add src/cim/cim-builder.ts src/cim/cim-builder.test.ts
git commit -m "feat(cim): builder 阶段5 量测映射与拓扑容器回填"
```

---

### Task 8: cim-export.ts 入口工厂 + App.tsx 装配

**Files:**
- Create: `src/cim/cim-export.ts`
- Modify: `src/App.tsx`（import + 装配，参照 createExportEFile 模式）
- Test: `src/cim/cim-export.test.ts`

**Interfaces:**
- Consumes: `buildCimPackage`、`serializeCimPackage`、`__appScope` 内 `safeFilePart` / `saveLazyTextFile` / `writeOperationLog` / `projectName`
- Produces: `createCimExport(__appScope): () => Promise<boolean>`；`buildCimXml(nodes, edges, projectName, modelId): string`

- [ ] **Step 1: 写失败测试**

`src/cim/cim-export.test.ts`:
```typescript
import { describe, expect, it, vi } from "vitest";
import { createCimExport } from "./cim-export";
import type { ModelNode } from "../model";

const node = (id: string, kind: ModelNode["kind"], params: Record<string, string>): ModelNode => ({
  id, kind, name: id, nodeNumber: "1", acTopologyNode: -1, dcTopologyNode: -1,
  position: { x: 0, y: 0 }, size: { width: 10, height: 10 }, rotation: 0, scale: 1,
  terminals: [], params
});

describe("createCimExport", () => {
  it("空模型不导出并返回 false", async () => {
    const saveLazyTextFile = vi.fn();
    const writeOperationLog = vi.fn();
    const exportFn = createCimExport({
      nodes: [], edges: [], projectName: "空站", activeModelId: "m1",
      safeFilePart: (s: string) => s || "未命名",
      saveLazyTextFile, writeOperationLog
    } as never);
    await expect(exportFn()).resolves.toBe(false);
    expect(saveLazyTextFile).not.toHaveBeenCalled();
  });

  it("有设备时导出 XML 并调用 saveLazyTextFile", async () => {
    const saveLazyTextFile = vi.fn().mockResolvedValue(true);
    const writeOperationLog = vi.fn();
    const exportFn = createCimExport({
      nodes: [node("bus1", "ac-bus", { i_vbase: "110" })],
      edges: [], projectName: "示范站", activeModelId: "m1",
      safeFilePart: (s: string) => s || "未命名",
      saveLazyTextFile, writeOperationLog
    } as never);
    await expect(exportFn()).resolves.toBe(true);
    expect(saveLazyTextFile).toHaveBeenCalledTimes(1);
    const options = saveLazyTextFile.mock.calls[0][0];
    expect(options.filename).toMatch(/示范站_\d{8}_\d{6}_CIM16\.xml/);
    expect(options.mime).toBe("application/xml");
    expect(options.extensions).toEqual([".xml"]);
    const text = options.loadText();
    expect(text).toContain('xmlns:cim="http://iec.ch/TC57/2013/CIM-schema-cim16#"');
    expect(text).toContain('rdf:ID="N_bus1"');
    expect(writeOperationLog).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `pnpm vitest run src/cim/cim-export.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: 实现入口工厂**

`src/cim/cim-export.ts`:
```typescript
// CIM/XML 导出入口：工厂函数装配进 __appScope（参照 createExportEFile 模式）

import type { Edge, ModelNode } from "../model";
import { buildCimPackage } from "./cim-builder";
import { serializeCimPackage } from "./cim-serializer";

export type CimExportScope = {
  nodes: readonly ModelNode[];
  edges: readonly Edge[];
  projectName: string;
  activeModelId: string;
  safeFilePart?: (name: string) => string;
  saveLazyTextFile?: (options: {
    filename: string;
    loadText: () => string;
    mime: string;
    description: string;
    extensions: string[];
    encoding?: "utf-8" | "gbk";
    preferNativeDialog?: boolean;
    onSaveTargetReady?: () => void;
  }) => Promise<boolean>;
  writeOperationLog?: (message: string) => void;
};

/** 纯函数：model state → XML 文本（供测试与外部复用） */
export function buildCimXml(
  nodes: readonly ModelNode[],
  edges: readonly Edge[],
  projectName: string,
  modelId: string
): string {
  const pkg = buildCimPackage({ nodes, edges, projectName, modelId });
  return serializeCimPackage(pkg);
}

function cimFilename(projectName: string): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  const base = projectName.trim().replace(/[\\/:*?"<>|]+/g, "_") || "未命名";
  return `${base}_${stamp}_CIM16.xml`;
}

/** 工厂：装配导出动作。菜单项与导出处理均走此函数。 */
export function createCimExport(scope: CimExportScope): () => Promise<boolean> {
  return async () => {
    const electricalNodes = scope.nodes.filter((n) => !n.kind.startsWith("static-"));
    if (electricalNodes.length === 0) {
      return false;
    }
    const xml = buildCimXml(scope.nodes, scope.edges, scope.projectName, scope.activeModelId);
    const saved = typeof scope.saveLazyTextFile === "function"
      ? await scope.saveLazyTextFile({
          filename: cimFilename(scope.projectName),
          loadText: () => xml,
          mime: "application/xml",
          description: "CIM/XML 模型文件",
          extensions: [".xml"],
          encoding: "utf-8",
          preferNativeDialog: true
        })
      : false;
    scope.writeOperationLog?.(`导出 CIM/XML：${scope.projectName}`);
    return saved;
  };
}
```

- [ ] **Step 4: 装配 App.tsx**

在 App.tsx 工厂 import 行后补：
```typescript
import { createCimExport } from "./cim/cim-export";
```
在 `createExportEFile(__appScope)` 装配点同区域补：
```typescript
  const exportCimFile = createCimExport({
    nodes, edges, projectName, activeModelId,
    safeFilePart, saveLazyTextFile, writeOperationLog
  } as CimExportScope);
  Object.assign(__appScope, { exportCimFile });
```
> 位置指引：grep App.tsx 的 `createExportEFile(` 调用点（约 appStateBatch / App.tsx 装配段），紧邻加上。若 `nodes`/`edges`/`projectName` 等变量名不同，以该作用域实际变量名为准。

- [ ] **Step 5: 运行测试 + tsc**

Run: `pnpm vitest run src/cim/cim-export.test.ts && pnpm tsc --noEmit`
Expected: PASS + 无新类型错误

- [ ] **Step 6: 提交**

```bash
git add src/cim/cim-export.ts src/cim/cim-export.test.ts src/App.tsx
git commit -m "feat(cim): 导出入口工厂并装配 App scope"
```

---

### Task 9: 顶栏菜单项 + 空模型提示

**Files:**
- Modify: `src/appExtracted/appTopbar.tsx`
- Test: `src/appView.test.tsx`（已有 appView 测试文件，追加断言）

**Interfaces:**
- Consumes: `exportCimFile`（Task 8 装配进 scope）
- Produces: 导出下拉菜单新项「导出 CIM/XML」

- [ ] **Step 1: 写失败测试**

在 `src/appView.test.tsx` 导出菜单相关测试附近追加：
```typescript
it("导出菜单包含导出 CIM/XML 项", async () => {
  // 参照现有导出菜单用例的开启方式（appTopbar 导出下拉）
  // 断言 topbar-dropdown-menu 内存在文本"导出 CIM/XML"的菜单项
  expect(await screen.findByText("导出 CIM/XML")).not.toBeNull();
});
```
> 若现有 appView 测试未覆盖导出菜单，则在本 step 先补一个打开菜单的用例（参照 appView.test.tsx 中 topbar-dropdown 现有交互模式；菜单默认 CSS 隐藏，测试用 fireEvent.click 触发后断言）。

- [ ] **Step 2: 运行测试确认失败**

Run: `pnpm vitest run src/appView.test.tsx`
Expected: FAIL — 找不到"导出 CIM/XML"

- [ ] **Step 3: 菜单项实现**

在 `src/appExtracted/appTopbar.tsx` scope 解构区（约 110 行）补 `exportCimFile`，菜单数组（约 199-202 行）补一行：
```tsx
{ key: "cim", label: "导出 CIM/XML", icon: <FileJson size={16}/>, action: exportCimFile, validatesEInterface: false },
```
同时 scope 解构列表新增：
```typescript
    exportCimFile,
```

- [ ] **Step 4: 运行测试验证通过**

Run: `pnpm vitest run src/appView.test.tsx`
Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add src/appExtracted/appTopbar.tsx src/appView.test.tsx
git commit -m "feat(cim): 顶栏导出菜单新增导出 CIM/XML"
```

---

### Task 10: 集成测试 + 快照 + 全量回归收口

**Files:**
- Test: `src/cim/cim-export.integration.test.ts`

- [ ] **Step 1: 写集成测试**

```typescript
import { describe, expect, it } from "vitest";
import { buildCimXml } from "./cim-export";
import type { ModelNode, Edge } from "../model";

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
  it("完整小模型 → XML 可解析，rdf:resource 引用闭环", async () => {
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
    for (const el of doc.querySelectorAll("[rdf\\:ID]")) {
      ids.add(el.getAttribute("rdf:ID") ?? "");
    }
    for (const el of doc.querySelectorAll("[rdf\\:resource]")) {
      const ref = el.getAttribute("rdf:resource") ?? "";
      if (ref.startsWith("#")) {
        expect(ids.has(ref.slice(1))).toBe(true);
      }
    }
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
```

> DOMParser 为浏览器全局；vitest 环境需 jsdom/happy-dom。若 `test-setup.ts` 已配置环境即可直接跑；否则在文件头加 `// @vitest-environment jsdom`。

- [ ] **Step 2: 运行集成测试**

Run: `pnpm vitest run src/cim/cim-export.integration.test.ts`
Expected: PASS

- [ ] **Step 3: CIM 目录全量测试 + tsc**

Run: `pnpm vitest run src/cim/ && pnpm tsc --noEmit`
Expected: 全 PASS + 无类型错误

- [ ] **Step 4: 全量回归**

Run: `pnpm vitest run`
Expected: 全部通过（含既有 737+ 测试，无回归）

- [ ] **Step 5: 提交收尾**

```bash
git add src/cim/cim-export.integration.test.ts
git commit -m "test(cim): 集成测试验证 XML 可解析与引用闭环"
```

---

## Self-Review 记录

1. **Spec 覆盖**：spec §2 架构（任务 1-3）、§3 映射表（任务 5-6）、§4 IR 类型（任务 1）、§5 Builder 五阶段（任务 3-7）、§6 序列化规则（任务 2）、§7 UI 集成（任务 8-9）、§8 测试策略（任务 2/4/5/10）、§9 边界处理（任务 1/6/7 测试覆盖：孤立设备/缺参/自定义跳过/氢热跳过）。地理信息与多文件导出列为未来扩展（spec §10），不在本计划。
2. **占位符扫描**：无 TBD/TODO；侦察类指引全部带具体命令与预期输出。
3. **类型一致性**：`CimBuildInput`（任务 3 定义）在任务 4-8 一致使用；`createCimExport`/`exportCimFile`/`buildCimXml` 命名跨任务一致。