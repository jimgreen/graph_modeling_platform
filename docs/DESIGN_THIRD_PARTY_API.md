# 第三方查询接口设计（/api/v1）

> 阶段：设计（design）。本文档承接 `REQUIREMENTS_THIRD_PARTY_API.md`，给出架构、WS 桥接协议、接口契约、测试架构。
> 实现交给 `/sc:workflow`。本文不含实现代码，但含接口契约与关键数据结构。

## 1. 架构总览

### 1.1 单入口同源

image-server 作唯一 HTTP 入口，dev/prod 同端口（默认 5174）托管：
- 静态资源：prod 托管 `dist/`；dev 内嵌 Vite middleware 保 HMR
- `/api/v1/*`：第三方只读查询层（本期新增）
- `/api/*`（旧）：前端内部使用的读写层（现状，逐步迁移边界见 §2）
- `/ws`：WebSocket，前端客户端连入与注册（本期新增）

`server/dev.mjs` 重构：不再 spawn 独立 Vite 进程，改用 Vite `createServer` middleware 模式挂入 image-server，同端口同源。

### 1.2 请求流分流

```
第三方/浏览器 → image-server (单端口)
                 ├─ /api/v1/*  → 第三方只读 handler（方案/库/运行时态）
                 ├─ /api/*     → 旧内部 handler（前端自身用，读写）
                 ├─ /ws        → WS 升级 → 客户端注册表
                 └─ /*         → 静态资源（prod: dist/；dev: Vite middleware）
```

### 1.3 运行时态数据流（FR-3 核心）

```
第三方 GET /api/v1/runtime/...
  → server 查客户端注册表（按 clientId 或默认最近活跃）
  → 无在线客户端 → 404/503 "无在线客户端"
  → 有 → server 经 WS 向该客户端发拉取请求
  → 前端响应（运行时态快照 / 三 tab 序列化 / PNG 截图）
  → server 返第三方
```

实时秒级（请求即拉，无缓存），对应决策 OQ-3。

## 2. 路由分层与版本化

### 2.1 三层路径

| 层 | 前缀 | 用途 | 本期 |
|----|------|------|------|
| 第三方只读 | `/api/v1/*` | 外部系统查询 | 新增 |
| 内部读写 | `/api/*` | 前端自身（现状 images/schemes/config/library） | 保留 |
| 静态 | `/*` | 前端资源 | 新增托管 |

### 2.2 复用与扩展

现有 `exactRouteHandlers`（Map）+ `dynamicRouteHandlers`（数组）结构保留。新增 `/api/v1/*` handler 集合，复用底层纯函数（`readSchemes`、`readDeviceLibraryConfig`、`readMeasurementConfig`、`createSchemeArchiveBuffer`、`buildSvgFile`、E 文件逻辑）。

旧 `/api/*` 内部 handler 不改动（避免前端回归）；改的是 dev 启动方式（spawn 独立 Vite 进程 → Vite middleware 挂入 image-server，见 T1）。后续旧 `/api` 可逐步迁入 `/api/v1`。两者并存期间，第三方只用 `/api/v1`，前端只用 `/api`。

### 2.3 写入预留

资源命名用名词复数 + 资源 id 风格（`/api/v1/schemes`、`/api/v1/schemes/{id}/models/{id}`），读写分离路径预留。本期仅实现 GET，POST/PUT/DELETE 路径占位不实现。

## 3. WS 桥接协议

### 3.1 连接与注册

前端加载后连 `ws://{host}/ws`。首条消息 `register`：

```jsonc
// C→S register
{ "type": "register", "clientId": "<前端生成 UUID>", "role": "editor" }
```

`clientId` 前端生成并 localStorage 持久化，重连复用。server 注册到客户端表（§4）。

### 3.2 心跳

前端每 15s 发 `ping`，server 回 `pong` 并更新 `lastActiveAt`。60s 无心跳判定离线，移除注册。

```jsonc
// C→S
{ "type": "ping" }
// S→C
{ "type": "pong", "serverTime": "<iso>" }
```

### 3.3 拉取协议（server → 前端）

