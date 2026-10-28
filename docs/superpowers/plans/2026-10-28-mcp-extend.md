# MCP 扩展：页面 DOM 结构 / 切换工作空间 / 切换模型

## Goal

在已交付的 MCP 服务（`/webgrp/mcp`，26 个 `gmp_*` 工具）上再增加三项能力：

1. **读取当前前端页面的整体 DOM 结构** —— 让 Agent 能看到页面长什么样（有哪些面板、按钮、当前打开的是哪个模型）。
2. **切换工作空间** —— MCP 能驱动前端切到另一个空间（等同顶栏空间选择器）。
3. **切换模型** —— MCP 能驱动前端打开另一个已保存模型（等同方案树点击）。

工具总数 26 → **29**。

## 核心约束（沿用首轮）

- **一个端点一处实现**：MCP 只做参数翻译与信封搬运，实际逻辑在 v1 handler / 前端工厂里，不写第二份。
- **不改已发布端点的行为**：新增端点只做增量；已有 handler 一行不动。
- **不自己解析空间**：空间仍由派发层解析后注入。
- **前端能力需要前端在线**：DOM 读取、切空间、切模型都经 WS 到前端，无在线会话时回 `no-online-client`。

## 三项能力的设计

### ① 页面整体 DOM 结构

前端新增 runtime resource `runtime.dom`，两种格式：

| format | 返回 | 用途 |
|--------|------|------|
| `outline`（默认） | 元素树 `{tag, id, classes, role, text?, children}` | 给 LLM 看「页面有哪些区域」，体积可控（默认上限 800 节点 / 深度 6） |
| `html` | `document.documentElement.outerHTML`（截断到 maxChars，默认 200k） | 需要原始标记时用 |

两者都回 `{format, title, url, nodeCount, truncated, ...}`。

**为什么默认 outline 而不是 html**：整页 `outerHTML` 在带画布的页面上动辄数百 KB，直接塞进 MCP 响应会挤爆上下文；而 Agent 真正要的是结构（有哪些面板、当前模型名在哪）。`html` 保留为显式选项。

**实现分层（可单测）**：
- `src/runtimeSnapshot.ts` 新增 `serializeDom(appScope, params)` → 读 `document.documentElement`（node 环境下回 `bad-request`，不假装成功）。
- 纯函数 `buildDomOutline(root, opts)` / `serializeDomHtml(root, opts)` 单独导出，接受 duck-typed 元素对象 → node 单测用假节点树即可，不需要 jsdom。

### ② 切换工作空间

新增 control 指令 `control.space.switch`，参数 `{ spaceId }`。

前端 `programmaticSwitchSpace`：
1. `spaceId` 必填、必须在 `scope.spaces` 里（否则 `bad-request`「未知空间：X。可用空间：…」—— 让 Agent 能自我纠正，而不是切过去撞 400 白屏）。
2. **有未保存修改就拒**（`bad-request`「当前模型有未保存修改…请先调用 gmp_save_model」）。不弹确认框：MCP 调用方答不了模态框，弹了就是挂死。这与「`switchToSpace` 会 `location.reload()` 丢草稿」的风险对齐。
3. 用 `setTimeout(0)` **推迟** `switchToSpace(spaceId)`，让 WS 回执先发出去 —— `switchToSpace` 内部的 `location.reload()` 会掐断连接，同步调用会让调用方拿到 `ws-timeout` 而不是成功回执。
4. 回执 `{ spaceId, scheduled: true }`。

**注意**：切空间是硬重载，前端 WS 会断开重连（3s 后），期间 `gmp_*` 运行时工具会短暂 `no-online-client`。文档里写明。

### ③ 切换模型

新增 control 指令 `control.model.switch`，参数 `{ modelId?, modelKey?, schemePath?, name? }`（三选一，优先级 modelId > modelKey > schemePath+name）。

