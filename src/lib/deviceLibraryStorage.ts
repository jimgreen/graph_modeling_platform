/**
 * 图元库 IndexedDB 数据访问层
 *
 * 提供设备模板、图元模板、设备定义覆盖的 CRUD 操作。
 * 所有操作都是异步的，不会阻塞主线程。
 */

import { initDeviceLibraryDB } from "./deviceLibraryDB";
import type { DeviceTemplate, DeviceTemplateDefinitionOverride } from "../model";
import type { GraphTemplate } from "../appExtracted/appCoreCanvasUtilities";
import { concreteDeviceDefinitionParams } from "../customDeviceUtils";

// ============ 设备模板 ============

type LegacyDeviceTemplate = DeviceTemplate & { attributeLibrary?: string };

function normalizeStoredDefinitionOverride(override: DeviceTemplateDefinitionOverride): DeviceTemplateDefinitionOverride {
  if (!Array.isArray(override.parameterDefinitions)) {
    return override;
  }
  if (override.parameterDefinitions.length > 0) {
    if (override.parameterDefinitionsIntent !== "delete-all") return override;
    const normalized = { ...override };
    delete normalized.parameterDefinitionsIntent;
    return normalized;
  }
  if (override.parameterDefinitionsIntent === "delete-all") {
    return override;
  }
  const normalized = { ...override };
  delete normalized.parameterDefinitions;
  delete normalized.parameterDefinitionsIntent;
  return normalized;
}

function normalizeStoredDeviceTemplate(template: LegacyDeviceTemplate): DeviceTemplate {
  const {
    attributeLibrary,
    parameterDefinitions: _parameterDefinitions,
    parameterDefinitionsIntent: _parameterDefinitionsIntent,
    parameterDefinitionsComplete: _parameterDefinitionsComplete,
    measurementDefinitions: _measurementDefinitions,
    ...rest
  } = template;
  const normalized: DeviceTemplate = {
    ...rest,
    categoryLibrary: template.categoryLibrary ?? attributeLibrary ?? "交流设备",
    params: concreteDeviceDefinitionParams(template.params)
  };
  return normalized;
}

/**
 * 保存设备模板（图片分离存储为 Blob）
 *
 * @param template 设备模板
 * @param imageBlobs 图片 Blob 映射 { backgroundImage: Blob, foregroundImage: Blob }
 */
export async function saveDeviceTemplate(
  template: DeviceTemplate,
  imageBlobs?: Record<string, Blob>
): Promise<void> {
  const db = await initDeviceLibraryDB();
  const tx = db.transaction(["templates", "templateImages"], "readwrite");

  // 保存模板（移除图片 base64）
  const normalizedTemplate = normalizeStoredDeviceTemplate(template as LegacyDeviceTemplate);
  const templateWithoutImages = {
    ...normalizedTemplate,
    params: {
      ...normalizedTemplate.params,
      backgroundImage: normalizedTemplate.params.backgroundImage?.startsWith("data:")
        ? undefined
        : normalizedTemplate.params.backgroundImage,
      foregroundImage: normalizedTemplate.params.foregroundImage?.startsWith("data:")
        ? undefined
        : normalizedTemplate.params.foregroundImage
    },
    updatedAt: Date.now()
  };
  await tx.objectStore("templates").put(templateWithoutImages);

  // 保存图片 Blob
  if (imageBlobs) {
    for (const [key, blob] of Object.entries(imageBlobs)) {
      await tx.objectStore("templateImages").put({
        id: `${template.kind}_${key}`,
        templateKind: template.kind,
        key,
        blob,
        updatedAt: Date.now()
      });
    }
  }

  await tx.done;
}

/**
 * 获取单个设备模板（含图片 URL）
 *
 * @param kind 设备类型
 * @returns 设备模板或 null
 */
export async function getDeviceTemplate(kind: string): Promise<DeviceTemplate | null> {
  const db = await initDeviceLibraryDB();
  const template = await db.get("templates", kind);
  if (!template) return null;
  const normalizedTemplate = normalizeStoredDeviceTemplate(template as LegacyDeviceTemplate);

  // 加载关联图片
  const images = await db.getAllFromIndex("templateImages", "templateKind", kind);
  const imageUrls: Record<string, string> = {};
  for (const img of images) {
    imageUrls[img.key] = URL.createObjectURL(img.blob);
  }

  return {
    ...normalizedTemplate,
    params: {
      ...normalizedTemplate.params,
      ...imageUrls
    }
  };
}

/**
 * 按类别库查询设备模板
 *
 * @param categoryLibrary 类别库名称
 * @returns 设备模板数组
 */
export async function queryTemplatesByCategoryLibrary(
  categoryLibrary: string
): Promise<DeviceTemplate[]> {
  const db = await initDeviceLibraryDB();
  const allTemplates = await db.getAll("templates");
  return allTemplates
    .map((template) => normalizeStoredDeviceTemplate(template as LegacyDeviceTemplate))
    .filter((template) => template.categoryLibrary === categoryLibrary);
}

/**
 * 获取所有自定义设备模板
 *
 * @returns 自定义设备模板数组
 */
export async function getAllCustomTemplates(): Promise<DeviceTemplate[]> {
  const db = await initDeviceLibraryDB();
  const allTemplates = await db.getAll("templates");
  return allTemplates
    .map((template) => normalizeStoredDeviceTemplate(template as LegacyDeviceTemplate))
    .filter(t => t.custom === true);
}

/**
 * 删除设备模板（含关联图片）
 *
 * @param kind 设备类型
 */
