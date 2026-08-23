# T17 appView 系列审查报告

## 概览

| 维度 | 数值 |
|------|------|
| 文件数 | 5 |
| 总行数 | 3872 |
| 发现总数 | 17 |

| 文件 | 行数 |
|------|------|
| `src/appExtracted/appView.tsx` | 2648 |
| `src/appView.test.tsx` | 1107 |
| `src/appViewImagePicker.test.ts` | 38 |
| `src/appExtracted/appViewRenderBoundary.tsx` | 31 |
| `src/appViewRenderBoundary.test.tsx` | 48 |

---

## P0 严重

### [P0-1] 2648 行文件完全禁用 TypeScript 类型检查
- 位置: `src/appExtracted/appView.tsx:1`
- 类型: 安全
- 描述: 文件首行 `// @ts-nocheck` 使整个 2648 行文件绕过 TypeScript 编译检查，所有参数、返回值、状态类型均无编译期保障，任何类型错误只能在运行时暴露
- 建议: 分阶段移除 `@ts-nocheck`；优先为 `renderAppView` 的 `__appScope` 参数定义完整 interface，逐步添加类型标注

### [P0-2] renderAppView 单函数体超过 2000 行
- 位置: `src/appExtracted/appView.tsx:551-2648`
- 类型: 抽象层次
- 描述: `renderAppView` 从第 551 行到文件末尾约 2100 行，包含状态声明、事件处理、useEffect、JSX 渲染全部耦合在一个函数内，认知复杂度极高且无法独立测试
- 建议: 按职责拆分为多个子 hook（`useTopologyWarning`、`useImagePicker`、`useCustomDeviceDraft`、`useEDeviceInterface` 等），`renderAppView` 仅负责组装和渲染

---

## P1 重要

### [P1-1] 10+ 个重复的 Escape 键关闭 useEffect 模式
- 位置: `src/appExtracted/appView.tsx:1974-2087`
- 类型: 重复
- 描述: 至少 10 个 `useEffect` 遵循完全相同的模式——判断弹窗是否打开、注册 `keydown` 监听 Escape、清理监听。每个 5-7 行，合计 ~110 行冗余代码
- 建议: 提取 `useEscapeToClose(isOpen, onClose)` 自定义 hook，所有弹窗统一调用一行

### [P1-2] 单行解构超过 2000 字符
- 位置: `src/appExtracted/appView.tsx:576`
- 类型: 风格
- 描述: 从 `__appScope` 解构约 200+ 个属性写在单行，行宽超过 2000 字符被截断，完全不可读且 diff 时产生大面积冲突
- 建议: 按功能域分组解构为多行（状态/回调/配置/UI），或直接从 `__appScope` 按需引用而非一次性解构

### [P1-3] useEffect 依赖数组遗漏回调函数
- 位置: `src/appExtracted/appView.tsx:1974-2087`
- 类型: bug
- 描述: 多个 Escape 键 useEffect 的依赖数组仅包含弹窗 open 状态，遗漏了实际调用的回调函数（如 `closeLibraryPackageDialog`、`requestCloseCustomDeviceDialog`、`closeDeviceDefinitionDialog` 等），若这些回调引用变化会导致闭包过期
- 建议: 将回调函数加入依赖数组，或使用 `useRef` 保持最新引用

### [P1-4] imagePickerFolderNameById 每次渲染重建 Map
- 位置: `src/appExtracted/appView.tsx:2096`
- 类型: 性能
- 描述: `new Map((imageFolders ?? []).map(...))` 在每次渲染时执行，当 `imageFolders` 未变化时产生不必要的内存分配和 GC 压力
- 建议: 使用 `useMemo(() => new Map(...), [imageFolders])` 缓存

### [P1-5] imagePickerCategoryOptions 每次渲染重新计算
- 位置: `src/appExtracted/appView.tsx:2111`
- 类型: 性能
- 描述: 包含 `Set` 去重、`map`、`sort` 链式操作，在每次渲染时无条件执行
- 建议: 使用 `useMemo` 包裹，依赖 `sourceFilteredImageAssetList`

### [P1-6] eslint-disable 压制 react-hooks/exhaustive-deps
- 位置: `src/appExtracted/appView.tsx:1863`
- 类型: bug
- 描述: `eFileEditorExportOptions` 的 `useMemo` 依赖数组遗漏 `resolveTemplateComponentLibrary` 和 `resolveDefinitionComponentLibrary`，通过 eslint-disable 压制告警。若这些函数引用变化将导致缓存值过期
- 建议: 将遗漏的依赖加入数组，或将依赖函数用 `useCallback` / `useRef` 稳定化后移除 disable 注释

### [P1-7] 测试大量使用源码字符串匹配而非行为验证
- 位置: `src/appView.test.tsx` 多处（第 105-117, 122-131, 502-529, 680-702, 704-718, 880-884 行等）
- 类型: 效率
- 描述: 约 30% 的测试用例通过 `readFileSync` 读取源码后用 `toContain` / `toMatch` 正则验证代码结构。这些测试在代码重构（变量重命名、标签属性调整）时大量假阳性失败，且不验证任何运行时行为
- 建议: 将源码结构测试替换为组件渲染测试或 hook 单元测试；对必须保留的结构约束，集中到少数 snapshot 测试

### [P1-8] useMemo 依赖数组遗漏 resolveTemplateComponentLibrary
- 位置: `src/appExtracted/appView.tsx:1864`
- 类型: bug
- 描述: `eFileEditorExportOptions` 的 `useMemo` 使用了 `resolveDefinitionComponentLibrary` 回调，但依赖数组中未包含该变量。eslint-disable 注释掩盖了此问题
- 建议: 将 `resolveDefinitionComponentLibrary` 加入依赖数组，或用 `useCallback` 稳定化

