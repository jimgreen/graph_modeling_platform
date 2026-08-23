# T25a svgExport 审查报告

## 概览

| 文件 | 行数 | 角色 |
|------|------|------|
| `src/svgExport.test.tsx` | 2160 | SVG 导出集成测试 |
| `src/svgExportUtils.ts` | 417 | SVG 导出工具函数 |

**发现总数**: 15

| 优先级 | 数量 |
|--------|------|
| P0 严重 | 0 |
| P1 重要 | 3 |
| P2 一般 | 7 |
| P3 轻微 | 5 |

---

## P0 严重

无。

---

## P1 重要

### [P1-1] exportMeasurementScopedId 仅替换首次出现的 nodeId

- 位置: src/svgExportUtils.ts:255
- 类型: bug
- 描述: `rawValue.replace(internalNodeId, stableDeviceId)` 的 `String.prototype.replace(string, ...)` 只替换第一个匹配。当 `internalNodeId` 在 `rawValue` 中出现多次（例如 `sourcePoint` 为 `"nodeA.nodeA.activePower"`），仅首个 `nodeA` 被替换为 `stableDeviceId`，后续出现保持内部 ID，导致导出 SVG 中残留运行时内部节点标识，破坏跨环境一致性。
- 建议: 使用 `rawValue.replaceAll(internalNodeId, stableDeviceId)` 或 `rawValue.split(internalNodeId).join(stableDeviceId)`，确保所有出现都被替换。

### [P1-2] nodeLabelVerticalSegments 在 map 回调中被重复调用

- 位置: src/svgExportUtils.ts:20-25
- 类型: 性能
- 描述: `buildSvgNodeLabelTextMarkup` 中，垂直标签分支在 `.map()` 内每次迭代都调用 `nodeLabelVerticalSegments(text)` 两次（一次取 `.length`，一次取 segment），该函数对同一 `text` 重复执行分段解析。当标签文本含多个 token 时，复杂度从 O(n) 升至 O(n²)。
- 建议: 在 `.map()` 外缓存 `const segments = nodeLabelVerticalSegments(text)`，后续直接用 `segments.length` 和 `segments[index]`。

### [P1-3] 测试辅助函数 svgDeviceUseTag 未转义 id 中的正则特殊字符

- 位置: src/svgExport.test.tsx:32
- 类型: bug
- 描述: `svgDeviceUseTag` 使用 `new RegExp(\`<use id="${id}"...\`)` 直接拼接 `id` 参数，未对正则特殊字符（如 `.`、`+`、`(`）进行转义。当节点 ID 含正则特殊字符（如 `device.1`、`node(backup)`）时，匹配行为不可预期，可能导致断言命中错误的 `<use>` 标签或匹配失败而测试仍通过。
- 建议: 在拼接前使用转义函数：`const escaped = id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')`，或在测试中避免使用含特殊字符的 ID 并添加注释说明约束。

---

## P2 一般

### [P2-1] svgNodeLabelBaseAttributes 超长单行模板字符串

- 位置: src/svgExportUtils.ts:10
- 类型: 风格
- 描述: `svgNodeLabelBaseAttributes` 返回值是一个 ~300 字符的单行模板字符串，包含十余个属性插值。可读性差，修改易出错。
- 建议: 将属性拆分为数组 `join(" ")` 形式，或提取为对象映射后序列化，提高可维护性。

### [P2-2] buildExportMeasurementGroupMarkup 内 commonAttributes 同样超长

- 位置: src/svgExportUtils.ts:397
- 类型: 风格
- 描述: 与 P2-1 类似，`commonAttributes` 是一个 ~250 字符的单行模板字符串，且与 `svgNodeLabelBaseAttributes` 有部分重复属性（`fill`、`font-family`、`font-size` 等），存在属性构建逻辑重复。
- 建议: 提取公共的字体/颜色属性构建函数，减少重复。

### [P2-3] Math.max 展开大数组有理论栈溢出风险

- 位置: src/svgExportUtils.ts:361-363
- 类型: 效率
- 描述: `Math.max(...rows.map(...))` 使用展开运算符将数组元素逐个压入调用栈。当前 `rows` 来自测量项，数量有限，但无防御性上限。若未来传入大量行，可能触发 `Maximum call stack size exceeded`。
- 建议: 改用 `rows.reduce((max, row) => Math.max(max, valueFn(row)), -Infinity)` 或 `rows.map(...).reduce(...)` 避免栈风险。

### [P2-4] svgSectionBetween 静默返回空串可能掩盖测试错误

