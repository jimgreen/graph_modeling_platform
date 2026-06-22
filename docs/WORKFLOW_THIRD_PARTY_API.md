# 第三方查询接口实现任务分解（/api/v1）

> 阶段：实现规划（workflow）。承接 `REQUIREMENTS_THIRD_PARTY_API.md` + `DESIGN_THIRD_PARTY_API.md`。
> 本文档为任务清单，按依赖序排列。每任务含：范围、产出文件、依赖、验收（测试）。

## 核查结论（已定开放项）

| 开放项 | 决策 |
|--------|------|
| server `.e` 格式 | server 不实现 E 生成；E 文件单一真源前端 `buildEFileExport`，经 WS 拉取（C+B）。server `buildDeviceParameterFile` JSON 保留不动（落盘用） |
| 截图 | 全新实现，无现有能力复用（M5） |
| WS 库 | 项目无 `ws`，新增依赖 `ws`（server）+ `@types/ws`（dev）+ 前端 WS 客户端 |
| schemePath 编码 | 路径段 `encodeURIComponent(JSON.stringify([...]))` |
| E 文件逻辑 | server 不实现（C）。手工移植/抽取均否决：server 与前端是两套独立拓扑+E 实现，对齐 500+ 行必漂移。单一真源前端，经 WS 拉取。E 文件仅支持当前打开模型（B），不提供已保存模型 E 文件接口 |
| 响应信封 | v1 专用 `{ok,data}`/`{ok:false,error:{code,message}}`；新建 v1 响应函数，复用旧 `/api` 结果时包装入信封（C2） |
| inspector tab | 3 tab（model/tree/graph），`device` 是 graph 内子视图；graph schema 含 `subView`（C1） |

## 阶段划分

| 阶段 | 任务 | 目标 |
|------|------|------|
| P0 基础设施 | T1-T4 | 同端口入口 + WS + E 文件共享 + 客户端注册表 |
| P1 方案域 | T5-T6 | 第三方方案/模型查询接口 + 测试 |
| P2 图元库域 | T7-T8 | 第三方图元库查询接口 + 测试 |
| P3 运行时态域 | T9-T12 | 前端序列化 + 截图 + server handler + E2E |
| P4 收尾 | T13-T14 | coverage 门槛 + 脚本 + 全量验证 |

---

## P0 基础设施

### T1：image-server 单入口同端口 + v1 响应函数
**范围**：重构 `server/dev.mjs`，image-server 作唯一入口。dev 用 Vite `createServer({server:{middlewareMode}, appType:'custom'})` middleware 挂入（替代 spawn 独立 Vite 进程），prod 托管 `dist/` 静态资源。`/api`、`/api/v1`、`/ws`、`/*` 分流。新增 v1 专用响应函数 `sendV1Json`/`sendV1JsonCacheable`（信封格式 `{ok,data}`/`{ok:false,error:{code,message}}`，不碰旧 `sendJson`）。保留 `dev.mjs` spawn 旧路径作 fallback（环境变量切换）。
**产出**：`server/dev.mjs`、`server/image-server.mjs`（静态托管 + v1 响应函数）、`server/v1Response.mjs`（信封函数）、`vite.config.ts`（middleware 配置如需）
**依赖**：无
**验收**：新建 HTTP 集成测试 `server/routes.test.mjs`（测静态资源分流：`/*` 返回静态文件、`/api` 与 `/api/v1` 不被静态资源拦截、OPTIONS 预检）；`server/v1Response.test.mjs`（信封格式 + 错误码映射）；手动起 `pnpm dev` 验证 HMR 正常 + 同端口访问前端 + `/api`。HMR 回归是关键验收点。

### T2：WebSocket server + 前端 WS 客户端
**范围**：server 加 `ws` 依赖，`/ws` 升级处理；前端新增 `src/runtimeWsClient.ts`（连入、register、ping、fetch-response 收发、clientId 持久化）。
**产出**：`server/runtimeWs.mjs`、`src/runtimeWsClient.ts`、`package.json`（+`ws` 依赖）
**依赖**：T1
**验收**：单测 `server/runtimeWs.test.mjs`（连接/register/ping/断线移除）；前端单测 `src/runtimeWsClient.test.ts`（消息收发）。

