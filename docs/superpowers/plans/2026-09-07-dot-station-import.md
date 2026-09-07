# dot 厂站图导入实现计划（无代码块版）

> **For agentic workers:** 每任务按 TDD：先写测试（断言按各任务断言表）、跑失败、实现、跑绿、提交。建议 superpowers:subagent-driven-development 或 superpowers:executing-plans 逐任务执行。Steps 用 checkbox 跟踪。

**Goal:** 导入 powsybi SLD dot（`_write_station_dot` 产物）生成布局相当、可编辑的电气模型。

**Architecture:** 新增独立纯函数模块 `src/dotImport.ts`，四段管线：parseDot → classify → collapse → mapDotGraphToModel。UI 入口仿现有 SVG 导入管线（方案树右键菜单 + file input + 工厂函数）。连接统一建平台 Edge（母线侧端子留空）；电压等级复用 `applyVoltageInheritance` BFS 传播，变压器为电压边界。

**Tech Stack:** TypeScript + Vitest。复用 `model-node-ops` 的 createDefaultNode、`voltageInheritance` 的 applyVoltageInheritance、`model-routing` 的 createSavedProject。

**Spec:** `docs/superpowers/specs/2026-09-07-dot-station-import-design.md`

## Global Constraints

| # | 约束 |
|---|---|
| G1 | ES Modules；测试与源文件同目录；单文件测试命令 `pnpm vitest run src/dotImport.test.ts` |
| G2 | 不修改 model.ts / svgModelImport.ts；dotImport.ts 只 import 类型与既有函数 |
| G3 | 测试不写 data/ 目录；fixture UTF-8；注释中文 |
| G4 | fixture 路径见断言表 A1；来源：rtdbpy 仓库 sld 输出目录同名文件 |
| G5 | 类型判定三级：shape+fillcolor 精确匹配 → box fallback（同名 tripleoctagon=绕组端子 / SH_ 前缀=ac-capacitor / 其余=static-rect）→ point 收缩 |
| G6 | 电压值纯数字字符串（如 230）；写入复用 applyVoltageInheritance |
| G7 | 每任务 TDD 五步 + 独立 commit |
| G8 | 断言表 A0 的 fixture 断言数（250 节点/255 边）若与实跑不符，以实跑为准修正断言与计划 |

---

### Task 1: parseDot 解析器 + fixture

**Files（表格）**

| 操作 | 路径 |
|---|---|
| Create | src/dotImport.ts |
| Create | src/dotImport.test.ts |
| Copy | 望道变_6.dot → src/__fixtures__/dot/望道变_6.dot（源：rtdbpy 仓库 sld 输出目录） |

**Interfaces:**
- Produces: `parseDot(text: string): DotGraph`
- 类型：`DotNode`（字段 id、label、open、shape、fillcolor、x、y）、`DotEdge`（from、to）、`DotGraph`（stationName、stationId、nodes、edges）
- Consumes: 无

**Steps:**

1. 复制 fixture（G4）。
2. 写失败测试（断言表 A1）。
3. 跑失败。
4. 实现要点（文字直译）：
   - 三个正则：节点行、边行、Station 注释行
   - 节点行形如 `n0 [label="...", shape=rect, fillcolor=yellow, pos="615.0,307.0!"];`；label 值容忍 `\"` 转义（Python 端只转义双引号）
   - label 尾部字面 `\n[OPEN]`（反斜杠 n 字符对）转 open=true 并从 label 剥离
   - pos 剥 `!` 转数字；digraph 头与全局属性行忽略
   - 空文件/无 digraph：parseDot 不抛错，返回空 graph（错误在 Task 4 importDotFile 统一校验）
5. 跑绿。
6. Commit 消息：`feat(dotImport): parseDot 解析器——节点/边/Station/[OPEN]`

**断言表 A1（parseDot）**

| 输入 | 期望 |
|---|---|
| fixture 望道变_6.dot | stationName=望道变、stationId=6、nodes 长 250、edges 长 255（G8 以实跑为准） |
| 内联 MINI_DOT（4 节点样本） | 节点/边解析、pos 剥 `!`、`[OPEN]` 转 open 并剥离、Station 提取 |
| MINI_DOT 节点 n1 | label=SW_1、open=true；n2 open=false |
| 空字符串 | 返回空 graph（nodes=[]，edges=[]，stationName=""） |

MINI_DOT 结构（执行者据此构造内联字符串）：

| id | label | shape | fillcolor | pos |
|---|---|---|---|---|
| n0 | BBS_1 | rect | yellow | (100,300) |
| n1 | SW_1 + 字面 \n[OPEN] | invtriangle | orange | (100,250) |
| n2 | CB_1 | diamond | green | (100,200) |
| n3 | INTERNAL_VL_1_230_10 | point | black | (100,322) |
| 边 | n0→n3、n3→n1、n1→n2 | | | |

