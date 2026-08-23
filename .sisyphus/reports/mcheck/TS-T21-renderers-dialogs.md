# T21 appDeviceDefinition Renderers+Dialogs 审查报告

## 概览

| 文件 | 行数 |
|------|------|
| `appDeviceDefinitionRenderers.tsx` | 3079 |
| `appDeviceDefinitionDialogs.tsx` | 1635 |
| **合计** | **4714** |

**发现总数**: 21 (P0: 3, P1: 6, P2: 7, P3: 5)

---

## P0 严重

### [P0-1] 两个文件均使用 `@ts-nocheck` 完全禁用类型检查
- 位置: `appDeviceDefinitionRenderers.tsx:1`, `appDeviceDefinitionDialogs.tsx:1`
- 类型: bug
- 描述: 整个文件绕过 TypeScript 类型系统，所有 props 访问、函数签名、返回值均无编译期校验。4700+ 行代码中任何拼写错误或类型不匹配只能在运行时暴露，极大增加回归风险。
- 建议: 制定渐进计划：先为 `__appScope: Record<string, any>` 定义精确 interface，逐步添加参数/返回值类型注解，最终移除 `@ts-nocheck`。优先覆盖 `handlers` 对象和 dialog state 类型。

### [P0-2] `new Image()` 像素扫描无中止/清理机制，存在内存泄漏
- 位置: `appDeviceDefinitionRenderers.tsx:1001-1060`
- 类型: 内存
- 描述: `stateIconDrawingElementPreviewImage` 中为每个 `imported-svg` 元素创建 `new Image()` 并设置 `onload` 回调执行 canvas 像素遍历。当元素频繁增删或组件卸载后，已创建的 `Image` 对象及其 `onload` 回调仍持有闭包引用，无法被 GC 回收；大图片的像素扫描（逐像素遍历 alpha 通道）在高分辨率下会长时间阻塞主线程。
- 建议: 使用 `useRef` 追踪活跃的 `Image` 实例，在 cleanup/元素删除时设置 `img.src = ""` 解除引用；考虑用 `requestIdleCallback` 或 `OffscreenCanvas` 将像素扫描移出主线程；添加 `AbortController` 模式允许取消进行中的扫描。

### [P0-3] Dialog 重新打开时未重置 draft 状态，导致残留数据
- 位置: `appDeviceDefinitionDialogs.tsx:14` (destructured `customDeviceDialogOpen`, `customDeviceDraft`)
- 类型: bug
- 描述: `customDeviceDialogOpen` 控制 dialog 显示/隐藏，但未见 `useEffect` 监听其变化来重置 `customDeviceDraft`、`customDeviceTerminalAnchors`、`customDeviceMeasurementTarget` 等 draft 状态。用户关闭 dialog 后再打开，可能看到上次未保存的残留编辑内容，造成数据混乱。
- 建议: 添加 `useEffect` 监听 `customDeviceDialogOpen` 从 false→true 的转换，在回调中重置所有 draft 相关 state 为初始值。同理适用于 `deviceDefinitionDialogOpen`、`customLibraryCreateDialog`。

---

## P1 重要

### [P1-1] 属性面板大量近乎相同的 JSX 块应抽取为参数化组件
- 位置: `appDeviceDefinitionRenderers.tsx:2200-2530`
- 类型: 重复
- 描述: 属性面板（选中图元 tab）对 `rect`/`ellipse`/`line`/`polyline`/`image`/`text`/`imported-svg` 七种元素类型分别渲染 `<tr><th>属性名</th><td><InputNumber/></td></tr>` 块，结构完全一致仅字段名和类型不同。约 300 行重复 JSX，每次新增属性类型需复制粘贴。
- 建议: 抽取 `<PropertyRow label={string} input={ReactNode} />` 组件；进一步定义 `PropertySchema` 数组描述每种元素类型的属性列表，用 `.map()` 统一渲染。可减少约 200 行代码。

### [P1-2] `.map()` 内联闭包在每个渲染周期重建
- 位置: `appDeviceDefinitionRenderers.tsx:2005-2043`, `appDeviceDefinitionDialogs.tsx:502-536`
- 类型: 性能
- 描述: 表格/列表渲染中的 `.map()` 回调内直接定义 `onChange` handler（如 `updateStateIconDrawingElement(selected.id, { ... })`），每次父组件渲染都创建 N 个新闭包实例。在 drawing canvas 频繁重绘的场景下（拖拽、缩放），这些闭包的创建和 GC 会加剧 GC pause。
- 建议: 将高频 `.map()` 内的行抽取为 `React.memo` 子组件，handler 通过 props 传入（引用稳定）；或使用 `useCallback` + `data-*` attribute 模式，在容器上用事件委托替代逐行绑定。

