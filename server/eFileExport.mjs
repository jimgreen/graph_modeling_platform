// v1/schemes/model/e-file 适配层：读磁盘模型 + 库配置 → 调 src/export/e-file.ts（Node 原生 TS）→ GBK/UTF-8 响应。
import { installDomShim } from "./domShim.mjs";

installDomShim();

import iconv from "iconv-lite";
import { readDeviceLibraryConfig, readSchemeProjectRecord } from "./server.mjs";
import { readPredefinedTemplateBase64, PREDEFINED_E_DEVICE_TEMPLATES } from "./eFileTemplates.mjs";
import { sendV1Error } from "./v1Response.mjs";
import { parseSchemePathParam, requireSchemePath } from "./schemePath.mjs";

const { buildEFileExport } = await import("../src/model-eexport.ts");
const {
  buildEFileExportOptionsFromLibrary,
  applyPredefinedEDeviceTemplateToLibraryState
} = await import("../src/export/e-file.ts");
const { parseEDeviceDefinitionFile } = await import("../src/model-eexport.ts");
// 库模板装配单源：内置库 + 自定义模板 + 元件定义覆盖（与前端 libraryTemplates、svgExport 同一条实现）
const { buildEffectiveLibraryTemplates } = await import("../src/export/device-definition-shared.ts");
const { eDeviceTemplateSingleTypeMismatchMessage } = await import("../src/eDeviceTemplateTypePolicy.ts");
const { decodeAuto } = await import("../src/encoding/gbk.ts");

// 从模板文本推导 override 映射（与前端「加载预定义模板」共用 applyPredefinedEDeviceTemplateToLibraryState）
// 前端语义是「撤销所有修改（还原默认态）再加载模板」，故这里同样从空基线开始：
// deviceDefinitionOverrides 传 {}、四张映射表清空，只保留库的模板/元件定义作为结构底子。
// 若沿用磁盘上已被上次模板写回的 override，会与其后的字段匹配互相劫持，产出「表头对、取值错」的 E 文件。
// 后端无前端 PARAM_LABELS：labels 传 undefined（buildEDeviceInterfaceDefinitionRows 内部可选链访问，安全）
function templateOverridesFromText(templateText, library) {
  const sections = parseEDeviceDefinitionFile(templateText);
  if (sections.length === 0) {
    return null;
  }
  const customDeviceTemplates = library.customDeviceTemplates ?? [];
  return applyPredefinedEDeviceTemplateToLibraryState({
    sections,
    customDeviceTemplates,
    libraryTemplates: buildEffectiveLibraryTemplates(customDeviceTemplates, {}),
    deviceDefinitionOverrides: {},
    labels: undefined
  });
}

export async function buildEFileForSavedModel({ parts, name, templateName, templateText }) {
  const record = await readSchemeProjectRecord({ schemePath: parts, name });
  if (!record) {
    return { error: { code: "not-found", message: "模型不存在。" } };
  }
  const project = record.project;
  const library = await readDeviceLibraryConfig();

  let overrides = {
    eDeviceDefinitionLabels: library.eDeviceDefinitionLabels ?? {},
    eDeviceDefinitionClassExportEnabled: library.eDeviceDefinitionClassExportEnabled ?? {},
    eDeviceDefinitionFieldOrder: library.eDeviceDefinitionFieldOrder ?? {},
    eDeviceDefinitionTemplateFields: library.eDeviceDefinitionTemplateFields ?? {},
    eDeviceDefinitionTableIds: library.eDeviceDefinitionTableIds ?? {}
  };
  // libraryTemplates 只在下面两个分支各自算一次：带模板路径若先按磁盘库态算一遍，
  // 结果会立刻被模板态结果覆盖（实测 114ms/请求白算）。
  let libraryTemplates;
  if (templateText) {
    const parsed = templateOverridesFromText(templateText, library);
    if (!parsed) {
      return { error: { code: "bad-request", message: "模板文本中未解析到元件定义" } };
    }
    overrides = parsed;
    // 导出依据必须是「模板应用后的库状态」：apply 产出的 customDeviceTemplates + override 才带
    // 本次模板的 exportName/exportEnabled 补丁。若仍用磁盘上的旧 override，模板对字段定义的作用
    // 会被整段丢弃（表现为「表头按磁盘旧态、与前端加载模板后的导出不一致」）。
    libraryTemplates = buildEffectiveLibraryTemplates(
      parsed.customDeviceTemplates ?? [],
      parsed.deviceDefinitionOverrides ?? {}
    );
  } else {
    libraryTemplates = buildEffectiveLibraryTemplates(
      library.customDeviceTemplates ?? [],
      library.deviceDefinitionOverrides ?? {}
    );
  }

  if (templateName) {
    const mismatch = eDeviceTemplateSingleTypeMismatchMessage(templateName, String(project?.modelType ?? ""));
    if (mismatch) {
      return { error: { code: "bad-request", message: mismatch } };
    }
  }

  const options = buildEFileExportOptionsFromLibrary({
    libraryTemplates,
    labels: undefined,
    ...overrides
  });
  const file = buildEFileExport(project, parts, options);
  return { file };
}

