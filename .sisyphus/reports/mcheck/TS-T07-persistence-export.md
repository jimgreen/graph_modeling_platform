# T07 appPersistenceLibraryExport 审查报告（tsx + test）

## 概览

| 维度 | 数值 |
|------|------|
| tsx 行数 | 5419 |
| test 行数 | 2022 |
| 发现总数 | 18 |
| P0 | 2 |
| P1 | 5 |
| P2 | 7 |
| P3 | 4 |
| 数据块占比估计 | ~30%（lines 1-900 为 import 块，lines 2900-3100 为序列化/反序列化数据管道，lines 5000-5419 为 SVG 导出字符串拼接） |

> 此文件是典型的 **God File**：import 块占 ~900 行，混合了持久化、归一化、React 组件（CustomComponentManagerTree）、SVG 导出四大职责。建议后续拆分为 `persistence.ts`、`normalization.ts`、`CustomComponentManagerTree.tsx`、`svgExportPipeline.ts`。

---

## P0 严重

### [P0-1] 整个文件禁用 TypeScript 类型检查
- 位置: `appPersistenceLibraryExport.tsx:1`
- 类型: 安全
- 描述: 文件首行 `// @ts-nocheck` 关闭了 5419 行代码的全部类型检查。大量 `as any`、`(item as Partial<...>)` 强转遍布全文，任何属性拼写错误、类型不匹配在编译期完全不可见，持久化路径上的类型错误将直接导致数据丢失。
- 建议: 制定迁移计划逐步移除 `@ts-nocheck`。优先为 `normalizeDeviceLibraryPersistencePayload`、`serializeDeviceLibraryForStorage`、`readLocalStorageJson` 等持久化核心函数补充完整类型签名，然后逐块移除 nocheck。

### [P0-2] localStorage 写入路径无 QuotaExceededError 防护（数据丢失风险）
- 位置: `appPersistenceLibraryExport.tsx:3017-3037`
- 类型: 数据丢失
- 描述: `readLocalStorageJson` / `readLocalStorageJsonWithLegacy` 的 try/catch 只覆盖了读取路径。当 localStorage 达到配额上限时，**写入**操作（调用方代码不在此文件但依赖此处的数据结构）会静默失败，用户的项目数据（设备模板、元件库定义、接线图模板）将在无提示的情况下丢失。读取侧 fallback 返回旧数据，进一步掩盖了"写入已失败"的事实。
- 建议: 在写入 localStorage 的调用方增加 `try/catch` 捕获 `QuotaExceededError`，向用户弹出存储已满提示；考虑增加 IndexedDB 降级路径以存储大体积项目数据。

---

## P1 重要

### [P1-1] SVG 导出字符串拼接存在 CSS 注入风险
- 位置: `appPersistenceLibraryExport.tsx:5047-5052`
- 类型: 安全
- 描述: `voltageStyleRules` 中的 `type` 和 `voltage` 值来源于模型数据（`node.terminals[].type`、`terminal.vbase`），直接拼接到 CSS class 选择器和样式规则中（`.${exportVoltageDeviceClass(type, voltage)}{fill:${color}...}`）。如果用户导入的模型包含恶意 type 值（如 `AC"; body { display:none } //`），将导致 CSS 注入，破坏导出 SVG 的渲染。
- 建议: 对 `exportVoltageDeviceClass` 的返回值做白名单校验（只允许 `^[a-zA-Z0-9_-]+$`），或在拼接前用 `escapeXml` / CSS escape 处理。

### [P1-2] SVG 导出大项目内存峰值过高
- 位置: `appPersistenceLibraryExport.tsx:5000-5419`
- 类型: 性能/内存
- 描述: 整个 SVG 导出通过模板字符串拼接构建单一巨大字符串。对于包含数千节点/边的项目，中间字符串会反复分配和复制（每次 `.join("")` 和 `+=` 都创建新字符串），内存峰值可达最终产物大小的 2-3 倍。
- 建议: 改用 `Array<string>` 收集所有 chunk，最终一次性 `.join("")`；或改用 `WritableStream` / `Blob` 分片输出。

