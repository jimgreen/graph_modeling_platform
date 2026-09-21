// 【导出图元 Symbol】的 App 作用域工厂：
// - 导出落盘（单模板正文复用 buildDeviceTemplateIconSvg，与右键「导出图元为 SVG」同源）
// - 方案的后端读写（<空间>/settings/symbol-export-schemes.json）
//
// 与其它工厂同约定：入参是 __appScope（Object.assign 注册的共享作用域），返回可直接注册的闭包。

import type { DeviceTemplate } from "../model";
import {
  normalizeSymbolExportSchemes,
  removeSymbolExportScheme,
  symbolExportSchemeIdFromName,
  upsertSymbolExportScheme,
  type SymbolExportFilterKey,
  type SymbolExportScheme
} from "../symbolExportSvg";
import {
  fetchBackendSymbolExportSchemes,
  requestBackendStandaloneSymbolExport,
  requestBackendSymbolExport,
  saveBackendSymbolExportSchemes,
  type BackendStandaloneSymbolExportResult,
  type BackendSymbolExportResult
} from "./appPersistenceLibraryExport";

type SymbolExportSchemeDraft = {
  name: string;
  templateKinds: string[];
  filterKeys: SymbolExportFilterKey[];
};

function summarizeKindList(kinds: readonly string[], limit = 5) {
  const shown = kinds.slice(0, limit).join("、");
  return kinds.length > limit ? `${shown} 等 ${kinds.length} 个` : shown;
}

/** 已选模板 → 去重后的 kind 列表（保序、剔除空白）。 */
function collectExportKinds(templates: DeviceTemplate[] | null | undefined): string[] {
  return Array.from(new Set(
    (Array.isArray(templates) ? templates : [])
      .map((template) => String(template?.kind ?? "").trim())
      .filter(Boolean)
  ));
}

/** 两种「没导出来」的备注：定义异常（跳过）与库里没有（缺失），拼接为括号尾注；无则空串。 */
function buildExportResultNotes(exported: { skippedKinds: string[]; missingKinds: string[] }): string {
  const notes: string[] = [];
  if (exported.skippedKinds.length > 0) {
    notes.push(`跳过 ${summarizeKindList(exported.skippedKinds)}`);
  }
  if (exported.missingKinds.length > 0) {
    notes.push(`后端图元库中不存在 ${summarizeKindList(exported.missingKinds)}（请先保存图元库）`);
  }
  return notes.length > 0 ? `（${notes.join("；")}）` : "";
}

/**
 * 导出选中的图元为 SVG（只含 <style> 与 <defs><symbol>）。
 *
 * 合成走后端 POST /symbol-export：服务端跑的是与画布同源的那一份单模板正文实现，
 * 前端只负责「选哪些」与「把返回的 SVG 落盘」。
 *
 * 不做本地兜底合成 —— 兜底会让前后端产出悄悄分叉，比直接报错更难排查。
 */
export function createExportComponentSymbols(__appScope: Record<string, any>) {
  return async (templates: DeviceTemplate[] | null | undefined) => {
    const {
      downloadBlob,
      saveTextFile,
      setSymbolExportSchemesStatus = () => undefined,
      showGlobalMessage = () => undefined,
      writeOperationLog = () => undefined
    } = __appScope;
    const kinds = collectExportKinds(templates);
    if (kinds.length === 0) {
      showGlobalMessage("请至少选择一个要导出的图元。");
      return false;
    }
    let result: BackendSymbolExportResult;
    try {
      result = await requestBackendSymbolExport(kinds);
    } catch (error) {
      const message = error instanceof Error ? error.message : "后端导出图元 Symbol 失败。";
      setSymbolExportSchemesStatus(message);
      writeOperationLog(`导出图元 Symbol 失败：${message}`);
      showGlobalMessage(message, "error");
      return false;
    }
    const saved = typeof saveTextFile === "function"
      ? await saveTextFile({
          filename: result.fileName,
          text: result.svg,
          mime: "image/svg+xml",
          description: "SVG 图元 Symbol 文件",
          extensions: [".svg"],
          pickerId: "component-symbol-export",
          startIn: "downloads",
          preferNativeDialog: true
        })
      : (() => {
          downloadBlob?.(result.fileName, new Blob([result.svg], { type: "image/svg+xml;charset=utf-8" }));
          return true;
        })();
    if (!saved) {
      return false;
    }
    // 两种「没导出来」要分开说：定义异常（服务端有模板但产不出 symbol）与
    // 服务端库里根本没这个 kind（前端选了未保存的图元）——用户的下一步动作不同。
    const noteText = buildExportResultNotes(result);
    const message = `已导出 ${result.exportedKinds.length} 个图元 / ${result.symbolCount} 个 symbol：${result.fileName}${noteText}`;
    setSymbolExportSchemesStatus(message);
    writeOperationLog(`导出图元 Symbol：${result.fileName}（${result.symbolCount} 个 symbol）${noteText}`);
    showGlobalMessage(message, noteText ? "warning" : "success");
    return true;
  };
}

