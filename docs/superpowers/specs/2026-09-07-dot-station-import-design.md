# dot 厂站图导入设计

- 日期：2026-09-07
- 状态：已确认（brainstorming 会话定稿）
- 范围：单文件 SLD dot 导入为平台可编辑模型

## 1. 背景与目标

powsybi（`D:\work\rtdbpy\ems\powsybi`）自研 Python 包将电网 E 文件渲染为厂站单线图
（SLD）：`e_to_iidm.py` 转 IIDM，powsybl-diagram 渲染 SVG，`sld_svg.py` 抽取
SVG 坐标与连接关系写出 Graphviz DOT（`_write_station_dot`，sld_svg.py:167）。

目标：在图上建模平台导入 `望道变_6.dot`，生成与 `望道变_6.svg` 布局相当的
**可编辑模型**——设备映射为平台 DeviceKind 节点，连接为边，坐标直落画布，
可继续参与平台建模与 E/CIM 导出流程。

非目标（YAGNI）：

- 不做 NAD（全网潮流图）dot 格式（本批 10 个 dot 皆 Station 格式，格式特征
  `// Station:` 首行注释）
- 不做多文件批量导入
- 不解析 powsybi SVG 本体
- 不还原中文名（dot 无中文名，名称用 equipmentId）
- 不重算布局（dot `pos` 已含 powsybl-diagram 布局结果）

## 2. 数据源契约

dot 文件由 `_write_station_dot` 生成，特征：

- 首行 `// Station: {NAME} ({ID})` → 模型名 `{NAME}_{ID}`（如 `望道变_6`）
- `digraph "{ID}" {` 头部：graph/node/edge 全局属性行忽略
- 节点行：`n0 [label="...", shape=..., fillcolor=..., pos="x,y!"];`
  - `pos` 为 SVG 坐标（与 SVG viewBox 1:1），`!` 后缀剥离
  - label 含 `\n[OPEN]` 后缀标记开关分位（sld_svg.py:228）
- 边行：`nA -> nB [dir=none];`
- 注释行（`//` 开头）忽略

## 3. 类型对照表（三级判定）

权威源：`sld_svg.py` style_map（11 键）+ `e_to_iidm.py` ID 前缀语义
（`T_`=双绕组、`T3_`=三绕组、`SH_`=并联无功）。

### 3.1 一级：shape+fillcolor 精确匹配

| componentType | dot 外观 | 平台 DeviceKind | 备注 |
|---|---|---|---|
| BREAKER | diamond/green | `ac-breaker` | |
| DISCONNECTOR | invtriangle/orange | `ac-switch` | 隔离开关 |
| BUSBAR_SECTION | rect/yellow | `ac-bus` | |
| LOAD | ellipse/lightblue | `ac-load` | |
| GENERATOR | circle/lightgreen | `ac-generator` | 交流电源 |
| LINE | house/lightgray | `ac-line` | |
| SHUNT_COMPENSATOR | octagon/pink | `ac-capacitor` | b 值 dot 不可辨，默认容性，报告标注人工复核 |
| TWO_WINDINGS_TRANSFORMER | doubleoctagon/plum | `ac-two-winding-transformer` | |
| THREE_WINDINGS_TRANSFORMER | tripleoctagon/thistle | `ac-three-winding-transformer` | |
| NODE | point/black | 收缩 | 拓扑连接点，不落画布 |
| BUS_CONNECTION | point/gray | 收缩 | 母线连接点，不落画布 |

### 3.2 二级：fallback（box/white）判定

componentType 丢失时 dot 呈 box/white，按序判定：

1. box 且 label 与任一 tripleoctagon 节点 label 相同 → 三绕组变压器**绕组端子
   组件**，不落画布，其连接边并入三绕组本体设备
2. box 前缀 `SH_` → `ac-capacitor`（容/感 dot 不可辨，默认容性 + 报告标注
   人工复核）
