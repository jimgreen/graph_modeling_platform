// 方案 ZIP 构建：枚举模型 .json → 调注入的生成器产出 .e/.svg → 打包。
// 派生格式不落盘，故打包时逐模型实时生成（口径与 /v1/schemes/model/{svg,e-file} 端点一致）。
// 本模块只做「目录 → ZIP 字节」，不 import 任何渲染适配层，保持可单测。
import { readFile, readdir, stat } from "node:fs/promises";
import { join, relative } from "node:path";
import AdmZip from "adm-zip";

/** 是模型文件判据，与 maxStoredProjectIndex / scanProjectByIndex 的扫描口径一致 */
function isModelJsonFile(fileName) {
  return /\.json$/iu.test(fileName) && fileName.toLocaleLowerCase() !== "scheme.json";
}

/** 递归列出方案目录下的模型 json（含子方案目录） */
export async function listModelJsonFiles(rootDir) {
  const found = [];
  const visit = async (dir, dirParts) => {
    let entries;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        await visit(full, [...dirParts, entry.name]);
        continue;
      }
      if (!entry.isFile() || !isModelJsonFile(entry.name)) {
        continue;
      }
      found.push({
        filePath: full,
        relativePath: relative(rootDir, full),
        dirParts,
        modelName: entry.name.replace(/\.json$/iu, "")
      });
    }
  };
  await visit(rootDir, []);
  return found;
}

/**
 * 构建方案 ZIP：json 用磁盘原文，e/svg 由 renderArtifacts 实时生成。
 * 任一模型生成失败即抛出，不产出残缺压缩包。
 */
export async function buildSchemeArchiveBuffer({ schemeDir, schemeName, renderArtifacts }) {
  const schemeStat = await stat(schemeDir).catch(() => null);
  if (!schemeStat || !schemeStat.isDirectory()) {
    throw new Error("方案目录不存在。");
  }
  const models = await listModelJsonFiles(schemeDir);
  const zip = new AdmZip();
  for (const model of models) {
    const { eFileBytes, svg } = await renderArtifacts({
      dirParts: model.dirParts,
      modelName: model.modelName
    });
    const base = `${schemeName}/${model.relativePath.replace(/\.json$/iu, "")}`;
    zip.addFile(`${base}.json`, await readFile(model.filePath));
    zip.addFile(`${base}.e`, eFileBytes);
    zip.addFile(`${base}.svg`, Buffer.from(svg, "utf-8"));
  }
  return {
    buffer: zip.toBuffer(),
    filename: `${schemeName}.zip`,
    schemeName
  };
}
