# swigger 控制台写操作 API 设计（/api/v1/control + WS 双向指令通道）

> 阶段：设计（design）。本文档产出架构与接口契约，不含实现代码。
> 前置：`REQUIREMENTS_SWIGGER_CONTROL_API.md`（需求）。
> 后续：`/sc:workflow` 出实现计划。

## 0. 关键设计决策（由核实 `__appScope` 暴露面得出）

### D-1：不能直接复用 UI 写方法，需新增程序化写方法

| 现有方法 | 问题 | 设计应对 |
|----------|------|----------|
| `createSchemeRecord` | `window.prompt` 取名 | 新增 `programmaticCreateScheme(name, parentSchemeId?)` |
| `createBlankProject` | `window.prompt` 取名 | 新增 `programmaticCreateBlankProject(name, schemeId?)` |
| `groupSelectedGraphics` | 依赖当前 UI 选中 + `requireEditMode` | 新增 `programmaticGroupSelected()`（复用底层 `createCanvasGroupFromSelection`） |
| `saveCustomDeviceTemplate` | 深度依赖 `customDeviceDraft` 草稿 | 新增 `programmaticSaveSelectionAsTemplate(options)`，从选中组合节点构造模板数据，**不经过** customDeviceDraft |
| `deleteSelection` | 依赖当前 UI 选中 | 复用，但提供 `programmaticDeleteByIds(ids?)` 显式指定 |
| `setSelectedNodeIds` | 无副作用 | 直接复用 ✅ |
| `setNodes`/`patchGraphNodes` | 无副作用 | 直接复用 ✅ |

> 程序化方法集中在 `__appScope` 上以 `programmatic*` 前缀命名，与 UI 方法隔离，便于测试与审计。

### D-2：程序化方法跳过 `requireEditMode` 守卫

UI 方法用 `requireEditMode` 防止误操作。控制台 API 是**显式可信通道**（与 /swigger 同信任域），程序化方法**不调用** `requireEditMode`，由 HTTP 入口鉴权/信任域保证安全。

### D-3：写操作不自动持久化，`save` 指令显式触发

程序化方法只改前端运行时内存（`setSchemes`/`setNodes`/`pushUndoSnapshot`）。落盘由独立 `control.save` 指令触发，复用 `saveSchemeTreeToBackend`/`saveCurrentProject`。

### D-4：双向指令通道复用 registry pending 机制

指令通道与现有 fetch 通道**同构**：相同的 requestId 配对、相同的 5s 超时、相同的 `NoOnlineClientError`。区别仅在消息 type 与方向语义。

## 1. 整体架构

```
第三方/测试
   │  HTTP (v1 信封)
   ▼
┌─────────────────────────────────────────────────┐
│ server: apiV1Control.mjs                        │
│  control 域路由 → sendCommandToClient(...)      │
│  复用 runtimeRegistry.pending 机制 + 5s 超时    │
└─────────────────────────────────────────────────┘
   │  WS message {type:"command", requestId, name, params}
   ▼
┌─────────────────────────────────────────────────┐
│ 前端: runtimeWsClient.ts                        │
│  onmessage 新增 "command" 分支                  │
│  → commandHandler(name, params)                 │
│  → 回执 {type:"command-response", requestId, ok, data/error} │
└─────────────────────────────────────────────────┘
   │  调 __appScope.programmatic* / setter
   ▼
┌─────────────────────────────────────────────────┐
│ 前端: App.tsx commandHandler 注册点             │
│  (旁路现有 fetchHandler，App.tsx:5938 附近)     │
│  按 name 分发到 __appScope 程序化方法           │
└─────────────────────────────────────────────────┘
```

## 2. WS 双向指令通道协议契约

### 2.1 server → 前端：指令下发

```jsonc
{
  "type": "command",
  "requestId": "cmd-<ts>-<rand>",   // 复用 generateRequestId 风格
  "name": "control.scheme.create",  // 指令名，见 §3
  "params": { ... }                 // 指令参数，按 name 不同
}
```

### 2.2 前端 → server：指令回执

```jsonc
{
  "type": "command-response",
  "requestId": "cmd-...",           // 与下发配对
  "ok": true,
  "data": { ... }                   // 指令结果（如新建方案的 id/name）
}
// 失败：
{ "type": "command-response", "requestId": "cmd-...", "ok": false,
  "error": { "code": "control-failed", "message": "..." } }
```

