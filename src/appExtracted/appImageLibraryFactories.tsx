/**
 * 图片素材库上传、复用、图标目录应用及文件夹管理工厂模块。
 * 从 appDeviceDefinitionFactories.tsx 拆分，保持严格 TypeScript 类型检查。
 * 注意：createChooseImage 保留自由标识符 showGlobalMessage 调用，以兼容测试的 globalThis 钉桩隔离。
 */

import type { ChangeEvent } from "react";
import { STATE_ICON_DRAFT_FRAME } from "./appDeviceDefinitionEInterface";
import { apiPath } from "../config";
import { promptText } from "../globalDialogs";
import { type ImageAsset } from "./appCoreCanvasUtilities";
import { type StateIconDrawingElement } from "../stateIconDrawing";

import { pushStateIconDrawingHistorySnapshot } from "./appStateIconDrawingFactories";

export type ImageLibraryImportKind = "image" | "archive" | "mixed";

const IMAGE_LIBRARY_ARCHIVE_FILE_PATTERN = /\.(docx|docm|pptx|pptm|ppsx|ppsm|xlsx|xlsm|vsdx|wps|dps|zip)$/iu;

const IMAGE_LIBRARY_IMAGE_FILE_PATTERN = /\.(svg|png|jpe?g|gif|webp|bmp|ico)$/iu;

export function imageLibraryImportKindForInput(input?: { dataset?: { imageImportKind?: string } } | null): ImageLibraryImportKind {
  const kind = input?.dataset?.imageImportKind;
  return kind === "image" || kind === "archive" ? kind : "mixed";
}

/**
 * 后台图片上传失败时，本地兜底素材的 id。
 *
 * 随机源可注入的原因（去向追踪结论）：这个 id 不停在内存里 ——
 * 它先被 saveImageAsset 当作 localStorage 键写进浏览器存储（刷新后仍在），
 * 再作为 asset.id 进入 setImageAssetList / setImageAssets，
 * 随后经 createApplyExistingImage 落到节点的 params.backgroundImageAssetId
 * （resolveNodeImage / resolveNodeForegroundImage 读的就是该字段），
 * 而节点 params 正是保存方案与 SVG / E 文件导出的内容。
 * 同一份图若换一台机器上传，id 会不同 ⇒ 导出结果不可复现。
 *
 * 默认参数仍是 Math.random，字符串格式与原先逐字一致（`asset-<ms>-<6位36进制>`）。
 */
export function createImageUploadFallbackAssetId(random: () => number = Math.random) {
  return `asset-${Date.now()}-${random().toString(36).slice(2, 8)}`;
}

export function imageLibraryFileMatchesImportKind(fileName: string, importKind: ImageLibraryImportKind) {
  const normalizedName = String(fileName ?? "").trim().toLowerCase();
  const isArchive = IMAGE_LIBRARY_ARCHIVE_FILE_PATTERN.test(normalizedName);
  const isImage = IMAGE_LIBRARY_IMAGE_FILE_PATTERN.test(normalizedName);
  if (importKind === "archive") {
    return isArchive;
  }
  if (importKind === "image") {
    return isImage;
  }
  return isArchive || isImage;
}

