# T08 appGraphMeasurementFactories 审查报告（tsx + test）

## 概览

| 指标 | 值 |
|------|-----|
| TSX 文件行数 | 5175 |
| Test 文件行数 | 1537 |
| 发现总数 | 22 |
| P0 严重 | 2 |
| P1 重要 | 7 |
| P2 一般 | 8 |
| P3 轻微 | 5 |
| 数据块占比估计 | ~40%（大量重复 JSX 渲染块与内联样式表，集中在 4700-5175 行） |

文件名含 "Measurement"，但实际内容涵盖：画布 bounds / 滚动同步、拖拽 overlay、library flyout、scheme 管理、undo/redo、measurement config CRUD、device definition 同步、以及大量 SVG 渲染 JSX。单一文件承担了至少 8 个独立领域，建议按领域拆分为 4-6 个 factory 文件。

---

## P0 严重

### [P0-1] @ts-nocheck 禁用整个文件的类型检查
- 位置: `src/appExtracted/appGraphMeasurementFactories.tsx:1`
- 类型: bug
- 描述: `// @ts-nocheck` 让整个 5175 行文件脱离 TypeScript 类型系统保护。所有 `__appScope: Record<string, any>` 的参数解构、返回值、JSX props 均无编译期校验，任何字段拼写错误或类型不匹配只能在运行时暴露。
- 建议: 移除 `@ts-nocheck`，为 `__appScope` 定义具体 interface（可按领域拆分，如 `GraphStoreScope`、`CanvasBoundsScope`、`MeasurementConfigScope`），逐步修复报错。至少先替换为 `@ts-check` + JSDoc 标注过渡。

### [P0-2] 完全相同的图片渲染块重复两次
- 位置: `src/appExtracted/appGraphMeasurementFactories.tsx:1007-1016` 与 `1017-1028`
- 类型: 重复
- 描述: 两段代码的条件完全相同（`imageHref && !isStaticNode(node)`），第一段渲染 `<rect>` 作为 image cover，第二段渲染 `<image>` 作为 background-image。但两者在 DOM 中的层级、`clipPath`、尺寸计算完全一致。第二次 `<image>` 块与第一次完全冗余——如果意图是覆盖层+背景层，应当合并为一个 `<g>` 块，而非两个独立的重复条件判断。
- 建议: 合并为单个 `{imageHref && !isStaticNode(node) && (<g>...</g>)}` 块，减少重复 JSX 和运行时条件判断。

---

## P1 重要

### [P1-1] Record<string, any> 作为依赖注入载体，完全丧失类型安全
- 位置: 全文所有 `create*(__appScope: Record<string, any>)` 函数签名
- 类型: 抽象层次
- 描述: 约 200+ 个 factory 函数全部接受 `Record<string, any>`，内部通过巨型解构（如 line 531 一次解构 26 个字段）获取依赖。字段名拼写错误、缺少必要字段、类型不匹配均无编译期保护。
- 建议: 为每个 factory 定义 scope interface，至少将高频使用的核心依赖（`nodeById`、`edges`、`setGraphStore` 等）类型化。可分阶段推进：先为 measurement 相关的 factory 定义 interface，其余保持 any 过渡。

### [P1-2] 文件职责严重超载（8 个领域混在同一文件）
- 位置: 全文
- 类型: 抽象层次
- 描述: 文件名暗示 "measurement factories"，但实际包含：graph store CRUD（L9-65）、drag overlay（L168-662）、SVG node rendering（L900-1180）、library flyout（L1501-1653）、canvas bounds/scroll（L2014-2660）、edge dirty tracking（L2984-3070）、scheme management（L3499-3681）、undo/redo（L3683-3858）、measurement config（L4000-4700）、measurement editor UI（L4700-5175）。每个领域独立且无交叉调用，拆分后可读性和可维护性大幅提升。
- 建议: 按领域拆分为：`graphStoreFactories.ts`、`canvasBoundsFactories.ts`、`dragOverlayFactories.ts`、`schemeFactories.ts`、`undoFactories.ts`、`measurementFactories.tsx`（仅保留 measurement 相关 + JSX 渲染）。

