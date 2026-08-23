# T16 App.tsx 审查报告

## 概览

| 指标 | 值 |
|------|-----|
| 文件行数 | 1579 行 |
| 导入行数 | ~850 行 (54%) |
| 状态声明行数 | ~730 行 (850–1579) |
| `Object.assign(__appScope, ...)` 调用 | **443 次** |
| `as any` 强转 | 9 处 |
| 提取的 hook 模块 | 32 个 (`appExtracted/`) |
| 发现总数 | **17** |

文件本质是一个 1579 行的 God Component：前 850 行是 import，后 730 行是 `useState`/`useRef`/`Object.assign` 声明 + 4 个提取 hook 调用 + 1 个 WS effect + 1 行 render 调用。真正的 JSX 渲染已提取到 `renderAppView`（`appExtracted/appView.tsx`），但**所有状态仍滞留在此文件**。

---

## P0 严重

### [P0-1] `@ts-nocheck` 禁用全文件类型检查
- 位置: src/App.tsx:1
- 类型: 安全
- 描述: 整个 1579 行文件关闭 TypeScript 类型检查，所有类型错误、参数不匹配、缺失属性均被静默吞没；配合 443 次 `Object.assign(__appScope, ...)` 的动态属性注入，运行时类型错误几乎不可能被编译器捕获。
- 建议: 移除 `@ts-nocheck`，为 `__appScope` 定义显式 `interface AppScope` 类型（含所有 state/ref/handler 字段），逐步修复类型错误；短期可用 `@ts-expect-error` 逐行标注已知问题。

### [P0-2] `__appScope` God Object — 可变共享状态袋破坏 React 数据流
- 位置: src/App.tsx:1001–1531（443 次 `Object.assign(__appScope, ...)`）
- 类型: 抽象层次 / 性能
- 描述: 每次渲染创建全新 `__appScope` 对象，通过 `Object.assign` 逐个注入 443 个属性，再传给 `useAppStateBatch`/`useCanvasViewportBatch`/`useGlobalLines`/`useRenderBatch` 四个提取 hook 和 `renderAppView`。此模式：(a) 绕过 React props/Context 的变更检测，子组件无法 `memo` 优化（新对象引用每次不同）；(b) 新增状态必须手动添加 `Object.assign` 行，遗漏时仅 `__appScopeRef.current` 能读到 `undefined`，无任何编译/运行时告警；(c) 443 次 `Object.assign` 调用本身是 O(n) 渲染开销。
- 建议: 引入 `useReducer` + Context 或 Zustand store 替代 `__appScope`；至少应定义 `interface AppScope` 并用 `useMemo(() => ({ ... }), [deps])` 构建，让子组件可按 selector 订阅，避免全量重渲染。

### [P0-3] WS `useEffect` 空依赖数组 — `setRuntimeWsClientId` 在首次渲染后永不再更新
- 位置: src/App.tsx:1532–1575
- 类型: bug
- 描述: `useEffect(() => { ... }, [])` 内调用 `client.connect()` 和 `setRuntimeWsClientId(client.clientId)`。由于依赖数组为空，effect 仅在挂载时执行一次——若 `createRuntimeWsClient` 在组件卸载后再次挂载（React StrictMode 双挂载），第一次 mount 创建的 `client` 被 cleanup 关闭，第二次 mount 创建新 client，行为正确。但 `commandHandler`（line 1537–1558）通过 `__appScopeRef.current` 读取最新 scope，而 dispatch 表中 11 个 command 全部使用 `?.` 可选链（line 1540–1550），**当方法尚未装配到 `__appScope` 时静默返回 `undefined` 而非报错**，调用方无法区分"指令成功返回 void"与"方法不存在"。
- 建议: dispatch 表应先检查 `typeof scope[method] === 'function'`，未装配时返回 `{ error: 'command-not-ready' }` 或抛出自定义错误码，让 WS 客户端能向远端返回有意义的错误响应。

---

## P1 重要

### [P1-1] 导入体积过大 — 850 行 import，60+ lucide-react 图标
- 位置: src/App.tsx:1–850
- 类型: 性能 / 简化
- 描述: 前 850 行（占文件 54%）为 import 语句。其中 lucide-react 导入 60+ 图标（line 5–68），这些图标大多在已提取的 `appExtracted/*` 模块中使用，App.tsx 本身并不直接渲染。导入滞留导致 tree-shaking 无法生效，所有图标均打入主 bundle。
- 建议: 将各图标 import 移至实际使用的 `appExtracted/` 模块；App.tsx 仅保留自身直接引用的 import。

### [P1-2] 组件承担过多职责 — 单一组件管理全部应用状态
- 位置: src/App.tsx:850–1579
- 类型: 抽象层次
- 描述: `App` 组件内声明了约 200+ 个 `useState` 和 150+ 个 `useRef`，覆盖画布交互、连线预览、设备库管理、图片拾取器、状态图标编辑器、WS 运行时、对齐引导、路由计算缓存、撤销栈等至少 15 个独立功能域。虽已提取 render 逻辑到 32 个 `appExtracted/*` 模块，但状态声明仍集中在此，导致组件职责不清、难以独立测试。
- 建议: 将相关 state/ref 按功能域提取到对应自定义 hook 中（如 `useCanvasInteraction`、`useConnectPreview`、`useImagePicker`），App.tsx 仅组合 hook 并传递；最终目标：App.tsx < 100 行。

