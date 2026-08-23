# T09 appSelectionDragFactories 审查报告（tsx + test）

## 概览

| 项目 | 数值 |
|------|------|
| tsx 行数 | 4875 |
| test 行数 | 776 |
| 发现总数 | 19 |
| 数据块占比估计 | ~45%（大型 geometry/routing 数据变换逻辑） |
| export 函数数 | ~65 个 factory |

文件采用统一的 factory 模式：每个 `create*` 接收 `__appScope: Record<string, any>` 闭包，返回实际操作函数。测试文件覆盖了 10 个 factory 的核心路径。

---

## P0 严重

### [P0-1] 整个文件禁用 TypeScript 类型检查
- 位置: `appSelectionDragFactories.tsx:1`
- 类型: 安全
- 描述: `// @ts-nocheck` 使 4875 行代码完全绕过 TS 编译。所有 `__appScope` 解构、参数类型、返回值均无静态保障。任何拼写错误或类型不匹配只能在运行时暴露，且此文件解构的变量数量极大（单个函数最多解构 ~50 个属性，如 line 28），拼错一个字段名不会有任何编译期提示。
- 建议: 移除 `@ts-nocheck`，为 `__appScope` 定义精确的 interface（至少覆盖每个 factory 实际使用的字段）。可分阶段进行：先改 `@ts-nocheck` 为 `@ts-check` + JSDoc，再逐步迁移到真类型。

### [P0-2] showGlobalMessage / showGlobalConfirm 未导入，依赖隐式全局
- 位置: `appSelectionDragFactories.tsx:1106`（及 `createDeleteGraphTemplate`、`createDeleteGraphTemplateType` 等多处）
- 类型: bug
- 描述: 多个 factory 内部直接调用 `showGlobalMessage("...")` 和 `showGlobalConfirm("...")`，但这些函数并未从任何模块 import。它们通过 `window` 全局注入。一旦运行环境不含该全局（SSR、Web Worker、测试忘记 mock），将抛出 `ReferenceError` 且无法被 TypeScript 捕获（因 `@ts-nocheck`）。测试文件通过 `(globalThis as any).showGlobalConfirm = ...` 手动注入来规避，进一步证实了隐式依赖。
- 建议: 将 `showGlobalMessage`、`showGlobalConfirm` 加入 `__appScope` 解构，与现有模式保持一致；或在文件顶部显式 import。

---

## P1 重要

### [P1-1] document.elementFromPoint 直接 DOM 访问，无 SSR/测试兼容
- 位置: `appSelectionDragFactories.tsx:95`
- 类型: bug
- 描述: `createCanvasPointerKeyboardShortcutAvailability` 内部直接调用 `document.elementFromPoint(point.x, point.y)`。此调用在 SSR 环境会抛异常；测试中也无法注入替代实现。
- 建议: 将 `elementFromPoint` 通过 `__appScope` 注入，或增加 `typeof document !== "undefined"` 守卫。

### [P1-2] createUndoLastOperation 闭包解构 ~50 个 setter，存在陈旧闭包风险
- 位置: `appSelectionDragFactories.tsx:26-82`
- 类型: bug
- 描述: 返回函数在闭包中解构约 50 个 setter。React `useState` setter 引用稳定，但若重构为 `useReducer` 或自定义 store 将持有过期引用。line 28 单行解构极难维护。
- 建议: 改为在返回函数体内从 `__appScope` 解构（与其他小 factory 一致），或定义 `UndoScope` interface。

### [P1-3] Pointer capture 异常被完全吞没
- 位置: `appSelectionDragFactories.tsx:512-516`
- 类型: 错误处理
- 描述: `setPointerCapture` 的 try/catch 块完全为空。当 pointer capture 因其他原因失败（如元素已脱离 DOM），后续依赖 capture 的逻辑可能在未捕获状态下继续执行，导致不一致的交互状态。
- 建议: 在 catch 中清理 `setModifierSelectionPress(null)` 和 `setMarquee(null)`。

### [P1-4] createCommitInteractiveMove 巨型函数 ~500 行
- 位置: `appSelectionDragFactories.tsx:~3200-3700`
- 类型: 抽象层次
- 描述: 包含大量 `performance.now()` 计时、多层条件分支（bulk move / deferred repair / whole-layer move / canvas bounds expansion），嵌套深度达 5-6 层。可读性和可测试性极差。
- 建议: 拆分为 `commitBulkMove`、`commitDeferredMove`、`commitStandardMove` 子函数。

### [P1-5] setTimeout 硬编码 magic numbers 无注释
- 位置: `appSelectionDragFactories.tsx:3026`
- 类型: 风格
- 描述: `}, 60, 1500);` 为 debounce/throttle 参数，但 60ms 和 1500ms 含义无注释。
- 建议: 提取为命名常量 `DEFERRED_REPAIR_DEBOUNCE_MS = 60`、`DEFERRED_REPAIR_MAX_WAIT_MS = 1500`。

---

## P2 一般

