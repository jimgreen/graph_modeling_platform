import type { ModelNode, Point } from "./model";
import { getTerminalPoint, isStaticNode } from "./model";
import type { MeasurementGroup, MeasurementItemBinding, PlatformMeasurementConfig } from "./measurements";
import { measurementFontScaleForNode, measurementOffsetScaleForNode, resolveMeasurementItemDisplay } from "./measurements";
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
  const transform = `translate(${formatSvgNumber(center.x)} ${formatSvgNumber(center.y)})`;
  const commonAttributes = `${options.attributes ? `${options.attributes} ` : ""}transform="${transform}" ${svgNodeLabelBaseAttributes(node)}`;
  const stylePrefix = options.visible === false ? "display:none; " : "";
  if (nodeLabelVertical(node)) {
    const segments = nodeLabelVerticalSegments(text);
    return segments
      .map((segment, index) => {
        const tokenId = segments.length === 1 ? id : `${id}_${index + 1}`;
        return `<text id="${escapeXml(tokenId)}" class="export-node-label vertical node-label-vertical-token ${segment.numeric ? "numeric" : ""}" ${commonAttributes} x="0" y="${formatSvgNumber(nodeLabelVerticalTokenY(index, segments.length, node))}" text-anchor="middle" style="${stylePrefix}writing-mode: horizontal-tb; text-orientation: mixed; letter-spacing: 0;">${escapeXml(segment.text)}</text>`;
      })
      .join("\n");
  }
  return `<text id="${escapeXml(id)}" class="export-node-label horizontal" ${commonAttributes} x="0" y="0" text-anchor="${escapeXml(nodeLabelTextAnchor(node))}" style="${stylePrefix}writing-mode: horizontal-tb;">${escapeXml(text)}</text>`;
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
  const layerDefs = root.querySelectorAll("[data-export-layer-def]");
  layerDefs.forEach((layer) => {
    const id = layer.getAttribute("data-export-layer-def");
    if (id) {
      layerState[id] = layer.getAttribute("data-export-layer-visible") !== "0";
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
    root.querySelectorAll("[data-export-edge-id]").forEach((edge) => {
      const sourceLayerId = edge.getAttribute("data-export-source-layer-id") || "";
      const targetLayerId = edge.getAttribute("data-export-target-layer-id") || "";
      edge.style.display = exportSvgLayerVisible(sourceLayerId) && exportSvgLayerVisible(targetLayerId) ? "" : "none";
    });
    const activeLayerId = root.getAttribute("data-export-active-layer-id") || "";
    root.querySelectorAll("[data-export-button-action='layer']").forEach((button) => {
      const targetLayerIds = exportSvgButtonTargetLayerIds(button);
      button.classList.toggle("export-active-layer-button", targetLayerIds.includes(activeLayerId));
    });
  }
  function exportSvgButtonTargetLayerIds(button) {
    const encodedLayerIds = button.getAttribute("data-export-button-target-layer-ids") || button.getAttribute("data-export-button-target-layer-id") || "";
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
    root.setAttribute("data-export-active-layer-id", validLayerIds[0]);
    exportSvgApplyLayerVisibility();
  }
  function exportSvgActivateLayer(layerId) {
    exportSvgActivateLayers([layerId]);
  }
  root.exportSvgApplyLayerVisibility = exportSvgApplyLayerVisibility;
  root.exportSvgActivateLayer = exportSvgActivateLayer;
  root.exportSvgActivateLayers = exportSvgActivateLayers;
  root.querySelectorAll("[data-export-button-action='layer']").forEach((button) => {
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

export function exportDeviceMetadataAttributes(node: ModelNode) {
  if (isStaticNode(node)) {
    return "";
  }
  return [
    `idx="${escapeXml(node.params.idx ?? "")}"`,
    `name="${escapeXml(node.name)}"`,
    `dev-id="${escapeXml(node.id)}"`,
    `dev-kind="${escapeXml(node.kind)}"`
  ].join(" ");
}

export function exportMeasurementGroupMetadataAttributes(node: ModelNode, group: MeasurementGroup) {
  const idx = String(node.params.idx ?? "").trim();
  const terminalId = String(group.terminalId ?? "").trim();
  return [
    `mg="${escapeXml(group.id)}"`,
    `dev="${escapeXml(node.id)}"`,
    idx ? `idx="${escapeXml(idx)}"` : "",
    `name="${escapeXml(node.name)}"`,
    `kind="${escapeXml(node.kind)}"`,
    terminalId ? `term="${escapeXml(terminalId)}"` : ""
  ].filter(Boolean).join(" ");
}

export function exportMeasurementItemMetadataAttributes(
  _node: ModelNode,
  group: MeasurementGroup,
  item: MeasurementItemBinding,
  display: { label: string; unit: string }
) {
  const measurementName = (item.name ?? display.label ?? item.measurementTypeId).trim();
  const role = String(item.role ?? "").trim();
  const terminalId = String(group.terminalId ?? "").trim();
  return [
    `mid="${escapeXml(item.id)}"`,
    `mn="${escapeXml(measurementName)}"`,
    `mt="${escapeXml(item.measurementTypeId)}"`,
    `mf="${escapeXml(item.sourcePoint)}"`,
    role ? `mr="${escapeXml(role)}"` : "",
    `mu="${escapeXml(display.unit)}"`,
    `mg="${escapeXml(group.id)}"`,
    terminalId ? `term="${escapeXml(terminalId)}"` : ""
  ].filter(Boolean).join(" ");
}

export const exportMeasurementGroupBackgroundColor = (group: MeasurementGroup) => group.backgroundColor ?? "rgba(255, 255, 255, 0.84)";
export const exportMeasurementGroupBorderColor = (group: MeasurementGroup) => group.borderColor ?? "rgba(100, 116, 139, 0.36)";
export const exportMeasurementGroupBorderWidth = (group: MeasurementGroup) =>
  group.borderStyle === "none" ? 0 : clampNumber(Number(group.borderWidth ?? 1), 0, 12);
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
  usedSvgIds?: Set<string>
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
  const rowsMarkup = metrics.rows.map((row, index) => {
    const col = metrics.columns <= 1 ? 0 : index % metrics.columns;
    const rowIndex = metrics.columns <= 1 ? index : Math.floor(index / metrics.columns);
    const textX = -metrics.width / 2 + col * metrics.columnWidth + 7;
    const textY = -metrics.height / 2 + rowIndex * metrics.lineHeight + metrics.lineHeight / 2;
    const textGap = Math.max(4, row.fontSize * 0.36);
    const textWidth = (text: string) => text.length * row.fontSize * 0.58;
    const labelWidth = row.labelText ? textWidth(row.labelText) : 0;
    const valueWidth = textWidth(row.valueText);
    const valueX = textX + labelWidth + (row.labelText ? textGap : 0);
    const unitX = valueX + valueWidth + (row.unitText ? textGap : 0);
    const itemMetadata = exportMeasurementItemMetadataAttributes(node, group, row.item, row.display);
    const commonAttributes = `y="${formatSvgNumber(textY)}" dominant-baseline="middle" fill="${escapeXml(row.display.color)}" font-family="${escapeXml(row.display.fontFamily)}" font-size="${formatSvgNumber(row.fontSize)}" font-weight="${escapeXml(row.display.fontWeight)}" font-style="${escapeXml(row.display.fontStyle)}" text-decoration="${escapeXml(row.display.textDecoration)}"`;
    const textIdAttribute = (suffix: string, fallback: string) => {
      const textId = usedSvgIds ? exportSvgUniqueId(`${suffix}${index + 1}`, usedSvgIds, fallback) : "";
      return textId ? ` id="${escapeXml(textId)}"` : "";
    };
    const labelMarkup = row.labelText
      ? `<text${textIdAttribute("ml", "ml")} class="ml" ${commonAttributes} x="${formatSvgNumber(textX)}">${escapeXml(row.labelText)}</text>`
      : "";
    const valueMarkup = `<text${textIdAttribute("mv", "mv")} class="mv" mv="1" ${itemMetadata} ${commonAttributes} x="${formatSvgNumber(valueX)}">${escapeXml(row.valueText)}</text>`;
    const unitMarkup = row.unitText
      ? `<text${textIdAttribute("mu", "mu")} class="mu" ${commonAttributes} x="${formatSvgNumber(unitX)}">${escapeXml(row.unitText)}</text>`
      : "";
    return `${labelMarkup}${valueMarkup}${unitMarkup}`;
  }).join("");
  return `<g class="mg" transform="translate(${formatSvgNumber(position.x)} ${formatSvgNumber(position.y)})" ${exportMeasurementGroupMetadataAttributes(node, group)}>
  <title>${escapeXml(`${node.name} 动态量测`)}</title>
  <rect class="mg-bg" x="${formatSvgNumber(-metrics.width / 2)}" y="${formatSvgNumber(-metrics.height / 2)}" width="${formatSvgNumber(metrics.width)}" height="${formatSvgNumber(metrics.height)}" rx="4" fill="${escapeXml(exportMeasurementGroupBackgroundColor(group))}" stroke="${escapeXml(exportMeasurementGroupBorderColor(group))}" stroke-width="${formatSvgNumber(exportMeasurementGroupBorderWidth(group))}"${borderDashAttribute}/>
  ${rowsMarkup}
</g>`;
}