/**
 * 独立导出：每个图元一个自包含 SVG（非 symbol 形式），多图元打成一个 zip。
 *
 * 与合成导出的差别有二：
 * - 单文件内部没有 <symbol>/<defs>/<use> 包装，就是图元定义本身；
 * - 多状态图元**一状态一文件**（合成导出是把每个状态各导一个 symbol 塞进同一份 SVG），
 *   因为独立导出没有 <use> 可以承载状态，塞进同一文件只能靠多个根节点 —— 那不是一个合法 SVG。
 *
 * 落盘走 saveBlobFile（二进制），不能走 saveTextFile —— 后者只接受文本。
 */
export function createExportComponentSymbolsStandalone(__appScope: Record<string, any>) {
  return async (templates: DeviceTemplate[] | null | undefined) => {
    const {
      downloadBlob,
      saveBlobFile,
      setSymbolExportSchemesStatus = () => undefined,
      showGlobalMessage = () => undefined,
      writeOperationLog = () => undefined
    } = __appScope;
    const kinds = collectExportKinds(templates);
    if (kinds.length === 0) {
      showGlobalMessage("请至少选择一个要导出的图元。");
      return false;
    }
    let result: BackendStandaloneSymbolExportResult;
    try {
      result = await requestBackendStandaloneSymbolExport(kinds);
    } catch (error) {
      const message = error instanceof Error ? error.message : "后端独立导出图元 SVG 失败。";
      setSymbolExportSchemesStatus(message);
      writeOperationLog(`独立导出图元 SVG 失败：${message}`);
      showGlobalMessage(message, "error");
      return false;
    }
    const isZip = result.kind === "zip";
    const saved = typeof saveBlobFile === "function"
      ? await saveBlobFile({
          filename: result.fileName,
          blob: result.blob,
          mime: isZip ? "application/zip" : "image/svg+xml",
          description: isZip ? "ZIP 压缩包（独立图元 SVG）" : "SVG 图元文件",
          extensions: isZip ? [".zip"] : [".svg"],
          pickerId: "component-symbol-export-standalone",
          startIn: "downloads"
        })
      : (() => {
          downloadBlob?.(result.fileName, result.blob);
          return true;
        })();
    if (!saved) {
      return false;
    }
    const noteText = buildExportResultNotes(result);
    // 文件数可能多于图元数（多状态图元一状态一文件），故两个数都报出来，避免用户以为导重了。
    const message = isZip
      ? `已独立导出 ${result.exportedKinds.length} 个图元 / ${result.fileCount} 个 SVG 文件：${result.fileName}${noteText}`
      : `已独立导出图元 SVG：${result.fileName}${noteText}`;
    setSymbolExportSchemesStatus(message);
    writeOperationLog(`独立导出图元 SVG：${result.fileName}（${result.fileCount} 个文件）${noteText}`);
    showGlobalMessage(message, noteText ? "warning" : "success");
    return true;
  };
}

