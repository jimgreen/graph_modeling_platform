# T03 model.ts 审查报告

## 概览

| 指标 | 数值 |
|------|------|
| 总行数 | 9593 |
| 发现总数 | 15 |
| 数据块占比估计 | ~29%（~2800 行纯设备模板数据 + 参数类型映射表） |

文件职责：核心领域模型——图节点/边/端子/设备模板/方案记录的类型定义、设备库构建、参数规范化、容器视图、颜色计算、枚举校验等。

---

## P0 严重

### [P0-1] makeId 使用 Math.random 生成 7 字符 ID，碰撞风险高
- 位置: src/model.ts:6033
- 类型: bug
- 描述: `Math.random().toString(36).slice(2, 9)` 仅产出 7 个 base-36 字符（约 78B 种组合）。根据生日悖论，当图中节点+边总数达到 ~33 万时碰撞概率达 50%。大型电网模型含数万设备、每设备多条边，长期编辑/撤销/重做会加速 ID 消耗。碰撞将导致 `nodeById` Map 静默覆盖，引发数据丢失。
- 建议: 改用 `crypto.randomUUID()` 或 `prefix-counter-timestamp` 组合；若需短 ID，至少扩展到 12 字符或引入模块级计数器去重。

### [P0-2] makeNodeNumber 使用模块级可变 seed，多实例/SSR 不安全
- 位置: src/model.ts:6032-6034
- 类型: bug
- 描述: `nodeNumberSeed` 是模块级可变变量。问题：(1) 页面刷新后 seed 从 1 重新开始，与持久化数据中的 N 编号冲突；(2) 若同时打开多个模型（多 tab/多 store 实例），共享同一 seed 产生重复编号；(3) 单元测试间无法隔离。
- 建议: 将 seed 绑定到具体 Project/Model 实例，或从已有节点的最大 N 值推导初始 seed；测试环境注入 mock。

---

## P1 重要

### [P1-1] DeviceKind 联合类型含 ~460 个字面量成员，TS 编译器性能与可读性差
- 位置: src/model.ts:37-497
- 类型: 抽象层次
- 描述: 单个 `DeviceKind` union 包含约 460 个 `|` 分支。后果：(1) TS 类型检查/IDE 补全显著变慢（该类型参与上百个函数签名）；(2) 编译错误信息极长难以定位；(3) 新增设备类型时 diff 噪声大。
- 建议: 拆分为 `StaticKind | ElectricKind | DcKind | HeatKind | HydrogenKind | ...`，再组合 `type DeviceKind = StaticKind | ElectricKind | ...`。各子类型导出供按需引用。

### [P1-2] ~2300 行设备模板数据内联在逻辑文件中
- 位置: src/model.ts:2600-4900
- 类型: 抽象层次
- 描述: `DEVICE_LIBRARY` 前的静态模板数组（交流/直流/热能/氢/静态图元等）占约 2300 行，与规范化逻辑、类型定义混杂。增加维护成本，每次改设备参数都要在巨型文件中导航。
- 建议: 提取为 `deviceTemplates.ts`（或按领域拆分：`electricTemplates.ts`、`thermalTemplates.ts` 等），model.ts 仅 import 并组装。

### [P1-3] PARAM_TYPE_MAP 约 500 行参数类型映射表内联
- 位置: src/model.ts:4900-5400
- 类型: 抽象层次
- 描述: 从 `p: "float"` 到 `gt3: "float"` 的巨大 Record 定义，纯数据无逻辑，与上述设备模板数据同类问题。
- 建议: 与设备模板数据一起提取到 `deviceParams.ts` 或 JSON 数据文件。

### [P1-4] DEVICE_LIBRARY 构建管道执行 6 次全量 .map() 遍历
- 位置: src/model.ts:6015-6020
- 类型: 性能
- 描述: `BASE_DEVICE_LIBRARY` 经过 `.map(insertModelAssociation...).map(normalizeDefaultSize).map(normalizeParameterNames).map(normalizeRatedVoltage...).map(attachMeasurementDefinitions).map(withRdfIdParameter)` 六次独立遍历，每次创建新数组。若库含 200+ 模板，即 6 次数组分配 + 6×200 次对象展开。
- 建议: 合并为单次 `.map(template => withRdfId(attachMeasurement(normalizeRatedVoltage(normalizeParameterNames(normalizeDefaultSize(insertDerived(template)))))))`，或提取 `normalizeDeviceTemplate` 组合函数一次完成。

### [P1-5] JSON.stringify 相等性判断用于变更检测，对 key 顺序敏感
- 位置: src/model.ts:5540-5541
- 类型: bug
- 描述: `normalizeBranchMeasurementParams` 等函数用 `JSON.stringify(normalized) === value` 判断是否有变更。若输入 JSON 的 key 顺序与输出不同（即使语义相同），会返回不必要的新字符串，触发下游无意义的 state 更新和 React 重渲染。
- 建议: 改为在构建过程中跟踪 `changed` 标志（类似 5550-5564 行的模式），仅在真正变更时返回新值。

