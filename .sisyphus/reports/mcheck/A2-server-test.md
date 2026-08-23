# A2 server.test.mjs 审查报告

## 概览

| 项目 | 值 |
|------|-----|
| 文件 | `server/server.test.mjs` |
| 总行数 | 3445 |
| 发现总数 | 11 |
| P0 严重 | 1 |
| P1 重要 | 3 |
| P2 一般 | 4 |
| P3 轻微 | 3 |

---

## P0 严重

### [P0] `svgSectionBetween` 返回空串导致否定断言全部静默通过
- 位置: server/server.test.mjs:26-33（辅助函数），影响 ~2800-3036 全部 SVG 否定断言
- 类型: bug
- 描述: `svgSectionBetween` 在找不到起止标记时返回 `""`。所有对空串执行的 `not.toContain(...)` 均恒真通过——若 SVG 结构变更导致某图层消失，测试不会失败，产生虚假绿条。正向断言（`toContain`）会在空串上失败，但否定断言组（~20+ 条 `not.toContain`）完全无防护。
- 建议: 在辅助函数中断言 section 非空，或提取为独立 assertion：
  ```js
  const svgSectionBetween = (svg, start, end) => {
    // ...existing code...
    expect(result, `section not found between "${start}" and "${end}"`).not.toBe("");
    return result;
  };
  ```

---

## P1 重要

### [P1] 30+ 个异步测试重复 try/finally 临时目录生命周期管理
- 位置: 约 625-667, 669-722, 724-778, 780-821, 823-861, 866-909, 913-974, 976-1010, 1096-1241, 1391-1615, 1617-1711, 1713-1770, 1772-1860+, 2074-2205, 2207-2302, 2304-2556, 2558-2607, 2609-2640, 2642-2672+, 3260-3351, 3353-3376, 3378-3445（出现 ~25 次）
- 类型: 重复
- 描述: 每个异步测试都手动 `mkdtemp` → `try` → `finally { rm(...) }`。模板完全相同，仅 `tmpdir()` 前缀字符串不同。若清理逻辑需变更（如增加超时保护），需逐文件修改。
- 建议: 抽取为 Vitest fixture 或 `beforeEach`/`afterEach` 钩子：
  ```js
  const withTempRoot = async (prefix, fn) => {
    const root = await mkdtemp(join(tmpdir(), prefix));
    try { return await fn(root); } finally { await rm(root, { recursive: true, force: true }); }
  };
  // 用法:
  test("...", async () => {
    await withTempRoot("scheme-e-", async (root) => {
      const filesRoot = join(root, "files");
      // ...
    });
  });
  ```

### [P1] E 文件 section 解析 + 列断言模板重复 ~20 次
- 位置: 约 1226-1233, 1548-1553, 1562-1568, 1573-1581, 1760-1761, 1842-1846, 2052-2057, 2506-2550（及更多）
- 类型: 重复
- 描述: 解析 E 文件 section → 找 `@` header 行 → split 列 → 找 `#` 数据行 → split 值的模式在文件中出现约 20 次，每次 4-8 行几乎相同的代码。
- 建议: 已有 `eSectionLines` 和 `expectEFieldsAlignedWithHeader` 辅助，但多数测试没有使用。应统一提取 `parseESectionRows(eFile, section)` 返回 `[{col: val}]` 数组，各测试直接对结构化结果断言。

### [P1] `rowForSection` 辅助函数在 2 个测试中重复定义
- 位置: server/server.test.mjs:1842-1846 与 2052-2057
- 类型: 重复
- 描述: 完全相同的 `rowForSection` 闭包被内联定义两次，将 E 文件 section 解析为 `{column: value}` 对象。
- 建议: 提升为文件级辅助函数（与 `eSectionLines`、`eVisualWidth` 同级），消除重复。
  ```js
  const rowForSection = (text, section) => {
    const lines = eSectionLines(text, section);
    const columns = lines.find(l => l.startsWith("@"))?.trim().split(/\s+/u).slice(1) ?? [];
    const values = lines.find(l => l.startsWith("#"))?.trim().split(/\s+/u).slice(1) ?? [];
    return Object.fromEntries(columns.map((c, i) => [c, values[i] ?? ""]));
  };
  ```

---

## P2 一般

### [P2] `sequentialTokenStartColumns` 辅助函数内部嵌入 `expect` 断言
- 位置: server/server.test.mjs:52-60
- 类型: 抽象层次
- 描述: 辅助函数内部调用 `expect(index).toBeGreaterThanOrEqual(0)` 并抛出含位置信息的错误。这使辅助函数不再是纯工具，而是在隐式执行测试断言。失败时栈跟踪指向辅助函数内部而非测试代码，诊断困难。
- 建议: 将断言拆出——辅助函数仅返回列位置数组（token 找不到时返回 `-1`），由调用方执行 `expect`：
  ```js
  const sequentialTokenStartColumns = (line, tokens) => { /* pure */ };
  // 调用方:
  const headerColumns = sequentialTokenStartColumns(header, columns);
  expect(headerColumns.every(c => c >= 0)).toBe(true);
  ```

