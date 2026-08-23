# T24 measurements 审查报告

## 概览

| 指标 | 值 |
|------|-----|
| 文件数 | 4 |
| 总行数 | 2962 (measurements.ts: 1537, measurements.test.ts: 1189, measurementDefinitionTypes.ts: 188, measurementDefinitionTypes.test.ts: 48) |
| 发现总数 | 21 |
| P0 严重 | 0 |
| P1 重要 | 5 |
| P2 一般 | 10 |
| P3 轻微 | 6 |

---

## P0 严重

无。

---

## P1 重要

### [P1-1] 跨文件重复类型定义 — 维护隐患
- 位置: `src/measurements.ts`:21-40, `src/measurementDefinitionTypes.ts`:1-12
- 类型: 重复
- 描述: `MeasurementFontWeight`、`MeasurementFontStyle`、`MeasurementTextDecoration`、`MeasurementStyleOverride` 在两个文件中各定义一份完全相同的类型。任一侧修改而另一侧遗漏将导致结构性类型不兼容。
- 建议: 在 `measurementDefinitionTypes.ts` 中保留唯一定义，`measurements.ts` 通过 `import type` 引用。

### [P1-2] 跨文件重复归一化函数 — 逻辑分叉风险
- 位置: `src/measurements.ts`:765-788, `src/measurementDefinitionTypes.ts`:131-143
- 类型: 重复
- 描述: `normalizedAssociatedField` 和 `normalizedMeasurementTypeId` 在两个文件中各实现一份，正则逻辑完全相同（gasQuantity→gas_quantity, stateOfCharge→soc）。未来新增别名映射时极易遗漏一处。
- 建议: 将这两个函数提取为共享 util，两侧均 import。

### [P1-3] `measurementValuesEqual` 用 JSON.stringify 做深比较
- 位置: `src/measurements.ts`:1320-1322
- 类型: bug
- 描述: `JSON.stringify(left) === JSON.stringify(right)` 对 key 顺序敏感（`{a:1,b:2}` ≠ `{b:2,a:1}`），且 `undefined` 属性会被序列化丢弃。该函数用于 `mergeInheritedMeasurementValue`（:1365）和 `reconcileProjectMeasurementsWithConfig`（:1487）的引用稳定性判断，可能导致不必要的 re-render 或错误地返回旧引用。
- 建议: 对 `styleOverride` 等对象类型使用逐字段比较；对原始值用 `===`；或引入轻量 deep-equal 工具函数。

### [P1-4] `Date.now()` 导致归一化不确定
- 位置: `src/measurements.ts`:1055
- 类型: bug
- 描述: `normalizeMeasurementItem` 在 `item.id` 缺失时用 `${measurementTypeId}-${Date.now()}` 生成 fallback ID。同一输入多次调用产生不同 ID，破坏归一化的幂等性，可能导致 reconciliation 误判为新增 item。
- 建议: 使用确定性 fallback，如 `${measurementTypeId}-${role ?? "item"}-${index}`，或在调用方预分配 ID。

### [P1-5] 测试文件 1189 行但 `measurementDefinitionTypes.test.ts` 仅 48 行 — 覆盖严重失衡
- 位置: `src/measurementDefinitionTypes.test.ts`:1-48
- 类型: 重复
- 描述: `measurementDefinitionTypes.ts` 含 `createMeasurementFieldParameterDefinition`（带 fallback 分支）、`cloneDeviceMeasurementDefinitions`、`normalizeDeviceMeasurementDefinitions`（含 style 归一化、decimals clamp）共 ~190 行逻辑，但仅 3 个测试用例。`cloneDeviceMeasurementDefinitions` 和 style 归一化路径完全未测试。
- 建议: 补充测试：(1) `cloneDeviceMeasurementDefinitions` 深拷贝验证；(2) `normalizeDeviceMeasurementDefinitions` 非法输入、style 字段过滤、decimals 越界 clamp；(3) `createMeasurementFieldParameterDefinition` 带 fallback cnName/valueType 的参数组合。

