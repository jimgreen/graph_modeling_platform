# T02 appDeviceDefinitionFactories.tsx 审查报告

## 概览

| 指标 | 值 |
|------|-----|
| 文件路径 | `src/appExtracted/appDeviceDefinitionFactories.tsx` |
| 总行数 | 9024 |
| 文件大小 | ~407 KB |
| 导出工厂函数数 | ~160（`export function create*`） |
| `__appScope` 解构次数 | 170 |
| 数据块/查找表占比估计 | ~15%（`STATE_ICON_EDITABLE_STATIC_KIND_BY_TEMPLATE_KIND`、对齐候选集、`MODEL_TYPE_META` 映射等） |
| JSX 模板占比估计 | ~5%（集中在 `createRenderProjectSchemeNode` 等渲染函数） |
| 纯逻辑/工厂占比估计 | ~80% |
| 发现总数 | 20 |

---

## P0 严重

### [P0-1] 全文件 `@ts-nocheck` 禁用 TypeScript 类型检查
- 位置: src/appExtracted/appDeviceDefinitionFactories.tsx:1
- 类型: bug
- 描述: 9024 行 TSX 文件顶部 `// @ts-nocheck` 完全关闭 TS 编译器的类型检查。所有 160 个工厂函数的参数、返回值、内部变量均无类型保护。结合 `__appScope: Record<string, any>` 模式，整个文件实质上退化为无类型 JavaScript，任何拼写错误、属性缺失、参数类型不匹配都不会在编译期暴露，只能在运行时崩溃。
- 建议: 制定渐进式类型迁移计划——先为 `__appScope` 定义精确 interface（至少覆盖高频使用的 30+ 属性），然后逐批移除 `@ts-nocheck`；优先对纯逻辑函数（不依赖 JSX）添加显式返回类型标注。

---

## P1 重要

### [P1-1] `__appScope: Record<string, any>` 反模式——170 次无类型依赖注入
- 位置: src/appExtracted/appDeviceDefinitionFactories.tsx:47, 507, 1532, 1564, ...（全文件 170 处）
- 类型: 抽象层次
- 描述: 每个 `create*` 工厂函数接收 `__appScope: Record<string, any>` 并在函数体内解构数十个属性。由于类型是 `Record<string, any>`，解构出的每个变量都是 `any`，后续所有调用、属性访问、条件判断均无类型约束。一个拼写错误（如 `setCustomDeviceDraf` 漏写 `t`）不会报编译错误，只在运行时 `undefined is not a function`。
- 建议: 定义 `AppScope` interface，至少包含 `customDeviceDraft: CustomDeviceDraft`、`setCustomDeviceDraft: (d: CustomDeviceDraft | ((prev: CustomDeviceDraft) => CustomDeviceDraft)) => void` 等精确类型；或拆分为多个子 scope interface（`DeviceDefinitionScope`、`CustomDeviceScope`、`StateIconDrawingScope`），按工厂函数职责分组传入。

### [P1-2] `JSON.parse(JSON.stringify(...))` 深克隆——6 处使用
- 位置: src/appExtracted/appDeviceDefinitionFactories.tsx:436, 478, 494, 524, 7016, 7616
- 类型: bug
- 描述: `JSON.parse(JSON.stringify(obj))` 会丢失 `undefined` 属性值、将 `Date` 序列化为字符串、丢弃 `Map`/`Set`/`RegExp`、遇到循环引用直接抛异常。文件中已有一处使用 `structuredClone`（line 7013），说明环境支持该 API，但其余 6 处仍用 JSON 克隆。`DeviceTemplate`、`CustomDeviceDraft` 等复杂对象可能包含 `undefined` 字段（如 `terminalAssociations: undefined`），JSON 克隆后该字段会消失而非保持 `undefined`，导致下游 `in` 运算符或 `hasOwnProperty` 判断不一致。
- 建议: 统一替换为 `structuredClone(template)`，并在 `cloneCustomComponentTemplateSnapshot`（line 7012）中移除 `typeof structuredClone === "function"` 降级分支——目标浏览器已支持。

