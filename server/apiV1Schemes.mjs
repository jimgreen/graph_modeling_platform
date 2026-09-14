// /webgrp/v1 方案域 handler：schemes、hierarchy、models、export、model json/svg。
// 复用 server.mjs 纯函数。v1 信封包装。

import {
  readSchemes,
  createSchemeArchiveBuffer,
  readSchemeProjectRecord
} from "./server.mjs";
import { sendV1Json, sendV1Error } from "./v1Response.mjs";
import { parseSchemePathParam, requireSchemePath } from "./schemePath.mjs";
import { handleV1ModelEFile, handleV1ModelEFilePost } from "./eFileExport.mjs";
import { handleV1ModelCimXml } from "./cimExport.mjs";
import { renderSavedModelSvg } from "./svgExport.mjs";
import { handleV1ModelSend } from "./sendModel.mjs";
import { encodeTextBytes, withXmlEncodingDeclaration } from "./xmlEncoding.mjs";

// 数据根不再由本模块自建：各 handler 收 ctx.paths（由 server.mjs 分发层按空间解析），
// 缺省时被调函数回落 defaultPaths。原此处曾自建一份数据根推导，是全仓唯一一处重复 —— 已删除。

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

// /webgrp/v1/schemes —— 方案列表（树形，含模型摘要）
// query: includeProjects=1 时含完整 project 数据（大）
export async function handleV1Schemes({ url, request, response, paths }) {
  try {
    const includeProjects = url.searchParams.get("includeProjects") === "1";
    const schemes = await readSchemes({ includeProjects, paths });
    await sendV1Json(request, response, { schemes: includeProjects ? schemes : schemeTreeSummary(schemes) });
  } catch (error) {
    sendV1Error(response, "internal", error instanceof Error ? error.message : "后端处理失败。");
  }
}

// /webgrp/v1/schemes/hierarchy —— 纯层级树
export async function handleV1SchemesHierarchy({ request, response, paths }) {
  try {
    const schemes = await readSchemes({ includeProjects: false, paths });
    await sendV1Json(request, response, { nodes: schemeHierarchy(schemes) });
  } catch (error) {
    sendV1Error(response, "internal", error instanceof Error ? error.message : "后端处理失败。");
  }
}

