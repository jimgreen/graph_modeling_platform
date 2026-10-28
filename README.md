# 电力能源系统图上建模平台

> graph_modeling_platform —— 面向电力 / 氢能 / 热力系统的图形化拓扑建模平台

在浏览器里画一张「图」，就能得到一套可导出、可被第三方程序调用的电力系统模型：
图元（设备）、端子、连线、量测、电压等级、全局线路，最终导出成 **E 格式**、**CIM/XML**、**SVG** 等格式。

平台同时提供三层对外能力：

| 层 | 形态 | 用途 |
|----|------|------|
| 界面 | React 单页应用（端口 5173） | 人工建模、方案管理、属性编辑、导出 |
| REST API | `/webgrp/v1/**` 只读 + 控制台写操作信封 API | 第三方系统集成 |
| MCP 服务 | `/webgrp/mcp`（Model Context Protocol） | 让 AI 客户端直接读写模型，详见 [docs/MCP.md](docs/MCP.md) |

---

## 功能

### 画布与图形

- 拓扑画布：节点 / 边 / 连线 / 选择 / 拖拽 / 缩放 / 视口
- 图层管理（显隐、排序、锁定）、多页背景页、页切换
- 对齐与分布工具、小地图、浮动工具栏、键盘快捷键
- 画布 LOD（细节层次）与视口批处理，大模型下保持交互流畅
- 端子锚点交互、设备图元渲染（DeviceGlyph）、状态图标绘制

### 设备与图元库

- 设备类型定义（`DeviceKind`）：内置元件 + 自定义元件
- 图元分类树、设备库、量测库、模板库
- 自定义元件编辑器：参数表、枚举值、中英文表头
- 设备定义覆盖（override）机制与定义-实例同步
- 图元库 / 方案树的拖动排序（本机 UI 偏好，跨层级移动才落库）
- 共享图标库管理（`public/icon-library/`，含完整性审计）

### 方案与模型

- 多级方案树（方案 / 子方案 / 模型），模型 CRUD
- 方案 ZIP 导入导出、SVG 模型导入
- 模型保存为 project JSON
- 拓扑布线 / 路径规划（`src/model-routing.ts`）

### 量测与电气

- 图形量测：量测组、默认值、行内编辑、测点跨组查重
- 电压等级继承传播与电压等级设置对话框
- 全网拓扑导出（多厂站 E 文件）
- 全局线路管理：跨模型线路注册与同步

### 导出与持久化

| 格式 | 说明 |
|------|------|
| JSON | 模型原始数据（落盘唯一格式，`data/schemes/files/**` 只存 `.json`） |
| E 文件 | 电力系统 E 格式，支持 GBK / UTF-8、预定义模板（国网E格式 / 主网实时库 / 配网实时库 / 台区实时库）与自定义模板 |
| CIM/XML | IEC 61970 CIM16，单文件整合 AC 设备 + 拓扑端子连接 + 量测 |
| SVG | 自包含 SVG（内联样式、图片内联为 data URL），前后端共用同一套渲染 |
| PNG | 画布截图（SVG → PNG base64） |
| ZIP | 整个方案打包（派生格式实时生成，不落盘） |

E / SVG / CIM 一律**按需实时生成**，不写派生文件到磁盘。

### 多工作空间（空间隔离）

一个部署内可并存多套互相隔离的数据空间：`data/` 是 default 空间根，其余在 `data/workspaces/<id>/`。
顶栏空间选择器支持导出 / 导入 / 改名 / 删除当前空间（ZIP）。

### 其它

- 颜色显示模式与配色、设备配色、背景色
- 批量属性编辑器、用户定制管理
- 全局消息提示系统（替代 `alert` / `confirm`）
- `/swigger` 自包含 HTML 接口文档页（含 Try-it 在线测试）

---

## 安装

### 环境要求

| 项 | 版本 |
|----|------|
| Node.js | **≥ 24**（`package.json` 的 `engines`；三导出适配层依赖 Node 原生直载 `.ts`） |
| pnpm | 建议 9+（仓库使用 `pnpm-lock.yaml`） |
| 浏览器 | Chromium / Edge / Chrome 最新版（运行时态桥接需要 WebSocket） |

### 步骤

```bash
git clone git@github.com:jimgreen/graph_modeling_platform.git
cd graph_modeling_platform

pnpm install

# 开发模式（同时启动后端 5174 与前端 5173）
pnpm dev
```