### [P1-6] reconcileNodeParamsWithTemplateDefinitions 无条件浅拷贝 params
- 位置: src/model.ts:9054
- 类型: 性能
- 描述: `const nextParams = { ...node.params }` 在函数入口无条件执行。当模板定义与当前 params 完全一致（最常见路径）时，这次拷贝完全浪费。对于含 50+ 参数的设备节点，每次校验都创建一个新对象。
- 建议: 延迟拷贝——先遍历判断是否需要变更，仅在 `changed = true` 时创建副本（参考 5550-5558 行的 lazy-copy 模式）。

---

## P2 一般

### [P2-1] isHydrogenVisualKind / isThermalVisualKind 使用字符串链式匹配
- 位置: src/model.ts:7521-7545
- 类型: 效率
- 描述: `isThermalVisualKind` 对 `baseDeviceKind` 做 1 次 `.startsWith()` + 5 次 `.===` 比较。若频繁调用（如每帧渲染着色），O(n) 线性扫描。
- 建议: 预构建 `THERMAL_VISUAL_KINDS: Set<string>` 和 `HYDROGEN_VISUAL_KINDS: Set<string>`，O(1) 查找。

### [P2-2] normalizeDcacControlParameterDefinition 中 Array.includes() 用于 6 元素判断
- 位置: src/model.ts:6043
- 类型: 效率
- 描述: `["control_type", "p_set", "i_set", "v_set", "ac_v_set", "dc_v_set"].includes(enName)` 在每次调用时创建新数组并线性扫描。该函数对每个参数定义调用一次。
- 建议: 提取为模块级 `const BLOCKED_PARAM_NAMES = new Set([...])`。

### [P2-3] cloneDeviceStateDefinition 手动逐属性条件展开
- 位置: src/model.ts:1043-1058
- 类型: 重复
- 描述: 16 行条件展开 `...(definition.icon ? { icon: definition.icon } : {})`，每行模式完全相同。
- 建议: 使用 `Object.fromEntries(Object.entries(definition).filter(([, v]) => v !== undefined))` 或 `structuredClone(definition)` 简化。

### [P2-4] createNodeFromTemplate 中 templateKind 分发使用长 if-else 链
- 位置: src/model.ts:9470-9559
- 类型: 简化
- 描述: 对 `templateKind` 逐一 if 判断（`ac-three-winding-transformer-neutral`、`dcdc-converter`、`acdc-converter` 等约 10+ 分支），每个分支逻辑相似。
- 建议: 改为 `Map<string, (template) => params>` 注册表分发，新增设备类型只需添加 entry。

---

## P3 轻微

### [P3-1] model-eexport 提取不完整，仍通过 export * 透传
- 位置: src/model.ts:15-35
- 类型: 抽象层次
- 描述: 注释标明 "从 model.ts 提取到独立模块"，但 line 16 `export * from "./model-eexport"` 加上 lines 17-35 的大量具名 import 再 re-export，说明提取不彻底。model.ts 仍承担中转职责。
- 建议: 让消费方直接从 `model-eexport` 导入，移除 model.ts 中的 re-export 层。

### [P3-2] Math.random 非密码学安全随机数
- 位置: src/model.ts:6033
- 类型: 安全
- 描述: `Math.random()` 的伪随机序列可预测。虽然 UI ID 通常不需要密码学安全，但若 ID 用于任何安全相关场景（如分享链接、权限令牌），存在风险。
- 建议: 若 ID 仅用于 UI 内部可忽略；否则改用 `crypto.getRandomValues()`。

### [P3-3] 多个 normalize 函数重复 try-catch + JSON.parse 模式
- 位置: src/model.ts:5480-5545, 5554-5564, 6554-6640
- 类型: 重复
- 描述: `normalizeStoredCustomParamDefinitions`、`normalizeBranchMeasurementParams`、`normalizeStoredElectricGenerationRatedDefinitions` 等多处重复 "try { JSON.parse → transform → JSON.stringify } catch { return original }" 模式。
- 建议: 提取 `safeNormalizeJsonParam(value, transform)` 通用辅助函数。

---

## 统计

| 优先级 | 数量 |
|--------|------|
| P0 严重 | 2 |
| P1 重要 | 6 |
| P2 一般 | 4 |
| P3 轻微 | 3 |
| **合计** | **15** |

## 提取建议顺序

按依赖关系和影响面排序：

1. **设备模板数据** → `deviceTemplates.ts`（最大收益，减少 model.ts ~2300 行）
2. **参数类型映射表** → `deviceParams.ts`（再减 ~500 行）
3. **DeviceKind 类型拆分** → `deviceKinds.ts`（改善 TS 性能，需全局 grep 更新引用）
4. **ID 生成重构**（修复 P0，涉及 makeId/makeNodeNumber 调用点）
5. **DEVICE_LIBRARY 管道合并**（小范围优化）
