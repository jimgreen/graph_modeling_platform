import { createServer } from "node:http";
import { mkdir as mkdirRaw, readFile, readdir, rename, rm, stat, writeFile } from "node:fs/promises";
import { createReadStream } from "node:fs";
import { basename, dirname, extname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { gzip } from "node:zlib";
import { promisify } from "node:util";
import { createHash } from "node:crypto";
import AdmZip from "adm-zip";
import iconv from "iconv-lite";
import { randomId } from "../shared/randomId.mjs";
import { isPathInside, sanitizeSegment } from "../shared/pathSafety.mjs";
import { atomicWriteFile } from "../shared/atomicWrite.mjs";
import { formatSvgNumber } from "../shared/formatSvgNumber.mjs";
import {
  apiPrefix,
  apiPath,
  escapeRegExp,
  backendPort,
  configuredDataDir,
  host,
  platformConfigPath,
  projectDirectory,
  repositoryRoot,
  stripFrontendBase
} from "./config.mjs";
import { accessControlHeaders, accessControlOriginOnly } from "./cors.mjs";
import { contentDispositionAttachment } from "./contentDisposition.mjs";
// Accept-Encoding 的 gzip 判定唯一一份在 v1Response.mjs（v1 域与内部域共用）。
// 不要在这里再抄一份正则：旧的那份 `/\bgzip\b/iu.test(...)` 丢掉 `;q=`，
// 会让声明 `gzip;q=0`（RFC 9110 §12.5.3「不接受此编码」）的客户端拿到解不开的字节。
import { acceptsGzipEncoding } from "./v1Response.mjs";
import {
  NativeExportSaveError,
  createNativeExportSaveService,
  isAllowedNativeExportOrigin
} from "./nativeExportSave.mjs";
import { GlobalLineRegistryError, createGlobalLineRegistry } from "./globalLineRegistry.mjs";
import { isModelJsonFile } from "./schemeFiles.mjs";
import { SPACE_NAME_DUPLICATE, spacePathsFor, normalizeSpaceOwner } from "./spaceStore.mjs";
import { MAX_SPACE_NAME_LENGTH, isAcceptableSpaceName, normalizeSpaceName } from "./spaceId.mjs";
import { meaningfulDeviceParameterChineseName } from "../shared/deviceParameterChineseNames.mjs";
import { withXmlEncodingDeclaration } from "./xmlEncoding.mjs";
import { readSymbolExportSchemes, writeSymbolExportSchemes } from "./symbolExportSchemes.mjs";
import { buildSpaceArchiveBuffer, readSpaceArchiveName, SPACE_ARCHIVE_META_FILENAME } from "./spaceArchive.mjs";
import { PREDEFINED_E_DEVICE_TEMPLATES } from "./eFileTemplates.mjs";
import { createDataRootGate } from "./dataRootGate.mjs";
import { createDataRootMigration, DataRootMigrationError } from "./dataRootMigration.mjs";
import { resolveDataRoot } from "./dataRoot.mjs";
import { createWebgrpInstanceRegistry, WebgrpInstanceError } from "./webgrpInstances.mjs";
import {
  readInterfaceCustomizationConfig,
  writeInterfaceCustomizationConfig
} from "./interfaceCustomization.mjs";
import { readZipEntriesAsync } from "./asyncZip.mjs";
import { createNativeExportHandlers } from "./routes/nativeExportHandlers.mjs";
import { createGlobalLineHandlers } from "./routes/globalLineHandlers.mjs";
import { createSchemeHttpHandlers } from "./routes/schemeHttpHandlers.mjs";
import { createConfigAndStaticHandlers } from "./routes/configAndStaticHandlers.mjs";
import {
  eSectionColumns,
  inferESection,
  isStaticKind,
  staticComponentLibraryByKind,
  staticComponentLibraryForKind
} from "./eSectionMetadata.mjs";
import {
  defaultMeasurementGroupDefaults,
  normalizeColorConfig,
  normalizeColorRecord,
  normalizeMeasurementConfig
} from "./measurementConfigNormalization.mjs";
import {
  deviceLibrarySchemaVersion,
  meaningfulStoredDeviceParameterChineseName,
  migrateDeviceLibraryConfig,
  normalizeDeviceLibraryConfig,
  normalizeDeviceLibraryParams,
  normalizeRunStatParameterDefinition,
  normalizeRunStatValue,
  serverSwitchingDeviceUsesClosedStatus
} from "./deviceLibraryNormalization.mjs";

import {
  escapeSvgAttribute,
  imageCountsByFolder,
  imageMimeByExtension,
  maxFilePartLength,
  mimeExt,
  normalizeImportedImageLibraryAssets,
  normalizeImportedImageLibraryFolders,
  publicAsset,
  rootImageFolder,
  safeFilePart,
  safeImageLibraryId,
  safeName
} from "./imageAssetHelpers.mjs";
import {
  MAX_ZIP_UNCOMPRESSED_BYTES,
  assertZipUncompressedSizeWithinLimit,
  extractIconLibraryImageEntries,
  iconLibraryArchiveExtensions,
  maxIconLibraryExtractedAssets
} from "./iconLibraryArchive.mjs";
import {
  assignMissingDeviceIndexes,
  invalidProjectEnumParameters,
  normalizeProjectForStorage,
  normalizeSchemesForStorage,
  storageProjectDisplayName,
  storageProjectNameKey,
  storedEParameterDefinitions,
  uniqueRecordNameForFilePartStorage
} from "./projectStorageNormalization.mjs";

export {
  deviceLibrarySchemaVersion,
  eSectionColumns,
  extractIconLibraryImageEntries,
  meaningfulStoredDeviceParameterChineseName,
  migrateDeviceLibraryConfig,
  normalizeDeviceLibraryConfig,
  normalizeMeasurementConfig,
  staticComponentLibraryByKind
};

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const repoRoot = resolve(__dirname, "..");
// 数据根目录：默认 repo data/，可用 GRAPH_MODEL_DATA_DIR 覆盖（测试隔离用 tmpdir）
let dataRoot = process.env.GRAPH_MODEL_DATA_DIR
  ? resolveDataRoot(repoRoot, process.env.GRAPH_MODEL_DATA_DIR)
  : configuredDataDir;
// 默认（default 空间）路径集合。所有路径已统一由每请求解析出的 paths 提供（options.paths ?? defaultPaths），
// 模块级路径常量已全部删除 —— 不要再新增，否则空间隔离会被绕过。
// 必须 export：各空间测试文件从本模块解构它来拼各自的 paths。
export let defaultPaths = spacePathsFor(dataRoot, "default");
const modelTypes = new Set(["微网", "厂站", "馈线", "台区", "其他"]);
// 全局线路注册表按空间缓存：registry 闭包持有 queue + initialized 并绑死绝对路径，
// 既不能每请求新建，也不能跨空间共用一个实例。键用 paths.root（default 空间即数据根）。
const registries = new Map();
// 已删除（或正在删除）的空间根，键与 registries 同域（都是空间根的绝对路径）。
// 登记表示「这个根上已没有空间」：registryFor 对其短路拒绝构造。
// 为什么不能在 spaceStore.remove 返回后撤下：registryFor 是惰性的，而请求在派发层的
// 同步段就把 paths 定死了。一条已入场、卡在 readJsonBody 上的写请求，在 remove 返回时
// 才恢复，此时登记若已撤下，它就会按旧绝对路径首次构造注册表，把已删空间的骨架写回来。
// 故登记从删除流程一开始一直保留，只有该空间被重新建出（同名 → 同 id → 同根）
// 或本次删除失败时才撤下。
const retiredSpaceRoots = new Set();
// 对已退休空间路径的任何写盘都必须拒绝：删除空间后，在飞的请求会带着删除前定下的
// 旧绝对路径回来，一个 mkdir(recursive) 就能把已删空间重新建出来。
// 用前缀判定而非等值：调用方手里常常只有某个子目录（如 paths.schemeFiles），
// 拿不到空间根；加 sep 避免 workspaces/张三 误伤 workspaces/张三丰。
const isUnderRetiredRoot = (target) =>
  [...retiredSpaceRoots].some((root) => target === root || target.startsWith(root + sep));

// 命中退休空间时统一抛这个：带 statusCode，派发层外层 catch 直接采用（否则会变成 500）
class RetiredSpaceWriteError extends Error {
  constructor(message) {
    super(message);
    this.name = "RetiredSpaceWriteError";
    this.statusCode = 409;
  }
}
const retiredSpaceMessage = "该空间已删除或正在删除中，已拒绝写入。";
function assertNotRetiredRoot(target) {
  if (isUnderRetiredRoot(target)) {
    throw new RetiredSpaceWriteError(retiredSpaceMessage);
  }
}

// 空间内的任何建目录都必须先过退休判定：删除空间后，在飞的请求会带着删除前定下的
// 旧绝对路径回来，一个 mkdir(recursive) 就把已删空间重建出来了。
// 故所有 mkdir 一律走这里，且 node:fs 的 mkdir 只在本函数里出现（别名 mkdirRaw）——
// 判据不依赖「某处是不是入口」这类会随代码演化失效的调用顺序推理。
// 不变量：全文件再无第二个裸 mkdir 等待调用（本任务报告给出实跑的不变量检查输出）。
async function mkdirInSpace(target) {
  assertNotRetiredRoot(target);
  await mkdirRaw(target, { recursive: true });
}

function registryFor(paths) {
  assertNotRetiredRoot(paths.root);
  let registry = registries.get(paths.root);
  if (!registry) {
    registry = createGlobalLineRegistry({
      dataRoot: paths.root,
      schemeFilesRoot: paths.schemeFiles
    });
    registries.set(paths.root, registry);
  }
  return registry;
}

// 供空间级派生导出复用当前空间的全局线路记录，避免另建未缓存的 registry 实例。
export async function readGlobalLineRecords(options = {}) {
  const paths = options.paths ?? defaultPaths;
  return registryFor(paths).list();
}

// 删除空间前必须：排空在飞写队列 → 驱逐缓存 → 才允许调用方把目录改名/删除。
// 少了排空这一步，队列里的原子写会按旧绝对路径把已删空间在
// workspaces/<id>/schemes/ 下重新建出骨架。
export async function evictRegistry(spaceRoot) {
  const registry = registries.get(spaceRoot);
  if (!registry) {
    return;
  }
  await registry.flush();
  registries.delete(spaceRoot);
}
const maxImageBodyBytes = 16 * 1024 * 1024;
const maxIconLibraryImportBodyBytes = 128 * 1024 * 1024;
const maxSchemeBodyBytes = 64 * 1024 * 1024;
const maxSchemeZipBodyBytes = 256 * 1024 * 1024;
const maxColorConfigBodyBytes = 1024 * 1024;
const maxMeasurementConfigBodyBytes = 1024 * 1024;
const maxDeviceLibraryBodyBytes = 16 * 1024 * 1024;
const maxInterfaceCustomizationBodyBytes = 64 * 1024;
const maxSymbolExportSchemesBodyBytes = 1024 * 1024;
// 导出请求体只含 kind 清单（单 kind 长度远小于 100 字节），1MB 已是数千倍冗余
const maxSymbolExportBodyBytes = 1024 * 1024;
// maxFilePartLength 已拆离至 ./imageAssetHelpers.mjs
const noStoreJsonHeaders = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store",
  ...accessControlHeaders
};
// 默认单位常量已拆离至 ./projectStorageNormalization.mjs
// staticComponentLibraryByKind / staticComponentLibraryForKind / eSectionColumns 已拆离至 ./eSectionMetadata.mjs

// mimeExt / imageMimeByExtension / iconLibraryArchiveExtensions / maxIconLibraryExtractedAssets 已拆离

const stringifyJson = (value) => JSON.stringify(value, null, 2);

// 一律以 UTF-8 写盘：落盘只留 .json，E 文件不再落盘（ZIP 内 .e 由 iconv 现场编码为 GBK）。
// 内容比较按字节对比，避免重建时因无关编码差异产生伪变更。
// export 仅为让测试能直接验证退休判定（见 spaceApi.test.mjs 的 writeTextIfChanged 用例）：
// 这是 mkdir 之外的第二条建目录路径，无法从 HTTP 侧构造出「未经 mkdirInSpace」的调用。
export async function writeTextIfChanged(filePath, content) {
  // atomicWriteFile 自己会 mkdir(dirname) —— 那是一条绕过 mkdirInSpace 的建目录路径
  // （grep 不到），故这里也要判一次。它不新建原语：assertNotRetiredRoot 本就是任意路径的前缀判定。
  assertNotRetiredRoot(filePath);
  const bytes = Buffer.from(String(content ?? ""), "utf-8");
  try {
    const current = await readFile(filePath);
    if (current.equals(bytes)) {
      return;
    }
  } catch (error) {
    if (error?.code !== "ENOENT") {
      throw error;
    }
  }
  // 原子写（审查 A1-P0-1）：manifest/配置等 JSON 存储统一经此，崩溃不留半写文件
  await atomicWriteFile(filePath, bytes);
}

async function ensureJsonStoreFile(dirPath, filePath, defaultValue) {
  await mkdirInSpace(dirPath);
  try {
    await readFile(filePath, "utf-8");
  } catch (error) {
    if (error?.code !== "ENOENT") {
      throw error;
    }
    await writeTextIfChanged(filePath, stringifyJson(defaultValue));
  }
}

/**
 * 读 JSON 存储失败时的告警：把「IO 失败」与「文件不存在」区分开说。
 *
 * 语法错误仍按既有兼容语义回落并告警；其他 IO 失败必须上抛，不能把不可读文件
 * 伪装成空配置后再被下一次保存覆盖。ENOENT 是「还没有这个文件」的正常路径，
 * 不告警（否则每次首启都刷一串）。
 */
function warnStoreReadFallback(error, filePath, fallback) {
  if (error?.code === "ENOENT") {
    return;
  }
  console.warn(`[存储] 读取 ${filePath} 失败（${error?.code ?? error?.name ?? "unknown"}），已${fallback}：${error?.message ?? error}`);
}

async function readJsonStoreFile(dirPath, filePath, defaultValue, normalize = (value) => value) {
  await ensureJsonStoreFile(dirPath, filePath, defaultValue);
  try {
    return normalize(JSON.parse(await readFile(filePath, "utf-8")));
  } catch (error) {
    if (!(error instanceof SyntaxError) && error?.code !== "ENOENT") {
      throw error;
    }
    warnStoreReadFallback(error, filePath, "按空值处理");
    return normalize(defaultValue);
  }
}

async function readOptionalJsonStoreFile(dirPath, filePath) {
  await mkdirInSpace(dirPath);
  try {
    return JSON.parse(await readFile(filePath, "utf-8"));
  } catch (error) {
    if (!(error instanceof SyntaxError) && error?.code !== "ENOENT") {
      throw error;
    }
    warnStoreReadFallback(error, filePath, "按「无配置」处理");
    return null;
  }
}

async function writeJsonStoreFile(dirPath, filePath, value) {
  await mkdirInSpace(dirPath);
  await writeTextIfChanged(filePath, stringifyJson(value));
}

export async function ensureStore(options = {}) {
  const paths = options.paths ?? defaultPaths;
  await ensureJsonStoreFile(paths.images, paths.manifest, []);
  await ensureJsonStoreFile(paths.images, paths.imageFolders, [rootImageFolder()]);
  await mkdirInSpace(paths.icons);
}

export async function readManifest(options = {}) {
  const paths = options.paths ?? defaultPaths;
  // **filename 必须压成单段**（只取最后一段，丢掉任何目录成分）。manifest.json 会随
  // 空间 ZIP 一起进来，内容完全由提供方控制，而下游有四处把它直接 join 到图片目录
  // 再读或再删：
  //   handleDownload          → 跨空间读走别人的图片（实测：HTTP 200 读出受害空间的文件内容）
  //   handleDeleteImageAsset  → 删掉图片目录之外的任意文件
  //   图标库导入的旧文件清理  → 同上
  //   writeImageAssetFile     → 写入路径由它决定
  // manifest 的出口只有这一个，所以在这里压平，四个消费点一次受益，也不会漏改。
  // 上传的 filename 本来就是 `${id}${ext}` 的平铺名字，压平对正常数据是恒等变换。
  return readJsonStoreFile(paths.images, paths.manifest, [], (parsed) =>
    Array.isArray(parsed)
      ? parsed.map((item) => ({
        ...item,
        folderId: item?.folderId || "root",
        filename: safeImageExportFilename(item?.filename ?? "")
      }))
      : []
  );
}

