#!/usr/bin/env node

/**
 * Runtime-first contract probe for the webgrp-api skill.
 *
 * It checks read endpoints with real requests and probes write routes with
 * deliberately invalid, non-mutating payloads. Static source analysis belongs
 * to the skill runner and should be used only for failed/skipped probes.
 */

const DEFAULT_BASE_URL = process.env.WEBGRP_BASE_URL || "http://127.0.0.1:5174";
const DEFAULT_SPACE = process.env.WEBGRP_SPACE || "default";
const DEFAULT_FRONTEND_BASE = process.env.WEBGRP_FRONTEND_BASE || "/app";
const DEFAULT_TIMEOUT_MS = Number(process.env.WEBGRP_API_TIMEOUT_MS || 8_000);

function parseArgs(argv) {
  const options = {
    baseUrl: DEFAULT_BASE_URL,
    space: DEFAULT_SPACE,
    frontendBase: DEFAULT_FRONTEND_BASE,
    timeoutMs: Number.isFinite(DEFAULT_TIMEOUT_MS) && DEFAULT_TIMEOUT_MS > 0 ? DEFAULT_TIMEOUT_MS : 8_000,
    report: "",
    help: false
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--help" || arg === "-h") {
      options.help = true;
      continue;
    }
    const [key, inlineValue] = arg.split("=", 2);
    const readValue = () => inlineValue ?? argv[++index];
    if (key === "--base-url") options.baseUrl = readValue();
    else if (key === "--space") options.space = readValue();
    else if (key === "--frontend-base") options.frontendBase = readValue();
    else if (key === "--timeout-ms") options.timeoutMs = Number(readValue());
    else if (key === "--report") options.report = readValue();
    else throw new Error(`未知参数：${arg}`);
  }
  return options;
}

function printHelp() {
  console.log(`webgrp-api runtime check

Usage:
  node scripts/check-api.mjs [options]

Options:
  --base-url <url>        Backend base URL (default: ${DEFAULT_BASE_URL})
  --space <id>            Space id for gmp_space (default: ${DEFAULT_SPACE})
  --frontend-base <path>  Static frontend base (default: ${DEFAULT_FRONTEND_BASE})
  --timeout-ms <ms>       Request timeout (default: ${DEFAULT_TIMEOUT_MS})
  --report <path>         Write JSON runtime report to this path
  --help                  Show this help

Write endpoints use invalid or missing payloads by default so the probe does not
create, rename, delete, upload, import, or overwrite user data.
`);
}

function apiUrl(baseUrl, path) {
  return new URL(path, `${baseUrl.replace(/\/+$/u, "")}/`).toString();
}

function encodedSpaceCookie(space) {
  return `gmp_space=${encodeURIComponent(space)}`;
}

function normalizeFrontendBase(value) {
  const raw = String(value || "/").trim();
  if (!raw || raw === "/") return "";
  return `/${raw.replace(/^\/+|\/+$/gu, "")}`;
}

function jsonHeaders() {
  return {
    accept: "application/json",
    "content-type": "application/json; charset=utf-8"
  };
}

function parseJson(text) {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function errorShape(payload) {
  if (!payload || typeof payload !== "object") return false;
  if (typeof payload.error === "string") return true;
  return Boolean(payload.error && typeof payload.error === "object" && typeof payload.error.message === "string");
}

function isObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isImageMime(mime) {
  return /^image\/(png|jpeg|webp|gif|svg\+xml)/iu.test(String(mime || ""));
}

function isZipMime(mime) {
  return /zip|octet-stream/iu.test(String(mime || ""));
}

function responseShape(value, depth = 0) {
  if (value === null) return "null";
  if (depth > 2) return Array.isArray(value) ? "array" : typeof value;
  if (Array.isArray(value)) {
    return { type: "array", count: value.length, item: value.length ? responseShape(value[0], depth + 1) : null };
  }
  if (typeof value !== "object") return typeof value;
  const keys = Object.keys(value);
  return {
    type: "object",
    keyCount: keys.length,
    keys: keys.slice(0, 100),
    nested: Object.fromEntries(Object.entries(value).filter(([, item]) => item && typeof item === "object").slice(0, 40).map(([key, item]) => [key, responseShape(item, depth + 1)]))
  };
}

function resultBase(endpoint, url) {
  return {
    id: endpoint.id,
    method: endpoint.method,
    path: endpoint.path,
    url,
    kind: endpoint.kind,
    status: "pending",
    passed: false,
    staticAuditRequired: false,
    evidence: ""
  };
}

async function request(baseUrl, endpoint, options, timeoutMs) {
  const url = apiUrl(baseUrl, endpoint.path);
  const result = resultBase(endpoint, url);
  const started = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    const text = await response.text();
    const payload = parseJson(text);
    const contentType = response.headers.get("content-type") || "";
    result.statusCode = response.status;
    result.contentType = contentType;
    result.bytes = Buffer.byteLength(text, "utf8");
    result.elapsedMs = Date.now() - started;
    result.payloadShape = payload === null ? (text ? "text/binary" : "empty") : Array.isArray(payload) ? "array" : typeof payload;
    result.responseShape = responseShape(payload);
    if (payload === null && text) result.responsePreview = text.slice(0, 500);
    return { response, payload, text, result };
  } catch (error) {
    result.status = error?.name === "AbortError" ? "timeout" : "request-error";
    result.elapsedMs = Date.now() - started;
    result.error = error instanceof Error ? error.message : String(error);
    result.staticAuditRequired = true;
    return { response: null, payload: null, text: "", result };
  } finally {
    clearTimeout(timer);
  }
}

