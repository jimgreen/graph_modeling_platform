import { readFile } from "node:fs/promises";
import { atomicWriteFile } from "../shared/atomicWrite.mjs";
import {
  DEFAULT_INTERFACE_CUSTOMIZATION_CONFIG,
  INTERFACE_CUSTOMIZATION_SCHEMA_VERSION,
  normalizeInterfaceCustomizationConfig as normalizeConfigFromSrc
} from "../src/interfaceCustomization.ts";

export { INTERFACE_CUSTOMIZATION_SCHEMA_VERSION };

export const INTERFACE_CUSTOMIZATION_DEFAULTS = Object.freeze({
  schemaVersion: INTERFACE_CUSTOMIZATION_SCHEMA_VERSION,
  buttons: Object.freeze({ ...DEFAULT_INTERFACE_CUSTOMIZATION_CONFIG.buttons }),
  modules: Object.freeze({ ...DEFAULT_INTERFACE_CUSTOMIZATION_CONFIG.modules }),
  deviceLibrary: Object.freeze({
    categories: Object.freeze({ ...DEFAULT_INTERFACE_CUSTOMIZATION_CONFIG.deviceLibrary.categories }),
    componentLibraries: Object.freeze({ ...DEFAULT_INTERFACE_CUSTOMIZATION_CONFIG.deviceLibrary.componentLibraries }),
    devices: Object.freeze({ ...DEFAULT_INTERFACE_CUSTOMIZATION_CONFIG.deviceLibrary.devices }),
    categoryOrder: Object.freeze([...DEFAULT_INTERFACE_CUSTOMIZATION_CONFIG.deviceLibrary.categoryOrder]),
    componentOrder: Object.freeze({ ...DEFAULT_INTERFACE_CUSTOMIZATION_CONFIG.deviceLibrary.componentOrder }),
    deviceOrder: Object.freeze({ ...DEFAULT_INTERFACE_CUSTOMIZATION_CONFIG.deviceLibrary.deviceOrder })
  })
});

export function normalizeInterfaceCustomizationConfig(value) {
  const normalized = normalizeConfigFromSrc(value);
  return {
    schemaVersion: normalized.schemaVersion,
    buttons: normalized.buttons,
    modules: normalized.modules,
    deviceLibrary: normalized.deviceLibrary
  };
}

function readErrorFor(error, fallbackCode = "read-error") {
  return {
    code: String(error?.code ?? fallbackCode),
    message: String(error?.message ?? "读取界面定制配置失败。")
  };
}

async function readConfigFile(filePath) {
  try {
    return {
      value: JSON.parse(await readFile(filePath, "utf8")),
      exists: true,
      readError: null
    };
  } catch (error) {
    if (error?.code === "ENOENT") {
      return { value: undefined, exists: false, readError: null };
    }
    return { value: undefined, exists: false, readError: readErrorFor(error, "invalid-config") };
  }
}

function mergeInterfaceCustomizationConfig(baseValue, customValue) {
  const base = normalizeInterfaceCustomizationConfig(baseValue);
  const custom = customValue && typeof customValue === "object" && !Array.isArray(customValue)
    ? customValue
    : {};
  const customDeviceLibrary = custom.deviceLibrary && typeof custom.deviceLibrary === "object" && !Array.isArray(custom.deviceLibrary)
    ? custom.deviceLibrary
    : {};
  return normalizeInterfaceCustomizationConfig({
    schemaVersion: custom.schemaVersion ?? base.schemaVersion,
    buttons: { ...base.buttons, ...(custom.buttons ?? {}) },
    modules: { ...base.modules, ...(custom.modules ?? {}) },
    deviceLibrary: {
      ...base.deviceLibrary,
      ...customDeviceLibrary,
      categories: { ...base.deviceLibrary.categories, ...(customDeviceLibrary.categories ?? {}) },
      componentLibraries: { ...base.deviceLibrary.componentLibraries, ...(customDeviceLibrary.componentLibraries ?? {}) },
      devices: { ...base.deviceLibrary.devices, ...(customDeviceLibrary.devices ?? {}) },
      categoryOrder: Array.isArray(customDeviceLibrary.categoryOrder)
        ? customDeviceLibrary.categoryOrder
        : base.deviceLibrary.categoryOrder,
      componentOrder: { ...base.deviceLibrary.componentOrder, ...(customDeviceLibrary.componentOrder ?? {}) },
      deviceOrder: { ...base.deviceLibrary.deviceOrder, ...(customDeviceLibrary.deviceOrder ?? {}) }
    }
  });
}

export async function readInterfaceCustomizationConfig({ filePath, exampleFilePath } = {}) {
  if (!filePath) throw new Error("缺少界面定制配置文件路径。");
  const exampleResult = exampleFilePath
    ? await readConfigFile(exampleFilePath)
    : { value: undefined, exists: false, readError: null };
  const customResult = await readConfigFile(filePath);
  const normalized = mergeInterfaceCustomizationConfig(exampleResult.value, customResult.value);
  const readError = exampleResult.readError ?? customResult.readError;
  return {
    exists: customResult.exists,
    ...normalized,
    ...(readError ? { readError } : {})
  };
}

export async function writeInterfaceCustomizationConfig(value, { filePath } = {}) {
  if (!filePath) throw new Error("缺少界面定制配置文件路径。");
  const normalized = {
    ...normalizeInterfaceCustomizationConfig(value),
    savedAt: new Date().toISOString()
  };
  await atomicWriteFile(filePath, `${JSON.stringify(normalized, null, 2)}\n`, "utf8");
  return normalized;
}
