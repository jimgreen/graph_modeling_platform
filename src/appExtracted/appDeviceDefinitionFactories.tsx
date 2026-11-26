/**
 * 设备与元件定义草稿、自定义模板管理与类别库树维护主工厂模块。
 * 同时作为统一门面重导出已拆分的 5 个子域工厂模块，保证外部调用方零破坏。
 */

import type { DeviceDefinitionScope } from "./appScopeTypes";
import type { ChangeEvent, CSSProperties, MouseEvent, PointerEvent } from "react";
import { deviceDefinitionComplianceKey } from "./appDeviceDefinitionEInterface";
import {
  E_SECTION_COLUMNS,
  getTemplateParameterDefinitions,
  inferESection,
  resolveEffectiveTemplateParameterDefinitions,
  templateDerivedComponentLibraryInfo,
  type DeviceParameterDefinition,
  type DeviceStateDefinition,
  type DeviceTemplate,
  type DeviceTemplateDefinitionOverride,
  type ModelNode,
  type Point,
} from "../model";
import { clampNumber } from "../canvasViewport";
import { normalizeImageFitMode } from "../imageFit";
import { apiPath } from "../config";
import { promptText } from "../globalDialogs";
import {
  type CategoryLibrary,
  type CustomDeviceDialogView,
  type CustomDeviceDraft,
  type CustomParamDraft,
  type DeviceDefinitionDraftRow,
  type DeviceLibraryDialogKind,
  type ImageAsset,
} from "./appCoreCanvasUtilities";
import {
  createEditableStateIconElementsFromSvgSource as defaultCreateEditableStateIconElementsFromSvgSource,
  customParamId,
  stateIconDrawingToPersistedImage as defaultStateIconDrawingToPersistedImage,
  svgSourceToDataUrl as defaultSvgSourceToDataUrl,
  type DeviceDefinitionStateDraftRow,
} from "../stateIconDrawing";
import { buildMeasurementProfilePositionDefinitions, materializeNewMeasurementDefinitionFields } from "../measurements";
import { measurementProfileItemsComplianceMessage } from "./appGraphMeasurementFactories";
import { cloneDeviceMeasurementDefinitions, normalizeDeviceMeasurementDefinitions } from "../measurementDefinitionTypes";
import {
  COMPONENT_LIBRARY_MAX_TERMINALS,
  componentLibraryDefinitionFromMetadata,
  defaultTerminalAssociationForClassTerminal,
  defaultTerminalTypeForCategoryLibrary,
  resolveComponentLibraryClassFamilyMetadata,
  resolveComponentLibraryClassMetadata,
} from "../componentLibraryMetadata";
import {
  deviceDefinitionSharedKeyForTemplate,
  deviceTemplatesShareParameterDefinitions,
  removeDeviceTemplateDefinitionOverrides,
  normalizeSharedDeviceDefinitionOverrides,
} from "../customDeviceUtils";
import {
  buildComponentLibraryDefaultParameterDefinitions,
  componentLibraryDefinitionOverrideKey,
  resolveEditableComponentLibraryDefinition,
} from "../componentLibraryDefinitions";
import type { SavedExportFile } from "../fileIO";
import { buildDeviceTemplateCopyVisualSvg as defaultBuildDeviceTemplateCopyVisualSvg } from "./appPersistenceLibraryExport";

import { clearGeneratedDefinitionVisualDraftImage, createDefinitionStateDraftRowsWithDefaultImages, createTemplateDefaultStateIconImage, isGeneratedTemplateDefaultStateIconImage } from "./appStateIconDrawingFactories";
import { showStandaloneExportCompletion } from "./appExportImportFactories";

export * from "./appDeviceDefinitionEInterface";
export * from "./appStateIconDrawingFactories";
export * from "./appEdgeRouteInteractionFactories";
export * from "./appExportImportFactories";
export * from "./appImageLibraryFactories";
export * from "./appProjectTreeFactories";

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
    const definitions = resolveEffectiveTemplateParameterDefinitions(candidate, libraryTemplates);
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
  const defaultRowsByKey = new Map(
    defaultRows.map((row) => [deviceDefinitionComplianceKey(row.enName), row])
  );
  const draftKeySet = new Set(draftRows.map((row) => deviceDefinitionComplianceKey(row.enName)));
  const definitions = draftRows.map((draftRow) => {
    const defaultRow = defaultRowsByKey.get(deviceDefinitionComplianceKey(draftRow.enName));
    if (!defaultRow) {
      return draftRow;
    }
    return normalizeDefinitionRowEnumFields({
      ...defaultRow,
      valueType: draftRow.valueType,
      typicalValue: draftRow.typicalValue,
      enumOptions: draftRow.enumOptions,
      enumValues: draftRow.enumValues,
      readonly: defaultRow.readonly,
      ...(typeof draftRow.exportEnabled === "boolean" ? { exportEnabled: draftRow.exportEnabled } : {}),
      ...(typeof draftRow.exportName === "string" ? { exportName: draftRow.exportName.trim() } : {})
    });
  });
  definitions.push(...defaultRows.filter(
    (row) => !draftKeySet.has(deviceDefinitionComplianceKey(row.enName))
  ));
  return {
    definitions,
    customRows: draftRows.filter((row) => !defaultRowsByKey.has(deviceDefinitionComplianceKey(row.enName)))
  };
};

const appendAssociatedMeasurementFieldsToOverrides = (
  current: Record<string, DeviceTemplateDefinitionOverride>,
  additions: readonly { position: string; deviceKind?: string; field: string; definition: DeviceParameterDefinition }[],
  options: {
    libraryTemplates: readonly DeviceTemplate[];
    deviceDefinitionOverrideForTemplate: (
      template: DeviceTemplate,
      overrides: Record<string, DeviceTemplateDefinitionOverride>,
      templates?: readonly DeviceTemplate[]
    ) => DeviceTemplateDefinitionOverride | undefined;
    getTemplateParameterDefinitions: (template: DeviceTemplate) => DeviceParameterDefinition[];
  }
) => {
  let next = current;
  for (const addition of additions) {
    if (addition.position === "device" || !addition.deviceKind) continue;
    const targetTemplate = options.libraryTemplates.find((template) => template.kind === addition.deviceKind);
    if (!targetTemplate) continue;
    const overrideKey = deviceDefinitionSharedKeyForTemplate(targetTemplate);
    const existingOverride = options.deviceDefinitionOverrideForTemplate(targetTemplate, next, options.libraryTemplates);
    const parameterDefinitions = resolveEffectiveTemplateParameterDefinitions(
      existingOverride ?? targetTemplate,
      options.libraryTemplates
    );
    if (parameterDefinitions.some((definition) => deviceDefinitionComplianceKey(definition.enName) === deviceDefinitionComplianceKey(addition.field))) {
      continue;
    }
    parameterDefinitions.push({ ...addition.definition });
    if (next === current) next = { ...current };
    next[overrideKey] = {
      ...existingOverride,
      kind: overrideKey,
      params: {
        ...(existingOverride?.params ?? {}),
        [addition.field]: addition.definition.typicalValue
      },
      parameterDefinitions,
      updatedAt: new Date().toISOString()
    };
  }
  return next;
};

const syncAssociatedMeasurementFieldAdditions = (
  additions: readonly { position: string; deviceKind?: string; field: string; definition: DeviceParameterDefinition }[],
  libraryTemplates: readonly DeviceTemplate[],
  getTemplateParameterDefinitions: (template: DeviceTemplate) => DeviceParameterDefinition[],
  syncExistingNodesWithTemplateDefinitions?: (
    template: Pick<DeviceTemplate, "parameterDefinitions">,
    previousDefinitions: readonly DeviceParameterDefinition[] | undefined,
    predicate: (node: ModelNode) => boolean
  ) => void
) => {
  if (typeof syncExistingNodesWithTemplateDefinitions !== "function") return;
  const additionsByKind = new Map<string, DeviceParameterDefinition[]>();
  for (const addition of additions) {
    if (addition.position === "device" || !addition.deviceKind) continue;
    const definitions = additionsByKind.get(addition.deviceKind) ?? [];
    if (!definitions.some((definition) => deviceDefinitionComplianceKey(definition.enName) === deviceDefinitionComplianceKey(addition.field))) {
      definitions.push(addition.definition);
      additionsByKind.set(addition.deviceKind, definitions);
    }
  }
  for (const [kind, additionsForKind] of additionsByKind) {
    const targetTemplate = libraryTemplates.find((template) => template.kind === kind);
    if (!targetTemplate) continue;
    const previousDefinitions = resolveEffectiveTemplateParameterDefinitions(targetTemplate, libraryTemplates);
    const known = new Set(previousDefinitions.map((definition) => deviceDefinitionComplianceKey(definition.enName)));
    const nextDefinitions = [
      ...previousDefinitions,
      ...additionsForKind.filter((definition) => !known.has(deviceDefinitionComplianceKey(definition.enName)))
    ];
    if (nextDefinitions.length === previousDefinitions.length) continue;
    syncExistingNodesWithTemplateDefinitions(
      { parameterDefinitions: nextDefinitions },
      previousDefinitions,
      (node) => node.kind === kind
    );
  }
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

const inlineDefaultIconBackgroundPatch = (__appScope: DeviceDefinitionScope, scope: "custom" | "definition") => {
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

export function customDeviceDraftDirtyToken(draft: CustomDeviceDraft, anchors: readonly Point[] = []) {
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
    }
  });
}

export function customDeviceDraftSectionDirtyToken(
  draft: CustomDeviceDraft,
  section: CustomDeviceDialogView,
  anchors: readonly Point[] = []
) {
  const normalizedDraft = JSON.parse(customDeviceDraftDirtyToken(draft, anchors)).draft;
  if (section === "measurements") {
    return JSON.stringify({
      measurementDefinitions: normalizedDraft.measurementDefinitions ?? []
    });
  }
  if (section === "parameters") {
    return JSON.stringify({
      categoryLibraryName: normalizedDraft.categoryLibraryName,
      componentLibrary: normalizedDraft.componentLibrary,
      isDerivedComponentLibrary: normalizedDraft.isDerivedComponentLibrary,
      derivedFromComponentLibrary: normalizedDraft.derivedFromComponentLibrary,
      derivedComponentLibrary: normalizedDraft.derivedComponentLibrary,
      derivedComponentLibraryLabel: normalizedDraft.derivedComponentLibraryLabel,
      terminalCount: normalizedDraft.terminalCount,
      terminalTypes: normalizedDraft.terminalTypes,
      terminalLabels: normalizedDraft.terminalLabels,
      terminalAnchors: normalizedDraft.terminalAnchors,
      terminalRoles: normalizedDraft.terminalRoles,
      terminalAssociations: normalizedDraft.terminalAssociations,
      isContainer: normalizedDraft.isContainer,
      params: normalizedDraft.params
    });
  }
  return JSON.stringify({
    componentName: normalizedDraft.componentName,
    componentKind: normalizedDraft.componentKind,
    backgroundImage: normalizedDraft.backgroundImage,
    backgroundImageAssetId: normalizedDraft.backgroundImageAssetId,
    backgroundImageFit: normalizedDraft.backgroundImageFit,
    backgroundImageCleared: normalizedDraft.backgroundImageCleared,
    size: normalizedDraft.size,
    allowResizeTransform: normalizedDraft.allowResizeTransform,
    terminalCount: normalizedDraft.terminalCount,
    terminalTypes: normalizedDraft.terminalTypes,
    terminalLabels: normalizedDraft.terminalLabels,
    terminalAnchors: normalizedDraft.terminalAnchors,
    terminalRoles: normalizedDraft.terminalRoles,
    terminalAssociations: normalizedDraft.terminalAssociations,
    stateDefinitions: normalizedDraft.stateDefinitions
  });
}

export function createSetCustomDeviceDraftCleanBaseline(__appScope: DeviceDefinitionScope) {
  return (draft: CustomDeviceDraft, anchors?: readonly Point[]) => {
  const { createDefaultCustomDeviceTerminalAnchors, customDeviceDraftBaselineRef, customDeviceDraftCleanTokenRef } = __appScope;
    const nextAnchors = anchors ?? createDefaultCustomDeviceTerminalAnchors(draft.terminalCount, draft.terminalAnchors);
    const baselineDraft = {
      ...draft,
      terminalAnchors: nextAnchors.slice(0, Math.max(0, Math.round(draft.terminalCount || 0))).map((anchor: any) => ({
        x: anchor.x,
        y: anchor.y
      }))
    };
    customDeviceDraftCleanTokenRef.current = customDeviceDraftDirtyToken(
      baselineDraft,
      nextAnchors
    );
    if (customDeviceDraftBaselineRef) {
      customDeviceDraftBaselineRef.current = JSON.parse(JSON.stringify(baselineDraft));
    }
  };
}

export function createCustomDeviceDraftHasUnsavedChanges(__appScope: DeviceDefinitionScope) {
  return (section?: CustomDeviceDialogView) => {
  const { customDeviceDraft, customDeviceDraftBaselineRef, customDeviceDraftCleanTokenRef, customDeviceTerminalAnchors } = __appScope;
    if (section) {
      const baselineDraft: CustomDeviceDraft | null = customDeviceDraftBaselineRef?.current ?? null;
      if (!baselineDraft) {
        return false;
      }
      return customDeviceDraftSectionDirtyToken(
        customDeviceDraft,
        section,
        customDeviceTerminalAnchors
      ) !== customDeviceDraftSectionDirtyToken(
        baselineDraft,
        section,
        baselineDraft.terminalAnchors
      );
    }
    const currentToken = customDeviceDraftDirtyToken(
      customDeviceDraft,
      customDeviceTerminalAnchors
    );
    return customDeviceDraftCleanTokenRef.current !== currentToken;
  };
}

// 还原当前 tab 或全部 tab 到预设定义
export function createRevertCustomDeviceDraftCurrentTab(__appScope: DeviceDefinitionScope) {
  return () => {
  const { customDeviceDraftBaselineRef, customDeviceDialogView, setCustomDeviceDraft, setStateIconDrawingDialog } = __appScope;
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
      setCustomDeviceDraft((current: CustomDeviceDraft) => ({
        ...current,
        measurementDefinitions: cloneDeviceMeasurementDefinitions(baseline.measurementDefinitions) ?? [],
        error: ""
      }));
    }
  };
}

export function createRevertCustomDeviceDraftAll(__appScope: DeviceDefinitionScope) {
  return () => {
  const { customDeviceDraftBaselineRef, setCustomDeviceDraft, setStateIconDrawingDialog, editingCustomDeviceKind, selectedDefinitionKind, baseLibraryTemplateByKind, createCustomDeviceDraftFromTemplate, resolveTemplateComponentLibrary } = __appScope;
    if (typeof setStateIconDrawingDialog === "function") setStateIconDrawingDialog(null);
    // 内置元件：从源码原始定义还原
    if (!editingCustomDeviceKind && selectedDefinitionKind && baseLibraryTemplateByKind && typeof createCustomDeviceDraftFromTemplate === "function") {
      const baseTemplate = baseLibraryTemplateByKind.get(selectedDefinitionKind);
      if (baseTemplate) {
        const section = typeof resolveTemplateComponentLibrary === "function" ? resolveTemplateComponentLibrary(baseTemplate) : (baseTemplate.categoryLibrary ?? "");
        const freshDraft = createCustomDeviceDraftFromTemplate(baseTemplate, section);
        setCustomDeviceDraft({ ...freshDraft, error: "" });
        return;
      }
    }
    // 自定义元件：从 baseline 还原
    const baseline: CustomDeviceDraft | null = customDeviceDraftBaselineRef?.current ?? null;
    if (!baseline) return;
    setCustomDeviceDraft(JSON.parse(JSON.stringify(baseline)));
  };
}