**Commit:** feat(dotImport): parseDot 解析器

---

### Task 2: 类型映射 classifyDotNode

**Files（表格）**

| 操作 | 路径 |
|---|---|
| Modify | src/dotImport.ts（追加 classify 段） |
| Modify | src/dotImport.test.ts（追加 describe 块） |

**Interfaces:**
- Consumes: DotNode、DotGraph（Task 1）
- Produces: `buildClassifyContext(graph: DotGraph): ClassifyContext`、`classifyDotNode(node: DotNode, ctx: ClassifyContext): DotNodeClass`
- 类型 `ClassifyContext`：字段 tripleLabels（Set&lt;string&gt;，tripleoctagon label 集合）
- 类型 `DotNodeClass`：三选一联合——`{ role: "device"; kind: DeviceKind; flag?: "shunt-assumed-capacitor" }`、`{ role: "collapse" }`、`{ role: "winding-terminal"; transformerLabel: string }`

**Steps:**

1. 写失败测试（断言表 A2）。
2. 跑失败（classifyDotNode 未导出）。
3. 实现要点：
   - STYLE_KIND_MAP：键为 shape 竖线 fillcolor 的字符串，九个条目按 spec §3.1 表
   - buildClassifyContext：收集 tripleoctagon 节点 label 集合
   - classifyDotNode 四分支：point→collapse；box 且 fillcolor=white→同名 tripleoctagon 即绕组端子、SH_ 前缀即 ac-capacitor 加 flag、其余 static-rect；查表命中→device；未命中→static-rect
4. 跑绿。
5. Commit 消息：`feat(dotImport): 三级类型判定 classifyDotNode`

**断言表 A2（classifyDotNode）**

| 输入节点 | 期望 class |
|---|---|
| shape=diamond, fillcolor=green | device, ac-breaker |
| invtriangle, orange | device, ac-switch |
| rect, yellow | device, ac-bus |
| ellipse, lightblue | device, ac-load |
| circle, lightgreen | device, ac-generator |
| house, lightgray | device, ac-line |
| octagon, pink | device, ac-capacitor |
| doubleoctagon, plum | device, ac-two-winding-transformer |
| tripleoctagon, thistle | device, ac-three-winding-transformer |
| point | collapse |
| box/white，label 与图内某 tripleoctagon 同名 | winding-terminal，transformerLabel=该名 |
| box/white，label 前缀 SH_ | device, ac-capacitor, flag=shunt-assumed-capacitor |
| box/white，其它 | device, static-rect |
| 未知组合（如 hexagon/purple） | device, static-rect |

**Commit:** feat(dotImport): 三级类型判定

---

### Task 3: 图收缩 collapseDotGraph

**Files（表格）**

| 操作 | 路径 |
|---|---|
| Modify | src/dotImport.ts（追加 collapse 段） |
| Modify | src/dotImport.test.ts（追加 describe 增块） |

**Interfaces:**
- Consumes: DotGraph、DotNodeClass（Task 1/2）
- Produces: `collapseDotGraph(graph: DotGraph): CollapsedDotGraph`
- 类型 `DotLink`：字段 from、to（均为**设备 label**，非 n 序号；同名多实例 label 用 label+首次出现序消歧——见规则表 R 区）
- 类型 `CollapsedDotGraph`：字段 devices（DotNode[]，代表元原值含坐标）、links（DotLink[]）、reportPart（字段 collapsedCount、selfLoopDropped、danglingEdgeDropped）

**Steps:**

1. 写失败测试（断言表 A3）。
2. 跑失败。
3. 实现要点：
   - 并查集：point 节点与所有直接邻居 union；winding-terminal box 与同名 tripleoctagon union
   - 代表元选择：设备节点（role=device）为代表元；若一组内多个设备（不应发生），取序号最小
   - 边重写：端点 n 序号 → 代表元 label；两端同代表元=自环，丢弃并计数
   - 悬空边（端点 n 序号不存在）忽略并计数
   - 设备多实例同 label：instance 序号 = 该 label 第几次以 device 角色出现，DotLink 用 label+序号定位设备
4. TDD 运行与提交。

**规则表 R（collapse）**

| # | 规则 |
|---|---|
| R1 | point 与所有直接邻居 union；两个 point 相邻则全并组，代表元为组内唯一设备；无设备整组丢弃 |
| R3 | 绕组端子 box 与同名 tripleoctagon union，代表元=tripleoctagon |
| R4 | 边重写后自环（两端同代表元）丢弃，reportPart.selfLoopDropped 计数 |
| R5 | 悬空边忽略，reportPart.danglingEdgeDropped 计数 |
| R6 | devices 保留 dot 坐标原值，坐标变换留给 Task 4 |

