# D server 杂项审查报告

## 概览
- 审查文件数：10（config.mjs、dev.mjs、schemePath.mjs、nativeExportSave.mjs + .test、swaggerPage.mjs、swigger.examples.test.mjs、routes.test.mjs、deviceParameterChineseNames.test.mjs、viteConfigSelection.test.mjs）
- 总行数约 1600（不含 swaggerPage 元数据表与内嵌模板的纯展示部分）
- 发现总数：12（P0:0 / P1:3 / P2:5 / P3:4）

## P0 严重

（无）

## P1 重要

### [P1] swaggerPage 引用外部 CDN，违背"自包含"设计且无 SRI
- 位置: server/swaggerPage.mjs:273, :355（矛盾声明 :3）
- 类型: 安全 / 可移植性
- 描述: 第 3 行注释声称"自包含 HTML（无外部依赖）"，但 head 与 body 分别引用 `cdnjs.cloudflare.com` 的 atom-one-dark.min.css 和 highlight.min.js。离线/内网部署时语法高亮静默失效；引用第三方 CDN 且无 `integrity`（SRI）属性，CDN 被污染时会在文档页上下文执行任意脚本（页面可发任意 API 请求，含控制台写操作）。
- 建议: 将 highlight.js 以本地静态资源方式托管（如复制进 public/ 或内联精简版），或至少添加 SRI integrity + crossorigin 属性；同步修正注释。

### [P1] nativeExportSave.writeText 非原子写入，崩溃时损坏目标文件
- 位置: server/nativeExportSave.mjs:310
- 类型: bug / 数据完整性
- 描述: `writeFileImpl(target.path, data)` 直接写用户选定的最终路径。大文件导出过程中进程崩溃/断电会留下半写损坏文件，且 OverwritePrompt 已让用户确认覆盖原文件，损坏后无法恢复。
- 建议: 先写同目录临时文件（如 `<name>.<uuid>.tmp`），成功后 `rename` 到目标路径；失败时清理临时文件。

### [P1] dev.mjs 关停只杀 vite 直接子进程，进程树残留风险
- 位置: server/dev.mjs:11-26
- 类型: bug / 资源泄漏
- 描述: Windows 下 spawn 链为 cmd.exe → npx.cmd → vite（node 孙进程）。`vite.kill()` 只终止 cmd.exe 一层，node 孙进程常残留并继续占用 5173 端口，导致下次启动 EADDRINUSE。未使用 `detached: true` + 进程组/树杀。
- 建议: Windows 用 `spawn("taskkill", ["/pid", String(vite.pid), "/T", "/F"])`，POSIX 用 `detached:true` + `process.kill(-vite.pid)`；shutdown 里同时关闭 imageServer（当前仅靠 process.exit 兜底）。

## P2 一般

### [P2] swigger.examples.test 复刻页面 JS 逻辑，双源漂移
- 位置: server/swigger.examples.test.mjs:22-51 ↔ server/swaggerPage.mjs 内嵌 buildUrl/send 逻辑
- 类型: 重复
- 描述: 测试文件的 buildUrl/buildOpts 手工复刻了 swaggerPage 内嵌 `<script>` 中的同名逻辑。页面 Try-it 行为修改时测试不会感知，两者可能悄然分叉（示例已出现差异苗头：测试版对非字符串 body 做 JSON.stringify，页面版只接受字符串）。
- 建议: 将 buildUrl/buildOpts 提取为独立模块，页面端以字符串注入或打包引入，测试端直接 import。

### [P2] config.readConfig 静默吞掉配置解析错误
- 位置: server/config.mjs:12-17
- 类型: 错误处理
- 描述: platform.config.json 存在但 JSON 损坏时静默回退 `{}`，全部走默认值，运维难以察觉端口/前缀为何不生效。
- 建议: 区分 ENOENT（正常缺省）与其他错误；后者 `console.warn` 输出文件路径与原因。

### [P2] 端口配置无数值校验，NaN 延迟爆雷
- 位置: server/config.mjs:32-33
- 类型: 错误处理
- 描述: `Number(process.env.VITE_PORT ?? ...)` 遇到 `VITE_PORT=abc` 得 NaN，直到 listen 才以晦涩的 EADDRNOTAVAIL 类错误暴露，排查成本高。
- 建议: 加载时校验 `Number.isInteger(port) && port > 0 && port < 65536`，否则 fail-fast 并指明是哪个变量。

### [P2] base64 解码 try/catch 为不可达分支
- 位置: server/nativeExportSave.mjs:236-241
- 类型: 死代码
- 描述: Node 的 `Buffer.from(str,"base64")` 对非法字符宽容解码、从不抛错，catch 分支永不可达；真正的异常路径只剩空字符串检查。
- 建议: 删除 try/catch，保留空串校验即可；或改用严格校验（长度/字符集）后再解码。

### [P2] deviceParameterChineseNames.test 触发 271KB 主模块加载
- 位置: server/deviceParameterChineseNames.test.mjs:2（同类：viteConfigSelection 之外的多数 *.test.mjs 均 import ./server.mjs）
- 类型: 效率
- 描述: 仅测一个纯函数却 import 整个 server.mjs，拖慢该测试文件的冷启动（模块初始化含大量路由装配）。
- 建议: 将 meaningfulStoredDeviceParameterChineseName 等纯函数下沉至独立 util 模块，server.mjs re-export 保持兼容。

## P3 轻微

### [P3] schemePath.filter(Boolean) 冗余
- 位置: server/schemePath.mjs:14
- 类型: 简化
- 描述: safeFilePart 有 `|| fallback` 兜底，返回值永不为空串，外层 `.filter(Boolean)` 恒为恒等操作。
- 建议: 删除 filter(Boolean)。

### [P3] trimTrailingSlash 正则 g 标志冗余
- 位置: server/config.mjs:21
- 类型: 简化
- 描述: `/\/+$/g` 的 `$` 锚定使 g 标志无意义。
- 建议: 改为 `/\/+$/`。

### [P3] swagger 页面文案硬编码 "/webgrp/"
- 位置: server/swaggerPage.mjs:272, :347
- 类型: 风格
- 描述: `<title>` 与 header 副标题写死 `/webgrp/`，而接口路径已按 apiPrefix 动态重写（:218），自定义前缀部署时页面文案误导。
- 建议: 文案改为 `${apiPrefix}/ 接口文档`。

### [P3] 全项目 "swigger" 拼写（应为 swagger）
- 位置: server/dev.mjs:9、server/swigger.examples.test.mjs、SWIGGER_ENDPOINTS、/swigger 路由等多处
- 类型: 风格
- 描述: 项目内 swagger 一词系统性拼错为 swigger，新协作者易困惑；涉及导出符号名与 URL 路径，改动需兼容层。
- 建议: 低优先级统一更名；URL 可短期保留 /swigger 并 301 到 /swagger。

---
统计：P0:0 | P1:3 | P2:5 | P3:4 = 12 项
