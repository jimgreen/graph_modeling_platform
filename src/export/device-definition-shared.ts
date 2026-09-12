import { cloneDeviceMeasurementDefinitions } from "../measurementDefinitionTypes.ts";
import type { DeviceTemplate, DeviceTemplateDefinitionOverride } from "../model.ts";
import {
  DEVICE_DEFINITION_VISUAL_PARAM_KEYS,
  DEVICE_VISUAL_PARAM_PREFIXES
} from "../deviceVisualParams.ts";
import {
  DEVICE_LIBRARY,
  applyDeviceTemplateDefinitionOverride,
  baseDeviceKind,
  inferESection,
  resolveEffectiveTemplateParameterDefinitions,
  templateDerivedComponentLibraryInfo as modelTemplateDerivedComponentLibraryInfo
} from "../model.ts";

// 单源定义：appExtracted/appPersistenceLibraryExport.tsx 改为 re-export 此处（原两处各一份实现）
export function normalizeCategoryLibraryName(categoryLibraryName: string): string {
  if (categoryLibraryName === "交流系统") {
    return "交流设备";
  }
  if (categoryLibraryName === "直流系统") {
    return "直流设备";
  }
  if (categoryLibraryName === "变流设备") {
    return "直流设备";
  }
  return categoryLibraryName;
}

export function normalizeComponentLibraryName(name: string): string {
  return name.trim();
}

export function fallbackComponentLibraryForCategoryLibrary(categoryLibraryName: string) {
  const normalized = normalizeCategoryLibraryName(categoryLibraryName);
  if (normalized.includes("静态")) return "StaticBasicShape";
  if (normalized.includes("直流")) return "DCLoad";
  if (normalized.includes("变流")) return "DCDCConverter";
  if (normalized.includes("氢")) return "HydroLoad";
  if (normalized.includes("热")) return "HeatLoad";
  return "ACLoad";
}

export const BUILT_IN_DEVICE_TEMPLATE_BY_KIND = new Map(
  DEVICE_LIBRARY.map((template) => [template.kind, template] as const)
);

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

export function deviceDefinitionKeyForTemplate(template: DeviceTemplate) {
  return normalizeComponentLibraryName(resolveTemplateComponentLibrary(template)) || template.kind;
}

export function componentClassForConcreteTemplate(template: DeviceTemplate) {
  const explicitClass = normalizeComponentLibraryName(template.componentClass ?? "");
  if (explicitClass) return explicitClass;
  const derivedInfo = modelTemplateDerivedComponentLibraryInfo(template);
  return normalizeComponentLibraryName(
    derivedInfo?.derivedComponentLibrary || resolveTemplateComponentLibrary(template)
  );
}

