# T29 面板与对话框审查报告（B 批）

## 概览

| 维度 | 数值 |
|------|------|
| 文件数 | 12（含 2 辅助文件） |
| 总行数 | ~3 330 |
| 发现总数 | 20 |
| P0 严重 | 1 |
| P1 重要 | 7 |
| P2 一般 | 6 |
| P3 轻微 | 6 |

### 文件行数明细

| 文件 | 行数 |
|------|------|
| `appControlFactories.tsx` | 472 |
| `appControlFactories.test.tsx` | 722 |
| `appRenderPanels.tsx` | 519 |
| `appRenderPanels.test.tsx` | 38 |
| `appTopbar.tsx` | 353 |
| `appLeftPanel.tsx` | 95 |
| `appStatusbar.tsx` | 70 |
| `appUserCustomizationFactories.tsx` | 499 |
| `appUserCustomizationFactories.test.ts` | 173 |
| `UserCustomizationManagerDialog.tsx` | 306 |
| `appInlineUtilityFunctions.ts` | 91 |
| `appStaticScope.ts` | 88 |

---

## P0 严重

### [P0] `confirmUser` 返回 Promise 未 await —— 导入确认永远通过
- 位置: `src/appExtracted/appUserCustomizationFactories.tsx:437`
- 类型: bug
- 描述: `confirmUser()` 是 async 函数，始终返回 truthy 的 Promise 对象。`if (!confirmUser(...))` 永远为 `false`，用户点击"取消"仍会继续执行导入流程，confirm 对话框形同虚设。
- 建议: 改为 `if (!await confirmUser(scope, ...))` 或提取 await 结果到变量后判断。同文件 `createRestoreUserCustomizations`（L473）已正确使用 `await confirmUser`，可参照。

---

## P1 重要

### [P1] clipboard API 缺少错误处理，产生 unhandled rejection
- 位置: `src/appExtracted/appLeftPanel.tsx:41`
- 类型: 错误处理
- 描述: `navigator.clipboard.writeText(id).then(...)` 无 `.catch()`。浏览器拒绝 clipboard 权限（如非 HTTPS 或 iframe 沙箱）时产生 unhandled promise rejection，可能导致控制台报错或全局错误处理器触发。同文件 `appTopbar.tsx:29-52` 的 `copyClientId` 已实现 try/catch fallback，应保持一致。
- 建议: 添加 `.catch(() => {})` 或参照 `appTopbar.tsx` 实现 execCommand fallback。

### [P1] `@ts-nocheck` 下的 scope 解构无类型防护
- 位置: `src/appExtracted/appControlFactories.tsx` 全文（1, 11, 46, 70, 135, 182, 225 等）
- 类型: 风格
- 描述: 文件头部 `// @ts-nocheck` 使所有 `__appScope` 解构（如 `const { pushUndoSnapshot, setNodes } = __appScope`）失去类型检查。若上游 App.tsx 重命名或移除属性，此处不会编译报错，只在运行时 undefined 崩溃。涉及 10+ 个 factory 函数，每个解构 5-20 个属性，风险面广。
- 建议: 至少为每个 factory 定义 `interface XxxScope { pushUndoSnapshot: ...; setNodes: ... }` 并替换 `Record<string, any>`，或逐步移除 `@ts-nocheck`。

### [P1] `operationLogRef.current` 可能为 null/undefined
- 位置: `src/appExtracted/appStatusbar.tsx:56-57`
- 类型: bug
- 描述: `<span ref={operationLogStatusRef} ... title={operationLogRef.current}>日志 {operationLogRef.current}</span>` —— 首次渲染时 `operationLogRef.current` 可能为 `null`，显示 "日志 null" 或 title="null"。
- 建议: 使用 `operationLogRef.current ?? ""` 或 `operationLogRef.current ?? "无日志"` 做空值兜底。

### [P1] `nodes.length` / `edges.length` 缺少空值保护
- 位置: `src/appExtracted/appStatusbar.tsx:61, 63`
- 类型: bug
- 描述: `nodes.length` 和 `edges.length` 直接从 scope 解构使用。若 scope 中 `nodes` 或 `edges` 为 undefined（初始化竞争或 scope 注入遗漏），会抛 TypeError 导致整个 statusbar 崩溃。
- 建议: 解构时给默认值 `nodes = []` 或渲染时用 `(nodes ?? []).length`。