/** 读取后端方案（弹窗每次打开时调用）。 */
export function createLoadSymbolExportSchemes(__appScope: Record<string, any>) {  return async () => {
    const {
      setSymbolExportSchemes = () => undefined,
      setSymbolExportSchemesStatus = () => undefined,
      writeOperationLog = () => undefined
    } = __appScope;
    setSymbolExportSchemesStatus("正在读取后端方案…");
    try {
      const payload = await fetchBackendSymbolExportSchemes();
      setSymbolExportSchemes(payload.schemes);
      setSymbolExportSchemesStatus(
        payload.schemes.length > 0 ? `已读取 ${payload.schemes.length} 个后端方案。` : "后端暂无已保存方案。"
      );
      return payload.schemes;
    } catch (error) {
      const message = error instanceof Error ? error.message : "读取后台导出方案失败。";
      setSymbolExportSchemesStatus(message);
      writeOperationLog(`读取导出方案失败：${message}`);
      return [];
    }
  };
}

/** 保存方案：先落本地状态（界面即时可用），后端失败时明确提示。 */
export function createSaveSymbolExportScheme(__appScope: Record<string, any>) {
  return async (draft: SymbolExportSchemeDraft) => {
    const {
      symbolExportSchemes = [],
      setSymbolExportSchemes = () => undefined,
      setSymbolExportSchemesStatus = () => undefined,
      showGlobalMessage = () => undefined,
      writeOperationLog = () => undefined
    } = __appScope;
    const name = String(draft?.name ?? "").trim();
    if (!name) {
      showGlobalMessage("请先填写方案名称。");
      return false;
    }
    const existing = symbolExportSchemes.find((scheme: SymbolExportScheme) => scheme.name === name);
    // 新方案的 id 按名称派生：与后端 normalizeSymbolExportSchemes 的缺省派生同口径，
    // 前后端 id 一致，「当前方案」高亮重新打开后才不会丢。
    const nextSchemes = upsertSymbolExportScheme(symbolExportSchemes, {
      id: existing?.id ?? symbolExportSchemeIdFromName(name),
      name,
      templateKinds: Array.isArray(draft.templateKinds) ? draft.templateKinds : [],
      filterKeys: Array.isArray(draft.filterKeys) ? draft.filterKeys : [],
      updatedAt: new Date().toISOString()
    });
    setSymbolExportSchemes(nextSchemes);
    try {
      await saveBackendSymbolExportSchemes(normalizeSymbolExportSchemes({ schemes: nextSchemes }));
    } catch (error) {
      const message = error instanceof Error ? error.message : "保存导出方案到后台失败。";
      setSymbolExportSchemesStatus(`方案「${name}」已在本地生效，但${message}`);
      writeOperationLog(`导出方案保存到后台失败：${name}`);
      return false;
    }
    const message = `方案「${name}」已保存到后端（${draft.templateKinds.length} 个图元）。`;
    setSymbolExportSchemesStatus(message);
    writeOperationLog(message);
    return true;
  };
}

export function createDeleteSymbolExportScheme(__appScope: Record<string, any>) {
  return async (schemeId: string) => {
    const {
      symbolExportSchemes = [],
      setSymbolExportSchemes = () => undefined,
      setSymbolExportSchemesStatus = () => undefined,
      writeOperationLog = () => undefined
    } = __appScope;
    const target = symbolExportSchemes.find((scheme: SymbolExportScheme) => scheme.id === schemeId);
    if (!target) {
      return false;
    }
    const nextSchemes = removeSymbolExportScheme(symbolExportSchemes, schemeId);
    setSymbolExportSchemes(nextSchemes);
    try {
      await saveBackendSymbolExportSchemes(normalizeSymbolExportSchemes({ schemes: nextSchemes }));
    } catch (error) {
      const message = error instanceof Error ? error.message : "删除导出方案失败。";
      setSymbolExportSchemesStatus(`方案「${target.name}」已在本地删除，但${message}`);
      return false;
    }
    setSymbolExportSchemesStatus(`方案「${target.name}」已删除。`);
    writeOperationLog(`删除导出方案：${target.name}`);
    return true;
  };
}
