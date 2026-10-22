# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# 电力能源系统图上建模平台

<!-- Generated: 2026-05-26 | Updated: 2026-10-23（功能清单、代码映射、架构风格移交 docs/ARCHITECTURE.md；删除重复的 gitnexus 块） -->

## 概述

React 19 + Vite 7 + TypeScript 的前端图形建模平台，支持电力/氢能/热力系统的拓扑建模和 E 格式导出。后端 Node.js（.mjs ESM）提供图像/方案/配置数据服务，并经 WebSocket 桥接前端运行时态供第三方 `/api/v1` 只读 API 消费。

**执行型规则在 `AGENTS.md`**（改动分档、检索纪律、视觉问题处理、数据操作）。本文件是目录/命令/约定速查。
**功能清单、符号映射、架构风格在 `docs/ARCHITECTURE.md`** —— 查"有没有这个功能""这个符号在哪"时读那里，不要通读本文件。

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
| `src/` | 前端 React 19 + TypeScript 源码 | 见 `src/AGENTS.md` |
| `src/appExtracted/` | 从 `App.tsx` 抽取的大型工厂/视图模块 | 模块间经 `__appScope` 共享状态 |
| `src/components/` | 受控输入/静态按钮等可复用组件 | 缓冲提交模式 |
| `src/hooks/` | 自定义 React Hook | `useBatchEditors`（批量属性编辑）、`useGlobalLines`（全局线路放置） |
| `src/encoding/` | 编码/解码工具（GBK、E 文件格式） | |
| `src/model/` | 模型相关子模块 | |
| `src/lib/` | 通用工具库 | |
| `server/` | 后端 Node.js ESM (`.mjs`) 服务 | 见 `server/AGENTS.md` |
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
| `src/runtimeWsClient.ts` | 前端 WS 客户端：注册 clientId、ping 心跳、响应 server fetch + command |
| `src/runtimeSnapshot.ts` | 运行时态序列化（model/devices/selection/tab/snapshot/svg） |
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

## 注意事项

| 事项 | 说明 |
|------|------|
| 端口冲突 | 默认前端 5173，后端 5174，确保端口可用 |
| 数据目录 | `data/` **整目录忽略、无版本跟踪文件**。图标库在 `public/icon-library/`（跟踪），不在 `data/icon-library/`。任何读 `data/` 样本的测试都要加 `existsSync` 守卫，否则干净检出会 ENOENT 假红 |
| 代理配置 | Vite 代理 `/api`、`/ws` 到后端服务 |
| 环境变量 | `IMAGE_SERVER_PORT` 可自定义后端端口；`GRAPH_MODEL_DATA_DIR` 覆盖数据根目录 |
| WS 指示灯 | 前端右上角 RT-WS 指示灯显示运行时态 WS 状态，点击复制 clientId |
| Node 原生 TS | `server/*.mjs` 可直接 `import` `src` 下 TS 模块（如 `src/export/`、`src/cim/`、`src/model-eexport.ts`）；相对 import 必须带 `.ts` 扩展名（`allowImportingTsExtensions`），且不得 import `.tsx` |

## GitNexus

代码智能索引（37770 symbols / 104486 relationships / 873 execution flows）的完整规则在 **`AGENTS.md`** 的 gitnexus 块中（原此处重复的一份已删除）。

索引过期：`node .gitnexus/run.cjs analyze --index-only`。impact / detect_changes 的 MUST 适用于 `AGENTS.md` 中定义的中、大档改动。
