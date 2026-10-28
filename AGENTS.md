<!-- 单一入口：**执行型规则**（改动分档、检索纪律、视觉问题、数据操作、提交推送）与**项目速查**（目录、关键文件、命令、约定、注意事项）都在本文件。
     查阅型资料（功能清单 / 符号映射 / 架构风格）在 `docs/ARCHITECTURE.md`，按需跳转，不必通读。
     各子目录的规范（原 `<目录>/AGENTS.md` 与 `<目录>/CLAUDE.md`）已并入「分域规则」一节；本文件的「改动分档」「检索纪律」优先于下方自动生成的 gitnexus 块。 -->

# 电力能源系统图上建模平台

<!-- Generated: 2026-05-26 | Updated: 2026-10-29（原根目录 CLAUDE.md 的概述/目录/关键文件/查找指南/约定/命令/注意事项并入本文件） -->

## 概述

React 19 + Vite 7 + TypeScript 的前端图形建模平台，支持电力/氢能/热力系统的拓扑建模和 E 格式导出。后端 Node.js（.mjs ESM）提供图像/方案/配置数据服务，并经 WebSocket 桥接前端运行时态供第三方 `/api/v1` 只读 API 消费。

**执行型规则见本文件「工作规则」**（改动分档、检索纪律、视觉问题处理、数据操作）。
**功能清单、符号映射、架构风格在 `docs/ARCHITECTURE.md`** —— 查"有没有这个功能""这个符号在哪"时读那里，不要通读本文件。

# 工作规则

## 改动分档（先定档，再决定流程）

按**爆炸半径**选档，不按改动行数以外的直觉。定档在动手前一句话说明。

| 档 | 判据 | 流程 | 禁止 |
|----|------|------|------|
| **小** | ≤5 行、单文件、不改数据、不改契约/导出格式 | 定位 → 改 → 跑**受影响的单测文件** → 报告 | 不得跑全量测试、不得为自证再造独立脚本、不得做 git stash 反证 |
| **中** | 多文件或含存量数据迁移，但不改对外契约 | 小档 + 备份 + 幂等重跑验证 + 全量测试**一次** | 不得跳过迁移的 dry-run |
| **大** | 改契约/改导出格式/改共享类型/影响 >10 文件 | 完整七阶段 + gitnexus impact + detect_changes + 全量测试 | — |

「全量测试一次」是字面意思：同一批改动只跑一次全量，且放在**最后一轮**。中间验证用 `npx vitest run <受影响的文件>`，不要每改一处就 `pnpm vitest run`（实测单次约 120 秒 + 1 个 step；那次任务为此白跑到两次）。

gitnexus 块的 MUST（impact / detect_changes）适用于**中、大档**；小档改动只需读懂被改符号的直接调用方（grep 一次即可）。**任何归档都不豁免最后一轮全量测试**——小档也跑一次，因为 3 行改动确实能静默打挂既有用例。

## 检索纪律（省 step 就是省时间）

每步约 20–30 秒，**总耗时 ≈ step 数 × 单步延迟**。减少往返优于减少单次开销；让单条命令变快几乎没有意义（ops_bash 中位数只有 5.7 秒）。

一次实测（6 turn / 188 分钟）：455 个 step × 25 秒 = 3.1 小时，其中模型推理 39%、工具执行 32%、编排 29%。**唯一有效的杠杆是砍 step 数。**

### 必须并行（省时最多的一招）

- **入参互不依赖的工具调用必须一次发出**：读 3 个文件、跑 2 个 grep、查 2 个接口，放在同一条消息里并行调用。只有「先搜到文件名、再按名字读」这类真依赖才允许串行。
- 判据是入参而不是语义：只要 B 的命令行里不出现 A 的返回值，B 就必须和 A 同批发出。
- 反面数据：那次任务 455 个 step 里只有 5 个（1.1%）发过并行调用；并行率提到 30% 可直接省约 40 分钟。

### 一次拿全

- **连续探测合成一条命令**：要「文件在哪 / 内容是什么 / 接口回什么」，一条 `find … ; cat … ; curl …` 就够，不要拆成 8 个 step（曾连续 8 个 bash 只为一个答案）。
- **grep 一次拿全**：多 pattern 合并（`a\|b\|c`）、全仓搜。不要"发现新名字再回头搜第二遍"。
- **合并独立读取**：多个文件用一次 `ops_read_files`，不要 5 次单文件读。
- **不重复取证**：同一事实只确认一次，确认后就写进下一步的依据里，不回头复核。
- **浏览器只用来验证交互路径**。几何/数据/序列化结论用 Node 脚本或 grep，不用 DOM 二次确认。
- **量盒子一次量全**：要 side / block / list / row 的几何，写一个 evaluate 一次返回全部矩形，不要一个元素一个 step。
- **不要 `location.reload()`**：会销毁 CDP execution context，下次 evaluate 直接报 `Execution context was destroyed` / `No page found`，等于白送两个 step。优先用页面内交互，或先 `navigate_page` 再操作。
- 浏览器重启后 pageId 会变，先 `list_pages` 拿新 id，不要盲试旧 id。
- **不支持图片输入的模型不要 `take_screenshot`**：返回的是 `[image unavailable]`，零信息。

## 长任务：先拆 turn，再谈优化

单个 turn 超过约 60 个 step 就是信号——上下文膨胀后会触发大量被动 prune（那次任务 154 次），每次打断都吃掉真实时间。

- **主动折叠**：到 60 / 120 / 180 step 附近各 `compress` 一次，一次折掉已消费的检索证据，比让系统被动 prune 更划算。
- **一件交付物一个 turn**：不要把「改形状 + 写迁移脚本 + 跑全量 + 提交」全塞进同一个 turn；交付给用户看一眼再开下一个，成本只是用户点一下。
- 长命令（全量测试、构建、类型检查）放后台跑，不要前台空等（实测全量 `pnpm vitest run` 冷跑 110–120 秒、热跑约 60 秒；`tsc --noEmit` 约 56 秒）。
- 复盘一次任务为什么慢，用本仓自带脚本而不是手写探针：`node scripts/session-timing-report.mjs [<session-id>] [--file <log>] [--json]`，按 step 边界直接给出 turn 级时长、模型/工具/编排三段归因、并行率、最慢 step。

## 视觉 / 形状类问题

用户说「X 应该和 Y 一样」「X 的图形不对」时，**第一个动作是最小渲染对比，不是读渲染代码**：

1. 并排渲染/序列化 X 与 Y（`renderToStaticMarkup` 或导出 `<symbol>`），输出 diff。
2. 拿到差异 → 定位到产生差异的那几行。
3. **立即向用户确认口径**（改成哪个方向、是否同步存量数据），不要先铺证据。
4. 再改。

