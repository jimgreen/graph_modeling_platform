import { randomUUID } from "node:crypto";
import { EventEmitter } from "node:events";
import WebSocket from "ws";

const DEFAULT_RECONNECT_MIN_DELAY_MS = 1_000;
const DEFAULT_RECONNECT_MAX_DELAY_MS = 30_000;
const DEFAULT_RECONNECT_JITTER = 0.2;
const DEFAULT_ACK_TIMEOUT_MS = 10_000;

function clone(value) {
  return value === undefined ? undefined : structuredClone(value);
}
function normalizeUrl(input, space) {
  const parsed = new URL(String(input));
  if (parsed.protocol === "http:") parsed.protocol = "ws:";
  if (parsed.protocol === "https:") parsed.protocol = "wss:";
  if (parsed.protocol !== "ws:" && parsed.protocol !== "wss:") {
    throw new TypeError("订阅地址必须使用 ws:// 或 wss://（http(s):// 会自动转换）。");
  }
  if (space !== undefined && space !== null) parsed.searchParams.set("space", String(space));
  return parsed.toString();
}
function normalizeError(error, fallbackCode = "internal") {
  if (error instanceof ModelUpdateError) return error;
  const message = error instanceof Error ? error.message : String(error ?? "订阅客户端异常。");
  return new ModelUpdateError(message, { code: error?.code ?? fallbackCode, cause: error });
}

function isPermanentCode(code) {
  return code === "bad-request" || code === "not-found" || code === "forbidden";
}

export class ModelUpdateError extends Error {
  constructor(message, { code = "internal", requestId, subscriptionId, retryable = false, cause } = {}) {
    super(String(message ?? "订阅客户端异常。"));
    this.name = "ModelUpdateError";
    this.code = String(code);
    if (requestId) this.requestId = String(requestId);
    if (subscriptionId) this.subscriptionId = String(subscriptionId);
    this.retryable = Boolean(retryable);
    if (cause) this.cause = cause;
  }
}

export class ModelUpdateClient extends EventEmitter {
  constructor(options = {}) {
    super();
    if (!options.url) throw new TypeError("ModelUpdateClient 需要 url。");

    this.url = normalizeUrl(options.url, options.space);
    this.reconnectEnabled = options.reconnect !== false;
    this.reconnectMinDelayMs = Math.max(0, Number(options.reconnectMinDelayMs ?? DEFAULT_RECONNECT_MIN_DELAY_MS));
    this.reconnectMaxDelayMs = Math.max(this.reconnectMinDelayMs, Number(options.reconnectMaxDelayMs ?? DEFAULT_RECONNECT_MAX_DELAY_MS));
    this.reconnectJitter = Math.min(1, Math.max(0, Number(options.reconnectJitter ?? DEFAULT_RECONNECT_JITTER)));
    this.ackTimeoutMs = Math.max(100, Number(options.ackTimeoutMs ?? DEFAULT_ACK_TIMEOUT_MS));
    this.wsOptions = options.wsOptions;
    this.webSocketFactory = options.webSocketFactory ?? ((url, wsOptions) => new WebSocket(url, wsOptions));
    this.onResynchronized = typeof options.onResynchronized === "function" ? options.onResynchronized : null;

    this.state = "idle";
    this.socket = null;
    this.manualClosed = false;
    this.reconnectTimer = null;
    this.reconnectAttempt = 0;
    this.openPromise = null;
    this.openResolve = null;
    this.openReject = null;
    this.restoring = false;
    this.desiredSubscriptions = new Map();
    this.pending = new Map();
    this.pendingOrder = [];

    // EventEmitter 没有 error listener 时会把业务错误重新抛出并终止进程。
    this.on("error", () => {});
  }

  connect() {
    this.manualClosed = false;
    if (this.state === "connected") return Promise.resolve();
    if (this.state === "connecting" && this.openPromise) return this.openPromise;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    return this.startConnection();
  }

