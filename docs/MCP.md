# MCP 服务（/webgrp/mcp）

把本平台暴露成 **Model Context Protocol** 服务，让 AI 客户端（Claude Code、Cursor、MCP Inspector 等）
用统一协议读取方案、图元库、前端运行时态，检查或修复模型拓扑，并导出模型文件。

- **传输**：streamable HTTP，**无状态**模式（每个 POST 一次 JSON-RPC 往返，不建 SSE 长连接）
- **地址**：`http://127.0.0.1:5174/webgrp/mcp`（后端默认端口 5174）
- **协议版本**：MCP `2025-06-18`（SDK 1.32.2 默认）
- **实现**：`server/mcp/`（4 个源文件 + 3 个测试文件）

> MCP 不是第三份实现 —— 它是 v1 API 的**第二个前端**。所有工具都转调
> `server/apiV1*.mjs` / `server/eFileExport.mjs` / `server/cimExport.mjs` / `server/sendModel.mjs`
> 已导出的 handler，参数校验、错误码、空间隔离口径全部与 v1 同源。

---

## 连接

### 命令行客户端（MCP Inspector）

```bash
npx @modelcontextprotocol/inspector
# Transport: Streamable HTTP
# URL:        http://127.0.0.1:5174/webgrp/mcp
```

### 配置文件

```json
{
  "mcpServers": {
    "graph-modeling-platform": {
      "type": "http",
      "url": "http://127.0.0.1:5174/webgrp/mcp"
    }
  }
}
```

### 空间选择

MCP **不做自己的空间解析** —— 走派发层（`server/server.mjs`）那一套解析链，
与 v1 API 完全一致：

| 优先级 | 来源 | 写法 |
|--------|------|------|
| 1 | `X-Space` 请求头 | `X-Space: <空间id>` |
| 2 | `?space=` 查询参数 | `http://127.0.0.1:5174/webgrp/mcp?space=<空间id>` |
| 3 | Cookie `gmp_space` | 由浏览器端空间切换器写入 |
| 4 | 回退首个空间 | `spaces[0]` |

**MCP 端点不在 `isSpaceAgnostic` 白名单里** —— 空间隔离对 MCP 与 v1 一视同仁。
指定了不存在的空间 → 400 `SPACE_UNKNOWN`。

> 前端页面（`http://127.0.0.1:5173`）只设 Cookie、不带 `X-Space` 头；
> 命令行客户端用 `X-Space` 头或 `?space=` 更方便。

### 页面选择（token）

空间决定「读哪份数据」，**token 决定「操作哪一个前端页面」**。多个页面同时在线时，
运行时态读取和 `target=current` 的拓扑操作需要指定页面时，使用 `token`（就是页面地址栏里的 `?token=`）：

```jsonc
{ "name": "gmp_get_runtime_tabs", "arguments": { "token": "page-3f8a1c9d2b4e" } }
```

只有一个页面在线时可以不填。完整规则见下文「页面 token」一节。

---

## 协议细节

| 事项 | 行为 |
|------|------|
| `POST /webgrp/mcp` | 正常 JSON-RPC 往返（`Accept` 必须同时含 `application/json` 与 `text/event-stream`，否则 SDK 回 406） |
| `GET /webgrp/mcp` | **405** + `Allow: POST`（无状态模式不建 SSE 长连接，否则连接不关、进程退不出） |
| `DELETE /webgrp/mcp` | **405** + `Allow: POST`（无状态模式没有会话可关） |
| Origin 非本机 | **403**（MCP 有写操作，浏览器里任意网页都能对本机端口发 POST —— 发送不受 CORS 约束） |
| 缺少空间上下文 | **503**（接线 bug：派发层恒注入 spaceId） |

无状态模式的代价：**每个 POST 都新建一个 transport + 一个 McpServer**（SDK 在
`sessionIdGenerator` 未设时禁止复用 transport）。当前 31 个工具的注册耗时约 5ms，
相对一次模型往返可忽略。

---

## 工具清单（31 个）

### 方案域（读已落盘数据，不需要前端在线）

