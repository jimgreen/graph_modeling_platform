# CIM/XML (IEC 61970 CIM16) 导出设计文档

> 日期：2026-09-06
> 状态：设计通过，待实施
> 作者：brainstorming with Claude

## 1. 背景与目标

### 1.1 背景

当前平台已实现 E 格式导出、SVG 导出、截图导出，但缺少电力行业标准交换格式 CIM/XML (IEC 61970-552) 支持。CIM/XML 是国内外 EMS/DMS/SCADA 系统间数据互通的事实标准，也是多数电力行业项目招标的必备功能。

### 1.2 目标

实现 **CIM16 (IEC 61970 CIM-schema-cim16)** 单文件整合导出，覆盖平台全部电力系统设备类别。导出文件可被主流电力分析软件（PSS/E、DIgSILENT PowerFactory、OpenDSS 等）读取。

### 1.3 范围决策

| 决策项 | 选择 | 理由 |
|--------|------|------|
| 导入/导出 | 仅导出优先 | 导出复用已有 model.ts 拓扑数据，风险低；导入后续单独设计 |
| CIM 版本 | CIM16 (CIM-schema-cim16) | 国内主流 EMS 均采用此版本 |
| 文件结构 | 单文件整合 | 简单直接，调试方便；大文件性能可接受 |
| 实现方案 | CIM IR 中间表示 | 映射与序列化分离，易测试，导入可复用 IR |
| 设备范围 | 全部四类 | 变电站/母线/拓扑 + 线路/变压器 + 开关/负荷/发电机/新能源 + 量测/参数 |

---

## 2. 架构

### 2.1 文件结构

```
src/cim/                          # 新增目录
├── cim-types.ts                  # CIM16 IR 类型定义（TS 接口）
├── cim-builder.ts                # model state → CIM IR 构建器
├── cim-serializer.ts             # CIM IR → XML 字符串序列化
├── cim-export.ts                 # 顶层入口函数
├── cim-namespaces.ts             # CIM RDF 命名空间常量
└── cim-export.test.ts            # 单元 + 集成测试
```

### 2.2 数据流

```
┌─────────────┐
│ model state │ (graphStore + devices + measurements)
└──────┬──────┘
       │ cim-builder.ts (五阶段算法)
       ▼
┌─────────────┐
│  CIM IR     │ (typed TS objects: CimPackage)
└──────┬──────┘
       │ cim-serializer.ts
       ▼
┌─────────────┐
│ CIM/XML     │ (RDF/XML string)
└─────────────┘
```

### 2.3 关键设计决策

1. **IR 隔离**：CIM 类型独立于 `model.ts`，不污染核心类型定义
2. **构建器纯函数**：输入 model state，输出 IR，无副作用，易测试
3. **序列化器纯函数**：输入 IR，输出 XML 字符串，无 DOM 依赖
4. **ID 策略**：rdf:ID 复用现有 model ID（node.id / edge.id），保证跨文件引用稳定
5. **命名空间**：`cim:` = `http://iec.ch/TC57/2013/CIM-schema-cim16#`（CIM16 RDFS 命名空间，国内 EMS 广泛兼容）；Model Description 头用 `md:` = `http://iec.ch/TC57/61970-552/ModelDescription/1#`

---

## 3. 设备类映射表

### 3.1 电力系统（AC）

| 平台 DeviceKind | CIM16 类 | 说明 |
|---|---|---|
| `ac-source` / `ac-station-source` / `ac-feeder-source` / `ac-district-source` | `cim:EnergySource` | 等效电源/馈线 |
| `ac-wind-source` | `cim:WindGeneratingUnit` | 风电机组 |
| `ac-pv-source` | `cim:SolarGeneratingUnit` | 光伏机组 |
| `ac-thermal-source` | `cim:ThermalGeneratingUnit` | 火电机组 |
| `ac-diesel-source` | `cim:ThermalGeneratingUnit` | 柴油机组 |
| `ac-hydro-source` | `cim:HydroGeneratingUnit` | 水电机组 |
| `ac-nuclear-source` | `cim:ThermalGeneratingUnit` | 核电机组 |
| `ac-storage` | `cim:BatteryUnit` | 储能单元 |
| `ac-capacitor` | `cim:LinearShuntCompensator` | 并联电容器 |
| `ac-reactor` | `cim:LinearShuntCompensator` | 并联电抗器 |
| `ac-series-capacitor` | `cim:SeriesCompensator` | 串联补偿 |
| `ac-line` / `ac-routable-line` | `cim:ACLineSegment` | 交流线段 |
| `ac-zero-branch` / `ac-zero-routable-branch` | `cim:ACLineSegment` | 零阻抗支路（r/x 默认 0） |
| `ac-bus` | `cim:BusbarSection` | 母线 |
| `ac-breaker` / `ac-box-breaker` | `cim:Breaker` | 断路器 |
| `ac-switch` / `ac-disconnector` / `ac-ground-disconnector` | `cim:Disconnector` | 隔离开关 |
| `ac-load` / `ac-station-load` / `ac-feeder-load` / `ac-district-load` | `cim:EnergyConsumer` | 负荷 |
| `ac-transformer` / `ac-two-winding-transformer` | `cim:PowerTransformer` | 双绕组变压器 |
| `ac-three-winding-transformer` / `ac-three-winding-transformer-neutral` | `cim:PowerTransformer` | 三绕组变压器（生成 3 个 PowerTransformerEnd） |
| `ac-terminal-transformer-load` | `cim:EnergyConsumer` | 终端变压器负荷 |

