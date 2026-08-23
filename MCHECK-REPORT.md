# 全项目 JS/MJS 代码审查总报告（mcheck）

> 审查日期：2026-08-23 ｜ 审查范围：全部 48 个 .js/.mjs 文件（server 32 / scripts 12 / e2e 2 / shared 1 / 根 1，约 1.25MB / 22,700+ 行）
> 方法：按目录分 11 组，每组独立深审并产出分段报告（见 `.sisyphus/reports/mcheck/`），本报告为合并总览。
> 说明：本报告只审查不修改代码。个别发现的原评级在合并时做了校准（见标注）。
>
> **姊妹报告**：TS/TSX 部分（192 文件 / 8.1MB / 555 项发现）见根目录 **`TS-REPORT.md`**；两份总报告 + `.sisyphus/reports/mcheck/` 下 44 份分段报告共同构成全仓库审查结论。
>
> **修订记录**：v2 — 初轮分组遗漏 `server/apiInternal.test.mjs` 与 `server/globalLineApi.test.mjs`（用户核对 git ls-files 后指出），已补审并新增 J 组分段报告；总统计与 P1/P2 计数同步更新。

---

## 一、总览统计

| 分组 | 覆盖文件 | P0 | P1 | P2 | P3 | 小计 | 分段报告 |
|------|---------|----|----|----|----|------|----------|
| A1 server.mjs（单体入口） | 1 | 3 | 6 | 6 | 5 | 20 | A1-server.md |
| A2 server.test.mjs | 1 | 1 | 3 | 4 | 3 | 11 | A2-server-test.md |
| B apiV1 系列 | 12 | 3 | 6 | 6 | 5 | 20 | B-apiv1.md |
| C registry/runtime 系列 | 6 | 0 | 2 | 8 | 4 | 14 | C-registry.md |
| D server 杂项 | 10 | 0 | 3 | 5 | 4 | 12 | D-server-misc.md |
| E docer 图标生成器 | 1 | 0 | 4 | 5 | 2 | 11 | E-docer-icons.md |
| F 大图标生成器组 | 4 | 2 | 6 | 7 | 4 | 19 | F-big-generators.md |
| G scripts 小脚本组 | 5 | 0 | 3 | 8 | 5 | 16 | G-small-scripts.md |
| H IEEE 模型生成器 | 2 | 3 | 6 | 5 | 4 | 18 | H-ieee.md |
| I e2e/shared/根目录 | 4 | 1 | 5 | 5 | 3 | 14 | I-e2e-shared-root.md |
| J 补审 apiInternal + globalLineApi 测试 | 2 | 0 | 1 | 4 | 4 | 9 | J-apiInternal-globalLineApi.md |
| **合计** | **48** | **13** | **45** | **63** | **43** | **164** | — |

---

## 二、修复优先级路线图（Top 10 必修）

按「正确性/数据安全 > 可用性 > 性能」排序，建议本周内处理：

| # | 问题 | 位置 | 一句话修复 |
|---|------|------|-----------|
| 1 | schemePath 纯 `..` 段可穿越目录 | server/apiV1Schemes.mjs:100 + server/schemePath.mjs:28 | safeFilePart 增加对 `..` 段的拦截 |
| 2 | Zip 解压无总量上限（zip bomb OOM） | server/server.mjs:6306 | 解压前累计 entry 未压缩大小，超 512MB 拒绝 |
| 3 | v1 readJsonBody 无大小限制（DoS） | server/apiV1Control.mjs:21 | 加 1MB 上限，超限 413 |
| 4 | Manifest 读写 TOCTOU 竞态 | server/server.mjs:6012 | read-modify-write 串行化（Promise 队列） |
| 5 | merge 脚本 icon.file 路径遍历 | scripts/merge-icon-libraries-into-open-source.mjs:258 | path.resolve 后校验仍在 sourceDir 内 |
| 6 | svgSectionBetween 空串使否定断言恒真 | server/server.test.mjs:26 | 辅助函数内断言 section 非空 |
| 7 | parseMatrix 静默空数组产出空壳模型 | scripts/generate-ieee-models.mjs:652 | 解析后校验 bus 非空，否则抛错 |
| 8 | round() 负值系统性偏差 | scripts/generate-ieee-models.mjs:676 | 改用 `Number(value.toFixed(digits))` |
| 9 | relayJson catch 后再抛导致进程崩溃 | server/apiV1Runtime.mjs:36 | catch 内再包 try/catch 兜底 |
| 10 | spawnSync 无 timeout，npm pack 挂死脚本 | 两个图标生成器 run() | 加 `timeout: 120_000` |

