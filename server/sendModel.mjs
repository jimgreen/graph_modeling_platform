// /webgrp/v1/schemes/model/send 适配层：按选定格式生成已保存模型文件，
// 以 multipart/form-data POST 转发到调用方给定的目标 URL（后端转发，规避浏览器 CORS）。
import { installDomShim } from "./domShim.mjs";

installDomShim();

import { findSchemeProjectRecordByIndex, readSchemeProjectRecord } from "./server.mjs";
import { sendV1Error, sendV1JsonNoStore } from "./v1Response.mjs";
import { parseSchemePathParam, requireSchemePath } from "./schemePath.mjs";
import { buildEFileForSavedModel, readJsonBody } from "./eFileExport.mjs";
import { renderSavedModelSvg } from "./svgExport.mjs";
import { buildCimForSavedModel } from "./cimExport.mjs";
import { encodeTextBytes, withXmlEncodingDeclaration } from "./xmlEncoding.mjs";

const SEND_TIMEOUT_MS = 30_000;
// 目标出错时只取响应体前 512 字节进错误文案，避免大响应撑爆内存与日志
const TARGET_ERROR_BODY_LIMIT = 512;

// 文件种类 → multipart 字段名 / 扩展名 / MIME。
// 字段名是对接收方的公开契约，改变即破坏兼容，勿随内部命名调整。
const FILE_KINDS = {
  e: { field: "e_file", ext: ".e", mime: "text/plain" },
  json: { field: "json_file", ext: ".json", mime: "application/json" },
  svg: { field: "svg_file", ext: ".svg", mime: "image/svg+xml" },
  cim: { field: "cim_file", ext: ".xml", mime: "application/xml" }
};

