# G 小脚本审查报告

## 概览

| 指标 | 值 |
|------|-----|
| 文件数 | 5 |
| 总行数 | 787 |
| 发现总数 | 16 |

| 文件 | 行数 | 发现数 |
|------|------|--------|
| `audit-icon-library-quality.mjs` | 290 | 4 |
| `fix-appscope-mounts.js` | 256 | 3 |
| `gen-gbk-table.mjs` | 37 | 3 |
| `list-used-lucide-icons.mjs` | 31 | 3 |
| `migrate-state-icon-images.mjs` | 173 | 3 |

---

## P0 严重

无。五个文件均为维护脚本，不涉及生产运行时或用户输入，无关键安全/数据丢失缺陷。

---

## P1 重要

### [P1-1] fix-appscope-mounts.js 存在 20+ 处重复 Object.assign 赋值
- 位置: scripts/fix-appscope-mounts.js:102,173,108,174,132,205,136,206,104,254,105,253,96,255,119,214,138,243,60,231 等
- 类型: 重复
- 描述: `canvasBackgroundColor`、`connectSource`、`isBusNode`、`isStaticNode`、`colorPalette`、`colorDisplayMode`、`dragging`、`formatSvgNumber`、`nodeGeometryTransform`、`MemoDeviceGlyph`、`Trash2`、`Type`、`RotateCcw`、`Scissors`、`ScanSearch`、`Route`、`Layers2`、`Layers`、`Group`、`Grid2X2`、`Copy`、`Plus`、`Minus`、`X`、`Ungroup` 等标识符被重复挂载到 `__appScope`，来源注释标注了不同的源文件位置（如 `appView.tsx:5` 与 `appCanvasArea.tsx:218`），但运行时第二次赋值是无效冗余操作，增加维护混淆风险——读者可能误以为两处挂载了不同的值。
- 建议: 如果是自动生成脚本，在生成端去重；如果是手工维护，合并为单次赋值：
  ```js
  Object.assign(__appScope, {
    canvasBackgroundColor, connectSource, isBusNode, /* ... */
  });
  ```

### [P1-2] migrate-state-icon-images.mjs 使用 process.cwd() 作为 repoRoot，破坏可移植性
- 位置: scripts/migrate-state-icon-images.mjs:19
- 类型: 错误处理
- 描述: `const repoRoot = process.cwd()` 要求必须从项目根目录执行脚本，否则 `data/device-library/library.json` 等路径会解析到错误位置，导致静默操作错误目录或报 ENOENT。其他四个脚本均使用 `import.meta.url` 相对定位，本脚本不一致。
- 建议: 改为与项目其他脚本一致的定位方式：
  ```js
  const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  ```

### [P1-3] migrate-state-icon-images.mjs manifest 写入无失败回滚机制
- 位置: scripts/migrate-state-icon-images.mjs:167-172
- 类型: 错误处理
- 描述: `--apply` 模式下，先写图片文件 (L168-170)、再写 manifest.json (L171)、最后写 library.json (L172)。如果 L172 `writeFileSync(libraryPath)` 失败（如磁盘满），图片文件和 manifest 已写入但 library.json 未更新，数据处于不一致状态。虽然有 `.bak` 备份，但需要人工介入恢复。
- 建议: 先写入临时文件，再原子性 rename；或在写入前验证目标目录可写，并在 catch 块中输出恢复指引：
  ```js
  try {
    const tmpLib = `${libraryPath}.tmp`;
    writeFileSync(tmpLib, newLibraryRaw);
    renameSync(tmpLib, libraryPath);
  } catch (err) {
    console.error("写入 library.json 失败，请从 .bak 恢复:", err.message);
    process.exit(1);
  }
  ```

---

## P2 一般

### [P2-1] audit-icon-library-quality.mjs wrongDomainRules 中 power-grid-electrical 与 transmission-link 共享大量相同正则
- 位置: scripts/audit-icon-library-quality.mjs:13-33, 37-54
- 类型: 重复
- 描述: `power-grid-electrical` 和 `transmission-link` 两个分类的排除规则有 6+ 条完全相同的正则（如 `/(broadcast|cell|...)[-_\ ]tower/i`、`/auto[-_\ ]?transmission/i`、`/transmission[-_\ ]?lte/i`、`/(beijing|berlin|...)[-_\ ].*tower/i` 等），维护时容易遗漏同步更新。
- 建议: 提取共享规则为独立数组，在 Map 初始化时展开合并：
  ```js
  const sharedTowerRules = [/...tower/i, /...transmission/i];
  const wrongDomainRules = new Map([
    ["power-grid-electrical", [...sharedTowerRules, /additional-rule/]],
    ["transmission-link", [...sharedTowerRules, /road/i]],
  ]);
  ```

