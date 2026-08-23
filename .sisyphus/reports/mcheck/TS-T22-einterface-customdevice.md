# T22 EInterface + customDeviceUtils 审查报告

## 概览

| 指标 | 值 |
|------|-----|
| 文件数 | 3 |
| 总行数 | 3430（1165 + 1191 + 1074） |
| 发现总数 | 19 |
| P0 | 2 |
| P1 | 5 |
| P2 | 7 |
| P3 | 5 |

---

## P0 严重

### [P0-1] appDeviceDefinitionEInterface.ts 全文件禁用 TypeScript 类型检查
- 位置: appDeviceDefinitionEInterface.ts:1
- 类型: 风格
- 描述: `// @ts-nocheck` 使整个 1165 行文件完全绕过 TS 编译期类型检查，所有 `any` 参数、缺失属性访问、类型不匹配均不会报错，任何重构或字段改名都无法被编译器捕获，静默引入运行时 bug 的风险极高。
- 建议: 逐步移除 `@ts-nocheck`，先从函数签名开始补全类型；对无法立即类型化的外部依赖使用 `unknown` + 类型守卫。至少应替换为 `@ts-check` 配合 JSDoc，恢复基本类型检查。

### [P0-2] SVG 拼接中 terminalTypes 未转义，存在 XSS 注入面
- 位置: customDeviceUtils.ts:1037
- 类型: 安全
- 描述: `generateCustomDeviceImage` 对 `label` 调用了 `escapeXml`，但 `terminalTypes` 仅调用 `.toUpperCase()` 后直接拼入 SVG 文本节点。若 `TerminalType` 将来扩展为允许用户自定义值（或从 E 文件导入时未校验），恶意字符串可闭合 SVG 标签注入脚本。当前枚举类型提供了有限保护，但纵深防御不足。
- 建议: 对 `terminalTypes` 每个元素也调用 `escapeXml()`，或在函数入口添加白名单校验 `TERMINAL_TYPE_LIBRARYLabels` 键集。

---

## P1 重要

### [P1-1] applyEDeviceDefinitionSectionsToLibraryState 函数过长（~430 行）
- 位置: appDeviceDefinitionEInterface.ts:709-1138
- 类型: 抽象层次
- 描述: 单个函数承担 section 合并、字段补充、元件匹配、模板字段存储、override 写入、派生类过滤等六项职责，嵌套深度达 5 层，圈复杂度远超可维护阈值。任何局部修改都需要理解全函数上下文。
- 建议: 拆分为 `mergeRuntimeSections`、`matchSectionToDevice`、`buildTemplateFields`、`applyOverridePatches` 四个子函数，每个 < 80 行。

### [P1-2] 模板 parameterDefinitions/measurementDefinitions 删除逻辑跨文件重复
- 位置: appDeviceDefinitionEInterface.ts:1088-1093 vs customDeviceUtils.ts:536-541
- 类型: 重复
- 描述: 两处均执行 `delete next.parameterDefinitions; delete next.parameterDefinitionsIntent; delete next.measurementDefinitions; delete next.measurementDefinitionsIntent` 完全相同的四行清理逻辑。修改一处（如新增 `parameterDefinitionsComplete`）另一处将静默遗漏。
- 建议: 抽取 `stripBusinessDefinitionsFromTemplate(template)` 到 `customDeviceUtils.ts` 并导出，两处统一调用。

### [P1-3] fallback anchor 数组重复定义
- 位置: customDeviceUtils.ts:810-818 与 customDeviceUtils.ts:833-841
- 类型: 重复
- 描述: `createDefaultCustomDeviceTerminalAnchors` 和 `defaultTemplateTerminalAnchors` 各自硬编码了完全相同的 8 个 fallback anchor 坐标 `{x: -0.5, y: 0}` ... `{x: 0.5, y: 0.25}`。修改 fallback 策略时必须同步两处。
- 建议: 提取为模块级常量 `DEFAULT_TERMINAL_FALLBACK_ANCHORS`，两处引用同一数组。

