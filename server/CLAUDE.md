<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-06-22 -->

# server

## Purpose

后端服务（Node.js ESM `.mjs`）。提供图片/方案/配置读写 REST API、第三方只读 `/api/v1` 信封 API、运行时态 WS 桥接、`/swigger` 接口文档页。开发期与 Vite (5173) 同跑，默认监听 5174。

## Key Files

| File | Description |
|------|-------------|
| `image-server.mjs` | 主服务创建：HTTP 路由分发、静态托管、WS 挂载、v1 路由装配；`GRAPH_MODEL_DATA_DIR` 覆盖数据根 |
| `dev.mjs` | 开发入口：起 image-server + spawn vite；打印 swigger 地址 |
| `runtimeWs.mjs` | /ws 升级 + 客户端注册表 + fetchFromClient（向前端拉运行时态） |
| `runtimeRegistry.mjs` | 客户端注册表纯逻辑：register/unregister/touch/listClients/fetchFromClient + 超时清理 |
| `apiV1Runtime.mjs` | v1 运行时态端点（clients/model/devices/selection/tabs/screenshot/svg/e-file），经 WS 透传 |
| `apiV1Schemes.mjs` | v1 方案域只读端点（hierarchy/models/export/model json/svg） |
| `apiV1Library.mjs` | v1 图元库域只读端点（categories/devices/measurements/device-definitions/templates） |
| `apiV1Control.mjs` | v1 控制台写操作端点（9 端点：device/scheme/model/select/group/delete/update/save/template），经 WS 下发到前端 __appScope |
| `v1Response.mjs` | v1 信封工具：sendV1Json / sendV1JsonNoStore / 错误码→HTTP 状态映射 |
| `schemePath.mjs` | schemePath 编解码工具（`encodeURIComponent(JSON.stringify([...]))`） |
| `swaggerPage.mjs` | /swigger 自包含 HTML：接口元数据 + highlight.js + 可折叠 JSON 树 + 复制按钮；导出 `SWIGGER_ENDPOINTS` 供测试 |
| `image-server.test.mjs` / `routes.test.mjs` | 服务路由测试 |
| `apiInternal.test.mjs` | 内部 /api/* 读写层 CRUD + 错误码集成测试 |
| `apiV1*.test.mjs` / `*.handlers.test.mjs` | v1 各域 handler 测试 |
| `runtimeRegistry.test.mjs` / `runtimeWs.test.mjs` | 运行时态注册表与 WS 桥接测试 |
| `swigger.examples.test.mjs` | 遍历 SWIGGER_ENDPOINTS 对全部示例自动化验证 |
| `v1Response.test.mjs` | 信封工具测试 |

## For AI Agents

### Working In This Directory

- 后端统一 `.mjs`（ESM），`package.json` `"type": "module"`。
- 新增 v1 端点：在对应 `apiV1*.mjs` 加 handler → `image-server.mjs` 注册路由 → `swaggerPage.mjs` 加端点+示例 → `swigger.examples.test.mjs` 加期望。
- WS 透传：`fetchFromClient` 成功 resolve 裸 data（非信封），失败 reject `Error` 带 `.code`。
- 数据隔离：测试用 `GRAPH_MODEL_DATA_DIR` env 指向 tmpdir，image-server 模块加载时求值一次。
- schemePath 单次 `encodeURIComponent`，示例值存原始 JSON 字符串，`buildUrl` 统一编码。

### Testing Requirements

- `pnpm vitest run server/` 跑后端测试
- 改动 swigger 后跑 `swigger.examples.test.mjs`（54 示例）
- 改动 v1 端点跑对应 `apiV1*.test.mjs`

### Common Patterns

- v1 错误码→HTTP：bad-request→400，not-found/no-active-model/no-selection→404，no-online-client/ws-timeout→503，internal→500
- v1 信封：`{ok:true,data}` / `{ok:false,error:{code,message}}`
- /swigger 内联 JS 用 `\\n`（双反斜杠）输出字面换行，避免模板字面量 SyntaxError

## Dependencies

### Internal

- `src/runtimeWsClient.ts` — 前端 WS 对端
- `src/runtimeSnapshot.ts` / `runtimeScreenshot.ts` — 前端响应 fetch 的序列化器

### External

- `ws` 8.x — WebSocket
- Node 内置 `http` / `fs/promises`

<!-- MANUAL: -->
