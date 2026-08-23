# A1 server.mjs 审查报告

## 概览

| 指标 | 数值 |
|------|------|
| 文件 | server/server.mjs |
| 总行数 | 6709 |
| 发现总数 | 20 |
| P0 严重 | 3 |
| P1 重要 | 6 |
| P2 一般 | 6 |
| P3 轻微 | 5 |

### 职责聚类（单体结构分析）

| 聚类 | 行数范围（约） | 行数 | 说明 |
|------|----------------|------|------|
| 常量/枚举/列定义 | 1–437 | ~437 | modelTypes、eSectionColumns、staticComponentLibraryByKind、设备参数映射表 |
| 文件系统工具 | 438–597 | ~160 | ensureStore、readManifest、readSchemeDirectory 递归 |
| 方案/项目 CRUD | 504–5536 | ~5000 | 方案归档、导入导出、zip 处理、项目读写 |
| 设备参数归一化 | 1022–3600 | ~2600 | 大量 domain-specific 参数别名/映射/归一化函数 |
| SVG 服务端渲染 | 4300–5100 | ~800 | buildServerSvgNodeMarkup、symbol 生成、edge 渲染 |
| E 文件导出 | 3500–4300 | ~800 | buildDeviceParameterFile、列映射、GBK 编码 |
| 图片/图标/文件夹 CRUD handler | 5600–6100 | ~500 | upload、download、folder CRUD、import library |
| 配置 CRUD | 900–1020 | ~120 | color-config、measurement-config |
| HTTP 框架函数 | 1663–1830 | ~170 | sendJson、readBody、parseDataUrl、gzip 缓存 |
| 路由装配 + 静态托管 | 6375–6709 | ~334 | createImageServer、exactRouteHandlers、dynamicRouteHandlers、serveStaticAsset |

**建议提取顺序**（按独立性和收益排序）：
1. **设备参数归一化**（~2600 行）→ `server/deviceParams/` 目录
2. **SVG 渲染**（~800 行）→ `server/svgRenderer.mjs`
3. **E 文件导出**（~800 行）→ `server/eFileExport.mjs`
4. **方案 CRUD**（~500 行，不含归一化）→ `server/schemeStore.mjs`（已部分拆分）
5. **图片/图标 CRUD**（~500 行）→ `server/imageStore.mjs`

---

## P0 严重

### [P0-1] Manifest 读写 TOCTOU 竞态导致数据丢失
- 位置: server/server.mjs:6012-6015, 6092-6100
- 类型: bug
- 描述: `handleUpload` 先 `readManifest()` 再 `writeManifest([item, ...manifest])`，`handleDeleteImageAsset` 同理。并发上传/删除时，两个请求读到同一版本 manifest，后写入者覆盖先写入者的变更，导致 manifest 条目丢失（图片"消失"或"复活"）。
- 建议: 引入 per-file 互斥锁（如 `async-mutex` 或自研 Promise 队列），对 manifestPath 的 read-modify-write 操作串行化。或改用 SQLite/append-only log。

### [P0-2] Zip 解压无总大小限制——内存耗尽 DoS
- 位置: server/server.mjs:6306-6313, 5908, 5673
- 类型: 安全
- 描述: `handleImportSchemeArchive` 接受最大 256MB zip，`new AdmZip(buffer)` 在内存中全量解压，无解压后总大小上限。一个精心构造的 zip bomb（256MB 压缩 → 数 GB 解压）可直接耗尽进程内存导致 OOM crash。`handleImportImageLibrary`（128MB 限制）和 `handleImportIconLibrary` 存在相同问题。
- 建议: 解压前检查 `zip.getEntries()` 的总 `headerSize` / `size`（未压缩大小），设置解压总量上限（如 512MB）。或改用流式解压（如 `unzipper`），逐 entry 累计大小，超限即中止。

### [P0-3] 每个 /v1/ 请求重建路由数组 + 动态 import
- 位置: server/server.mjs:6653-6666
- 类型: 性能
- 描述: 每次匹配 `/v1/` 前缀的请求都执行两次 `await import()` + 四次数组 spread 重建 `v1Routes`。虽然 Node.js 缓存模块不会重复加载，但 `import()` 返回 Promise 有微任务开销，且 `[...a, ...b, ...c, ...d]` 每次分配新数组。高并发下产生不必要的 GC 压力。
- 建议: 将 v1 路由数组在 `createImageServer` 初始化时一次性构建并缓存。动态 import 改为顶层静态 import 或首次加载后缓存到闭包变量。

