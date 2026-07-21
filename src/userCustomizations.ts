import type {
  DeviceLibraryPersistencePayload,
  ImageAsset,
  ImageFolder
} from "./appExtracted/appCoreCanvasUtilities";
import { reconcileNodeWithDefinition } from "./definitionInstanceSync";
import {
  CUSTOM_PARAM_DEFINITIONS_KEY,
  DEFAULT_COLOR_PALETTE,
  normalizeColorPalette,
  type ColorDisplayMode,
  type ColorPalette,
  type DeviceParameterDefinition,
  type DeviceTemplate,
  type DeviceTemplateDefinitionOverride,
  type ModelNode
} from "./model";
import {
  DEFAULT_MEASUREMENT_CONFIG,
  normalizeMeasurementConfig,
  type PlatformMeasurementConfig
} from "./measurements";

export type UserCustomizationDomain =
  | "category-libraries"
  | "component-libraries"
  | "custom-devices"
  | "device-definition-overrides"
  | "parameter-definitions"
  | "measurement-definitions"
  | "e-interface-definitions"
  | "graph-templates"
  | "user-assets"
  | "color-settings";

export type UserCustomizationChangeType = "added" | "modified" | "protected";
export type UserCustomizationImportMode = "replace" | "incremental";

export type UserCustomizationAsset = ImageAsset & { dataUrl?: string };

export type UserCustomizationSnapshot = {
  deviceLibrary: DeviceLibraryPersistencePayload;
  measurementConfig: PlatformMeasurementConfig;
  colorConfig: {
    colorDisplayMode: ColorDisplayMode;
    colorPalette: ColorPalette;
  };
  imageLibrary: {
    folders: ImageFolder[];
    assets: UserCustomizationAsset[];
  };
};

export type UserCustomizationItem = {
  key: string;
  domain: UserCustomizationDomain;
  itemId: string;
  name: string;
  owner: string;
  changeType: UserCustomizationChangeType;
  summary: string;
  protected?: boolean;
};

export type UserCustomizationInventory = {
  items: UserCustomizationItem[];
  countsByDomain: Record<UserCustomizationDomain, number>;
  summary: {
    total: number;
    added: number;
    modified: number;
    assets: number;
  };
};

export type UserCustomizationImportConflict = {
  domain: UserCustomizationDomain;
  importedId: string;
  localId: string;
  name: string;
};

export type UserCustomizationImportPreview = {
  mode: UserCustomizationImportMode;
  target: UserCustomizationSnapshot;
  additions: number;
  updates: number;
  unchanged: number;
  conflicts: UserCustomizationImportConflict[];
};

const USER_CUSTOMIZATION_DOMAINS: UserCustomizationDomain[] = [
  "category-libraries",
  "component-libraries",
  "custom-devices",
  "device-definition-overrides",
  "parameter-definitions",
  "measurement-definitions",
  "e-interface-definitions",
  "graph-templates",
  "user-assets",
  "color-settings"
];

const cloneValue = <T,>(value: T): T => {
  if (typeof structuredClone === "function") {
    return structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value)) as T;
};

const normalizedText = (value: unknown) => String(value ?? "").trim();
const normalizedNameKey = (value: unknown) => normalizedText(value).toLocaleLowerCase();

const canonicalValue = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(canonicalValue);
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, item]) => [key, canonicalValue(item)])
    );
  }
  return value;
};

const canonicalJson = (value: unknown) => JSON.stringify(canonicalValue(value));
const canonicalEqual = (left: unknown, right: unknown) => canonicalJson(left) === canonicalJson(right);

const uniqueStrings = (value: unknown): string[] => {
  const seen = new Set<string>();
  return (Array.isArray(value) ? value : []).flatMap((item) => {
    const text = normalizedText(item);
    const key = normalizedNameKey(text);
    if (!text || seen.has(key)) {
      return [];
    }
    seen.add(key);
    return [text];
  });
};

export function emptyUserDeviceLibrary(): DeviceLibraryPersistencePayload {
  return {
    customDeviceTemplates: [],
    customCategoryLibraries: [],
    customComponentLibraries: [],
    deviceDefinitionOverrides: {},
    eDeviceDefinitionLabels: {},
    eDeviceDefinitionClassExportEnabled: {},
    customGraphTemplateTypes: [],
    customGraphTemplates: []
  };
}

export function userCustomizationAssetIsBuiltIn(
  asset: Pick<ImageAsset, "id" | "folderId" | "createdAt">
): boolean {
  return (
    asset.createdAt === "builtin" ||
    normalizedText(asset.folderId) === "builtin-shared-icons" ||
    normalizedText(asset.id).startsWith("builtin-shared-icon-")
  );
}