启动后：

- 前端应用：<http://127.0.0.1:5173>
- 后端服务：<http://127.0.0.1:5174>
- 接口文档：<http://127.0.0.1:5174/swigger>
- MCP 端点：<http://127.0.0.1:5174/webgrp/mcp>

### 常用命令

```bash
pnpm dev              # 开发：后端 + 前端（Vite）
pnpm dev:frontend     # 仅前端
pnpm server           # 仅后端
pnpm build            # 类型检查 + 生产构建，产物在 dist/
pnpm preview          # 预览构建产物

pnpm test             # Vitest 单元 / 集成测试
pnpm test:e2e         # Playwright 端到端测试
pnpm tsc --noEmit     # 仅类型检查

pnpm audit:icons      # 图标库审计
pnpm audit:names      # 未定义名审计（穿透 @ts-nocheck）
pnpm purge:derived    # 归档存量派生文件（默认 dry-run，--apply 才移动）
```

### 配置

配置优先级：**环境变量 > `platform.config.json` > 内置默认值**。
模板见 [`platform.config.json.example`](platform.config.json.example)。

| 环境变量 | 默认值 | 说明 |
|----------|--------|------|
| `IMAGE_SERVER_HOST` | `127.0.0.1` | 后端监听地址 |
| `IMAGE_SERVER_PORT` | `5174` | 后端端口 |
| `VITE_PORT` | `5173` | 前端端口 |
| `GRAPH_MODEL_API_PREFIX` | `/webgrp` | 接口前缀 |
| `GRAPH_MODEL_FRONTEND_PREFIX` | `/` | 前端部署子路径（如 `/app/`） |
| `GRAPH_MODEL_DATA_DIR` | `./data` | 数据根目录（测试用 tmpdir 隔离） |
| `GRAPH_MODEL_CONFIG` | `./platform.config.json` | 配置文件路径 |

> `data/` 整目录被 `.gitignore` 忽略，首次运行自动创建骨架；换机器请用空间 ZIP 迁移数据。

### 修改源码后的注意事项

后端对 `src/**/*.ts` 走 Node 原生直载（无 HMR）：**改了 `src` 下的 `.ts` 必须重启后端进程**，
否则会出现「界面是新代码、导出还是旧代码」的分裂。

---

## 使用方式

1. 打开 <http://127.0.0.1:5173>，平台会在地址栏写入 `?token=<页面 id>`。
2. 顶栏选择 / 新建工作空间。
3. 在左侧图元库挑选设备，拖到画布；连线、设端子、配量测与电压等级。
4. 保存模型，或从顶栏导出 E 文件 / SVG / CIM XML / 方案 ZIP。
5. 需要第三方系统读取时，用 `/webgrp/v1/**`；需要 AI 助手驱动时，接入 MCP（见下）。

右上角的 **RT-WS 指示灯**显示运行时态 WebSocket 状态：悬停可看当前页面 token，点击复制。
这个 token 就是 MCP 指定「操作哪个前端页面」的凭据。

---

## API

所有接口默认挂在 `/webgrp` 前缀下，可用 `GRAPH_MODEL_API_PREFIX` 调整。
在线文档与可执行示例：**<http://127.0.0.1:5174/swigger>**。

### 响应信封（`/v1/**`）

```jsonc
// 成功
{ "ok": true, "data": { } }

// 失败
{ "ok": false, "error": { "code": "not-found", "message": "方案不存在。" } }
```

错误码 → HTTP 状态：

| code | HTTP | 含义 |
|------|------|------|
| `bad-request` | 400 | 参数不合法 |
| `not-found` | 404 | 方案 / 模型不存在 |
| `no-active-model` | 404 | 前端未打开模型 |
| `no-selection` | 404 | 当前没有选中对象 |
| `no-online-client` | 503 | 没有在线前端页面 |
| `ws-timeout` | 503 | 前端未在超时内应答 |
| `payload-too-large` | 413 | 请求体超限 |
| `internal` | 500 | 后端异常 |

### 空间选择

| 优先级 | 来源 | 写法 |
|--------|------|------|
| 1 | 请求头 | `X-Space: <空间 id>` |
| 2 | 查询参数 | `?space=<空间 id>` |
| 3 | Cookie | `gmp_space=<空间 id>`（前端使用） |
| 4 | 回退 | `spaces[0]` |