第三方请求到达后，server 向目标客户端发 `fetch` 请求，前端回 `fetch-response`。

```jsonc
// S→C fetch（server 生成 requestId，第三方请求挂起等响应）
{
  "type": "fetch",
  "requestId": "<uuid>",
  "resource": "runtime.snapshot" | "runtime.tab" | "runtime.selection" | "runtime.screenshot" | "runtime.e-file" | "runtime.svg",
  "params": { /* 见各 resource 定义 */ }
}

// C→S fetch-response
{
  "type": "fetch-response",
  "requestId": "<同上>",
  "ok": true,
  "data": { /* resource 对应结构 */ }
}
// 或
{
  "type": "fetch-response",
  "requestId": "<同上>",
  "ok": false,
  "error": { "code": "no-active-model" | "no-selection" | "...", "message": "..." }
}
```

### 3.4 resource 定义

| resource | params | data |
|----------|--------|------|
| `runtime.snapshot` | — | 当前模型定位 + 设备清单 + 选中设备 + 三 tab 内容（聚合） |
| `runtime.tab` | `{ tab: "model" \| "tree" \| "graph" }` | 单 tab 序列化结构（§6） |
| `runtime.selection` | — | 选中设备 id + 设备信息 |
| `runtime.screenshot` | `{ width?, height? }` | PNG base64（当前画布可视内容） |
| `runtime.e-file` | — | E 文件文本（复用 `buildEFileExport`） |
| `runtime.svg` | — | SVG 文本（前端导出 SVG） |

### 3.5 超时与降级

- server 发 `fetch` 后等前端响应，超时 5s。
- 超时 / 客户端离线 / 无客户端 → 第三方接口返 503 `{error:"无在线客户端"}` 或 404（按 resource 语义）。
- 前端 `fetch-response` ok=false → 透传错误码与消息，第三方接口返对应状态（如 `no-active-model` → 404，`no-selection` → 404）。

### 3.6 多客户端选择

第三方请求可带 `?clientId=`。不指定时 server 取 `lastActiveAt` 最近者（默认策略，对应 OQ-2.1）。

## 4. 客户端注册表

### 4.1 数据结构

```ts
type ClientEntry = {
  clientId: string;
  ws: WebSocket;
  role: "editor";
  registeredAt: string;   // iso
  lastActiveAt: string;   // iso，ping/fetch-response 更新
  pendingFetches: Map<string, { resolve, reject, timer }>; // requestId → 等待中
};
```

server 内存维护 `Map<clientId, ClientEntry>`。进程重启清空（运行时态本就需前端在线，可接受）。

### 4.2 生命周期

| 事件 | 动作 |
|------|------|
| WS 连接 + register | 加入表 |
| ping | 更新 lastActiveAt |
| fetch-response | 解对应 pendingFetches，清 timer |
| WS close / error | 移除表项，reject 所有 pendingFetches（503） |
| 60s 无心跳 | 判离线，同上 |

### 4.3 默认选择算法

```ts
function pickDefaultClient(): ClientEntry | null {
  const active = [...clients.values()]
    .filter(c => Date.now() - Date.parse(c.lastActiveAt) < 60000);
  if (active.length === 0) return null;
  return active.sort((a, b) => Date.parse(b.lastActiveAt) - Date.parse(a.lastActiveAt))[0];
}
```

## 5. /api/v1 接口契约

通用响应包络（v1 专用，新建 `sendV1Json`/`sendV1JsonCacheable` 响应函数，不碰旧 `/api` 的 `sendJson`）：

```jsonc
// 成功
{ "ok": true, "data": <按接口> }
// 失败
{ "ok": false, "error": { "code": "<机器码>", "message": "<人读>" } }
```

v1 handler 复用旧 `/api` 纯函数产出后包装入 `{ok:true,data}`；错误统一映射为 `{ok:false,error:{code,message}}`。旧 `/api` 内部 handler 不改，仅 v1 层包装。

