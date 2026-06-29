# swigger 控制台写操作 API 需求规格（/api/v1/control + WS 双向）

> 阶段：需求发现（brainstorm）。本文档仅描述**需求**，不含架构决策、API 契约或实现代码。
> 后续：`/sc:design` 出架构与接口契约，`/sc:workflow` 出实现计划。

## 0. 决策基线（已与用户确认）

| 决策项 | 选择 | 含义 |
|--------|------|------|
| 执行路径 | **全走 WS 双向** | 所有写操作经 WS 下发指令到前端 `__appScope` 执行，server 仅作指令中转与回执 |
| 测试形态 | **仅自动化测试** | vitest 端到端，新增方案→新增模型→测试各写 API→用只读查询 API 断言 |
| 控制界面位置 | **内嵌控制台分组** | 在现有 `/swigger` 页面内新增"控制台"分组，复用现有样式与信封渲染 |
| 持久化策略 | **写操作只改运行时内存，另新增"保存"API 实现自动保存** | 写 API 默认不落盘；新增独立的 `save` API 触发后端持久化 |

## 1. 用户目标

在 `/swigger` 接口文档页新增**控制台**入口，使第三方（或测试人员）能通过 HTTP API + WS 双向通道，**远程控制运行中的前端画布**，完成方案/模型的创建与图元级编辑，并以自动化测试验证每一步操作的正确性。

具体操作清单（用户原始诉求）：

1. 新增方案
2. 新增模型
3. 根据名称或 ID 选中一个或多个图元
4. 多个图元进行组合
5. 组合图元保存为模板
6. 修改图元属性（图形属性、模型属性、量测属性）
7. 新增图元
8. 删除图元
9. 保存（将运行时内存改动持久化到后端）

## 2. 范围与约束

| 项 | 约束 |
|----|------|
| 通道 | 图元级操作 + 方案/模型管理**全部经 WS 双向指令**执行（前端在线为前提） |
| API 风格 | 复用 v1 信封 `{ok:true,data}` / `{ok:false,error:{code,message}}` |
| 写语义 | 写操作**只改前端运行时内存**，不自动落盘；落盘由独立的 `save` API 触发 |
| 前端依赖 | 写操作复用前端 `__appScope` 已有能力（`createSchemeRecord`、`createBlankProject`、`groupSelectedGraphics`、`saveCustomDeviceTemplate`、`deleteSelection`、`setNodes`/`patchGraphNodes`、量测/属性 CRUD 等），不重造 |
| 客户端绑定 | 所有写操作定向到**一个在线前端客户端**（runtime WS 已支持多客户端注册表，需选定目标 clientId） |
| 界面 | 控制台分组内嵌 `/swigger`，与现有接口文档同页，复用 Try-it 与信封渲染样式 |
| 测试 | vitest 自动化端到端，断言来源为现有**只读查询 API**（runtime/schemes/library） |

### 2.1 现状基线（已存在能力，可复用）

| 能力 | 位置 | 复用方式 |
|------|------|----------|
| WS 注册表 + `fetchFromClient` | `server/runtimeWs.mjs:52-131` | 扩展为双向指令通道（新增 `command`/`command-response` 消息类型） |
| 前端 WS 客户端 | `src/runtimeWsClient.ts:80-135` | 扩展 `onmessage` 处理 `command` 类型，调用 `__appScope` 方法并回执 |
| 前端 `fetchHandler` 注册点 | `src/App.tsx:5938-5955` | 旁路新增 `commandHandler` 注册点 |
| 前端写方法 | `__appScope`（`src/App.tsx:550`） | 直接复用，不新增前端业务逻辑 |
| v1 路由框架 | `server/apiV1Runtime.mjs:165-178` | 新增 `control` 域路由，handler 内调 WS 下发指令 |
| /swigger 元数据 | `server/swaggerPage.mjs:14-166` `ENDPOINTS` | 新增"控制台"分组条目 |
| 只读验证 API | `apiV1Runtime` / `apiV1Schemes` | 测试断言来源 |

## 3. 功能需求

### FR-1 控制通道（WS 双向指令）

| ID | 需求 |
|----|------|
| FR-1.1 | server 端 WS 协议新增**指令下发**消息类型（区别于现有只读 `fetch`），携带 `command` 名 + 参数 + 请求 ID |
| FR-1.2 | 前端 WS 客户端新增**指令执行**处理：收到指令 → 调 `__appScope` 对应方法 → 回执 `command-response`（含成功/失败 + 结果数据 + 请求 ID） |
| FR-1.3 | server 端新增指令中转函数：HTTP handler → 选定 clientId → 下发指令 → 等待回执 → 包装信封返回 |
| FR-1.4 | 指令需带**超时**与**目标客户端不存在/离线**的错误码 |
| FR-1.5 | 指令命名空间统一，建议 `control.*`（如 `control.scheme.create`、`control.device.add`） |

### FR-2 方案/模型管理（经 WS 指令）

| ID | 需求 | 复用前端方法 |
|----|------|--------------|
| FR-2.1 | 新增方案（可指定父方案，支持嵌套） | `createSchemeRecord` |
| FR-2.2 | 新增模型（在指定方案下创建空白画布项目） | `createBlankProject` |
| FR-2.3 | 新增方案/模型**只改运行时内存**，不落盘 | — |

### FR-3 图元级操作（经 WS 指令）

