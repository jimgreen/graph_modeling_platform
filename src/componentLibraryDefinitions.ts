import type { CustomComponentLibraryDefinition } from "./appExtracted/appCoreCanvasUtilities";
import {
  resolveComponentLibraryClassFamilyMetadata,
  resolveComponentLibraryClassMetadata,
  type ComponentLibraryClassMetadata
} from "./componentLibraryMetadata";
import {
  componentClassForConcreteTemplate
} from "./customDeviceUtils";
import {
  buildDefaultDeviceParameterDefinitions,
  resolveEffectiveTemplateParameterDefinitions,
  type ContainerTerminalAssociationValue,
  type ContainerTerminalRole,
  type DeviceParameterDefinition,
  type DeviceTemplate,
  type DeviceTemplateDefinitionOverride,
  type TerminalType
} from "./model";
import {
  cloneDeviceMeasurementDefinitions,
  type DeviceMeasurementDefinition
} from "./measurementDefinitionTypes";

const definitionKey = (value: unknown) => String(value ?? "").trim().toLowerCase();

export function componentLibraryDefinitionOverrideKey(className: unknown) {
  const normalizedClassName = String(className ?? "").trim();
  return normalizedClassName ? `class:${normalizedClassName}` : "";
}

export function buildComponentLibraryDefaultParameterDefinitions(
  className: string,
  terminalTypes: readonly TerminalType[],
  options: {
    isContainer?: boolean;
    terminalRoles?: readonly ContainerTerminalRole[];
    terminalAssociations?: readonly ContainerTerminalAssociationValue[];
  } = {}
): DeviceParameterDefinition[] {
  const generated = buildDefaultDeviceParameterDefinitions(terminalTypes, options);
  const devTypeDefinition: DeviceParameterDefinition = {
    cnName: "设备类型",
    enName: "dev_type",
    valueType: "string",
    typicalValue: String(className ?? "").trim(),
    readonly: false
  };
  const runStatIndex = generated.findIndex((definition) => definition.enName === "run_stat");
  const insertionIndex = runStatIndex >= 0 ? runStatIndex + 1 : generated.length;
  return [
    ...generated.slice(0, insertionIndex),
    devTypeDefinition,
    ...generated.slice(insertionIndex)
  ];
}

function mergeParameterDefinitions(
  defaults: readonly DeviceParameterDefinition[],
  sources: readonly DeviceParameterDefinition[]
) {
  const rows = defaults.map((definition) => ({ ...definition }));
  const rowIndexByKey = new Map(rows.map((definition, index) => [definitionKey(definition.enName), index]));
  for (const source of sources) {
    const key = definitionKey(source.enName);
    if (!key) continue;
    const existingIndex = rowIndexByKey.get(key);
    if (existingIndex === undefined) {
      rowIndexByKey.set(key, rows.length);
      rows.push({
        ...source,
        enumOptions: source.enumOptions?.map((option) => ({ ...option })),
        enumValues: source.enumValues ? [...source.enumValues] : undefined
      });
      continue;
    }
    const generated = rows[existingIndex];
    rows[existingIndex] = {
      ...generated,
      ...source,
      cnName: generated.cnName,
      enName: generated.enName,
      readonly: generated.readonly,
      enumOptions: source.enumOptions?.map((option) => ({ ...option })),
      enumValues: source.enumValues ? [...source.enumValues] : undefined
    };
  }
  return rows;
}

function mergeMeasurementDefinitions(
  sources: readonly (readonly DeviceMeasurementDefinition[] | undefined)[]
) {
  const rows: DeviceMeasurementDefinition[] = [];
  const seen = new Set<string>();
  for (const source of sources) {
    for (const definition of cloneDeviceMeasurementDefinitions(source) ?? []) {
      const key = JSON.stringify({
        measurementTypeId: definition.measurementTypeId,
        position: definition.position ?? "device",
        associatedField: definition.associatedField ?? "",
        role: definition.role ?? "",
        name: definition.name ?? ""
      });
      if (seen.has(key)) continue;
      seen.add(key);
      rows.push(definition);
    }
  }
  return rows;
}

const measurementDefinitionKey = (definition: DeviceMeasurementDefinition) => JSON.stringify({
  measurementTypeId: definition.measurementTypeId,
  position: definition.position ?? "device",
  associatedField: definition.associatedField ?? "",
  role: definition.role ?? "",
  name: definition.name ?? ""
});

