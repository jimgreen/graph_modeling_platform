import { componentLibraryDisplayParts, rootComponentLibraryGroupsForDisplay } from "./appExtracted/appPersistenceLibraryExport";
import { sortByKeyOrder, type LibraryTreeOrderState } from "./libraryTreeOrder";
import type { DeviceTemplate } from "./model";
import {
  normalizeDeviceLibraryCustomization,
  type DeviceLibraryCustomizationConfig
} from "./interfaceCustomization";

export type DeviceLibraryTemplateEntry = {
  kind: string;
  label: string;
  template: DeviceTemplate;
};

export type DeviceLibraryComponentEntry = {
  key: string;
  section: string;
  label: string;
  templates: DeviceLibraryTemplateEntry[];
};

export type DeviceLibraryCategoryEntry = {
  name: string;
  components: DeviceLibraryComponentEntry[];
};

export type DeviceLibraryHierarchy = {
  categories: DeviceLibraryCategoryEntry[];
};

export function deviceLibraryComponentKey(category: string, section: string): string {
  return `${category}::${section}`;
}

export function deviceLibraryTemplateKey(category: string, section: string, kind: string): string {
  return `${deviceLibraryComponentKey(category, section)}::${kind}`;
}

export function buildDeviceLibraryHierarchy(scope: Record<string, any>): DeviceLibraryHierarchy {
  const order: LibraryTreeOrderState = scope.libraryTreeOrder ?? { categoryLibraries: [], componentLibraries: {}, projectSchemes: {}, projectModels: {} };
  const categoryNames: string[] = Array.isArray(scope.displayedCategoryLibraries) ? scope.displayedCategoryLibraries : [];
  const grouped = scope.groupedCategoryLibraryByComponentLibrary ?? {};
  const customComponentLibraries = Array.isArray(scope.customComponentLibraries) ? scope.customComponentLibraries : [];
  const categories = sortByKeyOrder(categoryNames, (name) => name, order.categoryLibraries ?? []).map((category) => {
    const rawGroups = rootComponentLibraryGroupsForDisplay(
      category,
      grouped[category] ?? [],
      customComponentLibraries,
      ""
    ) as any[];
    const components = sortByKeyOrder(rawGroups, (group) => group.section, order.componentLibraries?.[category] ?? []).map((group) => {
      const componentKey = deviceLibraryComponentKey(category, group.section);
      const rawTemplates: any[] = Array.isArray(group.templates) ? group.templates : [];
      const templates = sortByKeyOrder(
        rawTemplates
          .map((template: any) => ({
            kind: String(template.kind ?? ""),
            label: String(template.label ?? template.kind ?? ""),
            template: template as DeviceTemplate
          }))
          .filter((template) => template.kind),
        (template) => template.kind,
        order.deviceTemplates?.[componentKey] ?? []
      );
      const firstTemplate = templates[0]?.template;
      const displayCandidates = [
        firstTemplate?.componentClass,
        firstTemplate?.params?.component_type,
        (firstTemplate?.params as Record<string, unknown> | undefined)?.componentLibrary,
        (firstTemplate?.params as Record<string, unknown> | undefined)?.componentType,
        group.section
      ].map((value) => String(value ?? "").trim()).filter(Boolean);
      const displaySource = displayCandidates.find((value) => !/^\d+$/u.test(value)) ?? group.section;
      const display = componentLibraryDisplayParts(displaySource, customComponentLibraries);
      const readableTemplateLabel = templates
        .map((entry) => String(entry.label ?? "").trim())
        .find((label) => label && !/^\d+$/u.test(label));
      const readableLabel = /^\d+$/u.test(displaySource)
        ? (readableTemplateLabel || display.chinese)
        : display.title;
      return {
        key: componentKey,
        section: group.section,
        label: readableLabel,
        templates
      };
    });
    return { name: category, components };
  });
  return { categories };
}

export function isDeviceLibraryCategoryVisible(config: DeviceLibraryCustomizationConfig, category: string): boolean {
  return config.categories[category] !== false;
}

export function isDeviceLibraryComponentVisible(config: DeviceLibraryCustomizationConfig, key: string): boolean {
  return config.componentLibraries[key] !== false;
}

export function isDeviceLibraryTemplateVisible(config: DeviceLibraryCustomizationConfig, key: string): boolean {
  return config.devices[key] !== false;
}

export function filterDeviceLibraryGroups<
  T extends { section: string; templates: readonly { kind: string }[] }
>(category: string, groups: readonly T[], config: DeviceLibraryCustomizationConfig): T[] {
  if (!isDeviceLibraryCategoryVisible(config, category)) {
    return [];
  }
  return groups
    .filter((group) => isDeviceLibraryComponentVisible(config, deviceLibraryComponentKey(category, group.section)))
    .map((group) => ({
      ...group,
      templates: group.templates.filter((template) =>
        isDeviceLibraryTemplateVisible(config, deviceLibraryTemplateKey(category, group.section, template.kind))
      )
    }))
    .filter((group) => group.templates.length > 0);
}

export function normalizedDeviceLibraryConfig(value: unknown): DeviceLibraryCustomizationConfig {
  return normalizeDeviceLibraryCustomization(value);
}
