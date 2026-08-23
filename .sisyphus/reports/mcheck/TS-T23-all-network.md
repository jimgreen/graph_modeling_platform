# T23 all-network-topology 审查报告

## 概览

| 指标 | 值 |
|------|-----|
| 文件数 | 3 |
| 总行数 | 3623（944 + 1318 + 1361） |
| 发现总数 | 20（P0: 1, P1: 6, P2: 9, P3: 4） |

---

## P0 严重

### [P0] runTopology 异步期间 modelSignature 变化导致状态竞态
- 位置: AllNetworkTopologyDialog.tsx:633-639, 789-873
- 类型: bug
- 描述: `useEffect([modelSignature])` 在 models 变化时将 `running` 强制重置为 `false`，但不会取消已发起的 `runTopology` 异步请求。若用户在全网拓扑执行中触发了模型列表变化（如外部写入 schemes），in-flight 的 `Promise.all` 仍会继续执行并在 finally 中 `setRunning(false)`，而 `completedRun` 已被清空，导致 UI 状态不一致——拓扑结果显示为空但 `running=false`。
- 建议: 引入 `useRef` 存储 AbortController 或递增 runId；在 modelSignature effect 中递增 runId，`runTopology` 的 then/finally 检查 runId 是否仍匹配，不匹配则丢弃结果。

---

## P1 重要

### [P1] referencedModelsForGlobalLines 三层嵌套 O(R×Ref×M) 线性扫描
- 位置: all-network-topology.ts:139-147
- 类型: 性能
- 描述: 对每个 model 遍历所有 records 的所有 references 进行 `globalLineReferenceMatchesModel` 匹配。当 records 数量大（数百条全局线路）且 models 多时，每次调用 `runTopology` 或 `runGlobalLineConsistency` 均触发此热点。
- 建议: 先构建 `Set<modelKey>` 或 `Map<projectIdx, model[]>` 索引，将匹配降为 O(references) + O(models)。

### [P1] globalLineDefinitionDifferences 在循环中重复 filter 全模型节点
- 位置: all-network-topology.ts:226-228
- 类型: 性能
- 描述: 每次调用 `globalLineDefinitionDifferences` 都对 `model.record.project.nodes` 做 `.filter(node => globalLineId === record.id)` 线性扫描。该函数在 `analyzeGlobalLinesForAllNetworkTopology` 中被 records×endpoints 双重循环调用，对同一模型的同一全局线路 ID 重复扫描。
- 建议: 在 `analyzeGlobalLinesForAllNetworkTopology` 入口处按模型预建 `Map<globalLineId, ModelNode[]>` 索引，传入 `globalLineDefinitionDifferences`。

### [P1] runGlobalLineConsistency 强制 reload 所有模型
- 位置: AllNetworkTopologyDialog.tsx:952-956
- 类型: 性能
- 描述: 一致性校验对**所有** models（非仅 selectedModels）调用 `loadFullModel(scope, model, true)`，即强制从后端重新读取每个厂站/馈线/台区模型文件。模型数量多时（数十个）将产生大量 HTTP 请求且无并发限制。
- 建议: 仅加载全局线路引用到的模型（通过 `referencedModelsForGlobalLines` 过滤），或复用 `runTopology` 已加载的模型缓存。

### [P1] fetch 请求无 AbortController，组件卸载后 setState
- 位置: AllNetworkTopologyDialog.tsx:212-218, 950-961, 1007-1035
- 类型: 内存
- 描述: `loadGlobalLineRecordsForTopology`、`runGlobalLineConsistency`、`deleteEmptyGlobalLineRecord` 中的 `fetch` 调用没有关联 AbortController。若对话框在请求完成前被关闭（虽然常驻但可被外部控制），`setGlobalLineListRecords` 等 setState 将作用于已卸载组件，React 18 虽不再 warn 但逻辑仍可能不一致。
- 建议: 在 `AllNetworkTopologyDialog` 顶层创建 `useRef<AbortController>`，在 unmount 或重新触发时 abort 上次请求。

### [P1] locateAlert 闭包捕获过时引用
- 位置: AllNetworkTopologyDialog.tsx:876-901
- 类型: bug
- 描述: `locateAlert` 函数捕获了 `globalLineConsistencyModels`、`completedRun?.models`、`models` 三个状态值，但作为 `onLocateAlert` 回调传递给 `GlobalLineListWindow`。当用户在全局线路窗口双击一条告警时，如果这些状态已因一致性校验刷新而变更，定位逻辑可能使用旧模型列表查找 projectId。
- 建议: 将 locateAlert 改为从 ref 读取最新值，或内联到 GlobalLineListWindow 的 props 中使用 useCallback 配合正确依赖。

