# T11 appToolbarHookFactories 审查报告（tsx + test）

## 概览

| 指标 | 值 |
|------|-----|
| tsx 行数 | 4634 |
| test 行数 | 634 |
| 总发现数 | 19 |
| P0 严重 | 2 |
| P1 重要 | 5 |
| P2 一般 | 6 |
| P3 轻微 | 6 |
| 数据块占比估计 | ~15%（大量 `__appScope` 解构行 + 硬编码 paramKeys 数组 + JSX 渲染块） |

文件为自动生成/提取的代码（`createAppHookCallback1` 至 `createAppHookCallback142`），所有工厂共享同一模式：接收 `__appScope: Record<string, any>` 返回闭包。代码功能正确，但存在类型安全完全丧失、全局变量隐式依赖、大量重复模式等问题。

---

## P0 严重

### [P0-1] `@ts-nocheck` 完全禁用 TypeScript 类型检查
- 位置: `appToolbarHookFactories.tsx:1`
- 类型: 安全
- 描述: 文件首行 `// @ts-nocheck` 让整个 4634 行文件脱离 TypeScript 编译器的约束。所有 `__appScope: Record<string, any>` 的属性访问、类型转换、函数签名均无编译期校验，任何属性名拼写错误或类型不匹配只能在运行时暴露。对于包含 142 个 callback 工厂的大文件，这意味着重构时零编译期保护。
- 建议: 渐进式迁移——先为 `__appScope` 定义一个 `AppScope` 接口（可用 `Partial<>` + `Pick<>` 组合），逐个工厂移除 `@ts-nocheck`，最终在文件级别启用严格检查。

### [P0-2] 隐式全局变量 `showGlobalMessage` 未从 `__appScope` 解构
- 位置: `appToolbarHookFactories.tsx:17`, `:28`, `:32`, `:79`
- 类型: bug
- 描述: `createOpenNodeDoubleClickEditor` 中多次调用 `showGlobalMessage()`，但该函数未在第 8 行的 `__appScope` 解构中声明。它依赖运行时全局挂载（`window.showGlobalMessage`）。如果全局挂载缺失或延迟注入，将抛出 `ReferenceError`。同一文件中其他工厂均通过 `__appScope` 获取外部依赖，唯独此处使用全局，模式不一致且不可测试。
- 建议: 将 `showGlobalMessage` 加入 `__appScope` 解构列表，并在测试中显式 mock。

---

## P1 重要

### [P1-1] localStorage 持久化回调三处重复（117/118/119）
- 位置: `appToolbarHookFactories.tsx:3985-4025`
- 类型: 重复
- 描述: `createAppHookCallback117`（side panel width）、`createAppHookCallback118`（statusbar height）、`createAppHookCallback119`（validation panel height）结构完全一致：解构一个 storage key 和一个数值，调用 `localStorage.setItem`，用空 `catch` 吞掉异常。三处约 40 行代码仅变量名不同。
- 建议: 提取 `createLocalStoragePersistor(storageKey, value)` 工具函数，三个回调各一行调用。

### [P1-2] 事件监听 setup/cleanup 模式大量重复
- 位置: `appToolbarHookFactories.tsx:3004-3041`（callback87/88）、`:3044-3098`（callback89）、`:3501-3531`（callback105）、`:3534-3598`（callback106）
- 类型: 重复
- 描述: 多个回调遵循相同模式：定义 handler → `window.addEventListener(type, handler, capture)` → 返回 cleanup 函数 `window.removeEventListener(...)`。pointermove/pointerup/pointercancel 的三件套注册（callback105、106、109）各重复约 8 行完全相同的 add/remove 代码。
- 建议: 提取 `addWindowListeners(entries: Array<[type, handler, options]>)` 工具函数返回统一 cleanup。

### [P1-3] `__appScope` 解构行超长（>1000 字符）
- 位置: `appToolbarHookFactories.tsx:515`（60+ 属性）、`:1040`、`:1729`、`:2004`
- 类型: 风格
- 描述: 部分工厂函数的 `__appScope` 解构超过 1000 字符，单行包含 30-60 个属性。这使 diff 几乎不可读，git blame 失效，IDE 无法在单行内有效导航。
- 建议: 按功能域拆分 `__appScope` 为子对象（如 `canvasScope`、`libraryScope`、`dialogScope`），或在解构处强制多行格式化。