| 工具 | 作用 | 参数 |
|------|------|------|
| `gmp_list_schemes` | 列方案树（方案名、更新时间、模型摘要） | `includeProjects?`（true 时带回完整模型数据，很大） |
| `gmp_list_scheme_models` | 列某方案下的模型（方案编号、模型名 + 更新时间） | `schemeId?`、`schemePath?`（至少一个；可同时传，须指向同一方案） |
| `gmp_get_model_json` | 读模型完整 JSON（节点、连线、量测） | `schemeId?`、`schemePath?`（至少一个；同时传须一致）、`name` |
| `gmp_export_model` | 导出模型为 SVG / E 文件 / CIM XML | `schemeId?`、`schemePath?`（至少一个；同时传须一致）、`name`、`format`∈`svg｜e-file｜cim-xml`，以及按 format 限定的可选参数（见下） |
| `gmp_export_scheme_archive` | 打包整个方案为 ZIP（二进制） | `schemeId?`、`schemePath?`（至少一个；同时传须一致） |
| `gmp_send_model` | 把模型 POST 到外部接收端 | `url`、`files[]`、`modelId` 或 `schemeId?` / `schemePath?` + `name`（方案选择器可同时传，须一致）、`templateName?` |

每个空间内的方案（包括子方案）都有唯一的正整数 `schemeId`。方案重命名或移动时编号不变；复制和导入会分配新编号。优先用 `gmp_list_schemes` 查看编号。旧调用继续支持 `schemePath`；`schemeId` 与 `schemePath` 可单独或同时提供，同时提供时必须指向同一方案。

`gmp_export_model` 的**按 format 限定**参数（传了不适用于该 format 的参数会**报错**，
不静默丢弃）：

| format | 可选参数 |
|--------|----------|
| `svg` | `colorMode`∈`energy｜voltage`（默认 energy）、`encoding`∈`utf-8｜gbk` |
| `e-file` | `encoding`、`templateName`（预定义模板）、`templateText`（自定义模板，优先于 templateName） |
| `cim-xml` | `modelId`、`strict` |

预定义 E 模板：`国网E格式`、`主网实时库`、`配网实时库`、`台区实时库`。

### 拓扑检查与修复

| 工具 | 作用 | 参数 | 注解 |
|------|------|------|------|
| `gmp_check_topology` | 检查当前页面或指定已保存模型；返回错误、告警、拓扑岛数量及参数修正预览 | `target`∈`current｜saved`；`saved` 时需 `schemeId?` / `schemePath?`（至少一个；同时传须一致）及 `name`；`current` 时可传 `token?` | 不保存模型；**读取不是纯只读**：首次读取可能初始化全局线路登记表并迁移存量数据 |
| `gmp_repair_topology` | 应用现有自动参数修正；当前页面只改内存，已保存模型有修正时直接落盘 | 同 `gmp_check_topology` | 写；**已保存模型会直接写盘**（`destructiveHint: true`） |

两工具仅处理一个模型，不新增结构拓扑修复规则。修复后仍有阻断错误时，会返回剩余错误；已安全生成的参数修正仍可应用。
读取已保存模型可能首次初始化所选工作空间的全局线路登记表，并迁移存量数据。此副作用来自既有模型读取链。

### 图元库域（读当前空间的图元库，不需要前端在线）

| 工具 | 作用 | 参数 |
|------|------|------|
| `gmp_get_library` | 读图元库 | `part?`∈`all｜categories｜devices｜measurements｜device-definitions｜templates`（默认 all） |

`part=devices` 的返回里有 `eSections`（E 段定义：段名 + 所属大类 + 列名）、
`staticComponentLibraries`（静态图元 kind → 元件库映射）、`customComponentLibraries`。

### 运行时态域（读前端当前状态，**需要前端页面在线**）

| 工具 | 作用 | 参数 |
|------|------|------|
| `gmp_list_runtime_clients` | 列在线前端页面。**每条带 `token`**（= 该页面地址栏的 `?token=`）、所属空间、注册与最后活跃时间 | 无 |
| `gmp_get_runtime_model` | 读取当前页面打开的模型定位信息 | `token?` |
| `gmp_get_runtime_devices` | 读取当前模型的图元与连线 | `token?` |
| `gmp_get_runtime_selection` | 读取当前页面选中状态 | `token?` |
| `gmp_get_runtime_tabs` | 读三面板快照（model / tree / graph） | `token?`、`tab?` |
| `gmp_capture_runtime_screenshot` | 截取画布 PNG（返回图片块） | `token?`、`width?`、`height?` |
| `gmp_get_runtime_svg` | 导出现前画布 SVG 文本 | `token?` |
| `gmp_get_runtime_e_file` | 导出当前模型 E 文件文本 | `token?`、`templateName?`、`templateText?` |

