# 电力能源系统图上建模平台

<!-- Generated: 2026-05-26 | Updated: 2026-06-22 -->

## 概述

React 19 + Vite 7 + TypeScript 的前端图形建模平台，支持电力/氢能/热力系统的拓扑建模和 E 格式导出。后端 Node.js（.mjs ESM）提供图像/方案/配置数据服务，并经 WebSocket 桥接前端运行时态供第三方 `/api/v1` 只读 API 消费。

## 目录结构

```
graph_modeling_platform/
├── src/                # 前端源码（见 src/AGENTS.md）
│   ├── appExtracted/   # 从 App.tsx 抽取的大型工厂/视图模块
│   ├── components/     # 受控输入/静态按钮组件
│   ├── hooks/          # 自定义 Hook
│   └── *.ts/tsx        # 核心模型、状态、工具、运行时态桥接
├── server/             # 后端服务（见 server/AGENTS.md）
├── e2e/                # Playwright 端到端测试（真实浏览器 + WS 指令通道）
├── scripts/            # 一次性分析/修复脚本（非运行时依赖）
├── public/             # Vite 静态资源
├── docs/               # 第三方 API 设计/需求/工作流文档
├── data/               # 运行时数据；icon-library 图标库在此版本跟踪
└── index.html          # 前端入口
```

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
| 测试文件 | `src/*.test.ts` / `server/*.test.mjs` | Vitest（与源文件同目录） |

## 代码映射

| 符号 | 类型 | 位置 | 职责 |
|------|------|------|------|
| App | 组件 | src/App.tsx | 主应用组件，装配 __appScope |
| renderAppView | 函数 | src/appExtracted/appView.tsx | 渲染整体视图 |
| DeviceKind | 类型 | src/model.ts | 设备类型枚举 |
| createImageServer | 函数 | server/server.mjs | 后端服务创建（含 WS 挂载） |
| attachRuntimeWebSocket | 函数 | server/runtimeWs.mjs | /ws 升级 + 客户端注册表 |
| createRuntimeWsClient | 函数 | src/runtimeWsClient.ts | 前端 WS 客户端 |
| buildSvgDocument | 函数 | src/appExtracted/appPersistenceLibraryExport.tsx | 自包含 SVG 导出 |
| createProgrammaticAddDevice | 函数 | src/appExtracted/appControlFactories.tsx | 控制台写操作工厂（9 方法） |
| renderSwaggerHtml | 函数 | server/swaggerPage.mjs | /swigger 页面 HTML |

## 约定

| 项目 | 约定 |
|------|------|
| 测试位置 | 与源文件同目录：`*.test.ts` / `*.test.tsx` / `*.test.mjs` |
| 类型定义 | 集中在 `model.ts`，非分散 |
| 配置管理 | Vite 配置在 `vite.config.ts`（含测试配置 + /api、/ws 代理） |
| 模块系统 | ES Modules（`"type": "module"`），后端统一 `.mjs` |
| 数据隔离 | 测试用 `GRAPH_MODEL_DATA_DIR` env 指向 tmpdir |
| v1 响应信封 | `{ok:true,data}` / `{ok:false,error:{code,message}}` |

## 独特风格

| 风格 | 说明 |
|------|------|
| __appScope 装配 | App.tsx 每帧重建 `__appScope` 对象并 `Object.assign` 当前状态；空依赖 useEffect 需经 `__appScopeRef` 读最新引用 |
| 双服务器架构 | 开发时同时运行 Vite (5173) + Image Server (5174)；前端 WS dev 期直连 5174 |
| 运行时态桥接 | 第三方 `/api/v1/runtime/*` 经 WS 向前端 fetch 运行时态（model/devices/selection/screenshot/svg/e-file） |
| WS 双向指令通道 | 第三方 `/api/v1/control/*` 写操作经 WS 下发 command 到前端 `__appScope` 程序化方法，前端回 command-response |
| E 格式导出 | 支持电力系统 E 格式数据导出 |
| /swigger 自包含 | 接口文档页内嵌元数据 + highlight.js + 可折叠 JSON 树，无外部 JS 依赖（除 CDN） |

