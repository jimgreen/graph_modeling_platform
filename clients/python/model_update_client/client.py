from __future__ import annotations

import copy
import json
import random
import threading
import time
import uuid
from collections import OrderedDict
from dataclasses import dataclass, field
from typing import Any, Callable, Optional
from urllib.parse import parse_qsl, urlencode, urlparse, urlunparse


def _build_url(value: str, space: Optional[str]) -> str:
    parsed = urlparse(str(value))
    scheme = {"http": "ws", "https": "wss"}.get(parsed.scheme, parsed.scheme)
    if scheme not in {"ws", "wss"}:
        raise ValueError("订阅地址必须使用 ws:// 或 wss://（http(s):// 会自动转换）。")
    query = dict(parse_qsl(parsed.query, keep_blank_values=True))
    if space is not None:
        query["space"] = str(space)
    return urlunparse((scheme, parsed.netloc, parsed.path, parsed.params, urlencode(query), parsed.fragment))


class ModelUpdateError(Exception):
    def __init__(
        self,
        message: str,
        *,
        code: str = "internal",
        request_id: Optional[str] = None,
        subscription_id: Optional[str] = None,
        retryable: bool = False,
        cause: Optional[BaseException] = None,
    ) -> None:
        super().__init__(str(message))
        self.code = str(code)
        self.request_id = request_id
        self.subscription_id = subscription_id
        self.retryable = bool(retryable)
        self.cause = cause


@dataclass
class SubscriptionHandle:
    scope: dict[str, Any]
    files: list[dict[str, Any]]
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    subscription_id: Optional[str] = None
    _ready: threading.Event = field(default_factory=threading.Event, repr=False)
    _error: Optional[ModelUpdateError] = field(default=None, repr=False)
    _cancel_requested: bool = field(default=False, repr=False)


@dataclass
class _Pending:
    request_id: str
    kind: str
    handle: SubscriptionHandle
    event: threading.Event = field(default_factory=threading.Event)
    error: Optional[ModelUpdateError] = None