function finish(result, passed, evidence, status = passed ? "passed" : "failed") {
  result.status = status;
  result.passed = passed;
  result.evidence = evidence;
  if (!passed) result.staticAuditRequired = true;
  return result;
}

function validateJsonStatus(probe, expectedStatuses, predicate, description) {
  const { response, payload, result } = probe;
  if (!response) return finish(result, false, result.error || "请求未返回响应。");
  if (!expectedStatuses.includes(response.status)) {
    return finish(result, false, `期望 HTTP ${expectedStatuses.join("/")}，实际 HTTP ${response.status}。`);
  }
  if (!predicate(payload)) return finish(result, false, `响应不符合：${description}`);
  return finish(result, true, `HTTP ${response.status}，${description}`);
}

function validateSafeWrite(probe, expectedStatuses = [400, 404, 409]) {
  const { response, payload, result } = probe;
  if (!response) return finish(result, false, result.error || "请求未返回响应。");
  if (!expectedStatuses.includes(response.status)) {
    return finish(result, false, `安全探针期望 HTTP ${expectedStatuses.join("/")}，实际 HTTP ${response.status}。`);
  }
  if (!errorShape(payload)) return finish(result, false, "错误响应缺少 error 字段。");
  return finish(result, true, `HTTP ${response.status}，返回错误契约且未执行有效写入。`);
}

function expectedErrorProbe(id, method, path, body) {
  return { id, method, path, kind: "safe-write", body };
}