### 3.2 直流侧

| 平台 DeviceKind | CIM16 类 | 说明 |
|---|---|---|
| `dc-line` / `dc-routable-line` | `cim:DCLineSegment` | 直流线段 |
| `dc-bus` | `cim:DCBusbar` | 直流母线 |
| `dc-breaker` | `cim:DCBreaker` | 直流断路器 |
| `dc-switch` / `dc-disconnector` | `cim:DCSwitch` | 直流隔离开关 |
| `dc-load` / `dc-station-load` / `dc-feeder-load` / `dc-district-load` | `cim:DCConsumer` | 直流负荷 |
| `dc-source` / `dc-station-source` / `dc-feeder-source` | `cim:DCSource` | 直流电源 |
| `dc-transformer` | `cim:DCConverterUnit` | DC/DC 变换器 |
| `dcdc-converter` / `acdc-converter` / `dcac-converter` / `acac-converter` | `cim:ACDCConverter` | 换流器 |
| `dc-storage` | `cim:BatteryUnit` | 直流储能 |

### 3.3 结构类

| 平台概念 | CIM16 类 | 说明 |
|---|---|---|
| 方案 (scheme) | `cim:GeographicalRegion` | 地理区域/方案容器 |
| 模型 (model) | `cim:Substation` | 变电站/模型容器 |
| 电压等级 (vbase) | `cim:BaseVoltage` + `cim:VoltageLevel` | 基准电压 + 电压等级容器 |
| 拓扑连接节点 | `cim:ConnectivityNode` | 电气连接节点 |
| 设备端子 | `cim:Terminal` | 端子（设备到连接节点的桥梁） |
| 量测 | `cim:Measurement` + `cim:Analog` / `cim:Discrete` | 模拟量/状态量 |

---

## 4. CIM IR 类型定义

