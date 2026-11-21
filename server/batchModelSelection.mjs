import { parseSchemePathParam, requireSchemePath } from "./schemePath.mjs";
import { PREDEFINED_E_DEVICE_TEMPLATES } from "./eFileTemplates.mjs";
import { listSpaceArtifactModels } from "./spaceArtifactExport.mjs";
import { readSchemes, resolveSchemePathForSelector } from "./server.mjs";
import { modelAssociationModelTypeForKind } from "../src/model.ts";

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

function numericModelId(project) {
  const value = Number(project?.idx);
  return Number.isSafeInteger(value) && value > 0 ? value : undefined;
}

function stableModelKey(model) {
  const numeric = numericModelId(model.project);
  if (numeric !== undefined && model.modelType) return `idx:${model.modelType}:${numeric}`;
  return `path:${model.schemePath.join("/")}/${model.name}`;
}

function normalizeModel(model, schemeIdByPath) {
  const numeric = numericModelId(model.project);
  return {
    ...model,
    id: numeric ?? String(model.id),
    modelType: String(model.project?.modelType ?? ""),
    ...(schemeIdByPath.has(model.schemePath.join("/"))
      ? { schemeId: schemeIdByPath.get(model.schemePath.join("/")) }
      : {})
  };
}

function flattenSchemes(schemes, parentPath = [], output = new Map()) {
  for (const scheme of schemes ?? []) {
    const path = [...parentPath, scheme.name];
    output.set(path.join("/"), scheme.schemeId);
    flattenSchemes(scheme.children ?? [], path, output);
  }
  return output;
}

function compareModels(left, right) {
  const pathResult = left.schemePath.join("/").localeCompare(right.schemePath.join("/"), "zh-CN");
  if (pathResult !== 0) return pathResult;
  const nameResult = left.name.localeCompare(right.name, "zh-CN");
  if (nameResult !== 0) return nameResult;
  return (numericModelId(left.project) ?? Number.MAX_SAFE_INTEGER) - (numericModelId(right.project) ?? Number.MAX_SAFE_INTEGER);
}

export async function collectBatchModels({ paths, query }) {
  const rawModels = await listSpaceArtifactModels(paths, "");
  const schemeIdByPath = flattenSchemes(await readSchemes({ paths }));
  const allModels = rawModels.map((model) => normalizeModel(model, schemeIdByPath)).sort(compareModels);

  if (query.scope === "space") {
    return { selectedModels: allModels, allModels, selectedBy: { scope: "space" } };
  }

  if (query.scope === "scheme") {
    const resolvedPath = await resolveSchemePathForSelector({
      schemePath: query.schemePath,
      schemeId: query.schemeId,
      paths
    });
    const prefix = resolvedPath.join("/");
    const selectedModels = allModels.filter((model) => {
      const path = model.schemePath.join("/");
      return query.includeDescendants ? (path === prefix || path.startsWith(`${prefix}/`)) : path === prefix;
    });
    return {
      selectedModels,
      allModels,
      selectedBy: { scope: "scheme", schemePath: resolvedPath, ...(query.schemeId !== undefined ? { schemeId: query.schemeId } : {}) }
    };
  }

  let selectedModels;
  if (query.modelId !== undefined) {
    selectedModels = allModels.filter((model) => numericModelId(model.project) === query.modelId);
  } else {
    const resolvedPath = await resolveSchemePathForSelector({
      schemePath: query.schemePath,
      schemeId: query.schemeId,
      paths
    });
    selectedModels = allModels.filter((model) => model.name === query.name && model.schemePath.join("/") === resolvedPath.join("/"));
  }
  if (selectedModels.length === 0) {
    const error = new Error("模型不存在。");
    error.code = "not-found";
    throw error;
  }
  return {
    selectedModels,
    allModels,
    selectedBy: { scope: "model", ...(query.modelId !== undefined ? { modelId: query.modelId } : { schemePath: selectedModels[0].schemePath, name: query.name }) }
  };
}

function modelKeysFromGlobalLineRecord(record) {
  const keys = [];
  for (const slot of [record?.endpointSlots?.source, record?.endpointSlots?.target]) {
    const idx = Number(slot?.projectIdx);
    if (Number.isSafeInteger(idx) && idx > 0) keys.push({ type: "idx", value: idx });
    if (slot?.projectId) keys.push({ type: "projectId", value: String(slot.projectId) });
    if (slot?.modelKey) keys.push({ type: "modelKey", value: String(slot.modelKey) });
  }
  return keys;
}

function modelMatchesReference(model, reference) {
  if (reference.type === "idx") return numericModelId(model.project) === reference.value;
  if (reference.type === "projectId") return String(model.project?.projectId ?? model.id) === reference.value;
  return String(model.relativePath ?? "") === reference.value || String(model.id) === reference.value;
}

export function expandAssociatedModels({ selectedModels, allModels, globalLineRecords = [], includeAssociatedModels }) {
  const selectedKeys = new Set(selectedModels.map(stableModelKey));
  if (!includeAssociatedModels) {
    return { models: [...selectedModels].sort(compareModels), warnings: [], expandedModelKeys: [] };
  }

  const byTypeAndId = new Map();
  const byId = new Map();
  for (const model of allModels) {
    const numeric = numericModelId(model.project);
    if (numeric !== undefined) {
      byId.set(numeric, model);
      const key = `${model.modelType}:${numeric}`;
      byTypeAndId.set(key, model);
    }
  }
  const adjacency = new Map();
  const addEdge = (left, right) => {
    if (!left || !right || left === right) return;
    const leftKey = stableModelKey(left);
    const rightKey = stableModelKey(right);
    const values = adjacency.get(leftKey) ?? new Set();
    values.add(rightKey);
    adjacency.set(leftKey, values);
  };
  const warnings = [];

  for (const model of allModels) {
    for (const node of model.project?.nodes ?? []) {
      const expectedType = modelAssociationModelTypeForKind(node.kind);
      if (!expectedType) continue;
      const rawId = String(node.params?.model_id ?? "").trim();
      if (!rawId) continue;
      const target = byTypeAndId.get(`${expectedType}:${Number(rawId)}`);
      if (!target) {
        warnings.push({ code: "associated-model-not-found", sourceModelId: model.id, sourceModelName: model.name, targetModelId: rawId, message: `模型“${model.name}”关联的${expectedType}模型不存在。` });
        continue;
      }
      addEdge(model, target);
      addEdge(target, model);
    }
  }

  for (const record of globalLineRecords) {
    const references = modelKeysFromGlobalLineRecord(record);
    const models = allModels.filter((model) => references.some((reference) => modelMatchesReference(model, reference)));
    for (const left of models) for (const right of models) addEdge(left, right);
  }

  const byKey = new Map(allModels.map((model) => [stableModelKey(model), model]));
  const queue = selectedModels.map(stableModelKey);
  const visited = new Set(queue);
  const expandedModelKeys = [];
  while (queue.length > 0) {
    const current = queue.shift();
    for (const targetKey of adjacency.get(current) ?? []) {
      if (visited.has(targetKey)) continue;
      visited.add(targetKey);
      queue.push(targetKey);
      expandedModelKeys.push(targetKey);
    }
  }
  return {
    models: [...visited].map((key) => byKey.get(key)).filter(Boolean).sort(compareModels),
    warnings,
    expandedModelKeys
  };
}
