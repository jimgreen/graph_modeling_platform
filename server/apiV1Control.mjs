// /webgrp/v1 控制台写操作域 handler：经 WS 双向指令通道下发到前端 __appScope 程序化方法。
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

// /webgrp/v1/control/device/add —— 新增图元
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

// /webgrp/v1/control/scheme/create —— 新建方案
// body: { name, parentSchemeId? } → 回执 { id, name, path }
export async function handleControlSchemeCreate({ request, url, response }, ctx) {
  let payload;
  try {
    payload = await readJsonBody(request);
  } catch {
    sendV1Error(response, "bad-request", "请求体须为合法 JSON。");
    return;
  }
  const { name, parentSchemeId } = payload ?? {};
  if (!name || typeof name !== "string" || !name.trim()) {
    sendV1Error(response, "bad-request", "name 必填。");
    return;
  }
  const params = { name };
  if (parentSchemeId !== undefined) {
    params.parentSchemeId = parentSchemeId;
  }
  await relayCommand(response, ctx.sendCommandToClient(readClientId(url), "control.scheme.create", params));
}

// /webgrp/v1/control/model/create —— 新建模型
// body: { name, schemeId? } → 回执 { id, name, schemeId }
export async function handleControlModelCreate({ request, url, response }, ctx) {
  let payload;
  try {
    payload = await readJsonBody(request);
  } catch {
    sendV1Error(response, "bad-request", "请求体须为合法 JSON。");
    return;
  }
  const { name, schemeId } = payload ?? {};
  if (!name || typeof name !== "string" || !name.trim()) {
    sendV1Error(response, "bad-request", "name 必填。");
    return;
  }
  const params = { name };
  if (schemeId !== undefined) {
    params.schemeId = schemeId;
  }
  await relayCommand(response, ctx.sendCommandToClient(readClientId(url), "control.model.create", params));
}

// /webgrp/v1/control/devices/select —— 选中图元
// body: { ids: string[], mode?: "set" | "add" | "toggle" } → 回执 { selectedIds }
export async function handleControlDevicesSelect({ request, url, response }, ctx) {
  let payload;
  try {
    payload = await readJsonBody(request);
  } catch {
    sendV1Error(response, "bad-request", "请求体须为合法 JSON。");
    return;
  }
  const { ids, mode } = payload ?? {};
  if (!Array.isArray(ids)) {
    sendV1Error(response, "bad-request", "ids 须为字符串数组。");
    return;
  }
  const params = { ids };
  if (mode !== undefined) {
    params.mode = mode;
  }
  await relayCommand(response, ctx.sendCommandToClient(readClientId(url), "control.devices.select", params));
}

// /webgrp/v1/control/devices/group —— 将当前选中图元组合
// 无 body → 回执 { groupId, name }
export async function handleControlDevicesGroup({ url, response }, ctx) {
  await relayCommand(response, ctx.sendCommandToClient(readClientId(url), "control.devices.group", {}));
}

// /webgrp/v1/control/device/delete —— 删除图元
// body: { ids?: string[] } → 回执 { deletedIds }；ids 缺省取当前选中
export async function handleControlDeviceDelete({ request, url, response }, ctx) {
  let payload;
  try {
    payload = await readJsonBody(request);
  } catch {
    sendV1Error(response, "bad-request", "请求体须为合法 JSON。");
    return;
  }
  const { ids } = payload ?? {};
  const params = {};
  if (ids !== undefined) {
    if (!Array.isArray(ids)) {
      sendV1Error(response, "bad-request", "ids 须为字符串数组。");
      return;
    }
    params.ids = ids;
  }
  await relayCommand(response, ctx.sendCommandToClient(readClientId(url), "control.device.delete", params));
}

// /webgrp/v1/control/device/property/update —— 修改图元属性
// body: { id, category: "graphic"|"model"|"measurement", patch } → 回执 { id, category, patched }
export async function handleControlDevicePropertyUpdate({ request, url, response }, ctx) {
  let payload;
  try {
    payload = await readJsonBody(request);
  } catch {
    sendV1Error(response, "bad-request", "请求体须为合法 JSON。");
    return;
  }
  const { id, category, patch } = payload ?? {};
  if (!id || typeof id !== "string") {
    sendV1Error(response, "bad-request", "id 必填。");
    return;
  }
  if (!category || typeof category !== "string") {
    sendV1Error(response, "bad-request", "category 必填。");
    return;
  }
  if (!patch || typeof patch !== "object") {
    sendV1Error(response, "bad-request", "patch 须为对象。");
    return;
  }
  await relayCommand(response, ctx.sendCommandToClient(readClientId(url), "control.device.property.update", { id, category, patch }));
}

