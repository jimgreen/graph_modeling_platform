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
  DEVICE_LIBRARY,
  buildDefaultDeviceParameterDefinitions,
  baseDeviceKind,
  CUSTOM_PARAM_DEFINITIONS_KEY,
  E_SECTION_COLUMNS,
  TERMINAL_TYPE_LIBRARY_LABELS,
  inferESection,
  isDoubleContainerTerminalAssociation,
  resolveDeviceParameterDefinitionExportSettings,
  resolveEffectiveTemplateParameterDefinitionGroups,
  resolveEffectiveTemplateParameterDefinitions,
  templateDerivedComponentLibraryInfo as modelTemplateDerivedComponentLibraryInfo,
  toSnakeCaseDeviceParamName
} from "./model";
import type { OrthogonalAxis } from "./App";
import {
  DEVICE_DEFINITION_VISUAL_PARAM_KEYS,
  DEVICE_VISUAL_PARAM_PREFIXES
} from "./deviceVisualParams";
import {
  CONTAINER_TERMINAL_ASSOCIATION_OPTIONS,
  CUSTOM_DEVICE_TERMINAL_ANCHOR_PRECISION,
  MAX_CUSTOM_DEVICE_TERMINALS,
  PARAM_LABELS,
  normalizeCategoryLibraryName,
  normalizeComponentLibraryName,
  normalizeDefinitionRows,
  templateResizeTransformValue,
  terminalColor
} from "./App";
import type { CustomDeviceDraft, DeviceDefinitionDraftRow, DeviceDefinitionVisualDraft } from "./App";
import { createDefinitionStateDraftRows, customParamId, deviceDefinitionRowId } from "./stateIconDrawing";
import { decodeSvgImageSource, escapeXml, formatSvgNumber } from "./svgUtils";
import { clampNumber } from "./canvasViewport";
import { cloneDeviceMeasurementDefinitions } from "./measurementDefinitionTypes";

export function fallbackComponentLibraryForCategoryLibrary(categoryLibraryName: string) {
  const normalized = normalizeCategoryLibraryName(categoryLibraryName);
  if (normalized.includes("静态")) return "StaticBasicShape";
  if (normalized.includes("直流")) return "DCLoad";
  if (normalized.includes("变流")) return "DCDCConverter";
  if (normalized.includes("氢")) return "HydroLoad";
  if (normalized.includes("热")) return "HeatLoad";
  return "ACLoad";
}

const BUILT_IN_DEVICE_TEMPLATE_BY_KIND = new Map(
  DEVICE_LIBRARY.map((template) => [template.kind, template] as const)
);

function restoreBuiltInTemplateComponentMetadata(
  template: DeviceTemplate,
  params: Record<string, string>
) {
  const builtInTemplate = template.custom
    ? undefined
    : BUILT_IN_DEVICE_TEMPLATE_BY_KIND.get(template.kind);
  if (!builtInTemplate) return params;
  const restored = { ...params };
  for (const name of SHARED_DEFINITION_METADATA_PARAM_NAMES) {
    delete restored[name];
    const canonicalValue = builtInTemplate.params?.[name];
    if (canonicalValue !== undefined) {
      restored[name] = canonicalValue;
    }
  }
  return restored;
}

export function resolveTemplateComponentLibrary(template: DeviceTemplate) {
  const builtInTemplate = template.custom
    ? undefined
    : BUILT_IN_DEVICE_TEMPLATE_BY_KIND.get(template.kind);
  if (builtInTemplate) {
    const builtInDerivedInfo = modelTemplateDerivedComponentLibraryInfo(builtInTemplate);
    if (builtInDerivedInfo) {
      return builtInDerivedInfo.componentLibrary;
    }
    const builtInComponentLibrary = inferESection(builtInTemplate.kind, builtInTemplate.params);
    if (builtInComponentLibrary) {
      return builtInComponentLibrary;
    }
  }
  const derivedInfo = modelTemplateDerivedComponentLibraryInfo(template);
  if (derivedInfo) {
    return derivedInfo.componentLibrary;
  }
  const inferred = inferESection(template.kind, template.params);
  if (inferred) {
    return inferred;
  }
  const categoryLibrary = template.categoryLibrary ?? (template as DeviceTemplate & { attributeLibrary?: string }).attributeLibrary ?? "交流设备";
  return fallbackComponentLibraryForCategoryLibrary(categoryLibrary);
}

export const templateDerivedComponentLibraryInfo = modelTemplateDerivedComponentLibraryInfo;

export function deviceDefinitionKeyForTemplate(template: DeviceTemplate) {
  return normalizeComponentLibraryName(resolveTemplateComponentLibrary(template)) || template.kind;
}

const SHARED_DEFINITION_METADATA_PARAM_NAMES = new Set([
  "component_type",
  "derived_from_component_type",
  "derived_component_type",
  "derived_component_library_label",
  "is_derived_component_library"
]);

export function isConcreteDeviceDefinitionParamName(name: string) {
  return SHARED_DEFINITION_METADATA_PARAM_NAMES.has(name) ||
    DEVICE_DEFINITION_VISUAL_PARAM_KEYS.has(name) ||
    DEVICE_VISUAL_PARAM_PREFIXES.some((prefix) => name.startsWith(prefix));
}

export function concreteDeviceDefinitionParams(params: Record<string, string> | undefined) {
  return Object.fromEntries(Object.entries(params ?? {}).filter(([name]) => (
    isConcreteDeviceDefinitionParamName(name)
  )));
}

export function componentClassForConcreteTemplate(template: DeviceTemplate) {
  const explicitClass = normalizeComponentLibraryName(template.componentClass ?? "");
  if (explicitClass) return explicitClass;
  const derivedInfo = modelTemplateDerivedComponentLibraryInfo(template);
  return normalizeComponentLibraryName(
    derivedInfo?.derivedComponentLibrary || resolveTemplateComponentLibrary(template)
  );
}