class ModelUpdateClient:
    def __init__(
        self,
        url: str,
        *,
        space: Optional[str] = None,
        reconnect: bool = True,
        reconnect_min_delay: float = 1.0,
        reconnect_max_delay: float = 30.0,
        reconnect_jitter: float = 0.2,
        ack_timeout: float = 10.0,
        socket_factory: Optional[Callable[[], Any]] = None,
        socket_options: Optional[dict[str, Any]] = None,
        on_resynchronized: Optional[Callable[["ModelUpdateClient"], None]] = None,
    ) -> None:
        self.url = _build_url(url, space)
        self.reconnect_enabled = reconnect
        self.reconnect_min_delay = max(0.0, float(reconnect_min_delay))
        self.reconnect_max_delay = max(self.reconnect_min_delay, float(reconnect_max_delay))
        self.reconnect_jitter = min(1.0, max(0.0, float(reconnect_jitter)))
        self.ack_timeout = max(0.1, float(ack_timeout))
        self.socket_options = dict(socket_options or {})
        self.socket_factory = socket_factory or self._default_socket_factory
        self.on_resynchronized = on_resynchronized

        self.state = "idle"
        self._lock = threading.RLock()
        self._condition = threading.Condition(self._lock)
        self._stop_event = threading.Event()
        self._thread: Optional[threading.Thread] = None
        self._restore_thread: Optional[threading.Thread] = None
        self._socket: Any = None
        self._manual_closed = False
        self._reconnect_attempt = 0
        self._last_error: Optional[ModelUpdateError] = None
        self._desired: "OrderedDict[str, SubscriptionHandle]" = OrderedDict()
        self._pending: "OrderedDict[str, _Pending]" = OrderedDict()
        self._listeners: dict[str, list[Callable[[Any], None]]] = {}

    def on(self, event: str, callback: Callable[[Any], None]) -> "ModelUpdateClient":
        self._listeners.setdefault(str(event), []).append(callback)
        return self

    def connect(self, timeout: float = 10.0) -> None:
        self._manual_closed = False
        self._ensure_thread()
        deadline = time.monotonic() + timeout if timeout is not None else None
        with self._condition:
            while self.state != "connected":
                if self.state == "closed" and self._last_error is not None:
                    raise self._last_error
                remaining = None if deadline is None else deadline - time.monotonic()
                if remaining is not None and remaining <= 0:
                    raise ModelUpdateError("连接超时。", code="connection-timeout", retryable=True)
                self._condition.wait(remaining)

    def close(self) -> None:
        with self._lock:
            self._manual_closed = True
            self._stop_event.set()
            socket = self._socket
            thread = self._thread
        if socket is not None:
            try:
                socket.close()
            except Exception:
                pass
        if thread and thread is not threading.current_thread():
            thread.join(timeout=2.0)
        self._set_state("closed")

    def subscribe(
        self,
        scope: dict[str, Any],
        files: list[dict[str, Any]],
        *,
        timeout: Optional[float] = None,
    ) -> SubscriptionHandle:
        handle = SubscriptionHandle(copy.deepcopy(scope), copy.deepcopy(files))
        with self._lock:
            self._desired[handle.id] = handle
        self._ensure_thread()
        self._start_restore_worker()
        if not handle._ready.wait(timeout):
            error = ModelUpdateError("订阅确认超时。", code="ack-timeout", retryable=True)
            with self._lock:
                self._desired.pop(handle.id, None)
                handle._cancel_requested = True
                handle._error = error
            raise error
        if handle._error is not None:
            raise handle._error
        return handle

    def unsubscribe(self, handle: SubscriptionHandle, *, timeout: Optional[float] = None) -> None:
        with self._lock:
            current = self._desired.pop(handle.id, None)
            socket = self._socket
            connected = self.state == "connected"
            subscription_id = current.subscription_id if current else handle.subscription_id
            if current:
                current.subscription_id = None
            handle.subscription_id = None
        if not current or not subscription_id or not connected or socket is None:
            return
        request_id = str(uuid.uuid4())
        pending = _Pending(request_id, "unsubscribe", current)
        with self._lock:
            self._pending[request_id] = pending
        try:
            self._send({"type": "unsubscribe", "requestId": request_id, "subscriptionId": subscription_id})
            if not pending.event.wait(self.ack_timeout if timeout is None else timeout):
                with self._lock:
                    self._pending.pop(request_id, None)
                return
        except Exception:
            with self._lock:
                self._pending.pop(request_id, None)

    def _ensure_thread(self) -> None:
        with self._lock:
            if self._thread and self._thread.is_alive():
                return
            self._stop_event.clear()
            self._last_error = None
            self._thread = threading.Thread(target=self._run, name="model-update-client", daemon=True)
            self._thread.start()

    def _default_socket_factory(self):
        import websocket

        return websocket.WebSocket()

    def _run(self) -> None:
        while not self._stop_event.is_set():
            socket = None
            try:
                socket = self.socket_factory()
                with self._lock:
                    self._socket = socket
                if hasattr(socket, "connect"):
                    socket.connect(self.url, **self.socket_options)
                self._reconnect_attempt = 0
                self._set_state("connected")
                self._start_restore_worker()
                while not self._stop_event.is_set():
                    raw = socket.recv()
                    if raw is None:
                        raise ConnectionError("WebSocket 返回空帧。")
                    self._handle_message(raw)
            except Exception as error:
                if self._stop_event.is_set() or self._manual_closed:
                    break
                code = getattr(error, "close_status_code", None)
                reason = getattr(error, "reason", str(error))
                self._handle_disconnect(code, reason, error)
                if code == 4003:
                    break
                delay = min(self.reconnect_max_delay, self.reconnect_min_delay * (2 ** self._reconnect_attempt))
                delay += delay * self.reconnect_jitter * random.random()
                self._reconnect_attempt += 1
                if not self.reconnect_enabled or self._stop_event.wait(delay):
                    break
            finally:
                if socket is not None:
                    try:
                        socket.close()
                    except Exception:
                        pass
                with self._lock:
                    if self._socket is socket:
                        self._socket = None

    def _start_restore_worker(self) -> None:
        with self._lock:
            if self.state != "connected":
                return
            if self._restore_thread and self._restore_thread.is_alive():
                return
            self._restore_thread = threading.Thread(target=self._restore, name="model-update-restore", daemon=True)
            self._restore_thread.start()

    def _restore(self) -> None:
        while not self._stop_event.is_set():
            with self._lock:
                if self.state != "connected":
                    return
                pending_handles = [handle for handle in self._desired.values() if handle.subscription_id is None]
            if not pending_handles:
                break
            for handle in pending_handles:
                try:
                    self._send_subscribe_and_wait(handle)
                    self._cancel_if_removed(handle)
                except ModelUpdateError as error:
                    if error.retryable:
                        with self._lock:
                            socket = self._socket
                        if socket is not None:
                            try:
                                socket.close()
                            except Exception:
                                pass
                        return
                    with self._lock:
                        self._desired.pop(handle.id, None)
                        handle._error = error
                        handle._ready.set()
                    self._emit("error", error)
        with self._lock:
            if self.state != "connected" or self._stop_event.is_set():
                return
        if self.on_resynchronized:
            try:
                self.on_resynchronized(self)
            except Exception as error:
                self._emit("error", ModelUpdateError(str(error), code="resynchronize-failed", cause=error))
        self._emit("resynchronized", {"subscriptions": list(self._desired.values())})

    def _send_subscribe_and_wait(self, handle: SubscriptionHandle) -> None:
        request_id = str(uuid.uuid4())
        pending = _Pending(request_id, "subscribe", handle)
        with self._lock:
            self._pending[request_id] = pending
        try:
            self._send({
                "type": "subscribe",
                "requestId": request_id,
                "scope": copy.deepcopy(handle.scope),
                "files": copy.deepcopy(handle.files),
            })
        except Exception as error:
            with self._lock:
                self._pending.pop(request_id, None)
            raise ModelUpdateError("发送订阅帧失败。", code="send-failed", retryable=True, cause=error) from error
        if not pending.event.wait(self.ack_timeout):
            with self._lock:
                self._pending.pop(request_id, None)
            raise ModelUpdateError("订阅确认超时。", code="ack-timeout", retryable=True, request_id=request_id)
        if pending.error is not None:
            raise pending.error

    def _cancel_if_removed(self, handle: SubscriptionHandle) -> None:
        with self._lock:
            if self._desired.get(handle.id) is handle and not handle._cancel_requested:
                return
            subscription_id = handle.subscription_id
        if not subscription_id:
            return
        try:
            self._send({
                "type": "unsubscribe",
                "requestId": str(uuid.uuid4()),
                "subscriptionId": subscription_id,
            })
        except Exception:
            return
        with self._lock:
            handle.subscription_id = None

    def _send(self, message: dict[str, Any]) -> None:
        with self._lock:
            socket = self._socket
            if socket is None or self.state != "connected":
                raise ModelUpdateError("WebSocket 尚未连接。", code="not-connected", retryable=True)
        socket.send(json.dumps(message, ensure_ascii=False))

    def _handle_message(self, raw: Any) -> None:
        try:
            if isinstance(raw, bytes):
                raw = raw.decode("utf-8")
            message = json.loads(str(raw))
        except Exception as error:
            self._emit("error", ModelUpdateError("服务端返回了非法 JSON。", code="bad-response", cause=error))
            return
        if not isinstance(message, dict):
            self._emit("error", ModelUpdateError("服务端返回的订阅帧不是对象。", code="bad-response"))
            return
        kind = message.get("type")
        if kind == "model.updated":
            self._emit("model.updated", message.get("data"))
            return
        if kind == "subscribed":
            try:
                pending = self._find_pending(message, "subscribe")
            except ModelUpdateError as error:
                self._emit("error", error)
                return
            if pending is None:
                return
            subscription_id = message.get("data", {}).get("subscriptionId")
            pending.handle.subscription_id = str(subscription_id) if subscription_id else None
            with self._lock:
                self._pending.pop(pending.request_id, None)
            pending.event.set()
            pending.handle._ready.set()
            self._emit("subscribed", {**message.get("data", {}), "handle": pending.handle, "requestId": message.get("requestId")})
            return
        if kind == "unsubscribed":
            try:
                pending = self._find_pending(message, "unsubscribe")
            except ModelUpdateError as error:
                self._emit("error", error)
                return
            if pending is None:
                return
            with self._lock:
                self._pending.pop(pending.request_id, None)
            pending.event.set()
            self._emit("unsubscribed", {**message.get("data", {}), "requestId": message.get("requestId")})
            return
        if kind == "error":
            error_data = message.get("error", {})
            code = error_data.get("code", "internal")
            error = ModelUpdateError(
                error_data.get("message", "订阅请求失败。"),
                code=code,
                request_id=message.get("requestId"),
                subscription_id=error_data.get("subscriptionId"),
                retryable=code not in {"bad-request", "not-found", "forbidden"},
            )
            try:
                pending = self._find_pending(message, None)
            except ModelUpdateError as protocol_error:
                self._emit("error", protocol_error)
                return
            if pending is not None:
                pending.error = error
                with self._lock:
                    self._pending.pop(pending.request_id, None)
                pending.event.set()
            self._emit("error", error)
            return
        self._emit("message", message)

    def _find_pending(self, message: dict[str, Any], kind: Optional[str]) -> Optional[_Pending]:
        request_id = message.get("requestId")
        with self._lock:
            if request_id is not None and str(request_id).strip():
                pending = self._pending.get(str(request_id))
                if pending and (kind is None or pending.kind == kind):
                    return pending
                return None
            subscription_id = message.get("data", {}).get("subscriptionId") or message.get("error", {}).get("subscriptionId")
            candidates = []
            for pending in self._pending.values():
                if kind is not None and pending.kind != kind:
                    continue
                if subscription_id and pending.handle.subscription_id and pending.handle.subscription_id != subscription_id:
                    continue
                candidates.append(pending)
            if len(candidates) > 1:
                raise ModelUpdateError(
                    "服务端回执缺少 requestId，无法安全关联待处理请求。",
                    code="bad-response",
                )
            return candidates[0] if candidates else None

    def _handle_disconnect(self, code: Optional[int], reason: str, cause: BaseException) -> None:
        permanent = code == 4003
        error = ModelUpdateError(
            reason or "WebSocket 连接已关闭。",
            code="space-deleted" if permanent else "connection-closed",
            retryable=not permanent and not self._manual_closed,
            cause=cause,
        )
        with self._lock:
            pending_handles = []
            for handle in self._desired.values():
                handle.subscription_id = None
                if not handle._ready.is_set():
                    pending_handles.append(handle)
            for pending in self._pending.values():
                pending.error = error
                pending.event.set()
            for handle in pending_handles:
                handle._error = error
                handle._ready.set()
                self._desired.pop(handle.id, None)
            self._pending.clear()
            self._last_error = error
        self._set_state("closed" if permanent else "disconnected", {"code": code, "reason": reason})
        if permanent:
            self._emit("error", error)
            self._stop_event.set()

    def _set_state(self, state: str, details: Optional[dict[str, Any]] = None) -> None:
        with self._condition:
            self.state = state
            self._condition.notify_all()
        payload = {"state": state, **(details or {})}
        self._emit("status", payload)
        if state == "connected":
            self._emit("connected", payload)
        elif state in {"disconnected", "closed"}:
            self._emit("disconnected", payload)

    def _emit(self, event: str, payload: Any) -> None:
        for callback in list(self._listeners.get(event, [])):
            try:
                callback(payload)
            except Exception as error:
                if event != "error":
                    for error_callback in list(self._listeners.get("error", [])):
                        try:
                            error_callback(ModelUpdateError(str(error), code="callback-failed", cause=error))
                        except Exception:
                            pass