```typescript
// src/cim/cim-types.ts

// ── 顶层包 ──
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

// ── FullModel 头 ──
export interface CimFullModel {
  rdfAbout: string;          // rdf:about URI
  created: string;           // ISO 8601
  description: string;
  version: number;
  profile: string;           // "http://iec.ch/TC57/2013/CIM-schema-cim16#EquipmentCore"
}

// ── 公共基础 ──
export interface CimIdentifiedObject {
  rdfId: string;
  name: string;
  description?: string;
  mRID?: string;
}

// ── 容器类 ──
export interface CimSubstation extends CimIdentifiedObject {
  regionId?: string;
}

export interface CimVoltageLevel extends CimIdentifiedObject {
  substationId: string;
  baseVoltageId: string;
  lowCapacitance?: number;
  highCapacitance?: number;
}

export interface CimBaseVoltage extends CimIdentifiedObject {
  nominalVoltage: number;    // kV
}

// ── 拓扑类 ──
export interface CimConnectivityNode extends CimIdentifiedObject {
  containerId: string;       // VoltageLevel or Bay rdfId
  containerType: 'VoltageLevel' | 'Bay';
}

export interface CimTerminal extends CimIdentifiedObject {
  conductingEquipmentId: string;
  connectivityNodeId: string;
  sequenceNumber: number;
}

// ── 设备类 ──
export interface CimACLineSegment extends CimIdentifiedObject {
  r: number;                 // 电阻 Ω
  x: number;                 // 电抗 Ω
  bch: number;               // 充电电纳 S
  length?: number;           // km
  baseVoltageId: string;
}

export interface CimBusbarSection extends CimIdentifiedObject {
  voltageLevelId: string;
}

export interface CimPowerTransformer extends CimIdentifiedObject {
  substationId?: string;
  vectorGroup?: string;      // YNd11 等
}

export interface CimPowerTransformerEnd extends CimIdentifiedObject {
  transformerId: string;
  baseVoltageId: string;
  ratedU: number;            // kV
  ratedS?: number;           // MVA
  r: number; x: number;
  endNumber: number;
  connectionKind?: 'Y' | 'D' | 'Z' | 'Yn';
}

export interface CimEnergySource extends CimIdentifiedObject {
  voltageLevelId?: string;
  baseVoltageId: string;
  activePower?: number;      // MW
  reactivePower?: number;    // MVar
}

export interface CimEnergyConsumer extends CimIdentifiedObject {
  voltageLevelId?: string;
  baseVoltageId: string;
  activePower?: number;      // MW
  reactivePower?: number;    // MVar
}

export interface CimGeneratingUnit extends CimIdentifiedObject {
  cimClass: 'WindGeneratingUnit' | 'SolarGeneratingUnit'
           | 'ThermalGeneratingUnit' | 'HydroGeneratingUnit';
  voltageLevelId?: string;
  baseVoltageId: string;
  ratedGrossMaxP?: number;   // MW
  ratedGrossMinP?: number;
}

export interface CimSwitch extends CimIdentifiedObject {
  cimClass: 'Breaker' | 'Disconnector' | 'LoadBreakSwitch';
  voltageLevelId?: string;
  normalOpen: boolean;
}

export interface CimShuntCompensator extends CimIdentifiedObject {
  cimClass: 'LinearShuntCompensator' | 'SeriesCompensator';
  voltageLevelId?: string;
  bPerSection?: number;      // S (容纳)
  gPerSection?: number;      // S (电导)
  sections: number;
}

// ── 量测类 ──
export interface CimMeasurement extends CimIdentifiedObject {
  measurementType: 'Analog' | 'Discrete' | 'StringMeasurement';
  unit?: string;
  phases?: string;
  terminalId?: string;
  powerSystemResourceId: string;
  measurementClass?: string; // 'CurrentFlow' / 'Voltage' / 'Power' 等
}
```

---

## 5. Builder 五阶段算法

### 5.1 阶段 1：提取基准电压

```
遍历所有 nodes
├── 提取 params 中的电压参数（i_vbase / u_rated / vnom 等）
├── 去重 → CimBaseVoltage[]
└── 建立 voltageValue → baseVoltageId 映射表
```

### 5.2 阶段 2：构建容器层次

```
当前 model → CimSubstation（模型名）
按电压等级分组 nodes → CimVoltageLevel[]
建立 substationId, voltageLevelId 引用关系
```

### 5.3 阶段 3：建立拓扑（关键）

```
收集全部连通关系（不止 edges！）
├── 显式 edges：每个 edge = (sourceNodeId, sourcePort, targetNodeId, targetPort)
├── 隐式连通：bus contact / overlap / routable-line 端点等
│   复用平台连通性函数（如 routableLineDeviceTopologyEdges、
│   collectVoltageBaseScopeTargets 同族拓扑函数）收集，
│   不得只读 edges —— 否则拓扑导出不全
├── 合并共享连接点的端子 → 推导 ConnectivityNode
│   同一电气连接点的所有端子 → 一个 ConnectivityNode
├── 为每个设备端子生成 CimTerminal
└── 为每个连接点生成 CimConnectivityNode
```

> ⚠️ 实现时须先核对平台连通性函数的实际行为（参考既往调试经验：
> 平台 connectivity 会合并同侧端子、routable-line 需端点合并等），
> 用最小复现 probe 验证收集结果后再落代码。

**拓扑推导示例：**
```
平台 edges:
  edge1: nodeA[port1] ─── nodeB[port1]
  edge2: nodeB[port2] ─── nodeC[port1]

推导结果:
  ConnectivityNode CN_001 ← nodeA 的 port1 端子 + nodeB 的 port1 端子
  ConnectivityNode CN_002 ← nodeB 的 port2 端子 + nodeC 的 port1 端子

  Terminal T_A1: equipment=nodeA, connectivityNode=CN_001, seq=1
  Terminal T_B1: equipment=nodeB, connectivityNode=CN_001, seq=1
  Terminal T_B2: equipment=nodeB, connectivityNode=CN_002, seq=2
  Terminal T_C1: equipment=nodeC, connectivityNode=CN_002, seq=1
```

### 5.4 阶段 4：构建设备对象

