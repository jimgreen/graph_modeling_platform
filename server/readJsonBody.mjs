// JSON body 读取的**单源实现**（审查 MCHECK-REPORT #42：readJsonBody 重复且各自为政）。
//
// 此前有三份近乎逐字复制的实现，只差上限常量：
//   - server/apiV1Control.mjs —— 1MB（控制指令都是小 JSON）
//   - server/apiV1Runtime.mjs —— 2MB（模板文本体量）
//   - server/eFileExport.mjs —— 2MB（模板文本）
// 三处要改的策略是同一条（读满整个流、超限只丢 chunk 不中断），改一处漏两处的
// 代价是**静默的**：那个端点会退回「提前中断 → 客户端只见 ECONNRESET 而非 413」。
//
// ## 为什么必须读完整个流
//
// 提前中断（break / throw / request.destroy()）会让 Node 认为 body 未读完：
// 响应还没写出连接就被重置，客户端拿到 ECONNRESET 而不是 413。实测 pause() 只能撑到
// 约 3MB（缓冲高水位），再大仍会重置。上限的意义是「不把超大内容留在内存里」，
// 而这靠的是不再 push chunk，不是提前停止读取。
//
// ## 上限与文案由调用方给
//
// 三处上限本就允许不同（1MB vs 2MB），所以这里做成参数而不是硬编码 ——
// 去重的是**实现**，不是策略。

/** 默认上限 1MB：控制指令是小 JSON，超限即拒绝。 */
export const DEFAULT_JSON_BODY_LIMIT_BYTES = 1024 * 1024;

/**
 * 读 JSON body。
 *
 * @param {AsyncIterable<Buffer>} request 请求体流
 * @param {object} [options]
 * @param {number} [options.limitBytes] 上限字节数（默认 1MB）
 * @param {string} [options.limitLabel] 上限文案里的容量描述（如 "2MB"），只影响错误消息
 * @returns {Promise<any>} 解析后的 JSON；空 body 返回 `{}`
 * @throws {Error & { code?: string }} 超限时抛 code = "payload-too-large"；
 *   body 不是合法 JSON 时抛 SyntaxError（调用方负责映射成 400）
 */
export async function readJsonBody(request, { limitBytes = DEFAULT_JSON_BODY_LIMIT_BYTES, limitLabel } = {}) {
  const chunks = [];
  let total = 0;
  let oversize = false;
  // **继续读完整个流**，只是超限后不再累积 chunk（原因见文件头）。
  for await (const chunk of request) {
    total += chunk.length;
    if (total > limitBytes) {
      oversize = true;
      continue;
    }
    chunks.push(chunk);
  }
  if (oversize) {
    const error = new Error(`请求体超过 ${limitLabel ?? formatBytes(limitBytes)} 上限。`);
    error.code = "payload-too-large";
    throw error;
  }
  const body = Buffer.concat(chunks).toString("utf-8");
  return body ? JSON.parse(body) : {};
}

function formatBytes(bytes) {
  if (bytes >= 1024 * 1024) {
    return `${bytes / (1024 * 1024)}MB`;
  }
  return `${bytes / 1024}KB`;
}