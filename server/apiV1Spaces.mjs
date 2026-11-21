// /webgrp/v1 空间派生导出 handler。
// 原样空间备份仍由 /webgrp/spaces/export 提供；这里只生成 E/SVG 派生文件。
import { apiPattern } from "./config.mjs";
import { accessControlOriginOnly } from "./cors.mjs";
import { contentDispositionAttachment } from "./contentDisposition.mjs";
import { PREDEFINED_E_DEVICE_TEMPLATES } from "./eFileTemplates.mjs";
import { sendV1Error } from "./v1Response.mjs";
import { withSpacePaths } from "./spaceStore.mjs";
import { buildSpaceArtifactArchive } from "./spaceArtifactExport.mjs";

export async function handleV1SpaceArtifactExport({ url, response, paths }) {
  const eMode = (url.searchParams.get("eMode") ?? "").trim() || "per-model";
  if (eMode !== "per-model" && eMode !== "merged") {
    sendV1Error(response, "bad-request", "eMode 仅支持 per-model 或 merged。");
    return;
  }
  const templateName = (url.searchParams.get("template") ?? "").trim();
  if (templateName && !Object.hasOwn(PREDEFINED_E_DEVICE_TEMPLATES, templateName)) {
    sendV1Error(
      response,
      "bad-request",
      `未知模板：${templateName}。可用模板：${Object.keys(PREDEFINED_E_DEVICE_TEMPLATES).join("、")}`
    );
    return;
  }
  try {
    const { buffer, filename } = await buildSpaceArtifactArchive({ paths, eMode, templateName });
    response.writeHead(200, {
      "content-type": "application/zip",
      "content-length": String(buffer.length),
      "content-disposition": contentDispositionAttachment(filename),
      "cache-control": "no-store",
      ...accessControlOriginOnly
    });
    response.end(buffer);
  } catch (error) {
    sendV1Error(
      response,
      typeof error?.code === "string" ? error.code : "internal",
      error instanceof Error ? error.message : "导出空间 E/SVG 失败。"
    );
  }
}

export const v1SpaceRoutes = [
  {
    method: "GET",
    pattern: apiPattern("/v1/spaces/export-artifacts", "/?$"),
    handle: withSpacePaths(handleV1SpaceArtifactExport)
  }
];