async function writeManifest(items, options = {}) {
  const paths = options.paths ?? defaultPaths;
  await writeJsonStoreFile(paths.images, paths.manifest, items);
}

// rootImageFolder 已拆离至 ./imageAssetHelpers.mjs

async function readImageFolders(options = {}) {
  const paths = options.paths ?? defaultPaths;
  return readJsonStoreFile(paths.images, paths.imageFolders, [rootImageFolder()], (parsed) => {
    const folders = Array.isArray(parsed) ? parsed : [];
    const withRoot = folders.some((folder) => folder.id === "root") ? folders : [rootImageFolder(), ...folders];
    return withRoot.map((folder) => ({
      id: String(folder.id || "root"),
      name: safeName(folder.name || "默认文件夹"),
      createdAt: folder.createdAt || new Date().toISOString()
    }));
  });
}

async function writeImageFolders(folders, options = {}) {
  const paths = options.paths ?? defaultPaths;
  const withRoot = folders.some((folder) => folder.id === "root") ? folders : [rootImageFolder(), ...folders];
  await writeJsonStoreFile(paths.images, paths.imageFolders, withRoot);
}

// 审查 A1-P0-1：图片存储（manifest + folders）read-modify-write 串行化。
// 并发上传/删除时两个请求读到同一版本、后写覆盖先写导致条目丢失/复活；
// 用 Promise 队列把临界区排队执行，单进程内消除 TOCTOU。
let imageStoreLock = Promise.resolve();
function withImageStoreLock(task) {
  const run = imageStoreLock.then(task, task);
  imageStoreLock = run.then(() => undefined, () => undefined);
  return run;
}

async function resolveFolderId(folderId, options = {}) {
  const folders = await readImageFolders(options);
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
  } catch (error) {
    // stat 失败退回 1970 是既有降级（文件确已不在时被并发删掉就会走到），改它会动语义。
    // 但「磁盘读不动」与「文件不在」不该同形：前者会让方案树里整片模型显示成 1970 年，
    // 而日志里一个字都没有。只在非 ENOENT 时留痕（ENOENT 由 warnStoreReadFallback 自行跳过）。
    warnStoreReadFallback(error, filePath, "按 1970-01-01 显示");
    return new Date(0).toISOString();
  }
}

async function readLegacySchemeDirectoryMeta(schemeDir) {
  const metaPath = join(schemeDir, "scheme.json");
  try {
    const parsed = JSON.parse(await readFile(metaPath, "utf-8"));
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch (error) {
    // 同上：legacy scheme.json 缺席是常态（早已迁移到目录名），静默即可；
    // 但「读不到 / 内容坏了」会让方案在树上顶着目录名显示，与真实名字不符且无从察觉。
    warnStoreReadFallback(error, metaPath, "按目录名显示方案");
    return null;
  }
}

const SCHEME_NUMBER_COUNTER_FILE = "scheme-index.json";
const LEGACY_SCHEME_NUMBER_KEY = "schemeNo";
const LEGACY_SCHEME_COUNTER_KEY = "lastSchemeNo";

function isValidSchemeNumber(value) {
  return Number.isSafeInteger(value) && value > 0;
}

function schemeNumberCounterPath(paths, filesRoot) {
  return join(paths.schemes ?? dirname(resolve(filesRoot)), SCHEME_NUMBER_COUNTER_FILE);
}

async function readSchemeNumberMetadata(schemeDir) {
  const filePath = join(schemeDir, "scheme.json");
  let raw;
  try {
    raw = await readFile(filePath, "utf-8");
  } catch (error) {
    if (error?.code === "ENOENT") {
      return { filePath, metadata: {} };
    }
    throw new Error(`方案元数据读取失败：${filePath}（${error?.code ?? error?.name ?? "unknown"}）`, { cause: error });
  }

  let metadata;
  try {
    metadata = JSON.parse(raw);
  } catch (error) {
    throw new Error(`方案元数据解析失败：${filePath}`, { cause: error });
  }
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    throw new Error(`方案元数据格式错误：${filePath}`);
  }
  return { filePath, metadata };
}

async function readSchemeNumberCounter(counterPath) {
  let parsed;
  try {
    parsed = JSON.parse(await readFile(counterPath, "utf-8"));
  } catch (error) {
    if (error?.code === "ENOENT") {
      return { value: 0, migrated: false };
    }
    if (error instanceof SyntaxError) {
      throw new Error(`方案编号计数器解析失败：${counterPath}`, { cause: error });
    }
    throw new Error(`方案编号计数器读取失败：${counterPath}（${error?.code ?? error?.name ?? "unknown"}）`, { cause: error });
  }

  const lastSchemeId = Number.isSafeInteger(parsed?.lastSchemeId)
    ? parsed.lastSchemeId
    : parsed?.[LEGACY_SCHEME_COUNTER_KEY];
  if (!Number.isSafeInteger(lastSchemeId) || lastSchemeId < 0) {
    throw new Error(`方案编号计数器格式错误：${counterPath}`);
  }
  return {
    value: lastSchemeId,
    migrated: !Number.isSafeInteger(parsed?.lastSchemeId)
  };
}

async function listSchemeDirectoryPaths(rootDir, includeRoot = false) {
  const found = includeRoot ? [resolve(rootDir)] : [];
  const visit = async (dir) => {
    let entries;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch (error) {
      if (error?.code === "ENOENT") {
        return;
      }
      throw new Error(`方案目录读取失败：${dir}（${error?.code ?? error?.name ?? "unknown"}）`, { cause: error });
    }

    const directories = entries
      .filter((entry) => entry.isDirectory())
      .sort((first, second) => first.name < second.name ? -1 : first.name > second.name ? 1 : 0);
    for (const entry of directories) {
      const childDir = join(dir, entry.name);
      found.push(resolve(childDir));
      await visit(childDir);
    }
  };
  await visit(rootDir);
  return found;
}

async function ensureSchemeNumbersUnlocked(paths, filesRoot = paths.schemeFiles) {
  const counterPath = schemeNumberCounterPath(paths, filesRoot);
  const counter = await readSchemeNumberCounter(counterPath);
  const counterValue = counter.value;
  const directories = await listSchemeDirectoryPaths(filesRoot);
  const records = [];
  let lastSchemeId = counterValue;

  for (const schemeDir of directories) {
    const record = await readSchemeNumberMetadata(schemeDir);
    const storedSchemeId = record.metadata.schemeId;
    const legacySchemeId = record.metadata[LEGACY_SCHEME_NUMBER_KEY];
    const schemeId = isValidSchemeNumber(storedSchemeId) ? storedSchemeId : legacySchemeId;
    if (isValidSchemeNumber(schemeId)) {
      lastSchemeId = Math.max(lastSchemeId, schemeId);
    }
    records.push({ schemeDir, ...record, schemeId });
  }

  const used = new Set();
  const assignments = new Map();
  const metadataWrites = [];
  for (const record of records) {
    let schemeId = record.schemeId;
    const needsAllocation = !isValidSchemeNumber(schemeId) || used.has(schemeId);
    const needsMigration = Object.hasOwn(record.metadata, LEGACY_SCHEME_NUMBER_KEY) || record.metadata.schemeId !== schemeId;
    if (needsAllocation) {
      if (lastSchemeId >= Number.MAX_SAFE_INTEGER) {
        throw new Error("方案编号已达到安全整数上限，无法继续分配。");
      }
      schemeId = ++lastSchemeId;
    }
    if (needsAllocation || needsMigration) {
      const metadata = { ...record.metadata, schemeId };
      delete metadata[LEGACY_SCHEME_NUMBER_KEY];
      metadataWrites.push({ filePath: record.filePath, metadata });
    }
    used.add(schemeId);
    assignments.set(record.schemeDir, schemeId);
  }

  // Reserve numbers before writing per-scheme metadata. A failed metadata write may
  // leave a gap, but cannot cause the next allocation to reuse a number.
  if (lastSchemeId > counterValue || counter.migrated) {
    await writeTextIfChanged(counterPath, `${JSON.stringify({ lastSchemeId }, null, 2)}\n`);
  }
  for (const write of metadataWrites) {
    await writeTextIfChanged(write.filePath, `${JSON.stringify(write.metadata, null, 2)}\n`);
  }
  return assignments;
}

async function resetImportedSchemeNumbers(rootDir) {
  const directories = await listSchemeDirectoryPaths(rootDir, true);
  for (const schemeDir of directories) {
    const { filePath, metadata } = await readSchemeNumberMetadata(schemeDir);
    if (Object.hasOwn(metadata, "schemeId") || Object.hasOwn(metadata, LEGACY_SCHEME_NUMBER_KEY)) {
      const withoutNumber = { ...metadata };
      delete withoutNumber.schemeId;
      delete withoutNumber[LEGACY_SCHEME_NUMBER_KEY];
      await writeTextIfChanged(filePath, `${JSON.stringify(withoutNumber, null, 2)}\n`);
    }
  }
}

function schemeIdsOnRecords(schemes, parentDir, assignments) {
  return (Array.isArray(schemes) ? schemes : []).map((scheme) => {
    const schemeDir = join(parentDir, safeFilePart(scheme.name, "方案"));
    const schemeId = assignments.get(resolve(schemeDir));
    const normalizedScheme = { ...scheme };
    delete normalizedScheme[LEGACY_SCHEME_NUMBER_KEY];
    return {
      ...normalizedScheme,
      ...(isValidSchemeNumber(schemeId) ? { schemeId } : {}),
      children: schemeIdsOnRecords(scheme.children, schemeDir, assignments)
    };
  });
}

async function readSchemeProjectFile(filePath, fileName, paths = defaultPaths) {
  // 三段分开：读盘、JSON 解析、注册表 hydrate（会写盘）。
  // 此前三段共用一个 catch，任何失败都 return null，调用方一律报「模型文件不存在」——
  // 磁盘写权限没了 / 磁盘满 / 注册表写失败，也被说成「模型被删了」，排查方向直接跑偏。
  let raw;
  try {
    raw = await readFile(filePath, "utf-8");
  } catch (error) {
    if (error?.code === "ENOENT") {
      return null;
    }
    throw new Error(`模型文件读取失败：${filePath}（${error?.code ?? error?.name ?? "unknown"}）`, { cause: error });
  }
  let storedProject;
  try {
    storedProject = normalizeProjectForStorage(JSON.parse(raw));
  } catch {
    // 文件损坏：这里「读不出这个模型」是事实，沿用既有的 null 语义
    return null;
  }
  let hydrated;
  try {
    hydrated = await registryFor(paths).hydrateProject({ project: storedProject });
  } catch (error) {
    throw new Error(`读取模型时写全局线路注册表失败：${error?.message ?? error}`, { cause: error });
  }
  const project = hydrated.project;
  const fileBaseName = fileName.replace(/\.json$/iu, "");
  const name = storageProjectDisplayName(project.name || storedProjectFilePartDisplayName(fileBaseName));
  return {
    name,
    updatedAt: await fileUpdatedAt(filePath),
    contentHash: createHash("sha256").update(raw).digest("hex"),
    project: {
      ...project,
      name
    }
  };
}

