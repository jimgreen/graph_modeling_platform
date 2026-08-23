// 路径安全工具（Node 端专用，依赖 node:path；前端勿引入）。
// 审查来源：MCHECK-REPORT B-P0-1（schemePath ".." 段穿越）、F-P0-1（merge 脚本 icon.file 遍历）、
// A1-P1-5（server.mjs 两处重复的目录包含判断）。

import { isAbsolute, relative, resolve, sep } from "node:path";

/**
 * 判断 child 是否位于 parent 目录内部（不含 parent 自身）。
 * 统一实现，替代 server.mjs 中 isInsideDirectory / isPathInsideStaticRoot 双副本。
 */
export function isPathInside(parentDir, childPath) {
  const relativePath = relative(resolve(parentDir), resolve(childPath));
  return Boolean(relativePath) && !relativePath.startsWith("..") && !isAbsolute(relativePath);
}

/**
 * 解析 base 与 segments 的绝对路径，并确保结果仍在 base 内部。
 * 任何 ".." 穿越、绝对路径注入都会返回 null，调用方应视为非法输入。
 */
export function safeJoin(base, ...segments) {
  const root = resolve(base);
  const target = resolve(root, ...segments.map((segment) => String(segment ?? "")));
  if (!isPathInside(root, target)) {
    return null;
  }
  return target;
}

/**
 * 净化用作文件/目录名的单段文本：
 * 替换非法字符、限长、兜底；并拒绝 "." / ".." 段（返回 fallback），
 * 防止 schemePath 数组元素携带相对路径段逃逸出根目录。
 * 注意：sep 在 win32 为反斜杠，跨平台判断需同时排除两种分隔符后的点段。
 */
export function sanitizeSegment(value, fallback = "未命名", maxLength = 80) {
  const cleaned = String(value ?? fallback)
    .trim()
    .replace(/[\\/:*?"<>|]+/g, "_")
    .slice(0, maxLength)
    .replace(/^\.+$/, fallback); // 恰好为 "." 或 ".."（含替换后残留）→ 兜底
  return cleaned || fallback;
}