3. 其余 box → `static-rect` 置灰兜底，导入报告列出，人工改型

### 3.3 判定顺序

```
① shape+fillcolor 精确匹配 → ② fallback 判定 → ③ point 收缩
```

## 4. 核心转换规则

- **point 收缩**：并查集合并 point 节点与相邻节点，收缩后剩余设备直连；
  同名 box 绕组端子并入 tripleoctagon 本体；两端皆同一设备的自环边丢弃。
- **坐标**：dot `pos` 直落画布，坐标系与 SVG viewBox 1:1，y 向下一致不取反；
  全图 bounding box 归零后平移 (100,100)。
- **电压等级**：母线（BBS label `INTERNAL_VL_6_230` 像前缀）直接读前缀；
  无前缀设备沿收缩后连接 BFS 传播，从带前缀节点出发；无前缀可达者留空，
  不猜。
- **开关状态**：label `\n[OPEN]` 后缀 → `status: "0"`（分位）写设备 params；
  否则默认 `status: "1"`。
- **名称**：设备名 = dot label（equipmentId，剥 `[OPEN]` 后缀）；模型名 =
  首行 `// Station: 望道变 (6)` → `望道变_6`。
- **母线尺寸**：dot 无母线长度信息，用平台默认 120×28。
- **模型名冲突**：同方案树重名允许（平台允许重名模型）。

## 5. 架构

新增独立模块 `src/dotImport.ts`，纯函数管线，与 svgModelImport 并列：

```
parseDot(text) → DotGraph {stationName, stationId, nodes: DotNode[], edges}
mapDotGraphToModel(graph) → {nodes: ModelNode[], edges: ModelEdge[], report}
importDotFile(text) → {model, report}  组合两步 + Model JSON 装配
```

- `DotNode`: id(n 序号)/label/shape/fillcolor/pos
- `report`: 设备数、收缩点数、类型分布、unknown 清单、[OPEN] 开关清单、
  悬空边计数、容性假设清单（SH_/octagon）
- 不动 svgModelImport.ts

## 6. 数据流与入口

```
顶栏【导入 dot 厂站图】菜单项（与 SVG 导入并列）
  → 文件选择器(.dot) → FileReader
  → importDotFile(text)
  → Model JSON → 走现有「模型创建/导入」管线装配
  → 导入报告对话框（globalMessage 或 antd Modal）
```

导入成功建新模型入当前方案树；失败 globalMessage 报错，不留半成品。

## 7. 错误处理

| 情形 | 处置 |
|---|---|
| 空 digraph / 空文件 | 报错拒绝，globalMessage 提示 |
| 边端点悬空 | 忽略该边 + 报告计数 |
| 未知 shape | static-rect 兜底 + 报告列名 |
| label 重名（非绕组端子场景） | 独立实例保留，报告计数 |

## 9. 测试

- fixture：真实 `望道变_6.dot` 复制到 `src/__fixtures__/dot/望道变_6.dot`
- 单元测试 `src/dotImport.test.ts`：
  - parseDot：节点/边/注释/pos `!` 剥离/`[OPEN]` label
  - 映射：13 行映射表逐类断言（合成小 dot 片段）
  - 收缩：point 链收缩、自环丢弃、三绕组绕组端子并入本体
  - 电压等级 BFS 传播、无前缀留空
  - 报告：unknown 清单、容性假设清单
- E2E：顶栏菜单 → 导入 → 望道变画布设备数/类型计数断言（Playwright）

## 10. 验收标准

1. 导入 `望道变_6.dot` → 平台画布呈现与 SVG 相当的布局
2. 设备类型映射正确（对照表 13 行）
3. 拓扑连接与 dot 边一致（收缩后）
4. 电压等级推断合理（母线前缀 + BFS 传播）
5. 报告含 unknown/容性假设/[OPEN] 清单
6. 全量 vitest 绿
7. E2E 覆盖导入流程
