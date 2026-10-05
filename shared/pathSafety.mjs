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
 * sanitizeSegment 的默认长度上限（单位：UTF-16 码元）。
 * 非正数 maxLength 也回落到它，故与默认参数共用同一个常量，避免两处漂移。
 */
const DEFAULT_MAX_LENGTH = 80;

/**
 * 净化用作文件/目录名的单段文本：
 * 替换非法字符、限长、兜底；并拒绝 "." / ".." 段（返回 fallback），
 * 防止 schemePath 数组元素携带相对路径段逃逸出根目录。
 * 注意：sep 在 win32 为反斜杠，跨平台判断需同时排除两种分隔符后的点段。
 *
 * ⚠ 已知缺口（有意不在本函数处理，调用方需自行保证）：
 *   控制字符（NUL、内嵌换行等）、落单代理段（含按码元截断劈开代理对）、
 *   Windows 设备保留名（CON / NUL / COM1 …）。契约由 pathSafety.test.mjs 钉住现状。
 */
export function sanitizeSegment(value, fallback = "未命名", maxLength = DEFAULT_MAX_LENGTH) {
  // maxLength 必须先被夹成「正数」再交给 slice：slice 的第二个参数按 ToIntegerOrInfinity
  // 转换，负数变成「从末尾倒数」——slice(0, -1) 取的是「除末字符外的全部」，于是 200 字符
  // 的段在 -1 下变成 199 字符、-5 下变成 195 字符，产出的是一段反向截断的垃圾名（且长度
  // 反而超过上限 80，形同不限长）。0 / NaN / null / 非数字字符串同样不可靠，统一回落到
  // 默认上限。正数（含 "10" 这类可比较的字符串）保持原样，行为不变。
  const limit = maxLength > 0 ? maxLength : DEFAULT_MAX_LENGTH;
  const cleaned = String(value ?? fallback)
    .trim()
    .replace(/[\\/:*?"<>|]+/g, "_")
    .slice(0, limit)
    .replace(/^\.+$/, fallback); // 恰好为 "." 或 ".."（含替换后残留）→ 兜底
  return cleaned || fallback;
}
