/**
 * 模型与方案导入导出（SVG / JSON / E 文件 / E 设备定义 / DOT / 方案 ZIP）及重名冲突处理工厂模块。
 * 从 appDeviceDefinitionFactories.tsx 拆分，保持严格 TypeScript 类型检查。
 */

import type { ExportImportScope } from "./appScopeTypes";
import type { ChangeEvent } from "react";
import { buildEFileExportOptionsFromLibrary, applyEDeviceDefinitionSectionsToLibraryState } from "./appDeviceDefinitionEInterface";
import {
  buildEDeviceDefinitionFileFromInterfaceDefinitions,
  inferESection,
  parseEDeviceDefinitionFile,
  type ProjectFile,
  type SavedProjectRecord,
  type SavedSchemeRecord,
} from "../model";
import { apiPath } from "../config";
import { backendExportSchemePath } from "../backendExportPath";
import { isFrontendExportMode, sendFrontendExportArtifact, sendFrontendExportArtifacts } from "../frontendExport";
import { backendErrorMessage, type BackendSchemeArchiveImportResponse, type ImageAsset } from "./appCoreCanvasUtilities";
import { safeFilePart as sharedSafeFilePart } from "./appInlineUtilityFunctions";
import { decodeGbk } from "../encoding/gbk";
import { E_DEVICE_TEMPLATE_ALLOWED_MODEL_TYPES } from "../eDeviceTemplateTypePolicy";
import type { SavedExportFile, TextFileEncoding } from "../fileIO";
import { schemePathQueryParam } from "./appPersistenceLibraryExport";
import { flushActiveBufferedInput } from "../components/InputComponents";

export { createSvgExportReferencedImageHrefById } from "../export/svg-images.ts";

// 模块级变量，用于跨渲染周期传递跳过保存检查的标志
let skipSaveCheckFlag = false;

export function setSkipSaveCheck(value: boolean) {
  skipSaveCheckFlag = value;
}

export function getSkipSaveCheck(): boolean {
  return skipSaveCheckFlag;
}

export function createEnsureSavedBeforeExport(__appScope: ExportImportScope) {
  return () => {
    flushActiveBufferedInput();
    const currentScope = (__appScope.__appScopeRef?.current as ExportImportScope | undefined) ?? __appScope;
    // 使用模块级变量与最新帧引用，避免未失焦草稿漏检或闭包捕获旧值
    if (getSkipSaveCheck() || currentScope.canExportCurrentModel) {
      return true;
    }
    showGlobalMessage("当前模型存在未保存修改，请先保存后再导出文件。");
    return false;
  };
}

export function createLoadSvgImageExportPathById(__appScope: ExportImportScope) {
  return async () => {
  const { fetchAllBackendImages, fetchBackendImageDataUrl, imageAssetList, imageAssets, imageExportPathByIdFromAssets, isImageDataUrl, svgExportReferencedImageHrefById } = __appScope;
    const referencedHrefById = svgExportReferencedImageHrefById();
    if (referencedHrefById.size === 0) {
      return {};
    }
    let assets = imageAssetList;
    let exportHrefById = imageExportPathByIdFromAssets(assets, imageAssets);
    const hasAllReferencedImages = () => (Array.from(referencedHrefById.keys()) as string[]).every((id) => Boolean(exportHrefById[id]));
    if (hasAllReferencedImages()) {
      return exportHrefById;
    }
    try {
      const backendAssets = await fetchAllBackendImages();
      const mergedById = new Map<string, ImageAsset>();
      for (const asset of assets) {
        mergedById.set(asset.id, asset);
      }
      for (const asset of backendAssets) {
        const existing = mergedById.get(asset.id);
        mergedById.set(asset.id, existing ? { ...existing, ...asset } : asset);
      }
      assets = Array.from(mergedById.values());
      exportHrefById = imageExportPathByIdFromAssets(assets, imageAssets);
    } catch {
      // 后端图片清单不可用时，保持现有导出逻辑，不影响本地图形导出。
    }
    const assetById = new Map(assets.map((asset: any) => [asset.id, asset]));
    await Promise.all((Array.from(referencedHrefById.entries()) as Array<[string, string]>).map(async ([id, href]) => {
      if (exportHrefById[id]) {
        return;
      }
      const asset = { ...(assetById.get(id) ?? { id, name: id, url: href }) };
      asset.url = asset.url || href;
      try {
        const dataUrl = await fetchBackendImageDataUrl(asset);
        if (isImageDataUrl(dataUrl)) {
          exportHrefById[id] = dataUrl;
        }
      } catch {
        // 单张图片无法读取时，保留原始 href，避免阻断 SVG 导出。
      }
    }));
    return exportHrefById;
  };
}

export function createExportSvg(__appScope: ExportImportScope) {
  return async (textEncoding: TextFileEncoding = "utf-8") => {
  const {
    ensureSavedBeforeExport,
    isPickerAbort,
    safeFilePart,
    showGlobalMessage = globalThis.showGlobalMessage ?? (() => undefined),
    writeTextFileToDirectory,
    writeOperationLog
  } = __appScope;
  const latestScope = () => (__appScope.__appScopeRef?.current as ExportImportScope | undefined) ?? __appScope;
    let exportStartedAt = performance.now();
    const exportElapsedText = () => `${((performance.now() - exportStartedAt) / 1000).toFixed(2)} 秒`;
    if (!ensureSavedBeforeExport()) {
      return;
    }

    if (isFrontendExportMode(__appScope)) {
      try {
        await sendFrontendExportArtifacts(__appScope, undefined, ["e", "svg"]);
        showGlobalMessage("前端模式已发送 E 文件和 SVG。");
      } catch (error) {
        showGlobalMessage(error instanceof Error ? error.message : "前端模式导出发送失败。");
      }
      return;
    }

    const directoryPicker = (window as Window & {
      showDirectoryPicker?: (options?: { id?: string; mode?: "read" | "readwrite" }) => Promise<any>;
    }).showDirectoryPicker;
    if (typeof directoryPicker !== "function") {
      showGlobalMessage(`导出失败：当前浏览器不支持选择导出目录，请使用最新版 Chrome 或 Edge。\n总耗时：${exportElapsedText()}`);
      return;
    }
    let directoryHandle: any;
    try {
      directoryHandle = await directoryPicker.call(window, {
        id: "model-bundle-export",
        mode: "readwrite"
      });
      exportStartedAt = performance.now();
    } catch (error) {
      if (typeof isPickerAbort === "function" && isPickerAbort(error)) {
        return;
      }
      const message = error instanceof Error ? error.message : String(error ?? "未知错误");
      showGlobalMessage(`导出失败：无法打开目标目录。\n${message}\n总耗时：${exportElapsedText()}`);
      return;
    }

    try {
      // 三份产物全部走后端：先并行发起请求
      const svgTextPromise = Promise.resolve()
        .then(() => fetchBackendModelSvgText(__appScope, textEncoding, "SVG 生成失败。"))
        .then(
          (value: string) => ({ ok: true as const, value }),
          (error: unknown) => ({ ok: false as const, error })
        );
      // JSON 与 SVG 同走后端：与单文件导出 createExportJsonFile 同源
      const jsonTextPromise = Promise.resolve()
        .then(() => fetchBackendModelJsonText(__appScope, "JSON 生成失败。"))
        .then(
          (value: string) => ({ ok: true as const, value }),
          (error: unknown) => ({ ok: false as const, error })
        );
      const baseFilename = safeFilePart(latestScope().projectName);
      type PendingExportFile = {
        label: string;
        filename: string;
        mime: string;
        operationLog: string;
        promise: Promise<void>;
      };
      const exportFiles: PendingExportFile[] = [];
      const startFileWrite = (file: Omit<PendingExportFile, "promise">, text: string) => {
        exportFiles.push({
          ...file,
          promise: Promise.resolve().then(() => writeTextFileToDirectory(
            directoryHandle,
            file.filename,
            text,
            file.mime,
            textEncoding
          ))
        });
      };
      // E 与 JSON/SVG 同走后端（与单文件导出 createExportEFile 同源）：三份产物同口径，
      // 前端不再本地 buildEFileExport —— 本地生成用的是界面态 + PARAM_LABELS，与后端 ?template= 口径不同。
      let eGenerationError: unknown;
      let eFileWarningDetails: string[] = [];
      const eFileResult = await Promise.resolve()
        .then(() => fetchBackendModelEFile(__appScope, textEncoding, "E 文件生成失败。"))
        .then(
          (value) => ({ ok: true as const, value }),
          (error: unknown) => ({ ok: false as const, error })
        );
      if (eFileResult.ok) {
        eFileWarningDetails = eFileResult.value.warningDetails;
        startFileWrite({
          label: "E",
          filename: `${baseFilename}.e`,
          mime: "text/plain",
          operationLog: `导出模型文件：${baseFilename}.e`
        }, eFileResult.value.text);
      } else {
        eGenerationError = eFileResult.error;
      }
      let jsonGenerationError: unknown;
      const jsonTextResult = await jsonTextPromise;
      if (jsonTextResult.ok) {
        startFileWrite({
          label: "JSON",
          filename: `${baseFilename}.json`,
          mime: "application/json",
          operationLog: `导出模型文件：${baseFilename}.json`
        }, jsonTextResult.value);
      } else {
        jsonGenerationError = jsonTextResult.error;
      }
      let svgGenerationError: unknown;
      const svgTextResult = await svgTextPromise;
      if (svgTextResult.ok) {
        startFileWrite({
          label: "SVG",
          filename: `${baseFilename}.svg`,
          mime: "image/svg+xml",
          operationLog: `导出图形文件：${baseFilename}.svg`
        }, svgTextResult.value);
      } else {
        svgGenerationError = svgTextResult.error;
      }
      const results = await Promise.allSettled(
        exportFiles.map((file) => file.promise)
      );
      const failures: string[] = [];
      let successCount = 0;
      results.forEach((result, index) => {
        const file = exportFiles[index];
        if (!file) {
          return;
        }
        if (result.status === "fulfilled") {
          successCount += 1;
          writeOperationLog(file.operationLog);
          return;
        }
        const reason = result.reason instanceof Error
          ? result.reason.message
          : String(result.reason ?? "未知错误");
        failures.push(`${file.filename}：${reason}`);
      });
      if (eGenerationError !== undefined) {
        const reason = eGenerationError instanceof Error
          ? eGenerationError.message
          : String(eGenerationError ?? "未知错误");
        failures.push(`${baseFilename}.e：${reason}`);
      }
      if (jsonGenerationError !== undefined) {
        const reason = jsonGenerationError instanceof Error
          ? jsonGenerationError.message
          : String(jsonGenerationError ?? "未知错误");
        failures.push(`${baseFilename}.json：${reason}`);
      }
      if (svgGenerationError !== undefined) {
        const reason = svgGenerationError instanceof Error
          ? svgGenerationError.message
          : String(svgGenerationError ?? "未知错误");
        failures.push(`${baseFilename}.svg：${reason}`);
      }
      const warningLines = eFileWarningDetails;
      const directoryName = String(directoryHandle?.name ?? "").trim() || "已选择目录";
      if (failures.length === 0 && successCount === 3) {
        showGlobalMessage([
          "E、JSON 和 SVG 文件导出成功。",
          `目录：${directoryName}`,
          `字符编码：${textFileEncodingLabel(textEncoding)}`,
          ...exportFiles.map((file) => `${file.label}：${file.filename}`),
          `总耗时：${exportElapsedText()}`,
          ...warningLines
        ].join("\n"));
        return;
      }
      showGlobalMessage([
        "部分文件导出失败。",
        `目录：${directoryName}`,
        `字符编码：${textFileEncodingLabel(textEncoding)}`,
        `成功：${successCount} / 3`,
        "失败文件：",
        ...failures.map((failure) => `- ${failure}`),
        `总耗时：${exportElapsedText()}`,
        ...warningLines
      ].join("\n"));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error ?? "未知错误");
      showGlobalMessage(`导出失败：${message}\n总耗时：${exportElapsedText()}`);
    }
  };
}