export function createChooseImage(__appScope: Record<string, any>) {
  return (event: ChangeEvent<HTMLInputElement>) => {
  const { activeImageFolderId, imageTarget, importBackendIconLibraryFile, randomSource: injectedRandomSource, refreshImageFolders, saveImageAsset, setImageAssetList, setImageAssets, uploadBackendImage } = __appScope;
    // 兜底 id 会流进 localStorage 与节点 params（见 createImageUploadFallbackAssetId 的追踪注释），
    // 所以随机源做成可注入；App.tsx 不装配该键 ⇒ 仍走 Math.random，行为不变。
    const randomSource = typeof injectedRandomSource === "function" ? injectedRandomSource : Math.random;
    const files = Array.from(event.target.files ?? []) as File[];
    const importKind = imageLibraryImportKindForInput(event.currentTarget ?? event.target);
    event.target.value = "";
    if (files.length === 0 || !imageTarget) {
      return;
    }
    const readFileAsDataUrl = (file: File) =>
      new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result ?? ""));
        reader.onerror = () => reject(reader.error ?? new Error("读取图片失败。"));
        reader.readAsDataURL(file);
      });
    void (async () => {
      const nextAssets: ImageAsset[] = [];
      const nextAssetMap: Record<string, string> = {};
      for (const file of files) {
        const lowerName = file.name.toLowerCase();
        const isIconArchive = IMAGE_LIBRARY_ARCHIVE_FILE_PATTERN.test(lowerName);
        if (!imageLibraryFileMatchesImportKind(lowerName, importKind)) {
          showGlobalMessage(importKind === "archive"
            ? `“${file.name || "所选文件"}”不是 DOCX/PPTX/XLSX/VSDX/WPS/DPS/ZIP 文档图片导入文件，请使用外部图片入口直接导入图片。`
            : `“${file.name || "所选文件"}”不是 SVG/PNG/JPG 等图片文件，请使用文档图片/图标入口导入文档中的图片和矢量图标素材。`);
          continue;
        }
        let imageData = "";
        try {
          imageData = await readFileAsDataUrl(file);
        } catch (error) {
          showGlobalMessage(error instanceof Error ? error.message : `读取 ${file.name || "图片"} 失败。`);
          continue;
        }
        if (isIconArchive) {
          try {
            const importedAssets = await importBackendIconLibraryFile(file.name, imageData, activeImageFolderId);
            nextAssets.push(...importedAssets);
            for (const asset of importedAssets) {
              nextAssetMap[asset.id] = asset.url;
            }
          } catch (error) {
            showGlobalMessage(error instanceof Error ? error.message : `导入 ${file.name || "文档图片"} 失败。`);
          }
          continue;
        }
        let asset: ImageAsset;
        try {
          asset = await uploadBackendImage(file.name, imageData, activeImageFolderId);
        } catch (error) {
          showGlobalMessage(error instanceof Error ? error.message : `上传 ${file.name || "图片"} 到后台失败。`);
          const fallbackId = createImageUploadFallbackAssetId(randomSource);
          saveImageAsset(fallbackId, imageData);
          asset = { id: fallbackId, name: file.name || "本地图片", folderId: activeImageFolderId, url: imageData };
        }
        nextAssets.push(asset);
        nextAssetMap[asset.id] = asset.url;
      }
      if (nextAssets.length > 0) {
        setImageAssetList((current: any) => [...nextAssets, ...current.filter((item: any) => !nextAssets.some((asset) => asset.id === item.id))]);
        setImageAssets((current: any) => ({ ...current, ...nextAssetMap }));
      }
      void refreshImageFolders();
    })();
  };
}

