# 交流容器(AC Container)设计

日期:2026-09-15
状态:已确认(设计对话 4 轮决策 + 3 节设计均经用户确认)

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

## 已定决策

| # | 问题 | 决策 |
|---|------|------|
| 1 | 容器嵌套 | 不允许(容器节点 `containerId` 恒空) |
| 2 | 拖出容器触发方式 | Alt+拖动松手移出;默认拖动为容器扩展跟随、成员不变 |
| 3 | 非关口容器的 E 形态 | 新增统一 E 段「容器表」,不进拓扑节点表 |
| 4 | 关口拓扑插入方式 | 替换上游:绑定设备电源侧上游改为容器节点 |
| 5 | 架构方案 | 方案 A:容器 = 特殊图元节点(否决:扩展 ModelGroup、复用 is_container 机制) |

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

- `BASE_DEVICE_LIBRARY` 加 3 条模板:样式抄 `static-group-box`(`model.ts:3450-3458`)——透明填充、`#64748b` 虚线描边、圆角 8、文字左上,默认 180×112,支持拖角改尺寸
- `src/DeviceGlyph.ts` 加 3 个绘制分支:容器标注自身名称于左上,风格同分组框 header

### 成员关系字段

- `ModelNode` 新增可选字段 `containerId?: string` = 所属容器**节点 id**
- 容器节点自身 `containerId` 恒空(决策 1:不嵌套);其余图元均可归属(含线路、静态图元)
- 内部存 id 不存 idx:id 稳定不受改名/重排影响;面板与 E 导出展示时再解析容器 idx + 名称。(用户原始表述为「赋值容器的 idx」,如需字面存 idx 可切换,改动点集中在读写两处)

### 容器特有参数(存容器节点 params)

| 参数 | 类型 | 说明 |
|------|------|------|
| `is_gateway` | stringEnum 0/1 | 是否作为关口设备,默认 0 |
| `bound_device_id` | string | 绑定设备(容器内成员节点 id) |

约束:
- 开启关口时未绑定 → 面板强制先选绑定设备
- 绑定设备被移出容器或删除 → 自动解绑并关闭关口,弹提示

### 「所属容器」面板行(需求 1)

右侧面板模型页(`appRightPanel.tsx:1062-1112` 属性行区顶部)插入一行:

- 下拉选项 = 当前模型全部容器节点,显示「名称 (idx)」
- 默认空 = 「无(当前模板)」
- 多选时显示公共值,不一致显示「混合」
- 切换即写 `node.containerId`

## 交互

### 右键菜单(src/appExtracted/appContextMenus.tsx 加两项)

**添加到容器**(需求 3):
- 前置:选中 ≥1 普通图元(容器节点自身自动忽略)
- 模型无交流容器 → antd 弹窗输入新容器名(默认「虚拟电厂1」按类型计数),创建容器节点(矩形包围选中设备,padding 24px)+ 赋 `containerId`
- 已有容器 → 弹窗:列表选已有 或 切「新建」输名称
- 归属后:容器扩展包围 + 挤出非成员

**移出容器**(需求 8):
- 前置:选中含已归属成员时显示
- 清 `containerId`(= 归属重置为空/当前模板)→ 容器收缩重算 + 挤出检查

### 拖拽判定(需求 6/9)

插入点:`createFinishNodeDrag` 提交点(`appCanvasInteractionFactories.tsx:1337` 附近),判定逻辑抽纯函数 `judgeContainerMembership`。

| 操作 | 结果 |
|------|------|
| 拖成员(不带 Alt) | 容器扩展跟随,成员不变 |
| 拖成员 + Alt 松手 | 移出,容器收缩 |
| 拖非成员落入容器范围(中心点判定) | 移入 + toast 提示 |
| 拖非成员 + Alt 落入 | 不移入(Alt = 本次拖动反向改变归属) |
| 多选拖动 | 整批同判定 |

### 其它交互边界

- 删除容器 → 成员 `containerId` 全清(成员保留),确认框提示「N 个成员将散出」
- 复制粘贴副本不继承归属;落点在容器内则走统一移入判定
- 成员全移出 → 容器保留,收缩回最小尺寸 180×112,可手动删
- 框选同时命中容器与成员时,添加/移出自动只处理普通图元
- 自动对齐/自动散开/整理连接线等批量布局:成员位置变化后统一走容器重算出口
- 「显示层级」右键对容器节点禁用(恒底层,见下)