// 后端 x-e-file-warnings 头带回「未导出设备」清单（百分比编码 JSON，生成器单源产出）。
// 头缺失/损坏/内容非法一律按无告警处理，不抛出。
function eFileWarningDetailsFromResponse(response: Response): string[] {
  const raw = response.headers?.get?.("x-e-file-warnings");
  if (!raw) {
    return [];
  }
  let payload: any;
  try {
    payload = JSON.parse(decodeURIComponent(raw));
  } catch {
    return [];
  }
  const items = Array.isArray(payload?.items) ? payload.items : [];
  const total = Number.isFinite(Number(payload?.total)) ? Number(payload.total) : items.length;
  // 后端可能因响应头字节封顶只回总数（不带 items）：仍给出首行与「未列出」提示
  if (total <= 0) {
    return [];
  }
  return [
    `有 ${total} 个图上设备未导出到 E 文件：`,
    ...items.map((item: any) => `- ${item?.nodeName ?? ""}（${item?.kind ?? ""}）：${item?.reason ?? ""}`),
    total > items.length ? `... 还有 ${total - items.length} 个设备未列出。` : ""
  ].filter(Boolean);
}

export function showStandaloneExportCompletion(
  __appScope: ExportImportScope,
  title: string,
  message: string,
  details: string[] = [],
  file: SavedExportFile | null = null
) {
  const { setExportCompletionDialog } = __appScope;
  if (typeof setExportCompletionDialog === "function") {
    setExportCompletionDialog({
      title,
      message,
      ...(details.length > 0 ? { details } : {}),
      // 无 file（浏览器下载兜底 / 非本机部署）时弹框里不出现「查看」，不假装能给
      ...(file ? { file } : {})
    });
    return;
  }
  showGlobalMessage([message, ...details].join("\n"));
}

// 当前 E 接口处于「预定义模板只读态」时，导出必须带上模板名：
// 后端 ?template= 与前端「加载预定义模板」共用同一实现（空基线重建），产物逐字节一致。
// 不带该参数时后端只能读磁盘库，界面态与库态一旦漂移（落盘失败/多端并发/手动还原），
// 导出会静默产出缺列的 E 文件（实测：界面已加载国网模板，导出却缺 runstat 列）。
// 文件模板/自定义态（可编辑）不传：此时以后端库态为准，避免丢弃用户改动。
function eFileTemplateQueryName(__appScope: ExportImportScope): string {
  const { eDeviceInterfaceLoadedTemplateName, eDeviceInterfaceReadonlyMode } = __appScope;
  if (!eDeviceInterfaceReadonlyMode) {
    return "";
  }
  const name = String(eDeviceInterfaceLoadedTemplateName ?? "");
  return Object.prototype.hasOwnProperty.call(E_DEVICE_TEMPLATE_ALLOWED_MODEL_TYPES, name) ? name : "";
}

// E 文件生成已移至后端 /v1/schemes/model/export?format=e-file（单文件导出与目录导出共用本函数）。
async function fetchBackendModelEFile(__appScope: ExportImportScope, textEncoding: TextFileEncoding, failureMessage: string) {
  const { projectName } = __appScope;
  const path = backendExportSchemePath(__appScope);
  const templateName = eFileTemplateQueryName(__appScope);
  const url = apiPath(
    `/v1/schemes/model/export?format=e-file&${schemePathQueryParam("schemePath", path)}`
    + `&name=${encodeURIComponent(String(projectName ?? ""))}`
    + `&encoding=${encodeURIComponent(textEncoding)}`
    + (templateName ? `&template=${encodeURIComponent(templateName)}` : "")
  );
  const response = await fetch(url, { method: "GET" });
  if (!response.ok) {
    throw new Error(await backendErrorMessage(response, failureMessage));
  }
  const warningDetails = eFileWarningDetailsFromResponse(response);
  // Body.text() 恒按 UTF-8 解码、不认 content-type charset，故按 arraybuffer 收字节后按请求编码解码
  const bytes = new Uint8Array(await response.arrayBuffer());
  return {
    text: textEncoding === "gbk" ? decodeGbk(bytes) : new TextDecoder("utf-8").decode(bytes),
    warningDetails
  };
}

// SVG 生成已移至后端 /v1/schemes/model/export?format=svg；
// 透传当前绘图区的配色模式（energy/voltage）及设备标识/量测全局显隐开关，保证导出结果所见即所得。
// XML 声明由后端产出，前端不再前置，保证响应体与落盘文件逐字节一致。
async function fetchBackendModelSvgText(__appScope: ExportImportScope, textEncoding: TextFileEncoding, failureMessage: string) {
  const { projectName, colorDisplayMode, deviceLabelsVisible, deviceMeasurementsVisible } = __appScope;
  const path = backendExportSchemePath(__appScope);
  const colorMode = colorDisplayMode === "energy" || colorDisplayMode === "voltage"
    ? colorDisplayMode
    : "voltage";
  const url = apiPath(
    `/v1/schemes/model/export?format=svg&${schemePathQueryParam("schemePath", path)}`
    + `&name=${encodeURIComponent(String(projectName ?? ""))}`
    + `&colorMode=${encodeURIComponent(colorMode)}`
    + (deviceLabelsVisible === false ? "&labelsVisible=0" : "")
    + (deviceMeasurementsVisible === false ? "&measurementsVisible=0" : "")
    + `&encoding=${encodeURIComponent(textEncoding)}`
  );
  const response = await fetch(url, { method: "GET" });
  if (!response.ok) {
    throw new Error(await backendErrorMessage(response, failureMessage));
  }
  // Body.text() 恒按 UTF-8 解码、不认 content-type charset，故按 arraybuffer 收字节后按请求编码解码（同 createExportEFile）
  const bytes = new Uint8Array(await response.arrayBuffer());
  return textEncoding === "gbk" ? decodeGbk(bytes) : new TextDecoder("utf-8").decode(bytes);
}

