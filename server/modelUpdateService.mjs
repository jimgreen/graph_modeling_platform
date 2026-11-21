import { randomUUID } from "node:crypto";

const FILE_KINDS = new Set(["json", "xml", "e"]);

function serviceError(code, message) {
  return Object.assign(new Error(message), { code });
}

function normalizeScope(input) {
  const type = String(input?.type ?? "").trim();
  if (type === "space") return { type };
  if (type === "scheme") {
    if (!Array.isArray(input.schemePath) || input.schemePath.length === 0) {
      throw serviceError("bad-request", "scheme 订阅必须提供非空 schemePath 数组。");
    }
    const schemePath = input.schemePath.map((part) => String(part ?? ""));
    if (schemePath.some((part) => !part.trim())) {
      throw serviceError("bad-request", "schemePath 的每一级名称都不能为空。");
    }
    return { type, schemePath };
  }
  if (type === "model") {
    const modelId = Number(input.modelId);
    if (!Number.isSafeInteger(modelId) || modelId <= 0) {
      throw serviceError("bad-request", "model 订阅必须提供正整数 modelId。");
    }
    return { type, modelId: String(modelId) };
  }
  throw serviceError("bad-request", "scope.type 必须是 space、scheme 或 model。");
}

function normalizeFiles(input) {
  if (!Array.isArray(input) || input.length === 0) {
    throw serviceError("bad-request", "files 至少需要选择一种模型文件类型。");
  }
  const seen = new Set();
  return input.map((item) => {
    const kind = String(item?.kind ?? "").trim().toLowerCase();
    if (!FILE_KINDS.has(kind)) {
      throw serviceError("bad-request", `暂不支持的模型文件类型：${kind || "(空)"}`);
    }
    if (seen.has(kind)) {
      throw serviceError("bad-request", `模型文件类型重复：${kind}`);
    }
    seen.add(kind);
    return { kind, encoding: item?.encoding === "gbk" ? "gbk" : "utf-8" };
  });
}

function sameSchemePrefix(prefix, path) {
  return prefix.length <= path.length && prefix.every((part, index) => part === path[index]);
}

function subscriptionMatches(subscription, event) {
  if (subscription.spaceId !== String(event.spaceId ?? "")) return false;
  if (subscription.scope.type === "space") return true;
  if (subscription.scope.type === "scheme") {
    return sameSchemePrefix(subscription.scope.schemePath, event.schemePath);
  }
  const modelId = Number(event.record?.project?.idx);
  return Number.isSafeInteger(modelId) && String(modelId) === subscription.scope.modelId;
}

