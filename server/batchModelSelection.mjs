import { parseSchemePathParam, requireSchemePath } from "./schemePath.mjs";
import { PREDEFINED_E_DEVICE_TEMPLATES } from "./eFileTemplates.mjs";

const FORMAT_ORDER = ["json", "svg", "cim", "e"];
const FORMAT_SET = new Set(FORMAT_ORDER);

function badRequest(message) {
  return { error: { code: "bad-request", message } };
}

function parseBoolean(url, name, fallback) {
  const raw = url.searchParams.get(name);
  if (raw === null || raw === "") return { value: fallback };
  const normalized = raw.trim().toLowerCase();
  if (normalized === "true" || normalized === "1") return { value: true };
  if (normalized === "false" || normalized === "0") return { value: false };
  return { error: `${name} 须为 true、false、1 或 0。` };
}

function parsePositiveInteger(url, name) {
  const raw = url.searchParams.get(name);
  if (raw === null || raw.trim() === "") return { value: undefined };
  const value = Number(raw.trim());
  if (!Number.isSafeInteger(value) || value <= 0) {
    return { error: `${name} 必须是正安全整数。` };
  }
  return { value };
}

function parseFormats(url) {
  const raw = url.searchParams.get("formats");
  if (raw === null || raw.trim() === "") return { value: [...FORMAT_ORDER] };
  const requested = raw.split(",").map((item) => item.trim()).filter(Boolean);
  if (requested.length === 0) return { error: "formats 不能为空。" };
  const unique = new Set(requested);
  const unknown = [...unique].find((format) => !FORMAT_SET.has(format));
  if (unknown) return { error: `不支持的导出格式：${unknown}。` };
  return { value: FORMAT_ORDER.filter((format) => unique.has(format)) };
}

function parseSchemePath(url) {
  const raw = url.searchParams.get("schemePath");
  if (raw === null) return { value: undefined };
  const parts = parseSchemePathParam(raw);
  if (!requireSchemePath(parts)) return { error: "schemePath 必须是非空字符串数组。" };
  return { value: parts };
}

export function parseBatchModelExportQuery(url) {
  const scope = (url.searchParams.get("scope") ?? "space").trim() || "space";
  if (!["space", "scheme", "model"].includes(scope)) {
    return badRequest("scope 仅支持 space、scheme 或 model。");
  }

  const formats = parseFormats(url);
  if (formats.error) return badRequest(formats.error);
  const encoding = (url.searchParams.get("encoding") ?? "utf-8").trim().toLowerCase() || "utf-8";
  if (encoding !== "utf-8" && encoding !== "gbk") return badRequest("encoding 须为 utf-8 或 gbk。");

  const schemePath = parseSchemePath(url);
  if (schemePath.error) return badRequest(schemePath.error);
  const schemeId = parsePositiveInteger(url, "schemeId");
  if (schemeId.error) return badRequest(schemeId.error);
  const modelId = parsePositiveInteger(url, "modelId");
  if (modelId.error) return badRequest(modelId.error);
  const name = (url.searchParams.get("name") ?? "").trim();
  const includeDescendants = parseBoolean(url, "includeDescendants", true);
  if (includeDescendants.error) return badRequest(includeDescendants.error);
  const mergeE = parseBoolean(url, "mergeE", false);
  if (mergeE.error) return badRequest(mergeE.error);
  const includeAssociatedModels = parseBoolean(url, "includeAssociatedModels", false);
  if (includeAssociatedModels.error) return badRequest(includeAssociatedModels.error);
  const strict = parseBoolean(url, "strict", false);
  if (strict.error) return badRequest(strict.error);
  const colorMode = (url.searchParams.get("colorMode") ?? "energy").trim() || "energy";
  if (colorMode !== "energy" && colorMode !== "voltage") return badRequest("colorMode 须为 energy 或 voltage。");

  const templateName = (url.searchParams.get("template") ?? "").trim();
  if (templateName && !Object.hasOwn(PREDEFINED_E_DEVICE_TEMPLATES, templateName)) {
    return badRequest(`未知模板：${templateName}。可用模板：${Object.keys(PREDEFINED_E_DEVICE_TEMPLATES).join("、")}`);
  }

  const schemeSelectorProvided = schemePath.value !== undefined || schemeId.value !== undefined;
  if (scope === "space") {
    if (schemeSelectorProvided || name || modelId.value !== undefined || url.searchParams.has("includeDescendants")) {
      return badRequest("scope=space 不接受 schemeId、schemePath、name、modelId 或 includeDescendants。");
    }
  }
  if (scope === "scheme") {
    if (!schemeSelectorProvided) return badRequest("scope=scheme 须提供 schemeId 或 schemePath。");
    if (name || modelId.value !== undefined) return badRequest("scope=scheme 不接受 name 或 modelId。");
  }
  if (scope === "model") {
    const byModelId = modelId.value !== undefined;
    const bySelector = schemeSelectorProvided || Boolean(name);
    if (byModelId && bySelector) return badRequest("scope=model 的 modelId 不可与方案选择器或 name 同时提供。");
    if (!byModelId && !(schemeSelectorProvided && name)) {
      return badRequest("scope=model 须提供 modelId，或提供 schemeId/schemePath 与 name。");
    }
    if (url.searchParams.has("includeDescendants")) return badRequest("scope=model 不接受 includeDescendants。");
  }
  if (mergeE.value && !formats.value.includes("e")) return badRequest("mergeE=true 时 formats 必须包含 e。");
  if (templateName && !formats.value.includes("e")) return badRequest("template 仅可与 e 格式一起使用。");
  if (url.searchParams.has("colorMode") && !formats.value.includes("svg")) return badRequest("colorMode 仅可与 svg 格式一起使用。");
  if (url.searchParams.has("strict") && !formats.value.includes("cim")) return badRequest("strict 仅可与 cim 格式一起使用。");

  return {
    scope,
    ...(schemePath.value ? { schemePath: schemePath.value } : {}),
    ...(schemeId.value !== undefined ? { schemeId: schemeId.value } : {}),
    ...(modelId.value !== undefined ? { modelId: modelId.value } : {}),
    ...(name ? { name } : {}),
    includeDescendants: includeDescendants.value,
    formats: formats.value,
    encoding,
    templateName,
    mergeE: mergeE.value,
    includeAssociatedModels: includeAssociatedModels.value,
    colorMode,
    strict: strict.value
  };
}