const normalizeDeviceLibrarySnapshot = (
  value: Partial<DeviceLibraryPersistencePayload> | undefined
): DeviceLibraryPersistencePayload => {
  const source = value ?? {};
  const seenComponentLibraries = new Set<string>();
  const customComponentLibraries = (Array.isArray(source.customComponentLibraries)
    ? source.customComponentLibraries
    : []).flatMap((item) => {
      const name = normalizedText(item?.name);
      const categoryLibraryName = normalizedText(item?.categoryLibraryName);
      const key = `${normalizedNameKey(categoryLibraryName)}::${normalizedNameKey(name)}`;
      if (!name || !categoryLibraryName || seenComponentLibraries.has(key)) {
        return [];
      }
      seenComponentLibraries.add(key);
      return [{ ...cloneValue(item), name, categoryLibraryName }];
    });
  const customDeviceTemplates = (Array.isArray(source.customDeviceTemplates)
    ? source.customDeviceTemplates
    : []).reduce<DeviceTemplate[]>((result, item) => {
      const kind = normalizedText(item?.kind);
      if (!kind) {
        return result;
      }
      const existingIndex = result.findIndex((candidate) => candidate.kind === kind);
      const normalized = { ...cloneValue(item), kind } as DeviceTemplate;
      if (existingIndex >= 0) {
        result[existingIndex] = normalized;
      } else {
        result.push(normalized);
      }
      return result;
    }, []);
  const deviceDefinitionOverrides = Object.fromEntries(
    Object.entries(source.deviceDefinitionOverrides ?? {}).flatMap(([key, item]) => {
      const kind = normalizedText(item?.kind || key);
      return kind ? [[kind, { ...cloneValue(item), kind }]] : [];
    })
  );
  return {
    customDeviceTemplates,
    customCategoryLibraries: uniqueStrings(source.customCategoryLibraries),
    customComponentLibraries,
    deviceDefinitionOverrides,
    eDeviceDefinitionLabels: Object.fromEntries(
      Object.entries(source.eDeviceDefinitionLabels ?? {})
        .map(([key, label]) => [normalizedText(key), normalizedText(label)] as const)
        .filter(([key, label]) => Boolean(key && label))
    ),
    eDeviceDefinitionClassExportEnabled: Object.fromEntries(
      Object.entries(source.eDeviceDefinitionClassExportEnabled ?? {})
        .map(([key, enabled]) => [normalizedText(key), Boolean(enabled)] as const)
        .filter(([key]) => Boolean(key))
    ),
    customGraphTemplateTypes: uniqueStrings(source.customGraphTemplateTypes),
    customGraphTemplates: (Array.isArray(source.customGraphTemplates) ? source.customGraphTemplates : [])
      .reduce<DeviceLibraryPersistencePayload["customGraphTemplates"]>((result, item) => {
        const id = normalizedText(item?.id);
        if (!id) {
          return result;
        }
        const existingIndex = result.findIndex((candidate) => candidate.id === id);
        const normalized = { ...cloneValue(item), id };
        if (existingIndex >= 0) {
          result[existingIndex] = normalized;
        } else {
          result.push(normalized);
        }
        return result;
      }, [])
  };
};

const normalizeUserImageLibrary = (
  value: Partial<UserCustomizationSnapshot["imageLibrary"]> | undefined
): UserCustomizationSnapshot["imageLibrary"] => {
  const folders = (Array.isArray(value?.folders) ? value?.folders : [])
    .filter((folder) => normalizedText(folder?.id) !== "builtin-shared-icons")
    .reduce<ImageFolder[]>((result, folder) => {
      const id = normalizedText(folder?.id) || "root";
      if (!result.some((candidate) => candidate.id === id)) {
        result.push({ ...cloneValue(folder), id, name: normalizedText(folder?.name) || (id === "root" ? "默认文件夹" : id) });
      }
      return result;
    }, []);
  if (!folders.some((folder) => folder.id === "root")) {
    folders.unshift({ id: "root", name: "默认文件夹" });
  }
  const folderIds = new Set(folders.map((folder) => folder.id));
  const assets = (Array.isArray(value?.assets) ? value?.assets : [])
    .filter((asset) => normalizedText(asset?.id) && !userCustomizationAssetIsBuiltIn(asset))
    .reduce<UserCustomizationAsset[]>((result, asset) => {
      const id = normalizedText(asset.id);
      const normalized = {
        ...cloneValue(asset),
        id,
        name: normalizedText(asset.name || asset.filename || id),
        folderId: folderIds.has(normalizedText(asset.folderId)) ? normalizedText(asset.folderId) : "root",
        url: normalizedText(asset.url) || `/webgrp/images/${encodeURIComponent(id)}`
      };
      const existingIndex = result.findIndex((candidate) => candidate.id === id);
      if (existingIndex >= 0) {
        result[existingIndex] = normalized;
      } else {
        result.push(normalized);
      }
      return result;
    }, []);
  return { folders, assets };
};

