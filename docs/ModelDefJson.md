# ModelDefJson.md — 模型导出 JSON 文件格式说明

> 适用对象：顶栏/右键菜单「模型导出」生成的 `*.json` 文件。
> 类型真源：`src/model.ts`（`ProjectFile`）；本文与代码同步维护。

## 1. 概述

模型导出 JSON 是**画布工程对象 `ProjectFile` 的原样序列化**：

```ts
JSON.stringify(project, null, 2)   // src/appExtracted/appDeviceDefinitionFactories.tsx:2540
```

- 无转换层、无裁剪：文件里每个字段都对应 `src/model.ts` 的类型定义。
- 导出与导入同构（round-trip）：导出的文件可直接重新导入恢复完整画布。
- 同一次导出同时产生 `.e`（E 格式）与 `.svg`，两者均从同一 `ProjectFile` 对象派生；JSON 是唯一完整快照。

**JSON 不含图元 SVG**。文件只存逻辑描述（`kind` + 几何 + `params`），外观由渲染时查表生成：

| 节点类别 | 图形来源 | 离开本平台能否还原形状 |
|----------|----------|:----:|
| 内置设备 | `src/model.ts` `DEVICE_LIBRARY`（模板编译进前端代码）→ `DeviceGlyph.tsx` 按 kind 绘制 | ✓ 前端代码在手即可 |
| 自定义元件 | 后端图元库（componentLibrary）；JSON 内仅 `kind` 字符串 | ✗ 需同源图元库数据，否则退化渲染 |

需要自包含外观时：用同次导出的 `.svg`（形状/样式/量测已内联）或截图 PNG。第三方程序化还原走 `/api/v1`：library 域建 kind→模板映射 + model JSON 几何，或直接取 runtime SVG。

## 2. 顶层结构 `ProjectFile`（`src/model.ts:605`）

| 字段 | 类型 | 必填 | 含义 |
|------|------|:----:|------|
| `version` | `1` | ✓ | 格式版本号，当前恒为 `1` |
| `name` | `string` | ✓ | 模型显示名 |
| `idx?` | `number` | — | 厂站序号（E 导出 `idv` 推导用） |
| `nodes` / `edges` | `ModelNode[]` / `Edge[]` | ✓ | 画布核心：设备节点与连线 |
| `layers?` | `ModelLayer[]` | — | 图层定义；缺省时导入侧补默认图层 |
| `activeLayerId?` | `string` | — | 当前激活图层 ID |
| `canvasWidth?` / `canvasHeight?` | `number` | — | 画布尺寸（默认 1920×1024） |
| `allowAutoExpandCanvas?` | `boolean` | — | 拖拽越界自动扩画布开关 |
| `canvasBackgroundColor?` | `string` | — | 画布背景色 |
| `canvasBackgroundImage?` | `string` | — | 画布背景图 URL/dataURL |
| `canvasBackgroundImageAssetId?` | `string` | — | 背景图资产 ID（后端图片库引用） |
| `canvasBackgroundImageFit?` | `string` | — | 背景图适配方式 |
| `backgroundProjectId?` | `string` | — | 背景页引用的工程 ID（多页背景） |
| `backgroundLayerIds?` | `string[]` | — | 背景页引用的图层 ID 列表 |
| `powerUnit?` / `voltageUnit?` / `currentUnit?` | `string` | — | E 导出单位（默认 MW / kV / A） |
| `powerBaseValue?` | `number` | — | E 导出功率基准（默认 100） |
| `deviceIndexCounters?` | `Record<string, number>` | — | 各设备类自动编号计数器 |
| `groups?` | `ModelGroup[]` | — | 画布分组（见 6.3） |
| `measurements?` | `ProjectMeasurementConfig` | — | 量测配置（见第 7 节） |
| `subcontrolarea?` | `string` | — | 分区控制区归属 |
| `modelType?` | `"厂站" \| "馈线" \| "台区" \| "微网" \| "其他"` | — | 模型分类 |
| `substation?` / `feeder?` / `taiqu?` | `string` | — | 按 `modelType` 填其一：厂站名 / 馈线名 / 台区名 |

## 3. 节点 `ModelNode`（`src/model.ts:474`）

| 字段 | 类型 | 必填 | 含义 |
|------|------|:----:|------|
| `id` | `string` | ✓ | 画布内唯一 ID |
| `kind` | `DeviceKind` | ✓ | 设备/图元类型，见第 6 节 |
| `name` | `string` | ✓ | 显示名 |
| `nodeNumber` | `G1` 风格编号 | ✓ | 设备编号，E 导出设备标识 |
| `acTopologyNode` | `number` | ✓ | **AC 电气拓扑岛编号**——同岛设备同值；连通性分析以此为准，不看 edges |
| `dcTopologyNode` | `number` | ✓ | DC 侧拓扑岛编号，语义同上 |
| `position` | `Point` | ✓ | 节点坐标（画布坐标系） |
| `size` | `{ width, height }` | ✓ | 节点尺寸 |
| `rotation` | `number` | ✓ | 旋转角（度），dot 导入朝向等场景使用 |
| `scale` / `scaleX?` / `scaleY?` | `number` | ✓ | 缩放（scaleX/scaleY 为可选异向缩放） |
| `layerId?` | `string` | — | 所属图层 ID |
| `terminals` | `Terminal[]` | ✓ | 端子列表（见第 4 节） |
| `params` | `Record<string, string>` | ✓ | 设备参数表（见 3.1） |

### 3.1 `params` 说明

- 键为设备参数英文键（如 `i_vbase`），风格由设备定义决定。
- 值**全为字符串**，数值语义在设备参数定义（`DeviceParameterDefinition.valueType`）层校验。
- 电压等级可写入 `params.i_vbase`，但着色与 E 导出**优先读端子 `vbase`**。