反面教训：曾为「两个图元图形不一致」先读了约 400 行渲染代码，结论是"渲染分支不影响几何"；而同一次的最小对比脚本在 40 分钟时才写，一次就定调。差异其实只在端子锚点 `{x:0.5,y:0}` vs `{x:0,y:-0.5}`。

## 歧义处理

- 用户描述偏主观（"一样""不对""怪怪的"）时，**10 分钟内提问**，用 `ask_user_question` 给出可判定的选项（含"同步存量数据"这类副作用选项，并说明不可逆）。
- 不要用"再多找点证据"代替提问。

## 数据与不可逆操作

- 改动 `data/` 下任何模型/配置 JSON 前：先 dry-run 打印将改动的条数，`--apply` 时逐文件 `.bak` 备份，改完再 dry-run 一次验幂等。
- 一次性数据修复脚本**只写到"能跑一次"为止**；不为 3 个节点写缩进探测/多空间枚举之类的通用工具。备份与幂等校验不省，其余不省时间的地方都可以省。

## 提交与推送（默认动作，无需再确认）

用户说「提交并推送」时，**两条远程都推**，顺序固定：

```bash
git push origin HEAD:master
git push origin_tsysmart HEAD:refs/for/master
```

- `origin` = GitHub（`git@github.com:jimgreen/graph_modeling_platform.git`），推 `master` 分支。
- `origin_tsysmart` = Gerrit（`ssh://foree@tsysmart.com:29418/graph_modeling_platform`），推 `refs/for/master` 走评审。Gerrit 侧 `master` 与 GitHub `origin/master` 指向同一提交，所以这样推不会分叉。
- 仓库远程的**默认分支当前是 `main`**（`origin/HEAD -> origin/main`），与上述推送约定并存：推送仍固定走 `master`；首次推 `master` 时若远程还没有该分支，会在 GitHub 上新建，之后以 `master` 为发布分支。
- 提交前先跑 `mcommit` 技能收敛为单个 commit（`Change-Id` 复用最底部提交的）；Gerrit 的 `commit-msg` hook 会生成 `Change-Id`，不要在 message 里手写。
- 推送成功后把 Gerrit 返回的 change 链接（`https://tsysmart.com:8080/review/c/graph_modeling_platform/+/<id>`）报给用户。

## 输出

- 汇报代码改动时**不必**为每条改动生成 dsh-ui 组件；小档改动用纯文本 + 关键 diff 行即可。组件只用于确实需要并排对比/多指标/流程图的场合。

## 查阅型资料不在此处

功能清单、代码映射、架构风格见 `docs/ARCHITECTURE.md`；目录结构、关键文件表、命令见本文件「项目速查」。改后端前读本文件「分域规则 · server」，改前端前读「分域规则 · src」—— 各域不变量、测试要求、补充模块清单都在那里。

# 项目速查

## 目录结构

```
graph_modeling_platform/
├── src/                # 前端源码
├── server/             # 后端服务
├── e2e/                # Playwright 端到端测试
├── scripts/            # 一次性分析/修复脚本
├── public/             # Vite 静态资源
├── docs/               # 设计/需求/工作流文档 + ARCHITECTURE.md
├── data/               # 运行时数据（默认忽略）
└── index.html          # 前端入口
```

### 目录职责

| 目录 | 职责 | 备注 |
|------|------|------|
| `src/` | 前端 React 19 + TypeScript 源码 | 见「分域规则 · src」 |
| `src/appExtracted/` | 从 `App.tsx` 抽取的大型工厂/视图模块 | 模块间经 `__appScope` 共享状态 |
| `src/components/` | 受控输入/静态按钮等可复用组件 | 缓冲提交模式 |
| `src/hooks/` | 自定义 React Hook | `useBatchEditors`（批量属性编辑）、`useGlobalLines`（全局线路放置） |
| `src/encoding/` | 编码/解码工具（GBK、E 文件格式） | |
| `src/model/` | 模型相关子模块 | |
| `src/lib/` | 通用工具库 | |
| `server/` | 后端 Node.js ESM (`.mjs`) 服务 | 见「分域规则 · server」 |
| `e2e/` | Playwright E2E 测试 | 真实浏览器 + WS 指令通道 |
| `scripts/` | 一次性分析/修复脚本 | 非运行时依赖 |
| `public/` | Vite 静态资源 | |
| `docs/` | 设计/需求/工作流文档 | 架构与功能索引见 `docs/ARCHITECTURE.md` |
| `data/` | 运行时数据 | **整目录被 `.gitignore` 第 3 行忽略，不含任何版本跟踪文件**（`git ls-files data` 为空）。因此依赖 `data/` 样本的测试/脚本在干净检出上必然缺数据 —— 写这类用例必须加 `existsSync` 守卫（见 `src/autoAlignLineQuality.test.ts`）。`data/icon-library/` 在 `public/icon-library/`（**那一个**才是版本跟踪的，见 `iconLibraryIntegrity.test.ts`）。`data/schemes/files/**` 只含 `.json`，`.e` / `.svg` / CIM 全部按需实时生成（不落盘）；存量派生文件用 `pnpm purge:derived` 归档进 `data/schemes/trash/` |

### 关键文件