// JSON 生成已移至后端 /v1/schemes/model/export?format=json：与 E/SVG/CIM 同口径（先保存再请求），
// 输出为存档态压缩 JSON（不再本地序列化浏览器实时态）。
async function fetchBackendModelJsonText(__appScope: ExportImportScope, failureMessage: string) {
  const { projectName } = __appScope;
  const path = backendExportSchemePath(__appScope);
  const url = apiPath(
    `/v1/schemes/model/export?format=json&${schemePathQueryParam("schemePath", path)}`
    + `&name=${encodeURIComponent(String(projectName ?? ""))}`
  );
  const response = await fetch(url, { method: "GET" });
  if (!response.ok) {
    throw new Error(await backendErrorMessage(response, failureMessage));
  }
  const payload = await response.json();
  return JSON.stringify(payload?.data?.project ?? {});
}

export function createExportSvgFile(__appScope: ExportImportScope) {
  return async (textEncoding: TextFileEncoding = "utf-8") => {
    const {
      ensureSavedBeforeExport,
      safeFilePart,
      saveLazyTextFile,
      saveTextFile,
      showGlobalMessage = globalThis.showGlobalMessage ?? (() => undefined),
      writeOperationLog
    } = __appScope;
    const latestScope = () => (__appScope.__appScopeRef?.current as ExportImportScope | undefined) ?? __appScope;
    let exportStartedAt = performance.now();
    const markSaveTargetReady = () => {
      exportStartedAt = performance.now();
    };
    if (!ensureSavedBeforeExport()) {
      return;
    }
    if (isFrontendExportMode(latestScope())) {
      try {
        await sendFrontendExportArtifact(latestScope(), "svg");
        showGlobalMessage("前端模式已发送 SVG。");
      } catch (error) {
        showGlobalMessage(error instanceof Error ? error.message : "前端模式 SVG 发送失败。");
      }
      return;
    }
    const baseFilename = safeFilePart(latestScope().projectName);
    let svgTextPromise: Promise<string> | undefined;
    const loadSvgText = () => {
      // SVG 生成已移至后端 /v1/schemes/model/export?format=svg（见 fetchBackendModelSvgText）
      svgTextPromise ??= Promise.resolve().then(() => fetchBackendModelSvgText(__appScope, textEncoding, "SVG 导出失败。"));
      return svgTextPromise;
    };
    // 本机另存为才拿得到磁盘路径 → 弹框里才有【查看】
    let savedFile: SavedExportFile | null = null;
    const captureSavedFile = (file: SavedExportFile) => {
      savedFile = file;
    };
    // 后端不可达/4xx/5xx 均为常规失败路径：与 createExportEFile 一致，catch 后提示并终止
    let saved: boolean;
    try {
      saved = typeof saveLazyTextFile === "function"
        ? await saveLazyTextFile({
            filename: `${baseFilename}.svg`,
            loadText: loadSvgText,
            mime: "image/svg+xml",
            description: "SVG 图形文件",
            extensions: [".svg"],
            encoding: textEncoding,
            preferNativeDialog: true,
            onSaveTargetReady: markSaveTargetReady,
            onSaved: captureSavedFile
          })
        : await saveTextFile({
            filename: `${baseFilename}.svg`,
            text: await loadSvgText(),
            mime: "image/svg+xml",
            description: "SVG 图形文件",
            extensions: [".svg"],
            encoding: textEncoding,
            preferNativeDialog: true,
            onSaveTargetReady: markSaveTargetReady,
            onSaved: captureSavedFile
          });
    } catch (error) {
      showGlobalMessage(error instanceof Error ? error.message : String(error));
      return;
    }
    if (!saved) {
      return;
    }
    writeOperationLog(`导出图形文件：${baseFilename}.svg`);
    const elapsedSeconds = ((performance.now() - exportStartedAt) / 1000).toFixed(2);
    const successMessage = `SVG 文件导出成功：${baseFilename}.svg；字符编码：${textFileEncodingLabel(textEncoding)}；总耗时：${elapsedSeconds} 秒`;
    showStandaloneExportCompletion(__appScope, "SVG 文件导出完成", successMessage, [], savedFile);
  };
}

export function createExportJsonFile(__appScope: ExportImportScope) {
  return async (textEncoding: TextFileEncoding = "utf-8") => {
    const {
      ensureSavedBeforeExport,
      projectName,
      safeFilePart,
      saveLazyTextFile,
      saveTextFile,
      showGlobalMessage = globalThis.showGlobalMessage ?? (() => undefined),
      writeOperationLog
    } = __appScope;
    let exportStartedAt = performance.now();
    const markSaveTargetReady = () => {
      exportStartedAt = performance.now();
    };
    if (!ensureSavedBeforeExport()) {
      return;
    }
    const baseFilename = safeFilePart(projectName);
    let jsonTextPromise: Promise<string> | undefined;
    const loadJsonText = () => {
      jsonTextPromise ??= Promise.resolve().then(() => fetchBackendModelJsonText(__appScope, "JSON 导出失败。"));
      return jsonTextPromise;
    };
    // 本机另存为才拿得到磁盘路径 → 弹框里才有【查看】
    let savedFile: SavedExportFile | null = null;
    const captureSavedFile = (file: SavedExportFile) => {
      savedFile = file;
    };
    // 后端不可达/4xx/5xx 均为常规失败路径：与 createExportSvgFile 一致，catch 后提示并终止
    let saved: boolean;
    try {
      saved = typeof saveLazyTextFile === "function"
        ? await saveLazyTextFile({
            filename: `${baseFilename}.json`,
            loadText: loadJsonText,
            mime: "application/json",
            description: "JSON 模型文件",
            extensions: [".json"],
            encoding: textEncoding,
            preferNativeDialog: true,
            onSaveTargetReady: markSaveTargetReady,
            onSaved: captureSavedFile
          })
        : await saveTextFile({
            filename: `${baseFilename}.json`,
            text: await loadJsonText(),
            mime: "application/json",
            description: "JSON 模型文件",
            extensions: [".json"],
            encoding: textEncoding,
            preferNativeDialog: true,
            onSaveTargetReady: markSaveTargetReady,
            onSaved: captureSavedFile
          });
    } catch (error) {
      showGlobalMessage(error instanceof Error ? error.message : String(error));
      return;
    }
    if (!saved) {
      return;
    }
    writeOperationLog(`导出模型文件：${baseFilename}.json`);
    const elapsedSeconds = ((performance.now() - exportStartedAt) / 1000).toFixed(2);
    const successMessage = `JSON 文件导出成功：${baseFilename}.json；字符编码：${textFileEncodingLabel(textEncoding)}；总耗时：${elapsedSeconds} 秒`;
    showStandaloneExportCompletion(__appScope, "JSON 文件导出完成", successMessage, [], savedFile);
  };
}

