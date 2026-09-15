# 交流容器(AC Container)设计

日期:2026-09-15
状态:已确认(设计对话 4 轮决策 + 3 节设计经用户确认;经 critic 对照代码库审查后修正 15 项)

## 背景与需求

在图上建模平台新增「交流容器」能力:一类矩形容器图元(虚拟电厂/开关箱/配变箱),可把设备归属到容器,容器矩形自动包围成员并动态调整,并在 E 文件导出中以「容器表」呈现,支持关口设备拓扑变换。

原始需求 9 条:

1. 所有图元新增属性【所属容器】,右侧面板【模型】页下拉选择,默认空
2. 交流设备新增类【交流容器】,含 3 图元:虚拟电厂、开关箱、配变箱;样式同静态图元【分组框】
3. 选中图元右键【添加到容器】:无容器则新建并命名;有则选已有或新建;归属赋容器标识
4. 容器图层恒在最底层;容器范围内不允许出现非成员设备(线路除外)
5. 添加到容器后绘制容器包围选中设备(参考右键【组合】的包围逻辑);范围内非成员自动挤出重布局
6. 移动容器内设备或向容器新增设备,容器范围动态调整
7. 容器新增属性【是否作为关口设备】【绑定到设备】:关口决定容器在 E 文件中作为绑定设备上游进拓扑,还是仅入容器表;关口必须绑定容器内某设备;绑定后容器量测与绑定设备完全一致
8. 右键【移出容器】:归属重置为空(当前模板),容器范围与布局自动调整
9. 画布拖动实现设备移入/移出容器

**「当前模板」语义**(需求 1/8 澄清):指无容器归属的默认态,下拉显示「无(当前模板)」,移出后回到该态。非真实业务归属值。

## 已定决策

| # | 问题 | 决策 |
|---|------|------|
| 1 | 容器嵌套 | 不允许(容器节点 `containerId` 恒空) |
| 2 | 拖出容器触发方式 | Alt+拖动松手移出;默认拖动为容器扩展跟随、成员不变 |
| 3 | 非关口容器的 E 形态 | 新增统一 E 段「容器表」(key `ACContainer`),不进拓扑节点表 |
| 4 | 关口拓扑插入方式 | 替换上游:绑定设备电源侧上游改为容器节点 |
| 5 | 架构方案 | 方案 A:容器 = 特殊图元节点(否决:扩展 ModelGroup、复用 is_container 机制) |
| 6 | 容器段与预定义模板 | 暂不关联:四个预定义模板不加容器表定义;模板模式下容器不导出,静默过滤不告警 |
| 7 | 拖容器节点本身 | 容器 + 全部成员整体平移,相对位置不变 |
| 8 | 「当前模板」语义 | 即「无容器」默认态 |

## 架构

**方案 A:容器 = 特殊图元节点。**

容器自身是 `ModelNode`:有 idx、params、可选中/拖拽/进右侧面板、有 E 段。成员关系存成员节点的平级字段 `containerId`。全部复用现有节点基础设施(选择、拖拽、面板属性行、E 分段导出)。

否决理由:
- 扩展 `ModelGroup`:组是纯选择联动结构,无 idx/params/量测,补齐等于把组改造成节点
- 复用 `is_container` 关系字段机制:方向相反(设备→展开关联设备),容器需求是聚合(成员→归属),硬套扭曲语义

## 数据模型

### 新增 DeviceKind(src/model.ts)

| kind | 名称 | 库分类 |
|------|------|--------|
| `ac-vpp-box` | 虚拟电厂 | 交流容器(新 categoryLibrary) |
| `ac-switch-box` | 开关箱 | 交流容器 |
| `ac-distribution-box` | 配变箱 | 交流容器 |

图元库分类树按 `categoryLibrary` 自动分组(`appRenderBatch.tsx:3074/3164`),新增分类无需单独注册树。

### 模板与绘制

- `BASE_DEVICE_LIBRARY` 加 3 条模板:视觉同 `static-group-box`(`model.ts:3450-3458`)——透明填充、`#64748b` 虚线描边、圆角 8、文字左上,默认 180×112,支持拖角改尺寸
- **容器不进静态图元家族**:不写入 `STATIC_COMPONENT_LIBRARY_BY_KIND`(`model.ts:790`),模板不写 `component_type: StaticContainerSymbol`
- `src/DeviceGlyph.ts` 加 3 个**显式 kind 绘制分支**(不复用 static 分支):容器标注自身名称于左上,风格同分组框 header
- 该选择同时避免两个副作用:`inferESection` 的 static 分支(`model-eexport.ts:336-340`)先于 `E_KIND_SECTION_MAP`(`:344`)生效会吞掉容器段;`isStaticNode`(`model.ts:7739-7741`)为真会跳过 E 导出告警(`model-eexport.ts:2041`)