| 文件 | 职责 |
|------|------|
| `src/App.tsx` | 主应用组件，装配 `__appScope` |
| `src/model.ts` | 核心类型定义（DeviceKind、拓扑结构、E 格式导出） |
| `src/runtimeWsClient.ts` | 前端 WS 客户端：注册 clientId（= 地址栏 ?token=）、ping 心跳、响应 server fetch + command |
| `src/runtimeSnapshot.ts` | 运行时态序列化（model/devices/selection/tab/snapshot/svg/dom） |
| `src/runtimeDom.ts` | 页面 DOM 快照（`runtime.dom` 资源）：`buildDomOutline` 元素树 / `serializeDomHtml` 标记，供 MCP 与 v1 消费 |
| `src/styles.css` | 全局样式（含 .diagram-canvas、.canvas-boundary 等） |
| `src/model-routing.ts` | 模型路由算法：拓扑布线/路径规划（470KB 大型模块） |
| `src/all-network-topology.ts` | 全网拓扑导出：多厂站 E 文件导出逻辑 |
| `src/global-lines.ts` | 全局线路管理：跨模型线路注册与同步 |
| `src/hooks/useGlobalLines.tsx` | 全局线路的放置对话框状态、跨模型线路增删与同步（UI 层，逻辑在 `global-lines.ts`） |
| `src/graphStore.ts` / `src/routeStore.ts` | 图形状态与路由缓存的不可变更新入口 |
| `src/svgModelImport.ts` | SVG 模型导入 |
| `src/EFileEditor.tsx` | E 格式文件在线编辑器 |
| `src/globalMessage.ts` | 全局消息提示系统 |
| `src/voltageInheritance.ts` | 电压等级继承传播 |
| `src/measurements.ts` | 量测核心逻辑（含测点查重、默认值、行内编辑） |
| `src/model-eexport.ts` | E 格式导出核心（157KB） |
| `server/server.mjs` | 主服务创建：HTTP 路由分发、静态托管、WS 挂载、v1 路由装配 |
| `server/dev.mjs` | 开发入口：起 image-server + spawn vite |
| `server/runtimeWs.mjs` | /ws 升级 + 客户端注册表 + fetchFromClient |
| `server/globalLineRegistry.mjs` | 全局线路注册表（43KB） |
| `server/apiV1*.mjs` | v1 各域端点（Runtime/Schemes/Library/Control） |
| `server/mcp/` | MCP 服务（/webgrp/mcp，streamable HTTP 无状态，29 个 gmp_* 工具）—— 转调 v1 handler，详见 `docs/MCP.md` |
| `server/swaggerPage.mjs` | /swigger 自包含 HTML 接口文档页 |
| `server/nativeExportSave.mjs` | 原生导出保存 |
| `server/config.mjs` | 共享配置（host、端口、前缀） |
| `src/export/` | 直载纯模块（无 `.tsx`、无 React 组件/JSX）：E 文件（`e-file.ts`）、SVG 渲染（`svg.ts`）、元件定义共享（`device-definition-shared.ts`）、SVG 图片引用（`svg-images.ts`）、静态按钮目标（`static-button-targets.ts`） |
| `server/eFileExport.mjs` | E 文件端点适配层：读盘模型 + 库配置，用 `src/export/e-file.ts` 装配选项、`src/model-eexport.ts` 的 `buildEFileExport` 生成（GBK/UTF-8） |
| `server/eFileTemplates.mjs` | 预定义 E 元件模板读取（`PREDEFINED_E_DEVICE_TEMPLATES`） |
| `server/svgExport.mjs` | SVG 端点适配层：装配库模板（含覆盖）+ 配色 + 内联被引用图片，调 `src/export/svg.ts` |
| `server/cimExport.mjs` | CIM/XML 端点适配层：调 `src/cim/cim-export.ts` |
| `server/domShim.mjs` | Node 侧 localStorage 桩（须先于任何 `src/**/*.ts` import 执行） |
| `scripts/audit-undefined-names.mjs` | 未定义名审计：内存剥离 `@ts-nocheck` 查 ReferenceError 类缺陷（`pnpm audit:names`） |
| `scripts/purge-derived-scheme-files.mjs` | 存量派生文件一次性归档：把 `data/schemes/files` 下非 `.json` 移入 `data/schemes/trash/<timestamp>/`（`pnpm purge:derived`，默认 dry-run） |
| `vite.config.ts` | Vite 配置（含测试配置 + /api、/ws 代理） |
| `vite.e2e.config.ts` | E2E 测试专用 Vite 配置 |

## 查找指南

| 任务 | 位置 | 说明 |
|------|------|------|
| 设备类型定义 | `src/model.ts` | 核心模型 |
| React 主组件 | `src/App.tsx` | 应用主逻辑（含 __appScope 装配） |
| 视图渲染 | `src/appExtracted/appView.tsx` | topbar/画布/面板渲染 |
| 后端 API | `server/server.mjs` | 图片/方案/配置 REST + /swigger |
| 第三方 v1 API | `server/apiV1*.mjs` | 只读信封 API（schemes/library/runtime）+ 控制台写操作（control） |
| 运行时态桥接 | `server/runtimeWs.mjs` + `src/runtimeWsClient.ts` | WS 桥接前端 |
| 接口文档页 | `server/swaggerPage.mjs` → `/swigger` | 在线接口文档与测试 |
| 测试文件 | `src/*.test.ts` / `server/*.test.mjs` | Vitest（与源文件同目录）；守卫见 `server/nativeLoad.test.mjs`、`src/appExtracted/appScopeContract.test.ts` |
| 后端导出适配层 | `server/eFileExport.mjs` / `svgExport.mjs` / `cimExport.mjs` | 均 Node 原生直载 `src` 下 TS 模块（如 `src/export/`、`src/cim/`、`src/model-eexport.ts`），零构建产物 |
| 功能是否存在 / 符号在哪 | `docs/ARCHITECTURE.md` | 功能清单 + 代码映射表 |

## 命令

```bash
# 开发（前端 + 后端）
pnpm dev

# 仅前端
pnpm dev:frontend

# 仅后端
pnpm server

# 构建
pnpm build

# 测试（单元 + 集成）
pnpm vitest run

# 单文件测试
pnpm vitest run src/<file>.test.ts

# E2E 测试（Playwright，需浏览器）
pnpm test:e2e

# 类型检查
pnpm tsc --noEmit

# 预览构建
pnpm preview

# 图标库审计（读 public/icon-library/，7862 图标 / 118 分类）
pnpm audit:icons

# 未定义名审计（穿透 @ts-nocheck，查 ReferenceError 类缺陷）
pnpm audit:names
# 同上，但只查「属性不存在」这类运行时 TypeError
node scripts/audit-undefined-names.mjs --crash-only
# 连已核过安全的存量命中一起列出
node scripts/audit-undefined-names.mjs --crash-only --all-known-safe

# 存量派生文件归档（默认 dry-run；加 --apply 才移动）
pnpm purge:derived
pnpm purge:derived --apply
```

## 约定

| 项目 | 约定 |
|------|------|
| 测试位置 | 与源文件同目录：`*.test.ts` / `*.test.tsx` / `*.test.mjs` |
| 守卫测试 | `server/nativeLoad.test.mjs`（spawn 真实 node 直载三适配层，防 `.tsx` 或漏 `.ts` 扩展名混入）；`src/appExtracted/appScopeContract.test.ts`（`createMeasurementFieldParameterDefinition` 只能静态 import 或调用，不得从 scope 解构） |
| 类型定义 | 集中在 `model.ts`，非分散 |
| 配置管理 | Vite 配置在 `vite.config.ts`（含测试配置 + /api、/ws 代理） |
| 模块系统 | ES Modules（`"type": "module"`），后端统一 `.mjs` |
| 数据隔离 | 测试用 `GRAPH_MODEL_DATA_DIR` env 指向 tmpdir |
| v1 响应信封 | `{ok:true,data}` / `{ok:false,error:{code,message}}` |
| UI 组件 | 优先使用 antd 组件,避免自造轮子 |
| __appScope 装配 | App.tsx 每帧重建 `__appScope` 对象并 `Object.assign` 当前状态；空依赖 useEffect 需经 `__appScopeRef` 读最新引用 |

## 注意事项

