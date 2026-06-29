// /api/v1 控制台写操作域 handler：经 WS 双向指令通道下发到前端 __appScope 程序化方法。
// 依赖 runtimeWs 挂载后注入的 { sendCommandToClient }。
// 所有接口 POST + JSON body，query 可带 clientId（不指定取默认最近活跃客户端）。
// 写操作实时执行：no-store 信封。
//
// sendCommandToClient 语义：成功 resolve(裸 data)；失败 reject(Error 带 code)。
//   - NoOnlineClientError   → code "no-online-client" → 503
//   - CommandTimeoutError   → code "ws-timeout"        → 503
//   - 前端透传错误          → error.code（如 bad-request/control-failed/internal）→ 按 v1Response 映射

import { sendV1JsonNoStore, sendV1Error } from "./v1Response.mjs";
import { NoOnlineClientError, CommandTimeoutError } from "./runtimeRegistry.mjs";

// 取 query clientId（trim），空串视为未指定
function readClientId(url) {
  const raw = url.searchParams.get("clientId") ?? "";
  return raw.trim() || null;
}

// 轻量 JSON body 读取（control 模块自包含，不依赖 image-server 内部 readJsonBody）
async function readJsonBody(request) {
  const chunks = [];
  for await (const chunk of request) {
    chunks.push(chunk);
  }
  const body = Buffer.concat(chunks).toString("utf-8");
  return body ? JSON.parse(body) : {};
}

// 统一处理 sendCommandToClient reject → v1 错误响应
function handleCommandError(response, error) {
  if (error instanceof NoOnlineClientError) {
    sendV1Error(response, "no-online-client", error.message);
    return;
  }
  if (error instanceof CommandTimeoutError) {
    sendV1Error(response, "ws-timeout", error.message);
    return;
  }
  const code = error?.code ?? "control-failed";
  const message = error instanceof Error ? error.message : "前端指令执行失败。";
  sendV1Error(response, code, message);
}

// 通用指令下发：sendCommandToClient 成功→裸 data→no-store 信封；失败→错误码映射
async function relayCommand(response, commandPromise) {
  try {
    const data = await commandPromise;
    await sendV1JsonNoStore(response, data);
  } catch (error) {
    handleCommandError(response, error);
  }
}

// /api/v1/control/device/add —— 新增图元
// body: { kind, x?, y?, attrs? } → 回执 { id }
export async function handleControlDeviceAdd({ request, url, response }, ctx) {
  let payload;
  try {
    payload = await readJsonBody(request);
  } catch {
    sendV1Error(response, "bad-request", "请求体须为合法 JSON。");
    return;
  }
  const { kind, x, y, attrs } = payload ?? {};
  if (!kind || typeof kind !== "string") {
    sendV1Error(response, "bad-request", "kind 必填。");
    return;
  }
  const params = { kind };
  if (x !== undefined) {
    params.x = Number(x);
  }
  if (y !== undefined) {
    params.y = Number(y);
  }
  if (attrs !== undefined) {
    params.attrs = attrs;
  }
  await relayCommand(response, ctx.sendCommandToClient(readClientId(url), "control.device.add", params));
}

// 构造 v1 控制台路由表。ctx = { sendCommandToClient }
// handle 签名：({ request, response, url, match }, ctx) => Promise<void>
export function createV1ControlRoutes(ctx) {
  const wrap = (handler) => ({ request, response, url, match }) =>
    handler({ request, response, url }, ctx);
  return [
    { method: "POST", pattern: /^\/api\/v1\/control\/device\/add\/?$/u, handle: wrap(handleControlDeviceAdd) }
  ];
}
