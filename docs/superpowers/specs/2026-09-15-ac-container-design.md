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

| kind | 名称 | 库分类(categoryLibrary) | 类(component library,自动推导) |
|------|------|--------------------------|--------------------------------|
| `ac-vpp-box` | 虚拟电厂 | 交流设备 | ACContainer |
| `ac-switch-box` | 开关箱 | 交流设备 | ACContainer |
| `ac-distribution-box` | 配变箱 | 交流设备 | ACContainer |

图元库分类树按「categoryLibrary → 类(`inferESection` 推导)→ 元件」分层渲染(`appRenderBatch.tsx`、`appPersistenceLibraryExport.tsx`),归类零注册成本。界面类名经 `COMPONENT_LIBRARY_LABELS` 显示为「交流容器 / ACContainer」,E 段名仍为「容器表」(两表有意分叉,各自有断言锁定)。

> **归类修正(2026-09-16 用户验收反馈):** 原实现建了独立顶层 categoryLibrary「交流容器」,与需求 2 原文「**交流设备**添加新的类【交流容器】」不符;已改归 `categoryLibrary: "交流设备"`,树层次呈「交流设备 > 交流容器 > 虚拟电厂/开关箱/配变箱」,且落入 PROTECTED 类别库(免「删除类别库」风险)。

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
- 单选弹窗(2026-09-16 二次验收:原「有容器选列表 / 无容器输名字」两级 Modal 合并为一档):
  下拉1 = 容器类型(虚拟电厂 / 开关箱 / 配变箱,默认虚拟电厂);
  下拉2 = 名称 —— 候选 = 所选类型的已有容器(label 用 `名称 (idx)`,与面板下拉同源),**选中即加入该容器**;
  输入清单以外的名字(键盘输入即生效,不必先点下拉项)= **新建该类型容器**;
  该类型无容器时名称预填默认名(「虚拟电厂1」按类型计数),直接确定即创建
- 切类型:名称下拉候选刷新为该类型的已有容器 + 名称重置(该类型已有容器则优先选中第一个,否则填默认名)
- 创建容器节点(矩形包围选中设备,内侧留白 24px)+ 赋 `containerId`
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
| 拖非成员落入容器范围(包围盒间距 < 排斥带 50) | **排斥:弹回容器矩形外**(沿最近边推到间隙 = 50),不写归属 |
| 拖非成员 + Alt 落入 | 移入 + toast 提示(Alt = 双向归属变更键:拖入 / 拖出) |
| **拖容器节点本身** | 容器 + 全部成员整体平移,相对位置不变(决策 7) |
| 多选拖动 | 整批同判定 |

> 2026-09-16 用户验收变更(需求「交流容器和容器外设备之间要相互排斥;设备按 Alt 拖动可拖入/拖出容器」):
> 上表两行按新口径更新 —— 归属变更只在 Alt 拖动下发生,非 Alt 落入容器 = 弹出。
> 拖动**过程中**不做实时阻挡,松手才判定弹出(与既有架构一致:拖动期间不跑容器 enforce)。
>
> 2026-09-16 二次验收变更(排斥统一到全入口):粘贴 / 模板落点 / 图元库放置 / control addDevice /
> SVG 导入 / 批量布局(对齐 / 分布 / 自动对齐 / 自动散开)与拖动同口径 —— 设备落进**已有**容器矩形
> 一律弹回框外、不写归属(原先「显式落点=意图,非拖动入口落入即移入」的分叉作废)。
> 唯一例外:目标容器是本批**新增**的(`addedContainerIds`,整组粘贴容器+成员 / SVG 导入整模型重建)时按落点入组 ——
> 排斥的语义是「外来设备 vs 已有容器」,同批重建不算外来,否则导入图的容器恒空、成员被弹飞。
> 豁免键**不认**「本批被移动的容器」:多选拖动与批量布局里容器本身也在移动集内,按移动集豁免会让设备落进这些既有容器时不排斥。
>
> 2026-09-16 三次验收变更(用户参数改动「距离从 25 改成 100」,当日**二次调整为 50**):**内侧留白与外侧排斥带拆成两个常量** ——
> `CONTAINER_PADDING = 24`(容器矩形 = 成员包围盒 + 该留白,只管容器贴成员的紧密度,不变)与
> `CONTAINER_CLEARANCE = 50`(排斥带:`withinClearance` / `pushBoundsOutOfRect` / 拖动排斥 / 挤出消费;先定 100,同日用户改口 50)。
> 连带后果:容器拟合出的 24 间距不再自动免疫 —— 落在 50 带内的未归属设备一律被推到间隙 50(存量图首次 enforce 尤为明显)。

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
| `ejectOutsiders(container, allNodes)` | 非成员(线路 kind、其它容器、静态、已归属除外)与容器矩形**间隙 < 50(`CONTAINER_CLEARANCE`)**即沿最近边推出,推出目标 = 间隙恰 50;单轮让位迭代**(2026-09-16 用户反馈改口径:原为中心点入矩形判定 + 中心出界,会导致「覆盖一半才挤、本体仍压框」)** |
| `judgeContainerMembership(...)` | 拖拽归属判定(Alt 语义;**排斥判定同用包围盒间隙 < `CONTAINER_CLEARANCE`**;Alt 移入仍按中心落进矩形) |
| `enforceContainerMembership(nodes, edges)` | 统一出口:重算范围 + 挤出,供各提交点调用 |
| `containerFirstComparator` | 容器优先排序比较器,画布与导出 SVG 共用(单源) |