---

## P1 重要

### [P1-1] 单体 6709 行——可维护性风险
- 位置: server/server.mjs（全文）
- 类型: 抽象层次
- 描述: 单文件承载 HTTP 框架、路由分发、静态托管、图片/图标/方案/配置 CRUD、SVG 渲染、E 文件导出、设备参数归一化等 8+ 个职责域。任意修改都有意外影响其他功能的风险，且无法独立测试。
- 建议: 按上方"职责聚类"表逐步提取，优先提取设备参数归一化（2600 行）和 SVG 渲染（800 行），两者合计占文件 50%。

### [P1-2] sendJsonCacheable 每次请求重新序列化 + SHA1 + gzip
- 位置: server/server.mjs:1716-1718
- 类型: 性能
- 描述: `GET /images`、`GET /schemes` 等高频 GET 接口每次都走 `JSON.stringify → SHA1 hash → gzip`。与 `sendCachedJsonFile`（按 mtime 缓存 prepared response）不同，`sendJsonCacheable` 对即时计算的响应无任何缓存。
- 建议: 对高频只读接口（如 manifest、schemes list）引入按数据 hash/mtime 的 prepared response 缓存，命中时跳过序列化 + gzip。

### [P1-3] readSchemeDirectory 递归无深度/数量限制
- 位置: server/server.mjs:560-597
- 类型: 性能
- 描述: 递归遍历方案目录下所有子目录和 JSON 文件。`includeProjects=true` 时逐文件 `readFile + JSON.parse + hydrateProject`。目录层级深或文件多时（如数百方案），单次 GET /schemes 请求可产生数千次文件 IO。
- 建议: 添加最大递归深度限制（如 5 层）和最大项目数限制；考虑缓存方案列表或提供分页。

### [P1-4] parseDataUrl 内存峰值约为图片大小的 3 倍
- 位置: server/server.mjs:1823-1833
- 类型: 内存
- 描述: JSON body 中 dataUrl 字段为 base64 字符串（~22MB for 16MB image）。`readBody` 先构建完整 string buffer，正则捕获组引用整个 base64 字符串，`Buffer.from(match[2], "base64")` 再分配解码后 Buffer。峰值内存约 22 + 22 + 16 = 60MB（单请求）。并发数个上传可触发 GC 风暴。
- 建议: 改用流式 base64 解码或要求客户端直接发送二进制 body（`content-type: image/png`）而非 data URL 包装。

### [P1-5] 重复的路径包含检查函数
- 位置: server/server.mjs:5154-5157, 6375-6378
- 类型: 重复
- 描述: `isInsideDirectory` 和 `isPathInsideStaticRoot` 逻辑完全相同（`relative() → 检查 ".." 前缀和绝对路径`），分别用于 zip 解压和静态文件托管。
- 建议: 合并为单一 `isPathInside(parent, child)` 函数，统一使用。

### [P1-6] createReadStream.pipe 无错误处理
- 位置: server/server.mjs:6089, 6406, 6422, 6455
- 类型: 错误处理
- 描述: `createReadStream(filePath).pipe(response)` 后，若流在传输中出错（文件被删、磁盘故障），response headers 已发送，无法返回 500。客户端收到截断响应但无错误信号，且 Node.js 默认 unhandled error 可能导致进程崩溃。
- 建议: 添加 `.on("error", ...)` 处理，在流错误时 `response.destroy()` 或 `response.end()`。

---

## P2 一般

### [P2-1] ID 生成使用 Date.now() + Math.random()
- 位置: server/server.mjs:5606, 6028
- 类型: bug
- 描述: 图片 ID (`img-${Date.now()}-${Math.random()...}`) 和文件夹 ID 使用 `Math.random()` 生成。高并发下 `Date.now()` 毫秒精度相同 + `Math.random()` 非加密安全，存在碰撞可能。
- 建议: 使用 `crypto.randomUUID()` 或 `crypto.randomBytes(12).toString("hex")`。