| 事项 | 说明 |
|------|------|
| 端口冲突 | 默认前端 5173，后端 5174，确保端口可用 |
| 数据目录 | `data/` **整目录忽略、无版本跟踪文件**。图标库在 `public/icon-library/`（跟踪），不在 `data/icon-library/`。任何读 `data/` 样本的测试都要加 `existsSync` 守卫，否则干净检出会 ENOENT 假红 |
| 代理配置 | Vite 代理 `/api`、`/ws` 到后端服务 |
| 环境变量 | `IMAGE_SERVER_PORT` 可自定义后端端口；`GRAPH_MODEL_DATA_DIR` 覆盖数据根目录 |
| WS 指示灯 | 前端右上角 RT-WS 指示灯显示运行时态 WS 状态，点击复制页面 token（= 地址栏 ?token=，MCP 用它指定目标页面） |
| Node 原生 TS | `server/*.mjs` 可直接 `import` `src` 下 TS 模块（如 `src/export/`、`src/cim/`、`src/model-eexport.ts`）；相对 import 必须带 `.ts` 扩展名（`allowImportingTsExtensions`），且不得 import `.tsx` |

# 分域规则

> 各子目录的规范原先分散在 `<目录>/AGENTS.md`（其中 6 个是 `<目录>/CLAUDE.md` 的软链），2026-10-29 全部并入本节，目录文档已删除。**新增目录级规则写进本节，不再单开目录文档。**

## server（后端）

后端服务（Node.js ESM `.mjs`）：图片/方案/配置读写 REST API、第三方只读 `/webgrp/v1` 信封 API、运行时态 WS 桥接、`/swigger` 接口文档页。开发期与 Vite (5173) 同跑，默认监听 5174。

### 后端规则

- 后端统一 `.mjs`（ESM），`package.json` `"type": "module"`。
- Node 下限 **24**（`package.json` `engines`）：三适配层靠 Node 原生 TS 直载 `.ts`，低于 22.18/23.6 时首次 `/v1/` 请求抛 `ERR_UNKNOWN_FILE_EXTENSION`，被外层 catch 成 500（信息含扩展名）。
- 新增 v1 端点：在对应 `apiV1*.mjs` 加 handler → `server.mjs` 注册路由 → `swaggerPage.mjs` 加端点+示例 → `swigger.examples.test.mjs` 加期望。
- WS 透传：`fetchFromClient` 成功 resolve 裸 data（非信封），失败 reject `Error` 带 `.code`。
- 数据隔离：测试用 `GRAPH_MODEL_DATA_DIR` env 指向 tmpdir，image-server 模块加载时求值一次。
- schemePath 单次 `encodeURIComponent`，示例值存原始 JSON 字符串，`buildUrl` 统一编码。
- **`data/schemes/files/**` 只落 `.json`**：保存模型不再产 `.e` / `.svg`（旧简化渲染器 `buildSvgFile` / `buildDeviceParameterFile` 已删除，`writeSchemeFiles` 的 `expectedFiles` 只登记 jsonPath）。E / SVG / CIM 一律按需实时生成——单模型端点、方案 ZIP（`schemeArchive.mjs`）、前端导出按钮共用同一装配；旧 `.e` / `.svg` 不复用、不读取。存量派生文件用 `pnpm purge:derived`（默认 dry-run，`--apply` 才移动）归档进 `data/schemes/trash/<timestamp>/`。
- 三导出适配层经 Node 原生 TS 直载 `src` 下 TS 模块（如 `src/export/`、`src/cim/`、`src/model-eexport.ts`，零构建产物）：相对 import 必须带 `.ts` 扩展名，不得 import `.tsx`；被直载模块不得是 `.tsx`、不得含 JSX/React 组件（闭包内可间接 import npm 包 `react`，如 `src/svgUtils.ts`，Node 能正常加载）。守卫见 `nativeLoad.test.mjs`。
- **改了 `src/**/*.ts` 必须重启后端进程**（`pnpm dev` 重起或 `pnpm server`）：适配层对 `src` 走顶层 `await import`，Node ESM 每进程只求值一次、**无 HMR** —— 不重启时后端仍跑旧代码（前端 Vite 是新代码），会出现「界面新、导出旧」的分裂。真实案例：2026-09-17「E 文件成员关系段恒输出」提交后，未重启的后端仍把该段整段剔除，被误判为功能缺陷（见 `docs/superpowers/plans/2026-09-15-ac-container-followups.md` 所在特性的 fb17 调查）。

### 后端常见模式