## 4. 端子 `Terminal`（`src/model.ts:369`）

| 字段 | 类型 | 必填 | 含义 |
|------|------|:----:|------|
| `id` | `string` | ✓ | 端子 ID（节点内唯一） |
| `label` | `string` | ✓ | 端子标签（如 `1`、`A`） |
| `type` | `TerminalType` | ✓ | 介质类型：`"ac" \| "dc" \| "h2" \| "heat"` |
| `anchor` | `Point` | ✓ | 相对节点原点的锚点坐标（连线接入点） |
| `nodeNumber` | `string` | ✓ | 所属设备编号（冗余存储，便于 E 导出） |
| `vbase?` | `string` | — | 端子电压等级；着色与 E 导出优先读它 |

## 5. 连线 `Edge`（`src/model.ts:495`）

| 字段 | 类型 | 必填 | 含义 |
|------|------|:----:|------|
| `id` | `string` | ✓ | 连线唯一 ID |
| `sourceId` / `targetId` | `string` | ✓ | 两端节点 ID |
| `sourceTerminalId?` / `targetTerminalId?` | `terminalId` | — | 端子级连接；与 sourcePoint 二选一 |
| `sourcePoint?` / `targetPoint?` | `Point` | — | 自由端点坐标（无端子连接时用） |
| `manualPoints?` | `Point[]` | — | 手动拖出的中间拐点 |
| `routePoints?` | `Point[]` | — | 自动布线拐点 |

**连接语义三态**：

| 形态 | 判定 |
|------|------|
| 端子-端子 | `sourceTerminalId` 与 `targetTerminalId` 均存在 |
| 端子-坐标 | 一端有 terminalId，另一端只有坐标 |
| 自由连线 | 两端均无 terminalId，只有坐标 |

## 6. 关键枚举与辅助类型

### 6.1 `DeviceKind`（`src/model.ts:38`）

开放联合类型，含 `(string & {})` 兜底，支持自定义元件 kind。分五大类：

| 类别 | 示例 | 说明 |
|------|------|------|
| 静态图元 | `static-text`、`static-line`、`static-rect`、… | 约 50 种绘图图元，不参与电气拓扑 |
| AC 电力设备 | `ac-source`、`ac-bus`、`ac-line`、`ac-routable-line`、`ac-transformer`、… | 参与 AC 拓扑 |
| DC 电力设备 | `dc-source`、`dc-bus`、`dc-line`、`dc-transformer`、… | 参与 DC 拓扑 |
| 氢能设备 | `hydrogen-source`、`hydrogen-bus`、`hydrogen-pipeline`、… | h2 介质 |
| 热力设备 | `heat-bus`、`heat-pipeline`、`heat-pump`、… | heat 介质 |
| 换流设备 | `dcdc/acdc/dcac/acac-converter` | 跨介质转换 |

### 6.2 `Point`（`src/model.ts:257`）

`{ x: number; y: number }`。

### 6.3 `ModelGroup` / `ModelLayer`（`src/model.ts:507/515`)

```ts
ModelGroup  = { id, name, nodeIds: string[], edgeIds: string[], childGroupIds?: string[] }
ModelLayer  = { id, name, visible: boolean }
```

## 7. 量测配置 `ProjectMeasurementConfig`（`src/measurements.ts:342`）

```ts
ProjectMeasurementConfig = {
  version: 1;
  groups: MeasurementGroup[];
}

MeasurementGroup = {
  id, nodeId, terminalId?,          // 挂靠节点/端子
  visible, labelVisible?, unitVisible?,
  backgroundColor?, borderColor?, borderStyle?, borderWidth?,
  anchor: "top"|"bottom"|"left"|"right"|"custom",
  offset: { x, y },
  layout: "vertical"|"horizontal"|"grid",
  groupStyleOverride?,
  items: MeasurementItemBinding[]   // 测点绑定
}

MeasurementItemBinding = {
  id, name?, measurementTypeId,     // 量测类型（measurementTypes 配置）
  role?, sourcePoint,               // sourcePoint = 测点号（运行时数据源）
  visible?, labelOverride?, unitOverride?,
  formatOverride?, decimalsOverride?, defaultValue?,
  styleOverride?
}
```

## 8. 导入导出入口

| 方向 | 入口 |
|------|------|
| 导出 | 右键方案树模型 →「模型导出」→ 同目录写 `*.json` / `*.e` / `*.svg`（`appDeviceDefinitionFactories.tsx:2521-2558`） |
| 保存到后台 | 保存按钮 → `saveBackendProjectRecord`，同样序列化 `ProjectFile`（`appProjectCanvasFactories.tsx:4880`） |
| 导入 | 模型导入入口反序列化 `ProjectFile` 后恢复画布 |

## 9. 消费方速查

| 消费方 | 读取的字段 |
|--------|-----------|
| 画布渲染 | `nodes`（几何+kind）、`edges`、`layers`、画布背景 |
| E 格式导出（`model-eexport.ts`） | `nodeNumber`、端子 `vbase`、`params`、`powerUnit` 等单位、`idx` |
| CIM/XML 导出（`src/cim/`） | 节点/端子/拓扑岛 |
| 全网拓扑导出 | 跨模型 `substation`/`modelType` + 节点拓扑 |
| 电压等级着色 | 端子 `vbase` 优先，`params.i_vbase` 兜底 |
| 连通性分析 | `acTopologyNode` / `dcTopologyNode` |
| 运行时态桥接 | 整个 `ProjectFile`（`runtimeSnapshot.ts`） |