### [P1-3] Date.now().toString(36) 生成 ID 存在碰撞风险
- 位置: `src/appExtracted/appGraphMeasurementFactories.tsx:4141`
- 类型: bug
- 描述: `const idBase = \`customMeasurement${Date.now().toString(36)}\``——`Date.now()` 毫秒精度在快速连续操作（如批量导入或自动化测试）中可能返回相同值，导致 ID 冲突。虽然有 suffix 兜底循环（L4143-4147），但仅检查 `existingIds`（当前已存在的 ID），无法防御同一事件循环内的并发调用。
- 建议: 使用 `crypto.randomUUID()` 或引入全局递增计数器。如须保持短 ID 风格，可组合 `Date.now().toString(36) + Math.random().toString(36).slice(2, 6)`。

### [P1-4] console.table 残留在生产代码中
- 位置: `src/appExtracted/appGraphMeasurementFactories.tsx:3132`
- 类型: 风格
- 描述: `createLogBulkMoveStats` 直接使用 `console.table` 输出性能统计，在生产环境中会产生不必要的控制台噪声，且无法通过构建配置消除。
- 建议: 替换为项目统一的 logger 工具，或通过 `__DEV__` / `process.env.NODE_ENV` 条件包裹。如确需保留，至少加 `if (__DEV__)` 守卫。

### [P1-5] 巨型 JSX 块嵌入 factory 文件，违反单一职责
- 位置: `src/appExtracted/appGraphMeasurementFactories.tsx:4700-5175`（~475 行纯 JSX）
- 类型: 抽象层次
- 描述: 约 475 行内联 JSX 表格布局（`<tr><th>...<td>...`）直接嵌入 factory 文件，包含大量重复的 `<Tooltip>`+`<BufferedTextInput>`/`<InputNumber>` 组合模式。这些 UI 应提取为独立 React 组件。
- 建议: 提取 `MeasurementGroupEditor`、`MeasurementItemRow`、`MeasurementStyleControls` 等组件到独立 `.tsx` 文件，factory 中仅保留数据操作逻辑。

### [P1-6] 内联 style 对象在每次渲染时重建
- 位置: `src/appExtracted/appGraphMeasurementFactories.tsx:4822, 4849, 4850` 等多处
- 类型: 性能
- 描述: 大量 `style={{ display: "flex", ... }}` 在 JSX 中内联创建，每次渲染都会分配新对象。在量测编辑器这种可能频繁重渲染的场景中，会触发不必要的 DOM diff 和子组件 re-render。
- 建议: 将不变的 style 对象提取为模块级常量（如 `const flexRow = { display: "flex" } as const`），或使用 `useMemo` 缓存动态部分。

### [P1-7] 重复的 toggle 模式在 selection factories 中出现 4 次
- 位置: `src/appExtracted/appGraphMeasurementFactories.tsx:1628-1636, 1644-1651, 1680-1683, 3662-3666`
- 类型: 重复
- 描述: `current.includes(x) ? current.filter(item => item !== x) : [...current, x]` 这种 toggle 模式至少出现 4 次，逻辑完全相同。
- 建议: 提取为 `toggleInArray<T>(arr: T[], item: T): T[]` 工具函数。

---

## P2 一般

### [P2-1] magic number 散布全文
- 位置: 多处：L1544 (`120` ms flyout 延迟), L1047 (`24` terminal stub), L638 (`4` padding), L4806 (`17` font options count, `8` start size), L3800 (`49` undo stack limit), L4159 (`3` defaultDecimals), L4163 (`14` defaultFontSize), L4164 (`"500"` defaultFontWeight)
- 类型: 风格
- 描述: 约 15+ 处裸数字常量没有命名，阅读代码时无法理解其业务含义，修改时也容易遗漏关联位置。
- 建议: 提取为具名常量并集中管理。如 `MEASUREMENT_DEFAULT_FONT_SIZE = 14`、`UNDO_STACK_MAX_DEPTH = 50`、`FLYOUT_CLOSE_DELAY_MS = 120`。

