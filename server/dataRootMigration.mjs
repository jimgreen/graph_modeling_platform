import { createHash, randomUUID } from "node:crypto";
import { createReadStream } from "node:fs";
import {
  access,
  copyFile,
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  writeFile
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, dirname, join, relative, resolve, sep } from "node:path";
import AdmZip from "adm-zip";
import { atomicWriteFile } from "../shared/atomicWrite.mjs";

export class DataRootMigrationError extends Error {
  constructor(code, message, options = {}) {
    super(message, options);
    this.name = "DataRootMigrationError";
    this.code = code;
  }
}

const isInside = (candidate, parent) => candidate === parent || candidate.startsWith(parent + sep);

const missing = (error) => error?.code === "ENOENT";

async function ensureDirectory(path, code, message) {
  let info;
  try {
    info = await lstat(path);
  } catch (error) {
    if (missing(error)) throw new DataRootMigrationError(code, message);
    throw error;
  }
  if (!info.isDirectory()) {
    throw new DataRootMigrationError(code, message);
  }
}

async function hashFile(filePath) {
  const hash = createHash("sha256");
  await new Promise((resolvePromise, reject) => {
    const stream = createReadStream(filePath);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("end", resolvePromise);
    stream.on("error", reject);
  });
  return hash.digest("hex");
}

async function buildManifestInternal(root) {
  await ensureDirectory(root, "DATA_DIR_NOT_FOUND", `数据目录不存在或不是目录：${root}`);
  const entries = [];
  const visit = async (dir, parts) => {
    const names = await readdir(dir);
    for (const name of names) {
      const fullPath = join(dir, name);
      const relativePath = [...parts, name].join("/");
      const info = await lstat(fullPath);
      if (info.isSymbolicLink()) {
        throw new DataRootMigrationError("DATA_DIR_UNSUPPORTED_ENTRY", `数据目录包含不支持的符号链接：${relativePath}`);
      }
      if (info.isDirectory()) {
        entries.push({ relativePath, type: "directory", size: 0 });
        await visit(fullPath, [...parts, name]);
        continue;
      }
      if (!info.isFile()) {
        throw new DataRootMigrationError("DATA_DIR_UNSUPPORTED_ENTRY", `数据目录包含不支持的文件类型：${relativePath}`);
      }
      entries.push({
        relativePath,
        type: "file",
        size: info.size,
        sha256: await hashFile(fullPath)
      });
    }
  };
  await visit(root, []);
  return entries.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
}

