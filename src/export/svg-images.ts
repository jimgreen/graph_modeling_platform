// SVG 导出「被引用的后端图片 id → 原始 href」纯函数（前端 .tsx 与后端 Node 适配层共用单源）。
// 来源：src/appExtracted/appDeviceDefinitionFactories.tsx createSvgExportReferencedImageHrefById（Task 19 迁出），
// .tsx 侧保留原工厂名 re-export，前端行为不变。
// 约束：不得 import 任何 .tsx 模块（server/svgExport.mjs 由 Node 原生直载）。
import type { DeviceStateVisual, DeviceTemplate, ModelNode } from "../model.ts";
import { resolveDeviceStateVisual as defaultResolveDeviceStateVisual } from "../model.ts";
import { apiPath } from "../config.ts";
import { backendImageIdFromHref as defaultBackendImageIdFromHref, decodeSvgImageSource } from "../svgUtils.ts";
import { resolveStateVisualImageHref as defaultResolveStateVisualImageHref } from "../staticRenderUtils.ts";

// 三个解析实现可注入：前端从 __appScope 取（原实现即如此，测试也以此打桩）；后端走默认实现。
export type SvgExportReferencedImageDeps = {
  backendImageIdFromHref?: (href: string) => string;
  resolveDeviceStateVisual?: (template: DeviceTemplate, node: ModelNode) => DeviceStateVisual | null;
  resolveStateVisualImageHref?: (visual: DeviceStateVisual | null | undefined, assets: Record<string, string>) => string;
};

// 背景页为前端运行时产物（backgroundPageRender）；后端无此数据，不传即跳过。
export type SvgExportReferencedImageSource = SvgExportReferencedImageDeps & {
  nodes?: ModelNode[];
  canvasBackgroundImage?: string;
  canvasBackgroundImageAssetId?: string;
  canvasBackgroundImageUrl?: string;
  backgroundPage?: {
    backgroundImageUrl?: string;
    nodes?: ModelNode[];
    project?: { canvasBackgroundImage?: string; nodes?: ModelNode[] } | null;
  } | null;
  libraryTemplateByKind?: Map<string, DeviceTemplate>;
  imageAssets?: Record<string, string>;
};

/** 收集 SVG 导出实际引用到的后端图片，返回 图片 id → 原始 href（含 SVG 内嵌图片的嵌套引用）。 */
export function collectSvgExportReferencedImageHrefById(source: SvgExportReferencedImageSource) {
  const {
    backendImageIdFromHref = defaultBackendImageIdFromHref,
    resolveDeviceStateVisual = defaultResolveDeviceStateVisual,
    resolveStateVisualImageHref = defaultResolveStateVisualImageHref
  } = source;
  const imageAssets = source.imageAssets ?? {};
  const hrefById = new Map<string, string>();
  const appendAssetId = (assetId?: string) => {
    const id = String(assetId ?? "").trim();
    if (id && !hrefById.has(id)) {
      hrefById.set(id, apiPath(`/images/${encodeURIComponent(id)}`));
    }
  };
  const appendHref = (href?: string) => {
    const value = String(href ?? "").trim();
    const id = backendImageIdFromHref(value);
    if (id && !hrefById.has(id)) {
      hrefById.set(id, value);
    }
    const svgSource = decodeSvgImageSource(value);
    if (!svgSource) {
      return;
    }
    for (const match of svgSource.matchAll(/\s(?:xlink:)?href\s*=\s*(["'])(.*?)\1/giu)) {
      const nestedHref = match[2] ?? "";
      const nestedId = backendImageIdFromHref(nestedHref);
      if (nestedId && !hrefById.has(nestedId)) {
        hrefById.set(nestedId, nestedHref);
      }
    }
  };
  const appendNodeImages = (nodeList?: ModelNode[]) => {
    for (const node of nodeList ?? []) {
      appendAssetId(node.params.backgroundImageAssetId);
      appendAssetId(node.params.foregroundImageAssetId);
      appendHref(node.params.backgroundImage);
      appendHref(node.params.foregroundImage);
      const template = source.libraryTemplateByKind?.get(node.kind);
      const stateVisual = template ? resolveDeviceStateVisual(template, node) : null;
      appendHref(resolveStateVisualImageHref(stateVisual, imageAssets));
    }
  };

  appendAssetId(source.canvasBackgroundImageAssetId);
  appendHref(source.canvasBackgroundImage);
  appendHref(source.canvasBackgroundImageUrl);
  appendNodeImages(source.nodes);
  appendHref(source.backgroundPage?.backgroundImageUrl);
  appendHref(source.backgroundPage?.project?.canvasBackgroundImage);
  appendNodeImages(source.backgroundPage?.nodes ?? source.backgroundPage?.project?.nodes);
  return hrefById;
}

/** 前端 __appScope 适配工厂（原 createSvgExportReferencedImageHrefById 语义不变，调用时读最新 scope）。 */
export function createSvgExportReferencedImageHrefById(__appScope: Record<string, any>) {
  return () => {
    // 保持原实现的 __appScope 解构形式：调用时取最新值，且受 appScopeContract 解构审计守护
    const { backendImageIdFromHref, backgroundPageRender, canvasBackgroundImage, canvasBackgroundImageAssetId, canvasBackgroundImageUrl, imageAssets, libraryTemplateByKind, nodes, resolveDeviceStateVisual, resolveStateVisualImageHref } = __appScope;
    return collectSvgExportReferencedImageHrefById({
      backendImageIdFromHref,
      resolveDeviceStateVisual,
      resolveStateVisualImageHref,
      nodes,
      canvasBackgroundImage,
      canvasBackgroundImageAssetId,
      canvasBackgroundImageUrl,
      backgroundPage: backgroundPageRender,
      libraryTemplateByKind,
      imageAssets
    });
  };
}