export function createModelUpdateService({
  buildPayload,
  sendMessage,
  targetExists = async () => true,
  randomId = randomUUID
}) {
  const connections = new Map();
  const subscriptions = new Map();
  const connectionSubscriptions = new Map();

  function removeSubscription(subscriptionId) {
    const subscription = subscriptions.get(subscriptionId);
    if (!subscription) return false;
    subscriptions.delete(subscriptionId);
    const owned = connectionSubscriptions.get(subscription.connectionId);
    owned?.delete(subscriptionId);
    if (owned?.size === 0) connectionSubscriptions.delete(subscription.connectionId);
    return true;
  }

  function addConnection(connectionId, spaceId, send) {
    const id = String(connectionId ?? "").trim();
    const space = String(spaceId ?? "").trim();
    if (!id || !space) throw serviceError("bad-request", "连接必须绑定有效的 connectionId 和 spaceId。");
    connections.set(id, { spaceId: space, send: typeof send === "function" ? send : null });
  }

  async function subscribe(connectionId, spaceId, inputScope, inputFiles) {
    const id = String(connectionId ?? "");
    const space = String(spaceId ?? "");
    if (!id || connections.get(id)?.spaceId !== space) {
      throw serviceError("connection-closed", "WebSocket 连接已关闭或空间上下文不匹配。");
    }
    const scope = normalizeScope(inputScope);
    const files = normalizeFiles(inputFiles);
    if (!(await targetExists({ spaceId: space, scope }))) {
      throw serviceError("not-found", "订阅目标不存在。");
    }
    // 目标校验会异步读盘；连接在这期间关闭时不再留下孤儿订阅。
    if (connections.get(id)?.spaceId !== space) {
      throw serviceError("connection-closed", "WebSocket 连接已关闭。");
    }
    let subscriptionId = String(randomId());
    while (!subscriptionId || subscriptions.has(subscriptionId)) subscriptionId = String(randomId());
    const subscription = { subscriptionId, connectionId: id, spaceId: space, scope, files };
    subscriptions.set(subscriptionId, subscription);
    let owned = connectionSubscriptions.get(id);
    if (!owned) connectionSubscriptions.set(id, owned = new Set());
    owned.add(subscriptionId);
    return subscriptionId;
  }

  function getSubscription(connectionId, subscriptionId) {
    const subscription = subscriptions.get(String(subscriptionId ?? ""));
    if (!subscription || subscription.connectionId !== String(connectionId ?? "")) return null;
    return {
      subscriptionId: subscription.subscriptionId,
      scope: structuredClone(subscription.scope),
      files: structuredClone(subscription.files)
    };
  }

  function unsubscribe(connectionId, subscriptionId) {
    const subscription = subscriptions.get(String(subscriptionId ?? ""));
    return Boolean(subscription && subscription.connectionId === String(connectionId ?? "")
      && removeSubscription(subscription.subscriptionId));
  }

  function removeConnection(connectionId) {
    const id = String(connectionId ?? "");
    for (const subscriptionId of connectionSubscriptions.get(id) ?? []) {
      subscriptions.delete(subscriptionId);
    }
    connectionSubscriptions.delete(id);
    return connections.delete(id);
  }

  async function publishModelChanged(event) {
    const schemePath = Array.isArray(event?.schemePath) ? event.schemePath.map(String) : [];
    const normalizedEvent = { ...event, spaceId: String(event?.spaceId ?? ""), schemePath };
    let published = 0;
    for (const subscription of subscriptions.values()) {
      if (!subscriptionMatches(subscription, normalizedEvent)) continue;
      const isActive = () => subscriptions.get(subscription.subscriptionId) === subscription
        && connections.has(subscription.connectionId);
      try {
        const data = await buildPayload({
          spaceId: subscription.spaceId,
          record: event.record,
          schemePath,
          files: structuredClone(subscription.files),
          paths: event.paths
        });
        if (!isActive()) continue;
        await sendToConnection(subscription.connectionId, { type: "model.updated", data });
        published += 1;
      } catch (error) {
        if (!isActive()) continue;
        try {
          await sendToConnection(subscription.connectionId, {
            type: "error",
            error: {
              code: error?.code ?? "export-failed",
              message: error instanceof Error ? error.message : "模型文件生成失败。",
              subscriptionId: subscription.subscriptionId
            }
          });
        } catch {
          // A failed socket send must not prevent delivery to other subscribers.
        }
      }
    }
    return published;
  }

  function removeModel(spaceId, modelId) {
    const space = String(spaceId ?? "");
    const id = String(Number(modelId));
    let removed = 0;
    for (const subscription of subscriptions.values()) {
      if (subscription.spaceId === space && subscription.scope.type === "model" && subscription.scope.modelId === id) {
        if (removeSubscription(subscription.subscriptionId)) removed += 1;
      }
    }
    return removed;
  }

  function removeSpace(spaceId) {
    const space = String(spaceId ?? "");
    let removed = 0;
    for (const subscription of subscriptions.values()) {
      if (subscription.spaceId === space && removeSubscription(subscription.subscriptionId)) removed += 1;
    }
    return removed;
  }

  return {
    addConnection,
    subscribe,
    getSubscription,
    unsubscribe,
    removeConnection,
    publishModelChanged,
    removeModel,
    removeSpace
  };

  function sendToConnection(connectionId, message) {
    const send = connections.get(connectionId)?.send ?? sendMessage;
    return send(connectionId, message);
  }
}
