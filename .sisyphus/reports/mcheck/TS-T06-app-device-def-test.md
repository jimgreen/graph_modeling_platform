# T06 appDeviceDefinitionFactories.test.ts 审查报告

## 概览

- 文件: `src/appDeviceDefinitionFactories.test.ts`
- 行数: 6106
- 顶层 `describe` 块: 11
- `test` 用例: 124（其中 2 处 `test` 名称完全重复）
- 异步测试: 23（使用 `async () => {}`）
- `test.each` / `describe.each`: 0
- 发现总数: 22（合并同类后）

文件整体特征：绝大多数 `test` 以工厂函数 + 内联字面量构造 `scope`，单测代码量 100~250 行；116~5278 行之间几乎全部挂在同一个顶层 `describe("manual bend interaction helpers", …)` 下，该 describe 名与实际内容（设备定义 / E 文件 / 状态图元编辑 等多主题）严重不符。

## P0 严重

### [P0-1] 89 个无关测试被错误归到 "manual bend interaction helpers" describe
- 位置: src/appDeviceDefinitionFactories.test.ts:353（开始）— src/appDeviceDefinitionFactories.test.ts:5278（结束）
- 类型: 风格 / 抽象层次
- 描述: 该 `describe("manual bend interaction helpers", …)` 内挂载了设备定义保存、自定义设备模板、E 文件导出、状态图元拖拽 / 选中 / 键盘、库与类库增删等 89 个与 "manual bend interaction" 完全无关的测试；测试报告 / 失败定位 / 选择性运行（`-t`）都会被误导。
- 建议: 按主题拆分至少 6~8 个顶层 `describe`（例如 `createSaveCustomDeviceDefinitionDialog`、`createSaveDeviceDefinitionDraft`（内置派生）、`createCreateCustomComponentLibrary` / `createDeleteCustomCategoryLibrary` / `createDeleteCustomComponentLibrary`、`createExportEDeviceDefinitionFile` 相关、`stateIconDrawing*` 系列、`createApplyExistingImage` / `createApplyIconLibraryCatalogIcon`），并为每个 describe 起描述性名字。

### [P0-2] 两个 test 名称完全重复，`-t` 过滤与报告无法区分
- 位置: src/appDeviceDefinitionFactories.test.ts:712 与 src/appDeviceDefinitionFactories.test.ts:857
- 类型: bug（测试基础设施层面）
- 描述: 两处 `test("rejects an accidental empty built-in parameter table", …)` 与紧随其后的 `persists an empty built-in parameter table only after explicit delete-all`（730、875）也同名；`vitest -t` 会同时跑两个、HTML 报告里两条记录不可区分。
- 建议: 给第二组（857、875）的 test 名加前缀/后缀以区分上下文（例如 `when derived component library` / `on built-in template` 等），或合并到同一个 describe 下用 `describe.each` / `test.each` 参数化。

### [P0-3] 完全重复的 test 名（"persists an empty built-in parameter table only after explicit delete-all"）
- 位置: src/appDeviceDefinitionFactories.test.ts:730 与 src/appDeviceDefinitionFactories.test.ts:875
- 类型: bug（同 P0-2）
- 描述: 与 P0-2 成对重复；`vitest --reporter=verbose` 输出两行完全相同的用例名，CI 失败定位只能靠行号。
- 建议: 同 P0-2 的合并 / 重命名处理。

## P1 重要

### [P1-1] 内联 `scope` 字面量重复 ~10 次，每次 150~250 行（累计 ~2000 行）
- 位置: 主要分布在 src/appDeviceDefinitionFactories.test.ts:1083–1215、src/appDeviceDefinitionFactories.test.ts:1216–1366、src/appDeviceDefinitionFactories.test.ts:1367–1611、src/appDeviceDefinitionFactories.test.ts:3511–3825、src/appDeviceDefinitionFactories.test.ts:2099–2199 等
- 类型: 重复 / 简化
- 描述: `createSaveCustomDeviceDefinitionDialog` / `createSaveDeviceDefinitionDraft` / `createSaveCustomDeviceTemplate` 的 `scope` 构造几乎每次都在测试体里内联一份 150+ 行的字面量，仅 `customDeviceDraft`、`customComponentLibraries`、`libraryTemplates`、`selectedDefinitionTemplate` 等少数几处不同；既增加审阅成本，也让后续 scope 字段变更要在 10 个地方同步修改。
- 建议: 提炼 `buildCustomDeviceSaveScope(overrides)` 工厂（文件 1510–1610 已有类似 `createBuiltinDeviceDefinitionSaveHarness` 的雏形），将差异化字段作为参数；每个 test 只保留差异部分。