export function createExportEFile(__appScope: ExportImportScope) {
  return async (textEncoding: TextFileEncoding = "gbk") => {
    const {
      ensureSavedBeforeExport,
      safeFilePart,
      saveLazyTextFile,
      saveTextFile,
      showGlobalMessage = globalThis.showGlobalMessage ?? (() => undefined),
      writeOperationLog
    } = __appScope;
    const latestScope = () => (__appScope.__appScopeRef?.current as ExportImportScope | undefined) ?? __appScope;
    let exportStartedAt = performance.now();
    const markSaveTargetReady = () => {
      exportStartedAt = performance.now();
    };
    if (!ensureSavedBeforeExport()) {
      return;
    }

    if (isFrontendExportMode(latestScope())) {
      try {
        await sendFrontendExportArtifact(latestScope(), "e");
        showGlobalMessage("前端模式已发送 E 文件。");
      } catch (error) {
        showGlobalMessage(error instanceof Error ? error.message : "前端模式 E 文件发送失败。");
      }
      return;
    }

    const latestProjectName = String(latestScope().projectName ?? "");
    const filenameBase = typeof safeFilePart === "function"
      ? safeFilePart(latestProjectName)
      : sharedSafeFilePart(latestProjectName);
    // 后端经响应头带回落盘用告警（生成器单源）；保存完成后展示
    let warningDetails: string[] = [];
    // E 文件生成已移至后端 /v1/schemes/model/export?format=e-file（预定义模板只读态随请求带模板名）。
    const generatedFilePromise = Promise.resolve().then(async () => {
      const generated = await fetchBackendModelEFile(__appScope, textEncoding, "E 文件导出失败。");
      warningDetails = generated.warningDetails;
      return { file: { filename: `${filenameBase}.e`, text: generated.text, mime: "text/plain" } };
    });
    // 本机另存为才拿得到磁盘路径 → 弹框里才有【查看】
    let savedFile: SavedExportFile | null = null;
    const captureSavedFile = (file: SavedExportFile) => {
      savedFile = file;
    };
    let saved: boolean;
    try {
      saved = typeof saveLazyTextFile === "function"
        ? await saveLazyTextFile({
            filename: `${filenameBase}.e`,
            loadText: async () => (await generatedFilePromise).file.text,
            mime: "text/plain",
            description: "E 模型文件",
            extensions: [".e"],
            encoding: textEncoding,
            preferNativeDialog: true,
            onSaveTargetReady: markSaveTargetReady,
            onSaved: captureSavedFile
          })
        : await (async () => {
            const { file } = await generatedFilePromise;
            return saveTextFile({
              filename: file.filename,
              text: file.text,
              mime: file.mime,
              description: "E 模型文件",
              extensions: [".e"],
              encoding: textEncoding,
              preferNativeDialog: true,
              onSaveTargetReady: markSaveTargetReady,
              onSaved: captureSavedFile
            });
          })();
    } catch (error) {
      showGlobalMessage(error instanceof Error ? error.message : String(error));
      return;
    }
    if (!saved) {
      return;
    }
    const { file } = await generatedFilePromise;
    writeOperationLog(`导出模型文件：${file.filename}`);
    const elapsedSeconds = ((performance.now() - exportStartedAt) / 1000).toFixed(2);
    const successMessage = `E 文件导出成功：${file.filename}；字符编码：${textFileEncodingLabel(textEncoding)}；总耗时：${elapsedSeconds} 秒`;
    showStandaloneExportCompletion(__appScope, "E 文件导出完成", successMessage, warningDetails, savedFile);
  };
}

export function createExportEDeviceDefinitionFile(__appScope: ExportImportScope) {
  return async () => {
    const { libraryTemplates, PARAM_LABELS, eDeviceDefinitionLabels, eDeviceDefinitionClassExportEnabled, eDeviceDefinitionFieldOrder, eDeviceDefinitionTableIds, eDeviceDefinitionTemplateFields, resolveTemplateComponentLibrary, saveTextFile, writeOperationLog } = __appScope;
    // libraryTemplates 已合并内置 + 自定义元件并应用 deviceDefinitionOverrides，导出范围覆盖所有元件（含内置）
    const interfaceDefinitions = buildEFileExportOptionsFromLibrary({
      libraryTemplates,
      labels: PARAM_LABELS,
      eDeviceDefinitionLabels,
      eDeviceDefinitionClassExportEnabled,
      eDeviceDefinitionFieldOrder,
      eDeviceDefinitionTemplateFields,
      eDeviceDefinitionTableIds,
      resolveDefinitionComponentLibrary: resolveTemplateComponentLibrary
    }).interfaceDefinitions;
    const file = buildEDeviceDefinitionFileFromInterfaceDefinitions(interfaceDefinitions);
    if (!file.text) {
      showGlobalMessage("没有可导出的元件定义：所有元件均未勾选导出字段。");
      return;
    }
    // 本机另存为才拿得到磁盘路径 → 弹框里才有【查看】
    let savedFile: SavedExportFile | null = null;
    const saved = await saveTextFile({
      filename: file.filename,
      text: file.text,
      mime: file.mime,
      description: "E 元件定义文件",
      extensions: [".e"],
      encoding: "gbk",
      preferNativeDialog: true,
      onSaved: (saved: any) => {
        savedFile = saved;
      }
    });
    if (!saved) {
      return;
    }
    writeOperationLog(`导出元件定义文件：${file.filename}`);
    showStandaloneExportCompletion(__appScope, "E 元件定义文件导出完成", `元件定义文件导出成功：${file.filename}`, [], savedFile);
  };
}

export function createImportEDeviceDefinitionFile(__appScope: ExportImportScope) {
  return (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) {
      return;
    }
    const {
      customDeviceTemplates,
      deviceDefinitionOverrides,
      eDeviceDefinitionLabels,
      eDeviceDefinitionClassExportEnabled,
      eDeviceDefinitionFieldOrder,
      eDeviceDefinitionTemplateFields,
      libraryTemplates,
      persistDeviceLibraryChange,
      setCustomDeviceTemplates,
      setDeviceDefinitionOverrides,
      setEDeviceDefinitionLabels,
      setEDeviceDefinitionClassExportEnabled,
      setEDeviceDefinitionFieldOrder,
      setEDeviceDefinitionTemplateFields,
      setEDeviceInterfaceLoadedTemplateName,
      setEDeviceInterfaceReadonlyMode,
      writeOperationLog
    } = __appScope;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        // E 文件统一为 GBK 编码（导出强制 GBK），导入时按字节解码以兼容 GBK/UTF-8
        const sections = parseEDeviceDefinitionFile(decodeEFileText(reader.result));
        if (sections.length === 0) {
          showGlobalMessage("未在文件中解析到元件定义。");
          return;
        }
        const result = applyEDeviceDefinitionSectionsToLibraryState({
          sections,
          customDeviceTemplates,
          libraryTemplates,
          deviceDefinitionOverrides,
          eDeviceDefinitionLabels: {},
          eDeviceDefinitionClassExportEnabled: {},
          eDeviceDefinitionFieldOrder,
          eDeviceDefinitionTemplateFields: {},
          labels: __appScope.PARAM_LABELS,
          deviceDefinitionOverrideForTemplate: __appScope.deviceDefinitionOverrideForTemplate,
          resolveDefinitionComponentLibrary: __appScope.resolveTemplateComponentLibrary ?? ((template: any) => inferESection(template.kind, template.params ?? {}))
        });
        setCustomDeviceTemplates(result.customDeviceTemplates);
        setDeviceDefinitionOverrides(result.deviceDefinitionOverrides);
        setEDeviceDefinitionLabels(result.eDeviceDefinitionLabels);
        setEDeviceDefinitionClassExportEnabled(result.eDeviceDefinitionClassExportEnabled);
        setEDeviceDefinitionFieldOrder(result.eDeviceDefinitionFieldOrder);
        setEDeviceDefinitionTemplateFields(result.eDeviceDefinitionTemplateFields);
        persistDeviceLibraryChange({
          customDeviceTemplates: result.customDeviceTemplates,
          deviceDefinitionOverrides: result.deviceDefinitionOverrides,
          eDeviceDefinitionLabels: result.eDeviceDefinitionLabels,
          eDeviceDefinitionClassExportEnabled: result.eDeviceDefinitionClassExportEnabled,
          eDeviceDefinitionFieldOrder: result.eDeviceDefinitionFieldOrder,
          eDeviceDefinitionTemplateFields: result.eDeviceDefinitionTemplateFields
        }, {
          success: `元件定义导入成功：匹配 ${result.matched.length} 个，跳过 ${result.skipped.length} 个。`,
          failure: `元件定义已更新本地，后台保存失败：匹配 ${result.matched.length} 个。`
        });
        // 重置 E 文件接口定义基线，避免显示"有未保存修改"
        if (typeof __appScope.setEDeviceInterfaceDefinitionBaseline === "function") {
          __appScope.setEDeviceInterfaceDefinitionBaseline(null);
        }
        if (typeof __appScope.setEDeviceInterfaceSelectedClassBaseline === "function") {
          __appScope.setEDeviceInterfaceSelectedClassBaseline(null);
        }
        writeOperationLog(`导入元件定义文件：${file.name}`);
        // 设置文件名和只读模式（与预定义模板逻辑一致）
        if (typeof setEDeviceInterfaceLoadedTemplateName === "function") {
          setEDeviceInterfaceLoadedTemplateName(file.name);
          try { localStorage.setItem("eDeviceInterfaceLoadedTemplateName", file.name); } catch { /* ignore */ }
        }
        if (typeof setEDeviceInterfaceReadonlyMode === "function") {
          setEDeviceInterfaceReadonlyMode(true);
          try { localStorage.setItem("eDeviceInterfaceReadonlyMode", "true"); } catch { /* ignore */ }
        }
        const detail = result.skipped.length > 0 ? `\n未匹配（跳过）：${result.skipped.length} 个` : "";
        showGlobalMessage(`元件定义导入成功。\n匹配元件：${result.matched.length} 个${detail}`);
      } catch (error) {
        showGlobalMessage(error instanceof Error ? error.message : "导入元件定义文件失败。");
      }
    };
    reader.onerror = () => {
      showGlobalMessage("读取元件定义文件失败。");
    };
    reader.readAsArrayBuffer(file);
  };
}

