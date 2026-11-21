// v1/schemes/model/e-file 适配层：读磁盘模型 + 库配置 → 调 src/export/e-file.ts（Node 原生 TS）→ GBK/UTF-8 响应。
import { installDomShim } from "./domShim.mjs";

installDomShim();

import iconv from "iconv-lite";
import { readDeviceLibraryConfig, readSchemeProjectRecord, resolveSchemePathForSelector } from "./server.mjs";
import { readPredefinedTemplateBase64, PREDEFINED_E_DEVICE_TEMPLATES } from "./eFileTemplates.mjs";
import { sendV1Error, sendV1PayloadTooLarge } from "./v1Response.mjs";
import { accessControlOriginOnly } from "./cors.mjs";
import { contentDispositionAttachment } from "./contentDisposition.mjs";
import { parseSchemePathParam, requireSchemePath } from "./schemePath.mjs";
import { readJsonBody as readJsonBodyWithLimit } from "./readJsonBody.mjs";

const { buildEFileExport, buildMultiModelEFileExport } = await import("../src/model-eexport.ts");
const {
  buildEFileExportOptionsFromLibrary,
  applyPredefinedEDeviceTemplateToLibraryState
} = await import("../src/export/e-file.ts");
const { parseEDeviceDefinitionFile } = await import("../src/model-eexport.ts");
// 库模板装配单源：内置库 + 自定义模板 + 元件定义覆盖（与前端 libraryTemplates、svgExport 同一条实现）
const { buildEffectiveLibraryTemplates } = await import("../src/export/device-definition-shared.ts");
const {
  E_DEVICE_TEMPLATE_ALLOWED_MODEL_TYPES,
  eDeviceTemplateSingleTypeMismatchMessage,
  eDeviceTemplateNetworkTypeMismatchMessage
} = await import("../src/eDeviceTemplateTypePolicy.ts");
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

/** 预定义模板有类型限制；自定义/未知模板不限制模型类型。 */
export function eFileTemplateAllowsModelType(templateName, modelType) {
  const name = String(templateName ?? "").trim();
  if (!name || !Object.hasOwn(E_DEVICE_TEMPLATE_ALLOWED_MODEL_TYPES, name)) {
    return true;
  }
  return E_DEVICE_TEMPLATE_ALLOWED_MODEL_TYPES[name].includes(String(modelType ?? ""));
}

async function buildEFileExportOptionsForPaths({ paths, templateText }) {
  const library = await readDeviceLibraryConfig({ paths });

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

  return {
    options: buildEFileExportOptionsFromLibrary({
      libraryTemplates,
      labels: undefined,
      ...overrides
    })
  };
}

// paths：多空间路径集合（spaceStore.spacePathsFor）。缺省时各被调函数回落 defaultPaths，
// 保证「方案 ZIP 的 json 与 e/svg 同源」——调用方传了 paths，派生格式就必须读同一个根。
export async function buildEFileForSavedModel({ parts, schemeId, name, templateName, templateText, paths }) {
  const resolvedParts = await resolveSchemePathForSelector({ schemePath: parts, schemeId, paths });
  const record = await readSchemeProjectRecord({ schemePath: resolvedParts, name, paths });
  if (!record) {
    return { error: { code: "not-found", message: "模型不存在。" } };
  }
  const prepared = await buildEFileExportOptionsForPaths({ paths, templateText });
  if (prepared.error) {
    return prepared;
  }
  if (templateName) {
    const mismatch = eDeviceTemplateSingleTypeMismatchMessage(templateName, String(record.project?.modelType ?? ""));
    if (mismatch) {
      return { error: { code: "bad-request", message: mismatch } };
    }
  }
  const file = buildEFileExport(record.project, resolvedParts, prepared.options);
  return { file };
}

/**
 * 为一批已保存模型复用一次库/模板装配。
 * 合并模式必须走 buildMultiModelEFileExport，不能把单模型文本直接拼接，
 * 因为该生成器还负责模型序号、层级关系和全局线路引用的重排。
 */