## 命令

```bash
# 开发（前端 + 后端）
pnpm dev

# 构建
pnpm build

# 测试（单元 + 集成）
pnpm vitest run

# E2E 测试（Playwright，需浏览器）
pnpm test:e2e

# 类型检查
pnpm tsc --noEmit

# 预览构建
pnpm preview
```

## 注意事项

| 事项 | 说明 |
|------|------|
| 端口冲突 | 默认前端 5173，后端 5174，确保端口可用 |
| 数据目录 | `data/` 主要为运行时数据并默认忽略；`data/icon-library/` 是版本跟踪的图标库 |
| 代理配置 | Vite 代理 `/api`、`/ws` 到后端服务 |
| 环境变量 | `IMAGE_SERVER_PORT` 可自定义后端端口；`GRAPH_MODEL_DATA_DIR` 覆盖数据根目录 |
| WS 指示灯 | 前端右上角 RT-WS 指示灯显示运行时态 WS 状态，点击复制 clientId |



<!-- gitnexus:start -->
# GitNexus — Code Intelligence

This project is indexed by GitNexus as **graph_modeling_platform** (19611 symbols, 29773 relationships, 300 execution flows). Use the GitNexus MCP tools to understand code, assess impact, and navigate safely.

> Index stale? Run `node .gitnexus/run.cjs analyze` from the project root — it auto-selects an available runner. No `.gitnexus/run.cjs` yet? `npx gitnexus analyze` (npm 11 crash → `npm i -g gitnexus`; #1939).

## Always Do

- **MUST run impact analysis before editing any symbol.** Before modifying a function, class, or method, run `impact({target: "symbolName", direction: "upstream"})` and report the blast radius (direct callers, affected processes, risk level) to the user.
- **MUST run `detect_changes()` before committing** to verify your changes only affect expected symbols and execution flows. For regression review, compare against the default branch: `detect_changes({scope: "compare", base_ref: "main"})`.
- **MUST warn the user** if impact analysis returns HIGH or CRITICAL risk before proceeding with edits.
- When exploring unfamiliar code, use `query({search_query: "concept"})` to find execution flows instead of grepping. It returns process-grouped results ranked by relevance.
- When you need full context on a specific symbol — callers, callees, which execution flows it participates in — use `context({name: "symbolName"})`.
- For security review, `explain({target: "fileOrSymbol"})` lists taint findings (source→sink flows; needs `analyze --pdg`).

## Never Do

- NEVER edit a function, class, or method without first running `impact` on it.
- NEVER ignore HIGH or CRITICAL risk warnings from impact analysis.
- NEVER rename symbols with find-and-replace — use `rename` which understands the call graph.
- NEVER commit changes without running `detect_changes()` to check affected scope.

## Resources

| Resource | Use for |
|----------|---------|
| `gitnexus://repo/graph_modeling_platform/context` | Codebase overview, check index freshness |
| `gitnexus://repo/graph_modeling_platform/clusters` | All functional areas |
| `gitnexus://repo/graph_modeling_platform/processes` | All execution flows |
| `gitnexus://repo/graph_modeling_platform/process/{name}` | Step-by-step execution trace |

## CLI

| Task | Read this skill file |
|------|---------------------|
| Understand architecture / "How does X work?" | `.claude/skills/gitnexus/gitnexus-exploring/SKILL.md` |
| Blast radius / "What breaks if I change X?" | `.claude/skills/gitnexus/gitnexus-impact-analysis/SKILL.md` |
| Trace bugs / "Why is X failing?" | `.claude/skills/gitnexus/gitnexus-debugging/SKILL.md` |
| Rename / extract / split / refactor | `.claude/skills/gitnexus/gitnexus-refactoring/SKILL.md` |
| Tools, resources, schema reference | `.claude/skills/gitnexus/gitnexus-guide/SKILL.md` |
| Index, status, clean, wiki CLI commands | `.claude/skills/gitnexus/gitnexus-cli/SKILL.md` |

<!-- gitnexus:end -->
