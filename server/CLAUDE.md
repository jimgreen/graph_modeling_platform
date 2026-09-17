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
| `apiV1Control.mjs` | v1 控制台写操作端点（11 端点：device/scheme/model/select/group/delete/update/save/template/e-device-definition），经 WS 下发到前端 __appScope |
| `spaceId.mjs` | 空间 id 生成与校验（允许中文，排除 Windows 保留名与路径分隔符） |
| `spaceStore.mjs` | 空间注册表 + `SpacePaths` 工厂 + 请求空间解析链；default 空间直接复用数据根 |
| `cors.mjs` | 跨源头**唯一一份**（`access-control-*`）；`server.mjs` 与 `v1Response.mjs` 均从此导入 —— **勿在别处再定义一份**（T13 单源化） |
| `apiV1Receive.mjs` | 联调接收端 `/v1/receive`（POST 收「发送模型」转发来的内容并回解析摘要、GET 回看、DELETE 清空）；内存留最近 5 次、不落盘、不鉴权 |
| `sendModel.mjs` | `/v1/schemes/model/send` 适配层：按 modelId（模型 idx，兼容 schemePath+name）定位已保存模型，按所选格式生成 E/JSON/SVG/CIM，以 multipart/form-data 转发到调用方给定 URL |
| `eFileExport.mjs` | `/v1/schemes/model/e-file` 适配层（GET 预定义模板 / POST 自定义模板文本）：读盘模型 + 库配置，用 `src/export/e-file.ts` 装配选项（`buildEFileExportOptionsFromLibrary` / `applyPredefinedEDeviceTemplateToLibraryState`）、`src/model-eexport.ts` 的 `buildEFileExport` 生成，默认 GBK。**方案 ZIP 复用同一装配**（`buildEFileForSavedModel`） |
| `eFileTemplates.mjs` | 预定义 E 元件模板读取（`PREDEFINED_E_DEVICE_TEMPLATES` / `readPredefinedTemplateBase64`） |
| `svgExport.mjs` | `/v1/schemes/model/svg` 适配层：`buildEffectiveLibraryTemplates` 装配库模板（含 `deviceDefinitionOverrides`），配色读 `settings/color-config.json`，被引用图片经 manifest 内联为 data URL；XML 声明与 `encoding=gbk\|utf-8` 由 handler（`apiV1Schemes.mjs`）输出，保证响应体与前端落盘文件逐字节一致。**方案 ZIP 复用同一装配**（`renderSavedModelSvg`，colorMode=voltage） |
| `schemeArchive.mjs` | 方案 ZIP 构建（`buildSchemeArchiveBuffer` / `listModelJsonFiles`）：枚举方案目录下模型 `.json`，派生格式**不落盘**、打包时经注入的 `renderArtifacts` 逐模型实时生成 `.e` / `.svg`（复用 `svgExport.mjs` + `eFileExport.mjs` 同一装配）；只做「目录 → ZIP 字节」，不 import 渲染适配层，保持可单测 |
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
- **`data/schemes/files/**` 只落 `.json`**：保存模型不再产 `.e` / `.svg`（旧简化渲染器 `buildSvgFile` / `buildDeviceParameterFile` 已删除，`writeSchemeFiles` 的 `expectedFiles` 只登记 jsonPath）。E / SVG / CIM 一律按需实时生成——单模型端点、方案 ZIP（`schemeArchive.mjs`）、前端导出按钮共用同一装配；旧 `.e` / `.svg` 不复用、不读取。存量派生文件用 `pnpm purge:derived`（默认 dry-run，`--apply` 才移动）归档进 `data/schemes/trash/<timestamp>/`。
- 三导出适配层经 Node 原生 TS 直载 `src` 下 TS 模块（如 `src/export/`、`src/cim/`、`src/model-eexport.ts`，零构建产物）：相对 import 必须带 `.ts` 扩展名，不得 import `.tsx`；被直载模块不得是 `.tsx`、不得含 JSX/React 组件（闭包内可间接 import npm 包 `react`，如 `src/svgUtils.ts`，Node 能正常加载）。守卫见 `nativeLoad.test.mjs`。
- **改了 `src/**/*.ts` 必须重启后端进程**（`pnpm dev` 重起或 `pnpm server`）：适配层对 `src` 走顶层 `await import`，Node ESM 每进程只求值一次、**无 HMR** —— 不重启时后端仍跑旧代码（前端 Vite 是新代码），会出现「界面新、导出旧」的分裂。真实案例:2026-09-17「E 文件成员关系段恒输出」提交后,未重启的后端仍把该段整段剔除,被误判为功能缺陷(见 `docs/superpowers/plans/2026-09-15-ac-container-followups.md` 所在特性的 fb17 调查)。