### [P1-3] `edgeExportVoltageDescriptor` 电压取值逻辑可能产生不一致结果
- 位置: `appPersistenceLibraryExport.tsx:5024-5026`
- 类型: bug
- 描述: 电压取值链 `sourceVoltage && sourceVoltage !== "0" ? sourceVoltage : targetVoltage || sourceVoltage || "0"` 中，当 `sourceVoltage` 为 `"0"` 且 `targetVoltage` 也为 `"0"` 时返回 `"0"`，但当 `sourceVoltage` 为 `""`（空字符串）时，`sourceVoltage && ...` 短路返回 `""`，然后 fallback 到 `targetVoltage || sourceVoltage || "0"` — 即 `"" || "" || "0"` = `"0"`。逻辑看似正确但分支复杂且无注释，后续维护者极易误改。
- 建议: 提取为命名明确的辅助函数 `resolveEdgeVoltage(source: string, target: string): string`，并用 `test.each` 覆盖全部组合。

### [P1-4] `normalizeGraphTemplates` 去重使用 case-insensitive id 但保留首次出现的模板
- 位置: `appPersistenceLibraryExport.tsx:2549-2554`
- 类型: bug
- 描述: 使用 `seen.has(key.toLowerCase())` 去重，保留第一个出现的模板。如果后端返回的数组中同一 id 有不同大小写形式（如 `"Template-A"` vs `"template-a"`），静默丢弃后续条目无任何日志或警告。用户可能丢失编辑数据而不知情。
- 建议: 至少在 `console.warn` 中记录被去重的 id，或改为抛错/返回错误信息给调用方。

### [P1-5] 测试未覆盖 `readLocalStorageJson` 的异常路径
- 位置: `appPersistenceLibraryExport.test.ts`（缺失）
- 类型: 重复/覆盖
- 描述: 测试文件中没有针对 `readLocalStorageJson` / `readLocalStorageJsonWithLegacy` 在以下场景的测试：localStorage 返回非法 JSON、localStorage 返回 `null`、localStorage API 不可用（SSR/隐私模式）。这些正是持久化层最容易出问题的边界条件。
- 建议: 补充 `describe("readLocalStorageJson")` 测试组，覆盖 corrupt JSON、null、missing API 三个场景。

---

## P2 一般

### [P2-1] 未使用的 import：`readFileSync`
- 位置: `appPersistenceLibraryExport.test.ts:1`
- 类型: 死代码
- 描述: `import { readFileSync } from "node:fs"` 在全文中未被引用，增加无意义的模块依赖。
- 建议: 删除该 import。

### [P2-2] 测试中大量 `as any` 绕过类型检查
- 位置: `appPersistenceLibraryExport.test.ts:520` 及多处
- 类型: 风格
- 描述: 测试代码中频繁使用 `as any` 传入部分字段对象（如 `current as any, imported as any`），与源文件的 `@ts-nocheck` 形成双重类型盲区。如果源文件后续移除 nocheck，这些测试将是类型错误重灾区。
- 建议: 为测试数据定义 `Partial<DeviceLibraryPersistencePayload>` 工厂函数，减少 `as any`。

### [P2-3] 测试数据构造重复度高，缺少 factory
- 位置: `appPersistenceLibraryExport.test.ts:488-565` 及多处
- 类型: 重复
- 描述: `customDeviceTemplates`、`customCategoryLibraries`、`parameterDefinitions` 等数据结构在多个 test case 中重复构造，字段结构几乎一致但每次重新书写完整对象。
- 建议: 提取 `createTestDeviceTemplate(overrides)`、`createTestParameterDefinition(overrides)` 等 factory 函数，减少重复并提高可读性。

### [P2-4] `CustomComponentManagerTree` 组件内联在持久化文件中
- 位置: `appPersistenceLibraryExport.tsx:4200-4700`（估计）
- 类型: 抽象层次
- 描述: React 组件 `CustomComponentManagerTree`（含右键菜单、搜索、拖拽、折叠状态等）被内联在持久化/导出模块中，违反了单一职责原则。组件的 UI 逻辑（事件处理、状态管理）与数据层的归一化/序列化逻辑混合在同一文件。
- 建议: 将 `CustomComponentManagerTree` 提取为独立文件 `CustomComponentManagerTree.tsx`，仅通过 props 接收归一化后的数据。