export function createApplyExistingImage(__appScope: Record<string, any>) {
  return async (assetId: string) => {
  const { createEditableStateIconElementsFromSvgSource, createImportedStateIconElement, imageAssetList, imageAssets, imageTarget, libraryTemplateByKind, pushUndoSnapshot, setCanvasBackgroundImage, setCanvasBackgroundImageAssetId, setImageTarget, setStateIconDrawingDialog, startLibraryDevicePlacement, stateIconDrawingHistoryRef, svgSourceFromDataUrl, updateGraphNodeById, writeOperationLog } = __appScope;
    const asset = imageAssetList.find((item: ImageAsset) => item.id === assetId);
    const imageData = imageAssets[assetId] ?? asset?.url;
    if (!imageTarget || !imageData) {
      return;
    }
    if (imageTarget.kind === "stateIconFrameBackground") {
      const backgroundImage = asset?.url ?? apiPath(`/images/${assetId}`);
      setStateIconDrawingDialog((current: any) =>
        current
          ? {
              ...current,
              frame: {
                ...STATE_ICON_DRAFT_FRAME,
                ...(current.frame ?? {}),
                backgroundImage,
                backgroundImageAssetId: assetId
              }
            }
          : current
      );
      setImageTarget(null);
      writeOperationLog?.(`选择图案背景图片：${asset?.name || assetId}`);
      return;
    }
    if (imageTarget.kind === "canvasIcon") {
      const baseTemplate = libraryTemplateByKind.get("static-image");
      if (!baseTemplate) {
        showGlobalMessage("未找到静态图片图元定义，无法插入图标。");
        return;
      }
      const iconTemplate = {
        ...baseTemplate,
        label: asset?.name || baseTemplate.label || "图标",
        params: {
          ...baseTemplate.params,
          text: asset?.name || baseTemplate.params?.text || "",
          backgroundImage: imageData,
          backgroundImageAssetId: assetId
        }
      };
      startLibraryDevicePlacement(iconTemplate);
      setImageTarget(null);
      writeOperationLog?.(`从图标库选择图标：${asset?.name || assetId}`);
      return;
    }
    if (imageTarget.kind === "stateIconDrawing") {
      const assetName = asset?.name || assetId;
      const lowerName = assetName.toLowerCase();
      const isSvg = asset?.mimeType === "image/svg+xml" || lowerName.endsWith(".svg") || imageData.startsWith("data:image/svg+xml");
      let importedElements: StateIconDrawingElement[] = [];
      if (isSvg) {
        let svgSource = svgSourceFromDataUrl(imageData);
        if (!svgSource) {
          try {
            svgSource = await fetch(imageData).then((response) => response.ok ? response.text() : "");
          } catch {
            svgSource = "";
          }
        }
        importedElements = svgSource
          ? createEditableStateIconElementsFromSvgSource(svgSource, assetName, { preserveImportedSvg: true })
          : [createImportedStateIconElement("image", imageData, assetName)];
      } else {
        importedElements = [createImportedStateIconElement("image", imageData, assetName)];
      }
      const selectedElementId = importedElements[0]?.id ?? "";
      setStateIconDrawingDialog((current: any) =>
        current
          ? (pushStateIconDrawingHistorySnapshot(stateIconDrawingHistoryRef, current.elements), {
              ...current,
              elements: [...current.elements, ...importedElements],
              selectedElementId,
              selectedElementIds: selectedElementId ? [selectedElementId] : [],
              pendingElementKind: undefined,
              pendingStaticTemplate: undefined,
              drawingDraft: undefined
            })
          : current
      );
      setImageTarget(null);
      writeOperationLog?.(`从图标库导入元件图案：${assetName}`);
      return;
    }
    pushUndoSnapshot();
    if (imageTarget.kind === "canvas") {
      setCanvasBackgroundImageAssetId(assetId);
      setCanvasBackgroundImage(imageData);
    } else {
      updateGraphNodeById(imageTarget.nodeId, (node: any) =>
        imageTarget.kind === "nodeForeground"
          ? { ...node, params: { ...node.params, foregroundImageAssetId: assetId, foregroundImage: imageData } }
          : { ...node, params: { ...node.params, backgroundImageAssetId: assetId, backgroundImage: imageData } }
      );
    }
    setImageTarget(null);
  };
}