---

## P2 一般

### [P2-1] DEFAULT_MEASUREMENT_CONFIG.deviceProfiles 硬编码 ~30 种设备 — 应数据驱动
- 位置: `src/measurements.ts`:538-670
- 类型: 抽象层次
- 描述: 每种设备类型的 profile items 以字面量逐条罗列，ac-switch/dc-switch/ac-breaker/dc-breaker 等变体仅有微小差异（有无 reactivePower）。新增设备类型需手动复制粘贴整个 block。
- 建议: 提取工厂函数 `buildSwitchProfile(kind, includeReactive)` 或声明式配置表，减少重复。

### [P2-2] DEFAULT_MEASUREMENT_CONFIG.measurementTypes 每项重复 6 个默认值
- 位置: `src/measurements.ts`:524-570
- 类型: 重复
- 描述: 每个 `MeasurementTypeDefinition` 都重复 `defaultColor: "#334155", defaultFontFamily: "Arial", defaultFontSize: 14, defaultFontWeight: "500"`，而 `DEFAULT_TYPE_VALUES`（:371-381）已定义了相同默认值但未被用于配置构建。
- 建议: 使用 `...DEFAULT_TYPE_VALUES` 展开作为基础，各类型仅覆盖差异字段。

### [P2-3] `fallbackMeasurementProfileKinds` 70 行 if-else 链
- 位置: `src/measurements.ts`:796-865
- 类型: 简化
- 描述: 通过大量 `if (baseKind.includes(...))` + `if (baseKind.startsWith(...))` 启发式匹配设备类型到 profile。规则之间隐式耦合，新增设备种类需在多处添加分支。
- 建议: 重构为 `[pattern, profileKind][]` 声明式映射表，用循环替代 if-else。

### [P2-4] 迁移函数嵌套调用链
- 位置: `src/measurements.ts`:1013-1018
- 类型: 抽象层次
- 描述: `migrateHydrogenCouplingMeasurementProfileItems(deviceKind, migrateHydrogenTankMeasurementProfileItems(deviceKind, items))` 每新增一种迁移就加一层嵌套，可读性递减。
- 建议: 改为迁移函数数组 `const migrations = [migrateTank, migrateCoupling, ...]`，用 `reduce` 串联。

### [P2-5] `withRequiredBuiltInMeasurementProfileItems` 内嵌大型 switch
- 位置: `src/measurements.ts`:636-693
- 类型: 抽象层次
- 描述: 根据 deviceKind 用 if-else 决定哪些 item 是 required，逻辑与 DEFAULT_MEASUREMENT_CONFIG.deviceProfiles 隐式耦合。
- 建议: 将 required items 声明为 profile 的一部分（如 `requiredFields: string[]`），消除运行时判断。

### [P2-6] 测试中大量重复的三端子变压器节点构造
- 位置: `src/measurements.test.ts`:223-226, 709-714, 808-814
- 类型: 重复
- 描述: 多个测试各自内联构造含 terminals 的 transformer ModelNode，字段几乎相同。
- 建议: 提取 `transformerNode(id, terminalIds)` 工厂函数。

### [P2-7] `for...of` 循环替代 `test.each` — 测试粒度不足
- 位置: `src/measurements.test.ts`:121-156, 425-442
- 类型: 风格
- 描述: 使用 `for (const kind of [...])` 在一个 test 内循环断言。任一 kind 失败即终止整个循环，无法看到其余 kind 的结果。
- 建议: 改用 `test.each([...])("... for %s", (kind) => {...})` 获得独立失败报告。

### [P2-8] 单个测试承载过多职责
- 位置: `src/measurements.test.ts`:40-81
- 类型: 风格
- 描述: 第一个测试同时验证 legacy measurement profiles 保留、tapPosition 注入、ac-line/dc-line/ac-switch/dc-switch/ac-transformer 五种设备的 profile fields。任一断言失败时定位成本高。
- 建议: 按设备类型拆分为独立 test 或使用 `test.each`。

