// /webgrp/v1 运行时态域 handler：clients 直返，其余经 WS 拉前端运行时态。
// 依赖 runtimeWs 挂载后注入的 { fetchFromClient, listClients }。
// 所有接口 query 可带 clientId（不指定取默认最近活跃客户端）。
// 运行时态实时数据：cache-control: no-store（sendV1JsonNoStore）。
//
// fetchFromClient 语义：成功 resolve(裸 data)；失败 reject(Error 带 code)。
//   - NoOnlineClientError → code "no-online-client" → 503
//   - FetchTimeoutError   → code "ws-timeout"        → 503
//   - 前端透传错误        → error.code（如 no-active-model/no-selection/internal）→ 按 v1Response 映射

import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { sendV1JsonNoStore, sendV1Error } from "./v1Response.mjs";
import { NoOnlineClientError, FetchTimeoutError } from "./runtimeRegistry.mjs";

// 预定义 E 文件接口模板（public/e-templates/ 下文件）。GET ?template= 与 POST templateName 可用。
const PREDEFINED_E_DEVICE_TEMPLATES = {
  "国网E格式": "sgcc.e",
  "主网实时库": "ems_rtdb.e",
  "配网实时库": "dms_rtdb.e",
  "台区实时库": "taiqu_rtdb.e"
};

// 模板文件目录（server/../public/e-templates/）
const E_TEMPLATE_DIR = fileURLToPath(new URL("../public/e-templates/", import.meta.url));

// 读预定义模板文件 → base64。模板可能为 UTF-8 或 GBK 编码，base64 透传原始字节，由前端 decodeAuto 兼容解码。
async function readPredefinedTemplateBase64(templateName) {
  const file = PREDEFINED_E_DEVICE_TEMPLATES[templateName];
  const buffer = await readFile(`${E_TEMPLATE_DIR}${file}`);
  return buffer.toString("base64");
}

// 轻量 JSON body 读取（与 apiV1Control 同款），上限 2MB（模板文本体量）
const E_FILE_MAX_BODY_BYTES = 2 * 1024 * 1024;

async function readJsonBody(request) {
  const chunks = [];
  let total = 0;
  for await (const chunk of request) {
    total += chunk.length;
    if (total > E_FILE_MAX_BODY_BYTES) {
      const error = new Error("请求体超过 2MB 上限。");
      error.code = "payload-too-large";
      throw error;
    }
    chunks.push(chunk);
  }
  const body = Buffer.concat(chunks).toString("utf-8");
  return body ? JSON.parse(body) : {};
}

// 取 query clientId（trim），空串视为未指定
function readClientId(url) {
  const raw = url.searchParams.get("clientId") ?? "";
  return raw.trim() || null;
}

// 统一处理 fetchFromClient reject → v1 错误响应
function handleFetchError(response, error) {
  if (error instanceof NoOnlineClientError) {
    sendV1Error(response, "no-online-client", error.message);
    return;
  }
  if (error instanceof FetchTimeoutError) {
    sendV1Error(response, "ws-timeout", error.message);
    return;
  }
  const code = error?.code ?? "internal";
  const message = error instanceof Error ? error.message : "运行时态拉取失败。";
  sendV1Error(response, code, message);
}

// 通用 JSON 透传：fetchFromClient 成功→裸 data→no-store 信封；失败→错误码映射
async function relayJson(response, fetchPromise) {
  try {
    const data = await fetchPromise;
    await sendV1JsonNoStore(response, data);
  } catch (error) {
    handleFetchError(response, error);
  }
}

// /webgrp/v1/runtime/clients —— 在线客户端列表（server 直返，不经 WS）
export function handleV1RuntimeClients({ response }, ctx) {
  try {
    const clients = ctx.listClients().map((c) => ({
      clientId: c.clientId,
      role: "editor",
      registeredAt: new Date(c.registeredAt).toISOString(),
      lastActiveAt: new Date(c.lastActiveAt).toISOString()
    }));
    sendV1JsonNoStore(response, { clients });
  } catch (error) {
    sendV1Error(response, "internal", error instanceof Error ? error.message : "后端处理失败。");
  }
}

