<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-06-22 -->

# server

## Purpose

后端服务（Node.js ESM `.mjs`）。提供图片/方案/配置读写 REST API、第三方只读 `/api/v1` 信封 API、运行时态 WS 桥接、`/swigger` 接口文档页。开发期与 Vite (5173) 同跑，默认监听 5174。

## Key Files

| File | Description |
|------|-------------|
| `server.mjs` | 主服务创建：HTTP 路由分发、静态托管、WS 挂载、v1 路由装配；`GRAPH_MODEL_DATA_DIR` 覆盖数据根 |
| `dev.mjs` | 开发入口：起 image-server + spawn vite；打印 swigger 地址 |
| `runtimeWs.mjs` | /ws 升级 + 客户端注册表 + fetchFromClient（向前端拉运行时态） |
| `runtimeRegistry.mjs` | 客户端注册表纯逻辑：register/unregister/touch/listClients/fetchFromClient + 超时清理 |
| `apiV1Runtime.mjs` | v1 运行时态端点（clients/model/devices/selection/tabs/screenshot/svg/e-file），经 WS 透传 |
| `apiV1Schemes.mjs` | v1 方案域只读端点（hierarchy/models/export/model json/svg） |
| `apiV1Library.mjs` | v1 图元库域只读端点（categories/devices/measurements/device-definitions/templates） |
| `apiV1Control.mjs` | v1 控制台写操作端点（9 端点：device/scheme/model/select/group/delete/update/save/template），经 WS 下发到前端 __appScope |
| `apiV1Receive.mjs` | 联调接收端 `/v1/receive`（POST 收「发送模型」转发来的内容并回解析摘要、GET 回看、DELETE 清空）；内存留最近 5 次、不落盘、不鉴权 |
| `sendModel.mjs` | `/v1/schemes/model/send` 适配层：按 modelId（模型 idx，兼容 schemePath+name）定位已保存模型，按所选格式生成 E/JSON/SVG/CIM，以 multipart/form-data 转发到调用方给定 URL |
| `eFileExport.mjs` | `/v1/schemes/model/e-file` 适配层（GET 预定义模板 / POST 自定义模板文本）：读盘模型 + 库配置，用 `src/export/e-file.ts` 装配选项（`buildEFileExportOptionsFromLibrary` / `applyPredefinedEDeviceTemplateToLibraryState`）、`src/model-eexport.ts` 的 `buildEFileExport` 生成，默认 GBK |
| `eFileTemplates.mjs` | 预定义 E 元件模板读取（`PREDEFINED_E_DEVICE_TEMPLATES` / `readPredefinedTemplateBase64`） |
| `svgExport.mjs` | `/v1/schemes/model/svg` 适配层：`buildEffectiveLibraryTemplates` 装配库模板（含 `deviceDefinitionOverrides`），配色读 `settings/color-config.json`，被引用图片经 manifest 内联为 data URL；XML 声明与 `encoding=gbk\|utf-8` 由 handler（`apiV1Schemes.mjs`）输出，保证响应体与前端落盘文件逐字节一致 |
| `cimExport.mjs` | `/v1/schemes/model/cim-xml` 适配层：调 `src/cim/cim-export.ts`（strict 关键参数校验、modelId 解析），量测配置读 `readMeasurementConfig()` |
| `domShim.mjs` | Node 侧 localStorage 桩；适配层在 import `src/**/*.ts` 前先调用 `installDomShim()`。模块顶层把 `NODE_ENV` 兜底为 `production`（否则 Node 进程加载 react.development.js，SVG 渲染慢约 45%；产物字节已比对一致，`??=` 不覆盖 vitest 的 `test`） |
| `nativeLoad.test.mjs` | 守卫：spawn 真实 node 子进程直载三适配层，防 `.tsx` 或漏 `.ts` 扩展名混入 |
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
- Node 下限 **24**（`package.json` `engines`）：三适配层靠 Node 原生 TS 直载 `.ts`，低于 22.18/23.6 时首次 `/v1/` 请求抛 `ERR_UNKNOWN_FILE_EXTENSION`，被外层 catch 成 500（信息含扩展名）。
- 新增 v1 端点：在对应 `apiV1*.mjs` 加 handler → `server.mjs` 注册路由 → `swaggerPage.mjs` 加端点+示例 → `swigger.examples.test.mjs` 加期望。
- WS 透传：`fetchFromClient` 成功 resolve 裸 data（非信封），失败 reject `Error` 带 `.code`。
- 数据隔离：测试用 `GRAPH_MODEL_DATA_DIR` env 指向 tmpdir，image-server 模块加载时求值一次。
- schemePath 单次 `encodeURIComponent`，示例值存原始 JSON 字符串，`buildUrl` 统一编码。
- 三导出适配层经 Node 原生 TS 直载 `src` 下 TS 模块（如 `src/export/`、`src/cim/`、`src/model-eexport.ts`，零构建产物）：相对 import 必须带 `.ts` 扩展名，不得 import `.tsx`；被直载模块不得是 `.tsx`、不得含 JSX/React 组件（闭包内可间接 import npm 包 `react`，如 `src/svgUtils.ts`，Node 能正常加载）。守卫见 `nativeLoad.test.mjs`。

### Testing Requirements

- `pnpm vitest run server/` 跑后端测试（含三导出适配层：`svgExport.test.mjs` / `apiV1Schemes.e-file.test.mjs` / `cimExport.test.mjs` 与 Node 原生直载守卫 `nativeLoad.test.mjs`）
- 改动 swigger 后跑 `swigger.examples.test.mjs`（54 示例）
- 改动 v1 端点跑对应 `apiV1*.test.mjs`
- 新增/改动 `server/*.mjs` 对 `src/**/*.ts` 的 import 后跑 `pnpm audit:names`（穿透 `@ts-nocheck` 的未定义名审计）

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