---

## 三、P0 严重（13 项）

> 原始评级保留，括号内为合并校准意见。

### 数据正确性 / 数据丢失
1. **[P0] Manifest 读写 TOCTOU 竞态** — server/server.mjs:6012,6092。并发上传/删除时后写覆盖先写，图片条目丢失或复活。修复：per-file 互斥队列。
2. **[P0] svgSectionBetween 返回空串，否定断言全部恒真** — server/server.test.mjs:26-33，波及 ~20+ 条 `not.toContain`。SVG 结构回退时测试虚假通过。修复：函数内断言非空。
3. **[P0] parseMatrix 静默返回空数组** — scripts/generate-ieee-models.mjs:652。MATPOWER 源格式变更/返回 HTML 时静默产出 0 节点空壳 JSON。修复：关键字段非空校验。
4. **[P0] takeBusEndpoint 越界静默降级到 bus 中心** — scripts/generate-ieee-models.mjs:1204。terminal 计数不足时走线连到中心点，生成视觉错误模型。修复：越界时告警/clamp。
5. **[P0] round() 负值系统性偏差** — scripts/generate-ieee-models.mjs:676。`+Number.EPSILON` 在负数上使舍入方向偏移，负坐标区域中点值错误。修复：`Number(value.toFixed(n))`。