**断言表 A3（collapseDotGraph）**

| 输入（构造 miniGraph 辅助） | 期望 |
|---|---|
| 链 A→point→B | devices=[A,B]，links=[A-B] |
| 两 point 相邻 A→p1→p2→B | devices=[A,B]，links=[A-B] |
| 绕组端子链 开关→point→T3_box→tripleoctagon | links 收缩到 tripleoctagon 设备 |
| 自环 A→p→A | link 丢弃，selfLoopDropped=1 |
| 悬空边 n99→n100（n99 不存在） | 忽略，danglingEdgeDropped=1 |
| 望道变 fixture | devices+collapsedCount=250，links 数与实跑一致（G8） |

**Commit:** feat(dotImport): 图收缩 collapseDotGraph

---

### Task 4: 模型装配 mapDotGraphToModel + importDotFile

**Files（表格）**

| 操作 | 路径 |
|---|---|
| Modify | src/dotImport.ts（追加装配段） |
| Modify | src/dotImport.test.ts（追加 describe 块） |

**Interfaces:**
- Produces: `mapDotGraphToModel(graph: DotGraph): DotImportResult`、`importDotFile(text: string): DotImportResult`
- 类型 `DotImportResult`：字段 project（ProjectFile）、report（DotImportReport）
- 类型 `DotImportReport`：字段 deviceCount、edgeCount、kindCounts（Record&lt;DeviceKind, number&gt;）、collapsedCount、selfLoopDropped、danglingEdgeDropped、openSwitchCount、unknownStaticCount、unknownStaticNames（string[]）、shuntAssumedCapacitorNames（string[]）、voltageInferredCount
- Consumes: collapseDotGraph、classifyDotNode、createDefaultNode（model-node-ops）、applyVoltageInheritance（voltageInheritance）、ProjectFile/ModelNode/Edge 类型（model）

**Steps:**

1. 写失败测试（断言表 A4）。
2. 跑失败。
3. 实现要点（按序）：
   - collapseDotGraph 取 devices/links
   - 坐标：全图 bounding box 归零后平移 (100,100)，y 不取反
   - 设备实例化：createDefaultNode(kind, position) → 覆盖 name=label；母线宽 max(120, 连接设备 x 范围+60)；点设备 nodeNumber 已由工厂处理
   - 边构造：每 link 一条 Edge；端子分配按设备侧几何最近未占用端子（另一端坐标排序）；母线侧 terminalId 留空；edge id 用 makeId("edge") 等现有 id 工厂或自造唯一 id
   - 边端点 sourcePoint/targetPoint 填设备侧端子锚点世界坐标
   - [OPEN] 设备：ac-switch/ac-breaker 写 params.status="0"
   - 电压 BFS：母线 label 匹配 INTERNAL_VL_前缀正则取电压数字段为源；沿 links 传播；设备写 applyVoltageInheritance；遇变压器（两类）写对应端子电压后停止扩展
   - 母线电压正则：INTERNAL_VL_数字_数字_ 形式，取第二段数字
   - report 汇总
4. 跑绿。
5. Commit 消息：`feat(dotImport): 模型装配 mapDotGraphToModel + importDotFile`

**断言表 A4（mapDotGraphToModel）**

| 输入 | 期望 |
|---|---|
| MINI_DOT | 收缩后 3 设备（母线+隔离开关+断路器）、2 边 |
| 母线宽启发式 | 母线宽 ≥120，且 ≥ 连接设备 x 范围+60 |
| [OPEN] 开关 | params.status="0"；非 OPEN 开关 status="1" |
| 电压 BFS（MINI_DOT 母线前缀 230） | 母线 vbase=230、开关链设备 vbase 同为 230 |
| report.kindCounts 一致性 | Σ kindCounts = deviceCount；collapsedCount 与收缩数一致 |
| 空图 | 返回空 project（nodes=[]、edges=[]）与 report，不抛错 |

**Commit:** feat(dotImport): 模型装配

---

### Task 5: 导入入口 UI 工厂

**Files（表格）**

| 操作 | 路径 |
|---|---|
| Modify | src/appExtracted/appDeviceDefinitionFactories.tsx（追加两个工厂） |
| Modify | src/appExtracted/appContextMenus.tsx（右键菜单项） |
| Modify | src/App.tsx（input ref + scope 装配） |
| Modify | src/appDeviceDefinitionFactories.test.ts（追加工厂测试） |