### 页面结构域（查看页面本身，**需要前端页面在线**）

这项不读数据文件，也不修改模型，只查看页面的结构。

| 工具 | 作用 | 参数 | 注解 |
|------|------|------|------|
| `gmp_get_page_dom` | 读整体 DOM 结构（默认元素树，可选整页 HTML） | `token?`、`format?`∈`outline｜html`、`maxDepth?`、`maxNodes?`、`maxTextLength?`、`maxChars?` | 读 |

#### `gmp_get_page_dom` 的两种格式

| format | 返回 | 用途 |
|--------|------|------|
| `outline`（默认） | 元素树 `{tag, id, classes, role, text, children}`，深度默认 6、节点数默认 800、每节点文本默认 120 字符 | 看「页面有哪些区域、当前模型名在哪」 |
| `html` | `document.documentElement.outerHTML`，默认截到 200 000 字符 | 需要原始标记时用（带画布的页面几百 KB，别当默认） |

两种格式都回 `{format, title, url, nodeCount, truncated}`；`truncated: true` 表示结构
不完整（撞了深度/节点数/字符上限），不要当成「页面就这么多东西」。
`<script>` / `<style>` / `<link>` / `<meta>` 在 outline 里被跳过 —— 它们体积大、
对「页面长什么样」零信息量。

### 控制台写操作（需要前端页面在线）

| 工具 | 作用 |
|------|------|
| `gmp_add_device` | 在当前模型新增图元 |
| `gmp_create_scheme` | 新建方案 |
| `gmp_create_model` | 新建模型 |
| `gmp_select_devices` | 修改当前选中集 |
| `gmp_group_selected_devices` | 组合当前选中图元 |
| `gmp_delete_devices` | 删除当前模型图元（破坏性） |
| `gmp_update_device_property` | 修改图元属性 |
| `gmp_save_model` | 将当前模型或方案树落盘 |
| `gmp_save_template_from_selection` | 从当前选区保存模板 |
| `gmp_import_device_definition` | 预览 E 元件定义导入结果 |
| `gmp_switch_space` | 让前端切换工作空间并重载 |
| `gmp_switch_model` | 让前端打开另一个已保存模型 |

控制台写操作只通过在线前端页面执行；模型内存变更不会自动落盘，需另调
`gmp_save_model`。`gmp_import_device_definition` 只做匹配预览，不写入配置。

### 拓扑域

| 工具 | 作用 | 参数 | 注解 |
|------|------|------|------|
| `gmp_check_topology` | 检查当前页面或已保存模型 | `target`、目标定位参数、`token?` | 读取；已保存模型检查可能初始化全局线路数据 |
| `gmp_repair_topology` | 应用自动拓扑参数修正 | 同 `gmp_check_topology` | 当前页面需要在线；已保存模型会写盘 |

### 元件定义域

| 工具 | 作用 | 参数 | 注解 |
|------|------|------|------|
| `gmp_export_device_definition` | 导出当前图元库的 E 元件定义文本 | 无 | 只读 |

`gmp_send_model` 标了 `openWorldHint: true` —— 它会向**外部地址**发请求。

---

## 三条硬约束

1. **前端运行时读取与当前页面拓扑操作需要页面在线**
   浏览器打开 `http://127.0.0.1:5173` 并保持不关。运行时态和 `target=current`
   的拓扑操作经 WebSocket 桥接前端页面。没有在线会话时返回 `no-online-client`。
   已落盘模型的方案、模型、图元库和 `target=saved` 拓扑操作不依赖前端页面。
   → 调用前先 `gmp_list_runtime_clients` 确认。

2. **拓扑修复的目标不同，写入行为也不同**
   `target=current` 只修改前端内存；`target=saved` 会直接修改已保存模型。
   调用前应确认目标范围，避免把页面临时修改误认为已经落盘。