### [P1-2] "persist 一个空 built-in 参数表" / "reject 一个空 built-in 参数表" 场景应参数化
- 位置: src/appDeviceDefinitionFactories.test.ts:712–773、src/appDeviceDefinitionFactories.test.ts:857–914、src/appDeviceDefinitionFactories.test.ts:730–774、src/appDeviceDefinitionFactories.test.ts:875–913
- 类型: 重复
- 描述: 两个 delete-all 场景和两个 reject-空表 场景结构完全同构，只在 `isDerivedComponentLibrary` / `componentClass` / 期望结果上不同；是 `test.each` 的典型适用对象。
- 建议: 用 `test.each([{...}, {...}])` 将 4 个 test 收敛为 1 个参数化用例（或 2 个，按被测函数分）。

### [P1-3] "saves a newly created custom device …" 的三兄弟（1083 / 1216 / 1367）高度同构
- 位置: src/appDeviceDefinitionFactories.test.ts:1083、src/appDeviceDefinitionFactories.test.ts:1216、src/appDeviceDefinitionFactories.test.ts:1367
- 类型: 重复
- 描述: 三个 test 都在构造同一份 `customDeviceDraft` / `previousTemplate` / `scope`，只改变 `isDerivedComponentLibrary`、`params` 中是否包含 class / measurement 行、以及期望的断言；整体代码 >500 行，核心差异 <50 行。
- 建议: 抽出 `runCustomDeviceSaveScenario({ scenario, expectedParams, expectedMeasurements })`，用 `describe.each` 驱动三个场景。

### [P1-4] 手动 `new Promise((resolve) => { finishSave = resolve })` 的两处异步编排可收敛
- 位置: src/appDeviceDefinitionFactories.test.ts:1647–1679、src/appDeviceDefinitionFactories.test.ts:2989–3027
- 类型: 简化 / 抽象层次
- 描述: 两处都用 `let finishSave` + `new Promise<boolean>` + `finishSave?.(true)` 模拟挂起的持久化，模式相同但各自内联；可读性低于辅助函数。
- 建议: 封装 `createDeferredPromise<T>()`（返回 `{ promise, resolve, reject }`），测试里只做 `const d = createDeferredPromise<boolean>(); … d.resolve(true);`。

### [P1-5] `deviceParameterDefinitionsComplianceMessage` 三段长字面量用例堆叠
- 位置: src/appDeviceDefinitionFactories.test.ts:4156–4208、src/appDeviceDefinitionFactories.test.ts:4210–4258
- 类型: 重复 / 简化
- 描述: 两个 test 各构造 5~6 行 `parameterDefinitions` 字面量，再用 4~6 个 `expect(message).toContain(...)` 罗列错误；新增错误类型时需要同时改输入与断言，容易遗漏。
- 建议: 改为 `test.each([{ input, expectedMessages }, …])`，或抽一个 `expectComplianceErrors(input, expected)` 断言辅助。

### [P1-6] "asks for confirmation before deleting an empty category/component library" 两个 test 几乎同构
- 位置: src/appDeviceDefinitionFactories.test.ts:3827–3869、src/appDeviceDefinitionFactories.test.ts:3870–3916
- 类型: 重复
- 描述: 两个 test 都在构造 `customCategoryLibraries / customComponentLibraries` + `setX = vi.fn((updater) => …)` + 调用 `createDeleteCustomCategoryLibrary / createDeleteCustomComponentLibrary` + 验证 `showGlobalConfirm` 被调用，差异只在目标字段名。
- 建议: 合并为 `test.each([{ kind: "category" | "component", … }])`。

## P2 一般