// /webgrp/v1/control/save —— 显式落盘
// body: { scope: "currentModel"|"schemeTree" } → 回执 { saved: true, scope }
export async function handleControlSave({ request, url, response }, ctx) {
  let payload;
  try {
    payload = await readJsonBody(request);
  } catch {
    sendV1Error(response, "bad-request", "请求体须为合法 JSON。");
    return;
  }
  const { scope } = payload ?? {};
  if (scope !== "currentModel" && scope !== "schemeTree") {
    sendV1Error(response, "bad-request", "scope 须为 currentModel 或 schemeTree。");
    return;
  }
  await relayCommand(response, ctx.sendCommandToClient(readClientId(url), "control.save", { scope }));
}

// /webgrp/v1/control/template/saveFromSelection —— 从选中组合保存为模板
// body: { name, componentLibrary, categoryLibraryName? } → 回执 { templateKind }
export async function handleControlTemplateSaveFromSelection({ request, url, response }, ctx) {
  let payload;
  try {
    payload = await readJsonBody(request);
  } catch {
    sendV1Error(response, "bad-request", "请求体须为合法 JSON。");
    return;
  }
  const { name } = payload ?? {};
  const componentLibrary = payload?.componentLibrary ?? payload?.componentType;
  const categoryLibraryName = payload?.categoryLibraryName ?? payload?.attributeLibraryName;
  if (!name || typeof name !== "string" || !name.trim()) {
    sendV1Error(response, "bad-request", "name 必填。");
    return;
  }
  if (!componentLibrary || typeof componentLibrary !== "string" || !componentLibrary.trim()) {
    sendV1Error(response, "bad-request", "componentLibrary 必填。");
    return;
  }
  const params = { name, componentLibrary };
  if (categoryLibraryName !== undefined) {
    params.categoryLibraryName = categoryLibraryName;
  }
  await relayCommand(response, ctx.sendCommandToClient(readClientId(url), "control.template.saveFromSelection", params));
}

// /webgrp/v1/control/e-device-definition/export -- 导出 E 文件定义文本
// body: {} -> 回执 { filename, text, mime }
export async function handleControlExportEDeviceDefinition({ url, response }, ctx) {
  await relayCommand(response, ctx.sendCommandToClient(readClientId(url), "control.e-device-definition.export", {}));
}

// /webgrp/v1/control/e-device-definition/import -- 导入 E 文件定义（返回匹配结果，不实际写入）
// body: { text } -> 回执 { matched, skipped, matchedCount, skippedCount }
export async function handleControlImportEDeviceDefinition({ request, url, response }, ctx) {
  let payload;
  try {
    payload = await readJsonBody(request);
  } catch {
    sendV1Error(response, "bad-request", "请求体须为合法 JSON。");
    return;
  }
  const text = payload?.text;
  if (typeof text !== "string" || !text.trim()) {
    sendV1Error(response, "bad-request", "text 必填（E 文件文本）。");
    return;
  }
  await relayCommand(response, ctx.sendCommandToClient(readClientId(url), "control.e-device-definition.import", { text }));
}

import { apiPattern } from "./config.mjs";

// 构造 v1 控制台路由表。ctx = { sendCommandToClient }
// handle 签名：({ request, response, url, match }, ctx) => Promise<void>
export function createV1ControlRoutes(ctx) {
  const wrap = (handler) => ({ request, response, url, match }) =>
    handler({ request, response, url }, ctx);
  return [
    { method: "POST", pattern: apiPattern("/v1/control/device/add", "/?$"), handle: wrap(handleControlDeviceAdd) },
    { method: "POST", pattern: apiPattern("/v1/control/scheme/create", "/?$"), handle: wrap(handleControlSchemeCreate) },
    { method: "POST", pattern: apiPattern("/v1/control/model/create", "/?$"), handle: wrap(handleControlModelCreate) },
    { method: "POST", pattern: apiPattern("/v1/control/devices/select", "/?$"), handle: wrap(handleControlDevicesSelect) },
    { method: "POST", pattern: apiPattern("/v1/control/devices/group", "/?$"), handle: wrap(handleControlDevicesGroup) },
    { method: "POST", pattern: apiPattern("/v1/control/device/delete", "/?$"), handle: wrap(handleControlDeviceDelete) },
    { method: "POST", pattern: apiPattern("/v1/control/device/property/update", "/?$"), handle: wrap(handleControlDevicePropertyUpdate) },
    { method: "POST", pattern: apiPattern("/v1/control/save", "/?$"), handle: wrap(handleControlSave) },
    { method: "POST", pattern: apiPattern("/v1/control/template/saveFromSelection", "/?$"), handle: wrap(handleControlTemplateSaveFromSelection) },
    { method: "POST", pattern: apiPattern("/v1/control/e-device-definition/export", "/?$"), handle: wrap(handleControlExportEDeviceDefinition) },
    { method: "POST", pattern: apiPattern("/v1/control/e-device-definition/import", "/?$"), handle: wrap(handleControlImportEDeviceDefinition) }
  ];
}