### [P2-1] 测试中 globalThis mock 模式重复，应使用 vi.stubGlobal
- 位置: `appSelectionDragFactories.test.ts:172-196`、`212-246`、`250-283`
- 类型: 重复
- 描述: 三处测试手动保存/恢复 `(globalThis as any).showGlobalConfirm` 或 `showGlobalMessage`，每次都要写 `try/finally` + `originalXxx === undefined` 判断。Vitest 提供 `vi.stubGlobal()` 自动处理。
- 建议: 替换为 `vi.stubGlobal("showGlobalConfirm", mockFn)`。

### [P2-2] createLightweightMovedEndpointRoute scope 构造重复 3 次
- 位置: `appSelectionDragFactories.test.ts:404-418`、`463-481`、`680-688`
- 类型: 重复
- 描述: scope 对象在 3 个 test 中近乎相同构建，仅个别字段有差异。
- 建议: 提取 `buildLightweightRouteScope(overrides)` 工厂函数。

### [P2-3] routeIntersectsTestBox 测试辅助复制了生产逻辑
- 位置: `appSelectionDragFactories.test.ts:55-75`
- 类型: 风格
- 描述: 测试文件内重新实现与生产 `routeIntersectsEndpointNodeBodies` 逻辑重叠的函数。生产侧算法变更时测试辅助不会同步，可能导致测试"通过"但实际行为已变。
- 建议: 直接 import 生产函数用于断言，或在测试注释中标注为独立验证副本。

### [P2-4] geometry 计算无 NaN/零值守卫
- 位置: `appSelectionDragFactories.tsx:1043-1051`
- 类型: bug
- 描述: tolerance 计算 `Math.min(bounds.right - bounds.left, bounds.bottom - bounds.top) * 0.08`。当 bounds 为零面积时返回 0 或负值，后续匹配不会命中任何终端，可能产生空 terminals 数组导致下游异常。
- 建议: 增加 bounds 有效性守卫，面积 <= 0 时提前返回空数组。

### [P2-5] Marquee selection factory 重复
- 位置: `appSelectionDragFactories.tsx:~460-518` vs `1505-1517`
- 类型: 重复
- 描述: `createStartMarqueeSelection` 与 `createStartContextMarqueeSelection` 共享约 80% 初始化逻辑，仅入口数据来源不同。
- 建议: 提取公共 `initMarqueeState(canvasPoint, scope)` 辅助函数。

### [P2-6] 测试中 any 类型断言过多
- 位置: `appSelectionDragFactories.test.ts:139-148`、`167-186` 等
- 类型: 风格
- 描述: 大量使用 `as any` 绕过类型检查，降低测试代码类型安全。
- 建议: 为 scope 对象定义最小接口，使用 `Partial<Scope>` 替代 `Record<string, unknown>` + spread。

### [P2-7] createReplaceBuiltinDeviceIconOverride 使用 new Date() 不可测试
- 位置: `appSelectionDragFactories.tsx:1092`
- 类型: 风格
- 描述: `updatedAt: new Date().toISOString()` 直接依赖系统时钟，单元测试中无法确定预期值。
- 建议: 通过 `__appScope` 注入 `getTimestamp: () => string`。

---

## P3 轻微

### [P3-1] Factory 闭包内缩进不一致
- 位置: `appSelectionDragFactories.tsx:7`、`28`、`523` 等多处
- 类型: 风格
- 描述: 部分 factory 内部解构行使用 2 空格缩进，与其他 4 空格不一致。4875 行文件中增加阅读负担。
- 建议: 统一使用 Prettier 格式化。

### [P3-2] createShouldRunDeferredMoveOptimization 测试覆盖不完整
- 位置: `appSelectionDragFactories.test.ts:621`
- 类型: 效率
- 描述: 传入空对象 `{}` 作为 scope，仅 1 个 test case 覆盖 2 个 edge 组合的布尔返回。实际判断逻辑（edge 数量阈值、selectedEdgeIds 过滤）未充分测试。
- 建议: 补充边界 case：0 条 edge、全部 selected、仅 selected 无连接等。

### [P3-3] test.describe 分组粒度和命名不统一
- 位置: `appSelectionDragFactories.test.ts:91`、`135`、`210`、`287`、`370`
- 类型: 风格
- 描述: 5 个顶层 describe 块命名风格不统一，部分 describe 内混合了不同 factory 的测试。
- 建议: 每个 factory 一个 describe 块，命名对齐 factory 函数名。

### [P3-4] createToggleFilterSelectionType 使用 Array.includes 做集合查找
- 位置: `appSelectionDragFactories.tsx:1545-1548`
- 类型: 效率
- 描述: `current.includes(itemKey)` 在数组中线性查找 O(n)。当前数据量小，但模式不佳。
- 建议: 如数据量增长，考虑用 `Set` 替代 `string[]`。当前可忽略。

### [P3-5] 测试中 void promise 未检查 rejection
- 位置: `appSelectionDragFactories.test.ts:335`
- 类型: 风格
- 描述: `void firstSave.then(...)` 忽略 promise rejection，可能导致不确定行为。
- 建议: 添加 `.catch(() => {})` 或使用 `await expect(firstSave).resolves...`。

---

## 统计

| 优先级 | 数量 |
|--------|------|
| P0 | 2 |
| P1 | 5 |
| P2 | 7 |
| P3 | 5 |
| **合计** | **19** |