---

## P2 一般

### [P2-1] "keeps the tab type explicit" 测试永远不会失败
- 位置: `src/appViewImagePicker.test.ts:34-37`
- 类型: 效率
- 描述: 测试将字面量 `"image"` 赋给类型声明变量再断言等于 `"image"`，这是纯类型级别检查在运行时执行，即使删除该测试也不影响任何覆盖保障
- 建议: 删除该测试，或改为验证 `ImagePickerLibraryTab` 联合类型的所有合法值

### [P2-2] 测试通过 `(appViewModule as any)` 访问未导出内部函数
- 位置: `src/appView.test.tsx:503-504, 532` 等多处
- 类型: 风格
- 描述: 多个测试通过 `(appViewModule as any).functionName` 访问未显式导出的内部函数。TypeScript `any` 转型使这些调用绕过类型检查，若函数签名变化无法在编译期发现
- 建议: 显式导出需要测试的内部函数，或在测试文件中使用 `@ts-expect-error` 加注释说明意图

### [P2-3] ViewSectionProps.inputs 类型为 readonly unknown[]
- 位置: `src/appExtracted/appViewRenderBoundary.tsx:4`
- 类型: 简化
- 描述: `inputs` 使用 `readonly unknown[]` 类型，`Object.is` 比较虽然正确但完全丧失类型信息，调用方可以传入任意类型混合数组而无编译期反馈
- 建议: 考虑使用泛型 `inputs: readonly T[]` 或至少 `readonly (string | number | boolean | null | undefined)[]` 约束

### [P2-4] 测试访问 React 内部属性 .compare
- 位置: `src/appViewRenderBoundary.test.tsx:46`
- 类型: 效率
- 描述: `(MemoizedViewSection as any).compare` 访问 React `memo` 组件的内部属性验证比较器是否正确绑定。此属性是 React 实现细节，版本升级后可能变化
- 建议: 改为行为测试——渲染组件并验证在 inputs 不变时 render 回调不被重复调用

### [P2-5] useEffect 依赖数组遗漏 requestCloseCustomDeviceDialog
- 位置: `src/appExtracted/appView.tsx:2014-2021`
- 类型: bug
- 描述: Escape 键关闭 `customDeviceDialog` 的 useEffect 依赖数组仅有 `[customDeviceDialogOpen]`，遗漏了 `requestCloseCustomDeviceDialog` 回调。若该回调引用变化（如从 scope 重新解构），将使用过期闭包
- 建议: 将 `requestCloseCustomDeviceDialog` 加入依赖数组

### [P2-6] overlayLayerRevisionRef 在渲染期间直接变更 ref
- 位置: `src/appExtracted/appView.tsx:2343-2346`
- 类型: 风格
- 描述: `if (overlayLayerActive) { overlayLayerRevisionRef.current += 1 }` 在渲染函数体内直接修改 ref，违反 React 渲染纯函数约定。虽然 ref 变更不触发重渲染，但在 React Strict Mode 下双重渲染可能导致计数器不一致
- 建议: 将此逻辑移入 `useEffect` 或使用 `useRef` + 惰性初始化模式

### [P2-7] buildEDeviceInterfaceDefinitionTree 未在模块中导出但被测试访问
- 位置: `src/appExtracted/appView.tsx` 内部函数, `src/appView.test.tsx:532`
- 类型: 风格
- 描述: `buildEDeviceInterfaceDefinitionTree` 是模块内部函数，测试通过 `(appViewModule as any)` 强制访问。第 535-537 行还有 `if (typeof buildTree !== "function") return` 的防御性早退，使测试在函数不存在时静默通过
- 建议: 显式导出该函数，删除 typeof 防御性检查

---

## P3 轻微

### [P3-1] lazy import 的 .then 回调可用 React.lazy 的命名导入简化
- 位置: `src/appExtracted/appView.tsx:36-43`
- 类型: 简化
- 描述: 4 个 `lazy(() => import(...).then(m => ({ default: m.Named })))` 模式重复，可用辅助函数 `lazyNamed(module, exportName)` 统一
- 建议: 提取 `const lazyNamed = (loader, name) => lazy(() => loader().then(m => ({ default: m[name] })))`

### [P3-2] TopologyWarningPanelContent 使用 `any` 类型参数
- 位置: `src/appExtracted/appView.tsx:419-428`
- 类型: 风格
- 描述: 组件 props 如 `allErrors: any[]`、`categorize: (error: any) => string` 全部使用 `any`，在 `@ts-nocheck` 下虽不影响编译但降低可维护性
- 建议: 定义 `TopologyError` 接口替代 `any`

### [P3-3] sourceFilteredImageAssetList 三元嵌套可读性差
- 位置: `src/appExtracted/appView.tsx:2088-2094`
- 类型: 风格
- 描述: 三层嵌套三元表达式计算 `sourceFilteredImageAssetList`，单行逻辑分支过深
- 建议: 拆分为 `if/else` 分支或使用早返回模式

### [P3-4] readSourceFiles 辅助函数使用同步 readFileSync
- 位置: `src/appView.test.tsx:40-42`
- 类型: 效率
- 描述: 测试辅助函数 `readSourceFiles` 使用 `readFileSync` 同步读取 6 个源文件。在大型项目中这会阻塞测试线程，但鉴于仅用于测试且文件数量固定，影响有限
- 建议: 可保持不变，或在文件增多时改为 `beforeAll` 中一次性读取缓存

---

## 统计

| 优先级 | 数量 |
|--------|------|
| P0 严重 | 2 |
| P1 重要 | 8 |
| P2 一般 | 7 |
| P3 轻微 | 4 |
| **合计** | **17** |