### [P2-1] `as any` 强制转型在测试里大量出现（≥40 处）
- 位置: 例如 src/appDeviceDefinitionFactories.test.ts:449（`const node: any`）、src/appDeviceDefinitionFactories.test.ts:1352、src/appDeviceDefinitionFactories.test.ts:3512（`let customDeviceDraft: any`）、src/appDeviceDefinitionFactories.test.ts:4410、src/appDeviceDefinitionFactories.test.ts:4515 等
- 类型: 风格 / 简化
- 描述: 大量 `as any` 绕过了 `scope` / `dialog` / `customDeviceDraft` 的类型约束；当被测函数签名变化时，这些测试不会编译失败提示，而是运行时报错。
- 建议: 为 `scope` / `dialog` / `customDeviceDraft` 定义最小测试用 interface（可在 `tests/_fakes.ts` 中集中），仅在被测函数真正需要的字段上保持强类型。

### [P2-2] `vi.stubGlobal("showGlobalMessage", …)` 每次都要同时 stub `showGlobalConfirm`
- 位置: 例如 src/appDeviceDefinitionFactories.test.ts:3829–3830、src/appDeviceDefinitionFactories.test.ts:5917
- 类型: 重复
- 描述: 涉及 `showGlobalMessage` 的测试都还需要配套 stub `showGlobalConfirm`（否则跨用例泄漏）；目前每个测试各自 stub，漏掉任一个都会污染下一个用例。
- 建议: 在顶层 `beforeEach` 里统一 stub 全套 `showGlobal*` 全局（并依赖已有的 `afterEach(() => vi.unstubAllGlobals())`），单测里只覆盖具体行为。

### [P2-3] `vi.fn()` 的 "noop" 形式不统一
- 位置: 例如 src/appDeviceDefinitionFactories.test.ts:4485（`preventDefault: () => undefined`）、src/appDeviceDefinitionFactories.test.ts:4607–4608、src/appDeviceDefinitionFactories.test.ts:4788（`preventDefault: vi.fn()`）
- 类型: 风格
- 描述: 同一个 `preventDefault` 桩在不同测试里一会儿是 `() => undefined`，一会儿是 `vi.fn()`；后者可断言调用次数，前者不能。混用导致部分测试想断言 `expect(preventDefault).toHaveBeenCalled()` 时需要改写。
- 建议: 统一使用 `vi.fn()`；对不需要断言调用的场景保留 `() => undefined` 时加注释说明。

### [P2-4] 文件整体 6106 行 / 124 个 test，单文件过大
- 位置: 整个文件
- 类型: 抽象层次
- 描述: 单测文件已超出常规 reviewer 一次审阅能覆盖的体量；CI 失败时需要滚动数千行定位上下文。
- 建议: 按功能切分为 3~5 个测试文件（例如 `appDeviceDefinitionFactories.customDeviceSave.test.ts`、`appDeviceDefinitionFactories.builtinParameters.test.ts`、`appDeviceDefinitionFactories.stateIconDrawing.test.ts`、`appDeviceDefinitionFactories.eFileExport.test.ts`、`appDeviceDefinitionFactories.customLibrary.test.ts`）。

### [P2-5] `vi.fn()` 的返回值使用字面量 `"data:image/svg+xml,%3Csvg%2F%3E"` 重复 6+ 次
- 位置: 例如 src/appDeviceDefinitionFactories.test.ts:1148、src/appDeviceDefinitionFactories.test.ts:2523、src/appDeviceDefinitionFactories.test.ts:3599
- 类型: 重复
- 描述: 同一个 19 字符的占位 SVG data URL 在多个测试里重复书写，拼写错误不会被类型系统捕获。
- 建议: 抽 `const FAKE_SVG_DATA_URL = "data:image/svg+xml,%3Csvg%2F%3E"` 到顶部常量区。

### [P2-6] 多处 `isValidComponentLibraryName: (name) => /^[A-Za-z][A-Za-z0-9_-]*$/.test(name)` 内联
- 位置: 例如 src/appDeviceDefinitionFactories.test.ts:1151、src/appDeviceDefinitionFactories.test.ts:2531
- 类型: 重复
- 描述: 相同的正则校验闭包在多个 `scope` 字面量里重复；若规则要调整需改多处。
- 建议: 提升为 `const isValidComponentLibraryName = (name) => …` 顶层常量，`scope` 里直接引用。

### [P2-7] `normalizeCategoryLibraryName: (name) => name.trim()` 与 `normalizeComponentLibraryName` 同步重复
- 位置: 例如 src/appDeviceDefinitionFactories.test.ts:2560–2561
- 类型: 重复
- 描述: 两个相同实现的 stub 总是成对出现。
- 建议: 定义一次 `const trimName = (name) => name.trim()`，两处共用。