### T3：E 文件逻辑统一（设计约束，无独立实现）
**范围**：server 不实现 E 文件生成。E 文件单一真源 = 前端 `buildEFileExport`（model.ts:2329）。所有第三方 E 文件请求经 WS `runtime.e-file` 拉前端生成（C 决策）。E 文件仅支持当前打开模型，不提供已保存模型 E 文件接口（B 决策）。server 端 `buildDeviceParameterFile`（JSON）保留不动（落盘用，非第三方路径）。WS 桥接（T2）+ 前端 `buildEFileExport`（现状）已就绪，`runtime.e-file` resource 实际由 T11 运行时态 handler + T9 前端序列化实现。
**产出**：无独立代码（设计约束归入 T11/T9）
**依赖**：T2（WS 桥接）
**验收**：T11/T9 的 `runtime.e-file` 用例覆盖（当前打开模型 E 文件文本 + 无打开模型 404 + 无在线客户端 503）。

### T4：客户端注册表 + 默认选择
**范围**：`server/runtimeRegistry.mjs`：ClientEntry 结构、register/unregister、ping 更新、lastActiveAt 维护、60s 离线判定、`pickDefaultClient`、pendingFetches 管理 + 5s 超时。
**产出**：`server/runtimeRegistry.mjs`
**依赖**：T2
**验收**：单测 `server/runtimeRegistry.test.mjs`（注册/移除/默认选择/超时 reject/并发）。

---

## P1 方案域

### T5：方案域 `/api/v1` handler
**范围**：新增 `server/apiV1Schemes.mjs`，实现 §5.1 接口（schemes、hierarchy、models、export、model json/svg）。E 文件不在此域（走运行时态 §5.3）。复用现有 `readSchemes`、`createSchemeArchiveBuffer`、`buildSvgFile`。schemePath 路径段编解码工具。用 v1 响应函数（T1）包装信封。挂入 image-server 路由。
**产出**：`server/apiV1Schemes.mjs`、`server/schemePath.mjs`（编解码工具）
**依赖**：T1
**验收**：集成测 `server/apiV1Schemes.test.mjs`，每接口 AC（正常+404+400），IEEE 模型 fixture。

### T6：方案域测试
**范围**：T5 的完整集成测试。临时端口+tmpdir 起 server，`buildProject` 造 IEEE 模型写盘，逐接口打请求断言。
**产出**：`server/apiV1Schemes.test.mjs`
**依赖**：T5
**验收**：AC 清单全过；`pnpm test` 绿。

---

## P2 图元库域

### T7：图元库域 `/api/v1` handler
**范围**：新增 `server/apiV1Library.mjs`，实现 §5.2 六接口（categories、devices、measurements、device-definitions、templates、聚合 library）。复用 `readDeviceLibraryConfig`、`readMeasurementConfig` + 静态 `DeviceKind`/`E_SECTION_COLUMNS` 元数据（server 端 `eSectionColumns`）。用 v1 响应函数包装信封。
**产出**：`server/apiV1Library.mjs`
**依赖**：T1（T3 非强依赖，图元库域不涉 E 文件）
**验收**：集成测 `server/apiV1Library.test.mjs`。

### T8：图元库域测试
**范围**：T7 完整测试，含空库场景。
**产出**：`server/apiV1Library.test.mjs`
**依赖**：T7
**验收**：AC 全过；`pnpm test` 绿。

---

## P3 运行时态域

### T9：前端运行时态序列化模块
**范围**：`src/runtimeSnapshot.ts`，从 `__appScope` 读状态，序列化 §6 三 tab（model/tree/graph，graph 含 `subView:"graph"|"device"` 子视图）+ snapshot 聚合 + selection。共享 inspector 渲染数据源。响应 server `fetch` 调用（接 T2 WS 客户端）。
**产出**：`src/runtimeSnapshot.ts`
**依赖**：T2
**验收**：单测 `src/runtimeSnapshot.test.ts`（各 tab 结构、graph 两子视图、无选中、无活动模型）。