### v1：方案域（只读）

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/v1/schemes` | 方案树（含模型摘要） |
| GET | `/v1/schemes/hierarchy` | 层级树 |
| GET | `/v1/schemes/models` | 某方案下的模型列表 |
| GET | `/v1/schemes/export` | 方案 ZIP |
| GET | `/v1/schemes/model/json` | 模型完整 JSON |
| GET | `/v1/schemes/model/svg` | 模型 SVG（`colorMode`∈`energy｜voltage`、`encoding`） |
| GET / POST | `/v1/schemes/model/e-file` | 模型 E 文件（POST 可带自定义模板） |
| GET | `/v1/schemes/model/cim-xml` | 模型 CIM/XML |
| POST | `/v1/schemes/model/send` | 把模型转发到外部接收端 |

### v1：图元库域（只读）

`GET /v1/library`、`/v1/library/categories`、`/v1/library/devices`、
`/v1/library/measurements`、`/v1/library/device-definitions`、`/v1/library/templates`。

### v1：运行时态域（读前端当前状态，需页面在线）

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/v1/runtime/clients` | 在线页面列表 |
| GET | `/v1/runtime/model` | 当前模型信息 |
| GET | `/v1/runtime/devices` | 当前模型图元清单 |
| GET | `/v1/runtime/selection` | 当前选中 |
| GET | `/v1/runtime/tabs`、`/v1/runtime/tabs/{model｜tree｜graph}` | 三面板快照 |
| GET | `/v1/runtime/screenshot` | 画布 PNG |
| GET | `/v1/runtime/svg` | 当前画布 SVG |
| GET / POST | `/v1/runtime/e-file` | 当前模型 E 文件（POST 可带自定义模板） |
| GET | `/v1/runtime/dom` | 页面 DOM 结构（元素树或 HTML） |

### v1：控制台写操作（需页面在线）

`POST` 到以下路径，经 WebSocket 下发到前端 `__appScope` 程序化方法：

```
/v1/control/device/add            /v1/control/device/delete
/v1/control/device/property/update
/v1/control/scheme/create         /v1/control/model/create
/v1/control/devices/select        /v1/control/devices/group
/v1/control/save                  /v1/control/template/saveFromSelection
/v1/control/e-device-definition/export
/v1/control/e-device-definition/import
/v1/control/space/switch          /v1/control/model/switch
```

> 写操作只改前端内存，**要落盘必须另调** `/v1/control/save`。

### v1：联调接收端

`POST /v1/receive`（接收「发送模型」转来的内容并回解析摘要）、`GET /v1/receive`（回看）、
`DELETE /v1/receive`（清空）。内存保留最近 5 次，不落盘、不鉴权。

### 内部 REST（前端使用，非稳定契约）

前缀同为 `/webgrp`：

- 空间：`GET/POST/PUT/DELETE /spaces`、`GET /spaces/export`、`POST /spaces/import`
- 方案：`GET /schemes`、`GET /schemes/export`、`POST /schemes/import`、`GET/PUT/DELETE /schemes/project`、`PUT/DELETE /schemes/scheme`
- 图片：`GET/POST /images`、`GET/POST /image-folders`、`POST /icon-library/import`、`POST /image-library/import`
- 全局线路：`GET /global-lines`、`POST /global-lines/{attach,detach,sync-project}`、`PUT/DELETE /global-lines/record`
- 配置：`GET/PUT /color-config`、`/measurement-config`、`/device-library`、`/symbol-export-schemes`、`POST /symbol-export`
- 本机导出：`POST /exports/native/{select-file,write-text,open-file}`

---

## MCP 功能

平台内置 **Model Context Protocol** 服务，让 Claude Code、Cursor、MCP Inspector 等 AI 客户端
用统一协议读方案、读图元库、取前端运行时态、直接改前端画布。

- **传输**：streamable HTTP，**无状态**（每个 POST 一次 JSON-RPC 往返，不建 SSE 长连接）
- **地址**：`http://127.0.0.1:5174/webgrp/mcp`
- **协议版本**：MCP `2025-06-18`（`@modelcontextprotocol/sdk` 1.32.2）
- **不是第二份实现**：全部工具转调 `server/apiV1*.mjs` / `eFileExport.mjs` / `cimExport.mjs` / `sendModel.mjs`
  已导出的 handler，参数校验、错误码、空间隔离口径与 v1 同源

### 接入

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

或图形化调试：

