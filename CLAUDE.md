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
| 后端 API | `server/image-server.mjs` | 图片/方案/配置 REST + /swigger |
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
| createImageServer | 函数 | server/image-server.mjs | 后端服务创建（含 WS 挂载） |
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

This project is indexed by GitNexus as **graph_modeling_platform** (3140 symbols, 10590 relationships, 269 execution flows). Use the GitNexus MCP tools to understand code, assess impact, and navigate safely.

> If any GitNexus tool warns the index is stale, run `npx gitnexus analyze` in terminal first.

## Always Do

- **MUST run impact analysis before editing any symbol.** Before modifying a function, class, or method, run `gitnexus_impact({target: "symbolName", direction: "upstream"})` and report the blast radius (direct callers, affected processes, risk level) to the user.
- **MUST run `gitnexus_detect_changes()` before committing** to verify your changes only affect expected symbols and execution flows.
- **MUST warn the user** if impact analysis returns HIGH or CRITICAL risk before proceeding with edits.
- When exploring unfamiliar code, use `gitnexus_query({query: "concept"})` to find execution flows instead of grepping. It returns process-grouped results ranked by relevance.
- When you need full context on a specific symbol — callers, callees, which execution flows it participates in — use `gitnexus_context({name: "symbolName"})`.

## When Debugging

1. `gitnexus_query({query: "<error or symptom>"})` — find execution flows related to the issue
2. `gitnexus_context({name: "<suspect function>"})` — see all callers, callees, and process participation
3. `READ gitnexus://repo/graph_modeling_platform/process/{processName}` — trace the full execution flow step by step
4. For regressions: `gitnexus_detect_changes({scope: "compare", base_ref: "main"})` — see what your branch changed

## When Refactoring

- **Renaming**: MUST use `gitnexus_rename({symbol_name: "old", new_name: "new", dry_run: true})` first. Review the preview — graph edits are safe, text_search edits need manual review. Then run with `dry_run: false`.
- **Extracting/Splitting**: MUST run `gitnexus_context({name: "target"})` to see all incoming/outgoing refs, then `gitnexus_impact({target: "target", direction: "upstream"})` to find all external callers before moving code.
- After any refactor: run `gitnexus_detect_changes({scope: "all"})` to verify only expected files changed.

## Never Do

- NEVER edit a function, class, or method without first running `gitnexus_impact` on it.
- NEVER ignore HIGH or CRITICAL risk warnings from impact analysis.
- NEVER rename symbols with find-and-replace — use `gitnexus_rename` which understands the call graph.
- NEVER commit changes without running `gitnexus_detect_changes()` to check affected scope.

## Tools Quick Reference

| Tool | When to use | Command |
|------|-------------|---------|
| `query` | Find code by concept | `gitnexus_query({query: "auth validation"})` |
| `context` | 360-degree view of one symbol | `gitnexus_context({name: "validateUser"})` |
| `impact` | Blast radius before editing | `gitnexus_impact({target: "X", direction: "upstream"})` |
| `detect_changes` | Pre-commit scope check | `gitnexus_detect_changes({scope: "staged"})` |
| `rename` | Safe multi-file rename | `gitnexus_rename({symbol_name: "old", new_name: "new", dry_run: true})` |
| `cypher` | Custom graph queries | `gitnexus_cypher({query: "MATCH ..."})` |

## Impact Risk Levels

| Depth | Meaning | Action |
|-------|---------|--------|
| d=1 | WILL BREAK — direct callers/importers | MUST update these |
| d=2 | LIKELY AFFECTED — indirect deps | Should test |
| d=3 | MAY NEED TESTING — transitive | Test if critical path |

## Resources

| Resource | Use for |
|----------|---------|
| `gitnexus://repo/graph_modeling_platform/context` | Codebase overview, check index freshness |
| `gitnexus://repo/graph_modeling_platform/clusters` | All functional areas |
| `gitnexus://repo/graph_modeling_platform/processes` | All execution flows |
| `gitnexus://repo/graph_modeling_platform/process/{name}` | Step-by-step execution trace |

## Self-Check Before Finishing

Before completing any code modification task, verify:
1. `gitnexus_impact` was run for all modified symbols
2. No HIGH/CRITICAL risk warnings were ignored
3. `gitnexus_detect_changes()` confirms changes match expected scope
4. All d=1 (WILL BREAK) dependents were updated

## Keeping the Index Fresh

After committing code changes, the GitNexus index becomes stale. Re-run analyze to update it:

```bash
npx gitnexus analyze
```

If the index previously included embeddings, preserve them by adding `--embeddings`:

```bash
npx gitnexus analyze --embeddings
```

To check whether embeddings exist, inspect `.gitnexus/meta.json` — the `stats.embeddings` field shows the count (0 means no embeddings). **Running analyze without `--embeddings` will delete any previously generated embeddings.**

> Claude Code users: A PostToolUse hook handles this automatically after `git commit` and `git merge`.

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
