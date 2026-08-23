# E generate-docer-compatible-icons.mjs 审查报告

## 概览

| 指标 | 数值 |
|------|------|
| 总行数 | 3042 |
| 文件大小 | 173,495 bytes |
| 数据块占比 | ~82%（约 2500 行） |
| 逻辑代码 | ~540 行（含 HTML 模板） |
| 发现总数 | 11 |
| 图标定义数 | ~258（212 个 `generatedIcon` + 46 个 `compactDocerCategory`） |
| 复用映射条目 | 132 条（`detailedDocerReusableSources`） |

数据块分布：
- `iconCategories` 数组（L11-896）：~886 行手写 SVG body
- `build*` 函数群（L940-2012）：~1072 行紧凑图标定义
- `detailedDocerReusableSources` Map（L2054-2562）：~508 行复用映射
- `compactDocerSymbol` if-else 链（L1231-1340）：~110 行硬编码特殊图标

---

## P0 严重

无。

---

## P1 重要

### [P1-1] readSourceManifest 无错误处理，缓存写入时机不安全
- 位置: `generate-docer-compatible-icons.mjs:2566-2572`
- 类型: 错误处理
- 描述: `JSON.parse(await readFile(...))` 若文件不存在或 JSON 格式损坏将抛出未捕获异常；且 `sourceManifestCache.set()` 在 `JSON.parse()` 之前不执行，但若 `readFile` 成功而 `JSON.parse` 失败，异常会冒泡导致整个脚本中断，无任何有意义的错误上下文。
- 建议:
```js
async function readSourceManifest(libraryId) {
  if (!sourceManifestCache.has(libraryId)) {
    const manifestPath = path.join(rootDir, "data", "icon-library", libraryId, "manifest.json");
    let raw;
    try {
      raw = await readFile(manifestPath, "utf8");
    } catch (err) {
      throw new Error(`无法读取图标库 manifest: ${manifestPath} (${err.message})`);
    }
    try {
      sourceManifestCache.set(libraryId, JSON.parse(raw));
    } catch (err) {
      throw new Error(`manifest JSON 解析失败: ${manifestPath} (${err.message})`);
    }
  }
  return sourceManifestCache.get(libraryId);
}
```

### [P1-2] 主循环串行 writeFile，大量图标时性能差
- 位置: `generate-docer-compatible-icons.mjs:2999-3012`
- 类型: 性能
- 描述: 每个图标的 `renderDocerIcon` + `writeFile` 在 `for...of` 中串行执行。258 个图标逐个 await 写盘，I/O 密集场景下耗时显著。`renderSvg` 和 `renderReusableDocerIcon` 是纯同步计算，只有 `renderReusableExternalIcon` 含异步 `readFile`，完全可分批并行。
- 建议:
```js
// 按 category 并行，每个 category 内图标并行写入
for (const category of iconCategories) {
  // ...
  await Promise.all(category.icons.map(async (icon) => {
    const rendered = await renderDocerIcon(icon, category);
    const filePath = path.join(categoryDir, `${icon.id}.svg`);
    await writeFile(filePath, rendered.svg, "utf8");
    // push to manifestCategory.icons...
  }));
}
```

### [P1-3] escapeXml 未转义单引号
- 位置: `generate-docer-compatible-icons.mjs:2726-2732`
- 类型: 安全
- 描述: `escapeXml` 处理了 `& < > "`，但未转义单引号 `'`（`&apos;`）。当前 SVG 属性全部使用双引号，但 `icon.color`、`icon.name` 等字段来自数据定义，若未来有值包含单引号且被用于单引号属性上下文，将产生 XML 注入风险。
- 建议:
```js
function escapeXml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}
```

### [P1-4] renderPreviewHtml 全量拼接巨大 HTML 字符串到内存
- 位置: `generate-docer-compatible-icons.mjs:2782-2972`
- 类型: 内存
- 描述: 为 258+ 图标生成完整 HTML 页面，所有卡片、CSS、JS 全部拼接到单个 template literal 返回值中。字符串长度随图标数线性增长，最终 `writeFile` 一次性写出。虽然对构建脚本非致命，但 `.join("")` 中间数组和最终字符串峰值内存占用可优化。
- 建议: 改用数组 `chunks = []`，每完成一个 category 后 `chunks.push(...)`，最终 `writeFile(path, chunks.join(""))`。或者对 `index.html` 使用流式写入 `createWriteStream`。

---

## P2 一般

### [P2-1] 数据表应外置为 JSON 文件
- 位置: `generate-docer-compatible-icons.mjs:11-896, 2054-2562`
- 类型: 抽象层次
- 描述: ~1400 行内嵌 SVG path 数据和 132 条复用映射硬编码在 JS 中。这些数据与逻辑关注点不同，修改图标数据需重新加载整个脚本，且无法被其他工具复用。`detailedDocerReusableSources`（L2054-2562）尤其适合独立为 `reusable-sources.json`。
- 建议: 将复用映射提取为 `data/icon-library/docer-free-compatible/reusable-sources.json`，脚本启动时 `readFile` + `JSON.parse` 加载。SVG body 数据量更大，可考虑提取为 `icons-data.json`，由代码生成脚本消费。

