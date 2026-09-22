// 单模板「图元正文」SVG 构建器（Node 可直载）。
//
// 来源：src/appExtracted/appPersistenceLibraryExport.tsx 的 buildDeviceTemplateIconSvg
// 与 componentExportImageWithoutTerminalConnectors 整段搬移，原处仅保留 re-export。
//
// 搬移动机：后端 /webgrp/symbol-export 要在服务端合成 <style>+<defs><symbol>，
// 必须与服务端同一份正文实现；而 .tsx 侧含 JSX 与 React 组件，后端无法 import。
// 搬移后「单模板正文」只有这一份实现，前端右键导出与后端 Symbol 导出同源。
//
// 约束：本文件不得 import 任何 .tsx 模块，也不得 import React。
// 依赖仅 ./svg.ts（buildSvgDocument）、../model.ts（createNodeFromTemplate）、
// ../svgUtils.ts（decodeSvgImageSource）——三者均为 Node 原生 TS 可直载模块。

import type { DeviceTemplate } from "../model.ts";
import { createNodeFromTemplate } from "../model.ts";
import { buildSvgDocument } from "./svg.ts";
import { decodeSvgImageSource } from "../svgUtils.ts";

// 自定义图元正文里「端子引线」分组的剥离：导出图元是静态正文，不应带交互期才需要的端子连接线。
const CUSTOM_DEVICE_TERMINAL_CONNECTOR_GROUP_PATTERN =
  /<g\b(?=[^>]*\bdata-custom-device-(?:persisted-terminals|persisted-terminal-connectors|terminal-connectors)\s*=\s*(?:"true"|'true'|true))[^>]*>[\s\S]*?<\/g>/giu;

function componentExportImageWithoutTerminalConnectors(value: unknown) {
  const href = String(value ?? "").trim();
  const source = decodeSvgImageSource(href);
  if (!source) {
    return href;
  }
  const cleanSource = source.replace(CUSTOM_DEVICE_TERMINAL_CONNECTOR_GROUP_PATTERN, "");
  if (cleanSource === source) {
    return href;
  }
  return href.startsWith("<svg")
    ? cleanSource
    : `data:image/svg+xml;charset=utf-8,${encodeURIComponent(cleanSource)}`;
}

/**
 * 单模板 → 自包含 SVG 正文。
 *
 * 导出的是「图元本体」而不是「某次实例化后的节点」：端子数据保留（变压器族绕组/引线据此
 * 走 var(--tN) 端子槽，保留画布上「每个绕组单独着色」的能力），但端子几何（引线 + 锚点）
 * 不写进正文（terminalGeometryVisible=false）—— 它由调用方按模板数据注入，见
 * src/symbolExportSvg.ts 的 terminalAttachmentMarkupForTemplate。故同 kind 的图元正文只随定义变化。
 */
export function buildDeviceTemplateIconSvg(template: DeviceTemplate) {
  const padding = 36;
  const templateWidth = Math.max(1, Number(template.size?.width) || 104);
  const templateHeight = Math.max(1, Number(template.size?.height) || 64);
  const width = Math.ceil(templateWidth + padding * 2);
  const height = Math.ceil(templateHeight + padding * 2);
  const visualParams = { ...template.params };
  for (const key of ["backgroundImage", "foregroundImage"] as const) {
    if (typeof visualParams[key] === "string") {
      visualParams[key] = componentExportImageWithoutTerminalConnectors(visualParams[key]);
    }
  }
  const visualTemplate: DeviceTemplate = {
    ...template,
    params: visualParams,
    stateDefinitions: template.stateDefinitions?.map((state) => ({
      ...state,
      ...(typeof state.icon === "string"
        ? { icon: componentExportImageWithoutTerminalConnectors(state.icon) }
        : {}),
      ...(typeof state.image === "string"
        ? { image: componentExportImageWithoutTerminalConnectors(state.image) }
        : {}),
      ...(typeof state.backgroundImage === "string"
        ? { backgroundImage: componentExportImageWithoutTerminalConnectors(state.backgroundImage) }
        : {})
    })),
    // 端子数据**保留**：变压器族的「每个绕组单独着色」靠端子槽 var(--tN) 实现
    // （见 buildTemplateTerminalSlotPaint），清空端子会让槽机制整套失效、绕组退化成单一字面色。
    // 端子几何（引线/锚点）由 terminalGeometryVisible=false 抑制，改由调用方注入 —— 见
    // src/symbolExportSvg.ts 的 terminalAttachmentMarkupForTemplate。
  };
  const node = createNodeFromTemplate(visualTemplate, { x: width / 2, y: height / 2 });
  node.id = `component-svg-${String(template.kind || "component").replace(/[^A-Za-z0-9_-]+/g, "_")}`;
  node.params = {
    ...node.params,
    _labelVisible: "0"
  };
  const svg = buildSvgDocument([node], [], {
    width,
    height,
    backgroundColor: "transparent",
    deviceTemplates: [visualTemplate],
    // 图元本体导出：绕组走带字面色兜底的端子槽，端子几何不写进正文（由注入点补画）
    terminalSlotPaint: true,
    terminalGeometryVisible: false
  });
  const sourceTerminalCount = Math.max(0, Math.floor(Number(template.terminalCount) || 0));
  return svg.replace(
    /<use\b(?=[^>]*\bdev-kind\s*=)/u,
    `<use data-export-source-terminal-count="${sourceTerminalCount}"`
  );
}