### [P1] `edgeListForNodeIds` 通过可变 Set 副作用返回数据
- 位置: `src/appExtracted/appControlFactories.tsx:243-245`
- 类型: 风格
- 描述: 创建空 `selectedEdgeSet`，传入 `edgeListForNodeIds` 后被原地填充，再用于后续 `setSelectedEdgeIds`。这种 "参数兼输出" 模式可读性差、易出 bug，且违反纯函数原则。
- 建议: 让 `edgeListForNodeIds` 返回 `{ edges, edgeIds }` 对象，或将 Set 填充逻辑移入调用方显式遍历。

### [P1] 递归 `JSON.parse(JSON.stringify(...))` 低效
- 位置: `src/appExtracted/appInlineUtilityFunctions.ts:60-72`
- 类型: 效率
- 描述: `serializeSchemeRecordForFile` 对 children 递归调用自身，每个 child 结果经过 `JSON.parse(serializeSchemeRecordForFile(child))`。这导致每层子方案都做一次完整的 stringify→parse 往返，大型方案树性能差。
- 建议: 改为先递归构建 plain object 再统一 `JSON.stringify`，或使用 `JSON.stringify` 的 replacer 参数处理嵌套。

### [P1] `Date.now()` + 4 位随机数组合 ID 有碰撞风险
- 位置: `src/appExtracted/appControlFactories.tsx:203`
- 类型: bug
- 描述: `group-${Date.now()}-${Math.random().toString(36).slice(2, 6)}` —— `toString(36).slice(2,6)` 只有 4 位（约 46⁴ ≈ 4.5M 种），高频连续调用时 `Date.now()` 毫秒相同，碰撞概率不可忽略。
- 建议: 增加随机位数或使用 `crypto.randomUUID()`。

---

## P2 一般

### [P2] `restorableVisibleKeys` / `restorableDomainKeys` / `restorableAllKeys` 每次渲染重复计算
- 位置: `src/UserCustomizationManagerDialog.tsx:178-183`
- 类型: 性能
- 描述: 三个 `.filter().map()` 链在每次渲染时都完整遍历 `inventory.items`。当列表较大（数百项）且用户频繁切换筛选条件时造成不必要的计算。
- 建议: 用 `useMemo` 包裹，依赖 `[props.inventory.items, props.activeDomain, visibleItems]`。

### [P2] `appRenderPanels.test.tsx` 覆盖率极低
- 位置: `src/appRenderPanels.test.tsx` (38 行)
- 类型: 重复
- 描述: 仅测试 `createRenderProjectPanel` 的空状态展示，其余 8+ 个渲染工厂（`createRenderLayerManager`、`createRenderLibraryDefinitionActions` 等）完全无测试。与 `appControlFactories.test.tsx`（722 行）的覆盖密度形成鲜明对比。
- 建议: 至少为关键面板（图层管理、类定义操作、拓扑告警面板）补充渲染快照测试。

### [P2] 测试 mock scope 大量重复
- 位置: `src/appExtracted/appControlFactories.test.tsx` (多个 `createXxxMockScope` 函数)
- 类型: 重复
- 描述: `createMockScope`、`createUpdateMockScope`、`createSaveMockScope`、`createSaveTemplateMockScope` 各自独立构建部分重叠的 mock scope 对象。`createSaveTemplateMockScope` 达 40 行，许多属性名/函数签名与其他 mock 完全相同。
- 建议: 提取 `baseMockScope()` 公共工厂，各专用 mock 仅覆盖差异属性。

### [P2] Topbar 导出菜单四项共用同一 Download 图标
- 位置: `src/appExtracted/appTopbar.tsx:186-189`
- 类型: 风格
- 描述: "导出 E、JSON 和 SVG"、"导出 SVG"、"导出 JSON" 三项均使用 `<Download size={16}/>` 作为图标，仅 "导出 E 文件" 使用 `<FileJson/>`。用户难以通过视觉区分菜单项。
- 建议: 为 SVG 导出用图片/文件图标，JSON 用代码/数据图标，增加视觉区分度。

