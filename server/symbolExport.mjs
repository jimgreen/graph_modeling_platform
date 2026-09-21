// /webgrp/symbol-export 适配层：读磁盘图元库 → 后端合成「只含 <style> 与 <defs><symbol>」的 SVG。
//
// 分层与 svgExport.mjs / eFileExport.mjs 同构：纯合成逻辑落在 src/symbolExportSvg.ts
// （Node 原生 TS 可直载），本文件只做「读库 → 取模板 → 注入正文构建器 → 组装结果」。
//
// 正文构建器复用 src/export/device-template-icon.ts：
// 与前端右键「导出图元为 SVG」是同一份实现，故后端导出不会与画布渲染分叉。
//
// 图元库取磁盘态（与 renderSavedModelSvg 同口径）：导出是「落盘内容」的派生格式，
// 后端磁盘库才是权威；前端未保存的库编辑不应影响已保存工程的导出结果。

import { installDomShim } from "./domShim.mjs";

import AdmZip from "adm-zip";

installDomShim();

import { readDeviceLibraryConfig } from "./server.mjs";

const { buildSymbolExportSvg, symbolExportFileName, buildStandaloneSymbolExport, standaloneSymbolsZipFileName } =
  await import("../src/symbolExportSvg.ts");
const { buildDeviceTemplateIconSvg } = await import("../src/export/device-template-icon.ts");
const { buildEffectiveLibraryTemplates } = await import("../src/export/device-definition-shared.ts");

/** 单次导出的图元数上限：防超大请求体拖垮合成（图元库实际总量远低于此）。 */
export const MAX_SYMBOL_EXPORT_KINDS = 2000;

/** 请求体里的 kind 列表归一化：去空白、去重、保持入参顺序（顺序决定 symbol 输出顺序）。 */
export function normalizeSymbolExportKinds(value) {
  if (!Array.isArray(value)) {
    return [];
  }
  const seen = new Set();
  const kinds = [];
  for (const item of value) {
    const kind = String(item ?? "").trim();
    if (kind && !seen.has(kind)) {
      seen.add(kind);
      kinds.push(kind);
    }
  }
  return kinds;
}

/** 摘要文案：「a、b、c 等」——排障时要能看到具体是哪些 kind，故不省略首个之外的成员。 */
function summarizeKinds(kinds, limit = 5) {
  const shown = kinds.slice(0, limit).join("、");
  return kinds.length > limit ? `${shown} 等 ${kinds.length} 个` : shown;
}

/**
 * 两种导出（合并 / 独立）共用的前置链：校验 kinds → 读磁盘图元库 → 按请求顺序取模板。
 * 返回 `{ error }`（三种错误码之一）或 `{ selected, missingKinds }`——selected 已按请求顺序排列
 * （顺序决定产物里 symbol / use / 文件的输出顺序，与前端【已选图元】清单一致）。
 */
async function resolveSelectedTemplates({ kinds, paths }) {
  const requestedKinds = normalizeSymbolExportKinds(kinds);
  if (requestedKinds.length === 0) {
    return { error: { code: "invalid-request", message: "请至少选择一个要导出的图元。" } };
  }
  if (requestedKinds.length > MAX_SYMBOL_EXPORT_KINDS) {
    return {
      error: {
        code: "invalid-request",
        message: `单次导出最多支持 ${MAX_SYMBOL_EXPORT_KINDS} 个图元，当前 ${requestedKinds.length} 个。`
      }
    };
  }

  const library = await readDeviceLibraryConfig({ paths });
  const templates = buildEffectiveLibraryTemplates(
    library.customDeviceTemplates ?? [],
    library.deviceDefinitionOverrides ?? {}
  );
  const templateByKind = new Map(templates.map((template) => [template.kind, template]));
  const missingKinds = requestedKinds.filter((kind) => !templateByKind.has(kind));
  const selected = requestedKinds.map((kind) => templateByKind.get(kind)).filter(Boolean);

  if (selected.length === 0) {
    return {
      error: {
        code: "template-not-found",
        message: `所选图元在后端图元库中均不存在：${summarizeKinds(missingKinds)}。请先保存图元库后重试。`
      }
    };
  }
  return { selected, missingKinds };
}

