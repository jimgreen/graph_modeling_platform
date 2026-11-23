import { renderSavedModelSvg } from "./svgExport.mjs";
import { buildCimForSavedModel } from "./cimExport.mjs";
import { buildEFilesForSavedModels, eFileTemplateAllowsModelType } from "./eFileExport.mjs";
import { readPredefinedTemplateBase64 } from "./eFileTemplates.mjs";
import { encodeTextBytes, withXmlEncodingDeclaration } from "./xmlEncoding.mjs";
import { decodeAuto } from "../src/encoding/gbk.ts";

export const DEFAULT_MAX_BATCH_EXPORT_OUTPUT_BYTES = 256 * 1024 * 1024;

function safeFilePart(value) {
  return String(value ?? "").trim().replace(/[\\/:*?"<>|]+/gu, "_") || "未命名";
}

function modelKey(model) {
  return [
    String(model?.id ?? ""),
    String(model?.modelType ?? model?.project?.modelType ?? ""),
    ...(Array.isArray(model?.schemePath) ? model.schemePath : []),
    String(model?.name ?? "")
  ].join("\u0000");
}

function throwGeneratorError(result) {
  if (!result?.error) return;
  const error = new Error(String(result.error.message ?? "导出失败。"));
  error.code = result.error.code;
  throw error;
}

function artifactFromText({ format, encoding, mimeType, filename, text, outputBudget }) {
  const bytes = encodeTextBytes(text, encoding);
  outputBudget?.add(bytes.length);
  return {
    format,
    encoding,
    mimeType,
    filename,
    contentBase64: bytes.toString("base64")
  };
}

function createOutputBudget(maxOutputBytes) {
  const limit = Number.isSafeInteger(maxOutputBytes) && maxOutputBytes > 0
    ? maxOutputBytes
    : DEFAULT_MAX_BATCH_EXPORT_OUTPUT_BYTES;
  let total = 0;
  return {
    add(bytes) {
      total += bytes;
      if (total > limit) {
        throw Object.assign(
          new Error(`批量导出产物超过 ${limit} 字节上限。`),
          { code: "payload-too-large" }
        );
      }
    }
  };
}

async function readTemplateText(templateName) {
  if (!templateName) return "";
  const base64 = await readPredefinedTemplateBase64(templateName);
  return decodeAuto(Buffer.from(base64, "base64"));
}

function addEWarnings(warnings, model, file) {
  for (const warning of file?.warnings ?? []) {
    warnings.push({
      code: "e-export-warning",
      modelId: model.id,
      modelName: model.name,
      message: String(warning?.reason ?? warning?.message ?? "E 文件存在未导出内容。"),
      detail: warning
    });
  }
}

async function buildEArtifacts({ models, formats, encoding, templateName, paths, globalLineRecords, mergeE, warnings, outputBudget }) {
  if (!formats.includes("e")) {
    return { perModel: new Map(), mergedE: [] };
  }

  const templateText = await readTemplateText(templateName);
  const eligibleModels = [];
  for (const model of models) {
    const modelType = String(model?.modelType ?? model?.project?.modelType ?? "");
    if (templateName && !eFileTemplateAllowsModelType(templateName, modelType)) {
      warnings.push({
        code: "e-template-model-type-skipped",
        modelId: model.id,
        modelName: model.name,
        modelType,
        template: templateName,
        message: `模型“${model.name}”类型“${modelType}”不匹配模板“${templateName}”，已跳过 E 文件。`
      });
      continue;
    }
    eligibleModels.push(model);
  }

  if (eligibleModels.length === 0) {
    return { perModel: new Map(), mergedE: [] };
  }

  if (!mergeE) {
    const result = await buildEFilesForSavedModels({
      models: eligibleModels,
      templateName,
      templateText,
      paths,
      globalLineRecords
    });
    if (result?.error) throwGeneratorError(result);
    const perModel = new Map();
    for (const item of result?.files ?? []) {
      const model = eligibleModels.find((candidate) => modelKey(candidate) === modelKey(item));
      if (!model) continue;
      const file = item.file;
      if (!file) {
        throw new Error(`模型“${model.name}”E 文件生成失败：未找到生成结果。`);
      }
      addEWarnings(warnings, model, file);
      perModel.set(modelKey(model), artifactFromText({
        format: "e",
        encoding,
        mimeType: String(file.mime ?? "text/plain"),
        filename: String(file.filename ?? `${safeFilePart(model.name)}.e`),
        text: String(file.text ?? ""),
        outputBudget
      }));
    }
    if (perModel.size !== eligibleModels.length) {
      throw new Error("E 文件生成结果不完整。", { cause: result });
    }
    return { perModel, mergedE: [] };
  }

  const groups = new Map();
  for (const model of eligibleModels) {
    const modelType = String(model?.modelType ?? model?.project?.modelType ?? "");
    const group = groups.get(modelType) ?? [];
    group.push(model);
    groups.set(modelType, group);
  }
  const mergedE = [];
  for (const [modelType, group] of [...groups].sort(([left], [right]) => left.localeCompare(right, "zh-CN"))) {
    const result = await buildEFilesForSavedModels({
      models: group,
      templateName,
      templateText,
      paths,
      globalLineRecords
    });
    if (result?.error) throwGeneratorError(result);
    const merged = result?.merged;
    if (!merged) {
      throw new Error(`模型类型“${modelType}”合并 E 文件生成失败：未找到生成结果。`);
    }
    mergedE.push({
      ...artifactFromText({
        format: "e",
        encoding,
        mimeType: String(merged.mime ?? "text/plain"),
        filename: String(merged.filename ?? `${safeFilePart(modelType)}.e`),
        text: String(merged.text ?? ""),
        outputBudget
      }),
      modelType,
      modelIds: group.map((model) => model.id),
      ...(templateName ? { template: templateName } : {})
    });
    for (const model of group) addEWarnings(warnings, model, merged);
  }
  return { perModel: new Map(), mergedE };
}

export async function buildBatchModelArtifacts({
  models,
  formats,
  encoding = "utf-8",
  templateName = "",
  colorMode = "energy",
  strict = false,
  mergeE = false,
  paths,
  globalLineRecords = [],
  maxOutputBytes = DEFAULT_MAX_BATCH_EXPORT_OUTPUT_BYTES
}) {
  const warnings = [];
  const outputBudget = createOutputBudget(maxOutputBytes);
  const eResult = await buildEArtifacts({
    models,
    formats,
    encoding,
    templateName,
    paths,
    globalLineRecords,
    mergeE,
    warnings,
    outputBudget
  });

  const modelArtifacts = [];
  for (const model of models) {
    const artifacts = [];
    const filePart = safeFilePart(model.name);
    for (const format of formats) {
      if (format === "json") {
        artifacts.push(artifactFromText({
          format,
          encoding,
          mimeType: "application/json",
          filename: `${filePart}.json`,
          text: JSON.stringify(model.project),
          outputBudget
        }));
        continue;
      }

      if (format === "svg") {
        const result = await renderSavedModelSvg({
          parts: model.schemePath,
          name: model.name,
          colorMode,
          paths
        });
        throwGeneratorError(result);
        artifacts.push(artifactFromText({
          format,
          encoding,
          mimeType: "image/svg+xml",
          filename: `${filePart}.svg`,
          text: withXmlEncodingDeclaration(result.svg, encoding),
          outputBudget
        }));
        continue;
      }

      if (format === "cim") {
        const result = await buildCimForSavedModel({
          parts: model.schemePath,
          schemeId: model.schemeId,
          name: model.name,
          modelId: model.id,
          strict,
          paths
        });
        throwGeneratorError(result);
        artifacts.push(artifactFromText({
          format,
          encoding,
          mimeType: "application/xml",
          filename: String(result.filename ?? `${filePart}.xml`),
          text: withXmlEncodingDeclaration(result.xml, encoding),
          outputBudget
        }));
        continue;
      }

      if (format === "e" && !mergeE) {
        const artifact = eResult.perModel.get(modelKey(model));
        if (artifact) artifacts.push(artifact);
      }
    }
    modelArtifacts.push(artifacts);
  }

  return { modelArtifacts, mergedE: eResult.mergedE, warnings };
}