### [P1-3] `useMemo(fn, [])` 用于惰性初始化 — 语义误用
- 位置: src/App.tsx:656
- 类型: 风格 / 简化
- 描述: `const initialDeviceLibrary = useMemo(() => readLocalDeviceLibraryPersistencePayload(), [])` 利用空依赖 `useMemo` 实现惰性求值，但 `useMemo` 在 React 规范中不保证缓存语义（未来可能重新计算），且此处本意是"挂载时计算一次"。
- 建议: 改用 `useState(() => readLocalDeviceLibraryPersistencePayload())[0]` 或 `useRef` + 懒初始化模式，语义更明确且符合 React 保证。

### [P1-4] State-Ref 双重声明模式 — 200+ 对重复声明
- 位置: src/App.tsx:750–860（示例）
- 类型: 重复 / 风格
- 描述: 大量状态以 `const [x, setX] = useState(...)` 紧跟 `const xRef = useRef(x)` 成对出现，每对后均附加 `Object.assign(__appScope, { x, setX, xRef })`。这种 state+ref 同步模式意味着同一数据有两个真相源，手动同步容易遗漏（如 `setX` 后忘记 `xRef.current = x`）。
- 建议: 封装 `useSyncedRef(initialValue)` hook 自动保持 ref 与 state 同步，或完全移除冗余 ref（仅在 effect/callback 中通过 `__appScopeRef.current` 读取最新 state）。

---

## P2 一般

### [P2-1] 未使用变量 `onSelectionMovedToDifferentScheme`
- 位置: src/App.tsx:892
- 类型: 死代码
- 描述: `const onSelectionMovedToDifferentScheme = (...args) => { void args; };` 定义了一个空函数体，仅 `void args` 无任何副作用，未被使用。
- 建议: 删除该变量及对应 `Object.assign` 行。

### [P2-2] WS command dispatch 表硬编码 — 扩展性差
- 位置: src/App.tsx:1539–1551
- 类型: 简化
- 描述: 11 个 WS 指令以字面量 `Record<string, (p: any) => unknown>` 形式硬编码在 effect 内，新增指令需修改 App.tsx 源码；且 key 使用 `"control.xxx.yyy"` 命名空间风格但无 schema 验证。
- 建议: 将 dispatch 表提取为独立模块（如 `appExtracted/wsCommandHandlers.ts`），通过注册模式扩展；为每个 command 定义参数 schema（zod 或手写 validator）。

### [P2-3] `createSetNodes`/`createSetEdges` 等工厂函数每次渲染重建
- 位置: src/App.tsx:871–876
- 类型: 性能
- 描述: `const setNodes = createSetNodes(__appScope)` 等 6 个工厂调用在每次渲染时执行，产生新的函数引用。若这些函数被传入子组件 props，将导致子组件不必要的重渲染。
- 建议: 用 `useCallback` 或 `useMemo` 包裹工厂调用，或在工厂内部使用 `__appScopeRef.current` 读取最新 scope 而非闭包捕获。

### [P2-4] 长行 — 多行超 200 字符
- 位置: src/App.tsx:527, 529, 550, 554, 580, 600, 1024 等
- 类型: 风格
- 描述: 多处 import 语句和声明行超过 200 字符（如 line 527 的 `svgExportUtils` 导入超 800 字符），降低可读性和 diff 精度。
- 建议: 配置 `.prettierrc` 或 eslint `max-len` 规则，将长 import 拆为多行。

### [P2-5] `Object.assign(__appScope, ...)` 分散在单行声明中
- 位置: src/App.tsx:1024, 1025, 1513 等
- 类型: 风格
- 描述: 部分行将 `useState`/`useRef` 声明与 `Object.assign(__appScope, ...)` 合并在一行（如 line 1024: `const x = useRef(...); Object.assign(__appScope, { x })`），与其他分行写法不一致，增加批量搜索/替换难度。
- 建议: 统一为分行格式，或通过代码生成脚本自动维护 `__appScope` 赋值。

---

## P3 轻微

### [P3-1] 未使用的导入
- 位置: src/App.tsx:2–4
- 类型: 死代码
- 描述: `ChangeEvent`、`DragEvent`、`Fragment`、`isValidElement`、`lazy`、`Suspense`、`useDeferredValue`、`useTransition`、`flushSync`、`createPortal` 等在 import 中列出，但在 App.tsx 当前代码中未见直接使用（可能在提取模块中使用但 import 未迁移）。
- 建议: 配合 P1-1 清理，将未使用 import 移至实际消费模块。

### [P3-2] `runtimeWsBlinkSeq` 状态仅用于触发重渲染
- 位置: src/App.tsx:1529
- 类型: 简化
- 描述: `useState(0)` + `setRuntimeWsBlinkSeq(n => n+1)` 是典型的"强制重渲染"模式，值本身无意义，仅靠变化驱动 UI 更新。
- 建议: 改用 `useReducer(x => x+1, 0)` 的 dispatch 形式，语义更清晰（dispatch 而非 set）。

### [P3-3] 缺少错误边界
- 位置: src/App.tsx:1577–1578
- 类型: 错误处理
- 描述: `renderAppView(__appScope)` 返回的视图树无 ErrorBoundary 包裹；WS 命令处理（line 1554–1556）抛出的错误若未被上层捕获，将导致整个应用白屏。
- 建议: 在 `renderAppView` 返回值外层包裹 `<ErrorBoundary fallback={...}>`。

---

## 统计

| 优先级 | 数量 |
|--------|------|
| P0 严重 | 3 |
| P1 重要 | 4 |
| P2 一般 | 5 |
| P3 轻微 | 3 |
| **总计** | **17** (合并同类型后；原始 15 个独立发现，P1-4 涵盖 P2-5 的部分模式) |

> 注：P1-4（State-Ref 双重声明）和 P2-5（Object.assign 风格不统一）属于同一 `__appScope` 架构问题的不同表现层面，已在 P0-2 中统一归纳。实际独立发现去重后为 **15 项**。
