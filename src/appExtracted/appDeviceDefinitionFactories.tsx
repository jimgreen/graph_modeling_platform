// @ts-nocheck
// 从拆分出的模块 re-export
export * from "./appDeviceDefinitionEInterface";
export * from "./appDeviceDefinitionRenderers";

// 内部使用已提取的符号
import { STATE_ICON_DRAFT_FRAME, STATE_ICON_DRAWING_FRAME_WIDTH, STATE_ICON_DRAWING_FRAME_HEIGHT, deviceDefinitionComplianceKey, stateIconDrawingFrameHasPersistedContent, buildEFileExportOptionsFromLibrary, applyEDeviceDefinitionSectionsToLibraryState } from "./appDeviceDefinitionEInterface";

import { buildEDeviceDefinitionFileFromInterfaceDefinitions, E_SECTION_COLUMNS, electricGenerationDerivedComponentLibraryInfo, getTemplateParameterDefinitions, inferESection, parseEDeviceDefinitionFile, resolveDeviceParameterDefinitionExportSettings, templateDerivedComponentLibraryInfo } from "../model";
import { clampNumber } from "../canvasViewport";
import { IMAGE_FIT_MODE_OPTIONS, imageFitPreserveAspectRatio, normalizeImageFitMode } from "../imageFit";
import { apiPath } from "../config";
import { decodeGbk } from "../encoding/gbk";
import { DEFAULT_STATE_ICON_DRAWING_FRAME, stateIconSvgVisibleViewBox } from "../stateIconDrawing";
import { decodeSvgImageSource } from "../svgUtils";
import { buildMeasurementProfilePositionDefinitions } from "../measurements";
import { measurementProfileItemsComplianceMessage } from "./appGraphMeasurementFactories";
import { cloneDeviceMeasurementDefinitions, normalizeDeviceMeasurementDefinitions } from "../measurementDefinitionTypes";
import {
  deviceDefinitionSharedKeyForTemplate,
  deviceTemplatesShareParameterDefinitions,
  normalizeSharedDeviceDefinitionOverrides
} from "../customDeviceUtils";
import type { TextFileEncoding } from "../fileIO";



function derivedDefinitionBaseParameterNameSet(
  template: DeviceTemplate,
  libraryTemplates: readonly DeviceTemplate[] = [],
  getTemplateParameterDefinitions?: (template: DeviceTemplate) => readonly DeviceParameterDefinition[]
) {
  const derivedInfo = templateDerivedComponentLibraryInfo(template);
  if (!derivedInfo) {
    return null;
  }
  const names = new Set<string>();
  const appendName = (value: unknown) => {
    const key = deviceDefinitionComplianceKey(value);
    if (key) {
      names.add(key);
    }
  };
  (E_SECTION_COLUMNS[derivedInfo.baseComponentLibrary] ?? []).forEach(appendName);
  const baseLibraryKey = deviceDefinitionComplianceKey(derivedInfo.baseComponentLibrary);
  for (const candidate of libraryTemplates ?? []) {
    if (templateDerivedComponentLibraryInfo(candidate)) {
      continue;
    }
    const candidateLibraryKey = deviceDefinitionComplianceKey(inferESection(candidate.kind, candidate.params ?? {}));
    if (candidateLibraryKey !== baseLibraryKey) {
      continue;
    }
    const definitions = typeof getTemplateParameterDefinitions === "function"
      ? getTemplateParameterDefinitions(candidate)
      : candidate.parameterDefinitions;
    for (const definition of definitions ?? []) {
      appendName(definition.enName);
    }
  }
  return names;
}

function derivedDefinitionBaseParameterDuplicateMessage(row: DeviceParameterDefinition, template: DeviceTemplate) {
  const derivedInfo = templateDerivedComponentLibraryInfo(template);
  const enName = String(row.enName ?? "").trim();
  const baseName = derivedInfo?.baseComponentLibrary ? ` ${derivedInfo.baseComponentLibrary}` : "";
  return `英文名称 ${enName} 已在基类${baseName} 中定义，派生类参数不能重复定义基类字段。`;
}

function findDerivedDefinitionBaseParameterDuplicate(
  rows: readonly DeviceParameterDefinition[],
  template: DeviceTemplate,
  options: {
    libraryTemplates?: readonly DeviceTemplate[];
    getTemplateParameterDefinitions?: (template: DeviceTemplate) => readonly DeviceParameterDefinition[];
  } = {}
) {
  const baseParameterNames = derivedDefinitionBaseParameterNameSet(
    template,
    options.libraryTemplates,
    options.getTemplateParameterDefinitions
  );
  if (!baseParameterNames || baseParameterNames.size === 0) {
    return null;
  }
  return rows.find((row) => baseParameterNames.has(deviceDefinitionComplianceKey(row.enName))) ?? null;
}

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

const canonicalDeviceParameterDefinitionValue = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(canonicalDeviceParameterDefinitionValue);
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, item]) => item !== undefined)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, item]) => [key, canonicalDeviceParameterDefinitionValue(item)])
    );
  }
  return value;
};