// /webgrp/v1/schemes/models —— 指定方案下模型列表
// query: schemePath=<encoded>
export async function handleV1SchemeModels({ url, request, response, paths }) {
  try {
    const parts = parseSchemePathParam(url.searchParams.get("schemePath"));
    if (!requireSchemePath(parts)) {
      sendV1Error(response, "bad-request", "缺少或非法 schemePath。");
      return;
    }
    const schemes = await readSchemes({ includeProjects: false, paths });
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

// /webgrp/v1/schemes/export —— 方案导出 ZIP
// query: schemePath=<encoded>
export async function handleV1SchemeExport({ url, response, paths }) {
  const parts = parseSchemePathParam(url.searchParams.get("schemePath"));
  if (!requireSchemePath(parts)) {
    sendV1Error(response, "bad-request", "缺少或非法 schemePath。");
    return;
  }
  try {
    // 只传 paths，不传 filesRoot：Task 5 的守卫要求枚举根与渲染根同源，
    // 传空间根作 filesRoot 会被显式拒绝（且渲染链只跟随 paths）。
    const { buffer, filename } = await createSchemeArchiveBuffer({ paths, schemePath: parts });
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
    if (message.includes("方案目录不存在")) {
      sendV1Error(response, "not-found", message);
      return;
    }
    // 生成失败（如某模型 json 损坏）：明确 500 + 原因，不静默跳过、不产出残缺 ZIP
    sendV1Error(response, "internal", message);
  }
}

// /webgrp/v1/schemes/model/json —— 模型 project JSON
// query: schemePath=<encoded>, name=<模型名>
export async function handleV1ModelJson({ url, request, response, paths }) {
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
    const record = await readSchemeProjectRecord({ schemePath: parts, name, paths });
    if (!record) {
      sendV1Error(response, "not-found", "模型不存在。");
      return;
    }
    await sendV1Json(request, response, { project: record.project });
  } catch (error) {
    sendV1Error(response, "internal", error instanceof Error ? error.message : "后端处理失败。");
  }
}

function sendSvg(response, svg, encoding) {
  const text = withXmlEncodingDeclaration(svg, encoding);
  // 与 /e-file 同口径：gbk 走 iconv 编码，utf-8 走 Buffer
  const bytes = encodeTextBytes(text, encoding);
  response.writeHead(200, {
    "content-type": `image/svg+xml; charset=${encoding}`,
    "content-length": String(bytes.length),
    // 本端点响应不带 ETag/Last-Modified 验证器，不存在 304 协商缓存；no-store 表示不缓存
    "cache-control": "no-store",
    "access-control-allow-origin": "*"
  });
  response.end(bytes);
}

// /webgrp/v1/schemes/model/svg —— 模型 SVG（复用前端 buildSvgDocument，见 svgExport.mjs）
// query: schemePath=<encoded>, name=<模型名>, colorMode=energy（默认）|voltage（可选）, encoding=utf-8（默认）|gbk（可选）
export async function handleV1ModelSvg({ url, response, paths }) {
  const parts = parseSchemePathParam(url.searchParams.get("schemePath"));
  if (!requireSchemePath(parts)) {
    sendV1Error(response, "bad-request", "缺少或非法 schemePath。");
    return;
  }
  const name = (url.searchParams.get("name") ?? "").trim();
  if (!name) {
    sendV1Error(response, "bad-request", "缺少模型名称。");
    return;
  }
  const colorMode = (url.searchParams.get("colorMode") ?? "").trim() || "energy";
  if (colorMode !== "energy" && colorMode !== "voltage") {
    sendV1Error(response, "bad-request", "colorMode 仅支持 energy 或 voltage。");
    return;
  }
  const encoding = (url.searchParams.get("encoding") ?? "").trim().toLowerCase() || "utf-8";
  if (encoding !== "gbk" && encoding !== "utf-8") {
    sendV1Error(response, "bad-request", "encoding 须为 gbk 或 utf-8。");
    return;
  }
  try {
    const { svg, error } = await renderSavedModelSvg({ parts, name, colorMode, paths });
    if (error) {
      sendV1Error(response, error.code, error.message);
      return;
    }
    sendSvg(response, svg, encoding);
  } catch (error) {
    sendV1Error(response, "internal", error instanceof Error ? error.message : "后端处理失败。");
  }
}

import { apiPattern } from "./config.mjs";
import { withSpacePaths } from "./spaceStore.mjs";

// v1 方案域路由表：{ method, pattern, handle }
// 全表经 withSpacePaths 包装：paths 缺失即抛接线错误，不得静默落回默认空间。
export const v1SchemeRoutes = [
  { method: "GET", pattern: apiPattern("/v1/schemes", "/?$"), handle: withSpacePaths(handleV1Schemes) },
  { method: "GET", pattern: apiPattern("/v1/schemes/hierarchy", "/?$"), handle: withSpacePaths(handleV1SchemesHierarchy) },
  { method: "GET", pattern: apiPattern("/v1/schemes/models", "/?$"), handle: withSpacePaths(handleV1SchemeModels) },
  { method: "GET", pattern: apiPattern("/v1/schemes/export", "/?$"), handle: withSpacePaths(handleV1SchemeExport) },
  { method: "GET", pattern: apiPattern("/v1/schemes/model/json", "/?$"), handle: withSpacePaths(handleV1ModelJson) },
  { method: "GET", pattern: apiPattern("/v1/schemes/model/svg", "/?$"), handle: withSpacePaths(handleV1ModelSvg) },
  { method: "GET", pattern: apiPattern("/v1/schemes/model/e-file", "/?$"), handle: withSpacePaths(handleV1ModelEFile) },
  { method: "POST", pattern: apiPattern("/v1/schemes/model/e-file", "/?$"), handle: withSpacePaths(handleV1ModelEFilePost) },
  { method: "GET", pattern: apiPattern("/v1/schemes/model/cim-xml", "/?$"), handle: withSpacePaths(handleV1ModelCimXml) },
  { method: "POST", pattern: apiPattern("/v1/schemes/model/send", "/?$"), handle: withSpacePaths(handleV1ModelSend) }
];
