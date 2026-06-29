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

  function register(clientId, send) {
    const entry = {
      clientId,
      send, // (message) => void，由 WS 层注入
      registeredAt: now(),
      lastActiveAt: now(),
      pendingFetches: new Map(), // requestId -> pending fetch
      pendingCommands: new Map() // requestId -> pending command
    };
    clients.set(clientId, entry);
    return entry;
  }

  function unregister(clientId) {
    const entry = clients.get(clientId);
    if (!entry) {
      return;
    }
    // 拒绝所有等待中的 fetch 与 command
    for (const pending of entry.pendingFetches.values()) {
      pending.reject(new NoOnlineClientError());
    }
    for (const pending of entry.pendingCommands.values()) {
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
        registeredAt: entry.registeredAt,
        lastActiveAt: entry.lastActiveAt
      }));
  }

  // 选默认客户端：最近活跃且未超时
  function pickDefaultClient() {
    const cutoff = now() - HEARTBEAT_TIMEOUT_MS;
    const active = Array.from(clients.values()).filter((entry) => entry.lastActiveAt >= cutoff);
    if (active.length === 0) {
      return null;
    }
    active.sort((a, b) => b.lastActiveAt - a.lastActiveAt);
    return active[0];
  }

  function getClient(clientId) {
    const entry = clients.get(clientId);
    if (!entry || entry.lastActiveAt < now() - HEARTBEAT_TIMEOUT_MS) {
      return null;
    }
    return entry;
  }

  // 按 clientId 或默认选取客户端。无在线客户端抛 NoOnlineClientError。
  function resolveClient(clientId) {
    if (clientId) {
      const entry = getClient(clientId);
      if (!entry) {
        throw new NoOnlineClientError();
      }
      return entry;
    }
    const entry = pickDefaultClient();
    if (!entry) {
      throw new NoOnlineClientError();
    }
    return entry;
  }

  // 向客户端发 fetch 请求并等待 fetch-response。
  // sendFetch：由 WS 层注入，(clientId, message) => void
  // requestId 由调用方生成（WS 层）
  async function fetchFromClient(clientId, requestId, resource, params, sendFetch) {
    const entry = resolveClient(clientId);
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
  async function commandFromClient(clientId, requestId, name, params, sendCommand) {
    const entry = resolveClient(clientId);
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