### [P2-2] measurementProfileItemsComplianceMessage 函数过长（~80 行）
- 位置: `src/appExtracted/appGraphMeasurementFactories.tsx:3990-4070`（估计）
- 类型: 简化
- 描述: 单函数内执行类型校验、位置校验、关联字段校验、重复检测四种逻辑，嵌套层级深，可读性差。
- 建议: 拆分为 `validateMeasurementType`、`validatePosition`、`validateAssociatedField`、`detectDuplicateBindings` 四个小函数，主函数仅负责编排。

### [P2-3] 测试文件从 6 个不同源文件导入，实为集成测试
- 位置: `src/appGraphMeasurementFactories.test.ts:1-27`
- 类型: 风格
- 描述: 测试同时导入 `appGraphMeasurementFactories`、`appProjectCanvasFactories`、`appSelectionDragFactories`、`appToolbarHookFactories`、`customDeviceUtils`、`measurements`、`model`、`svgExportUtils` 共 8 个模块。跨模块依赖使测试脆弱——任一被导入模块的内部变更都可能导致测试失败。
- 建议: 按被测模块拆分为独立测试文件（`appGraphMeasurementFactories.test.ts`、`appProjectCanvasFactories.test.ts` 等），或在测试名前缀标注所测模块。

### [P2-4] 测试中大量重复 mock scope 构建
- 位置: `src/appGraphMeasurementFactories.test.ts` 多处（如 L148-170, L846-870）
- 类型: 重复
- 描述: 每个 test 都手工构造包含 20+ 字段的 `__appScope` mock 对象，大量字段（如 `isBusNode: () => false`、`visibleNodeIdSet: new Set()`）在多个 test 中完全相同。
- 建议: 创建 `createMockScope(overrides)` builder 函数，提供合理默认值，test 中仅覆盖差异字段。或使用 `test.each` 参数化相似测试。

### [P2-5] fireSelectChange helper 对 antd Select 的 onChange 模拟可能不准确
- 位置: `src/appGraphMeasurementFactories.test.ts:50-56`
- 类型: bug
- 描述: `fireSelectChange` 对 antd `<Select>` 直接传 `value` 给 `onChange`，但对 native `<select>` 传 `{ target: { value } }`。antd Select 的实际 onChange 签名可能因版本而异（某些版本传 `(value, option)` 两参数），直接调用 `props.onChange(value)` 可能在 antd 升级后静默失败。
- 建议: 检查当前 antd 版本的 Select onChange 签名，确保测试模拟与之一致。考虑引入 antd 测试工具或直接在 rendered output 上断言。

### [P2-6] edgeReferenceDiffIds 先比较顺序再退化为 Map 比较，逻辑冗余
- 位置: `src/appGraphMeasurementFactories.tsx:3008-3035`
- 类型: 效率
- 描述: 先调用 `edgeListsHaveSameOrder`（遍历一次），若顺序相同则逐索引比较；否则构建两个 Map 再遍历。`edgeListsHaveSameOrder` 本身也已做全量遍历。最坏情况下（顺序不同），总共遍历 3 次 + 2 次 Map 构建。
- 建议: 直接用 Map 方案统一处理，省去 `edgeListsHaveSameOrder` 快速路径——它在大多数实际场景中（拖拽、bulk move）不会命中，反而增加额外遍历。

