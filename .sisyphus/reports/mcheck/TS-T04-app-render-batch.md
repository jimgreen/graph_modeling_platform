# T04 appRenderBatch.tsx 审查报告

## 概览

| 项目 | 值 |
|------|-----|
| 文件 | `src/appExtracted/appRenderBatch.tsx` |
| 总行数 | 4243 |
| 导出 | `useRenderBatch(__appScope)` — 纯副作用 hook，无 return |
| `Object.assign(__appScope,...)` 次数 | 500 |
| `useEffect` 数量 | 54（其中 47 个使用 opaque factory） |
| `useMemo` 数量 | 22 |
| `useCallback` 数量 | 1 |
| `@ts-nocheck` | 第 1 行，全文件禁用类型检查 |
| 数据/JSX 块占比估计 | ~25%（约 1050 行，集中在 3400–4243） |
| 逻辑块 | ~75%（状态计算、factory 创建、effect 注册） |

**整体评价**：此文件是从 `App.tsx` 提取的巨型 batch-render hook。所有产出通过 `Object.assign(__appScope, ...)` 副作用写入外部作用域 bag，hook 本身无 return。模式高度重复（67 个 opaque `createAppHookCallbackN` factory），类型安全完全关闭。

---

## P0 严重

### [P0-1] 全文件 @ts-nocheck 导致 4243 行无类型保护
- 位置: src/appExtracted/appRenderBatch.tsx:1
- 类型: 安全
- 描述: 整个 hook 的 500+ 个 `__appScope` 赋值、67 个 opaque callback factory、大量解构 props 全部无类型检查；任何拼写错误或参数不匹配在编译期完全不可见。
- 建议: 逐步移除 `@ts-nocheck`：先为 `__appScope` 定义精确 interface（而非 `Record<string, any>`），再为每个 `createAppHookCallbackN` factory 添加显式参数/返回类型。分阶段推进，至少覆盖解构入参和关键计算函数。

### [P0-2] useEffect 缺少依赖数组 — 每次渲染都执行
- 位置: src/appExtracted/appRenderBatch.tsx:1162
- 类型: bug
- 描述: `useEffect(createAppHookCallback95(__appScope))` 未提供第二个参数（依赖数组），等同于每次渲染后都执行该 effect。在 4243 行 hook 中，每次 state 变化都会触发，可能造成不必要的副作用（DOM 操作、事件订阅、网络请求等）。
- 建议: 检查 `createAppHookCallback95` 的实际逻辑：若为一次性初始化，添加 `[]`；若响应特定状态变化，添加对应的依赖数组。

### [P0-3] __appScope 为 Record<string, any> — 500 次赋值零类型约束
- 位置: src/appExtracted/appRenderBatch.tsx:624（函数签名）
- 类型: 安全
- 描述: `useRenderBatch(__appScope: Record<string, any>)` 允许任意 key 写入，500 次 `Object.assign(__appScope, { ... })` 的 key 正确性完全依赖人工约定。拼写错误（如 `canvsResizeHandles` vs `canvasResizeHandles`）在下游消费时才会暴露为 undefined runtime 错误。
- 建议: 定义 `AppScope` interface，列出所有 500+ 个 key 及其类型；将签名改为 `__appScope: AppScope`。可分步推进：先导出 key 列表作为 type，再逐步收紧 value 类型。

---

## P1 重要

### [P1-1] 67 个 opaque createAppHookCallbackN factory 不可审计
- 位置: src/appExtracted/appRenderBatch.tsx:949-1348 及多处
- 类型: 抽象层次
- 描述: 47 个 `useEffect` 和 22 个 `useMemo` 的回调体完全封装在外部 `createAppHookCallback77`–`createAppHookCallback139` 等 opaque factory 中。此处无法审查实际逻辑、依赖数组是否完备、闭包捕获是否正确。这是整个文件最大的可维护性黑洞。
- 建议: 将每个 `createAppHookCallbackN` 的实现内联或至少暴露其函数签名和依赖列表。长期应将每个 callback 拆为具名函数，使依赖关系在此文件内可见。

