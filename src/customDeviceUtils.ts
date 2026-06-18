import type {
  ContainerTerminalAssociationType,
  ContainerTerminalAssociationValue,
  ContainerTerminalRole,
  DeviceParameterDefinition,
  DeviceStateDefinition,
  DeviceTemplate,
  DeviceTemplateDefinitionOverride,
  Point,
  TerminalType
} from "./model";
import {
  ALLOW_RESIZE_TRANSFORM_PARAM,
  buildDefaultDeviceParameterDefinitions,
  CUSTOM_PARAM_DEFINITIONS_KEY,
  TERMINAL_TYPE_LIBRARY_LABELS,
  getTemplateParameterDefinitions,
  inferESection,
  isDoubleContainerTerminalAssociation
} from "./model";
import type { ImageAsset, OrthogonalAxis } from "./App";
import {
  CONTAINER_TERMINAL_ASSOCIATION_OPTIONS,
  CUSTOM_DEVICE_TERMINAL_ANCHOR_PRECISION,
  MAX_CUSTOM_DEVICE_TERMINALS,
  PARAM_LABELS,
  normalizeAttributeLibraryName,
  normalizeComponentTypeName,
  normalizeDefinitionRows,
  templateResizeTransformValue,
  terminalColor
} from "./App";
import type { CustomDeviceDraft, DeviceDefinitionDraftRow, DeviceDefinitionVisualDraft } from "./App";
import { createDefinitionStateDraftRows, customParamId, deviceDefinitionRowId } from "./stateIconDrawing";
import { escapeXml } from "./svgUtils";
import { clampNumber } from "./canvasViewport";

export function fallbackComponentTypeForAttributeLibrary(attributeLibraryName: string) {
  const normalized = normalizeAttributeLibraryName(attributeLibraryName);
  if (normalized.includes("静态")) return "StaticBasicShape";
  if (normalized.includes("直流")) return "DCLoad";
  if (normalized.includes("变流")) return "DCDCConverter";
  if (normalized.includes("氢")) return "HydroLoad";
  if (normalized.includes("热")) return "HeatLoad";
  return "ACLoad";
}

export function resolveTemplateComponentType(template: DeviceTemplate) {
  const inferred = inferESection(template.kind, template.params);
  if (inferred) {
    return inferred;
  }
  return fallbackComponentTypeForAttributeLibrary(template.attributeLibrary);
}

export function deviceDefinitionKeyForTemplate(template: DeviceTemplate) {
  return normalizeComponentTypeName(resolveTemplateComponentType(template)) || template.kind;
}

export function deviceDefinitionOverrideForTemplate(
  template: DeviceTemplate,
  overrides: Record<string, DeviceTemplateDefinitionOverride>
) {
  return overrides[template.kind] ?? overrides[deviceDefinitionKeyForTemplate(template)];
}

export const isReservedDeviceDefinitionParamName = (enName: string) =>
  enName.trim() === "is_container" || enName.trim() === ALLOW_RESIZE_TRANSFORM_PARAM;

export function createDefinitionDraftRows(template: DeviceTemplate): DeviceDefinitionDraftRow[] {
  return getTemplateParameterDefinitions(template)
    .filter((definition) => definition.enName !== "component_type" && !isReservedDeviceDefinitionParamName(definition.enName))
    .map((definition) => ({
      ...definition,
      cnName: definition.cnName === definition.enName ? PARAM_LABELS[definition.enName] ?? definition.cnName : definition.cnName,
      id: deviceDefinitionRowId()
    }));
}

export const normalizeCustomDeviceTerminalAnchorCoordinate = (value: number) =>
  Math.round(clampNumber(Number.isFinite(value) ? value : 0, -0.5, 0.5) * CUSTOM_DEVICE_TERMINAL_ANCHOR_PRECISION) /
  CUSTOM_DEVICE_TERMINAL_ANCHOR_PRECISION;

export const projectCustomDeviceTerminalAnchorToBoundary = (anchor: Point): Point => {
  const x = normalizeCustomDeviceTerminalAnchorCoordinate(anchor.x);
  const y = normalizeCustomDeviceTerminalAnchorCoordinate(anchor.y);
  if (Math.abs(x) >= Math.abs(y)) {
    return {
      x: x < 0 ? -0.5 : 0.5,
      y
    };
  }
  return {
    x,
    y: y < 0 ? -0.5 : 0.5
  };
};

