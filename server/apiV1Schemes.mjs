// /webgrp/v1 方案域 handler：schemes、hierarchy、models、export、model json/svg。
// 复用 server.mjs 纯函数。v1 信封包装。

import {
  readSchemes,
  createSchemeArchiveBuffer,
  readSchemeProjectRecord,
  resolveSchemePathForSelector
} from "./server.mjs";
import { sendV1Json, sendV1Error } from "./v1Response.mjs";
import { accessControlOriginOnly } from "./cors.mjs";
import { contentDispositionAttachment } from "./contentDisposition.mjs";
import { parseSchemePathParam, requireSchemePath } from "./schemePath.mjs";
import { handleV1ModelEFile, handleV1ModelEFilePost } from "./eFileExport.mjs";
import { PREDEFINED_E_DEVICE_TEMPLATES } from "./eFileTemplates.mjs";
import { handleV1ModelCimXml } from "./cimExport.mjs";
import { renderSavedModelSvg } from "./svgExport.mjs";
import { handleV1ModelSend } from "./sendModel.mjs";
import { encodeTextBytes, withXmlEncodingDeclaration } from "./xmlEncoding.mjs";

// 数据根不再由本模块自建：各 handler 收 ctx.paths（由 server.mjs 分发层按空间解析），
// 缺省时被调函数回落 defaultPaths。原此处曾自建一份数据根推导，是全仓唯一一处重复 —— 已删除。

// 方案树轻量化：剥离 project 完整数据，仅留方案与模型摘要。
function schemeTreeSummary(schemes) {
  return schemes.map((scheme) => ({
    name: scheme.name,
    schemeId: scheme.schemeId,
    updatedAt: scheme.updatedAt,
    projects: (scheme.projects ?? []).map((p) => ({ name: p.name, updatedAt: p.updatedAt })),
    children: schemeTreeSummary(scheme.children ?? [])
  }));
}

// 纯层级树（不含 projects）
function schemeHierarchy(schemes) {
  return schemes.map((scheme) => ({
    name: scheme.name,
    schemeId: scheme.schemeId,
    updatedAt: scheme.updatedAt,
    children: schemeHierarchy(scheme.children ?? [])
  }));
}

function parseSchemeSelectorQuery(url) {
  const rawSchemePath = url.searchParams.get("schemePath");
  const parts = parseSchemePathParam(rawSchemePath);
  const schemeId = url.searchParams.get("schemeId");
  if ((rawSchemePath !== null && !requireSchemePath(parts)) || (rawSchemePath === null && schemeId === null)) {
    return { error: { code: "bad-request", message: "缺少或非法 schemePath，或 schemeId。" } };
  }
  return { parts, schemeId };
}

async function resolveSchemeSelector(selector, paths) {
  try {
    const parts = await resolveSchemePathForSelector({
      schemePath: selector.parts,
      schemeId: selector.schemeId,
      paths
    });
    return { parts };
  } catch (error) {
    return { error };
  }
}

