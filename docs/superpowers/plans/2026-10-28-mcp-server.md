# MCP 服务（/webgrp/mcp）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 给电力能源系统图上建模平台加一个 **MCP (Model Context Protocol) 服务**，让 LLM 客户端（Claude Desktop / Cursor / 自建 Agent）能通过标准 MCP 协议读到本平台的方案域、图元库域、运行时态，并下发控制台写操作。

**Architecture:** MCP 端点**挂在现有后端进程内**（`POST {apiPrefix}/mcp`，默认 `http://127.0.0.1:5174/webgrp/mcp`），传输用 **streamable HTTP 无状态模式**（`sessionIdGenerator: undefined` + `enableJsonResponse: true`），每个请求新建一个 `StreamableHTTPServerTransport` + 一个 `McpServer`。工具实现**不重发 HTTP**，而是**直接调用 `server/apiV1*.mjs` 里已经导出的 handler 函数**（`handleV1Schemes` / `handleV1RuntimeModel` / `handleControlDeviceAdd` …），用一层「捕获型 fake request/response」把它们驱动起来 —— 于是空间隔离、参数校验、错误码映射、WS 客户端选择全部沿用 v1 的**同一份实现**，MCP 侧只做「参数翻译 + 信封搬运」。

**Tech Stack:** Node 24 ESM（`.mjs`）、`@modelcontextprotocol/sdk@1.32.2`、`zod@4.6.7`、Vitest 3。

**用户已定的三项取舍**（m00108 后的回答，本计划的定调前提）：

1. **形态**：挂到现有后端的 `/mcp`（streamable HTTP），不做独立 stdio 进程 —— 单进程，复用空间解析与 WS 客户端注入。
2. **写操作**：暴露 control 域 11 个写端点，破坏性操作用 `annotations.destructiveHint` 标注。
3. **工具粒度**：语义聚合 + 直映射混合，约 20–24 个工具，统一 `gmp_` 前缀。

## Global Constraints

- **不改任何 v1 handler 的行为**。MCP 层只做「调用」，不改「被调用者」。v1 的参数校验、错误码（`bad-request` / `not-found` / `no-online-client` / `ws-timeout` …）、空间隔离口径全部原样沿用。
- **空间隔离必须在 MCP 侧复用派发层的那一套**：MCP 路由**不**进 `isSpaceAgnostic` 白名单，故派发层照常 `resolveSpaceFromRequest`（X-Space 头 > ?space= > Cookie > 首个空间）并把 `paths` / `spaceId` 注入 handler。MCP 工具**不得**自己再解析一次空间。
- **会话类工具（runtime / control）必须带 spaceId**：v1 的 `createV1RuntimeRoutes` / `createV1ControlRoutes` 明确要求 spaceId（缺失即抛「缺少 spaceId：v1 会话类 handler 必须由派发层注入空间。」）。MCP 侧照做 —— 缺 spaceId 直接拒，不静默退回「全局取活跃者」（那会跨空间打到别人的前端）。
- **一个端点一处实现**：MCP 工具**不得**自己实现方案读取、图元库读取、E 文件导出等逻辑 —— 一律调 `server/apiV1*.mjs` / `server/eFileExport.mjs` / `server/svgExport.mjs` / `server/cimExport.mjs` / `server/sendModel.mjs` 已导出的 handler。
- **`server/*.test.mjs` 必须是纯 JavaScript**（写 TS 语法会 RollupError，表现为「no tests」，绝不能当通过）。测试与源文件同目录。
- **不新增依赖**：MCP SDK 与 zod 已装进 `package.json`（`@modelcontextprotocol/sdk@1.32.2`、`zod@4.6.7`）。
- **Origin 校验复用 `isAllowedNativeExportOrigin`**（`server/nativeExportSave.mjs`）：无 Origin 头放行，有 Origin 必须是本机。理由：MCP 暴露写操作，而浏览器里的任意网页都能对本机端口发 POST（不受 CORS 约束的**发送**）—— 不校验 Origin 等于让任意网页驱动本平台的建模操作。
- **无状态模式每个请求新建 transport**：SDK 在 `sessionIdGenerator` 未设时，复用同一个 transport 会抛 `Stateless transport cannot be reused across requests.`。
- **GET /mcp 与 DELETE /mcp 回 405**（带 `Allow: POST`），不建 SSE 长连接 —— 否则无状态模式下连接不关闭，客户端挂住。
- **`outputSchema` 一旦声明就必须每次回 `structuredContent`**（SDK 会校验：缺 `structuredContent` 抛 `Tool X has an output schema but no structured content was provided`）。二进制工具（截图 / 方案 ZIP）不声明 outputSchema。
- 新增端点后：`server/routeCoverage.test.mjs` 的守卫要过（见 Task 3 的取舍说明），`pnpm audit:names`（改了 `server/*.mjs` 对 `src/**/*.ts` 的 import 才需要，本计划不改 `src/`），最后跑一次全量测试。

