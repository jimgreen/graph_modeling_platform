// Content-Disposition 响应头 —— **全仓 server/ 侧唯一一份**（勿在别处再写一遍模板）。
//
// 此前 8 个下载端点各抄一份**逐字节相同**的模板字面量：
//
//   `attachment; filename="${encodeURIComponent(filename)}"; filename*=UTF-8''${encodeURIComponent(filename)}`
//
// 分布：server.mjs ×3（方案归档 / 空间归档 / 图元导出）、apiV1Runtime.mjs ×2
// （E 文件 GET、POST）、apiV1Schemes.mjs ×1（方案归档）、cimExport.mjs ×1、
// eFileExport.mjs ×1。
//
// 抽出来的理由：这一串必须**在所有下载端点一致** —— 同一个中文文件名，
// 若某个端点漏改，浏览器/客户端拿到的头格式就会不同（大小写、`''` 写法、
// 转义方式任一处不一致都会让部分客户端解不出文件名）。
//
// **格式故意保持原样，不"顺手修正"**：
// - `filename=` 里放的是 `encodeURIComponent(...)` 结果，**不是 RFC 6266 推荐的
//   ASCII 降级名或双引号转义名**。中文会被编码成 `%E6%96%B9...`。
//   这是既有行为，有用例逐字钉着（cimExport.test.mjs、apiV1Schemes.handlers.test.mjs），
//   改了就是协议变更，故不在本次收拢范围内。
// - `filename*` 用 RFC 5987 的 `UTF-8''<pct-encoded>`，大小写照原样保留。
// - 单引号 `''` 是 RFC 5987 的定界符，两个都不能省。
//
// 与 cors.mjs 同理：本模块只**生成头字符串**，不碰响应结构；调用方仍各自决定
// `content-type` / `content-length` / `cache-control` 与 CORS 头。

/**
 * 构造下载用的 `content-disposition` 头值。
 *
 * @param {string} filename 目标文件名（原样传入即可，内部做 encodeURIComponent）
 * @returns {string} 形如 `attachment; filename="x"; filename*=UTF-8''x` 的完整头值
 */
export function contentDispositionAttachment(filename) {
  const encoded = encodeURIComponent(filename);
  return `attachment; filename="${encoded}"; filename*=UTF-8''${encoded}`;
}