### 2.3 server 端中转：`sendCommandToClient`

复用 `runtimeRegistry` 的 pending 机制，新增 `commandFromClient`（与 `fetchFromClient` 平行）：
- 入参：`(clientId?, name, params)` → `resolveClient(clientId)` 选客户端（无则抛 `NoOnlineClientError`）
- 发 `{type:"command",...}`，等 `command-response`，5s 超时（`CommandTimeoutError`，code `ws-timeout`）
- WS 层 `runtimeWs.mjs` 消息 switch 新增 `"command-response"` 分支 → `registry.resolveCommand(clientId, requestId, ok, data, error)`
- 成功 resolve 裸 data，失败 reject `Error` 带 `.code`（与 fetch 通道一致）

### 2.4 前端 commandHandler 注册

`src/runtimeWsClient.ts` `onmessage` 新增 `"command"` 分支：调 `commandHandler(name, params)` → 返回 data 或抛错 → 回执。
`App.tsx` 在 WS useEffect（5938 附近）注册 `commandHandler`，按 `name` 分发到 `__appScope` 程序化方法。commandHandler 须读 `__appScopeRef.current` 取最新引用（避免空依赖闭包冻结，见 src/CLAUDE.md 陷阱）。

## 3. control 域 HTTP 路由契约

所有路由：`POST /api/v1/control/*`，body 为 JSON 参数，query 可带 `clientId`。响应统一 v1 信封。

| 路由 | 指令 name | params | data 回执 | 验证用只读 API |
|------|-----------|--------|-----------|----------------|
| `POST /api/v1/control/scheme/create` | `control.scheme.create` | `{name, parentSchemeId?}` | `{id, name, path}` | `GET /api/v1/schemes` |
| `POST /api/v1/control/model/create` | `control.model.create` | `{name, schemeId?}` | `{id, name, schemeId}` | `GET /api/v1/schemes/models` |
| `POST /api/v1/control/devices/select` | `control.devices.select` | `{ids: string[], mode?:"set"\|"add"\|"toggle"}` | `{selectedIds}` | `GET /api/v1/runtime/selection` |
| `POST /api/v1/control/devices/group` | `control.devices.group` | `{}` (组合当前选中) | `{groupId, nodeIds}` | `GET /api/v1/runtime/devices` |
| `POST /api/v1/control/template/save-from-selection` | `control.template.saveFromSelection` | `{name, componentType, attributeLibraryName?}` | `{templateKind}` | `GET /api/v1/library/templates` |
| `POST /api/v1/control/device/property/update` | `control.device.property.update` | `{id, category:"graphic"\|"model"\|"measurement", patch}` | `{id}` | `GET /api/v1/runtime/devices` |
| `POST /api/v1/control/device/add` | `control.device.add` | `{kind, x, y, attrs?}` | `{id}` | `GET /api/v1/runtime/devices` |
| `POST /api/v1/control/device/delete` | `control.device.delete` | `{ids?: string[]}` (缺省=当前选中) | `{deletedIds}` | `GET /api/v1/runtime/devices` |
| `POST /api/v1/control/save` | `control.save` | `{scope:"currentModel"\|"schemeTree"}` | `{saved:true}` | `GET /api/v1/schemes/model/json` |

### 3.1 错误码 → HTTP 映射（复用 v1Response）

| code | HTTP | 触发 |
|------|------|------|
| `bad-request` | 400 | 参数缺失/非法 |
| `no-online-client` | 503 | 无在线前端客户端 |
| `ws-timeout` | 503 | 指令 5s 未回执 |
| `control-failed` | 500 | 前端执行抛错（如名称重复、无选中图元） |
| `not-found` | 404 | 指定 schemeId/deviceId 不存在 |

## 4. 前端程序化写方法清单（新增到 `__appScope`）