`ponytail:` 挤出采用最小位移+单轮让位,存在复杂穿叠天花板;出现实际观感问题再升级避碰算法。

### 布局里的容器语义(2026-09-16 二次验收)

> 用户裁决:【自动对齐/散开】时先对容器内设备执行,再把容器作为整体参与整个模型的【自动对齐/散开】;
> 对齐/分布**选中容器 → 容器作为整体参与**;**选中容器内设备 → 仅设备参与,容器随设备而动**。

| 入口 | 容器角色 |
|------|----------|
| 对齐 / 分布(选中集语义) | 选中集含容器 → 容器与其**全部成员**(含未被选中的)合并成一个整组单元参与,相对位置不变;仅选中成员 → 成员各自参与,容器随后由 `enforceContainerMembership` 的 `fitContainerToMembers` 跟随 |
| 自动对齐 / 自动散开(整层语义) | 两阶段:① 每个容器内成员单独跑一次同款布局(容器不动);② 容器作为整体单元参与全层布局 |

实现:`src/selectionActions.ts` 新增 `mergeContainerLayoutUnits`(整组合并;单元包围盒取「容器 ∪ 全部成员」并集 ——
阶段 1 刚挪过成员时容器节点尚未重算,只取容器矩形会漏掉成员新位置)与 `arrangeContainerInteriors`(阶段 1,逐容器跑 `unitLayout`);
调用点 `createApplySelectedNodeLayout`、`createAutoAlignCanvasGraphics`、`createAutoSpreadCanvasGraphics` 三处。

与「排斥」不冲突:整组参与保证成员随容器平移(成员走 `containerId` 分支,不触发排斥);非成员设备被布局摆进容器矩形仍按全入口口径弹回。

**沉底不写数据**(需求 4):不修改 nodes 数组顺序,在渲染排序处统一用 `containerFirstComparator`:

- 画布:`appToolbarHookFactories.tsx:2060-2064`(callback57 的 `nodeIndexById` 比较器)接入容器优先
- 导出 SVG:`src/export/svg.ts` 分层输出序(`:958-982`,分层逻辑 `:317-324`)中显式最先输出容器层
- 两处共用同一比较器,保证画布与导出同序

## 线路避让豁免(2026-09-16 用户验收补充)

- 容器**默认是线路避让(routing avoidance)的障碍物**:与容器无关的线路仍绕开容器矩形
- **豁免规则:当某线路的端点(至少一端)连接的节点属于该容器(`containerId === 容器节点 id`)时,该线路豁免对该容器的避让**,可穿框连接容器内设备(单源:`nodesExcludingEndpointContainers`,model.ts)
- **存量回填**:打开既有模型(`createLoadSavedProject`)与 SVG 导出(`buildSvgDocument`)时,对此类连线按新规则重算(`rebuildContainerExemptConnectionRoutes`,幂等短路)——
  - 已知副作用:曾手工调整过折点的此类连线会被重算覆盖(盘上数据无法区分手工折点与自动快照;只改内存、随保存落盘)
  - 设备型线路(`ac-routable-line` 等节点)的存量路径不回填(其路径属用户绘制形状,更保守)

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