3. **多页面在线时必须用 `token` 指定目标页面**
   本空间只有一个在线页面 → 不填 `token` 也能用（自动就是它）；
   有 ≥2 个 → 不填就**拒绝**（`token-required`，文案里列出可选 token），
   不猜、不退回「最近活跃」。`token` 就是页面地址栏里的 `?token=`，见下节。
   显式传了 token 但它不在本空间 → `not-found`（防打到别的空间的前端）。

---

## 页面 token（多页面时指定操作哪一页）

### token 从哪来

每个前端页面在打开时会把 `?token=<值>` 写进**自己的地址栏**（`history.replaceState`，
不重载、不动 hash 里的 `#space=…&model=…`）。这个值同时就是该页面 WS 注册用的
clientId —— 所以「地址栏里看到的 token」与「后端注册表里的条目」一一对应。

- 从地址栏复制整条链接给别人，对方打开就是**同一个** token；
- 刷新 / 切空间（`location.reload()`）后 token 不变（query 会活过 reload）；
- 顶栏 **RT-WS 指示灯**悬停即可看到 token，点击复制。

### 什么时候必须传

| 本空间在线页面数 | 不传 `token` | 传 `token` |
|------------------|--------------|------------|
| 0 | `no-online-client` | `not-found` |
| 1 | 自动选它 | 必须匹配它 |
| ≥2 | **`token-required`**（附可选 token 清单） | 必须匹配其中一个 |

### 与 v1 REST 的区别

v1 的 `/webgrp/v1/runtime/*` 保持 `clientId` 口径；MCP 侧使用 `token`，并在多页面时
要求明确指定目标页面。当前 MCP 工具集不包含通用控制台写工具；拓扑操作按 `target`
区分当前页面和已保存模型。

### 已知限制

同一个 token 只能对应一个在线条目（注册表按 clientId 去重）。**复制标签页不会再撞车**：
两个页面带着同一个 `?token=` 上来时，服务端在注册阶段仲裁 ——

- 先等一轮（250ms 轮询，最多 1.25s）：刷新 / 切空间 reload 时旧 socket 往往还挂在
  注册表里几百毫秒，这种情形**沿用原 token**（否则用户抄给 MCP 的 token 会在每次刷新后失效）；
- 等满仍被占 → 那确实是另一个页面，服务端给一个后缀 token（`page-x` → `page-x-2`），
  回执带 `renamed: true`，前端把新值写回自己的地址栏并更新顶栏显示。

所以复制出来的标签页会在一秒左右拿到自己的 token，两个页面都能被 MCP 分别指定。
仲裁期间服务端会先发一条 `token-conflict` 通知（前端只等待，不自行改 token）。

另一个边界：qiankun 嵌入模式下**不写**宿主地址栏（那是主应用的路由），此时 token 只在
本次页面生命周期内有效，刷新会换一个新的（旧 token 由注册表在连接断开后清掉）。

---

## 返回形状

### JSON 类工具

```jsonc
{
  "content": [{ "type": "text", "text": "……" }],   // 人 / LLM 可读
  "structuredContent": {                            // 机器可读
    "ok": true,
    "data": { }
  }
}
```

失败时：

```jsonc
{
  "content": [{ "type": "text", "text": "错误（not-found）：方案不存在。\n建议：先调 gmp_list_schemes 确认方案名…" }],
  "structuredContent": { "ok": false, "error": { "code": "not-found", "message": "方案不存在。" } },
  "isError": true
}
```

错误码沿用 v1：

| code | 含义 | 建议动作 |
|------|------|----------|
| `bad-request` | 参数不合法 | 按 message 改参数 |
| `not-found` | 方案/模型不存在 | 先用 `gmp_list_schemes` 确认 `schemeId`，再用 `gmp_list_scheme_models` 确认模型名 |
| `payload-too-large` | 请求体超限 | 缩小输入 |
| `no-online-client` | 没有在线前端会话 | 打开前端页面；或 `gmp_list_runtime_clients` 看会话 |
| `token-required` | 本空间有多个在线页面但没传 `token` | 取目标页面地址栏的 `?token=` 作为 `token` 参数重试；文案里已列出可选项 |
| `ws-timeout` | 前端没在超时内应答 | 稍后重试；前端页面可能卡住 |
| `no-active-model` | 前端没打开模型 | 先在界面上打开模型 |
| `no-selection` | 当前没有选中 | 先在 webgrp 页面中选中图元 |
| `internal` | 后端异常 | 看后端日志 |