// 与前端 safeFilePart 同规则：模型名 → 文件名主体
function sanitizeFileBase(name) {
  return String(name ?? "").trim().replace(/[\\/:*?"<>|]+/g, "_") || "未命名";
}

// 仅接受 http/https：排除 file:/data: 等本地协议被后端代发
function normalizeTargetUrl(raw) {
  const text = String(raw ?? "").trim();
  if (!text) {
    return null;
  }
  let url;
  try {
    url = new URL(text);
  } catch {
    return null;
  }
  return url.protocol === "http:" || url.protocol === "https:" ? url : null;
}

// 生成单个格式的文本内容。返回 { text } 或 { error }。
async function buildFileText({ kind, parts, name }) {
  if (kind === "json") {
    const record = await readSchemeProjectRecord({ schemePath: parts, name });
    if (!record) {
      return { error: { code: "not-found", message: "模型不存在。" } };
    }
    return { text: JSON.stringify(record.project ?? {}) };
  }
  if (kind === "e") {
    const { file, error } = await buildEFileForSavedModel({ parts, name });
    return error ? { error } : { text: String(file?.text ?? "") };
  }
  if (kind === "svg") {
    // 与前端导出同口径：colorMode=voltage（前端导出原有按电压着色）
    const { svg, error } = await renderSavedModelSvg({ parts, name, colorMode: "voltage" });
    return error ? { error } : { text: String(svg ?? "") };
  }
  const { xml, error } = await buildCimForSavedModel({ parts, name });
  return error ? { error } : { text: String(xml ?? "") };
}

// 目标响应体的前 N 字节（只读首个 chunk，不整体读入）
async function readTargetErrorDetail(targetResponse) {
  const reader = targetResponse.body?.getReader();
  if (!reader) {
    return "";
  }
  try {
    const { value } = await reader.read();
    return value
      ? Buffer.from(value).subarray(0, TARGET_ERROR_BODY_LIMIT).toString("utf-8").trim()
      : "";
  } catch {
    return "";
  } finally {
    await reader.cancel().catch(() => undefined);
  }
}

// 定位待发送模型：优先 modelId（模型稳定序号 idx，与方案路径解耦），
// 兼容 schemePath + name。返回 { parts, name, modelId } 或 { error }。
async function resolveSendTarget(url) {
  const rawId = (url.searchParams.get("modelId") ?? "").trim();
  if (rawId) {
    const index = Number(rawId);
    if (!Number.isSafeInteger(index) || index <= 0) {
      return { error: { code: "bad-request", message: "modelId 必须是正整数。" } };
    }
    const located = await findSchemeProjectRecordByIndex({ index });
    if (!located) {
      return { error: { code: "not-found", message: `模型 ID ${index} 不存在。` } };
    }
    return { parts: located.schemePath, name: located.name, modelId: index };
  }
  const parts = parseSchemePathParam(url.searchParams.get("schemePath"));
  if (!requireSchemePath(parts)) {
    return { error: { code: "bad-request", message: "缺少或非法 schemePath，或改用 modelId 指定模型。" } };
  }
  const name = (url.searchParams.get("name") ?? "").trim();
  if (!name) {
    return { error: { code: "bad-request", message: "缺少模型名称，或改用 modelId 指定模型。" } };
  }
  // 兼容路径顺带取一次 idx，让 model_id 表单字段对两种调用口径一致
  const record = await readSchemeProjectRecord({ schemePath: parts, name });
  return { parts, name, modelId: Number(record?.project?.idx) || 0 };
}

// POST /webgrp/v1/schemes/model/send
// query: modelId=<模型 idx>（推荐）
//        或 schemePath=<encoded> + name=<模型名>（兼容旧调用）
// body:  { url, files: [{ kind: "e"|"json"|"svg"|"cim", encoding: "utf-8"|"gbk" }] }
export async function handleV1ModelSend({ request, response, url }) {
  try {
    const resolved = await resolveSendTarget(url);
    if (resolved.error) {
      sendV1Error(response, resolved.error.code, resolved.error.message);
      return;
    }
    const { parts, name, modelId } = resolved;

    const body = await readJsonBody(request);
    const target = normalizeTargetUrl(body?.url);
    if (!target) {
      sendV1Error(response, "bad-request", "body.url 必须是合法的 http/https 地址。");
      return;
    }

    const specs = [];
    for (const item of Array.isArray(body?.files) ? body.files : []) {
      const kind = String(item?.kind ?? "").trim().toLowerCase();
      if (!FILE_KINDS[kind]) {
        sendV1Error(response, "bad-request", `body.files 含未知格式：${kind || "(空)"}。`);
        return;
      }
      specs.push({ kind, encoding: item?.encoding === "gbk" ? "gbk" : "utf-8" });
    }
    if (specs.length === 0) {
      sendV1Error(response, "bad-request", "body.files 至少选择一种格式。");
      return;
    }

    const startedAt = Date.now();
    const base = sanitizeFileBase(name);
    const form = new FormData();
    // model_id 是接收方识别模型的主键（与全局线路/全网拓扑的 model_id 同一口径），
    // 老模型可能尚未分配 idx，此时字段为空串而不是缺失，便于接收方稳定解析
    form.append("model_id", modelId > 0 ? String(modelId) : "");
    form.append("model_name", name);
    form.append("scheme_path", JSON.stringify(parts));
    form.append("sent_at", new Date(startedAt).toISOString());

    const sentFiles = [];
    for (const spec of specs) {
      const built = await buildFileText({ kind: spec.kind, parts, name });
      if (built.error) {
        sendV1Error(response, built.error.code, built.error.message);
        return;
      }
      const { field, ext, mime } = FILE_KINDS[spec.kind];
      // SVG/CIM 是 XML：声明里的编码必须与字节编码一致
      const declared = spec.kind === "svg" || spec.kind === "cim"
        ? withXmlEncodingDeclaration(built.text, spec.encoding)
        : built.text;
      const bytes = encodeTextBytes(declared, spec.encoding);
      const filename = `${base}${ext}`;
      form.append(field, new Blob([bytes], { type: `${mime}; charset=${spec.encoding}` }), filename);
      sentFiles.push({ kind: spec.kind, field, filename, encoding: spec.encoding, bytes: bytes.length });
    }

    const targetResponse = await fetch(target, {
      method: "POST",
      body: form,
      signal: AbortSignal.timeout(SEND_TIMEOUT_MS)
    });
    if (!targetResponse.ok) {
      const detail = await readTargetErrorDetail(targetResponse);
      sendV1Error(
        response,
        "internal",
        `目标服务器返回 HTTP ${targetResponse.status}${detail ? `：${detail}` : "。"}`,
        502
      );
      return;
    }

    sendV1JsonNoStore(response, {
      url: target.href,
      status: targetResponse.status,
      elapsedMs: Date.now() - startedAt,
      files: sentFiles
    });
  } catch (error) {
    if (error?.code === "payload-too-large") {
      sendV1Error(response, "payload-too-large", error.message);
      return;
    }
    if (error instanceof SyntaxError) {
      sendV1Error(response, "bad-request", "请求体不是合法 JSON。");
      return;
    }
    if (error?.name === "TimeoutError" || error?.name === "AbortError") {
      sendV1Error(response, "internal", `目标服务器 ${SEND_TIMEOUT_MS / 1000} 秒内未响应。`, 504);
      return;
    }
    if (error instanceof TypeError) {
      sendV1Error(response, "internal", "无法连接目标服务器，请检查地址与网络。", 502);
      return;
    }
    sendV1Error(response, "internal", error instanceof Error ? error.message : "后端处理失败。");
  }
}
