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
  modules: Object.freeze({ ...DEFAULT_INTERFACE_CUSTOMIZATION_CONFIG.modules })
});

export function normalizeInterfaceCustomizationConfig(value) {
  const normalized = normalizeConfigFromSrc(value);
  return {
    schemaVersion: normalized.schemaVersion,
    buttons: normalized.buttons,
    modules: normalized.modules
  };
}

function readErrorFor(error, fallbackCode = "read-error") {
  return {
    code: String(error?.code ?? fallbackCode),
    message: String(error?.message ?? "读取界面定制配置失败。")
  };
}

export async function readInterfaceCustomizationConfig({ filePath } = {}) {
  if (!filePath) throw new Error("缺少界面定制配置文件路径。");
  let parsed;
  let readError = null;
  try {
    parsed = JSON.parse(await readFile(filePath, "utf8"));
  } catch (error) {
    if (error?.code !== "ENOENT") {
      readError = readErrorFor(error, "invalid-config");
    }
  }
  const normalized = normalizeInterfaceCustomizationConfig(parsed);
  return {
    exists: parsed !== undefined,
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
