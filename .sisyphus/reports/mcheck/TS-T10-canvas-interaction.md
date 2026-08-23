# T10 appCanvasInteractionFactories 审查报告（tsx + test）

## 概览

| 指标 | 值 |
|------|-----|
| TSX 行数 | 4786 |
| Test 行数 | 1014 |
| 总行数 | 5800 |
| 发现总数 | 19 |
| P0 严重 | 2 |
| P1 重要 | 6 |
| P2 一般 | 7 |
| P3 轻微 | 4 |
| 数据块占比估计 | ~15%（JSX 渲染块集中在 2900-3100、3950-4060 区域） |
| 工厂函数数量 | ~85 个 `create*` 导出 |

文件采用统一的工厂模式：每个 `create*(__appScope)` 闭包解构 `__appScope` 中的依赖，返回业务函数。模式一致但导致每个函数头部有极长的解构声明。

---

## P0 严重

### [P0-1] `@ts-nocheck` 禁用全部 TypeScript 类型检查

- 位置: `appCanvasInteractionFactories.tsx:1`
- 类型: 安全
- 描述: 整个 4786 行文件使用 `// @ts-nocheck` 跳过类型检查，所有类型错误（包括参数类型不匹配、返回值错误、属性拼写）在编译期完全不可见。对于一个处理画布几何、拖拽状态、连接端子的核心交互文件，类型安全缺失风险极高。
- 建议: 逐步移除 `@ts-nocheck`，先为 `__appScope` 定义精确接口类型（至少为高频工厂如 `createFinishDraggingMove`、`createFindConnectTargetAtPoint`），用 `Record<string, any>` 的精确替代版本替换。可分阶段：先 `@ts-check` + JSDoc，再迁移到完整 TS 接口。

### [P0-2] Bus 端子回退 `"t1"` 构造了不存在的 phantom terminal ID

- 位置: `appCanvasInteractionFactories.tsx:4682`, `appCanvasInteractionFactories.tsx:4716`, `appCanvasInteractionFactories.tsx:4761`
- 类型: bug
- 描述: 在 `createFindRewireTargetAtPoint`、`createFindConnectTargetAtPoint`、`createFindRoutableLineEndpointTargetAtPoint` 三个 hit-test 工厂中，当 bus 节点 `node.terminals[0]` 为 `undefined` 时，回退使用硬编码字符串 `"t1"` 作为 `terminalId`。该 ID 可能不对应任何真实端子，后续 `canConnectTerminals` 可能通过（如果校验不严），导致连接到不存在的端子；或者 `getTerminalPoint` 返回错误坐标。
- 建议: 当 `node.terminals` 为空时直接 `continue` 跳过该 bus 节点，而非构造虚假 terminalId。或改为调用 `getBusTerminalType(node)` 获取真实端子 ID（已在 `createFindRoutableLineEndpointTargetAtPoint:4763` 中使用此方法）。

---

## P1 重要

### [P1-1] 三个 hit-test 工厂存在 ~200 行近乎相同的 bus/terminal 遍历逻辑

- 位置: `appCanvasInteractionFactories.tsx:4661-4698` (`createFindRewireTargetAtPoint`), `appCanvasInteractionFactories.tsx:4700-4738` (`createFindConnectTargetAtPoint`), `appCanvasInteractionFactories.tsx:4740-4786` (`createFindRoutableLineEndpointTargetAtPoint`)
- 类型: 重复
- 描述: 三个函数共享相同的空间索引查询 → bus 节点判断 → terminal 距离遍历 → `canConnectTerminals` 校验流程，仅在排除条件（排除源节点 / 排除自身 / 排除已连接端）和返回值构造上有细微差异。200+ 行重复代码增加了不一致修改的风险（如 P0-2 的 phantom terminalId 问题在两处出现但未在第三处统一修复）。
- 建议: 抽取 `findTargetAtPointCore(scope, point, options)` 内部工具函数，接受 `excludeNode`、`excludeTerminal`、`terminalTypeFilter` 等参数。三个工厂仅传入不同的过滤条件和返回映射。

### [P1-2] `createFinishDraggingMove` 解构 80+ 个变量，认知负荷极高

- 位置: `appCanvasInteractionFactories.tsx:1075-1351`
- 类型: 抽象层次
- 描述: 单个工厂函数从 `__appScope` 解构超过 80 个依赖（行 1081），函数体 275 行。这是典型的 God Function，包含 delta 安全计算、undo 快照、边调整、路由优化、快速提交、状态清理、操作日志等至少 6 个独立关注点。
- 建议: 将 commit 逻辑分为子步骤：(1) `computeFinalDelta` (2) `adjustAndFinalizeEdges` (3) `commitGraphPatch` (4) `cleanupDragState`。每个子步骤可以作为独立工厂，由 `createFinishDraggingMove` 编排。

### [P1-3] 二分搜索固定 12 次迭代无收敛检查

