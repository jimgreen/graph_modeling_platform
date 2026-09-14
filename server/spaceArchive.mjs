// 空间 ZIP 构建：把某一空间的文件**原样**打包（备份 / 搬迁语义）。
// 与方案 ZIP 的关键差别：这里**不生成** .e/.svg 派生格式 —— 要的是往返一致，不是交付件。
// 本模块只做「空间目录 → ZIP 字节」，不 import 渲染适配层，保持可单测。
import { readFile, readdir, stat } from "node:fs/promises";
import { join, relative, sep } from "node:path";
import AdmZip from "adm-zip";

export const SPACE_ARCHIVE_FORMAT_VERSION = 1;
export const SPACE_ARCHIVE_META_FILENAME = "space.json";

// 打包范围**只认 spacePathsFor 枚举出的这几个子目录**，绝不按空间根递归：
// default 空间的根就是数据根（spaceStore.mjs 的 assertInSpace 特判），
// 按根递归会把 spaces.json 与其它所有空间（workspaces/**）一起打进包。
// 目录名从 paths 现算、不另抄一份清单：将来 spacePathsFor 增删/改名一个平行子目录时这里自动跟随；
// 抄清单则会在那时**静默**少打包一个目录，而 ZIP 照样成功返回（残缺包）。
const archivedSubdirs = (paths) => [paths.schemes, paths.settings, paths.deviceLibraryDir, paths.images, paths.icons]
  .map((dir) => ({ dir, relativeDir: relative(paths.root, dir) }));
// 回收站里是用户已删的东西，不进备份
const TRASH_RELATIVE_PATH = "schemes/trash";

/** 只把「路径不存在」当作「跳过」；EACCES/EPERM 等 IO 失败必须上抛，否则会静默产出残缺包。 */
export function isMissingPathError(error) {
  return error?.code === "ENOENT";
}

/**
 * 列出该空间要打包的文件。
 * 目录读失败**即上抛**（照 listModelJsonFiles 的既定口径）：静默跳过会让该子树凭空消失，
 * 而 ZIP 仍成功返回，产出残缺包。子目录**不存在**则跳过（新空间可能没有 icons/）。
 */
export async function listSpaceFiles(paths) {
  const found = [];
  const visit = async (dir, dirParts) => {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const relativeParts = [...dirParts, entry.name];
      if (relativeParts.join("/") === TRASH_RELATIVE_PATH) {
        continue;
      }
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        await visit(full, relativeParts);
        continue;
      }
      if (entry.isFile()) {
        found.push({ filePath: full, relativePath: relativeParts.join("/") });
      }
    }
  };
  for (const { dir, relativeDir } of archivedSubdirs(paths)) {
    const info = await stat(dir).catch((error) => {
      if (isMissingPathError(error)) return null;
      throw error;
    });
    if (info?.isDirectory()) {
      await visit(dir, relativeDir.split(sep));
    }
  }
  return found;
}

/**
 * 构建空间 ZIP。
 * `spaceName`（原始名）写进 meta.name；`archiveRootName`（**调用方已净化**）作包内顶层目录名与文件名。
 * 两者必须分开：空间名是自由文本，含 `/` 时不可能整体当单段目录名，而 meta 里的名字要能原样往返
 * （导入端直接把它当展示名用）。本模块不做净化 —— 谁掌握「这个名字将变成路径」谁负责净化。
 * archiveRootName 缺省等于 spaceName，故只传 spaceName 的调用方行为不变。
 */
export async function buildSpaceArchiveBuffer({
  paths,
  spaceName,
  archiveRootName = spaceName,
  exportedAt = new Date().toISOString()
}) {
  const files = await listSpaceFiles(paths);
  const zip = new AdmZip();
  const meta = {
    formatVersion: SPACE_ARCHIVE_FORMAT_VERSION,
    name: spaceName,
    exportedAt
  };
  zip.addFile(
    `${archiveRootName}/${SPACE_ARCHIVE_META_FILENAME}`,
    Buffer.from(JSON.stringify(meta, null, 2), "utf-8")
  );
  for (const file of files) {
    zip.addFile(`${archiveRootName}/${file.relativePath}`, await readFile(file.filePath));
  }
  return { buffer: zip.toBuffer(), filename: `${archiveRootName}.zip`, spaceName };
}

/**
 * 从包里读空间名。只认「顶层目录下的 space.json」（恰好两段），
 * 免得把某个嵌套子目录里同名的文件误当元信息。读不出 / 解析失败 → 回退 fallbackName。
 */
export function readSpaceArchiveName(zip, fallbackName) {
  const entry = zip.getEntries().find((item) => {
    if (item.isDirectory) {
      return false;
    }
    const parts = String(item.entryName ?? "").replace(/\\/gu, "/").split("/").filter(Boolean);
    return parts.length === 2 && parts[1] === SPACE_ARCHIVE_META_FILENAME;
  });
  if (!entry) {
    return fallbackName;
  }
  try {
    const parsed = JSON.parse(entry.getData().toString("utf-8"));
    const name = typeof parsed?.name === "string" ? parsed.name.trim() : "";
    return name || fallbackName;
  } catch {
    return fallbackName;
  }
}