| 方法 | 签名 | 复用底层 | 备注 |
|------|------|----------|------|
| `programmaticCreateScheme` | `(name, parentSchemeId?) => {id,name,path}` | `createSavedScheme` + `setSchemes` + `insertChildSavedScheme` | 不 prompt、不 editMode、不自动落盘 |
| `programmaticCreateBlankProject` | `(name, schemeId?) => {id,name,schemeId}` | `createSavedProject` + `setSchemes` + `upsertSavedProjectInScheme` + `requestLoadSavedProject` | 名称重复抛错 |
| `programmaticSelectDevices` | `(ids, mode?) => selectedIds` | `setSelectedNodeIds` | mode 控制合并语义 |
| `programmaticGroupSelected` | `() => {groupId, nodeIds}` | `createCanvasGroupFromSelection` + `setGroups` + `pushUndoSnapshot` | 无选中抛 `control-failed` |
| `programmaticSaveSelectionAsTemplate` | `(opts) => {templateKind}` | 从选中组合节点构造模板 → `persistDeviceLibraryChange` | **新路径**，不经 customDeviceDraft |
| `programmaticUpdateDeviceProperty` | `(id, category, patch) => {id}` | `patchGraphNodes`/量测 CRUD | category 分流 |
| `programmaticAddDevice` | `(kind, x, y, attrs?) => {id}` | 构造 ModelNode + `setNodes`/`patchGraphNodes` + `pushUndoSnapshot` | 需从 deviceDefinition 构造默认节点 |
| `programmaticDeleteDevices` | `(ids?) => {deletedIds}` | `deleteSelection` 或按 id 删 + `pushUndoSnapshot` | ids 缺省用当前选中 |
| `programmaticSave` | `(scope) => {saved:true}` | `saveSchemeTreeToBackend`/`saveCurrentProject` | 显式落盘 |

> 这些方法集中在 `appExtracted/` 新建一个工厂文件（如 `appControlFactories.tsx`）装配到 `__appScope`，与 UI 工厂隔离。

## 5. swigger 控制台 UI 结构

### 5.1 元数据扩展（`swaggerPage.mjs` ENDPOINTS）

新增 group `"控制台"`，含 §3 全部 9 个端点卡片。每张卡片：
- 参数表（按 §3 params）
- `clientId` 可选下拉（默认"自动选取最近活跃"，调 `GET /api/v1/runtime/clients` 填充）
- Try-it：`POST` + JSON body → 展示 Request/Response 信封（复用现有 `send()` 与信封渲染）
- 顶部提示条："控制台操作需在线前端客户端；写操作仅改运行时内存，需调用 save 落盘"

### 5.2 测试向导（可选，非必需）

由于测试形态选定为"仅自动化测试"，UI 测试向导降级为可选。控制台仅提供单端点 Try-it。

## 6. 测试策略（Playwright 浏览器端到端）

### 6.1 测试客户端：真实浏览器 + 真实前端（C-1 决策）

**选定方案**：Playwright 起真实浏览器加载真实前端（Vite + 真实 `__appScope`），承接 WS 指令。最贴近生产行为，无桩与真实逻辑漂移风险。

**测试编排**：
1. 测试启动后端 image-server（`GRAPH_MODEL_DATA_DIR` 指向 tmpdir）
2. 测试启动 Vite dev server（或 `pnpm preview` 构建产物）
3. Playwright `browser.newPage()` → 导航前端 URL → 等待 RT-WS 指示灯显示在线（前端 WS 已 register）
4. 测试通过 HTTP 调 `/api/v1/control/*`，指令经 WS 下发到**真实前端**执行
5. 用只读 v1 API + Playwright `page.evaluate` 断言结果

**权衡**：
- ✅ 真实 `__appScope`、真实画布、真实持久化链路，最高真实度
- ⚠️ 需起 Vite + 后端，测试较慢；CI 需浏览器环境
- ⚠️ 需处理前端 `window.prompt`——但程序化方法已绕过 prompt，**真实前端不会弹窗**，无阻塞问题
- **前端依赖前置**：control 通道与程序化方法必须先实现，测试才能跑通（无法用桩提前验证通道骨架）

> 因 C-1 选真实浏览器，§9 实现顺序调整为：先打通 control 通道骨架 + 第一个程序化方法（device.add），用 Playwright 验证骨架，再逐个补其余方法。

### 6.2 端到端用例顺序