```
遍历 nodes，按 DeviceKind 分类
├── 构建各 CIM 设备对象
│   ├── 参数映射（params → CIM 属性）
│   └── 引用关系（baseVoltageId, substationId 等）
└── 特殊处理：
    ├── 三绕组变压器 → 3 个 PowerTransformerEnd
    ├── 线路参数单位策略：CIM ACLineSegment.r/x/bch 要求物理
    │   单位（Ω/S），实施时先核对平台参数语义：
    │   - 若 params 为有名值（Ω/S）→ 直接输出
    │   - 若 params 为标幺值 → 按基准电压换算（Zbase = U²/Sbase）
    │   单位策略在实施计划任务 1 中确定（读 model.ts 参数注释/测试用例）
    └── 派生设备（风电/光伏）→ GeneratingUnit
```

**参数映射示例：**
```typescript
// ac-line params → ACLineSegment
{ i_vbase: 110, r: 0.12, x: 0.45, b: 0.000034, length: 12.5 }
→ baseVoltageId = BV_110, r = 0.12, x = 0.45, bch = 3.4e-5, length = 12.5

// ac-transformer params → PowerTransformer + 2 PowerTransformerEnd
{ i_vbase_h: 110, i_vbase_l: 10, sn: 50, uk: 10.5, pk: 150, vector_group: 'YNd11' }
→ vectorGroup = YNd11
→ End[1]: ratedU = 110, ratedS = 50, r/x 由 uk/pk 推导
→ End[2]: ratedU = 10, ratedS = 50, r/x 由 uk/pk 推导
```

### 5.5 阶段 5：构建量测

```
遍历 measurements
├── 映射为 CimMeasurement (Analog/Discrete)
└── 关联到 Terminal 或 PowerSystemResource
```

---

## 6. XML 序列化规则

### 6.1 命名空间

```xml
<rdf:RDF
  xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"
  xmlns:cim="http://iec.ch/TC57/2013/CIM-schema-cim16#"
  xmlns:md="http://iec.ch/TC57/61970-552/ModelDescription/1#">
```

### 6.2 输出样例

```xml
<?xml version="1.0" encoding="UTF-8"?>
<rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"
         xmlns:cim="http://iec.ch/TC57/2013/CIM-schema-cim16#"
         xmlns:md="http://iec.ch/TC57/61970-552/ModelDescription/1#">

  <!-- Model Description 头（IEC 61970-552） -->
  <md:FullModel rdf:about="urn:uuid:model-001">
    <md:Model.created>2026-09-06T10:00:00Z</md:Model.created>
    <md:Model.description>导出自图形建模平台</md:Model.description>
    <md:Model.version>1</md:Model.version>
    <md:Model.profile>http://iec.ch/TC57/2013/CIM-schema-cim16#EquipmentCore</md:Model.profile>
  </md:FullModel>

  <!-- BaseVoltage -->
  <cim:BaseVoltage rdf:ID="BV_110">
    <cim:IdentifiedObject.name>110kV</cim:IdentifiedObject.name>
    <cim:BaseVoltage.nominalVoltage>110</cim:BaseVoltage.nominalVoltage>
  </cim:BaseVoltage>

  <!-- Substation -->
  <cim:Substation rdf:ID="SUB_001">
    <cim:IdentifiedObject.name>示范变电站</cim:IdentifiedObject.name>
  </cim:Substation>

  <!-- ACLineSegment -->
  <cim:ACLineSegment rdf:ID="LINE_001">
    <cim:IdentifiedObject.name>线路1</cim:IdentifiedObject.name>
    <cim:ACLineSegment.r>0.12</cim:ACLineSegment.r>
    <cim:ACLineSegment.x>0.45</cim:ACLineSegment.x>
    <cim:ACLineSegment.bch>3.4e-5</cim:ACLineSegment.bch>
    <cim:ConductingEquipment.BaseVoltage rdf:resource="#BV_110"/>
  </cim:ACLineSegment>

</rdf:RDF>
```

### 6.3 序列化规则

| 规则 | 说明 |
|------|------|
| rdf:ID 引用 | 使用 `#` 前缀内部引用：`rdf:resource="#BV_110"` |
| 属性顺序 | `IdentifiedObject.name` 优先，其他按字母序 |
| 空值跳过 | undefined 字段不输出 XML 元素 |
| 浮点数格式 | 科学计数法用 `e`，保留 6 位有效数字 |
| XML 转义 | 文本节点只转义 `&` `<` `>`（`'` `"` 在文本内容中无需转义） |
| 缩进 | 2 空格缩进，可读性优先 |
| 量测子类映射 | `measurementType` 决定 XML 根元素：`Analog` → `<cim:Analog>`，`Discrete` → `<cim:Discrete>`，`StringMeasurement` → `<cim:StringMeasurement>`；`measurementClass` 映射单元属性（如 Voltage→kV、CurrentFlow→A、ActivePower→MW） |