// E 文件统一为 GBK 编码（导出强制 GBK）。导入时按字节读取：
// 有 UTF-8 BOM 或可按 UTF-8 无损解码时按 UTF-8，否则按 GBK 解码。
function decodeEFileText(result: unknown): string {
  if (typeof result === "string") {
    return result;
  }
  if (result instanceof ArrayBuffer) {
    const bytes = new Uint8Array(result);
    if (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
      return new TextDecoder("utf-8").decode(bytes);
    }
    try {
      const decoded = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
      return decoded;
    } catch {
      return decodeGbk(bytes);
    }
  }
  return "";
}

// 程序化导出 E 文件定义（经 WS control 指令调用，返回文本不触发浏览器下载）
export function createProgrammaticExportEDeviceDefinition(__appScope: ExportImportScope) {
  return () => {
    const { libraryTemplates, PARAM_LABELS, eDeviceDefinitionLabels, eDeviceDefinitionClassExportEnabled, eDeviceDefinitionFieldOrder, eDeviceDefinitionTableIds, eDeviceDefinitionTemplateFields, resolveTemplateComponentLibrary } = __appScope;
    return buildEDeviceDefinitionFileFromInterfaceDefinitions(buildEFileExportOptionsFromLibrary({
      libraryTemplates,
      labels: PARAM_LABELS,
      eDeviceDefinitionLabels,
      eDeviceDefinitionClassExportEnabled,
      eDeviceDefinitionFieldOrder,
      eDeviceDefinitionTemplateFields,
      eDeviceDefinitionTableIds,
      resolveDefinitionComponentLibrary: resolveTemplateComponentLibrary
    }).interfaceDefinitions);
  };
}

// 程序化导入 E 文件定义（经 WS control 指令调用，返回匹配结果，不实际写入）
export function createProgrammaticImportEDeviceDefinition(__appScope: ExportImportScope) {
  return (text: string) => {
    const { libraryTemplates } = __appScope;
    const resolveDefinitionComponentLibrary = __appScope.resolveTemplateComponentLibrary ?? ((template: any) => inferESection(template.kind, template.params ?? {}));
    const sections = parseEDeviceDefinitionFile(String(text ?? ""));
    if (sections.length === 0) {
      const e: any = new Error("未在文件中解析到元件定义。");
      e.code = "bad-request";
      throw e;
    }
    const sectionByKind = new Map(sections.map((s: any) => [s.componentLibrary || s.kind, s]));
    const matched: string[] = [];
    const skipped: string[] = [];
    for (const template of (libraryTemplates ?? []) as any[]) {
      const componentLibrary = resolveDefinitionComponentLibrary(template);
      const section = componentLibrary ? sectionByKind.get(componentLibrary) : undefined;
      if (!section) {
        skipped.push(template.label || template.kind);
        continue;
      }
      matched.push(template.label || template.kind);
    }
    return { matched, skipped, matchedCount: matched.length, skippedCount: skipped.length };
  };
}

export function createIsProjectFilePayload(__appScope: ExportImportScope) {
  return (value: unknown): value is ProjectFile => {
  const { isObjectRecord } = __appScope;
    if (!isObjectRecord(value)) {
      return false;
    }
    const record = value as Record<string, any>;
    return record.version === 1 && Array.isArray(record.nodes) && Array.isArray(record.edges);
  };
}

export function createCreateImportedSchemeRecord(__appScope: ExportImportScope) {
  return (text: string, fileName: string): SavedSchemeRecord => {
  const { createImportedSchemeRecord, createSavedProject, createSavedScheme, isObjectRecord, isProjectFilePayload } = __appScope;
    const payload = JSON.parse(text) as unknown;
    const payloadRecord = (isObjectRecord(payload) ? payload : null) as Record<string, any> | null;
    const rawScheme =
      payloadRecord && isObjectRecord(payloadRecord.scheme)
        ? payloadRecord.scheme
        : payloadRecord && Array.isArray(payloadRecord.schemes) && isObjectRecord(payloadRecord.schemes[0])
          ? payloadRecord.schemes[0]
          : payloadRecord;
    if (!rawScheme || !Array.isArray(rawScheme.projects)) {
      throw new Error("方案文件格式不正确。");
    }
    const fileBaseName = fileName.replace(/\.scheme\.json$/i, "").replace(/\.json$/i, "");
    const importedName = typeof rawScheme.name === "string" && rawScheme.name.trim() ? rawScheme.name.trim() : fileBaseName || "导入方案";
    const importedProjects = rawScheme.projects.map((projectPayload: any, index: any) => {
      const projectRecord = isObjectRecord(projectPayload) ? projectPayload : null;
      const projectFile = projectRecord && isProjectFilePayload(projectRecord.project)
        ? projectRecord.project
        : isProjectFilePayload(projectPayload)
          ? projectPayload
          : null;
      if (!projectFile) {
        throw new Error(`方案文件中的第 ${index + 1} 个模型格式不正确。`);
      }
      const importedProjectName =
        projectRecord && typeof projectRecord.name === "string" && projectRecord.name.trim()
          ? projectRecord.name.trim()
          : projectFile.name || `导入模型${index + 1}`;
      // 方案文件导入的是「已存在于后台」的模型，保留其 model_id；createSavedProject 默认不继承 idx。
      const createdRecord = createSavedProject(importedProjectName, projectFile);
      return projectFile.idx === undefined
        ? createdRecord
        : { ...createdRecord, project: { ...createdRecord.project, idx: projectFile.idx } };
    });
    const importedChildren: SavedSchemeRecord[] = Array.isArray(rawScheme.children)
      ? rawScheme.children.map((childPayload: any, index: any): SavedSchemeRecord => {
          try {
            return createImportedSchemeRecord(JSON.stringify(childPayload), `子方案${index + 1}.json`);
          } catch (error) {
            throw new Error(error instanceof Error ? `子方案${index + 1}：${error.message}` : `子方案${index + 1}格式不正确。`);
          }
        })
      : [];
    return createSavedScheme(importedName, importedProjects, importedChildren);
  };
}

export function createExportProjectRecordFile(__appScope: ExportImportScope) {
  return async (project: SavedProjectRecord) => {
  const { activeProjectKey, currentProject, projectName, safeFilePart, saveTextFile, serializeProject, writeOperationLog } = __appScope;
    const projectFile = project.id === activeProjectKey ? currentProject() : project.project;
    const exportName = project.id === activeProjectKey ? projectName : project.name;
    // 本机另存为才拿得到磁盘路径 → 弹框里才有【查看】
    let savedFile: SavedExportFile | null = null;
    const saved = await saveTextFile({
      filename: `${safeFilePart(exportName)}.json`,
      text: serializeProject(projectFile),
      mime: "application/json",
      description: "平台模型文件",
      extensions: [".json"],
      preferNativeDialog: true,
      onSaved: (saved: any) => {
        savedFile = saved;
      }
    });
    if (!saved) {
      return;
    }
    writeOperationLog(`导出模型文件：${exportName}.json`);
    showStandaloneExportCompletion(__appScope, "模型文件导出完成", `模型文件导出成功：${safeFilePart(exportName)}.json`, [], savedFile);
  };
}

export function createExportCurrentModelFile(__appScope: ExportImportScope) {
  return async () => {
  const { currentProject, safeFilePart, saveTextFile, serializeProject, writeOperationLog } = __appScope;
    const latestScope = () => (__appScope.__appScopeRef?.current as ExportImportScope | undefined) ?? __appScope;
    const exportProjectName = latestScope().projectName;
    // 本机另存为才拿得到磁盘路径 → 弹框里才有【查看】
    let savedFile: SavedExportFile | null = null;
    const saved = await saveTextFile({
      filename: `${safeFilePart(exportProjectName)}.json`,
      text: serializeProject(currentProject()),
      mime: "application/json",
      description: "平台模型文件",
      extensions: [".json"],
      preferNativeDialog: true,
      onSaved: (saved: any) => {
        savedFile = saved;
      }
    });
    if (!saved) {
      return;
    }
    writeOperationLog(`导出当前模型文件：${exportProjectName}.json`);
    showStandaloneExportCompletion(__appScope, "当前模型文件导出完成", `当前模型文件导出成功：${safeFilePart(exportProjectName)}.json`, [], savedFile);
  };
}

export function createOpenModelImportFilePicker(__appScope: ExportImportScope) {
  return (targetSchemeId = "") => {
  const { modelImportInputRef, modelImportTargetSchemeIdRef } = __appScope;
    modelImportTargetSchemeIdRef.current = targetSchemeId;
    modelImportInputRef.current?.click();
  };
}

export function createOpenSvgModelImportFilePicker(__appScope: ExportImportScope) {
  return (targetSchemeId = "") => {
  const { modelImportTargetSchemeIdRef, svgModelImportInputRef } = __appScope;
    modelImportTargetSchemeIdRef.current = targetSchemeId;
    if (svgModelImportInputRef.current) {
      svgModelImportInputRef.current.value = "";
      svgModelImportInputRef.current.click();
    }
  };
}