### [P2] `@keyframes runtime-ws-blink` 每次组件实例化都注入 `<style>` 标签
- 位置: `src/appExtracted/appTopbar.tsx:88`
- 类型: 性能
- 描述: `RuntimeWsIndicator` 组件内嵌 `<style>{\`@keyframes runtime-ws-blink ...\`}</style>`，每次挂载都向 DOM 插入重复的 `<style>` 元素。虽然浏览器能处理，但违反 CSS 最佳实践。
- 建议: 将该动画移至全局 CSS 文件，或使用 CSS-in-JS 的 once-injection 机制。

### [P2] `iconLibrary` 到 `imageLibrary` 的字段名映射无注释
- 位置: `src/appExtracted/appUserCustomizationFactories.tsx:74`
- 类型: 抽象层次
- 描述: `userCustomizationSnapshotFromLibraryPackage` 中 `result.imageLibrary = payload.iconLibrary` —— LibraryPackage 用 `iconLibrary`，UserCustomizationSnapshot 用 `imageLibrary`，映射隐含在代码中，无注释说明两者对应关系。后续维护者容易困惑。
- 建议: 添加注释说明 `iconLibrary` 与 `imageLibrary` 是同一数据结构的不同命名。

---

## P3 轻微

### [P3] `normalizedSearchText` 方法链顺序不一致
- 位置: `src/UserCustomizationManagerDialog.tsx:65`
- 类型: 风格
- 描述: `String(value ?? "").trim().toLocaleLowerCase()` —— 先 `trim()` 再 `toLocaleLowerCase()`。功能正确，但通常搜索规范化先统一大小写再去除首尾空白更常见。
- 建议: 调整为 `.toLocaleLowerCase().trim()` 以保持团队一致性（非强制）。

### [P3] `MapIcon` 只是 `Map` 的别名
- 位置: `src/appExtracted/appStaticScope.ts:85`
- 类型: 风格
- 描述: `MapIcon: LucideReactScope.Map` —— 引入 `Map` 后又以 `MapIcon` 导出，增加一层间接引用，可读性略降。
- 建议: 直接使用 `Map` 或在引入时就 `import { Map as MapIcon }` 消除中间步骤。

### [P3] Topbar 直接通过 `scope.xxx` 访问未解构属性
- 位置: `src/appExtracted/appTopbar.tsx:162, 165, 242, 249, 251, 252`
- 类型: 风格
- 描述: `AppTopbarContent` 解构了 ~80 个 scope 属性（L94-120），但仍有 6 处直接通过 `scope.xxx` 访问（如 `scope.globalLineListOpen`、`scope.svgModelImportInputRef`）。混合两种访问风格降低一致性。
- 建议: 统一加入解构列表，或在文件顶部注释说明哪些属性需保留 `scope.` 前缀访问及原因。

### [P3] LeftPanel `copyId` 使用 DOM 操作创建 toast
- 位置: `src/appExtracted/appLeftPanel.tsx:42-49`
- 类型: 风格
- 描述: 手动 `document.createElement("span")` → 设置样式 → `document.body.appendChild` → `setTimeout` 移除。这是命令式 DOM 操作，绕过了 React 的虚拟 DOM 管理。
- 建议: 改用 React state + 条件渲染实现 toast，或使用项目已有的通知/消息组件。

### [P3] 测试中 `expect(() => ...).toThrow(...)` 后重复调用
- 位置: `src/appExtracted/appControlFactories.test.tsx` 多处（如 L50-55, L61-66, L522, L548-553, L570-575）
- 类型: 重复
- 描述: 几乎每个异常测试都先 `expect(() => fn()).toThrow(/.../)` 再 `try { fn() } catch (e) { expect(e.code).toBe(...) }`。同一函数被调用两次，第二次仅为检查 error.code。
- 建议: 使用 `try/catch` 单次调用，同时断言 message 和 code；或使用 `expect().toThrow()` 配合自定义 matcher 检查 code 属性。

### [P3] `leftPanelContent` 作为 children 传入，面板自身无法控制加载状态
- 位置: `src/appExtracted/appLeftPanel.tsx:77`
- 类型: 抽象层次
- 描述: `<div className="left-panel-content">{leftPanelContent}</div>` —— 面板内容完全由外部注入，`AppLeftPanelContent` 对其无控制权（如 loading 态、error 态）。
- 建议: 这是当前架构的有意设计（提升 App.tsx 的灵活性），可接受；但若后续加载逻辑变复杂，考虑将 loading/error 状态下沉到此组件。