export function concreteDeviceTemplateForStorage(template: DeviceTemplate): DeviceTemplate {
  const {
    categoryLibrary: _categoryLibrary,
    terminalType: _terminalType,
    terminalCount: _terminalCount,
    terminalTypes: _terminalTypes,
    terminalLabels: _terminalLabels,
    terminalRoles: _terminalRoles,
    terminalAssociations: _terminalAssociations,
    isContainer: _isContainer,
    isDerivedComponentLibrary: _isDerivedComponentLibrary,
    derivedFromComponentLibrary: _derivedFromComponentLibrary,
    derivedComponentLibrary: _derivedComponentLibrary,
    derivedComponentLibraryLabel: _derivedComponentLibraryLabel,
    parameterDefinitions: _parameterDefinitions,
    parameterDefinitionsIntent: _parameterDefinitionsIntent,
    parameterDefinitionsComplete: _parameterDefinitionsComplete,
    measurementDefinitions: _measurementDefinitions,
    measurementDefinitionsIntent: _measurementDefinitionsIntent,
    ...visualTemplate
  } = template;
  const params = concreteDeviceDefinitionParams(template.params);
  for (const name of SHARED_DEFINITION_METADATA_PARAM_NAMES) {
    delete params[name];
  }
  return {
    ...visualTemplate,
    componentClass: componentClassForConcreteTemplate(template),
    params
  } as DeviceTemplate;
}

function deviceDefinitionSharedIdentityForTemplate(template: DeviceTemplate) {
  const baseKind = baseDeviceKind(template.kind);
  if (modelTemplateDerivedComponentLibraryInfo(template)) {
    return baseKind;
  }
  const componentLibrary = normalizeComponentLibraryName(resolveTemplateComponentLibrary(template));
  const devType = String(template.params?.dev_type ?? "").trim();
  if (!componentLibrary || componentLibrary.startsWith("Static")) {
    return baseKind;
  }
  return devType ? `${componentLibrary}::${devType}` : componentLibrary;
}

export function deviceDefinitionSharedKeyForTemplate(template: DeviceTemplate) {
  return `shared:${deviceDefinitionSharedIdentityForTemplate(template)}`;
}

export function deviceTemplatesShareParameterDefinitions(
  first: Pick<DeviceTemplate, "kind" | "params"> & Partial<DeviceTemplate>,
  second: Pick<DeviceTemplate, "kind" | "params"> & Partial<DeviceTemplate>
) {
  return deviceDefinitionSharedIdentityForTemplate(first as DeviceTemplate) ===
    deviceDefinitionSharedIdentityForTemplate(second as DeviceTemplate);
}