function classMetadataFor(
  className: string,
  categoryLibraryName: string,
  customComponentLibraries: readonly CustomComponentLibraryDefinition[],
  templates: readonly DeviceTemplate[]
) {
  const normalizedClassName = definitionKey(className);
  return resolveComponentLibraryClassMetadata(
    className,
    categoryLibraryName,
    customComponentLibraries,
    templates
  ) ?? resolveComponentLibraryClassFamilyMetadata(
    className,
    categoryLibraryName,
    customComponentLibraries,
    templates
  ).find((metadata) => definitionKey(metadata.className) === normalizedClassName) ?? null;
}

function templatesForClass(
  metadata: ComponentLibraryClassMetadata,
  templates: readonly DeviceTemplate[]
) {
  const classKey = definitionKey(metadata.className);
  const categoryKey = definitionKey(metadata.categoryLibraryName);
  return templates.filter((template) => (
    definitionKey(componentClassForConcreteTemplate(template)) === classKey &&
    (!categoryKey || definitionKey(template.categoryLibrary) === categoryKey)
  ));
}

export type EditableComponentLibraryDefinition = {
  metadata: ComponentLibraryClassMetadata;
  parameterDefinitions: DeviceParameterDefinition[];
  measurementDefinitions: DeviceMeasurementDefinition[];
  inheritedParameterDefinitions: DeviceParameterDefinition[];
  inheritedMeasurementDefinitions: DeviceMeasurementDefinition[];
  effectiveParameterDefinitions: DeviceParameterDefinition[];
  effectiveMeasurementDefinitions: DeviceMeasurementDefinition[];
  matchingTemplates: DeviceTemplate[];
  overrideKey: string;
  persisted: boolean;
};