export const customDeviceTerminalAnchorKey = (anchor: Point) =>
  `${normalizeCustomDeviceTerminalAnchorCoordinate(anchor.x)}:${normalizeCustomDeviceTerminalAnchorCoordinate(anchor.y)}`;

export const hasOverlappingCustomDeviceTerminalAnchors = (anchors: readonly Point[]) =>
  new Set(anchors.map(customDeviceTerminalAnchorKey)).size !== anchors.length;

export function createDefaultCustomDeviceTerminalAnchors(count: number, sourceAnchors: readonly Point[] = []): Point[] {
  const fallbackAnchors: Point[] = [
    { x: -0.5, y: 0 },
    { x: 0.5, y: 0 },
    { x: 0, y: -0.5 },
    { x: 0, y: 0.5 },
    { x: -0.5, y: -0.25 },
    { x: 0.5, y: -0.25 },
    { x: -0.5, y: 0.25 },
    { x: 0.5, y: 0.25 }
  ];
  const safeCount = clampNumber(Math.round(count || 0), 0, MAX_CUSTOM_DEVICE_TERMINALS);
  return Array.from({ length: safeCount }, (_, index) => {
    const source = sourceAnchors[index] ?? fallbackAnchors[index] ?? { x: 0, y: 0 };
    return projectCustomDeviceTerminalAnchorToBoundary(source);
  });
}

export function createEmptyCustomDeviceDraft(attributeLibraryName = "交流设备"): CustomDeviceDraft {
  return {
    attributeLibraryName,
    componentType: fallbackComponentTypeForAttributeLibrary(attributeLibraryName),
    componentName: "",
    backgroundImage: "",
    backgroundImageAssetId: "",
    size: { width: 104, height: 64 },
    allowResizeTransform: "0",
    terminalCount: 2,
    terminalTypes: Array.from({ length: MAX_CUSTOM_DEVICE_TERMINALS }, () => "ac") as TerminalType[],
    terminalLabels: Array.from({ length: MAX_CUSTOM_DEVICE_TERMINALS }, () => ""),
    terminalAnchors: createDefaultCustomDeviceTerminalAnchors(2),
    terminalRoles: Array.from({ length: MAX_CUSTOM_DEVICE_TERMINALS }, () => "single-load") as ContainerTerminalRole[],
    terminalAssociations: Array.from({ length: MAX_CUSTOM_DEVICE_TERMINALS }, () => "ac-load") as ContainerTerminalAssociationValue[],
    isContainer: false,
    params: [],
    stateDefinitions: [],
    error: ""
  };
}

export function createCustomDeviceDraftFromTemplate(template: DeviceTemplate, sectionName = resolveTemplateComponentType(template)): CustomDeviceDraft {
  const attributeLibraryName = normalizeAttributeLibraryName(template.attributeLibrary);
  const section = normalizeComponentTypeName(sectionName);
  const terminalCount = clampNumber(template.terminalCount, 0, MAX_CUSTOM_DEVICE_TERMINALS);
  const terminalTypes = (template.terminalTypes ?? Array.from({ length: template.terminalCount }, () => template.terminalType)).slice(0, MAX_CUSTOM_DEVICE_TERMINALS) as TerminalType[];
  const terminalAssociations = normalizeContainerTerminalAssociations(
    terminalTypes,
    template.terminalAssociations ?? [],
    terminalCount
  );
  const defaultDefinitions = new Set(customDefaultDefinitions(terminalTypes, {
    isContainer: template.isContainer,
    terminalAssociations
  }).map((definition) => definition.enName.toLowerCase()));
  const customParams = (template.parameterDefinitions ?? parseCustomDefinitions(template.params))
    .filter((definition) =>
      !defaultDefinitions.has(definition.enName.toLowerCase()) &&
      definition.enName !== "component_type" &&
      !isReservedDeviceDefinitionParamName(definition.enName)
    )
    .map((definition) => ({ ...definition, id: customParamId() }));
  const stateRows = createDefinitionStateDraftRows(template);
  return {
    attributeLibraryName,
    componentType: section,
    componentName: template.label,
    backgroundImage: template.params.backgroundImage ?? "",
    backgroundImageAssetId: template.params.backgroundImageAssetId ?? "",
    size: { ...template.size },
    allowResizeTransform: templateResizeTransformValue(template),
    terminalCount,
    terminalTypes: Array.from({ length: MAX_CUSTOM_DEVICE_TERMINALS }, (_, index) => terminalTypes[index] ?? "ac") as TerminalType[],
    terminalLabels: Array.from({ length: MAX_CUSTOM_DEVICE_TERMINALS }, (_, index) => template.terminalLabels?.[index] ?? ""),
    terminalAnchors: createDefaultCustomDeviceTerminalAnchors(terminalCount, template.terminalAnchors),
    terminalRoles: Array.from({ length: MAX_CUSTOM_DEVICE_TERMINALS }, (_, index) => template.terminalRoles?.[index] ?? "single-load") as ContainerTerminalRole[],
    terminalAssociations: Array.from({ length: MAX_CUSTOM_DEVICE_TERMINALS }, (_, index) => terminalAssociations[index] ?? "ac-load") as ContainerTerminalAssociationValue[],
    isContainer: Boolean(template.isContainer),
    params: customParams,
    stateDefinitions: stateRows,
    error: template.custom ? "" : "当前选中的是系统内置元件，可查看并复制为新自定义元件，不能直接覆盖内置定义。"
  };
}

