// 空间派生导出：遍历空间内全部模型，实时生成 E/SVG 并打包为 ZIP。
// 与 spaceArchive.mjs 的原样备份语义分开；本模块不向 schemes/files 写入派生文件。
import { stat } from "node:fs/promises";
import { createZipBufferAsync } from "./asyncZip.mjs";
import iconv from "iconv-lite";
import { listModelJsonFiles } from "./schemeArchive.mjs";
import { readGlobalLineRecords, readSchemeProjectRecord } from "./server.mjs";
import { buildEFilesForSavedModels, eFileTemplateAllowsModelType } from "./eFileExport.mjs";
import { readPredefinedTemplateBase64 } from "./eFileTemplates.mjs";
import { renderSavedModelSvg } from "./svgExport.mjs";
import { withXmlEncodingDeclaration } from "./xmlEncoding.mjs";
import { decodeAuto } from "../src/encoding/gbk.ts";

function normalizedRelativePath(value) {
  return String(value ?? "").replace(/\\/gu, "/");
}

async function templateTextForName(templateName) {
  if (!templateName) {
    return "";
  }
  const base64 = await readPredefinedTemplateBase64(templateName);
  return decodeAuto(Buffer.from(base64, "base64"));
}

export const DEFAULT_MAX_BATCH_INPUT_BYTES = 512 * 1024 * 1024;

export async function listSpaceArtifactModels(
  paths,
  templateName = "",
  { maxInputBytes = undefined } = {}
) {
  let modelFiles;
  try {
    modelFiles = await listModelJsonFiles(paths.schemeFiles);
  } catch (error) {
    if (error?.code === "ENOENT") {
      return [];
    }
    throw error;
  }
  const models = [];
  let inputBytes = 0;
  for (const modelFile of modelFiles.sort((left, right) =>
    normalizedRelativePath(left.relativePath).localeCompare(normalizedRelativePath(right.relativePath), "zh-CN")
  )) {
    if (maxInputBytes !== undefined) {
      inputBytes += (await stat(modelFile.filePath)).size;
      if (inputBytes > maxInputBytes) {
        throw Object.assign(
          new Error(`批量导出输入模型超过 ${maxInputBytes} 字节上限。`),
          { code: "payload-too-large" }
        );
      }
    }
    const record = await readSchemeProjectRecord({
      schemePath: modelFile.dirParts,
      name: modelFile.modelName,
      paths
    });
    if (!record) {
      throw new Error(`模型不存在：${[...modelFile.dirParts, modelFile.modelName].join("/")}`);
    }
    if (!eFileTemplateAllowsModelType(templateName, record.project?.modelType)) {
      continue;
    }
    models.push({
      id: String(record.project?.idx ?? modelFile.relativePath),
      name: modelFile.modelName,
      schemePath: [...modelFile.dirParts],
      project: record.project,
      relativePath: normalizedRelativePath(modelFile.relativePath).replace(/\.json$/iu, "")
    });
  }
  return models;
}

export async function buildSpaceArtifactArchive({ paths, eMode = "per-model", templateName = "" }) {
  // 先让注册表完成必要的存量迁移，再读取模型；否则迁移写回的全局线路字段
  // 可能不在本次导出的 project 快照里。
  const globalLineRecords = await readGlobalLineRecords({ paths });
  const models = await listSpaceArtifactModels(paths, templateName);
  if (models.length === 0) {
    return {
      buffer: await createZipBufferAsync([]),
      filename: "space-artifacts.zip",
      modelCount: 0,
      eMode
    };
  }

  const templateText = await templateTextForName(templateName);
  const eResult = await buildEFilesForSavedModels({
    models,
    templateName,
    templateText,
    paths,
    globalLineRecords
  });
  if (eResult.error) {
    const error = new Error(eResult.error.message);
    error.code = eResult.error.code;
    throw error;
  }
  const eFileByRelativePath = new Map(
    eResult.files.map((item) => [item.relativePath, item.file])
  );

  const entries = [];
  if (eMode === "merged") {
    entries.push({
      path: "space.e",
      bytes: iconv.encode(String(eResult.merged?.text ?? ""), "gbk")
    });
  }

  for (const model of models) {
    const svgResult = await renderSavedModelSvg({
      parts: model.schemePath,
      name: model.name,
      colorMode: "voltage",
      paths
    });
    if (svgResult.error) {
      throw new Error(`模型“${model.name}”SVG 生成失败：${svgResult.error.message}`);
    }
    const basePath = model.relativePath;
    entries.push({
      path: `${basePath}.svg`,
      bytes: Buffer.from(withXmlEncodingDeclaration(svgResult.svg, "utf-8"), "utf-8")
    });
    if (eMode === "per-model") {
      const file = eFileByRelativePath.get(model.relativePath);
      if (!file) {
        throw new Error(`模型“${model.name}”E 文件生成失败：未找到生成结果。`);
      }
      entries.push({
        path: `${basePath}.e`,
        bytes: iconv.encode(String(file.text ?? ""), "gbk")
      });
    }
  }

  const sortedEntries = entries
    .sort((left, right) => left.path.localeCompare(right.path, "zh-CN"))
    .map((entry) => ({ name: entry.path, data: entry.bytes }));
  return {
    buffer: await createZipBufferAsync(sortedEntries),
    filename: "space-artifacts.zip",
    modelCount: models.length,
    eMode
  };
}
