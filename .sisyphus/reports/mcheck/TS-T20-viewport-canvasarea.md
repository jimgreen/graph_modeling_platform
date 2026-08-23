# T20 viewport/canvasArea 审查报告

## 概览

| 维度 | 数值 |
|------|------|
| 文件数 | 4 |
| 总行数 | 3500 (1488 + 1585 + 56 + 371) |
| 发现总数 | 17 |
| P0 严重 | 2 |
| P1 重要 | 6 |
| P2 一般 | 5 |
| P3 轻微 | 4 |

---

## P0 严重

### [P0-1] 全部文件 @ts-nocheck，3500 行零类型保护
- 位置: appCanvasViewportBatch.tsx:1, appCanvasArea.tsx:1, appCanvasViewportCalculations.ts:1, canvasViewport.ts (唯一例外)
- 类型: 风格
- 描述: appCanvasViewportBatch.tsx、appCanvasArea.tsx、appCanvasViewportCalculations.ts 三个文件首行均为 `// @ts-nocheck`。视口坐标计算、缩放锚点、滚卷映射等核心数学逻辑完全没有类型检查，`__appScope: Record<string, any>` 贯穿所有工厂函数，属性名拼写错误在编译期不可见。canvasViewport.ts 是唯一有类型的文件，但其导出函数被无类型文件消费时参数/返回值约束丢失。
- 建议: 逐步移除 @ts-nocheck。优先为 canvasViewport.ts 的导出类型在消费侧添加显式类型标注；为 `__appScope` 定义 `AppScope` interface 并缩小为 `Partial<AppScope>` 参数解构。

### [P0-2] generatedStateIconVisualTransform 每次渲染为每个节点创建多个 RegExp
- 位置: appCanvasArea.tsx:39, 49, 54
- 类型: 性能
- 描述: `readStateIconSvgNumber` 在 L39 用 `new RegExp(...)` 每次调用都构造正则；`generatedStateIconVisualTransform` 在 L49、L54 也各创建一个 RegExp。该函数在节点渲染循环中对每个有 state-icon 的节点调用（约 L1047），节点数量多时产生大量短生命周期对象，触发 GC 压力。
- 建议: 将正则提升为模块级 `const` 常量。`readStateIconSvgNumber` 的 name 参数化正则需要改为固定名称映射或缓存 `Map<string, RegExp>`。

---

## P1 重要

### [P1-1] areCanvasPropsEqual 比较器使用 any 且手动维护键列表
- 位置: appCanvasArea.tsx:160-227
- 类型: bug
- 描述: `areCanvasPropsEqual` 参数类型均为 `any`，且通过四个硬编码字符串数组 (`stateKeys`, `displayKeys`, `dataKeys`, `overlayKeys`) 逐一比较 scope 属性。如果未来在 scope 上新增属性但未加入任一数组，该属性变化不会触发 MemoizedCanvasArea 重渲染，导致 UI 与实际状态不同步。这种遗漏在 @ts-nocheck 下完全无编译期保护。
- 建议: 为 scope 定义具体 interface，比较器改为基于 interface key 的自动遍历或使用 `Object.is` 比较所有自身属性；至少添加单元测试覆盖所有 scope 键。

### [P1-2] setPointerCapture 7 处无对应 releasePointerCapture
- 位置: appCanvasArea.tsx:872, 886, 903, 920, 1445, 1458, 1565
- 类型: 内存
- 描述: 小地图导航（L1565）、canvas resize handle（L872/886/903/920）、节点/边浮动工具栏拖拽（L1445/1458）均调用 `setPointerCapture` 但未显式 `releasePointerCapture`。虽然 W3C 规范规定 pointerup 时自动释放，但若 pointer 被 cancel 或元素在 capture 期间被卸载（React 条件渲染），可能导致 pointer 事件丢失或元素引用残留。
- 建议: 在每个 `setPointerCapture` 对应的 `onPointerUp` / `onPointerCancel` 处理中显式调用 `releasePointerCapture`；或添加 `useEffect` cleanup 对挂载元素做兜底释放。