### [P1-3] 单文件 9024 行——严重违反单一职责
- 位置: src/appExtracted/appDeviceDefinitionFactories.tsx（全文件）
- 类型: 抽象层次
- 描述: 文件混合了至少 6 个不同职责域：(1) 状态图标绘制/对齐/吸附逻辑（lines 528-1200），(2) E 文件导入导出（lines 2470-3090），(3) SVG 模型导入（lines 3490-3550），(4) 方案/项目树渲染 JSX（lines 4300-4470），(5) 自定义元件草稿管理（lines 4480-5100），(6) 元件/类定义保存（lines 5515-8970）。任何修改都需要在巨型文件中导航，代码审查和测试隔离极其困难。
- 建议: 按职责域拆分为 5-6 个独立模块：`stateIconDrawingFactories.ts`、`eFileImportExportFactories.ts`、`svgModelImportFactories.ts`、`schemeTreeRenderers.tsx`、`customDeviceDraftFactories.ts`、`deviceDefinitionSaveFactories.ts`。

### [P1-4] 38 处 `typeof x === "function"` 防御性检查
- 位置: src/appExtracted/appDeviceDefinitionFactories.tsx（全文件 38 处，如 line 512, 515, 516, 3040, 3043, 3048, 3052）
- 类型: 简化
- 描述: 由于 `__appScope` 是 `Record<string, any>`，调用方无法确定某个回调是否存在，导致大量 `if (typeof xxx === "function") { xxx(...) }` 守卫代码。这些检查在 170 个工厂函数中累计达 38 处，增加了大量噪音。如果 `__appScope` 有精确类型，这些检查可以全部移除。
- 建议: 在 `AppScope` interface 中将所有回调标记为 required（非 optional），由注入点保证提供；或标记为 optional（`?: () => void`）并使用可选链 `xxx?.()`，减少 50% 代码量。

### [P1-5] Toast 定时器逻辑重复 3 次
- 位置: src/appExtracted/appDeviceDefinitionFactories.tsx:8298-8302, 8708-8712, 8965-8967
- 类型: 重复
- 描述: 完全相同的 5 行 toast 显示+定时器清除+重设模式在 `createSaveCustomDeviceTemplate`、`createSaveBuiltinDeviceDefinitionFromCustomDraft`、`createSaveComponentLibraryDefinition` 中各出现一次，仅 toast 文案不同。违反 DRY 原则，修改 toast 行为（如改为 5 秒、添加动画）需要改 3 处。
- 建议: 提取 `showSaveToast(__appScope, message: string)` 辅助函数，3 处调用一行即可。

---

## P2 一般

### [P2-1] 10 处空 `catch {}` 静默吞掉异常
- 位置: src/appExtracted/appDeviceDefinitionFactories.tsx:1514, 1600, 2390, 2405, 3050, 3054, 3083, 3921, 4041, 4075
- 类型: 错误处理
- 描述: 空 catch 块完全静默吞掉异常，无任何日志或上报。其中 line 3921（`fetch` SVG 数据）和 line 4041（`fetch` 图标 URL）的网络错误被静默忽略，用户看到的是功能失败但控制台无任何线索。line 3050/3054 的 `localStorage` 写入失败（如隐私模式）也是静默忽略。
- 建议: 至少添加 `console.warn("context:", error)` 或使用项目统一的 logger；对于网络 fetch 失败，考虑向用户展示降级提示。

### [P2-2] `fetch()` 无 timeout/AbortController——3 处
- 位置: src/appExtracted/appDeviceDefinitionFactories.tsx:3920, 4037, 4073
- 类型: 性能
- 描述: 3 处 `fetch()` 调用（line 3920 获取 SVG 图片数据、line 4037 获取图标 URL、line 4073 获取 entry.url）没有设置 AbortController 或 timeout。如果后端响应缓慢或挂起，UI 会无限等待，且没有取消机制。
- 建议: 封装 `fetchWithTimeout(url, { timeout: 10000 })` 工具函数，内部使用 `AbortController` + `setTimeout`；或在调用处添加 `AbortSignal.timeout(10000)`（现代浏览器原生支持）。