**Interfaces:**
- Consumes: importDotFile（Task 4）、现有管线符号：createOpenSvgModelImportFilePicker（factories :3230）、createImportSvgModelFile（factories :3484）、svgModelImportCompletionFeedback（:3257）、commitImportedModelRecord、createSavedProject（model-routing :7002）
- Produces: `createOpenDotModelImportFilePicker(__appScope)`、`createImportDotModelFile(__appScope)`、scope 键 openDotModelImportFilePicker / importDotModelFile / dotModelImportInputRef

**Steps:**

1. 写失败测试（断言表 A5）。
2. 跑失败。
3. 实现要点（全部仿 SVG 导入对应函数）：
   - picker 工厂：requireEditMode("从 dot 生成模型") → 记录 targetSchemeId → click input
   - onChange 工厂：校验 .dot 扩展名 → 读文本 → importDotFile → createSavedProject(importedName, result.project) → 重名冲突走 setPendingModelImportConflict → commitImportedModelRecord → dotModelImportCompletionFeedback
   - importedName 取 file.name 去 .dot 后缀；导入失败 showGlobalMessage 报错，input.value 复位
   - 菜单项：appContextMenus.tsx 中「从 SVG 生成模型」按钮行后并列新增「从 dot 生成模型」按钮，onClick 调 scope.openDotModelImportFilePicker(projectMenu.schemeId ?? "")
   - App.tsx 装配：dotModelImportInputRef = useRef；hidden input accept=".dot"；Object.assign 进 __appScope
4. 跑绿（含全量回归）。
5. Commit 消息：`feat(ui): 方案树右键【从 dot 生成模型】入口`

**断言表 A5（UI 工厂）**

| 测试点 | 期望 |
|---|---|
| createOpenDotModelImportFilePicker 未编辑模式 | requireEditMode 拦截，input 不点击 |
| 编辑模式 | input.click() 被调用 |
| createImportDotModelFile 选 .dot 文件 | importDotFile 收到文件文本，产物走 createSavedProject/commitImportedModelRecord |
| 选非 .dot 文件 | showGlobalMessage 报错，不建模型 |
| 重名模型 | 走 setPendingModelImportConflict 分支 |
| 菜单项 | appContextMenus 渲染含「从 dot 生成模型」按钮（编辑模式） |

**Commit:** feat(ui): dot 导入入口

---

### Task 6: 集成测试（fixture 全链路）+ 全量回归

**Files（表格）**

| 操作 | 路径 |
|---|---|
| Modify | src/dotImport.test.ts（追加集成 describe 块） |

**Interfaces:**
- Consumes: importDotFile（Task 4）、fixture（Task 1）
- Produces: 无新 API；交付验证证据

**Steps:**

1. 写集成测试（断言表 A6）。
2. 跑 src/dotImport.test.ts 全绿。
3. 全量回归：pnpm vitest run 全套 + pnpm tsc --noEmit。
4. Commit 消息：`test(dotImport): 望道变 fixture 全链路集成测试`

**断言表 A6（fixture 集成）**

| 断言点 | 期望 |
|---|---|
| project.nodes.length | = report.deviceCount，> 0 |
| project.edges.length | = report.edgeCount，> 0 |
| kindCounts 求和 | = deviceCount |
| kindCounts 含 ac-bus | ≥1（望道变有 8+ 母线） |
| kindCounts 含 ac-breaker | ≥20（望道变断路器众多） |
| kindCounts 含 ac-switch | ≥100（隔离开关最多） |
| kindCounts 含 ac-three-winding-transformer | =2（T3_1/T3_2） |
| 三绕组绕组端子 | 不出现在 nodes（已收缩） |
| 电压等级 | 母线 vbase 非空比例 >80%；[OPEN] 设备 status=0 |
| report.unknownStaticNames | 空数组（fixture 无未知 box） |
| report.shuntAssumedCapacitorNames | 长度 8（SH_1..SH_8） |
| tsc --noEmit | 无错误 |

**Commit:** test(dotImport): 望道变全链路集成测试

---

## 自审清单（执行完成后）

| # | 检查项 |
|---|---|
| S1 | spec §3 对照表 13 行全覆盖（9 精确 + 绕组端子 + SH_ + 兜底 + point） |
| S2 | spec §4 全规则落地：收缩/坐标/端子分配/母线宽/电压 BFS/[OPEN]/名称 |
| S3 | G8 数字以实跑为准修正后，A1/A6 断言同步更新 |
| S4 | 全量 vitest + tsc 绿；git log 六个任务各自独立 commit |
| S5 | SVG 导入管线未受影响（svgModelImport 相关测试仍绿） |