export function normalizeUserCustomizationSnapshot(
  value: Partial<UserCustomizationSnapshot> | undefined
): UserCustomizationSnapshot {
  const source = value ?? {};
  return {
    deviceLibrary: normalizeDeviceLibrarySnapshot(source.deviceLibrary),
    measurementConfig: normalizeMeasurementConfig(source.measurementConfig ?? DEFAULT_MEASUREMENT_CONFIG),
    colorConfig: {
      colorDisplayMode: source.colorConfig?.colorDisplayMode === "voltage" ? "voltage" : "energy",
      colorPalette: normalizeColorPalette(source.colorConfig?.colorPalette ?? DEFAULT_COLOR_PALETTE)
    },
    imageLibrary: normalizeUserImageLibrary(source.imageLibrary)
  };
}

const customizationItemKey = (domain: UserCustomizationDomain, itemId: string) =>
  `${domain}:${encodeURIComponent(itemId)}`;

const parseCustomizationItemKey = (key: string) => {
  const separatorIndex = key.indexOf(":");
  if (separatorIndex < 0) {
    return null;
  }
  const domain = key.slice(0, separatorIndex) as UserCustomizationDomain;
  if (!USER_CUSTOMIZATION_DOMAINS.includes(domain)) {
    return null;
  }
  try {
    return { domain, itemId: decodeURIComponent(key.slice(separatorIndex + 1)) };
  } catch {
    return null;
  }
};

const parameterDefinitionsFromParams = (params: Record<string, string> | undefined) => {
  const raw = params?.[CUSTOM_PARAM_DEFINITIONS_KEY];
  if (!raw) {
    return [] as DeviceParameterDefinition[];
  }
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed as DeviceParameterDefinition[] : [];
  } catch {
    return [] as DeviceParameterDefinition[];
  }
};

const templateParameterDefinitions = (template: Pick<DeviceTemplate, "parameterDefinitions" | "params">) =>
  Array.isArray(template.parameterDefinitions) && template.parameterDefinitions.length > 0
    ? template.parameterDefinitions
    : parameterDefinitionsFromParams(template.params);

const overrideParameterDefinitions = (override: DeviceTemplateDefinitionOverride) =>
  Array.isArray(override.parameterDefinitions) && override.parameterDefinitions.length > 0
    ? override.parameterDefinitions
    : parameterDefinitionsFromParams(override.params);

const definitionsHaveExportMetadata = (definitions: readonly DeviceParameterDefinition[]) =>
  definitions.some((definition) => (
    typeof definition.exportEnabled === "boolean" || Boolean(normalizedText(definition.exportName))
  ));

const overrideHasNonParameterChanges = (override: DeviceTemplateDefinitionOverride) => {
  const keys = Object.keys(override).filter((key) => ![
    "kind",
    "updatedAt",
    "parameterDefinitions"
  ].includes(key));
  return keys.some((key) => {
    if (key !== "params") {
      return true;
    }
    return Object.keys(override.params ?? {}).some((paramKey) => paramKey !== CUSTOM_PARAM_DEFINITIONS_KEY);
  });
};

const emptyDomainCounts = (): Record<UserCustomizationDomain, number> => Object.fromEntries(
  USER_CUSTOMIZATION_DOMAINS.map((domain) => [domain, 0])
) as Record<UserCustomizationDomain, number>;

