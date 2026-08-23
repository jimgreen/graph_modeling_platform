# F 图标生成器审查报告

## 概览

| 指标 | 数值 |
|------|------|
| 文件数 | 4 |
| 总行数 | 5,410 (2,140 + 2,595 + 366 + 309) |
| 发现总数 | 19 |
| P0 严重 | 2 |
| P1 重要 | 6 |
| P2 一般 | 7 |
| P3 轻微 | 4 |

**文件清单：**

| 文件 | 行数 | 角色 |
|------|------|------|
| `scripts/generate-office-fluent-icons.mjs` | 2,140 | Fluent UI 图标分类选取 + SVG 规范化 + 预览页生成 |
| `scripts/generate-open-source-svg-icons.mjs` | 2,595 | 多源开源图标库聚合 + 分类 + 去重 + 预览页生成 |
| `scripts/generate-icon-library-catalog.mjs` | 366 | 扫描所有图标库目录生成总 catalog + 搜索索引 |
| `scripts/merge-icon-libraries-into-open-source.mjs` | 337 | 将 docer-free-compatible / office-fluent-compatible 合并入 open-source-svg |

---

## P0 严重

### [P0-1] 路径遍历：merge 脚本对外部 manifest 中的 `icon.file` 未做路径净化
- 位置: `scripts/merge-icon-libraries-into-open-source.mjs:258-263`
- 类型: 安全
- 描述: `originalFile` 直接取自源库 `manifest.json` 的 `icon.file` 字段，经 `normalizeWebPath` 后拼接到 `sourceDir` 做 `readFile`。若 `icon.file` 包含 `../../` 等序列，可读取 `sourceDir` 之外的任意文件并将内容复制到输出目录。`normalizeWebPath` 仅合并斜杠、不去除 `..` 段。
- 建议: 在 `path.join` 后用 `path.resolve` 校验结果是否在 `sourceDir` 内：
  ```js
  const resolved = path.resolve(sourceDir, originalFile);
  if (!resolved.startsWith(path.resolve(sourceDir) + path.sep)) continue;
  ```

### [P0-2] `spawnSync` 无 timeout，`npm pack` 网络挂起将导致脚本永久阻塞
- 位置: `scripts/generate-office-fluent-icons.mjs:1597-1615` 及 `scripts/generate-open-source-svg-icons.mjs:1817-1834`
- 类型: 效率
- 描述: `run()` 调用 `spawnSync` 未设 `timeout`。`npm pack` 依赖网络，若 npm 注册表不可达或 DNS 挂起，脚本将无限阻塞且无超时退出。两个生成器共执行 ~8 次 npm pack（1 + 7 sources），任何一次挂起均致命。
- 建议: 为 `spawnSync` 添加 `timeout: 120_000`（120 秒），并在失败时给出可操作错误提示：
  ```js
  const result = spawnSync(..., { ..., timeout: 120_000 });
  if (result.status === null && result.signal === 'SIGTERM') {
    throw new Error(`${command} timed out after 120s`);
  }
  ```

---

## P1 重要

### [P1-1] 跨文件大量重复工具函数——应抽取共享模块
- 位置: 全部 4 文件
- 类型: 重复
- 描述: 以下函数在 2-4 个文件中逐字重复，共计 ~12 个函数/~200 行重复代码：

  | 函数 | 出现文件 |
  |------|----------|
  | `escapeXml()` | fluent:1617, open-source:1836, catalog:9, merge:21 |
  | `normalizeWebPath()` | catalog:17, merge:12 |
  | `duplicateSvgKey()` | fluent:1734, open-source:2038, merge:29 (内联为 `normalizedSvgStructure`) |
  | `nameTokens()` | fluent:1625, open-source:1865 |
  | `tokenMatchesPattern()` | fluent:1634, open-source:1893 |
  | `categoryMatchScore()` | fluent:1644, open-source:1915 |
  | `categoryRejectsSourceName()` / `categoryRejectsName()` | fluent:1655, open-source:1926 |
  | `run()` + `quoteWindowsArg()` | fluent:1588-1615, open-source:1809-1834 |
  | `readJson()` | catalog:25, merge:43 |
  | `iconComplexity()` | fluent:1676, open-source:1961 |
  | `renderPreviewHtml()` 的 HTML/CSS/JS 模板 | fluent:1793-1986, open-source:2143-2367, merge:142-224 |

  总计约 200+ 行完全重复或高度相似代码。