async function readSchemeProjectSummaryFile(filePath, fileName) {
  const fileBaseName = fileName.replace(/\.json$/iu, "");
  // 与 readSchemeProjectFile 同一个洞的另一半：此前「读盘 + 解析」共用一个 catch，
  // 任何失败都退化成「只有文件名」的摘要。于是磁盘写权限没了 / 磁盘满 / 文件被占用，
  // 模型照样混进方案树，字面上与正常条目无异、日志里一个字都没有 —— 排查者只会得出
  // 「模型被改名或删了」的错误结论（完整路径那份已在 01f6010a 修掉）。
  // 拆分后：真读不动（非 ENOENT）上抛，由各调用方既有 catch 映成 500；
  // ENOENT（readdir 列举与读盘之间模型被删掉的竞态）与 JSON 损坏都沿用既有降级语义，
  // 只是后者补上告警，不让「内容坏了」也静默。
  let raw = null;
  try {
    raw = await readFile(filePath, "utf-8");
  } catch (error) {
    if (error?.code !== "ENOENT") {
      throw new Error(`模型文件读取失败：${filePath}（${error?.code ?? error?.name ?? "unknown"}）`, { cause: error });
    }
  }
  let storedProject = {};
  if (raw !== null) {
    try {
      const parsed = JSON.parse(raw);
      storedProject = parsed && typeof parsed === "object" ? parsed : {};
    } catch (error) {
      // 内容坏了仍按「仅文件名」摘要返回（既有契约：摘要路径不因单个文件损坏而少一项）
      warnStoreReadFallback(error, filePath, "按「仅文件名」摘要处理");
    }
  }
  const name = storageProjectDisplayName(storedProject.name || storedProjectFilePartDisplayName(fileBaseName));
  const idx = Number(storedProject.idx);
  const modelType = String(storedProject.modelType ?? "").trim();
  return {
    name,
    updatedAt: await fileUpdatedAt(filePath),
    project: {
      version: 1,
      name,
      ...(Number.isSafeInteger(idx) && idx > 0 ? { idx } : {}),
      ...(modelTypes.has(modelType) ? { modelType } : {}),
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
  } catch (error) {
    // 目录读不到就报错，与方案 ZIP 导出路径（schemeArchive.listModelJsonFiles 的
    // 「目录读失败即上抛，不静默跳过」）对齐。此前这里静默返回 null，于是单个方案
    // 目录被占用/改权限，整个方案连同子方案与模型就在响应里凭空消失、无日志 ——
    // 用户以为方案被删了。只有 ENOENT（方案真的不存在）才正常返回 null。
    if (error?.code === "ENOENT") {
      return null;
    }
    throw new Error(`方案目录读取失败：${schemeDir}（${error?.code ?? error?.name ?? "unknown"}）`, { cause: error });
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
    if (!entry.isFile() || !isModelJsonFile(entry.name)) {
      continue;
    }
    const project = options.includeProjects
      ? await readSchemeProjectFile(entryPath, entry.name, options.paths ?? defaultPaths)
      : await readSchemeProjectSummaryFile(entryPath, entry.name);
    if (project) {
      projects.push(project);
    }
  }
  const name = storedSchemeFilePartDisplayName(legacyMeta?.name || dirent.name);
  return {
    name,
    ...(isValidSchemeNumber(legacyMeta?.schemeId ?? legacyMeta?.[LEGACY_SCHEME_NUMBER_KEY])
      ? { schemeId: legacyMeta.schemeId ?? legacyMeta[LEGACY_SCHEME_NUMBER_KEY] }
      : {}),
    updatedAt: legacyMeta?.updatedAt || await fileUpdatedAt(schemeDir),
    projects,
    children
  };
}

export async function readSchemesFromFiles(options = {}) {
  const paths = options.paths ?? defaultPaths;
  const filesRoot = options.filesRoot ?? paths.schemeFiles;
  await mkdirInSpace(filesRoot);
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

async function removeLegacySchemeManifest(options = {}) {
  const paths = options.paths ?? defaultPaths;
  await rm(join(paths.schemes, "schemes.json"), { force: true });
}

async function ensureSchemeStore(options = {}) {
  const paths = options.paths ?? defaultPaths;
  await mkdirInSpace(paths.schemeFiles);
}

export async function readSchemes(options = {}) {
  const paths = options.paths ?? defaultPaths;
  const filesRoot = options.filesRoot ?? paths.schemeFiles;
  await withSchemeStoreWriteLock(async () => {
    await mkdirInSpace(filesRoot);
    await ensureSchemeNumbersUnlocked(paths, filesRoot);
  });
  return readSchemesFromFiles(options);
}

async function writeSchemes(schemes, options = {}) {
  return withSchemeStoreWriteLock(async () => {
    await ensureSchemeStore(options);
    const savedSchemes = await writeSchemeFiles(schemes, options);
    await removeLegacySchemeManifest(options);
    return savedSchemes;
  });
}

// normalizeColorRecord / normalizeColorConfig 已拆离至 ./measurementConfigNormalization.mjs

export async function readColorConfig(options = {}) {
  const paths = options.paths ?? defaultPaths;
  const parsed = await readOptionalJsonStoreFile(paths.settings, paths.colorConfig);
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

async function writeColorConfig(config, options = {}) {
  const paths = options.paths ?? defaultPaths;
  const normalized = {
    ...normalizeColorConfig(config),
    savedAt: new Date().toISOString()
  };
  await writeJsonStoreFile(paths.settings, paths.colorConfig, normalized);
  return normalized;
}

// defaultMeasurementGroupDefaults / normalizeMeasurementConfig 已拆离至 ./measurementConfigNormalization.mjs

export async function readMeasurementConfig(options = {}) {
  const paths = options.paths ?? defaultPaths;
  const parsed = await readOptionalJsonStoreFile(paths.settings, paths.measurementConfig);
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

async function writeMeasurementConfig(config, options = {}) {
  const paths = options.paths ?? defaultPaths;
  const normalized = {
    ...normalizeMeasurementConfig(config),
    savedAt: new Date().toISOString()
  };
  await writeJsonStoreFile(paths.settings, paths.measurementConfig, normalized);
  return normalized;
}

// deviceLibrarySchemaVersion / migrateDeviceLibraryConfig / normalizeDeviceLibraryConfig 已拆离至 ./deviceLibraryNormalization.mjs

export async function readDeviceLibraryConfig(options = {}) {
  const paths = options.paths ?? defaultPaths;
  const parsed = await readOptionalJsonStoreFile(paths.deviceLibraryDir, paths.deviceLibrary);
  if (parsed) {
    const normalized = normalizeDeviceLibraryConfig(parsed);
    if (
      Number(parsed.schemaVersion) !== deviceLibrarySchemaVersion ||
      Object.prototype.hasOwnProperty.call(parsed, "savedAt") ||
      JSON.stringify(parsed.customDeviceTemplates ?? []) !== JSON.stringify(normalized.customDeviceTemplates) ||
      JSON.stringify(parsed.deviceDefinitionOverrides ?? {}) !== JSON.stringify(normalized.deviceDefinitionOverrides) ||
      JSON.stringify(parsed.deviceDefinitionSharedKeys ?? {}) !== JSON.stringify(normalized.deviceDefinitionSharedKeys)
    ) {
      await writeJsonStoreFile(paths.deviceLibraryDir, paths.deviceLibrary, normalized);
    }
    return {
      exists: true,
      ...normalized
    };
  }
  return {
    exists: false,
    ...normalizeDeviceLibraryConfig({})
  };
}

async function writeDeviceLibraryConfig(config, options = {}) {
  const paths = options.paths ?? defaultPaths;
  const normalized = normalizeDeviceLibraryConfig(config);
  await writeJsonStoreFile(paths.deviceLibraryDir, paths.deviceLibrary, normalized);
  return normalized;
}

function sendJson(response, status, data) {
  response.writeHead(status, noStoreJsonHeaders);
  response.end(JSON.stringify(data));
}

// 带 code 时用 v1 同构的错误对象，否则保持既有字符串形态（不破坏任何现有调用方）。
// 与 sendV1Error 并存：v1 域走 sendV1Error，/webgrp/* 内部域（含派发层的空间校验）走这里。
function sendError(response, status, message, code) {
  sendJson(response, status, code ? { error: { code, message } } : { error: message });
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
  const acceptsGzip = acceptsGzipEncoding(request.headers["accept-encoding"]);
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

// 请求体超限：带 statusCode 413，派发层外层 catch 直接采用（否则会变成 500）。
// 单独成类而不是复用 RetiredSpaceWriteError —— 语义无关，但都走「自带 statusCode」这条通路。
class PayloadTooLargeError extends Error {
  constructor(message) {
    super(message);
    this.name = "PayloadTooLargeError";
    this.statusCode = 413;
  }
}

// 读请求体；超限时**继续读完整个流但不再累积 chunk**。
//
// 原实现超限时 `request.destroy()`，那会立刻切断 socket，响应再也发不出去 ——
// 客户端只看到 ECONNRESET（实测 `fetch` 抛 "fetch failed"），拿不到任何状态码，
// 于是派发层那套「error.statusCode → 413」的通路形同虚设。
// 试过 `request.pause()`：只能撑到约 3MB（缓冲高水位），再大照样 ECONNRESET。
// 读满是唯一可靠解 —— 上限的意义是「不把超大内容留在内存」，靠的是不再 push chunk，
// 而不是提前中断读取。
function readBody(request, maxBodyBytes = maxImageBodyBytes, oversizeMessage = "请求体过大。") {
  return new Promise((resolveBody, reject) => {
    const chunks = [];
    let size = 0;
    let oversize = false;
    request.on("data", (chunk) => {
      size += chunk.length;
      if (size > maxBodyBytes) {
        oversize = true;
        return;
      }
      chunks.push(chunk);
    });
    request.on("end", () => {
      if (oversize) {
        reject(new PayloadTooLargeError(oversizeMessage));
        return;
      }
      resolveBody(Buffer.concat(chunks).toString("utf-8"));
    });
    request.on("error", reject);
  });
}

function readRawBody(request, maxBodyBytes = maxImageBodyBytes, oversizeMessage = "请求体过大。") {
  return new Promise((resolveBody, reject) => {
    const chunks = [];
    let size = 0;
    let oversize = false;
    request.on("data", (chunk) => {
      size += chunk.length;
      if (size > maxBodyBytes) {
        oversize = true;
        return;
      }
      chunks.push(chunk);
    });
    request.on("end", () => {
      if (oversize) {
        reject(new PayloadTooLargeError(oversizeMessage));
        return;
      }
      resolveBody(Buffer.concat(chunks));
    });
    request.on("error", reject);
  });
}

/**
 * 请求体不是合法 JSON 时抛的错误。
 *
 * **必须显式带 statusCode 400**：JSON.parse 的 SyntaxError 没有 statusCode，
 * 派发层外层 catch 会按「其余仍是 500」处理，于是客户端一个拼写错误被报成
 * 服务端故障 —— 实测 PUT /color-config、/measurement-config、/device-library、
 * POST /image-folders 四个内部域端点全部返回 500，且错误体直接透出 Node 的
 * 原始 SyntaxError 文本（"Expected property name or '}' in JSON at position 1 …"）。
 * 后果有两个：监控上客户端错误混进 5xx 告警；调用方无法据此判断是自己的问题。
 * v1 域一直是正确的 400 bad-request（"请求体须为合法 JSON。"），内部域此前是漏的。
 */
class MalformedJsonError extends Error {
  constructor(message) {
    super(message);
    this.name = "MalformedJsonError";
    this.statusCode = 400;
  }
}

async function readJsonBody(request, maxBodyBytes = maxImageBodyBytes, oversizeMessage = "请求体过大。") {
  const body = await readBody(request, maxBodyBytes, oversizeMessage);
  const text = body || "{}";
  try {
    return JSON.parse(text);
  } catch {
    // 不透出 JSON.parse 的原始英文 SyntaxError：对调用方没有可操作性，
    // 且会泄露解析器内部措辞。用固定中文文案，与 v1 域的措辞保持一致。
    throw new MalformedJsonError("请求体须为合法 JSON。");
  }
}

const {
  handleSelectNativeExportFile,
  handleWriteNativeExportText,
  handleWriteNativeExportBundle,
  handleOpenNativeExportFile
} = createNativeExportHandlers({
  readJsonBody,
  readRawBody,
  sendJson,
  sendError,
  maxSchemeBodyBytes
});

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

// safeName / safeFilePart 已拆离至 ./imageAssetHelpers.mjs
// normalizeProjectForStorage / normalizeSchemesForStorage / assignMissingDeviceIndexes / storedEParameterDefinitions 已拆离至 ./projectStorageNormalization.mjs

// isStaticKind 已拆离至 ./eSectionMetadata.mjs

// escapeSvgAttribute 已拆离至 ./imageAssetHelpers.mjs

function safeImageExportFilename(value) {
  const normalized = String(value ?? "").trim().replace(/\\/gu, "/");
  return normalized.split("/").filter(Boolean).pop() ?? "";
}

async function imageFileToDataUrl(item, options = {}) {
  const paths = options.paths ?? defaultPaths;
  const filename = safeImageExportFilename(item?.filename ?? "");
  const mimeType = String(item?.mimeType ?? "").trim();
  if (!filename || !mimeType.startsWith("image/")) {
    return "";
  }
  const bytes = await readFile(join(paths.images, filename));
  return `data:${mimeType};base64,${bytes.toString("base64")}`;
}

async function imageExportPathByIdFromManifest(manifest, options = {}) {
  const result = {};
  await Promise.all((Array.isArray(manifest) ? manifest : []).map(async (item) => {
    const id = String(item?.id ?? "").trim();
    if (!id) {
      return;
    }
    try {
      const dataUrl = await imageFileToDataUrl(item, options);
      if (dataUrl) {
        result[id] = dataUrl;
      }
    } catch {
      // 单张图片文件丢失不应阻断导出；保留原始 href。
    }
  }));
  return result;
}

// Task 19：只内联模型实际引用的图片（ids 为图片 id 集合）。
// 未登记的 id 直接跳过、单张读取失败由 imageExportPathByIdFromManifest 的 try/catch 吞掉 → 该图保留原始 href，不阻断导出。
export async function readReferencedImageExportPathById(ids, options = {}) {
  const wanted = new Set((Array.isArray(ids) ? ids : []).map((id) => String(id ?? "").trim()).filter(Boolean));
  if (wanted.size === 0) {
    return {};
  }
  const manifest = await readManifest(options);
  return imageExportPathByIdFromManifest(manifest.filter((item) => wanted.has(String(item?.id ?? "").trim())), options);
}

// formatSvgNumber 已单源化到 shared/formatSvgNumber.mjs —— 本文件这一版就是共享版
// 的原型（先做了非有限值归 0 的防御），语义逐字节保留。

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
  // 先判存在：不存在时直接返回，避免 rename(ENOENT) 前先 mkdir 留下空时间戳目录。
  // 只把 ENOENT 当「不存在」，其余异常（如 EACCES）上抛，不静默当作不存在。
  try {
    await stat(entryPath);
  } catch (error) {
    if (error?.code === "ENOENT") {
      return;
    }
    throw error;
  }
  let targetPath = join(trashRoot, archiveId, relativePath);
  await mkdirInSpace(dirname(targetPath));
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
  const paths = options.paths ?? defaultPaths;
  const { files, dirs } = await listSchemeStoreEntries(filesRoot);
  const trashRoot = options.trashRoot ?? paths.schemeTrash;
  const archiveId = options.archiveId ?? schemeArchiveId();
  await Promise.all(files.filter((filePath) => !expectedFiles.has(filePath)).map((filePath) => archiveSchemeStoreEntry(filePath, filesRoot, trashRoot, archiveId)));
  for (const dir of dirs.sort((first, second) => second.length - first.length)) {
    if (!expectedDirs.has(dir)) {
      await rm(dir, { recursive: true, force: true });
    }
  }
}

function schemeDirectoryFromPath(filesRoot, schemePath) {
  const parts = (Array.isArray(schemePath) ? schemePath : [])
    .map((part) => safeFilePart(part, "方案"))
    .filter(Boolean);
  return parts.reduce((dir, part) => join(dir, part), filesRoot);
}

// MAX_ZIP_UNCOMPRESSED_BYTES / assertZipUncompressedSizeWithinLimit 已拆离至 ./iconLibraryArchive.mjs

/**
 * schemePath 畸形：直接 400，不再静默落到「默认方案」。
 *
 * 此前这份解析对任何畸形输入都返回空数组，调用点再用
 * `Array.isArray && length > 0 ? … : ["默认方案"]` 兜底，于是写错类型的 schemePath
 * 会 200 ok 地把模型存进默认方案；删除时同样错传则把**默认方案下的同名模型**
 * archive 进回收站 —— 不可逆，且用户与排查者都以为操作的是方案 A。
 * /v1 那套（schemePath.mjs）对同样畸形本来就 400，两边行为本该一致。
 *
 * 注意「空数组 / 不传」不是畸形：src/global-lines.ts 主动传 `[]` 表示默认方案，
 * 那是既有约定，仍走默认方案。判据是「有值但不是数组」与「JSON 解析失败」。
 */
function badSchemePathError(detail) {
  const error = new Error(`schemePath 格式错误：${detail}`);
  error.statusCode = 400;
  error.code = "bad-request";
  return error;
}

function parseSchemePathParam(value) {
  if (!value) {
    return [];
  }
  let parsed;
  try {
    parsed = JSON.parse(value);
  } catch {
    throw badSchemePathError("不是合法的 JSON 数组。");
  }
  if (!Array.isArray(parsed)) {
    throw badSchemePathError("必须是方案路径数组，如 [\"方案A\"]。");
  }
  return parsed.map((part) => safeFilePart(part, "方案")).filter(Boolean);
}

/** 显式要求 schemePath 是数组（ZIP 导出 / 删除整个方案目录这类没有默认方案的入口）。 */
function requireSchemePathArray(value) {
  if (!Array.isArray(value)) {
    throw badSchemePathError("必须是方案路径数组，如 [\"方案A\"]。");
  }
  return value;
}

/** 请求体里的 schemePath：缺省 / 空数组 → 默认方案；有值但不是数组 → 400。 */
function schemePathOrDefault(value) {
  if (value === undefined || value === null) {
    return ["默认方案"];
  }
  if (!Array.isArray(value)) {
    throw badSchemePathError("必须是方案路径数组，如 [\"方案A\"]。");
  }
  return value.length > 0 ? value : ["默认方案"];
}

function optionalSchemePathParts(value) {
  if (value === undefined || value === null) {
    return [];
  }
  if (!Array.isArray(value)) {
    throw badSchemePathError("必须是方案路径数组。");
  }
  return value.map((part) => safeFilePart(part, "方案")).filter(Boolean);
}

function schemeNumberSelector(value) {
  if (value === undefined || value === null) {
    return null;
  }
  const numeric = typeof value === "number"
    ? value
    : typeof value === "string" && value.trim()
      ? Number(value.trim())
      : NaN;
  if (!isValidSchemeNumber(numeric)) {
    const error = new Error("schemeId 必须是正安全整数。");
    error.statusCode = 400;
    error.code = "bad-request";
    throw error;
  }
  return numeric;
}

function schemePathForId(assignments, filesRoot, schemeId) {
  for (const [schemeDir, storedNumber] of assignments) {
    if (storedNumber === schemeId) {
      return relative(filesRoot, schemeDir).split(/[\\/]/u).filter(Boolean);
    }
  }
  return null;
}

function schemeIdNotFoundError(schemeId) {
  const error = new Error(`方案 ID ${schemeId} 不存在。`);
  error.statusCode = 404;
  error.code = "not-found";
  return error;
}

async function resolveSchemePathForSelectorUnlocked({ schemePath, schemeId, paths = defaultPaths, filesRoot = paths.schemeFiles } = {}) {
  const pathParts = optionalSchemePathParts(schemePath);
  const number = schemeNumberSelector(schemeId);
  if (number === null) {
    return pathParts;
  }

  await mkdirInSpace(filesRoot);
  const assignments = await ensureSchemeNumbersUnlocked(paths, filesRoot);
  const resolvedPath = schemePathForId(assignments, filesRoot, number);
  if (!resolvedPath) {
    throw schemeIdNotFoundError(number);
  }
  if (pathParts.length > 0 && !sameSchemePath(pathParts, resolvedPath)) {
    const error = new Error("schemePath 与 schemeId 指向不同方案。");
    error.statusCode = 400;
    error.code = "bad-request";
    throw error;
  }
  return resolvedPath;
}

export async function resolveSchemePathForSelector(options = {}) {
  const paths = options.paths ?? defaultPaths;
  if (schemeNumberSelector(options.schemeId) === null) {
    return optionalSchemePathParts(options.schemePath);
  }
  return withSchemeStoreWriteLock(() => resolveSchemePathForSelectorUnlocked({ ...options, paths }));
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

/**
 * ZIP 顶层目录名：全部文件条目（每个至少两段）同属一个顶层目录才认它，否则回退给定名。
 * label 只决定报错文案与兜底名（"方案" / "空间"）——守卫逻辑两域共用一份：
 * 它是安全边界（zipEntryParts 拒 `..` / 绝对路径 / 盘符），各留一份就是留一处将来会漏改的洞。
 */
function zipRootNameFor(entries, fallbackName, label = "方案") {
  const fileParts = entries
    .filter((entry) => !entry.isDirectory)
    .map((entry) => zipEntryParts(entry.entryName))
    .filter((parts) => parts.length > 0);
  if (fileParts.length === 0) {
    throw new Error(`zip 文件中没有可导入的${label}文件。`);
  }
  const firstRoot = fileParts[0][0];
  const hasSingleRoot = firstRoot && fileParts.every((parts) => parts.length > 1 && parts[0] === firstRoot);
  return safeFilePart(hasSingleRoot ? firstRoot : fallbackName, `导入${label}`);
}

/**
 * ZIP 解包的共用骨架：唯一一份 zip-slip 守卫（zipEntryParts + 去顶层目录 + isPathInside + mkdirInSpace + writeFile）。
 * 两域的唯一差异是「跳过什么」，经 skipEntry(relativeParts, entry) 注入；返回被跳过的相对路径，
 * 由调用方决定是告警还是静默跳过。
 */
async function extractZipEntries(zip, targetDir, rootName, skipEntry) {
  await mkdirInSpace(targetDir);
  const skipped = [];
  for (const entry of zip.getEntries()) {
    const parts = zipEntryParts(entry.entryName);
    const relativeParts = safeFilePart(parts[0], parts[0]) === rootName ? parts.slice(1) : parts;
    if (relativeParts.length === 0) {
      continue;
    }
    if (skipEntry(relativeParts, entry)) {
      skipped.push(relativeParts.join("/"));
      continue;
    }
    const targetPath = relativeParts.reduce((current, part) => join(current, safeFilePart(part, part)), targetDir);
    if (!isPathInside(targetDir, targetPath)) {
      throw new Error("zip 文件包含越界路径。");
    }
    if (entry.isDirectory) {
      await mkdirInSpace(targetPath);
      continue;
    }
    await mkdirInSpace(dirname(targetPath));
    await writeFile(targetPath, entry.getData());
  }
  return skipped;
}

// 方案解包：files 不变量「只落 .json」。旧 ZIP 内的派生格式（.e/.svg）不写回磁盘；
// 只跳这两种本平台派生后缀，其它条目（如 scheme.json）原样铺开。
async function extractSchemeZipToDirectory(zip, targetDir, rootName) {
  const skippedDerived = await extractZipEntries(
    zip,
    targetDir,
    rootName,
    (relativeParts, entry) => !entry.isDirectory && /\.(e|svg)$/iu.test(relativeParts[relativeParts.length - 1])
  );
  if (skippedDerived.length > 0) {
    console.warn(`[scheme-import] 跳过 ${skippedDerived.length} 个派生文件（.e/.svg 不落盘）：${skippedDerived.join("、")}`);
  }
}

/**
 * 空间解包：**跳过规则与方案侧不同** —— 空间里有图片与空间级图标，
 * 按方案那条「files 只落 .json」的口径会跳过 .e/.svg，跳过就是丢数据。
 * 安全守卫与方案侧同源（共用 extractZipEntries）。
 */
async function extractSpaceZipToDirectory(zip, targetDir, rootName) {
  await extractZipEntries(zip, targetDir, rootName, (relativeParts) =>
    relativeParts.length === 1 && relativeParts[0] === SPACE_ARCHIVE_META_FILENAME);
}

// 方案 ZIP：json 落盘原文 + e/svg 实时生成（不再读磁盘派生文件）。
// 适配层用函数内动态 import：svgExport/eFileExport 均 import 本模块，静态 import 会成环。
export async function createSchemeArchiveBuffer(options) {
  const paths = options.paths ?? defaultPaths;
  const filesRoot = options.filesRoot ?? paths.schemeFiles;
  const schemePath = requireSchemePathArray(options.schemePath);
  const templateName = String(options.templateName ?? "").trim();
  if (schemePath.length === 0) {
    throw badSchemePathError("缺少方案路径。");
  }
  // 锚点 = 渲染链实际读取的根（paths.schemeFiles），故随 paths 而变。
  // 不要把它改回「与 paths 无关的独立值」—— 那会重新打开混根：枚举走一个根、
  // 渲染走另一个根，同名模型存在时静默产出错误 ZIP。
  // ?? defaultPaths.schemeFiles 兜底缺字段的偏对象（如 paths: {}），避免 resolve(undefined) 抛 TypeError 顶掉下面的中文消息。
  if (resolve(filesRoot) !== resolve(paths.schemeFiles ?? defaultPaths.schemeFiles)) {
    throw new Error("filesRoot 与解析出的 paths 指向不同根，不支持实时生成派生格式（渲染适配层只跟随 paths）；请只传 paths。");
  }
  const schemeName = safeFilePart(schemePath[schemePath.length - 1], "方案");
  const schemeDir = schemeDirectoryFromPath(filesRoot, schemePath);
  const { buildSchemeArchiveBuffer } = await import("./schemeArchive.mjs");
  const { buildEFileForSavedModel, eFileTemplateAllowsModelType } = await import("./eFileExport.mjs");
  return buildSchemeArchiveBuffer({
    schemeDir,
    schemeName,
    shouldIncludeModel: async ({ dirParts, modelName }) => {
      if (!templateName) return true;
      const record = await readSchemeProjectRecord({
        schemePath: [...schemePath, ...dirParts],
        name: modelName,
        paths
      });
      // 让后续渲染链报告损坏/缺失模型，而不是因类型未知而静默漏掉它。
      return !record || eFileTemplateAllowsModelType(templateName, record.project?.modelType);
    },
    renderArtifacts: async ({ dirParts, modelName }) => {
      const { renderSavedModelSvg } = await import("./svgExport.mjs");
      const parts = [...schemePath, ...dirParts];
      // colorMode 取 voltage：与前端单模型导出同口径（旧 ZIP 内 svg 即由此产生），energy 仅为端点旧契约缺省
      // paths 必须透传：json 按 filesRoot 枚举，e/svg 也必须读同一路径集合，否则产出混合 ZIP
      const svgResult = await renderSavedModelSvg({ parts, name: modelName, colorMode: "voltage", paths });
      if (svgResult.error) {
        throw new Error(`模型“${modelName}”SVG 生成失败：${svgResult.error.message}`);
      }
      const eResult = await buildEFileForSavedModel({ parts, name: modelName, templateName, paths });
      if (eResult.error) {
        throw new Error(`模型“${modelName}”E 文件生成失败：${eResult.error.message}`);
      }
      return {
        // XML 声明与单模型端点同源：前端已不再前置声明，落盘文件即响应体，ZIP 需逐字节一致
        svg: withXmlEncodingDeclaration(svgResult.svg, "utf-8"),
        eFileBytes: iconv.encode(String(eResult.file?.text ?? ""), "gbk")
      };
    }
  });
}

export async function importSchemeArchiveBuffer(options) {
  return withSchemeStoreWriteLock(() => importSchemeArchiveBufferUnlocked(options));
}

async function importSchemeArchiveBufferUnlocked(options) {
  const paths = options.paths ?? defaultPaths;
  const filesRoot = options.filesRoot ?? paths.schemeFiles;
  const trashRoot = options.trashRoot ?? paths.schemeTrash;
  await mkdirInSpace(filesRoot);
  const parentPath = await resolveSchemePathForSelectorUnlocked({
    schemePath: options.parentPath,
    schemeId: options.parentSchemeId,
    paths,
    filesRoot
  });
  const fileName = safeFilePart(options.fileName || "导入方案.zip", "导入方案.zip").replace(/\.zip$/iu, "");
  const mode = options.mode === "overwrite" ? "overwrite" : "check";
  const requestedName = safeFilePart(options.targetName || "", "");
  const zip = options.zip && typeof options.zip.getEntries === "function" ? options.zip : await readZipEntriesAsync(options.buffer, { label: "方案压缩包" });
  assertZipUncompressedSizeWithinLimit(zip, "方案压缩包");
  const entries = zip.getEntries();
  const zipRootName = zipRootNameFor(entries, fileName, "方案");
  const importName = requestedName || zipRootName;
  const parentDir = schemeDirectoryFromPath(filesRoot, parentPath);
  const targetDir = join(parentDir, importName);
  if (!isPathInside(filesRoot, targetDir)) {
    throw new Error("目标方案路径无效。");
  }
  let targetExists = false;
  // stat 失败是否属于「状态未知」：只有 ENOENT 能断言目录不存在，EACCES 等只说明读不到，
  // 拿它当「不存在」会让下面的回滚有权去删一个其实早已存在的用户目录。
  let targetStateUnknown = false;
  try {
    targetExists = (await stat(targetDir)).isDirectory();
  } catch (error) {
    targetStateUnknown = error?.code !== "ENOENT";
  }
  if (targetExists && mode !== "overwrite") {
    return {
      conflict: true,
      importedName: importName,
      duplicateSchemeName: importName,
      parentPath
    };
  }
  await mkdirInSpace(parentDir);
  if (targetExists) {
    await archiveSchemeStoreEntry(targetDir, filesRoot, trashRoot, schemeArchiveId());
  }
  let importedSchemeId = 0;
  try {
    await extractSchemeZipToDirectory(zip, targetDir, zipRootName);
    await resetImportedSchemeNumbers(targetDir);
    const assignments = await ensureSchemeNumbersUnlocked(paths, filesRoot);
    importedSchemeId = assignments.get(resolve(targetDir));
    if (!isValidSchemeNumber(importedSchemeId)) {
      throw new Error(`无法为导入方案「${importName}」分配编号。`);
    }
  } catch (error) {
    // 失败不留半成品方案：照 handleImportSpaceArchive 的同一口径（那边的理由写得更全）。
    // 此前这里直接冒泡，解包到一半失败会在方案树里留下一个看着正常、实则缺文件的方案目录，
    // 用户无从分辨「导入失败」与「导入成功但模型丢了」；覆盖模式下更糟 —— 旧方案已被移进
    // 回收站、新方案又是半份，等于两头落空。
    //
    // 删除前提：此刻 targetDir 里只可能有本次解包的产物 —— 新建模式它本就不存在，
    // 覆盖模式旧方案已被上面的 archiveSchemeStoreEntry **rename 走**了。
    // stat 失败但非 ENOENT 时目录状态未知，此时宁可不删（留半成品）也不能赌用户数据。
    if (!targetStateUnknown) {
      await rm(targetDir, { recursive: true, force: true }).catch((rollbackError) => {
        // 回滚失败（Windows 上目录句柄占用会让删除 EPERM/EBUSY）时半成品会留在原地，
        // 不能一点线索都不留
        console.warn(`[scheme-import] 回滚半成品方案「${importName}」失败：${rollbackError.message}`);
      });
    } else {
      console.warn(`[scheme-import] 目标目录状态未知（stat 非 ENOENT 失败），跳过回滚：${targetDir}`);
    }
    throw error;
  }
  return {
    conflict: false,
    importedName: importName,
    importedPath: [...parentPath, importName],
    schemeId: importedSchemeId
  };
}

function sameSchemePath(first, second) {
  const firstParts = Array.isArray(first) ? first.map((part) => safeFilePart(part, "方案")) : [];
  const secondParts = Array.isArray(second) ? second.map((part) => safeFilePart(part, "方案")) : [];
  return firstParts.length === secondParts.length && firstParts.every((part, index) => part === secondParts[index]);
}

export async function saveSchemeRecordDirectory(options) {
  return withSchemeStoreWriteLock(async () => {
    const paths = options.paths ?? defaultPaths;
    const filesRoot = options.filesRoot ?? paths.schemeFiles;
    const schemePath = schemePathOrDefault(options.schemePath);
    const schemeDir = schemeDirectoryFromPath(filesRoot, schemePath);
    let previousSchemePath = options.previousSchemePath;
    const sourceSchemeId = schemeNumberSelector(options.schemeId);
    if (sourceSchemeId !== null) {
      const numberedSourcePath = await resolveSchemePathForSelectorUnlocked({ schemeId: sourceSchemeId, paths, filesRoot });
      if (previousSchemePath !== undefined && previousSchemePath !== null) {
        const previousParts = optionalSchemePathParts(previousSchemePath);
        if (!sameSchemePath(previousParts, numberedSourcePath)) {
          const error = new Error("previousSchemePath 与 schemeId 指向不同方案。");
          error.statusCode = 400;
          error.code = "bad-request";
          throw error;
        }
      }
      previousSchemePath = numberedSourcePath;
    }
    let moved = false;
    if (Array.isArray(previousSchemePath) && previousSchemePath.length > 0 && !sameSchemePath(previousSchemePath, schemePath)) {
      const previousDir = schemeDirectoryFromPath(filesRoot, previousSchemePath);
      await mkdirInSpace(dirname(schemeDir));
      try {
        await rename(previousDir, schemeDir);
        moved = true;
      } catch (error) {
        if (error?.code !== "ENOENT") {
          throw error;
        }
      }
    }
    if (!moved) {
      await mkdirInSpace(schemeDir);
    }
    const assignments = await ensureSchemeNumbersUnlocked(paths, filesRoot);
    const schemeId = assignments.get(resolve(schemeDir));
    if (!isValidSchemeNumber(schemeId)) {
      throw new Error(`无法为方案「${schemePath.join("/")}」分配编号。`);
    }
    return schemeId;
  });
}

export async function deleteSchemeRecordDirectory(options) {
  return withSchemeStoreWriteLock(async () => {
    const paths = options.paths ?? defaultPaths;
    const filesRoot = options.filesRoot ?? paths.schemeFiles;
    const trashRoot = options.trashRoot ?? paths.schemeTrash;
    let schemePath = optionalSchemePathParts(options.schemePath);
    const schemeId = schemeNumberSelector(options.schemeId);
    if (schemeId !== null) {
      const numberedPath = await resolveSchemePathForSelectorUnlocked({ schemeId, paths, filesRoot });
      if (schemePath.length > 0 && !sameSchemePath(schemePath, numberedPath)) {
        const error = new Error("schemePath 与 schemeId 指向不同方案。");
        error.statusCode = 400;
        error.code = "bad-request";
        throw error;
      }
      schemePath = numberedPath;
    } else {
      schemePath = requireSchemePathArray(options.schemePath);
    }
    if (schemePath.length === 0) {
      return;
    }
    const schemeDir = schemeDirectoryFromPath(filesRoot, schemePath);
    await archiveSchemeStoreEntry(schemeDir, filesRoot, trashRoot, options.archiveId ?? schemeArchiveId());
  });
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
  } catch (error) {
    // ENOENT 是正常路径：落到下面按文件名扫历史后缀。非 ENOENT（权限丢失 / 目录被占用）
    // 此前与 ENOENT 共用一个 catch，静默继续往下走，等于把「读不到」说成「不存在」。
    if (error?.code !== "ENOENT") {
      throw new Error(`模型文件读取失败：${exactPath}（${error?.code ?? error?.name ?? "unknown"}）`, { cause: error });
    }
    // Fall through to filename-based lookup for legacy files with storage suffixes.
  }
  const targetKey = storageProjectNameKey(name);
  let entries = [];
  try {
    entries = await readdir(schemeDir, { withFileTypes: true });
  } catch (error) {
    // 同 readSchemeDirectory / archiveSchemeStoreEntry / listSpaceFiles 的口径：
    // 只有 ENOENT（方案目录真的不在）才算「找不到模型」，其余 IO 失败上抛。
    //
    // 静默 return null 的代价不是「多一次扫盘」：existingStoredProjectIndex 会据此认为
    // 「该模型还没有 idx」，于是重新分配一个**新 idx** —— 旧 idx 上挂着的全局线路引用
    // （projectIdx）就此对不上，导出的 model_id 也跟着变。readSchemeProjectRecord 则会
    // 回「模型不存在」404，而模型其实好好地在磁盘上。
    if (error?.code === "ENOENT") {
      return null;
    }
    throw new Error(`方案目录读取失败：${schemeDir}（${error?.code ?? error?.name ?? "unknown"}）`, { cause: error });
  }
  for (const entry of entries) {
    if (!entry.isFile() || !isModelJsonFile(entry.name)) {
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

let schemeStoreWriteQueue = Promise.resolve();

// ponytail: 全局队列串行各空间方案写入；仅当跨空间争用可测时再改为按根目录分队列。
function withSchemeStoreWriteLock(task) {
  const run = schemeStoreWriteQueue.then(task, task);
  schemeStoreWriteQueue = run.then(() => undefined, () => undefined);
  return run;
}

let projectIndexAllocationQueue = Promise.resolve();

function withProjectIndexAllocationLock(task) {
  const run = projectIndexAllocationQueue.then(task, task);
  projectIndexAllocationQueue = run.then(() => undefined, () => undefined);
  return run;
}

function modelIndexCounterPathForFilesRoot(filesRoot) {
  return join(dirname(resolve(filesRoot)), "model-index.json");
}

async function readPersistedModelIndex(counterPath) {
  try {
    const parsed = JSON.parse(await readFile(counterPath, "utf-8"));
    const value = Number(parsed?.lastIndex);
    return Number.isSafeInteger(value) && value > 0 ? value : 0;
  } catch (error) {
    // 归 0 是**既有降级**（计数器本来就是缓存，真值在 maxStoredProjectIndex 的全量扫盘
    // 里），但静默归 0 与「确实没有 idx」完全同形：计数器每次保存都被重置成 0，
    // idx 分配退化成「全靠扫盘」，而日志里一个字都没有。
    // ENOENT 是正常路径（新建工作区还没建过计数器），不刷屏。
    if (error?.code !== "ENOENT") {
      console.warn(`[模型序号] 读取计数器失败（${error?.code ?? error?.name ?? "unknown"}），已按 0 处理，本次 idx 分配改由全量扫盘决定：${counterPath}`);
    }
    return 0;
  }
}

async function maxStoredProjectIndex(dir) {
  let entries = [];
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch (error) {
    // 同上：归 0 是既有降级，但非 ENOENT 意味着这棵子树里的模型 idx 全部不可见，
    // 于是计数器一旦也偏低就会分配出**重复 idx**。留一句，排查者才知道该去看哪儿。
    if (error?.code !== "ENOENT") {
      console.warn(`[模型序号] 扫描目录失败（${error?.code ?? error?.name ?? "unknown"}），已按 0 处理，该目录下模型的 idx 本次不参与计算：${dir}`);
    }
    return 0;
  }
  let maxIndex = 0;
  for (const entry of entries) {
    const entryPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      maxIndex = Math.max(maxIndex, await maxStoredProjectIndex(entryPath));
      continue;
    }
    if (!entry.isFile() || !isModelJsonFile(entry.name)) {
      continue;
    }
    let raw;
    try {
      raw = await readFile(entryPath, "utf-8");
    } catch (error) {
      // 与同函数 readdir 失败处（及 readPersistedModelIndex）同一纪律：忽略是既有降级，
      // 但非 ENOENT 意味着这个文件的 idx 看不见也无人知道，计数器一旦也偏低就会分配出
      // 重复 idx。留一句，排查者才知道该去看哪儿。ENOENT（刚被删）继续静默。
      if (error?.code !== "ENOENT") {
        console.warn(`[模型序号] 读取模型文件失败（${error?.code ?? error?.name ?? "unknown"}），该模型的 idx 本次不参与计算：${entryPath}`);
      }
      continue;
    }
    try {
      const parsed = JSON.parse(raw);
      const idx = Number(parsed?.idx);
      if (Number.isSafeInteger(idx) && idx > maxIndex) {
        maxIndex = idx;
      }
    } catch {
      // Ignore damaged legacy files while recovering the highest valid model index.
    }
  }
  return maxIndex;
}

async function existingStoredProjectIndex(schemeDir, names) {
  for (const candidateName of names) {
    if (!candidateName) continue;
    const projectFile = await projectJsonFileForName(schemeDir, candidateName);
    if (!projectFile) continue;
    // 读盘与解析分开：**读盘失败绝不能当成「这个模型还没有 idx」**。一旦落到分配分支，
    // 模型会在改名/重存后拿到一个全新 idx，旧 idx 上挂着的全局线路引用（projectIdx）
    // 全部对不上，导出的 model_id 也跟着变 —— 而且没有一行日志，是静默的数据损坏。
    // 只有 ENOENT（模型刚被删）继续试下一个候选名；JSON 非法（真读不出 idx）沿用既有语义。
    let raw;
    try {
      raw = await readFile(projectFile.filePath, "utf-8");
    } catch (error) {
      if (error?.code === "ENOENT") {
        continue;
      }
      throw new Error(`模型文件读取失败：${projectFile.filePath}（${error?.code ?? error?.name ?? "unknown"}）`, { cause: error });
    }
    try {
      const parsed = JSON.parse(raw);
      const idx = Number(parsed?.idx);
      if (Number.isSafeInteger(idx) && idx > 0) {
        return idx;
      }
    } catch {
      // Treat an invalid legacy index as requiring a one-time allocation.
    }
  }
  return 0;
}

async function allocateStableProjectIndex({ filesRoot, schemeDir, name, previousName }) {
  return withProjectIndexAllocationLock(async () => {
    const counterPath = modelIndexCounterPathForFilesRoot(filesRoot);
    const existingIndex = await existingStoredProjectIndex(schemeDir, [previousName, name]);
    const persistedIndex = await readPersistedModelIndex(counterPath);
    const storedMaxIndex = await maxStoredProjectIndex(filesRoot);
    if (existingIndex > 0) {
      const lastIndex = Math.max(persistedIndex, storedMaxIndex, existingIndex);
      if (lastIndex !== persistedIndex) {
        await mkdirInSpace(dirname(counterPath));
        await writeFile(counterPath, `${JSON.stringify({ lastIndex }, null, 2)}\n`, "utf-8");
      }
      return existingIndex;
    }
    const nextIndex = Math.max(persistedIndex, storedMaxIndex) + 1;
    await mkdirInSpace(dirname(counterPath));
    await writeFile(counterPath, `${JSON.stringify({ lastIndex: nextIndex }, null, 2)}\n`, "utf-8");
    return nextIndex;
  });
}

export async function readSchemeProjectRecord(options = {}) {
  const paths = options.paths ?? defaultPaths;
  const filesRoot = options.filesRoot ?? paths.schemeFiles;
  const schemePath = schemePathOrDefault(await resolveSchemePathForSelector({
    schemePath: options.schemePath,
    schemeId: options.schemeId,
    paths,
    filesRoot
  }));
  const name = storageProjectDisplayName(options.name || options.projectName);
  const schemeDir = schemeDirectoryFromPath(filesRoot, schemePath);
  const projectFile = await projectJsonFileForName(schemeDir, name);
  if (!projectFile) {
    return null;
  }
  return readSchemeProjectFile(projectFile.filePath, projectFile.fileName, paths);
}

// 在方案写入队列内比对模型版本并保存，避免「检查后、写前」被并发保存覆盖。
export async function updateSchemeProjectRecordIfUnchanged({ paths = defaultPaths, schemePath, schemeId, name, expectedUpdatedAt, expectedContentHash, record }) {
  return withSchemeStoreWriteLock(async () => {
    const resolvedSchemePath = schemePathOrDefault(await resolveSchemePathForSelectorUnlocked({ paths, schemePath, schemeId }));
    const latestRecord = await readSchemeProjectRecord({ paths, schemePath: resolvedSchemePath, name });
    if (!latestRecord || latestRecord.updatedAt !== expectedUpdatedAt ||
      latestRecord.contentHash !== expectedContentHash) {
      return { conflict: true };
    }
    const savedRecord = await saveSchemeProjectRecordUnlocked({ paths, schemePath: resolvedSchemePath, record });
    return { conflict: false, record: savedRecord };
  });
}

// 按模型稳定序号 idx 定位模型（idx 由 allocateStableProjectIndex 分配，跨方案唯一）。
// 供以 model_id 指定模型的接口使用（如 /v1/schemes/model/send），以及 SVG 端点重建背景页
// （svgExport.mjs → buildBackgroundPageOption）：与方案路径解耦，模型改名或移到别的方案后 model_id 不变。
// 上限：按 idx 定位会全量遍历一次 files 目录（方案数 × 模型数），send 与背景页两条路径都走这里。
export async function findSchemeProjectRecordByIndex(options = {}) {
  const paths = options.paths ?? defaultPaths;
  const target = Number(options.index);
  if (!Number.isSafeInteger(target) || target <= 0) {
    return null;
  }
  const filesRoot = options.filesRoot ?? paths.schemeFiles;
  return scanProjectByIndex(filesRoot, [], target, paths);
}

async function scanProjectByIndex(dir, schemePath, target, paths = defaultPaths) {
  let entries = [];
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch (error) {
    // 只把 ENOENT 当「目录不存在」；其余（如 EACCES）上抛，避免「数据根不可读」与「模型已删除」同形
    if (error?.code === "ENOENT") {
      return null;
    }
    throw error;
  }
  for (const entry of entries) {
    if (!entry.isFile() || !isModelJsonFile(entry.name)) {
      continue;
    }
    const filePath = join(dir, entry.name);
    let parsed;
    try {
      parsed = JSON.parse(await readFile(filePath, "utf-8"));
    } catch {
      // 损坏的历史文件不参与 idx 匹配
      continue;
    }
    if (Number(parsed?.idx) !== target) {
      continue;
    }
    const record = await readSchemeProjectFile(filePath, entry.name, paths);
    return record ? { name: record.name, schemePath, project: record.project, updatedAt: record.updatedAt } : null;
  }
  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }
    const found = await scanProjectByIndex(join(dir, entry.name), [...schemePath, entry.name], target, paths);
    if (found) {
      return found;
    }
  }
  return null;
}

export async function saveSchemeProjectRecord(options) {
  return withSchemeStoreWriteLock(() => saveSchemeProjectRecordUnlocked(options));
}

async function saveSchemeProjectRecordUnlocked(options) {
  const paths = options.paths ?? defaultPaths;
  const filesRoot = options.filesRoot ?? paths.schemeFiles;
  const trashRoot = options.trashRoot ?? paths.schemeTrash;
  const schemePath = schemePathOrDefault(await resolveSchemePathForSelectorUnlocked({
    schemePath: options.schemePath,
    schemeId: options.schemeId,
    paths,
    filesRoot
  }));
  const record = options.record ?? {};
  const name = storageProjectDisplayName(record.name || record.project?.name);
  const updatedAt = record.updatedAt || new Date().toISOString();
  const schemeDir = schemeDirectoryFromPath(filesRoot, schemePath);
  await mkdirInSpace(schemeDir);
  const projectIndex = await allocateStableProjectIndex({
    filesRoot,
    schemeDir,
    name,
    previousName: options.previousName
  });
  const normalizedProject = normalizeProjectForStorage({
    ...(record.project ?? {}),
    name,
    idx: projectIndex
  });
  const invalidEnumParameters = invalidProjectEnumParameters(normalizedProject);
  if (invalidEnumParameters.length > 0) {
    const details = invalidEnumParameters.slice(0, 20).map(({ node, binding, allowedValues }) =>
      `设备“${node?.name || node?.id || "未命名"}”的 ${binding.definition?.cnName || binding.paramKey}（${binding.paramKey}）值“${binding.value || "<空>"}”无效，允许值为：${allowedValues.join("、")}`
    );
    const remaining = invalidEnumParameters.length > details.length ? `；另有 ${invalidEnumParameters.length - details.length} 项未列出` : "";
    throw new Error(`保存失败：模型存在非法枚举参数。${details.join("；")}${remaining}`);
  }
  const synchronizedGlobalLines = await registryFor(paths).syncProject({
    project: normalizedProject,
    projectIdx: projectIndex,
    projectName: name,
    schemePath
  });
  const project = synchronizedGlobalLines.project;
  const storageProject = synchronizedGlobalLines.storageProject ?? project;
  const storedRecord = {
    ...record,
    name,
    updatedAt,
    project: {
      ...project,
      name
    }
  };
  if (options.previousName && storageProjectNameKey(options.previousName) !== storageProjectNameKey(name)) {
    const previousPaths = projectFilePathsForName(schemeDir, options.previousName);
    await Promise.all(Object.values(previousPaths).map((filePath) => archiveSchemeStoreEntry(filePath, filesRoot, trashRoot, schemeArchiveId())));
  }
  // files 不变量：只留 .json。改造前落盘的 .e/.svg 在本次保存时归档（可回滚，不硬删）
  // 存在性守卫已下沉进 archiveSchemeStoreEntry（不存在即返回，不 mkdir → 不留空时间戳目录）
  const { jsonPath, ePath, svgPath } = projectFilePathsForName(schemeDir, name);
  const staleArchiveId = schemeArchiveId();
  await Promise.all(
    [ePath, svgPath].map((filePath) => archiveSchemeStoreEntry(filePath, filesRoot, trashRoot, staleArchiveId))
  );
  await writeTextIfChanged(jsonPath, stringifyJson({ ...storageProject, name }));
  return storedRecord;
}

export async function deleteSchemeProjectRecord(options) {
  return withSchemeStoreWriteLock(async () => {
    const paths = options.paths ?? defaultPaths;
    const filesRoot = options.filesRoot ?? paths.schemeFiles;
    const trashRoot = options.trashRoot ?? paths.schemeTrash;
    const schemePath = schemePathOrDefault(await resolveSchemePathForSelectorUnlocked({
      schemePath: options.schemePath,
      schemeId: options.schemeId,
      paths,
      filesRoot
    }));
    const name = storageProjectDisplayName(options.name || options.projectName);
    const schemeDir = schemeDirectoryFromPath(filesRoot, schemePath);
    const archiveId = options.archiveId ?? schemeArchiveId();
    const projectPaths = projectFilePathsForName(schemeDir, name);
    await registryFor(paths).detachProject({ schemePath, projectName: name });
    await Promise.all(Object.values(projectPaths).map((filePath) => archiveSchemeStoreEntry(filePath, filesRoot, trashRoot, archiveId)));
  });
}

async function writeSchemeFiles(schemes, options = {}) {
  const paths = options.paths ?? defaultPaths;
  const filesRoot = paths.schemeFiles;
  await mkdirInSpace(filesRoot);
  const previousAssignments = await ensureSchemeNumbersUnlocked(paths, filesRoot);
  const previousPathBySchemeId = new Map(
    [...previousAssignments].map(([schemeDir, schemeId]) => [schemeId, resolve(schemeDir)])
  );
  const targetSchemes = [];
  const collectTargetSchemes = (records, parentDir) => {
    for (const scheme of records ?? []) {
      const schemeDir = resolve(join(parentDir, safeFilePart(scheme.name, "方案")));
      targetSchemes.push({ scheme, schemeDir });
      collectTargetSchemes(scheme.children, schemeDir);
    }
  };
  collectTargetSchemes(schemes, filesRoot);
  const targetSchemeDirs = new Set(targetSchemes.map(({ schemeDir }) => schemeDir));
  const carriedSchemeIds = new Map();
  const claimedSchemeIds = new Set();

  for (const { scheme, schemeDir } of targetSchemes) {
    if (previousAssignments.has(schemeDir) || !isValidSchemeNumber(scheme.schemeId)) {
      continue;
    }
    const previousDir = previousPathBySchemeId.get(scheme.schemeId);
    if (!previousDir || targetSchemeDirs.has(previousDir) || claimedSchemeIds.has(scheme.schemeId)) {
      continue;
    }
    const { metadata } = await readSchemeNumberMetadata(previousDir);
    carriedSchemeIds.set(schemeDir, {
      ...metadata,
      ...(Object.hasOwn(metadata, "name") ? { name: scheme.name } : {}),
      schemeId: scheme.schemeId
    });
    claimedSchemeIds.add(scheme.schemeId);
  }

  const expectedFiles = new Set();
  const expectedDirs = new Set([filesRoot]);
  const writeTasks = [];

  const writeSchemeTree = async (scheme, parentDir) => {
    const schemeDir = join(parentDir, safeFilePart(scheme.name, "方案"));
    expectedDirs.add(schemeDir);
    await mkdirInSpace(schemeDir);
    const metadataPath = join(schemeDir, "scheme.json");
    expectedFiles.add(metadataPath);
    const carriedMetadata = carriedSchemeIds.get(resolve(schemeDir));
    if (carriedMetadata) {
      writeTasks.push(writeTextIfChanged(metadataPath, `${JSON.stringify(carriedMetadata, null, 2)}\n`));
    }
    for (const record of scheme.projects ?? []) {
      const baseName = safeFilePart(record.name, "模型");
      const jsonPath = join(schemeDir, `${baseName}.json`);
      expectedFiles.add(jsonPath);
      writeTasks.push(writeTextIfChanged(jsonPath, stringifyJson(record.project)));
    }
    for (const childScheme of scheme.children ?? []) {
      await writeSchemeTree(childScheme, schemeDir);
    }
  };

  for (const scheme of schemes) {
    await writeSchemeTree(scheme, filesRoot);
  }
  await Promise.all(writeTasks);
  // The initial scan persisted the old high-water mark. Archive stale source
  // paths before assigning numbers so a moved scheme keeps its number and copies get fresh ones.
  await archiveStaleSchemeFiles(filesRoot, expectedFiles, expectedDirs, { paths });
  const assignments = await ensureSchemeNumbersUnlocked(paths, filesRoot);
  const savedSchemes = schemeIdsOnRecords(schemes, filesRoot, assignments);
  await registryFor(paths).rebuildFromStorage();
  return savedSchemes;
}

// publicAsset / imageCountsByFolder 已拆离至 ./imageAssetHelpers.mjs

function createImageManifestItem({ name, mimeType, bytes, folderId }) {
  const id = randomId("img-");
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

function getAssetDir(item, options = {}) {
  const paths = options.paths ?? defaultPaths;
  return item.dir === "icons" ? paths.icons : paths.images;
}

async function writeImageAssetFile(item, bytes, options = {}) {
  const filePath = join(getAssetDir(item, options), item.filename);
  // 原子写，且必须先过退休判定：atomicWriteFile 自己会 mkdir(dirname)，
  // 那是一条绕过 mkdirInSpace 的建目录路径（与 writeTextIfChanged 同一处理，勿简化）。
  // 裸 writeFile 会把文件截断在半个图元上；图标被 SVG 导出内联成 data URL，坏图即坏导出。
  assertNotRetiredRoot(filePath);
  await atomicWriteFile(filePath, bytes);
}

// safeImageLibraryId / normalizeImportedImageLibraryFolders / normalizeImportedImageLibraryAssets 已拆离至 ./imageAssetHelpers.mjs

async function handleImportImageLibrary(request, response, paths) {
  const payload = await readJsonBody(request, maxIconLibraryImportBodyBytes, "图标库导入文件过大，最大支持 128MB。");
  const importedFolders = normalizeImportedImageLibraryFolders(payload.folders);
  const folderIds = new Set(importedFolders.map((folder) => folder.id));
  const importedAssets = normalizeImportedImageLibraryAssets(payload.assets, folderIds);
  if (importedAssets.length === 0) {
    sendError(response, 400, "导入文件中没有可恢复的图标资源。");
    return;
  }

  // folders 与 manifest 都是 read-modify-write，必须走 withImageStoreLock：
  // 此前本 handler 是同文件里唯一没进锁的写路径（handleUpload / 各 folder handler /
  // handleImportIconLibrary 都在锁内），并发导入与上传交错时后者写入的条目会被
  // 本 handler 用旧快照整批覆盖 —— 表现为 HTTP 200 + 计数正常，但条目凭空消失、
  // 磁盘上的文件成了不可达孤儿。
  await withImageStoreLock(async () => {
    await ensureStore({ paths });
    const currentFolders = await readImageFolders({ paths });
    const folderById = new Map(currentFolders.map((folder) => [folder.id, folder]));
    for (const folder of importedFolders) {
      folderById.set(folder.id, folder.id === "root" ? { ...rootImageFolder(), ...folder, id: "root" } : folder);
    }
    await writeImageFolders(Array.from(folderById.values()), { paths });

    const manifest = await readManifest({ paths });
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
        createdAt: asset.createdAt,
        dir: "icons"
      };
      const previous = manifestById.get(item.id);
      // **先写新的、成功后再删旧的**。反过来（先 rm 旧文件）时，中途失败会留下悬空条目：
      // writeManifest 要等整个循环跑完才落盘，于是那一刻 manifest 仍指向旧文件名，
      // 而旧文件已经被删了 —— 图标库里躺着一条指向不存在文件的记录，SVG 导出引用到它就炸。
      await writeImageAssetFile(item, parsed.bytes, { paths });
      if (previous?.filename && previous.filename !== item.filename) {
        await rm(join(getAssetDir(previous, { paths }), previous.filename), { force: true });
      }
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
    ], { paths });
    sendJson(response, 200, {
      ok: true,
      importedCount: savedItems.length,
      skippedCount,
      folders: Array.from(folderById.values()),
      assets: savedItems.map(publicAsset)
    });
  });
}

// iconLibrary 文档图片与 Office 矢量图提取管线已拆离至 ./iconLibraryArchive.mjs

async function handleImportIconLibrary(request, response, paths) {
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
  } catch (error) {
    // 守卫抛出的超限错误透传原因，其余归为容器格式错误
    const message = error instanceof Error ? error.message : "";
    sendError(response, 400, message.includes("上限") ? message : "文档图片导入文件不是有效的压缩容器。");
    return;
  }
  const folderId = await resolveFolderId(typeof payload.folderId === "string" ? payload.folderId : "root", { paths });
  const items = [];
  for (const entry of extracted.entries) {
    const item = createImageManifestItem({
      name: entry.name,
      mimeType: entry.mimeType,
      bytes: entry.bytes,
      folderId
    });
    await writeImageAssetFile(item, entry.bytes, { paths });
    items.push(item);
  }
  if (items.length === 0) {
    sendError(response, 400, "未在文件中找到可直接显示的 SVG、PNG、JPEG、WEBP 或 GIF 图片素材。");
    return;
  }
  await withImageStoreLock(async () => {
    await ensureStore({ paths });
    const manifest = await readManifest({ paths });
    await writeManifest([...items, ...manifest], { paths });
  });
  sendJson(response, 201, {
    ok: true,
    assets: items.map(publicAsset),
    skippedCount: extracted.skippedCount
  });
}

async function handleUpload(request, response, paths) {
  const payload = await readJsonBody(request, maxImageBodyBytes, "图片过大，最大支持 16MB。");
  const { dataUrl, name } = payload;
  if (typeof dataUrl !== "string") {
    sendError(response, 400, "缺少图片数据。");
    return;
  }
  const { mimeType, bytes } = parseDataUrl(dataUrl);
  const folderId = await resolveFolderId(typeof payload.folderId === "string" ? payload.folderId : "root", { paths });
  const item = createImageManifestItem({ name, mimeType, bytes, folderId });
  await withImageStoreLock(async () => {
    await ensureStore({ paths });
    await writeImageAssetFile(item, bytes, { paths });
    const manifest = await readManifest({ paths });
    await writeManifest([item, ...manifest], { paths });
  });
  sendJson(response, 201, publicAsset(item));
}

async function handleCreateImageFolder(request, response, paths) {
  const payload = await readJsonBody(request);
  const name = safeName(payload.name || "新建文件夹");
  const folder = {
    id: randomId("folder-"),
    name,
    createdAt: new Date().toISOString()
  };
  await withImageStoreLock(async () => {
    const current = await readImageFolders({ paths });
    if (current.some((existing) => existing.name.trim() === name.trim())) {
      sendError(response, 409, "图片文件夹名称重复。");
      return;
    }
    await writeImageFolders([...current, folder], { paths });
    sendJson(response, 201, folder);
  });
}

async function handleRenameImageFolder(folderId, request, response, paths) {
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
  await withImageStoreLock(async () => {
    const folders = await readImageFolders({ paths });
    if (!folders.some((folder) => folder.id === folderId)) {
      sendError(response, 404, "图片文件夹不存在。");
      return;
    }
    if (folders.some((folder) => folder.id !== folderId && folder.name.trim() === name.trim())) {
      sendError(response, 409, "图片文件夹名称重复。");
      return;
    }
    const next = folders.map((folder) => (folder.id === folderId ? { ...folder, name } : folder));
    await writeImageFolders(next, { paths });
    sendJson(response, 200, next.find((folder) => folder.id === folderId));
  });
}

async function handleDeleteImageFolder(folderId, response, paths) {
  if (folderId === "root") {
    sendError(response, 400, "默认文件夹不能删除。");
    return;
  }
  await withImageStoreLock(async () => {
    const folders = await readImageFolders({ paths });
    if (!folders.some((folder) => folder.id === folderId)) {
      sendError(response, 404, "图片文件夹不存在。");
      return;
    }
    await writeImageFolders(folders.filter((folder) => folder.id !== folderId), { paths });
    const manifest = await readManifest({ paths });
    await writeManifest(manifest.map((item) => (item.folderId === folderId ? { ...item, folderId: "root" } : item)), { paths });
    sendJson(response, 200, { ok: true });
  });
}

// 把文件流向响应。
//
// stat 通过到流真正打开之间仍有窗口（文件被换掉 / 改权限 / 磁盘 IO 错）：这类失败
// createReadStream 只发 'error' 事件、不抛，而此刻响应头早已写出——不挂处理器的话
// 响应永远不会结束，连接一直挂到客户端超时。实测（图片下载端点）：manifest 指向一个
// 不存在的文件时稳定复现，整请求卡满 30s。
//
// 四处静态/动态文件服务共用这一份，不要各写各的。
function pipeFileToResponse(filePath, response) {
  const stream = createReadStream(filePath);
  stream.on("error", () => {
    response.destroy();
  });
  stream.pipe(response);
}

async function handleDownload(id, response, paths) {
  const manifest = await readManifest({ paths });
  const item = manifest.find((entry) => entry.id === id);
  if (!item) {
    sendError(response, 404, "图片不存在。");
    return;
  }
  const filePath = join(getAssetDir(item, { paths }), item.filename);
  // manifest 里的条目与磁盘上的文件可以不同步：备份包只带 manifest 不带图、
  // 图片被外部删掉、filename 被压成单段后指向另一个不存在的名字，都是真会遇到的。
  // 先 stat 一次把这种情况回成干净的 404，而不是先 writeHead 再让流在后面炸。
  try {
    await stat(filePath);
  } catch (error) {
    sendError(response, error?.code === "ENOENT" ? 404 : 500, error?.code === "ENOENT" ? "图片文件缺失。" : "图片文件读取失败。");
    return;
  }
  response.writeHead(200, {
    "content-type": item.mimeType,
    // URL 不带空间维度（前端拼 apiPath('/images/' + id)），内容却按空间 cookie 取：
    // private 挡掉共享/代理缓存；vary: Cookie 让浏览器缓存按 cookie 分键，
    // 否则切换空间后同一 URL 会回放上一空间的字节（跨空间导入图片库后 id 相同即可复现）。
    "cache-control": "private, max-age=31536000, immutable",
    vary: "Cookie",
    ...accessControlOriginOnly
  });
  pipeFileToResponse(filePath, response);
}

async function handleDeleteImageAsset(id, response, paths) {
  await withImageStoreLock(async () => {
    const manifest = await readManifest({ paths });
    const item = manifest.find((entry) => entry.id === id);
    if (!item) {
      sendError(response, 404, "图片不存在。");
      return;
    }
    await writeManifest(manifest.filter((entry) => entry.id !== id), { paths });
    await rm(join(getAssetDir(item, { paths }), item.filename), { force: true });
    sendJson(response, 200, { ok: true });
  });
}

const {
  handleListGlobalLines,
  handleAttachGlobalLine,
  handleDetachGlobalLine,
  handleUpdateGlobalLine,
  handleDeleteEmptyGlobalLine,
  handleSyncGlobalLineProject
} = createGlobalLineHandlers({
  registryFor,
  readJsonBody,
  sendJson,
  sendError,
  maxMeasurementConfigBodyBytes,
  maxSchemeBodyBytes
});

const {
  trySnapshotSavedModels,
  publishModelChangesSince,
  publishSavedModelChange,
  handleSaveSchemes,
  handleReadSchemeProject,
  handleSaveSchemeProject,
  handleDeleteSchemeProject,
  handleSaveSchemeRecord,
  handleDeleteSchemeRecord,
  handleExportSchemeArchive,
  handleImportSchemeArchive,
  handleExportSpaceArchive,
  spaceNameRejectMessage,
  sendSpaceNameConflict,
  handleImportSpaceArchive
} = createSchemeHttpHandlers({
  readSchemes,
  writeSchemes,
  readSchemeProjectRecord,
  saveSchemeProjectRecord,
  deleteSchemeProjectRecord,
  saveSchemeRecordDirectory,
  deleteSchemeRecordDirectory,
  resolveSchemePathForSelector,
  parseSchemePathParam,
  schemePathOrDefault,
  createSchemeArchiveBuffer,
  importSchemeArchiveBuffer,
  assertZipUncompressedSizeWithinLimit,
  zipRootNameFor,
  extractSpaceZipToDirectory,
  retiredSpaceRoots,
  evictRegistry,
  readJsonBody,
  readRawBody,
  sendJson,
  sendError,
  maxSchemeBodyBytes,
  maxSchemeZipBodyBytes
});

const {
  handleSaveColorConfig,
  handleSaveMeasurementConfig,
  handleSaveDeviceLibrary,
  handleSaveSymbolExportSchemes,
  handleSymbolExport,
  handleStandaloneSymbolExport,
  serveStaticAsset,
  serveIconLibraryAsset
} = createConfigAndStaticHandlers({
  readJsonBody,
  sendJson,
  sendError,
  writeColorConfig,
  writeMeasurementConfig,
  writeDeviceLibraryConfig,
  mkdirInSpace,
  pipeFileToResponse,
  getIconLibraryPublicDir: () => join(repoRoot, "public", "icon-library"),
  maxColorConfigBodyBytes,
  maxMeasurementConfigBodyBytes,
  maxDeviceLibraryBodyBytes,
  maxSymbolExportSchemesBodyBytes,
  maxSymbolExportBodyBytes
});

export { serveStaticAsset, serveIconLibraryAsset };

export async function createImageServer({
  port = 5174,
  host = "127.0.0.1",
  staticRoot,
  interfaceCustomizationPath,
  interfaceCustomizationExamplePath,
  projectDirectory: interfaceCustomizationProjectDirectory = projectDirectory,
  spaceStore: injectedSpaceStore,
  trackInstance = false,
  instanceRegistry: injectedInstanceRegistry
} = {}) {
  const routeKey = (method, sub) => `${method} ${apiPath(sub)}`;
  const effectiveInterfaceCustomizationPath = interfaceCustomizationPath
    ? resolve(interfaceCustomizationPath)
    : interfaceCustomizationProjectDirectory
      ? resolve(interfaceCustomizationProjectDirectory, "ui-customization.config.json")
      : resolve(repositoryRoot, "ui-customization.config.json");
  const effectiveInterfaceCustomizationExamplePath = interfaceCustomizationExamplePath
    ? resolve(interfaceCustomizationExamplePath)
    : resolve(repositoryRoot, "ui-customization.config.base.json");
  const nativeExportSaveService = createNativeExportSaveService();
  // spaceStore 可注入：测试要复用自己建的那个实例，否则同进程两个写者各持注册表快照，
  // 后写者会用陈旧快照回滚对方的条目。动态 import 维持与 spaceStore 的循环依赖不静态化。
  const { createSpaceStore, resolveSpaceFromRequest, SPACE_COOKIE_NAME, SPACE_FALLBACK_HEADER } = await import("./spaceStore.mjs");
  let spaceStore = injectedSpaceStore ?? createSpaceStore(dataRoot);
  await spaceStore.ensureInitialized();
  const { createModelUpdateService } = await import("./modelUpdateService.mjs");
  const modelUpdateService = createModelUpdateService({
    sendMessage: () => undefined,
    targetExists: async ({ spaceId, scope }) => {
      if (!spaceStore.has(spaceId)) return false;
      const paths = spaceStore.resolvePaths(spaceId);
      if (scope.type === "space") return true;
      if (scope.type === "scheme") {
        let schemes = await readSchemes({ paths });
        for (const name of scope.schemePath) {
          const match = schemes.find((scheme) => scheme.name === name);
          if (!match) return false;
          schemes = match.children ?? [];
        }
        return true;
      }
      if (scope.type === "model") {
        return Boolean(await findSchemeProjectRecordByIndex({ index: Number(scope.modelId), paths }));
      }
      return false;
    },
    buildPayload: async ({ spaceId, record, schemePath, files }) => {
      const { buildModelUpdatePayload } = await import("./modelUpdatePayload.mjs");
      return buildModelUpdatePayload({
        record,
        schemePath,
        files,
        paths: spaceStore.resolvePaths(spaceId)
      });
    }
  });
  let modelUpdateWebSocket = null;
  const dataRootGate = createDataRootGate();
  const instanceRegistry = injectedInstanceRegistry ?? (
    trackInstance
      ? createWebgrpInstanceRegistry({ dataRoot, host, port })
      : null
  );
  const commitDataRootRuntime = async (nextRoot) => {
    const resolvedRoot = resolve(nextRoot);
    const nextStore = createSpaceStore(resolvedRoot);
    await nextStore.ensureInitialized();
    await evictRegistry(dataRoot);
    dataRoot = resolvedRoot;
    defaultPaths = spacePathsFor(resolvedRoot, "default");
    spaceStore = nextStore;
    await instanceRegistry?.updateDataRoot(resolvedRoot);
    return nextStore;
  };
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
    [routeKey("POST", "/platform/data-dir"), async ({ request, response }) => {
      const remoteAddress = String(request.socket?.remoteAddress ?? "").replace(/^::ffff:/u, "");
      const isLoopback = !remoteAddress || remoteAddress === "127.0.0.1" || remoteAddress === "::1";
      if (!isAllowedNativeExportOrigin(request) || !isLoopback) {
        sendError(response, 403, "仅允许本机页面调用数据目录迁移接口。", "DATA_DIR_ORIGIN_FORBIDDEN");
        return;
      }
      let migrationLock = null;
      try {
        if (instanceRegistry) {
          migrationLock = await instanceRegistry.acquireMigrationLock();
          const activeInstances = await instanceRegistry.listActive();
          if (activeInstances.length > 1) {
            throw new WebgrpInstanceError(
              "DATA_DIR_MULTIPLE_INSTANCES",
              "检测到同一工作目录有多个 webgrp 实例运行，已禁止修改数据目录。"
            );
          }
        }
        const envDataDir = String(process.env.GRAPH_MODEL_DATA_DIR ?? "").trim();
        if (envDataDir && resolve(envDataDir) === resolve(dataRoot)) {
          sendError(
            response,
            409,
            "GRAPH_MODEL_DATA_DIR 环境变量覆盖了 platform.config.json，无法通过接口持久化迁移结果。",
            "DATA_DIR_ENV_OVERRIDE"
          );
          return;
        }
        const body = await readJsonBody(request, 64 * 1024, "数据目录迁移参数过大。");
        const rawPath = typeof body?.path === "string" ? body.path.trim() : "";
        if (!rawPath) {
          sendError(response, 400, "path 必须是非空目录路径。", "DATA_DIR_PATH_INVALID");
          return;
        }
        const targetRoot = resolve(repositoryRoot, rawPath);
        const migration = createDataRootMigration({
          currentRoot: dataRoot,
          targetRoot,
          configPath: platformConfigPath,
          exampleConfigPath: join(repositoryRoot, "platform.config.base.json"),
          archiveParent: dirname(dataRoot),
          hooks: {
            afterArchive: async () => {
              await evictRegistry(dataRoot);
            },
            afterConfigWrite: async () => {
              await commitDataRootRuntime(targetRoot);
            }
          }
        });
        const result = await migration.run();
        sendJson(response, 200, {
          ok: true,
          dataRoot: result.dataRoot,
          archivePath: result.archivePath,
          savedAt: new Date().toISOString()
        });
      } catch (error) {
        const code = error?.code ?? (error instanceof DataRootMigrationError ? "DATA_DIR_MIGRATION_FAILED" : undefined);
        const status = [
          "DATA_DIR_MIGRATION_IN_PROGRESS",
          "DATA_DIR_MULTIPLE_INSTANCES",
          "DATA_DIR_PATH_INVALID",
          "DATA_DIR_NOT_FOUND",
          "DATA_DIR_NOT_EMPTY",
          "DATA_DIR_UNSUPPORTED_ENTRY"
        ].includes(code)
          ? (code === "DATA_DIR_MIGRATION_IN_PROGRESS" || code === "DATA_DIR_MULTIPLE_INSTANCES" ? 409 : 400)
          : 500;
        sendError(response, status, error instanceof Error ? error.message : "数据目录迁移失败。", code ?? "DATA_DIR_MIGRATION_FAILED");
      } finally {
        await migrationLock?.release();
      }
    }],
    [routeKey("GET", "/interface-customization"), async ({ response }) => {
      const config = await readInterfaceCustomizationConfig({
        exampleFilePath: effectiveInterfaceCustomizationExamplePath,
        filePath: effectiveInterfaceCustomizationPath
      });
      sendJson(response, 200, config);
    }],
    [routeKey("PUT", "/interface-customization"), async ({ request, response }) => {
      const payload = await readJsonBody(
        request,
        maxInterfaceCustomizationBodyBytes,
        "界面定制配置数据过大，最大支持 64KB。"
      );
      const config = await writeInterfaceCustomizationConfig(payload, { filePath: effectiveInterfaceCustomizationPath });
      sendJson(response, 200, { ok: true, ...config });
    }],
    // 空间管理：本系统自身的管理面，返回 /webgrp/* 内部域形态，不进 /v1 信封。
    // 空间管理端点由派发层的 isSpaceAgnostic 短路（不注入 spaceCtx），current 由 handler 自算。
    [routeKey("GET", "/spaces"), async ({ request, response, url }) => {
      if (spaceStore.requiresInitialSpaceSetup()) {
        sendJson(response, 200, { spaces: [], current: "", setupRequired: true });
        return;
      }
      // current 用与派发层同一个解析函数算出，保证与请求实际生效的空间一致
      const current = resolveSpaceFromRequest(request, url, spaceStore).id;
      // 活跃度只在这一次管理调用上刷（不做每请求写盘），且先刷再列，
      // 使本次响应里的 lastAccessAt 就是刚刷新的那个
      await spaceStore.touchLastAccess(current);
      const spaces = await spaceStore.list();
      sendJson(response, 200, { spaces, current });
    }],
    [routeKey("POST", "/spaces/initialize"), async ({ request, response }) => {
      const body = await readJsonBody(request);
      const name = normalizeSpaceName(body?.name);
      const reject = spaceNameRejectMessage(name);
      if (reject) {
        sendError(response, 400, reject, "SPACE_NAME_INVALID");
        return;
      }
      try {
        const space = await spaceStore.initializeDefaultSpace(name, {
          owner: normalizeSpaceOwner(body?.owner)
        });
        sendJson(response, 200, space);
      } catch (error) {
        if (sendSpaceNameConflict(response, error)) return;
        if (error?.code === "SPACE_ALREADY_INITIALIZED") {
          sendError(response, 409, error.message, error.code);
          return;
        }
        throw error;
      }
    }],
    [routeKey("POST", "/spaces"), async ({ request, response }) => {
      const body = await readJsonBody(request);
      const name = normalizeSpaceName(body?.name);
      // 空名/全符号/超长一律拒绝（规则单源在 spaceId.mjs，与 PUT /spaces、ZIP 导入共用）。
      // spaceIdFromName 对全符号名有 "space" 兜底，那是给非 HTTP 调用方的防御，不改变本端点的拒绝语义。
      const reject = spaceNameRejectMessage(name);
      if (reject) {
        sendError(response, 400, reject, "SPACE_NAME_INVALID");
        return;
      }
      // 存**归一后**的名字：否则「能被创建的名字一定能无损往返」不成立。
      // 重名 ≠ id 撞车：不再静默加 -2 后缀建第二个同名空间，而是 409（前端提示改名）。
      // 归属（qiankun 宿主传来的登录用户名）：只 trim + 限长，**不校验合法性** ——
      // 它不是权限，只用于前端把列表收窄到「自己的空间」；缺省 = 无主空间。
      const owner = normalizeSpaceOwner(body?.owner);
      let space;
      try {
        space = await spaceStore.create(name, { onDuplicate: "reject", owner });
      } catch (error) {
        if (sendSpaceNameConflict(response, error)) return;
        if (error?.code === "SPACE_NOT_INITIALIZED") {
          sendError(response, 409, error.message, error.code);
          return;
        }
        throw error;
      }
      // 同名空间会复用刚被删掉的 id（即同一个根）：撤下退休登记，否则它一建出来就被拒写
      retiredSpaceRoots.delete(spaceStore.resolvePaths(space.id).root);
      sendJson(response, 200, space);
    }],
    [routeKey("PUT", "/spaces"), async ({ request, response }) => {
      const body = await readJsonBody(request);
      // 改名此前没有任何校验（rename 只 trim）：全符号名与超长名都能进注册表，
      // 于是「POST 建不出的名字」可以经 rename 进来，再被导出→导入按另一套规则改掉。补上同一条规则。
      const name = normalizeSpaceName(body?.name);
      const reject = spaceNameRejectMessage(name);
      if (reject) {
        sendError(response, 400, reject, "SPACE_RENAME_FAILED");
        return;
      }
      try {
        await spaceStore.rename(String(body?.id ?? ""), name);
        sendJson(response, 200, { ok: true });
      } catch (error) {
        // 改名撞上已有空间名 → 409（与新建同一条唯一性规则，由 store 在锁内判）
        if (sendSpaceNameConflict(response, error)) return;
        sendError(response, 400, error.message, "SPACE_RENAME_FAILED");
      }
    }],
    [routeKey("DELETE", "/spaces"), async ({ request, response }) => {
      const body = await readJsonBody(request);
      const id = String(body?.id ?? "");
      if (id === "default") {
        sendError(response, 400, "default 空间不可删除。", "SPACE_PINNED");
        return;
      }
      // 顺序：登记退休 → 排空并驱逐注册表 → 删目录。三步都不能换位：
      // 登记晚于驱逐就漏掉「已入场、卡在读体」的写请求；先删目录则会让队列里的
      // 原子写按旧绝对路径把目录复活（排空的正是它们）。
      let root;
      try {
        root = spaceStore.resolvePaths(id).root;
        retiredSpaceRoots.add(root);
        await evictRegistry(root);
        await spaceStore.remove(id);
        modelUpdateWebSocket?.closeSpace(id);
        sendJson(response, 200, { ok: true });
      } catch (error) {
        // 撤下条件按「空间是否还在」判，不按「有没有抛错」：
        // fs 真失败（Windows 上目录内有占用句柄时 rename 会 EPERM/EBUSY）时空间仍在，必须撤下，
        // 否则它被永久拒写；而被并发 DELETE 抢先删掉时空间已不在，撤下就等于把登记清空，
        // 那条卡在读体、拿着旧根的在飞请求立刻能把已删空间写回来。
        if (root && spaceStore.has(id)) retiredSpaceRoots.delete(root);
        const code = /pinned|最后一个/.test(error.message) ? "SPACE_PINNED" : "SPACE_DELETE_FAILED";
        sendError(response, 400, error.message, code);
      }
    }],
    [routeKey("GET", "/spaces/export"), async ({ response, paths, spaceId }) => {
      // 端点名要的是**空间名**，而 spaceCtx 只注入了 paths 与 spaceId —— 名字要查注册表，
      // 不要用 paths.root 反推（default 的 root 是数据根，反推会得到数据目录名）
      const space = (await spaceStore.list()).find((item) => item.id === spaceId);
      const spaceName = space?.name ?? spaceId;
      // 空间名是自由文本（PUT /spaces 只 trim），含 / 或 \ 就不能整体当单段目录名/文件名 ——
      // 建包器不做净化，故这里算出净化版专门给包内目录与文件名，原名仍进 meta 供往返。
      // 兜底名是**导出侧**的说法（"空间"），不是导入侧的 "导入空间"。
      await handleExportSpaceArchive(response, paths, spaceName, safeFilePart(spaceName, "空间"));
    }],
    [routeKey("POST", "/spaces/import"), async ({ url, request, response }) => {
      await handleImportSpaceArchive(request, response, spaceStore, url, {
        capture: trySnapshotSavedModels,
        publish: (id, paths, before) => publishModelChangesSince(modelUpdateService, id, paths, before),
        closeSpace: (id) => modelUpdateWebSocket?.closeSpace(id)
      });
    }],
    [routeKey("GET", "/images"), async ({ url, request, response, paths }) => {
      const manifest = await readManifest({ paths });
      const folderId = url.searchParams.get("folderId");
      const filtered = folderId ? manifest.filter((item) => (item.folderId || "root") === folderId) : manifest;
      await sendJsonCacheable(request, response, filtered.map(publicAsset));
    }],
    [routeKey("POST", "/images"), async ({ request, response, paths }) => {
      await handleUpload(request, response, paths);
    }],
    // 名实相符：/icon-library/import 收 {name,dataUrl,folderId} 从文档抽图（前端 importBackendIconLibraryFile），
    // /image-library/import 收 {folders,assets} 恢复图片库（前端 importBackendImageLibraryPayload）。
    // 32e77ef8 曾把两者对调且未同步前端，导致两条导入通道自 2026-07-24 起恒 400，此处复原。
    [routeKey("POST", "/icon-library/import"), async ({ request, response, paths }) => {
      await handleImportIconLibrary(request, response, paths);
    }],
    [routeKey("POST", "/image-library/import"), async ({ request, response, paths }) => {
      await handleImportImageLibrary(request, response, paths);
    }],
    [routeKey("POST", "/exports/native/select-file"), async ({ request, response }) => {
      await handleSelectNativeExportFile(request, response, nativeExportSaveService);
    }],
    [routeKey("POST", "/exports/native/write-text"), async ({ url, request, response }) => {
      await handleWriteNativeExportText(url, request, response, nativeExportSaveService);
    }],
    [routeKey("POST", "/exports/native/write-bundle"), async ({ url, request, response }) => {
      await handleWriteNativeExportBundle(url, request, response, nativeExportSaveService);
    }],
    [routeKey("POST", "/exports/native/open-file"), async ({ url, request, response }) => {
      await handleOpenNativeExportFile(url, request, response, nativeExportSaveService);
    }],
    [routeKey("GET", "/image-folders"), async ({ request, response, paths }) => {
      const folders = await readImageFolders({ paths });
      const manifest = await readManifest({ paths });
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
    [routeKey("POST", "/image-folders"), async ({ request, response, paths }) => {
      await handleCreateImageFolder(request, response, paths);
    }],
    [routeKey("GET", "/schemes"), async ({ url, request, response, paths }) => {
      const includeProjects = url.searchParams.get("includeProjects") === "1";
      const schemes = normalizeSchemesForStorage(await readSchemes({ includeProjects, paths }));
      await sendJsonCacheable(request, response, { schemes });
    }],
    [routeKey("GET", "/schemes/export"), async ({ url, response, paths }) => {
      await handleExportSchemeArchive(url, response, paths);
    }],
    [routeKey("POST", "/schemes/import"), async ({ url, request, response, paths, spaceId }) => {
      await handleImportSchemeArchive(url, request, response, paths, spaceId, modelUpdateService);
    }],
    [routeKey("PUT", "/schemes"), async ({ request, response, paths, spaceId }) => {
      await handleSaveSchemes(request, response, paths, spaceId, modelUpdateService);
    }],
    [routeKey("GET", "/schemes/project"), async ({ url, response, paths }) => {
      await handleReadSchemeProject(url, response, paths);
    }],
    [routeKey("PUT", "/schemes/project"), async ({ request, response, paths, spaceId }) => {
      await handleSaveSchemeProject(request, response, paths, spaceId, modelUpdateService);
    }],
    [routeKey("DELETE", "/schemes/project"), async ({ request, response, paths, spaceId }) => {
      await handleDeleteSchemeProject(request, response, paths, spaceId, modelUpdateService);
    }],
    [routeKey("PUT", "/schemes/scheme"), async ({ request, response, paths, spaceId }) => {
      await handleSaveSchemeRecord(request, response, paths, spaceId, modelUpdateService);
    }],
    [routeKey("DELETE", "/schemes/scheme"), async ({ request, response, paths, spaceId }) => {
      await handleDeleteSchemeRecord(request, response, paths, spaceId, modelUpdateService);
    }],
    [routeKey("GET", "/global-lines"), async ({ response, paths }) => {
      await handleListGlobalLines(response, paths);
    }],
    [routeKey("POST", "/global-lines/attach"), async ({ request, response, paths }) => {
      await handleAttachGlobalLine(request, response, paths);
    }],
    [routeKey("POST", "/global-lines/detach"), async ({ request, response, paths }) => {
      await handleDetachGlobalLine(request, response, paths);
    }],
    [routeKey("PUT", "/global-lines/record"), async ({ request, response, paths }) => {
      await handleUpdateGlobalLine(request, response, paths);
    }],
    [routeKey("DELETE", "/global-lines/record"), async ({ request, response, paths }) => {
      await handleDeleteEmptyGlobalLine(request, response, paths);
    }],
    [routeKey("POST", "/global-lines/sync-project"), async ({ request, response, paths }) => {
      await handleSyncGlobalLineProject(request, response, paths);
    }],
    [routeKey("GET", "/color-config"), async ({ request, response, paths }) => {
      // filePath 实参即缓存键：必须传空间解析后的路径，且与 produce 读同一空间（传常量会跨空间回放载荷）
      await sendCachedJsonFile(request, response, paths.colorConfig, () => readColorConfig({ paths }));
    }],
    [routeKey("PUT", "/color-config"), async ({ request, response, paths }) => {
      await handleSaveColorConfig(request, response, paths);
    }],
    [routeKey("GET", "/measurement-config"), async ({ request, response, paths }) => {
      await sendCachedJsonFile(request, response, paths.measurementConfig, () => readMeasurementConfig({ paths }));
    }],
    [routeKey("PUT", "/measurement-config"), async ({ request, response, paths }) => {
      await handleSaveMeasurementConfig(request, response, paths);
    }],
    [routeKey("GET", "/device-library"), async ({ request, response, paths }) => {
      await sendCachedJsonFile(request, response, paths.deviceLibrary, () => readDeviceLibraryConfig({ paths }));
    }],
    [routeKey("PUT", "/device-library"), async ({ request, response, paths }) => {
      await handleSaveDeviceLibrary(request, response, paths);
    }],
    [routeKey("GET", "/symbol-export-schemes"), async ({ request, response, paths }) => {
      await sendCachedJsonFile(request, response, paths.symbolExportSchemes, () => readSymbolExportSchemes({ paths }));
    }],
    [routeKey("PUT", "/symbol-export-schemes"), async ({ request, response, paths }) => {
      await handleSaveSymbolExportSchemes(request, response, paths);
    }],
    [routeKey("POST", "/symbol-export"), async ({ request, response, paths }) => {
      await handleSymbolExport(request, response, paths);
    }],
    [routeKey("POST", "/symbol-export-standalone"), async ({ request, response, paths }) => {
      await handleStandaloneSymbolExport(request, response, paths);
    }],
    // ── MCP（/webgrp/mcp）：streamable HTTP 无状态端点 ──
    // GET / DELETE 回 405（带 Allow: POST）：无状态模式下没有会话可关，
    // 挂 SSE 长连接只会占住端口、让进程退不出来。POST 才是真正的 JSON-RPC 往返。
    [routeKey("GET", "/mcp"), async ({ response }) => {
      const { handleMcpMethodNotAllowed } = await import("./mcp/httpHandler.mjs");
      handleMcpMethodNotAllowed({ response });
    }],
    [routeKey("DELETE", "/mcp"), async ({ response }) => {
      const { handleMcpMethodNotAllowed } = await import("./mcp/httpHandler.mjs");
      handleMcpMethodNotAllowed({ response });
    }],
    [routeKey("POST", "/mcp"), async ({ request, response, paths, spaceId }) => {
      // 动态 import 避开循环依赖：mcp/httpHandler → mcp/mcpServer → mcp/tools
      // → apiV1*.mjs → server.mjs（静态 import 会成环）。
      const { handleMcpPost } = await import("./mcp/httpHandler.mjs");
      await handleMcpPost({ request, response, paths, spaceId, runtimeWs });
    }]
  ]);
  const dynAssetPattern = (sub) => new RegExp(`^${escapeRegExp(apiPath(sub))}/([^/]+)$`, "u");
  // 路径段来自 URL，畸形百分号转义（如 /image-folders/100%）会让 decodeURIComponent 抛 URIError，
  // 冒到最外层变成 500 —— 客户端拼错 URL 却拿到「服务端崩了」的错误码，误导排查方向。
  // 这里就地判掉：解码不了就回原样，交由下游按「查无此 id」回 404。
  const decodePathSegment = (segment) => {
    try {
      return decodeURIComponent(segment);
    } catch {
      return segment;
    }
  };
  const dynamicRouteHandlers = [
    {
      method: "PUT",
      pattern: dynAssetPattern("/image-folders"),
      handle: async ({ match, request, response, paths }) => {
        await handleRenameImageFolder(decodePathSegment(match[1]), request, response, paths);
      }
    },
    {
      method: "DELETE",
      pattern: dynAssetPattern("/image-folders"),
      handle: async ({ match, response, paths }) => {
        await handleDeleteImageFolder(decodePathSegment(match[1]), response, paths);
      }
    },
    {
      method: "GET",
      pattern: dynAssetPattern("/images"),
      handle: async ({ match, response, paths }) => {
        await handleDownload(match[1], response, paths);
      }
    },
    {
      method: "DELETE",
      pattern: dynAssetPattern("/images"),
      handle: async ({ match, response, paths }) => {
        await handleDeleteImageAsset(match[1], response, paths);
      }
    }
  ];

  // 运行时态 WS 桥接：客户端注册表 + /ws 升级 + fetch 拉取
  const { createRuntimeRegistry } = await import("./runtimeRegistry.mjs");
  const { attachRuntimeWebSocket } = await import("./runtimeWs.mjs");
  const { attachModelUpdateWebSocket } = await import("./modelUpdateWebSocket.mjs");
  const { createV1RuntimeRoutes } = await import("./apiV1Runtime.mjs");
  const { createV1RuntimeExportRoutes } = await import("./apiV1RuntimeExport.mjs");
  const { createV1ControlRoutes } = await import("./apiV1Control.mjs");
  const runtimeRegistry = createRuntimeRegistry();
  // runtimeWs 在 server 创建后挂载（attachRuntimeWebSocket 需要 server.on("upgrade")）
  let runtimeWs = null;
  let v1RuntimeRoutes = [];
  let v1ControlRoutes = [];

  const server = createServer(async (request, response) => {
    const runRequest = async () => {
    try {
      const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "127.0.0.1"}`);
      // 剥前端 base 前缀：/app/icon-library/x -> /icon-library/x（默认 / 时 no-op），下游路由按根路径匹配
      url.pathname = stripFrontendBase(url.pathname);
      if (request.method === "OPTIONS") {
        response.writeHead(204, accessControlHeaders);
        response.end();
        return;
      }
      // 空间解析：/exports/native/* 是本机端点，/spaces 是空间管理面，都与「某一空间的数据」
      // 无关，必须在解析前短路。否则一个已删除的空间名会连带打挂一次「另存为」；
      // 而 POST /webgrp/spaces?space=新空间 会带着正要创建的名字被判 unknown 拦成 400，
      // 删除空间后的管理调用则会静默落回 default 的身份。
      // /v1/receive 同理：进程内联调接收端（内存留最近 5 次、不落盘、不读 paths），
      // 数据本就是全局的，一个 typo 的空间标识不该把联调打挂 —— handler 也不接 ctx。
      const isSpaceAgnostic = url.pathname === apiPath("/exports/native/select-file")
        || url.pathname === apiPath("/exports/native/write-text")
        || url.pathname === apiPath("/exports/native/open-file")
        || url.pathname === apiPath("/platform/data-dir")
        || url.pathname === apiPath("/interface-customization")
        || url.pathname === apiPath("/spaces")
        || url.pathname === apiPath("/spaces/initialize")
        || url.pathname === apiPath("/v1/receive");
      let spaceCtx = {};
      const isApiRequest = url.pathname === apiPrefix || url.pathname.startsWith(`${apiPrefix}/`);
      if (!isSpaceAgnostic && isApiRequest) {
        const resolution = resolveSpaceFromRequest(request, url, spaceStore);
        if (resolution.unknown) {
          sendError(response, 400, `未知空间：${resolution.unknownValue ?? ""}`, "SPACE_UNKNOWN");
          return;
        }
        if (spaceStore.requiresInitialSpaceSetup()) {
          sendError(response, 409, "请先初始化默认空间。", "SPACE_NOT_INITIALIZED");
          return;
        }
        spaceCtx = { paths: spaceStore.resolvePaths(resolution.id), spaceId: resolution.id };
        if (resolution.source === "fallback") {
          // 无来源/来源已失效：回退首个空间并告知客户端，同时把选定空间写回 Cookie
          response.setHeader(SPACE_FALLBACK_HEADER, "1");
          response.setHeader("set-cookie",
            `${SPACE_COOKIE_NAME}=${encodeURIComponent(resolution.id)}; Path=/; Max-Age=31536000; SameSite=Lax`);
        }
      }
      const exactRouteHandler = exactRouteHandlers.get(`${request.method} ${url.pathname}`);
      if (exactRouteHandler) {
        await exactRouteHandler({ request, response, url, ...spaceCtx });
        return;
      }
      for (const route of dynamicRouteHandlers) {
        if (route.method !== request.method) {
          continue;
        }
        const match = route.pattern.exec(url.pathname);
        if (match) {
          await route.handle({ match, request, response, url, ...spaceCtx });
          return;
        }
      }
      // /webgrp/v1/* 第三方只读路由（动态加载避开循环依赖）
      if (url.pathname.startsWith(apiPrefix + "/v1/")) {
        const { v1SchemeRoutes } = await import("./apiV1Schemes.mjs");
        const { v1ModelExportRoutes } = await import("./apiV1ModelExport.mjs");
        const { v1BatchModelExportRoutes } = await import("./apiV1BatchModelExport.mjs");
        const { v1SpaceRoutes } = await import("./apiV1Spaces.mjs");
        const { v1LibraryRoutes } = await import("./apiV1Library.mjs");
        const { v1ReceiveRoutes } = await import("./apiV1Receive.mjs");
        const { createV1TopologyRoutes } = await import("./apiV1Topology.mjs");
        const v1TopologyRoutes = createV1TopologyRoutes(runtimeWs, (event) =>
          publishSavedModelChange(modelUpdateService, event)
        );
        const v1Routes = [...v1SchemeRoutes, ...v1ModelExportRoutes, ...v1BatchModelExportRoutes, ...v1SpaceRoutes, ...v1LibraryRoutes, ...v1ReceiveRoutes, ...v1TopologyRoutes, ...v1RuntimeRoutes, ...v1ControlRoutes];
        for (const route of v1Routes) {
          if (route.method !== request.method) {
            continue;
          }
          const match = route.pattern.exec(url.pathname);
          if (match) {
            await route.handle({ request, response, url, match, ...spaceCtx });
            return;
          }
        }
      }
      // icon-library 静态资源（public/icon-library/），仅 GET 且路径匹配时处理
      if (request.method === "GET" && url.pathname.startsWith("/icon-library/")) {
        const servedIconLibrary = await serveIconLibraryAsset(request, response, url);
        if (servedIconLibrary) {
          return;
        }
      }
      // 路由未命中：prod 模式尝试静态资源托管（dev 模式 staticRoot 为空，跳过返 404）
      const served = await serveStaticAsset(request, response, url, staticRoot);
      if (served) {
        return;
      }
      sendError(response, 404, "接口不存在。");
    } catch (error) {
      // 自带 statusCode 的错误按它报（如退休空间的 409），其余仍是 500
      const status = Number.isInteger(error?.statusCode) ? error.statusCode : 500;
      sendError(response, status, error instanceof Error ? error.message : "后端处理失败。");
    }
    };
    const rawPath = String(request.url ?? "/").split("?", 1)[0];
    const isDataRootMigration = request.method === "POST" && rawPath === apiPath("/platform/data-dir");
    await (isDataRootMigration
      ? dataRootGate.withExclusive(runRequest)
      : dataRootGate.withShared(runRequest));
  });
  // server 创建后挂载运行时态 WS 桥接（需 server.on("upgrade")）
  // 传 spaceStore：客户端上线时要按握手 Cookie 把空间归位到注册表（缺 Cookie → 首个空间）
  runtimeWs = attachRuntimeWebSocket(server, runtimeRegistry, () => spaceStore, {
    passThroughPaths: [apiPath("/v1/subscriptions/ws")]
  });
  modelUpdateWebSocket = attachModelUpdateWebSocket(server, {
    service: modelUpdateService,
    getSpaceStore: () => spaceStore
  });
  v1RuntimeRoutes = [...createV1RuntimeRoutes(runtimeWs), ...createV1RuntimeExportRoutes(runtimeWs)];
  v1ControlRoutes = createV1ControlRoutes(runtimeWs);

  return new Promise((resolveServer, rejectServer) => {
    const onServerError = (error) => rejectServer(error);
    server.once("error", onServerError);
    server.listen(port, host, async () => {
      server.removeListener("error", onServerError);
      try {
        if (instanceRegistry) {
          await instanceRegistry.register();
          // 真实服务启动后后台异步预热 Windows 另存为 STA 宿主进程，将首次点击另存为延迟从 ~5s 降至 <80ms
          void nativeExportSaveService.warmup?.();
          server.once("close", () => {
            nativeExportSaveService.dispose?.();
            void instanceRegistry.release();
          });
        } else {
          server.once("close", () => {
            nativeExportSaveService.dispose?.();
          });
        }
        resolveServer(server);
      } catch (error) {
        server.close(() => rejectServer(error));
      }
    });
  });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const port = backendPort;
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
  await createImageServer({ port, host, staticRoot: staticRootArg, trackInstance: true });
  console.log(`Image backend listening at http://${host}:${port}`);
}