function overrideTimestamp(override: DeviceTemplateDefinitionOverride | undefined) {
  const timestamp = Date.parse(String(override?.updatedAt ?? ""));
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function preferredDefinitionSource(
  sharedOverride: DeviceTemplateDefinitionOverride | undefined,
  candidates: readonly DeviceTemplateDefinitionOverride[],
  predicate: (override: DeviceTemplateDefinitionOverride) => boolean
) {
  if (sharedOverride && predicate(sharedOverride)) {
    return sharedOverride;
  }
  return candidates
    .filter(predicate)
    .sort((left, right) => overrideTimestamp(right) - overrideTimestamp(left))[0];
}

function latestDefinitionSource(
  ...sources: Array<DeviceTemplateDefinitionOverride | undefined>
) {
  return sources
    .filter((source): source is DeviceTemplateDefinitionOverride => Boolean(source))
    .sort((left, right) => overrideTimestamp(right) - overrideTimestamp(left))[0];
}

function sharedDefinitionParams(override: DeviceTemplateDefinitionOverride | undefined) {
  if (!override?.params) return {};
  return Object.fromEntries(Object.entries(override.params).filter(([key]) => (
    !isConcreteDeviceDefinitionParamName(key) || SHARED_DEFINITION_METADATA_PARAM_NAMES.has(key)
  )));
}

function visualOnlyOverride(
  override: DeviceTemplateDefinitionOverride | undefined,
  _businessParameterNames: ReadonlySet<string> = new Set()
) {
  if (!override) return undefined;
  const next: DeviceTemplateDefinitionOverride = {
    ...override,
    params: concreteDeviceDefinitionParams(override.params)
  };
  delete next.parameterDefinitions;
  delete next.parameterDefinitionsIntent;
  delete next.measurementDefinitions;
  delete next.measurementDefinitionsIntent;
  return next;
}

function sharedDefinitionSourceForTemplate(
  template: DeviceTemplate,
  overrides: Record<string, DeviceTemplateDefinitionOverride>,
  templates: readonly DeviceTemplate[] = DEVICE_LIBRARY
) {
  const sharedKey = deviceDefinitionSharedKeyForTemplate(template);
  const legacySharedKey = deviceDefinitionSharedIdentityForTemplate(template);
  const derived = Boolean(modelTemplateDerivedComponentLibraryInfo(template));
  const peerKinds = templates
    .filter((candidate) => deviceDefinitionSharedKeyForTemplate(candidate) === sharedKey)
    .map((candidate) => candidate.kind);
  const candidateKeys = Array.from(new Set([
    sharedKey,
    legacySharedKey,
    ...(derived ? [] : [deviceDefinitionKeyForTemplate(template)]),
    template.kind,
    baseDeviceKind(template.kind),
    ...peerKinds
  ]));
  const candidates = candidateKeys.map((key) => overrides[key]).filter(Boolean);
  return {
    parameterSource: preferredDefinitionSource(overrides[sharedKey], candidates, (override) => (
      Array.isArray(override.parameterDefinitions) && (
        override.parameterDefinitions.length > 0 || override.parameterDefinitionsIntent === "delete-all"
      )
    )),
    measurementSource: preferredDefinitionSource(overrides[sharedKey], candidates, (override) => (
      Array.isArray(override.measurementDefinitions) && (
        override.measurementDefinitions.length > 0 || override.measurementDefinitionsIntent === "delete-all"
      )
    ))
  };
}

export function deviceDefinitionOverrideForTemplate(
  template: DeviceTemplate,
  overrides: Record<string, DeviceTemplateDefinitionOverride>,
  templates: readonly DeviceTemplate[] = DEVICE_LIBRARY
) {
  const sharedKey = deviceDefinitionSharedKeyForTemplate(template);
  const { parameterSource, measurementSource } = sharedDefinitionSourceForTemplate(template, overrides, templates);
  const sharedOverride = parameterSource ?? measurementSource ?? overrides[sharedKey];
  const exactOverride = overrides[template.kind];
  const derivedInfo = modelTemplateDerivedComponentLibraryInfo(template);
  const terminalDefinitionClass = normalizeComponentLibraryName(
    derivedInfo?.baseComponentLibrary || componentClassForConcreteTemplate(template)
  );
  const classOverride = terminalDefinitionClass
    ? overrides[`class:${terminalDefinitionClass}`]
    : undefined;
  const classTerminalTypes = Array.isArray(classOverride?.terminalTypes)
    ? classOverride.terminalTypes.slice(0, classOverride.terminalCount ?? classOverride.terminalTypes.length)
    : undefined;
  const businessParameterNames = new Set(
    (parameterSource?.parameterDefinitions ?? []).map((definition) => definition.enName)
  );
  const visualOverride = visualOnlyOverride(exactOverride, businessParameterNames);
  if (!sharedOverride && !visualOverride && !classTerminalTypes) return undefined;
  const storedParameterDefinitions = parameterSource?.parameterDefinitions;
  const explicitlyDeletesAllParameterDefinitions =
    parameterSource?.parameterDefinitionsIntent === "delete-all" &&
    Array.isArray(storedParameterDefinitions) &&
    storedParameterDefinitions.length === 0;
  const builtInParameterDefinitions = template.custom ? [] : resolveEffectiveTemplateParameterDefinitions(template, templates);
  const parameterDefinitions = explicitlyDeletesAllParameterDefinitions
    ? []
    : Array.isArray(storedParameterDefinitions) && storedParameterDefinitions.length > 0
      ? storedParameterDefinitions
      : builtInParameterDefinitions.length > 0
        ? builtInParameterDefinitions
        : undefined;
  const storedMeasurementDefinitions = measurementSource?.measurementDefinitions;
  const explicitlyDeletesAllMeasurementDefinitions =
    measurementSource?.measurementDefinitionsIntent === "delete-all" &&
    Array.isArray(storedMeasurementDefinitions) &&
    storedMeasurementDefinitions.length === 0;
  const mergedParams = restoreBuiltInTemplateComponentMetadata(template, {
    ...sharedDefinitionParams(sharedOverride),
    ...sharedDefinitionParams(parameterSource),
    ...sharedDefinitionParams(measurementSource),
    ...(visualOverride?.params ?? {})
  });
  return {
    ...(visualOverride ?? {}),
    kind: template.kind,
    params: mergedParams,
    ...(classTerminalTypes ? {
      terminalType: classTerminalTypes[0] ?? template.terminalType,
      terminalCount: classTerminalTypes.length,
      terminalTypes: [...classTerminalTypes],
      ...(Array.isArray(classOverride?.terminalLabels)
        ? { terminalLabels: classOverride.terminalLabels.slice(0, classTerminalTypes.length) }
        : {}),
      ...(Array.isArray(classOverride?.terminalRoles)
        ? { terminalRoles: classOverride.terminalRoles.slice(0, classTerminalTypes.length) }
        : {}),
      ...(Array.isArray(classOverride?.terminalAssociations)
        ? { terminalAssociations: classOverride.terminalAssociations.slice(0, classTerminalTypes.length) }
        : {}),
      ...(typeof classOverride?.isContainer === "boolean"
        ? { isContainer: classOverride.isContainer }
        : {})
    } : {}),
    ...(Array.isArray(parameterDefinitions)
      ? { parameterDefinitions: parameterDefinitions.map((definition) => ({ ...definition })) }
      : {}),
    ...(explicitlyDeletesAllParameterDefinitions ? { parameterDefinitionsIntent: "delete-all" as const } : {}),
    ...(Array.isArray(storedMeasurementDefinitions)
      ? { measurementDefinitions: cloneDeviceMeasurementDefinitions(storedMeasurementDefinitions) }
      : {}),
    ...(explicitlyDeletesAllMeasurementDefinitions ? { measurementDefinitionsIntent: "delete-all" as const } : {})
  };
}

export function normalizeSharedDeviceDefinitionOverrides(
  overrides: Record<string, DeviceTemplateDefinitionOverride>,
  templates: readonly DeviceTemplate[]
) {
  const next = Object.fromEntries(Object.entries(overrides).map(([key, override]) => {
    const sanitized = { ...override };
    if (Array.isArray(sanitized.parameterDefinitions)) {
      if (sanitized.parameterDefinitions.length > 0) {
        delete sanitized.parameterDefinitionsIntent;
      } else if (sanitized.parameterDefinitionsIntent === "delete-all") {
        sanitized.parameterDefinitions = [];
      } else {
        delete sanitized.parameterDefinitions;
        delete sanitized.parameterDefinitionsIntent;
      }
    } else {
      delete sanitized.parameterDefinitionsIntent;
    }
    if (Array.isArray(sanitized.measurementDefinitions)) {
      if (sanitized.measurementDefinitions.length > 0) {
        delete sanitized.measurementDefinitionsIntent;
      } else if (sanitized.measurementDefinitionsIntent === "delete-all") {
        sanitized.measurementDefinitions = [];
      } else {
        delete sanitized.measurementDefinitions;
        delete sanitized.measurementDefinitionsIntent;
      }
    } else {
      delete sanitized.measurementDefinitionsIntent;
    }
    return [key, sanitized];
  })) as Record<string, DeviceTemplateDefinitionOverride>;
  const templatesBySharedIdentity = new Map<string, DeviceTemplate[]>();
  for (const template of templates) {
    const identity = deviceDefinitionSharedIdentityForTemplate(template);
    templatesBySharedIdentity.set(identity, [...(templatesBySharedIdentity.get(identity) ?? []), template]);
  }
  for (const [sharedIdentity, peers] of templatesBySharedIdentity) {
    const sharedKey = deviceDefinitionSharedKeyForTemplate(peers[0]);
    const candidateKeys = Array.from(new Set([
      sharedKey,
      sharedIdentity,
      ...peers.flatMap((template) => modelTemplateDerivedComponentLibraryInfo(template)
        ? []
        : [deviceDefinitionKeyForTemplate(template)]),
      ...peers.map((template) => template.kind)
    ]));
    const candidates = candidateKeys.map((key) => next[key]).filter(Boolean);
    const parameterSource = preferredDefinitionSource(next[sharedKey], candidates, (override) => (
      Array.isArray(override.parameterDefinitions) && (
        override.parameterDefinitions.length > 0 || override.parameterDefinitionsIntent === "delete-all"
      )
    ));
    const measurementSource = preferredDefinitionSource(next[sharedKey], candidates, (override) => (
      Array.isArray(override.measurementDefinitions) && (
        override.measurementDefinitions.length > 0 || override.measurementDefinitionsIntent === "delete-all"
      )
    ));
    const sharedSource = parameterSource ?? measurementSource;
    const currentShared = next[sharedKey];
    const migratedBusinessParams = Object.fromEntries(
      candidates
        .filter((candidate) => candidate !== currentShared)
        .flatMap((candidate) => Object.entries(sharedDefinitionParams(candidate)))
    );
    if (!sharedSource && !currentShared && Object.keys(migratedBusinessParams).length === 0) {
      for (const peer of peers) {
        if (!next[peer.kind]) continue;
        const visual = visualOnlyOverride(next[peer.kind]);
        const hasVisualContent = visual && Object.keys(visual).some((key) => ![
          "kind",
          "updatedAt",
          "params",
          "isDerivedComponentLibrary",
          "derivedFromComponentLibrary",
          "derivedComponentLibrary",
          "derivedComponentLibraryLabel"
        ].includes(key)) || Boolean(visual && Object.keys(visual.params ?? {}).length > 0);
        if (hasVisualContent) {
          next[peer.kind] = visual!;
        } else {
          delete next[peer.kind];
        }
      }
      if (sharedIdentity !== sharedKey && !peers.some((peer) => peer.kind === sharedIdentity)) {
        delete next[sharedIdentity];
      }
      continue;
    }
    next[sharedKey] = {
      kind: sharedKey,
      params: {
        ...migratedBusinessParams,
        ...sharedDefinitionParams(parameterSource),
        ...sharedDefinitionParams(measurementSource),
        ...sharedDefinitionParams(currentShared)
      },
      ...(Array.isArray(parameterSource?.parameterDefinitions)
        ? { parameterDefinitions: parameterSource.parameterDefinitions.map((definition) => ({ ...definition })) }
        : {}),
      ...(parameterSource?.parameterDefinitionsIntent === "delete-all"
        ? { parameterDefinitionsIntent: "delete-all" as const }
        : {}),
      ...(Array.isArray(measurementSource?.measurementDefinitions)
        ? { measurementDefinitions: cloneDeviceMeasurementDefinitions(measurementSource.measurementDefinitions) }
        : {}),
      ...(measurementSource?.measurementDefinitionsIntent === "delete-all"
        ? { measurementDefinitionsIntent: "delete-all" as const }
        : {}),
      updatedAt: latestDefinitionSource(parameterSource, measurementSource)?.updatedAt
    };
    const businessParameterNames = new Set((next[sharedKey].parameterDefinitions ?? []).map((definition) => definition.enName));
    for (const peer of peers) {
      if (peer.kind === sharedKey || !next[peer.kind]) continue;
      const visual = visualOnlyOverride(next[peer.kind], businessParameterNames);
      const hasVisualContent = visual && Object.keys(visual).some((key) => ![
        "kind",
        "updatedAt",
        "params",
        "isDerivedComponentLibrary",
        "derivedFromComponentLibrary",
        "derivedComponentLibrary",
        "derivedComponentLibraryLabel"
      ].includes(key)) ||
        Boolean(visual && Object.keys(visual.params ?? {}).length > 0);
      if (hasVisualContent) {
        next[peer.kind] = visual!;
      } else {
        delete next[peer.kind];
      }
    }
    if (sharedIdentity !== sharedKey && !peers.some((peer) => peer.kind === sharedIdentity)) {
      delete next[sharedIdentity];
    }
  }
  return next;
}

function templateBusinessDefinitionOverride(template: DeviceTemplate): DeviceTemplateDefinitionOverride | undefined {
  const parameterDefinitions = Array.isArray(template.parameterDefinitions)
    ? template.parameterDefinitions.map((definition) => ({ ...definition }))
    : undefined;
  const measurementDefinitions = cloneDeviceMeasurementDefinitions(template.measurementDefinitions);
  const parameterNames = new Set((parameterDefinitions ?? []).map((definition) => definition.enName));
  const params = Object.fromEntries(Object.entries(template.params ?? {}).filter(([key]) => (
    parameterNames.has(key) || SHARED_DEFINITION_METADATA_PARAM_NAMES.has(key) ||
    !isConcreteDeviceDefinitionParamName(key)
  )));
  const hasBusinessParams = Object.keys(params).some((key) => !SHARED_DEFINITION_METADATA_PARAM_NAMES.has(key));
  if (!parameterDefinitions && !measurementDefinitions && !hasBusinessParams) return undefined;
  return {
    kind: template.kind,
    params,
    ...(parameterDefinitions ? { parameterDefinitions } : {}),
    ...(template.parameterDefinitionsIntent === "delete-all"
      ? { parameterDefinitionsIntent: "delete-all" as const }
      : {}),
    ...(measurementDefinitions ? { measurementDefinitions } : {}),
    ...(template.measurementDefinitionsIntent === "delete-all"
      ? { measurementDefinitionsIntent: "delete-all" as const }
      : {})
  };
}

function concreteTemplateWithoutBusinessDefinitions(
  template: DeviceTemplate,
  _businessParameterNames: ReadonlySet<string>
): DeviceTemplate {
  const next = {
    ...template,
    params: concreteDeviceDefinitionParams(template.params)
  };
  delete next.parameterDefinitions;
  delete next.parameterDefinitionsIntent;
  delete next.parameterDefinitionsComplete;
  delete next.measurementDefinitions;
  delete next.measurementDefinitionsIntent;
  return next;
}

export type DeviceDefinitionOwnershipNormalization = {
  customDeviceTemplates: DeviceTemplate[];
  deviceDefinitionOverrides: Record<string, DeviceTemplateDefinitionOverride>;
  deviceDefinitionSharedKeys: Record<string, string>;
};

/**
 * Moves persisted business definitions to their owning shared class. Concrete
 * templates and overrides are permanently limited to graphics, terminals and
 * state visuals.
 */
export function normalizeDeviceDefinitionOwnership(
  templates: readonly DeviceTemplate[],
  overrides: Record<string, DeviceTemplateDefinitionOverride>
): DeviceDefinitionOwnershipNormalization {
  const deviceDefinitionSharedKeys = Object.fromEntries(
    templates.map((template) => [template.kind, deviceDefinitionSharedKeyForTemplate(template)])
  );
  const migrationOverrides = { ...overrides };
  for (const template of templates) {
    if (!template.custom) continue;
    const legacyBusinessOverride = templateBusinessDefinitionOverride(template);
    if (!legacyBusinessOverride) continue;
    const existing = migrationOverrides[template.kind];
    migrationOverrides[template.kind] = {
      ...legacyBusinessOverride,
      ...existing,
      kind: template.kind,
      params: {
        ...(legacyBusinessOverride.params ?? {}),
        ...(existing?.params ?? {})
      },
      parameterDefinitions: existing?.parameterDefinitions ?? legacyBusinessOverride.parameterDefinitions,
      parameterDefinitionsIntent: existing?.parameterDefinitionsIntent ?? legacyBusinessOverride.parameterDefinitionsIntent,
      measurementDefinitions: existing?.measurementDefinitions ?? legacyBusinessOverride.measurementDefinitions,
      measurementDefinitionsIntent: existing?.measurementDefinitionsIntent ?? legacyBusinessOverride.measurementDefinitionsIntent
    };
  }
  const deviceDefinitionOverrides = normalizeSharedDeviceDefinitionOverrides(migrationOverrides, templates);
  for (const [sharedKey, sharedOverride] of Object.entries(deviceDefinitionOverrides)) {
    if (!sharedKey.startsWith("shared:")) continue;
    const migratedBusinessParams = Object.fromEntries(
      templates
        .filter((template) => deviceDefinitionSharedKeys[template.kind] === sharedKey)
        .flatMap((template) => Object.entries(template.params ?? {}))
        .filter(([name]) => !isConcreteDeviceDefinitionParamName(name))
    );
    deviceDefinitionOverrides[sharedKey] = {
      ...sharedOverride,
      params: {
        ...migratedBusinessParams,
        ...(sharedOverride.params ?? {})
      }
    };
  }
  const customDeviceTemplates = templates
    .filter((template) => template.custom)
    .map((template) => {
      const sharedOverride = deviceDefinitionOverrides[deviceDefinitionSharedKeys[template.kind]];
      const businessParameterNames = new Set(
        (sharedOverride?.parameterDefinitions ?? []).map((definition) => definition.enName)
      );
      return concreteTemplateWithoutBusinessDefinitions(template, businessParameterNames);
    });
  return {
    customDeviceTemplates,
    deviceDefinitionOverrides,
    deviceDefinitionSharedKeys
  };
}

export function migrateSharedDeviceDefinitionOverrideForTemplateChange(
  overrides: Record<string, DeviceTemplateDefinitionOverride>,
  previousTemplate: DeviceTemplate | undefined,
  nextTemplate: DeviceTemplate,
  templatesAfterChange: readonly DeviceTemplate[]
) {
  if (!previousTemplate) {
    return normalizeSharedDeviceDefinitionOverrides(overrides, templatesAfterChange);
  }
  const previousSharedKey = deviceDefinitionSharedKeyForTemplate(previousTemplate);
  const nextSharedKey = deviceDefinitionSharedKeyForTemplate(nextTemplate);
  if (previousSharedKey === nextSharedKey) {
    return normalizeSharedDeviceDefinitionOverrides(overrides, templatesAfterChange);
  }
  const next = { ...overrides };
  const previousShared = next[previousSharedKey];
  if (previousShared) {
    const existingNextShared = next[nextSharedKey];
    next[nextSharedKey] = {
      ...previousShared,
      ...existingNextShared,
      kind: nextSharedKey,
      params: {
        ...(previousShared.params ?? {}),
        ...(existingNextShared?.params ?? {}),
        ...Object.fromEntries(Object.entries(nextTemplate.params ?? {}).filter(([name]) => (
          SHARED_DEFINITION_METADATA_PARAM_NAMES.has(name)
        )))
      }
    };
  }
  if (!templatesAfterChange.some((template) => (
    deviceDefinitionSharedKeyForTemplate(template) === previousSharedKey
  ))) {
    delete next[previousSharedKey];
  }
  return normalizeSharedDeviceDefinitionOverrides(next, templatesAfterChange);
}

export function removeDeviceTemplateDefinitionOverrides(
  overrides: Record<string, DeviceTemplateDefinitionOverride>,
  removedTemplates: readonly DeviceTemplate[],
  templatesAfterRemoval: readonly DeviceTemplate[]
) {
  const next = { ...overrides };
  for (const template of removedTemplates) {
    delete next[template.kind];
  }
  return normalizeSharedDeviceDefinitionOverrides(next, templatesAfterRemoval);
}

export const isReservedDeviceDefinitionParamName = (enName: string) =>
  enName.trim() === "is_container" || enName.trim() === ALLOW_RESIZE_TRANSFORM_PARAM;

export function createDefinitionDraftRows(template: DeviceTemplate): DeviceDefinitionDraftRow[] {
  const derivedInfo = modelTemplateDerivedComponentLibraryInfo(template);
  const editableDefinitions = resolveEffectiveTemplateParameterDefinitionGroups(template).derivedDefinitions;
  const exportContextParams = derivedInfo
    ? { ...template.params, component_type: derivedInfo.derivedComponentLibrary }
    : template.params;
  return editableDefinitions
    .filter((definition) =>
      derivedInfo
        ? isDerivedComponentSpecificDefinition(template, derivedInfo.baseComponentLibrary, definition) &&
          !SHARED_DEFINITION_METADATA_PARAM_NAMES.has(definition.enName) &&
          !isReservedDeviceDefinitionParamName(definition.enName)
        : definition.enName !== "component_type" && !isReservedDeviceDefinitionParamName(definition.enName)
    )
    .map((definition) => ({
      ...definition,
      ...resolveDeviceParameterDefinitionExportSettings(template.kind, exportContextParams, definition),
      cnName: definition.cnName === definition.enName ? PARAM_LABELS[definition.enName] ?? definition.cnName : definition.cnName,
      id: deviceDefinitionRowId()
    }));
}

const DERIVED_COMPONENT_BASE_PARAM_NAMES = new Set([
  "idx",
  "name",
  "dev_type",
  "status",
  "run_stat",
  "node",
  "t1_node",
  "t2_node",
  "t3_node",
  "i_node",
  "j_node",
  "control_type",
  "controlType",
  "acControlType",
  "ac_control_type",
  "dcControlType",
  "dc_control_type",
  "sourceControlType",
  "source_control_type",
  "target_control_type",
  "p_set",
  "q_set",
  "v_set",
  "i_set",
  "alpha",
  "vbase",
  "ratedPower",
  "rated_power",
  "ratedVoltage",
  "rated_voltage",
  "ratedCapacity",
  "rated_capacity",
  "sourceType",
  "source_type"
]);

export function isDerivedComponentBaseParamName(fieldName: unknown, baseComponentLibrary = "") {
  const enName = String(fieldName ?? "").trim();
  if (!enName || enName === "component_type" || isReservedDeviceDefinitionParamName(enName)) {
    return true;
  }
  if (DERIVED_COMPONENT_BASE_PARAM_NAMES.has(enName)) {
    return true;
  }
  return Boolean(baseComponentLibrary && E_SECTION_COLUMNS[baseComponentLibrary]?.includes(enName));
}

function isDerivedComponentSpecificDefinition(
  template: DeviceTemplate,
  baseComponentLibrary: string,
  definition: DeviceParameterDefinition
) {
  const enName = definition.enName.trim();
  if (isDerivedComponentBaseParamName(enName, baseComponentLibrary)) {
    return false;
  }
  const baseSettings = resolveDeviceParameterDefinitionExportSettings(
    template.kind,
    { ...(template.params ?? {}), component_type: baseComponentLibrary },
    definition
  );
  const baseExportName = (baseSettings.exportName || enName).trim();
  return !isDerivedComponentBaseParamName(baseExportName, baseComponentLibrary);
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

function defaultTemplateTerminalAnchors(count: number, sourceAnchors: readonly Point[] | undefined): Point[] {
  if (sourceAnchors?.length) {
    return createDefaultCustomDeviceTerminalAnchors(count, sourceAnchors);
  }
  const fallbackAnchors: Point[] = count === 1
    ? [{ x: 0.5, y: 0 }]
    : [
        { x: -0.5, y: 0 },
        { x: 0.5, y: 0 },
        { x: 0, y: -0.5 },
        { x: 0, y: 0.5 },
        { x: -0.5, y: -0.25 },
        { x: 0.5, y: -0.25 },
        { x: -0.5, y: 0.25 },
        { x: 0.5, y: 0.25 }
      ];
  return createDefaultCustomDeviceTerminalAnchors(count, fallbackAnchors);
}

export function createEmptyCustomDeviceDraft(categoryLibraryName = "交流设备"): CustomDeviceDraft {
  return {
    categoryLibraryName,
    componentLibrary: fallbackComponentLibraryForCategoryLibrary(categoryLibraryName),
    componentName: "",
    componentKind: "",
    isDerivedComponentLibrary: false,
    derivedFromComponentLibrary: "",
    derivedComponentLibrary: "",
    derivedComponentLibraryLabel: "",
    backgroundImage: "",
    backgroundImageAssetId: "",
    backgroundImageFit: "cover",
    backgroundImageCleared: "",
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
    measurementDefinitions: [],
    stateDefinitions: [],
    error: ""
  };
}

export function createCustomDeviceDraftFromTemplate(template: DeviceTemplate, sectionName = resolveTemplateComponentLibrary(template)): CustomDeviceDraft {
  const categoryLibraryName = normalizeCategoryLibraryName(template.categoryLibrary ?? (template as DeviceTemplate & { attributeLibrary?: string }).attributeLibrary ?? "交流设备");
  const section = normalizeComponentLibraryName(sectionName);
  const derivedInfo = modelTemplateDerivedComponentLibraryInfo(template);
  const baseComponentLibrary = derivedInfo?.baseComponentLibrary ? normalizeComponentLibraryName(derivedInfo.baseComponentLibrary) : "";
  const editableComponentLibrary = baseComponentLibrary || section;
  const terminalCount = clampNumber(template.terminalCount, 0, MAX_CUSTOM_DEVICE_TERMINALS);
  const terminalTypes = (template.terminalTypes ?? Array.from({ length: template.terminalCount }, () => template.terminalType)).slice(0, MAX_CUSTOM_DEVICE_TERMINALS) as TerminalType[];
  const terminalAssociations = normalizeContainerTerminalAssociations(
    terminalTypes,
    template.terminalAssociations ?? [],
    terminalCount
  );
  const parameterExportComponentLibrary = derivedInfo?.derivedComponentLibrary ?? section;
  const exportContextParams = { ...template.params, component_type: parameterExportComponentLibrary };
  const editableDefinitions = resolveEffectiveTemplateParameterDefinitionGroups(template).derivedDefinitions;
  const customParams = editableDefinitions
    .filter((definition) =>
      derivedInfo
        ? isDerivedComponentSpecificDefinition(template, derivedInfo.baseComponentLibrary, definition) &&
          !SHARED_DEFINITION_METADATA_PARAM_NAMES.has(definition.enName) &&
          !isReservedDeviceDefinitionParamName(definition.enName)
        : definition.enName !== "component_type" && !isReservedDeviceDefinitionParamName(definition.enName)
    )
    .map((definition) => {
      const row = {
        ...definition,
        ...resolveDeviceParameterDefinitionExportSettings(template.kind, exportContextParams, definition),
        cnName: definition.cnName === definition.enName ? PARAM_LABELS[definition.enName] ?? definition.cnName : definition.cnName,
        id: customParamId()
      };
      // dev_type（设备类型）默认值取当前元件英文名称（template.kind），仅当图元未预设 dev_type 时填充
      if (definition.enName === "dev_type" && !String(row.typicalValue ?? "").trim()) {
        return { ...row, typicalValue: template.kind };
      }
      return row;
    });
  const stateRows = createDefinitionStateDraftRows(template);
  return {
    categoryLibraryName,
    componentLibrary: editableComponentLibrary,
    componentName: template.label,
    componentKind: String(template.englishName ?? template.kind).trim(),
    isDerivedComponentLibrary: Boolean(derivedInfo),
    derivedFromComponentLibrary: baseComponentLibrary,
    derivedComponentLibrary: derivedInfo?.derivedComponentLibrary ?? "",
    derivedComponentLibraryLabel: derivedInfo?.label ?? "",
    backgroundImage: template.params.backgroundImage ?? "",
    backgroundImageAssetId: template.params.backgroundImageAssetId ?? "",
    backgroundImageFit: template.params.backgroundImageFit ?? "cover",
    backgroundImageCleared: template.params.backgroundImageCleared ?? "",
    size: { ...template.size },
    allowResizeTransform: templateResizeTransformValue(template),
    terminalCount,
    terminalTypes: Array.from({ length: MAX_CUSTOM_DEVICE_TERMINALS }, (_, index) => terminalTypes[index] ?? "ac") as TerminalType[],
    terminalLabels: Array.from({ length: MAX_CUSTOM_DEVICE_TERMINALS }, (_, index) => template.terminalLabels?.[index] ?? ""),
    terminalAnchors: defaultTemplateTerminalAnchors(terminalCount, template.terminalAnchors),
    terminalRoles: Array.from({ length: MAX_CUSTOM_DEVICE_TERMINALS }, (_, index) => template.terminalRoles?.[index] ?? "single-load") as ContainerTerminalRole[],
    terminalAssociations: Array.from({ length: MAX_CUSTOM_DEVICE_TERMINALS }, (_, index) => terminalAssociations[index] ?? "ac-load") as ContainerTerminalAssociationValue[],
    isContainer: Boolean(template.isContainer),
    params: customParams,
    measurementDefinitions: cloneDeviceMeasurementDefinitions(template.measurementDefinitions) ?? [],
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
    backgroundImageFit: template.params.backgroundImageFit ?? "cover",
    backgroundImageCleared: template.params.backgroundImageCleared ?? "",
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
    terminalAnchors: defaultTemplateTerminalAnchors(terminalCount, template.terminalAnchors),
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
    isDerivedComponentLibrary?: boolean;
    terminalRoles?: ContainerTerminalRole[];
    terminalAssociations?: ContainerTerminalAssociationValue[];
    existingDefinitions?: readonly Pick<DeviceParameterDefinition, "enName">[];
  } = {}
): DeviceParameterDefinition[] {
  if (options.isDerivedComponentLibrary) {
    return [];
  }
  const definitions = buildDefaultDeviceParameterDefinitions(terminalTypes, options);
  if (options.isContainer || terminalTypes.length === 0) {
    return definitions;
  }
  const existingTerminalNodeNames = new Set(
    (options.existingDefinitions ?? [])
      .map((definition) => toSnakeCaseDeviceParamName(String(definition.enName ?? "")))
      .filter((enName) => (
        enName !== "neutral_node" &&
        /^(?:node|i_node|j_node|ac_node|dc_node|t\d+_node|node\d+)$/.test(enName)
      ))
  );
  if (existingTerminalNodeNames.size < terminalTypes.length) {
    return definitions;
  }
  return definitions.filter((definition) => !/^(?:node|t\d+_node)$/.test(toSnakeCaseDeviceParamName(definition.enName)));
}

export function generateCustomDeviceImage(label: string, terminalTypes: TerminalType[]) {
  const first = terminalTypes[0] ?? "ac";
  const color = terminalColor(first);
  const safeLabel = escapeXml(label || "Unit");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="160" viewBox="0 0 240 160"><rect width="240" height="160" rx="18" fill="#f8fafc"/><circle cx="70" cy="80" r="38" fill="${color}" fill-opacity="0.14"/><path d="M48 80h44M70 58v44" stroke="${color}" stroke-width="9" stroke-linecap="round"/><text x="132" y="77" font-family="Arial, Microsoft YaHei" font-size="22" font-weight="700" fill="#0f172a">${safeLabel}</text><text x="132" y="104" font-family="Arial" font-size="15" fill="${color}">${terminalTypes.map((type) => type.toUpperCase()).join(" / ")}</text></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

const CUSTOM_DEVICE_IMAGE_WIDTH = 240;
const CUSTOM_DEVICE_IMAGE_HEIGHT = 160;
const CUSTOM_DEVICE_IMAGE_INNER_WIDTH = CUSTOM_DEVICE_IMAGE_WIDTH * 3 / 4;
const CUSTOM_DEVICE_IMAGE_INNER_HEIGHT = CUSTOM_DEVICE_IMAGE_HEIGHT * 3 / 4;
const CUSTOM_DEVICE_TERMINAL_BODY_REACH_RATIO = 2.6;
const CUSTOM_DEVICE_PERSISTED_TERMINAL_GROUP_ATTR = `data-custom-device-persisted-terminal-connectors="true"`;
const CUSTOM_DEVICE_PERSISTED_TERMINAL_GROUP_PATTERN =
  /<g\b(?=[^>]*\bdata-custom-device-(?:persisted-terminals|persisted-terminal-connectors|terminal-connectors)\s*=\s*(?:"true"|'true'))[^>]*>[\s\S]*?<\/g>/giu;

function customDeviceTerminalConnectorGeometry(anchor: Point) {
  const boundary = projectCustomDeviceTerminalAnchorToBoundary(anchor);
  const centerX = CUSTOM_DEVICE_IMAGE_WIDTH / 2;
  const centerY = CUSTOM_DEVICE_IMAGE_HEIGHT / 2;
  const innerX = centerX + boundary.x * CUSTOM_DEVICE_IMAGE_INNER_WIDTH;
  const innerY = centerY + boundary.y * CUSTOM_DEVICE_IMAGE_INNER_HEIGHT;
  const horizontalSide = Math.abs(boundary.x) >= Math.abs(boundary.y);
  const bodyReachX = ((CUSTOM_DEVICE_IMAGE_WIDTH - CUSTOM_DEVICE_IMAGE_INNER_WIDTH) / 2) * CUSTOM_DEVICE_TERMINAL_BODY_REACH_RATIO;
  const bodyReachY = ((CUSTOM_DEVICE_IMAGE_HEIGHT - CUSTOM_DEVICE_IMAGE_INNER_HEIGHT) / 2) * CUSTOM_DEVICE_TERMINAL_BODY_REACH_RATIO;
  const outerX = horizontalSide
    ? boundary.x < 0 ? 0 : CUSTOM_DEVICE_IMAGE_WIDTH
    : innerX;
  const outerY = horizontalSide
    ? innerY
    : boundary.y < 0 ? 0 : CUSTOM_DEVICE_IMAGE_HEIGHT;
  const targetX = horizontalSide
    ? innerX - Math.sign(boundary.x || 1) * bodyReachX
    : innerX;
  const targetY = horizontalSide
    ? innerY
    : innerY - Math.sign(boundary.y || 1) * bodyReachY;
  return { outerX, outerY, innerX: targetX, innerY: targetY };
}

function customDeviceTerminalConnectorLineMarkup(type: TerminalType, anchor: Point) {
  const { outerX, outerY, innerX, innerY } = customDeviceTerminalConnectorGeometry(anchor);
  const color = terminalColor(type);
  return `<line x1="${formatSvgNumber(outerX)}" y1="${formatSvgNumber(outerY)}" x2="${formatSvgNumber(innerX)}" y2="${formatSvgNumber(innerY)}" style="stroke:${escapeXml(color)} !important;stroke-width:2 !important;stroke-linecap:round !important;vector-effect:non-scaling-stroke !important" fill="none" pointer-events="none"/>`;
}

function customDevicePersistedTerminalMarkup(terminalTypes: readonly TerminalType[], terminalAnchors: readonly Point[]) {
  const terminals = terminalTypes
    .map((type, index) => terminalAnchors[index]
      ? customDeviceTerminalConnectorLineMarkup(type, terminalAnchors[index])
      : "")
    .filter(Boolean)
    .join("");
  return terminals ? `<g ${CUSTOM_DEVICE_PERSISTED_TERMINAL_GROUP_ATTR} pointer-events="none">${terminals}</g>` : "";
}

function svgDataUrlFromSource(source: string) {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(source)}`;
}

export function customDeviceImageWithTerminalConnectors(
  image: string,
  terminalTypes: readonly TerminalType[],
  terminalAnchors: readonly Point[]
) {
  const href = String(image ?? "").trim();
  const persistedTerminals = customDevicePersistedTerminalMarkup(terminalTypes, terminalAnchors);
  if (!href || !persistedTerminals) {
    return href;
  }
  const source = decodeSvgImageSource(href);
  if (source) {
    const cleanSource = source.replace(CUSTOM_DEVICE_PERSISTED_TERMINAL_GROUP_PATTERN, "");
    if (/<\/svg\s*>/iu.test(cleanSource)) {
      return svgDataUrlFromSource(cleanSource.replace(/<\/svg\s*>/iu, `${persistedTerminals}</svg>`));
    }
  }
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${CUSTOM_DEVICE_IMAGE_WIDTH}" height="${CUSTOM_DEVICE_IMAGE_HEIGHT}" viewBox="0 0 ${CUSTOM_DEVICE_IMAGE_WIDTH} ${CUSTOM_DEVICE_IMAGE_HEIGHT}">` +
    `<image href="${escapeXml(href)}" x="0" y="0" width="${CUSTOM_DEVICE_IMAGE_WIDTH}" height="${CUSTOM_DEVICE_IMAGE_HEIGHT}" preserveAspectRatio="xMidYMid meet"/>` +
    `${persistedTerminals}</svg>`;
  return svgDataUrlFromSource(svg);
}

export const customDeviceGeneratedDefaultImageCandidates = (
  componentLabel: string,
  componentLibrary: string,
  terminalTypes: TerminalType[]
) => {
  const safeTerminalTypes = terminalTypes.length > 0 ? terminalTypes : (["ac"] as TerminalType[]);
  const labels = Array.from(new Set([componentLabel, componentLibrary, "Unit"].map((label) => label.trim()).filter(Boolean)));
  return new Set(labels.map((label) => generateCustomDeviceImage(label, safeTerminalTypes)));
};

export const syncInheritedCustomDeviceStateVisuals = (
  states: DeviceStateDefinition[],
  defaultVisual: { backgroundImage: string; backgroundImageAssetId: string; backgroundImageFit?: string },
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
      backgroundImage: defaultVisual.backgroundImage,
      ...(defaultVisual.backgroundImageFit ? {
        imageFit: defaultVisual.backgroundImageFit,
        backgroundImageFit: defaultVisual.backgroundImageFit
      } : {})
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
