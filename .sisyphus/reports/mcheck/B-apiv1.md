# B apiV1 系列审查报告

## 概览

| 维度 | 数值 |
|------|------|
| 文件数 | 12 |
| 总行数 | ~2400 |
| 发现总数 | 20 |

---

## P0 严重

### [P0] 路径穿越风险：schemePath 参数未充分校验
- 位置: server/apiV1Schemes.mjs:100-115
- 类型: 安全
- 描述: `handleV1SchemeExport` 使用 `requireSchemePath(url)` 获取 `schemePath`，虽校验格式但未阻止编码的路径分隔符（如 `%2F`）。攻击者可构造 `schemePath=A%2F..%2F..%2Fetc` 读取敏感文件。
- 建议: 在 `parseSchemePathParam` 中增加 `decodeURIComponent` 后二次校验，禁止 `..` 和绝对路径：
  ```js
  const decoded = decodeURIComponent(schemePath);
  if (decoded.includes('..') || path.isAbsolute(decoded)) {
    return { ok: false, error: 'bad-request' };
  }
  ```

### [P0] 无请求体大小限制：readJsonBody 可被 DoS
- 位置: server/apiV1Control.mjs:21-28
- 类型: 安全
- 描述: `readJsonBody` 无限流式读取请求体，恶意客户端可发送 GB 级 JSON 导致内存耗尽。
- 建议: 增加大小限制（如 1MB），超限返回 413：
  ```js
  const MAX_BODY = 1 << 20;
  let total = 0;
  for await (const chunk of request) {
    total += chunk.length;
    if (total > MAX_BODY) {
      sendV1Error(response, 'bad-request', '请求体过大。');
      return null;
    }
    chunks.push(chunk);
  }
  ```

### [P0] 未捕获的异步异常：relayJson 后 sendV1JsonNoStore 抛错导致进程崩溃
- 位置: server/apiV1Runtime.mjs:36-43, server/apiV1Control.mjs:46-53
- 类型: 错误处理
- 描述: `relayJson`/`relayCommand` 内部 try/catch 仅捕获 `fetchFromClient`/`sendCommandToClient` 异常。若 `sendV1JsonNoStore` 在 catch 后再次抛错（如 response 已关闭），unhandled rejection 崩溃进程。
- 建议: 在 catch 块内再包 try/catch，或确保 `sendV1Error` 永远不抛：
  ```js
  async function relayJson(response, fetchPromise) {
    try {
      const data = await fetchPromise;
      await sendV1JsonNoStore(response, data);
    } catch (error) {
      try {
        handleFetchError(response, error);
      } catch {
        // response 已关闭，仅记录日志
        console.error('Failed to send error response:', error);
      }
    }
  }
  ```

---

## P1 重要

### [P1] 重复代码：readClientId 函数跨模块重复
- 位置: server/apiV1Control.mjs:15-18, server/apiV1Runtime.mjs:15-18
- 类型: 重复
- 描述: 两个模块完全相同的 `readClientId` 函数，违反 DRY。
- 建议: 提取到 `v1Utils.mjs`：
  ```js
  export function readClientId(url) {
    const raw = url.searchParams.get('clientId') ?? '';
    return raw.trim() || null;
  }
  ```

### [P1] 重复代码：readJsonBody 与 image-server 内部实现重复
- 位置: server/apiV1Control.mjs:21-28
- 类型: 重复
- 描述: 注释明确说"不依赖 image-server 内部 readJsonBody"，但未解释原因。若功能相同，应复用而非重写。
- 建议: 若确有解耦需求，提取到共享模块并添加注释说明设计决策；否则直接 import `server.mjs` 的 `readJsonBody`。