### [P1-3] 数组 index 作为 key 导致列表重排序时状态错乱
- 位置: `appDeviceDefinitionDialogs.tsx:1518`, `appDeviceDefinitionDialogs.tsx:1555`
- 类型: bug
- 描述: 模板导入结果展开的子行使用 `key={\`${idx}-${fi}\`}`（fi 是 `.map()` 的 index 参数），当 `expanded` 状态切换或数据重排时，React 无法正确复用 DOM 节点，可能导致展开/折叠动画异常或内部状态（如 input focus）错位。
- 建议: 若 `item.fields` 中字段有唯一标识（如 `f.template`），使用 `key={f.template || fi}`；否则保持 index key 但确保列表不会重排序（添加注释说明）。

### [P1-4] `selectCanvasGraphics` 在 context menu handler 中可能触发不必要的重渲染
- 位置: `appDeviceDefinitionRenderers.tsx:3067-3068`
- 类型: 性能
- 描述: `createHandleLodNodeContextMenu` 中当右键节点不在已选集合时调用 `selectCanvasGraphics([node.id], [])`，这会在右键菜单打开前触发一次 selection state 更新，导致整个画布重渲染一次，然后 `openGraphicContextMenu` 又触发一次。两次 state batch 之间可能出现闪烁。
- 建议: 将 `selectCanvasGraphics` 和 `openGraphicContextMenu` 合并为一次 dispatch（如果 state 管理允许），或在 `openGraphicContextMenu` 内部一并处理 selection 逻辑。

### [P1-5] 自定义库创建 dialog 的 terminal 配置使用 index 闭包导致 N 次 state 更新
- 位置: `appDeviceDefinitionDialogs.tsx:508-534`
- 类型: 性能
- 描述: 每个 terminal 行的 `<select onChange>` 和 `<input onChange>` 都直接内联 `setCustomLibraryCreateDialog((current) => { ... })` 更新整个 dialog state。用户快速切换端子类型时，每次按键/选择都触发完整 dialog state 深拷贝（展开 terminalTypes/terminalLabels/terminalAssociations 三个数组）。
- 建议: 将 terminal 行抽取为独立组件，使用 local state + onBlur commit 模式；或将 `customLibraryCreateDialog` 拆分为多个独立 state slice，避免每次修改一个字段都触发所有字段的重渲染。

### [P1-6] LOD node context menu handler 解构 20+ scope 属性但可能未全部使用
- 位置: `appDeviceDefinitionRenderers.tsx:3037`
- 类型: 效率
- 描述: `createHandleLodNodeContextMenu` 从 `__appScope` 解构了 20 个属性（`activeLayerNodeIdSet, canvasInteractionRef, clampPointToCanvas, connectSource, ...`），但函数体内仅在特定分支使用其中部分属性（如 `connectSource` 仅在 `if (connectSource)` 分支使用）。每次调用都解构全部属性，即使走早期 return 路径。
- 建议: 延迟解构——在确认需要时才从 `__appScope` 读取对应属性，或将 handler 拆分为多个专用函数（如 `handleContextMenuForConnectedMode`、`handleContextMenuForSelectMode`）。

---

## P2 一般

### [P2-1] `IMAGE_FIT_MODE_OPTIONS.map(...)` 每次渲染重复创建 options 数组
- 位置: `appDeviceDefinitionRenderers.tsx:2228`, `appDeviceDefinitionRenderers.tsx:2508`
- 类型: 效率
- 描述: `IMAGE_FIT_MODE_OPTIONS.map((option) => ({ value: option.value, label: option.label }))` 在每次渲染时创建新的数组和对象实例，传给 `<Select options={...}>`。由于每次引用不同，antd Select 会认为 options 变化并触发内部 diff。
- 建议: 在模块顶层预计算 `IMAGE_FIT_SELECT_OPTIONS = IMAGE_FIT_MODE_OPTIONS.map(...)` 并复用常量引用。

### [P2-2] 线型 options 内联数组字面量每次渲染重建
- 位置: `appDeviceDefinitionRenderers.tsx:2237`, `appDeviceDefinitionRenderers.tsx:2403`
- 类型: 效率
- 描述: `options={[{ value: "solid", label: "实线" }, { value: "dashed", label: "虚线" }, { value: "dotted", label: "点线" }]}` 在多处重复出现，每次渲染创建新数组。
- 建议: 提取为模块级常量 `LINE_STYLE_OPTIONS`，统一引用。

### [P2-3] 终端类型 magic string 散落各处
- 位置: `appDeviceDefinitionDialogs.tsx:503`, `appDeviceDefinitionRenderers.tsx:546`
- 类型: 风格
- 描述: `"ac"` 作为 terminal type 默认值在多处硬编码（`?? "ac"`），与 `TERMINAL_TYPE_OPTIONS` 的定义脱节。若后续修改默认值需全局搜索替换。
- 建议: 定义 `DEFAULT_TERMINAL_TYPE` 常量并在 `TERMINAL_TYPE_OPTIONS` 旁导出，所有默认值引用该常量。