### [P1-4] 测试通过读取源文件字符串验证代码结构——极其脆弱
- 位置: `appToolbarHookFactories.test.ts:471-481`、`:617-633`
- 类型: 效率
- 描述: "recomputes inherited fields when device library definitions change"（L471）和 "registers the routable-line endpoint preview helper before hook callback 61 consumes it"（L617）使用 `readFileSync` 读取 `App.tsx` 等源文件，然后用 `toContain` / `indexOf` 检查字符串。任何格式变更（空格、换行、变量重命名）都会导致测试失败，即使运行逻辑完全正确。此外，`readFileSync` 在 `vitest` 中引入文件系统依赖，CI 环境路径差异可能导致 flaky failure。
- 建议: 用 AST 级工具（如 `ts-morph`）验证依赖顺序，或直接通过模块导出接口测试行为。

### [P1-5] 批量编辑参数列表硬编码（17 个 key）
- 位置: `appToolbarHookFactories.tsx:4057`
- 类型: 风格
- 描述: `createAppHookCallback121` 中 `paramKeys` 数组硬编码了 17 个电压相关参数名（`"vbase", "v_base", "i_vbase", ...`）。新增参数类型需修改此文件，且无法通过类型检查验证完整性。
- 建议: 将 `VOLTAGE_PARAM_KEYS` 提取为常量，理想情况下从设备模板定义自动推导。

---

## P2 一般

### [P2-1] 魔法数字散布于渲染逻辑
- 位置: `appToolbarHookFactories.tsx:140-144`（12, 4, 6）、`:733`（24）、`:144`（`Math.round(6 * scale)`）
- 类型: 风格
- 描述: `createRotateControlAvoidRectFromCanvasPoints` 中 padding `12`、最小值 `4`、基数 `6` 均无命名常量。`terminalStubSegment` 调用传入 `24` 作为 stub 长度。这些数值影响视觉呈现但无语义名称，修改时需阅读上下文才能理解用途。
- 建议: 提取为 `ROTATE_CONTROL_PADDING`、`TERMINAL_STUB_LENGTH` 等命名常量。

### [P2-2] 测试中 `flushPromises` 实现可能不足
- 位置: `appToolbarHookFactories.test.ts:85-88`
- 类型: bug
- 描述: `flushPromises` 仅 await 两个 `Promise.resolve()`。对于涉及多级 `.then()` 链或 `setTimeout` 嵌套的异步逻辑（如 callback77 的 retry 逻辑），两轮 microtask 刷新可能不够，导致断言在 Promise 链完成前执行。
- 建议: 使用 `await vi.runAllTimersAsync()` 或 `await new Promise(resolve => setTimeout(resolve, 0))` 确保完整刷新。

### [P2-3] `createAppHookCallback12` 测试 setup 三次重复
- 位置: `appToolbarHookFactories.test.ts:384-404`、`:423-443`、`:517-537`
- 类型: 重复
- 描述: 三个测试用例（"includes inherited AC generator fields"、"lists AC generator base fields before wind generator derived fields"、"keeps each selected device definition for mixed enum common fields"）各自构建几乎相同的 `createAppHookCallback12` scope，差异仅在 node 数据和少量属性。每个 scope 构建约 20 行。
- 建议: 提取 `createBatchEditScope(nodes)` 工厂函数，各测试仅传入差异数据。

### [P2-4] JSX 渲染混入纯逻辑工厂文件
- 位置: `appToolbarHookFactories.tsx:513-999`（`createRenderReadonlyBackgroundPage`）
- 类型: 抽象层次
- 描述: `createRenderReadonlyBackgroundPage` 返回包含 ~480 行 JSX 的 React 元素树，与同文件中其他纯数据/纯逻辑工厂（如 callback12 的参数计算、callback34 的 bus sync）处于同一文件。文件后缀 `.tsx` 允许此混合，但导致文件职责不清——既是 hook 工厂集合又是组件渲染定义。
- 建议: 将 `createRender*` 系列（`createRenderReadonlyBackgroundPage`、`createRenderMeasurementGroup` 等）拆分至独立文件如 `appToolbarRenderFactories.tsx`。

### [P2-5] `createAppHookCallback34` 中 bus sync 逻辑分支复杂度过高
- 位置: `appToolbarHookFactories.tsx:1521-1600`
- 类型: 简化
- 描述: callback34 包含 4 层嵌套的 early return + 条件分支（`dragging || manualPathDrag || rewiring || terminalPress?.moved || connectSource`），随后是 `scheduleIdleWork` 回调内的多层条件逻辑。单函数认知负荷过高。
- 建议: 将 "should skip bus sync" 判断提取为 `isBusSyncSkippable()` 谓词函数，将 idle work 回调提取为独立函数。