export function buildUserCustomizationInventory(
  value: Partial<UserCustomizationSnapshot>,
  builtInTemplates: readonly DeviceTemplate[],
  protectedAssetIds: ReadonlySet<string> = new Set<string>()
): UserCustomizationInventory {
  const snapshot = normalizeUserCustomizationSnapshot(value);
  const builtInByKind = new Map(builtInTemplates.map((template) => [template.kind, template]));
  const customByKind = new Map(snapshot.deviceLibrary.customDeviceTemplates.map((template) => [template.kind, template]));
  const items: UserCustomizationItem[] = [];
  const pushItem = (
    domain: UserCustomizationDomain,
    itemId: string,
    name: string,
    owner: string,
    changeType: UserCustomizationChangeType,
    summary: string,
    protectedItem = false
  ) => {
    items.push({
      key: customizationItemKey(domain, itemId),
      domain,
      itemId,
      name,
      owner,
      changeType,
      summary,
      ...(protectedItem ? { protected: true } : {})
    });
  };

  snapshot.deviceLibrary.customCategoryLibraries.forEach((name) => {
    pushItem("category-libraries", name, name, "类别库", "added", "新增类别库");
  });
  snapshot.deviceLibrary.customComponentLibraries.forEach((definition) => {
    const itemId = `${definition.categoryLibraryName}::${definition.name}`;
    pushItem("component-libraries", itemId, definition.name, definition.categoryLibraryName, "added", "新增元件库");
  });
  snapshot.deviceLibrary.customDeviceTemplates.forEach((template) => {
    pushItem("custom-devices", template.kind, template.label || template.kind, template.categoryLibrary || "未分类", "added", "新增自定义元件");
    const definitions = templateParameterDefinitions(template);
    if (definitions.length > 0) {
      pushItem("parameter-definitions", template.kind, template.label || template.kind, "自定义元件", "added", `${definitions.length} 项参数定义`);
    }
  });
  Object.entries(snapshot.deviceLibrary.deviceDefinitionOverrides).forEach(([kind, override]) => {
    const template = customByKind.get(kind) ?? builtInByKind.get(kind);
    const label = template?.label || kind;
    const definitions = overrideParameterDefinitions(override);
    if (overrideHasNonParameterChanges(override)) {
      const changedFields = Object.keys(override).filter((key) => !["kind", "updatedAt", "parameterDefinitions"].includes(key));
      pushItem("device-definition-overrides", kind, label, template?.categoryLibrary || "内置元件", "modified", `${changedFields.length} 组图形或端子设置`);
    }
    if (definitions.length > 0) {
      pushItem("parameter-definitions", kind, label, template?.categoryLibrary || "元件定义", builtInByKind.has(kind) ? "modified" : "added", `${definitions.length} 项参数定义`);
    }
  });

  const eKinds = new Set<string>([
    ...Object.keys(snapshot.deviceLibrary.eDeviceDefinitionLabels ?? {}),
    ...Object.keys(snapshot.deviceLibrary.eDeviceDefinitionClassExportEnabled ?? {})
  ]);
  snapshot.deviceLibrary.customDeviceTemplates.forEach((template) => {
    if (definitionsHaveExportMetadata(templateParameterDefinitions(template))) {
      eKinds.add(template.kind);
    }
  });
  Object.entries(snapshot.deviceLibrary.deviceDefinitionOverrides).forEach(([kind, override]) => {
    if (definitionsHaveExportMetadata(overrideParameterDefinitions(override))) {
      eKinds.add(kind);
    }
  });
  eKinds.forEach((kind) => {
    const template = customByKind.get(kind) ?? builtInByKind.get(kind);
    pushItem("e-interface-definitions", kind, template?.label || kind, "E 文件接口", "modified", "类或参数导出设置已修改");
  });

  snapshot.deviceLibrary.customGraphTemplateTypes.forEach((typeName) => {
    pushItem("graph-templates", `type:${typeName}`, typeName, "模板分类", "added", "新增模板分类");
  });
  snapshot.deviceLibrary.customGraphTemplates.forEach((template) => {
    pushItem("graph-templates", `template:${template.id}`, template.name || template.id, template.typeName || "未分类", "added", "新增自定义模板");
  });

  const defaultTypeById = new Map(DEFAULT_MEASUREMENT_CONFIG.measurementTypes.map((type) => [type.id, type]));
  const currentTypeById = new Map(snapshot.measurementConfig.measurementTypes.map((type) => [type.id, type]));
  new Set([...defaultTypeById.keys(), ...currentTypeById.keys()]).forEach((id) => {
    const current = currentTypeById.get(id);
    const fallback = defaultTypeById.get(id);
    if (!canonicalEqual(current, fallback)) {
      pushItem(
        "measurement-definitions",
        `type:${id}`,
        current?.name || fallback?.name || id,
        "量测类型",
        fallback ? "modified" : "added",
        current ? "量测类型设置已修改" : "内置量测类型已删除"
      );
    }
  });
  const defaultProfileByKind = new Map(DEFAULT_MEASUREMENT_CONFIG.deviceProfiles.map((profile) => [profile.deviceKind, profile]));
  const currentProfileByKind = new Map(snapshot.measurementConfig.deviceProfiles.map((profile) => [profile.deviceKind, profile]));
  new Set([...defaultProfileByKind.keys(), ...currentProfileByKind.keys()]).forEach((kind) => {
    const current = currentProfileByKind.get(kind);
    const fallback = defaultProfileByKind.get(kind);
    if (!canonicalEqual(current, fallback)) {
      const template = customByKind.get(kind) ?? builtInByKind.get(kind);
      pushItem(
        "measurement-definitions",
        `profile:${kind}`,
        template?.label || kind,
        "设备量测配置",
        fallback ? "modified" : "added",
        current ? `${current.items.length} 项量测关联` : "内置量测关联已删除"
      );
    }
  });
  if (!canonicalEqual(snapshot.measurementConfig.groupDefaults, DEFAULT_MEASUREMENT_CONFIG.groupDefaults)) {
    pushItem("measurement-definitions", "group-defaults", "新增量测框默认样式", "量测全局设置", "modified", "背景、边框或字体默认值已修改");
  }

  snapshot.imageLibrary.assets.forEach((asset) => {
    const protectedAsset = protectedAssetIds.has(asset.id);
    const folder = snapshot.imageLibrary.folders.find((item) => item.id === asset.folderId);
    pushItem(
      "user-assets",
      asset.id,
      asset.name || asset.id,
      folder?.name || "默认文件夹",
      protectedAsset ? "protected" : "added",
      protectedAsset ? "被现有模型引用，恢复时保留" : "用户上传的图片或图标",
      protectedAsset
    );
  });

  if (
    snapshot.colorConfig.colorDisplayMode !== "energy" ||
    !canonicalEqual(snapshot.colorConfig.colorPalette, DEFAULT_COLOR_PALETTE)
  ) {
    pushItem("color-settings", "palette", "配色设置", "全局显示", "modified", "能源或电压等级配色已修改");
  }

  const countsByDomain = emptyDomainCounts();
  items.forEach((item) => {
    countsByDomain[item.domain] += 1;
  });
  return {
    items,
    countsByDomain,
    summary: {
      total: items.length,
      added: items.filter((item) => item.changeType === "added").length,
      modified: items.filter((item) => item.changeType === "modified").length,
      assets: countsByDomain["user-assets"]
    }
  };
}