HTTP 状态：200 成功 / 400 参数非法 / 404 不存在或无在线客户端 / 500 内部错 / 503 无在线客户端或 WS 超时。所有 GET 支持 gzip + ETag/304（v1 专用 cacheable 函数，运行时态接口除外——实时不缓存，`cache-control: no-store`）。

### 5.1 方案域（FR-1）

| 接口 | 方法 | query | 响应 data |
|------|------|-------|-----------|
| `/api/v1/schemes` | GET | `includeProjects=1` | 方案树：`{schemes:[{name,updatedAt,projects:[{name,updatedAt}],children:[...]}]}` |
| `/api/v1/schemes/hierarchy` | GET | — | 纯层级树（不含 projects 详情）：`{nodes:[{name,children:[...]}]}` |
| `/api/v1/schemes/{schemePath}/models` | GET | — | 模型列表：`{models:[{name,updatedAt}]}`（schemePath 为 URL 编码 JSON 数组） |
| `/api/v1/schemes/{schemePath}/export` | GET | — | ZIP 二进制（`createSchemeArchiveBuffer`），`application/zip` + attachment |
| `/api/v1/schemes/{schemePath}/models/{name}/export` | GET | — | 单模型导出包（JSON+SVG+E 聚合 ZIP 或分别取，见下） |
| `/api/v1/schemes/{schemePath}/models/{name}/json` | GET | — | 模型 project JSON |
| `/api/v1/schemes/{schemePath}/models/{name}/svg` | GET | — | SVG 文本（`buildSvgFile`） |

> E 文件不提供已保存模型接口（决策 B），统一走运行时态 `/api/v1/runtime/e-file`（§8、§5.3）。

`schemePath` 编码：`/api/v1/schemes/<encodeURIComponent(JSON.stringify(["方案A","子方案"]))>/...`。或 query `?schemePath=<encoded>`。design 实现时择一（倾向路径段，RESTful）。

### 5.2 图元库域（FR-2）

| 接口 | 方法 | 响应 data |
|------|------|-----------|
| `/api/v1/library/categories` | GET | 图元分类树：`{categories:[{id,name,bases:[...]}]}`（聚合 device-library + 静态图元分类） |
| `/api/v1/library/devices` | GET | 各类图元信息：`{devices:[{kind,section,columns:[...],...}]}` |
| `/api/v1/library/measurements` | GET | 量测定义：`{measurementTypes:[...], deviceProfiles:[...]}`（`readMeasurementConfig`） |
| `/api/v1/library/device-definitions` | GET | 图元定义：`{deviceDefinitionOverrides, customComponentTypes, customAttributeLibraries}` |
| `/api/v1/library/templates` | GET | 模板库：`{customDeviceTemplates, customGraphTemplates, customGraphTemplateTypes}` |
| `/api/v1/library` | GET | 上述聚合（一次取全） |

底层复用 `readDeviceLibraryConfig` + `readMeasurementConfig` + 静态 `DeviceKind`/`eSectionColumns` 元数据。

### 5.3 运行时态域（FR-3）

所有接口 query 可带 `clientId`（不指定取默认最近活跃客户端）。

| 接口 | 方法 | 响应 data | WS resource |
|------|------|-----------|-------------|
| `/api/v1/runtime/clients` | GET | 在线客户端列表：`{clients:[{clientId,role,lastActiveAt}]}` | —（server 直返） |
| `/api/v1/runtime/model` | GET | 当前打开模型定位：`{clientId, schemePath, modelName, modelId, updatedAt}` | `runtime.snapshot`（部分） |
| `/api/v1/runtime/devices` | GET | 当前模型设备清单：`{nodes:[...], edges:[...]}` | `runtime.snapshot`（部分） |
| `/api/v1/runtime/selection` | GET | 当前选中设备：`{selectedNodeIds:[...], selectedNode:{...}\|null}` | `runtime.selection` |
| `/api/v1/runtime/tabs/{tab}` | GET | 单 tab 内容（tab∈model\|tree\|graph） | `runtime.tab` |
| `/api/v1/runtime/tabs` | GET | 三 tab 聚合 | `runtime.snapshot` |
| `/api/v1/runtime/screenshot` | GET | PNG 二进制 `image/png` | `runtime.screenshot` |
| `/api/v1/runtime/svg` | GET | SVG 文本 | `runtime.svg` |
| `/api/v1/runtime/e-file` | GET | E 文件文本 | `runtime.e-file` |