### [P2-2] gen-gbk-table.mjs 输出目录不存在时 writeFileSync 会抛出不明确错误
- 位置: scripts/gen-gbk-table.mjs:35-36
- 类型: 错误处理
- 描述: `writeFileSync(outPath, content)` 在 `src/encoding/` 目录不存在时抛出 `ENOENT`，错误信息不包含"请先创建目录"的提示，对首次运行者不友好。
- 建议: 写入前确保目录存在：
  ```js
  import { mkdirSync } from "node:fs";
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, content, "utf-8");
  ```

### [P2-3] list-used-lucide-icons.mjs 将整个 src/ 读入单一字符串，大项目时内存开销大
- 位置: scripts/list-used-lucide-icons.mjs:23
- 类型: 性能
- 描述: `files.map(f => readFileSync(f, "utf-8")).join("\n")` 将所有源文件内容拼接成一个字符串后再做正则匹配。对于大型项目（数百个 TS/TSX 文件），这会一次性占用大量内存，且 join 产生不必要的中间字符串。
- 建议: 逐文件处理，累加 tokens 到同一个 Set：
  ```js
  const tokens = new Set();
  for (const file of files) {
    const src = readFileSync(file, "utf-8");
    for (const tok of src.match(/[A-Za-z_$][A-Za-z0-9_$]*/g) ?? []) {
      tokens.add(tok);
    }
  }
  ```

### [P2-4] list-used-lucide-icons.mjs 递归 walk 无深度限制，符号链接可能导致无限循环
- 位置: scripts/list-used-lucide-icons.mjs:10-20
- 类型: bug
- 描述: `walk()` 函数递归遍历目录，未检查 `s.isSymbolicLink()`，也未限制深度。如果 `src/` 下存在指向自身父目录的符号链接，会导致无限递归和栈溢出。
- 建议: 添加符号链接检查或深度限制：
  ```js
  function walk(dir, depth = 0) {
    if (depth > 20) return;
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      const s = statSync(full);
      if (s.isSymbolicLink()) continue;
      if (s.isDirectory()) walk(full, depth + 1);
      // ...
    }
  }
  ```

### [P2-5] fix-appscope-mounts.js 无 "use strict" 且未校验 __appScope 是否存在
- 位置: scripts/fix-appscope-mounts.js:1
- 类型: 错误处理
- 描述: 文件直接调用 `Object.assign(__appScope, ...)` 但未声明 `"use strict"`，也未在开头校验 `typeof __appScope !== "undefined"`。如果宿主环境未注入 `__appScope`，非严格模式下 `Object.assign(undefined, ...)` 会静默失败或抛出不明确错误。
- 建议: 在文件首行添加校验：
  ```js
  "use strict";
  if (typeof __appScope === "undefined") {
    throw new Error("__appScope is not defined. This script must run in a host that injects __appScope.");
  }
  ```

### [P2-6] migrate-state-icon-images.mjs 使用 sha1 截断 16 字符作为内容哈希
- 位置: scripts/migrate-state-icon-images.mjs:58
- 类型: 安全
- 描述: `createHash("sha1").digest("hex").slice(0, 16)` 使用 sha1 并截断为 64-bit。虽然对于图标去重场景碰撞概率极低（约 1.2e19 种组合），但 sha1 已被标记为不推荐用于安全场景。若未来代码被复用于更大规模数据集，碰撞风险上升。
- 建议: 改用 `sha256` 并保留至少 16 字符：
  ```js
  const hash = createHash("sha256").update(bytes).digest("hex").slice(0, 16);
  ```

### [P2-7] audit-icon-library-quality.mjs 逐文件同步读取 SVG，大图标库时性能差
- 位置: scripts/audit-icon-library-quality.mjs:251
- 类型: 性能
- 描述: 在循环中对每个图标调用 `readFileSync(path.join(...icon.file))`，同步 I/O 阻塞事件循环。对于数千图标的库，审计时间会显著增加。
- 建议: 使用 `fs.promises.readFile` 并发读取，或添加进度提示：
  ```js
  import { readFile } from "node:fs/promises";
  const svg = await readFile(path.join(iconLibraryDir, libraryId, icon.file), "utf8");
  ```