- v1 错误码→HTTP：bad-request→400，not-found/no-active-model/no-selection→404，no-online-client/ws-timeout→503，internal→500
- v1 信封：`{ok:true,data}` / `{ok:false,error:{code,message}}`
- `/swigger` 内联 JS 用 `\\n`（双反斜杠）输出字面换行，避免模板字面量 SyntaxError
- 空间隔离：`GRAPH_MODEL_DATA_DIR` 下 `data/` 是 default 空间的根，其余空间在 `data/workspaces/<id>/`。路径经 `options.paths ?? defaultPaths` 显式透传，不用 AsyncLocalStorage。空间标识解析：`X-Space` 头 > `?space=` > `Cookie: gmp_space` > 回退 `spaces[0]`（回退时响应带 `X-Space-Fallback`）。
- 建目录不变量：**一切建目录调用（`mkdirRaw`、`writeTextIfChanged` 与 `writeImageAssetFile`）均经退休守护**（先 `assertNotRetiredRoot` 再建）—— 否则删除空间后，在飞请求能把已删空间重建出来。判据：`mkdirRaw` 只出现在 `server.mjs:2`（import 别名）与 `mkdirInSpace` 内（约 `:76`）。**别再用 `grep -n "mkdirRaw\|mkdir(" server/server.mjs` 自查**：它同时命中全部 19 处 `mkdirInSpace(` 调用点，给不出「没有第二处裸 mkdir」的判据。别名本身比 grep 更强：模块内只 import 了别名，新写一处裸 `mkdir` 会直接 `ReferenceError`，而不是静默绕过守护。`writeTextIfChanged` 与 `writeImageAssetFile` 也必须走守护，因为 `shared/atomicWrite.mjs` 的 `atomicWriteFile` 自己会 `mkdir(dirname(filePath))` —— 那是 grep 不到的第二条建目录路径。
- **「只有 ENOENT 算不存在」**：读盘/列目录的 catch 里，`error.code === "ENOENT"` 才能降级（返回 null / 跳过），其余 IO 失败（EACCES、EBUSY、EIO……）一律上抛。静默降级的代价从来不是「多扫一次盘」，而是把「读不到」说成「不存在」—— 模型被报成 404、方案从树里消失，或 `existingStoredProjectIndex` 认为模型还没有 idx 而**重新分配一个新 idx**，旧 idx 上的全局线路引用（projectIdx）与导出的 model_id 全部对不上，且无报错无日志。已按此口径处理的点：`readSchemeDirectory`、`readSchemeProjectFile`、`readSchemeProjectSummaryFile`、`projectJsonFileForName`、`existingStoredProjectIndex`、`archiveSchemeStoreEntry`、`listSpaceFiles`（zip-slip 域的 `zipEntryParts` 同理）。**新加读盘 catch 时照此办理**，别再写 `catch { return null }`。
- 原子写单源是 `shared/atomicWrite.mjs` 的 `atomicWriteFile`（tmp+rename+**失败清理 tmp**）。模型 JSON、注册表 JSON、配置 JSON、图标资产一律走它；**别再手搓 tmp+rename** —— 手搓版在 rename 失败（Windows 上目标文件被占用即 EPERM）时会把 `<目标>.json.<pid>.<uuid>.tmp` 永久留在磁盘上，而空间导出 ZIP 遍历整个 `schemes/`（只排除 `schemes/trash`），这些半截 JSON 会被打进用户备份包。调用它即意味着多了一条建目录路径，务必配 `assertNotRetiredRoot`（见上一条）。
- **模型存储边界 = `normalizeProjectForStorage`**：保存接口不校验 `record.project`，而 SVG / E 文件 / CIM 三条导出链与方案 ZIP 导出各自按结构假设解引用。故本函数负责把落盘模型补成「渲染层可无条件解引用」的形状——滤掉非对象的节点 / 边 / 端子 / 量测组，补齐 `kind` / `position` / `size` / `terminals[].anchor` / `measurements.groups`。守卫见 `exportRobustness.test.mjs`（35 条畸形载荷 × 5 个导出端点）。三条要点：① 滤非对象节点必须放在**函数第一行**，放到分配 idx 之前仍然太晚——后面两个归一化会把 `null` 摊成「看起来合法、却没有 id/kind/size」的节点；② 已是对象的 `position` / `size` / `anchor` **原样复用**不另造（每次模型读取都跑，按节点白造三份分配不划算）；③ 别再往渲染点补 `?.` 兜这类形状问题——入口只有一处。
  对照：`baseDeviceKind` 对非字符串 `kind` **故意抛 TypeError 不兜底**（`globalLinesKeys.test.ts` 有守卫记录该决定：静默兜成 `""` 会掩盖「取不到线路」这个真问题），与本条是两回事，别顺手改成 `String(kind ?? "")`。
- 空间**名**唯一：判重归 `spaceStore` 在锁内做（`create`/`rename` 的 `onDuplicate`），HTTP 三个入口（POST 新建 / PUT 改名 / POST 导入）经 `sendSpaceNameConflict` 统一回 409 `SPACE_NAME_DUPLICATE`，正文带冲突者的 `name` 与 `conflictId`；导入另收 `?mode=overwrite|rename`（+ `?name=`），供前端问过「覆盖 / 重命名」后重发。`onDuplicate` 只管**显示名**，id 去重（`spaceIdFromName` 加 `-2` 后缀）照旧独立生效 —— 不同名也可能 slug 成同一个 id（`"a/b"` 与 `"a b"`）。
- 端到端隔离测试见 `spaceScope.test.mjs`；派发注入见 `spaceDispatch.test.mjs`。
- `/swigger` 的端点元数据集中在 `swaggerPage.mjs` 的 `SWIGGER_ENDPOINTS`；`swigger.examples.test.mjs` 会**逐个真实调用**每条示例，故新增示例必须自带稳定期望、且**不得**收录会触发本机副作用的端点（`/webgrp/exports/native/*` 因会弹 Windows 另存为对话框而刻意排除）。

### 后端测试

- **`.test.mjs` 必须是纯 JS**：不要写 `as never` / 类型标注 / 非空断言 `!`。
  这些在 `.ts` 测试里没问题，在 `.mjs` 里会触发 `RollupError: Parse failure`，
  表现为 **`Tests: no tests`** —— 而 `no tests` 看起来像「没跑到用例」，
  **绝不能当成通过**。清掉 TS 语法的批量替换还会留下 `[]` 之类的碎片引发第二轮
  parse 失败；从一开始就用纯 JS 写，比事后清理便宜得多。
  新增 server 测试时先看一眼同目录既有 `.test.mjs` 的写法。
- `pnpm vitest run server/` 跑后端测试（含三导出适配层：`svgExport.test.mjs` / `apiV1Schemes.e-file.test.mjs` / `cimExport.test.mjs` 与 Node 原生直载守卫 `nativeLoad.test.mjs`）
- 改动 swigger 后跑 `swigger.examples.test.mjs`（106 示例 / 81 端点）。**新增端点必须同步 `swaggerPage.mjs` 的 `ENDPOINTS`**，否则 `routeCoverage.test.mjs` 会红 —— 它比对「server 实际注册的路由」与「已文档化端点」，覆盖三张路由表（`server.mjs` 的 `routeKey`、`apiV1*.mjs` 的 `{method, pattern: apiPattern(...)}`、`server.mjs` 的 `dynamicRouteHandlers` 的 `dynAssetPattern(...)`）。`/webgrp/exports/native/*` 在该测试的 `INTENTIONALLY_UNDOCUMENTED` 名单里（会弹本机对话框）。
- 改动 v1 端点跑对应 `apiV1*.test.mjs`
- 新增/改动 `server/*.mjs` 对 `src/**/*.ts` 的 import 后跑 `pnpm audit:names`（穿透 `@ts-nocheck` 的未定义名审计）

### 后端补充模块（根「关键文件」表未列）

