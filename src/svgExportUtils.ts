import type { ModelNode, Point } from "./model";
import { getTerminalPoint, inferESection, isStaticNode } from "./model";
import type { MeasurementGroup, MeasurementItemBinding, PlatformMeasurementConfig } from "./measurements";
import { DEFAULT_MEASUREMENT_GROUP_BACKGROUND_COLOR, DEFAULT_MEASUREMENT_GROUP_BORDER_COLOR, DEFAULT_MEASUREMENT_GROUP_BORDER_STYLE, measurementFontScaleForNode, measurementOffsetScaleForNode, resolveMeasurementItemDisplay } from "./measurements";
import { escapeXml, formatSvgNumber, svgStrokeDashArray } from "./svgUtils";
import { nodeLabelText, nodeLabelFontSize, nodeLabelShouldRender, nodeLabelTextAnchor, nodeLabelTransform, nodeLabelVertical, nodeLabelVerticalSegments, nodeLabelVerticalTokenY, nodeLabelCanvasCenter } from "./nodeLabelUtils";
import { clampNumber } from "./canvasViewport";

function svgNodeLabelBaseAttributes(node: ModelNode) {
  return `dominant-baseline="middle" fill="${escapeXml(node.params._labelColor || "#334155")}" font-family="${escapeXml(node.params._labelFontFamily || "Arial")}" font-size="${formatSvgNumber(nodeLabelFontSize(node))}" font-weight="${escapeXml(node.params._labelFontWeight || "500")}" font-style="${escapeXml(node.params._labelFontStyle || "normal")}" text-decoration="${escapeXml(node.params._labelTextDecoration || "none")}" paint-order="stroke" stroke="rgba(255,255,255,0.85)" stroke-width="3" stroke-linejoin="round"`;
}

function buildSvgNodeLabelTextMarkup(node: ModelNode) {
  const text = nodeLabelText(node);
  if (!text) {
    return "";
  }
  const baseAttributes = svgNodeLabelBaseAttributes(node);
  if (nodeLabelVertical(node)) {
    return nodeLabelVerticalSegments(text)
      .map(
        (segment, index) =>
          `<text class="node-label-vertical-token ${segment.numeric ? "numeric" : ""}" x="0" y="${formatSvgNumber(nodeLabelVerticalTokenY(index, nodeLabelVerticalSegments(text).length, node))}" text-anchor="middle" ${baseAttributes} style="writing-mode: horizontal-tb; text-orientation: mixed; letter-spacing: 0;">${escapeXml(segment.text)}</text>`
      )
      .join("");
  }
  return `<text x="0" y="0" text-anchor="${escapeXml(nodeLabelTextAnchor(node))}" ${baseAttributes} style="writing-mode: horizontal-tb;">${escapeXml(text)}</text>`;
}

export function buildSvgNodeLabelMarkup(node: ModelNode) {
  const text = nodeLabelText(node);
  if (!nodeLabelShouldRender(node, true) || !text) {
    return "";
  }
  return `<g class="export-node-label ${nodeLabelVertical(node) ? "vertical" : "horizontal"}" transform="${nodeLabelTransform(node)}">${buildSvgNodeLabelTextMarkup(node)}</g>`;
}

export function buildSvgNodeLabelTextElementsMarkup(
  node: ModelNode,
  id: string,
  options: { attributes?: string; visible?: boolean } = {}
) {
  const text = nodeLabelText(node);
  if (!nodeLabelShouldRender(node, true) || !text) {
    return "";
  }
  const center = nodeLabelCanvasCenter(node);
  const commonAttributes = `${options.attributes ? `${options.attributes} ` : ""}${svgNodeLabelBaseAttributes(node)}`;
  const stylePrefix = options.visible === false ? "display:none; " : "";
  if (nodeLabelVertical(node)) {
    const segments = nodeLabelVerticalSegments(text);
    return segments
      .map((segment, index) => {
        const tokenId = segments.length === 1 ? id : `${id}_${index + 1}`;
        const tokenY = center.y + nodeLabelVerticalTokenY(index, segments.length, node);
        return `<text id="${escapeXml(tokenId)}" ${commonAttributes} x="${formatSvgNumber(center.x)}" y="${formatSvgNumber(tokenY)}" text-anchor="middle" style="${stylePrefix}writing-mode: horizontal-tb; text-orientation: mixed; letter-spacing: 0;">${escapeXml(segment.text)}</text>`;
      })
      .join("\n");
  }
  return `<text id="${escapeXml(id)}" ${commonAttributes} x="${formatSvgNumber(center.x)}" y="${formatSvgNumber(center.y)}" text-anchor="${escapeXml(nodeLabelTextAnchor(node))}" style="${stylePrefix}writing-mode: horizontal-tb;">${escapeXml(text)}</text>`;
}