- 建议: 创建 `scripts/lib/icon-utils.mjs`，导出 `escapeXml`、`normalizeWebPath`、`duplicateSvgKey`、`nameTokens`、`tokenMatchesPattern`、`categoryMatchScore`、`run`、`quoteWindowsArg`、`readJson`。创建 `scripts/lib/icon-html-template.mjs` 导出 `renderPreviewHtml` 的通用模板函数（接受 manifest + 配置项参数）。各生成器改为 `import` 使用。

### [P1-2] 预览 HTML 模板在内存中构建巨大字符串
- 位置: `scripts/generate-office-fluent-icons.mjs:1793-1986`、`scripts/generate-open-source-svg-icons.mjs:2143-2367`
- 类型: 内存
- 描述: `renderPreviewHtml()` 使用 `category.icons.map(...).join("")` 将全部图标的 `<article>` 卡片拼成一个超长字符串，再嵌入整体 HTML 模板。对于 open-source 生成器（输出数千图标），这会在内存中构建 1-2 MB 的字符串。类似地，`searchIndex` JSON 也是全量序列化。
- 建议: 对于预览页，考虑使用 WriteStream 分块写入；或限制预览页仅展示前 N 个图标并引导使用搜索索引 JSON 做全量检索。

### [P1-3] 正则表达式在循环中重复编译
- 位置: `scripts/generate-office-fluent-icons.mjs:1625-1631` (`nameTokens`)、`scripts/generate-open-source-svg-icons.mjs:1865-1872` (`nameTokens`)
- 类型: 性能
- 描述: `nameTokens()` 每次调用创建 3 个正则表达式字面量（`/([a-z])(\d)/g` 等）。此函数对每个图标名至少调用 2-3 次（`categoryMatchScore` + `tokenMatchesPattern` + `iconFamily`），open-source 生成器处理数千图标时产生数万次正则编译。JS 引擎虽有正则缓存，但字面量在函数体内的缓存行为不如模块级常量可靠。
- 建议: 将正则提升为模块级常量：
  ```js
  const RE_ALPHA_DIGIT = /([a-z])(\d)/g;
  const RE_DIGIT_ALPHA = /(\d)([a-z])/g;
  const RE_NON_ALNUM = /[^a-z0-9]+/g;
  function nameTokens(value) { ... }
  ```

### [P1-4] `npm pack` 无重试机制
- 位置: `scripts/generate-office-fluent-icons.mjs:1995`、`scripts/generate-open-source-svg-icons.mjs:2412`
- 类型: 错误处理
- 描述: `npm pack` 是网络操作，可能因临时网络抖动失败。当前失败直接抛异常终止整个生成流程，无重试。对于 7 个开源源的串行处理，一次失败意味着前面已完成的工作全部浪费。
- 建议: 添加简单的 3 次重试 + 指数退避：
  ```js
  async function npmPackWithRetry(spec, dest, retries = 3) {
    for (let i = 0; i < retries; i++) {
      try { return run("npm", ["pack", spec, "--pack-destination", dest, "--silent"]); }
      catch (err) { if (i === retries - 1) throw err; await new Promise(r => setTimeout(r, 2 ** i * 1000)); }
    }
  }
  ```

### [P1-5] `listFiles()` 在 open-source 生成器中使用不必要的动态 import
- 位置: `scripts/generate-open-source-svg-icons.mjs:1851-1863`
- 类型: 效率
- 描述: `listFiles()` 内部使用 `await import("node:fs/promises").then(...)` 动态导入 `readdir`，但文件顶部已经 `import { mkdir, readFile, rm, writeFile } from "node:fs/promises"` 静态导入了同一模块。动态 import 在此处无意义且增加开销。
- 建议: 直接使用顶层已有的 `readdir` import（需补加到 import 列表）：
  ```js
  import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
  ```