| 文件 | 职责 |
|------|------|
| `server/runtimeRegistry.mjs` | 客户端注册表纯逻辑：register/unregister/touch/listClients/fetchFromClient + 超时清理 |
| `server/apiV1Runtime.mjs` | v1 运行时态端点（clients/model/devices/selection/tabs/screenshot/svg/e-file/dom），经 WS 透传 |
| `server/apiV1Schemes.mjs` | v1 方案域只读端点（hierarchy/models/export/model json/svg） |
| `server/apiV1Library.mjs` | v1 图元库域只读端点（categories/devices/measurements/device-definitions/templates） |
| `server/apiV1Control.mjs` | v1 控制台写操作端点（device/scheme/model/select/group/delete/update/save/template/e-device-definition），经 WS 下发到前端 `__appScope` |
| `server/cors.mjs` | 跨源头**唯一一份**（`access-control-*`）；`server.mjs` 与 `v1Response.mjs` 均从此导入 —— **勿在别处再定义一份**（T13 单源化） |
| `server/spaceId.mjs` | 空间 id 生成与校验（允许中文，排除 Windows 保留名与路径分隔符） |
| `server/spaceStore.mjs` | 空间注册表 + `SpacePaths` 工厂 + 请求空间解析链；default 空间直接复用数据根 |
| `server/apiV1Receive.mjs` | 联调接收端 `/v1/receive`（POST 收「发送模型」转发来的内容并回解析摘要、GET 回看、DELETE 清空）；内存留最近 5 次、不落盘、不鉴权 |
| `server/sendModel.mjs` | `/v1/schemes/model/send` 适配层：按 modelId（模型 idx，兼容 schemePath+name）定位已保存模型，按所选格式生成 E/JSON/SVG/CIM，以 multipart/form-data 转发到调用方给定 URL |
| `server/schemeArchive.mjs` | 方案 ZIP 构建（`buildSchemeArchiveBuffer` / `listModelJsonFiles`）：枚举方案目录下模型 `.json`，派生格式**不落盘**、打包时经注入的 `renderArtifacts` 逐模型实时生成 `.e` / `.svg`（复用 `svgExport.mjs` + `eFileExport.mjs` 同一装配）；只做「目录 → ZIP 字节」，不 import 渲染适配层，保持可单测 |
| `server/v1Response.mjs` | v1 信封工具：sendV1Json / sendV1JsonNoStore / 错误码→HTTP 状态映射 |
| `server/schemePath.mjs` | schemePath 编解码工具（`encodeURIComponent(JSON.stringify([...]))`） |
| `server/image-server.test.mjs` / `routes.test.mjs` | 服务路由测试 |
| `server/apiInternal.test.mjs` | 内部 `/api/*` 读写层 CRUD + 错误码集成测试 |
| `server/apiV1*.test.mjs` / `*.handlers.test.mjs` | v1 各域 handler 测试 |
| `server/runtimeRegistry.test.mjs` / `runtimeWs.test.mjs` | 运行时态注册表与 WS 桥接测试 |
| `server/swigger.examples.test.mjs` | 遍历 `SWIGGER_ENDPOINTS` 对全部示例自动化验证 |
| `server/v1Response.test.mjs` | 信封工具测试 |

**SVG 配色与 E 模板细节**（原 `server/AGENTS.md` Key Files 行）：`svgExport.mjs` 的 `buildEffectiveLibraryTemplates` 装配库模板（含 `deviceDefinitionOverrides`），配色读 `settings/color-config.json`，被引用图片经 manifest 内联为 data URL；XML 声明与 `encoding=gbk|utf-8` 由 handler（`apiV1Schemes.mjs`）输出，保证响应体与前端落盘文件逐字节一致。方案 ZIP 复用同一装配（`renderSavedModelSvg`，colorMode=voltage）。`eFileExport.mjs` 的 GET 走预定义模板、POST 走自定义模板文本，用 `src/export/e-file.ts` 的 `buildEFileExportOptionsFromLibrary` / `applyPredefinedEDeviceTemplateToLibraryState` 装配选项、`src/model-eexport.ts` 的 `buildEFileExport` 生成，默认 GBK；方案 ZIP 复用同一装配（`buildEFileForSavedModel`）。`domShim.mjs` 顶层把 `NODE_ENV` 兜底为 `production`（否则 Node 进程加载 react.development.js，SVG 渲染慢约 45%；产物字节已比对一致，`??=` 不覆盖 vitest 的 `test`）。

## src（前端）

前端源码根目录。React 19 + TypeScript。核心模型、状态管理、画布交互、运行时态桥接（WS 客户端 + 截图/SVG/快照序列化）。`App.tsx` 装配 `__appScope` 并把大型工厂/视图模块抽到 `appExtracted/`。

### 前端规则

- **`__appScope` 陷阱**：App.tsx 每帧重建 `__appScope`，空依赖 `useEffect` 闭包会冻结在首次渲染。需读最新状态时用 `__appScopeRef.current`（见 App.tsx WS useEffect）。
- 修改 `model.ts` 前先跑 `gitnexus_impact`（影响面广）。
- 测试与源文件同目录，命名 `*.test.ts(x)`。
- **空间隔离（多工作空间）前后端均已落地**：后端按 `X-Space` / `?space=` / `Cookie: gmp_space` 解析空间并隔离数据（详见本文件「分域规则 · server」与 `docs/superpowers/specs/2026-09-13-multi-workspace-design.md`）；前端已空间感知 —— `src/spaceClient.ts`（Cookie + `/webgrp/spaces` 封装 + ZIP 导入导出）、`src/spaceCache.ts`（浏览器侧空间缓存单源清单 + 清理 + 启动闸门）、`src/spaceSwitch.ts`（切换时序与 beforeunload 跳过）、顶栏空间选择器与导出/导入/改名/删除四按钮（均作用于当前空间；改名不重载，删除确认后切到剩余空间）、底部状态栏的「空间ID」格（点击复制 id，名字放悬浮提示 —— 目录名是 id 而改名不改目录，两者会分叉）。**空间标识只用 Cookie**（前端不设 `X-Space` 头、请求不带 `?space=`）；`current` 取后端解析链的结果，前端不读 Cookie 自算。
- 新增 runtime resource 需改：`runtimeSnapshot.ts`（扩 `RuntimeSnapshotResource` 联合类型 + `createRuntimeSnapshotHandler` 的分派 case）+ server `apiV1Runtime.mjs`（handler + 路由）+ swagger 四处同步。**不需要**改 `runtimeWsClient.ts`（fetch 通道对 resource 是透传的）、也不需要改 `App.tsx`（除 `runtime.screenshot` 外的 resource 都走默认分派）。

### 前端常见模式

- `__appScope` 装配：`const [x, setX] = useState(...); Object.assign(__appScope, { x, setX });`
- 截图/SVG 输出统一用 `buildSvgDocument`（自包含、内联样式），避免实时 DOM class 样式丢失；细节见本节「src/appExtracted」。
- **保存方案进入应用前的边界归一 = `normalizeSavedProjectIndexes`**（`appCoreCanvasUtilities.tsx`）：它把后端 `GET /schemes` 的 payload、浏览器缓存恢复出来的记录、图元库导入包里的 `schemes` 一律整成「渲染层可无条件解引用」的形状——滤掉非对象节点/边，`kind` 归字符串、`params` 归对象、`terminals` 归数组。**这条规则与后端 `normalizeProjectForStorage` 必须一致**（两侧各有一份实现，见本节「server」的「模型存储边界」）：同一个畸形文件在两边都要能过，否则就成了「后端能存、前端就炸」。守卫见 `savedSchemeNormalize.test.ts` 与 `projectNormalizeSeam.test.ts`（后者还验了归一化结果能再过 `normalizeProjectForBackend` 这道接缝）。
  ⚠️ 别指望 `baseDeviceKind` 兜底：它对非字符串 `kind` 是**故意抛 TypeError** 的（`globalLinesKeys.test.ts` 记录了理由——静默兜成空串会掩盖「取不到线路」这个真问题）。形状必须在进它之前补齐。