### T10：前端 canvas 截图
**范围**：`src/runtimeScreenshot.ts`，当前画布可视内容 rasterize 为 PNG base64。定位现有 canvas DOM（@xyflow/react viewport 或自绘层），离屏 canvas 渲染 + `toDataURL`。接 WS `runtime.screenshot` fetch。
**产出**：`src/runtimeScreenshot.ts`
**依赖**：T2
**验收**：单测 `src/runtimeScreenshot.test.ts`（mock canvas，验 base64 产出）；E2E 验真实截图（T12）。

### T11：运行时态 server handler
**范围**：`server/apiV1Runtime.mjs`，实现 §5.3 九接口。查注册表（T4）→ WS fetch 拉前端（T9/T10）→ 透传响应。`/runtime/clients` server 直返。超时/无客户端降级 503。
**产出**：`server/apiV1Runtime.mjs`
**依赖**：T4、T9、T10
**验收**：集成测 `server/apiV1Runtime.test.mjs`（mock WS 客户端测协议：无客户端 503、超时 503、正常透传、错误码透传）。

### T12：运行时态 E2E 测试
**范围**：`e2e/runtime.test.mjs`，Playwright 编排：起 server（tmpdir+IEEE 模型）→ launch chromium 加载前端 → WS 注册 → 模拟打开模型/选中/切 tab → fetch `/api/v1/runtime/*` 断言。每接口 AC（正常+无客户端+无选中）。
**产出**：`e2e/runtime.test.mjs`、`e2e.vitest.config.mjs`
**依赖**：T11、T9、T10
**验收**：`pnpm test:e2e` 绿；真实 WS 联动验证。

---

## P4 收尾

### T13：coverage 配置 + AC 清单核对
**范围**：`vitest.config` 加 coverage thresholds（接口模块 glob 100% 行+分支：`server/apiV1*.mjs`、`server/apiV1Schemes.mjs`、`server/apiV1Library.mjs`、`server/apiV1Runtime.mjs`、`server/v1Response.mjs`、`server/runtimeRegistry.mjs`、`server/runtimeWs.mjs`、`server/schemePath.mjs`、`src/runtimeSnapshot.ts`、`src/runtimeScreenshot.ts`）。核对每接口 AC 清单覆盖，补漏用例。
**产出**：`vitest.config.ts`（coverage 配置）、补测用例
**依赖**：T5-T12
**验收**：`pnpm test:coverage` 达 100% 门槛。

### T14：脚本 + 全量验证
**范围**：`package.json` 加 `test:e2e`、`test:all`、`test:coverage` 脚本（§9.4）。跑 `pnpm test:all` 全量验证。`detect_changes()`（GitNexus）核对影响范围。
**产出**：`package.json`
**依赖**：T13
**验收**：`pnpm test:all` 全绿 + coverage 100% + `detect_changes` 仅预期范围。

---

## 依赖图

```
T1 ─┬─ T2 ─┬─ T4 ────────── T11 ── T12
    │      └─ T9 ────────────┤
    │      └─ T10 ───────────┤
    ├─ T5 ── T6
    └─ T7 ── T8
T3（设计约束，归入 T11/T9，无独立实现）
T13 ← T5-T12
T14 ← T13
```

并行机会：T5/T7 可并行；T9/T10 可并行；T6/T8 可并行。T11/T9 内含 E 文件 WS 拉取（T3 约束）。

## 执行约束

- 每任务完成即跑相关测试，绿后才算完成（NFR-9）。
- 改 `model.ts`（T3）、`image-server.mjs`（T1/T3）前必跑 GitNexus `impact`，HIGH/CRITICAL 需告知。
- 提交粒度：每任务一提交（遵循项目 commit 风格）。
- `detect_changes()` 提交前核对影响范围。

## 估时（粗）

| 阶段 | 任务数 | 复杂度 |
|------|--------|--------|
| P0 | 4 | 高（基础设施重构 + WS） |
| P1 | 2 | 中（复用多） |
| P2 | 2 | 中低 |
| P3 | 4 | 高（WS 联动 + 截图 + E2E） |
| P4 | 2 | 低 |