- 位置: `appCanvasInteractionFactories.tsx:588-599`
- 类型: 效率
- 描述: `createNearestBoundarySafeDelta` 中二分搜索固定执行 12 次迭代，精度达 `range / 4096`。但没有提前收敛判断——即使 `isSafeDelta` 在第三次迭代就已稳定，仍会执行剩余 9 次无意义计算。对于高频调用的拖拽路径（每帧多次），浪费可避免。
- 建议: 增加提前退出条件：当 `Math.abs(high.x - low.x) < 0.5 && Math.abs(high.y - low.y) < 0.5` 时 break。或改用 `while (hi - lo > epsilon)` 模式。

### [P1-4] `setPointerCapture` 无配对的 `releasePointerCapture`

- 位置: `appCanvasInteractionFactories.tsx:4511`
- 类型: 内存
- 描述: `createStartGroupTransformDrag` 返回的 handler 在 `event.currentTarget.setPointerCapture(event.pointerId)` 后，对应的 `createFinishTransformDrag`（line 1353）和 `createCancelActiveEditInteractions`（line 1015）均未调用 `releasePointerCapture`。虽然浏览器在 pointerup 时会自动释放，但如果拖拽被 Escape 键取消（走 `cancelActiveEditInteractions` 路径），pointer capture 可能残留，导致后续鼠标事件被错误捕获。
- 建议: 在 `createCancelActiveEditInteractions` 或 `createFinishTransformDrag` 中添加 `svgRef.current?.releasePointerCapture(pointerId)` 调用，需保存 pointerId 到 transformDrag 状态中。

### [P1-5] `createCommitNodeFootprintUpdates` 解构 50+ 变量，逻辑分支深

- 位置: `appCanvasInteractionFactories.tsx:2089-2310`
- 类型: 抽象层次
- 描述: 函数体超 220 行，解构约 50 个依赖（行 2094），包含 canvas 扩展、origin shift、路由优化、undo 快照等多个关注点嵌套交织。
- 建议: 将 canvas 扩展逻辑和路由优化逻辑各自抽取为独立工厂函数，主函数只负责编排。

### [P1-6] 测试覆盖严重不足——85 个工厂仅测试 14 个

- 位置: `appCanvasInteractionFactories.test.ts:1-17`（import 列表）
- 类型: 重复
- 描述: 测试文件仅覆盖 14 个工厂函数（`createApplyBatchCommonParam`、`createFindConnectTargetAtPoint` 等），核心拖拽流程（`createFinishDraggingMove`、`createApplyNodeDragMove`）、键盘移动、画布尺寸变更、transform 拖拽等均无测试。这些正是最容易出现几何计算 bug 的区域。
- 建议: 优先为几何计算类工厂（delta 裁剪、snap 吸附、边界 clamp）补充单元测试，这些函数输入输出明确，最适合单元测试。

---

## P2 一般

### [P2-1] `createIsPointOnBus` 是冗余包装函数

- 位置: `appCanvasInteractionFactories.tsx:4647-4652`
- 类型: 死代码
- 描述: 函数仅调用 `isPointNearBus(node, point, 0)` 并返回结果，是 `isPointNearBus` 的零价值包装。如果 `isPointNearBus` 已存在于 scope 中，调用方可直接使用。
- 建议: 内联调用或将 `isPointNearBus` 直接暴露给消费者。

### [P2-2] JSX 渲染工厂与纯逻辑工厂混杂在同一文件

- 位置: `appCanvasInteractionFactories.tsx:2900-3100`（NodeDoubleClickDialog）, `appCanvasInteractionFactories.tsx:3950-4060`（SidePanel）
- 类型: 抽象层次
- 描述: 文件同时包含纯几何/状态逻辑工厂和 React JSX 渲染组件工厂。JSX 块（`<section>`, `<Button>`, `<table>`）出现在逻辑工厂文件中，破坏了文件"交互逻辑"的内聚性，且 JSX 部分无法被纯逻辑测试覆盖。
- 建议: 将 JSX 渲染工厂（`createRenderNodeDoubleClickDialog`、`createRenderSidePanelModeControls`、`createRenderSidePanelEdgeTrigger`）迁移到独立的 `appCanvasInteractionComponents.tsx` 或对应组件文件。

### [P2-3] 测试中大量使用 `as any` 类型断言

- 位置: `appCanvasInteractionFactories.test.ts:47`, `appCanvasInteractionFactories.test.ts:510`, `appCanvasInteractionFactories.test.ts:546` 等
- 类型: 风格
- 描述: 测试代码中至少 15 处使用 `as any` 绕过类型检查，包括节点对象、drawing 状态、scope 模拟等。这掩盖了测试数据与真实数据结构的差异。
- 建议: 为测试 fixture 定义最小接口类型（如 `Partial<ModelNode>`），使用 `satisfies` 或工厂函数生成类型安全的测试数据。

### [P2-4] 测试 scope mock 在 describe 块间重复

