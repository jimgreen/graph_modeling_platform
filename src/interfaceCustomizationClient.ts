import { apiPath } from "./config";
import {
  backendJsonRequest,
  fetchBackendJson
} from "./appExtracted/appCoreCanvasUtilities";
import {
  normalizeInterfaceCustomizationConfig,
  type InterfaceCustomizationConfig
} from "./interfaceCustomization";

export async function fetchBackendInterfaceCustomization(): Promise<InterfaceCustomizationConfig> {
  const payload = await fetchBackendJson<unknown>(
    apiPath("/interface-customization"),
    "读取后台界面定制配置失败。"
  );
  if (payload && typeof payload === "object" && !Array.isArray(payload)) {
    const readError = (payload as { readError?: { message?: unknown } }).readError;
    if (readError && typeof readError === "object") {
      throw new Error(String(readError.message ?? "配置文件读取失败。"));
    }
  }
  return normalizeInterfaceCustomizationConfig(payload);
}

export async function saveBackendInterfaceCustomization(config: InterfaceCustomizationConfig): Promise<void> {
  await fetchBackendJson<{ ok?: boolean }>(
    apiPath("/interface-customization"),
    "保存界面定制配置到后台失败。",
    backendJsonRequest("PUT", JSON.stringify(normalizeInterfaceCustomizationConfig(config)))
  );
}
