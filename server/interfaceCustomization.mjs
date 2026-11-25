import { readFile } from "node:fs/promises";
import { atomicWriteFile } from "../shared/atomicWrite.mjs";

export const INTERFACE_CUSTOMIZATION_SCHEMA_VERSION = 1;

const BUTTON_IDS = [
  "topbar.brand", "topbar.activeModel", "topbar.template", "topbar.spaceSwitcher",
  "topbar.interfaceCustomization", "topbar.runtimeWs",
  "topbar.spaceExport", "topbar.spaceImport", "topbar.spaceRename", "topbar.spaceDelete",
  "topbar.layerManagement", "topbar.smartAlignment", "topbar.topology", "topbar.globalLines",
  "topbar.allNetworkTopology", "topbar.topologyWarning", "topbar.colorMode", "topbar.colorPalette",
  "topbar.voltageLevel", "topbar.deviceLabels", "topbar.deviceMeasurements", "topbar.electricFlow",
  "topbar.electricFlowSettings", "topbar.imageLibrary", "topbar.userCustomization", "topbar.save",
  "topbar.eInterface", "topbar.export", "topbar.sendModel", "topbar.tour", "topbar.theme",
  "selection.group", "selection.displayLayer", "selection.align", "selection.rotate"
];

const MODULE_IDS = [
  "module.leftPanel", "module.leftPanel.modeControls", "module.leftPanel.modelLibrary",
  "module.leftPanel.deviceLibrary", "module.leftPanel.templateLibrary", "module.leftPanel.embeddedInspector",
  "module.leftPanel.schemeId", "module.leftPanel.modelId", "module.rightPanel",
  "module.rightPanel.modeControls", "module.rightPanel.baseTab", "module.rightPanel.elementTreeTab",
  "module.rightPanel.graphTab", "module.rightPanel.graphGraphics", "module.rightPanel.graphModel",
  "module.rightPanel.graphMeasurement", "module.rightPanel.graphBatch", "module.rightPanel.baseModelInfo",
  "module.rightPanel.baseCanvasSettings", "module.rightPanel.baseBackgroundSettings",
  "module.rightPanel.deviceModel", "module.rightPanel.deviceMeasurement", "module.recentGlyphs",
  "module.canvas", "module.selectionActions", "module.statusbar", "module.topologyWarning"
];

export const INTERFACE_CUSTOMIZATION_DEFAULTS = Object.freeze({
  schemaVersion: INTERFACE_CUSTOMIZATION_SCHEMA_VERSION,
  buttons: Object.freeze(Object.fromEntries(BUTTON_IDS.map((id) => [id, true]))),
  modules: Object.freeze(Object.fromEntries(MODULE_IDS.map((id) => [id, true])))
});

function isRecord(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function normalizeVisibilityMap(value, ids) {
  const source = isRecord(value) ? value : {};
  const normalized = Object.fromEntries(ids.map((id) => [id, true]));
  for (const id of ids) {
    if (typeof source[id] === "boolean") normalized[id] = source[id];
  }
  return normalized;
}

export function normalizeInterfaceCustomizationConfig(value) {
  const source = isRecord(value) ? value : {};
  return {
    schemaVersion: INTERFACE_CUSTOMIZATION_SCHEMA_VERSION,
    buttons: normalizeVisibilityMap(source.buttons, BUTTON_IDS),
    modules: normalizeVisibilityMap(source.modules, MODULE_IDS)
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