### [P1-6] 数据与逻辑混合在同一文件，导致单文件过大（2000+ 行）
- 位置: `scripts/generate-office-fluent-icons.mjs:20-1552`、`scripts/generate-open-source-svg-icons.mjs:14-1803`
- 类型: 抽象层次
- 描述: fluent 生成器前 1530 行（71%）是 `categories`、`categoryPatterns`、`categoryDenyPatterns` 数据定义。open-source 生成器前 1800 行（69%）是 `sources`、`categories`（含 patterns/denyPatterns）数据定义。这些纯数据占据了文件绝大部分体积，使得逻辑代码被推到 2000 行之后，阅读和维护困难。
- 建议: 将分类数据抽取到 `scripts/data/fluent-categories.json` 和 `scripts/data/opensource-categories.json`（或 `.mjs` 数据模块），生成器文件只保留处理逻辑。

---

## P2 一般

### [P2-1] `cloneJson()` 使用 `JSON.parse(JSON.stringify())` 实现深拷贝
- 位置: `scripts/merge-icon-libraries-into-open-source.mjs:47-49`
- 类型: 性能
- 描述: `cloneJson()` 通过序列化-反序列化实现深拷贝。对大 manifest 对象（包含数千图标条目）会产生不必要的 CPU 和内存开销。
- 建议: 使用 `structuredClone(value)`（Node.js 17+ 可用），或仅在确实需要深拷贝的地方做局部浅拷贝（`{ ...obj, icons: [...obj.icons] }`）。

### [P2-2] `duplicateSvgKey()` / `normalizedSvgStructure()` 对每个 SVG 执行 ~10 次正则替换
- 位置: `scripts/generate-office-fluent-icons.mjs:1734-1747`、`scripts/generate-open-source-svg-icons.mjs:2038-2051`、`scripts/merge-icon-libraries-into-open-source.mjs:29-41`
- 类型: 性能
- 描述: 去重键计算函数对每个 SVG 内容执行约 10 次正则替换（去除 xml 声明、title、desc、text、id、aria-labelledby、color、hex 颜色、空白压缩）。对于数千个 SVG 文件，每个数百到数千字节，总计算量可观。merge 脚本版本还多了一步 `normalizedSvgStructure`。
- 建议: 考虑对 SVG 内容先做轻量哈希（如取前 500 字符 + 文件长度）做初筛，仅对哈希冲突再做完整结构化比较。或将此函数优化为单次遍历的字符级状态机。

### [P2-3] `escapeXml()` 未处理单引号
- 位置: 4 个文件的 `escapeXml` 实现
- 类型: 安全
- 描述: 当前 `escapeXml` 替换 `& < > "` 四种字符，但不替换单引号 `'`（`&apos;`）。虽然当前所有 HTML 属性均使用双引号包裹，但如果未来有属性使用单引号或 SVG 内部出现 `style='...'` 上下文，可能产生注入点。
- 建议: 增加 `.replaceAll("'", "&#39;")` 以完备。

### [P2-4] `normalizeSvg()` 使用正则操作 SVG XML——脆弱且可能误匹配
- 位置: `scripts/generate-office-fluent-icons.mjs:1716-1732`、`scripts/generate-open-source-svg-icons.mjs:2053-2080`
- 类型: bug
- 描述: 使用正则表达式（如 `/<path\b(?![^>]*\s(?:fill|stroke)=)([^>]*)>/gi`）向 SVG 元素注入 `fill="currentColor"`。这种正则方法在以下场景会失败：(1) 属性值中包含 `>` 字符；(2) 嵌套的 CDATA 或注释内含 `<path`；(3) 属性名包含 `fill` 子串（如 `data-fill`）。对于来自 7 个不同开源库的 SVG，格式多样性较高。
- 建议: 对于生产关键路径，考虑使用轻量 XML 解析器（如 `sax` 或 `linkedom`）操作 DOM；或至少添加对已知边界情况的单元测试。

### [P2-5] `deniedNamePattern` 正则超长且硬编码
- 位置: `scripts/generate-open-source-svg-icons.mjs:1806-1807`
- 类型: 风格
- 描述: 一个约 300 字符的正则字面量，包含 60+ 个品牌名。更新困难且无法从外部配置。
- 建议: 将品牌名列表提取为数组常量，运行时构建正则：`new RegExp(\`(^|[-_])(\${brandNames.join("|")})\`, "i")`。

