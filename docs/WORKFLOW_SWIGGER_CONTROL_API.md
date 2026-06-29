# swigger 控制台写操作 API 实现任务分解（/api/v1/control）

> 阶段：实现规划（workflow）。承接 `REQUIREMENTS_SWIGGER_CONTROL_API.md` + `DESIGN_SWIGGER_CONTROL_API.md`。
> 本文档为任务清单，按依赖序排列。每任务含：范围、产出文件、依赖、验收（测试）。

## 核查结论（已定决策）

| 决策项 | 结论 |
|--------|------|
| 执行路径 | 全走 WS 双向指令（server→前端 `__appScope` 程序化方法→回执） |
| UI 写方法 | 不直接复用（prompt/alert/draft/editMode 阻塞）；新增 `programmatic*` 方法复用底层 setter |
| 持久化 | 写操作只改内存；独立 `control.save` 指令触发落盘 |
| 通道骨架 | 复用 runtimeRegistry pending 机制（与 fetch 通道同构，5s 超时 + NoOnlineClientError） |
| 测试 | Playwright 浏览器端到端，起真实前端（C-1） |
| device.add | kind 限 DeviceKind 枚举，attrs 从 deviceDefinition 取默认，可 override（C-2） |
| saveFromSelection | 自动推导端子+图标，调用方只传 name+componentType（C-3） |
| clientId | 默认最近活跃，多选不强制（C-4） |
| undo | 图元级压栈，方案/模型不压（C-5） |
| 路由装配 | `image-server.mjs:3085` v1Routes 追加 `...v1ControlRoutes`；handler 在 `3109` 后创建 |

## 阶段划分

| 阶段 | 任务 | 目标 |
|------|------|------|
| P0 通道骨架 | T1-T3 | registry command 机制 + WS 双向 + 前端 command 分支 |
| P1 首个端点验证骨架 | T4-T6 | programmaticAddDevice + control.device/add + Playwright 骨架 |
| P2 方案/模型管理 | T7 | scheme.create + model.create（不压栈） |
| P3 图元级操作 | T8-T11 | select / group / delete / property.update（压栈） |
| P4 模板与保存 | T12-T13 | saveFromSelection + save |
| P5 swigger UI | T14 | 控制台分组 + 9 端点卡片 + 示例期望 |
| P6 收尾 | T15 | 全量回归 + 文档同步 |

---

## P0 通道骨架

### T1：registry command 机制
**范围**：`server/runtimeRegistry.mjs` 新增 `commandFromClient(clientId, requestId, name, params, sendCommand)` 与 `resolveCommand(clientId, requestId, ok, data, error)`，与 `fetchFromClient`/`resolveFetch` 平行。新增 `CommandTimeoutError`（code `ws-timeout`，超时 5s 复用 `FETCH_TIMEOUT_MS`）。pending 复用 `entry.pendingFetches` 同 Map（requestId 全局唯一不冲突）或新增 `pendingCommands` Map。
**产出**：`server/runtimeRegistry.mjs`
**依赖**：无
**验收**：扩 `server/runtimeRegistry.test.mjs`：command 下发→回执 resolve data；超时 reject `CommandTimeoutError`；客户端离线 reject `NoOnlineClientError`；未注册回执 `resolveCommand` 返回 false。

### T2：WS command-response 分支 + sendCommandToClient
**范围**：`server/runtimeWs.mjs` 消息 switch（:76 fetch-response 旁）新增 `"command-response"` 分支 → `registry.resolveCommand(clientId, requestId, ok, data, error)`。导出 `sendCommandToClient(clientId?, name, params)`：生成 requestId → `registry.commandFromClient` → 发 `{type:"command",requestId,name,params}` → 返回裸 data / reject 带 `.code`。
**产出**：`server/runtimeWs.mjs`
**依赖**：T1
**验收**：扩 `server/runtimeWs.test.mjs`：模拟前端连入 register → server 调 `sendCommandToClient` → 前端回 `command-response` → server resolve；前端不回 → 5s 超时 reject。

### T3：前端 command 分支 + commandHandler 注册
**范围**：`src/runtimeWsClient.ts` `onmessage`（:120）新增 `"command"` 分支：调注入的 `commandHandler(name, params)` → 成功回 `{type:"command-response",requestId,ok:true,data}`，失败回 `{ok:false,error:{code,message}}`。`createRuntimeWsClient` 增 `commandHandler` 可选参数。`src/App.tsx` WS useEffect（:5938 附近）注册 `commandHandler`，按 `name` 分发到 `__appScopeRef.current` 程序化方法；未知 name 返回 `{code:"unknown-command"}`。
**产出**：`src/runtimeWsClient.ts`、`src/App.tsx`
**依赖**：T2
**验收**：扩 `src/runtimeWsClient.test.ts`：收到 `command` → 调 commandHandler → 回执正确；commandHandler 抛错 → 回执 ok:false。`pnpm tsc --noEmit` 绿。