### Testing Requirements

- `pnpm vitest run server/` 跑后端测试（含三导出适配层：`svgExport.test.mjs` / `apiV1Schemes.e-file.test.mjs` / `cimExport.test.mjs` 与 Node 原生直载守卫 `nativeLoad.test.mjs`）
- 改动 swigger 后跑 `swigger.examples.test.mjs`（96 示例 / 71 端点）
- 改动 v1 端点跑对应 `apiV1*.test.mjs`
- 新增/改动 `server/*.mjs` 对 `src/**/*.ts` 的 import 后跑 `pnpm audit:names`（穿透 `@ts-nocheck` 的未定义名审计）

### Common Patterns

- v1 错误码→HTTP：bad-request→400，not-found/no-active-model/no-selection→404，no-online-client/ws-timeout→503，internal→500
- v1 信封：`{ok:true,data}` / `{ok:false,error:{code,message}}`
- /swigger 内联 JS 用 `\\n`（双反斜杠）输出字面换行，避免模板字面量 SyntaxError
- 空间隔离：`GRAPH_MODEL_DATA_DIR` 下 `data/` 是 default 空间的根，其余空间在 `data/workspaces/<id>/`。路径经 `options.paths ?? defaultPaths` 显式透传，不用 AsyncLocalStorage。空间标识解析：`X-Space` 头 > `?space=` > `Cookie: gmp_space` > 回退 `spaces[0]`（回退时响应带 `X-Space-Fallback`）。
- 建目录不变量：**一切建目录调用（`mkdirRaw` 与 `writeTextIfChanged`）均经退休守护**（先 `assertNotRetiredRoot` 再建）—— 否则删除空间后，在飞请求能把已删空间重建出来。判据：`mkdirRaw` 只出现在 `server.mjs:2`（import 别名）与 `mkdirInSpace` 内（约 `:76`）。**别再用 `grep -n "mkdirRaw\|mkdir(" server/server.mjs` 自查**：它同时命中全部 19 处 `mkdirInSpace(` 调用点，给不出「没有第二处裸 mkdir」的判据。别名本身比 grep 更强：模块内只 import 了别名，新写一处裸 `mkdir` 会直接 `ReferenceError`，而不是静默绕过守护。`writeTextIfChanged` 也必须走守护，因为 `shared/atomicWrite.mjs` 的 `atomicWriteFile` 自己会 `mkdir(dirname(filePath))` —— 那是 grep 不到的第二条建目录路径。
- 空间**名**唯一：判重归 `spaceStore` 在锁内做（`create`/`rename` 的 `onDuplicate`），HTTP 三个入口（POST 新建 / PUT 改名 / POST 导入）经 `sendSpaceNameConflict` 统一回 409 `SPACE_NAME_DUPLICATE`，正文带冲突者的 `name` 与 `conflictId`；导入另收 `?mode=overwrite|rename`（+ `?name=`），供前端问过「覆盖 / 重命名」后重发。`onDuplicate` 只管**显示名**，id 去重（`spaceIdFromName` 加 `-2` 后缀）照旧独立生效 —— 不同名也可能 slug 成同一个 id（`"a/b"` 与 `"a b"`）。
- 端到端隔离测试见 `spaceScope.test.mjs`；派发注入见 `spaceDispatch.test.mjs`。
- `/swigger` 的端点元数据集中在 `swaggerPage.mjs` 的 `SWIGGER_ENDPOINTS`；`swigger.examples.test.mjs` 会**逐个真实调用**每条示例，故新增示例必须自带稳定期望、且**不得**收录会触发本机副作用的端点（`/webgrp/exports/native/*` 因会弹 Windows 另存为对话框而刻意排除）。

## Dependencies

### Internal

- `src/runtimeWsClient.ts` — 前端 WS 对端
- `src/runtimeSnapshot.ts` / `runtimeScreenshot.ts` — 前端响应 fetch 的序列化器

### External

- `ws` 8.x — WebSocket
- Node 内置 `http` / `fs/promises`

<!-- MANUAL: -->
