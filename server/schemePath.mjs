// schemePath 编解码工具：方案路径用 JSON 数组表示（如 ["方案A","子方案"]），
// URL 传输时 encodeURIComponent(JSON.stringify(...))。query 参数 schemePath。
import { sanitizeSegment } from "../shared/pathSafety.mjs";

// 解码 schemePath query 参数 → 字符串数组。非法返 null。
export function parseSchemePathParam(value) {
  if (!value) {
    return [];
  }
  try {
    const parsed = JSON.parse(decodeURIComponent(value));
    if (!Array.isArray(parsed)) {
      return null;
    }
    const parts = parsed.map((part) => safeFilePart(part, "方案")).filter(Boolean);
    return parts;
  } catch {
    return null;
  }
}

// 编码 schemePath 数组 → URL query 值
export function encodeSchemePath(parts) {
  return encodeURIComponent(JSON.stringify(parts));
}

const maxFilePartLength = 80;

function safeFilePart(name, fallback = "未命名") {
  // sanitizeSegment 额外拒绝 "." / ".." 段，防止路径数组携带相对段逃逸（审查 B-P0-1）
  return sanitizeSegment(name, fallback, maxFilePartLength);
}

// 校验 schemePath 非空（用于需要方案路径的接口）
export function requireSchemePath(parts) {
  return Array.isArray(parts) && parts.length > 0;
}
