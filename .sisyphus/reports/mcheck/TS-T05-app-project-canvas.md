# T05 appProjectCanvasFactories 审查报告（tsx + test）

## 概览

| 指标 | 值 |
|------|-----|
| TSX 行数 | 5775 行 |
| Test 行数 | 1796 行 |
| 导出 factory 函数数 | ~60+ |
| JSX 区块估计 | ~1100 行（量测编辑器面板，约占总文件 19%） |
| 发现总数 | 18 |
| 数据/配置块占比估计 | ~15%（量测表格列定义、选项列表、对齐方向映射等） |

文件整体架构：每个 factory 函数接收 `__appScope: Record<string, any>`，在闭包内解构 20-50 个属性后返回业务函数。JSX 部分嵌入在 `createMeasurementEditorPanel` 等 factory 中。

---

## P0 严重

### [P0] 整个 5775 行文件禁用 TypeScript 类型检查
- 位置: `appProjectCanvasFactories.tsx:1`
- 类型: bug
- 描述: `// @ts-nocheck` 关闭了全部类型检查。在一个包含 60+ 导出函数、大量 `Record<string, any>` 解构和复杂业务逻辑的文件中，这意味着所有属性拼写错误、参数类型不匹配、返回值偏差均不会被编译器发现。任何 scope 属性重命名后，调用侧不会报任何编译错误，只会在运行时静默 undefined。
- 建议: 作为第一步，替换为 `// @ts-check` 并逐步修复报错；中期目标是为 `__appScope` 定义精确的 interface（可按功能域拆分为 `CanvasScope`、`SchemeScope`、`MeasurementScope` 等），最终消除 `@ts-nocheck`。

### [P0] `showGlobalMessage` / `showGlobalConfirm` 作为未导入的全局变量使用
- 位置: `appProjectCanvasFactories.tsx:17,23,543,549,3008,3012,3041,3045,5090,5551` 等
- 类型: bug
- 描述: `showGlobalMessage(...)` 和 `showGlobalConfirm(...)` 未在文件顶部 import，直接以全局函数形式调用。配合 `@ts-nocheck`，若全局注入时机变化或函数重命名，不会有任何编译时提示，只在运行时报 `ReferenceError`。且全局变量无法被 tree-shaking 或静态分析追踪。
- 建议: 将 `showGlobalMessage` 和 `showGlobalConfirm` 加入 `__appScope` 解构（与 `writeOperationLog` 等同类处理），或从统一模块 import。

---

## P1 重要

### [P1] `__appScope: Record<string, any>` 模式导致零类型安全
- 位置: `appProjectCanvasFactories.tsx` 所有 60+ 个 factory 函数签名
- 类型: bug
- 描述: 每个 factory 函数参数类型为 `Record<string, any>`，解构的属性名完全不受类型系统约束。属性名拼写错误、缺失属性、类型不匹配均不会报错。这是一个系统性的类型安全隐患，贯穿整个文件。
- 建议: 定义 `AppScope` interface（或按职责拆分 `CanvasScope`、`SchemeScope`、`ProjectScope`），将 factory 参数类型从 `Record<string, any>` 改为精确类型。可渐进式进行：先为一个 factory 定义类型，验证可行后逐步推广。

### [P1] 测试中 `showGlobalMessage` mock 方式不一致，存在泄漏风险
- 位置: `appProjectCanvasFactories.test.ts:310,501,547,1520,1639`
- 类型: bug
- 描述: 部分测试使用 `vi.stubGlobal("showGlobalMessage", showGlobalMessage)`（line 501, 547），另一部分使用 `(globalThis as any).showGlobalMessage = showGlobalMessage`（line 310, 1520, 1639）。`globalThis` 赋值不会在测试结束后自动清理，会导致后续测试中 `showGlobalMessage` 被意外调用到 mock 函数上，产生断言误判。
- 建议: 统一使用 `vi.stubGlobal`，或在 `afterEach` 中统一清理；若需保留 `globalThis` 方式，至少添加 `afterEach(() => { delete (globalThis as any).showGlobalMessage })`。

### [P1] JSX 中大量 inline 箭头函数，量测表格每次渲染重建回调
- 位置: `appProjectCanvasFactories.tsx:4008-4023,4065-4068,4075-4091,4117-4140`
- 类型: 性能
- 描述: 量测表格每行 `selectedProfileItems.map(...)` 内部，`onClick`、`onChange` 均为 inline 箭头函数，且闭包捕获 `itemIndex`、`item` 等变量。当 `selectedProfileItems` 有 N 行时，每次父组件渲染会创建 N×6+ 个新函数引用。如果 `BufferedInput`、`Select` 等子组件做了 `React.memo` 优化，这些 inline handler 会导致 memo 失效。
- 建议: 将行级回调提取为 `useCallback`（通过 `itemIndex` 参数化），或传递给子组件时配合 `useCallback` + 数据查找模式。若短期内不引入 memo，可标注为已知问题。