### 成员关系字段

- `ModelNode` 新增可选字段 `containerId?: string` = 所属容器**节点 id**
- 容器节点自身 `containerId` 恒空(决策 1:不嵌套);其余图元均可归属(含线路、静态图元)
- 内部存 id 不存 idx:id 稳定不受改名/重排影响;面板与 E 导出展示时再解析容器 idx + 名称

### 容器特有参数(存容器节点 params)

| 参数 | 类型 | 说明 |
|------|------|------|
| `is_gateway` | stringEnum 0/1 | 是否作为关口设备,默认 0 |
| `bound_device_id` | string | 绑定设备(容器内成员节点 id) |

约束:
- 开启关口时未绑定 → 面板红字**提示**先选绑定设备（非拦截；导出侧对「关口未绑定/失效」退化为非关口处理，数据安全。措辞原为「强制」，2026-09-16 final review 按实现对齐）
- 绑定设备被移出容器、删除、或被 Alt 拖出 → 自动解绑 + 关闭关口 + 删容器量测组,弹提示

### 「所属容器」面板行(需求 1)

- 插入右侧面板模型页属性行区顶部,**仿 `renderVoltageBaseRow` 特殊行先例**(`appRightPanel.tsx:1107-1109`),不走 `keys.map` 生成流
- 下拉选项 = 当前模型全部容器节点,显示「名称 (idx)」;默认空 = 「无(当前模板)」
- 动态选项复用现有机制:`paramOptionsForDefinition` 已有动态选项先例(`src/hooks/useBatchEditors.tsx:260-272`,model_id 动态选项)
- 多选混合值显示「混合」,走批量编辑行(单节点 inspector 无多选概念)

## 交互

### 右键菜单(src/appExtracted/appContextMenus.tsx 加两项)

**添加到容器**(需求 3):
- 前置:选中 ≥1 普通图元(容器节点自身自动忽略)
- 模型无交流容器 → antd 弹窗输入新容器名(默认「虚拟电厂1」按类型计数),创建容器节点(矩形包围选中设备,padding 24px)+ 赋 `containerId`
- 已有容器 → 弹窗:列表选已有 或 切「新建」输名称
- 归属后:容器扩展包围 + 挤出非成员

**移出容器**(需求 8):
- 前置:选中含已归属成员时显示
- 清 `containerId`(= 无容器默认态)→ 容器收缩重算 + 挤出检查
- 若移出的是某关口容器的绑定设备 → 触发自动解绑

### 拖拽判定(需求 6/9)

插入点:`createFinishNodeDrag` 提交点(`appCanvasInteractionFactories.tsx:1337` 附近),判定逻辑抽纯函数 `judgeContainerMembership`。

| 操作 | 结果 |
|------|------|
| 拖成员(不带 Alt) | 容器扩展跟随,成员不变 |
| 拖成员 + Alt 松手 | 移出,容器收缩;若是绑定设备则自动解绑 |
| 拖非成员落入容器范围(中心点判定) | 移入 + toast 提示 |
| 拖非成员 + Alt 落入 | 不移入(Alt = 本次拖动反向改变归属) |
| **拖容器节点本身** | 容器 + 全部成员整体平移,相对位置不变(决策 7) |
| 多选拖动 | 整批同判定 |

### 容器命中与点击(重要修正)

容器是巨大透明矩形,须避免遮挡成员点击:

- 容器矩形**填充 `pointer-events:none`**;描边设透明加宽命中带(约 8px),名称标签可命中
- 点内部空白 → 穿透到画布/下层;点描边或名称 → 选中容器
- LOD 简化层渲染在 detailed 层之前(`appCanvasArea.tsx:1012` vs `:1016`);容器不必强制进 detailed 集——LOD 分片构造同样经 `DeviceGlyph` 早返回容器分支,`pointer-events:none` 填充与命中带在两条路径上一致成立(2026-09-16 final review 实测后果为零,按实现对齐措辞)

### 其它交互边界

- 删除容器 → 成员 `containerId` 全清(成员保留),确认框提示「N 个成员将散出」
- 复制粘贴副本不继承归属:`buildCanvasClipboard`(`selectionActions.ts:582-591`)整节点 spread 会继承 `containerId`,须在剪贴板构建或粘贴提交处剥离;粘贴容器节点时同时剥离 `bound_device_id` 且 `is_gateway` 置 0
- 成员全移出 → 容器保留,收缩回最小尺寸 180×112,可手动删
- 框选同时命中容器与成员时,添加/移出自动只处理普通图元
- 「显示层级」右键对容器**不特殊禁用**:`containerFirstComparator` 排序恒把容器钉在底层,提升/置顶对容器只是空转(2026-09-16 final review 按实现对齐;若后续要免去空转的撤销/日志,加一句工厂短路即可)

