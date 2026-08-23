# T14 model-topology.test.ts 审查报告

## 概览

| 指标 | 数值 |
|------|------|
| 总行数 | 4012 |
| test 数量 | 110 |
| describe 嵌套 | 仅 1 层 (`describe("topology")`) |
| 发现总数 | 18 |
| P0 | 1 |
| P1 | 5 |
| P2 | 7 |
| P3 | 5 |

---

## P0 严重

### [P0] 单文件 4012 行 / 110 个 test，严重影响可维护性和 CI 反馈效率
- 位置: src/model-topology.test.ts:1-4012
- 类型: 抽象层次
- 描述: 整个文件是一个巨型 `describe("topology")` 包含 110 个 test，覆盖拓扑构建、电压色标、设备参数校验、正交路由、保存项目/方案树、几何计算等至少 8 个不同职责。任何一处源文件改动都会触发全部 110 个 test 重跑，CI 反馈慢且失败定位困难。
- 建议: 拆分为至少 8 个独立 describe 文件或 `describe` 嵌套块：`topology-build`、`voltage-colors`、`device-parameters`、`orthogonal-routing`、`saved-project-tree`、`geometry-bounds`、`device-index`、`electrical-topology`。每个子块可独立运行。

---

## P1 重要

### [P1] 大量重复的 `DEVICE_LIBRARY.find(...)!` + 非空断言（8 处）
- 位置: src/model-topology.test.ts:552, 2023, 2503, 2680, 2740, 2810, 2900, 3200（约）
- 类型: 重复
- 描述: `DEVICE_LIBRARY.find((t) => t.kind === "ac-routable-line")!` 及类似表达式重复 8 次，每次用 `!` 非空断言。若模板 kind 拼写错误，测试将在运行时抛 `undefined` 而非清晰的断言失败。
- 建议: 提取为文件顶层常量 `const ROUTABLE_LINE_TEMPLATE = DEVICE_LIBRARY.find(...) as DeviceTemplate`，并在文件开头用 `expect(ROUTABLE_LINE_TEMPLATE).toBeDefined()` 做一次 guard。

### [P1] `createDefaultNode` + 手动 position 偏移 + `getTerminalPoint` 三段式 setup 重复 ~40 次
- 位置: 贯穿全文，典型如 507-514, 531-537, 1517-1520, 1532-1535, 2528-2547
- 类型: 重复
- 描述: 几乎每个 test 都重复 "创建节点 → 获取终端坐标 → 偏移 position 使终端对齐" 模式，代码量占文件约 30%。
- 建议: 提取 helper `alignTerminalTo(node, terminalId, targetPoint)` 和 `createAlignedNode(kind, position, targetTerminalId, targetPoint)`，可消除约 800 行重复代码。

### [P1] `new Map(nodes.map(n => [n.id, n]))` byId 模式重复 ~20 次
- 位置: 1056, 1524, 2002, 2520, 2550 等（约 20 处）
- 类型: 重复
- 描述: 每次 `calculateElectricalTopology` 或 `setVoltageBaseValuesForScope` 之后都手动构建 `byId` Map。
- 建议: 提取 `function indexById<T extends { id: string }>(items: T[]): Map<string, T>`，或直接内联为一个 `byKind`/`byId` 工具函数。

### [P1] 110 个 test 全在同一 describe 层级，无子分组
- 位置: src/model-topology.test.ts:449
- 类型: 抽象层次
- 描述: 所有 test 平铺在 `describe("topology")` 下，无法按功能域选择性运行（如 `vitest run -t "voltage"` 只能靠 test name 匹配），test runner 输出难以扫描。
- 建议: 添加嵌套 describe 块按职责分组，如 `describe("buildTopology")`、`describe("voltage colors")`、`describe("orthogonal routing")`、`describe("saved project tree")` 等。

### [P1] copy-paste test 仅参数值不同，应使用 `test.each`（约 15 组）
- 位置: 3004-3033（SOC 校验已用 for-loop，是好范例）；对比 1068-1093, 1128-1147, 3515-3590 等
- 类型: 重复
- 描述: 多个 test 结构完全一致，仅设备类型/参数值/期望值不同。3004-3033 已正确使用循环遍历 cases 数组，但其余约 15 组类似 test 未采用此模式。
- 建议: 将同构 test 合并为 `test.each([...cases])("...", (case) => {...})`，预估可减少 500+ 行。

---

## P2 一般

### [P2] `createRoutableLineDeviceFromEndpoints` 重复 setup 块（~12 次）
- 位置: 551-560, 2022-2031, 2506-2515 等
- 类型: 重复
- 描述: 创建 routable line device 的 5 行 setup（template 查找 + endpoint refs 构造）重复约 12 次。
- 建议: 提取 `createTestRoutableLine(sourceNode, targetNode, sourceTerminal?, targetTerminal?)` helper。