export function createCompleteImportedModelFeedback(__appScope: ExportImportScope) {
  return (feedback?: { successMessage: string; warnings: string[] }) => {
  const { writeOperationLog } = __appScope;
    if (!feedback) {
      return;
    }
    for (const warning of feedback.warnings) {
      writeOperationLog(`SVG 导入警告：${warning}`);
    }
    showGlobalMessage(feedback.successMessage);
  };
}

function svgModelImportCompletionFeedback(importedName: string, result: any) {
  const modeLabel = result.mode === "platform" ? "平台语义恢复" : "普通 SVG 静态图元";
  const warnings = Array.isArray(result.warnings) ? result.warnings.map((warning: unknown) => String(warning)) : [];
  const warningLines = warnings.slice(0, 20).map((warning: string, index: number) => `${index + 1}. ${warning}`);
  return {
    warnings,
    successMessage: [
      `从 SVG 生成模型成功：${importedName}`,
      `解析方式：${modeLabel}`,
      `设备：${Number(result.stats?.nodes) || 0}`,
      `连接线：${Number(result.stats?.edges) || 0}`,
      `量测组：${Number(result.stats?.measurementGroups) || 0}`,
      `静态图元：${Number(result.stats?.staticNodes) || 0}`,
      `警告：${warnings.length}`,
      ...(warningLines.length > 0 ? ["", ...warningLines] : []),
      ...(warnings.length > warningLines.length ? ["", `其余 ${warnings.length - warningLines.length} 条警告已写入操作日志。`] : [])
    ].join("\n")
  };
}

export function createOpenSchemeImportFilePicker(__appScope: ExportImportScope) {
  return (parentSchemeId = "") => {
  const { schemeImportInputRef, schemeImportParentSchemeIdRef } = __appScope;
    schemeImportParentSchemeIdRef.current = parentSchemeId;
    if (schemeImportInputRef.current) {
      schemeImportInputRef.current.value = "";
      schemeImportInputRef.current.click();
    }
  };
}

export function createMergeImportedSchemeIntoExisting(__appScope: ExportImportScope) {
  return (existingScheme: SavedSchemeRecord, importedScheme: SavedSchemeRecord): SavedSchemeRecord => {
  const { hasSameName, mergeImportedSchemeIntoExisting, upsertSavedProject } = __appScope;
    const now = new Date().toISOString();
    const nextProjects = importedScheme.projects.reduce<SavedProjectRecord[]>((current, importedProject) => {
      const duplicateProject = current.find((project) => hasSameName(project.name, [importedProject.name]));
      if (!duplicateProject) {
        return upsertSavedProject(current, importedProject);
      }
      return upsertSavedProject(current, {
        ...importedProject,
        id: duplicateProject.id,
        name: duplicateProject.name,
        project: { ...importedProject.project, name: duplicateProject.name }
      });
    }, existingScheme.projects);
    const nextChildren = (importedScheme.children ?? []).reduce<SavedSchemeRecord[]>((current, importedChild) => {
      const duplicateChild = current.find((child) => hasSameName(child.name, [importedChild.name]));
      if (!duplicateChild) {
        return [...current, importedChild];
      }
      return current.map((child) => child.id === duplicateChild.id ? mergeImportedSchemeIntoExisting(child, importedChild) : child);
    }, existingScheme.children ?? []);
    return { ...existingScheme, updatedAt: now, projects: nextProjects, children: nextChildren };
  };
}

export function createCommitImportedSchemeRecord(__appScope: ExportImportScope) {
  return (importedScheme: SavedSchemeRecord, parentSchemeId = "") => {
  const { insertChildSavedScheme, persistSchemeTreeToBackend, schemePathForScheme, selectSingleScheme, setExpandedSchemeIds, setSchemes, writeOperationLog } = __appScope;
    const parentPath = parentSchemeId ? schemePathForScheme(parentSchemeId) : [];
    setSchemes((current: any) => insertChildSavedScheme(current, parentSchemeId, importedScheme));
    persistSchemeTreeToBackend(importedScheme, parentPath, `导入方案：${importedScheme.name}`);
    if (parentSchemeId) {
      setExpandedSchemeIds((current: any) => (current.includes(parentSchemeId) ? current : [...current, parentSchemeId]));
    }
    setExpandedSchemeIds((current: any) => (current.includes(importedScheme.id) ? current : [...current, importedScheme.id]));
    selectSingleScheme(importedScheme.id);
    writeOperationLog(`导入方案：${importedScheme.name}`);
  };
}

export function createApplyBackendSchemeArchiveImport(__appScope: ExportImportScope) {
  return (payload: BackendSchemeArchiveImportResponse, fallbackName: string) => {
  const { findSavedSchemeByPath, hydrateSavedSchemeRuntimeIds, normalizeSavedSchemeIndexes, rememberPersistedSchemesPayload, selectSingleScheme, serializeSchemesForStorage, setExpandedSchemeIds, setSchemesState, suppressNextBackendSchemeSyncRef, writeOperationLog } = __appScope;
    const importedPath = Array.isArray(payload.importedPath) ? payload.importedPath : [];
    const backendSchemes = hydrateSavedSchemeRuntimeIds((payload.schemes ?? []).map(normalizeSavedSchemeIndexes));
    suppressNextBackendSchemeSyncRef.current = true;
    rememberPersistedSchemesPayload(serializeSchemesForStorage(backendSchemes));
    setSchemesState(backendSchemes);
    const importedScheme = importedPath.length > 0 ? findSavedSchemeByPath(backendSchemes, importedPath) : null;
    if (importedScheme) {
      const parentPath = importedPath.slice(0, -1);
      const parentScheme = parentPath.length > 0 ? findSavedSchemeByPath(backendSchemes, parentPath) : null;
      if (parentScheme) {
        setExpandedSchemeIds((current: any) => (current.includes(parentScheme.id) ? current : [...current, parentScheme.id]));
      }
      setExpandedSchemeIds((current: any) => (current.includes(importedScheme.id) ? current : [...current, importedScheme.id]));
      selectSingleScheme(importedScheme.id);
    }
    writeOperationLog(`导入方案压缩包：${payload.importedName || fallbackName}`);
  };
}

export function createImportSchemeFile(__appScope: ExportImportScope) {
  return async (event: ChangeEvent<HTMLInputElement>) => {
  const { applyBackendSchemeArchiveImport, commitImportedSchemeRecord, createImportedSchemeRecord, findSavedSchemeById, hasSameName, schemeImportParentSchemeIdRef, schemePathForScheme, setPendingSchemeImportConflict, uploadBackendSchemeArchive } = __appScope;
    const latestScope = () => (__appScope.__appScopeRef?.current as ExportImportScope | undefined) ?? __appScope;
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) {
      schemeImportParentSchemeIdRef.current = "";
      input.value = "";
      return;
    }
    try {
      if (/\.zip$/iu.test(file.name)) {
        const parentSchemeId = schemeImportParentSchemeIdRef.current;
        const parentPath = parentSchemeId ? schemePathForScheme(parentSchemeId) : [];
        const payload = await uploadBackendSchemeArchive(file, parentPath);
        if (payload.conflict) {
          setPendingSchemeImportConflict({
            importFile: file,
            importedPath: payload.parentPath,
            importedName: payload.importedName || file.name.replace(/\.zip$/iu, "") || "导入方案",
            duplicateSchemeName: payload.duplicateSchemeName || payload.importedName || "同名方案",
            targetParentSchemeId: parentSchemeId
          });
          return;
        }
        applyBackendSchemeArchiveImport(payload, file.name);
        return;
      }
      const text = await file.text();
      const importedScheme = createImportedSchemeRecord(text, file.name);
      const parentSchemeId = schemeImportParentSchemeIdRef.current;
      const latestSchemes = latestScope().schemes;
      const targetSchemes = parentSchemeId ? findSavedSchemeById(latestSchemes, parentSchemeId)?.children ?? [] : latestSchemes;
      const duplicateScheme = targetSchemes.find((scheme: any) => hasSameName(importedScheme.name, [scheme.name]));
      if (duplicateScheme) {
        setPendingSchemeImportConflict({
          importedScheme,
          importedName: importedScheme.name,
          duplicateSchemeId: duplicateScheme.id,
          duplicateSchemeName: duplicateScheme.name,
          targetParentSchemeId: parentSchemeId
        });
        return;
      }
      commitImportedSchemeRecord(importedScheme, parentSchemeId);
    } catch (error) {
      showGlobalMessage(error instanceof Error ? `导入方案失败：${error.message}` : "导入方案失败。");
    } finally {
      schemeImportParentSchemeIdRef.current = "";
      input.value = "";
    }
  };
}