### [P2-7] createSetNodes 缩进不一致
- 位置: `src/appExtracted/appGraphMeasurementFactories.tsx:9-17`
- 类型: 风格
- 描述: 函数体内第一行解构（L11）缩进 2 空格，而 `setGraphStore` 调用（L12-16）缩进 4 空格，暗示解构行可能被错误地减少了缩进。同一模式在 `createSetEdges`（L19-27）、`createSetGraphArrays`（L29-36）等后续 factory 中一致出现。
- 建议: 统一所有 factory 函数的解构行缩进风格，要么全 2 空格要么全 4 空格。配置 ESLint/Prettier 规则防止回归。

### [P2-8] 测试中 isButtonLike 对 forwardRef 的检测过于宽松
- 位置: `src/appGraphMeasurementFactories.test.ts:63-66`
- 类型: 简化
- 描述: `isButtonLike` 通过 `element.props.onClick !== undefined` 判断是否为按钮类元素。但任何带 `onClick` 的 div/span 也会被误判为 button，可能在遍历 React tree 时产生意外行为。
- 建议: 增加 `element.type === "button"` 或检查 `element.type.displayName === "Button"` 等更精确的条件。

---

## P3 轻微

### [P3-1] 未使用的导入 Select, Tooltip, InputNumber 仅在 JSX 块使用
- 位置: `src/appExtracted/appGraphMeasurementFactories.tsx:2`
- 类型: 死代码
- 描述: 文件顶部导入的 `Select`、`Tooltip`、`InputNumber` 仅在 4700+ 行的 JSX 块中使用。如果将 JSX 提取为独立组件，这些导入可随之移走，减少 factory 文件的依赖面。
- 建议: 随 P1-5（JSX 提取）一并处理。

### [P3-2] createMarkGraphicContextMenuHandled 使用 setTimeout(fn, 0) 清除标记
- 位置: `src/appExtracted/appGraphMeasurementFactories.tsx:108-111`
- 类型: 效率
- 描述: 使用 `setTimeout(() => { ref.current = false }, 0)` 延迟重置标记。这种 "宏任务末尾重置" 模式依赖事件循环时序，在不同浏览器或高负载场景下时序不稳定。
- 建议: 如目的是 "同一事件循环内的消费"，改用 `queueMicrotask` 语义更明确；如目的是 "下一帧清除"，使用 `requestAnimationFrame`。

### [P3-3] 测试文件缺少对边界条件的覆盖
- 位置: `src/appGraphMeasurementFactories.test.ts` 全文
- 类型: 效率
- 描述: 1537 行测试代码主要覆盖正常路径，缺少对以下边界条件的测试：空 `items` 数组、`measurementTypeId` 为空字符串、`position` 为 undefined、`parameterDefinitions` 为空数组、重复 binding 的第三行及后续行。
- 建议: 补充 `test.each` 参数化边界用例，特别是 validation 逻辑的负面路径。

### [P3-4] extractAllText 测试 helper 未处理 Fragment 的特殊渲染
- 位置: `src/appGraphMeasurementFactories.test.ts:69-78`
- 类型: 简化
- 描述: `extractAllText` 通过 `Children.toArray` + 递归提取文本，但 antd Select 的 option 在 Fragment 中的渲染结构可能因 React 版本而异。当前实现对 `options` prop 做了特判，但对 `Fragment` 包裹的 native option 列表未做特殊处理。
- 建议: 如测试已覆盖足够场景则无需修改；如出现断言失败，优先检查 Fragment 展开逻辑。

### [P3-5] 多处 factory 函数返回闭包捕获了 __appScope 引用，可能导致 stale closure
- 位置: 全文模式（如 L9-17 `createSetNodes`）
- 类型: 内存
- 描述: 每个 `create*` 返回的闭包持有 `__appScope` 引用。如果 `__appScope` 在 React 组件中创建且包含 state setter，闭包生命周期超过组件时可能导致内存泄漏或 stale state。当前通过 ref 模式（如 `canvasBoundsRef.current`）部分规避了此问题，但仍有部分 factory 直接捕获 state setter。
- 建议: 确保所有 factory 返回的闭包在组件卸载时被正确清理，或确保 `__appScope` 本身使用 ref 包裹 state setter。