---

## File Structure

| 文件 | 职责 | 动作 |
|------|------|------|
| `server/mcp/v1Bridge.mjs` | 捕获型 fake request/response + `invokeV1Handler()` + 信封解析 + 错误码→可执行建议 | 新建 |
| `server/mcp/tools.mjs` | 26 个 `gmp_*` 工具的定义（名称 / 描述 / Zod schema / annotations / handler） | 新建 |
| `server/mcp/mcpServer.mjs` | 按请求上下文装配 `McpServer`（注册全部工具） | 新建 |
| `server/mcp/httpHandler.mjs` | `/mcp` 的 HTTP 入口：Origin 校验、405、无状态 streamable HTTP 传输 | 新建 |
| `server/mcp/mcpTools.test.mjs` | 工具契约 + 行为单测（InMemoryTransport 直连，不起 HTTP） | 新建 |
| `server/mcp/mcpHttp.test.mjs` | 端到端：真起后端，官方 Client 走 initialize → tools/list → tools/call | 新建 |
| `server/server.mjs` | 挂 `/mcp` 三个路由（POST / GET / DELETE）+ 把 runtimeWs / 路由表注进 MCP handler | 修改 |
| `server/routeCoverage.test.mjs` | 把 `/mcp` 三个方法加进「刻意不文档化」清单（附理由注释） | 修改 |
| `docs/ARCHITECTURE.md` | 加「MCP 服务」一节（功能清单 + 代码映射） | 修改 |
| `docs/MCP.md` | MCP 服务使用说明（连接方式、空间选择、工具清单、限制） | 新建 |
| `docs/mcp-evaluation.xml` | 10 题只读评测（mcp-builder Phase 4 格式） | 新建 |
| `CLAUDE.md`（根） | 关键文件表加 `server/mcp/` 一行 | 修改 |

**为什么不把 `/mcp` 写进 `/swigger` 页面**：`/swigger` 的示例机制是「按 v1 信封断言」+ 逐条真实调用；MCP 端点是 JSON-RPC，且 SDK 强制 POST 必须带 `Accept: application/json, text/event-stream`（缺一即 406），跑不进那套示例机制。故按 `routeCoverage.test.mjs` 既有的 `INTENTIONALLY_UNDOCUMENTED` 机制排除，文档另写 `docs/MCP.md`。清单里的每条仍要求「端点确实存在」，由 routeKey 注册形式保证。

---

### Task 1: `server/mcp/v1Bridge.mjs` —— 驱动 v1 handler 的桥

**Files:**
- Create: `server/mcp/v1Bridge.mjs`

**Interfaces:**
- Consumes: `server/apiV1*.mjs` 导出的 handler、v1 响应约定（`{ok:true,data}` / `{ok:false,error:{code,message}}`）
- Produces:
  - `export function createCaptureResponse()` —— 记录 `writeHead` / `end` / `headersSent` 的假 response
  - `export function createBridgeRequest({ method, body, headers })` —— 可异步迭代的假 request（body 为对象时按 JSON 序列化）
  - `export async function invokeV1Handler(handler, { method, path, query, body, headers, match })` → `{ status, headers, body }`
  - `export function parseV1Envelope(result)` → `{ ok, data }` | `{ ok, error }`（按 content-type 判定 JSON / 二进制）
  - `export function errorHint(code)` → 可执行建议文本（无对应时返回 ""）

- [ ] **Step 1: 写失败测试** `server/mcp/mcpBridge.test.mjs`：用 `server/apiV1Schemes.mjs` 的 `handleV1SchemeModels` 驱动一次「缺 schemePath」与一次「正常返回」，断言捕获到的信封形状与状态码。

