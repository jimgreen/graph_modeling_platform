// 图元 Symbol 导出方案的后端持久化。
// 独立文件存储（<空间>/settings/symbol-export-schemes.json），与图元库 library.json 解耦：
// 方案只描述「导出勾选范围」，不参与 device-library 的迁移/归一化链路，避免污染其快照契约。
// 读侧容错：文件缺失/损坏 → 返回空方案集，不影响导出功能可用性；写侧严格：非法载荷抛 400。

import { copyFile, readFile } from "node:fs/promises";
import { mkdir, readdir, unlink } from "node:fs/promises";
import { constants } from "node:fs";
import { basename, dirname, join } from "node:path";
import { atomicWriteFile } from "../shared/atomicWrite.mjs";

export const SYMBOL_EXPORT_SCHEMES_SCHEMA_VERSION = 1;
export const MAX_SYMBOL_EXPORT_SCHEMES = 200;
export const MAX_SYMBOL_EXPORT_SCHEME_KINDS = 5000;
export const MAX_SYMBOL_EXPORT_SCHEME_NAME_LENGTH = 60;
/** 每次写入前留下的原文件备份份数（只保留最近 N 份）。 */
export const MAX_SYMBOL_EXPORT_SCHEME_BACKUPS = 5;

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
  let readError = null;
  try {
    parsed = JSON.parse(await readFile(filePath, "utf-8"));
  } catch (error) {
    // 归 null 是既有降级，但**读不到**与**没配置过**不该同形：两者都回 exists:false。
    // 于是用户看着空列表改点别的再保存，PUT /symbol-export-schemes 就把一份空配置写回去，
    // 磁盘上的原配置被永久覆盖。
    // ENOENT 才是「没配置过」，静默即可；其余失败除了告警留痕，还要把原因带回前端
    // （readError），界面才能明确提示「读失败 ≠ 没有方案」，并在保存前拦一道。
    if (error?.code === "ENOENT") {
      parsed = null;
    } else {
      const code = error?.code ?? error?.name ?? "unknown";
      console.warn(
        `[存储] 读取导出方案失败（${code}），已按「未配置」返回：` +
        `界面会显示为空列表，此时保存会覆盖磁盘上的原配置。${filePath}`
      );
      readError = {
        code,
        message: error instanceof Error ? error.message : String(error ?? "")
      };
    }
  }
  const normalized = normalizeSymbolExportSchemes(parsed);
  return {
    exists: parsed !== null,
    ...(readError ? { readError } : {}),
    ...normalized
  };
}

/**
 * 写入前把磁盘上的原文件留一份带时间戳的备份，只保留最近 MAX_SYMBOL_EXPORT_SCHEME_BACKUPS 份。
 *
 * 为什么不靠原子写：atomicWriteFile 只保证「不会读到半份文件」，它挡不住
 * 「前端拿着一份空的/过期的列表整份 PUT 回来」—— 那是内容被覆盖，不是写入被打断。
 * 用户「之前保存的方案不见了」正是这一类，没有备份就永远捞不回来。
 */
async function backupSymbolExportSchemesFile(filePath) {
  const stamp = new Date().toISOString().replace(/[:.]/gu, "-");
  // 同一毫秒内的两次写入会撞名：COPYFILE_EXCL 让第二次拿到 EEXIST，
  // 再补一个序号后缀（仍保持「时间戳在前」的字典序）。
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const target = `${filePath}.${stamp}${attempt === 0 ? "" : `_${attempt}`}.bak`;
    try {
      await copyFile(filePath, target, constants.COPYFILE_EXCL);
      break;
    } catch (error) {
      if (error?.code === "ENOENT") {
        // 首次写入，没有原文件可备份。
        return;
      }
      if (error?.code === "EEXIST") {
        continue;
      }
      // 其余失败不该阻断保存，但要留痕。
      console.warn(`[存储] 导出方案写入前备份失败（${error?.code ?? error?.name ?? "unknown"}）：${filePath}`);
      return;
    }
  }
  try {
    const dir = dirname(filePath);
    const prefix = `${basename(filePath)}.`;
    const stale = (await readdir(dir))
      .filter((name) => name.startsWith(prefix) && name.endsWith(".bak"))
      .sort()
      .slice(0, -MAX_SYMBOL_EXPORT_SCHEME_BACKUPS);
    for (const name of stale) {
      await unlink(join(dir, name)).catch(() => {});
    }
  } catch (error) {
    console.warn(`[存储] 导出方案备份清理失败（${error?.code ?? error?.name ?? "unknown"}）：${filePath}`);
  }
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
  // 先备份再写：备份失败不阻断（上面的函数自己吞错并留痕），保存不能被备份拖死。
  await backupSymbolExportSchemesFile(filePath);
  await atomicWriteFile(filePath, JSON.stringify(normalized, null, 2), "utf-8");
  return normalized;
}
