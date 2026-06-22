// /api/v1 方案域 handler：schemes、hierarchy、models、export、model json/svg。
// 复用 image-server.mjs 纯函数。v1 信封包装。

import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  readSchemes,
  createSchemeArchiveBuffer,
  readSchemeProjectRecord,
  buildSvgFile,
  readMeasurementConfig
} from "./image-server.mjs";
import { sendV1Json, sendV1Error } from "./v1Response.mjs";
import { parseSchemePathParam, requireSchemePath } from "./schemePath.mjs";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const schemeDataDir = resolve(__dirname, "..", "data", "schemes");
const filesRoot = join(schemeDataDir, "files");

// 方案树轻量化：剥离 project 完整数据，仅留摘要（name/updatedAt/children）
function schemeTreeSummary(schemes) {
  return schemes.map((scheme) => ({
    name: scheme.name,
    updatedAt: scheme.updatedAt,
    projects: (scheme.projects ?? []).map((p) => ({ name: p.name, updatedAt: p.updatedAt })),
    children: schemeTreeSummary(scheme.children ?? [])
  }));
}

// 纯层级树（不含 projects）
function schemeHierarchy(schemes) {
  return schemes.map((scheme) => ({
    name: scheme.name,
    updatedAt: scheme.updatedAt,
    children: schemeHierarchy(scheme.children ?? [])
  }));
}

// 在方案树中按 schemePath 查找方案节点
function findSchemeByPath(schemes, parts) {
  let current = schemes;
  let found = null;
  for (const part of parts) {
    found = current.find((s) => s.name === part);
    if (!found) {
      return null;
    }
    current = found.children ?? [];
  }
  return found;
}

// /api/v1/schemes —— 方案列表（树形，含模型摘要）
// query: includeProjects=1 时含完整 project 数据（大）
export async function handleV1Schemes({ url, request, response }) {
  try {
    const includeProjects = url.searchParams.get("includeProjects") === "1";
    const schemes = await readSchemes({ includeProjects });
    await sendV1Json(request, response, { schemes: includeProjects ? schemes : schemeTreeSummary(schemes) });
  } catch (error) {
    sendV1Error(response, "internal", error instanceof Error ? error.message : "后端处理失败。");
  }
}

// /api/v1/schemes/hierarchy —— 纯层级树
export async function handleV1SchemesHierarchy({ request, response }) {
  try {
    const schemes = await readSchemes({ includeProjects: false });
    await sendV1Json(request, response, { nodes: schemeHierarchy(schemes) });
  } catch (error) {
    sendV1Error(response, "internal", error instanceof Error ? error.message : "后端处理失败。");
  }
}

// /api/v1/schemes/models —— 指定方案下模型列表
// query: schemePath=<encoded>
export async function handleV1SchemeModels({ url, request, response }) {
  try {
    const parts = parseSchemePathParam(url.searchParams.get("schemePath"));
    if (!requireSchemePath(parts)) {
      sendV1Error(response, "bad-request", "缺少或非法 schemePath。");
      return;
    }
    const schemes = await readSchemes({ includeProjects: false });
    const scheme = findSchemeByPath(schemes, parts);
    if (!scheme) {
      sendV1Error(response, "not-found", "方案不存在。");
      return;
    }
    await sendV1Json(request, response, { models: (scheme.projects ?? []).map((p) => ({ name: p.name, updatedAt: p.updatedAt })) });
  } catch (error) {
    sendV1Error(response, "internal", error instanceof Error ? error.message : "后端处理失败。");
  }
}

// /api/v1/schemes/export —— 方案导出 ZIP
// query: schemePath=<encoded>
export async function handleV1SchemeExport({ url, response }) {
  const parts = parseSchemePathParam(url.searchParams.get("schemePath"));
  if (!requireSchemePath(parts)) {
    sendV1Error(response, "bad-request", "缺少或非法 schemePath。");
    return;
  }
  try {
    const { buffer, filename } = await createSchemeArchiveBuffer({ filesRoot, schemePath: parts });
    response.writeHead(200, {
      "content-type": "application/zip",
      "content-length": String(buffer.length),
      "content-disposition": `attachment; filename="${encodeURIComponent(filename)}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
      "cache-control": "no-store",
      "access-control-allow-origin": "*"
    });
    response.end(buffer);
  } catch (error) {
    const message = error instanceof Error ? error.message : "导出方案失败。";
    if (message.includes("缺少方案路径")) {
      sendV1Error(response, "bad-request", message);
      return;
    }
    sendV1Error(response, "not-found", "方案目录不存在。");
  }
}

// /api/v1/schemes/model/json —— 模型 project JSON
// query: schemePath=<encoded>, name=<模型名>
export async function handleV1ModelJson({ url, request, response }) {
  try {
    const parts = parseSchemePathParam(url.searchParams.get("schemePath"));
    const name = (url.searchParams.get("name") ?? "").trim();
    if (!requireSchemePath(parts)) {
      sendV1Error(response, "bad-request", "缺少或非法 schemePath。");
      return;
    }
    if (!name) {
      sendV1Error(response, "bad-request", "缺少模型名称。");
      return;
    }
    const record = await readSchemeProjectRecord({ schemePath: parts, name });
    if (!record) {
      sendV1Error(response, "not-found", "模型不存在。");
      return;
    }
    await sendV1Json(request, response, { project: record.project });
  } catch (error) {
    sendV1Error(response, "internal", error instanceof Error ? error.message : "后端处理失败。");
  }
}

// /api/v1/schemes/model/svg —— 模型 SVG
// query: schemePath=<encoded>, name=<模型名>
export async function handleV1ModelSvg({ url, response }) {
  const parts = parseSchemePathParam(url.searchParams.get("schemePath"));
  const name = (url.searchParams.get("name") ?? "").trim();
  if (!requireSchemePath(parts)) {
    sendV1Error(response, "bad-request", "缺少或非法 schemePath。");
    return;
  }
  if (!name) {
    sendV1Error(response, "bad-request", "缺少模型名称。");
    return;
  }
  const record = await readSchemeProjectRecord({ schemePath: parts, name });
  if (!record) {
    sendV1Error(response, "not-found", "模型不存在。");
    return;
  }
  const measurementConfig = await readMeasurementConfig();
  const svg = buildSvgFile(record.project, measurementConfig, { imagePathById: {} });
  response.writeHead(200, {
    "content-type": "image/svg+xml; charset=utf-8",
    "cache-control": "no-cache",
    "access-control-allow-origin": "*"
  });
  response.end(svg);
}

// v1 方案域路由表：{ method, pattern, handle }
export const v1SchemeRoutes = [
  { method: "GET", pattern: /^\/api\/v1\/schemes\/?$/u, handle: handleV1Schemes },
  { method: "GET", pattern: /^\/api\/v1\/schemes\/hierarchy\/?$/u, handle: handleV1SchemesHierarchy },
  { method: "GET", pattern: /^\/api\/v1\/schemes\/models\/?$/u, handle: handleV1SchemeModels },
  { method: "GET", pattern: /^\/api\/v1\/schemes\/export\/?$/u, handle: handleV1SchemeExport },
  { method: "GET", pattern: /^\/api\/v1\/schemes\/model\/json\/?$/u, handle: handleV1ModelJson },
  { method: "GET", pattern: /^\/api\/v1\/schemes\/model\/svg\/?$/u, handle: handleV1ModelSvg }
];