### [P1-4] parseCustomDefinitions 静默吞掉 JSON 解析错误
- 位置: customDeviceUtils.ts:1162-1168
- 类型: 错误处理
- 描述: `JSON.parse` 失败时直接返回空数组，无任何日志或错误上报。用户导入的自定义参数定义 JSON 格式错误时完全无感知，数据静默丢失。
- 建议: 至少 `console.warn` 输出解析错误信息；理想方案是返回 `Result<definitions, error>` 让调用方决定如何处理。

### [P1-5] screenToSvgPoint 使用 Math.round 丢失亚像素精度
- 位置: customDeviceUtils.ts:1180
- 类型: bug
- 描述: `Math.round(transformed.x/y)` 将 SVG 坐标取整到像素级，导致端子锚点在高缩放比下出现可见的位置跳动（尤其 150%+ DPI 缩放时）。端子连接线的视觉对齐将不准确。
- 建议: 改为 `Number(transformed.x.toFixed(2))` 保留两位小数，或使用 `Math.round(v * 100) / 100` 保留亚像素精度。

---

## P2 一般

### [P2-1] eDeviceInterfacePatchesForRow 内部线性扫描导致 O(n*m) 复杂度
- 位置: appDeviceDefinitionEInterface.ts:577-633
- 类型: 性能
- 描述: `findSectionFieldIndex` 对每个 row field 线性遍历 `availableFields`，且在未匹配时再次线性扫描寻找空位。当设备属性字段和模板字段均较多时（如 ACNode 有 30+ 字段），产生 O(n*m) 开销。
- 建议: 预先构建 `Map<complianceKey, index>` 索引，将匹配降为 O(1) 查找。

### [P2-2] CUSTOM_DEVICE_PERSISTED_TERMINAL_GROUP_PATTERN 正则存在 ReDoS 风险
- 位置: customDeviceUtils.ts:1047-1048
- 类型: 安全
- 描述: 正则 `/<g\b(?=[^>]*\bdata-custom-device-...)[^>]*>[\s\S]*?<\/g>/giu` 包含嵌套量词 `[^>]*` 和 `[\s\S]*?`，对于超大 SVG 输入（如用户粘贴的恶意 SVG）可能触发指数级回溯。
- 建议: 限制输入 SVG 长度（如 1MB），或将 `[\s\S]*?` 替换为 `[^<]*(?:<(?!\/g>)[^<]*)*` 消除回溯路径。

### [P2-3] createEmptyCustomDeviceDraft 无论终端数量始终分配 MAX 长度数组
- 位置: customDeviceUtils.ts:863-867
- 类型: 效率
- 描述: `terminalTypes`、`terminalLabels`、`terminalRoles`、`terminalAssociations` 始终分配 `MAX_CUSTOM_DEVICE_TERMINALS` 长度数组，即使实际只需要 2 个端子。后续遍历和序列化都需处理无用的空槽位。
- 建议: 按 `terminalCount` 分配，或在读取时惰性填充。

### [P2-4] 大量 `any` 类型签名贯穿 appDeviceDefinitionEInterface.ts
- 位置: appDeviceDefinitionEInterface.ts:22, 513-521, 709-721, 1059 等多处
- 类型: 风格
- 描述: 函数参数和返回值广泛使用 `any`（`frame: any`、`template: any`、`section: any`），配合 `@ts-nocheck` 使编译器完全无法辅助检查。至少 40+ 处 `any` 类型标注。
- 建议: 定义 `EDeviceInterfaceSection`、`EDeviceInterfaceField`、`EDeviceInterfaceDefinitionRow` 等接口替代 `any`。

### [P2-5] generateCustomDeviceImage 生成单行超长 SVG 字符串
- 位置: customDeviceUtils.ts:1037
- 类型: 风格
- 描述: 整个 SVG 模板拼在一行（约 500 字符），可读性和可维护性差。修改 SVG 结构时极易引入拼接错误。
- 建议: 使用模板字符串多行格式化，或提取为 `.svg` 资源文件通过 import 加载。

