// 全仓库统一随机 ID 生成。
// 审查来源：MCHECK-REPORT A1-P2-1 / C-P3、TS-REPORT T32 ——
// Date.now+Math.random 分散实现共 5 处，碰撞概率与可预测性均劣于 UUIDv4。

/**
 * 生成带可选前缀的 RFC4122 v4 随机 ID。
 * 优先使用平台 crypto.randomUUID；非 secure context 下回退 getRandomValues 手工构造 v4。
 */
export function randomId(prefix = "") {
  const c = globalThis.crypto;
  if (typeof c?.randomUUID === "function") {
    return `${prefix}${c.randomUUID()}`;
  }
  if (typeof c?.getRandomValues !== "function") {
    // 极端环境兜底（不应发生）：退化为时间+随机串
    return `${prefix}${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  }
  const bytes = c.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return `${prefix}${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