```
1. POST /control/scheme/create {name:"测试方案"}
   → GET /api/v1/schemes 断言含"测试方案"
2. POST /control/model/create {name:"测试模型", schemeId:<上步>}
   → GET /api/v1/schemes/models 断言含"测试模型"
3. POST /control/device/add {kind:"busbar", x:100, y:100}
   → GET /api/v1/runtime/devices 断言设备数 +1
4. POST /control/device/add (第二个图元)
5. POST /control/devices/select {ids:[<两个>]}
   → GET /api/v1/runtime/selection 断言选中数=2
6. POST /control/devices/group
   → GET /api/v1/runtime/devices 断言出现 group
7. POST /control/template/save-from-selection {name:"测试模板", componentType:"TestTpl"}
   → GET /api/v1/library/templates 断言含"测试模板"
8. POST /control/device/property/update {id, category:"graphic", patch:{x:200}}
   → GET /api/v1/runtime/devices 断言属性已改
9. POST /control/device/delete {ids:[<某id>]}
   → GET /api/v1/runtime/devices 断言设备数 -1
10. POST /control/save {scope:"currentModel"}
    → GET /api/v1/schemes/model/json 断言已落盘
```

### 6.3 测试位置与隔离

- 测试文件：`server/apiV1Control.test.mjs`（handler 层，纯 HTTP + mock sendCommandToClient）+ `e2e/apiV1Control.e2e.test.mjs`（Playwright 真实浏览器端到端）
- 数据隔离：`GRAPH_MODEL_DATA_DIR` 指向 tmpdir
- Playwright 编排辅助：`e2e/controlHarness.mjs`（启后端 + Vite + 浏览器 + 等待 WS 在线）

### 6.4 回归

- 现有 `runtimeWs.test.mjs` / `runtimeRegistry.test.mjs` 需补 command 通道用例
- `swigger.examples.test.mjs` 需为 9 个新端点加示例期望
- 现有只读 v1 测试不受影响（回归绿）

## 7. 文件改动清单（实现阶段落点）

| 文件 | 改动 |
|------|------|
| `server/runtimeRegistry.mjs` | 新增 `commandFromClient`/`resolveCommand` + `CommandTimeoutError` |
| `server/runtimeWs.mjs` | 消息 switch 新增 `command-response` 分支；导出 `sendCommandToClient` |
| `server/apiV1Control.mjs` | **新建**：control 域 9 个 handler + 路由表 |
| `server/image-server.mjs` | 注册 control 路由 |
| `server/v1Response.mjs` | 复用，可能补 `control-failed` 映射 |
| `server/swaggerPage.mjs` | ENDPOINTS 新增"控制台"分组 9 端点 + 示例 |
| `src/runtimeWsClient.ts` | onmessage 新增 `command` 分支 + commandHandler 注入 |
| `src/appExtracted/appControlFactories.tsx` | **新建**：9 个程序化写方法工厂 |
| `src/App.tsx` | 装配程序化方法到 `__appScope`；注册 commandHandler |
| `server/apiV1Control.test.mjs` | **新建**：handler 层测试（mock sendCommandToClient） |
| `e2e/apiV1Control.e2e.test.mjs` | **新建**：Playwright 真实浏览器端到端 |
| `e2e/controlHarness.mjs` | **新建**：启后端 + Vite + 浏览器 + 等 WS 在线 |
| `server/runtimeWs.test.mjs` / `runtimeRegistry.test.mjs` | 补 command 通道用例 |
| `server/swigger.examples.test.mjs` | 补 9 端点示例期望 |

## 8. 决策点（已确认）

| ID | 问题 | 决策 |
|----|------|------|
| C-1 | 测试用桩客户端 vs 真实前端 vs 浏览器端到端 | **浏览器端到端**（Playwright 起真实浏览器跑真实前端，最贴近生产） |
| C-2 | `control.device.add` 的 `kind` 取值范围与默认 attrs 来源 | **DeviceKind + 默认定义**：kind 限定内置 `DeviceKind` 枚举，attrs 从对应 deviceDefinition 取默认，调用方可 override |
| C-3 | `control.template.saveFromSelection` 的端子与图标 | **自动推导**：从组合内子节点推导端子位置/类型，图标用 `createGroupDeviceIconSvg` 生成，调用方只传 name + componentType |
| C-4 | 多客户端在线时是否强制指定 clientId | **默认最近活跃，多选不强制**：API 默认取最近活跃客户端，Try-it 下拉可显式选，不强制 |
| C-5 | 程序化方法是否压 undo 栈 | **图元级压栈，方案/模型不压**：add/delete/group/property/select 压 `pushUndoSnapshot`，scheme/model create 不压 |

## 9. 下一步

`/sc:workflow`：按测试先行顺序拆实现任务，优先打通 control 通道骨架（registry → ws → client → 一个端点），再逐个补程序化方法与端点。