- [ ] **Step 2: 实现** `v1Bridge.mjs`：
  - `createCaptureResponse()` 必须实现 `writeHead(status, headers)` / `end(body)` / `headersSent` —— v1 的 `sendV1Error` 靠 `headersSent` 决定还能不能写错误响应。
  - `invokeV1Handler` 用 `apiPath(path)` 拼 URL（尊重 `GRAPH_MODEL_API_PREFIX`），query 用 `URLSearchParams` 拼。
  - 假 request 的 headers **不含** `accept-encoding`（避免 `sendV1Json` 走 gzip 分支，捕获到的 body 才是明文 JSON）；也不含 `if-none-match`（避免 304 空 body）。
  - `parseV1Envelope`：`content-type` 含 `application/json` → `JSON.parse`；否则返回 `{ ok: true, data: { binary: true, contentType, bytes } }`。
  - `errorHint` 至少覆盖 `no-online-client` / `ws-timeout` / `no-active-model` / `no-selection` / `not-found` / `bad-request` / `payload-too-large` / `internal`。

- [ ] **Step 3: 跑测试** `pnpm vitest run server/mcp/mcpBridge.test.mjs` → 绿。

---

### Task 2: `server/mcp/tools.mjs` + `server/mcp/mcpServer.mjs` —— 26 个工具

**Files:**
- Create: `server/mcp/tools.mjs`
- Create: `server/mcp/mcpServer.mjs`
- Test: `server/mcp/mcpTools.test.mjs`

**Interfaces:**
- Consumes: `server/apiV1Schemes.mjs` / `server/apiV1Library.mjs` / `server/apiV1Runtime.mjs` / `server/apiV1Control.mjs` 导出的 handler
- Produces:
  - `export function createMcpToolRegistry({ spaceId, paths, runtimeWs })` → 工具定义数组
  - `export function createMcpServer({ spaceId, paths, runtimeWs })` → 已注册全部工具的 `McpServer`

**工具清单（26 个，`gmp_` 前缀）**

| # | 工具 | 形态 | v1 来源 | annotations |
|---|------|------|----------|-------------|
| 1 | `gmp_list_schemes` | 读 | GET /v1/schemes | readOnly |
| 2 | `gmp_list_scheme_models` | 读 | GET /v1/schemes/models | readOnly |
| 3 | `gmp_get_model_json` | 读 | GET /v1/schemes/model/json | readOnly |
| 4 | `gmp_export_model` | 读 | GET /v1/schemes/model/{svg,e-file,cim-xml} | readOnly |
| 5 | `gmp_export_scheme_archive` | 读 | GET /v1/schemes/export | readOnly |
| 6 | `gmp_send_model` | 写（外发） | POST /v1/schemes/model/send | 非幂等 |
| 7 | `gmp_get_library` | 读 | GET /v1/library（+5 个分片，`part` 参数） | readOnly |
| 8 | `gmp_list_runtime_clients` | 读 | GET /v1/runtime/clients | readOnly |
| 9 | `gmp_get_runtime_model` | 读 | GET /v1/runtime/model | readOnly |
| 10 | `gmp_get_runtime_devices` | 读 | GET /v1/runtime/devices | readOnly |
| 11 | `gmp_get_runtime_selection` | 读 | GET /v1/runtime/selection | readOnly |
| 12 | `gmp_get_runtime_tabs` | 读 | GET /v1/runtime/tabs（+ /tabs/{tab}） | readOnly |
| 13 | `gmp_capture_runtime_screenshot` | 读 | GET /v1/runtime/screenshot | readOnly |
| 14 | `gmp_get_runtime_svg` | 读 | GET /v1/runtime/svg | readOnly |
| 15 | `gmp_get_runtime_e_file` | 读 | GET/POST /v1/runtime/e-file | readOnly |
| 16 | `gmp_add_device` | 写 | POST /v1/control/device/add | 非幂等 |
| 17 | `gmp_create_scheme` | 写 | POST /v1/control/scheme/create | 非幂等 |
| 18 | `gmp_create_model` | 写 | POST /v1/control/model/create | 非幂等 |
| 19 | `gmp_select_devices` | 写 | POST /v1/control/devices/select | 非幂等 |
| 20 | `gmp_group_selected_devices` | 写 | POST /v1/control/devices/group | 非幂等 |
| 21 | `gmp_delete_devices` | 写（破坏） | POST /v1/control/device/delete | destructive |
| 22 | `gmp_update_device_property` | 写 | POST /v1/control/device/property/update | 非幂等 |
| 23 | `gmp_save_model` | 写 | POST /v1/control/save | 非幂等 |
| 24 | `gmp_save_template_from_selection` | 写 | POST /v1/control/template/saveFromSelection | 非幂等 |
| 25 | `gmp_export_device_definition` | 读 | POST /v1/control/e-device-definition/export | readOnly |
| 26 | `gmp_import_device_definition` | 写 | POST /v1/control/e-device-definition/import | 非幂等 |