### [P2-6] 预览 HTML 中的 JS 搜索逻辑在大量图标时性能差
- 位置: `scripts/generate-open-source-svg-icons.mjs:2323-2367`、`scripts/generate-office-fluent-icons.mjs:1940-1986`
- 类型: 性能
- 描述: 预览 HTML 中的 `filterCards()` 在每次输入事件时遍历全部 `cards`（可能数千个 DOM 元素），对每个卡片执行 `card.dataset.search.includes(keyword)`。对于 5000+ 图标，每次击键触发 5000+ 次 DOM 属性读取和字符串匹配。
- 建议: 使用虚拟列表或至少使用 `requestAnimationFrame` 节流；或将搜索索引预构建为倒排索引。

### [P2-7] `activeSources` 变量定义位置不透明
- 位置: `scripts/generate-open-source-svg-icons.mjs:2405`
- 类型: 简化
- 描述: 主执行循环引用 `activeSources`，但该变量的定义/过滤逻辑在 2500+ 行文件中不易定位（应在 1800-2000 行范围内，被大量数据定义包围）。
- 建议: 将源激活逻辑移到文件开头的配置区域，或抽取到独立配置模块。

---

## P3 轻微

### [P3-1] 魔法字符串 `#2563eb` 在多个文件中重复
- 位置: `scripts/generate-office-fluent-icons.mjs:1727`、`scripts/generate-open-source-svg-icons.mjs:2074`、`scripts/merge-icon-libraries-into-open-source.mjs:38` (颜色替换目标)
- 类型: 风格
- 描述: 颜色值 `#2563eb`（Tailwind blue-600）在 SVG 规范化时硬编码为默认 `color` 属性值，在多处重复。
- 建议: 提取为模块常量 `DEFAULT_ICON_COLOR = "#2563eb"`，在共享模块中定义一次。

### [P3-2] `maxIconsPerCategory` / `maxIconsPerSourceCategory` 魔法数字
- 位置: `scripts/generate-office-fluent-icons.mjs:18`（224）、`scripts/generate-open-source-svg-icons.mjs:12`（16）
- 类型: 风格
- 描述: 两个不同的每分类图标上限值（224 和 16）直接硬编码，缺乏注释说明选取依据。
- 建议: 添加注释说明为何选择该值，或提取到配置文件。

### [P3-3] `mitLicenseText` 内嵌在生成器脚本中
- 位置: `scripts/generate-office-fluent-icons.mjs:1566-1585`
- 类型: 简化
- 描述: 完整的 MIT 许可文本（约 20 行）作为字符串常量内嵌在脚本中。
- 建议: 从 `LICENSE` 文件读取或提取到 `scripts/data/license-templates/` 目录。

### [P3-4] `sourceAudit.generatedAt` 在模块加载时计算，非执行时
- 位置: `scripts/generate-office-fluent-icons.mjs:1555`
- 类型: bug
- 描述: `generatedAt: new Date().toISOString()` 在模块顶层执行，如果模块被 import 缓存或长时间挂起，时间戳不反映实际生成时间。
- 建议: 改为在实际构建 manifest 时调用 `new Date().toISOString()`。

---

## 跨文件重复量化汇总

| 重复代码块 | 估算重复行数 | 涉及文件数 |
|------------|-------------|-----------|
| `escapeXml()` | ~5 × 4 = 20 | 4 |
| `normalizeWebPath()` | ~6 × 2 = 12 | 2 |
| `duplicateSvgKey()` / `normalizedSvgStructure()` | ~13 × 3 = 39 | 3 |
| `nameTokens()` + `tokenMatchesPattern()` | ~20 × 2 = 40 | 2 |
| `categoryMatchScore()` + reject 函数 | ~25 × 2 = 50 | 2 |
| `run()` + `quoteWindowsArg()` | ~25 × 2 = 50 | 2 |
| `readJson()` | ~3 × 2 = 6 | 2 |
| HTML 预览模板 (CSS + JS filter) | ~150 × 3 = 450 | 3 |
| **总计** | **~670 行** | — |

建议优先抽取 `scripts/lib/icon-utils.mjs` 和 `scripts/lib/icon-preview-template.mjs`，可减少约 600+ 行重复代码。

---

## 各文件零发现说明

无。4 个文件均发现了至少 1 个问题。

---

## 优先级排序汇总

| 优先级 | 数量 | 编号 |
|--------|------|------|
| P0 严重 | 2 | P0-1, P0-2 |
| P1 重要 | 6 | P1-1 ~ P1-6 |
| P2 一般 | 7 | P2-1 ~ P2-7 |
| P3 轻微 | 4 | P3-1 ~ P3-4 |
