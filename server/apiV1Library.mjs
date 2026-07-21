// /webgrp/v1 图元库域 handler：categories、devices、measurements、device-definitions、templates、library（聚合）。
// 复用 image-server.mjs：readDeviceLibraryConfig、readMeasurementConfig、eSectionColumns、staticComponentLibraryByKind。
// categories/devices 为 server 端可离线产出的结构化元数据（非前端完整分类树，决策 A）。

import { readDeviceLibraryConfig, readMeasurementConfig, eSectionColumns, staticComponentLibraryByKind } from "./image-server.mjs";
import { sendV1Json, sendV1Error } from "./v1Response.mjs";

// 图元分类 bases（静态，与前端 DEFAULT_CATEGORY_LIBRARIES 对齐）
const CATEGORY_LIBRARY_BASES = ["静态图元", "交流设备", "直流设备", "氢能设备", "热能设备"];

// 按 E 段名推导所属分类 base
function baseForESection(section) {
  if (!section) {
    return "静态图元";
  }
  if (section === "StaticTextSymbol" || section === "StaticMediaSymbol" || section === "StaticBasicShape"
      || section === "StaticFlowNode" || section === "StaticButton" || section === "StaticContainerSymbol"
      || section === "StaticConnectorSymbol" || section === "StaticAnnotationSymbol") {
    return "静态图元";
  }
  if (section.startsWith("AC") || section.startsWith("Ground")) {
    return "交流设备";
  }
  if (section.startsWith("DC")) {
    return "直流设备";
  }
  if (section.startsWith("Hydro") || section.startsWith("AcE2Hydro") || section.startsWith("DcE2Hydro")
      || section.startsWith("Hydro2")) {
    return "氢能设备";
  }
  if (section.startsWith("Heat") || section.startsWith("AcElec2Heat") || section.startsWith("DcElec2Heat")) {
    return "热能设备";
  }
  return "静态图元";
}

// 图元分类树：静态 bases + 自定义图元库
function buildCategories(deviceLibrary) {
  const customLibs = Array.isArray(deviceLibrary.customCategoryLibraries) ? deviceLibrary.customCategoryLibraries : [];
  const bases = [...CATEGORY_LIBRARY_BASES, ...customLibs];
  return {
    categories: bases.map((name) => ({ id: name, name }))
  };
}

// 各类图元信息：E 段定义（段名→列）+ 静态图元库映射 + 自定义 component libraries
function buildDevices(deviceLibrary) {
  const sections = Object.entries(eSectionColumns).map(([section, columns]) => ({
    section,
    base: baseForESection(section),
    columns
  }));
  const staticComponentLibraries = Object.entries(staticComponentLibraryByKind).map(([kind, componentLibrary]) => ({
    kind,
    componentLibrary
  }));
  const customComponentLibraries = Array.isArray(deviceLibrary.customComponentLibraries) ? deviceLibrary.customComponentLibraries : [];
  return {
    eSections: sections,
    staticComponentLibraries,
    customComponentLibraries
  };
}

// /webgrp/v1/library/categories
export async function handleV1LibraryCategories({ request, response }) {
  try {
    const lib = await readDeviceLibraryConfig();
    await sendV1Json(request, response, buildCategories(lib));
  } catch (error) {
    sendV1Error(response, "internal", error instanceof Error ? error.message : "后端处理失败。");
  }
}

// /webgrp/v1/library/devices
export async function handleV1LibraryDevices({ request, response }) {
  try {
    const lib = await readDeviceLibraryConfig();
    await sendV1Json(request, response, buildDevices(lib));
  } catch (error) {
    sendV1Error(response, "internal", error instanceof Error ? error.message : "后端处理失败。");
  }
}

// /webgrp/v1/library/measurements —— 量测定义
export async function handleV1LibraryMeasurements({ request, response }) {
  try {
    const config = await readMeasurementConfig();
    await sendV1Json(request, response, {
      groupDefaults: config.groupDefaults ?? {},
      measurementTypes: config.measurementTypes ?? [],
      deviceProfiles: config.deviceProfiles ?? []
    });
  } catch (error) {
    sendV1Error(response, "internal", error instanceof Error ? error.message : "后端处理失败。");
  }
}

// /webgrp/v1/library/device-definitions —— 图元定义
export async function handleV1LibraryDeviceDefinitions({ request, response }) {
  try {
    const lib = await readDeviceLibraryConfig();
    await sendV1Json(request, response, {
      deviceDefinitionOverrides: lib.deviceDefinitionOverrides ?? {},
      customComponentLibraries: lib.customComponentLibraries ?? [],
      customCategoryLibraries: lib.customCategoryLibraries ?? []
    });
  } catch (error) {
    sendV1Error(response, "internal", error instanceof Error ? error.message : "后端处理失败。");
  }
}

// /webgrp/v1/library/templates —— 模板库
export async function handleV1LibraryTemplates({ request, response }) {
  try {
    const lib = await readDeviceLibraryConfig();
    await sendV1Json(request, response, {
      customDeviceTemplates: lib.customDeviceTemplates ?? [],
      customGraphTemplates: lib.customGraphTemplates ?? [],
      customGraphTemplateTypes: lib.customGraphTemplateTypes ?? []
    });
  } catch (error) {
    sendV1Error(response, "internal", error instanceof Error ? error.message : "后端处理失败。");
  }
}

// /webgrp/v1/library —— 聚合（一次取全）
export async function handleV1Library({ request, response }) {
  try {
    const [deviceLibrary, measurementConfig] = await Promise.all([readDeviceLibraryConfig(), readMeasurementConfig()]);
    await sendV1Json(request, response, {
      categories: buildCategories(deviceLibrary).categories,
      devices: buildDevices(deviceLibrary),
      measurements: {
        groupDefaults: measurementConfig.groupDefaults ?? {},
        measurementTypes: measurementConfig.measurementTypes ?? [],
        deviceProfiles: measurementConfig.deviceProfiles ?? []
      },
      deviceDefinitions: {
        deviceDefinitionOverrides: deviceLibrary.deviceDefinitionOverrides ?? {},
        customComponentLibraries: deviceLibrary.customComponentLibraries ?? [],
        customCategoryLibraries: deviceLibrary.customCategoryLibraries ?? []
      },
      templates: {
        customDeviceTemplates: deviceLibrary.customDeviceTemplates ?? [],
        customGraphTemplates: deviceLibrary.customGraphTemplates ?? [],
        customGraphTemplateTypes: deviceLibrary.customGraphTemplateTypes ?? []
      }
    });
  } catch (error) {
    sendV1Error(response, "internal", error instanceof Error ? error.message : "后端处理失败。");
  }
}

import { apiPattern } from "./config.mjs";

export const v1LibraryRoutes = [
  { method: "GET", pattern: apiPattern("/v1/library", "/?$"), handle: handleV1Library },
  { method: "GET", pattern: apiPattern("/v1/library/categories", "/?$"), handle: handleV1LibraryCategories },
  { method: "GET", pattern: apiPattern("/v1/library/devices", "/?$"), handle: handleV1LibraryDevices },
  { method: "GET", pattern: apiPattern("/v1/library/measurements", "/?$"), handle: handleV1LibraryMeasurements },
  { method: "GET", pattern: apiPattern("/v1/library/device-definitions", "/?$"), handle: handleV1LibraryDeviceDefinitions },
  { method: "GET", pattern: apiPattern("/v1/library/templates", "/?$"), handle: handleV1LibraryTemplates }
];