### [P2-8] gen-gbk-table.mjs catch 块静默吞掉所有异常，可能掩盖真实错误
- 位置: scripts/gen-gbk-table.mjs:19-21
- 类型: 错误处理
- 描述: `catch { /* 忽略不可编码字符 */ }` 会吞掉 `iconv.encode` 抛出的任何异常，包括非编码相关的错误（如内存不足、iconv 内部 bug）。虽然当前逻辑下只有编码失败会抛异常，但裸 catch 是代码异味。
- 建议: 缩小 catch 范围或添加注释说明预期异常类型：
  ```js
  catch (err) {
    if (err.code !== "ENCODING_NOT_SUPPORTED" && !/encode/i.test(err.message)) {
      throw err; // 非编码异常应向上传播
    }
  }
  ```

---

## P3 轻微

### [P3-1] fix-appscope-mounts.js 可合并为单次 Object.assign 调用
- 位置: scripts/fix-appscope-mounts.js:1-256
- 类型: 简化
- 描述: 256 行独立的 `Object.assign(__appScope, { X })` 调用可合并为单个 `Object.assign(__appScope, { A, B, C, ... })`，减少调用开销并提升可读性。
- 建议: 如果文件是自动生成的，修改生成逻辑输出合并形式；如果是手工文件，重构为：
  ```js
  Object.assign(__appScope, {
    ALLOW_RESIZE_TRANSFORM_PARAM,
    AlignCenterHorizontal,
    // ...所有标识符
  });
  ```

### [P3-2] list-used-lucide-icons.mjs 缺少 --help 和参数校验
- 位置: scripts/list-used-lucide-icons.mjs
- 类型: 错误处理
- 描述: 脚本无 `--help` 选项，也不校验 `src` 目录是否存在。传入未知参数时无反馈。
- 建议: 添加基础参数处理：
  ```js
  if (process.argv.includes("--help")) {
    console.log("Usage: node list-used-lucide-icons.mjs\n  Lists lucide icons actually used in src/");
    process.exit(0);
  }
  ```

### [P3-3] audit-icon-library-quality.mjs 仅输出 JSON，无人类可读摘要
- 位置: scripts/audit-icon-library-quality.mjs:286
- 类型: 简化
- 描述: `console.log(JSON.stringify(summary, null, 2))` 输出原始 JSON。对于快速检查，添加人类可读的摘要行（如 "发现 N 个跨域违规, M 个结构重复"）会更友好。
- 建议: 在 JSON 输出前添加摘要：
  ```js
  console.error(`审计完成: ${summary.wrongDomainViolations.length} 违规, ${summary.duplicateStructures.length} 重复`);
  console.log(JSON.stringify(summary, null, 2));
  ```

### [P3-4] gen-gbk-table.mjs 无 --output 参数支持自定义输出路径
- 位置: scripts/gen-gbk-table.mjs:35
- 类型: 简化
- 描述: 输出路径硬编码为 `../src/encoding/gbkTable.ts`。如需输出到其他位置（如临时验证），必须修改源码。
- 建议: 添加 `--output` 参数支持：
  ```js
  const outIdx = process.argv.indexOf("--output");
  const outPath = outIdx !== -1
    ? resolve(process.argv[outIdx + 1])
    : resolve(dirname(fileURLToPath(import.meta.url)), "../src/encoding/gbkTable.ts");
  ```

### [P3-5] migrate-state-icon-images.mjs prettyIndent 逻辑冗余
- 位置: scripts/migrate-state-icon-images.mjs:147
- 类型: 简化
- 描述: `JSON.stringify(library, null, prettyIndent || undefined)` 中 `|| undefined` 冗余——当 `prettyIndent` 为 0 时，`JSON.stringify` 第三个参数为 falsy 值已经等价于 `undefined`（不格式化）。
- 建议: 简化为：
  ```js
  const newLibraryRaw = JSON.stringify(library, null, prettyIndent);
  ```

---

## 总结

| 优先级 | 数量 | 说明 |
|--------|------|------|
| P0 严重 | 0 | 无关键缺陷 |
| P1 重要 | 3 | 重复赋值、可移植性、回滚机制 |
| P2 一般 | 8 | 重复规则、目录校验、内存、符号链接、严格模式、哈希算法、同步 I/O、裸 catch |
| P3 轻微 | 5 | 简化合并、参数支持、输出格式 |

**亮点**：`migrate-state-icon-images.mjs` 默认 dry-run、自动备份、内容哈希去重、幂等设计均为优秀实践；`audit-icon-library-quality.mjs` 结构清晰、职责单一；`gen-gbk-table.mjs` 逻辑简洁正确。