### [P1-3] wheelZoomFrameRef 的 rAF 清理分散在不同文件
- 位置: appCanvasViewportBatch.tsx:987 (声明), appToolbarHookFactories.tsx:3134-3136 (清理)
- 类型: 错误处理
- 描述: `wheelZoomFrameRef` 在 appCanvasViewportBatch.tsx 中声明和赋值 (`requestAnimationFrame`)，但其 `cancelAnimationFrame` 清理逻辑位于 appToolbarHookFactories.tsx 的一个独立 teardown 回调中。如果组件卸载路径不经过该 teardown，或 teardown 执行顺序变化，pending 的 rAF 回调会在已卸载组件的 scope 上执行 `setViewBox`，导致 React "setState on unmounted component" 警告或静默状态污染。
- 建议: 将 `cancelAnimationFrame(wheelZoomFrameRef.current)` 移到与 ref 声明同文件的 useEffect cleanup 中，确保生命周期一致。

### [P1-4] createFlushPendingWheelZoom 解构了未使用的 width/height
- 位置: appProjectCanvasFactories.tsx:1344
- 类型: 死代码
- 描述: `createFlushPendingWheelZoom` 从 `__appScope` 解构了 `height` 和 `width`，但函数体内从未引用这两个变量。这是从旧代码提取后遗留的死引用，增加认知负担且可能误导后续维护者以为这些值被使用。
- 建议: 删除解构中的 `height, width`。

### [P1-5] 缩放比例不一致：滚轮 vs 按钮使用不同 zoom factor
- 位置: appProjectCanvasFactories.tsx:1398 (1.12/0.88), appCanvasArea.tsx:1546,1549 (0.82/1.18)
- 类型: 风格
- 描述: 滚轮缩放使用 `deltaY > 0 ? 1.12 : 0.88`，而视口控制按钮使用 `zoomViewportAtCenter(0.82)` 放大和 `zoomViewportAtCenter(1.18)` 缩小。两处的缩放步进不同（~12% vs ~18%），用户体验不一致，且无命名常量说明设计意图。
- 建议: 提取为命名常量 `WHEEL_ZOOM_IN_FACTOR` / `BUTTON_ZOOM_IN_FACTOR`，并在产品文档中注明差异是否为刻意设计。

### [P1-6] __appScope 工厂模式导致闭包陈旧值风险
- 位置: appCanvasViewportCalculations.ts:6-56, appCanvasViewportBatch.tsx:全文
- 类型: bug
- 描述: `createXxx(__appScope)` 在闭包中捕获 `__appScope` 的属性引用（如 L17 `const { canvasDisplayOffsetX, canvasDisplayOffsetY, canvasScrollScale } = __appScope`）。如果 `__appScope` 的属性在创建后被原地更新（ref 同步模式 L989-995），闭包内的解构值不会自动更新。虽然当前代码通过 `__appScope` 的 object 引用来规避（解构的是原始值而非 ref），但 `createCanvasPointToSurfaceCss` 等函数在创建时即固化了当时的 `canvasDisplayOffsetX` 等值——如果这些值后续变化，闭包内的值不会跟随。
- 建议: 将解构改为函数体内实时读取：`return (point) => { const { canvasDisplayOffsetX, ... } = __appScope; return {...}; }`，确保每次调用都读最新值。

---

## P2 一般

### [P2-1] canvasResizeEdgeAnchorsAxis 使用长 OR 链替代 Set 查找
- 位置: canvasViewport.ts:46-50
- 类型: 简化
- 描述: `canvasResizeEdgeAnchorsAxis` 对 y 轴判断使用 `edge === "bottom" || edge === "corner" || edge === "top" || edge === "top-left" || edge === "top-right" || edge === "bottom-left"` 的 6 项 OR 链。可读性差且容易遗漏某个 edge 类型。
- 建议: 使用 `const Y_ANCHOR_EDGES = new Set(["bottom", "corner", "top", "top-left", "top-right", "bottom-left"])` 然后 `Y_ANCHOR_EDGES.has(edge)`。

### [P2-2] viewBoxSizePreservingCanvasUnitScale 的 Math.round 导致极端缩放时子像素抖动
- 位置: canvasViewport.ts:92-93
- 类型: 效率
- 描述: 在 bounds 变化后等比缩放 viewBox 尺寸时使用 `Math.round`。当 `nextBounds/currentBounds` 比率不是整数时（例如画布从 4000→3999），连续多次 bounds 微调会导致 viewBox 尺寸在两个整数值间反复跳动，表现为视觉上的微小抖动。
- 建议: 改为保留 1-2 位小数（`Math.round(v * 100) / 100`），仅在最终渲染时由 SVG 引擎处理亚像素。

