# T31 图标库 + 用户定制审查报告

## 概览

| 维度 | 数据 |
|------|------|
| 文件数 | 7 |
| 总行数 | 3070 |
| 发现总数 | 16 |
| 数据块占比估计 | ~65%（sharedIconLibrary.ts 的 SVG 数据表 + iconLibraryIntegrity.test.ts 的正则规则表） |

### 文件行数分布

| 文件 | 行数 |
|------|------|
| `src/sharedIconLibrary.ts` | 348 |
| `src/sharedIconLibrary.test.ts` | 71 |
| `src/iconLibraryCatalog.ts` | 387 |
| `src/iconLibraryCatalog.test.ts` | 188 |
| `src/iconLibraryIntegrity.test.ts` | 546 |
| `src/userCustomizations.ts` | 1077 |
| `src/userCustomizations.test.ts` | 453 |

---

## P0 严重

无。

---

## P1 重要

### [P1] `normalizedNameKey` 使用 locale 敏感的大小写转换
- 位置: `src/userCustomizations.ts:123`
- 类型: bug
- 描述: `normalizedNameKey` 调用 `toLocaleLowerCase()` 而非 `toLowerCase()`，在土耳其语等 locale 下 'I' 映射为 '\u0131' 而非 'i'，导致同名冲突检测和合并逻辑在不同语言环境下产生不同结果。
- 建议: 将 `toLocaleLowerCase()` 替换为 `toLowerCase()`，保证跨 locale 一致性。

### [P1] `removeCustomDeviceCascade` 直接修改传入的 snapshot 对象
- 位置: `src/userCustomizations.ts:862-878`
- 类型: bug
- 描述: 该函数直接 splice/filter/delete 传入的 snapshot 属性，而 `restoreUserCustomizationItems` 虽然先调用了 `normalizeUserCustomizationSnapshot(current)` 进行了 clone，但 `normalizeUserCustomizationSnapshot` 内部的 `normalizeDeviceLibraryPersistencePayload` 对某些嵌套结构可能只做浅拷贝。若调用方持有的 snapshot 与传入对象共享深层引用，会导致调用方数据被意外修改。
- 建议: 在 `removeCustomDeviceCascade` 入口处对 `snapshot.deviceLibrary` 做显式深拷贝（如 `cloneValue`），或确认 `normalizeUserCustomizationSnapshot` 的输出是完全独立的深拷贝。

### [P1] 完整性测试对 7000+ SVG 文件做同步 `readFileSync` 且无缓存
- 位置: `src/iconLibraryIntegrity.test.ts:138-147, 159, 508, 534`
- 类型: 性能
- 描述: 多个测试用例在循环中对每个图标执行 `readFileSync`，且同一文件在不同测试中被重复读取（如 docer-free-compatible 的 SVG 在 "distinct shapes" 和 "no duplicate within category" 两个测试中各读一次）。7000+ 文件 × 多次读取，测试套件运行时间可能达到数十秒。
- 建议: 在 `describe` 块顶层用 `beforeAll` 一次性读取所有 SVG 并缓存到 `Map<string, string>`，各测试从缓存取值。

### [P1] 用户定制数据无 localStorage 容量保护
- 位置: `src/userCustomizations.ts` 整体（无对应写入逻辑，但 `imageLibrary.assets` 可携带 `dataUrl`）
- 类型: 错误处理
- 描述: `UserCustomizationAsset` 类型包含可选 `dataUrl` 字段（行 49），大量图片以 dataUrl 存储时 snapshot JSON 可能远超 localStorage 5MB 限制。但 `iconLibraryCatalog.ts:178-187` 的 `writeCacheJson` 对 `setItem` 的 QuotaExceededError 做了静默吞没，而 `userCustomizations.ts` 本身没有持久化逻辑——若上层调用方以类似方式持久化 snapshot，同样会静默丢失数据。
- 建议: 在持久化层添加显式的容量检查（`JSON.stringify(snapshot).length` 对比可用空间），超限时向用户报告而非静默丢弃。

---

## P2 一般

### [P2] `mergeRecords` 同名冲突检测复杂度 O(n*m)
- 位置: `src/userCustomizations.ts:597-608`
- 类型: 效率
- 描述: 对每个 imported item，遍历整个 result 数组做 name 匹配；当导入和本地各有数百条记录时，嵌套循环代价较高。
- 建议: 先用 `Map<normalizedName, index>` 建立索引，再对 imported items 做 O(1) 查找。

### [P2] `filterIconLibraryIcons` 每次调用创建新数组
- 位置: `src/iconLibraryCatalog.ts:281-296`
- 类型: 性能
- 描述: 对 7000+ 图标的数组每次 filter 都生成新数组，在频繁搜索场景下产生大量临时对象。`searchText` 字段本身也占用可观内存（每个图标一个拼接字符串）。
- 建议: 考虑对 `searchText` 预计算并缓存 filter 结果（如按 libraryId/categoryKey 分组的索引），减少重复遍历。