### [P1] 重复计算 `targetScheme.projects.map(p => p.name)`
- 位置: `appProjectCanvasFactories.tsx:3525-3526`
- 类型: 效率
- 描述: 同一个 `targetScheme.projects.map((project) => project.name)` 表达式被计算了两次——一次传给 `uniqueRecordName` 作为 `existingNames`，一次直接传给 `promptUniqueRecordName` 的 `existingNames` 参数。当 projects 列表较大时产生不必要的 O(n) 遍历和数组分配。
- 建议: 提取为局部变量 `const targetNames = targetScheme.projects.map(p => p.name)`，两处共用。

---

## P2 一般

### [P2] 文件体积极大（5775 行），应拆分
- 位置: `appProjectCanvasFactories.tsx` 全文
- 类型: 抽象层次
- 描述: 单文件包含画布操作（散开/对齐/分布）、方案管理（新建/重命名/复制/删除/拖拽冲突）、项目模型管理（复制/删除/粘贴冲突）、量测编辑器 JSX、视口控制（fit/zoom）等至少 5 个不同职责域的 60+ factory。文件过大导致导航困难、合并冲突频繁、代码审查效率低。
- 建议: 按职责域拆分为 `canvasLayoutFactories.tsx`、`schemeRecordFactories.ts`、`projectRecordFactories.ts`、`measurementEditorPanel.tsx`、`viewportFactories.ts` 等。

### [P2] 缩进不一致：factory 函数体首行与解构行缩进错位
- 位置: `appProjectCanvasFactories.tsx:12-13,553-554,1538-1539` 等所有 factory
- 类型: 风格
- 描述: 每个 factory 的 `return` 箭头函数体内，第一行解构赋值使用 2 空格缩进（与外层 `export function` 对齐），而后续代码使用 4 空格缩进。例如 line 12-13 中 `const { CANVAS_AUTO_EXPAND_PADDING, ... } = __appScope;` 缩进为 4 空格（相对于 return 函数体应该是 2 或 4，但与 line 14 之后的代码对比明显错位）。
- 建议: 统一使用 Prettier/ESLint 格式化，或手动统一为 2 空格相对缩进。

### [P2] 魔法数字散布
- 位置: `appProjectCanvasFactories.tsx:2012(2000),2014(240,4),5561(96),5567(80),5577(5),5594(120)`
- 类型: 风格
- 描述: `schedulePostRouteMeasurementReflow(240, 4)` 中 `240` 和 `4` 的含义不明；`fitViewToBounds` 默认参数 `padding=96`、`maxZoomPercent=2000`、最小尺寸 `80`、最小缩放 `5` 等均缺少命名常量或注释说明用途。
- 建议: 提取为命名常量（如 `MEASUREMENT_REFLOW_DELAY_MS = 240`、`MEASUREMENT_REFLOW_MAX_ITERATIONS = 4`、`FIT_VIEW_DEFAULT_PADDING = 96`）并附简短注释。

### [P2] `window.prompt()` 阻塞式用户输入
- 位置: `appProjectCanvasFactories.tsx:2039,2545,3002,3035`
- 类型: 风格
- 描述: 自动对齐网格间距、方案新建/重命名等操作使用 `window.prompt()` 获取用户输入。该 API 为同步阻塞式，无法自定义样式，在现代 Web 应用中属于过时 UX 模式，且会被浏览器弹窗拦截设置屏蔽。
- 建议: 替换为 antd `Modal.confirm` 或自定义 Dialog 组件，配合表单输入。可作为 UX 改进 backlog 跟踪。

### [P2] 1100+ 行 JSX 嵌入 factory 函数，UI 与逻辑无法独立测试
- 位置: `appProjectCanvasFactories.tsx:~3700-4800`
- 类型: 抽象层次
- 描述: 量测编辑器面板的 JSX 代码（约 1100 行）直接嵌入 `createMeasurementEditorPanel` factory 函数中，与业务逻辑（量测类型增删改、关联字段管理、颜色/边框配置）深度耦合。该 JSX 块无法独立进行组件测试，也无法被其他页面复用。
- 建议: 将 JSX 部分提取为独立 React 组件（如 `MeasurementProfileEditor`），通过 props/callback 与 factory 逻辑交互。