### [P2-3] pendingWheelZoomRequestRef 累积缩放因子浮点误差
- 位置: appProjectCanvasFactories.tsx:1374-1375
- 类型: 效率
- 描述: 连续滚轮事件在同一 rAF 帧内累积时，`zoomFactor` 通过乘法叠加：`current.zoomFactor * zoomFactor`。快速连续滚动（例如 30 帧内 15 次 zoom in × 1.12）会导致浮点精度累积误差。虽然实际影响有限（IEEE 754 double 精度），但在极端情况下可能导致 viewBox 尺寸偏离预期。
- 建议: 改为累加 `Math.log(zoomFactor)` 的指数，最终用 `Math.exp(sum)` 计算，减少乘法累积误差；或限制单帧内最大累积次数。

### [P2-4] canvasBoundsScrollSyncTarget 使用 -1 魔法数字
- 位置: canvasViewport.ts:365-366
- 类型: 风格
- 描述: `targetViewBox.width >= canvasBounds.width - 1` 中的 `-1` 是一个容忍度魔法数字，用于判断 viewBox 是否"几乎"覆盖整个 bounds。缺少解释说明这个 1px 容忍度的来源和目的。
- 建议: 提取为命名常量 `CANVAS_VIEWBOX_FULL_COVERAGE_TOLERANCE = 1` 并添加注释说明用途。

### [P2-5] generatedStateIconVisualTransform 硬编码设计框架尺寸
- 位置: appCanvasArea.tsx:66-70
- 类型: 风格
- 描述: 数值 `120`、`80`、`240`、`160` 是状态图标 SVG 的设计框架尺寸（中心偏移和总宽高），但直接以字面量出现在计算中。这些值与 `DEFAULT_STATE_ICON_DRAWING_FRAME` 可能有关联但无法从代码中确认。
- 建议: 提取为命名常量 `STATE_ICON_FRAME_CENTER_X = 120`、`STATE_ICON_FRAME_CENTER_Y = 80`、`STATE_ICON_FRAME_WIDTH = 240`、`STATE_ICON_FRAME_HEIGHT = 160`，或从 `DEFAULT_STATE_ICON_DRAWING_FRAME` 派生。

---

## P3 轻微

### [P3-1] appCanvasViewportBatch.tsx 超大 import 块（584 行）
- 位置: appCanvasViewportBatch.tsx:4-584
- 类型: 抽象层次
- 描述: 单个文件 import 区域占据 580 行，导入了 500+ 个符号。这使得依赖审计和 tree-shaking 效果评估极为困难，也暗示该文件的职责范围过大。
- 建议: 将导入按来源分组（model/utils/render/hooks），并考虑将文件进一步拆分为更小的 batch 单元。

### [P3-2] 文件头注释过期
- 位置: appCanvasViewportBatch.tsx:2
- 类型: 风格
- 描述: 注释 `// 从 App.tsx 第 2265-3048 行提取` 指向的源行号范围在后续重构后已不准确（当前文件 1488 行，源文件行数也已变化）。
- 建议: 删除或更新行号注释，改为描述性说明该文件的职责。

### [P3-3] floatingToolbarWrapperStyle 每次渲染创建新样式对象
- 位置: appCanvasViewportCalculations.ts:35-47
- 类型: 效率
- 描述: `createFloatingToolbarWrapperStyle` 返回的函数在每次调用时创建包含 CSS 自定义属性的新对象。由于 toolbar 位置在拖拽/缩放时频繁变化，这会频繁触发 React reconciliation 中的 style diff。
- 建议: 影响有限（toolbar 仅在选中时渲染），可暂不处理；若未来有性能问题可考虑 `useMemo` 缓存。

### [P3-4] appCanvasViewportCalculations.ts 工厂模式对小函数过度封装
- 位置: appCanvasViewportCalculations.ts:6-56
- 类型: 抽象层次
- 描述: 5 个 `createXxx(__appScope)` 工厂函数中，`createFloatingToolbarBounds` 和 `createCanvasPointToSurfaceCss` 仅做简单的加减乘除，却通过闭包 + scope 间接访问参数。对于一个纯数学映射函数来说，间接层过多。
- 建议: 这类纯函数可以直接接收所需参数（如 `canvasPointToSurfaceCss(point, offsetX, offsetY, scale)`），由调用方从 scope 中取值传入，减少闭包复杂度。