### 前端测试

- `pnpm vitest run` 全量；单文件 `pnpm vitest run src/<file>.test.ts`
- `pnpm tsc --noEmit` 类型检查
- 运行时态相关改动跑 `runtimeSnapshot.test.ts` / `runtimeScreenshot.test.ts` / `runtimeWsClient.test.ts`

### 前端补充模块（根「关键文件」表未列）

| 文件 | 职责 |
|------|------|
| `src/main.tsx` | React 入口点 |
| `src/selectionActions.ts` | 选择态操作（与 `graphStore.ts` / `routeStore.ts` 同族） |
| `src/keyboardShortcuts.ts` / `src/sidePanelVisibility.ts` | 键盘快捷键 / 侧栏显隐 |
| `src/runtimeScreenshot.ts` | 画布截图：`buildSvgDocument` → `rasterizeSvgString` → PNG base64 |
| `src/svgExportUtils.ts` / `src/svgUtils.ts` | SVG 导出与工具（`svgUtils.ts` 闭包内间接 import `react`，可被 Node 直载） |
| `src/fileIO.ts` / `src/formatUtils.ts` / `src/transformUtils.ts` / `src/nodeLabelUtils.ts` | 文件 IO、格式化、变换、标签工具 |
| `src/vite-env.d.ts` | Vite 类型声明 |

> `src/export/` 被 `server/*.mjs`（`eFileExport.mjs` / `svgExport.mjs`）以 Node 原生方式直载；`cimExport.mjs` 直载 `src/cim/`，`eFileExport.mjs` 另直载 `src/model-eexport.ts`、`src/encoding/gbk.ts`。被直载模块必须保持 `.ts`，不得是 `.tsx`、不得含 JSX/React 组件；相对 import 需带 `.ts` 扩展名。

## src/appExtracted

从 `App.tsx` 抽取的大型工厂/视图模块。App.tsx 历史上是超大单文件，按职责拆分到此目录：画布区域、交互工厂、设备定义、量测、持久化导出、项目画布、选择拖拽、工具栏 Hook、整体视图。模块间通过 `__appScope` 共享状态。

### 目录内文件

| 文件 | 职责 |
|------|------|
| `appView.tsx` | `renderAppView(__appScope)`：渲染 topbar/画布/面板/弹窗整体视图；含 RT-WS 指示灯组件 |
| `appCanvasArea.tsx` | 画布区域渲染（SVG `<rect data-canvas-background>` 背景层、网格、节点、边、resize handles） |
| `appCanvasInteractionFactories.tsx` | 画布交互工厂（指针/拖拽/连接预览） |
| `appCanvasViewportCalculations.ts` | 视口计算工厂（浮动工具栏/小地图坐标映射） |
| `appControlFactories.tsx` | 控制台写操作程序化方法（9 工厂：add/select/group/delete/update/save/scheme/model/template），经 WS 指令调用，绕过 UI 对话框 |
| `appCoreCanvasUtilities.tsx` | 画布核心工具（坐标变换、命中检测、`DEFAULT_CANVAS_BACKGROUND` 等常量） |
| `appDeviceDefinitionFactories.tsx` | 设备定义工厂（含 `buildSvgDocument` 导出 SVG 调用） |
| `appGraphMeasurementFactories.tsx` | 图形量测工厂 |
| `appInlineUtilityFunctions.ts` | 内联工具函数（纯函数：点比较、文件名安全化、方案序列化等） |
| `appPersistenceLibraryExport.tsx` | 持久化与导出：`buildSvgDocument`（自包含 SVG，内联样式）、E 文件导出 |
| `appProjectCanvasFactories.tsx` | 项目画布工厂（保存/删除/重命名/导入导出） |
| `appRenderPanels.tsx` | 面板渲染工厂（图层管理/项目面板/图元树/模板按钮/浮动面板） |
| `appSelectionDragFactories.tsx` | 选择与拖拽工厂（含 `canvasBackgroundColor` 持久化） |
| `appToolbarHookFactories.tsx` | 工具栏 Hook 工厂（背景页渲染、对齐、图层） |

### appExtracted 规则

- 所有模块签名模式：`export function renderXxx(__appScope: Record<string, any>) { ... }`，从 `__appScope` 解构取值。
- 文件带 `// @ts-nocheck`（自动生成属性），改时注意类型不校验。
- `buildSvgDocument`（`appPersistenceLibraryExport.tsx`）是 SVG / SVG 截图的唯一自包含输出源，改它影响 `/webgrp/v1/runtime/svg`、`/webgrp/v1/runtime/screenshot`、导出按钮三处。
- 画布背景层 `<rect data-canvas-background>` 标记用于截图/序列化时移除背景。
- 从 `__appScope` 解构：`const { activeProjectKey, nodes, edges, ... } = __appScope;`；`Object.assign(__appScope, { ... })` 回写派生状态。
- 对应测试在 `src/` 根：`appDeviceDefinitionFactories.test.ts`、`appGraphMeasurementFactories.test.ts`、`appInspector.functional.test.ts`、`appPersistenceLibraryExport.test.ts`、`appSelectionDragFactories.test.ts`、`backgroundPageRender.test.ts`、`canvasLod.test.ts`

## src/components

可复用 React 组件。受控输入组件（带缓冲/防抖）与静态按钮组件，供画布属性表、设备定义等使用。

- `InputComponents.tsx`：`BufferedTextInput` / `BufferedTextarea` / `DeferredColorInput` 等受控输入（缓冲提交、颜色选择）。组件接收 `value` + `onCommit`（**而非 `onChange`**），内部缓冲到失焦/回车才提交。
- `StaticButtonComponents.tsx`：`StaticButton` 静态按钮组件（带视觉反馈）。
- 新增可复用输入组件放此目录，保持「受控 + 缓冲」模式。
- 无独立测试；通过使用方（`appView` 等）间接覆盖。**本项目没有 jsdom / react-test-renderer**，写这类组件的测试只能走真实 DOM 路径（见 `VoltageLevelDialog.test.tsx` / `EFileEditor.test.tsx` 的写法）。

## src/hooks

自定义 React Hook。`useBatchEditors` 封装批量属性编辑器，`useGlobalLines` 封装全局线路的放置/删除流程。

- `useBatchEditors.tsx`：批量编辑器 Hook（参数表行、枚举值编辑、中英文表头渲染）；有独立测试 `useBatchEditors.test.tsx`。
- `useGlobalLines.tsx`：全局线路 Hook（放置对话框状态、跨模型线路增删与同步）；依赖大 scope 与 `fetch`，补单测成本高，目前靠使用方间接覆盖、无独立测试。
- Hook 返回状态 + 操作函数，供设备定义/量测面板消费；新增 Hook 放此目录，保持纯函数风格（无副作用耦合）。

