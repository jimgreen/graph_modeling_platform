<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-05-26 | Updated: 2026-06-22 -->

# src

## Purpose

前端源码根目录。React 19 + TypeScript。核心模型、状态管理、画布交互、运行时态桥接（WS 客户端 + 截图/SVG/快照序列化）。App.tsx 装配 `__appScope` 并把大型工厂/视图模块抽到 `appExtracted/`。

## Key Files

| File | Description |
|------|-------------|
| `App.tsx` | 主应用组件，每帧重建 `__appScope` 并 `Object.assign` 状态；挂 WS 客户端、运行时态 handler、RT-WS 指示灯 |
| `main.tsx` | React 入口点 |
| `model.ts` | 核心类型定义（DeviceKind、拓扑结构、E 格式导出） |
| `graphStore.ts` / `routeStore.ts` / `selectionActions.ts` | 图形/路由/选择状态与操作 |
| `keyboardShortcuts.ts` / `sidePanelVisibility.ts` | 键盘快捷键 / 侧栏显隐 |
| `runtimeWsClient.ts` | 前端 WS 客户端：注册 clientId、ping 心跳、响应 server fetch；dev 直连 5174 |
| `runtimeSnapshot.ts` | 运行时态序列化（model/devices/selection/tab/snapshot/svg），供 WS fetchHandler |
| `runtimeScreenshot.ts` | 画布截图：buildSvgDocument → rasterizeSvgString → PNG base64 |
| `svgExportUtils.ts` / `svgUtils.ts` | SVG 导出与工具 |
| `fileIO.ts` / `formatUtils.ts` / `transformUtils.ts` / `nodeLabelUtils.ts` | 文件 IO、格式化、变换、标签工具 |
| `styles.css` | 全局样式（含 .diagram-canvas、.canvas-boundary 等） |
| `vite-env.d.ts` | Vite 类型声明 |

## Subdirectories

| Directory | Purpose |
|-----------|---------|
| `appExtracted/` | 从 App.tsx 抽取的大型工厂/视图模块（见 `appExtracted/AGENTS.md`） |
| `components/` | 受控输入、静态按钮等可复用组件（见 `components/AGENTS.md`） |
| `hooks/` | 自定义 Hook（见 `hooks/AGENTS.md`） |

## For AI Agents

### Working In This Directory

- **`__appScope` 陷阱**：App.tsx 每帧重建 `__appScope`，空依赖 `useEffect` 闭包会冻结在首次渲染。需读最新状态时用 `__appScopeRef.current`（见 App.tsx WS useEffect）。
- 修改 `model.ts` 前先跑 `gitnexus_impact`（影响面广）。
- 测试与源文件同目录，命名 `*.test.ts(x)`。
- 新增 runtime resource 需同时改 `runtimeSnapshot.ts`（序列化）+ `runtimeWsClient.ts`（路由）+ server `apiV1Runtime.mjs`（端点）。

### Testing Requirements

- `pnpm vitest run` 全量；单文件 `pnpm vitest run src/<file>.test.ts`
- `pnpm tsc --noEmit` 类型检查
- 运行时态相关改动跑 `runtimeSnapshot.test.ts` / `runtimeScreenshot.test.ts` / `runtimeWsClient.test.ts`

### Common Patterns

- `__appScope` 装配：`const [x, setX] = useState(...); Object.assign(__appScope, { x, setX });`
- v1 信封：`{ok:true,data}` / `{ok:false,error:{code,message}}`
- 截图/SVG 输出统一用 `buildSvgDocument`（自包含、内联样式），避免实时 DOM class 样式丢失

## Dependencies

### Internal

- `appExtracted/` — 视图与工厂模块
- `components/`、`hooks/` — 复用组件与 Hook

### External

- `react` / `react-dom` 19.x — UI 框架
- `vite` 7.x — 构建/开发服务器
- `vitest` — 测试框架

<!-- MANUAL: -->
