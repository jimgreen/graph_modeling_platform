// 客户端注册表：管理在线前端客户端（WS 连接）、最近活跃时间、默认选择、pending fetches。
// 纯逻辑模块，不依赖 ws。WS 层（runtimeWs.mjs）调用本模块管理连接生命周期。

const HEARTBEAT_TIMEOUT_MS = 60_000;
const FETCH_TIMEOUT_MS = 5_000;

// pending fetch：server 向客户端发 fetch 请求后等待 fetch-response
function createPendingFetch(requestId, resource) {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  const timer = setTimeout(() => {
    reject(new FetchTimeoutError(resource));
  }, FETCH_TIMEOUT_MS);
  return {
    requestId,
    resource,
    promise,
    resolve: (data) => {
      clearTimeout(timer);
      resolve(data);
    },
    reject: (error) => {
      clearTimeout(timer);
      reject(error);
    }
  };
}

export class FetchTimeoutError extends Error {
  constructor(resource) {
    super(`拉取 ${resource} 超时。`);
    this.name = "FetchTimeoutError";
    this.code = "ws-timeout";
    this.resource = resource;
  }
}

// 指令通道超时（与 fetch 通道同构，复用 FETCH_TIMEOUT_MS）
export class CommandTimeoutError extends Error {
  constructor(command) {
    super(`指令 ${command} 超时。`);
    this.name = "CommandTimeoutError";
    this.code = "ws-timeout";
    this.command = command;
  }
}

// pending command：server 向客户端发 command 后等 command-response
// 与 createPendingFetch 同构，超时抛 CommandTimeoutError
function createPendingCommand(requestId, name) {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  const timer = setTimeout(() => {
    reject(new CommandTimeoutError(name));
  }, FETCH_TIMEOUT_MS);
  return {
    requestId,
    name,
    promise,
    resolve: (data) => {
      clearTimeout(timer);
      resolve(data);
    },
    reject: (error) => {
      clearTimeout(timer);
      reject(error);
    }
  };
}

export class NoOnlineClientError extends Error {
  constructor() {
    super("无在线客户端。");
    this.name = "NoOnlineClientError";
    this.code = "no-online-client";
  }
}