| ID | 需求 | 复用前端方法 |
|----|------|--------------|
| FR-3.1 | 按名称或 ID 选中一个或多个图元（支持多选） | 选中态 setter（需确认 `__appScope` 暴露的选中方法） |
| FR-3.2 | 多图元组合 | `groupSelectedGraphics` |
| FR-3.3 | 组合图元保存为模板 | `saveCustomDeviceTemplate` |
| FR-3.4 | 修改图元属性——图形属性 | `patchGraphNodes` / `updateGraphNodeById` |
| FR-3.5 | 修改图元属性——模型属性 | `patchGraphNodes` / `updateGraphNodeById` |
| FR-3.6 | 修改图元属性——量测属性 | `addMeasurementItemToNode` / `removeMeasurementsFromNode` 等 |
| FR-3.7 | 新增图元（指定类型/位置/属性） | `setNodes` / `patchGraphNodes`（需封装"新增单图元"语义） |
| FR-3.8 | 删除图元（当前选中或指定 ID） | `deleteSelection` |
| FR-3.9 | 图元级操作**只改运行时内存**，压入 undo 栈 | `pushUndoSnapshot` |

### FR-4 保存（持久化）

| ID | 需求 | 复用前端方法 |
|----|------|--------------|
| FR-4.1 | 新增 `save` API，触发将当前运行时方案树/模型写回后端文件系统 | `saveSchemeTreeToBackend` / `saveCurrentProject` |
| FR-4.2 | `save` 可指定范围：当前模型 / 整棵方案树 | — |
| FR-4.3 | `save` 经 WS 指令执行，回执含落盘结果 | — |

### FR-5 swigger 控制台界面

| ID | 需求 |
|----|------|
| FR-5.1 | `/swigger` 页面左侧导航新增"控制台"分组 |
| FR-5.2 | 控制台分组下列出所有写操作端点（FR-2/FR-3/FR-4），与现有接口卡片同风格 |
| FR-5.3 | 每个写端点卡片支持 Try-it：填参数 → 选择目标 clientId → 发送 → 展示 Request/Response 信封 |
| FR-5.4 | 控制台需显式提示"需在线前端客户端"，并在无客户端时给出明确错误 |

### FR-6 自动化测试方案

| ID | 需求 |
|----|------|
| FR-6.1 | vitest 端到端测试，**先新增方案、再新增模型**，在新模型上下文中测试其余写 API |
| FR-6.2 | 每个写 API 执行后，**用现有只读查询 API 验证结果**： |
| | - 新增方案 → `GET /api/v1/schemes` 断言方案树含新方案 |
| | - 新增模型 → `GET /api/v1/schemes/models` 断言含新模型 |
| | - 选中/组合/增删图元 → `GET /api/v1/runtime/devices` 断言设备清单变化 |
| | - 修改属性 → `GET /api/v1/runtime/devices`（或 model/json）断言属性值 |
| | - 保存模板 → `GET /api/v1/library/templates` 断言含新模板 |
| | - save → `GET /api/v1/schemes/model/json` 断言已落盘 |
| FR-6.3 | 测试用 `GRAPH_MODEL_DATA_DIR` 指向 tmpdir 隔离 |
| FR-6.4 | 测试需模拟在线前端客户端（或启动真实前端 WS 连接）以承接 WS 指令 |

## 4. 非功能需求

| 项 | 要求 |
|----|------|
| 一致性 | 写 API 信封、错误码、路由风格与现有 v1 只读 API 一致 |
| 安全 | 控制台写操作仅限本地/受信环境（与现有 /swigger 同信任域）；指令需校验 clientId 有效 |
| 可观测 | 指令下发/回执/超时在 swigger Try-it 中可见 |
| 兼容 | 不破坏现有只读 v1 API 与 WS 只读查询通道 |
| 幂等 | 重复选中同一图元、重复组合等不应产生副作用（由前端方法语义保证） |

## 5. 开放问题（design 阶段已核实/确认）

| ID | 问题 | 结论 |
|----|------|------|
| Q-1 | 选中图元：`__appScope` 是否直接暴露选中态 setter？ | ✅ 已暴露 `setSelectedNodeIds`（App.tsx:810），直接复用 |
| Q-2 | 新增图元：是否有 `addDevice` 简单方法？ | ❌ 无。需新增 `programmaticAddDevice(kind,x,y,attrs?)`，kind 限定内置 DeviceKind，attrs 从 deviceDefinition 取默认（C-2） |
| Q-3 | 多客户端场景如何选定目标 clientId？ | 默认最近活跃，多选不强制（C-4） |
| Q-4 | save 范围：当前模型 vs 整棵方案树？ | `control.save` 支持 `scope:"currentModel"\|"schemeTree"` |
| Q-5 | 测试如何承接 WS 指令？ | Playwright 浏览器端到端，起真实前端（C-1） |
| Q-6 | 组合保存为模板需哪些参数？ | 自动推导端子+图标，调用方只传 name + componentType（C-3） |

> 详见 `DESIGN_SWIGGER_CONTROL_API.md` §8 决策点。

## 6. 验收标准

| ID | 标准 |
|----|------|
| AC-1 | `/swigger` 页面可见"控制台"分组，含 FR-2/3/4 全部端点卡片，可 Try-it |
| AC-2 | 经控制台可完成：新增方案→新增模型→选中→组合→保存模板→改属性→新增图元→删除图元→save 全链路 |
| AC-3 | 每步写操作后，对应只读查询 API 能验证结果正确 |
| AC-4 | 写操作默认不落盘；仅调用 save API 后后端文件系统出现对应文件 |
| AC-5 | 无在线客户端时，写 API 返回明确错误码而非静默失败 |
| AC-6 | vitest 自动化测试全绿，覆盖 FR-6 全部断言 |
| AC-7 | 现有只读 v1 API 与 WS 只读通道行为不受影响（回归绿） |

## 7. 下一步

- `/sc:design`：产出 WS 双向指令协议契约、control 域 HTTP 路由契约、`__appScope` 桥接方法清单、swigger 控制台 UI 结构。
- `/sc:workflow`：产出实现计划（含测试先行顺序）。