前端 `programmaticSwitchModel`：
1. 有未保存修改 → `bad-request`（同上，不弹框）。
2. 定位顺序：`modelId`（后端稳定序号 `project.idx`）→ `findSavedProjectByIndex`；`modelKey` → `findSavedProjectRecordInSchemes`；`schemePath`+`name` → 逐层走方案树找同名项目。
3. 已经是当前模型 → `{ already: true, modelId }`（幂等，不重复加载）。
4. 否则 `await loadSavedProjectRecord(record, schemeId)` → 回执 `{ modelId, name, schemeId, schemePath }`。
5. 找不到 → `bad-request`「未找到模型：…（方案路径 …）」。

## 新增端点（v1）

| 方法 | 路径 | 作用 |
|------|------|------|
| GET | `/webgrp/v1/runtime/dom` | 语义同 `runtime.dom` resource；query `format` / `maxChars` / `maxNodes` / `clientId` |
| POST | `/webgrp/v1/control/space/switch` | body `{ spaceId }` → 指令 `control.space.switch` |
| POST | `/webgrp/v1/control/model/switch` | body `{ modelId?, modelKey?, schemePath?, name? }` → 指令 `control.model.switch` |

## 新增 MCP 工具

| 工具 | 注解 | 对应 v1 |
|------|------|---------|
| `gmp_get_page_dom` | READ_ONLY | GET /v1/runtime/dom |
| `gmp_switch_space` | WRITE（会重载页面） | POST /v1/control/space/switch |
| `gmp_switch_model` | WRITE | POST /v1/control/model/switch |

## 连带必须同步的文件（仓库既有守卫要求）

- `server/swaggerPage.mjs`：3 条新端点 + 各 1 个示例。
- `server/swaggerPage.test.mjs`：端点总数 81 → 84，示例总数 106 → 109（硬编码）。
- `server/swigger.examples.test.mjs`：`runtimeResponder` 加 `runtime.dom`；`commandResponder` 加两条指令；`expectFor` 加 3 条断言。
- `server/apiV1RuntimeHandlers.test.mjs`：路由数 10 → 11，GET 9 → 10。
- `server/apiV1ControlHandlers.test.mjs`：路由数 11 → 13。
- `src/appExtracted/appControlFactories.test.tsx`：新增两个工厂的用例。
- `src/runtimeSnapshot.test.ts`：`serializeDom` / `buildDomOutline` 用例。
- `docs/MCP.md` / `docs/ARCHITECTURE.md`。

## 影响面与风险

- **公共契约扩大**：新增 3 个 v1 端点 + 3 个 MCP 工具。都是**增量**，不改已有端点语义。
- **前端指令表扩大**：`App.tsx` 的 `commandHandler` dispatch 从 11 条到 13 条。未知指令仍回 `unknown-command`。
- **切空间会重载页面**：MCP 调用方必须知道这是异步生效的（回执只表示已排期）。已在工具描述与回执字段（`scheduled`）里写明。
- **未保存修改一律拒**：三项能力里两个写操作都不弹模态框，改为显式 `bad-request`。这是给 MCP 的确定性契约，代价是「必须显式保存」——比静默丢草稿好。

## 验证

1. 定向：`pnpm vitest run src/runtimeSnapshot.test.ts src/appExtracted/appControlFactories.test.tsx server/apiV1RuntimeHandlers.test.mjs server/apiV1ControlHandlers.test.mjs server/swigger.examples.test.mjs server/swaggerPage.test.mjs server/routeCoverage.test.mjs server/mcp/`
2. 全量一次：`pnpm vitest run`（已知 2 个环境性失败与本次改动无关，见前次交付说明）。
3. `pnpm audit:names`（改了 `server/*.mjs` 对 `src/**/*.ts` 的 import 面）。
4. MCP 端到端：`server/mcp/mcpHttp.test.mjs` 里补一条「无在线会话时 gmp_get_page_dom 回 no-online-client」。

## 第二轮补充：多页面时如何指定目标（token）

### 问题

前端与后端的运行时态/写操作全走一条 WS（`/webgrp/ws`），后端靠 WS 注册时的
clientId 决定「发给哪一个页面」。此前 clientId 存在 **localStorage** —— 同浏览器
多标签页共用同一个 id，注册表按 id 去重（后注册的顶掉前一个，见
`server/runtimeRegistry.mjs` 的 register 注释里那次实测缺陷）。于是多页面在线时
调用方**无法指定**目标，只能退回「最近活跃的那个」：静默打错页面。