export function createRuntimeRegistry() {
  // Map<clientId, ClientEntry>
  const clients = new Map();

  function now() {
    return Date.now();
  }

  function register(clientId, send, workspaceId) {
    const entry = {
      clientId,
      // 空间归属：注册时由 WS 层从握手 Cookie 解析并归位（缺 Cookie / 空间已删 → 首个空间），
      // 故线上条目恒有具体空间，空串只出现在未注入 store 的单测里
      workspaceId: String(workspaceId ?? ""),
      send, // (message) => void，由 WS 层注入
      registeredAt: now(),
      lastActiveAt: now(),
      pendingFetches: new Map(), // requestId -> pending fetch
      pendingCommands: new Map() // requestId -> pending command
    };
    // 同 clientId 重复注册（多标签页共用 localStorage 里的 clientId）时，
    // 旧条目的挂起请求必须**立即**拒绝：否则它们被静默丢弃，只能等
    // FETCH_TIMEOUT_MS 超时才结算，白等一个超时周期。
    const previous = clients.get(clientId);
    if (previous) {
      for (const pending of previous.pendingFetches.values()) {
        pending.reject(new NoOnlineClientError());
      }
      for (const pending of previous.pendingCommands.values()) {
        pending.reject(new NoOnlineClientError());
      }
    }
    clients.set(clientId, entry);
    return entry;
  }

  /**
   * 注销。**传 entry 时按身份注销**（只删自己那条），避免误杀同 id 的新连接。
   *
   * 背景（实测缺陷）：clientId 持久化在 localStorage（见 runtimeWsClient 的
   * getOrCreateClientId），所以同一浏览器开两个标签页会拿到**同一个 clientId**。
   * 两个连接都注册后，第二次 register 会顶掉第一条；此后任一标签页关闭时
   * ws.on("close") 调 unregister(clientId) 只按 id 查 —— 取到的是**另一条**，
   * 于是把它也注销了。实测：关掉一个标签页后，另一个仍在正常渲染，
   * 但 /v1/runtime/model 立刻返回 503 no-online-client。
   *
   * 身份比对（clients.get(clientId) === entry）让旧连接的 close 变成空操作，
   * 只清理它自己那条。仍支持只传 id 的旧调用（无身份信息时按 id 删）。
   */
  function unregister(clientId, entry) {
    const current = clients.get(clientId);
    if (!current) {
      return;
    }
    if (entry && current !== entry) {
      // 已被同 id 的新连接顶替：这条 close 属于旧连接，不该动新连接
      return;
    }
    // 拒绝所有等待中的 fetch 与 command
    for (const pending of current.pendingFetches.values()) {
      pending.reject(new NoOnlineClientError());
    }
    for (const pending of current.pendingCommands.values()) {
      pending.reject(new NoOnlineClientError());
    }
    clients.delete(clientId);
  }

  function touch(clientId) {
    const entry = clients.get(clientId);
    if (entry) {
      entry.lastActiveAt = now();
    }
  }

  function listClients() {
    const cutoff = now() - HEARTBEAT_TIMEOUT_MS;
    return Array.from(clients.values())
      .filter((entry) => entry.lastActiveAt >= cutoff)
      .map((entry) => ({
        clientId: entry.clientId,
        workspaceId: entry.workspaceId,
        registeredAt: entry.registeredAt,
        lastActiveAt: entry.lastActiveAt
      }));
  }

  // 选默认客户端：最近活跃且未超时。
  // 传 workspaceId 时只在该空间的在线客户端中取（严格）。客户端的空间在注册时已归位
  // （见 runtimeWs：无 Cookie / Cookie 指向已删除空间 → 首个空间），故「无空间的调用方」
  // 与「无 Cookie 的前端」同属首个空间，不会互相漏掉；反过来也不会跨空间打错人。
  function pickDefaultClient(workspaceId) {
    const cutoff = now() - HEARTBEAT_TIMEOUT_MS;
    const active = Array.from(clients.values()).filter((entry) => entry.lastActiveAt >= cutoff);
    const wanted = String(workspaceId ?? "");
    const candidates = wanted ? active.filter((entry) => entry.workspaceId === wanted) : active;
    if (candidates.length === 0) {
      return null;
    }
    candidates.sort((a, b) => b.lastActiveAt - a.lastActiveAt);
    return candidates[0];
  }

  function getClient(clientId) {
    const entry = clients.get(clientId);
    if (!entry || entry.lastActiveAt < now() - HEARTBEAT_TIMEOUT_MS) {
      return null;
    }
    return entry;
  }

  // 按 clientId 或默认选取客户端。无在线客户端抛 NoOnlineClientError。
  // 传 workspaceId 时校验空间：跨空间指名不生效（防调到别的空间的前端）。
  function resolveClient(clientId, workspaceId) {
    const wanted = String(workspaceId ?? "");
    if (clientId) {
      const entry = getClient(clientId);
      if (!entry || (wanted && entry.workspaceId !== wanted)) {
        throw new NoOnlineClientError();
      }
      return entry;
    }
    const entry = pickDefaultClient(wanted);
    if (!entry) {
      throw new NoOnlineClientError();
    }
    return entry;
  }

  // 向客户端发 fetch 请求并等待 fetch-response。
  // sendFetch：由 WS 层注入，(clientId, message) => void
  // requestId 由调用方生成（WS 层）
  // workspaceId：调用方所在空间，用于筛出目标客户端（见 resolveClient）
  async function fetchFromClient(clientId, requestId, resource, params, sendFetch, workspaceId) {
    const entry = resolveClient(clientId, workspaceId);
    const pending = createPendingFetch(requestId, resource);
    entry.pendingFetches.set(requestId, pending);
    sendFetch(entry, { type: "fetch", requestId, resource, params });
    try {
      const data = await pending.promise;
      return data;
    } finally {
      entry.pendingFetches.delete(requestId);
    }
  }

  // WS 层收到 fetch-response 时调用
  function resolveFetch(clientId, requestId, data, error) {
    const entry = clients.get(clientId);
    if (!entry) {
      return false;
    }
    const pending = entry.pendingFetches.get(requestId);
    if (!pending) {
      return false;
    }
    if (error) {
      pending.reject(Object.assign(new Error(error.message ?? "前端拉取失败。"), { code: error.code }));
    } else {
      pending.resolve(data);
    }
    return true;
  }

  // 向客户端下发写指令并等待 command-response（与 fetchFromClient 同构）。
  // sendCommand：由 WS 层注入，(entry, message) => void
  // requestId 由调用方（WS 层）生成
  // workspaceId：调用方所在空间，用于筛出目标客户端（见 resolveClient）
  async function commandFromClient(clientId, requestId, name, params, sendCommand, workspaceId) {
    const entry = resolveClient(clientId, workspaceId);
    const pending = createPendingCommand(requestId, name);
    entry.pendingCommands.set(requestId, pending);
    sendCommand(entry, { type: "command", requestId, name, params });
    try {
      const data = await pending.promise;
      return data;
    } finally {
      entry.pendingCommands.delete(requestId);
    }
  }

  // WS 层收到 command-response 时调用
  function resolveCommand(clientId, requestId, ok, data, error) {
    const entry = clients.get(clientId);
    if (!entry) {
      return false;
    }
    const pending = entry.pendingCommands.get(requestId);
    if (!pending) {
      return false;
    }
    if (!ok) {
      pending.reject(Object.assign(new Error(error?.message ?? "前端指令失败。"), { code: error?.code ?? "control-failed" }));
    } else {
      pending.resolve(data);
    }
    return true;
  }

  return {
    register,
    unregister,
    touch,
    listClients,
    pickDefaultClient,
    getClient,
    resolveClient,
    fetchFromClient,
    resolveFetch,
    commandFromClient,
    resolveCommand,
    _clients: clients
  };
}