const E_FILE_BODY_LIMIT = 2 * 1024 * 1024;

// POST 端点通用的 JSON body 读取（含 2MB 上限）：/e-file 与 /send 共用。
export async function readJsonBody(request) {
  const chunks = [];
  let total = 0;
  for await (const chunk of request) {
    total += chunk.length;
    if (total > E_FILE_BODY_LIMIT) {
      const error = new Error("请求体超过 2MB 上限。");
      error.code = "payload-too-large";
      throw error;
    }
    chunks.push(chunk);
  }
  const body = Buffer.concat(chunks).toString("utf-8");
  return body ? JSON.parse(body) : {};
}

// 未导出设备告警走响应头侧信道（生成器 file.warnings 单源产出，适配层只透传）：
// 百分比编码 JSON 保证 ASCII 安全；无告警则不发该头。
const E_FILE_WARNINGS_MAX_ITEMS = 20;
// 编码后字符数上限 4096：低于 nginx proxy_buffer_size 常见 8KB，避免代理直接 502（比丢明细更差）。
// 长中文名单条编码后可达数千字符（每字 ~9 字符），仅按条数截不够。
const E_FILE_WARNINGS_HEADER_LIMIT = 4096;

function encodeEFileWarnings(items, total) {
  return encodeURIComponent(JSON.stringify({
    total,
    ...(items.length > 0 ? { items } : {})
  }));
}

function eFileWarningsHeader(file) {
  const warnings = Array.isArray(file?.warnings) ? file.warnings : [];
  if (warnings.length === 0) {
    return null;
  }
  const total = warnings.length;
  // 先按条数截 20，再按编码后实际长度收条；total 始终为真实总数
  let items = warnings.slice(0, E_FILE_WARNINGS_MAX_ITEMS).map((warning) => ({
    nodeName: String(warning?.nodeName ?? ""),
    kind: String(warning?.kind ?? ""),
    reason: String(warning?.reason ?? "")
  }));
  while (items.length > 0) {
    const encoded = encodeEFileWarnings(items, total);
    if (encoded.length <= E_FILE_WARNINGS_HEADER_LIMIT) {
      return encoded;
    }
    items = items.slice(0, -1);
  }
  // 单条也超限：只发总数，前端据首行提示「有 N 个未导出」
  return encodeEFileWarnings([], total);
}