## P3 轻微

### [P3-1] 多处 `let customDeviceDraft = { … }` 使用 `let` 只是为了配合 getter
- 位置: 例如 src/appDeviceDefinitionFactories.test.ts:1084、src/appDeviceDefinitionFactories.test.ts:2118、src/appDeviceDefinitionFactories.test.ts:3512
- 类型: 风格
- 描述: `let` + `get customDeviceDraft() { return customDeviceDraft; }` 的模式是为了让测试内部 "重赋值"，但绝大多数用例从头到尾没有重赋值；此时 `const` 更贴切。
- 建议: 对没有重赋值的用例改成 `const`，仅在测试体确实修改时保留 `let` 并加注释说明。

### [P3-2] 部分 `test` 名过长（>100 字符）
- 位置: 例如 src/appDeviceDefinitionFactories.test.ts:4461（"starts state icon dragging before an asynchronous React state updater is flushed"）、src/appDeviceDefinitionFactories.test.ts:4799
- 类型: 风格
- 描述: 测试名承担了一段说明文字的职责；报告里被截断后反而丢失关键信息。
- 建议: 把 "when/then" 部分移到 `describe` 或测试体首行注释，`test` 名只保留行为动词短语。

### [P3-3] 文件头部 imports 共 110 行，包含大量仅在一个 test 里使用的一次性命名导入
- 位置: src/appDeviceDefinitionFactories.test.ts:1–110
- 类型: 风格
- 描述: 110 行的 imports 块本身可读性差；且部分命名（如 `createSyncExistingNodesWithTemplateDefinitions`）只在 1 个 test 里用到。
- 建议: 按功能分组并加 JSDoc 分隔注释；对单一使用场景的 import 可考虑就近 `await import(…)`（如已切分测试文件则此问题自然消失）。

### [P3-4] 部分 `expect(…).toBe(true)` / `toBe(false)` 断言可替换为语义更强的匹配器
- 位置: 例如 src/appDeviceDefinitionFactories.test.ts:628–629（`toBe(true)` / `toBe(false)` 对同一个函数的两种输入）、src/appDeviceDefinitionFactories.test.ts:1639、src/appDeviceDefinitionFactories.test.ts:1721
- 类型: 风格
- 描述: 对布尔返回值的 `toBe(true)` 没有携带失败时的上下文信息；失败消息只会显示 "expected true, received false"。
- 建议: 当被测函数有错误信息字段时，优先 `expect(result).toEqual({ success: true, … })` 或 `expect(result.success, result.error).toBe(true)`（文件里已有少量这种模式，例如 1847 行）。

### [P3-5] `apiPath` 字符串拼接结果在多个 test 里作为字面量断言
- 位置: 例如 src/appDeviceDefinitionFactories.test.ts:401–409（同测 9 个 `expect(hrefById.get(...)).toBe(apiPath(...))`）
- 类型: 重复
- 描述: 9 个形状完全一致的 `expect(map.get(key)).toBe(apiPath(key))` 可以收敛为一次循环断言。
- 建议: `for (const key of [...]) expect(hrefById.get(key)).toBe(apiPath(key));`。

### [P3-6] 顶层 `afterEach(() => vi.unstubAllGlobals())` 已存在，但个别 test 里又手动恢复 stub
- 位置: 例如 src/appDeviceDefinitionFactories.test.ts:112–114（顶层 afterEach）、src/appDeviceDefinitionFactories.test.ts:3829（再次 stubGlobal）
- 类型: 风格
- 描述: 既然有全局 afterEach，单测内部不需要关心 "上一个用例" 的 stub 清理；但部分测试里仍写有"先 stubGlobal、再在测试末尾手动恢复"的防御性代码，是冗余的。
- 建议: 审阅一遍，删除单测内部的冗余 stub 恢复代码。

### [P3-7] 文件里存在 `readFileSync(new URL("../public/e-templates/sgcc.e", import.meta.url), "utf8")` 的硬编码资源路径
- 位置: src/appDeviceDefinitionFactories.test.ts:5939
- 类型: 风格
- 描述: 资源路径直接写死在测试里；若 `public/e-templates` 目录搬迁，只有运行期才会发现。
- 建议: 将路径提升到常量 / 测试 fixture 辅助函数里，并在找不到文件时给出明确错误消息（例如 `if (!existsSync(...)) throw new Error(...)`）。