无在线客户端 / 超时 → 503 `{code:"no-online-client"}`。前端 ok=false → 透传（如 `no-active-model`→404, `no-selection`→404）。

### 5.4 通用（FR-4）

错误格式统一为上述包络。大响应 gzip + ETag/304。运行时态接口 `cache-control: no-store`。

## 6. 运行时态序列化方案

### 6.1 抽取点

前端 `__appScope` 含运行时态全量状态（`activeProjectKey`、`selectedNodeIds`、`selectedNode`、`currentModelRecord`、`inspectorTab`、`inspectorSelectedNode`、`singleSelectedDeviceForInspector` 等）。新增前端模块 `runtimeSnapshot.ts`：从 `__appScope` 读状态，按 resource 序列化为可 JSON 化结构，响应 server `fetch`。

### 6.2 三 tab 序列化结构

完整复刻前端展示（决策 OQ-8）。前端 inspector 可视 tab = 3 个：基础(model)/图元树(tree)/图元(graph)。其中【图元】tab 内含 `graph`↔`device` 两子视图（`App.tsx:545-555` 子切换按钮，`device` 为设备参数面板）。接口对齐 3 tab，graph tab schema 含 `subView` 字段反映子视图。

统一 schema：

```jsonc
{
  "tab": "model" | "tree" | "graph",
  "title": "<tab 标题>",
  "rows": [ { "label": "<中文标签>", "value": "<展示值>", "key": "<原始字段>", "editable": false } ],  // model/graph 属性表
  "tree": { "nodes": [ { "id","name","kind","children":[...] } ] },  // tree 专属
  "subView": "graph" | "device",                                     // graph 专属，反映当前子视图
  "deviceParams": [ { "section","columns":[...],"rows":[...] } ]      // graph + subView=device 时，选中设备的设备参数段
}
```

- **基础**（model）：`rows` = 模型元信息（名称/方案/更新时间/画布宽高/背景色/自动扩展等），数据源 `currentModelRecord` + canvas 配置。
- **图元树**（tree）：`tree` = 当前模型图元树（`renderElementTreePanel` 数据源），含节点 id/name/kind/层级。
- **图元**（graph）：`subView` = 当前子视图；`rows` = 选中图元属性表（`inspectorSelectedNode` 参数）；`subView=device` 时 `deviceParams` = 设备参数段（非静态图元，对应 E 文件段列与值）。

无选中设备时 graph 的 `rows`/`deviceParams` 为空，`title` 标注"未选中"。

### 6.3 snapshot 聚合

`runtime.snapshot` = model 定位 + devices + selection + 三 tab 内容一次返回（减少多次 WS 往返）。第三方按需选单接口或聚合接口。

### 6.4 前端钩子

前端 WS 客户端收到 `fetch` → 调 `runtimeSnapshot` 模块对应函数 → 回 `fetch-response`。序列化逻辑与 inspector 渲染共享同一数据源（不重复实现，避免漂移）。

## 7. PNG 截图方案

### 7.1 产出路径

前端 canvas 截图（当前画布可视内容）→ base64 → WS `runtime.screenshot` 响应 → server 透传第三方。

### 7.2 前端截图实现

全新实现（项目无现有 canvas 截图能力，已核查）。定位画布 DOM（@xyflow/react viewport 或自绘 canvas 层），rasterize 为 PNG：
- 取当前 viewport 可见范围
- 渲染到离屏 canvas（分辨率 = viewport × devicePixelRatio，可由 `params.width/height` 覆盖）
- `canvas.toDataURL("image/png")` → base64

实现时核对现有 canvas DOM 节点结构（@xyflow/react `ReactFlow` 实例的 `.toObject()`/viewport API 或直接读 canvas 元素）。

### 7.3 server 返第三方

`/api/v1/runtime/screenshot` → 解 base64 → `image/png` 二进制流回。`cache-control: no-store`。