- 位置: `appCanvasInteractionFactories.test.ts:50-64`（commonScope）, `appCanvasInteractionFactories.test.ts:512-542`（createSmartAlignmentScope）
- 类型: 重复
- 描述: `commonScope` 和 `createSmartAlignmentScope` 包含大量相似的 mock 函数和常量定义（`queryNodeSpatialIndex`、`clampPointToCanvas`、`updateSmartAlignmentGuides` 等）。不同 describe 块各自维护独立的 scope 工厂，无法共享。
- 建议: 抽取 `createBaseTestScope(overrides?)` 共享工厂，各 describe 仅覆盖差异化配置。

### [P2-5] 魔术数字散布

- 位置: `appCanvasInteractionFactories.tsx:588`（二分迭代 12 次）, `appCanvasInteractionFactories.tsx:4012`（Icon size 15）, `appCanvasInteractionFactories.tsx:4057`（Icon size 17）, `appCanvasInteractionFactories.tsx:4068`（最小尺寸 4）
- 类型: 风格
- 描述: 多处使用硬编码数字而非命名常量。二分搜索精度、图标尺寸、最小框体尺寸等均应有语义化常量。
- 建议: 提取为文件顶部的常量声明：`BINARY_SEARCH_ITERATIONS = 12`、`PANEL_ICON_SIZE_SMALL = 15`、`PANEL_ICON_SIZE_LARGE = 17`、`MIN_STATIC_BOX_DIMENSION = 4`。

### [P2-6] `createContextMenuPlacement` 重复计算 `contextMenuPlacement`

- 位置: `appCanvasInteractionFactories.tsx:3068-3091`
- 类型: 效率
- 描述: `createContextMenuStyle`（line 3069）和 `createContextMenuClassName`（line 3083）各自调用 `contextMenuPlacement(menu)` 重新计算 placement。在一次渲染中 placement 被计算两次，虽然计算量不大但违反单一计算原则。
- 建议: 在组件层面计算一次 placement，将结果同时传给 style 和 className 构造函数。

### [P2-7] 测试未验证 `updateSmartAlignmentGuides([])` 在取消/完成时被调用

- 位置: `appCanvasInteractionFactories.test.ts:544-565`
- 类型: 效率
- 描述: smart alignment 测试验证了 preview 和 commit 的 snapped point 一致性，但未验证 `updateSmartAlignmentGuides` 在绘制完成/取消时被清空（传空数组）。这是对齐引导线残留的关键 bug 场景。
- 建议: 添加断言 `expect(updateSmartAlignmentGuides).toHaveBeenCalledWith([])` 在 finish/cancel 测试中。

---

## P3 轻微

### [P3-1] 工厂函数命名过长

- 位置: 多处，如 `createResolveLibraryPlacementSmartAlignmentPoint`（line 3514）、`createUpdateInteractiveStaticDrawingPreview`
- 类型: 风格
- 描述: 部分工厂名超过 50 字符，降低了可读性和 import 语句的整洁度。
- 建议: 考虑缩短：`createResolveLibraryPlacementSmartAlignmentPoint` → `createLibraryPlacementSnapPoint`。

### [P3-2] `createToLocalNodePoint` 旋转方向注释缺失

- 位置: `appCanvasInteractionFactories.tsx:4072-4082`
- 类型: 风格
- 描述: 函数使用 `degreesToRadians(-node.rotation)` 做逆变换，但未注释为何取负号（将世界坐标转为节点本地坐标的逆旋转）。对于几何变换代码，缺少意图注释会增加维护者的理解成本。
- 建议: 添加单行注释：`// 逆变换：世界坐标 → 节点本地坐标，旋转取反`。

### [P3-3] 测试中 `vi.fn()` 未验证调用次数

- 位置: `appCanvasInteractionFactories.test.ts:60`（`isRoutableLineDeviceKind: vi.fn(() => false)`）
- 类型: 效率
- 描述: 多个 mock 函数设置了返回值但从未用 `expect().toHaveBeenCalled()` 验证是否被调用。这意味着即使代码路径改变导致该函数不再被调用，测试仍然通过。
- 建议: 对关键路径 mock 添加调用次数断言，确保测试确实验证了预期的代码路径。

### [P3-4] `createBusAnchorFromEvent` 与 `createBusAnchorFromPoint` 功能重叠

- 位置: `appCanvasInteractionFactories.tsx:4626-4644`
- 类型: 重复
- 描述: `createBusAnchorFromEvent` 仅比 `createBusAnchorFromPoint` 多了一步 `screenToSvgPoint` 坐标转换。两者可以合并为一个工厂，接受 `Point | PointerEvent` 参数。
- 建议: 合并为单一工厂或在 `createBusAnchorFromEvent` 中直接调用 `createBusAnchorFromPoint` 的返回值。

---

## 统计汇总

| 优先级 | 数量 |
|--------|------|
| P0 严重 | 2 |
| P1 重要 | 6 |
| P2 一般 | 7 |
| P3 轻微 | 4 |
| **合计** | **19** |