export function createCustomDeviceDefaultStateVisualDraft(__appScope: DeviceDefinitionScope) {
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

export function createSnapCustomDeviceTerminalAnchor(__appScope: DeviceDefinitionScope) {
  return (anchor: Point): Point => {
  const { CUSTOM_DEVICE_TERMINAL_ANCHOR_GUIDE_VALUES, CUSTOM_DEVICE_TERMINAL_ANCHOR_SNAP_SCREEN_TOLERANCE, customDevicePreviewHeight, customDevicePreviewWidth, customDeviceTerminalAnchorValue, projectCustomDeviceTerminalAnchorToBoundary } = __appScope;
    const snapAxis = (value: number, tolerance: number) => {
      const normalizedValue = customDeviceTerminalAnchorValue(value);
      const guideValue = CUSTOM_DEVICE_TERMINAL_ANCHOR_GUIDE_VALUES.find((candidate: any) => Math.abs(normalizedValue - candidate) <= tolerance);
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

export function createCustomDeviceTerminalConnectorSegment(__appScope: DeviceDefinitionScope) {
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

export function createUpdateCustomDeviceTerminalAnchor(__appScope: DeviceDefinitionScope) {
  return (index: number, patch: Partial<Point>) => {
  const { createDefaultCustomDeviceTerminalAnchors, customDeviceTerminalAnchorValue, hasOverlappingCustomDeviceTerminalAnchors, projectCustomDeviceTerminalAnchorToBoundary, setCustomDeviceDraft } = __appScope;
    setCustomDeviceDraft((current: any) => {
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

export function createUpdateCustomDeviceStateDraftRow(__appScope: DeviceDefinitionScope) {
  return (rowId: string, patch: Partial<DeviceDefinitionStateDraftRow>) => {
  const { isDefaultStatePageId, setCustomDeviceDraft } = __appScope;
    setCustomDeviceDraft((current: any) => ({
      ...current,
      stateDefinitions: isDefaultStatePageId(rowId)
        ? current.stateDefinitions
        : current.stateDefinitions.map((row: any) => (row.id === rowId ? { ...row, ...patch } : row)),
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

export function createAddCustomDeviceStateDraftRow(__appScope: DeviceDefinitionScope) {
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
    setCustomDeviceDraft((current: any) => ({
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

export function createDeleteCustomDeviceStateDraftRow(__appScope: DeviceDefinitionScope) {
  return (rowId: string) => {
  const { setCustomDeviceDraft } = __appScope;
    setCustomDeviceDraft((current: any) => ({
      ...current,
      stateDefinitions: current.stateDefinitions.filter((row: any) => row.id !== rowId),
      error: ""
    }));
  };
}

export function createUpdateCustomDeviceTerminalAnchorFromPreview(__appScope: DeviceDefinitionScope) {
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

export function createDefinitionDefaultStateVisualDraft(__appScope: DeviceDefinitionScope) {
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

export function createSnapDefinitionTerminalAnchor(__appScope: DeviceDefinitionScope) {
  return (anchor: Point): Point => {
  const { CUSTOM_DEVICE_TERMINAL_ANCHOR_GUIDE_VALUES, CUSTOM_DEVICE_TERMINAL_ANCHOR_SNAP_SCREEN_TOLERANCE, customDeviceTerminalAnchorValue, definitionVisualPreviewHeight, definitionVisualPreviewWidth, projectCustomDeviceTerminalAnchorToBoundary } = __appScope;
    const snapAxis = (value: number, tolerance: number) => {
      const normalizedValue = customDeviceTerminalAnchorValue(value);
      const guideValue = CUSTOM_DEVICE_TERMINAL_ANCHOR_GUIDE_VALUES.find((candidate: any) => Math.abs(normalizedValue - candidate) <= tolerance);
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

export function createDefinitionTerminalConnectorSegment(__appScope: DeviceDefinitionScope) {
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

export function createUpdateDefinitionTerminalAnchor(__appScope: DeviceDefinitionScope) {
  return (index: number, patch: Partial<Point>) => {
  const { createDefaultCustomDeviceTerminalAnchors, customDeviceTerminalAnchorValue, hasOverlappingCustomDeviceTerminalAnchors, projectCustomDeviceTerminalAnchorToBoundary, setDefinitionVisualDraft } = __appScope;
    setDefinitionVisualDraft((current: any) => {
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

export function createUpdateDefinitionTerminalAnchorFromPreview(__appScope: DeviceDefinitionScope) {
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

export function createLoadDefinitionTemplateDraft(__appScope: DeviceDefinitionScope) {
  return (template: DeviceTemplate) => {
  const { DEFAULT_STATE_PAGE_ID, categoryLibraryComponentLibraryKey, createDefinitionDraftRows, createDefinitionVisualDraft, definitionDeleteAllParametersRequestedRef, definitionMeasurementSelectionAnchorRef, definitionParameterSelectionAnchorRef, normalizeCategoryLibraryName, resolveTemplateComponentLibrary, setCollapsedDefinitionComponentLibraries, setDefinitionDraftError, setDefinitionDraftRows, setDefinitionDraftSection, setDefinitionMeasurementDraft, setDefinitionStateDraftRows, setDefinitionStatePageId, setDefinitionTerminalAnchorDragIndex, setDefinitionVisualDraft, setExpandedDefinitionGroups, setSelectedDefinitionKind, setSelectedDefinitionMeasurementRowIndexes, setSelectedDefinitionParameterRowIds } = __appScope;
    const stateRows = createDefinitionStateDraftRowsWithDefaultImages(__appScope, template);
    const visualDraft = clearGeneratedDefinitionVisualDraftImage(template, createDefinitionVisualDraft(template));
    setSelectedDefinitionKind(template.kind);
    const group = normalizeCategoryLibraryName(template.categoryLibrary);
    const componentLibrary = resolveTemplateComponentLibrary(template);
    setExpandedDefinitionGroups((current: any) => (current.includes(group) ? current : [...current, group]));
    setCollapsedDefinitionComponentLibraries((current: any) => current.filter((item: any) => item !== categoryLibraryComponentLibraryKey(group, componentLibrary)));
    setDefinitionDraftRows(createDefinitionDraftRows(template));
    if (definitionDeleteAllParametersRequestedRef) definitionDeleteAllParametersRequestedRef.current = false;
    setDefinitionMeasurementDraft(cloneDeviceMeasurementDefinitions(template.measurementDefinitions) ?? []);
    setSelectedDefinitionParameterRowIds([]);
    definitionParameterSelectionAnchorRef.current = null;
    setSelectedDefinitionMeasurementRowIndexes([]);
    definitionMeasurementSelectionAnchorRef.current = null;
    setDefinitionStateDraftRows(stateRows);
    setDefinitionStatePageId(DEFAULT_STATE_PAGE_ID);
    setDefinitionDraftSection(componentLibrary);
    setDefinitionDraftError("");
    setDefinitionVisualDraft(visualDraft);
    setDefinitionTerminalAnchorDragIndex(null);
  };
}

export function createFinishDeviceLibraryDialogPointerOperation(__appScope: DeviceDefinitionScope) {
  return () => {
  const { setDeviceLibraryDialogDrag, setDeviceLibraryDialogResize } = __appScope;
    setDeviceLibraryDialogDrag(null);
    setDeviceLibraryDialogResize(null);
  };
}

export function createCurrentDeviceLibraryDialogRect(__appScope: DeviceDefinitionScope) {
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

export function createDeviceLibraryDialogStyle(__appScope: DeviceDefinitionScope) {
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

export function createStartDeviceLibraryDialogDrag(__appScope: DeviceDefinitionScope) {
  return (kind: DeviceLibraryDialogKind, event: PointerEvent<HTMLElement>) => {
  const { currentDeviceLibraryDialogRect, setDeviceLibraryDialogDrag, setDeviceLibraryDialogLayouts } = __appScope;
    if (event.button !== 0) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    const rect = currentDeviceLibraryDialogRect(kind);
    setDeviceLibraryDialogLayouts((current: any) => ({ ...current, [kind]: rect }));
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

export function createStartDeviceLibraryDialogResize(__appScope: DeviceDefinitionScope) {
  return (kind: DeviceLibraryDialogKind, event: PointerEvent<HTMLDivElement>) => {
  const { currentDeviceLibraryDialogRect, setDeviceLibraryDialogLayouts, setDeviceLibraryDialogResize } = __appScope;
    if (event.button !== 0) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    const rect = currentDeviceLibraryDialogRect(kind);
    setDeviceLibraryDialogLayouts((current: any) => ({ ...current, [kind]: rect }));
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

export function createStopDeviceLibraryDialogEvent(__appScope: DeviceDefinitionScope) {
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

export function createOpenDeviceDefinitionDialog(__appScope: DeviceDefinitionScope) {
  return () => {
  const { DEFAULT_STATE_PAGE_ID, cancelPendingCustomComponentTemplateLoad, createCustomDeviceDraftFromTemplate, ensureCustomComponentTreeExpanded, libraryTemplates, normalizeCategoryLibraryName, prepareMeasurementConfigDraft, resolveTemplateComponentLibrary, selectedCustomComponentTemplate, selectedDefinitionTemplate, setCustomComponentTreeSelection, setCustomDeviceDefinitionMode, setCustomDeviceDialogOpen, setCustomDeviceDialogView, setCustomDeviceDraft, setCustomDeviceDraftCleanBaseline = () => undefined, setCustomDeviceSaveMessage, setCustomDeviceStatePageId, setDefinitionDraftSection, setDeviceDefinitionDialogOpen, setDeviceLibraryDialogLayouts, setEditingCustomDeviceKind, setSelectedDefinitionKind } = __appScope;
    let openedDraft: CustomDeviceDraft | null = null;
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

export function createCloseDeviceDefinitionDialog(__appScope: DeviceDefinitionScope) {
  return () => {
  const { DEFAULT_STATE_PAGE_ID, definitionMeasurementSelectionAnchorRef, definitionParameterSelectionAnchorRef, finishDeviceLibraryDialogPointerOperation, measurementConfigDraftRef, setDefinitionStateDraftRows, setDefinitionStatePageId, setDefinitionTerminalAnchorDragIndex, setDefinitionVisualDraft, setDeviceDefinitionDialogOpen, setMeasurementConfigDraft, setMeasurementConfigSaveStatus, setSelectedDefinitionMeasurementRowIndexes, setSelectedDefinitionParameterRowIds } = __appScope;
    finishDeviceLibraryDialogPointerOperation();
    setDeviceDefinitionDialogOpen(false);
    measurementConfigDraftRef.current = null;
    setMeasurementConfigDraft(null);
    setMeasurementConfigSaveStatus("idle");
    setDefinitionVisualDraft(null);
    setDefinitionStateDraftRows([]);
    setDefinitionStatePageId(DEFAULT_STATE_PAGE_ID);
    setDefinitionTerminalAnchorDragIndex(null);
    setSelectedDefinitionParameterRowIds([]);
    definitionParameterSelectionAnchorRef.current = null;
    setSelectedDefinitionMeasurementRowIndexes([]);
    definitionMeasurementSelectionAnchorRef.current = null;
  };
}

export function createCloseCustomDeviceDialog(__appScope: DeviceDefinitionScope) {
  return () => {
  const { customMeasurementSelectionAnchorRef, customParameterSelectionAnchorRef, createEmptyCustomDeviceDraft, finishDeviceLibraryDialogPointerOperation, measurementConfigDraftRef, setCustomDeviceDialogOpen, setCustomDeviceDraft, setCustomDeviceTerminalAnchorDragIndex, setMeasurementConfigDraft, setMeasurementConfigSaveStatus, setSelectedCustomMeasurementRowIndexes, setSelectedCustomParameterRowIds } = __appScope;
    finishDeviceLibraryDialogPointerOperation();
    // 审查 T21-P0-3：关闭时重置 draft，避免下次打开看到残留（防御性，打开路径已覆盖）
    const emptyDraft = typeof createEmptyCustomDeviceDraft === "function" ? createEmptyCustomDeviceDraft("") : null;
    if (emptyDraft) {
      setCustomDeviceDraft?.(emptyDraft);
    }
    setCustomDeviceDialogOpen(false);
    measurementConfigDraftRef.current = null;
    setMeasurementConfigDraft(null);
    setMeasurementConfigSaveStatus("idle");
    setCustomDeviceTerminalAnchorDragIndex(null);
    setSelectedCustomParameterRowIds([]);
    customParameterSelectionAnchorRef.current = null;
    setSelectedCustomMeasurementRowIndexes([]);
    customMeasurementSelectionAnchorRef.current = null;
  };
}

export function createToggleDefinitionGroup(__appScope: DeviceDefinitionScope) {
  return (categoryLibrary: CategoryLibrary) => {
  const { setExpandedDefinitionGroups } = __appScope;
    setExpandedDefinitionGroups((current: any) =>
      current.includes(categoryLibrary) ? current.filter((item: any) => item !== categoryLibrary) : [...current, categoryLibrary]
    );
  };
}

export function createToggleDefinitionComponentLibrary(__appScope: DeviceDefinitionScope) {
  return (categoryLibrary: CategoryLibrary, componentLibrary: string) => {
  const { categoryLibraryComponentLibraryKey, setCollapsedDefinitionComponentLibraries, setDefinitionDraftSection, setSelectedDefinitionKind } = __appScope;
    const typeKey = categoryLibraryComponentLibraryKey(categoryLibrary, componentLibrary);
    setCollapsedDefinitionComponentLibraries((current: any) =>
      current.includes(typeKey) ? current.filter((item: any) => item !== typeKey) : [...current, typeKey]
    );
    // 选中类节点：右侧显示共有参数表格
    setDefinitionDraftSection(componentLibrary);
    setSelectedDefinitionKind("");
  };
}

export function createUpdateDefinitionComponentLibraryCommonParamExport(__appScope: DeviceDefinitionScope) {
  return (componentLibrary: string, enName: string, patch: { exportEnabled?: boolean; exportName?: string }) => {
  const { deviceDefinitionKeyForTemplate, deviceDefinitionOverrideForTemplate, getTemplateParameterDefinitions, libraryTemplates, normalizeComponentLibraryName, resolveTemplateComponentLibrary, setDeviceDefinitionOverrides, writeOperationLog } = __appScope;
    const sectionKey = normalizeComponentLibraryName(componentLibrary);
    if (!sectionKey) {
      return;
    }
    const componentLibraryTemplates = libraryTemplates.filter((template: any) => {
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
    setDeviceDefinitionOverrides((current: any) => {
      const next = { ...current };
      for (const template of componentLibraryTemplates) {
        const definitionKey = deviceDefinitionSharedKeyForTemplate(template);
        const existingOverride = deviceDefinitionOverrideForTemplate(template, next, libraryTemplates);
        const parameterDefinitions = resolveEffectiveTemplateParameterDefinitions(template, libraryTemplates).map((definition) =>
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
    writeOperationLog(`修改类共有参数导出：${componentLibrary} ${enName}`);
  };
}

export function createToggleElementTreeGroup(__appScope: DeviceDefinitionScope) {
  return (typeKey: string) => {
  const { setCollapsedElementTreeGroups } = __appScope;
    setCollapsedElementTreeGroups((current: any) =>
      current.includes(typeKey) ? current.filter((item: any) => item !== typeKey) : [...current, typeKey]
    );
  };
}

export function createToggleElementTreeDeviceGroup(__appScope: DeviceDefinitionScope) {
  return (deviceKey: string) => {
  const { setCollapsedElementTreeDeviceGroups } = __appScope;
    setCollapsedElementTreeDeviceGroups((current: any) =>
      current.includes(deviceKey) ? current.filter((item: any) => item !== deviceKey) : [...current, deviceKey]
    );
  };
}

export function createUpdateDefinitionDraftRow(__appScope: DeviceDefinitionScope) {
  return (rowId: string, patch: Partial<DeviceDefinitionDraftRow>) => {
  const { definitionDeleteAllParametersRequestedRef, setDefinitionDraftError, setDefinitionDraftRows } = __appScope;
    if (definitionDeleteAllParametersRequestedRef) definitionDeleteAllParametersRequestedRef.current = false;
    setDefinitionDraftRows((current: any) => current.map((row: any) => (row.id === rowId ? { ...row, ...patch } : row)));
    setDefinitionDraftError("");
  };
}

export function createAddDefinitionDraftRow(__appScope: DeviceDefinitionScope) {
  return () => {
  const { definitionDeleteAllParametersRequestedRef, definitionParameterSelectionAnchorRef, deviceDefinitionRowId, setDefinitionDraftError, setDefinitionDraftRows, setSelectedDefinitionParameterRowIds } = __appScope;
    if (definitionDeleteAllParametersRequestedRef) definitionDeleteAllParametersRequestedRef.current = false;
    const rowId = deviceDefinitionRowId();
    setDefinitionDraftRows((current: any) => [
      ...current,
      {
        id: rowId,
        cnName: "",
        enName: "",
        valueType: "string",
        typicalValue: "",
        exportEnabled: false,
        exportName: ""
      }
    ]);
    setSelectedDefinitionParameterRowIds([rowId]);
    definitionParameterSelectionAnchorRef.current = rowId;
    setDefinitionDraftError("");
  };
}

export function createDeleteDefinitionDraftRow(__appScope: DeviceDefinitionScope) {
  return (rowId: string) => {
  const { definitionDeleteAllParametersRequestedRef, setDefinitionDraftError, setDefinitionDraftRows } = __appScope;
    if (definitionDeleteAllParametersRequestedRef) definitionDeleteAllParametersRequestedRef.current = false;
    setDefinitionDraftRows((current: any) => current.filter((row: any) => row.id !== rowId || row.readonly));
    setDefinitionDraftError("");
  };
}

export function createUpdateDefinitionStateDraftRow(__appScope: DeviceDefinitionScope) {
  return (rowId: string, patch: Partial<DeviceDefinitionStateDraftRow>) => {
  const { isDefaultStatePageId, setDefinitionDraftError, setDefinitionStateDraftRows, setDefinitionVisualDraft } = __appScope;
    setDefinitionStateDraftRows((current: any) =>
      isDefaultStatePageId(rowId)
        ? current
        : current.map((row: any) => (row.id === rowId ? { ...row, ...patch } : row))
    );
    if (isDefaultStatePageId(rowId)) {
      setDefinitionVisualDraft((current: any) =>
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

export function createAddDefinitionStateDraftRow(__appScope: DeviceDefinitionScope) {
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
    setDefinitionStateDraftRows((current: any) => {
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

export function createDeleteDefinitionStateDraftRow(__appScope: DeviceDefinitionScope) {
  return (rowId: string) => {
  const { setDefinitionDraftError, setDefinitionStateDraftRows } = __appScope;
    setDefinitionStateDraftRows((current: any) => current.filter((row: any) => row.id !== rowId));
    setDefinitionDraftError("");
  };
}

export function createRequestCloseCustomDeviceDialog(__appScope: DeviceDefinitionScope) {
  return () => {
  const { closeCustomDeviceDialog, requestCustomDeviceDraftAction } = __appScope;
    return requestCustomDeviceDraftAction(
      closeCustomDeviceDialog,
      {
        kind: "close",
        actionLabel: "关闭元件定义窗口"
      }
    );
  };
}

export function createUpdateSelectedDefinitionResizePermission(__appScope: DeviceDefinitionScope) {
  return (value: string) => {
  const { deviceDefinitionOverrideForTemplate, selectedDefinitionTemplate, setCustomDeviceTemplates, setDefinitionDraftError, setDeviceDefinitionOverrides, writeOperationLog } = __appScope;
    if (!selectedDefinitionTemplate) {
      return;
    }
    const nextAllowed = value === "1";
    const targetKind = selectedDefinitionTemplate.kind;
    if (selectedDefinitionTemplate.custom) {
      setCustomDeviceTemplates((current: any) =>
        current.map((template: any) =>
          template.kind === targetKind
            ? {
                ...template,
                allowResizeTransform: nextAllowed
              }
            : template
        )
      );
    } else {
      setDeviceDefinitionOverrides((current: any) => {
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

export function createSaveDeviceDefinitionStateVisualDraft(__appScope: DeviceDefinitionScope) {
  return () => {
  const { DEFAULT_STATE_PAGE_ID, activeStateDraftRow, createStateDraftRow, definitionStateDraftRows, definitionStatePageId, deviceDefinitionOverrideForTemplate, getTemplateParameterDefinitions, selectedDefinitionTemplate, setCustomDeviceTemplates, setDefinitionDraftError, setDefinitionStateDraftRows, setDefinitionStatePageId, setDeviceDefinitionOverrides, syncExistingNodesWithTemplateDefinitions, validateStateDraftRows, writeOperationLog } = __appScope;
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
      setCustomDeviceTemplates((current: any) =>
        current.map((template: any) => {
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
      setDeviceDefinitionOverrides((current: any) => {
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
        parameterDefinitions: resolveEffectiveTemplateParameterDefinitions(selectedDefinitionTemplate, __appScope.libraryTemplates),
        stateDefinitions
      },
      resolveEffectiveTemplateParameterDefinitions(selectedDefinitionTemplate, __appScope.libraryTemplates),
      (node: any) => node.kind === selectedDefinitionTemplate.kind
    );
    const nextStateRows = stateDefinitions.map((definition: any) => createStateDraftRow(definition));
    setDefinitionStateDraftRows(nextStateRows);
    setDefinitionStatePageId(nextStateRows.find((row: any) => row.value === activeStateValue)?.id ?? DEFAULT_STATE_PAGE_ID);
    setDefinitionDraftError("");
    writeOperationLog(`保存状态样式：${selectedDefinitionTemplate.label}`);
  };
}

export function createSaveDeviceDefinitionVisualDraft(__appScope: DeviceDefinitionScope) {
  return () => {
  const { DEFAULT_STATE_PAGE_ID, TERMINAL_TYPE_LIBRARY_LABELS, activeStateDraftRow, createStateDraftRow, definitionStateDraftRows, definitionStatePageId, definitionVisualDraft, definitionVisualTerminalAnchors, deviceDefinitionOverrideForTemplate, getTemplateParameterDefinitions, hasOverlappingCustomDeviceTerminalAnchors, selectedDefinitionTemplate, setCustomDeviceTemplates, setDefinitionDraftError, setDefinitionStateDraftRows, setDefinitionStatePageId, setDefinitionTerminalAnchorDragIndex, setDefinitionVisualDraft, setDeviceDefinitionOverrides, syncExistingNodesWithTemplateDefinitions, templateAllowsResizeTransform, validateStateDraftRows, writeOperationLog } = __appScope;
    if (!selectedDefinitionTemplate || !definitionVisualDraft) {
      return;
    }
    if (hasOverlappingCustomDeviceTerminalAnchors(definitionVisualTerminalAnchors)) {
      const message = "不同端子位置不能重叠，请调整端子位置后再保存。";
      showGlobalMessage(message);
      setDefinitionVisualDraft((current: any) => current ? { ...current, error: message } : current);
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
    const terminalLabels = definitionVisualDraft.terminalLabels.slice(0, definitionVisualDraft.terminalCount).map((label: any, index: any) => {
      const type = terminalTypes[index] ?? selectedDefinitionTemplate.terminalType;
      return label.trim() || `${TERMINAL_TYPE_LIBRARY_LABELS[type] ?? type}端${index + 1}`;
    });
    const terminalAnchors = definitionVisualTerminalAnchors.slice(0, definitionVisualDraft.terminalCount).map((anchor: any) => ({ ...anchor }));
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
    const parameterDefinitions = resolveEffectiveTemplateParameterDefinitions(selectedDefinitionTemplate, __appScope.libraryTemplates);
    if (selectedDefinitionTemplate.custom) {
      setCustomDeviceTemplates((current: any) =>
        current.map((template: any) => {
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
      setDeviceDefinitionOverrides((current: any) => {
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
      (node: any) => node.kind === selectedDefinitionTemplate.kind
    );
    const nextStateRows = stateDefinitions.map((definition: any) => createStateDraftRow(definition));
    setDefinitionVisualDraft((current: any) => current ? { ...current, size, terminalLabels, terminalAnchors, ...backgroundParams, error: "" } : current);
    setDefinitionStateDraftRows(nextStateRows);
    setDefinitionStatePageId(nextStateRows.find((row: any) => row.value === activeStateValue)?.id ?? DEFAULT_STATE_PAGE_ID);
    setDefinitionTerminalAnchorDragIndex(null);
    setDefinitionDraftError("");
    writeOperationLog(`修改元件图标和端子：${selectedDefinitionTemplate.label}`);
  };
}

export function createSaveDeviceDefinitionDraft(__appScope: DeviceDefinitionScope) {
  return () => {
  const { ALLOW_RESIZE_TRANSFORM_PARAM, createDefinitionDraftRows, definitionDeleteAllParametersRequestedRef, definitionDraftRows, definitionDraftSection, definitionMeasurementDraft, deviceDefinitionKeyForTemplate, deviceDefinitionOverrideForTemplate, deviceDefinitionRowId, getTemplateParameterDefinitions, isReservedDeviceDefinitionParamName, libraryTemplates, measurementConfig, measurementConfigDraft, measurementConfigDraftRef, normalizeComponentLibraryName, normalizeDefinitionRowEnumFields, selectedDefinitionTemplate, setDefinitionDraftError, setDefinitionDraftRows, setDefinitionMeasurementDraft = () => undefined, setDeviceDefinitionOverrides, syncExistingNodesWithTemplateDefinitions, templateAllowsResizeTransform } = __appScope;
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
    const explicitlyDeletesAllParameters = !selectedDefinitionTemplate.custom && rowsForSave.length === 0 &&
      definitionDeleteAllParametersRequestedRef?.current === true;
    if (!selectedDefinitionTemplate.custom && rowsForSave.length === 0 && !explicitlyDeletesAllParameters) {
      setDefinitionDraftError("内置设备的空参数表不会保存；如需清空，请使用“删除全部参数”。");
      return;
    }
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
    const paramsSeed: Record<string, string> = derivedInfo
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
    const selectedProfileItems = normalizeDeviceMeasurementDefinitions(definitionMeasurementDraft);
    const measurementPositionDefinitions = buildMeasurementProfilePositionDefinitions({
      source: { ...selectedDefinitionTemplate, parameterDefinitions: normalizedRows },
      parameterDefinitions: normalizedRows,
      libraryTemplates
    });
    const materializedFields = materializeNewMeasurementDefinitionFields({
      previousItems: selectedDefinitionTemplate.measurementDefinitions ?? [],
      nextItems: selectedProfileItems,
      measurementTypes: currentMeasurementConfig?.measurementTypes ?? [],
      parameterDefinitions: normalizedRows,
      positionDefinitions: measurementPositionDefinitions,
      materializeDeviceFields: false
    });
    const completedRows = materializedFields.parameterDefinitions;
    for (const row of completedRows) {
      if (row.enName !== "name" && !(row.enName in params)) {
        params[row.enName] = row.typicalValue;
      }
    }
    const measurementProfileMessage = measurementProfileItemsComplianceMessage(selectedProfileItems, {
      measurementTypes: currentMeasurementConfig?.measurementTypes ?? [],
      parameterDefinitions: completedRows,
      positionDefinitions: materializedFields.positionDefinitions,
      targetLabel: selectedDefinitionTemplate.label
    });
    if (measurementProfileMessage) {
      setDefinitionDraftError(measurementProfileMessage);
      return;
    }
    const previousDefinitions = derivedInfo && typeof createDefinitionDraftRows === "function"
      ? createDefinitionDraftRows(selectedDefinitionTemplate)
      : resolveEffectiveTemplateParameterDefinitions(selectedDefinitionTemplate, libraryTemplates);
    syncExistingNodesWithTemplateDefinitions(
      { parameterDefinitions: completedRows },
      previousDefinitions,
      (node: any) => {
        const nodeTemplate = libraryTemplates.find((template: any) => template.kind === node.kind);
        return Boolean(nodeTemplate && deviceTemplatesShareParameterDefinitions(selectedDefinitionTemplate, nodeTemplate));
      }
    );
    setDeviceDefinitionOverrides((current: any) => {
      const next = appendAssociatedMeasurementFieldsToOverrides({ ...current }, materializedFields.additions, {
        libraryTemplates,
        deviceDefinitionOverrideForTemplate,
        getTemplateParameterDefinitions
      });
      const existingOverride = current[overrideKey];
      for (const peer of libraryTemplates.filter((template: any) => deviceTemplatesShareParameterDefinitions(selectedDefinitionTemplate, template))) {
        if (!next[peer.kind] || peer.kind === overrideKey) continue;
        const peerOverride = { ...next[peer.kind] };
        delete peerOverride.parameterDefinitions;
        delete peerOverride.measurementDefinitions;
        delete peerOverride.measurementDefinitionsIntent;
        next[peer.kind] = peerOverride;
      }
      next[overrideKey] = {
        ...existingOverride,
        kind: overrideKey,
        params: {
          ...(existingOverride?.params ?? {}),
          ...params
        },
        parameterDefinitions: completedRows,
        ...(explicitlyDeletesAllParameters ? { parameterDefinitionsIntent: "delete-all" as const } : {}),
        measurementDefinitions: selectedProfileItems,
        ...(selectedProfileItems.length === 0 ? { measurementDefinitionsIntent: "delete-all" as const } : {}),
        updatedAt: new Date().toISOString()
      };
      return normalizeSharedDeviceDefinitionOverrides(next, libraryTemplates);
    });
    if (definitionDeleteAllParametersRequestedRef) definitionDeleteAllParametersRequestedRef.current = false;
    syncAssociatedMeasurementFieldAdditions(
      materializedFields.additions,
      libraryTemplates,
      getTemplateParameterDefinitions,
      syncExistingNodesWithTemplateDefinitions
    );
    setDefinitionDraftRows(completedRows.map((row) => ({ ...row, id: deviceDefinitionRowId() })));
    setDefinitionMeasurementDraft(selectedProfileItems);
    setDefinitionDraftError("");
  };
}

export function createResetDeviceDefinitionDraft(__appScope: DeviceDefinitionScope) {
  return () => {
  const { deviceDefinitionKeyForTemplate, loadDefinitionTemplateDraft, selectedDefinitionBaseTemplate, setDeviceDefinitionOverrides } = __appScope;
    if (!selectedDefinitionBaseTemplate) {
      return;
    }
    loadDefinitionTemplateDraft(selectedDefinitionBaseTemplate);
    const definitionKey = deviceDefinitionSharedKeyForTemplate(selectedDefinitionBaseTemplate);
    setDeviceDefinitionOverrides((current: any) => {
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

export function createUpdateCustomDraftTerminalCount(__appScope: DeviceDefinitionScope) {
  return (value: number) => {
  const { MAX_CUSTOM_DEVICE_TERMINALS, TERMINAL_TYPE_LIBRARY_LABELS, createDefaultCustomDeviceTerminalAnchors, normalizeContainerTerminalAssociations, setCustomDeviceDialogView, setCustomDeviceDraft } = __appScope;
    const count = clampNumber(Math.round(value || 0), 0, MAX_CUSTOM_DEVICE_TERMINALS);
    if (count === 0) {
      setCustomDeviceDialogView("icon");
    }
    setCustomDeviceDraft((current: any) => {
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

export function createChooseCustomDeviceBackground(__appScope: DeviceDefinitionScope) {
  return (event: ChangeEvent<HTMLInputElement>) => {
  const { activeImageFolderId, refreshImageFolders, setCustomDeviceDraft, setCustomDeviceSaveMessage, setImageAssetList, setImageAssets, uploadBackendImage } = __appScope;
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
        setImageAssetList((current: any) => [uploadedAsset, ...current.filter((item: any) => item.id !== uploadedAsset.id)]);
        setImageAssets((current: any) => ({ ...current, [uploadedAsset.id]: uploadedAsset.url }));
        void refreshImageFolders();
      } catch (error) {
        showGlobalMessage(error instanceof Error ? error.message : "上传元件图标到后台失败，将仅保留当前本地预览。");
      }
      setCustomDeviceDraft((current: any) => ({
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

export function createChooseDefinitionTemplateIcon(__appScope: DeviceDefinitionScope) {
  return (event: ChangeEvent<HTMLInputElement>) => {
  const { activeImageFolderId, refreshImageFolders, setDefinitionVisualDraft, setImageAssetList, setImageAssets, uploadBackendImage } = __appScope;
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
        setImageAssetList((current: any) => [uploadedAsset, ...current.filter((item: any) => item.id !== uploadedAsset.id)]);
        setImageAssets((current: any) => ({ ...current, [uploadedAsset.id]: uploadedAsset.url }));
        void refreshImageFolders();
      } catch (error) {
        showGlobalMessage(error instanceof Error ? error.message : "上传元件图标到后台失败，将仅保留当前本地预览。");
      }
      setDefinitionVisualDraft((current: any) =>
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

export function createChooseStateVisualImage(__appScope: DeviceDefinitionScope) {
  return (event: ChangeEvent<HTMLInputElement>) => {
  const { activeImageFolderId, refreshImageFolders, setImageAssetList, setImageAssets, setStateImageUploadTarget, stateImageUploadTarget, updateCustomDeviceStateDraftRow, updateDefinitionStateDraftRow, uploadBackendImage } = __appScope;
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
        setImageAssetList((current: any) => [uploadedAsset, ...current.filter((item: any) => item.id !== uploadedAsset.id)]);
        setImageAssets((current: any) => ({ ...current, [uploadedAsset.id]: uploadedAsset.url }));
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

export function createEnsureCustomComponentTreeExpanded(__appScope: DeviceDefinitionScope) {
  return (categoryLibraryName: string, componentLibrary?: string) => {
  const { customComponentTreeTypeKey, normalizeCategoryLibraryName, setCollapsedCustomComponentTreeLibraries, setCollapsedCustomComponentTreeTypes } = __appScope;
    const normalizedLibrary = normalizeCategoryLibraryName(categoryLibraryName);
    setCollapsedCustomComponentTreeLibraries((current: any) => {
      const next = new Set(current);
      next.delete(normalizedLibrary);
      return next;
    });
    if (componentLibrary) {
      const typeKey = customComponentTreeTypeKey(normalizedLibrary, componentLibrary);
      setCollapsedCustomComponentTreeTypes((current: any) => {
        const next = new Set(current);
        next.delete(typeKey);
        return next;
      });
    }
  };
}

export function createCancelPendingCustomComponentTemplateLoad(__appScope: DeviceDefinitionScope) {
  return () => {
  const { customComponentSelectionFrameRef, customComponentSelectionRequestRef } = __appScope;
    customComponentSelectionRequestRef.current += 1;
    if (customComponentSelectionFrameRef.current !== null) {
      window.cancelAnimationFrame(customComponentSelectionFrameRef.current);
      customComponentSelectionFrameRef.current = null;
    }
  };
}

export function createSelectCustomCategoryLibrary(__appScope: DeviceDefinitionScope) {
  return (categoryLibraryName: string, options: { expand?: boolean } = {}) => {
  const { DEFAULT_STATE_PAGE_ID, cancelPendingCustomComponentTemplateLoad, defaultComponentLibraryForCategoryLibrary, ensureCustomComponentTreeExpanded, normalizeCategoryLibraryName, normalizeComponentLibraryName, setCustomComponentTreeSelection, setCustomDeviceDefinitionMode = () => undefined, setCustomDeviceDraft, setCustomDeviceDraftCleanBaseline = () => undefined, setCustomDeviceStatePageId, setEditingCustomDeviceKind, setSelectedDefinitionKind = () => undefined } = __appScope;
    cancelPendingCustomComponentTemplateLoad();
    const group = normalizeCategoryLibraryName(categoryLibraryName);
    const section = defaultComponentLibraryForCategoryLibrary(group);
    const libraryDraftPatch = customDeviceDraftPatchForComponentLibrarySelection(__appScope, section, group);
    if (options.expand !== false) {
      ensureCustomComponentTreeExpanded(group);
    }
    setCustomComponentTreeSelection({ kind: "categoryLibrary", categoryLibraryName: group });
    setCustomDeviceDefinitionMode("edit");
    setEditingCustomDeviceKind("");
    setSelectedDefinitionKind("");
    setCustomDeviceStatePageId(DEFAULT_STATE_PAGE_ID);
    const nextDraft = {
      ...__appScope.customDeviceDraft,
      categoryLibraryName: group,
      componentLibrary: normalizeComponentLibraryName(section),
      componentName: "",
      componentKind: "",
      ...libraryDraftPatch,
      error: ""
    };
    setCustomDeviceDraft(nextDraft);
    setCustomDeviceDraftCleanBaseline(nextDraft, nextDraft.terminalAnchors);
  };
}

function componentLibraryMetadataDraftPatch(
  __appScope: DeviceDefinitionScope,
  className: string,
  categoryLibraryName = ""
) {
  const {
    customComponentLibraries = [],
    deviceDefinitionOverrides = {},
    libraryTemplates = [],
    normalizeCategoryLibraryName = (value: unknown) => String(value ?? "").trim(),
    normalizeComponentLibraryName = (value: unknown) => String(value ?? "").trim()
  } = __appScope;
  const normalizedClassName = normalizeComponentLibraryName(className);
  const normalizedCategoryLibraryName = normalizeCategoryLibraryName(categoryLibraryName);
  const editableClassDefinition = resolveEditableComponentLibraryDefinition({
    className: normalizedClassName,
    categoryLibraryName: normalizedCategoryLibraryName,
    customComponentLibraries,
    templates: libraryTemplates,
    overrides: deviceDefinitionOverrides
  });
  const metadata = editableClassDefinition?.metadata ?? resolveComponentLibraryClassMetadata(
    normalizedClassName,
    normalizedCategoryLibraryName,
    customComponentLibraries,
    libraryTemplates
  ) ?? resolveComponentLibraryClassFamilyMetadata(
    normalizedClassName,
    normalizedCategoryLibraryName,
    customComponentLibraries,
    libraryTemplates
  ).find((item) => item.className.toLowerCase() === normalizedClassName.toLowerCase());
  if (!metadata) return null;
  const terminalTypes = Array.from(
    { length: COMPONENT_LIBRARY_MAX_TERMINALS },
    (_, index) => metadata.terminalTypes[index] ?? defaultTerminalTypeForCategoryLibrary(metadata.categoryLibraryName)
  );
  const terminalLabels = Array.from(
    { length: COMPONENT_LIBRARY_MAX_TERMINALS },
    (_, index) => metadata.terminalLabels[index] ?? ""
  );
  const terminalRoles = Array.from(
    { length: COMPONENT_LIBRARY_MAX_TERMINALS },
    (_, index) => metadata.terminalRoles[index] ?? "single-load"
  );
  const terminalAssociations = Array.from(
    { length: COMPONENT_LIBRARY_MAX_TERMINALS },
    (_, index) => metadata.terminalAssociations[index] ?? defaultTerminalAssociationForClassTerminal(terminalTypes[index])
  );
  return {
    categoryLibraryName: metadata.categoryLibraryName,
    componentLibrary: metadata.baseComponentLibrary,
    isDerivedComponentLibrary: metadata.isDerivedComponentLibrary,
    derivedFromComponentLibrary: metadata.isDerivedComponentLibrary ? metadata.baseComponentLibrary : "",
    derivedComponentLibrary: metadata.isDerivedComponentLibrary ? metadata.className : "",
    derivedComponentLibraryLabel: metadata.isDerivedComponentLibrary ? metadata.label : "",
    terminalCount: metadata.terminalCount,
    terminalTypes,
    terminalLabels,
    terminalRoles,
    terminalAssociations,
    isContainer: metadata.isContainer
  };
}

export function createRequestCustomDeviceDraftAction(__appScope: DeviceDefinitionScope) {
  return (
    action: () => void,
    options: {
      kind?: "close" | "switch-view" | "switch-selection";
      section?: CustomDeviceDialogView;
      actionLabel?: string;
      targetLabel?: string;
    } = {}
  ) => {
    const {
      customDeviceDialogOpen,
      customDeviceDraftHasUnsavedChanges,
      customDevicePendingActionRef,
      setCustomDeviceUnsavedPrompt
    } = __appScope;
    if (!customDeviceDialogOpen || !customDeviceDraftHasUnsavedChanges(options.section)) {
      action();
      return true;
    }
    customDevicePendingActionRef.current = action;
    setCustomDeviceUnsavedPrompt({
      kind: options.kind ?? "switch-selection",
      section: options.section ?? null,
      actionLabel: options.actionLabel ?? "继续操作",
      targetLabel: options.targetLabel ?? ""
    });
    return false;
  };
}

export function createResolveCustomDeviceUnsavedPrompt(__appScope: DeviceDefinitionScope) {
  return (choice: "save" | "discard" | "cancel") => {
    const {
      customDevicePendingActionRef,
      customDeviceUnsavedPrompt,
      revertCustomDeviceDraftAll,
      saveCustomDeviceDefinitionDialog,
      setCustomDeviceUnsavedPrompt
    } = __appScope;
    if (!customDeviceUnsavedPrompt) {
      return false;
    }
    if (choice === "cancel") {
      customDevicePendingActionRef.current = null;
      setCustomDeviceUnsavedPrompt(null);
      return false;
    }
    const finishPendingAction = () => {
      if (choice === "discard" && customDeviceUnsavedPrompt.kind === "switch-view") {
        revertCustomDeviceDraftAll();
      }
      const pendingAction = customDevicePendingActionRef.current;
      customDevicePendingActionRef.current = null;
      setCustomDeviceUnsavedPrompt(null);
      pendingAction?.();
      return true;
    };
    if (choice !== "save") {
      return finishPendingAction();
    }
    const saveResult = saveCustomDeviceDefinitionDialog({ closeAfterSave: false });
    if (saveResult && typeof saveResult.then === "function") {
      return Promise.resolve(saveResult).then((saved) => saved === true ? finishPendingAction() : false);
    }
    return saveResult === true ? finishPendingAction() : false;
  };
}

export function createRequestCustomDeviceDialogView(__appScope: DeviceDefinitionScope) {
  return (nextView: CustomDeviceDialogView) => {
    const {
      customDeviceDialogView,
      requestCustomDeviceDraftAction,
      setCustomDeviceDialogView
    } = __appScope;
    if (nextView === customDeviceDialogView) {
      return true;
    }
    const viewLabels: Record<CustomDeviceDialogView, string> = {
      icon: "图元定义",
      parameters: "参数定义",
      measurements: "量测定义"
    };
    return requestCustomDeviceDraftAction(
      () => setCustomDeviceDialogView(nextView),
      {
        kind: "switch-view",
        section: customDeviceDialogView,
        actionLabel: `切换到${viewLabels[nextView]}`,
        targetLabel: viewLabels[nextView]
      }
    );
  };
}

function customDeviceDraftPatchForComponentLibrarySelection(
  __appScope: DeviceDefinitionScope,
  className: string,
  categoryLibraryName = "",
  options: { includeInherited?: boolean } = {}
) {
  const {
    createCustomDeviceDraftFromTemplate,
    customComponentLibraries = [],
    deviceDefinitionOverrides = {},
    libraryTemplates = [],
    normalizeComponentLibraryName = (value: unknown) => String(value ?? "").trim(),
    resolveTemplateComponentLibrary
  } = __appScope;
  const section = normalizeComponentLibraryName(className);
  const classMetadataPatch = componentLibraryMetadataDraftPatch(__appScope, section, categoryLibraryName);
  const matchingTemplates = (libraryTemplates ?? []).filter((template: any) => {
    const derivedInfo = templateDerivedComponentLibraryInfo(template);
    if (classMetadataPatch?.isDerivedComponentLibrary) {
      return Boolean(derivedInfo && normalizeComponentLibraryName(derivedInfo.derivedComponentLibrary) === section);
    }
    return !derivedInfo && normalizeComponentLibraryName(
      typeof resolveTemplateComponentLibrary === "function"
        ? resolveTemplateComponentLibrary(template)
        : inferESection(template.kind, template.params ?? {})
    ) === normalizeComponentLibraryName(classMetadataPatch?.componentLibrary || section);
  });
  const representativeTemplate =
    matchingTemplates.find((template: any) => !templateDerivedComponentLibraryInfo(template)) ??
    matchingTemplates[0];
  const editableClassDefinition = resolveEditableComponentLibraryDefinition({
    className: section,
    categoryLibraryName,
    customComponentLibraries,
    templates: libraryTemplates,
    overrides: deviceDefinitionOverrides
  });
  const representativeDraft = representativeTemplate && typeof createCustomDeviceDraftFromTemplate === "function"
    ? createCustomDeviceDraftFromTemplate(representativeTemplate, section)
    : null;
  const classDefinitions = options.includeInherited
    ? editableClassDefinition?.effectiveParameterDefinitions ?? []
    : editableClassDefinition?.parameterDefinitions ?? [];
  const classDefinitionKeys = new Set(classDefinitions.map((definition) => String(definition.enName ?? "").trim().toLowerCase()));
  const inheritedClassDefinitionKeys = new Set(
    (editableClassDefinition?.inheritedParameterDefinitions ?? [])
      .map((definition) => String(definition.enName ?? "").trim().toLowerCase())
  );
  const isDerivedClassDefinition = Boolean(editableClassDefinition?.metadata.isDerivedComponentLibrary);
  const seededDefinitions = editableClassDefinition?.persisted
    ? classDefinitions
    : [
        ...classDefinitions,
        ...(representativeDraft?.params ?? []).filter((definition: any) => {
          const key = String(definition.enName ?? "").trim().toLowerCase();
          return !classDefinitionKeys.has(key) && (
            !isDerivedClassDefinition || (
              key !== "parent" &&
              key !== "dev_type" &&
              !inheritedClassDefinitionKeys.has(key)
            )
          );
        })
      ];
  const params = seededDefinitions.map((definition: any) => ({
    ...definition,
    id: definition.id ?? customParamId(),
    enumOptions: definition.enumOptions?.map((option: any) => ({ ...option })),
    enumValues: definition.enumValues ? [...definition.enumValues] : undefined
  }));
  const editableMeasurements = options.includeInherited
    ? editableClassDefinition?.effectiveMeasurementDefinitions ?? []
    : editableClassDefinition?.measurementDefinitions ?? [];
  const measurementDefinitions = editableClassDefinition?.persisted || editableMeasurements.length
    ? editableMeasurements
    : representativeDraft?.measurementDefinitions ?? [];
  if (!representativeTemplate || typeof createCustomDeviceDraftFromTemplate !== "function") {
    return {
      ...(classMetadataPatch ?? {}),
      params,
      measurementDefinitions: cloneDeviceMeasurementDefinitions(measurementDefinitions) ?? [],
      stateDefinitions: []
    };
  }
  return {
    ...classMetadataPatch,
    size: representativeDraft.size,
    terminalAnchors: representativeDraft.terminalAnchors,
    params,
    measurementDefinitions: cloneDeviceMeasurementDefinitions(measurementDefinitions) ?? [],
    stateDefinitions: []
  };
}

export function createSelectCustomComponentLibrary(__appScope: DeviceDefinitionScope) {
  return (categoryLibraryName: string, sectionName: string, options: { expand?: boolean } = {}) => {
  const { DEFAULT_STATE_PAGE_ID, cancelPendingCustomComponentTemplateLoad, ensureCustomComponentTreeExpanded, normalizeCategoryLibraryName, normalizeComponentLibraryName, setCustomComponentTreeSelection, setCustomDeviceDefinitionMode = () => undefined, setCustomDeviceDraft, setCustomDeviceDraftCleanBaseline = () => undefined, setCustomDeviceStatePageId, setCustomDeviceDialogView, setEditingCustomDeviceKind, setSelectedDefinitionKind = () => undefined } = __appScope;
    cancelPendingCustomComponentTemplateLoad();
    const group = normalizeCategoryLibraryName(categoryLibraryName);
    const section = normalizeComponentLibraryName(sectionName);
    const libraryDraftPatch = customDeviceDraftPatchForComponentLibrarySelection(__appScope, section, group);
    if (options.expand !== false) {
      ensureCustomComponentTreeExpanded(group, section);
    }
    setCustomComponentTreeSelection({ kind: "componentLibrary", categoryLibraryName: group, section });
    setCustomDeviceDefinitionMode("edit");
    setEditingCustomDeviceKind("");
    setSelectedDefinitionKind("");
    setCustomDeviceStatePageId(DEFAULT_STATE_PAGE_ID);
    setCustomDeviceDialogView("parameters");
    const nextDraft = {
      ...__appScope.customDeviceDraft,
      categoryLibraryName: group,
      componentLibrary: section,
      componentName: "",
      componentKind: "",
      ...libraryDraftPatch,
      error: ""
    };
    setCustomDeviceDraft(nextDraft);
    setCustomDeviceDraftCleanBaseline(nextDraft, nextDraft.terminalAnchors);
  };
}

export function createSelectCustomComponentTemplate(__appScope: DeviceDefinitionScope) {
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
    const templateClassName = normalizeComponentLibraryName(
      templateDerivedComponentLibraryInfo(template)?.derivedComponentLibrary || section
    );
    const classMetadataPatch = componentLibraryMetadataDraftPatch(
      __appScope,
      templateClassName,
      categoryLibraryName
    );
    const templateDraft = createCustomDeviceDraftFromTemplate(template, section);
    const nextDraft = classMetadataPatch
      ? { ...templateDraft, ...classMetadataPatch, terminalAnchors: templateDraft.terminalAnchors }
      : templateDraft;
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

export function createStartCustomComponentCreate(__appScope: DeviceDefinitionScope) {
  return () => {
  const { customComponentTreeSelection, nextCustomTemplateKind, normalizeCategoryLibraryName, normalizeComponentLibraryName = (value: unknown) => String(value ?? "").trim(), setCustomLibraryCreateDialog } = __appScope;
    if (customComponentTreeSelection?.kind !== "componentLibrary") {
      return;
    }
    const categoryLibraryName = normalizeCategoryLibraryName(customComponentTreeSelection.categoryLibraryName);
    const selectedClassName = normalizeComponentLibraryName(customComponentTreeSelection.section);
    if (!categoryLibraryName || !selectedClassName) {
      return;
    }
    const classMetadataPatch = componentLibraryMetadataDraftPatch(
      __appScope,
      selectedClassName,
      categoryLibraryName
    );
    setCustomLibraryCreateDialog({
      kind: "component",
      title: "新建元件",
      cnName: "",
      enName: nextCustomTemplateKind(selectedClassName),
      categoryLibraryName,
      componentClassName: selectedClassName,
      lockedComponentClassName: selectedClassName,
      componentClassLocked: true,
      componentLibrary: classMetadataPatch?.componentLibrary || selectedClassName,
      allowResizeTransform: "0",
      isDerivedComponentLibrary: Boolean(classMetadataPatch?.isDerivedComponentLibrary),
      derivedFromComponentLibrary: classMetadataPatch?.derivedFromComponentLibrary || "",
      derivedComponentLibrary: classMetadataPatch?.derivedComponentLibrary || "",
      derivedComponentLibraryLabel: classMetadataPatch?.derivedComponentLibraryLabel || "",
      error: ""
    });
  };
}

function cloneCustomComponentTemplateSnapshot(template: DeviceTemplate): DeviceTemplate {
  if (typeof structuredClone === "function") {
    return structuredClone(template);
  }
  return JSON.parse(JSON.stringify(template)) as DeviceTemplate;
}

export function createCopyCustomComponentTemplate(__appScope: DeviceDefinitionScope) {
  return (template: DeviceTemplate | null | undefined) => {
    const {
      buildDeviceTemplateCopyVisualSvg: injectedBuildDeviceTemplateCopyVisualSvg,
      createTemplateDefaultStateIconImage: injectedCreateTemplateDefaultStateIconImage,
      setCopiedCustomComponentTemplate,
      setCustomDeviceSaveMessage = () => undefined,
      showGlobalMessage = () => undefined,
      svgSourceToDataUrl: injectedSvgSourceToDataUrl
    } = __appScope;
    if (!template?.kind) {
      showGlobalMessage("请先右键选择一个具体元件再复制。");
      return false;
    }
    const snapshot = cloneCustomComponentTemplateSnapshot(template);
    const sourceBackgroundImage = String(snapshot.params?.backgroundImage ?? "").trim();
    const sourceBackgroundImageAssetId = String(snapshot.params?.backgroundImageAssetId ?? "").trim();
    const sourceBackgroundImageCleared = String(snapshot.params?.backgroundImageCleared ?? "").trim();
    const sourceAlreadyHasEditableVisual = Boolean(
      sourceBackgroundImage || sourceBackgroundImageAssetId || sourceBackgroundImageCleared
    );
    if (!sourceAlreadyHasEditableVisual) {
      const buildTemplateDefaultStateIconImage = typeof injectedCreateTemplateDefaultStateIconImage === "function"
        ? injectedCreateTemplateDefaultStateIconImage
        : createTemplateDefaultStateIconImage;
      const editableCopyVisual = buildTemplateDefaultStateIconImage(__appScope, snapshot, {
        label: snapshot.label,
        size: snapshot.size,
        terminalCount: snapshot.terminalCount,
        terminalTypes: snapshot.terminalTypes,
        terminalLabels: snapshot.terminalLabels,
        terminalAnchors: snapshot.terminalAnchors
      });
      if (String(editableCopyVisual ?? "").trim()) {
        snapshot.params = {
          ...snapshot.params,
          backgroundImage: editableCopyVisual,
          backgroundImageAssetId: "",
          backgroundImageFit: "fixed",
          backgroundImageCleared: ""
        };
      } else {
        const buildDeviceTemplateCopyVisualSvg = typeof injectedBuildDeviceTemplateCopyVisualSvg === "function"
          ? injectedBuildDeviceTemplateCopyVisualSvg
          : defaultBuildDeviceTemplateCopyVisualSvg;
        const svgSourceToDataUrl = typeof injectedSvgSourceToDataUrl === "function"
          ? injectedSvgSourceToDataUrl
          : defaultSvgSourceToDataUrl;
        try {
          const copyVisualSvg = buildDeviceTemplateCopyVisualSvg(snapshot);
          const copyVisualDataUrl = svgSourceToDataUrl(copyVisualSvg);
          if (String(copyVisualDataUrl ?? "").trim()) {
            snapshot.params = {
              ...snapshot.params,
              backgroundImage: copyVisualDataUrl,
              backgroundImageAssetId: "",
              backgroundImageFit: "contain",
              backgroundImageCleared: ""
            };
          }
        } catch (error) {
          console.warn("[custom-component-copy] failed to solidify source visual", error);
        }
      }
    }
    setCopiedCustomComponentTemplate(snapshot);
    const copyMessage = `已复制元件：${template.label || template.englishName || template.kind}。可在同一类或其他类下重复粘贴。`;
    setCustomDeviceSaveMessage(copyMessage);
    showGlobalMessage(copyMessage, "success");
    return true;
  };
}

export function createPasteCustomComponentTemplate(__appScope: DeviceDefinitionScope) {
  return (categoryLibraryNameInput: string, componentClassNameInput: string) => {
    const {
      copiedCustomComponentTemplate,
      nextCustomTemplateKind,
      normalizeCategoryLibraryName = (value: unknown) => String(value ?? "").trim(),
      normalizeComponentLibraryName = (value: unknown) => String(value ?? "").trim(),
      requireEditMode,
      setCustomLibraryCreateDialog,
      showGlobalMessage = () => undefined
    } = __appScope;
    if (!copiedCustomComponentTemplate?.kind) {
      showGlobalMessage("还没有复制元件，请先右键具体元件执行“复制元件”。");
      return false;
    }
    const categoryLibraryName = normalizeCategoryLibraryName(categoryLibraryNameInput);
    const componentClassName = normalizeComponentLibraryName(componentClassNameInput);
    if (!categoryLibraryName || !componentClassName) {
      showGlobalMessage("请选择粘贴目标类。");
      return false;
    }
    const classMetadataPatch = componentLibraryMetadataDraftPatch(
      __appScope,
      componentClassName,
      categoryLibraryName
    );
    const copiedLabel = String(copiedCustomComponentTemplate.label ?? "元件").trim() || "元件";
    setCustomLibraryCreateDialog({
      kind: "component",
      title: "粘贴为新元件",
      cnName: `${copiedLabel}-副本`,
      enName: nextCustomTemplateKind(componentClassName),
      categoryLibraryName,
      componentClassName,
      lockedComponentClassName: componentClassName,
      componentClassLocked: true,
      componentLibrary: classMetadataPatch?.componentLibrary || componentClassName,
      allowResizeTransform: copiedCustomComponentTemplate.allowResizeTransform ? "1" : "0",
      isDerivedComponentLibrary: Boolean(classMetadataPatch?.isDerivedComponentLibrary),
      derivedFromComponentLibrary: classMetadataPatch?.derivedFromComponentLibrary || "",
      derivedComponentLibrary: classMetadataPatch?.derivedComponentLibrary || "",
      derivedComponentLibraryLabel: classMetadataPatch?.derivedComponentLibraryLabel || "",
      copySourceTemplate: cloneCustomComponentTemplateSnapshot(copiedCustomComponentTemplate),
      error: ""
    });
    return true;
  };
}

export function createExportCustomComponentTemplateSvg(__appScope: DeviceDefinitionScope) {
  return async (template: DeviceTemplate | null | undefined) => {
    const {
      buildDeviceTemplateIconSvg,
      downloadBlob,
      saveTextFile,
      setCustomDeviceSaveMessage = () => undefined,
      showGlobalMessage = () => undefined
    } = __appScope;
    if (!template?.kind) {
      showGlobalMessage("请先右键选择要导出的具体元件。");
      return false;
    }
    const svg = buildDeviceTemplateIconSvg(template);
    const rawFileName = String(template.englishName ?? template.kind ?? template.label ?? "component").trim();
    const safeFileName = rawFileName.replace(/[^A-Za-z0-9_-]+/g, "_") || "component";
    const filename = `${safeFileName}.svg`;
    // 本机另存为才拿得到磁盘路径 → 弹框里才有【查看】
    let savedFile: SavedExportFile | null = null;
    const captureSavedFile = (saved: SavedExportFile) => {
      savedFile = saved;
    };
    const saved = typeof saveTextFile === "function"
      ? await saveTextFile({
          filename,
          text: svg,
          mime: "image/svg+xml",
          description: "SVG 图元文件",
          extensions: [".svg"],
          pickerId: "custom-component-svg-export",
          startIn: "downloads",
          preferNativeDialog: true,
          onSaved: captureSavedFile
        })
      : (() => {
          downloadBlob(filename, new Blob([svg], { type: "image/svg+xml;charset=utf-8" }));
          return true;
        })();
    if (!saved) {
      return false;
    }
    const message = `已导出元件 SVG：${filename}`;
    setCustomDeviceSaveMessage(message);
    showStandaloneExportCompletion(__appScope, "元件 SVG 导出完成", message, [], savedFile);
    return true;
  };
}

export function createOpenCustomComponentSvgImport(__appScope: DeviceDefinitionScope) {
  return (_template?: DeviceTemplate) => {
    const {
      customComponentSvgImportInputRef,
      requireEditMode,
      showGlobalMessage = () => undefined
    } = __appScope;
    if (!customComponentSvgImportInputRef?.current) {
      showGlobalMessage("SVG 文件选择器尚未就绪，请稍后重试。");
      return false;
    }
    customComponentSvgImportInputRef.current.click();
    return true;
  };
}

export function createImportCustomComponentSvg(__appScope: DeviceDefinitionScope) {
  return async (event: ChangeEvent<HTMLInputElement>) => {
    const {
      DEFAULT_STATE_PAGE_ID,
      createEditableStateIconElementsFromSvgSource: injectedCreateEditableStateIconElementsFromSvgSource,
      requireEditMode,
      setCustomDeviceDialogView = () => undefined,
      setCustomDeviceDraft,
      setCustomDeviceSaveMessage = () => undefined,
      setCustomDeviceStatePageId = () => undefined,
      showGlobalMessage = () => undefined,
      stateIconDrawingToPersistedImage: injectedStateIconDrawingToPersistedImage
    } = __appScope;
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) {
      return false;
    }
    const isSvgFile = file.type === "image/svg+xml" || file.name.toLowerCase().endsWith(".svg");
    if (!isSvgFile) {
      showGlobalMessage("请选择 SVG 文件。");
      return false;
    }
    let svgSource = "";
    try {
      svgSource = await file.text();
    } catch (error) {
      showGlobalMessage(error instanceof Error ? error.message : "读取 SVG 文件失败。");
      return false;
    }
    if (!/<svg\b[^>]*>/iu.test(svgSource)) {
      showGlobalMessage("所选文件不是有效的 SVG 图形。");
      return false;
    }
    const createEditableElements = typeof injectedCreateEditableStateIconElementsFromSvgSource === "function"
      ? injectedCreateEditableStateIconElementsFromSvgSource
      : defaultCreateEditableStateIconElementsFromSvgSource;
    const stateIconDrawingToPersistedImage = typeof injectedStateIconDrawingToPersistedImage === "function"
      ? injectedStateIconDrawingToPersistedImage
      : defaultStateIconDrawingToPersistedImage;
    const editableElements = createEditableElements(svgSource, file.name, { preserveImportedSvg: true });
    if (!editableElements.length) {
      showGlobalMessage("SVG 中没有可编辑的可见图形。请检查图形内容后重试。");
      return false;
    }
    // Platform-exported component SVGs keep the component's natural size on
    // the device <use> element (for example, 150×94 for ACGenerator). A new
    // component draft starts at 104×64, so leaving that default in place makes
    // an imported component visibly smaller even when its editable layers were
    // parsed correctly. Preserve the source size for the platform export
    // shape; ordinary SVG imports keep the user's current draft size.
    const readSvgAttribute = (markup: string, name: string) => {
      const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const match = new RegExp(`\\b${escapedName}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, "i").exec(markup);
      return (match?.[1] ?? match?.[2] ?? match?.[3] ?? "").trim();
    };
    const sourceUseMarkup = Array.from(svgSource.matchAll(/<use\b[^>]*>/giu))
      .map((match) => match[0])
      .find((markup) => ["dev-kind", "data-export-device-kind", "data-export-node-kind"].some((attribute) => readSvgAttribute(markup, attribute)));
    const importedSourceSize = sourceUseMarkup
      ? {
          width: Number.parseFloat(readSvgAttribute(sourceUseMarkup, "width")),
          height: Number.parseFloat(readSvgAttribute(sourceUseMarkup, "height"))
        }
      : null;
    const hasImportedSourceSize = Boolean(
      importedSourceSize &&
      Number.isFinite(importedSourceSize.width) &&
      importedSourceSize.width > 0 &&
      Number.isFinite(importedSourceSize.height) &&
      importedSourceSize.height > 0
    );
    const backgroundImage = stateIconDrawingToPersistedImage(editableElements);
    if (!backgroundImage) {
      showGlobalMessage("SVG 可编辑图层生成失败，请检查图形内容后重试。");
      return false;
    }
    setCustomDeviceStatePageId(DEFAULT_STATE_PAGE_ID);
    setCustomDeviceDialogView("icon");
    setCustomDeviceDraft((current: CustomDeviceDraft) => ({
      ...current,
      ...(hasImportedSourceSize
        ? { size: { width: importedSourceSize!.width, height: importedSourceSize!.height } }
        : {}),
      backgroundImage,
      backgroundImageAssetId: "",
      backgroundImageFit: "fixed",
      backgroundImageCleared: "",
      error: ""
    }));
    setCustomDeviceSaveMessage(`SVG 图元已导入为 ${editableElements.length} 个可编辑图层，请保存当前元件定义后生效。`);
    return true;
  };
}

const CUSTOM_DEVICE_KIND_NAME_PATTERN = /^[A-Za-z][A-Za-z0-9_-]*$/;

export function createConfirmCustomLibraryCreateDialog(__appScope: DeviceDefinitionScope) {
  return (dialogOverride?: any) => {
  const { DEFAULT_STATE_PAGE_ID, cancelPendingCustomComponentTemplateLoad = () => undefined, categoryLibraries, componentLibraryOptions, createCustomDeviceDraftFromTemplate, createDefaultCustomDeviceTerminalAnchors, createEmptyCustomDeviceDraft, customCategoryLibraries = [], customComponentLibraries = [], customDeviceDraft, customDeviceTemplates, customLibraryCreateDialog, defaultComponentLibraryForCategoryLibrary, deviceDefinitionOverrides = {}, isValidComponentLibraryName, libraryTemplates, normalizeCategoryLibraryName, normalizeComponentLibraryName, normalizeCustomCategoryLibraries, normalizeCustomComponentLibraries, persistDeviceLibraryChange = () => undefined, setCustomCategoryLibraries, setCustomComponentLibraries, setCustomComponentTreeSelection, setCustomDeviceDefinitionMode = () => undefined, setCustomDeviceDialogView = () => undefined, setCustomDeviceDraft, setCustomDeviceDraftCleanBaseline = () => undefined, setCustomDeviceSaveMessage = () => undefined, setCustomDeviceStatePageId = () => undefined, setCustomLibraryCreateDialog, setDeviceDefinitionOverrides = () => undefined, setEditingCustomDeviceKind = () => undefined, setExpandedCategoryLibraries, setSelectedDefinitionKind = () => undefined } = __appScope;
    const dialog = dialogOverride ?? customLibraryCreateDialog;
    if (!dialog) {
      return false;
    }
    const actionName = dialog.kind === "categoryLibrary"
      ? "新建类别库"
      : dialog.kind === "componentLibrary" ? "新建类" : "新建元件";
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
      const nextCustomCategoryLibraries = normalizeCustomCategoryLibraries([...customCategoryLibraries, categoryLibraryName]);
      setCustomCategoryLibraries(nextCustomCategoryLibraries);
      setExpandedCategoryLibraries((current: string[]) => Array.from(new Set([...current, categoryLibraryName])));
      setCustomComponentTreeSelection({ kind: "categoryLibrary", categoryLibraryName });
      cancelPendingCustomComponentTemplateLoad();
      setCustomDeviceDefinitionMode("edit");
      setEditingCustomDeviceKind("");
      setSelectedDefinitionKind("");
      setCustomDeviceStatePageId(DEFAULT_STATE_PAGE_ID);
      setCustomDeviceSaveMessage("");
      setCustomDeviceDialogView("parameters");
      const nextDraft = {
        ...customDeviceDraft,
        ...(typeof createEmptyCustomDeviceDraft === "function" ? createEmptyCustomDeviceDraft(categoryLibraryName) : {}),
        categoryLibraryName,
        componentLibrary: "",
        componentName: "",
        componentKind: "",
        isDerivedComponentLibrary: false,
        derivedFromComponentLibrary: "",
        derivedComponentLibrary: "",
        derivedComponentLibraryLabel: "",
        error: ""
      };
      setCustomDeviceDraft(nextDraft);
      setCustomDeviceDraftCleanBaseline(nextDraft);
      persistDeviceLibraryChange({ customCategoryLibraries: nextCustomCategoryLibraries }, {
        success: `类别库已新建并保存到后台：${categoryLibraryName}`,
        failure: `类别库已新建到本地，后台保存失败：${categoryLibraryName}`
      });
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
      const existingTypes = new Set([
        ...componentLibraryOptions,
        ...customComponentLibraries.map((item: any) => item.name),
        ...(libraryTemplates ?? []).map((template: DeviceTemplate) => templateDerivedComponentLibraryInfo(template)?.derivedComponentLibrary ?? "")
      ].map((item: string) => item.toLowerCase()).filter(Boolean));
      if (existingTypes.has(englishName.toLowerCase())) {
        return setDialogError("类已存在，无法新增同名类。");
      }
      const classCreationMode = dialog.classCreationMode === "base" || dialog.classCreationMode === "derived"
        ? dialog.classCreationMode
        : "";
      const derivedRequested = classCreationMode === "derived"
        ? true
        : classCreationMode === "base"
          ? false
          : Boolean(dialog.isDerivedComponentLibrary);
      const derivedFromComponentLibrary = derivedRequested
        ? normalizeComponentLibraryName(
            classCreationMode === "derived"
              ? dialog.lockedBaseComponentLibrary || dialog.derivedFromComponentLibrary || ""
              : dialog.derivedFromComponentLibrary ?? ""
          )
        : "";
      if (derivedRequested && !derivedFromComponentLibrary) {
        return setDialogError("请选择派生基类。");
      }
      if (derivedRequested && englishName.toLowerCase() === derivedFromComponentLibrary.toLowerCase()) {
        return setDialogError("派生类英文名称不能与基类相同。");
      }
      const inheritedMetadata = derivedRequested
        ? resolveComponentLibraryClassMetadata(
            derivedFromComponentLibrary,
            categoryLibraryName,
            customComponentLibraries,
            libraryTemplates
          ) ?? resolveComponentLibraryClassFamilyMetadata(
            derivedFromComponentLibrary,
            categoryLibraryName,
            customComponentLibraries,
            libraryTemplates
          ).find((item) => item.className.toLowerCase() === derivedFromComponentLibrary.toLowerCase()) ?? null
        : null;
      if (derivedRequested && !inheritedMetadata) {
        return setDialogError("派生基类的元数据不存在，无法继承端子定义。");
      }
      const terminalCount = inheritedMetadata?.terminalCount ?? Number(dialog.terminalCount);
      if (!Number.isInteger(terminalCount) || terminalCount < 0 || terminalCount > COMPONENT_LIBRARY_MAX_TERMINALS) {
        return setDialogError(`端子数量必须是 0-${COMPONENT_LIBRARY_MAX_TERMINALS} 之间的整数。`);
      }
      const fallbackTerminalType = defaultTerminalTypeForCategoryLibrary(categoryLibraryName);
      const terminalTypes = Array.from(
        { length: terminalCount },
        (_, index) => inheritedMetadata?.terminalTypes[index] ?? dialog.terminalTypes?.[index] ?? fallbackTerminalType
      );
      const terminalLabels = Array.from(
        { length: terminalCount },
        (_, index) => String(inheritedMetadata?.terminalLabels[index] ?? dialog.terminalLabels?.[index] ?? "").trim()
      );
      const terminalRoles = Array.from(
        { length: terminalCount },
        (_, index) => inheritedMetadata?.terminalRoles[index] ?? dialog.terminalRoles?.[index] ?? "single-load"
      );
      const terminalAssociations = Array.from(
        { length: terminalCount },
        (_, index) => inheritedMetadata?.terminalAssociations[index] ?? dialog.terminalAssociations?.[index] ?? defaultTerminalAssociationForClassTerminal(terminalTypes[index])
      );
      const metadata = {
        className: englishName,
        categoryLibraryName,
        label: chineseName,
        isDerivedComponentLibrary: derivedRequested,
        baseComponentLibrary: derivedRequested ? derivedFromComponentLibrary : englishName,
        terminalCount,
        terminalTypes,
        terminalLabels,
        terminalRoles,
        terminalAssociations,
        isContainer: inheritedMetadata?.isContainer ?? Boolean(dialog.isContainer)
      };
      const definition = componentLibraryDefinitionFromMetadata(metadata);
      const nextCustomComponentLibraries = normalizeCustomComponentLibraries(
        [...customComponentLibraries, definition],
        undefined,
        libraryTemplates
      );
      const editableClassDefinition = resolveEditableComponentLibraryDefinition({
        className: metadata.className,
        categoryLibraryName,
        customComponentLibraries: nextCustomComponentLibraries,
        templates: libraryTemplates,
        overrides: deviceDefinitionOverrides
      });
      const classParameterDefinitions = editableClassDefinition?.parameterDefinitions ??
        buildComponentLibraryDefaultParameterDefinitions(
          metadata.className,
          metadata.terminalTypes.slice(0, metadata.terminalCount),
          {
            isContainer: metadata.isContainer,
            terminalRoles: metadata.terminalRoles.slice(0, metadata.terminalCount),
            terminalAssociations: metadata.terminalAssociations.slice(0, metadata.terminalCount)
          }
        );
      const classMeasurementDefinitions = editableClassDefinition?.measurementDefinitions ?? [];
      const classOverrideKey = componentLibraryDefinitionOverrideKey(metadata.className);
      const nextDeviceDefinitionOverrides = normalizeSharedDeviceDefinitionOverrides({
        ...deviceDefinitionOverrides,
        [classOverrideKey]: {
          kind: classOverrideKey,
          params: {
            component_type: metadata.className,
            ...classParameterDefinitions.reduce((params: Record<string, string>, parameter: any) => {
              if (parameter.enName !== "name") params[parameter.enName] = String(parameter.typicalValue ?? "");
              return params;
            }, {})
          },
          parameterDefinitions: classParameterDefinitions,
          ...(metadata.isDerivedComponentLibrary && classParameterDefinitions.length === 0
            ? { parameterDefinitionsIntent: "delete-all" }
            : {}),
          measurementDefinitions: cloneDeviceMeasurementDefinitions(classMeasurementDefinitions) ?? [],
          ...(classMeasurementDefinitions.length === 0 ? { measurementDefinitionsIntent: "delete-all" } : {}),
          updatedAt: new Date().toISOString()
        }
      }, libraryTemplates);
      setCustomComponentLibraries(nextCustomComponentLibraries);
      setDeviceDefinitionOverrides(nextDeviceDefinitionOverrides);
      const section = metadata.className;
      setCustomComponentTreeSelection({ kind: "componentLibrary", categoryLibraryName, section });
      cancelPendingCustomComponentTemplateLoad();
      setCustomDeviceDefinitionMode("edit");
      setEditingCustomDeviceKind("");
      setSelectedDefinitionKind("");
      setCustomDeviceStatePageId(DEFAULT_STATE_PAGE_ID);
      setCustomDeviceSaveMessage("");
      setCustomDeviceDialogView("parameters");
      const nextDraft = {
        ...customDeviceDraft,
        ...(typeof createEmptyCustomDeviceDraft === "function" ? createEmptyCustomDeviceDraft(categoryLibraryName) : {}),
        categoryLibraryName,
        componentLibrary: metadata.baseComponentLibrary,
        componentName: "",
        componentKind: "",
        isDerivedComponentLibrary: metadata.isDerivedComponentLibrary,
        derivedFromComponentLibrary: metadata.isDerivedComponentLibrary ? metadata.baseComponentLibrary : "",
        derivedComponentLibrary: metadata.isDerivedComponentLibrary ? metadata.className : "",
        derivedComponentLibraryLabel: metadata.isDerivedComponentLibrary ? metadata.label : "",
        terminalCount: metadata.terminalCount,
        terminalTypes: Array.from({ length: COMPONENT_LIBRARY_MAX_TERMINALS }, (_, index) => metadata.terminalTypes[index] ?? fallbackTerminalType),
        terminalLabels: Array.from({ length: COMPONENT_LIBRARY_MAX_TERMINALS }, (_, index) => metadata.terminalLabels[index] ?? ""),
        terminalRoles: Array.from({ length: COMPONENT_LIBRARY_MAX_TERMINALS }, (_, index) => metadata.terminalRoles[index] ?? "single-load"),
        terminalAssociations: Array.from({ length: COMPONENT_LIBRARY_MAX_TERMINALS }, (_, index) => metadata.terminalAssociations[index] ?? defaultTerminalAssociationForClassTerminal(metadata.terminalTypes[index] ?? fallbackTerminalType)),
        isContainer: metadata.isContainer,
        params: classParameterDefinitions.map((parameter: any) => ({
          ...parameter,
          id: customParamId(),
          enumOptions: parameter.enumOptions?.map((option: any) => ({ ...option })),
          enumValues: parameter.enumValues ? [...parameter.enumValues] : undefined
        })),
        measurementDefinitions: cloneDeviceMeasurementDefinitions(classMeasurementDefinitions) ?? [],
        stateDefinitions: [],
        error: ""
      };
      setCustomDeviceDraft(nextDraft);
      setCustomDeviceDraftCleanBaseline(nextDraft);
      persistDeviceLibraryChange({
        customComponentLibraries: nextCustomComponentLibraries,
        deviceDefinitionOverrides: nextDeviceDefinitionOverrides
      }, {
        success: `类已新建并保存到后台：${metadata.label}`,
        failure: `类已新建到本地，后台保存失败：${metadata.label}`
      });
      setCustomLibraryCreateDialog(null);
      return true;
    }

    const categoryLibraryName = normalizeCategoryLibraryName(dialog.categoryLibraryName || customDeviceDraft.categoryLibraryName);
    const selectedClassName = normalizeComponentLibraryName(
      (dialog.componentClassLocked ? dialog.lockedComponentClassName : dialog.componentClassName) ||
      dialog.componentClassName ||
      dialog.componentLibrary ||
      defaultComponentLibraryForCategoryLibrary(categoryLibraryName)
    );
    const libraryDraftPatch = customDeviceDraftPatchForComponentLibrarySelection(
      __appScope,
      selectedClassName,
      categoryLibraryName,
      { includeInherited: true }
    );
    if (!libraryDraftPatch?.componentLibrary) {
      return setDialogError("请选择已有元件类。");
    }
    const section = normalizeComponentLibraryName(libraryDraftPatch.componentLibrary);
    if (!section) {
      return setDialogError("请选择类。");
    }
    if (!CUSTOM_DEVICE_KIND_NAME_PATTERN.test(englishName)) {
      return setDialogError("元件英文名称只能包含英文字母、数字、下划线和短横线，并且必须以英文字母开头。");
    }
    const existingTemplates = [...(libraryTemplates ?? []), ...(customDeviceTemplates ?? [])];
    const duplicateChineseName = existingTemplates.some((template: any) => (
      String(template.label ?? "").trim() === chineseName
    ));
    if (duplicateChineseName) {
      return setDialogError("元件中文名称已存在，无法新增同名元件。");
    }
    const normalizedEnglishName = englishName.toLowerCase();
    const duplicateEnglishName = existingTemplates.some((template: any) => (
      String(template.kind ?? "").trim().toLowerCase() === normalizedEnglishName ||
      String(template.englishName ?? "").trim().toLowerCase() === normalizedEnglishName
    ));
    if (duplicateEnglishName) {
      return setDialogError("元件英文名称已存在，无法新增同名元件。");
    }
    const emptyDraft = createEmptyCustomDeviceDraft(categoryLibraryName);
    const copiedSourceDraft = dialog.copySourceTemplate && typeof createCustomDeviceDraftFromTemplate === "function"
      ? createCustomDeviceDraftFromTemplate(dialog.copySourceTemplate)
      : null;
    const copiedVisualPatch = copiedSourceDraft
      ? {
          size: { ...copiedSourceDraft.size },
          backgroundImage: copiedSourceDraft.backgroundImage,
          backgroundImageAssetId: copiedSourceDraft.backgroundImageAssetId,
          backgroundImageFit: copiedSourceDraft.backgroundImageFit,
          backgroundImageCleared: copiedSourceDraft.backgroundImageCleared,
          terminalAnchors: typeof createDefaultCustomDeviceTerminalAnchors === "function"
            ? createDefaultCustomDeviceTerminalAnchors(
                libraryDraftPatch.terminalCount,
                copiedSourceDraft.terminalAnchors
              )
            : copiedSourceDraft.terminalAnchors.slice(0, libraryDraftPatch.terminalCount).map((anchor: any) => ({ ...anchor })),
          stateDefinitions: JSON.parse(JSON.stringify(copiedSourceDraft.stateDefinitions ?? []))
        }
      : {};
    const nextDraft = {
      ...emptyDraft,
      ...libraryDraftPatch,
      ...copiedVisualPatch,
      componentName: chineseName,
      componentKind: englishName,
      params: (libraryDraftPatch.params ?? []).map((parameter: any) => (
        String(parameter.enName ?? "").trim().toLowerCase() === "dev_type"
          ? { ...parameter, typicalValue: selectedClassName, readonly: false }
          : parameter
      )),
      allowResizeTransform: String(dialog.allowResizeTransform ?? "0") === "1" ? "1" : "0",
      error: ""
    };
    const saveCustomDeviceTemplate = __appScope.saveCustomDeviceTemplate;
    if (typeof saveCustomDeviceTemplate !== "function") {
      return setDialogError("元件保存功能尚未就绪，请稍后重试。");
    }
    cancelPendingCustomComponentTemplateLoad();
    setSelectedDefinitionKind("");
    setCustomDeviceStatePageId(DEFAULT_STATE_PAGE_ID);
    setCustomDeviceSaveMessage("");
    const saved = saveCustomDeviceTemplate({
      draftOverride: nextDraft,
      terminalAnchorsOverride: nextDraft.terminalAnchors.slice(0, libraryDraftPatch.terminalCount),
      editingCustomDeviceKindOverride: "",
      skipInlineDrawingPatch: true
    });
    if (!saved) {
      return setDialogError(dialog.copySourceTemplate
        ? "元件保存失败，请检查复制内容后重试。"
        : "元件保存失败，请检查新建内容后重试。");
    }
    setCustomDeviceDialogView("icon");
    setCustomLibraryCreateDialog(null);
    return true;
  };
}

export function createNextCustomCategoryLibraryName(__appScope: DeviceDefinitionScope) {
  return () => {
    const { categoryLibraries } = __appScope;
    const existingGroups = new Set(categoryLibraries.map((group: any) => group.toLowerCase()));
    for (let index = 1; index <= 999; index += 1) {
      const candidate = `类别库${index}`;
      if (!existingGroups.has(candidate.toLowerCase())) {
        return candidate;
      }
    }
    return `类别库${Date.now()}`;
  };
}

export function createCreateCustomCategoryLibrary(__appScope: DeviceDefinitionScope) {
  return () => {
  const { nextCustomCategoryLibraryName, nextCustomComponentLibraryName, setCustomLibraryCreateDialog } = __appScope;
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

export function createDeleteCustomCategoryLibrary(__appScope: DeviceDefinitionScope) {
  return async (targetCategoryLibraryName?: string) => {
  const { DEVICE_LIBRARY = [], PROTECTED_CATEGORY_LIBRARIES, customComponentLibraries, customDeviceDraft, customDeviceTemplates, defaultComponentLibraryForCategoryLibrary, isBuiltInComponentLibrary, normalizeCategoryLibraryName, resolveTemplateComponentLibrary, setCollapsedCustomComponentTreeLibraries, setCollapsedCustomComponentTreeTypes, setCustomCategoryLibraries, setCustomComponentTreeSelection, setCustomComponentLibraries, setCustomDeviceDraft, setCustomDeviceTemplates, setDefinitionDraftSection, setDeviceDefinitionOverrides, setEditingCustomDeviceKind, setExpandedCategoryLibraries, setExpandedDefinitionGroups, setSelectedDefinitionKind } = __appScope;
    if (targetCategoryLibraryName === undefined) {
      targetCategoryLibraryName = customDeviceDraft.categoryLibraryName;
    }
    const categoryLibraryName = normalizeCategoryLibraryName(targetCategoryLibraryName);
    if (!categoryLibraryName || categoryLibraryName === "静态图元" || PROTECTED_CATEGORY_LIBRARIES.has(categoryLibraryName)) {
      showGlobalMessage("默认类别库无法删除。");
      return;
    }
    const templatesInGroup = customDeviceTemplates.filter((template: any) => normalizeCategoryLibraryName(template.categoryLibrary) === categoryLibraryName);
    const confirmed = await showGlobalConfirm(
      templatesInGroup.length > 0
        ? `类别库“${categoryLibraryName}”中共有 ${templatesInGroup.length} 个元件，删除类别库会同时删除这些元件及其自定义类，是否继续？`
        : `确认删除类别库“${categoryLibraryName}”？`
    );
    if (!confirmed) {
      return;
    }
    const deletedKinds = new Set(templatesInGroup.map((template: any) => template.kind));
    const deletedComponentLibraryKeys = new Set(
      [
        ...templatesInGroup.map(resolveTemplateComponentLibrary),
        ...customComponentLibraries
          .filter((componentLibrary: any) => normalizeCategoryLibraryName(componentLibrary.categoryLibraryName) === categoryLibraryName)
          .map((componentLibrary: any) => componentLibrary.name)
      ]
        .filter((section) => section && !isBuiltInComponentLibrary(section))
        .map((section) => section.toLowerCase())
    );
    setCustomDeviceTemplates((current: any) => current.filter((template: any) => normalizeCategoryLibraryName(template.categoryLibrary) !== categoryLibraryName));
    if (deletedComponentLibraryKeys.size > 0) {
      setCustomComponentLibraries((current: any) => current.filter((componentLibrary: any) => !deletedComponentLibraryKeys.has(componentLibrary.name.toLowerCase())));
      setDefinitionDraftSection((current: any) =>
        deletedComponentLibraryKeys.has(current.toLowerCase()) ? defaultComponentLibraryForCategoryLibrary("交流设备") : current
      );
    }
    setCustomCategoryLibraries((current: any) => current.filter((group: any) => normalizeCategoryLibraryName(group) !== categoryLibraryName));
    setExpandedCategoryLibraries((current: any) => current.filter((group: any) => normalizeCategoryLibraryName(group) !== categoryLibraryName));
    setExpandedDefinitionGroups((current: any) => current.filter((group: any) => normalizeCategoryLibraryName(group) !== categoryLibraryName));
    setCollapsedCustomComponentTreeLibraries((current: any) => {
      const next = new Set(current);
      next.delete(categoryLibraryName);
      return next;
    });
    setCollapsedCustomComponentTreeTypes((current: any) => {
      const next = new Set(current);
      for (const key of current) {
        if (key.startsWith(`${categoryLibraryName}::`)) {
          next.delete(key);
        }
      }
      return next;
    });
    setSelectedDefinitionKind((current: any) => (deletedKinds.has(current) ? "" : current));
    setCustomComponentTreeSelection({ kind: "categoryLibrary", categoryLibraryName: "交流设备" });
    setEditingCustomDeviceKind("");
    if (deletedKinds.size > 0 || deletedComponentLibraryKeys.size > 0) {
      setDeviceDefinitionOverrides((current: any) => {
        const retainedOverrides = { ...current };
        for (const componentLibrary of customComponentLibraries.filter(
          (definition: any) => normalizeCategoryLibraryName(definition.categoryLibraryName) === categoryLibraryName
        )) {
          delete retainedOverrides[componentLibraryDefinitionOverrideKey(componentLibrary.name)];
        }
        const retainedCustomTemplates = customDeviceTemplates.filter((template: any) => !deletedKinds.has(template.kind));
        return removeDeviceTemplateDefinitionOverrides(
          retainedOverrides,
          templatesInGroup,
          [...DEVICE_LIBRARY, ...retainedCustomTemplates]
        );
      });
    }
    setCustomDeviceDraft((current: any) => ({
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

export function createNextCustomComponentLibraryName(__appScope: DeviceDefinitionScope) {
  return () => {
  const { componentLibraryOptions } = __appScope;
    const existingTypes = new Set(componentLibraryOptions.map((componentLibrary: any) => componentLibrary.toLowerCase()));
    for (let index = 1; index <= 999; index += 1) {
      const candidate = `CustomDevice${index}`;
      if (!existingTypes.has(candidate.toLowerCase())) {
        return candidate;
      }
    }
    return `CustomDevice${Date.now()}`;
  };
}

export function createCreateCustomComponentLibrary(__appScope: DeviceDefinitionScope) {
  return () => {
  const { customComponentTreeSelection, nextCustomComponentLibraryName, normalizeCategoryLibraryName, normalizeComponentLibraryName = (value: unknown) => String(value ?? "").trim(), setCustomLibraryCreateDialog } = __appScope;
    if (customComponentTreeSelection?.kind !== "categoryLibrary" && customComponentTreeSelection?.kind !== "componentLibrary") {
      return;
    }
    const categoryLibraryName = normalizeCategoryLibraryName(customComponentTreeSelection.categoryLibraryName);
    const baseComponentLibrary = customComponentTreeSelection.kind === "componentLibrary"
      ? normalizeComponentLibraryName(customComponentTreeSelection.section)
      : "";
    if (!categoryLibraryName || (customComponentTreeSelection.kind === "componentLibrary" && !baseComponentLibrary)) {
      return;
    }
    const classCreationMode = customComponentTreeSelection.kind === "componentLibrary" ? "derived" : "base";
    const terminalType = defaultTerminalTypeForCategoryLibrary(categoryLibraryName);
    setCustomLibraryCreateDialog({
      kind: "componentLibrary",
      title: "新建类",
      cnName: "",
      enName: nextCustomComponentLibraryName(),
      categoryLibraryName,
      componentLibrary: "",
      classCreationMode,
      lockedBaseComponentLibrary: baseComponentLibrary,
      isDerivedComponentLibrary: classCreationMode === "derived",
      derivedFromComponentLibrary: baseComponentLibrary,
      isContainer: false,
      terminalCount: 2,
      terminalTypes: Array.from({ length: COMPONENT_LIBRARY_MAX_TERMINALS }, () => terminalType),
      terminalLabels: Array.from({ length: COMPONENT_LIBRARY_MAX_TERMINALS }, () => ""),
      terminalRoles: Array.from({ length: COMPONENT_LIBRARY_MAX_TERMINALS }, () => "single-load"),
      terminalAssociations: Array.from(
        { length: COMPONENT_LIBRARY_MAX_TERMINALS },
        () => defaultTerminalAssociationForClassTerminal(terminalType)
      ),
      error: ""
    });
  };
}

export function createDeleteCustomComponentLibrary(__appScope: DeviceDefinitionScope) {
  return async (targetSection?: string) => {
  const { E_SECTION_OPTIONS, customComponentLibraries = [], customComponentTreeSelection, customDeviceDraft, defaultComponentLibraryForCategoryLibrary, libraryTemplates, normalizeCategoryLibraryName, normalizeComponentLibraryName, resolveTemplateComponentLibrary, setCollapsedCustomComponentTreeTypes, setCustomComponentTreeSelection, setCustomComponentLibraries, setCustomDeviceDraft, setCustomDeviceTemplates, setDefinitionDraftSection, setDeviceDefinitionOverrides, setEditingCustomDeviceKind, setSelectedDefinitionKind } = __appScope;
    if (targetSection === undefined) {
      targetSection = customDeviceDraft.componentLibrary;
    }
    const componentLibrary = normalizeComponentLibraryName(targetSection);
    if (!componentLibrary || E_SECTION_OPTIONS.some((section: any) => section.toLowerCase() === componentLibrary.toLowerCase())) {
      showGlobalMessage("内置类无法删除。");
      return;
    }
    const dependentDerivedClasses = customComponentLibraries.filter((definition: any) => (
      definition.isDerivedComponentLibrary &&
      normalizeComponentLibraryName(definition.derivedFromComponentLibrary).toLowerCase() === componentLibrary.toLowerCase()
    ));
    if (dependentDerivedClasses.length > 0) {
      const names = dependentDerivedClasses.map((definition: any) => definition.name).join("、");
      showGlobalMessage(`类“${componentLibrary}”仍被派生类 ${names} 使用，请先删除这些派生类。`);
      return;
    }
    const templatesWithType = libraryTemplates.filter((template: any) => {
      if (!template.custom) return false;
      const className = templateDerivedComponentLibraryInfo(template)?.derivedComponentLibrary || resolveTemplateComponentLibrary(template);
      return normalizeComponentLibraryName(className).toLowerCase() === componentLibrary.toLowerCase();
    });
    const confirmed = await showGlobalConfirm(
      templatesWithType.length > 0
        ? `类“${componentLibrary}”下共有 ${templatesWithType.length} 个自定义元件，删除类会同时删除这些元件，是否继续？`
        : `确认删除类“${componentLibrary}”？`
    );
    if (!confirmed) {
      return;
    }
    const deletedKinds = new Set(templatesWithType.map((template: any) => template.kind));
    setCustomComponentLibraries((current: any) => current.filter((item: any) => item.name.toLowerCase() !== componentLibrary.toLowerCase()));
    setCustomDeviceTemplates((current: any) => current.filter((template: any) => !deletedKinds.has(template.kind)));
    setSelectedDefinitionKind((current: any) => (deletedKinds.has(current) ? "" : current));
    setEditingCustomDeviceKind((current: any) => (deletedKinds.has(current) ? "" : current));
    setCollapsedCustomComponentTreeTypes((current: any) => {
      const next = new Set(current);
      for (const key of current) {
        if (key.endsWith(`::${componentLibrary}`)) {
          next.delete(key);
        }
      }
      return next;
    });
    setDeviceDefinitionOverrides((current: any) => {
      const retainedOverrides = { ...current };
      delete retainedOverrides[componentLibraryDefinitionOverrideKey(componentLibrary)];
      return removeDeviceTemplateDefinitionOverrides(
        retainedOverrides,
        templatesWithType,
        libraryTemplates.filter((template: any) => !deletedKinds.has(template.kind))
      );
    });
    const fallbackCategoryLibraryName = customComponentTreeSelection.kind === "componentLibrary" ? customComponentTreeSelection.categoryLibraryName : customDeviceDraft.categoryLibraryName;
    const fallbackSection = defaultComponentLibraryForCategoryLibrary(fallbackCategoryLibraryName);
    setCustomComponentTreeSelection({ kind: "componentLibrary", categoryLibraryName: normalizeCategoryLibraryName(fallbackCategoryLibraryName), section: fallbackSection });
    setCustomDeviceDraft((current: any) => ({
      ...current,
      componentLibrary: fallbackSection,
      isDerivedComponentLibrary: false,
      derivedFromComponentLibrary: "",
      derivedComponentLibrary: "",
      derivedComponentLibraryLabel: "",
      error: ""
    }));
    setDefinitionDraftSection((current: any) => (current.toLowerCase() === componentLibrary.toLowerCase() ? fallbackSection : current));
  };
}

export function createRenameSelectedCustomDeviceTreeItem(__appScope: DeviceDefinitionScope) {
  return async () => {
  const { PROTECTED_CATEGORY_LIBRARIES, categoryLibraries, customComponentTreeSelection, libraryTemplateByKind, normalizeCategoryLibraryName, setCollapsedCustomComponentTreeLibraries, setCollapsedCustomComponentTreeTypes, setCustomCategoryLibraries, setCustomComponentTreeSelection, setCustomComponentLibraries, setCustomDeviceDraft, setCustomDeviceTemplates, setExpandedCategoryLibraries, setExpandedDefinitionGroups } = __appScope;
    if (customComponentTreeSelection.kind === "categoryLibrary") {
      const oldCategoryLibraryName = normalizeCategoryLibraryName(customComponentTreeSelection.categoryLibraryName);
      if (PROTECTED_CATEGORY_LIBRARIES.has(oldCategoryLibraryName) || oldCategoryLibraryName === "静态图元") {
        showGlobalMessage("系统内置类别库不能重命名。");
        return;
      }
      const rawName = await promptText("请输入新的类别库名称", oldCategoryLibraryName);
      if (rawName === null) {
        return;
      }
      const newCategoryLibraryName = normalizeCategoryLibraryName(rawName.trim());
      if (!newCategoryLibraryName) {
        showGlobalMessage("类别库名称不能为空。");
        return;
      }
      if (categoryLibraries.some((group: any) => normalizeCategoryLibraryName(group).toLowerCase() === newCategoryLibraryName.toLowerCase() && normalizeCategoryLibraryName(group) !== oldCategoryLibraryName)) {
        showGlobalMessage("类别库名称已存在，无法重命名。");
        return;
      }
      setCustomCategoryLibraries((current: any) => current.map((group: any) => normalizeCategoryLibraryName(group) === oldCategoryLibraryName ? newCategoryLibraryName : group));
      setCustomComponentLibraries((current: any) => current.map((componentLibrary: any) => normalizeCategoryLibraryName(componentLibrary.categoryLibraryName) === oldCategoryLibraryName ? { ...componentLibrary, categoryLibraryName: newCategoryLibraryName } : componentLibrary));
      setCustomDeviceTemplates((current: any) => current.map((template: any) => normalizeCategoryLibraryName(template.categoryLibrary) === oldCategoryLibraryName ? { ...template, categoryLibrary: newCategoryLibraryName } : template));
      setExpandedCategoryLibraries((current: any) => current.map((group: any) => normalizeCategoryLibraryName(group) === oldCategoryLibraryName ? newCategoryLibraryName : group));
      setExpandedDefinitionGroups((current: any) => current.map((group: any) => normalizeCategoryLibraryName(group) === oldCategoryLibraryName ? newCategoryLibraryName : group));
      setCollapsedCustomComponentTreeLibraries((current: any) => {
      const next = new Set(current);
      if (next.has(oldCategoryLibraryName)) {
        next.delete(oldCategoryLibraryName);
        next.add(newCategoryLibraryName);
      }
      return next;
    });
    setCollapsedCustomComponentTreeTypes((current: any) => {
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
      setCustomDeviceDraft((current: any) => ({
        ...current,
        categoryLibraryName: normalizeCategoryLibraryName(current.categoryLibraryName) === oldCategoryLibraryName ? newCategoryLibraryName : current.categoryLibraryName,
        error: ""
      }));
      return;
    }
    if (customComponentTreeSelection.kind === "componentLibrary") {
      showGlobalMessage("类信息在创建确认后不可修改；如定义错误，请删除该类后重新创建。");
      return;
    }
    const template = libraryTemplateByKind.get(customComponentTreeSelection.templateKind);
    if (!template?.custom) {
      showGlobalMessage("系统内置元件不能在这里重命名。");
      return;
    }
    const rawName = await promptText("请输入新的元件名称", template.label);
    if (rawName === null) {
      return;
    }
    const newLabel = rawName.trim();
    if (!newLabel) {
      showGlobalMessage("元件名称不能为空。");
      return;
    }
    setCustomDeviceTemplates((current: any) => current.map((item: any) => item.kind === template.kind ? { ...item, label: newLabel } : item));
    setCustomDeviceDraft((current: any) => ({
      ...current,
      componentName: current.componentName === template.label ? newLabel : current.componentName,
      error: ""
    }));
  };
}

export function createDeleteSelectedCustomDeviceTreeItem(__appScope: DeviceDefinitionScope) {
  return async () => {
  const { customComponentTreeSelection, customDeviceTemplates, deleteCustomCategoryLibrary, deleteCustomComponentLibrary, libraryTemplateByKind, libraryTemplates, setCustomComponentTreeSelection, setCustomDeviceDraft, setCustomDeviceTemplates, setDeviceDefinitionOverrides, setEditingCustomDeviceKind } = __appScope;
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
    setCustomDeviceTemplates((current: any) => current.filter((item: any) => item.kind !== template.kind));
    setDeviceDefinitionOverrides((current: any) => {
      return removeDeviceTemplateDefinitionOverrides(
        current,
        [template],
        libraryTemplates.filter((item: any) => item.kind !== template.kind)
      );
    });
    setEditingCustomDeviceKind((current: any) => current === template.kind ? "" : current);
    setCustomComponentTreeSelection({ kind: "componentLibrary", categoryLibraryName: customComponentTreeSelection.categoryLibraryName, section: customComponentTreeSelection.section });
    setCustomDeviceDraft((current: any) => ({
      ...current,
      componentName: "",
      error: ""
    }));
  };
}

export function createNextCustomTemplateKind(__appScope: DeviceDefinitionScope) {
  return (componentLibrary: string) => {
  const { libraryTemplates } = __appScope;
    const safeType = componentLibrary.replace(/[^A-Za-z0-9_]+/g, "_") || "CustomDevice";
    const existingKinds = new Set(libraryTemplates.map((template: any) => template.kind.toLowerCase()));
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

export function createSaveCustomDeviceTemplate(__appScope: DeviceDefinitionScope) {
  return (options: {
    closeAfterSave?: boolean;
    draftOverride?: any;
    terminalAnchorsOverride?: any[];
    editingCustomDeviceKindOverride?: string;
    skipInlineDrawingPatch?: boolean;
  } = {}) => {
  const { TERMINAL_TYPE_LIBRARY_LABELS, closeCustomDeviceDialog, customComponentLibraries = [], customDeviceDraft, customDeviceGeneratedDefaultImageCandidates, customDeviceImageWithTerminalConnectors, customDeviceTemplates, customDeviceTerminalAnchors, defaultComponentLibraryForCategoryLibrary, editingCustomDeviceKind, ensureCustomComponentTreeExpanded, generateCustomDeviceImage, hasOverlappingCustomDeviceTerminalAnchors, isValidComponentLibraryName, libraryTemplates = customDeviceTemplates, nextCustomTemplateKind, normalizeCategoryLibraryName, normalizeComponentLibraryName, normalizeContainerTerminalAssociations, persistDeviceLibraryChange, setCustomComponentTreeSelection, setCustomDeviceDefinitionMode = () => undefined, setCustomDeviceDraft, setCustomDeviceDraftCleanBaseline = () => undefined, setCustomDeviceSaveMessage, setCustomDeviceSaveToast, customDeviceSaveToastTimerRef, setCustomDeviceTemplates, setEditingCustomDeviceKind, setExpandedCategoryLibraries, showGlobalMessage = () => undefined, syncInheritedCustomDeviceStateVisuals, validateContainerTerminalAssociations, validateStateDraftRows, writeOperationLog } = __appScope;
    const sourceDraft = options.draftOverride ?? customDeviceDraft;
    const sourceTerminalAnchors = options.terminalAnchorsOverride ?? customDeviceTerminalAnchors;
    const sourceEditingCustomDeviceKind = options.editingCustomDeviceKindOverride ?? editingCustomDeviceKind;
    setCustomDeviceSaveMessage("");
    const requestedCategoryLibraryName = normalizeCategoryLibraryName(sourceDraft.categoryLibraryName);
    const requestedClassName = normalizeComponentLibraryName(
      sourceDraft.isDerivedComponentLibrary
        ? sourceDraft.derivedComponentLibrary
        : sourceDraft.componentLibrary
    );
    const classMetadata = resolveComponentLibraryClassMetadata(
      requestedClassName,
      requestedCategoryLibraryName,
      customComponentLibraries,
      libraryTemplates
    );
    if (!classMetadata) {
      setCustomDeviceDraft((current: any) => ({ ...current, error: "所属类不存在，请重新执行新建元件并选择已有类。" }));
      return false;
    }
    const categoryLibraryName = normalizeCategoryLibraryName(classMetadata.categoryLibraryName || requestedCategoryLibraryName);
    const baseComponentLibrary = normalizeComponentLibraryName(classMetadata.baseComponentLibrary);
    const derivedRequested = classMetadata.isDerivedComponentLibrary;
    const derivedComponentLibrary = derivedRequested ? normalizeComponentLibraryName(classMetadata.className) : "";
    const derivedComponentLibraryLabel = derivedRequested ? String(classMetadata.label ?? "").trim() : "";
    const derivedFromComponentLibrary = derivedRequested ? baseComponentLibrary : "";
    const componentLibrary = baseComponentLibrary;
    const componentLabel = String(sourceDraft.componentName ?? "").trim();
    const isContainerComponent = classMetadata.isContainer;
    if (!componentLabel) {
      setCustomDeviceDraft((current: any) => ({ ...current, error: "元件中文名称不能为空。" }));
      return false;
    }
    if (!baseComponentLibrary) {
      setCustomDeviceDraft((current: any) => ({ ...current, error: "请选择类。" }));
      return false;
    }
    if (!isValidComponentLibraryName(baseComponentLibrary)) {
      setCustomDeviceDraft((current: any) => ({ ...current, error: "类英文名称只能包含英文字母、数字、下划线和中划线，并且必须以英文字母开头。" }));
      return false;
    }
    if (derivedRequested) {
      if (!derivedFromComponentLibrary) {
        setCustomDeviceDraft((current: any) => ({ ...current, error: "请选择派生基类。" }));
        return false;
      }
      if (!derivedComponentLibrary) {
        setCustomDeviceDraft((current: any) => ({ ...current, error: "请输入或选择派生类英文名称。" }));
        return false;
      }
      if (!isValidComponentLibraryName(derivedComponentLibrary)) {
        setCustomDeviceDraft((current: any) => ({ ...current, error: "派生类英文名称只能包含英文字母、数字、下划线和中划线，并且必须以英文字母开头。" }));
        return false;
      }
      if (derivedComponentLibrary.toLowerCase() === derivedFromComponentLibrary.toLowerCase()) {
        setCustomDeviceDraft((current: any) => ({ ...current, error: "派生类英文名称不能与基类相同。" }));
        return false;
      }
    }
    const requestedEnglishName = normalizeComponentLibraryName(String(sourceDraft.componentKind ?? ""));
    if (!requestedEnglishName) {
      setCustomDeviceDraft((current: any) => ({ ...current, error: "元件英文名称不能为空。" }));
      return false;
    }
    if (!CUSTOM_DEVICE_KIND_NAME_PATTERN.test(requestedEnglishName)) {
      setCustomDeviceDraft((current: any) => ({ ...current, error: "元件英文名称只能包含英文字母、数字、下划线和短横线，并且必须以英文字母开头。" }));
      return false;
    }
    const existingTemplates = [...(libraryTemplates ?? []), ...(customDeviceTemplates ?? [])];
    const isCurrentTemplate = (template: any) => Boolean(sourceEditingCustomDeviceKind) && (
      String(template.kind ?? "") === sourceEditingCustomDeviceKind
    );
    const duplicateChineseName = existingTemplates.some((template: any) => (
      !isCurrentTemplate(template) && String(template.label ?? "").trim() === componentLabel
    ));
    if (duplicateChineseName) {
      setCustomDeviceDraft((current: any) => ({ ...current, error: "元件中文名称已存在，无法保存同名元件。" }));
      return false;
    }
    const normalizedRequestedEnglishName = requestedEnglishName.toLowerCase();
    const duplicateEnglishName = existingTemplates.some((template: any) => (
      !isCurrentTemplate(template) && (
        String(template.kind ?? "").trim().toLowerCase() === normalizedRequestedEnglishName ||
        String(template.englishName ?? "").trim().toLowerCase() === normalizedRequestedEnglishName
      )
    ));
    if (duplicateEnglishName) {
      setCustomDeviceDraft((current: any) => ({ ...current, error: "元件英文名称已存在，无法保存同名元件。" }));
      return false;
    }
    const terminalTypes = [...classMetadata.terminalTypes];
    const terminalAssociations = normalizeContainerTerminalAssociations(
      terminalTypes,
      classMetadata.terminalAssociations,
      classMetadata.terminalCount
    );
    if (isContainerComponent) {
      const terminalAssociationValidation = validateContainerTerminalAssociations(terminalTypes, terminalAssociations);
      if (!terminalAssociationValidation.valid) {
        showGlobalMessage(terminalAssociationValidation.message);
        setCustomDeviceDraft((current: any) => ({ ...current, terminalAssociations, error: terminalAssociationValidation.message }));
        return false;
      }
    }
    if (hasOverlappingCustomDeviceTerminalAnchors(sourceTerminalAnchors)) {
      const message = "不同端子位置不能重叠，请调整端子位置后再保存。";
      showGlobalMessage(message);
      setCustomDeviceDraft((current: any) => ({ ...current, error: message }));
      return false;
    }
    const stateValidation = validateStateDraftRows(sourceDraft.stateDefinitions);
    if (stateValidation.error) {
      setCustomDeviceDraft((current: any) => ({ ...current, error: stateValidation.error }));
      return false;
    }
    const terminalAnchors = sourceTerminalAnchors.slice(0, terminalTypes.length).map((anchor: any) => ({ ...anchor }));
    const inlineBackgroundPatch = options.skipInlineDrawingPatch
      ? null
      : inlineDefaultIconBackgroundPatch(__appScope, "custom");
    const draftBackgroundImage = inlineBackgroundPatch?.backgroundImage ?? sourceDraft.backgroundImage;
    const draftBackgroundImageAssetId = inlineBackgroundPatch?.backgroundImageAssetId ?? sourceDraft.backgroundImageAssetId;
    const draftBackgroundImageFit = sourceDraft.backgroundImageFit ?? "cover";
    const draftBackgroundImageCleared = inlineBackgroundPatch?.backgroundImageCleared ?? sourceDraft.backgroundImageCleared;
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
    const customKind = sourceEditingCustomDeviceKind || requestedEnglishName || nextCustomTemplateKind(componentLibrary);
    const template: DeviceTemplate = {
      kind: customKind,
      label: componentLabel,
      englishName: requestedEnglishName,
      componentClass: classMetadata.className,
      categoryLibrary: categoryLibraryName,
      size: sourceDraft.size,
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
      terminalLabels: classMetadata.terminalLabels.slice(0, terminalTypes.length).map(
        (label, index) => label.trim() || `${TERMINAL_TYPE_LIBRARY_LABELS[terminalTypes[index]] ?? terminalTypes[index]}端${index + 1}`
      ),
      terminalAnchors,
      terminalRoles: classMetadata.terminalRoles.slice(0, terminalTypes.length),
      isContainer: isContainerComponent,
      ...(derivedRequested ? {
        isDerivedComponentLibrary: true,
        derivedFromComponentLibrary,
        derivedComponentLibrary,
        ...(derivedComponentLibraryLabel ? { derivedComponentLibraryLabel } : {})
      } : {}),
      allowResizeTransform: sourceDraft.allowResizeTransform === "1",
      custom: true,
      stateDefinitions,
    };
    const nextTemplates = sourceEditingCustomDeviceKind && customDeviceTemplates.some((item: any) => item.kind === sourceEditingCustomDeviceKind)
      ? customDeviceTemplates.map((item: any) => item.kind === sourceEditingCustomDeviceKind ? template : item)
      : [...customDeviceTemplates, template];
    setCustomDeviceTemplates(nextTemplates);
    persistDeviceLibraryChange({
      customDeviceTemplates: nextTemplates
    }, {
      success: `自定义元件已保存到后台：${componentLabel}`,
      failure: `自定义元件已保存到本地，后台保存失败：${componentLabel}`
    });
    setExpandedCategoryLibraries((current: any) => Array.from(new Set([...current, categoryLibraryName])));
    const componentTreeSection = derivedRequested ? derivedComponentLibrary : componentLibrary;
    ensureCustomComponentTreeExpanded(categoryLibraryName, componentTreeSection);
    setCustomComponentTreeSelection({ kind: "component", categoryLibraryName, section: componentTreeSection, templateKind: customKind });
    setCustomDeviceDefinitionMode("edit");
    setEditingCustomDeviceKind(customKind);
    const cleanDraft = {
      ...sourceDraft,
      componentName: componentLabel,
      componentKind: requestedEnglishName,
      componentLibrary: baseComponentLibrary,
      isContainer: isContainerComponent,
      allowResizeTransform: sourceDraft.allowResizeTransform === "1" ? "1" : "0",
      terminalCount: classMetadata.terminalCount,
      terminalTypes: Array.from({ length: COMPONENT_LIBRARY_MAX_TERMINALS }, (_, index) => classMetadata.terminalTypes[index] ?? defaultTerminalTypeForCategoryLibrary(categoryLibraryName)),
      terminalLabels: Array.from({ length: COMPONENT_LIBRARY_MAX_TERMINALS }, (_, index) => classMetadata.terminalLabels[index] ?? ""),
      terminalRoles: Array.from({ length: COMPONENT_LIBRARY_MAX_TERMINALS }, (_, index) => classMetadata.terminalRoles[index] ?? "single-load"),
      terminalAssociations: Array.from({ length: COMPONENT_LIBRARY_MAX_TERMINALS }, (_, index) => classMetadata.terminalAssociations[index] ?? defaultTerminalAssociationForClassTerminal(classMetadata.terminalTypes[index] ?? defaultTerminalTypeForCategoryLibrary(categoryLibraryName))),
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
    setCustomDeviceDraft((current: any) => ({ ...current, ...cleanDraft }));
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

export function createSaveBuiltinDeviceDefinitionFromCustomDraft(__appScope: DeviceDefinitionScope) {
  return (template: DeviceTemplate, options: { closeAfterSave?: boolean } = {}) => {
  const { ALLOW_RESIZE_TRANSFORM_PARAM, TERMINAL_TYPE_LIBRARY_LABELS, baseLibraryTemplates = [], closeCustomDeviceDialog, createCustomDeviceDraftFromTemplate, customDefaultDefinitions, customDeviceDraft, customDeviceGeneratedDefaultImageCandidates, customDeviceImageWithTerminalConnectors, customDeviceTerminalAnchors, deviceDefinitionOverrideForTemplate, deviceDefinitionOverrides, getTemplateParameterDefinitions, hasOverlappingCustomDeviceTerminalAnchors, isDerivedComponentBaseParamName, isReservedDeviceDefinitionParamName, isValidComponentLibraryName, libraryTemplates, measurementConfig, measurementConfigDraft, measurementConfigDraftRef, normalizeComponentLibraryName, normalizeContainerTerminalAssociations, normalizeDefinitionRowEnumFields, persistDeviceLibraryChange, setCustomDeviceDraft, setCustomDeviceDraftCleanBaseline = () => undefined, setCustomDeviceSaveMessage, setCustomDeviceSaveToast, customDeviceSaveToastTimerRef, setDeviceDefinitionOverrides, showGlobalMessage, syncExistingNodesWithTemplateDefinitions, syncInheritedCustomDeviceStateVisuals, validateContainerTerminalAssociations, validateStateDraftRows, writeOperationLog } = __appScope;
    setCustomDeviceSaveMessage("");
    const componentLibrary = normalizeComponentLibraryName(customDeviceDraft.componentLibrary);
    if (!componentLibrary) {
      setCustomDeviceDraft((current: any) => ({ ...current, error: "请选择类。" }));
      return false;
    }
    if (!isValidComponentLibraryName(componentLibrary)) {
      setCustomDeviceDraft((current: any) => ({ ...current, error: "类英文名称只能包含英文字母、数字、下划线和中划线，并且必须以英文字母开头。" }));
      return false;
    }
    const componentLabel = String(customDeviceDraft.componentName ?? "").trim();
    if (!componentLabel) {
      setCustomDeviceDraft((current: any) => ({ ...current, error: "元件中文名称不能为空。" }));
      return false;
    }
    const componentEnglishName = normalizeComponentLibraryName(String(
      customDeviceDraft.componentKind === undefined
        ? template.englishName ?? template.kind
        : customDeviceDraft.componentKind
    ));
    if (!componentEnglishName) {
      setCustomDeviceDraft((current: any) => ({ ...current, error: "元件英文名称不能为空。" }));
      return false;
    }
    if (!CUSTOM_DEVICE_KIND_NAME_PATTERN.test(componentEnglishName)) {
      setCustomDeviceDraft((current: any) => ({ ...current, error: "元件英文名称只能包含英文字母、数字、下划线和短横线，并且必须以英文字母开头。" }));
      return false;
    }
    const duplicateEnglishName = libraryTemplates.some((candidate: DeviceTemplate) => (
      candidate.kind !== template.kind &&
      String(candidate.englishName ?? candidate.kind).trim().toLowerCase() === componentEnglishName.toLowerCase()
    ));
    if (duplicateEnglishName) {
      setCustomDeviceDraft((current: any) => ({ ...current, error: "元件英文名称已存在，无法保存同名元件。" }));
      return false;
    }
    const derivedRequested = Boolean(customDeviceDraft.isDerivedComponentLibrary);
    const derivedFromComponentLibrary = normalizeComponentLibraryName(customDeviceDraft.derivedFromComponentLibrary || componentLibrary);
    const derivedComponentLibrary = normalizeComponentLibraryName(customDeviceDraft.derivedComponentLibrary ?? "");
    const derivedComponentLibraryLabel = String(customDeviceDraft.derivedComponentLibraryLabel ?? "").trim();
    if (derivedRequested) {
      if (!derivedFromComponentLibrary) {
        setCustomDeviceDraft((current: any) => ({ ...current, error: "请选择派生类关联的基类。" }));
        return false;
      }
      if (!derivedComponentLibrary) {
        setCustomDeviceDraft((current: any) => ({ ...current, error: "请输入或选择派生类英文名称。" }));
        return false;
      }
      if (!isValidComponentLibraryName(derivedComponentLibrary)) {
        setCustomDeviceDraft((current: any) => ({ ...current, error: "派生类英文名称只能包含英文字母、数字、下划线和中划线，并且必须以英文字母开头。" }));
        return false;
      }
      if (derivedComponentLibrary.toLowerCase() === derivedFromComponentLibrary.toLowerCase()) {
        setCustomDeviceDraft((current: any) => ({ ...current, error: "派生类英文名称不能与基类相同。" }));
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
        setCustomDeviceDraft((current: any) => ({ ...current, terminalAssociations, error: terminalAssociationValidation.message }));
        return false;
      }
    }
    if (hasOverlappingCustomDeviceTerminalAnchors(customDeviceTerminalAnchors)) {
      const message = "不同端子位置不能重叠，请调整端子位置后再保存。";
      showGlobalMessage(message);
      setCustomDeviceDraft((current: any) => ({ ...current, error: message }));
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
    const { definitions, customRows } = mergeDefaultAndCustomDefinitionRows(defaultRows, visibleDraftRows, normalizeDefinitionRowEnumFields);
    const canonicalLibraryTemplates: DeviceTemplate[] = baseLibraryTemplates.length > 0
      ? baseLibraryTemplates
      : libraryTemplates;
    const baseTemplate = canonicalLibraryTemplates.find((candidate: DeviceTemplate) => candidate.kind === template.kind) ?? template;
    let builtInDefinitions = resolveEffectiveTemplateParameterDefinitions(baseTemplate, canonicalLibraryTemplates);
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
      const { definitions: mergedBaseRows } = mergeDefaultAndCustomDefinitionRows(
        baseDefaultRows,
        visibleBaseDraftRows,
        normalizeDefinitionRowEnumFields
      );
      builtInDefinitions = mergedBaseRows;
    }
    const parameterDefinitionsMatchBuiltIn = deviceParameterDefinitionListsEqual(definitions, builtInDefinitions);
    const definitionsComplianceMessage = deviceParameterDefinitionsComplianceMessage(definitions);
    if (definitionsComplianceMessage) {
      setCustomDeviceDraft((current: any) => ({ ...current, error: definitionsComplianceMessage }));
      return false;
    }
    if (customRows.some((row) => !row.cnName || !row.enName)) {
      setCustomDeviceDraft((current: any) => ({ ...current, error: "属性行的中文名称和英文名称不能为空。" }));
      return false;
    }
    const reservedCustomRow = customRows.find((row) => isReservedDeviceDefinitionParamName(row.enName));
    if (reservedCustomRow) {
      setCustomDeviceDraft((current: any) => ({
        ...current,
        error: reservedCustomRow.enName === ALLOW_RESIZE_TRANSFORM_PARAM ? "是否允许变形是元件属性，不能在参数定义表中新增。" : "是否容器是元件属性，不能在参数定义表中新增。"
      }));
      return false;
    }
    const duplicateDefinition = definitions.find(
      (definition, index) => definitions.findIndex((item) => item.enName.toLowerCase() === definition.enName.toLowerCase()) !== index
    );
    if (duplicateDefinition) {
      setCustomDeviceDraft((current: any) => ({ ...current, error: `属性英文名称重复：${duplicateDefinition.enName}` }));
      return false;
    }
    const currentMeasurementConfig = measurementConfigDraftRef?.current ?? measurementConfigDraft ?? measurementConfig;
    const profileItems = normalizeDeviceMeasurementDefinitions(customDeviceDraft.measurementDefinitions);
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
      targetLabel: componentLabel
    });
    if (measurementProfileMessage) {
      setCustomDeviceDraft((current: any) => ({ ...current, error: measurementProfileMessage }));
      return false;
    }
    const stateValidation = validateStateDraftRows(customDeviceDraft.stateDefinitions);
    if (stateValidation.error) {
      setCustomDeviceDraft((current: any) => ({ ...current, error: stateValidation.error }));
      return false;
    }
    const terminalAnchors = customDeviceTerminalAnchors.slice(0, terminalTypes.length).map((anchor: any) => ({ ...anchor }));
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
    const size = {
      width: Math.max(1, Math.round(customDeviceDraft.size.width || template.size.width || 104)),
      height: Math.max(1, Math.round(customDeviceDraft.size.height || template.size.height || 64))
    };
    const terminalLabels = customDeviceDraft.terminalLabels.slice(0, terminalTypes.length).map(
      (label: any, index: any) => label.trim() || `${TERMINAL_TYPE_LIBRARY_LABELS[terminalTypes[index]] ?? terminalTypes[index]}端${index + 1}`
    );
    const previousDefinitions = resolveEffectiveTemplateParameterDefinitions(template, libraryTemplates);
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
      (node: any) => {
        const nodeTemplate = libraryTemplates.find((candidate: any) => candidate.kind === node.kind);
        const nodeBaseTemplate = canonicalLibraryTemplates.find((candidate) => candidate.kind === node.kind) ?? nodeTemplate;
        return Boolean(nodeBaseTemplate && deviceTemplatesShareParameterDefinitions(baseTemplate, nodeBaseTemplate));
      }
    );
    const sharedOverrideKey = deviceDefinitionSharedKeyForTemplate(baseTemplate);
    const effectiveTemplateSharedKey = deviceDefinitionSharedKeyForTemplate(template);
    const existingExactOverride = deviceDefinitionOverrides[template.kind];
    const nextTemplateOverride: DeviceTemplateDefinitionOverride = {
      ...existingExactOverride,
      kind: template.kind,
      label: componentLabel,
      englishName: componentEnglishName,
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
    delete exactVisualOverride.measurementDefinitionsIntent;
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
      measurementDefinitions: cloneDeviceMeasurementDefinitions(profileItems) ?? [],
      ...(profileItems.length === 0 ? { measurementDefinitionsIntent: "delete-all" } : {}),
      updatedAt: nextTemplateOverride.updatedAt
    };
    const nextDeviceDefinitionOverrides: Record<string, DeviceTemplateDefinitionOverride> = {
      ...deviceDefinitionOverrides,
      [sharedOverrideKey]: sharedDefinitionOverride,
      [template.kind]: exactVisualOverride
    };
    if (effectiveTemplateSharedKey !== sharedOverrideKey) {
      delete nextDeviceDefinitionOverrides[effectiveTemplateSharedKey];
    }
    for (const peer of canonicalLibraryTemplates.filter((candidate) => deviceTemplatesShareParameterDefinitions(baseTemplate, candidate))) {
      if (!nextDeviceDefinitionOverrides[peer.kind] || peer.kind === sharedOverrideKey) continue;
      const peerOverride = { ...nextDeviceDefinitionOverrides[peer.kind] };
      delete peerOverride.parameterDefinitions;
      delete peerOverride.measurementDefinitions;
      delete peerOverride.measurementDefinitionsIntent;
      nextDeviceDefinitionOverrides[peer.kind] = peerOverride;
    }
    const normalizedDeviceDefinitionOverrides = normalizeSharedDeviceDefinitionOverrides(
      nextDeviceDefinitionOverrides,
      canonicalLibraryTemplates
    );
    setDeviceDefinitionOverrides(normalizedDeviceDefinitionOverrides);
    const savedComponentLabel = componentLabel;
    const persistenceResult = persistDeviceLibraryChange({ deviceDefinitionOverrides: normalizedDeviceDefinitionOverrides }, {
      success: `元件定义已保存到后台：${savedComponentLabel}`,
      failure: `元件定义已保存到本地，后台保存失败：${savedComponentLabel}`
    });
    const finishPersistedSave = (persisted: unknown) => {
      if (persisted === false) {
        const persistenceError = "内置图元尚未写入后台，请检查服务状态后重试保存。";
        setCustomDeviceDraft((current: any) => ({ ...current, error: persistenceError }));
        showGlobalMessage(persistenceError);
        return false;
      }
      const cleanDraft = {
        ...customDeviceDraft,
        componentName: componentLabel,
        componentKind: componentEnglishName,
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
        measurementDefinitions: cloneDeviceMeasurementDefinitions(profileItems) ?? [],
        error: ""
      };
      setCustomDeviceDraft((current: any) => ({
        ...current,
        componentName: componentLabel,
        componentKind: componentEnglishName,
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
        measurementDefinitions: cloneDeviceMeasurementDefinitions(profileItems) ?? [],
        error: ""
      }));
      setCustomDeviceDraftCleanBaseline(cleanDraft, terminalAnchors);
      setCustomDeviceSaveMessage("");
      const toastMessage = `元件定义已保存：${savedComponentLabel}`;
      setCustomDeviceSaveToast(toastMessage);
      if (customDeviceSaveToastTimerRef?.current) {
        clearTimeout(customDeviceSaveToastTimerRef.current);
      }
      if (customDeviceSaveToastTimerRef) {
        customDeviceSaveToastTimerRef.current = setTimeout(() => setCustomDeviceSaveToast(""), 3000);
      }
      writeOperationLog(`保存元件定义：${savedComponentLabel}`);
      if (options.closeAfterSave) {
        closeCustomDeviceDialog();
      }
      return true;
    };
    if (persistenceResult && typeof persistenceResult.then === "function") {
      return Promise.resolve(persistenceResult).then(finishPersistedSave, () => finishPersistedSave(false));
    }
    return finishPersistedSave(persistenceResult);
  };
}

export function createSaveComponentLibraryDefinition(__appScope: DeviceDefinitionScope) {
  return (options: { closeAfterSave?: boolean } = {}) => {
    const {
      ALLOW_RESIZE_TRANSFORM_PARAM,
      closeCustomDeviceDialog,
      customComponentLibraries = [],
      customComponentTreeSelection,
      customDeviceDraft,
      deviceDefinitionOverrides = {},
      isReservedDeviceDefinitionParamName,
      libraryTemplates = [],
      measurementConfig,
      measurementConfigDraft,
      measurementConfigDraftRef,
      normalizeContainerTerminalAssociations,
      normalizeDefinitionRowEnumFields,
      persistDeviceLibraryChange,
      requireEditMode,
      setCustomDeviceDraft,
      setCustomDeviceDraftCleanBaseline = () => undefined,
      setCustomDeviceSaveMessage = () => undefined,
      setCustomDeviceSaveToast = () => undefined,
      customDeviceSaveToastTimerRef,
      setDeviceDefinitionOverrides,
      showGlobalMessage = () => undefined,
      writeOperationLog = () => undefined
    } = __appScope;
    if (customComponentTreeSelection?.kind !== "componentLibrary") {
      showGlobalMessage("当前没有选中可保存的类。");
      return false;
    }
    setCustomDeviceSaveMessage("");
    const className = String(customComponentTreeSelection.section ?? "").trim();
    const categoryLibraryName = String(customComponentTreeSelection.categoryLibraryName ?? "").trim();
    const editableClassDefinition = resolveEditableComponentLibraryDefinition({
      className,
      categoryLibraryName,
      customComponentLibraries,
      templates: libraryTemplates,
      overrides: deviceDefinitionOverrides
    });
    if (!editableClassDefinition) {
      setCustomDeviceDraft((current: any) => ({ ...current, error: "当前类的元数据不存在，无法保存定义。" }));
      return false;
    }
    const metadata = editableClassDefinition.metadata;
    const terminalCount = metadata.isDerivedComponentLibrary
      ? metadata.terminalCount
      : customDeviceDraft.terminalCount;
    const terminalTypes = (
      metadata.isDerivedComponentLibrary
        ? metadata.terminalTypes
        : customDeviceDraft.terminalTypes
    ).slice(0, terminalCount);
    const terminalLabels = (
      metadata.isDerivedComponentLibrary
        ? metadata.terminalLabels
        : customDeviceDraft.terminalLabels
    ).slice(0, terminalCount);
    const terminalRoles = (
      metadata.isDerivedComponentLibrary
        ? metadata.terminalRoles
        : customDeviceDraft.terminalRoles
    ).slice(0, terminalCount);
    const terminalAssociations = normalizeContainerTerminalAssociations(
      terminalTypes,
      metadata.isDerivedComponentLibrary
        ? metadata.terminalAssociations
        : customDeviceDraft.terminalAssociations,
      terminalCount
    );
    const draftRows = normalizeCustomDeviceDraftParamRows(customDeviceDraft.params, normalizeDefinitionRowEnumFields);
    const inheritedParameterKeys = new Set(
      editableClassDefinition.inheritedParameterDefinitions.map((definition) => definition.enName.trim().toLowerCase())
    );
    const duplicatedInheritedRow = metadata.isDerivedComponentLibrary
      ? draftRows.find((row) => inheritedParameterKeys.has(row.enName.trim().toLowerCase()))
      : undefined;
    if (duplicatedInheritedRow) {
      setCustomDeviceDraft((current: any) => ({
        ...current,
        error: `参数 ${duplicatedInheritedRow.enName} 已由基类 ${metadata.baseComponentLibrary} 定义，派生类无需重复定义。`
      }));
      return false;
    }
    const defaultRows = metadata.isDerivedComponentLibrary
      ? []
       : buildComponentLibraryDefaultParameterDefinitions(className, terminalTypes, {
          isContainer: metadata.isContainer,
          terminalRoles,
          terminalAssociations
        });
    const { definitions, customRows } = mergeDefaultAndCustomDefinitionRows(
      defaultRows,
      draftRows,
      normalizeDefinitionRowEnumFields
    );
    const definitionsComplianceMessage = deviceParameterDefinitionsComplianceMessage(definitions);
    if (definitionsComplianceMessage) {
      setCustomDeviceDraft((current: any) => ({ ...current, error: definitionsComplianceMessage }));
      return false;
    }
    if (customRows.some((row) => !row.cnName || !row.enName)) {
      setCustomDeviceDraft((current: any) => ({ ...current, error: "参数行的中文名称和英文名称不能为空。" }));
      return false;
    }
    const reservedCustomRow = customRows.find((row) => isReservedDeviceDefinitionParamName(row.enName));
    if (reservedCustomRow) {
      setCustomDeviceDraft((current: any) => ({
        ...current,
        error: reservedCustomRow.enName === ALLOW_RESIZE_TRANSFORM_PARAM
          ? "是否允许变形是元件属性，不能在参数定义表中新增。"
          : "是否容器是类属性，不能在参数定义表中新增。"
      }));
      return false;
    }
    const duplicateDefinition = definitions.find(
      (definition, index) => definitions.findIndex((item) => item.enName.toLowerCase() === definition.enName.toLowerCase()) !== index
    );
    if (duplicateDefinition) {
      setCustomDeviceDraft((current: any) => ({ ...current, error: `参数英文名称重复：${duplicateDefinition.enName}` }));
      return false;
    }
    const currentMeasurementConfig = measurementConfigDraftRef?.current ?? measurementConfigDraft ?? measurementConfig;
    const profileItems = normalizeDeviceMeasurementDefinitions(customDeviceDraft.measurementDefinitions);
    const measurementKey = (item: any) => JSON.stringify({
      measurementTypeId: item.measurementTypeId,
      position: item.position ?? "device",
      associatedField: item.associatedField ?? "",
      role: item.role ?? "",
      name: item.name ?? ""
    });
    const inheritedMeasurementKeys = new Set(
      editableClassDefinition.inheritedMeasurementDefinitions.map(measurementKey)
    );
    const duplicatedInheritedMeasurement = metadata.isDerivedComponentLibrary
      ? profileItems.find((item) => inheritedMeasurementKeys.has(measurementKey(item)))
      : undefined;
    if (duplicatedInheritedMeasurement) {
      setCustomDeviceDraft((current: any) => ({
        ...current,
        error: `量测 ${duplicatedInheritedMeasurement.name || duplicatedInheritedMeasurement.measurementTypeId} 已由基类 ${metadata.baseComponentLibrary} 定义，派生类无需重复定义。`
      }));
      return false;
    }
    const effectiveDefinitions = [
      ...editableClassDefinition.inheritedParameterDefinitions,
      ...definitions
    ];
    const source = {
      kind: componentLibraryDefinitionOverrideKey(className),
      label: metadata.label || className,
      categoryLibrary: metadata.categoryLibraryName,
      componentClass: className,
      params: {
        component_type: className,
        ...(metadata.isDerivedComponentLibrary ? {
          derived_from_component_type: metadata.baseComponentLibrary,
          derived_component_type: metadata.className,
          is_derived_component_library: "1"
        } : {})
      },
      isDerivedComponentLibrary: metadata.isDerivedComponentLibrary,
      derivedFromComponentLibrary: metadata.isDerivedComponentLibrary ? metadata.baseComponentLibrary : "",
      derivedComponentLibrary: metadata.isDerivedComponentLibrary ? metadata.className : "",
      terminalType: terminalTypes[0] ?? "ac",
      terminalCount: terminalTypes.length,
      terminalTypes,
      terminalLabels,
      terminalRoles,
      terminalAssociations: metadata.isContainer ? terminalAssociations : undefined,
      isContainer: metadata.isContainer,
      parameterDefinitions: effectiveDefinitions,
      size: { width: 104, height: 64 }
    };
    const measurementProfileMessage = measurementProfileItemsComplianceMessage(profileItems, {
      measurementTypes: currentMeasurementConfig?.measurementTypes ?? [],
      parameterDefinitions: effectiveDefinitions,
      positionDefinitions: buildMeasurementProfilePositionDefinitions({
        source,
        parameterDefinitions: effectiveDefinitions,
        libraryTemplates
      }),
      targetLabel: metadata.label || className
    });
    if (measurementProfileMessage) {
      setCustomDeviceDraft((current: any) => ({ ...current, error: measurementProfileMessage }));
      return false;
    }
    const overrideKey = componentLibraryDefinitionOverrideKey(className);
    const updatedAt = new Date().toISOString();
    const nextDeviceDefinitionOverrides = normalizeSharedDeviceDefinitionOverrides({
      ...deviceDefinitionOverrides,
      [overrideKey]: {
        kind: overrideKey,
        params: definitions.reduce<Record<string, string>>((params, definition) => {
          if (definition.enName !== "name") params[definition.enName] = String(definition.typicalValue ?? "");
          return params;
        }, { component_type: className }),
        parameterDefinitions: definitions,
        ...(metadata.isDerivedComponentLibrary && definitions.length === 0
          ? { parameterDefinitionsIntent: "delete-all" }
          : {}),
        measurementDefinitions: cloneDeviceMeasurementDefinitions(profileItems) ?? [],
        ...(profileItems.length === 0 ? { measurementDefinitionsIntent: "delete-all" } : {}),
        ...(!metadata.isDerivedComponentLibrary ? {
          terminalType: terminalTypes[0] ?? "ac",
          terminalCount: terminalTypes.length,
          terminalTypes,
          terminalLabels,
          terminalRoles,
          terminalAssociations: metadata.isContainer ? terminalAssociations : undefined,
          isContainer: metadata.isContainer
        } : {}),
        updatedAt
      }
    }, libraryTemplates);
    setDeviceDefinitionOverrides(nextDeviceDefinitionOverrides);
    persistDeviceLibraryChange({ deviceDefinitionOverrides: nextDeviceDefinitionOverrides }, {
      success: `类定义已保存到后台：${metadata.label || className}`,
      failure: `类定义已保存到本地，后台保存失败：${metadata.label || className}`
    });
    const cleanDraft = {
      ...customDeviceDraft,
      params: definitions.map((definition) => ({
        ...definition,
        id: customParamId(),
        enumOptions: definition.enumOptions?.map((option) => ({ ...option })),
        enumValues: definition.enumValues ? [...definition.enumValues] : undefined
      })),
      measurementDefinitions: cloneDeviceMeasurementDefinitions(profileItems) ?? [],
      error: ""
    };
    setCustomDeviceDraft(cleanDraft);
    setCustomDeviceDraftCleanBaseline(cleanDraft, customDeviceDraft.terminalAnchors);
    const toastMessage = `类定义已保存：${metadata.label || className}`;
    setCustomDeviceSaveToast(toastMessage);
    if (customDeviceSaveToastTimerRef?.current) clearTimeout(customDeviceSaveToastTimerRef.current);
    if (customDeviceSaveToastTimerRef) {
      customDeviceSaveToastTimerRef.current = setTimeout(() => setCustomDeviceSaveToast(""), 3000);
    }
    writeOperationLog(`保存类定义：${metadata.label || className}`);
    if (options.closeAfterSave) closeCustomDeviceDialog();
    return true;
  };
}

export function createSaveCustomDeviceDefinitionDialog(__appScope: DeviceDefinitionScope) {
  return (options: { closeAfterSave?: boolean } = {}) => {
  const { customComponentTreeSelection, customDeviceDefinitionMode, editingCustomDeviceKind, saveBuiltinDeviceDefinitionFromCustomDraft, saveComponentLibraryDefinition, saveCustomDeviceTemplate, selectedCustomComponentTemplate, selectedDefinitionTemplate, showGlobalMessage = () => undefined } = __appScope;
    if (customDeviceDefinitionMode === "create") {
      return saveCustomDeviceTemplate(options) === true;
    }

    if (customComponentTreeSelection?.kind === "componentLibrary") {
      return saveComponentLibraryDefinition(options) === true;
    }

    const selectedTemplateKind = customComponentTreeSelection?.kind === "component"
      ? customComponentTreeSelection.templateKind
      : "";
    const targetTemplate = selectedTemplateKind && selectedCustomComponentTemplate?.kind === selectedTemplateKind
      ? selectedCustomComponentTemplate
      : selectedTemplateKind && selectedDefinitionTemplate?.kind === selectedTemplateKind
        ? selectedDefinitionTemplate
        : undefined;
    if (!targetTemplate) {
      showGlobalMessage("当前没有选中可保存的元件。请选择一个元件，或者先执行“新建元件”。");
      return false;
    }
    if (targetTemplate.custom) {
      if (editingCustomDeviceKind !== targetTemplate.kind) {
        showGlobalMessage("当前元件的编辑状态已失效，请重新选择该元件后再保存。");
        return false;
      }
      return saveCustomDeviceTemplate(options) === true;
    }
    if (editingCustomDeviceKind !== "") {
      showGlobalMessage("当前元件的编辑状态与选中元件不一致，请重新选择后再保存。");
      return false;
    }
    const saveResult = saveBuiltinDeviceDefinitionFromCustomDraft(targetTemplate, options);
    return saveResult && typeof saveResult.then === "function"
      ? Promise.resolve(saveResult).then((saved) => saved === true)
      : saveResult === true;
  };
}