type MergeConflictCollector = (conflict: UserCustomizationImportConflict) => void;

const mergeRecords = <T,>(options: {
  current: readonly T[];
  imported: readonly T[];
  id: (item: T) => string;
  name?: (item: T) => string;
  domain: UserCustomizationDomain;
  onConflict?: MergeConflictCollector;
}) => {
  const result = options.current.map(cloneValue);
  for (const importedItem of options.imported) {
    const importedId = options.id(importedItem);
    if (!importedId) {
      continue;
    }
    const importedName = normalizedNameKey(options.name?.(importedItem));
    if (importedName) {
      for (let index = result.length - 1; index >= 0; index -= 1) {
        const localId = options.id(result[index]);
        if (localId !== importedId && normalizedNameKey(options.name?.(result[index])) === importedName) {
          options.onConflict?.({
            domain: options.domain,
            importedId,
            localId,
            name: normalizedText(options.name?.(importedItem))
          });
          result.splice(index, 1);
        }
      }
    }
    const existingIndex = result.findIndex((item) => options.id(item) === importedId);
    if (existingIndex >= 0) {
      result[existingIndex] = cloneValue(importedItem);
    } else {
      result.push(cloneValue(importedItem));
    }
  }
  return result;
};

const mergeDeviceLibraries = (
  current: DeviceLibraryPersistencePayload,
  imported: DeviceLibraryPersistencePayload,
  onConflict?: MergeConflictCollector
): DeviceLibraryPersistencePayload => ({
  customDeviceTemplates: mergeRecords({
    current: current.customDeviceTemplates,
    imported: imported.customDeviceTemplates,
    id: (item) => item.kind,
    name: (item) => item.label,
    domain: "custom-devices",
    onConflict
  }),
  customCategoryLibraries: uniqueStrings([
    ...current.customCategoryLibraries,
    ...imported.customCategoryLibraries
  ]),
  customComponentLibraries: mergeRecords({
    current: current.customComponentLibraries,
    imported: imported.customComponentLibraries,
    id: (item) => `${item.categoryLibraryName}::${item.name}`,
    name: (item) => item.name,
    domain: "component-libraries",
    onConflict
  }),
  deviceDefinitionOverrides: {
    ...cloneValue(current.deviceDefinitionOverrides),
    ...cloneValue(imported.deviceDefinitionOverrides)
  },
  eDeviceDefinitionLabels: {
    ...cloneValue(current.eDeviceDefinitionLabels ?? {}),
    ...cloneValue(imported.eDeviceDefinitionLabels ?? {})
  },
  eDeviceDefinitionClassExportEnabled: {
    ...cloneValue(current.eDeviceDefinitionClassExportEnabled ?? {}),
    ...cloneValue(imported.eDeviceDefinitionClassExportEnabled ?? {})
  },
  customGraphTemplateTypes: uniqueStrings([
    ...current.customGraphTemplateTypes,
    ...imported.customGraphTemplateTypes
  ]),
  customGraphTemplates: mergeRecords({
    current: current.customGraphTemplates,
    imported: imported.customGraphTemplates,
    id: (item) => item.id,
    name: (item) => `${item.typeName}::${item.name}`,
    domain: "graph-templates",
    onConflict
  })
});

const mergeMeasurementConfigs = (
  current: PlatformMeasurementConfig,
  imported: PlatformMeasurementConfig,
  onConflict?: MergeConflictCollector
) => normalizeMeasurementConfig({
  groupDefaults: cloneValue(imported.groupDefaults),
  measurementTypes: mergeRecords({
    current: current.measurementTypes,
    imported: imported.measurementTypes,
    id: (item) => item.id,
    name: (item) => item.name,
    domain: "measurement-definitions",
    onConflict
  }),
  deviceProfiles: mergeRecords({
    current: current.deviceProfiles,
    imported: imported.deviceProfiles,
    id: (item) => item.deviceKind,
    domain: "measurement-definitions",
    onConflict
  })
});

const mergeImageLibraries = (
  current: UserCustomizationSnapshot["imageLibrary"],
  imported: UserCustomizationSnapshot["imageLibrary"],
  onConflict?: MergeConflictCollector
) => normalizeUserImageLibrary({
  folders: mergeRecords({
    current: current.folders,
    imported: imported.folders,
    id: (item) => item.id,
    name: (item) => item.name,
    domain: "user-assets",
    onConflict
  }),
  assets: mergeRecords({
    current: current.assets,
    imported: imported.assets,
    id: (item) => item.id,
    name: (item) => `${item.folderId}::${item.name}`,
    domain: "user-assets",
    onConflict
  })
});