export function svgDisplayAttribute(visible: boolean) {
  return visible ? "" : ' style="display:none"';
}

export function exportSvgSafeId(value: string, fallback: string) {
  const normalized = value.trim().replace(/[^A-Za-z0-9_.:-]+/g, "_").replace(/^[^A-Za-z_]+/, "");
  return normalized || fallback;
}

export function exportSvgLayerId(value: string, fallback: string) {
  return `${exportSvgSafeId(value, fallback)}_Layer`;
}

export function exportSvgUniqueId(rawId: string, usedIds: Set<string>, fallback: string) {
  const baseId = exportSvgSafeId(rawId, fallback);
  let candidate = baseId;
  let index = 2;
  while (usedIds.has(candidate)) {
    candidate = `${baseId}_${index}`;
    index += 1;
  }
  usedIds.add(candidate);
  return candidate;
}

export function buildExportDeviceIdMap(nodes: readonly ModelNode[], usedIds: Set<string>) {
  const usedIndexesByType = new Map<string, Set<number>>();
  const staticNodesByType = new Map<string, ModelNode[]>();
  const result = new Map<string, string>();
  for (const node of nodes) {
    if (isStaticNode(node)) {
      const typeId = exportSvgSafeId(String(node.kind), "static");
      const typeNodes = staticNodesByType.get(typeId) ?? [];
      typeNodes.push(node);
      staticNodesByType.set(typeId, typeNodes);
      continue;
    }
    const typeId = exportSvgSafeId(inferESection(node.kind, node.params) || String(node.kind), "device");
    const usedIndexes = usedIndexesByType.get(typeId) ?? new Set<number>();
    usedIndexesByType.set(typeId, usedIndexes);
    const requestedIndexText = String(node.params.idx ?? "").trim();
    const requestedIndex = /^[1-9]\d*$/.test(requestedIndexText) ? Number.parseInt(requestedIndexText, 10) : 0;
    if (requestedIndex <= 0) {
      result.set(node.id, exportSvgUniqueId(node.id, usedIds, "device"));
      continue;
    }
    let exportIndex = requestedIndex;
    while (usedIndexes.has(exportIndex)) {
      exportIndex += 1;
    }
    usedIndexes.add(exportIndex);
    result.set(node.id, exportSvgUniqueId(`${typeId}-${exportIndex}`, usedIds, "device"));
  }

  for (const [typeId, typeNodes] of Array.from(staticNodesByType.entries()).sort(([left], [right]) => left.localeCompare(right))) {
    const usedIndexes = new Set<number>();
    const indexedNodes: Array<{ node: ModelNode; requestedIndex: number }> = [];
    const unindexedNodes: ModelNode[] = [];
    for (const node of typeNodes) {
      const requestedIndexText = String(node.params.idx ?? "").trim();
      const requestedIndex = /^[1-9]\d*$/.test(requestedIndexText) ? Number.parseInt(requestedIndexText, 10) : 0;
      if (requestedIndex > 0) {
        indexedNodes.push({ node, requestedIndex });
      } else {
        unindexedNodes.push(node);
      }
    }
    indexedNodes.sort((left, right) => left.requestedIndex - right.requestedIndex || left.node.id.localeCompare(right.node.id));
    for (const { node, requestedIndex } of indexedNodes) {
      let exportIndex = requestedIndex;
      while (usedIndexes.has(exportIndex)) {
        exportIndex += 1;
      }
      usedIndexes.add(exportIndex);
      result.set(node.id, exportSvgUniqueId(`${typeId}-${exportIndex}`, usedIds, "static"));
    }
    unindexedNodes.sort((left, right) => left.id.localeCompare(right.id));
    let exportIndex = 1;
    for (const node of unindexedNodes) {
      while (usedIndexes.has(exportIndex)) {
        exportIndex += 1;
      }
      usedIndexes.add(exportIndex);
      result.set(node.id, exportSvgUniqueId(`${typeId}-${exportIndex}`, usedIds, "static"));
      exportIndex += 1;
    }
  }
  return result;
}