### [P1] 重复代码：错误处理逻辑高度相似
- 位置: server/apiV1Control.mjs:31-43 (`handleCommandError`), server/apiV1Runtime.mjs:21-33 (`handleFetchError`)
- 类型: 重复
- 描述: 两个函数逻辑几乎相同（NoOnlineClient→503, Timeout→503, 其他→按 code 映射），仅默认 code 不同（`control-failed` vs `internal`）。
- 建议: 提取通用错误映射函数，参数化默认 code：
  ```js
  function handleWsError(response, error, defaultCode) {
    if (error instanceof NoOnlineClientError) return sendV1Error(response, 'no-online-client', error.message);
    if (error instanceof CommandTimeoutError || error instanceof FetchTimeoutError) return sendV1Error(response, 'ws-timeout', error.message);
    const code = error?.code ?? defaultCode;
    sendV1Error(response, code, error instanceof Error ? error.message : '处理失败。');
  }
  ```

### [P1] 性能：串行 await 可并行
- 位置: server/apiV1Schemes.mjs:150-152
- 类型: 性能
- 描述: `handleV1ModelJson` 先 `await readSchemeProjectRecord` 再 `await readMeasurementConfig`，两者独立 I/O，串行增加延迟。
- 建议: 使用 `Promise.all`：
  ```js
  const [record, measurement] = await Promise.all([
    readSchemeProjectRecord(schemePath, modelName),
    readMeasurementConfig()
  ]);
  ```

### [P1] 错误处理：sendV1Error 未防御重复响应
- 位置: server/v1Response.mjs:95-104
- 类型: 错误处理
- 描述: 若 `response.writeHead` 已被调用（如 handler 内部分写入后出错），`sendV1Error` 再次调用 `writeHead` 会抛 "Cannot set headers after they are sent"。
- 建议: 检查 `response.headersSent`：
  ```js
  export function sendV1Error(response, code, message) {
    if (response.headersSent) {
      console.error('Cannot send error, headers already sent:', code, message);
      return;
    }
    // ... 原有逻辑
  }
  ```

### [P1] 输入验证：x/y 坐标未校验范围
- 位置: server/apiV1Control.mjs:71-76
- 类型: 输入验证
- 描述: `x`/`y` 直接 `Number(x)` 转换，未校验是否为有限数字或合理范围（如负数、超大值）。`NaN` 会透传到前端。
- 建议: 增加校验：
  ```js
  if (x !== undefined) {
    const num = Number(x);
    if (!Number.isFinite(num)) {
      sendV1Error(response, 'bad-request', 'x 须为有限数字。');
      return;
    }
    params.x = num;
  }
  ```

---

## P2 一般

### [P2] 重复代码：测试中 createMockResponse 重复 4 次
- 位置: server/apiV1Library.test.mjs:30-49, server/apiV1Schemes.handlers.test.mjs:19-43, server/apiV1Control.test.mjs:84-103 (间接), server/v1Response.test.mjs:5-24
- 类型: 重复
- 描述: 多个测试文件重复定义 `createMockResponse` 函数，逻辑高度相似。
- 建议: 提取到 `test-utils.mjs`：
  ```js
  export function createMockResponse() { /* ... */ }
  export function createMockRequest(headers = {}) { /* ... */ }
  ```

### [P2] 重复代码：fetchV1 测试辅助函数重复 3 次
- 位置: server/apiV1Library.http.test.mjs:22-32, server/apiV1Schemes.test.mjs:31-41, server/apiV1Runtime.test.mjs:69-79
- 类型: 重复
- 描述: 三个集成测试文件完全相同的 `fetchV1` 函数。
- 建议: 提取到 `test-utils.mjs` 统一维护。

### [P2] 风格：错误消息中英文混杂
- 位置: server/apiV1Control.mjs:62, 67 (中文), server/apiV1Runtime.mjs:31 (英文默认消息)
- 类型: 风格
- 描述: 部分错误消息用中文（"请求体须为合法 JSON。"），部分用英文或混合，前端国际化困难。
- 建议: 统一为英文（便于日志/监控）或提供 i18n key 映射。