### [P2-2] readBody / readRawBody 代码重复
- 位置: server/server.mjs:1739-1755, 1757-1773
- 类型: 重复
- 描述: 两个函数几乎相同，唯一区别是最终 `Buffer.concat(chunks).toString("utf-8")` vs `Buffer.concat(chunks)`。
- 建议: 提取公共的 `collectRawBody(request, maxBytes)` 返回 Buffer，调用方按需 `.toString("utf-8")`。

### [P2-3] 未校验 content-length 请求头
- 位置: server/server.mjs:1739-1754
- 类型: 安全
- 描述: `readBody` 通过累加 chunk 大小检查超限，但未先检查 `content-length` 头。恶意请求可设 `content-length: 0` 但发送大量数据，在达到实际限制前消耗带宽和处理时间。
- 建议: 在开始收集 chunk 前，先检查 `request.headers["content-length"]`，若超过 `maxBodyBytes` 立即拒绝。

### [P2-4] 正则表达式在高频函数中重复创建
- 位置: server/server.mjs:1022-1027, 2037-2045, 多处 normalizeStored* 函数
- 类型: 效率
- 描述: `normalizeGasQuantityFieldName`、`normalizeStoredDeviceParams` 等函数内的正则字面量（如 `/^(?:gasQuantity|gasquantity)$/u`）虽被 V8 缓存，但在循环中对每个参数调用时仍产生 RegExp.test 开销。这些函数在方案保存时对每个设备的每个参数调用。
- 建议: 将频繁使用的正则提取为模块级 const，或改用 Set.has() 查找代替正则匹配。

### [P2-5] handleDownload 中 manifest.find() 为 O(n) 线性扫描
- 位置: server/server.mjs:6077-6089
- 类型: 效率
- 描述: 每次下载/删除请求都 `manifest.find(entry => entry.id === id)` 线性扫描整个 manifest。manifest 可能有数百/数千条目。
- 建议: 读取 manifest 后构建 `Map<id, item>` 索引，或直接以 id 为 key 存储。

### [P2-6] 全局变量 `preparedJsonFileCache` 无大小限制
- 位置: server/server.mjs:1681
- 类型: 内存
- 描述: `preparedJsonFileCache` 是 Map 类型的模块级缓存，按 filePath 存储 prepared JSON 响应。无 LRU 淘汰机制或大小上限，长期运行可能积累大量条目（虽然实际条目数受文件数限制）。
- 建议: 添加最大条目数限制或定期清理不活跃条目。

---

## P3 轻微

### [P3-1] staticComponentLibraryByKind 映射表放在 server 文件中
- 位置: server/server.mjs:64-109
- 类型: 抽象层次
- 描述: 40+ 行的 kind → library 静态映射属于前端/渲染领域知识，不应在 HTTP 服务器入口文件中。
- 建议: 提取到 `shared/staticComponentLibrary.mjs` 或 `server/constants.mjs`。

### [P3-2] eSectionColumns 大数据结构定义在 server 中
- 位置: server/server.mjs:113-437
- 类型: 抽象层次
- 描述: ~300 行的 section → column 映射定义在 server 入口文件中，属于 domain model 层。
- 建议: 提取到 `server/eFileColumns.mjs` 或 `shared/` 目录。

### [P3-3] 设备参数归一化代码 ~2600 行嵌入 server
- 位置: server/server.mjs:1022-3600
- 类型: 抽象层次
- 描述: 大量 `normalizeStored*`、`normalize*ForE`、参数别名映射等 domain-specific 归一化逻辑占据文件近 40%。这些是纯函数，可独立测试和复用。
- 建议: 提取到 `server/deviceParams/` 目录，按设备类型分文件。

### [P3-4] SVG 渲染逻辑 ~800 行嵌入 server
- 位置: server/server.mjs:4300-5100
- 类型: 抽象层次
- 描述: `buildServerSvgNodeMarkup`、`renderServerNodeSymbolBody`、edge 渲染等纯渲染函数与 HTTP 层无关。
- 建议: 提取到 `server/svgRenderer.mjs`。

### [P3-5] 魔数未集中管理
- 位置: server/server.mjs:40-47, 62-63
- 类型: 风格
- 描述: `maxFilePartLength = 80`、`defaultPowerBaseValue = 100` 等常量分散定义，缺少分组注释。各 `maxBodyBytes` 常量虽已命名但可考虑按资源类型分组。
- 建议: 按类别（图片限制、方案限制、配置限制、默认值）分组并添加 JSDoc 注释。