/**
 * 合成导出 SVG。
 *
 * 返回 `{ svg, symbolCount, exportedKinds, skippedKinds, missingKinds, fileName }`，
 * 或 `{ error: { code, message } }`（与 renderSavedModelSvg 同形的错误契约）。
 *
 * `skippedKinds` 与 `missingKinds` 分开报：前者是「模板在库里但没能产出 symbol」（定义异常），
 * 后者是「库里根本没这个 kind」（前端库未保存 / 已删除），两者的排障方向完全不同。
 */
export async function renderSymbolExportSvg({ kinds, paths } = {}) {
  const resolved = await resolveSelectedTemplates({ kinds, paths });
  if (resolved.error) {
    return resolved;
  }
  const { selected, missingKinds } = resolved;

  const result = buildSymbolExportSvg(selected, buildDeviceTemplateIconSvg);
  if (result.symbolCount === 0) {
    return {
      error: {
        code: "empty-symbol",
        message: `所选图元未能生成任何 symbol${result.skippedKinds.length > 0 ? `（${summarizeKinds(result.skippedKinds)}）` : ""}，请检查图元定义后重试。`
      }
    };
  }

  return {
    svg: result.svg,
    symbolCount: result.symbolCount,
    exportedKinds: result.exportedKinds,
    skippedKinds: result.skippedKinds,
    missingKinds,
    fileName: symbolExportFileName()
  };
}

/**
 * 合成「独立图元 SVG」压缩包：每个图元一份自包含 SVG（非 symbol 形式），打包为 ZIP。
 *
 * 与 renderSymbolExportSvg 共用同一份「磁盘库 → 模板」解析与同一份单模板正文构建器，
 * 区别只在最终产物形态：
 *   - renderSymbolExportSvg → 一份集合件（`<style>` + `<defs>` 里一排 `<symbol>`）；
 *   - 本函数 → 每图元一份把 symbol 正文**内联展开**的独立 SVG，装进 ZIP。
 *
 * 多状态图元（断路器分/合）会产出多份文件 —— 一份 SVG 只能呈现一个状态。
 *
 * ZIP 由 adm-zip 生成（仓库既有的方案归档导出用的是同一个依赖，不新引包）。
 * 解压时的路径穿越风险不存在：条目名全部来自本函数组装的 `${stem}.svg`，
 * 而 stem 经 safeSymbolFileStem 过滤，不含 `/`、`\`、`..`。
 */
export async function renderStandaloneSymbolExportZip({ kinds, paths } = {}) {
  const resolved = await resolveSelectedTemplates({ kinds, paths });
  if (resolved.error) {
    return resolved;
  }
  const { selected, missingKinds } = resolved;

  const result = buildStandaloneSymbolExport(selected, buildDeviceTemplateIconSvg);
  if (result.files.length === 0) {
    return {
      error: {
        code: "empty-symbol",
        message: `所选图元未能生成任何独立 SVG${result.skippedKinds.length > 0 ? `（${summarizeKinds(result.skippedKinds)}）` : ""}，请检查图元定义后重试。`
      }
    };
  }

  // 单图元时不套 ZIP：直接回单个 .svg，用户拿到就是图元定义本身（无需解压）。
  if (result.files.length === 1) {
    const only = result.files[0];
    return {
      kind: "svg",
      svg: only.svg,
      fileCount: 1,
      exportedKinds: result.exportedKinds,
      skippedKinds: result.skippedKinds,
      missingKinds,
      fileName: only.fileName
    };
  }

  const zip = new AdmZip();
  for (const file of result.files) {
    zip.addFile(file.fileName, Buffer.from(file.svg, "utf-8"));
  }
  return {
    kind: "zip",
    buffer: zip.toBuffer(),
    fileCount: result.files.length,
    exportedKinds: result.exportedKinds,
    skippedKinds: result.skippedKinds,
    missingKinds,
    fileName: standaloneSymbolsZipFileName()
  };
}