### [P1] 两个 useEffect 重复同步 globalLineListRecords
- 位置: AllNetworkTopologyDialog.tsx:930-943
- 类型: 重复
- 描述: 第一个 effect（930-933）在 `globalLineListOpen` 变化时调用 `refreshGlobalLineList(false)` 读取 records 并 setState；第二个 effect（935-943）在 `globalLineListOpen` 或 `scope.globalLineRecords` 变化时从 `scope.globalLineRecords` 同步。两者均设置 `setGlobalLineListRecords`，逻辑重叠且第二个 effect 可能覆盖第一个的排序结果。
- 建议: 合并为一个 effect，由 `refreshGlobalLineList` 统一处理初始加载，`scope.globalLineRecords` 变化时只做增量同步。

### [P1] 测试通过 readFileSync 断言源码字符串，极度脆弱
- 位置: all-network-topology.test.ts:256-267, 323-337, 339-360, 999-1011, 1013-1036
- 类型: 重复
- 描述: 约 6 个测试使用 `readFileSync(new URL("./AllNetworkTopologyDialog.tsx", import.meta.url))` 读取源文件后用 `toContain`/`toMatch` 断言特定字符串。任何变量重命名、格式调整或文件移动都会导致这些测试无声失败，且不验证运行时行为。
- 建议: 替换为组件渲染测试（使用 `@testing-library/react` 或类似工具），直接断言 DOM 结构和交互行为。保留源码断言仅用于确实无法行为测试的场景（如 CSS 类名存在性）。

---

## P2 一般

### [P2] globalLineLocalElectricalSlot 每次调用创建新 Map
- 位置: all-network-topology.ts:412
- 类型: 效率
- 描述: `new Map(occurrence.model.record.project.nodes.map(...))` 在每次 `globalLineLocalElectricalSlot` 调用时分配新 Map。该函数在 `globalLineEndpointVoltageBase` 中被调用，后者在 `analyzeGlobalLineConsistency` 的电压校验路径中。
- 建议: 将 Map 构建提升到调用方，或在 `globalLineEndpointVoltageBase` 中预建节点索引传入。

### [P2] globalLineReferenceMatchesModel 使用 JSON.stringify 比较数组
- 位置: all-network-topology.ts:126
- 类型: 效率
- 描述: `JSON.stringify(reference.schemePath) === JSON.stringify(model.schemePath)` 对每次匹配都做序列化。当 schemePath 较长或匹配次数多时，这是不必要的 GC 压力。
- 建议: 使用长度检查 + 逐元素比较的辅助函数，如 `arrayEqual(a, b)`。

### [P2] modelsByType 未 useMemo，每次渲染重复构建
- 位置: AllNetworkTopologyDialog.tsx:661-664
- 类型: 效率
- 描述: `new Map(MODEL_TYPE_ORDER.map(type => [type, models.filter(...)]))` 在每次 render 执行，对 3 种类型各做一次 `models.filter`。虽然 models 不大，但在拖动/缩放等高频 re-render 场景中浪费。
- 建议: 用 `useMemo(() => ..., [models])` 包裹。

### [P2] scope 类型为 Record<string, any>，无类型安全
- 位置: AllNetworkTopologyDialog.tsx:32
- 类型: 风格
- 描述: `AllNetworkTopologyDialogProps.scope` 类型为 `Record<string, any>`，所有 `scope.xxx?.()` 调用均无编译期检查。拼写错误或参数类型错误只能运行时发现。
- 建议: 定义 `AllNetworkTopologyScope` interface 或 type，至少包含已使用的所有方法签名。

### [P2] GlobalLineListWindow resize handle 未调用 setPointerCapture
- 位置: AllNetworkTopologyDialog.tsx:342-361, 586-595
- 类型: bug
- 描述: `handleGlobalLineWindowResizePointerDown` 调用了 `preventDefault` 和 `stopPropagation` 但未调用 `setPointerCapture`，而主窗口的 resize handle（743-759）调用了。若用户拖拽 resize 时指针移出窗口边界，pointermove 事件可能丢失（依赖 window 级监听缓解但仍有边界问题）。
- 建议: 在 resize handle 的 `<span>` 元素上调用 `event.currentTarget.setPointerCapture(event.pointerId)`。