### [P2-4] 中文 UI 字符串硬编码未使用 i18n
- 位置: 两文件全局（如 `appDeviceDefinitionRenderers.tsx:2212` "状态值", `appDeviceDefinitionDialogs.tsx:505` "端子"）
- 类型: 风格
- 描述: 数百处中文字符串直接写在 JSX 中，未通过 i18n 系统管理。若需支持多语言，改动量巨大。
- 建议: 如果项目有 i18n 计划，逐步将高频 UI 字符串提取到 locale 文件；若仅限中文，至少在文件中集中定义 `LABELS` 常量对象便于统一管理。

### [P2-5] `areViewSectionPropsEqual` 自定义 memo 比较函数未在 dialogs 中实际使用
- 位置: `appDeviceDefinitionDialogs.tsx:3`
- 类型: 死代码
- 描述: 导入了 `areViewSectionPropsEqual` 但 `AppDeviceDefinitionDialogs` 组件的 `memo()` 调用未传入第二个参数（自定义比较函数），该导入无任何效果。
- 建议: 移除未使用的 import，或如果原意是使用该比较函数，将其传入 `memo(function AppDeviceDefinitionDialogs({ scope }) { ... }, areViewSectionPropsEqual)`。

### [P2-6] 属性面板 tab 切换使用字符串比较而非枚举
- 位置: `appDeviceDefinitionRenderers.tsx:2204` (`sidePanelTab === "global"`)
- 类型: 风格
- 描述: `sidePanelTab` 的取值 `"global"` / `"selected"` 以 magic string 形式在渲染逻辑中比较，缺乏类型约束。
- 建议: 定义 `type SidePanelTab = "global" | "selected"` 并使用枚举或联合类型，配合 `as const` 确保编译期检查。

### [P2-7] `createRenderGraphTemplatePreview` 的空状态占位 SVG 硬编码尺寸
- 位置: `appDeviceDefinitionRenderers.tsx:2837-2840`
- 类型: 风格
- 描述: 当 `canvasClipboardBounds` 返回 null 时渲染一个固定 `viewBox="0 0 80 56"` 的占位 SVG，内部 rect 尺寸也是硬编码。这些魔法数字无法通过配置调整。
- 建议: 提取 `TEMPLATE_PREVIEW_EMPTY_WIDTH/HEIGHT` 常量，或接受 props 传入 fallback 尺寸。

---

## P3 轻微

### [P3-1] Key 生成策略不统一
- 位置: `appDeviceDefinitionRenderers.tsx:2007` (`preview-${element.id}-${index}`), `appDeviceDefinitionRenderers.tsx:2031` (`svg-measure-${element.id}`), `appDeviceDefinitionDialogs.tsx:1518` (`${idx}-${fi}`)
- 类型: 风格
- 描述: 同一文件中混合使用 `id-only`、`id+index`、`index-index` 三种 key 策略，增加维护心智负担。
- 建议: 统一策略：有唯一 id 时用 `id`，列表子项用 `parentId-index`，纯静态列表用 index。添加注释说明选择依据。

### [P3-2] `formatStateIconDrawingNumber` 调用频次高但无 memo
- 位置: `appDeviceDefinitionRenderers.tsx:3` (import), 多处使用（如 2513, 2517, 2521）
- 类型: 效率
- 描述: 该格式化函数在每个属性行的 `value` prop 中被调用，拖拽时属性面板频繁重绘，重复格式化相同数值。
- 建议: 如果格式化逻辑涉及浮点运算，可在调用侧用 `useMemo` 基于 `selected.id + value` 缓存结果。

### [P3-3] `__appScope` 参数类型为 `Record<string, any>` 丧失类型安全
- 位置: `appDeviceDefinitionRenderers.tsx:2957, 3007, 3016, 3035, 2831` 等多处
- 类型: 风格
- 描述: 所有 `create*` 工厂函数的 `__appScope` 参数类型均为 `Record<string, any>`，内部解构的属性无任何类型提示，IDE 无法自动补全，拼写错误无编译期报错。
- 建议: 定义 `AppScope` interface 精确描述所有可用属性，至少覆盖高频使用的属性子集。

### [P3-4] 超长 import 语句单行超过 200 字符
- 位置: `appDeviceDefinitionRenderers.tsx:4`
- 类型: 风格
- 描述: 第 4 行的 import 语句从 `appDeviceDefinitionFactories` 导入了约 30 个符号，单行超过 500 字符，影响 diff 可读性和 code review 效率。
- 建议: 按功能分组拆成多行 import，或使用 `// prettier-ignore` + 分组注释。

### [P3-5] `Number()` 冗余包装
- 位置: `appDeviceDefinitionRenderers.tsx:528` (`Number(stateIconCanvasTerminalNode.rotation)`)
- 类型: 简化
- 描述: 对已经是 number 类型的属性再次调用 `Number()` 包装，虽然无害但增加阅读困惑。
- 建议: 确认类型后移除冗余 `Number()` 调用，或添加注释说明此处防御性转换的原因（如 "可能从 JSON 反序列化得到 string"）。

---

## 统计

| 优先级 | 数量 |
|--------|------|
| P0 严重 | 3 |
| P1 重要 | 6 |
| P2 一般 | 7 |
| P3 轻微 | 5 |
| **合计** | **21** |