const hasOwn = (value: object, key: PropertyKey) => Object.prototype.hasOwnProperty.call(value, key);

const mergeSnapshotsInternal = (
  currentValue: UserCustomizationSnapshot,
  importedValue: Partial<UserCustomizationSnapshot>,
  mode: UserCustomizationImportMode,
  onConflict?: MergeConflictCollector
) => {
  const current = normalizeUserCustomizationSnapshot(currentValue);
  if (mode === "replace") {
    return normalizeUserCustomizationSnapshot({
      deviceLibrary: hasOwn(importedValue, "deviceLibrary")
        ? importedValue.deviceLibrary
        : current.deviceLibrary,
      measurementConfig: hasOwn(importedValue, "measurementConfig")
        ? importedValue.measurementConfig
        : current.measurementConfig,
      colorConfig: hasOwn(importedValue, "colorConfig")
        ? importedValue.colorConfig
        : current.colorConfig,
      imageLibrary: hasOwn(importedValue, "imageLibrary")
        ? importedValue.imageLibrary
        : current.imageLibrary
    });
  }
  const imported = normalizeUserCustomizationSnapshot({
    deviceLibrary: importedValue.deviceLibrary ?? emptyUserDeviceLibrary(),
    measurementConfig: importedValue.measurementConfig ?? current.measurementConfig,
    colorConfig: importedValue.colorConfig ?? current.colorConfig,
    imageLibrary: importedValue.imageLibrary ?? { folders: [], assets: [] }
  });
  return normalizeUserCustomizationSnapshot({
    deviceLibrary: hasOwn(importedValue, "deviceLibrary")
      ? mergeDeviceLibraries(current.deviceLibrary, imported.deviceLibrary, onConflict)
      : current.deviceLibrary,
    measurementConfig: hasOwn(importedValue, "measurementConfig")
      ? mergeMeasurementConfigs(current.measurementConfig, imported.measurementConfig, onConflict)
      : current.measurementConfig,
    colorConfig: hasOwn(importedValue, "colorConfig")
      ? imported.colorConfig
      : current.colorConfig,
    imageLibrary: hasOwn(importedValue, "imageLibrary")
      ? mergeImageLibraries(current.imageLibrary, imported.imageLibrary, onConflict)
      : current.imageLibrary
  });
};

export function mergeUserCustomizationSnapshots(
  current: UserCustomizationSnapshot,
  imported: Partial<UserCustomizationSnapshot>,
  mode: UserCustomizationImportMode
): UserCustomizationSnapshot {
  return mergeSnapshotsInternal(current, imported, mode);
}

const snapshotRecordMap = (snapshot: UserCustomizationSnapshot) => {
  const inventory = buildUserCustomizationInventory(snapshot, []);
  const records = new Map<string, string>();
  inventory.items.forEach((item) => records.set(item.key, canonicalJson(item)));
  return records;
};

export function previewUserCustomizationImport(
  current: UserCustomizationSnapshot,
  imported: Partial<UserCustomizationSnapshot>,
  mode: UserCustomizationImportMode
): UserCustomizationImportPreview {
  const conflicts: UserCustomizationImportConflict[] = [];
  const target = mergeSnapshotsInternal(current, imported, mode, (conflict) => conflicts.push(conflict));
  const currentRecords = snapshotRecordMap(normalizeUserCustomizationSnapshot(current));
  const targetRecords = snapshotRecordMap(target);
  let additions = 0;
  let updates = 0;
  let unchanged = 0;
  targetRecords.forEach((value, key) => {
    if (!currentRecords.has(key)) {
      additions += 1;
    } else if (currentRecords.get(key) === value) {
      unchanged += 1;
    } else {
      updates += 1;
    }
  });
  currentRecords.forEach((_value, key) => {
    if (!targetRecords.has(key)) {
      updates += 1;
    }
  });
  return { mode, target, additions, updates, unchanged, conflicts };
}

const stripParameterDefinitions = <T extends DeviceTemplate | DeviceTemplateDefinitionOverride>(value: T): T => {
  const next = cloneValue(value);
  delete next.parameterDefinitions;
  if (next.params && Object.prototype.hasOwnProperty.call(next.params, CUSTOM_PARAM_DEFINITIONS_KEY)) {
    const params = { ...next.params };
    delete params[CUSTOM_PARAM_DEFINITIONS_KEY];
    next.params = params;
  }
  return next;
};

const stripExportMetadata = (definitions: readonly DeviceParameterDefinition[]) => definitions.map((definition) => {
  const next = { ...definition };
  delete next.exportEnabled;
  delete next.exportName;
  return next;
});