**关键设计**

- **`schemePath` 用「字符串数组」而非 URL 编码串**：v1 的 `schemePath` query 是 `encodeURIComponent(JSON.stringify(parts))`，让 LLM 手工百分号编码极易出错。工具层收 `z.array(z.string())`，内部用 `encodeSchemePath()`（`server/schemePath.mjs`）编码后交给 v1 —— 编码规则仍只有一份。
- **v1 的 `query` 语义由工具层翻译**：`includeProjects=1`、`colorMode=energy|voltage`、`encoding=gbk|utf-8`、`tab=model|tree|graph`、`clientId=…`、`template=…` 等，一律在工具层拼成 query 再调 handler。
- **`gmp_export_model` 用 `format` 分派**（`svg` / `e-file` / `cim-xml`）：三个导出共用 `schemePath` + `name`，各自的可选参数（`colorMode` / `encoding` / `templateName` / `templateText` / `modelId` / `strict`）在工具层按 format 校验 —— 传了不适用于该 format 的参数要**报错**而不是静默丢弃。
- **`gmp_get_library` 用 `part` 分派**（`all` / `categories` / `devices` / `measurements` / `device-definitions` / `templates`）：默认 `all`。
- **运行时态 ctx 必须绑定 spaceId**：构造 `{ fetchFromClient: (clientId, resource, params) => runtimeWs.fetchFromClient(clientId, resource, params, spaceId), sendCommandToClient: (clientId, name, params) => runtimeWs.sendCommandToClient(clientId, name, params, spaceId), listClients: () => runtimeWs.listClients() }`。
- **错误处理**：v1 回 `{ok:false,error:{code,message}}` → MCP 回 `{ content: [{type:"text", text:`错误（${code}）：${message} ${hint}`}], isError: true, structuredContent: envelope }`。
- **二进制结果**：截图 → `content: [{type:"image", data:<base64>, mimeType:"image/png"}]` + 一句文字说明；方案 ZIP → 文字 + base64（`structuredContent` 只放 `{filename, bytes}`，不声明 outputSchema）。
- **`outputSchema`**：JSON 类工具统一用 `{ ok: boolean, data?: unknown, error?: { code: string, message: string } }`（Zod raw shape）。若实测该 schema 在 SDK 的 zod 兼容层（v4 classic → v4-mini）下校验不过，降级为 `{ ok: boolean }` —— **必须实测**，不能想当然。

- [ ] **Step 1: 写失败测试** `server/mcp/mcpTools.test.mjs`：
  - 工具清单：26 个、名字唯一、全部 `gmp_` 前缀、每个都有 description 与 annotations。
  - 用 `InMemoryTransport.createLinkedPair()` + 官方 `Client` 直连：能 `tools/list`；调用 `gmp_list_schemes` 返回 `structuredContent.ok === true`。
  - 错误路径：缺必填参数 → 客户端拿到错误；无在线客户端时 `gmp_add_device` → `isError` 且文案含「无在线客户端」。

- [ ] **Step 2: 实现** `tools.mjs` + `mcpServer.mjs`。

- [ ] **Step 3: 跑测试** `pnpm vitest run server/mcp/mcpTools.test.mjs` → 绿。

---

### Task 3: `server/mcp/httpHandler.mjs` + `server/server.mjs` 挂载

**Files:**
- Create: `server/mcp/httpHandler.mjs`
- Modify: `server/server.mjs`
- Modify: `server/routeCoverage.test.mjs`
- Test: `server/mcp/mcpHttp.test.mjs`