async function run(options) {
  const baseUrl = options.baseUrl.replace(/\/+$/u, "");
  const cookie = encodedSpaceCookie(options.space);
  const results = [];
  const context = { spaceId: options.space, schemes: null, project: null, folders: null, images: null };

  const doGet = async (endpoint, validator, requestOptions = {}) => {
    const probe = await request(baseUrl, endpoint, {
      method: "GET",
      headers: { accept: "application/json", cookie, ...requestOptions.headers }
    }, options.timeoutMs);
    results.push(validator(probe));
    return probe;
  };
  const doSafeWrite = async endpoint => {
    const probe = await request(baseUrl, endpoint, {
      method: endpoint.method,
      headers: { ...jsonHeaders(), cookie },
      body: endpoint.body
    }, options.timeoutMs);
    results.push(validateSafeWrite(probe));
  };

  const spacesProbe = await doGet(
    { id: "spaces.list", method: "GET", path: "/webgrp/spaces", kind: "space" },
    probe => {
      const output = validateJsonStatus(probe, [200], value => isObject(value) && Array.isArray(value.spaces) && typeof value.current === "string", "spaces 数组和 current 字段");
      if (probe.payload && Array.isArray(probe.payload.spaces)) context.spaces = probe.payload.spaces;
      return output;
    }
  );

  const schemesProbe = await doGet(
    { id: "schemes.list", method: "GET", path: "/webgrp/schemes", kind: "scheme" },
    probe => {
      const output = validateJsonStatus(probe, [200], value => isObject(value) && Array.isArray(value.schemes), "schemes 数组");
      if (probe.payload && Array.isArray(probe.payload.schemes)) context.schemes = probe.payload.schemes;
      return output;
    }
  );

  const firstProject = (() => {
    const walk = (items, parentPath = []) => {
      for (const scheme of items || []) {
        const path = [...parentPath, String(scheme?.name || "")].filter(Boolean);
        const project = Array.isArray(scheme?.projects) ? scheme.projects[0] : null;
        if (project?.name) return { schemePath: path, name: project.name, schemeId: scheme.schemeId };
        const nested = walk(scheme?.children, path);
        if (nested) return nested;
      }
      return null;
    };
    return walk(context.schemes);
  })();

  const foldersProbe = await doGet(
    { id: "image-folders.list", method: "GET", path: "/webgrp/image-folders", kind: "image" },
    probe => {
      const output = validateJsonStatus(probe, [200], value => Array.isArray(value), "图片文件夹数组");
      if (Array.isArray(probe.payload)) context.folders = probe.payload;
      return output;
    }
  );

  const folderId = context.folders?.[0]?.id || "root";
  const imagesProbe = await doGet(
    { id: "images.list", method: "GET", path: `/webgrp/images?folderId=${encodeURIComponent(folderId)}`, kind: "image" },
    probe => {
      const output = validateJsonStatus(probe, [200], value => Array.isArray(value), "图片资源数组");
      if (Array.isArray(probe.payload)) context.images = probe.payload;
      return output;
    }
  );

  await doGet({ id: "color-config.get", method: "GET", path: "/webgrp/color-config", kind: "config" }, probe =>
    validateJsonStatus(probe, [200], value => isObject(value) && typeof value.exists === "boolean" && typeof value.colorDisplayMode === "string" && isObject(value.colorPalette), "exists、colorDisplayMode 和 colorPalette"));
  await doGet({ id: "device-library.get", method: "GET", path: "/webgrp/device-library", kind: "config" }, probe =>
    validateJsonStatus(probe, [200], value => isObject(value) && typeof value.exists === "boolean" && typeof value.schemaVersion === "number" && isObject(value.deviceDefinitionOverrides), "图元库配置对象"));
  await doGet({ id: "measurement-config.get", method: "GET", path: "/webgrp/measurement-config", kind: "config" }, probe =>
    validateJsonStatus(probe, [200], value => isObject(value) && typeof value.exists === "boolean" && isObject(value.groupDefaults) && Array.isArray(value.measurementTypes) && Array.isArray(value.deviceProfiles), "量测配置结构"));
  await doGet({ id: "symbol-export-schemes.get", method: "GET", path: "/webgrp/symbol-export-schemes", kind: "config" }, probe =>
    validateJsonStatus(probe, [200], value => isObject(value) && Array.isArray(value.schemes) && typeof value.exists === "boolean", "Symbol 方案结构"));
  await doGet({ id: "interface-customization.get", method: "GET", path: "/webgrp/interface-customization", kind: "extra-contract-gap" }, probe =>
    validateJsonStatus(probe, [200], value => isObject(value) && typeof value.schemaVersion === "number" && isObject(value.buttons) && isObject(value.modules), "界面定制配置结构"));
  await doGet({ id: "global-lines.list", method: "GET", path: "/webgrp/global-lines", kind: "global-line" }, probe =>
    validateJsonStatus(probe, [200], value => isObject(value) && value.ok === true && Array.isArray(value.records), "ok 和 records 字段"));

  if (firstProject) {
    const selector = `schemePath=${encodeURIComponent(JSON.stringify(firstProject.schemePath))}&name=${encodeURIComponent(firstProject.name)}`;
    await doGet({ id: "scheme-project.get", method: "GET", path: `/webgrp/schemes/project?${selector}`, kind: "scheme" }, probe =>
      validateJsonStatus(probe, [200], value => isObject(value) && value.ok === true && isObject(value.project), "ok 和完整 project 对象"));
    await doGet({ id: "scheme-export.get", method: "GET", path: `/webgrp/schemes/export?${selector.split("&name=")[0]}`, kind: "scheme" }, probe => {
      const { response, result } = probe;
      if (!response) return finish(result, false, result.error || "请求未返回响应。");
      const mime = response.headers.get("content-type") || "";
      if (response.status !== 200 || !isZipMime(mime)) return finish(result, false, `期望 ZIP 200，实际 ${response.status} ${mime}`);
      return finish(result, true, "HTTP 200，返回 ZIP 二进制。");
    });
  } else {
    for (const endpoint of [
      { id: "scheme-project.get", method: "GET", path: "/webgrp/schemes/project", kind: "scheme" },
      { id: "scheme-export.get", method: "GET", path: "/webgrp/schemes/export", kind: "scheme" }
    ]) {
      const result = resultBase(endpoint, apiUrl(baseUrl, endpoint.path));
      results.push(finish(result, false, "没有可用的方案/模型 fixture，无法做有效读取验证。", "skipped"));
    }
  }

  if (context.images?.[0]?.id) {
    const imageId = encodeURIComponent(context.images[0].id);
    await doGet({ id: "image.get", method: "GET", path: `/webgrp/images/${imageId}`, kind: "image" }, probe => {
      const { response, result } = probe;
      if (!response) return finish(result, false, result.error || "请求未返回响应。");
      const mime = response.headers.get("content-type") || "";
      if (response.status !== 200 || !isImageMime(mime)) return finish(result, false, `期望图片 200，实际 ${response.status} ${mime}`);
      return finish(result, true, `HTTP 200，返回 ${mime} 二进制。`);
    });
  } else {
    const endpoint = { id: "image.get", method: "GET", path: "/webgrp/images/__webgrp_check_missing_image__", kind: "image" };
    const result = resultBase(endpoint, apiUrl(baseUrl, endpoint.path));
    results.push(finish(result, false, "图片清单为空，未执行有效图片下载验证。", "skipped"));
  }

  const safeWrites = [
    expectedErrorProbe("spaces.initialize.safe", "POST", "/webgrp/spaces/initialize", JSON.stringify({})),
    expectedErrorProbe("spaces.create.safe", "POST", "/webgrp/spaces", JSON.stringify({})),
    expectedErrorProbe("spaces.rename.safe", "PUT", "/webgrp/spaces", JSON.stringify({})),
    expectedErrorProbe("spaces.delete.safe", "DELETE", "/webgrp/spaces", JSON.stringify({ id: "__webgrp_check_missing_space__" })),
    expectedErrorProbe("schemes.project.save.safe", "PUT", "/webgrp/schemes/project", JSON.stringify({})),
    expectedErrorProbe("schemes.project.delete.safe", "DELETE", "/webgrp/schemes/project", JSON.stringify({})),
    expectedErrorProbe("schemes.scheme.save.safe", "PUT", "/webgrp/schemes/scheme", JSON.stringify({})),
    expectedErrorProbe("schemes.scheme.delete.safe", "DELETE", "/webgrp/schemes/scheme", JSON.stringify({})),
    expectedErrorProbe("schemes.import.safe", "POST", "/webgrp/schemes/import?parentPath=%5B%5D&fileName=check.zip&mode=check", ""),
    expectedErrorProbe("image-folder.create.safe", "POST", "/webgrp/image-folders", JSON.stringify({})),
    expectedErrorProbe("image-folder.rename.safe", "PUT", "/webgrp/image-folders/root", JSON.stringify({ name: "__webgrp_check__" })),
    expectedErrorProbe("image-folder.delete.safe", "DELETE", "/webgrp/image-folders/root", undefined),
    expectedErrorProbe("image.upload.safe", "POST", "/webgrp/images", JSON.stringify({})),
    expectedErrorProbe("image.delete.safe", "DELETE", "/webgrp/images/__webgrp_check_missing_image__", undefined),
    expectedErrorProbe("icon-library.import.safe", "POST", "/webgrp/icon-library/import", JSON.stringify({})),
    expectedErrorProbe("image-library.import.safe", "POST", "/webgrp/image-library/import", JSON.stringify({ folders: [], assets: [] })),
    expectedErrorProbe("color-config.save.safe", "PUT", "/webgrp/color-config", "{"),
    expectedErrorProbe("device-library.save.safe", "PUT", "/webgrp/device-library", "{"),
    expectedErrorProbe("measurement-config.save.safe", "PUT", "/webgrp/measurement-config", "{"),
    expectedErrorProbe("symbol-export-schemes.save.safe", "PUT", "/webgrp/symbol-export-schemes", "{"),
    expectedErrorProbe("interface-customization.save.safe", "PUT", "/webgrp/interface-customization", "{")
  ];
  for (const endpoint of safeWrites) {
    await doSafeWrite(endpoint);
  }

  const staticBase = normalizeFrontendBase(options.frontendBase);
  for (const path of [
    `${staticBase}/icon-library/catalog.json`,
    `${staticBase}/icon-library/open-source-svg/manifest.json`
  ]) {
    await doGet({ id: `static:${path}`, method: "GET", path, kind: "static" }, probe =>
      validateJsonStatus(probe, [200], value => isObject(value), "静态 JSON 资源对象"), { headers: { cookie: "" } });
  }

  const summary = {
    generatedAt: new Date().toISOString(),
    baseUrl,
    space: options.space,
    mode: "runtime-first-safe-probes",
    writeMutation: false,
    totals: {
      total: results.length,
      passed: results.filter(item => item.status === "passed").length,
      failed: results.filter(item => item.status === "failed").length,
      skipped: results.filter(item => item.status === "skipped").length,
      staticAuditRequired: results.filter(item => item.staticAuditRequired).length
    },
    results
  };
  return summary;
}

async function main() {
  let options;
  try {
    options = parseArgs(process.argv.slice(2));
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 2;
    return;
  }
  if (options.help) {
    printHelp();
    return;
  }
  if (!Number.isFinite(options.timeoutMs) || options.timeoutMs <= 0) {
    console.error("--timeout-ms 必须是正数。");
    process.exitCode = 2;
    return;
  }
  const summary = await run(options);
  const serialized = JSON.stringify(summary, null, 2);
  if (options.report) {
    const { mkdir, writeFile } = await import("node:fs/promises");
    const { dirname } = await import("node:path");
    await mkdir(dirname(options.report), { recursive: true });
    await writeFile(options.report, `${serialized}\n`, "utf8");
  }
  console.log(serialized);
  process.exitCode = summary.totals.failed > 0 ? 1 : 0;
}

await main();
