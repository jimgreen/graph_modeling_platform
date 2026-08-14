import {
  inferESection,
  templateDerivedComponentLibraryInfo,
  type ContainerTerminalAssociationValue,
  type ContainerTerminalRole,
  type DeviceTemplate,
  type TerminalType
} from "./model";
import type { CustomComponentLibraryDefinition } from "./appExtracted/appCoreCanvasUtilities";

export const COMPONENT_LIBRARY_MAX_TERMINALS = 8;

export type ComponentLibraryClassMetadata = {
  className: string;
  categoryLibraryName: string;
  label: string;
  isDerivedComponentLibrary: boolean;
  baseComponentLibrary: string;
  terminalCount: number;
  terminalTypes: TerminalType[];
  terminalLabels: string[];
  terminalRoles: ContainerTerminalRole[];
  terminalAssociations: ContainerTerminalAssociationValue[];
  isContainer: boolean;
};

const VALID_TERMINAL_TYPES = new Set<TerminalType>(["ac", "dc", "h2", "heat"]);

const normalizeName = (value: unknown) => String(value ?? "").trim();

const normalizeFlag = (value: unknown) => {
  if (typeof value === "boolean") return value;
  const normalized = normalizeName(value).toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes" || normalized === "是";
};

const normalizeTerminalCount = (value: unknown, fallback = 2) => {
  const number = Number(value);
  const resolved = Number.isFinite(number) ? Math.round(number) : fallback;
  return Math.max(0, Math.min(COMPONENT_LIBRARY_MAX_TERMINALS, resolved));
};

export function defaultTerminalTypeForCategoryLibrary(categoryLibraryName: unknown): TerminalType {
  const normalized = normalizeName(categoryLibraryName);
  if (normalized.includes("直流")) return "dc";
  if (normalized.includes("氢")) return "h2";
  if (normalized.includes("热")) return "heat";
  return "ac";
}

export function defaultTerminalAssociationForClassTerminal(type: TerminalType): ContainerTerminalAssociationValue {
  if (type === "dc") return "dc-load";
  if (type === "h2") return "h2-load";
  if (type === "heat") return "heat-load";
  return "ac-load";
}

const normalizedTerminalType = (value: unknown, fallback: TerminalType) => {
  const normalized = normalizeName(value) as TerminalType;
  return VALID_TERMINAL_TYPES.has(normalized) ? normalized : fallback;
};

const templateClassName = (template: DeviceTemplate) => {
  const explicitClassName = normalizeName(template.componentClass);
  if (explicitClassName) return explicitClassName;
  const derivedInfo = templateDerivedComponentLibraryInfo(template);
  return normalizeName(derivedInfo?.derivedComponentLibrary || inferESection(template.kind, template.params ?? {}) || template.kind);
};

const templateForClass = (
  className: string,
  categoryLibraryName: string,
  templates: readonly DeviceTemplate[]
) => {
  const classKey = normalizeName(className).toLowerCase();
  const categoryKey = normalizeName(categoryLibraryName).toLowerCase();
  const candidates = templates.filter((template) => {
    if (templateClassName(template).toLowerCase() !== classKey) return false;
    return !categoryKey || normalizeName(template.categoryLibrary).toLowerCase() === categoryKey;
  });
  return candidates.find((template) => template.custom) ?? candidates[0];
};

const classDefinitionFor = (
  className: string,
  categoryLibraryName: string,
  definitions: readonly CustomComponentLibraryDefinition[]
) => {
  const classKey = normalizeName(className).toLowerCase();
  const categoryKey = normalizeName(categoryLibraryName).toLowerCase();
  return definitions.find((definition) => (
    normalizeName(definition.name).toLowerCase() === classKey &&
    (!categoryKey || normalizeName(definition.categoryLibraryName).toLowerCase() === categoryKey)
  ));
};