const stripDefinitionExportMetadata = <T extends DeviceTemplate | DeviceTemplateDefinitionOverride>(value: T): T => {
  const next = cloneValue(value);
  if (Array.isArray(next.parameterDefinitions)) {
    next.parameterDefinitions = stripExportMetadata(next.parameterDefinitions);
  }
  const paramsDefinitions = parameterDefinitionsFromParams(next.params);
  if (paramsDefinitions.length > 0 && next.params) {
    next.params = {
      ...next.params,
      [CUSTOM_PARAM_DEFINITIONS_KEY]: JSON.stringify(stripExportMetadata(paramsDefinitions))
    };
  }
  return next;
};

const removeCustomDeviceCascade = (snapshot: UserCustomizationSnapshot, kind: string) => {
  snapshot.deviceLibrary.customDeviceTemplates = snapshot.deviceLibrary.customDeviceTemplates.filter((item) => item.kind !== kind);
  delete snapshot.deviceLibrary.deviceDefinitionOverrides[kind];
  delete snapshot.deviceLibrary.eDeviceDefinitionLabels?.[kind];
  delete snapshot.deviceLibrary.eDeviceDefinitionClassExportEnabled?.[kind];
  snapshot.measurementConfig.deviceProfiles = snapshot.measurementConfig.deviceProfiles.filter((profile) => profile.deviceKind !== kind);
};

const restoreMeasurementItem = (snapshot: UserCustomizationSnapshot, itemId: string) => {
  if (itemId === "group-defaults") {
    snapshot.measurementConfig.groupDefaults = cloneValue(DEFAULT_MEASUREMENT_CONFIG.groupDefaults);
    return;
  }
  if (itemId.startsWith("type:")) {
    const id = itemId.slice("type:".length);
    const fallback = DEFAULT_MEASUREMENT_CONFIG.measurementTypes.find((type) => type.id === id);
    snapshot.measurementConfig.measurementTypes = snapshot.measurementConfig.measurementTypes.filter((type) => type.id !== id);
    if (fallback) {
      snapshot.measurementConfig.measurementTypes.push(cloneValue(fallback));
    } else {
      snapshot.measurementConfig.deviceProfiles = snapshot.measurementConfig.deviceProfiles.map((profile) => ({
        ...profile,
        items: profile.items.filter((item) => item.measurementTypeId !== id)
      }));
    }
    return;
  }
  if (itemId.startsWith("profile:")) {
    const kind = itemId.slice("profile:".length);
    const fallback = DEFAULT_MEASUREMENT_CONFIG.deviceProfiles.find((profile) => profile.deviceKind === kind);
    snapshot.measurementConfig.deviceProfiles = snapshot.measurementConfig.deviceProfiles.filter((profile) => profile.deviceKind !== kind);
    if (fallback) {
      snapshot.measurementConfig.deviceProfiles.push(cloneValue(fallback));
    }
  }
};

