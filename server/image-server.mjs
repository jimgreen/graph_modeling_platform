import { createServer } from "node:http";
import { mkdir, readFile, readdir, rename, rm, stat, writeFile } from "node:fs/promises";
import { createReadStream } from "node:fs";
import { basename, dirname, extname, isAbsolute, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { gzip } from "node:zlib";
import { promisify } from "node:util";
import { createHash } from "node:crypto";
import AdmZip from "adm-zip";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const repoRoot = resolve(__dirname, "..");
// 数据根目录：默认 repo data/，可用 GRAPH_MODEL_DATA_DIR 覆盖（测试隔离用 tmpdir）
const dataRoot = process.env.GRAPH_MODEL_DATA_DIR ? resolve(process.env.GRAPH_MODEL_DATA_DIR) : resolve(repoRoot, "data");
const imageDataDir = join(dataRoot, "images");
const manifestPath = join(imageDataDir, "manifest.json");
const imageFoldersPath = join(imageDataDir, "folders.json");
const schemeDataDir = join(dataRoot, "schemes");
const schemeTrashDir = join(schemeDataDir, "trash");
const settingsDataDir = join(dataRoot, "settings");
const colorConfigPath = join(settingsDataDir, "color-config.json");
const measurementConfigPath = join(settingsDataDir, "measurement-config.json");
const deviceLibraryDataDir = join(dataRoot, "device-library");
const deviceLibraryPath = join(deviceLibraryDataDir, "library.json");
const iconLibraryDataDir = join(dataRoot, "icon-library");
const maxImageBodyBytes = 16 * 1024 * 1024;
const maxIconLibraryImportBodyBytes = 128 * 1024 * 1024;
const maxSchemeBodyBytes = 64 * 1024 * 1024;
const maxSchemeZipBodyBytes = 256 * 1024 * 1024;
const maxColorConfigBodyBytes = 1024 * 1024;
const maxMeasurementConfigBodyBytes = 1024 * 1024;
const maxDeviceLibraryBodyBytes = 16 * 1024 * 1024;
const maxFilePartLength = 80;
const backendImageHrefPattern = /^\/webgrp\/images\/([^/?#]+)/;
const accessControlHeaders = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET,POST,PUT,DELETE,OPTIONS",
  "access-control-allow-headers": "content-type"
};
const noStoreJsonHeaders = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store",
  ...accessControlHeaders
};
const defaultPowerUnit = "MW";
const defaultVoltageUnit = "kV";
const defaultCurrentUnit = "A";
const defaultPowerBaseValue = 100;
const defaultStaticComponentLibrary = "StaticBasicShape";
export const staticComponentLibraryByKind = {
  "static-text": "StaticTextSymbol",
  "static-date": "StaticTextSymbol",
  "static-time": "StaticTextSymbol",
  "static-datetime": "StaticTextSymbol",
  "static-image": "StaticMediaSymbol",
  "static-web": "StaticMediaSymbol",
  "static-circle": "StaticBasicShape",
  "static-ellipse": "StaticBasicShape",
  "static-rect": "StaticBasicShape",
  "static-point": "StaticBasicShape",
  "static-ring": "StaticBasicShape",
  "static-hexagon": "StaticBasicShape",
  "static-parallelogram": "StaticBasicShape",
  "static-triangle": "StaticBasicShape",
  "static-rounded-rect": "StaticFlowNode",
  "static-diamond": "StaticFlowNode",
  "static-pill": "StaticFlowNode",
  "static-database": "StaticFlowNode",
  "static-document": "StaticFlowNode",
  "static-note": "StaticFlowNode",
  "static-circle-node": "StaticFlowNode",
  "static-default-node": "StaticFlowNode",
  "static-input-node": "StaticFlowNode",
  "static-output-node": "StaticFlowNode",
  "static-port-node": "StaticFlowNode",
  "static-card-node": "StaticFlowNode",
  "static-toolbar-node": "StaticFlowNode",
  "static-input": "StaticFlowNode",
  "static-button": "StaticButton",
  "static-group-box": "StaticContainerSymbol",
  "static-swimlane": "StaticContainerSymbol",
  "static-resizer-frame": "StaticContainerSymbol",
  "static-subflow-box": "StaticContainerSymbol",
  "static-line": "StaticConnectorSymbol",
  "static-polyline": "StaticConnectorSymbol",
  "static-straight-connector": "StaticConnectorSymbol",
  "static-arrow-connector": "StaticConnectorSymbol",
  "static-double-arrow-connector": "StaticConnectorSymbol",
  "static-elbow-connector": "StaticConnectorSymbol",
  "static-bezier-connector": "StaticConnectorSymbol",
  "static-smoothstep-connector": "StaticConnectorSymbol",
  "static-self-loop": "StaticConnectorSymbol",
  "static-callout": "StaticAnnotationSymbol",
  "static-edge-label": "StaticAnnotationSymbol"
};
function staticComponentLibraryForKind(kind) {
  return staticComponentLibraryByKind[String(kind ?? "")] ?? defaultStaticComponentLibrary;
}
export const eSectionColumns = {
  StaticTextSymbol: [],
  StaticMediaSymbol: [],
  StaticBasicShape: [],
  StaticFlowNode: [],
  StaticButton: [],
  StaticContainerSymbol: [],
  StaticConnectorSymbol: [],
  StaticAnnotationSymbol: [],
  ACRealBs: ["idx", "name", "node", "run_stat"],
  DCRealBs: ["idx", "name", "node", "run_stat"],
  ACNode: ["idx", "name", "vbase", "run_stat"],
  DCNode: ["idx", "name", "vbase", "voltage", "isl", "run_stat"],
  ACBranch: ["idx", "name", "i_node", "j_node", "r", "x", "b", "run_stat"],
  DCBranch: ["idx", "name", "i_node", "j_node", "r", "run_stat"],
  ACLoad: ["idx", "name", "node", "pbase", "pv0", "pv1", "pv2", "qbase", "qv0", "qv1", "qv2", "run_stat"],
  DCLoad: ["idx", "name", "node", "pbase", "pv0", "pv1", "pv2", "run_stat"],
  ACGenerator: ["idx", "name", "node", "control_type", "p_set", "q_set", "v_set", "alpha", "run_stat"],
  DCGenerator: ["idx", "name", "node", "control_type", "v_set", "p_set", "i_set", "run_stat"],
  ACShuntCompensator: ["idx", "name", "node", "control_type", "q_set", "g_set", "b_set", "v_set", "run_stat"],
  ACZeroBranch: ["idx", "name", "i_node", "j_node", "run_stat"],
  DCZeroBranch: ["idx", "name", "i_node", "j_node", "run_stat"],
  ACSwitch: ["idx", "name", "i_node", "j_node", "status", "run_stat"],
  DCSwitch: ["idx", "name", "i_node", "j_node", "status", "run_stat"],
  ACBreak: ["idx", "name", "i_node", "j_node", "status", "run_stat"],
  DCBreak: ["idx", "name", "i_node", "j_node", "status", "run_stat"],
  GroundDisconnector: ["idx", "name", "node", "status", "run_stat"],
  ACTransformer: ["idx", "name", "i_node", "j_node", "r", "x", "gt", "bt", "tap", "shift", "run_stat"],
  ACTransfomer3: [
    "idx",
    "name",
    "t1_node",
    "t2_node",
    "t3_node",
    "neutral_node",
    "r1",
    "x1",
    "gt1",
    "bt1",
    "tap1",
    "shift1",
    "r2",
    "x2",
    "gt2",
    "bt2",
    "tap2",
    "shift2",
    "r3",
    "x3",
    "gt3",
    "bt3",
    "tap3",
    "shift3",
    "run_stat"
  ],
  DCDCConverter: ["idx", "name", "i_node", "j_node", "r1", "r2", "control_type", "p_set", "i_set", "v_set", "run_stat"],
  DCACConverter: ["idx", "name", "ac_node", "dc_node", "r1", "r2", "control_type", "p_ac_set", "q_ac_set", "v_ac_set", "v_dc_set", "run_stat"],
  ACACConverter: ["idx", "name", "i_node", "j_node", "r1", "r2", "control_type", "p_set", "i_q_set", "j_q_set", "i_v_set", "j_v_set", "run_stat"],
  HydroSource: ["idx", "name", "node", "run_stat"],
  HydroLoad: ["idx", "name", "node", "run_stat"],
  HydroPipe: ["idx", "name", "i_node", "j_node", "run_stat"],
  HydroCompressor: ["idx", "name", "i_node", "j_node", "run_stat"],
  HydroPressRegulator: ["idx", "name", "i_node", "j_node", "run_stat"],
  HydroStopValve: ["idx", "name", "i_node", "j_node", "status", "run_stat"],
  HydroBus: ["idx", "name", "node", "run_stat"],
  HydroStorage: ["idx", "name", "node", "run_stat"],
  AcE2Hydro: ["idx", "name", "run_stat", "idx_ac_load_t1", "idx_h2_unit_t2"],
  DcE2Hydro: ["idx", "name", "run_stat", "idx_dc_load_t1", "idx_h2_unit_t2"],
  Hydro2AcE: ["idx", "name", "run_stat", "idx_ac_unit_t1", "idx_h2_load_t2"],
  Hydro2DcE: ["idx", "name", "run_stat", "idx_dc_unit_t1", "idx_h2_load_t2"],
  HeatSource: ["idx", "name", "node", "run_stat"],
  HeatSource2: ["idx", "name", "i_node", "j_node", "run_stat"],
  HeatLoad: ["idx", "name", "node", "run_stat"],
  HeatLoad2: ["idx", "name", "i_node", "j_node", "run_stat"],
  HeatPipe: ["idx", "name", "i_node", "j_node", "run_stat"],
  HeatStopValve: ["idx", "name", "i_node", "j_node", "status", "run_stat"],
  HeatBus: ["idx", "name", "node", "run_stat"],
  HeatStorage: ["idx", "name", "node", "run_stat"],
  HeatBoiler: ["idx", "name", "run_stat", "idx_heat_unit_t1"],
  HeatBoiler2: ["idx", "name", "run_stat", "idx_heat2_unit_t1"],
  AcElec2Heat: ["idx", "name", "run_stat", "idx_ac_load_t1", "idx_heat_unit_t2"],
  DcElec2Heat: ["idx", "name", "run_stat", "idx_dc_load_t1", "idx_heat_unit_t2"],
  AcElec2Heat2: ["idx", "name", "run_stat", "idx_ac_load_t1", "idx_heat2_unit_t2"],
  DcElec2Heat2: ["idx", "name", "run_stat", "idx_dc_load_t1", "idx_heat2_unit_t2"],
  HeatExchanger: ["idx", "name", "i_node", "j_node", "run_stat"],
  HeatExchanger3: ["idx", "name", "node1", "node2", "node3", "run_stat"],
  HeatExchanger4: ["idx", "name", "node1", "node2", "node3", "node4", "run_stat"],
  HeatPump: ["idx", "name", "i_node", "j_node", "run_stat"]
};

const mimeExt = {
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "image/svg+xml": ".svg"
};

const imageMimeByExtension = {
  ...Object.fromEntries(Object.entries(mimeExt).map(([mimeType, extension]) => [extension, mimeType])),
  ".jpeg": "image/jpeg"
};
const iconLibraryArchiveExtensions = new Set([
  ".docx",
  ".docm",
  ".pptx",
  ".pptm",
  ".ppsx",
  ".ppsm",
  ".xlsx",
  ".xlsm",
  ".vsdx",
  ".wps",
  ".dps",
  ".zip"
]);
const maxIconLibraryExtractedAssets = 500;

const stringifyJson = (value) => JSON.stringify(value, null, 2);

async function writeTextIfChanged(filePath, content) {
  try {
    const current = await readFile(filePath, "utf-8");
    if (current === content) {
      return;
    }
  } catch {
    // File is missing or unreadable; write a fresh copy below.
  }
  await writeFile(filePath, content, "utf-8");
}

async function fileExists(filePath) {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
}

async function ensureJsonStoreFile(dirPath, filePath, defaultValue) {
  await mkdir(dirPath, { recursive: true });
  try {
    await readFile(filePath, "utf-8");
  } catch {
    await writeTextIfChanged(filePath, stringifyJson(defaultValue));
  }
}

async function readJsonStoreFile(dirPath, filePath, defaultValue, normalize = (value) => value) {
  await ensureJsonStoreFile(dirPath, filePath, defaultValue);
  try {
    return normalize(JSON.parse(await readFile(filePath, "utf-8")));
  } catch {
    return normalize(defaultValue);
  }
}

async function readOptionalJsonStoreFile(dirPath, filePath) {
  await mkdir(dirPath, { recursive: true });
  try {
    return JSON.parse(await readFile(filePath, "utf-8"));
  } catch {
    return null;
  }
}

async function writeJsonStoreFile(dirPath, filePath, value) {
  await mkdir(dirPath, { recursive: true });
  await writeTextIfChanged(filePath, stringifyJson(value));
}

async function ensureStore() {
  await ensureJsonStoreFile(imageDataDir, manifestPath, []);
  await ensureJsonStoreFile(imageDataDir, imageFoldersPath, [rootImageFolder()]);
}

async function readManifest() {
  return readJsonStoreFile(imageDataDir, manifestPath, [], (parsed) =>
    Array.isArray(parsed) ? parsed.map((item) => ({ ...item, folderId: item.folderId || "root" })) : []
  );
}

async function writeManifest(items) {
  await writeJsonStoreFile(imageDataDir, manifestPath, items);
}

function rootImageFolder() {
  return {
    id: "root",
    name: "默认文件夹",
    createdAt: new Date(0).toISOString()
  };
}

async function readImageFolders() {
  return readJsonStoreFile(imageDataDir, imageFoldersPath, [rootImageFolder()], (parsed) => {
    const folders = Array.isArray(parsed) ? parsed : [];
    const withRoot = folders.some((folder) => folder.id === "root") ? folders : [rootImageFolder(), ...folders];
    return withRoot.map((folder) => ({
      id: String(folder.id || "root"),
      name: safeName(folder.name || "默认文件夹"),
      createdAt: folder.createdAt || new Date().toISOString()
    }));
  });
}

async function writeImageFolders(folders) {
  const withRoot = folders.some((folder) => folder.id === "root") ? folders : [rootImageFolder(), ...folders];
  await writeJsonStoreFile(imageDataDir, imageFoldersPath, withRoot);
}

async function resolveFolderId(folderId) {
  const folders = await readImageFolders();
  return folders.some((folder) => folder.id === folderId) ? folderId : "root";
}

function storedSchemeFilePartDisplayName(filePart, fallback = "未命名方案") {
  return String(filePart || "")
    .replace(/__scheme-[a-z0-9]+$/iu, "")
    .trim() || fallback;
}

function storedProjectFilePartDisplayName(filePart, fallback = "未命名模型") {
  return String(filePart || "")
    .replace(/__project-[a-z0-9]+$/iu, "")
    .trim() || fallback;
}

async function fileUpdatedAt(filePath) {
  try {
    return (await stat(filePath)).mtime.toISOString();
  } catch {
    return new Date(0).toISOString();
  }
}

async function readLegacySchemeDirectoryMeta(schemeDir) {
  try {
    const parsed = JSON.parse(await readFile(join(schemeDir, "scheme.json"), "utf-8"));
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

async function readSchemeProjectFile(filePath, fileName) {
  try {
    const project = normalizeProjectForStorage(JSON.parse(await readFile(filePath, "utf-8")));
    const fileBaseName = fileName.replace(/\.json$/iu, "");
    const name = storageProjectDisplayName(project.name || storedProjectFilePartDisplayName(fileBaseName));
    return {
      name,
      updatedAt: await fileUpdatedAt(filePath),
      project: {
        ...project,
        name
      }
    };
  } catch {
    return null;
  }
}

async function readSchemeProjectSummaryFile(filePath, fileName) {
  const fileBaseName = fileName.replace(/\.json$/iu, "");
  const name = storageProjectDisplayName(storedProjectFilePartDisplayName(fileBaseName));
  return {
    name,
    updatedAt: await fileUpdatedAt(filePath),
    project: {
      version: 1,
      name,
      nodes: [],
      edges: [],
      __summaryOnly: true
    }
  };
}

async function readSchemeDirectory(dirent, parentDir, options = {}) {
  const schemeDir = join(parentDir, dirent.name);
  const legacyMeta = await readLegacySchemeDirectoryMeta(schemeDir);
  let entries = [];
  try {
    entries = await readdir(schemeDir, { withFileTypes: true });
  } catch {
    return null;
  }
  const projects = [];
  const children = [];
  for (const entry of entries) {
    const entryPath = join(schemeDir, entry.name);
    if (entry.isDirectory()) {
      const child = await readSchemeDirectory(entry, schemeDir, options);
      if (child) {
        children.push(child);
      }
      continue;
    }
    if (!entry.isFile() || !/\.json$/iu.test(entry.name) || entry.name.toLocaleLowerCase() === "scheme.json") {
      continue;
    }
    const project = options.includeProjects
      ? await readSchemeProjectFile(entryPath, entry.name)
      : await readSchemeProjectSummaryFile(entryPath, entry.name);
    if (project) {
      projects.push(project);
    }
  }
  const name = storedSchemeFilePartDisplayName(legacyMeta?.name || dirent.name);
  return {
    name,
    updatedAt: legacyMeta?.updatedAt || await fileUpdatedAt(schemeDir),
    projects,
    children
  };
}

export async function readSchemesFromFiles(options = {}) {
  const filesRoot = options.filesRoot ?? join(schemeDataDir, "files");
  await mkdir(filesRoot, { recursive: true });
  const entries = await readdir(filesRoot, { withFileTypes: true });
  const schemes = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }
    const scheme = await readSchemeDirectory(entry, filesRoot, options);
    if (scheme) {
      schemes.push(scheme);
    }
  }
  return schemes;
}

async function removeLegacySchemeManifest() {
  await rm(join(schemeDataDir, "schemes.json"), { force: true });
}

async function ensureSchemeStore() {
  await mkdir(join(schemeDataDir, "files"), { recursive: true });
}

export async function readSchemes(options = {}) {
  return readSchemesFromFiles(options);
}

async function writeSchemes(schemes, options = {}) {
  await ensureSchemeStore();
  await writeSchemeFiles(schemes, options);
  await removeLegacySchemeManifest();
}

function normalizeColorRecord(source) {
  if (!source || typeof source !== "object") {
    return {};
  }
  return Object.entries(source).reduce((result, [key, value]) => {
    if (typeof key === "string" && key.trim() && typeof value === "string" && value.trim()) {
      result[key.trim()] = value.trim();
    }
    return result;
  }, {});
}

function normalizeColorConfig(payload) {
  const colorPalette = payload?.colorPalette && typeof payload.colorPalette === "object" ? payload.colorPalette : {};
  return {
    colorDisplayMode: payload?.colorDisplayMode === "voltage" ? "voltage" : "energy",
    colorPalette: {
      energy: normalizeColorRecord(colorPalette.energy),
      voltage: normalizeColorRecord(colorPalette.voltage)
    }
  };
}

async function readColorConfig() {
  const parsed = await readOptionalJsonStoreFile(settingsDataDir, colorConfigPath);
  if (parsed) {
    return {
      exists: true,
      ...normalizeColorConfig(parsed)
    };
  }
  return {
    exists: false,
    colorDisplayMode: "energy",
    colorPalette: {
      energy: {},
      voltage: {}
    }
  };
}

async function writeColorConfig(config) {
  const normalized = {
    ...normalizeColorConfig(config),
    savedAt: new Date().toISOString()
  };
  await writeJsonStoreFile(settingsDataDir, colorConfigPath, normalized);
  return normalized;
}

function normalizeMeasurementValueType(value) {
  return value === "string" || value === "boolean" ? value : "number";
}

function normalizeMeasurementFontWeight(value) {
  return value === "400" || value === "700" ? value : "500";
}

const builtinMeasurementTypeIds = new Set([
  "activePower",
  "reactivePower",
  "voltage",
  "current",
  "frequency",
  "pressure",
  "temperature",
  "flow",
  "level",
  "status"
]);

const defaultMeasurementGroupDefaults = Object.freeze({
  backgroundColor: "transparent",
  borderColor: "#64748b",
  borderStyle: "none",
  borderWidth: 0
});

function normalizeMeasurementGroupDefaults(value) {
  const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  const backgroundColor = String(source.backgroundColor ?? defaultMeasurementGroupDefaults.backgroundColor).trim();
  const borderColor = String(source.borderColor ?? defaultMeasurementGroupDefaults.borderColor).trim();
  const borderStyle = ["none", "solid", "dashed", "dotted"].includes(source.borderStyle)
    ? source.borderStyle
    : defaultMeasurementGroupDefaults.borderStyle;
  const rawBorderWidth = Number(source.borderWidth);
  return {
    backgroundColor: backgroundColor || defaultMeasurementGroupDefaults.backgroundColor,
    borderColor: borderColor || defaultMeasurementGroupDefaults.borderColor,
    borderStyle,
    borderWidth: Number.isFinite(rawBorderWidth)
      ? Math.max(0, Math.min(12, rawBorderWidth))
      : defaultMeasurementGroupDefaults.borderWidth
  };
}

function normalizeMeasurementDefaultFontSize(id, value) {
  const size = Math.max(6, Math.min(96, Number.isFinite(Number(value)) ? Number(value) : 14));
  return builtinMeasurementTypeIds.has(id) && size === 12 ? 14 : size;
}

function normalizeMeasurementStyleOverride(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }
  const style = {};
  if (typeof value.color === "string" && value.color.trim()) {
    style.color = value.color.trim();
  }
  if (typeof value.fontFamily === "string" && value.fontFamily.trim()) {
    style.fontFamily = value.fontFamily.trim();
  }
  if (Number.isFinite(Number(value.fontSize))) {
    style.fontSize = Math.max(6, Math.min(96, Number(value.fontSize)));
  }
  if (value.fontWeight === "400" || value.fontWeight === "500" || value.fontWeight === "700") {
    style.fontWeight = value.fontWeight;
  }
  if (value.fontStyle === "italic") {
    style.fontStyle = "italic";
  }
  if (value.textDecoration === "underline") {
    style.textDecoration = "underline";
  }
  return Object.keys(style).length > 0 ? style : undefined;
}