### [P2-3] JSX 内联对象每次渲染重新创建
- 位置: src/appExtracted/appDeviceDefinitionFactories.tsx:4306-4307, 4393-4399
- 类型: 性能
- 描述: `createRenderProjectSchemeNode` 在每次调用时为每个节点创建 `schemeIndentStyle`/`projectIndentStyle` 新对象（line 4306-4307），以及 `ProjectModelTypeIcon` 查找对象（line 4393-4399）。在方案树有大量节点时，这些内联对象会导致不必要的 re-render（如果子组件使用 `React.memo`，引用变化会使 memo 失效）。
- 建议: 将 `ProjectModelTypeIcon` 查找表提取为模块级常量；`schemeIndentStyle` 可用 `useMemo` 或在工厂函数级别缓存（按 depth 值缓存有限个样式对象）。

### [P2-4] 大量 `.map()` 在渲染路径中无记忆化
- 位置: src/appExtracted/appDeviceDefinitionFactories.tsx（全文件 118 处 `.map(`）
- 类型: 效率
- 描述: 118 处 `.map()` 调用中，许多位于工厂函数返回的回调内，每次状态变更都会重新执行。例如 `createDefinitionStateDraftRowsWithDefaultImages`（line 1532）对整个 rows 数组做 map 并为每行生成默认图片，即使只有一行变化也会重算全部。
- 建议: 对计算密集的 map 操作引入基于输入引用的缓存（如 `Map<inputHash, result>`），或在调用方使用 `useMemo` 包裹。

### [P2-5] `isGeneratedTemplateDefaultStateIconImage` 基于字符串启发式匹配
- 位置: src/appExtracted/appDeviceDefinitionFactories.tsx:1497-1517
- 类型: bug
- 描述: 该函数通过 `decodeURIComponent` 解码 SVG 后，用 `includes` 检查 5 个硬编码字符串（如 `data-platform-generated-default="true"`、`width="240"`、`height="160"`、`d="M -64 0 H 64"`、`>文本框</text>`）。如果生成的 SVG 格式微调（如属性顺序变化、空格差异），匹配会失败，导致默认图片不被识别/清理。
- 建议: 在生成默认 SVG 时注入一个确定性 marker（如 `data-device-id="generated-default"`），检测时只检查这一个 marker，而非 5 个独立字段的组合。

### [P2-6] 硬编码中文数组 `["微网", "厂站", "馈线", "台区"]`
- 位置: src/appExtracted/appDeviceDefinitionFactories.tsx:4390
- 类型: 风格
- 描述: 模型类型列表硬编码在渲染函数中。如果新增模型类型或修改名称，需要在全文件搜索找到这个隐式定义。
- 建议: 提取为模块级常量 `const KNOWN_MODEL_TYPES = ["微网", "厂站", "馈线", "台区"] as const`，或直接使用 `MODEL_TYPE_META` 的 keys。

### [P2-7] 重复的终端数组构造模式
- 位置: src/appExtracted/appDeviceDefinitionFactories.tsx:6676-6688, 7533-7536
- 类型: 重复
- 描述: `Array.from({ length: COMPONENT_LIBRARY_MAX_TERMINALS }, (_, index) => metadata.terminalTypes[index] ?? fallback)` 模式在 line 6676、6680、6684、6688、7533、7534、7535、7536 出现 8 次，仅 fallback 函数不同。
- 建议: 提取 `buildTerminalArray(metadata, field, fallback) => Array.from({ length: COMPONENT_LIBRARY_MAX_TERMINALS }, (_, i) => metadata[field][i] ?? fallback(i))`。