export function exportSvgLayerScriptMarkup(includeScript: boolean) {
  if (!includeScript) {
    return "";
  }
  return `<style><![CDATA[
.export-static-button { cursor: pointer; }
.export-static-button.export-active-layer-button { filter: drop-shadow(0 0 5px rgba(37, 99, 235, 0.42)); }
]]></style>
<script><![CDATA[
(function () {
  const root = document.currentScript && document.currentScript.ownerSVGElement;
  if (!root) {
    return;
  }
  const layerState = Object.create(null);
  const layerDefs = root.querySelectorAll(".export-layer-definitions > [layer-id]");
  layerDefs.forEach((layer) => {
    const id = layer.getAttribute("layer-id");
    if (id) {
      layerState[id] = layer.getAttribute("visible") !== "0";
    }
  });
  function exportSvgLayerVisible(layerId) {
    return !layerId || layerState[layerId] !== false;
  }
  function exportSvgApplyLayerVisibility() {
    root.querySelectorAll("[layer-id]").forEach((node) => {
      const layerId = node.getAttribute("layer-id") || "";
      node.style.display = exportSvgLayerVisible(layerId) ? "" : "none";
    });
    root.querySelectorAll("[edge-id]").forEach((edge) => {
      const sourceLayerId = edge.getAttribute("source-layer-id") || "";
      const targetLayerId = edge.getAttribute("target-layer-id") || "";
      edge.style.display = exportSvgLayerVisible(sourceLayerId) && exportSvgLayerVisible(targetLayerId) ? "" : "none";
    });
    const activeLayerId = root.getAttribute("active-layer-id") || "";
    root.querySelectorAll("[action='layer']").forEach((button) => {
      const targetLayerIds = exportSvgButtonTargetLayerIds(button);
      button.classList.toggle("export-active-layer-button", targetLayerIds.includes(activeLayerId));
    });
  }
  function exportSvgButtonTargetLayerIds(button) {
    const encodedLayerIds = button.getAttribute("target-layer-ids") || button.getAttribute("target-layer-id") || "";
    return encodedLayerIds.split(",").map((id) => id.trim()).filter(Boolean);
  }
  function exportSvgActivateLayers(layerIds) {
    const validLayerIds = layerIds.filter((layerId) => layerId && layerId in layerState);
    if (validLayerIds.length === 0) {
      return;
    }
    const targetLayerIdSet = new Set(validLayerIds);
    Object.keys(layerState).forEach((layerId) => {
      layerState[layerId] = targetLayerIdSet.has(layerId);
    });
    root.setAttribute("active-layer-id", validLayerIds[0]);
    exportSvgApplyLayerVisibility();
  }
  function exportSvgActivateLayer(layerId) {
    exportSvgActivateLayers([layerId]);
  }
  root.exportSvgApplyLayerVisibility = exportSvgApplyLayerVisibility;
  root.exportSvgActivateLayer = exportSvgActivateLayer;
  root.exportSvgActivateLayers = exportSvgActivateLayers;
  root.querySelectorAll("[action='layer']").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      const targetLayerIds = exportSvgButtonTargetLayerIds(button);
      exportSvgActivateLayers(targetLayerIds);
    });
  });
  exportSvgApplyLayerVisibility();
})();
]]></script>`;
}

export function exportDeviceMetadataAttributes(node: ModelNode, deviceId = node.id) {
  if (isStaticNode(node)) {
    return "";
  }
  return [
    `idx="${escapeXml(node.params.idx ?? "")}"`,
    `name="${escapeXml(node.name)}"`,
    `dev-id="${escapeXml(deviceId)}"`,
    `dev-kind="${escapeXml(node.kind)}"`
  ].join(" ");
}

function exportMeasurementScopedId(value: string, nodeId: string, deviceId: string) {
  const rawValue = String(value ?? "").trim();
  const internalNodeId = String(nodeId ?? "").trim();
  const stableDeviceId = String(deviceId ?? "").trim();
  if (!rawValue || !internalNodeId || !stableDeviceId || internalNodeId === stableDeviceId) {
    return rawValue;
  }
  return rawValue.replace(internalNodeId, stableDeviceId);
}

function exportMeasurementSourcePoint(value: string, nodeId: string, deviceId: string) {
  const rawValue = String(value ?? "").trim();
  const internalNodeId = String(nodeId ?? "").trim();
  const stableDeviceId = String(deviceId ?? "").trim();
  if (!rawValue || !internalNodeId || !stableDeviceId || internalNodeId === stableDeviceId) {
    return rawValue;
  }
  if (rawValue === internalNodeId) {
    return stableDeviceId;
  }
  return rawValue.startsWith(`${internalNodeId}.`)
    ? `${stableDeviceId}${rawValue.slice(internalNodeId.length)}`
    : rawValue;
}