### 成员不变量统一出口(需求 4 闭环)

新增 `enforceContainerMembership(nodes, edges)`(`src/acContainer.ts`):重算全部容器范围 + 挤出非成员。所有可能改变节点位置或增删节点的提交点收尾调用:

| 路径 | 位置 |
|------|------|
| 指针拖拽提交 | `appCanvasInteractionFactories.tsx:1337` |
| 键盘移动提交 | `createFinishKeyboardMove`(同文件独立路径) |
| 程序化加图元 | `createProgrammaticAddDevice`(`appControlFactories.tsx`) |
| SVG 模型导入 | `src/svgModelImport.ts` |
| 自动对齐 / 自动散开 / 整理连接线 | 各自批量布局提交点 |
| 粘贴提交 | `selectionActions.ts` 粘贴路径 |

## 布局算法(新模块 src/acContainer.ts)

全部纯函数,可单测:

| 函数 | 职责 |
|------|------|
| `containerBoundsForMembers(members)` | 成员包围盒(`calculateNodeVisualBounds`)+ padding 24 |
| `expandContainer` / `shrinkContainer` | 成员变化重算容器 position/size |
| `ejectOutsiders(container, allNodes)` | 容器范围内非成员(线路 kind、其它容器除外)沿最近边法向最小位移推到界外,单轮让位迭代 |
| `judgeContainerMembership(...)` | 拖拽归属判定(Alt 语义、中心点入容器) |
| `enforceContainerMembership(nodes, edges)` | 统一出口:重算范围 + 挤出,供各提交点调用 |
| `containerFirstComparator` | 容器优先排序比较器,画布与导出 SVG 共用(单源) |

`ponytail:` 挤出采用最小位移+单轮让位,存在复杂穿叠天花板;出现实际观感问题再升级避碰算法。

**沉底不写数据**(需求 4):不修改 nodes 数组顺序,在渲染排序处统一用 `containerFirstComparator`:

- 画布:`appToolbarHookFactories.tsx:2060-2064`(callback57 的 `nodeIndexById` 比较器)接入容器优先
- 导出 SVG:`src/export/svg.ts` 分层输出序(`:958-982`,分层逻辑 `:317-324`)中显式最先输出容器层
- 两处共用同一比较器,保证画布与导出同序

## E 文件导出

### 统一 E 段「容器表」(决策 3)

- 段 key `ACContainer`(ASCII,与现有段 key 风格一致,`model-eexport.ts:33-50`),中文显示名「容器表」
- `E_SECTION_COLUMNS` 加该段;`inferESection` 经 `E_KIND_SECTION_MAP`(`model-eexport.ts:344`)将 3 个容器 kind 映射至此(容器非 static,不走 `:336-340` static 分支)

| 列 | 来源 |
|----|------|
| idx | `params.idx`(复用 `assignPermanentDeviceIndex` 分段计数器) |
| 名称 | 节点名 |
| 类型 | 虚拟电厂 / 开关箱 / 配变箱 |
| 是否关口 | `params.is_gateway` |
| 绑定设备 idx | `params.bound_device_id` 解析出成员 idx |

> **语义注记(2026-09-16,Task 10 审查裁决):** `idx` 为分段计数器(每段独立,跨段可重号),单看 `bound_device_idx` 不能唯一定位成员 —— 绑定设备必为容器成员,消费方应按「容器记录 + 其成员集合(经 `containerId` 归属解析)」匹配;若下游要求唯一标识,再补 `bound_device_section` 列。

### 非关口

仅容器段一条记录;不进拓扑节点表。容器无边,`calculateElectricalTopology`(`model-routing.ts:4702`)天然不受扰。

### 模板门控(决策 6)

- 容器段**不写入**预定义模板(`server/eFileTemplates.mjs` 及模板数据不改)
- 模板模式下 `hasTemplateConfigValue && !definition` 的过滤(`model-eexport.ts:2010-2017`)照常生效 → 容器记录不输出
- 该过滤为**静默**:导出前预判模板态,容器不参与容器段生成,也不逐节点告警(`:2068-2073` 噪音规避)
- 后续若需模板态导出容器,补模板定义即可

### 关口拓扑变换(决策 4)