const deviceParameterDefinitionListsEqual = (
  left: readonly DeviceParameterDefinition[],
  right: readonly DeviceParameterDefinition[]
) => JSON.stringify(canonicalDeviceParameterDefinitionValue(left)) === JSON.stringify(canonicalDeviceParameterDefinitionValue(right));

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
      } else if (!/^[A-Za-z][A-Za-z0-9_-]*$/.test(exportName)) {
        messages.push(`${rowLabel}：导出名称 ${exportName} 只能包含英文字母、数字、下划线和中划线，且必须以英文字母开头。`);
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
export const STATE_ICON_DRAWING_MIN_FONT_SIZE = 8;

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
  const { createDefaultCustomDeviceTerminalAnchors, customDeviceDraftBaselineRef, customDeviceDraftCleanTokenRef, measurementConfigBaselineRef, measurementConfigDraft, measurementConfigDraftRef } = __appScope;
    const nextAnchors = anchors ?? createDefaultCustomDeviceTerminalAnchors(draft.terminalCount, draft.terminalAnchors);
    customDeviceDraftCleanTokenRef.current = customDeviceDraftDirtyToken(
      draft,
      nextAnchors,
      measurementConfigDraftRef.current ?? measurementConfigDraft ?? null
    );
    if (customDeviceDraftBaselineRef) {
      customDeviceDraftBaselineRef.current = JSON.parse(JSON.stringify(draft));
    }
    if (measurementConfigBaselineRef) {
      const currentMeasurement = measurementConfigDraftRef.current ?? measurementConfigDraft ?? null;
      measurementConfigBaselineRef.current = currentMeasurement ? JSON.parse(JSON.stringify(currentMeasurement)) : null;
    }
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

// 还原当前 tab 或全部 tab 到预设定义
export function createRevertCustomDeviceDraftCurrentTab(__appScope: Record<string, any>) {
  return () => {
  const { customDeviceDraftBaselineRef, customDeviceDialogView, customDeviceDraft, measurementConfigBaselineRef, setCustomDeviceDraft, setMeasurementConfigDraft, setStateIconDrawingDialog } = __appScope;
    const baseline: CustomDeviceDraft | null = customDeviceDraftBaselineRef?.current ?? null;
    if (!baseline) return;
    if (customDeviceDialogView === "icon") {
      // 关闭绘图对话框，避免残留编辑状态
      if (typeof setStateIconDrawingDialog === "function") setStateIconDrawingDialog(null);
      setCustomDeviceDraft((current: CustomDeviceDraft) => ({
        ...current,
        stateDefinitions: JSON.parse(JSON.stringify(baseline.stateDefinitions)),
        backgroundImage: baseline.backgroundImage,
        backgroundImageAssetId: baseline.backgroundImageAssetId,
        backgroundImageFit: baseline.backgroundImageFit,
        backgroundImageCleared: baseline.backgroundImageCleared,
        size: { ...baseline.size },
        terminalTypes: [...baseline.terminalTypes],
        terminalLabels: [...baseline.terminalLabels],
        terminalAnchors: baseline.terminalAnchors.map((p) => ({ ...p })),
        terminalRoles: [...baseline.terminalRoles],
        terminalAssociations: [...baseline.terminalAssociations],
        error: ""
      }));
    } else if (customDeviceDialogView === "parameters") {
      setCustomDeviceDraft((current: CustomDeviceDraft) => ({
        ...current,
        params: JSON.parse(JSON.stringify(baseline.params)),
        error: ""
      }));
    } else if (customDeviceDialogView === "measurements") {
      const measurementBaseline = measurementConfigBaselineRef?.current ?? null;
      if (measurementBaseline) {
        const next = JSON.parse(JSON.stringify(measurementBaseline));
        setMeasurementConfigDraft(next);
      }
    }
  };
}

export function createRevertCustomDeviceDraftAll(__appScope: Record<string, any>) {
  return () => {
  const { customDeviceDraftBaselineRef, measurementConfigBaselineRef, setCustomDeviceDraft, setMeasurementConfigDraft, setStateIconDrawingDialog, editingCustomDeviceKind, selectedDefinitionKind, baseLibraryTemplateByKind, createCustomDeviceDraftFromTemplate, prepareMeasurementConfigDraft, resolveTemplateComponentLibrary } = __appScope;
    if (typeof setStateIconDrawingDialog === "function") setStateIconDrawingDialog(null);
    // 内置元件：从源码原始定义还原
    if (!editingCustomDeviceKind && selectedDefinitionKind && baseLibraryTemplateByKind && typeof createCustomDeviceDraftFromTemplate === "function") {
      const baseTemplate = baseLibraryTemplateByKind.get(selectedDefinitionKind);
      if (baseTemplate) {
        const section = typeof resolveTemplateComponentLibrary === "function" ? resolveTemplateComponentLibrary(baseTemplate) : (baseTemplate.categoryLibrary ?? "");
        const freshDraft = createCustomDeviceDraftFromTemplate(baseTemplate, section);
        setCustomDeviceDraft({ ...freshDraft, error: "" });
        if (typeof prepareMeasurementConfigDraft === "function") prepareMeasurementConfigDraft();
        return;
      }
    }
    // 自定义元件：从 baseline 还原
    const baseline: CustomDeviceDraft | null = customDeviceDraftBaselineRef?.current ?? null;
    if (!baseline) return;
    setCustomDeviceDraft(JSON.parse(JSON.stringify(baseline)));
    const measurementBaseline = measurementConfigBaselineRef?.current ?? null;
    if (measurementBaseline) {
      setMeasurementConfigDraft(JSON.parse(JSON.stringify(measurementBaseline)));
    }
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

export function stateIconStaticTemplateParam(template: any, key: string, fallback = "") {
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

export function stateIconDrawingSelectedIds(dialog: any) {
  return dialog?.selectedElementIds?.length > 0
    ? dialog.selectedElementIds
    : [dialog?.selectedElementId].filter(Boolean);
}

export function pushStateIconDrawingHistorySnapshot(historyRef: any, elements: any[]) {
  if (!historyRef) {
    return;
  }
  const snapshot = elements.map((element) => ({ ...element }));
  historyRef.current = [...(historyRef.current ?? []), snapshot].slice(-80);
}

export function cloneStateIconDrawingElements(elements: any[], createId: () => string, offset = { x: 12, y: 12 }) {
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

export function cutStateIconDrawingSelection(current: any, clipboardRef: any, historyRef: any) {
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

export function stateIconDrawingElementBounds(element: any) {
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

export function stateIconDrawingSelectionBounds(elements: any[]) {
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

export function stateIconDrawingRectFromPoints(start: Point, current: Point) {
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
  const terminalFrame = stateIconDrawingTerminalFrame();
  const xGuides = Array.from(new Set([
    0,
    terminalFrame.centerX - terminalFrame.width / 2,
    ...STATE_ICON_DRAWING_FRAME_GUIDE_RATIOS.map((ratio) => STATE_ICON_DRAWING_FRAME_WIDTH * ratio),
    terminalFrame.centerX + terminalFrame.width / 2,
    STATE_ICON_DRAWING_FRAME_WIDTH
  ]));
  const yGuides = Array.from(new Set([
    0,
    terminalFrame.centerY - terminalFrame.height / 2,
    ...STATE_ICON_DRAWING_FRAME_GUIDE_RATIOS.map((ratio) => STATE_ICON_DRAWING_FRAME_HEIGHT * ratio),
    terminalFrame.centerY + terminalFrame.height / 2,
    STATE_ICON_DRAWING_FRAME_HEIGHT
  ]));
  const verticalCandidates = xGuides.map((x) => {
    return {
      id: `frame-x-${x}`,
      bounds: {
        left: x,
        right: x,
        top: 0,
        bottom: STATE_ICON_DRAWING_FRAME_HEIGHT,
        centerX: x,
        centerY: STATE_ICON_DRAWING_FRAME_HEIGHT / 2
      },
      anchors: {
        x: [{ key: `frame-${x}`, value: x, priority: 2 }],
        y: []
      }
    };
  });
  const horizontalCandidates = yGuides.map((y) => {
    return {
      id: `frame-y-${y}`,
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
        y: [{ key: `frame-${y}`, value: y, priority: 2 }]
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
  const framePoint = {
    x: frame.centerX + boundaryAnchor.x * frame.width,
    y: frame.centerY + boundaryAnchor.y * frame.height
  };
  const horizontal = Math.abs(boundaryAnchor.x) >= Math.abs(boundaryAnchor.y);
  const bodyReachX = frame.marginX * 2.6;
  const bodyReachY = frame.marginY * 2.6;
  return {
    from: horizontal
      ? { x: framePoint.x - Math.sign(boundaryAnchor.x || 1) * bodyReachX, y: framePoint.y }
      : { x: framePoint.x, y: framePoint.y - Math.sign(boundaryAnchor.y || 1) * bodyReachY },
    to: horizontal
      ? { x: framePoint.x + (boundaryAnchor.x < 0 ? -frame.marginX : frame.marginX), y: framePoint.y }
      : { x: framePoint.x, y: framePoint.y + (boundaryAnchor.y < 0 ? -frame.marginY : frame.marginY) }
  };
}

function stateIconDrawingTerminalAlignmentCandidates(__appScope: Record<string, any>, options: { excludeTerminalIndex?: number } = {}) {
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
    if (index === options.excludeTerminalIndex) {
      return [];
    }
    const segment = stateIconDrawingTerminalConnectorSegment(anchor, projectAnchor);
    return [
      stateIconDrawingPointAlignmentCandidate(`terminal-anchor-${index}`, segment.to.x, segment.to.y, -3),
      stateIconDrawingPointAlignmentCandidate(`terminal-inner-${index}`, segment.from.x, segment.from.y, -2)
    ];
  });
}

function stateIconDrawingElementAlignmentCandidates(elements: readonly StateIconDrawingElement[] = [], selectedIds: readonly string[] = []) {
  const selectedSet = new Set(selectedIds);
  return elements
    .filter((element) => !selectedSet.has(element.id))
    .map((element) => ({ id: element.id, bounds: stateIconDrawingElementBounds(element) }));
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

export function stateIconDrawingTerminalPointSnap(
  __appScope: Record<string, any>,
  point: Point,
  options: { excludeTerminalIndex?: number; selectedIds?: readonly string[] } = {}
) {
  if (!__appScope.smartAlignmentEnabled) {
    return { point, guides: [] };
  }
  const candidates = [
    ...stateIconDrawingTerminalAlignmentCandidates(__appScope, options),
    ...stateIconDrawingElementAlignmentCandidates(__appScope.stateIconDrawingDialog?.elements ?? [], options.selectedIds ?? []),
    ...stateIconDrawingFrameAlignmentCandidates()
  ];
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
    const startBounds = stateIconDrawingSelectionBounds(startElements);
    if (!startBounds) {
      return { delta, guides: [] };
    }
    const candidates = [
      ...stateIconDrawingElementAlignmentCandidates(elements, selectedIds),
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

export function stateIconDrawingFrameDashArray(frame: any) {
  const width = Math.max(1, Number(frame?.strokeWidth) || 1);
  if (frame?.strokeStyle === "dotted") {
    return `${width * 0.2} ${width * 2}`;
  }
  if (frame?.strokeStyle === "dashed") {
    return `${width * 5} ${width * 3}`;
  }
  return undefined;
}

export function clampStateIconDrawingPoint(point: Point) {
  return {
    x: clampNumber(point.x, 0, 240),
    y: clampNumber(point.y, 0, 160)
  };
}

function sameStateIconDrawingPoint(left: Point, right: Point) {
  return Math.abs(left.x - right.x) < 0.01 && Math.abs(left.y - right.y) < 0.01;
}

export function appendDistinctStateIconDrawingPoint(points: readonly Point[], point: Point) {
  const nextPoint = clampStateIconDrawingPoint(point);
  const lastPoint = points[points.length - 1];
  return lastPoint && sameStateIconDrawingPoint(lastPoint, nextPoint)
    ? points.map(clampStateIconDrawingPoint)
    : [...points.map(clampStateIconDrawingPoint), nextPoint];
}

export function stateIconDrawingPolylineElementFromPoints(element: any, points: readonly Point[]) {
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

export function stateIconDrawingElementFromPoints(element: any, startPoint: Point, currentPoint: Point) {
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

export function finishStateIconDrawingDraft(current: any, historyRef: any) {
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
  const stateVisual = options.stateVisual
    ? {
        ...options.stateVisual,
        image: "",
        imageAssetId: "",
        backgroundImage: "",
        backgroundImageAssetId: "",
        imageCleared: ""
      }
    : null;
  const glyphMarkup = renderSvgElementMarkup(DeviceGlyph({ node, mode: "geometry", colorDisplayMode, colorPalette, stateVisual }));
  const glyphTextMarkup = renderSvgElementMarkup(DeviceGlyph({ node, mode: "text", colorDisplayMode, colorPalette, stateVisual }));
  const viewBoxX = -width / 2;
  const viewBoxY = -height / 2;
  const viewBoxWidth = width;
  const viewBoxHeight = height;
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
    `<svg x="${formatSvgNumber(-contentWidth / 2)}" y="${formatSvgNumber(-contentHeight / 2)}" width="${formatSvgNumber(contentWidth)}" height="${formatSvgNumber(contentHeight)}" data-state-icon-preserve-view-box="true" viewBox="${formatSvgNumber(viewBoxX)} ${formatSvgNumber(viewBoxY)} ${formatSvgNumber(viewBoxWidth)} ${formatSvgNumber(viewBoxHeight)}" preserveAspectRatio="xMidYMid meet" overflow="visible">` +
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

export function clearGeneratedDefinitionVisualDraftImage(template: any, draft: any) {
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

export function createDefinitionStateDraftRowsWithDefaultImages(__appScope: Record<string, any>, template: any) {
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
  const { activeLayerNodeIdSet, appendStaticDrawingPoint, busAnchorFromEvent, busAnchorFromPoint, canConnectTerminals, canvasBounds, captureCanvasPointer, clampPointToCanvas, commitNewConnectionEdge, connectPreviewPointRef, connectSource, connectTargetTerminalType, connectionCommitFailureMessage, connectionEndpointRuleFailureMessage, edgeById, finishConnectToTarget, finishRoutableLineToTarget, getTerminalPoint, hasCanvasSelectionModifier, isBrowseMode, isBusNode, markBusTerminalSyncDirtyForEdges, markRouteEdgesDirty, markStoredRouteEdgesDirty, nodeById, nodes, patchGraphEdges, prepareConnectionEdgeForCommit, preserveConnectionEdgeRouteShape, previewStoredRoutePointsForEdge, pushUndoSnapshot, resetConnectPreviewState, resolveStraightBusSlideEndpointToPoint, rewiring, routableLinePlacement, routableLineTemplateTerminalType, routedEdges, routingNodesForConnectionEdge, screenToSvgPoint, setCanvasSelectionScope, setConnectSource, setRewiring, setSelectedEdgeId, setSelectedEdgeIds, setSelectedNodeIds, setTerminalPress, startConnectFromTerminal, startModifierSelectionPress, startRoutableLineFromTerminal, staticDrawing, svgRef, visibleNodeById, writeOperationLog } = __appScope;
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
      } else if (!isBusNode(node) && node.terminals.length === 1) {
        const point = clampPointToCanvas(screenToSvgPoint(svgRef.current, event.clientX, event.clientY));
        setTerminalPress({
          nodeId: node.id,
          terminalId,
          pointerId: event.pointerId,
          startPoint: point,
          currentPoint: point,
          moved: false
        });
        captureCanvasPointer(event.pointerId);
      } else {
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
          showGlobalMessage(`联络线端子调整失败：${message}`);
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

// 模块级变量，用于跨渲染周期传递跳过保存检查的标志
let skipSaveCheckFlag = false;

export function setSkipSaveCheck(value: boolean) {
  skipSaveCheckFlag = value;
}

export function getSkipSaveCheck(): boolean {
  return skipSaveCheckFlag;
}

export function createEnsureSavedBeforeExport(__appScope: Record<string, any>) {
  return () => {
    // 使用模块级变量，避免闭包捕获旧值
    if (getSkipSaveCheck() || __appScope.canExportCurrentModel) {
      return true;
    }
    showGlobalMessage("当前模型存在未保存修改，请先保存后再导出文件。");
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
    const referencedHrefById = svgExportReferencedImageHrefById();
    if (referencedHrefById.size === 0) {
      return {};
    }
    let assets = imageAssetList;
    let exportHrefById = imageExportPathByIdFromAssets(assets, imageAssets);
    const hasAllReferencedImages = () => Array.from(referencedHrefById.keys()).every((id) => Boolean(exportHrefById[id]));
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
    const assetById = new Map(assets.map((asset) => [asset.id, asset]));
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
  const {
    DEFAULT_CANVAS_BACKGROUND,
    PARAM_LABELS,
    activeLayerId,
    activeSchemeKey,
    backgroundPageRender,
    buildEFileExport,
    buildSvgDocument,
    canvasBackgroundColor,
    canvasBackgroundImageUrl,
    canvasBounds,
    colorPalette,
    currentProject,
    eDeviceDefinitionClassExportEnabled,
    eDeviceDefinitionFieldOrder,
    eDeviceDefinitionLabels,
    eDeviceDefinitionTableIds,
    eDeviceDefinitionTemplateFields,
    edges,
    ensureSavedBeforeExport,
    getEExportWarnings,
    isPickerAbort,
    layers,
    libraryTemplates,
    loadSvgImageExportPathById,
    measurementConfig,
    nodes,
    projectMeasurements,
    projectName,
    resolveTemplateComponentLibrary,
    safeFilePart,
    schemePathForScheme,
    writeTextFileToDirectory,
    writeOperationLog
  } = __appScope;
    let exportStartedAt = performance.now();
    const exportElapsedText = () => `${((performance.now() - exportStartedAt) / 1000).toFixed(2)} 秒`;
    if (!ensureSavedBeforeExport()) {
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
      const project = currentProject();
      const imageExportPathByIdPromise = Promise.resolve()
        .then(() => loadSvgImageExportPathById())
        .then(
          (value: any) => ({ ok: true as const, value }),
          (error: unknown) => ({ ok: false as const, error })
        );
      const exportOptions = buildEFileExportOptionsFromLibrary({
        libraryTemplates,
        labels: PARAM_LABELS,
        eDeviceDefinitionLabels,
        eDeviceDefinitionClassExportEnabled,
        eDeviceDefinitionFieldOrder,
        eDeviceDefinitionTemplateFields,
        eDeviceDefinitionTableIds,
        resolveDefinitionComponentLibrary: resolveTemplateComponentLibrary
      });
      const schemePath = typeof schemePathForScheme === "function"
        ? schemePathForScheme(activeSchemeKey)
        : [];
      const baseFilename = safeFilePart(projectName);
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
            file.mime
          ))
        });
      };
      const eFile = buildEFileExport(
        project,
        Array.isArray(schemePath) && schemePath.length > 0 ? schemePath : ["默认方案"],
        exportOptions
      );
      const warnings = Array.isArray(eFile?.warnings)
        ? eFile.warnings
        : getEExportWarnings(project, exportOptions);
      startFileWrite({
        label: "E",
        filename: `${baseFilename}.e`,
        mime: eFile.mime,
        operationLog: `导出模型文件：${baseFilename}.e`
      }, eFile.text);
      startFileWrite({
        label: "JSON",
        filename: `${baseFilename}.json`,
        mime: "application/json",
        operationLog: `导出模型文件：${baseFilename}.json`
      }, JSON.stringify(project, null, 2));
      let svgGenerationError: unknown;
      try {
        const imageExportPathByIdResult = await imageExportPathByIdPromise;
        if (!imageExportPathByIdResult.ok) {
          throw imageExportPathByIdResult.error;
        }
        const imageExportPathById = imageExportPathByIdResult.value;
        const svgText = buildSvgDocument(nodes, edges, buildSvgExportOptions({
          canvasBounds, canvasBackgroundColor, DEFAULT_CANVAS_BACKGROUND, canvasBackgroundImageUrl,
          imageExportPathById, colorPalette, libraryTemplates, layers, activeLayerId,
          backgroundPageRender, projectMeasurements, measurementConfig
        }));
        startFileWrite({
          label: "SVG",
          filename: `${baseFilename}.svg`,
          mime: "image/svg+xml",
          operationLog: `导出图形文件：${baseFilename}.svg`
        }, svgText);
      } catch (error) {
        svgGenerationError = error;
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
      if (svgGenerationError !== undefined) {
        const reason = svgGenerationError instanceof Error
          ? svgGenerationError.message
          : String(svgGenerationError ?? "未知错误");
        failures.push(`${baseFilename}.svg：${reason}`);
      }
      const warningLines = warnings.length > 0
        ? [
            "",
            `有 ${warnings.length} 个图上设备未导出到 E 文件：`,
            ...warnings.slice(0, 20).map((warning: any) => `- ${warning.nodeName}（${warning.kind}）：${warning.reason}`),
            warnings.length > 20 ? `... 还有 ${warnings.length - 20} 个设备未列出。` : ""
          ].filter(Boolean)
        : [];
      const directoryName = String(directoryHandle?.name ?? "").trim() || "已选择目录";
      if (failures.length === 0 && successCount === 3) {
        showGlobalMessage([
          "E、JSON 和 SVG 文件导出成功。",
          `目录：${directoryName}`,
          ...exportFiles.map((file) => `${file.label}：${file.filename}`),
          `总耗时：${exportElapsedText()}`,
          ...warningLines
        ].join("\n"));
        return;
      }
      showGlobalMessage([
        "部分文件导出失败。",
        `目录：${directoryName}`,
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

function showStandaloneExportCompletion(
  __appScope: Record<string, any>,
  title: string,
  message: string,
  details: string[] = []
) {
  const { setExportCompletionDialog } = __appScope;
  if (typeof setExportCompletionDialog === "function") {
    setExportCompletionDialog({
      title,
      message,
      ...(details.length > 0 ? { details } : {})
    });
    return;
  }
  showGlobalMessage([message, ...details].join("\n"));
}

// SVG 导出选项构建器，避免 createExportSvg 和 createExportSvgFile 重复
function buildSvgExportOptions(params: {
  canvasBounds: any; canvasBackgroundColor: string; DEFAULT_CANVAS_BACKGROUND: string;
  canvasBackgroundImageUrl: string; imageExportPathById: any; colorPalette: any;
  libraryTemplates: any[]; layers: any; activeLayerId: any;
  backgroundPageRender: any; projectMeasurements: any; measurementConfig: any;
}) {
  return {
    ...params.canvasBounds,
    backgroundColor: params.canvasBackgroundColor || params.DEFAULT_CANVAS_BACKGROUND,
    backgroundImage: params.canvasBackgroundImageUrl,
    imageExportPathById: params.imageExportPathById,
    colorDisplayMode: "voltage" as const,
    colorPalette: params.colorPalette,
    deviceTemplates: params.libraryTemplates,
    layers: params.layers,
    activeLayerId: params.activeLayerId,
    backgroundPage: params.backgroundPageRender,
    measurements: params.projectMeasurements,
    measurementConfig: params.measurementConfig
  };
}

export function createExportSvgFile(__appScope: Record<string, any>) {
  return async () => {
    const {
      DEFAULT_CANVAS_BACKGROUND,
      activeLayerId,
      backgroundPageRender,
      buildSvgDocument,
      canvasBackgroundColor,
      canvasBackgroundImageUrl,
      canvasBounds,
      colorPalette,
      edges,
      ensureSavedBeforeExport,
      layers,
      libraryTemplates,
      loadSvgImageExportPathById,
      measurementConfig,
      nodes,
      projectMeasurements,
      projectName,
      safeFilePart,
      saveLazyTextFile,
      saveTextFile,
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
    let svgTextPromise: Promise<string> | undefined;
    const loadSvgText = () => {
      svgTextPromise ??= Promise.resolve().then(async () => {
        const imageExportPathById = typeof loadSvgImageExportPathById === "function"
          ? await loadSvgImageExportPathById()
          : undefined;
        return buildSvgDocument(nodes, edges, buildSvgExportOptions({
          canvasBounds, canvasBackgroundColor, DEFAULT_CANVAS_BACKGROUND, canvasBackgroundImageUrl,
          imageExportPathById, colorPalette, libraryTemplates, layers, activeLayerId,
          backgroundPageRender, projectMeasurements, measurementConfig
        }));
      });
      return svgTextPromise;
    };
    const saved = typeof saveLazyTextFile === "function"
      ? await saveLazyTextFile({
          filename: `${baseFilename}.svg`,
          loadText: loadSvgText,
          mime: "image/svg+xml",
          description: "SVG 图形文件",
          extensions: [".svg"],
          preferNativeDialog: true,
          onSaveTargetReady: markSaveTargetReady
        })
      : await saveTextFile({
          filename: `${baseFilename}.svg`,
          text: await loadSvgText(),
          mime: "image/svg+xml",
          description: "SVG 图形文件",
          extensions: [".svg"],
          preferNativeDialog: true,
          onSaveTargetReady: markSaveTargetReady
        });
    if (!saved) {
      return;
    }
    writeOperationLog(`导出图形文件：${baseFilename}.svg`);
    const elapsedSeconds = ((performance.now() - exportStartedAt) / 1000).toFixed(2);
    const successMessage = `SVG 文件导出成功：${baseFilename}.svg；总耗时：${elapsedSeconds} 秒`;
    showStandaloneExportCompletion(__appScope, "SVG 文件导出完成", successMessage);
  };
}

export function createExportJsonFile(__appScope: Record<string, any>) {
  return async () => {
    const {
      currentProject,
      ensureSavedBeforeExport,
      projectName,
      safeFilePart,
      saveLazyTextFile,
      saveTextFile,
      serializeProject,
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
      jsonTextPromise ??= Promise.resolve().then(() => serializeProject(currentProject()));
      return jsonTextPromise;
    };
    const saved = typeof saveLazyTextFile === "function"
      ? await saveLazyTextFile({
          filename: `${baseFilename}.json`,
          loadText: loadJsonText,
          mime: "application/json",
          description: "JSON 模型文件",
          extensions: [".json"],
          preferNativeDialog: true,
          onSaveTargetReady: markSaveTargetReady
        })
      : await saveTextFile({
          filename: `${baseFilename}.json`,
          text: await loadJsonText(),
          mime: "application/json",
          description: "JSON 模型文件",
          extensions: [".json"],
          preferNativeDialog: true,
          onSaveTargetReady: markSaveTargetReady
        });
    if (!saved) {
      return;
    }
    writeOperationLog(`导出模型文件：${baseFilename}.json`);
    const elapsedSeconds = ((performance.now() - exportStartedAt) / 1000).toFixed(2);
    const successMessage = `JSON 文件导出成功：${baseFilename}.json；总耗时：${elapsedSeconds} 秒`;
    showStandaloneExportCompletion(__appScope, "JSON 文件导出完成", successMessage);
  };
}

export function buildEFileExportProjectSnapshot(__appScope: Record<string, any>) {
  const {
    currentProject,
    currentUnit,
    edges,
    feeder,
    modelType,
    nodes,
    powerBaseValue,
    powerUnit,
    projectName,
    subcontrolarea,
    substation,
    taiqu,
    voltageUnit
  } = __appScope;
  if (!Array.isArray(nodes) || !Array.isArray(edges)) {
    return currentProject();
  }
  return {
    version: 1,
    name: String(projectName ?? ""),
    nodes,
    edges,
    powerBaseValue,
    powerUnit,
    voltageUnit,
    currentUnit,
    subcontrolarea,
    substation,
    modelType,
    feeder,
    taiqu
  };
}

export function createExportEFile(__appScope: Record<string, any>) {
  return async () => {
    const {
      activeSchemeKey,
      buildEFileExport,
      eDeviceDefinitionClassExportEnabled,
      eDeviceDefinitionFieldOrder,
      eDeviceDefinitionLabels,
      eDeviceDefinitionTableIds,
      eDeviceDefinitionTemplateFields,
      ensureSavedBeforeExport,
      getEExportWarnings,
      libraryTemplates,
      PARAM_LABELS,
      projectName,
      resolveTemplateComponentLibrary,
      safeFilePart,
      saveLazyTextFile,
      saveTextFile,
      schemePathForScheme,
      writeOperationLog
    } = __appScope;
    let exportStartedAt = performance.now();
    const markSaveTargetReady = () => {
      exportStartedAt = performance.now();
    };
    if (!ensureSavedBeforeExport()) {
      return;
    }

    const generatedFilePromise = Promise.resolve().then(() => {
      const project = buildEFileExportProjectSnapshot(__appScope);
      const exportOptions = buildEFileExportOptionsFromLibrary({
        libraryTemplates,
        labels: PARAM_LABELS,
        eDeviceDefinitionLabels,
        eDeviceDefinitionClassExportEnabled,
        eDeviceDefinitionFieldOrder,
        eDeviceDefinitionTemplateFields,
        eDeviceDefinitionTableIds,
        resolveDefinitionComponentLibrary: resolveTemplateComponentLibrary
      });
      const schemePath = typeof schemePathForScheme === "function"
        ? schemePathForScheme(activeSchemeKey)
        : [];
      const file = buildEFileExport(
        project,
        Array.isArray(schemePath) && schemePath.length > 0 ? schemePath : ["默认方案"],
        exportOptions
      );
      return {
        file,
        warnings: Array.isArray(file?.warnings)
          ? file.warnings
          : getEExportWarnings(project, exportOptions)
      };
    });
    const filenameBase = typeof safeFilePart === "function"
      ? safeFilePart(String(projectName ?? ""))
      : String(projectName ?? "").trim().replace(/[\\/:*?"<>|]+/g, "_") || "未命名";
    const saved = typeof saveLazyTextFile === "function"
      ? await saveLazyTextFile({
          filename: `${filenameBase}.e`,
          loadText: async () => (await generatedFilePromise).file.text,
          mime: "text/plain",
          description: "E 模型文件",
          extensions: [".e"],
          encoding: "gbk",
          preferNativeDialog: true,
          onSaveTargetReady: markSaveTargetReady
        })
      : await (async () => {
          const { file } = await generatedFilePromise;
          return saveTextFile({
            filename: file.filename,
            text: file.text,
            mime: file.mime,
            description: "E 模型文件",
            extensions: [".e"],
            encoding: "gbk",
            preferNativeDialog: true,
            onSaveTargetReady: markSaveTargetReady
          });
        })();
    if (!saved) {
      return;
    }
    const { file, warnings } = await generatedFilePromise;
    writeOperationLog(`导出模型文件：${file.filename}`);
    const elapsedSeconds = ((performance.now() - exportStartedAt) / 1000).toFixed(2);
    const successMessage = `E 文件导出成功：${file.filename}；总耗时：${elapsedSeconds} 秒`;
    const warningDetails = warnings.length > 0
      ? [
        `有 ${warnings.length} 个图上设备未导出到 E 文件：`,
        ...warnings.slice(0, 20).map((warning) => `- ${warning.nodeName}（${warning.kind}）：${warning.reason}`),
        warnings.length > 20 ? `... 还有 ${warnings.length - 20} 个设备未列出。` : ""
      ].filter(Boolean)
      : [];
    showStandaloneExportCompletion(__appScope, "E 文件导出完成", successMessage, warningDetails);
  };
}

export function createExportEDeviceDefinitionFile(__appScope: Record<string, any>) {
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
    const saved = await saveTextFile({
      filename: file.filename,
      text: file.text,
      mime: file.mime,
      description: "E 元件定义文件",
      extensions: [".e"],
      encoding: "gbk"
    });
    if (!saved) {
      return;
    }
    writeOperationLog(`导出元件定义文件：${file.filename}`);
    showGlobalMessage(`元件定义文件导出成功：${file.filename}`);
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
          deviceDefinitionKeyForTemplate: __appScope.deviceDefinitionKeyForTemplate,
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
export function createProgrammaticExportEDeviceDefinition(__appScope: Record<string, any>) {
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
export function createProgrammaticImportEDeviceDefinition(__appScope: Record<string, any>) {
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
      showGlobalMessage(error instanceof Error ? `导入方案失败：${error.message}` : "导入方案失败。");
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
      showGlobalMessage(error instanceof Error ? `导入模型文件失败：${error.message}` : "导入模型文件失败。");
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
      showGlobalMessage(error instanceof Error ? `从 SVG 生成模型失败：${error.message}` : "从 SVG 生成模型失败。");
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
  const { DEFAULT_CANVAS_BACKGROUND, PARAM_LABELS, backgroundPageRender, buildEFileExport, buildSvgDocument, colorPalette, downloadBackendSchemeArchive, eDeviceDefinitionClassExportEnabled, eDeviceDefinitionFieldOrder, eDeviceDefinitionLabels, eDeviceDefinitionTableIds, eDeviceDefinitionTemplateFields, fetchBackendProjectRecord, flattenSavedProjects, isPickerAbort, libraryTemplates, loadSvgImageExportPathById, measurementConfig, resolveTemplateComponentLibrary, safeFilePart, saveBackendProjectArtifacts, savedProjectRecordIsSummary, schemePathForRecord, schemePathForScheme, schemes, writeOperationLog } = __appScope;
    try {
      const schemePath = schemePathForRecord(scheme);
      // 导出前用前端逻辑刷新方案下所有模型的 SVG/E，保证与右上角导出按钮产物一致
      try {
        const imageExportPathById = typeof loadSvgImageExportPathById === "function" ? await loadSvgImageExportPathById() : {};
        const eFileExportOptions = buildEFileExportOptionsFromLibrary({
          libraryTemplates,
          labels: PARAM_LABELS,
          eDeviceDefinitionLabels,
          eDeviceDefinitionClassExportEnabled,
          eDeviceDefinitionFieldOrder,
          eDeviceDefinitionTemplateFields,
          eDeviceDefinitionTableIds,
          resolveDefinitionComponentLibrary: resolveTemplateComponentLibrary
        });
        const findOwnerSchemeForProject = (root: SavedSchemeRecord, projectId: string): SavedSchemeRecord | null => {
          if (root.projects?.some((p) => p.id === projectId)) return root;
          for (const child of (root as any).children ?? []) {
            const found = findOwnerSchemeForProject(child, projectId);
            if (found) return found;
          }
          return null;
        };
        for (const record of flattenSavedProjects([scheme])) {
          try {
            const ownerScheme = findOwnerSchemeForProject(scheme, record.id) ?? scheme;
            const ownerPath = typeof schemePathForScheme === "function" ? schemePathForScheme(ownerScheme.id) : schemePath;
            let projectRecord = record;
            if (typeof savedProjectRecordIsSummary === "function" && savedProjectRecordIsSummary(record)) {
              projectRecord = await fetchBackendProjectRecord(ownerPath, record.name);
            }
            const project = projectRecord?.project;
            if (!project) continue;
            const svg = buildSvgDocument(project.nodes ?? [], project.edges ?? [], {
              width: project.canvasWidth ?? 1920,
              height: project.canvasHeight ?? 1024,
              backgroundColor: project.canvasBackgroundColor || DEFAULT_CANVAS_BACKGROUND,
              backgroundImage: project.canvasBackgroundImage,
              imageExportPathById,
              colorDisplayMode: "voltage",
              colorPalette,
              deviceTemplates: libraryTemplates,
              layers: project.layers,
              activeLayerId: project.activeLayerId,
              backgroundPage: backgroundPageRender,
              measurements: project.measurements,
              measurementConfig
            });
            const eResult = buildEFileExport(
              project,
              ownerPath && ownerPath.length > 0 ? ownerPath : ["默认方案"],
              eFileExportOptions
            );
            await saveBackendProjectArtifacts(ownerPath, projectRecord.name, { svg, eFile: eResult?.text });
          } catch (error) {
            // eslint-disable-next-line no-console
            console.error(`刷新方案模型 SVG/E 失败（${record.name}）：`, error);
          }
        }
      } catch (error) {
        // 刷新失败不阻止导出；提示用户，压缩包内仍是磁盘现有内容
        // eslint-disable-next-line no-console
        console.warn("导出前刷新方案 SVG/E 失败：", error);
      }
      const saved = await downloadBackendSchemeArchive(schemePath, `${safeFilePart(scheme.name)}.zip`);
      if (!saved) {
        return;
      }
      writeOperationLog(`导出方案：${scheme.name}`);
      showGlobalMessage(`已导出方案“${scheme.name}”，共 ${flattenSavedProjects([scheme]).length} 个模型。`);
    } catch (error) {
      if (isPickerAbort(error)) {
        return;
      }
      showGlobalMessage(error instanceof Error ? `导出方案失败：${error.message}` : "导出方案失败。");
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
      updateGraphNodeById(imageTarget.nodeId, (node) =>
        imageTarget.kind === "nodeForeground"
          ? { ...node, params: { ...node.params, foregroundImageAssetId: assetId, foregroundImage: imageData } }
          : { ...node, params: { ...node.params, backgroundImageAssetId: assetId, backgroundImage: imageData } }
      );
    }
    setImageTarget(null);
  };
}

export function stateIconDrawingImportedSvgSelectionFrame(element: any) {
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
  const { activeImageFolderId, imageFolders, refreshImageFolders, renameBackendImageFolder, requireEditMode } = __appScope;
    if (!requireEditMode("重命名图片文件夹")) {
      return;
    }
    const folder = imageFolders.find((item) => item.id === activeImageFolderId);
    if (!folder || folder.id === "root") {
      showGlobalMessage("默认文件夹不能重命名。");
      return;
    }
    const inputName = window.prompt("请输入新的图片文件夹名称", folder.name);
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
  const { activeImageFolderId, deleteBackendImageFolder, imageFolders, refreshImageFolders, requireEditMode, setActiveImageFolderId } = __appScope;
    if (!requireEditMode("删除图片文件夹")) {
      return;
    }
    const folder = imageFolders.find((item) => item.id === activeImageFolderId);
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
    const imageAssetId = customDeviceDraft.backgroundImageAssetId && image === apiPath(`/images/${customDeviceDraft.backgroundImageAssetId}`)
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
    const bodyReachX = outwardOffsetX * 2.6;
    const bodyReachY = outwardOffsetY * 2.6;
    if (Math.abs(boundaryAnchor.x) >= Math.abs(boundaryAnchor.y)) {
      return {
        from: {
          x: from.x - Math.sign(boundaryAnchor.x || 1) * bodyReachX,
          y: from.y
        },
        to: {
          x: from.x + Math.sign(boundaryAnchor.x || 1) * outwardOffsetX,
          y: from.y
        },
      };
    }
    return {
      from: {
        x: from.x,
        y: from.y - Math.sign(boundaryAnchor.y || 1) * bodyReachY
      },
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
      imageAssetId: sourceImageAssetId && sourceImage === apiPath(`/images/${sourceImageAssetId}`) ? sourceImageAssetId : sourceImage ? "" : sourceImageAssetId,
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
    const componentLibraryTemplates = libraryTemplates.filter((template) => {
      const templateComponentLibrary = normalizeComponentLibraryName(resolveTemplateComponentLibrary(template));
      const derivedInfo = templateDerivedComponentLibraryInfo(template);
      const derivedComponentLibrary = normalizeComponentLibraryName(derivedInfo?.derivedComponentLibrary ?? "");
      return templateComponentLibrary === sectionKey || derivedComponentLibrary === sectionKey;
    });
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
        const definitionKey = deviceDefinitionSharedKeyForTemplate(template);
        const existingOverride = deviceDefinitionOverrideForTemplate(template, next);
        const parameterDefinitions = getTemplateParameterDefinitions(template).map((definition) =>
          definition.enName === enName ? applyPatch(definition) : definition
        );
        next[definitionKey] = {
          ...(next[definitionKey] ?? {}),
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
  const { closeCustomDeviceDialog } = __appScope;
    closeCustomDeviceDialog();
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
        const existingOverride = current[targetKind];
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
        const existingOverride = current[selectedDefinitionTemplate.kind];
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
      showGlobalMessage(message);
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
    const parameterDefinitions = getTemplateParameterDefinitions(selectedDefinitionTemplate);
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
        const existingExactOverride = current[selectedDefinitionTemplate.kind];
        return {
          ...current,
          [selectedDefinitionTemplate.kind]: {
            ...existingExactOverride,
            kind: selectedDefinitionTemplate.kind,
            params: {
              ...(existingExactOverride?.params ?? {}),
              ...backgroundParams
            },
            size,
            terminalType: terminalTypes[0] ?? selectedDefinitionTemplate.terminalType,
            terminalCount: definitionVisualDraft.terminalCount,
            terminalTypes,
            terminalLabels,
            terminalAnchors,
            terminalRoles: existingExactOverride?.terminalRoles ?? selectedDefinitionTemplate.terminalRoles,
            terminalAssociations: existingExactOverride?.terminalAssociations ?? selectedDefinitionTemplate.terminalAssociations,
            isContainer: existingExactOverride?.isContainer ?? selectedDefinitionTemplate.isContainer,
            allowResizeTransform: existingExactOverride?.allowResizeTransform ?? templateAllowsResizeTransform(selectedDefinitionTemplate),
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
  const { ALLOW_RESIZE_TRANSFORM_PARAM, createDefinitionDraftRows, definitionDraftRows, definitionDraftSection, deviceDefinitionKeyForTemplate, deviceDefinitionOverrideForTemplate, deviceDefinitionRowId, getTemplateParameterDefinitions, isReservedDeviceDefinitionParamName, libraryTemplates, measurementConfig, measurementConfigDraft, measurementConfigDraftRef, normalizeComponentLibraryName, normalizeDefinitionRowEnumFields, requireEditMode, selectedDefinitionTemplate, setDefinitionDraftError, setDefinitionDraftRows, setDeviceDefinitionOverrides, syncExistingNodesWithTemplateDefinitions, templateAllowsResizeTransform } = __appScope;
    if (!requireEditMode("保存元件定义")) {
      return;
    }
    if (!selectedDefinitionTemplate) {
      return;
    }
    const derivedInfo = templateDerivedComponentLibraryInfo(selectedDefinitionTemplate);
    const baseDuplicateRow = derivedInfo
      ? findDerivedDefinitionBaseParameterDuplicate(definitionDraftRows, selectedDefinitionTemplate, {
          libraryTemplates,
          getTemplateParameterDefinitions
        })
      : null;
    if (baseDuplicateRow) {
      setDefinitionDraftError(derivedDefinitionBaseParameterDuplicateMessage(baseDuplicateRow, selectedDefinitionTemplate));
      return;
    }
    const rowsForSave = definitionDraftRows;
    const definitionComplianceMessage = deviceParameterDefinitionsComplianceMessage(rowsForSave);
    if (definitionComplianceMessage) {
      setDefinitionDraftError(definitionComplianceMessage);
      return;
    }
    const normalizedRows: DeviceParameterDefinition[] = [];
    const seenNames = new Set<string>();
    for (const row of rowsForSave) {
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
    const overrideKey = deviceDefinitionSharedKeyForTemplate(selectedDefinitionTemplate);
    const paramsSeed = derivedInfo
      ? {
          component_type: derivedInfo.componentLibrary || derivedInfo.baseComponentLibrary,
          derived_from_component_type: derivedInfo.baseComponentLibrary,
          derived_component_type: derivedInfo.derivedComponentLibrary,
          derived_component_library_label: derivedInfo.label,
          is_derived_component_library: "1"
        }
      : {
          component_type: definitionKey
        };
    const params = normalizedRows.reduce<Record<string, string>>((acc, row) => {
      if (row.enName !== "name") {
        acc[row.enName] = row.typicalValue;
      }
      return acc;
    }, paramsSeed);
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
    const previousDefinitions = derivedInfo && typeof createDefinitionDraftRows === "function"
      ? createDefinitionDraftRows(selectedDefinitionTemplate)
      : getTemplateParameterDefinitions(selectedDefinitionTemplate);
    syncExistingNodesWithTemplateDefinitions(
      { parameterDefinitions: normalizedRows },
      previousDefinitions,
      (node) => {
        const nodeTemplate = libraryTemplates.find((template) => template.kind === node.kind);
        return Boolean(nodeTemplate && deviceTemplatesShareParameterDefinitions(selectedDefinitionTemplate, nodeTemplate));
      }
    );
    setDeviceDefinitionOverrides((current) => {
      const next = { ...current };
      const existingOverride = current[overrideKey];
      for (const peer of libraryTemplates.filter((template) => deviceTemplatesShareParameterDefinitions(selectedDefinitionTemplate, template))) {
        if (!next[peer.kind] || peer.kind === overrideKey) continue;
        const peerOverride = { ...next[peer.kind] };
        delete peerOverride.parameterDefinitions;
        delete peerOverride.measurementDefinitions;
        next[peer.kind] = peerOverride;
      }
      next[overrideKey] = {
        ...existingOverride,
        kind: overrideKey,
        params: {
          ...(existingOverride?.params ?? {}),
          ...params
        },
        parameterDefinitions: normalizedRows,
        updatedAt: new Date().toISOString()
      };
      return normalizeSharedDeviceDefinitionOverrides(next, libraryTemplates);
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
    const definitionKey = deviceDefinitionSharedKeyForTemplate(selectedDefinitionBaseTemplate);
    setDeviceDefinitionOverrides((current) => {
      const next = { ...current };
      delete next[definitionKey];
      for (const peer of (__appScope.libraryTemplates ?? []).filter((template: DeviceTemplate) => (
        deviceTemplatesShareParameterDefinitions(selectedDefinitionBaseTemplate, template)
      ))) {
        if (!next[peer.kind]) continue;
        const peerOverride = { ...next[peer.kind] };
        delete peerOverride.parameterDefinitions;
        delete peerOverride.measurementDefinitions;
        next[peer.kind] = peerOverride;
      }
      return normalizeSharedDeviceDefinitionOverrides(next, __appScope.libraryTemplates ?? []);
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
        showGlobalMessage(error instanceof Error ? error.message : "上传元件图标到后台失败，将仅保留当前本地预览。");
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
        showGlobalMessage(error instanceof Error ? error.message : "上传元件图标到后台失败，将仅保留当前本地预览。");
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
        showGlobalMessage(error instanceof Error ? error.message : "上传状态图形到后台失败，将仅保留当前本地预览。");
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
      // 位图：上传到图片库并引用 /webgrp/images，避免把 base64 位图内联进状态图标 SVG（library.json 膨胀根因）。
      let href = source;
      try {
        const uploadedAsset = await uploadBackendImage(file.name, source, activeImageFolderId);
        href = uploadedAsset.url;
        setImageAssetList((current) => [uploadedAsset, ...current.filter((item) => item.id !== uploadedAsset.id)]);
        setImageAssets((current) => ({ ...current, [uploadedAsset.id]: uploadedAsset.url }));
        void refreshImageFolders();
      } catch (error) {
        showGlobalMessage(error instanceof Error ? error.message : "上传图片到后台失败，将以本地预览嵌入。");
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
  let cachedSvg: SVGSVGElement | null = null;
  let cachedPoint: SVGPoint | null = null;
  let cachedInverse: DOMMatrix | null = null;
  return (event: PointerEvent<SVGElement>): Point => {
  const { stateIconDrawingSvgRef } = __appScope;
    const svg = stateIconDrawingSvgRef.current;
    if (!svg) {
      return { x: 0, y: 0 };
    }
    if (svg !== cachedSvg) {
      cachedSvg = svg;
      cachedPoint = svg.createSVGPoint();
      cachedInverse = null;
    }
    cachedPoint.x = event.clientX;
    cachedPoint.y = event.clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) {
      return { x: 0, y: 0 };
    }
    if (!cachedInverse) {
      cachedInverse = ctm.inverse();
    }
    const transformed = cachedPoint.matrixTransform(cachedInverse);
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
  return (event: PointerEvent<SVGElement>, elementId: string, mode: StateIconDrawingDragMode, handleOffset?: Point) => {
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
    stateIconDrawingDragRef.current = { mode, elementIds: dragIds, start, center, startElements, handleOffset };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };
}

export function createDragStateIconDrawingSelection(__appScope: Record<string, any>) {
  let rafId: number | null = null;
  let pendingEvent: PointerEvent<SVGSVGElement> | null = null;

  const processDrag = (event: PointerEvent<SVGSVGElement>) => {
  const { computeStateIconDrawingSmartAlignmentSnap, setStateIconDrawingDialog, stateIconDrawingDragDeltaRef, stateIconDrawingDragRef, stateIconDrawingPointer } = __appScope;
    const drag = stateIconDrawingDragRef.current;
    if (!drag) {
      return;
    }
    event.preventDefault();
    const point = stateIconDrawingPointer(event);
    const dx = point.x - drag.start.x;
    const dy = point.y - drag.start.y;
    if (drag.mode === "move") {
      const snap = computeStateIconDrawingSmartAlignmentSnap
        ? computeStateIconDrawingSmartAlignmentSnap({
            elements: drag.startElements,
            selectedIds: drag.elementIds,
            startElements: drag.startElements,
            delta: { x: dx, y: dy }
          })
        : { delta: { x: dx, y: dy }, guides: [] };
      const overrides: Record<string, { x: number; y: number }> = {};
      for (const startElement of drag.startElements) {
        overrides[startElement.id] = { x: startElement.x + snap.delta.x, y: startElement.y + snap.delta.y };
      }
      stateIconDrawingDragDeltaRef.current = { overrides, guides: snap.guides };
      setStateIconDrawingDialog((current) => current ? { ...current, _dragTick: (current._dragTick ?? 0) + 1 } : current);
      return;
    }
    if (drag.mode === "resize" || drag.mode === "resize-top" || drag.mode === "resize-bottom" || drag.mode === "resize-left" || drag.mode === "resize-right") {
      const overrides: Record<string, { x: number; y: number; width: number; height: number }> = {};
      for (const startElement of drag.startElements) {
        if (drag.mode === "resize") {
          const startDistance = Math.hypot(drag.start.x - drag.center.x, drag.start.y - drag.center.y) || 1;
          const currentDistance = Math.hypot(point.x - drag.center.x, point.y - drag.center.y) || 1;
          const scale = Math.max(0.05, currentDistance / startDistance);
          overrides[startElement.id] = {
            x: drag.center.x + (startElement.x - drag.center.x) * scale,
            y: drag.center.y + (startElement.y - drag.center.y) * scale,
            width: Math.max(1, startElement.width * scale),
            height: Math.max(1, startElement.height * scale)
          };
          continue;
        }
        const rad = -(startElement.rotation * Math.PI) / 180;
        const localDx = dx * Math.cos(rad) - dy * Math.sin(rad);
        const localDy = dx * Math.sin(rad) + dy * Math.cos(rad);
        const fullWidth = Math.max(1, startElement.width);
        const fullHeight = Math.max(1, startElement.height);
        let newWidth = fullWidth;
        let newHeight = fullHeight;
        let localCenterShiftX = 0;
        let localCenterShiftY = 0;
        const wHandle = Math.abs(drag.handleOffset?.x ?? fullWidth / 2) || fullWidth / 2;
        const hHandle = Math.abs(drag.handleOffset?.y ?? fullHeight / 2) || fullHeight / 2;
        switch (drag.mode) {
          case "resize-right":
            newWidth = Math.max(1, fullWidth + fullWidth * localDx / (2 * wHandle));
            localCenterShiftX = localDx / 2;
            break;
          case "resize-left":
            newWidth = Math.max(1, fullWidth - fullWidth * localDx / (2 * wHandle));
            localCenterShiftX = localDx / 2;
            break;
          case "resize-bottom":
            newHeight = Math.max(1, fullHeight + fullHeight * localDy / (2 * hHandle));
            localCenterShiftY = localDy / 2;
            break;
          case "resize-top":
            newHeight = Math.max(1, fullHeight - fullHeight * localDy / (2 * hHandle));
            localCenterShiftY = localDy / 2;
            break;
        }
        const fwdRad = (startElement.rotation * Math.PI) / 180;
        const centerShiftX = localCenterShiftX * Math.cos(fwdRad) - localCenterShiftY * Math.sin(fwdRad);
        const centerShiftY = localCenterShiftX * Math.sin(fwdRad) + localCenterShiftY * Math.cos(fwdRad);
        overrides[startElement.id] = {
          x: startElement.x + centerShiftX,
          y: startElement.y + centerShiftY,
          width: newWidth,
          height: newHeight
        };
      }
      stateIconDrawingDragDeltaRef.current = { overrides };
      setStateIconDrawingDialog((current) => current ? { ...current, _dragTick: (current._dragTick ?? 0) + 1 } : current);
      return;
    }
    const startAngle = Math.atan2(drag.start.y - drag.center.y, drag.start.x - drag.center.x);
    const currentAngle = Math.atan2(point.y - drag.center.y, point.x - drag.center.x);
    const deltaAngle = ((currentAngle - startAngle) * 180) / Math.PI;
    const overrides: Record<string, { rotation: number }> = {};
    for (const startElement of drag.startElements) {
      overrides[startElement.id] = { rotation: startElement.rotation + deltaAngle };
    }
    stateIconDrawingDragDeltaRef.current = { overrides };
    setStateIconDrawingDialog((current) => current ? { ...current, _dragTick: (current._dragTick ?? 0) + 1 } : current);
  };

  return (event: PointerEvent<SVGSVGElement>) => {
    pendingEvent = event;
    if (!rafId) {
      rafId = requestAnimationFrame(() => {
        rafId = null;
        if (pendingEvent) {
          const e = pendingEvent;
          pendingEvent = null;
          processDrag(e);
        }
      });
    }
  };
}

export function createStopStateIconDrawingDrag(__appScope: Record<string, any>) {
  return (event: PointerEvent<SVGSVGElement>) => {
  const { setStateIconDrawingDialog, stateIconDrawingDragDeltaRef, stateIconDrawingDragRef } = __appScope;
    const delta = stateIconDrawingDragDeltaRef.current;
    stateIconDrawingDragRef.current = null;
    stateIconDrawingDragDeltaRef.current = null;
    if (delta?.overrides) {
      const overrides = delta.overrides;
      setStateIconDrawingDialog((current: any) => {
        if (!current) return current;
        return {
          ...current,
          smartAlignmentGuides: [],
          elements: current.elements.map((element: any) => {
            const ovr = overrides[element.id];
            return ovr ? { ...element, ...ovr } : element;
          })
        };
      });
    } else {
      setStateIconDrawingDialog?.((current: any) => current ? { ...current, smartAlignmentGuides: [] } : current);
    }
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
  const { DEFAULT_STATE_PAGE_ID, cancelPendingCustomComponentTemplateLoad, defaultComponentLibraryForCategoryLibrary, ensureCustomComponentTreeExpanded, normalizeCategoryLibraryName, normalizeComponentLibraryName, setCustomComponentTreeSelection, setCustomDeviceDraft, setCustomDeviceStatePageId, setEditingCustomDeviceKind } = __appScope;
    cancelPendingCustomComponentTemplateLoad();
    const group = normalizeCategoryLibraryName(categoryLibraryName);
    const section = defaultComponentLibraryForCategoryLibrary(group);
    const libraryDraftPatch = customDeviceDraftPatchForComponentLibrarySelection(__appScope, section);
    if (options.expand !== false) {
      ensureCustomComponentTreeExpanded(group);
    }
    setCustomComponentTreeSelection({ kind: "categoryLibrary", categoryLibraryName: group });
    setEditingCustomDeviceKind("");
    setCustomDeviceStatePageId(DEFAULT_STATE_PAGE_ID);
    setCustomDeviceDraft((current) => ({
      ...current,
      categoryLibraryName: group,
      componentLibrary: normalizeComponentLibraryName(section),
      componentName: "",
      componentKind: "",
      ...libraryDraftPatch,
      isDerivedComponentLibrary: false,
      derivedFromComponentLibrary: "",
      derivedComponentLibrary: "",
      derivedComponentLibraryLabel: "",
      error: ""
    }));
  };
}

function customDeviceDraftPatchForComponentLibrarySelection(__appScope: Record<string, any>, sectionName: string) {
  const {
    createCustomDeviceDraftFromTemplate,
    libraryTemplates = [],
    normalizeComponentLibraryName = (value: unknown) => String(value ?? "").trim(),
    resolveTemplateComponentLibrary
  } = __appScope;
  const section = normalizeComponentLibraryName(sectionName);
  const matchingTemplates = (libraryTemplates ?? []).filter((template: any) =>
    normalizeComponentLibraryName(
      typeof resolveTemplateComponentLibrary === "function"
        ? resolveTemplateComponentLibrary(template)
        : inferESection(template.kind, template.params ?? {})
    ) === section
  );
  const representativeTemplate =
    matchingTemplates.find((template: any) => !templateDerivedComponentLibraryInfo(template)) ??
    matchingTemplates[0];
  if (!representativeTemplate || typeof createCustomDeviceDraftFromTemplate !== "function") {
    return {
      params: [],
      stateDefinitions: []
    };
  }
  const representativeDraft = createCustomDeviceDraftFromTemplate(representativeTemplate, section);
  return {
    size: representativeDraft.size,
    allowResizeTransform: representativeDraft.allowResizeTransform,
    terminalCount: representativeDraft.terminalCount,
    terminalTypes: representativeDraft.terminalTypes,
    terminalLabels: representativeDraft.terminalLabels,
    terminalAnchors: representativeDraft.terminalAnchors,
    terminalRoles: representativeDraft.terminalRoles,
    terminalAssociations: representativeDraft.terminalAssociations,
    isContainer: representativeDraft.isContainer,
    params: representativeDraft.params ?? [],
    stateDefinitions: []
  };
}

export function createSelectCustomComponentLibrary(__appScope: Record<string, any>) {
  return (categoryLibraryName: string, sectionName: string, options: { expand?: boolean } = {}) => {
  const { DEFAULT_STATE_PAGE_ID, cancelPendingCustomComponentTemplateLoad, ensureCustomComponentTreeExpanded, normalizeCategoryLibraryName, normalizeComponentLibraryName, setCustomComponentTreeSelection, setCustomDeviceDraft, setCustomDeviceStatePageId, setCustomDeviceDialogView, setEditingCustomDeviceKind } = __appScope;
    cancelPendingCustomComponentTemplateLoad();
    const group = normalizeCategoryLibraryName(categoryLibraryName);
    const section = normalizeComponentLibraryName(sectionName);
    const libraryDraftPatch = customDeviceDraftPatchForComponentLibrarySelection(__appScope, section);
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
      componentKind: "",
      ...libraryDraftPatch,
      isDerivedComponentLibrary: false,
      derivedFromComponentLibrary: "",
      derivedComponentLibrary: "",
      derivedComponentLibraryLabel: "",
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
  const { customComponentTreeSelection, defaultComponentLibraryForCategoryLibrary, nextCustomTemplateKind, normalizeCategoryLibraryName, normalizeComponentLibraryName = (value: unknown) => String(value ?? "").trim(), requireEditMode, setCustomLibraryCreateDialog } = __appScope;
    if (!requireEditMode("新建元件")) {
      return;
    }
    const categoryLibraryName = normalizeCategoryLibraryName(customComponentTreeSelection.categoryLibraryName);
    const section =
      customComponentTreeSelection.kind === "componentLibrary" || customComponentTreeSelection.kind === "component"
        ? customComponentTreeSelection.section
        : defaultComponentLibraryForCategoryLibrary(categoryLibraryName);
    const baseComponentLibrary = normalizeComponentLibraryName(section);
    setCustomLibraryCreateDialog({
      kind: "component",
      title: "新建元件",
      cnName: "",
      enName: nextCustomTemplateKind(baseComponentLibrary),
      categoryLibraryName,
      componentLibrary: baseComponentLibrary,
      isDerivedComponentLibrary: false,
      derivedFromComponentLibrary: baseComponentLibrary,
      derivedComponentLibrary: "",
      derivedComponentLibraryLabel: "",
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
        return setDialogError("英文名称只能包含英文字母、数字、下划线和中划线，并且必须以英文字母开头。");
      }
      setCustomCategoryLibraries((current: string[]) => normalizeCustomCategoryLibraries([...current, categoryLibraryName]));
      setExpandedCategoryLibraries((current: string[]) => Array.from(new Set([...current, categoryLibraryName])));
      setCustomComponentTreeSelection({ kind: "categoryLibrary", categoryLibraryName });
      setCustomDeviceDraft((current: any) => ({
        ...current,
        categoryLibraryName,
        componentLibrary: "",
        isDerivedComponentLibrary: false,
        derivedFromComponentLibrary: "",
        derivedComponentLibrary: "",
        derivedComponentLibraryLabel: "",
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
        return setDialogError("英文名称只能包含英文字母、数字、下划线和中划线，并且必须以英文字母开头。");
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
        isDerivedComponentLibrary: false,
        derivedFromComponentLibrary: "",
        derivedComponentLibrary: "",
        derivedComponentLibraryLabel: "",
        error: ""
      }));
      setCustomLibraryCreateDialog(null);
      return true;
    }

    const categoryLibraryName = normalizeCategoryLibraryName(dialog.categoryLibraryName || customDeviceDraft.categoryLibraryName);
    const derivedRequested = Boolean(dialog.isDerivedComponentLibrary);
    const section = normalizeComponentLibraryName(
      (derivedRequested ? dialog.derivedFromComponentLibrary : "") ||
      dialog.componentLibrary ||
      customDeviceDraft.componentLibrary ||
      defaultComponentLibraryForCategoryLibrary(categoryLibraryName)
    );
    if (!section) {
      return setDialogError("请选择元件库。");
    }
    if (!CUSTOM_DEVICE_KIND_NAME_PATTERN.test(englishName)) {
      return setDialogError("元件英文名称只能包含英文字母、数字、下划线和短横线，并且必须以英文字母开头。");
    }
    const derivedComponentLibrary = normalizeComponentLibraryName(dialog.derivedComponentLibrary ?? "");
    const derivedComponentLibraryLabel = String(dialog.derivedComponentLibraryLabel ?? "").trim();
    if (derivedRequested) {
      if (!derivedComponentLibrary) {
        return setDialogError("请输入或选择派生类英文名称。");
      }
      if (!isValidComponentLibraryName(derivedComponentLibrary)) {
        return setDialogError("派生类英文名称只能包含英文字母、数字、下划线和中划线，并且必须以英文字母开头。");
      }
      if (derivedComponentLibrary.toLowerCase() === section.toLowerCase()) {
        return setDialogError("派生类英文名称不能与基类元件库相同。");
      }
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
    const emptyDraft = createEmptyCustomDeviceDraft(categoryLibraryName);
    const nextDraft = {
      ...emptyDraft,
      componentLibrary: section,
      componentName: chineseName,
      componentKind: englishName,
      isDerivedComponentLibrary: derivedRequested,
      derivedFromComponentLibrary: derivedRequested ? section : "",
      derivedComponentLibrary: derivedRequested ? derivedComponentLibrary : "",
      derivedComponentLibraryLabel: derivedRequested ? derivedComponentLibraryLabel : "",
      isContainer: emptyDraft.isContainer,
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
  return async (targetCategoryLibraryName?: string) => {
  const { PROTECTED_CATEGORY_LIBRARIES, customComponentLibraries, customDeviceDraft, customDeviceTemplates, defaultComponentLibraryForCategoryLibrary, isBuiltInComponentLibrary, normalizeCategoryLibraryName, requireEditMode, resolveTemplateComponentLibrary, setCollapsedCustomComponentTreeLibraries, setCollapsedCustomComponentTreeTypes, setCustomCategoryLibraries, setCustomComponentTreeSelection, setCustomComponentLibraries, setCustomDeviceDraft, setCustomDeviceTemplates, setDefinitionDraftSection, setDeviceDefinitionOverrides, setEditingCustomDeviceKind, setExpandedCategoryLibraries, setExpandedDefinitionGroups, setSelectedDefinitionKind } = __appScope;
    if (targetCategoryLibraryName === undefined) {
      targetCategoryLibraryName = customDeviceDraft.categoryLibraryName;
    }
    if (!requireEditMode("删除类别库")) {
      return;
    }
    const categoryLibraryName = normalizeCategoryLibraryName(targetCategoryLibraryName);
    if (!categoryLibraryName || categoryLibraryName === "静态图元" || PROTECTED_CATEGORY_LIBRARIES.has(categoryLibraryName)) {
      showGlobalMessage("默认类别库无法删除。");
      return;
    }
    const templatesInGroup = customDeviceTemplates.filter((template) => normalizeCategoryLibraryName(template.categoryLibrary) === categoryLibraryName);
    const confirmed = await showGlobalConfirm(
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
      isDerivedComponentLibrary: false,
      derivedFromComponentLibrary: "",
      derivedComponentLibrary: "",
      derivedComponentLibraryLabel: "",
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
  return async (targetSection?: string) => {
  const { E_SECTION_OPTIONS, customComponentTreeSelection, customDeviceDraft, defaultComponentLibraryForCategoryLibrary, libraryTemplates, normalizeCategoryLibraryName, normalizeComponentLibraryName, requireEditMode, resolveTemplateComponentLibrary, setCollapsedCustomComponentTreeTypes, setCustomComponentTreeSelection, setCustomComponentLibraries, setCustomDeviceDraft, setCustomDeviceTemplates, setDefinitionDraftSection, setDeviceDefinitionOverrides, setEditingCustomDeviceKind, setSelectedDefinitionKind } = __appScope;
    if (targetSection === undefined) {
      targetSection = customDeviceDraft.componentLibrary;
    }
    if (!requireEditMode("删除元件库")) {
      return;
    }
    const componentLibrary = normalizeComponentLibraryName(targetSection);
    if (!componentLibrary || E_SECTION_OPTIONS.some((section) => section.toLowerCase() === componentLibrary.toLowerCase())) {
      showGlobalMessage("内置元件库无法删除。");
      return;
    }
    const templatesWithType = libraryTemplates.filter((template) => template.custom && resolveTemplateComponentLibrary(template).toLowerCase() === componentLibrary.toLowerCase());
    const confirmed = await showGlobalConfirm(
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
      isDerivedComponentLibrary: false,
      derivedFromComponentLibrary: "",
      derivedComponentLibrary: "",
      derivedComponentLibraryLabel: "",
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
        showGlobalMessage("系统内置类别库不能重命名。");
        return;
      }
      const rawName = window.prompt("请输入新的类别库名称", oldCategoryLibraryName);
      if (rawName === null) {
        return;
      }
      const newCategoryLibraryName = normalizeCategoryLibraryName(rawName.trim());
      if (!newCategoryLibraryName) {
        showGlobalMessage("类别库名称不能为空。");
        return;
      }
      if (categoryLibraries.some((group) => normalizeCategoryLibraryName(group).toLowerCase() === newCategoryLibraryName.toLowerCase() && normalizeCategoryLibraryName(group) !== oldCategoryLibraryName)) {
        showGlobalMessage("类别库名称已存在，无法重命名。");
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
        showGlobalMessage("系统内置元件库不能重命名。");
        return;
      }
      const rawName = window.prompt("请输入新的元件库英文名称", oldSection);
      if (rawName === null) {
        return;
      }
      const newSection = normalizeComponentLibraryName(rawName);
      if (!isValidComponentLibraryName(newSection)) {
        showGlobalMessage("元件库必须是英文名称，只能包含英文字母、数字、下划线和中划线，并且必须以英文字母开头。");
        return;
      }
      if (componentLibraryOptions.some((section) => section.toLowerCase() === newSection.toLowerCase() && section.toLowerCase() !== oldSection.toLowerCase())) {
        showGlobalMessage("元件库已存在，无法重命名。");
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
      showGlobalMessage("系统内置元件不能在这里重命名。");
      return;
    }
    const rawName = window.prompt("请输入新的元件名称", template.label);
    if (rawName === null) {
      return;
    }
    const newLabel = rawName.trim();
    if (!newLabel) {
      showGlobalMessage("元件名称不能为空。");
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
  return async () => {
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
      showGlobalMessage("系统内置元件不能在这里删除。");
      return;
    }
    const confirmed = await showGlobalConfirm(`确认删除元件“${template.label}”？`);
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
  const { ALLOW_RESIZE_TRANSFORM_PARAM, TERMINAL_TYPE_LIBRARY_LABELS, closeCustomDeviceDialog, customComponentLibraries = [], customDefaultDefinitions, customDeviceDraft, customDeviceGeneratedDefaultImageCandidates, customDeviceImageWithTerminalConnectors, customDeviceTemplates, customDeviceTerminalAnchors, defaultComponentLibraryForCategoryLibrary, editingCustomDeviceKind, ensureCustomComponentTreeExpanded, generateCustomDeviceImage, hasOverlappingCustomDeviceTerminalAnchors, isBuiltInComponentLibrary, isDerivedComponentBaseParamName, isReservedDeviceDefinitionParamName, isValidComponentLibraryName, libraryTemplates = customDeviceTemplates, measurementConfig, measurementConfigDraft, measurementConfigDraftRef, nextCustomTemplateKind, normalizeCategoryLibraryName, normalizeComponentLibraryName, normalizeContainerTerminalAssociations, normalizeCustomComponentLibraries, normalizeDefinitionRowEnumFields, persistDeviceLibraryChange, requireEditMode, setCustomComponentLibraries, setCustomComponentTreeSelection, setCustomDeviceDraft, setCustomDeviceDraftCleanBaseline = () => undefined, setCustomDeviceSaveMessage, setCustomDeviceSaveToast, customDeviceSaveToastTimerRef, setCustomDeviceTemplates, setEditingCustomDeviceKind, setExpandedCategoryLibraries, showGlobalMessage = () => undefined, syncExistingNodesWithTemplateDefinitions, syncInheritedCustomDeviceStateVisuals, validateContainerTerminalAssociations, validateStateDraftRows, writeOperationLog } = __appScope;
    if (!requireEditMode("保存元件")) {
      return false;
    }
    setCustomDeviceSaveMessage("");
    const categoryLibraryName = normalizeCategoryLibraryName(customDeviceDraft.categoryLibraryName);
    const baseComponentLibrary = normalizeComponentLibraryName(customDeviceDraft.componentLibrary);
    const derivedRequested = Boolean(customDeviceDraft.isDerivedComponentLibrary);
    const derivedComponentLibrary = normalizeComponentLibraryName(customDeviceDraft.derivedComponentLibrary ?? "");
    const derivedComponentLibraryLabel = String(customDeviceDraft.derivedComponentLibraryLabel ?? "").trim();
    const derivedFromComponentLibrary = normalizeComponentLibraryName(customDeviceDraft.derivedFromComponentLibrary || baseComponentLibrary);
    const componentLibrary = baseComponentLibrary;
    const componentLabel = customDeviceDraft.componentName.trim() || derivedComponentLibraryLabel || componentLibrary;
    const isContainerComponent = Boolean(customDeviceDraft.isContainer);
    if (!baseComponentLibrary) {
      setCustomDeviceDraft((current) => ({ ...current, error: "请选择元件库。" }));
      return false;
    }
    if (!isValidComponentLibraryName(baseComponentLibrary)) {
      setCustomDeviceDraft((current) => ({ ...current, error: "元件库必须是英文名称，只能包含英文字母、数字、下划线和中划线，并且必须以英文字母开头。" }));
      return false;
    }
    if (derivedRequested) {
      if (!derivedFromComponentLibrary) {
        setCustomDeviceDraft((current) => ({ ...current, error: "请选择派生基类。" }));
        return false;
      }
      if (!derivedComponentLibrary) {
        setCustomDeviceDraft((current) => ({ ...current, error: "请输入或选择派生类英文名称。" }));
        return false;
      }
      if (!isValidComponentLibraryName(derivedComponentLibrary)) {
        setCustomDeviceDraft((current) => ({ ...current, error: "派生类英文名称只能包含英文字母、数字、下划线和中划线，并且必须以英文字母开头。" }));
        return false;
      }
      if (derivedComponentLibrary.toLowerCase() === derivedFromComponentLibrary.toLowerCase()) {
        setCustomDeviceDraft((current) => ({ ...current, error: "派生类英文名称不能与基类元件库相同。" }));
        return false;
      }
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
    if (isContainerComponent) {
      const terminalAssociationValidation = validateContainerTerminalAssociations(terminalTypes, terminalAssociations);
      if (!terminalAssociationValidation.valid) {
        showGlobalMessage(terminalAssociationValidation.message);
        setCustomDeviceDraft((current) => ({ ...current, terminalAssociations, error: terminalAssociationValidation.message }));
        return false;
      }
    }
    if (hasOverlappingCustomDeviceTerminalAnchors(customDeviceTerminalAnchors)) {
      const message = "不同端子位置不能重叠，请调整端子位置后再保存。";
      showGlobalMessage(message);
      setCustomDeviceDraft((current) => ({ ...current, error: message }));
      return false;
    }
    const draftRows = normalizeCustomDeviceDraftParamRows(customDeviceDraft.params, normalizeDefinitionRowEnumFields);
    const defaultRows = customDefaultDefinitions(terminalTypes, {
      isContainer: isContainerComponent,
      isDerivedComponentLibrary: derivedRequested,
      terminalAssociations,
      existingDefinitions: draftRows
    });
    const visibleDraftRows = derivedRequested && typeof isDerivedComponentBaseParamName === "function"
      ? draftRows.filter((row) => {
          const enName = String(row.enName ?? "").trim();
          return !enName || !isDerivedComponentBaseParamName(enName, derivedFromComponentLibrary);
        })
      : draftRows;
    const { definitions: mergedDefaultRows, customRows } = mergeDefaultAndCustomDefinitionRows(defaultRows, visibleDraftRows, normalizeDefinitionRowEnumFields);
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
          params: {
            component_type: componentLibrary,
            ...(derivedRequested ? {
              derived_from_component_type: derivedFromComponentLibrary,
              derived_component_type: derivedComponentLibrary,
              ...(derivedComponentLibraryLabel ? { derived_component_library_label: derivedComponentLibraryLabel } : {}),
              is_derived_component_library: "1"
            } : {})
          },
          isDerivedComponentLibrary: derivedRequested,
          derivedFromComponentLibrary: derivedRequested ? derivedFromComponentLibrary : "",
          derivedComponentLibrary: derivedRequested ? derivedComponentLibrary : "",
          derivedComponentLibraryLabel: derivedRequested ? derivedComponentLibraryLabel : "",
          terminalType: terminalTypes[0] ?? "ac",
          terminalCount: terminalTypes.length,
          terminalTypes,
          terminalLabels: customDeviceDraft.terminalLabels.slice(0, terminalTypes.length),
          terminalRoles: customDeviceDraft.terminalRoles.slice(0, terminalTypes.length),
          terminalAssociations: isContainerComponent ? terminalAssociations : undefined,
          isContainer: isContainerComponent,
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
    const backgroundImageAssetId = draftBackgroundImageAssetId && backgroundImage === apiPath(`/images/${draftBackgroundImageAssetId}`)
      ? draftBackgroundImageAssetId
      : "";
    const defaultImageCandidates = customDeviceGeneratedDefaultImageCandidates(
      componentLabel,
      componentLibrary,
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
        component_type: componentLibrary || defaultComponentLibraryForCategoryLibrary(categoryLibraryName),
        ...(derivedRequested ? {
          derived_from_component_type: derivedFromComponentLibrary,
          derived_component_type: derivedComponentLibrary,
          ...(derivedComponentLibraryLabel ? { derived_component_library_label: derivedComponentLibraryLabel } : {}),
          is_derived_component_library: "1"
        } : {}),
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
      terminalAssociations: isContainerComponent ? terminalAssociations : undefined,
      terminalLabels: customDeviceDraft.terminalLabels.slice(0, terminalTypes.length).map(
        (label, index) => label.trim() || `${TERMINAL_TYPE_LIBRARY_LABELS[terminalTypes[index]] ?? terminalTypes[index]}端${index + 1}`
      ),
      terminalAnchors,
      isContainer: isContainerComponent,
      ...(derivedRequested ? {
        isDerivedComponentLibrary: true,
        derivedFromComponentLibrary,
        derivedComponentLibrary,
        ...(derivedComponentLibraryLabel ? { derivedComponentLibraryLabel } : {})
      } : {}),
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
    const cleanDraft = {
      ...customDeviceDraft,
      componentLibrary: baseComponentLibrary,
      isContainer: isContainerComponent,
      isDerivedComponentLibrary: derivedRequested,
      derivedFromComponentLibrary: derivedRequested ? derivedFromComponentLibrary : "",
      derivedComponentLibrary: derivedRequested ? derivedComponentLibrary : "",
      derivedComponentLibraryLabel: derivedRequested ? derivedComponentLibraryLabel : "",
      backgroundImage,
      backgroundImageAssetId,
      backgroundImageFit: draftBackgroundImageFit,
      backgroundImageCleared: draftBackgroundImageCleared,
      error: ""
    };
    setCustomDeviceDraft((current) => ({ ...current, ...cleanDraft }));
    setCustomDeviceDraftCleanBaseline(cleanDraft, terminalAnchors);
    setCustomDeviceSaveMessage("");
    const toastMessage = `自定义元件已保存：${componentLabel}`;
    setCustomDeviceSaveToast(toastMessage);
    if (customDeviceSaveToastTimerRef?.current) {
      clearTimeout(customDeviceSaveToastTimerRef.current);
    }
    if (customDeviceSaveToastTimerRef) {
      customDeviceSaveToastTimerRef.current = setTimeout(() => setCustomDeviceSaveToast(""), 3000);
    }
    writeOperationLog(`保存自定义元件：${componentLabel}`);
    if (options.closeAfterSave) {
      closeCustomDeviceDialog();
    }
    return true;
  };
}

export function createSaveBuiltinDeviceDefinitionFromCustomDraft(__appScope: Record<string, any>) {
  return (template: DeviceTemplate, options: { closeAfterSave?: boolean } = {}) => {
  const { ALLOW_RESIZE_TRANSFORM_PARAM, TERMINAL_TYPE_LIBRARY_LABELS, baseLibraryTemplates = [], closeCustomDeviceDialog, createCustomDeviceDraftFromTemplate, customDefaultDefinitions, customDeviceDraft, customDeviceGeneratedDefaultImageCandidates, customDeviceImageWithTerminalConnectors, customDeviceTerminalAnchors, deviceDefinitionOverrideForTemplate, deviceDefinitionOverrides, getTemplateParameterDefinitions, hasOverlappingCustomDeviceTerminalAnchors, isDerivedComponentBaseParamName, isReservedDeviceDefinitionParamName, isValidComponentLibraryName, libraryTemplates, measurementConfig, measurementConfigDraft, measurementConfigDraftRef, normalizeComponentLibraryName, normalizeContainerTerminalAssociations, normalizeDefinitionRowEnumFields, persistDeviceLibraryChange, requireEditMode, setCustomDeviceDraft, setCustomDeviceDraftCleanBaseline = () => undefined, setCustomDeviceSaveMessage, setCustomDeviceSaveToast, customDeviceSaveToastTimerRef, setDeviceDefinitionOverrides, showGlobalMessage, syncExistingNodesWithTemplateDefinitions, syncInheritedCustomDeviceStateVisuals, validateContainerTerminalAssociations, validateStateDraftRows, writeOperationLog } = __appScope;
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
      setCustomDeviceDraft((current) => ({ ...current, error: "元件库必须是英文名称，只能包含英文字母、数字、下划线和中划线，并且必须以英文字母开头。" }));
      return false;
    }
    const derivedRequested = Boolean(customDeviceDraft.isDerivedComponentLibrary);
    const derivedFromComponentLibrary = normalizeComponentLibraryName(customDeviceDraft.derivedFromComponentLibrary || componentLibrary);
    const derivedComponentLibrary = normalizeComponentLibraryName(customDeviceDraft.derivedComponentLibrary ?? "");
    const derivedComponentLibraryLabel = String(customDeviceDraft.derivedComponentLibraryLabel ?? "").trim();
    if (derivedRequested) {
      if (!derivedFromComponentLibrary) {
        setCustomDeviceDraft((current) => ({ ...current, error: "请选择派生类关联的原类元件库。" }));
        return false;
      }
      if (!derivedComponentLibrary) {
        setCustomDeviceDraft((current) => ({ ...current, error: "请输入或选择派生类英文名称。" }));
        return false;
      }
      if (!isValidComponentLibraryName(derivedComponentLibrary)) {
        setCustomDeviceDraft((current) => ({ ...current, error: "派生类英文名称只能包含英文字母、数字、下划线和中划线，并且必须以英文字母开头。" }));
        return false;
      }
      if (derivedComponentLibrary.toLowerCase() === derivedFromComponentLibrary.toLowerCase()) {
        setCustomDeviceDraft((current) => ({ ...current, error: "派生类英文名称不能与基类元件库相同。" }));
        return false;
      }
    }
    const definitionDerivedParams = derivedRequested
      ? {
          derived_from_component_type: derivedFromComponentLibrary,
          derived_component_type: derivedComponentLibrary,
          ...(derivedComponentLibraryLabel ? { derived_component_library_label: derivedComponentLibraryLabel } : {}),
          is_derived_component_library: "1"
        }
      : {};
    const withoutDerivedDefinitionParams = (params: Record<string, string> = {}) => {
      const next = { ...params };
      delete next.derived_from_component_type;
      delete next.derived_component_type;
      delete next.derived_component_library_label;
      delete next.is_derived_component_library;
      return next;
    };
    const terminalTypes = customDeviceDraft.terminalTypes.slice(0, customDeviceDraft.terminalCount);
    const terminalAssociations = normalizeContainerTerminalAssociations(
      terminalTypes,
      customDeviceDraft.terminalAssociations,
      customDeviceDraft.terminalCount
    );
    if (customDeviceDraft.isContainer) {
      const terminalAssociationValidation = validateContainerTerminalAssociations(terminalTypes, terminalAssociations);
      if (!terminalAssociationValidation.valid) {
        showGlobalMessage(terminalAssociationValidation.message);
        setCustomDeviceDraft((current) => ({ ...current, terminalAssociations, error: terminalAssociationValidation.message }));
        return false;
      }
    }
    if (hasOverlappingCustomDeviceTerminalAnchors(customDeviceTerminalAnchors)) {
      const message = "不同端子位置不能重叠，请调整端子位置后再保存。";
      showGlobalMessage(message);
      setCustomDeviceDraft((current) => ({ ...current, error: message }));
      return false;
    }
    const draftRows = normalizeCustomDeviceDraftParamRows(customDeviceDraft.params, normalizeDefinitionRowEnumFields);
    const defaultRows = customDefaultDefinitions(terminalTypes, {
      isContainer: customDeviceDraft.isContainer,
      isDerivedComponentLibrary: customDeviceDraft.isDerivedComponentLibrary,
      terminalAssociations,
      existingDefinitions: draftRows
    });
    const derivedBaseComponentLibrary = customDeviceDraft.derivedFromComponentLibrary || componentLibrary;
    const visibleDraftRows = customDeviceDraft.isDerivedComponentLibrary && typeof isDerivedComponentBaseParamName === "function"
      ? draftRows.filter((row) => {
          const enName = String(row.enName ?? "").trim();
          return !enName || !isDerivedComponentBaseParamName(enName, derivedBaseComponentLibrary);
        })
      : draftRows;
    const { definitions: mergedDefaultRows, customRows } = mergeDefaultAndCustomDefinitionRows(defaultRows, visibleDraftRows, normalizeDefinitionRowEnumFields);
    const definitions = [...mergedDefaultRows, ...customRows];
    const baseTemplate = baseLibraryTemplates.find((candidate: DeviceTemplate) => candidate.kind === template.kind) ?? template;
    let builtInDefinitions = getTemplateParameterDefinitions(baseTemplate);
    if (typeof createCustomDeviceDraftFromTemplate === "function") {
      const baseDraft = createCustomDeviceDraftFromTemplate(baseTemplate);
      const baseTerminalTypes = baseDraft.terminalTypes.slice(0, baseDraft.terminalCount);
      const baseTerminalAssociations = normalizeContainerTerminalAssociations(
        baseTerminalTypes,
        baseDraft.terminalAssociations,
        baseDraft.terminalCount
      );
      const baseDraftRows = normalizeCustomDeviceDraftParamRows(baseDraft.params, normalizeDefinitionRowEnumFields);
      const baseDefaultRows = customDefaultDefinitions(baseTerminalTypes, {
        isContainer: baseDraft.isContainer,
        isDerivedComponentLibrary: baseDraft.isDerivedComponentLibrary,
        terminalAssociations: baseTerminalAssociations,
        existingDefinitions: baseDraftRows
      });
      const baseDerivedComponentLibrary = baseDraft.derivedFromComponentLibrary || baseDraft.componentLibrary;
      const visibleBaseDraftRows = baseDraft.isDerivedComponentLibrary && typeof isDerivedComponentBaseParamName === "function"
        ? baseDraftRows.filter((row) => {
            const enName = String(row.enName ?? "").trim();
            return !enName || !isDerivedComponentBaseParamName(enName, baseDerivedComponentLibrary);
          })
        : baseDraftRows;
      const { definitions: mergedBaseDefaultRows, customRows: baseCustomRows } = mergeDefaultAndCustomDefinitionRows(
        baseDefaultRows,
        visibleBaseDraftRows,
        normalizeDefinitionRowEnumFields
      );
      builtInDefinitions = [...mergedBaseDefaultRows, ...baseCustomRows];
    }
    const parameterDefinitionsMatchBuiltIn = deviceParameterDefinitionListsEqual(definitions, builtInDefinitions);
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
          params: {
            ...withoutDerivedDefinitionParams(template.params ?? {}),
            component_type: componentLibrary,
            ...definitionDerivedParams
          },
          isDerivedComponentLibrary: derivedRequested,
          derivedFromComponentLibrary: derivedRequested ? derivedFromComponentLibrary : "",
          derivedComponentLibrary: derivedRequested ? derivedComponentLibrary : "",
          derivedComponentLibraryLabel: derivedRequested ? derivedComponentLibraryLabel : "",
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
    const backgroundImageAssetId = draftBackgroundImageAssetId && backgroundImage === apiPath(`/images/${draftBackgroundImageAssetId}`)
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
          ...withoutDerivedDefinitionParams(template.params ?? {}),
          component_type: componentLibrary,
          ...definitionDerivedParams,
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
      (node) => {
        const nodeTemplate = libraryTemplates.find((candidate) => candidate.kind === node.kind);
        return Boolean(nodeTemplate && deviceTemplatesShareParameterDefinitions(template, nodeTemplate));
      }
    );
    const sharedOverrideKey = deviceDefinitionSharedKeyForTemplate(template);
    const existingExactOverride = deviceDefinitionOverrides[template.kind];
    const nextTemplateOverride: DeviceTemplateDefinitionOverride = {
      ...existingExactOverride,
      kind: template.kind,
      params: {
        ...(existingExactOverride?.params ?? {}),
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
      isDerivedComponentLibrary: derivedRequested,
      derivedFromComponentLibrary: derivedRequested ? derivedFromComponentLibrary : "",
      derivedComponentLibrary: derivedRequested ? derivedComponentLibrary : "",
      ...(derivedRequested && derivedComponentLibraryLabel ? { derivedComponentLibraryLabel } : {}),
      allowResizeTransform: customDeviceDraft.allowResizeTransform === "1",
      stateDefinitions,
      updatedAt: new Date().toISOString()
    };
    const exactVisualOverride = { ...nextTemplateOverride };
    delete exactVisualOverride.parameterDefinitions;
    delete exactVisualOverride.measurementDefinitions;
    const sharedDefinitionOverride: DeviceTemplateDefinitionOverride = {
      kind: sharedOverrideKey,
      params: definitions.reduce<Record<string, string>>((acc, definition) => {
        if (definition.enName !== "name") acc[definition.enName] = definition.typicalValue;
        return acc;
      }, {
        component_type: componentLibrary,
        ...definitionDerivedParams
      }),
      ...(parameterDefinitionsMatchBuiltIn ? {} : { parameterDefinitions: definitions }),
      measurementDefinitions: profileItems,
      updatedAt: nextTemplateOverride.updatedAt
    };
    const nextDeviceDefinitionOverrides: Record<string, DeviceTemplateDefinitionOverride> = {
      ...deviceDefinitionOverrides,
      [sharedOverrideKey]: sharedDefinitionOverride,
      [template.kind]: exactVisualOverride
    };
    for (const peer of libraryTemplates.filter((candidate) => deviceTemplatesShareParameterDefinitions(template, candidate))) {
      if (!nextDeviceDefinitionOverrides[peer.kind] || peer.kind === sharedOverrideKey) continue;
      const peerOverride = { ...nextDeviceDefinitionOverrides[peer.kind] };
      delete peerOverride.parameterDefinitions;
      delete peerOverride.measurementDefinitions;
      nextDeviceDefinitionOverrides[peer.kind] = peerOverride;
    }
    nextDeviceDefinitionOverrides = normalizeSharedDeviceDefinitionOverrides(nextDeviceDefinitionOverrides, libraryTemplates);
    nextDeviceDefinitionOverrides = appendAssociatedMeasurementFieldsToOverrides(
      nextDeviceDefinitionOverrides,
      materializedFields.additions,
      { libraryTemplates, deviceDefinitionKeyForTemplate, deviceDefinitionOverrideForTemplate, getTemplateParameterDefinitions }
    );
    setDeviceDefinitionOverrides(nextDeviceDefinitionOverrides);
    persistDeviceLibraryChange({ deviceDefinitionOverrides: nextDeviceDefinitionOverrides }, {
      success: `元件定义已保存到后台：${template.label}`,
      failure: `元件定义已保存到本地，后台保存失败：${template.label}`
    });
    const cleanDraft = {
      ...customDeviceDraft,
      isDerivedComponentLibrary: derivedRequested,
      derivedFromComponentLibrary: derivedRequested ? derivedFromComponentLibrary : "",
      derivedComponentLibrary: derivedRequested ? derivedComponentLibrary : "",
      derivedComponentLibraryLabel: derivedRequested ? derivedComponentLibraryLabel : "",
      backgroundImage,
      backgroundImageAssetId,
      backgroundImageFit: draftBackgroundImageFit,
      backgroundImageCleared: draftBackgroundImageCleared,
      size,
      terminalLabels,
      error: ""
    };
    setCustomDeviceDraft((current) => ({
      ...current,
      isDerivedComponentLibrary: derivedRequested,
      derivedFromComponentLibrary: derivedRequested ? derivedFromComponentLibrary : "",
      derivedComponentLibrary: derivedRequested ? derivedComponentLibrary : "",
      derivedComponentLibraryLabel: derivedRequested ? derivedComponentLibraryLabel : "",
      backgroundImage,
      backgroundImageAssetId,
      backgroundImageFit: draftBackgroundImageFit,
      backgroundImageCleared: draftBackgroundImageCleared,
      size,
      terminalLabels,
      error: ""
    }));
    setCustomDeviceDraftCleanBaseline(cleanDraft, terminalAnchors);
    setCustomDeviceSaveMessage("");
    const toastMessage = `元件定义已保存：${template.label}`;
    setCustomDeviceSaveToast(toastMessage);
    if (customDeviceSaveToastTimerRef?.current) {
      clearTimeout(customDeviceSaveToastTimerRef.current);
    }
    if (customDeviceSaveToastTimerRef) {
      customDeviceSaveToastTimerRef.current = setTimeout(() => setCustomDeviceSaveToast(""), 3000);
    }
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