### 二进制工具

`gmp_capture_runtime_screenshot`（PNG）→ `content` 里一个 `image` 块；
`gmp_export_scheme_archive`（ZIP）→ 一个 `resource` 块（`uri` 是 `data:application/zip;base64,…`，
`blob` 是 base64）。这两个工具**不声明 outputSchema**（字节不是 JSON），
`structuredContent` 只放 `{ filename, bytes, mimeType }`。

### 文本类工具

SVG / E 文件 / CIM XML 的正文放 `content` 的 `text` 块，
`structuredContent.data = { text, filename, mimeType }`。
E 文件默认 **GBK** 编码，工具层按响应头 charset 解码（不会给出乱码）。

---

## 已知限制

- **无状态**：没有会话、没有 SSE 推送。服务端主动通知（`notifications/*`）不可用。
- **每请求重建 server**：工具注册每次重做（约 5ms）。
- **页面相关操作依赖前端**：没有前端页面时运行时态和 `target=current` 拓扑操作不可用；已落盘数据读取与 `target=saved` 拓扑修复仍可用。
- **`gmp_get_page_dom` 受截断限制**：`outline` 有深度/节点数上限，`html` 有字符上限；
  `truncated: true` 时结构不完整。需要完整标记时显式放大 `maxChars` / `maxNodes`。
- **空间由请求头/query/Cookie 决定**：同一客户端连不同 `X-Space` 即读不同空间的数据。
- **Origin 校验只挡跨源网页**：命令行 / Agent 客户端没有 Origin 头，一律放行 ——
  本机服务本身不做鉴权，靠端口不对外暴露来兜底。

---

## 代码位置

| 文件 | 职责 |
|------|------|
| `server/mcp/v1Bridge.mjs` | 驱动 v1 handler 的桥（假 request/response 捕获信封） |
| `server/mcp/tools.mjs` | 31 个工具定义（参数翻译 + 信封搬运 + 错误可执行化） |
| `server/mcp/mcpServer.mjs` | 装配 `McpServer`（server info + instructions + 注册工具） |
| `server/mcp/httpHandler.mjs` | `/webgrp/mcp` 的 POST / GET / DELETE 入口（Origin 校验 + 无状态 transport） |
| `server/mcp/mcpBridge.test.mjs` | 桥的单测 |
| `server/mcp/mcpTools.test.mjs` | 工具层单测（InMemoryTransport + 官方 Client） |
| `server/mcp/mcpHttp.test.mjs` | 端到端（官方 Client + StreamableHTTPClientTransport） |
| `server/mcp/clientToken.mjs` | token → clientId 解析（单页面自动选 / 多页面要求指定） |
| `src/runtimeToken.ts` | 页面 token ↔ 地址栏 `?token=`（纯函数） |
| `src/runtimeWsClient.ts` | 用地址栏 token 作为 WS clientId，缺省时生成并写回地址栏 |
| `src/runtimeDom.ts` | 页面 DOM 序列化纯函数（`buildDomOutline` / `serializeDomHtml`） |
| `src/runtimeSnapshot.ts` | `runtime.dom` 的 resource 分派（`serializeDom`） |
| `src/appExtracted/appControlFactories.tsx` | 切空间 / 切模型的程序化方法（`programmaticSwitchSpace` / `programmaticSwitchModel`） |
| `server/apiV1Runtime.mjs` | `GET /v1/runtime/dom` handler |
| `server/apiV1Control.mjs` | `POST /v1/control/space/switch`、`POST /v1/control/model/switch` handler |
| `docs/superpowers/plans/2026-10-28-mcp-extend.md` | 第二轮扩展（三项能力）的实施计划 |
| `docs/mcp-evaluation.xml` | 10 题只读评测（数据类问答，均可在无前端会话下复现） |

挂载点在 `server/server.mjs` 的 `exactRouteHandlers`（`routeKey("POST"｜"GET"｜"DELETE", "/mcp")`）。
`/mcp` 不进 swagger（它不是 REST 端点），已在 `server/routeCoverage.test.mjs` 的
`INTENTIONALLY_UNDOCUMENTED` 里登记。