export const SHARED_DEFINITION_METADATA_PARAM_NAMES = new Set([
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

export function deviceDefinitionSharedIdentityForTemplate(template: DeviceTemplate) {
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

export function overrideTimestamp(override: DeviceTemplateDefinitionOverride | undefined) {
  const timestamp = Date.parse(String(override?.updatedAt ?? ""));
  return Number.isFinite(timestamp) ? timestamp : 0;
}

export function preferredDefinitionSource(
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

export function latestDefinitionSource(
  ...sources: Array<DeviceTemplateDefinitionOverride | undefined>
) {
  return sources
    .filter((source): source is DeviceTemplateDefinitionOverride => Boolean(source))
    .sort((left, right) => overrideTimestamp(right) - overrideTimestamp(left))[0];
}

export function sharedDefinitionParams(override: DeviceTemplateDefinitionOverride | undefined) {
  if (!override?.params) return {};
  return Object.fromEntries(Object.entries(override.params).filter(([key]) => (
    !isConcreteDeviceDefinitionParamName(key) || SHARED_DEFINITION_METADATA_PARAM_NAMES.has(key)
  )));
}

/** 判定「视觉覆盖」时不算内容的元数据键：单独存在不足以保留该覆盖 */
const VISUAL_OVERRIDE_META_KEYS = new Set([
  "kind",
  "updatedAt",
  "params",
  "isDerivedComponentLibrary",
  "derivedFromComponentLibrary",
  "derivedComponentLibraryLabel"
]);

export function visualOnlyOverride(
  override: DeviceTemplateDefinitionOverride | undefined
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
  // peer 覆盖裁剪：只保留纯视觉内容，无视觉内容则整条删除（两处 peer 清理共用同一判定）
  const prunePeerToVisualOnly = (peerKey: string) => {
    const visual = visualOnlyOverride(next[peerKey]);
    if (!visual) {
      delete next[peerKey];
      return;
    }
    const hasVisualContent =
      Object.keys(visual).some((name) => !VISUAL_OVERRIDE_META_KEYS.has(name))
      || Object.keys(visual.params ?? {}).length > 0;
    if (hasVisualContent) {
      next[peerKey] = visual;
    } else {
      delete next[peerKey];
    }
  };
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
        prunePeerToVisualOnly(peer.kind);
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
    for (const peer of peers) {
      if (peer.kind === sharedKey) continue;
      prunePeerToVisualOnly(peer.kind);
    }
    if (sharedIdentity !== sharedKey && !peers.some((peer) => peer.kind === sharedIdentity)) {
      delete next[sharedIdentity];
    }
  }
  return next;
}

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

/** 同 sharedKey 的 peer kind 分组：一次 O(N) 建表，替代逐模板全量 filter 的 O(N²)（169 模板实测约 90ms） */
export function groupPeerKindsBySharedKey(templates: readonly DeviceTemplate[]): Map<string, string[]> {
  const grouped = new Map<string, string[]>();
  for (const candidate of templates) {
    const key = deviceDefinitionSharedKeyForTemplate(candidate);
    const peers = grouped.get(key);
    if (peers) {
      peers.push(candidate.kind);
    } else {
      grouped.set(key, [candidate.kind]);
    }
  }
  return grouped;
}

function sharedDefinitionSourceForTemplate(
  template: DeviceTemplate,
  overrides: Record<string, DeviceTemplateDefinitionOverride>,
  templates: readonly DeviceTemplate[] = DEVICE_LIBRARY,
  peerKindsBySharedKey?: Map<string, readonly string[]>
) {
  const sharedKey = deviceDefinitionSharedKeyForTemplate(template);
  const legacySharedKey = deviceDefinitionSharedIdentityForTemplate(template);
  const derived = Boolean(modelTemplateDerivedComponentLibraryInfo(template));
  // 查表与 filter 的候选顺序一致（均按 templates 顺序 push）；未传表时保持原有的独立调用语义
  const peerKinds = peerKindsBySharedKey
    ? peerKindsBySharedKey.get(sharedKey) ?? []
    : templates
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
  templates: readonly DeviceTemplate[] = DEVICE_LIBRARY,
  peerKindsBySharedKey?: Map<string, readonly string[]>
) {
  const sharedKey = deviceDefinitionSharedKeyForTemplate(template);
  const { parameterSource, measurementSource } = sharedDefinitionSourceForTemplate(template, overrides, templates, peerKindsBySharedKey);
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
  const visualOverride = visualOnlyOverride(exactOverride);
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

/** 库模板装配：内置库 + 自定义库（未套定义覆盖）。前端 `__appScope.baseLibraryTemplates` 消费点仍需要该名字。 */
export function buildBaseLibraryTemplates(customDeviceTemplates: readonly DeviceTemplate[]): DeviceTemplate[] {
  return [...DEVICE_LIBRARY, ...customDeviceTemplates];
}

/**
 * 库模板装配单一入口：内置库 + 自定义库，再逐个套用元件定义覆盖。
 * 逐字等价于前端 appStateBatch.tsx 原有的 baseLibraryTemplates + libraryTemplates 两行 useMemo
 * （同一个数组同时作为覆盖查询的 templates 参数与 map 的输入）。
 */
export function buildEffectiveLibraryTemplates(
  customDeviceTemplates: readonly DeviceTemplate[],
  deviceDefinitionOverrides: Record<string, DeviceTemplateDefinitionOverride>
): DeviceTemplate[] {
  const baseLibraryTemplates = buildBaseLibraryTemplates(customDeviceTemplates);
  // peer 分组建一次表给全部模板复用（不缓存到模块级：库态随 /device-library 写入变化，多端并发会读到陈旧库态）
  const peerKindsBySharedKey = groupPeerKindsBySharedKey(baseLibraryTemplates);
  return baseLibraryTemplates.map((template) => applyDeviceTemplateDefinitionOverride(
    template,
    deviceDefinitionOverrideForTemplate(template, deviceDefinitionOverrides, baseLibraryTemplates, peerKindsBySharedKey)
  ));
}