## 布局算法(新模块 src/acContainer.ts)

全部纯函数,可单测:

| 函数 | 职责 |
|------|------|
| `containerBoundsForMembers(members)` | 成员包围盒(`calculateNodeVisualBounds`)+ padding 24 |
| `expandContainer` / `shrinkContainer` | 成员变化重算容器 position/size |
| `ejectOutsiders(container, allNodes)` | 容器范围内非成员(线路 kind、其它容器除外)沿最近边法向最小位移推到界外,单轮让位迭代 |
| `judgeContainerMembership(...)` | 拖拽归属判定(Alt 语义、中心点入容器) |

`ponytail:` 挤出采用最小位移+单轮让位,存在复杂穿叠天花板;出现实际观感问题再升级避碰算法。

**沉底不写数据**(需求 4):渲染期强制容器节点排 nodes 数组前(先绘制 = 底层),`appCanvasArea.tsx:1016` 渲染序与导出 SVG 同一排序,天然一致;不修改 nodes 数组顺序。

## E 文件导出

### 统一 E 段「容器表」(决策 3)

`E_SECTION_COLUMNS`(`model-eexport.ts:33`)加新段;`inferESection` 将 3 个容器 kind 映射至该段。

| 列 | 来源 |
|----|------|
| idx | `params.idx`(复用 `assignPermanentDeviceIndex` 分段计数器) |
| 名称 | 节点名 |
| 类型 | 虚拟电厂 / 开关箱 / 配变箱 |
| 是否关口 | `params.is_gateway` |
| 绑定设备 idx | `params.bound_device_id` 解析出成员 idx |

### 非关口

仅容器段一条记录;不进拓扑节点表(`buildTopologyNodeDevices` 排除容器 kind)。容器无边,`calculateElectricalTopology`(`model-routing.ts:4702`)天然不受扰。

### 关口拓扑变换(决策 4)

新纯函数 `transformGraphForGateways(nodes, edges, containers)`,导出期图变换,画布连线不动:

1. 每个关口容器插入一个拓扑节点
2. 绑定设备电源侧上游边改接:原上游—绑定设备 变为 原上游—容器—绑定设备
3. 绑定设备无电源侧连接 → 告警,该容器退化为仅容器段记录
4. 多关口容器并存支持(嵌套已排除,无环问题)

### 量测一致(需求 7)

`server/eFileExport.mjs` 装配点对关口容器复制绑定设备量测组,测点归属改为容器;非关口容器无量测。

### 模板门控

与 `eDeviceTemplateTypePolicy` 对齐:模板模式下容器段按 `interfaceDefinitionBySection` 定义输出;默认模板含容器段。

## 涉及文件清单

| 文件 | 改动 |
|------|------|
| `src/model.ts` | 3 个 DeviceKind、ModelNode.containerId、BASE_DEVICE_LIBRARY 3 模板、组件库映射(:790) |
| `src/DeviceGlyph.ts` | 3 个绘制分支 |
| `src/acContainer.ts`(新) | 布局/判定纯函数 + 单测 |
| `src/appExtracted/appContextMenus.tsx` | 添加到容器 / 移出容器菜单 |
| `src/appExtracted/appSelectionDragFactories.tsx` | 创建容器、归属赋值工厂 |
| `src/appExtracted/appCanvasInteractionFactories.tsx` | 拖拽归属判定接入 |
| `src/appExtracted/appRightPanel.tsx` | 所属容器下拉行、关口/绑定参数行 |
| `src/appExtracted/appCanvasArea.tsx` | 渲染期容器沉底排序 |
| `src/model-eexport.ts` | 容器段、inferESection、transformGraphForGateways、拓扑排除 |
| `server/eFileExport.mjs` | 关口量测复制 |
| `src/model-eexport.test.ts`、`src/acContainer.test.ts`(新) | 测试 |

新 kind 全链路排查清单:`model.ts:790` 组件库映射、`model-routing`、`svgExport`、`EFileEditor`、`runtimeSnapshot`、自动对齐/散开回调。

## 测试策略

- `src/acContainer.test.ts`:包围盒/扩展/收缩/挤出/Alt 归属判定纯函数
- `src/model-eexport.test.ts` 增:容器段输出、关口替换上游、量测复制、非关口不进拓扑
- `judgeContainerMembership` 单测
- 全量 `pnpm vitest run` 回归