### [P2-2] compactDocerSymbol 超长 if-else 链
- 位置: `generate-docer-compatible-icons.mjs:1231-1340`
- 类型: 重复
- 描述: `compactDocerSymbol` 包含 ~110 行连续 `if (id === "...")` 分支，每个分支返回硬编码 SVG 路径。新增特殊图标必须修改此函数，违反开闭原则。且这些特殊路径与 `compactDocerDeviceBox`（L1187-1206）的 6 种模板风格在结构上重复。
- 建议: 将特殊图标路径表提取为 `Map<id, (item) => string>` 对象字面量，或放入外置 JSON。`compactDocerSymbol` 简化为：
```js
function compactDocerSymbol(item, variant = 0) {
  const id = String(item[0] || "");
  const label = compactDocerLabel(item);
  const text = gText(label, 32, 33, label.length > 3 ? 7 : 9);
  const custom = specialSymbolMap.get(id);
  if (custom) return custom(item) + text;
  return compactDocerDeviceBox(label, variant) + text;
}
```

### [P2-3] commonAttrs 与 generatedCommonAttrs 重复定义
- 位置: `generate-docer-compatible-icons.mjs:8-9` 和 `898-899`
- 类型: 重复
- 描述: 两个常量内容几乎相同，仅 `stroke-width` 不同（`"3"` vs `"2.6"`）。前者用于手写 SVG body（L11-896 的 `iconCategories`），后者用于 `generatedIcon` 系列的 `g*` helper。名称不统一增加理解成本。
- 建议: 统一为一个 `ATTRS` 常量数组或按用途命名 `handCraftedAttrs` / `generatedAttrs`，并在文件顶部集中定义所有变体。

### [P2-4] findExternalSourceIcon 每次线性扫描
- 位置: `generate-docer-compatible-icons.mjs:2574-2583`
- 类型: 效率
- 描述: 对每个复用外部图标引用，遍历整个 manifest 的 categories → icons 数组做 `file` 匹配。132 条复用引用，每个都 O(n) 扫描。虽然 manifest 不大，但若 manifest 增长或引用增多，性能会退化。
- 建议: 在 `readSourceManifest` 后预建 `Map<file, {category, icon}>` 索引：
```js
async function readSourceManifest(libraryId) {
  // ...existing...
  const manifest = sourceManifestCache.get(libraryId);
  if (!manifest._fileIndex) {
    manifest._fileIndex = new Map();
    for (const cat of manifest.categories || [])
      for (const icon of cat.icons || [])
        manifest._fileIndex.set(icon.file, { manifest, category: cat, icon });
  }
  return manifest;
}

async function findExternalSourceIcon(ref) {
  const manifest = await readSourceManifest(ref.libraryId);
  const hit = manifest._fileIndex.get(ref.file);
  if (!hit) throw new Error(`...`);
  return hit;
}
```

### [P2-5] sourceAudit.checkedAt 在模块加载时计算而非生成时
- 位置: `generate-docer-compatible-icons.mjs:2016-2017`
- 类型: bug
- 描述: `sourceAudit` 对象在模块顶层初始化，`checkedAt: new Date().toISOString()` 的时间戳反映的是 `import` 执行时刻，不是图标生成完成时刻。如果脚本被 import 但未立即执行（如测试或其他脚本引用），时间戳会不准确。
- 建议: 将 `checkedAt` 移到主执行块（L2975 附近）中赋值，或改为函数：
```js
const sourceAudit = {
  checkedAt: null, // 填充在主执行块
  // ...
};
// L2975 附近:
sourceAudit.checkedAt = new Date().toISOString();
```

---

## P3 轻微

### [P3-1] renderSvg 中 icon.id 未 escapeXml
- 位置: `generate-docer-compatible-icons.mjs:2738`
- 类型: 风格
- 描述: `id="${icon.id}-title"` 和 `id="${icon.id}-desc"` 直接拼接 `icon.id`，未经 `escapeXml`。当前所有 icon.id 都是合法的 kebab-case 标识符，风险极低，但与同函数内 `escapeXml(icon.name)` 的处理不一致。
- 建议: `const safeId = escapeXml(icon.id);` 后使用 `safeId`。

### [P3-2] preview HTML 内嵌 JS 未做 XSS 防护审查
- 位置: `generate-docer-compatible-icons.mjs:2930-2968`
- 类型: 风格
- 描述: `renderPreviewHtml` 生成的 `index.html` 中，`data-search` 属性值（L2798）已用 `escapeXml` 处理，但 `<script>` 块内的 `normalize()` 函数直接操作 DOM `value`。由于这是纯本地生成的离线 HTML，XSS 风险可忽略，但代码风格上应注明"仅供本地使用"。
- 建议: 在生成的 HTML 头部添加注释 `<!-- Generated for local preview only. Do not serve on untrusted networks. -->`。

---

## 统计

| 优先级 | 数量 |
|--------|------|
| P0 严重 | 0 |
| P1 重要 | 4 |
| P2 一般 | 5 |
| P3 轻微 | 2 |
| **合计** | **11** |
