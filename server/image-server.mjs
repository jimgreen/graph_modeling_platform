import { createServer } from "node:http";
import { mkdir, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import { createReadStream } from "node:fs";
import { extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createMeasurementService, diffMeasurementValues } from "./measurement-service.mjs";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const repoRoot = resolve(__dirname, "..");
const imageDataDir = resolve(repoRoot, "data", "images");
const manifestPath = join(imageDataDir, "manifest.json");
const imageFoldersPath = join(imageDataDir, "folders.json");
const schemeDataDir = resolve(repoRoot, "data", "schemes");
const settingsDataDir = resolve(repoRoot, "data", "settings");
const colorConfigPath = join(settingsDataDir, "color-config.json");
const measurementConfigPath = join(settingsDataDir, "measurement-config.json");
const measurementDataDir = resolve(repoRoot, "data", "measurements");
const measurementSampleValuesPath = join(measurementDataDir, "sample-values.json");
const deviceLibraryDataDir = resolve(repoRoot, "data", "device-library");
const deviceLibraryPath = join(deviceLibraryDataDir, "library.json");
const maxImageBodyBytes = 16 * 1024 * 1024;
const maxSchemeBodyBytes = 64 * 1024 * 1024;
const maxColorConfigBodyBytes = 1024 * 1024;
const maxDeviceLibraryBodyBytes = 16 * 1024 * 1024;
const maxFilePartLength = 80;
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
const defaultStaticComponentType = "StaticBasicShape";
const staticComponentTypeByKind = {
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
function staticComponentTypeForKind(kind) {
  return staticComponentTypeByKind[String(kind ?? "")] ?? defaultStaticComponentType;
}
const eSectionColumns = {
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
  ACNode: ["idx", "name", "vbase", "voltage", "angle", "isl", "run_stat"],
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
  ACTransfomer3: ["idx", "name", "run_stat", "idx_xf_t1", "idx_xf_t2", "idx_xf_t3"],
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

async function readSchemeDirectory(dirent, parentDir) {
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
      const child = await readSchemeDirectory(entry, schemeDir);
      if (child) {
        children.push(child);
      }
      continue;
    }
    if (!entry.isFile() || !/\.json$/iu.test(entry.name) || entry.name.toLocaleLowerCase() === "scheme.json") {
      continue;
    }
    const project = await readSchemeProjectFile(entryPath, entry.name);
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

async function readSchemesFromFiles() {
  const filesRoot = join(schemeDataDir, "files");
  await mkdir(filesRoot, { recursive: true });
  const entries = await readdir(filesRoot, { withFileTypes: true });
  const schemes = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }
    const scheme = await readSchemeDirectory(entry, filesRoot);
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

async function readSchemes() {
  return readSchemesFromFiles();
}

async function writeSchemes(schemes) {
  await ensureSchemeStore();
  await writeSchemeFiles(schemes);
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

function normalizeDeviceLibraryConfig(payload) {
  const source = payload && typeof payload === "object" && !Array.isArray(payload) ? payload : {};
  const customDeviceTemplates = Array.isArray(source.customDeviceTemplates) ? source.customDeviceTemplates : [];
  const customAttributeLibraries = Array.isArray(source.customAttributeLibraries) ? source.customAttributeLibraries : [];
  const customComponentTypes = Array.isArray(source.customComponentTypes) ? source.customComponentTypes : [];
  const customGraphTemplateTypes = Array.isArray(source.customGraphTemplateTypes) ? source.customGraphTemplateTypes : [];
  const customGraphTemplates = Array.isArray(source.customGraphTemplates) ? source.customGraphTemplates : [];
  const deviceDefinitionOverrides =
    source.deviceDefinitionOverrides && typeof source.deviceDefinitionOverrides === "object" && !Array.isArray(source.deviceDefinitionOverrides)
      ? source.deviceDefinitionOverrides
      : {};
  return {
    customDeviceTemplates,
    customAttributeLibraries,
    customComponentTypes,
    customGraphTemplateTypes,
    customGraphTemplates,
    deviceDefinitionOverrides
  };
}

async function readDeviceLibraryConfig() {
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
          ? { backgroundImage: `/api/images/${assetId}` }
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
    const componentType = String(params.component_type ?? "").trim();
    return componentType && componentType !== "StaticSymbol" ? componentType : staticComponentTypeForKind(kind);
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
  if (kind === "acdc-converter") return "DCACConverter";
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

function getEParamValue(key, node, options = {}) {
  const params = node?.params ?? {};
  if (key === "name") return node?.name ?? "";
  if (key === "run_stat") return normalizeRunStatForE(params.run_stat);
  if (key === "status") return normalizeSwitchStatusForE(params.status ?? params.closedStatus);
  if (key === "control_type") return params.control_type ?? params.controlType ?? params.sourceControlType ?? "";
  if (key === "vbase") return params.vbase ?? node?.terminals?.[0]?.vbase ?? "";
  if (key === "node") return options.preferTopologyNodeNumbers ? terminalNodeNumber(node, 0) : params.node ?? terminalNodeNumber(node, 0);
  if (key === "i_node") return options.preferTopologyNodeNumbers ? terminalNodeNumber(node, 0) : params.i_node ?? terminalNodeNumber(node, 0);
  if (key === "j_node") return options.preferTopologyNodeNumbers ? terminalNodeNumber(node, 1) : params.j_node ?? terminalNodeNumber(node, 1);
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

function getEParameterKeys(kind, params = {}) {
  const section = inferESection(kind, params);
  return section ? eSectionColumns[section] ?? [] : [];
}

function buildEDeviceValues(node, options = {}) {
  const values = {};
  for (const key of getEParameterKeys(node.kind, node.params)) {
    const value = getEParamValue(key, node, options);
    if (value !== "") {
      values[key] = value;
    }
  }
  return values;
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

function buildDeviceParameterFile(project) {
  const topologyNodes = calculateElectricalTopology(project.nodes ?? [], project.edges ?? []);
  const topologyNodeDevices = buildTopologyNodeDevices(topologyNodes);
  const deviceRecords = topologyNodes
    .map((node) => {
      const section = inferESection(node.kind, node.params ?? {});
      if (!section || section === "ACNode" || section === "DCNode") return null;
      return {
        id: node.id,
        kind: node.kind,
        section,
        params: buildEDeviceValues(node, { preferTopologyNodeNumbers: true })
      };
    })
    .filter(Boolean);
  return JSON.stringify(
    {
      version: 1,
      name: project.name,
      modelParameters: {
        powerUnit: project.powerUnit ?? defaultPowerUnit,
        voltageUnit: project.voltageUnit ?? defaultVoltageUnit,
        currentUnit: project.currentUnit ?? defaultCurrentUnit,
        powerBaseValue: project.powerBaseValue ?? defaultPowerBaseValue
      },
      devices: [...topologyNodeDevices, ...deviceRecords],
      edges: project.edges ?? []
    },
    null,
    2
  );
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

function buildSvgFile(project) {
  const width = Number(project.canvasWidth ?? 1920);
  const height = Number(project.canvasHeight ?? 1024);
  const edgeMarkup = (project.edges ?? [])
    .map((edge) => {
      const start = endpointPoint(project, edge, "source");
      const end = endpointPoint(project, edge, "target");
      const midX = Math.round((start.x + end.x) / 2);
      const points = [start, { x: midX, y: start.y }, { x: midX, y: end.y }, end]
        .map((point) => `${point.x},${point.y}`)
        .join(" ");
      return `<polyline points="${points}" fill="none" stroke="#334155" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`;
    })
    .join("\n");
  const nodeMarkup = (project.nodes ?? [])
    .map((node) => {
      const width = node.size?.width ?? 80;
      const height = node.size?.height ?? 48;
      const stroke = String(node.kind ?? "").startsWith("dc") || String(node.kind ?? "").includes("dcdc") ? "#0f766e" : "#2563eb";
      const isBus = String(node.kind ?? "").includes("bus");
      const image = node.params?.backgroundImageAssetId ? `/api/images/${node.params.backgroundImageAssetId}` : node.params?.backgroundImage ?? "";
      const transform = `translate(${node.position?.x ?? 0} ${node.position?.y ?? 0}) rotate(${node.rotation ?? 0}) scale(${node.scaleX ?? node.scale ?? 1} ${node.scaleY ?? node.scale ?? 1})`;
      if (isBus) {
        const thickness = Math.max(8, height / 3);
        return `<g transform="${transform}"><title>${node.name ?? ""}</title><rect class="bus-glyph" x="${-width / 2}" y="${-thickness / 2}" width="${width}" height="${thickness}" fill="${stroke}" stroke="none"/></g>`;
      }
      return `<g transform="${transform}"><title>${node.name ?? ""}</title><rect x="${-width / 2}" y="${-height / 2}" width="${width}" height="${height}" rx="8" fill="#ffffff" stroke="#94a3b8"/>${image ? `<image href="${image}" x="${-width / 2}" y="${-height / 2}" width="${width}" height="${height}" preserveAspectRatio="xMidYMid slice"/>` : ""}</g>`;
    })
    .join("\n");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
<rect width="100%" height="100%" fill="#f8fafc"/>
${edgeMarkup}
${nodeMarkup}
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

async function removeStaleSchemeFiles(filesRoot, expectedFiles, expectedDirs) {
  const { files, dirs } = await listSchemeStoreEntries(filesRoot);
  await Promise.all(files.filter((filePath) => !expectedFiles.has(filePath)).map((filePath) => rm(filePath, { force: true })));
  for (const dir of dirs.sort((first, second) => second.length - first.length)) {
    if (!expectedDirs.has(dir)) {
      await rm(dir, { recursive: true, force: true });
    }
  }
}

async function writeSchemeFiles(schemes) {
  const filesRoot = join(schemeDataDir, "files");
  await mkdir(filesRoot, { recursive: true });
  const expectedFiles = new Set();
  const expectedDirs = new Set([filesRoot]);
  const writeTasks = [];

  const writeSchemeTree = async (scheme, parentDir) => {
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
      writeTasks.push(
        writeTextIfChanged(jsonPath, stringifyJson(record.project)),
        writeTextIfChanged(ePath, buildDeviceParameterFile(record.project)),
        writeTextIfChanged(svgPath, buildSvgFile(record.project))
      );
    }
    for (const childScheme of scheme.children ?? []) {
      await writeSchemeTree(childScheme, schemeDir);
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
    folderId: item.folderId || "root",
    mimeType: item.mimeType,
    size: item.size,
    createdAt: item.createdAt,
    url: `/api/images/${item.id}`
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

async function handleUpload(request, response) {
  const payload = await readJsonBody(request, maxImageBodyBytes, "图片过大，最大支持 16MB。");
  const { dataUrl, name } = payload;
  if (typeof dataUrl !== "string") {
    sendError(response, 400, "缺少图片数据。");
    return;
  }
  const { mimeType, bytes } = parseDataUrl(dataUrl);
  const folderId = await resolveFolderId(typeof payload.folderId === "string" ? payload.folderId : "root");
  const id = `img-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const filename = `${id}${mimeExt[mimeType]}`;
  await ensureStore();
  await writeFile(join(imageDataDir, filename), bytes);
  const item = {
    id,
    name: safeName(name),
    folderId,
    mimeType,
    size: bytes.length,
    filename,
    createdAt: new Date().toISOString()
  };
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

async function handleSaveColorConfig(request, response) {
  const payload = await readJsonBody(request, maxColorConfigBodyBytes, "配色配置数据过大，最大支持 1MB。");
  const normalized = await writeColorConfig(payload);
  sendJson(response, 200, { ok: true, ...normalized });
}

async function handleSaveDeviceLibrary(request, response) {
  const payload = await readJsonBody(request, maxDeviceLibraryBodyBytes, "图元库数据过大，最大支持 16MB。");
  const normalized = await writeDeviceLibraryConfig(payload);
  sendJson(response, 200, { ok: true, ...normalized });
}

export function createImageServer({ port = 5174, host = "127.0.0.1" } = {}) {
  const measurementService = createMeasurementService({
    configPath: measurementConfigPath,
    sampleValuesPath: measurementSampleValuesPath
  });
  const exactRouteHandlers = new Map([
    ["GET /api/images", async ({ url, response }) => {
      const manifest = await readManifest();
      const folderId = url.searchParams.get("folderId");
      const filtered = folderId ? manifest.filter((item) => (item.folderId || "root") === folderId) : manifest;
      sendJson(response, 200, filtered.map(publicAsset));
    }],
    ["POST /api/images", async ({ request, response }) => {
      await handleUpload(request, response);
    }],
    ["GET /api/image-folders", async ({ response }) => {
      const folders = await readImageFolders();
      const manifest = await readManifest();
      const counts = imageCountsByFolder(manifest);
      sendJson(
        response,
        200,
        folders.map((folder) => ({
          ...folder,
          imageCount: counts.get(folder.id) ?? 0
        }))
      );
    }],
    ["POST /api/image-folders", async ({ request, response }) => {
      await handleCreateImageFolder(request, response);
    }],
    ["GET /api/schemes", async ({ response }) => {
      const schemes = normalizeSchemesForStorage(await readSchemes());
      sendJson(response, 200, { schemes });
    }],
    ["PUT /api/schemes", async ({ request, response }) => {
      await handleSaveSchemes(request, response);
    }],
    ["GET /api/color-config", async ({ response }) => {
      const colorConfig = await readColorConfig();
      sendJson(response, 200, colorConfig);
    }],
    ["PUT /api/color-config", async ({ request, response }) => {
      await handleSaveColorConfig(request, response);
    }],
    ["GET /api/device-library", async ({ response }) => {
      const deviceLibraryConfig = await readDeviceLibraryConfig();
      sendJson(response, 200, deviceLibraryConfig);
    }],
    ["PUT /api/device-library", async ({ request, response }) => {
      await handleSaveDeviceLibrary(request, response);
    }],
    ["GET /api/measurements/config", async ({ response }) => {
      sendJson(response, 200, await measurementService.getConfig());
    }],
    ["GET /api/measurements/status", async ({ response }) => {
      sendJson(response, 200, await measurementService.getStatus());
    }],
    ["GET /api/measurements/catalog", async ({ response }) => {
      sendJson(response, 200, await measurementService.getCatalog());
    }],
    ["GET /api/measurements/snapshot", async ({ url, response }) => {
      sendJson(response, 200, await measurementService.getSnapshot({
        schemePath: url.searchParams.get("schemePath") || "",
        modelName: url.searchParams.get("modelName") || ""
      }));
    }],
    ["GET /api/measurements/stream", async ({ url, request, response }) => {
      response.writeHead(200, {
        "content-type": "text/event-stream; charset=utf-8",
        "cache-control": "no-store",
        connection: "keep-alive",
        ...accessControlHeaders
      });
      let lastValues = [];
      const writePatch = async () => {
        const snapshot = await measurementService.getSnapshot({
          schemePath: url.searchParams.get("schemePath") || "",
          modelName: url.searchParams.get("modelName") || ""
        });
        const values = diffMeasurementValues(lastValues, snapshot.values);
        lastValues = snapshot.values;
        if (values.length > 0) {
          response.write("event: measurement.patch\n");
          response.write(`data: ${JSON.stringify({ version: "1.0", timestamp: snapshot.timestamp, sequence: snapshot.sequence, values })}\n\n`);
        }
      };
      await writePatch();
      const timer = setInterval(() => {
        writePatch().catch(() => undefined);
      }, 1000);
      request.on("close", () => clearInterval(timer));
    }]
  ]);
  const dynamicRouteHandlers = [
    {
      method: "PUT",
      pattern: /^\/api\/image-folders\/([^/]+)$/u,
      handle: async ({ match, request, response }) => {
        await handleRenameImageFolder(decodeURIComponent(match[1]), request, response);
      }
    },
    {
      method: "DELETE",
      pattern: /^\/api\/image-folders\/([^/]+)$/u,
      handle: async ({ match, response }) => {
        await handleDeleteImageFolder(decodeURIComponent(match[1]), response);
      }
    },
    {
      method: "GET",
      pattern: /^\/api\/images\/([^/]+)$/u,
      handle: async ({ match, response }) => {
        await handleDownload(match[1], response);
      }
    }
  ];
  const server = createServer(async (request, response) => {
    try {
      const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "127.0.0.1"}`);
      if (request.method === "OPTIONS") {
        response.writeHead(204, accessControlHeaders);
        response.end();
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
      sendError(response, 404, "接口不存在。");
    } catch (error) {
      sendError(response, 500, error instanceof Error ? error.message : "后端处理失败。");
    }
  });
  return new Promise((resolveServer) => {
    server.listen(port, host, () => resolveServer(server));
  });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.IMAGE_SERVER_PORT ?? 5174);
  const host = process.env.IMAGE_SERVER_HOST ?? "127.0.0.1";
  await createImageServer({ port, host });
  console.log(`Image backend listening at http://${host}:${port}`);
}