export function createApplyIconLibraryCatalogIcon(__appScope: Record<string, any>) {
  return async (iconEntryId: string) => {
  const { createEditableStateIconElementsFromSvgSource, createImportedStateIconElement, iconLibraryPicker, imageTarget, libraryTemplateByKind, pushUndoSnapshot, setCanvasBackgroundImage, setCanvasBackgroundImageAssetId, setImageTarget, setStateIconDrawingDialog, startLibraryDevicePlacement, stateIconDrawingHistoryRef, updateGraphNodeById, writeOperationLog } = __appScope;
    if (!imageTarget) {
      return;
    }
    const entry = iconLibraryPicker?.entries?.find((item: any) => item.id === iconEntryId);
    if (!entry) {
      showGlobalMessage("未找到所选分类图标，请刷新后重试。");
      return;
    }
    const assetName = `${entry.libraryLabel || entry.libraryId} / ${entry.categoryLabel || entry.categoryId} / ${entry.name || entry.iconId}`;
    if (imageTarget.kind !== "stateIconDrawing") {
      const iconUrl = entry.url;
      if (!iconUrl) {
        showGlobalMessage("未找到所选分类图标文件地址，请刷新后重试。");
        return;
      }
      if (imageTarget.kind === "stateIconFrameBackground") {
        setStateIconDrawingDialog((current: any) =>
          current
            ? {
                ...current,
                frame: {
                  ...STATE_ICON_DRAFT_FRAME,
                  ...(current.frame ?? {}),
                  backgroundImage: iconUrl,
                  backgroundImageAssetId: ""
                }
              }
            : current
        );
        setImageTarget(null);
        writeOperationLog?.(`选择图案背景图标：${assetName}`);
        return;
      }
      if (imageTarget.kind === "canvasIcon") {
        const baseTemplate = libraryTemplateByKind?.get("static-image");
        if (!baseTemplate) {
          showGlobalMessage("未找到静态图片图元定义，无法插入图标。");
          return;
        }
        // 获取 SVG 内容转为 data URL，确保内联渲染（外部 SVG 文件在 <image href> 中可能不渲染）
        let imageData = iconUrl;
        try {
          const response = await fetch(iconUrl);
          if (response.ok) {
            imageData = `data:image/svg+xml,${encodeURIComponent(await response.text())}`;
          }
        } catch { /* 回退到 URL 路径 */ }
        startLibraryDevicePlacement({
          ...baseTemplate,
          label: entry.name || baseTemplate.label || "图标",
          params: {
            ...baseTemplate.params,
            text: entry.name || baseTemplate.params?.text || "",
            backgroundImage: imageData,
            backgroundImageAssetId: ""
          }
        });
        setImageTarget(null);
        writeOperationLog?.(`从分类图标库选择图标：${assetName}`);
        return;
      }
      pushUndoSnapshot?.();
      if (imageTarget.kind === "canvas") {
        setCanvasBackgroundImageAssetId("");
        setCanvasBackgroundImage(iconUrl);
      } else {
        updateGraphNodeById(imageTarget.nodeId, (node: any) =>
          imageTarget.kind === "nodeForeground"
            ? { ...node, params: { ...node.params, foregroundImageAssetId: "", foregroundImage: iconUrl } }
            : { ...node, params: { ...node.params, backgroundImageAssetId: "", backgroundImage: iconUrl } }
        );
      }
      setImageTarget(null);
      writeOperationLog?.(`从分类图标库选择图片：${assetName}`);
      return;
    }
    let svgSource = "";
    try {
      const response = await fetch(entry.url);
      svgSource = response.ok ? await response.text() : "";
    } catch {
      svgSource = "";
    }
    if (!svgSource) {
      showGlobalMessage("读取分类图标失败。");
      return;
    }
    const importedElements = createEditableStateIconElementsFromSvgSource(svgSource, assetName, { preserveImportedSvg: true });
    const fallbackElements = importedElements.length > 0
      ? importedElements
      : [createImportedStateIconElement("imported-svg", svgSource, assetName)];
    const selectedElementId = fallbackElements[0]?.id ?? "";
    setStateIconDrawingDialog((current: any) =>
      current
        ? (pushStateIconDrawingHistorySnapshot(stateIconDrawingHistoryRef, current.elements), {
            ...current,
            elements: [...current.elements, ...fallbackElements],
            selectedElementId,
            selectedElementIds: selectedElementId ? [selectedElementId] : [],
            pendingElementKind: undefined,
            pendingStaticTemplate: undefined,
            drawingDraft: undefined
          })
        : current
    );
    setImageTarget(null);
    writeOperationLog?.(`从分类图标库导入元件图案：${assetName}`);
  };
}