### [P2-6] 工具函数 screenToSvgPoint / primaryOrthogonalAxis / constrainPointToOrthogonalAxis 放置位置不当
- 位置: customDeviceUtils.ts:1171-1191
- 类型: 抽象层次
- 描述: 这三个纯几何工具函数与"自定义设备"业务无关，属于通用 SVG/几何工具，却定义在 `customDeviceUtils.ts` 末尾。增加了模块职责的模糊性。
- 建议: 移至 `svgUtils.ts` 或新建 `geometryUtils.ts`。

### [P2-7] 测试文件中大量使用 `as any` 绕过类型检查
- 位置: customDeviceUtils.test.ts:531, 1007, 1064 等多处
- 类型: 风格
- 描述: 至少 5 处使用 `} as any` 构造不完整的 mock template 对象。若 `DeviceTemplate` 接口新增必填字段，这些测试不会报错，可能掩盖真实类型不匹配。
- 建议: 使用 `satisfies Partial<DeviceTemplate>` 或工厂函数 `buildTestTemplate(overrides)` 提供类型安全的测试 fixture。

---

## P3 轻微

### [P3-1] RUNTIME_GENERATED_SECTIONS 定义位置远离使用处
- 位置: appDeviceDefinitionEInterface.ts:695-707
- 类型: 风格
- 描述: 两个关键常量 `RUNTIME_GENERATED_SECTIONS` 和 `RUNTIME_GENERATED_STANDALONE_SECTIONS` 定义在文件中部（line 695），夹在两个大函数之间，不易发现。
- 建议: 移至文件顶部常量区，与其他模块级常量集中管理。

### [P3-2] 测试用例 "keeps every built-in business definition" 遍历完整 DEVICE_LIBRARY
- 位置: customDeviceUtils.test.ts:584-594, 649-674, 768-777, 779-800, 829-854
- 类型: 效率
- 描述: 5 个测试用例各自遍历完整 `DEVICE_LIBRARY`（数十个模板），每个模板执行 normalize + apply + resolve 全链路。库增长后测试耗时将线性增加，且失败时定位困难。
- 建议: 选取 2-3 个代表性模板（一个内置基础类、一个派生类、一个容器类）做精确断言，保留一个全库遍历作为冒烟测试。

### [P3-3] 多个 `.filter(Boolean)` 模式静默丢弃 falsy 值
- 位置: customDeviceUtils.ts:1085, appDeviceDefinitionEInterface.ts:1028
- 类型: 错误处理
- 描述: `.filter(Boolean)` 会静默移除 `""`、`0`、`null`、`undefined`、`false`。在字段映射管道中，如果某个合法的 `exportName` 恰好为空字符串，将被无声丢弃。
- 建议: 改为显式 `.filter((f) => f.exportName != null && f.exportName !== "")` 明确意图。

### [P3-4] 测试文件缺少对核心 UI 生成路径的覆盖
- 位置: customDeviceUtils.test.ts
- 类型: 重复
- 描述: 无测试覆盖 `generateCustomDeviceImage`、`customDeviceImageWithTerminalConnectors`、`createEmptyCustomDeviceDraft`、`createDefinitionVisualDraft`、`screenToSvgPoint`。这些函数直接生成用户可见的 SVG 和表单，缺乏回归保护。
- 建议: 补充至少覆盖：空 terminalTypes 输入、含特殊字符 label、SVG 注入/清理、锚点归一化边界值。

### [P3-5] deviceDefinitionComplianceKey 调用密集但无缓存
- 位置: appDeviceDefinitionEInterface.ts:668, 822, 921, 966 等多处
- 类型: 效率
- 描述: `deviceDefinitionComplianceKey` 在匹配循环中被反复调用（对每个 field 的 sourceName/exportName/cnName），但相同字符串的合规化结果不会变化。大量重复计算。
- 建议: 在循环外预计算 `rowFieldsByKey` 时缓存 compliance key，或使用 `Map<string, string>` 做 memo。