### [P2-6] 测试 `dirtyBaseline` helper 返回过于宽松的类型
- 位置: `appToolbarHookFactories.test.ts:547-568`
- 类型: 效率
- 描述: `dirtyBaseline` 使用 `nodes: unknown[]` 和大量固定空值构造对象，未实现完整 `Project` 类型。这使得 `graphDirtyBaselineChanged` 的比较仅依赖引用相等（`(previous, next) => previous !== next`），无法检测结构化差异场景。
- 建议: 为测试 helper 使用 `Partial<Project>` 类型标注，或添加一个测试验证结构化 diff 场景。

---

## P3 轻微

### [P3-1] 函数编号命名无语义
- 位置: `appToolbarHookFactories.tsx:全文`（142 个 `createAppHookCallbackN`）
- 类型: 风格
- 描述: 142 个回调工厂按提取顺序编号（1-142），编号不包含任何语义信息。阅读 `createAppHookCallback87` 无法知道它处理 wheel event zoom。这是自动提取工具的产物，但长期维护困难。
- 建议: 在后续重构中为每个工厂添加语义别名导出（如 `export const createWheelZoomHandler = createAppHookCallback87`），或在调用点添加注释说明用途。

### [P3-2] `createAppHookCallback57` 中 `Number.MAX_SAFE_INTEGER` 作为排序 fallback
- 位置: `appToolbarHookFactories.tsx:2037-2038`
- 类型: 效率
- 描述: 视口节点排序时，未在 `nodeIndexById` 中找到的节点使用 `Number.MAX_SAFE_INTEGER` 作为 fallback index，将这些节点排到末尾。逻辑正确但无注释说明意图，后续维护者可能误以为是 bug。
- 建议: 添加注释说明 fallback 排序策略的意图。

### [P3-3] `performance.now()` 的 typeof 检查冗余
- 位置: `appToolbarHookFactories.tsx:44`
- 类型: 死代码
- 描述: `typeof performance === "undefined" ? Date.now() : performance.now()` 中，目标运行环境为现代浏览器（文件包含 JSX、SVG 渲染），`performance` API 始终可用。SSR 场景下此文件不会被加载（SVG 渲染逻辑依赖 DOM）。
- 建议: 移除 `typeof performance` 检查，直接使用 `performance.now()`。

### [P3-4] 测试 `afterEach` 清理可能遗漏 fake timer 边缘场景
- 位置: `appToolbarHookFactories.test.ts:26-29`
- 类型: 效率
- 描述: `afterEach` 调用 `vi.useRealTimers()` 和 `vi.unstubAllGlobals()`，但部分测试（如 L91 `vi.useFakeTimers()` 后紧跟 `vi.stubGlobal`）如果在 `vi.useFakeTimers()` 和 `vi.stubGlobal` 之间抛出异常，`vi.unstubAllGlobals()` 仍能正确清理，因为 `afterEach` 始终执行。但如果某个测试嵌套了 `describe` 级别的 `beforeEach`/`afterEach`，执行顺序可能导致意外交互。当前文件无此问题，但值得注意。
- 建议: 当前无问题，保持现状即可。

### [P3-5] `createAppHookCallback10` 和 `createAppHookCallback11` 逻辑高度相似
- 位置: `appToolbarHookFactories.tsx:1015-1036`
- 类型: 重复
- 描述: callback10 和 callback11 均解析 canvas selection，差异仅在 callback10 使用 `canvasSelectionScope` 参数而 callback11 硬编码 `"group"`。两者共约 22 行，可参数化合并。
- 建议: 提取 `createResolveCanvasSelectionCallback(scope, selectionMode)` 通用工厂。

### [P3-6] `createAppHookCallback140` 中 `cancelled` flag 模式可提取
- 位置: `appToolbarHookFactories.tsx:4549-4574`
- 类型: 简化
- 描述: `let cancelled = false; void fetch().then(() => { if (cancelled) return; ... }).catch(() => { if (cancelled) return; ... }); return () => { cancelled = true; };` 是标准的 async effect cleanup 模式，在 React 生态中常见但在此文件中仅出现一次。代码正确但可读性可通过抽象提升。
- 建议: 可忽略；如果未来出现更多类似模式，考虑提取 `withCancellation(asyncFn)` 工具函数。