function exportMeasurementValueElementId(itemId: string, deviceId: string) {
  const rawItemId = String(itemId ?? "").trim();
  const stableDeviceId = String(deviceId ?? "").trim();
  const itemKey = rawItemId.startsWith("measurement-")
    ? rawItemId.slice("measurement-".length)
    : [stableDeviceId, rawItemId].filter(Boolean).join("-");
  return `mv-${itemKey || stableDeviceId || "measurement"}`;
}

export function exportMeasurementGroupMetadataAttributes(node: ModelNode, group: MeasurementGroup, deviceId = node.id) {
  const idx = String(node.params.idx ?? "").trim();
  const terminalId = String(group.terminalId ?? "").trim();
  return [
    `mg="${escapeXml(exportMeasurementScopedId(group.id, node.id, deviceId))}"`,
    `dev="${escapeXml(deviceId)}"`,
    idx ? `idx="${escapeXml(idx)}"` : "",
    `name="${escapeXml(node.name)}"`,
    `kind="${escapeXml(node.kind)}"`,
    terminalId ? `term="${escapeXml(terminalId)}"` : ""
  ].filter(Boolean).join(" ");
}

export function exportMeasurementItemMetadataAttributes(item: MeasurementItemBinding, nodeId = "", deviceId = nodeId) {
  const role = String(item.role ?? "").trim();
  return [
    `mid="${escapeXml(exportMeasurementScopedId(item.id, nodeId, deviceId))}"`,
    `mt="${escapeXml(item.measurementTypeId)}"`,
    `mf="${escapeXml(exportMeasurementSourcePoint(item.sourcePoint, nodeId, deviceId))}"`,
    role ? `mr="${escapeXml(role)}"` : ""
  ].filter(Boolean).join(" ");
}

export const exportMeasurementGroupBackgroundColor = (group: MeasurementGroup) => group.backgroundColor ?? DEFAULT_MEASUREMENT_GROUP_BACKGROUND_COLOR;
export const exportMeasurementGroupBorderColor = (group: MeasurementGroup) => group.borderColor ?? DEFAULT_MEASUREMENT_GROUP_BORDER_COLOR;
export const exportMeasurementGroupBorderWidth = (group: MeasurementGroup) =>
  (group.borderStyle ?? DEFAULT_MEASUREMENT_GROUP_BORDER_STYLE) === "none"
    ? 0
    : clampNumber(Number(group.borderWidth ?? 1), 0, 12);
export const exportMeasurementGroupBorderDashArray = (group: MeasurementGroup) =>
  exportMeasurementGroupBorderWidth(group) <= 0 || group.borderStyle === "none"
    ? undefined
    : svgStrokeDashArray(group.borderStyle);

export function exportMeasurementGroupAnchorPoint(node: ModelNode, group: MeasurementGroup): Point {
  if (group.terminalId && node.terminals.some((terminal) => terminal.id === group.terminalId)) {
    return getTerminalPoint(node, group.terminalId);
  }
  return node.position;
}

export function exportMeasurementGroupLocalOffset(node: ModelNode, group: MeasurementGroup): Point {
  const offsetScale = measurementOffsetScaleForNode(node);
  return {
    x: group.offset.x * offsetScale.x,
    y: group.offset.y * offsetScale.y
  };
}

export function exportMeasurementGroupMetrics(node: ModelNode, group: MeasurementGroup, measurementConfig: PlatformMeasurementConfig) {
  if (!group.visible) {
    return null;
  }
  const measurementFontScale = measurementFontScaleForNode(node);
  const rows = group.items.flatMap((item) => {
    const display = resolveMeasurementItemDisplay({ config: measurementConfig, node, group, item });
    if (!display.visible) {
      return [];
    }
    const label = group.labelVisible === false ? "" : display.label;
    const unit = group.unitVisible === false ? "" : display.unit;
    const valueText = "--";
    const text = [label, valueText, unit].filter(Boolean).join(" ");
    return [{ item, display, labelText: label, valueText, unitText: unit, text, fontSize: display.fontSize * measurementFontScale }];
  });
  if (rows.length === 0) {
    return null;
  }
  const maxFontSize = Math.max(...rows.map((row) => row.fontSize));
  const lineHeight = Math.max(16, maxFontSize + 6);
  const columnWidth = Math.max(72, Math.max(...rows.map((row) => row.text.length * row.fontSize * 0.58)) + 12);
  const columns = group.layout === "grid" ? 2 : group.layout === "horizontal" ? rows.length : 1;
  const width = Math.max(64, columnWidth * columns);
  const height = Math.max(lineHeight, Math.ceil(rows.length / columns) * lineHeight);
  return { rows, maxFontSize, lineHeight, columnWidth, columns, width, height };
}