### [P2-9] `styleOverride` 归一化内联在 `normalizeDeviceMeasurementDefinitions` 中过于冗长
- 位置: `src/measurementDefinitionTypes.ts`:155-173
- 类型: 简化
- 描述: 18 行条件 spread 逐字段构建 styleOverride，与 `measurements.ts` 中的 `normalizeStyleOverride` 功能重叠但实现不同。
- 建议: 统一使用 `normalizeStyleOverride` 函数，消除两处实现。

### [P2-10] `resolveMeasurementItemBindingMetadata` 函数过长（~45 行）
- 位置: `src/measurements.ts`:877-920
- 类型: 简化
- 描述: 该函数同时负责 config 查找、profile 匹配、style 合并、display 属性解析，职责过多。
- 建议: 拆分 `resolveItemStyle` 和 `resolveItemLabel` 子函数。

---

## P3 轻微

### [P3-1] `HYDROGEN_TANK_LEGACY_LABEL_OVERRIDES` Map 可用 `as const` 对象替代
- 位置: `src/measurements.ts`:433-438
- 类型: 简化
- 描述: 4 个静态键值对使用 `new Map()` 创建，运行时开销不必要。
- 建议: 改为 `const LEGACY_LABELS = { pressure: "PRESS", flow: "FLOW", ... } as const`。

### [P3-2] `LEGACY_DEFAULT_MEASUREMENT_FONT_SIZE` 仅在一处使用
- 位置: `src/measurements.ts`:382, 512
- 类型: 死代码
- 描述: 该常量仅在 `normalizedDefaultMeasurementFontSize` 中用于特殊值检测，语义晦涩。
- 建议: 添加注释说明该 magic number 的迁移背景，或内联并注释。

### [P3-3] `normalizedGroupColor` 对空字符串返回 undefined 而非默认值
- 位置: `src/measurements.ts`:742-748
- 类型: 风格
- 描述: 空字符串 `""` trim 后变为 `""`，返回 `undefined`，调用方需用 `?? DEFAULT_...` 兜底。与其他 normalized 函数行为不一致（如 `normalizedFontWeight` 直接返回 fallback）。
- 建议: 统一为 `return color || undefined` 并在文档中注明调用方须处理 undefined。

### [P3-4] `measurementFontScaleForNode` 使用 `Math.sqrt(scaleX * scaleY)` 对负 scale 不安全
- 位置: `src/measurements.ts`:698-702
- 类型: bug
- 描述: 若 `scaleX` 和 `scaleY` 异号（镜像+非均匀缩放），乘积为负，`Math.sqrt` 返回 `NaN`。虽然当前 `getSafeNodeScaleX/Y` 可能取绝对值，但该函数未做防御。
- 建议: 使用 `Math.sqrt(Math.abs(scaleX * scaleY))` 或在函数入口取绝对值。

### [P3-5] `createDefaultMeasurementGroupsForNode` 中 `item.role ?? index` 作为 ID 后缀
- 位置: `src/measurements.ts`:1304-1305
- 类型: 风格
- 描述: 当 `role` 为 undefined 时使用数组 index 作为 ID 一部分，若 items 顺序变化将导致 ID 不稳定。
- 建议: 使用 `measurementTypeId` 替代 index，或组合 `measurementTypeId-role`。

### [P3-6] `formatMeasurementDisplayValue` 未处理 `value.value === ""` 空字符串
- 位置: `src/measurements.ts`:1524-1537
- 类型: 错误处理
- 描述: 当 `value.value` 为空字符串时走 `String(value.value)` 分支返回 `""`，最终输出 `" unit"`（前导空格+单位），视觉效果不佳。
- 建议: 增加空字符串检查，视为 missing 处理。

---

## 统计

| 优先级 | 数量 |
|--------|------|
| P0 严重 | 0 |
| P1 重要 | 5 |
| P2 一般 | 10 |
| P3 轻微 | 6 |
| **合计** | **21** |