export function resolveEditableComponentLibraryDefinition(options: {
  className: string;
  categoryLibraryName?: string;
  customComponentLibraries?: readonly CustomComponentLibraryDefinition[];
  templates?: readonly DeviceTemplate[];
  overrides?: Readonly<Record<string, DeviceTemplateDefinitionOverride>>;
}): EditableComponentLibraryDefinition | null {
  const customComponentLibraries = options.customComponentLibraries ?? [];
  const templates = options.templates ?? [];
  const overrides = options.overrides ?? {};
  const resolving = new Set<string>();

  const resolve = (className: string, categoryLibraryName: string): EditableComponentLibraryDefinition | null => {
    const recursionKey = `${definitionKey(categoryLibraryName)}::${definitionKey(className)}`;
    if (!definitionKey(className) || resolving.has(recursionKey)) return null;
    resolving.add(recursionKey);
    try {
      const sourceMetadata = classMetadataFor(className, categoryLibraryName, customComponentLibraries, templates);
      if (!sourceMetadata) return null;
      const overrideKey = componentLibraryDefinitionOverrideKey(sourceMetadata.className);
      const persistedOverride = overrides[overrideKey];
      const matchingTemplates = templatesForClass(sourceMetadata, templates);
      const inherited = sourceMetadata.isDerivedComponentLibrary
        ? resolve(sourceMetadata.baseComponentLibrary, sourceMetadata.categoryLibraryName)
        : null;
      const inheritedMetadata = inherited?.metadata;
      const persistedTerminalTypes = !sourceMetadata.isDerivedComponentLibrary && Array.isArray(persistedOverride?.terminalTypes)
        ? persistedOverride.terminalTypes
        : undefined;
      const metadata: ComponentLibraryClassMetadata = inheritedMetadata
        ? {
            ...sourceMetadata,
            terminalCount: inheritedMetadata.terminalCount,
            terminalTypes: [...inheritedMetadata.terminalTypes],
            terminalLabels: [...inheritedMetadata.terminalLabels],
            terminalRoles: [...inheritedMetadata.terminalRoles],
            terminalAssociations: [...inheritedMetadata.terminalAssociations],
            isContainer: inheritedMetadata.isContainer
          }
        : persistedTerminalTypes
          ? {
              ...sourceMetadata,
              terminalTypes: Array.from(
                { length: sourceMetadata.terminalCount },
                (_, index) => persistedTerminalTypes[index] ?? sourceMetadata.terminalTypes[index]
              ),
              terminalLabels: Array.from(
                { length: sourceMetadata.terminalCount },
                (_, index) => persistedOverride?.terminalLabels?.[index] ?? sourceMetadata.terminalLabels[index] ?? ""
              ),
              terminalRoles: Array.from(
                { length: sourceMetadata.terminalCount },
                (_, index) => persistedOverride?.terminalRoles?.[index] ?? sourceMetadata.terminalRoles[index]
              ),
              terminalAssociations: Array.from(
                { length: sourceMetadata.terminalCount },
                (_, index) => persistedOverride?.terminalAssociations?.[index] ?? sourceMetadata.terminalAssociations[index]
              )
            }
          : sourceMetadata;
      const terminalTypes = metadata.terminalTypes.slice(0, metadata.terminalCount);
      const defaults = metadata.isDerivedComponentLibrary ? [] : buildComponentLibraryDefaultParameterDefinitions(metadata.className, terminalTypes, {
        isContainer: metadata.isContainer,
        terminalRoles: metadata.terminalRoles.slice(0, metadata.terminalCount),
        terminalAssociations: metadata.terminalAssociations.slice(0, metadata.terminalCount)
      });
      const inheritedParameterDefinitions = inherited?.effectiveParameterDefinitions ?? [];
      const inheritedParameterKeys = new Set(
        inheritedParameterDefinitions.map((definition) => definitionKey(definition.enName))
      );
      const seededDefinitions = Array.isArray(persistedOverride?.parameterDefinitions)
        ? persistedOverride.parameterDefinitions
        : matchingTemplates.flatMap((template) => (
            resolveEffectiveTemplateParameterDefinitions(template, templates)
          ));
      const ownSeededDefinitions = metadata.isDerivedComponentLibrary
        ? seededDefinitions.filter((definition) => !inheritedParameterKeys.has(definitionKey(definition.enName)))
        : seededDefinitions;
      const parameterDefinitions = mergeParameterDefinitions(defaults, ownSeededDefinitions);
      if (!persistedOverride && !metadata.isDerivedComponentLibrary) {
        const devType = parameterDefinitions.find((definition) => definitionKey(definition.enName) === "dev_type");
        if (devType) devType.typicalValue = metadata.className;
      }
      const inheritedMeasurementDefinitions = inherited?.effectiveMeasurementDefinitions ?? [];
      const inheritedMeasurementKeys = new Set(inheritedMeasurementDefinitions.map(measurementDefinitionKey));
      const measurementDefinitions = Array.isArray(persistedOverride?.measurementDefinitions)
        ? cloneDeviceMeasurementDefinitions(persistedOverride.measurementDefinitions) ?? []
        : mergeMeasurementDefinitions(matchingTemplates.map((template) => template.measurementDefinitions));
      const ownMeasurementDefinitions = metadata.isDerivedComponentLibrary
        ? measurementDefinitions.filter((definition) => !inheritedMeasurementKeys.has(measurementDefinitionKey(definition)))
        : measurementDefinitions;
      const effectiveParameterDefinitions = metadata.isDerivedComponentLibrary
        ? mergeParameterDefinitions(inheritedParameterDefinitions, parameterDefinitions)
        : parameterDefinitions.map((definition) => ({ ...definition }));
      const effectiveMeasurementDefinitions = metadata.isDerivedComponentLibrary
        ? mergeMeasurementDefinitions([inheritedMeasurementDefinitions, ownMeasurementDefinitions])
        : cloneDeviceMeasurementDefinitions(ownMeasurementDefinitions) ?? [];
      return {
        metadata,
        parameterDefinitions,
        measurementDefinitions: ownMeasurementDefinitions,
        inheritedParameterDefinitions: inheritedParameterDefinitions.map((definition) => ({ ...definition })),
        inheritedMeasurementDefinitions: cloneDeviceMeasurementDefinitions(inheritedMeasurementDefinitions) ?? [],
        effectiveParameterDefinitions,
        effectiveMeasurementDefinitions,
        matchingTemplates,
        overrideKey,
        persisted: Boolean(persistedOverride)
      };
    } finally {
      resolving.delete(recursionKey);
    }
  };

  return resolve(String(options.className ?? "").trim(), String(options.categoryLibraryName ?? "").trim());
}