```bash
npx @modelcontextprotocol/inspector
# Transport: Streamable HTTP
# URL:        http://127.0.0.1:5174/webgrp/mcp
```

### 工具域（29 个 `gmp_*` 工具）

| 域 | 工具数 | 依赖前端在线 | 代表工具 |
|----|--------|--------------|----------|
| 方案域 | 6 | 否 | `gmp_list_schemes`、`gmp_get_model_json`、`gmp_export_model`、`gmp_export_scheme_archive`、`gmp_send_model` |
| 图元库域 | 1 | 否 | `gmp_get_library` |
| 运行时态域 | 8 | **是** | `gmp_list_runtime_clients`、`gmp_get_runtime_model`、`gmp_capture_runtime_screenshot`、`gmp_get_runtime_e_file` |
| 页面结构域 | 3 | **是** | `gmp_get_page_dom`、`gmp_switch_space`、`gmp_switch_model` |
| 控制台写操作域 | 11 | **是** | `gmp_add_device`、`gmp_create_model`、`gmp_select_devices`、`gmp_update_device_property`、`gmp_save_model` |

### 三条硬约束

1. **运行时态与写操作需要前端页面在线** —— 否则回 `no-online-client`。
2. **写操作只改前端内存，不自动落盘** —— 持久化需另调 `gmp_save_model`。
3. **多个页面在线时必须用 `token` 指定目标页面** —— `token` 即页面地址栏的 `?token=`，
   也是 WS clientId；不猜、不退回「最近活跃」。

### 示例调用

```jsonc
// 读方案树
{ "name": "gmp_list_schemes", "arguments": {} }

// 导出某模型为 E 文件（国网E格式，GBK）
{ "name": "gmp_export_model", "arguments": {
    "schemePath": ["示范厂站"], "name": "10kV 馈线", "format": "e-file",
    "templateName": "国网E格式", "encoding": "gbk" } }

// 在指定页面新增图元并保存
{ "name": "gmp_add_device", "arguments": { "kind": "ACLoad", "x": 320, "y": 180, "token": "page-3f8a1c9d2b4e" } }
{ "name": "gmp_save_model", "arguments": { "scope": "currentModel", "token": "page-3f8a1c9d2b4e" } }
```

> 📖 **完整文档：[docs/MCP.md](docs/MCP.md)** —— 29 个工具的参数表、连接与空间/token 规则、
> 返回形状、错误码与已知限制。评测题集见 [docs/mcp-evaluation.xml](docs/mcp-evaluation.xml)。

---

## 目录结构

```
graph_modeling_platform/
├── src/                 # 前端源码（React 19 + TypeScript）
│   ├── appExtracted/    # 大型工厂 / 视图模块（经 __appScope 共享状态）
│   ├── components/      # 可复用受控输入组件
│   ├── export/          # 直载纯模块：E 文件、SVG、元件定义
│   ├── cim/             # CIM/XML 导出（IR → RDF/XML）
│   └── hooks/           # 自定义 Hook
├── server/              # 后端服务（Node.js ESM，.mjs）
│   └── mcp/             # MCP 服务（/webgrp/mcp）
├── shared/              # 前后端共享纯模块（原子写、路径安全、XML/正则转义等）
├── e2e/                 # Playwright 端到端测试
├── scripts/             # 一次性分析与修复脚本（非运行时依赖）
├── public/              # Vite 静态资源（含 icon-library/）
├── docs/                # 设计 / 接口 / 架构文档
├── data/                # 运行时数据（已 gitignore）
└── index.html           # 前端入口
```

## 文档

| 文档 | 内容 |
|------|------|
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | 功能清单、符号映射、架构风格索引 |
| [docs/MCP.md](docs/MCP.md) | MCP 服务：连接方式、29 个工具速查、错误码、限制 |
| [docs/mcp-evaluation.xml](docs/mcp-evaluation.xml) | MCP 只读评测题集 |
| [docs/ModelDefJson.md](docs/ModelDefJson.md) | 设备定义 JSON 结构 |
| [AGENTS.md](AGENTS.md) | 开发约定、改动分档、检索纪律、命令速查 |

## 技术栈

React 19 · TypeScript 5.5 · Vite 7 · antd 6 · ReactFlow（@xyflow/react）· Node.js ≥ 24（ESM）
· ws · `@modelcontextprotocol/sdk` 1.32.2 · Vitest · Playwright