// /webgrp/v1/runtime/model —— 当前打开模型定位
export async function handleV1RuntimeModel({ url, response }, ctx) {
  await relayJson(response, ctx.fetchFromClient(readClientId(url), "runtime.model"));
}

// /webgrp/v1/runtime/devices —— 当前模型设备清单
export async function handleV1RuntimeDevices({ url, response }, ctx) {
  await relayJson(response, ctx.fetchFromClient(readClientId(url), "runtime.devices"));
}

// /webgrp/v1/runtime/selection —— 当前选中设备
export async function handleV1RuntimeSelection({ url, response }, ctx) {
  await relayJson(response, ctx.fetchFromClient(readClientId(url), "runtime.selection"));
}

// /webgrp/v1/runtime/tabs —— 三 tab 聚合（runtime.snapshot）
export async function handleV1RuntimeTabs({ url, response }, ctx) {
  await relayJson(response, ctx.fetchFromClient(readClientId(url), "runtime.snapshot"));
}

// /webgrp/v1/runtime/tabs/{tab} —— 单 tab（tab ∈ model|tree|graph）
// pathTab 由路由 match 的命名捕获组提供（优先），否则回落 query.tab
export async function handleV1RuntimeTab({ url, response }, ctx, pathTab) {
  const tab = (pathTab ?? url.searchParams.get("tab") ?? "").trim();
  if (tab && tab !== "model" && tab !== "tree" && tab !== "graph") {
    sendV1Error(response, "bad-request", "tab 须为 model|tree|graph。");
    return;
  }
  await relayJson(response, ctx.fetchFromClient(readClientId(url), "runtime.tab", { tab: tab || "model" }));
}

// /webgrp/v1/runtime/screenshot —— PNG 二进制
export async function handleV1RuntimeScreenshot({ url, response }, ctx) {
  const clientId = readClientId(url);
  const width = url.searchParams.get("width");
  const height = url.searchParams.get("height");
  const params = {};
  if (width !== null) {
    const n = Number(width);
    if (!Number.isFinite(n) || n <= 0) {
      sendV1Error(response, "bad-request", "width 须为正数。");
      return;
    }
    params.width = n;
  }
  if (height !== null) {
    const n = Number(height);
    if (!Number.isFinite(n) || n <= 0) {
      sendV1Error(response, "bad-request", "height 须为正数。");
      return;
    }
    params.height = n;
  }
  try {
    const data = await ctx.fetchFromClient(clientId, "runtime.screenshot", params);
    const base64 = data?.base64 ?? "";
    const buffer = Buffer.from(base64, "base64");
    response.writeHead(200, {
      "content-type": "image/png",
      "cache-control": "no-store",
      "access-control-allow-origin": "*"
    });
    response.end(buffer);
  } catch (error) {
    handleFetchError(response, error);
  }
}

// /webgrp/v1/runtime/svg —— SVG 文本
export async function handleV1RuntimeSvg({ url, response }, ctx) {
  try {
    const data = await ctx.fetchFromClient(readClientId(url), "runtime.svg");
    const svg = String(data ?? "");
    response.writeHead(200, {
      "content-type": "image/svg+xml; charset=utf-8",
      "cache-control": "no-store",
      "access-control-allow-origin": "*"
    });
    response.end(svg);
  } catch (error) {
    handleFetchError(response, error);
  }
}