## scripts

一次性分析/修复脚本（`.cjs` / `.js` / `.mjs`），用于代码库体检、DOM 分析、CSS 精简、`__appScope` 解构检查、未定义名审计等。**非运行时依赖，不进打包**；多数为历史上 `App.tsx` 拆分、scope 解构陷阱排查时留下的工具。

- 脚本为 CommonJS（`.cjs`）或 ESM（`.js` / `.mjs`），独立运行、互不依赖；手动跑 `node scripts/<name>.cjs`。
- 多数脚本产出 JSON 报告到本目录（`appscope-destructure-report.json`、`scope-destructure-issues.json`、`verified-appscope-report.json`）供人工审查。
- 修改 `App.tsx` 拆分后可跑 `node scripts/analyze-scope-destructure.cjs` 验证 `__appScope` 解构完整性；同类工具：`analyze-dom.cjs` / `analyze-dom-deep.cjs`（DOM 结构）、`analyze-factory-destructure.cjs`、`analyze-empty.cjs` / `analyze-svg.cjs`、`generate-appscope-report.cjs`、`fix-appscope-mounts.js`、`slim-css-crush.cjs` / `slim-snapshot.cjs`。
- 无测试；未定义名审计走 `pnpm audit:names`（`audit-undefined-names.mjs`：内存剥离 `@ts-nocheck` / `@ts-ignore` / `@ts-expect-error` 后查未定义引用，有命中 exit 1）。

## docs

项目文档：第三方 `/webgrp/v1` API 的设计、需求、工作流文档，以及 superpowers 计划/规格。

| 文件 | 职责 |
|------|------|
| `ARCHITECTURE.md` | **功能清单 / 代码映射 / 架构风格索引**。查「有没有这个功能」「某符号在哪」时读这里，按需查阅，不必通读 |
| `MCP.md` | MCP 服务（`/webgrp/mcp`）：连接方式、29 个 `gmp_*` 工具速查、错误码、限制 |
| `mcp-evaluation.xml` | MCP 服务评测（10 题只读问答） |
| `superpowers/` | superpowers 计划与规格（`plans/`、`specs/`），**历史记录**：写就即冻结，不回改 |

- 文档为 Markdown，描述 `/webgrp/v1` 只读 API 的设计意图与约束；改 v1 API 行为后同步更新对应文档。
- `superpowers/` 下的计划/规格是**历史记录**，其中引用的旧路径（如已删除的目录文档）不回改。

## public

Vite 静态资源根。站点 `favicon.svg` 等直接由 Vite 托管的公共资源放在这里。

- **这里不再放 `icon-library/`**：图标库已迁移到 `data/icon-library/`，新增图标放到 `data/icon-library/` 对应场景目录。
- 图元库引用路径仍相对 `/icon-library/`，由后端静态路由映射到 `data/icon-library/`。

<!-- gitnexus:start -->
# GitNexus — Code Intelligence

This project is indexed by GitNexus as **graph_modeling_platform** (37770 symbols, 104486 relationships, 873 execution flows).

> Index stale? Run `node .gitnexus/run.cjs analyze --index-only` from the project root — it auto-selects an available runner. No `.gitnexus/run.cjs` yet? Bootstrap with `npx`, `bunx`, or `pnpm dlx` — e.g. `bunx gitnexus@latest analyze` (npm 11 npx crash; #1939).

## Always Do

- **MUST run impact before editing.** Use `impact({target: "symbolName", direction: "upstream"})` or `node .gitnexus/run.cjs impact "symbolName" --direction upstream --repo .`; report callers, processes, and risk. Never substitute grep for graph analysis.
- **MUST analyze graph changes before committing.** Use `detect_changes({scope: "all"})` (MCP) or `node .gitnexus/run.cjs detect-changes --scope all --repo .` (CLI fallback). `partial: true` or `truncated: true` is not a clean check — a zero means unseen, not unaffected; re-run it. For regression review: `detect_changes({scope: "compare", base_ref: "main"})` or `node .gitnexus/run.cjs detect-changes --scope compare --base-ref "main" --repo .`.
- MUST warn on HIGH/CRITICAL `risk` pre-edit; never use `riskSharedAxes` to waive a HIGH/CRITICAL `risk` warning. Compare File/symbol: MCP File omits axes; Graph-RAG expands File.
- **MUST treat `risk: UNKNOWN` as unresolved, not as low.** An empty caller set is not evidence the symbol is unused — it can also mean the callers are not resolvable by the index (plain-object property access, dynamic dispatch, cross-language calls). `impact` pairs `UNKNOWN` with a `riskNote` saying so. Confirm with a text search before treating the symbol as safe to change or delete; do not proceed on the strength of a zero.
- **MUST use `query({search_query: "concept"})` for concepts/flows, `context({name: "symbolName"})` for a named symbol, or `impact` for blast radius, on read-only callers, dependencies, imports, or execution flow.** Graph first; text search only for empty/`UNKNOWN`/literals.
- For security review, `explain({target: "fileOrSymbol"})` lists taint findings (source→sink flows; needs `analyze --pdg`).

## Never Do

- NEVER edit a function, class, or method before MCP/CLI impact analysis.
- NEVER ignore HIGH or CRITICAL risk warnings from impact analysis, and never read `UNKNOWN` as an all-clear — it means the walk could not answer, which is the one verdict that requires confirming by other means.
- NEVER rename symbols with find-and-replace — use `rename` which understands the call graph.
- NEVER commit before MCP/CLI graph change analysis.

## Resources

| Resource | Use for |
| --- | --- |
| `gitnexus://repo/graph_modeling_platform/context` | Codebase overview, check index freshness |
| `gitnexus://repo/graph_modeling_platform/clusters` | All functional areas |
| `gitnexus://repo/graph_modeling_platform/processes` | All execution flows |
| `gitnexus://repo/graph_modeling_platform/process/{name}` | Step-by-step execution trace |

## CLI

| Task | Read this skill file |
| --- | --- |
| Understand architecture / "How does X work?" | `.claude/skills/gitnexus-exploring/SKILL.md` |
| Blast radius / "What breaks if I change X?" | `.claude/skills/gitnexus-impact-analysis/SKILL.md` |
| Trace bugs / "Why is X failing?" | `.claude/skills/gitnexus-debugging/SKILL.md` |
| Rename / extract / split / refactor | `.claude/skills/gitnexus-refactoring/SKILL.md` |
| Tools, resources, schema reference | `.claude/skills/gitnexus-guide/SKILL.md` |
| Index, status, clean, wiki CLI commands | `.claude/skills/gitnexus-cli/SKILL.md` |

<!-- gitnexus:end -->