- [ ] **Step 1: 写失败测试** `server/mcp/mcpHttp.test.mjs`（端到端，照抄 `server/spaceDispatch.test.mjs` 的 harness：mkdtemp + `GRAPH_MODEL_DATA_DIR` + 自建 `createSpaceStore` 并**注入** `createImageServer({port:0, host:"127.0.0.1", spaceStore:store})`）：
  - 官方 `Client` + `StreamableHTTPClientTransport` 连 `http://127.0.0.1:<port>/webgrp/mcp` → `initialize` → `tools/list`（断言 26 个）→ `tools/call("gmp_list_schemes")` 拿到 `ok:true`。
  - `GET /webgrp/mcp` → 405 且带 `Allow: POST`。
  - `POST` 缺 `Accept: text/event-stream` → 406（SDK 的硬约束）。
  - `Origin: https://evil.example` → 403（本地 Origin 策略）。
  - `X-Space` 指向不存在的空间 → 400（派发层的空间解析照常生效）。

- [ ] **Step 2: 实现** `httpHandler.mjs`：
  - `handleMcpHttpRequest({ request, response, paths, spaceId, runtimeWs })`：
    1. Origin 校验（`isAllowedNativeExportOrigin`）→ 403 JSON-RPC 错误。
    2. `spaceId` 缺失 → 503 JSON-RPC 错误（接线 bug 兜底）。
    3. 新建 `StreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true })`。
    4. 新建 `McpServer`（`createMcpServer({ spaceId, paths, runtimeWs })`）→ `connect(transport)` → `transport.handleRequest(request, response)`。
  - GET / DELETE → 405 + `Allow: POST`。

- [ ] **Step 3: 挂载**（`server/server.mjs`）：
  - 在 `exactRouteHandlers` 里加三条 `routeKey("POST"|"GET"|"DELETE", "/mcp")`。
  - `runtimeWs` 在 `createServer` 之后才注入（`server/server.mjs:5551`），故 MCP handler 用 `let mcpHandler = null` + 延迟赋值（MCP 模块经参数拿到 `runtimeWs`），请求到达时它已就绪。
  - **不要**把 `/mcp` 加进 `isSpaceAgnostic` 白名单 —— 它需要空间隔离。

- [ ] **Step 4: 守卫**（`server/routeCoverage.test.mjs`）：把 `POST /webgrp/mcp`、`GET /webgrp/mcp`、`DELETE /webgrp/mcp` 加进 `INTENTIONALLY_UNDOCUMENTED`，并在注释里写明理由（JSON-RPC 协议端点，SDK 强制 Accept 头，跑不进 swagger 的 v1 信封示例机制；文档见 `docs/MCP.md`）。

- [ ] **Step 5: 跑测试** `pnpm vitest run server/mcp/ server/routeCoverage.test.mjs` → 绿。

---

### Task 4: 文档 + 评测

**Files:**
- Create: `docs/MCP.md`
- Create: `docs/mcp-evaluation.xml`
- Modify: `docs/ARCHITECTURE.md`
- Modify: `CLAUDE.md`

- [ ] **Step 1: `docs/MCP.md`**：连接地址与传输模式、空间选择（X-Space / ?space= / Cookie）、26 个工具清单与参数速查、只读 vs 写操作、错误码含义、已知限制（需前端在线、无状态、每个请求新建 server）。
- [ ] **Step 2: `docs/ARCHITECTURE.md`**：加「MCP 服务」一节（功能清单 + 代码映射表）。
- [ ] **Step 3: `docs/mcp-evaluation.xml`**：10 题**只读**评测（每题独立、可验证、需多次工具调用），按 mcp-builder 的 `<evaluation><qa_pair><question>/<answer>` 格式。
- [ ] **Step 4: `CLAUDE.md`**：关键文件表加 `server/mcp/` 一行。

---

### Task 5: 收尾

- [ ] **Step 1: 清理临时物**：删掉 `tmp/mcp-probe`、`tmp/mcp-probe2`、`tmp/mcp-probe3`、`tmp/npm-cache`、`tmp/pnpm-store`、`tmp/pnpm-state`（都在 gitignore 内，但别留垃圾）。
- [ ] **Step 2: 全量测试一次**：`pnpm vitest run`（约 60–120s，最后一轮跑）。
- [ ] **Step 3: 汇报**：改了什么、验证命令与结果、已知限制。
