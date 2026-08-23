# I e2e/shared/根目录审查报告

## 概览

| 指标 | 值 |
|------|-----|
| 文件数 | 4 |
| 总行数 | 722 (243 + 176 + 249 + 54) |
| 发现总数 | 14 |
| P0 严重 | 1 |
| P1 重要 | 5 |
| P2 一般 | 5 |
| P3 轻微 | 3 |

---

## P0 严重

### [P0-1] verify-tooltip.mjs 是遗留在仓库根目录的一次性调试脚本
- 位置: `verify-tooltip.mjs:1-54`
- 类型: 死代码
- 描述: 该文件不属于测试套件（不使用 vitest/describe/test），不是构建产物，也不是文档。它引用 `e2e/controlHarness.mjs` 启动完整 e2e 环境，执行硬编码的 UI 交互后截图到 `output/` 目录。这是一次性调试遗留物，污染仓库根目录，任何开发者都可能误运行或误提交修改。
- 建议: 删除此文件。若仍有调试价值，移至 `scripts/debug/tooltip-verify.mjs` 并在 `package.json` 中注册为 `debug:tooltip` script。

---

## P1 重要

### [P1-1] e2e teardown 无超时保护——kill 失败会挂死测试进程
- 位置: `e2e/controlHarness.mjs:86-100`
- 类型: bug
- 描述: `spawnServer` 返回的 `kill()` 函数在 Windows 上 spawn `taskkill` 后仅监听 `child.once("exit")` 来 resolve。若 `taskkill` 本身失败（权限不足、PID 已回收），promise 永远不 resolve，teardown 挂死，最终由 vitest 的 60s `afterAll` 超时强制终止，期间阻塞后续测试。Unix 路径同样无 SIGKILL 升级。
- 建议: 给 kill promise 加超时，超时后用 `SIGKILL`（Unix）或二次 `taskkill /f`（Windows）强杀：
```js
kill: () => new Promise((resolve) => {
  if (child.killed || child.exitCode !== null) { resolve(); return; }
  child.once("exit", () => resolve());
  // ... spawn taskkill / SIGTERM ...
  setTimeout(() => {
    if (child.exitCode === null) child.kill("SIGKILL");
  }, 5000);
})
```

### [P1-2] 断开前端后仅 sleep 1s 等待 WS 清理——flaky 竞态
- 位置: `e2e/apiV1Control.e2e.test.mjs:80-82`
- 类型: 效率
- 描述: `page.close()` 后用固定 `setTimeout(1000)` 等待 server 端注销客户端。CI 负载高时 1s 可能不够（心跳/清理逻辑可能更慢），导致后续 fetch 仍能看到旧 clientId，测试不稳定。注释也承认"心跳超时 60s 太久"但没给出替代方案。
- 建议: 改为轮询 `/v1/runtime/clients` 直到目标 clientId 消失或超时：
```js
const start = Date.now();
while (Date.now() - start < 10000) {
  const json = await (await fetch(`${imageBaseUrl}${apiPath("/v1/runtime/clients")}`)).json();
  if (!json.data?.clients?.some(c => c.clientId === clientId)) break;
  await new Promise(r => setTimeout(r, 300));
}
```

### [P1-3] verify-tooltip.mjs 大量使用 page.waitForTimeout 固定延时
- 位置: `verify-tooltip.mjs:11,19,26,32,39`
- 类型: 效率
- 描述: 5 处 `waitForTimeout` 使用硬编码延时（30s、1s、8s、5s、400ms），总等待 44.4s。这些延时是为了等待 UI 渲染/数据加载，但在 CI 环境下可能不够（导致后续操作失败）或过长（浪费时间）。Playwright 已弃用 `waitForTimeout`。
- 建议: 替换为条件等待：`page.waitForSelector("button:has-text('加载预定义模板')")` / `page.waitForLoadState("networkidle")` / `page.locator(".e-file-editor-th").first().waitFor()`。