### [P2] `allDeviceDefinitionTemplates` 每次调用创建新数组
- 位置: `src/userCustomizations.ts:846-849`
- 类型: 效率
- 描述: `[...DEVICE_LIBRARY, ...snapshot.deviceLibrary.customDeviceTemplates]` 在 restore 流程中被多次调用（`removeCustomDeviceCascade` → `removeDeviceTemplateDefinitionOverrides`），每次创建新数组。
- 建议: 将结果缓存到局部变量或作为参数传递，避免重复拼接。

### [P2] `visibleIconLibraryIcons` 返回完整 `filtered` 数组
- 位置: `src/iconLibraryCatalog.ts:298-312`
- 类型: 内存
- 描述: 返回值中 `filtered` 包含所有匹配项（可能数千条），但 UI 通常只使用 `visible` 切片。如果调用方保留 `filtered` 引用，会造成不必要的内存占用。
- 建议: 文档说明 `filtered` 仅用于 `total` 计数，或改为只返回 `{ visible, total, hasMore }`。

### [P2] SVG 构建函数不校验数值输入
- 位置: `src/sharedIconLibrary.ts:29-38`
- 类型: 错误处理
- 描述: `ln`、`rect`、`circle` 等函数接受 `number` 参数但不做 NaN/Infinity 检查，传入非法值会静默生成无效 SVG 属性（如 `x="NaN"`）。
- 建议: 添加断言或 fallback 到默认值，至少在开发模式下抛出错误。

### [P2] `restoreUserCustomizationItems` 使用长 if-else 链
- 位置: `src/userCustomizations.ts:931-996`
- 类型: 抽象层次
- 描述: 10 个 domain 分支用 if-else 串联，每增加一个 domain 需要修改同一函数，违反开闭原则。
- 建议: 改为 `Map<UserCustomizationDomain, RestoreHandler>` 策略模式，各 domain 的恢复逻辑独立注册。

### [P2] 前端 `iconLibraryCatalog.ts` 与后端 `scripts/generate-icon-library-catalog.mjs` 存在重复的类型定义
- 位置: `src/iconLibraryCatalog.ts:9-60` vs `scripts/generate-icon-library-catalog.mjs`
- 类型: 重复
- 描述: 前端定义了 `IconLibraryCatalog`、`IconLibraryManifest`、`IconLibraryManifestIcon` 等类型，后端脚本生成对应 JSON。两端类型独立维护，字段变更时需同步修改两处。
- 建议: 将共享类型提取到独立的 `.ts` 文件，通过 `ts-node` 或构建时编译让后端脚本也能引用。

---

## P3 轻微

### [P3] 颜色常量硬编码在 sharedIconLibrary.ts 中
- 位置: `src/sharedIconLibrary.ts:5-8`
- 类型: 风格
- 描述: `BLUE`、`DARK`、`SOFT_BLUE`、`SOFT_GRAY` 与项目主题系统可能重复，且无法随主题切换。
- 建议: 若项目有统一主题变量，引用主题 token；否则添加注释说明这些是图标专用的固定色值。

### [P3] `cloneValue` 的 JSON fallback 丢失 `undefined` 和特殊类型
- 位置: `src/userCustomizations.ts:115-119`
- 类型: 简化
- 描述: `JSON.parse(JSON.stringify(value))` 会丢弃 `undefined` 值、`Date` 对象变为字符串、`Set`/`Map` 变为空对象。当 `structuredClone` 不可用时（极旧浏览器），可能产生不一致行为。
- 建议: 添加注释说明此 fallback 的已知限制，或改用更健壮的 deepClone 实现。

### [P3] 缓存 key 版本管理不够直观
- 位置: `src/iconLibraryCatalog.ts:6-7`
- 类型: 风格
- 描述: `CATALOG_CACHE_KEY` 后缀 `v2` 和 `MANIFEST_CACHE_KEY_PREFIX` 后缀 `v2` 需要开发者手动递增版本号来清除旧缓存，容易遗忘。
- 建议: 提取常量如 `CACHE_VERSION = 2`，拼接 key 时统一引用，降低遗漏风险。

### [P3] `semanticIconKey` 硬编码停用词列表
- 位置: `src/iconLibraryIntegrity.test.ts:47-73`
- 类型: 风格
- 描述: 25 个停用词（"alt", "bold", "circle" 等）内联在函数中，新增或调整需要修改函数体。
- 建议: 提取为模块级常量 `SEMANTIC_STOP_WORDS`，便于维护和测试。

### [P3] `sharedIconLibrary.test.ts` 仅抽查前 10 个 SVG payload
- 位置: `src/sharedIconLibrary.test.ts:46`
- 类型: 效率
- 描述: "uses decodable SVG payloads" 测试只验证 `slice(0, 10)`，剩余 130+ 图标的 SVG 有效性未被覆盖。
- 建议: 全量验证或至少抽样更多（如每隔 10 个取一个），确保数据表整体有效。

---

## 发现统计

| 优先级 | 数量 |
|--------|------|
| P0 | 0 |
| P1 | 4 |
| P2 | 7 |
| P3 | 5 |
| **合计** | **16** |