function sendEFile(response, { file, encoding }) {
  const text = String(file?.text ?? "");
  const filename = String(file?.filename ?? "model.e");
  const bytes = encoding === "utf-8" ? Buffer.from(text, "utf-8") : iconv.encode(text, "gbk");
  const warningsHeader = eFileWarningsHeader(file);
  response.writeHead(200, {
    "content-type": `text/plain; charset=${encoding}`,
    "content-length": String(bytes.length),
    "content-disposition": `attachment; filename="${encodeURIComponent(filename)}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
    "cache-control": "no-store",
    "access-control-allow-origin": "*",
    // 自定义响应头跨域读取需显式放行（同源/代理场景无影响）
    ...(warningsHeader ? { "access-control-expose-headers": "x-e-file-warnings", "x-e-file-warnings": warningsHeader } : {})
  });
  response.end(bytes);
}

// 解析并校验公共 query；返回 { parts, name, encoding, templateName } 或 { error }
export function parseEFileQuery(url) {
  const parts = parseSchemePathParam(url.searchParams.get("schemePath"));
  if (!requireSchemePath(parts)) {
    return { error: { code: "bad-request", message: "缺少或非法 schemePath。" } };
  }
  const name = (url.searchParams.get("name") ?? "").trim();
  if (!name) {
    return { error: { code: "bad-request", message: "缺少模型名称。" } };
  }
  const encoding = (url.searchParams.get("encoding") ?? "gbk").trim().toLowerCase() || "gbk";
  if (encoding !== "gbk" && encoding !== "utf-8") {
    return { error: { code: "bad-request", message: "encoding 须为 gbk 或 utf-8。" } };
  }
  const templateName = (url.searchParams.get("template") ?? "").trim();
  if (templateName && !PREDEFINED_E_DEVICE_TEMPLATES[templateName]) {
    return {
      error: {
        code: "bad-request",
        message: `未知模板：${templateName}。可用模板：${Object.keys(PREDEFINED_E_DEVICE_TEMPLATES).join("、")}`
      }
    };
  }
  return { parts, name, encoding, templateName };
}

// GET /webgrp/v1/schemes/model/e-file
export async function handleV1ModelEFile({ url, response }) {
  const parsed = parseEFileQuery(url);
  if (parsed.error) {
    sendV1Error(response, parsed.error.code, parsed.error.message);
    return;
  }
  try {
    let templateText = "";
    if (parsed.templateName) {
      const base64 = await readPredefinedTemplateBase64(parsed.templateName);
      templateText = decodeAuto(Buffer.from(base64, "base64"));
    }
    const { file, error } = await buildEFileForSavedModel({
      parts: parsed.parts,
      name: parsed.name,
      templateName: parsed.templateName,
      templateText
    });
    if (error) {
      sendV1Error(response, error.code, error.message);
      return;
    }
    sendEFile(response, { file, encoding: parsed.encoding });
  } catch (error) {
    sendV1Error(response, "internal", error instanceof Error ? error.message : "后端处理失败。");
  }
}

// POST /webgrp/v1/schemes/model/e-file —— body { templateText, templateName? }
export async function handleV1ModelEFilePost({ request, response, url }) {
  const parsed = parseEFileQuery(url);
  if (parsed.error) {
    sendV1Error(response, parsed.error.code, parsed.error.message);
    return;
  }
  try {
    const body = await readJsonBody(request);
    const templateText = typeof body?.templateText === "string" ? body.templateText : "";
    if (!templateText.trim()) {
      sendV1Error(response, "bad-request", "body.templateText 不能为空。");
      return;
    }
    const bodyTemplateName = typeof body?.templateName === "string" ? body.templateName.trim() : "";
    const { file, error } = await buildEFileForSavedModel({
      parts: parsed.parts,
      name: parsed.name,
      templateName: bodyTemplateName || parsed.templateName,
      templateText
    });
    if (error) {
      sendV1Error(response, error.code, error.message);
      return;
    }
    sendEFile(response, { file, encoding: parsed.encoding });
  } catch (error) {
    if (error?.code === "payload-too-large") {
      sendV1Error(response, "payload-too-large", error.message);
      return;
    }
    if (error instanceof SyntaxError) {
      sendV1Error(response, "bad-request", "请求体不是合法 JSON。");
      return;
    }
    sendV1Error(response, "internal", error instanceof Error ? error.message : "后端处理失败。");
  }
}
