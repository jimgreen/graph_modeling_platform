// v1/schemes/model/cim-xml 适配层：读磁盘模型 → 调 src/cim/cim-export.ts（Node 原生 TS）→ XML 响应。
import { installDomShim } from "./domShim.mjs";

installDomShim();

import { readMeasurementConfig, readSchemeProjectRecord, resolveSchemePathForSelector } from "./server.mjs";
import { sendV1Error } from "./v1Response.mjs";
import { accessControlOriginOnly } from "./cors.mjs";
import { contentDispositionAttachment } from "./contentDisposition.mjs";
import { parseSchemePathParam, requireSchemePath } from "./schemePath.mjs";

const { buildCimXml, cimFilename } = await import("../src/cim/cim-export.ts");
// collectMissingCriticalParams 未从 cim-export.ts 再导出（前端仅工厂内部使用），直连其定义模块
const { collectMissingCriticalParams } = await import("../src/cim/cim-builder.ts");

// modelId：默认取 project.idx，回退模型名；卫生化为 NCName 安全字符
function resolveModelId(project, name, override) {
  const raw = String(override ?? "").trim()
    || (project?.idx !== undefined && project?.idx !== null ? String(project.idx) : "")
    || name;
  return raw.replace(/[^A-Za-z0-9_.-]/g, "_") || "current";
}

// 文件名单源在 src/cim/cim-export.ts 的 cimFilename（前端落盘名与后端 Content-Disposition 必须同规则）

// 生成已保存模型的 CIM/XML：/cim-xml 响应端点与 /send 发送端点共用。
// 返回 { xml, filename } 或 { error }。
// paths：多空间路径集合（spaceStore.spacePathsFor）。缺省时被调函数回落 defaultPaths。
export async function buildCimForSavedModel({ parts, schemeId, name, modelId: modelIdOverride, strict = false, stableCreatedAt = false, paths }) {
  const resolvedParts = await resolveSchemePathForSelector({ schemePath: parts, schemeId, paths });
  const record = await readSchemeProjectRecord({ schemePath: resolvedParts, name, paths });
  if (!record) {
    return { error: { code: "not-found", message: "模型不存在。" } };
  }
  const project = record.project ?? {};
  const nodes = Array.isArray(project.nodes) ? project.nodes : [];
  const edges = Array.isArray(project.edges) ? project.edges : [];

  const electricalNodes = nodes.filter((node) => !String(node.kind ?? "").startsWith("static-"));
  if (electricalNodes.length === 0) {
    return { error: { code: "bad-request", message: "当前模型无可导出的电力设备。" } };
  }

  if (strict) {
    const missing = collectMissingCriticalParams(electricalNodes);
    if (missing.length > 0) {
      const detail = missing
        .slice(0, 10)
        .map((item) => `${item.name} 缺 ${item.missing.join("、")}`)
        .join("；");
      return { error: { code: "bad-request", message: `关键参数缺失：${detail}` } };
    }
  }

  const measurementConfig = await readMeasurementConfig({ paths });
  const modelId = resolveModelId(project, name, modelIdOverride);
  const xml = buildCimXml(
    nodes,
    edges,
    String(project.name ?? name),
    modelId,
    project.measurements?.groups,
    measurementConfig.measurementTypes,
    stableCreatedAt ? record.updatedAt : undefined
  );
  return { xml, filename: cimFilename(project.name ?? name) };
}

// GET /webgrp/v1/schemes/model/export?format=cim-xml（schemePath 或 schemeId + name）
export async function handleV1ModelCimXml({ url, response, paths }) {
  const rawSchemePath = url.searchParams.get("schemePath");
  const parts = parseSchemePathParam(rawSchemePath);
  const schemeId = url.searchParams.get("schemeId");
  if ((rawSchemePath !== null && !requireSchemePath(parts)) || (rawSchemePath === null && schemeId === null)) {
    sendV1Error(response, "bad-request", "缺少或非法 schemePath，或 schemeId。");
    return;
  }
  const name = (url.searchParams.get("name") ?? "").trim();
  if (!name) {
    sendV1Error(response, "bad-request", "缺少模型名称。");
    return;
  }
  try {
    const { xml, filename, error } = await buildCimForSavedModel({
      parts,
      schemeId,
      name,
      modelId: url.searchParams.get("modelId"),
      strict: url.searchParams.get("strict") === "1",
      paths
    });
    if (error) {
      sendV1Error(response, error.code, error.message);
      return;
    }
    response.writeHead(200, {
      "content-type": "application/xml; charset=utf-8",
      "content-disposition": contentDispositionAttachment(filename),
      "cache-control": "no-store",
      ...accessControlOriginOnly
    });
    response.end(xml);
  } catch (error) {
    const code = error?.code === "bad-request" || error?.code === "not-found" ? error.code : "internal";
    sendV1Error(response, code, error instanceof Error ? error.message : "后端处理失败。");
  }
}