export function createDefinitionVisualDraft(template: DeviceTemplate): DeviceDefinitionVisualDraft {
  const terminalCount = clampNumber(Math.round(template.terminalCount || 0), 0, MAX_CUSTOM_DEVICE_TERMINALS);
  const sourceTerminalTypes = (template.terminalTypes ?? Array.from({ length: terminalCount }, () => template.terminalType)).slice(0, terminalCount) as TerminalType[];
  const terminalTypes = Array.from({ length: MAX_CUSTOM_DEVICE_TERMINALS }, (_, index) => sourceTerminalTypes[index] ?? template.terminalType ?? "ac") as TerminalType[];
  return {
    backgroundImage: template.params.backgroundImage ?? "",
    backgroundImageAssetId: template.params.backgroundImageAssetId ?? "",
    size: {
      width: Math.max(1, Math.round(template.size.width || 104)),
      height: Math.max(1, Math.round(template.size.height || 64))
    },
    terminalCount,
    terminalTypes,
    terminalLabels: Array.from({ length: MAX_CUSTOM_DEVICE_TERMINALS }, (_, index) => {
      const type = terminalTypes[index] ?? template.terminalType ?? "ac";
      return template.terminalLabels?.[index] ?? `${TERMINAL_TYPE_LIBRARY_LABELS[type] ?? type}端${index + 1}`;
    }),
    terminalAnchors: createDefaultCustomDeviceTerminalAnchors(terminalCount, template.terminalAnchors),
    error: ""
  };
}

export function defaultContainerAssociationForTerminalType(type: TerminalType): ContainerTerminalAssociationType {
  return CONTAINER_TERMINAL_ASSOCIATION_OPTIONS[type][0].value;
}

export function isAssociationAllowedForTerminal(type: TerminalType, association: ContainerTerminalAssociationValue): association is ContainerTerminalAssociationType {
  return Boolean(association && CONTAINER_TERMINAL_ASSOCIATION_OPTIONS[type].some((option) => option.value === association));
}

export function normalizeContainerTerminalAssociations(
  terminalTypes: TerminalType[],
  terminalAssociations: ContainerTerminalAssociationValue[],
  terminalCount: number
): ContainerTerminalAssociationValue[] {
  const next = terminalAssociations.slice(0, terminalCount);
  while (next.length < terminalCount) {
    next.push(defaultContainerAssociationForTerminalType(terminalTypes[next.length] ?? "ac"));
  }
  for (let index = 0; index < terminalCount; index += 1) {
    if (index > 0 && isDoubleContainerTerminalAssociation(next[index - 1])) {
      next[index] = "";
      continue;
    }
    const type = terminalTypes[index] ?? "ac";
    if (!isAssociationAllowedForTerminal(type, next[index])) {
      next[index] = defaultContainerAssociationForTerminalType(type);
    }
  }
  return next;
}