export async function deleteDeviceTemplate(kind: string): Promise<void> {
  const db = await initDeviceLibraryDB();
  const tx = db.transaction(["templates", "templateImages"], "readwrite");

  // 删除模板
  await tx.objectStore("templates").delete(kind);

  // 删除关联图片
  const images = await db.getAllFromIndex("templateImages", "templateKind", kind);
  for (const img of images) {
    await tx.objectStore("templateImages").delete(img.id);
  }

  await tx.done;
}

// ============ 图元模板 ============

/**
 * 保存图元模板
 *
 * @param template 图元模板
 */
export async function saveGraphTemplate(template: GraphTemplate): Promise<void> {
  const db = await initDeviceLibraryDB();
  await db.put("graphTemplates", {
    ...template,
    updatedAt: Date.now()
  });
}

/**
 * 获取单个图元模板
 *
 * @param id 图元模板 ID
 * @returns 图元模板或 null
 */
export async function getGraphTemplate(id: string): Promise<GraphTemplate | null> {
  const db = await initDeviceLibraryDB();
  const template = await db.get("graphTemplates", id);
  return template ?? null;
}

/**
 * 按类型查询图元模板
 *
 * @param typeName 类型名称
 * @returns 图元模板数组
 */
export async function queryGraphTemplatesByType(typeName: string): Promise<GraphTemplate[]> {
  const db = await initDeviceLibraryDB();
  const index = db.transaction("graphTemplates").store.index("typeName");
  return index.getAll(typeName);
}

/**
 * 获取所有图元模板
 *
 * @returns 图元模板数组
 */
export async function getAllGraphTemplates(): Promise<GraphTemplate[]> {
  const db = await initDeviceLibraryDB();
  return db.getAll("graphTemplates");
}

/**
 * 删除图元模板
 *
 * @param id 图元模板 ID
 */
export async function deleteGraphTemplate(id: string): Promise<void> {
  const db = await initDeviceLibraryDB();
  await db.delete("graphTemplates", id);
}

// ============ 设备定义覆盖 ============

/**
 * 保存设备定义覆盖
 *
 * @param kind 设备类型
 * @param override 覆盖配置
 */
export async function saveOverride(
  kind: string,
  override: DeviceTemplateDefinitionOverride
): Promise<void> {
  const db = await initDeviceLibraryDB();
  await db.put("overrides", {
    ...override,
    kind,  // 使用参数中的 kind，覆盖 override 中可能存在的 kind
    updatedAt: Date.now()
  });
}

/**
 * 获取单个设备定义覆盖
 *
 * @param kind 设备类型
 * @returns 覆盖配置或 null
 */
export async function getOverride(kind: string): Promise<DeviceTemplateDefinitionOverride | null> {
  const db = await initDeviceLibraryDB();
  const override = await db.get("overrides", kind);
  if (!override) return null;
  const normalized = normalizeStoredDefinitionOverride(override as DeviceTemplateDefinitionOverride);
  if (JSON.stringify(override) !== JSON.stringify(normalized)) {
    await saveOverride(kind, normalized);
  }
  return normalized;
}

/**
 * 获取所有设备定义覆盖
 *
 * @returns 覆盖配置映射 { kind: override }
 */
export async function getAllOverrides(): Promise<Record<string, DeviceTemplateDefinitionOverride>> {
  const db = await initDeviceLibraryDB();
  const overrides = await db.getAll("overrides");
  const stored: Record<string, DeviceTemplateDefinitionOverride> = Object.fromEntries(
    overrides.map(o => [o.kind, o as DeviceTemplateDefinitionOverride])
  );
  const normalized = Object.fromEntries(
    Object.entries(stored).map(([kind, override]) => [kind, normalizeStoredDefinitionOverride(override)])
  );
  if (JSON.stringify(stored) !== JSON.stringify(normalized)) {
    await saveOverrides(normalized);
  }
  return normalized;
}

/**
 * 删除设备定义覆盖
 *
 * @param kind 设备类型
 */
export async function deleteOverride(kind: string): Promise<void> {
  const db = await initDeviceLibraryDB();
  await db.delete("overrides", kind);
}

// ============ 批量操作 ============

/**
 * 批量保存设备模板
 *
 * @param templates 设备模板数组
 */
export async function saveDeviceTemplates(templates: DeviceTemplate[]): Promise<void> {
  const db = await initDeviceLibraryDB();
  const tx = db.transaction("templates", "readwrite");
  const store = tx.objectStore("templates");

  // 模板是完整快照；先清空，避免已删除图元和历史具体图元业务表残留。
  store.clear();
  for (const template of templates) {
    store.put({
      ...normalizeStoredDeviceTemplate(template as LegacyDeviceTemplate),
      updatedAt: Date.now()
    });
  }

  await tx.done;
}

/**
 * 批量保存图元模板
 *
 * @param templates 图元模板数组
 */
export async function saveGraphTemplates(templates: GraphTemplate[]): Promise<void> {
  const db = await initDeviceLibraryDB();
  const tx = db.transaction("graphTemplates", "readwrite");
  const store = tx.objectStore("graphTemplates");

  // 批量 put，不等待每个
  for (const template of templates) {
    store.put({
      ...template,
      updatedAt: Date.now()
    });
  }

  await tx.done;
}

/**
 * 批量保存设备定义覆盖
 *
 * @param overrides 覆盖配置映射
 */
export async function saveOverrides(
  overrides: Record<string, DeviceTemplateDefinitionOverride>
): Promise<void> {
  const db = await initDeviceLibraryDB();
  const tx = db.transaction("overrides", "readwrite");
  const store = tx.objectStore("overrides");

  // 覆盖是完整快照；先清空，确保迁移后已删除的历史损坏记录不会残留。
  store.clear();
  for (const [kind, override] of Object.entries(overrides)) {
    store.put({
      ...override,
      kind,  // 使用参数中的 kind，覆盖 override 中可能存在的 kind
      updatedAt: Date.now()
    });
  }

  await tx.done;
}