### [P2-8] `decodeEFileText` 的 UTF-8 检测逻辑可简化
- 位置: src/appExtracted/appDeviceDefinitionFactories.tsx:3071-3088
- 类型: 简化
- 描述: 手动检查 BOM（3 字节）再用 `TextDecoder("utf-8", { fatal: true })` 尝试解码，失败回退 GBK。逻辑正确但可读性差，且 BOM 检查和 fatal decode 两个步骤可合并。
- 建议: 提取为 `encoding.ts` 工具函数并添加单元测试，当前内联在 9000 行文件中不利于测试覆盖。

---

## P3 轻微

### [P3-1] `createNextCustomTemplateKind` 的 `Date.now()` fallback 不保证唯一
- 位置: src/appExtracted/appDeviceDefinitionFactories.tsx:8051
- 类型: bug
- 描述: 当 2-999 的编号全部被占用时，fallback 到 `${base}-${Date.now()}`。同一毫秒内并发调用会产生重复 kind。实际触发概率低（需要 999 个同类元件），但逻辑不严谨。
- 建议: 使用自增计数器或 crypto.randomUUID() 的后 8 位作为 fallback。

### [P3-2] `customParamId` 等导入未在本文件直接使用
- 位置: src/appExtracted/appDeviceDefinitionFactories.tsx:16
- 类型: 死代码
- 描述: line 16 导入的 `customParamId` 在本文件中未见使用（grep 确认），疑似残留导入。
- 建议: 移除未使用的导入。

### [P3-3] `stateIconBaseStaticTemplateKind` 只去除 `-vertical` 后缀
- 位置: src/appExtracted/appDeviceDefinitionFactories.tsx:545-547
- 类型: 简化
- 描述: 函数只处理 `-vertical` 后缀，但根据 `STATE_ICON_EDITABLE_STATIC_KIND_BY_TEMPLATE_KIND` 映射表（line 528-543），还有 `-horizontal` 等方向后缀可能存在。如果未来添加更多方向变体，该函数需要扩展。
- 建议: 使用通用正则 `/-(vertical|horizontal|left|right)$/` 或将方向后缀列表提取为常量。

### [P3-4] `reader.onerror` 未包含错误详情
- 位置: src/appExtracted/appDeviceDefinitionFactories.tsx:3062-3064
- 类型: 错误处理
- 描述: `reader.onerror = () => { showGlobalMessage("读取元件定义文件失败。"); }` 未使用 `reader.error` 提供具体错误信息。
- 建议: 改为 `reader.onerror = () => { showGlobalMessage(\`读取元件定义文件失败：${reader.error?.message ?? "未知错误"}\`); }`。

### [P3-5] JSX `key` 放在 map 回调内部根元素——正确但值得确认
- 位置: src/appExtracted/appDeviceDefinitionFactories.tsx:4311, 4409
- 类型: 风格
- 描述: `key={scheme.id}` 和 `key={project.id}` 放在 `.map()` 回调返回的根 `<div>` 上，这是正确的 React key 用法。确认无问题。
- 建议: 无需修改。

---

## 汇总

| 优先级 | 数量 | 类型分布 |
|--------|------|----------|
| P0 严重 | 1 | bug(1) |
| P1 重要 | 5 | 抽象层次(2), bug(1), 简化(1), 重复(1) |
| P2 一般 | 8 | bug(2), 性能(2), 重复(2), 错误处理(1), 简化(1), 风格(1), 效率(1) |
| P3 轻微 | 5 | bug(1), 死代码(1), 简化(1), 错误处理(1), 风格(1) |
| **合计** | **19** | |

## 最高优先修复建议

1. **立即**: 为 `__appScope` 定义精确 TypeScript interface，逐步移除 `@ts-nocheck`
2. **短期**: 将 `JSON.parse(JSON.stringify(...))` 替换为 `structuredClone`
3. **中期**: 按职责域将 9024 行文件拆分为 5-6 个独立模块
4. **长期**: 为 fetch 调用添加 AbortController，空 catch 块添加日志