### [P1-2] useMemo 的 JSX 渲染闭包捕获整个 hook 作用域
- 位置: src/appExtracted/appRenderBatch.tsx:4110-4165
- 描述: `libraryPanelContent`、`templateLibraryPanelContent`、`projectPanelContent` 三个 `useMemo` 分别调用 `renderLibraryPanel()`、`renderTemplateLibraryPanel()`、`renderProjectPanel()`。这些 render 函数在 hook 体内定义，闭包捕获了全部 500+ 个 scope 变量，但 useMemo 的依赖数组仅列出 11-13 个。若 render 函数内部读取了未列入依赖的变量，将返回过期缓存。
- 建议: 将 `renderLibraryPanel` 等改为纯函数，显式接收所需 props 参数；或将依赖数组补全为 render 函数实际读取的所有变量。

### [P1-3] hook 无 return — 纯副作用模式违背 React 数据流
- 位置: src/appExtracted/appRenderBatch.tsx:624, 4243
- 类型: 抽象层次
- 描述: `useRenderBatch` 从第 624 行到第 4243 行，全程通过 `Object.assign(__appScope, ...)` 向外侧可变对象写入，hook 自身无 return。这意味着调用方无法通过 destructuring 获取明确返回值，所有消费方需从 `__appScope` 的 string key 中取值，丧失 IDE 自动补全和编译期检查。
- 建议: 中期重构为返回结构化对象 `return { canvasResizeHandles, libraryPanelContent, ... }`，让 React 数据流显式化。短期可先在 `__appScope` 类型中列出所有 key 提供类型约束。

### [P1-4] 4243 行单文件 — 远超合理 hook 规模
- 位置: src/appExtracted/appRenderBatch.tsx（全文件）
- 类型: 抽象层次
- 描述: 单个 React hook 4243 行，涵盖：undo/redo、电压基准设置、自定义设备模板编辑、图片资源管理、连接预览、小地图计算、库面板渲染、画布 resize、节点双击编辑对话框等至少 10 个独立领域。任何单一领域的修改都需要在此文件中导航数千行。
- 建议: 按领域拆分为独立 hooks：`useUndoRedo`、`useVoltageBase`、`useCustomDeviceDraft`、`useImagePicker`、`useConnectPreview`、`useMinimap`、`useLibraryPanels`、`useCanvasResize` 等，每个 hook 返回结构化结果。

### [P1-5] useEffect 依赖数组使用 `__appScope.xxx` 读取 — 对象属性不是响应式依赖
- 位置: src/appExtracted/appRenderBatch.tsx:4154-4163
- 类型: bug
- 描述: `projectPanelContent` 的 `useMemo` 依赖数组中出现 `__appScope.expandedSchemeIds`、`__appScope.filteredProjectSchemes`、`__appScope.projectSearchNeedle` 等。`__appScope` 是通过 `Object.assign` 每次渲染都重新赋值的普通对象，其属性变化不会触发 React 重新渲染。若这些值在渲染期间被先前的 `Object.assign` 更新，memo 依赖比较可能因引用相同而跳过更新。
- 建议: 将 `__appScope` 中需参与依赖比较的值提取为独立 state/ref，确保 React 依赖追踪可感知变化。

---

## P2 一般

### [P2-1] 每行渲染都执行 500 次 Object.assign
- 位置: src/appExtracted/appRenderBatch.tsx（全文件分布）
- 类型: 性能
- 描述: 每次 hook 重渲染时执行 500 次 `Object.assign(__appScope, { key: value })`。虽然单次 assign 开销小，但累计 500 次属性定义（含属性描述符操作）在高频交互（拖拽、缩放）时可能贡献可观的 GC 压力。
- 建议: 合并为单次 `Object.assign(__appScope, { ...allUpdates })` 或使用批量赋值模式；或将 `__appScope` 改为 `Map` / 直接 mutable 属性赋值。

### [P2-2] 大量 inline 对象字面量作为 useMemo 产出
- 位置: src/appExtracted/appRenderBatch.tsx:4022-4036, 4104-4108
- 类型: 性能
- 描述: `resizeSizeHint`（4022/4032 行）和 `appShellStyle`（4104 行）等 inline 对象在 useMemo 的 IIFE 中创建。若 useMemo 的依赖频繁变化（如拖拽过程中），每次产出新对象引用可能导致下游消费者（React 组件 props）发生不必要的重渲染。
- 建议: 对关键路径上的产出对象，使用 shallow-equal 比较或拆分为独立 primitive 值。