---

## P1 首个端点验证骨架

### T4：programmaticAddDevice 方法
**范围**：新建 `src/appExtracted/appControlFactories.tsx`，导出 `createProgrammaticAddDevice(__appScope)`。实现：校验 `kind` ∈ DeviceKind → 从 `deviceDefinitionOverrides`/内置 deviceDefinition 取默认节点模板 → 构造 ModelNode（id 用现有 id 生成器，位置 x/y，attrs override 合并）→ `pushUndoSnapshot()` + `patchGraphNodes`（追加）→ 返回 `{id}`。名称重复/非法 kind 抛错。装配到 `__appScope`（`App.tsx`）。
**产出**：`src/appExtracted/appControlFactories.tsx`、`src/App.tsx`
**依赖**：T3
**验收**：`pnpm tsc --noEmit` 绿；单元测试 `src/appControlFactories.test.tsx`：合法 kind 返回 id 且 nodes +1；非法 kind 抛错；attrs override 生效。

### T5：control.device/add 端点
**范围**：新建 `server/apiV1Control.mjs`，handler `handleControlDeviceAdd`：校验 body（kind 必填，x/y 数值）→ `runtimeWs.sendCommandToClient(clientId, "control.device.add", {kind,x,y,attrs})` → 包装 v1 信封。路由表 `v1ControlRoutes`（method POST）。`image-server.mjs:3085` 追加 `...v1ControlRoutes`（动态 import），`:3109` 后 `v1ControlRoutes = createV1ControlRoutes(runtimeWs)`。
**产出**：`server/apiV1Control.mjs`、`server/image-server.mjs`
**依赖**：T4
**验收**：`server/apiV1Control.test.mjs`（mock sendCommandToClient）：参数缺失→400 `bad-request`；无在线客户端→503 `no-online-client`；成功→`{ok:true,data:{id}}`。

### T6：Playwright 端到端骨架
**范围**：新建 `e2e/` 目录。`e2e/controlHarness.mjs`：启 image-server（`GRAPH_MODEL_DATA_DIR`=tmpdir）+ Vite preview/dev + Playwright page → 导航前端 → 等待 RT-WS 在线（轮询 `GET /api/v1/runtime/clients` 非空或 page 内指示灯）。`e2e/apiV1Control.e2e.test.mjs`：用 T5 端点 add 一个 busbar → `GET /api/v1/runtime/devices` 断言设备数 +1。需装 `@playwright/test`（dev）+ 浏览器。
**产出**：`e2e/controlHarness.mjs`、`e2e/apiV1Control.e2e.test.mjs`、`package.json`（+`@playwright/test`）
**依赖**：T5
**验收**：`pnpm vitest run e2e/`（或独立 script）绿：真实前端经 WS 收到 add 指令 → 画布出现新图元 → 只读 API 可见。**这是骨架打通的关键验收点**。

---

## P2 方案/模型管理

### T7：scheme.create + model.create（不压栈，C-5）
**范围**：`appControlFactories.tsx` 增 `createProgrammaticCreateScheme`（复用 `createSavedScheme`+`setSchemes`+`insertChildSavedScheme`，不 prompt/editMode/落盘，返回 `{id,name,path}`）、`createProgrammaticCreateBlankProject`（复用 `createSavedProject`+`upsertSavedProjectInScheme`+`requestLoadSavedProject`，名称重复抛错，返回 `{id,name,schemeId}`）。`apiV1Control.mjs` 增 `control.scheme.create`/`control.model.create` 路由。commandHandler 分发。
**产出**：`src/appExtracted/appControlFactories.tsx`、`server/apiV1Control.mjs`、`src/App.tsx`
**依赖**：T6
**验收**：扩 `apiV1Control.test.mjs`；扩 e2e：add scheme→`GET /api/v1/schemes` 含新方案；add model→`GET /api/v1/schemes/models` 含新模型。

---

## P3 图元级操作

### T8：devices.select + devices.group（压栈，C-5）
**范围**：`programmaticSelectDevices(ids, mode)`（复用 `setSelectedNodeIds`，mode set/add/toggle 合并）、`programmaticGroupSelected()`（复用 `createCanvasGroupFromSelection`+`setGroups`+`pushUndoSnapshot`，无选中抛 `control-failed`）。两个端点 + 分发。
**产出**：同 T7 三文件
**依赖**：T7
**验收**：e2e：add 两图元→select 两 id→`GET /api/v1/runtime/selection` 断言选中数=2；group→`GET /api/v1/runtime/devices` 断言出现 group。