### [P3-8] `writeOperationLog: vi.fn()` 重复出现 10+ 次，但绝大多数用例并不关心其调用情况
- 位置: 例如 src/appDeviceDefinitionFactories.test.ts:596、src/appDeviceDefinitionFactories.test.ts:5907、src/appDeviceDefinitionFactories.test.ts:5928
- 类型: 重复
- 描述: 多数测试里 `writeOperationLog` 只是 "占位 noop"，每次都要写 `vi.fn()`。
- 建议: 在 scope 工厂里默认填充 `writeOperationLog: vi.fn()`；仅当测试需要断言时才传入自定义实现。

### [P3-9] 多处 `get customDeviceDraft() { return customDeviceDraft; }` 用 getter 包装不可变引用
- 位置: 例如 src/appDeviceDefinitionFactories.test.ts:1138–1140、src/appDeviceDefinitionFactories.test.ts:2147–2149、src/appDeviceDefinitionFactories.test.ts:2524–2526
- 类型: 风格
- 描述: 当测试体从未重新赋值 `customDeviceDraft` 时，getter 完全是冗余层；仅在测试内部会重赋值时才需要。
- 建议: 默认直接传 `customDeviceDraft` 字段；仅保留真正需要重赋值的用例使用 getter。

### [P3-10] `setCustomDeviceTemplates: vi.fn()` 等多处 mock 在测试结束时从未被 `expect`
- 位置: 例如 src/appDeviceDefinitionFactories.test.ts:585、src/appDeviceDefinitionFactories.test.ts:1121
- 类型: 死代码
- 描述: 部分 `vi.fn()` 桩在测试里只被调用、从未被断言；若其调用与否不影响被测路径，可以替换为 `() => undefined` 以减少噪音。
- 建议: 审视每个 `vi.fn()`，要么加上 `expect(…).toHaveBeenCalled…` 断言，要么降级为普通 noop 函数。

### [P3-11] `defaultComponentLibraryForCategoryLibrary: () => "UserLibrary"` / `"ACGenerator"` 两种硬编码字符串散落在各测试里
- 位置: 例如 src/appDeviceDefinitionFactories.test.ts:1145、src/appDeviceDefinitionFactories.test.ts:2520
- 类型: 风格
- 描述: 同一个字符串在多个测试里重复，且与被测 `customComponentLibraries[i].name` 必须严格相等；任何拼写差异会让测试"无声"失败（走到默认分支）。
- 建议: 抽出 `const DEFAULT_COMPONENT_LIBRARY = "UserLibrary"` 等常量，scope 字面量与被测输入共用。

### [P3-12] `hasOverlappingCustomDeviceTerminalAnchors: () => false` 重复出现 10+ 次
- 位置: 例如 src/appDeviceDefinitionFactories.test.ts:573、src/appDeviceDefinitionFactories.test.ts:1149、src/appDeviceDefinitionFactories.test.ts:2156、src/appDeviceDefinitionFactories.test.ts:2530
- 类型: 重复
- 描述: 几乎所有 `scope` 字面量都带着这个永远返回 `false` 的桩。
- 建议: 在 scope 工厂里默认设置；仅在需要测试 "anchor 重叠" 分支的用例里覆盖为会返回 `true` 的版本。

### [P3-13] `requireEditMode: () => true` 重复出现 10+ 次
- 位置: 例如 src/appDeviceDefinitionFactories.test.ts:574、src/appDeviceDefinitionFactories.test.ts:2182、src/appDeviceDefinitionFactories.test.ts:3582
- 类型: 重复
- 描述: 同 P3-12，几乎所有 `scope` 都带着永远 `true` 的桩。
- 建议: 默认值放进 scope 工厂；仅 "非编辑模式" 用例才覆盖。

### [P3-14] `closeCustomDeviceDialog: vi.fn()` 等多处 "dialog 关闭" 桩从未被断言
- 位置: 例如 src/appDeviceDefinitionFactories.test.ts:1125、src/appDeviceDefinitionFactories.test.ts:2145
- 类型: 死代码
- 描述: 这些桩在多个测试里被设置但从未 `expect`；要么补断言，要么降为 noop。
- 建议: 同 P3-10。