### [P2] 测试中 `createSaveCurrentProject` scope 构造重复且冗长
- 位置: `appProjectCanvasFactories.test.ts:174-207,796-860`
- 类型: 重复
- 描述: `createSaveCurrentProject` 的测试需要构造 30+ 个属性的 scope 对象，两个相关测试（line 174 和 line 803）各自独立构造了几乎完整的 mock scope，大量属性为 `vi.fn()` 或空对象。虽然有 `createLoadScope` helper 用于 `createLoadSavedProject`，但 `createSaveCurrentProject` 没有类似 helper。
- 建议: 提取 `createSaveScope(overrides)` helper 函数，提供合理默认值，测试只覆盖差异属性。

### [P2] 测试中多处重复的 `createFinishRoutableLineEndpointDrag` scope 构造
- 位置: `appProjectCanvasFactories.test.ts:228-262,286-335,460-518`
- 类型: 重复
- 描述: 三个 `createFinishRoutableLineEndpointDrag` 相关测试各自构造了几乎相同的 scope 对象（包含 `nodeById`、`patchGraphNodes`、`routableLineEndpointDrag`、`setRoutableLineEndpointDrag` 等 15+ 个 mock），仅在节点类型和 `dropTarget` 上有差异。虽然 line 521 提取了 `modelAssociationEndpointRewireScope` helper，但前两个测试（line 228, 286）未使用该 helper。
- 建议: 将 line 228 和 286 的测试也改用 `modelAssociationEndpointRewireScope` helper，通过参数控制差异。

---

## P3 轻微

### [P3] 测试使用 `as any` 类型断言绕过类型检查
- 位置: `appProjectCanvasFactories.test.ts:1042,1055,900,945`
- 类型: 风格
- 描述: 多处使用 `scope as any`、`as any` 将 mock scope 强制断言后传入 factory 函数。这虽然在生产代码中不影响运行，但掩盖了测试 mock 与真实 scope interface 之间的不一致，降低了测试的可信度。
- 建议: 当 `__appScope` 类型化后（P1 建议），逐步移除 `as any`，让编译器验证 mock 的完整性。

### [P3] `createCommitRoutableLineDevice` 闭包缩进异常
- 位置: `appProjectCanvasFactories.tsx:11-13`
- 类型: 风格
- 描述: `createCommitRoutableLineDevice` 返回的 async arrow function 首行缩进为 2 空格（line 12），而 `const { ... } = __appScope` 解构行（line 13）缩进为 4 空格，后续代码又回到 4 空格。整体缩进不一致。
- 建议: 运行 Prettier 统一格式化。

### [P3] 测试覆盖率缺口：多个导出 factory 无测试
- 位置: `appProjectCanvasFactories.test.ts` 全文
- 类型: 效率
- 描述: TSX 文件导出 60+ factory 函数，但测试文件仅覆盖了约 12 个（`createRequestUnsavedChangeAction`、`createResolveUnsavedChangeAction`、`createFinishRoutableLineEndpointDrag`、`createCommitRoutableLineDevice`、`createFinishConnectToTarget`、`createFinishRoutableLineToTarget`、`createHandlePointerMove`、`createLoadSavedProject`、`createRunTopologyCalculation`、`createSaveCurrentProject`、`createStartRoutableLineFromTerminal`、`createAutoSpreadCanvasGraphics`）。大量核心 factory（如方案管理、视口控制、自动对齐/分布、项目复制/删除）完全无测试覆盖。
- 建议: 按业务优先级补充关键路径测试，至少覆盖方案 CRUD、项目复制/删除、视口 fit/zoom 等高频操作。

### [P3] `createAutoSpreadCanvasGraphics` 内 `schedulePostRouteMeasurementReflow` 延迟/次数硬编码
- 位置: `appProjectCanvasFactories.tsx:2012-2014`
- 类型: 风格
- 描述: `schedulePostRouteMeasurementReflow(240, 4)` 中的 `240`（毫秒延迟）和 `4`（最大迭代次数）为硬编码，且函数内部还有 `2000`（最大总延迟上限）。这些值影响自动散开的响应速度和收敛行为，但不易调节。
- 建议: 提取为模块级常量或 `__appScope` 配置项。

---

## 统计

| 优先级 | 数量 |
|--------|------|
| P0 严重 | 2 |
| P1 重要 | 4 |
| P2 一般 | 7 |
| P3 轻微 | 5 |
| **合计** | **18** |