### 7.4 与 SVG 分离

SVG 走 `runtime.svg`（前端导出 SVG 文本，与界面导出一致）；PNG 走 `runtime.screenshot`。两路径独立，第三方按需取。

## 8. E 文件逻辑统一

### 8.1 决策

E 文件**单一真源 = 前端 `buildEFileExport`**（`model.ts:2329`，文本格式 `<Section>` 标签 + `@ 列名` + `# 值` + `<PowerBase>` 段）。server 不实现 E 文件生成逻辑。所有第三方 E 文件请求统一经 WS `runtime.e-file` 拉前端 `buildEFileExport` 生成。

### 8.2 决策依据（手工移植/抽取均否决）

经多轮核查，server 端 E 相关逻辑与前端是**两套独立实现**，差异巨大：

| 维度 | 前端 (model.ts) | server (image-server.mjs) |
|------|-----------------|--------------------------|
| `calculateElectricalTopology` | `synchronizeBusTerminalsWithEdges` + `buildTopologyConnectivity` + 电压基值同步 + 四端子类型(ac/dc/h2/heat) + 三绕组中性点 | 简化 union-find，仅 ac/dc，无电压同步 |
| `buildEDeviceValues` | 含 `customDefinitionMap` + `enumExportValueForDefinition`（自定义图元参数枚举） | 简化版，无自定义参数枚举 |
| E 格式化 | 完整 `formatESection`/`buildPowerBaseSection`/列归一化/排序 + `E_SECTION_OUTPUT_ORDER` | 无（`buildDeviceParameterFile` 产 JSON） |
| 三绕组/容器关联 | `buildACTransfomer3Devices`/`buildThreeWindingTransformerBranchDevices`/`buildContainerAssociatedDevices` | 无 |

手工移植对齐 = 重写 server 端 500+ 行且必然漂移（M4-B 否决）。抽取共享模块需建 TS→MJS 编译链 + 抽 40+ 函数，成本极高（M4-A 否决）。故选 C：server 不实现，单一真源前端。

### 8.3 接口行为

| 场景 | E 文件来源 |
|------|-----------|
| 运行时态 `/api/v1/runtime/e-file` | server 经 WS `runtime.e-file` 拉前端 currentProject → 前端 `buildEFileExport` 生成 E 格式文本回传 |
| 已保存模型 `/api/v1/schemes/.../models/{name}/e` | **不提供**（决策 B）。第三方要 E 文件须前端先打开该模型，走运行时态接口 |

无前端在线 / 当前无打开模型 → 503/404 明确返回。

### 8.4 server 端 `buildDeviceParameterFile` 处置

server 端 `buildDeviceParameterFile`（image-server.mjs:1277，JSON）**保留不动**：仅用于保存模型时落盘 `.e`（内部缓存，非第三方路径）。既有 JSON 内容 `.e` 不影响第三方（接口不读磁盘 `.e`）。不主动迁移（M3-A）。

### 8.5 前端 `buildEFileExport` 复用

前端"导出 E 模型文件"按钮（`exportEFile`）与第三方接口共用同一 `buildEFileExport` 真源，无漂移。运行时态 E 文件由 T9 前端序列化模块响应 `runtime.e-file` fetch 时调用 `buildEFileExport(currentProject)` 生成。

## 9. 测试架构

### 9.1 三层用例分布

| 接口域 | 单测（纯函数） | 集成（真实 server） | E2E（server+浏览器+WS） |
|--------|---------------|--------------------|------------------------|
| 方案域 | 路由解析、schemePath 编解码、ZIP 逻辑（已有） | 每接口：正常+404+400 | — |
| 图元库域 | 元数据聚合、配置归一化（已有） | 每接口：正常+空库 | — |
| 运行时态域 | 客户端注册表、默认选择算法、超时降级 | mock WS 客户端测 server 侧协议（可选） | 每接口：真实浏览器加载前端+WS+模拟选中/切 tab |
| 通用 | 错误格式、ETag/304（已有） | gzip/304 命中 | — |