### [P2] `normalizeDeviceLibraryConfig` 幂等性断言 `expect(normalize(x)).toEqual(x)` 重复 3 次
- 位置: server/server.test.mjs:118, 154, 以及间接出现在 367-437 区域
- 类型: 重复
- 描述: `expect(normalizeDeviceLibraryConfig(normalized)).toEqual(normalized)` 在多个测试末尾重复出现，验证幂等性。应合并为一个专用测试。
- 建议: 提取一个 `test("normalizeDeviceLibraryConfig is idempotent for varied inputs", () => {...})` 使用 `test.each` 传入多种输入配置。

### [P2] SVG use 标签否定断言循环可合并为单次结构化断言
- 位置: server/server.test.mjs:2771-2778, 3023-3030
- 类型: 重复
- 描述: 两处 `for (const useTag of useTags) { expect(useTag).not.toContain("xlink:href"); expect(useTag).not.toContain("data-export-node-id"); ... }` 循环，每次 5-7 条 `not.toContain`。
- 建议: 合并为结构化断言：
  ```js
  const forbiddenAttrs = ["xlink:href", "data-export-node-id", "dev-id=", "dev-idx=", "dev-name=", "dev-kind="];
  for (const useTag of useTags) {
    for (const attr of forbiddenAttrs) {
      expect(useTag).not.toContain(attr);
    }
  }
  ```

### [P2] `normalizeMeasurementConfig` 测试数据量大但断言稀疏
- 位置: server/server.test.mjs:367-472（约 105 行测试数据，仅 ~10 条断言）
- 类型: 效率
- 描述: "preserves tap-position and migrates legacy AC/DC branch measurement profiles" 及 "migrates hydrogen tank defaults" 测试构造了大段 `measurementTypes` 和 `deviceProfiles` 对象（50+ 行输入），但只验证了个别字段。大量输入数据未被断言覆盖，可能是历史遗留。
- 建议: 精简输入数据至最小必要集，或补充断言覆盖所有输入字段。

---

## P3 轻微

### [P3] `normalizeDeviceLibraryConfig` 和 `normalizeMeasurementConfig` 的 idempotency 测试应参数化
- 位置: server/server.test.mjs:74-364, 367-472
- 类型: 简化
- 描述: `device library schema migration` describe 有 6 个测试、`measurement configuration normalization` 有 4 个测试，结构高度相似（构造输入 → normalize → toMatchObject → 幂等性检查）。可通过 `test.each` + 表驱动减少样板。
- 建议: 对幂等性验证和基础归一化，使用 `test.each` 提供输入/期望输出对。

### [P3] 文件级辅助函数 `eSectionLines` 在 `describe` 外部但 `sequentialTokenStartColumns` 在内部
- 位置: server/server.test.mjs:44-72
- 类型: 风格
- 描述: 所有辅助函数（`svgSectionBetween`、`eSectionLines`、`eVisualWidth` 等）定义在文件顶层 `describe` 外部，唯独 `sequentialTokenStartColumns` 和 `expectEFieldsAlignedWithHeader` 定义在第一个 `describe` 外部但紧跟其后（行 52-72），位置不一致。
- 建议: 将所有辅助函数集中在文件顶部（imports 之后、第一个 describe 之前），保持统一的代码组织。

### [P3] 部分测试硬编码日期字符串作为 `updatedAt`
- 位置: 约 1372, 1402, 1537, 1728, 1807, 2003, 2085, 2226, 2315, 2569, 2620, 2653
- 类型: 风格
- 描述: 约 15 个测试硬编码 `"2026-XX-XXT00:00:00.000Z"` 作为 `updatedAt` 时间戳。这些值对测试逻辑无影响（未被断言），但占据视觉空间并可能在将来引起困惑。
- 建议: 提取为常量 `const FIXED_DATE = "2026-01-01T00:00:00.000Z";` 或直接使用固定值如 `"2026-01-01"`。

---

## 总结

| 优先级 | 数量 | 核心问题 |
|--------|------|----------|
| P0 | 1 | 空串导致否定断言静默通过 |
| P1 | 3 | 大量重复的 setup/teardown 和解析模板 |
| P2 | 4 | 辅助函数混入断言、幂等性重复、否定断言冗余 |
| P3 | 3 | 参数化、风格、硬编码日期 |

**最高优先修复**: P0 `svgSectionBetween` 空串问题——当前所有 SVG 否定断言在 section 缺失时均虚假通过，是一个静默的测试质量漏洞。
