// v1/schemes/model/cim-xml 适配层：读磁盘模型 → 调 src/cim/cim-export.ts（Node 原生 TS）→ XML 响应。
import { installDomShim } from "./domShim.mjs";

installDomShim();

import { readMeasurementConfig, readSchemeProjectRecord } from "./server.mjs";
import { sendV1Error } from "./v1Response.mjs";
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
export async function buildCimForSavedModel({ parts, name, modelId: modelIdOverride, strict = false }) {
  const record = await readSchemeProjectRecord({ schemePath: parts, name });
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

  const measurementConfig = await readMeasurementConfig();
  const modelId = resolveModelId(project, name, modelIdOverride);
  const xml = buildCimXml(
    nodes,
    edges,
    String(project.name ?? name),
    modelId,
    project.measurements?.groups,
    measurementConfig.measurementTypes
  );
  return { xml, filename: cimFilename(project.name ?? name) };
}

// GET /webgrp/v1/schemes/model/cim-xml
export async function handleV1ModelCimXml({ url, response }) {
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
  try {
    const { xml, filename, error } = await buildCimForSavedModel({
      parts,
      name,
      modelId: url.searchParams.get("modelId"),
      strict: url.searchParams.get("strict") === "1"
    });
    if (error) {
      sendV1Error(response, error.code, error.message);
      return;
    }
    response.writeHead(200, {
      "content-type": "application/xml; charset=utf-8",
      "content-disposition": `attachment; filename="${encodeURIComponent(filename)}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
      "cache-control": "no-store",
      "access-control-allow-origin": "*"
    });
    response.end(xml);
  } catch (error) {
    sendV1Error(response, "internal", error instanceof Error ? error.message : "后端处理失败。");
  }
}
