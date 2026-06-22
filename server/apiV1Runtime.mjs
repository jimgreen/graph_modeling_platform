// /api/v1 运行时态域 handler：clients 直返，其余经 WS 拉前端运行时态。
// 依赖 runtimeWs 挂载后注入的 { fetchFromClient, listClients }。
// 所有接口 query 可带 clientId（不指定取默认最近活跃客户端）。
// 运行时态实时数据：cache-control: no-store（sendV1JsonNoStore）。
//
// fetchFromClient 语义：成功 resolve(裸 data)；失败 reject(Error 带 code)。
//   - NoOnlineClientError → code "no-online-client" → 503
//   - FetchTimeoutError   → code "ws-timeout"        → 503
//   - 前端透传错误        → error.code（如 no-active-model/no-selection/internal）→ 按 v1Response 映射

import { sendV1JsonNoStore, sendV1Error } from "./v1Response.mjs";
import { NoOnlineClientError, FetchTimeoutError } from "./runtimeRegistry.mjs";

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

// /api/v1/runtime/clients —— 在线客户端列表（server 直返，不经 WS）
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

// /api/v1/runtime/model —— 当前打开模型定位
export async function handleV1RuntimeModel({ url, response }, ctx) {
  await relayJson(response, ctx.fetchFromClient(readClientId(url), "runtime.model"));
}

// /api/v1/runtime/devices —— 当前模型设备清单
export async function handleV1RuntimeDevices({ url, response }, ctx) {
  await relayJson(response, ctx.fetchFromClient(readClientId(url), "runtime.devices"));
}

// /api/v1/runtime/selection —— 当前选中设备
export async function handleV1RuntimeSelection({ url, response }, ctx) {
  await relayJson(response, ctx.fetchFromClient(readClientId(url), "runtime.selection"));
}

// /api/v1/runtime/tabs —— 三 tab 聚合（runtime.snapshot）
export async function handleV1RuntimeTabs({ url, response }, ctx) {
  await relayJson(response, ctx.fetchFromClient(readClientId(url), "runtime.snapshot"));
}

// /api/v1/runtime/tabs/{tab} —— 单 tab（tab ∈ model|tree|graph）
// pathTab 由路由 match 的命名捕获组提供（优先），否则回落 query.tab
export async function handleV1RuntimeTab({ url, response }, ctx, pathTab) {
  const tab = (pathTab ?? url.searchParams.get("tab") ?? "").trim();
  if (tab && tab !== "model" && tab !== "tree" && tab !== "graph") {
    sendV1Error(response, "bad-request", "tab 须为 model|tree|graph。");
    return;
  }
  await relayJson(response, ctx.fetchFromClient(readClientId(url), "runtime.tab", { tab: tab || "model" }));
}

// /api/v1/runtime/screenshot —— PNG 二进制
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

// /api/v1/runtime/svg —— SVG 文本
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

// /api/v1/runtime/e-file —— E 文件文本
export async function handleV1RuntimeEFile({ url, response }, ctx) {
  try {
    const data = await ctx.fetchFromClient(readClientId(url), "runtime.e-file");
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

// 构造 v1 运行时态路由表。ctx = { fetchFromClient, listClients }
// handle 签名：({ request, response, url, match }, ctx) => Promise<void>
// match 为路由 pattern.exec(pathname) 结果，命名捕获组在 match.groups
export function createV1RuntimeRoutes(ctx) {
  const wrap = (handler) => ({ request, response, url, match }) =>
    handler({ request, response, url }, ctx, match?.groups?.tab);
  return [
    { method: "GET", pattern: /^\/api\/v1\/runtime\/clients\/?$/u, handle: wrap(handleV1RuntimeClients) },
    { method: "GET", pattern: /^\/api\/v1\/runtime\/model\/?$/u, handle: wrap(handleV1RuntimeModel) },
    { method: "GET", pattern: /^\/api\/v1\/runtime\/devices\/?$/u, handle: wrap(handleV1RuntimeDevices) },
    { method: "GET", pattern: /^\/api\/v1\/runtime\/selection\/?$/u, handle: wrap(handleV1RuntimeSelection) },
    { method: "GET", pattern: /^\/api\/v1\/runtime\/tabs\/?$/u, handle: wrap(handleV1RuntimeTabs) },
    { method: "GET", pattern: /^\/api\/v1\/runtime\/tabs\/(?<tab>model|tree|graph)\/?$/u, handle: wrap(handleV1RuntimeTab) },
    { method: "GET", pattern: /^\/api\/v1\/runtime\/screenshot\/?$/u, handle: wrap(handleV1RuntimeScreenshot) },
    { method: "GET", pattern: /^\/api\/v1\/runtime\/svg\/?$/u, handle: wrap(handleV1RuntimeSvg) },
    { method: "GET", pattern: /^\/api\/v1\/runtime\/e-file\/?$/u, handle: wrap(handleV1RuntimeEFile) }
  ];
}