### [P2-3] import 块 620 行，76 个 lucide-react 图标导入
- 位置: src/appExtracted/appRenderBatch.tsx:14-77
- 类型: 效率
- 描述: 从 lucide-react 导入 76 个图标组件，但从第 14 行到第 620 行的总 import 块占 620 行（文件前 14.5%）。部分导入（如 `Map as MapIcon`）暗示命名冲突，可能存在更多未实际使用的导入。
- 建议: 使用 tree-shaking 验证工具确认所有 76 个图标均有使用；将未使用的导入删除。将 import 块按来源分组并缩减到必要最小集。

### [P2-4] 重复的图片资源处理逻辑 — definition vs customDevice 两条路径
- 位置: src/appExtracted/appRenderBatch.tsx:3214-3256
- 类型: 重复
- 描述: `stateIconDrawingInlineImage` 同步到 draft 时，`scope === "definition"` 和 `scope !== "definition"` 两个分支几乎完全相同的 `imageFieldsAlreadySynced` 检查和 `setXxxDraft` 调用，仅目标 setter 和字段名不同。
- 建议: 提取为通用 `syncImageFieldsToDraft(target, setter, image)` 函数，消除 ~40 行重复。

### [P2-5] magic number: 26, 30, 14, 8, 160 等未命名常量
- 位置: src/appExtracted/appRenderBatch.tsx:4024, 4034, 2231 等
- 类型: 风格
- 描述: `26 * svgUiUnitY`（4024）、`30 * svgUiUnitY`（4034）、`min={8} max={160}`（2231）等 magic number 散布在逻辑中，含义不透明。
- 建议: 提取为命名常量如 `RESIZE_HINT_OFFSET_Y`、`FONT_SIZE_MIN`、`FONT_SIZE_MAX`。

### [P2-6] 大量 useRef 缺失 cleanup 的定时器/订阅
- 位置: src/appExtracted/appRenderBatch.tsx:4066-4070
- 类型: 内存
- 描述: `clearStaticButtonFeedbackTimer`、`setStaticButtonFeedback` 等暗示存在 `setTimeout`/`setInterval`，但此文件中未见对应的 `useEffect` cleanup。若 timer 在组件卸载后触发，将操作已卸载组件的 state。
- 建议: 确保所有 timer/subscription 在 `useEffect` cleanup 中释放，或使用 `useRef` 追踪 mounted 状态。

---

## P3 轻微

### [P3-1] canvas-resize-handles JSX 可参数化
- 位置: src/appExtracted/appRenderBatch.tsx:4174-4241
- 类型: 重复
- 描述: 8 个 `<rect className="canvas-resize-handle ...">` 块结构几乎相同，仅 `x/y/width/height` 和 `onPointerDown` 的方向参数不同。~70 行 JSX 可通过数据驱动缩减为 ~15 行。
- 建议: 定义 handles 配置数组 `[{direction, x, y, w, h}, ...]`，用 `.map()` 渲染。

### [P3-2] 文件头注释 "从 App.tsx 第 3053-6217 行提取" 已过时
- 位置: src/appExtracted/appRenderBatch.tsx:2
- 类型: 风格
- 描述: 注释声明从 App.tsx 第 3053-6217 行提取（3164 行），但当前文件为 4243 行，源文件行数范围可能已变化，注释不再准确。
- 建议: 更新或删除此溯源注释，改为描述此 hook 的职责。

### [P3-3] 单行多语句密度过高
- 位置: src/appExtracted/appRenderBatch.tsx:2000-2017 等多处
- 类型: 风格
- 描述: 大量形如 `const xxx = createXxx(__appScope); Object.assign(__appScope, { xxx });` 的单行双语句模式，连续出现数百次。虽然语义清晰，但密度过高影响可读性。
- 建议: 编写 `assignScope(key, value)` 辅助函数，或批量收集后一次性 assign。

### [P3-4] `void` 表达式用于 Promise fire-and-forget
- 位置: src/appExtracted/appRenderBatch.tsx:1000, 1701 等
- 类型: 风格
- 描述: 多处使用 `void someAsyncFn()` 进行 fire-and-forget 调用。虽然功能正确，但缺少 `.catch()` 意味着未捕获的 rejection 会变为 unhandled promise rejection。
- 建议: 添加 `.catch(showGlobalError)` 或统一的 error boundary 处理。

---

## 统计

| 优先级 | 数量 |
|--------|------|
| P0 严重 | 3 |
| P1 重要 | 5 |
| P2 一般 | 6 |
| P3 轻微 | 4 |
| **合计** | **18** |