运行时态主测层 = E2E（决策 TQ-2），集成层 mock WS 仅测 server 协议健壮性（可选补充）。

### 9.2 AC 清单模板（每接口）

```
AC-正常: 合法参数 → 200 + 数据结构正确
AC-404: 不存在资源 → 404 {code:"not-found"}
AC-400: 参数非法（缺 schemePath/name/非法 tab） → 400 {code:"bad-request"}
运行时态额外:
AC-无客户端: 无在线客户端 → 503 {code:"no-online-client"}
AC-无选中: selection/tab(graph) 无选中设备 → 404 {code:"no-selection"} 或空结构（按接口语义）
```

### 9.3 coverage 配置

vitest coverage，接口模块强制 100%（行+分支）：
- `server/api-v1/*.mjs`（新增第三方 handler）
- `server/runtimeRegistry.mjs`（客户端注册表）
- `src/runtimeSnapshot.ts`（前端序列化）
- `src/eFile.ts`（E 文件共享逻辑，若抽取）

`vitest.config` 加 `coverage.thresholds.lines=100, branches=100`（仅对上述 include glob）。

### 9.4 命令

```jsonc
// package.json scripts
"test": "vitest run",                    // 单测 + 集成
"test:e2e": "vitest run --config e2e.vitest.config.mjs",  // E2E，内部自起 server+Playwright
"test:all": "pnpm test && pnpm test:e2e",
"test:coverage": "vitest run --coverage"
```

### 9.5 E2E fixture 编排

`e2e/runtime.test.mjs`：
1. 临时端口起 image-server（tmpdir 数据目录）
2. 写入 IEEE 模型（`buildProject` 产出）到 tmpdir
3. Playwright launch chromium → 加载前端页面（同端口）
4. 前端自动连 WS 注册
5. 模拟操作：打开模型、选中设备、切 tab（Playwright 驱动 UI）
6. fetch `/api/v1/runtime/*` → 断言响应
7. 测完清理 tmpdir、关浏览器、关 server

### 9.6 成功标准

`pnpm test:all` 全绿 + coverage 门槛通过 + 每接口 AC 清单全过 = 开发成功（NFR-9/10）。

## 10. 风险与开放项

| 项 | 风险 | 缓解 |
|----|------|------|
| 三 tab 序列化漂移 | 前端渲染改了序列化未跟 | 共享同一数据源（§6.4）；E2E 锁定关键字段 |
| WS 超时降级 | 第三方请求挂起 | 5s 超时 + 503 明确错误 |
| E 文件双源统一 | server 保存 `.e` 改格式影响前端读取 | implementation 先核查前端是否读 `.e`；不读则安全改 |
| coverage 100% | 错误分支难覆盖 | 构造异常 fixture（坏 JSON、缺文件、超时注入） |
| dev Vite middleware 重构 | 破坏现有 HMR | 保留 `dev.mjs` 旧路径作 fallback；先验证 middleware 模式 |
| 多客户端默认选择 | 最近活跃可能非用户预期 | 第三方可显式指定 clientId；默认策略文档化 |
| schemePath 路径编码 | 特殊字符/深层级 | 统一 JSON+encodeURIComponent；集成测覆盖中文/深层 |
| 运行时态依赖前端在线 | 第三方调用时前端未开 | 503 明确返回；文档说明需前端在线 |

### 开放项（implementation 阶段定）

- [x] schemePath 编码：路径段 `encodeURIComponent(JSON.stringify([...]))`
- [x] server `.e` 格式：改 E 格式文本（前端不读 `.e`，安全；M3 决策 A 不主动迁移）
- [x] E 文件逻辑：不抽取，server 端 `buildDeviceParameterFile` 改输出 E 格式（M4 决策 A）
- [x] 截图：全新实现，无现有能力复用（M5）
- [x] WS 库：新增 `ws` 依赖（项目无现有）
- [ ] v1 响应函数具体命名（`sendV1Json`/`sendV1JsonCacheable`）与旧错误码映射表
- [ ] 截图 canvas DOM 定位（@xyflow/react viewport API vs 直接读 canvas 元素）