// /webgrp/v1/runtime/e-file —— E 文件文本
// 可选 query: template=预定义模板名（国网E格式|主网实时库|配网实时库|台区实时库）；
// 指定后由前端按该模板生成（纯后台计算，不影响前端当前模板状态）。
export async function handleV1RuntimeEFile({ url, response }, ctx) {
  try {
    let params;
    const templateName = (url.searchParams.get("template") ?? "").trim();
    if (templateName) {
      if (!PREDEFINED_E_DEVICE_TEMPLATES[templateName]) {
        sendV1Error(
          response,
          "bad-request",
          `未知模板：${templateName}。可用模板：${Object.keys(PREDEFINED_E_DEVICE_TEMPLATES).join("、")}`
        );
        return;
      }
      params = { templateName, templateData: await readPredefinedTemplateBase64(templateName) };
    }
    const data = await ctx.fetchFromClient(readClientId(url), "runtime.e-file", params);
    const text = String(data?.text ?? "");
    const filename = String(data?.filename ?? "model.e");
    response.writeHead(200, {
      "content-type": "text/plain; charset=utf-8",
      "content-disposition": `attachment; filename="${encodeURIComponent(filename)}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
      "cache-control": "no-store",
      "access-control-allow-origin": "*"
    });
    response.end(text);
  } catch (error) {
    handleFetchError(response, error);
  }
}

// /webgrp/v1/runtime/e-file (POST) —— 指定模板文本生成 E 文件
// body: { templateText: "<ACLoad ...>...</ACLoad>", templateName?: "用于模板类型校验的错误提示" }
// 同 GET?template=，模板解析与导出计算均在前端纯函数内完成，不读写前端当前模板状态。
export async function handleV1RuntimeEFilePost({ request, response, url }, ctx) {
  try {
    const body = await readJsonBody(request);
    const templateText = typeof body?.templateText === "string" ? body.templateText : "";
    if (!templateText.trim()) {
      sendV1Error(response, "bad-request", "body.templateText 不能为空。");
      return;
    }
    const templateName = typeof body?.templateName === "string" ? body.templateName.trim() : "";
    const data = await ctx.fetchFromClient(readClientId(url), "runtime.e-file", {
      templateName: templateName || undefined,
      templateData: Buffer.from(templateText, "utf8").toString("base64")
    });
    const text = String(data?.text ?? "");
    const filename = String(data?.filename ?? "model.e");
    response.writeHead(200, {
      "content-type": "text/plain; charset=utf-8",
      "content-disposition": `attachment; filename="${encodeURIComponent(filename)}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
      "cache-control": "no-store",
      "access-control-allow-origin": "*"
    });
    response.end(text);
  } catch (error) {
    if (error?.code === "payload-too-large") {
      sendV1Error(response, "payload-too-large", error.message);
      return;
    }
    if (error instanceof SyntaxError) {
      sendV1Error(response, "bad-request", "请求体不是合法 JSON。");
      return;
    }
    handleFetchError(response, error);
  }
}

import { apiPattern } from "./config.mjs";

// 构造 v1 运行时态路由表。ctx = { fetchFromClient, listClients }
// handle 签名：({ request, response, url, match }, ctx) => Promise<void>
// match 为路由 pattern.exec(pathname) 结果，命名捕获组在 match.groups
export function createV1RuntimeRoutes(ctx) {
  const wrap = (handler) => ({ request, response, url, match }) =>
    handler({ request, response, url }, ctx, match?.groups?.tab);
  return [
    { method: "GET", pattern: apiPattern("/v1/runtime/clients", "/?$"), handle: wrap(handleV1RuntimeClients) },
    { method: "GET", pattern: apiPattern("/v1/runtime/model", "/?$"), handle: wrap(handleV1RuntimeModel) },
    { method: "GET", pattern: apiPattern("/v1/runtime/devices", "/?$"), handle: wrap(handleV1RuntimeDevices) },
    { method: "GET", pattern: apiPattern("/v1/runtime/selection", "/?$"), handle: wrap(handleV1RuntimeSelection) },
    { method: "GET", pattern: apiPattern("/v1/runtime/tabs", "/?$"), handle: wrap(handleV1RuntimeTabs) },
    { method: "GET", pattern: apiPattern("/v1/runtime/tabs/", "(?<tab>model|tree|graph)/?$"), handle: wrap(handleV1RuntimeTab) },
    { method: "GET", pattern: apiPattern("/v1/runtime/screenshot", "/?$"), handle: wrap(handleV1RuntimeScreenshot) },
    { method: "GET", pattern: apiPattern("/v1/runtime/svg", "/?$"), handle: wrap(handleV1RuntimeSvg) },
    { method: "GET", pattern: apiPattern("/v1/runtime/e-file", "/?$"), handle: wrap(handleV1RuntimeEFile) },
    { method: "POST", pattern: apiPattern("/v1/runtime/e-file", "/?$"), handle: wrap(handleV1RuntimeEFilePost) }
  ];
}