function resolveComponentLibraryClassMetadataInternal(
  classNameValue: unknown,
  categoryLibraryNameValue: unknown,
  definitions: readonly CustomComponentLibraryDefinition[] = [],
  templates: readonly DeviceTemplate[] = [],
  resolvingClassNames = new Set<string>()
): ComponentLibraryClassMetadata | null {
  const className = normalizeName(classNameValue);
  const requestedCategoryLibraryName = normalizeName(categoryLibraryNameValue);
  if (!className) return null;
  const classKey = className.toLowerCase();
  if (resolvingClassNames.has(classKey)) return null;
  const nextResolvingClassNames = new Set(resolvingClassNames);
  nextResolvingClassNames.add(classKey);

  const definition = classDefinitionFor(className, requestedCategoryLibraryName, definitions);
  const template = templateForClass(className, requestedCategoryLibraryName || normalizeName(definition?.categoryLibraryName), templates);
  const derivedInfo = template ? templateDerivedComponentLibraryInfo(template) : null;
  const categoryLibraryName = normalizeName(definition?.categoryLibraryName || template?.categoryLibrary || requestedCategoryLibraryName);
  const isDerivedComponentLibrary = definition?.isDerivedComponentLibrary !== undefined
    ? normalizeFlag(definition.isDerivedComponentLibrary)
    : Boolean(derivedInfo);
  const baseComponentLibrary = normalizeName(
    definition?.derivedFromComponentLibrary ||
    derivedInfo?.baseComponentLibrary ||
    (isDerivedComponentLibrary ? "" : className)
  );
  if (isDerivedComponentLibrary && !baseComponentLibrary) return null;

  const inheritedMetadata = isDerivedComponentLibrary
    ? resolveComponentLibraryClassMetadataInternal(
        baseComponentLibrary,
        categoryLibraryName,
        definitions,
        templates,
        nextResolvingClassNames
      )
    : null;
  const inheritedClassExists = isDerivedComponentLibrary && Boolean(
    classDefinitionFor(baseComponentLibrary, categoryLibraryName, definitions) ||
    templateForClass(baseComponentLibrary, categoryLibraryName, templates)
  );
  if (isDerivedComponentLibrary && inheritedClassExists && !inheritedMetadata) return null;

  const fallbackTerminalType = defaultTerminalTypeForCategoryLibrary(categoryLibraryName);
  const templateTerminalTypes = template?.terminalTypes ?? Array.from(
    { length: template?.terminalCount ?? 0 },
    () => template?.terminalType ?? fallbackTerminalType
  );
  const terminalCount = inheritedMetadata?.terminalCount ?? normalizeTerminalCount(
    definition?.terminalCount,
    normalizeTerminalCount(template?.terminalCount, 2)
  );
  const sourceTerminalTypes = inheritedMetadata?.terminalTypes ?? definition?.terminalTypes ?? templateTerminalTypes;
  const terminalTypes = Array.from({ length: terminalCount }, (_, index) =>
    normalizedTerminalType(sourceTerminalTypes?.[index], fallbackTerminalType)
  );
  const sourceTerminalLabels = inheritedMetadata?.terminalLabels ?? definition?.terminalLabels ?? template?.terminalLabels ?? [];
  const terminalLabels = Array.from({ length: terminalCount }, (_, index) => normalizeName(sourceTerminalLabels[index]));
  const sourceTerminalRoles = inheritedMetadata?.terminalRoles ?? definition?.terminalRoles ?? template?.terminalRoles ?? [];
  const terminalRoles = Array.from({ length: terminalCount }, (_, index) =>
    (sourceTerminalRoles[index] ?? "single-load") as ContainerTerminalRole
  );
  const sourceTerminalAssociations = inheritedMetadata?.terminalAssociations ?? definition?.terminalAssociations ?? template?.terminalAssociations ?? [];
  const terminalAssociations = Array.from({ length: terminalCount }, (_, index) =>
    (sourceTerminalAssociations[index] ?? defaultTerminalAssociationForClassTerminal(terminalTypes[index])) as ContainerTerminalAssociationValue
  );
  const isContainer = inheritedMetadata?.isContainer ?? (
    definition?.isContainerComponentLibrary !== undefined
      ? normalizeFlag(definition.isContainerComponentLibrary)
      : Boolean(template?.isContainer)
  );

  if (!definition && !template) return null;
  return {
    className,
    categoryLibraryName,
    label: normalizeName(definition?.label || derivedInfo?.label || ""),
    isDerivedComponentLibrary,
    baseComponentLibrary: baseComponentLibrary || className,
    terminalCount,
    terminalTypes,
    terminalLabels,
    terminalRoles,
    terminalAssociations,
    isContainer
  };
}

export function resolveComponentLibraryClassMetadata(
  classNameValue: unknown,
  categoryLibraryNameValue: unknown,
  definitions: readonly CustomComponentLibraryDefinition[] = [],
  templates: readonly DeviceTemplate[] = []
): ComponentLibraryClassMetadata | null {
  return resolveComponentLibraryClassMetadataInternal(
    classNameValue,
    categoryLibraryNameValue,
    definitions,
    templates
  );
}

export function componentLibraryDefinitionFromMetadata(
  metadata: ComponentLibraryClassMetadata
): CustomComponentLibraryDefinition {
  return {
    name: metadata.className,
    categoryLibraryName: metadata.categoryLibraryName,
    ...(metadata.label ? { label: metadata.label } : {}),
    isDerivedComponentLibrary: metadata.isDerivedComponentLibrary,
    ...(metadata.isDerivedComponentLibrary ? { derivedFromComponentLibrary: metadata.baseComponentLibrary } : {}),
    ...(!metadata.isDerivedComponentLibrary ? {
      isContainerComponentLibrary: metadata.isContainer,
      terminalCount: metadata.terminalCount,
      terminalTypes: [...metadata.terminalTypes],
      terminalLabels: [...metadata.terminalLabels],
      terminalRoles: [...metadata.terminalRoles],
      terminalAssociations: [...metadata.terminalAssociations]
    } : {})
  };
}