function sendSchemeError(response, error) {
  const code = error?.code === "bad-request" || error?.code === "not-found" ? error.code : "internal";
  sendV1Error(response, code, typeof error?.message === "string" ? error.message : "后端处理失败。");
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

// 统一方案读取入口：view=summary（默认）|hierarchy|models。
export async function handleV1SchemesUnified(route) {
  const { url, response } = route;
  const view = (url.searchParams.get("view") ?? "summary").trim() || "summary";
  const allowed = view === "models"
    ? new Set(["view", "schemePath", "schemeId"])
    : view === "summary"
      ? new Set(["view", "includeProjects"])
      : view === "hierarchy"
        ? new Set(["view"])
        : null;
  if (!allowed) {
    sendV1Error(response, "bad-request", "view 仅支持 summary、hierarchy 或 models。");
    return;
  }
  const unexpected = [...url.searchParams.keys()].find((key) => !allowed.has(key));
  if (unexpected) {
    sendV1Error(response, "bad-request", `view=${view} 不接受参数 ${unexpected}。`);
    return;
  }
  if (view === "hierarchy") return handleV1SchemesHierarchy(route);
  if (view === "models") return handleV1SchemeModels(route);
  return handleV1Schemes(route);
}

// 统一入口 view=hierarchy —— 纯层级树
export async function handleV1SchemesHierarchy({ request, response, paths }) {
  try {
    const schemes = await readSchemes({ includeProjects: false, paths });
    await sendV1Json(request, response, { nodes: schemeHierarchy(schemes) });
  } catch (error) {
    sendV1Error(response, "internal", error instanceof Error ? error.message : "后端处理失败。");
  }
}

// 统一入口 view=models —— 指定方案下模型列表
// query: schemePath=<encoded> 或 schemeId=<number>
export async function handleV1SchemeModels({ url, request, response, paths }) {
  try {
    const selector = parseSchemeSelectorQuery(url);
    if (selector.error) {
      sendSchemeError(response, selector.error);
      return;
    }
    const resolved = await resolveSchemeSelector(selector, paths);
    if (resolved.error) {
      sendSchemeError(response, resolved.error);
      return;
    }
    const schemes = await readSchemes({ includeProjects: false, paths });
    const scheme = findSchemeByPath(schemes, resolved.parts);
    if (!scheme) {
      sendV1Error(response, "not-found", "方案不存在。");
      return;
    }
    await sendV1Json(request, response, {
      schemeId: scheme.schemeId,
      models: (scheme.projects ?? []).map((p) => ({ name: p.name, updatedAt: p.updatedAt }))
    });
  } catch (error) {
    sendV1Error(response, "internal", error instanceof Error ? error.message : "后端处理失败。");
  }
}

// /webgrp/v1/schemes/export —— 方案导出 ZIP
// query: schemePath=<encoded> 或 schemeId=<number>, template=<预定义 E 模板名，可选>
export async function handleV1SchemeExport({ url, response, paths }) {
  const selector = parseSchemeSelectorQuery(url);
  if (selector.error) {
    sendSchemeError(response, selector.error);
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
  const resolved = await resolveSchemeSelector(selector, paths);
  if (resolved.error) {
    sendSchemeError(response, resolved.error);
    return;
  }
  try {
    // 只传 paths，不传 filesRoot：Task 5 的守卫要求枚举根与渲染根同源，
    // 传空间根作 filesRoot 会被显式拒绝（且渲染链只跟随 paths）。
    const { buffer, filename } = await createSchemeArchiveBuffer({ paths, schemePath: resolved.parts, templateName });
    response.writeHead(200, {
      "content-type": "application/zip",
      "content-length": String(buffer.length),
      "content-disposition": contentDispositionAttachment(filename),
      "cache-control": "no-store",
      ...accessControlOriginOnly
    });
    response.end(buffer);
  } catch (error) {
    const message = error instanceof Error ? error.message : "导出方案失败。";
    if (error?.code === "bad-request" || error?.code === "not-found") {
      sendSchemeError(response, error);
      return;
    }
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

// 统一入口 format=json —— 模型 project JSON
// query: schemePath=<encoded> 或 schemeId=<number>, name=<模型名>
export async function handleV1ModelJson({ url, request, response, paths }) {
  try {
    const selector = parseSchemeSelectorQuery(url);
    const name = (url.searchParams.get("name") ?? "").trim();
    if (selector.error) {
      sendSchemeError(response, selector.error);
      return;
    }
    if (!name) {
      sendV1Error(response, "bad-request", "缺少模型名称。");
      return;
    }
    const record = await readSchemeProjectRecord({ schemePath: selector.parts, schemeId: selector.schemeId, name, paths });
    if (!record) {
      sendV1Error(response, "not-found", "模型不存在。");
      return;
    }
    await sendV1Json(request, response, { project: record.project });
  } catch (error) {
    sendSchemeError(response, error);
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
    ...accessControlOriginOnly
  });
  response.end(bytes);
}

// 统一入口 format=svg —— 模型 SVG（复用前端 buildSvgDocument，见 svgExport.mjs）
// query: schemePath=<encoded> 或 schemeId=<number>, name=<模型名>, colorMode=energy（默认）|voltage（可选）,
//        labelsVisible=1（默认）|0（可选）, measurementsVisible=1（默认）|0（可选）, encoding=utf-8（默认）|gbk（可选）
function parseOptionalBooleanQuery(raw, fieldName) {
  const normalized = String(raw ?? "").trim().toLowerCase();
  if (!normalized || normalized === "1" || normalized === "true") {
    return { value: true };
  }
  if (normalized === "0" || normalized === "false") {
    return { value: false };
  }
  return { error: `${fieldName} 仅支持 1/0 或 true/false。` };
}

export async function handleV1ModelSvg({ url, response, paths }) {
  const selector = parseSchemeSelectorQuery(url);
  if (selector.error) {
    sendSchemeError(response, selector.error);
    return;
  }
  const resolved = await resolveSchemeSelector(selector, paths);
  if (resolved.error) {
    sendSchemeError(response, resolved.error);
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
  const labelsVisibleParsed = parseOptionalBooleanQuery(url.searchParams.get("labelsVisible"), "labelsVisible");
  if (labelsVisibleParsed.error) {
    sendV1Error(response, "bad-request", labelsVisibleParsed.error);
    return;
  }
  const measurementsVisibleParsed = parseOptionalBooleanQuery(url.searchParams.get("measurementsVisible"), "measurementsVisible");
  if (measurementsVisibleParsed.error) {
    sendV1Error(response, "bad-request", measurementsVisibleParsed.error);
    return;
  }
  const themeMode = (url.searchParams.get("themeMode") ?? "").trim() || "light";
  if (themeMode !== "light" && themeMode !== "dark" && themeMode !== "custom") {
    sendV1Error(response, "bad-request", "themeMode 仅支持 light、dark 或 custom。");
    return;
  }
  const encoding = (url.searchParams.get("encoding") ?? "").trim().toLowerCase() || "utf-8";
  if (encoding !== "gbk" && encoding !== "utf-8") {
    sendV1Error(response, "bad-request", "encoding 须为 gbk 或 utf-8。");
    return;
  }
  try {
    const { svg, error } = await renderSavedModelSvg({
      parts: resolved.parts,
      name,
      colorMode,
      ...(labelsVisibleParsed.value === false ? { deviceLabelsVisible: false } : {}),
      ...(measurementsVisibleParsed.value === false ? { deviceMeasurementsVisible: false } : {}),
      ...(themeMode !== "light" ? { themeMode } : {}),
      paths
    });
    if (error) {
      sendV1Error(response, error.code, error.message);
      return;
    }
    sendSvg(response, svg, encoding);
  } catch (error) {
    sendSchemeError(response, error);
  }
}

import { apiPattern } from "./config.mjs";
import { withSpacePaths } from "./spaceStore.mjs";

// v1 方案域路由表：{ method, pattern, handle }
// 全表经 withSpacePaths 包装：paths 缺失即抛接线错误，不得静默落回默认空间。
export const v1SchemeRoutes = [
  { method: "GET", pattern: apiPattern("/v1/schemes", "/?$"), handle: withSpacePaths(handleV1SchemesUnified) },
  { method: "GET", pattern: apiPattern("/v1/schemes/export", "/?$"), handle: withSpacePaths(handleV1SchemeExport) },
  { method: "POST", pattern: apiPattern("/v1/schemes/model/send", "/?$"), handle: withSpacePaths(handleV1ModelSend) }
];
