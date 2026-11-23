import { apiPattern } from "./config.mjs";
import { sendV1Error, sendV1JsonNoStore } from "./v1Response.mjs";
import { withSpacePaths } from "./spaceStore.mjs";
import { readGlobalLineRecords } from "./server.mjs";
import {
  collectBatchModels,
  expandAssociatedModels,
  parseBatchModelExportQuery,
  stableBatchModelKey
} from "./batchModelSelection.mjs";
import { buildBatchModelArtifacts } from "./batchModelArtifacts.mjs";

function sendBatchExportError(response, error) {
  const code = ["bad-request", "not-found", "payload-too-large"].includes(error?.code)
    ? error.code
    : "internal";
  sendV1Error(response, code, error instanceof Error ? error.message : "批量模型导出失败。");
}

export async function handleV1BatchModelExport({ url, response, paths }) {
  const parsed = parseBatchModelExportQuery(url);
  if (parsed.error) {
    sendV1Error(response, parsed.error.code, parsed.error.message);
    return;
  }

  try {
    const collected = await collectBatchModels({ paths, query: parsed });
    const globalLineRecords = parsed.includeAssociatedModels
      ? await readGlobalLineRecords({ paths })
      : [];
    const expanded = expandAssociatedModels({
      selectedModels: collected.selectedModels,
      allModels: collected.allModels,
      globalLineRecords,
      includeAssociatedModels: parsed.includeAssociatedModels
    });
    const models = expanded.models;
    const artifacts = await buildBatchModelArtifacts({
      models,
      formats: parsed.formats,
      encoding: parsed.encoding,
      templateName: parsed.templateName,
      colorMode: parsed.colorMode,
      strict: parsed.strict,
      mergeE: parsed.mergeE,
      paths,
      globalLineRecords
    });
    if (!Array.isArray(artifacts.modelArtifacts) || artifacts.modelArtifacts.length !== models.length) {
      throw new Error("批量模型导出结果不完整。");
    }

    const selectedKeys = new Set(collected.selectedModels.map(stableBatchModelKey));
    const modelPayload = models.map((model, index) => ({
      modelId: model.id,
      ...(model.schemeId !== undefined ? { schemeId: model.schemeId } : {}),
      schemePath: model.schemePath,
      name: model.name,
      modelType: model.modelType,
      expandedByAssociation: !selectedKeys.has(stableBatchModelKey(model)),
      artifacts: artifacts.modelArtifacts[index]
    }));

    await sendV1JsonNoStore(response, {
      scope: parsed.scope,
      selectedBy: collected.selectedBy,
      includeDescendants: parsed.includeDescendants,
      includeAssociatedModels: parsed.includeAssociatedModels,
      selectedModelCount: collected.selectedModels.length,
      expandedModelCount: expanded.expandedModelKeys.length,
      modelCount: models.length,
      models: modelPayload,
      mergedE: artifacts.mergedE ?? [],
      warnings: [...(expanded.warnings ?? []), ...(artifacts.warnings ?? [])]
    });
  } catch (error) {
    sendBatchExportError(response, error);
  }
}

export const v1BatchModelExportRoutes = [
  {
    method: "GET",
    pattern: apiPattern("/v1/models/export", "/?$"),
    handle: withSpacePaths(handleV1BatchModelExport)
  }
];