### 安全
6. **[P0] schemePath 参数路径穿越** — server/apiV1Schemes.mjs:100 + schemePath.mjs:28。〔合并校准：子代理所述 `%2F` 编码绕过不成立——safeFilePart 已替换 `/\`；真实风险是数组元素为纯 `..`（无分隔符）时不被拦截，join 后逃逸到上级目录。〕修复：safeFilePart 拒绝 `..` 段。
7. **[P0] Zip 解压无总大小限制（zip bomb → OOM）** — server/server.mjs:6306,5908,5673。256MB 压缩包可解压数 GB。修复：解压前校验 entry 总未压缩大小。
8. **[P0] v1 readJsonBody 无大小限制** — server/apiV1Control.mjs:21。GB 级 body 可打爆内存。修复：1MB 上限 + 413。
9. **[P0] merge 脚本对外部 manifest 的 icon.file 未做路径净化** — scripts/merge-icon-libraries-into-open-source.mjs:258。`../../` 可读任意文件并复制进输出目录。修复：resolve 后前缀校验。

### 稳定性
10. **[P0] relayJson 双抛未防护** — server/apiV1Runtime.mjs:36 / apiV1Control.mjs:46。catch 内 sendV1Error 再抛（response 已关）→ unhandled rejection 崩进程。修复：嵌套 try/catch。
11. **[P0] spawnSync 无 timeout** — 两个图标生成器 run()。npm pack 网络挂起 → 脚本永久阻塞。修复：timeout 120s。

### 结构卫生
12. **[P0] verify-tooltip.mjs 遗留根目录的一次性调试脚本**〔校准：实际危害低，建议按 P1 处理〕— 根目录污染，误运行/误提交风险。修复：删除或移入 scripts/debug/。
13. **[P0] /v1/ 每请求重建路由数组 + 动态 import**〔校准：纯 GC 微开销，无正确性影响，建议按 P2 处理〕— server/server.mjs:6653。修复：初始化时构建一次并缓存。

---

## 四、P1 重要（44 项，按主题归组）

### 4.1 性能 / 资源（12 项）
| # | 问题 | 位置 |
|---|------|------|
| 1 | 单体 6709 行，8+ 职责域耦合，建议按聚类拆分（设备参数归一化 2600 行 → SVG 渲染 800 行 → E 文件导出 800 行优先） | server/server.mjs 全文 |
| 2 | sendJsonCacheable 每请求重复 序列化+SHA1+gzip，无 prepared 缓存 | server/server.mjs:1716 |
| 3 | readSchemeDirectory 递归无深度/数量限制，大目录单请求数千次 IO | server/server.mjs:560 |
| 4 | parseDataUrl 内存峰值 ≈ 3× 图片大小，并发上传触发 GC 风暴 | server/server.mjs:1823 |
| 5 | syncProject 每次全量扫描+解析 schemes/files 全部 JSON，且在串行锁内 | server/globalLineRegistry.mjs:860 |
| 6 | 30+ 测试重复 try/finally 临时目录模板（~25 处） | server/server.test.mjs 多处 |
| 7 | E 文件 section 解析断言模板重复 ~20 次 | server/server.test.mjs 多处 |
| 8 | 主循环串行 writeFile，258 图标逐个 await 写盘 | scripts/generate-docer-compatible-icons.mjs:2999 |
| 9 | 预览 HTML 全量拼接巨大字符串（open-source 数千图标 → 1-2MB 字符串） | F 两个生成器 renderPreviewHtml |
| 10 | nameTokens 循环内每次创建 3 个正则，数千图标 × 数万次 | F 两个生成器 |
| 11 | ~500 行手工布局数据硬编码（IEEE118 坐标等） | scripts/generate-ieee-models.mjs:51-492 |
| 12 | teardown kill 无超时，taskkill 失败挂死 CI | e2e/controlHarness.mjs:86 |

### 4.2 重复 / 应抽取共享模块（11 项）
| # | 问题 | 位置 |
|---|------|------|
| 13 | 跨 4 文件 ~670 行重复（escapeXml/normalizeWebPath/duplicateSvgKey/run/HTML 模板等 12 函数）→ 建 scripts/lib/icon-utils.mjs + icon-preview-template.mjs | F 全部 |
| 14 | readClientId 在 Control/Runtime 完全重复 → v1Utils.mjs | server/apiV1Control.mjs:15 / apiV1Runtime.mjs:15 |
| 15 | handleCommandError/handleFetchError 错误映射几乎相同 → 参数化 | server/apiV1Control.mjs:31 / apiV1Runtime.mjs:21 |
| 16 | createPendingFetch/createPendingCommand 同构 → createPending(tag, ErrClass) | server/runtimeRegistry.mjs:8,54 |
| 17 | isInsideDirectory 与 isPathInsideStaticRoot 逻辑相同 → 合一 | server/server.mjs:5154,6375 |
| 18 | createMockResponse 测试辅助重复 4 次 → test-utils.mjs | B 各测试文件 |
| 19 | fetchV1 测试辅助重复 3 次 → test-utils.mjs | B 三个 http 测试 |
| 20 | rowForSection 闭包重复定义 2 次 → 提升文件级 | server/server.test.mjs:1842,2052 |
| 21 | swigger.examples.test 复刻页面内嵌 JS（buildUrl/buildOpts），双源漂移 → 提取共享模块 | server/swigger.examples.test.mjs:22 |
| 22 | fix-appscope-mounts.js 20+ 处重复 Object.assign 挂载 | scripts/fix-appscope-mounts.js 多处 |
| 23 | e2e 9/10 测试用例同构样板 → controlRequest helper | e2e/apiV1Control.e2e.test.mjs |

### 4.3 错误处理 / 健壮性（9 项）
| # | 问题 | 位置 |
|---|------|------|
| 24 | createReadStream.pipe 无 error 处理，流中断客户端收到截断响应 | server/server.mjs:6089,6406,6422,6455 |
| 25 | sendV1Error 不检查 headersSent，重复响应抛错 | server/v1Response.mjs:95 |
| 26 | readSourceManifest 无错误处理，manifest 损坏即整体中断 | scripts/generate-docer-compatible-icons.mjs:2566 |
| 27 | fetchCase 不校验响应内容，可能解析 HTML 错误页（联动 H-P0-1） | scripts/generate-ieee-models.mjs:1448 |
| 28 | main() 单 case 失败全量中断，无 per-case 隔离 | scripts/generate-ieee-models.mjs:1467 |
| 29 | migrate-state-icon-images apply 模式无原子写/回滚 | scripts/migrate-state-icon-images.mjs:167 |
| 30 | migrate 脚本用 process.cwd() 定位 repoRoot，换目录执行即错位 | scripts/migrate-state-icon-images.mjs:19 |
| 31 | npm pack 无重试，7 源串行一次失败全废 | F 两个生成器 |
| 32 | 断开前端后固定 sleep 1s 等 WS 清理——最大 flaky 源 | e2e/apiV1Control.e2e.test.mjs:80 |

### 4.4 数据一致性 / 设计（7 项）
| # | 问题 | 位置 |
|---|------|------|
| 33 | registry 文件损坏时静默重建并覆盖原文件，记录永久丢失无备份 | server/globalLineRegistry.mjs:212,751 |
| 34 | dev.mjs 只杀 vite 直接子进程，Windows 孙进程残留占端口 | server/dev.mjs:11-26 |
| 35 | nativeExportSave.writeText 非原子写，崩溃损坏用户选定目标文件 | server/nativeExportSave.mjs:310 |
| 36 | swaggerPage 引用 cdnjs 外部 CSS/JS，违背"自包含"声明且无 SRI | server/swaggerPage.mjs:273,355 |
| 37 | x/y 坐标未校验有限性，NaN 透传前端 | server/apiV1Control.mjs:71 |
| 38 | fetchDevices 不查 HTTP 状态直接 json()，502 时 SyntaxError 掩盖真因 | e2e/apiV1Control.e2e.test.mjs:34 |
| 39 | 硬编码 e2e 端口 5184/5183 无冲突检测，可能打到错误 server | e2e/controlHarness.mjs:12 |

### 4.5 数据与逻辑混杂（5 项）
| # | 问题 | 位置 |
|---|------|------|
| 40 | docer 生成器 82%（~2500 行）为内嵌数据 → 外置 JSON | scripts/generate-docer-compatible-icons.mjs |
| 41 | F 两个生成器 70% 为分类数据定义 → scripts/data/*.json | F 两个生成器 |
| 42 | readJsonBody 与 server 内部实现重复且各自为政 → 统一共享 | server/apiV1Control.mjs:21 |
| 43 | IEEE118 gen/load bus 编号表可从数据自动派生却人工维护 | scripts/generate-ieee-models.mjs:37 |
| 44 | shared/deviceParameterChineseNames 108 条映射与 server 端参数定义双源漂移风险 | shared/deviceParameterChineseNames.mjs |
| 45 | apiInternal/globalLineApi 的"设 env + 动态 import"隔离模式依赖 vitest 默认 isolate，配置变更即爆 | server/apiInternal.test.mjs:18 / globalLineApi.test.mjs:42 |

---

## 五、P2 一般（63 项，主题概要）

细节见各分段报告，此处按主题归组：

- **效率类（~18 项）**：manifest.find O(n) 扫描（A1）、preparedJsonFileCache 无上限（A1）、正则未提模块级（A1/B/F）、小 payload 也建 Buffer（B）、recordForNode 循环内线性查找 O(n²)（C）、migrate 双遍读盘+stringify 比较（C）、cloneJson 用 JSON 序列化深拷贝（F）、逐文件同步读 SVG（G）、整个 src/ 拼单字符串（G）、waitForPort 循环内动态 import（I）、findExternalSourceIcon 线性扫描（E）等。
- **重复/简化类（~16 项）**：readBody/readRawBody 合一（A1）、schemeTreeSummary 参数化（B）、wrongDomainRules 共享正则（G）、compactDocerSymbol if-else 链改 Map（E）、commonAttrs 双定义（E）、SVG use 否定断言循环合并（A2）、幂等性断言参数化（A2）、device-library 断言块整段 ×2 重复（J）、measurement-config 输入大断言窄（J）等。
- **安全加固类（~6 项）**：content-length 未预检（A1）、ID 生成用 Date.now+Math.random 应改 randomUUID（A1:5606 / C runtimeWs:23）、WS register 无鉴权可抢注 clientId（C）、escapeXml 缺单引号转义（E/F）、sha1 截断 16 字符做哈希（G）、clientId 拼 URL 未编码（I）。
- **错误处理类（~9 项）**：config.readConfig 静默吞配置错误（D）、端口配置 NaN 延迟爆雷（D）、base64 解码不可达 catch（D）、register 覆盖旧 entry 不 reject 旧 pending（C）、gen-gbk-table 裸 catch（G）、__appScope 无存在性校验（G）、fetchJson 吞网络错误为空对象（J）、每 test 起停完整 server 拖慢时长（J）等。
- **抽象层次类（~12 项）**：`_clients` 私有 Map 导出破坏封装（C）、sweep 逻辑应下沉 registry（C）、HEARTBEAT_TIMEOUT_MS 双处定义（C）、sequentialTokenStartColumns 内嵌 expect（A2）、数据表应外置（E/H/F）、normalizeSvg 正则操作 XML 脆弱（F）、deniedNamePattern 300 字符硬编码正则（F）等。

---

## 六、P3 轻微（43 项，主题概要）

- **风格/命名**：全项目 "swigger" 拼写（应为 swagger，涉及 URL 与导出符号，需兼容层）；handleControl*/handleV1* 前缀不统一（B）；魔数未集中注释（A1/H/F）；GZIP_MIN_BYTES 无依据注释（B）。
- **微简化**：filter(Boolean) 冗余（D schemePath）、正则 g 标志冗余（D config）、非 /ws 升级直接 destroy 不回 404（C）、二进制帧 String 转换浪费（C）、e2e 残留 console.log（I）。
- **文档/注释**：MATPOWER tap=0 约定无注释（H）、SIDE_PREFIXES 双命名约定无说明（I）、生成 HTML 应标注"仅本地使用"（E）、时间戳在模块加载时计算而非执行时（E-P2-5 / F-P3-4 同型问题）。
- **测试改进**：test.each 参数化幂等测试（A2）、补 parseMatpowerCase/round/shouldUseTransformer 单测（H）、apiV1Control 缺非法 JSON 路径测试（B）、MATPOWER URL 锁定版本 tag（H-P3-1）。

---

## 七、跨目录共性问题（横向主题）

1. **路径安全工具缺失** — B 的 schemePath `..` 穿越、F 的 icon.file 遍历、A1 两处重复的 isInsideDirectory，本质是同一个缺失：项目需要统一的 `safeJoin(root, ...segments)` 工具（resolve + 前缀断言），所有拼接外部输入的路径一律走它。
2. **资源上限不统一** — v1 readJsonBody 无上限、zip 无解压上限、parseDataUrl 3× 峰值。建议统一 `collectBody(request, maxBytes)` + zip 解压总量守卫。
3. **ID/哈希生成三套写法** — `Date.now()+Math.random()`（A1/C）、`randomUUID`（C globalLineRegistry 有正确示范）、`sha1 截断`（G）。统一 crypto.randomUUID。
4. **原子写有榜样未推广** — globalLineRegistry.writeState（tmp+rename）是正确实现；nativeExportSave、migrate 脚本、manifest 写入均未采用。抽 `atomicWriteFile(path, data)` 共享。
5. **巨型数据内嵌是最大体量问题** — E(82%)、F(70%)、H(33%)、A1(40%) 四个文件合计 ~7000 行数据定义应外置为 JSON/独立数据模块，可一次性消减近半代码体量。
6. **测试基建重复** — createMockResponse×4、fetchV1×3、try/finally 临时目录×25、buildUrl 复刻。建 `server/test-utils.mjs` + vitest fixture。
7. **时间戳与 escapeXml 同型 bug 复现两处** — checkedAt/generatedAt 模块加载时计算（E/F）；escapeXml 缺 `&apos;`（E/F）。修共享工具后自然消除。

---

## 八、建议执行顺序

**第一周（安全与数据）**：路线图 #1-#5（路径穿越 ×2、zip bomb、body 上限、manifest 竞态）+ registry 损坏备份（P1-33）。
**第二周（正确性）**：路线图 #6-#9（测试恒真、IEEE 三连、双抛崩溃）+ spawnSync timeout（#10）+ pipe error 处理（P1-24）。
**第三周（结构）**：抽 `scripts/lib/icon-utils.mjs`（消 ~670 行重复）、`server/v1Utils.mjs`、`server/test-utils.mjs`、`atomicWriteFile`、`safeJoin` 四个共享件。
**第四周起（渐进重构）**：server.mjs 按聚类拆分（先 deviceParams 2600 行 → svgRenderer → eFileExport）；四个生成器数据外置 JSON；删除 verify-tooltip.mjs；最后统一 swigger→swagger 更名。

---

## 九、分段报告索引

| 报告 | 路径 |
|------|------|
| A1 server.mjs | .sisyphus/reports/mcheck/A1-server.md |
| A2 server.test.mjs | .sisyphus/reports/mcheck/A2-server-test.md |
| B apiV1 系列 | .sisyphus/reports/mcheck/B-apiv1.md |
| C registry/runtime | .sisyphus/reports/mcheck/C-registry.md |
| D server 杂项 | .sisyphus/reports/mcheck/D-server-misc.md |
| E docer 图标生成器 | .sisyphus/reports/mcheck/E-docer-icons.md |
| F 大图标生成器组 | .sisyphus/reports/mcheck/F-big-generators.md |
| G scripts 小脚本 | .sisyphus/reports/mcheck/G-small-scripts.md |
| H IEEE 生成器 | .sisyphus/reports/mcheck/H-ieee.md |
| I e2e/shared/根目录 | .sisyphus/reports/mcheck/I-e2e-shared-root.md |
| J 补审 apiInternal + globalLineApi | .sisyphus/reports/mcheck/J-apiInternal-globalLineApi.md |

---
*审查完成：48/48 文件覆盖（v2 修订后），164 项发现（P0:13 / P1:45 / P2:63 / P3:43）。未修改任何源码。*
