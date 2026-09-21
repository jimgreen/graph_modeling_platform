// 图元 Symbol 导出方案的后端持久化。
// 独立文件存储（<空间>/settings/symbol-export-schemes.json），与图元库 library.json 解耦：
// 方案只描述「导出勾选范围」，不参与 device-library 的迁移/归一化链路，避免污染其快照契约。
// 读侧容错：文件缺失/损坏 → 返回空方案集，不影响导出功能可用性；写侧严格：非法载荷抛 400。

import { readFile } from "node:fs/promises";
import { mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { atomicWriteFile } from "../shared/atomicWrite.mjs";

export const SYMBOL_EXPORT_SCHEMES_SCHEMA_VERSION = 1;
export const MAX_SYMBOL_EXPORT_SCHEMES = 200;
export const MAX_SYMBOL_EXPORT_SCHEME_KINDS = 5000;
export const MAX_SYMBOL_EXPORT_SCHEME_NAME_LENGTH = 60;

const FILTER_KEY_PATTERN = /^[a-z][a-z0-9-]{0,31}$/u;

export class SymbolExportSchemeValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = "SymbolExportSchemeValidationError";
    this.statusCode = 400;
  }
}

function normalizedText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function schemeIdFromName(name) {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fff]+/gu, "-")
    .replace(/^-+|-+$/gu, "");
  return `scheme-${slug || "unnamed"}`;
}

/**
 * 归一化一个方案：名称必填、id 缺失时按名称派生、kinds/filters 去重。
 * 返回 null 表示该条不可用（丢弃而不是抛错，保证历史文件可读）。
 */
function normalizeScheme(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return null;
  }
  const name = normalizedText(raw.name);
  if (!name) {
    return null;
  }
  const id = normalizedText(raw.id) || schemeIdFromName(name);
  if (!id) {
    return null;
  }
  const rawKinds = Array.isArray(raw.templateKinds) ? raw.templateKinds : [];
  const seenKinds = new Set();
  const templateKinds = [];
  for (const item of rawKinds) {
    const kind = normalizedText(item);
    if (!kind || seenKinds.has(kind) || templateKinds.length >= MAX_SYMBOL_EXPORT_SCHEME_KINDS) {
      continue;
    }
    seenKinds.add(kind);
    templateKinds.push(kind);
  }
  const rawFilters = Array.isArray(raw.filterKeys) ? raw.filterKeys : [];
  const seenFilters = new Set();
  const filterKeys = [];
  for (const item of rawFilters) {
    const key = normalizedText(item).toLowerCase();
    if (!FILTER_KEY_PATTERN.test(key) || seenFilters.has(key)) {
      continue;
    }
    seenFilters.add(key);
    filterKeys.push(key);
  }
  return {
    id,
    name: name.slice(0, MAX_SYMBOL_EXPORT_SCHEME_NAME_LENGTH),
    templateKinds,
    filterKeys,
    updatedAt: normalizedText(raw.updatedAt) || new Date().toISOString()
  };
}

/**
 * 归一化整份载荷。按 id 与名称双重去重（后者胜出，支持「另存为同名方案」覆盖语义）。
 */
export function normalizeSymbolExportSchemes(payload) {
  const source = payload && typeof payload === "object" && !Array.isArray(payload) ? payload : {};
  const rawSchemes = Array.isArray(source.schemes)
    ? source.schemes
    : Array.isArray(source.symbolExportSchemes)
      ? source.symbolExportSchemes
      : [];
  const byId = new Map();
  for (const raw of rawSchemes) {
    const scheme = normalizeScheme(raw);
    if (!scheme) {
      continue;
    }
    // 同名覆盖：先删掉同名的旧条目，再写入，保证名称唯一
    for (const [existingId, existing] of byId) {
      if (existing.name === scheme.name) {
        byId.delete(existingId);
      }
    }
    byId.set(scheme.id, scheme);
    if (byId.size >= MAX_SYMBOL_EXPORT_SCHEMES) {
      break;
    }
  }
  return {
    schemaVersion: SYMBOL_EXPORT_SCHEMES_SCHEMA_VERSION,
    schemes: Array.from(byId.values())
  };
}

/**
 * 写侧校验：载荷必须是对象，且显式超限时报错（读侧静默截断，写侧不能悄悄丢用户数据）。
 */
export function validateSymbolExportSchemesPayload(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new SymbolExportSchemeValidationError("方案载荷必须是对象。");
  }
  const rawSchemes = Array.isArray(payload.schemes) ? payload.schemes : null;
  if (!rawSchemes) {
    throw new SymbolExportSchemeValidationError("方案载荷缺少 schemes 数组。");
  }
  if (rawSchemes.length > MAX_SYMBOL_EXPORT_SCHEMES) {
    throw new SymbolExportSchemeValidationError(`方案数量超出上限（${MAX_SYMBOL_EXPORT_SCHEMES}）。`);
  }
  return normalizeSymbolExportSchemes(payload);
}

export async function readSymbolExportSchemes(options = {}) {
  const filePath = options.paths?.symbolExportSchemes;
  if (!filePath) {
    throw new Error("缺少 paths：读取导出方案必须由派发层注入空间路径。");
  }
  let parsed = null;
  try {
    parsed = JSON.parse(await readFile(filePath, "utf-8"));
  } catch {
    parsed = null;
  }
  const normalized = normalizeSymbolExportSchemes(parsed);
  return {
    exists: parsed !== null,
    ...normalized
  };
}

export async function writeSymbolExportSchemes(payload, options = {}) {
  const filePath = options.paths?.symbolExportSchemes;
  if (!filePath) {
    throw new Error("缺少 paths：保存导出方案必须由派发层注入空间路径。");
  }
  // 建目录必须由调用方注入（server.mjs 传 mkdirInSpace）：删除空间期间在飞的写请求
  // 若绕过退休空间判定，一个 mkdir(recursive) 就能把已删空间的 settings/ 建回来。
  const ensureDirectory = typeof options.ensureDirectory === "function"
    ? options.ensureDirectory
    : (target) => mkdir(target, { recursive: true });
  await ensureDirectory(dirname(filePath));
  const normalized = validateSymbolExportSchemesPayload(payload);
  await atomicWriteFile(filePath, JSON.stringify(normalized, null, 2), "utf-8");
  return normalized;
}