function normalizeMeasurementConfig(payload) {
  const source = payload && typeof payload === "object" && !Array.isArray(payload) ? payload : {};
  const groupDefaults = normalizeMeasurementGroupDefaults(source.groupDefaults);
  const seenTypes = new Set();
  const measurementTypes = (Array.isArray(source.measurementTypes) ? source.measurementTypes : []).flatMap((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      return [];
    }
    const id = String(item.id ?? "").trim();
    if (!id || seenTypes.has(id)) {
      return [];
    }
    seenTypes.add(id);
    const key = String(item.key ?? id).trim() || id;
    const name = String(item.name ?? key).trim() || key;
    return [{
      id,
      key,
      name,
      shortLabel: String(item.shortLabel ?? name).trim() || name,
      defaultUnit: String(item.defaultUnit ?? ""),
      valueType: normalizeMeasurementValueType(item.valueType),
      defaultDecimals: Math.max(0, Math.min(8, Number.isFinite(Number(item.defaultDecimals)) ? Number(item.defaultDecimals) : 3)),
      defaultColor: String(item.defaultColor ?? "#334155").trim() || "#334155",
      defaultFontFamily: String(item.defaultFontFamily ?? "Arial").trim() || "Arial",
      defaultFontSize: normalizeMeasurementDefaultFontSize(id, item.defaultFontSize),
      defaultFontWeight: normalizeMeasurementFontWeight(item.defaultFontWeight),
      defaultVisible: item.defaultVisible !== false
    }];
  });
  const validTypeIds = new Set(measurementTypes.map((item) => item.id));
  const seenProfiles = new Set();
  const deviceProfiles = (Array.isArray(source.deviceProfiles) ? source.deviceProfiles : []).flatMap((profile) => {
    if (!profile || typeof profile !== "object" || Array.isArray(profile)) {
      return [];
    }
    const deviceKind = String(profile.deviceKind ?? "").trim();
    if (!deviceKind || seenProfiles.has(deviceKind)) {
      return [];
    }
    seenProfiles.add(deviceKind);
    const items = (Array.isArray(profile.items) ? profile.items : []).flatMap((item) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) {
        return [];
      }
      const measurementTypeId = String(item.measurementTypeId ?? "").trim();
      if (!measurementTypeId || !validTypeIds.has(measurementTypeId)) {
        return [];
      }
      return [{
        name: item.name !== undefined ? String(item.name) : undefined,
        measurementTypeId,
        position: item.position !== undefined ? String(item.position).trim() || undefined : undefined,
        role: item.role ? String(item.role) : undefined,
        defaultVisible: item.defaultVisible,
        labelOverride: item.labelOverride ? String(item.labelOverride) : undefined,
        unitOverride: item.unitOverride ? String(item.unitOverride) : undefined,
        decimalsOverride: item.decimalsOverride === undefined
          ? undefined
          : Math.max(0, Math.min(8, Number.isFinite(Number(item.decimalsOverride)) ? Number(item.decimalsOverride) : 3)),
        styleOverride: normalizeMeasurementStyleOverride(item.styleOverride)
      }];
    });
    return [{ deviceKind, items }];
  });
  return { groupDefaults, measurementTypes, deviceProfiles };
}

export async function readMeasurementConfig() {
  const parsed = await readOptionalJsonStoreFile(settingsDataDir, measurementConfigPath);
  if (parsed) {
    return {
      exists: true,
      ...normalizeMeasurementConfig(parsed)
    };
  }
  return {
    exists: false,
    groupDefaults: { ...defaultMeasurementGroupDefaults },
    measurementTypes: [],
    deviceProfiles: []
  };
}

async function writeMeasurementConfig(config) {
  const normalized = {
    ...normalizeMeasurementConfig(config),
    savedAt: new Date().toISOString()
  };
  await writeJsonStoreFile(settingsDataDir, measurementConfigPath, normalized);
  return normalized;
}

function normalizeDeviceLibraryConfig(payload) {
  const source = payload && typeof payload === "object" && !Array.isArray(payload) ? payload : {};
  const customDeviceTemplates = (Array.isArray(source.customDeviceTemplates) ? source.customDeviceTemplates : [])
    .map((template) => template && typeof template === "object" && !Array.isArray(template)
      ? {
        ...template,
        categoryLibrary: template.categoryLibrary ?? template.attributeLibrary ?? "交流设备"
      }
      : template);
  const customCategoryLibraries = Array.isArray(source.customCategoryLibraries)
    ? source.customCategoryLibraries
    : Array.isArray(source.customAttributeLibraries)
      ? source.customAttributeLibraries
      : [];
  const customComponentLibraries = (Array.isArray(source.customComponentLibraries)
    ? source.customComponentLibraries
    : Array.isArray(source.customComponentTypes)
      ? source.customComponentTypes
      : [])
    .map((definition) => definition && typeof definition === "object" && !Array.isArray(definition)
      ? {
        ...definition,
        categoryLibraryName: definition.categoryLibraryName ?? definition.attributeLibraryName ?? "交流设备"
      }
      : definition);
  const customGraphTemplateTypes = Array.isArray(source.customGraphTemplateTypes) ? source.customGraphTemplateTypes : [];
  const customGraphTemplates = Array.isArray(source.customGraphTemplates) ? source.customGraphTemplates : [];
  const deviceDefinitionOverrides =
    source.deviceDefinitionOverrides && typeof source.deviceDefinitionOverrides === "object" && !Array.isArray(source.deviceDefinitionOverrides)
      ? source.deviceDefinitionOverrides
      : {};
  const eDeviceDefinitionLabels =
    source.eDeviceDefinitionLabels && typeof source.eDeviceDefinitionLabels === "object" && !Array.isArray(source.eDeviceDefinitionLabels)
      ? Object.fromEntries(Object.entries(source.eDeviceDefinitionLabels).flatMap(([rawKey, rawValue]) => {
        const key = String(rawKey ?? "").trim();
        const value = String(rawValue ?? "").trim();
        return key && value ? [[key, value]] : [];
      }))
      : {};
  const eDeviceDefinitionClassExportEnabled =
    source.eDeviceDefinitionClassExportEnabled && typeof source.eDeviceDefinitionClassExportEnabled === "object" && !Array.isArray(source.eDeviceDefinitionClassExportEnabled)
      ? Object.fromEntries(Object.entries(source.eDeviceDefinitionClassExportEnabled).flatMap(([rawKey, rawValue]) => {
        const key = String(rawKey ?? "").trim();
        return key && typeof rawValue === "boolean" ? [[key, rawValue]] : [];
      }))
      : {};
  return {
    customDeviceTemplates,
    customCategoryLibraries,
    customComponentLibraries,
    customGraphTemplateTypes,
    customGraphTemplates,
    deviceDefinitionOverrides,
    eDeviceDefinitionLabels,
    eDeviceDefinitionClassExportEnabled
  };
}

export async function readDeviceLibraryConfig() {
  const parsed = await readOptionalJsonStoreFile(deviceLibraryDataDir, deviceLibraryPath);
  if (parsed) {
    return {
      exists: true,
      ...normalizeDeviceLibraryConfig(parsed)
    };
  }
  return {
    exists: false,
    ...normalizeDeviceLibraryConfig({})
  };
}

async function writeDeviceLibraryConfig(config) {
  const normalized = {
    ...normalizeDeviceLibraryConfig(config),
    savedAt: new Date().toISOString()
  };
  await writeJsonStoreFile(deviceLibraryDataDir, deviceLibraryPath, normalized);
  return normalized;
}

function sendJson(response, status, data) {
  response.writeHead(status, noStoreJsonHeaders);
  response.end(JSON.stringify(data));
}

function sendError(response, status, message) {
  sendJson(response, status, { error: message });
}

const gzipAsync = promisify(gzip);
const GZIP_MIN_BYTES = 1024;
const cacheableJsonHeaders = {
  "content-type": "application/json; charset=utf-8",
  // no-cache：允许客户端缓存，但每次须带 If-None-Match 重新校验 → 命中则 304，永不返回过期数据。
  "cache-control": "no-cache",
  ...accessControlHeaders
};
// 单文件 JSON 响应的内存缓存：按文件 mtime 命中，跳过重复的读盘 / 解析 / 序列化 / gzip。
const preparedJsonFileCache = new Map();

function prepareJsonPayload(data) {
  const raw = Buffer.from(JSON.stringify(data), "utf-8");
  const etag = `"${createHash("sha1").update(raw).digest("base64")}"`;
  return { raw, etag, gzip: undefined };
}

async function sendPreparedJson(request, response, prepared) {
  const ifNoneMatch = request.headers["if-none-match"];
  if (ifNoneMatch && ifNoneMatch === prepared.etag) {
    response.writeHead(304, { ...cacheableJsonHeaders, etag: prepared.etag });
    response.end();
    return;
  }
  const acceptsGzip = /\bgzip\b/iu.test(String(request.headers["accept-encoding"] ?? ""));
  if (acceptsGzip && prepared.raw.length >= GZIP_MIN_BYTES) {
    if (!prepared.gzip) {
      prepared.gzip = await gzipAsync(prepared.raw);
    }
    response.writeHead(200, {
      ...cacheableJsonHeaders,
      etag: prepared.etag,
      "content-encoding": "gzip",
      vary: "Accept-Encoding",
      "content-length": prepared.gzip.length
    });
    response.end(prepared.gzip);
    return;
  }
  response.writeHead(200, { ...cacheableJsonHeaders, etag: prepared.etag, "content-length": prepared.raw.length });
  response.end(prepared.raw);
}

// 多来源 / 即时计算的 GET：提供 gzip + ETag/304，但不做按文件缓存。
async function sendJsonCacheable(request, response, data) {
  await sendPreparedJson(request, response, prepareJsonPayload(data));
}

// 单文件 GET：按 mtime 缓存已准备好的响应（含 gzip），命中时仅需 stat + 发送缓冲。
async function sendCachedJsonFile(request, response, filePath, produce) {
  let version = 0;
  try {
    version = (await stat(filePath)).mtimeMs;
  } catch {
    version = 0;
  }
  const cached = preparedJsonFileCache.get(filePath);
  let prepared;
  if (cached && cached.version === version) {
    prepared = cached.prepared;
  } else {
    prepared = prepareJsonPayload(await produce());
    preparedJsonFileCache.set(filePath, { version, prepared });
  }
  await sendPreparedJson(request, response, prepared);
}

function readBody(request, maxBodyBytes = maxImageBodyBytes, oversizeMessage = "请求体过大。") {
  return new Promise((resolveBody, reject) => {
    const chunks = [];
    let size = 0;
    request.on("data", (chunk) => {
      size += chunk.length;
      if (size > maxBodyBytes) {
        request.destroy();
        reject(new Error(oversizeMessage));
        return;
      }
      chunks.push(chunk);
    });
    request.on("end", () => resolveBody(Buffer.concat(chunks).toString("utf-8")));
    request.on("error", reject);
  });
}

function readRawBody(request, maxBodyBytes = maxImageBodyBytes, oversizeMessage = "请求体过大。") {
  return new Promise((resolveBody, reject) => {
    const chunks = [];
    let size = 0;
    request.on("data", (chunk) => {
      size += chunk.length;
      if (size > maxBodyBytes) {
        request.destroy();
        reject(new Error(oversizeMessage));
        return;
      }
      chunks.push(chunk);
    });
    request.on("end", () => resolveBody(Buffer.concat(chunks)));
    request.on("error", reject);
  });
}

async function readJsonBody(request, maxBodyBytes = maxImageBodyBytes, oversizeMessage = "请求体过大。") {
  const body = await readBody(request, maxBodyBytes, oversizeMessage);
  return JSON.parse(body || "{}");
}

function parseDataUrl(dataUrl) {
  const match = /^data:([^;,]+);base64,(.+)$/u.exec(dataUrl);
  if (!match) {
    throw new Error("图片数据格式无效。");
  }
  const mimeType = match[1];
  if (!mimeExt[mimeType]) {
    throw new Error("只支持 PNG、JPEG、WEBP、GIF、SVG 图片。");
  }
  return { mimeType, bytes: Buffer.from(match[2], "base64") };
}

function parseGenericDataUrl(dataUrl, fallbackMimeType = "application/octet-stream") {
  const match = /^data:([^;,]+)?;base64,(.+)$/u.exec(dataUrl);
  if (!match) {
    throw new Error("文件数据格式无效。");
  }
  return {
    mimeType: match[1] || fallbackMimeType,
    bytes: Buffer.from(match[2], "base64")
  };
}