export function manifestsEqual(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

async function copyDirectoryContents(source, target) {
  const names = await readdir(source);
  for (const name of names) {
    const sourcePath = join(source, name);
    const targetPath = join(target, name);
    const info = await lstat(sourcePath);
    if (info.isSymbolicLink()) {
      throw new DataRootMigrationError("DATA_DIR_UNSUPPORTED_ENTRY", `数据目录包含不支持的符号链接：${name}`);
    }
    if (info.isDirectory()) {
      await mkdir(targetPath, { recursive: true });
      await copyDirectoryContents(sourcePath, targetPath);
      continue;
    }
    if (!info.isFile()) {
      throw new DataRootMigrationError("DATA_DIR_UNSUPPORTED_ENTRY", `数据目录包含不支持的文件类型：${name}`);
    }
    await copyFile(sourcePath, targetPath);
  }
}

async function clearDirectory(root) {
  const names = await readdir(root);
  for (const name of names) {
    await rm(join(root, name), { recursive: true, force: true });
  }
}

function archiveName(sourceRoot) {
  const iso = new Date().toISOString();
  const stamp = `${iso.slice(0, 10).replace(/-/gu, "")}-${iso.slice(11, 19).replace(/:/gu, "")}`;
  const suffix = randomUUID().replace(/-/gu, "").slice(0, 12);
  const safeBase = basename(sourceRoot).replace(/[<>:"/\\|?*]/gu, "_") || "data";
  return `${safeBase}.archive-${stamp}-${suffix}.zip`;
}

async function createArchive(sourceRoot, archivePath) {
  const manifest = await buildManifestInternal(sourceRoot);
  const zip = new AdmZip();
  for (const entry of manifest) {
    const fullPath = join(sourceRoot, ...entry.relativePath.split("/"));
    if (entry.type === "directory") {
      zip.addFile(`${entry.relativePath}/`, Buffer.alloc(0));
    } else {
      zip.addFile(entry.relativePath, await readFile(fullPath));
    }
  }
  await writeFile(archivePath, zip.toBuffer());
  return manifest;
}

async function verifyArchive(archivePath, expectedManifest) {
  const tempRoot = await mkdtemp(join(tmpdir(), "gmp-data-archive-check-"));
  try {
    new AdmZip(archivePath).extractAllTo(tempRoot, true);
    const actual = await buildManifestInternal(tempRoot);
    if (!manifestsEqual(expectedManifest, actual)) {
      throw new DataRootMigrationError("DATA_DIR_ARCHIVE_INVALID", "旧数据目录压缩包完整性校验失败。 ");
    }
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
}

async function readConfigState(configPath, exampleConfigPath) {
  let originalText = null;
  let parsed;
  try {
    originalText = await readFile(configPath, "utf8");
    parsed = JSON.parse(originalText);
  } catch (error) {
    if (!missing(error)) {
      throw new DataRootMigrationError("DATA_DIR_CONFIG_READ_FAILED", `读取 platform.config.json 失败：${error.message}`);
    }
    try {
      parsed = JSON.parse(await readFile(exampleConfigPath, "utf8"));
    } catch (exampleError) {
      throw new DataRootMigrationError("DATA_DIR_CONFIG_READ_FAILED", `读取 platform.config.json.example 失败：${exampleError.message}`);
    }
  }
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new DataRootMigrationError("DATA_DIR_CONFIG_INVALID", "platform.config.json 必须是 JSON 对象。 ");
  }
  return { originalText, config: parsed };
}

async function restoreConfig(configPath, originalText) {
  if (originalText === null) {
    await rm(configPath, { force: true });
    return;
  }
  await atomicWriteFile(configPath, originalText, "utf8");
}

async function restoreFromArchive(archivePath, targetRoot) {
  const tempRoot = await mkdtemp(join(tmpdir(), "gmp-data-restore-"));
  try {
    new AdmZip(archivePath).extractAllTo(tempRoot, true);
    await mkdir(targetRoot, { recursive: true });
    await copyDirectoryContents(tempRoot, targetRoot);
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
}

export function createDataRootMigration({
  currentRoot,
  targetRoot,
  configPath,
  exampleConfigPath,
  archiveParent = dirname(currentRoot),
  hooks = {}
}) {
  const sourceRoot = resolve(currentRoot);
  const destinationRoot = resolve(targetRoot);
  const resolvedConfigPath = resolve(configPath);
  const resolvedExampleConfigPath = resolve(exampleConfigPath);
  const resolvedArchiveParent = resolve(archiveParent);

  async function validateTargetDirectory() {
    await ensureDirectory(sourceRoot, "DATA_DIR_NOT_FOUND", `当前数据目录不存在或不是目录：${sourceRoot}`);
    await ensureDirectory(destinationRoot, "DATA_DIR_NOT_FOUND", `目标数据目录不存在或不是目录：${destinationRoot}`);
    let sourceReal;
    let destinationReal;
    try {
      sourceReal = await import("node:fs/promises").then(({ realpath }) => realpath(sourceRoot));
      destinationReal = await import("node:fs/promises").then(({ realpath }) => realpath(destinationRoot));
    } catch (error) {
      throw new DataRootMigrationError("DATA_DIR_PATH_INVALID", `解析数据目录路径失败：${error.message}`);
    }
    if (isInside(sourceReal, destinationReal) || isInside(destinationReal, sourceReal)) {
      throw new DataRootMigrationError("DATA_DIR_PATH_INVALID", "新旧数据目录不能相同，也不能互相嵌套。 ");
    }
    const entries = await readdir(destinationRoot);
    if (entries.length > 0) {
      throw new DataRootMigrationError("DATA_DIR_NOT_EMPTY", "新数据目录必须为空。 ");
    }
    if (isInside(resolvedArchiveParent, sourceReal) || isInside(resolvedArchiveParent, destinationReal)) {
      throw new DataRootMigrationError("DATA_DIR_PATH_INVALID", "归档目录不能位于新旧数据目录内部。 ");
    }
    return { sourceRoot: sourceReal, destinationRoot: destinationReal };
  }

  async function buildManifest(root) {
    return buildManifestInternal(resolve(root));
  }

  async function run() {
    await validateTargetDirectory();
    const sourceManifest = await buildManifestInternal(sourceRoot);
    const { originalText, config } = await readConfigState(resolvedConfigPath, resolvedExampleConfigPath);
    const nextConfig = { ...config, dataDir: destinationRoot };
    const nextConfigText = `${JSON.stringify(nextConfig, null, 2)}\n`;
    const archivePath = join(resolvedArchiveParent, archiveName(sourceRoot));
    let sourceRemoved = false;
    let configStageStarted = false;
    let configWritten = false;
    try {
      await copyDirectoryContents(sourceRoot, destinationRoot);
      const destinationManifest = await buildManifestInternal(destinationRoot);
      if (!manifestsEqual(sourceManifest, destinationManifest)) {
        throw new DataRootMigrationError("DATA_DIR_COPY_INVALID", "数据目录复制完整性校验失败。 ");
      }
      await createArchive(sourceRoot, archivePath);
      await verifyArchive(archivePath, sourceManifest);
      await hooks.afterArchive?.({ archivePath, sourceRoot, destinationRoot });
      await rm(sourceRoot, { recursive: true, force: false });
      sourceRemoved = true;
      try {
        await access(sourceRoot);
        throw new DataRootMigrationError("DATA_DIR_REMOVE_FAILED", "旧数据目录删除后仍然存在。 ");
      } catch (error) {
        if (error?.code !== "ENOENT") throw error;
      }
      await hooks.beforeConfigWrite?.({ archivePath, sourceRoot, destinationRoot });
      configStageStarted = true;
      await atomicWriteFile(resolvedConfigPath, nextConfigText, "utf8");
      configWritten = true;
      await hooks.afterConfigWrite?.({ archivePath, sourceRoot, destinationRoot });
      return {
        dataRoot: destinationRoot,
        archivePath,
        configBytes: Buffer.from(nextConfigText, "utf8"),
        migrated: true
      };
    } catch (error) {
      const rollbackErrors = [];
      try {
        if (sourceRemoved) {
          await mkdir(sourceRoot, { recursive: true });
          await restoreFromArchive(archivePath, sourceRoot);
          const restored = await buildManifestInternal(sourceRoot);
          if (!manifestsEqual(sourceManifest, restored)) {
            throw new Error("旧数据目录恢复后的完整性校验失败。");
          }
        }
      } catch (rollbackError) {
        rollbackErrors.push(`恢复旧数据目录失败：${rollbackError.message}`);
      }
      try {
        await clearDirectory(destinationRoot);
      } catch (rollbackError) {
        rollbackErrors.push(`清理新数据目录失败：${rollbackError.message}`);
      }
      if (configStageStarted || configWritten) {
        try {
          await restoreConfig(resolvedConfigPath, originalText);
        } catch (rollbackError) {
          rollbackErrors.push(`恢复 platform.config.json 失败：${rollbackError.message}`);
        }
      }
      try {
        await rm(archivePath, { force: true });
      } catch (rollbackError) {
        rollbackErrors.push(`清理临时归档失败：${rollbackError.message}`);
      }
      const baseMessage = error instanceof Error ? error.message : String(error);
      const suffix = rollbackErrors.length > 0 ? ` 回滚失败：${rollbackErrors.join("；")}` : "";
      throw new DataRootMigrationError("DATA_DIR_MIGRATION_FAILED", `数据目录迁移失败：${baseMessage}${suffix}`, { cause: error });
    }
  }

  return { validateTargetDirectory, buildManifest, run };
}