### [P3-15] `ensureCustomComponentTreeExpanded: vi.fn()` 重复出现 10+ 次，绝大多数测试不关心
- 位置: 例如 src/appDeviceDefinitionFactories.test.ts:1147、src/appDeviceDefinitionFactories.test.ts:2522
- 类型: 死代码 / 重复
- 描述: 同 P3-10、P3-12。
- 建议: 默认值放进 scope 工厂；仅在相关用例断言。

### [P3-16] `customDeviceGeneratedDefaultImageCandidates: () => []` 重复 5+ 次
- 位置: 例如 src/appDeviceDefinitionFactories.test.ts:1141、src/appDeviceDefinitionFactories.test.ts:2150、src/appDeviceDefinitionFactories.test.ts:2501
- 类型: 重复
- 描述: 同 P3-12 模式。
- 建议: 默认值放进 scope 工厂。

### [P3-17] `customDeviceImageWithTerminalConnectors: (image) => image` 重复 5+ 次
- 位置: 例如 src/appDeviceDefinitionFactories.test.ts:1142、src/appDeviceDefinitionFactories.test.ts:2151、src/appDeviceDefinitionFactories.test.ts:2502
- 类型: 重复
- 描述: 同一个恒等函数每次重新写一遍。
- 建议: 提到模块级常量 `const identityImage = (image) => image`，scope 字面量里引用。

### [P3-18] 多个测试里 `error: ""` 字段作为 `customDeviceDraft` 默认值出现 10+ 次
- 位置: 例如 src/appDeviceDefinitionFactories.test.ts:1103、src/appDeviceDefinitionFactories.test.ts:2139、src/appDeviceDefinitionFactories.test.ts:3531
- 类型: 重复
- 描述: 默认空字符串每次都要写。
- 建议: 在 scope / draft 工厂里默认。

### [P3-19] `deviceDefinitionOverrides: {}` 或 `deviceDefinitionOverrides: { "class:…": … }` 字面量在测试里直接展开
- 位置: 例如 src/appDeviceDefinitionFactories.test.ts:2507–2519、src/appDeviceDefinitionFactories.test.ts:5316
- 类型: 风格
- 描述: 复杂的 `deviceDefinitionOverrides` 字面量在测试里直接展开，可读性差。
- 建议: 抽出 `buildDeviceDefinitionOverrides({ classEntries, sharedEntries })` 辅助，测试里只描述差异。

### [P3-20] `customComponentLibraries: [{ name, categoryLibraryName, … }]` 字面量重复 10+ 次
- 位置: 例如 src/appDeviceDefinitionFactories.test.ts:1126–1136、src/appDeviceDefinitionFactories.test.ts:2532–2545、src/appDeviceDefinitionFactories.test.ts:3538–3549
- 类型: 重复
- 描述: 同一个 5~10 行的 `customComponentLibraries` 元素字面量被复制粘贴 10+ 次；只有 `name` / `terminalTypes` 等个别字段变化。
- 建议: 抽出 `buildCustomComponentLibrary(overrides)` 工厂，测试只传差异。

### [P3-21] `libraryTemplates: [{ kind: "ac-source", label: "交流电源", … }]` 字面量重复 10+ 次
- 位置: 例如 src/appDeviceDefinitionFactories.test.ts:2532–2545、src/appDeviceDefinitionFactories.test.ts:3538 附近、src/appDeviceDefinitionFactories.test.ts:5905 等
- 类型: 重复
- 描述: 同一个 10+ 行的 `libraryTemplates` 元素字面量被复制粘贴 10+ 次。
- 建议: 抽出 `buildLibraryTemplate(overrides)` 工厂；fixture 文件集中预置 `ACLoad` / `ACGenerator` / `DCLoad` 等常见模板。

### [P3-22] `measurementConfig: { measurementTypes: [{ id, name, key, … }] }` 字面量 20+ 行重复出现
- 位置: 例如 src/appDeviceDefinitionFactories.test.ts:3563–3578
- 类型: 重复
- 描述: 20+ 行的 `measurementConfig` 字面量只在少数测试里使用，但每次都是 20+ 行的复制粘贴。
- 建议: 抽 `buildMeasurementConfig(overrides)` 工厂；fixture 里预置 `pressure` / `voltage` 等常见类型。