### [P2] deleteEmptyGlobalLineRecord 异步后 setState 无 mounted 检查
- 位置: AllNetworkTopologyDialog.tsx:994-1036
- 类型: 错误处理
- 描述: 异步 fetch 后的 `setGlobalLineListRecords`、`setGlobalLineConsistencyResult` 等调用在组件可能已卸载时仍会执行。虽然 React 18 不再 warn，但若 `scope.__appScopeRef` 已失效，`latestScope.loadGlobalLineRecords()` 可能抛出。
- 建议: 使用 mounted ref guard 或在 abort 时提前返回。

### [P2] analyzeGlobalLineConsistency 中 missing-record 检测遍历所有模型所有节点
- 位置: all-network-topology.ts:560+ (analyzeGlobalLineConsistency 函数)
- 类型: 性能
- 描述: 为检测"模型中定义了全局线路但全局线路表中没有对应记录"，需遍历每个模型的所有节点检查 `GLOBAL_LINE_ID_PARAM`。这在 `globalLineModelOccurrences` 中实现（384-397），每次 consistency 校验都会完整遍历。
- 建议: 如果模型节点数量大，考虑在 `loadFullModel` 后缓存 global line occurrence 索引。

### [P2] 排序比较函数重复实现
- 位置: all-network-topology.ts:95-99, 300-302, AllNetworkTopologyDialog.tsx:918-919, 1021-1022
- 类型: 重复
- 描述: 全局线路排序 `left.idx - right.idx || left.name.localeCompare(right.name, "zh-CN")` 在至少 4 处重复出现。
- 建议: 提取为 `compareGlobalLineRecords(a, b)` 工具函数。

### [P2] test fixture 直接 mutate 共享对象
- 位置: all-network-topology.test.ts:557, 580, 724-725
- 类型: 风格
- 描述: 多个测试直接修改 `completeGlobalLineConsistencyFixture` 返回的对象（如 `targetModel.record.project.nodes.push(...)`、`sourceModel.record.project.voltageUnit = "kV"`）。Vitest 不保证测试顺序，若 fixture 返回同一引用则可能交叉污染。
- 建议: 在 fixture 内使用深拷贝，或在每个测试中构建独立数据。

---

## P3 轻微

### [P3] treeitem 缺少 id 属性，影响无障碍
- 位置: AllNetworkTopologyDialog.tsx:1185-1190, 1212-1217
- 类型: 风格
- 描述: `<li role="treeitem">` 元素没有 `id` 属性。WAI-ARIA tree 模式建议 treeitem 有唯一 id 以便 `aria-activedescendant` 引用。
- 建议: 为每个 treeitem 添加 `id`（如 `model-type-${type}` 和 `model-${model.projectId}`）。

### [P3] ALL_NETWORK_MODEL_TYPES Set 仅 3 元素，Set 开销不必要
- 位置: all-network-topology.ts:65
- 类型: 简化
- 描述: `new Set(["厂站", "馈线", "台区"])` 只有 3 个元素，`Set.has` 的开销与数组 `includes` 相当，但 Set 初始化有额外成本。
- 建议: 改用 `readonly` 数组 + `includes`，或保留 Set 但在模块级别缓存（已如此）。无实际影响。

### [P3] 无拓扑环检测和孤立子图测试
- 位置: all-network-topology.test.ts (全文)
- 类型: 死代码
- 描述: 测试覆盖了全局线路一致性、模型选择、加载覆盖等场景，但缺少对 `analyzeAllNetworkTopology` 的环形拓扑（A→B→C→A）和完全断开子图场景的行为验证。
- 建议: 补充环形连接和孤立组件的测试用例，确认 `validateTopology`（从 model.ts 导入）正确处理这些场景。

### [P3] closing </div> 缩进不一致
- 位置: AllNetworkTopologyDialog.tsx:1342
- 类型: 风格
- 描述: `</div>` 缩进为 6 空格，而对应的 `<div className="all-network-topology-window-layer">` 开标签在 1117 行缩进为 6 空格，但内部 `<section>` 为 8 空格。闭合标签层级与开标签不匹配。
- 建议: 统一缩进为 6 空格对齐开标签。