export function customDefaultDefinitions(
  terminalTypes: TerminalType[],
  options: {
    isContainer?: boolean;
    terminalRoles?: ContainerTerminalRole[];
    terminalAssociations?: ContainerTerminalAssociationValue[];
  } = {}
): DeviceParameterDefinition[] {
  return buildDefaultDeviceParameterDefinitions(terminalTypes, options);
}

export function generateCustomDeviceImage(label: string, terminalTypes: TerminalType[]) {
  const first = terminalTypes[0] ?? "ac";
  const color = terminalColor(first);
  const safeLabel = escapeXml(label || "Unit");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="160" viewBox="0 0 240 160"><rect width="240" height="160" rx="18" fill="#f8fafc"/><circle cx="70" cy="80" r="38" fill="${color}" fill-opacity="0.14"/><path d="M48 80h44M70 58v44" stroke="${color}" stroke-width="9" stroke-linecap="round"/><text x="132" y="77" font-family="Arial, Microsoft YaHei" font-size="22" font-weight="700" fill="#0f172a">${safeLabel}</text><text x="132" y="104" font-family="Arial" font-size="15" fill="${color}">${terminalTypes.map((type) => type.toUpperCase()).join(" / ")}</text></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export const customDeviceGeneratedDefaultImageCandidates = (
  componentLabel: string,
  componentType: string,
  terminalTypes: TerminalType[]
) => {
  const safeTerminalTypes = terminalTypes.length > 0 ? terminalTypes : (["ac"] as TerminalType[]);
  const labels = Array.from(new Set([componentLabel, componentType, "Unit"].map((label) => label.trim()).filter(Boolean)));
  return new Set(labels.map((label) => generateCustomDeviceImage(label, safeTerminalTypes)));
};

export const syncInheritedCustomDeviceStateVisuals = (
  states: DeviceStateDefinition[],
  defaultVisual: { backgroundImage: string; backgroundImageAssetId: string },
  generatedDefaultImageCandidates: ReadonlySet<string>
): DeviceStateDefinition[] => {
  if (!defaultVisual.backgroundImage || generatedDefaultImageCandidates.size === 0) {
    return states;
  }
  return states.map((state) => {
    const image = state.image || state.backgroundImage || "";
    const assetId = state.imageAssetId || state.backgroundImageAssetId || "";
    if (assetId || !image || image === defaultVisual.backgroundImage || !generatedDefaultImageCandidates.has(image)) {
      return state;
    }
    const next: DeviceStateDefinition = {
      ...state,
      image: defaultVisual.backgroundImage,
      backgroundImage: defaultVisual.backgroundImage
    };
    if (defaultVisual.backgroundImageAssetId) {
      next.imageAssetId = defaultVisual.backgroundImageAssetId;
      next.backgroundImageAssetId = defaultVisual.backgroundImageAssetId;
    } else {
      delete next.imageAssetId;
      delete next.backgroundImageAssetId;
    }
    return next;
  });
};

export function parseCustomDefinitions(params: Record<string, string>): DeviceParameterDefinition[] {
  try {
    const parsed = JSON.parse(params[CUSTOM_PARAM_DEFINITIONS_KEY] ?? "[]");
    return normalizeDefinitionRows(parsed);
  } catch {
    return [];
  }
}

export function screenToSvgPoint(svg: SVGSVGElement, clientX: number, clientY: number): Point {
  const point = svg.createSVGPoint();
  point.x = clientX;
  point.y = clientY;
  const matrix = svg.getScreenCTM();
  if (!matrix) {
    return { x: clientX, y: clientY };
  }
  const transformed = point.matrixTransform(matrix.inverse());
  return { x: Math.round(transformed.x), y: Math.round(transformed.y) };
}

export function primaryOrthogonalAxis(start: Point, point: Point): OrthogonalAxis {
  const dx = point.x - start.x;
  const dy = point.y - start.y;
  return Math.abs(dx) >= Math.abs(dy) ? "x" : "y";
}

export function constrainPointToOrthogonalAxis(start: Point, point: Point, axis: OrthogonalAxis = primaryOrthogonalAxis(start, point)): Point {
  return axis === "x" ? { x: point.x, y: start.y } : { x: start.x, y: point.y };
}