新纯函数 `transformGraphForGateways(nodes, edges)`,导出期图变换,画布连线不动。插入点:`buildEDeviceRecords` 入口(`model-eexport.ts:1830-1834`)在 `calculateElectricalTopology` 之前对 nodes/edges 副本做变换。(签名原写 3 参含 containers,实为 2 参、容器由 nodes 内识别,2026-09-16 按实现修正。)

规格:
1. 每个关口容器插入一个拓扑节点,**为容器合成端子**:电源侧 + 负荷侧,端子带 `nodeNumber`(拓扑节点表仅由带 nodeNumber 的端子驱动,`model-eexport.ts:1542-1564`;容器非 static,不再被 `:1552` 跳过)
2. 绑定设备电源侧上游边改接:原上游—绑定设备 变为 原上游—容器(电源侧端子)—容器(负荷侧端子)—绑定设备
3. `nodeNumber` 归岛规则与既有拓扑节点分配一致(同岛同号)
4. 绑定设备无电源侧连接 → 告警,该容器退化为仅容器段记录
5. 多关口容器并存支持(嵌套已排除,无环问题)

### 量测一致(需求 7)

**前端模型层实现**(`server/eFileExport.mjs` 无量测逻辑,仅装配 options 透传,不改):

- 关口开启且绑定设备确定时:复制绑定设备的量测组为容器量测组(nodeId = 容器 id,items 测点内容同绑定设备)
- **单向同步**:绑定设备量测组变更(增删改)时刷新容器量测组,保持「完全一致」
- 解绑 / 关闭关口 / 绑定设备移出或删除 → 删除容器量测组
- 非关口容器无量测组
- 量测组存储:`ProjectMeasurementConfig.groups` 按 nodeId 键(`src/measurements.ts:322-343`),容器量测组同构挂容器 nodeId

### CIM 导出

无需改动:容器无端子、无电压等级,CIM 构建按电压 0 跳过(`src/cim/cim-builder.ts:50-96`)。

## 涉及文件清单

| 文件 | 改动 |
|------|------|
| `src/model.ts` | 3 个 DeviceKind、ModelNode.containerId、BASE_DEVICE_LIBRARY 3 模板(不进 static 家族) |
| `src/DeviceGlyph.ts` | 3 个显式 kind 绘制分支(含 pointer-events 命中策略) |
| `src/acContainer.ts`(新) | 布局/判定/不变量/排序纯函数 + 单测 |
| `src/appExtracted/appContextMenus.tsx` | 添加到容器 / 移出容器菜单 |
| `src/appExtracted/appSelectionDragFactories.tsx` | 创建容器、归属赋值工厂 |
| `src/appExtracted/appCanvasInteractionFactories.tsx` | 拖拽归属判定接入 + 键盘移动出口 |
| `src/appExtracted/appControlFactories.tsx` | 程序化加图元后调不变量出口 |
| `src/appExtracted/appRightPanel.tsx` | 所属容器特殊行、关口/绑定参数行(仿 renderVoltageBaseRow) |
| `src/appExtracted/appToolbarHookFactories.tsx` | 排序比较器接入容器优先 |
| `src/appExtracted/appCanvasArea.tsx` | 渲染序接入(如比较器未覆盖则此处兜底) |
| `src/hooks/useBatchEditors.tsx` | 动态下拉选项(所属容器/绑定设备)、批量编辑行混合值 |
| `src/selectionActions.ts` | 剪贴板剥离 containerId/bound_device_id;粘贴后调不变量出口 |
| `src/svgModelImport.ts` | 导入后调不变量出口 |
| `src/measurements.ts` | 容器量测组复制/单向同步/删除 |
| `src/export/svg.ts` | 分层输出序中容器层最先输出 |
| `src/model-eexport.ts` | 容器段(ACContainer)、inferESection 映射、transformGraphForGateways、模板态静默过滤 |
| `src/model-eexport.test.ts`、`src/acContainer.test.ts`(新) | 测试 |

不改:`server/eFileExport.mjs`(量测在前端层)、`server/eFileTemplates.mjs`(决策 6)、`src/cim/*`(无端子无电压)。

## 测试策略

- `src/acContainer.test.ts`:包围盒/扩展/收缩/挤出/Alt 归属判定/不变量出口/排序比较器纯函数
- `src/model-eexport.test.ts` 增:容器段输出、关口替换上游(含合成端子与 nodeNumber)、非关口不进拓扑、模板态静默过滤
- `src/measurements.test.ts` 增:容器量测组复制/同步/解绑删除
- 剪贴板剥离断言(`selectionActions.test.ts`)
- 全量 `pnpm vitest run` 回归