  close() {
    this.manualClosed = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    const socket = this.socket;
    if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
      socket.close(1000, "client closed");
      return;
    }
    this.setState("closed");
  }

  async subscribe({ scope, files }) {
    const record = {
      id: randomUUID(),
      scope: clone(scope),
      files: clone(files),
      subscriptionId: null,
      readySettled: false,
      readyResolve: null,
      readyReject: null,
      handle: null
    };
    record.handle = {
      id: record.id,
      scope: record.scope,
      files: record.files,
      get subscriptionId() {
        return record.subscriptionId;
      }
    };
    const ready = new Promise((resolve, reject) => {
      record.readyResolve = resolve;
      record.readyReject = reject;
    });
    this.desiredSubscriptions.set(record.id, record);
    if (this.state === "idle" || this.state === "closed") {
      this.connect().catch((error) => {
        this.rejectPendingSubscription(record, normalizeError(error, "connection-failed"));
      });
    }
    this.restoreSubscriptions();
    return ready;
  }

  unsubscribe(handle) {
    const id = String(handle?.id ?? "");
    const record = this.desiredSubscriptions.get(id);
    if (!record) return Promise.resolve();
    this.desiredSubscriptions.delete(id);
    const subscriptionId = record.subscriptionId;
    record.subscriptionId = null;
    if (!subscriptionId || this.state !== "connected") return Promise.resolve();

    const requestId = randomUUID();
    return new Promise((resolve) => {
      const pending = this.addPending(requestId, {
        type: "unsubscribe",
        record,
        resolve,
        reject: resolve
      });
      try {
        this.sendFrame({ type: "unsubscribe", requestId, subscriptionId });
        pending.timer = setTimeout(() => {
          if (this.pending.get(requestId) !== pending) return;
          this.removePending(requestId);
          resolve();
        }, this.ackTimeoutMs);
      } catch {
        this.removePending(requestId);
        resolve();
      }
    });
  }

  startConnection() {
    this.setState("connecting");
    this.openPromise = new Promise((resolve, reject) => {
      this.openResolve = resolve;
      this.openReject = reject;
    });
    let socket;
    try {
      socket = this.webSocketFactory(this.url, this.wsOptions);
    } catch (error) {
      const normalized = normalizeError(error, "connection-failed");
      this.openReject?.(normalized);
      this.openPromise?.catch(() => {});
      this.clearOpenPromise();
      this.emitError(normalized);
      this.scheduleReconnect();
      return Promise.reject(normalized);
    }
    this.socket = socket;
    socket.once("open", () => {
      if (this.socket !== socket) return;
      this.reconnectAttempt = 0;
      this.setState("connected");
      this.openResolve?.();
      this.clearOpenPromise();
      this.restoreSubscriptions();
    });
    socket.on("message", (raw) => this.handleMessage(raw));
    socket.once("error", (error) => this.emitError(normalizeError(error, "connection-failed")));
    socket.once("close", (code, reason) => this.handleClose(socket, code, reason));
    return this.openPromise;
  }

  async restoreSubscriptions() {
    if (this.restoring || this.state !== "connected") return;
    this.restoring = true;
    try {
      for (const record of this.desiredSubscriptions.values()) {
        if (this.state !== "connected" || this.socket === null) return;
        if (record.subscriptionId) continue;
        record.subscriptionId = null;
        await this.sendSubscribe(record);
      }
      if (this.state !== "connected") return;
      if (this.onResynchronized) {
        try {
          await this.onResynchronized(this);
        } catch (error) {
          this.emitError(normalizeError(error, "resynchronize-failed"));
        }
      }
      this.emitSafe("resynchronized", {
        subscriptions: [...this.desiredSubscriptions.values()].map((record) => record.handle)
      });
    } catch (error) {
      const normalized = normalizeError(error, "subscribe-failed");
      if (!normalized.retryable && isPermanentCode(normalized.code)) this.emitError(normalized);
      if (normalized.retryable && this.socket?.readyState === WebSocket.OPEN) this.socket.close();
    } finally {
      this.restoring = false;
    }
  }

  sendSubscribe(record) {
    const requestId = randomUUID();
    return new Promise((resolve, reject) => {
      const pending = this.addPending(requestId, { type: "subscribe", record, resolve, reject });
      try {
        this.sendFrame({
          type: "subscribe",
          requestId,
          scope: clone(record.scope),
          files: clone(record.files)
        });
        pending.timer = setTimeout(() => {
          if (this.pending.get(requestId) !== pending) return;
          this.removePending(requestId);
          reject(new ModelUpdateError("订阅确认超时。", { code: "ack-timeout", requestId, retryable: true }));
        }, this.ackTimeoutMs);
      } catch (error) {
        this.removePending(requestId);
        reject(new ModelUpdateError("发送订阅帧失败。", { code: "send-failed", requestId, retryable: true, cause: error }));
      }
    });
  }

  handleMessage(raw) {
    let message;
    try {
      message = JSON.parse(String(raw));
    } catch (error) {
      this.emitError(new ModelUpdateError("服务端返回了非法 JSON。", { code: "bad-response", cause: error }));
      return;
    }
    if (!message || typeof message !== "object" || Array.isArray(message)) {
      this.emitError(new ModelUpdateError("服务端返回的订阅帧不是对象。", { code: "bad-response" }));
      return;
    }
    if (message.type === "model.updated") {
      this.emitSafe("model.updated", message.data);
      return;
    }
    if (message.type === "subscribed") {
      const pending = this.findPending(message, "subscribe");
      if (!pending) return;
      const subscriptionId = message.data?.subscriptionId;
      pending.record.subscriptionId = subscriptionId ? String(subscriptionId) : null;
      this.removePending(pending.requestId);
      this.emitSafe("subscribed", { ...message.data, handle: pending.record.handle, requestId: message.requestId });
      if (!pending.record.readySettled) {
        pending.record.readySettled = true;
        pending.record.readyResolve?.(pending.record.handle);
      }
      pending.resolve?.(pending.record.handle);
      return;
    }
    if (message.type === "unsubscribed") {
      const pending = this.findPending(message, "unsubscribe");
      if (!pending) return;
      this.removePending(pending.requestId);
      pending.resolve?.();
      this.emitSafe("unsubscribed", { ...message.data, requestId: message.requestId });
      return;
    }
    if (message.type === "error") {
      const pending = this.findPending(message, "subscribe") ?? this.findPending(message, "unsubscribe");
      const error = new ModelUpdateError(message.error?.message ?? "订阅请求失败。", {
        code: message.error?.code ?? "internal",
        requestId: message.requestId,
        subscriptionId: message.error?.subscriptionId,
        retryable: !isPermanentCode(message.error?.code)
      });
      if (!pending) {
        this.emitError(error);
        return;
      }
      this.removePending(pending.requestId);
      if (pending.type === "subscribe" && !error.retryable) {
        this.desiredSubscriptions.delete(pending.record.id);
        if (!pending.record.readySettled) {
          pending.record.readySettled = true;
          pending.record.readyReject?.(error);
        }
      }
      pending.reject?.(error);
      this.emitError(error);
      return;
    }
    this.emitSafe("message", message);
  }

  handleClose(socket, code, reason) {
    if (this.socket !== socket) return;
    this.socket = null;
    const textReason = Buffer.isBuffer(reason) ? reason.toString("utf8") : String(reason ?? "");
    const wasConnecting = this.state === "connecting";
    const closeError = new ModelUpdateError(textReason || "WebSocket 连接已关闭。", {
      code: code === 4003 ? "space-deleted" : "connection-closed",
      retryable: code !== 4003 && !this.manualClosed
    });
    for (const pending of [...this.pending.values()]) {
      this.removePending(pending.requestId);
      pending.reject?.(closeError);
    }
    for (const record of [...this.desiredSubscriptions.values()]) {
      record.subscriptionId = null;
      if (!record.readySettled) {
        this.rejectPendingSubscription(record, closeError);
      }
    }
    this.setState(this.manualClosed || code === 4003 ? "closed" : "disconnected", { code, reason: textReason });
    if (wasConnecting) {
      this.openReject?.(closeError);
      this.clearOpenPromise();
    }
    if (code === 4003) {
      for (const record of [...this.desiredSubscriptions.values()]) {
        this.rejectPendingSubscription(record, closeError);
      }
      this.emitError(closeError);
      return;
    }
    if (!this.manualClosed && this.reconnectEnabled) this.scheduleReconnect();
  }

  scheduleReconnect() {
    if (this.manualClosed || !this.reconnectEnabled || this.reconnectTimer) return;
    const base = Math.min(this.reconnectMaxDelayMs, this.reconnectMinDelayMs * (2 ** this.reconnectAttempt));
    const jitter = base * this.reconnectJitter * Math.random();
    const delay = Math.round(base + jitter);
    this.reconnectAttempt += 1;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.startConnection().catch(() => {});
    }, delay);
  }

  addPending(requestId, pending) {
    const entry = { ...pending, requestId, timer: null };
    this.pending.set(requestId, entry);
    this.pendingOrder.push(requestId);
    return entry;
  }

  findPending(message, type) {
    if (message.requestId && this.pending.get(String(message.requestId))?.type === type) {
      return this.pending.get(String(message.requestId));
    }
    const subscriptionId = message.data?.subscriptionId ?? message.error?.subscriptionId;
    for (const requestId of this.pendingOrder) {
      const pending = this.pending.get(requestId);
      if (!pending || pending.type !== type) continue;
      if (subscriptionId && pending.record?.subscriptionId && pending.record.subscriptionId !== subscriptionId) continue;
      return pending;
    }
    return null;
  }

  removePending(requestId) {
    const pending = this.pending.get(requestId);
    if (!pending) return null;
    if (pending.timer) clearTimeout(pending.timer);
    this.pending.delete(requestId);
    this.pendingOrder = this.pendingOrder.filter((id) => id !== requestId);
    return pending;
  }

  sendFrame(message) {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      throw new ModelUpdateError("WebSocket 尚未连接。", { code: "not-connected", retryable: true });
    }
    this.socket.send(JSON.stringify(message));
  }

  setState(state, details = {}) {
    this.state = state;
    this.emitSafe("status", { state, ...details });
    if (state === "connected") this.emitSafe("connected", details);
    if (state === "disconnected" || state === "closed") this.emitSafe("disconnected", details);
  }

  emitError(error) {
    this.emitSafe("error", normalizeError(error));
  }

  emitSafe(event, payload) {
    for (const listener of this.listeners(event)) {
      try {
        listener(payload);
      } catch (error) {
        if (event !== "error") {
          for (const errorListener of this.listeners("error")) {
            try {
              errorListener(normalizeError(error, "callback-failed"));
            } catch {
              // 错误回调本身抛错时不能再次打断消息循环。
            }
          }
        }
      }
    }
  }

  clearOpenPromise() {
    this.openPromise = null;
    this.openResolve = null;
    this.openReject = null;
  }

  rejectPendingSubscription(record, error) {
    if (!record || record.readySettled) return;
    record.readySettled = true;
    record.readyReject?.(error);
    this.desiredSubscriptions.delete(record.id);
  }
}