### T9：device.delete（压栈）
**范围**：`programmaticDeleteDevices(ids?)`（ids 缺省用当前选中；复用按 id 删节点+关联边 + `pushUndoSnapshot`）。端点 + 分发。
**产出**：同上
**依赖**：T8
**验收**：e2e：delete 某 id→`GET /api/v1/runtime/devices` 断言设备数 -1。

### T10：device.property.update（压栈，category 分流）
**范围**：`programmaticUpdateDeviceProperty(id, category, patch)`：category="graphic"|"model" → `patchGraphNodes`/`updateGraphNodeById`；category="measurement" → 量测 CRUD（`addMeasurementItemToNode`/`removeMeasurementsFromNode`）。`pushUndoSnapshot`。端点 + 分发。
**产出**：同上
**依赖**：T9
**验收**：e2e：update graphic patch{x:200}→`GET /api/v1/runtime/devices` 断言属性已改；update measurement→断言量测项变化。

### T11：device.add 补齐 attrs override 测试（收口 T4）
**范围**：补 T4 未覆盖的 attrs override 边界、自定义 componentType kind（若 C-2 扩展）。合并入 T4 测试或独立补测。
**产出**：`src/appControlFactories.test.tsx`
**依赖**：T10
**验收**：单测全绿。

---

## P4 模板与保存

### T12：template.saveFromSelection（自动推导，C-3）
**范围**：`programmaticSaveSelectionAsTemplate({name, componentType, attributeLibraryName?})`：从当前选中组合节点推导端子（子节点位置/类型）→ `createGroupDeviceIconSvg` 生成图标 → 构造模板数据 → `persistDeviceLibraryChange`（不经 customDeviceDraft）。返回 `{templateKind}`。端点 + 分发。
**产出**：同 T7 三文件
**依赖**：T11
**验收**：e2e：group 后 saveFromSelection→`GET /api/v1/library/templates` 断言含新模板。

### T13：save（显式落盘，C-5 不压栈）
**范围**：`programmaticSave(scope)`：scope="currentModel"→`saveCurrentProject`；scope="schemeTree"→`saveSchemeTreeToBackend`。返回 `{saved:true}`。端点 + 分发。
**产出**：同上
**依赖**：T12
**验收**：e2e：前序操作后 save→`GET /api/v1/schemes/model/json` 断言已落盘（含新增图元）；未 save 前落盘文件不含改动。

---

## P5 swigger UI

### T14：控制台分组 + 9 端点卡片 + 示例期望
**范围**：`server/swaggerPage.mjs` ENDPOINTS 新增 group "控制台"，含 9 端点卡片（参数表 + clientId 下拉 + Try-it POST + 信封渲染）。顶部提示条。`server/swigger.examples.test.mjs` 为 9 端点加示例期望。
**产出**：`server/swaggerPage.mjs`、`server/swigger.examples.test.mjs`
**依赖**：T13
**验收**：`pnpm vitest run server/swigger.examples.test.mjs` 绿；手动访问 `/swigger` 控制台分组可见、Try-it 可发请求。

---

## P6 收尾

### T15：全量回归 + 文档同步
**范围**：`pnpm vitest run` 全绿；`pnpm tsc --noEmit` 绿；现有只读 v1 + WS 只读通道回归不受影响。同步更新 `docs/CLAUDE.md`、`server/CLAUDE.md`、`src/CLAUDE.md`（新增 control 域、appControlFactories、e2e 目录说明）。
**产出**：`docs/CLAUDE.md`、`server/CLAUDE.md`、`src/CLAUDE.md`
**依赖**：T14
**验收**：全量测试绿；文档与代码一致。

---

## 风险与回滚

| 风险 | 应对 |
|------|------|
| Playwright 浏览器环境在 CI 缺失 | e2e 测试独立 script，不阻断主 `pnpm vitest run`；CI 单独 job |
| 程序化方法与 UI 方法行为漂移 | 程序化方法集中 `appControlFactories.tsx`，复用底层 setter 而非重写逻辑 |
| saveFromSelection 端子推导复杂度超预期 | C-3 若落地困难，降级为"调用方显式传端子"（回退到 C-3 备选） |
| control 通道与 fetch 通道 requestId 冲突 | T1 用独立 `pendingCommands` Map 或 requestId 前缀区分 |
| device.add 默认 attrs 来源不明 | T4 先核实 deviceDefinitionOverrides 数据结构，必要时缩窄 kind 范围 |

## 执行建议

- T1-T3 通道骨架可并行设计但串行实现（强依赖）。
- T6 Playwright 骨架是关键里程碑：打通后方能验证后续所有端点。若 T6 卡住（浏览器环境），先用 T5 的 mock 测试推进 P2-P4，e2e 后置。
- 每个 T 完成后立即跑对应测试 + `tsc --noEmit`，遵循项目"测试与源文件同目录"约定。