export function createCommitImportedModelRecord(__appScope: ExportImportScope) {
  return (targetScheme: SavedSchemeRecord, importedRecord: SavedProjectRecord) => {
  const { findSavedSchemeById, handleBackendSchemeMutationFailure, loadSavedProject, saveBackendProjectRecord, schemePathForRecord, setExpandedSchemeIds, setSchemes, upsertSavedProjectInScheme, writeOperationLog } = __appScope;
    const targetPath = schemePathForRecord(targetScheme);
    setSchemes((current: any) => {
      const fallback = current.length > 0 ? current : [targetScheme];
      const nextSchemes = findSavedSchemeById(fallback, targetScheme.id) ? fallback : [...fallback, targetScheme];
      return upsertSavedProjectInScheme(nextSchemes, targetScheme.id, importedRecord);
    });
    void saveBackendProjectRecord(targetPath, importedRecord)
      // 后端保存时才分配 model_id（idx），回填本地记录，避免新模型一直显示无 ID。
      .then((saved: any) => setSchemes((current: any) => upsertSavedProjectInScheme(current, targetScheme.id, saved)))
      .catch((error: any) => handleBackendSchemeMutationFailure(`导入模型同步后台：${importedRecord.name}`, error));
    setExpandedSchemeIds((current: any) => (current.includes(targetScheme.id) ? current : [...current, targetScheme.id]));
    loadSavedProject(importedRecord, targetScheme.id);
    writeOperationLog(`导入模型文件：${importedRecord.name}`);
  };
}

export function createImportModelFile(__appScope: ExportImportScope) {
  return async (event: ChangeEvent<HTMLInputElement>) => {
  const { commitImportedModelRecord, createSavedProject, createSavedScheme, deserializeProject, findSavedSchemeById, modelImportTargetSchemeIdRef, setPendingModelImportConflict } = __appScope;
    const latestScope = () => (__appScope.__appScopeRef?.current as ExportImportScope | undefined) ?? __appScope;
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) {
      return;
    }
    try {
      const text = await file.text();
      const importedProject = deserializeProject(text);
      const importTargetSchemeId = modelImportTargetSchemeIdRef.current;
      const latest = latestScope();
      const targetScheme =
        findSavedSchemeById(latest.schemes, importTargetSchemeId) ??
        latest.activeSchemeRecord ??
        latest.selectedSchemeRecord ??
        latest.schemes[0] ??
        createSavedScheme("默认方案");
      const fileBaseName = file.name.replace(/\.json$/i, "");
      const importedName = (importedProject.name || fileBaseName || "导入模型").trim() || "导入模型";
      const duplicateProject = targetScheme.projects.find((project: any) => project.name.trim() === importedName.trim());
      if (duplicateProject) {
        setPendingModelImportConflict({
          targetSchemeId: targetScheme.id,
          importedProject,
          importedName,
          duplicateProjectId: duplicateProject.id,
          duplicateProjectName: duplicateProject.name
        });
        return;
      }
      commitImportedModelRecord(targetScheme, createSavedProject(importedName, importedProject));
    } catch (error) {
      showGlobalMessage(error instanceof Error ? `导入模型文件失败：${error.message}` : "导入模型文件失败。");
    } finally {
      modelImportTargetSchemeIdRef.current = "";
      input.value = "";
    }
  };
}

export function createImportSvgModelFile(__appScope: ExportImportScope) {
  return async (event: ChangeEvent<HTMLInputElement>) => {
  const {
    commitImportedModelRecord,
    completeImportedModelFeedback,
    createSavedProject,
    createSavedScheme,
    findSavedSchemeById,
    modelImportTargetSchemeIdRef,
    parseSvgModel,
    setPendingModelImportConflict,
    writeOperationLog,
    yieldToBrowser
  } = __appScope;
    const latestScope = () => (__appScope.__appScopeRef?.current as ExportImportScope | undefined) ?? __appScope;
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) {
      modelImportTargetSchemeIdRef.current = "";
      input.value = "";
      return;
    }
    try {
      if (!/\.svg$/iu.test(file.name) && file.type !== "image/svg+xml") {
        throw new Error("请选择 SVG 文件。");
      }
      writeOperationLog(`正在从 SVG 生成模型：${file.name}`);
      if (typeof yieldToBrowser === "function") {
        await yieldToBrowser();
      } else {
        await new Promise<void>((resolve) => globalThis.setTimeout(resolve, 0));
      }
      const text = await file.text();
      const importedName = file.name.replace(/\.svg$/iu, "").trim() || "SVG 导入模型";
      const result = await parseSvgModel(text, {
        name: importedName,
        templates: latestScope().libraryTemplates
      });
      const latest = latestScope();
      const targetScheme =
        findSavedSchemeById(latest.schemes, modelImportTargetSchemeIdRef.current) ??
        latest.activeSchemeRecord ??
        latest.selectedSchemeRecord ??
        latest.schemes[0] ??
        createSavedScheme("默认方案");
      const completionFeedback = svgModelImportCompletionFeedback(importedName, result);
      const duplicateProject = targetScheme.projects.find((project: any) => project.name.trim() === importedName);
      if (duplicateProject) {
        setPendingModelImportConflict({
          targetSchemeId: targetScheme.id,
          importedProject: result.project,
          importedName,
          duplicateProjectId: duplicateProject.id,
          duplicateProjectName: duplicateProject.name,
          completionFeedback
        });
        return;
      }
      commitImportedModelRecord(targetScheme, createSavedProject(importedName, result.project));
      completeImportedModelFeedback(completionFeedback);
    } catch (error) {
      showGlobalMessage(error instanceof Error ? `从 SVG 生成模型失败：${error.message}` : "从 SVG 生成模型失败。");
    } finally {
      modelImportTargetSchemeIdRef.current = "";
      input.value = "";
    }
  };
}

// dot 导入完成反馈：仿 SVG 版，报告字段映射设备/连接线/收缩点/未知图元/容性假设/[OPEN] 开关，
// 警告来自 unknownStaticNames 与 shuntAssumedCapacitorNames，前 20 条内联、其余写入操作日志。
function dotModelImportCompletionFeedback(importedName: string, result: any) {
  const report = result?.report ?? {};
  const warnings = [
    ...(Array.isArray(report.unknownStaticNames) ? report.unknownStaticNames.map((name: string) => `未知图元：${name}（按静态图元导入）`) : []),
    ...(Array.isArray(report.shuntAssumedCapacitorNames) ? report.shuntAssumedCapacitorNames.map((name: string) => `容性假设：${name}（按电容器导入）`) : [])
  ];
  const warningLines = warnings.slice(0, 20).map((warning: string, index: number) => `${index + 1}. ${warning}`);
  return {
    warnings,
    successMessage: [
      `从 dot 生成模型成功：${importedName}`,
      `设备：${Number(report.deviceCount) || 0}`,
      `连接线：${Number(report.edgeCount) || 0}`,
      `收缩点：${Number(report.collapsedCount) || 0}`,
      `未知图元：${Number(report.unknownStaticCount) || 0}`,
      `容性假设：${Array.isArray(report.shuntAssumedCapacitorNames) ? report.shuntAssumedCapacitorNames.length : 0}`,
      `[OPEN] 开关：${Number(report.openSwitchCount) || 0}`,
      `警告：${warnings.length}`,
      ...(warningLines.length > 0 ? ["", ...warningLines] : []),
      ...(warnings.length > warningLines.length ? ["", `其余 ${warnings.length - warningLines.length} 条警告已写入操作日志。`] : [])
    ].join("\n")
  };
}

export function createOpenDotModelImportFilePicker(__appScope: ExportImportScope) {
  return (targetSchemeId = "") => {
  const { dotModelImportInputRef, modelImportTargetSchemeIdRef } = __appScope;
    modelImportTargetSchemeIdRef.current = targetSchemeId;
    if (dotModelImportInputRef.current) {
      dotModelImportInputRef.current.value = "";
      dotModelImportInputRef.current.click();
    }
  };
}