export function restoreUserCustomizationItems(
  current: UserCustomizationSnapshot,
  itemKeys: readonly string[]
): UserCustomizationSnapshot {
  const snapshot = normalizeUserCustomizationSnapshot(current);
  for (const key of new Set(itemKeys)) {
    const parsed = parseCustomizationItemKey(key);
    if (!parsed) {
      continue;
    }
    const { domain, itemId } = parsed;
    if (domain === "category-libraries") {
      const componentNames = snapshot.deviceLibrary.customComponentLibraries
        .filter((definition) => definition.categoryLibraryName === itemId)
        .map((definition) => definition.name);
      const kinds = snapshot.deviceLibrary.customDeviceTemplates
        .filter((template) => template.categoryLibrary === itemId || componentNames.includes(normalizedText(template.params?.component_type)))
        .map((template) => template.kind);
      kinds.forEach((kind) => removeCustomDeviceCascade(snapshot, kind));
      snapshot.deviceLibrary.customComponentLibraries = snapshot.deviceLibrary.customComponentLibraries.filter((definition) => definition.categoryLibraryName !== itemId);
      snapshot.deviceLibrary.customCategoryLibraries = snapshot.deviceLibrary.customCategoryLibraries.filter((name) => name !== itemId);
    } else if (domain === "component-libraries") {
      const [categoryLibraryName, componentLibraryName] = itemId.split("::");
      const kinds = snapshot.deviceLibrary.customDeviceTemplates
        .filter((template) => (
          template.categoryLibrary === categoryLibraryName &&
          normalizedText(template.params?.component_type) === componentLibraryName
        ))
        .map((template) => template.kind);
      kinds.forEach((kind) => removeCustomDeviceCascade(snapshot, kind));
      snapshot.deviceLibrary.customComponentLibraries = snapshot.deviceLibrary.customComponentLibraries.filter((definition) => (
        definition.categoryLibraryName !== categoryLibraryName || definition.name !== componentLibraryName
      ));
    } else if (domain === "custom-devices") {
      removeCustomDeviceCascade(snapshot, itemId);
    } else if (domain === "device-definition-overrides") {
      delete snapshot.deviceLibrary.deviceDefinitionOverrides[itemId];
    } else if (domain === "parameter-definitions") {
      snapshot.deviceLibrary.customDeviceTemplates = snapshot.deviceLibrary.customDeviceTemplates.map((template) => (
        template.kind === itemId ? stripParameterDefinitions(template) : template
      ));
      const override = snapshot.deviceLibrary.deviceDefinitionOverrides[itemId];
      if (override) {
        snapshot.deviceLibrary.deviceDefinitionOverrides[itemId] = stripParameterDefinitions(override);
      }
    } else if (domain === "measurement-definitions") {
      restoreMeasurementItem(snapshot, itemId);
    } else if (domain === "e-interface-definitions") {
      delete snapshot.deviceLibrary.eDeviceDefinitionLabels?.[itemId];
      delete snapshot.deviceLibrary.eDeviceDefinitionClassExportEnabled?.[itemId];
      snapshot.deviceLibrary.customDeviceTemplates = snapshot.deviceLibrary.customDeviceTemplates.map((template) => (
        template.kind === itemId ? stripDefinitionExportMetadata(template) : template
      ));
      const override = snapshot.deviceLibrary.deviceDefinitionOverrides[itemId];
      if (override) {
        snapshot.deviceLibrary.deviceDefinitionOverrides[itemId] = stripDefinitionExportMetadata(override);
      }
    } else if (domain === "graph-templates") {
      if (itemId.startsWith("type:")) {
        const typeName = itemId.slice("type:".length);
        snapshot.deviceLibrary.customGraphTemplateTypes = snapshot.deviceLibrary.customGraphTemplateTypes.filter((name) => name !== typeName);
        snapshot.deviceLibrary.customGraphTemplates = snapshot.deviceLibrary.customGraphTemplates.filter((template) => template.typeName !== typeName);
      } else if (itemId.startsWith("template:")) {
        const templateId = itemId.slice("template:".length);
        snapshot.deviceLibrary.customGraphTemplates = snapshot.deviceLibrary.customGraphTemplates.filter((template) => template.id !== templateId);
      }
    } else if (domain === "user-assets") {
      snapshot.imageLibrary.assets = snapshot.imageLibrary.assets.filter((asset) => asset.id !== itemId);
    } else if (domain === "color-settings") {
      snapshot.colorConfig = {
        colorDisplayMode: "energy",
        colorPalette: cloneValue(DEFAULT_COLOR_PALETTE)
      };
    }
  }
  return normalizeUserCustomizationSnapshot(snapshot);
}

const ASSET_REFERENCE_KEY = /(?:^|_)(?:background|foreground|image).*asset_?id$/iu;

export function collectReferencedUserAssetIds(value: unknown): Set<string> {
  const result = new Set<string>();
  const visited = new WeakSet<object>();
  const visit = (current: unknown) => {
    if (!current || typeof current !== "object") {
      return;
    }
    if (visited.has(current)) {
      return;
    }
    visited.add(current);
    if (Array.isArray(current)) {
      current.forEach(visit);
      return;
    }
    Object.entries(current as Record<string, unknown>).forEach(([key, item]) => {
      if ((ASSET_REFERENCE_KEY.test(key) || /ImageAssetId$/u.test(key)) && typeof item === "string" && item.trim()) {
        result.add(item.trim());
      } else {
        visit(item);
      }
    });
  };
  visit(value);
  return result;
}

export function reconcileNodesAfterCustomizationChange(
  nodes: readonly ModelNode[],
  previousTemplates: ReadonlyMap<string, DeviceTemplate>,
  nextTemplates: ReadonlyMap<string, DeviceTemplate>
): { nodes: ModelNode[]; changed: boolean } {
  let changed = false;
  const nextNodes = nodes.map((node) => {
    const nextTemplate = nextTemplates.get(node.kind);
    if (!nextTemplate) {
      return node;
    }
    const previousTemplate = previousTemplates.get(node.kind);
    const reconciled = reconcileNodeWithDefinition(node, nextTemplate, previousTemplate?.parameterDefinitions);
    if (reconciled !== node) {
      changed = true;
    }
    return reconciled;
  });
  return { nodes: changed ? nextNodes : [...nodes], changed };
}

export async function runUserCustomizationTransaction(options: {
  before: UserCustomizationSnapshot;
  target: UserCustomizationSnapshot;
  apply: (snapshot: UserCustomizationSnapshot) => Promise<void>;
  rollback: (snapshot: UserCustomizationSnapshot) => Promise<void>;
}): Promise<void> {
  try {
    await options.apply(options.target);
  } catch (error) {
    try {
      await options.rollback(options.before);
    } catch (rollbackError) {
      const message = error instanceof Error ? error.message : "用户自定义操作失败";
      const rollbackMessage = rollbackError instanceof Error ? rollbackError.message : "未知错误";
      throw new Error(`${message}；自动回滚失败：${rollbackMessage}`, { cause: error });
    }
    throw error;
  }
}