export function buildExportMeasurementGroupMarkup(
  node: ModelNode,
  group: MeasurementGroup,
  measurementConfig: PlatformMeasurementConfig,
  usedSvgIds?: Set<string>,
  options: { layerId?: string; visible?: boolean; deviceId?: string } = {}
) {
  const metrics = exportMeasurementGroupMetrics(node, group, measurementConfig);
  if (!metrics) {
    return "";
  }
  const anchor = exportMeasurementGroupAnchorPoint(node, group);
  const localOffset = exportMeasurementGroupLocalOffset(node, group);
  const position = { x: anchor.x + localOffset.x, y: anchor.y + localOffset.y };
  const borderDashArray = exportMeasurementGroupBorderDashArray(group);
  const borderDashAttribute = borderDashArray ? ` stroke-dasharray="${escapeXml(borderDashArray)}"` : "";
  const deviceId = options.deviceId ?? node.id;
  const rowsMarkup = metrics.rows.map((row, index) => {
    const col = metrics.columns <= 1 ? 0 : index % metrics.columns;
    const rowIndex = metrics.columns <= 1 ? index : Math.floor(index / metrics.columns);
    const textX = -metrics.width / 2 + col * metrics.columnWidth + 7;
    const textY = -metrics.height / 2 + rowIndex * metrics.lineHeight + metrics.lineHeight / 2;
    const textGap = Math.max(4, row.fontSize * 0.36);
    const exportedItemId = exportMeasurementScopedId(row.item.id, node.id, deviceId);
    const itemMetadata = exportMeasurementItemMetadataAttributes(row.item, node.id, deviceId);
    const commonAttributes = `x="${formatSvgNumber(textX)}" y="${formatSvgNumber(textY)}" dominant-baseline="middle" fill="${escapeXml(row.display.color)}" font-family="${escapeXml(row.display.fontFamily)}" font-size="${formatSvgNumber(row.fontSize)}" font-weight="${escapeXml(row.display.fontWeight)}" font-style="${escapeXml(row.display.fontStyle)}" text-decoration="${escapeXml(row.display.textDecoration)}"`;
    const labelMarkup = row.labelText
      ? `<tspan>${escapeXml(row.labelText)}</tspan>`
      : "";
    const valueTextId = usedSvgIds
      ? exportSvgUniqueId(exportMeasurementValueElementId(exportedItemId, deviceId), usedSvgIds, "mv")
      : "";
    const valueIdAttribute = valueTextId ? ` id="${escapeXml(valueTextId)}"` : "";
    const valueDxAttribute = row.labelText ? ` dx="${formatSvgNumber(textGap)}"` : "";
    const valueMarkup = `<tspan${valueIdAttribute} class="mv" ${itemMetadata}${valueDxAttribute}>${escapeXml(row.valueText)}</tspan>`;
    const unitMarkup = row.unitText
      ? `<tspan dx="${formatSvgNumber(textGap)}">${escapeXml(row.unitText)}</tspan>`
      : "";
    return `<text ${commonAttributes}>${labelMarkup}${valueMarkup}${unitMarkup}</text>`;
  }).join("");
  const layerAttribute = options.layerId ? ` layer-id="${escapeXml(options.layerId)}"` : "";
  return `<g class="mg"${layerAttribute} transform="translate(${formatSvgNumber(position.x)} ${formatSvgNumber(position.y)})" ${exportMeasurementGroupMetadataAttributes(node, group, deviceId)}${svgDisplayAttribute(options.visible !== false)}>
  <rect x="${formatSvgNumber(-metrics.width / 2)}" y="${formatSvgNumber(-metrics.height / 2)}" width="${formatSvgNumber(metrics.width)}" height="${formatSvgNumber(metrics.height)}" rx="4" fill="${escapeXml(exportMeasurementGroupBackgroundColor(group))}" stroke="${escapeXml(exportMeasurementGroupBorderColor(group))}" stroke-width="${formatSvgNumber(exportMeasurementGroupBorderWidth(group))}"${borderDashAttribute}/>
  ${rowsMarkup}
</g>`;
}