export function createImportDotModelFile(__appScope: ExportImportScope) {
  return async (event: ChangeEvent<HTMLInputElement>) => {
  const {
    commitImportedModelRecord,
    createSavedProject,
    createSavedScheme,
    findSavedSchemeById,
    importDotFile,
    modelImportTargetSchemeIdRef,
    setPendingModelImportConflict,
    writeOperationLog
  } = __appScope;
    const latestScope = () => (__appScope.__appScopeRef?.current as ExportImportScope | undefined) ?? __appScope;
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) {
      modelImportTargetSchemeIdRef.current = "";
      input.value = "";
      return;
    }
    try {
      if (!/\.dot$/iu.test(file.name)) {
        throw new Error("请选择 dot 文件。");
      }
      writeOperationLog(`正在从 dot 生成模型：${file.name}`);
      const text = await file.text();
      const importedName = file.name.replace(/\.dot$/iu, "").trim() || "dot 导入模型";
      const result = await importDotFile(text);
      const latest = latestScope();
      const targetScheme =
        findSavedSchemeById(latest.schemes, modelImportTargetSchemeIdRef.current) ??
        latest.activeSchemeRecord ??
        latest.selectedSchemeRecord ??
        latest.schemes[0] ??
        createSavedScheme("默认方案");
      const completionFeedback = dotModelImportCompletionFeedback(importedName, result);
      const duplicateProject = targetScheme.projects.find((project: any) => project.name.trim() === importedName);
      if (duplicateProject) {
        setPendingModelImportConflict({
          targetSchemeId: targetScheme.id,
          importedProject: result.project,
          importedName,
          duplicateProjectId: duplicateProject.id,
          duplicateProjectName: duplicateProject.name,
          completionFeedback
        });
        return;
      }
      commitImportedModelRecord(targetScheme, createSavedProject(importedName, result.project));
      for (const warning of completionFeedback.warnings) {
        writeOperationLog(`dot 导入警告：${warning}`);
      }
      showGlobalMessage(completionFeedback.successMessage);
    } catch (error) {
      showGlobalMessage(error instanceof Error ? `从 dot 生成模型失败：${error.message}` : "从 dot 生成模型失败。");
    } finally {
      modelImportTargetSchemeIdRef.current = "";
      input.value = "";
    }
  };
}

export function createResolveDuplicateSchemeImport(__appScope: ExportImportScope) {
  return (action: "merge" | "rename" | "cancel") => {
  const { applyBackendSchemeArchiveImport, commitImportedSchemeRecord, findSavedSchemeById, mergeImportedSchemeIntoExisting, pendingSchemeImportConflict, persistSchemeTreeToBackend, promptUniqueRecordName, replaceSavedSchemeById, savedChildSchemeNames, schemePathForRecord, schemePathForScheme, schemes, selectSingleScheme, setExpandedSchemeIds, setPendingSchemeImportConflict, setSchemes, uniqueRecordName, uploadBackendSchemeArchive, writeOperationLog } = __appScope;
    const conflict = pendingSchemeImportConflict;
    if (!conflict || action === "cancel") {
      setPendingSchemeImportConflict(null);
      return;
    }
    if (conflict.importFile) {
      const parentPath = conflict.targetParentSchemeId ? schemePathForScheme(conflict.targetParentSchemeId) : [];
      const handleZipImport = async (targetName?: string) => {
        try {
          const payload = await uploadBackendSchemeArchive(conflict.importFile as File, parentPath, { mode: "overwrite", targetName });
          applyBackendSchemeArchiveImport(payload, targetName || conflict.importedName);
        } catch (error) {
          showGlobalMessage(error instanceof Error ? `导入方案压缩包失败：${error.message}` : "导入方案压缩包失败。");
        }
      };
      if (action === "rename") {
        const siblingNames = savedChildSchemeNames(schemes, conflict.targetParentSchemeId ?? "");
        const renamed = promptUniqueRecordName(
          "请输入导入后的方案名称",
          uniqueRecordName(conflict.importedName, siblingNames, "导入方案"),
          siblingNames,
          "方案名称不能为空。",
          "方案名称重复，无法导入。"
        );
        if (!renamed) {
          return;
        }
        setPendingSchemeImportConflict(null);
        void handleZipImport(renamed);
        return;
      }
      setPendingSchemeImportConflict(null);
      void handleZipImport();
      return;
    }
    const duplicateScheme = findSavedSchemeById(schemes, conflict.duplicateSchemeId ?? "");
    const targetParentSchemeId = conflict.targetParentSchemeId ?? "";
    const siblingNames = savedChildSchemeNames(schemes, targetParentSchemeId);
    if (!conflict.importedScheme) {
      setPendingSchemeImportConflict(null);
      return;
    }
    if (action === "rename") {
      const renamed = promptUniqueRecordName(
        "请输入导入后的方案名称",
        uniqueRecordName(conflict.importedName, siblingNames, "导入方案"),
        siblingNames,
        "方案名称不能为空。",
        "方案名称重复，无法导入。"
      );
      if (!renamed) {
        return;
      }
      setPendingSchemeImportConflict(null);
      commitImportedSchemeRecord({ ...conflict.importedScheme, name: renamed, updatedAt: new Date().toISOString() }, targetParentSchemeId);
      return;
    }
    if (!duplicateScheme) {
      setPendingSchemeImportConflict(null);
      commitImportedSchemeRecord(conflict.importedScheme, targetParentSchemeId);
      return;
    }
    setPendingSchemeImportConflict(null);
    const mergedScheme = mergeImportedSchemeIntoExisting(duplicateScheme, conflict.importedScheme);
    const duplicatePath = schemePathForRecord(duplicateScheme);
    const parentPath = duplicatePath.slice(0, -1);
    setSchemes((current: any) => replaceSavedSchemeById(current, duplicateScheme.id, mergedScheme));
    persistSchemeTreeToBackend(mergedScheme, parentPath, `合并覆盖导入方案：${mergedScheme.name}`);
    setExpandedSchemeIds((current: any) => (current.includes(duplicateScheme.id) ? current : [...current, duplicateScheme.id]));
    selectSingleScheme(duplicateScheme.id);
    writeOperationLog(`合并覆盖导入方案：${duplicateScheme.name}`);
  };
}

export function createResolveDuplicateModelImport(__appScope: ExportImportScope) {
  return (action: "overwrite" | "rename" | "cancel") => {
  const { activeSchemeRecord, commitImportedModelRecord, completeImportedModelFeedback, createSavedProject, createSavedScheme, findSavedSchemeById, pendingModelImportConflict, promptUniqueRecordName, schemes, selectedSchemeRecord, setPendingModelImportConflict, uniqueRecordName } = __appScope;
    const conflict = pendingModelImportConflict;
    if (!conflict || action === "cancel") {
      setPendingModelImportConflict(null);
      return;
    }
    const targetScheme =
      findSavedSchemeById(schemes, conflict.targetSchemeId) ??
      activeSchemeRecord ??
      selectedSchemeRecord ??
      schemes[0] ??
      createSavedScheme("默认方案");
    const existingNames = targetScheme.projects.map((project: any) => project.name);
    if (action === "rename") {
      const renamed = promptUniqueRecordName(
        "请输入导入后的模型名称",
        uniqueRecordName(conflict.importedName, existingNames, "导入模型"),
        existingNames,
        "模型名称不能为空。",
        "模型名称重复，无法导入。"
      );
      if (!renamed) {
        return;
      }
      setPendingModelImportConflict(null);
      commitImportedModelRecord(targetScheme, createSavedProject(renamed, conflict.importedProject));
      completeImportedModelFeedback(conflict.completionFeedback);
      return;
    }
    const duplicateProject = targetScheme.projects.find((project: any) => project.id === conflict.duplicateProjectId);
    const targetName = duplicateProject?.name ?? conflict.duplicateProjectName;
    const overwrittenRecord = createSavedProject(targetName, conflict.importedProject);
    setPendingModelImportConflict(null);
    commitImportedModelRecord(targetScheme, {
      ...overwrittenRecord,
      id: conflict.duplicateProjectId,
      name: targetName,
      project: { ...overwrittenRecord.project, name: targetName }
    });
    completeImportedModelFeedback(conflict.completionFeedback);
  };
}

export function createExportSchemeRecord(__appScope: ExportImportScope) {
  return async (scheme: SavedSchemeRecord) => {
  const { downloadBackendSchemeArchive, flattenSavedProjects, isPickerAbort, safeFilePart, schemePathForRecord, writeOperationLog } = __appScope;
    try {
      const schemePath = schemePathForRecord(scheme);
      // 本机另存为才拿得到磁盘路径 → 弹框里才有【查看】（ZIP 用系统默认解压器打开）
      let savedFile: SavedExportFile | null = null;
      const saved = await downloadBackendSchemeArchive(schemePath, `${safeFilePart(scheme.name)}.zip`, (file: any) => {
        savedFile = file;
      }, scheme.schemeId);
      if (!saved) {
        return;
      }
      writeOperationLog(`导出方案：${scheme.name}`);
      showStandaloneExportCompletion(
        __appScope,
        "方案导出完成",
        `已导出方案“${scheme.name}”，共 ${flattenSavedProjects([scheme]).length} 个模型。`,
        [`文件：${safeFilePart(scheme.name)}.zip`],
        savedFile
      );
    } catch (error) {
      if (isPickerAbort(error)) {
        return;
      }
      showGlobalMessage(error instanceof Error ? `导出方案失败：${error.message}` : "导出方案失败。");
    }
  };
}

function textFileEncodingLabel(encoding: TextFileEncoding) {
  return encoding === "gbk" ? "GBK" : "UTF-8";
}