### [P2-5] `emptySmartAlignmentAnchorMap` 在循环中反复创建新数组
- 位置: `appPersistenceLibraryExport.tsx:3554-3556`
- 类型: 效率
- 描述: 返回 `{ x: [], y: [] }` 每次调用都创建新数组。在对齐锚点计算循环中（`nodeTerminalOutflowSmartAlignmentAnchors` 等），每个节点每个 terminal 都会调用此函数，产生大量短生命周期对象，增加 GC 压力。
- 建议: 改用 `anchors.x.length = 0; anchors.y.length = 0` 复用同一对象，或将初始值内联到调用方。

### [P2-6] `normalizeCustomComponentLibraries` 函数过长（~200行）
- 位置: `appPersistenceLibraryExport.tsx:1542-1750`（估计）
- 类型: 简化
- 描述: 此函数包含多层嵌套的类型判断、字段归一化、去重、派生关系计算，认知复杂度高。内部的 `provisionalDefinitions`、`seen` Set、reserved type 过滤等逻辑可拆分。
- 建议: 拆分为 `normalizeSingleComponentLibrary(raw, reserved, templates)` + `deduplicateAndResolveDerivations(list)` 两个辅助函数。

### [P2-7] `renderEnumValuesEditor` 测试仅验证静态 HTML，未覆盖交互
- 位置: `appPersistenceLibraryExport.test.ts:1800-2021`
- 类型: 覆盖
- 描述: 使用 `renderToStaticMarkup` 渲染 `renderEnumValuesEditor` 组件，只能验证初始 HTML 输出。枚举编辑器的核心交互（添加/删除选项、拖拽排序、验证提示、典型值同步）完全未被测试。
- 建议: 使用 `@testing-library/react` 的 `render` + `fireEvent` / `userEvent` 覆盖关键交互路径。

---

## P3 轻微

### [P3-1] 重复的 `String(x ?? fallback).trim() || fallback` 模式
- 位置: `appPersistenceLibraryExport.tsx:1001, 1007, 2532, 2534` 及多处
- 类型: 风格
- 描述: 全文至少出现 20+ 次 `String(raw.xxx ?? fallback).trim() || fallback` 模式，可提取为通用辅助函数。
- 建议: 提取 `coerceString(value: unknown, fallback: string): string` 函数，统一处理 null/undefined/空字符串/非字符串类型。

### [P3-2] 候选 `test.each` 场景未参数化
- 位置: `appPersistenceLibraryExport.test.ts` 多处
- 类型: 简化
- 描述: `normalizeCustomDeviceTemplates`、`normalizeCustomCategoryLibraries`、`normalizeDeviceDefinitionOverrides` 等多个归一化函数都有"空输入返回空"、"非法输入返回默认值"等相似测试用例，各自独立书写。
- 建议: 使用 `test.each` 参数化合规/非法/空输入场景，减少样板代码。

### [P3-3] `positionedNodeForSmartAlignment` 使用 `===` 比较浮点坐标
- 位置: `appPersistenceLibraryExport.tsx:3559`
- 类型: bug（低概率）
- 描述: `position.x === node.position.x && position.y === node.position.y` 对浮点数做严格相等比较。在对齐吸附计算后，坐标可能因浮点误差产生极小偏差，导致不必要的对象创建。
- 建议: 改用 `Math.abs(position.x - node.position.x) < 1e-9` 容差比较，或确认上游保证整数坐标。

### [P3-4] import 块中存在未使用 icon 导入（疑似）
- 位置: `appPersistenceLibraryExport.tsx:14-73`
- 类型: 死代码
- 描述: 从 `lucide-react` 导入了约 60 个图标（`AlignCenter`, `Bell`, `Bold`, `BoxSelect` 等），文件内是否全部使用需要 tree-shaking 验证。未使用的图标会增加 bundle 大小（若 tree-shaking 失效）。
- 建议: 运行 `knip` 或类似工具检测未使用的导出/导入，清理无用 icon。

---

## 统计汇总

| 优先级 | 数量 |
|--------|------|
| P0 严重 | 2 |
| P1 重要 | 5 |
| P2 一般 | 7 |
| P3 轻微 | 4 |
| **合计** | **18** |