### [P1-4] fetchDevices 未校验 HTTP 状态码直接 json()
- 位置: `e2e/apiV1Control.e2e.test.mjs:34-35`
- 类型: 错误处理
- 描述: `fetch()` 后直接 `res.json()`，若 server 返回 502/504（Vite 代理超时）或 HTML 错误页，`json()` 会抛出 `SyntaxError: Unexpected token < in JSON`，掩盖真实错误原因，调试困难。
- 建议: 加状态码检查：
```js
if (!res.ok) throw new Error(`fetchDevices HTTP ${res.status}: ${await res.text()}`);
```

### [P1-5] 硬编码端口 5184/5183 无冲突检测
- 位置: `e2e/controlHarness.mjs:12-13`
- 类型: bug
- 描述: `E2E_IMAGE_PORT=5184` 和 `E2E_VITE_PORT=5183` 硬编码。若另一测试实例、开发服务器、或系统服务已占用这些端口，`waitForPort` 会误认为 server 已就绪（连接成功），导致测试向错误的 server 发请求，产生不可预测的行为。
- 建议: 启动前检测端口可用性，或使用 `port: 0` 让 OS 分配随机端口后读取实际端口：
```js
// 启动前检查
const tester = net.createServer();
await new Promise((resolve) => tester.listen(0, () => {
  const port = tester.address().port;
  tester.close(resolve);
}));
```

---

## P2 一般

### [P2-1] resolveBrowserExecutable 仅支持 Windows 路径
- 位置: `e2e/controlHarness.mjs:36`
- 类型: bug
- 描述: 硬编码 `chrome-headless-shell-win64/chrome-headless-shell.exe`。Linux/macOS 上 Playwright 安装的目录结构和可执行文件名不同（如 `chrome-headless-shell-linux64/chrome-headless-shell`），此探测逻辑永远找不到文件，回退到 Playwright 默认解析（可能触发版本不匹配）。
- 建议: 根据 `process.platform` 选择路径：
```js
const platformDir = process.platform === "win32" ? "chrome-headless-shell-win64" :
                    process.platform === "darwin" ? "chrome-headless-shell-mac-arm64" :
                    "chrome-headless-shell-linux64";
const exeName = process.platform === "win32" ? "chrome-headless-shell.exe" : "chrome-headless-shell";
```

### [P2-2] waitForPort 每次循环都动态 import node:net
- 位置: `e2e/controlHarness.mjs:50`
- 类型: 性能
- 描述: `await import("node:net")` 放在 while 循环内部，每次重试（最多 ~100 次）都触发一次模块解析。虽然 Node.js 有模块缓存，但动态 import 本身有异步开销（微任务调度），在 300ms 间隔的紧凑循环中是不必要的开销。
- 建议: 将 import 移到函数顶部：
```js
const net = await import("node:net");
// 然后进入 while 循环
```

### [P2-3] clientId 直接拼入 URL 未编码
- 位置: `e2e/apiV1Control.e2e.test.mjs:53,84,100,118,134,152,170,187,203,219,234`
- 类型: 安全
- 描述: 多处使用模板字符串 `${clientId}` 直接拼入 URL query string。当前 clientId 是 server 生成的 UUID，不含特殊字符，但这是隐式假设。若未来 clientId 来源变化（如用户输入、第三方 ID），未编码的 `&`/`=`/`#` 会破坏 URL 结构，导致参数注入。
- 建议: 统一使用 `URLSearchParams`：
```js
const url = new URL(`${imageBaseUrl}${apiPath("/v1/control/device/add")}`);
url.searchParams.set("clientId", clientId);
const res = await fetch(url, { ... });
```

### [P2-4] deviceParameterChineseNames 可能与 server 端数据漂移
- 位置: `shared/deviceParameterChineseNames.mjs:1-109`
- 类型: 重复
- 描述: `EXACT_PARAMETER_LABELS` 维护了 108 个参数名到中文名的静态映射。server 端（`server/` 目录下的设备模型定义）很可能也有一份参数名清单。两份数据独立维护，新增/重命名参数时容易只改一处导致 UI 显示"自定义参数（xxx）"而非正确中文名。
- 建议: 确认 server 端是否有对应的参数定义源（如 JSON schema 或 DeviceKind 注册表）。若有，此文件应从 server 端生成或至少在 CI 中交叉校验。添加注释说明数据源和同步机制。