---

## 7. UI 集成

### 7.1 触发入口

在顶栏导出按钮下拉菜单新增一项：
```
[导出 ▼]
  ├── 导出 E 格式       ← 现有
  ├── 导出 SVG          ← 现有
  ├── 导出截图          ← 现有
  └── 导出 CIM/XML (100) ← 新增
```

### 7.2 入口代码位置

`src/appExtracted/appTopbar.tsx`（顶栏导出下拉菜单所在模块）。菜单项与处理函数均加于此，引用 `src/cim/cim-export.ts` 的 `buildCimXml`。若实施时发现导出菜单实际装配在导出工厂模块（appPersistenceLibraryExport.tsx），以实际菜单装配处为准，但入口只应有一处。

```typescript
const handleExportCIM = async () => {
  const modelState = __appScopeRef.current;
  try {
    const xml = await buildCimXml(modelState);
    downloadXmlFile(xml, generateCimFilename(modelState));
  } catch (err) {
    globalMessage.error(`CIM 导出失败: ${err.message}`);
  }
};
```

### 7.3 文件命名规则

```
{模型名}_{YYYYMMDD_HHmmss}_CIM16.xml
例: 示范站_20260906_153000_CIM16.xml
```

### 7.4 导出前校验

1. 检查是否有核心设备（ac-line / ac-bus / ac-transformer 等），空模型提示
2. 检查关键参数缺失（无电压等级 / 无 r x 等），弹出警告：
   "X 个设备缺少关键参数，导出文件可能不完整，是否继续？"
3. 校验通过 → 直接导出
4. 校验失败 → 用户确认后仍导出（非阻断）

### 7.5 性能预期（预估，实施后实测校正）

纯 CPU 内存内遍历 + 字符串拼接，预期快于下表；数值仅为估算上限。

| 模型规模 | 设备数 | 导出耗时上限 |
|----------|--------|--------------|
| 小 | <50 | 100ms |
| 中 | 50-500 | 2s |
| 大 | 500+ | 5s |

---

## 8. 测试策略

### 8.1 单元测试

```
cim-builder.test.ts
├── 单设备（ac-line / transformer / load）→ IR 转换正确性
├── 拓扑（多设备连接 → ConnectivityNode 合并）
├── 参数映射（params → CIM 属性值）
└── 边界场景（孤立设备、缺参数、自定义设备跳过）

cim-serializer.test.ts
├── 命名空间正确性
├── rdf:ID 引用一致性
├── 特殊字符转义（&<>"'）
└── 浮点数格式（科学计数法、精度）
```

### 8.2 集成测试

```
cim-export.test.ts
├── 完整模型 → XML → 可解析为合法 XML
├── XML 结构断言（cim:Substation / cim:ACLineSegment 等元素存在）
└── rdf:resource 引用完整性（所有 #ref 都有对应 rdf:ID）
```

### 8.3 快照测试

```
固定 model state → XML 快照对比（防回归）
```

---

## 9. 边界处理策略

| 场景 | 处理策略 |
|------|----------|
| 设备无电压参数 | 从连接边推导相邻设备电压等级，仍无则用模型内最高频电压等级 |
| 孤立设备（无连接边） | 仍导出设备本身，但无 Terminal / ConnectivityNode |
| 自定义设备 (custom-device) | 跳过 CIM 导出，或按参数结构推断最接近的标准类 |
| 参数缺失 | 必填字段用合理默认值（r/x 默认 0），选填字段跳过 |
| 氢能/热力设备 | CIM16 无对应类，跳过（记录 warning log） |
| 空模型 | 提示用户，不导出 |

---

## 10. 未来扩展（不在本次范围）

1. **CIM/XML 导入**：解析外部 CIM/XML → 构建 model state
2. **多文件导出**：支持 IEC 61970-552 标准 EQ/TP/SV 分文件
3. **CIM17 支持**：CIM-schema-cim17 版本
4. **增量导出**：只导出变更部分
5. **地理信息**：cim:CoordinateSystem + cim:Location 映射设备坐标
6. **动态模型**：cim:Regulator / cim:Governor 等控制设备导出