export async function buildEFilesForSavedModels({
  models,
  templateName,
  templateText,
  paths,
  globalLineRecords = []
}) {
  const modelTypes = models.map((model) => String(model?.project?.modelType ?? ""));
  if (templateName) {
    const mismatch = eDeviceTemplateNetworkTypeMismatchMessage(templateName, modelTypes);
    if (mismatch) {
      return { error: { code: "bad-request", message: mismatch } };
    }
  }
  const prepared = await buildEFileExportOptionsForPaths({ paths, templateText });
  if (prepared.error) {
    return prepared;
  }
  const files = models.map((model) => ({
    ...model,
    file: buildEFileExport(model.project, model.schemePath, prepared.options)
  }));
  const merged = buildMultiModelEFileExport(
    models.map(({ id, schemePath, project }) => ({ id, schemePath, project })),
    prepared.options,
    globalLineRecords
  );
  return { files, merged };
}

const E_FILE_BODY_LIMIT = 2 * 1024 * 1024;

// POST 端点通用的 JSON body 读取（含 2MB 上限）：/e-file 与 /send 共用。
// 实现单源在 server/readJsonBody.mjs（原先 control/runtime/e-file 各有一份）。
export const readJsonBody = (request) =>
  readJsonBodyWithLimit(request, { limitBytes: E_FILE_BODY_LIMIT, limitLabel: "2MB" });

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
    "content-disposition": contentDispositionAttachment(filename),
    "cache-control": "no-store",
    ...accessControlOriginOnly,
    // 自定义响应头跨域读取需显式放行（同源/代理场景无影响）
    ...(warningsHeader ? { "access-control-expose-headers": "x-e-file-warnings", "x-e-file-warnings": warningsHeader } : {})
  });
  response.end(bytes);
}

// 解析并校验公共 query；返回 { parts, schemeId, name, encoding, templateName } 或 { error }
export function parseEFileQuery(url) {
  const rawSchemePath = url.searchParams.get("schemePath");
  const parts = parseSchemePathParam(rawSchemePath);
  const schemeId = url.searchParams.get("schemeId");
  if ((rawSchemePath !== null && !requireSchemePath(parts)) || (rawSchemePath === null && schemeId === null)) {
    return { error: { code: "bad-request", message: "缺少或非法 schemePath，或 schemeId。" } };
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
  // Object.hasOwn 守卫（与 readPredefinedTemplateBase64 同口径）：下标取值会沿
  // Object.prototype 取到函数 / 原型对象，truthy 判定放行 "constructor" /
  // "toString" / "__proto__"，真正的「未知模板」错误要到读文件那步才抛（→ 500）。
  if (templateName && !Object.hasOwn(PREDEFINED_E_DEVICE_TEMPLATES, templateName)) {
    return {
      error: {
        code: "bad-request",
        message: `未知模板：${templateName}。可用模板：${Object.keys(PREDEFINED_E_DEVICE_TEMPLATES).join("、")}`
      }
    };
  }
  return { parts, schemeId, name, encoding, templateName };
}

function sendEFileError(response, error) {
  const code = error?.code === "bad-request" || error?.code === "not-found" ? error.code : "internal";
  sendV1Error(response, code, error instanceof Error ? error.message : "后端处理失败。");
}

// GET /webgrp/v1/schemes/model/export?format=e-file（schemePath 或 schemeId + name）
// paths：多空间路径集合（spaceStore.spacePathsFor），缺省时被调函数回落 defaultPaths。
export async function handleV1ModelEFile({ url, response, paths }) {
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
      schemeId: parsed.schemeId,
      name: parsed.name,
      templateName: parsed.templateName,
      templateText,
      paths
    });
    if (error) {
      sendV1Error(response, error.code, error.message);
      return;
    }
    sendEFile(response, { file, encoding: parsed.encoding });
  } catch (error) {
    sendEFileError(response, error);
  }
}

// POST /webgrp/v1/schemes/model/export?format=e-file —— body { templateText, templateName? }
export async function handleV1ModelEFilePost({ request, response, url, paths }) {
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
      schemeId: parsed.schemeId,
      name: parsed.name,
      templateName: bodyTemplateName || parsed.templateName,
      templateText,
      paths
    });
    if (error) {
      sendV1Error(response, error.code, error.message);
      return;
    }
    sendEFile(response, { file, encoding: parsed.encoding });
  } catch (error) {
    if (sendV1PayloadTooLarge(response, error)) return;
    if (error instanceof SyntaxError) {
      sendV1Error(response, "bad-request", "请求体不是合法 JSON。");
      return;
    }
    sendEFileError(response, error);
  }
}