### [P2-5] verify-tooltip.mjs 输出目录未预创建
- 位置: `verify-tooltip.mjs:12,27,33`
- 类型: bug
- 描述: `page.screenshot({ path: "output/tooltip-page-1.png" })` 写入 `output/` 目录，但脚本未确保该目录存在。若 `output/` 不存在（如 clean checkout），screenshot 调用会抛 `ENOENT` 错误。
- 建议: 脚本开头加 `mkdirSync("output", { recursive: true })`。

---

## P3 轻微

### [P3-1] 测试中残留 console.log
- 位置: `e2e/apiV1Control.e2e.test.mjs:71`
- 类型: 风格
- 描述: `console.log("  [e2e] 无活动模型，跳过设备数断言...")` 在每次测试运行时输出，CI 日志中会产生噪音。该分支是预期的跳过逻辑，不是调试信息。
- 建议: 改用 `console.info` 并通过环境变量控制，或在无活动模型时使用 `test.skip()` 语义：
```js
if (beforeNodes === null) {
  return; // 或 throw new (skip)(...) 若 vitest 支持
}
```

### [P3-2] SIDE_PREFIXES 中 i_/j/k_ 与 source_/target_ 语义重复
- 位置: `shared/deviceParameterChineseNames.mjs:123-134`
- 类型: 抽象层次
- 描述: `SIDE_PREFIXES` 同时包含 `["source_", "首端"]` 和 `["i_", "首端"]`、`["target_", "末端"]` 和 `["j_", "末端"]`、`["medium_", "中压侧"]` 和 `["k_", "中压侧"]`。这些是同一语义的两种命名约定（英文全称 vs 字母缩写），映射结果完全相同。若未来新增一侧的翻译需要改两处。
- 建议: 可接受当前写法（因为确实是两套独立的命名），但建议添加注释说明这两组前缀的对应关系和为什么需要同时保留。

### [P3-3] 测试用例结构高度重复
- 位置: `e2e/apiV1Control.e2e.test.mjs:全文`
- 类型: 重复
- 描述: 10 个测试用例中有 9 个遵循完全相同的模式：解构 env → loadFrontendAndWaitOnline → fetch + JSON.stringify body → parse json → expect。唯一差异是 endpoint path、body 和断言。这导致大量样板代码（每个 test 约 10-15 行重复代码）。
- 建议: 提取 helper：
```js
async function controlRequest(env, path, body) {
  const clientId = await loadFrontendAndWaitOnline(env.page, env.baseUrl, env.imageBaseUrl);
  const res = await fetch(`${env.imageBaseUrl}${apiPath(path)}?clientId=${clientId}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  });
  return { status: res.status, json: await res.json() };
}
```

---

## 各文件发现汇总

| 文件 | 行数 | P0 | P1 | P2 | P3 |
|------|------|----|----|----|----|
| verify-tooltip.mjs | 54 | 1 | 1 | 1 | 0 |
| e2e/controlHarness.mjs | 176 | 0 | 2 | 1 | 0 |
| e2e/apiV1Control.e2e.test.mjs | 243 | 0 | 2 | 2 | 2 |
| shared/deviceParameterChineseNames.mjs | 249 | 0 | 0 | 1 | 1 |

## 快速修复建议（低成本高收益）

1. **删除 verify-tooltip.mjs**（P0）— 消除仓库根目录污染源
2. **teardown kill 加超时**（P1-1）— 防止 CI 挂死
3. **固定 sleep 改轮询**（P1-2）— 消除最大 flaky 来源
4. **fetchDevices 加 HTTP 状态检查**（P1-4）— 一行代码，错误信息清晰度大幅提升