### [P2] `expect(...).toBeDefined()` 后紧跟同值解构访问，缺少有意义断言
- 位置: 552-554 (`expect(branchTemplate).toBeDefined()` 然后 `branchTemplate!`)
- 类型: 错误处理
- 描述: `toBeDefined()` 不能阻止后续 `!` 断言在模板缺失时抛 TypeError 而非测试失败。Vitest 会在 TypeError 处标记失败但错误信息不清晰。
- 建议: 改为 `if (!branchTemplate) throw new Error("missing template")` 或在文件顶层做一次性 guard。

### [P2] 无 `beforeEach` / factory 隔离，每个 test 手动构造全部 node
- 位置: 贯穿全文
- 类型: 效率
- 描述: 没有共享的 `beforeEach` setup 或 factory helper，每个 test 从零构建所有 node/edge。虽然避免了共享状态泄漏（这是好的），但导致了大量重复。
- 建议: 在 describe 级别提供 `makeSource(pos?)`, `makeLoad(pos?)`, `makeBus(pos?)` 等 factory，内部调用 `createDefaultNode` 并赋予合理默认值。

### [P2] `validateTopology` 结果用 `.some(e => e.type === "xxx")` 断言，丢失错误详情
- 位置: 2518-2524, 2551-2556 等（约 10 处）
- 类型: 简化
- 描述: `expect(errors.some(e => e.type === "floating-terminal")).toBe(false)` 在失败时只显示 `expected true, received false`，不显示实际 errors 内容，调试困难。
- 建议: 改为 `expect(errors.filter(e => e.type === "floating-terminal")).toEqual([])` 或 `expect(errors).not.toContainEqual(expect.objectContaining({ type: "floating-terminal" }))`。

### [P2] 部分 test name 过长（>100 字符），test runner 输出换行难读
- 位置: 708, 824, 847, 913, 1149, 2016, 3004 等
- 类型: 风格
- 描述: 如 "exports electrical and multi-energy node records from calculated graph topology" 等 test name 超过 80 字符，在 CI log 中换行显示。
- 建议: 将上下文信息移到 describe 块名中，test name 只描述具体行为差异。

### [P2] `toEqual(expect.objectContaining({...}))` 过度使用完整对象匹配
- 位置: 1527, 1542-1550, 3509 等
- 类型: 简化
- 描述: 部分断言用 `expect.objectContaining` 匹配整个 edge/node 对象但只关心 2-3 个字段，其余字段未验证也未显式排除。
- 建议: 对关键字段使用精确 `expect(...).toBe(...)` 断言，或使用 `expect.objectContaining` 时只包含需要验证的字段。

### [P2] 文件顶部 import 超过 150 行，大量具名导入未按职责分组
- 位置: src/model-topology.test.ts:1-150
- 类型: 风格
- 描述: 从 `./model-topology` 导入的 100+ 个具名符号未按功能分组（拓扑、颜色、路由、保存项目等混杂），且部分 test 只用到 3-5 个符号却 import 全部。
- 建议: 按功能分组 import 并加注释分隔，或在 test 文件内按需 `import` 子模块。

---

## P3 轻微

### [P3] 变量命名不一致：`left/right` vs `first/second` vs `source/target`
- 位置: 2044 (`left, right`), 对比全文 `source/target`, `nodeA/nodeB`
- 类型: 风格
- 描述: 同一文件中排序回调参数命名风格不统一。
- 建议: 统一为 `(a, b)` 或 `(left, right)`。

### [P3] 部分 test 内 `node.position = { x: ..., y: ... }` 直接赋值 mutation
- 位置: 511-514, 534-537, 1520, 2541-2544 等
- 类型: 风格
- 描述: `createDefaultNode` 返回的对象被直接 mutate position。虽然是 test 内局部变量不会泄漏，但不如使用 spread 创建新对象清晰。
- 建议: 优先 `const moved = { ...node, position: { ... } }` 模式，或在 helper 中封装。

### [P3] 硬编码颜色值 `"#ff0000"`, `"#00ff00"` 散布在 test 中
- 位置: 1052-1053, 1058-1063
- 类型: 风格
- 描述: 测试期望值硬编码了颜色 hex，若调色板默认值变化需多处修改。
- 建议: 提取为常量 `const TEST_AC_COLOR = "#ff0000"` 等。

### [P3] 部分 test 无 arrange/act/assert 注释或空行分隔
- 位置: 468-504, 506-528 等早期 test
- 类型: 风格
- 描述: arrange/act/assert 三阶段之间无空行分隔，阅读时需逐行分析。
- 建议: 在 arrange→act 和 act→assert 之间加空行。

### [P3] `expect(...).toBe(true)` / `toBe(false)` 可简化为 `toBeTruthy()` 或语义断言
- 位置: 2522-2523, 3012 等
- 类型: 简化
- 描述: `.some(...)` 返回 boolean 用 `toBe(false)` 可读性不如 `not.toContainEqual`。
- 建议: 使用更语义化的断言方式。