export function createClearSelectedImage(__appScope: Record<string, any>) {
  return () => {
  const { imageTarget, pushUndoSnapshot, setCanvasBackgroundImage, setCanvasBackgroundImageAssetId, setCanvasBackgroundImageFit, setImageTarget, setStateIconDrawingDialog, updateGraphNodeById } = __appScope;
    if (!imageTarget) {
      return;
    }
    if (imageTarget.kind === "canvasIcon" || imageTarget.kind === "stateIconDrawing") {
      setImageTarget(null);
      return;
    }
    if (imageTarget.kind === "stateIconFrameBackground") {
      setStateIconDrawingDialog((current: any) =>
        current
          ? {
              ...current,
              frame: {
                ...STATE_ICON_DRAFT_FRAME,
                ...(current.frame ?? {}),
                backgroundImage: "",
                backgroundImageAssetId: "",
                backgroundImageFit: "cover"
              }
            }
          : current
      );
      setImageTarget(null);
      return;
    }
    pushUndoSnapshot();
    if (imageTarget.kind === "canvas") {
      setCanvasBackgroundImage("");
      setCanvasBackgroundImageAssetId("");
      setCanvasBackgroundImageFit?.("cover");
    } else {
      updateGraphNodeById(imageTarget.nodeId, (node: any) =>
        imageTarget.kind === "nodeForeground"
          ? {
              ...node,
              params: {
                ...node.params,
                foregroundImage: "",
                foregroundImageAssetId: "",
                foregroundImageFit: "cover"
              }
            }
          : {
              ...node,
              params: {
                ...node.params,
                backgroundImage: "",
                backgroundImageAssetId: "",
                backgroundImageFit: "cover"
              }
            }
      );
    }
    setImageTarget(null);
  };
}

export function createClearSelectedImageForNode(__appScope: Record<string, any>) {
  return (nodeId: string, target: "background" | "foreground") => {
  const { pushUndoSnapshot, updateGraphNodeById } = __appScope;
    pushUndoSnapshot();
    updateGraphNodeById(nodeId, (node: any) => ({
      ...node,
      params:
        target === "foreground"
          ? { ...node.params, foregroundImage: "", foregroundImageAssetId: "", foregroundImageFit: "cover" }
          : { ...node.params, backgroundImage: "", backgroundImageAssetId: "", backgroundImageFit: "cover" }
    }));
  };
}

export function createCreateImageFolder(__appScope: Record<string, any>) {
  return async () => {
  const { createBackendImageFolder, refreshImageFolders, setActiveImageFolderId } = __appScope;
    const inputName = await promptText("请输入图片文件夹名称", "新建文件夹");
    if (inputName === null) {
      return;
    }
    const name = inputName.trim();
    if (!name) {
      showGlobalMessage("图片文件夹名称不能为空。");
      return;
    }
    try {
      const folder = await createBackendImageFolder(name);
      await refreshImageFolders();
      setActiveImageFolderId(folder.id);
    } catch (error) {
      showGlobalMessage(error instanceof Error ? error.message : "新建图片文件夹失败。");
    }
  };
}

export function createRenameImageFolder(__appScope: Record<string, any>) {
  return async () => {
  const { activeImageFolderId, imageFolders, refreshImageFolders, renameBackendImageFolder } = __appScope;
    const folder = imageFolders.find((item: any) => item.id === activeImageFolderId);
    if (!folder || folder.id === "root") {
      showGlobalMessage("默认文件夹不能重命名。");
      return;
    }
    const inputName = await promptText("请输入新的图片文件夹名称", folder.name);
    if (inputName === null) {
      return;
    }
    const name = inputName.trim();
    if (!name) {
      showGlobalMessage("图片文件夹名称不能为空。");
      return;
    }
    try {
      await renameBackendImageFolder(folder.id, name);
      await refreshImageFolders();
    } catch (error) {
      showGlobalMessage(error instanceof Error ? error.message : "重命名图片文件夹失败。");
    }
  };
}

export function createDeleteImageFolder(__appScope: Record<string, any>) {
  return async () => {
  const { activeImageFolderId, deleteBackendImageFolder, imageFolders, refreshImageFolders, setActiveImageFolderId } = __appScope;
    const folder = imageFolders.find((item: any) => item.id === activeImageFolderId);
    if (!folder || folder.id === "root") {
      showGlobalMessage("默认文件夹不能删除。");
      return;
    }
    if (!await showGlobalConfirm(`删除图片文件夹“${folder.name}”？文件夹内图片将移回默认文件夹。`)) {
      return;
    }
    try {
      await deleteBackendImageFolder(folder.id);
      setActiveImageFolderId("root");
      await refreshImageFolders();
    } catch (error) {
      showGlobalMessage(error instanceof Error ? error.message : "删除图片文件夹失败。");
    }
  };
}