- 位置: src/svgExport.test.tsx:20-27
- 类型: 错误处理
- 描述: 当 `end` 出现在 `start` 之前时，`svgSectionBetween` 返回空串。后续 `expect(section).toContain(...)` 会失败，但错误信息是 "expected '' to contain ..."，缺少关于标记顺序错误的上下文，增加调试成本。
- 建议: 在 `endIndex <= startIndex` 时抛出明确错误（如 `throw new Error(\`Marker order wrong: start="${start}" at ${startIndex}, end="${end}" at ${endIndex}\`)`），或在返回前记录警告。

### [P2-5] 首个集成测试断言 SVG 开标签精确格式

- 位置: src/svgExport.test.tsx:1084
- 类型: 风格
- 描述: `expect(svg).toContain('<svg xmlns="..." ... viewBox="0,0,420,260"')` 断言完整的开标签字符串，属性顺序或空格变更都会导致失败。此类测试对实现细节过度耦合。
- 建议: 拆分为独立断言：`expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"')`、`expect(svg).toContain('viewBox="0,0,420,260"')` 等，降低脆弱性。

### [P2-6] 垂直标签测试断言浮点坐标

- 位置: src/svgExport.test.tsx:1683-1684
- 类型: 风格
- 描述: `expect(labelTokens[0]).toContain('x="150" y="155.6"')` 直接断言浮点坐标。`formatSvgNumber` 的精度调整或计算链中任何微小变化都会导致断言失败，维护成本高。
- 建议: 提取坐标值并用 `expect(parseFloat(match)).toBeCloseTo(expected, 1)` 进行近似断言，容忍微小精度差异。

### [P2-7] 重复的 mock 配置对象

- 位置: src/svgExport.test.tsx:56-85, 及多处类似结构
- 类型: 重复
- 描述: 多个测试用例重复构造几乎相同的 `createExportSvg` 参数对象（~30 行），仅个别字段不同。大量复制粘贴增加维护成本且易引入不一致。
- 建议: 提取 `createDefaultExportSvgOptions(overrides)` 工厂函数，各测试仅传入差异字段。

---

## P3 轻微

### [P3-1] exportSvgUniqueId 最坏情况 O(n²)

- 位置: src/svgExportUtils.ts:76-86
- 类型: 效率
- 描述: 当所有 `rawId` 冲突时，`while (usedIds.has(candidate))` 对每个 ID 线性扫描，总复杂度 O(n²)。实际场景中冲突罕见，影响可忽略。
- 建议: 无需修改，但可考虑在 `usedIds` 中记录每个 baseId 的下一个候选索引以加速冲突解决。

### [P3-2] exportMeasurementSourcePoint 冗余迭代

- 位置: src/svgExportUtils.ts:265-266
- 类型: 效率
- 描述: 当 `internalNodeId === stableDeviceId` 时，循环仍遍历两个相同前缀，第二次迭代不可能匹配（第一次已返回）。函数入口缺少 `internalNodeId === stableDeviceId` 的短路判断。
- 建议: 在循环前添加 `if (internalNodeId === stableDeviceId)` 的早期返回，或将 `prefix` 数组去重 `[...new Set([internalNodeId, stableDeviceId])]`。

### [P3-3] 终端数量断言与测试主题无关

- 位置: src/svgExport.test.tsx:626
- 类型: 风格
- 描述: 测试 "does not add a white image cover behind terminal device icons" 中包含 `expect(node.terminals.length).toBeGreaterThan(0)`，这是对测试数据的校验而非功能断言，与测试主题（背景图片覆盖）无关。
- 建议: 移除该断言，或改为在测试数据构造处用注释说明 "ac-source 至少有 1 个端子"。

### [P3-4] 测试文件缺少错误路径测试

- 位置: src/svgExport.test.tsx (全局)
- 类型: 重复
- 描述: 2160 行测试全部覆盖正常路径，未见对空节点列表、无效设备类型、缺失 backgroundImage 等边界条件的显式测试。`buildSvgDocument([], [], { ... })` 虽被部分测试使用，但未验证错误处理分支。
- 建议: 添加针对空输入、无效配置的边界测试用例，确保导出函数在异常输入下不崩溃或返回合理默认值。

### [P3-5] CDATA 脚本段无内容校验

- 位置: src/svgExportUtils.ts:161-233
- 类型: 安全
- 描述: `exportSvgLayerScriptMarkup` 将硬编码的 JavaScript 嵌入 `<script><![CDATA[...]]></script>`。当前脚本为静态字符串，无注入风险。但若未来参数化脚本内容（如注入 layer IDs），需确保 CDATA 终止符 `]]>` 不出现在脚本内容中。
- 建议: 添加注释警告未来修改者 CDATA 约束，或在参数化时过滤 `]]>` 序列。