function safeName(name) {
  return String(name || "未命名图片").replace(/[\\/:*?"<>|]+/g, "_").slice(0, maxFilePartLength);
}

function safeFilePart(name, fallback = "未命名") {
  return String(name || fallback)
    .trim()
    .replace(/[\\/:*?"<>|]+/g, "_")
    .slice(0, maxFilePartLength) || fallback;
}

function normalizeProjectForStorage(project) {
  const indexed = assignMissingDeviceIndexes(Array.isArray(project?.nodes) ? project.nodes : [], project?.deviceIndexCounters);
  return {
    ...project,
    powerUnit: project.powerUnit ?? defaultPowerUnit,
    voltageUnit: project.voltageUnit ?? defaultVoltageUnit,
    currentUnit: project.currentUnit ?? defaultCurrentUnit,
    powerBaseValue:
      typeof project.powerBaseValue === "number" && Number.isFinite(project.powerBaseValue)
        ? project.powerBaseValue
        : defaultPowerBaseValue,
    deviceIndexCounters: indexed.counters,
    nodes: indexed.nodes.map((node) => {
      const assetId = node?.params?.backgroundImageAssetId;
      const backgroundImage = node?.params?.backgroundImage;
      const params = {
        ...(node?.params ?? {}),
        ...(assetId && typeof backgroundImage === "string" && backgroundImage.startsWith("data:")
          ? { backgroundImage: `/webgrp/images/${assetId}` }
          : {})
      };
      return { ...node, params };
    }),
    edges: Array.isArray(project?.edges) ? project.edges : []
  };
}

function uniqueRecordNameForFilePartStorage(baseName, existingNames, fallback) {
  const base = String(baseName || "").trim() || fallback;
  const usedNames = new Set(existingNames.map((name) => String(name || "").trim()).filter(Boolean));
  const usedFileParts = new Set(existingNames.map((name) => safeFilePart(name, fallback)).filter(Boolean));
  const available = (name) => !usedNames.has(name) && !usedFileParts.has(safeFilePart(name, fallback));
  if (available(base)) {
    return base;
  }
  let index = 2;
  let candidate = base;
  do {
    const suffix = ` (${index})`;
    const baseLimit = Math.max(1, maxFilePartLength - suffix.length);
    const visibleBase = base.slice(0, baseLimit).trim() || fallback.slice(0, baseLimit).trim() || fallback;
    candidate = `${visibleBase}${suffix}`;
    index += 1;
  } while (!available(candidate));
  return candidate;
}

function savedRecordTimestamp(value) {
  const timestamp = Date.parse(value ?? "");
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function storageProjectDisplayName(name, fallback = "未命名模型") {
  const normalized = String(name || "").trim().replace(/电力系统/g, "电力能源系统") || fallback;
  const suffixMatch = /^(.*?)\s*\((\d+)\)$/u.exec(normalized);
  if (!suffixMatch) {
    return normalized;
  }
  const base = suffixMatch[1].trim();
  return base && !base.endsWith("副本") ? base : normalized;
}

function storageProjectNameKey(name) {
  return storageProjectDisplayName(name).toLocaleLowerCase();
}

function normalizeSchemeProjectRecordNamesForStorage(projects) {
  const normalized = [];
  const indexByNameKey = new Map();
  for (const record of projects) {
    const { id: _projectRuntimeId, ...recordWithoutRuntimeId } = record ?? {};
    const name = storageProjectDisplayName(record?.name);
    const nextRecord = {
      ...recordWithoutRuntimeId,
      name,
      project: {
        ...(record?.project ?? {}),
        name
      }
    };
    const key = storageProjectNameKey(name);
    const existingIndex = indexByNameKey.get(key);
    if (existingIndex === undefined) {
      indexByNameKey.set(key, normalized.length);
      normalized.push(nextRecord);
      continue;
    }
    const existing = normalized[existingIndex];
    if (savedRecordTimestamp(nextRecord.updatedAt) >= savedRecordTimestamp(existing.updatedAt)) {
      normalized[existingIndex] = nextRecord;
    }
  }
  return normalized;
}

function normalizeSchemeRecordNamesForStorage(schemes) {
  const usedNames = [];
  return schemes.map((scheme) => {
    const { id: _schemeRuntimeId, ...schemeWithoutRuntimeId } = scheme ?? {};
    const name = uniqueRecordNameForFilePartStorage(scheme?.name, usedNames, "未命名方案");
    usedNames.push(name);
    return {
      ...schemeWithoutRuntimeId,
      name,
      children: Array.isArray(scheme?.children) ? normalizeSchemeRecordNamesForStorage(scheme.children) : []
    };
  });
}

function normalizeSchemesForStorage(schemes) {
  return normalizeSchemeRecordNamesForStorage(schemes).map((scheme) => ({
    ...scheme,
    projects: Array.isArray(scheme.projects)
      ? normalizeSchemeProjectRecordNamesForStorage(
          scheme.projects.map((project) => ({
            ...project,
            project: normalizeProjectForStorage(project.project)
          }))
        )
      : [],
    children: Array.isArray(scheme.children) ? normalizeSchemesForStorage(scheme.children) : []
  }));
}

function inferESection(kind, params = {}) {
  if (kind === "ac-bus") return "ACRealBs";
  if (kind === "dc-bus") return "DCRealBs";
  if (isStaticKind(kind)) {
    const componentLibrary = String(params.component_type ?? "").trim();
    return componentLibrary && componentLibrary !== "StaticSymbol" ? componentLibrary : staticComponentLibraryForKind(kind);
  }
  if (params.component_type && eSectionColumns[params.component_type]) return params.component_type;
  if (kind === "ac-line") return "ACBranch";
  if (kind === "dc-line") return "DCBranch";
  if (kind === "ac-load" || kind === "ac-terminal-transformer-load") return "ACLoad";
  if (kind === "dc-load") return "DCLoad";
  if (kind === "hydrogen-source") return "HydroSource";
  if (kind === "hydrogen-load") return "HydroLoad";
  if (kind === "hydrogen-pipeline") return "HydroPipe";
  if (kind === "hydrogen-compressor") return "HydroCompressor";
  if (kind === "hydrogen-pressure-reducer") return "HydroPressRegulator";
  if (kind === "hydrogen-shutoff-valve") return "HydroStopValve";
  if (kind === "hydrogen-bus") return "HydroBus";
  if (kind === "hydrogen-tank" || kind === "hydrogen-tank-horizontal" || kind === "hydrogen-tank-container") return "HydroStorage";
  if (kind === "ac-electrolyzer") return "AcE2Hydro";
  if (kind === "dc-electrolyzer") return "DcE2Hydro";
  if (kind === "ac-fuel-cell") return "Hydro2AcE";
  if (kind === "dc-fuel-cell") return "Hydro2DcE";
  if (kind === "heat-source" || kind === "single-port-heat-source") return "HeatSource";
  if (kind === "two-port-heat-source") return "HeatSource2";
  if (kind === "single-port-heat-load" || kind === "heat-load") return "HeatLoad";
  if (kind === "two-port-heat-load") return "HeatLoad2";
  if (kind === "heat-pipeline") return "HeatPipe";
  if (kind === "heat-shutoff-valve") return "HeatStopValve";
  if (kind === "heat-bus") return "HeatBus";
  if (kind === "thermal-storage-tank") return "HeatStorage";
  if (kind === "heat-boiler") return "HeatBoiler";
  if (kind === "two-port-heat-boiler") return "HeatBoiler2";
  if (kind === "ac-heater") return "AcElec2Heat";
  if (kind === "dc-heater") return "DcElec2Heat";
  if (kind === "ac-two-port-heater") return "AcElec2Heat2";
  if (kind === "dc-two-port-heater") return "DcElec2Heat2";
  if (kind === "heat-exchanger") return "HeatExchanger";
  if (kind === "three-port-heat-exchanger") return "HeatExchanger3";
  if (kind === "four-port-heat-exchanger") return "HeatExchanger4";
  if (kind === "heat-pump") return "HeatPump";
  if (kind?.startsWith("ac-") && kind.includes("source")) return "ACGenerator";
  if (kind?.startsWith("dc-") && kind.includes("source")) return "DCGenerator";
  if (kind === "ac-switch" || kind === "ac-disconnector") return "ACSwitch";
  if (kind === "ac-ground-disconnector" || kind === "ac-ground-disconnector-vertical") return "GroundDisconnector";
  if (kind === "dc-switch" || kind === "dc-disconnector") return "DCSwitch";
  if (kind === "ac-breaker" || kind === "ac-box-breaker") return "ACBreak";
  if (kind === "dc-breaker") return "DCBreak";
  if (kind === "ac-transformer" || kind === "ac-two-winding-transformer") return "ACTransformer";
  if (kind === "ac-three-winding-transformer" || kind === "ac-three-winding-transformer-neutral") return "ACTransfomer3";
  if (kind === "dcdc-converter") return "DCDCConverter";
  if (kind === "acdc-converter" || kind === "dcac-converter" || kind === "dcac-converter-vertical") return "DCACConverter";
  if (kind === "acac-converter") return "ACACConverter";
  return "";
}

function parseDeviceIndex(value) {
  const text = String(value ?? "").trim();
  if (!/^[1-9]\d*$/.test(text)) {
    return 0;
  }
  return Number.parseInt(text, 10);
}

function deriveDeviceIndexCounters(nodes) {
  const counters = {};
  for (const node of nodes) {
    const section = inferESection(node?.kind, node?.params ?? {});
    if (!section) {
      continue;
    }
    const idx = parseDeviceIndex(node?.params?.idx);
    if (idx > (counters[section] ?? 0)) {
      counters[section] = idx;
    }
  }
  return counters;
}

function normalizeDeviceIndexCounters(counters, nodes = []) {
  const normalized = {};
  for (const [section, value] of Object.entries(counters ?? {})) {
    const numeric = Number(value);
    const safeValue = Number.isFinite(numeric) ? Math.max(0, Math.floor(numeric)) : 0;
    if (safeValue > 0) {
      normalized[section] = safeValue;
    }
  }
  const derived = deriveDeviceIndexCounters(nodes);
  for (const [section, value] of Object.entries(derived)) {
    normalized[section] = Math.max(normalized[section] ?? 0, value);
  }
  return normalized;
}

function assignPermanentDeviceIndex(node, counters = {}) {
  const section = inferESection(node?.kind, node?.params ?? {});
  if (!section) {
    return { node, counters };
  }
  const existingIdx = parseDeviceIndex(node?.params?.idx);
  if (existingIdx > 0) {
    if (existingIdx <= (counters[section] ?? 0)) {
      return { node, counters };
    }
    return { node, counters: { ...counters, [section]: existingIdx } };
  }
  const idx = (counters[section] ?? 0) + 1;
  return {
    node: { ...node, params: { ...(node?.params ?? {}), idx: String(idx) } },
    counters: { ...counters, [section]: idx }
  };
}

function assignMissingDeviceIndexes(nodes, counters) {
  let nextCounters = normalizeDeviceIndexCounters(counters, nodes);
  let changed = false;
  const nextNodes = nodes.map((node) => {
    const result = assignPermanentDeviceIndex(node, nextCounters);
    nextCounters = result.counters;
    if (result.node !== node) {
      changed = true;
    }
    return result.node;
  });
  return { nodes: changed ? nextNodes : nodes, counters: nextCounters };
}

function normalizeRunStatForE(value) {
  if (!value) return "";
  if (value === "运行") return "1";
  if (value === "停运" || value === "检修") return "0";
  return value;
}

function normalizeSwitchStatusForE(value) {
  if (!value) return "";
  if (value === "闭合") return "1";
  if (value === "合闸") return "1";
  if (value === "打开") return "0";
  if (value === "分闸") return "0";
  return value;
}

const serverBinaryStateDefinitions = [
  { value: "0", name: "打开/开断" },
  { value: "1", name: "闭合" }
];

function normalizeServerDeviceStateValue(value) {
  return String(value ?? "").trim();
}

function normalizeServerDeviceStateDefinitions(value) {
  if (!Array.isArray(value)) {
    return [];
  }
  const seen = new Set();
  const states = [];
  for (const item of value) {
    if (!item || typeof item !== "object") {
      continue;
    }
    const stateValue = normalizeServerDeviceStateValue(item.value);
    if (!stateValue || seen.has(stateValue)) {
      continue;
    }
    seen.add(stateValue);
    states.push({
      ...item,
      value: stateValue,
      name: normalizeServerDeviceStateValue(item.name) || stateValue
    });
  }
  return states;
}

function serverDeviceHasDefaultBinaryStates(kind, params = {}) {
  const section = inferESection(kind, params);
  return Boolean(
    eSectionColumns[section]?.includes("status") ||
    String(kind ?? "").includes("switch") ||
    String(kind ?? "").includes("breaker") ||
    String(kind ?? "").includes("disconnector") ||
    String(kind ?? "").includes("valve")
  );
}

function serverTemplateStateDefinitions(node, template) {
  if (Array.isArray(template?.stateDefinitions)) {
    return normalizeServerDeviceStateDefinitions(template.stateDefinitions);
  }
  return serverDeviceHasDefaultBinaryStates(node?.kind, node?.params ?? {})
    ? serverBinaryStateDefinitions
    : [];
}

function serverResolvedStateValue(node, states) {
  if (!states.length) {
    return "";
  }
  const explicit = normalizeServerDeviceStateValue(node?.params?.status ?? node?.params?.closedStatus);
  if (explicit) {
    const exact = states.find((state) => state.value === explicit);
    if (exact) {
      return exact.value;
    }
    const normalized = normalizeSwitchStatusForE(explicit);
    const mapped = states.find((state) => normalizeSwitchStatusForE(state.value) === normalized);
    if (mapped) {
      return mapped.value;
    }
    return normalized || explicit;
  }
  if (String(node?.kind ?? "").includes("ground-disconnector")) {
    return states.find((state) => state.value === "0")?.value ?? states[0]?.value ?? "";
  }
  return states.find((state) => state.value === "1")?.value ?? states[0]?.value ?? "";
}

function serverStateSymbolKey(value) {
  const stateValue = normalizeServerDeviceStateValue(value);
  return stateValue ? svgSafeId(`state_${stateValue}`, "state_default") : "default";
}

function terminalNodeNumber(node, index) {
  return node?.terminals?.[index]?.nodeNumber ?? (index === 0 ? node?.nodeNumber : "") ?? "";
}

function mappedLegacyEValue(key, params = {}) {
  if (key === "pbase") return params.pbase ?? params.ratedActivePower ?? "";
  if (key === "qbase") return params.qbase ?? params.ratedReactivePower ?? "";
  if (key === "r") return params.r ?? params.resistancePu ?? "";
  if (key === "x") return params.x ?? params.reactancePu ?? "";
  if (key === "b") return params.b ?? params.halfChargingSusceptancePu ?? "";
  if (key === "gt") return params.gt ?? params.magnetizingConductancePu ?? "";
  if (key === "bt") return params.bt ?? params.magnetizingSusceptancePu ?? "";
  if (key === "tap") return params.tap ?? params.tapRatio ?? "";
  if (key === "r1") return params.r1 ?? params.sourceEquivalentResistance ?? "";
  if (key === "r2") return params.r2 ?? params.targetEquivalentResistance ?? "";
  return params[key] ?? "";
}

function getRawEParamValue(key, node, options = {}) {
  const params = node?.params ?? {};
  if (key === "name") return node?.name ?? "";
  if (key === "run_stat") return normalizeRunStatForE(params.run_stat);
  if (key === "status") return normalizeSwitchStatusForE(params.status ?? params.closedStatus);
  if (key === "control_type") return params.control_type ?? params.controlType ?? params.sourceControlType ?? "";
  if (key === "vbase") return params.vbase ?? node?.terminals?.[0]?.vbase ?? "";
  if (key === "node") return options.preferTopologyNodeNumbers ? terminalNodeNumber(node, 0) : params.node ?? terminalNodeNumber(node, 0);
  if (key === "i_node") return options.preferTopologyNodeNumbers ? terminalNodeNumber(node, 0) : params.i_node ?? terminalNodeNumber(node, 0);
  if (key === "j_node") return options.preferTopologyNodeNumbers ? terminalNodeNumber(node, 1) : params.j_node ?? terminalNodeNumber(node, 1);
  if (node?.kind === "ac-three-winding-transformer" || node?.kind === "ac-three-winding-transformer-neutral") {
    const terminalNodeMatch = /^t([123])_node$/.exec(key);
    if (terminalNodeMatch) {
      const terminalIndex = Number.parseInt(terminalNodeMatch[1], 10) - 1;
      return options.preferTopologyNodeNumbers
        ? terminalNodeNumber(node, terminalIndex)
        : params[key] ?? terminalNodeNumber(node, terminalIndex);
    }
    if (key === "neutral_node") {
      if (node?.kind !== "ac-three-winding-transformer-neutral") {
        return "0";
      }
      const visibleNeutralNode = terminalNodeNumber(node, 3);
      return options.preferTopologyNodeNumbers
        ? visibleNeutralNode || params.neutral_node || ""
        : params.neutral_node ?? visibleNeutralNode;
    }
    const sideParameterMatch = /^(r|x|gt|bt|tap|shift)([123])$/.exec(key);
    if (sideParameterMatch) {
      const sidePrefix = ["high", "medium", "low"][Number.parseInt(sideParameterMatch[2], 10) - 1];
      const parameterSuffix = {
        r: "ResistancePu",
        x: "ReactancePu",
        gt: "MagnetizingConductancePu",
        bt: "MagnetizingSusceptancePu",
        tap: "TapRatio",
        shift: "Shift"
      };
      return params[`${sidePrefix}${parameterSuffix[sideParameterMatch[1]]}`] ?? "";
    }
  }
  if (key === "ac_node") {
    const acNodeNumber = node?.terminals?.find((terminal) => terminal.type === "ac")?.nodeNumber ?? terminalNodeNumber(node, 0);
    return options.preferTopologyNodeNumbers ? acNodeNumber : params.ac_node ?? acNodeNumber;
  }
  if (key === "dc_node") {
    const dcNodeNumber = node?.terminals?.find((terminal) => terminal.type === "dc")?.nodeNumber ?? terminalNodeNumber(node, 1);
    return options.preferTopologyNodeNumbers ? dcNodeNumber : params.dc_node ?? dcNodeNumber;
  }
  return mappedLegacyEValue(key, params);
}

const legacyEDefinitionColumnAliases = {
  ratedActivePower: "pbase",
  ratedReactivePower: "qbase",
  resistancePu: "r",
  reactancePu: "x",
  halfChargingSusceptancePu: "b",
  magnetizingConductancePu: "gt",
  magnetizingSusceptancePu: "bt",
  tapRatio: "tap",
  sourceEquivalentResistance: "r1",
  targetEquivalentResistance: "r2",
  controlType: "control_type",
  acControlType: "control_type",
  dcControlType: "control_type",
  closedStatus: "status"
};

function storedEParameterDefinitions(params = {}) {
  try {
    const parsed = JSON.parse(params._customParamDefinitions ?? "[]");
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed
      .filter((definition) => definition && typeof definition === "object")
      .map((definition) => ({
        ...definition,
        enName: String(definition.enName ?? "").trim(),
        exportName: typeof definition.exportName === "string" ? definition.exportName.trim() : definition.exportName
      }))
      .filter((definition) => definition.enName && !definition.enName.startsWith("_") && definition.enName !== "component_type");
  } catch {
    return [];
  }
}

function legacyEColumnForDefinition(section, enName) {
  const columns = eSectionColumns[section];
  if (!columns) {
    return "";
  }
  if (columns.includes(enName)) {
    return enName;
  }
  if (enName === "t1_node") {
    if (columns.includes("i_node")) return "i_node";
    if (columns.includes("node")) return "node";
  }
  if (enName === "t2_node" && columns.includes("j_node")) {
    return "j_node";
  }
  if (enName === "sourceControlType") {
    if (columns.includes("i_control_type")) return "i_control_type";
    if (columns.includes("control_type")) return "control_type";
  }
  if (enName === "targetControlType") {
    if (columns.includes("j_control_type")) return "j_control_type";
    if (columns.includes("control_type")) return "control_type";
  }
  if (section === "ACTransfomer3") {
    const sideMatch = /^(high|medium|low)(ResistancePu|ReactancePu|MagnetizingConductancePu|MagnetizingSusceptancePu|TapRatio|Shift)$/.exec(enName);
    if (sideMatch) {
      const sideIndex = { high: "1", medium: "2", low: "3" }[sideMatch[1]];
      const prefix = {
        ResistancePu: "r",
        ReactancePu: "x",
        MagnetizingConductancePu: "gt",
        MagnetizingSusceptancePu: "bt",
        TapRatio: "tap",
        Shift: "shift"
      }[sideMatch[2]];
      const column = `${prefix}${sideIndex}`;
      return columns.includes(column) ? column : "";
    }
  }
  const alias = legacyEDefinitionColumnAliases[enName];
  return alias && columns.includes(alias) ? alias : "";
}

function parameterDefinitionExportSettings(kind, params, definition) {
  const section = inferESection(kind, params);
  const enName = String(definition?.enName ?? "").trim();
  const legacyColumn = section ? legacyEColumnForDefinition(section, enName) : "";
  const configuredExportName = typeof definition?.exportName === "string" ? definition.exportName.trim() : "";
  const exportEnabled = typeof definition?.exportEnabled === "boolean"
    ? definition.exportEnabled
    : Boolean(section && (eSectionColumns[section] ? legacyColumn : enName));
  return {
    exportEnabled,
    exportName: configuredExportName || (exportEnabled ? legacyColumn || enName : "")
  };
}

function resolveEParameterFields(kind, params = {}) {
  const section = inferESection(kind, params);
  if (!section) {
    return [];
  }
  const definitions = storedEParameterDefinitions(params);
  const builtInColumns = eSectionColumns[section];
  if (!definitions.length) {
    return (builtInColumns ?? []).map((column) => ({ sourceName: column, exportName: column }));
  }
  const fields = [];
  const seenExportNames = new Set();
  const appendField = (field) => {
    if (!field.exportName || seenExportNames.has(field.exportName)) {
      return;
    }
    seenExportNames.add(field.exportName);
    fields.push(field);
  };
  if (builtInColumns) {
    const definitionByLegacyColumn = new Map();
    const definitionsMappedToLegacyColumns = new Set();
    for (const definition of definitions) {
      const legacyColumn = legacyEColumnForDefinition(section, definition.enName);
      if (!legacyColumn) {
        continue;
      }
      definitionsMappedToLegacyColumns.add(definition);
      const current = definitionByLegacyColumn.get(legacyColumn);
      if (!current || definition.enName === legacyColumn) {
        definitionByLegacyColumn.set(legacyColumn, definition);
      }
    }
    for (const column of builtInColumns) {
      const definition = definitionByLegacyColumn.get(column);
      if (!definition) {
        appendField({ sourceName: column, exportName: column });
        continue;
      }
      const settings = parameterDefinitionExportSettings(kind, params, definition);
      if (settings.exportEnabled) {
        appendField({ sourceName: column, exportName: settings.exportName, definition });
      }
    }
    for (const definition of definitions) {
      if (definitionsMappedToLegacyColumns.has(definition)) {
        continue;
      }
      const settings = parameterDefinitionExportSettings(kind, params, definition);
      if (settings.exportEnabled) {
        appendField({ sourceName: definition.enName, exportName: settings.exportName, definition });
      }
    }
    return fields;
  }
  for (const definition of definitions) {
    const settings = parameterDefinitionExportSettings(kind, params, definition);
    if (settings.exportEnabled) {
      appendField({ sourceName: definition.enName, exportName: settings.exportName, definition });
    }
  }
  return fields;
}

function getEParameterKeys(kind, params = {}) {
  return resolveEParameterFields(kind, params).map((field) => field.exportName);
}

function buildEDeviceValuesFromFields(node, fields, options = {}) {
  const values = {};
  for (const field of fields) {
    const value = getRawEParamValue(field.sourceName, node, options);
    if (value !== "") {
      values[field.exportName] = value;
    }
  }
  return values;
}

function buildEDeviceValues(node, options = {}) {
  return buildEDeviceValuesFromFields(node, resolveEParameterFields(node.kind, node.params), options);
}

const eFileColumnGap = "    ";
const eFileWideCharWidth = 5 / 3;
const eSectionPrimaryOrder = ["ACNode", "DCNode"];

function eFileCellText(value) {
  return String(value ?? "");
}

function eFileCellDisplayWidth(value) {
  let width = 0;
  for (const char of eFileCellText(value)) {
    width += /[\u1100-\u115f\u2329\u232a\u2e80-\ua4cf\uac00-\ud7a3\uf900-\ufaff\ufe10-\ufe19\ufe30-\ufe6f\uff00-\uff60\uffe0-\uffe6]/u.test(char)
      ? eFileWideCharWidth
      : 1;
  }
  return width;
}

function eFilePadCell(value, width) {
  const text = eFileCellText(value);
  const padding = Math.max(0, Math.round(width - eFileCellDisplayWidth(text)));
  return `${text}${" ".repeat(padding)}`;
}

function eColumnsForRecords(section, records) {
  const columns = [];
  const seen = new Set();
  for (const record of records) {
    const recordColumns = record.columns ?? eSectionColumns[section] ?? Object.keys(record.params ?? {});
    for (const column of recordColumns) {
      if (!column || column.startsWith("_") || seen.has(column)) {
        continue;
      }
      seen.add(column);
      columns.push(column);
    }
  }
  return columns.length ? columns : eSectionColumns[section] ?? [];
}

function formatESection(section, columns, records) {
  if (!columns.length || !records.length) {
    return "";
  }
  const rows = records.map((record) => columns.map((column) => eFileCellText(record.params?.[column])));
  const widths = columns.map((column, columnIndex) =>
    Math.max(eFileCellDisplayWidth(column), ...rows.map((row) => eFileCellDisplayWidth(row[columnIndex])))
  );
  const formatRow = (prefix, cells) =>
    [prefix, ...cells.map((cell, index) => eFilePadCell(cell, widths[index]))].join(eFileColumnGap).trimEnd();
  return [
    `<${section}>`,
    formatRow("@", columns),
    ...rows.map((row) => formatRow("#", row)),
    `</${section}>`
  ].join("\n");
}

function orderedESections(recordsBySection) {
  const seen = new Set();
  const ordered = [];
  for (const section of eSectionPrimaryOrder) {
    if (recordsBySection.has(section)) {
      ordered.push(section);
      seen.add(section);
    }
  }
  for (const section of Object.keys(eSectionColumns)) {
    if (!seen.has(section) && recordsBySection.has(section)) {
      ordered.push(section);
      seen.add(section);
    }
  }
  for (const section of recordsBySection.keys()) {
    if (!seen.has(section)) {
      ordered.push(section);
    }
  }
  return ordered;
}

function isBusNode(node) {
  return node?.kind === "ac-bus" || node?.kind === "dc-bus";
}

function isStaticKind(kind) {
  return String(kind ?? "").startsWith("static-");
}

function isStaticNode(node) {
  return isStaticKind(node?.kind);
}

function getTerminal(node, terminalId) {
  return node?.terminals?.find((terminal) => terminal.id === terminalId) ?? node?.terminals?.[0];
}

function calculateElectricalTopology(nodes = [], edges = []) {
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const terminalKey = (nodeId, terminalId) => `${nodeId}:${terminalId}`;
  const parent = new Map();
  const find = (key) => {
    const current = parent.get(key);
    if (!current || current === key) return key;
    const root = find(current);
    parent.set(key, root);
    return root;
  };
  const union = (first, second) => {
    const firstRoot = find(first);
    const secondRoot = find(second);
    if (firstRoot !== secondRoot) parent.set(secondRoot, firstRoot);
  };

  for (const node of nodes) {
    for (const terminal of node.terminals ?? []) {
      const key = terminalKey(node.id, terminal.id);
      parent.set(key, key);
    }
    if (isBusNode(node)) {
      const terminalsByType = new Map();
      for (const terminal of node.terminals ?? []) {
        terminalsByType.set(terminal.type, [...(terminalsByType.get(terminal.type) ?? []), terminal]);
      }
      for (const terminals of terminalsByType.values()) {
        const [first, ...rest] = terminals;
        for (const terminal of rest) {
          union(terminalKey(node.id, first.id), terminalKey(node.id, terminal.id));
        }
      }
    }
  }

  for (const edge of edges) {
    const source = nodeById.get(edge.sourceId);
    const target = nodeById.get(edge.targetId);
    if (!source || !target) continue;
    const sourceTerminal = getTerminal(source, edge.sourceTerminalId);
    const targetTerminal = getTerminal(target, edge.targetTerminalId);
    if (!sourceTerminal || !targetTerminal || sourceTerminal.type !== targetTerminal.type) continue;
    union(terminalKey(source.id, sourceTerminal.id), terminalKey(target.id, targetTerminal.id));
  }

  const nextTopologyNumberByType = { ac: 1, dc: 1 };
  const numberByTypeAndRoot = { ac: new Map(), dc: new Map() };
  const getTopologyNumber = (key, type) => {
    if (!numberByTypeAndRoot[type]) {
      numberByTypeAndRoot[type] = new Map();
      nextTopologyNumberByType[type] = 1;
    }
    const root = find(key);
    const numberByRoot = numberByTypeAndRoot[type];
    const existing = numberByRoot.get(root);
    if (existing) return existing;
    const next = String(nextTopologyNumberByType[type]++);
    numberByRoot.set(root, next);
    return next;
  };

  return nodes.map((node) => {
    const terminals = (node.terminals ?? []).map((terminal) => {
      const key = terminalKey(node.id, terminal.id);
      return { ...terminal, nodeNumber: getTopologyNumber(key, terminal.type) };
    });
    const acTopologyNode = Number(terminals.find((terminal) => terminal.type === "ac")?.nodeNumber ?? 0);
    const dcTopologyNode = Number(terminals.find((terminal) => terminal.type === "dc")?.nodeNumber ?? 0);
    return {
      ...node,
      acTopologyNode,
      dcTopologyNode,
      nodeNumber: terminals.length === 1 ? terminals[0].nodeNumber : node.nodeNumber,
      terminals
    };
  });
}

function firstText(values) {
  return values.find((value) => value !== undefined && String(value).trim() !== "") ?? "";
}

function normalizeVoltageBaseInput(value) {
  let normalized = "";
  let hasDecimalPoint = false;
  for (const char of String(value ?? "")) {
    if (/\d/.test(char)) {
      normalized += char;
      continue;
    }
    if (char === "." && !hasDecimalPoint) {
      normalized += char;
      hasDecimalPoint = true;
    }
  }
  return normalized;
}

function terminalVoltageDisplay(node, terminal) {
  const params = node?.params ?? {};
  return normalizeVoltageBaseInput(firstText([
    terminal?.vbase,
    params.vbase,
    params.highVbase,
    params.mediumVbase,
    params.lowVbase,
    params.sourceVbase,
    params.targetVbase,
    params.voltageLevel,
    params.ratedVoltage,
    params.voltage
  ]));
}

function topologyRepresentativeScore(node) {
  if (isBusNode(node)) return 0;
  if ((node?.terminals ?? []).length === 1) return 1;
  if (String(node?.kind ?? "").includes("converter") || String(node?.kind ?? "").includes("transformer")) return 2;
  return 3;
}

function buildTopologyNodeDevices(nodes) {
  const groups = { ac: new Map(), dc: new Map() };
  for (const node of nodes) {
    if (isStaticNode(node)) continue;
    for (const terminal of node.terminals ?? []) {
      if (!terminal.nodeNumber) continue;
      const group = groups[terminal.type];
      if (!group) continue;
      const candidates = group.get(terminal.nodeNumber) ?? [];
      candidates.push({ node, terminal });
      group.set(terminal.nodeNumber, candidates);
    }
  }

  const buildForType = (type, section) =>
    Array.from(groups[type].entries())
      .sort(([first], [second]) => Number(first) - Number(second))
      .map(([idx, candidates]) => {
        const representative = [...candidates].sort(
          (first, second) => topologyRepresentativeScore(first.node) - topologyRepresentativeScore(second.node)
        )[0];
        const vbase = firstText(candidates.map(({ node, terminal }) => terminalVoltageDisplay(node, terminal)));
        const voltage = firstText([representative.node?.params?.voltage, vbase]);
        const runStat = normalizeRunStatForE(representative.node?.params?.run_stat) || "1";
        const commonParams = {
          idx,
          name: representative.node?.name || `${section}_${idx}`,
          vbase,
          voltage,
          isl: representative.node?.params?.isl ?? "0",
          run_stat: runStat
        };
        return {
          id: `${section}-${idx}`,
          kind: type === "ac" ? "ac-node" : "dc-node",
          section,
          params: section === "ACNode" ? { ...commonParams, angle: representative.node?.params?.angle ?? "0" } : commonParams
        };
      });

  return [...buildForType("ac", "ACNode"), ...buildForType("dc", "DCNode")];
}

function buildDeviceParameterFile(project, schemePath = ["默认方案"]) {
  const topologyNodes = calculateElectricalTopology(project.nodes ?? [], project.edges ?? []);
  const topologyNodeDevices = buildTopologyNodeDevices(topologyNodes);
  const deviceRecords = topologyNodes
    .map((node) => {
      const section = inferESection(node.kind, node.params ?? {});
      if (!section || section === "ACNode" || section === "DCNode") return null;
      const fields = resolveEParameterFields(node.kind, node.params ?? {});
      const columns = fields.map((field) => field.exportName);
      if (!columns.length) return null;
      return {
        id: node.id,
        kind: node.kind,
        section,
        params: buildEDeviceValuesFromFields(node, fields, { preferTopologyNodeNumbers: true }),
        columns
      };
    })
    .filter(Boolean);
  const recordsBySection = new Map();
  for (const record of [...topologyNodeDevices, ...deviceRecords]) {
    const columns = record.columns ?? eSectionColumns[record.section] ?? [];
    if (!columns.length) {
      continue;
    }
    recordsBySection.set(record.section, [...(recordsBySection.get(record.section) ?? []), record]);
  }
  const modelPath = (Array.isArray(schemePath) ? schemePath : [])
    .map((part) => String(part ?? "").trim().replace(/\s+/g, "_"))
    .filter(Boolean)
    .join("/") || "默认方案";
  const modelName = String(project.name ?? "").trim().replace(/\s+/g, "_") || "未命名";
  const sections = [
    formatESection("Model", ["path", "name", "p_base", "u_unit", "p_unit", "i_unit"], [
      {
        params: {
          path: modelPath,
          name: modelName,
          p_base: project.powerBaseValue ?? defaultPowerBaseValue,
          u_unit: project.voltageUnit ?? defaultVoltageUnit,
          p_unit: project.powerUnit ?? defaultPowerUnit,
          i_unit: project.currentUnit ?? defaultCurrentUnit
        }
      }
    ]),
    ...orderedESections(recordsBySection).map((section) =>
      formatESection(section, eColumnsForRecords(section, recordsBySection.get(section) ?? []), recordsBySection.get(section) ?? [])
    )
  ].filter(Boolean);
  return `${sections.join("\n\n")}\n`;
}

function endpointPoint(project, edge, side) {
  const node = (project.nodes ?? []).find((item) => item.id === (side === "source" ? edge.sourceId : edge.targetId));
  const explicit = side === "source" ? edge.sourcePoint : edge.targetPoint;
  if (explicit) {
    return explicit;
  }
  if (!node) {
    return { x: 0, y: 0 };
  }
  const terminalId = side === "source" ? edge.sourceTerminalId : edge.targetTerminalId;
  const terminal = (node.terminals ?? []).find((item) => item.id === terminalId) ?? node.terminals?.[0];
  return {
    x: Math.round(node.position.x + (terminal?.anchor?.x ?? 0) * (node.size?.width ?? 0)),
    y: Math.round(node.position.y + (terminal?.anchor?.y ?? 0) * (node.size?.height ?? 0))
  };
}

function escapeSvgAttribute(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escapeSvgText(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function backendImageIdFromHref(value) {
  const match = backendImageHrefPattern.exec(String(value ?? "").trim());
  if (!match) {
    return "";
  }
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
  }
}

function safeImageExportFilename(value) {
  const normalized = String(value ?? "").trim().replace(/\\/gu, "/");
  return normalized.split("/").filter(Boolean).pop() ?? "";
}

async function imageFileToDataUrl(item) {
  const filename = safeImageExportFilename(item?.filename ?? "");
  const mimeType = String(item?.mimeType ?? "").trim();
  if (!filename || !mimeType.startsWith("image/")) {
    return "";
  }
  const bytes = await readFile(join(imageDataDir, filename));
  return `data:${mimeType};base64,${bytes.toString("base64")}`;
}

async function imageExportPathByIdFromManifest(manifest) {
  const result = {};
  await Promise.all((Array.isArray(manifest) ? manifest : []).map(async (item) => {
    const id = String(item?.id ?? "").trim();
    if (!id) {
      return;
    }
    try {
      const dataUrl = await imageFileToDataUrl(item);
      if (dataUrl) {
        result[id] = dataUrl;
      }
    } catch {
      // 单张图片文件丢失不应阻断模型保存；导出时保留原始 href。
    }
  }));
  return result;
}

function svgImageHref(value, imagePathById = {}) {
  const originalHref = String(value ?? "");
  const svgSource = decodeSvgImageSource(originalHref);
  let href = originalHref;
  if (svgSource) {
    let changed = false;
    const nextSource = svgSource.replace(
      /(\s(?:xlink:)?href\s*=\s*)(["'])(.*?)\2/giu,
      (match, prefix, quote, rawHref) => {
        const nestedId = backendImageIdFromHref(rawHref);
        const nestedImageHref = nestedId ? imagePathById[nestedId] ?? "" : "";
        if (!/^data:image\//iu.test(nestedImageHref)) {
          return match;
        }
        changed = true;
        return `${prefix}${quote}${escapeSvgAttribute(nestedImageHref)}${quote}`;
      }
    );
    if (changed) {
      href = `data:image/svg+xml;utf8,${encodeURIComponent(nextSource)}`;
    }
  }
  const id = backendImageIdFromHref(href);
  if (!id) {
    return href;
  }
  return imagePathById[id] || href;
}

function decodeSvgImageSource(value) {
  const source = String(value ?? "").trim();
  if (source.startsWith("<svg")) {
    return source;
  }
  if (!/^data:image\/svg\+xml\b/iu.test(source)) {
    return "";
  }
  const commaIndex = source.indexOf(",");
  if (commaIndex < 0) {
    return "";
  }
  const metadata = source.slice(0, commaIndex).toLowerCase();
  const payload = source.slice(commaIndex + 1);
  if (metadata.includes(";base64")) {
    try {
      return Buffer.from(payload.replace(/\s+/g, ""), "base64").toString("utf8").trim();
    } catch {
      return "";
    }
  }
  try {
    return decodeURIComponent(payload).trim();
  } catch {
    return payload.trim();
  }
}

function svgRootAttributeValue(attributes, name) {
  const pattern = new RegExp(`\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`, "iu");
  const match = pattern.exec(attributes);
  return match?.[1] ?? match?.[2] ?? "";
}

function svgLengthNumber(value) {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function stripUnsafeInlineSvgMarkup(value) {
  return value
    .replace(/<script\b[\s\S]*?<\/script>/giu, "")
    .replace(/\s+on[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/giu, "")
    .replace(/\s+(?:href|xlink:href)\s*=\s*(?:"javascript:[^"]*"|'javascript:[^']*')/giu, "");
}

const IMAGE_FIT_MODE_SET = new Set(["cover", "fixed", "fill-x", "fill-y", "stretch", "tile"]);

function normalizeImageFitMode(value) {
  const text = String(value ?? "").trim();
  return IMAGE_FIT_MODE_SET.has(text) ? text : "cover";
}

function imageFitPreserveAspectRatio(value) {
  switch (normalizeImageFitMode(value)) {
    case "fixed":
      return "xMidYMid meet";
    case "fill-x":
      return "xMidYMin slice";
    case "fill-y":
      return "xMinYMid slice";
    case "stretch":
      return "none";
    case "tile":
      return "xMidYMid meet";
    case "cover":
    default:
      return "xMidYMid slice";
  }
}

function inlineSvgRootMarkup(href, { x, y, width, height, className = "", preserveAspectRatio, imageFit }) {
  const source = stripUnsafeInlineSvgMarkup(
    decodeSvgImageSource(href)
      .replace(/^\uFEFF/u, "")
      .replace(/^\s*<\?xml[\s\S]*?\?>/iu, "")
      .replace(/^\s*<!doctype[\s\S]*?>/iu, "")
      .trim()
  );
  const match = source.match(/<svg\b([^>]*)>([\s\S]*?)<\/svg\s*>/iu);
  if (!match) {
    return "";
  }
  const rootAttributes = match[1] ?? "";
  const body = match[2] ?? "";
  const filteredRootAttributes = rootAttributes
    .replace(/\s+(?:x|y|width|height|preserveAspectRatio|class|id)\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/giu, "")
    .trim();
  const svgWidth = svgLengthNumber(svgRootAttributeValue(rootAttributes, "width"));
  const svgHeight = svgLengthNumber(svgRootAttributeValue(rootAttributes, "height"));
  const viewBoxAttribute =
    /\bviewBox\s*=/iu.test(rootAttributes) || svgWidth <= 0 || svgHeight <= 0
      ? ""
      : ` viewBox="0 0 ${formatSvgNumber(svgWidth)} ${formatSvgNumber(svgHeight)}"`;
  const preservedAttributes = filteredRootAttributes ? ` ${filteredRootAttributes}` : "";
  const inlineClassName = ["export-inline-svg-image", className].filter(Boolean).join(" ");
  const resolvedPreserveAspectRatio = preserveAspectRatio ?? imageFitPreserveAspectRatio(imageFit);
  return `<svg class="${escapeSvgAttribute(inlineClassName)}" x="${formatSvgNumber(x)}" y="${formatSvgNumber(y)}" width="${formatSvgNumber(width)}" height="${formatSvgNumber(height)}" preserveAspectRatio="${escapeSvgAttribute(resolvedPreserveAspectRatio)}"${viewBoxAttribute}${preservedAttributes}>${body}</svg>`;
}

function svgImageContentMarkup(href, { x, y, width, height, className = "", preserveAspectRatio, imageFit, patternId, tileWidth, tileHeight }) {
  if (!href) {
    return "";
  }
  const normalizedImageFit = normalizeImageFitMode(imageFit);
  const resolvedPreserveAspectRatio = preserveAspectRatio ?? imageFitPreserveAspectRatio(normalizedImageFit);
  if (normalizedImageFit === "tile") {
    const resolvedTileWidth = Math.max(1, Number.isFinite(Number(tileWidth)) ? Number(tileWidth) : Math.min(Math.max(1, width), 96));
    const resolvedTileHeight = Math.max(1, Number.isFinite(Number(tileHeight)) ? Number(tileHeight) : Math.min(Math.max(1, height), 96));
    const resolvedPatternId = patternId || svgSafeId(`image_tile_${className}_${x}_${y}_${width}_${height}`, "image_tile");
    const classAttribute = className ? ` class="${escapeSvgAttribute(className)}"` : "";
    return `<defs><pattern id="${escapeSvgAttribute(resolvedPatternId)}" x="${formatSvgNumber(x)}" y="${formatSvgNumber(y)}" width="${formatSvgNumber(resolvedTileWidth)}" height="${formatSvgNumber(resolvedTileHeight)}" patternUnits="userSpaceOnUse"><image href="${escapeSvgAttribute(href)}" x="0" y="0" width="${formatSvgNumber(resolvedTileWidth)}" height="${formatSvgNumber(resolvedTileHeight)}" preserveAspectRatio="${escapeSvgAttribute(imageFitPreserveAspectRatio("fixed"))}"/></pattern></defs><rect x="${formatSvgNumber(x)}" y="${formatSvgNumber(y)}" width="${formatSvgNumber(width)}" height="${formatSvgNumber(height)}" fill="url(#${escapeSvgAttribute(resolvedPatternId)})"${classAttribute}/>`;
  }
  const inlineSvg = inlineSvgRootMarkup(href, { x, y, width, height, className, preserveAspectRatio: resolvedPreserveAspectRatio, imageFit: normalizedImageFit });
  if (inlineSvg) {
    return inlineSvg;
  }
  const classAttribute = className ? ` class="${escapeSvgAttribute(className)}"` : "";
  return `<image href="${escapeSvgAttribute(href)}" x="${formatSvgNumber(x)}" y="${formatSvgNumber(y)}" width="${formatSvgNumber(width)}" height="${formatSvgNumber(height)}" preserveAspectRatio="${escapeSvgAttribute(resolvedPreserveAspectRatio)}"${classAttribute}/>`;
}

function svgSafeId(value, fallback) {
  const normalized = String(value ?? "").trim().replace(/[^A-Za-z0-9_.:-]+/g, "_").replace(/^[^A-Za-z_]+/, "");
  return normalized || fallback;
}

function svgLayerId(value, fallback) {
  return `${svgSafeId(value, fallback)}_Layer`;
}

function uniqueSvgId(rawId, usedIds, fallback) {
  const baseId = svgSafeId(rawId, fallback);
  let candidate = baseId;
  let index = 2;
  while (usedIds.has(candidate)) {
    candidate = `${baseId}_${index}`;
    index += 1;
  }
  usedIds.add(candidate);
  return candidate;
}

function buildExportDeviceIdMap(nodes, usedIds) {
  const usedIndexesByType = new Map();
  const staticNodesByType = new Map();
  const result = new Map();
  for (const node of nodes) {
    const inferredSection = inferESection(node?.kind, node?.params ?? {});
    if (isStaticNode(node) || String(inferredSection).startsWith("Static")) {
      const typeId = svgSafeId(String(node?.kind ?? ""), "static");
      const typeNodes = staticNodesByType.get(typeId) ?? [];
      typeNodes.push(node);
      staticNodesByType.set(typeId, typeNodes);
      continue;
    }
    const typeId = svgSafeId(inferredSection || String(node?.kind ?? ""), "device");
    const usedIndexes = usedIndexesByType.get(typeId) ?? new Set();
    usedIndexesByType.set(typeId, usedIndexes);
    const requestedIndexText = String(node?.params?.idx ?? "").trim();
    const requestedIndex = /^[1-9]\d*$/.test(requestedIndexText) ? Number.parseInt(requestedIndexText, 10) : 0;
    if (requestedIndex <= 0) {
      result.set(node.id, uniqueSvgId(node.id, usedIds, "device"));
      continue;
    }
    let exportIndex = requestedIndex;
    while (usedIndexes.has(exportIndex)) exportIndex += 1;
    usedIndexes.add(exportIndex);
    result.set(node.id, uniqueSvgId(`${typeId}-${exportIndex}`, usedIds, "device"));
  }

  for (const [typeId, typeNodes] of Array.from(staticNodesByType.entries()).sort(([left], [right]) => left.localeCompare(right))) {
    const usedIndexes = new Set();
    const indexedNodes = [];
    const unindexedNodes = [];
    for (const node of typeNodes) {
      const requestedIndexText = String(node?.params?.idx ?? "").trim();
      const requestedIndex = /^[1-9]\d*$/.test(requestedIndexText) ? Number.parseInt(requestedIndexText, 10) : 0;
      if (requestedIndex > 0) {
        indexedNodes.push({ node, requestedIndex });
      } else {
        unindexedNodes.push(node);
      }
    }
    indexedNodes.sort((left, right) => left.requestedIndex - right.requestedIndex || String(left.node?.id ?? "").localeCompare(String(right.node?.id ?? "")));
    for (const { node, requestedIndex } of indexedNodes) {
      let exportIndex = requestedIndex;
      while (usedIndexes.has(exportIndex)) exportIndex += 1;
      usedIndexes.add(exportIndex);
      result.set(node.id, uniqueSvgId(`${typeId}-${exportIndex}`, usedIds, "static"));
    }
    unindexedNodes.sort((left, right) => String(left?.id ?? "").localeCompare(String(right?.id ?? "")));
    let exportIndex = 1;
    for (const node of unindexedNodes) {
      while (usedIndexes.has(exportIndex)) exportIndex += 1;
      usedIndexes.add(exportIndex);
      result.set(node.id, uniqueSvgId(`${typeId}-${exportIndex}`, usedIds, "static"));
      exportIndex += 1;
    }
  }
  return result;
}

function formatSvgNumber(value) {
  const numeric = Number(value);
  const rounded = Math.round((Number.isFinite(numeric) ? numeric : 0) * 100000) / 100000;
  return String(Object.is(rounded, -0) ? 0 : rounded);
}

function nodeScaleX(node) {
  const scale = Number(node?.scaleX ?? node?.scale ?? 1);
  return Number.isFinite(scale) && scale !== 0 ? scale : 1;
}

function nodeScaleY(node) {
  const scale = Number(node?.scaleY ?? node?.scale ?? 1);
  return Number.isFinite(scale) && scale !== 0 ? scale : 1;
}

function numericNodeParam(node, key, fallback) {
  const parsed = Number(node?.params?.[key]);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeLabelRotation(value) {
  const parsed = Number(value ?? 0);
  const snapped = Math.round((Number.isFinite(parsed) ? parsed : 0) / 90) * 90;
  return ((snapped % 360) + 360) % 360;
}

function labelTextAnchor(node) {
  const anchor = node?.params?._labelTextAnchor;
  return anchor === "start" || anchor === "middle" || anchor === "end" ? anchor : "middle";
}

function buildServerSvgNodeLabelMarkup(node, id, attributes = "") {
  if (isStaticNode(node) || node?.params?._labelVisible === "0") {
    return "";
  }
  const text = String(node?.params?._labelText ?? node?.name ?? "").trim();
  if (!text) {
    return "";
  }
  const scaleX = Math.abs(nodeScaleX(node)) || 1;
  const scaleY = Math.abs(nodeScaleY(node)) || 1;
  const offsetX = numericNodeParam(node, "_labelX", 0) * scaleX;
  const offsetY = numericNodeParam(node, "_labelY", Math.round((node?.size?.height ?? 48) / 2 + 22)) * scaleY;
  const centerX = Number(node?.position?.x ?? 0) + offsetX;
  const centerY = Number(node?.position?.y ?? 0) + offsetY;
  const fontSize = numericNodeParam(node, "_labelFontSize", 14) * Math.sqrt(scaleX * scaleY);
  const rotation = normalizeLabelRotation(node?.params?._labelRotation);
  const vertical = rotation === 90 || rotation === 270;
  const textStyle = [
    `dominant-baseline="middle"`,
    `fill="${escapeSvgAttribute(node?.params?._labelColor || "#334155")}"`,
    `font-family="${escapeSvgAttribute(node?.params?._labelFontFamily || "Arial")}"`,
    `font-size="${formatSvgNumber(fontSize)}"`,
    `font-weight="${escapeSvgAttribute(node?.params?._labelFontWeight || "500")}"`,
    `font-style="${escapeSvgAttribute(node?.params?._labelFontStyle || "normal")}"`,
    `text-decoration="${escapeSvgAttribute(node?.params?._labelTextDecoration || "none")}"`,
    `paint-order="stroke"`,
    `stroke="rgba(255,255,255,0.85)"`,
    `stroke-width="3"`,
    `stroke-linejoin="round"`
  ].join(" ");
  const commonAttributes = `${attributes ? `${attributes} ` : ""}${textStyle}`;
  if (vertical) {
    const characters = Array.from(text);
    return characters.map((char, index) => {
      const tokenId = characters.length === 1 ? id : `${id}_${index + 1}`;
      const tokenY = centerY + (index - (characters.length - 1) / 2) * fontSize * 1.2;
      return `<text id="${escapeSvgAttribute(tokenId)}" ${commonAttributes} x="${formatSvgNumber(centerX)}" y="${formatSvgNumber(tokenY)}" text-anchor="middle" style="writing-mode: horizontal-tb; text-orientation: mixed; letter-spacing: 0;">${escapeSvgText(char)}</text>`;
    }).join("\n");
  }
  return `<text id="${escapeSvgAttribute(id)}" ${commonAttributes} x="${formatSvgNumber(centerX)}" y="${formatSvgNumber(centerY)}" text-anchor="${escapeSvgAttribute(labelTextAnchor(node))}" style="writing-mode: horizontal-tb;">${escapeSvgText(text)}</text>`;
}

function serverTerminalPoint(node, terminalId) {
  const terminal = (node?.terminals ?? []).find((item) => item.id === terminalId) ?? node?.terminals?.[0];
  if (!terminal) {
    return { x: Number(node?.position?.x ?? 0), y: Number(node?.position?.y ?? 0) };
  }
  const localX = Number(terminal.anchor?.x ?? 0) * Number(node?.size?.width ?? 0) * nodeScaleX(node);
  const localY = Number(terminal.anchor?.y ?? 0) * Number(node?.size?.height ?? 0) * nodeScaleY(node);
  const radians = (Number(node?.rotation ?? 0) * Math.PI) / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  return {
    x: Math.round(Number(node?.position?.x ?? 0) + localX * cos - localY * sin),
    y: Math.round(Number(node?.position?.y ?? 0) + localX * sin + localY * cos)
  };
}

function measurementFontScaleForServerNode(node) {
  return Math.sqrt((Math.abs(nodeScaleX(node)) || 1) * (Math.abs(nodeScaleY(node)) || 1));
}

function measurementOffsetScaleForServerNode(node) {
  return { x: Math.abs(nodeScaleX(node)) || 1, y: Math.abs(nodeScaleY(node)) || 1 };
}

function serverMeasurementTypeById(config) {
  return new Map((config?.measurementTypes ?? []).map((item) => [item.id, item]));
}

function serverMeasurementProfileForNode(node, config) {
  return (config?.deviceProfiles ?? []).find((profile) => profile.deviceKind === node?.kind);
}

function resolveServerMeasurementItemDisplay(node, group, item, measurementConfig) {
  const type = serverMeasurementTypeById(measurementConfig).get(item?.measurementTypeId);
  const profileItem = serverMeasurementProfileForNode(node, measurementConfig)
    ?.items?.find((candidate) => candidate.measurementTypeId === item?.measurementTypeId && (candidate.role ?? "") === (item?.role ?? ""));
  const style = {
    ...(profileItem?.styleOverride ?? {}),
    ...(group?.groupStyleOverride ?? {}),
    ...(item?.styleOverride ?? {})
  };
  return {
    label: item?.labelOverride || item?.name || profileItem?.labelOverride || type?.shortLabel || item?.measurementTypeId || "",
    unit: item?.unitOverride ?? profileItem?.unitOverride ?? type?.defaultUnit ?? "",
    decimals: item?.decimalsOverride ?? profileItem?.decimalsOverride ?? type?.defaultDecimals ?? 3,
    color: style.color || type?.defaultColor || "#334155",
    fontFamily: style.fontFamily || type?.defaultFontFamily || "Arial",
    fontSize: style.fontSize ?? type?.defaultFontSize ?? 14,
    fontWeight: style.fontWeight || type?.defaultFontWeight || "500",
    fontStyle: style.fontStyle || "normal",
    textDecoration: style.textDecoration || "none",
    visible: item?.visible !== false
  };
}

function formatServerMeasurementDisplayValue(unit) {
  return unit ? `-- ${unit}` : "--";
}

function serverMeasurementGroupPosition(node, group) {
  const anchor = group?.terminalId ? serverTerminalPoint(node, group.terminalId) : { x: Number(node?.position?.x ?? 0), y: Number(node?.position?.y ?? 0) };
  const offsetScale = measurementOffsetScaleForServerNode(node);
  return {
    x: anchor.x + Number(group?.offset?.x ?? 0) * offsetScale.x,
    y: anchor.y + Number(group?.offset?.y ?? 70) * offsetScale.y
  };
}

function measurementBorderWidth(group) {
  return (group?.borderStyle ?? "none") === "none" ? 0 : Math.max(0, Math.min(12, Number(group?.borderWidth ?? 1)));
}

function measurementBorderDashArray(group) {
  if (measurementBorderWidth(group) <= 0 || group?.borderStyle === "none" || group?.borderStyle === "solid") {
    return "";
  }
  return group?.borderStyle === "dotted" ? "2 4" : "10 6";
}

function serverExportMeasurementScopedId(value, nodeId, deviceId) {
  const rawValue = String(value ?? "").trim();
  const internalNodeId = String(nodeId ?? "").trim();
  const stableDeviceId = String(deviceId ?? "").trim();
  if (!rawValue || !internalNodeId || !stableDeviceId || internalNodeId === stableDeviceId) {
    return rawValue;
  }
  return rawValue.replace(internalNodeId, stableDeviceId);
}

function serverExportMeasurementSourcePoint(value, nodeId, deviceId) {
  const rawValue = String(value ?? "").trim();
  const internalNodeId = String(nodeId ?? "").trim();
  const stableDeviceId = String(deviceId ?? "").trim();
  if (!rawValue) {
    return rawValue;
  }
  for (const prefix of [internalNodeId, stableDeviceId]) {
    if (prefix && rawValue.startsWith(`${prefix}.`)) {
      return rawValue.slice(prefix.length + 1);
    }
  }
  return rawValue;
}

function serverExportMeasurementValueElementId(itemId, deviceId) {
  const rawItemId = String(itemId ?? "").trim();
  const stableDeviceId = String(deviceId ?? "").trim();
  const itemKey = rawItemId.startsWith("measurement-")
    ? rawItemId.slice("measurement-".length)
    : [stableDeviceId, rawItemId].filter(Boolean).join("-");
  return `mv-${itemKey || stableDeviceId || "measurement"}`;
}

function buildServerSvgMeasurementGroupMarkup(node, group, measurementConfig, usedIds, deviceId = node.id) {
  if (!group?.visible) {
    return "";
  }
  const fontScale = measurementFontScaleForServerNode(node);
  const rows = (group.items ?? []).flatMap((item) => {
    const display = resolveServerMeasurementItemDisplay(node, group, item, measurementConfig);
    if (!display.visible) {
      return [];
    }
    const label = group.labelVisible === false ? "" : display.label;
    const unit = group.unitVisible === false ? "" : display.unit;
    const valueText = "--";
    const text = [label, valueText, unit].filter(Boolean).join(" ");
    return [{ item, display, labelText: label, valueText, unitText: unit, text, fontSize: display.fontSize * fontScale }];
  });
  if (rows.length === 0) {
    return "";
  }
  const maxFontSize = Math.max(...rows.map((row) => row.fontSize));
  const lineHeight = Math.max(16, maxFontSize + 6);
  const estimateWidth = (text, fontSize) => Array.from(String(text)).reduce((total, char) => total + (/^[\u0000-\u00ff]$/.test(char) ? 0.56 : 1), 0) * fontSize;
  const columnWidth = Math.max(72, Math.max(...rows.map((row) => estimateWidth(row.text, row.fontSize))) + 12);
  const columns = group.layout === "grid" ? 2 : group.layout === "horizontal" ? rows.length : 1;
  const width = Math.max(64, columnWidth * columns);
  const height = Math.max(lineHeight, Math.ceil(rows.length / columns) * lineHeight);
  const position = serverMeasurementGroupPosition(node, group);
  const dashArray = measurementBorderDashArray(group);
  const dashAttribute = dashArray ? ` stroke-dasharray="${escapeSvgAttribute(dashArray)}"` : "";
  const stableDeviceId = String(deviceId ?? node.id ?? "");
  const rowsMarkup = rows.map((row, index) => {
    const col = columns <= 1 ? 0 : index % columns;
    const rowIndex = columns <= 1 ? index : Math.floor(index / columns);
    const textX = -width / 2 + col * columnWidth + 7;
    const textY = -height / 2 + rowIndex * lineHeight + lineHeight / 2;
    const textGap = Math.max(4, row.fontSize * 0.36);
    const exportedItemId = serverExportMeasurementScopedId(row.item?.id, node?.id, stableDeviceId);
    const measurementTypeId = String(row.item?.measurementTypeId ?? "").trim();
    const sourceField = serverExportMeasurementSourcePoint(row.item?.sourcePoint, node?.id, stableDeviceId);
    const itemMetadata = [
      `mt="${escapeSvgAttribute(measurementTypeId)}"`,
      sourceField && sourceField !== measurementTypeId ? `mf="${escapeSvgAttribute(sourceField)}"` : "",
      row.item?.role ? `mr="${escapeSvgAttribute(row.item.role)}"` : ""
    ].filter(Boolean).join(" ");
    const textStyle = `x="${formatSvgNumber(textX)}" y="${formatSvgNumber(textY)}" dominant-baseline="middle" fill="${escapeSvgAttribute(row.display.color)}" font-family="${escapeSvgAttribute(row.display.fontFamily)}" font-size="${formatSvgNumber(row.fontSize)}" font-weight="${escapeSvgAttribute(row.display.fontWeight)}" font-style="${escapeSvgAttribute(row.display.fontStyle)}" text-decoration="${escapeSvgAttribute(row.display.textDecoration)}"`;
    const labelMarkup = row.labelText
      ? `<tspan>${escapeSvgText(row.labelText)}</tspan>`
      : "";
    const valueId = uniqueSvgId(serverExportMeasurementValueElementId(exportedItemId, stableDeviceId), usedIds, "mv");
    const valueDxAttribute = row.labelText ? ` dx="${formatSvgNumber(textGap)}"` : "";
    const valueMarkup = `<tspan id="${escapeSvgAttribute(valueId)}" class="mv" ${itemMetadata}${valueDxAttribute}>${escapeSvgText(row.valueText)}</tspan>`;
    const unitMarkup = row.unitText
      ? `<tspan dx="${formatSvgNumber(textGap)}">${escapeSvgText(row.unitText)}</tspan>`
      : "";
    return `<text ${textStyle}>${labelMarkup}${valueMarkup}${unitMarkup}</text>`;
  }).join("");
  const groupMetadata = [
    `dev="${escapeSvgAttribute(stableDeviceId)}"`,
    group.terminalId ? `term="${escapeSvgAttribute(group.terminalId)}"` : ""
  ].filter(Boolean).join(" ");
  const projectLayerId = String(node?.layerId ?? "layer-default");
  return `<g class="mg" layer-id="${escapeSvgAttribute(projectLayerId)}" transform="translate(${formatSvgNumber(position.x)} ${formatSvgNumber(position.y)})" ${groupMetadata}>
<rect x="${formatSvgNumber(-width / 2)}" y="${formatSvgNumber(-height / 2)}" width="${formatSvgNumber(width)}" height="${formatSvgNumber(height)}" rx="4" fill="${escapeSvgAttribute(group.backgroundColor ?? "transparent")}" stroke="${escapeSvgAttribute(group.borderColor ?? "#64748b")}" stroke-width="${formatSvgNumber(measurementBorderWidth(group))}"${dashAttribute}/>
${rowsMarkup}
</g>`;
}

export function buildSvgFile(project, measurementConfig = { measurementTypes: [], deviceProfiles: [] }, options = {}) {
  const width = Number(project.canvasWidth ?? 1920);
  const height = Number(project.canvasHeight ?? 1024);
  const nodes = Array.isArray(project.nodes) ? project.nodes : [];
  const edges = Array.isArray(project.edges) ? project.edges : [];
  const backgroundColor = project.canvasBackgroundColor ?? "#f8fafc";
  const imagePathById = options.imagePathById ?? {};
  const backgroundImage = svgImageHref(project.canvasBackgroundImage ?? "", imagePathById);
  const deviceTemplates = Array.isArray(options.deviceTemplates)
    ? options.deviceTemplates
    : Array.isArray(project.deviceTemplates)
      ? project.deviceTemplates
      : [];
  const templateByKind = new Map(deviceTemplates.map((template) => [template?.kind, template]).filter(([kind]) => kind));
  const usedIds = new Set(["root_g"]);
  const backgroundLayerId = uniqueSvgId(svgLayerId("Background", "Background"), usedIds, "Background_Layer");
  const segmentLayerId = uniqueSvgId(svgLayerId("Segment", "Segment"), usedIds, "Segment_Layer");
  const textLayerId = uniqueSvgId(svgLayerId("Text", "Text"), usedIds, "Text_Layer");
  const measurementLayerId = uniqueSvgId(svgLayerId("Measurement", "Measurement"), usedIds, "Measurement_Layer");
  const otherLayerId = uniqueSvgId(svgLayerId("Other", "Other"), usedIds, "Other_Layer");
  const nodeLayerKey = (node) => isStaticNode(node) ? "Other" : inferESection(node?.kind, node?.params ?? {}) || node?.kind || "Other";
  const layerIdsByType = new Map();
  for (const node of nodes) {
    const layerKey = nodeLayerKey(node);
    if (!layerIdsByType.has(layerKey)) {
      layerIdsByType.set(layerKey, uniqueSvgId(svgLayerId(layerKey, "Device"), usedIds, "Device_Layer"));
    }
  }
  const exportDeviceIdByNodeId = buildExportDeviceIdMap(nodes, usedIds);
  const nodeMarkupByLayer = new Map(Array.from(layerIdsByType.values()).map((layerId) => [layerId, []]));
  const symbolMarkup = [];
  const symbolIdBySignature = new Map();
  const textLayerMarkup = [];
  const edgeMarkup = (project.edges ?? [])
    .map((edge, index) => {
      const start = endpointPoint(project, edge, "source");
      const end = endpointPoint(project, edge, "target");
      const midX = Math.round((start.x + end.x) / 2);
      const points = [start, { x: midX, y: start.y }, { x: midX, y: end.y }, end]
        .map((point) => `${point.x},${point.y}`)
        .join(" ");
      const edgeId = uniqueSvgId(`edge-${index + 1}`, usedIds, "edge");
      const sourceExportDeviceId = exportDeviceIdByNodeId.get(edge.sourceId) ?? edge.sourceId ?? "";
      const targetExportDeviceId = exportDeviceIdByNodeId.get(edge.targetId) ?? edge.targetId ?? "";
      return `<polyline id="${escapeSvgAttribute(edgeId)}" source-dev-id="${escapeSvgAttribute(sourceExportDeviceId)}" target-dev-id="${escapeSvgAttribute(targetExportDeviceId)}" points="${escapeSvgAttribute(points)}" fill="none" stroke="#334155" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`;
    })
    .join("\n");
  for (const node of nodes) {
    const nodeWidth = node.size?.width ?? 80;
    const nodeHeight = node.size?.height ?? 48;
    const rotate = Number(node.rotation ?? 0);
    const normalizedRotate = Number.isFinite(rotate) ? rotate : 0;
    const scaleX = nodeScaleX(node);
    const scaleY = nodeScaleY(node);
    const exportDeviceId = exportDeviceIdByNodeId.get(node.id) ?? node.id ?? "device";
    const useId = exportDeviceIdByNodeId.get(node.id) ?? uniqueSvgId(exportDeviceId, usedIds, "device");
    const layerId = layerIdsByType.get(nodeLayerKey(node)) ?? otherLayerId;
    const geometryTransform = `rotate(${formatSvgNumber(normalizedRotate)}) scale(${formatSvgNumber(scaleX)} ${formatSvgNumber(scaleY)})`;
    const labelId = uniqueSvgId(`label_${exportDeviceId}`, usedIds, "node_label");
    const projectLayerId = String(node.layerId ?? "layer-default");
    const labelMetadataAttributes = `dev-id="${escapeSvgAttribute(exportDeviceId)}"`;
    const labelMarkup = buildServerSvgNodeLabelMarkup(node, labelId, `layer-id="${escapeSvgAttribute(projectLayerId)}" ${labelMetadataAttributes}`);
    if (labelMarkup) {
      textLayerMarkup.push(labelMarkup);
    }
    const viewBox = `${formatSvgNumber(-nodeWidth / 2)} ${formatSvgNumber(-nodeHeight / 2)} ${formatSvgNumber(nodeWidth)} ${formatSvgNumber(nodeHeight)}`;
    const renderServerNodeSymbolBody = (symbolNode, symbolBaseId) => {
      const stroke = String(symbolNode.kind ?? "").startsWith("dc") || String(symbolNode.kind ?? "").includes("dcdc") ? "#0f766e" : "#2563eb";
      const isBus = String(symbolNode.kind ?? "").includes("bus");
      const image = svgImageHref(
        symbolNode.params?.backgroundImageAssetId ? `/webgrp/images/${symbolNode.params.backgroundImageAssetId}` : symbolNode.params?.backgroundImage ?? "",
        imagePathById
      );
      const nodeBodyMarkup = isBus
        ? `<rect class="bus-glyph" x="${-nodeWidth / 2}" y="${formatSvgNumber(-Math.max(8, nodeHeight / 3) / 2)}" width="${nodeWidth}" height="${formatSvgNumber(Math.max(8, nodeHeight / 3))}" fill="${stroke}" stroke="none"/>`
        : `<rect x="${-nodeWidth / 2}" y="${-nodeHeight / 2}" width="${nodeWidth}" height="${nodeHeight}" rx="8" fill="#ffffff" stroke="#94a3b8"/>
${image ? svgImageContentMarkup(image, {
          x: -nodeWidth / 2,
          y: -nodeHeight / 2,
          width: nodeWidth,
          height: nodeHeight,
          imageFit: symbolNode.params?.backgroundImageFit,
          patternId: svgSafeId(`node_background_image_pattern_${symbolBaseId}`, "node_background_image_pattern"),
          className: "node-background-image"
        }) : ""}`;
      return `<title>${escapeSvgText(nodeLayerKey(symbolNode))}</title>
<g transform="${escapeSvgAttribute(geometryTransform)}">
${nodeBodyMarkup}
</g>`;
    };
    const stateDefinitions = serverTemplateStateDefinitions(node, templateByKind.get(node.kind));
    const stateInputs = stateDefinitions.length > 0
      ? stateDefinitions.map((state) => ({
          stateKey: serverStateSymbolKey(state.value),
          node: { ...node, params: { ...(node.params ?? {}), status: state.value } }
        }))
      : [{ stateKey: "default", node }];
    const symbolIdByStateKey = new Map();
    for (const stateInput of stateInputs) {
      const symbolBaseId = svgSafeId(`symbol_${nodeLayerKey(node)}_${node.kind ?? "node"}_${stateInput.stateKey}`, "device_symbol");
      const signatureBody = renderServerNodeSymbolBody(stateInput.node, symbolBaseId);
      const signature = `${symbolBaseId}\n${viewBox}\n${signatureBody}`;
      let symbolId = symbolIdBySignature.get(signature);
      if (!symbolId) {
        symbolId = uniqueSvgId(symbolBaseId, usedIds, "device_symbol");
        const symbolBody = symbolId === symbolBaseId ? signatureBody : renderServerNodeSymbolBody(stateInput.node, symbolId);
        symbolMarkup.push(`<symbol id="${escapeSvgAttribute(symbolId)}" viewBox="${viewBox}" overflow="visible">
${symbolBody}
</symbol>`);
        symbolIdBySignature.set(signature, symbolId);
      }
      symbolIdByStateKey.set(stateInput.stateKey, symbolId);
    }
    const activeStateKey = stateDefinitions.length > 0 ? serverStateSymbolKey(serverResolvedStateValue(node, stateDefinitions)) : "default";
    const symbolId = symbolIdByStateKey.get(activeStateKey) ?? symbolIdByStateKey.values().next().value ?? "";
    nodeMarkupByLayer.get(layerId)?.push(`<use id="${escapeSvgAttribute(useId)}" href="#${escapeSvgAttribute(symbolId)}" x="${formatSvgNumber(Number(node.position?.x ?? 0) - nodeWidth / 2)}" y="${formatSvgNumber(Number(node.position?.y ?? 0) - nodeHeight / 2)}" width="${formatSvgNumber(nodeWidth)}" height="${formatSvgNumber(nodeHeight)}"/>`);
  }
  const deviceLayersMarkup = Array.from(layerIdsByType.entries())
    .map(([layerKey, layerId]) => `<g id="${escapeSvgAttribute(layerId)}" device-type="${escapeSvgAttribute(layerKey)}">
${(nodeMarkupByLayer.get(layerId) ?? []).join("\n")}
</g>`)
    .join("\n");
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const measurementMarkup = (project.measurements?.groups ?? [])
    .map((group) => {
      const node = nodeById.get(group.nodeId);
      if (!node || isStaticNode(node)) return "";
      return buildServerSvgMeasurementGroupMarkup(node, group, measurementConfig, usedIds, exportDeviceIdByNodeId.get(node.id) ?? node.id);
    })
    .filter(Boolean)
    .join("\n");
  const backgroundMarkup = `<rect width="100%" height="100%" fill="${escapeSvgAttribute(backgroundColor)}"/>
${backgroundImage ? svgImageContentMarkup(backgroundImage, {
    x: 0,
    y: 0,
    width,
    height,
    imageFit: project.canvasBackgroundImageFit,
    patternId: uniqueSvgId("canvas_background_image_pattern", usedIds, "canvas_background_image_pattern"),
    className: "export-canvas-background-image"
  }) : ""}`;
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" preserveAspectRatio="xMidYMid meet" height="100%" width="100%" viewBox="0,0,${width},${height}">
<defs>
${symbolMarkup.join("\n")}
</defs>
<g id="root_g">
<g id="${escapeSvgAttribute(backgroundLayerId)}">
${backgroundMarkup}
</g>
<g id="${escapeSvgAttribute(segmentLayerId)}">
${edgeMarkup}
</g>
${deviceLayersMarkup}
<g id="${escapeSvgAttribute(textLayerId)}">
${textLayerMarkup.join("\n")}
</g>
<g id="${escapeSvgAttribute(measurementLayerId)}">
${measurementMarkup}
</g>
<g id="${escapeSvgAttribute(otherLayerId)}">
</g>
</g>
</svg>`;
}

async function listSchemeStoreEntries(root) {
  const files = [];
  const dirs = [];
  const walk = async (dir) => {
    let entries = [];
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const entryPath = join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(entryPath);
        dirs.push(entryPath);
      } else if (entry.isFile()) {
        files.push(entryPath);
      }
    }
  };
  await walk(root);
  return { files, dirs };
}

function schemeArchiveId() {
  return new Date().toISOString().replace(/[.:]/gu, "-");
}

async function archiveSchemeStoreEntry(entryPath, filesRoot, trashRoot, archiveId) {
  const relativePath = relative(filesRoot, entryPath);
  if (!relativePath || relativePath.startsWith("..")) {
    return;
  }
  let targetPath = join(trashRoot, archiveId, relativePath);
  await mkdir(dirname(targetPath), { recursive: true });
  for (let index = 2; ; index += 1) {
    try {
      await rename(entryPath, targetPath);
      return;
    } catch (error) {
      if (error?.code === "ENOENT") {
        return;
      }
      if (error?.code !== "EEXIST") {
        throw error;
      }
      const suffix = `.${index}`;
      targetPath = join(dirname(targetPath), `${safeFilePart(entryPath.split(/[\\/]/u).pop(), "archived")}${suffix}`);
    }
  }
}

export async function archiveStaleSchemeFiles(filesRoot, expectedFiles, expectedDirs, options = {}) {
  const { files, dirs } = await listSchemeStoreEntries(filesRoot);
  const trashRoot = options.trashRoot ?? schemeTrashDir;
  const archiveId = options.archiveId ?? schemeArchiveId();
  await Promise.all(files.filter((filePath) => !expectedFiles.has(filePath)).map((filePath) => archiveSchemeStoreEntry(filePath, filesRoot, trashRoot, archiveId)));
  for (const dir of dirs.sort((first, second) => second.length - first.length)) {
    if (!expectedDirs.has(dir)) {
      await rm(dir, { recursive: true, force: true });
    }
  }
}

async function removeStaleSchemeFiles(filesRoot, expectedFiles, expectedDirs) {
  await archiveStaleSchemeFiles(filesRoot, expectedFiles, expectedDirs);
}

function schemeDirectoryFromPath(filesRoot, schemePath) {
  const parts = (Array.isArray(schemePath) ? schemePath : [])
    .map((part) => safeFilePart(part, "方案"))
    .filter(Boolean);
  return parts.reduce((dir, part) => join(dir, part), filesRoot);
}

function isInsideDirectory(parentDir, childPath) {
  const relativePath = relative(parentDir, childPath);
  return Boolean(relativePath) && !relativePath.startsWith("..") && !isAbsolute(relativePath);
}

function parseSchemePathParam(value) {
  if (!value) {
    return [];
  }
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map((part) => safeFilePart(part, "方案")).filter(Boolean) : [];
  } catch {
    return [];
  }
}

function zipEntryParts(entryName) {
  const normalized = String(entryName || "").replace(/\\/gu, "/");
  if (!normalized || normalized.startsWith("/") || /^[a-z]:/iu.test(normalized)) {
    throw new Error("zip 文件包含无效路径。");
  }
  const parts = normalized.split("/").filter(Boolean);
  if (parts.some((part) => part === "." || part === "..")) {
    throw new Error("zip 文件包含不安全路径。");
  }
  return parts;
}

function schemeZipRootName(entries, fallbackName) {
  const fileParts = entries
    .filter((entry) => !entry.isDirectory)
    .map((entry) => zipEntryParts(entry.entryName))
    .filter((parts) => parts.length > 0);
  if (fileParts.length === 0) {
    throw new Error("zip 文件中没有可导入的方案文件。");
  }
  const firstRoot = fileParts[0][0];
  const hasSingleRoot = firstRoot && fileParts.every((parts) => parts.length > 1 && parts[0] === firstRoot);
  return safeFilePart(hasSingleRoot ? firstRoot : fallbackName, "导入方案");
}

async function extractSchemeZipToDirectory(zip, targetDir, rootName) {
  await mkdir(targetDir, { recursive: true });
  for (const entry of zip.getEntries()) {
    const parts = zipEntryParts(entry.entryName);
    const relativeParts = safeFilePart(parts[0], parts[0]) === rootName ? parts.slice(1) : parts;
    if (relativeParts.length === 0) {
      continue;
    }
    const targetPath = relativeParts.reduce((current, part) => join(current, safeFilePart(part, part)), targetDir);
    if (!isInsideDirectory(targetDir, targetPath)) {
      throw new Error("zip 文件包含越界路径。");
    }
    if (entry.isDirectory) {
      await mkdir(targetPath, { recursive: true });
      continue;
    }
    await mkdir(dirname(targetPath), { recursive: true });
    await writeFile(targetPath, entry.getData());
  }
}

export async function createSchemeArchiveBuffer(options) {
  const filesRoot = options.filesRoot ?? join(schemeDataDir, "files");
  const schemePath = Array.isArray(options.schemePath) ? options.schemePath : [];
  if (schemePath.length === 0) {
    throw new Error("缺少方案路径。");
  }
  const schemeDir = schemeDirectoryFromPath(filesRoot, schemePath);
  const schemeStat = await stat(schemeDir);
  if (!schemeStat.isDirectory()) {
    throw new Error("方案路径不是目录。");
  }
  const schemeName = safeFilePart(schemePath[schemePath.length - 1], "方案");
  const zip = new AdmZip();
  zip.addLocalFolder(schemeDir, schemeName);
  return {
    buffer: zip.toBuffer(),
    filename: `${schemeName}.zip`,
    schemeName
  };
}

export async function importSchemeArchiveBuffer(options) {
  const filesRoot = options.filesRoot ?? join(schemeDataDir, "files");
  const trashRoot = options.trashRoot ?? schemeTrashDir;
  await mkdir(filesRoot, { recursive: true });
  const parentPath = Array.isArray(options.parentPath) ? options.parentPath.map((part) => safeFilePart(part, "方案")).filter(Boolean) : [];
  const fileName = safeFilePart(options.fileName || "导入方案.zip", "导入方案.zip").replace(/\.zip$/iu, "");
  const mode = options.mode === "overwrite" ? "overwrite" : "check";
  const requestedName = safeFilePart(options.targetName || "", "");
  const zip = options.zip && typeof options.zip.getEntries === "function" ? options.zip : new AdmZip(options.buffer);
  const entries = zip.getEntries();
  const zipRootName = schemeZipRootName(entries, fileName);
  const importName = requestedName || zipRootName;
  const parentDir = schemeDirectoryFromPath(filesRoot, parentPath);
  const targetDir = join(parentDir, importName);
  if (!isInsideDirectory(filesRoot, targetDir)) {
    throw new Error("目标方案路径无效。");
  }
  let targetExists = false;
  try {
    targetExists = (await stat(targetDir)).isDirectory();
  } catch {
    targetExists = false;
  }
  if (targetExists && mode !== "overwrite") {
    return {
      conflict: true,
      importedName: importName,
      duplicateSchemeName: importName,
      parentPath
    };
  }
  await mkdir(parentDir, { recursive: true });
  if (targetExists) {
    await archiveSchemeStoreEntry(targetDir, filesRoot, trashRoot, schemeArchiveId());
  }
  await extractSchemeZipToDirectory(zip, targetDir, zipRootName);
  return {
    conflict: false,
    importedName: importName,
    importedPath: [...parentPath, importName]
  };
}

function sameSchemePath(first, second) {
  const firstParts = Array.isArray(first) ? first.map((part) => safeFilePart(part, "方案")) : [];
  const secondParts = Array.isArray(second) ? second.map((part) => safeFilePart(part, "方案")) : [];
  return firstParts.length === secondParts.length && firstParts.every((part, index) => part === secondParts[index]);
}

export async function saveSchemeRecordDirectory(options) {
  const filesRoot = options.filesRoot ?? join(schemeDataDir, "files");
  const schemePath = Array.isArray(options.schemePath) && options.schemePath.length > 0 ? options.schemePath : ["默认方案"];
  const schemeDir = schemeDirectoryFromPath(filesRoot, schemePath);
  const previousSchemePath = options.previousSchemePath;
  if (Array.isArray(previousSchemePath) && previousSchemePath.length > 0 && !sameSchemePath(previousSchemePath, schemePath)) {
    const previousDir = schemeDirectoryFromPath(filesRoot, previousSchemePath);
    await mkdir(dirname(schemeDir), { recursive: true });
    try {
      await rename(previousDir, schemeDir);
      return;
    } catch (error) {
      if (error?.code !== "ENOENT") {
        throw error;
      }
    }
  }
  await mkdir(schemeDir, { recursive: true });
}

export async function deleteSchemeRecordDirectory(options) {
  const filesRoot = options.filesRoot ?? join(schemeDataDir, "files");
  const trashRoot = options.trashRoot ?? schemeTrashDir;
  const schemePath = Array.isArray(options.schemePath) && options.schemePath.length > 0 ? options.schemePath : [];
  if (schemePath.length === 0) {
    return;
  }
  const schemeDir = schemeDirectoryFromPath(filesRoot, schemePath);
  await archiveSchemeStoreEntry(schemeDir, filesRoot, trashRoot, options.archiveId ?? schemeArchiveId());
}

function projectFilePathsForName(schemeDir, name) {
  const baseName = safeFilePart(name, "模型");
  return {
    jsonPath: join(schemeDir, `${baseName}.json`),
    ePath: join(schemeDir, `${baseName}.e`),
    svgPath: join(schemeDir, `${baseName}.svg`)
  };
}

async function projectJsonFileForName(schemeDir, name) {
  const exactPath = projectFilePathsForName(schemeDir, name).jsonPath;
  try {
    await stat(exactPath);
    return {
      filePath: exactPath,
      fileName: `${safeFilePart(name, "模型")}.json`
    };
  } catch {
    // Fall through to filename-based lookup for legacy files with storage suffixes.
  }
  const targetKey = storageProjectNameKey(name);
  let entries = [];
  try {
    entries = await readdir(schemeDir, { withFileTypes: true });
  } catch {
    return null;
  }
  for (const entry of entries) {
    if (!entry.isFile() || !/\.json$/iu.test(entry.name) || entry.name.toLocaleLowerCase() === "scheme.json") {
      continue;
    }
    const fileBaseName = entry.name.replace(/\.json$/iu, "");
    const displayName = storageProjectDisplayName(storedProjectFilePartDisplayName(fileBaseName));
    if (storageProjectNameKey(displayName) === targetKey) {
      return {
        filePath: join(schemeDir, entry.name),
        fileName: entry.name
      };
    }
  }
  return null;
}

export async function readSchemeProjectRecord(options = {}) {
  const filesRoot = options.filesRoot ?? join(schemeDataDir, "files");
  const schemePath = Array.isArray(options.schemePath) && options.schemePath.length > 0 ? options.schemePath : ["默认方案"];
  const name = storageProjectDisplayName(options.name || options.projectName);
  const schemeDir = schemeDirectoryFromPath(filesRoot, schemePath);
  const projectFile = await projectJsonFileForName(schemeDir, name);
  if (!projectFile) {
    return null;
  }
  return readSchemeProjectFile(projectFile.filePath, projectFile.fileName);
}

export async function saveSchemeProjectRecord(options) {
  const filesRoot = options.filesRoot ?? join(schemeDataDir, "files");
  const trashRoot = options.trashRoot ?? schemeTrashDir;
  const schemePath = Array.isArray(options.schemePath) && options.schemePath.length > 0 ? options.schemePath : ["默认方案"];
  const record = options.record ?? {};
  const name = storageProjectDisplayName(record.name || record.project?.name);
  const updatedAt = record.updatedAt || new Date().toISOString();
  const project = normalizeProjectForStorage({
    ...(record.project ?? {}),
    name
  });
  const storedRecord = {
    ...record,
    name,
    updatedAt,
    project: {
      ...project,
      name
    }
  };
  const schemeDir = schemeDirectoryFromPath(filesRoot, schemePath);
  await mkdir(schemeDir, { recursive: true });
  if (options.previousName && storageProjectNameKey(options.previousName) !== storageProjectNameKey(name)) {
    const previousPaths = projectFilePathsForName(schemeDir, options.previousName);
    await Promise.all(Object.values(previousPaths).map((filePath) => archiveSchemeStoreEntry(filePath, filesRoot, trashRoot, schemeArchiveId())));
  }
  const { jsonPath, ePath, svgPath } = projectFilePathsForName(schemeDir, name);
  const measurementConfig = options.measurementConfig ?? { measurementTypes: [], deviceProfiles: [] };
  const imagePathById = options.imagePathById ?? (await imageExportPathByIdFromManifest(await readManifest()));
  const svgContent = options.svg ?? buildSvgFile(storedRecord.project, measurementConfig, { imagePathById });
  const eContent = options.eFile ?? buildDeviceParameterFile(storedRecord.project, schemePath);
  await Promise.all([
    writeTextIfChanged(jsonPath, stringifyJson(storedRecord.project)),
    writeTextIfChanged(ePath, eContent),
    writeTextIfChanged(svgPath, svgContent)
  ]);
  return storedRecord;
}

export async function deleteSchemeProjectRecord(options) {
  const filesRoot = options.filesRoot ?? join(schemeDataDir, "files");
  const trashRoot = options.trashRoot ?? schemeTrashDir;
  const schemePath = Array.isArray(options.schemePath) && options.schemePath.length > 0 ? options.schemePath : ["默认方案"];
  const name = storageProjectDisplayName(options.name || options.projectName);
  const schemeDir = schemeDirectoryFromPath(filesRoot, schemePath);
  const archiveId = options.archiveId ?? schemeArchiveId();
  const paths = projectFilePathsForName(schemeDir, name);
  await Promise.all(Object.values(paths).map((filePath) => archiveSchemeStoreEntry(filePath, filesRoot, trashRoot, archiveId)));
}

async function writeSchemeFiles(schemes, options = {}) {
  const filesRoot = join(schemeDataDir, "files");
  await mkdir(filesRoot, { recursive: true });
  const expectedFiles = new Set();
  const expectedDirs = new Set([filesRoot]);
  const writeTasks = [];
  const measurementConfig = await readMeasurementConfig();
  const imagePathById = options.imagePathById ?? (await imageExportPathByIdFromManifest(await readManifest()));

  const writeSchemeTree = async (scheme, parentDir, parentPath = []) => {
    const schemeName = String(scheme.name ?? "").trim() || "方案";
    const currentSchemePath = [...parentPath, schemeName];
    const schemeDir = join(parentDir, safeFilePart(scheme.name, "方案"));
    expectedDirs.add(schemeDir);
    await mkdir(schemeDir, { recursive: true });
    for (const record of scheme.projects ?? []) {
      const baseName = safeFilePart(record.name, "模型");
      const jsonPath = join(schemeDir, `${baseName}.json`);
      const ePath = join(schemeDir, `${baseName}.e`);
      const svgPath = join(schemeDir, `${baseName}.svg`);
      expectedFiles.add(jsonPath);
      expectedFiles.add(ePath);
      expectedFiles.add(svgPath);
      writeTasks.push(writeTextIfChanged(jsonPath, stringifyJson(record.project)));
      const [svgExists, eExists] = await Promise.all([fileExists(svgPath), fileExists(ePath)]);
      if (!svgExists) {
        writeTasks.push(writeTextIfChanged(svgPath, buildSvgFile(record.project, measurementConfig, { imagePathById })));
      }
      if (!eExists) {
        writeTasks.push(writeTextIfChanged(ePath, buildDeviceParameterFile(record.project, currentSchemePath)));
      }
    }
    for (const childScheme of scheme.children ?? []) {
      await writeSchemeTree(childScheme, schemeDir, currentSchemePath);
    }
  };

  for (const scheme of schemes) {
    await writeSchemeTree(scheme, filesRoot);
  }
  await Promise.all(writeTasks);
  await removeStaleSchemeFiles(filesRoot, expectedFiles, expectedDirs);
}

function publicAsset(item) {
  return {
    id: item.id,
    name: item.name,
    filename: item.filename,
    folderId: item.folderId || "root",
    mimeType: item.mimeType,
    size: item.size,
    createdAt: item.createdAt,
    url: `/webgrp/images/${item.id}`
  };
}

function imageCountsByFolder(manifest) {
  const counts = new Map();
  for (const item of manifest) {
    const folderId = item.folderId || "root";
    counts.set(folderId, (counts.get(folderId) ?? 0) + 1);
  }
  return counts;
}

function createImageManifestItem({ name, mimeType, bytes, folderId }) {
  const id = `img-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  return {
    id,
    name: safeName(name),
    folderId,
    mimeType,
    size: bytes.length,
    filename: `${id}${mimeExt[mimeType]}`,
    createdAt: new Date().toISOString()
  };
}

async function writeImageAssetFile(item, bytes) {
  await writeFile(join(imageDataDir, item.filename), bytes);
}

function safeImageLibraryId(value) {
  const id = String(value || "").trim();
  return /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/u.test(id) ? id : "";
}

function normalizeImportedImageLibraryFolders(value) {
  const seen = new Set();
  const folders = [];
  for (const folder of Array.isArray(value) ? value : []) {
    const id = safeImageLibraryId(folder?.id) || "root";
    if (id === "builtin-shared-icons" || seen.has(id)) {
      continue;
    }
    seen.add(id);
    folders.push({
      id,
      name: safeName(folder?.name || (id === "root" ? "默认文件夹" : id)),
      createdAt: typeof folder?.createdAt === "string" ? folder.createdAt : new Date().toISOString()
    });
  }
  if (!seen.has("root")) {
    folders.unshift(rootImageFolder());
  }
  return folders;
}

function normalizeImportedImageLibraryAssets(value, folderIds) {
  const seen = new Set();
  const assets = [];
  for (const asset of Array.isArray(value) ? value : []) {
    const id = safeImageLibraryId(asset?.id);
    if (!id || id.startsWith("builtin-shared-icon-") || seen.has(id) || typeof asset?.dataUrl !== "string") {
      continue;
    }
    seen.add(id);
    const folderId = safeImageLibraryId(asset.folderId);
    assets.push({
      id,
      name: safeName(asset.name || asset.filename || id),
      folderId: folderIds.has(folderId) ? folderId : "root",
      dataUrl: asset.dataUrl,
      createdAt: typeof asset.createdAt === "string" ? asset.createdAt : new Date().toISOString()
    });
  }
  return assets;
}

async function handleImportImageLibrary(request, response) {
  const payload = await readJsonBody(request, maxIconLibraryImportBodyBytes, "图标库导入文件过大，最大支持 128MB。");
  await ensureStore();
  const importedFolders = normalizeImportedImageLibraryFolders(payload.folders);
  const folderIds = new Set(importedFolders.map((folder) => folder.id));
  const importedAssets = normalizeImportedImageLibraryAssets(payload.assets, folderIds);
  if (importedAssets.length === 0) {
    sendError(response, 400, "导入文件中没有可恢复的图标资源。");
    return;
  }

  const currentFolders = await readImageFolders();
  const folderById = new Map(currentFolders.map((folder) => [folder.id, folder]));
  for (const folder of importedFolders) {
    folderById.set(folder.id, folder.id === "root" ? { ...rootImageFolder(), ...folder, id: "root" } : folder);
  }
  await writeImageFolders(Array.from(folderById.values()));

  const manifest = await readManifest();
  const manifestById = new Map(manifest.map((item) => [item.id, item]));
  const savedItems = [];
  let skippedCount = 0;
  for (const asset of importedAssets) {
    let parsed;
    try {
      parsed = parseDataUrl(asset.dataUrl);
    } catch {
      skippedCount += 1;
      continue;
    }
    const item = {
      id: asset.id,
      name: asset.name,
      folderId: asset.folderId,
      mimeType: parsed.mimeType,
      size: parsed.bytes.length,
      filename: `${asset.id}${mimeExt[parsed.mimeType]}`,
      createdAt: asset.createdAt
    };
    const previous = manifestById.get(item.id);
    if (previous?.filename && previous.filename !== item.filename) {
      await rm(join(imageDataDir, previous.filename), { force: true });
    }
    await writeImageAssetFile(item, parsed.bytes);
    manifestById.set(item.id, item);
    savedItems.push(item);
  }
  if (savedItems.length === 0) {
    sendError(response, 400, "导入文件中的图标数据格式无效。");
    return;
  }
  const savedIds = new Set(savedItems.map((item) => item.id));
  await writeManifest([
    ...savedItems,
    ...Array.from(manifestById.values()).filter((item) => !savedIds.has(item.id))
  ]);
  sendJson(response, 200, {
    ok: true,
    importedCount: savedItems.length,
    skippedCount,
    folders: Array.from(folderById.values()),
    assets: savedItems.map(publicAsset)
  });
}

function iconLibraryEntryMimeType(entryName) {
  const extension = extname(entryName).toLowerCase();
  return imageMimeByExtension[extension] || "";
}

function iconLibrarySourceName(fileName) {
  return safeFilePart(String(fileName || "导入文档图片").replace(/\.[^.]+$/u, ""), "导入文档图片");
}

function iconLibraryEntryDisplayName(entryName, sourceName) {
  const fileName = safeName(basename(entryName) || "图片");
  return safeName(`${sourceName}-${fileName}`);
}

function iconLibraryGeneratedSvgDisplayName(sourceName, index) {
  return safeName(`${sourceName}-矢量图标-${String(index).padStart(3, "0")}.svg`);
}

function officeXmlAttributeValue(markup, name) {
  const match = String(markup ?? "").match(new RegExp(`\\b${name}="([^"]*)"`, "iu"));
  return match ? match[1] : "";
}

function officeXmlNumberAttribute(markup, name, fallback = 0) {
  const value = Number(officeXmlAttributeValue(markup, name));
  return Number.isFinite(value) ? value : fallback;
}

function officeXmlPathPoints(markup) {
  return Array.from(String(markup ?? "").matchAll(/<a:pt\b([^>]*)\/?>/giu), (match) => ({
    x: officeXmlNumberAttribute(match[1], "x"),
    y: officeXmlNumberAttribute(match[1], "y")
  }));
}

function officeXmlColorFromMarkup(markup, fallback) {
  const srgbMatch = String(markup ?? "").match(/<a:srgbClr\b[^>]*\bval="([0-9a-f]{6})"/iu);
  if (srgbMatch) {
    return `#${srgbMatch[1].toLowerCase()}`;
  }
  const schemeMatch = String(markup ?? "").match(/<a:schemeClr\b[^>]*\bval="([^"]+)"/iu);
  const schemeColors = {
    bg1: "#ffffff",
    tx1: "#111827",
    bg2: "#f8fafc",
    tx2: "#334155",
    accent1: "#2563eb",
    accent2: "#16a34a",
    accent3: "#f59e0b",
    accent4: "#dc2626",
    accent5: "#7c3aed",
    accent6: "#0891b2"
  };
  return schemeMatch ? schemeColors[schemeMatch[1]] ?? fallback : fallback;
}

function officeXmlFillColor(shapeMarkup) {
  const fillMatch = String(shapeMarkup ?? "").match(/<a:solidFill\b[\s\S]*?<\/a:solidFill>/iu);
  if (fillMatch) {
    return officeXmlColorFromMarkup(fillMatch[0], "#111827");
  }
  return /<a:noFill\b/iu.test(shapeMarkup) ? "none" : "#111827";
}

function officeXmlStrokeColor(shapeMarkup) {
  const lineMatch = String(shapeMarkup ?? "").match(/<a:ln\b[\s\S]*?<\/a:ln>/iu);
  if (!lineMatch || /<a:noFill\b/iu.test(lineMatch[0])) {
    return "none";
  }
  return officeXmlColorFromMarkup(lineMatch[0], "none");
}

function officeXmlPathData(pathBody) {
  const commands = [];
  for (const match of String(pathBody ?? "").matchAll(/<a:(moveTo|lnTo|cubicBezTo|quadBezTo)\b[^>]*>([\s\S]*?)<\/a:\1>|<a:close\b[^>]*\/?>/giu)) {
    if (match[0].startsWith("<a:close")) {
      commands.push("Z");
      continue;
    }
    const command = match[1];
    const points = officeXmlPathPoints(match[2]);
    if (command === "moveTo" && points.length >= 1) {
      commands.push(`M ${formatSvgNumber(points[0].x)} ${formatSvgNumber(points[0].y)}`);
    } else if (command === "lnTo" && points.length >= 1) {
      commands.push(`L ${formatSvgNumber(points[0].x)} ${formatSvgNumber(points[0].y)}`);
    } else if (command === "cubicBezTo" && points.length >= 3) {
      commands.push(`C ${formatSvgNumber(points[0].x)} ${formatSvgNumber(points[0].y)} ${formatSvgNumber(points[1].x)} ${formatSvgNumber(points[1].y)} ${formatSvgNumber(points[2].x)} ${formatSvgNumber(points[2].y)}`);
    } else if (command === "quadBezTo" && points.length >= 2) {
      commands.push(`Q ${formatSvgNumber(points[0].x)} ${formatSvgNumber(points[0].y)} ${formatSvgNumber(points[1].x)} ${formatSvgNumber(points[1].y)}`);
    }
  }
  return commands.join(" ");
}

function officeCustomGeometryToSvg(customGeometryMarkup, shapeMarkup) {
  const pathMarkups = Array.from(String(customGeometryMarkup ?? "").matchAll(/<a:path\b([^>]*)>([\s\S]*?)<\/a:path>/giu));
  const svgPaths = [];
  let viewBoxWidth = 0;
  let viewBoxHeight = 0;
  for (const pathMatch of pathMarkups) {
    const attributes = pathMatch[1] ?? "";
    const body = pathMatch[2] ?? "";
    const pathData = officeXmlPathData(body);
    if (!pathData) {
      continue;
    }
    const width = officeXmlNumberAttribute(attributes, "w");
    const height = officeXmlNumberAttribute(attributes, "h");
    viewBoxWidth = Math.max(viewBoxWidth, width);
    viewBoxHeight = Math.max(viewBoxHeight, height);
    svgPaths.push(pathData);
  }
  if (svgPaths.length === 0) {
    return null;
  }
  if (viewBoxWidth <= 0 || viewBoxHeight <= 0) {
    const points = officeXmlPathPoints(customGeometryMarkup);
    viewBoxWidth = Math.max(1, ...points.map((point) => point.x));
    viewBoxHeight = Math.max(1, ...points.map((point) => point.y));
  }
  const fill = officeXmlFillColor(shapeMarkup);
  const stroke = officeXmlStrokeColor(shapeMarkup);
  const strokeAttribute = stroke === "none" ? "" : ` stroke="${escapeSvgAttribute(stroke)}" stroke-width="${formatSvgNumber(Math.max(1, Math.min(viewBoxWidth, viewBoxHeight) / 80))}" stroke-linejoin="round"`;
  const body = svgPaths
    .map((pathData) => `<path d="${escapeSvgAttribute(pathData)}" fill="${escapeSvgAttribute(fill)}"${strokeAttribute}/>`)
    .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${formatSvgNumber(viewBoxWidth)} ${formatSvgNumber(viewBoxHeight)}">${body}</svg>`;
}

function officeXmlLooksLikeDocumentDrawing(entryName) {
  const normalizedName = String(entryName ?? "").replace(/\\/g, "/").toLowerCase();
  return (
    normalizedName.endsWith(".xml") &&
    !normalizedName.includes("/_rels/") &&
    /^(ppt|word|xl)\//u.test(normalizedName) &&
    !normalizedName.includes("/theme/")
  );
}

function extractOfficeVectorSvgEntries(zip, sourceName, remainingSlots) {
  const entries = [];
  for (const entry of zip.getEntries()) {
    if (entry.isDirectory || entries.length >= remainingSlots || !officeXmlLooksLikeDocumentDrawing(entry.entryName)) {
      continue;
    }
    const xml = entry.getData().toString("utf-8");
    for (const match of xml.matchAll(/<a:custGeom\b[\s\S]*?<\/a:custGeom>/giu)) {
      if (entries.length >= remainingSlots) {
        break;
      }
      const contextStart = Math.max(0, match.index - 2200);
      const contextEnd = Math.min(xml.length, match.index + match[0].length + 2200);
      const svg = officeCustomGeometryToSvg(match[0], xml.slice(contextStart, contextEnd));
      if (!svg) {
        continue;
      }
      entries.push({
        name: iconLibraryGeneratedSvgDisplayName(sourceName, entries.length + 1),
        mimeType: "image/svg+xml",
        bytes: Buffer.from(svg, "utf-8"),
        entryName: `${entry.entryName}#vector-${entries.length + 1}`
      });
    }
  }
  return entries;
}

export function extractIconLibraryImageEntries(buffer, fileName = "导入文档图片") {
  const sourceName = iconLibrarySourceName(fileName);
  const zip = new AdmZip(buffer);
  const entries = [];
  const skipped = [];
  const seenHashes = new Set();
  for (const entry of zip.getEntries()) {
    if (entry.isDirectory || entries.length >= maxIconLibraryExtractedAssets) {
      continue;
    }
    const mimeType = iconLibraryEntryMimeType(entry.entryName);
    if (!mimeType) {
      continue;
    }
    const bytes = entry.getData();
    if (bytes.length <= 0 || bytes.length > maxImageBodyBytes) {
      skipped.push(entry.entryName);
      continue;
    }
    const hash = createHash("sha1").update(bytes).digest("hex");
    if (seenHashes.has(hash)) {
      continue;
    }
    seenHashes.add(hash);
    entries.push({
      name: iconLibraryEntryDisplayName(entry.entryName, sourceName),
      mimeType,
      bytes,
      entryName: entry.entryName
    });
  }
  for (const vectorEntry of extractOfficeVectorSvgEntries(zip, sourceName, maxIconLibraryExtractedAssets - entries.length)) {
    if (vectorEntry.bytes.length <= 0 || vectorEntry.bytes.length > maxImageBodyBytes) {
      skipped.push(vectorEntry.entryName);
      continue;
    }
    const hash = createHash("sha1").update(vectorEntry.bytes).digest("hex");
    if (seenHashes.has(hash)) {
      continue;
    }
    seenHashes.add(hash);
    entries.push(vectorEntry);
  }
  return {
    entries,
    skippedCount: skipped.length
  };
}

async function handleImportIconLibrary(request, response) {
  const payload = await readJsonBody(request, maxIconLibraryImportBodyBytes, "文档图片导入文件过大，最大支持 128MB。");
  const { dataUrl, name } = payload;
  if (typeof dataUrl !== "string") {
    sendError(response, 400, "缺少文档图片导入文件数据。");
    return;
  }
  const fileName = safeName(name || "导入文档图片");
  const fileExtension = extname(fileName).toLowerCase();
  if (!iconLibraryArchiveExtensions.has(fileExtension)) {
    sendError(response, 400, "只支持从 DOCX、PPTX、XLSX、VSDX、WPS、DPS 或 ZIP 文件中导入图片素材。");
    return;
  }
  const { bytes } = parseGenericDataUrl(dataUrl);
  let extracted;
  try {
    extracted = extractIconLibraryImageEntries(bytes, fileName);
  } catch {
    sendError(response, 400, "文档图片导入文件不是有效的压缩容器。");
    return;
  }
  const folderId = await resolveFolderId(typeof payload.folderId === "string" ? payload.folderId : "root");
  const items = [];
  for (const entry of extracted.entries) {
    const item = createImageManifestItem({
      name: entry.name,
      mimeType: entry.mimeType,
      bytes: entry.bytes,
      folderId
    });
    await writeImageAssetFile(item, entry.bytes);
    items.push(item);
  }
  if (items.length === 0) {
    sendError(response, 400, "未在文件中找到可直接显示的 SVG、PNG、JPEG、WEBP 或 GIF 图片素材。");
    return;
  }
  await ensureStore();
  const manifest = await readManifest();
  await writeManifest([...items, ...manifest]);
  sendJson(response, 201, {
    ok: true,
    assets: items.map(publicAsset),
    skippedCount: extracted.skippedCount
  });
}

async function handleUpload(request, response) {
  const payload = await readJsonBody(request, maxImageBodyBytes, "图片过大，最大支持 16MB。");
  const { dataUrl, name } = payload;
  if (typeof dataUrl !== "string") {
    sendError(response, 400, "缺少图片数据。");
    return;
  }
  const { mimeType, bytes } = parseDataUrl(dataUrl);
  const folderId = await resolveFolderId(typeof payload.folderId === "string" ? payload.folderId : "root");
  await ensureStore();
  const item = createImageManifestItem({ name, mimeType, bytes, folderId });
  await writeImageAssetFile(item, bytes);
  const manifest = await readManifest();
  await writeManifest([item, ...manifest]);
  sendJson(response, 201, publicAsset(item));
}

async function handleCreateImageFolder(request, response) {
  const payload = await readJsonBody(request);
  const name = safeName(payload.name || "新建文件夹");
  const folders = await readImageFolders();
  if (folders.some((folder) => folder.name.trim() === name.trim())) {
    sendError(response, 409, "图片文件夹名称重复。");
    return;
  }
  const folder = {
    id: `folder-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name,
    createdAt: new Date().toISOString()
  };
  await writeImageFolders([...folders, folder]);
  sendJson(response, 201, folder);
}

async function handleRenameImageFolder(folderId, request, response) {
  if (folderId === "root") {
    sendError(response, 400, "默认文件夹不能重命名。");
    return;
  }
  const payload = await readJsonBody(request);
  const name = safeName(payload.name || "");
  if (!name) {
    sendError(response, 400, "文件夹名称不能为空。");
    return;
  }
  const folders = await readImageFolders();
  if (!folders.some((folder) => folder.id === folderId)) {
    sendError(response, 404, "图片文件夹不存在。");
    return;
  }
  if (folders.some((folder) => folder.id !== folderId && folder.name.trim() === name.trim())) {
    sendError(response, 409, "图片文件夹名称重复。");
    return;
  }
  const next = folders.map((folder) => (folder.id === folderId ? { ...folder, name } : folder));
  await writeImageFolders(next);
  sendJson(response, 200, next.find((folder) => folder.id === folderId));
}

async function handleDeleteImageFolder(folderId, response) {
  if (folderId === "root") {
    sendError(response, 400, "默认文件夹不能删除。");
    return;
  }
  const folders = await readImageFolders();
  if (!folders.some((folder) => folder.id === folderId)) {
    sendError(response, 404, "图片文件夹不存在。");
    return;
  }
  await writeImageFolders(folders.filter((folder) => folder.id !== folderId));
  const manifest = await readManifest();
  await writeManifest(manifest.map((item) => (item.folderId === folderId ? { ...item, folderId: "root" } : item)));
  sendJson(response, 200, { ok: true });
}

async function handleDownload(id, response) {
  const manifest = await readManifest();
  const item = manifest.find((entry) => entry.id === id);
  if (!item) {
    sendError(response, 404, "图片不存在。");
    return;
  }
  response.writeHead(200, {
    "content-type": item.mimeType,
    "cache-control": "public, max-age=31536000, immutable",
    "access-control-allow-origin": "*"
  });
  createReadStream(join(imageDataDir, item.filename)).pipe(response);
}

async function handleDeleteImageAsset(id, response) {
  const manifest = await readManifest();
  const item = manifest.find((entry) => entry.id === id);
  if (!item) {
    sendError(response, 404, "图片不存在。");
    return;
  }
  await writeManifest(manifest.filter((entry) => entry.id !== id));
  await rm(join(imageDataDir, item.filename), { force: true });
  sendJson(response, 200, { ok: true });
}

async function handleSaveSchemes(request, response) {
  const payload = await readJsonBody(request, maxSchemeBodyBytes, "方案/模型数据过大，最大支持 64MB。");
  const schemes = Array.isArray(payload) ? payload : payload.schemes;
  if (!Array.isArray(schemes)) {
    sendError(response, 400, "缺少方案/模型数据。");
    return;
  }
  const normalized = normalizeSchemesForStorage(schemes);
  await writeSchemes(normalized);
  sendJson(response, 200, { ok: true, schemes: normalized, savedAt: new Date().toISOString() });
}

async function handleReadSchemeProject(url, response) {
  const name = url.searchParams.get("name") || url.searchParams.get("projectName") || "";
  if (!name.trim()) {
    sendError(response, 400, "缺少模型名称。");
    return;
  }
  const project = await readSchemeProjectRecord({
    schemePath: parseSchemePathParam(url.searchParams.get("schemePath")),
    name
  });
  if (!project) {
    sendError(response, 404, "模型文件不存在。");
    return;
  }
  sendJson(response, 200, { ok: true, project });
}

async function handleSaveSchemeProject(request, response) {
  const payload = await readJsonBody(request, maxSchemeBodyBytes, "模型数据过大，最大支持 64MB。");
  const record = payload.record ?? {
    name: payload.name || payload.project?.name,
    updatedAt: payload.updatedAt,
    project: payload.project
  };
  if (!record?.project || typeof record.project !== "object") {
    sendError(response, 400, "缺少模型数据。");
    return;
  }
  const savedRecord = await saveSchemeProjectRecord({
    schemePath: payload.schemePath,
    record,
    previousName: payload.previousName,
    measurementConfig: await readMeasurementConfig(),
    imagePathById: await imageExportPathByIdFromManifest(await readManifest()),
    svg: typeof payload.svg === "string" ? payload.svg : undefined,
    eFile: typeof payload.eFile === "string" ? payload.eFile : undefined
  });
  sendJson(response, 200, { ok: true, project: savedRecord, savedAt: new Date().toISOString() });
}

async function handleSaveSchemeProjectArtifacts(request, response) {
  const payload = await readJsonBody(request, maxSchemeBodyBytes, "模型产物数据过大，最大支持 64MB。");
  const schemePath = Array.isArray(payload.schemePath) && payload.schemePath.length > 0 ? payload.schemePath : null;
  const name = typeof payload.name === "string" ? payload.name.trim() : "";
  if (!schemePath || !name) {
    sendError(response, 400, "缺少方案路径或模型名称。");
    return;
  }
  const filesRoot = join(schemeDataDir, "files");
  const schemeDir = schemeDirectoryFromPath(filesRoot, schemePath);
  const { ePath, svgPath } = projectFilePathsForName(schemeDir, storageProjectDisplayName(name));
  const tasks = [];
  if (typeof payload.svg === "string") {
    tasks.push(writeTextIfChanged(svgPath, payload.svg));
  }
  if (typeof payload.eFile === "string") {
    tasks.push(writeTextIfChanged(ePath, payload.eFile));
  }
  await Promise.all(tasks);
  sendJson(response, 200, { ok: true, savedAt: new Date().toISOString() });
}

async function handleDeleteSchemeProject(request, response) {
  const payload = await readJsonBody(request, maxSchemeBodyBytes, "模型数据过大，最大支持 64MB。");
  if (!payload.name && !payload.projectName) {
    sendError(response, 400, "缺少模型名称。");
    return;
  }
  await deleteSchemeProjectRecord({
    schemePath: payload.schemePath,
    name: payload.name || payload.projectName
  });
  sendJson(response, 200, { ok: true, savedAt: new Date().toISOString() });
}

async function handleSaveSchemeRecord(request, response) {
  const payload = await readJsonBody(request, maxSchemeBodyBytes, "方案数据过大，最大支持 64MB。");
  if (!Array.isArray(payload.schemePath) || payload.schemePath.length === 0) {
    sendError(response, 400, "缺少方案路径。");
    return;
  }
  await saveSchemeRecordDirectory({
    schemePath: payload.schemePath,
    previousSchemePath: payload.previousSchemePath
  });
  sendJson(response, 200, { ok: true, savedAt: new Date().toISOString() });
}

async function handleDeleteSchemeRecord(request, response) {
  const payload = await readJsonBody(request, maxSchemeBodyBytes, "方案数据过大，最大支持 64MB。");
  if (!Array.isArray(payload.schemePath) || payload.schemePath.length === 0) {
    sendError(response, 400, "缺少方案路径。");
    return;
  }
  await deleteSchemeRecordDirectory({
    schemePath: payload.schemePath
  });
  sendJson(response, 200, { ok: true, savedAt: new Date().toISOString() });
}

async function handleExportSchemeArchive(url, response) {
  const filesRoot = join(schemeDataDir, "files");
  const schemePath = parseSchemePathParam(url.searchParams.get("schemePath"));
  try {
    const { buffer, filename } = await createSchemeArchiveBuffer({ filesRoot, schemePath });
    response.writeHead(200, {
      "content-type": "application/zip",
      "content-length": String(buffer.length),
      "content-disposition": `attachment; filename="${encodeURIComponent(filename)}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
      "cache-control": "no-store",
      ...accessControlHeaders
    });
    response.end(buffer);
  } catch (error) {
    const message = error instanceof Error ? error.message : "导出方案压缩包失败。";
    if (message.includes("缺少方案路径")) {
      sendError(response, 400, message);
      return;
    }
    sendError(response, 404, "方案目录不存在。");
  }
}

async function handleImportSchemeArchive(url, request, response) {
  const filesRoot = join(schemeDataDir, "files");
  const trashRoot = schemeTrashDir;
  const parentPath = parseSchemePathParam(url.searchParams.get("parentPath"));
  const fileName = url.searchParams.get("fileName") || "导入方案.zip";
  const mode = url.searchParams.get("mode") === "overwrite" ? "overwrite" : "check";
  const targetName = url.searchParams.get("targetName") || "";
  const buffer = await readRawBody(request, maxSchemeZipBodyBytes, "方案压缩包过大，最大支持 256MB。");
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
    sendError(response, 400, "缺少方案压缩包。");
    return;
  }
  let zip;
  try {
    zip = new AdmZip(buffer);
  } catch {
    sendError(response, 400, "zip 文件格式不正确。");
    return;
  }
  try {
    const result = await importSchemeArchiveBuffer({ filesRoot, trashRoot, buffer, parentPath, fileName, mode, targetName });
    if (result.conflict) {
      sendJson(response, 409, { error: "方案目录已存在。", ...result });
      return;
    }
    const schemes = normalizeSchemesForStorage(await readSchemes());
    sendJson(response, 200, {
      ok: true,
      schemes,
      importedName: result.importedName,
      importedPath: result.importedPath,
      savedAt: new Date().toISOString()
    });
  } catch (error) {
    sendError(response, 400, error instanceof Error ? error.message : "导入方案压缩包失败。");
  }
}

async function handleSaveColorConfig(request, response) {
  const payload = await readJsonBody(request, maxColorConfigBodyBytes, "配色配置数据过大，最大支持 1MB。");
  const normalized = await writeColorConfig(payload);
  sendJson(response, 200, { ok: true, ...normalized });
}

async function handleSaveMeasurementConfig(request, response) {
  const payload = await readJsonBody(request, maxMeasurementConfigBodyBytes, "动态量测配置数据过大，最大支持 1MB。");
  const normalized = await writeMeasurementConfig(payload);
  sendJson(response, 200, { ok: true, ...normalized });
}

async function handleSaveDeviceLibrary(request, response) {
  const payload = await readJsonBody(request, maxDeviceLibraryBodyBytes, "图元库数据过大，最大支持 16MB。");
  const normalized = await writeDeviceLibraryConfig(payload);
  sendJson(response, 200, { ok: true, ...normalized });
}

const staticAssetMimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".map": "application/json; charset=utf-8"
};

function isPathInsideStaticRoot(targetPath, staticRoot) {
  const relativePath = relative(staticRoot, targetPath);
  return Boolean(relativePath) && !relativePath.startsWith("..") && !isAbsolute(relativePath);
}

async function serveIconLibraryAsset(request, response, url) {
  if (request.method !== "GET" || (url.pathname !== "/icon-library" && !url.pathname.startsWith("/icon-library/"))) {
    return false;
  }
  const relativeUrlPath =
    url.pathname === "/icon-library" || url.pathname === "/icon-library/" ? "index.html" : url.pathname.slice("/icon-library/".length);
  let decodedPath;
  try {
    decodedPath = decodeURIComponent(relativeUrlPath);
  } catch {
    sendError(response, 404, "资源不存在。");
    return true;
  }
  const filePath = resolve(iconLibraryDataDir, decodedPath);
  if (!isPathInsideStaticRoot(filePath, iconLibraryDataDir)) {
    sendError(response, 404, "资源不存在。");
    return true;
  }
  try {
    const info = await stat(filePath);
    if (!info.isFile()) {
      sendError(response, 404, "资源不存在。");
      return true;
    }
    const ext = extname(filePath).toLowerCase();
    response.writeHead(200, {
      "content-type": staticAssetMimeTypes[ext] ?? "application/octet-stream",
      "cache-control": "no-cache",
      ...accessControlHeaders
    });
    createReadStream(filePath).pipe(response);
    return true;
  } catch {
    sendError(response, 404, "资源不存在。");
    return true;
  }
}

// prod 静态资源托管：dist/ 存在时，非 /api、/ws 请求走静态文件 + SPA fallback。
// dev 模式 staticRoot 为空，跳过（Vite 自处理前端）。
async function serveStaticAsset(request, response, url, staticRoot) {
  if (!staticRoot) {
    return false;
  }
  const pathname = url.pathname;
  // /api、/ws 不走静态托管
  if (pathname === "/ws" || pathname.startsWith("/webgrp/")) {
    return false;
  }
  const safePathname = pathname === "/" ? "/index.html" : pathname;
  const filePath = join(staticRoot, safePathname);
  if (!isPathInsideStaticRoot(filePath, staticRoot)) {
    sendError(response, 404, "资源不存在。");
    return true;
  }
  try {
    const info = await stat(filePath);
    if (info.isFile()) {
      const ext = extname(filePath).toLowerCase();
      response.writeHead(200, {
        "content-type": staticAssetMimeTypes[ext] ?? "application/octet-stream",
        "cache-control": "public, max-age=0, must-revalidate",
        ...accessControlHeaders
      });
      createReadStream(filePath).pipe(response);
      return true;
    }
  } catch {
    // 文件不存在，fall through 到 SPA fallback
  }
  // SPA fallback：未命中文件的非越界请求返回 index.html（越界已在上方拦截）
  const indexPath = join(staticRoot, "index.html");
  try {
    const info = await stat(indexPath);
    if (info.isFile()) {
      response.writeHead(200, {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "no-cache",
        ...accessControlHeaders
      });
      createReadStream(indexPath).pipe(response);
      return true;
    }
  } catch {
    // index.html 不存在，交还调用方返 404
  }
  return false;
}

export async function createImageServer({ port = 5174, host = "127.0.0.1", staticRoot } = {}) {
  const exactRouteHandlers = new Map([
    ["GET /swigger", async ({ response }) => {
      const { renderSwaggerHtml } = await import("./swaggerPage.mjs");
      const html = renderSwaggerHtml();
      response.writeHead(200, {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "no-cache",
        ...accessControlHeaders
      });
      response.end(html);
    }],
    ["GET /webgrp/images", async ({ url, request, response }) => {
      const manifest = await readManifest();
      const folderId = url.searchParams.get("folderId");
      const filtered = folderId ? manifest.filter((item) => (item.folderId || "root") === folderId) : manifest;
      await sendJsonCacheable(request, response, filtered.map(publicAsset));
    }],
    ["POST /webgrp/images", async ({ request, response }) => {
      await handleUpload(request, response);
    }],
    ["POST /webgrp/icon-library/import", async ({ request, response }) => {
      await handleImportIconLibrary(request, response);
    }],
    ["POST /webgrp/image-library/import", async ({ request, response }) => {
      await handleImportImageLibrary(request, response);
    }],
    ["GET /webgrp/image-folders", async ({ request, response }) => {
      const folders = await readImageFolders();
      const manifest = await readManifest();
      const counts = imageCountsByFolder(manifest);
      await sendJsonCacheable(
        request,
        response,
        folders.map((folder) => ({
          ...folder,
          imageCount: counts.get(folder.id) ?? 0
        }))
      );
    }],
    ["POST /webgrp/image-folders", async ({ request, response }) => {
      await handleCreateImageFolder(request, response);
    }],
    ["GET /webgrp/schemes", async ({ url, request, response }) => {
      const includeProjects = url.searchParams.get("includeProjects") === "1";
      const schemes = normalizeSchemesForStorage(await readSchemes({ includeProjects }));
      await sendJsonCacheable(request, response, { schemes });
    }],
    ["GET /webgrp/schemes/export", async ({ url, response }) => {
      await handleExportSchemeArchive(url, response);
    }],
    ["POST /webgrp/schemes/import", async ({ url, request, response }) => {
      await handleImportSchemeArchive(url, request, response);
    }],
    ["PUT /webgrp/schemes", async ({ request, response }) => {
      await handleSaveSchemes(request, response);
    }],
    ["GET /webgrp/schemes/project", async ({ url, response }) => {
      await handleReadSchemeProject(url, response);
    }],
    ["PUT /webgrp/schemes/project", async ({ request, response }) => {
      await handleSaveSchemeProject(request, response);
    }],
    ["PUT /webgrp/schemes/project/artifacts", async ({ request, response }) => {
      await handleSaveSchemeProjectArtifacts(request, response);
    }],
    ["DELETE /webgrp/schemes/project", async ({ request, response }) => {
      await handleDeleteSchemeProject(request, response);
    }],
    ["PUT /webgrp/schemes/scheme", async ({ request, response }) => {
      await handleSaveSchemeRecord(request, response);
    }],
    ["DELETE /webgrp/schemes/scheme", async ({ request, response }) => {
      await handleDeleteSchemeRecord(request, response);
    }],
    ["GET /webgrp/color-config", async ({ request, response }) => {
      await sendCachedJsonFile(request, response, colorConfigPath, readColorConfig);
    }],
    ["PUT /webgrp/color-config", async ({ request, response }) => {
      await handleSaveColorConfig(request, response);
    }],
    ["GET /webgrp/measurement-config", async ({ request, response }) => {
      await sendCachedJsonFile(request, response, measurementConfigPath, readMeasurementConfig);
    }],
    ["PUT /webgrp/measurement-config", async ({ request, response }) => {
      await handleSaveMeasurementConfig(request, response);
    }],
    ["GET /webgrp/device-library", async ({ request, response }) => {
      await sendCachedJsonFile(request, response, deviceLibraryPath, readDeviceLibraryConfig);
    }],
    ["PUT /webgrp/device-library", async ({ request, response }) => {
      await handleSaveDeviceLibrary(request, response);
    }]
  ]);
  const dynamicRouteHandlers = [
    {
      method: "PUT",
      pattern: /^\/webgrp\/image-folders\/([^/]+)$/u,
      handle: async ({ match, request, response }) => {
        await handleRenameImageFolder(decodeURIComponent(match[1]), request, response);
      }
    },
    {
      method: "DELETE",
      pattern: /^\/webgrp\/image-folders\/([^/]+)$/u,
      handle: async ({ match, response }) => {
        await handleDeleteImageFolder(decodeURIComponent(match[1]), response);
      }
    },
    {
      method: "GET",
      pattern: /^\/webgrp\/images\/([^/]+)$/u,
      handle: async ({ match, response }) => {
        await handleDownload(match[1], response);
      }
    },
    {
      method: "DELETE",
      pattern: /^\/webgrp\/images\/([^/]+)$/u,
      handle: async ({ match, response }) => {
        await handleDeleteImageAsset(match[1], response);
      }
    }
  ];

  // 运行时态 WS 桥接：客户端注册表 + /ws 升级 + fetch 拉取
  const { createRuntimeRegistry } = await import("./runtimeRegistry.mjs");
  const { attachRuntimeWebSocket } = await import("./runtimeWs.mjs");
  const { createV1RuntimeRoutes } = await import("./apiV1Runtime.mjs");
  const { createV1ControlRoutes } = await import("./apiV1Control.mjs");
  const runtimeRegistry = createRuntimeRegistry();
  // runtimeWs 在 server 创建后挂载（attachRuntimeWebSocket 需要 server.on("upgrade")）
  let runtimeWs = null;
  let v1RuntimeRoutes = [];
  let v1ControlRoutes = [];

  const server = createServer(async (request, response) => {
    try {
      const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "127.0.0.1"}`);
      if (request.method === "OPTIONS") {
        response.writeHead(204, accessControlHeaders);
        response.end();
        return;
      }
      const servedIconLibraryAsset = await serveIconLibraryAsset(request, response, url);
      if (servedIconLibraryAsset) {
        return;
      }
      const exactRouteHandler = exactRouteHandlers.get(`${request.method} ${url.pathname}`);
      if (exactRouteHandler) {
        await exactRouteHandler({ request, response, url });
        return;
      }
      for (const route of dynamicRouteHandlers) {
        if (route.method !== request.method) {
          continue;
        }
        const match = route.pattern.exec(url.pathname);
        if (match) {
          await route.handle({ match, request, response, url });
          return;
        }
      }
      // /webgrp/v1/* 第三方只读路由（动态加载避开循环依赖）
      if (url.pathname.startsWith("/webgrp/v1/")) {
        const { v1SchemeRoutes } = await import("./apiV1Schemes.mjs");
        const { v1LibraryRoutes } = await import("./apiV1Library.mjs");
        const v1Routes = [...v1SchemeRoutes, ...v1LibraryRoutes, ...v1RuntimeRoutes, ...v1ControlRoutes];
        for (const route of v1Routes) {
          if (route.method !== request.method) {
            continue;
          }
          const match = route.pattern.exec(url.pathname);
          if (match) {
            await route.handle({ request, response, url, match });
            return;
          }
        }
      }
      // 路由未命中：prod 模式尝试静态资源托管（dev 模式 staticRoot 为空，跳过返 404）
      const served = await serveStaticAsset(request, response, url, staticRoot);
      if (served) {
        return;
      }
      sendError(response, 404, "接口不存在。");
    } catch (error) {
      sendError(response, 500, error instanceof Error ? error.message : "后端处理失败。");
    }
  });
  // server 创建后挂载运行时态 WS 桥接（需 server.on("upgrade")）
  runtimeWs = attachRuntimeWebSocket(server, runtimeRegistry);
  v1RuntimeRoutes = createV1RuntimeRoutes(runtimeWs);
  v1ControlRoutes = createV1ControlRoutes(runtimeWs);

  return new Promise((resolveServer) => {
    server.listen(port, host, () => resolveServer(server));
  });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.IMAGE_SERVER_PORT ?? 5174);
  const host = process.env.IMAGE_SERVER_HOST ?? "127.0.0.1";
  // prod 模式：dist/ 存在则托管静态资源（同端口同源）。dev 模式由 dev.mjs 单独跑 Vite。
  const staticRoot = resolve(repoRoot, "dist");
  let staticRootArg;
  try {
    if ((await stat(staticRoot)).isDirectory()) {
      staticRootArg = staticRoot;
    }
  } catch {
    // dist/ 不存在（dev 或未构建），不托管静态资源
  }
  await createImageServer({ port, host, staticRoot: staticRootArg });
  console.log(`Image backend listening at http://${host}:${port}`);
}