### 方案（按用户口径）

1. **token 进地址栏**：每个页面把自己的 token 写进 `?token=<值>`（`history.replaceState`，
   不重载、不动 hash 里的 `#space=…&model=…`），**该值同时就是 WS clientId**。
   于是「地址栏里的 token」= 「注册表里的 clientId」= 「MCP 的 token 参数」。
2. **MCP 会话类工具收 `token`**（不再是 `clientId`）：
   - 传了 → 必须是本空间在线页面，否则 `not-found`（附可选清单）；
   - 没传 + 本空间只有 1 个页面 → 自动用它；
   - 没传 + 多个页面 → **拒绝**（`token-required`，列出可选 token），不猜。
3. **v1 REST 不动**：`/webgrp/v1/runtime/*`、`/control/*` 保持「不填 clientId 取最近活跃」
   （已发布的第三方契约）。MCP 侧更严，因为它是人/Agent 直接驱动多页面的入口。

### 落点

| 文件 | 变更 |
|------|------|
| `src/runtimeToken.ts`（新） | 纯函数：`readTokenFromUrl` / `withTokenInUrl` / `createPageToken` / `isValidToken` |
| `src/runtimeWsClient.ts` | clientId 改为「地址栏 token → 生成并写回」，去掉 localStorage 依赖；新增可选 `clientId` 覆盖 |
| `src/appExtracted/appTopbar.tsx` | RT-WS 指示灯提示文案改为「页面 token」 |
| `server/mcp/clientToken.mjs`（新） | `resolveClientToken(token, {spaceId, clients})` → `{clientId}` 或 `{error}` |
| `server/mcp/tools.mjs` | 注册表末尾统一把入参 `clientId` 改成 `token` 并解析成确定 clientId（**一处**完成，避免逐个工具漏改）；`gmp_list_runtime_clients` 的**出参**也把 `clientId` 改名成 `token`（v1 契约不动） |
| `server/mcp/v1Bridge.mjs` | `token-required` 的可执行建议 |
| `server/runtimeRegistry.mjs` | 新增 `isClientLive(clientId)`（记录 `isOpen` 存活探针；缺探针时按「活着」处理） |
| `server/runtimeWs.mjs` | 注册前做 token 占用仲裁：先等一轮再判，旧连接已断则沿用原 token，仍被占才给后缀并回 `renamed` |

### 第二轮补充（续）：复制标签页自动换 token

「复制标签页」会把地址栏里的 `?token=` 一起复制 → 两个页面抢同一个 clientId。
最初的版本只是把这条写进「已知限制」，后来按用户要求改成**自动去重**：

- 注册时若 token 被一条**仍活着**的连接占着，不立刻顶替，而是每 250ms 复查一次，最多 1.25s；
- 期间旧连接若断开（刷新 / 切空间 reload 的典型情形）→ **沿用原 token**。这一步是关键：
  若无条件换 token，用户抄给 MCP 的 token 会在每次刷新后失效，比撞 id 更糟；
- 等满仍被占（确实是复制出来的另一个页面）→ 分配第一个空闲后缀
  （`page-x` → `page-x-2` → `page-x-3`），回执带 `renamed: true`；
- 前端收到 `renamed` 回执后把新 token 写回**本页**地址栏，并通过
  `onClientIdChange` 刷新顶栏显示（`clientId` 改成 getter，读到的永远是当前值）。

### 取舍与已知限制

- **不复用 localStorage**：它正是「多标签页撞 id」的根因。代价是 qiankun 嵌入模式
  下无法写宿主地址栏，此时 token 只在本次页面生命周期内有效（刷新换新）。
- **仲裁有最多 1.25s 的延迟**，且只发生在「token 正被另一个活连接占用」时。刷新场景
  通常在第一个 250ms 轮询就解决；复制标签页才会等满。
- **registry 的顶替语义保留**：WS 层不再主动顶替，但 `register` 直接调用（单测/其它
  调用方）仍旧会替换 —— 那条路径有它自己的注释与历史缺陷记录，不动。
