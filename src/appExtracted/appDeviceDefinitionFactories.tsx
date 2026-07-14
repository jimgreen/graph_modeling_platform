// @ts-nocheck
import { buildEDeviceDefinitionFile, inferESection, parseEDeviceDefinitionFile, resolveDeviceParameterDefinitionExportSettings } from "../model";
import { clampNumber } from "../canvasViewport";
import { IMAGE_FIT_MODE_OPTIONS, imageFitPreserveAspectRatio, normalizeImageFitMode } from "../imageFit";
import { stateIconSvgVisibleViewBox } from "../stateIconDrawing";
import { decodeSvgImageSource } from "../svgUtils";
import { buildMeasurementProfilePositionDefinitions } from "../measurements";
import { measurementProfileItemsComplianceMessage } from "./appGraphMeasurementFactories";

const STATE_ICON_DRAFT_FRAME = {
  strokeStyle: "dashed",
  strokeWidth: 1.2,
  strokeColor: "#94a3b8",
  fillColor: "#ffffff",
  backgroundImage: "",
  backgroundImageAssetId: "",
  backgroundImageFit: "cover"
};

function normalizeStateIconFrameText(value: unknown) {
  return String(value ?? "").trim().toLowerCase();
}

function normalizeStateIconFrameNumber(value: unknown) {
  return Math.max(0, Number(value) || 0);
}

function stateIconDrawingFrameHasPersistedContent(frame: any) {
  if (!frame) {
    return false;
  }
  const mergedFrame = { ...STATE_ICON_DRAFT_FRAME, ...frame };
  return Boolean(
    normalizeStateIconFrameText(mergedFrame.backgroundImage) ||
    normalizeStateIconFrameText(mergedFrame.backgroundImageAssetId) ||
    normalizeStateIconFrameText(mergedFrame.fillColor) !== normalizeStateIconFrameText(STATE_ICON_DRAFT_FRAME.fillColor) ||
    normalizeStateIconFrameText(mergedFrame.strokeColor) !== normalizeStateIconFrameText(STATE_ICON_DRAFT_FRAME.strokeColor) ||
    normalizeStateIconFrameText(mergedFrame.strokeStyle) !== normalizeStateIconFrameText(STATE_ICON_DRAFT_FRAME.strokeStyle) ||
    normalizeStateIconFrameNumber(mergedFrame.strokeWidth) !== normalizeStateIconFrameNumber(STATE_ICON_DRAFT_FRAME.strokeWidth)
  );
}

const STATE_ICON_LINE_SHAPE_KINDS = new Set(["line", "polyline", "arc", "semicircle"]);
const STATE_ICON_CLOSED_SHAPE_KINDS = new Set(["point", "triangle", "rectangle", "square", "hexagon", "polygon", "circle", "semicircle", "ellipse", "text"]);
const STATE_ICON_STATIC_TEMPLATE_SECTION_ORDER = [
  "StaticTextSymbol",
  "StaticConnectorSymbol",
  "StaticBasicShape",
  "StaticMediaSymbol",
  "StaticFlowNode",
  "StaticContainerSymbol",
  "StaticAnnotationSymbol",
  "StaticButton"
];
const STATE_ICON_STATIC_TEMPLATE_SECTIONS_COVERED_BY_BASIC_TOOLS = new Set([
  "StaticTextSymbol",
  "StaticConnectorSymbol",
  "StaticBasicShape"
]);
const STATE_ICON_DRAWING_FRAME_WIDTH = 240;
const STATE_ICON_DRAWING_FRAME_HEIGHT = 160;

const deviceDefinitionComplianceKey = (value: unknown) => String(value ?? "").trim().toLowerCase();

const normalizeCustomDeviceDraftParamRows = (
  rows: readonly CustomParamDraft[],
  normalizeDefinitionRowEnumFields: <T extends DeviceParameterDefinition>(row: T) => T
): DeviceParameterDefinition[] =>
  rows.map((row) => normalizeDefinitionRowEnumFields({
    cnName: row.cnName.trim(),
    enName: row.enName.trim(),
    valueType: row.valueType,
    typicalValue: row.typicalValue.trim(),
    enumOptions: row.enumOptions,
    enumValues: row.enumValues,
    readonly: row.readonly,
    ...(typeof row.exportEnabled === "boolean" ? { exportEnabled: row.exportEnabled } : {}),
    ...(typeof row.exportName === "string" ? { exportName: row.exportName.trim() } : {})
  }));

const mergeDefaultAndCustomDefinitionRows = (
  defaultRows: readonly DeviceParameterDefinition[],
  draftRows: readonly DeviceParameterDefinition[],
  normalizeDefinitionRowEnumFields: <T extends DeviceParameterDefinition>(row: T) => T
) => {
  const defaultKeySet = new Set(defaultRows.map((row) => deviceDefinitionComplianceKey(row.enName)));
  const overrideRows = new Map(
    draftRows
      .filter((row) => defaultKeySet.has(deviceDefinitionComplianceKey(row.enName)))
      .map((row) => [deviceDefinitionComplianceKey(row.enName), row])
  );
  const definitions = defaultRows.map((row) => {
    const override = overrideRows.get(deviceDefinitionComplianceKey(row.enName));
    if (!override) {
      return row;
    }
    return normalizeDefinitionRowEnumFields({
      ...row,
      valueType: override.valueType,
      typicalValue: override.typicalValue,
      enumOptions: override.enumOptions,
      enumValues: override.enumValues,
      readonly: row.readonly,
      ...(typeof override.exportEnabled === "boolean" ? { exportEnabled: override.exportEnabled } : {}),
      ...(typeof override.exportName === "string" ? { exportName: override.exportName.trim() } : {})
    });
  });
  return {
    definitions,
    customRows: draftRows.filter((row) => !defaultKeySet.has(deviceDefinitionComplianceKey(row.enName)))
  };
};

const inlineDefaultIconBackgroundPatch = (__appScope: Record<string, any>, scope: "custom" | "definition") => {
  const { isDefaultStatePageId, stateIconDrawingInlineImage, stateIconDrawingInlineTarget } = __appScope;
  if (
    !stateIconDrawingInlineTarget ||
    stateIconDrawingInlineTarget.scope !== scope ||
    typeof isDefaultStatePageId !== "function" ||
    !isDefaultStatePageId(stateIconDrawingInlineTarget.rowId)
  ) {
    return null;
  }
  const backgroundImage = String(stateIconDrawingInlineImage ?? "");
  return {
    backgroundImage,
    backgroundImageAssetId: "",
    backgroundImageCleared: backgroundImage ? "" : "1"
  };
};

const parameterTypicalValueTypeError = (row: DeviceParameterDefinition) => {
  const value = String(row.typicalValue ?? "").trim();
  if (!value) {
    return "";
  }
  if (row.valueType === "integer" && !/^-?\d+$/.test(value)) {
    return "默认值必须是整数。";
  }
  if (row.valueType === "float" && !Number.isFinite(Number(value))) {
    return "默认值必须是数字。";
  }
  if (row.valueType === "numberEnum" || (row.valueType === "enum" && row.enumValueType === "number")) {
    if (!Number.isFinite(Number(value))) {
      return "默认值必须是数字枚举值。";
    }
    const enumValues = [
      ...(Array.isArray(row.enumValues) ? row.enumValues : []),
      ...(Array.isArray(row.enumOptions) ? row.enumOptions.map((option) => option?.value) : [])
    ].map((item) => String(item ?? "").trim()).filter(Boolean);
    const invalidEnumValue = enumValues.find((item) => !Number.isFinite(Number(item)));
    if (invalidEnumValue) {
      return `枚举值 ${invalidEnumValue} 与数字枚举类型不匹配。`;
    }
  }
  return "";
};

export const deviceParameterDefinitionsComplianceMessage = (rows: readonly DeviceParameterDefinition[]) => {
  const messages: string[] = [];
  const seenEnNames = new Map<string, number>();
  const seenExportNames = new Map<string, number>();
  rows.forEach((row, index) => {
    const rowLabel = `属性第 ${index + 1} 行`;
    const cnName = String(row.cnName ?? "").trim();
    const enName = String(row.enName ?? "").trim();
    if (!cnName) {
      messages.push(`${rowLabel}：中文名称不能为空。`);
    }
    if (!enName) {
      messages.push(`${rowLabel}：英文名称不能为空。`);
    } else {
      const key = deviceDefinitionComplianceKey(enName);
      const previousIndex = seenEnNames.get(key);
      if (previousIndex !== undefined) {
        messages.push(`${rowLabel}：英文名称 ${enName} 与第 ${previousIndex + 1} 行重复。`);
      } else {
        seenEnNames.set(key, index);
      }
    }
    const typeError = parameterTypicalValueTypeError(row);
    if (typeError) {
      messages.push(`${rowLabel}：${typeError}`);
    }
    if (row.exportEnabled === true) {
      const exportName = String(row.exportName ?? "").trim();
      if (!exportName) {
        messages.push(`${rowLabel}：启用导出时，导出名称不能为空。`);
      } else if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(exportName)) {
        messages.push(`${rowLabel}：导出名称 ${exportName} 只能包含英文字母、数字和下划线，且必须以英文字母开头。`);
      } else {
        const exportKey = deviceDefinitionComplianceKey(exportName);
        const previousIndex = seenExportNames.get(exportKey);
        if (previousIndex !== undefined) {
          messages.push(`${rowLabel}：导出名称 ${exportName} 与第 ${previousIndex + 1} 行重复。`);
        } else {
          seenExportNames.set(exportKey, index);
        }
      }
    }
  });
  return messages.join("\n");
};
const STATE_ICON_DRAWING_FRAME_GUIDE_RATIOS = [1 / 4, 1 / 3, 1 / 2, 2 / 3, 3 / 4];
const STATE_ICON_DRAWING_SMART_ALIGNMENT_TOLERANCE = 3;
const STATE_ICON_DRAWING_SMART_ALIGNMENT_GUIDE_PADDING = 8;
const STATE_ICON_DRAWING_MIN_FONT_SIZE = 8;

export function customDeviceDraftDirtyToken(draft: CustomDeviceDraft, anchors: readonly Point[] = [], measurementConfig: PlatformMeasurementConfig | null = null) {
  const terminalCount = Math.max(0, Math.round(draft.terminalCount || 0));
  return JSON.stringify({
    draft: {
      ...draft,
      error: "",
      terminalTypes: draft.terminalTypes.slice(0, terminalCount),
      terminalLabels: draft.terminalLabels.slice(0, terminalCount),
      terminalAnchors: anchors.slice(0, terminalCount).map((anchor) => ({ x: anchor.x, y: anchor.y })),
      terminalRoles: draft.terminalRoles.slice(0, terminalCount),
      terminalAssociations: draft.terminalAssociations.slice(0, terminalCount)
    },
    measurementConfig
  });
}

export function createSetCustomDeviceDraftCleanBaseline(__appScope: Record<string, any>) {
  return (draft: CustomDeviceDraft, anchors?: readonly Point[]) => {
  const { createDefaultCustomDeviceTerminalAnchors, customDeviceDraftCleanTokenRef, measurementConfigDraft, measurementConfigDraftRef } = __appScope;
    const nextAnchors = anchors ?? createDefaultCustomDeviceTerminalAnchors(draft.terminalCount, draft.terminalAnchors);
    customDeviceDraftCleanTokenRef.current = customDeviceDraftDirtyToken(
      draft,
      nextAnchors,
      measurementConfigDraftRef.current ?? measurementConfigDraft ?? null
    );
  };
}

export function createCustomDeviceDraftHasUnsavedChanges(__appScope: Record<string, any>) {
  return () => {
  const { customDeviceDraft, customDeviceDraftCleanTokenRef, customDeviceTerminalAnchors, measurementConfigDraft, measurementConfigDraftRef } = __appScope;
    const currentToken = customDeviceDraftDirtyToken(
      customDeviceDraft,
      customDeviceTerminalAnchors,
      measurementConfigDraftRef.current ?? measurementConfigDraft ?? null
    );
    return customDeviceDraftCleanTokenRef.current !== currentToken;
  };
}

const STATE_ICON_EDITABLE_STATIC_KIND_BY_TEMPLATE_KIND: Record<string, StateVisualShapeKind> = {
  "static-text": "text",
  "static-line": "line",
  "static-straight-connector": "line",
  "static-arrow-connector": "line",
  "static-double-arrow-connector": "line",
  "static-polyline": "polyline",
  "static-elbow-connector": "polyline",
  "static-circle": "circle",
  "static-ellipse": "ellipse",
  "static-rect": "rectangle",
  "static-point": "point",
  "static-ring": "point",
  "static-hexagon": "hexagon",
  "static-triangle": "triangle"
};

function stateIconBaseStaticTemplateKind(kind: string) {
  return String(kind ?? "").replace(/-vertical$/, "");
}

function stateIconStaticTemplateParam(template: any, key: string, fallback = "") {
  return String(template?.params?.[key] ?? fallback ?? "").trim();
}

function stateIconStaticTemplateNumberParam(template: any, key: string, fallback: number) {
  const parsed = Number.parseFloat(stateIconStaticTemplateParam(template, key));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function stateIconStaticTemplateStrokeStyle(template: any): "solid" | "dashed" | "dotted" {
  const value = stateIconStaticTemplateParam(template, "strokeStyle", "solid");
  return value === "dashed" || value === "dotted" ? value : "solid";
}

function stateIconLineCapFromStaticMarker(value: string | undefined | null) {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (normalized === "arrow") {
    return "arrow";
  }
  if (normalized === "dot" || normalized === "circle") {
    return "circle";
  }
  if (normalized === "triangle") {
    return "triangle";
  }
  if (normalized === "square" || normalized === "rect" || normalized === "rectangle") {
    return "square";
  }
  return "none";
}

export function createStateIconDrawingElementFromStaticTemplate(__appScope: Record<string, any>, template: any, row?: any) {
  const {
    createImportedStateIconElement,
    createStateIconDrawingElement,
    svgSourceFromDataUrl
  } = __appScope;
  const renderTemplateDefaultStateIconImage = typeof __appScope.createTemplateDefaultStateIconImage === "function"
    ? __appScope.createTemplateDefaultStateIconImage
    : createTemplateDefaultStateIconImage;
  const baseKind = stateIconBaseStaticTemplateKind(template?.kind);
  const editableKind = STATE_ICON_EDITABLE_STATIC_KIND_BY_TEMPLATE_KIND[baseKind];
  const size = template?.size ?? {};
  const templateWidth = Math.max(1, Number(size.width) || 96);
  const templateHeight = Math.max(1, Number(size.height) || 64);
  if (editableKind) {
    const base = createStateIconDrawingElement(editableKind, row);
    const text = stateIconStaticTemplateParam(template, "text", template?.label ?? base.text);
    const fillColor = stateIconStaticTemplateParam(template, "fillColor", base.fillColor);
    const strokeColor = stateIconStaticTemplateParam(template, "strokeColor", base.strokeColor);
    const textColor = stateIconStaticTemplateParam(template, "textColor", base.textColor);
    const element = {
      ...base,
      width: templateWidth,
      height: templateHeight,
      strokeWidth: Math.max(0, stateIconStaticTemplateNumberParam(template, "lineWidth", base.strokeWidth)),
      strokeColor: strokeColor || base.strokeColor,
      fillColor: fillColor || base.fillColor,
      textColor: textColor || base.textColor,
      text: text || template?.label || base.text,
      strokeStyle: stateIconStaticTemplateStrokeStyle(template),
      fontFamily: stateIconStaticTemplateParam(template, "fontFamily", base.fontFamily ?? "Arial, Microsoft YaHei"),
      fontSize: Math.max(1, stateIconStaticTemplateNumberParam(template, "fontSize", base.fontSize ?? 16)),
      fontWeight: stateIconStaticTemplateParam(template, "fontWeight", base.fontWeight ?? "400"),
      fontStyle: stateIconStaticTemplateParam(template, "fontStyle", base.fontStyle ?? "normal"),
      startCap: stateIconLineCapFromStaticMarker(stateIconStaticTemplateParam(template, "markerStart", base.startCap ?? "none")),
      endCap: stateIconLineCapFromStaticMarker(stateIconStaticTemplateParam(template, "markerEnd", base.endCap ?? "none"))
    };
    if (baseKind === "static-ring") {
      return {
        ...element,
        fillColor: "transparent",
        strokeWidth: Math.max(1, element.strokeWidth)
      };
    }
    return element;
  }
  const renderedImage = renderTemplateDefaultStateIconImage(__appScope, template, {
    size: { width: templateWidth, height: templateHeight },
    label: template?.label ?? ""
  });
  const svgSource = svgSourceFromDataUrl(renderedImage);
  return {
    ...createImportedStateIconElement(svgSource ? "imported-svg" : "image", svgSource || renderedImage, template?.label ?? template?.kind ?? "静态图元"),
    width: templateWidth,
    height: templateHeight,
    text: template?.label ?? template?.kind ?? "静态图元"
  };
}

function stateIconDrawingSelectedIds(dialog: any) {
  return dialog?.selectedElementIds?.length > 0
    ? dialog.selectedElementIds
    : [dialog?.selectedElementId].filter(Boolean);
}

function pushStateIconDrawingHistorySnapshot(historyRef: any, elements: any[]) {
  if (!historyRef) {
    return;
  }
  const snapshot = elements.map((element) => ({ ...element }));
  historyRef.current = [...(historyRef.current ?? []), snapshot].slice(-80);
}

function cloneStateIconDrawingElements(elements: any[], createId: () => string, offset = { x: 12, y: 12 }) {
  return elements.map((element) => ({
    ...element,
    id: createId(),
    x: element.x + offset.x,
    y: element.y + offset.y
  }));
}

export function normalizeStateIconDrawingFontSize(value: unknown, fallback: unknown = STATE_ICON_DRAWING_MIN_FONT_SIZE) {
  const fallbackNumber = Number(fallback);
  const fallbackSize = Number.isFinite(fallbackNumber)
    ? Math.max(STATE_ICON_DRAWING_MIN_FONT_SIZE, Math.floor(fallbackNumber))
    : STATE_ICON_DRAWING_MIN_FONT_SIZE;
  if (typeof value === "string" && value.trim() === "") {
    return fallbackSize;
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallbackSize;
  }
  return Math.max(STATE_ICON_DRAWING_MIN_FONT_SIZE, Math.floor(parsed));
}

export function formatStateIconDrawingNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);
  const fallbackNumber = Number(fallback);
  const safeFallback = Number.isFinite(fallbackNumber) ? fallbackNumber : 0;
  return (Number.isFinite(parsed) ? parsed : safeFallback).toFixed(2);
}

export function normalizeStateIconDrawingStrokeWidth(value: unknown, fallback = 0) {
  const parsed = Number(value);
  const fallbackNumber = Number(fallback);
  const safeFallback = Number.isFinite(fallbackNumber) ? fallbackNumber : 0;
  if (!Number.isFinite(parsed)) {
    return Math.max(0, Math.round(safeFallback));
  }
  return Math.max(0, Math.round(parsed));
}

function cutStateIconDrawingSelection(current: any, clipboardRef: any, historyRef: any) {
  if (!current) {
    return current;
  }
  const selectedIds = stateIconDrawingSelectedIds(current);
  if (selectedIds.length === 0) {
    return current;
  }
  const selectedSet = new Set(selectedIds);
  clipboardRef.current = current.elements.filter((element) => selectedSet.has(element.id)).map((element) => ({ ...element }));
  pushStateIconDrawingHistorySnapshot(historyRef, current.elements);
  return {
    ...current,
    elements: current.elements.filter((element) => !selectedSet.has(element.id)),
    selectedElementId: "",
    selectedElementIds: []
  };
}

function stateIconDrawingElementBounds(element: any) {
  const width = Math.max(1, Number(element.width) || 1);
  const height = Math.max(1, Number(element.height) || 1);
  return {
    left: element.x - width / 2,
    right: element.x + width / 2,
    top: element.y - height / 2,
    bottom: element.y + height / 2,
    centerX: element.x,
    centerY: element.y,
    width,
    height
  };
}

function stateIconDrawingSelectionBounds(elements: any[]) {
  if (elements.length === 0) {
    return null;
  }
  const bounds = elements.map(stateIconDrawingElementBounds);
  const left = Math.min(...bounds.map((item) => item.left));
  const right = Math.max(...bounds.map((item) => item.right));
  const top = Math.min(...bounds.map((item) => item.top));
  const bottom = Math.max(...bounds.map((item) => item.bottom));
  return {
    left,
    right,
    top,
    bottom,
    centerX: (left + right) / 2,
    centerY: (top + bottom) / 2
  };
}

function stateIconDrawingRectFromPoints(start: Point, current: Point) {
  return {
    left: Math.min(start.x, current.x),
    right: Math.max(start.x, current.x),
    top: Math.min(start.y, current.y),
    bottom: Math.max(start.y, current.y)
  };
}

function stateIconDrawingBoundsIntersectRect(bounds: any, rect: any) {
  return bounds.right >= rect.left && bounds.left <= rect.right && bounds.bottom >= rect.top && bounds.top <= rect.bottom;
}

export function stateIconDrawingElementIdsInRect(elements: any[], rect: { left: number; right: number; top: number; bottom: number }) {
  return elements
    .filter((element) => stateIconDrawingBoundsIntersectRect(stateIconDrawingElementBounds(element), rect))
    .map((element) => element.id);
}

function stateIconDrawingBoundsAnchors(bounds: any, axis: "x" | "y") {
  return axis === "x"
    ? [
        { key: "start", value: bounds.left, priority: 1 },
        { key: "center", value: bounds.centerX, priority: 0 },
        { key: "end", value: bounds.right, priority: 1 }
      ]
    : [
        { key: "start", value: bounds.top, priority: 1 },
        { key: "center", value: bounds.centerY, priority: 0 },
        { key: "end", value: bounds.bottom, priority: 1 }
      ];
}

function translatedStateIconDrawingBounds(bounds: any, delta: Point) {
  return {
    ...bounds,
    left: bounds.left + delta.x,
    right: bounds.right + delta.x,
    top: bounds.top + delta.y,
    bottom: bounds.bottom + delta.y,
    centerX: bounds.centerX + delta.x,
    centerY: bounds.centerY + delta.y
  };
}

function bestStateIconDrawingAlignmentSnap(axis: "x" | "y", movedBounds: any, candidates: any[], threshold: number) {
  let best: any = null;
  const movedAnchors = stateIconDrawingBoundsAnchors(movedBounds, axis);
  for (const candidate of candidates) {
    const candidateAnchors = candidate.anchors
      ? (candidate.anchors[axis] ?? [])
      : stateIconDrawingBoundsAnchors(candidate.bounds, axis);
    for (const movedAnchor of movedAnchors) {
      for (const candidateAnchor of candidateAnchors) {
        const adjustment = candidateAnchor.value - movedAnchor.value;
        const distance = Math.abs(adjustment);
        const priority = movedAnchor.priority + candidateAnchor.priority;
        if (distance > threshold) {
          continue;
        }
        if (best && (distance > best.distance || (distance === best.distance && priority >= best.priority))) {
          continue;
        }
        const guide = axis === "x"
          ? {
              id: `state-icon-vertical:${candidate.id}:${candidateAnchor.key}:${movedAnchor.key}`,
              orientation: "vertical",
              position: candidateAnchor.value,
              start: Math.min(movedBounds.top, candidate.bounds.top) - STATE_ICON_DRAWING_SMART_ALIGNMENT_GUIDE_PADDING,
              end: Math.max(movedBounds.bottom, candidate.bounds.bottom) + STATE_ICON_DRAWING_SMART_ALIGNMENT_GUIDE_PADDING
            }
          : {
              id: `state-icon-horizontal:${candidate.id}:${candidateAnchor.key}:${movedAnchor.key}`,
              orientation: "horizontal",
              position: candidateAnchor.value,
              start: Math.min(movedBounds.left, candidate.bounds.left) - STATE_ICON_DRAWING_SMART_ALIGNMENT_GUIDE_PADDING,
              end: Math.max(movedBounds.right, candidate.bounds.right) + STATE_ICON_DRAWING_SMART_ALIGNMENT_GUIDE_PADDING
            };
        best = { adjustment, distance, priority, guide };
      }
    }
  }
  return best;
}

function stateIconDrawingFrameAlignmentCandidates() {
  const verticalCandidates = STATE_ICON_DRAWING_FRAME_GUIDE_RATIOS.map((ratio) => {
    const x = STATE_ICON_DRAWING_FRAME_WIDTH * ratio;
    return {
      id: `frame-x-${ratio}`,
      bounds: {
        left: x,
        right: x,
        top: 0,
        bottom: STATE_ICON_DRAWING_FRAME_HEIGHT,
        centerX: x,
        centerY: STATE_ICON_DRAWING_FRAME_HEIGHT / 2
      },
      anchors: {
        x: [{ key: `frame-${ratio}`, value: x, priority: 2 }],
        y: []
      }
    };
  });
  const horizontalCandidates = STATE_ICON_DRAWING_FRAME_GUIDE_RATIOS.map((ratio) => {
    const y = STATE_ICON_DRAWING_FRAME_HEIGHT * ratio;
    return {
      id: `frame-y-${ratio}`,
      bounds: {
        left: 0,
        right: STATE_ICON_DRAWING_FRAME_WIDTH,
        top: y,
        bottom: y,
        centerX: STATE_ICON_DRAWING_FRAME_WIDTH / 2,
        centerY: y
      },
      anchors: {
        x: [],
        y: [{ key: `frame-${ratio}`, value: y, priority: 2 }]
      }
    };
  });
  return [...verticalCandidates, ...horizontalCandidates];
}

function stateIconDrawingPointAlignmentCandidate(id: string, x: number, y: number, priority: number) {
  return {
    id,
    bounds: {
      left: x,
      right: x,
      top: y,
      bottom: y,
      centerX: x,
      centerY: y
    },
    anchors: {
      x: [{ key: id, value: x, priority }],
      y: [{ key: id, value: y, priority }]
    }
  };
}

function stateIconDrawingTerminalFrame() {
  return {
    width: STATE_ICON_DRAWING_FRAME_WIDTH * 3 / 4,
    height: STATE_ICON_DRAWING_FRAME_HEIGHT * 3 / 4,
    centerX: STATE_ICON_DRAWING_FRAME_WIDTH / 2,
    centerY: STATE_ICON_DRAWING_FRAME_HEIGHT / 2,
    marginX: STATE_ICON_DRAWING_FRAME_WIDTH / 8,
    marginY: STATE_ICON_DRAWING_FRAME_HEIGHT / 8
  };
}

function stateIconDrawingTerminalConnectorSegment(anchor: Point, projectAnchor: (anchor: Point) => Point = (value) => value) {
  const frame = stateIconDrawingTerminalFrame();
  const boundaryAnchor = projectAnchor(anchor);
  const from = {
    x: frame.centerX + boundaryAnchor.x * frame.width,
    y: frame.centerY + boundaryAnchor.y * frame.height
  };
  const horizontal = Math.abs(boundaryAnchor.x) >= Math.abs(boundaryAnchor.y);
  return {
    from,
    to: horizontal
      ? { x: from.x + (boundaryAnchor.x < 0 ? -frame.marginX : frame.marginX), y: from.y }
      : { x: from.x, y: from.y + (boundaryAnchor.y < 0 ? -frame.marginY : frame.marginY) }
  };
}

function stateIconDrawingTerminalAlignmentCandidates(__appScope: Record<string, any>) {
  const {
    customDeviceDraft,
    customDeviceTerminalAnchors,
    customDraftTerminalTypes,
    definitionVisualDraft,
    definitionVisualTerminalAnchors,
    definitionVisualTerminalTypes,
    projectCustomDeviceTerminalAnchorToBoundary,
    stateIconDrawingDialog
  } = __appScope;
  const scope = stateIconDrawingDialog?.target?.scope;
  const draft = scope === "definition" ? definitionVisualDraft : scope === "custom" ? customDeviceDraft : null;
  const terminalTypes = scope === "definition" ? definitionVisualTerminalTypes : customDraftTerminalTypes;
  const terminalAnchors = scope === "definition" ? definitionVisualTerminalAnchors : customDeviceTerminalAnchors;
  const terminalCount = Math.max(
    0,
    Number(draft?.terminalCount) || (Array.isArray(terminalTypes) ? terminalTypes.length : 0) || 0
  );
  if (!terminalCount || !Array.isArray(terminalAnchors)) {
    return [];
  }
  const projectAnchor = typeof projectCustomDeviceTerminalAnchorToBoundary === "function"
    ? projectCustomDeviceTerminalAnchorToBoundary
    : (anchor: Point) => anchor;
  return terminalAnchors.slice(0, terminalCount).flatMap((anchor, index) => {
    const segment = stateIconDrawingTerminalConnectorSegment(anchor, projectAnchor);
    return [
      stateIconDrawingPointAlignmentCandidate(`terminal-anchor-${index}`, segment.to.x, segment.to.y, -3),
      stateIconDrawingPointAlignmentCandidate(`terminal-inner-${index}`, segment.from.x, segment.from.y, -2)
    ];
  });
}

function stateIconDrawingPointBounds(point: Point) {
  return {
    left: point.x,
    right: point.x,
    top: point.y,
    bottom: point.y,
    centerX: point.x,
    centerY: point.y
  };
}

function stateIconDrawingTerminalPointSnap(__appScope: Record<string, any>, point: Point) {
  if (!__appScope.smartAlignmentEnabled) {
    return { point, guides: [] };
  }
  const candidates = stateIconDrawingTerminalAlignmentCandidates(__appScope);
  if (candidates.length === 0) {
    return { point, guides: [] };
  }
  const pointBounds = stateIconDrawingPointBounds(point);
  const xSnap = bestStateIconDrawingAlignmentSnap("x", pointBounds, candidates, STATE_ICON_DRAWING_SMART_ALIGNMENT_TOLERANCE);
  const ySnap = bestStateIconDrawingAlignmentSnap("y", pointBounds, candidates, STATE_ICON_DRAWING_SMART_ALIGNMENT_TOLERANCE);
  return {
    point: {
      x: point.x + (xSnap?.adjustment ?? 0),
      y: point.y + (ySnap?.adjustment ?? 0)
    },
    guides: [xSnap?.guide, ySnap?.guide].filter(Boolean)
  };
}

export function createComputeStateIconDrawingSmartAlignmentSnap(__appScope: Record<string, any>) {
  return ({
    elements,
    selectedIds,
    startElements,
    delta,
    threshold = STATE_ICON_DRAWING_SMART_ALIGNMENT_TOLERANCE
  }: {
    elements: StateIconDrawingElement[];
    selectedIds: readonly string[];
    startElements: StateIconDrawingElement[];
    delta: Point;
    threshold?: number;
  }) => {
  const { smartAlignmentEnabled } = __appScope;
    if (!smartAlignmentEnabled || selectedIds.length === 0 || startElements.length === 0) {
      return { delta, guides: [] };
    }
    const selectedSet = new Set(selectedIds);
    const startBounds = stateIconDrawingSelectionBounds(startElements);
    if (!startBounds) {
      return { delta, guides: [] };
    }
    const candidates = [
      ...elements
      .filter((element) => !selectedSet.has(element.id))
      .map((element) => ({ id: element.id, bounds: stateIconDrawingElementBounds(element) })),
      ...stateIconDrawingTerminalAlignmentCandidates(__appScope),
      ...stateIconDrawingFrameAlignmentCandidates()
    ];
    if (candidates.length === 0) {
      return { delta, guides: [] };
    }
    const movedBounds = translatedStateIconDrawingBounds(startBounds, delta);
    const xSnap = bestStateIconDrawingAlignmentSnap("x", movedBounds, candidates, threshold);
    const ySnap = bestStateIconDrawingAlignmentSnap("y", movedBounds, candidates, threshold);
    const guides = [xSnap?.guide, ySnap?.guide].filter(Boolean);
    return {
      delta: {
        x: delta.x + (xSnap?.adjustment ?? 0),
        y: delta.y + (ySnap?.adjustment ?? 0)
      },
      guides
    };
  };
}

function stateIconDrawingFrameDashArray(frame: any) {
  const width = Math.max(1, Number(frame?.strokeWidth) || 1);
  if (frame?.strokeStyle === "dotted") {
    return `${width * 0.2} ${width * 2}`;
  }
  if (frame?.strokeStyle === "dashed") {
    return `${width * 5} ${width * 3}`;
  }
  return undefined;
}

function clampStateIconDrawingPoint(point: Point) {
  return {
    x: clampNumber(point.x, 0, 240),
    y: clampNumber(point.y, 0, 160)
  };
}

function sameStateIconDrawingPoint(left: Point, right: Point) {
  return Math.abs(left.x - right.x) < 0.01 && Math.abs(left.y - right.y) < 0.01;
}

function appendDistinctStateIconDrawingPoint(points: readonly Point[], point: Point) {
  const nextPoint = clampStateIconDrawingPoint(point);
  const lastPoint = points[points.length - 1];
  return lastPoint && sameStateIconDrawingPoint(lastPoint, nextPoint)
    ? points.map(clampStateIconDrawingPoint)
    : [...points.map(clampStateIconDrawingPoint), nextPoint];
}

function stateIconDrawingPolylineElementFromPoints(element: any, points: readonly Point[]) {
  const clampedPoints = points.map(clampStateIconDrawingPoint);
  const drawPoints = clampedPoints.length >= 2
    ? clampedPoints
    : clampedPoints.length === 1
      ? [clampedPoints[0], clampedPoints[0]]
      : [{ x: 120, y: 80 }, { x: 120, y: 80 }];
  const left = Math.min(...drawPoints.map((point) => point.x));
  const right = Math.max(...drawPoints.map((point) => point.x));
  const top = Math.min(...drawPoints.map((point) => point.y));
  const bottom = Math.max(...drawPoints.map((point) => point.y));
  const width = Math.max(1, right - left);
  const height = Math.max(1, bottom - top);
  const center = {
    x: left + width / 2,
    y: top + height / 2
  };
  return {
    ...element,
    x: center.x,
    y: center.y,
    width,
    height,
    rotation: 0,
    points: drawPoints.map((point) => ({
      x: (point.x - center.x) / width,
      y: (point.y - center.y) / height
    }))
  };
}

function stateIconDrawingElementFromPoints(element: any, startPoint: Point, currentPoint: Point) {
  const start = clampStateIconDrawingPoint(startPoint);
  const current = clampStateIconDrawingPoint(currentPoint);
  const dx = current.x - start.x;
  const dy = current.y - start.y;
  const absWidth = Math.abs(dx);
  const absHeight = Math.abs(dy);
  const center = {
    x: start.x + dx / 2,
    y: start.y + dy / 2
  };
  if (element.kind === "line") {
    const length = Math.max(1, Math.hypot(dx, dy));
    return {
      ...element,
      x: center.x,
      y: center.y,
      width: length,
      height: Math.max(12, element.height),
      rotation: Math.atan2(dy, dx || 0.000001) * 180 / Math.PI
    };
  }
  if (element.kind === "polyline") {
    return stateIconDrawingPolylineElementFromPoints(element, [start, current]);
  }
  if (element.kind === "point") {
    const size = Math.max(8, absWidth, absHeight);
    return {
      ...element,
      x: center.x,
      y: center.y,
      width: size,
      height: size
    };
  }
  if (element.kind === "circle" || element.kind === "square" || element.kind === "semicircle") {
    const size = Math.max(1, absWidth, absHeight);
    const end = {
      x: start.x + (dx < 0 ? -size : size),
      y: start.y + (dy < 0 ? -size : size)
    };
    return {
      ...element,
      x: start.x + (end.x - start.x) / 2,
      y: start.y + (end.y - start.y) / 2,
      width: size,
      height: size
    };
  }
  const minimumWidth = element.kind === "text" ? 24 : 1;
  const minimumHeight = element.kind === "text" ? 16 : 1;
  return {
    ...element,
    x: center.x,
    y: center.y,
    width: Math.max(minimumWidth, absWidth),
    height: Math.max(minimumHeight, absHeight)
  };
}

function finishStateIconDrawingDraft(current: any, historyRef: any) {
  if (!current?.drawingDraft) {
    return current;
  }
  const draft = current.drawingDraft;
  let element = draft.element;
  if (draft.kind === "polyline") {
    const draftPoints = draft.points?.length ? draft.points : [draft.start];
    const finalPoint = draft.current ?? draftPoints[draftPoints.length - 1] ?? draft.start;
    const finalPoints = appendDistinctStateIconDrawingPoint(draftPoints, finalPoint);
    if (finalPoints.length < 2) {
      return current;
    }
    element = stateIconDrawingPolylineElementFromPoints(draft.element, finalPoints);
  } else {
    element = stateIconDrawingElementFromPoints(draft.element, draft.start, draft.current ?? draft.start);
  }
  pushStateIconDrawingHistorySnapshot(historyRef, current.elements);
  return {
    ...current,
    elements: [...current.elements, element],
    selectedElementId: element.id,
    selectedElementIds: [element.id],
    pendingElementKind: undefined,
    pendingStaticTemplate: undefined,
    drawingDraft: undefined,
    smartAlignmentGuides: []
  };
}

function createTemplateDefaultStateIconImage(__appScope: Record<string, any>, template: any, options: Record<string, any> = {}) {
  if (!template) {
    return "";
  }
  const { DeviceGlyph, MAX_CUSTOM_DEVICE_TERMINALS, createNodeFromTemplate, escapeXml, formatSvgNumber, nodeGeometryTransform, renderSvgElementMarkup, colorDisplayMode, colorPalette } = __appScope;
  if (!DeviceGlyph || !createNodeFromTemplate || !renderSvgElementMarkup) {
    return "";
  }
  const width = Math.max(1, Math.round(options.size?.width ?? template.size?.width ?? 104));
  const height = Math.max(1, Math.round(options.size?.height ?? template.size?.height ?? 64));
  const terminalCount = clampNumber(Math.round(options.terminalCount ?? template.terminalCount ?? 0), 0, MAX_CUSTOM_DEVICE_TERMINALS ?? 64);
  const sourceTerminalTypes = (
    options.terminalTypes ??
    template.terminalTypes ??
    Array.from({ length: terminalCount }, () => template.terminalType ?? "ac")
  ).slice(0, terminalCount);
  const terminalTypes = sourceTerminalTypes.length > 0 ? sourceTerminalTypes : [template.terminalType ?? "ac"];
  const explicitStatus = options.status !== undefined && options.status !== null && String(options.status) !== "";
  const visualTemplate = {
    ...template,
    label: options.label || template.label,
    size: { width, height },
    params: {
      ...template.params,
      backgroundImage: "",
      backgroundImageAssetId: ""
    },
    ...(explicitStatus
      ? { params: { ...template.params, status: String(options.status), backgroundImage: "", backgroundImageAssetId: "" } }
      : {}),
    terminalType: terminalTypes[0] ?? template.terminalType,
    terminalCount,
    terminalTypes,
    terminalLabels: (options.terminalLabels ?? template.terminalLabels ?? []).slice(0, terminalCount),
    terminalAnchors: (options.terminalAnchors ?? template.terminalAnchors ?? []).slice(0, terminalCount)
  };
  const node = createNodeFromTemplate(visualTemplate, { x: 0, y: 0 });
  if (explicitStatus) {
    node.params = { ...node.params, status: String(options.status) };
  }
  const stateVisual = options.stateVisual ?? null;
  const glyphMarkup = renderSvgElementMarkup(DeviceGlyph({ node, mode: "geometry", colorDisplayMode, colorPalette, stateVisual }));
  const glyphTextMarkup = renderSvgElementMarkup(DeviceGlyph({ node, mode: "text", colorDisplayMode, colorPalette, stateVisual }));
  const padding = 12;
  const viewBoxX = -width / 2 - padding;
  const viewBoxY = -height / 2 - padding;
  const viewBoxWidth = width + padding * 2;
  const viewBoxHeight = height + padding * 2;
  const drawingWidth = 240;
  const drawingHeight = 160;
  const contentWidth = terminalCount > 0 ? drawingWidth * 3 / 4 : drawingWidth;
  const contentHeight = terminalCount > 0 ? drawingHeight * 3 / 4 : drawingHeight;
  const contentCenterX = drawingWidth / 2;
  const contentCenterY = drawingHeight / 2;
  const isStaticTemplate = typeof __appScope.isStaticKind === "function"
    ? __appScope.isStaticKind(template.kind)
    : String(template.kind ?? "").startsWith("static-");
  const staticTemplateSizeAttrs = isStaticTemplate
    ? ` data-state-icon-template-width="${formatSvgNumber(width)}" data-state-icon-template-height="${formatSvgNumber(height)}"`
    : "";
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${formatSvgNumber(drawingWidth)}" height="${formatSvgNumber(drawingHeight)}" viewBox="0 0 ${formatSvgNumber(drawingWidth)} ${formatSvgNumber(drawingHeight)}">` +
    `<g data-state-icon-layer-width="${formatSvgNumber(contentWidth)}" data-state-icon-layer-height="${formatSvgNumber(contentHeight)}"${staticTemplateSizeAttrs} transform="translate(${formatSvgNumber(contentCenterX)} ${formatSvgNumber(contentCenterY)})">` +
    `<svg x="${formatSvgNumber(-contentWidth / 2)}" y="${formatSvgNumber(-contentHeight / 2)}" width="${formatSvgNumber(contentWidth)}" height="${formatSvgNumber(contentHeight)}" data-state-icon-preserve-view-box="true" viewBox="${formatSvgNumber(viewBoxX)} ${formatSvgNumber(viewBoxY)} ${formatSvgNumber(viewBoxWidth)} ${formatSvgNumber(viewBoxHeight)}" preserveAspectRatio="xMidYMid meet">` +
    `<g transform="${escapeXml(nodeGeometryTransform(node))}">${glyphMarkup}${glyphTextMarkup}</g>` +
    `</svg></g></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function isGeneratedTemplateDefaultStateIconImage(value: unknown) {
  const image = String(value ?? "");
  if (!image.startsWith("data:image/svg+xml")) {
    return false;
  }
  const payload = image.includes(",") ? image.slice(image.indexOf(",") + 1) : image;
  try {
    const decoded = decodeURIComponent(payload);
    return (
      decoded.includes("data-state-icon-layer-width") ||
      decoded.includes("data-state-icon-layer-height") ||
      decoded.includes("data-custom-device-persisted-terminal-connectors") ||
      (
        decoded.includes('width="240"') &&
        decoded.includes('height="160"') &&
        decoded.includes('d="M -64 0 H 64"') &&
        decoded.includes(">文本框</text>")
      )
    );
  } catch {
    return false;
  }
}

function clearGeneratedDefinitionVisualDraftImage(template: any, draft: any) {
  if (!template || template.custom || !draft || !isGeneratedTemplateDefaultStateIconImage(draft.backgroundImage)) {
    return draft;
  }
  return {
    ...draft,
    backgroundImage: "",
    backgroundImageAssetId: "",
    backgroundImageFit: "cover",
    backgroundImageCleared: ""
  };
}

function createDefinitionStateDraftRowsWithDefaultImages(__appScope: Record<string, any>, template: any) {
  const { createDefinitionStateDraftRows, imageAssets = {} } = __appScope;
  const rows = createDefinitionStateDraftRows(template);
  if (!template || template.custom) {
    return rows;
  }
  return rows.map((row: any) => {
    const imageAssetHref = row.imageAssetId ? imageAssets[row.imageAssetId] : "";
    const backgroundImageAssetHref = row.backgroundImageAssetId ? imageAssets[row.backgroundImageAssetId] : "";
    const hasCustomStateImage = Boolean(
      (row.image && !isGeneratedTemplateDefaultStateIconImage(row.image)) ||
      (row.imageAssetId && !isGeneratedTemplateDefaultStateIconImage(imageAssetHref)) ||
      (row.backgroundImage && !isGeneratedTemplateDefaultStateIconImage(row.backgroundImage)) ||
      (row.backgroundImageAssetId && !isGeneratedTemplateDefaultStateIconImage(backgroundImageAssetHref)) ||
      row.imageCleared
    );
    if (hasCustomStateImage) {
      return row;
    }
    const image = createTemplateDefaultStateIconImage(__appScope, template, {
      status: row.value,
      stateVisual: row
    });
    return {
      ...row,
      image,
      imageAssetId: "",
      imageCleared: image ? "" : "1"
    };
  });
}

export function createOpenEdgeContextMenu(__appScope: Record<string, any>) {
  return (event: MouseEvent<SVGPathElement>, edgeId: string, routePoints?: Point[]) => {
  const { activateInspectorFromCanvas, activeLayerEdgeIdSet, canvasInteractionRef, clampPointToCanvas, lastCanvasPointerRef, lastRawCanvasPointerRef, openGraphicContextMenu, projectListPointerInsideRef, screenToSvgPoint, selectCanvasGraphics, svgRef, updateMouseStatus } = __appScope;
    event.preventDefault();
    event.stopPropagation();
    if (!activeLayerEdgeIdSet.has(edgeId)) {
      return;
    }
    activateInspectorFromCanvas();
    canvasInteractionRef.current = true;
    projectListPointerInsideRef.current = false;
    let pointer: Point | undefined;
    if (svgRef.current) {
      const rawPointer = screenToSvgPoint(svgRef.current, event.clientX, event.clientY);
      pointer = clampPointToCanvas(rawPointer);
      lastRawCanvasPointerRef.current = rawPointer;
      lastCanvasPointerRef.current = pointer;
      updateMouseStatus(pointer);
    }
    selectCanvasGraphics([], [edgeId]);
    openGraphicContextMenu({
      x: event.clientX,
      y: event.clientY,
      target: "edge",
      canvasPoint: pointer,
      edgeId,
      routePoints: routePoints?.map((point) => ({ ...point }))
    });
  };
}

export function createCaptureCanvasPointer(__appScope: Record<string, any>) {
  return (pointerId: number) => {
  const { svgRef } = __appScope;
    try {
      svgRef.current?.setPointerCapture(pointerId);
    } catch {
      // Pointer capture can fail if the browser has already canceled the pointer.
    }
  };
}

export function createStartManualSegmentDrag(__appScope: Record<string, any>) {
  return (
    event: PointerEvent<SVGPathElement>,
    edgeId: string,
    segmentIndex: number,
    orientation: "horizontal" | "vertical",
    routePoints: Point[]
  ) => {
  const { activeLayerEdgeIdSet, captureCanvasPointer, clampPointToCanvas, edgePointerBendInsertRef, hasCanvasSelectionModifier, insertManualBendAtPoint, isBrowseMode, routeManualPoints, screenToSvgPoint, selectCanvasGraphics, setManualPathDrag, startModifierSelectionPress, svgRef } = __appScope;
    event.stopPropagation();
    if (event.button !== 0 || !svgRef.current || !activeLayerEdgeIdSet.has(edgeId)) {
      return;
    }
    if (isBrowseMode) {
      selectCanvasGraphics([], [edgeId]);
      return;
    }
    if (hasCanvasSelectionModifier(event)) {
      startModifierSelectionPress(event, { kind: "edge", edgeId });
      return;
    }
    const pointer = clampPointToCanvas(screenToSvgPoint(svgRef.current, event.clientX, event.clientY));
    if (event.detail >= 2) {
      event.preventDefault();
      edgePointerBendInsertRef.current = {
        edgeId,
        clientX: event.clientX,
        clientY: event.clientY,
        at: Date.now()
      };
      insertManualBendAtPoint(edgeId, segmentIndex, routePoints, pointer);
      return;
    }
    selectCanvasGraphics([], [edgeId]);
    setManualPathDrag({
      edgeId,
      segmentIndex,
      orientation,
      startPoint: pointer,
      originalManualPoints: routeManualPoints(routePoints),
      originalRoutePoints: routePoints.map((point) => ({ ...point }))
    });
    captureCanvasPointer(event.pointerId);
  };
}

export function createStartManualPointDrag(__appScope: Record<string, any>) {
  return (event: PointerEvent<SVGCircleElement>, edgeId: string, pointIndex: number, routePoints: Point[]) => {
  const { activeLayerEdgeIdSet, captureCanvasPointer, clampPointToCanvas, edgePointerBendInsertRef, findBendInsertRouteSegmentIndex, hasCanvasSelectionModifier, insertManualBendAtPoint, isBrowseMode, routeManualPoints, screenToSvgPoint, selectCanvasGraphics, setManualPathDrag, startModifierSelectionPress, svgRef } = __appScope;
    event.stopPropagation();
    if (event.button !== 0 || !svgRef.current || !activeLayerEdgeIdSet.has(edgeId)) {
      return;
    }
    if (isBrowseMode) {
      selectCanvasGraphics([], [edgeId]);
      return;
    }
    if (hasCanvasSelectionModifier(event)) {
      startModifierSelectionPress(event, { kind: "edge", edgeId });
      return;
    }
    const pointer = clampPointToCanvas(screenToSvgPoint(svgRef.current, event.clientX, event.clientY));
    if (event.detail >= 2) {
      event.preventDefault();
      const segmentIndex = findBendInsertRouteSegmentIndex(routePoints, pointer);
      if (segmentIndex >= 0) {
        edgePointerBendInsertRef.current = {
          edgeId,
          clientX: event.clientX,
          clientY: event.clientY,
          at: Date.now()
        };
        insertManualBendAtPoint(edgeId, segmentIndex, routePoints, pointer);
      }
      return;
    }
    selectCanvasGraphics([], [edgeId]);
    setManualPathDrag({
      edgeId,
      pointIndex,
      startPoint: pointer,
      originalManualPoints: routeManualPoints(routePoints),
      originalRoutePoints: routePoints.map((point) => ({ ...point }))
    });
    captureCanvasPointer(event.pointerId);
  };
}

export function createRouteSegmentPointerDistance(__appScope: Record<string, any>) {
  return (point: Point, from: Point, to: Point) => {
    if (from.y === to.y) {
      const minX = Math.min(from.x, to.x);
      const maxX = Math.max(from.x, to.x);
      if (point.x >= minX && point.x <= maxX) {
        return Math.abs(point.y - from.y);
      }
    } else if (from.x === to.x) {
      const minY = Math.min(from.y, to.y);
      const maxY = Math.max(from.y, to.y);
      if (point.y >= minY && point.y <= maxY) {
        return Math.abs(point.x - from.x);
      }
    }
    return Math.min(
      Math.hypot(point.x - from.x, point.y - from.y),
      Math.hypot(point.x - to.x, point.y - to.y)
    );
  };
}

export function createFindEditableRouteSegmentIndex(__appScope: Record<string, any>) {
  return (routePoints: Point[], point: Point) => {
  const { routeSegmentPointerDistance, sameOptionalPoint } = __appScope;
    const candidates = routePoints
      .slice(0, -1)
      .map((from, segmentIndex) => ({ from, to: routePoints[segmentIndex + 1], segmentIndex }))
      .filter(({ from, to }) => to && !sameOptionalPoint(from, to) && (from.x === to.x || from.y === to.y));
    return candidates.reduce<{ index: number; distance: number } | null>((nearest, candidate) => {
      const distance = routeSegmentPointerDistance(point, candidate.from, candidate.to);
      return !nearest || distance < nearest.distance ? { index: candidate.segmentIndex, distance } : nearest;
    }, null)?.index ?? -1;
  };
}

export function createConnectionHitTolerance(__appScope: Record<string, any>) {
  return () => {
  const { CONNECTION_HIT_SCREEN_TOLERANCE, svgRef } = __appScope;
    const svg = svgRef.current;
    const rect = svg?.getBoundingClientRect();
    if (!svg || !rect || rect.width <= 0 || rect.height <= 0) {
      return 16;
    }
    const svgViewBox = svg.viewBox.baseVal;
    const xTolerance = (svgViewBox.width / rect.width) * CONNECTION_HIT_SCREEN_TOLERANCE;
    const yTolerance = (svgViewBox.height / rect.height) * CONNECTION_HIT_SCREEN_TOLERANCE;
    return Math.max(xTolerance, yTolerance);
  };
}

export function createFindConnectionRouteHitAtPoint(__appScope: Record<string, any>) {
  return (point: Point) => {
  const { activeLayerEdgeIdSet, connectionHitTolerance, queryRouteSpatialIndex, routeSegmentPointerDistance, routedEdgeIndexById, routedEdgeSpatialIndex } = __appScope;
    const tolerance = connectionHitTolerance();
    const hitBounds = {
      left: point.x - tolerance,
      right: point.x + tolerance,
      top: point.y - tolerance,
      bottom: point.y + tolerance
    };
    return queryRouteSpatialIndex(routedEdgeSpatialIndex, hitBounds)
      .filter((route) => activeLayerEdgeIdSet.has(route.edgeId))
      .flatMap((route) =>
        route.points.slice(0, -1).map((from, segmentIndex) => ({
          edgeId: route.edgeId,
          routePoints: route.points,
          distance: routeSegmentPointerDistance(point, from, route.points[segmentIndex + 1]),
          routeOrder: routedEdgeIndexById.get(route.edgeId) ?? -1,
          segmentIndex
        }))
      )
      .filter((candidate) => candidate.distance <= tolerance)
      .sort((first, second) =>
        first.distance - second.distance ||
        second.routeOrder - first.routeOrder ||
        first.segmentIndex - second.segmentIndex
      )[0] ?? null;
  };
}

export function createInsertManualBendAtPoint(__appScope: Record<string, any>) {
  return (edgeId: string, segmentIndex: number, routePoints: Point[], clickPoint: Point) => {
  const { activeLayerEdgeIdSet, canvasBounds, insertOrthogonalRouteBend, pushUndoSnapshot, requireEditMode, routeManualPoints, setEdgeManualPoints } = __appScope;
    if (!requireEditMode("添加连接线拐点")) {
      return;
    }
    if (!activeLayerEdgeIdSet.has(edgeId)) {
      return;
    }
    const from = routePoints[segmentIndex];
    const to = routePoints[segmentIndex + 1];
    if (!from || !to || (from.x !== to.x && from.y !== to.y)) {
      return;
    }
    pushUndoSnapshot();
    const nextPoints = insertOrthogonalRouteBend(routePoints, segmentIndex, clickPoint, canvasBounds);
    setEdgeManualPoints(edgeId, routeManualPoints(nextPoints), nextPoints);
  };
}

export function createInsertManualBendFromPointer(__appScope: Record<string, any>) {
  return (edgeId: string, routePoints: Point[], clickPoint: Point) => {
  const { findEditableRouteSegmentIndex, insertManualBendAtPoint } = __appScope;
    const segmentIndex = findEditableRouteSegmentIndex(routePoints, clickPoint);
    if (segmentIndex >= 0) {
      insertManualBendAtPoint(edgeId, segmentIndex, routePoints, clickPoint);
      return true;
    }
    return false;
  };
}

export function createAddManualBendFromContextMenu(__appScope: Record<string, any>) {
  return () => {
  const { contextMenu, insertManualBendFromPointer, lastCanvasPointerRef, selectedEdgeId, selectedRoutedEdge } = __appScope;
    const edgeId = contextMenu?.edgeId ?? selectedEdgeId;
    const routePoints = contextMenu?.routePoints ?? selectedRoutedEdge?.points;
    const point = contextMenu?.canvasPoint ?? lastCanvasPointerRef.current;
    if (!edgeId || !routePoints?.length || !point) {
      return;
    }
    insertManualBendFromPointer(edgeId, routePoints, point);
  };
}

export function createAddRoutableLineBendFromContextMenu(__appScope: Record<string, any>) {
  return () => {
  const { contextMenu, insertRoutableLineBendFromPointer, isRoutableLineDeviceKind, lastCanvasPointerRef, nodeById, routableLineDeviceCanvasPoints } = __appScope;
    const nodeId = contextMenu?.nodeId;
    const lineNode = nodeId ? nodeById.get(nodeId) : undefined;
    const point = contextMenu?.canvasPoint ?? lastCanvasPointerRef.current;
    if (!nodeId || !lineNode || !isRoutableLineDeviceKind(lineNode.kind) || !point) {
      return;
    }
    const routePoints = contextMenu?.routePoints ?? routableLineDeviceCanvasPoints(lineNode);
    if (routePoints.length < 2) {
      return;
    }
    insertRoutableLineBendFromPointer(nodeId, routePoints, point);
  };
}

export function createInsertManualBendFromEdgePath(__appScope: Record<string, any>) {
  return (event: MouseEvent<SVGElement>, edgeId: string, routePoints: Point[]) => {
  const { activateInspectorFromCanvas, activeLayerEdgeIdSet, clampPointToCanvas, edgePointerBendInsertRef, insertManualBendFromPointer, requireEditMode, screenToSvgPoint, selectCanvasGraphics, staticDrawing, svgRef } = __appScope;
    event.preventDefault();
    event.stopPropagation();
    if (!requireEditMode("添加连接线拐点")) {
      return;
    }
    if (staticDrawing) {
      return;
    }
    if (!activeLayerEdgeIdSet.has(edgeId)) {
      return;
    }
    const pointerInsertedBend = edgePointerBendInsertRef.current;
    if (
      pointerInsertedBend &&
      pointerInsertedBend.edgeId === edgeId &&
      Date.now() - pointerInsertedBend.at < 800 &&
      Math.hypot(event.clientX - pointerInsertedBend.clientX, event.clientY - pointerInsertedBend.clientY) <= 8
    ) {
      edgePointerBendInsertRef.current = null;
      return;
    }
    if (!svgRef.current) {
      return;
    }
    activateInspectorFromCanvas();
    selectCanvasGraphics([], [edgeId]);
    const clickPoint = clampPointToCanvas(screenToSvgPoint(svgRef.current, event.clientX, event.clientY));
    insertManualBendFromPointer(edgeId, routePoints, clickPoint);
  };
}

export function createHandleEdgePathPointerDown(__appScope: Record<string, any>) {
  return (event: PointerEvent<SVGPathElement>, edgeId: string, routePoints: Point[]) => {
  const { activateInspectorFromCanvas, activeLayerEdgeIdSet, appendStaticDrawingPoint, clampPointToCanvas, edgePointerBendInsertRef, hasCanvasSelectionModifier, insertManualBendFromPointer, isBrowseMode, isRepeatedEdgePointerClick, lastEdgePointerClickRef, screenToSvgPoint, selectCanvasGraphics, startModifierSelectionPress, staticDrawing, svgRef } = __appScope;
    event.stopPropagation();
    if (event.button !== 0 || !svgRef.current) {
      return;
    }
    if (staticDrawing) {
      const pointer = clampPointToCanvas(screenToSvgPoint(svgRef.current, event.clientX, event.clientY));
      appendStaticDrawingPoint(pointer, event.detail >= 2);
      return;
    }
    if (!activeLayerEdgeIdSet.has(edgeId)) {
      return;
    }
    if (isBrowseMode) {
      activateInspectorFromCanvas();
      selectCanvasGraphics([], [edgeId]);
      return;
    }
    if (hasCanvasSelectionModifier(event)) {
      startModifierSelectionPress(event, { kind: "edge", edgeId });
      return;
    }
    activateInspectorFromCanvas();
    selectCanvasGraphics([], [edgeId]);
    const clickPoint = clampPointToCanvas(screenToSvgPoint(svgRef.current, event.clientX, event.clientY));
    const edgeClick = {
      edgeId,
      clientX: event.clientX,
      clientY: event.clientY,
      at: Date.now()
    };
    const repeatedClick = isRepeatedEdgePointerClick(lastEdgePointerClickRef.current, edgeClick);
    lastEdgePointerClickRef.current = edgeClick;
    if (event.detail < 2 && !repeatedClick) {
      return;
    }
    event.preventDefault();
    if (insertManualBendFromPointer(edgeId, routePoints, clickPoint)) {
      edgePointerBendInsertRef.current = {
        edgeId,
        clientX: event.clientX,
        clientY: event.clientY,
        at: Date.now()
      };
      lastEdgePointerClickRef.current = null;
    }
  };
}

export function createDeleteManualBendPoint(__appScope: Record<string, any>) {
  return (edgeId: string, routePointIndex: number, routePoints: Point[]) => {
  const { activeLayerEdgeIdSet, pushUndoSnapshot, requireEditMode, routeManualPoints, setEdgeManualPoints } = __appScope;
    if (!requireEditMode("删除连接线拐点")) {
      return;
    }
    if (!activeLayerEdgeIdSet.has(edgeId)) {
      return;
    }
    if (routePointIndex <= 0 || routePointIndex >= routePoints.length - 1) {
      return;
    }
    pushUndoSnapshot();
    const nextPoints = routePoints.filter((_, index) => index !== routePointIndex);
    setEdgeManualPoints(edgeId, routeManualPoints(nextPoints), nextPoints);
  };
}

export function createSetRoutableLineManualPathPoints(__appScope: Record<string, any>) {
  return (nodeId: string, routePoints: Point[]) => {
  const { activeLayerNodeIdSet, isRoutableLineDeviceKind, nodeById, patchGraphNodes, requireEditMode, setRoutableLineDeviceCanvasPoints } = __appScope;
    if (!requireEditMode("修改可变线路路径")) {
      return;
    }
    const lineNode = nodeById.get(nodeId);
    if (!lineNode || !activeLayerNodeIdSet.has(nodeId) || !isRoutableLineDeviceKind(lineNode.kind)) {
      return;
    }
    const nextNode = setRoutableLineDeviceCanvasPoints(lineNode, routePoints);
    if (nextNode !== lineNode) {
      patchGraphNodes([nextNode]);
    }
  };
}

export function createInsertRoutableLineBendAtPoint(__appScope: Record<string, any>) {
  return (nodeId: string, segmentIndex: number, routePoints: Point[], clickPoint: Point) => {
  const { activeLayerNodeIdSet, canvasBounds, insertRoutableLineDeviceBend, isRoutableLineDeviceKind, nodeById, patchGraphNodes, pushUndoSnapshot, requireEditMode, setRoutableLineDeviceCanvasPoints, writeOperationLog } = __appScope;
    if (!requireEditMode("添加可变线路拐点")) {
      return false;
    }
    const lineNode = nodeById.get(nodeId);
    if (!lineNode || !activeLayerNodeIdSet.has(nodeId) || !isRoutableLineDeviceKind(lineNode.kind)) {
      return false;
    }
    const from = routePoints[segmentIndex];
    const to = routePoints[segmentIndex + 1];
    if (!from || !to || (from.x !== to.x && from.y !== to.y)) {
      return false;
    }
    pushUndoSnapshot();
    const baseNode = setRoutableLineDeviceCanvasPoints(lineNode, routePoints);
    const nextNode = insertRoutableLineDeviceBend(baseNode, segmentIndex, clickPoint, canvasBounds);
    if (nextNode !== lineNode) {
      patchGraphNodes([nextNode]);
      writeOperationLog(`添加可变线路拐点：${nextNode.name}`);
    }
    return true;
  };
}

export function createInsertRoutableLineBendFromPointer(__appScope: Record<string, any>) {
  return (nodeId: string, routePoints: Point[], clickPoint: Point) => {
  const { findEditableRouteSegmentIndex, insertRoutableLineBendAtPoint } = __appScope;
    const segmentIndex = findEditableRouteSegmentIndex(routePoints, clickPoint);
    if (segmentIndex >= 0) {
      return insertRoutableLineBendAtPoint(nodeId, segmentIndex, routePoints, clickPoint);
    }
    return false;
  };
}

export function createStartRoutableLineSegmentDrag(__appScope: Record<string, any>) {
  return (
    event: PointerEvent<SVGPathElement>,
    node: ModelNode,
    segmentIndex: number,
    orientation: "horizontal" | "vertical",
    routePoints: Point[]
  ) => {
  const { activeLayerNodeIdSet, captureCanvasPointer, clampPointToCanvas, hasCanvasSelectionModifier, insertRoutableLineBendAtPoint, isBrowseMode, screenToSvgPoint, selectCanvasGraphics, setManualPathDrag, startModifierSelectionPress, svgRef } = __appScope;
    event.stopPropagation();
    if (event.button !== 0 || !svgRef.current || !activeLayerNodeIdSet.has(node.id)) {
      return;
    }
    if (isBrowseMode) {
      selectCanvasGraphics([node.id], [], { scope: "direct" });
      return;
    }
    if (hasCanvasSelectionModifier(event)) {
      startModifierSelectionPress(event, { kind: "node", nodeId: node.id });
      return;
    }
    const pointer = clampPointToCanvas(screenToSvgPoint(svgRef.current, event.clientX, event.clientY));
    if (event.detail >= 2) {
      event.preventDefault();
      insertRoutableLineBendAtPoint(node.id, segmentIndex, routePoints, pointer);
      return;
    }
    selectCanvasGraphics([node.id], [], { scope: "direct" });
    setManualPathDrag({
      nodeId: node.id,
      segmentIndex,
      orientation,
      startPoint: pointer,
      originalManualPoints: [],
      originalRoutePoints: routePoints.map((point) => ({ ...point }))
    });
    captureCanvasPointer(event.pointerId);
  };
}

export function createStartRoutableLinePointDrag(__appScope: Record<string, any>) {
  return (event: PointerEvent<SVGCircleElement>, node: ModelNode, pointIndex: number, routePoints: Point[]) => {
  const { activeLayerNodeIdSet, captureCanvasPointer, clampPointToCanvas, hasCanvasSelectionModifier, insertRoutableLineBendFromPointer, isBrowseMode, screenToSvgPoint, selectCanvasGraphics, setManualPathDrag, startModifierSelectionPress, svgRef } = __appScope;
    event.stopPropagation();
    if (event.button !== 0 || !svgRef.current || !activeLayerNodeIdSet.has(node.id)) {
      return;
    }
    if (isBrowseMode) {
      selectCanvasGraphics([node.id], [], { scope: "direct" });
      return;
    }
    if (hasCanvasSelectionModifier(event)) {
      startModifierSelectionPress(event, { kind: "node", nodeId: node.id });
      return;
    }
    const pointer = clampPointToCanvas(screenToSvgPoint(svgRef.current, event.clientX, event.clientY));
    if (event.detail >= 2) {
      event.preventDefault();
      insertRoutableLineBendFromPointer(node.id, routePoints, pointer);
      return;
    }
    selectCanvasGraphics([node.id], [], { scope: "direct" });
    setManualPathDrag({
      nodeId: node.id,
      pointIndex,
      startPoint: pointer,
      originalManualPoints: [],
      originalRoutePoints: routePoints.map((point) => ({ ...point }))
    });
    captureCanvasPointer(event.pointerId);
  };
}

export function createDeleteRoutableLineBendPoint(__appScope: Record<string, any>) {
  return (nodeId: string, routePointIndex: number, routePoints: Point[]) => {
  const { activeLayerNodeIdSet, pushUndoSnapshot, requireEditMode, setRoutableLineManualPathPoints } = __appScope;
    if (!requireEditMode("删除可变线路拐点")) {
      return;
    }
    if (!activeLayerNodeIdSet.has(nodeId) || routePointIndex <= 0 || routePointIndex >= routePoints.length - 1) {
      return;
    }
    pushUndoSnapshot();
    const nextPoints = routePoints.filter((_, index) => index !== routePointIndex);
    setRoutableLineManualPathPoints(nodeId, nextPoints);
  };
}

export function createStartConnectFromTerminal(__appScope: Record<string, any>) {
  return (node: ModelNode, terminalId: string, point?: Point) => {
  const { activeLayerNodeIdSet, applyConnectPreviewState, getModelEdgeEndpointPoint, requireEditMode, resetRoutableLinePreviewState, setCanvasSelectionScope, setConnectSource, setMode, setRoutableLinePlacement, setSelectedEdgeId, setSelectedEdgeIds, setSelectedNodeIds } = __appScope;
    if (!requireEditMode("建立连接线")) {
      return;
    }
    if (!activeLayerNodeIdSet.has(node.id)) {
      return;
    }
    const sourcePoint = point ?? getModelEdgeEndpointPoint(node, undefined, terminalId);
    const nextConnectSource: NonNullable<typeof connectSource> = point ? { nodeId: node.id, terminalId, point } : { nodeId: node.id, terminalId };
    setRoutableLinePlacement(null);
    resetRoutableLinePreviewState();
    setConnectSource(nextConnectSource);
    applyConnectPreviewState(sourcePoint, false, null, null, nextConnectSource);
    setMode("connect");
    setCanvasSelectionScope("group");
    setSelectedNodeIds([]);
    setSelectedEdgeId("");
    setSelectedEdgeIds([]);
  };
}

export function createFinishTerminalPress(__appScope: Record<string, any>) {
  return () => {
  const { busAnchorFromPoint, isBusNode, nodeById, patchSingleTerminalAnchorFromPoint, setTerminalPress, startConnectFromTerminal, terminalPress } = __appScope;
    if (!terminalPress) {
      return;
    }
    const node = nodeById.get(terminalPress.nodeId);
    if (!node) {
      setTerminalPress(null);
      return;
    }
    const busPoint = isBusNode(node) ? busAnchorFromPoint(node, terminalPress.startPoint) : undefined;
    if (!terminalPress.moved) {
      startConnectFromTerminal(node, terminalPress.terminalId, busPoint);
      setTerminalPress(null);
      return;
    }
    if (!isBusNode(node) && node.terminals.length === 1) {
      patchSingleTerminalAnchorFromPoint(
        terminalPress.nodeId,
        terminalPress.terminalId,
        terminalPress.currentPoint,
        terminalPress.startPoint
      );
    }
    setTerminalPress(null);
  };
}

export function createHandleTerminalPointerDown(__appScope: Record<string, any>) {
  return (
    event: PointerEvent<SVGCircleElement>,
    node: ModelNode,
    terminalId: string
  ) => {
  const { activeLayerNodeIdSet, appendStaticDrawingPoint, busAnchorFromEvent, busAnchorFromPoint, canConnectTerminals, canvasBounds, clampPointToCanvas, commitNewConnectionEdge, connectPreviewPointRef, connectSource, connectTargetTerminalType, connectionCommitFailureMessage, connectionEndpointRuleFailureMessage, edgeById, finishConnectToTarget, finishRoutableLineToTarget, getTerminalPoint, hasCanvasSelectionModifier, isBrowseMode, isBusNode, markBusTerminalSyncDirtyForEdges, markRouteEdgesDirty, markStoredRouteEdgesDirty, nodeById, nodes, patchGraphEdges, prepareConnectionEdgeForCommit, preserveConnectionEdgeRouteShape, previewStoredRoutePointsForEdge, pushUndoSnapshot, resetConnectPreviewState, resolveStraightBusSlideEndpointToPoint, rewiring, routableLinePlacement, routableLineTemplateTerminalType, routedEdges, routingNodesForConnectionEdge, screenToSvgPoint, setCanvasSelectionScope, setConnectSource, setRewiring, setSelectedEdgeId, setSelectedEdgeIds, setSelectedNodeIds, setTerminalPress, startConnectFromTerminal, startModifierSelectionPress, startRoutableLineFromTerminal, staticDrawing, svgRef, visibleNodeById, writeOperationLog } = __appScope;
    event.stopPropagation();
    if (staticDrawing && event.button === 0 && svgRef.current) {
      const pointer = clampPointToCanvas(screenToSvgPoint(svgRef.current, event.clientX, event.clientY));
      appendStaticDrawingPoint(pointer, event.detail >= 2);
      return;
    }
    if (!activeLayerNodeIdSet.has(node.id)) {
      return;
    }
    if (isBrowseMode) {
      setCanvasSelectionScope("direct");
      setSelectedNodeIds([node.id]);
      setSelectedEdgeId("");
      setSelectedEdgeIds([]);
      setConnectSource(null);
      resetConnectPreviewState();
      setRewiring(null);
      return;
    }
    if (routableLinePlacement && event.button === 0 && svgRef.current) {
      const busPoint = busAnchorFromEvent(node, event);
      const target: ConnectTarget = { node, terminalId, point: busPoint };
      if (routableLinePlacement.source) {
        if (connectTargetTerminalType(target) === routableLineTemplateTerminalType(routableLinePlacement.template)) {
          finishRoutableLineToTarget(target, routableLinePlacement.manualPoints);
        }
      } else {
        startRoutableLineFromTerminal(node, terminalId, busPoint);
      }
      return;
    }
    if (event.button === 0 && svgRef.current && !rewiring) {
      event.preventDefault();
      const busPoint = busAnchorFromEvent(node, event);
      if (connectSource) {
        const target: ConnectTarget = { node, terminalId, point: busPoint };
        finishConnectToTarget(target, busPoint ?? getTerminalPoint(node, terminalId));
      } else {
        // 普通点击直接启动连接预览，无需Ctrl键
        startConnectFromTerminal(node, terminalId, busPoint);
      }
      return;
    }
    if (event.button === 0 && hasCanvasSelectionModifier(event)) {
      startModifierSelectionPress(event, { kind: "node", nodeId: node.id });
      return;
    }
    setCanvasSelectionScope("direct");
    setSelectedNodeIds([node.id]);
    setSelectedEdgeId("");
    setSelectedEdgeIds([]);
    if (event.button !== 0 || !svgRef.current) {
      return;
    }
    const busPoint = busAnchorFromEvent(node, event);
    if (rewiring) {
      const edge = edgeById.get(rewiring.edgeId);
      const otherNode = edge ? nodeById.get(rewiring.endpoint === "source" ? edge.targetId : edge.sourceId) : undefined;
      const otherTerminalId = rewiring.endpoint === "source" ? edge?.targetTerminalId : edge?.sourceTerminalId;
      if (edge && otherNode && otherTerminalId && canConnectTerminals(node, terminalId, otherNode, otherTerminalId)) {
        const movingPoint = busPoint ?? getTerminalPoint(node, terminalId);
        const sourceNode = nodeById.get(edge.sourceId);
        const targetNode = nodeById.get(edge.targetId);
        const rewiredEdge =
          rewiring.endpoint === "source"
            ? { ...edge, sourceId: node.id, sourceTerminalId: terminalId, sourcePoint: busPoint }
            : { ...edge, targetId: node.id, targetTerminalId: terminalId, targetPoint: busPoint };
        const slidePatch = sourceNode && targetNode
          ? resolveStraightBusSlideEndpointToPoint({
              edge,
              sourceNode,
              targetNode,
              movingEndpoint: rewiring.endpoint,
              movingPoint,
              nodes,
              movingNode: node,
              movingTerminalId: terminalId
            })
          : null;
        const candidateEdge = slidePatch ? { ...rewiredEdge, ...slidePatch } : rewiredEdge;
        const routingNodes = routingNodesForConnectionEdge(candidateEdge, nodes);
        const edgeForCommit = preserveConnectionEdgeRouteShape(
          routingNodes,
          candidateEdge,
          previewStoredRoutePointsForEdge(edge),
          canvasBounds
        );
        const endpointRuleMessage = connectionEndpointRuleFailureMessage(edgeForCommit);
        const prepared = endpointRuleMessage
          ? null
          : prepareConnectionEdgeForCommit(
          routingNodes,
          [edgeForCommit],
          edge.id,
          canvasBounds,
          routedEdges,
          { preserveManualRouteDisplay: Boolean(edgeForCommit.manualPoints?.length) }
        );
        if (prepared?.ok && prepared.edge) {
          const preparedEdge = prepared.edge;
          pushUndoSnapshot();
          markRouteEdgesDirty([edge.id]);
          markStoredRouteEdgesDirty([edge.id]);
          markBusTerminalSyncDirtyForEdges([edge, preparedEdge]);
          patchGraphEdges([preparedEdge]);
        } else {
          const message = endpointRuleMessage || connectionCommitFailureMessage(prepared?.issues);
          window.alert(`联络线端子调整失败：${message}`);
          writeOperationLog(`联络线端子调整失败：${message}`);
        }
      }
      setRewiring(null);
      return;
    }
    if (!connectSource) {
      return;
    }
    const sourceNode = visibleNodeById.get(connectSource.nodeId);
    if (sourceNode?.id === node.id && connectSource.terminalId === terminalId) {
      return;
    }
    if (!sourceNode || !canConnectTerminals(sourceNode, connectSource.terminalId, node, terminalId)) {
      return;
    }
    const newEdge: Edge = {
      id: `edge-${Date.now()}`,
      sourceId: sourceNode.id,
      targetId: node.id,
      sourceTerminalId: connectSource.terminalId,
      sourcePoint: connectSource.point,
      manualPoints: connectSource.manualPoints,
      targetTerminalId: terminalId,
      targetPoint: isBusNode(node) ? busAnchorFromPoint(node, connectPreviewPointRef.current ?? busPoint ?? getTerminalPoint(node, terminalId)) : busPoint
    };
    commitNewConnectionEdge(newEdge, sourceNode.name, node.name);
  };
}

export function createEnsureSavedBeforeExport(__appScope: Record<string, any>) {
  return () => {
  const { canExportCurrentModel } = __appScope;
    if (canExportCurrentModel) {
      return true;
    }
    window.alert("当前模型存在未保存修改，请先保存后再导出文件。");
    return false;
  };
}

export function createSvgExportReferencedImageHrefById(__appScope: Record<string, any>) {
  return () => {
  const { backendImageIdFromHref, backgroundPageRender, canvasBackgroundImage, canvasBackgroundImageAssetId, canvasBackgroundImageUrl, imageAssets, libraryTemplateByKind, nodes, resolveDeviceStateVisual, resolveStateVisualImageHref } = __appScope;
    const hrefById = new Map<string, string>();
    const appendAssetId = (assetId?: string) => {
      const id = String(assetId ?? "").trim();
      if (id && !hrefById.has(id)) {
        hrefById.set(id, `/api/images/${encodeURIComponent(id)}`);
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
        const template = libraryTemplateByKind.get(node.kind);
        const stateVisual = template ? resolveDeviceStateVisual(template, node) : null;
        appendHref(resolveStateVisualImageHref(stateVisual, imageAssets));
      }
    };

    appendAssetId(canvasBackgroundImageAssetId);
    appendHref(canvasBackgroundImage);
    appendHref(canvasBackgroundImageUrl);
    appendNodeImages(nodes);
    appendHref(backgroundPageRender?.backgroundImageUrl);
    appendHref(backgroundPageRender?.project?.canvasBackgroundImage);
    appendNodeImages(backgroundPageRender?.nodes ?? backgroundPageRender?.project?.nodes);
    return hrefById;
  };
}

export function createLoadSvgImageExportPathById(__appScope: Record<string, any>) {
  return async () => {
  const { fetchAllBackendImages, fetchBackendImageDataUrl, imageAssetList, imageAssets, imageExportPathByIdFromAssets, isImageDataUrl, svgExportReferencedImageHrefById } = __appScope;
    let assets = imageAssetList;
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
    } catch {
      // 后端图片清单不可用时，保持现有导出逻辑，不影响本地图形导出。
    }
    const exportHrefById = imageExportPathByIdFromAssets(assets, imageAssets);
    const assetById = new Map(assets.map((asset) => [asset.id, asset]));
    const referencedHrefById = svgExportReferencedImageHrefById();
    await Promise.all(Array.from(referencedHrefById.entries()).map(async ([id, href]) => {
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

export function createExportSvg(__appScope: Record<string, any>) {
  return async () => {
  const { DEFAULT_CANVAS_BACKGROUND, activeLayerId, backgroundPageRender, buildSvgDocument, canvasBackgroundColor, canvasBackgroundImageUrl, canvasBounds, colorPalette, edges, ensureSavedBeforeExport, layers, libraryTemplates, loadSvgImageExportPathById, measurementConfig, nodes, projectMeasurements, projectName, safeFilePart, saveTextFile, writeOperationLog } = __appScope;
    if (!ensureSavedBeforeExport()) {
      return;
    }
    const imageExportPathById = await loadSvgImageExportPathById();
    const filename = `${safeFilePart(projectName)}.svg`;
    const saved = await saveTextFile({
      filename,
      text: buildSvgDocument(nodes, edges, {
        ...canvasBounds,
        backgroundColor: canvasBackgroundColor || DEFAULT_CANVAS_BACKGROUND,
        backgroundImage: canvasBackgroundImageUrl,
        imageExportPathById,
        colorDisplayMode: "voltage",
        colorPalette,
        deviceTemplates: libraryTemplates,
        layers,
        activeLayerId,
        backgroundPage: backgroundPageRender,
        measurements: projectMeasurements,
        measurementConfig
      }),
      mime: "image/svg+xml",
      description: "SVG 图形文件",
      extensions: [".svg"]
    });
    if (!saved) {
      return;
    }
    writeOperationLog(`导出图形文件：${filename}`);
    window.alert(`SVG 文件导出成功：${filename}`);
  };
}

export function createExportEFile(__appScope: Record<string, any>) {
  return async () => {
    const {
      activeSchemeKey,
      buildEFileExport,
      currentProject,
      ensureSavedBeforeExport,
      getEExportWarnings,
      saveTextFile,
      schemePathForScheme,
      writeOperationLog
    } = __appScope;
    if (!ensureSavedBeforeExport()) {
      return;
    }
    const project = currentProject();
    const warnings = getEExportWarnings(project);
    if (warnings.length > 0) {
      window.alert(
        [
          `有 ${warnings.length} 个图上设备未导出到 E 文件：`,
          ...warnings.slice(0, 20).map((warning) => `- ${warning.nodeName}（${warning.kind}）：${warning.reason}`),
          warnings.length > 20 ? `... 还有 ${warnings.length - 20} 个设备未列出。` : ""
        ].filter(Boolean).join("\n")
      );
    }
    const schemePath = typeof schemePathForScheme === "function"
      ? schemePathForScheme(activeSchemeKey)
      : [];
    const file = buildEFileExport(
      project,
      Array.isArray(schemePath) && schemePath.length > 0 ? schemePath : ["默认方案"]
    );
    const saved = await saveTextFile({
      filename: file.filename,
      text: file.text,
      mime: file.mime,
      description: "E 模型文件",
      extensions: [".e"]
    });
    if (!saved) {
      return;
    }
    writeOperationLog(`导出模型文件：${file.filename}`);
    window.alert(`E 文件导出成功：${file.filename}`);
  };
}

export function createExportEDeviceDefinitionFile(__appScope: Record<string, any>) {
  return async () => {
    const { libraryTemplates, PARAM_LABELS, eDeviceDefinitionLabels, saveTextFile, writeOperationLog } = __appScope;
    // libraryTemplates 已合并内置 + 自定义元件并应用 deviceDefinitionOverrides，导出范围覆盖所有元件（含内置）
    const file = buildEDeviceDefinitionFile(libraryTemplates ?? [], PARAM_LABELS, eDeviceDefinitionLabels);
    if (!file.text) {
      window.alert("没有可导出的元件定义：所有元件均未勾选导出字段。");
      return;
    }
    const saved = await saveTextFile({
      filename: file.filename,
      text: file.text,
      mime: file.mime,
      description: "E 元件定义文件",
      extensions: [".e"]
    });
    if (!saved) {
      return;
    }
    writeOperationLog(`导出元件定义文件：${file.filename}`);
    window.alert(`元件定义文件导出成功：${file.filename}`);
  };
}

export function createImportEDeviceDefinitionFile(__appScope: Record<string, any>) {
  return (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) {
      return;
    }
    const {
      customDeviceTemplates,
      libraryTemplates,
      persistDeviceLibraryChange,
      setCustomDeviceTemplates,
      writeOperationLog
    } = __appScope;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const sections = parseEDeviceDefinitionFile(String(reader.result ?? ""));
        if (sections.length === 0) {
          window.alert("未在文件中解析到元件定义。");
          return;
        }
        const sectionByKind = new Map(sections.map((s: any) => [s.componentLibrary || s.kind, s]));
        // 匹配统计用 libraryTemplates（含内置+自定义），静态图元不计入（非电力设备）
        const matched: string[] = [];
        const skipped: string[] = [];
        for (const template of (libraryTemplates ?? []) as any[]) {
          const componentLibrary = inferESection(template.kind, template.params ?? {});
          if (!componentLibrary || componentLibrary.startsWith("Static")) {
            continue;
          }
          if (sectionByKind.has(componentLibrary)) {
            matched.push(template.label || template.kind);
          } else {
            skipped.push(template.label || template.kind);
          }
        }
        // 回写 customDeviceTemplates（更新 exportEnabled）
        const nextTemplates = (customDeviceTemplates as any[]).map((template: any) => {
          const componentLibrary = inferESection(template.kind, template.params ?? {});
          const section = componentLibrary ? sectionByKind.get(componentLibrary) : undefined;
          if (!section) {
            return template;
          }
          const exportNames = new Set(section.fields.map((field: any) => field.exportName));
          const parameterDefinitions = (template.parameterDefinitions ?? []).map((definition: any) => {
            // 用推导的 exportName 匹配（与导出一致，如 resistancePu -> resistance），确保无人工修改时全部匹配
            const settings = resolveDeviceParameterDefinitionExportSettings(template.kind, template.params ?? {}, definition);
            if (settings.exportEnabled && exportNames.has(settings.exportName)) {
              return { ...definition, exportEnabled: true, exportName: settings.exportName };
            }
            return { ...definition, exportEnabled: false };
          });
          return { ...template, parameterDefinitions };
        });
        setCustomDeviceTemplates(nextTemplates);
        persistDeviceLibraryChange({ customDeviceTemplates: nextTemplates }, {
          success: `元件定义导入成功：匹配 ${matched.length} 个，跳过 ${skipped.length} 个。`,
          failure: `元件定义已更新本地，后台保存失败：匹配 ${matched.length} 个。`
        });
        writeOperationLog(`导入元件定义文件：${file.name}`);
        const detail = skipped.length > 0 ? `\n未匹配（跳过）：${skipped.length} 个` : "";
        window.alert(`元件定义导入成功。\n匹配元件：${matched.length} 个${detail}`);
      } catch (error) {
        window.alert(error instanceof Error ? error.message : "导入元件定义文件失败。");
      }
    };
    reader.onerror = () => {
      window.alert("读取元件定义文件失败。");
    };
    reader.readAsText(file, "utf-8");
  };
}

// 程序化导出 E 文件定义（经 WS control 指令调用，返回文本不触发浏览器下载）
export function createProgrammaticExportEDeviceDefinition(__appScope: Record<string, any>) {
  return () => {
    const { libraryTemplates, PARAM_LABELS, eDeviceDefinitionLabels } = __appScope;
    return buildEDeviceDefinitionFile(libraryTemplates ?? [], PARAM_LABELS, eDeviceDefinitionLabels);
  };
}

// 程序化导入 E 文件定义（经 WS control 指令调用，返回匹配结果，不实际写入）
export function createProgrammaticImportEDeviceDefinition(__appScope: Record<string, any>) {
  return (text: string) => {
    const { libraryTemplates } = __appScope;
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
      const componentLibrary = inferESection(template.kind, template.params ?? {});
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

export function createIsProjectFilePayload(__appScope: Record<string, any>) {
  return (value: unknown): value is ProjectFile => {
  const { isObjectRecord } = __appScope;
    if (!isObjectRecord(value)) {
      return false;
    }
    return value.version === 1 && Array.isArray(value.nodes) && Array.isArray(value.edges);
  };
}

export function createCreateImportedSchemeRecord(__appScope: Record<string, any>) {
  return (text: string, fileName: string): SavedSchemeRecord => {
  const { createSavedProject, createSavedScheme, isObjectRecord, isProjectFilePayload } = __appScope;
    const payload = JSON.parse(text) as unknown;
    const payloadRecord = isObjectRecord(payload) ? payload : null;
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
    const importedProjects = rawScheme.projects.map((projectPayload, index) => {
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
      return createSavedProject(importedProjectName, projectFile);
    });
    const importedChildren: SavedSchemeRecord[] = Array.isArray(rawScheme.children)
      ? rawScheme.children.map((childPayload, index): SavedSchemeRecord => {
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

export function createExportProjectRecordFile(__appScope: Record<string, any>) {
  return async (project: SavedProjectRecord) => {
  const { activeProjectKey, currentProject, projectName, safeFilePart, saveTextFile, serializeProject, writeOperationLog } = __appScope;
    const projectFile = project.id === activeProjectKey ? currentProject() : project.project;
    const exportName = project.id === activeProjectKey ? projectName : project.name;
    await saveTextFile({
      filename: `${safeFilePart(exportName)}.json`,
      text: serializeProject(projectFile),
      mime: "application/json",
      description: "平台模型文件",
      extensions: [".json"]
    });
    writeOperationLog(`导出模型文件：${exportName}.json`);
  };
}

export function createExportCurrentModelFile(__appScope: Record<string, any>) {
  return async () => {
  const { currentProject, projectName, safeFilePart, saveTextFile, serializeProject, writeOperationLog } = __appScope;
    await saveTextFile({
      filename: `${safeFilePart(projectName)}.json`,
      text: serializeProject(currentProject()),
      mime: "application/json",
      description: "平台模型文件",
      extensions: [".json"]
    });
    writeOperationLog(`导出当前模型文件：${projectName}.json`);
  };
}

export function createOpenModelImportFilePicker(__appScope: Record<string, any>) {
  return (targetSchemeId = "") => {
  const { modelImportInputRef, modelImportTargetSchemeIdRef, requireEditMode } = __appScope;
    if (!requireEditMode("导入模型")) {
      return;
    }
    modelImportTargetSchemeIdRef.current = targetSchemeId;
    modelImportInputRef.current?.click();
  };
}

export function createOpenSvgModelImportFilePicker(__appScope: Record<string, any>) {
  return (targetSchemeId = "") => {
  const { modelImportTargetSchemeIdRef, requireEditMode, svgModelImportInputRef } = __appScope;
    if (!requireEditMode("从 SVG 生成模型")) {
      return;
    }
    modelImportTargetSchemeIdRef.current = targetSchemeId;
    if (svgModelImportInputRef.current) {
      svgModelImportInputRef.current.value = "";
      svgModelImportInputRef.current.click();
    }
  };
}

export function createCompleteImportedModelFeedback(__appScope: Record<string, any>) {
  return (feedback?: { successMessage: string; warnings: string[] }) => {
  const { writeOperationLog } = __appScope;
    if (!feedback) {
      return;
    }
    for (const warning of feedback.warnings) {
      writeOperationLog(`SVG 导入警告：${warning}`);
    }
    window.alert(feedback.successMessage);
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

export function createOpenSchemeImportFilePicker(__appScope: Record<string, any>) {
  return (parentSchemeId = "") => {
  const { requireEditMode, schemeImportInputRef, schemeImportParentSchemeIdRef } = __appScope;
    if (!requireEditMode("导入方案")) {
      return;
    }
    schemeImportParentSchemeIdRef.current = parentSchemeId;
    if (schemeImportInputRef.current) {
      schemeImportInputRef.current.value = "";
      schemeImportInputRef.current.click();
    }
  };
}

export function createMergeImportedSchemeIntoExisting(__appScope: Record<string, any>) {
  return (existingScheme: SavedSchemeRecord, importedScheme: SavedSchemeRecord): SavedSchemeRecord => {
  const { hasSameName, upsertSavedProject } = __appScope;
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

export function createCommitImportedSchemeRecord(__appScope: Record<string, any>) {
  return (importedScheme: SavedSchemeRecord, parentSchemeId = "") => {
  const { insertChildSavedScheme, persistSchemeTreeToBackend, schemePathForScheme, selectSingleScheme, setExpandedSchemeIds, setSchemes, writeOperationLog } = __appScope;
    const parentPath = parentSchemeId ? schemePathForScheme(parentSchemeId) : [];
    setSchemes((current) => insertChildSavedScheme(current, parentSchemeId, importedScheme));
    persistSchemeTreeToBackend(importedScheme, parentPath, `导入方案：${importedScheme.name}`);
    if (parentSchemeId) {
      setExpandedSchemeIds((current) => (current.includes(parentSchemeId) ? current : [...current, parentSchemeId]));
    }
    setExpandedSchemeIds((current) => (current.includes(importedScheme.id) ? current : [...current, importedScheme.id]));
    selectSingleScheme(importedScheme.id);
    writeOperationLog(`导入方案：${importedScheme.name}`);
  };
}

export function createApplyBackendSchemeArchiveImport(__appScope: Record<string, any>) {
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
        setExpandedSchemeIds((current) => (current.includes(parentScheme.id) ? current : [...current, parentScheme.id]));
      }
      setExpandedSchemeIds((current) => (current.includes(importedScheme.id) ? current : [...current, importedScheme.id]));
      selectSingleScheme(importedScheme.id);
    }
    writeOperationLog(`导入方案压缩包：${payload.importedName || fallbackName}`);
  };
}

export function createImportSchemeFile(__appScope: Record<string, any>) {
  return async (event: ChangeEvent<HTMLInputElement>) => {
  const { applyBackendSchemeArchiveImport, commitImportedSchemeRecord, createImportedSchemeRecord, findSavedSchemeById, hasSameName, requireEditMode, schemeImportParentSchemeIdRef, schemePathForScheme, schemes, setPendingSchemeImportConflict, uploadBackendSchemeArchive } = __appScope;
    const input = event.currentTarget;
    if (!requireEditMode("导入方案")) {
      schemeImportParentSchemeIdRef.current = "";
      input.value = "";
      return;
    }
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
      const targetSchemes = parentSchemeId ? findSavedSchemeById(schemes, parentSchemeId)?.children ?? [] : schemes;
      const duplicateScheme = targetSchemes.find((scheme) => hasSameName(importedScheme.name, [scheme.name]));
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
      window.alert(error instanceof Error ? `导入方案失败：${error.message}` : "导入方案失败。");
    } finally {
      schemeImportParentSchemeIdRef.current = "";
      input.value = "";
    }
  };
}

export function createCommitImportedModelRecord(__appScope: Record<string, any>) {
  return (targetScheme: SavedSchemeRecord, importedRecord: SavedProjectRecord) => {
  const { findSavedSchemeById, handleBackendSchemeMutationFailure, loadSavedProject, saveBackendProjectRecord, schemePathForRecord, setExpandedSchemeIds, setSchemes, upsertSavedProjectInScheme, writeOperationLog } = __appScope;
    const targetPath = schemePathForRecord(targetScheme);
    setSchemes((current) => {
      const fallback = current.length > 0 ? current : [targetScheme];
      const nextSchemes = findSavedSchemeById(fallback, targetScheme.id) ? fallback : [...fallback, targetScheme];
      return upsertSavedProjectInScheme(nextSchemes, targetScheme.id, importedRecord);
    });
    void saveBackendProjectRecord(targetPath, importedRecord)
      .catch((error) => handleBackendSchemeMutationFailure(`导入模型同步后台：${importedRecord.name}`, error));
    setExpandedSchemeIds((current) => (current.includes(targetScheme.id) ? current : [...current, targetScheme.id]));
    loadSavedProject(importedRecord, targetScheme.id);
    writeOperationLog(`导入模型文件：${importedRecord.name}`);
  };
}

export function createImportModelFile(__appScope: Record<string, any>) {
  return async (event: ChangeEvent<HTMLInputElement>) => {
  const { activeSchemeRecord, commitImportedModelRecord, createSavedProject, createSavedScheme, deserializeProject, findSavedSchemeById, modelImportTargetSchemeIdRef, requireEditMode, schemes, selectedSchemeRecord, setPendingModelImportConflict } = __appScope;
    const input = event.currentTarget;
    if (!requireEditMode("导入模型")) {
      modelImportTargetSchemeIdRef.current = "";
      input.value = "";
      return;
    }
    const file = input.files?.[0];
    if (!file) {
      return;
    }
    try {
      const text = await file.text();
      const importedProject = deserializeProject(text);
      const importTargetSchemeId = modelImportTargetSchemeIdRef.current;
      const targetScheme =
        findSavedSchemeById(schemes, importTargetSchemeId) ??
        activeSchemeRecord ??
        selectedSchemeRecord ??
        schemes[0] ??
        createSavedScheme("默认方案");
      const fileBaseName = file.name.replace(/\.json$/i, "");
      const importedName = (importedProject.name || fileBaseName || "导入模型").trim() || "导入模型";
      const duplicateProject = targetScheme.projects.find((project) => project.name.trim() === importedName.trim());
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
      window.alert(error instanceof Error ? `导入模型文件失败：${error.message}` : "导入模型文件失败。");
    } finally {
      modelImportTargetSchemeIdRef.current = "";
      input.value = "";
    }
  };
}

export function createImportSvgModelFile(__appScope: Record<string, any>) {
  return async (event: ChangeEvent<HTMLInputElement>) => {
  const {
    activeSchemeRecord,
    commitImportedModelRecord,
    completeImportedModelFeedback,
    createSavedProject,
    createSavedScheme,
    findSavedSchemeById,
    libraryTemplates,
    modelImportTargetSchemeIdRef,
    parseSvgModel,
    requireEditMode,
    schemes,
    selectedSchemeRecord,
    setPendingModelImportConflict,
    writeOperationLog,
    yieldToBrowser
  } = __appScope;
    const input = event.currentTarget;
    if (!requireEditMode("从 SVG 生成模型")) {
      modelImportTargetSchemeIdRef.current = "";
      input.value = "";
      return;
    }
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
        templates: libraryTemplates
      });
      const targetScheme =
        findSavedSchemeById(schemes, modelImportTargetSchemeIdRef.current) ??
        activeSchemeRecord ??
        selectedSchemeRecord ??
        schemes[0] ??
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
      window.alert(error instanceof Error ? `从 SVG 生成模型失败：${error.message}` : "从 SVG 生成模型失败。");
    } finally {
      modelImportTargetSchemeIdRef.current = "";
      input.value = "";
    }
  };
}

export function createResolveDuplicateSchemeImport(__appScope: Record<string, any>) {
  return (action: "merge" | "rename" | "cancel") => {
  const { applyBackendSchemeArchiveImport, commitImportedSchemeRecord, findSavedSchemeById, mergeImportedSchemeIntoExisting, pendingSchemeImportConflict, persistSchemeTreeToBackend, promptUniqueRecordName, replaceSavedSchemeById, requireEditMode, savedChildSchemeNames, schemePathForRecord, schemePathForScheme, schemes, selectSingleScheme, setExpandedSchemeIds, setPendingSchemeImportConflict, setSchemes, uniqueRecordName, uploadBackendSchemeArchive, writeOperationLog } = __appScope;
    const conflict = pendingSchemeImportConflict;
    if (!conflict || action === "cancel") {
      setPendingSchemeImportConflict(null);
      return;
    }
    if (!requireEditMode("处理方案导入冲突")) {
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
          window.alert(error instanceof Error ? `导入方案压缩包失败：${error.message}` : "导入方案压缩包失败。");
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
    setSchemes((current) => replaceSavedSchemeById(current, duplicateScheme.id, mergedScheme));
    persistSchemeTreeToBackend(mergedScheme, parentPath, `合并覆盖导入方案：${mergedScheme.name}`);
    setExpandedSchemeIds((current) => (current.includes(duplicateScheme.id) ? current : [...current, duplicateScheme.id]));
    selectSingleScheme(duplicateScheme.id);
    writeOperationLog(`合并覆盖导入方案：${duplicateScheme.name}`);
  };
}

export function createResolveDuplicateModelImport(__appScope: Record<string, any>) {
  return (action: "overwrite" | "rename" | "cancel") => {
  const { activeSchemeRecord, commitImportedModelRecord, completeImportedModelFeedback, createSavedProject, createSavedScheme, findSavedSchemeById, pendingModelImportConflict, promptUniqueRecordName, requireEditMode, schemes, selectedSchemeRecord, setPendingModelImportConflict, uniqueRecordName } = __appScope;
    const conflict = pendingModelImportConflict;
    if (!conflict || action === "cancel") {
      setPendingModelImportConflict(null);
      return;
    }
    if (!requireEditMode("处理模型导入冲突")) {
      setPendingModelImportConflict(null);
      return;
    }
    const targetScheme =
      findSavedSchemeById(schemes, conflict.targetSchemeId) ??
      activeSchemeRecord ??
      selectedSchemeRecord ??
      schemes[0] ??
      createSavedScheme("默认方案");
    const existingNames = targetScheme.projects.map((project) => project.name);
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
    const duplicateProject = targetScheme.projects.find((project) => project.id === conflict.duplicateProjectId);
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

export function createExportSchemeRecord(__appScope: Record<string, any>) {
  return async (scheme: SavedSchemeRecord) => {
  const { downloadBackendSchemeArchive, flattenSavedProjects, isPickerAbort, safeFilePart, schemePathForRecord, writeOperationLog } = __appScope;
    try {
      const schemePath = schemePathForRecord(scheme);
      const saved = await downloadBackendSchemeArchive(schemePath, `${safeFilePart(scheme.name)}.zip`);
      if (!saved) {
        return;
      }
      writeOperationLog(`导出方案：${scheme.name}`);
      window.alert(`已导出方案“${scheme.name}”，共 ${flattenSavedProjects([scheme]).length} 个模型。`);
    } catch (error) {
      if (isPickerAbort(error)) {
        return;
      }
      window.alert(error instanceof Error ? `导出方案失败：${error.message}` : "导出方案失败。");
    }
  };
}

export type ImageLibraryImportKind = "image" | "archive" | "mixed";

const IMAGE_LIBRARY_ARCHIVE_FILE_PATTERN = /\.(docx|docm|pptx|pptm|ppsx|ppsm|xlsx|xlsm|vsdx|wps|dps|zip)$/iu;
const IMAGE_LIBRARY_IMAGE_FILE_PATTERN = /\.(svg|png|jpe?g|gif|webp|bmp|ico)$/iu;

export function imageLibraryImportKindForInput(input?: { dataset?: { imageImportKind?: string } } | null): ImageLibraryImportKind {
  const kind = input?.dataset?.imageImportKind;
  return kind === "image" || kind === "archive" ? kind : "mixed";
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
  const { activeImageFolderId, imageTarget, importBackendIconLibraryFile, refreshImageFolders, requireEditMode, saveImageAsset, setImageAssetList, setImageAssets, uploadBackendImage } = __appScope;
    if (!requireEditMode("上传图片")) {
      event.target.value = "";
      return;
    }
    const files = Array.from(event.target.files ?? []);
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
          window.alert(importKind === "archive"
            ? `“${file.name || "所选文件"}”不是 DOCX/PPTX/XLSX/VSDX/WPS/DPS/ZIP 文档图片导入文件，请使用外部图片入口直接导入图片。`
            : `“${file.name || "所选文件"}”不是 SVG/PNG/JPG 等图片文件，请使用文档图片/图标入口导入文档中的图片和矢量图标素材。`);
          continue;
        }
        let imageData = "";
        try {
          imageData = await readFileAsDataUrl(file);
        } catch (error) {
          window.alert(error instanceof Error ? error.message : `读取 ${file.name || "图片"} 失败。`);
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
            window.alert(error instanceof Error ? error.message : `导入 ${file.name || "文档图片"} 失败。`);
          }
          continue;
        }
        let asset: ImageAsset;
        try {
          asset = await uploadBackendImage(file.name, imageData, activeImageFolderId);
        } catch (error) {
          window.alert(error instanceof Error ? error.message : `上传 ${file.name || "图片"} 到后台失败。`);
          const fallbackId = `asset-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
          saveImageAsset(fallbackId, imageData);
          asset = { id: fallbackId, name: file.name || "本地图片", folderId: activeImageFolderId, url: imageData };
        }
        nextAssets.push(asset);
        nextAssetMap[asset.id] = asset.url;
      }
      if (nextAssets.length > 0) {
        setImageAssetList((current) => [...nextAssets, ...current.filter((item) => !nextAssets.some((asset) => asset.id === item.id))]);
        setImageAssets((current) => ({ ...current, ...nextAssetMap }));
      }
      void refreshImageFolders();
    })();
  };
}

export function createApplyExistingImage(__appScope: Record<string, any>) {
  return async (assetId: string) => {
  const { createEditableStateIconElementsFromSvgSource, createImportedStateIconElement, imageAssetList, imageAssets, imageTarget, libraryTemplateByKind, pushUndoSnapshot, requireEditMode, setCanvasBackgroundImage, setCanvasBackgroundImageAssetId, setImageTarget, setStateIconDrawingDialog, startLibraryDevicePlacement, stateIconDrawingHistoryRef, svgSourceFromDataUrl, updateGraphNodeById, writeOperationLog } = __appScope;
    if (!requireEditMode("应用图片")) {
      return;
    }
    const asset = imageAssetList.find((item: ImageAsset) => item.id === assetId);
    const imageData = imageAssets[assetId] ?? asset?.url;
    if (!imageTarget || !imageData) {
      return;
    }
    if (imageTarget.kind === "stateIconFrameBackground") {
      const backgroundImage = asset?.url ?? `/api/images/${assetId}`;
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
        window.alert("未找到静态图片图元定义，无法插入图标。");
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
      updateGraphNodeById(imageTarget.nodeId, (node) =>
        imageTarget.kind === "nodeForeground"
          ? { ...node, params: { ...node.params, foregroundImageAssetId: assetId, foregroundImage: imageData } }
          : { ...node, params: { ...node.params, backgroundImageAssetId: assetId, backgroundImage: imageData } }
      );
    }
    setImageTarget(null);
  };
}

function stateIconDrawingImportedSvgSelectionFrame(element: any) {
  if (element?.kind !== "imported-svg" || !element.svgSource) {
    return null;
  }
  const [x, y, width, height] = stateIconSvgVisibleViewBox(element.svgSource)
    .split(/\s+/u)
    .map((value) => Number.parseFloat(value));
  if (![x, y, width, height].every(Number.isFinite) || width <= 0 || height <= 0) {
    return null;
  }
  const elementWidth = Math.max(1, Number(element.width) || 1);
  const elementHeight = Math.max(1, Number(element.height) || 1);
  const scale = Math.min(elementWidth / width, elementHeight / height);
  const fittedWidth = width * scale;
  const fittedHeight = height * scale;
  return {
    x: -fittedWidth / 2,
    y: -fittedHeight / 2,
    width: fittedWidth,
    height: fittedHeight,
    halfWidth: fittedWidth / 2,
    halfHeight: fittedHeight / 2
  };
}

export function createApplyIconLibraryCatalogIcon(__appScope: Record<string, any>) {
  return async (iconEntryId: string) => {
  const { createEditableStateIconElementsFromSvgSource, createImportedStateIconElement, iconLibraryPicker, imageTarget, libraryTemplateByKind, pushUndoSnapshot, requireEditMode, setCanvasBackgroundImage, setCanvasBackgroundImageAssetId, setImageTarget, setStateIconDrawingDialog, startLibraryDevicePlacement, stateIconDrawingHistoryRef, updateGraphNodeById, writeOperationLog } = __appScope;
    if (!requireEditMode("选择分类图标")) {
      return;
    }
    if (!imageTarget) {
      return;
    }
    const entry = iconLibraryPicker?.entries?.find((item: any) => item.id === iconEntryId);
    if (!entry) {
      window.alert("未找到所选分类图标，请刷新后重试。");
      return;
    }
    const assetName = `${entry.libraryLabel || entry.libraryId} / ${entry.categoryLabel || entry.categoryId} / ${entry.name || entry.iconId}`;
    if (imageTarget.kind !== "stateIconDrawing") {
      const iconUrl = entry.url;
      if (!iconUrl) {
        window.alert("未找到所选分类图标文件地址，请刷新后重试。");
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
          window.alert("未找到静态图片图元定义，无法插入图标。");
          return;
        }
        startLibraryDevicePlacement({
          ...baseTemplate,
          label: entry.name || baseTemplate.label || "图标",
          params: {
            ...baseTemplate.params,
            text: entry.name || baseTemplate.params?.text || "",
            backgroundImage: iconUrl,
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
      window.alert("读取分类图标失败。");
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
  const { imageTarget, pushUndoSnapshot, requireEditMode, setCanvasBackgroundImage, setCanvasBackgroundImageAssetId, setCanvasBackgroundImageFit, setImageTarget, setStateIconDrawingDialog, updateGraphNodeById } = __appScope;
    if (!requireEditMode("清除图片")) {
      return;
    }
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
      updateGraphNodeById(imageTarget.nodeId, (node) =>
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
  const { pushUndoSnapshot, requireEditMode, updateGraphNodeById } = __appScope;
    if (!requireEditMode("清除图片")) {
      return;
    }
    pushUndoSnapshot();
    updateGraphNodeById(nodeId, (node) => ({
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
  const { createBackendImageFolder, refreshImageFolders, requireEditMode, setActiveImageFolderId } = __appScope;
    if (!requireEditMode("新建图片文件夹")) {
      return;
    }
    const inputName = window.prompt("请输入图片文件夹名称", "新建文件夹");
    if (inputName === null) {
      return;
    }
    const name = inputName.trim();
    if (!name) {
      window.alert("图片文件夹名称不能为空。");
      return;
    }
    try {
      const folder = await createBackendImageFolder(name);
      await refreshImageFolders();
      setActiveImageFolderId(folder.id);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "新建图片文件夹失败。");
    }
  };
}

export function createRenameImageFolder(__appScope: Record<string, any>) {
  return async () => {
  const { activeImageFolderId, imageFolders, refreshImageFolders, renameBackendImageFolder, requireEditMode } = __appScope;
    if (!requireEditMode("重命名图片文件夹")) {
      return;
    }
    const folder = imageFolders.find((item) => item.id === activeImageFolderId);
    if (!folder || folder.id === "root") {
      window.alert("默认文件夹不能重命名。");
      return;
    }
    const inputName = window.prompt("请输入新的图片文件夹名称", folder.name);
    if (inputName === null) {
      return;
    }
    const name = inputName.trim();
    if (!name) {
      window.alert("图片文件夹名称不能为空。");
      return;
    }
    try {
      await renameBackendImageFolder(folder.id, name);
      await refreshImageFolders();
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "重命名图片文件夹失败。");
    }
  };
}

export function createDeleteImageFolder(__appScope: Record<string, any>) {
  return async () => {
  const { activeImageFolderId, deleteBackendImageFolder, imageFolders, refreshImageFolders, requireEditMode, setActiveImageFolderId } = __appScope;
    if (!requireEditMode("删除图片文件夹")) {
      return;
    }
    const folder = imageFolders.find((item) => item.id === activeImageFolderId);
    if (!folder || folder.id === "root") {
      window.alert("默认文件夹不能删除。");
      return;
    }
    if (!window.confirm(`删除图片文件夹“${folder.name}”？文件夹内图片将移回默认文件夹。`)) {
      return;
    }
    try {
      await deleteBackendImageFolder(folder.id);
      setActiveImageFolderId("root");
      await refreshImageFolders();
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "删除图片文件夹失败。");
    }
  };
}

export function createStartProjectRecordDrag(__appScope: Record<string, any>) {
  return (event: DragEvent<HTMLDivElement>, projectId: string) => {
  const { projectRecordDragActiveRef } = __appScope;
    projectRecordDragActiveRef.current = true;
    event.dataTransfer.setData("application/project-id", projectId);
    event.dataTransfer.effectAllowed = "move";
  };
}

export function createFinishProjectRecordDrag(__appScope: Record<string, any>) {
  return () => {
  const { projectRecordDragActiveRef } = __appScope;
    projectRecordDragActiveRef.current = false;
  };
}

export function createStartSchemeRecordDrag(__appScope: Record<string, any>) {
  return (event: DragEvent<HTMLDivElement>, schemeId: string) => {
  const { schemeRecordDragActiveRef } = __appScope;
    schemeRecordDragActiveRef.current = true;
    event.dataTransfer.setData("application/scheme-id", schemeId);
    event.dataTransfer.effectAllowed = "move";
  };
}

export function createFinishSchemeRecordDrag(__appScope: Record<string, any>) {
  return () => {
  const { schemeRecordDragActiveRef } = __appScope;
    schemeRecordDragActiveRef.current = false;
  };
}

export function createRenderProjectSchemeNode(__appScope: Record<string, any>) {
  return (scheme: SavedSchemeRecord, depth = 0): ReactNode => {
  const { ChevronDown, ChevronRight, FileJson, FolderOpen, activeProjectKey, div, expandedSchemeIds, finishProjectRecordDrag, finishSchemeRecordDrag, isEditMode, moveProjectRecordToScheme, moveSchemeRecordToScheme, p, projectSearchNeedle, renderProjectSchemeNode, requestLoadSavedProject, selectSingleProject, selectSingleScheme, selectedProjectId, selectedProjectIds, selectedSchemeId, selectedSchemeIds, setInspectorTab, setProjectMenu, span, startProjectRecordDrag, startSchemeRecordDrag, toggleProjectSelection, toggleSchemeExpanded, toggleSchemeSelection } = __appScope;
    const isExpanded = projectSearchNeedle ? true : expandedSchemeIds.includes(scheme.id);
    const children = scheme.children ?? [];
    const hasContent = scheme.projects.length > 0 || children.length > 0;
    const schemeIndentStyle = { "--scheme-depth": depth } as CSSProperties;
    const projectIndentStyle = { "--scheme-depth": depth + 1 } as CSSProperties;
    return (
      <div
        className={`scheme-group ${depth > 0 ? "nested" : ""}`}
        key={scheme.id}
        style={schemeIndentStyle}
      >
        <div
          role="option"
          aria-label={`方案：${scheme.name}`}
          aria-selected={selectedSchemeIds.includes(scheme.id) || selectedSchemeId === scheme.id}
          aria-expanded={isExpanded}
          tabIndex={0}
          draggable={isEditMode}
          className={`scheme-option ${selectedSchemeIds.includes(scheme.id) || selectedSchemeId === scheme.id ? "selected" : ""}`}
          style={schemeIndentStyle}
          onClick={(event) => {
            if (event.ctrlKey || event.metaKey || event.shiftKey) {
              toggleSchemeSelection(scheme.id);
            } else {
              selectSingleScheme(scheme.id);
            }
            toggleSchemeExpanded(scheme.id);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " " || event.key === "Spacebar") {
              event.preventDefault();
              if (event.ctrlKey || event.metaKey || event.shiftKey) {
                toggleSchemeSelection(scheme.id);
              } else {
                selectSingleScheme(scheme.id);
              }
              toggleSchemeExpanded(scheme.id);
            }
          }}
          onDragOver={(event) => event.preventDefault()}
          onDragStart={(event) => {
            if (!isEditMode) {
              event.preventDefault();
              return;
            }
            startSchemeRecordDrag(event, scheme.id);
          }}
          onDragEnd={finishSchemeRecordDrag}
          onDrop={(event) => {
            event.preventDefault();
            event.stopPropagation();
            if (!isEditMode) {
              return;
            }
            finishProjectRecordDrag();
            finishSchemeRecordDrag();
            const schemeId = event.dataTransfer.getData("application/scheme-id");
            if (schemeId) {
              moveSchemeRecordToScheme(schemeId, scheme.id);
              return;
            }
            const projectId = event.dataTransfer.getData("application/project-id");
            if (projectId) {
              moveProjectRecordToScheme(projectId, scheme.id);
            }
          }}
          onContextMenu={(event) => {
            event.preventDefault();
            event.stopPropagation();
            if (!selectedSchemeIds.includes(scheme.id)) {
              selectSingleScheme(scheme.id);
            }
            setProjectMenu({ x: event.clientX, y: event.clientY, schemeId: scheme.id });
          }}
        >
          {isExpanded ? <ChevronDown className="scheme-toggle-icon" size={14} /> : <ChevronRight className="scheme-toggle-icon" size={14} />}
          <FolderOpen className="scheme-folder-icon" size={15} />
          <span className="project-tree-name">{scheme.name}</span>
        </div>
        {isExpanded && (
          <div className="scheme-projects">
            {!hasContent ? (
              <p className="project-empty" style={projectIndentStyle}>暂无模型或子方案</p>
            ) : (
              <>
                {scheme.projects.map((project) => {
                  const isProjectSelected = selectedProjectIds.includes(project.id) || project.id === selectedProjectId;
                  return (
                    <div
                      role="option"
                      aria-label={`模型：${project.name}`}
                      aria-selected={isProjectSelected}
                      tabIndex={0}
                      draggable={isEditMode}
                      className={`project-option ${isProjectSelected ? "selected" : ""} ${project.id === activeProjectKey ? "active" : ""}`}
                      style={projectIndentStyle}
                      key={project.id}
                      onClick={(event) => {
                        if (event.ctrlKey || event.metaKey || event.shiftKey) {
                          toggleProjectSelection(scheme.id, project.id);
                        } else {
                          selectSingleProject(scheme.id, project.id);
                        }
                        setInspectorTab("model");
                      }}
                      onDoubleClick={() => requestLoadSavedProject(project, scheme.id)}
                      onDragStart={(event) => {
                        if (!isEditMode) {
                          event.preventDefault();
                          return;
                        }
                        startProjectRecordDrag(event, project.id);
                      }}
                      onDragEnd={finishProjectRecordDrag}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          requestLoadSavedProject(project, scheme.id);
                        } else if (event.key === " " || event.key === "Spacebar") {
                          event.preventDefault();
                          if (event.ctrlKey || event.metaKey || event.shiftKey) {
                            toggleProjectSelection(scheme.id, project.id);
                          } else {
                            selectSingleProject(scheme.id, project.id);
                          }
                        }
                      }}
                      onContextMenu={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        if (!selectedProjectIds.includes(project.id)) {
                          selectSingleProject(scheme.id, project.id);
                        }
                        setProjectMenu({ x: event.clientX, y: event.clientY, schemeId: scheme.id, projectId: project.id });
                      }}
                    >
                      <FileJson className="project-item-icon" size={14} />
                      <span className="project-tree-name">{project.name}</span>
                    </div>
                  );
                })}
                {children.map((child) => renderProjectSchemeNode(child, depth + 1))}
              </>
            )}
          </div>
        )}
      </div>
    );
  };
}

export function createOpenBlankProjectLibraryContextMenu(__appScope: Record<string, any>) {
  return (event: MouseEvent<HTMLElement>) => {
  const { isEditMode, setProjectMenu } = __appScope;
    const target = event.target as HTMLElement | null;
    if (target?.closest(".scheme-option, .project-option, .library-search")) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    if (!isEditMode) {
      return;
    }
    setProjectMenu({ x: event.clientX, y: event.clientY });
  };
}

export function createCustomDeviceDefaultStateVisualDraft(__appScope: Record<string, any>) {
  return (): Partial<DeviceStateDefinition> => {
  const { customDeviceDraft, customDevicePreviewLabel, customDevicePreviewSourceTemplate, customDraftTerminalTypes, generateCustomDeviceImage, selectedCustomComponentTemplate, selectedDefinitionTemplate } = __appScope;
    if (customDeviceDraft.backgroundImageCleared) {
      return {
        image: "",
        imageAssetId: "",
        imageFit: "fixed",
        backgroundImageFit: "fixed",
        imageCleared: "1",
        color: "",
        fillColor: "transparent",
        strokeColor: "transparent",
        textColor: ""
      };
    }
    const sourceTemplate = customDevicePreviewSourceTemplate ?? selectedCustomComponentTemplate ?? selectedDefinitionTemplate;
    const templateImage = !customDeviceDraft.backgroundImage && !customDeviceDraft.backgroundImageAssetId
      ? createTemplateDefaultStateIconImage(__appScope, sourceTemplate, {
          label: customDevicePreviewLabel,
          size: customDeviceDraft.size,
          terminalCount: customDeviceDraft.terminalCount,
          terminalTypes: customDraftTerminalTypes,
          terminalLabels: customDeviceDraft.terminalLabels,
          terminalAnchors: customDeviceDraft.terminalAnchors
        })
      : "";
    const image = customDeviceDraft.backgroundImage ||
      templateImage ||
      generateCustomDeviceImage(customDevicePreviewLabel, customDraftTerminalTypes.length > 0 ? customDraftTerminalTypes : ["ac"]);
    const imageAssetId = customDeviceDraft.backgroundImageAssetId && image === `/api/images/${customDeviceDraft.backgroundImageAssetId}`
      ? customDeviceDraft.backgroundImageAssetId
      : "";
    const imageFit = normalizeImageFitMode(
      customDeviceDraft.backgroundImage || customDeviceDraft.backgroundImageAssetId
        ? customDeviceDraft.backgroundImageFit
        : "fixed"
    );
    return {
      image,
      imageAssetId,
      imageFit,
      backgroundImageFit: imageFit,
      imageCleared: "",
      color: "",
      fillColor: "transparent",
      strokeColor: "transparent",
      textColor: ""
    };
  };
}

export function createSnapCustomDeviceTerminalAnchor(__appScope: Record<string, any>) {
  return (anchor: Point): Point => {
  const { CUSTOM_DEVICE_TERMINAL_ANCHOR_GUIDE_VALUES, CUSTOM_DEVICE_TERMINAL_ANCHOR_SNAP_SCREEN_TOLERANCE, customDevicePreviewHeight, customDevicePreviewWidth, customDeviceTerminalAnchorValue, projectCustomDeviceTerminalAnchorToBoundary } = __appScope;
    const snapAxis = (value: number, tolerance: number) => {
      const normalizedValue = customDeviceTerminalAnchorValue(value);
      const guideValue = CUSTOM_DEVICE_TERMINAL_ANCHOR_GUIDE_VALUES.find((candidate) => Math.abs(normalizedValue - candidate) <= tolerance);
      return guideValue === undefined ? normalizedValue : customDeviceTerminalAnchorValue(guideValue);
    };
    const boundaryAnchor = projectCustomDeviceTerminalAnchorToBoundary(anchor);
    if (Math.abs(boundaryAnchor.x) >= Math.abs(boundaryAnchor.y)) {
      return {
        x: boundaryAnchor.x,
        y: snapAxis(boundaryAnchor.y, CUSTOM_DEVICE_TERMINAL_ANCHOR_SNAP_SCREEN_TOLERANCE / customDevicePreviewHeight)
      };
    }
    return {
      x: snapAxis(boundaryAnchor.x, CUSTOM_DEVICE_TERMINAL_ANCHOR_SNAP_SCREEN_TOLERANCE / customDevicePreviewWidth),
      y: boundaryAnchor.y
    };
  };
}

export function createCustomDeviceTerminalConnectorSegment(__appScope: Record<string, any>) {
  return (anchor: Point) => {
  const { customDevicePreviewHeight, customDevicePreviewWidth, projectCustomDeviceTerminalAnchorToBoundary } = __appScope;
    const boundaryAnchor = projectCustomDeviceTerminalAnchorToBoundary(anchor);
    const from = {
      x: boundaryAnchor.x * customDevicePreviewWidth,
      y: boundaryAnchor.y * customDevicePreviewHeight
    };
    const outwardOffsetX = customDevicePreviewWidth / 6;
    const outwardOffsetY = customDevicePreviewHeight / 6;
    if (Math.abs(boundaryAnchor.x) >= Math.abs(boundaryAnchor.y)) {
      return {
        from,
        to: {
          x: from.x + Math.sign(boundaryAnchor.x || 1) * outwardOffsetX,
          y: from.y
        },
      };
    }
    return {
      from,
      to: {
        x: from.x,
        y: from.y + Math.sign(boundaryAnchor.y || 1) * outwardOffsetY
      }
    };
  };
}

export function createUpdateCustomDeviceTerminalAnchor(__appScope: Record<string, any>) {
  return (index: number, patch: Partial<Point>) => {
  const { createDefaultCustomDeviceTerminalAnchors, customDeviceTerminalAnchorValue, hasOverlappingCustomDeviceTerminalAnchors, projectCustomDeviceTerminalAnchorToBoundary, setCustomDeviceDraft } = __appScope;
    setCustomDeviceDraft((current) => {
      if (index < 0 || index >= current.terminalCount) {
        return current;
      }
      const terminalAnchors = createDefaultCustomDeviceTerminalAnchors(current.terminalCount, current.terminalAnchors);
      const currentAnchor = terminalAnchors[index] ?? { x: 0, y: 0 };
      terminalAnchors[index] = projectCustomDeviceTerminalAnchorToBoundary({
        x: customDeviceTerminalAnchorValue(patch.x ?? currentAnchor.x),
        y: customDeviceTerminalAnchorValue(patch.y ?? currentAnchor.y)
      });
      if (hasOverlappingCustomDeviceTerminalAnchors(terminalAnchors)) {
        return { ...current, error: `端子${index + 1}位置不能与其他端子重叠。` };
      }
      return { ...current, terminalAnchors, error: "" };
    });
  };
}

export function createUpdateCustomDeviceStateDraftRow(__appScope: Record<string, any>) {
  return (rowId: string, patch: Partial<DeviceDefinitionStateDraftRow>) => {
  const { isDefaultStatePageId, setCustomDeviceDraft } = __appScope;
    setCustomDeviceDraft((current) => ({
      ...current,
      stateDefinitions: isDefaultStatePageId(rowId)
        ? current.stateDefinitions
        : current.stateDefinitions.map((row) => (row.id === rowId ? { ...row, ...patch } : row)),
      ...(isDefaultStatePageId(rowId)
        ? {
            backgroundImage: patch.image ?? patch.backgroundImage ?? current.backgroundImage,
            backgroundImageAssetId: patch.imageAssetId ?? patch.backgroundImageAssetId ?? current.backgroundImageAssetId,
            backgroundImageFit: patch.imageFit ?? patch.backgroundImageFit ?? current.backgroundImageFit,
            backgroundImageCleared: patch.imageCleared ?? current.backgroundImageCleared
          }
        : {}),
      error: ""
    }));
  };
}

export function createAddCustomDeviceStateDraftRow(__appScope: Record<string, any>) {
  return () => {
  const { appendNonDefaultStateDraftRow, createStateDraftRowFromDefaultVisual, customDeviceDefaultStateVisualDraft, defaultStateDraftRow, isDefaultStatePageId, nextNonDefaultStateIndex, setCustomDeviceDraft, setCustomDeviceStatePageId, stateDraftRowId, stateIconDrawingDialog, stateIconDrawingInlineImage } = __appScope;
    const defaultVisual = customDeviceDefaultStateVisualDraft();
    const rowId = stateDraftRowId();
    const inlineDefaultStateIconPatch =
      stateIconDrawingDialog?.target.scope === "custom" && isDefaultStatePageId(stateIconDrawingDialog.target.rowId)
        ? {
            image: stateIconDrawingInlineImage,
            imageAssetId: "",
            imageFit: "fixed",
            backgroundImage: "",
            backgroundImageAssetId: "",
            backgroundImageFit: "fixed",
            imageCleared: stateIconDrawingInlineImage ? "" : "1"
          }
        : null;
    const sourceDefaultVisual = inlineDefaultStateIconPatch
      ? { ...defaultVisual, ...inlineDefaultStateIconPatch }
      : defaultVisual;
    setCustomDeviceDraft((current) => ({
      ...current,
      backgroundImage: inlineDefaultStateIconPatch ? stateIconDrawingInlineImage : current.backgroundImage,
      backgroundImageAssetId: inlineDefaultStateIconPatch ? "" : current.backgroundImageAssetId,
      backgroundImageFit: inlineDefaultStateIconPatch ? "fixed" : current.backgroundImageFit,
      backgroundImageCleared: inlineDefaultStateIconPatch ? inlineDefaultStateIconPatch.imageCleared : current.backgroundImageCleared,
      stateDefinitions: (() => {
        const sourceRows = current.stateDefinitions;
        const nextIndex = nextNonDefaultStateIndex(sourceRows);
        const row = {
          ...createStateDraftRowFromDefaultVisual(defaultStateDraftRow(sourceRows, sourceDefaultVisual), {
            value: String(nextIndex),
            name: `状态${nextIndex}`
          }),
          id: rowId
        };
        return appendNonDefaultStateDraftRow(sourceRows, sourceDefaultVisual, row);
      })(),
      error: ""
    }));
    setCustomDeviceStatePageId(rowId);
  };
}

export function createDeleteCustomDeviceStateDraftRow(__appScope: Record<string, any>) {
  return (rowId: string) => {
  const { setCustomDeviceDraft } = __appScope;
    setCustomDeviceDraft((current) => ({
      ...current,
      stateDefinitions: current.stateDefinitions.filter((row) => row.id !== rowId),
      error: ""
    }));
  };
}

export function createUpdateCustomDeviceTerminalAnchorFromPreview(__appScope: Record<string, any>) {
  return (index: number, svg: SVGSVGElement, event: PointerEvent<SVGElement>) => {
  const { customDevicePreviewHeight, customDevicePreviewWidth, snapCustomDeviceTerminalAnchor, updateCustomDeviceTerminalAnchor } = __appScope;
    const matrix = svg.getScreenCTM();
    if (!matrix) {
      return;
    }
    const point = svg.createSVGPoint();
    point.x = event.clientX;
    point.y = event.clientY;
    const transformed = point.matrixTransform(matrix.inverse());
    const snappedAnchor = snapCustomDeviceTerminalAnchor({
      x: transformed.x / customDevicePreviewWidth,
      y: transformed.y / customDevicePreviewHeight
    });
    updateCustomDeviceTerminalAnchor(index, snappedAnchor);
  };
}

export function createDefinitionDefaultStateVisualDraft(__appScope: Record<string, any>) {
  return (): Partial<DeviceStateDefinition> => {
  const { definitionVisualDraft, selectedDefinitionTemplate } = __appScope;
    const params = selectedDefinitionTemplate?.params ?? {};
    if (definitionVisualDraft?.backgroundImageCleared || params.backgroundImageCleared) {
      return {
        image: "",
        imageAssetId: "",
        imageFit: "fixed",
        backgroundImageFit: "fixed",
        imageCleared: "1",
        color: params.foregroundColor || "",
        fillColor: params.fillColor || "",
        strokeColor: params.strokeColor || "",
        textColor: params.textColor || ""
      };
    }
    const rawSourceImage = definitionVisualDraft?.backgroundImage || params.backgroundImage || "";
    const sourceImage = selectedDefinitionTemplate && !selectedDefinitionTemplate.custom && isGeneratedTemplateDefaultStateIconImage(rawSourceImage)
      ? ""
      : rawSourceImage;
    const sourceImageAssetId = sourceImage
      ? definitionVisualDraft?.backgroundImageAssetId || params.backgroundImageAssetId || ""
      : "";
    const templateImage = !sourceImage && !sourceImageAssetId
      ? createTemplateDefaultStateIconImage(__appScope, selectedDefinitionTemplate, {
          size: definitionVisualDraft?.size,
          terminalCount: definitionVisualDraft?.terminalCount,
          terminalTypes: definitionVisualDraft?.terminalTypes,
          terminalLabels: definitionVisualDraft?.terminalLabels,
          terminalAnchors: definitionVisualDraft?.terminalAnchors
        })
      : "";
    const imageFit = normalizeImageFitMode(
      sourceImage || sourceImageAssetId
        ? definitionVisualDraft?.backgroundImageFit ?? params.backgroundImageFit
        : "fixed"
    );
    return {
      image: sourceImage || templateImage,
      imageAssetId: sourceImageAssetId && sourceImage === `/api/images/${sourceImageAssetId}` ? sourceImageAssetId : sourceImage ? "" : sourceImageAssetId,
      imageFit,
      backgroundImageFit: imageFit,
      imageCleared: "",
      color: params.foregroundColor || "",
      fillColor: params.fillColor || "",
      strokeColor: params.strokeColor || "",
      textColor: params.textColor || ""
    };
  };
}

export function createSnapDefinitionTerminalAnchor(__appScope: Record<string, any>) {
  return (anchor: Point): Point => {
  const { CUSTOM_DEVICE_TERMINAL_ANCHOR_GUIDE_VALUES, CUSTOM_DEVICE_TERMINAL_ANCHOR_SNAP_SCREEN_TOLERANCE, customDeviceTerminalAnchorValue, definitionVisualPreviewHeight, definitionVisualPreviewWidth, projectCustomDeviceTerminalAnchorToBoundary } = __appScope;
    const snapAxis = (value: number, tolerance: number) => {
      const normalizedValue = customDeviceTerminalAnchorValue(value);
      const guideValue = CUSTOM_DEVICE_TERMINAL_ANCHOR_GUIDE_VALUES.find((candidate) => Math.abs(normalizedValue - candidate) <= tolerance);
      return guideValue === undefined ? normalizedValue : customDeviceTerminalAnchorValue(guideValue);
    };
    const boundaryAnchor = projectCustomDeviceTerminalAnchorToBoundary(anchor);
    if (Math.abs(boundaryAnchor.x) >= Math.abs(boundaryAnchor.y)) {
      return {
        x: boundaryAnchor.x,
        y: snapAxis(boundaryAnchor.y, CUSTOM_DEVICE_TERMINAL_ANCHOR_SNAP_SCREEN_TOLERANCE / definitionVisualPreviewHeight)
      };
    }
    return {
      x: snapAxis(boundaryAnchor.x, CUSTOM_DEVICE_TERMINAL_ANCHOR_SNAP_SCREEN_TOLERANCE / definitionVisualPreviewWidth),
      y: boundaryAnchor.y
    };
  };
}

export function createDefinitionTerminalConnectorSegment(__appScope: Record<string, any>) {
  return (anchor: Point) => {
  const { definitionVisualPreviewHeight, definitionVisualPreviewWidth, projectCustomDeviceTerminalAnchorToBoundary } = __appScope;
    const boundaryAnchor = projectCustomDeviceTerminalAnchorToBoundary(anchor);
    const from = {
      x: boundaryAnchor.x * definitionVisualPreviewWidth,
      y: boundaryAnchor.y * definitionVisualPreviewHeight
    };
    const outwardOffsetX = definitionVisualPreviewWidth / 6;
    const outwardOffsetY = definitionVisualPreviewHeight / 6;
    if (Math.abs(boundaryAnchor.x) >= Math.abs(boundaryAnchor.y)) {
      return {
        from,
        to: {
          x: from.x + Math.sign(boundaryAnchor.x || 1) * outwardOffsetX,
          y: from.y
        },
      };
    }
    return {
      from,
      to: {
        x: from.x,
        y: from.y + Math.sign(boundaryAnchor.y || 1) * outwardOffsetY
      }
    };
  };
}

export function createUpdateDefinitionTerminalAnchor(__appScope: Record<string, any>) {
  return (index: number, patch: Partial<Point>) => {
  const { createDefaultCustomDeviceTerminalAnchors, customDeviceTerminalAnchorValue, hasOverlappingCustomDeviceTerminalAnchors, projectCustomDeviceTerminalAnchorToBoundary, setDefinitionVisualDraft } = __appScope;
    setDefinitionVisualDraft((current) => {
      if (!current || index < 0 || index >= current.terminalCount) {
        return current;
      }
      const terminalAnchors = createDefaultCustomDeviceTerminalAnchors(current.terminalCount, current.terminalAnchors);
      const currentAnchor = terminalAnchors[index] ?? { x: 0, y: 0 };
      terminalAnchors[index] = projectCustomDeviceTerminalAnchorToBoundary({
        x: customDeviceTerminalAnchorValue(patch.x ?? currentAnchor.x),
        y: customDeviceTerminalAnchorValue(patch.y ?? currentAnchor.y)
      });
      if (hasOverlappingCustomDeviceTerminalAnchors(terminalAnchors)) {
        return { ...current, error: `端子${index + 1}位置不能与其他端子重叠。` };
      }
      return { ...current, terminalAnchors, error: "" };
    });
  };
}

export function createUpdateDefinitionTerminalAnchorFromPreview(__appScope: Record<string, any>) {
  return (index: number, svg: SVGSVGElement, event: PointerEvent<SVGElement>) => {
  const { definitionVisualPreviewHeight, definitionVisualPreviewWidth, snapDefinitionTerminalAnchor, updateDefinitionTerminalAnchor } = __appScope;
    const matrix = svg.getScreenCTM();
    if (!matrix) {
      return;
    }
    const point = svg.createSVGPoint();
    point.x = event.clientX;
    point.y = event.clientY;
    const transformed = point.matrixTransform(matrix.inverse());
    const snappedAnchor = snapDefinitionTerminalAnchor({
      x: transformed.x / definitionVisualPreviewWidth,
      y: transformed.y / definitionVisualPreviewHeight
    });
    updateDefinitionTerminalAnchor(index, snappedAnchor);
  };
}

export function createLoadDefinitionTemplateDraft(__appScope: Record<string, any>) {
  return (template: DeviceTemplate) => {
  const { DEFAULT_STATE_PAGE_ID, categoryLibraryComponentLibraryKey, createDefinitionDraftRows, createDefinitionVisualDraft, normalizeCategoryLibraryName, resolveTemplateComponentLibrary, setCollapsedDefinitionComponentLibraries, setDefinitionDraftError, setDefinitionDraftRows, setDefinitionDraftSection, setDefinitionStateDraftRows, setDefinitionStatePageId, setDefinitionTerminalAnchorDragIndex, setDefinitionVisualDraft, setExpandedDefinitionGroups, setSelectedDefinitionKind } = __appScope;
    const stateRows = createDefinitionStateDraftRowsWithDefaultImages(__appScope, template);
    const visualDraft = clearGeneratedDefinitionVisualDraftImage(template, createDefinitionVisualDraft(template));
    setSelectedDefinitionKind(template.kind);
    const group = normalizeCategoryLibraryName(template.categoryLibrary);
    const componentLibrary = resolveTemplateComponentLibrary(template);
    setExpandedDefinitionGroups((current) => (current.includes(group) ? current : [...current, group]));
    setCollapsedDefinitionComponentLibraries((current) => current.filter((item) => item !== categoryLibraryComponentLibraryKey(group, componentLibrary)));
    setDefinitionDraftRows(createDefinitionDraftRows(template));
    setDefinitionStateDraftRows(stateRows);
    setDefinitionStatePageId(DEFAULT_STATE_PAGE_ID);
    setDefinitionDraftSection(componentLibrary);
    setDefinitionDraftError("");
    setDefinitionVisualDraft(visualDraft);
    setDefinitionTerminalAnchorDragIndex(null);
  };
}

export function createFinishDeviceLibraryDialogPointerOperation(__appScope: Record<string, any>) {
  return () => {
  const { setDeviceLibraryDialogDrag, setDeviceLibraryDialogResize } = __appScope;
    setDeviceLibraryDialogDrag(null);
    setDeviceLibraryDialogResize(null);
  };
}

export function createCurrentDeviceLibraryDialogRect(__appScope: Record<string, any>) {
  return (kind: DeviceLibraryDialogKind) => {
  const { DEVICE_LIBRARY_DIALOG_CONFIG, clampDeviceLibraryDialogLayout, deviceLibraryDialogLayouts, deviceLibraryDialogRefForKind } = __appScope;
    const config = DEVICE_LIBRARY_DIALOG_CONFIG[kind];
    const rect = deviceLibraryDialogRefForKind(kind).current?.getBoundingClientRect();
    if (rect) {
      return clampDeviceLibraryDialogLayout(kind, {
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height
      });
    }
    const viewportWidth = typeof window === "undefined" ? config.defaultWidth : window.innerWidth;
    const viewportHeight = typeof window === "undefined" ? config.defaultHeight : window.innerHeight;
    return clampDeviceLibraryDialogLayout(kind, deviceLibraryDialogLayouts[kind] ?? {
      left: (viewportWidth - config.defaultWidth) / 2,
      top: (viewportHeight - config.defaultHeight) / 2,
      width: config.defaultWidth,
      height: config.defaultHeight
    });
  };
}

export function createDeviceLibraryDialogStyle(__appScope: Record<string, any>) {
  return (kind: DeviceLibraryDialogKind) => {
  const { clampDeviceLibraryDialogLayout, deviceLibraryDialogLayouts } = __appScope;
    const layout = deviceLibraryDialogLayouts[kind];
    if (!layout) {
      return undefined;
    }
    const clampedLayout = clampDeviceLibraryDialogLayout(kind, layout);
    return {
      left: `${clampedLayout.left}px`,
      top: `${clampedLayout.top}px`,
      width: `${clampedLayout.width}px`,
      height: `${clampedLayout.height}px`
    } as CSSProperties;
  };
}

export function createStartDeviceLibraryDialogDrag(__appScope: Record<string, any>) {
  return (kind: DeviceLibraryDialogKind, event: PointerEvent<HTMLElement>) => {
  const { currentDeviceLibraryDialogRect, setDeviceLibraryDialogDrag, setDeviceLibraryDialogLayouts } = __appScope;
    if (event.button !== 0) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    const rect = currentDeviceLibraryDialogRect(kind);
    setDeviceLibraryDialogLayouts((current) => ({ ...current, [kind]: rect }));
    setDeviceLibraryDialogDrag({
      kind,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startLeft: rect.left,
      startTop: rect.top,
      startWidth: rect.width,
      startHeight: rect.height
    });
    event.currentTarget.setPointerCapture(event.pointerId);
  };
}

export function createStartDeviceLibraryDialogResize(__appScope: Record<string, any>) {
  return (kind: DeviceLibraryDialogKind, event: PointerEvent<HTMLDivElement>) => {
  const { currentDeviceLibraryDialogRect, setDeviceLibraryDialogLayouts, setDeviceLibraryDialogResize } = __appScope;
    if (event.button !== 0) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    const rect = currentDeviceLibraryDialogRect(kind);
    setDeviceLibraryDialogLayouts((current) => ({ ...current, [kind]: rect }));
    setDeviceLibraryDialogResize({
      kind,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startLeft: rect.left,
      startTop: rect.top,
      startWidth: rect.width,
      startHeight: rect.height
    });
    event.currentTarget.setPointerCapture(event.pointerId);
  };
}

export function createStopDeviceLibraryDialogEvent(__appScope: Record<string, any>) {
  return (event: PointerEvent<HTMLElement> | MouseEvent<HTMLElement>) => {
  const { finishDeviceLibraryDialogPointerOperation } = __appScope;
    event.stopPropagation();
    if (
      event.type === "pointerup" ||
      event.type === "pointercancel" ||
      event.type === "lostpointercapture"
    ) {
      finishDeviceLibraryDialogPointerOperation();
    }
  };
}

export function createOpenDeviceDefinitionDialog(__appScope: Record<string, any>) {
  return () => {
  const { DEFAULT_STATE_PAGE_ID, cancelPendingCustomComponentTemplateLoad, createCustomDeviceDraftFromTemplate, ensureCustomComponentTreeExpanded, libraryTemplates, normalizeCategoryLibraryName, prepareMeasurementConfigDraft, requireEditMode, resolveTemplateComponentLibrary, selectedCustomComponentTemplate, selectedDefinitionTemplate, setCustomComponentTreeSelection, setCustomDeviceDefinitionMode, setCustomDeviceDialogOpen, setCustomDeviceDialogView, setCustomDeviceDraft, setCustomDeviceDraftCleanBaseline = () => undefined, setCustomDeviceSaveMessage, setCustomDeviceStatePageId, setDefinitionDraftSection, setDeviceDefinitionDialogOpen, setDeviceLibraryDialogLayouts, setEditingCustomDeviceKind, setSelectedDefinitionKind } = __appScope;
    let openedDraft: CustomDeviceDraft | null = null;
    if (!requireEditMode("元件定义")) {
      return;
    }
    const template = selectedCustomComponentTemplate ?? selectedDefinitionTemplate ?? libraryTemplates[0];
    if (template) {
      const categoryLibraryName = normalizeCategoryLibraryName(template.categoryLibrary);
      const section = resolveTemplateComponentLibrary(template);
      cancelPendingCustomComponentTemplateLoad();
      ensureCustomComponentTreeExpanded(categoryLibraryName, section);
      setSelectedDefinitionKind(template.kind);
      setDefinitionDraftSection(section);
      setCustomComponentTreeSelection({ kind: "component", categoryLibraryName, section, templateKind: template.kind });
      setEditingCustomDeviceKind(template.custom ? template.kind : "");
      setCustomDeviceDefinitionMode("edit");
      setCustomDeviceStatePageId(DEFAULT_STATE_PAGE_ID);
      setCustomDeviceSaveMessage("");
      const nextDraft = createCustomDeviceDraftFromTemplate(template, section);
      openedDraft = template.custom ? nextDraft : { ...nextDraft, error: "" };
      setCustomDeviceDialogView("icon");
      setCustomDeviceDraft(openedDraft);
    }
    prepareMeasurementConfigDraft();
    if (openedDraft) {
      setCustomDeviceDraftCleanBaseline(openedDraft);
    }
    setDeviceDefinitionDialogOpen(false);
    setDeviceLibraryDialogLayouts((current: Record<string, any>) => {
      const { custom: _custom, ...rest } = current;
      return rest;
    });
    setCustomDeviceDialogOpen(true);
  };
}

export function createCloseDeviceDefinitionDialog(__appScope: Record<string, any>) {
  return () => {
  const { DEFAULT_STATE_PAGE_ID, finishDeviceLibraryDialogPointerOperation, measurementConfigDraftRef, setDefinitionStateDraftRows, setDefinitionStatePageId, setDefinitionTerminalAnchorDragIndex, setDefinitionVisualDraft, setDeviceDefinitionDialogOpen, setMeasurementConfigDraft, setMeasurementConfigSaveStatus } = __appScope;
    finishDeviceLibraryDialogPointerOperation();
    setDeviceDefinitionDialogOpen(false);
    measurementConfigDraftRef.current = null;
    setMeasurementConfigDraft(null);
    setMeasurementConfigSaveStatus("idle");
    setDefinitionVisualDraft(null);
    setDefinitionStateDraftRows([]);
    setDefinitionStatePageId(DEFAULT_STATE_PAGE_ID);
    setDefinitionTerminalAnchorDragIndex(null);
  };
}

export function createCloseCustomDeviceDialog(__appScope: Record<string, any>) {
  return () => {
  const { finishDeviceLibraryDialogPointerOperation, measurementConfigDraftRef, setCustomDeviceDialogOpen, setCustomDeviceTerminalAnchorDragIndex, setMeasurementConfigDraft, setMeasurementConfigSaveStatus } = __appScope;
    finishDeviceLibraryDialogPointerOperation();
    setCustomDeviceDialogOpen(false);
    measurementConfigDraftRef.current = null;
    setMeasurementConfigDraft(null);
    setMeasurementConfigSaveStatus("idle");
    setCustomDeviceTerminalAnchorDragIndex(null);
  };
}

export function createToggleDefinitionGroup(__appScope: Record<string, any>) {
  return (categoryLibrary: CategoryLibrary) => {
  const { setExpandedDefinitionGroups } = __appScope;
    setExpandedDefinitionGroups((current) =>
      current.includes(categoryLibrary) ? current.filter((item) => item !== categoryLibrary) : [...current, categoryLibrary]
    );
  };
}

export function createToggleDefinitionComponentLibrary(__appScope: Record<string, any>) {
  return (categoryLibrary: CategoryLibrary, componentLibrary: string) => {
  const { categoryLibraryComponentLibraryKey, setCollapsedDefinitionComponentLibraries, setDefinitionDraftSection, setSelectedDefinitionKind } = __appScope;
    const typeKey = categoryLibraryComponentLibraryKey(categoryLibrary, componentLibrary);
    setCollapsedDefinitionComponentLibraries((current) =>
      current.includes(typeKey) ? current.filter((item) => item !== typeKey) : [...current, typeKey]
    );
    // 选中元件库节点：右侧显示共有参数表格
    setDefinitionDraftSection(componentLibrary);
    setSelectedDefinitionKind("");
  };
}

export function createUpdateDefinitionComponentLibraryCommonParamExport(__appScope: Record<string, any>) {
  return (componentLibrary: string, enName: string, patch: { exportEnabled?: boolean; exportName?: string }) => {
  const { deviceDefinitionKeyForTemplate, deviceDefinitionOverrideForTemplate, getTemplateParameterDefinitions, libraryTemplates, normalizeComponentLibraryName, requireEditMode, resolveTemplateComponentLibrary, setCustomDeviceTemplates, setDeviceDefinitionOverrides, writeOperationLog } = __appScope;
    if (!requireEditMode("修改元件库共有参数导出")) {
      return;
    }
    const sectionKey = normalizeComponentLibraryName(componentLibrary);
    if (!sectionKey) {
      return;
    }
    const componentLibraryTemplates = libraryTemplates.filter((template) =>
      normalizeComponentLibraryName(resolveTemplateComponentLibrary(template)) === sectionKey
    );
    if (componentLibraryTemplates.length === 0) {
      return;
    }
    const applyPatch = (definition: DeviceParameterDefinition) => ({
      ...definition,
      ...(typeof patch.exportEnabled === "boolean" ? { exportEnabled: patch.exportEnabled } : {}),
      ...(typeof patch.exportName === "string" ? { exportName: patch.exportName.trim() } : {})
    });
    // 内置元件：批量写 override（与 saveDeviceDefinitionDraft 同模式）
    setDeviceDefinitionOverrides((current) => {
      const next = { ...current };
      for (const template of componentLibraryTemplates) {
        if (template.custom) {
          continue;
        }
        const definitionKey = deviceDefinitionKeyForTemplate(template);
        const existingOverride = deviceDefinitionOverrideForTemplate(template, next);
        const parameterDefinitions = getTemplateParameterDefinitions(template).map((definition) =>
          definition.enName === enName ? applyPatch(definition) : definition
        );
        delete next[template.kind];
        next[definitionKey] = {
          ...existingOverride,
          kind: definitionKey,
          params: { ...(existingOverride?.params ?? {}) },
          parameterDefinitions,
          stateDefinitions: Array.isArray(existingOverride?.stateDefinitions)
            ? existingOverride.stateDefinitions
            : template.stateDefinitions,
          updatedAt: new Date().toISOString()
        };
      }
      return next;
    });
    // 自定义元件：直接改 template.parameterDefinitions
    if (componentLibraryTemplates.some((template) => template.custom)) {
      setCustomDeviceTemplates((current) =>
        current.map((template) => {
          if (!template.custom || !componentLibraryTemplates.some((item) => item.kind === template.kind)) {
            return template;
          }
          const parameterDefinitions = (template.parameterDefinitions ?? []).map((definition) =>
            definition.enName === enName ? applyPatch(definition) : definition
          );
          return { ...template, parameterDefinitions };
        })
      );
    }
    writeOperationLog(`修改元件库共有参数导出：${componentLibrary} ${enName}`);
  };
}

export function createToggleElementTreeGroup(__appScope: Record<string, any>) {
  return (typeKey: string) => {
  const { setCollapsedElementTreeGroups } = __appScope;
    setCollapsedElementTreeGroups((current) =>
      current.includes(typeKey) ? current.filter((item) => item !== typeKey) : [...current, typeKey]
    );
  };
}

export function createToggleElementTreeDeviceGroup(__appScope: Record<string, any>) {
  return (deviceKey: string) => {
  const { setCollapsedElementTreeDeviceGroups } = __appScope;
    setCollapsedElementTreeDeviceGroups((current) =>
      current.includes(deviceKey) ? current.filter((item) => item !== deviceKey) : [...current, deviceKey]
    );
  };
}

export function createUpdateDefinitionDraftRow(__appScope: Record<string, any>) {
  return (rowId: string, patch: Partial<DeviceDefinitionDraftRow>) => {
  const { setDefinitionDraftError, setDefinitionDraftRows } = __appScope;
    setDefinitionDraftRows((current) => current.map((row) => (row.id === rowId ? { ...row, ...patch } : row)));
    setDefinitionDraftError("");
  };
}

export function createAddDefinitionDraftRow(__appScope: Record<string, any>) {
  return () => {
  const { deviceDefinitionRowId, setDefinitionDraftError, setDefinitionDraftRows } = __appScope;
    setDefinitionDraftRows((current) => [
      ...current,
      {
        id: deviceDefinitionRowId(),
        cnName: "",
        enName: "",
        valueType: "string",
        typicalValue: "",
        exportEnabled: false,
        exportName: ""
      }
    ]);
    setDefinitionDraftError("");
  };
}

export function createDeleteDefinitionDraftRow(__appScope: Record<string, any>) {
  return (rowId: string) => {
  const { requireEditMode, setDefinitionDraftError, setDefinitionDraftRows } = __appScope;
    if (!requireEditMode("修改元件定义")) {
      return;
    }
    setDefinitionDraftRows((current) => current.filter((row) => row.id !== rowId || row.readonly));
    setDefinitionDraftError("");
  };
}

export function createUpdateDefinitionStateDraftRow(__appScope: Record<string, any>) {
  return (rowId: string, patch: Partial<DeviceDefinitionStateDraftRow>) => {
  const { isDefaultStatePageId, setDefinitionDraftError, setDefinitionStateDraftRows, setDefinitionVisualDraft } = __appScope;
    setDefinitionStateDraftRows((current) =>
      isDefaultStatePageId(rowId)
        ? current
        : current.map((row) => (row.id === rowId ? { ...row, ...patch } : row))
    );
    if (isDefaultStatePageId(rowId)) {
      setDefinitionVisualDraft((current) =>
        current
          ? {
              ...current,
              backgroundImage: patch.image ?? patch.backgroundImage ?? current.backgroundImage,
              backgroundImageAssetId: patch.imageAssetId ?? patch.backgroundImageAssetId ?? current.backgroundImageAssetId,
              backgroundImageFit: patch.imageFit ?? patch.backgroundImageFit ?? current.backgroundImageFit,
              backgroundImageCleared: patch.imageCleared ?? current.backgroundImageCleared,
              error: ""
            }
          : current
      );
    }
    setDefinitionDraftError("");
  };
}

export function createAddDefinitionStateDraftRow(__appScope: Record<string, any>) {
  return () => {
  const { appendNonDefaultStateDraftRow, createStateDraftRowFromDefaultVisual, defaultStateDraftRow, definitionDefaultStateVisualDraft, isDefaultStatePageId, nextNonDefaultStateIndex, setDefinitionDraftError, setDefinitionStateDraftRows, setDefinitionStatePageId, stateDraftRowId, stateIconDrawingDialog, stateIconDrawingInlineImage } = __appScope;
    const defaultVisual = definitionDefaultStateVisualDraft();
    const rowId = stateDraftRowId();
    const inlineDefaultStateIconPatch =
      stateIconDrawingDialog?.target.scope === "definition" && isDefaultStatePageId(stateIconDrawingDialog.target.rowId)
        ? {
            image: stateIconDrawingInlineImage,
            imageAssetId: "",
            imageFit: "fixed",
            backgroundImage: "",
            backgroundImageAssetId: "",
            backgroundImageFit: "fixed",
            imageCleared: stateIconDrawingInlineImage ? "" : "1"
          }
        : null;
    const sourceDefaultVisual = inlineDefaultStateIconPatch
      ? { ...defaultVisual, ...inlineDefaultStateIconPatch }
      : defaultVisual;
    setDefinitionStateDraftRows((current) => {
      const sourceRows = current;
      const nextIndex = nextNonDefaultStateIndex(sourceRows);
      const row = {
        ...createStateDraftRowFromDefaultVisual(defaultStateDraftRow(sourceRows, sourceDefaultVisual), {
          value: String(nextIndex),
          name: `状态${nextIndex}`
        }),
        id: rowId
      };
      return appendNonDefaultStateDraftRow(sourceRows, sourceDefaultVisual, row);
    });
    setDefinitionStatePageId(rowId);
    setDefinitionDraftError("");
  };
}

export function createDeleteDefinitionStateDraftRow(__appScope: Record<string, any>) {
  return (rowId: string) => {
  const { requireEditMode, setDefinitionDraftError, setDefinitionStateDraftRows } = __appScope;
    if (!requireEditMode("修改状态定义")) {
      return;
    }
    setDefinitionStateDraftRows((current) => current.filter((row) => row.id !== rowId));
    setDefinitionDraftError("");
  };
}

export function createRequestCloseCustomDeviceDialog(__appScope: Record<string, any>) {
  return () => {
  const { closeCustomDeviceDialog, customDeviceDraftHasUnsavedChanges, saveCustomDeviceDefinitionDialog } = __appScope;
    if (!customDeviceDraftHasUnsavedChanges()) {
      closeCustomDeviceDialog();
      return;
    }
    const shouldSave = window.confirm("元件定义有未保存修改，是否保存后关闭？\n确定：保存并关闭\n取消：不保存");
    if (shouldSave) {
      saveCustomDeviceDefinitionDialog({ closeAfterSave: true });
      return;
    }
    const shouldDiscard = window.confirm("不保存修改并关闭元件定义？");
    if (shouldDiscard) {
      closeCustomDeviceDialog();
    }
  };
}

export function createUpdateSelectedDefinitionResizePermission(__appScope: Record<string, any>) {
  return (value: string) => {
  const { deviceDefinitionOverrideForTemplate, requireEditMode, selectedDefinitionTemplate, setCustomDeviceTemplates, setDefinitionDraftError, setDeviceDefinitionOverrides, writeOperationLog } = __appScope;
    if (!requireEditMode("修改元件变形权限")) {
      return;
    }
    if (!selectedDefinitionTemplate) {
      return;
    }
    const nextAllowed = value === "1";
    const targetKind = selectedDefinitionTemplate.kind;
    if (selectedDefinitionTemplate.custom) {
      setCustomDeviceTemplates((current) =>
        current.map((template) =>
          template.kind === targetKind
            ? {
                ...template,
                allowResizeTransform: nextAllowed
              }
            : template
        )
      );
    } else {
      setDeviceDefinitionOverrides((current) => {
        const existingOverride = deviceDefinitionOverrideForTemplate(selectedDefinitionTemplate, current);
        return {
          ...current,
          [targetKind]: {
            ...existingOverride,
            kind: targetKind,
            allowResizeTransform: nextAllowed,
            updatedAt: new Date().toISOString()
          }
        };
      });
    }
    setDefinitionDraftError("");
    writeOperationLog(`修改元件变形权限：${selectedDefinitionTemplate.label} ${nextAllowed ? "允许" : "不允许"}`);
  };
}

export function createSaveDeviceDefinitionStateVisualDraft(__appScope: Record<string, any>) {
  return () => {
  const { DEFAULT_STATE_PAGE_ID, activeStateDraftRow, createStateDraftRow, definitionStateDraftRows, definitionStatePageId, deviceDefinitionOverrideForTemplate, getTemplateParameterDefinitions, requireEditMode, selectedDefinitionTemplate, setCustomDeviceTemplates, setDefinitionDraftError, setDefinitionStateDraftRows, setDefinitionStatePageId, setDeviceDefinitionOverrides, syncExistingNodesWithTemplateDefinitions, validateStateDraftRows, writeOperationLog } = __appScope;
    if (!requireEditMode("保存状态样式")) {
      return;
    }
    if (!selectedDefinitionTemplate) {
      return;
    }
    const stateValidation = validateStateDraftRows(definitionStateDraftRows);
    if (stateValidation.error) {
      setDefinitionDraftError(stateValidation.error);
      return;
    }
    const stateDefinitions = stateValidation.states;
    const activeStateValue = activeStateDraftRow(definitionStateDraftRows, definitionStatePageId)?.value.trim() ?? "";
    if (selectedDefinitionTemplate.custom) {
      setCustomDeviceTemplates((current) =>
        current.map((template) => {
          if (template.kind !== selectedDefinitionTemplate.kind) {
            return template;
          }
          const { status, ...templateParams } = template.params;
          void status;
          return {
                ...template,
                params: templateParams,
                stateDefinitions
              };
        })
      );
    } else {
      setDeviceDefinitionOverrides((current) => {
        const existingOverride = deviceDefinitionOverrideForTemplate(selectedDefinitionTemplate, current);
        return {
          ...current,
          [selectedDefinitionTemplate.kind]: {
            ...existingOverride,
            kind: selectedDefinitionTemplate.kind,
            params: existingOverride?.params ?? {},
            stateDefinitions,
            updatedAt: new Date().toISOString()
          }
        };
      });
    }
    syncExistingNodesWithTemplateDefinitions(
      {
        parameterDefinitions: getTemplateParameterDefinitions(selectedDefinitionTemplate),
        stateDefinitions
      },
      getTemplateParameterDefinitions(selectedDefinitionTemplate),
      (node) => node.kind === selectedDefinitionTemplate.kind
    );
    const nextStateRows = stateDefinitions.map((definition) => createStateDraftRow(definition));
    setDefinitionStateDraftRows(nextStateRows);
    setDefinitionStatePageId(nextStateRows.find((row) => row.value === activeStateValue)?.id ?? DEFAULT_STATE_PAGE_ID);
    setDefinitionDraftError("");
    writeOperationLog(`保存状态样式：${selectedDefinitionTemplate.label}`);
  };
}

export function createSaveDeviceDefinitionVisualDraft(__appScope: Record<string, any>) {
  return () => {
  const { DEFAULT_STATE_PAGE_ID, TERMINAL_TYPE_LIBRARY_LABELS, activeStateDraftRow, createStateDraftRow, definitionStateDraftRows, definitionStatePageId, definitionVisualDraft, definitionVisualTerminalAnchors, deviceDefinitionOverrideForTemplate, getTemplateParameterDefinitions, hasOverlappingCustomDeviceTerminalAnchors, requireEditMode, selectedDefinitionTemplate, setCustomDeviceTemplates, setDefinitionDraftError, setDefinitionStateDraftRows, setDefinitionStatePageId, setDefinitionTerminalAnchorDragIndex, setDefinitionVisualDraft, setDeviceDefinitionOverrides, syncExistingNodesWithTemplateDefinitions, templateAllowsResizeTransform, validateStateDraftRows, writeOperationLog } = __appScope;
    if (!requireEditMode("保存元件图标和端子")) {
      return;
    }
    if (!selectedDefinitionTemplate || !definitionVisualDraft) {
      return;
    }
    if (hasOverlappingCustomDeviceTerminalAnchors(definitionVisualTerminalAnchors)) {
      const message = "不同端子位置不能重叠，请调整端子位置后再保存。";
      window.alert(message);
      setDefinitionVisualDraft((current) => current ? { ...current, error: message } : current);
      return;
    }
    const stateValidation = validateStateDraftRows(definitionStateDraftRows);
    if (stateValidation.error) {
      setDefinitionDraftError(stateValidation.error);
      return;
    }
    const stateDefinitions = stateValidation.states;
    const activeStateValue = activeStateDraftRow(definitionStateDraftRows, definitionStatePageId)?.value.trim() ?? "";
    const terminalTypes = definitionVisualDraft.terminalTypes.slice(0, definitionVisualDraft.terminalCount);
    const terminalLabels = definitionVisualDraft.terminalLabels.slice(0, definitionVisualDraft.terminalCount).map((label, index) => {
      const type = terminalTypes[index] ?? selectedDefinitionTemplate.terminalType;
      return label.trim() || `${TERMINAL_TYPE_LIBRARY_LABELS[type] ?? type}端${index + 1}`;
    });
    const terminalAnchors = definitionVisualTerminalAnchors.slice(0, definitionVisualDraft.terminalCount).map((anchor) => ({ ...anchor }));
    const size = {
      width: Math.max(1, Math.round(definitionVisualDraft.size.width || selectedDefinitionTemplate.size.width || 104)),
      height: Math.max(1, Math.round(definitionVisualDraft.size.height || selectedDefinitionTemplate.size.height || 64))
    };
    const inlineBackgroundPatch = inlineDefaultIconBackgroundPatch(__appScope, "definition");
    const draftBackground = {
      backgroundImage: inlineBackgroundPatch?.backgroundImage ?? definitionVisualDraft.backgroundImage,
      backgroundImageAssetId: inlineBackgroundPatch?.backgroundImageAssetId ?? definitionVisualDraft.backgroundImageAssetId,
      backgroundImageFit: definitionVisualDraft.backgroundImageFit ?? "cover",
      backgroundImageCleared: inlineBackgroundPatch?.backgroundImageCleared ?? definitionVisualDraft.backgroundImageCleared
    };
    const hasGeneratedDefinitionBackground = !selectedDefinitionTemplate.custom && isGeneratedTemplateDefaultStateIconImage(draftBackground.backgroundImage);
    const backgroundParams = {
      backgroundImage: hasGeneratedDefinitionBackground ? "" : draftBackground.backgroundImage,
      backgroundImageAssetId: hasGeneratedDefinitionBackground ? "" : draftBackground.backgroundImageAssetId,
      backgroundImageFit: hasGeneratedDefinitionBackground ? "cover" : draftBackground.backgroundImageFit,
      backgroundImageCleared: hasGeneratedDefinitionBackground ? "" : draftBackground.backgroundImageCleared
    };
    const parameterDefinitions = selectedDefinitionTemplate.parameterDefinitions ?? getTemplateParameterDefinitions(selectedDefinitionTemplate);
    if (selectedDefinitionTemplate.custom) {
      setCustomDeviceTemplates((current) =>
        current.map((template) => {
          if (template.kind !== selectedDefinitionTemplate.kind) {
            return template;
          }
          const { status, ...templateParams } = template.params;
          void status;
          return {
                ...template,
                size,
                params: {
                  ...templateParams,
                  ...backgroundParams
                },
                terminalType: terminalTypes[0] ?? template.terminalType,
                terminalCount: definitionVisualDraft.terminalCount,
                terminalTypes,
                terminalLabels,
                terminalAnchors,
                stateDefinitions
              };
        })
      );
    } else {
      setDeviceDefinitionOverrides((current) => {
        const existingOverride = deviceDefinitionOverrideForTemplate(selectedDefinitionTemplate, current);
        return {
          ...current,
          [selectedDefinitionTemplate.kind]: {
            ...existingOverride,
            kind: selectedDefinitionTemplate.kind,
            params: {
              ...(existingOverride?.params ?? {}),
              ...backgroundParams
            },
            size,
            terminalType: terminalTypes[0] ?? selectedDefinitionTemplate.terminalType,
            terminalCount: definitionVisualDraft.terminalCount,
            terminalTypes,
            terminalLabels,
            terminalAnchors,
            terminalRoles: existingOverride?.terminalRoles ?? selectedDefinitionTemplate.terminalRoles,
            terminalAssociations: existingOverride?.terminalAssociations ?? selectedDefinitionTemplate.terminalAssociations,
            isContainer: existingOverride?.isContainer ?? selectedDefinitionTemplate.isContainer,
            allowResizeTransform: existingOverride?.allowResizeTransform ?? templateAllowsResizeTransform(selectedDefinitionTemplate),
            parameterDefinitions: existingOverride?.parameterDefinitions ?? parameterDefinitions,
            stateDefinitions,
            updatedAt: new Date().toISOString()
          }
        };
      });
    }
    syncExistingNodesWithTemplateDefinitions(
      {
        parameterDefinitions,
        params: {
          ...(selectedDefinitionTemplate.params ?? {}),
          ...backgroundParams
        },
        size,
        terminalType: terminalTypes[0] ?? selectedDefinitionTemplate.terminalType,
        terminalCount: definitionVisualDraft.terminalCount,
        terminalTypes,
        terminalLabels,
        terminalAnchors,
        stateDefinitions
      },
      parameterDefinitions,
      (node) => node.kind === selectedDefinitionTemplate.kind
    );
    const nextStateRows = stateDefinitions.map((definition) => createStateDraftRow(definition));
    setDefinitionVisualDraft((current) => current ? { ...current, size, terminalLabels, terminalAnchors, ...backgroundParams, error: "" } : current);
    setDefinitionStateDraftRows(nextStateRows);
    setDefinitionStatePageId(nextStateRows.find((row) => row.value === activeStateValue)?.id ?? DEFAULT_STATE_PAGE_ID);
    setDefinitionTerminalAnchorDragIndex(null);
    setDefinitionDraftError("");
    writeOperationLog(`修改元件图标和端子：${selectedDefinitionTemplate.label}`);
  };
}

export function createSaveDeviceDefinitionDraft(__appScope: Record<string, any>) {
  return () => {
  const { ALLOW_RESIZE_TRANSFORM_PARAM, definitionDraftRows, definitionDraftSection, deviceDefinitionKeyForTemplate, deviceDefinitionOverrideForTemplate, deviceDefinitionRowId, getTemplateParameterDefinitions, isReservedDeviceDefinitionParamName, libraryTemplates, measurementConfig, measurementConfigDraft, measurementConfigDraftRef, normalizeComponentLibraryName, normalizeDefinitionRowEnumFields, requireEditMode, selectedDefinitionTemplate, setDefinitionDraftError, setDefinitionDraftRows, setDeviceDefinitionOverrides, syncExistingNodesWithTemplateDefinitions, templateAllowsResizeTransform } = __appScope;
    if (!requireEditMode("保存元件定义")) {
      return;
    }
    if (!selectedDefinitionTemplate) {
      return;
    }
    const definitionComplianceMessage = deviceParameterDefinitionsComplianceMessage(definitionDraftRows);
    if (definitionComplianceMessage) {
      setDefinitionDraftError(definitionComplianceMessage);
      return;
    }
    const normalizedRows: DeviceParameterDefinition[] = [];
    const seenNames = new Set<string>();
    for (const row of definitionDraftRows) {
      const enName = row.enName.trim();
      const cnName = row.cnName.trim();
      if (!enName || !cnName) {
        setDefinitionDraftError("中文名称和英文名称不能为空。");
        return;
      }
      if (isReservedDeviceDefinitionParamName(enName)) {
        setDefinitionDraftError(enName === ALLOW_RESIZE_TRANSFORM_PARAM ? "是否允许变形是元件属性，不能在参数定义表中新增。" : "是否容器是元件属性，不能在参数定义表中新增。");
        return;
      }
      const key = enName.toLowerCase();
      if (seenNames.has(key)) {
        setDefinitionDraftError(`英文名称 ${enName} 重复，无法保存。`);
        return;
      }
      seenNames.add(key);
      normalizedRows.push(normalizeDefinitionRowEnumFields({
        cnName,
        enName,
        valueType: row.valueType,
        typicalValue: row.typicalValue,
        enumOptions: row.enumOptions,
        enumValues: row.enumValues,
        readonly: Boolean(row.readonly),
        ...(typeof row.exportEnabled === "boolean" ? { exportEnabled: row.exportEnabled } : {}),
        ...(typeof row.exportName === "string" ? { exportName: row.exportName.trim() } : {})
      }));
    }
    const definitionKey = normalizeComponentLibraryName(definitionDraftSection) || deviceDefinitionKeyForTemplate(selectedDefinitionTemplate);
    const params = normalizedRows.reduce<Record<string, string>>((acc, row) => {
      if (row.enName !== "name") {
        acc[row.enName] = row.typicalValue;
      }
      return acc;
    }, {
      component_type: definitionKey
    });
    const currentMeasurementConfig = measurementConfigDraftRef?.current ?? measurementConfigDraft ?? measurementConfig;
    const selectedProfileItems = currentMeasurementConfig?.deviceProfiles?.find((profile) => profile.deviceKind === definitionKey)?.items ?? [];
    const measurementProfileMessage = measurementProfileItemsComplianceMessage(selectedProfileItems, {
      measurementTypes: currentMeasurementConfig?.measurementTypes ?? [],
      parameterDefinitions: normalizedRows,
      positionDefinitions: buildMeasurementProfilePositionDefinitions({
        source: { ...selectedDefinitionTemplate, parameterDefinitions: normalizedRows },
        parameterDefinitions: normalizedRows,
        libraryTemplates
      }),
      targetLabel: selectedDefinitionTemplate.label
    });
    if (measurementProfileMessage) {
      setDefinitionDraftError(measurementProfileMessage);
      return;
    }
    const previousDefinitions = getTemplateParameterDefinitions(selectedDefinitionTemplate);
    syncExistingNodesWithTemplateDefinitions(
      { parameterDefinitions: normalizedRows },
      previousDefinitions,
      (node) => node.kind === selectedDefinitionTemplate.kind
    );
    setDeviceDefinitionOverrides((current) => {
      const next = { ...current };
      const existingOverride = deviceDefinitionOverrideForTemplate(selectedDefinitionTemplate, current);
      delete next[selectedDefinitionTemplate.kind];
      next[definitionKey] = {
        ...existingOverride,
        kind: definitionKey,
        params: {
          ...(existingOverride?.params ?? {}),
          ...params
        },
        allowResizeTransform: templateAllowsResizeTransform(selectedDefinitionTemplate),
        parameterDefinitions: normalizedRows,
        stateDefinitions: Array.isArray(existingOverride?.stateDefinitions)
          ? existingOverride.stateDefinitions
          : selectedDefinitionTemplate.stateDefinitions,
        updatedAt: new Date().toISOString()
      };
      return next;
    });
    setDefinitionDraftRows(normalizedRows.map((row) => ({ ...row, id: deviceDefinitionRowId() })));
    setDefinitionDraftError("");
  };
}

export function createResetDeviceDefinitionDraft(__appScope: Record<string, any>) {
  return () => {
  const { deviceDefinitionKeyForTemplate, loadDefinitionTemplateDraft, requireEditMode, selectedDefinitionBaseTemplate, setDeviceDefinitionOverrides } = __appScope;
    if (!requireEditMode("重置元件定义")) {
      return;
    }
    if (!selectedDefinitionBaseTemplate) {
      return;
    }
    loadDefinitionTemplateDraft(selectedDefinitionBaseTemplate);
    const definitionKey = deviceDefinitionKeyForTemplate(selectedDefinitionBaseTemplate);
    setDeviceDefinitionOverrides((current) => {
      const next = { ...current };
      delete next[definitionKey];
      delete next[selectedDefinitionBaseTemplate.kind];
      return next;
    });
  };
}

export function createUpdateCustomDraftTerminalCount(__appScope: Record<string, any>) {
  return (value: number) => {
  const { MAX_CUSTOM_DEVICE_TERMINALS, TERMINAL_TYPE_LIBRARY_LABELS, createDefaultCustomDeviceTerminalAnchors, normalizeContainerTerminalAssociations, setCustomDeviceDialogView, setCustomDeviceDraft } = __appScope;
    const count = clampNumber(Math.round(value || 0), 0, MAX_CUSTOM_DEVICE_TERMINALS);
    if (count === 0) {
      setCustomDeviceDialogView("icon");
    }
    setCustomDeviceDraft((current) => {
      const fallback = current.categoryLibraryName.includes("直流")
        ? "dc"
        : current.categoryLibraryName.includes("氢")
          ? "h2"
          : current.categoryLibraryName.includes("热")
            ? "heat"
            : "ac";
      const terminalTypes = [...current.terminalTypes];
      while (terminalTypes.length < count) {
        terminalTypes.push(fallback);
      }
      const terminalLabels = [...current.terminalLabels];
      while (terminalLabels.length < count) {
        const type = terminalTypes[terminalLabels.length] ?? fallback;
        terminalLabels.push(`${TERMINAL_TYPE_LIBRARY_LABELS[type] ?? type}端${terminalLabels.length + 1}`);
      }
      const terminalRoles = [...current.terminalRoles];
      while (terminalRoles.length < count) {
        terminalRoles.push("single-load");
      }
      const terminalAssociations = normalizeContainerTerminalAssociations([...terminalTypes], current.terminalAssociations, count);
      return {
        ...current,
        terminalCount: count,
        terminalTypes,
        terminalLabels,
        terminalAnchors: createDefaultCustomDeviceTerminalAnchors(count, current.terminalAnchors),
        terminalRoles,
        terminalAssociations,
        error: ""
      };
    });
  };
}

export function createChooseCustomDeviceBackground(__appScope: Record<string, any>) {
  return (event: ChangeEvent<HTMLInputElement>) => {
  const { activeImageFolderId, refreshImageFolders, requireEditMode, setCustomDeviceDraft, setCustomDeviceSaveMessage, setImageAssetList, setImageAssets, uploadBackendImage } = __appScope;
    if (!requireEditMode("上传元件图标")) {
      event.target.value = "";
      return;
    }
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) {
      return;
    }
    const reader = new FileReader();
    reader.onload = async () => {
      const imageData = String(reader.result ?? "");
      let asset: ImageAsset | null = null;
      try {
        const uploadedAsset = await uploadBackendImage(file.name, imageData, activeImageFolderId);
        asset = uploadedAsset;
        setImageAssetList((current) => [uploadedAsset, ...current.filter((item) => item.id !== uploadedAsset.id)]);
        setImageAssets((current) => ({ ...current, [uploadedAsset.id]: uploadedAsset.url }));
        void refreshImageFolders();
      } catch (error) {
        window.alert(error instanceof Error ? error.message : "上传元件图标到后台失败，将仅保留当前本地预览。");
      }
      setCustomDeviceDraft((current) => ({
        ...current,
        backgroundImage: asset?.url ?? imageData,
        backgroundImageAssetId: asset?.id ?? "",
        backgroundImageCleared: "",
        error: ""
      }));
      setCustomDeviceSaveMessage(asset ? "图标已上传到后台，保存自定义设备后生效。" : "图标已设置为本地预览，保存自定义设备后生效。");
    };
    reader.readAsDataURL(file);
  };
}

export function createChooseDefinitionTemplateIcon(__appScope: Record<string, any>) {
  return (event: ChangeEvent<HTMLInputElement>) => {
  const { activeImageFolderId, refreshImageFolders, requireEditMode, setDefinitionVisualDraft, setImageAssetList, setImageAssets, uploadBackendImage } = __appScope;
    if (!requireEditMode("上传元件图标")) {
      event.target.value = "";
      return;
    }
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) {
      return;
    }
    const reader = new FileReader();
    reader.onload = async () => {
      const imageData = String(reader.result ?? "");
      let asset: ImageAsset | null = null;
      try {
        const uploadedAsset = await uploadBackendImage(file.name, imageData, activeImageFolderId);
        asset = uploadedAsset;
        setImageAssetList((current) => [uploadedAsset, ...current.filter((item) => item.id !== uploadedAsset.id)]);
        setImageAssets((current) => ({ ...current, [uploadedAsset.id]: uploadedAsset.url }));
        void refreshImageFolders();
      } catch (error) {
        window.alert(error instanceof Error ? error.message : "上传元件图标到后台失败，将仅保留当前本地预览。");
      }
      setDefinitionVisualDraft((current) =>
        current
          ? {
              ...current,
              backgroundImage: asset?.url ?? imageData,
              backgroundImageAssetId: asset?.id ?? "",
              backgroundImageCleared: "",
              error: ""
            }
          : current
      );
    };
    reader.readAsDataURL(file);
  };
}

export function createChooseStateVisualImage(__appScope: Record<string, any>) {
  return (event: ChangeEvent<HTMLInputElement>) => {
  const { activeImageFolderId, refreshImageFolders, requireEditMode, setImageAssetList, setImageAssets, setStateImageUploadTarget, stateImageUploadTarget, updateCustomDeviceStateDraftRow, updateDefinitionStateDraftRow, uploadBackendImage } = __appScope;
    if (!requireEditMode("上传状态图形")) {
      event.target.value = "";
      return;
    }
    const file = event.target.files?.[0];
    const target = stateImageUploadTarget;
    event.target.value = "";
    setStateImageUploadTarget(null);
    if (!file || !target) {
      return;
    }
    const reader = new FileReader();
    reader.onload = async () => {
      const imageData = String(reader.result ?? "");
      let asset: ImageAsset | null = null;
      try {
        const uploadedAsset = await uploadBackendImage(file.name, imageData, activeImageFolderId);
        asset = uploadedAsset;
        setImageAssetList((current) => [uploadedAsset, ...current.filter((item) => item.id !== uploadedAsset.id)]);
        setImageAssets((current) => ({ ...current, [uploadedAsset.id]: uploadedAsset.url }));
        void refreshImageFolders();
      } catch (error) {
        window.alert(error instanceof Error ? error.message : "上传状态图形到后台失败，将仅保留当前本地预览。");
      }
      const patch: Partial<DeviceDefinitionStateDraftRow> = {
        image: asset?.url ?? imageData,
        imageAssetId: asset?.id ?? "",
        imageFit: "fixed",
        backgroundImage: "",
        backgroundImageAssetId: "",
        backgroundImageFit: "fixed",
        imageCleared: ""
      };
      if (target.scope === "definition") {
        updateDefinitionStateDraftRow(target.rowId, patch);
      } else {
        updateCustomDeviceStateDraftRow(target.rowId, patch);
      }
    };
    reader.readAsDataURL(file);
  };
}

export function createChooseStateIconDrawingImport(__appScope: Record<string, any>) {
  return (event: ChangeEvent<HTMLInputElement>) => {
  const { activeImageFolderId, createEditableStateIconElementsFromSvgSource, createImportedStateIconElement, refreshImageFolders, requireEditMode, setImageAssetList, setImageAssets, setStateIconDrawingDialog, stateIconDrawingHistoryRef, stateIconDrawingImportMode, uploadBackendImage } = __appScope;
    if (!requireEditMode("导入绘制图形")) {
      event.target.value = "";
      return;
    }
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) {
      return;
    }
    const isSvg = stateIconDrawingImportMode === "svg" || file.type === "image/svg+xml" || file.name.toLowerCase().endsWith(".svg");
    const appendImportedElements = (importedElements: StateIconDrawingElement[]) => {
      const selectedElementId = importedElements[0]?.id ?? "";
      setStateIconDrawingDialog((current) =>
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
    };
    const reader = new FileReader();
    reader.onload = async () => {
      const source = String(reader.result ?? "");
      if (isSvg) {
        appendImportedElements(createEditableStateIconElementsFromSvgSource(source, file.name, { preserveImportedSvg: true }));
        return;
      }
      // 位图：上传到图片库并引用 /api/images，避免把 base64 位图内联进状态图标 SVG（library.json 膨胀根因）。
      let href = source;
      try {
        const uploadedAsset = await uploadBackendImage(file.name, source, activeImageFolderId);
        href = uploadedAsset.url;
        setImageAssetList((current) => [uploadedAsset, ...current.filter((item) => item.id !== uploadedAsset.id)]);
        setImageAssets((current) => ({ ...current, [uploadedAsset.id]: uploadedAsset.url }));
        void refreshImageFolders();
      } catch (error) {
        window.alert(error instanceof Error ? error.message : "上传图片到后台失败，将以本地预览嵌入。");
      }
      appendImportedElements([createImportedStateIconElement("image", href, file.name)]);
    };
    if (isSvg) {
      reader.readAsText(file);
    } else {
      reader.readAsDataURL(file);
    }
  };
}

export function createUpdateStateIconDrawingElement(__appScope: Record<string, any>) {
  return (elementId: string, patch: Partial<StateIconDrawingElement>) => {
  const { setStateIconDrawingDialog, stateIconDrawingHistoryRef } = __appScope;
    const explicitPatch = {
      ...patch,
      ...(Object.prototype.hasOwnProperty.call(patch, "strokeColor") ? { strokeColorEdited: true } : {}),
      ...(Object.prototype.hasOwnProperty.call(patch, "strokeStyle") ? { strokeStyleEdited: true } : {})
    };
    setStateIconDrawingDialog((current) =>
      current
        ? (pushStateIconDrawingHistorySnapshot(stateIconDrawingHistoryRef, current.elements), {
            ...current,
            elements: current.elements.map((element) => (element.id === elementId ? { ...element, ...explicitPatch } : element))
          })
        : current
    );
  };
}

export function createUpdateStateIconDrawingElements(__appScope: Record<string, any>) {
  return (elementIds: readonly string[], updater: (element: StateIconDrawingElement) => StateIconDrawingElement, options: { recordHistory?: boolean } = {}) => {
  const { setStateIconDrawingDialog, stateIconDrawingHistoryRef } = __appScope;
    const idSet = new Set(elementIds);
    setStateIconDrawingDialog((current) =>
      current
        ? (options.recordHistory ? pushStateIconDrawingHistorySnapshot(stateIconDrawingHistoryRef, current.elements) : undefined, {
            ...current,
            elements: current.elements.map((element) => (idSet.has(element.id) ? updater(element) : element))
          })
        : current
    );
  };
}

export function createStateIconDrawingPointer(__appScope: Record<string, any>) {
  return (event: PointerEvent<SVGElement>): Point => {
  const { stateIconDrawingSvgRef } = __appScope;
    const svg = stateIconDrawingSvgRef.current;
    if (!svg) {
      return { x: 0, y: 0 };
    }
    const point = svg.createSVGPoint();
    point.x = event.clientX;
    point.y = event.clientY;
    const matrix = svg.getScreenCTM();
    if (!matrix) {
      return { x: 0, y: 0 };
    }
    const transformed = point.matrixTransform(matrix.inverse());
    return { x: transformed.x, y: transformed.y };
  };
}

export function createStateIconDrawingSelection(__appScope: Record<string, any>) {
  return (elementId: string, append: boolean) => {
  const { setStateIconDrawingDialog } = __appScope;
    setStateIconDrawingDialog((current) => {
      if (!current) {
        return current;
      }
      const currentIds = current.selectedElementIds.length > 0 ? current.selectedElementIds : [current.selectedElementId].filter(Boolean);
      const selectedElementIds = append
        ? currentIds.includes(elementId)
          ? currentIds.filter((id) => id !== elementId)
          : [...currentIds, elementId]
        : [elementId];
      return {
        ...current,
        selectedElementId: selectedElementIds[selectedElementIds.length - 1] ?? "",
        selectedElementIds
      };
    });
  };
}

export function createStartStateIconDrawingDrag(__appScope: Record<string, any>) {
  return (event: PointerEvent<SVGElement>, elementId: string, mode: StateIconDrawingDragMode) => {
  const { setStateIconDrawingContextMenu, setStateIconDrawingDialog, stateIconDrawingDragRef, stateIconDrawingHistoryRef, stateIconDrawingPointer } = __appScope;
    if (event.button !== 0) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    setStateIconDrawingContextMenu(null);
    (event.currentTarget.closest(".state-icon-drawing-inline") as HTMLElement | null)?.focus();
    const append = event.shiftKey || event.ctrlKey || event.metaKey;
    let dragIds: string[] = [elementId];
    let startElements: StateIconDrawingElement[] = [];
    let center: Point = { x: 0, y: 0 };
    const start = stateIconDrawingPointer(event);
    setStateIconDrawingDialog((current) => {
      if (!current) {
        return current;
      }
      const existingSelection = current.selectedElementIds.length > 0 ? current.selectedElementIds : [current.selectedElementId].filter(Boolean);
      const selectedElementIds = append
        ? existingSelection.includes(elementId)
          ? existingSelection
          : [...existingSelection, elementId]
        : existingSelection.includes(elementId)
          ? existingSelection
          : [elementId];
      dragIds = selectedElementIds;
      startElements = current.elements.filter((element) => selectedElementIds.includes(element.id)).map((element) => ({ ...element }));
      if (startElements.length > 0) {
        pushStateIconDrawingHistorySnapshot(stateIconDrawingHistoryRef, current.elements);
      }
      center = startElements.length === 1
        ? { x: startElements[0].x, y: startElements[0].y }
        : {
            x: startElements.reduce((sum, element) => sum + element.x, 0) / Math.max(1, startElements.length),
            y: startElements.reduce((sum, element) => sum + element.y, 0) / Math.max(1, startElements.length)
          };
      return {
        ...current,
        selectedElementId: selectedElementIds[selectedElementIds.length - 1] ?? "",
        selectedElementIds,
        smartAlignmentGuides: []
      };
    });
    if (startElements.length === 0) {
      return;
    }
    stateIconDrawingDragRef.current = { mode, elementIds: dragIds, start, center, startElements };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };
}

export function createDragStateIconDrawingSelection(__appScope: Record<string, any>) {
  return (event: PointerEvent<SVGSVGElement>) => {
  const { computeStateIconDrawingSmartAlignmentSnap, setStateIconDrawingDialog, stateIconDrawingDragRef, stateIconDrawingPointer, updateStateIconDrawingElements } = __appScope;
    const drag = stateIconDrawingDragRef.current;
    if (!drag) {
      return;
    }
    event.preventDefault();
    const point = stateIconDrawingPointer(event);
    const dx = point.x - drag.start.x;
    const dy = point.y - drag.start.y;
    if (drag.mode === "move") {
      setStateIconDrawingDialog((current) => {
        if (!current) {
          return current;
        }
        const snap = computeStateIconDrawingSmartAlignmentSnap
          ? computeStateIconDrawingSmartAlignmentSnap({
              elements: current.elements,
              selectedIds: drag.elementIds,
              startElements: drag.startElements,
              delta: { x: dx, y: dy }
            })
          : { delta: { x: dx, y: dy }, guides: [] };
        return {
          ...current,
          elements: current.elements.map((element) => {
            const startElement = drag.startElements.find((item) => item.id === element.id);
            return startElement ? { ...element, x: startElement.x + snap.delta.x, y: startElement.y + snap.delta.y } : element;
          }),
          smartAlignmentGuides: snap.guides
        };
      });
      return;
    }
    if (drag.mode === "resize") {
      const startDistance = Math.hypot(drag.start.x - drag.center.x, drag.start.y - drag.center.y) || 1;
      const currentDistance = Math.hypot(point.x - drag.center.x, point.y - drag.center.y) || 1;
      const scale = Math.max(0.05, currentDistance / startDistance);
      updateStateIconDrawingElements(drag.elementIds, (element) => {
        const startElement = drag.startElements.find((item) => item.id === element.id);
        return startElement
          ? {
              ...element,
              x: drag.center.x + (startElement.x - drag.center.x) * scale,
              y: drag.center.y + (startElement.y - drag.center.y) * scale,
              width: Math.max(1, startElement.width * scale),
              height: Math.max(1, startElement.height * scale)
            }
          : element;
      });
      return;
    }
    const startAngle = Math.atan2(drag.start.y - drag.center.y, drag.start.x - drag.center.x);
    const currentAngle = Math.atan2(point.y - drag.center.y, point.x - drag.center.x);
    const deltaAngle = ((currentAngle - startAngle) * 180) / Math.PI;
    updateStateIconDrawingElements(drag.elementIds, (element) => {
      const startElement = drag.startElements.find((item) => item.id === element.id);
      return startElement ? { ...element, rotation: startElement.rotation + deltaAngle } : element;
    });
  };
}

export function createStopStateIconDrawingDrag(__appScope: Record<string, any>) {
  return (event: PointerEvent<SVGSVGElement>) => {
  const { setStateIconDrawingDialog, stateIconDrawingDragRef } = __appScope;
    stateIconDrawingDragRef.current = null;
    setStateIconDrawingDialog?.((current: any) => current ? { ...current, smartAlignmentGuides: [] } : current);
    event.currentTarget.releasePointerCapture?.(event.pointerId);
  };
}

export function createDeleteSelectedStateIconDrawingElements(__appScope: Record<string, any>) {
  return () => {
  const { setStateIconDrawingContextMenu, setStateIconDrawingDialog, stateIconDrawingHistoryRef } = __appScope;
    setStateIconDrawingContextMenu(null);
    setStateIconDrawingDialog((current) => {
      if (!current) {
        return current;
      }
      const selectedIds = current.selectedElementIds.length > 0 ? current.selectedElementIds : [current.selectedElementId].filter(Boolean);
      if (selectedIds.length === 0) {
        return current;
      }
      pushStateIconDrawingHistorySnapshot(stateIconDrawingHistoryRef, current.elements);
      const selectedSet = new Set(selectedIds);
      const elements = current.elements.filter((element) => !selectedSet.has(element.id));
      return {
        ...current,
        elements,
        selectedElementId: elements[0]?.id ?? "",
        selectedElementIds: elements[0]?.id ? [elements[0].id] : []
      };
    });
  };
}

export function createStateIconDrawingKeyDown(__appScope: Record<string, any>) {
  return (event: ReactKeyboardEvent<HTMLElement>) => {
  const { deleteSelectedStateIconDrawingElements, setStateIconDrawingContextMenu, setStateIconDrawingDialog, stateIconDrawingClipboardRef, stateIconDrawingDialog, stateIconDrawingElementId, stateIconDrawingHistoryRef } = __appScope;
    const target = event.target as HTMLElement | null;
    if (target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) {
      return;
    }
    if (event.key === "Enter" && stateIconDrawingDialog?.drawingDraft) {
      event.preventDefault();
      setStateIconDrawingContextMenu(null);
      setStateIconDrawingDialog((current) => finishStateIconDrawingDraft(current, stateIconDrawingHistoryRef));
      return;
    }
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z") {
      event.preventDefault();
      setStateIconDrawingContextMenu(null);
      setStateIconDrawingDialog((current) => {
        if (!current || !stateIconDrawingHistoryRef.current?.length) {
          return current;
        }
        const previous = stateIconDrawingHistoryRef.current[stateIconDrawingHistoryRef.current.length - 1];
        stateIconDrawingHistoryRef.current = stateIconDrawingHistoryRef.current.slice(0, -1);
        const selectedElementId = previous.some((element) => element.id === current.selectedElementId) ? current.selectedElementId : previous[0]?.id ?? "";
        return {
          ...current,
          elements: previous.map((element) => ({ ...element })),
          selectedElementId,
          selectedElementIds: current.selectedElementIds.filter((id) => previous.some((element) => element.id === id))
        };
      });
      return;
    }
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "c") {
      event.preventDefault();
      setStateIconDrawingDialog((current) => {
        if (!current) {
          return current;
        }
        const selectedSet = new Set(stateIconDrawingSelectedIds(current));
        stateIconDrawingClipboardRef.current = current.elements.filter((element) => selectedSet.has(element.id)).map((element) => ({ ...element }));
        return current;
      });
      return;
    }
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "x") {
      event.preventDefault();
      setStateIconDrawingContextMenu(null);
      setStateIconDrawingDialog((current) => cutStateIconDrawingSelection(current, stateIconDrawingClipboardRef, stateIconDrawingHistoryRef));
      return;
    }
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "v") {
      event.preventDefault();
      setStateIconDrawingContextMenu(null);
      setStateIconDrawingDialog((current) => {
        const clipboard = stateIconDrawingClipboardRef.current ?? [];
        if (!current || clipboard.length === 0) {
          return current;
        }
        pushStateIconDrawingHistorySnapshot(stateIconDrawingHistoryRef, current.elements);
        const pasted = cloneStateIconDrawingElements(clipboard, stateIconDrawingElementId);
        return {
          ...current,
          elements: [...current.elements, ...pasted],
          selectedElementId: pasted[pasted.length - 1]?.id ?? "",
          selectedElementIds: pasted.map((element) => element.id)
        };
      });
      return;
    }
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "a") {
      event.preventDefault();
      setStateIconDrawingContextMenu(null);
      setStateIconDrawingDialog((current) => current ? {
        ...current,
        selectedElementId: current.elements[current.elements.length - 1]?.id ?? "",
        selectedElementIds: current.elements.map((element) => element.id)
      } : current);
      return;
    }
    if (event.key === "Delete" || event.key === "Backspace") {
      event.preventDefault();
      deleteSelectedStateIconDrawingElements();
    }
  };
}

export function createAddStateIconDrawingElement(__appScope: Record<string, any>) {
  return (kind: StateVisualShapeKind) => {
  const { setStateIconDrawingContextMenu, setStateIconDrawingDialog } = __appScope;
    setStateIconDrawingContextMenu(null);
    setStateIconDrawingDialog((current) => {
      if (!current) {
        return current;
      }
      return {
        ...current,
        elementLibraryTab: "basic",
        pendingElementKind: kind,
        pendingStaticTemplate: undefined,
        drawingDraft: undefined,
        selectedElementId: "",
        selectedElementIds: []
      };
    });
  };
}

export function createDeleteStateIconDrawingElement(__appScope: Record<string, any>) {
  return (elementId: string) => {
  const { setStateIconDrawingContextMenu, setStateIconDrawingDialog, stateIconDrawingHistoryRef } = __appScope;
    setStateIconDrawingContextMenu(null);
    setStateIconDrawingDialog((current) => {
      if (!current) {
        return current;
      }
      pushStateIconDrawingHistorySnapshot(stateIconDrawingHistoryRef, current.elements);
      const elements = current.elements.filter((element) => element.id !== elementId);
      return {
        ...current,
        elements,
        selectedElementId: elements.some((element) => element.id === current.selectedElementId) ? current.selectedElementId : elements[0]?.id ?? "",
        selectedElementIds: current.selectedElementIds.filter((id) => elements.some((element) => element.id === id))
      };
    });
  };
}

export function createOpenStateIconDrawingDialog(__appScope: Record<string, any>) {
  return (target: StateIconDrawingTarget) => {
  const { createStateIconDrawingInitialElements, customDeviceDraft, definitionStateDraftRows, imageAssets, setStateIconDrawingContextMenu, setStateIconDrawingDialog, stateIconDrawingHistoryRef, stateIconDrawingInitialFrame } = __appScope;
    const row =
      target.scope === "definition"
        ? definitionStateDraftRows.find((item) => item.id === target.rowId)
        : customDeviceDraft.stateDefinitions.find((item) => item.id === target.rowId);
    const initial = createStateIconDrawingInitialElements(row, imageAssets);
    const frame = typeof stateIconDrawingInitialFrame === "function"
      ? stateIconDrawingInitialFrame(row, imageAssets, STATE_ICON_DRAFT_FRAME)
      : { ...STATE_ICON_DRAFT_FRAME };
    stateIconDrawingHistoryRef.current = [];
    setStateIconDrawingContextMenu(null);
    setStateIconDrawingDialog({
      target,
      elements: initial,
      selectedElementId: initial[0]?.id ?? "",
      selectedElementIds: initial[0]?.id ? [initial[0].id] : [],
      frame
    });
  };
}

export function createApplyStateIconDrawingDialog(__appScope: Record<string, any>) {
  return async () => {
  const { backendImageIdFromHref, customDeviceDraft, customDraftTerminalTypes, definitionVisualDraft, definitionVisualTerminalTypes, fetchBackendImageDataUrl, imageAssetList, imageAssets, isDefaultStatePageId, isImageDataUrl, setDefinitionVisualDraft, setStateIconDrawingDialog, stateIconDrawingDialog, stateIconDrawingToImage, updateCustomDeviceStateDraftRow, updateDefinitionStateDraftRow } = __appScope;
    if (!stateIconDrawingDialog) {
      return;
    }
    const assetById = new Map((imageAssetList ?? []).map((asset: ImageAsset) => [asset.id, asset]));
    const resolvedHrefByRawHref = new Map<string, string>();
    await Promise.all(stateIconDrawingDialog.elements.map(async (element: any) => {
      const rawHref = String(element?.kind === "image" ? element.imageHref ?? "" : "").trim();
      if (!rawHref || isImageDataUrl(rawHref)) {
        return;
      }
      const id = backendImageIdFromHref(rawHref);
      if (!id) {
        return;
      }
      const cachedHref = imageAssets?.[id] ?? "";
      if (isImageDataUrl(cachedHref)) {
        resolvedHrefByRawHref.set(rawHref, cachedHref);
        return;
      }
      if (typeof fetchBackendImageDataUrl !== "function") {
        return;
      }
      const asset = { ...(assetById.get(id) ?? { id, name: id, url: rawHref }) };
      asset.url = asset.url || rawHref;
      try {
        const dataUrl = await fetchBackendImageDataUrl(asset);
        if (isImageDataUrl(dataUrl)) {
          resolvedHrefByRawHref.set(rawHref, dataUrl);
        }
      } catch {
        // 单张后台图片读取失败时保留原始 href，避免阻断元件定义保存。
      }
    }));
    const resolveImageHref = (href: string) => resolvedHrefByRawHref.get(href) || href;
    const frameHasTerminals = stateIconDrawingDialog.target.scope === "definition"
      ? (Number(definitionVisualDraft?.terminalCount) || (Array.isArray(definitionVisualTerminalTypes) ? definitionVisualTerminalTypes.length : 0)) > 0
      : (Number(customDeviceDraft?.terminalCount) || (Array.isArray(customDraftTerminalTypes) ? customDraftTerminalTypes.length : 0)) > 0;
    const shouldPersistImage = stateIconDrawingDialog.elements.length > 0 ||
      stateIconDrawingFrameHasPersistedContent(stateIconDrawingDialog.frame);
    const image = shouldPersistImage
      ? stateIconDrawingToImage(stateIconDrawingDialog.elements, {
          resolveImageHref,
          frame: stateIconDrawingDialog.frame,
          frameHasTerminals
        })
      : "";
    const patch: Partial<DeviceDefinitionStateDraftRow> = {
      image,
      imageAssetId: "",
      imageFit: "fixed",
      backgroundImage: "",
      backgroundImageAssetId: "",
      backgroundImageFit: "fixed",
      imageCleared: image ? "" : "1"
    };
    if (isDefaultStatePageId(stateIconDrawingDialog.target.rowId) && stateIconDrawingDialog.target.scope === "definition") {
      setDefinitionVisualDraft((current) =>
        current
          ? {
              ...current,
              backgroundImage: image,
              backgroundImageAssetId: "",
              backgroundImageFit: "fixed",
              backgroundImageCleared: patch.imageCleared ?? "",
              error: ""
            }
          : current
      );
      setStateIconDrawingDialog(null);
      return;
    }
    if (stateIconDrawingDialog.target.scope === "definition") {
      updateDefinitionStateDraftRow(stateIconDrawingDialog.target.rowId, patch);
    } else {
      updateCustomDeviceStateDraftRow(stateIconDrawingDialog.target.rowId, patch);
    }
    setStateIconDrawingDialog(null);
  };
}

export function createEnsureCustomComponentTreeExpanded(__appScope: Record<string, any>) {
  return (categoryLibraryName: string, componentLibrary?: string) => {
  const { customComponentTreeTypeKey, normalizeCategoryLibraryName, setCollapsedCustomComponentTreeLibraries, setCollapsedCustomComponentTreeTypes } = __appScope;
    const normalizedLibrary = normalizeCategoryLibraryName(categoryLibraryName);
    setCollapsedCustomComponentTreeLibraries((current) => {
      const next = new Set(current);
      next.delete(normalizedLibrary);
      return next;
    });
    if (componentLibrary) {
      const typeKey = customComponentTreeTypeKey(normalizedLibrary, componentLibrary);
      setCollapsedCustomComponentTreeTypes((current) => {
        const next = new Set(current);
        next.delete(typeKey);
        return next;
      });
    }
  };
}

export function createCancelPendingCustomComponentTemplateLoad(__appScope: Record<string, any>) {
  return () => {
  const { customComponentSelectionFrameRef, customComponentSelectionRequestRef } = __appScope;
    customComponentSelectionRequestRef.current += 1;
    if (customComponentSelectionFrameRef.current !== null) {
      window.cancelAnimationFrame(customComponentSelectionFrameRef.current);
      customComponentSelectionFrameRef.current = null;
    }
  };
}

export function createSelectCustomCategoryLibrary(__appScope: Record<string, any>) {
  return (categoryLibraryName: string, options: { expand?: boolean } = {}) => {
  const { DEFAULT_STATE_PAGE_ID, cancelPendingCustomComponentTemplateLoad, defaultComponentLibraryForCategoryLibrary, ensureCustomComponentTreeExpanded, normalizeCategoryLibraryName, setCustomComponentTreeSelection, setCustomDeviceDraft, setCustomDeviceStatePageId, setEditingCustomDeviceKind } = __appScope;
    cancelPendingCustomComponentTemplateLoad();
    const group = normalizeCategoryLibraryName(categoryLibraryName);
    if (options.expand !== false) {
      ensureCustomComponentTreeExpanded(group);
    }
    setCustomComponentTreeSelection({ kind: "categoryLibrary", categoryLibraryName: group });
    setEditingCustomDeviceKind("");
    setCustomDeviceStatePageId(DEFAULT_STATE_PAGE_ID);
    setCustomDeviceDraft((current) => ({
      ...current,
      categoryLibraryName: group,
      componentLibrary: defaultComponentLibraryForCategoryLibrary(group),
      componentName: "",
      error: ""
    }));
  };
}

export function createSelectCustomComponentLibrary(__appScope: Record<string, any>) {
  return (categoryLibraryName: string, sectionName: string, options: { expand?: boolean } = {}) => {
  const { DEFAULT_STATE_PAGE_ID, cancelPendingCustomComponentTemplateLoad, ensureCustomComponentTreeExpanded, normalizeCategoryLibraryName, normalizeComponentLibraryName, setCustomComponentTreeSelection, setCustomDeviceDraft, setCustomDeviceStatePageId, setCustomDeviceDialogView, setEditingCustomDeviceKind } = __appScope;
    cancelPendingCustomComponentTemplateLoad();
    const group = normalizeCategoryLibraryName(categoryLibraryName);
    const section = normalizeComponentLibraryName(sectionName);
    if (options.expand !== false) {
      ensureCustomComponentTreeExpanded(group, section);
    }
    setCustomComponentTreeSelection({ kind: "componentLibrary", categoryLibraryName: group, section });
    setEditingCustomDeviceKind("");
    setCustomDeviceStatePageId(DEFAULT_STATE_PAGE_ID);
    setCustomDeviceDialogView("parameters");
    setCustomDeviceDraft((current) => ({
      ...current,
      categoryLibraryName: group,
      componentLibrary: section,
      componentName: "",
      error: ""
    }));
  };
}

export function createSelectCustomComponentTemplate(__appScope: Record<string, any>) {
  return (template: DeviceTemplate, sectionName?: string) => {
  const { DEFAULT_STATE_PAGE_ID, createCustomDeviceDraftFromTemplate, customComponentSelectionFrameRef, customComponentSelectionRequestRef, customDeviceDefinitionMode, ensureCustomComponentTreeExpanded, normalizeCategoryLibraryName, normalizeComponentLibraryName, resolveTemplateComponentLibrary, setCustomComponentTreeSelection, setCustomDeviceDraft, setCustomDeviceDraftCleanBaseline = () => undefined, setCustomDeviceSaveMessage, setCustomDeviceStatePageId, setDefinitionDraftSection, setEditingCustomDeviceKind, setSelectedDefinitionKind } = __appScope;
    if (sectionName === undefined) {
      sectionName = resolveTemplateComponentLibrary(template);
    }
    const categoryLibraryName = normalizeCategoryLibraryName(template.categoryLibrary);
    const section = normalizeComponentLibraryName(sectionName);
    customComponentSelectionRequestRef.current += 1;
    setCustomDeviceSaveMessage("");
    ensureCustomComponentTreeExpanded(categoryLibraryName, section);
    if (customComponentSelectionFrameRef.current !== null) {
      window.cancelAnimationFrame(customComponentSelectionFrameRef.current);
      customComponentSelectionFrameRef.current = null;
    }
    const nextDraft = createCustomDeviceDraftFromTemplate(template, section);
    const nextStateDefinitions = template.custom || typeof __appScope.createDefinitionStateDraftRows !== "function"
      ? nextDraft.stateDefinitions
      : createDefinitionStateDraftRowsWithDefaultImages(__appScope, template);
    const draftWithStateVisuals = nextStateDefinitions === nextDraft.stateDefinitions
      ? nextDraft
      : { ...nextDraft, stateDefinitions: nextStateDefinitions };
    const editableDraft = customDeviceDefinitionMode === "edit" && !template.custom
      ? { ...draftWithStateVisuals, error: "" }
      : draftWithStateVisuals;
    setSelectedDefinitionKind(template.kind);
    setDefinitionDraftSection(section);
    setCustomComponentTreeSelection({ kind: "component", categoryLibraryName, section, templateKind: template.kind });
    setEditingCustomDeviceKind(template.custom ? template.kind : "");
    setCustomDeviceStatePageId(DEFAULT_STATE_PAGE_ID);
    setCustomDeviceDraft(editableDraft);
    setCustomDeviceDraftCleanBaseline(editableDraft);
  };
}

export function createStartCustomComponentCreate(__appScope: Record<string, any>) {
  return () => {
  const { customComponentTreeSelection, defaultComponentLibraryForCategoryLibrary, nextCustomTemplateKind, normalizeCategoryLibraryName, requireEditMode, setCustomLibraryCreateDialog } = __appScope;
    if (!requireEditMode("新建元件")) {
      return;
    }
    const categoryLibraryName = normalizeCategoryLibraryName(customComponentTreeSelection.categoryLibraryName);
    const section =
      customComponentTreeSelection.kind === "componentLibrary" || customComponentTreeSelection.kind === "component"
        ? customComponentTreeSelection.section
        : defaultComponentLibraryForCategoryLibrary(categoryLibraryName);
    setCustomLibraryCreateDialog({
      kind: "component",
      title: "新建元件",
      cnName: "",
      enName: nextCustomTemplateKind(section),
      categoryLibraryName,
      componentLibrary: section,
      error: ""
    });
  };
}

const CUSTOM_DEVICE_KIND_NAME_PATTERN = /^[A-Za-z][A-Za-z0-9_-]*$/;

export function createConfirmCustomLibraryCreateDialog(__appScope: Record<string, any>) {
  return () => {
  const { DEFAULT_STATE_PAGE_ID, cancelPendingCustomComponentTemplateLoad, categoryLibraries, componentLibraryOptions, createEmptyCustomDeviceDraft, customDeviceDraft, customDeviceTemplates, customLibraryCreateDialog, defaultComponentLibraryForCategoryLibrary, isValidComponentLibraryName, libraryTemplates, normalizeCategoryLibraryName, normalizeComponentLibraryName, normalizeCustomCategoryLibraries, normalizeCustomComponentLibraries, requireEditMode, setCustomCategoryLibraries, setCustomComponentLibraries, setCustomComponentTreeSelection, setCustomDeviceDefinitionMode, setCustomDeviceDialogView, setCustomDeviceDraft, setCustomDeviceDraftCleanBaseline = () => undefined, setCustomDeviceSaveMessage, setCustomDeviceStatePageId, setCustomLibraryCreateDialog, setEditingCustomDeviceKind, setExpandedCategoryLibraries, setSelectedDefinitionKind } = __appScope;
    const dialog = customLibraryCreateDialog;
    if (!dialog) {
      return false;
    }
    const actionName = dialog.kind === "categoryLibrary"
      ? "新建类别库"
      : dialog.kind === "componentLibrary" ? "新建元件库" : "新建元件";
    if (!requireEditMode(actionName)) {
      return false;
    }
    const setDialogError = (error: string) => {
      setCustomLibraryCreateDialog((current: any) => current ? { ...current, error } : current);
      return false;
    };
    const chineseName = String(dialog.cnName ?? "").trim();
    const englishName = normalizeComponentLibraryName(String(dialog.enName ?? ""));
    if (!chineseName) {
      return setDialogError("中文名称不能为空。");
    }
    if (!englishName) {
      return setDialogError("英文名称不能为空。");
    }

    if (dialog.kind === "categoryLibrary") {
      const categoryLibraryName = normalizeCategoryLibraryName(chineseName);
      if (!categoryLibraryName) {
        return setDialogError("类别库中文名称不能为空。");
      }
      const existingGroups = new Set(categoryLibraries.map((group: string) => group.toLowerCase()));
      if (existingGroups.has(categoryLibraryName.toLowerCase())) {
        return setDialogError("类别库已存在，无法新增同名类别库。");
      }
      if (!isValidComponentLibraryName(englishName)) {
        return setDialogError("英文名称只能包含英文字母、数字和下划线，并且必须以英文字母开头。");
      }
      setCustomCategoryLibraries((current: string[]) => normalizeCustomCategoryLibraries([...current, categoryLibraryName]));
      setExpandedCategoryLibraries((current: string[]) => Array.from(new Set([...current, categoryLibraryName])));
      setCustomComponentTreeSelection({ kind: "categoryLibrary", categoryLibraryName });
      setCustomDeviceDraft((current: any) => ({
        ...current,
        categoryLibraryName,
        componentLibrary: "",
        error: ""
      }));
      setCustomLibraryCreateDialog(null);
      return true;
    }

    if (dialog.kind === "componentLibrary") {
      const categoryLibraryName = normalizeCategoryLibraryName(dialog.categoryLibraryName || customDeviceDraft.categoryLibraryName);
      if (!categoryLibraryName) {
        return setDialogError("请选择类别库。");
      }
      if (!isValidComponentLibraryName(englishName)) {
        return setDialogError("英文名称只能包含英文字母、数字和下划线，并且必须以英文字母开头。");
      }
      const existingTypes = new Set(componentLibraryOptions.map((item: string) => item.toLowerCase()));
      if (existingTypes.has(englishName.toLowerCase())) {
        return setDialogError("元件库已存在，无法新增同名元件库。");
      }
      setCustomComponentLibraries((current: any[]) => normalizeCustomComponentLibraries([...current, {
        name: englishName,
        categoryLibraryName,
        label: chineseName
      }]));
      setCustomComponentTreeSelection({ kind: "componentLibrary", categoryLibraryName, section: englishName });
      setCustomDeviceDraft((current: any) => ({
        ...current,
        categoryLibraryName,
        componentLibrary: englishName,
        error: ""
      }));
      setCustomLibraryCreateDialog(null);
      return true;
    }

    const categoryLibraryName = normalizeCategoryLibraryName(dialog.categoryLibraryName || customDeviceDraft.categoryLibraryName);
    const section = normalizeComponentLibraryName(dialog.componentLibrary || customDeviceDraft.componentLibrary || defaultComponentLibraryForCategoryLibrary(categoryLibraryName));
    if (!section) {
      return setDialogError("请选择元件库。");
    }
    if (!CUSTOM_DEVICE_KIND_NAME_PATTERN.test(englishName)) {
      return setDialogError("元件英文名称只能包含英文字母、数字、下划线和短横线，并且必须以英文字母开头。");
    }
    const existingKinds = new Set([...(libraryTemplates ?? []), ...(customDeviceTemplates ?? [])].map((template: any) => String(template.kind ?? "").toLowerCase()));
    if (existingKinds.has(englishName.toLowerCase())) {
      return setDialogError("元件英文名称已存在，无法新增同名元件。");
    }
    cancelPendingCustomComponentTemplateLoad();
    setCustomDeviceDefinitionMode("create");
    setEditingCustomDeviceKind("");
    setSelectedDefinitionKind("");
    setCustomComponentTreeSelection({ kind: "componentLibrary", categoryLibraryName, section });
    setCustomDeviceStatePageId(DEFAULT_STATE_PAGE_ID);
    setCustomDeviceSaveMessage("");
    const nextDraft = {
      ...createEmptyCustomDeviceDraft(categoryLibraryName),
      componentLibrary: section,
      componentName: chineseName,
      componentKind: englishName,
      error: ""
    };
    setCustomDeviceDialogView("icon");
    setCustomDeviceDraft(nextDraft);
    setCustomDeviceDraftCleanBaseline(nextDraft);
    setCustomLibraryCreateDialog(null);
    return true;
  };
}

export function createNextCustomCategoryLibraryName(__appScope: Record<string, any>) {
  return () => {
    const { categoryLibraries } = __appScope;
    const existingGroups = new Set(categoryLibraries.map((group) => group.toLowerCase()));
    for (let index = 1; index <= 999; index += 1) {
      const candidate = `类别库${index}`;
      if (!existingGroups.has(candidate.toLowerCase())) {
        return candidate;
      }
    }
    return `类别库${Date.now()}`;
  };
}

export function createCreateCustomCategoryLibrary(__appScope: Record<string, any>) {
  return () => {
  const { nextCustomCategoryLibraryName, nextCustomComponentLibraryName, requireEditMode, setCustomLibraryCreateDialog } = __appScope;
    if (!requireEditMode("新建类别库")) {
      return;
    }
    setCustomLibraryCreateDialog({
      kind: "categoryLibrary",
      title: "新建类别",
      cnName: nextCustomCategoryLibraryName(),
      enName: nextCustomComponentLibraryName(),
      categoryLibraryName: "",
      componentLibrary: "",
      error: ""
    });
  };
}

export function createDeleteCustomCategoryLibrary(__appScope: Record<string, any>) {
  return (targetCategoryLibraryName?: string) => {
  const { PROTECTED_CATEGORY_LIBRARIES, customComponentLibraries, customDeviceDraft, customDeviceTemplates, defaultComponentLibraryForCategoryLibrary, isBuiltInComponentLibrary, normalizeCategoryLibraryName, requireEditMode, resolveTemplateComponentLibrary, setCollapsedCustomComponentTreeLibraries, setCollapsedCustomComponentTreeTypes, setCustomCategoryLibraries, setCustomComponentTreeSelection, setCustomComponentLibraries, setCustomDeviceDraft, setCustomDeviceTemplates, setDefinitionDraftSection, setDeviceDefinitionOverrides, setEditingCustomDeviceKind, setExpandedCategoryLibraries, setExpandedDefinitionGroups, setSelectedDefinitionKind } = __appScope;
    if (targetCategoryLibraryName === undefined) {
      targetCategoryLibraryName = customDeviceDraft.categoryLibraryName;
    }
    if (!requireEditMode("删除类别库")) {
      return;
    }
    const categoryLibraryName = normalizeCategoryLibraryName(targetCategoryLibraryName);
    if (!categoryLibraryName || categoryLibraryName === "静态图元" || PROTECTED_CATEGORY_LIBRARIES.has(categoryLibraryName)) {
      window.alert("默认类别库无法删除。");
      return;
    }
    const templatesInGroup = customDeviceTemplates.filter((template) => normalizeCategoryLibraryName(template.categoryLibrary) === categoryLibraryName);
    const confirmed = window.confirm(
      templatesInGroup.length > 0
        ? `类别库“${categoryLibraryName}”中共有 ${templatesInGroup.length} 个元件，删除类别库会同时删除这些元件及其自定义元件库，是否继续？`
        : `确认删除类别库“${categoryLibraryName}”？`
    );
    if (!confirmed) {
      return;
    }
    const deletedKinds = new Set(templatesInGroup.map((template) => template.kind));
    const deletedComponentLibraryKeys = new Set(
      [
        ...templatesInGroup.map(resolveTemplateComponentLibrary),
        ...customComponentLibraries
          .filter((componentLibrary) => normalizeCategoryLibraryName(componentLibrary.categoryLibraryName) === categoryLibraryName)
          .map((componentLibrary) => componentLibrary.name)
      ]
        .filter((section) => section && !isBuiltInComponentLibrary(section))
        .map((section) => section.toLowerCase())
    );
    setCustomDeviceTemplates((current) => current.filter((template) => normalizeCategoryLibraryName(template.categoryLibrary) !== categoryLibraryName));
    if (deletedComponentLibraryKeys.size > 0) {
      setCustomComponentLibraries((current) => current.filter((componentLibrary) => !deletedComponentLibraryKeys.has(componentLibrary.name.toLowerCase())));
      setDefinitionDraftSection((current) =>
        deletedComponentLibraryKeys.has(current.toLowerCase()) ? defaultComponentLibraryForCategoryLibrary("交流设备") : current
      );
    }
    setCustomCategoryLibraries((current) => current.filter((group) => normalizeCategoryLibraryName(group) !== categoryLibraryName));
    setExpandedCategoryLibraries((current) => current.filter((group) => normalizeCategoryLibraryName(group) !== categoryLibraryName));
    setExpandedDefinitionGroups((current) => current.filter((group) => normalizeCategoryLibraryName(group) !== categoryLibraryName));
    setCollapsedCustomComponentTreeLibraries((current) => {
      const next = new Set(current);
      next.delete(categoryLibraryName);
      return next;
    });
    setCollapsedCustomComponentTreeTypes((current) => {
      const next = new Set(current);
      for (const key of current) {
        if (key.startsWith(`${categoryLibraryName}::`)) {
          next.delete(key);
        }
      }
      return next;
    });
    setSelectedDefinitionKind((current) => (deletedKinds.has(current) ? "" : current));
    setCustomComponentTreeSelection({ kind: "categoryLibrary", categoryLibraryName: "交流设备" });
    setEditingCustomDeviceKind("");
    if (deletedKinds.size > 0) {
      setDeviceDefinitionOverrides((current) => {
        const next = { ...current };
        for (const kind of deletedKinds) {
          delete next[kind];
        }
        return next;
      });
    }
    setCustomDeviceDraft((current) => ({
      ...current,
      categoryLibraryName: "交流设备",
      componentLibrary: defaultComponentLibraryForCategoryLibrary("交流设备"),
      error: ""
    }));
  };
}

export function createNextCustomComponentLibraryName(__appScope: Record<string, any>) {
  return () => {
  const { componentLibraryOptions } = __appScope;
    const existingTypes = new Set(componentLibraryOptions.map((componentLibrary) => componentLibrary.toLowerCase()));
    for (let index = 1; index <= 999; index += 1) {
      const candidate = `CustomDevice${index}`;
      if (!existingTypes.has(candidate.toLowerCase())) {
        return candidate;
      }
    }
    return `CustomDevice${Date.now()}`;
  };
}

export function createCreateCustomComponentLibrary(__appScope: Record<string, any>) {
  return () => {
  const { customDeviceDraft, nextCustomComponentLibraryName, normalizeCategoryLibraryName, requireEditMode, setCustomLibraryCreateDialog } = __appScope;
    if (!requireEditMode("新建元件库")) {
      return;
    }
    const categoryLibraryName = normalizeCategoryLibraryName(customDeviceDraft.categoryLibraryName);
    setCustomLibraryCreateDialog({
      kind: "componentLibrary",
      title: "新建元件库",
      cnName: "",
      enName: nextCustomComponentLibraryName(),
      categoryLibraryName,
      componentLibrary: "",
      error: ""
    });
  };
}

export function createDeleteCustomComponentLibrary(__appScope: Record<string, any>) {
  return (targetSection?: string) => {
  const { E_SECTION_OPTIONS, customComponentTreeSelection, customDeviceDraft, defaultComponentLibraryForCategoryLibrary, libraryTemplates, normalizeCategoryLibraryName, normalizeComponentLibraryName, requireEditMode, resolveTemplateComponentLibrary, setCollapsedCustomComponentTreeTypes, setCustomComponentTreeSelection, setCustomComponentLibraries, setCustomDeviceDraft, setCustomDeviceTemplates, setDefinitionDraftSection, setDeviceDefinitionOverrides, setEditingCustomDeviceKind, setSelectedDefinitionKind } = __appScope;
    if (targetSection === undefined) {
      targetSection = customDeviceDraft.componentLibrary;
    }
    if (!requireEditMode("删除元件库")) {
      return;
    }
    const componentLibrary = normalizeComponentLibraryName(targetSection);
    if (!componentLibrary || E_SECTION_OPTIONS.some((section) => section.toLowerCase() === componentLibrary.toLowerCase())) {
      window.alert("内置元件库无法删除。");
      return;
    }
    const templatesWithType = libraryTemplates.filter((template) => template.custom && resolveTemplateComponentLibrary(template).toLowerCase() === componentLibrary.toLowerCase());
    const confirmed = window.confirm(
      templatesWithType.length > 0
        ? `元件库“${componentLibrary}”下共有 ${templatesWithType.length} 个自定义元件，删除元件库会同时删除这些元件，是否继续？`
        : `确认删除元件库“${componentLibrary}”？`
    );
    if (!confirmed) {
      return;
    }
    const deletedKinds = new Set(templatesWithType.map((template) => template.kind));
    setCustomComponentLibraries((current) => current.filter((item) => item.name.toLowerCase() !== componentLibrary.toLowerCase()));
    setCustomDeviceTemplates((current) => current.filter((template) => !deletedKinds.has(template.kind)));
    setSelectedDefinitionKind((current) => (deletedKinds.has(current) ? "" : current));
    setEditingCustomDeviceKind((current) => (deletedKinds.has(current) ? "" : current));
    setCollapsedCustomComponentTreeTypes((current) => {
      const next = new Set(current);
      for (const key of current) {
        if (key.endsWith(`::${componentLibrary}`)) {
          next.delete(key);
        }
      }
      return next;
    });
    if (deletedKinds.size > 0) {
      setDeviceDefinitionOverrides((current) => {
        const next = { ...current };
        for (const kind of deletedKinds) {
          delete next[kind];
        }
        return next;
      });
    }
    const fallbackCategoryLibraryName = customComponentTreeSelection.kind === "componentLibrary" ? customComponentTreeSelection.categoryLibraryName : customDeviceDraft.categoryLibraryName;
    const fallbackSection = defaultComponentLibraryForCategoryLibrary(fallbackCategoryLibraryName);
    setCustomComponentTreeSelection({ kind: "componentLibrary", categoryLibraryName: normalizeCategoryLibraryName(fallbackCategoryLibraryName), section: fallbackSection });
    setCustomDeviceDraft((current) => ({
      ...current,
      componentLibrary: fallbackSection,
      error: ""
    }));
    setDefinitionDraftSection((current) => (current.toLowerCase() === componentLibrary.toLowerCase() ? fallbackSection : current));
  };
}

export function createRenameSelectedCustomDeviceTreeItem(__appScope: Record<string, any>) {
  return () => {
  const { PROTECTED_CATEGORY_LIBRARIES, categoryLibraries, componentLibraryOptions, customComponentTreeSelection, customComponentTreeTypeKey, isBuiltInComponentLibrary, isValidComponentLibraryName, libraryTemplateByKind, libraryTemplates, normalizeCategoryLibraryName, normalizeComponentLibraryName, requireEditMode, resolveTemplateComponentLibrary, setCollapsedCustomComponentTreeLibraries, setCollapsedCustomComponentTreeTypes, setCustomCategoryLibraries, setCustomComponentTreeSelection, setCustomComponentLibraries, setCustomDeviceDraft, setCustomDeviceTemplates, setDefinitionDraftSection, setDeviceDefinitionOverrides, setExpandedCategoryLibraries, setExpandedDefinitionGroups } = __appScope;
    if (!requireEditMode("重命名元件库条目")) {
      return;
    }
    if (customComponentTreeSelection.kind === "categoryLibrary") {
      const oldCategoryLibraryName = normalizeCategoryLibraryName(customComponentTreeSelection.categoryLibraryName);
      if (PROTECTED_CATEGORY_LIBRARIES.has(oldCategoryLibraryName) || oldCategoryLibraryName === "静态图元") {
        window.alert("系统内置类别库不能重命名。");
        return;
      }
      const rawName = window.prompt("请输入新的类别库名称", oldCategoryLibraryName);
      if (rawName === null) {
        return;
      }
      const newCategoryLibraryName = normalizeCategoryLibraryName(rawName.trim());
      if (!newCategoryLibraryName) {
        window.alert("类别库名称不能为空。");
        return;
      }
      if (categoryLibraries.some((group) => normalizeCategoryLibraryName(group).toLowerCase() === newCategoryLibraryName.toLowerCase() && normalizeCategoryLibraryName(group) !== oldCategoryLibraryName)) {
        window.alert("类别库名称已存在，无法重命名。");
        return;
      }
      setCustomCategoryLibraries((current) => current.map((group) => normalizeCategoryLibraryName(group) === oldCategoryLibraryName ? newCategoryLibraryName : group));
      setCustomComponentLibraries((current) => current.map((componentLibrary) => normalizeCategoryLibraryName(componentLibrary.categoryLibraryName) === oldCategoryLibraryName ? { ...componentLibrary, categoryLibraryName: newCategoryLibraryName } : componentLibrary));
      setCustomDeviceTemplates((current) => current.map((template) => normalizeCategoryLibraryName(template.categoryLibrary) === oldCategoryLibraryName ? { ...template, categoryLibrary: newCategoryLibraryName } : template));
      setExpandedCategoryLibraries((current) => current.map((group) => normalizeCategoryLibraryName(group) === oldCategoryLibraryName ? newCategoryLibraryName : group));
      setExpandedDefinitionGroups((current) => current.map((group) => normalizeCategoryLibraryName(group) === oldCategoryLibraryName ? newCategoryLibraryName : group));
      setCollapsedCustomComponentTreeLibraries((current) => {
      const next = new Set(current);
      if (next.has(oldCategoryLibraryName)) {
        next.delete(oldCategoryLibraryName);
        next.add(newCategoryLibraryName);
      }
      return next;
    });
    setCollapsedCustomComponentTreeTypes((current) => {
      const next = new Set(current);
      for (const key of current) {
        if (key.startsWith(`${oldCategoryLibraryName}::`)) {
          next.delete(key);
          next.add(key.replace(`${oldCategoryLibraryName}::`, `${newCategoryLibraryName}::`));
        }
      }
      return next;
    });
      setCustomComponentTreeSelection({ kind: "categoryLibrary", categoryLibraryName: newCategoryLibraryName });
      setCustomDeviceDraft((current) => ({
        ...current,
        categoryLibraryName: normalizeCategoryLibraryName(current.categoryLibraryName) === oldCategoryLibraryName ? newCategoryLibraryName : current.categoryLibraryName,
        error: ""
      }));
      return;
    }
    if (customComponentTreeSelection.kind === "componentLibrary") {
      const oldSection = normalizeComponentLibraryName(customComponentTreeSelection.section);
      if (isBuiltInComponentLibrary(oldSection)) {
        window.alert("系统内置元件库不能重命名。");
        return;
      }
      const rawName = window.prompt("请输入新的元件库英文名称", oldSection);
      if (rawName === null) {
        return;
      }
      const newSection = normalizeComponentLibraryName(rawName);
      if (!isValidComponentLibraryName(newSection)) {
        window.alert("元件库必须是英文名称，只能包含英文字母、数字和下划线，并且必须以英文字母开头。");
        return;
      }
      if (componentLibraryOptions.some((section) => section.toLowerCase() === newSection.toLowerCase() && section.toLowerCase() !== oldSection.toLowerCase())) {
        window.alert("元件库已存在，无法重命名。");
        return;
      }
      const categoryLibraryName = normalizeCategoryLibraryName(customComponentTreeSelection.categoryLibraryName);
      const affectedKinds = new Set(
        libraryTemplates
          .filter((template) => template.custom && normalizeCategoryLibraryName(template.categoryLibrary) === categoryLibraryName && resolveTemplateComponentLibrary(template).toLowerCase() === oldSection.toLowerCase())
          .map((template) => template.kind)
      );
      setCustomComponentLibraries((current) => current.map((componentLibrary) =>
        componentLibrary.name.toLowerCase() === oldSection.toLowerCase() ? { ...componentLibrary, name: newSection, categoryLibraryName } : componentLibrary
      ));
      setCollapsedCustomComponentTreeTypes((current) => {
        const next = new Set(current);
        const oldKey = customComponentTreeTypeKey(categoryLibraryName, oldSection);
        const newKey = customComponentTreeTypeKey(categoryLibraryName, newSection);
        if (next.has(oldKey)) {
          next.delete(oldKey);
          next.add(newKey);
        }
        return next;
      });
      setCustomDeviceTemplates((current) => current.map((template) =>
        affectedKinds.has(template.kind)
          ? { ...template, params: { ...template.params, component_type: newSection } }
          : template
      ));
      setDeviceDefinitionOverrides((current) => {
        const next = { ...current };
        for (const kind of affectedKinds) {
          const override = next[kind];
          if (override) {
            next[kind] = { ...override, params: { ...(override.params ?? {}), component_type: newSection } };
          }
        }
        return next;
      });
      setCustomComponentTreeSelection({ kind: "componentLibrary", categoryLibraryName, section: newSection });
      setCustomDeviceDraft((current) => ({
        ...current,
        categoryLibraryName,
        componentLibrary: current.componentLibrary.toLowerCase() === oldSection.toLowerCase() ? newSection : current.componentLibrary,
        error: ""
      }));
      setDefinitionDraftSection((current) => current.toLowerCase() === oldSection.toLowerCase() ? newSection : current);
      return;
    }
    const template = libraryTemplateByKind.get(customComponentTreeSelection.templateKind);
    if (!template?.custom) {
      window.alert("系统内置元件不能在这里重命名。");
      return;
    }
    const rawName = window.prompt("请输入新的元件名称", template.label);
    if (rawName === null) {
      return;
    }
    const newLabel = rawName.trim();
    if (!newLabel) {
      window.alert("元件名称不能为空。");
      return;
    }
    setCustomDeviceTemplates((current) => current.map((item) => item.kind === template.kind ? { ...item, label: newLabel } : item));
    setCustomDeviceDraft((current) => ({
      ...current,
      componentName: current.componentName === template.label ? newLabel : current.componentName,
      error: ""
    }));
  };
}

export function createDeleteSelectedCustomDeviceTreeItem(__appScope: Record<string, any>) {
  return () => {
  const { customComponentTreeSelection, deleteCustomCategoryLibrary, deleteCustomComponentLibrary, libraryTemplateByKind, requireEditMode, setCustomComponentTreeSelection, setCustomDeviceDraft, setCustomDeviceTemplates, setDeviceDefinitionOverrides, setEditingCustomDeviceKind } = __appScope;
    if (!requireEditMode("删除元件库条目")) {
      return;
    }
    if (customComponentTreeSelection.kind === "categoryLibrary") {
      deleteCustomCategoryLibrary(customComponentTreeSelection.categoryLibraryName);
      return;
    }
    if (customComponentTreeSelection.kind === "componentLibrary") {
      deleteCustomComponentLibrary(customComponentTreeSelection.section);
      return;
    }
    const template = libraryTemplateByKind.get(customComponentTreeSelection.templateKind);
    if (!template?.custom) {
      window.alert("系统内置元件不能在这里删除。");
      return;
    }
    const confirmed = window.confirm(`确认删除元件“${template.label}”？`);
    if (!confirmed) {
      return;
    }
    setCustomDeviceTemplates((current) => current.filter((item) => item.kind !== template.kind));
    setDeviceDefinitionOverrides((current) => {
      const next = { ...current };
      delete next[template.kind];
      return next;
    });
    setEditingCustomDeviceKind((current) => current === template.kind ? "" : current);
    setCustomComponentTreeSelection({ kind: "componentLibrary", categoryLibraryName: customComponentTreeSelection.categoryLibraryName, section: customComponentTreeSelection.section });
    setCustomDeviceDraft((current) => ({
      ...current,
      componentName: "",
      error: ""
    }));
  };
}

export function createNextCustomTemplateKind(__appScope: Record<string, any>) {
  return (componentLibrary: string) => {
  const { libraryTemplates } = __appScope;
    const safeType = componentLibrary.replace(/[^A-Za-z0-9_]+/g, "_") || "CustomDevice";
    const existingKinds = new Set(libraryTemplates.map((template) => template.kind.toLowerCase()));
    const base = `custom-${safeType}`;
    if (!existingKinds.has(base.toLowerCase())) {
      return base;
    }
    for (let index = 2; index <= 999; index += 1) {
      const candidate = `${base}-${index}`;
      if (!existingKinds.has(candidate.toLowerCase())) {
        return candidate;
      }
    }
    return `${base}-${Date.now()}`;
  };
}

export function createSaveCustomDeviceTemplate(__appScope: Record<string, any>) {
  return (options: { closeAfterSave?: boolean } = {}) => {
  const { ALLOW_RESIZE_TRANSFORM_PARAM, TERMINAL_TYPE_LIBRARY_LABELS, closeCustomDeviceDialog, customDefaultDefinitions, customDeviceDraft, customDeviceGeneratedDefaultImageCandidates, customDeviceImageWithTerminalConnectors, customDeviceTemplates, customDeviceTerminalAnchors, defaultComponentLibraryForCategoryLibrary, editingCustomDeviceKind, ensureCustomComponentTreeExpanded, generateCustomDeviceImage, hasOverlappingCustomDeviceTerminalAnchors, isReservedDeviceDefinitionParamName, isValidComponentLibraryName, libraryTemplates = customDeviceTemplates, measurementConfig, measurementConfigDraft, measurementConfigDraftRef, nextCustomTemplateKind, normalizeCategoryLibraryName, normalizeComponentLibraryName, normalizeContainerTerminalAssociations, normalizeDefinitionRowEnumFields, persistDeviceLibraryChange, requireEditMode, setCustomComponentTreeSelection, setCustomDeviceDraft, setCustomDeviceDraftCleanBaseline = () => undefined, setCustomDeviceSaveMessage, setCustomDeviceTemplates, setEditingCustomDeviceKind, setExpandedCategoryLibraries, showGlobalMessage, syncExistingNodesWithTemplateDefinitions, syncInheritedCustomDeviceStateVisuals, validateContainerTerminalAssociations, validateStateDraftRows, writeOperationLog } = __appScope;
    if (!requireEditMode("保存元件")) {
      return false;
    }
    setCustomDeviceSaveMessage("");
    const categoryLibraryName = normalizeCategoryLibraryName(customDeviceDraft.categoryLibraryName);
    const componentLibrary = normalizeComponentLibraryName(customDeviceDraft.componentLibrary);
    const componentLabel = customDeviceDraft.componentName.trim() || componentLibrary;
    if (!componentLibrary) {
      setCustomDeviceDraft((current) => ({ ...current, error: "请选择元件库。" }));
      return false;
    }
    if (!isValidComponentLibraryName(componentLibrary)) {
      setCustomDeviceDraft((current) => ({ ...current, error: "元件库必须是英文名称，只能包含英文字母、数字和下划线，并且必须以英文字母开头。" }));
      return false;
    }
    const requestedCustomKind = normalizeComponentLibraryName(String(customDeviceDraft.componentKind ?? ""));
    if (!editingCustomDeviceKind && requestedCustomKind) {
      if (!CUSTOM_DEVICE_KIND_NAME_PATTERN.test(requestedCustomKind)) {
        setCustomDeviceDraft((current) => ({ ...current, error: "元件英文名称只能包含英文字母、数字、下划线和短横线，并且必须以英文字母开头。" }));
        return false;
      }
      const existingKinds = new Set((libraryTemplates ?? customDeviceTemplates).map((template: any) => String(template.kind ?? "").toLowerCase()));
      if (existingKinds.has(requestedCustomKind.toLowerCase())) {
        setCustomDeviceDraft((current) => ({ ...current, error: "元件英文名称已存在，无法新增同名元件。" }));
        return false;
      }
    }
    const terminalTypes = customDeviceDraft.terminalTypes.slice(0, customDeviceDraft.terminalCount);
    const terminalAssociations = normalizeContainerTerminalAssociations(
      terminalTypes,
      customDeviceDraft.terminalAssociations,
      customDeviceDraft.terminalCount
    );
    if (customDeviceDraft.isContainer) {
      const terminalAssociationValidation = validateContainerTerminalAssociations(terminalTypes, terminalAssociations);
      if (!terminalAssociationValidation.valid) {
        window.alert(terminalAssociationValidation.message);
        setCustomDeviceDraft((current) => ({ ...current, terminalAssociations, error: terminalAssociationValidation.message }));
        return false;
      }
    }
    if (hasOverlappingCustomDeviceTerminalAnchors(customDeviceTerminalAnchors)) {
      const message = "不同端子位置不能重叠，请调整端子位置后再保存。";
      window.alert(message);
      setCustomDeviceDraft((current) => ({ ...current, error: message }));
      return false;
    }
    const defaultRows = customDefaultDefinitions(terminalTypes, {
      isContainer: customDeviceDraft.isContainer,
      terminalAssociations
    });
    const draftRows = normalizeCustomDeviceDraftParamRows(customDeviceDraft.params, normalizeDefinitionRowEnumFields);
    const { definitions: mergedDefaultRows, customRows } = mergeDefaultAndCustomDefinitionRows(defaultRows, draftRows, normalizeDefinitionRowEnumFields);
    const definitions = [...mergedDefaultRows, ...customRows];
    const definitionsComplianceMessage = deviceParameterDefinitionsComplianceMessage(definitions);
    if (definitionsComplianceMessage) {
      setCustomDeviceDraft((current) => ({ ...current, error: definitionsComplianceMessage }));
      return false;
    }
    if (customRows.some((row) => !row.cnName || !row.enName)) {
      setCustomDeviceDraft((current) => ({ ...current, error: "属性行的中文名称和英文名称不能为空。" }));
      return false;
    }
    const reservedCustomRow = customRows.find((row) => isReservedDeviceDefinitionParamName(row.enName));
    if (reservedCustomRow) {
      setCustomDeviceDraft((current) => ({
        ...current,
        error: reservedCustomRow.enName === ALLOW_RESIZE_TRANSFORM_PARAM ? "是否允许变形是元件属性，不能在参数定义表中新增。" : "是否容器是元件属性，不能在参数定义表中新增。"
      }));
      return false;
    }
    const duplicateDefinition = definitions.find(
      (definition, index) => definitions.findIndex((item) => item.enName.toLowerCase() === definition.enName.toLowerCase()) !== index
    );
    if (duplicateDefinition) {
      setCustomDeviceDraft((current) => ({ ...current, error: `属性英文名称重复：${duplicateDefinition.enName}` }));
      return false;
    }
    const currentMeasurementConfig = measurementConfigDraftRef?.current ?? measurementConfigDraft ?? measurementConfig;
    const profileItems = currentMeasurementConfig?.deviceProfiles?.find((profile) => profile.deviceKind === componentLibrary)?.items ?? [];
    const measurementProfileMessage = measurementProfileItemsComplianceMessage(profileItems, {
      measurementTypes: currentMeasurementConfig?.measurementTypes ?? [],
      parameterDefinitions: definitions,
      positionDefinitions: buildMeasurementProfilePositionDefinitions({
        source: {
          kind: editingCustomDeviceKind || requestedCustomKind || customDeviceDraft.componentKind || componentLibrary,
          label: componentLabel,
          params: { component_type: componentLibrary },
          terminalType: terminalTypes[0] ?? "ac",
          terminalCount: terminalTypes.length,
          terminalTypes,
          terminalLabels: customDeviceDraft.terminalLabels.slice(0, terminalTypes.length),
          terminalRoles: customDeviceDraft.terminalRoles.slice(0, terminalTypes.length),
          terminalAssociations: customDeviceDraft.isContainer ? terminalAssociations : undefined,
          isContainer: customDeviceDraft.isContainer,
          parameterDefinitions: definitions
        },
        parameterDefinitions: definitions,
        libraryTemplates
      }),
      targetLabel: componentLabel
    });
    if (measurementProfileMessage) {
      setCustomDeviceDraft((current) => ({ ...current, error: measurementProfileMessage }));
      return false;
    }
    const stateValidation = validateStateDraftRows(customDeviceDraft.stateDefinitions);
    if (stateValidation.error) {
      setCustomDeviceDraft((current) => ({ ...current, error: stateValidation.error }));
      return false;
    }
    const terminalAnchors = customDeviceTerminalAnchors.slice(0, terminalTypes.length).map((anchor) => ({ ...anchor }));
    const inlineBackgroundPatch = inlineDefaultIconBackgroundPatch(__appScope, "custom");
    const draftBackgroundImage = inlineBackgroundPatch?.backgroundImage ?? customDeviceDraft.backgroundImage;
    const draftBackgroundImageAssetId = inlineBackgroundPatch?.backgroundImageAssetId ?? customDeviceDraft.backgroundImageAssetId;
    const draftBackgroundImageFit = customDeviceDraft.backgroundImageFit ?? "cover";
    const draftBackgroundImageCleared = inlineBackgroundPatch?.backgroundImageCleared ?? customDeviceDraft.backgroundImageCleared;
    const rawBackgroundImage = draftBackgroundImageCleared
      ? ""
      : draftBackgroundImage || generateCustomDeviceImage(componentLabel, terminalTypes.length > 0 ? terminalTypes : ["ac"]);
    const backgroundImage = customDeviceImageWithTerminalConnectors(rawBackgroundImage, terminalTypes, terminalAnchors);
    const backgroundImageAssetId = draftBackgroundImageAssetId && backgroundImage === `/api/images/${draftBackgroundImageAssetId}`
      ? draftBackgroundImageAssetId
      : "";
    const defaultImageCandidates = customDeviceGeneratedDefaultImageCandidates(
      componentLabel,
      customDeviceDraft.componentLibrary,
      terminalTypes
    );
    const stateDefinitions = syncInheritedCustomDeviceStateVisuals(
      stateValidation.states,
      {
        backgroundImage,
        backgroundImageAssetId,
        backgroundImageFit: draftBackgroundImageFit
      },
      defaultImageCandidates
    );
    const customKind = editingCustomDeviceKind || requestedCustomKind || nextCustomTemplateKind(componentLibrary);
    const previousCustomTemplate = editingCustomDeviceKind
      ? customDeviceTemplates.find((item) => item.kind === editingCustomDeviceKind)
      : undefined;
    const template: DeviceTemplate = {
      kind: customKind,
      label: componentLabel,
      categoryLibrary: categoryLibraryName,
      size: customDeviceDraft.size,
      params: {
        component_type: customDeviceDraft.componentLibrary || defaultComponentLibraryForCategoryLibrary(categoryLibraryName),
        fillColor: "transparent",
        strokeColor: "transparent",
        lineWidth: "0",
        backgroundImage,
        backgroundImageAssetId,
        backgroundImageFit: draftBackgroundImageFit,
        backgroundImageCleared: draftBackgroundImageCleared
      },
      terminalType: terminalTypes[0] ?? "ac",
      terminalCount: terminalTypes.length,
      terminalTypes,
      terminalAssociations: customDeviceDraft.isContainer ? terminalAssociations : undefined,
      terminalLabels: customDeviceDraft.terminalLabels.slice(0, terminalTypes.length).map(
        (label, index) => label.trim() || `${TERMINAL_TYPE_LIBRARY_LABELS[terminalTypes[index]] ?? terminalTypes[index]}端${index + 1}`
      ),
      terminalAnchors,
      isContainer: customDeviceDraft.isContainer,
      allowResizeTransform: customDeviceDraft.allowResizeTransform === "1",
      custom: true,
      parameterDefinitions: definitions,
      stateDefinitions,
    };
    const nextTemplates = editingCustomDeviceKind && customDeviceTemplates.some((item) => item.kind === editingCustomDeviceKind)
      ? customDeviceTemplates.map((item) => item.kind === editingCustomDeviceKind ? template : item)
      : [...customDeviceTemplates, template];
    setCustomDeviceTemplates(nextTemplates);
    if (editingCustomDeviceKind) {
      syncExistingNodesWithTemplateDefinitions(
        template,
        previousCustomTemplate?.parameterDefinitions,
        (node) => node.kind === customKind
      );
    }
    persistDeviceLibraryChange({ customDeviceTemplates: nextTemplates }, {
      success: `自定义元件已保存到后台：${componentLabel}`,
      failure: `自定义元件已保存到本地，后台保存失败：${componentLabel}`
    });
    setExpandedCategoryLibraries((current) => Array.from(new Set([...current, categoryLibraryName])));
    ensureCustomComponentTreeExpanded(categoryLibraryName, componentLibrary);
    setCustomComponentTreeSelection({ kind: "component", categoryLibraryName, section: componentLibrary, templateKind: customKind });
    setEditingCustomDeviceKind(customKind);
    const cleanDraft = { ...customDeviceDraft, backgroundImage, backgroundImageAssetId, backgroundImageFit: draftBackgroundImageFit, backgroundImageCleared: draftBackgroundImageCleared, error: "" };
    setCustomDeviceDraft((current) => ({ ...current, backgroundImage, backgroundImageAssetId, backgroundImageFit: draftBackgroundImageFit, backgroundImageCleared: draftBackgroundImageCleared, error: "" }));
    setCustomDeviceDraftCleanBaseline(cleanDraft, terminalAnchors);
    setCustomDeviceSaveMessage("");
    showGlobalMessage(`自定义元件已保存：${componentLabel}`, "success");
    writeOperationLog(`保存自定义元件：${componentLabel}`);
    if (options.closeAfterSave) {
      closeCustomDeviceDialog();
    }
    return true;
  };
}

export function createSaveBuiltinDeviceDefinitionFromCustomDraft(__appScope: Record<string, any>) {
  return (template: DeviceTemplate, options: { closeAfterSave?: boolean } = {}) => {
  const { ALLOW_RESIZE_TRANSFORM_PARAM, TERMINAL_TYPE_LIBRARY_LABELS, closeCustomDeviceDialog, customDefaultDefinitions, customDeviceDraft, customDeviceGeneratedDefaultImageCandidates, customDeviceImageWithTerminalConnectors, customDeviceTerminalAnchors, deviceDefinitionOverrideForTemplate, deviceDefinitionOverrides, getTemplateParameterDefinitions, hasOverlappingCustomDeviceTerminalAnchors, isReservedDeviceDefinitionParamName, isValidComponentLibraryName, libraryTemplates, measurementConfig, measurementConfigDraft, measurementConfigDraftRef, normalizeComponentLibraryName, normalizeContainerTerminalAssociations, normalizeDefinitionRowEnumFields, persistDeviceLibraryChange, requireEditMode, setCustomDeviceDraft, setCustomDeviceDraftCleanBaseline = () => undefined, setCustomDeviceSaveMessage, setDeviceDefinitionOverrides, showGlobalMessage, syncExistingNodesWithTemplateDefinitions, syncInheritedCustomDeviceStateVisuals, validateContainerTerminalAssociations, validateStateDraftRows, writeOperationLog } = __appScope;
    if (!requireEditMode("保存元件定义")) {
      return false;
    }
    setCustomDeviceSaveMessage("");
    const componentLibrary = normalizeComponentLibraryName(customDeviceDraft.componentLibrary);
    if (!componentLibrary) {
      setCustomDeviceDraft((current) => ({ ...current, error: "请选择元件库。" }));
      return false;
    }
    if (!isValidComponentLibraryName(componentLibrary)) {
      setCustomDeviceDraft((current) => ({ ...current, error: "元件库必须是英文名称，只能包含英文字母、数字和下划线，并且必须以英文字母开头。" }));
      return false;
    }
    const terminalTypes = customDeviceDraft.terminalTypes.slice(0, customDeviceDraft.terminalCount);
    const terminalAssociations = normalizeContainerTerminalAssociations(
      terminalTypes,
      customDeviceDraft.terminalAssociations,
      customDeviceDraft.terminalCount
    );
    if (customDeviceDraft.isContainer) {
      const terminalAssociationValidation = validateContainerTerminalAssociations(terminalTypes, terminalAssociations);
      if (!terminalAssociationValidation.valid) {
        window.alert(terminalAssociationValidation.message);
        setCustomDeviceDraft((current) => ({ ...current, terminalAssociations, error: terminalAssociationValidation.message }));
        return false;
      }
    }
    if (hasOverlappingCustomDeviceTerminalAnchors(customDeviceTerminalAnchors)) {
      const message = "不同端子位置不能重叠，请调整端子位置后再保存。";
      window.alert(message);
      setCustomDeviceDraft((current) => ({ ...current, error: message }));
      return false;
    }
    const defaultRows = customDefaultDefinitions(terminalTypes, {
      isContainer: customDeviceDraft.isContainer,
      terminalAssociations
    });
    const draftRows = normalizeCustomDeviceDraftParamRows(customDeviceDraft.params, normalizeDefinitionRowEnumFields);
    const { definitions: mergedDefaultRows, customRows } = mergeDefaultAndCustomDefinitionRows(defaultRows, draftRows, normalizeDefinitionRowEnumFields);
    const definitions = [...mergedDefaultRows, ...customRows];
    const definitionsComplianceMessage = deviceParameterDefinitionsComplianceMessage(definitions);
    if (definitionsComplianceMessage) {
      setCustomDeviceDraft((current) => ({ ...current, error: definitionsComplianceMessage }));
      return false;
    }
    if (customRows.some((row) => !row.cnName || !row.enName)) {
      setCustomDeviceDraft((current) => ({ ...current, error: "属性行的中文名称和英文名称不能为空。" }));
      return false;
    }
    const reservedCustomRow = customRows.find((row) => isReservedDeviceDefinitionParamName(row.enName));
    if (reservedCustomRow) {
      setCustomDeviceDraft((current) => ({
        ...current,
        error: reservedCustomRow.enName === ALLOW_RESIZE_TRANSFORM_PARAM ? "是否允许变形是元件属性，不能在参数定义表中新增。" : "是否容器是元件属性，不能在参数定义表中新增。"
      }));
      return false;
    }
    const duplicateDefinition = definitions.find(
      (definition, index) => definitions.findIndex((item) => item.enName.toLowerCase() === definition.enName.toLowerCase()) !== index
    );
    if (duplicateDefinition) {
      setCustomDeviceDraft((current) => ({ ...current, error: `属性英文名称重复：${duplicateDefinition.enName}` }));
      return false;
    }
    const currentMeasurementConfig = measurementConfigDraftRef?.current ?? measurementConfigDraft ?? measurementConfig;
    const profileItems = currentMeasurementConfig?.deviceProfiles?.find((profile) => profile.deviceKind === componentLibrary)?.items ?? [];
    const measurementProfileMessage = measurementProfileItemsComplianceMessage(profileItems, {
      measurementTypes: currentMeasurementConfig?.measurementTypes ?? [],
      parameterDefinitions: definitions,
      positionDefinitions: buildMeasurementProfilePositionDefinitions({
        source: {
          ...template,
          terminalType: terminalTypes[0] ?? template.terminalType,
          terminalCount: terminalTypes.length,
          terminalTypes,
          terminalLabels: customDeviceDraft.terminalLabels.slice(0, terminalTypes.length),
          terminalRoles: customDeviceDraft.terminalRoles.slice(0, terminalTypes.length),
          terminalAssociations: customDeviceDraft.isContainer ? terminalAssociations : undefined,
          isContainer: customDeviceDraft.isContainer,
          parameterDefinitions: definitions
        },
        parameterDefinitions: definitions,
        libraryTemplates
      }),
      targetLabel: customDeviceDraft.componentName.trim() || template.label
    });
    if (measurementProfileMessage) {
      setCustomDeviceDraft((current) => ({ ...current, error: measurementProfileMessage }));
      return false;
    }
    const stateValidation = validateStateDraftRows(customDeviceDraft.stateDefinitions);
    if (stateValidation.error) {
      setCustomDeviceDraft((current) => ({ ...current, error: stateValidation.error }));
      return false;
    }
    const terminalAnchors = customDeviceTerminalAnchors.slice(0, terminalTypes.length).map((anchor) => ({ ...anchor }));
    const inlineBackgroundPatch = inlineDefaultIconBackgroundPatch(__appScope, "custom");
    const draftBackgroundImage = inlineBackgroundPatch?.backgroundImage ?? customDeviceDraft.backgroundImage;
    const draftBackgroundImageAssetId = inlineBackgroundPatch?.backgroundImageAssetId ?? customDeviceDraft.backgroundImageAssetId;
    const draftBackgroundImageFit = customDeviceDraft.backgroundImageFit ?? "cover";
    const draftBackgroundImageCleared = inlineBackgroundPatch?.backgroundImageCleared ?? customDeviceDraft.backgroundImageCleared;
    const backgroundImage = draftBackgroundImageCleared
      ? ""
      : customDeviceImageWithTerminalConnectors(draftBackgroundImage, terminalTypes, terminalAnchors);
    const backgroundImageAssetId = draftBackgroundImageAssetId && backgroundImage === `/api/images/${draftBackgroundImageAssetId}`
      ? draftBackgroundImageAssetId
      : "";
    const defaultImageCandidates = customDeviceGeneratedDefaultImageCandidates(
      customDeviceDraft.componentName.trim() || template.label,
      customDeviceDraft.componentLibrary,
      terminalTypes
    );
    const stateDefinitions = syncInheritedCustomDeviceStateVisuals(
      stateValidation.states,
      {
        backgroundImage,
        backgroundImageAssetId,
        backgroundImageFit: draftBackgroundImageFit
      },
      defaultImageCandidates
    );
    const size = {
      width: Math.max(1, Math.round(customDeviceDraft.size.width || template.size.width || 104)),
      height: Math.max(1, Math.round(customDeviceDraft.size.height || template.size.height || 64))
    };
    const terminalLabels = customDeviceDraft.terminalLabels.slice(0, terminalTypes.length).map(
      (label, index) => label.trim() || `${TERMINAL_TYPE_LIBRARY_LABELS[terminalTypes[index]] ?? terminalTypes[index]}端${index + 1}`
    );
    const previousDefinitions = getTemplateParameterDefinitions(template);
    syncExistingNodesWithTemplateDefinitions(
      {
        parameterDefinitions: definitions,
        params: {
          ...(template.params ?? {}),
          component_type: componentLibrary,
        backgroundImage,
        backgroundImageAssetId,
        backgroundImageFit: draftBackgroundImageFit,
        backgroundImageCleared: draftBackgroundImageCleared
        },
        size,
        terminalType: terminalTypes[0] ?? template.terminalType,
        terminalCount: terminalTypes.length,
        terminalTypes,
        terminalLabels,
        terminalAnchors,
        stateDefinitions
      },
      previousDefinitions,
      (node) => node.kind === template.kind
    );
    const existingOverride = deviceDefinitionOverrideForTemplate(template, deviceDefinitionOverrides);
    const nextDeviceDefinitionOverrides: Record<string, DeviceTemplateDefinitionOverride> = {
      ...deviceDefinitionOverrides,
      [template.kind]: {
        ...existingOverride,
        kind: template.kind,
        params: {
          ...(existingOverride?.params ?? {}),
          component_type: componentLibrary,
          backgroundImage,
          backgroundImageAssetId,
          backgroundImageFit: draftBackgroundImageFit,
          backgroundImageCleared: draftBackgroundImageCleared
        },
        size,
        terminalType: terminalTypes[0] ?? template.terminalType,
        terminalCount: terminalTypes.length,
        terminalTypes,
        terminalLabels,
        terminalAnchors,
        terminalRoles: customDeviceDraft.terminalRoles.slice(0, terminalTypes.length),
        terminalAssociations: customDeviceDraft.isContainer ? terminalAssociations : undefined,
        isContainer: customDeviceDraft.isContainer,
        allowResizeTransform: customDeviceDraft.allowResizeTransform === "1",
        parameterDefinitions: definitions,
        stateDefinitions,
        updatedAt: new Date().toISOString()
      }
    };
    setDeviceDefinitionOverrides(nextDeviceDefinitionOverrides);
    persistDeviceLibraryChange({ deviceDefinitionOverrides: nextDeviceDefinitionOverrides }, {
      success: `元件定义已保存到后台：${template.label}`,
      failure: `元件定义已保存到本地，后台保存失败：${template.label}`
    });
    const cleanDraft = { ...customDeviceDraft, backgroundImage, backgroundImageAssetId, backgroundImageFit: draftBackgroundImageFit, backgroundImageCleared: draftBackgroundImageCleared, size, terminalLabels, error: "" };
    setCustomDeviceDraft((current) => ({ ...current, backgroundImage, backgroundImageAssetId, backgroundImageFit: draftBackgroundImageFit, backgroundImageCleared: draftBackgroundImageCleared, size, terminalLabels, error: "" }));
    setCustomDeviceDraftCleanBaseline(cleanDraft, terminalAnchors);
    setCustomDeviceSaveMessage("");
    showGlobalMessage(`元件定义已保存：${template.label}`, "success");
    writeOperationLog(`保存元件定义：${template.label}`);
    if (options.closeAfterSave) {
      closeCustomDeviceDialog();
    }
    return true;
  };
}

export function createSaveCustomDeviceDefinitionDialog(__appScope: Record<string, any>) {
  return (options: { closeAfterSave?: boolean } = {}) => {
  const { customDeviceDefinitionMode, editingCustomDeviceKind, measurementConfigDraft, measurementConfigDraftRef, saveBuiltinDeviceDefinitionFromCustomDraft, saveCustomDeviceTemplate, saveMeasurementConfigDialog, selectedCustomComponentTemplate, selectedDefinitionKind, selectedDefinitionTemplate } = __appScope;
    const targetTemplate = selectedDefinitionTemplate && selectedDefinitionTemplate.kind === selectedDefinitionKind
      ? selectedDefinitionTemplate
      : selectedCustomComponentTemplate;
    let saved = false;
    if (customDeviceDefinitionMode === "edit" && targetTemplate && !targetTemplate.custom && editingCustomDeviceKind === "") {
      saved = saveBuiltinDeviceDefinitionFromCustomDraft(targetTemplate, options) === true;
    } else {
      saved = saveCustomDeviceTemplate(options) === true;
    }
    if (saved && (measurementConfigDraftRef.current ?? measurementConfigDraft)) {
      void saveMeasurementConfigDialog();
    }
  };
}

export function createRenderStateVisualPager(__appScope: Record<string, any>) {
  return (
    rows: DeviceDefinitionStateDraftRow[],
    activeRowId: string,
    setActiveRowId: (rowId: string) => void,
    handlers: {
      update: (rowId: string, patch: Partial<DeviceDefinitionStateDraftRow>) => void;
      add: () => void;
      remove: (rowId: string) => void;
      reset?: () => void;
      resetLabel?: string;
      saveStateVisuals?: () => void;
      saveStateVisualsLabel?: string;
      drawingScope?: "definition" | "custom";
      definitionTemplate?: any;
      terminalGeometryTemplate?: any;
      hideDefaultPage?: boolean;
    }
  ) => {
  const { BufferedTextInput, COMPONENT_LIBRARY_LABELS, CUSTOM_DEVICE_TERMINAL_ANCHOR_GUIDE_VALUES, CUSTOM_DEVICE_TERMINAL_ANCHOR_PRECISION, DEFAULT_STATE_PAGE_ID, DEVICE_LIBRARY, DeferredColorInput, FONT_FAMILY_OPTIONS, FONT_FAMILY_OPTION_LABELS, MemoDeviceGlyph, STATE_ICON_LINE_CAP_OPTIONS, TERMINAL_TYPE_LIBRARY_LABELS, activeStateDraftRow, addStateIconDrawingElement, appendNonDefaultStateDraftRow, button, circle, colorPalette, createNodeFromTemplate, createStateDraftRowFromDefaultVisual, createStateIconDrawingElement, customDeviceDefaultStateVisualDraft, customDeviceDraft, customDeviceTerminalAnchorDragIndex, customDeviceTerminalAnchorValue, customDeviceTerminalAnchors, customDraftTerminalTypes, defaultStateDraftRow, definitionDefaultStateVisualDraft, definitionTerminalAnchorDragIndex, definitionVisualDraft, definitionVisualTerminalAnchors, definitionVisualTerminalTypes, deleteSelectedStateIconDrawingElements, deleteStateIconDrawingElement, div, dragStateIconDrawingSelection, formatSvgNumber, g, getNodeScaleX, getNodeScaleY, image, imageAssets, isDefaultStatePageId, label, line, nextNonDefaultStateIndex, nodeGeometryTransform, nonDefaultStateDraftRows, projectCustomDeviceTerminalAnchorToBoundary, rect, resolveTemplateComponentLibrary, selectedDefinitionTemplate, setCustomDeviceDraft, setCustomDeviceTerminalAnchorDragIndex, setDefinitionStateDraftRows, setDefinitionTerminalAnchorDragIndex, setImagePickerCategoryFilter, setImagePickerSearchQuery, setImagePickerSourceFilter, setImageTarget, setStateIconDrawingContextMenu, setStateIconDrawingDialog, setStateIconDrawingImageVisibleFrames, setStateIconDrawingSvgVisibleFrames, small, span, stateDraftRowId, stateIconDrawingClipboardRef, stateIconDrawingContextMenu, stateIconDrawingDialog, stateIconDrawingElementId, stateIconDrawingElementPreviewImage, stateIconDrawingElementPreviewNode, stateIconDrawingFrameRect, stateIconDrawingHistoryRef, stateIconDrawingImageVisibleFrames, stateIconDrawingKeyDown, stateIconDrawingPointer, stateIconDrawingPreviewNeedsDirectElementRender, stateIconDrawingSelection, stateIconDrawingSvgRef, stateIconDrawingSvgVisibleFrames, stateIconDrawingToImage, stateVisualShapeLabel, startStateIconDrawingDrag, stopStateIconDrawingDrag, strong, terminalColor, terminalRenderLocalPoint, terminalStubSegment, terminalStubStrokeWidth, text, updateCustomDeviceTerminalAnchor, updateDefinitionTerminalAnchor, updateStateIconDrawingElement, visibleStateIconColor } = __appScope;
    const hideDefaultPage = handlers.hideDefaultPage === true;
    const displayRows = hideDefaultPage ? rows : nonDefaultStateDraftRows(rows);
    const defaultVisual = handlers.drawingScope === "definition"
      ? definitionDefaultStateVisualDraft()
      : customDeviceDefaultStateVisualDraft();
    const defaultRow = hideDefaultPage ? null : defaultStateDraftRow(rows, defaultVisual);
    const effectiveActiveRowId = hideDefaultPage && isDefaultStatePageId(activeRowId) ? displayRows[0]?.id ?? activeRowId : activeRowId;
    const isDefaultStatePage = !hideDefaultPage && isDefaultStatePageId(effectiveActiveRowId);
    const activeRow = activeStateDraftRow(displayRows, effectiveActiveRowId);
    const activeDrawingTarget = handlers.drawingScope && (activeRow || isDefaultStatePage)
      ? { scope: handlers.drawingScope, rowId: isDefaultStatePage ? DEFAULT_STATE_PAGE_ID : activeRow.id }
      : null;
    const drawingReady =
      activeDrawingTarget &&
      stateIconDrawingDialog?.target.scope === activeDrawingTarget.scope &&
      stateIconDrawingDialog.target.rowId === activeDrawingTarget.rowId;
    const renderStateIconDrawingImportIcon = (mode: "svg" | "image") => (
      <svg className="state-icon-tool-icon" viewBox="0 0 24 24" aria-hidden="true">
        {mode === "svg" ? (
          <>
            <path d="M7 3h7l4 4v14H7z" />
            <path d="M14 3v5h5" />
            <path d="M10 16l-2-2 2-2" />
            <path d="M14 12l2 2-2 2" />
          </>
        ) : (
          <>
            <rect x="4" y="5" width="16" height="14" rx="2" />
            <circle cx="9" cy="10" r="1.6" />
            <path d="M6.5 17l4.2-4.2 3 3 1.9-1.9 2.9 3.1" />
          </>
        )}
      </svg>
    );
    const renderStateIconDrawingToolIcon = (kind: StateVisualShapeKind) => {
      switch (kind) {
        case "switch-open":
          return (
            <svg className="state-icon-tool-icon" viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="5" cy="16" r="1.7" />
              <circle cx="19" cy="16" r="1.7" />
              <path d="M6.8 16h4.8" />
              <path d="M12.4 14.4l5.1-4.2" />
            </svg>
          );
        case "switch-closed":
          return (
            <svg className="state-icon-tool-icon" viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="5" cy="16" r="1.7" />
              <circle cx="19" cy="16" r="1.7" />
              <path d="M6.8 16h10.4" />
            </svg>
          );
        case "valve-open":
          return (
            <svg className="state-icon-tool-icon" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M5 8l6 4-6 4z" />
              <path d="M19 8l-6 4 6 4z" />
              <path d="M12 7v10" />
            </svg>
          );
        case "valve-closed":
          return (
            <svg className="state-icon-tool-icon" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M5 8l6 4-6 4z" />
              <path d="M19 8l-6 4 6 4z" />
              <path d="M8 6l8 12" />
            </svg>
          );
        case "line":
          return (
            <svg className="state-icon-tool-icon" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M5 18L19 6" />
            </svg>
          );
        case "polyline":
          return (
            <svg className="state-icon-tool-icon" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M4 17L11 7L20 17" />
            </svg>
          );
        case "point":
          return (
            <svg className="state-icon-tool-icon" viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="12" cy="12" r="4" />
            </svg>
          );
        case "triangle":
          return (
            <svg className="state-icon-tool-icon" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 5l8 14H4z" />
            </svg>
          );
        case "rectangle":
          return (
            <svg className="state-icon-tool-icon" viewBox="0 0 24 24" aria-hidden="true">
              <rect x="4.5" y="7" width="15" height="10" rx="1.5" />
            </svg>
          );
        case "square":
          return (
            <svg className="state-icon-tool-icon" viewBox="0 0 24 24" aria-hidden="true">
              <rect x="6" y="6" width="12" height="12" rx="1.5" />
            </svg>
          );
        case "hexagon":
          return (
            <svg className="state-icon-tool-icon" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M8 5h8l4 7-4 7H8l-4-7z" />
            </svg>
          );
        case "polygon":
          return (
            <svg className="state-icon-tool-icon" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M7 5h8l4 5-2 8-8 1-4-6z" />
            </svg>
          );
        case "circle":
          return (
            <svg className="state-icon-tool-icon" viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="12" cy="12" r="7" />
            </svg>
          );
        case "semicircle":
          return (
            <svg className="state-icon-tool-icon" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M5 15a7 7 0 0 1 14 0z" />
              <path d="M5 15h14" />
            </svg>
          );
        case "ellipse":
          return (
            <svg className="state-icon-tool-icon" viewBox="0 0 24 24" aria-hidden="true">
              <ellipse cx="12" cy="12" rx="8" ry="5" />
            </svg>
          );
        case "arc":
          return (
            <svg className="state-icon-tool-icon" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6 16a7 7 0 0 1 12 0" />
            </svg>
          );
        case "text":
          return (
            <svg className="state-icon-tool-icon" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6 6h12" />
              <path d="M12 6v12" />
              <path d="M9 18h6" />
            </svg>
          );
        default:
          return null;
      }
    };
    const stateIconBasicToolKinds = [
      "switch-open",
      "switch-closed",
      "valve-open",
      "valve-closed",
      "line",
      "polyline",
      "point",
      "triangle",
      "rectangle",
      "square",
      "hexagon",
      "polygon",
      "circle",
      "semicircle",
      "ellipse",
      "arc",
      "text"
    ] as StateVisualShapeKind[];
    const staticTemplateGroups = (() => {
      const groups = new Map<string, any[]>();
      for (const template of DEVICE_LIBRARY ?? []) {
        if (template.categoryLibrary !== "静态图元" && !String(template.kind ?? "").startsWith("static-")) {
          continue;
        }
        const section = resolveTemplateComponentLibrary ? resolveTemplateComponentLibrary(template) : stateIconStaticTemplateParam(template, "component_type", "StaticBasicShape");
        if (STATE_ICON_STATIC_TEMPLATE_SECTIONS_COVERED_BY_BASIC_TOOLS.has(section)) {
          continue;
        }
        groups.set(section, [...(groups.get(section) ?? []), template]);
      }
      return Array.from(groups.entries())
        .sort(([left], [right]) => {
          const leftIndex = STATE_ICON_STATIC_TEMPLATE_SECTION_ORDER.indexOf(left);
          const rightIndex = STATE_ICON_STATIC_TEMPLATE_SECTION_ORDER.indexOf(right);
          const normalizedLeft = leftIndex >= 0 ? leftIndex : STATE_ICON_STATIC_TEMPLATE_SECTION_ORDER.length;
          const normalizedRight = rightIndex >= 0 ? rightIndex : STATE_ICON_STATIC_TEMPLATE_SECTION_ORDER.length;
          return normalizedLeft - normalizedRight || left.localeCompare(right);
        })
        .map(([section, templates]) => ({
          section,
          label: COMPONENT_LIBRARY_LABELS?.[section] ?? section,
          templates
        }));
    })();
    const renderStaticTemplateToolIcon = (template: any) => {
      if (!createNodeFromTemplate || !MemoDeviceGlyph || !nodeGeometryTransform) {
        return renderStateIconDrawingToolIcon("rectangle");
      }
      const preview = createNodeFromTemplate(template, { x: 0, y: 0 });
      const width = Math.max(72, Number(preview?.size?.width) || 72);
      const height = Math.max(48, Number(preview?.size?.height) || 48);
      const padding = 18;
      return (
        <svg
          className="state-icon-static-template-icon"
          viewBox={`${formatSvgNumber(-width / 2 - padding)} ${formatSvgNumber(-height / 2 - padding)} ${formatSvgNumber(width + padding * 2)} ${formatSvgNumber(height + padding * 2)}`}
          aria-hidden="true"
        >
          <g transform={nodeGeometryTransform(preview)}>
            <MemoDeviceGlyph node={preview} colorPalette={colorPalette} stateVisual={null} />
          </g>
        </svg>
      );
    };
    const addStateIconStaticTemplate = (template: any) => {
      if (!drawingReady) {
        return;
      }
      setStateIconDrawingContextMenu(null);
      setStateIconDrawingDialog((current) => current ? {
        ...current,
        elementLibraryTab: "static",
        pendingElementKind: undefined,
        pendingStaticTemplate: template,
        drawingDraft: undefined,
        selectedElementId: "",
        selectedElementIds: []
      } : current);
    };
    const setStateIconElementLibraryTab = (tab: "basic" | "static") => {
      if (!drawingReady) {
        return;
      }
      setStateIconDrawingContextMenu(null);
      setStateIconDrawingDialog((current) => current ? {
        ...current,
        elementLibraryTab: tab,
        pendingElementKind: tab === "basic" ? current.pendingElementKind : undefined,
        pendingStaticTemplate: tab === "static" ? current.pendingStaticTemplate : undefined,
        drawingDraft: undefined
      } : current);
    };
    const renderStateIconDrawingLibrary = () => {
      if (!activeDrawingTarget) {
        return null;
      }
      const activeElementLibraryTab = stateIconDrawingDialog?.elementLibraryTab ?? (stateIconDrawingDialog?.pendingStaticTemplate ? "static" : "basic");
      return (
        <div className="state-icon-drawing-library" aria-label="添加图案">
          <span>添加图案</span>
          <div className="state-icon-drawing-import-actions">
            <button
              type="button"
              disabled={!drawingReady}
              onClick={() => {
                if (!drawingReady) {
                  return;
                }
                setImagePickerSourceFilter("builtin");
                setImagePickerCategoryFilter("");
                setImagePickerSearchQuery("");
                setImageTarget({ kind: "stateIconDrawing", sourceMode: "builtinOnly" });
              }}
              className="state-icon-import-button state-icon-import-text-button"
              aria-label="内置图标"
              title="内置图标"
            >
              内置图标
            </button>
            <button
              type="button"
              disabled={!drawingReady}
              onClick={() => {
                if (!drawingReady) {
                  return;
                }
                setImagePickerSourceFilter("");
                setImagePickerCategoryFilter("");
                setImagePickerSearchQuery("");
                setImageTarget({ kind: "stateIconDrawing", sourceMode: "catalogOnly" });
              }}
              className="state-icon-import-button state-icon-import-text-button"
              aria-label="分类图标"
              title="分类图标"
            >
              分类图标
            </button>
            <button
              type="button"
              disabled={!drawingReady}
              onClick={() => {
                if (!drawingReady) {
                  return;
                }
                setImagePickerSourceFilter("external");
                setImagePickerCategoryFilter("");
                setImagePickerSearchQuery("");
                setImageTarget({ kind: "stateIconDrawing", sourceMode: "externalOnly" });
              }}
              className="state-icon-import-button state-icon-import-text-button"
              aria-label="外部图标"
              title="外部图标"
            >
              外部图标
            </button>
          </div>
          <div className="state-icon-library-tabs" role="tablist" aria-label="图案来源切换">
            <button
              type="button"
              className={`state-icon-library-tab ${activeElementLibraryTab === "basic" ? "active" : ""}`}
              disabled={!drawingReady}
              role="tab"
              aria-selected={activeElementLibraryTab === "basic"}
              onClick={() => setStateIconElementLibraryTab("basic")}
            >
              基础元素
            </button>
            <button
              type="button"
              className={`state-icon-library-tab ${activeElementLibraryTab === "static" ? "active" : ""}`}
              disabled={!drawingReady}
              role="tab"
              aria-selected={activeElementLibraryTab === "static"}
              onClick={() => setStateIconElementLibraryTab("static")}
            >
              静态图元库
            </button>
          </div>
          <div className="state-icon-library-panel">
            {activeElementLibraryTab === "basic" ? (
              <div className="state-icon-basic-tool-actions" role="tabpanel" aria-label="基础元素">
                {stateIconBasicToolKinds.map((kind) => (
                  <button
                    key={kind}
                    type="button"
                    className={`state-icon-tool-button ${stateIconDrawingDialog?.pendingElementKind === kind ? "active" : ""}`}
                    disabled={!drawingReady}
                    aria-label={stateVisualShapeLabel(kind)}
                    title={stateVisualShapeLabel(kind)}
                    onClick={() => addStateIconDrawingElement(kind)}
                  >
                    {renderStateIconDrawingToolIcon(kind)}
                  </button>
                ))}
              </div>
            ) : (
              <div className="state-icon-static-template-library" role="tabpanel" aria-label="静态图元库">
                <div className="state-icon-static-template-groups">
                  {staticTemplateGroups.map((group) => (
                    <div key={group.section} className="state-icon-static-template-group">
                      <span>{group.label}</span>
                      <div>
                        {group.templates.map((template) => (
                          <button
                            key={template.kind}
                            type="button"
                            className={`state-icon-static-template-button ${stateIconDrawingDialog?.pendingStaticTemplate?.kind === template.kind ? "active" : ""}`}
                            disabled={!drawingReady}
                            aria-label={template.label}
                            title={`${template.label} / ${group.label}`}
                            onClick={() => addStateIconStaticTemplate(template)}
                          >
                            {renderStaticTemplateToolIcon(template)}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      );
    };
    const selectedStateRow = isDefaultStatePage ? defaultRow : activeRow;
    const selectedStateRowId = isDefaultStatePage ? DEFAULT_STATE_PAGE_ID : activeRow?.id ?? "";
    const stateIconDrawingTerminalDraft = handlers.drawingScope === "definition" ? definitionVisualDraft : customDeviceDraft;
    const stateIconDrawingTerminalTypes = handlers.drawingScope === "definition" ? definitionVisualTerminalTypes : customDraftTerminalTypes;
    const stateIconDrawingTerminalLabels = Array.isArray(stateIconDrawingTerminalDraft?.terminalLabels)
      ? stateIconDrawingTerminalDraft.terminalLabels
      : [];
    const stateIconDrawingTerminalCount = Math.max(
      0,
      Number(stateIconDrawingTerminalDraft?.terminalCount) || (Array.isArray(stateIconDrawingTerminalTypes) ? stateIconDrawingTerminalTypes.length : 0) || 0
    );
    const stateIconDrawingTerminalOptions = Array.from({ length: stateIconDrawingTerminalCount }, (_, index) => {
      const type = (Array.isArray(stateIconDrawingTerminalTypes) ? stateIconDrawingTerminalTypes[index] : "") || stateIconDrawingTerminalDraft?.terminalType || "ac";
      const typeLabel = TERMINAL_TYPE_LIBRARY_LABELS?.[type] ?? type;
      const customLabel = String(stateIconDrawingTerminalLabels[index] ?? "").trim();
      return {
        index,
        type,
        label: customLabel || `${typeLabel}端${index + 1}`,
        color: terminalColor ? terminalColor(type, colorPalette) : "#2563eb"
      };
    });
    const stateIconTerminalFrame = {
      x: STATE_ICON_DRAWING_FRAME_WIDTH / 8,
      y: STATE_ICON_DRAWING_FRAME_HEIGHT / 8,
      width: STATE_ICON_DRAWING_FRAME_WIDTH * 3 / 4,
      height: STATE_ICON_DRAWING_FRAME_HEIGHT * 3 / 4,
      centerX: STATE_ICON_DRAWING_FRAME_WIDTH / 2,
      centerY: STATE_ICON_DRAWING_FRAME_HEIGHT / 2,
      marginX: STATE_ICON_DRAWING_FRAME_WIDTH / 8,
      marginY: STATE_ICON_DRAWING_FRAME_HEIGHT / 8
    };
    const stateIconHasTerminals = Boolean(handlers.drawingScope && stateIconDrawingTerminalCount > 0);
    const stateIconTerminalAnchors = handlers.drawingScope === "definition" ? definitionVisualTerminalAnchors : customDeviceTerminalAnchors;
    const stateIconTerminalDragIndex = handlers.drawingScope === "definition" ? definitionTerminalAnchorDragIndex : customDeviceTerminalAnchorDragIndex;
    const setStateIconTerminalDragIndex = handlers.drawingScope === "definition" ? setDefinitionTerminalAnchorDragIndex : setCustomDeviceTerminalAnchorDragIndex;
    const updateStateIconTerminalAnchor = handlers.drawingScope === "definition" ? updateDefinitionTerminalAnchor : updateCustomDeviceTerminalAnchor;
    const stateIconGeometryTemplate = handlers.terminalGeometryTemplate
      ?? handlers.definitionTemplate
      ?? (handlers.drawingScope === "definition" ? selectedDefinitionTemplate : null);
    const stateIconUsesCanvasTerminalGeometry = Boolean(
      handlers.drawingScope &&
      stateIconGeometryTemplate &&
      !stateIconGeometryTemplate.custom &&
      stateIconDrawingTerminalDraft &&
      createNodeFromTemplate &&
      terminalRenderLocalPoint &&
      terminalStubSegment
    );
    const stateIconCanvasTerminalNode = stateIconUsesCanvasTerminalGeometry
      ? createNodeFromTemplate({
          ...stateIconGeometryTemplate,
          size: stateIconDrawingTerminalDraft.size,
          terminalCount: stateIconDrawingTerminalCount,
          terminalTypes: stateIconDrawingTerminalTypes,
          terminalLabels: stateIconDrawingTerminalLabels,
          terminalAnchors: stateIconTerminalAnchors
        }, { x: 0, y: 0 })
      : null;
    const stateIconCanvasTerminalContent = (() => {
      if (!stateIconCanvasTerminalNode) {
        return null;
      }
      const size = stateIconCanvasTerminalNode.size ?? { width: 104, height: 64 };
      const radians = ((Number(stateIconCanvasTerminalNode.rotation) || 0) * Math.PI) / 180;
      const cos = Math.cos(radians);
      const sin = Math.sin(radians);
      const rawWidth = Math.max(1, Number(size.width) * Math.abs(getNodeScaleX ? getNodeScaleX(stateIconCanvasTerminalNode) : 1));
      const rawHeight = Math.max(1, Number(size.height) * Math.abs(getNodeScaleY ? getNodeScaleY(stateIconCanvasTerminalNode) : 1));
      const rotatedWidth = Math.abs(rawWidth * cos) + Math.abs(rawHeight * sin);
      const rotatedHeight = Math.abs(rawWidth * sin) + Math.abs(rawHeight * cos);
      const viewBoxWidth = Math.max(1, rotatedWidth + 24);
      const viewBoxHeight = Math.max(1, rotatedHeight + 24);
      const scale = Math.min(stateIconTerminalFrame.width / viewBoxWidth, stateIconTerminalFrame.height / viewBoxHeight);
      return {
        node: stateIconCanvasTerminalNode,
        scale: Number.isFinite(scale) && scale > 0 ? scale : 1,
        centerX: stateIconTerminalFrame.centerX,
        centerY: stateIconTerminalFrame.centerY
      };
    })();
    const stateIconTerminalAnchorType = (index: number) =>
      (Array.isArray(stateIconDrawingTerminalTypes) ? stateIconDrawingTerminalTypes[index] : "") || stateIconDrawingTerminalDraft?.terminalType || "ac";
    const stateIconDisplayedBoundaryAnchor = (anchor: Point) => {
      const sourceAnchor = projectCustomDeviceTerminalAnchorToBoundary(anchor);
      const node = stateIconCanvasTerminalContent?.node;
      if (!node) {
        return sourceAnchor;
      }
      const scaleSignX = Math.sign(getNodeScaleX ? getNodeScaleX(node) : 1) || 1;
      const scaleSignY = Math.sign(getNodeScaleY ? getNodeScaleY(node) : 1) || 1;
      const radians = ((Number(node.rotation) || 0) * Math.PI) / 180;
      const cos = Math.cos(radians);
      const sin = Math.sin(radians);
      return projectCustomDeviceTerminalAnchorToBoundary({
        x: sourceAnchor.x * scaleSignX * cos - sourceAnchor.y * scaleSignY * sin,
        y: sourceAnchor.x * scaleSignX * sin + sourceAnchor.y * scaleSignY * cos
      });
    };
    const stateIconSourceBoundaryAnchorFromDisplayed = (anchor: Point) => {
      const displayedAnchor = projectCustomDeviceTerminalAnchorToBoundary(anchor);
      const node = stateIconCanvasTerminalContent?.node;
      if (!node) {
        return displayedAnchor;
      }
      const scaleSignX = Math.sign(getNodeScaleX ? getNodeScaleX(node) : 1) || 1;
      const scaleSignY = Math.sign(getNodeScaleY ? getNodeScaleY(node) : 1) || 1;
      const radians = ((Number(node.rotation) || 0) * Math.PI) / 180;
      const cos = Math.cos(radians);
      const sin = Math.sin(radians);
      return projectCustomDeviceTerminalAnchorToBoundary({
        x: (displayedAnchor.x * cos + displayedAnchor.y * sin) * scaleSignX,
        y: (-displayedAnchor.x * sin + displayedAnchor.y * cos) * scaleSignY
      });
    };
    const stateIconTerminalConnectorSegment = (anchor: Point) => {
      const boundaryAnchor = stateIconDisplayedBoundaryAnchor(anchor);
      const from = {
        x: stateIconTerminalFrame.centerX + boundaryAnchor.x * stateIconTerminalFrame.width,
        y: stateIconTerminalFrame.centerY + boundaryAnchor.y * stateIconTerminalFrame.height
      };
      const horizontal = Math.abs(boundaryAnchor.x) >= Math.abs(boundaryAnchor.y);
      return {
        from,
        to: horizontal
          ? { x: from.x + (boundaryAnchor.x < 0 ? -stateIconTerminalFrame.marginX : stateIconTerminalFrame.marginX), y: from.y }
          : { x: from.x, y: from.y + (boundaryAnchor.y < 0 ? -stateIconTerminalFrame.marginY : stateIconTerminalFrame.marginY) }
      };
    };
    const renderStateIconTerminalDynamicGuideLayer = (anchors: Point[]) => {
      const activeIndex = typeof stateIconTerminalDragIndex === "number" ? stateIconTerminalDragIndex : -1;
      const activeAnchor = anchors[activeIndex];
      if (!activeAnchor) {
        return null;
      }
      const activeSegment = stateIconTerminalConnectorSegment(activeAnchor);
      const activeDisplayedAnchor = stateIconDisplayedBoundaryAnchor(activeAnchor);
      const lines: Array<{
        id: string;
        orientation: "vertical" | "horizontal";
        position: number;
        start: number;
        end: number;
        variant: "active" | "match" | "snap";
      }> = [];
      const seen = new Set<string>();
      const addLine = (
        orientation: "vertical" | "horizontal",
        position: number,
        variant: "active" | "match" | "snap",
        start: number,
        end: number
      ) => {
        if (!Number.isFinite(position)) {
          return;
        }
        const roundedPosition = Number(formatSvgNumber(position));
        const key = `${orientation}:${roundedPosition}`;
        if (seen.has(key)) {
          return;
        }
        seen.add(key);
        lines.push({
          id: `${orientation}-${variant}-${roundedPosition}`,
          orientation,
          position: roundedPosition,
          start,
          end,
          variant
        });
      };
      addLine("vertical", activeSegment.to.x, "active", 0, STATE_ICON_DRAWING_FRAME_HEIGHT);
      addLine("horizontal", activeSegment.to.y, "active", 0, STATE_ICON_DRAWING_FRAME_WIDTH);
      const anchorMatchTolerance = 2;
      anchors.forEach((anchor, index) => {
        if (index === activeIndex) {
          return;
        }
        const segment = stateIconTerminalConnectorSegment(anchor);
        if (Math.abs(segment.to.x - activeSegment.to.x) <= anchorMatchTolerance) {
          addLine("vertical", segment.to.x, "match", 0, STATE_ICON_DRAWING_FRAME_HEIGHT);
        }
        if (Math.abs(segment.to.y - activeSegment.to.y) <= anchorMatchTolerance) {
          addLine("horizontal", segment.to.y, "match", 0, STATE_ICON_DRAWING_FRAME_WIDTH);
        }
      });
      const guideValues = Array.isArray(CUSTOM_DEVICE_TERMINAL_ANCHOR_GUIDE_VALUES)
        ? CUSTOM_DEVICE_TERMINAL_ANCHOR_GUIDE_VALUES
        : [];
      const guideTolerance = 1 / Math.max(1, Number(CUSTOM_DEVICE_TERMINAL_ANCHOR_PRECISION) || 1);
      const activeGuideX = customDeviceTerminalAnchorValue(activeDisplayedAnchor.x);
      const activeGuideY = customDeviceTerminalAnchorValue(activeDisplayedAnchor.y);
      guideValues.forEach((guideValue) => {
        if (Math.abs(activeGuideX - guideValue) <= guideTolerance) {
          addLine("vertical", stateIconTerminalFrame.centerX + guideValue * stateIconTerminalFrame.width, "snap", 0, STATE_ICON_DRAWING_FRAME_HEIGHT);
        }
        if (Math.abs(activeGuideY - guideValue) <= guideTolerance) {
          addLine("horizontal", stateIconTerminalFrame.centerY + guideValue * stateIconTerminalFrame.height, "snap", 0, STATE_ICON_DRAWING_FRAME_WIDTH);
        }
      });
      return (
        <g className="state-icon-terminal-dynamic-guide-layer" aria-hidden="true">
          {lines.map((guide) => (
            <line
              key={`state-icon-terminal-dynamic-guide-${guide.id}`}
              className={[
                "custom-device-terminal-guide",
                "state-icon-terminal-anchor-guide",
                `state-icon-terminal-anchor-guide-${guide.orientation}`,
                `state-icon-terminal-anchor-guide-${guide.variant}`,
                guide.variant === "active" ? "active" : ""
              ].filter(Boolean).join(" ")}
              x1={guide.orientation === "vertical" ? guide.position : guide.start}
              y1={guide.orientation === "vertical" ? guide.start : guide.position}
              x2={guide.orientation === "vertical" ? guide.position : guide.end}
              y2={guide.orientation === "vertical" ? guide.end : guide.position}
              vectorEffect="non-scaling-stroke"
            />
          ))}
        </g>
      );
    };
    const updateStateIconTerminalAnchorFromDrawing = (index: number, event: PointerEvent<SVGSVGElement>) => {
      if (!updateStateIconTerminalAnchor || !projectCustomDeviceTerminalAnchorToBoundary) {
        return;
      }
      const point = stateIconDrawingPointer(event);
      const nextAnchor = projectCustomDeviceTerminalAnchorToBoundary({
        x: (point.x - stateIconTerminalFrame.centerX) / stateIconTerminalFrame.width,
        y: (point.y - stateIconTerminalFrame.centerY) / stateIconTerminalFrame.height
      });
      updateStateIconTerminalAnchor(index, stateIconSourceBoundaryAnchorFromDisplayed(nextAnchor));
    };
    const finishStateIconTerminalDrag = (event: PointerEvent<SVGSVGElement>) => {
      if (stateIconTerminalDragIndex === null || stateIconTerminalDragIndex === undefined) {
        return false;
      }
      if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
      setStateIconTerminalDragIndex?.(null);
      return true;
    };
    const renderStateIconOuterFrameLayer = () => (
      <g className="state-icon-outer-frame-layer">
        <rect
          x="0.75"
          y="0.75"
          width="238.5"
          height="158.5"
          rx="6"
          className="state-icon-drawing-icon-frame state-icon-drawing-outer-frame"
          fill="none"
          stroke="#2563eb"
          strokeWidth={1.5}
          strokeDasharray="6 4"
          vectorEffect="non-scaling-stroke"
        />
      </g>
    );
    const renderStateIconTerminalBaseLayer = () => {
      if (!stateIconHasTerminals) {
        return null;
      }
      const anchors = Array.isArray(stateIconTerminalAnchors) ? stateIconTerminalAnchors.slice(0, stateIconDrawingTerminalCount) : [];
      if (anchors.length === 0) {
        return null;
      }
      if (stateIconCanvasTerminalContent) {
        return (
          <g className="state-icon-terminal-base-layer state-icon-terminal-canvas-geometry-layer">
            {renderStateIconTerminalDynamicGuideLayer(anchors)}
            <g className="state-icon-terminal-connector-layer">
              {anchors.map((anchor, index) => {
                const segment = stateIconTerminalConnectorSegment(anchor);
                const terminalType = stateIconTerminalAnchorType(index);
                return (
                  <line
                    key={`state-icon-terminal-canvas-connector-${index}`}
                    className="custom-device-terminal-connector state-icon-terminal-connector"
                    x1={segment.from.x}
                    y1={segment.from.y}
                    x2={segment.to.x}
                    y2={segment.to.y}
                    stroke={terminalColor(terminalType, colorPalette)}
                    strokeWidth={2}
                    strokeLinecap="round"
                    vectorEffect="non-scaling-stroke"
                    style={{ "--terminal-color": terminalColor(terminalType, colorPalette) } as CSSProperties}
                  />
                );
              })}
            </g>
            <g className="state-icon-terminal-anchor-layer">
              {anchors.map((anchor, index) => {
                const segment = stateIconTerminalConnectorSegment(anchor);
                const terminalType = stateIconTerminalAnchorType(index);
                const dragging = stateIconTerminalDragIndex === index;
                return (
                  <g
                    key={`state-icon-terminal-canvas-anchor-${index}`}
                    className={`custom-device-terminal-anchor state-icon-terminal-anchor ${dragging ? "dragging" : ""}`}
                    transform={`translate(${formatSvgNumber(segment.to.x)} ${formatSvgNumber(segment.to.y)})`}
                    style={{ "--terminal-color": terminalColor(terminalType, colorPalette) } as CSSProperties}
                  >
                    <circle
                      r="7"
                      onPointerDown={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        const svg = event.currentTarget.ownerSVGElement;
                        if (!svg) {
                          return;
                        }
                        setStateIconTerminalDragIndex?.(index);
                        svg.setPointerCapture?.(event.pointerId);
                        updateStateIconTerminalAnchorFromDrawing(index, event as unknown as PointerEvent<SVGSVGElement>);
                      }}
                    >
                      <title>{`拖动调整端子${index + 1}位置`}</title>
                    </circle>
                    <text x="0" y="0">{index + 1}</text>
                  </g>
                );
              })}
            </g>
          </g>
        );
      }
      return (
        <g className="state-icon-terminal-base-layer">
          <rect
            x={stateIconTerminalFrame.x}
            y={stateIconTerminalFrame.y}
            width={stateIconTerminalFrame.width}
            height={stateIconTerminalFrame.height}
            rx="6"
            className="state-icon-drawing-icon-frame state-icon-drawing-inner-frame"
            fill="none"
            stroke="#f97316"
            strokeWidth={1.5}
            strokeDasharray="5 3"
            vectorEffect="non-scaling-stroke"
          />
          {renderStateIconTerminalDynamicGuideLayer(anchors)}
          <g className="state-icon-terminal-connector-layer">
            {anchors.map((anchor, index) => {
              const terminalType = stateIconTerminalAnchorType(index);
              const segment = stateIconTerminalConnectorSegment(anchor);
              return (
                <line
                  key={`state-icon-terminal-anchor-connector-${index}`}
                  className="custom-device-terminal-connector state-icon-terminal-connector"
                  x1={segment.from.x}
                  y1={segment.from.y}
                  x2={segment.to.x}
                  y2={segment.to.y}
                  stroke={terminalColor(terminalType, colorPalette)}
                  strokeWidth={2}
                  strokeLinecap="round"
                  vectorEffect="non-scaling-stroke"
                  style={{ "--terminal-color": terminalColor(terminalType, colorPalette) } as CSSProperties}
                />
              );
            })}
          </g>
          <g className="state-icon-terminal-anchor-layer">
            {anchors.map((anchor, index) => {
              const terminalType = stateIconTerminalAnchorType(index);
              const segment = stateIconTerminalConnectorSegment(anchor);
              const dragging = stateIconTerminalDragIndex === index;
              return (
                <g
                  key={`state-icon-terminal-anchor-${index}`}
                  className={`custom-device-terminal-anchor state-icon-terminal-anchor ${dragging ? "dragging" : ""}`}
                  transform={`translate(${formatSvgNumber(segment.to.x)} ${formatSvgNumber(segment.to.y)})`}
                  style={{ "--terminal-color": terminalColor(terminalType, colorPalette) } as CSSProperties}
                >
                  <circle
                    r="7"
                    onPointerDown={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      const svg = event.currentTarget.ownerSVGElement;
                      if (!svg) {
                        return;
                      }
                      setStateIconTerminalDragIndex?.(index);
                      svg.setPointerCapture?.(event.pointerId);
                      updateStateIconTerminalAnchorFromDrawing(index, event as unknown as PointerEvent<SVGSVGElement>);
                    }}
                  >
                    <title>{`拖动调整端子${index + 1}位置`}</title>
                  </circle>
                  <text x="0" y="0">{index + 1}</text>
                </g>
              );
            })}
          </g>
        </g>
      );
    };
    const stateIconImageVisibleFrameKey = (element: any) =>
      `${element.id}:${element.imageHref ?? ""}:${element.imageFit ?? "cover"}:${element.imageScale ?? 1}:${element.cropX ?? 0}:${element.cropY ?? 0}`;
    const updateStateIconImageVisibleFrame = (element: any, event: any) => {
      if (element?.kind !== "image" || !setStateIconDrawingImageVisibleFrames) {
        return;
      }
      const imageHref = String(element.imageHref ?? "");
      if (!imageHref) {
        return;
      }
      const key = stateIconImageVisibleFrameKey(element);
      const sourceImage = new Image();
      sourceImage.crossOrigin = "anonymous";
      sourceImage.onload = () => {
        const sourceWidth = sourceImage.naturalWidth || sourceImage.width;
        const sourceHeight = sourceImage.naturalHeight || sourceImage.height;
        if (!sourceWidth || !sourceHeight) {
          return;
        }
        const canvas = document.createElement("canvas");
        canvas.width = sourceWidth;
        canvas.height = sourceHeight;
        const context = canvas.getContext("2d", { willReadFrequently: true });
        if (!context) {
          return;
        }
        context.drawImage(sourceImage, 0, 0, sourceWidth, sourceHeight);
        const pixels = context.getImageData(0, 0, sourceWidth, sourceHeight).data;
        let left = sourceWidth;
        let right = -1;
        let top = sourceHeight;
        let bottom = -1;
        for (let y = 0; y < sourceHeight; y += 1) {
          for (let x = 0; x < sourceWidth; x += 1) {
            const alpha = pixels[(y * sourceWidth + x) * 4 + 3];
            if (alpha <= 8) {
              continue;
            }
            left = Math.min(left, x);
            right = Math.max(right, x);
            top = Math.min(top, y);
            bottom = Math.max(bottom, y);
          }
        }
        if (right < left || bottom < top) {
          return;
        }
        const elementWidth = Math.max(1, Number(element.width) || 1);
        const elementHeight = Math.max(1, Number(element.height) || 1);
        const renderWidth = elementWidth * Math.max(0.05, Number(element.imageScale) || 1);
        const renderHeight = elementHeight * Math.max(0.05, Number(element.imageScale) || 1);
        const imageScale = Math.max(renderWidth / sourceWidth, renderHeight / sourceHeight);
        const drawnWidth = sourceWidth * imageScale;
        const drawnHeight = sourceHeight * imageScale;
        const imageX = -elementWidth / 2 + (Number(element.cropX) || 0) + (renderWidth - drawnWidth) / 2;
        const imageY = -elementHeight / 2 + (Number(element.cropY) || 0) + (renderHeight - drawnHeight) / 2;
        const frame = {
          x: Math.max(-elementWidth / 2, imageX + left * imageScale),
          y: Math.max(-elementHeight / 2, imageY + top * imageScale),
          width: Math.min(elementWidth / 2, imageX + (right + 1) * imageScale) - Math.max(-elementWidth / 2, imageX + left * imageScale),
          height: Math.min(elementHeight / 2, imageY + (bottom + 1) * imageScale) - Math.max(-elementHeight / 2, imageY + top * imageScale),
          basisWidth: elementWidth,
          basisHeight: elementHeight
        };
        if (frame.width <= 0 || frame.height <= 0) {
          return;
        }
        setStateIconDrawingImageVisibleFrames((current: Record<string, any>) => {
          const previous = current[key];
          if (
            previous &&
            Math.abs(previous.x - frame.x) < 0.1 &&
            Math.abs(previous.y - frame.y) < 0.1 &&
            Math.abs(previous.width - frame.width) < 0.1 &&
            Math.abs(previous.height - frame.height) < 0.1 &&
            Math.abs((previous.basisWidth ?? elementWidth) - frame.basisWidth) < 0.1 &&
            Math.abs((previous.basisHeight ?? elementHeight) - frame.basisHeight) < 0.1
          ) {
            return current;
          }
          return { ...current, [key]: frame };
        });
      };
      sourceImage.src = event?.currentTarget?.href?.baseVal || imageHref;
    };
    const stateIconDrawingImageSelectionFrame = (element: any) => {
      if (element?.kind !== "image") {
        return null;
      }
      const frame = stateIconDrawingImageVisibleFrames?.[stateIconImageVisibleFrameKey(element)];
      if (!frame || frame.width <= 0 || frame.height <= 0) {
        return null;
      }
      const basisWidth = Math.max(1, Number(frame.basisWidth) || Number(element.width) || 1);
      const basisHeight = Math.max(1, Number(frame.basisHeight) || Number(element.height) || 1);
      const scaleX = Math.max(1, Number(element.width) || 1) / basisWidth;
      const scaleY = Math.max(1, Number(element.height) || 1) / basisHeight;
      const scaledFrame = {
        x: frame.x * scaleX,
        y: frame.y * scaleY,
        width: frame.width * scaleX,
        height: frame.height * scaleY
      };
      return {
        ...scaledFrame,
        halfWidth: scaledFrame.x + scaledFrame.width,
        halfHeight: scaledFrame.y + scaledFrame.height
      };
    };
    const stateIconSvgVisibleFrameKey = (element: any) =>
      `${element.id}:${element.svgSource ?? ""}:${element.strokeWidth}:${element.strokeColor ?? ""}:${element.strokeStyle ?? ""}`;
    const updateStateIconSvgVisibleFrame = (element: any, event: any) => {
      if (element?.kind !== "imported-svg" || !setStateIconDrawingSvgVisibleFrames) {
        return;
      }
      const measurement = stateIconDrawingElementPreviewImage(element);
      if (!measurement?.href) {
        return;
      }
      const key = stateIconSvgVisibleFrameKey(element);
      const sourceImage = new Image();
      sourceImage.onload = () => {
        const sourceWidth = sourceImage.naturalWidth || sourceImage.width;
        const sourceHeight = sourceImage.naturalHeight || sourceImage.height;
        if (!sourceWidth || !sourceHeight) {
          return;
        }
        const canvas = document.createElement("canvas");
        canvas.width = sourceWidth;
        canvas.height = sourceHeight;
        const context = canvas.getContext("2d", { willReadFrequently: true });
        if (!context) {
          return;
        }
        context.drawImage(sourceImage, 0, 0, sourceWidth, sourceHeight);
        const pixels = context.getImageData(0, 0, sourceWidth, sourceHeight).data;
        let left = sourceWidth;
        let right = -1;
        let top = sourceHeight;
        let bottom = -1;
        for (let y = 0; y < sourceHeight; y += 1) {
          for (let x = 0; x < sourceWidth; x += 1) {
            const alpha = pixels[(y * sourceWidth + x) * 4 + 3];
            if (alpha <= 8) {
              continue;
            }
            left = Math.min(left, x);
            right = Math.max(right, x);
            top = Math.min(top, y);
            bottom = Math.max(bottom, y);
          }
        }
        if (right < left || bottom < top) {
          return;
        }
        const elementWidth = Math.max(1, Number(element.width) || 1);
        const elementHeight = Math.max(1, Number(element.height) || 1);
        const paddingX = (-measurement.x) - elementWidth / 2;
        const paddingY = (-measurement.y) - elementHeight / 2;
        const scaleX = measurement.width / sourceWidth;
        const scaleY = measurement.height / sourceHeight;
        const frame = {
          x: left * scaleX - paddingX - elementWidth / 2,
          y: top * scaleY - paddingY - elementHeight / 2,
          width: (right - left + 1) * scaleX,
          height: (bottom - top + 1) * scaleY,
          basisWidth: elementWidth,
          basisHeight: elementHeight
        };
        if (frame.width <= 0 || frame.height <= 0) {
          return;
        }
        setStateIconDrawingSvgVisibleFrames((current: Record<string, any>) => {
          const previous = current[key];
          if (
            previous &&
            Math.abs(previous.x - frame.x) < 0.1 &&
            Math.abs(previous.y - frame.y) < 0.1 &&
            Math.abs(previous.width - frame.width) < 0.1 &&
            Math.abs(previous.height - frame.height) < 0.1 &&
            Math.abs((previous.basisWidth ?? elementWidth) - frame.basisWidth) < 0.1 &&
            Math.abs((previous.basisHeight ?? elementHeight) - frame.basisHeight) < 0.1
          ) {
            return current;
          }
          return { ...current, [key]: frame };
        });
      };
      sourceImage.src = event?.currentTarget?.href?.baseVal || measurement.href;
    };
    const stateIconDrawingSvgSelectionFrame = (element: any) => {
      if (element?.kind !== "imported-svg") {
        return null;
      }
      const frame = stateIconDrawingSvgVisibleFrames?.[stateIconSvgVisibleFrameKey(element)];
      if (!frame || frame.width <= 0 || frame.height <= 0) {
        return null;
      }
      const basisWidth = Math.max(1, Number(frame.basisWidth) || Number(element.width) || 1);
      const basisHeight = Math.max(1, Number(frame.basisHeight) || Number(element.height) || 1);
      const scaleX = Math.max(1, Number(element.width) || 1) / basisWidth;
      const scaleY = Math.max(1, Number(element.height) || 1) / basisHeight;
      const scaledFrame = {
        x: frame.x * scaleX,
        y: frame.y * scaleY,
        width: frame.width * scaleX,
        height: frame.height * scaleY
      };
      return {
        ...scaledFrame,
        halfWidth: scaledFrame.x + scaledFrame.width,
        halfHeight: scaledFrame.y + scaledFrame.height
      };
    };
    const stateIconDrawingTerminalPatch = (value: string) => {
      if (value === "") {
        return { terminalIndex: undefined };
      }
      const terminalIndex = Number.parseInt(value, 10);
      if (!Number.isInteger(terminalIndex) || terminalIndex < 0) {
        return { terminalIndex: undefined };
      }
      const option = stateIconDrawingTerminalOptions.find((item) => item.index === terminalIndex);
      const color = option?.color || "";
      return color
        ? { terminalIndex, strokeColor: color, textColor: color }
        : { terminalIndex };
    };
    const stateIconDrawingRowForDialog = (dialog: any) => {
      if (isDefaultStatePageId(dialog.target.rowId)) {
        return dialog.target.scope === "definition"
          ? defaultStateDraftRow(definitionStateDraftRows, definitionDefaultStateVisualDraft())
          : defaultStateDraftRow(customDeviceDraft.stateDefinitions, customDeviceDefaultStateVisualDraft());
      }
      return dialog.target.scope === "definition"
        ? definitionStateDraftRows.find((item) => item.id === dialog.target.rowId)
        : customDeviceDraft.stateDefinitions.find((item) => item.id === dialog.target.rowId);
    };
    const cancelStateIconDrawingCanvasDraft = () => {
      const active = Boolean(stateIconDrawingDialog?.pendingElementKind || stateIconDrawingDialog?.pendingStaticTemplate || stateIconDrawingDialog?.drawingDraft);
      if (!active) {
        return false;
      }
      setStateIconDrawingContextMenu(null);
      setStateIconDrawingDialog((current) => current ? {
        ...current,
        pendingElementKind: undefined,
        pendingStaticTemplate: undefined,
        drawingDraft: undefined,
        smartAlignmentGuides: []
      } : current);
      return true;
    };
    const handleStateIconDrawingCanvasPointerDown = (event: PointerEvent<SVGSVGElement>) => {
      if (event.button !== 0 || !stateIconDrawingDialog?.target) {
        return false;
      }
      const active = Boolean(stateIconDrawingDialog.pendingElementKind || stateIconDrawingDialog.pendingStaticTemplate || stateIconDrawingDialog.drawingDraft);
      if (!active) {
        return false;
      }
      (event.currentTarget.closest(".state-icon-drawing-inline") as HTMLElement | null)?.focus();
      const point = stateIconDrawingPointer(event);
      const snappedPoint = stateIconDrawingTerminalPointSnap(__appScope, clampStateIconDrawingPoint(point));
      setStateIconDrawingContextMenu(null);
      setStateIconDrawingDialog((current) => {
        if (!current) {
          return current;
        }
        if (current.drawingDraft) {
          if (current.drawingDraft.kind === "polyline") {
            const committedPoint = snappedPoint.point;
            const draftPoints = current.drawingDraft.points?.length
              ? current.drawingDraft.points
              : [current.drawingDraft.start];
            const nextPoints = appendDistinctStateIconDrawingPoint(draftPoints, committedPoint);
            const nextElement = stateIconDrawingPolylineElementFromPoints(current.drawingDraft.element, nextPoints);
            if (event.detail < 2) {
              return {
                ...current,
                drawingDraft: {
                  ...current.drawingDraft,
                  points: nextPoints,
                  current: committedPoint,
                  element: nextElement
                },
                smartAlignmentGuides: snappedPoint.guides
              };
            }
            if (nextPoints.length < 2) {
              return current;
            }
            return finishStateIconDrawingDraft({
              ...current,
              drawingDraft: {
                ...current.drawingDraft,
                points: nextPoints,
                current: committedPoint,
                element: nextElement
              },
              smartAlignmentGuides: snappedPoint.guides
            }, stateIconDrawingHistoryRef);
          }
          const element = stateIconDrawingElementFromPoints(current.drawingDraft.element, current.drawingDraft.start, snappedPoint.point);
          pushStateIconDrawingHistorySnapshot(stateIconDrawingHistoryRef, current.elements);
          return {
            ...current,
            elements: [...current.elements, element],
            selectedElementId: element.id,
            selectedElementIds: [element.id],
            pendingElementKind: undefined,
            pendingStaticTemplate: undefined,
            drawingDraft: undefined,
            smartAlignmentGuides: []
          };
        }
        if (!current.pendingElementKind && !current.pendingStaticTemplate) {
          return current;
        }
        const row = stateIconDrawingRowForDialog(current);
        const baseElement = current.pendingStaticTemplate
          ? createStateIconDrawingElementFromStaticTemplate(__appScope, current.pendingStaticTemplate, row)
          : createStateIconDrawingElement(current.pendingElementKind, row);
        const startPoint = snappedPoint.point;
        const element = baseElement.kind === "polyline"
          ? stateIconDrawingPolylineElementFromPoints(baseElement, [startPoint])
          : stateIconDrawingElementFromPoints(baseElement, startPoint, startPoint);
        return {
          ...current,
          selectedElementId: "",
          selectedElementIds: [],
          drawingDraft: {
            kind: baseElement.kind,
            start: startPoint,
            current: startPoint,
            points: baseElement.kind === "polyline" ? [startPoint] : undefined,
            element
          },
          smartAlignmentGuides: snappedPoint.guides
        };
      });
      return true;
    };
    const updateStateIconDrawingCanvasDraft = (event: PointerEvent<SVGSVGElement>) => {
      if (!stateIconDrawingDialog?.drawingDraft) {
        return false;
      }
      const point = stateIconDrawingPointer(event);
      setStateIconDrawingDialog((current) => {
        if (!current?.drawingDraft) {
          return current;
        }
        const currentPoint = stateIconDrawingTerminalPointSnap(__appScope, clampStateIconDrawingPoint(point));
        if (current.drawingDraft.kind === "polyline") {
          const draftPoints = current.drawingDraft.points?.length
            ? current.drawingDraft.points
            : [current.drawingDraft.start];
          const previewPoints = appendDistinctStateIconDrawingPoint(draftPoints, currentPoint.point);
          return {
            ...current,
            drawingDraft: {
              ...current.drawingDraft,
              current: currentPoint.point,
              element: stateIconDrawingPolylineElementFromPoints(current.drawingDraft.element, previewPoints)
            },
            smartAlignmentGuides: currentPoint.guides
          };
        }
        return {
          ...current,
          drawingDraft: {
            ...current.drawingDraft,
            current: currentPoint.point,
            element: stateIconDrawingElementFromPoints(current.drawingDraft.element, current.drawingDraft.start, currentPoint.point)
          },
          smartAlignmentGuides: currentPoint.guides
        };
      });
      return true;
    };
    const updateStateIconDrawingMarquee = (event: PointerEvent<SVGSVGElement>) => {
      if (!stateIconDrawingDialog?.marquee) {
        return false;
      }
      const point = clampStateIconDrawingPoint(stateIconDrawingPointer(event));
      setStateIconDrawingDialog((current) => current?.marquee ? {
        ...current,
        marquee: {
          ...current.marquee,
          current: point
        }
      } : current);
      return true;
    };
    const finishStateIconDrawingMarquee = (event: PointerEvent<SVGSVGElement>) => {
      if (!stateIconDrawingDialog?.marquee) {
        return false;
      }
      const point = clampStateIconDrawingPoint(stateIconDrawingPointer(event));
      setStateIconDrawingDialog((current) => {
        if (!current?.marquee) {
          return current;
        }
        const rect = stateIconDrawingRectFromPoints(current.marquee.start, point);
        const selectedByRect = stateIconDrawingElementIdsInRect(current.elements, rect);
        const currentSelection = current.selectedElementIds.length > 0 ? current.selectedElementIds : [current.selectedElementId].filter(Boolean);
        const selectedElementIds = current.marquee.append
          ? Array.from(new Set([...currentSelection, ...selectedByRect]))
          : selectedByRect;
        return {
          ...current,
          selectedElementId: selectedElementIds[selectedElementIds.length - 1] ?? "",
          selectedElementIds,
          marquee: undefined
        };
      });
      event.currentTarget.releasePointerCapture?.(event.pointerId);
      return true;
    };
    const cancelStateIconDrawingMarquee = (event: PointerEvent<SVGSVGElement>) => {
      if (!stateIconDrawingDialog?.marquee) {
        return false;
      }
      setStateIconDrawingDialog((current) => current?.marquee ? { ...current, marquee: undefined } : current);
      event.currentTarget.releasePointerCapture?.(event.pointerId);
      return true;
    };
    const setStateIconFramePatch = (patch: Record<string, any>) => {
      setStateIconDrawingDialog((current) =>
        current
          ? {
              ...current,
              frame: {
                ...STATE_ICON_DRAFT_FRAME,
                ...(current.frame ?? {}),
                ...patch
              }
            }
          : current
      );
    };
    const copySelectedStateIconElements = () => {
      if (!stateIconDrawingDialog) {
        return;
      }
      const selectedSet = new Set(stateIconDrawingSelectedIds(stateIconDrawingDialog));
      stateIconDrawingClipboardRef.current = stateIconDrawingDialog.elements.filter((element) => selectedSet.has(element.id)).map((element) => ({ ...element }));
      setStateIconDrawingContextMenu(null);
    };
    const cutSelectedStateIconElements = () => {
      setStateIconDrawingDialog((current) => cutStateIconDrawingSelection(current, stateIconDrawingClipboardRef, stateIconDrawingHistoryRef));
      setStateIconDrawingContextMenu(null);
    };
    const pasteStateIconElements = (point?: Point) => {
      setStateIconDrawingDialog((current) => {
        const clipboard = stateIconDrawingClipboardRef.current ?? [];
        if (!current || clipboard.length === 0) {
          return current;
        }
        pushStateIconDrawingHistorySnapshot(stateIconDrawingHistoryRef, current.elements);
        const sourceBounds = stateIconDrawingSelectionBounds(clipboard);
        const offset = point && sourceBounds
          ? { x: point.x - sourceBounds.centerX, y: point.y - sourceBounds.centerY }
          : { x: 12, y: 12 };
        const pasted = cloneStateIconDrawingElements(clipboard, stateIconDrawingElementId, offset);
        return {
          ...current,
          elements: [...current.elements, ...pasted],
          selectedElementId: pasted[pasted.length - 1]?.id ?? "",
          selectedElementIds: pasted.map((element) => element.id)
        };
      });
      setStateIconDrawingContextMenu(null);
    };
    const updateSelectedStateIconElements = (updater: (element: StateIconDrawingElement, selected: StateIconDrawingElement[]) => StateIconDrawingElement) => {
      setStateIconDrawingDialog((current) => {
        if (!current) {
          return current;
        }
        const selectedIds = stateIconDrawingSelectedIds(current);
        if (selectedIds.length === 0) {
          return current;
        }
        const selectedSet = new Set(selectedIds);
        const selected = current.elements.filter((element) => selectedSet.has(element.id));
        pushStateIconDrawingHistorySnapshot(stateIconDrawingHistoryRef, current.elements);
        return {
          ...current,
          elements: current.elements.map((element) => selectedSet.has(element.id) ? updater(element, selected) : element)
        };
      });
      setStateIconDrawingContextMenu(null);
    };
    const reorderSelectedStateIconElements = (mode: "front" | "back" | "forward" | "backward") => {
      setStateIconDrawingDialog((current) => {
        if (!current) {
          return current;
        }
        const selectedIds = stateIconDrawingSelectedIds(current);
        if (selectedIds.length === 0) {
          return current;
        }
        const selectedSet = new Set(selectedIds);
        const selected = current.elements.filter((element) => selectedSet.has(element.id));
        const rest = current.elements.filter((element) => !selectedSet.has(element.id));
        pushStateIconDrawingHistorySnapshot(stateIconDrawingHistoryRef, current.elements);
        if (mode === "front") {
          return { ...current, elements: [...rest, ...selected] };
        }
        if (mode === "back") {
          return { ...current, elements: [...selected, ...rest] };
        }
        const next = [...current.elements];
        if (mode === "forward") {
          for (let index = next.length - 2; index >= 0; index -= 1) {
            if (selectedSet.has(next[index].id) && !selectedSet.has(next[index + 1].id)) {
              [next[index], next[index + 1]] = [next[index + 1], next[index]];
            }
          }
        } else {
          for (let index = 1; index < next.length; index += 1) {
            if (selectedSet.has(next[index].id) && !selectedSet.has(next[index - 1].id)) {
              [next[index], next[index - 1]] = [next[index - 1], next[index]];
            }
          }
        }
        return { ...current, elements: next };
      });
      setStateIconDrawingContextMenu(null);
    };
    const alignSelectedStateIconElements = (mode: "left" | "center" | "right" | "top" | "middle" | "bottom" | "same-width" | "same-height" | "same-size") => {
      updateSelectedStateIconElements((element, selected) => {
        const bounds = stateIconDrawingSelectionBounds(selected);
        const reference = selected[0];
        if (!bounds || !reference) {
          return element;
        }
        const itemBounds = stateIconDrawingElementBounds(element);
        if (mode === "left") return { ...element, x: bounds.left + itemBounds.width / 2 };
        if (mode === "center") return { ...element, x: bounds.centerX };
        if (mode === "right") return { ...element, x: bounds.right - itemBounds.width / 2 };
        if (mode === "top") return { ...element, y: bounds.top + itemBounds.height / 2 };
        if (mode === "middle") return { ...element, y: bounds.centerY };
        if (mode === "bottom") return { ...element, y: bounds.bottom - itemBounds.height / 2 };
        if (mode === "same-width") return { ...element, width: reference.width };
        if (mode === "same-height") return { ...element, height: reference.height };
        return { ...element, width: reference.width, height: reference.height };
      });
    };
    const distributeSelectedStateIconElements = (axis: "x" | "y") => {
      setStateIconDrawingDialog((current) => {
        if (!current) {
          return current;
        }
        const selectedIds = stateIconDrawingSelectedIds(current);
        if (selectedIds.length < 3) {
          return current;
        }
        const selectedSet = new Set(selectedIds);
        const selected = current.elements.filter((element) => selectedSet.has(element.id)).sort((a, b) => axis === "x" ? a.x - b.x : a.y - b.y);
        const first = selected[0];
        const last = selected[selected.length - 1];
        const step = ((axis === "x" ? last.x - first.x : last.y - first.y) || 0) / Math.max(1, selected.length - 1);
        const nextById = new Map(selected.map((element, index) => [
          element.id,
          axis === "x" ? { ...element, x: first.x + step * index } : { ...element, y: first.y + step * index }
        ]));
        pushStateIconDrawingHistorySnapshot(stateIconDrawingHistoryRef, current.elements);
        return {
          ...current,
          elements: current.elements.map((element) => nextById.get(element.id) ?? element)
        };
      });
      setStateIconDrawingContextMenu(null);
    };
    const mirrorSelectedStateIconElements = (axis: "x" | "y") => {
      updateSelectedStateIconElements((element, selected) => {
        const bounds = stateIconDrawingSelectionBounds(selected);
        if (!bounds) {
          return element;
        }
        return axis === "x"
          ? { ...element, x: bounds.centerX - (element.x - bounds.centerX), rotation: -element.rotation }
          : { ...element, y: bounds.centerY - (element.y - bounds.centerY), rotation: -element.rotation };
      });
    };
    const duplicateStateIconStatePage = (rowId: string) => {
      const source = isDefaultStatePageId(rowId)
        ? defaultRow
        : rows.find((row) => row.id === rowId) ?? null;
      if (!source) {
        return;
      }
      const nextIndex = nextNonDefaultStateIndex(rows);
      const nextRow = {
        ...createStateDraftRowFromDefaultVisual(source, {
          value: String(nextIndex),
          name: `状态${nextIndex}`
        }),
        id: stateDraftRowId()
      };
      if (handlers.drawingScope === "definition") {
        setDefinitionStateDraftRows((current) => appendNonDefaultStateDraftRow(current, defaultVisual, nextRow));
      } else {
        setCustomDeviceDraft((current) => ({
          ...current,
          stateDefinitions: appendNonDefaultStateDraftRow(current.stateDefinitions, defaultVisual, nextRow),
          error: ""
        }));
      }
      setActiveRowId(nextRow.id);
      setStateIconDrawingContextMenu(null);
    };
    const renderStateIconTabs = () => (
      <div className="device-state-tabs state-icon-drawing-state-tabs" role="tablist" aria-label="状态分页">
        {!hideDefaultPage && (
          <button
            type="button"
            role="tab"
            aria-selected={isDefaultStatePage}
            className={isDefaultStatePage ? "active" : ""}
            onClick={() => setActiveRowId(DEFAULT_STATE_PAGE_ID)}
            onContextMenu={(event) => {
              event.preventDefault();
              setStateIconDrawingContextMenu({ x: event.clientX, y: event.clientY, kind: "state", rowId: DEFAULT_STATE_PAGE_ID });
            }}
          >
            默认状态
          </button>
        )}
        {displayRows.map((row, index) => {
          const active = activeRow?.id === row.id;
          return (
            <button
              key={row.id}
              type="button"
              role="tab"
              aria-selected={active}
              className={active ? "active" : ""}
              onClick={() => setActiveRowId(row.id)}
              onContextMenu={(event) => {
                event.preventDefault();
                setStateIconDrawingContextMenu({ x: event.clientX, y: event.clientY, kind: "state", rowId: row.id });
              }}
            >
              {row.name.trim() || `状态${index + 1}`}
            </button>
          );
        })}
        <button type="button" className="device-state-add-tab state-icon-small-icon-button" onClick={handlers.add} aria-label="新增状态" title="新增状态">+</button>
      </div>
    );
    const renderStateIconDrawingContextMenu = () => {
      if (!stateIconDrawingContextMenu || !drawingReady) {
        return null;
      }
      const selectedCount = stateIconDrawingSelectedIds(stateIconDrawingDialog).length;
      const clipboardReady = (stateIconDrawingClipboardRef.current ?? []).length > 0;
      const rowIsDefault = stateIconDrawingContextMenu.kind === "state" && isDefaultStatePageId(stateIconDrawingContextMenu.rowId ?? "");
      const menuButton = (label: string, onClick: () => void, disabled = false) => (
        <button type="button" disabled={disabled} onClick={onClick}>{label}</button>
      );
      const menuSubmenu = (label: string, children: React.ReactNode, disabled = false) => (
        <div className={`state-icon-context-submenu ${disabled ? "disabled" : ""}`}>
          <button type="button" className="state-icon-context-submenu-trigger" disabled={disabled} aria-haspopup="menu" aria-expanded="false">
            <span>{label}</span>
            <span className="state-icon-context-submenu-arrow" aria-hidden="true">&gt;</span>
          </button>
          {!disabled && (
            <div className="state-icon-context-submenu-panel" role="menu">
              {children}
            </div>
          )}
        </div>
      );
      return (
        <div
          className="state-icon-context-menu"
          style={{ left: stateIconDrawingContextMenu.x, top: stateIconDrawingContextMenu.y }}
          onPointerDown={(event) => event.stopPropagation()}
          onContextMenu={(event) => event.preventDefault()}
        >
          {stateIconDrawingContextMenu.kind === "state" ? (
            <>
              {menuButton("复制到新状态", () => duplicateStateIconStatePage(stateIconDrawingContextMenu.rowId ?? selectedStateRowId))}
              {menuButton("删除状态", () => {
                const rowId = stateIconDrawingContextMenu.rowId ?? "";
                if (!isDefaultStatePageId(rowId)) {
                  handlers.remove(rowId);
                  setStateIconDrawingContextMenu(null);
                }
              }, rowIsDefault)}
            </>
          ) : (
            <>
              {menuButton("复制", copySelectedStateIconElements, selectedCount === 0)}
              {menuButton("剪切", cutSelectedStateIconElements, selectedCount === 0)}
              {menuButton("粘贴", () => pasteStateIconElements(stateIconDrawingContextMenu.pastePoint), !clipboardReady)}
              {menuButton("删除", deleteSelectedStateIconDrawingElements, selectedCount === 0)}
              {menuSubmenu("层级操作", (
                <>
                  {menuButton("置顶", () => reorderSelectedStateIconElements("front"))}
                  {menuButton("上移", () => reorderSelectedStateIconElements("forward"))}
                  {menuButton("下移", () => reorderSelectedStateIconElements("backward"))}
                  {menuButton("置底", () => reorderSelectedStateIconElements("back"))}
                </>
              ), selectedCount === 0)}
              {menuSubmenu("对齐操作", (
                <>
                  {menuButton("左对齐", () => alignSelectedStateIconElements("left"))}
                  {menuButton("水平居中", () => alignSelectedStateIconElements("center"))}
                  {menuButton("右对齐", () => alignSelectedStateIconElements("right"))}
                  {menuButton("上对齐", () => alignSelectedStateIconElements("top"))}
                  {menuButton("垂直居中", () => alignSelectedStateIconElements("middle"))}
                  {menuButton("下对齐", () => alignSelectedStateIconElements("bottom"))}
                </>
              ), selectedCount < 2)}
              {menuSubmenu("排列操作", (
                <>
                  {menuButton("水平等距", () => distributeSelectedStateIconElements("x"), selectedCount < 3)}
                  {menuButton("垂直等距", () => distributeSelectedStateIconElements("y"), selectedCount < 3)}
                  {menuButton("同宽", () => alignSelectedStateIconElements("same-width"))}
                  {menuButton("同高", () => alignSelectedStateIconElements("same-height"))}
                  {menuButton("同宽高", () => alignSelectedStateIconElements("same-size"))}
                </>
              ), selectedCount < 2)}
              {menuSubmenu("镜像操作", (
                <>
                  {menuButton("水平镜像", () => mirrorSelectedStateIconElements("x"))}
                  {menuButton("垂直镜像", () => mirrorSelectedStateIconElements("y"))}
                </>
              ), selectedCount === 0)}
            </>
          )}
        </div>
      );
    };
    const renderStateIconDrawingInline = () => {
      if (!activeDrawingTarget) {
        return null;
      }
      if (!drawingReady) {
        return (
          <div className="state-icon-drawing-inline pending" aria-label="图案编辑区">
            <span>图案编辑区准备中</span>
          </div>
        );
      }
      const selectedIds = stateIconDrawingDialog.selectedElementIds.length > 0
        ? stateIconDrawingDialog.selectedElementIds
        : [stateIconDrawingDialog.selectedElementId].filter(Boolean);
      const sidePanelTab = stateIconDrawingDialog.sidePanelTab === "selected" ? "selected" : "global";
      const frame = { ...STATE_ICON_DRAFT_FRAME, ...(stateIconDrawingDialog.frame ?? {}) };
      const frameBackgroundImageAssetId = String(frame.backgroundImageAssetId ?? "").trim();
      const frameBackgroundImage = String(
        (frameBackgroundImageAssetId && imageAssets?.[frameBackgroundImageAssetId]) ||
        frame.backgroundImage ||
        ""
      ).trim();
      const frameBackgroundImageFit = normalizeImageFitMode(frame.backgroundImageFit);
      const frameBackgroundClipId = "state-icon-drawing-frame-background-clip";
      const frameBackgroundPatternId = "state-icon-drawing-frame-background-pattern";
      const frameDashArray = stateIconDrawingFrameDashArray(frame);
      const frameRect = stateIconDrawingFrameRect
        ? stateIconDrawingFrameRect(stateIconHasTerminals)
        : stateIconHasTerminals
          ? { x: 30, y: 20, width: 180, height: 120, rx: 8 }
          : { x: 0, y: 0, width: 240, height: 160, rx: 10 };
      const previewElements = stateIconDrawingDialog.drawingDraft
        ? [...stateIconDrawingDialog.elements, stateIconDrawingDialog.drawingDraft.element]
        : stateIconDrawingDialog.elements;
      const directPreviewElements = stateIconDrawingPreviewNeedsDirectElementRender(previewElements);
      const stateIconDrawingSmartGuides = stateIconDrawingDialog.smartAlignmentGuides ?? [];
      const stateIconDrawingMarqueeRect = stateIconDrawingDialog.marquee
        ? stateIconDrawingRectFromPoints(stateIconDrawingDialog.marquee.start, stateIconDrawingDialog.marquee.current)
        : null;
      return (
        <div
          className={`state-icon-drawing-inline ${stateIconDrawingDialog.pendingElementKind || stateIconDrawingDialog.pendingStaticTemplate ? "tool-active" : ""} ${stateIconDrawingDialog.drawingDraft ? "drawing-active" : ""}`}
          onKeyDown={stateIconDrawingKeyDown}
          tabIndex={-1}
          aria-label="图案编辑区"
          onPointerDown={() => setStateIconDrawingContextMenu(null)}
        >
          <div className="state-icon-drawing-layout">
            <div className="state-icon-drawing-main">
              {renderStateIconTabs()}
              <div className="state-icon-drawing-canvas">
                <svg
                  ref={stateIconDrawingSvgRef}
                  viewBox="0 0 240 160"
                  role="img"
                  aria-label="图案绘制预览"
                  onPointerDownCapture={(event) => {
                    if (handleStateIconDrawingCanvasPointerDown(event)) {
                      event.preventDefault();
                      event.stopPropagation();
                    }
                  }}
                  onPointerMove={(event) => {
                    if (stateIconTerminalDragIndex !== null && stateIconTerminalDragIndex !== undefined) {
                      updateStateIconTerminalAnchorFromDrawing(stateIconTerminalDragIndex, event);
                      event.preventDefault();
                      return;
                    }
                    if (updateStateIconDrawingCanvasDraft(event)) {
                      event.preventDefault();
                      return;
                    }
                    if (updateStateIconDrawingMarquee(event)) {
                      event.preventDefault();
                      return;
                    }
                    dragStateIconDrawingSelection(event);
                  }}
                  onDoubleClick={(event) => {
                    if (!stateIconDrawingDialog.drawingDraft) {
                      return;
                    }
                    event.preventDefault();
                    event.stopPropagation();
                    setStateIconDrawingContextMenu(null);
                    setStateIconDrawingDialog((current) => finishStateIconDrawingDraft(current, stateIconDrawingHistoryRef));
                  }}
                  onPointerUp={(event) => {
                    if (finishStateIconTerminalDrag(event)) {
                      event.preventDefault();
                      return;
                    }
                    if (!stateIconDrawingDialog.drawingDraft) {
                      if (finishStateIconDrawingMarquee(event)) {
                        event.preventDefault();
                        return;
                      }
                      stopStateIconDrawingDrag(event);
                    }
                  }}
                  onPointerCancel={(event) => {
                    if (finishStateIconTerminalDrag(event)) {
                      event.preventDefault();
                      return;
                    }
                    if (!stateIconDrawingDialog.drawingDraft) {
                      if (cancelStateIconDrawingMarquee(event)) {
                        event.preventDefault();
                        return;
                      }
                      stopStateIconDrawingDrag(event);
                    }
                  }}
                  onContextMenuCapture={(event) => {
                    if (stateIconDrawingDialog.pendingElementKind || stateIconDrawingDialog.pendingStaticTemplate || stateIconDrawingDialog.drawingDraft) {
                      event.preventDefault();
                      event.stopPropagation();
                      cancelStateIconDrawingCanvasDraft();
                    }
                  }}
                  onContextMenu={(event) => {
                    event.preventDefault();
                    if (cancelStateIconDrawingCanvasDraft()) {
                      event.stopPropagation();
                      return;
                    }
                    const point = stateIconDrawingPointer(event);
                    setStateIconDrawingContextMenu({ x: event.clientX, y: event.clientY, kind: "canvas", pastePoint: point });
                  }}
                  onPointerDown={(event) => {
                    if (stateIconDrawingDialog.pendingElementKind || stateIconDrawingDialog.pendingStaticTemplate || stateIconDrawingDialog.drawingDraft) {
                      return;
                    }
                    if (event.button !== 0) {
                      return;
                    }
                    (event.currentTarget.closest(".state-icon-drawing-inline") as HTMLElement | null)?.focus();
                    const point = clampStateIconDrawingPoint(stateIconDrawingPointer(event));
                    const append = event.shiftKey || event.ctrlKey || event.metaKey;
                    setStateIconDrawingDialog((current) => current ? {
                      ...current,
                      marquee: {
                        start: point,
                        current: point,
                        append
                      }
                    } : current);
                    event.currentTarget.setPointerCapture?.(event.pointerId);
                  }}
                >
                  <rect
                    x={formatSvgNumber(frameRect.x)}
                    y={formatSvgNumber(frameRect.y)}
                    width={formatSvgNumber(frameRect.width)}
                    height={formatSvgNumber(frameRect.height)}
                    rx={formatSvgNumber(frameRect.rx)}
                    className="state-icon-drawing-canvas-bg"
                    fill={frame.fillColor}
                  />
                  {frameBackgroundImage && (
                    <>
                      <defs>
                        <clipPath id={frameBackgroundClipId}>
                          <rect
                            x={formatSvgNumber(frameRect.x)}
                            y={formatSvgNumber(frameRect.y)}
                            width={formatSvgNumber(frameRect.width)}
                            height={formatSvgNumber(frameRect.height)}
                            rx={formatSvgNumber(frameRect.rx)}
                          />
                        </clipPath>
                        {frameBackgroundImageFit === "tile" && (
                          <pattern id={frameBackgroundPatternId} x={formatSvgNumber(frameRect.x)} y={formatSvgNumber(frameRect.y)} width={Math.min(frameRect.width, 96)} height={Math.min(frameRect.height, 96)} patternUnits="userSpaceOnUse">
                            <image href={frameBackgroundImage} x="0" y="0" width={Math.min(frameRect.width, 96)} height={Math.min(frameRect.height, 96)} preserveAspectRatio={imageFitPreserveAspectRatio("fixed")} />
                          </pattern>
                        )}
                      </defs>
                      {frameBackgroundImageFit === "tile" ? (
                        <rect
                          x={formatSvgNumber(frameRect.x)}
                          y={formatSvgNumber(frameRect.y)}
                          width={formatSvgNumber(frameRect.width)}
                          height={formatSvgNumber(frameRect.height)}
                          fill={`url(#${frameBackgroundPatternId})`}
                          clipPath={`url(#${frameBackgroundClipId})`}
                          pointerEvents="none"
                        />
                      ) : (
                        <image
                          href={frameBackgroundImage}
                          x={formatSvgNumber(frameRect.x)}
                          y={formatSvgNumber(frameRect.y)}
                          width={formatSvgNumber(frameRect.width)}
                          height={formatSvgNumber(frameRect.height)}
                          preserveAspectRatio={imageFitPreserveAspectRatio(frameBackgroundImageFit)}
                          clipPath={`url(#${frameBackgroundClipId})`}
                          pointerEvents="none"
                        />
                      )}
                    </>
                  )}
                  {renderStateIconOuterFrameLayer()}
                  {renderStateIconTerminalBaseLayer()}
                  <rect
                    x={formatSvgNumber(frameRect.x)}
                    y={formatSvgNumber(frameRect.y)}
                    width={formatSvgNumber(frameRect.width)}
                    height={formatSvgNumber(frameRect.height)}
                    rx={formatSvgNumber(frameRect.rx)}
                    className="state-icon-drawing-operation-frame"
                    fill="none"
                    stroke={frame.strokeColor}
                    strokeWidth={Math.max(0, Number(frame.strokeWidth) || 0)}
                    strokeDasharray={frameDashArray}
                    vectorEffect="non-scaling-stroke"
                    pointerEvents="none"
                  />
                  {directPreviewElements ? previewElements.map((element, index) => (
                    <g
                      key={`preview-${element.id}-${index}`}
                      className="state-icon-drawing-direct-preview"
                      transform={`translate(${formatSvgNumber(element.x)} ${formatSvgNumber(element.y)}) rotate(${formatSvgNumber(element.rotation)})`}
                    >
                      {stateIconDrawingElementPreviewNode(element, { onImageLoad: updateStateIconImageVisibleFrame })}
                    </g>
                  )) : (
                    <image
                      href={stateIconDrawingToImage(previewElements)}
                      x="0"
                      y="0"
                      width="240"
                      height="160"
                      preserveAspectRatio="xMidYMid meet"
                      className="state-icon-drawing-composite-preview"
                    />
                  )}
                  {previewElements.map((element) => {
                    if (element.kind !== "imported-svg") {
                      return null;
                    }
                    const measurement = stateIconDrawingElementPreviewImage(element);
                    return (
                      <image
                        key={`svg-measure-${element.id}`}
                        href={measurement.href}
                        x="-10000"
                        y="-10000"
                        width="1"
                        height="1"
                        opacity="0"
                        pointerEvents="none"
                        aria-hidden="true"
                        onLoad={(event) => updateStateIconSvgVisibleFrame(element, event)}
                      />
                    );
                  })}
                  {stateIconDrawingSmartGuides.map((guide) => (
                    <line
                      key={guide.id}
                      className={`smart-alignment-guide smart-alignment-guide-${guide.orientation} state-icon-drawing-smart-guide`}
                      x1={guide.orientation === "vertical" ? guide.position : guide.start}
                      y1={guide.orientation === "vertical" ? guide.start : guide.position}
                      x2={guide.orientation === "vertical" ? guide.position : guide.end}
                      y2={guide.orientation === "vertical" ? guide.end : guide.position}
                      vectorEffect="non-scaling-stroke"
                    />
                  ))}
                  {stateIconDrawingMarqueeRect && (
                    <rect
                      className="marquee-box state-icon-drawing-marquee"
                      x={stateIconDrawingMarqueeRect.left}
                      y={stateIconDrawingMarqueeRect.top}
                      width={stateIconDrawingMarqueeRect.right - stateIconDrawingMarqueeRect.left}
                      height={stateIconDrawingMarqueeRect.bottom - stateIconDrawingMarqueeRect.top}
                      vectorEffect="non-scaling-stroke"
                    />
                  )}
                  {stateIconDrawingDialog.elements.map((element) => {
                    const selected = selectedIds.includes(element.id);
                    const halfWidth = Math.max(1, element.width) / 2;
                    const halfHeight = Math.max(1, element.height) / 2;
                    const selectionFrame = stateIconDrawingImageSelectionFrame(element) ?? stateIconDrawingSvgSelectionFrame(element) ?? stateIconDrawingImportedSvgSelectionFrame(element) ?? {
                      x: -halfWidth,
                      y: -halfHeight,
                      width: Math.max(1, element.width),
                      height: Math.max(1, element.height),
                      halfWidth,
                      halfHeight
                    };
                    const hitboxFrame = element.kind === "image" || element.kind === "imported-svg"
                      ? selectionFrame
                      : {
                          x: -halfWidth,
                          y: -halfHeight,
                          width: Math.max(1, element.width),
                          height: Math.max(1, element.height)
                        };
                    return (
                      <g
                        key={element.id}
                        className={`state-icon-drawing-element ${selected ? "selected" : ""}`}
                        transform={`translate(${formatSvgNumber(element.x)} ${formatSvgNumber(element.y)}) rotate(${formatSvgNumber(element.rotation)})`}
                        onPointerDown={(event) => startStateIconDrawingDrag(event, element.id, "move")}
                        onContextMenu={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          setStateIconDrawingContextMenu({ x: event.clientX, y: event.clientY, kind: "element", elementId: element.id });
                        }}
                      >
                        <rect x={formatSvgNumber(hitboxFrame.x)} y={formatSvgNumber(hitboxFrame.y)} width={formatSvgNumber(hitboxFrame.width)} height={formatSvgNumber(hitboxFrame.height)} className="state-icon-drawing-hitbox" />
                        {selected && (
                          <>
                            <rect x={formatSvgNumber(selectionFrame.x)} y={formatSvgNumber(selectionFrame.y)} width={formatSvgNumber(selectionFrame.width)} height={formatSvgNumber(selectionFrame.height)} className="state-icon-drawing-selection-box" />
                            <circle cx={formatSvgNumber(selectionFrame.halfWidth)} cy={formatSvgNumber(selectionFrame.halfHeight)} r="5" className="state-icon-drawing-resize-handle" onPointerDown={(event) => startStateIconDrawingDrag(event, element.id, "resize")} />
                            <line x1="0" y1={formatSvgNumber(-selectionFrame.halfHeight)} x2="0" y2={formatSvgNumber(-selectionFrame.halfHeight - 16)} className="state-icon-drawing-rotate-stem" />
                            <circle cx="0" cy={formatSvgNumber(-selectionFrame.halfHeight - 20)} r="5" className="state-icon-drawing-rotate-handle" onPointerDown={(event) => startStateIconDrawingDrag(event, element.id, "rotate")} />
                          </>
                        )}
                      </g>
                    );
                  })}
                </svg>
              </div>
            </div>
            <div className="state-icon-drawing-side">
              <div className="state-icon-drawing-side-tabs" role="tablist" aria-label="图案属性页面">
                <button
                  type="button"
                  role="tab"
                  aria-selected={sidePanelTab === "global"}
                  className={sidePanelTab === "global" ? "active" : ""}
                  onClick={() => setStateIconDrawingDialog((current) => current ? { ...current, sidePanelTab: "global" } : current)}
                >
                  全局信息
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={sidePanelTab === "selected"}
                  className={sidePanelTab === "selected" ? "active" : ""}
                  onClick={() => setStateIconDrawingDialog((current) => current ? { ...current, sidePanelTab: "selected" } : current)}
                >
                  选中图元
                </button>
              </div>
              {sidePanelTab === "global" && (
                <div className="state-icon-drawing-state-info state-icon-drawing-tab-panel" role="tabpanel">
                  <strong>全局信息</strong>
                  <table className="state-icon-drawing-property-table">
                    <tbody>
                      {!isDefaultStatePage && selectedStateRow && (
                        <>
                          <tr>
                            <th>状态值</th>
                            <td><BufferedTextInput value={selectedStateRow.value} onCommit={(value) => handlers.update(selectedStateRowId, { value })} /></td>
                          </tr>
                          <tr>
                            <th>状态名称</th>
                            <td><BufferedTextInput value={selectedStateRow.name} onCommit={(value) => handlers.update(selectedStateRowId, { name: value })} /></td>
                          </tr>
                          <tr>
                            <th>图片显示方式</th>
                            <td>
                              <select
                                value={normalizeImageFitMode(selectedStateRow.imageFit ?? selectedStateRow.backgroundImageFit)}
                                onChange={(event) => handlers.update(selectedStateRowId, {
                                  imageFit: event.target.value,
                                  backgroundImageFit: event.target.value
                                })}
                              >
                                {IMAGE_FIT_MODE_OPTIONS.map((option) => (
                                  <option key={option.value} value={option.value}>{option.label}</option>
                                ))}
                              </select>
                            </td>
                          </tr>
                        </>
                      )}
                      <tr>
                        <th>边框线型</th>
                        <td>
                          <select value={frame.strokeStyle} onChange={(event) => setStateIconFramePatch({ strokeStyle: event.target.value })}>
                            <option value="solid">实线</option>
                            <option value="dashed">虚线</option>
                            <option value="dotted">点线</option>
                          </select>
                        </td>
                      </tr>
                      <tr>
                        <th>边框线宽</th>
                        <td>
                          <BufferedTextInput
                            type="number"
                            min="0"
                            step={1}
                            inputMode="numeric"
                            value={normalizeStateIconDrawingStrokeWidth(frame.strokeWidth)}
                            onKeyDown={(event) => {
                              if ([".", "-", "+", "e", "E"].includes(event.key)) {
                                event.preventDefault();
                              }
                            }}
                            onCommit={(nextValue) => setStateIconFramePatch({ strokeWidth: normalizeStateIconDrawingStrokeWidth(nextValue, frame.strokeWidth) })}
                          />
                        </td>
                      </tr>
                      <tr>
                        <th>边框线色</th>
                        <td>
                          <div className="state-icon-drawing-color-field">
                            <DeferredColorInput value={frame.strokeColor} fallback="#94a3b8" onCommit={(value) => setStateIconFramePatch({ strokeColor: value })} />
                          </div>
                        </td>
                      </tr>
                      <tr>
                        <th>背景</th>
                        <td>
                          <div className="state-icon-drawing-color-field">
                            <DeferredColorInput value={frame.fillColor} fallback="#ffffff" onCommit={(value) => setStateIconFramePatch({ fillColor: value })} />
                          </div>
                        </td>
                      </tr>
                      <tr>
                        <th>背景图</th>
                        <td>
                          <div className="state-icon-drawing-background-image-field">
                            <button
                              type="button"
                              onClick={() => {
                                setImagePickerSourceFilter("");
                                setImagePickerCategoryFilter("");
                                setImagePickerSearchQuery("");
                                setImageTarget({ kind: "stateIconFrameBackground" });
                              }}
                            >
                              选择
                            </button>
                            <button type="button" disabled={!frameBackgroundImage} onClick={() => setStateIconFramePatch({ backgroundImage: "", backgroundImageAssetId: "", backgroundImageFit: "cover" })}>清空</button>
                            <span>{frameBackgroundImageAssetId ? "后台已设置" : frameBackgroundImage ? "已设置" : "未设置"}</span>
                          </div>
                        </td>
                      </tr>
                      <tr>
                        <th>显示方式</th>
                        <td>
                          <select value={normalizeImageFitMode(frame.backgroundImageFit)} onChange={(event) => setStateIconFramePatch({ backgroundImageFit: event.target.value })}>
                            {IMAGE_FIT_MODE_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
              {sidePanelTab === "selected" && (
                <div className="state-icon-drawing-properties state-icon-drawing-tab-panel" role="tabpanel">
                {(() => {
                  const selected = stateIconDrawingDialog.elements.find((element) => element.id === stateIconDrawingDialog.selectedElementId) ?? null;
                  if (!selected) {
                    return <p>选择一个图案后调整属性。</p>;
                  }
                  const visibleStrokeColor = visibleStateIconColor("#2563eb", selected.strokeColor);
                  const visibleTextColor = visibleStateIconColor("#111827", selected.textColor, selected.strokeColor);
                  const isLineShape = STATE_ICON_LINE_SHAPE_KINDS.has(selected.kind);
                  const isClosedShape = STATE_ICON_CLOSED_SHAPE_KINDS.has(selected.kind);
                  const fontFamilyValue = selected.fontFamily ?? "Arial, Microsoft YaHei";
                  const baseFontFamilyOptions = Array.isArray(FONT_FAMILY_OPTIONS)
                    ? FONT_FAMILY_OPTIONS
                    : ["Arial", "Microsoft YaHei", "SimSun", "KaiTi", "SimHei"];
                  const fontFamilyOptions = Array.from(new Set([
                    "Arial, Microsoft YaHei",
                    ...baseFontFamilyOptions,
                    fontFamilyValue
                  ].filter(Boolean)));
                  const fontFamilyOptionLabels = {
                    "Arial, Microsoft YaHei": "Arial / 微软雅黑",
                    ...(FONT_FAMILY_OPTION_LABELS ?? {})
                  };
                  return (
                    <>
                      <div className="state-icon-drawing-property-title">
                        <strong>{stateVisualShapeLabel(selected.kind)}</strong>
                        <span>{stateIconDrawingSelectedIds(stateIconDrawingDialog).length > 1 ? `${stateIconDrawingSelectedIds(stateIconDrawingDialog).length} 个元素` : "选中元素"}</span>
                      </div>
                      <table className="state-icon-drawing-property-table">
                        <tbody>
                        <tr>
                          <th>X</th>
                          <td><BufferedTextInput type="number" step="0.01" value={formatStateIconDrawingNumber(selected.x)} onCommit={(nextValue) => updateStateIconDrawingElement(selected.id, { x: Number(nextValue) || 0 })} /></td>
                        </tr>
                        <tr>
                          <th>Y</th>
                          <td><BufferedTextInput type="number" step="0.01" value={formatStateIconDrawingNumber(selected.y)} onCommit={(nextValue) => updateStateIconDrawingElement(selected.id, { y: Number(nextValue) || 0 })} /></td>
                        </tr>
                        <tr>
                          <th>宽</th>
                          <td><BufferedTextInput type="number" min="1" step="0.01" value={formatStateIconDrawingNumber(selected.width, 1)} onCommit={(nextValue) => updateStateIconDrawingElement(selected.id, { width: Math.max(1, Number(nextValue) || 1) })} /></td>
                        </tr>
                        <tr>
                          <th>高</th>
                          <td><BufferedTextInput type="number" min="1" step="0.01" value={formatStateIconDrawingNumber(selected.height, 1)} onCommit={(nextValue) => updateStateIconDrawingElement(selected.id, { height: Math.max(1, Number(nextValue) || 1) })} /></td>
                        </tr>
                        <tr>
                          <th>角度</th>
                          <td><BufferedTextInput type="number" step="0.01" value={formatStateIconDrawingNumber(selected.rotation)} onCommit={(nextValue) => updateStateIconDrawingElement(selected.id, { rotation: Number(nextValue) || 0 })} /></td>
                        </tr>
                        <tr>
                          <th>粗细</th>
                          <td>
                            <BufferedTextInput
                              type="number"
                              min="0"
                              step={1}
                              inputMode="numeric"
                              value={normalizeStateIconDrawingStrokeWidth(selected.strokeWidth)}
                              onKeyDown={(event) => {
                                if ([".", "-", "+", "e", "E"].includes(event.key)) {
                                  event.preventDefault();
                                }
                              }}
                              onCommit={(nextValue) => updateStateIconDrawingElement(selected.id, { strokeWidth: normalizeStateIconDrawingStrokeWidth(nextValue, selected.strokeWidth) })}
                            />
                          </td>
                        </tr>
                        <tr>
                          <th>线型</th>
                          <td>
                            <select value={selected.strokeStyle ?? "solid"} onChange={(event) => updateStateIconDrawingElement(selected.id, { strokeStyle: event.target.value })}>
                              <option value="solid">实线</option>
                              <option value="dashed">虚线</option>
                              <option value="dotted">点线</option>
                            </select>
                          </td>
                        </tr>
                        <tr>
                          <th>所属端子</th>
                          <td>
                            <select
                              value={Number.isInteger(selected.terminalIndex) && selected.terminalIndex >= 0 ? String(selected.terminalIndex) : ""}
                              onChange={(event) => updateStateIconDrawingElement(selected.id, stateIconDrawingTerminalPatch(event.target.value))}
                            >
                              <option value="">无</option>
                              {stateIconDrawingTerminalOptions.map((option) => (
                                <option key={option.index} value={option.index}>
                                  {option.index + 1}. {option.label}
                                </option>
                              ))}
                            </select>
                          </td>
                        </tr>
                        <tr>
                          <th>线色</th>
                          <td>
                            <div className="state-icon-drawing-color-field">
                              <DeferredColorInput value={visibleStrokeColor} fallback="#2563eb" onCommit={(value) => updateStateIconDrawingElement(selected.id, { strokeColor: value })} />
                            </div>
                          </td>
                        </tr>
                        {isLineShape && (
                          <>
                            <tr>
                              <th>起点端型</th>
                              <td>
                                <select value={selected.startCap ?? "none"} onChange={(event) => updateStateIconDrawingElement(selected.id, { startCap: event.target.value })}>
                                  {STATE_ICON_LINE_CAP_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                                </select>
                              </td>
                            </tr>
                            <tr>
                              <th>终点端型</th>
                              <td>
                                <select value={selected.endCap ?? "none"} onChange={(event) => updateStateIconDrawingElement(selected.id, { endCap: event.target.value })}>
                                  {STATE_ICON_LINE_CAP_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                                </select>
                              </td>
                            </tr>
                          </>
                        )}
                        {isClosedShape && (
                          <tr>
                            <th>填充</th>
                            <td>
                              <div className="state-icon-drawing-color-field">
                                <DeferredColorInput value={selected.fillColor} fallback="#ffffff" onCommit={(value) => updateStateIconDrawingElement(selected.id, { fillColor: value })} />
                              </div>
                            </td>
                          </tr>
                        )}
                        {selected.kind === "text" && (
                          <>
                            <tr>
                              <th>文字</th>
                              <td><BufferedTextInput value={selected.text} onCommit={(nextValue) => updateStateIconDrawingElement(selected.id, { text: nextValue })} /></td>
                            </tr>
                            <tr>
                              <th>文本颜色</th>
                              <td>
                                <div className="state-icon-drawing-color-field">
                                  <DeferredColorInput value={visibleTextColor} fallback="#111827" onCommit={(value) => updateStateIconDrawingElement(selected.id, { textColor: value })} />
                                </div>
                              </td>
                            </tr>
                            <tr>
                              <th>字体</th>
                              <td>
                                <select value={fontFamilyValue} onChange={(event) => updateStateIconDrawingElement(selected.id, { fontFamily: event.target.value })}>
                                  {fontFamilyOptions.map((fontFamily) => (
                                    <option key={fontFamily} value={fontFamily} style={{ fontFamily }}>
                                      {fontFamilyOptionLabels[fontFamily] ?? fontFamily}
                                    </option>
                                  ))}
                                </select>
                              </td>
                            </tr>
                            <tr>
                              <th>字号</th>
                              <td>
                                <BufferedTextInput
                                  type="number"
                                  min={STATE_ICON_DRAWING_MIN_FONT_SIZE}
                                  step={1}
                                  inputMode="numeric"
                                  value={normalizeStateIconDrawingFontSize(selected.fontSize ?? selected.height)}
                                  onKeyDown={(event) => {
                                    if ([".", "-", "+", "e", "E"].includes(event.key)) {
                                      event.preventDefault();
                                    }
                                  }}
                                  onCommit={(nextValue) => updateStateIconDrawingElement(selected.id, {
                                    fontSize: normalizeStateIconDrawingFontSize(nextValue, selected.fontSize ?? selected.height)
                                  })}
                                />
                              </td>
                            </tr>
                            <tr>
                              <th>字重</th>
                              <td>
                                <select value={String(selected.fontWeight ?? "800")} onChange={(event) => updateStateIconDrawingElement(selected.id, { fontWeight: event.target.value })}>
                                  <option value="400">常规</option>
                                  <option value="700">加粗</option>
                                  <option value="800">特粗</option>
                                </select>
                              </td>
                            </tr>
                            <tr>
                              <th>字型</th>
                              <td>
                                <select value={selected.fontStyle ?? "normal"} onChange={(event) => updateStateIconDrawingElement(selected.id, { fontStyle: event.target.value })}>
                                  <option value="normal">常规</option>
                                  <option value="italic">斜体</option>
                                </select>
                              </td>
                            </tr>
                          </>
                        )}
                        {selected.kind === "image" && (
                          <>
                            <tr>
                              <th>图片显示方式</th>
                              <td>
                                <select value={normalizeImageFitMode(selected.imageFit)} onChange={(event) => updateStateIconDrawingElement(selected.id, { imageFit: event.target.value })}>
                                  {IMAGE_FIT_MODE_OPTIONS.map((option) => (
                                    <option key={option.value} value={option.value}>{option.label}</option>
                                  ))}
                                </select>
                              </td>
                            </tr>
                            <tr>
                              <th>图片缩放</th>
                              <td><BufferedTextInput type="number" min="0.05" step="0.01" value={formatStateIconDrawingNumber(selected.imageScale ?? 1, 1)} onCommit={(nextValue) => updateStateIconDrawingElement(selected.id, { imageScale: Math.max(0.05, Number(nextValue) || 0.05) })} /></td>
                            </tr>
                            <tr>
                              <th>裁剪X</th>
                              <td><BufferedTextInput type="number" step="0.01" value={formatStateIconDrawingNumber(selected.cropX ?? 0)} onCommit={(nextValue) => updateStateIconDrawingElement(selected.id, { cropX: Number(nextValue) || 0 })} /></td>
                            </tr>
                            <tr>
                              <th>裁剪Y</th>
                              <td><BufferedTextInput type="number" step="0.01" value={formatStateIconDrawingNumber(selected.cropY ?? 0)} onCommit={(nextValue) => updateStateIconDrawingElement(selected.id, { cropY: Number(nextValue) || 0 })} /></td>
                            </tr>
                          </>
                        )}
                        </tbody>
                      </table>
                    </>
                  );
                })()}
              </div>
              )}
            </div>
          </div>
        </div>
      );
    };
    return (
      <section className={`device-state-pager ${hideDefaultPage ? "hide-default-state" : ""}`} aria-label="状态分页">
        {renderStateIconDrawingLibrary()}
        {isDefaultStatePage || activeRow ? (
          <>
            {renderStateIconDrawingInline()}
            <div className="custom-device-actions device-state-actions">
              {handlers.saveStateVisuals && <button type="button" onClick={handlers.saveStateVisuals}>{handlers.saveStateVisualsLabel ?? "保存状态样式"}</button>}
              {handlers.reset && <button type="button" onClick={handlers.reset}>{handlers.resetLabel ?? "恢复状态页"}</button>}
            </div>
            {renderStateIconDrawingContextMenu()}
          </>
        ) : (
          <div className="device-state-empty">
            <span>暂无状态分页</span>
            <button type="button" onClick={handlers.add}>新增状态</button>
          </div>
        )}
      </section>
    );
  };
}

export function createRenderDeviceDefinitionVisualPanel(__appScope: Record<string, any>) {
  return (template: DeviceTemplate) => {
  const { BufferedTextInput, CUSTOM_DEVICE_TERMINAL_ANCHOR_GUIDE_LABELS, CUSTOM_DEVICE_TERMINAL_ANCHOR_GUIDE_VALUES, CUSTOM_DEVICE_TERMINAL_ANCHOR_PRECISION, DEFAULT_STATE_PAGE_ID, Fragment, MemoDeviceGlyph, SvgMarkupChunk, TERMINAL_TYPE_LIBRARY_LABELS, addDefinitionStateDraftRow, button, circle, colorDisplayMode, colorPalette, createDefinitionStateDraftRows, createDefinitionVisualDraft, createNodeFromTemplate, customDeviceTerminalAnchorValue, definitionDraftError, definitionStateDraftRows, definitionStatePageId, definitionStatePreviewVisual, definitionTemplateIconInputRef, definitionTerminalAnchorDragIndex, definitionTerminalConnectorSegment, definitionVisualDraft, definitionVisualPreviewHeight, definitionVisualPreviewImage, definitionVisualPreviewWidth, definitionVisualTerminalAnchors, definitionVisualTerminalTypes, deleteDefinitionStateDraftRow, div, formatCustomDeviceTerminalAnchorValue, formatSvgNumber, g, image, isBusNode, isDefaultStatePageId, isStaticNode, label, line, nodeForegroundImage, nodeGeometryTransform, nodeImageContentTransform, openStateIconDrawingDialog, p, rect, renderStateVisualPager, resolveNodeStateVisual, saveDeviceDefinitionStateVisualDraft, saveDeviceDefinitionVisualDraft, section, setDefinitionDraftError, setDefinitionStateDraftRows, setDefinitionStatePageId, setDefinitionTerminalAnchorDragIndex, setDefinitionVisualDraft, setStateImageUploadTarget, small, span, stateVisualImageInputRef, strong, svgImageContentMarkup, terminalColor, text, title, updateDefinitionStateDraftRow, updateDefinitionTerminalAnchor, updateDefinitionTerminalAnchorFromPreview } = __appScope;
    if (!definitionVisualDraft) {
      return null;
    }
    const visualTemplate: DeviceTemplate = {
      ...template,
      size: definitionVisualDraft.size,
      params: {
        ...template.params,
        ...(definitionStatePreviewVisual?.value !== undefined && definitionStatePreviewVisual.value !== "" ? { status: definitionStatePreviewVisual.value } : {}),
        backgroundImage: "",
        backgroundImageAssetId: ""
      },
      terminalType: definitionVisualTerminalTypes[0] ?? template.terminalType,
      terminalCount: definitionVisualDraft.terminalCount,
      terminalTypes: definitionVisualTerminalTypes,
      terminalLabels: definitionVisualDraft.terminalLabels.slice(0, definitionVisualDraft.terminalCount),
      terminalAnchors: definitionVisualTerminalAnchors,
      stateDefinitions: definitionStateDraftRows
    };
    const previewNode = createNodeFromTemplate(visualTemplate, { x: 0, y: 0 });
    const previewFrameNode = {
      ...previewNode,
      size: { width: definitionVisualPreviewWidth, height: definitionVisualPreviewHeight }
    };
    const definitionDefaultStateSelected = isDefaultStatePageId(definitionStatePageId);
    const renderDefinitionVisualPreviewContent = (clipId: string) => {
      const previewStateVisual = definitionStatePreviewVisual ?? resolveNodeStateVisual(previewFrameNode);
      const previewImageHref = definitionVisualPreviewImage;
      const previewForegroundHref = nodeForegroundImage(previewFrameNode);
      const previewIsBus = isBusNode(previewFrameNode);
      const previewIsStatic = isStaticNode(previewFrameNode);
      const previewUsesStateImage = Boolean(
        definitionStatePreviewVisual?.image ||
        definitionStatePreviewVisual?.imageAssetId ||
        definitionStatePreviewVisual?.backgroundImage ||
        definitionStatePreviewVisual?.backgroundImageAssetId
      );
      const previewImageFit = normalizeImageFitMode(
        previewUsesStateImage
          ? (previewStateVisual?.imageFit ?? previewStateVisual?.backgroundImageFit ?? "fixed")
          : definitionVisualDraft.backgroundImageFit
      );
      return (
        <>
          {!previewIsBus && (previewImageHref || previewForegroundHref) && (
            <clipPath id={clipId}>
              <rect
                x={-previewFrameNode.size.width / 2}
                y={-previewFrameNode.size.height / 2}
                width={previewFrameNode.size.width}
                height={previewFrameNode.size.height}
                rx="8"
              />
            </clipPath>
          )}
          <g className="node-geometry" transform={nodeGeometryTransform(previewFrameNode)}>
            <MemoDeviceGlyph node={previewFrameNode} mode="geometry" colorDisplayMode={colorDisplayMode} colorPalette={colorPalette} stateVisual={previewStateVisual} />
            <MemoDeviceGlyph node={previewFrameNode} mode="text" colorDisplayMode={colorDisplayMode} colorPalette={colorPalette} stateVisual={previewStateVisual} />
          </g>
          {!previewIsBus && (previewImageHref || previewForegroundHref) && (
            <g className="node-upright-content" transform={nodeImageContentTransform(previewFrameNode)}>
              {previewImageHref && previewIsStatic && (
                <SvgMarkupChunk
                  className="node-background-image-markup"
                  markup={svgImageContentMarkup(previewImageHref, {
                    x: -previewFrameNode.size.width / 2,
                    y: -previewFrameNode.size.height / 2,
                    width: previewFrameNode.size.width,
                    height: previewFrameNode.size.height,
                    imageFit: previewImageFit,
                    clipPath: `url(#${clipId})`,
                    className: "node-background-image"
                  })}
                />
              )}
              {previewImageHref && !previewIsStatic && (
                <rect
                  x={-previewFrameNode.size.width / 2}
                  y={-previewFrameNode.size.height / 2}
                  width={previewFrameNode.size.width}
                  height={previewFrameNode.size.height}
                  rx="8"
                  className={`node-image-cover ${previewFrameNode.terminals.length > 0 ? "terminal-reserved-area" : ""}`}
                />
              )}
              {previewImageHref && !previewIsStatic && (
                <SvgMarkupChunk
                  className="node-background-image-markup"
                  markup={svgImageContentMarkup(previewImageHref, {
                    x: -previewFrameNode.size.width / 2,
                    y: -previewFrameNode.size.height / 2,
                    width: previewFrameNode.size.width,
                    height: previewFrameNode.size.height,
                    imageFit: previewImageFit,
                    clipPath: `url(#${clipId})`,
                    className: "node-background-image"
                  })}
                />
              )}
              {previewForegroundHref && (
                <SvgMarkupChunk
                  className="node-foreground-image-markup"
                  markup={svgImageContentMarkup(previewForegroundHref, {
                    x: -previewFrameNode.size.width / 2,
                    y: -previewFrameNode.size.height / 2,
                    width: previewFrameNode.size.width,
                    height: previewFrameNode.size.height,
                    imageFit: previewImageFit,
                    clipPath: `url(#${clipId})`,
                    className: "node-foreground-image"
                  })}
                />
              )}
            </g>
          )}
        </>
      );
    };
    return (
      <section className="device-definition-visual-panel">
        {definitionVisualDraft.error && <p className="custom-device-error">{definitionVisualDraft.error}</p>}
        {definitionDraftError && <p className="custom-device-error">{definitionDraftError}</p>}
        {renderStateVisualPager(definitionStateDraftRows, definitionStatePageId, setDefinitionStatePageId, {
          update: updateDefinitionStateDraftRow,
          add: addDefinitionStateDraftRow,
          remove: deleteDefinitionStateDraftRow,
          saveStateVisuals: saveDeviceDefinitionStateVisualDraft,
          saveStateVisualsLabel: "保存状态样式",
          drawingScope: "definition",
          definitionTemplate: template,
          reset: () => {
            const stateRows = createDefinitionStateDraftRowsWithDefaultImages(__appScope, template);
            setDefinitionStateDraftRows(stateRows);
            setDefinitionStatePageId(DEFAULT_STATE_PAGE_ID);
            setDefinitionDraftError("");
          },
          resetLabel: "恢复状态分页"
        })}
        {definitionDefaultStateSelected && (
          <div className="device-definition-default-toolbar">
            <div className="custom-device-image-row device-definition-image-row">
              <span>SVG/图片图标</span>
              <button type="button" onClick={() => definitionTemplateIconInputRef.current?.click()}>上传到后台</button>
              <button
                type="button"
                onClick={() =>
                  setDefinitionVisualDraft((current) =>
                    current
                      ? {
                          ...current,
                          backgroundImage: "",
                          backgroundImageAssetId: "",
                          backgroundImageFit: "cover",
                          error: ""
                        }
                      : current
                  )
                }
              >
                清除
              </button>
              <strong>{definitionVisualDraft.backgroundImageAssetId ? "后台已保存" : definitionVisualDraft.backgroundImage ? "已设置" : "默认图形"}</strong>
            </div>
            <div className="custom-device-image-row device-definition-image-row">
              <span>图标显示方式</span>
              <select value={normalizeImageFitMode(definitionVisualDraft.backgroundImageFit)} onChange={(event) =>
                setDefinitionVisualDraft((current) => current ? { ...current, backgroundImageFit: event.target.value, error: "" } : current)
              }>
                {IMAGE_FIT_MODE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
            <div className="device-definition-size-grid">
              <label>
                宽度
                <BufferedTextInput
                  type="number"
                  min="1"
                  value={definitionVisualDraft.size.width}
                  onCommit={(value) =>
                    setDefinitionVisualDraft((current) =>
                      current
                        ? {
                            ...current,
                            size: { ...current.size, width: Math.max(1, Math.round(Number(value) || current.size.width)) },
                            error: ""
                          }
                        : current
                    )
                  }
                />
              </label>
              <label>
                高度
                <BufferedTextInput
                  type="number"
                  min="1"
                  value={definitionVisualDraft.size.height}
                  onCommit={(value) =>
                    setDefinitionVisualDraft((current) =>
                      current
                        ? {
                            ...current,
                            size: { ...current.size, height: Math.max(1, Math.round(Number(value) || current.size.height)) },
                            error: ""
                          }
                        : current
                    )
                  }
                />
              </label>
              <span>端子拖放到元件四周边框。</span>
            </div>
            <div className="custom-device-actions device-definition-visual-actions">
              <button type="button" onClick={saveDeviceDefinitionVisualDraft}>保存图标和端子</button>
              <button
                type="button"
                onClick={() => {
                  const stateRows = createDefinitionStateDraftRowsWithDefaultImages(__appScope, template);
                  setDefinitionVisualDraft(clearGeneratedDefinitionVisualDraftImage(template, createDefinitionVisualDraft(template)));
                  setDefinitionStateDraftRows(stateRows);
                  setDefinitionStatePageId(DEFAULT_STATE_PAGE_ID);
                  setDefinitionDraftError("");
                }}
              >
                恢复当前元件状态
              </button>
            </div>
          </div>
        )}
        {definitionVisualDraft.terminalCount > 0 && <div className="custom-terminal-grid device-definition-terminal-grid">
          {Array.from({ length: definitionVisualDraft.terminalCount }).map((_, index) => {
            const terminalType = definitionVisualDraft.terminalTypes[index] ?? template.terminalType;
            const terminalAnchor = definitionVisualTerminalAnchors[index] ?? { x: 0, y: 0 };
            return (
              <label key={index}>
                {`端子${index + 1}`}
                <strong>{TERMINAL_TYPE_LIBRARY_LABELS[terminalType] ?? terminalType}</strong>
                <span>端子位置</span>
                <div className="custom-terminal-anchor-inputs">
                  <span>X</span>
                  <BufferedTextInput
                    type="number"
                    min="-0.5"
                    max="0.5"
                    step="0.01"
                    value={formatCustomDeviceTerminalAnchorValue(terminalAnchor.x)}
                    onCommit={(value) => updateDefinitionTerminalAnchor(index, { x: Number(value) })}
                    aria-label={`修改元件端子${index + 1} X位置`}
                  />
                  <span>Y</span>
                  <BufferedTextInput
                    type="number"
                    min="-0.5"
                    max="0.5"
                    step="0.01"
                    value={formatCustomDeviceTerminalAnchorValue(terminalAnchor.y)}
                    onCommit={(value) => updateDefinitionTerminalAnchor(index, { y: Number(value) })}
                    aria-label={`修改元件端子${index + 1} Y位置`}
                  />
                </div>
              </label>
            );
          })}
        </div>}
      </section>
    );
  };
}

export function createRenderGraphTemplatePreview(__appScope: Record<string, any>) {
  return (template: GraphTemplate) => {
  const { MemoDeviceGlyph, canvasClipboardBounds, colorPalette, g, nodeGeometryTransform, path, pointsToPreviewPath, rect, resolveNodeStateVisual, svg } = __appScope;
    const bounds = canvasClipboardBounds(template.clipboard);
    if (!bounds) {
      return (
        <svg viewBox="0 0 80 56" aria-hidden="true" className="template-preview-svg">
          <rect x="8" y="10" width="64" height="36" rx="6" fill="#f8fafc" stroke="#cbd5e1" />
        </svg>
      );
    }
    const padding = 8;
    const width = Math.max(1, bounds.right - bounds.left + padding * 2);
    const height = Math.max(1, bounds.bottom - bounds.top + padding * 2);
    return (
      <svg
        viewBox={`${bounds.left - padding} ${bounds.top - padding} ${width} ${height}`}
        aria-hidden="true"
        className="template-preview-svg"
      >
        {template.clipboard.edges.map((item) => (
          <path
            key={item.edge.id}
            d={pointsToPreviewPath(item.routePoints)}
            fill="none"
            stroke="#64748b"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}
        {template.clipboard.nodes.map((node) => (
          <g key={node.id} transform={`translate(${node.position.x} ${node.position.y})`}>
            <g transform={nodeGeometryTransform(node)}>
              <MemoDeviceGlyph node={node} miniature colorPalette={colorPalette} stateVisual={resolveNodeStateVisual(node)} />
            </g>
          </g>
        ))}
      </svg>
    );
  };
}

export function createRenderLibraryTemplateButton(__appScope: Record<string, any>) {
  return (item: DeviceTemplate, section: string) => {
  const { MemoDeviceGlyph, SvgMarkupChunk, button, cancelLibraryPlacement, clipPath, colorPalette, componentLibraryDisplayMode, createNodeFromTemplate, defs, formatSvgNumber, g, hideLibraryFlyout, image, isBrowseMode, isBusNode, isEditMode, libraryPreviewByKind, nodeForegroundImage, nodeGeometryTransform, nodeImage, nodeImageContentTransform, rect, resolveNodeStateVisual, startLibraryDevicePlacement, svg, svgImageContentMarkup } = __appScope;
    const preview = libraryPreviewByKind.get(item.kind) ?? createNodeFromTemplate(item, { x: 0, y: 0 });
    const libraryPreviewImageHref = nodeImage(preview);
    const libraryPreviewForegroundHref = nodeForegroundImage(preview);
    const libraryPreviewHasImage = !isBusNode(preview) && Boolean(libraryPreviewImageHref || libraryPreviewForegroundHref);
    const previewRotation = ((Math.round(preview.rotation) % 360) + 360) % 360;
    const fallbackPreviewViewBox = previewRotation === 90 || previewRotation === 270 ? "-48 -48 96 96" : "-40 -28 80 56";
    const imagePreviewWidth = Math.max(80, preview.size.width + 16);
    const imagePreviewHeight = Math.max(56, preview.size.height + 16);
    const previewViewBox = libraryPreviewHasImage
      ? `${formatSvgNumber(-imagePreviewWidth / 2)} ${formatSvgNumber(-imagePreviewHeight / 2)} ${formatSvgNumber(imagePreviewWidth)} ${formatSvgNumber(imagePreviewHeight)}`
      : fallbackPreviewViewBox;
    const libraryPreviewClipId = `library-preview-clip-${item.kind.replace(/[^A-Za-z0-9_-]/g, "-")}`;
    return (
      <button
        key={item.kind}
        className="library-item"
        draggable={isEditMode}
        disabled={isBrowseMode}
        title={`${item.label} / ${section}`}
        onClick={() => startLibraryDevicePlacement(item)}
        onContextMenu={(event) => {
          event.preventDefault();
          cancelLibraryPlacement();
        }}
        onDragStart={(event) => {
          if (!isEditMode) {
            event.preventDefault();
            return;
          }
          cancelLibraryPlacement();
          event.dataTransfer.setData("application/device-kind", item.kind);
          if (componentLibraryDisplayMode === "right") {
            hideLibraryFlyout();
          }
        }}
      >
        <svg viewBox={previewViewBox} aria-hidden="true">
          {libraryPreviewHasImage && (
            <defs>
              <clipPath id={libraryPreviewClipId}>
                <rect
                  x={-preview.size.width / 2}
                  y={-preview.size.height / 2}
                  width={preview.size.width}
                  height={preview.size.height}
                  rx="8"
                />
              </clipPath>
            </defs>
          )}
          {!libraryPreviewHasImage && (
            <g transform={nodeGeometryTransform(preview)}>
              <MemoDeviceGlyph node={preview} miniature colorPalette={colorPalette} stateVisual={resolveNodeStateVisual(preview)} />
            </g>
          )}
          {libraryPreviewHasImage && (
            <g className="library-preview-image-wrap" transform={nodeImageContentTransform(preview)}>
              {libraryPreviewImageHref && (
                <SvgMarkupChunk
                  className="library-preview-image-markup"
                  markup={svgImageContentMarkup(libraryPreviewImageHref, {
                    x: -preview.size.width / 2,
                    y: -preview.size.height / 2,
                    width: preview.size.width,
                    height: preview.size.height,
                    preserveAspectRatio: "xMidYMid meet",
                    clipPath: `url(#${libraryPreviewClipId})`,
                    className: "library-preview-image"
                  })}
                />
              )}
              {libraryPreviewForegroundHref && (
                <SvgMarkupChunk
                  className="library-preview-image-markup"
                  markup={svgImageContentMarkup(libraryPreviewForegroundHref, {
                    x: -preview.size.width / 2,
                    y: -preview.size.height / 2,
                    width: preview.size.width,
                    height: preview.size.height,
                    preserveAspectRatio: "xMidYMid meet",
                    clipPath: `url(#${libraryPreviewClipId})`,
                    className: "library-preview-image library-preview-foreground-image"
                  })}
                />
              )}
            </g>
          )}
        </svg>
      </button>
    );
  };
}

export function createRenderLibraryFlyout(__appScope: Record<string, any>) {
  return (flyoutListKey: string, componentLibraryKey: string, group: CategoryLibrary, typeGroup: CategoryLibraryComponentLibraryGroup) => {
  const { clearLibraryFlyoutCloseTimer, createPortal, div, libraryFlyoutStyle, renderLibraryTemplateButton, scheduleLibraryFlyoutClose, setHoveredCategoryLibrary, setHoveredCategoryLibraryComponentLibrary, setLibraryComponentListRef } = __appScope;
    const flyout = (
      <div
        className="library-group flyout-library-group"
        ref={setLibraryComponentListRef(flyoutListKey)}
        style={libraryFlyoutStyle(flyoutListKey)}
        onMouseEnter={() => {
          clearLibraryFlyoutCloseTimer();
          setHoveredCategoryLibrary(group);
          setHoveredCategoryLibraryComponentLibrary(componentLibraryKey);
        }}
        onMouseLeave={() => scheduleLibraryFlyoutClose(group, componentLibraryKey)}
      >
        {typeGroup.templates.map((item) => renderLibraryTemplateButton(item, typeGroup.section))}
      </div>
    );
    if (typeof document === "undefined") {
      return flyout;
    }
    return createPortal(flyout, document.body);
  };
}

export function createLodNodeFromEvent(__appScope: Record<string, any>) {
  return (event: PointerEvent<SVGGElement> | MouseEvent<SVGGElement>) => {
  const { nodeById } = __appScope;
    const target = event.target instanceof Element
      ? event.target.closest(".lod-node[data-node-id]")
      : null;
    const nodeId = target?.getAttribute("data-node-id") ?? "";
    return nodeId ? nodeById.get(nodeId) : undefined;
  };
}

export function createLodTerminalIdFromEvent(__appScope: Record<string, any>) {
  return (event: PointerEvent<SVGGElement> | MouseEvent<SVGGElement>) => {
    const target = event.target instanceof Element
      ? event.target.closest("[data-terminal-id]")
      : null;
    return target?.closest(".lod-node[data-node-id]") ? target.getAttribute("data-terminal-id") ?? "" : "";
  };
}

export function createHandleLodNodePointerDown(__appScope: Record<string, any>) {
  return (event: PointerEvent<SVGGElement>) => {
  const { handleNodePointerDown, handleRoutableLineNodePointerDown, handleTerminalPointerDown, isRoutableLineDeviceKind, lodNodeFromEvent, lodTerminalIdFromEvent } = __appScope;
    const node = lodNodeFromEvent(event);
    if (node) {
      const terminalId = lodTerminalIdFromEvent(event);
      if (event.button === 0 && terminalId) {
        handleTerminalPointerDown(event as unknown as PointerEvent<SVGCircleElement>, node, terminalId);
        return;
      }
      if (isRoutableLineDeviceKind(node.kind)) {
        handleRoutableLineNodePointerDown(event, node);
        return;
      }
      handleNodePointerDown(event, node);
    }
  };
}

export function createHandleLodNodeContextMenu(__appScope: Record<string, any>) {
  return (event: MouseEvent<SVGGElement>) => {
  const { activeLayerNodeIdSet, canvasInteractionRef, clampPointToCanvas, connectSource, isRoutableLineDeviceKind, lastCanvasPointerRef, lodNodeFromEvent, openGraphicContextMenu, projectListPointerInsideRef, resetConnectPreviewState, resetRoutableLinePreviewState, routableLineDeviceCanvasPoints, routableLinePlacement, screenToSvgPoint, selectCanvasGraphics, selectedNodeIdSet, setConnectSource, setMode, setRoutableLinePlacement, svgRef, updateMouseStatus } = __appScope;
    const node = lodNodeFromEvent(event);
    if (!node) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    if (!activeLayerNodeIdSet.has(node.id)) {
      return;
    }
    canvasInteractionRef.current = true;
    projectListPointerInsideRef.current = false;
    let pointer: Point | undefined;
    if (svgRef.current) {
      pointer = clampPointToCanvas(screenToSvgPoint(svgRef.current, event.clientX, event.clientY));
      lastCanvasPointerRef.current = pointer;
      updateMouseStatus(pointer);
    }
    if (connectSource) {
      setConnectSource(null);
      resetConnectPreviewState();
      setMode("select");
      return;
    }
    if (routableLinePlacement) {
      setRoutableLinePlacement(null);
      resetRoutableLinePreviewState();
      setMode("select");
      return;
    }
    if (!selectedNodeIdSet.has(node.id)) {
      selectCanvasGraphics([node.id], []);
    }
    openGraphicContextMenu({
      x: event.clientX,
      y: event.clientY,
      target: "node",
      canvasPoint: pointer,
      nodeId: node.id,
      routePoints: isRoutableLineDeviceKind(node.kind) ? routableLineDeviceCanvasPoints(node) : undefined
    });
  };
}