### [P2] 效率：小 payload 也创建 Buffer
- 位置: server/v1Response.mjs:46-51
- 类型: 效率
- 描述: `prepareV1Payload` 对所有响应（包括 <1KB）都 `Buffer.from(JSON.stringify(body))`，小 payload 可直接用 string。
- 建议: 延迟 Buffer 创建，仅在 gzip 路径需要：
  ```js
  const raw = JSON.stringify(body);
  if (raw.length < GZIP_MIN_BYTES) {
    response.end(raw); // 直接发 string
    return;
  }
  const buf = Buffer.from(raw);
  // ... gzip 逻辑
  ```

### [P2] 死代码：readMeasurementConfig 仅一处使用
- 位置: server/apiV1Schemes.mjs:11
- 类型: 死代码
- 描述: `readMeasurementConfig` 仅在 `handleV1ModelJson` 使用，顶层 import 增加模块耦合。
- 建议: 若 `server.mjs` 加载慢，可改为动态 import；否则保留但添加注释说明用途。

### [P2] 抽象层次：schemeTreeSummary 与 schemeHierarchy 高度相似
- 位置: server/apiV1Schemes.mjs:36-43, 46-52
- 类型: 抽象层次
- 描述: 两个递归函数结构相同，仅映射字段不同（projects vs children）。
- 建议: 参数化提取：
  ```js
  function mapSchemeTree(schemes, mapper) {
    return schemes.map(s => ({
      ...mapper(s),
      children: mapSchemeTree(s.children ?? [], mapper)
    }));
  }
  ```

---

## P3 轻微

### [P3] 风格：魔法数字 GZIP_MIN_BYTES 未解释
- 位置: server/v1Response.mjs:9
- 类型: 风格
- 描述: `GZIP_MIN_BYTES = 1024` 无注释说明阈值选取依据。
- 建议: 添加注释：`// 1KB 以下 gzip 收益低于 CPU 开销`

### [P3] 风格：命名不一致
- 位置: server/apiV1Control.mjs:57 (`handleControlDeviceAdd`), server/apiV1Library.mjs:66 (`handleV1LibraryCategories`)
- 类型: 风格
- 描述: Control 模块用 `handleControl*`，Library/Runtime 用 `handleV1*`，前缀不统一。
- 建议: 统一为 `handleV1Control*` / `handleV1Library*` / `handleV1Runtime*`。

### [P3] 类型安全：sendV1Error 缺少 JSDoc
- 位置: server/v1Response.mjs:95
- 类型: 风格
- 描述: `code` 参数无类型约束，调用者可传任意 string，难发现拼写错误。
- 建议: 添加 JSDoc：
  ```js
  /**
   * @param {'bad-request'|'not-found'|'internal'|'no-online-client'|'ws-timeout'} code
   */
  export function sendV1Error(response, code, message) { /* ... */ }
  ```

### [P3] 测试覆盖：apiV1Control.test.mjs 缺少 JSON 解析失败测试
- 位置: server/apiV1Control.test.mjs
- 类型: 效率
- 描述: 测试文件未覆盖 `readJsonBody` 抛错路径（malformed JSON）。
- 建议: 增加测试用例：
  ```js
  test("非法 JSON → 400 bad-request", async () => {
    const res = await fetch(`${baseUrl}/webgrp/v1/control/device/add`, {
      method: "POST",
      body: "not json"
    });
    expect(res.status).toBe(400);
  });
  ```

### [P3] 效率：SHA1 用于 ETag 非最优
- 位置: server/v1Response.mjs:49
- 类型: 效率
- 描述: SHA1 对于 ETag 安全强度过剩，且比 MD5 慢。ETag 不需抗碰撞，仅需快速散列。
- 建议: 改用 MD5 或 CRC32（若依赖允许）：
  ```js
  const etag = `"${createHash('md5').update(raw).digest('hex')}"`;
  ```

---

## 零发现文件

以下文件未发现问题：
- 无（所有文件均有至少一个发现）

---

## 统计

| 优先级 | 数量 |
|--------|------|
| P0 | 3 |
| P1 | 6 |
| P2 | 6 |
| P3 | 5 |
| **总计** | **20** |
